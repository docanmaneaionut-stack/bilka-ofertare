import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  CheieCuloare,
  IntrareOferta,
  Invelitoare,
  LinieOferta,
  PozitieLungime,
  RezultatOferta,
  TipCont,
  TipTinta,
} from "../../src/modules/mot/tipuri.js";
import { z } from "../../src/modules/mot/zecimal.js";
import { catalogCsv, type ProdusCatalog } from "./catalogCsv.js";

// Incarcatorul ofertelor-model: citeste docs/etalon/E*.json (format v1.1),
// construieste intrarea motorului (preturile de baza si latimile din CSV-urile
// catalogului) si traduce rezultatul motorului in forma blocului "asteptat",
// ca testul sa compare cifra cu cifra, ca text. Fisierele etalon sunt scrise de
// Claude chat si aprobate de Ionut: nu se modifica aici - ce nu se potriveste
// se raporteaza.

export const DIRECTOR_ETALON = fileURLToPath(new URL("../../../docs/etalon/", import.meta.url));

type Obiect = Record<string, unknown>;

interface PanotajEtalon {
  lungime_m: string;
  bucati: number;
}

interface InvelitoareEtalon {
  cod_bilka: string;
  rol?: string;
  varianta_profil?: string;
  culoare?: string;
  latime_totala_m: string;
  panotaj?: PanotajEtalon[];
  mp?: string;
}

interface LinieEtalon {
  rubrica: string;
  cod_bilka: string;
  denumire: string;
  um: string;
  cantitate: string;
  invelitoare?: string;
  culoare?: CheieCuloare;
  pret_fix_eur?: string;
  pret_fix?: { tip: string; valoare: string; normalizat_eur_fara_tva?: string };
  pachet?: string;
  cheie_culoare?: string;
}

interface IntrariEtalon {
  curs_bnr: string;
  tva_pct: number;
  adaos_cont_pct: string;
  grupa_pct: string;
  data_ofertei: string;
  cont: string;
  client: string;
  mod_prezentare: string;
  discount_general_pct?: string;
  discount_implicit_pct?: string;
  exceptii_discount?: Record<string, string>;
  tinta: { tip: string; valoare: string };
  completare_la?: string;
  motiv?: string;
  varianta_a?: string;
  invelitori?: InvelitoareEtalon[];
  accesorii_ml?: { cod_bilka: string; culoare?: string; lungime_m: string; bucati: number; ml: string }[];
  sipca?: {
    model: string;
    cod_bilka: string;
    culoare?: string;
    latime_sipca_mm: string;
    varianta: string;
    tronsoane: { lungime_sipca_m: string; lungime_tronson_m: string; distanta_mm: string; bucati_asteptat: number; ml_asteptat: string }[];
    bucati_total: number;
    ml_total: string;
  };
  zona_b?: { denumire: string; um: string; cantitate: string; suma_lei: string; contine_tva: boolean; preia_in_factura: boolean }[];
  linii: LinieEtalon[];
}

export interface FisierEtalon {
  id: string;
  titlu: string;
  status: string;
  format?: string;
  intrari: IntrariEtalon;
  asteptat: Obiect & { curs_achizitie: string; linii: Obiect[]; totaluri: Obiect };
  reguli: string;
}

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

const CONTURI: Record<string, TipCont> = {
  agent: "AGENT",
  colaborator: "COLABORATOR",
  administrator: "ADMINISTRATOR",
  "admin general": "ADMIN_GENERAL",
};

const TINTE: Record<string, TipTinta> = {
  total_cu_tva_lei: "total_cu_tva_lei",
  adaos_pct: "adaos_pct",
  adaos_pct_pastrat_din_varianta_de_baza: "adaos_pct_pastrat",
  adaos_pct_pastrat: "adaos_pct_pastrat",
};

