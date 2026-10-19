import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { CATEGORII_OFERTA_IMPLICITE } from "../src/modules/cat/categoriiImplicite.js";
import { analizeazaImport, type FisierIncarcat } from "../src/modules/imp/analiza.js";
import { confirmaImport } from "../src/modules/imp/aplicare.js";
import { activeazaLista, seteazaPretManual } from "../src/modules/lp/liste.js";
import type { Diferente, Problema, Raport } from "../src/modules/imp/tipuri.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

const FOLDER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../docs/import/Bilka");
const LISTE_PRODUSE = [
  "01-rezidential.csv",
  "02-auxiliare.csv",
  "03-04-pluvial.csv",
  "04b-pluvial-aluzinc.csv",
  "05-retro-faltuita.csv",
  "06-industrial.csv",
  "07-sipca-gard.csv",
  "08-accesorii-speciale-2ml.csv",
  "09-accesorii-speciale-ml.csv",
];
const REFERINTE = ["variante-profil.csv", "culori-finisaj-grosime.csv", "garantii-finisaj-grosime.csv", "liste-implicite-oferta.csv", "trepte-desfasurata.csv"];

function fisier(nume: string): FisierIncarcat {
  return { nume, continut: readFileSync(path.join(FOLDER, nume)) };
}
function toate(): FisierIncarcat[] {
  return [...LISTE_PRODUSE, ...REFERINTE].map(fisier);
}
// modifica o singura linie dintr-un CSV (cea care incepe cu codul dat)
function cuLiniaModificata(nume: string, cod: string, schimba: (linie: string) => string): FisierIncarcat {
  const text = readFileSync(path.join(FOLDER, nume), "utf8");
  const linii = text.split(/\r?\n/);
  const i = linii.findIndex((l) => l.replace(/^﻿/, "").startsWith(`${cod};`));
  if (i < 0) throw new Error(`Nu am gasit linia ${cod} in ${nume}`);
  linii[i] = schimba(linii[i]);
  return { nume, continut: Buffer.from(linii.join("\n"), "utf8") };
}

const app = creeazaApp();
const EMAIL_ADMIN = "test-import-admin@exemplu.local";
const EMAIL_AGENT = "test-import-agent@exemplu.local";

let admin: Awaited<ReturnType<typeof creeazaUtilizatorTest>>;
let compartimentId: string;
let primaLista: string;
let aDouaLista: string;

