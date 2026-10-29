// gol = acelasi origin: in dezvoltare Vite face proxy /api -> serverul Express
// (vite.config.ts), ca aplicatia sa mearga si de pe tableta / telefon din retea
const BAZA_API = import.meta.env.VITE_API_URL ?? "";

export type Utilizator = {
  id: string;
  nume: string;
  email: string;
  telefon?: string | null;
  rol: string;
  firmaId: string | null;
  parolaTrebuieSchimbata?: boolean;
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

// --- Conturi (CON): contul propriu, firme, utilizatori, export ---

export type Conectare = { moment: string; rezultat: "SUCCES" | "ESEC" | "BLOCAT"; dispozitiv: string | null; sursa: string | null };

export const apiCont = {
  detaliu: () => cerere<{ utilizator: Utilizator; firma: { id: string; denumire: string } | null; conectari: Conectare[] }>("/api/cont"),
  schimbaParola: (parolaVeche: string, parolaNoua: string) =>
    cerere<{ ok: true }>("/api/cont/parola", { method: "PUT", body: JSON.stringify({ parolaVeche, parolaNoua }) }),
};

export type Firma = {
  id: string;
  denumire: string;
  cui: string;
  platitorTva: boolean;
  nrRegCom: string;
  adresa: string;
  localitate: string | null;
  judet: string | null;
  telefon: string;
  email: string;
  contBancar: string | null;
  banca: string | null;
  logo: string | null;
  // S16b: sablonul formularului de comanda Bilka al firmei
  sablonBilka: string | null;
  sablonBilkaVersiune: string | null;
  sablonBilkaIncarcatLa: string | null;
  sablonBilkaIncarcatDe: string | null;
  observatii: string | null;
  activ: boolean;
  _count?: { utilizatori: number };
};

const BAZA_CON = "/api/adm/con";

export const apiFirme = {
  lista: () => cerere<{ firme: Firma[] }>(`${BAZA_CON}/firme`),
  detaliu: (id: string) => cerere<{ firma: Firma }>(`${BAZA_CON}/firme/${id}`),
  creeaza: (date: Record<string, unknown>) => cerere<{ firma: Firma }>(`${BAZA_CON}/firme`, { method: "POST", body: JSON.stringify(curata(date)) }),
  actualizeaza: (id: string, date: Record<string, unknown>) =>
    cerere<{ firma: Firma }>(`${BAZA_CON}/firme/${id}`, { method: "PUT", body: JSON.stringify(curata(date)) }),
  incarcaSigla: (id: string, fisier: File) => {
    const formular = new FormData();
    formular.append("sigla", fisier, fisier.name);
    return cerereFormular<{ firma: Firma }>(`${BAZA_CON}/firme/${id}/sigla`, formular);
  },
  urlSigla: (id: string) => `${BAZA_API}${BAZA_CON}/firme/${id}/sigla`,
  // S16b: sablonul formularului Bilka (.xlsm), incarcat de Admin general
  incarcaSablonBilka: (id: string, fisier: File) => {
    const formular = new FormData();
    formular.append("sablon", fisier, fisier.name);
    return cerereFormular<{ firma: Firma }>(`${BAZA_CON}/firme/${id}/sablon-bilka`, formular);
  },
  urlSablonBilka: (id: string) => `${BAZA_API}${BAZA_CON}/firme/${id}/sablon-bilka`,
};

export type RolCont = "ADMIN_GENERAL" | "ADMINISTRATOR" | "AGENT" | "COLABORATOR" | "CONTABILITATE" | "GESTIUNE";

export type UtilizatorAdmin = {
  id: string;
  nume: string;
  telefon: string | null;
  email: string;
  rol: RolCont;
  firmaId: string | null;
  firma: string | null;
  administratorId: string | null;
  serieOferta: string | null;
  adaosProcent: number | null;
  accesGeneralFirme: boolean;
  firmeAcces: string[];
  activ: boolean;
  parolaTrebuieSchimbata: boolean;
  blocatPanaLa: string | null;
  esteRezerva: boolean;
  createdAt: string;
};

export const apiUtilizatori = {
  lista: () => cerere<{ utilizatori: UtilizatorAdmin[] }>(`${BAZA_CON}/utilizatori`),
  creeaza: (date: Record<string, unknown>) =>
    cerere<{ utilizator: UtilizatorAdmin }>(`${BAZA_CON}/utilizatori`, { method: "POST", body: JSON.stringify(curata(date)) }),
  actualizeaza: (id: string, date: Record<string, unknown>) =>
    cerere<{ utilizator: UtilizatorAdmin }>(`${BAZA_CON}/utilizatori/${id}`, { method: "PUT", body: JSON.stringify(curata(date)) }),
  reseteazaParola: (id: string, parolaNoua: string) =>
    cerere<{ ok: true }>(`${BAZA_CON}/utilizatori/${id}/parola`, { method: "POST", body: JSON.stringify({ parolaNoua }) }),
};

export const URL_EXPORT = `${BAZA_API}/api/adm/export`;

// --- Calcul de proba (MOT, Zona tehnica, doar Admin general) ---

const BAZA_MOT = "/api/mot";

export type ProdusProba = {
  produsId: string;
  codIntern: string;
  cod: string;
  denumire: string;
  um: string;
  pretEur: string;
  rubrica: string | null;
  moneda: string;
  compartiment: string;
  grup?: string;
  familie?: string;
  finisaj?: string;
  grosime?: string;
  varianta?: string;
  optiune?: string;
  latimeTotalaM?: string;
  latimeTotalaMm?: string;
  tablaPlana?: "mp" | "coala";
};

export type PozitieLungime = { lungimeM: string; bucati: number };
export type CheieCuloare = { ral: string; finisaj: string; grosime?: string };
export type PretFix = { tip: "eur_fara_tva" | "achizitie_plus_pct"; valoare: string };

export type ProdusOferta = {
  cod: string;
  denumire: string;
  um: string;
  pretBazaEur: string;
  finisaj?: string;
  grosime?: string;
  grup?: string;
  familie?: string;
  optiune?: string;
};

export type InvelitoareIntrare = {
  id: string;
  produs: ProdusOferta;
  rol: "principala" | "secundara";
  culoare?: string;
  latimeTotalaM: string;
  panotaj: PozitieLungime[];
  mpDirect?: string;
  variantaProfil?: string;
};

export type LinieIntrare = {
  id: string;
  rubrica: string;
  produs: ProdusOferta;
  cantitate: string;
  pozitii?: PozitieLungime[];
  invelitoare?: string;
  culoare?: CheieCuloare;
  pretFix?: PretFix;
  discountPct?: string;
};

export type IntrareProba = {
  cursBnr: string;
  tvaPct: number;
  cont: { tip: string; adaosPct: string };
  grupaPct: string;
  tinta: { tip: "total_cu_tva_lei" | "adaos_pct" | "adaos_pct_pastrat"; valoare: string };
  modPrezentare: "simplu" | "lista_discount_general" | "discount_per_linie";
  discountGeneralPct?: string;
  discountImplicitPct?: string;
  completare: boolean;
  invelitori: InvelitoareIntrare[];
  sipci?: unknown[];
  linii: LinieIntrare[];
  zonaB: unknown[];
};

export type LinieRezultat = {
  id: string;
  cod: string;
  rubrica: string;
  um: string;
  cantitate: string;
  bazaEur: string;
  achizitieContEur: string;
  achizitieRealaEur: string;
  achizitieContLeiCuTva: string;
  pretDocumentEur: string;
  valoareEur: string;
  pretListaEur?: string;
  discountPct?: string;
  pretNetEur?: string;
  pretFix: boolean;
  achizitieRealaDocEur: string;
  subAchizitie: boolean;
  invelitoare?: string;
  pachet?: string;
};

export type RezultatProba = {
  cursBnr: string;
  cursAchizitie: string;
  cantitati: { invelitori: { id: string; mp: string; coli: number; integralPanotata: boolean }[]; accesoriiMl: { linieId: string; ml: string }[]; sipci: { id: string; bucatiTotal: number; mlTotal: string }[] };
  comandabil: { da: boolean; motive: string[] };
  linii: LinieRezultat[];
  totaluri: Record<string, string | undefined>;
  vanzari: { pretVanzareLei: string; costAchizitieLei: string; adaosNetLei: string; adaosBrutLei: string };
  abatereEur: string;
  garda: { respectata: boolean; liniiSubAchizitie: string[]; aplicata: boolean };
  pachete: { id: string; nume: string; tip: string; linii: string[]; achizitieEur: string }[];
  formulareBilka: { nr: number; pachete: string[]; continut: string }[];
  textFormulare: string;
  avertizari: string[];
};

export const apiMot = {
  produse: (q: string) => cerere<{ produse: ProdusProba[] }>(`${BAZA_MOT}/produse?q=${encodeURIComponent(q)}`),
  etaloane: () => cerere<{ etaloane: { id: string; titlu: string; status: string }[] }>(`${BAZA_MOT}/etaloane`),
  etalon: (id: string) => cerere<{ etalon: { id: string; titlu: string }; intrare: IntrareProba; asteptat: Record<string, unknown> }>(`${BAZA_MOT}/etaloane/${id}`),
  proba: (intrare: IntrareProba) => cerere<{ rezultat: RezultatProba }>(`${BAZA_MOT}/proba`, { method: "POST", body: JSON.stringify(intrare) }),
};

// --- Ofertare (OFE): oferte, clienti, cursul BNR ---

export type StatusOferta = "IN_LUCRU" | "TRANSMISA" | "DE_REVIZIONAT" | "ACCEPTATA" | "NEACCEPTATA" | "AVANS_LUAT" | "DE_COMANDAT" | "COMANDAT";

export const ETICHETA_STATUS: Record<StatusOferta, string> = {
  IN_LUCRU: "În lucru",
  TRANSMISA: "Transmisă",
  DE_REVIZIONAT: "De revizionat",
  ACCEPTATA: "Acceptată",
  NEACCEPTATA: "Neacceptată",
  AVANS_LUAT: "Avans luat",
  DE_COMANDAT: "De comandat",
  COMANDAT: "Comandat",
};
export const STATUSURI_OFERTA = Object.keys(ETICHETA_STATUS) as StatusOferta[];

export type ClientDate = {
  nume: string;
  telefon: string;
  adresa: string;
  localitate?: string | null;
  email?: string | null;
  observatii?: string | null;
};
export type Client = ClientDate & { id: string };

export type RandOferta = {
  id: string;
  numarComplet: string;
  serie: string;
  numar: number;
  versiune: number;
  data: string;
  status: StatusOferta;
  statusLa: string;
  comandatLa: string | null;
  avertizareCurs: string | null;
  avansLei: string | null;
  client: { id: string; nume: string; localitate: string | null; telefon: string };
  clientMultiplu: boolean;
  agent: { id: string; nume: string };
  firma: { id: string; denumire: string };
  invelitoare: string | null;
  totalCuTvaEur: string | null;
  totalLei: string | null;
  completareLa: { numarComplet: string; motiv: string | null } | null;
  modificatLa: string;
  completari?: RandOferta[];
};

export type FiltreOferte = {
  q?: string;
  status?: StatusOferta | "";
  deLa?: string;
  panaLa?: string;
  agent?: string;
  firmaId?: string;
  clientMultiplu?: boolean;
  page?: number;
  pageSize?: number;
};

export type ListaOferte = {
  oferte: RandOferta[];
  total: number;
  page: number;
  pageSize: number;
  numaratori: { total: number; inLucru: number; deComandat: number; comandate: number };
  perioada: { deLa: string; panaLa: string };
};

export type OfertaDetaliu = {
  id: string;
  numarComplet: string;
  serie: string;
  numar: number;
  versiune: number;
  data: string;
  status: StatusOferta;
  statusLa: string;
  firma: { id: string; denumire: string; cui: string; adresa: string; telefon: string; email: string; localitate: string | null };
  cont: { id: string; nume: string; telefon: string | null; email: string; serieOferta: string | null };
  client: Client;
  sursaClient: string | null;
  curs: { cursBnr: string; cursAchizitie: string; dataCurs: string; sursaCurs: string; avertizareCurs: string | null };
  listaPret: { id: string; denumire: string; status: string } | null;
  tvaPct: string;
  modPrezentare: string;
  tinta: { tip: string; valoare: string };
  grupaPct: string;
  completareLa: { id: string; numarComplet: string } | null;
  motivCompletare: string | null;
  completari: { id: string; numarComplet: string; motiv: string | null; status: StatusOferta }[];
  note: string | null;
  adresaLucrarii: string | null;
  localitate: string | null;
  precizariZonaB: string | null;
  invelitori: unknown[];
  linii: unknown[];
  sipci: unknown[];
  zonaB: unknown[];
  structura?: { rezultat: StructuraOferta | null; eroare: string | null } | null;
  // S14: preturile (filtrate pe rol pe server), versiunile, "preturi vechi", preluarea
  preturi?: { rezultat: RezultatPreturi | null; eroare: string | null } | null;
  versiuni?: VersiuneOferta[];
  preturiVechi?: boolean;
  preluataDin?: { id: string; numarComplet: string } | null;
  discountGeneralPct?: string | null;
  discountImplicitPct?: string | null;
  // S15: avansul, montatorul / recomandarea, comanda minima, rezultatul salvat, istoricul
  avansLei?: string | null;
  montator?: Montator | null;
  comisionRecomandareLei?: string | null;
  comisionAchitat?: boolean;
  comanda?: ComandaMinima | null;
  rezultatSalvatLa?: string | null;
  areIstoric?: boolean;
  sumeModificate?: string[];
  numaratori?: { notite: number; atasamente: number; istoric: number; documente: number };
  poateModificaSume?: boolean;
  poateModifica: boolean;
  createdAt: string;
  updatedAt: string;
};

// S14: rezultatul motorului cu preturi, asa cum pleaca spre ecran (Agentul nu
// primeste pretul de baza; Administratorul il primeste)
export type LiniePret = {
  id: string;
  cod: string;
  denumire: string;
  rubrica: string;
  um: string;
  cantitate: string;
  bazaEur?: string;
  achizitieContEur: string;
  achizitieRealaEur: string;
  achizitieContLeiCuTva: string;
  pretDocumentEur: string;
  valoareEur: string;
  pretListaEur?: string;
  discountPct?: string;
  pretNetEur?: string;
  pretFix: boolean;
  pretFixPreluat: boolean;
  achizitieRealaDocEur: string;
  subAchizitie: boolean;
  pachet?: string;
};

export type RandVanzari = { pretVanzareLei: string; costAchizitieLei: string; adaosNetLei: string; adaosBrutLei: string; tabel: "propriu" | "administrator"; nota?: string };

export type RezultatPreturi = {
  cursBnr: string;
  cursAchizitie: string;
  linii: LiniePret[];
  totaluri: {
    achizitieContEurFaraTva: string;
    achizitieContLeiFaraTva: string;
    achizitieContLeiCuTva: string;
    achizitieRealaLeiCuTva: string;
    tintaLeiCuTva: string;
    adaosRealPct: string;
    adaosRealPctExact: string;
    marjaLei: string;
    documentFaraTvaEur: string;
    tvaEur: string;
    documentCuTvaEur: string;
    documentTotalLei: string;
    totalListaFaraTvaEur?: string;
    discountGeneralEur?: string;
  };
  vanzari: RandVanzari | null;
  lucrare: RandVanzari | null;
  abatereEur: string;
  garda: { respectata: boolean; liniiSubAchizitie: string[]; aplicata: boolean };
  zonaB?: { suplimentTotalLei: string; tabelFacturare: { faraTvaEur: string; tvaEur: string; cuTvaEur: string; totalLei: string } };
  avertizari: string[];
  comandabil: { da: boolean; motive: string[] };
};

export type VersiuneOferta = { id: string; versiune: number; curenta: boolean; status: StatusOferta; tintaTip: string; tintaValoare: string; updatedAt: string };

export type TipPretFixIntrare = "eur_fara_tva" | "eur_cu_tva" | "lei_fara_tva" | "lei_cu_tva" | "achizitie_plus_pct";

export type DatePreturi = {
  mentiuni?: string | null;
  tinta?: { tip: "ADAOS_PCT" | "TOTAL_CU_TVA_LEI"; valoare: string };
  modPrezentare?: "SIMPLU" | "LISTA_DISCOUNT_GENERAL" | "DISCOUNT_PER_LINIE";
  discountGeneralPct?: string | null;
  discountImplicitPct?: string | null;
  linii?: { id: string; pretFix?: { tip: TipPretFixIntrare; valoare: string } | null; discountPct?: string | null }[];
};

export type SursaPreluare = { id: string; numarComplet: string; versiune: number; data: string; status: StatusOferta; client: { nume: string; localitate: string | null } };

// eroarea gardei: serverul refuza cu 409 si intoarce liniile vinovate
export class EroareGarda extends Error {
  linii: { id: string; cod: string; denumire: string }[];
  constructor(message: string, linii: { id: string; cod: string; denumire: string }[]) {
    super(message);
    this.linii = linii;
  }
}

async function cererePreturi<T>(cale: string, optiuni?: RequestInit): Promise<T> {
  const raspuns = await fetch(`${BAZA_API}${cale}`, { credentials: "include", headers: { "Content-Type": "application/json" }, ...optiuni });
  if (!raspuns.ok) {
    const corp = await raspuns.json().catch(() => ({}));
    if (raspuns.status === 409 && Array.isArray(corp.liniiSubAchizitie)) throw new EroareGarda(corp.eroare ?? "Sub achiziție", corp.liniiSubAchizitie);
    throw new Error(corp.eroare ?? `Cerere esuata (${raspuns.status})`);
  }
  return raspuns.json() as Promise<T>;
}

export const apiPreturi = {
  salveaza: (id: string, date: DatePreturi) => cererePreturi<{ oferta: OfertaDetaliu }>(`/api/oferte/${id}/preturi`, { method: "PUT", body: JSON.stringify(date) }),
  varianta: (id: string) => cerere<{ oferta: OfertaDetaliu }>(`/api/oferte/${id}/varianta`, { method: "POST" }),
  faCurenta: (id: string) => cerere<{ oferta: OfertaDetaliu }>(`/api/oferte/${id}/curenta`, { method: "PUT" }),
  surse: (id: string, q: string) => cerere<{ oferte: SursaPreluare[] }>(`/api/oferte/${id}/surse-preluare?q=${encodeURIComponent(q)}`),
  preia: (id: string, sursaId: string) => cererePreturi<{ oferta: OfertaDetaliu }>(`/api/oferte/${id}/preia-preturi`, { method: "POST", body: JSON.stringify({ sursaId }) }),
  renunta: (id: string, tinta: { tip: "ADAOS_PCT" | "TOTAL_CU_TVA_LEI"; valoare: string }) => cererePreturi<{ oferta: OfertaDetaliu }>(`/api/oferte/${id}/renunta-preluare`, { method: "POST", body: JSON.stringify({ tinta }) }),
  completare: (id: string, motiv: string, text: string | null) => cerere<{ oferta: OfertaDetaliu }>(`/api/oferte/${id}/completare`, { method: "POST", body: JSON.stringify({ motiv, text }) }),
  curs: (id: string) => cerere<{ oferta: OfertaDetaliu }>(`/api/oferte/${id}/curs`, { method: "POST" }),
  recalculeaza: (id: string) => cerere<{ oferta: OfertaDetaliu }>(`/api/oferte/${id}/recalculeaza-preturi`, { method: "POST" }),
};

export const apiOptiuni = {
  lista: (lista: "motiv_completare" | "sursa_client") => cerere<{ lista: string; optiuni: { valoare: string; ordine: number }[] }>(`/api/oferte/optiuni/${lista}`),
};

export type PretRapid = {
  produs: ProdusEditor;
  pret: { achizitieContEur: string; achizitieContLeiCuTva: string; um: string; cursAchizitie: string; dataCurs: string; avertizareCurs: string | null; pretBazaEur?: string };
};

export const apiPretRapid = {
  cauta: (q: string) => cerere<{ produse: ProdusEditor[] }>(`/api/pret-rapid?q=${encodeURIComponent(q)}`),
  pret: (produsId: string) => cerere<PretRapid>(`/api/pret-rapid/${produsId}`),
};

export type Montator = { id: string; nume: string; telefon: string; localitate: string | null; tip: "MONTATOR" | "CONSTRUCTOR"; activ?: boolean; utilizator?: { id: string; nume: string } };
export type ComandaMinima = { id: string; rezumat: string; totalCuTvaEur: string; totalLei: string; avansLei: string; restLei: string; statusLogistic: string; data: string; responsabil: string };
export type IntrareIstoric = { id: string; moment: string; numeUtilizatorLaMoment: string; tip: string; camp: string | null; valoareInainte: string | null; valoareDupa: string | null; mentiuni: string | null };
export type Notita = { id: string; text: string; numeUtilizatorLaMoment: string; moment: string };
export type Atasament = { id: string; nume: string; tipMime: string | null; marime: number | null; moment: string; incarcatDe: string | null };

export const apiStatus = {
  schimba: (id: string, status: StatusOferta, extra: { avansLei?: string | null; mentiuni?: string | null } = {}) =>
    cererePreturi<{ oferta: OfertaDetaliu }>(`/api/oferte/${id}/status`, { method: "PUT", body: JSON.stringify({ status, ...extra }) }),
  istoric: (id: string) => cerere<{ areIstoric: boolean; intrari: IntrareIstoric[]; sumeModificate: string[] }>(`/api/oferte/${id}/istoric`),
  montator: (id: string, date: { montatorId?: string | null; montatorNou?: { nume: string; telefon: string; localitate?: string | null; tip: "MONTATOR" | "CONSTRUCTOR" }; comisionRecomandareLei?: string | null; mentiuni?: string | null }) =>
    cerere<{ oferta: OfertaDetaliu }>(`/api/oferte/${id}/montator`, { method: "PUT", body: JSON.stringify(date) }),
  leaga: (id: string, ofertaId: string, motiv: string, text: string | null, mentiuni: string | null) =>
    cerere<{ oferta: OfertaDetaliu }>(`/api/oferte/${id}/completare-la`, { method: "PUT", body: JSON.stringify({ ofertaId, motiv, text, mentiuni }) }),
  copie: (id: string, client?: ClientDate) => cerere<{ oferta: OfertaDetaliu }>(`/api/oferte/${id}/copie`, { method: "POST", body: JSON.stringify(client ? { client } : {}) }),
};

export type TipDocument = "OFERTA" | "REZUMAT" | "DETALIATA" | "TABEL_FACTURARE";
// S16b: formularul de comanda Bilka apare in lista documentelor, dar nu se genereaza din "PDF ▾"
export type TipDocumentOrice = TipDocument | "FORMULAR_BILKA";
export type DocumentOferta = { id: string; tip: TipDocumentOrice; eticheta: string; versiune: number; nume: string; marime: number; pagini: number | null; generatLa: string; generatDe: string | null; transmisLa: string | null; canal: string | null; formularNr: number | null; avertizari: string | null };

export const apiDocumente = {
  lista: (id: string) => cerere<{ documente: DocumentOferta[]; tipuriPermise: TipDocument[] }>(`/api/oferte/${id}/documente`),
  genereaza: (id: string, tip: TipDocument) => cerere<{ document: DocumentOferta }>(`/api/oferte/${id}/documente`, { method: "POST", body: JSON.stringify({ tip }) }),
  transmis: (id: string, did: string, canal: "WHATSAPP" | "EMAIL" | "PRINT", mentiuni: string | null) => cerere<{ document: DocumentOferta }>(`/api/oferte/${id}/documente/${did}/transmis`, { method: "PUT", body: JSON.stringify({ canal, mentiuni }) }),
  cale: (id: string, did: string) => `${BAZA_API}/api/oferte/${id}/documente/${did}`,
};

// S16b: formularele de comanda Bilka (un .xlsm per formular R10), de la "De comandat" si la "Comandat"
export const apiFormulareBilka = {
  genereaza: (id: string) => cerere<{ documente: DocumentOferta[]; avertizari: string[] }>(`/api/oferte/${id}/formulare-bilka`, { method: "POST", body: "{}" }),
};

export const apiMontatori = {
  lista: (q: string) => cerere<{ montatori: Montator[] }>(`/api/montatori?q=${encodeURIComponent(q)}`),
  creeaza: (m: { nume: string; telefon: string; localitate?: string | null; tip: "MONTATOR" | "CONSTRUCTOR" }) => cerere<{ montator: Montator }>("/api/montatori", { method: "POST", body: JSON.stringify(m) }),
};

export const apiNotite = {
  lista: (id: string) => cerere<{ notite: Notita[] }>(`/api/oferte/${id}/notite`),
  adauga: (id: string, text: string) => cerere<{ notita: Notita }>(`/api/oferte/${id}/notite`, { method: "POST", body: JSON.stringify({ text }) }),
  atasamente: (id: string) => cerere<{ atasamente: Atasament[] }>(`/api/oferte/${id}/atasamente`),
  incarca: async (id: string, fisier: File) => {
    const f = new FormData();
    f.append("fisier", fisier);
    return cerereFormular<{ atasament: Atasament }>(`/api/oferte/${id}/atasamente`, f);
  },
  caleDescarcare: (id: string, aid: string) => `${BAZA_API}/api/oferte/${id}/atasamente/${aid}`,
};

export type AntetOferta = { data?: string; sursaClient?: string | null; note?: string | null; adresaLucrarii?: string | null; localitate?: string | null; mentiuni?: string | null };

export type CursAzi = { cursBnr: string; cursAchizitie: string; dataCurs: string; sursaCurs: string; avertizareCurs: string | null };
export type CursZi = { data: string; curs: string; sursa: string };
export type IncercareCurs = { la: string; sursa: string; reusit: boolean; salvate: number; mesaj: string };

const BAZA_OFE = "/api/oferte";

export const apiOferte = {
  lista: (f: FiltreOferte) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) {
      if (v === undefined || v === "" || v === false) continue;
      p.set(k, v === true ? "da" : String(v));
    }
    return cerere<ListaOferte>(`${BAZA_OFE}?${p.toString()}`);
  },
  creeaza: (client: ClientDate, antet?: AntetOferta) => cerere<{ oferta: OfertaDetaliu }>(BAZA_OFE, { method: "POST", body: JSON.stringify({ client, antet }) }),
  detaliu: (id: string) => cerere<{ oferta: OfertaDetaliu }>(`${BAZA_OFE}/${id}`),
  antet: (id: string, antet: AntetOferta) => cerere<{ oferta: OfertaDetaliu }>(`${BAZA_OFE}/${id}/antet`, { method: "PUT", body: JSON.stringify(antet) }),
  client: (id: string, client: ClientDate) => cerere<{ oferta: OfertaDetaliu }>(`${BAZA_OFE}/${id}/client`, { method: "PUT", body: JSON.stringify(client) }),
  contor: (serie: string) => cerere<{ serie: string; ultimulNumar: number }>(`${BAZA_OFE}/contor/${serie}`),
  seteazaContor: (serie: string, ultimulNumar: number) => cerere<{ serie: string; ultimulNumar: number }>(`${BAZA_OFE}/contor/${serie}`, { method: "PUT", body: JSON.stringify({ ultimulNumar }) }),
};

