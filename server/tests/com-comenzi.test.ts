import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { incarcaOptiuniListe } from "../src/modules/adm/optiuniListe.js";
import { asiguraCatalogBilka } from "./catalogTest.js";
import { citesteEtalon } from "./etalon/incarcaEtalon.js";
import { corpDinEtalon, preturiDinEtalon, puneCursulEtalonului } from "./etalonApi.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

// S19: tabelul de comenzi (FISA-COMENZI cap. 1, 3, 4b, 6; FISA-CONTURI §2-3) - lista
// comuna cu numaratorile, cautarea si filtrele, ordinea (inchise la sfarsit, ascunse
// implicit), tranzitiile logistice cu istoric, drepturile pe fiecare rol (inclusiv
// Gestiune si Contabilitate cu setarea de acces), comenzile manuale (seria CM, contul
// alocat sau "neidentificata", realocarea doar de Administrator), documentele ofertei
// prin comanda, notitele ofertei in citire.

const app = creeazaApp();
const S = "-com@exemplu.local";
const EMAIL = {
  adminGeneral: `admin-general${S}`,
  admin1: `admin1${S}`,
  agent1: `agent1${S}`,
  agent2: `agent2${S}`,
  colab: `colab${S}`,
  admin2: `admin2${S}`,
  contabil: `contabil${S}`, // acces doar pe firma 1
  gestiune: `gestiune${S}`, // acces general
};
let firma1: string;
let firma2: string;
let idColab: string;
let idAgent1: string;

