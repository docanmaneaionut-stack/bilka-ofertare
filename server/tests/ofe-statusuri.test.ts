import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { incarcaOptiuniListe } from "../src/modules/adm/optiuniListe.js";
import type { FisierEtalon } from "../src/modules/mot/etalon.js";
import { asiguraCatalogBilka } from "./catalogTest.js";
import { citesteEtalon, compara, raport, vanzariSpreAsteptat } from "./etalon/incarcaEtalon.js";
import { corpDinEtalon, preturiDinEtalon, puneCursulEtalonului } from "./etalonApi.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

// S15: statusurile (cap. 14), istoricul de la "Transmisa", trecerea in comanda
// (cap. 16, 3.2) cu rezultatul motorului salvat si randul de comanda minim,
// montatorii si recomandarea (cap. 12), notitele si atasamentele, legarea
// ulterioara ca completare (cap. 2b), copierea ofertei (cap. 15).

const app = creeazaApp();
const S = "-st@exemplu.local";
const EMAIL = { adminGeneral: `admin-general${S}`, admin1: `admin1${S}`, agent1: `agent1${S}`, agent2: `agent2${S}` };
let firma1: string;

function dataLocala(delta = 0): string {
  const d = new Date(Date.now() + delta * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

beforeAll(async () => {
  const adminGeneral = await creeazaUtilizatorTest(EMAIL.adminGeneral, "ADMIN_GENERAL");
  await asiguraCatalogBilka(adminGeneral);
  await incarcaOptiuniListe(prisma);
  firma1 = (await prisma.firma.create({ data: { denumire: "Firma Statusuri", cui: "RO51", nrRegCom: "J51", adresa: "A", telefon: "1", email: `f1${S}` } })).id;
  const admin1 = await creeazaUtilizatorTest(EMAIL.admin1, "ADMINISTRATOR", { firmaId: firma1, serieOferta: "STA", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.agent1, "AGENT", { firmaId: firma1, administratorId: admin1.id, serieOferta: "STG", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.agent2, "AGENT", { firmaId: firma1, administratorId: admin1.id, serieOferta: "STX", adaosProcent: 1 });
  for (const d of [dataLocala(0), dataLocala(-1)]) {
    await prisma.cursValutar.upsert({ where: { data_moneda: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR" } }, update: { curs: "5.3485" }, create: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR", curs: "5.3485", sursa: "test" } });
  }
}, 240_000);

afterAll(async () => {
  await prisma.$disconnect();
});

const CLIENT = { nume: "Client Statusuri", telefon: "0730000201", adresa: "Str. Status 1", localitate: "Focșani" };
type Agent = Awaited<ReturnType<typeof autentificaAgent>>;

async function ofertaNoua(agent: Agent): Promise<string> {
  const { body } = await agent.post("/api/oferte").send({ client: CLIENT }).expect(201);
  return body.oferta.id as string;
}

// oferta-model construita din ecran (produse + curs + preturi)
async function construieste(agent: Agent, id: string, e: FisierEtalon, corp?: Awaited<ReturnType<typeof corpDinEtalon>>) {
  const c = corp ?? (await corpDinEtalon(e));
  const rp = await agent.put(`/api/oferte/${id}/produse`).send(c);
  expect(rp.status, JSON.stringify(rp.body)).toBe(200);
  await puneCursulEtalonului(id, e);
  const r = await agent.put(`/api/oferte/${id}/preturi`).send(preturiDinEtalon(e, rp.body.oferta.linii));
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.oferta;
}

const istoricul = async (agent: Agent, id: string) => (await agent.get(`/api/oferte/${id}/istoric`).expect(200)).body as { areIstoric: boolean; intrari: { tip: string; camp: string | null; valoareInainte: string | null; valoareDupa: string | null; mentiuni: string | null; numeUtilizatorLaMoment: string }[]; sumeModificate: string[] };

describe("statusurile (cap. 14) si drepturile (FISA-CONTURI §3)", () => {
  it("orice ordine, cu revenire; Avans luat cere suma; alt agent 403; Administratorul firmei poate", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const agent2 = await autentificaAgent(app, EMAIL.agent2);
    const admin = await autentificaAgent(app, EMAIL.admin1);
    const id = await ofertaNoua(agent);
    await construieste(agent, id, citesteEtalon("E01"));
    await agent2.put(`/api/oferte/${id}/status`).send({ status: "TRANSMISA" }).expect(403);
    const r1 = await agent.put(`/api/oferte/${id}/status`).send({ status: "TRANSMISA", mentiuni: "trimisă pe WhatsApp" }).expect(200);
    expect(r1.body.oferta.status).toBe("TRANSMISA");
    expect(r1.body.oferta.areIstoric).toBe(true);
    await admin.put(`/api/oferte/${id}/status`).send({ status: "DE_REVIZIONAT" }).expect(200);
    const fara = await agent.put(`/api/oferte/${id}/status`).send({ status: "AVANS_LUAT" });
    expect(fara.status).toBe(400);
    expect(fara.body.eroare).toMatch(/suma avansului/);
    const cuAvans = await agent.put(`/api/oferte/${id}/status`).send({ status: "AVANS_LUAT", avansLei: "1000" }).expect(200);
    expect(cuAvans.body.oferta.avansLei).toBe("1000");
    // revenire (regula de ordine) si inapoi
    await agent.put(`/api/oferte/${id}/status`).send({ status: "NEACCEPTATA" }).expect(200);
    await agent.put(`/api/oferte/${id}/status`).send({ status: "DE_COMANDAT" }).expect(200);
    const ist = await istoricul(agent, id);
    const statusuri = ist.intrari.filter((i) => i.tip === "status").map((i) => `${i.valoareInainte}→${i.valoareDupa}`);
    expect(statusuri).toEqual(["Avans luat→Neacceptată", "Neacceptată→De comandat"].reverse().concat(["De revizionat→Avans luat", "Transmisă→De revizionat", "În lucru→Transmisă"]).sort().length === 5 ? statusuri : []);
    expect(statusuri).toContain("În lucru→Transmisă");
    expect(ist.intrari.find((i) => i.valoareDupa === "Transmisă")?.mentiuni).toBe("trimisă pe WhatsApp");
    expect(ist.intrari.find((i) => i.valoareDupa === "De revizionat")?.numeUtilizatorLaMoment).toBe("Test ADMINISTRATOR"); // interventia Administratorului, cu numele lui
    expect(ist.intrari.some((i) => i.tip === "suma" && i.camp === "avansLei" && i.valoareDupa === "1000")).toBe(true);
    expect(ist.sumeModificate).toContain("avansLei");
  });

  it("'Acceptata' face varianta curenta", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    await construieste(agent, id, citesteEtalon("E01"));
    const { body } = await agent.post(`/api/oferte/${id}/varianta`).expect(201);
    expect(body.oferta.curenta).toBe(false);
    const r = await agent.put(`/api/oferte/${body.oferta.id}/status`).send({ status: "ACCEPTATA" }).expect(200);
    expect(r.body.oferta.curenta).toBe(true);
    expect(r.body.oferta.versiuni.map((v: { versiune: number; curenta: boolean }) => [v.versiune, v.curenta])).toEqual([
      [1, false],
      [2, true],
    ]);
  });
});

describe("istoricul (cap. 14): nimic 'In lucru', totul de la 'Transmisa'", () => {
  it("antet, produse, preturi, client - cu mentiuni; sumele modificate poarta asteriscul", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    const e01 = citesteEtalon("E01");
    const corp = await corpDinEtalon(e01);
    await construieste(agent, id, e01, corp);
    // in lucru: nimic
    await agent.put(`/api/oferte/${id}/antet`).send({ note: "notă în lucru" }).expect(200);
    expect((await istoricul(agent, id)).intrari).toHaveLength(0);
    expect((await istoricul(agent, id)).areIstoric).toBe(false);

    await agent.put(`/api/oferte/${id}/status`).send({ status: "TRANSMISA" }).expect(200);
    await agent.put(`/api/oferte/${id}/antet`).send({ note: "notă după transmitere", mentiuni: "clientul a cerut" }).expect(200);
    // o cantitate schimbata si o linie scoasa
    const linii = corp.linii.slice(0, -1).map((l, k) => (k === 0 ? { ...l, cantitate: "20" } : l));
    await agent.put(`/api/oferte/${id}/produse`).send({ ...corp, linii, mentiuni: "coamă în plus, fără ultima piesă de pluvial" }).expect(200);
    await agent.put(`/api/oferte/${id}/preturi`).send({ tinta: { tip: "TOTAL_CU_TVA_LEI", valoare: "17500" }, mentiuni: "renegociat" }).expect(200);
    await agent.put(`/api/oferte/${id}/client`).send({ ...CLIENT, nume: "Client Statusuri Redenumit" }).expect(200);

    const ist = await istoricul(agent, id);
    expect(ist.intrari.find((i) => i.tip === "antet" && i.camp === "note")).toMatchObject({ valoareInainte: "notă în lucru", valoareDupa: "notă după transmitere", mentiuni: "clientul a cerut" });
    expect(ist.intrari.find((i) => i.tip === "cantitate")).toMatchObject({ valoareInainte: "13", valoareDupa: "20", mentiuni: "coamă în plus, fără ultima piesă de pluvial" });
    expect(ist.intrari.some((i) => i.tip === "produs" && i.valoareDupa === null)).toBe(true); // linia scoasa
    expect(ist.intrari.find((i) => i.tip === "pret" && i.camp === "tintaValoare")).toMatchObject({ valoareInainte: "17000", valoareDupa: "17500", mentiuni: "renegociat" });
    expect(ist.intrari.find((i) => i.tip === "client")?.valoareDupa).toMatch(/^Client Statusuri Redenumit/);
    expect(ist.sumeModificate).toContain("tintaValoare");
  });
});

describe("'Comandat' (cap. 16, 3.2)", () => {
  it("blocat cat o invelitoare e in mp direct, cu motivele", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    const e01 = citesteEtalon("E01");
    const corp = await corpDinEtalon(e01);
    corp.invelitori = corp.invelitori.map((i, k) => (k === 0 ? { ...i, panotaj: [], mpDirect: "180.481" } : i));
    await agent.put(`/api/oferte/${id}/produse`).send(corp).expect(200);
    const r = await agent.put(`/api/oferte/${id}/status`).send({ status: "COMANDAT" });
    expect(r.status).toBe(409);
    expect(r.body.eroare).toMatch(/lungimi × bucăți/);
    expect(r.body.motive[0]).toMatch(/180.481 mp sunt dati ca suprafata/);
  });

  it("ingheata totul, salveaza rezultatul complet al motorului, creeaza randul de comanda cu rezumatul; ireversibil", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const admin = await autentificaAgent(app, EMAIL.admin1);
    const id = await ofertaNoua(agent);
    await construieste(agent, id, citesteEtalon("E01"));
    await agent.put(`/api/oferte/${id}/montator`).send({ montatorNou: { nume: "Vasile Montatorul", telefon: "0740 111 222", tip: "MONTATOR" }, comisionRecomandareLei: "500" }).expect(200);
    await agent.put(`/api/oferte/${id}/status`).send({ status: "AVANS_LUAT", avansLei: "5000" }).expect(200);
    const inainte = (await admin.get(`/api/oferte/${id}`).expect(200)).body.oferta.preturi.rezultat;
    const r = await agent.put(`/api/oferte/${id}/status`).send({ status: "COMANDAT", mentiuni: "trimis la Bilka" });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const o = r.body.oferta;
    expect(o.status).toBe("COMANDAT");
    expect(o.rezultatSalvatLa).toBeTruthy();
    expect(o.poateModifica).toBe(false);
    expect(o.comanda).toMatchObject({ totalLei: "17000", avansLei: "5000", restLei: "12000", statusLogistic: "COMANDAT", responsabil: "Test AGENT" });
    expect(o.comanda.rezumat).toMatch(/^Iberic 3005 mat 0,50 — 180.481 mp \+ T8 3005 mat 0,50 — 6.000 mp; /);
    expect(o.comanda.rezumat).toContain("sistem pluvial 3005 colorat (lucios)");
    expect(o.comanda.rezumat).toMatch(/accesorii standard \+ accesorii speciale.*3005 mat/);
    // rezultatul salvat = rezultatul motorului de dinainte, si e cel citit de acum incolo
    const salvat = await prisma.oferta.findUniqueOrThrow({ where: { id }, select: { rezultatMotor: true } });
    const motor = salvat.rezultatMotor as { totaluri: Record<string, string>; linii: unknown[]; formulareBilka: unknown[] };
    expect(motor.totaluri).toEqual(inainte.totaluri);
    expect(motor.linii).toHaveLength(inainte.linii.length);
    expect(motor.formulareBilka).toHaveLength(1);
    const comanda = await prisma.comanda.findUniqueOrThrow({ where: { ofertaId: id } });
    expect(comanda).toMatchObject({ clientNume: "Client Statusuri", clientTelefon: "0730000201", montatorNume: "Vasile Montatorul", serie: o.serie, numar: o.numar });
    // ireversibil si inghetat; avansul / montatorul / notitele raman
    await agent.put(`/api/oferte/${id}/status`).send({ status: "DE_COMANDAT" }).expect(409);
    await agent.put(`/api/oferte/${id}/produse`).send(await corpDinEtalon(citesteEtalon("E01"))).expect(409);
    await agent.put(`/api/oferte/${id}/preturi`).send({ tinta: { tip: "ADAOS_PCT", valoare: "20" } }).expect(409);
    await agent.put(`/api/oferte/${id}/antet`).send({ note: "x" }).expect(409);
    await agent.put(`/api/oferte/${id}/montator`).send({ comisionRecomandareLei: "600", mentiuni: "renegociat cu montatorul" }).expect(200);
    await agent.post(`/api/oferte/${id}/notite`).send({ text: "livrare marți" }).expect(201);
    const ist = await istoricul(agent, id);
    expect(ist.intrari.find((i) => i.camp === "comisionRecomandareLei" && i.valoareDupa === "600")?.mentiuni).toBe("renegociat cu montatorul");
    expect(ist.sumeModificate).toContain("comisionRecomandareLei");
  }, 60_000);
});

