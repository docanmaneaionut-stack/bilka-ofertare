import { Decimal } from "decimal.js";

// Aritmetica zecimala a motorului de calcul (MOT). Toate sumele circula ca text
// ("6.86"), niciodata ca numar binar JavaScript. Rotunjirea e "half-up"
// (0,005 -> 0,01; la negative, departe de zero), conform ETALON.md R2-R8 si
// FISA-OFERTARE 3.6: preturi si valori la 2 zecimale, cantitati mp / ml la 3,
// cursuri la 4. Precizia intermediara e mare (40 cifre) ca impartirile
// (coeficientul de prezentare, cursul) sa nu piarda nimic inainte de rotunjire.
export const Zecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -30,
  toExpPos: 40,
});

export type Zecimal = Decimal;
export type Suma = string;

// accepta "6.79", "6,79", 6.79 sau un Zecimal; refuza gol / text invalid
export function z(v: Suma | number | Decimal): Zecimal {
  if (v instanceof Decimal) return new Zecimal(v);
  if (typeof v === "number") return new Zecimal(v);
  const t = v.trim().replace(/\s/g, "").replace(",", ".").replace(/^−/, "-");
  if (t === "" || !/^-?\d+(\.\d+)?$/.test(t)) {
    throw new Error(`Suma invalida: "${v}"`);
  }
  return new Zecimal(t);
}

export const ZERO: Zecimal = new Zecimal(0);

// rotunjire half-up la numarul de zecimale cerut; rezultatul e text cu exact
// atatea zecimale ("4.90", nu "4.9")
export function rotunjeste(v: Suma | number | Decimal, zecimale: 0 | 2 | 3 | 4 | 6): Suma {
  return z(v).toFixed(zecimale, Decimal.ROUND_HALF_UP);
}

export const la2 = (v: Suma | number | Decimal): Suma => rotunjeste(v, 2);
export const la3 = (v: Suma | number | Decimal): Suma => rotunjeste(v, 3);
export const la4 = (v: Suma | number | Decimal): Suma => rotunjeste(v, 4);

// R1: cursul de achizitie = cursul BNR x 1,01, 4 zecimale (practica Bilka,
// verificata pe 21 de facturi - docs/VERIFICARE-FACTURI-BILKA.md §2)
export const FACTOR_CURS_ACHIZITIE = "1.01";

export function cursAchizitie(cursBnr: Suma): Suma {
  return la4(z(cursBnr).times(FACTOR_CURS_ACHIZITIE));
}

// conversii EUR <-> lei la un curs dat, 2 zecimale
export function eurInLei(eur: Suma | Decimal, curs: Suma): Suma {
  return la2(z(eur).times(z(curs)));
}

export function leiInEur(lei: Suma | Decimal, curs: Suma): Suma {
  return la2(z(lei).div(z(curs)));
}

// factorul TVA: 21 -> 1.21
export function factorTva(tvaPct: number | Suma): Zecimal {
  return z(100).plus(z(tvaPct)).div(100);
}

export function cuTva(faraTva: Suma | Decimal, tvaPct: number | Suma): Suma {
  return la2(z(faraTva).times(factorTva(tvaPct)));
}

export function faraTva(cuTvaSuma: Suma | Decimal, tvaPct: number | Suma): Suma {
  return la2(z(cuTvaSuma).div(factorTva(tvaPct)));
}

// R4: dintr-un total cu TVA (2 zecimale) se obtine perechea (fara TVA, TVA)
// pentru care fara TVA + TVA = cu TVA, exact. TVA-ul e diferenta, nu un
// procent rotunjit separat.
export function desparteTva(totalCuTva: Suma | Decimal, tvaPct: number | Suma): { faraTva: Suma; tva: Suma; cuTva: Suma } {
  const total = z(totalCuTva);
  const net = z(faraTva(total, tvaPct));
  return { faraTva: la2(net), tva: la2(total.minus(net)), cuTva: la2(total) };
}

// R8 / FISA-OFERTARE 3.6: cantitatile la mp si ml se scriu cu 3 zecimale
// ("6.000"), cele la bucata (buc, cutie, rola...) ca intreg ("13")
export function esteUmCuZecimale(um: string): boolean {
  const u = um.trim().toLowerCase();
  return u === "mp" || u === "m2" || u === "ml" || u === "m";
}

export function formateazaCantitate(cantitate: Suma | Decimal, um: string): Suma {
  return esteUmCuZecimale(um) ? la3(cantitate) : rotunjeste(cantitate, 0);
}

export function suma(valori: Iterable<Suma | Decimal>): Zecimal {
  let total = ZERO;
  for (const v of valori) total = total.plus(z(v));
  return total;
}