export const apiClienti = {
  cauta: (f: { telefon?: string; q?: string }) => {
    const p = new URLSearchParams();
    if (f.telefon) p.set("telefon", f.telefon);
    if (f.q) p.set("q", f.q);
    return cerere<{ clienti: Client[] }>(`/api/clienti?${p.toString()}`);
  },
  fisa: (id: string) =>
    cerere<{
      client: Client;
      oferte: { id: string; numarComplet: string; data: string; status: StatusOferta; statusLa: string; updatedAt: string; utilizator: { id: string; nume: string }; completareLa: { serie: string; numar: number } | null; motivCompletare: string | null }[];
    }>(`/api/clienti/${id}`),
};

export const apiCurs = {
  azi: () => cerere<{ azi: CursAzi | null; ultimele: CursZi[]; ultimaIncercare: IncercareCurs | null; eroare?: string }>("/api/curs"),
  preia: (istoric: boolean) => cerere<{ salvate: number; sursa: string; mesaj: string; ultimaIncercare: IncercareCurs | null }>("/api/curs/preia", { method: "POST", body: JSON.stringify({ istoric }) }),
  manual: (data: string, curs: string) => cerere<{ ok: true }>("/api/curs/manual", { method: "POST", body: JSON.stringify({ data, curs }) }),
};

