import { z as zod } from "zod";
import type { Suma } from "./zecimal.js";

// Tipurile motorului de calcul (MOT): oferta ca date la intrare, oferta
// calculata la iesire. Fara baza de date, fara HTTP, fara interfata.
// Structura urmeaza fisierele etalon (docs/etalon/E*.json, format v1.2) si
// FISA-OFERTARE v1.1 cap. 3, 5, 8, 9, 11, 13.2, 19, 2b.

export type TipCont = "ADMIN_GENERAL" | "ADMINISTRATOR" | "AGENT" | "COLABORATOR" | "CONTABILITATE" | "GESTIUNE";

// FISA-OFERTARE 11.4
export type ModPrezentare = "simplu" | "lista_discount_general" | "discount_per_linie";

// FISA-OFERTARE 11.2 (suma discutata sau adaos %) si 11.7 (varianta pastreaza
// adaosul % al variantei de baza, cu 4 zecimale)
// "preluata": oferta preia preturile din alta oferta (11.11) si nu are camp de tinta -
// totalul rezulta din cantitati, "cat iese"
export type TipTinta = "total_cu_tva_lei" | "adaos_pct" | "adaos_pct_pastrat" | "preluata";

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

// produsul asa cum vine din catalog (pretul de baza e cel din lista activa);
// grup / familie / optiune servesc la numele pachetelor si la avertizari
export interface ProdusOferta {
  cod: string;
  denumire: string;
  um: string;
  pretBazaEur: Suma;
  finisaj?: string;
  grosime?: string;
  grup?: string;
  familie?: string;
  optiune?: string;
  // sistemul pluvial din catalog ("125 / 90", "150 / 100", "125 / 90 și 150 / 100") - M2, R10
  sistem?: string;
}

// o pozitie: lungime x bucati (FISA-OFERTARE 3.2, 5, 8)
export interface PozitieLungime {
  lungimeM: Suma;
  bucati: number;
}

export interface Invelitoare {
  id: string;
  produs: ProdusOferta;
  rol: "principala" | "secundara";
  culoare?: string;
  // latimea totala in metri; vine din catalog, iar la tabla plana la mp o da
  // apelantul (FISA-OFERTARE 3.2: 1,25 m)
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
  // pus de "preia preturi din oferta ..." (11.11); renuntarea la preluare il scoate
  preluat?: boolean;
}

export interface LinieOferta {
  id: string;
  rubrica: string;
  produs: ProdusOferta;
  // cantitatea declarata; la linia unei invelitori, la accesoriile cu pozitii
  // si la sipca motorul o inlocuieste cu cea calculata
  cantitate: Suma;
  // lungime x bucati pentru accesoriile la metru liniar (FISA-OFERTARE cap. 5)
  pozitii?: PozitieLungime[];
  // linie legata de o invelitoare prin id-ul ei pe oferta (mosteneste cheia ei);
  // linia invelitorii insesi (rubrica Invelitori) poarta tot id-ul ei (M1, R9) ...
  invelitoare?: string;
  // ... sau linia unei rubrici de sipca (id-ul rubricii din `sipci`) ...
  sipca?: string;
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

// o rubrica de sipca (M1, R9): id-ul ei pe oferta; linia ei poarta `sipca` = id
export interface Sipca {
  id: string;
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
  // completare marcata (cap. 2b): garda nu se aplica; legatura cu oferta initiala
  // (seria-numarul ei) si motivul
  completare: boolean;
  completareLa?: string;
  motivCompletare?: string;
  // "preia preturi din oferta ..." (11.11): identificatorul ofertei-sursa
  preluataDin?: string;
  invelitori: Invelitoare[];
  // rubricile de sipca, in ordinea din oferta (M1: pot fi mai multe)
  sipci?: Sipca[];
  linii: LinieOferta[];
  zonaB: LinieZonaB[];
}

// ---------------------------------------------------------------- iesirea

export interface LinieCalculata {
  id: string;
  cod: string;
  rubrica: string;
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
  // R7: achizitia reala (fara grupa) adusa la cursul documentului - pragul gardei
  achizitieRealaDocEur: Suma;
  subAchizitie: boolean;
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
  // "propriu": tabelul contului; "administrator": vanzarea unui colaborator apare
  // in tabelul Administratorului (vanzare = achizitia lui, cost = baza)
  tabel: "propriu" | "administrator";
  nota?: string;
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
    leiCuTva: Suma;
    eurFaraTva: Suma;
  }[];
  tabelFacturare: { faraTvaEur: Suma; tvaEur: Suma; cuTvaEur: Suma; totalLei: Suma };
}

