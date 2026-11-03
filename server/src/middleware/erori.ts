import type { ErrorRequestHandler } from "express";
import { ZodError, type z } from "zod";
import { Prisma } from "@prisma/client";
import { EroareImport } from "../modules/imp/analiza.js";

// textul ridicat de trigger-ul de imutabilitate din baza (migrarea 3)
const MESAJ_ARHIVATA = "arhivata nu se modifica";

// S17b BUG-4: validarile spun campul si motivul, in romana (FISA-OFERTARE Capitolul 0):
// raspunsul 400 poarta `eroare` ("Telefon: conține litere") si `campuri`
// ([{ camp: "client.telefon", eticheta: "Telefon", mesaj: "conține litere" }]),
// ca ecranul sa le arate la camp. Etichetele campurilor cunoscute; restul raman
// cu numele lor tehnic.
const ETICHETE: Record<string, string> = {
  nume: "Nume",
  telefon: "Telefon",
  adresa: "Adresă",
  adresaLucrarii: "Adresa lucrării",
  localitate: "Localitate",
  email: "E-mail",
  observatii: "Observații",
  client: "Client",
  antet: "Antet",
  data: "Data ofertei",
  sursaClient: "Sursa clientului",
  note: "Note",
  mentiuni: "Mențiuni",
  status: "Status",
  avansLei: "Avans (lei)",
  comisionRecomandareLei: "Comision recomandare (lei)",
  montatorId: "Montator",
  montatorNou: "Montator nou",
  tip: "Tip",
  tinta: "Țintă",
  valoare: "Valoare",
  modPrezentare: "Mod de prezentare",
  discountGeneralPct: "Discount general %",
  discountImplicitPct: "Discount implicit pe linie %",
  discountPct: "Discount %",
  pretFix: "Preț fix",
  grupaPct: "Grupă %",
  linii: "Linia",
  invelitori: "Învelitoarea",
  sipci: "Șipca",
  zonaB: "Zona B, linia",
  cantitate: "Cantitate",
  produsId: "Produs",
  culoare: "Culoare",
  ral: "RAL",
  finisaj: "Finisaj",
  grosime: "Grosime",
  panotaj: "Panotaj, rândul",
  pozitii: "Poziții, rândul",
  tronsoane: "Tronsoane, rândul",
  lungimeM: "Lungime (m)",
  bucati: "Bucăți",
  lungimeSipcaM: "Lungime șipcă (m)",
  lungimeTronsonM: "Lungime tronson (m)",
  distantaMm: "Distanță (mm)",
  model: "Model",
  varianta: "Variantă",
  variantaProfil: "Variantă de profil",
  montaj: "Montaj",
  suprafataMp: "Suprafață (mp)",
  denumire: "Denumire",
  um: "UM",
  sumaLei: "Sumă (lei)",
  text: "Text",
  motiv: "Motiv",
  precizari: "Precizări",
  sursaId: "Oferta-sursă",
  initialaId: "Oferta inițială",
  ultimulNumar: "Ultimul număr",
  parola: "Parolă",
  parolaNoua: "Parola nouă",
  rubrica: "Rubrică",
  categorieInvelitoare: "Categoria învelitorii",
  q: "Căutare",
};

const TIPURI: Record<string, string> = { string: "text", number: "număr", boolean: "da / nu", object: "obiect", array: "listă", date: "dată" };

function etichetaCaii(cale: PropertyKey[]): string {
  const parti: string[] = [];
  for (const p of cale) {
    if (typeof p === "number") parti[parti.length - 1] = `${parti[parti.length - 1] ?? "Elementul"} ${p + 1}`;
    else parti.push(ETICHETE[String(p)] ?? String(p));
  }
  return parti.join(" · ") || "Date";
}

function motivul(issue: z.core.$ZodIssue): string {
  const i = issue as z.core.$ZodIssue & { origin?: string; minimum?: number | bigint; maximum?: number | bigint; expected?: string; input?: unknown; format?: string; values?: unknown[]; keys?: string[]; inclusive?: boolean };
  switch (issue.code) {
    case "invalid_type":
      return i.input === undefined || i.input === null ? "lipsește" : `trebuie să fie ${TIPURI[i.expected ?? ""] ?? i.expected}`;
    case "too_small": {
      const min = Number(i.minimum);
      if (i.origin === "string") return min <= 1 ? "e gol" : `prea scurt (minim ${min} caractere)`;
      if (i.origin === "array") return `prea puține (minim ${min})`;
      return `prea mic (minim ${min})`;
    }
    case "too_big": {
      const max = Number(i.maximum);
      if (i.origin === "string") return `prea lung (maxim ${max} caractere)`;
      if (i.origin === "array") return `prea multe (maxim ${max})`;
      return `prea mare (maxim ${max})`;
    }
    case "invalid_format":
      if (i.format === "email") return "nu e o adresă de e-mail validă";
      if (i.format === "date" || i.format === "datetime") return "dată invalidă";
      return "format invalid";
    case "invalid_value":
      return `valoare neacceptată${Array.isArray(i.values) && i.values.length <= 12 ? ` (permise: ${i.values.map(String).join(", ")})` : ""}`;
    case "unrecognized_keys":
      return `câmpuri necunoscute: ${(i.keys ?? []).join(", ")}`;
    case "invalid_union":
      return "valoare invalidă";
    case "not_multiple_of":
      return "nu respectă pasul";
    default:
      return issue.message;
  }
}

export interface CampInvalid {
  camp: string;
  eticheta: string;
  mesaj: string;
}

export function campuriDinZod(err: ZodError): CampInvalid[] {
  const campuri: CampInvalid[] = [];
  for (const issue of err.issues) {
    const camp = issue.path.map(String).join(".");
    const eticheta = etichetaCaii(issue.path);
    const mesaj = motivul(issue);
    if (campuri.some((c) => c.camp === camp && c.mesaj === mesaj)) continue;
    campuri.push({ camp, eticheta, mesaj });
  }
  return campuri;
}

export const gestioneazaErori: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const campuri = campuriDinZod(err);
    res.status(400).json({ eroare: campuri.map((c) => `${c.eticheta}: ${c.mesaj}`).join("; ") || "Date invalide", campuri });
    return;
  }

  if (err instanceof EroareImport) {
    res.status(err.status).json({ eroare: err.message });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const campuri = (err.meta?.target as string[] | undefined)?.join(", ") ?? "";
      res.status(409).json({ eroare: `Exista deja o intrare cu aceeasi valoare (${campuri})` });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ eroare: "Nu exista" });
      return;
    }
  }

  if (err instanceof Error && err.message.includes(MESAJ_ARHIVATA)) {
    res.status(409).json({ eroare: "Lista de preț arhivată nu se modifică; revenirea la ea = reimportul fișierelor ca versiune nouă" });
    return;
  }

  console.error(err);
  res.status(500).json({ eroare: "Eroare neasteptata" });
};
