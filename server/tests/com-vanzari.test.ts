import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { incarcaOptiuniListe } from "../src/modules/adm/optiuniListe.js";
import { asiguraCatalogBilka } from "./catalogTest.js";
import { citesteEtalon } from "./etalon/incarcaEtalon.js";
import { corpDinEtalon, preturiDinEtalon, puneCursulEtalonului } from "./etalonApi.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

// S21: tabelul de vanzari (FISA-OFERTARE cap. 19, FISA-COMENZI cap. 7): randul din rezultatul
// salvat la "Comandat" (E01), randul colaboratorului in tabelul Administratorului (E03), costul
// fara grupa (E05), lucrarea E01 + E10, comanda manuala fara sume si completarea ei, comisionul
// agentului cu istoric si "achitat", filtrul incasat / neincasat peste luni, statisticile,
// drepturile pe roluri.

const app = creeazaApp();
const S = "-vz@exemplu.local";
const EMAIL = { adminGeneral: `admin-general${S}`, admin1: `admin1${S}`, agent1: `agent1${S}`, agent2: `agent2${S}`, colab: `colab${S}`, admin2: `admin2${S}`, contabil: `contabil${S}`, gestiune: `gestiune${S}` };
let firma1: string;
let idAdmin1: string;
let idAgent1: string;
let idAgent2: string;
let idColab: string;