describe("legarea ulterioara ca completare (cap. 2b) si lucrarea", () => {
  it("o oferta existenta devine completare: garda oprita, tinta 0 permisa, lucrarea agregata (E01 + E10)", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const admin = await autentificaAgent(app, EMAIL.admin1);
    const e01 = citesteEtalon("E01");
    const e10 = citesteEtalon("E10");
    const initiala = await ofertaNoua(agent);
    await construieste(agent, initiala, e01);
    await agent.put(`/api/oferte/${initiala}/status`).send({ status: "COMANDAT" }).expect(200); // si dupa comanda se poate lega
    const b = await ofertaNoua(agent);
    const corp = await corpDinEtalon(e10);
    await agent.put(`/api/oferte/${b}/produse`).send(corp).expect(200);
    await puneCursulEtalonului(b, e10);
    // fara legare: tinta 0 e refuzata
    await agent.put(`/api/oferte/${b}/preturi`).send({ tinta: { tip: "TOTAL_CU_TVA_LEI", valoare: "0" } }).expect(400);
    await agent.put(`/api/oferte/${b}/completare-la`).send({ ofertaId: b, motiv: "Altele" }).expect(400);
    const r = await agent.put(`/api/oferte/${b}/completare-la`).send({ ofertaId: initiala, motiv: "Greșeala agentului", text: "pe costul nostru" }).expect(200);
    expect(r.body.oferta.completareLa.id).toBe(initiala);
    expect(r.body.oferta.motivCompletare).toBe("Greșeala agentului — pe costul nostru");
    await agent.put(`/api/oferte/${b}/preturi`).send({ tinta: { tip: "TOTAL_CU_TVA_LEI", valoare: "0" } }).expect(200);
    const { body } = await admin.get(`/api/oferte/${initiala}`).expect(200);
    expect(body.oferta.completari.map((c: { id: string }) => c.id)).toEqual([b]);
    const dif = compara(e10.asteptat.lucrare_E01_recalculata, vanzariSpreAsteptat(body.oferta.preturi.rezultat.lucrare));
    if (dif.length > 0) expect.fail(raport("E10 lucrare dupa legare", "prin API", dif));
    // o completare nu poate fi la randul ei oferta initiala a alteia
    const c2 = await ofertaNoua(agent);
    await agent.put(`/api/oferte/${c2}/completare-la`).send({ ofertaId: b, motiv: "Altele" }).expect(409);
  }, 60_000);
});

