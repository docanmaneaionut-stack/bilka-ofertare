import type { OfertaDetaliu } from "../../api";
import { lei } from "../../lib/numere";

// S29 (MODIFICAREA M12, docs/MODIFICARI-S29.md): pagina ofertei pe trei file. Aici e doar logica fara ecran:
// ce fila e in adresa, Alt + 1 / 2 / 3, rezumatul si punctul rosu de sub numele filei, starea salvarii.

export type Fila = "generale" | "produse" | "preturi";

// "scurt" = numele filei pe telefon (sub 400 px), ca sa nu apara taiat
export const FILE: { id: Fila; nr: number; nume: string; scurt: string; ancora: string }[] = [
  { id: "generale", nr: 1, nume: "Date generale", scurt: "Date generale", ancora: "date-generale" },
  { id: "produse", nr: 2, nume: "Produse", scurt: "Produse", ancora: "produse" },
  { id: "preturi", nr: 3, nume: "Prețuri și documente", scurt: "Prețuri", ancora: "preturi" },
];

// fila in care se deschide oferta cand adresa nu spune alta
export const FILA_IMPLICITA: Fila = "produse";

export const ancoraFilei = (f: Fila): string => `#${FILE.find((x) => x.id === f)!.ancora}`;

export function filaDinAncora(hash: string): Fila | null {
  const a = hash.replace(/^#/, "");
  return FILE.find((f) => f.ancora === a)?.id ?? null;
}

// Alt + 1 / 2 / 3 (si de pe tastatura numerica)
export function filaDinTasta(e: { altKey: boolean; ctrlKey: boolean; metaKey: boolean; code: string }): Fila | null {
  if (!e.altKey || e.ctrlKey || e.metaKey) return null;
  const m = /^(?:Digit|Numpad)([123])$/.exec(e.code);
  return m ? FILE[Number(m[1]) - 1].id : null;
}

export type RezumatFila = { text: string; lipsa: string | null };

// Sub numele fiecarei file: pe scurt ce e inauntru. "lipsa" (punctul rosu) = ceva din fila ar opri
// "Comandat" sau e o eroare; atunci textul spune ce lipseste. Pe o oferta comandata punctul nu apare.
// S29b: cat salvarea produselor e refuzata ("produseNesalvate"), fila Produse are punctul rosu si spune „nesalvat”.
export function rezumatFile(o: OfertaDetaliu, extra: { produseNesalvate?: boolean } = {}): Record<Fila, RezumatFila> {
  const comandata = o.status === "COMANDAT";
  const cu = (text: string, lipsa: string | null): RezumatFila => (lipsa && !comandata ? { text: lipsa, lipsa } : { text, lipsa: null });

  const invelitori = o.invelitori.length;
  const produse = (o.linii as { rubrica: string }[]).filter((l) => l.rubrica !== "Învelitori").length;
  const bucati = [invelitori > 0 ? `${invelitori} ${invelitori === 1 ? "învelitoare" : "învelitori"}` : null, produse > 0 ? `${produse} ${produse === 1 ? "produs" : "produse"}` : null].filter(Boolean);
  const s = o.structura ?? null;
  const lipsaProduse = extra.produseNesalvate ? "nesalvat" : s?.eroare ? "eroare de calcul" : s?.rezultat && !s.rezultat.comandabil.da ? "nu se poate comanda" : null;

  const p = o.preturi ?? null;
  const total = p?.rezultat ? lei(p.rezultat.totaluri.documentTotalLei) : "fără prețuri încă";
  const lipsaPreturi = p?.eroare ? "eroare de preț" : p?.rezultat && p.rezultat.garda.aplicata && !p.rezultat.garda.respectata ? "linii sub achiziție" : null;

  return {
    generale: cu(comandata ? "comandată" : "complet", o.client.telefon ? null : "fără telefon"),
    produse: cu(bucati.length ? bucati.join(" · ") : "niciun produs", lipsaProduse),
    preturi: cu(total, lipsaPreturi),
  };
}

export type StareSalvareProduse = "salvat" | "modificat" | "se-salveaza" | "eroare";

// starea din randul ofertei: produsele se salveaza singure; antetul si clientul - cu "Salvează"
export function stareaSalvarii(s: { produse: StareSalvareProduse; antetModificat: boolean; seSalveaza: boolean }): { text: string; fel: "salvat" | "nesalvat" | "lucru" | "eroare" } {
  // S29b: salvarea refuzata se spune limpede - nimic din ce s-a scris de atunci nu e in oferta
  if (s.produse === "eroare") return { text: "NU e salvată", fel: "eroare" };
  if (s.seSalveaza || s.produse === "se-salveaza") return { text: "se salvează…", fel: "lucru" };
  if (s.antetModificat || s.produse === "modificat") return { text: "nesalvat", fel: "nesalvat" };
  return { text: "salvat", fel: "salvat" };
}

// S29b (decizia 1): la plecarea din pagina se intreaba doar cand ramane ceva pe care pagina nu-l poate salva
// singura: salvarea refuzata, un rand incomplet (nu e in oferta), datele generale nesalvate. Ce asteapta doar
// salvarea automata pleaca singur spre server la plecare. Intoarce textul intrebarii sau null.
export function motivPlecare(s: { produse: StareSalvareProduse; antetModificat: boolean; randIncomplet: boolean }): string | null {
  const coada = " Pleci din pagină fără ele?";
  if (s.produse === "eroare") return `Oferta NU e salvată: un rând din fila Produse trebuie corectat, iar ce ai scris de atunci nu e în ofertă.${coada.replace("ele", "aceste modificări")}`;
  if (s.randIncomplet) return `Un rând incomplet din fila Produse (lungime fără bucăți sau invers) nu e în ofertă.${coada.replace("fără ele", "fără să-l completezi")}`;
  if (s.antetModificat) return `Modificările din fila Date generale (antet, client) nu sunt salvate.${coada}`;
  return null;
}
