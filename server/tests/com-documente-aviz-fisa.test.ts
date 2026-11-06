import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { env } from "../src/env.js";
import { incarcaOptiuniListe } from "../src/modules/adm/optiuniListe.js";
import { htmlAvizPentru } from "../src/modules/com/avize.js";
import { asiguraCatalogBilka } from "./catalogTest.js";
import { citesteEtalon } from "./etalon/incarcaEtalon.js";
import { corpDinEtalon, preturiDinEtalon, puneCursulEtalonului } from "./etalonApi.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

// S23: avizul de insotire a marfii (FISA-COMENZI cap. 9) si fisa soferului (cap. 4c), pe textul
// extras din PDF. E01 are doua invelitori cu panotaj: 4,20 x 15 + 3,10 x 20 + 2,75 x 8 + 1,19 x 5
// (latime 1,18) si 2,50 x 2 (latime 1,20) = 50 de coli; 13 coame mici pe linia ACMICMAT050.

const app = creeazaApp();
const S = "-av@exemplu.local";
const EMAIL = { adminGeneral: `admin-general${S}`, admin1: `admin1${S}`, agent1: `agent1${S}`, admin2: `admin2${S}`, gestiune: `gestiune${S}`, gestiune2: `gestiune2${S}`, contabil: `contabil${S}`, colab: `colab${S}` };
let firma1: string;

