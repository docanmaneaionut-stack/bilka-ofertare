import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";
import { genereazaCodIntern } from "../src/modules/cat/codIntern.js";

const app = creeazaApp();

const EMAIL_ADMIN = "test-produse-admin@exemplu.local";

let adminId: string;
let compartimentId: string;
let grupId: string;
let categorieOfertaId: string;
const produseCreate: string[] = [];
const culoriCreate: string[] = [];

beforeAll(async () => {
  const admin = await creeazaUtilizatorTest(EMAIL_ADMIN, "ADMIN_GENERAL");
  adminId = admin.id;

  const compartiment = await prisma.compartiment.create({
    data: {
      denumire: "Test Furnizor Produse",
      codScurt: "TFP",
      tip: "FURNIZOR",
      moneda: "EUR",
      modPret: "LISTA_ACHIZITIE",
    },
  });
  compartimentId = compartiment.id;

  const grup = await prisma.grup.create({ data: { compartimentId, denumire: "Țiglă metalică" } });
  grupId = grup.id;

  const categorie = await prisma.categorieOferta.create({
    data: { denumire: "Test Învelitori", zona: "A", ordine: 1 },
  });
  categorieOfertaId = categorie.id;

  const culoare = await prisma.culoareFinisajGrosime.create({
    data: { furnizor: "Test Furnizor Produse", finisaj: "lucios", grosime: "0,50 mm", culoare: "3005" },
  });
  culoriCreate.push(culoare.id);
});

afterAll(async () => {
  await prisma.pretListaProdus.deleteMany({ where: { produsId: { in: produseCreate } } });
  await prisma.jurnalIntrare.deleteMany({ where: { entitate: "Produs", entitateId: { in: produseCreate } } });
  await prisma.produs.deleteMany({ where: { id: { in: produseCreate } } });
  await prisma.culoareFinisajGrosime.deleteMany({ where: { id: { in: culoriCreate } } });
  await prisma.categorieOferta.delete({ where: { id: categorieOfertaId } });
  await prisma.grup.delete({ where: { id: grupId } });
  await prisma.compartiment.delete({ where: { id: compartimentId } });
  await prisma.jurnalAutentificare.deleteMany({ where: { utilizatorId: adminId } });
  await prisma.utilizator.delete({ where: { id: adminId } });
  await prisma.$disconnect();
});

describe("Produse", () => {
  it("respinge un produs fara denumire", async () => {
    const admin = await autentificaAgent(app, EMAIL_ADMIN);
    await admin
      .post("/api/adm/cat/produse")
      .send({ compartimentId, grupId, denumire: "", um: "M2", moneda: "EUR" })
      .expect(400);
  });

  it("creeaza un produs fara cod intern - se genereaza automat, dupa aceeasi regula", async () => {
    const admin = await autentificaAgent(app, EMAIL_ADMIN);
    const raspuns = await admin
      .post("/api/adm/cat/produse")
      .send({
        compartimentId,
        grupId,
        codFurnizor: "TMDACLUC050",
        denumire: "Țiglă metalică Dacic – lucios – 0,50 mm",
        finisaj: "lucios",
        grosime: "0,50 mm",
        um: "M2",
        moneda: "EUR",
        categorieOfertaId,
      })
      .expect(201);
    produseCreate.push(raspuns.body.produs.id);

    const asteptat = genereazaCodIntern({
      codScurtCompartiment: "TFP",
      codFurnizor: "TMDACLUC050",
      denumire: "Țiglă metalică Dacic – lucios – 0,50 mm",
    });
    expect(raspuns.body.produs.codIntern).toBe(asteptat);

    const jurnal = await prisma.jurnalIntrare.findMany({ where: { entitateId: raspuns.body.produs.id } });
    expect(jurnal).toHaveLength(1);
    expect(jurnal[0].actiune).toBe("creare");
  });

  it("permite acelasi cod furnizor pe doua produse diferite (un cod, doua produse)", async () => {
    const admin = await autentificaAgent(app, EMAIL_ADMIN);
    const a = await admin
      .post("/api/adm/cat/produse")
      .send({
        compartimentId,
        grupId,
        codFurnizor: "TPLANLUC070",
        denumire: "Tablă plană – învelitoare la mp",
        um: "M2",
        moneda: "EUR",
      })
      .expect(201);
    const b = await admin
      .post("/api/adm/cat/produse")
      .send({
        compartimentId,
        grupId,
        codFurnizor: "TPLANLUC070",
        denumire: "Tablă plană – accesoriu la coală",
        um: "BUC",
        moneda: "EUR",
      })
      .expect(201);
    produseCreate.push(a.body.produs.id, b.body.produs.id);
    expect(a.body.produs.codFurnizor).toBe(b.body.produs.codFurnizor);
    expect(a.body.produs.codIntern).not.toBe(b.body.produs.codIntern);
  });

  it("editarea unui produs scrie in jurnal doar campurile schimbate", async () => {
    const admin = await autentificaAgent(app, EMAIL_ADMIN);
    const creat = await admin
      .post("/api/adm/cat/produse")
      .send({
        compartimentId,
        grupId,
        denumire: "Produs de editat",
        um: "M2",
        moneda: "EUR",
        pret_fals: "ignorat", // camp necunoscut, trebuie ignorat de validare
      })
      .expect(201);
    const id = creat.body.produs.id;
    produseCreate.push(id);

    await admin
      .put(`/api/adm/cat/produse/${id}`)
      .send({ compartimentId, grupId, denumire: "Produs editat", um: "M2", moneda: "EUR" })
      .expect(200);

    const jurnal = await prisma.jurnalIntrare.findMany({ where: { entitateId: id, actiune: "modificare" } });
    expect(jurnal).toHaveLength(1);
    expect(jurnal[0].camp).toBe("denumire");
    expect(jurnal[0].valoareInainte).toBe("Produs de editat");
    expect(jurnal[0].valoareDupa).toBe("Produs editat");
  });

  it("lista filtreaza dupa compartiment si cauta dupa denumire", async () => {
    const admin = await autentificaAgent(app, EMAIL_ADMIN);
    const raspuns = await admin
      .get("/api/adm/cat/produse")
      .query({ compartimentId, q: "Dacic" })
      .expect(200);
    expect(raspuns.body.total).toBeGreaterThanOrEqual(1);
    expect(raspuns.body.produse.every((p: { denumire: string }) => p.denumire.includes("Dacic"))).toBe(true);
  });

  it("verificarea culorilor arata tabelul general cand produsul nu are exceptii", async () => {
    const admin = await autentificaAgent(app, EMAIL_ADMIN);
    const raspuns = await admin
      .get("/api/adm/cat/produse/culori-verificare")
      .query({ compartimentId, finisaj: "lucios", grosime: "0,50 mm" })
      .expect(200);
    expect(raspuns.body.sursa).toBe("tabel_general");
    expect(raspuns.body.culori).toEqual(["3005"]);
  });

  it("verificarea culorilor arata exceptiile produsului cand sunt completate", async () => {
    const admin = await autentificaAgent(app, EMAIL_ADMIN);
    const raspuns = await admin
      .get("/api/adm/cat/produse/culori-verificare")
      .query({ compartimentId, finisaj: "lucios", grosime: "0,50 mm", exceptii: "9005, 9006" })
      .expect(200);
    expect(raspuns.body.sursa).toBe("exceptie");
    expect(raspuns.body.culori).toEqual(["9005", "9006"]);
  });
});
