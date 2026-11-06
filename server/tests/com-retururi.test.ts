import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { env } from "../src/env.js";
import { incarcaOptiuniListe } from "../src/modules/adm/optiuniListe.js";
import { asiguraCatalogBilka } from "./catalogTest.js";
import { citesteEtalon } from "./etalon/incarcaEtalon.js";
import { corpDinEtalon, preturiDinEtalon, puneCursulEtalonului } from "./etalonApi.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

// S22: retururile cu nota de retur (FISA-COMENZI cap. 5, OFERTARE cap. 19) si evidenta paletilor
// (cap. 8). Cifrele pe hartie, pe E01 (curs 5,3485; curs achizitie 5,4020; TVA 21 %):
//   2 x coama mica (pret document 5,93; achizitie 4,95) + 1 x opritor (3,95; 3,30)
//   = 11,86 + 3,95 = 15,81 EUR fara TVA; TVA 3,32; cu TVA 19,13 EUR; x 5,3485 = 102,32 lei
//   achizitia: 9,90 + 3,30 = 13,20 EUR x 5,4020 = 71,31 lei; x 1,21 = 86,29 lei
//   (linia coamei: 9,90 x 5,4020 = 53,48; x 1,21 = 64,71 lei)
// In vanzari: randul de retur cu minus sub comanda, lucrarea = 17.000 - 102,32 = 16.897,68 /
// cost 14.337,77 - 86,29 = 14.251,48 / net 2.646,20 / brut 2.186,94.

const app = creeazaApp();
const S = "-rt@exemplu.local";
const EMAIL = { adminGeneral: `admin-general${S}`, admin1: `admin1${S}`, agent1: `agent1${S}`, admin2: `admin2${S}`, gestiune: `gestiune${S}`, colab: `colab${S}` };
let firma1: string;

