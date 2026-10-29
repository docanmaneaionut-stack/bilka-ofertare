import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PrismaClient } from "@prisma/client";

// Tabela de corespondenta produs -> numele de pe formularul de comanda Bilka
// (S16b, docs/FORMULAR-BILKA-HARTA.md §5): valorile initiale stau in
// docs/import/configurare/corespondenta-formular-bilka.csv
// (furnizor;cheie;cuvant;nume_formular;stare;observatie) si se incarca prin
// `npm run seed`, idempotent: se adauga doar randurile care lipsesc (dupa
// furnizor + cheie + cuvant); ce a modificat Admin general in Zona tehnica ->
// Referinte ramane. Starea: "automat" (potrivire sigura) / "de_verificat"
// (hotarata de Code la S16b, de controlat de Ionut).

export const CALE_CSV_CORESPONDENTA = fileURLToPath(new URL("../../../../docs/import/configurare/corespondenta-formular-bilka.csv", import.meta.url));

export interface RandCorespondenta {
  furnizor: string;
  cheie: string;
  cuvant: string;
  numeFormular: string;
  stare: string;
  observatie: string | null;
}

export function citesteCsvCorespondenta(cale = CALE_CSV_CORESPONDENTA): RandCorespondenta[] {
  const text = fs.readFileSync(cale, "utf8").replace(/^﻿/, "");
  const randuri = text.split(/\r?\n/).filter((r) => r.trim() !== "");
  const antet = randuri[0]?.split(";").map((c) => c.trim());
  const idx = (nume: string) => {
    const i = antet?.indexOf(nume) ?? -1;
    if (i < 0) throw new Error(`${path.basename(cale)}: lipseste coloana "${nume}" (asteptat: furnizor;cheie;cuvant;nume_formular;stare;observatie)`);
    return i;
  };
  const iFurnizor = idx("furnizor");
  const iCheie = idx("cheie");
  const iCuvant = idx("cuvant");
  const iNume = idx("nume_formular");
  const iStare = idx("stare");
  const iObs = idx("observatie");
  return randuri.slice(1).map((r, k) => {
    const c = r.split(";").map((x) => x.trim());
    const cheie = c[iCheie] ?? "";
    const nume = c[iNume] ?? "";
    if (!cheie || !nume) throw new Error(`${path.basename(cale)}: randul ${k + 2} nu are cheie sau nume`);
    const stare = c[iStare] || "automat";
    if (stare !== "automat" && stare !== "de_verificat") throw new Error(`${path.basename(cale)}: randul ${k + 2}: starea trebuie sa fie "automat" sau "de_verificat"`);
    return { furnizor: c[iFurnizor] || "Bilka", cheie, cuvant: c[iCuvant] ?? "", numeFormular: nume, stare, observatie: c[iObs] || null };
  });
}

type Client = Pick<PrismaClient, "corespondentaFormularBilka">;

export async function incarcaCorespondentaFormularBilka(prisma: Client, randuri: RandCorespondenta[] = citesteCsvCorespondenta()): Promise<number> {
  let adaugate = 0;
  for (const r of randuri) {
    const existent = await prisma.corespondentaFormularBilka.findUnique({ where: { furnizor_cheie_cuvant: { furnizor: r.furnizor, cheie: r.cheie, cuvant: r.cuvant } } });
    if (existent) continue;
    await prisma.corespondentaFormularBilka.create({ data: r });
    adaugate += 1;
  }
  return adaugate;
}
