import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../../../db/prisma.js";
import { env } from "../../../env.js";
import type { OfertaCuProduse } from "../intrareMot.js";
import { randuriFormular } from "./continut.js";
import { citesteSablon, type Sablon } from "./sablon.js";

// M4 (S17d): randurile formularului Bilka pentru liniile unei oferte, date motorului
// la fiecare calcul (`randFormular` pe linie). Sablonul firmei se citeste o data si se
// tine in memorie cat nu se schimba fisierul; fara sablon la firma (sau sablon care nu
// se poate citi) nu se dau randuri - motorul lucreaza atunci ca la M3, iar generarea
// formularului raporteaza ea problema sablonului.

const cache = new Map<string, { mtimeMs: number; marime: number; sablon: Sablon }>();

export async function sablonDinCache(cale: string): Promise<Sablon> {
  const st = await fs.stat(cale);
  const gasit = cache.get(cale);
  if (gasit && gasit.mtimeMs === st.mtimeMs && gasit.marime === st.size) return gasit.sablon;
  const sablon = citesteSablon(await fs.readFile(cale));
  cache.set(cale, { mtimeMs: st.mtimeMs, marime: st.size, sablon });
  return sablon;
}

export async function randuriFormularOferta(o: OfertaCuProduse): Promise<Map<string, string>> {
  const fisier = o.firma?.sablonBilka;
  if (!fisier) return new Map();
  let sablon: Sablon;
  try {
    sablon = await sablonDinCache(path.resolve(env.dateDir, fisier));
  } catch {
    return new Map();
  }
  const corespondente = await prisma.corespondentaFormularBilka.findMany({ where: { activ: true }, select: { cheie: true, cuvant: true, numeFormular: true } });
  const ids = [...new Set(o.linii.map((l) => l.produsId).filter((x): x is string => Boolean(x)))];
  const produse = new Map((ids.length ? await prisma.produs.findMany({ where: { id: { in: ids } }, select: { id: true, modulCm: true, treapta: true } }) : []).map((p) => [p.id, { modulCm: p.modulCm?.toString() ?? null, treapta: p.treapta }]));
  return randuriFormular(sablon.harta, corespondente, o, produse);
}
