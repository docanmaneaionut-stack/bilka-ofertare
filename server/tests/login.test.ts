import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { hashParola } from "../src/modules/accounts/auth.js";

const app = creeazaApp();

const EMAIL_ADMIN = "test-admin-general@exemplu.local";
const EMAIL_AGENT = "test-agent@exemplu.local";
const PAROLA = "parola-de-test-1234";

let firmaId: string;
let administratorId: string;
let agentId: string;

beforeAll(async () => {
  const parolaHash = await hashParola(PAROLA);

  const firma = await prisma.firma.create({
    data: {
      denumire: "Firma de test",
      cui: "RO00000000",
      nrRegCom: "J00/0000/2026",
      adresa: "Strada de test 1",
      telefon: "0700000000",
      email: "firma-test@exemplu.local",
    },
  });
  firmaId = firma.id;

  const administrator = await prisma.utilizator.create({
    data: {
      nume: "Admin General de test",
      email: EMAIL_ADMIN,
      parolaHash,
      rol: "ADMIN_GENERAL",
    },
  });
  administratorId = administrator.id;

  const agent = await prisma.utilizator.create({
    data: {
      nume: "Agent de test",
      email: EMAIL_AGENT,
      parolaHash,
      rol: "AGENT",
      firmaId,
      serieOferta: "ZZZ",
      adaosProcent: 1,
    },
  });
  agentId = agent.id;
});

afterAll(async () => {
  await prisma.jurnalAutentificare.deleteMany({
    where: { utilizatorId: { in: [administratorId, agentId] } },
  });
  await prisma.utilizator.deleteMany({ where: { id: { in: [administratorId, agentId] } } });
  await prisma.firma.delete({ where: { id: firmaId } });
  await prisma.$disconnect();
});

describe("POST /api/auth/login", () => {
  it("respinge parola gresita", async () => {
    await request(app)
      .post("/api/auth/login")
      .send({ email: EMAIL_ADMIN, parola: "gresita" })
      .expect(401);
  });

  it("respinge un email inexistent, fara sa dezvaluie asta", async () => {
    const raspuns = await request(app)
      .post("/api/auth/login")
      .send({ email: "nu-exista@exemplu.local", parola: PAROLA })
      .expect(401);
    expect(raspuns.body.eroare).toBe("Email sau parola incorecte");
  });

  it("accepta credentialele corecte si permite /api/auth/me cu sesiunea rezultata", async () => {
    const agent = request.agent(app);

    const loginRaspuns = await agent
      .post("/api/auth/login")
      .send({ email: EMAIL_ADMIN, parola: PAROLA })
      .expect(200);
    expect(loginRaspuns.body.utilizator.email).toBe(EMAIL_ADMIN);

    const meRaspuns = await agent.get("/api/auth/me").expect(200);
    expect(meRaspuns.body.utilizator.rol).toBe("ADMIN_GENERAL");
  });

  it("dupa logout, sesiunea nu mai functioneaza", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: EMAIL_ADMIN, parola: PAROLA }).expect(200);
    await agent.post("/api/auth/logout").expect(204);
    await agent.get("/api/auth/me").expect(401);
  });
});

describe("GET /api/adm (Zona tehnica)", () => {
  it("fara autentificare, e refuzat", async () => {
    await request(app).get("/api/adm").expect(401);
  });

  it("un cont de agent nu are acces la zona tehnica", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: EMAIL_AGENT, parola: PAROLA }).expect(200);
    await agent.get("/api/adm").expect(403);
  });

  it("Admin general are acces la zona tehnica", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: EMAIL_ADMIN, parola: PAROLA }).expect(200);
    await agent.get("/api/adm").expect(200);
  });
});
