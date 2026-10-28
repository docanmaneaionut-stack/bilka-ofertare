import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { construiesteIntrare, type FisierEtalon } from "../../src/modules/mot/etalon.js";
import type { IntrareOferta, RandVanzari, RezultatOferta } from "../../src/modules/mot/tipuri.js";
import { catalogCsv } from "./catalogCsv.js";

export { latimeTotalaDinCatalog } from "../../src/modules/mot/etalon.js";
export type { FisierEtalon } from "../../src/modules/mot/etalon.js";

// Incarcatorul ofertelor-model pentru teste: citeste docs/etalon/E*.json, construieste
// intrarea motorului cu preturile de baza si latimile din CSV-urile catalogului
// (maparea e in src/modules/mot/etalon.ts, comuna cu ecranul "Calcul de proba") si
// traduce rezultatul motorului in forma blocului "asteptat", ca testul sa compare
// cifra cu cifra, ca text. Fisierele etalon nu se modifica aici - ce nu se
// potriveste se raporteaza.

export const DIRECTOR_ETALON = fileURLToPath(new URL("../../../docs/etalon/", import.meta.url));

type Obiect = Record<string, unknown>;

export interface EtalonIncarcat {
  id: string;
  fisier: string;
  etalon: FisierEtalon;
  intrare: IntrareOferta;
}

