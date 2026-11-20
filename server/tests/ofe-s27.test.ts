import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { incarcaOptiuniListe } from "../src/modules/adm/optiuniListe.js";
import { htmlPentru } from "../src/modules/ofe/documente/index.js";
import { asiguraCatalogBilka } from "./catalogTest.js";
import { citesteEtalon } from "./etalon/incarcaEtalon.js";
import { corpDinEtalon, preturiDinEtalon, puneCursulEtalonului } from "./etalonApi.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

// S27 (docs/MODIFICARI-S27.md, docs/CERERI-BUG-S25.md): MODIFICAREA M9 prin API - E13 (accesorii speciale
// 2 ML de sine statatoare, in doua chei, fara invelitoare) construit ca din editor: cifrele etalonului,
// cele doua formulare, benzile din PDF; MODIFICAREA M10 - tabelul de comenzi cu adresa lucrarii la client
// si cautarea dupa adresa; BUG-15 - sugestiile pe numele clientului, in vizibilitatea contului, si legarea
// de clientul ales (si cand n-are telefon); BUG-16 - montatorul de executie scris de mana intra in lista
// autorului ofertei. Motorul (mot/) e neatins; generatorul pe E13 e in ofe-formular-bilka.test.ts.

const app = creeazaApp();
const S = "-s27@exemplu.local";
const EMAIL = { adminGeneral: `admin-general${S}`, admin1: `admin1${S}`, agent1: `agent1${S}`, agent2: `agent2${S}`, agent3: `agent3${S}`, gestiune: `gestiune${S}` };
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
  firma1 = (await prisma.firma.create({ data: { denumire: "Firma S27 1", cui: "RO81", nrRegCom: "J81", adresa: "A", telefon: "1", email: `f1${S}` } })).id;
  const firma2 = (await prisma.firma.create({ data: { denumire: "Firma S27 2", cui: "RO82", nrRegCom: "J82", adresa: "B", telefon: "2", email: `f2${S}` } })).id;
  const admin1 = await creeazaUtilizatorTest(EMAIL.admin1, "ADMINISTRATOR", { firmaId: firma1, serieOferta: "TZA", adaosProcent: 1 });
  idAgent1 = (await creeazaUtilizatorTest(EMAIL.agent1, "AGENT", { firmaId: firma1, administratorId: admin1.id, serieOferta: "TZG", adaosProcent: 1 })).id;
  await creeazaUtilizatorTest(EMAIL.agent2, "AGENT", { firmaId: firma1, administratorId: admin1.id, serieOferta: "TZH", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.agent3, "AGENT", { firmaId: firma2, serieOferta: "TZX", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.gestiune, "GESTIUNE", { accesGeneralFirme: true, telefon: "0755 000 666" });
  for (const d of [dataLocala(0), dataLocala(-1)]) {
    await prisma.cursValutar.upsert({ where: { data_moneda: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR" } }, update: { curs: "5.3485" }, create: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR", curs: "5.3485", sursa: "test" } });
  }
}, 240_000);

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

async function cuEtalon(agent: Agent, id: string, etalon: string): Promise<Rand> {
  const e = citesteEtalon(etalon);
  const rp = await agent.put(`/api/oferte/${id}/produse`).send(await corpDinEtalon(e));
  expect(rp.status, JSON.stringify(rp.body)).toBe(200);
  await puneCursulEtalonului(id, e);
  const r = await agent.put(`/api/oferte/${id}/preturi`).send(preturiDinEtalon(e, rp.body.oferta.linii));
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.oferta as Rand;
}

async function comandata(agent: Agent, id: string): Promise<{ comandaId: string; numarComplet: string }> {
  await agent.put(`/api/oferte/${id}/status`).send({ status: "TRANSMISA" }).expect(200);
  await agent.put(`/api/oferte/${id}/status`).send({ status: "DE_COMANDAT", livrareBilka: { tip: "DEPOZIT" } }).expect(200);
  const c = await agent.put(`/api/oferte/${id}/status`).send({ status: "COMANDAT" });
  expect(c.status, JSON.stringify(c.body)).toBe(200);
  const cmd = await prisma.comanda.findUniqueOrThrow({ where: { ofertaId: id } });
  return { comandaId: cmd.id, numarComplet: `${cmd.serie}-${String(cmd.numar).padStart(4, "0")}` };
}

