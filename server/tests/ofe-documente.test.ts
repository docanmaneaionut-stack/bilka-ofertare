import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PDFParse } from "pdf-parse";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import type { FisierEtalon } from "../src/modules/mot/etalon.js";
import { inchideBrowserPdf } from "../src/modules/ofe/documente/pdf.js";
import { asiguraCatalogBilka } from "./catalogTest.js";
import { citesteEtalon } from "./etalon/incarcaEtalon.js";
import { corpDinEtalon, preturiDinEtalon, puneCursulEtalonului } from "./etalonApi.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

// S16: documentele PDF (FISA-OFERTARE cap. 13), generate pe server din rezultatul
// motorului (sau din cel salvat la "Comandat"), verificate pe textul extras din PDF:
// oferta in cele trei moduri de prezentare, anexa "Supliment la oferta" si tabelul
// de facturare (E07), rezumatul pe blocuri (E11), sipca (E12), detaliata cu
// panotaj, o oferta lunga pe mai multe pagini, permisiunile, "marcheaza ca transmis".

const app = creeazaApp();
const S = "-doc@exemplu.local";
const EMAIL = { adminGeneral: `admin-general${S}`, admin1: `admin1${S}`, agent1: `agent1${S}`, agent2: `agent2${S}`, colab: `colab${S}` };
let firma1: string;

