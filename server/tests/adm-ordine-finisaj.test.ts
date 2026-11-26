import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { citesteCsvOptiuni, incarcaOptiuniListe, optiunileListei } from "../src/modules/adm/optiuniListe.js";
import { asiguraCatalogBilka } from "./catalogTest.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

// S29b (MODIFICAREA M14, docs/MODIFICARI-S29B.md): ordinea finisajelor in listele de selectie sta intr-o lista
// de referinta - lista de optiuni "ordine_finisaj" din baza (fara migrare) -, nu in cod. Lista de pornire e in
// docs/import/configurare/optiuni-liste.csv; se incarca idempotent (doar ce lipseste: ce a schimbat Admin
// general ramane), se schimba din Zona tehnica -> Referinte si ajunge la ecrane odata cu referintele editorului.

const app = creeazaApp();
const S = "-m14@exemplu.local";
const EMAIL = { adminGeneral: `admin-general${S}`, admin1: `admin1${S}`, agent1: `agent1${S}` };
const PORNIRE = ["lucios", "colorat (lucios)", "mat", "Grande Mat", "Wood", "RAL 8003", "zincat", "dubluvopsit lucios", "dubluvopsit lucios SSAB", "dubluvopsit mat", "dubluvopsit mat SSAB", "Magnelis", "Aluzinc"];

beforeAll(async () => {
  const adminGeneral = await creeazaUtilizatorTest(EMAIL.adminGeneral, "ADMIN_GENERAL");
  await asiguraCatalogBilka(adminGeneral);
  await incarcaOptiuniListe(prisma);
  const firma = (await prisma.firma.create({ data: { denumire: "Firma M14", cui: "RO2914", nrRegCom: "J2914", adresa: "A", telefon: "1", email: `f1${S}` } })).id;
  const admin1 = await creeazaUtilizatorTest(EMAIL.admin1, "ADMINISTRATOR", { firmaId: firma, serieOferta: "YMA", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.agent1, "AGENT", { firmaId: firma, administratorId: admin1.id, serieOferta: "YMG", adaosProcent: 1 });
}, 240_000);

afterAll(async () => {
  // ordinea de pornire pusa la loc, pentru fisierele de test care urmeaza
  for (const [k, valoare] of PORNIRE.entries()) await prisma.optiuneLista.updateMany({ where: { lista: "ordine_finisaj", valoare }, data: { ordine: k + 1, activ: true } });
  await prisma.optiuneLista.deleteMany({ where: { lista: "ordine_finisaj", valoare: "Finisaj De Proba M14" } });
  await prisma.$disconnect();
});

describe("ordinea finisajelor, din lista de referinta (S29b, M14)", () => {
  it("lista de pornire din CSV: cele 13 finisaje, in ordinea aprobata, numerotate 1-13", () => {
    const randuri = citesteCsvOptiuni().filter((r) => r.lista === "ordine_finisaj");
    expect(randuri.map((r) => r.valoare)).toEqual(PORNIRE);
    expect(randuri.map((r) => r.ordine)).toEqual(PORNIRE.map((_, k) => k + 1));
    expect(randuri.every((r) => r.activ)).toBe(true);
  });

  it("toate finisajele din catalog sunt in lista de pornire (niciunul nu ramane la „sfarsit, alfabetic”)", async () => {
    const dinCatalog = (await prisma.produs.findMany({ where: { finisaj: { not: null } }, distinct: ["finisaj"], select: { finisaj: true } })).map((p) => p.finisaj!).filter((f) => f.trim() !== "");
    expect(dinCatalog.length).toBeGreaterThan(5);
    expect(dinCatalog.filter((f) => !PORNIRE.includes(f))).toEqual([]);
  });

  it("incarcarea e idempotenta si ajunge la ecrane: referintele editorului si lista de optiuni dau ordinea din baza", async () => {
    expect(await incarcaOptiuniListe(prisma)).toBe(0);
    expect((await optiunileListei(prisma, "ordine_finisaj")).map((o) => o.valoare)).toEqual(PORNIRE);
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const ref = (await agent.get("/api/oferte/catalog/referinte").expect(200)).body;
    expect(ref.ordineFinisaje).toEqual(PORNIRE);
    // „Află preț” o citeste ca pe orice lista de optiuni
    const lista = (await agent.get("/api/oferte/optiuni/ordine_finisaj").expect(200)).body;
    expect(lista.optiuni.map((o: { valoare: string }) => o.valoare)).toEqual(PORNIRE);
    // celelalte liste raman cum erau
    expect((await agent.get("/api/oferte/optiuni/motiv_completare").expect(200)).body.optiuni).toHaveLength(4);
    await agent.get("/api/oferte/optiuni/altceva").expect(404);
  });

  it("Admin general schimba ordinea din Zona tehnica -> Referinte: ecranele o primesc pe cea noua, iar o noua incarcare din CSV nu o strica", async () => {
    const ag = await autentificaAgent(app, EMAIL.adminGeneral);
    const randuri = (await ag.get("/api/adm/cat/referinte/optiuni-liste").expect(200)).body.randuri as { id: string; lista: string; valoare: string; ordine: number; activ: boolean }[];
    const mat = randuri.find((r) => r.lista === "ordine_finisaj" && r.valoare === "mat")!;
    // „mat” inaintea lui „lucios”
    const r = await ag.put(`/api/adm/cat/referinte/optiuni-liste/${mat.id}`).send({ lista: "ordine_finisaj", valoare: "mat", ordine: 0, activ: true });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    // un finisaj nou, adaugat de Admin general la locul 4
    const nou = await ag.post("/api/adm/cat/referinte/optiuni-liste").send({ lista: "ordine_finisaj", valoare: "Finisaj De Proba M14", ordine: 4, activ: true });
    expect(nou.status, JSON.stringify(nou.body)).toBe(201);
    expect(await incarcaOptiuniListe(prisma)).toBe(0);

    const agent = await autentificaAgent(app, EMAIL.agent1);
    const ordine = (await agent.get("/api/oferte/catalog/referinte").expect(200)).body.ordineFinisaje as string[];
    // la aceeasi ordine (4), alfabetic: „Finisaj De Proba M14” inaintea lui „Grande Mat”
    expect(ordine.slice(0, 5)).toEqual(["mat", "lucios", "colorat (lucios)", "Finisaj De Proba M14", "Grande Mat"]);
    expect(ordine).toHaveLength(PORNIRE.length + 1);
    // agentul nu poate schimba lista
    await agent.put(`/api/adm/cat/referinte/optiuni-liste/${mat.id}`).send({ lista: "ordine_finisaj", valoare: "mat", ordine: 9, activ: true }).expect(403);
  });
});
