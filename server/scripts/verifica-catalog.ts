import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { prisma } from "../src/db/prisma.js";
import { genereazaCodIntern } from "../src/modules/cat/codIntern.js";
import { citesteFisierBilkaV1 } from "../src/modules/imp/formate/bilkaV1.js";

// Verificare, doar citire: (1) CSV-urile din docs/import/Bilka ↔ baza de date,
// (2) facturile Bilka ↔ baza. Valorile (pret, denumire, UM, activ) se compara
// din textul BRUT al CSV-ului; din cititorul de import se folosesc doar
// regulile structurale (rubrica, codul intern, derivarea coalei de tabla plana).
// Rulare: npm run verifica:catalog   (in server/)

const RADACINA = path.resolve(process.cwd(), "..");
const FOLDER_IMPORT = path.join(RADACINA, "docs", "import", "Bilka");
const FOLDER_VERIFICARI = path.join(RADACINA, "docs", "verificari");
const FISIER_FACTURI = path.join(FOLDER_VERIFICARI, "facturi-bilka-2026-10-randuri.csv");
const FISIER_REZULTAT = path.join(FOLDER_VERIFICARI, "facturi-bilka-2026-10-verificare-baza.csv");

const LISTE_PRODUSE = [
  "01-rezidential.csv", "02-auxiliare.csv", "03-04-pluvial.csv", "04b-pluvial-aluzinc.csv", "05-retro-faltuita.csv",
  "06-industrial.csv", "07-sipca-gard.csv", "08-accesorii-speciale-2ml.csv", "09-accesorii-speciale-ml.csv",
];
const REFERINTE: { fisier: string; model: string; cheie: string[]; coloane: Record<string, string> }[] = [
  { fisier: "variante-profil.csv", model: "variantaProfil", cheie: ["model", "varianta_profil"], coloane: { model: "model", varianta_profil: "variantaProfil", restrictii: "restrictii", lista_sursa: "listaSursa" } },
  { fisier: "culori-finisaj-grosime.csv", model: "culoareFinisajGrosime", cheie: ["finisaj", "grosime", "culoare"], coloane: { finisaj: "finisaj", grosime: "grosime", culoare: "culoare" } },
  { fisier: "garantii-finisaj-grosime.csv", model: "garantieFinisajGrosime", cheie: ["finisaj", "grosime"], coloane: { finisaj: "finisaj", grosime: "grosime", garantie_culoare_ani: "garantieCuloareAni", garantie_coroziune_ani: "garantieCoroziuneAni", strat_zinc_g_mp: "stratZincGMp", strat_vopsea_um_ext_int: "stratVopseaUmExtInt" } },
  { fisier: "liste-implicite-oferta.csv", model: "listaImplicitaOferta", cheie: ["rubrica", "categorie_invelitoare", "produs"], coloane: { rubrica: "rubrica", categorie_invelitoare: "categorieInvelitoare", ordine: "ordine", produs: "produs" } },
  { fisier: "trepte-desfasurata.csv", model: "treaptaDesfasurata", cheie: ["treapta"], coloane: { treapta: "treapta", de_la_mm: "deLaMm", pana_la_mm: "panaLaMm", denumire_bilka: "denumireBilka" } },
];

type Rand = Record<string, string>;
const citesteBrut = (cale: string): Rand[] => parse(readFileSync(cale), { bom: true, delimiter: ";", columns: true, skip_empty_lines: true, relax_column_count: true }) as Rand[];
const numar = (s: string | undefined) => (s === undefined || s.trim() === "" ? null : Number(s.trim().replace(",", ".")));
const bani = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;
const text = (v: unknown) => (v === null || v === undefined ? "" : typeof v === "object" && "toString" in (v as object) ? String(v) : String(v));
const egalNumeric = (a: string | undefined, b: unknown) => { const x = numar(a); const y = b === null || b === undefined ? null : Number(b); return x === null && y === null ? true : x !== null && y !== null && Math.abs(x - y) < 1e-9; };