// FISA-OFERTARE 3.4-3.5: un pachet = o invelitoare + sectiunile ei; pluvialul
// se grupeaza pe finisaj + culoare; sectiunile de sine statatoare pe cheie;
// fiecare rubrica de sipca e pachetul ei (M1, R9)
export type TipPachet = "invelitoare" | "pluvial" | "de_sine_statatoare" | "sipca";

export interface Pachet {
  id: string;
  nume: string;
  tip: TipPachet;
  cheie: CheieCuloare;
  invelitoarePrincipala?: string;
  invelitoriSecundare: string[];
  linii: string[];
  achizitieEur: Suma;
}

export interface FormularBilka {
  nr: number;
  pachete: string[];
  continut: string;
}

// cantitatile derivate din panotaj / tronsoane / pozitii (FISA-OFERTARE 3.2, 5, 8)
export interface InvelitoareCalculata {
  id: string;
  mp: Suma;
  mpPanotaj: Suma;
  mpDirect: Suma;
  coli: number;
  // integral in lungimi x bucati (conditia de comanda, FISA-OFERTARE 3.2)
  integralPanotata: boolean;
}

export interface SipcaCalculata {
  id: string;
  tronsoane: { bucati: number; ml: Suma }[];
  bucatiTotal: number;
  mlTotal: Suma;
}

export interface CantitatiCalculate {
  invelitori: InvelitoareCalculata[];
  accesoriiMl: { linieId: string; ml: Suma }[];
  sipci: SipcaCalculata[];
}

export interface Comandabil {
  da: boolean;
  motive: string[];
}

export interface RezultatOferta {
  cursBnr: Suma;
  cursAchizitie: Suma;
  cantitati: CantitatiCalculate;
  comandabil: Comandabil;
  linii: LinieCalculata[];
  totaluri: TotaluriOferta;
  vanzari: RandVanzari;
  // R5: restul nerepartizabil in centi intregi ("0.00" cand nu exista)
  abatereEur: Suma;
  garda: Garda;
  zonaB?: ZonaBCalculata;
  pachete: Pachet[];
  formulareBilka: FormularBilka[];
  // ce vede agentul: "Se vor genera 4 formulare Bilka: 1) ...; 2) ..."
  textFormulare: string;
  avertizari: string[];
}

// rubrica "Invelitori" (linia unei invelitori; cantitatea ei vine din panotaj / mp)
export function esteLinieInvelitoare(rubrica: string): boolean {
  return /^învelitori/i.test(rubrica.trim()) || /^invelitori/i.test(rubrica.trim());
}

// ------------------------------------------------- validarea intrarii (zod)

const suma = zod.string().regex(/^-?\d+([.,]\d+)?$/, "suma zecimala ca text, ex. \"6.86\"");
const procent = suma;
const caNumar = (s: string) => Number(s.replace(",", "."));
// cantitati, lungimi, latimi: strict pozitive; distante: nenegative
const sumaPozitiva = suma.refine((s) => caNumar(s) > 0, "trebuie sa fie mai mare decat 0");
const sumaNenegativa = suma.refine((s) => caNumar(s) >= 0, "nu poate fi negativa");

const schemaProdus = zod.object({
  cod: zod.string().min(1),
  denumire: zod.string().min(1),
  um: zod.string().min(1),
  pretBazaEur: sumaNenegativa,
  finisaj: zod.string().optional(),
  grosime: zod.string().optional(),
  grup: zod.string().optional(),
  familie: zod.string().optional(),
  optiune: zod.string().optional(),
  sistem: zod.string().optional(),
});

const schemaPozitie = zod.object({ lungimeM: sumaPozitiva, bucati: zod.number().int().min(1) });