export const apiOfertare = {
  cont: () => cerere<{ utilizator: Utilizator; firma: { id: string; denumire: string } | null }>("/api/cont"),
};

// data in format romanesc (zz.ll.aaaa)
export function dataRo(iso: string | Date | null | undefined): string {
  if (!iso) return "–";
  const d = typeof iso === "string" ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso) : iso;
  return d.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// "azi, 17:40" / "ieri, 09:12" / "16.09, 18:05"
export function momentRelativ(iso: string): string {
  const d = new Date(iso);
  const azi = new Date();
  const ora = d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  const aceeasiZi = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (aceeasiZi(d, azi)) return `azi, ${ora}`;
  const ieri = new Date(azi.getTime() - 24 * 3600 * 1000);
  if (aceeasiZi(d, ieri)) return `ieri, ${ora}`;
  return `${d.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit" })}, ${ora}`;
}

// --- Editorul ofertei: catalogul pentru editor si zona produselor (S13) ---

export type ProdusEditor = {
  id: string;
  cod: string;
  denumire: string;
  um: string;
  categorie: string | null;
  compartiment: string;
  grup: string;
  familie: string | null;
  varianta: string | null;
  optiune: string | null;
  finisaj: string | null;
  grosime: string | null;
  sistem: string | null;
  treapta: string | null;
  desfasurata: string | null;
  latimeTotalaM: string | null;
  latimeTotalaMm: string | null;
  modulCm: string | null;
  culoriDisponibile: string | null;
  tablaPlana: "mp" | "coala" | null;
};

