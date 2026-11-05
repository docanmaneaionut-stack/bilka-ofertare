// S17c - Excel ca arbitru, pe toate produsele (PLAN v0.26; docs/JURNAL.md S17c).
//
// Ruleaza DOAR pe schema de test (DATABASE_URL_TEST, folderul data-test), cu firma,
// agent si catalog proprii (importate din docs/import ca in teste). Pentru fiecare
// produs activ: oferta de test -> formular generat -> deschis in Excel prin
// automatizare (invizibil, macro-urile active doar pe acea instanta) -> recalcul ->
// SALVARE (asa se umple foaia "Portal") -> citite preturile pe randuri si Portal ->
// comparate cu catalogul (cod Bilka, cantitate, lungimi, cheie, pret). Niciun macro
// nu e apelat explicit, nimic nu pleaca nicaieri.
//
//   npm run verifica:formular                  bucla completa, reia de unde a ramas
//   npm run verifica:formular -- --proba       proba pe 3 formulare (E01, Retro Plus Double Line, T 35 A/P)
//   npm run verifica:formular -- --de-la-zero  sterge starea (sablon nou) si o ia de la capat
//   npm run verifica:formular -- --sablon <cale.xlsm>   alt sablon decat cel din data/sabloane-bilka
//   npm run verifica:formular -- --toate-culorile       fiecare culoare a cheii, nu doar prima
//   npm run verifica:formular -- --limita N             cel mult N oferte in aceasta rulare
//   npm run verifica:formular -- --doar-acelasi-rand    reia doar ofertele care au avut „același rând”
//                                                       (S17d, M4: a doua varianta trebuie sa ajunga pe alt formular)
//
// Starea: docs/verificari/formular-bilka-stare.json (scrisa dupa fiecare formular);
// raportul: docs/verificari/formular-bilka-raport.md (rescris din stare).
import { config as incarcaEnv } from "dotenv";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

incarcaEnv();
const urlTest = process.env.DATABASE_URL_TEST;
if (!urlTest) throw new Error("Lipseste DATABASE_URL_TEST din .env - verificarea ruleaza doar pe schema de test");
{
  const u = new URL(urlTest);
  const numeBaza = u.pathname.replace(/^\//, "");
  const schema = u.searchParams.get("schema") ?? "public";
  if (!/test/i.test(numeBaza) && !/test/i.test(schema)) throw new Error(`Refuz: baza "${numeBaza}" / schema "${schema}" nu contine "test"`);
}
process.env.DATABASE_URL = urlTest;
process.env.DATE_DIR = "data-test";
process.env.ADMIN_REZERVA_EMAIL ??= "rezerva-test@exemplu.local";

const { prisma } = await import("../../src/db/prisma.js");
const { creeazaApp } = await import("../../src/app.js");
const { incarcaCorespondentaFormularBilka } = await import("../../src/modules/adm/corespondentaFormular.js");
const { citesteSablon } = await import("../../src/modules/ofe/formularBilka/sablon.js");
const { normNume } = await import("../../src/modules/ofe/formularBilka/sablon.js");
const { asiguraCatalogBilka } = await import("../../tests/catalogTest.js");
const { creeazaUtilizatorTest, autentificaAgent, PAROLA_TEST } = await import("../../tests/helpers.js");
const { citesteEtalon } = await import("../../tests/etalon/incarcaEtalon.js");
const { corpDinEtalon } = await import("../../tests/etalonApi.js");

type Sablon = ReturnType<typeof citesteSablon>;

// ------------------------------------------------------------------ argumente
const arg = process.argv.slice(2);
const are = (n: string) => arg.includes(n);
const dupa = (n: string) => (arg.includes(n) ? arg[arg.indexOf(n) + 1] : undefined);
const PROBA = are("--proba");
const DE_LA_ZERO = are("--de-la-zero");
const TOATE_CULORILE = are("--toate-culorile");
const LIMITA = dupa("--limita") ? Number(dupa("--limita")) : Infinity;
const DOAR_ACELASI_RAND = are("--doar-acelasi-rand");

const RADACINA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DOCS_VERIFICARI = path.resolve(RADACINA, "../docs/verificari");
const CALE_STARE = path.join(DOCS_VERIFICARI, PROBA ? "formular-bilka-proba.json" : "formular-bilka-stare.json");
const CALE_RAPORT = path.join(DOCS_VERIFICARI, PROBA ? "formular-bilka-proba.md" : "formular-bilka-raport.md");
const FOLDER_LUCRU = path.resolve(RADACINA, "data-test", "verificare-formular");
const EMAIL_AGENT = "verificare-formular@exemplu.local";
const EMAIL_ADMIN = "admin-verificare@exemplu.local";

// ------------------------------------------------------------------ tipuri
type Categorie = "ok" | "a_referinte" | "b_cod" | "c_fara_loc" | "d_bilka" | "eroare";
interface RezultatProdus {
  cod: string;
  denumire: string;
  rubrica: string;
  cheie: string; // "finisaj | grosime | RAL"
  oferta: string;
  formular?: string;
  categorie: Categorie;
  detalii: string[];
  propunere?: string;
  pretCatalog?: string;
  pretExcel?: string;
  portal?: string;
  singur?: boolean; // incercat singur pe oferta (trecerea a doua)
}
interface Stare {
  sablon: { fisier: string; versiune: string } | null;
  pornit: string;
  actualizat: string;
  oferte: Record<string, { numar: string; produse: string[]; formulare: string[]; avertizari: string[]; eroare?: string; durataMs?: number; portalNefolosit?: string[] }>;
  produse: Record<string, RezultatProdus>;
  deReluat: string[]; // chei de produs care merg singure la trecerea a doua
  planificat: number;
  rulate?: number; // ofertele din planul curent rulate fara eroare (starea tine si loturi din planuri vechi)
}
interface LinieOferta {
  cheie: string;
  rubrica: string;
  produsId: string;
  cantitate: string;
  invelitoare?: string | null;
  culoare?: { ral: string; finisaj?: string | null; grosime?: string | null } | null;
  pozitii?: { lungimeM: string; bucati: number }[];
}
interface Sipca {
  linie: string;
  model: string;
  culoare: string;
  varianta: "comanda";
}
interface Invelitoare {
  cheie: string;
  produsId: string;
  culoare: string;
  panotaj: { lungimeM: string; bucati: number }[];
  variantaProfil?: string | null;
  montaj?: "acoperis" | "perete" | null;
}
interface OfertaPlan {
  id: string; // cheia planului (stabila intre rulari)
  descriere: string;
  invelitori: Invelitoare[];
  linii: LinieOferta[];
  sipci: Sipca[];
  produse: string[]; // cheile produselor verificate prin oferta
  singur?: boolean;
}
interface ProdusCatalog {
  id: string;
  cod: string | null;
  codIntern: string;
  denumire: string;
  familie: string;
  grup: string;
  rubrica: string;
  finisaj: string | null;
  grosime: string | null;
  sistem: string | null;
  treapta: string | null;
  um: string;
  pret: string | null;
}

const acum = () => new Date().toISOString();
const log = (...m: unknown[]) => console.log(new Date().toLocaleTimeString("ro-RO"), ...m);
const numar = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v.replace(",", "."));
  return NaN;
};
const aprox = (a: number, b: number, tol = 0.011) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol;

// ------------------------------------------------------------------ starea
function citesteStare(): Stare {
  if (!DE_LA_ZERO && fs.existsSync(CALE_STARE)) return JSON.parse(fs.readFileSync(CALE_STARE, "utf8")) as Stare;
  return { sablon: null, pornit: acum(), actualizat: acum(), oferte: {}, produse: {}, deReluat: [], planificat: 0 };
}
function scrieStare(s: Stare) {
  s.actualizat = acum();
  fs.mkdirSync(DOCS_VERIFICARI, { recursive: true });
  fs.writeFileSync(CALE_STARE, JSON.stringify(s, null, 1), "utf8");
}