function dataLocala(delta = 0): string {
  const d = new Date(Date.now() + delta * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

beforeAll(async () => {
  const adminGeneral = await creeazaUtilizatorTest(EMAIL.adminGeneral, "ADMIN_GENERAL");
  await asiguraCatalogBilka(adminGeneral);
  await incarcaOptiuniListe(prisma);
  firma1 = (await prisma.firma.create({ data: { denumire: "Firma Aviz 1", cui: "RO95", nrRegCom: "J95", adresa: "Str. Depozitului 1", localitate: "Focșani", telefon: "1", email: `f1${S}` } })).id;
  const firma2 = (await prisma.firma.create({ data: { denumire: "Firma Aviz 2", cui: "RO96", nrRegCom: "J96", adresa: "B", telefon: "2", email: `f2${S}` } })).id;
  const admin1 = await creeazaUtilizatorTest(EMAIL.admin1, "ADMINISTRATOR", { firmaId: firma1, serieOferta: "AVA", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.agent1, "AGENT", { firmaId: firma1, administratorId: admin1.id, serieOferta: "AVG", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.colab, "COLABORATOR", { firmaId: firma1, administratorId: admin1.id, serieOferta: "AVC", adaosProcent: 5 });
  await creeazaUtilizatorTest(EMAIL.admin2, "ADMINISTRATOR", { firmaId: firma2, serieOferta: "AVB", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.gestiune, "GESTIUNE", { accesGeneralFirme: true, nume: "Maria P.", telefon: "0755 000 444" });
  await creeazaUtilizatorTest(EMAIL.gestiune2, "GESTIUNE", { accesGeneralFirme: true });
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
const CLIENT = { nume: "Popescu Andrei", telefon: "0722000111", adresa: "Str. Florilor nr. 12", localitate: "Câmpineanca" };

async function comanda(agent: Agent, etalon: string, client = CLIENT): Promise<{ ofertaId: string; comandaId: string; numarComplet: string }> {
  const { body } = await agent.post("/api/oferte").send({ client }).expect(201);
  const id = body.oferta.id as string;
  const e = citesteEtalon(etalon);
  const rp = await agent.put(`/api/oferte/${id}/produse`).send(await corpDinEtalon(e));
  expect(rp.status, JSON.stringify(rp.body)).toBe(200);
  await puneCursulEtalonului(id, e);
  const r = await agent.put(`/api/oferte/${id}/preturi`).send(preturiDinEtalon(e, rp.body.oferta.linii));
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  if (etalon === "E01") await agent.put(`/api/oferte/${id}/montator`).send({ montatorNou: { nume: "Gheorghe V.", telefon: "0733 000 222", tip: "MONTATOR" }, comisionRecomandareLei: "500" }).expect(200);
  await agent.put(`/api/oferte/${id}/status`).send({ status: "TRANSMISA" }).expect(200);
  await agent.put(`/api/oferte/${id}/status`).send({ status: "DE_COMANDAT" }).expect(200);
  const c = await agent.put(`/api/oferte/${id}/status`).send({ status: "COMANDAT" });
  expect(c.status, JSON.stringify(c.body)).toBe(200);
  const cmd = await prisma.comanda.findUniqueOrThrow({ where: { ofertaId: id } });
  return { ofertaId: id, comandaId: cmd.id, numarComplet: `${cmd.serie}-${String(cmd.numar).padStart(4, "0")}` };
}

const textPdf = async (fisier: string) => (await new PDFParse({ data: new Uint8Array(await readFile(path.join(env.dateDir, fisier))) }).getText()).text;
const textDinBuffer = async (pdf: Buffer) => (await new PDFParse({ data: new Uint8Array(pdf) }).getText()).text;
const aparitii = (text: string, cautat: string) => text.split(cautat).length - 1;
const linia = (l: Rand[], cod: string) => l.find((x) => x.cod === cod)!;

describe("avizul de insotire a marfii (S23, cap. 9)", () => {
  let a: Awaited<ReturnType<typeof comanda>>;
  let b: Awaited<ReturnType<typeof comanda>>;

  beforeAll(async () => {
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    a = await comanda(agent1, "E01");
    b = await comanda(agent1, "E01", { ...CLIENT, nume: "Ionescu Vasile", telefon: "0722000222" });
  }, 300_000);

  it("E01: cantitatile propuse = tot ce e comandat; avizul complet cu ambele exemplare, fara valori, casute pe rand si pe lungime, totalul in cuvinte", async () => {
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const s = await gestiune.get(`/api/comenzi/${a.comandaId}/aviz`).expect(200);
    expect(s.body.poateGenera).toBe(true);
    expect(s.body.avize).toEqual([]);
    const linii = s.body.linii as Rand[];
    expect(linii.length).toBeGreaterThan(5);
    expect(linia(linii, "ACMICMAT050")).toMatchObject({ cantitateComandata: "13", livrata: "0.000", propusa: "13.000", panotaj: null });
    const invelitori = linii.filter((l) => l.panotaj);
    expect(invelitori).toHaveLength(2);
    const lungimi = invelitori.flatMap((l) => l.panotaj as Rand[]);
    expect(lungimi).toHaveLength(5);
    expect(lungimi.reduce((t, p) => t + p.propuse, 0)).toBe(50);
    expect(invelitori[0].propusa).toBeNull();

    const r = await gestiune.post(`/api/comenzi/${a.comandaId}/aviz`).send({ dataLivrarii: "2026-11-10" });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    expect(r.body.aviz).toMatchObject({ numar: 1, dataLivrarii: "2026-11-10", partial: false, coli: 50, generatDe: "Maria P." });
    expect(r.body.aviz.documentId).toBeTruthy();
    // liniile avizului: fiecare produs + fiecare lungime
    const randuri = r.body.aviz.linii as Rand[];
    expect(randuri.filter((l) => l.pozitieId)).toHaveLength(5);
    expect(randuri.filter((l) => !l.pozitieId)).toHaveLength(linii.length);
    expect(randuri.find((l) => l.cod === "ACMICMAT050")).toMatchObject({ cantitate: "13.000", um: "buc" });
    // mp-ul invelitorii de pe aviz = cel comandat (R8, o singura rotunjire)
    expect(randuri.find((l) => l.linieId === invelitori[0].linieId && !l.pozitieId)!.cantitate).toBe(Number(invelitori[0].cantitateComandata).toFixed(3));

    // HTML-ul: o casuta pe fiecare rand si pe fiecare lungime, in fiecare exemplar
    const { html } = await htmlAvizPentru(r.body.aviz.id);
    expect(aparitii(html, 'class="cb"')).toBe(2 * (linii.length + 5));
    expect(aparitii(html, "AVIZ DE ÎNSOȚIRE A MĂRFII")).toBe(2);
    const corp = html.replace(/<style>[\s\S]*?<\/style>/g, "");
    expect(corp).not.toContain("€");
    expect(corp).not.toMatch(/Pre[țt] unitar|Valoare|Total în lei|TVA/);

    // PDF-ul: document al comenzii, in "Doc.", cu textul asteptat
    const d = await prisma.ofertaDocument.findUniqueOrThrow({ where: { id: r.body.aviz.documentId } });
    expect(d).toMatchObject({ tip: "AVIZ", ofertaId: a.ofertaId });
    expect(d.nume).toContain(`${a.numarComplet}-aviz-1-2026-11-10`);
    expect(d.pagini).toBeGreaterThanOrEqual(2);
    const text = await textPdf(d.fisier);
    expect(aparitii(text, "AVIZ DE ÎNSOȚIRE A MĂRFII")).toBe(2);
    expect(text).toContain("Exemplarul 1 din 2 — furnizor · livrare din 10.11.2026 · cantități fără valori");
    expect(text).toContain("Exemplarul 2 din 2 — client · livrare din 10.11.2026");
    expect(text).not.toContain("livrare parțială");
    expect(text).toContain(`Comanda ${a.numarComplet}`);
    expect(text).toContain("Popescu Andrei");
    expect(text).toContain("50 coli de învelitoare");
    expect(text).toMatch(/\d+ piese accesorii standard/);
    expect(text).toContain("PANOTAJ — LUNGIME COALĂ × BUCĂȚI"); // capul de panotaj e cu majuscule din CSS
    expect(text).toContain("4,20 m × 15 buc");
    expect(text).toContain("AM RECEPȚIONAT MARFA"); // etichetele casetelor de semnaturi sunt cu majuscule din CSS
    expect(text).toContain("PREDAT");
    expect(text).toContain("Semnătura:");
    expect(text).not.toContain("€");
    expect(text).not.toContain("lei");
    expect(text).not.toMatch(/Pre[țt] unitar/);
    expect(aparitii(text, "Coamă mică")).toBe(2);

    const detaliu = (await gestiune.get(`/api/comenzi/${a.comandaId}`).expect(200)).body.comanda as Rand;
    expect(detaliu.avize).toHaveLength(1);
    expect(detaliu.documente.filter((x: Rand) => x.tip === "AVIZ")).toHaveLength(1);
    expect(detaliu.documente.find((x: Rand) => x.tip === "AVIZ").eticheta).toBe("Aviz de însoțire a mărfii");
    expect(detaliu.istoric.filter((i: Rand) => i.tip === "aviz").map((i: Rand) => i.valoareDupa)).toEqual([expect.stringContaining("aviz 1: livrare din 10.11.2026 — 50 coli")]);
    // statusul logistic nu se schimba
    expect(detaliu.statusLogistic).toBe("COMANDAT");
    await gestiune.get(`/api/comenzi/${a.comandaId}/documente/${d.id}`).expect(200).expect("Content-Type", /pdf/);

    // dupa aviz, restul de livrat e zero
    const dupa = (await gestiune.get(`/api/comenzi/${a.comandaId}/aviz`).expect(200)).body;
    expect(linia(dupa.linii, "ACMICMAT050")).toMatchObject({ livrata: "13.000", propusa: "0.000" });
    expect((dupa.linii as Rand[]).filter((l) => l.panotaj).flatMap((l) => l.panotaj as Rand[]).every((p) => p.propuse === 0)).toBe(true);
  }, 120_000);

  it("livrarea partiala: cantitati ajustate, 'livrare partiala', al doilea aviz propune restul; limita = cantitatea comandata", async () => {
    const contabil = await autentificaAgent(app, EMAIL.contabil);
    const s = (await contabil.get(`/api/comenzi/${b.comandaId}/aviz`).expect(200)).body;
    const coama = linia(s.linii, "ACMICMAT050").linieId as string;
    const inv = (s.linii as Rand[]).filter((l) => l.panotaj);
    const p420 = (inv[0].panotaj as Rand[]).find((p) => p.lungimeM === "4.2")!;
    expect(p420).toMatchObject({ bucati: 15, livrate: 0, propuse: 15 });
    // peste comandat -> 400 cu motive
    const prea = await contabil.post(`/api/comenzi/${b.comandaId}/aviz`).send({ dataLivrarii: "2026-11-12", linii: [{ linieId: coama, cantitate: "14" }], pozitii: [{ pozitieId: p420.pozitieId, bucati: 16 }] });
    expect(prea.status).toBe(400);
    expect(prea.body.motive).toHaveLength(2);
    // nimic de livrat -> 400
    await contabil.post(`/api/comenzi/${b.comandaId}/aviz`).send({ dataLivrarii: "2026-11-12", linii: [{ linieId: coama, cantitate: "0" }] }).expect(400);

    // prima livrare: 10 coli de 4,20 si 5 coame
    const r1 = await contabil.post(`/api/comenzi/${b.comandaId}/aviz`).send({ dataLivrarii: "2026-11-12", linii: [{ linieId: coama, cantitate: "5" }], pozitii: [{ pozitieId: p420.pozitieId, bucati: 10 }] });
    expect(r1.status, JSON.stringify(r1.body)).toBe(201);
    expect(r1.body.aviz).toMatchObject({ numar: 1, partial: true, coli: 10, piese: "5.000" });
    const randuri1 = r1.body.aviz.linii as Rand[];
    expect(randuri1).toHaveLength(3); // invelitoarea, lungimea ei, coama
    // mp = 4,20 x 10 x 1,18 = 49,560
    expect(randuri1.find((l) => l.pozitieId)).toMatchObject({ cantitate: "49.560", bucati: 10, lungimeM: "4.20" });
    expect(randuri1.find((l) => !l.pozitieId && l.linieId !== coama)!.cantitate).toBe("49.560");
    const t1 = await textPdf((await prisma.ofertaDocument.findUniqueOrThrow({ where: { id: r1.body.aviz.documentId } })).fisier);
    expect(t1).toContain("livrare din 12.11.2026 · cantități fără valori · livrare parțială");
    expect(t1).toContain("10 coli de învelitoare (49,560 mp) · 5 piese accesorii standard");
    expect(t1).toContain("4,20 m × 10 buc");
    expect(t1).not.toContain("3,10 m ×");
    expect(t1).not.toContain("Opritor");
    const { html } = await htmlAvizPentru(r1.body.aviz.id);
    expect(aparitii(html, 'class="cb"')).toBe(2 * (2 + 1));

    // restul propus: 8 coame, 5 coli de 4,20, restul intact
    const s2 = (await contabil.get(`/api/comenzi/${b.comandaId}/aviz`).expect(200)).body;
    expect(linia(s2.linii, "ACMICMAT050")).toMatchObject({ livrata: "5.000", propusa: "8.000" });
    expect(((s2.linii as Rand[]).filter((l) => l.panotaj)[0].panotaj as Rand[]).find((p) => p.lungimeM === "4.2")).toMatchObject({ livrate: 10, propuse: 5 });
    expect(s2.avize).toHaveLength(1);

    // a doua livrare, cu restul propus
    const r2 = await contabil.post(`/api/comenzi/${b.comandaId}/aviz`).send({ dataLivrarii: "2026-11-15" });
    expect(r2.status, JSON.stringify(r2.body)).toBe(201);
    expect(r2.body.aviz).toMatchObject({ numar: 2, partial: true, coli: 40 });
    expect((r2.body.aviz.linii as Rand[]).find((l) => l.cod === "ACMICMAT050")!.cantitate).toBe("8.000");
    const t2 = await textPdf((await prisma.ofertaDocument.findUniqueOrThrow({ where: { id: r2.body.aviz.documentId } })).fisier);
    expect(t2).toContain("livrare din 15.11.2026");
    expect(t2).toContain("40 coli de învelitoare");
    expect(t2).toContain("4,20 m × 5 buc");
    expect(t2).toContain("3,10 m × 20 buc");
    // amandoua avizele raman, in "Doc." si pe comanda, cu date diferite
    const detaliu = (await contabil.get(`/api/comenzi/${b.comandaId}`).expect(200)).body.comanda as Rand;
    expect(detaliu.avize.map((x: Rand) => `${x.numar}:${x.dataLivrarii}:${x.partial}`)).toEqual(["1:2026-11-12:true", "2:2026-11-15:true"]);
    expect(detaliu.documente.filter((x: Rand) => x.tip === "AVIZ")).toHaveLength(2);
    expect(await prisma.comandaAviz.count({ where: { comandaId: b.comandaId } })).toBe(2);
  }, 120_000);

  it("drepturile: agentul, Contabilitatea, Gestiunea, Administratorii si Admin general genereaza; colaboratorul nu genereaza si nu vede avizul; comanda manuala 409; detaliata / tabelul de facturare din comanda", async () => {
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    const colab = await autentificaAgent(app, EMAIL.colab);
    const admin2 = await autentificaAgent(app, EMAIL.admin2);
    const adminGeneral = await autentificaAgent(app, EMAIL.adminGeneral);
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const coamaA = linia((await agent1.get(`/api/comenzi/${a.comandaId}/aviz`)).body.linii, "ACMICMAT050").linieId as string;
    expect((await agent1.post(`/api/comenzi/${a.comandaId}/aviz`).send({ dataLivrarii: "2026-11-11", linii: [{ linieId: coamaA, cantitate: "1" }] })).status).toBe(201);
    expect((await admin2.post(`/api/comenzi/${a.comandaId}/aviz`).send({ dataLivrarii: "2026-11-11" })).status).toBe(400); // vede comanda, dar nu mai e nimic de livrat
    expect((await adminGeneral.get(`/api/comenzi/${a.comandaId}/aviz`)).body.poateGenera).toBe(true);
    await colab.post(`/api/comenzi/${a.comandaId}/aviz`).send({ dataLivrarii: "2026-11-11" }).expect(404); // nu e comanda lui
    const dA = (await agent1.get(`/api/comenzi/${a.comandaId}`).expect(200)).body.comanda as Rand;
    expect(dA.drepturi).toMatchObject({ aviz: true, documente: true, fisaSoferului: false, locatie: true });
    expect((await (await autentificaAgent(app, EMAIL.contabil)).get(`/api/comenzi/${a.comandaId}`).expect(200)).body.comanda.drepturi).toMatchObject({ aviz: true, documente: true, fisaSoferului: false, locatie: false });
    expect((await gestiune.get(`/api/comenzi/${a.comandaId}`).expect(200)).body.comanda.drepturi).toMatchObject({ aviz: true, documente: true, fisaSoferului: true, locatie: true });

    // comanda colaboratorului: Gestiunea genereaza avizul, colaboratorul nu-l vede si nu-l genereaza
    const c = await comanda(colab, "E01", { ...CLIENT, nume: "Client Colab", telefon: "0722000333" });
    await colab.post(`/api/comenzi/${c.comandaId}/aviz`).send({ dataLivrarii: "2026-11-11" }).expect(403);
    expect((await colab.get(`/api/comenzi/${c.comandaId}/aviz`).expect(200)).body.poateGenera).toBe(false);
    const rg = await gestiune.post(`/api/comenzi/${c.comandaId}/aviz`).send({ dataLivrarii: "2026-11-11" });
    expect(rg.status, JSON.stringify(rg.body)).toBe(201);
    const dC = (await colab.get(`/api/comenzi/${c.comandaId}`).expect(200)).body.comanda as Rand;
    expect(dC.drepturi).toMatchObject({ aviz: false, documente: false, fisaSoferului: false, locatie: true });
    expect(dC.documente.filter((x: Rand) => x.tip === "AVIZ")).toHaveLength(0);
    await colab.get(`/api/comenzi/${c.comandaId}/documente/${rg.body.aviz.documentId}`).expect(404);
    await gestiune.get(`/api/comenzi/${c.comandaId}/documente/${rg.body.aviz.documentId}`).expect(200);
    // si pe oferta lui, colaboratorul nu vede avizul (CONTURI §2)
    const docsOferta = (await colab.get(`/api/oferte/${c.ofertaId}/documente`).expect(200)).body.documente as Rand[];
    expect(docsOferta.filter((x) => x.tip === "AVIZ")).toHaveLength(0);

    // comanda manuala: fara linii -> 409
    const m = await gestiune.post("/api/comenzi").send({ firmaId: firma1, client: { nume: "Manual Aviz", telefon: "0730000799", localitate: "Panciu" }, rezumat: "accesorii 8019", totalLei: "500" }).expect(201);
    await gestiune.post(`/api/comenzi/${m.body.comanda.id}/aviz`).send({ dataLivrarii: "2026-11-11" }).expect(409);
    expect((await gestiune.get(`/api/comenzi/${m.body.comanda.id}/aviz`).expect(200)).body).toMatchObject({ manuala: true, poateGenera: false, linii: [] });

    // detaliata si tabelul de facturare generate din comanda (cap. 6): Gestiunea da, colaboratorul nu, manuala 409
    const tf = await gestiune.post(`/api/comenzi/${a.comandaId}/documente`).send({ tip: "TABEL_FACTURARE" });
    expect(tf.status, JSON.stringify(tf.body)).toBe(201);
    expect(tf.body.document).toMatchObject({ tip: "TABEL_FACTURARE", eticheta: "Tabel de facturare" });
    await gestiune.get(`/api/comenzi/${a.comandaId}/documente/${tf.body.document.id}`).expect(200);
    expect((await gestiune.post(`/api/comenzi/${a.comandaId}/documente`).send({ tip: "DETALIATA" })).status).toBe(201);
    await gestiune.post(`/api/comenzi/${a.comandaId}/documente`).send({ tip: "OFERTA" }).expect(400);
    await colab.post(`/api/comenzi/${c.comandaId}/documente`).send({ tip: "TABEL_FACTURARE" }).expect(403);
    await gestiune.post(`/api/comenzi/${m.body.comanda.id}/documente`).send({ tip: "TABEL_FACTURARE" }).expect(409);
  }, 180_000);
});

describe("fisa soferului (S23, cap. 4c)", () => {
  let a: Awaited<ReturnType<typeof comanda>>;
  let manualaId: string;

  beforeAll(async () => {
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    a = await comanda(agent1, "E01", { ...CLIENT, nume: "Fisa Popescu", telefon: "0722000444" });
    await agent1.put(`/api/comenzi/${a.comandaId}/livrare`).send({ indicatii: "marți după 14:00; sună înainte", dataLivrarii: "2026-11-17" }).expect(200);
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const m = await gestiune.post("/api/comenzi").send({ firmaId: firma1, client: { nume: "Asociația Cercul Unirea", telefon: "0744 000 333", localitate: "Câmpineanca", adresa: "Str. Mărului nr. 7" }, rezumat: "accesorii tinichigerie 8019 Grande Mat 0,5 (fără învelitoare)", totalLei: "862.13", montator: { nume: "Gheorghe V.", telefon: "0733 000 222" }, indicatiiLivrare: "jgheaburile rămân pe paleți" }).expect(201);
    manualaId = m.body.comanda.id;
  }, 300_000);

  it("linkul la locatie: doar http / https, cu istoric; cine modifica detaliile", async () => {
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    await gestiune.put(`/api/comenzi/${manualaId}/locatie`).send({ url: "maps.app.goo.gl/exemplu2" }).expect(400);
    const r = await gestiune.put(`/api/comenzi/${manualaId}/locatie`).send({ url: "https://maps.app.goo.gl/exemplu2" }).expect(200);
    expect(r.body.comanda.locatieUrl).toBe("https://maps.app.goo.gl/exemplu2");
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    expect((await agent1.put(`/api/comenzi/${a.comandaId}/locatie`).send({ url: "https://maps.app.goo.gl/exemplu1" }).expect(200)).body.comanda.locatieUrl).toBe("https://maps.app.goo.gl/exemplu1");
    await (await autentificaAgent(app, EMAIL.contabil)).put(`/api/comenzi/${a.comandaId}/locatie`).send({ url: null }).expect(403);
    await (await autentificaAgent(app, EMAIL.colab)).put(`/api/comenzi/${a.comandaId}/locatie`).send({ url: null }).expect(404);
    const istoric = await prisma.comandaIstoric.findMany({ where: { comandaId: manualaId, tip: "locatie" } });
    expect(istoric.map((i) => i.valoareDupa)).toEqual(["https://maps.app.goo.gl/exemplu2"]);
  });

  it("fisa pentru doua comenzi: ordinea traseului, telefoanele apelabile, restul de incasat, linkul la locatie, nereținută", async () => {
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const documenteInainte = await prisma.ofertaDocument.count();
    const istoricInainte = await prisma.comandaIstoric.count();
    const f = await gestiune.post("/api/comenzi/fisa-soferului").send({ comenzi: [a.comandaId, manualaId], masina: "Iveco VN 12 ABC", data: "2026-11-17" });
    expect(f.status, JSON.stringify(f.body)).toBe(200);
    const fisa = f.body.fisa as Rand;
    expect(fisa).toMatchObject({ data: "2026-11-17", dataText: "marți, 17.11.2026", masina: "Iveco VN 12 ABC", livrari: 2, gestiune: { nume: "Maria P.", telefon: "0755 000 444" }, avertizari: [] });
    expect(fisa.firma.denumire).toBe("Firma Aviz 1");
    expect(fisa.blocuri.map((b: Rand) => b.client.nume)).toEqual(["Fisa Popescu", "Asociația Cercul Unirea"]);
    const b1 = fisa.blocuri[0] as Rand;
    expect(b1).toMatchObject({ numarComplet: a.numarComplet, manuala: false, adresa: "Str. Florilor nr. 12, Câmpineanca", locatieUrl: "https://maps.app.goo.gl/exemplu1", livrare: { indicatii: "marți după 14:00; sună înainte", data: "2026-11-17" }, montator: { nume: "Gheorghe V.", telefon: "0733 000 222" }, restLei: "17000.00" });
    expect(b1.coli).toContain("48 coli (4,20 × 15 · 3,10 × 20 · 2,75 × 8 · 1,19 × 5); 2 coli (2,50 × 2)");
    expect(b1.categorii.some((c: string) => /^accesorii standard \d+ buc$/.test(c))).toBe(true);
    expect(b1.avize).toEqual([]);
    const b2 = fisa.blocuri[1] as Rand;
    expect(b2).toMatchObject({ manuala: true, adresa: "Str. Mărului nr. 7, Câmpineanca", locatieUrl: "https://maps.app.goo.gl/exemplu2", coli: null, categorii: [], restLei: "862.13", montator: { nume: "Gheorghe V.", telefon: "0733 000 222" } });
    // ordinea inversa = ordinea ceruta
    const f2 = (await gestiune.post("/api/comenzi/fisa-soferului").send({ comenzi: [manualaId, a.comandaId] }).expect(200)).body.fisa as Rand;
    expect(f2.blocuri.map((b: Rand) => b.client.nume)).toEqual(["Asociația Cercul Unirea", "Fisa Popescu"]);
    expect(f2.data).toBe(dataLocala(0));

    // PDF-ul: textul in ordinea traseului, telefoanele ca legaturi tel: si ca text, locatia, restul mare
    const p = await gestiune.post("/api/comenzi/fisa-soferului/pdf").send({ comenzi: [a.comandaId, manualaId], masina: "Iveco VN 12 ABC", data: "2026-11-17" }).buffer(true).parse((res, cb) => {
      const parti: Buffer[] = [];
      res.on("data", (d: Buffer) => parti.push(d));
      res.on("end", () => cb(null, Buffer.concat(parti)));
    });
    expect(p.status).toBe(200);
    expect(p.headers["content-type"]).toMatch(/pdf/);
    expect(p.headers["content-disposition"]).toContain("inline");
    const pdf = p.body as Buffer;
    const brut = pdf.toString("latin1");
    expect(brut).toContain("tel:0722000444");
    expect(brut).toContain("tel:0744000333");
    expect(brut).toContain("tel:0733000222");
    expect(brut).toContain("tel:0755000444");
    expect(brut).toContain("https://maps.app.goo.gl/exemplu2");
    const text = await textDinBuffer(pdf);
    expect(text).toContain("FIȘA ȘOFERULUI");
    expect(text).toContain("marți, 17.11.2026 · 2 livrări · Iveco VN 12 ABC");
    expect(text).toContain("Gestiune: Maria P.");
    expect(text).toContain("0755 000 444");
    expect(text.indexOf("Fisa Popescu")).toBeLessThan(text.indexOf("Asociația Cercul Unirea"));
    expect(text).toContain("0722000444");
    expect(text).toContain("17.000,00 lei");
    expect(text).toContain("862,13 lei");
    expect(text).toContain("locația pe hartă");
    expect(text).toContain("marfă");
    expect(text).toContain("aviz semnat");
    expect(text).toContain("48 coli (4,20 × 15");
    expect(text).toContain("La întoarcere:");
    // descarcare pentru WhatsApp
    const d = await gestiune.post("/api/comenzi/fisa-soferului/pdf?descarca=da").send({ comenzi: [a.comandaId] }).buffer(true).parse((res, cb) => {
      const parti: Buffer[] = [];
      res.on("data", (x: Buffer) => parti.push(x));
      res.on("end", () => cb(null, Buffer.concat(parti)));
    });
    expect(d.headers["content-disposition"]).toContain("attachment");
    // nereținută: nimic in baza, nimic in istoric
    expect(await prisma.ofertaDocument.count()).toBe(documenteInainte);
    expect(await prisma.comandaIstoric.count()).toBe(istoricInainte);

    // avizul generat din fisa apare in "Documente anexate"
    await gestiune.post(`/api/comenzi/${a.comandaId}/aviz`).send({ dataLivrarii: "2026-11-17" }).expect(201);
    const f3 = (await gestiune.post("/api/comenzi/fisa-soferului").send({ comenzi: [a.comandaId] }).expect(200)).body.fisa as Rand;
    expect(f3.blocuri[0].avize).toEqual([expect.objectContaining({ numar: 1, dataLivrarii: "2026-11-17", partial: false })]);
  }, 120_000);

  it("drepturile fisei: Gestiunea, Administratorii, Admin general; Contabilitatea, agentul si colaboratorul nu; fara telefon in cont - avertizare; comanda invizibila 404", async () => {
    const corp = { comenzi: [a.comandaId] };
    await (await autentificaAgent(app, EMAIL.contabil)).post("/api/comenzi/fisa-soferului").send(corp).expect(403);
    await (await autentificaAgent(app, EMAIL.agent1)).post("/api/comenzi/fisa-soferului").send(corp).expect(403);
    await (await autentificaAgent(app, EMAIL.colab)).post("/api/comenzi/fisa-soferului/pdf").send(corp).expect(403);
    expect((await (await autentificaAgent(app, EMAIL.admin1)).post("/api/comenzi/fisa-soferului").send(corp).expect(200)).body.fisa.livrari).toBe(1);
    expect((await (await autentificaAgent(app, EMAIL.admin2)).post("/api/comenzi/fisa-soferului").send(corp).expect(200)).body.fisa.livrari).toBe(1);
    expect((await (await autentificaAgent(app, EMAIL.adminGeneral)).post("/api/comenzi/fisa-soferului").send(corp).expect(200)).body.fisa.livrari).toBe(1);
    const g2 = (await (await autentificaAgent(app, EMAIL.gestiune2)).post("/api/comenzi/fisa-soferului").send(corp).expect(200)).body.fisa as Rand;
    expect(g2.gestiune.telefon).toBeNull();
    expect(g2.avertizari).toHaveLength(1);
    await (await autentificaAgent(app, EMAIL.gestiune)).post("/api/comenzi/fisa-soferului").send({ comenzi: [a.comandaId, "nu-exista"] }).expect(404);
    await (await autentificaAgent(app, EMAIL.gestiune)).post("/api/comenzi/fisa-soferului").send({ comenzi: [] }).expect(400);
  });
});
