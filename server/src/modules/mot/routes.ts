import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import { z as zod } from "zod";
import { prisma } from "../../db/prisma.js";
import { cereRol } from "../accounts/middleware.js";
import { calculeazaOferta } from "./calcul.js";
import { coduriEtalon, construiesteIntrare, type CatalogPentruEtalon, type FisierEtalon, type ProdusCatalogEtalon } from "./etalon.js";
import { schemaIntrareOferta, type IntrareOferta } from "./tipuri.js";
import { la2 } from "./zecimal.js";

// "Calcul de proba" (Zona tehnica, doar Admin general): ecranul citeste catalogul
// real (lista de pret activa) si apeleaza motorul pur. Nimic nu se salveaza.
// Rutele: produse cautate cu pretul activ, ofertele-model din docs/etalon
// construite cu preturile din baza, si calculul propriu-zis.

export const motRouter = Router();
motRouter.use(cereRol("ADMIN_GENERAL"));

export const DIRECTOR_ETALON = fileURLToPath(new URL("../../../../docs/etalon/", import.meta.url));

// produsul asa cum il vede ecranul: tot ce are nevoie motorul, plus id-ul si rubrica
export interface ProdusProba extends ProdusCatalogEtalon {
  produsId: string;
  codIntern: string;
  rubrica: string | null;
  moneda: string;
  compartiment: string;
}

const includeProdus = {
  compartiment: { select: { denumire: true } },
  grup: { select: { denumire: true } },
  familie: { select: { denumire: true } },
  categorieOferta: { select: { denumire: true } },
  preturi: { where: { listaPret: { status: "ACTIVA" as const } }, select: { pret: true } },
};

type ProdusCuPret = Awaited<ReturnType<typeof prisma.produs.findMany<{ include: typeof includeProdus }>>>[number];

function spreProdusProba(p: ProdusCuPret): ProdusProba | null {
  const pret = p.preturi[0]?.pret;
  if (pret === undefined) return null;
  const produs: ProdusProba = {
    produsId: p.id,
    codIntern: p.codIntern,
    cod: p.codFurnizor ?? p.codIntern,
    denumire: p.denumire,
    um: p.um,
    pretEur: la2(pret.toString()),
    rubrica: p.categorieOferta?.denumire ?? null,
    moneda: p.moneda,
    compartiment: p.compartiment.denumire,
    grup: p.grup.denumire,
  };
  if (p.finisaj) produs.finisaj = p.finisaj;
  if (p.grosime) produs.grosime = p.grosime;
  if (p.familie) produs.familie = p.familie.denumire;
  if (p.varianta) produs.varianta = p.varianta;
  if (p.optiune) produs.optiune = p.optiune;
  if (p.latimeTotalaM !== null) produs.latimeTotalaM = p.latimeTotalaM.toString();
  if (p.latimeTotalaMm !== null) produs.latimeTotalaMm = p.latimeTotalaMm.toString();
  // tabla plana: la mp (invelitoare) sau la coala (accesoriu la bucata)
  if (/coal/i.test(p.categorieOferta?.denumire ?? "") || /coală/i.test(p.denumire)) {
    produs.tablaPlana = /coală/i.test(p.denumire) ? "coala" : "mp";
  } else if (/Tablă plană/i.test(p.denumire) && p.um.toUpperCase() === "M2") {
    produs.tablaPlana = "mp";
  }
  return produs;
}

motRouter.get("/produse", async (req, res) => {
  const { q } = zod.object({ q: zod.string().trim().min(2).max(100) }).parse(req.query);
  const produse = await prisma.produs.findMany({
    where: {
      activ: true,
      moneda: "EUR",
      OR: [
        { denumire: { contains: q, mode: "insensitive" } },
        { codFurnizor: { contains: q, mode: "insensitive" } },
        { codIntern: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: [{ denumire: "asc" }],
    take: 40,
    include: includeProdus,
  });
  res.json({ produse: produse.map(spreProdusProba).filter((p): p is ProdusProba => p !== null) });
});

export function listeazaEtaloane(): { id: string; titlu: string; status: string }[] {
  if (!fs.existsSync(DIRECTOR_ETALON)) return [];
  return fs
    .readdirSync(DIRECTOR_ETALON)
    .filter((f) => /^E\d+\.json$/.test(f))
    .sort()
    .map((f) => {
      const e = JSON.parse(fs.readFileSync(path.join(DIRECTOR_ETALON, f), "utf8")) as FisierEtalon;
      return { id: e.id, titlu: e.titlu, status: e.status };
    });
}

motRouter.get("/etaloane", (_req, res) => {
  res.json({ etaloane: listeazaEtaloane() });
});

// catalogul din baza de date, pentru codurile unui etalon, in forma sincrona pe
// care o asteapta maparea (un cod poate avea mai multe produse: cod + denumire)
export async function catalogDinBaza(coduri: string[]): Promise<CatalogPentruEtalon & { produse: ProdusProba[] }> {
  const randuri = await prisma.produs.findMany({ where: { codFurnizor: { in: coduri }, activ: true }, include: includeProdus });
  const produse = randuri.map(spreProdusProba).filter((p): p is ProdusProba => p !== null);
  return {
    produse,
    gaseste(cod, denumire) {
      const gasit = produse.find((p) => p.cod === cod && p.denumire === denumire);
      if (gasit) return gasit;
      const variante = produse.filter((p) => p.cod === cod).map((p) => JSON.stringify(p.denumire));
      const detalii = variante.length === 0 ? "codul nu exista in catalog (sau nu are pret in lista activa)" : `denumiri in catalog: ${variante.join(" | ")}`;
      throw new Error(`Produs negasit in catalog: ${cod} ${JSON.stringify(denumire)} (${detalii})`);
    },
  };
}

motRouter.get("/etaloane/:id", async (req, res) => {
  const { id } = zod.object({ id: zod.string().regex(/^E\d{2}$/) }).parse(req.params);
  const cale = path.join(DIRECTOR_ETALON, `${id}.json`);
  if (!fs.existsSync(cale)) {
    res.status(404).json({ eroare: `Etalonul ${id} nu exista` });
    return;
  }
  const etalon = JSON.parse(fs.readFileSync(cale, "utf8")) as FisierEtalon;
  const catalog = await catalogDinBaza(coduriEtalon(etalon));
  let intrare: IntrareOferta;
  try {
    intrare = construiesteIntrare(etalon, catalog);
  } catch (e) {
    res.status(422).json({ eroare: e instanceof Error ? e.message : String(e) });
    return;
  }
  res.json({ etalon: { id: etalon.id, titlu: etalon.titlu, status: etalon.status }, intrare, asteptat: etalon.asteptat });
});

motRouter.post("/proba", (req, res) => {
  const intrare = schemaIntrareOferta.parse(req.body) as IntrareOferta;
  res.json({ rezultat: calculeazaOferta(intrare) });
});