// ------------------------------------------------------------------ pregatirea bazei de test
async function pregateste(caleSablon: string) {
  const admin = (await prisma.utilizator.findFirst({ where: { email: EMAIL_ADMIN } })) ?? (await creeazaUtilizatorTest(EMAIL_ADMIN, "ADMIN_GENERAL"));
  await asiguraCatalogBilka(admin);
  await incarcaCorespondentaFormularBilka(prisma);
  let firma = await prisma.firma.findFirst({ where: { cui: "RO-VERIFICARE-FORMULAR" } });
  if (!firma) firma = await prisma.firma.create({ data: { denumire: "Verificare formular SRL", cui: "RO-VERIFICARE-FORMULAR", nrRegCom: "J00/0/2026", adresa: "Str. Verificării 1", localitate: "Focșani", judet: "Vrancea", telefon: "0700000000", email: "firma-verificare@exemplu.local" } });
  if (!(await prisma.utilizator.findFirst({ where: { email: EMAIL_AGENT } }))) await creeazaUtilizatorTest(EMAIL_AGENT, "AGENT", { firmaId: firma.id, serieOferta: "VF", adaosProcent: 1 });
  for (const delta of [0, -1]) {
    const d = new Date(Date.now() + delta * 24 * 3600 * 1000);
    const zi = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
    await prisma.cursValutar.upsert({ where: { data_moneda: { data: new Date(`${zi}T00:00:00Z`), moneda: "EUR" } }, update: {}, create: { data: new Date(`${zi}T00:00:00Z`), moneda: "EUR", curs: "5.0000", sursa: "verificare-formular" } });
  }
  const app = creeazaApp();
  const ag = await autentificaAgent(app, EMAIL_ADMIN);
  const r = await ag.post(`/api/adm/con/firme/${firma.id}/sablon-bilka`).attach("sablon", caleSablon);
  if (r.status !== 200) throw new Error(`Șablonul nu s-a încărcat: ${JSON.stringify(r.body)}`);
  const agent = await autentificaAgent(app, EMAIL_AGENT);
  return { app, agent, firma, versiuneSablon: r.body.firma.sablonBilkaVersiune as string, sablon: citesteSablon(fs.readFileSync(caleSablon)) };
}

// ------------------------------------------------------------------ catalogul
async function catalog(): Promise<ProdusCatalog[]> {
  const produse = await prisma.produs.findMany({
    where: { activ: true, compartiment: { denumire: "Bilka" } },
    include: { grup: true, familie: true, categorieOferta: true, preturi: { where: { listaPret: { status: "ACTIVA" } } } },
    orderBy: [{ ordine: "asc" }, { denumire: "asc" }],
  });
  return produse.map((p) => ({
    id: p.id,
    cod: p.codFurnizor,
    codIntern: p.codIntern,
    denumire: p.denumire,
    familie: p.familie?.denumire ?? "",
    grup: p.grup.denumire,
    rubrica: p.categorieOferta?.denumire ?? "",
    finisaj: p.finisaj,
    grosime: p.grosime,
    sistem: p.sistem,
    treapta: p.treapta,
    um: p.um,
    pret: p.preturi[0]?.pret.toString() ?? null,
  }));
}
const cheiaProdusului = (p: ProdusCatalog) => p.cod ?? p.codIntern;

// ------------------------------------------------------------------ planul ofertelor
const PANOTAJ = [
  { lungimeM: "4.20", bucati: 3 },
  { lungimeM: "2.50", bucati: 2 },
];
const LOT_TINICHIGERIE = 20;
const LOT_SPECIALE = 25;
const LOT_ML = 25;

async function planComplet(produse: ProdusCatalog[], sablon: Sablon): Promise<OfertaPlan[]> {
  const culori = await prisma.culoareFinisajGrosime.findMany({ where: { activ: true }, orderBy: { culoare: "asc" } });
  const variante = await prisma.variantaProfil.findMany({ where: { activ: true } });
  const culoriCheie = (finisaj: string | null, grosime: string | null): string[] => {
    const toate = culori.filter((c) => c.finisaj === finisaj && c.grosime === grosime).map((c) => c.culoare);
    return TOATE_CULORILE ? toate : toate.slice(0, 1);
  };
  const cheieText = (finisaj: string | null, grosime: string | null, ral: string) => `${finisaj ?? "-"} | ${grosime ?? "-"} | ${ral}`;
  const plan: OfertaPlan[] = [];

  // 1. invelitorile: o oferta per produs (x varianta de profil x montaj), cu prima culoare a cheii
  const invelitori = produse.filter((p) => p.rubrica === "Învelitori");
  const purtatorPeCheie = new Map<string, Invelitoare & { finisaj: string | null; grosime: string | null }>();
  const ofertePeCheie = new Map<string, OfertaPlan[]>();
  for (const p of invelitori) {
    const rale = culoriCheie(p.finisaj, p.grosime);
    if (rale.length === 0) continue; // fara culoare in tabel: produsul nu se poate pune pe oferta
    const variantele = variante.filter((v) => p.familie.toLowerCase().startsWith(v.model.toLowerCase()) && !(v.restrictii ?? "").toLowerCase().includes(`${(p.finisaj ?? "").toLowerCase()} ${(p.grosime ?? "").replace(/\s*mm$/, "")}`));
    const montaje: ("acoperis" | "perete" | null)[] = /acoperiș \/ perete/i.test(p.familie) ? ["acoperis", "perete"] : [null];
    for (const ral of rale) {
      for (const v of variantele.length ? variantele : [null]) {
        for (const montaj of montaje) {
          const inv: Invelitoare = { cheie: "I1", produsId: p.id, culoare: ral, panotaj: PANOTAJ, variantaProfil: v?.variantaProfil ?? null, montaj };
          const id = ["INV", cheiaProdusului(p), ral, v?.variantaProfil ?? "", montaj ?? ""].join("|");
          const o: OfertaPlan = { id, descriere: `${p.denumire}${v ? ` – ${v.variantaProfil}` : ""}${montaj ? ` – ${montaj}` : ""} · ${ral}`, invelitori: [inv], linii: [], sipci: [], produse: [`${cheiaProdusului(p)}|${cheieText(p.finisaj, p.grosime, ral)}${v ? `|${v.variantaProfil}` : ""}${montaj ? `|${montaj}` : ""}`] };
          plan.push(o);
          const k = `${p.finisaj}|${p.grosime}`;
          if (!ofertePeCheie.has(k)) ofertePeCheie.set(k, []);
          ofertePeCheie.get(k)!.push(o);
          if (!purtatorPeCheie.has(k)) purtatorPeCheie.set(k, { ...inv, finisaj: p.finisaj, grosime: p.grosime });
        }
      }
    }
  }

  // 2. accesoriile cheii (tinichigerie, auxiliare, fixare, speciale 2 ML, la lungimi): loturi
  //    puse pe ofertele de invelitoare ale aceleiasi chei (finisaj + grosime); produsele fara
  //    finisaj (folii, mastic...) merg pe cheia "mat 0,50 mm"
  const cheieImplicita = [...purtatorPeCheie.keys()].find((k) => k === "mat|0,50 mm") ?? [...purtatorPeCheie.keys()][0];
  const accesorii = produse.filter((p) => !["Învelitori", "Sistem pluvial", "Șipcă gard"].includes(p.rubrica));
  const peCheie = new Map<string, ProdusCatalog[]>();
  for (const p of accesorii) {
    let k = p.finisaj ? `${p.finisaj}|${p.grosime}` : cheieImplicita;
    if (!purtatorPeCheie.has(k)) k = [...purtatorPeCheie.keys()].find((x) => x.startsWith(`${p.finisaj}|`)) ?? cheieImplicita;
    if (!peCheie.has(k)) peCheie.set(k, []);
    peCheie.get(k)!.push(p);
  }
  const esteML = (p: ProdusCatalog) => /la lungimi|\(ML\)/i.test(p.rubrica);
  const esteSpecial = (p: ProdusCatalog) => /special/i.test(p.rubrica) && !esteML(p);
  let nrLot = 0;
  for (const [k, lista] of peCheie) {
    const purtator = purtatorPeCheie.get(k)!;
    const ral = purtator.culoare;
    const [finisaj, grosime] = k.split("|");
    const cheie = cheieText(finisaj, grosime, ral);
    const loturi: { fel: string; produse: ProdusCatalog[] }[] = [];
    const bucati = (arr: ProdusCatalog[], n: number, fel: string) => {
      for (let i = 0; i < arr.length; i += n) loturi.push({ fel, produse: arr.slice(i, i + n) });
    };
    bucati(lista.filter((p) => !esteML(p) && !esteSpecial(p)), LOT_TINICHIGERIE, "T");
    bucati(lista.filter(esteSpecial), LOT_SPECIALE, "S");
    bucati(lista.filter(esteML), LOT_ML, "L");
    const oferteCheii = ofertePeCheie.get(k) ?? [];
    // fiecare oferta de invelitoare a cheii primeste cel mult un lot de fiecare fel
    const folosite = new Map<string, Set<string>>();
    for (const lot of loturi) {
      let o = oferteCheii.find((x) => !(folosite.get(x.id)?.has(lot.fel) ?? false));
      if (!o) {
        nrLot++;
        o = { id: `LOT|${k}|${lot.fel}|${nrLot}`, descriere: `lot ${lot.fel}${nrLot} pe cheia ${cheie}`, invelitori: [{ ...purtator }], linii: [], sipci: [], produse: [] };
        plan.push(o);
        oferteCheii.push(o);
      }
      if (!folosite.has(o.id)) folosite.set(o.id, new Set());
      folosite.get(o.id)!.add(lot.fel);
      for (const p of lot.produse) {
        const nr = o.linii.length + 1;
        const linie: LinieOferta = { cheie: `L${nr}`, rubrica: p.rubrica, produsId: p.id, cantitate: esteML(p) ? "6" : "3", invelitoare: "I1" };
        if (esteML(p)) linie.pozitii = [{ lungimeM: "3.00", bucati: 2 }];
        o.linii.push(linie);
        o.produse.push(`${cheiaProdusului(p)}|${cheie}`);
      }
    }
  }

  // 3. pluvialul: un lot per finisaj, linii de sine statatoare cu culoarea blocului
  const pluvial = produse.filter((p) => p.rubrica === "Sistem pluvial");
  const culoarePluvial = (finisaj: string | null): string => {
    const bloc = /mat/i.test(finisaj ?? "") ? sablon.harta.blocuriPluvial.SM : /lucios|colorat/i.test(finisaj ?? "") ? sablon.harta.blocuriPluvial.SP : null;
    const ral = bloc?.culori.find((c) => c.ral === "8017")?.ral ?? bloc?.culori[0]?.ral ?? "8017";
    return `RAL ${ral}`;
  };
  for (const finisaj of [...new Set(pluvial.map((p) => p.finisaj))]) {
    const lista = pluvial.filter((p) => p.finisaj === finisaj);
    const ral = culoarePluvial(finisaj);
    const purtator = purtatorPeCheie.get(cheieImplicita)!;
    const o: OfertaPlan = { id: `PLUVIAL|${finisaj}`, descriere: `pluvial ${finisaj} · ${ral}`, invelitori: [{ ...purtator }], linii: [], sipci: [], produse: [] };
    for (const p of lista) {
      o.linii.push({ cheie: `L${o.linii.length + 1}`, rubrica: p.rubrica, produsId: p.id, cantitate: "4", culoare: { ral, finisaj: p.finisaj } });
      o.produse.push(`${cheiaProdusului(p)}|${cheieText(finisaj, null, ral)}`);
    }
    plan.push(o);
  }

  // 4. sipca: o oferta per produs (un formular tine o singura varianta de sipca), varianta "comanda"
  for (const p of produse.filter((x) => x.rubrica === "Șipcă gard")) {
    const rale = culoriCheie(p.finisaj, p.grosime);
    if (rale.length === 0) continue;
    const ral = rale[0];
    const purtator = purtatorPeCheie.get(`${p.finisaj}|${p.grosime}`) ?? purtatorPeCheie.get(cheieImplicita)!;
    const familie = p.familie.replace(/^Șipcă\s+/i, "");
    // FISA-OFERTARE 3.x: modelul de sipca = profil x tip de capat (8 modele); tabela de
    // corespondenta are „drept” / „rotund” pentru toate cele patru profile
    const modele = [`${familie}, capăt drept`, `${familie}, capăt rotund`];
    for (const model of modele) {
      const o: OfertaPlan = { id: `SIPCA|${cheiaProdusului(p)}|${model}`, descriere: `șipcă ${model} ${p.finisaj} ${p.grosime} · ${ral}`, invelitori: [{ ...purtator }], linii: [], sipci: [], produse: [`${cheiaProdusului(p)}|${cheieText(p.finisaj, p.grosime, ral)}|${model}`] };
      o.linii.push({ cheie: "L1", rubrica: p.rubrica, produsId: p.id, cantitate: "12", culoare: { ral, finisaj: p.finisaj, grosime: p.grosime }, pozitii: [{ lungimeM: "1.50", bucati: 4 }, { lungimeM: "1.20", bucati: 5 }] });
      o.sipci.push({ linie: "L1", model, culoare: ral, varianta: "comanda" });
      plan.push(o);
    }
  }
  return plan;
}

