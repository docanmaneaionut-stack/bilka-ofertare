import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { cereAutentificare } from "../accounts/middleware.js";
import { ROLURI_CU_OFERTE } from "./vizibilitate.js";

// Catalogul pentru editorul de oferta (FISA-OFERTARE cap. 3-10): produsele cu
// caracteristicile lor, fara niciun pret; listele implicite rezolvate pe nume
// (familie + varianta) pentru cheia de culoare; cautarea pe rubrica
// (categorie_oferta - regula de rubrica e in catalog) si pe cheie; treptele,
// pluvialul, sipca. Rubrica unui produs e strict categorie_oferta din catalog.

export interface ProdusEditor {
  id: string;
  cod: string;
  denumire: string;
  um: string;
  categorie: string | null;
  compartiment: string;
  grup: string;
  familie: string | null;
  varianta: string | null;
  optiune: string | null;
  finisaj: string | null;
  grosime: string | null;
  sistem: string | null;
  treapta: string | null;
  desfasurata: string | null;
  latimeTotalaM: string | null;
  latimeTotalaMm: string | null;
  modulCm: string | null;
  culoriDisponibile: string | null;
  tablaPlana: "mp" | "coala" | null;
}

export const selectProdusEditor = {
  id: true,
  codIntern: true,
  codFurnizor: true,
  denumire: true,
  um: true,
  varianta: true,
  optiune: true,
  finisaj: true,
  grosime: true,
  sistem: true,
  treapta: true,
  desfasurata: true,
  latimeTotalaM: true,
  latimeTotalaMm: true,
  modulCm: true,
  culoriDisponibile: true,
  activ: true,
  compartiment: { select: { denumire: true } },
  grup: { select: { denumire: true, ordine: true } },
  familie: { select: { denumire: true, ordine: true } },
  categorieOferta: { select: { denumire: true, ordine: true } },
} satisfies Prisma.ProdusSelect;

type RandProdus = Prisma.ProdusGetPayload<{ select: typeof selectProdusEditor }>;

export function spreProdusEditor(p: RandProdus): ProdusEditor {
  const coala = /coală 1,25/i.test(p.denumire);
  const tablaPlana = coala ? "coala" : /^Tablă plană/i.test(p.denumire) && p.um.toUpperCase() === "M2" ? "mp" : null;
  return {
    id: p.id,
    cod: p.codFurnizor ?? p.codIntern,
    denumire: p.denumire,
    um: p.um,
    categorie: p.categorieOferta?.denumire ?? null,
    compartiment: p.compartiment.denumire,
    grup: p.grup.denumire,
    familie: p.familie?.denumire ?? null,
    varianta: p.varianta,
    optiune: p.optiune,
    finisaj: p.finisaj,
    grosime: p.grosime,
    sistem: p.sistem,
    treapta: p.treapta,
    desfasurata: p.desfasurata,
    latimeTotalaM: p.latimeTotalaM?.toString() ?? null,
    latimeTotalaMm: p.latimeTotalaMm?.toString() ?? null,
    modulCm: p.modulCm?.toString() ?? null,
    culoriDisponibile: p.culoriDisponibile,
    tablaPlana,
  };
}

// ------------------------------------------------ chei si categorii

export interface CheieEditor {
  finisaj?: string | null;
  grosime?: string | null;
  sistem?: string | null;
}

function areGrosime(p: ProdusEditor): boolean {
  return Boolean(p.grosime && p.grosime.trim() && p.grosime.trim() !== "—");
}

// finisajul echivalent la auxiliare (spray, corector): doar mat / lucios exista;
// un finisaj "mat"-like (Grande Mat, dubluvopsit mat) ia varianta mat, restul lucios
export function finisajAuxiliar(finisaj: string): "mat" | "lucios" {
  return /mat/i.test(finisaj) ? "mat" : "lucios";
}

