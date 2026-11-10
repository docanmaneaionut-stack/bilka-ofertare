import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { idsCuTextul, normalizeazaText } from "../src/lib/normalizare.js";
import { incarcaOptiuniListe } from "../src/modules/adm/optiuniListe.js";
import { asiguraCatalogBilka } from "./catalogTest.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

// S25, BUG-10: toate cautarile potrivesc fara diacritice, in ambele sensuri (s = ș = ş,
// t = ț = ţ, a = ă = â, i = î), indiferent de majuscule - "tigla iberic" gaseste
// "Țiglă metalică Iberic", "ȚIGLĂ" gaseste si el; pe server (SQL translate + lower) si in
// "Afla pret" (in memorie). Textul cautat intra in SQL doar ca parametru.

const app = creeazaApp();
const S = "-dia@exemplu.local";
const EMAIL = { adminGeneral: `admin-general${S}`, admin: `admin${S}`, agent: `agent${S}`, gestiune: `gestiune${S}` };
let firmaId: string;

beforeAll(async () => {
  const adminGeneral = await creeazaUtilizatorTest(EMAIL.adminGeneral, "ADMIN_GENERAL");
  await asiguraCatalogBilka(adminGeneral);
  await incarcaOptiuniListe(prisma);
  firmaId = (await prisma.firma.create({ data: { denumire: "Firma Diacritice", cui: "RO94", nrRegCom: "J94", adresa: "A", telefon: "1", email: `f${S}` } })).id;
  const admin = await creeazaUtilizatorTest(EMAIL.admin, "ADMINISTRATOR", { firmaId, serieOferta: "DIA", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.agent, "AGENT", { firmaId, administratorId: admin.id, serieOferta: "DIG", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.gestiune, "GESTIUNE", { accesGeneralFirme: true });
  // cursul zilei, ca oferta de proba sa se poata crea
  for (const delta of [0, -1]) {
    const d = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + delta * 24 * 3600 * 1000));
    await prisma.cursValutar.upsert({ where: { data_moneda: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR" } }, update: { curs: "5.3485" }, create: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR", curs: "5.3485", sursa: "test" } });
  }
}, 240_000);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("normalizarea textului", () => {
  it("s / t cu virgula si cu sedila, a / a / i, majuscule", () => {
    expect(normalizeazaText("Țiglă metalică Iberic")).toBe("tigla metalica iberic");
    expect(normalizeazaText("ŢIGLĂ ŞIPCĂ Â Î")).toBe("tigla sipca a i");
    expect(normalizeazaText("  Bordură fronton – 360 mm ")).toBe("bordura fronton – 360 mm");
    expect(normalizeazaText("tigla")).toBe("tigla");
    // fiecare caracter din lista, pe rand
    expect(normalizeazaText("ȘŞȚŢĂÂÎșşțţăâî")).toBe("sstt" + "aai" + "sstt" + "aai");
  });

  it("id-urile din SQL: produsul cu diacritice se gaseste fara ele, cu majuscule cu diacritice si invers; textul e parametru (LIKE scapat)", async () => {
    const idsFara = await idsCuTextul("produs", ["denumire"], "tigla iberic");
    expect(idsFara.length).toBeGreaterThan(0);
    const produse = await prisma.produs.findMany({ where: { id: { in: idsFara } }, select: { denumire: true } });
    expect(produse.every((p) => /Țiglă metalică Iberic/i.test(p.denumire))).toBe(true);
    // majuscule cu diacritice in cautare
    expect(await idsCuTextul("produs", ["denumire"], "ȚIGLĂ IBERIC")).toEqual(idsFara);
    expect(await idsCuTextul("produs", ["denumire"], "ŢIGLĂ Iberic")).toEqual(idsFara);
    // cuvintele cautarii pot fi in orice ordine; toate trebuie sa apara
    expect(await idsCuTextul("produs", ["denumire"], "iberic tigla")).toEqual(idsFara);
    expect(await idsCuTextul("produs", ["denumire"], "iberic tigla inexistent")).toEqual([]);
    // caracterele speciale LIKE si ghilimelele nu rup interogarea
    expect(await idsCuTextul("produs", ["denumire"], "100% ' \" _ \\")).toEqual([]);
    expect(await idsCuTextul("produs", ["denumire"], "   ")).toEqual([]);
    // coloane nepermise -> eroare, nu SQL
    await expect(idsCuTextul("produs", ["parolaHash"], "x")).rejects.toThrow(/nepermise/);
  });
});