function produsDinCatalog(p: ProdusCatalog, umEtalon?: string) {
  const produs: LinieOferta["produs"] = {
    cod: p.cod,
    denumire: p.denumire,
    um: umEtalon ?? p.um,
    pretBazaEur: p.pretEur,
  };
  if (p.finisaj) produs.finisaj = p.finisaj;
  if (p.grosime) produs.grosime = p.grosime;
  if (p.grup) produs.grup = p.grup;
  if (p.familie) produs.familie = p.familie;
  if (p.optiune) produs.optiune = p.optiune;
  return produs;
}

// tabla plana la mp nu are latime in CSV: FISA-OFERTARE 3.2 spune 1,25 m, iar
// catalogul o poarta in varianta ("1,25 × 2,00 m") - de acolo o ia apelantul
export function latimeTotalaDinCatalog(p: ProdusCatalog): string | undefined {
  if (p.latimeTotalaM) return p.latimeTotalaM;
  if (p.tablaPlana === "mp" && p.varianta) {
    const m = /^\s*(\d+(?:[.,]\d+)?)/.exec(p.varianta);
    if (m) return m[1];
  }
  return undefined;
}

// "1,2" din CSV si "1.20" din etalon sunt aceeasi latime; textul difera
function verificaEgalNumeric(ce: string, dinEtalon: string, dinCsv: string | undefined, context: string): string {
  if (dinCsv === undefined) throw new Error(`${context}: ${ce} lipseste din CSV`);
  if (!z(dinCsv).eq(z(dinEtalon))) {
    throw new Error(`${context}: ${ce} din etalon (${dinEtalon}) difera de CSV (${dinCsv}) - de raportat, nu de corectat`);
  }
  return z(dinCsv).toString();
}

function pozitii(p: PanotajEtalon[] | undefined): PozitieLungime[] {
  return (p ?? []).map((x) => ({ lungimeM: x.lungime_m, bucati: x.bucati }));
}

