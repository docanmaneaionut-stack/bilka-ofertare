import type { CheieCuloare, IntrareOferta, Invelitoare, LinieOferta, PozitieLungime, Sipca, TipCont, TipTinta } from "./tipuri.js";
import { z } from "./zecimal.js";

// Maparea unei oferte-model (docs/etalon/E*.json, format v1.3) in intrarea
// motorului. Nu stie de unde vine catalogul: in teste din CSV-urile Bilka, in
// ecranul "Calcul de proba" din baza de date (lista activa). Fisierele etalon
// sunt scrise de Claude chat si aprobate de Ionut - nu se modifica din cod; ce
// nu se potriveste se raporteaza.
// Format v1.3 (ETALON §0, M1): invelitorile si rubricile de sipca au id pe oferta
// (I1, I2 / S1, S2); orice linie legata - inclusiv linia invelitorii insesi -
// poarta `invelitoare` = id, linia de sipca poarta `sipca` = id; `nr` = pozitia.
// Legatura prin id e singurul drum: nu se cauta dupa cod (acelasi cod poate
// aparea de doua ori, in culori diferite - E12).

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
  id: string;
  cod_bilka: string;
  rol?: string;
  varianta_profil?: string;
  culoare?: string;
  latime_totala_m: string;
  panotaj?: PanotajEtalon[];
  mp?: string;
}

export interface LinieEtalon {
  nr?: number;
  rubrica: string;
  cod_bilka: string;
  denumire: string;
  um: string;
  cantitate: string;
  // id-ul invelitorii (pe liniile legate si pe linia invelitorii) sau al rubricii de sipca
  invelitoare?: string;
  sipca?: string;
  culoare?: CheieCuloare;
  pret_fix_eur?: string;
  pret_fix?: { tip: string; valoare: string; normalizat_eur_fara_tva?: string };
  pachet?: string;
  cheie_culoare?: string;
}

// o rubrica de sipca (cap. 8): la Calcul tronsoanele (cu bucatile si ml asteptate),
// la Comanda pozitiile (lungime x bucati)
export interface SipcaEtalon {
  id: string;
  model: string;
  cod_bilka: string;
  culoare?: string;
  finisaj?: string;
  grosime?: string;
  latime_sipca_mm: string;
  varianta: string;
  tronsoane?: { lungime_sipca_m: string; lungime_tronson_m: string; distanta_mm: string; bucati_asteptat: number; ml_asteptat: string }[];
  pozitii?: PanotajEtalon[];
  bucati_total: number;
  ml_total: string;
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
  sipci?: SipcaEtalon[];
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
    if (l.nr !== undefined && l.nr !== idx + 1) throw new Error(`${ctx}: linia de pe pozitia ${idx + 1} are nr ${l.nr}`);
    const p = catalog.gaseste(l.cod_bilka, l.denumire);
    const linie: LinieOferta = { id: `L${idx + 1}`, rubrica: l.rubrica, produs: produsDinCatalog(p, l.um), cantitate: l.cantitate };
    if (l.invelitoare) linie.invelitoare = l.invelitoare;
    if (l.sipca) linie.sipca = l.sipca;
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
  // liniile rubricii "Invelitori" (suprafata directa); linia invelitorii se
  // gaseste numai prin id (v1.3), niciodata dupa cod
  let invelitori: Invelitoare[];
  if (i.invelitori && i.invelitori.length > 0) {
    invelitori = i.invelitori.map((inv, idx) => {
      if (!inv.id) throw new Error(`${ctx}: invelitoarea ${inv.cod_bilka} nu are id (format v1.3)`);
      const liniile = i.linii.filter((l) => l.rubrica === "Învelitori" && l.invelitoare === inv.id);
      if (liniile.length !== 1) throw new Error(`${ctx}: invelitoarea ${inv.id} (${inv.cod_bilka}) are ${liniile.length} linii in rubrica Invelitori cu invelitoare = ${inv.id}; trebuie exact una`);
      const linie = liniile[0];
      if (linie.cod_bilka !== inv.cod_bilka) throw new Error(`${ctx}: linia invelitorii ${inv.id} are codul ${linie.cod_bilka}, blocul "invelitori" are ${inv.cod_bilka}`);
      const p = catalog.gaseste(inv.cod_bilka, linie.denumire);
      const latime = verificaEgalNumeric("latimea totala", inv.latime_totala_m, latimeTotalaDinCatalog(p), `${ctx} ${inv.id} ${inv.cod_bilka}`);
      const rezultat: Invelitoare = {
        id: inv.id,
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
        if (!l.invelitoare) throw new Error(`${ctx}: linia ${idx + 1} din rubrica Invelitori (${l.cod_bilka}) nu poarta id-ul invelitorii (format v1.3)`);
        const p = catalog.gaseste(l.cod_bilka, l.denumire);
        const latime = latimeTotalaDinCatalog(p);
        if (!latime) throw new Error(`${ctx} ${l.cod_bilka}: latimea totala lipseste din catalog`);
        return {
          id: l.invelitoare,
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

  // rubricile de sipca (v1.3): fiecare cu linia ei, legata prin `sipca` = id
  if (i.sipci && i.sipci.length > 0) {
    intrare.sipci = i.sipci.map((s) => {
      const liniile = i.linii.filter((l) => l.sipca === s.id);
      if (liniile.length !== 1) throw new Error(`${ctx}: rubrica de sipca ${s.id} (${s.cod_bilka}) are ${liniile.length} linii cu sipca = ${s.id}; trebuie exact una`);
      const linie = liniile[0];
      if (linie.cod_bilka !== s.cod_bilka) throw new Error(`${ctx}: linia rubricii de sipca ${s.id} are codul ${linie.cod_bilka}, blocul "sipci" are ${s.cod_bilka}`);
      const p = catalog.gaseste(s.cod_bilka, linie.denumire);
      const latime = verificaEgalNumeric("latimea sipcii (mm)", s.latime_sipca_mm, p.latimeTotalaMm, `${ctx} ${s.id} ${s.cod_bilka}`);
      const varianta = s.varianta.trim().toLowerCase();
      const sipca: Sipca = {
        id: s.id,
        produsCod: s.cod_bilka,
        model: s.model,
        latimeSipcaMm: latime,
        varianta: varianta === "calcul" ? "calcul" : "comanda",
      };
      if (s.culoare) sipca.culoare = s.culoare;
      if (sipca.varianta === "calcul") {
        sipca.tronsoane = (s.tronsoane ?? []).map((t) => ({ lungimeSipcaM: t.lungime_sipca_m, lungimeTronsonM: t.lungime_tronson_m, distantaMm: t.distanta_mm }));
      } else {
        sipca.pozitii = pozitii(s.pozitii);
      }
      return sipca;
    });
  }

  return intrare;
}