function dataLocala(delta = 0): string {
  const d = new Date(Date.now() + delta * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

beforeAll(async () => {
  const adminGeneral = await creeazaUtilizatorTest(EMAIL.adminGeneral, "ADMIN_GENERAL");
  await asiguraCatalogBilka(adminGeneral);
  // garantiile folosite in subsol (daca importul referintelor nu le-a adus)
  for (const g of [
    { finisaj: "mat", grosime: "0,50 mm", culoare: 15, coroziune: 15 },
    { finisaj: "pluvial colorat", grosime: null, culoare: 15, coroziune: 30 },
    { finisaj: "pluvial mat", grosime: null, culoare: 20, coroziune: 30 },
  ]) {
    const existent = await prisma.garantieFinisajGrosime.findFirst({ where: { furnizor: "Bilka", finisaj: g.finisaj, grosime: g.grosime } });
    if (!existent) await prisma.garantieFinisajGrosime.create({ data: { furnizor: "Bilka", finisaj: g.finisaj, grosime: g.grosime, garantieCuloareAni: g.culoare, garantieCoroziuneAni: g.coroziune } });
  }
  firma1 = (await prisma.firma.create({ data: { denumire: "Firma Documente SRL", cui: "RO61", nrRegCom: "J61/1/2026", adresa: "Str. Doc 1", localitate: "Focșani", judet: "Vrancea", telefon: "0700000061", email: `f1${S}` } })).id;
  const admin1 = await creeazaUtilizatorTest(EMAIL.admin1, "ADMINISTRATOR", { firmaId: firma1, serieOferta: "DCA", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.agent1, "AGENT", { firmaId: firma1, administratorId: admin1.id, serieOferta: "DCG", adaosProcent: 1, telefon: "0765 000 111" });
  await creeazaUtilizatorTest(EMAIL.agent2, "AGENT", { firmaId: firma1, administratorId: admin1.id, serieOferta: "DCX", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.colab, "COLABORATOR", { firmaId: firma1, administratorId: admin1.id, serieOferta: "DCC", adaosProcent: 5 });
  for (const d of [dataLocala(0), dataLocala(-1)]) {
    await prisma.cursValutar.upsert({ where: { data_moneda: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR" } }, update: { curs: "5.3485" }, create: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR", curs: "5.3485", sursa: "test" } });
  }
}, 240_000);

afterAll(async () => {
  await inchideBrowserPdf();
  await prisma.$disconnect();
});

const CLIENT = { nume: "Client Documente", telefon: "0730000301", adresa: "Str. Florilor nr. 12", localitate: "Câmpineanca" };
type Agent = Awaited<ReturnType<typeof autentificaAgent>>;

async function ofertaNoua(agent: Agent): Promise<string> {
  const { body } = await agent.post("/api/oferte").send({ client: CLIENT }).expect(201);
  return body.oferta.id as string;
}

async function construieste(agent: Agent, id: string, e: FisierEtalon, corp?: Awaited<ReturnType<typeof corpDinEtalon>>) {
  const c = corp ?? (await corpDinEtalon(e));
  const rp = await agent.put(`/api/oferte/${id}/produse`).send(c);
  expect(rp.status, JSON.stringify(rp.body)).toBe(200);
  await puneCursulEtalonului(id, e);
  const r = await agent.put(`/api/oferte/${id}/preturi`).send(preturiDinEtalon(e, rp.body.oferta.linii));
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.oferta;
}

// genereaza documentul, il descarca si intoarce textul PDF-ului si numarul de pagini
async function document(agent: Agent, id: string, tip: string) {
  const r = await agent.post(`/api/oferte/${id}/documente`).send({ tip });
  expect(r.status, JSON.stringify(r.body)).toBe(201);
  const dl = await agent.get(`/api/oferte/${id}/documente/${r.body.document.id}`).buffer(true).parse((res, cb) => {
    const bucati: Buffer[] = [];
    res.on("data", (b: Buffer) => bucati.push(b));
    res.on("end", () => cb(null, Buffer.concat(bucati)));
  });
  expect(dl.status).toBe(200);
  expect(dl.headers["content-type"]).toMatch(/application\/pdf/);
  const buffer = dl.body as Buffer;
  expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const rezultat = await parser.getText();
  await parser.destroy();
  const text = rezultat.text.replace(/\s+/g, " ");
  return { document: r.body.document as { id: string; nume: string; versiune: number; pagini: number | null }, text, pagini: rezultat.total, marime: buffer.length };
}

const FARA_CODURI = /TMIBEMAT050|ACMICMAT050|SPJGH1254ML|TMCLSMAT050|REPROMAT050|SIPCAMAT050|SIHAGMAT050|SUCLE408035/;

describe("oferta (13.2) in cele trei moduri de prezentare", () => {
  it("E01 simplu: antetul, benzile, totalurile exacte, subsolul cu garantiile si cursul, fara coduri, 'Pagina x din y'", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    await construieste(agent, id, citesteEtalon("E01"));
    const { text, pagini, document: d } = await document(agent, id, "OFERTA");
    expect(text).toContain("DEVIZ OFERTĂ");
    expect(text).toContain("Firma Documente SRL");
    expect(text).toContain("CUI RO61 · J61/1/2026");
    expect(text).toContain("Client Documente");
    expect(text).toContain("Str. Florilor nr. 12, Câmpineanca");
    expect(text).toContain("Test AGENT");
    expect(text).toMatch(/Nr\.? DCG-\d{4} \/ \d{2}\.\d{2}\.\d{4}/);
    expect(text).not.toMatch(/valabil/i);
    expect(text).toContain("Iberic · mat · 0,50 mm · RAL 3005");
    expect(text).toContain("180,481");
    expect(text).toContain("T8 · mat · 0,50 mm · RAL 3005");
    expect(text).toMatch(/Accesorii standard · mat 0,50 mm · RAL 3005/);
    expect(text).toMatch(/Sistem pluvial · colorat \(lucios\) · RAL 3005/);
    expect(text).toContain("Coamă mică");
    expect(text).toContain("Total fără TVA 2.626,83 €");
    expect(text).toContain("TVA 21 % 551,63 €");
    expect(text).toContain("Total cu TVA 3.178,46 €");
    expect(text).toContain("Total în lei 17.000,00 lei");
    expect(text).toContain("Garanții: învelitoare 15 ani culoare și coroziune; sistem pluvial 15 ani culoare, 30 de ani coroziune.");
    expect(text).toContain("Curs EURO – 5,3485");
    expect(text).not.toMatch(FARA_CODURI);
    expect(text).not.toContain("SUPLIMENT");
    expect(pagini).toBeGreaterThanOrEqual(1);
    expect(text).toContain(`Pagina 1 din ${pagini}`);
    expect(text).toContain(`Firma Documente SRL · Deviz ofertă DCG-`);
    expect(d.pagini).toBe(pagini);
    expect(d.nume).toMatch(/^DCG-\d{4}-oferta-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.pdf$/);
  }, 120_000);

  it("E04 lista + discount general 25 %: preturi de lista si discountul o singura data, la totaluri", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    await construieste(agent, id, citesteEtalon("E04"));
    const { text } = await document(agent, id, "OFERTA");
    expect(text).toContain("PREȚ LISTĂ (€)");
    expect(text).toContain("Total listă fără TVA 3.502,44 €");
    expect(text).toContain("Discount general 25 % − 875,61 €");
    expect(text).toContain("Total cu TVA 3.178,46 €");
    expect(text).toContain("Total în lei 17.000,00 lei");
    expect(text).not.toMatch(/Preț net/i);
  }, 120_000);

  it("E08 discount per linie: coloanele Pret lista · Discount · Pret net, exceptia de 10 % pe tigla", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    await construieste(agent, id, citesteEtalon("E08"));
    const { text } = await document(agent, id, "OFERTA");
    expect(text).toContain("DISCOUNT");
    expect(text).toContain("PREȚ NET (€)");
    expect(text).toMatch(/Iberic · mat · 0,50 mm · RAL 3005 mp 180,481 [\d.,]+ 10 % /);
    expect(text).toMatch(/ 25 % /);
    expect(text).toContain("Total în lei 17.000,00 lei");
  }, 120_000);
});

describe("anexa si tabelul de facturare (cap. 9, 13.5, E07)", () => {
  it("E07: suplimentul pe pagina noua, numerotata in continuare, cu toate liniile zonei B in lei; tabelul de facturare cu linia preluata si totalul 19.238,50", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    await construieste(agent, id, citesteEtalon("E07"));
    const oferta = await document(agent, id, "OFERTA");
    expect(oferta.text).toContain("SUPLIMENT LA OFERTĂ");
    expect(oferta.text).toContain("Șipcă lemn 4 × 5 cm, tratată");
    expect(oferta.text).toContain("1.850,00 lei");
    expect(oferta.text).toContain("Manoperă montaj — prin terț colaborator");
    expect(oferta.text).toContain("9.500,00 lei");
    expect(oferta.text).toContain("Total supliment 11.350,00 lei");
    expect(oferta.text).toContain("Total în lei 17.000,00 lei"); // oferta ramane pe materiale
    expect(oferta.pagini).toBeGreaterThanOrEqual(2);
    expect(oferta.text).toContain(`Pagina ${oferta.pagini} din ${oferta.pagini}`);
    // in corpul ofertei (inaintea anexei) nu apare nicio linie din zona B
    const corp = oferta.text.slice(0, oferta.text.indexOf("SUPLIMENT LA OFERTĂ"));
    expect(corp).not.toContain("Șipcă lemn");
    expect(corp).not.toContain("Manoperă");

    const tabel = await document(agent, id, "TABEL_FACTURARE");
    expect(tabel.text).toContain("TABEL DE FACTURARE");
    expect(tabel.text).toContain("Document intern");
    expect(tabel.text).toContain("PREȚ UNITAR (LEI)");
    expect(tabel.text).toMatch(/Șipcă lemn 4 × 5 cm, tratată ml 320,000 5,7813 1\.850,00/);
    expect(tabel.text).not.toContain("Manoperă"); // nebifata "preia in factura"
    expect(tabel.text).toContain("Total de facturat 19.238,50 lei");
    expect(tabel.text).not.toContain("SUPLIMENT");
    expect(tabel.text).not.toMatch(FARA_CODURI);
    // preturile unitare ale materialelor in lei, la 4 zecimale
    expect(tabel.text).toMatch(/Iberic · mat · 0,50 mm · RAL 3005 mp 180,481 \d{2},\d{4} /);
  }, 180_000);
});

