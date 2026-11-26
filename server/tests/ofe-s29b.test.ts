import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { incarcaCorespondentaFormularBilka } from "../src/modules/adm/corespondentaFormular.js";
import { citesteSablon, type Sablon } from "../src/modules/ofe/formularBilka/sablon.js";
import { asiguraCatalogBilka } from "./catalogTest.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

// S29b (docs/MODIFICARI-S29B.md v1.4, docs/CERERI-BUG-S25.md):
// - BUG-24: la accesoriile la lungimi, orice rand lungime x bucati adaugat - in aceeasi deschidere sau dupa
//   salvare si redeschidere - intra in metrii pozitiei (ml = suma randurilor, 3 zecimale), in rezultatul
//   motorului si in formularul Bilka (generat si citit inapoi); stergerea unui rand ii scade; doua pozitii cu
//   aceeasi desfasurata si aceeasi cheie raman amandoua, fiecare cu randurile si metrii ei.
// - BUG-24 c, BUG-26, BUG-27: oferta deschisa isi aduce produsele din catalog ale liniilor ("produseCatalog":
//   treapta, sistemul pluvial), ca editorul sa arate treapta si sistemul salvate si sa nu schimbe pe tacute
//   produsul unei linii. Schimbarea cantitatii nu schimba produsul; formularul are aceeasi treapta / acelasi sistem.
// Motorul (mot/) nu e atins: aici se verifica doar ce ajunge la el si ce iese din el prin API.

const app = creeazaApp();
const S = "-s29b@exemplu.local";
const EMAIL = { adminGeneral: `admin-general${S}`, admin1: `admin1${S}`, agent1: `agent1${S}` };
const CAT = "/api/oferte/catalog";
const SABLON = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../docs/Liste/Bilka/2026-09/Formular comanda v10    03.06.2026.XLSM");
const LUNGIMI = "Accesorii speciale la lungimi (ML)";
const SPECIALE = "Accesorii speciale (2 ML)";
const PLUVIAL = "Sistem pluvial";

