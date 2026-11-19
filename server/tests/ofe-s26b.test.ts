import { readFile } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { PDFParse } from "pdf-parse";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { env } from "../src/env.js";
import { incarcaOptiuniListe } from "../src/modules/adm/optiuniListe.js";
import type { RezultatOferta } from "../src/modules/mot/tipuri.js";
import { asiguraCatalogBilka } from "./catalogTest.js";
import { citesteEtalon } from "./etalon/incarcaEtalon.js";
import { corpDinEtalon, preturiDinEtalon, puneCursulEtalonului } from "./etalonApi.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

// S26b (docs/MODIFICARI-S26.md): MODIFICAREA M5 - ajustarea pretului de vanzare dupa "Comandat" (doar
// Administratorul firmei comenzii, suma noua cu TVA in lei + motiv, cat comanda nu e incasata integral;
// motorul neschimbat pe intrarea inghetata, cu tinta = suma noua; garda ramane); MODIFICAREA M8 -
// recomandarea (persoana + comision -> vanzari) si montatorul de executie (nume + telefon -> comenzi,
// fisa soferului) ca doua rubrici.
//
// Cifrele pe hartie, pe E01 (curs 5,3485; curs achizitie 5,4020; TVA 21 %; costul de achizitie 14.337,77 lei):
//   la "Comandat": total 17.000,00 lei (3.178,46 EUR cu TVA); vanzari 17.000,00 / 14.337,77 / 2.662,23 / 2.200,19
//   ajustat la 16.500,00: 2.549,57 EUR fara TVA (= suma liniilor), 3.084,98 EUR cu TVA;
//     vanzari 16.500,00 / 14.337,77 / 2.162,23 / 1.786,97 (costul neschimbat)
//     lucrarea cu completarea E10 (0 / 202,05): 16.500,00 / 14.539,82 / 1.960,18 / 1.619,98
//     coama mica 5,75 (era 5,93), opritorul 3,84 (era 3,95): returul 2 + 1 = 11,50 + 3,84 = 15,34 fara TVA;
//     TVA 3,22; 18,56 EUR; x 5,3485 = 99,27 lei; achizitia marfii returnate ramane 86,29 lei
//   14.000,00 e SUB achizitie (14.337,77) -> refuz cu suma minima posibila

const app = creeazaApp();
const S = "-s26b@exemplu.local";
const EMAIL = { adminGeneral: `admin-general${S}`, admin1: `admin1${S}`, agent1: `agent1${S}`, admin2: `admin2${S}`, gestiune: `gestiune${S}`, contabil: `contabil${S}` };
let firma1: string;
let idAgent1: string;

