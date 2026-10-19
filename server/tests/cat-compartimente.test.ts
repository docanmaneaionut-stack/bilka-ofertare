import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

const app = creeazaApp();

const EMAIL_ADMIN = "test-cat-admin@exemplu.local";
const EMAIL_AGENT = "test-cat-agent@exemplu.local";

let adminId: string;
let agentId: string;
const compartimenteCreate: string[] = [];
const grupuriCreate: string[] = [];
const familiiCreate: string[] = [];

beforeAll(async () => {
  const admin = await creeazaUtilizatorTest(EMAIL_ADMIN, "ADMIN_GENERAL");
  adminId = admin.id;
  const agent = await creeazaUtilizatorTest(EMAIL_AGENT, "AGENT", { serieOferta: "ZCT" });
  agentId = agent.id;
});

afterAll(async () => {
  await prisma.familie.deleteMany({ where: { id: { in: familiiCreate } } });
  await prisma.grup.deleteMany({ where: { id: { in: grupuriCreate } } });
  await prisma.jurnalIntrare.deleteMany({ where: { entitateId: { in: compartimenteCreate } } });
  await prisma.jurnalIntrare.deleteMany({ where: { entitate: { in: ["Grup", "Familie"] }, entitateId: { in: [...grupuriCreate, ...familiiCreate] } } });
  await prisma.compartiment.deleteMany({ where: { id: { in: compartimenteCreate } } });
  await prisma.jurnalAutentificare.deleteMany({ where: { utilizatorId: { in: [adminId, agentId] } } });
  await prisma.utilizator.deleteMany({ where: { id: { in: [adminId, agentId] } } });
  await prisma.$disconnect();
});

describe("Compartimente", () => {
  it("un agent nu poate accesa ecranele de catalog", async () => {
    const agent = await autentificaAgent(app, EMAIL_AGENT);
    await agent.get("/api/adm/cat/compartimente").expect(403);
  });

  it("Admin general creeaza un compartiment, intrarea apare in jurnal", async () => {
    const admin = await autentificaAgent(app, EMAIL_ADMIN);
    const raspuns = await admin
      .post("/api/adm/cat/compartimente")
      .send({
        denumire: "Test Furnizor CAT",
        codScurt: "tfc",
        tip: "FURNIZOR",
        moneda: "EUR",
        modPret: "LISTA_ACHIZITIE",
      })
      .expect(201);

    const compartiment = raspuns.body.compartiment;
    compartimenteCreate.push(compartiment.id);
    expect(compartiment.codScurt).toBe("TFC");

    const jurnal = await prisma.jurnalIntrare.findMany({ where: { entitateId: compartiment.id } });
    expect(jurnal).toHaveLength(1);
    expect(jurnal[0].actiune).toBe("creare");
    expect(jurnal[0].entitate).toBe("Compartiment");
  });

  it("respinge o cerere fara campuri obligatorii", async () => {
    const admin = await autentificaAgent(app, EMAIL_ADMIN);
    await admin.post("/api/adm/cat/compartimente").send({ denumire: "" }).expect(400);
  });

  it("editarea unui compartiment scrie in jurnal doar campurile schimbate", async () => {
    const admin = await autentificaAgent(app, EMAIL_ADMIN);
    const creat = await admin
      .post("/api/adm/cat/compartimente")
      .send({
        denumire: "Test Furnizor Editare",
        codScurt: "TFE",
        tip: "FURNIZOR",
        moneda: "EUR",
        modPret: "LISTA_ACHIZITIE",
        contactFurnizorNume: "Agent Vechi",
      })
      .expect(201);
    const id = creat.body.compartiment.id;
    compartimenteCreate.push(id);

    await admin
      .put(`/api/adm/cat/compartimente/${id}`)
      .send({
        denumire: "Test Furnizor Editare",
        codScurt: "TFE",
        tip: "FURNIZOR",
        moneda: "EUR",
        modPret: "LISTA_ACHIZITIE",
        contactFurnizorNume: "Agent Nou",
      })
      .expect(200);

    const jurnal = await prisma.jurnalIntrare.findMany({
      where: { entitateId: id, actiune: "modificare" },
    });
    expect(jurnal).toHaveLength(1);
    expect(jurnal[0].camp).toBe("contactFurnizorNume");
    expect(jurnal[0].valoareInainte).toBe("Agent Vechi");
    expect(jurnal[0].valoareDupa).toBe("Agent Nou");
  });

  it("adauga un grup si o familie in compartiment, cu jurnal", async () => {
    const admin = await autentificaAgent(app, EMAIL_ADMIN);
    const compartiment = await admin
      .post("/api/adm/cat/compartimente")
      .send({
        denumire: "Test Furnizor Grupuri",
        codScurt: "TFG",
        tip: "FURNIZOR",
        moneda: "EUR",
        modPret: "LISTA_ACHIZITIE",
      })
      .expect(201);
    const compartimentId = compartiment.body.compartiment.id;
    compartimenteCreate.push(compartimentId);

    const grup = await admin
      .post(`/api/adm/cat/compartimente/${compartimentId}/grupuri`)
      .send({ denumire: "Țiglă metalică", ordine: 1 })
      .expect(201);
    grupuriCreate.push(grup.body.grup.id);

    const familie = await admin
      .post(`/api/adm/cat/grupuri/${grup.body.grup.id}/familii`)
      .send({ denumire: "Dacic", ordine: 1 })
      .expect(201);
    familiiCreate.push(familie.body.familie.id);

    const detaliu = await admin.get(`/api/adm/cat/compartimente/${compartimentId}`).expect(200);
    expect(detaliu.body.compartiment.grupuri).toHaveLength(1);
    expect(detaliu.body.compartiment.grupuri[0].familii).toHaveLength(1);
    expect(detaliu.body.compartiment.grupuri[0].familii[0].denumire).toBe("Dacic");
  });
});