export type ReferinteEditor = {
  culori: { furnizor: string; finisaj: string; grosime: string; culoare: string }[];
  trepte: { treapta: string; deLaMm: number; panaLaMm: number }[];
  variante: { model: string; variantaProfil: string; restrictii: string | null }[];
  categorii: { denumire: string; zona: string; ordine: number }[];
  categoriiListe: { rubrica: string; categorieInvelitoare: string }[];
};

export type CheieEditor = { finisaj?: string; grosime?: string; sistem?: string };

export type PozitieEditor = { lungimeM: string; bucati: number };

export type InvelitoareEditor = {
  cheie: string;
  produsId: string;
  culoare?: string | null;
  latimeTotalaM?: string;
  mpDirect?: string | null;
  panotaj: PozitieEditor[];
  variantaProfil?: string | null;
  // S16b: montajul tablei cutate (acoperis / perete), doar pentru formularul Bilka
  montaj?: "acoperis" | "perete" | null;
};

export type LinieEditor = {
  cheie: string;
  rubrica: string;
  produsId: string;
  cantitate: string;
  invelitoare?: string | null;
  culoare?: { ral: string; finisaj?: string | null; grosime?: string | null } | null;
  pozitii?: PozitieEditor[];
};

export type SipcaEditor = {
  linie: string;
  model: string;
  culoare?: string | null;
  varianta: "comanda" | "calcul";
  tronsoane?: { lungimeSipcaM: string; lungimeTronsonM: string; distantaMm: string }[];
};

