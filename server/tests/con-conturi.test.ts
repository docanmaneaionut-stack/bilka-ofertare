import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { autentificaAgent, creeazaUtilizatorTest, PAROLA_TEST } from "./helpers.js";

const app = creeazaApp();
const S = "-con@exemplu.local";
const EMAIL = {
  adminGeneral: `admin-general${S}`,
  rezerva: "rezerva-test@exemplu.local", // ADMIN_REZERVA_EMAIL din vitest.config.ts
  admin1: `admin1${S}`,
  admin2: `admin2${S}`,
  agent2: `agent2${S}`,
  colaborator1: `colab1${S}`,
};

let firma1: string;
let firma2: string;
let idAdmin1: string;
let idAgent2: string;
let idAgentNou = "";
let emailAgentNou = "";
let idAdminGeneral: string;
const PAROLA_INITIALA = "parola-initiala-123";

beforeAll(async () => {
  idAdminGeneral = (await creeazaUtilizatorTest(EMAIL.adminGeneral, "ADMIN_GENERAL")).id;
  await creeazaUtilizatorTest(EMAIL.rezerva, "ADMIN_GENERAL");
  firma1 = (await prisma.firma.create({ data: { denumire: "Firma Unu CON", cui: "RO1", nrRegCom: "J1", adresa: "A", telefon: "1", email: `f1${S}` } })).id;
  firma2 = (await prisma.firma.create({ data: { denumire: "Firma Doi CON", cui: "RO2", nrRegCom: "J2", adresa: "B", telefon: "2", email: `f2${S}` } })).id;
  idAdmin1 = (await creeazaUtilizatorTest(EMAIL.admin1, "ADMINISTRATOR", { firmaId: firma1, serieOferta: "ADU", adaosProcent: 1 })).id;
  const admin2 = await creeazaUtilizatorTest(EMAIL.admin2, "ADMINISTRATOR", { firmaId: firma2, serieOferta: "ADD", adaosProcent: 1 });
  idAgent2 = (await creeazaUtilizatorTest(EMAIL.agent2, "AGENT", { firmaId: firma2, administratorId: admin2.id, serieOferta: "AGD", adaosProcent: 1.5 })).id;
  await creeazaUtilizatorTest(EMAIL.colaborator1, "COLABORATOR", { firmaId: firma1, administratorId: idAdmin1, serieOferta: "COU", adaosProcent: 7 });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Permisiuni pe roluri", () => {
  it("Agentul si Colaboratorul primesc 403 pe orice ruta din Zona tehnica si nu vad adaosul %", async () => {
    for (const email of [EMAIL.agent2, EMAIL.colaborator1]) {
      const agent = await autentificaAgent(app, email);
      for (const cale of ["/api/adm", "/api/adm/cat/produse", "/api/adm/con/utilizatori", "/api/adm/con/firme", "/api/adm/export", "/api/adm/lp/compartimente/x/liste"]) {
        await agent.get(cale).expect(403);
      }
      const me = await agent.get("/api/auth/me").expect(200);
      const cont = await agent.get("/api/cont").expect(200);
      expect(JSON.stringify(me.body).toLowerCase()).not.toContain("adaos");
      expect(JSON.stringify(cont.body).toLowerCase()).not.toContain("adaos");
      expect(JSON.stringify(cont.body)).not.toContain("parolaHash");
    }
  });

  it("Administratorul nu poate crea firme sau Administratori si nu vede utilizatorii altei firme", async () => {
    const admin = await autentificaAgent(app, EMAIL.admin1);
    await admin.post("/api/adm/con/firme").send({ denumire: "X", cui: "X", nrRegCom: "X", adresa: "X", telefon: "X", email: "x@x" }).expect(403);
    await admin
      .post("/api/adm/con/utilizatori")
      .send({ nume: "Alt admin", email: `altadmin${S}`, rol: "ADMINISTRATOR", firmaId: firma2, serieOferta: "ALT", parolaInitiala: PAROLA_INITIALA })
      .expect(403);

    const lista = await admin.get("/api/adm/con/utilizatori").expect(200);
    const emails = lista.body.utilizatori.map((u: { email: string }) => u.email);
    expect(emails).toContain(EMAIL.admin1);
    expect(emails).toContain(EMAIL.colaborator1);
    expect(emails).not.toContain(EMAIL.agent2);
    expect(emails).not.toContain(EMAIL.adminGeneral);
    await admin.get(`/api/adm/con/utilizatori/${idAgent2}`).expect(404);
    await admin.put(`/api/adm/con/utilizatori/${idAgent2}`).send({ nume: "x", email: EMAIL.agent2, rol: "AGENT", serieOferte: "AGD" }).expect(404);
    await admin.post(`/api/adm/con/utilizatori/${idAdminGeneral}/parola`).send({ parolaNoua: "parola-de-12-caractere" }).expect(404);

    const firme = await admin.get("/api/adm/con/firme").expect(200);
    expect(firme.body.firme.map((f: { id: string }) => f.id)).toEqual([firma1]);
    await admin.get(`/api/adm/con/firme/${firma2}`).expect(404);
  });

  it("Administratorul isi modifica doar datele de contact ale firmei lui, cu jurnal", async () => {
    const admin = await autentificaAgent(app, EMAIL.admin1);
    await admin.put(`/api/adm/con/firme/${firma1}`).send({ adresa: "Strada Noua 5", localitate: "Focșani", judet: "Vrancea", telefon: "0700", email: `f1${S}`, denumire: "Incercare de redenumire" }).expect(200);
    const f = await prisma.firma.findUnique({ where: { id: firma1 } });
    expect(f!.denumire).toBe("Firma Unu CON");
    expect(f!.adresa).toBe("Strada Noua 5");
    const jurnal = await prisma.jurnalIntrare.findMany({ where: { entitate: "Firma", entitateId: firma1, camp: "adresa" } });
    expect(jurnal).toHaveLength(1);
    expect(jurnal[0].valoareInainte).toBe("A");
    expect(jurnal[0].valoareDupa).toBe("Strada Noua 5");
  });
});