function dataLocala(delta = 0): string {
  const d = new Date(Date.now() + delta * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

beforeAll(async () => {
  const adminGeneral = await creeazaUtilizatorTest(EMAIL.adminGeneral, "ADMIN_GENERAL");
  await asiguraCatalogBilka(adminGeneral);
  await incarcaOptiuniListe(prisma);
  firma1 = (await prisma.firma.create({ data: { denumire: "Firma Comenzi 1", cui: "RO81", nrRegCom: "J81", adresa: "A", telefon: "1", email: `f1${S}` } })).id;
  firma2 = (await prisma.firma.create({ data: { denumire: "Firma Comenzi 2", cui: "RO82", nrRegCom: "J82", adresa: "B", telefon: "2", email: `f2${S}` } })).id;
  const admin1 = await creeazaUtilizatorTest(EMAIL.admin1, "ADMINISTRATOR", { firmaId: firma1, serieOferta: "CMA", adaosProcent: 1 });
  idAgent1 = (await creeazaUtilizatorTest(EMAIL.agent1, "AGENT", { firmaId: firma1, administratorId: admin1.id, serieOferta: "CMG", adaosProcent: 1 })).id;
  await creeazaUtilizatorTest(EMAIL.agent2, "AGENT", { firmaId: firma1, administratorId: admin1.id, serieOferta: "CMH", adaosProcent: 1 });
  idColab = (await creeazaUtilizatorTest(EMAIL.colab, "COLABORATOR", { firmaId: firma1, administratorId: admin1.id, serieOferta: "CMC", adaosProcent: 5 })).id;
  await creeazaUtilizatorTest(EMAIL.admin2, "ADMINISTRATOR", { firmaId: firma2, serieOferta: "CMB", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.contabil, "CONTABILITATE", { accesGeneralFirme: false, firmeAcces: { create: [{ firmaId: firma1 }] } });
  await creeazaUtilizatorTest(EMAIL.gestiune, "GESTIUNE", { accesGeneralFirme: true });
  for (const d of [dataLocala(0), dataLocala(-1)]) {
    await prisma.cursValutar.upsert({ where: { data_moneda: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR" } }, update: { curs: "5.3485" }, create: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR", curs: "5.3485", sursa: "test" } });
  }
}, 240_000);

afterAll(async () => {
  await prisma.$disconnect();
});

type Agent = Awaited<ReturnType<typeof autentificaAgent>>;
const CLIENT = { nume: "Client Comenzi", telefon: "0730000401", adresa: "Str. Comenzi 1", localitate: "Panciu" };

// o oferta E01 dusa pana la "Comandat" (cu avans si montator): randul de comanda
async function comandaDinOferta(agent: Agent, client = CLIENT, montator = "Gheorghe Montatorul"): Promise<{ ofertaId: string; comandaId: string; numarComplet: string }> {
  const { body } = await agent.post("/api/oferte").send({ client }).expect(201);
  const id = body.oferta.id as string;
  const e = citesteEtalon("E01");
  const corp = await corpDinEtalon(e);
  const rp = await agent.put(`/api/oferte/${id}/produse`).send(corp);
  expect(rp.status, JSON.stringify(rp.body)).toBe(200);
  await puneCursulEtalonului(id, e);
  await agent.put(`/api/oferte/${id}/preturi`).send(preturiDinEtalon(e, rp.body.oferta.linii)).expect(200);
  await agent.put(`/api/oferte/${id}/montator`).send({ montatorNou: { nume: montator, telefon: "0740 111 222", tip: "MONTATOR" }, comisionRecomandareLei: "500" }).expect(200);
  await agent.put(`/api/oferte/${id}/status`).send({ status: "TRANSMISA" }).expect(200);
  await agent.put(`/api/oferte/${id}/status`).send({ status: "DE_COMANDAT" }).expect(200);
  await agent.put(`/api/oferte/${id}/status`).send({ status: "AVANS_LUAT", avansLei: "5000" }).expect(200);
  const r = await agent.put(`/api/oferte/${id}/status`).send({ status: "COMANDAT" });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  const c = await prisma.comanda.findUniqueOrThrow({ where: { ofertaId: id } });
  return { ofertaId: id, comandaId: c.id, numarComplet: `${c.serie}-${String(c.numar).padStart(4, "0")}` };
}

const lista = async (agent: Agent, filtre: Record<string, string> = {}) => {
  const p = new URLSearchParams(filtre);
  const r = await agent.get(`/api/comenzi?${p.toString()}`);
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body as { comenzi: Record<string, any>[]; total: number; numaratori: Record<string, number> };
};

describe("comenzile din oferta si lista comuna", () => {
  let c1: Awaited<ReturnType<typeof comandaDinOferta>>;
  let c2: Awaited<ReturnType<typeof comandaDinOferta>>;
  let cColab: Awaited<ReturnType<typeof comandaDinOferta>>;
  let cFirma2: Awaited<ReturnType<typeof comandaDinOferta>>;

  beforeAll(async () => {
    c1 = await comandaDinOferta(await autentificaAgent(app, EMAIL.agent1));
    c2 = await comandaDinOferta(await autentificaAgent(app, EMAIL.agent2), { ...CLIENT, nume: "Client Agent Doi", telefon: "0730000402" }, "Pavel Montatorul");
    cColab = await comandaDinOferta(await autentificaAgent(app, EMAIL.colab), { ...CLIENT, nume: "Client Colaborator", telefon: "0730000403" });
    cFirma2 = await comandaDinOferta(await autentificaAgent(app, EMAIL.admin2), { ...CLIENT, nume: "Client Firma Doi", telefon: "0730000404" });
  }, 240_000);

  it("randul de comanda poarta contul alocat (contul ofertei), clientul, responsabilul si istoricul initial", async () => {
    const c = await prisma.comanda.findUniqueOrThrow({ where: { id: c1.comandaId }, include: { istoric: true } });
    expect(c.tip).toBe("DIN_OFERTA");
    expect(c.contAlocatId).toBe(idAgent1);
    expect(c.clientId).not.toBeNull();
    expect(c.statusLogistic).toBe("COMANDAT");
    expect(c.statusLogisticLa).not.toBeNull();
    expect(c.istoric.map((i) => `${i.tip}:${i.valoareDupa}`)).toEqual(["status:Comandat"]);
  });

  it("cine vede ce: agentul lista firmei, colaboratorul doar ale lui, Administratorii si Admin general toate, Contabilitatea pe firmele ei, Gestiunea cu acces general tot", async () => {
    const numere = (r: { comenzi: Record<string, any>[] }) => r.comenzi.map((c) => c.numarComplet).sort();
    const toateFirma1 = [c1.numarComplet, c2.numarComplet, cColab.numarComplet].sort();
    expect(numere(await lista(await autentificaAgent(app, EMAIL.agent1)))).toEqual(toateFirma1);
    expect(numere(await lista(await autentificaAgent(app, EMAIL.colab)))).toEqual([cColab.numarComplet]);
    expect(numere(await lista(await autentificaAgent(app, EMAIL.admin1)))).toEqual([...toateFirma1, cFirma2.numarComplet].sort());
    expect(numere(await lista(await autentificaAgent(app, EMAIL.admin2)))).toEqual([...toateFirma1, cFirma2.numarComplet].sort());
    expect(numere(await lista(await autentificaAgent(app, EMAIL.adminGeneral)))).toEqual([...toateFirma1, cFirma2.numarComplet].sort());
    expect(numere(await lista(await autentificaAgent(app, EMAIL.contabil)))).toEqual(toateFirma1);
    expect(numere(await lista(await autentificaAgent(app, EMAIL.gestiune)))).toEqual([...toateFirma1, cFirma2.numarComplet].sort());
    // detaliul: colaboratorul nu vede comanda altuia; Contabilitatea nu vede firma 2
    await (await autentificaAgent(app, EMAIL.colab)).get(`/api/comenzi/${c1.comandaId}`).expect(404);
    await (await autentificaAgent(app, EMAIL.contabil)).get(`/api/comenzi/${cFirma2.comandaId}`).expect(404);
    const admin = await autentificaAgent(app, EMAIL.admin1);
    const r = await lista(admin, { firmaId: firma2 });
    expect(numere(r)).toEqual([cFirma2.numarComplet]);
  });

  it("coloanele din fisa: responsabilul, clientul cu localitatea, rezumatul, montatorul, sumele, statusul; cautarea dupa client, numar, localitate, telefon si montator", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const r = await lista(agent, { q: c1.numarComplet });
    expect(r.comenzi).toHaveLength(1);
    const c = r.comenzi[0];
    expect(c).toMatchObject({ manuala: false, neidentificata: false, responsabil: { nume: "Test AGENT" }, contAlocat: { id: idAgent1 }, client: { nume: "Client Comenzi", localitate: "Panciu", telefon: "0730000401" }, montator: { nume: "Gheorghe Montatorul" }, totalLei: "17000.00", avansLei: "5000.00", restLei: "12000.00", statusLogistic: "COMANDAT", statusLogisticEticheta: "Comandat", inchisa: false });
    expect(c.rezumat).toMatch(/^Iberic 3005 mat 0,50/);
    expect(c.data).toBe(dataLocala(0));
    expect((await lista(agent, { q: "Pavel" })).comenzi.map((x) => x.numarComplet)).toEqual([c2.numarComplet]);
    expect((await lista(agent, { q: "0730 000 402" })).comenzi.map((x) => x.numarComplet)).toEqual([c2.numarComplet]);
    expect((await lista(agent, { q: "Colaborator" })).comenzi.map((x) => x.numarComplet)).toEqual([cColab.numarComplet]);
    expect((await lista(agent, { q: "Panciu" })).total).toBe(3);
  });

  it("tranzitiile logistice cu istoric: Comandat -> Receptionat partial (cu nota lipsurilor) -> Receptionat -> Livrat; nu se sare peste etape", async () => {
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const sare = await gestiune.put(`/api/comenzi/${c1.comandaId}/status-logistic`).send({ status: "LIVRAT" });
    expect(sare.status).toBe(409);
    expect(sare.body.eroare).toMatch(/Din „Comandat” se poate trece doar la „Recepționat” sau „Recepționat parțial”/);
    const faraNota = await gestiune.put(`/api/comenzi/${c1.comandaId}/status-logistic`).send({ status: "RECEPTIONAT_PARTIAL" });
    expect(faraNota.status).toBe(400);
    const partial = await gestiune.put(`/api/comenzi/${c1.comandaId}/status-logistic`).send({ status: "RECEPTIONAT_PARTIAL", notaLipsuri: "lipsă: 2 accesorii D10", mentiuni: "a venit fără dolii" });
    expect(partial.status, JSON.stringify(partial.body)).toBe(200);
    expect(partial.body.comanda).toMatchObject({ statusLogistic: "RECEPTIONAT_PARTIAL", notaLipsuri: "lipsă: 2 accesorii D10" });
    await gestiune.put(`/api/comenzi/${c1.comandaId}/status-logistic`).send({ status: "RECEPTIONAT" }).expect(200);
    const livrat = await gestiune.put(`/api/comenzi/${c1.comandaId}/status-logistic`).send({ status: "LIVRAT" });
    expect(livrat.status).toBe(200);
    expect(livrat.body.comanda.livratLa).not.toBeNull();
    // S20: "inchisa" = Livrat SI incasat - avansul e doar propus, deci ramane deschisa
    expect(livrat.body.comanda.inchisa).toBe(false);
    await gestiune.put(`/api/comenzi/${c1.comandaId}/status-logistic`).send({ status: "RECEPTIONAT" }).expect(409);
    const d = await gestiune.get(`/api/comenzi/${c1.comandaId}`).expect(200);
    const statusuri = (d.body.comanda.istoric as { tip: string; valoareInainte: string | null; valoareDupa: string | null; numeUtilizatorLaMoment: string; mentiuni: string | null }[]).filter((i) => i.tip === "status");
    expect(statusuri.map((i) => `${i.valoareInainte ?? "—"}→${i.valoareDupa}`)).toEqual(["Recepționat→Livrat", "Recepționat parțial→Recepționat", "Comandat→Recepționat parțial", "—→Comandat"]);
    expect(statusuri[2]).toMatchObject({ numeUtilizatorLaMoment: "Test GESTIUNE", mentiuni: "a venit fără dolii" });
    expect(d.body.comanda.istoric.find((i: { tip: string }) => i.tip === "lipsuri")).toMatchObject({ valoareDupa: "lipsă: 2 accesorii D10" });
  });

  it("statusul logistic il schimba orice Administrator (si al altei firme) si Gestiunea; agentul, colaboratorul si Contabilitatea nu", async () => {
    await (await autentificaAgent(app, EMAIL.agent1)).put(`/api/comenzi/${c2.comandaId}/status-logistic`).send({ status: "RECEPTIONAT" }).expect(403);
    await (await autentificaAgent(app, EMAIL.colab)).put(`/api/comenzi/${cColab.comandaId}/status-logistic`).send({ status: "RECEPTIONAT" }).expect(403);
    await (await autentificaAgent(app, EMAIL.contabil)).put(`/api/comenzi/${c2.comandaId}/status-logistic`).send({ status: "RECEPTIONAT" }).expect(403);
    // Administratorul firmei 2 pe o comanda a firmei 1 (lista e comuna, depozitul e unul)
    const r = await (await autentificaAgent(app, EMAIL.admin2)).put(`/api/comenzi/${c2.comandaId}/status-logistic`).send({ status: "RECEPTIONAT" });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const istoric = await prisma.comandaIstoric.findMany({ where: { comandaId: c2.comandaId, tip: "status" }, orderBy: { moment: "desc" } });
    expect(istoric[0]).toMatchObject({ valoareDupa: "Recepționat", numeUtilizatorLaMoment: "Test ADMINISTRATOR" });
  });

  it("ordinea si 'Arata si comenzile inchise': cele mai noi sus; Livrat la sfarsit, ascuns implicit; filtrul pe status; numaratorile din cap", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const implicit = await lista(agent);
    // S20: c1 e livrata, dar neincasata (avansul doar propus) -> nu e "inchisa", ramane in lista
    expect(implicit.comenzi.map((c) => c.numarComplet)).toEqual([cColab.numarComplet, c2.numarComplet, c1.numarComplet]);
    expect(implicit.numaratori).toMatchObject({ active: 2, deReceptionat: 1, livrate: 1, neincasate: 3, comisioaneNeachitate: 3, neidentificate: 0 });
    const cuInchise = await lista(agent, { inchise: "da" });
    expect(cuInchise.comenzi.map((c) => c.numarComplet)).toEqual([cColab.numarComplet, c2.numarComplet, c1.numarComplet]);
    expect((await lista(agent, { status: "LIVRAT" })).comenzi.map((c) => c.numarComplet)).toEqual([c1.numarComplet]);
    expect((await lista(agent, { status: "RECEPTIONAT" })).comenzi.map((c) => c.numarComplet)).toEqual([c2.numarComplet]);
    // perioada: o comanda de ieri nu intra intr-un interval de azi? intra (deLa = azi); una din afara intervalului nu
    expect((await lista(agent, { deLa: dataLocala(1), panaLa: dataLocala(2) })).total).toBe(0);
  });

  it("livrarea: indicatiile cu cine si cand, data livrarii; Gestiunea, Administratorii si agentul pe comenzile lui; istoric", async () => {
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const r = await gestiune.put(`/api/comenzi/${c2.comandaId}/livrare`).send({ indicatii: "marți după 14:00, sună înainte", dataLivrarii: dataLocala(3) });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.comanda.livrare).toMatchObject({ indicatii: "marți după 14:00, sună înainte", nume: "Test GESTIUNE", data: dataLocala(3) });
    expect(r.body.comanda.livrare.la).not.toBeNull();
    await (await autentificaAgent(app, EMAIL.agent1)).put(`/api/comenzi/${c2.comandaId}/livrare`).send({ indicatii: "x" }).expect(403); // nu e comanda lui
    await (await autentificaAgent(app, EMAIL.agent2)).put(`/api/comenzi/${c2.comandaId}/livrare`).send({ indicatii: "ridică el, joi" }).expect(200);
    await (await autentificaAgent(app, EMAIL.contabil)).put(`/api/comenzi/${c2.comandaId}/livrare`).send({ indicatii: "x" }).expect(403);
    await (await autentificaAgent(app, EMAIL.colab)).put(`/api/comenzi/${cColab.comandaId}/livrare`).send({ indicatii: "x" }).expect(403);
    const istoric = await prisma.comandaIstoric.findMany({ where: { comandaId: c2.comandaId, tip: "livrare" } });
    expect(istoric.map((i) => i.camp).sort()).toEqual(["dataLivrarii", "indicatiiLivrare", "indicatiiLivrare"]);
  });

  it("datele de facturare (daca difera) si contactele, cu istoric; observatiile se adauga, nu se rescriu; notitele ofertei raman in citire", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    await agent.post(`/api/oferte/${c1.ofertaId}/notite`).send({ text: "notiță de pe ofertă" }).expect(201);
    const f = await agent.put(`/api/comenzi/${c1.comandaId}/facturare`).send({ firma: "SC Acoperiș Expert SRL", cui: "RO123", adresa: "Panciu, str. Mare 1" });
    expect(f.status, JSON.stringify(f.body)).toBe(200);
    expect(f.body.comanda.facturare).toEqual({ firma: "SC Acoperiș Expert SRL", cui: "RO123", adresa: "Panciu, str. Mare 1" });
    await agent.put(`/api/comenzi/${c1.comandaId}/contacte`).send({ clientTelefon: "0730 000 499", montatorTelefon: "0740 999 999" }).expect(200);
    await agent.post(`/api/comenzi/${c1.comandaId}/observatii`).send({ text: "clientul vrea marfa pe paleți" }).expect(201);
    await (await autentificaAgent(app, EMAIL.gestiune)).post(`/api/comenzi/${c1.comandaId}/observatii`).send({ text: "confirmat telefonic" }).expect(201);
    // agentul 2 nu e contul comenzii; Contabilitatea doar vede
    await (await autentificaAgent(app, EMAIL.agent2)).post(`/api/comenzi/${c1.comandaId}/observatii`).send({ text: "x" }).expect(403);
    await (await autentificaAgent(app, EMAIL.contabil)).post(`/api/comenzi/${c1.comandaId}/observatii`).send({ text: "x" }).expect(403);
    const d = await (await autentificaAgent(app, EMAIL.contabil)).get(`/api/comenzi/${c1.comandaId}`).expect(200);
    expect(d.body.comanda.observatii.map((o: { text: string }) => o.text)).toEqual(["confirmat telefonic", "clientul vrea marfa pe paleți"]);
    expect(d.body.comanda.notiteOferta.map((o: { text: string }) => o.text)).toEqual(["notiță de pe ofertă"]);
    expect(d.body.comanda.client.telefon).toBe("0730 000 499");
    // S22: Contabilitatea vede comanda, deci poate face retur (comanda din oferta); nimic altceva
    expect(d.body.comanda.drepturi).toEqual({ logistic: false, detalii: false, livrare: false, alocare: false, bani: false, comision: false, retur: true, anuleazaRetur: false, notaPalet: false, statusPalet: false, aviz: true, documente: true, fisaSoferului: false, locatie: false });
    expect(d.body.comanda.istoric.filter((i: { tip: string }) => i.tip === "contact").map((i: { camp: string }) => i.camp).sort()).toEqual(["clientTelefon", "montatorTelefon"]);
    expect(d.body.comanda.istoric.filter((i: { tip: string }) => i.tip === "facturare")).toHaveLength(3);
  });

  it("Doc.: documentele ofertei prin comanda - Contabilitatea le deschide, colaboratorul nu primeste tabelul de facturare; nimic nou generat", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const det = await agent.post(`/api/oferte/${c1.ofertaId}/documente`).send({ tip: "DETALIATA" }).expect(201);
    const fact = await agent.post(`/api/oferte/${c1.ofertaId}/documente`).send({ tip: "TABEL_FACTURARE" }).expect(201);
    await agent.post(`/api/oferte/${c1.ofertaId}/documente`).send({ tip: "OFERTA" }).expect(201); // nu e document al comenzii
    const contabil = await autentificaAgent(app, EMAIL.contabil);
    const d = await contabil.get(`/api/comenzi/${c1.comandaId}`).expect(200);
    expect(d.body.comanda.documente.map((x: { tip: string }) => x.tip).sort()).toEqual(["DETALIATA", "TABEL_FACTURARE"]);
    expect(d.body.comanda.formulareBilka).toEqual({ generate: 0, transmise: 0, ultimaTrimitere: null });
    const pdf = await contabil.get(`/api/comenzi/${c1.comandaId}/documente/${det.body.document.id}`);
    expect(pdf.status).toBe(200);
    expect(pdf.headers["content-type"]).toMatch(/pdf/);
    // colaboratorul: pe comanda lui, detaliata da, tabelul de facturare nu
    const colab = await autentificaAgent(app, EMAIL.colab);
    const detColab = await colab.post(`/api/oferte/${cColab.ofertaId}/documente`).send({ tip: "DETALIATA" }).expect(201);
    await colab.get(`/api/comenzi/${cColab.comandaId}/documente/${detColab.body.document.id}`).expect(200);
    await colab.get(`/api/comenzi/${c1.comandaId}/documente/${fact.body.document.id}`).expect(404);
    const dColab = await colab.get(`/api/comenzi/${cColab.comandaId}`).expect(200);
    expect(dColab.body.comanda.documente.every((x: { tip: string }) => x.tip !== "TABEL_FACTURARE")).toBe(true);
  });
}, 300_000);