async function planProba(produse: ProdusCatalog[]): Promise<OfertaPlan[]> {
  const plan: OfertaPlan[] = [];
  // 1. E01: tigla cu accesorii si pluvial, exact oferta-model
  const e01 = await corpDinEtalon(citesteEtalon("E01"));
  plan.push({ id: "PROBA|E01", descriere: "E01 – țiglă Iberic mat 3005 cu accesorii, fixare și pluvial", invelitori: e01.invelitori.map((i) => ({ ...i, culoare: i.culoare ?? "" })), linii: e01.linii as LinieOferta[], sipci: [], produse: [] });
  // 2. Retro Plus Double Line lucios 0,50 (BUG-2), cu doua accesorii Retro ale cheii
  const retro = produse.find((p) => p.cod === "REPROLUC050");
  if (!retro) throw new Error("REPROLUC050 lipsește din catalogul de test");
  const retroAcc = produse.filter((p) => p.grup === "Accesorii tinichigerie Retro" && p.finisaj === "lucios" && p.grosime === "0,50 mm").slice(0, 2);
  plan.push({
    id: "PROBA|RETRO-DL",
    descriere: "Retro Plus Double Line lucios 0,50 RAL 9006",
    invelitori: [{ cheie: "I1", produsId: retro.id, culoare: "RAL 9006", panotaj: PANOTAJ, variantaProfil: "Double Line" }],
    linii: retroAcc.map((p, k) => ({ cheie: `L${k + 1}`, rubrica: p.rubrica, produsId: p.id, cantitate: "3", invelitoare: "I1" })),
    sipci: [],
    produse: [],
  });
  // 3. T 35 acoperis / perete, lucios 0,50, cu doua accesorii industriale ale cheii
  const t35 = produse.find((p) => /T35/.test(p.familie) && p.finisaj === "lucios" && p.grosime === "0,50 mm" && p.rubrica === "Învelitori");
  if (!t35) throw new Error("Tabla cutată T35 lucios 0,50 lipsește din catalogul de test");
  const indAcc = produse.filter((p) => p.grup === "Accesorii de tinichigerie industriale" && p.finisaj === "lucios" && p.grosime === "0,50 mm").slice(0, 2);
  for (const montaj of ["acoperis", "perete"] as const) {
    plan.push({
      id: `PROBA|T35|${montaj}`,
      descriere: `T 35 ${montaj} lucios 0,50 RAL 9006`,
      invelitori: [{ cheie: "I1", produsId: t35.id, culoare: "RAL 9006", panotaj: PANOTAJ, montaj }],
      linii: indAcc.map((p, k) => ({ cheie: `L${k + 1}`, rubrica: p.rubrica, produsId: p.id, cantitate: "2", invelitoare: "I1" })),
      sipci: [],
      produse: [],
    });
  }
  return plan;
}

// ------------------------------------------------------------------ Excel
interface CitireExcel {
  fisier: string;
  ok: boolean;
  eroare: string | null;
  celule: Record<string, unknown[][] | null>;
  durataMs: number;
}

const CAMPURI_BLOC = ["tip", "model", "modul", "membrana", "finisaj", "culoare", "grosime"] as const;
function celuleBloc(bloc: object): string[] {
  const b = bloc as Record<string, unknown>;
  return CAMPURI_BLOC.map((n) => b[n]).filter((a): a is string => typeof a === "string");
}

