import { createWriteStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";


// archiver 7 (CommonJS, API-ul clasic); versiunea 8 e un rescris cu alt API
import archiver from "archiver";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { env } from "../../env.js";

// Export "descarca tot" (fisa CONTURI §8.4, ARH §6 / §9): un ZIP cu cate un
// CSV per tabel, tot folderul de date al serverului si un README cu data,
// versiunea si numaratorile. Coloanele vin din schema Prisma (DMMF), deci un
// tabel nou intra automat in export cand e adaugat in lista de mai jos.

// 2 (S17a): tabelele ofertarii (clienti, oferte si copiii lor, documente, comenzi,
// cursuri, montatori) si exportul de firma pentru Administratori
export const FORMAT_EXPORT = 2;

// ordinea = ordinea de restaurare (parintii inaintea copiilor)
export const MODELE_EXPORT = [
  "Firma",
  "Utilizator",
  "UtilizatorFirma",
  "Compartiment",
  "CategorieOferta",
  "Grup",
  "Familie",
  "Produs",
  "ListaPret",
  "PretListaProdus",
  "VariantaProfil",
  "CuloareFinisajGrosime",
  "GarantieFinisajGrosime",
  "ListaImplicitaOferta",
  "TreaptaDesfasurata",
  "OptiuneLista",
  "CorespondentaFormularBilka",
  // S17a: ofertarea (parintii inaintea copiilor; Oferta are doua legaturi catre ea
  // insasi - completareLaId, preluataDinId - restaurate in doi pasi)
  "Client",
  "CursValutar",
  "ContorSerie",
  "Montator",
  "Oferta",
  "OfertaInvelitoare",
  "OfertaLinie",
  "OfertaPozitie",
  "OfertaSipca",
  "OfertaTronson",
  "OfertaZonaB",
  "OfertaIstoric",
  "OfertaAtasament",
  "OfertaNotita",
  "OfertaDocument",
  "Comanda",
  "ImportPropunere",
  "JurnalIntrare",
  "JurnalAutentificare",
] as const;

// coloane excluse din CSV-urile de date (parolele merg separat; randurile
// brute ale importurilor sunt mari si au fisierele pe disc)
const COLOANE_EXCLUSE: Record<string, string[]> = {
  Utilizator: ["parolaHash"],
  ImportPropunere: ["randuri"],
};

export type ModelExport = (typeof MODELE_EXPORT)[number];

// exportul de firma (Administrator, fisa CONTURI §8.4, S17a): doar datele firmei lui -
// firma, utilizatorii ei, jurnalul lor, clientii si montatorii ofertelor ei, ofertele
// cu copiii lor, documentele, comenzile - plus tabelele comune fara secrete
// (catalog, referinte, cursuri, contoare); fara parole, fara propunerile de import
// si jurnalul de autentificare; din fisiere doar ale firmei
const FARA_IN_EXPORTUL_DE_FIRMA: ModelExport[] = ["ImportPropunere", "JurnalAutentificare"];

function filtruFirma(model: ModelExport, firmaId: string): Record<string, unknown> | null {
  const oferta = { oferta: { firmaId } };
  switch (model) {
    case "Firma":
      return { id: firmaId };
    case "Utilizator":
    case "UtilizatorFirma":
    case "Oferta":
    case "Comanda":
      return { firmaId };
    case "JurnalIntrare":
    case "Montator":
      return { utilizator: { firmaId } };
    case "Client":
      return { oferte: { some: { firmaId } } };
    case "OfertaInvelitoare":
    case "OfertaLinie":
    case "OfertaSipca":
    case "OfertaZonaB":
    case "OfertaIstoric":
    case "OfertaAtasament":
    case "OfertaNotita":
    case "OfertaDocument":
      return oferta;
    case "OfertaPozitie":
      return { OR: [{ invelitoare: oferta }, { linie: oferta }] };
    case "OfertaTronson":
      return { sipca: oferta };
    default:
      return null;
  }
}

export interface OptiuniExport {
  // exportul de firma: doar datele firmei date (Administrator)
  firmaId?: string;
}

export function modelDmmf(nume: string) {
  const m = Prisma.dmmf.datamodel.models.find((x) => x.name === nume);
  if (!m) throw new Error(`Model necunoscut: ${nume}`);
  return m;
}

export function coloaneModel(nume: string) {
  const excluse = COLOANE_EXCLUSE[nume] ?? [];
  return modelDmmf(nume).fields.filter((f) => (f.kind === "scalar" || f.kind === "enum") && !excluse.includes(f.name));
}

export function numeTabel(nume: string) {
  return modelDmmf(nume).dbName ?? nume;
}

function delegat(nume: string) {
  const cheie = nume.charAt(0).toLowerCase() + nume.slice(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any)[cheie] as { findMany: (a?: unknown) => Promise<Record<string, unknown>[]>; count: () => Promise<number> };
}

function laCsv(v: unknown, tip: string): string {
  if (v === null || v === undefined) return "";
  if (tip === "Json") return JSON.stringify(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object" && "toString" in (v as object)) return String(v);
  return String(v);
}

export function campCsv(s: string): string {
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function randuriLaCsv(coloane: { name: string; type: string }[], randuri: Record<string, unknown>[]): string {
  const linii = [coloane.map((c) => c.name).join(";")];
  for (const r of randuri) linii.push(coloane.map((c) => campCsv(laCsv(r[c.name], c.type))).join(";"));
  return "﻿" + linii.join("\r\n") + "\r\n";
}

async function fisiereDin(folder: string, baza = folder): Promise<string[]> {
  let intrari: string[] = [];
  try {
    intrari = await readdir(folder);
  } catch {
    return [];
  }
  const rezultat: string[] = [];
  for (const i of intrari) {
    // fisierele de lucru (ex. un export in curs) nu fac parte din date
    if (i.startsWith("_temp")) continue;
    const cale = path.join(folder, i);
    const s = await stat(cale);
    if (s.isDirectory()) rezultat.push(...(await fisiereDin(cale, baza)));
    else rezultat.push(path.relative(baza, cale));
  }
  return rezultat;
}

export async function versiuneSoft(): Promise<string> {
  try {
    const { readFile } = await import("node:fs/promises");
    const pkg = JSON.parse(await readFile(path.resolve(process.cwd(), "package.json"), "utf8"));
    return String(pkg.version ?? "0");
  } catch {
    return "0";
  }
}

// scrie ZIP-ul in fisierul dat; intoarce numaratorile
export async function scrieExport(caleZip: string, optiuni: OptiuniExport = {}): Promise<{ numaratori: Record<string, number>; fisiere: number }> {
  const numaratori: Record<string, number> = {};
  const firmaId = optiuni.firmaId;
  const firma = firmaId ? await prisma.firma.findUniqueOrThrow({ where: { id: firmaId }, select: { denumire: true } }) : null;
  const arhiva = archiver("zip", { zlib: { level: 6 } });
  const iesire = createWriteStream(caleZip);
  const gata = new Promise<void>((resolve, reject) => {
    iesire.on("close", () => resolve());
    iesire.on("error", reject);
    arhiva.on("error", reject);
  });
  arhiva.pipe(iesire);

  for (const model of MODELE_EXPORT) {
    if (firmaId && FARA_IN_EXPORTUL_DE_FIRMA.includes(model)) continue;
    const coloane = coloaneModel(model);
    const where = firmaId ? (filtruFirma(model, firmaId) ?? undefined) : undefined;
    const randuri = await delegat(model).findMany({ where, orderBy: coloaneModel(model).some((c) => c.name === "createdAt") ? { createdAt: "asc" } : undefined });
    numaratori[numeTabel(model)] = randuri.length;
    arhiva.append(randuriLaCsv(coloane, randuri), { name: `date/${numeTabel(model)}.csv` });
  }

  // hash-urile parolelor (nu parole): doar pentru restaurare - nu in exportul de firma
  if (!firmaId) {
    const parole = await prisma.utilizator.findMany({ select: { id: true, parolaHash: true } });
    arhiva.append(randuriLaCsv([{ name: "id", type: "String" }, { name: "parolaHash", type: "String" }], parole), { name: "_sistem/parole.csv" });
  }

  let fisiere = await fisiereDin(env.dateDir);
  if (firmaId) {
    // doar fisierele firmei: sigla, sablonul Bilka, documentele si atasamentele ofertelor ei
    const oferte = new Set((await prisma.oferta.findMany({ where: { firmaId }, select: { id: true } })).map((o) => o.id));
    fisiere = fisiere.filter((f) => {
      const parti = f.split(path.sep);
      if (parti[0] === "sigle" || parti[0] === "sabloane-bilka") return parti[1]?.startsWith(firmaId) ?? false;
      if (parti[0] === "oferte") return oferte.has(parti[1] ?? "");
      return false;
    });
  }
  for (const f of fisiere) arhiva.file(path.join(env.dateDir, f), { name: `fisiere/${f.split(path.sep).join("/")}` });

  const data = new Date();
  const readme = [
    "# Export „descarcă tot” — Ofertare",
    "",
    `Data: ${data.toISOString()}`,
    `Format export: ${FORMAT_EXPORT}`,
    `Versiune soft: ${await versiuneSoft()}`,
    `Tip export: ${firma ? `firmă (${firma.denumire})` : "complet"}`,
    "",
    "## Conținut",
    "",
    "- `date/<tabel>.csv` — câte un fișier per tabel (UTF-8 cu BOM, separator „;”, prima linie = coloanele). `utilizator.csv` e fără parole.",
    "- `_sistem/parole.csv` — hash-urile parolelor (nu parole; nu se pot inversa), folosite doar la restaurare.",
    "- `fisiere/` — folderul de date al serverului: siglele firmelor, șabloanele formularului Bilka, documentele generate și atașamentele ofertelor, fișierele brute ale importurilor (sursa versiunilor de preț).",
    ...(firma ? ["", `Export de firmă (${firma.denumire}): doar datele firmei, fără parole, fără propunerile de import și jurnalul de autentificare; din fișiere doar ale firmei. Nu se restaurează cu npm run restore (restaurarea cere exportul complet).`] : []),
    "",
    "## Numărători",
    "",
    ...Object.entries(numaratori).map(([t, n]) => `- ${t}: ${n}`),
    `- fișiere: ${fisiere.length}`,
    "",
    "## Restaurare",
    "",
    "Pe o bază goală, după migrări: `npm run restore -- <cale către zip>` (în `server/`). Acceptă un export din aceeași versiune sau una mai veche a softului; refuză unul mai nou.",
    "",
  ].join("\n");
  arhiva.append(readme, { name: "README.md" });

  await arhiva.finalize();
  await gata;
  return { numaratori, fisiere: fisiere.length };
}
