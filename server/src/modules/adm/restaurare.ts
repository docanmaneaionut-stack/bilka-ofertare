import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import type { PrismaClient } from "@prisma/client";
import { coloaneModel, FORMAT_EXPORT, MODELE_EXPORT, numeTabel } from "./exportDate.js";

// Restaurarea unui export "descarca tot": numai pe o baza goala, cu
// migrarile aplicate. Accepta un ZIP din aceeasi versiune a formatului sau
// una mai veche (coloanele nou aparute primesc valorile implicite din schema)
// si refuza unul mai nou. Pastreaza id-urile originale.

const MARIME_LOT = 500;

export class EroareRestaurare extends Error {}

function citesteCsv(continut: Buffer): Record<string, string>[] {
  return parse(continut, { bom: true, delimiter: ";", columns: true, skip_empty_lines: true, relax_column_count: true }) as Record<string, string>[];
}

function dinCsv(valoare: string, camp: { type: string; isRequired: boolean; kind: string }): unknown {
  if (valoare === "" || valoare === undefined) {
    if (!camp.isRequired) return null;
    if (camp.type === "String") return "";
    return null;
  }
  switch (camp.type) {
    case "Int":
      return Number.parseInt(valoare, 10);
    case "Float":
      return Number(valoare);
    case "Decimal":
      return valoare;
    case "Boolean":
      return valoare === "true";
    case "DateTime":
      return new Date(valoare);
    case "Json":
      return JSON.parse(valoare);
    default:
      return valoare;
  }
}

function loturi<T>(lista: T[], marime = MARIME_LOT): T[][] {
  const r: T[][] = [];
  for (let i = 0; i < lista.length; i += marime) r.push(lista.slice(i, i + marime));
  return r;
}

export type RaportRestaurare = { format: number; versiuneSoft: string; numaratori: Record<string, number>; fisiere: number; avertizari: string[] };

export async function restaureaza(prisma: PrismaClient, caleZip: string, dateDir: string): Promise<RaportRestaurare> {
  const zip = new AdmZip(caleZip);
  const readme = zip.getEntry("README.md");
  if (!readme) throw new EroareRestaurare("ZIP-ul nu e un export „descarcă tot” (lipsește README.md)");
  const textReadme = readme.getData().toString("utf8");
  const format = Number(/Format export:\s*(\d+)/.exec(textReadme)?.[1] ?? "0");
  const versiuneSoft = /Versiune soft:\s*(\S+)/.exec(textReadme)?.[1] ?? "?";
  if (!format) throw new EroareRestaurare("README-ul nu conține versiunea formatului de export");
  if (format > FORMAT_EXPORT) throw new EroareRestaurare(`Exportul e dintr-o versiune mai nouă a softului (format ${format} > ${FORMAT_EXPORT}); actualizează softul întâi`);

  // baza trebuie sa fie goala
  for (const model of MODELE_EXPORT) {
    const cheie = model.charAt(0).toLowerCase() + model.slice(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const n = (await (prisma as any)[cheie].count()) as number;
    if (n > 0) throw new EroareRestaurare(`Baza nu e goală: tabelul ${numeTabel(model)} are ${n} rânduri. Restaurarea se face numai pe o bază goală.`);
  }

  const avertizari: string[] = [];
  const numaratori: Record<string, number> = {};
  const randuriDe = (model: string) => {
    const intrare = zip.getEntry(`date/${numeTabel(model)}.csv`);
    if (!intrare) {
      avertizari.push(`Lipsește date/${numeTabel(model)}.csv (export mai vechi?) — tabelul rămâne gol`);
      return [];
    }
    const coloane = coloaneModel(model);
    const brute = citesteCsv(intrare.getData());
    const necunoscute = brute.length ? Object.keys(brute[0]).filter((k) => !coloane.some((c) => c.name === k)) : [];
    if (necunoscute.length) avertizari.push(`${numeTabel(model)}: coloane necunoscute ignorate: ${necunoscute.join(", ")}`);
    return brute.map((r) => {
      const obiect: Record<string, unknown> = {};
      for (const c of coloane) {
        if (!(c.name in r)) continue; // coloana noua fata de export -> valoarea implicita din schema
        obiect[c.name] = dinCsv(r[c.name], c);
      }
      return obiect;
    });
  };

  const parole = new Map<string, string>();
  const intrareParole = zip.getEntry("_sistem/parole.csv");
  if (intrareParole) for (const r of citesteCsv(intrareParole.getData())) parole.set(r.id, r.parolaHash);
  else avertizari.push("Lipsește _sistem/parole.csv: conturile restaurate primesc o parolă de nefolosit și trebuie resetate");

  await prisma.$transaction(
    async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = tx as any;
      for (const model of MODELE_EXPORT) {
        const cheie = model.charAt(0).toLowerCase() + model.slice(1);
        let randuri = randuriDe(model);
        numaratori[numeTabel(model)] = randuri.length;
        if (randuri.length === 0) continue;

        if (model === "Utilizator") {
          // parola din _sistem, apoi legatura administrator -> subordonat (auto-referinta)
          const legaturi = randuri.filter((r) => r.administratorId).map((r) => ({ id: r.id as string, administratorId: r.administratorId as string }));
          randuri = randuri.map((r) => ({
            ...r,
            administratorId: null,
            parolaHash: parole.get(r.id as string) ?? `restaurat-fara-parola-${r.id}`,
            parolaTrebuieSchimbata: parole.has(r.id as string) ? r.parolaTrebuieSchimbata : true,
          }));
          for (const lot of loturi(randuri)) await t.utilizator.createMany({ data: lot });
          for (const l of legaturi) await t.utilizator.update({ where: { id: l.id }, data: { administratorId: l.administratorId } });
          continue;
        }

        if (model === "ListaPret") {
          // statusul se pune dupa preturi: trigger-ul refuza preturi intr-o lista deja ARHIVATA
          const statusuri = randuri.map((r) => ({ id: r.id as string, status: r.status as string }));
          for (const lot of loturi(randuri.map((r) => ({ ...r, status: "SCHITA" })))) await t.listaPret.createMany({ data: lot });
          (restaureaza as unknown as { statusuri?: typeof statusuri }).statusuri = statusuri;
          continue;
        }

        for (const lot of loturi(randuri)) await t[cheie].createMany({ data: lot });

        if (model === "PretListaProdus") {
          const statusuri = (restaureaza as unknown as { statusuri?: { id: string; status: string }[] }).statusuri ?? [];
          for (const s of statusuri) if (s.status !== "SCHITA") await t.listaPret.update({ where: { id: s.id }, data: { status: s.status } });
        }
      }
    },
    { timeout: 600_000, maxWait: 30_000 },
  );

  // fisierele din folderul de date
  let fisiere = 0;
  for (const intrare of zip.getEntries()) {
    if (intrare.isDirectory || !intrare.entryName.startsWith("fisiere/")) continue;
    const relativ = intrare.entryName.slice("fisiere/".length);
    const cale = path.join(dateDir, ...relativ.split("/"));
    await mkdir(path.dirname(cale), { recursive: true });
    await writeFile(cale, intrare.getData());
    fisiere += 1;
  }

  return { format, versiuneSoft, numaratori, fisiere, avertizari };
}