function citiriPentru(sablon: Sablon): { foaie: string; interval: string }[] {
  const h = sablon.harta;
  const numeFoaie = (fisier: string) => [...sablon.foi.entries()].find(([, f]) => f === fisier)?.[0] ?? fisier;
  const comanda = numeFoaie(h.foaie.comanda);
  const randuri = h.accesorii.map((r) => r.rand);
  const r0 = Math.min(...randuri);
  const r1 = Math.max(...randuri);
  const sp = Math.min(...h.speciale.randuri);
  const sp1 = Math.max(...h.speciale.randuri);
  const citiri = [
    { foaie: comanda, interval: "R23" },
    { foaie: comanda, interval: "R36" },
    { foaie: comanda, interval: "R49" },
    { foaie: comanda, interval: "E23" },
    { foaie: comanda, interval: "O22" },
    // celulele blocurilor de invelitoare (tip, model, modul, membrana, finisaj, culoare, grosime):
    // ca sa spunem in raport CE s-a scris pe formular atunci cand macro-ul Bilka nu da pret
    ...celuleBloc(h.principala).map((interval) => ({ foaie: comanda, interval })),
    ...celuleBloc(h.secundara).map((interval) => ({ foaie: comanda, interval })),
    { foaie: comanda, interval: `C${r0}:R${r1}` },
    { foaie: "AUX1", interval: "E1" },
    { foaie: "AUX1", interval: "E4" },
    { foaie: "AUX1", interval: "E6" },
    { foaie: numeFoaie(h.foaie.pluvial), interval: "D5" },
    { foaie: numeFoaie(h.foaie.pluvial), interval: "D67" },
    { foaie: numeFoaie(h.foaie.pluvial), interval: "D7:E120" },
    { foaie: numeFoaie(h.foaie.magnelis), interval: "D7:E60" },
    { foaie: numeFoaie(h.foaie.speciale), interval: `B${sp}:R${sp1}` },
    { foaie: "Portal", interval: "A1:BR400" },
  ];
  return citiri;
}

async function ruleazaExcel(fisiere: { cale: string; iesire: string }[], citiri: { foaie: string; interval: string }[], timeoutMs: number): Promise<void> {
  fs.mkdirSync(FOLDER_LUCRU, { recursive: true });
  const job = path.join(FOLDER_LUCRU, `job-${Date.now()}.json`);
  const pidFisier = path.join(FOLDER_LUCRU, `pid-${Date.now()}.txt`);
  fs.writeFileSync(job, JSON.stringify({ fisiere, citiri, pid: pidFisier }), "utf8");
  const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "excel.ps1");
  await new Promise<void>((resolve, reject) => {
    const p = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script, job], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let err = "";
    p.stderr.on("data", (d: Buffer) => (err += d.toString()));
    const t = setTimeout(() => {
      try {
        const pid = fs.existsSync(pidFisier) ? fs.readFileSync(pidFisier, "utf8").trim() : "";
        for (const id of pid.split(",").filter(Boolean)) process.kill(Number(id));
      } catch {
        /* procesul Excel s-a inchis deja */
      }
      p.kill();
      reject(new Error(`Excel nu a terminat în ${timeoutMs / 1000} s`));
    }, timeoutMs);
    p.on("exit", (code) => {
      clearTimeout(t);
      if (code === 0) resolve();
      else reject(new Error(`excel.ps1 a ieșit cu codul ${code}: ${err.slice(0, 500)}`));
    });
  });
  fs.rmSync(job, { force: true });
  fs.rmSync(pidFisier, { force: true });
}

// ------------------------------------------------------------------ comparatia
interface RandPortal {
  grup: string;
  id: string;
  um: string;
  clasa: string;
  model: string;
  grosime: string;
  latime: string;
  finisaj: string;
  culoare: string;
  tipAcc: string;
  cant: number;
  lungimi: { lungime: number; bucati: number }[];
}
function randuriPortal(celule: Record<string, unknown[][] | null>): RandPortal[] {
  const t = celule["Portal!A1:BR400"];
  if (!t) return [];
  const out: RandPortal[] = [];
  for (const r of t.slice(1)) {
    if (!r[0] && !r[1] && !r[4]) continue;
    const lungimi: { lungime: number; bucati: number }[] = [];
    for (let i = 14; i + 1 < r.length; i += 2) {
      const l = numar(r[i]);
      const b = numar(r[i + 1]);
      if (l > 0 && b > 0) lungimi.push({ lungime: l, bucati: b });
    }
    out.push({ grup: String(r[0] ?? ""), id: String(r[1] ?? "").trim(), um: String(r[2] ?? ""), clasa: String(r[4] ?? ""), model: String(r[6] ?? ""), grosime: String(r[7] ?? ""), latime: String(r[8] ?? ""), finisaj: String(r[9] ?? ""), culoare: String(r[10] ?? ""), tipAcc: String(r[11] ?? ""), cant: numar(r[13]), lungimi });
  }
  return out;
}

const PATTERNS_FARA_LOC: [RegExp, string][] = [
  [/pluvialul acesta nu are foaie/i, "pluvialul Aluzinc n-are foaie în formular"],
  [/același rând în formular/i, "două produse pe același rând al formularului (M4 la S17d)"],
  [/niciun rând liber/i, "niciun rând liber pentru familia lui"],
  [/sloturi/i, "peste 28 de lungimi"],
  [/învelitoare secundară/i, "a doua învelitoare secundară"],
  [/nu e în lista de culori a blocului/i, "culoarea nu e în lista blocului de pluvial"],
  [/formularul nu are „/i, "formularul n-are numele cu culoarea aceasta"],
  [/rânduri .* lungimi|peste 35/i, "peste 35 de rânduri la lungimi"],
  [/zincat/i, "holțșuruburi zincate pe un formular colorat"],
];

// randul cerut de un anumit produs: avertizarea „Nu au loc…” e un singur text cu toate
// produsele, deci randul se citeste din segmentul produsului, nu din primul segment
function randulDinAvertizare(a: string, cod: string | undefined): string | undefined {
  if (!cod) return /același rând în formular \(„([^”]+)”\)/.exec(a)?.[1];
  const re = new RegExp(`\\(${cod.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)[^;]*?același rând în formular \\(„([^”]+)”\\)`);
  return re.exec(a)?.[1];
}

function categorizeazaAvertizare(a: string, cod?: string): { categorie: Categorie; detaliu: string; propunere?: string } {
  for (const [re, text] of PATTERNS_FARA_LOC) {
    if (!re.test(a)) continue;
    const rand = randulDinAvertizare(a, cod);
    return { categorie: "c_fara_loc", detaliu: rand ? `${text} — rândul „${rand}”` : text };
  }
  if (/fără corespondență|nu are corespondență/i.test(a)) return { categorie: "a_referinte", detaliu: "fără rând în tabela de corespondență" };
  if (/nu există în formularul încărcat|nu are corespondent în listele|nu e în lista șablonului|nu se poate scrie pe formular/i.test(a)) return { categorie: "a_referinte", detaliu: a };
  return { categorie: "b_cod", detaliu: a };
}

// numele cel mai apropiat din lista sablonului (propunere pentru Referinte)
function propuneNume(denumire: string, sablon: Sablon): string {
  const cuv = (s: string) => new Set(normNume(s).normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^A-Z0-9]+/).filter((w) => w.length > 2));
  const a = cuv(denumire);
  let best = "";
  let scor = 0;
  for (const nume of sablon.harta.numeAcceptate.values()) {
    const b = cuv(nume);
    let comun = 0;
    for (const w of a) if ([...b].some((x) => x.startsWith(w.slice(0, 4)) || w.startsWith(x.slice(0, 4)))) comun++;
    const s = comun / Math.max(1, Math.max(a.size, b.size));
    if (s > scor) {
      scor = s;
      best = nume;
    }
  }
  return scor >= 0.34 ? best : "";
}

interface LinieSalvata {
  cod: string;
  denumire: string;
  rubrica: string;
  cantitate: number;
  pret: number;
  invelitoareId: string | null;
  panotaj: { lungime: number; bucati: number }[];
  pozitii: { lungime: number; bucati: number }[];
}

