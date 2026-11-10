// Numerele pe ecran, in format romanesc (S18): punct la mii, virgula la zecimale -
// "5.211,19 €", "27.850,16 lei", "255,647 mp". O singura functie, folosita de toate
// ecranele; valorile din spate (textele din API, cu punct) nu se schimba.

export function nr(valoare: string | number | null | undefined, zecimale = 2): string {
  if (valoare === null || valoare === undefined || valoare === "") return "—";
  const n = typeof valoare === "number" ? valoare : Number(String(valoare).replace(",", "."));
  if (!Number.isFinite(n)) return String(valoare);
  return n.toLocaleString("ro-RO", { minimumFractionDigits: zecimale, maximumFractionDigits: zecimale });
}

export const lei = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? "—" : `${nr(v, 2)} lei`);
export const euro = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? "—" : `${nr(v, 2)} €`);
export const mp = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? "—" : `${nr(v, 3)} mp`);
export const procent = (v: string | number | null | undefined, zecimale = 2) => (v === null || v === undefined || v === "" ? "—" : `${nr(v, zecimale)} %`);

// un text venit de pe server care contine numere cu punct ("Iberic · 255.647 mp + 1 secundară",
// "249.960 mp"): numerele urmate de unitate trec in forma romaneasca; restul textului neschimbat
export function textRo(text: string | null | undefined): string {
  if (!text) return text ?? "";
  return text.replace(/(\d+)\.(\d+)(?=\s*(mp|ml|lei|€|eur|buc|m)\b)/gi, (_, a, b) => `${Number(a).toLocaleString("ro-RO")},${b}`);
}

// casutele editorului: textul salvat (cu punct) se arata cu virgula; serverul accepta ambele
export const cuVirgula = (v: string | null | undefined) => (v ?? "").replace(".", ",");

// cantitatile: intregi fara zecimale, altfel cu cel mult 3 ("13", "1,5", "180,481")
export function cantitate(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString("ro-RO", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}
