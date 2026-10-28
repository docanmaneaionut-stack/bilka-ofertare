import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { incarcaOptiuniListe } from "../src/modules/adm/optiuniListe.js";
import type { FisierEtalon } from "../src/modules/mot/etalon.js";
import type { IntrareOferta, RezultatOferta } from "../src/modules/mot/tipuri.js";
import { asiguraCatalogBilka } from "./catalogTest.js";
import { citesteEtalon, compara, raport, spreAsteptat, vanzariSpreAsteptat } from "./etalon/incarcaEtalon.js";
import { corpDinEtalon, preturiDinEtalon, puneCursulEtalonului } from "./etalonApi.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

// Preturile in oferta (S14, FISA-OFERTARE cap. 11, 2b, 21) prin API-ul real al
// ecranului: ofertele-model construite din editor + zona de preturi dau exact
// cifrele etalon; garda refuza cu 409; raspunsul catre Agent fara pretul de baza /
// adaosul %; varianta (E09), completarea (E10), preluarea si renuntarea, "Afla
// pret", listele configurabile.

const app = creeazaApp();
const S = "-pret@exemplu.local";
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
  firma1 = (await prisma.firma.create({ data: { denumire: "Firma Preturi", cui: "RO41", nrRegCom: "J41", adresa: "A", telefon: "1", email: `f1${S}` } })).id;
  const admin1 = await creeazaUtilizatorTest(EMAIL.admin1, "ADMINISTRATOR", { firmaId: firma1, serieOferta: "PTA", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.agent1, "AGENT", { firmaId: firma1, administratorId: admin1.id, serieOferta: "PTG", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.agent2, "AGENT", { firmaId: firma1, administratorId: admin1.id, serieOferta: "PTX", adaosProcent: 1 });
  for (const d of [dataLocala(0), dataLocala(-1)]) {
    await prisma.cursValutar.upsert({ where: { data_moneda: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR" } }, update: { curs: "5.3485" }, create: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR", curs: "5.3485", sursa: "test" } });
  }
}, 240_000);

afterAll(async () => {
  await prisma.$disconnect();
});

const CLIENT = { nume: "Client Preturi", telefon: "0730000101", adresa: "Str. Preț 1", localitate: "Focșani" };

type Agent = Awaited<ReturnType<typeof autentificaAgent>>;
type Linie = { id: string; cod: string };

async function ofertaNoua(agent: Agent): Promise<string> {
  const { body } = await agent.post("/api/oferte").send({ client: CLIENT }).expect(201);
  return body.oferta.id as string;
}

// oferta-model construita din ecran: produsele (PUT /produse), cursul etalonului,
// apoi zona de preturi (PUT /preturi); intoarce raspunsul PUT /preturi
async function construieste(agent: Agent, id: string, e: FisierEtalon) {
  const corp = await corpDinEtalon(e);
  const rp = await agent.put(`/api/oferte/${id}/produse`).send(corp);
  expect(rp.status, JSON.stringify(rp.body)).toBe(200);
  await puneCursulEtalonului(id, e);
  const linii = rp.body.oferta.linii as Linie[];
  const r = await agent.put(`/api/oferte/${id}/preturi`).send(preturiDinEtalon(e, linii));
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.oferta;
}

// cifrele complete le citeste Administratorul firmei (vede pretul de baza)
async function rezultatComplet(id: string): Promise<RezultatOferta> {
  const admin = await autentificaAgent(app, EMAIL.admin1);
  const { body } = await admin.get(`/api/oferte/${id}`).expect(200);
  expect(body.oferta.preturi.eroare).toBeNull();
  return body.oferta.preturi.rezultat as RezultatOferta;
}

// comparatia cifra cu cifra cu blocul "asteptat" (fara cheile pe id-uri de etalon,
// pe care API-ul le da cu id-urile din baza - mp-urile se verifica separat)
function verificaEtalon(e: FisierEtalon, rezultat: RezultatOferta) {
  const asteptat = { ...e.asteptat } as Record<string, unknown>;
  delete asteptat.mp_invelitori;
  delete asteptat.sipci;
  for (const k of Object.keys(asteptat)) if (k.startsWith("lucrare_")) delete asteptat[k];
  const obtinut = spreAsteptat(rezultat, { modPrezentare: e.intrari.mod_prezentare } as IntrareOferta);
  const diferente = compara(asteptat, obtinut);
  if (diferente.length > 0) expect.fail(`${e.titlu}\n${raport(e.id, "prin API", diferente)}`);
  if (e.intrari.invelitori) expect(rezultat.cantitati.invelitori.map((i) => i.mp)).toEqual(e.intrari.invelitori.map((i) => i.mp));
}

