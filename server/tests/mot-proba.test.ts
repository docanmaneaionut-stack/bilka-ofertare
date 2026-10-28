import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { genereazaCodIntern } from "../src/modules/cat/codIntern.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

// Rutele ecranului "Calcul de proba" (/api/mot): doar Admin general; produsele cu
// pretul din lista activa; etaloanele construite din baza de date; calculul
// propriu-zis. Baza de test primeste un compartiment cu doua produse si o lista
// activa - exact cele din E06.

const app = creeazaApp();
const EMAIL_ADMIN = "test-mot-admin@exemplu.local";
const EMAIL_AGENT = "test-mot-agent@exemplu.local";

let compartimentId: string;
let listaId: string;
const idsCreate: string[] = [];

beforeAll(async () => {
  await creeazaUtilizatorTest(EMAIL_ADMIN, "ADMIN_GENERAL");
  await creeazaUtilizatorTest(EMAIL_AGENT, "AGENT");
  const compartiment = await prisma.compartiment.create({
    data: { denumire: "Test MOT Furnizor", codScurt: "TMO", tip: "FURNIZOR", moneda: "EUR", modPret: "LISTA_ACHIZITIE" },
  });
  compartimentId = compartiment.id;
  const grupSipca = await prisma.grup.create({ data: { compartimentId, denumire: "Șipcă metalică de gard" } });
  const grupFixare = await prisma.grup.create({ data: { compartimentId, denumire: "Elemente de fixare" } });
  const familieSipca = await prisma.familie.create({ data: { grupId: grupSipca.id, denumire: "Șipcă Oslo" } });
  const categorieSipca = await prisma.categorieOferta.create({ data: { denumire: "Test Șipcă gard", zona: "A", ordine: 90 } });
  const categorieFixare = await prisma.categorieOferta.create({ data: { denumire: "Test Fixare și etanșare", zona: "A", ordine: 91 } });

  const sipca = await prisma.produs.create({
    data: {
      compartimentId,
      grupId: grupSipca.id,
      familieId: familieSipca.id,
      codIntern: genereazaCodIntern({ codScurtCompartiment: "TMO", codFurnizor: "SIPCAMAT050", denumire: "Șipcă Oslo – mat – 0,50 mm" }),
      codFurnizor: "SIPCAMAT050",
      denumire: "Șipcă Oslo – mat – 0,50 mm",
      finisaj: "mat",
      grosime: "0,50 mm",
      um: "ML",
      moneda: "EUR",
      categorieOfertaId: categorieSipca.id,
      latimeTotalaMm: "92.9",
    },
  });
  const holt = await prisma.produs.create({
    data: {
      compartimentId,
      grupId: grupFixare.id,
      codIntern: genereazaCodIntern({ codScurtCompartiment: "TMO", codFurnizor: "SUCLE408035", denumire: "Holțșuruburi în culoare, lemn – 4,8 × 35 mm" }),
      codFurnizor: "SUCLE408035",
      denumire: "Holțșuruburi în culoare, lemn – 4,8 × 35 mm",
      um: "CUTIE",
      moneda: "EUR",
      categorieOfertaId: categorieFixare.id,
    },
  });
  idsCreate.push(sipca.id, holt.id);

  // o schita cu alte preturi, ca sa se vada ca ecranul ia doar lista activa
  // (o lista arhivata nu s-ar putea curata la final: trigger-ul din baza o protejeaza)
  const veche = await prisma.listaPret.create({
    data: { compartimentId, denumire: "Test MOT schita", valabilaDeLa: new Date("2026-01-01"), status: "SCHITA", preturi: { create: [{ produsId: sipca.id, pret: "9.99" }, { produsId: holt.id, pret: "9.99" }] } },
  });
  const activa = await prisma.listaPret.create({
    data: { compartimentId, denumire: "Test MOT activa", valabilaDeLa: new Date("2026-09-01"), status: "ACTIVA", preturi: { create: [{ produsId: sipca.id, pret: "1.11" }, { produsId: holt.id, pret: "6.25" }] } },
  });
  listaId = activa.id;
  idsCreate.push(veche.id);
});

afterAll(async () => {
  await prisma.pretListaProdus.deleteMany({ where: { produsId: { in: idsCreate } } });
  await prisma.listaPret.deleteMany({ where: { compartimentId } });
  await prisma.produs.deleteMany({ where: { compartimentId } });
  await prisma.familie.deleteMany({ where: { grup: { compartimentId } } });
  await prisma.grup.deleteMany({ where: { compartimentId } });
  await prisma.compartiment.delete({ where: { id: compartimentId } });
  await prisma.categorieOferta.deleteMany({ where: { denumire: { startsWith: "Test " } } });
  await prisma.utilizator.deleteMany({ where: { email: { in: [EMAIL_ADMIN, EMAIL_AGENT] } } });
});

describe("/api/mot - acces", () => {
  it("fara autentificare: 401; Agent: 403", async () => {
    await request(app).get("/api/mot/etaloane").expect(401);
    const agent = await autentificaAgent(app, EMAIL_AGENT);
    await agent.get("/api/mot/etaloane").expect(403);
    await agent.post("/api/mot/proba").send({}).expect(403);
  });
});