const diferente: string[] = [];
const dif = (unde: string, camp: string, csv: unknown, baza: unknown) => diferente.push(`${unde} · ${camp}: CSV „${csv}” ≠ bază „${baza}”`);

const compartiment = await prisma.compartiment.findUnique({ where: { codScurt: "BIL" } });
if (!compartiment) throw new Error("Compartimentul BIL nu există");
const listaActiva = await prisma.listaPret.findFirst({ where: { compartimentId: compartiment.id, status: "ACTIVA" } });
if (!listaActiva) throw new Error("Nu există versiune activă de prețuri la Bilka");
const produseBaza = await prisma.produs.findMany({ where: { compartimentId: compartiment.id }, include: { categorieOferta: true } });
const preturi = new Map((await prisma.pretListaProdus.findMany({ where: { listaPretId: listaActiva.id } })).map((p) => [p.produsId, Number(p.pret)]));
const dupaCodIntern = new Map(produseBaza.map((p) => [p.codIntern, p]));
const rubrici = (await prisma.categorieOferta.findMany()).map((c) => c.denumire);
const ctx = { codScurtCompartiment: compartiment.codScurt, denumireCompartiment: compartiment.denumire, monedaCompartiment: compartiment.moneda, rubrici };

// ---------------------------------------------------------------- 1. catalog ↔ bază
let randuriCsv = 0, produseVerificate = 0, coaleVerificate = 0;
const coduriVazute = new Set<string>();
for (const fisier of LISTE_PRODUSE) {
  const cale = path.join(FOLDER_IMPORT, fisier);
  const brute = citesteBrut(cale);
  const structura = citesteFisierBilkaV1(fisier, readFileSync(cale), ctx);
  const erori = structura.probleme.filter((p) => p.nivel === "eroare");
  if (erori.length) diferente.push(`${fisier}: cititorul de import raportează ${erori.length} erori structurale (${erori[0].mesaj})`);
  const peRand = new Map<number, typeof structura.produse>();
  for (const p of structura.produse) peRand.set(p.rand, [...(peRand.get(p.rand) ?? []), p]);

  brute.forEach((r, i) => {
    randuriCsv += 1;
    const rand = i + 2;
    const codFurnizor = r.cod_furnizor?.trim() || null;
    const denumire = r.denumire; // brut, ca atare
    const pret = numar(r.pret_eur);
    const unde = `${fisier} rândul ${rand} (${codFurnizor ?? "fără cod"})`;
    const codIntern = genereazaCodIntern({ codScurtCompartiment: compartiment.codScurt, codFurnizor, denumire });
    coduriVazute.add(codIntern);
    const structuri = peRand.get(rand) ?? [];
    const structMp = structuri.find((s) => s.tablaPlana !== "coala");
    const p = dupaCodIntern.get(codIntern);
    if (!p) { diferente.push(`${unde}: produsul lipsește din bază (cod intern ${codIntern})`); return; }
    produseVerificate += 1;
    if (p.denumire !== denumire) dif(unde, "denumire", denumire, p.denumire);
    if (p.um !== r.um) dif(unde, "UM", r.um, p.um);
    if (structMp && p.categorieOferta?.denumire !== structMp.categorieOferta) dif(unde, "rubrică", structMp.categorieOferta, p.categorieOferta?.denumire ?? "—");
    if (p.activ !== ((r.activ ?? "da").trim().toLowerCase() !== "nu")) dif(unde, "activ", r.activ, p.activ);
    const pretBaza = preturi.get(p.id);
    if (pretBaza === undefined) diferente.push(`${unde}: fără preț în versiunea activă`);
    else if (pret === null || Math.abs(pretBaza - pret) > 1e-9) dif(unde, "preț", r.pret_eur, pretBaza);

    const structCoala = structuri.find((s) => s.tablaPlana === "coala");
    if (structCoala && structMp) {
      const sufix = structCoala.denumire.slice(structMp.denumire.length);
      const denumireCoala = denumire + sufix;
      const codCoala = genereazaCodIntern({ codScurtCompartiment: compartiment.codScurt, codFurnizor, denumire: denumireCoala });
      coduriVazute.add(codCoala);
      const c = dupaCodIntern.get(codCoala);
      if (!c) { diferente.push(`${unde}: produsul-coală lipsește din bază`); return; }
      coaleVerificate += 1;
      if (c.denumire !== denumireCoala) dif(unde + " coală", "denumire", denumireCoala, c.denumire);
      if (c.um !== "BUC") dif(unde + " coală", "UM", "BUC", c.um);
      if (c.categorieOferta?.denumire !== "Accesorii standard") dif(unde + " coală", "rubrică", "Accesorii standard", c.categorieOferta?.denumire ?? "—");
      const pretCoala = preturi.get(c.id);
      const asteptat = pret === null ? null : bani(pret * 2.5);
      if (pretCoala === undefined) diferente.push(`${unde} coală: fără preț în versiunea activă`);
      else if (asteptat === null || Math.abs(pretCoala - asteptat) > 1e-9) dif(unde + " coală", "preț (2,5 × preț/mp)", asteptat, pretCoala);
    }
  });
}
const inPlus = produseBaza.filter((p) => !coduriVazute.has(p.codIntern));
for (const p of inPlus) diferente.push(`în bază, dar nu în CSV-uri: ${p.codIntern} „${p.denumire}”`);

