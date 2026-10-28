import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import type { FisierEtalon } from "../src/modules/mot/etalon.js";
import { cuvinte, rezolvaNumeLista } from "../src/modules/ofe/catalog.js";
import { asiguraCatalogBilka } from "./catalogTest.js";
import { citesteEtalon } from "./etalon/incarcaEtalon.js";
import { autentificaAgent, creeazaUtilizatorTest } from "./helpers.js";

// Editorul ofertei - zona produselor (S13): E01, E06, E11 construite prin API din
// produse reale, cu snapshot pe server si structura din motor (fara preturi);
// listele implicite rezolvate pe nume; validari; drepturi; migrarea 7 aditiva.

const app = creeazaApp();
const S = "-prod@exemplu.local";
const EMAIL = { adminGeneral: `admin-general${S}`, admin1: `admin1${S}`, agent1: `agent1${S}`, agent2: `agent2${S}` };
let firma1: string;

function dataLocala(delta = 0): string {
  const d = new Date(Date.now() + delta * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

beforeAll(async () => {
  const adminGeneral = await creeazaUtilizatorTest(EMAIL.adminGeneral, "ADMIN_GENERAL");
  await asiguraCatalogBilka(adminGeneral);
  firma1 = (await prisma.firma.create({ data: { denumire: "Firma Produse", cui: "RO31", nrRegCom: "J31", adresa: "A", telefon: "1", email: `f1${S}` } })).id;
  const admin1 = await creeazaUtilizatorTest(EMAIL.admin1, "ADMINISTRATOR", { firmaId: firma1, serieOferta: "PRA", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.agent1, "AGENT", { firmaId: firma1, administratorId: admin1.id, serieOferta: "PRG", adaosProcent: 1 });
  await creeazaUtilizatorTest(EMAIL.agent2, "AGENT", { firmaId: firma1, administratorId: admin1.id, serieOferta: "PRX", adaosProcent: 1 });
  for (const [d, curs] of [
    [dataLocala(0), "5.3485"],
    [dataLocala(-1), "5.3485"],
  ]) {
    await prisma.cursValutar.upsert({ where: { data_moneda: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR" } }, update: { curs }, create: { data: new Date(`${d}T00:00:00Z`), moneda: "EUR", curs, sursa: "test" } });
  }
}, 240_000);

afterAll(async () => {
  await prisma.$disconnect();
});

const CLIENT = { nume: "Client Produse", telefon: "0730000001", adresa: "Str. Test 1", localitate: "Focșani" };

async function produs(cod: string, denumire: string) {
  const p = await prisma.produs.findFirst({ where: { codFurnizor: cod, denumire, activ: true }, include: { categorieOferta: true } });
  if (!p) throw new Error(`Produs lipsa in catalogul de test: ${cod} ${denumire}`);
  return { id: p.id, categorie: p.categorieOferta?.denumire ?? "" };
}

// corpul PUT /produse din intrarile unui etalon: invelitorile din blocul lor, liniile
// din rubricile de accesorii (liniile de invelitoare le creeaza serverul)
async function corpDinEtalon(e: FisierEtalon) {
  const i = e.intrari;
  const invelitori = [];
  for (const inv of i.invelitori ?? []) {
    const linie = i.linii.find((l) => l.cod_bilka === inv.cod_bilka && l.rubrica === "Învelitori")!;
    const p = await produs(inv.cod_bilka, linie.denumire);
    invelitori.push({ cheie: inv.cod_bilka, produsId: p.id, culoare: inv.culoare, panotaj: (inv.panotaj ?? []).map((x) => ({ lungimeM: x.lungime_m, bucati: x.bucati })), variantaProfil: inv.varianta_profil ?? null });
  }
  const linii = [];
  for (const [idx, l] of i.linii.entries()) {
    if (l.rubrica === "Învelitori") continue;
    const p = await produs(l.cod_bilka, l.denumire);
    const pozitii = (i.accesorii_ml ?? []).filter((a) => a.cod_bilka === l.cod_bilka).map((a) => ({ lungimeM: a.lungime_m, bucati: a.bucati }));
    linii.push({
      cheie: `L${idx + 1}`,
      rubrica: p.categorie,
      produsId: p.id,
      cantitate: l.cantitate,
      invelitoare: l.invelitoare ?? null,
      culoare: l.culoare ? { ral: l.culoare.ral, finisaj: l.culoare.finisaj, grosime: l.culoare.grosime ?? null } : null,
      ...(pozitii.length ? { pozitii } : {}),
    });
  }
  let sipca = null;
  if (i.sipca) {
    const idx = i.linii.findIndex((l) => l.cod_bilka === i.sipca!.cod_bilka);
    sipca = {
      linie: `L${idx + 1}`,
      model: i.sipca.model,
      culoare: i.sipca.culoare,
      varianta: "calcul",
      tronsoane: i.sipca.tronsoane.map((t) => ({ lungimeSipcaM: t.lungime_sipca_m, lungimeTronsonM: t.lungime_tronson_m, distantaMm: t.distanta_mm })),
    };
  }
  return { invelitori, linii, sipca, zonaB: (i.zona_b ?? []).map((zb) => ({ denumire: zb.denumire, um: zb.um, cantitate: zb.cantitate, sumaLei: zb.suma_lei, contineTva: zb.contine_tva, preiaInFactura: zb.preia_in_factura })) };
}

async function ofertaNoua(email: string): Promise<string> {
  const agent = await autentificaAgent(app, email);
  const { body } = await agent.post("/api/oferte").send({ client: CLIENT }).expect(201);
  return body.oferta.id as string;
}

describe("E01 prin API, din produse reale", () => {
  it("panotaj -> 180,481 mp si 48 de coli; liniile din liste; 2 formulare; snapshot cu pret de baza pe server, fara pret in raspuns", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(EMAIL.agent1);
    const corp = await corpDinEtalon(citesteEtalon("E01"));
    const r = await agent.put(`/api/oferte/${id}/produse`).send(corp);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const o = r.body.oferta;
    const s = o.structura.rezultat;
    expect(o.structura.eroare).toBeNull();
    expect(s.cantitati.invelitori, JSON.stringify(s.cantitati.invelitori)).toEqual([
      { id: "TMIBEMAT050", mp: "180.481", mpPanotaj: "180.481", mpDirect: "0.000", coli: 48, integralPanotata: true },
      { id: "TCT08MAT050", mp: "6.000", mpPanotaj: "6.000", mpDirect: "0.000", coli: 2, integralPanotata: true },
    ]);
    expect(s.comandabil).toEqual({ da: true, motive: [] });
    expect(s.pachete.map((p: { nume: string; linii: string[] }) => [p.nume, p.linii.length]), JSON.stringify(s.pachete) + s.textFormulare).toEqual([
      ["P1 — Iberic 3005 mat", 17], // 2 invelitori + 8 standard + 1 special + 6 fixare
      ["Pluvial A — colorat (lucios) 3005", 11],
    ]);
    expect(s.formulareBilka).toHaveLength(2);
    expect(s.textFormulare).toMatch(/^Se vor genera 2 formulare Bilka/);
    // liniile de invelitoare le-a creat serverul; cantitatile pe linii vin din motor
    expect(o.linii).toHaveLength(28);
    expect(s.linii.find((l: { cod: string }) => l.cod === "TMIBEMAT050").cantitate).toBe("180.481");
    expect(s.linii.find((l: { cod: string }) => l.cod === "SPC21125000").cantitate).toBe("56");
    // snapshot in baza (pretul de baza la salvare), dar nu in raspunsul catre Agent
    const tigla = await prisma.ofertaInvelitoare.findFirst({ where: { ofertaId: id, cod: "TMIBEMAT050" } });
    expect(tigla?.pretBazaEur.toFixed(2)).toBe("6.79");
    expect(tigla?.latimeTotalaM.toString()).toBe("1.18");
    expect(JSON.stringify(r.body)).not.toMatch(/pretBazaEur|adaosProcent|achizitie|valoareEur|totaluri/);
    // adresa lucrarii copiata din client la creare
    expect(o.adresaLucrarii).toBe("Str. Test 1");
    expect(o.localitate).toBe("Focșani");
  });

  it("salvarea inlocuieste produsele (fara dubluri la a doua salvare) si GET intoarce aceeasi structura", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(EMAIL.agent1);
    const corp = await corpDinEtalon(citesteEtalon("E01"));
    await agent.put(`/api/oferte/${id}/produse`).send(corp).expect(200);
    const r2 = await agent.put(`/api/oferte/${id}/produse`).send({ ...corp, linii: corp.linii.slice(0, 5) }).expect(200);
    expect(r2.body.oferta.linii).toHaveLength(7);
    expect(await prisma.ofertaLinie.count({ where: { ofertaId: id } })).toBe(7);
    expect(await prisma.ofertaPozitie.count({ where: { invelitoare: { ofertaId: id } } })).toBe(5);
    const { body } = await agent.get(`/api/oferte/${id}`).expect(200);
    expect(body.oferta.structura.rezultat.cantitati.invelitori[0].mp).toBe("180.481");
  });
});

describe("E06: sipca Oslo, varianta Calcul", () => {
  it("tronsoanele dau 94 + 6 = 100 buc, 120,000 ml; linia sipcii primeste ml-ul calculat", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(EMAIL.agent1);
    const corp = await corpDinEtalon(citesteEtalon("E06"));
    const r = await agent.put(`/api/oferte/${id}/produse`).send(corp);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const s = r.body.oferta.structura.rezultat;
    expect(s.cantitati.sipca).toEqual({ tronsoane: [{ bucati: 94, ml: "112.800" }, { bucati: 6, ml: "7.200" }], bucatiTotal: 100, mlTotal: "120.000" });
    expect(s.linii.find((l: { cod: string }) => l.cod === "SIPCAMAT050").cantitate).toBe("120.000");
    expect(s.comandabil.da).toBe(true);
    expect(r.body.oferta.sipca).toMatchObject({ model: "Oslo, capăt drept", varianta: "CALCUL", latimeSipcaMm: "92.9" });
  });
});

describe("E11: doua pachete si pluvial in doua culori", () => {
  it("P1 / P2 / Pluvial A / Pluvial B si 4 formulare", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(EMAIL.agent1);
    const corp = await corpDinEtalon(citesteEtalon("E11"));
    const r = await agent.put(`/api/oferte/${id}/produse`).send(corp);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const s = r.body.oferta.structura.rezultat;
    expect(s.cantitati.invelitori.map((i: { id: string; mp: string }) => [i.id, i.mp])).toEqual([
      ["TMCLSMAT050", "189.120"],
      ["REPROMAT050", "30.406"],
    ]);
    expect(s.pachete.map((p: { nume: string; linii: string[] }) => [p.nume, p.linii.length])).toEqual([
      ["P1 — Clasic 8017 mat", 7],
      ["P2 — Retro Plus 7016 mat", 4],
      ["Pluvial A — mat 8017", 6],
      ["Pluvial B — mat 7016", 5],
    ]);
    expect(s.formulareBilka.map((f: { nr: number }) => f.nr)).toEqual([1, 2, 3, 4]);
  });
});

describe("catalogul pentru editor", () => {
  it("listele implicite se rezolva integral pe nume, pentru cheile reale (mat 0,50; pluvial mat 125/90; Grande Mat)", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const { body: ref } = await agent.get("/api/oferte/catalog/referinte").expect(200);
    expect(ref.culori.length).toBeGreaterThan(100);
    expect(ref.trepte).toHaveLength(25);
    const perechi = ref.categoriiListe as { rubrica: string; categorieInvelitoare: string }[];
    expect(perechi).toHaveLength(6);
    let total = 0;
    for (const p of perechi) {
      const cheie = p.rubrica === "Sistem pluvial" ? { finisaj: "mat", sistem: "125 / 90" } : { finisaj: "mat", grosime: "0,50 mm" };
      const { body } = await agent.get("/api/oferte/catalog/liste-implicite").query({ rubrica: p.rubrica, categorieInvelitoare: p.categorieInvelitoare, ...cheie }).expect(200);
      expect(body.nerezolvate, `${p.rubrica} / ${p.categorieInvelitoare}: ${JSON.stringify(body.nerezolvate)}`).toEqual([]);
      total += body.produse.length;
      for (const pr of body.produse) expect(pr).not.toHaveProperty("pret");
    }
    expect(total).toBe(86);
    // Grande Mat: spray-ul si corectorul exista doar mat / lucios -> varianta mat
    const { body: fix } = await agent.get("/api/oferte/catalog/liste-implicite").query({ rubrica: "Fixare și etanșare", finisaj: "Grande Mat", grosime: "0,50 mm" }).expect(200);
    expect(fix.nerezolvate).toEqual([]);
    expect(fix.produse.find((p: { numeLista: string }) => /Spray/.test(p.numeLista)).denumire).toMatch(/– mat$/);
    expect(fix.produse.find((p: { numeLista: string }) => p.numeLista === "Capac coamă").denumire).toBe("Capac coamă – Grande Mat");
  });

  it("invelitorile (fara pret), cautarea pe rubrica si cheie, treptele, pluvialul, sipca", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const { body: inv } = await agent.get("/api/oferte/catalog/invelitori").expect(200);
    expect(inv.produse.length).toBeGreaterThanOrEqual(440);
    expect(JSON.stringify(inv)).not.toMatch(/pret/i);
    const tabla = inv.produse.find((p: { cod: string }) => p.cod === "TPLANMAT050");
    expect(tabla.tablaPlana).toBe("mp");
    const { body: c } = await agent.get("/api/oferte/catalog/cauta").query({ q: "coamă mare", categorie: "Accesorii standard", finisaj: "mat", grosime: "0,50 mm" }).expect(200);
    expect(c.produse.map((p: { cod: string }) => p.cod)).toContain("ACMARMAT050");
    expect(c.produse.every((p: { finisaj: string | null }) => !p.finisaj || p.finisaj === "mat")).toBe(true);
    const { body: sp } = await agent.get("/api/oferte/catalog/speciale").query({ categorie: "Accesorii speciale (2 ML)", finisaj: "mat", grosime: "0,50 mm" }).expect(200);
    expect(sp.produse).toHaveLength(25);
    expect(sp.produse[0]).toMatchObject({ treapta: "D01", desfasurata: "0–50 mm" });
    const { body: pl } = await agent.get("/api/oferte/catalog/pluvial").query({ finisaj: "colorat (lucios)", sistem: "125 / 90" }).expect(200);
    expect(pl.implicite).toHaveLength(15);
    expect(pl.nerezolvate).toEqual([]);
    expect(pl.restul.length).toBeGreaterThan(0);
    const { body: si } = await agent.get("/api/oferte/catalog/sipca").expect(200);
    expect(si.produse).toHaveLength(83);
    expect(si.produse.find((p: { cod: string }) => p.cod === "SIPCAMAT050").latimeTotalaMm).toBe("92.9");
  });

  it("potrivirea pe cuvinte: unitatile si parantezele nu conteaza", () => {
    expect(cuvinte("Bordură fronton 312 mm")).toEqual(["bordură", "fronton", "312"]);
    expect(cuvinte("Jgheab 4 m")).toEqual(["jgheab", "4"]);
    expect(cuvinte("Spray retuș (spray corector 400 ml)")).toEqual([]);
    const p = (familie: string, varianta: string, finisaj: string | null = "mat") =>
      ({ id: familie + varianta, cod: "", denumire: `${familie} ${varianta}`, um: "BUC", categorie: null, compartiment: "Bilka", grup: "", familie, varianta, optiune: null, finisaj, grosime: "0,50 mm", sistem: null, treapta: null, desfasurata: null, latimeTotalaM: null, latimeTotalaMm: null, modulCm: null, culoriDisponibile: null, tablaPlana: null }) as const;
    const cand = [p("Bordură fronton", "312 mm / 2 m"), p("Bordură fronton", "360 mm / 2 m"), p("Bordură fronton Retro", "312 mm / 2 m")];
    expect(rezolvaNumeLista("Bordură fronton 312 mm", [...cand], { finisaj: "mat", grosime: "0,50 mm" }).map((x) => x.id)).toEqual(["Bordură fronton312 mm / 2 m"]);
    expect(rezolvaNumeLista("Bordură fronton Retro 312 mm", [...cand], { finisaj: "mat", grosime: "0,50 mm" }).map((x) => x.id)).toEqual(["Bordură fronton Retro312 mm / 2 m"]);
  });
});