describe("rutele de cautare", () => {
  it("cascada / '+ Adauga...' din catalogul editorului: 'tigla iberic' si 'fronton 360'", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent);
    const c1 = await agent.get("/api/oferte/catalog/cauta").query({ q: "tigla iberic" }).expect(200);
    expect(c1.body.produse.length).toBeGreaterThan(0);
    expect(c1.body.produse.every((p: { denumire: string }) => /Țiglă metalică Iberic/.test(p.denumire))).toBe(true);
    const c2 = await agent.get("/api/oferte/catalog/cauta").query({ q: "fronton 360", categorie: "Accesorii standard", finisaj: "mat", grosime: "0,50 mm" }).expect(200);
    expect(c2.body.produse.some((p: { denumire: string }) => /Bordură fronton – 360 mm/.test(p.denumire))).toBe(true);
    const c3 = await agent.get("/api/oferte/catalog/cauta").query({ q: "ȚIGLĂ IBERIC" }).expect(200);
    expect(c3.body.produse.map((p: { id: string }) => p.id).sort()).toEqual(c1.body.produse.map((p: { id: string }) => p.id).sort());
    // si codul furnizorului, ca pana acum
    const c4 = await agent.get("/api/oferte/catalog/cauta").query({ q: "ACMICMAT050" }).expect(200);
    expect(c4.body.produse).toHaveLength(1);
  });

  it("'Afla pret' (in memorie): 'tigla iberic', 'sipca' si 'ŢIGLĂ'", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent);
    const r1 = await agent.get("/api/pret-rapid").query({ q: "tigla iberic" }).expect(200);
    expect(r1.body.produse.some((p: { denumire: string }) => /Iberic/.test(p.denumire))).toBe(true);
    const r2 = await agent.get("/api/pret-rapid").query({ q: "ŢIGLĂ iberic" }).expect(200);
    expect(r2.body.produse.map((p: { id: string }) => p.id)).toEqual(r1.body.produse.map((p: { id: string }) => p.id));
    const r3 = await agent.get("/api/pret-rapid").query({ q: "sipca" }).expect(200);
    expect(r3.body.produse.some((p: { denumire: string }) => /Șipcă/.test(p.denumire))).toBe(true);
  });

  it("catalogul din Zona tehnica (Admin general): 'tigla' si 'ȚIGLĂ'", async () => {
    const ag = await autentificaAgent(app, EMAIL.adminGeneral);
    const r1 = await ag.get("/api/adm/cat/produse").query({ q: "tigla iberic", pageSize: 100 }).expect(200);
    expect(r1.body.total).toBeGreaterThan(0);
    const r2 = await ag.get("/api/adm/cat/produse").query({ q: "ȚIGLĂ IBERIC", pageSize: 100 }).expect(200);
    expect(r2.body.total).toBe(r1.body.total);
  });

  it("clientii, montatorii, lista de oferte si comenzile: 'stefanesti' / 'ȘTEFĂNEȘTI', 'cîmpineanca'", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent);
    const client = { nume: "Ștefănescu Ștefan", telefon: "0730009901", adresa: "Str. Ștejarului 1", localitate: "Ștefănești" };
    const { body } = await agent.post("/api/oferte").send({ client }).expect(201);
    const ofertaId = body.oferta.id as string;
    await agent.post("/api/montatori").send({ nume: "Țurcanu Vasile", telefon: "0740 222 333", tip: "MONTATOR", localitate: "Câmpineanca" }).expect(201);
    // clientii
    for (const q of ["stefanescu", "ȘTEFĂNESCU", "stefanesti", "Ştefăneşti"]) {
      const r = await agent.get("/api/clienti").query({ q }).expect(200);
      expect(r.body.clienti.map((c: { nume: string }) => c.nume), q).toContain("Ștefănescu Ștefan");
    }
    expect((await agent.get("/api/clienti").query({ q: "stefanescu ionel" }).expect(200)).body.clienti).toEqual([]);
    // montatorii
    for (const q of ["turcanu", "ȚURCANU", "campineanca", "CÂMPINEANCA"]) {
      const r = await agent.get("/api/montatori").query({ q }).expect(200);
      expect(r.body.montatori.map((m: { nume: string }) => m.nume), q).toContain("Țurcanu Vasile");
    }
    expect((await agent.get("/api/montatori").query({ q: "cimpineanca" }).expect(200)).body.montatori.map((m: { nume: string }) => m.nume)).not.toContain("Țurcanu Vasile");
    // lista de oferte
    for (const q of ["stefanescu", "ȘTEFĂNEȘTI"]) {
      const r = await agent.get("/api/oferte").query({ q }).expect(200);
      expect(r.body.oferte.map((o: { id: string }) => o.id), q).toContain(ofertaId);
    }
    // comenzile: o comanda manuala cu client si montator cu diacritice
    const gestiune = await autentificaAgent(app, EMAIL.gestiune);
    const m = await gestiune.post("/api/comenzi").send({ firmaId, client: { nume: "Ionuț Țăranu", telefon: "0730009902", localitate: "Mărășești" }, rezumat: "accesorii", totalLei: "100", montator: { nume: "Gheorghiță Șerban", telefon: "0740 333 444" } }).expect(201);
    const comandaId = m.body.comanda.id as string;
    for (const q of ["taranu", "ȚĂRANU", "marasesti", "gheorghita serban", "Şerban"]) {
      const r = await gestiune.get("/api/comenzi").query({ q }).expect(200);
      expect(r.body.comenzi.map((c: { id: string }) => c.id), q).toContain(comandaId);
    }
    expect((await gestiune.get("/api/comenzi").query({ q: "taranu inexistent" }).expect(200)).body.comenzi).toEqual([]);
    // evidenta paletilor, pe client / localitate
    await gestiune.put(`/api/comenzi/${comandaId}/nota-palet`).send({ text: "1 palet" }).expect(200);
    expect((await gestiune.get("/api/comenzi/paleti").query({ q: "MARASESTI" }).expect(200)).body.paleti.map((c: { id: string }) => c.id)).toContain(comandaId);
  });
});