function dataLocala(delta = 0): string {
  const d = new Date(Date.now() + delta * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

type Agent = Awaited<ReturnType<typeof autentificaAgent>>;
type Rand = Record<string, any>;

let agent: Agent;
let lungimi: Rand[]; // accesoriile la lungimi, Grande Mat 0,50 mm (D01-D25)
let speciale: Rand[]; // accesoriile speciale 2 ML, mat 0,50 mm
let pluvial150: Rand[]; // piesele sistemului 150 / 100, mat (doar ale lui, fara cele comune)
let pluvial125: Rand[];
let ralGrande: string;
let ralMat: string;
let ralPluvial: string;

const ral = (c: string) => (/^\d{4}$/.test(c.trim()) ? `RAL ${c.trim()}` : c.trim());

beforeAll(async () => {
  const adminGeneral = await creeazaUtilizatorTest(EMAIL.adminGeneral, "ADMIN_GENERAL");
  await asiguraCatalogBilka(adminGeneral);
  await incarcaCorespondentaFormularBilka(prisma);
  const firma = (await prisma.firma.create({ data: { denumire: "Firma S29b SRL", cui: "RO2930", nrRegCom: "J2930", adresa: "Str. B 29", localitate: "Focșani", judet: "Vrancea", telefon: "0700002930", email: `f1${S}` } })).id;
  const admin1 = await creeazaUtilizatorTest(EMAIL.admin1, "ADMINISTRATOR", { firmaId: firma, serieOferta: "YBA", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.agent1, "AGENT", { firmaId: firma, administratorId: admin1.id, serieOferta: "YBG", adaosProcent: 1 });
  for (const d of [dataLocala(0), dataLocala(-1)]) {
    await prisma.cursValutar.upsert({ where: { data_moneda: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR" } }, update: { curs: "5.3485" }, create: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR", curs: "5.3485", sursa: "test" } });
  }
  const ag = await autentificaAgent(app, EMAIL.adminGeneral);
  const r = await ag.post(`/api/adm/con/firme/${firma}/sablon-bilka`).attach("sablon", SABLON);
  expect(r.status, JSON.stringify(r.body)).toBe(200);

  agent = await autentificaAgent(app, EMAIL.agent1);
  const ref = (await agent.get(`${CAT}/referinte`).expect(200)).body as Rand;
  const culoare = (finisaj: string, grosime: string) => ral((ref.culori as Rand[]).find((c) => c.finisaj === finisaj && c.grosime.replace(/\s/g, "") === grosime.replace(/\s/g, ""))!.culoare);
  lungimi = (await agent.get(`${CAT}/speciale`).query({ categorie: LUNGIMI, finisaj: "Grande Mat", grosime: "0,50 mm" }).expect(200)).body.produse;
  speciale = (await agent.get(`${CAT}/speciale`).query({ categorie: SPECIALE, finisaj: "mat", grosime: "0,50 mm" }).expect(200)).body.produse;
  expect(lungimi.map((p) => p.treapta)).toContain("D05");
  expect(speciale.map((p) => p.treapta)).toContain("D05");
  ralGrande = culoare("Grande Mat", "0,50 mm");
  ralMat = culoare("mat", "0,50 mm");
  const p150 = (await agent.get(`${CAT}/pluvial`).query({ finisaj: "mat", sistem: "150 / 100" }).expect(200)).body;
  const p125 = (await agent.get(`${CAT}/pluvial`).query({ finisaj: "mat", sistem: "125 / 90" }).expect(200)).body;
  pluvial150 = [...p150.implicite, ...p150.restul].filter((p: Rand) => p.sistem === "150 / 100");
  pluvial125 = [...p125.implicite, ...p125.restul].filter((p: Rand) => p.sistem === "125 / 90");
  expect(pluvial150.length).toBeGreaterThan(2);
  expect(pluvial125.length).toBeGreaterThan(1);
  ralPluvial = "RAL 7016";
}, 240_000);

afterAll(async () => {
  await prisma.$disconnect();
});

async function ofertaNoua(nume: string, telefon: string): Promise<string> {
  const r = await agent.post("/api/oferte").send({ client: { nume, telefon, adresa: "Str. Probei 29", localitate: "Focșani" } });
  expect(r.status, JSON.stringify(r.body)).toBe(201);
  return r.body.oferta.id;
}

type Pozitie = { lungimeM: string; bucati: number };
const pozitie = (cheie: string, produs: Rand, pozitii: Pozitie[]) => ({ cheie, rubrica: LUNGIMI, produsId: produs.id as string, cantitate: "1", culoare: { ral: ralGrande, finisaj: "Grande Mat", grosime: "0,50 mm" }, pozitii });

async function salveaza(id: string, linii: Rand[]): Promise<Rand> {
  const r = await agent.put(`/api/oferte/${id}/produse`).send({ grupaPct: "0", invelitori: [], linii, sipci: [], zonaB: [] });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.oferta as Rand;
}

// liniile ofertei asa cum le-ar retrimite editorul dupa redeschidere: din ce e salvat, neatinse
const dinSalvat = (o: Rand): Rand[] =>
  (o.linii as Rand[]).map((l) => ({
    cheie: l.id,
    rubrica: l.rubrica,
    produsId: l.produsId,
    cantitate: l.cantitate,
    culoare: l.culoareRal ? { ral: l.culoareRal, finisaj: l.culoareFinisaj, grosime: l.culoareGrosime } : null,
    ...(l.pozitii.length ? { pozitii: l.pozitii.map((p: Rand) => ({ lungimeM: p.lungimeM, bucati: p.bucati })) } : {}),
  }));

// metrii fiecarei linii la lungimi, in ordinea liniilor: din rezultatul motorului
const metri = (o: Rand): string[] => (o.linii as Rand[]).filter((l) => l.rubrica === LUNGIMI).map((l) => (o.structura.rezultat.linii as Rand[]).find((x) => x.id === l.id)?.cantitate);

async function deComandat(id: string) {
  await agent.put(`/api/oferte/${id}/status`).send({ status: "TRANSMISA" }).expect(200);
  await agent.put(`/api/oferte/${id}/status`).send({ status: "DE_COMANDAT", livrareBilka: { tip: "DEPOZIT" } }).expect(200);
}

async function formulare(id: string): Promise<{ s: Sablon; avertizari: string[] }[]> {
  const r = await agent.post(`/api/oferte/${id}/formulare-bilka`).send({});
  expect(r.status, JSON.stringify(r.body)).toBe(201);
  const iesire: { s: Sablon; avertizari: string[] }[] = [];
  for (const d of r.body.documente as Rand[]) {
    const dl = await agent.get(`/api/oferte/${id}/documente/${d.id}`).buffer(true).parse((res, cb) => {
      const bucati: Buffer[] = [];
      res.on("data", (b: Buffer) => bucati.push(b));
      res.on("end", () => cb(null, Buffer.concat(bucati)));
    });
    expect(dl.status).toBe(200);
    iesire.push({ s: citesteSablon(dl.body as Buffer), avertizari: r.body.avertizari });
  }
  return iesire;
}

// randurile de pe foaia accesoriilor la lungimi, citite inapoi din fisierul generat: "D05 2.5×4"
function randuriSpeciale(s: Sablon): string[] {
  const h = s.harta.speciale;
  const celule = s.celule(h.foaie);
  return h.randuri
    .map((r) => ({ cod: celule.get(`${h.coloane.cod}${r}`)?.v, lungime: celule.get(`${h.coloane.lungime}${r}`)?.v, bucati: celule.get(`${h.coloane.bucati}${r}`)?.v }))
    .filter((x) => x.cod || x.lungime || x.bucati)
    .map((x) => `${String(x.cod ?? "").replace("ACCESORIU SPECIAL ", "")} ${x.lungime}×${x.bucati}`);
}

describe("accesoriile la lungimi: randurile adaugate ulterior (S29b, BUG-24)", () => {
  it("2 randuri -> suma lor; al treilea fara reincarcare; redeschidere si al patrulea; un rand sters scade; formularul Bilka citit inapoi are toate randurile", async () => {
    const id = await ofertaNoua("Lungimi Adaugate", "0730 290 001");
    const d05 = lungimi.find((p) => p.treapta === "D05")!;
    let o = await salveaza(id, [pozitie("A", d05, [{ lungimeM: "2,5", bucati: 4 }, { lungimeM: "1,2", bucati: 3 }])]);
    expect(metri(o)).toEqual(["13.600"]);

    // al treilea rand, in aceeasi deschidere
    o = await salveaza(id, [pozitie("A", d05, [{ lungimeM: "2,5", bucati: 4 }, { lungimeM: "1,2", bucati: 3 }, { lungimeM: "3", bucati: 2 }])]);
    expect(metri(o)).toEqual(["19.600"]);

    // redeschidere: oferta citita din nou, liniile retrimise din ce e salvat + al patrulea rand
    const redeschisa = (await agent.get(`/api/oferte/${id}`).expect(200)).body.oferta as Rand;
    expect(metri(redeschisa)).toEqual(["19.600"]);
    const linii = dinSalvat(redeschisa);
    linii[0].pozitii.push({ lungimeM: "0,5", bucati: 10 });
    o = await salveaza(id, linii);
    expect(metri(o)).toEqual(["24.600"]);
    expect(o.linii[0].pozitii.map((p: Rand) => `${Number(p.lungimeM)}×${p.bucati}`)).toEqual(["2.5×4", "1.2×3", "3×2", "0.5×10"]);
    expect((o.structura.rezultat.cantitati.accesoriiMl as Rand[]).map((a) => a.ml)).toEqual(["24.600"]);

    // un rand sters scade la fel
    const fara = dinSalvat(o);
    fara[0].pozitii.splice(1, 1);
    o = await salveaza(id, fara);
    expect(metri(o)).toEqual(["21.000"]);

    // formularul Bilka, generat si citit inapoi: cate un rand pe foaie pentru fiecare lungime x bucati
    await deComandat(id);
    const f = await formulare(id);
    expect(f).toHaveLength(1);
    expect(randuriSpeciale(f[0].s)).toEqual(["D05 2.5×4", "D05 3×2", "D05 0.5×10"]);
  }, 120_000);

  it("doua pozitii cu aceeasi desfasurata si aceeasi cheie raman amandoua, fiecare cu randurile si metrii ei - si in formular", async () => {
    const id = await ofertaNoua("Lungimi Dublate", "0730 290 002");
    const d05 = lungimi.find((p) => p.treapta === "D05")!;
    let o = await salveaza(id, [pozitie("A", d05, [{ lungimeM: "2,5", bucati: 4 }, { lungimeM: "1,2", bucati: 3 }, { lungimeM: "3", bucati: 2 }]), pozitie("B", d05, [{ lungimeM: "2", bucati: 5 }])]);
    expect(o.linii.map((l: Rand) => l.cod)).toEqual([d05.cod, d05.cod]);
    expect(metri(o)).toEqual(["19.600", "10.000"]);

    // un rand adaugat la A DOUA pozitie, dupa redeschidere: creste doar ea
    const redeschisa = (await agent.get(`/api/oferte/${id}`).expect(200)).body.oferta as Rand;
    const linii = dinSalvat(redeschisa);
    linii[1].pozitii.push({ lungimeM: "4", bucati: 1 });
    o = await salveaza(id, linii);
    expect(metri(o)).toEqual(["19.600", "14.000"]);

    await deComandat(id);
    const f = await formulare(id);
    expect(randuriSpeciale(f[0].s)).toEqual(["D05 2.5×4", "D05 1.2×3", "D05 3×2", "D05 2×5", "D05 4×1"]);
  }, 120_000);
});

describe("oferta deschisa isi aduce treapta si sistemul fiecarei linii (S29b: BUG-24 c, BUG-26, BUG-27)", () => {
  it("produseCatalog: produsele din catalog ale liniilor si ale randurilor goale, cu treapta si sistemul lor; linia isi poarta sistemul salvat", async () => {
    const id = await ofertaNoua("Treapta Si Sistem", "0730 290 003");
    const d09 = lungimi.find((p) => p.treapta === "D09")!;
    const d12 = lungimi.find((p) => p.treapta === "D12")!;
    const sp5 = speciale.find((p) => p.treapta === "D05")!;
    const cheieMat = { ral: ralMat, finisaj: "mat", grosime: "0,50 mm" };
    const cheiePluvial = { ral: ralPluvial, finisaj: "mat", grosime: null };
    const r = await agent.put(`/api/oferte/${id}/produse`).send({
      grupaPct: "0",
      invelitori: [],
      linii: [
        { cheie: "S", rubrica: SPECIALE, produsId: sp5.id, cantitate: "2", culoare: cheieMat },
        { cheie: "P1", rubrica: PLUVIAL, produsId: pluvial150[0].id, cantitate: "3", culoare: cheiePluvial },
        { cheie: "P2", rubrica: PLUVIAL, produsId: pluvial150[1].id, cantitate: "4", culoare: cheiePluvial },
        pozitie("L", d09, [{ lungimeM: "4", bucati: 3 }]),
      ],
      // o pozitie la lungimi abia adaugata, fara randuri: rand gol, cu treapta ei
      randuriGoale: [{ rubrica: LUNGIMI, produsId: d12.id, culoare: { ral: "", finisaj: "Grande Mat", grosime: "0,50 mm" }, dupaLinii: 4 }],
      sipci: [],
      zonaB: [],
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);

    const o = (await agent.get(`/api/oferte/${id}`).expect(200)).body.oferta as Rand;
    const catalog = new Map((o.produseCatalog as Rand[]).map((p) => [p.id, p]));
    expect([...catalog.keys()].sort()).toEqual([sp5.id, pluvial150[0].id, pluvial150[1].id, d09.id, d12.id].sort());
    expect(catalog.get(sp5.id)!.treapta).toBe("D05");
    expect(catalog.get(d09.id)!.treapta).toBe("D09");
    expect(catalog.get(d12.id)!.treapta).toBe("D12");
    expect(catalog.get(pluvial150[0].id)!.sistem).toBe("150 / 100");
    // produsul din catalog e in forma editorului (fara preturi)
    expect(Object.keys(catalog.get(sp5.id)!)).toEqual(Object.keys(sp5));
    expect((o.linii as Rand[]).filter((l) => l.rubrica === PLUVIAL).map((l) => l.sistem)).toEqual(["150 / 100", "150 / 100"]);
    // si raspunsul salvarii le aduce (editorul le foloseste fara o noua citire)
    expect((r.body.oferta.produseCatalog as Rand[]).length).toBe(5);
  }, 120_000);

  it("BUG-26: speciale 2 ML salvate pe D05 - schimbarea cantitatii nu schimba produsul; rezultatul motorului si formularul Bilka au tot D05", async () => {
    const id = await ofertaNoua("Speciale D05", "0730 290 004");
    const sp5 = speciale.find((p) => p.treapta === "D05")!;
    let o = await salveaza(id, [{ cheie: "S", rubrica: SPECIALE, produsId: sp5.id, cantitate: "2", culoare: { ral: ralMat, finisaj: "mat", grosime: "0,50 mm" } }]);
    // redeschidere, apoi doar cantitatea: 2 -> 3
    const redeschisa = (await agent.get(`/api/oferte/${id}`).expect(200)).body.oferta as Rand;
    expect((redeschisa.produseCatalog as Rand[]).find((p) => p.id === redeschisa.linii[0].produsId)!.treapta).toBe("D05");
    const linii = dinSalvat(redeschisa);
    linii[0].cantitate = "3";
    o = await salveaza(id, linii);
    expect(o.linii.map((l: Rand) => [l.cod, l.cantitate])).toEqual([[sp5.cod, "3"]]);
    expect((o.structura.rezultat.linii as Rand[]).map((l) => [l.cod, l.cantitate])).toEqual([[sp5.cod, "3"]]);

    await deComandat(id);
    const f = await formulare(id);
    expect(f).toHaveLength(1);
    // specialele 2 ML stau pe randul treptei lor (D08 -> randul 88, D09 -> 89): D05 -> randul 85
    const comanda = f[0].s.celule(f[0].s.harta.foaie.comanda);
    expect(comanda.get("F85")?.v).toBe("3");
    expect(comanda.get("F81")?.v).toBeUndefined();
  }, 120_000);

  it("BUG-27: sistemul 150 / 100 salvat cu doua produse ramane 150 / 100 dupa redeschidere si retrimitere; un produs adaugat intra tot la 150", async () => {
    const id = await ofertaNoua("Pluvial 150", "0730 290 005");
    const cheie = { ral: ralPluvial, finisaj: "mat", grosime: null };
    let o = await salveaza(id, [
      { cheie: "P1", rubrica: PLUVIAL, produsId: pluvial150[0].id, cantitate: "3", culoare: cheie },
      { cheie: "P2", rubrica: PLUVIAL, produsId: pluvial150[1].id, cantitate: "4", culoare: cheie },
    ]);
    const locuri = (x: Rand) => (x.structura.rezultat.formulareBilka as Rand[]).flatMap((f) => (f.pluvial as Rand[]).map((p) => `${p.finisaj} · ${p.sistem} · ${p.ral} · ${p.linii.length}`));
    const inainte = locuri(o);
    expect(inainte).toHaveLength(1);
    expect(inainte[0]).toContain("150/100");

    const redeschisa = (await agent.get(`/api/oferte/${id}`).expect(200)).body.oferta as Rand;
    o = await salveaza(id, dinSalvat(redeschisa));
    expect(o.linii.map((l: Rand) => [l.cod, l.sistem, l.cantitate])).toEqual([
      [pluvial150[0].cod, "150 / 100", "3"],
      [pluvial150[1].cod, "150 / 100", "4"],
    ]);
    expect(locuri(o)).toEqual(inainte);

    // un produs adaugat dupa redeschidere, din lista sistemului rubricii (150 / 100)
    const cuUnulInPlus = [...dinSalvat(o), { cheie: "P3", rubrica: PLUVIAL, produsId: pluvial150[2].id, cantitate: "1", culoare: cheie }];
    o = await salveaza(id, cuUnulInPlus);
    expect([...new Set(o.linii.map((l: Rand) => l.sistem))]).toEqual(["150 / 100"]);
    expect(locuri(o)).toHaveLength(1);
    expect(locuri(o)[0]).toContain("150/100");
  }, 120_000);
});
