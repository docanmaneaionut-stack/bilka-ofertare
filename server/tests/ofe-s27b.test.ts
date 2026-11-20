import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

// S27b (BUG-17, docs/CERERI-BUG-S25.md): un camp lasat gol (adresa, localitate, telefon, e-mail, observatii)
// NU atinge fisa unui client existent; fisa se actualizeaza doar cu ce a fost scris efectiv, cu jurnal
// (FISA-OFERTARE cap. 2). Adresa nu se completeaza niciodata din localitate. Regula e verificata pe toate
// drumurile care scriu in fisa clientului: comanda manuala, oferta noua, pagina ofertei, legarea la un
// client existent (M6, BUG-15) si copierea ofertei.

const app = creeazaApp();
const S = "-s27b@exemplu.local";
const EMAIL = { admin1: `admin1${S}`, agent1: `agent1${S}`, gestiune: `gestiune${S}` };
let firma1: string;

function dataLocala(delta = 0): string {
  const d = new Date(Date.now() + delta * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

beforeAll(async () => {
  firma1 = (await prisma.firma.create({ data: { denumire: "Firma S27b", cui: "RO91", nrRegCom: "J91", adresa: "A", telefon: "1", email: `f1${S}` } })).id;
  const admin1 = await creeazaUtilizatorTest(EMAIL.admin1, "ADMINISTRATOR", { firmaId: firma1, serieOferta: "TYA", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.agent1, "AGENT", { firmaId: firma1, administratorId: admin1.id, serieOferta: "TYG", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.gestiune, "GESTIUNE", { accesGeneralFirme: true });
  for (const d of [dataLocala(0), dataLocala(-1)]) {
    await prisma.cursValutar.upsert({ where: { data_moneda: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR" } }, update: { curs: "5.3485" }, create: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR", curs: "5.3485", sursa: "test" } });
  }
}, 120_000);

afterAll(async () => {
  await prisma.$disconnect();
});

type Agent = Awaited<ReturnType<typeof autentificaAgent>>;
type Rand = Record<string, any>;

async function ofertaNoua(agent: Agent, client: Rand, extra: Rand = {}): Promise<{ id: string; clientId: string }> {
  const r = await agent.post("/api/oferte").send({ client, ...extra });
  expect(r.status, JSON.stringify(r.body)).toBe(201);
  return { id: r.body.oferta.id, clientId: r.body.oferta.client.id };
}

// fisa clientului, asa cum e in baza
async function fisa(id: string) {
  const c = await prisma.client.findUniqueOrThrow({ where: { id } });
  return { nume: c.nume, telefon: c.telefon, adresa: c.adresa, localitate: c.localitate, email: c.email, observatii: c.observatii };
}
// jurnalul fisei: [camp, inainte, dupa] pentru fiecare modificare
async function jurnal(id: string) {
  const r = await prisma.jurnalIntrare.findMany({ where: { entitate: "Client", entitateId: id, actiune: "modificare" }, orderBy: { moment: "asc" } });
  return r.map((j) => [j.camp, j.valoareInainte, j.valoareDupa]);
}
// un client cu fisa completa, creat printr-o oferta a agentului
async function clientComplet(agent: Agent, nume: string, telefon: string) {
  const date = { nume, telefon, adresa: "Str. Florilor nr. 7", localitate: "Golești", email: "client@exemplu.local", observatii: "sună după ora 16" };
  const o = await ofertaNoua(agent, date);
  expect(await fisa(o.clientId)).toEqual(date);
  return { ...o, date };
}
const manuala = (gestiune: Agent, client: Rand) => gestiune.post("/api/comenzi").send({ firmaId: firma1, client, rezumat: "accesorii", totalLei: "100" });

describe("BUG-17 - comanda manuala nu mai suprascrie fisa clientului", () => {
  it("fara adresa, pentru un client existent: adresa lui ramane (nu primeste localitatea), e-mailul si observatiile raman; localitatea lasata goala ramane si ea; nimic in jurnal", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const c = await clientComplet(agent, "Ionescu Maria", "0730 129 010");
    // exact ce trimite ecranul: nume, telefon, localitate (aici goala), fara adresa
    const r1 = await manuala(gestiune, { nume: "Ionescu Maria", telefon: "0730 129 010", localitate: "" });
    expect(r1.status, JSON.stringify(r1.body)).toBe(201);
    expect((await prisma.comanda.findUniqueOrThrow({ where: { id: r1.body.comanda.id } })).clientId).toBe(c.clientId);
    expect(await fisa(c.clientId)).toEqual(c.date);
    expect(await jurnal(c.clientId)).toEqual([]);
    // cu aceeasi localitate scrisa si fara adresa: tot neschimbata (inainte, adresa devenea „Golești”)
    await manuala(gestiune, { nume: "Ionescu Maria", telefon: "0730 129 010", localitate: "Golești" }).expect(201);
    expect(await fisa(c.clientId)).toEqual(c.date);
    expect(await jurnal(c.clientId)).toEqual([]);
  });

  it("ce e scris efectiv actualizeaza fisa, cu jurnal: alta localitate, apoi o adresa scrisa; restul ramane", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const c = await clientComplet(agent, "Georgescu Paul", "0730 129 011");
    await manuala(gestiune, { nume: "Georgescu Paul", telefon: "0730 129 011", localitate: "Focșani" }).expect(201);
    expect(await fisa(c.clientId)).toEqual({ ...c.date, localitate: "Focșani" });
    expect(await jurnal(c.clientId)).toEqual([["localitate", "Golești", "Focșani"]]);
    await manuala(gestiune, { nume: "Georgescu Paul", telefon: "0730 129 011", localitate: "Focșani", adresa: "Str. Unirii nr. 2" }).expect(201);
    expect(await fisa(c.clientId)).toEqual({ ...c.date, localitate: "Focșani", adresa: "Str. Unirii nr. 2" });
    expect(await jurnal(c.clientId)).toEqual([
      ["localitate", "Golești", "Focșani"],
      ["adresa", "Str. Florilor nr. 7", "Str. Unirii nr. 2"],
    ]);
  });

  it("client nou, fara adresa: adresa NU se completeaza din localitate (ramane necompletata, „-”); pe randul comenzii nu apare nicio adresa", async () => {
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const r = await manuala(gestiune, { nume: "Manual Nou Fara Adresa", telefon: "0730 129 012", localitate: "Panciu" });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    expect(r.body.comanda.client).toEqual({ nume: "Manual Nou Fara Adresa", telefon: "0730 129 012", localitate: "Panciu", adresa: null });
    const client = await prisma.client.findFirstOrThrow({ where: { telefonNormalizat: "0730129012" } });
    expect(client.adresa).toBe("-");
    expect(client.localitate).toBe("Panciu");
  });
});

describe("BUG-17 - aceeasi regula pe celelalte drumuri care scriu in fisa clientului", () => {
  it("oferta noua pe telefonul unui client existent: localitatea, e-mailul si observatiile lasate goale raman in fisa; ce e scris se actualizeaza cu jurnal", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const c = await clientComplet(agent, "Vasilescu Ana", "0730 129 020");
    // campurile goale trimise ca text gol
    const a = await ofertaNoua(agent, { nume: "Vasilescu Ana", telefon: "0730 129 020", adresa: "Str. Florilor nr. 7", localitate: "", email: "", observatii: "" });
    expect(a.clientId).toBe(c.clientId);
    expect(await fisa(c.clientId)).toEqual(c.date);
    // ... si lipsa cu totul din cerere
    const b = await ofertaNoua(agent, { nume: "Vasilescu Ana", telefon: "0730 129 020", adresa: "Str. Florilor nr. 7" });
    expect(b.clientId).toBe(c.clientId);
    expect(await fisa(c.clientId)).toEqual(c.date);
    expect(await jurnal(c.clientId)).toEqual([]);
    // scris efectiv: doar acel camp se schimba
    await ofertaNoua(agent, { nume: "Vasilescu Ana", telefon: "0730 129 020", adresa: "Str. Florilor nr. 7", email: "ana@exemplu.local" });
    expect(await fisa(c.clientId)).toEqual({ ...c.date, email: "ana@exemplu.local" });
    expect(await jurnal(c.clientId)).toEqual([["email", "client@exemplu.local", "ana@exemplu.local"]]);
  });

  it("oferta noua cu telefonul lasat gol, desi clientul ales din lista are telefon: fisa lui (si telefonul) ramane neatinsa", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const c = await clientComplet(agent, "Dumitrescu Ion", "0730 129 021");
    await ofertaNoua(agent, { nume: "Dumitrescu Ion", telefon: "", adresa: "Str. Florilor nr. 7", localitate: "" }, { clientExistentId: c.clientId });
    expect(await fisa(c.clientId)).toEqual(c.date);
    expect(await jurnal(c.clientId)).toEqual([]);
  });

  it("oferta noua legata prin alegere de un client fara telefon (BUG-15): campurile goale nu-i sterg nimic din fisa", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const date = { nume: "Marinescu Dan", adresa: "Str. Viilor nr. 3", localitate: "Odobești", email: "dan@exemplu.local", observatii: "client vechi" };
    const c = await ofertaNoua(agent, date);
    const a = await ofertaNoua(agent, { nume: "Marinescu Dan", adresa: "Str. Viilor nr. 3", localitate: "", email: "", observatii: "" }, { clientExistentId: c.clientId });
    expect(a.clientId).toBe(c.clientId);
    expect(await fisa(c.clientId)).toEqual({ ...date, telefon: null });
    expect(await jurnal(c.clientId)).toEqual([]);
  });

  it("pagina ofertei: campurile golite si salvate nu sterg nimic din fisa; telefonul golit nu atinge fisa clientului", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const c = await clientComplet(agent, "Stanescu Elena", "0730 129 030");
    const r = await agent.put(`/api/oferte/${c.id}/client`).send({ nume: "Stanescu Elena", telefon: "0730 129 030", adresa: "Str. Florilor nr. 7", localitate: "", email: "", observatii: null });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.oferta.client).toMatchObject({ id: c.clientId, localitate: "Golești", email: "client@exemplu.local", observatii: "sună după ora 16" });
    expect(await fisa(c.clientId)).toEqual(c.date);
    expect(await jurnal(c.clientId)).toEqual([]);
    // scris efectiv: se actualizeaza, cu jurnal
    await agent.put(`/api/oferte/${c.id}/client`).send({ nume: "Stanescu Elena", telefon: "0730 129 030", adresa: "Str. Florilor nr. 7", localitate: "Vulturu", email: "", observatii: "" }).expect(200);
    expect(await fisa(c.clientId)).toEqual({ ...c.date, localitate: "Vulturu" });
    expect(await jurnal(c.clientId)).toEqual([["localitate", "Golești", "Vulturu"]]);
    // telefonul golit pe pagina ofertei: fisa clientului (cu telefonul lui) ramane cum era
    await agent.put(`/api/oferte/${c.id}/client`).send({ nume: "Stanescu Elena", telefon: "", adresa: "Str. Florilor nr. 7", localitate: "", email: "", observatii: "" }).expect(200);
    expect(await fisa(c.clientId)).toEqual({ ...c.date, localitate: "Vulturu" });
    expect(await jurnal(c.clientId)).toEqual([["localitate", "Golești", "Vulturu"]]);
  });

  it("legarea la un client existent (M6 - „leaga”): fisa lui primeste doar ce e scris; campurile goale raman", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const c = await clientComplet(agent, "Popa Gheorghe", "0730 129 040");
    const noua = await ofertaNoua(agent, { nume: "Popa Gheorghe", adresa: "Str. Nouă nr. 5" }); // fara telefon = client nou
    expect(noua.clientId).not.toBe(c.clientId);
    const corp = { nume: "Popa Gheorghe", telefon: "0730 129 040", adresa: "Str. Nouă nr. 5", localitate: "", email: "", observatii: "" };
    const propunere = await agent.put(`/api/oferte/${noua.id}/client`).send(corp);
    expect(propunere.status).toBe(409);
    expect(propunere.body.propunereLegare.id).toBe(c.clientId);
    expect(await fisa(c.clientId)).toEqual(c.date); // refuzul nu scrie nimic
    const legat = await agent.put(`/api/oferte/${noua.id}/client`).send({ ...corp, legare: "leaga" });
    expect(legat.status, JSON.stringify(legat.body)).toBe(200);
    expect(legat.body.oferta.client.id).toBe(c.clientId);
    expect(await fisa(c.clientId)).toEqual({ ...c.date, adresa: "Str. Nouă nr. 5" });
    expect(await jurnal(c.clientId)).toEqual([["adresa", "Str. Florilor nr. 7", "Str. Nouă nr. 5"]]);
  });

  it("pagina ofertei, clientul ales din lista fara telefon (BUG-15): oferta se muta pe el, campurile goale nu-i sterg fisa", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const date = { nume: "Enache Radu", adresa: "Str. Morii nr. 9", localitate: "Jariștea", email: "radu@exemplu.local", observatii: "plătește cu OP" };
    const c = await ofertaNoua(agent, date);
    const alta = await ofertaNoua(agent, { nume: "Temporar S27b", adresa: "Str. T 1" });
    const mutat = await agent.put(`/api/oferte/${alta.id}/client`).send({ nume: "Enache Radu", adresa: "Str. Morii nr. 9", localitate: "", email: "", observatii: "", clientExistentId: c.clientId });
    expect(mutat.status, JSON.stringify(mutat.body)).toBe(200);
    expect(mutat.body.oferta.client.id).toBe(c.clientId);
    expect(await fisa(c.clientId)).toEqual({ ...date, telefon: null });
    expect(await jurnal(c.clientId)).toEqual([]);
  });

  it("copierea ofertei pentru un client existent (alt client decat al ofertei): campurile goale nu-i ating fisa", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const c = await clientComplet(agent, "Tudor Mihai", "0730 129 050");
    const sursa = await ofertaNoua(agent, { nume: "Vecinul Sursă", telefon: "0730 129 051", adresa: "Str. S 1" });
    const copie = await agent.post(`/api/oferte/${sursa.id}/copie`).send({ client: { nume: "Tudor Mihai", telefon: "0730 129 050", adresa: "Str. Florilor nr. 7", localitate: "", email: "", observatii: "" } });
    expect(copie.status, JSON.stringify(copie.body)).toBe(201);
    expect(copie.body.oferta.client.id).toBe(c.clientId);
    expect(await fisa(c.clientId)).toEqual(c.date);
    expect(await jurnal(c.clientId)).toEqual([]);
  });
});