const persoane = async (agent: Agent, q: string) => (await agent.get("/api/montatori").query({ q }).expect(200)).body.montatori as Rand[];
const sugestii = async (agent: Agent, nume: string) => (await agent.get("/api/clienti").query({ nume }).expect(200)).body.clienti as Rand[];

describe("M9 prin API - E13: accesorii speciale 2 ML de sine statatoare, fara invelitoare", () => {
  it("oferta se construieste ca din editor (linii cu cheia lor, fara invelitoare): cifrele E13, doua sectiuni, doua formulare; in PDF benzile de speciale stau la locul lor, cate una pe cheie", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const { id } = await ofertaNoua(agent, { nume: "Client Speciale", telefon: "0730 128 001", adresa: "Str. Glafului 1", localitate: "Cotești" });
    const o = await cuEtalon(agent, id, "E13");
    expect(o.invelitori).toHaveLength(0);
    expect(o.linii.map((l: Rand) => [l.cod, l.rubrica, l.invelitoareId, l.culoareRal, l.culoareFinisaj, l.culoareGrosime])).toEqual([
      ["ASP05MAT050", "Accesorii speciale (2 ML)", null, "RAL 8017", "mat", "0,50 mm"],
      ["ASP08MAT050", "Accesorii speciale (2 ML)", null, "RAL 8017", "mat", "0,50 mm"],
      ["ASP06LUC050", "Accesorii speciale (2 ML)", null, "RAL 9005", "lucios", "0,50 mm"],
      ["SUCLE408035", "Fixare și etanșare", null, "RAL 8017", "mat", "0,50 mm"],
    ]);
    const r = o.preturi.rezultat as Rand;
    expect(r.totaluri).toMatchObject({ achizitieContEurFaraTva: "178.00", achizitieContLeiCuTva: "1163.49", documentFaraTvaEur: "215.74", tvaEur: "45.31", documentCuTvaEur: "261.05", documentTotalLei: "1396.23" });
    expect(r.linii.map((l: Rand) => [l.cod, l.cantitate, l.pretDocumentEur, l.valoareEur])).toEqual([
      ["ASP05MAT050", "16", "5.39", "86.24"],
      ["ASP08MAT050", "6", "8.65", "51.90"],
      ["ASP06LUC050", "10", "6.23", "62.30"],
      ["SUCLE408035", "2", "7.65", "15.30"],
    ]);
    expect(r.comandabil).toEqual({ da: true, motive: [] });
    expect(r.pachete.map((p: Rand) => [p.nume, p.linii.length])).toEqual([
      ["Secțiune de sine stătătoare 1 — 8017 mat 0,50", 3],
      ["Secțiune de sine stătătoare 2 — 9005 lucios 0,50", 1],
    ]);
    expect(r.formulareBilka).toHaveLength(2);
    expect(r.formulareBilka.every((f: Rand) => f.invelitoarePrincipala === undefined)).toBe(true);
    // PDF-ul ofertei: ordinea clasica - specialele (o banda pe cheie) inaintea fixarii
    const { html } = await htmlPentru(id, "OFERTA");
    const corp = html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    const loc = (t: string) => corp.search(new RegExp(t, "i"));
    const speciale8017 = loc("Accesorii speciale[^|]{0,80}8017");
    const speciale9005 = loc("Accesorii speciale[^|]{0,80}9005");
    const fixare = loc("Fixare și etanșare");
    expect(speciale8017, "banda specialelor 8017").toBeGreaterThan(-1);
    expect(speciale9005, "banda specialelor 9005").toBeGreaterThan(speciale8017);
    expect(fixare, "fixarea dupa speciale").toBeGreaterThan(speciale9005);
    expect(corp).toContain("1.396,23");
    // se poate comanda (fara invelitori nimic nu blocheaza)
    await comandata(agent, id);
  }, 180_000);

  it("pe langa invelitoare (E01 + o rubrica de speciale in a doua cheie): formularul invelitorii ramane, apare unul fara invelitoare pentru cheia a doua", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const { id } = await ofertaNoua(agent, { nume: "Client Doua Chei", telefon: "0730 128 002", adresa: "Str. Fațadei 2", localitate: "Cotești" });
    const e = citesteEtalon("E01");
    const corp = await corpDinEtalon(e);
    const inainte = (await agent.put(`/api/oferte/${id}/produse`).send(corp).expect(200)).body.oferta as Rand;
    expect(inainte.structura.rezultat.formulareBilka).toHaveLength(1);
    const d06 = await prisma.produs.findFirstOrThrow({ where: { codFurnizor: "ASP06LUC050", activ: true }, include: { categorieOferta: true } });
    const cuSpeciale = { ...corp, linii: [...corp.linii, { cheie: "M9", rubrica: d06.categorieOferta!.denumire, produsId: d06.id, cantitate: "10", invelitoare: null, culoare: { ral: "RAL 9005", finisaj: "lucios", grosime: "0,50 mm" } }] };
    const dupa = (await agent.put(`/api/oferte/${id}/produse`).send(cuSpeciale).expect(200)).body.oferta as Rand;
    const f = dupa.structura.rezultat.formulareBilka as Rand[];
    expect(f).toHaveLength(2);
    const forma = (x: Rand) => ({ nr: x.nr, pachete: x.pachete, continut: x.continut, principala: Boolean(x.invelitoarePrincipala), secundare: x.invelitoriSecundare.length, linii: x.linii.length, pluvial: x.pluvial.map((p: Rand) => [p.finisaj, p.sistem, p.ral, p.linii.length]), lungimi: x.lungimi.length });
    expect(forma(f[0])).toEqual(forma(inainte.structura.rezultat.formulareBilka[0]));
    expect(f[0].invelitoarePrincipala).toBeTruthy();
    expect(f[1].invelitoarePrincipala).toBeUndefined();
    expect(f[1].continut).toContain("9005 lucios 0,50");
    expect(f[1].linii).toHaveLength(1);
  }, 120_000);
});

