export type TipReferinta =
  | "variante-profil"
  | "culori-finisaj-grosime"
  | "garantii-finisaj-grosime"
  | "liste-implicite-oferta"
  | "trepte-desfasurata";

export const TIPURI_REFERINTA: TipReferinta[] = [
  "variante-profil",
  "culori-finisaj-grosime",
  "garantii-finisaj-grosime",
  "liste-implicite-oferta",
  "trepte-desfasurata",
];

export type TipFisier = "produse" | TipReferinta;

export type Problema = {
  nivel: "eroare" | "avertizare";
  fisier?: string;
  rand?: number;
  mesaj: string;
};

// un produs asa cum rezulta din CSV, normalizat; cheia de identitate e codIntern
export type ProdusImport = {
  codIntern: string;
  fisier: string;
  rand: number;
  codFurnizor: string | null;
  grup: string;
  familie: string | null;
  varianta: string | null;
  finisaj: string | null;
  grosime: string | null;
  optiune: string | null;
  denumire: string;
  um: string;
  moneda: string;
  pret: number;
  categorieOferta: string;
  categorieBilka: string | null;
  latimeTotalaM: number | null;
  latimeTotalaMm: number | null;
  modulCm: number | null;
  sistem: string | null;
  treapta: string | null;
  desfasurata: string | null;
  culoriDisponibile: string | null;
  sursa: string | null;
  observatii: string | null;
  activ: boolean;
  // randul de tabla plana din care a iesit produsul (mp / coala), daca e cazul
  tablaPlana?: "mp" | "coala";
};

// campurile de produs comparate la diferente (si scrise la confirmare)
export const CAMPURI_PRODUS_IMPORT = [
  "codFurnizor",
  "grup",
  "familie",
  "varianta",
  "finisaj",
  "grosime",
  "optiune",
  "denumire",
  "um",
  "moneda",
  "categorieOferta",
  "categorieBilka",
  "latimeTotalaM",
  "latimeTotalaMm",
  "modulCm",
  "sistem",
  "treapta",
  "desfasurata",
  "culoriDisponibile",
  "sursa",
  "observatii",
  "activ",
] as const;

export type CampProdusImport = (typeof CAMPURI_PRODUS_IMPORT)[number];

export type RandReferintaImport = {
  tip: TipReferinta;
  fisier: string;
  rand: number;
  // cheia naturala a randului in tabelul lui (fara furnizor, care e compartimentul)
  cheie: string;
  valori: Record<string, string | number | null>;
};

export type FisierCitit = {
  nume: string;
  tip: TipFisier;
  randuri: number;
  coloane: string[];
  produse: ProdusImport[];
  referinte: RandReferintaImport[];
  probleme: Problema[];
};

export type SchimbareCamp = { camp: string; inainte: string | null; dupa: string | null };

export type Diferente = {
  produse: {
    noi: { codIntern: string; codFurnizor: string | null; denumire: string; categorieOferta: string; um: string; pret: number; fisier: string }[];
    modificate: { produsId: string; codIntern: string; denumire: string; campuri: SchimbareCamp[] }[];
    preturiModificate: { produsId: string; codIntern: string; denumire: string; vechi: number; nou: number; diferenta: number; procent: number }[];
    preturiNoi: number;
    disparute: { produsId: string; codIntern: string; codFurnizor: string | null; denumire: string }[];
    redenumiri: {
      produsId: string;
      codFurnizor: string | null;
      codInternVechi: string;
      codInternNou: string;
      denumireVeche: string;
      denumireNoua: string;
      campuri: SchimbareCamp[];
    }[];
    reaparute: { produsId: string; codIntern: string; denumire: string }[];
    neschimbate: number;
  };
  grupuriNoi: string[];
  familiiNoi: { grup: string; familie: string }[];
  referinte: Partial<
    Record<
      TipReferinta,
      {
        aparute: { cheie: string; valori: Record<string, string | number | null> }[];
        disparute: { id: string; cheie: string }[];
        modificate: { id: string; cheie: string; campuri: SchimbareCamp[] }[];
        reaparute: { id: string; cheie: string }[];
        neschimbate: number;
      }
    >
  >;
};

export type RaportFisier = {
  nume: string;
  tip: TipFisier;
  randuri: number;
  coduriDistincte: number | null;
  faraCod: number | null;
  anterior: { randuri: number; coduriDistincte: number | null; faraCod: number | null } | null;
  avertizari: string[];
};

export type Raport = {
  fisiere: RaportFisier[];
  totaluri: {
    randuri: number;
    randuriPret: number;
    coduriDistincte: number;
    faraCod: number;
    perechiTablaPlana: number;
    inactive: number;
    produseNoi: number;
    modificate: number;
    preturiModificate: number;
    disparute: number;
    redenumiri: number;
    reaparute: number;
    neschimbate: number;
  };
  primulImport: boolean;
};

export type FisierStocat = {
  nume: string;
  cale: string;
  tip: TipFisier;
  randuri: number;
  coduriDistincte: number | null;
  faraCod: number | null;
};
