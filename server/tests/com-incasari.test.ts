import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { incarcaOptiuniListe } from "../src/modules/adm/optiuniListe.js";
import { corecteazaComenzile } from "../src/modules/com/corectieComenzi.js";
import { asiguraCatalogBilka } from "./catalogTest.js";
import { citesteEtalon } from "./etalon/incarcaEtalon.js";
import { corpDinEtalon, preturiDinEtalon, puneCursulEtalonului } from "./etalonApi.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

// S20: incasarile si comisioanele pe comanda (FISA-COMENZI cap. 2, 4; CONTURI §3): statusul
// incasarii derivat din incasarile confirmate, avansul propus si confirmarea lui, anularea cu
// motiv si istoric, drepturile (doar Administratorul firmei scrie bani; Admin general vede),
// comisionul cu istoric si "achitat", numaratorile, filtrul, "inchis" = Livrat si incasat,
// corectia de date pentru comenzile vechi.

const app = creeazaApp();
const S = "-inc@exemplu.local";
const EMAIL = { adminGeneral: `admin-general${S}`, admin1: `admin1${S}`, agent1: `agent1${S}`, agent2: `agent2${S}`, colab: `colab${S}`, admin2: `admin2${S}`, contabil: `contabil${S}`, gestiune: `gestiune${S}` };
let firma1: string;
let idAgent1: string;
let idColab: string;