// tabelele de referinta
let referinteVerificate = 0;
for (const ref of REFERINTE) {
  const brute = citesteBrut(path.join(FOLDER_IMPORT, ref.fisier));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const randuriBaza = (await (prisma as any)[ref.model].findMany({ where: { furnizor: compartiment.denumire } })) as Record<string, unknown>[];
  const cheie = (v: (c: string) => unknown) => ref.cheie.map((c) => text(v(c))).join("|");
  const dupaCheie = new Map(randuriBaza.map((r) => [cheie((c) => r[ref.coloane[c]]), r]));
  const vazute = new Set<string>();
  brute.forEach((r, i) => {
    const k = cheie((c) => (r[c] ?? "").trim());
    vazute.add(k);
    const unde = `${ref.fisier} rândul ${i + 2} (${k})`;
    const b = dupaCheie.get(k);
    if (!b) { diferente.push(`${unde}: lipsește din bază`); return; }
    referinteVerificate += 1;
    if (b.activ !== true) dif(unde, "activ", "da", b.activ);
    for (const [col, camp] of Object.entries(ref.coloane)) {
      const csv = (r[col] ?? "").trim();
      const baza = b[camp];
      const numeric = ["garantie_culoare_ani", "garantie_coroziune_ani", "strat_zinc_g_mp", "ordine", "de_la_mm", "pana_la_mm"].includes(col);
      const egal = numeric ? egalNumeric(csv, baza) : (csv === "" ? baza === null || baza === "" : csv === text(baza));
      if (!egal) dif(unde, col, csv, baza);
    }
  });
  for (const b of randuriBaza) { const k = cheie((c) => b[ref.coloane[c]]); if (!vazute.has(k) && b.activ) diferente.push(`${ref.fisier}: în bază, dar nu în CSV: ${k}`); }
}

// ---------------------------------------------------------------- 2. facturi ↔ bază
const facturi = citesteBrut(FISIER_FACTURI);
const dupaCodFurnizor = new Map<string, typeof produseBaza>();
for (const p of produseBaza) if (p.codFurnizor) dupaCodFurnizor.set(p.codFurnizor, [...(dupaCodFurnizor.get(p.codFurnizor) ?? []), p]);
const SUFIX_COALA = (() => { const c = produseBaza.find((p) => p.denumire.includes("– coală 1,25")); return c ? c.denumire.slice(c.denumire.indexOf(" – coală 1,25")) : " – coală 1,25 × 2,00 m (2,5 mp)"; })();