describe("Validari la creare", () => {
  it("serie 2-3 litere unica, e-mail unic, parola sub 10 caractere refuzata", async () => {
    const admin = await autentificaAgent(app, EMAIL.admin1);
    const baza = { nume: "Agent nou", rol: "AGENT", firmaId: firma1, adaosProcent: 1 };
    await admin.post("/api/adm/con/utilizatori").send({ ...baza, email: `x1${S}`, serieOferta: "ABCD", parolaInitiala: PAROLA_INITIALA }).expect(400);
    await admin.post("/api/adm/con/utilizatori").send({ ...baza, email: `x2${S}`, serieOferta: "COU", parolaInitiala: PAROLA_INITIALA }).expect(409); // seria colaboratorului
    await admin.post("/api/adm/con/utilizatori").send({ ...baza, email: EMAIL.colaborator1, serieOferta: "NOU", parolaInitiala: PAROLA_INITIALA }).expect(409);
    await admin.post("/api/adm/con/utilizatori").send({ ...baza, email: `x3${S}`, serieOferta: "NOU", parolaInitiala: "scurta" }).expect(400);
    await admin.post("/api/adm/con/utilizatori").send({ ...baza, email: `x4${S}`, parolaInitiala: PAROLA_INITIALA }).expect(400); // fara serie
  });

  it("Administratorul creeaza un Agent pe firma lui; la prima conectare agentul trebuie sa-si schimbe parola", async () => {
    const admin = await autentificaAgent(app, EMAIL.admin1);
    emailAgentNou = `agentnou${S}`;
    const r = await admin
      .post("/api/adm/con/utilizatori")
      .send({ nume: "Agent Nou", email: emailAgentNou, rol: "AGENT", firmaId: firma2, serieOferta: "AGN", adaosProcent: 1, parolaInitiala: PAROLA_INITIALA })
      .expect(201);
    idAgentNou = r.body.utilizator.id;
    expect(r.body.utilizator.firmaId).toBe(firma1); // firma lui, nu cea trimisa
    expect(r.body.utilizator.administratorId).toBe(idAdmin1);
    expect(r.body.utilizator.parolaTrebuieSchimbata).toBe(true);
    expect(await prisma.jurnalIntrare.count({ where: { entitate: "Utilizator", entitateId: idAgentNou, actiune: "creare" } })).toBe(1);

    const agent = request.agent(app);
    const login = await agent.post("/api/auth/login").send({ email: emailAgentNou, parola: PAROLA_INITIALA }).expect(200);
    expect(login.body.utilizator.parolaTrebuieSchimbata).toBe(true);
    await agent.put("/api/cont/parola").send({ parolaVeche: "gresita", parolaNoua: "parola-noua-a-agentului" }).expect(400);
    await agent.put("/api/cont/parola").send({ parolaVeche: PAROLA_INITIALA, parolaNoua: "scurta" }).expect(400);
    await agent.put("/api/cont/parola").send({ parolaVeche: PAROLA_INITIALA, parolaNoua: "parola-noua-a-agentului" }).expect(200);
    const dupa = await agent.get("/api/auth/me").expect(200);
    expect(dupa.body.utilizator.parolaTrebuieSchimbata).toBe(false);
    expect(await prisma.jurnalIntrare.count({ where: { entitateId: idAgentNou, actiune: "schimbare_parola" } })).toBe(1);
  });
});