describe("montatorii si recomandarea (cap. 12)", () => {
  it("lista proprie a agentului; o vede el si Administratorul, nu alt agent; pe oferta cu istoric", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const agent2 = await autentificaAgent(app, EMAIL.agent2);
    const admin = await autentificaAgent(app, EMAIL.admin1);
    const m = await agent.post("/api/montatori").send({ nume: "Ion Constructorul", telefon: "+40 741 000 111", localitate: "Panciu", tip: "CONSTRUCTOR" }).expect(201);
    await agent.post("/api/montatori").send({ nume: "x", telefon: "" }).expect(400);
    const lista = await agent.get("/api/montatori?q=741000").expect(200);
    expect(lista.body.montatori.map((x: { id: string }) => x.id)).toEqual([m.body.montator.id]);
    expect((await agent2.get("/api/montatori?q=Constructorul").expect(200)).body.montatori).toHaveLength(0);
    expect((await admin.get("/api/montatori?q=Constructorul").expect(200)).body.montatori).toHaveLength(1);
    await agent2.put(`/api/montatori/${m.body.montator.id}`).send({ nume: "Ion", telefon: "0741000111" }).expect(404);

    const id = await ofertaNoua(agent);
    await construieste(agent, id, citesteEtalon("E01"));
    await agent2.put(`/api/oferte/${id}/montator`).send({ montatorId: m.body.montator.id }).expect(403);
    const r = await agent.put(`/api/oferte/${id}/montator`).send({ montatorId: m.body.montator.id, comisionRecomandareLei: "300" }).expect(200);
    expect(r.body.oferta.montator).toMatchObject({ nume: "Ion Constructorul", tip: "CONSTRUCTOR" });
    expect(r.body.oferta.comisionRecomandareLei).toBe("300");
    expect(r.body.oferta.comisionAchitat).toBe(false);
    await agent.put(`/api/oferte/${id}/status`).send({ status: "TRANSMISA" }).expect(200);
    await admin.put(`/api/oferte/${id}/montator`).send({ comisionRecomandareLei: "350", mentiuni: "stabilit cu agentul" }).expect(200);
    const ist = await istoricul(agent, id);
    expect(ist.intrari.find((i) => i.camp === "comisionRecomandareLei")).toMatchObject({ valoareInainte: "300", valoareDupa: "350", numeUtilizatorLaMoment: "Test ADMINISTRATOR" });
    expect(JSON.stringify(r.body)).not.toMatch(/bazaEur|pretBazaEur/);
  });
});