type RezultatLinie = Omit<RezultatProdus, "cod" | "denumire" | "rubrica" | "cheie" | "oferta">;
function comparaFormular(linii: LinieSalvata[], citire: CitireExcel, avertizari: string[], sablon: Sablon): { rez: Map<string, RezultatLinie>; portalNefolosit: string[] } {
  const rez = new Map<string, RezultatLinie>();
  const portal = randuriPortal(citire.celule);
  const comanda = [...sablon.foi.entries()].find(([, f]) => f === sablon.harta.foaie.comanda)?.[0] ?? "FORMULAR COMANDA";
  const r0 = Math.min(...sablon.harta.accesorii.map((r) => r.rand));
  const r1 = Math.max(...sablon.harta.accesorii.map((r) => r.rand));
  const tabel = citire.celule[`${comanda}!C${r0}:R${r1}`] ?? [];
  // randurile de accesorii: nume (C / M) -> pret (H / R); coloanele C..R = indici 0..15
  const pretDupaNume = new Map<string, number>();
  for (const r of tabel) {
    if (r[0]) pretDupaNume.set(normNume(String(r[0])), numar(r[5]));
    if (r[10]) pretDupaNume.set(normNume(String(r[10])), numar(r[15]));
  }
  const pluvialFoaie = [...sablon.foi.entries()].find(([, f]) => f === sablon.harta.foaie.pluvial)?.[0] ?? "SISTEM PLUVIAL";
  const magnelisFoaie = [...sablon.foi.entries()].find(([, f]) => f === sablon.harta.foaie.magnelis)?.[0] ?? "SISTEM PLUVIAL MAGNELIS";
  const pretPluvial = (cod: string): number => {
    const loc = sablon.harta.pluvial.get(cod.toUpperCase());
    if (!loc) return NaN;
    const rand = Number(loc.celulaCantitate.replace(/^[A-Z]+/, ""));
    const t = loc.foaie === sablon.harta.foaie.magnelis ? citire.celule[`${magnelisFoaie}!D7:E60`] : citire.celule[`${pluvialFoaie}!D7:E120`];
    return numar(t?.[rand - 7]?.[0]);
  };
  const specialeFoaie = [...sablon.foi.entries()].find(([, f]) => f === sablon.harta.foaie.speciale)?.[0] ?? "FORMULAR ACCESORII SPECIALE";
  const sp0 = Math.min(...sablon.harta.speciale.randuri);
  const sp1 = Math.max(...sablon.harta.speciale.randuri);
  const tabelML = citire.celule[`${specialeFoaie}!B${sp0}:R${sp1}`] ?? [];
  const pretR23 = numar(citire.celule[`${comanda}!R23`]?.[0]?.[0]);
  const pretR36 = numar(citire.celule[`${comanda}!R36`]?.[0]?.[0]);
  const pretR49 = numar(citire.celule[`${comanda}!R49`]?.[0]?.[0]);
  const folosite = new Set<number>();
  const gasestePortal = (cod: string): RandPortal | undefined => {
    const i = portal.findIndex((r, k) => !folosite.has(k) && r.id.toUpperCase() === cod.toUpperCase());
    if (i < 0) return undefined;
    folosite.add(i);
    return portal[i];
  };
  // (d): macro-ul Bilka da un alt cod decat catalogul pentru acelasi produs (aceeasi familie,
  // primele 5 caractere - ex. SPRAY RETUS -> AXSPRMAT000 fata de AXSPRMAT400): randul exista
  // in Portal, dar sub codul lui Bilka
  const gasestePortalDupaFamilie = (cod: string): RandPortal | undefined => {
    const prefix = cod.slice(0, 5).toUpperCase();
    const i = portal.findIndex((r, k) => !folosite.has(k) && r.id.toUpperCase().startsWith(prefix));
    if (i < 0) return undefined;
    folosite.add(i);
    return portal[i];
  };

  let nrInvelitoare = 0;
  for (const l of linii) {
    const detalii: string[] = [];
    let categorie: Categorie = "ok";
    let propunere: string | undefined;
    const avertizareLiniei = avertizari.filter((a) => a.includes(`(${l.cod})`) || (a.includes(l.denumire) && !/^Rezultatul/.test(a)));
    if (avertizareLiniei.length > 0) {
      const c = categorizeazaAvertizare(avertizareLiniei.join(" ; "), l.cod);
      categorie = c.categorie;
      detalii.push(c.detaliu);
      if (c.categorie === "a_referinte") propunere = propuneNume(l.denumire, sablon);
      rez.set(l.cod, { categorie, detalii, propunere, pretCatalog: l.pret.toFixed(2) });
      continue;
    }
    let p = gasestePortal(l.cod);
    let codBilka: string | undefined;
    if (!p && l.rubrica !== "Învelitori") {
      p = gasestePortalDupaFamilie(l.cod);
      if (p) codBilka = p.id;
      else {
        // randul e in Portal, dar FARA cod de ierarhie: macro-ul Bilka n-are regula pentru numele
        // acesta (ex. "SET COS FUM ( 4 PIESE )") - de clarificat cu Bilka, nu e la noi
        const i = portal.findIndex((r, k) => !folosite.has(k) && r.id === "" && aprox(r.cant, l.cantitate, 0.001));
        if (i >= 0) {
          folosite.add(i);
          p = portal[i];
          codBilka = `(gol — macro-ul Bilka nu dă cod pentru numele „${p.tipAcc}”)`;
        }
      }
    }
    let pretExcel = NaN;
    if (l.rubrica === "Învelitori") {
      nrInvelitoare++;
      pretExcel = nrInvelitoare === 1 ? pretR23 : pretR36;
      if (!p) {
        // (d): macro-ul a scos invelitoarea in Portal, dar sub alt cod decat al catalogului
        const i = portal.findIndex((r, k) => !folosite.has(k) && /invelitoare/i.test(r.grup));
        if (i >= 0) {
          folosite.add(i);
          p = portal[i];
          codBilka = p.id || "(gol)";
        }
      }
      if (!p) {
        // ce s-a scris efectiv in blocul de invelitoare (ca sa se vada de ce macro-ul n-a dat pret)
        const bloc = (nrInvelitoare === 1 ? sablon.harta.principala : sablon.harta.secundara) as unknown as Record<string, unknown>;
        const scris = CAMPURI_BLOC.filter((n) => typeof bloc[n] === "string")
          .map((n) => `${n} „${String(citire.celule[`${comanda}!${bloc[n] as string}`]?.[0]?.[0] ?? "")}”`)
          .join(", ");
        const modelAux = String(citire.celule["AUX1!E1"]?.[0]?.[0] ?? "");
        detalii.push(`nu apare în Portal — preț Excel ${Number.isFinite(pretExcel) ? pretExcel.toFixed(2) : "—"}; scris pe formular: ${scris}; modelul compus de șablon (AUX1!E1) „${modelAux}”`);
      } else {
        if (!/invelitoare/i.test(p.grup)) detalii.push(`grup Portal „${p.grup}”`);
        const mp = l.cantitate; // mp-ul motorului (panotaj × lățime, 3 zecimale)
        if (!aprox(p.cant, mp, 0.002)) detalii.push(`cantitate Portal ${Math.round(p.cant * 1000) / 1000} ≠ ${mp} mp`);
        const asteptat = l.panotaj.map((x) => `${x.lungime}×${x.bucati}`).join(", ");
        const primit = p.lungimi.map((x) => `${x.lungime}×${x.bucati}`).join(", ");
        if (asteptat !== primit) detalii.push(`lungimi Portal [${primit}] ≠ [${asteptat}]`);
      }
    } else if (/pluvial/i.test(l.rubrica)) {
      pretExcel = pretPluvial(l.cod);
      if (!p) detalii.push("nu apare în Portal");
      else if (!aprox(p.cant, l.cantitate, 0.001)) detalii.push(`cantitate Portal ${p.cant} ≠ ${l.cantitate}`);
    } else if (/la lungimi|\(ML\)/i.test(l.rubrica)) {
      if (!p) detalii.push("nu apare în Portal");
      else if (!aprox(p.cant, l.cantitate, 0.001)) detalii.push(`cantitate Portal ${p.cant} ≠ ${l.cantitate} ml`);
      // pretul pe ml: randul din foaia specialelor cu treapta lui (coloana O = indice 13 fata de B)
      const treapta = /D\d\d/.exec(l.denumire)?.[0];
      const rand = tabelML.find((r) => treapta && String(r[0] ?? "").includes(treapta));
      pretExcel = numar(rand?.[13]);
    } else if (/șipcă/i.test(l.rubrica)) {
      pretExcel = pretR49;
      if (!p) detalii.push("nu apare în Portal");
      else if (!aprox(p.cant, l.cantitate, 0.001)) detalii.push(`cantitate Portal ${p.cant} ≠ ${l.cantitate}`);
    } else {
      if (!p) detalii.push("nu apare în Portal");
      else {
        if (!aprox(p.cant, l.cantitate, 0.001)) detalii.push(`cantitate Portal ${p.cant} ≠ ${l.cantitate}`);
        pretExcel = pretDupaNume.get(normNume(p.tipAcc)) ?? NaN;
      }
    }
    const pretDifera = Number.isFinite(pretExcel) && !aprox(pretExcel, l.pret, 0.011);
    if (detalii.length > 0) categorie = "b_cod";
    else if (codBilka) {
      categorie = "d_bilka";
      detalii.push(`în Portal sub codul ${codBilka}, în catalog ${l.cod}${pretDifera ? `; preț Excel ${pretExcel.toFixed(2)} ≠ catalog ${l.pret.toFixed(2)}` : ""}`);
    } else if (pretDifera) {
      categorie = "d_bilka";
      detalii.push(`preț Excel ${pretExcel.toFixed(2)} ≠ catalog ${l.pret.toFixed(2)}`);
    } else if (!Number.isFinite(pretExcel) || pretExcel === 0) {
      categorie = "b_cod";
      detalii.push("prețul nu s-a putut citi din formular");
    }
    rez.set(l.cod, { categorie, detalii, pretCatalog: l.pret.toFixed(2), pretExcel: Number.isFinite(pretExcel) ? pretExcel.toFixed(2) : undefined, portal: p ? `${p.grup} · ${p.id} · ${Math.round(p.cant * 1000) / 1000}${p.lungimi.length ? ` · ${p.lungimi.map((x) => `${x.lungime}×${x.bucati}`).join(",")}` : ""}` : undefined });
  }
  const portalNefolosit = portal.filter((_, k) => !folosite.has(k)).map((r) => `${r.grup} · ${r.id} · ${r.tipAcc} · ${Math.round(r.cant * 1000) / 1000}`);
  return { rez, portalNefolosit };
}

