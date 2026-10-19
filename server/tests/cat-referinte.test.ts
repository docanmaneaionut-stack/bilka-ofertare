import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

const app = creeazaApp();

const EMAIL_ADMIN = "test-referinte-admin@exemplu.local";
const EMAIL_AGENT = "test-referinte-agent@exemplu.local";
const FURNIZOR = "Test Furnizor Referinte";

let adminId: string;
let agentId: string;
const trepteCreate: string[] = [];

beforeAll(async () => {
  adminId = (await creeazaUtilizatorTest(EMAIL_ADMIN, "ADMIN_GENERAL")).id;
  agentId = (await creeazaUtilizatorTest(EMAIL_AGENT, "AGENT", { serieOferta: "ZRF" })).id;
});

afterAll(async () => {
  await prisma.jurnalIntrare.deleteMany({ where: { entitate: "TreaptaDesfasurata", entitateId: { in: trepteCreate } } });
  await prisma.treaptaDesfasurata.deleteMany({ where: { id: { in: trepteCreate } } });
  await prisma.jurnalAutentificare.deleteMany({ where: { utilizatorId: { in: [adminId, agentId] } } });
  await prisma.utilizator.deleteMany({ where: { id: { in: [adminId, agentId] } } });
  await prisma.$disconnect();
});

describe("Tabele de referinta (exemplu: trepte desfasurata)", () => {
  it("un agent nu are acces", async () => {
    const agent = await autentificaAgent(app, EMAIL_AGENT);
    await agent.get("/api/adm/cat/referinte/trepte-desfasurata").expect(403);
  });

  it("adaugare cu jurnal, apoi dezactivare cu jurnal (nimic nu se sterge)", async () => {
    const admin = await autentificaAgent(app, EMAIL_ADMIN);

    const creat = await admin
      .post("/api/adm/cat/referinte/trepte-desfasurata")
      .send({ furnizor: FURNIZOR, treapta: "D01", deLaMm: 1, panaLaMm: 50, denumireBilka: "ACCESORIU SPECIAL D01" })
      .expect(201);
    const id = creat.body.rand.id;
    trepteCreate.push(id);
    expect(creat.body.rand.activ).toBe(true);

    await admin
      .put(`/api/adm/cat/referinte/trepte-desfasurata/${id}`)
      .send({ furnizor: FURNIZOR, treapta: "D01", deLaMm: 1, panaLaMm: 50, denumireBilka: "ACCESORIU SPECIAL D01", activ: false })
      .expect(200);

    const jurnal = await prisma.jurnalIntrare.findMany({ where: { entitateId: id }, orderBy: { moment: "asc" } });
    expect(jurnal.map((j) => j.actiune)).toEqual(["creare", "modificare"]);
    expect(jurnal[1].camp).toBe("activ");
    expect(jurnal[1].valoareInainte).toBe("true");
    expect(jurnal[1].valoareDupa).toBe("false");

    const inBaza = await prisma.treaptaDesfasurata.findUnique({ where: { id } });
    expect(inBaza).not.toBeNull();
    expect(inBaza!.activ).toBe(false);
  });

  it("respinge o treapta duplicata (furnizor + treapta unice)", async () => {
    const admin = await autentificaAgent(app, EMAIL_ADMIN);
    const prima = await admin
      .post("/api/adm/cat/referinte/trepte-desfasurata")
      .send({ furnizor: FURNIZOR, treapta: "D02", deLaMm: 51, panaLaMm: 100, denumireBilka: "ACCESORIU SPECIAL D02" })
      .expect(201);
    trepteCreate.push(prima.body.rand.id);

    await admin
      .post("/api/adm/cat/referinte/trepte-desfasurata")
      .send({ furnizor: FURNIZOR, treapta: "D02", deLaMm: 51, panaLaMm: 100, denumireBilka: "DUPLICAT" })
      .expect(409);
  });
});