function dataLocala(delta = 0): string {
  const d = new Date(Date.now() + delta * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

beforeAll(async () => {
  const adminGeneral = await creeazaUtilizatorTest(EMAIL.adminGeneral, "ADMIN_GENERAL");
  await asiguraCatalogBilka(adminGeneral);
  await incarcaOptiuniListe(prisma);
  firma1 = (await prisma.firma.create({ data: { denumire: "Firma Vanzari 1", cui: "RO95", nrRegCom: "J95", adresa: "A", telefon: "1", email: `f1${S}` } })).id;
  const firma2 = (await prisma.firma.create({ data: { denumire: "Firma Vanzari 2", cui: "RO96", nrRegCom: "J96", adresa: "B", telefon: "2", email: `f2${S}` } })).id;
  const admin1 = await creeazaUtilizatorTest(EMAIL.admin1, "ADMINISTRATOR", { firmaId: firma1, serieOferta: "VZA", adaosProcent: 1 });
  idAdmin1 = admin1.id;
  idAgent1 = (await creeazaUtilizatorTest(EMAIL.agent1, "AGENT", { firmaId: firma1, administratorId: admin1.id, serieOferta: "VZG", adaosProcent: 1 })).id;
  idAgent2 = (await creeazaUtilizatorTest(EMAIL.agent2, "AGENT", { firmaId: firma1, administratorId: admin1.id, serieOferta: "VZH", adaosProcent: 1 })).id;
  idColab = (await creeazaUtilizatorTest(EMAIL.colab, "COLABORATOR", { firmaId: firma1, administratorId: admin1.id, serieOferta: "VZC", adaosProcent: 5 })).id;
  await creeazaUtilizatorTest(EMAIL.admin2, "ADMINISTRATOR", { firmaId: firma2, serieOferta: "VZB", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.contabil, "CONTABILITATE", { accesGeneralFirme: true });
  await creeazaUtilizatorTest(EMAIL.gestiune, "GESTIUNE", { accesGeneralFirme: true });
  for (const d of [dataLocala(0), dataLocala(-1)]) {
    await prisma.cursValutar.upsert({ where: { data_moneda: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR" } }, update: { curs: "5.3485" }, create: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR", curs: "5.3485", sursa: "test" } });
  }
}, 240_000);

afterAll(async () => {
  await prisma.$disconnect();
});

type Agent = Awaited<ReturnType<typeof autentificaAgent>>;
const CLIENT = { nume: "Client Vanzari", telefon: "0730000701", adresa: "Str. Vânzări 1", localitate: "Mărășești" };

// o oferta-model dusa la "Comandat" (fara avans; comision de recomandare 500 la E01)
async function comanda(agent: Agent, etalon: string, client = CLIENT, extra?: { completareLa?: string }): Promise<{ ofertaId: string; comandaId: string; numarComplet: string }> {
  const { body } = await agent.post("/api/oferte").send({ client }).expect(201);
  const id = body.oferta.id as string;
  // completarea (cap. 2b) se leaga inainte de preturi: tinta 0 a E10 e permisa doar legata
  if (extra?.completareLa) await agent.put(`/api/oferte/${id}/completare-la`).send({ ofertaId: extra.completareLa, motiv: "Altele" }).expect(200);
  const e = citesteEtalon(etalon);
  const corp = await corpDinEtalon(e);
  const rp = await agent.put(`/api/oferte/${id}/produse`).send(corp);
  expect(rp.status, JSON.stringify(rp.body)).toBe(200);
  await puneCursulEtalonului(id, e);
  const r = await agent.put(`/api/oferte/${id}/preturi`).send(preturiDinEtalon(e, rp.body.oferta.linii));
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  if (etalon === "E01") await agent.put(`/api/oferte/${id}/montator`).send({ montatorNou: { nume: "Gheorghe V.", telefon: "0740 111 222", tip: "MONTATOR" }, comisionRecomandareLei: "500" }).expect(200);
  await agent.put(`/api/oferte/${id}/status`).send({ status: "TRANSMISA" }).expect(200);
  await agent.put(`/api/oferte/${id}/status`).send({ status: "DE_COMANDAT" }).expect(200);
  const c = await agent.put(`/api/oferte/${id}/status`).send({ status: "COMANDAT" });
  expect(c.status, JSON.stringify(c.body)).toBe(200);
  const cmd = await prisma.comanda.findUniqueOrThrow({ where: { ofertaId: id } });
  return { ofertaId: id, comandaId: cmd.id, numarComplet: `${cmd.serie}-${String(cmd.numar).padStart(4, "0")}` };
}

type Rand = Record<string, any>;
const vanzari = async (agent: Agent, filtre: Record<string, string> = {}) => {
  const r = await agent.get(`/api/vanzari?${new URLSearchParams(filtre).toString()}`);
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body as { randuri: Rand[]; statistici: Rand | null; perioada: { deLa: string; panaLa: string } | null; poateScrie: boolean };
};
const randul = (r: { randuri: Rand[] }, comandaId: string) => [...r.randuri, ...r.randuri.flatMap((x) => x.copii as Rand[])].find((x) => x.comandaId === comandaId);

describe("tabelul de vanzari", () => {
  let e01: Awaited<ReturnType<typeof comanda>>;
  let e03: Awaited<ReturnType<typeof comanda>>;
  let e05: Awaited<ReturnType<typeof comanda>>;
  let e10: Awaited<ReturnType<typeof comanda>>;

  beforeAll(async () => {
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    e01 = await comanda(agent1, "E01");
    e03 = await comanda(await autentificaAgent(app, EMAIL.colab), "E03", { ...CLIENT, nume: "Client Colab", telefon: "0730000702" });
    e05 = await comanda(await autentificaAgent(app, EMAIL.agent2), "E05", { ...CLIENT, nume: "Client Grupa", telefon: "0730000703" });
    e10 = await comanda(agent1, "E10", CLIENT, { completareLa: e01.ofertaId });
  }, 300_000);

  it("randul vine din rezultatul salvat la Comandat (E01): vanzare, cost real, adaos net si brut; sursa recomandarii si comisionul ei de pe comanda", async () => {
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    const r = await vanzari(admin1);
    const x = randul(r, e01.comandaId)!;
    expect(x).toMatchObject({ manuala: false, faraSume: false, tabel: "propriu", agent: { id: idAgent1 }, tabelulLui: idAgent1, pretVanzareLei: "17000.00", costAchizitieLei: "14337.77", adaosNetLei: "2662.23", adaosBrutLei: "2200.19", sursaRecomandarii: "Gheorghe V.", comisionRecomandare: { lei: "500.00", achitat: false }, comisionAgent: null, data: dataLocala(0), client: { nume: "Client Vanzari", localitate: "Mărășești" } });
    expect(x.incasare.status).toBe("NEINCASAT");
    expect(r.poateScrie).toBe(true);
    expect(r.perioada).toEqual({ deLa: `${dataLocala(0).slice(0, 7)}-01`, panaLa: dataLocala(0) });
  });

  it("colaboratorul (E03): randul e al Administratorului - vanzare = achizitia colaboratorului, cost = baza; colaboratorul n-are tabel", async () => {
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    const x = randul(await vanzari(admin1), e03.comandaId)!;
    expect(x).toMatchObject({ tabel: "administrator", tabelulLui: idAdmin1, agent: { id: idColab, rol: "COLABORATOR" }, pretVanzareLei: "3751.94", costAchizitieLei: "3572.21", adaosNetLei: "179.73", adaosBrutLei: "148.54" });
    await (await autentificaAgent(app, EMAIL.colab)).get("/api/vanzari").expect(403);
  });

  it("costul e achizitia reala, fara grupa (E05)", async () => {
    const x = randul(await vanzari(await autentificaAgent(app, EMAIL.admin1)), e05.comandaId)!;
    expect(x).toMatchObject({ pretVanzareLei: "15355.44", costAchizitieLei: "14337.77", adaosNetLei: "1017.67", adaosBrutLei: "841.05", agent: { id: idAgent2 } });
  });

  it("lucrarea: completarea (E10) sub comanda initiala (E01), cu adaosul pe lucrare", async () => {
    const r = await vanzari(await autentificaAgent(app, EMAIL.admin1));
    const parinte = r.randuri.find((x) => x.comandaId === e01.comandaId)!;
    expect(parinte.copii.map((k: Rand) => k.comandaId)).toEqual([e10.comandaId]);
    expect(parinte.copii[0]).toMatchObject({ completareLa: { numarComplet: e01.numarComplet }, pretVanzareLei: "0.00", costAchizitieLei: "202.05", adaosNetLei: "-202.05", adaosBrutLei: "-166.98" });
    expect(parinte.lucrare).toEqual({ pretVanzareLei: "17000.00", costAchizitieLei: "14539.82", adaosNetLei: "2460.18", adaosBrutLei: "2033.21", comenzi: 2 });
    expect(r.randuri.some((x) => x.comandaId === e10.comandaId)).toBe(false);
  });

  it("cine vede ce: agentul propriul tabel fara statistici si fara sa scrie; Admin general tot cu statistici, fara sa scrie; Contabilitatea si Gestiunea nu", async () => {
    const agent1 = await autentificaAgent(app, EMAIL.agent1);
    const r1 = await vanzari(agent1);
    const ids = [...r1.randuri, ...r1.randuri.flatMap((x) => x.copii as Rand[])].map((x) => x.comandaId);
    expect(ids.sort()).toEqual([e01.comandaId, e10.comandaId].sort());
    expect(r1.statistici).toBeNull();
    expect(r1.poateScrie).toBe(false);
    const ag = await vanzari(await autentificaAgent(app, EMAIL.adminGeneral), { firmaId: firma1 });
    expect(ag.statistici).not.toBeNull();
    expect(ag.poateScrie).toBe(false);
    await (await autentificaAgent(app, EMAIL.contabil)).get("/api/vanzari").expect(403);
    await (await autentificaAgent(app, EMAIL.gestiune)).get("/api/vanzari").expect(403);
    // Administratorul altei firme nu vede firma 1
    expect((await vanzari(await autentificaAgent(app, EMAIL.admin2))).randuri).toEqual([]);
  });

  it("comisionul agentului: scris de Administrator cu istoric (asterisc) si 'achitat'; agentul il vede, nu-l scrie; Admin general nu scrie", async () => {
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    await (await autentificaAgent(app, EMAIL.agent1)).put(`/api/comenzi/${e01.comandaId}/comision-agent`).send({ comisionAgentLei: "1000" }).expect(403);
    await (await autentificaAgent(app, EMAIL.adminGeneral)).put(`/api/comenzi/${e01.comandaId}/comision-agent`).send({ comisionAgentLei: "1000" }).expect(403);
    await admin1.put(`/api/comenzi/${e01.comandaId}/comision-agent/achitat`).send({ achitat: true }).expect(409); // nu e nimic de achitat
    const r = await admin1.put(`/api/comenzi/${e01.comandaId}/comision-agent`).send({ comisionAgentLei: "1000", mentiuni: "5 % din vânzare" });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.comisionAgent).toEqual({ lei: "1000.00", achitat: false });
    await admin1.put(`/api/comenzi/${e01.comandaId}/comision-agent`).send({ comisionAgentLei: "1200" }).expect(200);
    const x = randul(await vanzari(admin1), e01.comandaId)!;
    expect(x.comisionAgent).toMatchObject({ lei: "1200.00", achitat: false });
    expect(x.comisionAgentModificat).toBe(true);
    const istoric = await prisma.comandaIstoric.findMany({ where: { comandaId: e01.comandaId, camp: "comisionAgentLei" }, orderBy: { moment: "asc" } });
    expect(istoric.map((i) => `${i.valoareInainte ?? "—"}→${i.valoareDupa}`)).toEqual(["—→1000.00", "1000.00→1200.00"]);
    expect(istoric[0].mentiuni).toBe("5 % din vânzare");
    await (await autentificaAgent(app, EMAIL.agent1)).put(`/api/comenzi/${e01.comandaId}/comision-agent/achitat`).send({ achitat: true }).expect(403);
    const a = await admin1.put(`/api/comenzi/${e01.comandaId}/comision-agent/achitat`).send({ achitat: true });
    expect(a.status).toBe(200);
    expect(a.body.comisionAgent).toMatchObject({ lei: "1200.00", achitat: true, achitatDe: "Test ADMINISTRATOR" });
    const ag = randul(await vanzari(await autentificaAgent(app, EMAIL.agent1)), e01.comandaId)!;
    expect(ag.comisionAgent).toMatchObject({ lei: "1200.00", achitat: true });
  });

  it("comanda manuala intra fara sume (in afara totalurilor) pana le completeaza Administratorul firmei; neidentificata nu se poate completa", async () => {
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    const m = await admin1.post("/api/comenzi").send({ client: { nume: "Manual Vanzari", telefon: "0730000704", localitate: "Panciu" }, rezumat: "T18 9005 mat 0,5 — 140 mp", totalLei: "14120" }).expect(201);
    const id = m.body.comanda.id as string;
    let x = randul(await vanzari(admin1), id)!;
    expect(x).toMatchObject({ manuala: true, faraSume: true, pretVanzareLei: null, costAchizitieLei: null, agent: null });
    await admin1.put(`/api/comenzi/${id}/sume-vanzare`).send({ pretVanzareLei: "14120", costAchizitieLei: "12100" }).expect(409); // neidentificata
    await admin1.put(`/api/comenzi/${id}/alocare`).send({ contAlocatId: idAgent2 }).expect(200);
    await (await autentificaAgent(app, EMAIL.agent2)).put(`/api/comenzi/${id}/sume-vanzare`).send({ pretVanzareLei: "14120", costAchizitieLei: "12100" }).expect(403);
    const s = await admin1.put(`/api/comenzi/${id}/sume-vanzare`).send({ pretVanzareLei: "14120", costAchizitieLei: "12100", mentiuni: "din factura Bilka" });
    expect(s.status, JSON.stringify(s.body)).toBe(200);
    x = randul(await vanzari(admin1), id)!;
    expect(x).toMatchObject({ faraSume: false, pretVanzareLei: "14120.00", costAchizitieLei: "12100.00", adaosNetLei: "2020.00", adaosBrutLei: "1669.42", agent: { id: idAgent2 } });
    expect(await prisma.comandaIstoric.count({ where: { comandaId: id, tip: "suma", camp: { in: ["vanzarePretLei", "vanzareCostLei"] } } })).toBe(2);
    await admin1.put(`/api/comenzi/${e01.comandaId}/sume-vanzare`).send({ pretVanzareLei: "1", costAchizitieLei: "1" }).expect(409); // din oferta: nu
  });

  it("statisticile pe selectie (Administrator): totaluri, comisioane, procent de adaos; randurile fara sume nu intra", async () => {
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    const m2 = await admin1.post("/api/comenzi").send({ client: { nume: "Manual Fara Sume", telefon: "0730000705" }, rezumat: "x", totalLei: "100" }).expect(201);
    const r = await vanzari(admin1, { agent: `${idAgent1},${idAgent2}` });
    const toate = [...r.randuri, ...r.randuri.flatMap((x) => x.copii as Rand[])];
    expect(toate.map((x) => x.comandaId)).not.toContain(e03.comandaId); // colaboratorul nu e in lista de agenti ceruta
    expect(toate.map((x) => x.comandaId)).not.toContain(m2.body.comanda.id); // neidentificata: fara cont, nu intra in filtrul pe agenti
    expect(toate.map((x) => x.comandaId)).toContain(e05.comandaId);
    const s = r.statistici!;
    // E01 17000/14337.77 + E10 0/202.05 + E05 15355.44/14337.77 + manuala 14120/12100 (m2 e neidentificata: nu are agent -> nu intra in filtrul pe agenti)
    expect(s).toMatchObject({ comenzi: 4, faraSume: 0, pretVanzareLei: "46475.44", costAchizitieLei: "40977.59", adaosNetLei: "5497.85", adaosBrutLei: "4543.68", comisioaneLei: "1700.00" });
    expect(s.procentAdaos).toBe("13.42");
    const tot = (await vanzari(admin1)).statistici!;
    expect(tot.faraSume).toBe(1);
    expect(tot.comenzi).toBe(6);
  });

  it("filtrul incasat / neincasat traverseaza lunile: o comanda din alta luna nu e in perioada implicita, dar e in 'neincasat'", async () => {
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    const lunaTrecuta = new Date(new Date(`${dataLocala(0)}T00:00:00Z`).getTime() - 40 * 24 * 3600 * 1000);
    await prisma.comanda.update({ where: { id: e05.comandaId }, data: { data: lunaTrecuta } });
    expect(randul(await vanzari(admin1), e05.comandaId)).toBeUndefined();
    const ne = await vanzari(admin1, { incasare: "neincasat" });
    expect(ne.perioada).toBeNull();
    expect(randul(ne, e05.comandaId)).toBeDefined();
    expect(randul(await vanzari(admin1, { incasare: "incasat" }), e05.comandaId)).toBeUndefined();
    await admin1.post(`/api/comenzi/${e05.comandaId}/incasari`).send({ sumaLei: "15355.44", data: dataLocala(0), ceReprezinta: "integral, transfer" }).expect(201);
    expect(randul(await vanzari(admin1, { incasare: "incasat" }), e05.comandaId)).toMatchObject({ incasare: { status: "INCASAT" } });
    expect(randul(await vanzari(admin1, { incasare: "neincasat" }), e05.comandaId)).toBeUndefined();
    // interval explicit
    expect(randul(await vanzari(admin1, { deLa: dataLocala(-60), panaLa: dataLocala(0) }), e05.comandaId)).toBeDefined();
  });
});
