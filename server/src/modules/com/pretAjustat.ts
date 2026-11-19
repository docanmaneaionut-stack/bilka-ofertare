import type { Prisma } from "@prisma/client";
import type { RezultatOferta } from "../mot/tipuri.js";

// S26b (MODIFICAREA M5): ce e comun celor care CITESC pretul ajustat al unei comenzi - tabelul de
// comenzi, vanzarile, retururile, pagina ofertei. Rezultatul curent al comenzii = rezultatul ultimei
// ajustari de pret, altfel rezultatul salvat pe oferta la "Comandat" (care ramane neatins).
// Fara importuri din comenzi.ts (modulul e folosit de mai multe parti ale `com/` si de `ofe/oferte.ts`).

// ajustarile, fara rezultatul motorului (mare) - pentru randuri si liste
export const selectAjustare = { versiune: true, totalVechiLei: true, totalNouLei: true, totalVechiCuTvaEur: true, totalNouCuTvaEur: true, motiv: true, numeUtilizatorLaMoment: true, moment: true } satisfies Prisma.ComandaAjustarePretSelect;
export type AjustareScurta = Prisma.ComandaAjustarePretGetPayload<{ select: typeof selectAjustare }>;

export function ajustarePublica(a: AjustareScurta) {
  return { versiune: a.versiune, totalVechiLei: a.totalVechiLei.toFixed(2), totalNouLei: a.totalNouLei.toFixed(2), totalVechiCuTvaEur: a.totalVechiCuTvaEur.toFixed(2), totalNouCuTvaEur: a.totalNouCuTvaEur.toFixed(2), motiv: a.motiv, de: a.numeUtilizatorLaMoment, moment: a.moment };
}

// pentru asteriscul rosu si "Vezi istoric": ultima ajustare si pretul de la "Comandat"
export function pretAjustat(ajustari: AjustareScurta[]) {
  if (ajustari.length === 0) return null;
  const ordonate = [...ajustari].sort((a, b) => a.versiune - b.versiune);
  const ultima = ordonate[ordonate.length - 1];
  return { versiune: ultima.versiune, totalInitialLei: ordonate[0].totalVechiLei.toFixed(2), totalVechiLei: ultima.totalVechiLei.toFixed(2), motiv: ultima.motiv, de: ultima.numeUtilizatorLaMoment, la: ultima.moment };
}

// rezultatul curent: al ultimei ajustari (cea mai mare versiune), altfel cel de la "Comandat"
export function rezultatCurent(rezultatLaComandat: unknown, ajustari: { versiune: number; rezultatMotor: unknown }[] | undefined): RezultatOferta | null {
  const ultima = (ajustari ?? []).reduce<{ versiune: number; rezultatMotor: unknown } | null>((m, a) => (m === null || a.versiune > m.versiune ? a : m), null);
  return ((ultima?.rezultatMotor ?? rezultatLaComandat) as RezultatOferta | null) ?? null;
}

// ultima ajustare, cu rezultatul ei (include pentru interogarile care au nevoie de preturi)
export const includeUltimaAjustare = { orderBy: { versiune: "desc" as const }, take: 1 } satisfies Prisma.Comanda$ajustariPretArgs;