export type ZonaBEditor = { denumire: string; um: string; cantitate: string; sumaLei: string; contineTva: boolean; preiaInFactura: boolean };

export type StareProduse = {
  mentiuni?: string | null;
  grupaPct?: string;
  precizariZonaB?: string | null;
  invelitori: InvelitoareEditor[];
  linii: LinieEditor[];
  // rubricile de sipca, oricate (M1)
  sipci: SipcaEditor[];
  zonaB: ZonaBEditor[];
};

export type StructuraOferta = {
  cantitati: {
    invelitori: { id: string; mp: string; mpPanotaj: string; mpDirect: string; coli: number; integralPanotata: boolean }[];
    accesoriiMl: { linieId: string; ml: string }[];
    sipci: { id: string; tronsoane: { bucati: number; ml: string }[]; bucatiTotal: number; mlTotal: string }[];
  };
  comandabil: { da: boolean; motive: string[] };
  linii: { id: string; cod: string; um: string; cantitate: string; pachet?: string }[];
  pachete: { id: string; nume: string; tip: string; linii: string[] }[];
  formulareBilka: { nr: number; pachete: string[]; continut: string }[];
  textFormulare: string;
  avertizari: string[];
};

// liniile si invelitorile salvate, asa cum vin in detaliul ofertei (snapshot, fara pret)
export type InvelitoareSalvata = {
  id: string;
  ordine: number;
  rol: string;
  produsId: string | null;
  cod: string;
  denumire: string;
  um: string;
  finisaj: string | null;
  grosime: string | null;
  grup: string | null;
  familie: string | null;
  optiune: string | null;
  culoare: string | null;
  latimeTotalaM: string;
  mpDirect: string | null;
  variantaProfil: string | null;
  montaj: string | null;
  panotaj: { id: string; ordine: number; lungimeM: string; bucati: number }[];
};