describe("/api/mot/produse", () => {
  it("cauta in catalog si intoarce pretul din lista activa, nu din schita", async () => {
    const admin = await autentificaAgent(app, EMAIL_ADMIN);
    const { body } = await admin.get("/api/mot/produse").query({ q: "Oslo" }).expect(200);
    const sipca = body.produse.find((p: { cod: string }) => p.cod === "SIPCAMAT050");
    expect(sipca).toMatchObject({
      cod: "SIPCAMAT050",
      denumire: "Șipcă Oslo – mat – 0,50 mm",
      um: "ML",
      pretEur: "1.11",
      finisaj: "mat",
      grosime: "0,50 mm",
      grup: "Șipcă metalică de gard",
      familie: "Șipcă Oslo",
      latimeTotalaMm: "92.9",
      rubrica: "Test Șipcă gard",
    });
    expect(listaId).toBeTruthy();
  });

  it("cere cel putin 2 caractere", async () => {
    const admin = await autentificaAgent(app, EMAIL_ADMIN);
    await admin.get("/api/mot/produse").query({ q: "O" }).expect(400);
  });
});

describe("/api/mot/etaloane", () => {
  it("listeaza cele 11 oferte-model", async () => {
    const admin = await autentificaAgent(app, EMAIL_ADMIN);
    const { body } = await admin.get("/api/mot/etaloane").expect(200);
    expect(body.etaloane.map((e: { id: string }) => e.id)).toEqual(["E01", "E02", "E03", "E04", "E05", "E06", "E07", "E08", "E09", "E10", "E11"]);
    expect(body.etaloane[0].titlu).toMatch(/Iberic/);
  });

  it("E06 se construieste cu preturile si latimea din baza de date", async () => {
    const admin = await autentificaAgent(app, EMAIL_ADMIN);
    const { body } = await admin.get("/api/mot/etaloane/E06").expect(200);
    expect(body.etalon.id).toBe("E06");
    expect(body.intrare.linii).toHaveLength(2);
    expect(body.intrare.linii[0].produs).toMatchObject({ cod: "SIPCAMAT050", pretBazaEur: "1.11", um: "ml", finisaj: "mat", grup: "Șipcă metalică de gard" });
    expect(body.intrare.sipca).toMatchObject({ latimeSipcaMm: "92.9", varianta: "calcul" });
    expect(body.asteptat.totaluri.document_total_lei).toBe("999.96");
  });

  it("E01: cu catalogul Bilka in baza (dupa testul de import) iese 17.000,00 lei; fara el, 422 cu produsul negasit", async () => {
    const admin = await autentificaAgent(app, EMAIL_ADMIN);
    const areCatalog = (await prisma.produs.count({ where: { codFurnizor: "TMIBEMAT050", activ: true } })) > 0;
    const raspuns = await admin.get("/api/mot/etaloane/E01");
    if (areCatalog) {
      expect(raspuns.status).toBe(200);
      const { body } = await admin.post("/api/mot/proba").send(raspuns.body.intrare).expect(200);
      expect(body.rezultat.totaluri.documentTotalLei).toBe("17000.00");
      expect(body.rezultat.totaluri.achizitieContLeiCuTva).toBe("14337.77");
    } else {
      expect(raspuns.status).toBe(422);
      expect(raspuns.body.eroare).toMatch(/Produs negasit in catalog: TMIBEMAT050/);
    }
  });

  it("id invalid: 400; etalon inexistent: 404", async () => {
    const admin = await autentificaAgent(app, EMAIL_ADMIN);
    await admin.get("/api/mot/etaloane/abc").expect(400);
    await admin.get("/api/mot/etaloane/E99").expect(404);
  });
});

describe("/api/mot/proba", () => {
  it("E06 incarcat din baza si calculat: 999,96 lei, abatere -0,01, 100 bucati de sipca", async () => {
    const admin = await autentificaAgent(app, EMAIL_ADMIN);
    const { body: incarcat } = await admin.get("/api/mot/etaloane/E06").expect(200);
    const { body } = await admin.post("/api/mot/proba").send(incarcat.intrare).expect(200);
    const r = body.rezultat;
    expect(r.totaluri).toMatchObject({ achizitieContLeiCuTva: "957.61", documentFaraTvaEur: "155.06", documentCuTvaEur: "187.62", documentTotalLei: "999.96" });
    expect(r.abatereEur).toBe("-0.01");
    expect(r.cantitati.sipca).toMatchObject({ bucatiTotal: 100, mlTotal: "120.000" });
    expect(r.linii.map((l: { pretDocumentEur: string }) => l.pretDocumentEur)).toEqual(["1.18", "6.73"]);
    expect(r.garda.respectata).toBe(true);
    expect(r.textFormulare).toMatch(/^Se va genera 1 formular Bilka/);
  });

  it("intrare invalida: 400, fara rezultat", async () => {
    const admin = await autentificaAgent(app, EMAIL_ADMIN);
    await admin.post("/api/mot/proba").send({ cursBnr: "0" }).expect(400);
  });
});
