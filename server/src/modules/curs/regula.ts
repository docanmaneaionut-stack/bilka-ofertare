// Regula cursului zilei (FISA-OFERTARE 11.8): BNR publica la 13:00 - pana atunci
// cursul zilei e cel din ziua precedenta (practica Bilka). Functii pure, cu ceasul
// ca parametru, ca regula sa se poata testa cu un ceas controlat.

export const FUS_ORAR = "Europe/Bucharest";
export const ORA_PUBLICARE_BNR = 13;

export interface CursZi {
  // AAAA-LL-ZZ, data de publicare BNR
  data: string;
  curs: string;
  sursa: string;
}

// data si ora locala (Romania) a unui moment
export function localRomania(moment: Date): { data: string; ora: number } {
  const parti = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUS_ORAR,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(moment);
  const ia = (tip: string) => parti.find((p) => p.type === tip)?.value ?? "";
  const ora = Number(ia("hour")) % 24;
  return { data: `${ia("year")}-${ia("month")}-${ia("day")}`, ora };
}

export function ziuaPrecedenta(dataIso: string): string {
  const d = new Date(`${dataIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// data limita a cursului valabil la un moment dat: azi dupa 13:00, altfel ieri
export function dataLimitaCurs(moment: Date): string {
  const { data, ora } = localRomania(moment);
  return ora >= ORA_PUBLICARE_BNR ? data : ziuaPrecedenta(data);
}

// cursul valabil la un moment dat: ultimul curs publicat cu data <= limita
// (weekendul si sarbatorile cad pe ultima data publicata)
export function cursPentruMoment(moment: Date, cursuri: CursZi[]): CursZi | null {
  const limita = dataLimitaCurs(moment);
  const valabile = cursuri.filter((c) => c.data <= limita).sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  return valabile[0] ?? null;
}

// cursul zilei lipseste din tabel desi BNR l-a publicat deja (dupa 13:00)?
export function lipsesteCursulZilei(moment: Date, cursuri: CursZi[]): boolean {
  const { data, ora } = localRomania(moment);
  if (ora < ORA_PUBLICARE_BNR) return false;
  return !cursuri.some((c) => c.data === data);
}

// parsarea fisierului BNR (nbrfxrates.xml sau fisierul anual): toate cursurile EUR
export function parseazaBnrXml(xml: string, moneda = "EUR"): CursZi[] {
  const rezultat: CursZi[] = [];
  const cuburi = xml.matchAll(/<Cube[^>]*date="(\d{4}-\d{2}-\d{2})"[^>]*>([\s\S]*?)<\/Cube>/g);
  for (const cub of cuburi) {
    const m = new RegExp(`<Rate[^>]*currency="${moneda}"[^>]*>([\\d.]+)<\\/Rate>`).exec(cub[2]);
    if (m) rezultat.push({ data: cub[1], curs: Number(m[1]).toFixed(4), sursa: "BNR" });
  }
  return rezultat;
}