describe("ofertele-model prin API-ul ecranului", () => {
  for (const id of ["E01", "E02", "E04", "E05", "E08", "E12"]) {
    it(`${id} construita din editor + preturi da exact cifrele etalon`, async () => {
      const e = citesteEtalon(id);
      const agent = await autentificaAgent(app, EMAIL.agent1);
      const oferta = await ofertaNoua(agent);
      await construieste(agent, oferta, e);
      verificaEtalon(e, await rezultatComplet(oferta));
    }, 60_000);
  }

  it("E02: pretul fix 'achizitie + 5 %' e pastrat ca procent, normalizat de motor la 7,28", async () => {
    const e = citesteEtalon("E02");
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    const o = await construieste(agent, id, e);
    const tigla = o.linii.find((l: { cod: string }) => l.cod === "TMIBEMAT050");
    expect(tigla).toMatchObject({ pretFixTip: "ACHIZITIE_PLUS_PCT", pretFixValoare: "5", pretFixPreluat: false });
    const linie = o.preturi.rezultat.linii.find((l: { cod: string }) => l.cod === "TMIBEMAT050");
    expect(linie).toMatchObject({ pretFix: true, pretDocumentEur: "7.28" });
  });

  it("pretul fix in lei cu TVA se normalizeaza in EUR fara TVA la cursul documentului", async () => {
    const e = citesteEtalon("E01");
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    const o = await construieste(agent, id, e);
    const coama = o.linii.find((l: { cod: string }) => l.cod === "ACMICMAT050");
    // 38,80 lei cu TVA -> 32,07 lei fara TVA -> 6,00 EUR la 5,3485 (o singura rotunjire)
    const r = await agent.put(`/api/oferte/${id}/preturi`).send({ linii: [{ id: coama.id, pretFix: { tip: "lei_cu_tva", valoare: "38.80" } }] });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.oferta.linii.find((l: { id: string }) => l.id === coama.id)).toMatchObject({ pretFixTip: "EUR_FARA_TVA", pretFixValoare: "6" });
    const r2 = await agent.put(`/api/oferte/${id}/preturi`).send({ linii: [{ id: coama.id, pretFix: { tip: "eur_cu_tva", valoare: "7.26" } }] });
    expect(r2.body.oferta.linii.find((l: { id: string }) => l.id === coama.id).pretFixValoare).toBe("6");
    const r3 = await agent.put(`/api/oferte/${id}/preturi`).send({ linii: [{ id: coama.id, pretFix: null }] });
    expect(r3.body.oferta.linii.find((l: { id: string }) => l.id === coama.id).pretFixTip).toBeNull();
  });
});

describe("garda (11.6, R7): serverul refuza si nu salveaza", () => {
  it("o tinta sub achizitie -> 409 cu liniile vinovate; tinta ramane cea dinainte", async () => {
    const e = citesteEtalon("E01");
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    await construieste(agent, id, e);
    const r = await agent.put(`/api/oferte/${id}/preturi`).send({ tinta: { tip: "TOTAL_CU_TVA_LEI", valoare: "10000" } });
    expect(r.status).toBe(409);
    expect(r.body.eroare).toMatch(/sub achiziția reală/);
    expect(r.body.liniiSubAchizitie.length).toBeGreaterThan(0);
    expect(r.body.liniiSubAchizitie[0]).toMatchObject({ id: expect.any(String), cod: expect.any(String), denumire: expect.any(String) });
    const { body } = await agent.get(`/api/oferte/${id}`).expect(200);
    expect(body.oferta.tinta).toEqual({ tip: "TOTAL_CU_TVA_LEI", valoare: "17000" });
    expect(body.oferta.preturi.rezultat.totaluri.documentTotalLei).toBe("17000.00");
  });

  it("un pret fix sub achizitia reala -> 409; totalul 0 e refuzat la o oferta obisnuita", async () => {
    const e = citesteEtalon("E01");
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    const o = await construieste(agent, id, e);
    const tigla = o.linii.find((l: { cod: string }) => l.cod === "TMIBEMAT050");
    const r = await agent.put(`/api/oferte/${id}/preturi`).send({ linii: [{ id: tigla.id, pretFix: { tip: "eur_fara_tva", valoare: "1.00" } }] });
    expect(r.status).toBe(409);
    expect(r.body.liniiSubAchizitie.map((l: { cod: string }) => l.cod)).toEqual(["TMIBEMAT050"]);
    const r2 = await agent.put(`/api/oferte/${id}/preturi`).send({ tinta: { tip: "TOTAL_CU_TVA_LEI", valoare: "0" } });
    expect(r2.status).toBe(400);
    expect(r2.body.eroare).toMatch(/completare/);
  });
});

