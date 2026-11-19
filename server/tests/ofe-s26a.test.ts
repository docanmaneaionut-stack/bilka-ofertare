import { PDFParse } from "pdf-parse";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { incarcaOptiuniListe } from "../src/modules/adm/optiuniListe.js";
import { creeazaClientNou, EroareClient } from "../src/modules/ofe/clienti.js";
import { htmlPentru } from "../src/modules/ofe/documente/index.js";
import { asiguraCatalogBilka } from "./catalogTest.js";
import { citesteEtalon } from "./etalon/incarcaEtalon.js";
import { corpDinEtalon, preturiDinEtalon, puneCursulEtalonului } from "./etalonApi.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

// S26a (docs/MODIFICARI-S26.md): MODIFICAREA M6 - telefonul clientului optional la oferta, obligatoriu la
// "Comandat", deduplicarea pe telefon cu propunerea de legare si marcajul "telefon dublat"; MODIFICAREA M7 -
// livrarea de la Bilka aleasa la "De comandat" (depozit / santier), pe comanda ca text, schimbabila acolo cu
// istoric; BUG-14 - ofertele "Neacceptata" la sfarsitul listei. Generatorul formularului (celulele antetului,
// hash-urile VBA) e in ofe-formular-bilka.test.ts.

const app = creeazaApp();
const S = "-s26@exemplu.local";
const EMAIL = { adminGeneral: `admin-general${S}`, admin: `admin${S}`, agent: `agent${S}`, gestiune: `gestiune${S}`, contabil: `contabil${S}` };
let firmaId: string;

