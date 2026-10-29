import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { incarcaCorespondentaFormularBilka } from "../src/modules/adm/corespondentaFormular.js";
import type { FisierEtalon } from "../src/modules/mot/etalon.js";
import { citesteSablon, type Sablon } from "../src/modules/ofe/formularBilka/sablon.js";
import { citesteIntrari, continutIntrare, dateComprimate } from "../src/modules/ofe/formularBilka/zip.js";
import { asiguraCatalogBilka, produsDupaCod } from "./catalogTest.js";
import { citesteEtalon } from "./etalon/incarcaEtalon.js";
import { corpDinEtalon, preturiDinEtalon, puneCursulEtalonului } from "./etalonApi.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

// S16b: formularele de comanda Bilka - un .xlsm completat per formular (R10), din
// sablonul firmei, cu macro-urile neatinse. Verificate pe XML-ul citit din arhiva
// rezultata (valorile la adresele hartii), pe hash-ul identic al partilor neatinse
// (vbaProject.bin inclusiv), pe avertizarile pentru produsele fara loc, pe firma
// fara sablon si pe permisiuni. Nicio comanda nu pleaca de aici.

const app = creeazaApp();
const S = "-fb@exemplu.local";
const EMAIL = { adminGeneral: `admin-general${S}`, admin1: `admin1${S}`, agent1: `agent1${S}`, colab: `colab${S}`, agent2: `agent2${S}` };
const SABLON = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../docs/Liste/Bilka/2026-09/Formular comanda v10    03.06.2026.XLSM");
let firma1: string;
let firma2: string;