describe("rezumatul (13.4, E11) si sipca (E12)", () => {
  it("E11: blocuri numerotate - doua invelitori cu suprafata si garantia, categoriile cu 'Cuprinde' si 'Total' piese, fara valori pe blocuri", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    await construieste(agent, id, citesteEtalon("E11"));
    const { text } = await document(agent, id, "REZUMAT");
    expect(text).toContain("REZUMAT OFERTĂ");
    expect(text).toContain("Vă prezentăm pe scurt materialele cuprinse în oferta noastră:");
    // etichetele blocurilor (Suprafata, Garantie, Cuprinde, Total) ies cu majuscule (CSS)
    expect(text).toMatch(/1\. Învelitoare — Clasic · mat · 0,50 mm · RAL 8017 SUPRAFAȚĂ 189,120 mp GARANȚIE 15 ani culoare și coroziune/);
    expect(text).toMatch(/2\. Învelitoare — Retro Plus Standard · mat · 0,50 mm · RAL 7016 SUPRAFAȚĂ 30,406 mp/);
    expect(text).toMatch(/Accesorii standard — mat 0,50 mm · RAL 8017 CUPRINDE coamă mică, bordură fronton, bordură streașină, opritor zăpadă TOTAL \d+ piese/);
    expect(text).toMatch(/Sistem pluvial — mat · RAL 8017 CUPRINDE .* TOTAL \d+ piese GARANȚIE 20 de ani culoare, 30 de ani coroziune/);
    expect(text).toContain("Oferta detaliată, cu cantitățile pe fiecare produs, se predă la confirmarea comenzii.");
    expect(text).not.toMatch(/Preț unitar/i);
    expect(text).not.toMatch(/ACMICMAT050|TMCLSMAT050/);
    expect(text).toContain("Total în lei");
  }, 120_000);

  it("E12: sipca cu rubrica ei pe oferta (216,000 ml) si in rezumat", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    await construieste(agent, id, citesteEtalon("E12"));
    const oferta = await document(agent, id, "OFERTA");
    expect(oferta.text).toMatch(/Șipcă gard · mat 0,50 mm · RAL 7016/);
    expect(oferta.text).toMatch(/Șipcă Oslo ml 216,000/);
    expect(oferta.text).toMatch(/Șipcă Haga ml 97,000/);
    expect(oferta.text).toContain("Total în lei 17.281,75 lei");
    const rezumat = await document(agent, id, "REZUMAT");
    expect(rezumat.text).toMatch(/Șipcă gard — mat 0,50 mm · RAL 7016 CUPRINDE șipcă oslo TOTAL 216,000 ml/);
  }, 120_000);
});

