import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { citesteCsv } from "../../src/modules/imp/csv.js";
import { la2, z } from "../../src/modules/mot/zecimal.js";

// Catalogul Bilka citit direct din CSV-urile de import (docs/import/Bilka/0*.csv),
// sursa preturilor de baza si a latimilor totale pentru testele etalon - nu din
// blocul "asteptat" al fisierelor etalon si nu din baza de date.
//
// Un cod Bilka poate avea mai multe randuri cu denumiri diferite (ex.
// BANDAETAT35 "– streasina" / "– coama", ARP25LUC060 convexa / concava), de
// aceea cautarea se face pe cod + denumire exacta.

export const DIRECTOR_CATALOG = fileURLToPath(new URL("../../../docs/import/Bilka/", import.meta.url));

// aceleasi reguli ca in cititorul de import (src/modules/imp/formate/bilkaV1.ts):
// tabla plana e un cod cu doua produse - la mp (invelitoare) si la coala de 2,5 mp
export const SUFIX_COALA = " – coală 1,25 × 2,00 m (2,5 mp)";
export const MP_PE_COALA = "2.5";

export interface ProdusCatalog {
  cod: string;
  denumire: string;
  um: string;
  pretEur: string;
  categorieOferta: string;
  finisaj?: string;
  grosime?: string;
  grup?: string;
  familie?: string;
  varianta?: string;
  optiune?: string;
  latimeTotalaM?: string;
  latimeTotalaMm?: string;
  tablaPlana?: "mp" | "coala";
  fisier: string;
}

export class CatalogCsv {
  private readonly peCod = new Map<string, ProdusCatalog[]>();
  readonly fisiere: string[] = [];

  constructor(director: string = DIRECTOR_CATALOG) {
    const nume = fs
      .readdirSync(director)
      .filter((f) => /^0\d.*\.csv$/i.test(f))
      .sort();
    for (const f of nume) {
      this.fisiere.push(f);
      const { randuri } = citesteCsv(fs.readFileSync(path.join(director, f)));
      for (const r of randuri) {
        const cod = (r.cod_furnizor ?? "").trim();
        if (!cod) continue;
        const baza: ProdusCatalog = {
          cod,
          denumire: (r.denumire ?? "").trim(),
          um: (r.um ?? "").trim(),
          pretEur: la2(r.pret_eur ?? "0"),
          categorieOferta: (r.categorie_oferta ?? "").trim(),
          fisier: f,
        };
        if (r.finisaj) baza.finisaj = r.finisaj.trim();
        if (r.grosime) baza.grosime = r.grosime.trim();
        if (r.grup) baza.grup = r.grup.trim();
        if (r.familie) baza.familie = r.familie.trim();
        if (r.varianta) baza.varianta = r.varianta.trim();
        if (r.optiune) baza.optiune = r.optiune.trim();
        if (r.latime_totala_m) baza.latimeTotalaM = r.latime_totala_m.trim();
        if (r.latime_totala_mm) baza.latimeTotalaMm = r.latime_totala_mm.trim();
        const esteTablaPlana = /coal/i.test(baza.categorieOferta);
        if (esteTablaPlana) baza.tablaPlana = "mp";
        this.adauga(baza);
        if (esteTablaPlana) {
          this.adauga({
            ...baza,
            denumire: baza.denumire + SUFIX_COALA,
            um: "BUC",
            pretEur: la2(z(baza.pretEur).times(MP_PE_COALA)),
            tablaPlana: "coala",
          });
        }
      }
    }
  }

  private adauga(p: ProdusCatalog): void {
    const lista = this.peCod.get(p.cod);
    if (lista) lista.push(p);
    else this.peCod.set(p.cod, [p]);
  }

  get numarProduse(): number {
    let n = 0;
    for (const l of this.peCod.values()) n += l.length;
    return n;
  }

  variante(cod: string): ProdusCatalog[] {
    return this.peCod.get(cod) ?? [];
  }

  // cod + denumire exacta; lipsa = eroare cu variantele existente, ca sa se
  // vada imediat ce nu se potriveste intre etalon si catalog
  gaseste(cod: string, denumire: string): ProdusCatalog {
    const variante = this.variante(cod);
    const gasit = variante.find((p) => p.denumire === denumire);
    if (gasit) return gasit;
    const detalii =
      variante.length === 0
        ? "codul nu exista in CSV-uri"
        : `denumiri in CSV: ${variante.map((p) => JSON.stringify(p.denumire)).join(" | ")}`;
    throw new Error(`Produs negasit in catalog: ${cod} ${JSON.stringify(denumire)} (${detalii})`);
  }
}

let instanta: CatalogCsv | undefined;

export function catalogCsv(): CatalogCsv {
  if (!instanta) instanta = new CatalogCsv();
  return instanta;
}
