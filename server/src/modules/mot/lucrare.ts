import type { RandVanzari, RezultatOferta } from "./tipuri.js";
import { factorTva, la2, suma, type Suma } from "./zecimal.js";

// Lucrarea (FISA-OFERTARE cap. 2b, cap. 19; ETALON E10): oferta initiala plus
// completarile ei (fiecare cu numar propriu, legata prin seria-numarul initialei).
// In tabelul de vanzari comenzile legate apar una sub alta, iar adaosul net si
// brut se calculeaza pe lucrare, din sumele preturilor de vanzare si ale
// costurilor de achizitie; o completare pe costul nostru scade adaosul lucrarii
// (si comisionul agentului).

export function agregaLucrare(initiala: RezultatOferta, completari: RezultatOferta[], tvaPct: number | Suma): RandVanzari {
  const toate = [initiala, ...completari];
  const vanzare = suma(toate.map((r) => r.vanzari.pretVanzareLei));
  const cost = suma(toate.map((r) => r.vanzari.costAchizitieLei));
  const net = vanzare.minus(cost);
  return {
    pretVanzareLei: la2(vanzare),
    costAchizitieLei: la2(cost),
    adaosNetLei: la2(net),
    adaosBrutLei: la2(net.div(factorTva(tvaPct))),
    tabel: initiala.vanzari.tabel,
    nota: `lucrare: oferta inițială + ${completari.length} ${completari.length === 1 ? "completare" : "completări"}`,
  };
}

export function esteCompletare(r: { completare: boolean; completareLa?: string }): boolean {
  return r.completare || Boolean(r.completareLa);
}
