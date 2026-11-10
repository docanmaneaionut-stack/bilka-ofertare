// Normalizarea textului pentru cautare (S25, BUG-10), aceeasi regula ca pe server
// (server/src/lib/normalizare.ts): minuscule; s/t cu virgula si cu sedila -> s / t;
// a, a cu caciula / circumflex -> a; i din i -> i. Se aplica si pe textul cautat si pe
// textul comparat, ca potrivirea sa fie fara diacritice in ambele sensuri.

const DIACRITICE: Record<string, string> = { ș: "s", ş: "s", ț: "t", ţ: "t", ă: "a", â: "a", î: "i", Ș: "s", Ş: "s", Ț: "t", Ţ: "t", Ă: "a", Â: "a", Î: "i" };

export function normalizeazaText(text: string): string {
  return text
    .replace(/[șşțţăâîȘŞȚŢĂÂÎ]/g, (c) => DIACRITICE[c] ?? c)
    .toLowerCase()
    .trim();
}

// cuvintele cautarii, toate trebuie sa apara (ca sub-siruri) in textul comparat
export function potriveste(text: string, cautare: string): boolean {
  const t = normalizeazaText(text);
  return normalizeazaText(cautare)
    .split(/\s+/)
    .filter(Boolean)
    .every((c) => t.includes(c));
}