// ------------------------------------------------------------------ o oferta
type Agent = Awaited<ReturnType<typeof autentificaAgent>>;

async function ruleazaOferta(o: OfertaPlan, agent: Agent, sablon: Sablon, citiri: { foaie: string; interval: string }[], stare: Stare, produseDupaId: Map<string, ProdusCatalog>) {
  const t0 = Date.now();
  const client = { nume: "Verificare formular", telefon: "0700000001", adresa: "Str. Probă 1", localitate: "Focșani" };
  let { body: creata } = await agent.post("/api/oferte").send({ client });
  if (!creata.oferta && creata.eroare === "Autentificare necesara") {
    // sesiunea expira dupa multe ore (sau dupa repausul calculatorului): re-autentificare pe acelasi agent
    await agent.post("/api/auth/login").send({ email: EMAIL_AGENT, parola: PAROLA_TEST });
    ({ body: creata } = await agent.post("/api/oferte").send({ client }));
  }
  if (!creata.oferta) throw new Error(`oferta nu s-a creat: ${JSON.stringify(creata)}`);
  const id = creata.oferta.id as string;
  const rp = await agent.put(`/api/oferte/${id}/produse`).send({ grupaPct: "0", invelitori: o.invelitori, linii: o.linii, sipci: o.sipci, zonaB: [] });
  if (rp.status !== 200) throw new Error(`produsele nu s-au salvat: ${JSON.stringify(rp.body).slice(0, 400)}`);
  for (const status of ["TRANSMISA", "DE_COMANDAT"]) {
    const rs = await agent.put(`/api/oferte/${id}/status`).send({ status });
    if (rs.status !== 200) throw new Error(`statusul ${status}: ${JSON.stringify(rs.body).slice(0, 300)}`);
  }
  const rf = await agent.post(`/api/oferte/${id}/formulare-bilka`).send({});
  const numarOferta = creata.oferta.numarComplet as string;
  if (rf.status !== 201) {
    // G6 / fara sablon: generarea refuzata - toate produsele ofertei, categoria (a)
    const mesaj = String(rf.body.eroare ?? JSON.stringify(rf.body));
    stare.oferte[o.id] = { numar: numarOferta, produse: o.produse, formulare: [], avertizari: [mesaj], eroare: mesaj };
    return;
  }
  const documente = rf.body.documente as { id: string; nume: string; fisier?: string; formularNr: number; avertizari: string | null }[];
  // avertizarile „Atenție la trimitere” (S17d) sunt informative, nu tin produsul departe de comparatie
  const avertizari = ((rf.body.avertizari as string[]) ?? []).filter((a) => !/Atenție la trimitere/.test(a));
  // liniile salvate (snapshot cu pret de baza) - asteptarea
  const liniiDb = await prisma.ofertaLinie.findMany({ where: { ofertaId: id }, include: { pozitii: true, invelitoare: { include: { panotaj: true } } }, orderBy: { ordine: "asc" } });
  const liniiFormular = new Map<number, LinieSalvata[]>();
  const structura = (await agent.get(`/api/oferte/${id}`)).body.oferta.structura?.rezultat as { linii?: { id: string; cantitate: string }[]; formulareBilka: { nr: number; linii?: string[]; invelitoarePrincipala?: string; invelitoriSecundare?: string[]; pluvial?: { linii: string[] }[]; sipca?: { id: string }; lungimi?: string[] }[] } | undefined;
  // cantitatea asteptata e cea calculata de motor (la invelitoare: mp-ul din panotaj; la sipca: ml-ul)
  const cantitateMotor = new Map((structura?.linii ?? []).map((l) => [l.id, numar(l.cantitate)]));
  const spreLinie = (l: (typeof liniiDb)[number]): LinieSalvata => ({
    cod: l.cod,
    denumire: l.denumire,
    rubrica: l.rubrica,
    cantitate: cantitateMotor.get(l.id) ?? numar(l.cantitate.toString()),
    pret: numar(l.pretBazaEur.toString()),
    invelitoareId: l.invelitoareId,
    panotaj: (l.invelitoare?.panotaj ?? []).map((p) => ({ lungime: numar(p.lungimeM.toString()), bucati: p.bucati })),
    pozitii: l.pozitii.map((p) => ({ lungime: numar(p.lungimeM.toString()), bucati: p.bucati })),
  });
  const toateLiniile = liniiDb.map(spreLinie);
  for (const f of structura?.formulareBilka ?? []) {
    const ids = new Set<string>([...(f.linii ?? []), ...(f.pluvial ?? []).flatMap((p) => p.linii), ...(f.lungimi ?? [])]);
    const invIds = new Set<string>([f.invelitoarePrincipala ?? "", ...(f.invelitoriSecundare ?? [])]);
    const sipcaId = f.sipca?.id;
    liniiFormular.set(
      f.nr,
      liniiDb.filter((l) => ids.has(l.id) || (l.invelitoareId && invIds.has(l.invelitoareId) && l.rubrica === "Învelitori") || (sipcaId && /șipcă/i.test(l.rubrica))).map(spreLinie),
    );
  }
  // fisierele: copie in folderul de lucru, Excel, citire
  fs.mkdirSync(FOLDER_LUCRU, { recursive: true });
  const lucru = documente.map((d) => {
    return { doc: d, cale: path.join(FOLDER_LUCRU, `${numarOferta}-F${d.formularNr}.xlsm`), iesire: path.join(FOLDER_LUCRU, `${numarOferta}-F${d.formularNr}.json`) };
  });
  for (const w of lucru) {
    const docDb = await prisma.ofertaDocument.findUniqueOrThrow({ where: { id: w.doc.id } });
    fs.copyFileSync(path.resolve(RADACINA, "data-test", docDb.fisier), w.cale);
    fs.rmSync(w.iesire, { force: true });
  }
  await ruleazaExcel(lucru.map((w) => ({ cale: w.cale, iesire: w.iesire })), citiri, 90_000 * Math.max(1, lucru.length));
  const rezultatOferta: Stare["oferte"][string] = { numar: numarOferta, produse: o.produse, formulare: lucru.map((w) => path.basename(w.cale)), avertizari, durataMs: 0, portalNefolosit: [] };
  for (const w of lucru) {
    const citire = JSON.parse(fs.readFileSync(w.iesire, "utf8")) as CitireExcel;
    const liniile = liniiFormular.get(w.doc.formularNr) ?? (lucru.length === 1 ? toateLiniile : []);
    if (!citire.ok) {
      for (const l of liniile) noteaza(stare, o, l, { categorie: "eroare", detalii: [`Excel: ${citire.eroare}`] }, path.basename(w.cale), produseDupaId);
      continue;
    }
    const avertizariFormular = [...avertizari, ...(w.doc.avertizari ? w.doc.avertizari.split("\n").filter((a) => !/Atenție la trimitere/.test(a)) : [])];
    const { rez, portalNefolosit } = comparaFormular(liniile, citire, avertizariFormular, sablon);
    rezultatOferta.portalNefolosit!.push(...portalNefolosit.map((r) => `${path.basename(w.cale)}: ${r}`));
    for (const l of liniile) {
      const r = rez.get(l.cod);
      if (r) noteaza(stare, o, l, r, path.basename(w.cale), produseDupaId);
    }
    fs.rmSync(w.cale, { force: true });
    fs.rmSync(w.iesire, { force: true });
  }
  // liniile care n-au ajuns pe niciun formular (motorul nu le-a pus) - categoria (c) cu motivul din avertizari
  const notate = new Set(Object.values(stare.produse).filter((p) => p.oferta === o.id).map((p) => p.cod));
  for (const l of toateLiniile) if (!notate.has(l.cod)) noteaza(stare, o, l, { categorie: avertizari.some((a) => a.includes(l.cod)) ? categorizeazaAvertizare(avertizari.filter((a) => a.includes(l.cod)).join(";"), l.cod).categorie : "b_cod", detalii: [avertizari.filter((a) => a.includes(l.cod)).join("; ") || "linia nu a ajuns pe niciun formular"] }, undefined, produseDupaId);
  rezultatOferta.durataMs = Date.now() - t0;
  stare.oferte[o.id] = rezultatOferta;
  reclasifica(stare);
}