describe("cine vede ce (FISA-CONTURI §2)", () => {
  it("Agentul primeste achizitia in lei cu TVA, dar nu pretul de baza si nici adaosul %; Administratorul vede tot", async () => {
    const e = citesteEtalon("E05");
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    await construieste(agent, id, e);
    const { body } = await agent.get(`/api/oferte/${id}`).expect(200);
    const text = JSON.stringify(body);
    expect(text).not.toMatch(/bazaEur|pretBazaEur|adaosProcent|"adaosPct"/);
    const r = body.oferta.preturi.rezultat;
    expect(r.linii[0]).toMatchObject({ achizitieContLeiCuTva: expect.any(String), pretDocumentEur: expect.any(String), denumire: expect.any(String) });
    expect(r.totaluri).toMatchObject({ achizitieContLeiCuTva: "15054.36", tintaLeiCuTva: "15355.45", adaosRealPct: "2.00", marjaLei: "301.09" });
    expect(r.vanzari).toMatchObject({ tabel: "propriu", costAchizitieLei: "14337.77" }); // costul real, fara grupa (E05)
    const admin = await autentificaAgent(app, EMAIL.admin1);
    const { body: ba } = await admin.get(`/api/oferte/${id}`).expect(200);
    expect(ba.oferta.preturi.rezultat.linii[0].bazaEur).toBe("6.79");
  });
});

describe("varianta (11.7, E09) si versiunile", () => {
  it("din E01, 'Creeaza varianta' + produsele Grande Mat dau exact E09; 'Fa-o curenta'", async () => {
    const e01 = citesteEtalon("E01");
    const e09 = citesteEtalon("E09");
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    await construieste(agent, id, e01);
    const rv = await agent.post(`/api/oferte/${id}/varianta`).expect(201);
    const varianta = rv.body.oferta;
    expect(varianta).toMatchObject({ versiune: 2, numar: rv.body.oferta.numar, tinta: { tip: "ADAOS_PCT_PASTRAT", valoare: "18.568" } });
    expect(varianta.linii).toHaveLength(28); // copia produselor
    expect(varianta.versiuni.map((v: { versiune: number; curenta: boolean }) => [v.versiune, v.curenta])).toEqual([
      [1, true],
      [2, false],
    ]);
    // produsele inlocuite in editor (Grande Mat): tinta pastrata, preturile recalculate
    const corp = await corpDinEtalon(e09);
    await agent.put(`/api/oferte/${varianta.id}/produse`).send(corp).expect(200);
    verificaEtalon(e09, await rezultatComplet(varianta.id));
    // lista arata doar versiunea curenta; "Fa-o curenta" o schimba
    const lista1 = await agent.get(`/api/oferte?q=${varianta.serie}-${varianta.numar}`).expect(200);
    expect(lista1.body.oferte.map((o: { versiune: number }) => o.versiune)).toEqual([1]);
    await agent.put(`/api/oferte/${varianta.id}/curenta`).expect(200);
    const lista2 = await agent.get(`/api/oferte?q=${varianta.serie}-${varianta.numar}`).expect(200);
    expect(lista2.body.oferte.map((o: { versiune: number }) => o.versiune)).toEqual([2]);
  }, 60_000);
});

describe("completarea (cap. 2b, E10)", () => {
  it("'Completare la aceasta oferta' preia clientul si adresa, are numarul ei, tinta 0 e permisa; lucrarea agregata", async () => {
    const e01 = citesteEtalon("E01");
    const e10 = citesteEtalon("E10");
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    await construieste(agent, id, e01);
    const rc = await agent.post(`/api/oferte/${id}/completare`).send({ motiv: "Greșeala agentului", text: "pe costul nostru" });
    expect(rc.status, JSON.stringify(rc.body)).toBe(201);
    const c = rc.body.oferta;
    expect(c.completareLa.id).toBe(id);
    expect(c.motivCompletare).toBe("Greșeala agentului — pe costul nostru");
    const { body: bi } = await agent.get(`/api/oferte/${id}`).expect(200);
    expect(c.client.id).toBe(bi.oferta.client.id);
    expect(c.adresaLucrarii).toBe("Str. Preț 1");
    expect(c.numarComplet).not.toBe(bi.oferta.numarComplet);
    expect(bi.oferta.completari.map((x: { id: string }) => x.id)).toEqual([c.id]);
    await construieste(agent, c.id, e10); // tinta 0: garda nu se aplica
    const r = await rezultatComplet(c.id);
    expect(r.garda).toEqual({ respectata: true, liniiSubAchizitie: [], aplicata: false });
    verificaEtalon(e10, r);
    // lucrarea = oferta initiala + completarea, pe oferta initiala
    const initiala = await rezultatComplet(id);
    const lucrare = (initiala as unknown as { lucrare: RezultatOferta["vanzari"] }).lucrare;
    const dif = compara(e10.asteptat.lucrare_E01_recalculata, vanzariSpreAsteptat(lucrare));
    if (dif.length > 0) expect.fail(raport("E10 lucrare", "prin API", dif));
    // motivul lipsa e refuzat; un cont strain nu poate completa
    await agent.post(`/api/oferte/${id}/completare`).send({ motiv: "" }).expect(400);
    const agent2 = await autentificaAgent(app, EMAIL.agent2);
    await agent2.post(`/api/oferte/${id}/completare`).send({ motiv: "Altele" }).expect(403);
  }, 60_000);
});

