import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { incarcaOptiuniListe } from "../src/modules/adm/optiuniListe.js";
import { asiguraCatalogBilka } from "./catalogTest.js";
import { citesteEtalon } from "./etalon/incarcaEtalon.js";
import { corpDinEtalon, preturiDinEtalon, puneCursulEtalonului } from "./etalonApi.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

// S28 (docs/MODIFICARI-S28.md v1.2, docs/CERERI-BUG-S25.md v2.3):
// - MODIFICAREA M11: agentul vede TOATE comenzile, de la toate firmele (aceeasi lista ca Administratorii), cu
//   filtrul Firma si "Doar ale mele"; detaliile le modifica doar pe comenzile lui; documentele, avizul si
//   returul raman dupa regula "cine vede comanda" (fara conditie pe firma); colaboratorul, ofertele si
//   vanzarile - neschimbate.
// - BUG-18: comanda manuala tine "Localitatea lucrarii" + "Adresa lucrarii"; tabelul, cautarea si fisa
//   soferului arata localitatea si adresa COMENZII, niciodata pe cele din fisa clientului.
// - BUG-19: pe fisa clientului, stergerea explicita (cosul) a e-mailului, observatiilor si adresei, cu jurnal.

const app = creeazaApp();
const S = "-s28@exemplu.local";
const EMAIL = { adminGeneral: `admin-general${S}`, adminA: `admin-a${S}`, adminB: `admin-b${S}`, agentA: `agent-a${S}`, agentA2: `agent-a2${S}`, agentB: `agent-b${S}`, colab: `colab${S}`, gestiune: `gestiune${S}` };
let firmaA: string;
let firmaB: string;
let idAgentA: string;