describe("oferta detaliata (13.3) si oferta lunga (13.1)", () => {
  it("E01 detaliata: panotajul sub invelitoare, coloana 'Primit', randul in plus din subsol", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    await construieste(agent, id, citesteEtalon("E01"));
    const { text } = await document(agent, id, "DETALIATA");
    expect(text).toContain("DEVIZ OFERTĂ — DETALIAT");
    expect(text).toContain("PRIMIT");
    expect(text).toContain("PANOTAJ — LUNGIME COALĂ × BUCĂȚI"); // eticheta randului de panotaj e cu majuscule (CSS)
    expect(text).toContain("4,20 m × 15 buc");
    expect(text).toContain("3,10 m × 20 buc");
    expect(text).toContain("48 coli · lățime totală 1,18 m");
    expect(text).toContain("2,50 m × 2 buc");
    expect(text).toContain("Coloana „Primit”: de bifat la recepția mărfii.");
    expect(text).toContain("Total în lei 17.000,00 lei");
  }, 120_000);

  it("o oferta lunga (~68 de linii) cu supliment: mai multe pagini, capul de tabel repetat, anexa numerotata in continuare", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    const e01 = citesteEtalon("E01");
    const corp = await corpDinEtalon(e01);
    const extra = await prisma.produs.findMany({
      where: { activ: true, finisaj: "mat", grosime: "0,50 mm", categorieOferta: { denumire: { in: ["Accesorii standard", "Fixare și etanșare"] } }, preturi: { some: { listaPret: { status: "ACTIVA" } } } },
      select: { id: true, categorieOferta: { select: { denumire: true } } },
      take: 40,
    });
    expect(extra.length).toBeGreaterThanOrEqual(30);
    extra.forEach((p, k) => corp.linii.push({ cheie: `X${k}`, rubrica: p.categorieOferta!.denumire, produsId: p.id, cantitate: String(k + 1), invelitoare: null, culoare: { ral: "RAL 7016", finisaj: "mat", grosime: "0,50 mm" } }));
    corp.zonaB = [{ denumire: "Manoperă montaj", um: "lucrare", cantitate: "1", sumaLei: "12500", contineTva: false, preiaInFactura: false }];
    const rp = await agent.put(`/api/oferte/${id}/produse`).send(corp);
    expect(rp.status, JSON.stringify(rp.body)).toBe(200);
    expect(rp.body.oferta.linii.length).toBeGreaterThanOrEqual(60);
    await puneCursulEtalonului(id, e01);
    await agent.put(`/api/oferte/${id}/preturi`).send({ tinta: { tip: "ADAOS_PCT", valoare: "20" } }).expect(200);
    const { text, pagini } = await document(agent, id, "OFERTA");
    expect(pagini).toBeGreaterThanOrEqual(3);
    for (let p = 1; p <= pagini; p++) expect(text).toContain(`Pagina ${p} din ${pagini}`);
    expect(text.match(/PREȚ UNITAR \(€\)/g)?.length).toBeGreaterThanOrEqual(pagini - 1); // capul de tabel pe fiecare pagina cu tabel
    expect(text).toContain("SUPLIMENT LA OFERTĂ");
    expect(text).toContain("Manoperă montaj");
    expect(text.lastIndexOf("SUPLIMENT LA OFERTĂ")).toBeGreaterThan(text.lastIndexOf("Total în lei")); // anexa dupa ultima pagina a ofertei
  }, 180_000);
});

