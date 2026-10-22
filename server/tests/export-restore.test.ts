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
  await creeazaUtilizatorTest(EMAIL_EXPORT_ADMIN, "ADMIN_GENERAL");
  await mkdir(path.join(env.dateDir, "sigle"), { recursive: true });
  await writeFile(path.join(env.dateDir, "sigle", "test-export.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));

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
    expect(readme).toContain("Format export: 1");
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
