const BAZA_API = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

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