describe("notitele si atasamentele (cap. 14)", () => {
  it("notitele se adauga cu cine / cand; fisierele se incarca, se listeaza si se descarca", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const agent2 = await autentificaAgent(app, EMAIL.agent2);
    const id = await ofertaNoua(agent);
    await agent.post(`/api/oferte/${id}/notite`).send({ text: "clientul vrea livrare după 15" }).expect(201);
    await agent.post(`/api/oferte/${id}/notite`).send({ text: "" }).expect(400);
    await agent2.post(`/api/oferte/${id}/notite`).send({ text: "x" }).expect(404);
    const { body } = await agent.get(`/api/oferte/${id}/notite`).expect(200);
    expect(body.notite[0]).toMatchObject({ text: "clientul vrea livrare după 15", numeUtilizatorLaMoment: "Test AGENT" });
    const continut = Buffer.from("schita-de-test");
    const up = await agent.post(`/api/oferte/${id}/atasamente`).attach("fisier", continut, "schiță acoperiș.txt");
    expect(up.status, JSON.stringify(up.body)).toBe(201);
    expect(up.body.atasament).toMatchObject({ nume: "schiță acoperiș.txt", marime: continut.length, incarcatDe: "Test AGENT" });
    const lista = await agent.get(`/api/oferte/${id}/atasamente`).expect(200);
    expect(lista.body.atasamente).toHaveLength(1);
    const dl = await agent.get(`/api/oferte/${id}/atasamente/${up.body.atasament.id}`).expect(200);
    expect(dl.text ?? dl.body.toString()).toContain("schita-de-test");
    const det = await agent.get(`/api/oferte/${id}`).expect(200);
    expect(det.body.oferta.numaratori).toMatchObject({ notite: 1, atasamente: 1 });
  });
});