function dataLocala(delta = 0): string {
  const d = new Date(Date.now() + delta * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

beforeAll(async () => {
  const adminGeneral = await creeazaUtilizatorTest(EMAIL.adminGeneral, "ADMIN_GENERAL");
  await asiguraCatalogBilka(adminGeneral);
  await incarcaOptiuniListe(prisma);
  firmaId = (await prisma.firma.create({ data: { denumire: "Firma S26a", cui: "RO93", nrRegCom: "J93", adresa: "A", telefon: "1", email: `f${S}` } })).id;
  const admin = await creeazaUtilizatorTest(EMAIL.admin, "ADMINISTRATOR", { firmaId, serieOferta: "SAD", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.agent, "AGENT", { firmaId, administratorId: admin.id, serieOferta: "SAG", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.gestiune, "GESTIUNE", { accesGeneralFirme: true, telefon: "0755 000 444" });
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
const MESAJ_TELEFON = "Telefonul clientului lipsește — completează-l înainte de comandă.";

async function ofertaNoua(agent: Agent, client: Rand): Promise<{ id: string; clientId: string; numar: string }> {
  const r = await agent.post("/api/oferte").send({ client });
  expect(r.status, JSON.stringify(r.body)).toBe(201);
  return { id: r.body.oferta.id, clientId: r.body.oferta.client.id, numar: r.body.oferta.numarComplet };
}

// produsele si preturile E01 pe oferta data
async function cuProduse(agent: Agent, id: string) {
  const e = citesteEtalon("E01");
  const rp = await agent.put(`/api/oferte/${id}/produse`).send(await corpDinEtalon(e));
  expect(rp.status, JSON.stringify(rp.body)).toBe(200);
  await puneCursulEtalonului(id, e);
  const r = await agent.put(`/api/oferte/${id}/preturi`).send(preturiDinEtalon(e, rp.body.oferta.linii));
  expect(r.status, JSON.stringify(r.body)).toBe(200);
}

describe("M6 - telefonul clientului: optional la oferta, obligatoriu la „Comandat”", () => {
  it("oferta fara telefon = 201 cu client nou fara telefon; doua oferte fara telefon = doi clienti; in lista apare marcata", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent);
    const a = await ofertaNoua(agent, { nume: "Popescu Ion", adresa: "Str. Florilor 1", localitate: "Câmpineanca" });
    const b = await ofertaNoua(agent, { nume: "Popescu Ion", adresa: "Str. Florilor 1", localitate: "Câmpineanca", telefon: "" });
    expect(a.clientId).not.toBe(b.clientId);
    const c = await prisma.client.findUniqueOrThrow({ where: { id: a.clientId } });
    expect(c).toMatchObject({ telefon: null, telefonNormalizat: null, telefonDublat: false });
    const detaliu = (await agent.get(`/api/oferte/${a.id}`).expect(200)).body.oferta as Rand;
    expect(detaliu.client.telefon).toBeNull();
    const lista = (await agent.get("/api/oferte").query({ q: "Popescu Ion" }).expect(200)).body.oferte as Rand[];
    expect(lista.find((o) => o.id === a.id)).toMatchObject({ faraTelefon: true, client: { telefon: null } });
    // numele si adresa lucrarii raman obligatorii
    const faraAdresa = await agent.post("/api/oferte").send({ client: { nume: "Fara Adresa" } });
    expect(faraAdresa.status).toBe(400);
    // un telefon scris gresit e tot refuzat (BUG-4), doar lipsa lui e acceptata
    const gresit = await agent.post("/api/oferte").send({ client: { nume: "Tel Gresit", adresa: "A", telefon: "07ab" } });
    expect(gresit.status).toBe(400);
    expect(gresit.body.campuri[0]).toMatchObject({ camp: "client.telefon" });
    // PDF-ul ofertei: linia "Tel." lipseste din caseta clientului
    await cuProduse(agent, a.id);
    const { html } = await htmlPentru(a.id, "OFERTA");
    const casetaClient = /<div class="lbl">Client<\/div>([\s\S]*?)<\/div>/.exec(html)![1];
    expect(casetaClient).toContain("Popescu Ion");
    expect(casetaClient).not.toContain("Tel.");
    expect(html).not.toContain("null");
  }, 120_000);

  it("„Comandat” fara telefon = 409 cu campul si motivul; dupa completarea telefonului trece", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent);
    const o = await ofertaNoua(agent, { nume: "Fara Telefon Comanda", adresa: "Str. A 1", localitate: "Panciu" });
    await cuProduse(agent, o.id);
    await agent.put(`/api/oferte/${o.id}/status`).send({ status: "DE_COMANDAT", livrareBilka: { tip: "DEPOZIT" } }).expect(200); // la "De comandat" telefonul inca nu e cerut
    const r = await agent.put(`/api/oferte/${o.id}/status`).send({ status: "COMANDAT" });
    expect(r.status).toBe(409);
    expect(r.body.eroare).toContain(MESAJ_TELEFON);
    expect(r.body.campuri).toEqual([{ camp: "client.telefon", eticheta: "Telefon", mesaj: MESAJ_TELEFON }]);
    expect((await prisma.oferta.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("DE_COMANDAT");
    expect(await prisma.comanda.count({ where: { ofertaId: o.id } })).toBe(0);
    // telefonul nou (nu exista in baza) se pune pe acelasi client, cu jurnal
    const c = await agent.put(`/api/oferte/${o.id}/client`).send({ nume: "Fara Telefon Comanda", adresa: "Str. A 1", localitate: "Panciu", telefon: "0730 126 001" });
    expect(c.status, JSON.stringify(c.body)).toBe(200);
    expect(c.body.oferta.client).toMatchObject({ id: o.clientId, telefon: "0730 126 001" });
    expect(await prisma.jurnalIntrare.count({ where: { entitate: "Client", entitateId: o.clientId, camp: "telefon", valoareDupa: "0730 126 001" } })).toBe(1);
    const ok = await agent.put(`/api/oferte/${o.id}/status`).send({ status: "COMANDAT" });
    expect(ok.status, JSON.stringify(ok.body)).toBe(200);
    expect((await prisma.comanda.findUniqueOrThrow({ where: { ofertaId: o.id } })).clientTelefon).toBe("0730 126 001");
  }, 120_000);

  it("completarea unui telefon care exista deja: propunerea de legare; „leaga” muta oferta si actualizeaza fisa cu jurnal; „pastreaza” lasa telefonul pe clientul nou, marcat „telefon dublat”", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent);
    const existent = await ofertaNoua(agent, { nume: "Ion Popescu", adresa: "Str. Veche 1", localitate: "Focșani", telefon: "0730 126 002" });
    // 1. propunerea
    const b = await ofertaNoua(agent, { nume: "Popescu I.", adresa: "Str. Noua 2", localitate: "Focșani" });
    const date = { nume: "Popescu I.", adresa: "Str. Noua 2", localitate: "Focșani", telefon: "+40 730 126 002" };
    const p = await agent.put(`/api/oferte/${b.id}/client`).send(date);
    expect(p.status).toBe(409);
    expect(p.body.propunereLegare).toMatchObject({ id: existent.clientId, nume: "Ion Popescu", telefon: "0730 126 002" });
    expect(p.body.campuri).toEqual([expect.objectContaining({ camp: "telefon" })]);
    expect((await prisma.oferta.findUniqueOrThrow({ where: { id: b.id } })).clientId).toBe(b.clientId);
    expect((await prisma.client.findUniqueOrThrow({ where: { id: b.clientId } })).telefon).toBeNull();
    // 2. legarea: oferta trece pe clientul existent, datele scrise ii actualizeaza fisa (cu jurnal); clientul fara telefon ramane (nimic sters)
    const l = await agent.put(`/api/oferte/${b.id}/client`).send({ ...date, legare: "leaga" });
    expect(l.status, JSON.stringify(l.body)).toBe(200);
    expect(l.body.oferta.client).toMatchObject({ id: existent.clientId, nume: "Popescu I.", adresa: "Str. Noua 2" });
    expect(await prisma.jurnalIntrare.count({ where: { entitate: "Client", entitateId: existent.clientId, camp: "nume", valoareDupa: "Popescu I." } })).toBe(1);
    expect(await prisma.jurnalIntrare.count({ where: { entitate: "Oferta", entitateId: b.id, camp: "clientId", valoareDupa: existent.clientId } })).toBe(1);
    expect(await prisma.client.count({ where: { id: b.clientId } })).toBe(1);
    // 3. refuzul: telefonul ramane pe clientul nou, marcat
    const c = await ofertaNoua(agent, { nume: "Alt Popescu", adresa: "Str. Alta 3", localitate: "Focșani" });
    const dateC = { nume: "Alt Popescu", adresa: "Str. Alta 3", localitate: "Focșani", telefon: "0730126002" };
    expect((await agent.put(`/api/oferte/${c.id}/client`).send(dateC)).status).toBe(409);
    const k = await agent.put(`/api/oferte/${c.id}/client`).send({ ...dateC, legare: "pastreaza" });
    expect(k.status, JSON.stringify(k.body)).toBe(200);
    expect(k.body.oferta.client).toMatchObject({ id: c.clientId, telefon: "0730126002" });
    expect(await prisma.client.findUniqueOrThrow({ where: { id: c.clientId } })).toMatchObject({ telefonNormalizat: "0730126002", telefonDublat: true });
    expect((await prisma.client.findUniqueOrThrow({ where: { id: existent.clientId } })).telefonDublat).toBe(false);
    // dublatul isi poate salva din nou datele fara sa fie mutat pe clientul nemarcat
    const iar = await agent.put(`/api/oferte/${c.id}/client`).send({ ...dateC, observatii: "fratele lui Ion" });
    expect(iar.status, JSON.stringify(iar.body)).toBe(200);
    expect(iar.body.oferta.client.id).toBe(c.clientId);
    // marcajul il vede Admin general in lista; agentul nu
    const ag = await autentificaAgent(app, EMAIL.adminGeneral);
    const lista = (await ag.get("/api/oferte").query({ q: "Alt Popescu" }).expect(200)).body.oferte as Rand[];
    expect(lista.find((o) => o.id === c.id)!.telefonDublat).toBe(true);
    const listaAgent = (await agent.get("/api/oferte").query({ q: "Alt Popescu" }).expect(200)).body.oferte as Rand[];
    expect(listaAgent.find((o) => o.id === c.id)!.telefonDublat).toBe(false);
    // o oferta noua cu acelasi telefon se leaga de clientul NEMARCAT (ca pana acum), nu de dublat
    const d = await ofertaNoua(agent, { nume: "Popescu I.", adresa: "Str. Noua 2", localitate: "Focșani", telefon: "0730 126 002" });
    expect(d.clientId).toBe(existent.clientId);
  }, 120_000);

  it("doua creari simultane cu acelasi telefon nou -> un singur client; plasa de siguranta: incalcarea indexului = 409 cu campul, nu eroare generica", async () => {
    const a1 = await autentificaAgent(app, EMAIL.agent);
    const a2 = await autentificaAgent(app, EMAIL.admin);
    const client = { nume: "Simultan", adresa: "Str. S 1", telefon: "0730 126 003" };
    const [r1, r2] = await Promise.all([a1.post("/api/oferte").send({ client }), a2.post("/api/oferte").send({ client })]);
    expect([r1.status, r2.status]).toEqual([201, 201]);
    expect(r1.body.oferta.client.id).toBe(r2.body.oferta.client.id);
    expect(await prisma.client.count({ where: { telefonNormalizat: "0730126003" } })).toBe(1);
    // crearea directa a unui al doilea client nemarcat cu acelasi numar: indexul din baza o opreste -> EroareClient 409 cu campul
    const u = await prisma.utilizator.findUniqueOrThrow({ where: { email: EMAIL.agent } });
    const incercare = prisma.$transaction((tx) => creeazaClientNou(tx, { nume: "Simultan 2", telefon: "0730126003", telefonNormalizat: "0730126003", adresa: "B", localitate: null, email: null, observatii: null }, u));
    await expect(incercare).rejects.toBeInstanceOf(EroareClient);
    await expect(incercare).rejects.toMatchObject({ status: 409, campuri: [expect.objectContaining({ camp: "telefon" })] });
  });

  it("comenzile manuale pastreaza telefonul obligatoriu", async () => {
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const r = await gestiune.post("/api/comenzi").send({ firmaId, client: { nume: "Manual Fara Telefon", localitate: "Panciu" }, rezumat: "accesorii", totalLei: "100" });
    expect(r.status).toBe(400);
    expect(r.body.campuri[0]).toMatchObject({ camp: "client.telefon" });
  });
});

describe("M7 - livrarea de la Bilka: la depozit sau direct in santier", () => {
  let o: { id: string; clientId: string; numar: string };

  it("„De comandat” fara alegere = 409 cu campul; santier fara localitate / telefon = 400 pe campuri; alegerea se salveaza si se poate schimba cat oferta nu e „Comandat”, cu istoric", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent);
    o = await ofertaNoua(agent, { nume: "Croitoru Ionuț", adresa: "Str. Viei 4", localitate: "Cotești", telefon: "0730 126 010" });
    await cuProduse(agent, o.id);
    await agent.put(`/api/oferte/${o.id}/status`).send({ status: "TRANSMISA" }).expect(200);
    const fara = await agent.put(`/api/oferte/${o.id}/status`).send({ status: "DE_COMANDAT" });
    expect(fara.status).toBe(409);
    expect(fara.body.campuri).toEqual([expect.objectContaining({ camp: "livrareBilka", eticheta: "Livrarea de la Bilka" })]);
    expect((await prisma.oferta.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("TRANSMISA");
    const incomplet = await agent.put(`/api/oferte/${o.id}/status`).send({ status: "DE_COMANDAT", livrareBilka: { tip: "SANTIER" } });
    expect(incomplet.status).toBe(400);
    expect(incomplet.body.campuri.map((c: Rand) => c.camp).sort()).toEqual(["livrareBilka.localitate", "livrareBilka.telefon"]);
    // la depozit: nimic in plus
    const d = await agent.put(`/api/oferte/${o.id}/status`).send({ status: "DE_COMANDAT", livrareBilka: { tip: "DEPOZIT", localitate: "ignorata", telefon: "0700" } });
    expect(d.status, JSON.stringify(d.body)).toBe(200);
    expect(d.body.oferta.livrareBilka).toMatchObject({ tip: "DEPOZIT", localitate: null, telefon: null, text: null });
    // schimbarea alegerii, cu istoric
    const s = await agent.put(`/api/oferte/${o.id}/livrare-bilka`).send({ tip: "SANTIER", localitate: "Cotești", telefon: "0787 877 989" });
    expect(s.status, JSON.stringify(s.body)).toBe(200);
    expect(s.body.oferta.livrareBilka).toMatchObject({ tip: "SANTIER", localitate: "Cotești", telefon: "0787 877 989", text: "Livrare Bilka — șantier: Cotești · 0787 877 989" });
    const istoric = await prisma.ofertaIstoric.findMany({ where: { ofertaId: o.id, camp: "livrareBilka" }, orderBy: { moment: "asc" } });
    expect(istoric.map((i) => `${i.valoareInainte} -> ${i.valoareDupa}`)).toEqual(["null -> la depozit", "la depozit -> șantier: Cotești · 0787 877 989"]);
    // statusul se poate schimba inainte si inapoi fara sa se piarda alegerea; "De comandat" din nou nu o mai cere
    await agent.put(`/api/oferte/${o.id}/status`).send({ status: "ACCEPTATA" }).expect(200);
    await agent.put(`/api/oferte/${o.id}/status`).send({ status: "DE_COMANDAT" }).expect(200);
  }, 120_000);

  it("la „Comandat” alegerea trece pe comanda ca text vizibil; acolo o schimba Administratorul / Gestiunea cu istoric (agentul si Contabilitatea nu); pe oferta nu se mai schimba; fisa soferului o mentioneaza", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent);
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const r = await agent.put(`/api/oferte/${o.id}/status`).send({ status: "COMANDAT" });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const cmd = await prisma.comanda.findUniqueOrThrow({ where: { ofertaId: o.id } });
    expect(cmd).toMatchObject({ livrareBilka: "SANTIER", livrareBilkaLocalitate: "Cotești", livrareBilkaTelefon: "0787 877 989", statusLogistic: "COMANDAT" });
    const TEXT = "Livrare Bilka — șantier: Cotești · 0787 877 989";
    const rand = ((await gestiune.get("/api/comenzi").query({ q: "Croitoru" }).expect(200)).body.comenzi as Rand[]).find((c) => c.id === cmd.id)!;
    expect(rand.livrareBilka).toMatchObject({ tip: "SANTIER", localitate: "Cotești", telefon: "0787 877 989", text: TEXT });
    const detaliu = (await gestiune.get(`/api/comenzi/${cmd.id}`).expect(200)).body.comanda as Rand;
    expect(detaliu.livrareBilka.text).toBe(TEXT);
    expect(detaliu.drepturi.livrareBilka).toBe(true);
    // pe oferta nu se mai schimba dupa "Comandat"
    await agent.put(`/api/oferte/${o.id}/livrare-bilka`).send({ tip: "DEPOZIT" }).expect(409);
    // fisa soferului: mentiunea, in date si in PDF
    const fisa = (await gestiune.post("/api/comenzi/fisa-soferului").send({ comenzi: [cmd.id] }).expect(200)).body.fisa as Rand;
    expect(fisa.blocuri[0].livrareBilka).toBe(TEXT);
    const pdf = await gestiune.post("/api/comenzi/fisa-soferului/pdf").send({ comenzi: [cmd.id] }).buffer(true).parse((res, cb) => {
      const parti: Buffer[] = [];
      res.on("data", (d: Buffer) => parti.push(d));
      res.on("end", () => cb(null, Buffer.concat(parti)));
    });
    expect((await new PDFParse({ data: new Uint8Array(pdf.body as Buffer) }).getText()).text).toContain(TEXT);
    // drepturile si schimbarea pe comanda
    await agent.put(`/api/comenzi/${cmd.id}/livrare-bilka`).send({ tip: "DEPOZIT" }).expect(403);
    await (await autentificaAgent(app, EMAIL.contabil)).put(`/api/comenzi/${cmd.id}/livrare-bilka`).send({ tip: "DEPOZIT" }).expect(403);
    expect((await agent.get(`/api/comenzi/${cmd.id}`).expect(200)).body.comanda.drepturi.livrareBilka).toBe(false);
    const d = await gestiune.put(`/api/comenzi/${cmd.id}/livrare-bilka`).send({ tip: "DEPOZIT", mentiuni: "mașina Bilka nu ajunge, livrăm noi" });
    expect(d.status, JSON.stringify(d.body)).toBe(200);
    expect(d.body.comanda.livrareBilka).toMatchObject({ tip: "DEPOZIT", text: null });
    expect(d.body.comanda.statusLogistic).toBe("COMANDAT"); // statusurile logistice nu se schimba
    const incomplet = await (await autentificaAgent(app, EMAIL.admin)).put(`/api/comenzi/${cmd.id}/livrare-bilka`).send({ tip: "SANTIER", localitate: "Cotești" });
    expect(incomplet.status).toBe(400);
    expect(incomplet.body.campuri[0]).toMatchObject({ camp: "telefon" });
    const s = await (await autentificaAgent(app, EMAIL.admin)).put(`/api/comenzi/${cmd.id}/livrare-bilka`).send({ tip: "SANTIER", localitate: "Cotești", telefon: "0766 852 465" });
    expect(s.status, JSON.stringify(s.body)).toBe(200);
    const istoric = await prisma.comandaIstoric.findMany({ where: { comandaId: cmd.id, camp: "livrareBilka" }, orderBy: { moment: "asc" } });
    expect(istoric.map((i) => `${i.valoareInainte} -> ${i.valoareDupa}`)).toEqual(["șantier: Cotești · 0787 877 989 -> la depozit", "la depozit -> șantier: Cotești · 0766 852 465"]);
    expect(istoric[0].mentiuni).toBe("mașina Bilka nu ajunge, livrăm noi");
    // oferta ramane cu alegerea de la "Comandat" (inghetata)
    expect((await prisma.oferta.findUniqueOrThrow({ where: { id: o.id } })).livrareBilkaTelefon).toBe("0787 877 989");
  }, 120_000);

  it("„Comandat” direct, fara alegere = 409 cu campul; fara telefon si fara alegere = ambele campuri; cu alegerea in aceeasi cerere trece", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent);
    const a = await ofertaNoua(agent, { nume: "Direct Comandat", adresa: "Str. D 1", localitate: "Panciu" });
    await cuProduse(agent, a.id);
    const ambele = await agent.put(`/api/oferte/${a.id}/status`).send({ status: "COMANDAT" });
    expect(ambele.status).toBe(409);
    expect(ambele.body.campuri.map((c: Rand) => c.camp).sort()).toEqual(["client.telefon", "livrareBilka"]);
    await agent.put(`/api/oferte/${a.id}/client`).send({ nume: "Direct Comandat", adresa: "Str. D 1", localitate: "Panciu", telefon: "0730 126 011" }).expect(200);
    const unul = await agent.put(`/api/oferte/${a.id}/status`).send({ status: "COMANDAT" });
    expect(unul.status).toBe(409);
    expect(unul.body.campuri).toEqual([expect.objectContaining({ camp: "livrareBilka" })]);
    const ok = await agent.put(`/api/oferte/${a.id}/status`).send({ status: "COMANDAT", livrareBilka: { tip: "DEPOZIT" } });
    expect(ok.status, JSON.stringify(ok.body)).toBe(200);
    const cmd = await prisma.comanda.findUniqueOrThrow({ where: { ofertaId: a.id } });
    expect(cmd.livrareBilka).toBe("DEPOZIT");
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    expect(((await gestiune.get(`/api/comenzi/${cmd.id}`).expect(200)).body.comanda as Rand).livrareBilka).toMatchObject({ tip: "DEPOZIT", text: null });
  }, 120_000);
});

