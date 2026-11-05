import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../../db/prisma.js";
import { gasesteFormat } from "./formate/index.js";
import type { FisierCitit, ProdusImport } from "./tipuri.js";

// S17d: corectie de date cu jurnal - produsele marcate inactive in CSV-urile de import
// (coloana `activ` = nu) devin inactive si in baza, fara reimport (un reimport ar crea o
// versiune noua de preturi) si fara sa se stearga nimic. Idempotent: a doua rulare nu
// mai schimba nimic. Produsele active in CSV dar inactive in baza se raporteaza doar
// (reactivarea e decizia omului, prin import sau din catalog).

export const FOLDER_CSV_BILKA = fileURLToPath(new URL("../../../../docs/import/Bilka/", import.meta.url));

export interface ProdusSincronizat {
  codIntern: string;
  codFurnizor: string | null;
  denumire: string;
}

export interface RezultatSincronizareActiv {
  fisiere: string[];
  produseInCsv: number;
  inactiveInCsv: number;
  // dezactivate acum (sau care s-ar dezactiva, fara `aplica`)
  dezactivate: ProdusSincronizat[];
  // active in CSV, inactive in baza - doar raportate
  deActivatInCsv: ProdusSincronizat[];
  // inactive in CSV, dar inexistente in baza
  necunoscute: ProdusSincronizat[];
  aplicat: boolean;
}

export class EroareSincronizare extends Error {}

export async function sincronizeazaActiv(params: { compartiment?: string; folder?: string; utilizator: { id: string | null; nume: string }; aplica: boolean }): Promise<RezultatSincronizareActiv> {
  const denumireCompartiment = params.compartiment ?? "Bilka";
  const folder = params.folder ?? FOLDER_CSV_BILKA;
  const compartiment = await prisma.compartiment.findFirst({ where: { denumire: denumireCompartiment } });
  if (!compartiment) throw new EroareSincronizare(`Compartimentul „${denumireCompartiment}” nu există`);
  const format = gasesteFormat(compartiment.formatImport);
  if (!format) throw new EroareSincronizare(`Compartimentul „${denumireCompartiment}” nu are un format de import cunoscut`);
  const rubrici = (await prisma.categorieOferta.findMany()).map((c) => c.denumire);
  const ctx = { codScurtCompartiment: compartiment.codScurt, denumireCompartiment: compartiment.denumire, monedaCompartiment: compartiment.moneda, rubrici };

  const fisiere = fs
    .readdirSync(folder)
    .filter((f) => /\.csv$/i.test(f))
    .sort();
  const citite: FisierCitit[] = fisiere.map((f) => format.citesteFisier(f, fs.readFileSync(path.join(folder, f)), ctx));
  const erori = citite.flatMap((f) => f.probleme.filter((p) => p.nivel === "eroare"));
  if (erori.length > 0) throw new EroareSincronizare(`CSV-urile au erori: ${erori.map((e) => `${e.fisier ?? ""} ${e.mesaj}`).join("; ")}`);
  const produse: ProdusImport[] = citite.filter((f) => f.tip === "produse").flatMap((f) => f.produse);

  const existente = new Map((await prisma.produs.findMany({ where: { compartimentId: compartiment.id }, select: { id: true, codIntern: true, codFurnizor: true, denumire: true, activ: true } })).map((p) => [p.codIntern, p]));
  const rezultat: RezultatSincronizareActiv = { fisiere, produseInCsv: produse.length, inactiveInCsv: produse.filter((p) => !p.activ).length, dezactivate: [], deActivatInCsv: [], necunoscute: [], aplicat: params.aplica };

  for (const p of produse) {
    const e = existente.get(p.codIntern);
    const sumar = { codIntern: p.codIntern, codFurnizor: p.codFurnizor ?? null, denumire: p.denumire };
    if (!e) {
      if (!p.activ) rezultat.necunoscute.push(sumar);
      continue;
    }
    if (!p.activ && e.activ) {
      rezultat.dezactivate.push(sumar);
      if (params.aplica) {
        await prisma.$transaction([
          prisma.produs.update({ where: { id: e.id }, data: { activ: false } }),
          prisma.jurnalIntrare.create({
            data: { utilizatorId: params.utilizator.id, numeUtilizatorLaMoment: params.utilizator.nume, entitate: "Produs", entitateId: e.id, actiune: "corectie_date_activ", camp: "activ", valoareInainte: "true", valoareDupa: "false" },
          }),
        ]);
      }
    } else if (p.activ && !e.activ) {
      rezultat.deActivatInCsv.push(sumar);
    }
  }
  return rezultat;
}