function dataLocala(delta = 0): string {
  const d = new Date(Date.now() + delta * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

beforeAll(async () => {
  const adminGeneral = await creeazaUtilizatorTest(EMAIL.adminGeneral, "ADMIN_GENERAL");
  await asiguraCatalogBilka(adminGeneral);
  await incarcaOptiuniListe(prisma);
  firma1 = (await prisma.firma.create({ data: { denumire: "Firma Incasari 1", cui: "RO91", nrRegCom: "J91", adresa: "A", telefon: "1", email: `f1${S}` } })).id;
  const firma2 = (await prisma.firma.create({ data: { denumire: "Firma Incasari 2", cui: "RO92", nrRegCom: "J92", adresa: "B", telefon: "2", email: `f2${S}` } })).id;
  const admin1 = await creeazaUtilizatorTest(EMAIL.admin1, "ADMINISTRATOR", { firmaId: firma1, serieOferta: "INA", adaosProcent: 1 });
  idAgent1 = (await creeazaUtilizatorTest(EMAIL.agent1, "AGENT", { firmaId: firma1, administratorId: admin1.id, serieOferta: "ING", adaosProcent: 1 })).id;
  await creeazaUtilizatorTest(EMAIL.agent2, "AGENT", { firmaId: firma1, administratorId: admin1.id, serieOferta: "INH", adaosProcent: 1 });
  idColab = (await creeazaUtilizatorTest(EMAIL.colab, "COLABORATOR", { firmaId: firma1, administratorId: admin1.id, serieOferta: "INC", adaosProcent: 5 })).id;
  await creeazaUtilizatorTest(EMAIL.admin2, "ADMINISTRATOR", { firmaId: firma2, serieOferta: "INB", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.contabil, "CONTABILITATE", { accesGeneralFirme: true });
  await creeazaUtilizatorTest(EMAIL.gestiune, "GESTIUNE", { accesGeneralFirme: true });
  for (const d of [dataLocala(0), dataLocala(-1)]) {
    await prisma.cursValutar.upsert({ where: { data_moneda: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR" } }, update: { curs: "5.3485" }, create: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR", curs: "5.3485", sursa: "test" } });
  }
}, 240_000);

afterAll(async () => {
  await prisma.$disconnect();
});

type Agent = Awaited<ReturnType<typeof autentificaAgent>>;
const CLIENT = { nume: "Client Incasari", telefon: "0730000601", adresa: "Str. Încasări 1", localitate: "Adjud" };

// o oferta E01 dusa la "Comandat" cu avans 5000 si comision 500 (total 17.000 lei)
async function comandaDinOferta(agent: Agent, client = CLIENT, avans = "5000"): Promise<{ ofertaId: string; comandaId: string }> {
  const { body } = await agent.post("/api/oferte").send({ client }).expect(201);
  const id = body.oferta.id as string;
  const e = citesteEtalon("E01");
  const corp = await corpDinEtalon(e);
  const rp = await agent.put(`/api/oferte/${id}/produse`).send(corp);
  expect(rp.status, JSON.stringify(rp.body)).toBe(200);
  await puneCursulEtalonului(id, e);
  await agent.put(`/api/oferte/${id}/preturi`).send(preturiDinEtalon(e, rp.body.oferta.linii)).expect(200);
  await agent.put(`/api/oferte/${id}/montator`).send({ montatorNou: { nume: "Gheorghe V.", telefon: "0740 111 222", tip: "MONTATOR" }, comisionRecomandareLei: "500" }).expect(200);
  await agent.put(`/api/oferte/${id}/status`).send({ status: "TRANSMISA" }).expect(200);
  await agent.put(`/api/oferte/${id}/status`).send({ status: "DE_COMANDAT" }).expect(200);
  await agent.put(`/api/oferte/${id}/status`).send({ status: "AVANS_LUAT", avansLei: avans }).expect(200);
  const r = await agent.put(`/api/oferte/${id}/status`).send({ status: "COMANDAT" });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  const c = await prisma.comanda.findUniqueOrThrow({ where: { ofertaId: id } });
  return { ofertaId: id, comandaId: c.id };
}

const detaliu = async (agent: Agent, id: string) => (await agent.get(`/api/comenzi/${id}`).expect(200)).body.comanda as Record<string, any>;
const lista = async (agent: Agent, filtre: Record<string, string> = {}) => {
  const r = await agent.get(`/api/comenzi?${new URLSearchParams(filtre).toString()}`);
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body as { comenzi: Record<string, any>[]; total: number; numaratori: Record<string, number> };
};

describe("incasarile (cap. 2)", () => {
  let c: Awaited<ReturnType<typeof comandaDinOferta>>;
  let admin1: Agent;

  beforeAll(async () => {
    c = await comandaDinOferta(await autentificaAgent(app, EMAIL.agent1));
    admin1 = await autentificaAgent(app, EMAIL.admin1);
  }, 120_000);

  it("avansul de la 'Avans luat' intra ca incasare propusa: nu intra in suma incasata; statusul e neincasat, restul e totalul", async () => {
    const d = await detaliu(admin1, c.comandaId);
    expect(d.incasari).toHaveLength(1);
    expect(d.incasari[0]).toMatchObject({ sumaLei: "5000.00", stare: "PROPUSA", ceReprezinta: "avans luat de agent (la „Avans luat”)", notatDe: "Test AGENT" });
    expect(d.incasare).toMatchObject({ status: "NEINCASAT", eticheta: "neîncasat", incasatLei: "0.00", restLei: "17000.00", propuseLei: "5000.00", propuse: 1 });
    expect(d.comision).toMatchObject({ lei: "500.00", achitat: false });
    expect(d.drepturi).toMatchObject({ bani: true, comision: true });
    expect(d.inchisa).toBe(false);
  });

  it("doar Administratorul firmei scrie bani: Admin general, Administratorul altei firme, Gestiunea, Contabilitatea, agentul si colaboratorul vad, nu scriu", async () => {
    for (const email of [EMAIL.adminGeneral, EMAIL.admin2, EMAIL.gestiune, EMAIL.contabil, EMAIL.agent1]) {
      const a = await autentificaAgent(app, email);
      const d = await detaliu(a, c.comandaId);
      expect(d.incasare.restLei, email).toBe("17000.00"); // vede sumele
      expect(d.drepturi.bani, email).toBe(false);
      await a.post(`/api/comenzi/${c.comandaId}/incasari`).send({ sumaLei: "100", data: dataLocala(0), ceReprezinta: "x" }).expect(403);
      await a.put(`/api/comenzi/${c.comandaId}/incasari/${d.incasari[0].id}/confirma`).expect(403);
    }
    await (await autentificaAgent(app, EMAIL.colab)).get(`/api/comenzi/${c.comandaId}`).expect(404);
  });

  it("confirmarea avansului -> incasat partial, cu restul la vedere si restLei actualizat; a doua confirmare e refuzata", async () => {
    const d0 = await detaliu(admin1, c.comandaId);
    const r = await admin1.put(`/api/comenzi/${c.comandaId}/incasari/${d0.incasari[0].id}/confirma`);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.incasare).toMatchObject({ stare: "CONFIRMATA", confirmatDe: "Test ADMINISTRATOR" });
    expect(r.body.comanda.incasare).toMatchObject({ status: "PARTIAL", eticheta: "încasat parțial", incasatLei: "5000.00", restLei: "12000.00", propuse: 0 });
    expect((await prisma.comanda.findUniqueOrThrow({ where: { id: c.comandaId } })).restLei.toFixed(2)).toBe("12000.00");
    await admin1.put(`/api/comenzi/${c.comandaId}/incasari/${d0.incasari[0].id}/confirma`).expect(409);
    const d = await detaliu(admin1, c.comandaId);
    expect(d.istoric.filter((i: { tip: string }) => i.tip === "incasare").map((i: { camp: string }) => i.camp)).toEqual(["confirmare"]);
  });

  it("o incasare gresita se anuleaza cu motiv, nu se sterge: ramane in lista, iese din suma, intra in istoric", async () => {
    const gresita = await admin1.post(`/api/comenzi/${c.comandaId}/incasari`).send({ sumaLei: "1000", data: dataLocala(0), ceReprezinta: "tranșa 2, numerar" });
    expect(gresita.status, JSON.stringify(gresita.body)).toBe(201);
    expect(gresita.body.comanda.incasare).toMatchObject({ incasatLei: "6000.00", restLei: "11000.00" });
    await admin1.put(`/api/comenzi/${c.comandaId}/incasari/${gresita.body.incasare.id}/anuleaza`).send({}).expect(400); // motivul e obligatoriu
    const an = await admin1.put(`/api/comenzi/${c.comandaId}/incasari/${gresita.body.incasare.id}/anuleaza`).send({ motiv: "notată de două ori" });
    expect(an.status, JSON.stringify(an.body)).toBe(200);
    expect(an.body.incasare).toMatchObject({ stare: "ANULATA", motivAnulare: "notată de două ori", anulatDe: "Test ADMINISTRATOR" });
    expect(an.body.comanda.incasare).toMatchObject({ status: "PARTIAL", incasatLei: "5000.00", restLei: "12000.00" });
    const d = await detaliu(admin1, c.comandaId);
    expect(d.incasari).toHaveLength(2);
    expect(d.istoric.find((i: { camp: string }) => i.camp === "anulare")).toMatchObject({ mentiuni: "notată de două ori" });
    await admin1.put(`/api/comenzi/${c.comandaId}/incasari/${gresita.body.incasare.id}/anuleaza`).send({ motiv: "x" }).expect(409);
    await admin1.post(`/api/comenzi/${c.comandaId}/incasari`).send({ sumaLei: "0", data: dataLocala(0), ceReprezinta: "x" }).expect(400);
  });

  it("restul -> incasat; 'inchis' = Livrat si incasat: la sfarsit, ascuns implicit, vizibil cu 'inchise' sau cu filtrul incasare=incasat; numaratorile", async () => {
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    const inainte = await lista(agent1);
    expect(inainte.numaratori.neincasate).toBe(1);
    expect(inainte.comenzi.map((x) => x.id)).toContain(c.comandaId);
    expect((await lista(agent1, { incasare: "partial" })).comenzi.map((x) => x.id)).toEqual([c.comandaId]);
    expect((await lista(agent1, { incasare: "neincasat" })).total).toBe(0);

    const rest = await admin1.post(`/api/comenzi/${c.comandaId}/incasari`).send({ sumaLei: "12000", data: dataLocala(0), ceReprezinta: "rest la livrare, transfer bancar" });
    expect(rest.status).toBe(201);
    expect(rest.body.comanda.incasare).toMatchObject({ status: "INCASAT", incasatLei: "17000.00", restLei: "0.00" });
    expect(rest.body.comanda.inchisa).toBe(false); // nu e livrata
    expect((await lista(agent1)).comenzi.map((x) => x.id)).toContain(c.comandaId);

    await gestiune.put(`/api/comenzi/${c.comandaId}/status-logistic`).send({ status: "RECEPTIONAT" }).expect(200);
    const livrat = await gestiune.put(`/api/comenzi/${c.comandaId}/status-logistic`).send({ status: "LIVRAT" });
    expect(livrat.body.comanda.inchisa).toBe(true);
    const implicit = await lista(agent1);
    expect(implicit.comenzi.map((x) => x.id)).not.toContain(c.comandaId);
    expect(implicit.numaratori.neincasate).toBe(0);
    expect((await lista(agent1, { inchise: "da" })).comenzi.map((x) => x.id)).toContain(c.comandaId);
    expect((await lista(agent1, { incasare: "incasat" })).comenzi.map((x) => x.id)).toEqual([c.comandaId]);
  });
});

describe("comisionul montatorului / recomandarii (cap. 4)", () => {
  let c: Awaited<ReturnType<typeof comandaDinOferta>>;

  beforeAll(async () => {
    c = await comandaDinOferta(await autentificaAgent(app, EMAIL.agent1), { ...CLIENT, nume: "Client Comision", telefon: "0730000602" }, "0");
  }, 120_000);

  it("suma vine din oferta; o modifica contul ofertei si Administratorul lui, cu istoric; agentul altei oferte, Gestiunea si Administratorul altei firme nu", async () => {
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    const d0 = await detaliu(agent1, c.comandaId);
    expect(d0.comision).toMatchObject({ lei: "500.00", achitat: false });
    expect(d0.incasari).toEqual([]); // avans 0 -> nicio incasare propusa
    const r = await agent1.put(`/api/comenzi/${c.comandaId}/comision`).send({ comisionLei: "800", mentiuni: "a montat și garajul" });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.comanda.comision.lei).toBe("800.00");
    await (await autentificaAgent(app, EMAIL.agent2)).put(`/api/comenzi/${c.comandaId}/comision`).send({ comisionLei: "1" }).expect(403);
    await (await autentificaAgent(app, EMAIL.gestiune)).put(`/api/comenzi/${c.comandaId}/comision`).send({ comisionLei: "1" }).expect(403);
    await (await autentificaAgent(app, EMAIL.admin2)).put(`/api/comenzi/${c.comandaId}/comision`).send({ comisionLei: "1" }).expect(403);
    await agent1.put(`/api/comenzi/${c.comandaId}/comision`).send({ comisionLei: "-5" }).expect(400);
    const d = await detaliu(agent1, c.comandaId);
    expect(d.istoric.find((i: { tip: string; camp: string }) => i.tip === "suma" && i.camp === "comisionLei")).toMatchObject({ valoareInainte: "500.00", valoareDupa: "800.00", mentiuni: "a montat și garajul" });
    // oferta inghetata ramane neschimbata
    expect((await prisma.oferta.findUniqueOrThrow({ where: { id: c.ofertaId } })).comisionRecomandareLei?.toFixed(2)).toBe("500.00");
  });

  it("'achitat' doar Administratorul firmei, cu cine si cand si istoric; numaratoarea comisioanelor neachitate; Gestiunea vede suma", async () => {
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    const inainte = await lista(admin1, { firmaId: firma1 });
    expect(inainte.numaratori.comisioaneNeachitate).toBeGreaterThanOrEqual(1);
    await (await autentificaAgent(app, EMAIL.gestiune)).put(`/api/comenzi/${c.comandaId}/comision/achitat`).send({ achitat: true }).expect(403);
    await (await autentificaAgent(app, EMAIL.admin2)).put(`/api/comenzi/${c.comandaId}/comision/achitat`).send({ achitat: true }).expect(403);
    await (await autentificaAgent(app, EMAIL.agent1)).put(`/api/comenzi/${c.comandaId}/comision/achitat`).send({ achitat: true }).expect(403);
    const r = await admin1.put(`/api/comenzi/${c.comandaId}/comision/achitat`).send({ achitat: true });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.comanda.comision).toMatchObject({ lei: "800.00", achitat: true, achitatDe: "Test ADMINISTRATOR" });
    expect(r.body.comanda.comision.achitatLa).not.toBeNull();
    const dupa = await lista(admin1, { firmaId: firma1 });
    expect(dupa.numaratori.comisioaneNeachitate).toBe(inainte.numaratori.comisioaneNeachitate - 1);
    const g = await detaliu(await autentificaAgent(app, EMAIL.gestiune), c.comandaId);
    expect(g.comision).toMatchObject({ lei: "800.00", achitat: true });
    expect(g.istoric.find((i: { tip: string }) => i.tip === "comision")).toMatchObject({ valoareInainte: "neachitat", valoareDupa: "achitat" });
  });

  it("colaboratorul isi modifica comisionul pe comanda lui; comanda manuala fara comision nu are ce achita", async () => {
    const colab = await autentificaAgent(app, EMAIL.colab);
    const cc = await comandaDinOferta(colab, { ...CLIENT, nume: "Client Colab Com", telefon: "0730000603" }, "0");
    await colab.put(`/api/comenzi/${cc.comandaId}/comision`).send({ comisionLei: "300" }).expect(200);
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    const m = await admin1.post("/api/comenzi").send({ client: { nume: "Manual Fără Comision", telefon: "0730000604" }, rezumat: "T18 9005", totalLei: "1000" }).expect(201);
    expect(m.body.comanda.comision).toBeNull();
    await admin1.put(`/api/comenzi/${m.body.comanda.id}/comision/achitat`).send({ achitat: true }).expect(409);
    // la manuale, incasarile le noteaza Administratorul firmei alese
    const inc = await admin1.post(`/api/comenzi/${m.body.comanda.id}/incasari`).send({ sumaLei: "1000", data: dataLocala(0), ceReprezinta: "numerar la ridicare" });
    expect(inc.status).toBe(201);
    expect(inc.body.comanda.incasare.status).toBe("INCASAT");
    void idAgent1;
    void idColab;
  });
});

