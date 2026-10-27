import { z as zod } from "zod";
import type { Suma } from "./zecimal.js";

// Tipurile motorului de calcul (MOT): oferta ca date la intrare, oferta
// calculata la iesire. Fara baza de date, fara HTTP, fara interfata.
// Structura urmeaza fisierele etalon (docs/etalon/E*.json, format v1.1) si
// FISA-OFERTARE v1.1 cap. 3, 8, 9, 11, 13.2, 19, 2b.

export type TipCont = "ADMIN_GENERAL" | "ADMINISTRATOR" | "AGENT" | "COLABORATOR" | "CONTABILITATE" | "GESTIUNE";

// FISA-OFERTARE 11.4
export type ModPrezentare = "simplu" | "lista_discount_general" | "discount_per_linie";

// FISA-OFERTARE 11.2 (suma discutata sau adaos %) si 11.7 (varianta pastreaza
// adaosul % al variantei de baza, cu 4 zecimale)
export type TipTinta = "total_cu_tva_lei" | "adaos_pct" | "adaos_pct_pastrat";

export interface Tinta {
  tip: TipTinta;
  valoare: Suma;
}

// cheia de culoare a unei sectiuni independente (FISA-OFERTARE 3.8): RAL +
// finisaj (+ grosime la tinichigerie / fixare; pluvialul nu are grosime)
export interface CheieCuloare {
  ral: string;
  finisaj: string;
  grosime?: string;
}

// produsul asa cum vine din catalog (pretul de baza e cel din lista activa)
export interface ProdusOferta {
  cod: string;
  denumire: string;
  um: string;
  pretBazaEur: Suma;
  finisaj?: string;
  grosime?: string;
}

// o pozitie de panotaj: lungime x bucati (FISA-OFERTARE 3.2)
export interface PozitieLungime {
  lungimeM: Suma;
  bucati: number;
}

export interface Invelitoare {
  id: string;
  produs: ProdusOferta;
  rol: "principala" | "secundara";
  culoare?: string;
  latimeTotalaM: Suma;
  panotaj: PozitieLungime[];
  // suprafata directa (mp, 3 zecimale) sau partea in mp a modului combinat
  mpDirect?: Suma;
  variantaProfil?: string;
}

// FISA-OFERTARE 11.5: pret fix pe linie, in EUR fara TVA (deja normalizat)
// sau ca "achizitie reala + x %"
export interface PretFix {
  tip: "eur_fara_tva" | "achizitie_plus_pct";
  valoare: Suma;
}

export interface LinieOferta {
  id: string;
  rubrica: string;
  produs: ProdusOferta;
  // cantitatea declarata (la invelitori / accesorii ML se poate deriva din
  // panotaj / pozitii - S8)
  cantitate: Suma;
  // lungime x bucati pentru accesoriile la metru liniar
  pozitii?: PozitieLungime[];
  // linie legata de o invelitoare (mosteneste cheia ei) ...
  invelitoare?: string;
  // ... sau independenta / de sine statatoare, cu cheia ei
  culoare?: CheieCuloare;
  pretFix?: PretFix;
  // exceptie de discount afisat pe linie (discount_per_linie)
  discountPct?: Suma;
}

// FISA-OFERTARE cap. 8
export interface Tronson {
  lungimeSipcaM: Suma;
  lungimeTronsonM: Suma;
  distantaMm: Suma;
}

export interface Sipca {
  linieId: string;
  produsCod: string;
  model: string;
  culoare?: string;
  latimeSipcaMm: Suma;
  varianta: "comanda" | "calcul";
  pozitii?: PozitieLungime[];
  tronsoane?: Tronson[];
}

// FISA-OFERTARE cap. 9
export interface LinieZonaB {
  denumire: string;
  um: string;
  cantitate: Suma;
  sumaLei: Suma;
  contineTva: boolean;
  preiaInFactura: boolean;
}