describe("'Preia preturi din oferta ...' (11.11) si renuntarea", () => {
  it("produsele comune primesc pretul net al sursei, cele noi adaosul rubricii; tinta devine preluata; renuntarea reda tinta", async () => {
    const e01 = citesteEtalon("E01");
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const sursa = await ofertaNoua(agent);
    const sursaSalvata = await construieste(agent, sursa, e01);
    const netSursa = new Map<string, string>((await rezultatComplet(sursa)).linii.map((l) => [l.cod, l.pretNetEur ?? l.pretDocumentEur]));

    // oferta care preia: jumatate din cantitati + coama mare (produs nou)
    const noua = await ofertaNoua(agent);
    const corp = await corpDinEtalon(e01);
    corp.invelitori = corp.invelitori.map((i) => ({ ...i, panotaj: i.panotaj.map((p) => ({ ...p, bucati: Math.max(1, Math.round(p.bucati / 2)) })) }));
    corp.linii = corp.linii.map((l) => ({ ...l, cantitate: String(Math.max(1, Math.round(Number(l.cantitate) / 2))) }));
    const coamaMare = await prisma.produs.findFirst({ where: { codFurnizor: "ACMARMAT050", activ: true } });
    corp.linii.push({ cheie: "L99", rubrica: "Accesorii standard", produsId: coamaMare!.id, cantitate: "6", invelitoare: "I1", culoare: null });
    await agent.put(`/api/oferte/${noua}/produse`).send(corp).expect(200);
    await puneCursulEtalonului(noua, e01);

    const surse = await agent.get(`/api/oferte/${noua}/surse-preluare?q=${sursaSalvata.numarComplet}`).expect(200);
    expect(surse.body.oferte.map((o: { id: string }) => o.id)).toEqual([sursa]);
    const r = await agent.post(`/api/oferte/${noua}/preia-preturi`).send({ sursaId: sursa });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const o = r.body.oferta;
    expect(o.tinta.tip).toBe("PRELUATA");
    expect(o.preluataDin).toMatchObject({ id: sursa, numarComplet: sursaSalvata.numarComplet });
    expect(o.linii.every((l: { pretFixPreluat: boolean }) => l.pretFixPreluat)).toBe(true);
    const coama = o.preturi.rezultat.linii.find((l: { cod: string }) => l.cod === "ACMICMAT050");
    expect(coama.pretDocumentEur).toBe(netSursa.get("ACMICMAT050"));
    expect(coama.pretFixPreluat).toBe(true);
    expect(o.preturi.rezultat.linii.find((l: { cod: string }) => l.cod === "ACMARMAT050").pretFixPreluat).toBe(true);
    // cu preturi preluate nu se pune tinta
    const rt = await agent.put(`/api/oferte/${noua}/preturi`).send({ tinta: { tip: "ADAOS_PCT", valoare: "20" } });
    expect(rt.status).toBe(409);
    // renuntarea
    const rr = await agent.post(`/api/oferte/${noua}/renunta-preluare`).send({ tinta: { tip: "ADAOS_PCT", valoare: "20" } }).expect(200);
    expect(rr.body.oferta.tinta).toEqual({ tip: "ADAOS_PCT", valoare: "20" });
    expect(rr.body.oferta.preluataDin).toBeNull();
    expect(rr.body.oferta.linii.some((l: { pretFixPreluat: boolean }) => l.pretFixPreluat)).toBe(false);
    expect(rr.body.oferta.preturi.rezultat.totaluri.adaosRealPct).toBe("20.00");
    // alt agent nu vede sursa
    const agent2 = await autentificaAgent(app, EMAIL.agent2);
    const o2 = await ofertaNoua(agent2);
    await agent2.put(`/api/oferte/${o2}/produse`).send(await corpDinEtalon(e01)).expect(200);
    await agent2.post(`/api/oferte/${o2}/preia-preturi`).send({ sursaId: sursa }).expect(404);
  }, 90_000);
});

