import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/db/prisma.js";
import { sincronizeazaActiv } from "../src/modules/imp/sincronizareActiv.js";
import { asiguraCatalogBilka } from "./catalogTest.js";
import { creeazaUtilizatorTest } from "./helpers.js";

// S17d: corectia de date cu jurnal - `activ` din CSV-urile de import ajunge in baza fara
// reimport; idempotent; nimic sters; ce e activ in CSV dar inactiv in baza doar se raporteaza

const EMAIL = "admin-sinc@exemplu.local";
let utilizator: { id: string; nume: string };

beforeAll(async () => {
  const admin = await creeazaUtilizatorTest(EMAIL, "ADMIN_GENERAL");
  utilizator = { id: admin.id, nume: admin.nume };
  await asiguraCatalogBilka(admin);
}, 240_000);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("sincronizarea campului activ cu CSV-urile", () => {
  it("CSV = baza dupa import: cele 38 de produse inactive din CSV sunt inactive, nimic de dezactivat", async () => {
    const r = await sincronizeazaActiv({ utilizator, aplica: false });
    expect(r.fisiere.length).toBeGreaterThanOrEqual(9);
    expect(r.inactiveInCsv).toBe(38);
    expect(r.dezactivate).toEqual([]);
    expect(r.necunoscute).toEqual([]);
    expect(r.aplicat).toBe(false);
    const compartiment = await prisma.compartiment.findFirstOrThrow({ where: { denumire: "Bilka" } });
    expect(await prisma.produs.count({ where: { compartimentId: compartiment.id, activ: false } })).toBe(38);
    expect(await prisma.produs.count({ where: { compartimentId: compartiment.id, codFurnizor: { startsWith: "SA" }, activ: true, grup: { denumire: "Sistem pluvial Aluzinc" } } })).toBe(0);
  }, 120_000);

  it("un produs reactivat din greseala revine inactiv, cu rand in jurnal; a doua rulare nu mai schimba nimic; fara --aplica nu se scrie", async () => {
    const banda = await prisma.produs.findFirstOrThrow({ where: { codFurnizor: "BANDAETAEXP" } });
    expect(banda.activ).toBe(false);
    await prisma.produs.update({ where: { id: banda.id }, data: { activ: true } });

    const proba = await sincronizeazaActiv({ utilizator, aplica: false });
    expect(proba.dezactivate.map((p) => p.codFurnizor)).toEqual(["BANDAETAEXP"]);
    expect((await prisma.produs.findUniqueOrThrow({ where: { id: banda.id } })).activ).toBe(true);

    const aplicat = await sincronizeazaActiv({ utilizator, aplica: true });
    expect(aplicat.dezactivate.map((p) => p.codFurnizor)).toEqual(["BANDAETAEXP"]);
    expect((await prisma.produs.findUniqueOrThrow({ where: { id: banda.id } })).activ).toBe(false);
    const jurnal = await prisma.jurnalIntrare.findMany({ where: { entitate: "Produs", entitateId: banda.id, actiune: "corectie_date_activ" } });
    expect(jurnal).toHaveLength(1);
    expect(jurnal[0]).toMatchObject({ camp: "activ", valoareInainte: "true", valoareDupa: "false", numeUtilizatorLaMoment: utilizator.nume });

    const din_nou = await sincronizeazaActiv({ utilizator, aplica: true });
    expect(din_nou.dezactivate).toEqual([]);
    expect(await prisma.jurnalIntrare.count({ where: { entitate: "Produs", entitateId: banda.id, actiune: "corectie_date_activ" } })).toBe(1);
  }, 120_000);

  it("un produs activ in CSV dar inactiv in baza se raporteaza, nu se reactiveaza", async () => {
    const coama = await prisma.produs.findFirstOrThrow({ where: { codFurnizor: "ACMICMAT050", activ: true } });
    await prisma.produs.update({ where: { id: coama.id }, data: { activ: false } });
    try {
      const r = await sincronizeazaActiv({ utilizator, aplica: true });
      expect(r.deActivatInCsv.map((p) => p.codFurnizor)).toContain("ACMICMAT050");
      expect((await prisma.produs.findUniqueOrThrow({ where: { id: coama.id } })).activ).toBe(false);
    } finally {
      await prisma.produs.update({ where: { id: coama.id }, data: { activ: true } });
    }
  }, 120_000);
});
