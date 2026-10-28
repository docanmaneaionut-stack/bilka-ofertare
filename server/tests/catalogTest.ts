import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Utilizator } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";
import { CATEGORII_OFERTA_IMPLICITE } from "../src/modules/cat/categoriiImplicite.js";
import { analizeazaImport, type FisierIncarcat } from "../src/modules/imp/analiza.js";
import { confirmaImport } from "../src/modules/imp/aplicare.js";
import { activeazaLista } from "../src/modules/lp/liste.js";

// Catalogul Bilka real in baza de test: testele editorului de oferta au nevoie
// de produse reale (E01, E06, E11). Daca testul de import a rulat deja (npm test
// il ruleaza inainte, alfabetic), catalogul exista; altfel il importam aici din
// cele 14 CSV-uri, exact ca testul de import.

const FOLDER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../docs/import/Bilka");
const FISIERE = [
  "01-rezidential.csv",
  "02-auxiliare.csv",
  "03-04-pluvial.csv",
  "04b-pluvial-aluzinc.csv",
  "05-retro-faltuita.csv",
  "06-industrial.csv",
  "07-sipca-gard.csv",
  "08-accesorii-speciale-2ml.csv",
  "09-accesorii-speciale-ml.csv",
  "variante-profil.csv",
  "culori-finisaj-grosime.csv",
  "garantii-finisaj-grosime.csv",
  "liste-implicite-oferta.csv",
  "trepte-desfasurata.csv",
];

export async function asiguraCatalogBilka(admin: Utilizator): Promise<string> {
  for (const c of CATEGORII_OFERTA_IMPLICITE) {
    await prisma.categorieOferta.upsert({ where: { denumire: c.denumire }, update: {}, create: c });
  }
  let compartiment = await prisma.compartiment.findFirst({ where: { denumire: "Bilka" } });
  if (!compartiment) {
    compartiment = await prisma.compartiment.create({
      data: { denumire: "Bilka", codScurt: "BIL", tip: "FURNIZOR", moneda: "EUR", modPret: "LISTA_ACHIZITIE", formatImport: "bilka-v1" },
    });
  }
  const activa = await prisma.listaPret.findFirst({ where: { compartimentId: compartiment.id, status: "ACTIVA" } });
  const produse = await prisma.produs.count({ where: { compartimentId: compartiment.id } });
  if (activa && produse >= 3425) return compartiment.id;

  const fisiere: FisierIncarcat[] = FISIERE.map((nume) => ({ nume, continut: readFileSync(path.join(FOLDER, nume)) }));
  const propunere = await analizeazaImport({ compartimentId: compartiment.id, fisiere, utilizator: admin });
  const confirmata = await confirmaImport({ propunereId: propunere.id, denumire: "Bilka v10 (teste editor)", valabilaDeLa: new Date("2026-09-01"), utilizator: admin });
  const lista = await prisma.listaPret.findUniqueOrThrow({ where: { id: confirmata.listaPretId! } });
  if (lista.status !== "ACTIVA") await activeazaLista(lista.id, admin);
  return compartiment.id;
}

// produsul din catalog dupa cod Bilka + denumire (acelasi cod poate avea mai multe denumiri)
export async function produsDupaCod(cod: string, denumire?: string) {
  const produse = await prisma.produs.findMany({ where: { codFurnizor: cod, activ: true } });
  const gasit = denumire ? produse.find((p) => p.denumire === denumire) : produse[0];
  if (!gasit) throw new Error(`Produs negasit in catalogul de test: ${cod} ${denumire ?? ""} (${produse.map((p) => p.denumire).join(" | ")})`);
  return gasit;
}