export const schemaIntrareOferta = zod.object({
  cursBnr: sumaPozitiva,
  tvaPct: zod.number().nonnegative(),
  cont: zod.object({
    tip: zod.enum(["ADMIN_GENERAL", "ADMINISTRATOR", "AGENT", "COLABORATOR", "CONTABILITATE", "GESTIUNE"]),
    adaosPct: procent,
  }),
  grupaPct: procent,
  tinta: zod.object({ tip: zod.enum(["total_cu_tva_lei", "adaos_pct", "adaos_pct_pastrat", "preluata"]), valoare: suma }),
  modPrezentare: zod.enum(["simplu", "lista_discount_general", "discount_per_linie"]),
  discountGeneralPct: procent.optional(),
  discountImplicitPct: procent.optional(),
  completare: zod.boolean(),
  completareLa: zod.string().optional(),
  motivCompletare: zod.string().optional(),
  preluataDin: zod.string().optional(),
  invelitori: zod.array(
    zod
      .object({
        id: zod.string().min(1),
        produs: schemaProdus,
        rol: zod.enum(["principala", "secundara"]),
        culoare: zod.string().optional(),
        latimeTotalaM: sumaPozitiva,
        panotaj: zod.array(schemaPozitie),
        mpDirect: sumaPozitiva.optional(),
        variantaProfil: zod.string().optional(),
      })
      .refine((i) => i.panotaj.length > 0 || i.mpDirect !== undefined, {
        message: "o invelitoare are fie panotaj (lungimi x bucati), fie suprafata directa (mp), fie amandoua",
      }),
  ),
  sipci: zod
    .array(
      zod
        .object({
          id: zod.string().min(1),
          produsCod: zod.string().min(1),
          model: zod.string(),
          culoare: zod.string().optional(),
          latimeSipcaMm: sumaPozitiva,
          varianta: zod.enum(["comanda", "calcul"]),
          pozitii: zod.array(schemaPozitie).optional(),
          tronsoane: zod.array(zod.object({ lungimeSipcaM: sumaPozitiva, lungimeTronsonM: sumaPozitiva, distantaMm: sumaNenegativa })).optional(),
        })
        .refine((s) => (s.varianta === "calcul" ? (s.tronsoane?.length ?? 0) > 0 : (s.pozitii?.length ?? 0) > 0), {
          message: "sipca in varianta Calcul are tronsoane; in varianta Comanda are pozitii (lungime x bucati)",
        }),
    )
    .optional(),
  linii: zod.array(
    zod.object({
      id: zod.string().min(1),
      rubrica: zod.string().min(1),
      produs: schemaProdus,
      cantitate: sumaPozitiva,
      pozitii: zod.array(schemaPozitie).optional(),
      invelitoare: zod.string().optional(),
      sipca: zod.string().optional(),
      culoare: zod.object({ ral: zod.string(), finisaj: zod.string(), grosime: zod.string().optional() }).optional(),
      pretFix: zod.object({ tip: zod.enum(["eur_fara_tva", "achizitie_plus_pct"]), valoare: sumaNenegativa, preluat: zod.boolean().optional() }).optional(),
      discountPct: procent.optional(),
    }),
  ),
  zonaB: zod.array(
    zod.object({
      denumire: zod.string().min(1),
      um: zod.string(),
      cantitate: sumaPozitiva,
      sumaLei: sumaNenegativa,
      contineTva: zod.boolean(),
      preiaInFactura: zod.boolean(),
    }),
  ),
})
  // M1 (R9): identitatea invelitorilor si a rubricilor de sipca e id-ul lor pe
  // oferta - id-uri unice, legaturi doar catre id-uri existente, fiecare
  // invelitoare cu exact o linie in rubrica Invelitori, fiecare sipca cu exact o linie
  .superRefine((o, ctx) => {
    const eroare = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
    const idInvelitori = new Set<string>();
    o.invelitori.forEach((i, k) => {
      if (idInvelitori.has(i.id)) eroare(["invelitori", k, "id"], `id de invelitoare dublat: ${i.id}`);
      idInvelitori.add(i.id);
    });
    const idSipci = new Set<string>();
    (o.sipci ?? []).forEach((s, k) => {
      if (idSipci.has(s.id)) eroare(["sipci", k, "id"], `id de rubrica de sipca dublat: ${s.id}`);
      idSipci.add(s.id);
    });
    o.linii.forEach((l, k) => {
      if (l.invelitoare !== undefined && !idInvelitori.has(l.invelitoare)) eroare(["linii", k, "invelitoare"], `linia ${l.id} (${l.produs.cod}) trimite la o invelitoare inexistenta: ${l.invelitoare}`);
      if (l.sipca !== undefined && !idSipci.has(l.sipca)) eroare(["linii", k, "sipca"], `linia ${l.id} (${l.produs.cod}) trimite la o rubrica de sipca inexistenta: ${l.sipca}`);
    });
    o.invelitori.forEach((i, k) => {
      const n = o.linii.filter((l) => esteLinieInvelitoare(l.rubrica) && l.invelitoare === i.id).length;
      if (n !== 1) eroare(["invelitori", k], `invelitoarea ${i.id} (${i.produs.cod}) are ${n} linii in rubrica Invelitori legate de ea; trebuie exact una`);
    });
    (o.sipci ?? []).forEach((s, k) => {
      const n = o.linii.filter((l) => l.sipca === s.id).length;
      if (n !== 1) eroare(["sipci", k], `rubrica de sipca ${s.id} (${s.produsCod}) are ${n} linii; trebuie exact una`);
    });
  });
