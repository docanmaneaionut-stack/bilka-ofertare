import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { cursPentruMoment, type CursZi } from "../src/modules/curs/regula.js";
import { cursulZilei } from "../src/modules/curs/serviciu.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

// Ofertele (S12): numerotarea pe serie in concurenta, cele doua cursuri inghetate
// la creare, deduplicarea clientilor dupa telefon, vizibilitatea pe roluri,
// raspunsul catre Agent fara adaos / pret de baza, contorul pornit de la un numar.

const app = creeazaApp();
const S = "-ofe@exemplu.local";
const EMAIL = {
  adminGeneral: `admin-general${S}`,
  admin1: `admin1${S}`,
  agent1: `agent1${S}`,
  agent1b: `agent1b${S}`,
  colab1: `colab1${S}`,
  admin2: `admin2${S}`,
  agent2: `agent2${S}`,
  contabil: `contabil${S}`,
};
let firma1: string;
let firma2: string;
let idAgent1: string;
let idAgent1b: string;
let azi: string;
let ieri: string;
const seedCursuri: CursZi[] = [];

function dataLocala(delta = 0): string {
  const d = new Date(Date.now() + delta * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

beforeAll(async () => {
  await creeazaUtilizatorTest(EMAIL.adminGeneral, "ADMIN_GENERAL");
  firma1 = (await prisma.firma.create({ data: { denumire: "Firma Unu OFE", cui: "RO11", nrRegCom: "J11", adresa: "A", telefon: "1", email: `f1${S}` } })).id;
  firma2 = (await prisma.firma.create({ data: { denumire: "Firma Doi OFE", cui: "RO22", nrRegCom: "J22", adresa: "B", telefon: "2", email: `f2${S}` } })).id;
  const admin1 = await creeazaUtilizatorTest(EMAIL.admin1, "ADMINISTRATOR", { firmaId: firma1, serieOferta: "OAU", adaosProcent: 1 });
  idAgent1 = (await creeazaUtilizatorTest(EMAIL.agent1, "AGENT", { firmaId: firma1, administratorId: admin1.id, serieOferta: "OAG", adaosProcent: 1 })).id;
  idAgent1b = (await creeazaUtilizatorTest(EMAIL.agent1b, "AGENT", { firmaId: firma1, administratorId: admin1.id, serieOferta: "OAB", adaosProcent: 1 })).id;
  await creeazaUtilizatorTest(EMAIL.colab1, "COLABORATOR", { firmaId: firma1, administratorId: admin1.id, serieOferta: "OCO", adaosProcent: 5 });
  const admin2 = await creeazaUtilizatorTest(EMAIL.admin2, "ADMINISTRATOR", { firmaId: firma2, serieOferta: "OAD", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.agent2, "AGENT", { firmaId: firma2, administratorId: admin2.id, serieOferta: "OAX", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.contabil, "CONTABILITATE", { accesGeneralFirme: true });

  // cursuri pentru azi si ieri (ora Romaniei): regula 13:00 alege unul din ele,
  // deterministic, fara apel la BNR
  azi = dataLocala(0);
  ieri = dataLocala(-1);
  await prisma.cursValutar.deleteMany({ where: { data: { in: [new Date(`${azi}T00:00:00Z`), new Date(`${ieri}T00:00:00Z`)] } } });
  await prisma.cursValutar.createMany({
    data: [
      { data: new Date(`${azi}T00:00:00Z`), moneda: "EUR", curs: "5.3485", sursa: "test" },
      { data: new Date(`${ieri}T00:00:00Z`), moneda: "EUR", curs: "5.3297", sursa: "test" },
    ],
  });
  seedCursuri.push({ data: azi, curs: "5.3485", sursa: "test" }, { data: ieri, curs: "5.3297", sursa: "test" });
});

afterAll(async () => {
  await prisma.$disconnect();
});

const CLIENT = { nume: "Popescu Andrei", telefon: "0728 192 569", adresa: "Str. Lungă 10", localitate: "Câmpineanca" };

describe("crearea ofertei", () => {
  it("Agentul creeaza o oferta In lucru cu numarul 1 pe seria lui, clientul si cele doua cursuri inghetate", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const { body } = await agent.post("/api/oferte").send({ client: CLIENT }).expect(201);
    const o = body.oferta;
    expect(o.numarComplet).toBe("OAG-0001");
    expect(o.status).toBe("IN_LUCRU");
    expect(o.data).toBe(azi);
    expect(o.client).toMatchObject({ nume: "Popescu Andrei", telefon: "0728 192 569", localitate: "Câmpineanca" });
    expect(o.firma.id).toBe(firma1);
    expect(o.cont.id).toBe(idAgent1);
    // cursul dupa regula 13:00, pe cursurile din tabel; achizitia = BNR x 1,01, 4 zecimale
    const asteptat = cursPentruMoment(new Date(), seedCursuri)!;
    expect(o.curs.cursBnr).toBe(asteptat.curs);
    expect(o.curs.dataCurs).toBe(asteptat.data);
    expect(o.curs.cursAchizitie).toBe(asteptat.curs === "5.3485" ? "5.4020" : "5.3830");
    expect(o.curs.avertizareCurs).toBeNull();
    expect(o.tinta).toEqual({ tip: "ADAOS_PCT", valoare: "20" });
    expect(o.tvaPct).toBe("21");
    expect(o.poateModifica).toBe(true);
    // jurnal: creare oferta + creare client
    const jurnal = await prisma.jurnalIntrare.findMany({ where: { entitateId: o.id } });
    expect(jurnal.map((j) => j.actiune)).toEqual(["creare"]);
  });

  it("acelasi telefon scris altfel (+40) leaga oferta de clientul existent; numarul creste", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const { body } = await agent.post("/api/oferte").send({ client: { ...CLIENT, telefon: "+40 728 192 569", adresa: "Str. Lungă 10" } }).expect(201);
    expect(body.oferta.numarComplet).toBe("OAG-0002");
    const clienti = await prisma.client.findMany({ where: { telefonNormalizat: "0728192569" } });
    expect(clienti).toHaveLength(1);
    expect(body.oferta.client.id).toBe(clienti[0].id);
  });

  it("10 creari simultane primesc 10 numere distincte, consecutive", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1b);
    const raspunsuri = await Promise.all(
      Array.from({ length: 10 }, (_, i) => agent.post("/api/oferte").send({ client: { ...CLIENT, telefon: `0700000${String(i).padStart(3, "0")}` } })),
    );
    const numere = raspunsuri.map((r) => {
      expect(r.status).toBe(201);
      return r.body.oferta.numar as number;
    });
    expect([...new Set(numere)].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("Admin general si Contabilitatea nu fac oferte (403); cont fara serie: 400", async () => {
    const adminGeneral = await autentificaAgent(app, EMAIL.adminGeneral);
    await adminGeneral.post("/api/oferte").send({ client: CLIENT }).expect(403);
    const contabil = await autentificaAgent(app, EMAIL.contabil);
    await contabil.post("/api/oferte").send({ client: CLIENT }).expect(403);
    await prisma.utilizator.update({ where: { email: EMAIL.colab1 }, data: { serieOferta: null } });
    const colab = await autentificaAgent(app, EMAIL.colab1);
    const { body } = await colab.post("/api/oferte").send({ client: CLIENT }).expect(400);
    expect(body.eroare).toMatch(/serie/);
    await prisma.utilizator.update({ where: { email: EMAIL.colab1 }, data: { serieOferta: "OCO" } });
  });

  it("client fara adresa sau cu telefon prea scurt: 400", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    await agent.post("/api/oferte").send({ client: { nume: "X Y", telefon: "0728 192 569" } }).expect(400);
    await agent.post("/api/oferte").send({ client: { nume: "X Y", telefon: "12", adresa: "a" } }).expect(400);
  });
});

describe("cursul la creare: offline", () => {
  it("dupa 13:00 fara cursul zilei si fara internet: cursul precedent cu avertizare; fara niciun curs: eroare", async () => {
    const fallback = async () => {
      throw new Error("fara internet");
    };
    // un moment sigur dupa 13:00 pentru care tabelul n-are curs: maine la 15:00
    const maine = new Date(Date.now() + 24 * 3600 * 1000);
    const momentMaine = new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(maine)}T15:00:00+02:00`);
    const c = await cursulZilei(momentMaine, fallback);
    expect(c.dataCurs).toBe(azi);
    expect(c.cursBnr).toBe("5.3485");
    expect(c.avertizareCurs).toMatch(/curs de ieri \/ offline/);

    const demult = new Date("2000-01-05T15:00:00+02:00");
    await expect(cursulZilei(demult, fallback)).rejects.toThrow(/niciun curs/);
  });
});

describe("vizibilitatea (FISA-CONTURI §2)", () => {
  it("Agentul vede doar ofertele lui, fara coloana Agent; alt agent al firmei nu le vede", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const { body } = await agent.get("/api/oferte").expect(200);
    expect(body.oferte.every((o: { agent: { id: string } }) => o.agent.id === idAgent1)).toBe(true);
    expect(body.oferte.map((o: { numarComplet: string }) => o.numarComplet)).toEqual(["OAG-0002", "OAG-0001"]);
    expect(body.numaratori).toMatchObject({ total: 2, inLucru: 2, deComandat: 0, comandate: 0 });

    const agent1b = await autentificaAgent(app, EMAIL.agent1b);
    const r = await agent1b.get("/api/oferte").expect(200);
    expect(r.body.oferte.some((o: { serie: string }) => o.serie === "OAG")).toBe(false);
    expect(r.body.oferte.every((o: { agent: { id: string } }) => o.agent.id === idAgent1b)).toBe(true);
    expect(r.body.total).toBe(10);
  });

  it("Administratorul vede implicit ofertele lui, cu agent=toate pe toate ale firmei; firma cealalta nu", async () => {
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    const implicit = await admin1.get("/api/oferte").expect(200);
    expect(implicit.body.total).toBe(0);
    const toate = await admin1.get("/api/oferte").query({ agent: "toate" }).expect(200);
    expect(toate.body.total).toBe(12);
    const unAgent = await admin1.get("/api/oferte").query({ agent: idAgent1 }).expect(200);
    expect(unAgent.body.total).toBe(2);

    const admin2 = await autentificaAgent(app, EMAIL.admin2);
    const alta = await admin2.get("/api/oferte").query({ agent: "toate" }).expect(200);
    expect(alta.body.total).toBe(0);
  });

  it("Admin general vede toate firmele, cu filtrul firma si marcajul clientului cu mai multe oferte; Contabilitatea 403", async () => {
    const adminGeneral = await autentificaAgent(app, EMAIL.adminGeneral);
    const toate = await adminGeneral.get("/api/oferte").query({ pageSize: 100 }).expect(200);
    expect(toate.body.total).toBeGreaterThanOrEqual(12);
    const f1 = await adminGeneral.get("/api/oferte").query({ firmaId: firma1, pageSize: 100 }).expect(200);
    expect(f1.body.total).toBe(12);
    // pe firma acestui test (alte teste creeaza oferte pe acelasi client in firmele lor)
    const multiplu = await adminGeneral.get("/api/oferte").query({ clientMultiplu: "da", firmaId: firma1, pageSize: 100 }).expect(200);
    expect(multiplu.body.oferte.map((o: { numarComplet: string }) => o.numarComplet).sort()).toEqual(["OAG-0001", "OAG-0002"]);
    expect(multiplu.body.oferte[0].clientMultiplu).toBe(true);
    const f2 = await adminGeneral.get("/api/oferte").query({ firmaId: firma2 }).expect(200);
    expect(f2.body.total).toBe(0);

    const contabil = await autentificaAgent(app, EMAIL.contabil);
    await contabil.get("/api/oferte").expect(403);
  });

  it("cautarea: dupa client, telefon (normalizat), numar de oferta si localitate", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    for (const [q, asteptat] of [["popescu", 2], ["+40 728", 2], ["OAG-0002", 1], ["câmpineanca", 2], ["inexistent", 0]] as const) {
      const r = await agent.get("/api/oferte").query({ q });
      expect(r.status, JSON.stringify(r.body)).toBe(200);
      expect(r.body.total, `cautare "${q}"`).toBe(asteptat);
    }
  });

  it("detaliul: alt agent 403; Administratorul firmei si Admin general 200; Agentul nu primeste adaosul si pretul de baza", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const lista = await agent.get("/api/oferte").expect(200);
    const id = lista.body.oferte[0].id as string;
    const { body } = await agent.get(`/api/oferte/${id}`).expect(200);
    expect(JSON.stringify(body)).not.toMatch(/adaosProcent|pretBazaEur/);
    expect(body.oferta.cont).not.toHaveProperty("adaosProcent");

    const agent1b = await autentificaAgent(app, EMAIL.agent1b);
    await agent1b.get(`/api/oferte/${id}`).expect(403);
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    expect((await admin1.get(`/api/oferte/${id}`).expect(200)).body.oferta.poateModifica).toBe(true);
    const adminGeneral = await autentificaAgent(app, EMAIL.adminGeneral);
    expect((await adminGeneral.get(`/api/oferte/${id}`).expect(200)).body.oferta.poateModifica).toBe(false);
    const admin2 = await autentificaAgent(app, EMAIL.admin2);
    await admin2.get(`/api/oferte/${id}`).expect(403);
  });
});

describe("antetul si clientul", () => {
  it("antetul se modifica cu jurnal; Admin general nu modifica (403)", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = (await agent.get("/api/oferte")).body.oferte[1].id as string;
    const { body } = await agent.put(`/api/oferte/${id}/antet`).send({ data: "2026-10-20", sursaClient: "recomandare montator", note: "sună după 18" }).expect(200);
    expect(body.oferta).toMatchObject({ data: "2026-10-20", sursaClient: "recomandare montator", note: "sună după 18" });
    const jurnal = await prisma.jurnalIntrare.findMany({ where: { entitateId: id, actiune: "modificare" } });
    expect(jurnal.map((j) => j.camp).sort()).toEqual(["data", "note", "sursaClient"]);
    const adminGeneral = await autentificaAgent(app, EMAIL.adminGeneral);
    await adminGeneral.put(`/api/oferte/${id}/antet`).send({ note: "x" }).expect(403);
  });

  it("clientul: datele se actualizeaza in baza comuna; alt telefon existent releaga oferta", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = (await agent.get("/api/oferte")).body.oferte[0].id as string;
    const r1 = await agent.put(`/api/oferte/${id}/client`).send({ ...CLIENT, email: "popescu@exemplu.local" });
    expect(r1.status, JSON.stringify(r1.body)).toBe(200);
    expect(r1.body.oferta.client.email).toBe("popescu@exemplu.local");
    const releagat = await agent.put(`/api/oferte/${id}/client`).send({ nume: "Altcineva", telefon: "0700000001", adresa: "Bulevard 5" });
    expect(releagat.status, JSON.stringify(releagat.body)).toBe(200);
    const clientNou = await prisma.client.findUnique({ where: { telefonNormalizat: "0700000001" } });
    expect(releagat.body.oferta.client.id).toBe(clientNou!.id);
    expect(releagat.body.oferta.client.nume).toBe("Altcineva");
  });

  it("fisa clientului arata ofertele lui in limita vizibilitatii", async () => {
    const client = await prisma.client.findUniqueOrThrow({ where: { telefonNormalizat: "0728192569" } });
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const { body } = await agent.get(`/api/clienti/${client.id}`).expect(200);
    expect(body.client.nume).toBe("Popescu Andrei");
    expect(body.oferte).toHaveLength(1); // OAG-0001 a fost relegata la alt client
    const cautare = await agent.get("/api/clienti").query({ telefon: "+40728" }).expect(200);
    expect(cautare.body.clienti.map((c: { telefon: string }) => c.telefon)).toContain("0728 192 569");
    const contabil = await autentificaAgent(app, EMAIL.contabil);
    await contabil.get("/api/clienti").query({ q: "pop" }).expect(403);
  });
});

describe("contorul seriei", () => {
  it("Admin general porneste contorul de la un numar dat, cu jurnal; nu coboara sub numerele folosite", async () => {
    const adminGeneral = await autentificaAgent(app, EMAIL.adminGeneral);
    await adminGeneral.put("/api/oferte/contor/OCO").send({ ultimulNumar: 147 }).expect(200);
    const colab = await autentificaAgent(app, EMAIL.colab1);
    const { body } = await colab.post("/api/oferte").send({ client: { ...CLIENT, telefon: "0711111111" } }).expect(201);
    expect(body.oferta.numarComplet).toBe("OCO-0148");
    const r = await adminGeneral.put("/api/oferte/contor/OCO").send({ ultimulNumar: 100 }).expect(409);
    expect(r.body.eroare).toMatch(/nu poate coborî/);
    const jurnal = await prisma.jurnalIntrare.findFirst({ where: { entitate: "ContorSerie", entitateId: "OCO" } });
    expect(jurnal?.valoareDupa).toBe("147");
    await colab.put("/api/oferte/contor/OCO").send({ ultimulNumar: 1 }).expect(403);
  });
});

describe("cursul BNR prin API", () => {
  it("oricine conectat vede cursul valabil acum si ultimele cursuri; preluarea manuala e doar Admin general", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const { body } = await agent.get("/api/curs").expect(200);
    expect(body.azi.cursBnr).toBe(cursPentruMoment(new Date(), seedCursuri)!.curs);
    expect(body.ultimele.length).toBeGreaterThanOrEqual(2);
    await agent.post("/api/curs/preia").send({}).expect(403);
    const adminGeneral = await autentificaAgent(app, EMAIL.adminGeneral);
    await adminGeneral.post("/api/curs/manual").send({ data: "2026-01-02", curs: "4.9751" }).expect(200);
    const manual = await prisma.cursValutar.findUnique({ where: { data_moneda: { data: new Date("2026-01-02T00:00:00Z"), moneda: "EUR" } } });
    expect(manual?.sursa).toBe("manual");
    expect(manual?.curs.toFixed(4)).toBe("4.9751");
  });
});

describe("migrarea 6 e aditiva", () => {
  it("SQL-ul creeaza doar tipuri, tabele, indexuri si chei straine", async () => {
    const fs = await import("node:fs");
    const sql = fs.readFileSync(new URL("../prisma/migrations/20261028090000_ofertare_clienti_curs/migration.sql", import.meta.url), "utf8");
    expect(sql).not.toMatch(/\bDROP\b|\bTRUNCATE\b|ALTER TABLE "[a-z_]+" (DROP|ALTER COLUMN)/);
    expect((sql.match(/CREATE TABLE/g) ?? []).length).toBe(12);
    expect(request).toBeDefined();
  });
});