const verdicte: Record<string, number> = { identic: 0, "1 ban": 0, diferit: 0, negăsit: 0, ambalaj: 0 };
const diferitePeFactura: Record<string, number> = {};
const iesire: string[] = [];
const antetIn = Object.keys(facturi[0]);
const antetOut = [...antetIn, "cod_intern_baza", "pret_baza_eur", "pret_baza_lei", "diferenta_baza_lei", "verdict_baza"];
const campCsv = (s: string) => (/[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
iesire.push(antetOut.join(";"));
for (const r of facturi) {
  const extra: string[] = ["", "", "", "", ""];
  if (r.tip !== "produs") { verdicte.ambalaj += 1; extra[4] = "ambalaj (exclus)"; }
  else {
    const candidati = dupaCodFurnizor.get(r.cod_bilka?.trim()) ?? [];
    const coala = r.multiplicator?.trim() === "2.5";
    const denumireCautata = coala ? r.denumire_catalog + SUFIX_COALA : r.denumire_catalog;
    const p = candidati.find((c) => c.denumire === denumireCautata) ?? (coala ? candidati.find((c) => c.um === "BUC" && c.denumire.endsWith(SUFIX_COALA)) : undefined);
    const pretEur = p ? preturi.get(p.id) : undefined;
    if (!p || pretEur === undefined) { verdicte.negăsit += 1; extra[4] = `negăsit în bază (${r.cod_bilka}, „${denumireCautata}”)`; }
    else {
      const curs = Number(r.curs);
      const pretLei = bani(pretEur * curs);
      const factura = Number(r.pret_factura_lei);
      const delta = bani(factura - pretLei);
      const verdict = Math.abs(delta) < 0.005 ? "identic" : Math.abs(delta) <= 0.01 ? "1 ban" : "diferit";
      verdicte[verdict] += 1;
      if (verdict === "diferit") diferitePeFactura[r.factura] = (diferitePeFactura[r.factura] ?? 0) + 1;
      extra[0] = p.codIntern; extra[1] = pretEur.toFixed(2); extra[2] = pretLei.toFixed(2); extra[3] = delta.toFixed(2); extra[4] = verdict;
    }
  }
  iesire.push([...antetIn.map((c) => campCsv(r[c] ?? "")), ...extra.map(campCsv)].join(";"));
}
writeFileSync(FISIER_REZULTAT, "﻿" + iesire.join("\r\n") + "\r\n", "utf8");

// ---------------------------------------------------------------- raport
console.log("=== 1. Catalog ↔ bază ===");
console.log(`Rânduri CSV: ${randuriCsv} · produse verificate: ${produseVerificate} · coale verificate: ${coaleVerificate} · produse în bază: ${produseBaza.length} · versiunea activă: „${listaActiva.denumire}” (${preturi.size} prețuri)`);
console.log(`Rânduri de referință verificate: ${referinteVerificate}`);
console.log(`Diferențe: ${diferente.length}`);
for (const d of diferente.slice(0, 50)) console.log("  - " + d);
if (diferente.length > 50) console.log(`  … și încă ${diferente.length - 50}`);
console.log("=== 2. Facturi ↔ bază ===");
console.log(`Rânduri: ${facturi.length} · produse: ${facturi.filter((r) => r.tip === "produs").length} · identice: ${verdicte.identic} · 1 ban: ${verdicte["1 ban"]} · diferite: ${verdicte.diferit} · negăsite: ${verdicte.negăsit} · ambalaj: ${verdicte.ambalaj}`);
for (const [f, n] of Object.entries(diferitePeFactura)) console.log(`  diferite pe factura ${f}: ${n}`);
console.log(`Rezultat scris în ${path.relative(RADACINA, FISIER_REZULTAT)}`);
await prisma.$disconnect();