beforeAll(async () => {
  expect(readdirSync(FOLDER).length).toBeGreaterThanOrEqual(14);
  admin = await creeazaUtilizatorTest(EMAIL_ADMIN, "ADMIN_GENERAL");
  await creeazaUtilizatorTest(EMAIL_AGENT, "AGENT", { serieOferta: "ZIM" });
  for (const c of CATEGORII_OFERTA_IMPLICITE) {
    await prisma.categorieOferta.upsert({ where: { denumire: c.denumire }, update: {}, create: c });
  }
  // furnizorul din CSV-uri e "Bilka" -> compartimentul trebuie sa se numeasca la fel
  const compartiment = await prisma.compartiment.create({
    data: { denumire: "Bilka", codScurt: "BIL", tip: "FURNIZOR", moneda: "EUR", modPret: "LISTA_ACHIZITIE", formatImport: "bilka-v1" },
  });
  compartimentId = compartiment.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Import Bilka - cele 14 fisiere reale, pe un compartiment gol", () => {
  it("analiza da numerele din README, fara erori", { timeout: 180_000 }, async () => {
    const propunere = await analizeazaImport({ compartimentId, fisiere: toate(), utilizator: admin });
    const erori = propunere.erori as unknown as Problema[];
    expect(erori, JSON.stringify(erori.slice(0, 5), null, 1)).toHaveLength(0);

    const raport = propunere.raport as unknown as Raport;
    expect(raport.primulImport).toBe(true);
    expect(raport.totaluri.randuri).toBe(3399);
    expect(raport.totaluri.randuriPret).toBe(3425); // 3.399 + 26 coale de tabla plana
    expect(raport.totaluri.coduriDistincte).toBe(3247);
    expect(raport.totaluri.faraCod).toBe(5);
    expect(raport.totaluri.perechiTablaPlana).toBe(26);
    expect(raport.totaluri.inactive).toBe(2);

    const d = propunere.diferente as unknown as Diferente;
    expect(d.produse.noi).toHaveLength(3425);
    expect(d.produse.disparute).toHaveLength(0);
    expect(d.produse.redenumiri).toHaveLength(0);
    expect(d.referinte["variante-profil"]?.aparute).toHaveLength(13);
    expect(d.referinte["culori-finisaj-grosime"]?.aparute).toHaveLength(118);
    expect(d.referinte["garantii-finisaj-grosime"]?.aparute).toHaveLength(22);
    expect(d.referinte["liste-implicite-oferta"]?.aparute).toHaveLength(86);
    expect(d.referinte["trepte-desfasurata"]?.aparute).toHaveLength(25);

    const pePerFisier = Object.fromEntries(raport.fisiere.map((f) => [f.nume, f.randuri]));
    expect(pePerFisier["01-rezidential.csv"]).toBe(522);
    expect(pePerFisier["06-industrial.csv"]).toBe(892);

    const confirmata = await confirmaImport({ propunereId: propunere.id, denumire: "Bilka v10 (sept. 2026)", valabilaDeLa: new Date("2026-09-01"), utilizator: admin });
    expect(confirmata.status).toBe("CONFIRMATA");
    primaLista = confirmata.listaPretId!;

    expect(await prisma.produs.count({ where: { compartimentId } })).toBe(3425);
    expect(await prisma.produs.count({ where: { compartimentId, activ: false } })).toBe(2);
    expect(await prisma.pretListaProdus.count({ where: { listaPretId: primaLista } })).toBe(3425);
    expect(await prisma.culoareFinisajGrosime.count({ where: { furnizor: "Bilka" } })).toBe(118);
    // toate cele 22 de garantii, cu cele 4 de pluvial (fara grosime; 2 fara garantie la culoare)
    expect(await prisma.garantieFinisajGrosime.count({ where: { furnizor: "Bilka" } })).toBe(22);
    expect(await prisma.garantieFinisajGrosime.count({ where: { furnizor: "Bilka", grosime: null } })).toBe(4);
    expect(await prisma.garantieFinisajGrosime.count({ where: { furnizor: "Bilka", garantieCuloareAni: null } })).toBe(2);
    const pluvial = await prisma.garantieFinisajGrosime.findFirst({ where: { furnizor: "Bilka", finisaj: "pluvial colorat" } });
    expect(pluvial?.grosime).toBeNull();
    expect(pluvial?.garantieCuloareAni).toBe(15);
    expect(pluvial?.garantieCoroziuneAni).toBe(30);
    expect(await prisma.jurnalIntrare.count({ where: { entitate: "Produs", actiune: "import_creare" } })).toBe(3425);

    const { noua } = await activeazaLista(primaLista, admin);
    expect(noua.status).toBe("ACTIVA");
  });

  it("tabla plana intra ca doua produse pe acelasi cod: la mp si la coala (2,5 x pret)", async () => {
    const perechi = await prisma.produs.findMany({ where: { compartimentId, codFurnizor: "TPLANLUC070" }, include: { categorieOferta: true, preturi: true } });
    expect(perechi).toHaveLength(2);
    const mp = perechi.find((p) => p.um === "M2")!;
    const coala = perechi.find((p) => p.um === "BUC")!;
    expect(mp.categorieOferta?.denumire).toBe("Învelitori");
    expect(coala.categorieOferta?.denumire).toBe("Accesorii standard");
    expect(coala.denumire).toContain("coală 1,25 × 2,00 m (2,5 mp)");
    expect(coala.preturi[0].pret.toNumber()).toBeCloseTo(Math.round(mp.preturi[0].pret.toNumber() * 2.5 * 100) / 100, 2);
    expect(mp.codIntern).not.toBe(coala.codIntern);
  });

  it("reimportul acelorasi fisiere arata zero diferente", { timeout: 180_000 }, async () => {
    const propunere = await analizeazaImport({ compartimentId, fisiere: toate(), utilizator: admin });
    expect(propunere.erori as unknown[]).toHaveLength(0);
    expect(propunere.avertizari as unknown[]).toHaveLength(0);
    const d = propunere.diferente as unknown as Diferente;
    expect(d.produse.noi).toHaveLength(0);
    expect(d.produse.modificate).toHaveLength(0);
    expect(d.produse.preturiModificate).toHaveLength(0);
    expect(d.produse.disparute).toHaveLength(0);
    expect(d.produse.redenumiri).toHaveLength(0);
    expect(d.produse.reaparute).toHaveLength(0);
    expect(d.produse.neschimbate).toBe(3425);
    expect(d.grupuriNoi).toHaveLength(0);
    expect(d.familiiNoi).toHaveLength(0);
    for (const r of Object.values(d.referinte)) {
      expect(r!.aparute).toHaveLength(0);
      expect(r!.disparute).toHaveLength(0);
      expect(r!.modificate).toHaveLength(0);
    }
    const raport = propunere.raport as unknown as Raport;
    expect(raport.primulImport).toBe(false);
    expect(raport.fisiere.every((f) => f.anterior !== null && f.avertizari.length === 0 || f.tip !== "produse")).toBe(true);
  });

  it("un CSV cu un singur pret modificat arata exact o diferenta de pret", { timeout: 180_000 }, async () => {
    const fisiere = toate().map((f) => (f.nume === "01-rezidential.csv" ? cuLiniaModificata("01-rezidential.csv", "TMDACLUC060", (l) => l.replace(";7.37;", ";7.99;")) : f));
    const propunere = await analizeazaImport({ compartimentId, fisiere, utilizator: admin });
    expect(propunere.erori as unknown[]).toHaveLength(0);
    const d = propunere.diferente as unknown as Diferente;
    expect(d.produse.preturiModificate).toHaveLength(1);
    expect(d.produse.preturiModificate[0].vechi).toBeCloseTo(7.37, 4);
    expect(d.produse.preturiModificate[0].nou).toBeCloseTo(7.99, 4);
    expect(d.produse.noi).toHaveLength(0);
    expect(d.produse.modificate).toHaveLength(0);
    expect(d.produse.disparute).toHaveLength(0);
  });

  it("un produs redenumit e recunoscut ca pereche si isi pastreaza id-ul si istoricul", { timeout: 180_000 }, async () => {
    const inainte = await prisma.produs.findFirst({ where: { compartimentId, codFurnizor: "TMDACLUC060" } });
    expect(inainte).not.toBeNull();

    const fisiere = toate().map((f) =>
      f.nume === "01-rezidential.csv"
        ? cuLiniaModificata("01-rezidential.csv", "TMDACLUC060", (l) => l.replace("Țiglă metalică Dacic – lucios – 0,60 mm;M2", "Țiglă metalică Dacic – lucios – 0,60 mm (nume nou);M2"))
        : f,
    );
    const propunere = await analizeazaImport({ compartimentId, fisiere, utilizator: admin });
    expect(propunere.erori as unknown[]).toHaveLength(0);
    const d = propunere.diferente as unknown as Diferente;
    expect(d.produse.redenumiri).toHaveLength(1);
    expect(d.produse.redenumiri[0].produsId).toBe(inainte!.id);
    expect(d.produse.redenumiri[0].codInternVechi).toBe(inainte!.codIntern);
    expect(d.produse.redenumiri[0].codInternNou).not.toBe(inainte!.codIntern);
    expect(d.produse.noi).toHaveLength(0);
    expect(d.produse.disparute).toHaveLength(0);

    const confirmata = await confirmaImport({ propunereId: propunere.id, denumire: "Bilka v10 (redenumire)", valabilaDeLa: new Date("2026-10-01"), utilizator: admin });
    aDouaLista = confirmata.listaPretId!;
    const dupa = await prisma.produs.findUnique({ where: { id: inainte!.id } });
    expect(dupa!.denumire).toContain("(nume nou)");
    expect(dupa!.codIntern).toBe(d.produse.redenumiri[0].codInternNou);
    const jurnal = await prisma.jurnalIntrare.findMany({ where: { entitateId: inainte!.id, camp: "codIntern" } });
    expect(jurnal).toHaveLength(1);
    expect(jurnal[0].valoareInainte).toBe(inainte!.codIntern);
    expect(jurnal[0].valoareDupa).toBe(dupa!.codIntern);
    // istoricul de pret al produsului acopera ambele versiuni
    expect(await prisma.pretListaProdus.count({ where: { produsId: inainte!.id } })).toBe(2);

    const { noua, arhivata } = await activeazaLista(aDouaLista, admin);
    expect(noua.status).toBe("ACTIVA");
    expect(arhivata?.id).toBe(primaLista);
  });

  it("doua versiuni nu pot fi active simultan - nici prin activare, nici direct in baza", async () => {
    expect(await prisma.listaPret.count({ where: { compartimentId, status: "ACTIVA" } })).toBe(1);
    expect((await prisma.listaPret.findUnique({ where: { id: primaLista } }))!.status).toBe("ARHIVATA");
    await expect(
      prisma.listaPret.create({ data: { compartimentId, denumire: "a doua activa", valabilaDeLa: new Date(), status: "ACTIVA" } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("o versiune arhivata nu se poate modifica (nici preturile, nici lista)", async () => {
    const rand = await prisma.pretListaProdus.findFirst({ where: { listaPretId: primaLista } });
    await expect(prisma.pretListaProdus.update({ where: { id: rand!.id }, data: { pret: 1 } })).rejects.toThrow(/arhivata nu se modifica/);
    await expect(prisma.pretListaProdus.delete({ where: { id: rand!.id } })).rejects.toThrow(/arhivata nu se modifica/);
    await expect(prisma.pretListaProdus.create({ data: { listaPretId: primaLista, produsId: rand!.produsId, pret: 2 } })).rejects.toThrow(/arhivata nu se modifica/);
    await expect(prisma.listaPret.update({ where: { id: primaLista }, data: { denumire: "altfel" } })).rejects.toThrow(/arhivata nu se modifica/);
    await expect(prisma.listaPret.update({ where: { id: primaLista }, data: { status: "ACTIVA" } })).rejects.toThrow(/arhivata nu se modifica/);
  });

  it("set incomplet: fara o lista de produse fata de versiunea activa, importul e blocat", async () => {
    const propunere = await analizeazaImport({ compartimentId, fisiere: [fisier("01-rezidential.csv")], utilizator: admin });
    const erori = propunere.erori as unknown as Problema[];
    expect(erori.some((e) => e.mesaj.includes("Set incomplet"))).toBe(true);
    await expect(confirmaImport({ propunereId: propunere.id, denumire: "x", valabilaDeLa: new Date(), utilizator: admin })).rejects.toThrow(/erori/);
  });

  it("rubrica necunoscuta, produs dublat, pret necitibil = erori", async () => {
    const antet = "cod_furnizor;grup;familie;varianta;finisaj;grosime;optiune;denumire;um;pret_eur;moneda;categorie_bilka;categorie_oferta;latime_totala_m;modul_cm;activ;sursa;observatii";
    const csv = [
      antet,
      "X1;Grup;;;;;;Produs A;BUC;1.00;EUR;;Rubrica Inexistenta;;;da;;",
      "X2;Grup;;;;;;Produs B;BUC;1.00;EUR;;Învelitori;;;da;;",
      "X2;Grup;;;;;;Produs B;BUC;2.00;EUR;;Învelitori;;;da;;",
      "X3;Grup;;;;;;Produs C;BUC;abc;EUR;;Învelitori;;;da;;",
    ].join("\n");
    const fisiere = toate().map((f) => f).concat([{ nume: "99-test-erori.csv", continut: Buffer.from(csv, "utf8") }]);
    const propunere = await analizeazaImport({ compartimentId, fisiere, utilizator: admin });
    const erori = propunere.erori as unknown as Problema[];
    expect(erori.some((e) => e.mesaj.includes("Rubrică necunoscută"))).toBe(true);
    expect(erori.some((e) => e.mesaj.includes("de două ori"))).toBe(true);
    expect(erori.some((e) => e.mesaj.includes("Preț necitibil"))).toBe(true);
  });

  it("tabelele de referinta se pot incarca singure: o culoare scoasa devine inactiva, apoi reapare", { timeout: 60_000 }, async () => {
    const text = readFileSync(path.join(FOLDER, "culori-finisaj-grosime.csv"), "utf8");
    const linii = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    const scoasa = linii[1]; // prima culoare
    const faraPrima = [linii[0], ...linii.slice(2)].join("\n");

    const p1 = await analizeazaImport({ compartimentId, fisiere: [{ nume: "culori-finisaj-grosime.csv", continut: Buffer.from(faraPrima, "utf8") }], utilizator: admin });
    expect(p1.erori as unknown[]).toHaveLength(0);
    expect(p1.areProduse).toBe(false);
    const d1 = p1.diferente as unknown as Diferente;
    expect(d1.referinte["culori-finisaj-grosime"]?.disparute).toHaveLength(1);
    const confirmata = await confirmaImport({ propunereId: p1.id, denumire: "ignorat", valabilaDeLa: new Date(), utilizator: admin });
    expect(confirmata.listaPretId).toBeNull();
    const [, finisaj, grosime, culoare] = scoasa.replace(/^﻿/, "").split(";");
    const rand = await prisma.culoareFinisajGrosime.findFirst({ where: { furnizor: "Bilka", finisaj, grosime, culoare } });
    expect(rand!.activ).toBe(false);

    const p2 = await analizeazaImport({ compartimentId, fisiere: [fisier("culori-finisaj-grosime.csv")], utilizator: admin });
    const d2 = p2.diferente as unknown as Diferente;
    expect(d2.referinte["culori-finisaj-grosime"]?.reaparute).toHaveLength(1);
    await confirmaImport({ propunereId: p2.id, denumire: "ignorat", valabilaDeLa: new Date(), utilizator: admin });
    expect((await prisma.culoareFinisajGrosime.findUnique({ where: { id: rand!.id } }))!.activ).toBe(true);
  });

  it("ruta de analiza accepta fisiere incarcate; un agent nu are acces", async () => {
    const agent = await autentificaAgent(app, EMAIL_AGENT);
    await agent.post("/api/adm/imp/analiza").field("compartimentId", compartimentId).attach("fisiere", path.join(FOLDER, "trepte-desfasurata.csv")).expect(403);

    const adminAgent = await autentificaAgent(app, EMAIL_ADMIN);
    const raspuns = await adminAgent
      .post("/api/adm/imp/analiza")
      .field("compartimentId", compartimentId)
      .attach("fisiere", path.join(FOLDER, "trepte-desfasurata.csv"))
      .expect(201);
    expect(raspuns.body.propunere.areReferinte).toBe(true);
    expect(raspuns.body.propunere.erori).toHaveLength(0);
    expect(raspuns.body.propunere.randuri).toBeUndefined();
  });
});

describe("Stoc: pret de baza manual, cu istoric", () => {
  it("prima introducere creeaza versiunea 'Preturi manuale' activa; a doua scrie vechi -> nou in jurnal", async () => {
    const stoc = await prisma.compartiment.create({ data: { denumire: "Stoc", codScurt: "STO", tip: "STOC_PROPRIU", moneda: "RON", modPret: "LISTA_ACHIZITIE" } });
    const grup = await prisma.grup.create({ data: { compartimentId: stoc.id, denumire: "Diverse" } });
    const produs = await prisma.produs.create({
      data: { compartimentId: stoc.id, grupId: grup.id, codIntern: "STO-TEST000001", denumire: "Șurub de stoc", um: "BUC", moneda: "RON" },
    });

    const r1 = await seteazaPretManual(produs.id, 12.5, admin);
    expect(r1.lista.denumire).toBe("Prețuri manuale");
    expect(r1.lista.status).toBe("ACTIVA");
    expect(r1.pret.pret.toNumber()).toBe(12.5);

    const r2 = await seteazaPretManual(produs.id, 13, admin);
    expect(r2.lista.id).toBe(r1.lista.id);
    const jurnal = await prisma.jurnalIntrare.findMany({ where: { entitateId: produs.id, camp: "pretBaza" }, orderBy: { moment: "asc" } });
    expect(jurnal).toHaveLength(2);
    expect(jurnal[1].valoareInainte).toBe("12.5");
    expect(jurnal[1].valoareDupa).toBe("13");
  });
});