export function construiesteIntrare(etalon: FisierEtalon): IntrareOferta {
  const catalog = catalogCsv();
  const i = etalon.intrari;
  const ctx = `${etalon.id}`;

  const tipCont = CONTURI[i.cont.trim().toLowerCase()];
  if (!tipCont) throw new Error(`${ctx}: cont necunoscut "${i.cont}"`);
  const tipTinta = TINTE[i.tinta.tip];
  if (!tipTinta) throw new Error(`${ctx}: tip de tinta necunoscut "${i.tinta.tip}"`);
  const modPrezentare = i.mod_prezentare as IntrareOferta["modPrezentare"];
  if (!["simplu", "lista_discount_general", "discount_per_linie"].includes(modPrezentare)) {
    throw new Error(`${ctx}: mod de prezentare necunoscut "${i.mod_prezentare}"`);
  }

  // liniile
  const linii: LinieOferta[] = i.linii.map((l, idx) => {
    const p = catalog.gaseste(l.cod_bilka, l.denumire);
    const linie: LinieOferta = {
      id: `L${idx + 1}`,
      rubrica: l.rubrica,
      produs: produsDinCatalog(p, l.um),
      cantitate: l.cantitate,
    };
    if (l.invelitoare) linie.invelitoare = l.invelitoare;
    if (l.culoare) linie.culoare = { ...l.culoare };
    if (l.pret_fix) {
      if (l.pret_fix.tip !== "eur_fara_tva" && l.pret_fix.tip !== "achizitie_plus_pct") {
        throw new Error(`${ctx}: tip de pret fix necunoscut "${l.pret_fix.tip}" pe ${l.cod_bilka}`);
      }
      linie.pretFix = { tip: l.pret_fix.tip, valoare: l.pret_fix.valoare };
    } else if (l.pret_fix_eur) {
      linie.pretFix = { tip: "eur_fara_tva", valoare: l.pret_fix_eur };
    }
    const exceptie = i.exceptii_discount?.[l.cod_bilka];
    if (exceptie !== undefined) linie.discountPct = exceptie;
    const ml = (i.accesorii_ml ?? []).filter((a) => a.cod_bilka === l.cod_bilka);
    if (ml.length > 0) linie.pozitii = ml.map((a) => ({ lungimeM: a.lungime_m, bucati: a.bucati }));
    return linie;
  });

  // invelitorile: din blocul "invelitori" (panotaj) sau, cand lipseste, din
  // liniile rubricii "Invelitori" (suprafata directa)
  let invelitori: Invelitoare[];
  if (i.invelitori && i.invelitori.length > 0) {
    invelitori = i.invelitori.map((inv, idx) => {
      const linie = i.linii.find((l) => l.cod_bilka === inv.cod_bilka && l.rubrica === "Învelitori");
      if (!linie) throw new Error(`${ctx}: invelitoarea ${inv.cod_bilka} nu are linie in rubrica Invelitori`);
      const p = catalog.gaseste(inv.cod_bilka, linie.denumire);
      const latime = verificaEgalNumeric("latimea totala", inv.latime_totala_m, latimeTotalaDinCatalog(p), `${ctx} ${inv.cod_bilka}`);
      const rezultat: Invelitoare = {
        id: inv.cod_bilka,
        produs: produsDinCatalog(p, linie.um),
        rol: inv.rol ? (inv.rol.startsWith("principal") ? "principala" : "secundara") : idx === 0 ? "principala" : "secundara",
        latimeTotalaM: latime,
        panotaj: pozitii(inv.panotaj),
      };
      if (inv.culoare) rezultat.culoare = inv.culoare;
      if (inv.varianta_profil) rezultat.variantaProfil = inv.varianta_profil;
      if (!inv.panotaj || inv.panotaj.length === 0) rezultat.mpDirect = linie.cantitate;
      return rezultat;
    });
  } else {
    invelitori = i.linii
      .filter((l) => l.rubrica === "Învelitori")
      .map((l, idx) => {
        const p = catalog.gaseste(l.cod_bilka, l.denumire);
        const latime = latimeTotalaDinCatalog(p);
        if (!latime) throw new Error(`${ctx} ${l.cod_bilka}: latimea totala lipseste din CSV`);
        return {
          id: l.cod_bilka,
          produs: produsDinCatalog(p, l.um),
          rol: idx === 0 ? "principala" : "secundara",
          latimeTotalaM: z(latime).toString(),
          panotaj: [],
          mpDirect: l.cantitate,
        } satisfies Invelitoare;
      });
  }

  const intrare: IntrareOferta = {
    cursBnr: i.curs_bnr,
    tvaPct: i.tva_pct,
    cont: { tip: tipCont, adaosPct: i.adaos_cont_pct },
    grupaPct: i.grupa_pct || "0",
    tinta: { tip: tipTinta, valoare: i.tinta.valoare },
    modPrezentare,
    completare: Boolean(i.completare_la),
    invelitori,
    linii,
    zonaB: (i.zona_b ?? []).map((l) => ({
      denumire: l.denumire,
      um: l.um,
      cantitate: l.cantitate,
      sumaLei: l.suma_lei,
      contineTva: l.contine_tva,
      preiaInFactura: l.preia_in_factura,
    })),
  };
  if (i.discount_general_pct !== undefined) intrare.discountGeneralPct = i.discount_general_pct;
  if (i.discount_implicit_pct !== undefined) intrare.discountImplicitPct = i.discount_implicit_pct;

  if (i.sipca) {
    const s = i.sipca;
    const idxLinie = i.linii.findIndex((l) => l.cod_bilka === s.cod_bilka);
    if (idxLinie < 0) throw new Error(`${ctx}: sipca ${s.cod_bilka} nu are linie`);
    const p = catalog.gaseste(s.cod_bilka, i.linii[idxLinie].denumire);
    const latime = verificaEgalNumeric("latimea sipcii (mm)", s.latime_sipca_mm, p.latimeTotalaMm, `${ctx} ${s.cod_bilka}`);
    const varianta = s.varianta.trim().toLowerCase();
    intrare.sipca = {
      linieId: `L${idxLinie + 1}`,
      produsCod: s.cod_bilka,
      model: s.model,
      latimeSipcaMm: latime,
      varianta: varianta === "calcul" ? "calcul" : "comanda",
      tronsoane: s.tronsoane.map((t) => ({ lungimeSipcaM: t.lungime_sipca_m, lungimeTronsonM: t.lungime_tronson_m, distantaMm: t.distanta_mm })),
    };
    if (s.culoare) intrare.sipca.culoare = s.culoare;
  }

  return intrare;
}