export interface IntrareOferta {
  // cursul documentului (BNR, 4 zecimale); cursul de achizitie se deriva (R1)
  cursBnr: Suma;
  tvaPct: number;
  cont: { tip: TipCont; adaosPct: Suma };
  // grupa (FISA-OFERTARE 11.3); "0" = goala
  grupaPct: Suma;
  tinta: Tinta;
  modPrezentare: ModPrezentare;
  discountGeneralPct?: Suma;
  discountImplicitPct?: Suma;
  // completare marcata (cap. 2b): garda nu se aplica
  completare: boolean;
  invelitori: Invelitoare[];
  sipca?: Sipca;
  linii: LinieOferta[];
  zonaB: LinieZonaB[];
}

// ---------------------------------------------------------------- iesirea

export interface LinieCalculata {
  id: string;
  cod: string;
  um: string;
  cantitate: Suma;
  bazaEur: Suma;
  // R2: baza x (1 + adaos cont) x (1 + grupa), 2 zecimale
  achizitieContEur: Suma;
  // achizitia fara grupa: pe ea sta garda si costul din tabelul de vanzari
  achizitieRealaEur: Suma;
  // ce vede agentul: achizitie cont x curs achizitie x (1 + TVA), 2 zecimale
  achizitieContLeiCuTva: Suma;
  // pretul de pe document (EUR fara TVA): la "simplu" pretul net; la
  // "lista_discount_general" pretul de lista; la "discount_per_linie" netul
  pretDocumentEur: Suma;
  valoareEur: Suma;
  pretListaEur?: Suma;
  discountPct?: Suma;
  pretNetEur?: Suma;
  pretFix: boolean;
  invelitoare?: string;
  pachet?: string;
}

export interface TotaluriOferta {
  achizitieContEurFaraTva: Suma;
  achizitieContLeiFaraTva: Suma;
  achizitieContLeiCuTva: Suma;
  achizitieRealaLeiCuTva: Suma;
  tintaLeiCuTva: Suma;
  adaosRealPct: Suma;
  // adaosul real cu 4 zecimale, pentru variante (FISA-OFERTARE 11.7)
  adaosRealPctExact: Suma;
  marjaLei: Suma;
  documentFaraTvaEur: Suma;
  tvaEur: Suma;
  documentCuTvaEur: Suma;
  // R6: suma discutata exact / "cat iese", dupa tipul tintei si abatere
  documentTotalLei: Suma;
  totalListaFaraTvaEur?: Suma;
  discountGeneralEur?: Suma;
}

// FISA-OFERTARE cap. 19
export interface RandVanzari {
  pretVanzareLei: Suma;
  costAchizitieLei: Suma;
  adaosNetLei: Suma;
  adaosBrutLei: Suma;
}

export interface Garda {
  respectata: boolean;
  // id-urile liniilor sub achizitia reala (la cursul documentului)
  liniiSubAchizitie: string[];
  // completarea marcata nu e verificata
  aplicata: boolean;
}

export interface ZonaBCalculata {
  supliment: { denumire: string; sumaLei: Suma }[];
  suplimentTotalLei: Suma;
  inFactura: {
    denumire: string;
    um: string;
    cantitate: Suma;
    pretUnitarLeiFaraTva: Suma;
    leiFaraTva: Suma;
    eurFaraTva: Suma;
  }[];
  tabelFacturare: { faraTvaEur: Suma; tvaEur: Suma; cuTvaEur: Suma; totalLei: Suma };
}

// FISA-OFERTARE 3.4-3.5
export interface Pachet {
  nume: string;
  linii: string[];
  achizitieEur: Suma;
}

export interface FormularBilka {
  nr: number;
  pachete: string[];
  continut: string;
}