export function listeazaEtaloane(): string[] {
  return fs
    .readdirSync(DIRECTOR_ETALON)
    .filter((f) => /^E\d+\.json$/.test(f))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

export function citesteEtalon(id: string): FisierEtalon {
  const cale = path.join(DIRECTOR_ETALON, `${id}.json`);
  return JSON.parse(fs.readFileSync(cale, "utf8")) as FisierEtalon;
}

export function incarcaEtalon(id: string): EtalonIncarcat {
  const etalon = citesteEtalon(id);
  return { id, fisier: `docs/etalon/${id}.json`, etalon, intrare: construiesteIntrare(etalon, catalogCsv()) };
}

// ------------------------------------------------------ rezultat -> asteptat

function faraNedefinite(o: Obiect): Obiect {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
}

export function vanzariSpreAsteptat(v: RandVanzari): Obiect {
  return { pret_vanzare_lei: v.pretVanzareLei, cost_achizitie_lei: v.costAchizitieLei, adaos_net_lei: v.adaosNetLei, adaos_brut_lei: v.adaosBrutLei };
}

// rezultatul motorului, in forma si cu numele de campuri ale blocului "asteptat"
export function spreAsteptat(rezultat: RezultatOferta, intrare: IntrareOferta): Obiect {
  const lista = intrare.modPrezentare === "lista_discount_general";
  const t = rezultat.totaluri;
  const linii = rezultat.linii.map((l, idx) =>
    faraNedefinite({
      nr: idx + 1,
      cod_bilka: l.cod,
      cantitate: l.cantitate,
      baza_eur: l.bazaEur,
      achizitie_cont_eur: l.achizitieContEur,
      achizitie_cont_lei_cu_tva: l.achizitieContLeiCuTva,
      pret_document_eur: lista ? undefined : l.pretDocumentEur,
      valoare_eur: lista ? undefined : l.valoareEur,
      pret_lista_eur: l.pretListaEur,
      valoare_lista_eur: lista ? l.valoareEur : undefined,
      discount_pct: l.discountPct,
      pret_net_eur: l.pretNetEur,
    }),
  );
  const obtinut: Obiect = {
    curs_achizitie: rezultat.cursAchizitie,
    linii,
    totaluri: faraNedefinite({
      achizitie_cont_eur_fara_tva: t.achizitieContEurFaraTva,
      achizitie_cont_lei_fara_tva: t.achizitieContLeiFaraTva,
      achizitie_cont_lei_cu_tva: t.achizitieContLeiCuTva,
      tinta_lei_cu_tva: t.tintaLeiCuTva,
      adaos_real_pct: t.adaosRealPct,
      marja_lei: t.marjaLei,
      document_fara_tva_eur: t.documentFaraTvaEur,
      tva_eur: t.tvaEur,
      document_cu_tva_eur: t.documentCuTvaEur,
      document_total_lei: t.documentTotalLei,
      vanzari: vanzariSpreAsteptat(rezultat.vanzari),
      total_lista_fara_tva_eur: t.totalListaFaraTvaEur,
      discount_general_eur: t.discountGeneralEur,
      achizitie_reala_lei_cu_tva: t.achizitieRealaLeiCuTva,
    }),
    abatere_eur: rezultat.abatereEur,
    comandabil: rezultat.comandabil.da,
    mp_invelitori: Object.fromEntries(rezultat.cantitati.invelitori.map((i) => [i.id, i.mp])),
    sipci: Object.fromEntries(rezultat.cantitati.sipci.map((s) => [s.id, { bucati: s.bucatiTotal, ml: s.mlTotal }])),
    pachete: rezultat.pachete.map((p) => ({ pachet: p.nume, linii: p.linii.length, achizitie_eur: p.achizitieEur })),
    formulare_bilka: rezultat.formulareBilka.map((f) => ({ nr: f.nr })),
  };
  if (rezultat.zonaB) {
    const zb = rezultat.zonaB;
    obtinut.zona_b = {
      supliment: zb.supliment.map((s) => ({ denumire: s.denumire, suma_lei: s.sumaLei })),
      supliment_total_lei: zb.suplimentTotalLei,
      in_factura: zb.inFactura.map((f) => ({
        denumire: f.denumire,
        um: f.um,
        cantitate: f.cantitate,
        pret_unitar_lei_fara_tva: f.pretUnitarLeiFaraTva,
        lei_fara_tva: f.leiFaraTva,
        lei_cu_tva: f.leiCuTva,
        eur_fara_tva: f.eurFaraTva,
      })),
      tabel_facturare: {
        fara_tva_eur: zb.tabelFacturare.faraTvaEur,
        tva_eur: zb.tabelFacturare.tvaEur,
        cu_tva_eur: zb.tabelFacturare.cuTvaEur,
        total_lei: zb.tabelFacturare.totalLei,
      },
    };
  }
  return obtinut;
}

// valorile asteptate care stau in blocul "intrari" (cantitati derivate, pachete
// pe linii), in aceeasi forma pentru asteptat si pentru obtinut
export function asteptariDinIntrari(etalon: FisierEtalon): Obiect {
  const i = etalon.intrari;
  const a: Obiect = {};
  if (i.invelitori) a.invelitori = i.invelitori.map((inv) => ({ id: inv.id, mp: inv.mp }));
  if (i.accesorii_ml) a.accesorii_ml = i.accesorii_ml.map((m) => ({ cod_bilka: m.cod_bilka, ml: m.ml }));
  // v1.3: rubricile de sipca pe id; la Calcul se compara si fiecare tronson
  if (i.sipci) {
    a.sipci = i.sipci.map((s) => ({
      id: s.id,
      ...(s.tronsoane ? { tronsoane: s.tronsoane.map((t) => ({ bucati: t.bucati_asteptat, ml: t.ml_asteptat })) } : {}),
      bucati_total: s.bucati_total,
      ml_total: s.ml_total,
    }));
  }
  // v1.3: liniile pe pozitie (nr), codurile se pot repeta
  if (i.linii.some((l) => l.pachet)) a.linii_pachet = i.linii.map((l, idx) => ({ nr: idx + 1, cod_bilka: l.cod_bilka, pachet: l.pachet ?? null }));
  return a;
}

export function obtinuteDinIntrari(rezultat: RezultatOferta, intrare: IntrareOferta, etalon: FisierEtalon): Obiect {
  const i = etalon.intrari;
  const o: Obiect = {};
  if (i.invelitori) {
    o.invelitori = rezultat.cantitati.invelitori.map((inv) => ({ id: inv.id, mp: inv.mp }));
  }
  if (i.accesorii_ml) {
    o.accesorii_ml = rezultat.cantitati.accesoriiMl.map((m) => {
      const linie = intrare.linii.find((l) => l.id === m.linieId);
      return { cod_bilka: linie?.produs.cod ?? m.linieId, ml: m.ml };
    });
  }
  if (i.sipci) {
    o.sipci = rezultat.cantitati.sipci.map((s) => {
      const dinFisier = i.sipci?.find((x) => x.id === s.id);
      return {
        id: s.id,
        ...(dinFisier?.tronsoane ? { tronsoane: s.tronsoane.map((t) => ({ bucati: t.bucati, ml: t.ml })) } : {}),
        bucati_total: s.bucatiTotal,
        ml_total: s.mlTotal,
      };
    });
  }
  if (i.linii.some((l) => l.pachet)) o.linii_pachet = rezultat.linii.map((l, idx) => ({ nr: idx + 1, cod_bilka: l.cod, pachet: l.pachet ?? null }));
  return o;
}

// ------------------------------------------------------------- comparatia

export interface Diferenta {
  cale: string;
  asteptat: string;
  obtinut: string;
}

// chei cu text liber (explicatii), care nu se compara cifra cu cifra
const CHEI_NOTE = new Set(["nota", "nota_total_lei", "nota_comandabil", "garda", "continut", "regula", "format", "titlu", "status"]);

function caText(v: unknown): string {
  if (v === undefined) return "(lipsa)";
  if (v === null) return "null";
  if (typeof v === "string") return v.replace(/−/g, "-");
  return JSON.stringify(v);
}

// "−0.01 (restul nu se poate repartiza ...)" -> "-0.01"
function numarDinText(v: unknown): string {
  const t = caText(v);
  const m = /^-?\d+(\.\d+)?/.exec(t);
  return m ? m[0] : t;
}

export function compara(asteptat: unknown, obtinut: unknown, cale = "", diferente: Diferenta[] = []): Diferenta[] {
  if (Array.isArray(asteptat)) {
    if (!Array.isArray(obtinut)) {
      diferente.push({ cale, asteptat: `lista cu ${asteptat.length} elemente`, obtinut: caText(obtinut) });
      return diferente;
    }
    if (asteptat.length !== obtinut.length) {
      diferente.push({ cale: `${cale}.length`, asteptat: String(asteptat.length), obtinut: String(obtinut.length) });
    }
    asteptat.forEach((a, idx) => compara(a, obtinut[idx], `${cale}[${idx}]`, diferente));
    return diferente;
  }
  if (asteptat !== null && typeof asteptat === "object") {
    const o = obtinut !== null && typeof obtinut === "object" && !Array.isArray(obtinut) ? (obtinut as Obiect) : undefined;
    for (const [cheie, valoare] of Object.entries(asteptat as Obiect)) {
      if (CHEI_NOTE.has(cheie)) continue;
      const caleCheie = cale ? `${cale}.${cheie}` : cheie;
      if (cheie === "abatere_eur") {
        const a = numarDinText(valoare);
        const b = numarDinText(o?.[cheie]);
        if (a !== b) diferente.push({ cale: caleCheie, asteptat: a, obtinut: b });
        continue;
      }
      compara(valoare, o?.[cheie], caleCheie, diferente);
    }
    return diferente;
  }
  const a = caText(asteptat);
  const b = caText(obtinut);
  if (a !== b) diferente.push({ cale, asteptat: a, obtinut: b });
  return diferente;
}

export function raport(id: string, fisier: string, diferente: Diferenta[], maxim = 30): string {
  const latime = Math.max(6, ...diferente.slice(0, maxim).map((d) => d.cale.length));
  const randuri = diferente
    .slice(0, maxim)
    .map((d) => `  ${d.cale.padEnd(latime)} | asteptat ${d.asteptat.padStart(10)} | obtinut ${d.obtinut}`);
  const rest = diferente.length > maxim ? `\n  ... si inca ${diferente.length - maxim} diferente` : "";
  return `${id}: ${diferente.length} diferente fata de "asteptat" (${fisier})\n${randuri.join("\n")}${rest}`;
}