describe("corectia de date pentru comenzile vechi (S19 / S20)", () => {
  it("contul alocat, clientul, comisionul si avansul propus se completeaza din oferta, cu jurnal; idempotent", async () => {
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    const c = await comandaDinOferta(agent1, { ...CLIENT, nume: "Client Corectie", telefon: "0730000605" });
    // o comanda "ca inainte de S19 / S20": fara cont, client, comision si fara incasarea propusa
    await prisma.comandaIncasare.deleteMany({ where: { comandaId: c.comandaId } });
    await prisma.comanda.update({ where: { id: c.comandaId }, data: { contAlocatId: null, clientId: null, comisionLei: null } });
    const utilizator = { id: null, nume: "sistem (test)" };
    const proba = await corecteazaComenzile({ utilizator, aplica: false });
    expect(proba).toMatchObject({ contAlocat: 1, client: 1, comision: 1, avansPropus: 1, aplicat: false });
    expect((await prisma.comanda.findUniqueOrThrow({ where: { id: c.comandaId } })).contAlocatId).toBeNull();
    const aplicat = await corecteazaComenzile({ utilizator, aplica: true });
    expect(aplicat).toMatchObject({ contAlocat: 1, client: 1, comision: 1, avansPropus: 1 });
    const dupa = await prisma.comanda.findUniqueOrThrow({ where: { id: c.comandaId }, include: { incasari: true } });
    expect(dupa.contAlocatId).toBe(idAgent1);
    expect(dupa.clientId).not.toBeNull();
    expect(dupa.comisionLei?.toFixed(2)).toBe("500.00");
    expect(dupa.incasari).toHaveLength(1);
    expect(dupa.incasari[0]).toMatchObject({ stare: "PROPUSA" });
    expect(dupa.incasari[0].sumaLei.toFixed(2)).toBe("5000.00");
    expect(await prisma.jurnalIntrare.count({ where: { entitate: "Comanda", entitateId: c.comandaId, actiune: "corectie_date_comenzi" } })).toBe(4);
    const din_nou = await corecteazaComenzile({ utilizator, aplica: true });
    expect(din_nou).toMatchObject({ contAlocat: 0, client: 0, comision: 0, avansPropus: 0 });
  });
});
