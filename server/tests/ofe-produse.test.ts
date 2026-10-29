import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creeazaApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { cuvinte, rezolvaNumeLista } from "../src/modules/ofe/catalog.js";
import { asiguraCatalogBilka } from "./catalogTest.js";
import { citesteEtalon } from "./etalon/incarcaEtalon.js";
import { corpDinEtalon } from "./etalonApi.js";
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

async function ofertaNoua(email: string): Promise<string> {
  const agent = await autentificaAgent(app, email);
  const { body } = await agent.post("/api/oferte").send({ client: CLIENT }).expect(201);
  return body.oferta.id as string;
}

describe("E01 prin API, din produse reale", () => {
  it("panotaj -> 180,481 mp si 48 de coli; liniile din liste; 1 formular (M2); snapshot cu pret de baza pe server, fara pret in raspuns", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(EMAIL.agent1);
    const corp = await corpDinEtalon(citesteEtalon("E01"));
    const r = await agent.put(`/api/oferte/${id}/produse`).send(corp);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const o = r.body.oferta;
    const s = o.structura.rezultat;
    expect(o.structura.eroare).toBeNull();
    // M1: invelitorile intra in motor cu id-ul lor din baza
    const idInvelitori = o.invelitori.map((i: { id: string }) => i.id);
    expect(s.cantitati.invelitori.map((c: { id: string }) => c.id)).toEqual(idInvelitori);
    expect(s.cantitati.invelitori.map(({ id, ...rest }: { id: string }) => rest), JSON.stringify(s.cantitati.invelitori)).toEqual([
      { mp: "180.481", mpPanotaj: "180.481", mpDirect: "0.000", coli: 48, integralPanotata: true },
      { mp: "6.000", mpPanotaj: "6.000", mpDirect: "0.000", coli: 2, integralPanotata: true },
    ]);
    // linia fiecarei invelitori e legata de ea prin id
    expect(o.linii.filter((l: { rubrica: string }) => l.rubrica === "Învelitori").map((l: { invelitoareId: string | null }) => l.invelitoareId)).toEqual(idInvelitori);
    expect(s.comandabil).toEqual({ da: true, motive: [] });
    expect(s.pachete.map((p: { nume: string; linii: string[] }) => [p.nume, p.linii.length]), JSON.stringify(s.pachete) + s.textFormulare).toEqual([
      ["P1 — Iberic 3005 mat", 17], // 2 invelitori + 8 standard + 1 special + 6 fixare
      ["Pluvial A — colorat (lucios) 3005", 11],
    ]);
    expect(s.formulareBilka).toHaveLength(1); // M2: pluvialul pe locul „lucios 125/90” al aceluiasi formular
    expect(s.textFormulare).toMatch(/^Se va genera 1 formular Bilka/);
    expect(s.textFormulare).toContain("pe locul „colorat (lucios) 125/90”");
    // liniile de invelitoare le-a creat serverul; cantitatile pe linii vin din motor
    expect(o.linii).toHaveLength(28);
    expect(s.linii.find((l: { cod: string }) => l.cod === "TMIBEMAT050").cantitate).toBe("180.481");
    expect(s.linii.find((l: { cod: string }) => l.cod === "SPC21125000").cantitate).toBe("56");
    // snapshot in baza (pretul de baza la salvare), dar nu in raspunsul catre Agent
    const tigla = await prisma.ofertaInvelitoare.findFirst({ where: { ofertaId: id, cod: "TMIBEMAT050" } });
    expect(tigla?.pretBazaEur.toFixed(2)).toBe("6.79");
    expect(tigla?.latimeTotalaM.toString()).toBe("1.18");
    // S14: preturile vin in raspuns (blocul preturi), dar niciodata pretul de baza / adaosul % catre Agent
    expect(JSON.stringify(r.body)).not.toMatch(/pretBazaEur|adaosProcent|bazaEur/);
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
    expect(s.cantitati.sipci).toHaveLength(1);
    expect(s.cantitati.sipci[0]).toMatchObject({ tronsoane: [{ bucati: 94, ml: "112.800" }, { bucati: 6, ml: "7.200" }], bucatiTotal: 100, mlTotal: "120.000" });
    expect(s.linii.find((l: { cod: string }) => l.cod === "SIPCAMAT050").cantitate).toBe("120.000");
    expect(s.comandabil.da).toBe(true);
    expect(r.body.oferta.sipci).toHaveLength(1);
    expect(r.body.oferta.sipci[0]).toMatchObject({ ordine: 1, model: "Oslo, capăt drept", varianta: "CALCUL", latimeSipcaMm: "92.9" });
    expect(s.cantitati.sipci[0].id).toBe(r.body.oferta.sipci[0].id);
  });
});