export function incarcaEtalon(id: string): EtalonIncarcat {
  const etalon = citesteEtalon(id);
  return { id, fisier: `docs/etalon/${id}.json`, etalon, intrare: construiesteIntrare(etalon) };
}

// ------------------------------------------------------ rezultat -> asteptat

function faraNedefinite(o: Obiect): Obiect {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
}

// rezultatul motorului, in forma si cu numele de campuri ale blocului "asteptat"
export function spreAsteptat(rezultat: RezultatOferta, intrare: IntrareOferta): Obiect {
  const lista = intrare.modPrezentare === "lista_discount_general";
  const t = rezultat.totaluri;
  const linii = rezultat.linii.map((l) =>
    faraNedefinite({
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
      vanzari: {
        pret_vanzare_lei: rezultat.vanzari.pretVanzareLei,
        cost_achizitie_lei: rezultat.vanzari.costAchizitieLei,
        adaos_net_lei: rezultat.vanzari.adaosNetLei,
        adaos_brut_lei: rezultat.vanzari.adaosBrutLei,
      },
      total_lista_fara_tva_eur: t.totalListaFaraTvaEur,
      discount_general_eur: t.discountGeneralEur,
      achizitie_reala_lei_cu_tva: t.achizitieRealaLeiCuTva,
    }),
    abatere_eur: rezultat.abatereEur,
    comandabil: rezultat.comandabil.da,
    mp_invelitori: Object.fromEntries(rezultat.cantitati.invelitori.map((i) => [i.id, i.mp])),
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
  if (i.invelitori) a.invelitori = i.invelitori.map((inv) => ({ cod_bilka: inv.cod_bilka, mp: inv.mp }));
  if (i.accesorii_ml) a.accesorii_ml = i.accesorii_ml.map((m) => ({ cod_bilka: m.cod_bilka, ml: m.ml }));
  if (i.sipca) {
    a.sipca = {
      tronsoane: i.sipca.tronsoane.map((t) => ({ bucati: t.bucati_asteptat, ml: t.ml_asteptat })),
      bucati_total: i.sipca.bucati_total,
      ml_total: i.sipca.ml_total,
    };
  }
  if (i.linii.some((l) => l.pachet)) a.linii_pachet = i.linii.map((l) => ({ cod_bilka: l.cod_bilka, pachet: l.pachet ?? null }));
  return a;
}

export function obtinuteDinIntrari(rezultat: RezultatOferta, intrare: IntrareOferta, etalon: FisierEtalon): Obiect {
  const i = etalon.intrari;
  const o: Obiect = {};
  if (i.invelitori) {
    o.invelitori = rezultat.cantitati.invelitori.map((inv) => ({ cod_bilka: inv.id, mp: inv.mp }));
  }
  if (i.accesorii_ml) {
    o.accesorii_ml = rezultat.cantitati.accesoriiMl.map((m) => {
      const linie = intrare.linii.find((l) => l.id === m.linieId);
      return { cod_bilka: linie?.produs.cod ?? m.linieId, ml: m.ml };
    });
  }
  if (i.sipca) {
    const s = rezultat.cantitati.sipca;
    o.sipca = s
      ? { tronsoane: s.tronsoane.map((t) => ({ bucati: t.bucati, ml: t.ml })), bucati_total: s.bucatiTotal, ml_total: s.mlTotal }
      : null;
  }
  if (i.linii.some((l) => l.pachet)) o.linii_pachet = rezultat.linii.map((l) => ({ cod_bilka: l.cod, pachet: l.pachet ?? null }));
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