describe("BUG-14 - ofertele „Neacceptata” la sfarsitul listei", () => {
  it("o oferta trecuta pe Neacceptata coboara dupa blocul „Comandat”; revenita pe alt status urca la loc; numaratorile raman", async () => {
    const admin = await autentificaAgent(app, EMAIL.admin);
    const ids: string[] = [];
    for (const nume of ["Lista Unu", "Lista Doi", "Lista Trei", "Lista Patru"]) ids.push((await ofertaNoua(admin, { nume, adresa: "Str. L", localitate: "Lista" })).id);
    const [unu, doi, trei, patru] = ids;
    // "Lista Doi" comandata (direct in baza - ordinea e ce verificam aici)
    await prisma.oferta.update({ where: { id: doi }, data: { status: "COMANDAT", comandatLa: new Date() } });
    const lista = async () => (await admin.get("/api/oferte").query({ q: "Lista" }).expect(200)).body as { oferte: Rand[]; numaratori: Rand };
    const ordine = (l: { oferte: Rand[] }) => l.oferte.map((o) => o.client.nume);
    const inainte = await lista();
    expect(ordine(inainte)).toEqual(["Lista Patru", "Lista Trei", "Lista Unu", "Lista Doi"]);
    await admin.put(`/api/oferte/${patru}/status`).send({ status: "NEACCEPTATA" }).expect(200);
    await admin.put(`/api/oferte/${unu}/status`).send({ status: "NEACCEPTATA" }).expect(200);
    const dupa = await lista();
    // active -> blocul Comandat -> blocul Neacceptata (intre ele, in aceeasi ordine cronologica)
    expect(ordine(dupa)).toEqual(["Lista Trei", "Lista Doi", "Lista Patru", "Lista Unu"]);
    // numaratorile se calculeaza ca pana acum: totalul si comandatele neschimbate, doua oferte mai putin „In lucru”
    expect(dupa.numaratori).toEqual({ ...inainte.numaratori, inLucru: inainte.numaratori.inLucru - 2 });
    // raman vizibile la filtrul lor
    const filtrate = (await admin.get("/api/oferte").query({ q: "Lista", status: "NEACCEPTATA" }).expect(200)).body.oferte as Rand[];
    expect(filtrate.map((o) => o.client.nume)).toEqual(["Lista Patru", "Lista Unu"]);
    // revenita pe alt status urca la locul ei
    await admin.put(`/api/oferte/${patru}/status`).send({ status: "TRANSMISA" }).expect(200);
    expect(ordine(await lista())).toEqual(["Lista Patru", "Lista Trei", "Lista Doi", "Lista Unu"]);
    void trei;
  });
});
