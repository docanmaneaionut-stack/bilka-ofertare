import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";

// Cautarea fara diacritice (S25, BUG-10): aceeasi regula pe server si in web
// (web/src/lib/text.ts) - s / t cu virgula si cu sedila -> s / t, a / a cu caciula /
// circumflex -> a, i din i -> i, minuscule - aplicata si pe textul cautat si pe coloana
// comparata, deci "tigla iberic" gaseste "Țiglă metalică Iberic" si "ȚIGLĂ" gaseste "tigla".
// Pe server potrivirea se face in SQL cu translate() + lower() pe coloana (majusculele cu
// diacritice trec prin translate inainte de lower, ca sa nu depinda de setarea bazei) si
// intoarce id-urile potrivite; ruta filtreaza apoi cu Prisma pe acele id-uri. Textul
// cautat intra in SQL doar ca parametru, niciodata concatenat.

const DE_LA = "ȘŞȚŢĂÂÎșşțţăâî";
const LA = "SSTTAAIssttaai";
if (LA.length !== [...DE_LA].length) throw new Error("normalizare: listele de caractere nu au aceeasi lungime");
const HARTA: Record<string, string> = Object.fromEntries([...DE_LA].map((c, i) => [c, LA[i]]));

export function normalizeazaText(text: string): string {
  return text
    .replace(/[ȘŞȚŢĂÂÎșşțţăâî]/g, (c) => HARTA[c] ?? c)
    .toLowerCase()
    .trim();
}

// tabelele si coloanele in care se cauta (lista inchisa - identificatorii nu vin de la client)
const COLOANE_PERMISE: Record<string, string[]> = {
  produs: ["denumire"],
  client: ["nume", "localitate"],
  montator: ["nume", "localitate"],
  comanda: ["clientNume", "clientLocalitate", "montatorNume"],
};

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

// id-urile randurilor din `tabel` la care una din `coloane` contine textul, fara diacritice;
// toate cuvintele cautarii trebuie sa apara (in oricare coloana)
export async function idsCuTextul(tabel: keyof typeof COLOANE_PERMISE, coloane: string[], q: string): Promise<string[]> {
  const permise = COLOANE_PERMISE[tabel];
  const alese = coloane.filter((c) => permise.includes(c));
  if (alese.length === 0) throw new Error(`Coloane nepermise pentru ${tabel}: ${coloane.join(", ")}`);
  const cuvinte = normalizeazaText(q).split(/\s+/).filter(Boolean);
  if (cuvinte.length === 0) return [];
  const expresie = Prisma.join(
    alese.map((c) => Prisma.sql`coalesce(lower(translate(${Prisma.raw(`"${c}"`)}, ${DE_LA}, ${LA})), '')`),
    " || ' ' || ",
  );
  const conditii = Prisma.join(
    cuvinte.map((cuv) => Prisma.sql`(${expresie}) LIKE ${`%${escapeLike(cuv)}%`} ESCAPE '\\'`),
    " AND ",
  );
  const randuri = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT "id" FROM ${Prisma.raw(`"${tabel}"`)} WHERE ${conditii}`);
  return randuri.map((r) => r.id);
}