function dataLocala(delta = 0): string {
  const d = new Date(Date.now() + delta * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

type Agent = Awaited<ReturnType<typeof autentificaAgent>>;
type Rand = Record<string, any>;
type Comanda = { ofertaId: string; comandaId: string; numarComplet: string; clientId: string };

async function ofertaNoua(agent: Agent, client: Rand): Promise<{ id: string; clientId: string }> {
  const r = await agent.post("/api/oferte").send({ client });
  expect(r.status, JSON.stringify(r.body)).toBe(201);
  return { id: r.body.oferta.id, clientId: r.body.oferta.client.id };
}

// oferta E13 (accesorii, fara invelitoare) dusa pana la "Comandat"
async function comandaDinOferta(agent: Agent, client: Rand): Promise<Comanda> {
  const { id, clientId } = await ofertaNoua(agent, client);
  const e = citesteEtalon("E13");
  const rp = await agent.put(`/api/oferte/${id}/produse`).send(await corpDinEtalon(e));
  expect(rp.status, JSON.stringify(rp.body)).toBe(200);
  await puneCursulEtalonului(id, e);
  const r = await agent.put(`/api/oferte/${id}/preturi`).send(preturiDinEtalon(e, rp.body.oferta.linii));
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  await agent.put(`/api/oferte/${id}/status`).send({ status: "TRANSMISA" }).expect(200);
  await agent.put(`/api/oferte/${id}/status`).send({ status: "DE_COMANDAT", livrareBilka: { tip: "DEPOZIT" } }).expect(200);
  const c = await agent.put(`/api/oferte/${id}/status`).send({ status: "COMANDAT" });
  expect(c.status, JSON.stringify(c.body)).toBe(200);
  const cmd = await prisma.comanda.findUniqueOrThrow({ where: { ofertaId: id } });
  return { ofertaId: id, comandaId: cmd.id, numarComplet: `${cmd.serie}-${String(cmd.numar).padStart(4, "0")}`, clientId };
}

const lista = async (agent: Agent, filtre: Rand = {}) => (await agent.get("/api/comenzi").query(filtre).expect(200)).body as { comenzi: Rand[]; total: number; numaratori: Rand };
const numere = (r: { comenzi: Rand[] }) => r.comenzi.map((c) => c.numarComplet).sort();
const detaliu = async (agent: Agent, id: string) => (await agent.get(`/api/comenzi/${id}`).expect(200)).body.comanda as Rand;
const manuala = (cine: Agent, corp: Rand) => cine.post("/api/comenzi").send({ firmaId: firmaA, rezumat: "accesorii", totalLei: "100", ...corp });
async function fisa(id: string) {
  const c = await prisma.client.findUniqueOrThrow({ where: { id } });
  return { nume: c.nume, telefon: c.telefon, adresa: c.adresa, localitate: c.localitate, email: c.email, observatii: c.observatii };
}
async function jurnal(id: string) {
  const r = await prisma.jurnalIntrare.findMany({ where: { entitate: "Client", entitateId: id, actiune: "modificare" }, orderBy: { moment: "asc" } });
  return r.map((j) => [j.camp, j.valoareInainte, j.valoareDupa, j.numeUtilizatorLaMoment]);
}

let cA: Comanda; // a agentului A (firma A)
let cA2: Comanda; // a colegului din firma A
let cB: Comanda; // a agentului B (firma B)
let cColab: Comanda; // a colaboratorului (firma A)
let manualaB: Rand; // comanda manuala neidentificata, pe firma B

beforeAll(async () => {
  const adminGeneral = await creeazaUtilizatorTest(EMAIL.adminGeneral, "ADMIN_GENERAL");
  await asiguraCatalogBilka(adminGeneral);
  await incarcaOptiuniListe(prisma);
  firmaA = (await prisma.firma.create({ data: { denumire: "Firma S28 A", cui: "RO91", nrRegCom: "J91", adresa: "A", telefon: "1", email: `fa${S}` } })).id;
  firmaB = (await prisma.firma.create({ data: { denumire: "Firma S28 B", cui: "RO92", nrRegCom: "J92", adresa: "B", telefon: "2", email: `fb${S}` } })).id;
  const adminA = await creeazaUtilizatorTest(EMAIL.adminA, "ADMINISTRATOR", { firmaId: firmaA, serieOferta: "UZA", adaosProcent: 1 });
  const adminB = await creeazaUtilizatorTest(EMAIL.adminB, "ADMINISTRATOR", { firmaId: firmaB, serieOferta: "UZB", adaosProcent: 1 });
  idAgentA = (await creeazaUtilizatorTest(EMAIL.agentA, "AGENT", { nume: "Agent A", firmaId: firmaA, administratorId: adminA.id, serieOferta: "UZG", adaosProcent: 1 })).id;
  await creeazaUtilizatorTest(EMAIL.agentA2, "AGENT", { nume: "Agent A2", firmaId: firmaA, administratorId: adminA.id, serieOferta: "UZH", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.agentB, "AGENT", { nume: "Agent B", firmaId: firmaB, administratorId: adminB.id, serieOferta: "UZK", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.colab, "COLABORATOR", { nume: "Colaborator A", firmaId: firmaA, administratorId: adminA.id, serieOferta: "UZC", adaosProcent: 5 });
  await creeazaUtilizatorTest(EMAIL.gestiune, "GESTIUNE", { nume: "Gestiune S28", accesGeneralFirme: true, telefon: "0755 000 777" });
  for (const d of [dataLocala(0), dataLocala(-1)]) {
    await prisma.cursValutar.upsert({ where: { data_moneda: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR" } }, update: { curs: "5.3485" }, create: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR", curs: "5.3485", sursa: "test" } });
  }
  cA = await comandaDinOferta(await autentificaAgent(app, EMAIL.agentA), { nume: "Client Al Agentului A", telefon: "0730 131 001", adresa: "Str. Unu nr. 1", localitate: "Focșani" });
  cA2 = await comandaDinOferta(await autentificaAgent(app, EMAIL.agentA2), { nume: "Client Al Colegului", telefon: "0730 131 002", adresa: "Str. Doi nr. 2", localitate: "Panciu" });
  cB = await comandaDinOferta(await autentificaAgent(app, EMAIL.agentB), { nume: "Client Al Firmei B", telefon: "0730 131 003", adresa: "Str. Mare nr. 12", localitate: "Adjud" });
  cColab = await comandaDinOferta(await autentificaAgent(app, EMAIL.colab), { nume: "Client Al Colaboratorului", telefon: "0730 131 004", adresa: "Str. Patru nr. 4", localitate: "Odobești" });
  const m = await (await autentificaAgent(app, EMAIL.gestiune)).post("/api/comenzi").send({ firmaId: firmaB, client: { nume: "Manuala Firmei B", telefon: "0730 131 005", localitate: "Mărășești" }, rezumat: "necesar telefonic", totalLei: "500" });
  expect(m.status, JSON.stringify(m.body)).toBe(201);
  manualaB = m.body.comanda;
  // comisionul recomandarii pe comanda firmei B (il scrie contul ei) si un palet notat acolo
  const agentB = await autentificaAgent(app, EMAIL.agentB);
  await agentB.put(`/api/comenzi/${cB.comandaId}/recomandare`).send({ recomandare: { nume: "Montator Recomandare", telefon: "0733 131 000" } }).expect(200);
  await agentB.put(`/api/comenzi/${cB.comandaId}/comision`).send({ comisionLei: "150" }).expect(200);
  await (await autentificaAgent(app, EMAIL.gestiune)).put(`/api/comenzi/${cB.comandaId}/nota-palet`).send({ text: "2 paleți la client" }).expect(200);
}, 400_000);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("M11 - agentul vede toate comenzile, de la toate firmele", () => {
  it("lista agentului = lista Administratorilor: comenzile ambelor firme, ale colegilor, ale colaboratorilor, cele manuale si neidentificate; detaliul comenzii altei firme se deschide", async () => {
    const agentA = await autentificaAgent(app, EMAIL.agentA);
    // (baza de test e comuna fisierelor de test: firmele A si B sunt doar ale acestui fisier, deci pe ele se
    // numara exact; fara filtru, lista agentului se compara cu a Administratorului)
    const adminA = await autentificaAgent(app, EMAIL.adminA);
    for (const cine of [agentA, await autentificaAgent(app, EMAIL.agentB)]) {
      expect(numere(await lista(cine, { firmaId: firmaA }))).toEqual([cA.numarComplet, cA2.numarComplet, cColab.numarComplet].sort());
      expect(numere(await lista(cine, { firmaId: firmaB }))).toEqual([cB.numarComplet, manualaB.numarComplet].sort());
    }
    const r = await lista(agentA, { pageSize: 100 });
    const alAdministratorului = await lista(adminA, { pageSize: 100 });
    expect(r.total).toBe(alAdministratorului.total);
    expect(numere(r)).toEqual(numere(alAdministratorului));
    expect(r.numaratori).toEqual(alAdministratorului.numaratori);
    expect(r.numaratori.neidentificate).toBeGreaterThanOrEqual(1);
    expect(r.numaratori.paletiNerecuperati).toBeGreaterThanOrEqual(1);
    // detaliul comenzii firmei B: tot ce se vede pe comanda unui coleg, inclusiv comisionul recomandarii
    const d = await detaliu(agentA, cB.comandaId);
    expect(d.firma.id).toBe(firmaB);
    expect(d.client).toEqual({ nume: "Client Al Firmei B", telefon: "0730 131 003", localitate: "Adjud", adresa: "Str. Mare nr. 12" });
    expect(d.recomandare).toEqual({ nume: "Montator Recomandare", telefon: "0733 131 000" });
    expect(d.comision).toMatchObject({ lei: "150.00", achitat: false });
    expect(d.incasare).toMatchObject({ status: "NEINCASAT" });
    await detaliu(agentA, manualaB.id);
    // evidenta paletilor urmeaza aceeasi vizibilitate
    const paleti = (await agentA.get("/api/comenzi/paleti").expect(200)).body.paleti as Rand[];
    expect(paleti.map((p) => p.numarComplet)).toContain(cB.numarComplet);
    expect(paleti.map((p) => p.numarComplet)).toEqual(((await adminA.get("/api/comenzi/paleti").expect(200)).body.paleti as Rand[]).map((p) => p.numarComplet));
  });

  it("filtrul Firma si „Doar ale mele”: lista si numaratorile se calculeaza pe ce e afisat; firmele filtrului sunt toate cele active", async () => {
    const agentA = await autentificaAgent(app, EMAIL.agentA);
    const firme = (await agentA.get("/api/comenzi/firme").expect(200)).body.firme as Rand[];
    expect(firme.map((f) => f.id)).toEqual(expect.arrayContaining([firmaA, firmaB]));
    // aceleasi firme ca in filtrul Administratorului; colaboratorul ramane doar cu firma lui
    expect(firme).toEqual((await (await autentificaAgent(app, EMAIL.adminA)).get("/api/comenzi/firme").expect(200)).body.firme);
    expect(((await (await autentificaAgent(app, EMAIL.colab)).get("/api/comenzi/firme").expect(200)).body.firme as Rand[]).map((f) => f.id)).toEqual([firmaA]);
    const peB = await lista(agentA, { firmaId: firmaB });
    expect(numere(peB)).toEqual([cB.numarComplet, manualaB.numarComplet].sort());
    expect(peB.numaratori).toMatchObject({ active: 2, neidentificate: 1 });
    const aleMele = await lista(agentA, { aleMele: "da" });
    expect(numere(aleMele)).toEqual([cA.numarComplet]);
    expect(aleMele.numaratori).toMatchObject({ active: 1, neidentificate: 0, paletiNerecuperati: 0 });
    expect(numere(await lista(agentA, { aleMele: "da", firmaId: firmaB }))).toEqual([]);
    // agentul firmei B, cu „Doar ale mele”, ramane cu a lui (si cu paletul ei)
    const aleLuiB = await lista(await autentificaAgent(app, EMAIL.agentB), { aleMele: "da" });
    expect(numere(aleLuiB)).toEqual([cB.numarComplet]);
    expect(aleLuiB.numaratori).toMatchObject({ paletiNerecuperati: 1 });
  });

  it("pe comanda altuia (alta firma sau coleg) agentul nu modifica nimic din detalii - 403; comisionul recomandarii se vede, dar nu se schimba", async () => {
    const agentA = await autentificaAgent(app, EMAIL.agentA);
    for (const id of [cB.comandaId, cA2.comandaId]) {
      const d = await detaliu(agentA, id);
      expect(d.drepturi).toMatchObject({ logistic: false, detalii: false, livrare: false, alocare: false, bani: false, comision: false, locatie: false, ajustarePret: false, montator: false, recomandare: false, notaPalet: false, statusPalet: false, livrareBilka: false });
      await agentA.put(`/api/comenzi/${id}/contacte`).send({ clientTelefon: "0730 131 999" }).expect(403);
      await agentA.put(`/api/comenzi/${id}/facturare`).send({ firma: "SC X SRL", cui: "RO1", adresa: "Y" }).expect(403);
      await agentA.put(`/api/comenzi/${id}/livrare`).send({ indicatii: "sună înainte" }).expect(403);
      await agentA.put(`/api/comenzi/${id}/montator`).send({ montator: { nume: "Alt Montator", telefon: "0733 131 111" } }).expect(403);
      await agentA.put(`/api/comenzi/${id}/recomandare`).send({ recomandare: { nume: "Altcineva" } }).expect(403);
      await agentA.put(`/api/comenzi/${id}/comision`).send({ comisionLei: "999" }).expect(403);
      await agentA.put(`/api/comenzi/${id}/comision/achitat`).send({ achitat: true }).expect(403);
      await agentA.post(`/api/comenzi/${id}/observatii`).send({ text: "observație de la alt agent" }).expect(403);
      await agentA.put(`/api/comenzi/${id}/locatie`).send({ url: "https://maps.app.goo.gl/x" }).expect(403);
      await agentA.put(`/api/comenzi/${id}/status-logistic`).send({ status: "RECEPTIONAT" }).expect(403);
      await agentA.post(`/api/comenzi/${id}/incasari`).send({ sumaLei: "10", data: dataLocala(0), ceReprezinta: "avans" }).expect(403);
      await agentA.post(`/api/comenzi/${id}/ajustare-pret`).send({ totalLei: "1", motiv: "x" }).expect(403);
      await agentA.put(`/api/comenzi/${id}/nota-palet`).send({ text: "palet" }).expect(403);
    }
    await agentA.put(`/api/comenzi/${manualaB.id}/alocare`).send({ contAlocatId: idAgentA }).expect(403);
    const d = await detaliu(agentA, cB.comandaId);
    expect(d.comision).toMatchObject({ lei: "150.00", achitat: false });
    expect(d.recomandare).toEqual({ nume: "Montator Recomandare", telefon: "0733 131 000" });
    expect(d.client.telefon).toBe("0730 131 003");
    // pe comanda LUI detaliile se modifica in continuare
    const lui = await detaliu(agentA, cA.comandaId);
    expect(lui.drepturi).toMatchObject({ detalii: true, livrare: true, comision: true, locatie: true, montator: true, recomandare: true });
    await agentA.post(`/api/comenzi/${cA.comandaId}/observatii`).send({ text: "observația mea" }).expect(201);
  });

  it("documentele, avizul si returul raman dupa regula „cine vede comanda”: agentul firmei A genereaza tabelul de facturare si avizul si calculeaza returul pe comanda firmei B", async () => {
    const agentA = await autentificaAgent(app, EMAIL.agentA);
    const d = await detaliu(agentA, cB.comandaId);
    expect(d.drepturi).toMatchObject({ retur: true, aviz: true, documente: true });
    const tf = await agentA.post(`/api/comenzi/${cB.comandaId}/documente`).send({ tip: "TABEL_FACTURARE" });
    expect(tf.status, JSON.stringify(tf.body)).toBe(201);
    await agentA.get(`/api/comenzi/${cB.comandaId}/documente/${tf.body.document.id}`).expect(200).expect("Content-Type", /pdf/);
    const aviz = await agentA.post(`/api/comenzi/${cB.comandaId}/aviz`).send({ dataLivrarii: dataLocala(0) });
    expect(aviz.status, JSON.stringify(aviz.body)).toBe(201);
    const linii = (await agentA.get(`/api/comenzi/${cB.comandaId}/retururi`).expect(200)).body.linii as Rand[];
    const retur = await agentA.post(`/api/comenzi/${cB.comandaId}/retururi`).send({ linii: [{ linieId: linii[0].linieId, cantitate: "1" }], observatii: "retur calculat de agentul celeilalte firme" });
    expect(retur.status, JSON.stringify(retur.body)).toBe(201);
    // anularea returului ramane a Administratorului firmei comenzii
    const rid = retur.body.retur?.id ?? (await prisma.comandaRetur.findFirstOrThrow({ where: { comandaId: cB.comandaId } })).id;
    await agentA.put(`/api/comenzi/${cB.comandaId}/retururi/${rid}/anuleaza`).send({ motiv: "x" }).expect(403);
  });

  it("colaboratorul ramane doar cu comenzile lui, fara tabel de facturare si aviz; Gestiunea ramane pe firmele ei", async () => {
    const colab = await autentificaAgent(app, EMAIL.colab);
    expect(numere(await lista(colab))).toEqual([cColab.numarComplet]);
    expect(numere(await lista(colab, { aleMele: "da" }))).toEqual([cColab.numarComplet]);
    await colab.get(`/api/comenzi/${cA.comandaId}`).expect(404);
    await colab.get(`/api/comenzi/${cB.comandaId}`).expect(404);
    await colab.post(`/api/comenzi/${cColab.comandaId}/documente`).send({ tip: "TABEL_FACTURARE" }).expect(403);
    await colab.post(`/api/comenzi/${cColab.comandaId}/aviz`).send({ dataLivrarii: dataLocala(0) }).expect(403);
    await colab.post(`/api/comenzi/${cB.comandaId}/aviz`).send({ dataLivrarii: dataLocala(0) }).expect(404);
    // Gestiune doar pe firma A: nu vede comenzile firmei B (setarea ei de acces nu se schimba)
    const gA = await creeazaUtilizatorTest(`gestiune-a${S}`, "GESTIUNE", { accesGeneralFirme: false });
    await prisma.utilizatorFirma.create({ data: { utilizatorId: gA.id, firmaId: firmaA } });
    const gestiuneA = await autentificaAgent(app, `gestiune-a${S}`);
    expect(numere(await lista(gestiuneA))).toEqual([cA.numarComplet, cA2.numarComplet, cColab.numarComplet].sort());
    await gestiuneA.get(`/api/comenzi/${cB.comandaId}`).expect(404);
  });

  it("ofertele si tabelul de vanzari raman ale fiecarui cont: agentul nu deschide oferta altuia si nu-i vede vanzarile", async () => {
    const agentA = await autentificaAgent(app, EMAIL.agentA);
    for (const ofertaId of [cB.ofertaId, cA2.ofertaId]) {
      const r = await agentA.get(`/api/oferte/${ofertaId}`);
      expect([403, 404]).toContain(r.status);
    }
    const oferte = (await agentA.get("/api/oferte").expect(200)).body.oferte as Rand[];
    expect(oferte.map((o) => o.id)).toEqual([cA.ofertaId]);
    const vanzari = JSON.stringify((await agentA.get("/api/vanzari").expect(200)).body);
    expect(vanzari).toContain(cA.numarComplet);
    expect(vanzari).not.toContain(cB.numarComplet);
    expect(vanzari).not.toContain(cA2.numarComplet);
    expect(vanzari).not.toContain(cColab.numarComplet);
  });
});

describe("BUG-18 - comanda manuala tine localitatea si adresa lucrarii", () => {
  const A = { nume: "Client Cu Fisa", telefon: "0730 132 001", adresa: "Str. Fișei nr. 1", localitate: "Golești", email: "fisa@exemplu.local", observatii: "client vechi" };
  let clientId: string;
  const rand = async (cine: Agent, id: string) => (await detaliu(cine, id)).client as Rand;
  const fisaSoferului = async (cine: Agent, id: string) => ((await cine.post("/api/comenzi/fisa-soferului").send({ comenzi: [id] }).expect(200)).body.fisa.blocuri[0] as Rand).adresa as string | null;

  it("client cu L1 si adresa A in fisa + comanda manuala cu L2 si B: randul si fisa soferului arata L2 · B; fisa clientului primeste ce s-a scris, cu jurnal", async () => {
    clientId = (await ofertaNoua(await autentificaAgent(app, EMAIL.agentA), A)).clientId;
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const r = await manuala(gestiune, { client: { nume: A.nume, telefon: A.telefon, localitate: "Golești" }, localitateLucrarii: "Vulturu", adresaLucrarii: "Str. Șantierului nr. 9" });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    expect(r.body.comanda.client).toEqual({ nume: A.nume, telefon: A.telefon, localitate: "Vulturu", adresa: "Str. Șantierului nr. 9" });
    const c = await prisma.comanda.findUniqueOrThrow({ where: { id: r.body.comanda.id } });
    expect(c).toMatchObject({ clientId, clientLocalitate: "Golești", localitateLucrarii: "Vulturu", adresaLucrarii: "Str. Șantierului nr. 9" });
    expect(await fisaSoferului(gestiune, c.id)).toBe("Str. Șantierului nr. 9, Vulturu");
    // fisa clientului: adresa scrisa o actualizeaza (ca la oferta), cu jurnal; localitatea clientului ramane a lui
    expect(await fisa(clientId)).toEqual({ ...A, adresa: "Str. Șantierului nr. 9" });
    expect(await jurnal(clientId)).toEqual([["adresa", "Str. Fișei nr. 1", "Str. Șantierului nr. 9", "Gestiune S28"]]);
    // cautarea gaseste comanda dupa adresa si dupa localitatea lucrarii, fara diacritice
    expect((await lista(gestiune, { q: "santierului nr. 9" })).comenzi.map((x) => x.id)).toEqual([c.id]);
    expect((await lista(gestiune, { q: "vulturu santierului" })).comenzi.map((x) => x.id)).toEqual([c.id]);
  });

  it("fara adresa: apare doar localitatea - niciodata adresa din fisa clientului; localitatea lucrarii porneste de la a clientului; fisa ramane neatinsa (BUG-17)", async () => {
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const inainte = await fisa(clientId);
    const jurnalInainte = await jurnal(clientId);
    // doar ce trimitea ecranul pana acum: nume, telefon, localitate
    const r1 = await manuala(gestiune, { client: { nume: A.nume, telefon: A.telefon, localitate: "Golești" } });
    expect(r1.status, JSON.stringify(r1.body)).toBe(201);
    expect(r1.body.comanda.client).toEqual({ nume: A.nume, telefon: A.telefon, localitate: "Golești", adresa: null });
    expect(await fisaSoferului(gestiune, r1.body.comanda.id)).toBe("Golești");
    // localitatea lucrarii scrisa, fara adresa: randul arata localitatea lucrarii
    const r2 = await manuala(gestiune, { client: { nume: A.nume, telefon: A.telefon, localitate: "Golești" }, localitateLucrarii: "Jariștea", adresaLucrarii: "" });
    expect(r2.body.comanda.client).toEqual({ nume: A.nume, telefon: A.telefon, localitate: "Jariștea", adresa: null });
    expect(await fisaSoferului(gestiune, r2.body.comanda.id)).toBe("Jariștea");
    expect(await fisa(clientId)).toEqual(inainte);
    expect(await jurnal(clientId)).toEqual(jurnalInainte);
    // cautarea dupa adresa din FISA clientului nu mai aduce comenzile manuale fara adresa
    const gasite = (await lista(gestiune, { q: "santierului nr. 9" })).comenzi.map((x) => x.id);
    expect(gasite).not.toContain(r1.body.comanda.id);
    expect(gasite).not.toContain(r2.body.comanda.id);
  });

  it("comanda manuala veche (fara localitate si adresa proprii): apare localitatea de pe comanda, ca pana acum, si nicio adresa", async () => {
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const r = await manuala(gestiune, { client: { nume: A.nume, telefon: A.telefon, localitate: "Golești" } });
    await prisma.comanda.update({ where: { id: r.body.comanda.id }, data: { localitateLucrarii: null, adresaLucrarii: null } });
    expect(await rand(gestiune, r.body.comanda.id)).toEqual({ nume: A.nume, telefon: A.telefon, localitate: "Golești", adresa: null });
    expect(await fisaSoferului(gestiune, r.body.comanda.id)).toBe("Golești");
  });

  it("client nou: adresa lucrarii scrisa ajunge si in fisa lui; la comenzile din oferta randul arata tot adresa ofertei", async () => {
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const r = await manuala(gestiune, { client: { nume: "Client Nou Cu Adresa", telefon: "0730 132 002", localitate: "Panciu" }, adresaLucrarii: "Str. Cireșilor nr. 8" });
    expect(r.body.comanda.client).toEqual({ nume: "Client Nou Cu Adresa", telefon: "0730 132 002", localitate: "Panciu", adresa: "Str. Cireșilor nr. 8" });
    const nou = await prisma.client.findFirstOrThrow({ where: { telefonNormalizat: "0730132002" } });
    expect(nou).toMatchObject({ adresa: "Str. Cireșilor nr. 8", localitate: "Panciu" });
    expect(await rand(gestiune, cA.comandaId)).toEqual({ nume: "Client Al Agentului A", telefon: "0730 131 001", localitate: "Focșani", adresa: "Str. Unu nr. 1" });
  });
});

describe("BUG-19 - cosul de pe fisa clientului: stergerea explicita, cu jurnal", () => {
  const B = { nume: "Client De Curățat", telefon: "0730 133 001", adresa: "Str. Greșită nr. 5", localitate: "Panciu", email: "gresit@exemplu.local", observatii: "observație greșită" };
  let ofertaId: string;
  let clientId: string;
  const sterge = (cine: Agent, camp: string, id = clientId) => cine.delete(`/api/clienti/${id}/campuri/${camp}`);

  it("cosul goleste campul si lasa intrare in jurnal (cine, valoarea stearsa); un camp deja gol nu mai scrie nimic", async () => {
    const agentA = await autentificaAgent(app, EMAIL.agentA);
    ({ id: ofertaId, clientId } = await ofertaNoua(agentA, B));
    expect((await agentA.get(`/api/clienti/${clientId}`).expect(200)).body.poateSterge).toBe(true);
    const r = await sterge(agentA, "email");
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.client).toMatchObject({ id: clientId, email: null, observatii: B.observatii });
    await sterge(agentA, "observatii").expect(200);
    expect(await fisa(clientId)).toEqual({ ...B, email: null, observatii: null });
    expect(await jurnal(clientId)).toEqual([
      ["email", "gresit@exemplu.local", null, "Agent A"],
      ["observatii", "observație greșită", null, "Agent A"],
    ]);
    await sterge(agentA, "email").expect(200);
    expect(await jurnal(clientId)).toHaveLength(2);
  });

  it("adresa stearsa ramane „fara adresa” in fisa; oferta isi pastreaza adresa lucrarii ei", async () => {
    const agentA = await autentificaAgent(app, EMAIL.agentA);
    const r = await sterge(agentA, "adresa").expect(200);
    expect(r.body.client.adresa).toBe("-");
    expect((await fisa(clientId)).adresa).toBe("-");
    expect((await jurnal(clientId)).at(-1)).toEqual(["adresa", "Str. Greșită nr. 5", null, "Agent A"]);
    expect((await prisma.oferta.findUniqueOrThrow({ where: { id: ofertaId } })).adresaLucrarii).toBe("Str. Greșită nr. 5");
    await sterge(agentA, "adresa").expect(200);
    expect(await jurnal(clientId)).toHaveLength(3);
  });

  it("telefonul, numele si localitatea nu se sterg asa - 400 cu motivul", async () => {
    const agentA = await autentificaAgent(app, EMAIL.agentA);
    const t = await sterge(agentA, "telefon");
    expect(t.status).toBe(400);
    expect(t.body.eroare).toMatch(/Telefonul nu se șterge/);
    await sterge(agentA, "nume").expect(400);
    await sterge(agentA, "localitate").expect(400);
    expect(await fisa(clientId)).toMatchObject({ telefon: B.telefon, nume: B.nume, localitate: "Panciu" });
  });

  it("cine are cosul: conturile care fac oferte, pe clientii pe care ii vad, si Admin general; ceilalti nu", async () => {
    const alt = await ofertaNoua(await autentificaAgent(app, EMAIL.agentA), { nume: "Client Pentru Drepturi", telefon: "0730 133 002", adresa: "Str. D 1", email: "drepturi@exemplu.local", observatii: "o observație" });
    // agentul altei firme si colegul din firma nu vad clientul (nu au oferte pentru el): 403, nimic sters
    for (const email of [EMAIL.agentB, EMAIL.agentA2, EMAIL.colab, EMAIL.adminB]) {
      const cine = await autentificaAgent(app, email);
      expect((await cine.get(`/api/clienti/${alt.clientId}`).expect(200)).body.poateSterge).toBe(false);
      await sterge(cine, "email", alt.clientId).expect(403);
    }
    await sterge(await autentificaAgent(app, EMAIL.gestiune), "email", alt.clientId).expect(403);
    expect((await fisa(alt.clientId)).email).toBe("drepturi@exemplu.local");
    // Administratorul firmei (vede ofertele firmei) si Admin general (orice client) au cosul
    await sterge(await autentificaAgent(app, EMAIL.adminA), "email", alt.clientId).expect(200);
    const adminGeneral = await autentificaAgent(app, EMAIL.adminGeneral);
    expect((await adminGeneral.get(`/api/clienti/${alt.clientId}`).expect(200)).body.poateSterge).toBe(true);
    await sterge(adminGeneral, "observatii", alt.clientId).expect(200);
    expect(await fisa(alt.clientId)).toMatchObject({ email: null, observatii: null });
    await sterge(adminGeneral, "email", "nu-exista").expect(404);
  });

  it("regula BUG-17 ramane: salvarea cu campul gol, fara cos, nu sterge nimic", async () => {
    const agentA = await autentificaAgent(app, EMAIL.agentA);
    const c = await ofertaNoua(agentA, { nume: "Client BUG-17", telefon: "0730 133 003", adresa: "Str. R 1", localitate: "Panciu", email: "ramane@exemplu.local", observatii: "rămâne" });
    await agentA.put(`/api/oferte/${c.id}/client`).send({ nume: "Client BUG-17", telefon: "0730 133 003", adresa: "Str. R 1", localitate: "", email: "", observatii: "" }).expect(200);
    expect(await fisa(c.clientId)).toMatchObject({ localitate: "Panciu", email: "ramane@exemplu.local", observatii: "rămâne" });
    expect(await jurnal(c.clientId)).toEqual([]);
  });
});