describe("validari si drepturi", () => {
  it("cantitate 0, invelitoare fara cantitate, produs inexistent: 400 cu mesaj", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(EMAIL.agent1);
    const corp = await corpDinEtalon(citesteEtalon("E06"));
    const r1 = await agent.put(`/api/oferte/${id}/produse`).send({ ...corp, linii: corp.linii.map((l) => ({ ...l, cantitate: "0" })) });
    expect(r1.status).toBe(400);
    const e01 = await corpDinEtalon(citesteEtalon("E01"));
    const r2 = await agent.put(`/api/oferte/${id}/produse`).send({ ...e01, invelitori: e01.invelitori.map((i) => ({ ...i, panotaj: [] })) });
    expect(r2.status).toBe(400);
    expect(r2.body.eroare).toMatch(/nu are cantitate/);
    const r3 = await agent.put(`/api/oferte/${id}/produse`).send({ ...corp, linii: [{ ...corp.linii[0], produsId: "nu-exista" }] });
    expect(r3.status).toBe(400);
    expect(r3.body.eroare).toMatch(/nu există în catalog/);
    const r4 = await agent.put(`/api/oferte/${id}/produse`).send({ ...corp, sipca: { ...corp.sipca, tronsoane: [] } });
    expect(r4.status).toBe(400);
  });

  it("alt agent nu poate salva produsele (403); Administratorul firmei poate", async () => {
    const id = await ofertaNoua(EMAIL.agent1);
    const corp = await corpDinEtalon(citesteEtalon("E06"));
    const agent2 = await autentificaAgent(app, EMAIL.agent2);
    await agent2.put(`/api/oferte/${id}/produse`).send(corp).expect(403);
    const admin1 = await autentificaAgent(app, EMAIL.admin1);
    await admin1.put(`/api/oferte/${id}/produse`).send(corp).expect(200);
  });

  it("grupa si precizarile zonei B se salveaza pe oferta", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(EMAIL.agent1);
    const corp = await corpDinEtalon(citesteEtalon("E06"));
    const { body } = await agent.put(`/api/oferte/${id}/produse`).send({ ...corp, grupaPct: "5", precizariZonaB: "manopera prin terț", zonaB: [{ denumire: "Șipcă lemn", um: "ml", cantitate: "320", sumaLei: "1850", contineTva: false, preiaInFactura: true }] }).expect(200);
    expect(body.oferta.grupaPct).toBe("5");
    expect(body.oferta.precizariZonaB).toBe("manopera prin terț");
    expect(body.oferta.zonaB).toHaveLength(1);
  });
});

describe("migrarea 7 e aditiva", () => {
  it("doar ADD COLUMN pe oferta", () => {
    const sql = readFileSync(new URL("../prisma/migrations/20261028150000_oferta_adresa_lucrarii/migration.sql", import.meta.url), "utf8");
    expect(sql).not.toMatch(/\bDROP\b|\bTRUNCATE\b|ALTER COLUMN/);
    expect(sql.match(/ADD COLUMN/g)).toHaveLength(3);
  });
});