describe("M10 - tabelul de comenzi: adresa lucrarii la client, cautarea dupa adresa", () => {
  it("randul comenzii poarta localitatea si adresa lucrarii (din oferta; la manuale adresa clientului, daca a fost scrisa); cautarea gaseste si dupa adresa, fara diacritice", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const { id } = await ofertaNoua(agent, { nume: "Agrovest Test", telefon: "0730 128 010", adresa: "Str. Mărășești nr. 12", localitate: "Focșani" });
    await cuEtalon(agent, id, "E13");
    const c = await comandata(agent, id);
    const lista = async (q: string) => (await gestiune.get("/api/comenzi").query({ q }).expect(200)).body.comenzi as Rand[];
    const rand = (await lista(c.numarComplet))[0];
    expect(rand.client).toEqual({ nume: "Agrovest Test", telefon: "0730 128 010", localitate: "Focșani", adresa: "Str. Mărășești nr. 12" });
    // responsabilul ramane in date (ecranul il arata in randul desfasurat)
    expect(rand.responsabil).toMatchObject({ nume: "Test AGENT" });
    expect((await lista("marasesti nr. 12")).map((x) => x.id)).toEqual([rand.id]);
    expect((await lista("Mărășești")).map((x) => x.id)).toContain(rand.id);
    // adresa lucrarii schimbata pe oferta nu e cazul dupa "Comandat"; la manuale: cu si fara adresa
    const cuAdresa = await gestiune.post("/api/comenzi").send({ firmaId: firma1, client: { nume: "Manual Cu Adresa", telefon: "0730 128 011", localitate: "Panciu", adresa: "Str. Viilor nr. 3" }, rezumat: "accesorii", totalLei: "100" });
    expect(cuAdresa.status, JSON.stringify(cuAdresa.body)).toBe(201);
    expect(cuAdresa.body.comanda.client).toEqual({ nume: "Manual Cu Adresa", telefon: "0730 128 011", localitate: "Panciu", adresa: "Str. Viilor nr. 3" });
    const faraAdresa = await gestiune.post("/api/comenzi").send({ firmaId: firma1, client: { nume: "Manual Fara Adresa", telefon: "0730 128 012", localitate: "Panciu" }, rezumat: "accesorii", totalLei: "100" });
    expect(faraAdresa.body.comanda.client).toEqual({ nume: "Manual Fara Adresa", telefon: "0730 128 012", localitate: "Panciu", adresa: null });
    expect((await lista("viilor nr. 3")).map((x) => x.id)).toEqual([cuAdresa.body.comanda.id]);
    expect((await gestiune.get(`/api/comenzi/${rand.id}`).expect(200)).body.comanda.client.adresa).toBe("Str. Mărășești nr. 12");
  }, 120_000);
});