function noteaza(stare: Stare, o: OfertaPlan, l: LinieSalvata, r: Partial<RezultatProdus> & { categorie: Categorie; detalii: string[] }, formular: string | undefined, produseDupaId: Map<string, ProdusCatalog>) {
  const cheieProdus = o.produse.find((k) => k.startsWith(`${l.cod}|`)) ?? `${l.cod}|${o.id}`;
  const anterior = stare.produse[cheieProdus];
  // trecerea a doua (singur) nu inrautateste un rezultat bun; un rezultat mai bun il inlocuieste pe cel vechi
  if (anterior && anterior.categorie === "ok" && r.categorie !== "ok") return;
  stare.produse[cheieProdus] = {
    cod: l.cod,
    denumire: l.denumire,
    rubrica: l.rubrica,
    cheie: cheieProdus.split("|").slice(1).join(" | "),
    oferta: o.id,
    formular,
    categorie: r.categorie,
    detalii: r.detalii,
    propunere: r.propunere,
    pretCatalog: r.pretCatalog,
    pretExcel: r.pretExcel,
    portal: r.portal,
    singur: o.singur,
  };
  void produseDupaId;
}

// (b) inseamna „scris pe formular, dar Portal / pretul nu-l confirma” - doua situatii nu sunt
// ale codului nostru si trec la (d): macro-ul Bilka da pret 0 (combinatia lipseste din tabelele
// COMBCUL / PreturiTbl ale sablonului; formularul e completat din listele sablonului) si
// produsele fara cod Bilka in catalog (BIL-…), al caror rand din Portal nu se poate potrivi dupa cod
function reclasifica(stare: Stare) {
  for (const p of Object.values(stare.produse)) {
    if (p.categorie !== "b_cod") continue;
    const text = p.detalii.join("; ");
    if (!/^nu apare în Portal/.test(text)) continue;
    if (p.pretExcel === "0.00") {
      p.categorie = "d_bilka";
      p.detalii = [`macro-ul Bilka dă preț 0 și nu scrie rândul în Portal (combinația model / finisaj / grosime / culoare lipsește din tabelele COMBCUL sau PreturiTbl ale șablonului) — ${text}`];
    } else if (/^BIL-/.test(p.cod)) {
      const nefolosit = (stare.oferte[p.oferta]?.portalNefolosit ?? []).map((r) => r.replace(/^[^:]+: /, "")).join("; ");
      p.categorie = "d_bilka";
      p.detalii = [`produsul n-are cod Bilka în catalog, deci rândul lui din Portal nu se poate potrivi după cod${nefolosit ? `; rânduri din Portal rămase nepotrivite: ${nefolosit}` : ""}`];
    }
  }
}

// ------------------------------------------------------------------ raportul
const TITLU: Record<Categorie, string> = {
  ok: "Corecte",
  a_referinte: "(a) Nu s-au exportat — se rezolvă în Referințe",
  b_cod: "(b) Se rezolvă în cod",
  c_fara_loc: "(c) N-au loc în formular prin natura lui",
  d_bilka: "(d) De clarificat cu Bilka",
  eroare: "Erori de rulare (se reiau la următoarea rulare)",
};

function scrieRaport(stare: Stare) {
  const produse = Object.values(stare.produse);
  const pe = (c: Categorie) => produse.filter((p) => p.categorie === c);
  const linii: string[] = [];
  linii.push(`# Formularul de comandă Bilka — Excel ca arbitru${PROBA ? " (proba pe trei formulare)" : ""}`);
  linii.push("");
  linii.push(`Scris de \`npm run verifica:formular\` (S17c). Șablon: **${stare.sablon?.versiune ?? "?"}**. Pornit ${stare.pornit.slice(0, 16).replace("T", " ")}, actualizat ${stare.actualizat.slice(0, 16).replace("T", " ")}. Oferte rulate: ${stare.rulate ?? Object.keys(stare.oferte).length} din ${stare.planificat} planificate; produse verificate: ${produse.length}.`);
  linii.push("");
  linii.push("## Ce rulează automat în Excel (verificat în codul VBA, S17b / S17c)");
  linii.push("");
  linii.push("La deschidere rulează `Workbook_Open`: adaugă bara de butoane Bilka și activează foaia FORMULAR COMANDA. La salvare rulează `Workbook_BeforeSave` → `ExportToPortal`: golește foaia „Portal” și o rescrie din celulele formularului (învelitoare, secundară, șipcă, accesorii, pluvial, speciale, ferestre), apelând doar funcțiile de calcul din registru (`CalcPretTigla`, `CalcPretSipca`, `getCheieAccesoriu`, `getValueFromTable`). Singurele apeluri în afara registrului din tot proiectul VBA sunt în `GetDataSap` și `SaveOfertaSap` (obiectele `SAP.LogonControl`, `SAP.Functions`), pornite numai din butoanele „Get Date SAP” / „Save Oferta SAP” / „Save Comanda SAP” și din butoanele foii (`Incarcaoferta_Click`, `Incarcacomanda_Click`); nicio procedură automată nu le apelează. Nu există apeluri de rețea, shell, fișiere sau e-mail în rest. Evenimentele de foaie (`Worksheet_Change` pe modelul E23, pe foaia Preturi, pe AUX1) lucrează doar pe celule. Concluzie: deschiderea și salvarea prin automatizare rulează doar rescrierea foii Portal și calculele; nimic nu pleacă nicăieri.");
  linii.push("");
  linii.push("## Rezumat");
  linii.push("");
  linii.push("| Categorie | Produse |");
  linii.push("|---|---|");
  for (const c of ["ok", "a_referinte", "b_cod", "c_fara_loc", "d_bilka", "eroare"] as Categorie[]) linii.push(`| ${TITLU[c]} | ${pe(c).length} |`);
  linii.push("");
  if (stare.deReluat.length > 0) linii.push(`Produse de reluat singure (trecerea a doua, nerulate încă): ${stare.deReluat.length}.`);
  // concluziile scrise de mana dupa citirea raportului stau in fisierul lor si intra aici,
  // ca raportul sa poata fi rescris de script fara sa le piarda
  const caleConcluzii = path.join(DOCS_VERIFICARI, "formular-bilka-concluzii.md");
  if (!PROBA && fs.existsSync(caleConcluzii)) {
    linii.push("");
    linii.push(fs.readFileSync(caleConcluzii, "utf8").trim());
  }
  const oferteCuEroare = Object.entries(stare.oferte).filter(([, o]) => o.eroare);
  if (oferteCuEroare.length > 0) {
    linii.push("");
    linii.push("## Oferte la care generarea a fost refuzată");
    linii.push("");
    for (const [id, o] of oferteCuEroare) linii.push(`- ${o.numar} (${id}): ${o.eroare}`);
  }
  for (const c of ["a_referinte", "b_cod", "d_bilka", "c_fara_loc", "eroare"] as Categorie[]) {
    const lista = pe(c);
    if (lista.length === 0) continue;
    linii.push("");
    linii.push(`## ${TITLU[c]} — ${lista.length}`);
    linii.push("");
    linii.push(c === "a_referinte" ? "| Cod | Produs | Cheie | Ce s-a întâmplat | Nume propus (Referințe → „Formular Bilka”) |" : "| Cod | Produs | Cheie | Ce s-a întâmplat | Preț catalog / Excel | Portal |");
    linii.push("|---|---|---|---|---|---|");
    for (const p of lista.sort((x, y) => x.cod.localeCompare(y.cod))) {
      const ce = p.detalii.join("; ").replace(/\|/g, "／");
      if (c === "a_referinte") linii.push(`| ${p.cod} | ${p.denumire} | ${p.cheie} | ${ce} | ${p.propunere ?? "—"} |`);
      else linii.push(`| ${p.cod} | ${p.denumire} | ${p.cheie} | ${ce} | ${p.pretCatalog ?? "—"} / ${p.pretExcel ?? "—"} | ${(p.portal ?? "—").replace(/\|/g, "／")} |`);
    }
  }
  linii.push("");
  linii.push(`Starea completă, pe fiecare produs (inclusiv cele corecte): \`${path.basename(CALE_STARE)}\`.`);
  linii.push("");
  fs.writeFileSync(CALE_RAPORT, linii.join("\n"), "utf8");
}