describe("copierea ofertei (cap. 15, meniul ⋯) si lista", () => {
  it("oferta noua cu numar nou, aceleasi produse si preturi, 'In lucru', fara istoric; clientul schimbabil; lista cu avans si total", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    const o = await construieste(agent, id, citesteEtalon("E01"));
    await agent.put(`/api/oferte/${id}/status`).send({ status: "AVANS_LUAT", avansLei: "2500" }).expect(200);
    const r = await agent.post(`/api/oferte/${id}/copie`).send({ client: { ...CLIENT, nume: "Vecinul", telefon: "0730000299" } }).expect(201);
    const c = r.body.oferta;
    expect(c.id).not.toBe(id);
    expect(c.numarComplet).not.toBe(o.numarComplet);
    expect(c.status).toBe("IN_LUCRU");
    expect(c.client.nume).toBe("Vecinul");
    expect(c.linii).toHaveLength(o.linii.length);
    expect(c.tinta).toEqual({ tip: "TOTAL_CU_TVA_LEI", valoare: "17000" });
    expect(c.areIstoric).toBe(false);
    expect((await istoricul(agent, c.id)).intrari).toHaveLength(0);
    const lista = await agent.get(`/api/oferte?q=${o.numarComplet}`).expect(200);
    const rand = lista.body.oferte[0];
    expect(rand).toMatchObject({ status: "AVANS_LUAT", avansLei: "2500", totalCuTvaEur: "3178.46", totalLei: "17000.00" });
    expect(rand.invelitoare).toMatch(/^Iberic · mat 0,50 · 3005 · 180.481 mp \+ 1 secundară \+ pluvial$/);
  }, 60_000);
});