describe("BUG-15 - sugestii pe numele clientului", () => {
  let popescu: { id: string; clientId: string };
  let popa: { id: string; clientId: string };
  let popovici: { id: string; clientId: string };

  it("de la 3 litere, fara diacritice, cu telefonul si localitatea; doar clientii cu oferte vizibile contului (si cei creati de el)", async () => {
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    const agent2 = await autentificaAgent(app, EMAIL.agent2);
    popescu = await ofertaNoua(agent1, { nume: "Popescu Ștefan", telefon: "0730 128 020", adresa: "Str. A 1", localitate: "Câmpineanca" });
    popa = await ofertaNoua(agent1, { nume: "Popa Vasile", adresa: "Str. B 2", localitate: "Panciu" }); // fara telefon (M6)
    popovici = await ofertaNoua(agent2, { nume: "Popovici Dan", adresa: "Str. C 3", localitate: "Odobești" }); // al altui agent, tot fara telefon
    expect(await sugestii(agent1, "Po")).toEqual([]); // sub 3 litere nu se cauta
    const s = await sugestii(agent1, "pop");
    expect(s.map((c) => [c.nume, c.telefon, c.localitate])).toEqual([
      ["Popa Vasile", null, "Panciu"],
      ["Popescu Ștefan", "0730 128 020", "Câmpineanca"],
    ]);
    expect(s.map((c) => c.id)).toEqual([popa.clientId, popescu.clientId]);
    expect((await sugestii(agent1, "stefan")).map((c) => c.nume)).toEqual(["Popescu Ștefan"]); // fara diacritice, oriunde in nume
    expect((await sugestii(agent2, "pop")).map((c) => c.nume)).toEqual(["Popovici Dan"]);
    // Administratorul firmei vede clientii ofertelor firmei; agentul altei firme nimic; Admin general tot
    expect((await sugestii(await autentificaAgent(app, EMAIL.admin1), "pop")).map((c) => c.nume)).toEqual(["Popa Vasile", "Popescu Ștefan", "Popovici Dan"]);
    expect(await sugestii(await autentificaAgent(app, EMAIL.agent3), "pop")).toEqual([]);
    expect((await sugestii(await autentificaAgent(app, EMAIL.adminGeneral), "popovici")).map((c) => c.nume)).toEqual(["Popovici Dan"]);
    // cautarea dupa telefon ramane pe toata baza (ca pana acum): agentul altei firme gaseste numarul exact
    const dupaTelefon = (await (await autentificaAgent(app, EMAIL.agent3)).get("/api/clienti").query({ telefon: "0730128020" }).expect(200)).body.clienti as Rand[];
    expect(dupaTelefon.map((c) => c.nume)).toEqual(["Popescu Ștefan"]);
  });

  it("alegerea din lista leaga oferta de client: cu telefon - prin numar, ca pana acum; fara telefon - prin alegere, fara dublura; un client care nu e vizibil contului nu se leaga", async () => {
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    // clientul cu telefon: deduplicarea pe numar
    const a = await ofertaNoua(agent1, { nume: "Popescu Ștefan", telefon: "0730 128 020", adresa: "Str. A 1", localitate: "Câmpineanca" }, { clientExistentId: popescu.clientId });
    expect(a.clientId).toBe(popescu.clientId);
    // clientul fara telefon: se leaga de cel ales, iar datele scrise ii actualizeaza fisa (cu jurnal)
    const b = await ofertaNoua(agent1, { nume: "Popa Vasile", adresa: "Str. Nouă 9", localitate: "Panciu" }, { clientExistentId: popa.clientId });
    expect(b.clientId).toBe(popa.clientId);
    expect(await prisma.client.count({ where: { nume: "Popa Vasile" } })).toBe(1);
    expect((await prisma.client.findUniqueOrThrow({ where: { id: popa.clientId } })).adresa).toBe("Str. Nouă 9");
    expect(await prisma.jurnalIntrare.count({ where: { entitate: "Client", entitateId: popa.clientId, camp: "adresa", valoareDupa: "Str. Nouă 9" } })).toBe(1);
    // fara alegere, acelasi nume fara telefon = client nou (telefonul ramane cheia de deduplicare)
    const c = await ofertaNoua(agent1, { nume: "Popa Vasile", adresa: "Str. Alta 1", localitate: "Panciu" });
    expect(c.clientId).not.toBe(popa.clientId);
    // clientul altui agent (invizibil contului) nu se leaga: se creeaza unul nou
    const d = await ofertaNoua(agent1, { nume: "Popovici Dan", adresa: "Str. C 3", localitate: "Odobești" }, { clientExistentId: popovici.clientId });
    expect(d.clientId).not.toBe(popovici.clientId);
    // pe pagina ofertei: schimbarea clientului cu unul ales din lista (fara telefon) muta oferta pe el
    const e = await ofertaNoua(agent1, { nume: "Temporar", adresa: "Str. T 1", localitate: "Panciu" });
    const mutat = await agent1.put(`/api/oferte/${e.id}/client`).send({ nume: "Popa Vasile", adresa: "Str. Nouă 9", localitate: "Panciu", clientExistentId: popa.clientId });
    expect(mutat.status, JSON.stringify(mutat.body)).toBe(200);
    expect(mutat.body.oferta.client.id).toBe(popa.clientId);
    // clientul ales fara telefon primeste acum un telefon nou: ramane acelasi client, cu numarul pus
    const cuTelefon = await ofertaNoua(agent1, { nume: "Popa Vasile", telefon: "0730 128 021", adresa: "Str. Nouă 9", localitate: "Panciu" }, { clientExistentId: popa.clientId });
    expect(cuTelefon.clientId).toBe(popa.clientId);
    expect((await prisma.client.findUniqueOrThrow({ where: { id: popa.clientId } })).telefonNormalizat).toBe("0730128021");
  });
});