describe("rezultatul salvat, variantele, permisiunile si 'marcheaza ca transmis'", () => {
  it("o oferta 'Comandat' se tipareste din rezultatul salvat, fara recalcul", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    await construieste(agent, id, citesteEtalon("E01"));
    await agent.put(`/api/oferte/${id}/status`).send({ status: "COMANDAT" }).expect(200);
    const salvat = await prisma.oferta.findUniqueOrThrow({ where: { id }, select: { rezultatMotor: true } });
    const r = salvat.rezultatMotor as { totaluri: Record<string, string> };
    r.totaluri.documentTotalLei = "12345.67";
    await prisma.oferta.update({ where: { id }, data: { rezultatMotor: r as never } });
    const { text } = await document(agent, id, "OFERTA");
    expect(text).toContain("Total în lei 12.345,67 lei");
  }, 120_000);

  it("varianta 2 poarta 'varianta 2' pe document si in numele fisierului", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    await construieste(agent, id, citesteEtalon("E01"));
    const { body } = await agent.post(`/api/oferte/${id}/varianta`).expect(201);
    const { text, document: d } = await document(agent, body.oferta.id, "OFERTA");
    expect(text).toMatch(/\/ \d{2}\.\d{2}\.\d{4} · varianta 2/);
    expect(d.nume).toMatch(/-v2-oferta-/);
    expect(d.versiune).toBe(2);
  }, 120_000);

  it("colaboratorul: PDF-ul ofertei lui da, tabelul de facturare nu; alt agent nu vede; lista si 'transmis' in istoric", async () => {
    const colab = await autentificaAgent(app, EMAIL.colab);
    const agent2 = await autentificaAgent(app, EMAIL.agent2);
    const admin = await autentificaAgent(app, EMAIL.admin1);
    const id = await ofertaNoua(colab);
    await construieste(colab, id, citesteEtalon("E01"));
    const r = await colab.post(`/api/oferte/${id}/documente`).send({ tip: "TABEL_FACTURARE" });
    expect(r.status).toBe(403);
    await colab.post(`/api/oferte/${id}/documente`).send({ tip: "OFERTA" }).expect(201);
    await agent2.post(`/api/oferte/${id}/documente`).send({ tip: "OFERTA" }).expect(404);
    await admin.post(`/api/oferte/${id}/documente`).send({ tip: "TABEL_FACTURARE" }).expect(201);
    const listaColab = await colab.get(`/api/oferte/${id}/documente`).expect(200);
    expect(listaColab.body.documente.map((d: { tip: string }) => d.tip)).toEqual(["OFERTA"]);
    expect(listaColab.body.tipuriPermise).toEqual(["OFERTA", "REZUMAT", "DETALIATA"]);
    const listaAdmin = await admin.get(`/api/oferte/${id}/documente`).expect(200);
    expect(listaAdmin.body.documente).toHaveLength(2);
    expect(listaAdmin.body.documente[0]).toMatchObject({ tip: "TABEL_FACTURARE", eticheta: "Tabel de facturare", generatDe: "Test ADMINISTRATOR", transmisLa: null });
    // marcheaza ca transmis: dupa "Transmisa", intra in istoric
    const doc = listaColab.body.documente[0];
    await colab.put(`/api/oferte/${id}/status`).send({ status: "TRANSMISA" }).expect(200);
    const t = await colab.put(`/api/oferte/${id}/documente/${doc.id}/transmis`).send({ canal: "WHATSAPP", mentiuni: "trimis clientului" }).expect(200);
    expect(t.body.document).toMatchObject({ canal: "WHATSAPP" });
    expect(t.body.document.transmisLa).toBeTruthy();
    const ist = await colab.get(`/api/oferte/${id}/istoric`).expect(200);
    const intrare = ist.body.intrari.find((i: { tip: string }) => i.tip === "document");
    expect(intrare.valoareDupa).toMatch(/^Deviz ofertă transmis pe WhatsApp — DCC-\d{4}-oferta-/);
    expect(intrare.mentiuni).toBe("trimis clientului");
    expect((await colab.get(`/api/oferte/${id}`).expect(200)).body.oferta.numaratori.documente).toBe(2); // si tabelul Administratorului e document al ofertei
  }, 180_000);
});
