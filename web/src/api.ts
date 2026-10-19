// gol = acelasi origin: in dezvoltare Vite face proxy /api -> serverul Express
// (vite.config.ts), ca aplicatia sa mearga si de pe tableta / telefon din retea
const BAZA_API = import.meta.env.VITE_API_URL ?? "";

export type Utilizator = {
  id: string;
  nume: string;
  email: string;
  rol: string;
  firmaId: string | null;
};

async function cerere<T>(cale: string, optiuni?: RequestInit): Promise<T> {
  const raspuns = await fetch(`${BAZA_API}${cale}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...optiuni,
  });
  if (!raspuns.ok) {
    const corp = await raspuns.json().catch(() => ({}));
    throw new Error(corp.eroare ?? `Cerere esuata (${raspuns.status})`);
  }
  if (raspuns.status === 204) {
    return undefined as T;
  }
  return raspuns.json() as Promise<T>;
}

export function obtineUtilizatorCurent() {
  return cerere<{ utilizator: Utilizator }>("/api/auth/me");
}

export function login(email: string, parola: string) {
  return cerere<{ utilizator: Utilizator }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, parola }),
  });
}

export function logout() {
  return cerere<void>("/api/auth/logout", { method: "POST" });
}

// --- Catalog (Zona tehnica) ---

// serverul primeste null pentru campurile optionale lasate goale
export function curata<T extends Record<string, unknown>>(obiect: T): T {
  const rezultat: Record<string, unknown> = {};
  for (const [cheie, valoare] of Object.entries(obiect)) {
    rezultat[cheie] = valoare === "" ? null : valoare;
  }
  return rezultat as T;
}

export type Compartiment = {
  id: string;
  denumire: string;
  codScurt: string;
  tip: "FURNIZOR" | "STOC_PROPRIU";
  moneda: string;
  modPret: "LISTA_ACHIZITIE" | "CATALOG_DISCOUNT";
  formatImport: string | null;
  contactFurnizorNume: string | null;
  contactFurnizorTelefon: string | null;
  contactFurnizorEmail: string | null;
  contactDirectorZonal: string | null;
  activ: boolean;
  _count?: { grupuri: number; produse: number };
};

export type Familie = { id: string; grupId: string; denumire: string; ordine: number };
export type Grup = { id: string; compartimentId: string; denumire: string; ordine: number; familii: Familie[] };
export type CompartimentDetaliu = Compartiment & { grupuri: Grup[] };

export type CategorieOferta = { id: string; denumire: string; zona: "A" | "B"; ordine: number };

export type Produs = {
  id: string;
  compartimentId: string;
  grupId: string;
  familieId: string | null;
  codIntern: string;
  codFurnizor: string | null;
  varianta: string | null;
  finisaj: string | null;
  grosime: string | null;
  optiune: string | null;
  denumire: string;
  um: string;
  moneda: string;
  categorieOfertaId: string | null;
  categorieBilka: string | null;
  latimeTotalaM: string | number | null;
  latimeTotalaMm: string | number | null;
  modulCm: string | number | null;
  sistem: string | null;
  treapta: string | null;
  desfasurata: string | null;
  culoriDisponibile: string | null;
  sursa: string | null;
  observatii: string | null;
  activ: boolean;
  ordine: number | null;
  compartiment?: { id: string; denumire: string };
  grup?: { id: string; denumire: string };
  familie?: { id: string; denumire: string } | null;
  categorieOferta?: { id: string; denumire: string } | null;
};

const BAZA_CAT = "/api/adm/cat";

export const apiCompartimente = {
  lista: () => cerere<{ compartimente: Compartiment[] }>(`${BAZA_CAT}/compartimente`),
  detaliu: (id: string) => cerere<{ compartiment: CompartimentDetaliu }>(`${BAZA_CAT}/compartimente/${id}`),
  creeaza: (date: Record<string, unknown>) =>
    cerere<{ compartiment: Compartiment }>(`${BAZA_CAT}/compartimente`, {
      method: "POST",
      body: JSON.stringify(curata(date)),
    }),
  actualizeaza: (id: string, date: Record<string, unknown>) =>
    cerere<{ compartiment: Compartiment }>(`${BAZA_CAT}/compartimente/${id}`, {
      method: "PUT",
      body: JSON.stringify(curata(date)),
    }),
  adaugaGrup: (compartimentId: string, date: { denumire: string; ordine: number }) =>
    cerere<{ grup: Grup }>(`${BAZA_CAT}/compartimente/${compartimentId}/grupuri`, {
      method: "POST",
      body: JSON.stringify(date),
    }),
  actualizeazaGrup: (id: string, date: { denumire: string; ordine: number }) =>
    cerere<{ grup: Grup }>(`${BAZA_CAT}/grupuri/${id}`, { method: "PUT", body: JSON.stringify(date) }),
  adaugaFamilie: (grupId: string, date: { denumire: string; ordine: number }) =>
    cerere<{ familie: Familie }>(`${BAZA_CAT}/grupuri/${grupId}/familii`, {
      method: "POST",
      body: JSON.stringify(date),
    }),
  actualizeazaFamilie: (id: string, date: { denumire: string; ordine: number }) =>
    cerere<{ familie: Familie }>(`${BAZA_CAT}/familii/${id}`, { method: "PUT", body: JSON.stringify(date) }),
};

export type FiltreProduse = {
  q?: string;
  compartimentId?: string;
  grupId?: string;
  familieId?: string;
  finisaj?: string;
  grosime?: string;
  page?: number;
  pageSize?: number;
};

export const apiProduse = {
  lista: (filtre: FiltreProduse) => {
    const params = new URLSearchParams();
    for (const [cheie, valoare] of Object.entries(filtre)) {
      if (valoare !== undefined && valoare !== "" && valoare !== null) params.set(cheie, String(valoare));
    }
    return cerere<{ produse: Produs[]; total: number; page: number; pageSize: number }>(
      `${BAZA_CAT}/produse?${params.toString()}`,
    );
  },
  detaliu: (id: string) => cerere<{ produs: Produs }>(`${BAZA_CAT}/produse/${id}`),
  creeaza: (date: Record<string, unknown>) =>
    cerere<{ produs: Produs }>(`${BAZA_CAT}/produse`, { method: "POST", body: JSON.stringify(curata(date)) }),
  actualizeaza: (id: string, date: Record<string, unknown>) =>
    cerere<{ produs: Produs }>(`${BAZA_CAT}/produse/${id}`, { method: "PUT", body: JSON.stringify(curata(date)) }),
  culoriVerificare: (params: { compartimentId: string; finisaj: string; grosime: string; exceptii?: string }) => {
    const sp = new URLSearchParams({ compartimentId: params.compartimentId, finisaj: params.finisaj, grosime: params.grosime });
    if (params.exceptii) sp.set("exceptii", params.exceptii);
    return cerere<{ sursa: "exceptie" | "tabel_general"; culori: string[] }>(
      `${BAZA_CAT}/produse/culori-verificare?${sp.toString()}`,
    );
  },
};

export type RandReferinta = Record<string, unknown> & { id: string };

export const apiReferinte = {
  lista: (cale: string) => cerere<{ randuri: RandReferinta[] }>(`${BAZA_CAT}/referinte/${cale}`),
  creeaza: (cale: string, date: Record<string, unknown>) =>
    cerere<{ rand: RandReferinta }>(`${BAZA_CAT}/referinte/${cale}`, {
      method: "POST",
      body: JSON.stringify(curata(date)),
    }),
  actualizeaza: (cale: string, id: string, date: Record<string, unknown>) =>
    cerere<{ rand: RandReferinta }>(`${BAZA_CAT}/referinte/${cale}/${id}`, {
      method: "PUT",
      body: JSON.stringify(curata(date)),
    }),
};

// --- Liste de pret si import ---

export type StatusLista = "SCHITA" | "ACTIVA" | "ARHIVATA" | "ANULATA";

export type FisierStocat = { nume: string; tip: string; randuri: number; coduriDistincte: number | null; faraCod: number | null };

export type RaportImport = {
  fisiere: { nume: string; tip: string; randuri: number; coduriDistincte: number | null; faraCod: number | null; anterior: { randuri: number; coduriDistincte: number | null; faraCod: number | null } | null; avertizari: string[] }[];
  totaluri: Record<string, number>;
  primulImport: boolean;
};

export type ListaPret = {
  id: string;
  compartimentId: string;
  denumire: string;
  valabilaDeLa: string;
  sursa: string | null;
  status: StatusLista;
  createdAt: string;
  activataLa: string | null;
  arhivataLa: string | null;
  anulataLa: string | null;
  fisiere: FisierStocat[] | null;
  raport: RaportImport | null;
  creataDe?: { nume: string } | null;
  compartiment?: { id: string; denumire: string };
  propuneri?: { id: string }[];
  _count?: { preturi: number };
};

export type Problema = { nivel: "eroare" | "avertizare"; fisier?: string; rand?: number; mesaj: string };
export type SchimbareCamp = { camp: string; inainte: string | null; dupa: string | null };

export type Diferente = {
  produse: {
    noi: { codIntern: string; codFurnizor: string | null; denumire: string; categorieOferta: string; um: string; pret: number; fisier: string }[];
    modificate: { produsId: string; codIntern: string; denumire: string; campuri: SchimbareCamp[] }[];
    preturiModificate: { produsId: string; codIntern: string; denumire: string; vechi: number; nou: number; diferenta: number; procent: number }[];
    preturiNoi: number;
    disparute: { produsId: string; codIntern: string; codFurnizor: string | null; denumire: string }[];
    redenumiri: { produsId: string; codFurnizor: string | null; codInternVechi: string; codInternNou: string; denumireVeche: string; denumireNoua: string; campuri: SchimbareCamp[] }[];
    reaparute: { produsId: string; codIntern: string; denumire: string }[];
    neschimbate: number;
  };
  grupuriNoi: string[];
  familiiNoi: { grup: string; familie: string }[];
  referinte: Record<
    string,
    {
      aparute: { cheie: string; valori: Record<string, string | number | null> }[];
      disparute: { id: string; cheie: string }[];
      modificate: { id: string; cheie: string; campuri: SchimbareCamp[] }[];
      reaparute: { id: string; cheie: string }[];
      neschimbate: number;
    }
  >;
};

export type ImportPropunere = {
  id: string;
  compartimentId: string;
  status: "PROPUSA" | "CONFIRMATA" | "ANULATA";
  areProduse: boolean;
  areReferinte: boolean;
  fisiere: FisierStocat[];
  diferente: Diferente;
  raport: RaportImport;
  erori: Problema[];
  avertizari: Problema[];
  listaPretId: string | null;
  confirmataLa: string | null;
  createdAt: string;
  compartiment?: { id: string; denumire: string };
  creatDe?: { nume: string } | null;
  listaPret?: { id: string; denumire: string; status: StatusLista } | null;
};

export type IstoricPret = { listaPretId: string; lista: string; status: StatusLista; valabilaDeLa: string; pret: number; observatie: string | null };

const BAZA_LP = "/api/adm/lp";
const BAZA_IMP = "/api/adm/imp";

export const apiListe = {
  peCompartiment: (compartimentId: string) => cerere<{ liste: ListaPret[] }>(`${BAZA_LP}/compartimente/${compartimentId}/liste`),
  detaliu: (id: string) => cerere<{ lista: ListaPret }>(`${BAZA_LP}/liste/${id}`),
  activeaza: (id: string) => cerere<{ noua: ListaPret; arhivata: ListaPret | null }>(`${BAZA_LP}/liste/${id}/activeaza`, { method: "POST" }),
  anuleaza: (id: string) => cerere<{ lista: ListaPret }>(`${BAZA_LP}/liste/${id}/anuleaza`, { method: "POST" }),
  istoricPreturi: (produsId: string) => cerere<{ istoric: IstoricPret[] }>(`${BAZA_LP}/produse/${produsId}/preturi`),
  pretManual: (produsId: string, pret: number) =>
    cerere<{ lista: ListaPret }>(`${BAZA_LP}/produse/${produsId}/pret-manual`, { method: "PUT", body: JSON.stringify({ pret }) }),
};

async function cerereFormular<T>(cale: string, formular: FormData): Promise<T> {
  const raspuns = await fetch(`${BAZA_API}${cale}`, { method: "POST", credentials: "include", body: formular });
  if (!raspuns.ok) {
    const corp = await raspuns.json().catch(() => ({}));
    throw new Error(corp.eroare ?? `Cerere esuata (${raspuns.status})`);
  }
  return raspuns.json() as Promise<T>;
}

export const apiImport = {
  analiza: (compartimentId: string, fisiere: File[]) => {
    const formular = new FormData();
    formular.set("compartimentId", compartimentId);
    for (const f of fisiere) formular.append("fisiere", f, f.name);
    return cerereFormular<{ propunere: ImportPropunere }>(`${BAZA_IMP}/analiza`, formular);
  },
  propuneri: (compartimentId?: string) =>
    cerere<{ propuneri: ImportPropunere[] }>(`${BAZA_IMP}/propuneri${compartimentId ? `?compartimentId=${compartimentId}` : ""}`),
  detaliu: (id: string) => cerere<{ propunere: ImportPropunere }>(`${BAZA_IMP}/propuneri/${id}`),
  confirma: (id: string, date: { denumire?: string; valabilaDeLa?: string }) =>
    cerere<{ propunere: ImportPropunere }>(`${BAZA_IMP}/propuneri/${id}/confirma`, { method: "POST", body: JSON.stringify(date) }),
  anuleaza: (id: string) => cerere<{ propunere: ImportPropunere }>(`${BAZA_IMP}/propuneri/${id}/anuleaza`, { method: "POST" }),
};