describe("BUG-16 - montatorul de executie scris de mana intra in lista autorului ofertei", () => {
  it("de pe oferta: persoana noua de tip montator, o singura data pe telefon; apare la autocompletare pe oferta urmatoare; „clientul este montatorul” intra si el", async () => {
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    const a = await ofertaNoua(agent1, { nume: "Client Montator Unu", telefon: "0730 128 030", adresa: "Str. M 1", localitate: "Panciu" });
    expect(await persoane(agent1, "Tudorel")).toEqual([]);
    await agent1.put(`/api/oferte/${a.id}/montator`).send({ montatorExecutie: { nume: "Tudorel Nou", telefon: "0766 128 301" } }).expect(200);
    const lista = await persoane(agent1, "Tudorel");
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ nume: "Tudorel Nou", telefon: "0766 128 301", tip: "MONTATOR", activ: true, adaugatDeNume: null, utilizatorId: idAgent1 });
    // a doua oferta: acelasi telefon scris altfel -> nu se dubleaza; apare la autocompletare dupa nume si dupa telefon
    const b = await ofertaNoua(agent1, { nume: "Client Montator Doi", telefon: "0730 128 031", adresa: "Str. M 2", localitate: "Panciu" });
    expect((await persoane(agent1, "tud")).map((m) => m.nume)).toEqual(["Tudorel Nou"]);
    await agent1.put(`/api/oferte/${b.id}/montator`).send({ montatorExecutie: { nume: "Tudorel N.", telefon: "+40 766 128 301" } }).expect(200);
    expect(await persoane(agent1, "0766128301")).toHaveLength(1);
    // o persoana deja in lista (recomandarea) nu se dubleaza cand e scrisa si ca montator
    await agent1.put(`/api/oferte/${b.id}/montator`).send({ montatorNou: { nume: "Ionel Recomandare", telefon: "0744 128 302", tip: "COLABORATOR" } }).expect(200);
    await agent1.put(`/api/oferte/${b.id}/montator`).send({ montatorExecutie: { nume: "Ionel Recomandare", telefon: "0744 128 302" } }).expect(200);
    const ionel = await persoane(agent1, "Ionel Recomandare");
    expect(ionel.map((m) => m.tip)).toEqual(["COLABORATOR"]);
    // „clientul este montatorul”: numele si telefonul clientului, in lista
    await agent1.put(`/api/oferte/${a.id}/montator`).send({ montatorExecutie: { nume: "Client Montator Unu", telefon: "0730 128 030" } }).expect(200);
    expect((await persoane(agent1, "Client Montator Unu")).map((m) => [m.telefon, m.tip])).toEqual([["0730 128 030", "MONTATOR"]]);
    // golirea montatorului nu scoate persoana din lista
    await agent1.put(`/api/oferte/${a.id}/montator`).send({ montatorExecutie: null }).expect(200);
    expect(await persoane(agent1, "Client Montator Unu")).toHaveLength(1);
    // lista e a autorului: alt agent nu o vede
    expect(await persoane(await autentificaAgent(app, EMAIL.agent2), "Tudorel")).toEqual([]);
  });

  it("de pe comanda: scris de Gestiune sau de un Administrator, intra in lista autorului ofertei, cu „adaugat de …”; la comanda manuala in lista contului alocat, altfel nu se retine", async () => {
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const { id } = await ofertaNoua(agent1, { nume: "Client Montator Comanda", telefon: "0730 128 040", adresa: "Str. M 4", localitate: "Panciu" });
    await cuEtalon(agent1, id, "E13");
    const c = await comandata(agent1, id);
    await gestiune.put(`/api/comenzi/${c.comandaId}/montator`).send({ montator: { nume: "Vasile Gestiune", telefon: "0722 128 303" } }).expect(200);
    const vasile = await persoane(agent1, "Vasile Gestiune");
    expect(vasile).toHaveLength(1);
    expect(vasile[0]).toMatchObject({ telefon: "0722 128 303", tip: "MONTATOR", adaugatDeNume: "Test GESTIUNE", utilizatorId: idAgent1 });
    // inca o data, acelasi numar: nimic in plus; scris chiar de autor pe comanda lui: fara "adaugat de"
    await (await autentificaAgent(app, EMAIL.admin1)).put(`/api/comenzi/${c.comandaId}/montator`).send({ montator: { nume: "Vasile G.", telefon: "0722128303" } }).expect(200);
    expect(await persoane(agent1, "0722128303")).toHaveLength(1);
    await agent1.put(`/api/comenzi/${c.comandaId}/montator`).send({ montator: { nume: "Scris De Autor", telefon: "0722 128 304" } }).expect(200);
    expect((await persoane(agent1, "Scris De Autor"))[0]).toMatchObject({ adaugatDeNume: null, utilizatorId: idAgent1 });
    // comanda manuala cu cont alocat: in lista contului alocat; fara cont alocat: nu se retine nicaieri
    const inainte = await prisma.montator.count();
    const m1 = await gestiune.post("/api/comenzi").send({ firmaId: firma1, client: { nume: "Manual Montator A", telefon: "0730 128 041", localitate: "Panciu" }, rezumat: "accesorii", totalLei: "100", contAlocatId: idAgent1, montator: { nume: "Montator Manual", telefon: "0722 128 305" } });
    expect(m1.status, JSON.stringify(m1.body)).toBe(201);
    expect((await persoane(agent1, "Montator Manual"))[0]).toMatchObject({ telefon: "0722 128 305", adaugatDeNume: "Test GESTIUNE", utilizatorId: idAgent1 });
    const m2 = await gestiune.post("/api/comenzi").send({ firmaId: firma1, client: { nume: "Manual Montator B", telefon: "0730 128 042", localitate: "Panciu" }, rezumat: "accesorii", totalLei: "100", montator: { nume: "Montator Neretinut", telefon: "0722 128 306" } });
    expect(m2.status, JSON.stringify(m2.body)).toBe(201);
    expect(await prisma.montator.count()).toBe(inainte + 1);
    // schimbat pe comanda manuala neidentificata: tot nu se retine
    await gestiune.put(`/api/comenzi/${m2.body.comanda.id}/montator`).send({ montator: { nume: "Altul", telefon: "0722 128 307" } }).expect(200);
    expect(await prisma.montator.count()).toBe(inainte + 1);
  }, 120_000);
});
