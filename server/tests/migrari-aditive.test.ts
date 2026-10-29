import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../src/db/prisma.js";
import { citesteCsvCorespondenta, incarcaCorespondentaFormularBilka } from "../src/modules/adm/corespondentaFormular.js";
import { incarcaOptiuniListe } from "../src/modules/adm/optiuniListe.js";

// Lista de acceptare Etapa 3, H1 (S17a): migrarile 6-13 sunt doar aditive - niciuna
// nu contine DROP, TRUNCATE, DELETE sau ALTER COLUMN cu DROP; seed-ul (listele de
// optiuni, corespondenta formularului Bilka) e idempotent. Aplicarea de la zero pe o
// baza goala o face globalSetup (migrate deploy) la fiecare rulare a testelor.

const FOLDER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../prisma/migrations");
const MIGRARI_ETAPA_3 = [
  "20261028090000_ofertare_clienti_curs",
  "20261028150000_oferta_adresa_lucrarii",
  "20261028180000_oferta_sipci_multiple",
  "20261028200000_optiune_lista",
  "20261029090000_oferta_linie_sistem",
  "20261029120000_statusuri_montatori_comanda",
  "20261029150000_oferta_documente",
  "20261029180000_formular_bilka",
];

afterAll(async () => {
  await prisma.$disconnect();
});

describe("migrarile Etapei 3 (6-13) sunt aditive", () => {
  it("fiecare SQL exista si nu contine instructiuni distructive", () => {
    const existente = fs.readdirSync(FOLDER).filter((d) => /^\d{14}_/.test(d));
    for (const m of MIGRARI_ETAPA_3) expect(existente, m).toContain(m);
    for (const m of MIGRARI_ETAPA_3) {
      const sql = fs.readFileSync(path.join(FOLDER, m, "migration.sql"), "utf8");
      // largirile permise (ARH §10.7, S13b): "DROP NOT NULL" (coloana devine optionala) si
      // "DROP INDEX" al unui index unic inlocuit cu unul simplu (migrarea 8, aprobata); nimic altceva
      const faraComentarii = sql.replace(/--[^\n]*/g, "").replace(/DROP\s+NOT\s+NULL/gi, "").replace(/DROP INDEX "oferta_sipca_ofertaId_key";/g, "");
      expect(faraComentarii, m).not.toMatch(/\bDROP\b/i);
      expect(faraComentarii, m).not.toMatch(/\bTRUNCATE\b/i);
      expect(faraComentarii, m).not.toMatch(/\bDELETE\s+FROM\b/i);
      expect(faraComentarii, m).not.toMatch(/ALTER\s+COLUMN\s+"[^"]+"\s+(DROP\s+NOT\s+NULL|TYPE)/i);
    }
    // migrarea 13: tabela de corespondenta, coloanele noi, valoarea noua in enum
    const m13 = fs.readFileSync(path.join(FOLDER, "20261029180000_formular_bilka", "migration.sql"), "utf8");
    expect(m13).toContain(`ALTER TYPE "TipDocument" ADD VALUE 'FORMULAR_BILKA'`);
    expect(m13).toContain(`CREATE TABLE "corespondenta_formular_bilka"`);
    expect(m13).toMatch(/ALTER TABLE "oferta_invelitoare" ADD COLUMN\s+"montaj" TEXT/);
  });
});

describe("seed-ul e idempotent", () => {
  it("corespondenta formularului Bilka: a doua incarcare nu adauga nimic si nu rescrie o modificare a Admin-ului general", async () => {
    const randuri = citesteCsvCorespondenta();
    expect(randuri.length).toBeGreaterThanOrEqual(200);
    expect(randuri.filter((r) => r.stare === "de_verificat").length).toBe(46);
    await incarcaCorespondentaFormularBilka(prisma);
    const n = await prisma.corespondentaFormularBilka.count();
    expect(n).toBeGreaterThanOrEqual(randuri.length);
    const rand = await prisma.corespondentaFormularBilka.findFirstOrThrow({ where: { cheie: "ACMIC" } });
    await prisma.corespondentaFormularBilka.update({ where: { id: rand.id }, data: { observatie: "modificat de Admin general" } });
    expect(await incarcaCorespondentaFormularBilka(prisma)).toBe(0);
    expect(await prisma.corespondentaFormularBilka.count()).toBe(n);
    expect((await prisma.corespondentaFormularBilka.findUniqueOrThrow({ where: { id: rand.id } })).observatie).toBe("modificat de Admin general");
    await prisma.corespondentaFormularBilka.update({ where: { id: rand.id }, data: { observatie: rand.observatie } });
  });

  it("listele de optiuni: a doua incarcare nu adauga nimic", async () => {
    await incarcaOptiuniListe(prisma);
    expect(await incarcaOptiuniListe(prisma)).toBe(0);
  });
});
