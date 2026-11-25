import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { incarcaOptiuniListe } from "../src/modules/adm/optiuniListe.js";
import { liniileReturnabile } from "../src/modules/com/retururi.js";
import { calculeazaOferta } from "../src/modules/mot/calcul.js";
import { benzi, numeProdus } from "../src/modules/ofe/documente/continut.js";
import { esc } from "../src/modules/ofe/documente/sablon.js";
import { htmlPentru } from "../src/modules/ofe/documente/index.js";
import { includeProduse, intrareMot } from "../src/modules/ofe/intrareMot.js";
import { rangDeAfisare } from "../src/modules/ofe/ordineAfisare.js";
import { asiguraCatalogBilka } from "./catalogTest.js";
import { citesteEtalon } from "./etalon/incarcaEtalon.js";
import { corpDinEtalon } from "./etalonApi.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

// S29 (docs/MODIFICARI-S29.md v1.3, docs/CERERI-BUG-S25.md):
// - BUG-20: randurile adaugate cu "+" si lasate FARA cantitate se pastreaza (tabelul oferta_rand_gol, migrarea
//   24), la locul lor, pana sunt scoase din cos; nu ajung la motor, pe documente sau in formularul Bilka.
// - BUG-21: pe documente si in lista de preturi produsele apar in ordinea de pe ecranul ofertei (rubricile in
//   ordinea clasica; in rubrica, lista implicita in ordinea ei, apoi cele adaugate cu "+", in ordinea adaugarii),
//   nu in ordinea completarii cantitatilor. Se schimba DOAR afisarea: ordinea salvata si cea in care liniile
//   pleaca spre motor raman neatinse.

const app = creeazaApp();
const S = "-s29@exemplu.local";
const EMAIL = { adminGeneral: `admin-general${S}`, admin1: `admin1${S}`, agent1: `agent1${S}` };
const CAT = "/api/oferte/catalog";