describe("E12 prin API (M1): acelasi produs in doua culori si doua rubrici de sipca", () => {
  it("P1 / P2 pe id-ul invelitorii, Sipca A in primul formular, Sipca B formular separat; ambele rubrici revin la reincarcare", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(EMAIL.agent1);
    const corp = await corpDinEtalon(citesteEtalon("E12"));
    expect(corp.invelitori.map((i) => i.produsId)).toHaveLength(2);
    expect(corp.invelitori[0].produsId).toBe(corp.invelitori[1].produsId); // acelasi produs, Clasic mat 0,50
    expect(corp.sipci).toHaveLength(2);
    const r = await agent.put(`/api/oferte/${id}/produse`).send(corp);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const o = r.body.oferta;
    const s = o.structura.rezultat;
    expect(o.structura.eroare).toBeNull();
    expect(s.cantitati.invelitori.map((c: { mp: string; coli: number }) => [c.mp, c.coli])).toEqual([["189.120", 42], ["36.720", 6]]);
    expect(s.pachete.map((p: { nume: string; linii: string[] }) => [p.nume, p.linii.length]), s.textFormulare).toEqual([
      ["P1 — Clasic 8017 mat", 7],
      ["P2 — Clasic 7016 mat", 5],
      ["Șipcă A — Oslo 7016 mat", 1],
      ["Șipcă B — Haga 8017 mat", 1],
    ]);
    expect(s.formulareBilka).toHaveLength(2); // M2: sipca B pe primul formular fara sipca (garajul)
    expect(s.formulareBilka[0].continut).toMatch(/blocul de șipcă A/);
    expect(s.formulareBilka[1].continut).toMatch(/blocul de șipcă B \(Haga 8017 mat\) — primul formular fără șipcă/);
    expect(s.cantitati.sipci.map((x: { bucatiTotal: number; mlTotal: string }) => [x.bucatiTotal, x.mlTotal])).toEqual([[144, "216.000"], [85, "97.000"]]);
    // accesoriile cu acelasi cod, in pachete diferite dupa invelitoarea de care sunt legate
    const coame = s.linii.filter((l: { cod: string }) => l.cod === "ACMICMAT050").map((l: { cantitate: string; pachet?: string }) => [l.cantitate, l.pachet]);
    expect(coame).toEqual([["12", "P1 — Clasic 8017 mat"], ["4", "P2 — Clasic 7016 mat"]]);
    expect(o.sipci.map((x: { ordine: number; varianta: string }) => [x.ordine, x.varianta])).toEqual([[1, "CALCUL"], [2, "COMANDA"]]);
    expect(await prisma.ofertaSipca.count({ where: { ofertaId: id } })).toBe(2);

    // a doua salvare nu dubleaza nimic; GET intoarce aceeasi structura
    await agent.put(`/api/oferte/${id}/produse`).send(corp).expect(200);
    expect(await prisma.ofertaSipca.count({ where: { ofertaId: id } })).toBe(2);
    const { body } = await agent.get(`/api/oferte/${id}`).expect(200);
    expect(body.oferta.sipci).toHaveLength(2);
    expect(body.oferta.structura.rezultat.pachete).toHaveLength(4);
    expect(JSON.stringify(body)).not.toMatch(/pretBazaEur|adaosProcent|bazaEur/);
  });
});

describe("E11: doua pachete si pluvial in doua culori", () => {
  it("P1 / P2 / Pluvial A / Pluvial B si 2 formulare (M2)", async () => {
    const agent = await autentificaAgent(app, EMAIL.agent1);
    const id = await ofertaNoua(EMAIL.agent1);
    const corp = await corpDinEtalon(citesteEtalon("E11"));
    const r = await agent.put(`/api/oferte/${id}/produse`).send(corp);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const s = r.body.oferta.structura.rezultat;
    // M1: id-urile sunt cele din baza; mp-urile raman cele din E11
    expect(s.cantitati.invelitori.map((i: { id: string }) => i.id)).toEqual(r.body.oferta.invelitori.map((i: { id: string }) => i.id));
    expect(s.cantitati.invelitori.map((i: { mp: string }) => i.mp)).toEqual(["189.120", "30.406"]);
    expect(s.pachete.map((p: { nume: string; linii: string[] }) => [p.nume, p.linii.length])).toEqual([
      ["P1 — Clasic 8017 mat", 7],
      ["P2 — Retro Plus 7016 mat", 4],
      ["Pluvial A — mat 8017", 6],
      ["Pluvial B — mat 7016", 5],
    ]);
    expect(s.formulareBilka.map((f: { nr: number }) => f.nr)).toEqual([1, 2]);
    expect(s.formulareBilka[1].continut).toContain("pluvial mat 125/90 RAL 7016");
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
    const r4 = await agent.put(`/api/oferte/${id}/produse`).send({ ...corp, sipci: corp.sipci.map((s) => ({ ...s, tronsoane: [] })) });
    expect(r4.status).toBe(400);
    expect(r4.body.eroare).toMatch(/tronson/);
    // doua rubrici pe aceeasi linie: refuzat
    const r5 = await agent.put(`/api/oferte/${id}/produse`).send({ ...corp, sipci: [...corp.sipci, ...corp.sipci] });
    expect(r5.status).toBe(400);
    expect(r5.body.eroare).toMatch(/aceeași linie/);
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