export type LinieSalvata = {
  id: string;
  ordine: number;
  rubrica: string;
  produsId: string | null;
  cod: string;
  denumire: string;
  um: string;
  finisaj: string | null;
  grosime: string | null;
  grup: string | null;
  familie: string | null;
  optiune: string | null;
  cantitate: string;
  invelitoareId: string | null;
  culoareRal: string | null;
  culoareFinisaj: string | null;
  culoareGrosime: string | null;
  pozitii: { id: string; ordine: number; lungimeM: string; bucati: number }[];
};

export type SipcaSalvata = {
  id: string;
  ordine: number;
  linieId: string;
  model: string;
  culoare: string | null;
  latimeSipcaMm: string;
  varianta: "COMANDA" | "CALCUL";
  tronsoane: { ordine: number; lungimeSipcaM: string; lungimeTronsonM: string; distantaMm: string }[];
};

export type ZonaBSalvata = { id: string; ordine: number; denumire: string; um: string; cantitate: string; sumaLei: string; contineTva: boolean; preiaInFactura: boolean };

const BAZA_CATALOG_EDITOR = "/api/oferte/catalog";

function cuParametri(cale: string, p: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `${cale}?${s}` : cale;
}

export const apiCatalogEditor = {
  invelitori: () => cerere<{ produse: ProdusEditor[] }>(`${BAZA_CATALOG_EDITOR}/invelitori`),
  referinte: () => cerere<ReferinteEditor>(`${BAZA_CATALOG_EDITOR}/referinte`),
  listaImplicita: (rubrica: string, categorieInvelitoare: string | undefined, cheie: CheieEditor) =>
    cerere<{ produse: (ProdusEditor & { ordine: number; numeLista: string })[]; nerezolvate: { ordine: number; nume: string; candidati: number }[] }>(
      cuParametri(`${BAZA_CATALOG_EDITOR}/liste-implicite`, { rubrica, categorieInvelitoare, ...cheie }),
    ),
  cauta: (q: string, categorie: string | undefined, cheie: CheieEditor) => cerere<{ produse: ProdusEditor[]; total: number }>(cuParametri(`${BAZA_CATALOG_EDITOR}/cauta`, { q, categorie, ...cheie })),
  speciale: (categorie: string, cheie: CheieEditor) => cerere<{ produse: ProdusEditor[] }>(cuParametri(`${BAZA_CATALOG_EDITOR}/speciale`, { categorie, ...cheie })),
  pluvial: (finisaj: string, sistem: string) => cerere<{ implicite: (ProdusEditor & { ordine: number; numeLista: string })[]; nerezolvate: { nume: string }[]; restul: ProdusEditor[] }>(cuParametri(`${BAZA_CATALOG_EDITOR}/pluvial`, { finisaj, sistem })),
  sipca: () => cerere<{ produse: ProdusEditor[] }>(`${BAZA_CATALOG_EDITOR}/sipca`),
};

export const apiProduseOferta = {
  salveaza: (id: string, stare: StareProduse) => cerere<{ oferta: OfertaDetaliu }>(`${BAZA_OFE}/${id}/produse`, { method: "PUT", body: JSON.stringify(stare) }),
};