function dataLocala(delta = 0): string {
  const d = new Date(Date.now() + delta * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

type Agent = Awaited<ReturnType<typeof autentificaAgent>>;
type Rand = Record<string, any>;

let agent: Agent;
let listaStandard: Rand[]; // lista implicita "Accesorii standard" pentru cheia E01, in ordinea ei
let listaFixare: Rand[];
let inPlus: Rand[]; // trei produse de accesorii standard care NU sunt in lista implicita (se adauga cu "+")

beforeAll(async () => {
  const adminGeneral = await creeazaUtilizatorTest(EMAIL.adminGeneral, "ADMIN_GENERAL");
  await asiguraCatalogBilka(adminGeneral);
  await incarcaOptiuniListe(prisma);
  const firma = (await prisma.firma.create({ data: { denumire: "Firma S29", cui: "RO2929", nrRegCom: "J2929", adresa: "A", telefon: "1", email: `f1${S}` } })).id;
  const admin1 = await creeazaUtilizatorTest(EMAIL.admin1, "ADMINISTRATOR", { firmaId: firma, serieOferta: "WSA", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.agent1, "AGENT", { firmaId: firma, administratorId: admin1.id, serieOferta: "WSG", adaosProcent: 1 });
  for (const d of [dataLocala(0), dataLocala(-1)]) {
    await prisma.cursValutar.upsert({ where: { data_moneda: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR" } }, update: { curs: "5.3485" }, create: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR", curs: "5.3485", sursa: "test" } });
  }
  agent = await autentificaAgent(app, EMAIL.agent1);
  // listele implicite ale cheii E01 (Iberic mat 0,50), exact cum le cere editorul
  const ref = (await agent.get(`${CAT}/referinte`).expect(200)).body as Rand;
  const categorie = (ref.categoriiListe as Rand[]).map((c) => c.categorieInvelitoare as string).find((c) => c.toLowerCase().startsWith("țiglă metalică (fără"))!;
  const cheie = { finisaj: "mat", grosime: "0,50 mm" };
  listaStandard = (await agent.get(`${CAT}/liste-implicite`).query({ rubrica: "Accesorii standard", categorieInvelitoare: categorie, ...cheie }).expect(200)).body.produse;
  listaFixare = (await agent.get(`${CAT}/liste-implicite`).query({ rubrica: "Fixare și etanșare", categorieInvelitoare: categorie, ...cheie }).expect(200)).body.produse;
  expect(listaStandard.length).toBeGreaterThan(5);
  expect(listaFixare.length).toBeGreaterThan(5);
  const gasite = (await agent.get(`${CAT}/cauta`).query({ q: "mat", categorie: "Accesorii standard", ...cheie }).expect(200)).body.produse as Rand[];
  const idsLista = new Set(listaStandard.map((p) => p.id));
  inPlus = gasite.filter((p) => !idsLista.has(p.id)).slice(0, 3);
  expect(inPlus).toHaveLength(3);
}, 240_000);

afterAll(async () => {
  await prisma.$disconnect();
});

async function ofertaNoua(nume: string, telefon: string): Promise<string> {
  const r = await agent.post("/api/oferte").send({ client: { nume, telefon, adresa: "Str. Probei 1", localitate: "Focșani" } });
  expect(r.status, JSON.stringify(r.body)).toBe(201);
  return r.body.oferta.id;
}
const salveaza = async (id: string, corp: Rand) => {
  const r = await agent.put(`/api/oferte/${id}/produse`).send(corp);
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.oferta as Rand;
};
const linie = (cheie: string, p: Rand, cantitate: string, rubrica = "Accesorii standard") => ({ cheie, rubrica, produsId: p.id, cantitate, invelitoare: "I1", culoare: null });
const gol = (p: Rand, dupaLinii: number, rubrica = "Accesorii standard") => ({ rubrica, produsId: p.id, invelitoare: "I1", culoare: null, dupaLinii });
// rezultatul motorului fara id-uri (liniile se recreeaza la fiecare salvare)
const faraId = (o: Rand) => JSON.stringify(o.preturi.rezultat).replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "ID");
// numele produsului asa cum apare pe document
const peDocument = (p: Rand) => esc(numeProdus({ denumire: p.denumire, finisaj: p.finisaj ?? null, grosime: p.grosime ?? null }));
const coduriDocument = async (id: string) => {
  const o = await prisma.oferta.findUniqueOrThrow({ where: { id }, include: includeProduse });
  const r = calculeazaOferta(await intrareMot(o));
  return { o, r, benzi: benzi(o, r, await rangDeAfisare(o)) };
};

describe("BUG-20 - randul adaugat cu „+” ramane fara cantitate pana e scos din cos", () => {
  let id: string;
  let invelitori: Rand[];
  let A: Rand, B: Rand, C: Rand;

  it("randurile goale se salveaza si se intorc la redeschidere; nu intra in liniile ofertei, in motor, pe document sau in formulare", async () => {
    [A, B, C] = inPlus;
    id = await ofertaNoua("Client Rânduri Goale", "0730 134 001");
    invelitori = (await corpDinEtalon(citesteEtalon("E01"))).invelitori.slice(0, 1).map((i) => ({ ...i, cheie: "I1" }));
    const baza = { grupaPct: "0", invelitori, linii: [linie("L1", listaStandard[0], "12")], sipci: [], zonaB: [] };
    const fara = await salveaza(id, baza);
    expect(fara.randuriGoale).toEqual([]);
    const cu = await salveaza(id, { ...baza, randuriGoale: [gol(A, 1), gol(B, 1), gol(C, 1)] });
    // la redeschidere: cele trei randuri, in ordinea adaugarii, legate de invelitoarea lor, cu datele produsului
    expect(cu.randuriGoale.map((x: Rand) => [x.produsId, x.dupaLinii, x.rubrica, x.invelitoareId, x.cod, x.denumire, x.um])).toEqual([A, B, C].map((p) => [p.id, 1, "Accesorii standard", cu.invelitori[0].id, p.cod, p.denumire, p.um]));
    expect((await agent.get(`/api/oferte/${id}`).expect(200)).body.oferta.randuriGoale).toHaveLength(3);
    // liniile ofertei raman cele cu cantitate; rezultatul motorului e identic cu si fara randuri goale
    expect(cu.linii.map((l: Rand) => l.cod)).toEqual(fara.linii.map((l: Rand) => l.cod));
    expect(faraId(cu)).toBe(faraId(fara));
    expect(cu.structura.rezultat.formulareBilka).toHaveLength(fara.structura.rezultat.formulareBilka.length);
    const o = await prisma.oferta.findUniqueOrThrow({ where: { id }, include: includeProduse });
    expect((await intrareMot(o)).linii).toHaveLength(2); // invelitoarea + coama
    const { html } = await htmlPentru(id, "OFERTA");
    expect(html).toContain(peDocument(listaStandard[0]));
    for (const p of [A, B, C]) expect(html).not.toContain(peDocument(p));
  });

  it("locul randului e stabil: A, B, C goale; se completeaza C, apoi A -> la redeschidere A, B (gol), C; documentul arata A, C", async () => {
    // editorul trimite liniile in ordinea randurilor lui (A, apoi C), nu in ordinea completarii; B ramane gol dupa A
    const dupaC = await salveaza(id, { grupaPct: "0", invelitori, linii: [linie("L1", listaStandard[0], "12"), linie("LC", C, "3")], randuriGoale: [gol(A, 1), gol(B, 1)], sipci: [], zonaB: [] });
    expect(dupaC.randuriGoale.map((x: Rand) => [x.produsId, x.dupaLinii])).toEqual([[A.id, 1], [B.id, 1]]);
    const dupaA = await salveaza(id, { grupaPct: "0", invelitori, linii: [linie("L1", listaStandard[0], "12"), linie("LA", A, "2"), linie("LC", C, "3")], randuriGoale: [gol(B, 2)], sipci: [], zonaB: [] });
    // ce are nevoie editorul ca sa refaca ordinea de pe ecran: liniile cu cantitate in ordinea lor + locul randului gol
    expect(dupaA.linii.filter((l: Rand) => l.rubrica !== "Învelitori").map((l: Rand) => l.produsId)).toEqual([listaStandard[0].id, A.id, C.id]);
    expect(dupaA.randuriGoale.map((x: Rand) => [x.produsId, x.dupaLinii])).toEqual([[B.id, 2]]);
    const standard = (await coduriDocument(id)).benzi.find((b) => b.rubrica === "Accesorii standard")!;
    expect(standard.linii.map((x) => x.l.produsId)).toEqual([listaStandard[0].id, A.id, C.id]);
    const { html } = await htmlPentru(id, "OFERTA");
    expect(html.indexOf(peDocument(A))).toBeGreaterThan(-1);
    expect(html.indexOf(peDocument(A))).toBeLessThan(html.indexOf(peDocument(C)));
    expect(html).not.toContain(peDocument(B));
    // cantitatea stearsa: randul redevine gol, in acelasi loc
    const iarGol = await salveaza(id, { grupaPct: "0", invelitori, linii: [linie("L1", listaStandard[0], "12"), linie("LC", C, "3")], randuriGoale: [gol(A, 1), gol(B, 1)], sipci: [], zonaB: [] });
    expect(iarGol.randuriGoale.map((x: Rand) => x.produsId)).toEqual([A.id, B.id]);
  });

  it("cosul scoate randul; un rand gol legat de o invelitoare care nu exista e refuzat; un produs iesit din catalog nu blocheaza salvarea", async () => {
    const faraB = await salveaza(id, { grupaPct: "0", invelitori, linii: [linie("L1", listaStandard[0], "12"), linie("LC", C, "3")], randuriGoale: [gol(A, 1)], sipci: [], zonaB: [] });
    expect(faraB.randuriGoale.map((x: Rand) => x.produsId)).toEqual([A.id]);
    expect(await prisma.ofertaRandGol.count({ where: { ofertaId: id } })).toBe(1);
    await agent.put(`/api/oferte/${id}/produse`).send({ grupaPct: "0", invelitori, linii: [linie("L1", listaStandard[0], "12")], randuriGoale: [{ ...gol(A, 1), invelitoare: "NU-EXISTA" }], sipci: [], zonaB: [] }).expect(400);
    const cuNecunoscut = await salveaza(id, { grupaPct: "0", invelitori, linii: [linie("L1", listaStandard[0], "12")], randuriGoale: [gol(A, 1), { ...gol(B, 1), produsId: "produs-care-nu-exista" }], sipci: [], zonaB: [] });
    expect(cuNecunoscut.randuriGoale.map((x: Rand) => x.produsId)).toEqual([A.id]);
    // un corp fara "randuriGoale" (cum il trimiteau ecranele dinainte de S29) le goleste, fara eroare
    expect((await salveaza(id, { grupaPct: "0", invelitori, linii: [linie("L1", listaStandard[0], "12")], sipci: [], zonaB: [] })).randuriGoale).toEqual([]);
  });

  it("„Copiaza oferta” si „Creeaza varianta” duc si randurile goale, legate de invelitoarea copiei", async () => {
    await salveaza(id, { grupaPct: "0", invelitori, linii: [linie("L1", listaStandard[0], "12")], randuriGoale: [gol(A, 1), gol(B, 1)], sipci: [], zonaB: [] });
    const copie = await agent.post(`/api/oferte/${id}/copie`).send({});
    expect(copie.status, JSON.stringify(copie.body)).toBe(201);
    expect(copie.body.oferta.id).not.toBe(id);
    expect(copie.body.oferta.randuriGoale.map((x: Rand) => [x.produsId, x.invelitoareId, x.dupaLinii])).toEqual([[A.id, copie.body.oferta.invelitori[0].id, 1], [B.id, copie.body.oferta.invelitori[0].id, 1]]);
    const varianta = await agent.post(`/api/oferte/${id}/varianta`).send({});
    expect([200, 201]).toContain(varianta.status);
    const v = varianta.body.oferta as Rand;
    expect(v.id).not.toBe(id);
    expect(v.randuriGoale.map((x: Rand) => [x.produsId, x.invelitoareId])).toEqual([[A.id, v.invelitori[0].id], [B.id, v.invelitori[0].id]]);
    // oferta de la care s-a pornit isi pastreaza randurile
    expect(await prisma.ofertaRandGol.count({ where: { ofertaId: id } })).toBe(2);
  });
});

describe("BUG-21 - produsele pe documente si in lista de preturi, in ordinea de pe ecranul ofertei", () => {
  let id: string;
  let asteptatStandard: string[];
  let asteptatFixare: string[];

  it("cantitatile completate in ordine inversa -> documentul in ordinea rubricilor si a listelor, cu produsul adaugat cu „+” dupa cele implicite", async () => {
    id = await ofertaNoua("Client Ordine Documente", "0730 134 002");
    const e = citesteEtalon("E01");
    const corp = await corpDinEtalon(e);
    const [plus] = inPlus;
    // ordinea completarii: produsul adaugat cu „+” primul, apoi liniile E01 de la coada la cap
    // (ultima fixare, pluvialul, specialele, ultimul si primul accesoriu standard)
    const linii = [{ cheie: "LPLUS", rubrica: "Accesorii standard", produsId: plus.id, cantitate: "4", invelitoare: corp.invelitori[0].cheie, culoare: null }, ...[...corp.linii].reverse()];
    const o1 = await salveaza(id, { ...corp, linii });
    const salvate = (o1.linii as Rand[]).filter((l) => l.rubrica !== "Învelitori");
    // ordinea salvata (si cea in care liniile pleaca spre motor) e cea trimisa - BUG-21 nu o atinge
    expect(salvate.map((l) => l.produsId)).toEqual(linii.map((l) => l.produsId));
    const { o, r, benzi: b } = await coduriDocument(id);
    expect((await intrareMot(o)).linii.map((l) => l.id)).toEqual(o.linii.map((l) => l.id));
    expect(r.linii.map((l) => l.id)).toEqual(o.linii.map((l) => l.id));

    // rubricile, in ordinea clasica
    const rubrici = [...new Set(b.map((x) => x.rubrica))];
    const clasica = ["Învelitori", "Accesorii standard", "Accesorii speciale (2 ML)", "Fixare și etanșare", "Sistem pluvial", "Șipcă gard", "Accesorii speciale la lungimi (ML)"];
    expect(rubrici).toEqual(clasica.filter((x) => rubrici.includes(x)));
    expect(rubrici.slice(0, 2)).toEqual(["Învelitori", "Accesorii standard"]);
    expect(rubrici).toContain("Fixare și etanșare");
    expect(rubrici).toContain("Sistem pluvial");
    // in rubrica: ordinea listei implicite, apoi produsul adaugat cu „+”
    const principala = o.invelitori[0].id;
    const dinBanda = (rubrica: string) => b.filter((x) => x.rubrica === rubrica).flatMap((x) => x.linii).filter((x) => x.l.invelitoareId === principala).map((x) => x.l.produsId!);
    const inOferta = new Set(salvate.map((l) => l.produsId as string));
    const idsLista = new Set(listaStandard.map((p) => p.id as string));
    const adaugate = salvate.filter((l) => l.rubrica === "Accesorii standard" && l.invelitoareId === principala && !idsLista.has(l.produsId)).map((l) => l.produsId as string);
    expect(adaugate[0]).toBe(plus.id);
    asteptatStandard = [...listaStandard.map((p) => p.id as string).filter((p) => inOferta.has(p)), ...adaugate];
    asteptatFixare = listaFixare.map((p) => p.id as string).filter((p) => inOferta.has(p));
    expect(asteptatStandard.length).toBeGreaterThan(3);
    expect(asteptatFixare.length).toBeGreaterThan(2);
    expect(dinBanda("Accesorii standard")).toEqual(asteptatStandard);
    expect(dinBanda("Fixare și etanșare")).toEqual(asteptatFixare);
    // ... si chiar nu e ordinea completarii
    expect(dinBanda("Accesorii standard")).not.toEqual(salvate.filter((l) => l.rubrica === "Accesorii standard" && l.invelitoareId === principala).map((l) => l.produsId));
    // pluvialul: lista implicita a sistemului, in ordinea ei
    const pluviale = b.filter((x) => x.rubrica === "Sistem pluvial").flatMap((x) => x.linii).map((x) => x.l);
    const sistem = pluviale[0];
    const listaPluvial = (await agent.get(`${CAT}/pluvial`).query({ finisaj: sistem.culoareFinisaj ?? sistem.finisaj, sistem: sistem.sistem }).expect(200)).body.implicite as Rand[];
    const inLista = pluviale.map((l) => l.produsId).filter((p) => listaPluvial.some((x) => x.id === p));
    expect(inLista).toEqual(listaPluvial.map((p) => p.id).filter((p) => inLista.includes(p)));
  }, 120_000);

  it("PDF-ul de oferta, detaliata si tabelul de facturare urmeaza aceeasi ordine; lista „Preturi pe linii” la fel; cifrele raman cele ale motorului", async () => {
    const coduri = new Map((await prisma.ofertaLinie.findMany({ where: { ofertaId: id } })).map((l) => [l.produsId!, l]));
    for (const tip of ["OFERTA", "DETALIATA", "TABEL_FACTURARE"] as const) {
      const { html } = await htmlPentru(id, tip);
      const pozitii = asteptatStandard.map((p) => html.indexOf(peDocument(coduri.get(p)!)));
      expect(pozitii.every((x) => x >= 0), tip).toBe(true);
      expect(pozitii, tip).toEqual([...pozitii].sort((a, b) => a - b));
      // rubricile: accesoriile standard inaintea fixarii
      expect(Math.max(...pozitii), tip).toBeLessThan(html.indexOf(peDocument(coduri.get(asteptatFixare[0])!)));
    }
    const o = (await agent.get(`/api/oferte/${id}`).expect(200)).body.oferta as Rand;
    const { o: db, r, benzi: b } = await coduriDocument(id);
    const ordineaDocumentului = b.flatMap((x) => x.linii).map((x) => x.l.id);
    // rezultatul motorului pleaca neatins (liniile in ordinea lui); ordinea de afisare vine alaturi
    expect(o.preturi.rezultat.ordineAfisare).toEqual(ordineaDocumentului);
    expect((o.preturi.rezultat.linii as Rand[]).map((l) => l.id)).toEqual(r.linii.map((l) => l.id));
    expect(o.preturi.rezultat.ordineAfisare).not.toEqual(r.linii.map((l) => l.id));
    // aceleasi linii, aceleasi cifre - doar ordinea difera
    const dinMotor = new Map(r.linii.map((l) => [l.id, l]));
    for (const l of o.preturi.rezultat.linii as Rand[]) expect([l.cantitate, l.pretDocumentEur, l.valoareEur]).toEqual([dinMotor.get(l.id)!.cantitate, dinMotor.get(l.id)!.pretDocumentEur, dinMotor.get(l.id)!.valoareEur]);
    expect(o.preturi.rezultat.totaluri).toEqual(JSON.parse(JSON.stringify(r.totaluri)));
    expect(o.preturi.rezultat.linii).toHaveLength(db.linii.length);
    // editorul primeste in continuare liniile in ordinea salvata (o retrimite asa spre motor)
    expect((o.linii as Rand[]).map((l) => l.id)).toEqual(db.linii.map((l) => l.id));
  }, 120_000);

  it("dupa „Comandat”: lista de produse de la retur si avizul urmeaza ordinea documentului", async () => {
    await agent.put(`/api/oferte/${id}/status`).send({ status: "TRANSMISA" }).expect(200);
    await agent.put(`/api/oferte/${id}/status`).send({ status: "DE_COMANDAT", livrareBilka: { tip: "DEPOZIT" } }).expect(200);
    const c = await agent.put(`/api/oferte/${id}/status`).send({ status: "COMANDAT" });
    expect(c.status, JSON.stringify(c.body)).toBe(200);
    const comanda = await prisma.comanda.findUniqueOrThrow({ where: { ofertaId: id } });
    const { benzi: b } = await coduriDocument(id);
    const ordineaDocumentului = b.flatMap((x) => x.linii).map((x) => x.l.id);
    const retur = await liniileReturnabile(comanda.id);
    expect(retur!.linii.map((l) => l.linieId)).toEqual(ordineaDocumentului.filter((x) => retur!.linii.some((l) => l.linieId === x)));
    expect(retur!.linii.length).toBeGreaterThan(5);
    const aviz = (await agent.get(`/api/comenzi/${comanda.id}/aviz`).expect(200)).body as Rand;
    const liniiAviz = (aviz.linii as Rand[]).map((l) => l.linieId as string);
    expect([...new Set(liniiAviz)]).toEqual(ordineaDocumentului.filter((x) => liniiAviz.includes(x)));
  }, 120_000);
});
