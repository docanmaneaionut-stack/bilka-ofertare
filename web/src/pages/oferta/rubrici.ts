import type { StructuraOferta } from "../../api";
import { nr } from "../../lib/numere";
import { areCantitate, invelitoriTrimise, RUBRICI, type StareEditor } from "./editor";

// S29 (MODIFICAREA M12): rubricile filei "Produse" - bara de rubrici (cu numarul produselor care au cantitate)
// si textul de pe banda unei rubrici stranse. Doar citeste starea editorului; nu schimba nimic in oferta.

export type IdRubrica = "invelitori" | "standard" | "speciale" | "fixare" | "pluvial" | "sipca" | "lungimi" | "zonaB";

// ordinea clasica a rubricilor (FISA-OFERTARE, "Ordinea rubricilor"); "scurt" = numele din bara
export const RUBRICI_BARA: { id: IdRubrica; scurt: string; rubrica: string | null }[] = [
  { id: "invelitori", scurt: "Învelitori", rubrica: null },
  { id: "standard", scurt: "Accesorii standard", rubrica: RUBRICI.standard },
  { id: "speciale", scurt: "Speciale 2 ML", rubrica: RUBRICI.speciale2ml },
  { id: "fixare", scurt: "Fixare și etanșare", rubrica: RUBRICI.fixare },
  { id: "pluvial", scurt: "Sistem pluvial", rubrica: RUBRICI.pluvial },
  { id: "sipca", scurt: "Șipcă gard", rubrica: RUBRICI.sipca },
  { id: "lungimi", scurt: "La lungimi", rubrica: RUBRICI.lungimi },
  { id: "zonaB", scurt: "Zona B", rubrica: null },
];

// id-ul rubricii pe ecran (saltul din bara de rubrici, saltul la rubrica atunci cand ceva blocheaza)
export const idRubricaPeEcran = (id: IdRubrica) => `rubrica-${id}`;

const liniiZonaB = (s: StareEditor) => s.zonaB.filter((z) => z.denumire.trim() && Number(z.cantitate.replace(",", ".")) > 0).length;

// cate produse AU cantitate in fiecare rubrica (randurile fara cantitate nu se numara)
export function numarPeRubrici(s: StareEditor): Record<IdRubrica, number> {
  const pe = (rubrica: string) => s.linii.filter((l) => l.rubrica === rubrica && (rubrica === RUBRICI.sipca ? Boolean(l.produs.id) : areCantitate(l))).length;
  return {
    invelitori: invelitoriTrimise(s).length,
    standard: pe(RUBRICI.standard),
    speciale: pe(RUBRICI.speciale2ml),
    fixare: pe(RUBRICI.fixare),
    pluvial: pe(RUBRICI.pluvial),
    sipca: pe(RUBRICI.sipca),
    lungimi: pe(RUBRICI.lungimi),
    zonaB: liniiZonaB(s),
  };
}

// ce are completat rubrica - textul de pe banda ei cand e stransa
export function rezumatRubrica(id: IdRubrica, s: StareEditor, structura: StructuraOferta | null): string {
  const n = numarPeRubrici(s)[id];
  if (n === 0) return "nimic completat";
  if (id === "invelitori") {
    const principala = invelitoriTrimise(s)[0];
    const calc = structura?.cantitati.invelitori[0] ?? null;
    const bucati = [principala.model, principala.finisaj, principala.grosime, principala.culoare, calc ? `${nr(calc.mp, 3)} mp` : null, calc ? `${calc.coli} coli` : null].filter(Boolean);
    return n > 1 ? `${bucati.join(" · ")} · + ${n - 1} ${n === 2 ? "secundară" : "secundare"}` : bucati.join(" · ");
  }
  if (id === "zonaB") return `${n} ${n === 1 ? "linie" : "linii"}`;
  return `${n} ${n === 1 ? "produs" : "produse"}`;
}
