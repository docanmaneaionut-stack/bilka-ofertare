// Configuratia ecranelor generice pentru tabelele de referinta (cele cinci
// CSV-uri auxiliare + categoriile de oferta). Coloanele copiaza coloanele
// CSV; tipurile dicteaza ce control se afiseaza in celula.

export type TipColoana = "text" | "numar" | "bool" | "select";

export type Coloana = {
  cheie: string;
  eticheta: string;
  tip: TipColoana;
  obligatoriu?: boolean;
  optiuni?: { valoare: string; eticheta: string }[];
  latime?: string;
  implicit?: unknown;
};

export type ConfigReferinta = {
  cheie: string;
  cale: string;
  titlu: string;
  titluScurt: string;
  descriere: string;
  coloane: Coloana[];
};

const ACTIV: Coloana = { cheie: "activ", eticheta: "Activ", tip: "bool", implicit: true, latime: "90px" };
const FURNIZOR: Coloana = { cheie: "furnizor", eticheta: "Furnizor", tip: "text", obligatoriu: true, implicit: "Bilka" };

export const REFERINTE: ConfigReferinta[] = [
  {
    cheie: "culori",
    cale: "culori-finisaj-grosime",
    titlu: "Culori pe finisaj × grosime",
    titluScurt: "Culori",
    descriere:
      "Ce culori are fiecare finisaj la fiecare grosime (REGULI-CULORI-BILKA). O culoare greșită se dezactivează, nu se șterge — iese din cascadă, rămâne în istoric.",
    coloane: [
      FURNIZOR,
      { cheie: "finisaj", eticheta: "Finisaj", tip: "text", obligatoriu: true },
      { cheie: "grosime", eticheta: "Grosime", tip: "text", obligatoriu: true },
      { cheie: "culoare", eticheta: "Culoare", tip: "text", obligatoriu: true },
      ACTIV,
    ],
  },
  {
    cheie: "garantii",
    cale: "garantii-finisaj-grosime",
    titlu: "Garanții și straturi pe finisaj × grosime",
    titluScurt: "Garanții",
    descriere:
      "Ani de garanție culoare / coroziune, strat de zinc (g/mp) și strat de vopsea (µm exterior / interior). Rândurile de pluvial nu au grosime — se potrivesc doar pe finisaj (grosimea lipsă apare „—”). Garanția la culoare lipsă (Magnelis, Aluzinc) înseamnă „fără garanție la culoare”, nu zero ani.",
    coloane: [
      FURNIZOR,
      { cheie: "finisaj", eticheta: "Finisaj", tip: "text", obligatoriu: true },
      { cheie: "grosime", eticheta: "Grosime", tip: "text" },
      { cheie: "garantieCuloareAni", eticheta: "Garanție culoare (ani)", tip: "numar", latime: "140px" },
      { cheie: "garantieCoroziuneAni", eticheta: "Garanție coroziune (ani)", tip: "numar", obligatoriu: true, latime: "140px" },
      { cheie: "stratZincGMp", eticheta: "Zinc (g/mp)", tip: "numar", latime: "120px" },
      { cheie: "stratVopseaUmExtInt", eticheta: "Vopsea (µm ext / int)", tip: "text", latime: "150px" },
      ACTIV,
    ],
  },
  {
    cheie: "variante-profil",
    cale: "variante-profil",
    titlu: "Variante de profil",
    titluScurt: "Variante profil",
    descriere: "Variantele de profil ale fiecărui model, cu restricțiile lor (ex. Flat și Double Line fără 0,60).",
    coloane: [
      FURNIZOR,
      { cheie: "model", eticheta: "Model", tip: "text", obligatoriu: true },
      { cheie: "variantaProfil", eticheta: "Variantă de profil", tip: "text", obligatoriu: true },
      { cheie: "restrictii", eticheta: "Restricții", tip: "text" },
      { cheie: "listaSursa", eticheta: "Lista sursă", tip: "text", latime: "110px" },
      ACTIV,
    ],
  },
  {
    cheie: "liste-implicite",
    cale: "liste-implicite-oferta",
    titlu: "Liste implicite pe rubrică",
    titluScurt: "Liste implicite",
    descriere: "Ce produse apar direct în fiecare rubrică a ofertei, pe categorie de învelitoare (FISA-OFERTARE cap. 4 și 7).",
    coloane: [
      FURNIZOR,
      { cheie: "rubrica", eticheta: "Rubrică", tip: "text", obligatoriu: true },
      { cheie: "categorieInvelitoare", eticheta: "Categorie învelitoare", tip: "text", obligatoriu: true },
      { cheie: "ordine", eticheta: "Ordine", tip: "numar", obligatoriu: true, latime: "100px" },
      { cheie: "produs", eticheta: "Produs", tip: "text", obligatoriu: true },
      ACTIV,
    ],
  },
  {
    cheie: "trepte",
    cale: "trepte-desfasurata",
    titlu: "Trepte D pentru desfășurată",
    titluScurt: "Trepte D",
    descriere: "Încadrarea desfășuratelor pe trepte D01–D25 (pop-up-ul de la accesoriile speciale).",
    coloane: [
      FURNIZOR,
      { cheie: "treapta", eticheta: "Treaptă", tip: "text", obligatoriu: true, latime: "110px" },
      { cheie: "deLaMm", eticheta: "De la (mm)", tip: "numar", obligatoriu: true, latime: "120px" },
      { cheie: "panaLaMm", eticheta: "Până la (mm)", tip: "numar", obligatoriu: true, latime: "120px" },
      { cheie: "denumireBilka", eticheta: "Denumire Bilka", tip: "text", obligatoriu: true },
      ACTIV,
    ],
  },
  {
    cheie: "categorii-oferta",
    cale: "categorii-oferta",
    titlu: "Categoriile (rubricile) de ofertă",
    titluScurt: "Rubrici ofertă",
    descriere:
      "Rubricile comune peste compartimente, în ordinea de pe ofertă (FISA-OFERTARE „Ordinea rubricilor pe ofertă”). Zona B = lemn, feronerie, manoperă.",
    coloane: [
      { cheie: "denumire", eticheta: "Denumire", tip: "text", obligatoriu: true },
      {
        cheie: "zona",
        eticheta: "Zonă",
        tip: "select",
        obligatoriu: true,
        implicit: "A",
        latime: "110px",
        optiuni: [
          { valoare: "A", eticheta: "A" },
          { valoare: "B", eticheta: "B" },
        ],
      },
      { cheie: "ordine", eticheta: "Ordine", tip: "numar", obligatoriu: true, latime: "100px", implicit: 0 },
    ],
  },
];