describe("Adaos, dezactivare, blocare, rezerva", () => {
  it("schimbarea adaosului lasa rand de jurnal cu dinainte / dupa (si pe contul propriu)", async () => {
    const admin = await autentificaAgent(app, EMAIL.admin1);
    await admin.put(`/api/adm/con/utilizatori/${idAgentNou}`).send({ nume: "Agent Nou", email: emailAgentNou, rol: "AGENT", serieOferta: "AGN", adaosProcent: 2.5, activ: true }).expect(200);
    const j = await prisma.jurnalIntrare.findMany({ where: { entitateId: idAgentNou, camp: "adaosProcent" } });
    expect(j).toHaveLength(1);
    expect(Number(j[0].valoareInainte)).toBe(1);
    expect(Number(j[0].valoareDupa)).toBe(2.5);

    await admin.put(`/api/adm/con/utilizatori/${idAdmin1}`).send({ nume: "Admin Unu", telefon: "0711", adaosProcent: 3 }).expect(200);
    const propriu = await prisma.jurnalIntrare.findMany({ where: { entitateId: idAdmin1, camp: "adaosProcent" } });
    expect(propriu).toHaveLength(1);
    expect(Number(propriu[0].valoareDupa)).toBe(3);
  });

  it("contul dezactivat nu se poate loga; nimic nu se sterge; firma cu utilizatori activi nu se dezactiveaza", async () => {
    const admin = await autentificaAgent(app, EMAIL.admin1);
    const inainte = await prisma.utilizator.count();
    await admin.put(`/api/adm/con/utilizatori/${idAgentNou}`).send({ nume: "Agent Nou", email: emailAgentNou, rol: "AGENT", serieOferta: "AGN", adaosProcent: 2.5, activ: false }).expect(200);
    await request(app).post("/api/auth/login").send({ email: emailAgentNou, parola: "parola-noua-a-agentului" }).expect(401);
    expect(await prisma.utilizator.count()).toBe(inainte);
    const j = await prisma.jurnalIntrare.findFirst({ where: { entitateId: idAgentNou, camp: "activ" } });
    expect(j?.valoareInainte).toBe("true");
    expect(j?.valoareDupa).toBe("false");

    const adminGeneral = await autentificaAgent(app, EMAIL.adminGeneral);
    const f = (await adminGeneral.get(`/api/adm/con/firme/${firma1}`).expect(200)).body.firma;
    const r = await adminGeneral.put(`/api/adm/con/firme/${firma1}`).send({ ...f, activ: false }).expect(409);
    expect(r.body.eroare).toContain("utilizatori activi");
  });

  it("dupa 5 incercari gresite contul se blocheaza 15 minute, apoi se deblocheaza", async () => {
    for (let i = 1; i <= 4; i++) await request(app).post("/api/auth/login").send({ email: EMAIL.agent2, parola: "gresita" }).expect(401);
    const a5 = await request(app).post("/api/auth/login").send({ email: EMAIL.agent2, parola: "gresita" }).expect(423);
    expect(a5.body.eroare).toContain("blocat");
    await request(app).post("/api/auth/login").send({ email: EMAIL.agent2, parola: PAROLA_TEST }).expect(423);
    expect(await prisma.jurnalAutentificare.count({ where: { emailIncercat: EMAIL.agent2, rezultat: "BLOCAT" } })).toBe(2);
    const u = await prisma.utilizator.findUnique({ where: { id: idAgent2 } });
    expect(u!.blocatPanaLa!.getTime()).toBeGreaterThan(Date.now() + 10 * 60000);

    await prisma.utilizator.update({ where: { id: idAgent2 }, data: { blocatPanaLa: new Date(Date.now() - 1000) } });
    await request(app).post("/api/auth/login").send({ email: EMAIL.agent2, parola: PAROLA_TEST }).expect(200);
    expect((await prisma.utilizator.findUnique({ where: { id: idAgent2 } }))!.incercariEsuate).toBe(0);
  });

  it("contul de rezerva apare marcat si nu se modifica din ecran; nu se creeaza un al doilea Admin general", async () => {
    const adminGeneral = await autentificaAgent(app, EMAIL.adminGeneral);
    const lista = await adminGeneral.get("/api/adm/con/utilizatori").expect(200);
    const rezerva = lista.body.utilizatori.find((u: { email: string }) => u.email === EMAIL.rezerva);
    expect(rezerva.esteRezerva).toBe(true);
    await adminGeneral.put(`/api/adm/con/utilizatori/${rezerva.id}`).send({ nume: "x", email: EMAIL.rezerva, rol: "AGENT", activ: false }).expect(409);
    await adminGeneral.post(`/api/adm/con/utilizatori/${rezerva.id}/parola`).send({ parolaNoua: "parola-de-12-caractere" }).expect(409);
    await adminGeneral
      .post("/api/adm/con/utilizatori")
      .send({ nume: "Al doilea", email: `aldoilea${S}`, rol: "ADMIN_GENERAL", parolaInitiala: PAROLA_INITIALA })
      .expect(400);
  });

  it("Admin general creeaza Contabilitate cu acces pe doua firme si o firma noua cu toate campurile", async () => {
    const adminGeneral = await autentificaAgent(app, EMAIL.adminGeneral);
    const r = await adminGeneral
      .post("/api/adm/con/utilizatori")
      .send({ nume: "Conta", email: `conta${S}`, rol: "CONTABILITATE", accesGeneralFirme: false, firmeAcces: [firma1, firma2], parolaInitiala: PAROLA_INITIALA })
      .expect(201);
    expect(r.body.utilizator.firmeAcces.sort()).toEqual([firma1, firma2].sort());
    const f = await adminGeneral
      .post("/api/adm/con/firme")
      .send({ denumire: "Firma Trei CON", cui: "RO3", platitorTva: false, nrRegCom: "J3", adresa: "C", localitate: "Focșani", judet: "Vrancea", telefon: "3", email: `f3${S}`, contBancar: "RO00BANK", banca: "Banca", observatii: "test" })
      .expect(201);
    expect(f.body.firma.platitorTva).toBe(false);
    expect(f.body.firma.localitate).toBe("Focșani");
  });
});