function dataLocala(delta = 0): string {
  const d = new Date(Date.now() + delta * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

beforeAll(async () => {
  const adminGeneral = await creeazaUtilizatorTest(EMAIL.adminGeneral, "ADMIN_GENERAL");
  await asiguraCatalogBilka(adminGeneral);
  await incarcaOptiuniListe(prisma);
  firma1 = (await prisma.firma.create({ data: { denumire: "Firma Retur 1", cui: "RO97", nrRegCom: "J97", adresa: "A", telefon: "1", email: `f1${S}` } })).id;
  const firma2 = (await prisma.firma.create({ data: { denumire: "Firma Retur 2", cui: "RO98", nrRegCom: "J98", adresa: "B", telefon: "2", email: `f2${S}` } })).id;
  const admin1 = await creeazaUtilizatorTest(EMAIL.admin1, "ADMINISTRATOR", { firmaId: firma1, serieOferta: "RTA", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.agent1, "AGENT", { firmaId: firma1, administratorId: admin1.id, serieOferta: "RTG", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.colab, "COLABORATOR", { firmaId: firma1, administratorId: admin1.id, serieOferta: "RTC", adaosProcent: 5 });
  await creeazaUtilizatorTest(EMAIL.admin2, "ADMINISTRATOR", { firmaId: firma2, serieOferta: "RTB", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.gestiune, "GESTIUNE", { accesGeneralFirme: true });
  for (const d of [dataLocala(0), dataLocala(-1)]) {
    await prisma.cursValutar.upsert({ where: { data_moneda: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR" } }, update: { curs: "5.3485" }, create: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR", curs: "5.3485", sursa: "test" } });
  }
}, 240_000);

afterAll(async () => {
  await prisma.$disconnect();
});

type Agent = Awaited<ReturnType<typeof autentificaAgent>>;
type Rand = Record<string, any>;
const CLIENT = { nume: "Client Retur", telefon: "0730000801", adresa: "Str. Retur 1", localitate: "Panciu" };

async function comanda(agent: Agent, etalon: string, client = CLIENT): Promise<{ ofertaId: string; comandaId: string; numarComplet: string }> {
  const { body } = await agent.post("/api/oferte").send({ client }).expect(201);
  const id = body.oferta.id as string;
  const e = citesteEtalon(etalon);
  const rp = await agent.put(`/api/oferte/${id}/produse`).send(await corpDinEtalon(e));
  expect(rp.status, JSON.stringify(rp.body)).toBe(200);
  await puneCursulEtalonului(id, e);
  const r = await agent.put(`/api/oferte/${id}/preturi`).send(preturiDinEtalon(e, rp.body.oferta.linii));
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  if (etalon === "E01") await agent.put(`/api/oferte/${id}/montator`).send({ montatorNou: { nume: "Gheorghe R.", telefon: "0740 111 333", tip: "MONTATOR" }, comisionRecomandareLei: "500" }).expect(200);
  await agent.put(`/api/oferte/${id}/status`).send({ status: "TRANSMISA" }).expect(200);
  await agent.put(`/api/oferte/${id}/status`).send({ status: "DE_COMANDAT" }).expect(200);
  const c = await agent.put(`/api/oferte/${id}/status`).send({ status: "COMANDAT" });
  expect(c.status, JSON.stringify(c.body)).toBe(200);
  const cmd = await prisma.comanda.findUniqueOrThrow({ where: { ofertaId: id } });
  return { ofertaId: id, comandaId: cmd.id, numarComplet: `${cmd.serie}-${String(cmd.numar).padStart(4, "0")}` };
}

const liniile = async (agent: Agent, comandaId: string) => {
  const r = await agent.get(`/api/comenzi/${comandaId}/retururi`).expect(200);
  return r.body as { retururi: Rand[]; linii: Rand[]; manuala: boolean; poateAnula: boolean };
};
const linia = (l: Rand[], cod: string) => l.find((x) => x.cod === cod)!;

describe("retururile (S22)", () => {
  let e01: Awaited<ReturnType<typeof comanda>>;
  let coama: string;
  let opritor: string;

  beforeAll(async () => {
    e01 = await comanda(await autentificaAgent(app, EMAIL.agent1), "E01");
    const { linii } = await liniile(await autentificaAgent(app, EMAIL.agent1), e01.comandaId);
    coama = linia(linii, "ACMICMAT050").linieId;
    opritor = linia(linii, "AOZ20MAT050").linieId;
    expect(linia(linii, "ACMICMAT050")).toMatchObject({ cantitateComandata: "13", cantitateReturnata: "0.000", pretDocumentEur: "5.93", um: "buc" });
  }, 300_000);

  it("returul pe E01 (2 coame mici + 1 opritor): cifrele pe hartie, istoric, nota de retur PDF ca document al comenzii", async () => {
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    const r = await agent1.post(`/api/comenzi/${e01.comandaId}/retururi`).send({ linii: [{ linieId: coama, cantitate: "2" }, { linieId: opritor, cantitate: "1" }], observatii: "coame în plus" });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    const ret = r.body.retur as Rand;
    expect(ret).toMatchObject({ numar: 1, stare: "ACTIV", data: dataLocala(0), sumaFaraTvaEur: "15.81", tvaEur: "3.32", sumaCuTvaEur: "19.13", sumaCuTvaLei: "102.32", achizitieLei: "86.29", cursBnr: "5.3485", observatii: "coame în plus", deRegularizat: false, anulatLa: null });
    expect(ret.linii).toHaveLength(2);
    expect(ret.linii.find((l: Rand) => l.cod === "ACMICMAT050")).toMatchObject({ denumire: expect.stringMatching(/coam/i), cantitate: "2.000", pretDocumentEur: "5.93", valoareEur: "11.86", achizitieLei: "64.71" });
    expect(ret.linii.find((l: Rand) => l.cod === "AOZ20MAT050")).toMatchObject({ cantitate: "1.000", pretDocumentEur: "3.95", valoareEur: "3.95" });
    expect(ret.documentId).toBeTruthy();
    // randul comenzii poarta retururile active pe scurt
    expect(r.body.comanda.retururi).toEqual([{ id: ret.id, numar: 1, sumaCuTvaLei: "102.32", deRegularizat: false }]);

    // nota de retur: document al ofertei comandate, tip NOTA_RETUR, listat in "Doc." al comenzii, cu textul pe hartie
    const d = await prisma.ofertaDocument.findUniqueOrThrow({ where: { id: ret.documentId } });
    expect(d).toMatchObject({ ofertaId: e01.ofertaId, tip: "NOTA_RETUR" });
    expect(d.nume).toMatch(/-nota-retur-1-/);
    const detaliu = (await agent1.get(`/api/comenzi/${e01.comandaId}`).expect(200)).body.comanda as Rand;
    expect(detaliu.documente.find((x: Rand) => x.id === d.id)).toMatchObject({ tip: "NOTA_RETUR", eticheta: "Notă de retur" });
    expect(detaliu.retururi).toHaveLength(1);
    expect(detaliu.istoric.find((i: Rand) => i.tip === "retur")).toMatchObject({ camp: "retur", valoareDupa: expect.stringContaining("102.32") });
    const pdf = await agent1.get(`/api/comenzi/${e01.comandaId}/documente/${d.id}`).expect(200);
    expect(pdf.headers["content-type"]).toContain("pdf");
    const text = (await new PDFParse({ data: new Uint8Array(await readFile(path.join(env.dateDir, d.fisier))) }).getText()).text;
    expect(text).toContain("NOTĂ DE RETUR");
    expect(text).toContain("Nota de retur nr. 1");
    expect(text).toContain(e01.numarComplet);
    for (const s of ["15,81", "3,32", "19,13", "102,32", "5,93", "3,95", "11,86"]) expect(text, s).toContain(s);
    // colaboratorul vede nota de retur (nu tabelul de facturare): regula documentelor
    const { vedeDocumentulComenzii } = await import("../src/modules/com/vizibilitate.js");
    expect(vedeDocumentulComenzii({ rol: "COLABORATOR" } as never, "NOTA_RETUR")).toBe(true);
    expect(vedeDocumentulComenzii({ rol: "COLABORATOR" } as never, "TABEL_FACTURARE")).toBe(false);
  });

  it("limita pe cantitate: peste retururile active (13 coame comandate, 2 returnate -> cel mult 11); zero sau linie straina refuzate", async () => {
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    const { linii } = await liniile(agent1, e01.comandaId);
    expect(linia(linii, "ACMICMAT050")).toMatchObject({ cantitateComandata: "13", cantitateReturnata: "2.000" });
    const prea = await agent1.post(`/api/comenzi/${e01.comandaId}/retururi`).send({ linii: [{ linieId: coama, cantitate: "12" }] });
    expect(prea.status).toBe(400);
    expect(prea.body.motive[0]).toContain("cel mult 11.000");
    await agent1.post(`/api/comenzi/${e01.comandaId}/retururi`).send({ linii: [{ linieId: coama, cantitate: "0" }] }).expect(400);
    await agent1.post(`/api/comenzi/${e01.comandaId}/retururi`).send({ linii: [{ linieId: "nu-exista", cantitate: "1" }] }).expect(400);
    // exact restul merge si e returul 2; apoi nu mai ramane nimic de returnat la coama
    const ok = await agent1.post(`/api/comenzi/${e01.comandaId}/retururi`).send({ linii: [{ linieId: coama, cantitate: "11" }] }).expect(201);
    expect(ok.body.retur).toMatchObject({ numar: 2, sumaFaraTvaEur: "65.23" });
    await agent1.post(`/api/comenzi/${e01.comandaId}/retururi`).send({ linii: [{ linieId: coama, cantitate: "1" }] }).expect(400);
  });

  it("anularea cu motiv: doar Administratorul firmei; returul ramane (ANULAT), cantitatea se elibereaza, nota nu se regenereaza", async () => {
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    const r2 = (await liniile(agent1, e01.comandaId)).retururi.find((x) => x.numar === 2)!;
    await agent1.put(`/api/comenzi/${e01.comandaId}/retururi/${r2.id}/anuleaza`).send({ motiv: "greșit" }).expect(403);
    await (await autentificaAgent(app, EMAIL.admin2)).put(`/api/comenzi/${e01.comandaId}/retururi/${r2.id}/anuleaza`).send({ motiv: "greșit" }).expect(403);
    await admin1.put(`/api/comenzi/${e01.comandaId}/retururi/${r2.id}/anuleaza`).send({ motiv: "" }).expect(400);
    const a = await admin1.put(`/api/comenzi/${e01.comandaId}/retururi/${r2.id}/anuleaza`).send({ motiv: "cantitate greșită" }).expect(200);
    expect(a.body.retur).toMatchObject({ stare: "ANULAT", motivAnulare: "cantitate greșită", anulatDe: expect.any(String), documentId: r2.documentId });
    await admin1.put(`/api/comenzi/${e01.comandaId}/retururi/${r2.id}/anuleaza`).send({ motiv: "iar" }).expect(409);
    const dupa = await liniile(agent1, e01.comandaId);
    expect(dupa.retururi.map((x) => [x.numar, x.stare])).toEqual([[1, "ACTIV"], [2, "ANULAT"]]);
    expect(linia(dupa.linii, "ACMICMAT050").cantitateReturnata).toBe("2.000");
    expect(dupa.poateAnula).toBe(false);
    expect(await prisma.ofertaDocument.count({ where: { ofertaId: e01.ofertaId, tip: "NOTA_RETUR" } })).toBe(2);
    const detaliu = (await admin1.get(`/api/comenzi/${e01.comandaId}`).expect(200)).body.comanda as Rand;
    expect(detaliu.istoric.find((i: Rand) => i.camp === "anulare")).toMatchObject({ tip: "retur", mentiuni: "cantitate greșită" });
    expect(detaliu.drepturi).toMatchObject({ retur: true, anuleazaRetur: true });
  });

  it("in vanzari: randul de retur cu minus sub comanda, fara comision; lucrarea recalculata; statisticile scad", async () => {
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    const r = (await admin1.get("/api/vanzari").expect(200)).body as { randuri: Rand[]; statistici: Rand };
    const parinte = r.randuri.find((x) => x.comandaId === e01.comandaId)!;
    expect(parinte).toMatchObject({ pretVanzareLei: "17000.00", costAchizitieLei: "14337.77", retur: null });
    expect(parinte.copii).toHaveLength(1);
    expect(parinte.copii[0]).toMatchObject({ numarComplet: `Retur 1 la ${e01.numarComplet}`, data: dataLocala(0), pretVanzareLei: "-102.32", costAchizitieLei: "-86.29", adaosNetLei: "-16.03", adaosBrutLei: "-13.25", comisionRecomandare: null, comisionAgent: null, retur: { numar: 1, deRegularizat: false } });
    expect(parinte.lucrare).toEqual({ pretVanzareLei: "16897.68", costAchizitieLei: "14251.48", adaosNetLei: "2646.20", adaosBrutLei: "2186.94", comenzi: 1 });
    expect(r.statistici).toMatchObject({ comenzi: 1, pretVanzareLei: "16897.68", costAchizitieLei: "14251.48", adaosNetLei: "2646.20" });
  });

  it("de regularizat: returul facut dupa ce comisionul era achitat ramane marcat pana il bifeaza Administratorul firmei", async () => {
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    await admin1.put(`/api/comenzi/${e01.comandaId}/comision/achitat`).send({ achitat: true }).expect(200);
    const r = await agent1.post(`/api/comenzi/${e01.comandaId}/retururi`).send({ linii: [{ linieId: opritor, cantitate: "1" }] }).expect(201);
    expect(r.body.retur).toMatchObject({ numar: 3, deRegularizat: true, sumaCuTvaEur: "4.78" });
    const v = (await admin1.get("/api/vanzari").expect(200)).body as { randuri: Rand[] };
    const rr = v.randuri.find((x) => x.comandaId === e01.comandaId)!.copii.find((k: Rand) => k.retur?.numar === 3);
    expect(rr.retur.deRegularizat).toBe(true);
    await agent1.put(`/api/comenzi/${e01.comandaId}/retururi/${r.body.retur.id}/regularizat`).expect(403);
    const b = await admin1.put(`/api/comenzi/${e01.comandaId}/retururi/${r.body.retur.id}/regularizat`).expect(200);
    expect(b.body.retur).toMatchObject({ deRegularizat: false, regularizatDe: expect.any(String) });
    await admin1.put(`/api/comenzi/${e01.comandaId}/retururi/${r.body.retur.id}/regularizat`).expect(409);
  });

  it("drepturi: orice cont care vede comanda face retur (Gestiunea da, colaboratorul strain nu vede comanda); comanda manuala n-are retur cu linii", async () => {
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    const { linii } = await liniile(gestiune, e01.comandaId);
    const sipca = linii.find((l) => !["ACMICMAT050", "AOZ20MAT050"].includes(l.cod) && Number(l.cantitateComandata) >= 1)!;
    const g = await gestiune.post(`/api/comenzi/${e01.comandaId}/retururi`).send({ linii: [{ linieId: sipca.linieId, cantitate: "1" }] });
    expect(g.status, JSON.stringify(g.body)).toBe(201);
    // lista de comenzi e comuna (S19): Administratorul altei firme vede comanda, deci poate face retur, dar nu anuleaza
    expect((await (await autentificaAgent(app, EMAIL.admin2)).get(`/api/comenzi/${e01.comandaId}/retururi`).expect(200)).body.poateAnula).toBe(false);
    await (await autentificaAgent(app, EMAIL.colab)).get(`/api/comenzi/${e01.comandaId}/retururi`).expect(404);
    const m = await admin1.post("/api/comenzi").send({ client: { ...CLIENT, nume: "Client Manual", telefon: "0730000802" }, rezumat: "manual", totalLei: "1000", data: dataLocala(0) });
    expect(m.status, JSON.stringify(m.body)).toBe(201);
    const idManuala = m.body.comanda.id as string;
    const rm = await admin1.post(`/api/comenzi/${idManuala}/retururi`).send({ linii: [{ linieId: "x", cantitate: "1" }] });
    expect(rm.status).toBe(409);
    expect(rm.body.eroare).toContain("corecția sumelor");
    expect((await liniile(admin1, idManuala)).manuala).toBe(true);
    expect((await admin1.get(`/api/comenzi/${idManuala}`).expect(200)).body.comanda.drepturi.retur).toBe(false);
  });
});

describe("evidenta paletilor (S22)", () => {
  let c1: Awaited<ReturnType<typeof comanda>>;
  let c2: Awaited<ReturnType<typeof comanda>>;

  beforeAll(async () => {
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    c1 = await comanda(agent1, "E03", { ...CLIENT, nume: "Client Palet 1", telefon: "0730000803", localitate: "Odobești" });
    c2 = await comanda(agent1, "E03", { ...CLIENT, nume: "Client Palet 2", telefon: "0730000804" });
  }, 300_000);

  it("nota de palet: Gestiunea si Administratorii o scriu (cu istoric), agentul nu; statusul il schimba doar Administratorul / Admin general", async () => {
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    await agent1.put(`/api/comenzi/${c1.comandaId}/nota-palet`).send({ text: "1 palet" }).expect(403);
    const n = await gestiune.put(`/api/comenzi/${c1.comandaId}/nota-palet`).send({ text: "2 paleți rămași la client, în curte" }).expect(200);
    expect(n.body.comanda.palet).toMatchObject({ nota: "2 paleți rămași la client, în curte", recuperat: false, recuperatLa: null, notatDe: expect.any(String) });
    // Gestiunea nu schimba statusul; Administratorul da, cu data si istoric
    await gestiune.put(`/api/comenzi/${c1.comandaId}/palet-recuperat`).send({ recuperat: true }).expect(403);
    await admin1.put(`/api/comenzi/${c2.comandaId}/palet-recuperat`).send({ recuperat: true }).expect(409);
    await admin1.put(`/api/comenzi/${c2.comandaId}/nota-palet`).send({ text: "1 palet mare" }).expect(200);
    const s = await admin1.put(`/api/comenzi/${c1.comandaId}/palet-recuperat`).send({ recuperat: true }).expect(200);
    expect(s.body.comanda.palet).toMatchObject({ recuperat: true, recuperatDe: expect.any(String) });
    expect(s.body.comanda.palet.recuperatLa).toBeTruthy();
    await admin1.put(`/api/comenzi/${c1.comandaId}/palet-recuperat`).send({ recuperat: true }).expect(409);
    const detaliu = (await admin1.get(`/api/comenzi/${c1.comandaId}`).expect(200)).body.comanda as Rand;
    expect(detaliu.istoric.filter((i: Rand) => i.tip === "palet").map((i: Rand) => i.camp).sort()).toEqual(["notaPalet", "paletRecuperat"]);
    expect(detaliu.drepturi).toMatchObject({ notaPalet: true, statusPalet: true });
    const dg = (await gestiune.get(`/api/comenzi/${c1.comandaId}`).expect(200)).body.comanda as Rand;
    expect(dg.drepturi).toMatchObject({ notaPalet: true, statusPalet: false });
    // Admin general schimba statusul oriunde
    await (await autentificaAgent(app, EMAIL.adminGeneral)).put(`/api/comenzi/${c1.comandaId}/palet-recuperat`).send({ recuperat: false }).expect(200);
  });

  it("evidenta: implicit nerecuperatii, cei mai vechi sus; filtrul recuperati / client; numaratorul in capul tabelului, peste toate comenzile vizibile", async () => {
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    const lista = (await admin1.get("/api/comenzi/paleti").expect(200)).body as { paleti: Rand[]; nerecuperati: number; poateSchimbaStatus: boolean };
    const ai = lista.paleti.map((p) => p.id);
    expect(ai.indexOf(c1.comandaId)).toBeLessThan(ai.indexOf(c2.comandaId));
    expect(lista.paleti.every((p) => p.palet.recuperat === false)).toBe(true);
    expect(lista.nerecuperati).toBeGreaterThanOrEqual(2);
    expect(lista.poateSchimbaStatus).toBe(true);
    await admin1.put(`/api/comenzi/${c1.comandaId}/palet-recuperat`).send({ recuperat: true }).expect(200);
    const rec = (await admin1.get("/api/comenzi/paleti?recuperati=da").expect(200)).body as { paleti: Rand[] };
    expect(rec.paleti.map((p) => p.id)).toContain(c1.comandaId);
    expect(rec.paleti.map((p) => p.id)).not.toContain(c2.comandaId);
    const dupaClient = (await admin1.get("/api/comenzi/paleti?recuperati=toti&q=Palet 1").expect(200)).body as { paleti: Rand[] };
    expect(dupaClient.paleti.map((p) => p.id)).toEqual([c1.comandaId]);
    // numaratorul din lista de comenzi: peste toate comenzile vizibile, indiferent de perioada
    const comenzi = (await admin1.get("/api/comenzi?deLa=2020-01-01&panaLa=2020-01-02").expect(200)).body as { comenzi: Rand[]; numaratori: Rand };
    expect(comenzi.comenzi).toHaveLength(0);
    expect(comenzi.numaratori.paletiNerecuperati).toBe((await admin1.get("/api/comenzi/paleti").expect(200)).body.nerecuperati);
    expect(comenzi.numaratori.paletiNerecuperati).toBeGreaterThanOrEqual(1);
    // Gestiunea vede evidenta, fara sa schimbe statusul; colaboratorul vede doar comenzile lui (niciuna aici)
    expect((await (await autentificaAgent(app, EMAIL.gestiune)).get("/api/comenzi/paleti").expect(200)).body.poateSchimbaStatus).toBe(false);
    expect((await (await autentificaAgent(app, EMAIL.colab)).get("/api/comenzi/paleti?recuperati=toti").expect(200)).body.paleti.map((p: Rand) => p.id)).not.toContain(c2.comandaId);
  });
});