function dataLocala(delta = 0): string {
  const d = new Date(Date.now() + delta * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

beforeAll(async () => {
  const adminGeneral = await creeazaUtilizatorTest(EMAIL.adminGeneral, "ADMIN_GENERAL");
  await asiguraCatalogBilka(adminGeneral);
  await incarcaOptiuniListe(prisma);
  firma1 = (await prisma.firma.create({ data: { denumire: "Firma S26b 1", cui: "RO91", nrRegCom: "J91", adresa: "A", telefon: "1", email: `f1${S}` } })).id;
  const firma2 = (await prisma.firma.create({ data: { denumire: "Firma S26b 2", cui: "RO92", nrRegCom: "J92", adresa: "B", telefon: "2", email: `f2${S}` } })).id;
  const admin1 = await creeazaUtilizatorTest(EMAIL.admin1, "ADMINISTRATOR", { firmaId: firma1, serieOferta: "SBA", adaosProcent: 1 });
  idAgent1 = (await creeazaUtilizatorTest(EMAIL.agent1, "AGENT", { firmaId: firma1, administratorId: admin1.id, serieOferta: "SBG", adaosProcent: 1 })).id;
  await creeazaUtilizatorTest(EMAIL.admin2, "ADMINISTRATOR", { firmaId: firma2, serieOferta: "SBB", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.gestiune, "GESTIUNE", { accesGeneralFirme: true, telefon: "0755 000 555" });
  await creeazaUtilizatorTest(EMAIL.contabil, "CONTABILITATE", { accesGeneralFirme: true });
  for (const d of [dataLocala(0), dataLocala(-1)]) {
    await prisma.cursValutar.upsert({ where: { data_moneda: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR" } }, update: { curs: "5.3485" }, create: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR", curs: "5.3485", sursa: "test" } });
  }
}, 240_000);

afterAll(async () => {
  await prisma.$disconnect();
});

type Agent = Awaited<ReturnType<typeof autentificaAgent>>;
type Rand = Record<string, any>;
const CLIENT = { nume: "Client Ajustare", telefon: "0730 127 001", adresa: "Str. Ajustării 1", localitate: "Panciu" };

// oferta-model pana inainte de statusuri (produse + preturi)
async function oferta(agent: Agent, etalon: string, client: Rand = CLIENT, completareLa?: string): Promise<string> {
  const { body } = await agent.post("/api/oferte").send({ client }).expect(201);
  const id = body.oferta.id as string;
  if (completareLa) await agent.put(`/api/oferte/${id}/completare-la`).send({ ofertaId: completareLa, motiv: "Altele" }).expect(200);
  const e = citesteEtalon(etalon);
  const rp = await agent.put(`/api/oferte/${id}/produse`).send(await corpDinEtalon(e));
  expect(rp.status, JSON.stringify(rp.body)).toBe(200);
  await puneCursulEtalonului(id, e);
  const r = await agent.put(`/api/oferte/${id}/preturi`).send(preturiDinEtalon(e, rp.body.oferta.linii));
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return id;
}

async function comanda(agent: Agent, id: string): Promise<{ ofertaId: string; comandaId: string; numarComplet: string }> {
  await agent.put(`/api/oferte/${id}/status`).send({ status: "TRANSMISA" }).expect(200);
  await agent.put(`/api/oferte/${id}/status`).send({ status: "DE_COMANDAT", livrareBilka: { tip: "DEPOZIT" } }).expect(200);
  const c = await agent.put(`/api/oferte/${id}/status`).send({ status: "COMANDAT" });
  expect(c.status, JSON.stringify(c.body)).toBe(200);
  const cmd = await prisma.comanda.findUniqueOrThrow({ where: { ofertaId: id } });
  return { ofertaId: id, comandaId: cmd.id, numarComplet: `${cmd.serie}-${String(cmd.numar).padStart(4, "0")}` };
}

const vanzari = async (agent: Agent) => (await agent.get("/api/vanzari").expect(200)).body as { randuri: Rand[] };
const randul = (r: { randuri: Rand[] }, comandaId: string) => [...r.randuri, ...r.randuri.flatMap((x) => x.copii as Rand[])].find((x) => x.comandaId === comandaId && !x.retur);
const textPdf = async (fisier: string) => (await new PDFParse({ data: new Uint8Array(await readFile(path.join(env.dateDir, fisier))) }).getText()).text.replace(/\s+/g, " ");
const ajusteaza = (agent: Agent, comandaId: string, totalLei: string, motiv: string | undefined = "discount acordat la livrare, plată cash") => agent.post(`/api/comenzi/${comandaId}/ajustare-pret`).send({ totalLei, motiv });

describe("M5 - ajustarea pretului de vanzare dupa „Comandat”", () => {
  let e01: Awaited<ReturnType<typeof comanda>>;
  let e10: Awaited<ReturnType<typeof comanda>>;

  beforeAll(async () => {
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    e01 = await comanda(agent1, await oferta(agent1, "E01"));
    e10 = await comanda(agent1, await oferta(agent1, "E10", CLIENT, e01.ofertaId));
  }, 300_000);

  it("la „Comandat” se salveaza si intrarea motorului, langa rezultat", async () => {
    const o = await prisma.oferta.findUniqueOrThrow({ where: { id: e01.ofertaId } });
    const intrare = o.intrareMotor as Rand;
    expect(intrare).toMatchObject({ cursBnr: "5.3485", tinta: { tip: "total_cu_tva_lei", valoare: "17000" }, cont: { tip: "AGENT", adaosPct: "1" } });
    expect(intrare.linii).toHaveLength(28);
    expect((o.rezultatMotor as unknown as RezultatOferta).totaluri.documentTotalLei).toBe("17000.00");
  });

  it("doar Administratorul firmei comenzii: Agent, Admin general, Administratorul altei firme, Gestiunea si Contabilitatea = 403; motivul e obligatoriu", async () => {
    for (const email of [EMAIL.agent1, EMAIL.adminGeneral, EMAIL.admin2, EMAIL.gestiune, EMAIL.contabil]) {
      const r = await ajusteaza(await autentificaAgent(app, email), e01.comandaId, "16500");
      expect(r.status, email).toBe(403);
    }
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    const faraMotiv = await admin1.post(`/api/comenzi/${e01.comandaId}/ajustare-pret`).send({ totalLei: "16500", motiv: "  " });
    expect(faraMotiv.status).toBe(400);
    expect(faraMotiv.body.campuri[0]).toMatchObject({ camp: "motiv" });
    // drepturile, pe ecran: doar la Administratorul firmei
    expect((await admin1.get(`/api/comenzi/${e01.comandaId}`).expect(200)).body.comanda.drepturi.ajustarePret).toBe(true);
    expect((await (await autentificaAgent(app, EMAIL.adminGeneral)).get(`/api/comenzi/${e01.comandaId}`).expect(200)).body.comanda.drepturi.ajustarePret).toBe(false);
    expect((await (await autentificaAgent(app, EMAIL.agent1)).get(`/api/comenzi/${e01.comandaId}`).expect(200)).body.comanda.drepturi.ajustarePret).toBe(false);
    expect(await prisma.comandaAjustarePret.count({ where: { comandaId: e01.comandaId } })).toBe(0);
  });

  it("sub achizitie = 409 cu suma minima posibila (garda ramane); la suma minima se poate", async () => {
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    const r = await ajusteaza(admin1, e01.comandaId, "14000");
    expect(r.status).toBe(409);
    expect(r.body.eroare).toMatch(/sub achiziți/i);
    const minima = Number(r.body.sumaMinimaLei);
    expect(minima).toBeGreaterThan(14000);
    expect(minima).toBeLessThan(14400); // costul de achizitie e 14.337,77
    expect(r.body.eroare).toContain("Suma minimă posibilă");
    expect(await prisma.comandaAjustarePret.count({ where: { comandaId: e01.comandaId } })).toBe(0);
    expect((await prisma.comanda.findUniqueOrThrow({ where: { id: e01.comandaId } })).totalLei.toFixed(2)).toBe("17000.00");
    // suma minima raportata chiar trece garda (verificata pe o alta comanda, ca aceasta sa ramana curata)
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    const alta = await comanda(agent1, await oferta(agent1, "E01", { ...CLIENT, nume: "Client Minim", telefon: "0730 127 002" }));
    const laMinim = await ajusteaza(admin1, alta.comandaId, r.body.sumaMinimaLei, "la prețul de achiziție");
    expect(laMinim.status, JSON.stringify(laMinim.body)).toBe(200);
    expect(laMinim.body.comanda.totalLei).toBe(r.body.sumaMinimaLei);
  }, 120_000);

  it("E01 ajustat la 16.500,00: totalul exact, suma liniilor = totalul, restul, istoricul cu motivul; rezultatul de la „Comandat” ramane", async () => {
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    const r = await ajusteaza(admin1, e01.comandaId, "16500,00");
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.ajustare).toMatchObject({ versiune: 1, totalVechiLei: "17000.00", totalNouLei: "16500.00", totalVechiCuTvaEur: "3178.46", totalNouCuTvaEur: "3084.98", motiv: "discount acordat la livrare, plată cash", de: "Test ADMINISTRATOR" });
    expect(r.body.comanda).toMatchObject({ totalLei: "16500.00", totalCuTvaEur: "3084.98", restLei: "16500.00", pretAjustat: { versiune: 1, totalInitialLei: "17000.00", motiv: "discount acordat la livrare, plată cash", de: "Test ADMINISTRATOR" } });
    expect(r.body.comanda.incasare).toMatchObject({ status: "NEINCASAT", restLei: "16500.00" });
    // rezultatul ajustat: totalul la ban, Σ (pret linie x cantitate) = totalul fara TVA, aceleasi produse si cantitati
    const a = await prisma.comandaAjustarePret.findFirstOrThrow({ where: { comandaId: e01.comandaId, versiune: 1 } });
    const ajustat = a.rezultatMotor as unknown as RezultatOferta;
    const original = (await prisma.oferta.findUniqueOrThrow({ where: { id: e01.ofertaId } })).rezultatMotor as unknown as RezultatOferta;
    expect(ajustat.totaluri).toMatchObject({ documentTotalLei: "16500.00", documentCuTvaEur: "3084.98", documentFaraTvaEur: "2549.57" });
    expect(ajustat.linii.reduce((s, l) => s + Math.round(Number(l.valoareEur) * 100), 0)).toBe(254957);
    for (const l of ajustat.linii) expect(Math.round(Number(l.pretDocumentEur) * Number(l.cantitate) * 100) / 100, l.cod).toBeCloseTo(Number(l.valoareEur), 2);
    expect(ajustat.linii.map((l) => [l.id, l.cod, l.cantitate, l.achizitieRealaEur])).toEqual(original.linii.map((l) => [l.id, l.cod, l.cantitate, l.achizitieRealaEur]));
    expect(ajustat.vanzari).toMatchObject({ pretVanzareLei: "16500.00", costAchizitieLei: "14337.77", adaosNetLei: "2162.23", adaosBrutLei: "1786.97" });
    expect(ajustat.garda.respectata).toBe(true);
    expect(original.totaluri.documentTotalLei).toBe("17000.00"); // oferta ramane inghetata
    // istoricul comenzii si lista ajustarilor din detaliu
    const d = (await admin1.get(`/api/comenzi/${e01.comandaId}`).expect(200)).body.comanda as Rand;
    expect(d.istoric.find((i: Rand) => i.tip === "pret")).toMatchObject({ camp: "totalLei", valoareInainte: "17000.00", valoareDupa: "16500.00", mentiuni: "discount acordat la livrare, plată cash", numeUtilizatorLaMoment: "Test ADMINISTRATOR" });
    expect(d.ajustariPret).toEqual([expect.objectContaining({ versiune: 1, totalVechiLei: "17000.00", totalNouLei: "16500.00", motiv: "discount acordat la livrare, plată cash", de: "Test ADMINISTRATOR" })]);
    // pe pagina ofertei: nota "pret ajustat pe comanda"
    const o = (await (await autentificaAgent(app, EMAIL.agent1)).get(`/api/oferte/${e01.ofertaId}`).expect(200)).body.oferta as Rand;
    expect(o.comanda).toMatchObject({ totalLei: "16500", pretAjustat: { versiune: 1, totalInitialLei: "17000.00", motiv: "discount acordat la livrare, plată cash", de: "Test ADMINISTRATOR" } });
    // aceeasi suma inca o data = nimic de ajustat
    expect((await ajusteaza(admin1, e01.comandaId, "16500")).status).toBe(409);
  });

  it("efectele: vanzarile (costul neschimbat, adaosul recalculat, lucrarea), tabelul de facturare din rezultatul ajustat, oferta PDF neschimbata, fisa soferului", async () => {
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    const v = await vanzari(admin1);
    const x = randul(v, e01.comandaId)!;
    expect(x).toMatchObject({ pretVanzareLei: "16500.00", costAchizitieLei: "14337.77", adaosNetLei: "2162.23", adaosBrutLei: "1786.97", pretAjustat: { versiune: 1, totalInitialLei: "17000.00", motiv: "discount acordat la livrare, plată cash" } });
    expect(x.copii.map((k: Rand) => k.comandaId)).toEqual([e10.comandaId]);
    expect(x.lucrare).toEqual({ pretVanzareLei: "16500.00", costAchizitieLei: "14539.82", adaosNetLei: "1960.18", adaosBrutLei: "1619.98", comenzi: 2 });
    expect(randul(v, e10.comandaId)!.pretAjustat).toBeNull();
    // tabelul de facturare generat din comanda: totalul la ban = suma noua
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const t = await gestiune.post(`/api/comenzi/${e01.comandaId}/documente`).send({ tip: "TABEL_FACTURARE" });
    expect(t.status, JSON.stringify(t.body)).toBe(201);
    const tabel = await textPdf((await prisma.ofertaDocument.findUniqueOrThrow({ where: { id: t.body.document.id } })).fisier);
    expect(tabel).toContain("TABEL DE FACTURARE");
    expect(tabel).toContain("Total de facturat 16.500,00 lei");
    expect(tabel).not.toContain("17.000,00");
    // oferta (si detaliata) raman la preturile de la "Comandat"
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    const of = await agent1.post(`/api/oferte/${e01.ofertaId}/documente`).send({ tip: "OFERTA" }).expect(201);
    const textOferta = await textPdf((await prisma.ofertaDocument.findUniqueOrThrow({ where: { id: of.body.document.id } })).fisier);
    expect(textOferta).toContain("Total în lei 17.000,00 lei");
    const det = await gestiune.post(`/api/comenzi/${e01.comandaId}/documente`).send({ tip: "DETALIATA" }).expect(201);
    expect(await textPdf((await prisma.ofertaDocument.findUniqueOrThrow({ where: { id: det.body.document.id } })).fisier)).toContain("17.000,00 lei");
    // "de incasat" pe fisa soferului = restul dupa ajustare
    const fisa = (await gestiune.post("/api/comenzi/fisa-soferului").send({ comenzi: [e01.comandaId] }).expect(200)).body.fisa as Rand;
    expect(fisa.blocuri[0].restLei).toBe("16500.00");
  }, 120_000);

  it("un retur dupa ajustare se calculeaza la preturile ajustate", async () => {
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    const { linii } = (await agent1.get(`/api/comenzi/${e01.comandaId}/retururi`).expect(200)).body as { linii: Rand[] };
    const coama = linii.find((l) => l.cod === "ACMICMAT050")!;
    const opritor = linii.find((l) => l.cod === "AOZ20MAT050")!;
    expect(coama).toMatchObject({ cantitateComandata: "13", pretDocumentEur: "5.75" });
    expect(opritor.pretDocumentEur).toBe("3.84");
    const r = await agent1.post(`/api/comenzi/${e01.comandaId}/retururi`).send({ linii: [{ linieId: coama.linieId, cantitate: "2" }, { linieId: opritor.linieId, cantitate: "1" }] });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    expect(r.body.retur).toMatchObject({ numar: 1, sumaFaraTvaEur: "15.34", tvaEur: "3.22", sumaCuTvaEur: "18.56", sumaCuTvaLei: "99.27", achizitieLei: "86.29" });
  });

  it("a doua ajustare = versiunea 2 (totalul vechi e cel ajustat); returul dinainte nu se recalculeaza; sub ce s-a incasat deja = 409 cu suma; incasata integral = 409", async () => {
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    const r2 = await ajusteaza(admin1, e01.comandaId, "16800", "revenit asupra discountului");
    expect(r2.status, JSON.stringify(r2.body)).toBe(200);
    expect(r2.body.ajustare).toMatchObject({ versiune: 2, totalVechiLei: "16500.00", totalNouLei: "16800.00" });
    expect(r2.body.comanda.pretAjustat).toMatchObject({ versiune: 2, totalInitialLei: "17000.00", motiv: "revenit asupra discountului" });
    expect((await prisma.comandaRetur.findFirstOrThrow({ where: { comandaId: e01.comandaId } })).sumaCuTvaLei.toFixed(2)).toBe("99.27");
    expect(await prisma.comandaAjustarePret.count({ where: { comandaId: e01.comandaId } })).toBe(2);
    // incasare de 15.000: suma noua nu poate cobori sub ea (14.500 ar trece garda, dar e sub incasat)
    await admin1.post(`/api/comenzi/${e01.comandaId}/incasari`).send({ sumaLei: "15000", data: dataLocala(0), ceReprezinta: "transfer" }).expect(201);
    const sub = await ajusteaza(admin1, e01.comandaId, "14500");
    expect(sub.status).toBe(409);
    expect(sub.body.eroare).toContain("15.000,00");
    // exact cat s-a incasat se poate (restul ajunge 0) - iar de aici inainte nu se mai ajusteaza
    const exact = await ajusteaza(admin1, e01.comandaId, "15000", "închis la suma încasată");
    expect(exact.status, JSON.stringify(exact.body)).toBe(200);
    expect(exact.body.comanda).toMatchObject({ totalLei: "15000.00", restLei: "0.00", incasare: { status: "INCASAT" } });
    const inchis = await ajusteaza(admin1, e01.comandaId, "15500");
    expect(inchis.status).toBe(409);
    expect(inchis.body.eroare).toMatch(/încasată integral/);
    expect((await admin1.get(`/api/comenzi/${e01.comandaId}`).expect(200)).body.comanda.drepturi.ajustarePret).toBe(true); // dreptul ramane; butonul e oprit cu motivul (rest 0)
  });

  it("intrarea inghetata: cu intrarea salvata, schimbarea adaosului contului nu conteaza; la comenzile dinainte de S26b intrarea se reconstruieste si se accepta doar daca reproduce rezultatul salvat", async () => {
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    const a = await comanda(agent1, await oferta(agent1, "E01", { ...CLIENT, nume: "Client Intrare", telefon: "0730 127 003" }));
    const b = await comanda(agent1, await oferta(agent1, "E01", { ...CLIENT, nume: "Client Vechi", telefon: "0730 127 004" }));
    // b = comanda "dinainte de S26b": fara intrarea salvata
    await prisma.oferta.update({ where: { id: b.ofertaId }, data: { intrareMotor: Prisma.DbNull } });
    const vechi = await ajusteaza(admin1, b.comandaId, "16900", "reconstruită din ofertă");
    expect(vechi.status, JSON.stringify(vechi.body)).toBe(200);
    expect(vechi.body.comanda.totalLei).toBe("16900.00");
    try {
      // adaosul contului se schimba dupa comanda
      await prisma.utilizator.update({ where: { id: idAgent1 }, data: { adaosProcent: 3 } });
      // a: are intrarea salvata -> costul ramane cel de la comanda
      const cuIntrare = await ajusteaza(admin1, a.comandaId, "16700", "cu intrarea salvată");
      expect(cuIntrare.status, JSON.stringify(cuIntrare.body)).toBe(200);
      expect(randul(await vanzari(admin1), a.comandaId)).toMatchObject({ pretVanzareLei: "16700.00", costAchizitieLei: "14337.77" });
      // b: intrarea reconstruita nu mai reproduce rezultatul salvat -> refuz, niciodata pe alt cost
      const refuz = await ajusteaza(admin1, b.comandaId, "16800", "a doua oară");
      expect(refuz.status).toBe(409);
      expect(refuz.body.eroare).toContain("adaosul contului s-a schimbat de la comandă; ajustarea nu se poate face pe alt cost");
      expect((await prisma.comanda.findUniqueOrThrow({ where: { id: b.comandaId } })).totalLei.toFixed(2)).toBe("16900.00");
    } finally {
      await prisma.utilizator.update({ where: { id: idAgent1 }, data: { adaosProcent: 1 } });
    }
  }, 180_000);

  it("suma care nu se poate atinge la ban (E12) = 409 cu cea mai apropiata suma posibila; aceea se salveaza exact", async () => {
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    const c = await comanda(agent1, await oferta(agent1, "E12", { ...CLIENT, nume: "Client Exact", telefon: "0730 127 005" }));
    const total = (await prisma.comanda.findUniqueOrThrow({ where: { id: c.comandaId } })).totalLei;
    const ceruta = total.minus("100.37").toFixed(2); // pe hartie (cont 1 %): 17.281,75 - 100,37 = 17.181,38 -> iese 17.181,31
    const r = await ajusteaza(admin1, c.comandaId, ceruta);
    expect(r.status, JSON.stringify(r.body)).toBe(409);
    expect(r.body.eroare).toContain("Cea mai apropiată sumă posibilă");
    expect(r.body.sumaApropiataLei).toMatch(/^\d+\.\d{2}$/);
    expect(Math.abs(Number(r.body.sumaApropiataLei) - Number(ceruta))).toBeLessThan(1);
    const ok = await ajusteaza(admin1, c.comandaId, r.body.sumaApropiataLei);
    expect(ok.status, JSON.stringify(ok.body)).toBe(200);
    expect(ok.body.comanda.totalLei).toBe(r.body.sumaApropiataLei);
    const a = await prisma.comandaAjustarePret.findFirstOrThrow({ where: { comandaId: c.comandaId } });
    expect((a.rezultatMotor as unknown as RezultatOferta).totaluri.documentTotalLei).toBe(r.body.sumaApropiataLei);
  }, 120_000);

  it("comenzile manuale raman pe mecanismul lor de sume", async () => {
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    const m = await admin1.post("/api/comenzi").send({ client: { nume: "Manual Ajustare", telefon: "0730 127 006", localitate: "Panciu" }, rezumat: "accesorii", totalLei: "1000", contAlocatId: idAgent1 });
    expect(m.status, JSON.stringify(m.body)).toBe(201);
    const r = await ajusteaza(admin1, m.body.comanda.id, "900");
    expect(r.status).toBe(409);
    expect(r.body.eroare).toMatch(/manual/i);
    expect((await admin1.get(`/api/comenzi/${m.body.comanda.id}`).expect(200)).body.comanda.drepturi.ajustarePret).toBe(false);
  });
});

describe("M8 - recomandarea si montatorul de executie: doua rubrici", () => {
  let ofertaId: string;
  let c: Awaited<ReturnType<typeof comanda>>;
  const TUDOREL = { nume: "Tudorel", telefon: "0766 852 465" };

  it("lista de persoane primeste tipul „colaborator”; pe oferta cele doua rubrici se salveaza separat, cu istoric; montatorul completat cere telefonul", async () => {
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    const colab = await agent1.post("/api/montatori").send({ nume: "Colaborator Lista", telefon: "0741 127 000", tip: "COLABORATOR" });
    expect(colab.status, JSON.stringify(colab.body)).toBe(201);
    expect(colab.body.montator.tip).toBe("COLABORATOR");

    ofertaId = await oferta(agent1, "E01", { nume: "Client Rubrici", telefon: "0730 127 010", adresa: "Str. Rubricii 2", localitate: "Cotești" });
    await agent1.put(`/api/oferte/${ofertaId}/status`).send({ status: "TRANSMISA" }).expect(200); // de aici se tine istoricul
    // recomandarea: persoana noua, de tip colaborator, cu comision
    const r1 = await agent1.put(`/api/oferte/${ofertaId}/montator`).send({ montatorNou: { nume: "Ionel Andrei", telefon: "0744 127 111", tip: "COLABORATOR" }, comisionRecomandareLei: "500" });
    expect(r1.status, JSON.stringify(r1.body)).toBe(200);
    expect(r1.body.oferta.montator).toMatchObject({ nume: "Ionel Andrei", tip: "COLABORATOR" });
    expect(r1.body.oferta.montatorExecutie).toBeNull();
    // montatorul de executie: nume + telefon; fara telefon e refuzat, cu campul
    const fara = await agent1.put(`/api/oferte/${ofertaId}/montator`).send({ montatorExecutie: { nume: "Tudorel" } });
    expect(fara.status).toBe(400);
    expect(fara.body.campuri).toEqual([expect.objectContaining({ camp: "montatorExecutie.telefon" })]);
    const r2 = await agent1.put(`/api/oferte/${ofertaId}/montator`).send({ montatorExecutie: TUDOREL, mentiuni: "montează echipa lui" });
    expect(r2.status, JSON.stringify(r2.body)).toBe(200);
    expect(r2.body.oferta.montatorExecutie).toEqual(TUDOREL);
    // rubricile sunt independente: recomandarea si comisionul au ramas
    expect(r2.body.oferta.montator).toMatchObject({ nume: "Ionel Andrei" });
    expect(r2.body.oferta.comisionRecomandareLei).toBe("500");
    // schimbarea comisionului nu atinge montatorul
    const r3 = await agent1.put(`/api/oferte/${ofertaId}/montator`).send({ comisionRecomandareLei: "550" }).expect(200);
    expect(r3.body.oferta.montatorExecutie).toEqual(TUDOREL);
    const ist = (await agent1.get(`/api/oferte/${ofertaId}/istoric`).expect(200)).body.intrari as Rand[];
    expect(ist.find((i) => i.camp === "montatorExecutie")).toMatchObject({ tip: "montator", valoareInainte: null, valoareDupa: "Tudorel · 0766 852 465", mentiuni: "montează echipa lui" });
    expect(ist.find((i) => i.camp === "montator")).toMatchObject({ valoareDupa: "Ionel Andrei" });
    // golirea montatorului
    const gol = await agent1.put(`/api/oferte/${ofertaId}/montator`).send({ montatorExecutie: null }).expect(200);
    expect(gol.body.oferta.montatorExecutie).toBeNull();
    await agent1.put(`/api/oferte/${ofertaId}/montator`).send({ montatorExecutie: TUDOREL }).expect(200);
  }, 120_000);

  it("la „Comandat”: coloana Montator si fisa soferului citesc montatorul de executie; vanzarile citesc recomandarea", async () => {
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    await agent1.put(`/api/oferte/${ofertaId}/status`).send({ status: "DE_COMANDAT", livrareBilka: { tip: "DEPOZIT" } }).expect(200);
    await agent1.put(`/api/oferte/${ofertaId}/status`).send({ status: "COMANDAT" }).expect(200);
    const cmd = await prisma.comanda.findUniqueOrThrow({ where: { ofertaId } });
    c = { ofertaId, comandaId: cmd.id, numarComplet: `${cmd.serie}-${String(cmd.numar).padStart(4, "0")}` };
    expect(cmd).toMatchObject({ montatorNume: "Ionel Andrei", montatorTelefon: "0744 127 111", montatorExecutieNume: "Tudorel", montatorExecutieTelefon: "0766 852 465" });
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const rand = ((await gestiune.get("/api/comenzi").query({ q: "Tudorel" }).expect(200)).body.comenzi as Rand[]).find((x) => x.id === c.comandaId)!; // cautarea gaseste si dupa montatorul de executie
    expect(rand.montator).toEqual(TUDOREL);
    expect(rand.recomandare).toEqual({ nume: "Ionel Andrei", telefon: "0744 127 111" });
    expect(rand.comision).toMatchObject({ lei: "550.00", achitat: false });
    // fisa soferului: montatorul de executie, cu telefonul, in date si in PDF
    const fisa = (await gestiune.post("/api/comenzi/fisa-soferului").send({ comenzi: [c.comandaId] }).expect(200)).body.fisa as Rand;
    expect(fisa.blocuri[0].montator).toEqual(TUDOREL);
    const pdf = await gestiune.post("/api/comenzi/fisa-soferului/pdf").send({ comenzi: [c.comandaId] }).buffer(true).parse((res, cb) => {
      const parti: Buffer[] = [];
      res.on("data", (d: Buffer) => parti.push(d));
      res.on("end", () => cb(null, Buffer.concat(parti)));
    });
    const textFisa = (await new PDFParse({ data: new Uint8Array(pdf.body as Buffer) }).getText()).text;
    expect(textFisa).toContain("Tudorel");
    expect(textFisa).not.toContain("Ionel Andrei");
    // vanzarile: sursa recomandarii si comisionul ei; montatorul nu apare
    const x = randul(await vanzari(await autentificaAgent(app, EMAIL.admin1)), c.comandaId)!;
    expect(x).toMatchObject({ sursaRecomandarii: "Ionel Andrei", comisionRecomandare: { lei: "550.00", achitat: false } });
    expect(JSON.stringify(x)).not.toContain("Tudorel");
    // dupa "Comandat" montatorul se schimba pe comanda, nu pe oferta; recomandarea ramane cum era (ca azi)
    const peOferta = await agent1.put(`/api/oferte/${ofertaId}/montator`).send({ montatorExecutie: { nume: "Altul", telefon: "0700 000 000" } });
    expect(peOferta.status).toBe(409);
    const o = (await agent1.get(`/api/oferte/${ofertaId}`).expect(200)).body.oferta as Rand;
    expect(o.comanda.montator).toEqual(TUDOREL);
  }, 120_000);

  it("pe comanda: montatorul il schimba contul comenzii, orice Administrator si Gestiunea (cu istoric); recomandarea doar contul ofertei si Administratorul lui", async () => {
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    const admin2 = await autentificaAgent(app, EMAIL.admin2);
    const contabil = await autentificaAgent(app, EMAIL.contabil);
    // Gestiunea schimba montatorul
    const g = await gestiune.put(`/api/comenzi/${c.comandaId}/montator`).send({ montator: { nume: "Vasile Echipa 2", telefon: "0722 127 222" }, mentiuni: "Tudorel e plecat" });
    expect(g.status, JSON.stringify(g.body)).toBe(200);
    expect(g.body.comanda.montator).toEqual({ nume: "Vasile Echipa 2", telefon: "0722 127 222" });
    expect(g.body.comanda.recomandare).toEqual({ nume: "Ionel Andrei", telefon: "0744 127 111" }); // neatinsa
    // ... dar nu recomandarea
    await gestiune.put(`/api/comenzi/${c.comandaId}/recomandare`).send({ recomandare: { nume: "Altcineva" } }).expect(403);
    // montatorul completat cere telefonul
    const fara = await gestiune.put(`/api/comenzi/${c.comandaId}/montator`).send({ montator: { nume: "Fara Telefon" } });
    expect(fara.status).toBe(400);
    expect(fara.body.campuri).toEqual([expect.objectContaining({ camp: "montator.telefon" })]);
    // Administratorul altei firme: montatorul da, recomandarea nu; Contabilitatea nimic
    await admin2.put(`/api/comenzi/${c.comandaId}/montator`).send({ montator: TUDOREL }).expect(200);
    await admin2.put(`/api/comenzi/${c.comandaId}/recomandare`).send({ recomandare: { nume: "Altcineva" } }).expect(403);
    await contabil.put(`/api/comenzi/${c.comandaId}/montator`).send({ montator: null }).expect(403);
    // contul comenzii: amandoua
    await agent1.put(`/api/comenzi/${c.comandaId}/montator`).send({ montator: null }).expect(200);
    const rec = await agent1.put(`/api/comenzi/${c.comandaId}/recomandare`).send({ recomandare: { nume: "Marin Constructorul", telefon: "0733 127 333" } });
    expect(rec.status, JSON.stringify(rec.body)).toBe(200);
    expect(rec.body.comanda).toMatchObject({ montator: null, recomandare: { nume: "Marin Constructorul", telefon: "0733 127 333" } });
    // Administratorul firmei: recomandarea, cu istoric; vanzarile o citesc
    await admin1.put(`/api/comenzi/${c.comandaId}/recomandare`).send({ recomandare: { nume: "Ionel Andrei", telefon: "0744 127 111" }, mentiuni: "corectat" }).expect(200);
    expect(randul(await vanzari(admin1), c.comandaId)!.sursaRecomandarii).toBe("Ionel Andrei");
    const d = (await admin1.get(`/api/comenzi/${c.comandaId}`).expect(200)).body.comanda as Rand;
    const contacte = (d.istoric as Rand[]).filter((i) => i.tip === "contact").reverse();
    expect(contacte.filter((i) => i.camp === "montatorExecutie").map((i) => `${i.valoareInainte} -> ${i.valoareDupa}`)).toEqual(["Tudorel · 0766 852 465 -> Vasile Echipa 2 · 0722 127 222", "Vasile Echipa 2 · 0722 127 222 -> Tudorel · 0766 852 465", "Tudorel · 0766 852 465 -> null"]);
    expect(contacte.find((i) => i.camp === "montatorExecutie")!.mentiuni).toBe("Tudorel e plecat");
    expect(contacte.filter((i) => i.camp === "recomandare").map((i) => i.valoareDupa)).toEqual(["Marin Constructorul · 0733 127 333", "Ionel Andrei · 0744 127 111"]);
    // drepturile, pe ecran
    expect(d.drepturi).toMatchObject({ montator: true, recomandare: true });
    expect((await gestiune.get(`/api/comenzi/${c.comandaId}`).expect(200)).body.comanda.drepturi).toMatchObject({ montator: true, recomandare: false });
    expect((await contabil.get(`/api/comenzi/${c.comandaId}`).expect(200)).body.comanda.drepturi).toMatchObject({ montator: false, recomandare: false });
  });

  it("comanda manuala primeste ambele rubrici la introducere, niciuna obligatorie", async () => {
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const baza = { firmaId: firma1, rezumat: "accesorii", totalLei: "500" };
    const fara = await gestiune.post("/api/comenzi").send({ ...baza, client: { nume: "Manual Fara Rubrici", telefon: "0730 127 020", localitate: "Panciu" } });
    expect(fara.status, JSON.stringify(fara.body)).toBe(201);
    expect(fara.body.comanda).toMatchObject({ montator: null, recomandare: null });
    const cu = await gestiune.post("/api/comenzi").send({ ...baza, client: { nume: "Manual Cu Rubrici", telefon: "0730 127 021", localitate: "Panciu" }, recomandare: { nume: "Ionel Andrei" }, montator: TUDOREL });
    expect(cu.status, JSON.stringify(cu.body)).toBe(201);
    expect(cu.body.comanda).toMatchObject({ montator: TUDOREL, recomandare: { nume: "Ionel Andrei", telefon: null } });
    const gresit = await gestiune.post("/api/comenzi").send({ ...baza, client: { nume: "Manual Gresit", telefon: "0730 127 022", localitate: "Panciu" }, montator: { nume: "Fara Telefon" } });
    expect(gresit.status).toBe(400);
    expect(gresit.body.campuri).toEqual([expect.objectContaining({ camp: "montator.telefon" })]);
  });
});