function dataLocala(delta = 0): string {
  const d = new Date(Date.now() + delta * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

beforeAll(async () => {
  const adminGeneral = await creeazaUtilizatorTest(EMAIL.adminGeneral, "ADMIN_GENERAL");
  await asiguraCatalogBilka(adminGeneral);
  await incarcaCorespondentaFormularBilka(prisma);
  firma1 = (await prisma.firma.create({ data: { denumire: "Firma Formular SRL", cui: "RO71", nrRegCom: "J71/1/2026", adresa: "Str. Form 1", localitate: "Focșani", judet: "Vrancea", telefon: "0700000071", email: `f1${S}` } })).id;
  firma2 = (await prisma.firma.create({ data: { denumire: "Firma Fara Sablon SRL", cui: "RO72", nrRegCom: "J72/1/2026", adresa: "Str. Form 2", telefon: "0700000072", email: `f2${S}` } })).id;
  const admin1 = await creeazaUtilizatorTest(EMAIL.admin1, "ADMINISTRATOR", { firmaId: firma1, serieOferta: "FBA", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.agent1, "AGENT", { firmaId: firma1, administratorId: admin1.id, serieOferta: "FBG", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.colab, "COLABORATOR", { firmaId: firma1, administratorId: admin1.id, serieOferta: "FBC", adaosProcent: 5 });
  await creeazaUtilizatorTest(EMAIL.agent2, "AGENT", { firmaId: firma2, serieOferta: "FBX", adaosProcent: 1 });
  for (const d of [dataLocala(0), dataLocala(-1)]) {
    await prisma.cursValutar.upsert({ where: { data_moneda: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR" } }, update: { curs: "5.3485" }, create: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR", curs: "5.3485", sursa: "test" } });
  }
  // sablonul firmei 1, incarcat de Admin general ca din Zona tehnica -> Firme
  const ag = await autentificaAgent(app, EMAIL.adminGeneral);
  const r = await ag.post(`/api/adm/con/firme/${firma1}/sablon-bilka`).attach("sablon", SABLON);
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  expect(r.body.firma.sablonBilkaVersiune).toMatch(/^Formular comanda v10 {4}03\.06\.2026\.XLSM \(modificat 2026-09-10\)$/);
  expect(r.body.firma.sablonBilkaIncarcatDe).toBe("Test ADMIN_GENERAL");
}, 240_000);

afterAll(async () => {
  await prisma.$disconnect();
});

const CLIENT = { nume: "Client Formular", telefon: "0730000301", adresa: "Str. Florilor nr. 12", localitate: "Câmpineanca" };
type Agent = Awaited<ReturnType<typeof autentificaAgent>>;
type Corp = Awaited<ReturnType<typeof corpDinEtalon>>;

async function ofertaNoua(agent: Agent): Promise<string> {
  const { body } = await agent.post("/api/oferte").send({ client: CLIENT }).expect(201);
  return body.oferta.id as string;
}

async function construieste(agent: Agent, id: string, e: FisierEtalon, corp?: Corp) {
  const c = corp ?? (await corpDinEtalon(e));
  const rp = await agent.put(`/api/oferte/${id}/produse`).send(c);
  expect(rp.status, JSON.stringify(rp.body)).toBe(200);
  await puneCursulEtalonului(id, e);
  const r = await agent.put(`/api/oferte/${id}/preturi`).send(preturiDinEtalon(e, rp.body.oferta.linii));
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.oferta as { numarComplet: string };
}

async function deComandat(agent: Agent, id: string) {
  await agent.put(`/api/oferte/${id}/status`).send({ status: "TRANSMISA" }).expect(200);
  await agent.put(`/api/oferte/${id}/status`).send({ status: "DE_COMANDAT" }).expect(200);
}

type DocumentFormular = { id: string; nume: string; formularNr: number; avertizari: string | null; tip: string };

async function descarca(agent: Agent, id: string, did: string): Promise<Buffer> {
  const dl = await agent.get(`/api/oferte/${id}/documente/${did}`).buffer(true).parse((res, cb) => {
    const bucati: Buffer[] = [];
    res.on("data", (b: Buffer) => bucati.push(b));
    res.on("end", () => cb(null, Buffer.concat(bucati)));
  });
  expect(dl.status).toBe(200);
  expect(dl.headers["content-type"]).toMatch(/macroEnabled/);
  expect(dl.headers["content-disposition"]).toMatch(/attachment/);
  return dl.body as Buffer;
}

// genereaza formularele si intoarce fiecare fisier citit ca sablon (celulele la adrese)
async function genereaza(agent: Agent, id: string) {
  const r = await agent.post(`/api/oferte/${id}/formulare-bilka`).send({});
  expect(r.status, JSON.stringify(r.body)).toBe(201);
  const documente = r.body.documente as DocumentFormular[];
  const fisiere: { doc: DocumentFormular; buf: Buffer; s: Sablon }[] = [];
  for (const d of documente) {
    const buf = await descarca(agent, id, d.id);
    fisiere.push({ doc: d, buf, s: citesteSablon(buf) });
  }
  return { fisiere, avertizari: r.body.avertizari as string[] };
}

const v = (s: Sablon, foaie: "comanda" | "pluvial" | "magnelis" | "speciale", adresa: string) => s.celule(s.harta.foaie[foaie]).get(adresa)?.v;
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

// partile neatinse ale arhivei sunt identice octet cu octet cu sablonul; VBA inclusiv
function verificaHash(rezultat: Buffer) {
  const original = citesteSablon(require("node:fs").readFileSync(SABLON));
  const nou = citesteIntrari(rezultat);
  expect(nou.map((e) => e.nume)).toEqual(original.intrari.map((e) => e.nume));
  const modificate = new Set(["xl/workbook.xml", ...Object.values(original.harta.foaie)]);
  let identice = 0;
  for (const e of original.intrari) {
    const n = nou.find((x) => x.nume === e.nume)!;
    // foile scrise pot ramane identice cand n-au nimic de completat (Magnelis la E01);
    // FORMULAR COMANDA si workbook.xml se schimba sigur
    if (modificate.has(e.nume)) {
      if (e.nume === "xl/workbook.xml" || e.nume === original.harta.foaie.comanda) expect(n.crc, e.nume).not.toBe(e.crc);
      continue;
    }
    expect(n.crc, e.nume).toBe(e.crc);
    expect(sha(dateComprimate(rezultat, n)), e.nume).toBe(sha(dateComprimate(original.buf, e)));
    identice++;
  }
  expect(identice).toBe(original.intrari.length - modificate.size);
  const vba = nou.find((x) => x.nume === "xl/vbaProject.bin")!;
  expect(sha(continutIntrare(rezultat, vba))).toBe(sha(continutIntrare(original.buf, original.intrari.find((x) => x.nume === "xl/vbaProject.bin")!)));
  expect(continutIntrare(rezultat, vba).length).toBe(976_896);
  expect(continutIntrare(rezultat, nou.find((x) => x.nume === "xl/workbook.xml")!).toString()).toMatch(/<calcPr[^>]*fullCalcOnLoad="1"/);
}

describe("formularele Bilka (S16b)", () => {
  it("E01 -> 1 formular: antetul, invelitoarea principala cu 4 lungimi, T8 secundara, accesoriile pe randurile lor, pluvialul lucios 3005, arhiva neatinsa in rest", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    const o = await construieste(agent, id, citesteEtalon("E01"));
    await deComandat(agent, id);
    const { fisiere, avertizari } = await genereaza(agent, id);
    expect(avertizari).toEqual([]);
    expect(fisiere).toHaveLength(1);
    const { doc, buf, s } = fisiere[0];
    expect(doc.nume).toBe(`${o.numarComplet}-F1.xlsm`);
    expect(doc.formularNr).toBe(1);
    expect(doc.tip).toBe("FORMULAR_BILKA");
    expect(doc.avertizari).toBeNull();
    verificaHash(buf);
    // antetul: numarul ofertei, localitatea lucrarii, telefonul; mesajul de productie ramane gol
    expect(v(s, "comanda", "F14")).toBe(o.numarComplet);
    expect(v(s, "comanda", "P17")).toBe("Câmpineanca");
    expect(v(s, "comanda", "P18")).toBe("0730000301");
    expect(v(s, "comanda", "F20")).toBeUndefined();
    // invelitoarea principala: Iberic mat 0,50 RAL 3005, modul 35, fara membrana, 4 lungimi x coli
    expect(v(s, "comanda", "H22")).toBe("TIGLA_METALICA");
    expect(v(s, "comanda", "E23")).toBe("IBERIC");
    expect(v(s, "comanda", "O22")).toBe("35 cm");
    expect(v(s, "comanda", "P22")).toBe("FARA MEMBRANA");
    expect(v(s, "comanda", "E24")).toBe("MAT");
    expect(v(s, "comanda", "I24")).toBe("3005");
    expect(v(s, "comanda", "S24")).toBe("0.50");
    expect([v(s, "comanda", "D27"), v(s, "comanda", "E27")]).toEqual(["4.2", "15"]);
    expect([v(s, "comanda", "D28"), v(s, "comanda", "E28")]).toEqual(["3.1", "20"]);
    expect([v(s, "comanda", "D29"), v(s, "comanda", "E29")]).toEqual(["2.75", "8"]);
    expect([v(s, "comanda", "D30"), v(s, "comanda", "E30")]).toEqual(["1.19", "5"]);
    expect(v(s, "comanda", "D31")).toBeUndefined();
    // secundara: T8 perete (fix), mat 0,50 RAL 3005, 2,50 x 2
    expect(v(s, "comanda", "H35")).toBe("TABLA_CUTATA");
    expect(v(s, "comanda", "E36")).toBe("T 8 P");
    expect(v(s, "comanda", "E37")).toBe("MAT");
    expect(v(s, "comanda", "I37")).toBe("3005");
    expect(v(s, "comanda", "S37")).toBe("0.50");
    expect([v(s, "comanda", "D40"), v(s, "comanda", "E40")]).toEqual(["2.5", "2"]);
    // sipca: goala
    expect(v(s, "comanda", "E49")).toBeUndefined();
    expect(v(s, "comanda", "D53")).toBeUndefined();
    // tinichigeria: randul cu numele deja scris, sau un rand din aceeasi familie cu numele rescris
    expect(v(s, "comanda", "F64")).toBe("13"); // COAMA MICA
    expect(v(s, "comanda", "C67")).toBe("BORDURA FRONTON 360 MM");
    expect(v(s, "comanda", "F67")).toBe("17");
    expect(v(s, "comanda", "F68")).toBe("16"); // COLECTOR FRONTON 156 MM
    expect(v(s, "comanda", "F71")).toBe("21"); // BORDURA STREASINA 208 MM
    expect(v(s, "comanda", "C73")).toBe("FIXAREA PLACILOR PE ZID 250 MM");
    expect(v(s, "comanda", "F73")).toBe("7");
    expect(v(s, "comanda", "F74")).toBe("4"); // DOLIE 417 MM
    expect(v(s, "comanda", "F78")).toBe("12"); // OPRITOR ZAPADA 2 ML
    expect(v(s, "comanda", "F80")).toBe("1"); // SET COS FUM
    expect(v(s, "comanda", "F85")).toBe("2"); // ACCESORIU SPECIAL D05
    expect(v(s, "comanda", "F65")).toBeUndefined(); // COAMA MARE, necomandata
    // auxiliarele
    expect(v(s, "comanda", "P64")).toBe("9"); // HOLTS. PT LEMN 250 BUC 4.8*35
    expect(v(s, "comanda", "P65")).toBe("1"); // 4.8*20
    expect(v(s, "comanda", "P71")).toBe("3"); // SPRAY RETUS
    expect(v(s, "comanda", "P74")).toBe("4"); // CAPAC DE COAMA
    expect(v(s, "comanda", "P82")).toBe("3"); // BANDA BITUMINOASA 15CM*10M
    expect(v(s, "comanda", "P86")).toBe("3"); // MASTIC ETANSARE PREMIUM
    expect(v(s, "comanda", "P66")).toBeUndefined();
    // pluvialul lucios: culoarea blocului si cantitatile pe randurile codurilor
    expect(v(s, "pluvial", "D5")).toBe("VISINIU - (781) - RAL 3005");
    expect(v(s, "pluvial", "E7")).toBe("10"); // SPJGH1254ML
    expect(v(s, "pluvial", "E8")).toBeUndefined();
    expect(v(s, "pluvial", "E9")).toBe("1"); // SPJGH1252ML
    expect(v(s, "pluvial", "E10")).toBe("6"); // burlan
    expect(v(s, "pluvial", "E11")).toBe("56"); // carlig 210
    expect(v(s, "pluvial", "E16")).toBe("50"); // brida
    expect(v(s, "pluvial", "E24")).toBe("6"); // prelungitor
    expect(v(s, "pluvial", "D67")).toBeUndefined(); // blocul mat neatins
    expect(v(s, "magnelis", "E7")).toBeUndefined();
    expect(v(s, "speciale", "B21")).toBeUndefined();
    // documentul ramane al ofertei, cu eticheta lui, si intrarea in istoric
    const lista = await agent.get(`/api/oferte/${id}/documente`).expect(200);
    expect(lista.body.documente.map((d: { eticheta: string }) => d.eticheta)).toEqual(["Formular Bilka"]);
    expect(lista.body.tipuriPermise).not.toContain("FORMULAR_BILKA");
    const istoric = await agent.get(`/api/oferte/${id}/istoric`).expect(200);
    expect(JSON.stringify(istoric.body)).toMatch(/Formulare Bilka generate din șablonul „Formular comanda v10/);
    expect(JSON.stringify(istoric.body)).toContain(`${o.numarComplet}-F1.xlsm`);
  }, 120_000);

  it("E11 -> 2 formulare: Clasic 8017 + Retro Plus Standard 7016, fiecare cu pluvialul mat pe locul lui si culoarea blocului", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    const o = await construieste(agent, id, citesteEtalon("E11"));
    await deComandat(agent, id);
    const { fisiere, avertizari } = await genereaza(agent, id);
    expect(avertizari).toEqual([]);
    expect(fisiere.map((f) => f.doc.nume)).toEqual([`${o.numarComplet}-F1.xlsm`, `${o.numarComplet}-F2.xlsm`]);
    const [f1, f2] = fisiere.map((f) => f.s);
    expect(v(f1, "comanda", "E23")).toBe("CLASIC");
    expect(v(f1, "comanda", "I24")).toBe("8017");
    expect(v(f1, "comanda", "E36")).toBeUndefined(); // Retro are pachet separat: nu e secundara aici
    expect(v(f1, "comanda", "F64")).toBe("12");
    expect(v(f1, "comanda", "P64")).toBe("8");
    expect(v(f1, "pluvial", "D67")).toBe("RAL 8017 MAT");
    expect(v(f1, "pluvial", "E69")).toBe("11"); // SMJGH1254ML
    expect(v(f1, "pluvial", "E72")).toBe("7"); // SMBUR0903ML
    expect(v(f1, "pluvial", "D5")).toBeUndefined();
    expect(v(f2, "comanda", "H22")).toBe("INVELITORI_PLATE");
    expect(v(f2, "comanda", "E23")).toBe("RETRO PLUS STANDARD");
    expect(v(f2, "comanda", "I24")).toBe("7016");
    expect(v(f2, "comanda", "P22")).toBe("FARA MEMBRANA");
    expect([v(f2, "comanda", "D27"), v(f2, "comanda", "E27")]).toEqual(["5.1", "11"]);
    expect(v(f2, "comanda", "C66")).toBe("COAMA RETRO 417MM");
    expect(v(f2, "comanda", "F66")).toBe("4");
    expect(v(f2, "comanda", "C71")).toBe("BORD. STREASINA RETRO 312MM");
    expect(v(f2, "comanda", "F71")).toBe("6");
    expect(v(f2, "comanda", "P64")).toBe("2");
    expect(v(f2, "pluvial", "D67")).toBe("RAL 7016 MAT");
    expect(v(f2, "pluvial", "E69")).toBe("3");
    expect(v(f2, "pluvial", "E70")).toBeUndefined();
    verificaHash(fisiere[1].buf);
  }, 120_000);

  it("E12 -> 2 formulare cu blocurile de sipca: Oslo drept (calcul) pe primul, Haga rotunda (comanda) pe al doilea", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    await construieste(agent, id, citesteEtalon("E12"));
    await deComandat(agent, id);
    const { fisiere, avertizari } = await genereaza(agent, id);
    expect(avertizari).toEqual([]);
    expect(fisiere).toHaveLength(2);
    const [f1, f2] = fisiere.map((f) => f.s);
    expect(v(f1, "comanda", "E23")).toBe("CLASIC");
    expect(v(f1, "comanda", "I24")).toBe("8017");
    expect(v(f1, "comanda", "E49")).toBe("OSLO DREPT");
    expect(v(f1, "comanda", "E50")).toBe("MAT");
    expect(v(f1, "comanda", "I50")).toBe("7016");
    expect(v(f1, "comanda", "S50")).toBe("0.50");
    expect([v(f1, "comanda", "D53"), v(f1, "comanda", "E53")]).toEqual(["1.5", "114"]);
    expect([v(f1, "comanda", "D54"), v(f1, "comanda", "E54")]).toEqual(["1.5", "30"]);
    expect(v(f1, "comanda", "D55")).toBeUndefined();
    expect(v(f2, "comanda", "I24")).toBe("7016");
    expect(v(f2, "comanda", "E49")).toBe("HAGA ROTUNDA");
    expect(v(f2, "comanda", "I50")).toBe("8017");
    expect([v(f2, "comanda", "D53"), v(f2, "comanda", "E53")]).toEqual(["1.2", "60"]);
    expect([v(f2, "comanda", "D54"), v(f2, "comanda", "E54")]).toEqual(["1", "25"]);
  }, 120_000);

  it("E03: T 35 cu montajul de pe invelitoare, specialele 2 ML pe treapta, banda T35 pe randul ei cu numele rescris, lungimile pe foaia lor", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    const e = citesteEtalon("E03");
    const corp = await corpDinEtalon(e);
    await construieste(agent, id, e, corp);
    await deComandat(agent, id);
    const { fisiere, avertizari } = await genereaza(agent, id);
    expect(avertizari).toEqual([]);
    expect(fisiere).toHaveLength(1);
    const s = fisiere[0].s;
    expect(v(s, "comanda", "H22")).toBe("TABLA_CUTATA");
    expect(v(s, "comanda", "E23")).toBe("T 35 A"); // implicit acoperis
    expect(v(s, "comanda", "O22")).toBeUndefined();
    expect(v(s, "comanda", "I24")).toBe("9005");
    expect([v(s, "comanda", "D27"), v(s, "comanda", "E27")]).toEqual(["5.7", "6"]);
    expect(v(s, "comanda", "F67")).toBe("4"); // BORDURA FRONTON 312 MM
    expect(v(s, "comanda", "F88")).toBe("5"); // ACCESORIU SPECIAL D08
    expect(v(s, "comanda", "F89")).toBe("5"); // D09
    expect(v(s, "comanda", "M77")).toBe("BANDA ETANSARE COAMA T35");
    expect(v(s, "comanda", "P77")).toBe("10");
    expect(v(s, "pluvial", "D5")).toBe("NEGRU - (015) - RAL 9005");
    expect(v(s, "pluvial", "E10")).toBe("6");
    // foaia accesoriilor la lungimi: un rand per pozitie, cu finisaj, culoare, grosime, lungime, bucati
    expect(v(s, "speciale", "B21")).toBe("ACCESORIU SPECIAL D11");
    expect(v(s, "speciale", "F21")).toBe("LUCIOS");
    expect(v(s, "speciale", "H21")).toBe("9002");
    expect(v(s, "speciale", "I21")).toBe("0.50");
    expect([v(s, "speciale", "J21"), v(s, "speciale", "L21")]).toEqual(["3", "4"]);
    expect(v(s, "speciale", "B22")).toBe("ACCESORIU SPECIAL D08");
    expect([v(s, "speciale", "J22"), v(s, "speciale", "L22")]).toEqual(["2", "4"]);
    expect(v(s, "speciale", "B23")).toBeUndefined();

    // montajul "perete" pe invelitoare -> "T 35 P"; campul nu schimba calculul
    const id2 = await ofertaNoua(agent);
    corp.invelitori[0] = { ...corp.invelitori[0], montaj: "perete" } as (typeof corp.invelitori)[number];
    await construieste(agent, id2, e, corp);
    const detaliu = await agent.get(`/api/oferte/${id2}`).expect(200);
    expect(detaliu.body.oferta.invelitori[0].montaj).toBe("perete");
    await deComandat(agent, id2);
    const r2 = await genereaza(agent, id2);
    expect(v(r2.fisiere[0].s, "comanda", "E23")).toBe("T 35 P");
  }, 120_000);

  it("produsul fara loc intra in avertizari (pluvial Aluzinc); formularul se genereaza si la Comandat, din rezultatul salvat", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    const e = citesteEtalon("E01");
    const corp = await corpDinEtalon(e);
    const aluzinc = await produsDupaCod("SABUR0903ML");
    corp.linii.push({ cheie: "LA", rubrica: "Sistem pluvial", produsId: aluzinc.id, cantitate: "2", invelitoare: null, culoare: { ral: "Aluzinc", finisaj: "Aluzinc", grosime: null } });
    const rp = await agent.put(`/api/oferte/${id}/produse`).send(corp);
    expect(rp.status, JSON.stringify(rp.body)).toBe(200);
    await puneCursulEtalonului(id, e);
    await deComandat(agent, id);
    const { fisiere, avertizari } = await genereaza(agent, id);
    expect(avertizari.join("\n")).toMatch(/Nu au loc în formularul Bilka: .*SABUR0903ML.*pluvialul acesta nu are foaie în formular/);
    expect(fisiere.length).toBeGreaterThanOrEqual(1);
    expect(fisiere[0].doc.avertizari).toMatch(/Nu au loc în formularul Bilka/);
    // la "Comandat": din rezultatul salvat, fara recalcul
    await agent.put(`/api/oferte/${id}/status`).send({ status: "AVANS_LUAT", avansLei: "1000" }).expect(200);
    await agent.put(`/api/oferte/${id}/status`).send({ status: "COMANDAT" }).expect(200);
    const dupa = await genereaza(agent, id);
    expect(v(dupa.fisiere[0].s, "comanda", "E23")).toBe("IBERIC");
    expect(v(dupa.fisiere[0].s, "comanda", "F64")).toBe("13");
  }, 120_000);

  it("fara sablon pe firma -> 409 cu mesaj clar; In lucru -> 409; colaboratorul -> 403", async () => {
    const agent2 = await autentificaAgent(app, EMAIL.agent2);
    const id2 = await ofertaNoua(agent2);
    await construieste(agent2, id2, citesteEtalon("E01"));
    await deComandat(agent2, id2);
    const r = await agent2.post(`/api/oferte/${id2}/formulare-bilka`).send({});
    expect(r.status).toBe(409);
    expect(r.body.eroare).toMatch(/nu are încărcat șablonul formularului de comandă Bilka/);

    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    await construieste(agent, id, citesteEtalon("E01"));
    const inLucru = await agent.post(`/api/oferte/${id}/formulare-bilka`).send({});
    expect(inLucru.status).toBe(409);
    expect(inLucru.body.eroare).toMatch(/De comandat/);

    const colab = await autentificaAgent(app, EMAIL.colab);
    const idc = await ofertaNoua(colab);
    await construieste(colab, idc, citesteEtalon("E01"));
    await deComandat(colab, idc);
    await colab.post(`/api/oferte/${idc}/formulare-bilka`).send({}).expect(403);
  }, 120_000);

  it("un fisier care nu e formularul Bilka e refuzat la incarcare", async () => {
    const ag = await autentificaAgent(app, EMAIL.adminGeneral);
    const r = await ag.post(`/api/adm/con/firme/${firma2}/sablon-bilka`).attach("sablon", Buffer.from("nu e zip"), "altceva.xlsm");
    expect(r.status).toBe(400);
    expect(r.body.eroare).toMatch(/nu poate fi folosit ca șablon/);
    const firma = await prisma.firma.findUniqueOrThrow({ where: { id: firma2 } });
    expect(firma.sablonBilka).toBeNull();
  });
});
