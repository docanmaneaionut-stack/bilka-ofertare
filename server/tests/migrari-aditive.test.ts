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
  // S17d, S19 (Etapa 5): coloana „atentie”, comanda completa
  "20261105090000_corespondenta_atentie",
  "20261105140434_comenzi_complete",
  "20261105144911_incasari_comisioane",
  "20261106102533_vanzari_comision_agent",
  // S22: retururile si paletii
  "20261106105545_retururi_paleti",
  // S23: avizul si fisa soferului
  "20261106130933_aviz_fisa_soferului",
  // S26a: telefonul clientului optional (M6), livrarea de la Bilka (M7)
  "20261119102251_telefon_optional_livrare_bilka",
];

afterAll(async () => {
  await prisma.$disconnect();
});

describe("migrarile Etapei 3 si 5 (6-20) sunt aditive", () => {
  it("fiecare SQL exista si nu contine instructiuni distructive", () => {
    const existente = fs.readdirSync(FOLDER).filter((d) => /^\d{14}_/.test(d));
    for (const m of MIGRARI_ETAPA_3) expect(existente, m).toContain(m);
    for (const m of MIGRARI_ETAPA_3) {
      const sql = fs.readFileSync(path.join(FOLDER, m, "migration.sql"), "utf8");
      // largirile permise (ARH §10.7, S13b): "DROP NOT NULL" (coloana devine optionala) si
      // "DROP INDEX" al unui index unic inlocuit cu unul simplu (migrarea 8, aprobata) sau cu unul unic
      // PARTIAL (migrarea 20, M6: telefonul clientului - aprobata de Ionut la S26a); nimic altceva
      const faraComentarii = sql
        .replace(/--[^\n]*/g, "")
        .replace(/DROP\s+NOT\s+NULL/gi, "")
        .replace(/DROP INDEX "oferta_sipca_ofertaId_key";/g, "")
        .replace(/DROP INDEX "client_telefonNormalizat_key";\s*CREATE UNIQUE INDEX "client_telefonNormalizat_key"/g, 'CREATE UNIQUE INDEX "client_telefonNormalizat_key"');
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
    // migrarea 19: AVIZ in enum, tabelele avizului, linkul la locatie pe comanda
    const m19 = fs.readFileSync(path.join(FOLDER, "20261106130933_aviz_fisa_soferului", "migration.sql"), "utf8");
    expect(m19).toContain(`ALTER TYPE "TipDocument" ADD VALUE 'AVIZ'`);
    expect(m19).toContain(`CREATE TABLE "comanda_aviz"`);
    expect(m19).toContain(`CREATE TABLE "comanda_aviz_linie"`);
    expect(m19).toMatch(/ALTER TABLE "comanda" ADD COLUMN\s+"locatieUrl" TEXT/);
    // migrarea 20: telefonul optional, marcajul de dublat, indexul unic partial, livrarea Bilka pe oferta si comanda
    const m20 = fs.readFileSync(path.join(FOLDER, "20261119102251_telefon_optional_livrare_bilka", "migration.sql"), "utf8");
    expect(m20).toContain(`CREATE TYPE "LivrareBilka" AS ENUM ('DEPOZIT', 'SANTIER')`);
    expect(m20).toMatch(/ALTER TABLE "client" ADD COLUMN\s+"telefonDublat" BOOLEAN NOT NULL DEFAULT false/);
    expect(m20).toMatch(/ALTER COLUMN "telefon" DROP NOT NULL/);
    expect(m20).toContain(`CREATE UNIQUE INDEX "client_telefonNormalizat_key" ON "client"("telefonNormalizat") WHERE "telefonNormalizat" IS NOT NULL AND "telefonDublat" = false;`);
    expect(m20).toMatch(/ALTER TABLE "oferta" ADD COLUMN\s+"livrareBilka" "LivrareBilka"/);
    expect(m20).toMatch(/ALTER TABLE "comanda" ADD COLUMN\s+"livrareBilka" "LivrareBilka"/);
  });

  it("M6: indexul unic partial din baza - doi clienti nemarcati nu pot avea acelasi telefon; fara telefon si dublatul marcat sunt exceptiile", async () => {
    const baza = { nume: "Index Partial", adresa: "A" };
    await prisma.client.create({ data: { ...baza, telefon: "0799 000 001", telefonNormalizat: "0799000001" } });
    await expect(prisma.client.create({ data: { ...baza, telefon: "0799000001", telefonNormalizat: "0799000001" } })).rejects.toMatchObject({ code: "P2002" });
    // dublatul marcat trece; la fel oricati clienti fara telefon
    await prisma.client.create({ data: { ...baza, telefon: "0799000001", telefonNormalizat: "0799000001", telefonDublat: true } });
    await prisma.client.create({ data: { ...baza } });
    await prisma.client.create({ data: { ...baza } });
    expect(await prisma.client.count({ where: { nume: "Index Partial" } })).toBe(4);
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
