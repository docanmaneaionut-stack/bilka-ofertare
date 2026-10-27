import type { CheieCuloare, IntrareOferta, Invelitoare, LinieOferta, PozitieLungime, TipCont, TipTinta } from "./tipuri.js";
import { z } from "./zecimal.js";

// Maparea unei oferte-model (docs/etalon/E*.json, format v1.2) in intrarea
// motorului. Nu stie de unde vine catalogul: in teste din CSV-urile Bilka, in
// ecranul "Calcul de proba" din baza de date (lista activa). Fisierele etalon
// sunt scrise de Claude chat si aprobate de Ionut - nu se modifica din cod; ce
// nu se potriveste se raporteaza.

export interface ProdusCatalogEtalon {
  cod: string;
  denumire: string;
  um: string;
  pretEur: string;
  finisaj?: string;
  grosime?: string;
  grup?: string;
  familie?: string;
  varianta?: string;
  optiune?: string;
  latimeTotalaM?: string;
  latimeTotalaMm?: string;
  tablaPlana?: "mp" | "coala";
}

export interface CatalogPentruEtalon {
  // cod Bilka + denumire exacta; lipsa = eroare cu detalii
  gaseste(cod: string, denumire: string): ProdusCatalogEtalon;
}

type Obiect = Record<string, unknown>;

export interface PanotajEtalon {
  lungime_m: string;
  bucati: number;
}

export interface InvelitoareEtalon {
  cod_bilka: string;
  rol?: string;
  varianta_profil?: string;
  culoare?: string;
  latime_totala_m: string;
  panotaj?: PanotajEtalon[];
  mp?: string;
}

export interface LinieEtalon {
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

export interface IntrariEtalon {
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

// coduri Bilka folosite de un etalon (pentru a incarca produsele dintr-o data)
export function coduriEtalon(etalon: FisierEtalon): string[] {
  return [...new Set(etalon.intrari.linii.map((l) => l.cod_bilka))];
}

// tabla plana la mp nu are latime in catalog: FISA-OFERTARE 3.2 spune 1,25 m, iar
// catalogul o poarta in varianta ("1,25 × 2,00 m") - de acolo o ia apelantul
export function latimeTotalaDinCatalog(p: ProdusCatalogEtalon): string | undefined {
  if (p.latimeTotalaM) return p.latimeTotalaM;
  if (p.tablaPlana === "mp" && p.varianta) {
    const m = /^\s*(\d+(?:[.,]\d+)?)/.exec(p.varianta);
    if (m) return m[1];
  }
  return undefined;
}

function produsDinCatalog(p: ProdusCatalogEtalon, umEtalon?: string): LinieOferta["produs"] {
  const produs: LinieOferta["produs"] = { cod: p.cod, denumire: p.denumire, um: umEtalon ?? p.um, pretBazaEur: p.pretEur };
  if (p.finisaj) produs.finisaj = p.finisaj;
  if (p.grosime) produs.grosime = p.grosime;
  if (p.grup) produs.grup = p.grup;
  if (p.familie) produs.familie = p.familie;
  if (p.optiune) produs.optiune = p.optiune;
  return produs;
}

// "1,2" din catalog si "1.20" din etalon sunt aceeasi latime; textul difera
function verificaEgalNumeric(ce: string, dinEtalon: string, dinCatalog: string | undefined, context: string): string {
  if (dinCatalog === undefined) throw new Error(`${context}: ${ce} lipseste din catalog`);
  if (!z(dinCatalog).eq(z(dinEtalon))) {
    throw new Error(`${context}: ${ce} din etalon (${dinEtalon}) difera de catalog (${dinCatalog}) - de raportat, nu de corectat`);
  }
  return z(dinCatalog).toString();
}

function pozitii(p: PanotajEtalon[] | undefined): PozitieLungime[] {
  return (p ?? []).map((x) => ({ lungimeM: x.lungime_m, bucati: x.bucati }));
}

export function construiesteIntrare(etalon: FisierEtalon, catalog: CatalogPentruEtalon): IntrareOferta {
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

  const linii: LinieOferta[] = i.linii.map((l, idx) => {
    const p = catalog.gaseste(l.cod_bilka, l.denumire);
    const linie: LinieOferta = { id: `L${idx + 1}`, rubrica: l.rubrica, produs: produsDinCatalog(p, l.um), cantitate: l.cantitate };
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
        if (!latime) throw new Error(`${ctx} ${l.cod_bilka}: latimea totala lipseste din catalog`);
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