// produsul se potriveste cheii: finisajul si grosimea se compara doar daca produsul
// le are; pluvialul se potriveste pe sistem (randurile "125 / 90 si 150 / 100" merg la ambele)
export function potrivesteCheia(p: ProdusEditor, cheie: CheieEditor, strict = true): boolean {
  if (cheie.finisaj && p.finisaj) {
    const ok = p.finisaj.toLowerCase() === cheie.finisaj.toLowerCase() || (!strict && p.finisaj.toLowerCase() === finisajAuxiliar(cheie.finisaj));
    if (!ok) return false;
  }
  if (cheie.grosime && areGrosime(p) && p.grosime!.replace(/\s/g, "") !== cheie.grosime.replace(/\s/g, "")) return false;
  if (cheie.sistem && p.sistem && !p.sistem.includes(cheie.sistem)) return false;
  return true;
}

// categoria invelitorii pentru listele implicite (coloana categorie_invelitoare din
// liste-implicite-oferta.csv), dedusa din grupul si familia produsului
export function categorieInvelitoare(p: { grup: string; familie: string | null }, categoriiListe: string[]): string | null {
  const grup = p.grup.toLowerCase();
  const familie = (p.familie ?? "").toLowerCase();
  let prefix: string;
  if (grup.startsWith("țiglă metalică") || grup.startsWith("tigla metalica")) prefix = familie.includes("romanic") ? "țiglă metalică romanic" : "țiglă metalică (fără";
  else if (grup.startsWith("învelitori plate")) prefix = "învelitori plate";
  else if (grup.startsWith("tablă cutată") || grup.startsWith("tablă plană")) prefix = "tablă cutată";
  else return null;
  return categoriiListe.find((c) => c.toLowerCase().startsWith(prefix)) ?? null;
}

// ------------------------------------------------ potrivirea listelor implicite

const STOP = new Set(["mm", "m", "ml", "mp", "buc", "de", "cu", "pentru", "si", "și", "tip", "grade", "retus", "retuș", "spray"]);

export function cuvinte(s: string, cuParanteze = false): string[] {
  return (cuParanteze ? s.toLowerCase().replace(/[()]/g, " ") : s.toLowerCase().replace(/\(.*?\)/g, " "))
    .replace(/(\d)(m|mm)\b/g, "$1 $2")
    .replace(/°/g, " ")
    .replace(/\bx\b/g, " ")
    .replace(/[–/×,.-]+/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t));
}

// numele din lista (ex. "Bordura fronton 312 mm") -> produsul din catalog pentru
// cheia data: toate cuvintele numelui apar in familie + varianta; la mai multi
// candidati castiga familia care incepe cu primul cuvant, apoi cea mai scurta.
// La pluvial denumirea preia dimensiunea sistemului (125 / 150), deci numarul
// sistemului se scoate din familie inainte de comparare.
export function rezolvaNumeLista(nume: string, candidati: ProdusEditor[], cheie: CheieEditor, pluvial = false): ProdusEditor[] {
  // la pluvial dimensiunile sistemului (125 / 90, 150 / 100) nu conteaza in nume
  const faraSistem = (c: string[]) => (pluvial ? c.filter((x) => !["125", "150", "90", "100"].includes(x)) : c);
  // "Spray retuș (spray corector 400 ml)": numele din catalog e cel din paranteze
  const numeCatalog = /\(([^)]+)\)/.exec(nume)?.[1] ?? nume;
  const t = faraSistem(cuvinte(numeCatalog));
  const cuCheie = candidati.filter((p) => potrivesteCheia(p, cheie, true));
  const potrivit = (p: ProdusEditor) => {
    // la produs se pastreaza si parantezele ("1,50 × 50 m (75 mp / rolă)")
    const tr = new Set(faraSistem(cuvinte(`${p.familie ?? ""} ${p.varianta ?? ""}`, true)));
    if (t.every((x) => tr.has(x))) return true;
    // produsele derivate (coala de tabla plana) se recunosc dupa denumirea intreaga
    const td = new Set(cuvinte(p.denumire, true));
    return p.tablaPlana === "coala" && t.every((x) => td.has(x));
  };
  const cand = (cuCheie.length ? cuCheie : candidati.filter((p) => potrivesteCheia(p, cheie, false))).filter(potrivit);
  const peFamilie = new Map<string, ProdusEditor[]>();
  for (const p of cand) {
    const k = `${p.familie}|${p.varianta}`;
    peFamilie.set(k, [...(peFamilie.get(k) ?? []), p]);
  }
  let familii = [...peFamilie.keys()];
  if (familii.length > 1 && cheie.finisaj) {
    // la auxiliare (spray, corector) finisajul sta in varianta: mat / lucios dupa cheie
    const dorit = finisajAuxiliar(cheie.finisaj);
    const f1 = familii.filter((f) => f.split("|")[1]?.trim().toLowerCase() === dorit);
    if (f1.length === 1) familii = f1;
  }
  if (familii.length > 1) {
    const f2 = familii.filter((f) => f.toLowerCase().startsWith(t[0]));
    if (f2.length) familii = f2;
    if (familii.length > 1) {
      const lung = (f: string) => cuvinte(f.replace("|", " ")).length;
      const minim = Math.min(...familii.map(lung));
      familii = familii.filter((f) => lung(f) === minim);
    }
  }
  if (familii.length !== 1) return familii.flatMap((f) => peFamilie.get(f) ?? []);
  return peFamilie.get(familii[0]) ?? [];
}

