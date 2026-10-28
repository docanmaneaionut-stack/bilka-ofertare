import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Prisma, PrismaClient } from "@prisma/client";

// Listele de optiuni configurabile (S14; FISA-OFERTARE cap. 2 - sursa clientului,
// cap. 2b - motivul completarii). Valorile initiale stau in
// docs/import/configurare/optiuni-liste.csv (lista;valoare;ordine;activ) si se
// incarca prin `npm run seed`, idempotent: se adauga doar valorile care lipsesc;
// nimic nu se rescrie si nimic nu se sterge din ce a modificat Admin general in
// Zona tehnica -> Referinte. Nu stau in migrari: restaurarea unui export cere o
// baza goala dupa migrari.

export const LISTE_OPTIUNI = ["motiv_completare", "sursa_client"] as const;
export type ListaOptiuni = (typeof LISTE_OPTIUNI)[number];

export const CALE_CSV_OPTIUNI = fileURLToPath(new URL("../../../../docs/import/configurare/optiuni-liste.csv", import.meta.url));

export interface RandOptiune {
  lista: string;
  valoare: string;
  ordine: number;
  activ: boolean;
}

export function citesteCsvOptiuni(cale = CALE_CSV_OPTIUNI): RandOptiune[] {
  const text = fs.readFileSync(cale, "utf8").replace(/^﻿/, "");
  const randuri = text.split(/\r?\n/).filter((r) => r.trim() !== "");
  const antet = randuri[0]?.split(";").map((c) => c.trim());
  const idx = (nume: string) => {
    const i = antet?.indexOf(nume) ?? -1;
    if (i < 0) throw new Error(`${path.basename(cale)}: lipseste coloana "${nume}" (asteptat: lista;valoare;ordine;activ)`);
    return i;
  };
  const iLista = idx("lista");
  const iValoare = idx("valoare");
  const iOrdine = idx("ordine");
  const iActiv = idx("activ");
  return randuri.slice(1).map((r, k) => {
    const c = r.split(";").map((x) => x.trim());
    const lista = c[iLista] ?? "";
    const valoare = c[iValoare] ?? "";
    if (!lista || !valoare) throw new Error(`${path.basename(cale)} randul ${k + 2}: lista si valoarea sunt obligatorii`);
    const ordine = Number(c[iOrdine] ?? "0");
    return { lista, valoare, ordine: Number.isFinite(ordine) ? ordine : 0, activ: !/^(nu|0|false)$/i.test(c[iActiv] ?? "da") };
  });
}

type Client = PrismaClient | Prisma.TransactionClient;

// adauga doar ce lipseste (cheia: lista + valoare); intoarce cate randuri a adaugat
export async function incarcaOptiuniListe(prisma: Client, randuri: RandOptiune[] = citesteCsvOptiuni()): Promise<number> {
  let adaugate = 0;
  for (const r of randuri) {
    const existent = await prisma.optiuneLista.findUnique({ where: { lista_valoare: { lista: r.lista, valoare: r.valoare } } });
    if (existent) continue;
    await prisma.optiuneLista.create({ data: r });
    adaugate += 1;
  }
  return adaugate;
}

// valorile active ale unei liste, in ordine (pentru ecrane)
export async function optiunileListei(prisma: Client, lista: string): Promise<{ valoare: string; ordine: number }[]> {
  const randuri = await prisma.optiuneLista.findMany({ where: { lista, activ: true }, orderBy: [{ ordine: "asc" }, { valoare: "asc" }], select: { valoare: true, ordine: true } });
  return randuri;
}
