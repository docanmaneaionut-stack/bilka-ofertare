import { parse } from "csv-parse/sync";

export type RandCsv = Record<string, string>;

// CSV-urile noastre: UTF-8 cu BOM, separator ";", prima linie = antetul
export function citesteCsv(continut: Buffer): { coloane: string[]; randuri: RandCsv[] } {
  const inregistrari = parse(continut, {
    bom: true,
    delimiter: ";",
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as RandCsv[];
  const coloane = inregistrari.length > 0 ? Object.keys(inregistrari[0]) : coloaneDinAntet(continut);
  return { coloane, randuri: inregistrari };
}

function coloaneDinAntet(continut: Buffer): string[] {
  const text = continut.toString("utf8").replace(/^﻿/, "");
  const primaLinie = text.split(/\r?\n/)[0] ?? "";
  return primaLinie
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean);
}

export function text(v: string | undefined): string | null {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
}

// "1,18" si "7.37" -> numar; gol -> null; altceva -> NaN (eroare la apelant)
export function numar(v: string | undefined): number | null {
  const t = (v ?? "").trim();
  if (t === "") return null;
  const n = Number(t.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : Number.NaN;
}

export function intreg(v: string | undefined): number | null {
  const n = numar(v);
  if (n === null || Number.isNaN(n)) return n;
  return Math.trunc(n);
}

export function daNu(v: string | undefined): boolean | null {
  const t = (v ?? "").trim().toLowerCase();
  if (t === "" || t === "da") return true;
  if (t === "nu") return false;
  return null;
}
