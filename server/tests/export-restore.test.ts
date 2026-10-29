import { execSync } from "node:child_process";
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import AdmZip from "adm-zip";
import pg from "pg";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { env } from "../src/env.js";
import { MODELE_EXPORT, numeTabel, scrieExport } from "../src/modules/adm/exportDate.js";
import { EroareRestaurare, restaureaza } from "../src/modules/adm/restaurare.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

const app = creeazaApp();
const EMAIL_EXPORT_ADMIN = "export-http-admin@exemplu.local";
const EMAIL_EXPORT_FIRMA = "export-firma-admin@exemplu.local";
// rezultatul salvat la "Comandat" (Json): minimul pe care il citeste lista de oferte
const REZULTAT_SALVAT = { totaluri: { documentCuTvaEur: "3178.46", documentTotalLei: "17000.00" }, cantitati: { invelitori: [], accesoriiMl: [], sipci: [] }, linii: [], pachete: [], formulareBilka: [], avertizari: [] };
let firmaA: string;
let firmaB: string;
let ofertaA1: string;
let ofertaA2: string;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const delegat = (client: PrismaClient, model: string) => (client as any)[model.charAt(0).toLowerCase() + model.slice(1)];

let folderTemp: string;
let caleZip: string;
let urlRestore: string;
let prismaRestore: PrismaClient;