export interface RezultatListaImplicita {
  produse: (ProdusEditor & { ordine: number; numeLista: string })[];
  nerezolvate: { ordine: number; nume: string; candidati: number }[];
}

export async function listaImplicita(rubrica: string, categorieInv: string | null, cheie: CheieEditor): Promise<RezultatListaImplicita> {
  const randuri = await prisma.listaImplicitaOferta.findMany({ where: { activ: true, rubrica }, orderBy: { ordine: "asc" } });
  const deCategorie = categorieInv ? randuri.filter((r) => r.categorieInvelitoare === categorieInv) : randuri.filter((r, _i, toate) => toate.every((x) => x.categorieInvelitoare === r.categorieInvelitoare));
  // candidatii: toate produsele active (lista decide rubrica randului, catalogul categoria)
  const toate = (await prisma.produs.findMany({ where: { activ: true }, select: selectProdusEditor })).map(spreProdusEditor);
  const pluvial = /pluvial/i.test(rubrica);
  const rezultat: RezultatListaImplicita = { produse: [], nerezolvate: [] };
  for (const r of deCategorie) {
    const gasite = rezolvaNumeLista(r.produs, toate, cheie, pluvial);
    // dupa cheie poate ramane un singur produs; la pluvial alegem sistemul cerut
    const unic = gasite.length > 1 && cheie.sistem ? gasite.filter((p) => p.sistem?.includes(cheie.sistem!)) : gasite;
    if (unic.length === 1) rezultat.produse.push({ ...unic[0], ordine: r.ordine, numeLista: r.produs });
    else rezultat.nerezolvate.push({ ordine: r.ordine, nume: r.produs, candidati: unic.length });
  }
  return rezultat;
}

// ------------------------------------------------ rutele

export const catalogEditorRouter = Router();
catalogEditorRouter.use(cereAutentificare);
catalogEditorRouter.use((req, res, next) => {
  if (!ROLURI_CU_OFERTE.includes(req.utilizator!.rol) && req.utilizator!.rol !== "ADMIN_GENERAL") {
    res.status(403).json({ eroare: "Catalogul ofertei e pentru conturile care fac oferte" });
    return;
  }
  next();
});

const schemaCheie = z.object({ finisaj: z.string().trim().optional(), grosime: z.string().trim().optional(), sistem: z.string().trim().optional() });

catalogEditorRouter.get("/invelitori", async (_req, res) => {
  const produse = await prisma.produs.findMany({
    where: { activ: true, categorieOferta: { denumire: "Învelitori" } },
    select: selectProdusEditor,
    orderBy: [{ grup: { ordine: "asc" } }, { familie: { ordine: "asc" } }, { denumire: "asc" }],
  });
  res.json({ produse: produse.map(spreProdusEditor) });
});