// ------------------------------------------------------------------ main
async function main() {
  const caleSablon = dupa("--sablon") ?? fs.readdirSync(path.resolve(RADACINA, "data", "sabloane-bilka")).filter((f) => /\.xlsm$/i.test(f)).map((f) => path.resolve(RADACINA, "data", "sabloane-bilka", f))[0];
  if (!caleSablon || !fs.existsSync(caleSablon)) throw new Error("Nu există niciun șablon în data/sabloane-bilka; dă unul cu --sablon <cale.xlsm>");
  if (os.platform() !== "win32") throw new Error("Excel ca arbitru rulează doar pe Windows, cu Excel instalat");
  const stare = citesteStare();
  log(`șablon: ${caleSablon}`);
  const { agent, versiuneSablon, sablon } = await pregateste(caleSablon);
  if (stare.sablon && stare.sablon.versiune !== versiuneSablon) {
    log(`ATENȚIE: starea e pentru șablonul „${stare.sablon.versiune}”, acum rulează „${versiuneSablon}” — folosește --de-la-zero pentru un șablon nou`);
  }
  stare.sablon = { fisier: path.basename(caleSablon), versiune: versiuneSablon };
  const produse = await catalog();
  const produseDupaId = new Map(produse.map((p) => [p.id, p]));
  // produsele iesite din catalog (inactive dupa o corectie de date) nu mai au ce cauta in stare
  const coduriActive = new Set(produse.map((p) => p.cod ?? p.codIntern));
  for (const [k, p] of Object.entries(stare.produse)) if (!coduriActive.has(p.cod)) delete stare.produse[k];
  let plan = PROBA ? await planProba(produse) : await planComplet(produse, sablon);
  // ofertele primei treceri care nu mai sunt in plan (alta impartire, ex. sipca pe tip de capat)
  // ies din stare impreuna cu produsele lor, ca sa se verifice din nou
  const inPrimaTrecere = new Set(plan.map((o) => o.id));
  for (const [id] of Object.entries(stare.oferte)) {
    if (inPrimaTrecere.has(id) || id.startsWith("SINGUR|")) continue;
    for (const [k, p] of Object.entries(stare.produse)) if (p.oferta === id) delete stare.produse[k];
    delete stare.oferte[id];
  }
  reclasifica(stare);
  // trecerea a doua: produsele ajunse la avertizari (a / b / c) in loturile primei treceri se
  // reiau pe aceeasi invelitoare purtatoare, in loturi in care niciun rand al formularului nu e
  // cerut de doua produse (randul cerut se citeste din avertizarea „același rând în formular”);
  // „niciun rând liber” merge singur pe oferta lui
  if (!PROBA) {
    const LOT_A_DOUA = 20;
    const randulCerut = (o: OfertaPlan, cod: string): string | null => {
      const a = (stare.oferte[o.id]?.avertizari ?? []).find((x) => x.includes(`(${cod})`) && /același rând în formular/.test(x));
      return a ? (randulDinAvertizare(a, cod) ?? null) : null;
    };
    // produsele se strang pe cheia lor (finisaj | grosime | RAL), indiferent din ce oferta a
    // primei treceri vin: purtatoarea e invelitoarea primei oferte a cheii
    const grupuri = new Map<string, { invelitori: Invelitoare[]; produse: { k: string; linie: LinieOferta; rand: string; singur: boolean }[] }>();
    const vazute = new Set<string>();
    for (const o of plan) {
      if (o.linii.length <= 1) continue;
      for (const k of o.produse) {
        const r = stare.produse[k];
        if (!r || vazute.has(k) || !["a_referinte", "b_cod", "c_fara_loc"].includes(r.categorie)) continue;
        // un produs incercat deja singur nu se mai reia - cu o exceptie: „același rând” se mai
        // incearca o data in loturi noi (id-ul lotului poarta continutul, deci un lot deja rulat nu se repeta)
        if (r.singur && !/același rând/.test(r.detalii.join(" "))) continue;
        const linie = o.linii.find((l) => produseDupaId.get(l.produsId) && cheiaProdusului(produseDupaId.get(l.produsId)!) === r.cod);
        if (!linie) continue;
        vazute.add(k);
        const g = k.split("|").slice(1).join("|");
        if (!grupuri.has(g)) grupuri.set(g, { invelitori: o.invelitori, produse: [] });
        grupuri.get(g)!.produse.push({ k, linie, rand: randulCerut(o, r.cod) ?? `*${k}`, singur: /niciun rând liber/.test(r.detalii.join(" ")) });
      }
    }
    const aDoua: OfertaPlan[] = [];
    for (const [g, grup] of grupuri) {
      const loturi: { randuri: Set<string>; linii: LinieOferta[]; produse: string[] }[] = [];
      for (const p of grup.produse) {
        let lot = p.singur ? undefined : loturi.find((x) => !x.randuri.has("*singur") && !x.randuri.has(p.rand) && x.linii.length < LOT_A_DOUA);
        if (!lot) {
          lot = { randuri: new Set(p.singur ? ["*singur"] : []), linii: [], produse: [] };
          loturi.push(lot);
        }
        lot.randuri.add(p.rand);
        lot.linii.push({ ...p.linie, cheie: `L${lot.linii.length + 1}` });
        lot.produse.push(p.k);
      }
      loturi.forEach((lot, n) => aDoua.push({ id: `SINGUR|${g}|${n + 1}|${createHash("sha1").update([...lot.produse].sort().join("\n")).digest("hex").slice(0, 8)}`, descriere: `trecerea a doua ${n + 1}/${loturi.length} pe cheia ${g}`, invelitori: grup.invelitori, linii: lot.linii, sipci: [], produse: lot.produse, singur: true }));
    }
    plan = [...plan, ...aDoua];
  }
  stare.planificat = plan.length;
  // loturile cu eroare dintr-un plan vechi (alta impartire a trecerii a doua) nu se mai reiau: ies din stare
  const inPlan = new Set(plan.map((o) => o.id));
  for (const [id, o] of Object.entries(stare.oferte)) if (o.eroare && !inPlan.has(id)) delete stare.oferte[id];
  const citiri = citiriPentru(sablon);
  // --doar-acelasi-rand: ofertele din plan la care o rulare anterioara a avut „același rând”
  // (M4 trebuie sa le dea acum doua formulare); altfel, ce nu s-a rulat inca sau a dat eroare
  const deRulat = DOAR_ACELASI_RAND
    ? plan.filter((o) => (stare.oferte[o.id]?.avertizari ?? []).some((a) => /același rând/.test(a)))
    : plan.filter((o) => !stare.oferte[o.id] || stare.oferte[o.id].eroare);
  stare.rulate = plan.length - deRulat.length;
  log(`plan: ${plan.length} oferte, ${plan.reduce((s, o) => s + o.produse.length, 0)} verificări de produs; de rulat acum: ${Math.min(deRulat.length, LIMITA)}`);
  scrieStare(stare);
  scrieRaport(stare);
  let n = 0;
  for (const o of deRulat) {
    if (n >= LIMITA) break;
    n++;
    try {
      await ruleazaOferta(o, agent, sablon, citiri, stare, produseDupaId);
      log(`[${n}/${deRulat.length}] ${o.descriere} → ${stare.oferte[o.id]?.formulare.length ?? 0} formulare, ${(stare.oferte[o.id]?.durataMs ?? 0) / 1000}s`);
    } catch (e) {
      const mesaj = e instanceof Error ? e.message : String(e);
      log(`[${n}/${deRulat.length}] ${o.descriere} → EROARE: ${mesaj.slice(0, 200)}`);
      stare.oferte[o.id] = { numar: "?", produse: o.produse, formulare: [], avertizari: [], eroare: mesaj };
    }
    stare.rulate = plan.filter((x) => stare.oferte[x.id] && !stare.oferte[x.id].eroare).length;
    scrieStare(stare);
    scrieRaport(stare);
  }
  log(`gata: ${stare.rulate ?? 0}/${plan.length} oferte rulate; raport: ${CALE_RAPORT}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