beforeAll(async () => {
  folderTemp = await mkdtemp(path.join(os.tmpdir(), "ofertare-export-"));
  caleZip = path.join(folderTemp, "export.zip");
  // date minime, ca exportul sa aiba ce exporta chiar si singur
  if ((await prisma.firma.count()) === 0) {
    await prisma.firma.create({ data: { denumire: "Firma Export", cui: "RO9", nrRegCom: "J9", adresa: "E", telefon: "9", email: "export@exemplu.local" } });
  }
  const adminExport = await creeazaUtilizatorTest(EMAIL_EXPORT_ADMIN, "ADMIN_GENERAL");
  // o propunere de import exista mereu, ca restaurarea sa acopere si tabelul ei
  // (coloana `randuri` nu se exporta, dar e obligatorie - BUG gasit la E2)
  if ((await prisma.importPropunere.count()) === 0) {
    const compartiment = (await prisma.compartiment.findFirst()) ?? (await prisma.compartiment.create({ data: { denumire: "Export Test Comp", codScurt: "EXT", tip: "FURNIZOR", moneda: "EUR", modPret: "LISTA_ACHIZITIE" } }));
    await prisma.importPropunere.create({
      data: { compartimentId: compartiment.id, creatDeId: adminExport.id, status: "ANULATA", areReferinte: true, fisiere: [], diferente: { produse: {}, referinte: {} }, raport: { fisiere: [], totaluri: {}, primulImport: true }, erori: [], avertizari: [], randuri: { produse: [], referinte: [] } },
    });
  }
  await mkdir(path.join(env.dateDir, "sigle"), { recursive: true });
  await writeFile(path.join(env.dateDir, "sigle", "test-export.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));

  // S17a: date in toate tabelele ofertarii, pe doua firme (exportul de firma le separa):
  // client, cursuri, contor, montator, doua oferte legate (completare) cu invelitoare,
  // pozitii, linie, sipca, tronson, zona B, istoric, atasament, notita, document, comanda
  firmaA = (await prisma.firma.create({ data: { denumire: "Firma Export A", cui: "ROA1", nrRegCom: "JA1", adresa: "A", telefon: "1", email: "fa@exemplu.local" } })).id;
  firmaB = (await prisma.firma.create({ data: { denumire: "Firma Export B", cui: "ROB1", nrRegCom: "JB1", adresa: "B", telefon: "2", email: "fb@exemplu.local" } })).id;
  const adminFirma = await creeazaUtilizatorTest(EMAIL_EXPORT_FIRMA, "ADMINISTRATOR", { firmaId: firmaA, serieOferta: "EXF", adaosProcent: 1 });
  const agentB = await creeazaUtilizatorTest("export-firma-b@exemplu.local", "AGENT", { firmaId: firmaB, serieOferta: "EXB", adaosProcent: 1 });
  const azi = new Date("2026-10-29T00:00:00Z");
  await prisma.cursValutar.upsert({ where: { data_moneda: { data: azi, moneda: "EUR" } }, update: {}, create: { data: azi, moneda: "EUR", curs: "5.3485", sursa: "test" } });
  await prisma.contorSerie.upsert({ where: { serie: "EXF" }, update: {}, create: { serie: "EXF", ultimulNumar: 2 } });
  const client = await prisma.client.create({ data: { nume: "Client Export", telefon: "0730000777", telefonNormalizat: "0730000777", adresa: "Str. Export 1", creatDeId: adminFirma.id } });
  const clientB = await prisma.client.create({ data: { nume: "Client B", telefon: "0730000778", telefonNormalizat: "0730000778", adresa: "Str. B 1", creatDeId: agentB.id } });
  const montator = await prisma.montator.create({ data: { utilizatorId: adminFirma.id, nume: "Montator Export", telefon: "0740000001", telefonNormalizat: "0740000001" } });
  const oferta = (firmaId: string, utilizatorId: string, clientId: string, serie: string, numar: number, extra: Record<string, unknown> = {}) =>
    prisma.oferta.create({ data: { firmaId, utilizatorId, serie, numar, data: azi, clientId, cursBnr: "5.3485", cursAchizitie: "5.4020", dataCurs: azi, sursaCurs: "test", tvaPct: "21", tintaValoare: "20", ...extra } });
  const o1 = await oferta(firmaA, adminFirma.id, client.id, "EXF", 1, { montatorId: montator.id, status: "COMANDAT", rezultatMotor: REZULTAT_SALVAT, rezultatSalvatLa: azi });
  const o2 = await oferta(firmaA, adminFirma.id, client.id, "EXF", 2, { completareLaId: o1.id, preluataDinId: o1.id, motivCompletare: "Altele" });
  const oB = await oferta(firmaB, agentB.id, clientB.id, "EXB", 1);
  ofertaA1 = o1.id;
  ofertaA2 = o2.id;
  const inv = await prisma.ofertaInvelitoare.create({ data: { ofertaId: o1.id, ordine: 1, rol: "principala", cod: "TMCLSMAT050", denumire: "Clasic", um: "M2", pretBazaEur: "6.54", latimeTotalaM: "1.2", culoare: "RAL 8017", montaj: null } });
  await prisma.ofertaPozitie.create({ data: { invelitoareId: inv.id, ordine: 1, lungimeM: "4.5", bucati: 20 } });
  const linie = await prisma.ofertaLinie.create({ data: { ofertaId: o1.id, ordine: 1, rubrica: "Șipcă gard", cod: "SIPCAMAT050", denumire: "Șipcă Oslo", um: "ML", pretBazaEur: "1.11", cantitate: "120", culoareRal: "RAL 7016", culoareFinisaj: "mat" } });
  await prisma.ofertaPozitie.create({ data: { linieId: linie.id, ordine: 1, lungimeM: "1.5", bucati: 10 } });
  const sipca = await prisma.ofertaSipca.create({ data: { ofertaId: o1.id, linieId: linie.id, model: "Oslo, capăt drept", latimeSipcaMm: "92.9", varianta: "CALCUL", culoare: "RAL 7016" } });
  await prisma.ofertaTronson.create({ data: { sipcaId: sipca.id, ordine: 1, lungimeSipcaM: "1.5", lungimeTronsonM: "14", distantaMm: "30" } });
  await prisma.ofertaZonaB.create({ data: { ofertaId: o1.id, ordine: 1, denumire: "Lemn", um: "mc", cantitate: "2", sumaLei: "1500", contineTva: true, preiaInFactura: false } });
  await prisma.ofertaIstoric.create({ data: { ofertaId: o1.id, utilizatorId: adminFirma.id, numeUtilizatorLaMoment: adminFirma.nume, tip: "status", camp: "status", valoareInainte: "IN_LUCRU", valoareDupa: "TRANSMISA" } });
  await prisma.ofertaAtasament.create({ data: { ofertaId: o1.id, nume: "poza.jpg", fisier: `oferte/${o1.id}/atasamente/poza.jpg`, marime: 4, incarcatDeId: adminFirma.id } });
  await prisma.ofertaNotita.create({ data: { ofertaId: o1.id, utilizatorId: adminFirma.id, numeUtilizatorLaMoment: adminFirma.nume, text: "notiță de test" } });
  await prisma.ofertaDocument.create({ data: { ofertaId: o1.id, tip: "FORMULAR_BILKA", versiune: 1, nume: "EXF-0001-F1.xlsm", fisier: `oferte/${o1.id}/documente/EXF-0001-F1.xlsm`, marime: 3, generatDeId: adminFirma.id, formularNr: 1, avertizari: "Nu au loc în formularul Bilka: x" } });
  await prisma.comanda.create({ data: { ofertaId: o1.id, firmaId: firmaA, responsabilId: adminFirma.id, serie: "EXF", numar: 1, data: azi, clientNume: client.nume, clientTelefon: client.telefon, rezumat: "Clasic 8017", totalCuTvaEur: "3178.46", totalLei: "17000", avansLei: "1000", restLei: "16000" } });
  await prisma.ofertaLinie.create({ data: { ofertaId: oB.id, ordine: 1, rubrica: "Accesorii standard", cod: "ACMICMAT050", denumire: "Coamă mică", um: "BUC", pretBazaEur: "4.9", cantitate: "3" } });
  // fisierele firmelor: sigla, sablonul Bilka, documentul si atasamentul ofertei
  for (const [folder, nume] of [["sigle", `${firmaA}.png`], ["sigle", `${firmaB}.png`], ["sabloane-bilka", `${firmaA}.xlsm`], [`oferte/${o1.id}/documente`, "EXF-0001-F1.xlsm"], [`oferte/${o1.id}/atasamente`, "poza.jpg"], [`oferte/${oB.id}/documente`, "EXB-0001-oferta.pdf"]]) {
    await mkdir(path.join(env.dateDir, ...folder.split("/")), { recursive: true });
    await writeFile(path.join(env.dateDir, ...folder.split("/"), nume), Buffer.from("abc"));
  }

  // schema separata pentru restaurare: migrata si goala
  const u = new URL(process.env.DATABASE_URL_TEST!);
  u.searchParams.set("schema", "test_restore");
  urlRestore = u.toString();
  execSync("npx prisma migrate deploy", { stdio: "pipe", env: { ...process.env, DATABASE_URL: urlRestore } });
  const pool = new pg.Pool({ connectionString: urlRestore });
  try {
    const { rows } = await pool.query<{ tablename: string }>(`SELECT tablename FROM pg_tables WHERE schemaname = 'test_restore' AND tablename <> '_prisma_migrations'`);
    if (rows.length) await pool.query(`TRUNCATE TABLE ${rows.map((r) => `"test_restore"."${r.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  } finally {
    await pool.end();
  }
  prismaRestore = new PrismaClient({ datasources: { db: { url: urlRestore } } });
});

afterAll(async () => {
  await prismaRestore.$disconnect();
  await prisma.$disconnect();
});

describe("Export 'descarca tot' si restaurare", () => {
  it("exportul contine toate tabelele, cu numaratorile egale cu baza, parolele separat si fisierele", { timeout: 120_000 }, async () => {
    const { numaratori, fisiere } = await scrieExport(caleZip);
    const zip = new AdmZip(caleZip);
    const intrari = zip.getEntries().map((e) => e.entryName);

    for (const model of MODELE_EXPORT) {
      const tabel = numeTabel(model);
      expect(intrari).toContain(`date/${tabel}.csv`);
      const inBaza = (await delegat(prisma, model).count()) as number;
      expect(numaratori[tabel], tabel).toBe(inBaza);
      const text = zip.getEntry(`date/${tabel}.csv`)!.getData().toString("utf8");
      const linii = text.split("\r\n").filter((l) => l !== "");
      expect(linii.length - 1, `randuri in ${tabel}.csv`).toBe(inBaza);
    }
    const utilizatori = zip.getEntry("date/utilizator.csv")!.getData().toString("utf8");
    expect(utilizatori.split("\r\n")[0]).not.toContain("parolaHash");
    const parole = zip.getEntry("_sistem/parole.csv")!.getData().toString("utf8");
    expect(parole.split("\r\n").filter((l) => l !== "").length - 1).toBe(await prisma.utilizator.count());
    expect(intrari).toContain("fisiere/sigle/test-export.png");
    expect(fisiere).toBeGreaterThanOrEqual(1);
    const readme = zip.getEntry("README.md")!.getData().toString("utf8");
    expect(readme).toContain("Format export: 2");
    expect(readme).toContain("Tip export: complet");
    expect(intrari).toContain(`fisiere/sabloane-bilka/${firmaA}.xlsm`);
    expect(intrari).toContain(`fisiere/oferte/${ofertaA1}/documente/EXF-0001-F1.xlsm`);
    for (const tabel of ["client", "curs_valutar", "contor_serie", "montator", "oferta", "oferta_invelitoare", "oferta_linie", "oferta_pozitie", "oferta_sipca", "oferta_tronson", "oferta_zona_b", "oferta_istoric", "oferta_atasament", "oferta_notita", "oferta_document", "comanda", "corespondenta_formular_bilka"]) {
      expect(numaratori[tabel], tabel).toBeGreaterThanOrEqual(tabel === "corespondenta_formular_bilka" ? 0 : 1);
    }
    expect(readme).toContain(`- produs: ${numaratori.produs}`);
  });

  it("export -> baza goala -> restore: aceleasi numaratori si valori", { timeout: 300_000 }, async () => {
    const dateDirRestore = path.join(folderTemp, "date-restaurate");
    const raport = await restaureaza(prismaRestore, caleZip, dateDirRestore);
    expect(raport.avertizari).toEqual([]);

    for (const model of MODELE_EXPORT) {
      expect(await delegat(prismaRestore, model).count(), numeTabel(model)).toBe(await delegat(prisma, model).count());
    }
    const firmeA = (await prisma.firma.findMany({ orderBy: { id: "asc" } })).map((f) => [f.id, f.denumire, f.cui, f.platitorTva]);
    const firmeB = (await prismaRestore.firma.findMany({ orderBy: { id: "asc" } })).map((f) => [f.id, f.denumire, f.cui, f.platitorTva]);
    expect(firmeB).toEqual(firmeA);
    const useriA = (await prisma.utilizator.findMany({ orderBy: { id: "asc" } })).map((u) => [u.id, u.email, u.rol, u.parolaHash, u.administratorId, u.adaosProcent?.toString() ?? null]);
    const useriB = (await prismaRestore.utilizator.findMany({ orderBy: { id: "asc" } })).map((u) => [u.id, u.email, u.rol, u.parolaHash, u.administratorId, u.adaosProcent?.toString() ?? null]);
    expect(useriB).toEqual(useriA);
    const produseA = (await prisma.produs.findMany({ orderBy: { codIntern: "asc" }, select: { codIntern: true, denumire: true, latimeTotalaM: true, activ: true } })).map((p) => [p.codIntern, p.denumire, p.latimeTotalaM?.toString() ?? null, p.activ]);
    const produseB = (await prismaRestore.produs.findMany({ orderBy: { codIntern: "asc" }, select: { codIntern: true, denumire: true, latimeTotalaM: true, activ: true } })).map((p) => [p.codIntern, p.denumire, p.latimeTotalaM?.toString() ?? null, p.activ]);
    expect(produseB).toEqual(produseA);
    const listeA = (await prisma.listaPret.findMany({ orderBy: { id: "asc" } })).map((l) => [l.id, l.status, l.denumire]);
    const listeB = (await prismaRestore.listaPret.findMany({ orderBy: { id: "asc" } })).map((l) => [l.id, l.status, l.denumire]);
    expect(listeB).toEqual(listeA);
    const sumaA = (await prisma.pretListaProdus.aggregate({ _sum: { pret: true } }))._sum.pret?.toString() ?? "0";
    const sumaB = (await prismaRestore.pretListaProdus.aggregate({ _sum: { pret: true } }))._sum.pret?.toString() ?? "0";
    expect(sumaB).toBe(sumaA);
    const jurnalA = await prisma.jurnalIntrare.findFirst({ orderBy: { moment: "asc" } });
    const jurnalB = await prismaRestore.jurnalIntrare.findFirst({ orderBy: { moment: "asc" } });
    expect(jurnalB?.id).toBe(jurnalA?.id);
    expect(raport.fisiere).toBeGreaterThanOrEqual(1);
    // ofertarea: legaturile ofertei catre ea insasi, rezultatul salvat (Json), copiii, documentul, comanda
    const o2 = await prismaRestore.oferta.findUniqueOrThrow({ where: { id: ofertaA2 } });
    expect(o2.completareLaId).toBe(ofertaA1);
    expect(o2.preluataDinId).toBe(ofertaA1);
    const o1 = await prismaRestore.oferta.findUniqueOrThrow({ where: { id: ofertaA1 }, include: { invelitori: { include: { panotaj: true } }, linii: { include: { pozitii: true } }, sipci: { include: { tronsoane: true } }, zonaB: true, istoric: true, atasamente: true, notite: true, documente: true, comanda: true } });
    expect(o1.status).toBe("COMANDAT");
    expect(o1.rezultatMotor).toEqual(REZULTAT_SALVAT);
    expect(o1.invelitori[0].panotaj[0].bucati).toBe(20);
    expect(o1.linii[0].pozitii[0].lungimeM.toString()).toBe("1.5");
    expect(o1.sipci[0].tronsoane[0].distantaMm.toString()).toBe("30");
    expect(o1.zonaB[0].sumaLei.toString()).toBe("1500");
    expect(o1.istoric).toHaveLength(1);
    expect(o1.atasamente[0].nume).toBe("poza.jpg");
    expect(o1.notite[0].text).toBe("notiță de test");
    expect(o1.documente[0]).toMatchObject({ tip: "FORMULAR_BILKA", formularNr: 1 });
    expect(o1.comanda?.totalLei.toString()).toBe("17000");
    const cursA = await prisma.cursValutar.count();
    expect(await prismaRestore.cursValutar.count()).toBe(cursA);
    expect((await prismaRestore.contorSerie.findUnique({ where: { serie: "EXF" } }))?.ultimulNumar).toBe(2);
  });

  it("exportul de firma (Administrator): doar datele firmei lui, fara parole, fara propunerile de import; restaurarea il refuza", { timeout: 120_000 }, async () => {
    const caleFirma = path.join(folderTemp, "export-firma.zip");
    const { numaratori } = await scrieExport(caleFirma, { firmaId: firmaA });
    const zip = new AdmZip(caleFirma);
    const intrari = zip.getEntries().map((e) => e.entryName);
    expect(intrari).not.toContain("_sistem/parole.csv");
    expect(intrari).not.toContain("date/import_propunere.csv");
    expect(intrari).not.toContain("date/jurnal_autentificare.csv");
    expect(numaratori.firma).toBe(1);
    expect(numaratori.oferta).toBe(2);
    expect(numaratori.client).toBe(1);
    expect(numaratori.comanda).toBe(1);
    expect(numaratori.montator).toBe(1);
    expect(numaratori.oferta_linie).toBe(1); // linia firmei B nu intra
    expect(numaratori.produs).toBe(await prisma.produs.count()); // catalogul e comun
    const firme = zip.getEntry("date/firma.csv")!.getData().toString("utf8");
    expect(firme).toContain("Firma Export A");
    expect(firme).not.toContain("Firma Export B");
    const utilizatori = zip.getEntry("date/utilizator.csv")!.getData().toString("utf8");
    expect(utilizatori).toContain(EMAIL_EXPORT_FIRMA);
    expect(utilizatori).not.toContain(EMAIL_EXPORT_ADMIN);
    expect(utilizatori).not.toContain("export-firma-b@exemplu.local");
    expect(intrari).toContain(`fisiere/sigle/${firmaA}.png`);
    expect(intrari).toContain(`fisiere/sabloane-bilka/${firmaA}.xlsm`);
    expect(intrari).toContain(`fisiere/oferte/${ofertaA1}/documente/EXF-0001-F1.xlsm`);
    expect(intrari).not.toContain(`fisiere/sigle/${firmaB}.png`);
    expect(intrari.some((i) => i.startsWith("fisiere/importuri") || i === "fisiere/sigle/test-export.png")).toBe(false);
    const readme = zip.getEntry("README.md")!.getData().toString("utf8");
    expect(readme).toContain("Tip export: firmă (Firma Export A)");
    // restaurarea refuza exportul de firma (inainte de orice altceva)
    const prismaGol = new PrismaClient({ datasources: { db: { url: urlRestore } } });
    try {
      await expect(restaureaza(prismaGol, caleFirma, folderTemp)).rejects.toThrow(/export de firmă/);
    } finally {
      await prismaGol.$disconnect();
    }
    // prin HTTP: Administratorul primeste exportul firmei, cu jurnal
    const admin = await autentificaAgent(app, EMAIL_EXPORT_FIRMA);
    const raspuns = await admin
      .get("/api/adm/export")
      .buffer(true)
      .parse((res, cb) => {
        const bucati: Buffer[] = [];
        res.on("data", (b: Buffer) => bucati.push(b));
        res.on("end", () => cb(null, Buffer.concat(bucati)));
      })
      .expect(200);
    expect(raspuns.headers["content-disposition"]).toMatch(/export-firma-\d{4}-\d{2}-\d{2}\.zip/);
    const zipHttp = new AdmZip(raspuns.body as Buffer);
    expect(zipHttp.getEntries().map((e) => e.entryName)).not.toContain("_sistem/parole.csv");
    expect(await prisma.jurnalIntrare.count({ where: { actiune: "export_firma" } })).toBeGreaterThanOrEqual(1);
  });

  it("restaurarea refuza o baza care nu e goala si un export dintr-o versiune mai noua", async () => {
    await expect(restaureaza(prismaRestore, caleZip, folderTemp)).rejects.toBeInstanceOf(EroareRestaurare);

    const zipNou = new AdmZip();
    zipNou.addFile("README.md", Buffer.from("# Export\nFormat export: 99\nVersiune soft: 9.9.9\n", "utf8"));
    const caleNou = path.join(folderTemp, "nou.zip");
    zipNou.writeZip(caleNou);
    const prismaGol = new PrismaClient({ datasources: { db: { url: urlRestore } } });
    try {
      // baza de restaurare are deja date, deci intai se verifica versiunea
      await expect(restaureaza(prismaGol, caleNou, folderTemp)).rejects.toThrow(/mai nou/);
    } finally {
      await prismaGol.$disconnect();
    }
  });

  // ultimul: descarcarea prin HTTP scrie in jurnal, deci nu poate sta intre
  // ZIP-ul de proba si restaurarea lui (comparatia cu baza n-ar mai bate)
  it("ZIP-ul se descarca prin HTTP, cu antetele de descarcare si continutul complet", { timeout: 120_000 }, async () => {
    const admin = await autentificaAgent(app, EMAIL_EXPORT_ADMIN);
    const raspuns = await admin
      .get("/api/adm/export")
      .buffer(true)
      .parse((res, cb) => {
        const bucati: Buffer[] = [];
        res.on("data", (b: Buffer) => bucati.push(b));
        res.on("end", () => cb(null, Buffer.concat(bucati)));
      })
      .expect(200);
    expect(raspuns.headers["content-type"]).toContain("zip");
    expect(raspuns.headers["content-disposition"]).toMatch(/^attachment; filename="?export-\d{4}-\d{2}-\d{2}\.zip"?$/);
    const corp = raspuns.body as Buffer;
    expect(Number(raspuns.headers["content-length"])).toBe(corp.length);
    expect(corp.length).toBeGreaterThan(1000);

    const zip = new AdmZip(corp);
    const intrari = zip.getEntries().map((e) => e.entryName);
    expect(intrari).toContain("README.md");
    expect(intrari).toContain("_sistem/parole.csv");
    for (const model of MODELE_EXPORT) expect(intrari).toContain(`date/${numeTabel(model)}.csv`);
    const utilizatori = zip.getEntry("date/utilizator.csv")!.getData().toString("utf8");
    expect(utilizatori.split("\r\n").filter((l) => l !== "").length - 1).toBe(await prisma.utilizator.count());
    // exportul nu se arhiveaza pe sine si nu lasa fisiere de lucru in folderul de date
    expect(intrari.some((i) => i.endsWith(".zip"))).toBe(false);
    expect(await prisma.jurnalIntrare.count({ where: { actiune: "export_descarca_tot" } })).toBeGreaterThanOrEqual(1);

    // un agent nu poate descarca
    await creeazaUtilizatorTest("export-http-agent@exemplu.local", "AGENT", { serieOferta: "EXA" });
    const agent = await autentificaAgent(app, "export-http-agent@exemplu.local");
    await agent.get("/api/adm/export").expect(403);
  });
});