catalogEditorRouter.get("/referinte", async (_req, res) => {
  const [culori, trepte, variante, categorii, liste] = await Promise.all([
    prisma.culoareFinisajGrosime.findMany({ where: { activ: true }, orderBy: [{ finisaj: "asc" }, { grosime: "asc" }, { culoare: "asc" }], select: { furnizor: true, finisaj: true, grosime: true, culoare: true } }),
    prisma.treaptaDesfasurata.findMany({ where: { activ: true }, orderBy: { deLaMm: "asc" }, select: { treapta: true, deLaMm: true, panaLaMm: true } }),
    prisma.variantaProfil.findMany({ where: { activ: true }, select: { model: true, variantaProfil: true, restrictii: true } }),
    prisma.categorieOferta.findMany({ orderBy: { ordine: "asc" }, select: { denumire: true, zona: true, ordine: true } }),
    prisma.listaImplicitaOferta.findMany({ where: { activ: true }, distinct: ["rubrica", "categorieInvelitoare"], select: { rubrica: true, categorieInvelitoare: true } }),
  ]);
  res.json({ culori, trepte, variante, categorii, categoriiListe: liste });
});

catalogEditorRouter.get("/liste-implicite", async (req, res) => {
  const { rubrica, categorieInvelitoare: cat, ...cheie } = z.object({ rubrica: z.string().trim().min(1), categorieInvelitoare: z.string().trim().optional() }).merge(schemaCheie).parse(req.query);
  res.json(await listaImplicita(rubrica, cat ?? null, cheie));
});

catalogEditorRouter.get("/cauta", async (req, res) => {
  const { q, categorie, ...cheie } = z.object({ q: z.string().trim().min(2).max(100), categorie: z.string().trim().optional() }).merge(schemaCheie).parse(req.query);
  const produse = await prisma.produs.findMany({
    where: {
      activ: true,
      ...(categorie ? { categorieOferta: { denumire: categorie } } : {}),
      OR: [{ denumire: { contains: q, mode: "insensitive" } }, { codFurnizor: { contains: q, mode: "insensitive" } }],
    },
    select: selectProdusEditor,
    orderBy: { denumire: "asc" },
    take: 200,
  });
  const potrivite = produse.map(spreProdusEditor).filter((p) => potrivesteCheia(p, cheie, false));
  res.json({ produse: potrivite.slice(0, 40), total: potrivite.length });
});

// accesoriile speciale: cele 25 de trepte pentru cheie, in ordinea treptelor
catalogEditorRouter.get("/speciale", async (req, res) => {
  const { categorie, ...cheie } = z.object({ categorie: z.string().trim().min(1) }).merge(schemaCheie).parse(req.query);
  const produse = await prisma.produs.findMany({ where: { activ: true, categorieOferta: { denumire: categorie } }, select: selectProdusEditor });
  const potrivite = produse
    .map(spreProdusEditor)
    .filter((p) => potrivesteCheia(p, cheie, true))
    .sort((a, b) => (a.treapta ?? "").localeCompare(b.treapta ?? ""));
  res.json({ produse: potrivite });
});

// pluvialul: produsele finisajului si sistemului, lista implicita in fata, restul dupa
catalogEditorRouter.get("/pluvial", async (req, res) => {
  const cheie = z.object({ finisaj: z.string().trim().min(1), sistem: z.string().trim().min(1) }).parse(req.query);
  const toate = (await prisma.produs.findMany({ where: { activ: true, categorieOferta: { denumire: "Sistem pluvial" } }, select: selectProdusEditor })).map(spreProdusEditor);
  const potrivite = toate.filter((p) => potrivesteCheia(p, cheie, true));
  const implicite = await listaImplicita("Sistem pluvial", null, cheie);
  const idsImplicite = new Set(implicite.produse.map((p) => p.id));
  res.json({ implicite: implicite.produse, nerezolvate: implicite.nerezolvate, restul: potrivite.filter((p) => !idsImplicite.has(p.id)) });
});

catalogEditorRouter.get("/sipca", async (_req, res) => {
  const produse = await prisma.produs.findMany({ where: { activ: true, categorieOferta: { denumire: "Șipcă gard" } }, select: selectProdusEditor, orderBy: [{ familie: { ordine: "asc" } }, { denumire: "asc" }] });
  res.json({ produse: produse.map(spreProdusEditor) });
});