// cantitatile derivate din panotaj / tronsoane / pozitii (S8)
export interface CantitatiCalculate {
  invelitori: { id: string; mp: Suma; coli: number }[];
  accesoriiMl: { linieId: string; ml: Suma }[];
  sipca?: { tronsoane: { bucati: number; ml: Suma }[]; bucatiTotal: number; mlTotal: Suma };
}

export interface RezultatOferta {
  cursBnr: Suma;
  cursAchizitie: Suma;
  cantitati: CantitatiCalculate;
  linii: LinieCalculata[];
  totaluri: TotaluriOferta;
  vanzari: RandVanzari;
  // R5: restul nerepartizabil in centi intregi ("0.00" cand nu exista)
  abatereEur: Suma;
  garda: Garda;
  zonaB?: ZonaBCalculata;
  pachete: Pachet[];
  formulareBilka: FormularBilka[];
  avertizari: string[];
}

// ------------------------------------------------- validarea intrarii (zod)

const suma = zod.string().regex(/^-?\d+([.,]\d+)?$/, "suma zecimala ca text, ex. \"6.86\"");
const procent = suma;

const schemaProdus = zod.object({
  cod: zod.string().min(1),
  denumire: zod.string().min(1),
  um: zod.string().min(1),
  pretBazaEur: suma,
  finisaj: zod.string().optional(),
  grosime: zod.string().optional(),
});

const schemaPozitie = zod.object({ lungimeM: suma, bucati: zod.number().int().nonnegative() });

export const schemaIntrareOferta = zod.object({
  cursBnr: suma,
  tvaPct: zod.number().nonnegative(),
  cont: zod.object({
    tip: zod.enum(["ADMIN_GENERAL", "ADMINISTRATOR", "AGENT", "COLABORATOR", "CONTABILITATE", "GESTIUNE"]),
    adaosPct: procent,
  }),
  grupaPct: procent,
  tinta: zod.object({ tip: zod.enum(["total_cu_tva_lei", "adaos_pct", "adaos_pct_pastrat"]), valoare: suma }),
  modPrezentare: zod.enum(["simplu", "lista_discount_general", "discount_per_linie"]),
  discountGeneralPct: procent.optional(),
  discountImplicitPct: procent.optional(),
  completare: zod.boolean(),
  invelitori: zod.array(
    zod.object({
      id: zod.string().min(1),
      produs: schemaProdus,
      rol: zod.enum(["principala", "secundara"]),
      culoare: zod.string().optional(),
      latimeTotalaM: suma,
      panotaj: zod.array(schemaPozitie),
      mpDirect: suma.optional(),
      variantaProfil: zod.string().optional(),
    }),
  ),
  sipca: zod
    .object({
      linieId: zod.string().min(1),
      produsCod: zod.string().min(1),
      model: zod.string(),
      culoare: zod.string().optional(),
      latimeSipcaMm: suma,
      varianta: zod.enum(["comanda", "calcul"]),
      pozitii: zod.array(schemaPozitie).optional(),
      tronsoane: zod.array(zod.object({ lungimeSipcaM: suma, lungimeTronsonM: suma, distantaMm: suma })).optional(),
    })
    .optional(),
  linii: zod.array(
    zod.object({
      id: zod.string().min(1),
      rubrica: zod.string().min(1),
      produs: schemaProdus,
      cantitate: suma,
      pozitii: zod.array(schemaPozitie).optional(),
      invelitoare: zod.string().optional(),
      culoare: zod.object({ ral: zod.string(), finisaj: zod.string(), grosime: zod.string().optional() }).optional(),
      pretFix: zod.object({ tip: zod.enum(["eur_fara_tva", "achizitie_plus_pct"]), valoare: suma }).optional(),
      discountPct: procent.optional(),
    }),
  ),
  zonaB: zod.array(
    zod.object({
      denumire: zod.string().min(1),
      um: zod.string(),
      cantitate: suma,
      sumaLei: suma,
      contineTva: zod.boolean(),
      preiaInFactura: zod.boolean(),
    }),
  ),
});