// (S14) listele de optiuni configurabile: motivele completarii (cap. 2b), sursa clientului (cap. 2)
REFERINTE.push({
  cheie: "optiuni-liste",
  cale: "optiuni-liste",
  titlu: "Liste de opțiuni (motivele completării, sursa clientului)",
  titluScurt: "Liste de opțiuni",
  descriere:
    "Valorile din listele derulante ale ofertei: „motiv_completare” (cap. 2b) și „sursa_client” (cap. 2). Valorile inițiale vin din docs/import/configurare/optiuni-liste.csv prin npm run seed; aici se adaugă, se reordonează sau se dezactivează — nimic nu se șterge.",
  coloane: [
    {
      cheie: "lista",
      eticheta: "Lista",
      tip: "select",
      obligatoriu: true,
      implicit: "motiv_completare",
      latime: "180px",
      optiuni: [
        { valoare: "motiv_completare", eticheta: "motiv_completare" },
        { valoare: "sursa_client", eticheta: "sursa_client" },
      ],
    },
    { cheie: "valoare", eticheta: "Valoare", tip: "text", obligatoriu: true },
    { cheie: "ordine", eticheta: "Ordine", tip: "numar", obligatoriu: true, latime: "100px", implicit: 0 },
    ACTIV,
  ],
});

// (S16b) corespondenta produs -> numele de pe formularul de comanda Bilka
REFERINTE.push({
  cheie: "corespondenta-formular-bilka",
  cale: "corespondenta-formular-bilka",
  titlu: "Formular Bilka — corespondența numelor",
  titluScurt: "Formular Bilka",
  descriere:
    "Numele de pe rândurile formularului de comandă Bilka pentru fiecare produs: cheia = codul de ierarhie întreg sau prefixul familiei (5 caractere); cuvântul de deosebire se caută în denumire, varianta de profil, modelul șipcii sau unitatea de măsură (convexă / concavă, coamă / streașină, BUC la tabla plană ca accesoriu); „{RAL}” în nume = culoarea liniei. Starea „de verificat” = potrivire hotărâtă de Code la S16b, de controlat aici. Valorile inițiale vin din docs/import/configurare/corespondenta-formular-bilka.csv prin npm run seed. Numele se verifică la fiecare generare pe listele șablonului firmei.",
  coloane: [
    FURNIZOR,
    { cheie: "cheie", eticheta: "Cod / prefix", tip: "text", obligatoriu: true, latime: "130px" },
    { cheie: "cuvant", eticheta: "Cuvânt de deosebire", tip: "text", latime: "150px", implicit: "" },
    { cheie: "numeFormular", eticheta: "Numele pe formular", tip: "text", obligatoriu: true },
    {
      cheie: "stare",
      eticheta: "Stare",
      tip: "select",
      obligatoriu: true,
      implicit: "automat",
      latime: "130px",
      optiuni: [
        { valoare: "automat", eticheta: "automat" },
        { valoare: "de_verificat", eticheta: "de verificat" },
      ],
    },
    { cheie: "observatie", eticheta: "Observație", tip: "text" },
    ACTIV,
  ],
});

export function gasesteReferinta(cheie: string | undefined) {
  return REFERINTE.find((r) => r.cheie === cheie);
}