describe("comenzile manuale (cap. 4b)", () => {
  it("seria CM continua, marcajul 'manuala', fara cont = neidentificata si numarata in cap; cu cont alocat, contul o vede", async () => {
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const faraFirma = await gestiune.post("/api/comenzi").send({ client: { nume: "Toma Ionel", telefon: "0730000501", localitate: "Odobești" }, rezumat: "T18 9005 mat 0,5 — 140 mp; coame 9005 mat", totalLei: "14120" });
    expect(faraFirma.status).toBe(400); // Gestiunea cu acces general alege firma
    const m1 = await gestiune.post("/api/comenzi").send({ firmaId: firma1, client: { nume: "Toma Ionel", telefon: "0730000501", localitate: "Odobești" }, rezumat: "T18 9005 mat 0,5 — 140 mp; coame 9005 mat — comandă venită direct la fabrică", totalLei: "14120", totalCuTvaEur: "2690.91", observatie: "de aflat al cui colaborator e" });
    expect(m1.status, JSON.stringify(m1.body)).toBe(201);
    expect(m1.body.comanda).toMatchObject({ numarComplet: "CM-0001", manuala: true, neidentificata: true, contAlocat: null, responsabil: { nume: "Test GESTIUNE" }, restLei: "14120.00", statusLogistic: "COMANDAT" });
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    const m2 = await admin1.post("/api/comenzi").send({ client: { nume: "Dănuț S. — SC Acoperiș Expert SRL", telefon: "0730000502", localitate: "Panciu" }, rezumat: "Clasic 8017 mat 0,45 — 86,20 mp; accesorii 8017 mat", totalLei: "9440", avansLei: "2000", contAlocatId: idColab, montator: { nume: "montează el", telefon: null }, indicatiiLivrare: "ridică el de la depozit, vineri" });
    expect(m2.status, JSON.stringify(m2.body)).toBe(201);
    expect(m2.body.comanda).toMatchObject({ numarComplet: "CM-0002", manuala: true, neidentificata: false, contAlocat: { id: idColab }, firma: { id: firma1 }, restLei: "7440.00", livrare: { indicatii: "ridică el de la depozit, vineri", nume: "Test ADMINISTRATOR" } });
    // clientul a intrat in baza comuna
    expect(await prisma.client.count({ where: { telefonNormalizat: "0730000502" } })).toBe(1);
    // colaboratorul vede comanda alocata lui; agentul 1 nu poate adauga comenzi manuale; Contabilitatea nici
    const colab = await autentificaAgent(app, EMAIL.colab);
    expect((await lista(colab)).comenzi.map((c) => c.numarComplet)).toContain("CM-0002");
    await (await autentificaAgent(app, EMAIL.agent1)).post("/api/comenzi").send({ client: CLIENT, rezumat: "x", totalLei: "1" }).expect(403);
    await (await autentificaAgent(app, EMAIL.contabil)).post("/api/comenzi").send({ firmaId: firma1, client: CLIENT, rezumat: "x", totalLei: "1" }).expect(403);
    const r = await lista(admin1, { agent: "neidentificate" });
    expect(r.comenzi.map((c) => c.numarComplet)).toEqual(["CM-0001"]);
    expect(r.numaratori.neidentificate).toBe(1);
    expect((await lista(admin1, { q: "CM-0002" })).comenzi).toHaveLength(1);
    const istoric = await prisma.comandaIstoric.findMany({ where: { comanda: { serie: "CM", numar: 1 } } });
    expect(istoric.map((i) => `${i.tip}:${i.valoareDupa}`).sort()).toEqual(["alocare:neidentificată", "creare:manuală", "status:Comandat"]);
  });

  it("realocarea doar de Administrator (si Admin general), cu istoric; Gestiunea nu; comenzile din oferta nu se realoca", async () => {
    const c = await prisma.comanda.findFirstOrThrow({ where: { serie: "CM", numar: 1 } });
    await (await autentificaAgent(app, EMAIL.gestiune)).put(`/api/comenzi/${c.id}/alocare`).send({ contAlocatId: idColab }).expect(403);
    const r = await (await autentificaAgent(app, EMAIL.admin1)).put(`/api/comenzi/${c.id}/alocare`).send({ contAlocatId: idColab, mentiuni: "a sunat colaboratorul" });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.comanda).toMatchObject({ neidentificata: false, contAlocat: { id: idColab } });
    const ist = await prisma.comandaIstoric.findFirst({ where: { comandaId: c.id, tip: "alocare" }, orderBy: { moment: "desc" } });
    expect(ist).toMatchObject({ valoareInainte: "neidentificată", valoareDupa: "Test COLABORATOR", mentiuni: "a sunat colaboratorul" });
    expect((await lista(await autentificaAgent(app, EMAIL.admin1), { agent: "neidentificate" })).total).toBe(0);
    const dinOferta = await prisma.comanda.findFirstOrThrow({ where: { tip: "DIN_OFERTA" } });
    await (await autentificaAgent(app, EMAIL.adminGeneral)).put(`/api/comenzi/${dinOferta.id}/alocare`).send({ contAlocatId: idColab }).expect(403);
  });
});