describe("cursul si 'preturi vechi' (11.8)", () => {
  it("reimprospatarea cursului cat e 'In lucru'; recalcularea preturilor de baza din lista activa", async () => {
    const e01 = citesteEtalon("E01");
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(agent);
    await construieste(agent, id, e01);
    await prisma.oferta.update({ where: { id }, data: { cursBnr: "5.0000", cursAchizitie: "5.0500" } });
    const r = await agent.post(`/api/oferte/${id}/curs`).expect(200);
    expect(r.body.oferta.curs).toMatchObject({ cursBnr: "5.3485", cursAchizitie: "5.4020" });
    expect(r.body.oferta.preturiVechi).toBe(false);
    // snapshot vechi (pretul de baza al unui produs nu mai e cel din lista activa) -> recalcularea il reface
    await prisma.ofertaLinie.updateMany({ where: { ofertaId: id, cod: "ACMICMAT050" }, data: { pretBazaEur: "1.00" } });
    const { body } = await agent.get(`/api/oferte/${id}`).expect(200);
    expect(body.oferta.preturiVechi).toBe(true);
    const r2 = await agent.post(`/api/oferte/${id}/recalculeaza-preturi`).expect(200);
    expect(r2.body.oferta.preturiVechi).toBe(false);
    expect((await rezultatComplet(id)).linii.find((l) => l.cod === "ACMICMAT050")?.bazaEur).toBe("4.90");
  });
});

describe("'Afla pret' (cap. 21)", () => {
  it("cautarea pe cuvinte la toti furnizorii si pretul contului cu TVA pe unitate (R2)", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const { body } = await agent.get("/api/pret-rapid?q=clasic mat").expect(200);
    const clasic = body.produse.find((p: { cod: string }) => p.cod === "TMCLSMAT050");
    expect(clasic).toBeDefined();
    expect(JSON.stringify(body)).not.toMatch(/pret/i);
    const { body: pret } = await agent.get(`/api/pret-rapid/${clasic.id}`).expect(200);
    // 6,54 x 1,01 = 6,61 -> x 5,4020 x 1,21 = 43,21 (E12)
    expect(pret.pret).toMatchObject({ achizitieContEur: "6.61", achizitieContLeiCuTva: "43.21", cursAchizitie: "5.4020" });
    expect(pret.pret.pretBazaEur).toBeUndefined();
    const admin = await autentificaAgent(app, EMAIL.admin1);
    const { body: pa } = await admin.get(`/api/pret-rapid/${clasic.id}`).expect(200);
    expect(pa.pret.pretBazaEur).toBe("6.54");
    await agent.get("/api/pret-rapid/nu-exista").expect(404);
    const { body: fronton } = await agent.get("/api/pret-rapid?q=fronton 312").expect(200);
    expect(fronton.produse.length).toBeGreaterThan(0);
    expect(fronton.produse.every((p: { denumire: string }) => /fronton/i.test(p.denumire))).toBe(true);
  });
});

describe("listele configurabile (migrarea 9, seed idempotent)", () => {
  it("motivele completarii si sursa clientului vin din tabel; seed-ul nu dubleaza", async () => {
    const inainte = await prisma.optiuneLista.count();
    expect(await incarcaOptiuniListe(prisma)).toBe(0);
    expect(await prisma.optiuneLista.count()).toBe(inainte);
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const { body } = await agent.get("/api/oferte/optiuni/motiv_completare").expect(200);
    expect(body.optiuni.map((o: { valoare: string }) => o.valoare)).toEqual(["Greșeala agentului", "Greșeala montatorului", "Clientul mai vrea ceva după comandă", "Altele"]);
    const { body: s } = await agent.get("/api/oferte/optiuni/sursa_client").expect(200);
    expect(s.optiuni).toHaveLength(6);
    await agent.get("/api/oferte/optiuni/altceva").expect(404);
    // o valoare dezactivata de Admin general dispare din lista si ramane asa la un nou seed
    await prisma.optiuneLista.update({ where: { lista_valoare: { lista: "sursa_client", valoare: "Reclamă" } }, data: { activ: false } });
    expect(await incarcaOptiuniListe(prisma)).toBe(0);
    const { body: s2 } = await agent.get("/api/oferte/optiuni/sursa_client").expect(200);
    expect(s2.optiuni.map((o: { valoare: string }) => o.valoare)).not.toContain("Reclamă");
  });
});
