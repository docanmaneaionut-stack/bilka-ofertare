import type { LinieZonaB, ZonaBCalculata } from "./tipuri.js";
import { factorTva, la2, la4, suma, z, type Suma } from "./zecimal.js";

// Zona B (FISA-OFERTARE cap. 9, 13.2, 13.5; ETALON E07): linii integral manuale,
// in lei, asa cum au fost scrise. Pe oferta apar ca "Supliment la oferta" (anexa
// in lei, cu total). Doar liniile bifate "preia in factura" intra in tabelul de
// facturare, convertite in euro la cursul documentului, cu pretul unitar in lei la
// 4 zecimale. Nimic din zona B nu intra in tabelul de vanzari, iar totalul
// documentului de oferta ramane cel al materialelor.
//
// Totalul in lei al facturii = totalul in lei al ofertei + liniile preluate, in lei
// cu TVA, asa cum au fost scrise sau desfacute (lei-ul e ce plateste clientul);
// totalul EUR al facturii x curs poate diferi cu cativa bani - aceeasi logica ca R6.

export function calculeazaZonaB(
  linii: LinieZonaB[],
  cursBnr: Suma,
  tvaPct: number | Suma,
  documentFaraTvaEur: Suma,
  documentTotalLei: Suma,
): ZonaBCalculata {
  const ftva = factorTva(tvaPct);
  const supliment = linii.map((l) => ({ denumire: l.denumire, sumaLei: la2(l.sumaLei) }));
  const inFactura = linii
    .filter((l) => l.preiaInFactura)
    .map((l) => {
      const scrisa = z(l.sumaLei);
      const leiFaraTva = z(l.contineTva ? la2(scrisa.div(ftva)) : la2(scrisa));
      const leiCuTva = l.contineTva ? la2(scrisa) : la2(scrisa.times(ftva));
      return {
        denumire: l.denumire,
        um: l.um,
        cantitate: z(l.cantitate).toString(),
        pretUnitarLeiFaraTva: la4(leiFaraTva.div(z(l.cantitate))),
        leiFaraTva: la2(leiFaraTva),
        leiCuTva,
        eurFaraTva: la2(leiFaraTva.div(z(cursBnr))),
      };
    });
  const faraTvaEur = z(documentFaraTvaEur).plus(suma(inFactura.map((f) => f.eurFaraTva)));
  const tvaEur = z(la2(faraTvaEur.times(z(tvaPct).div(100))));
  return {
    supliment,
    suplimentTotalLei: la2(suma(supliment.map((s) => s.sumaLei))),
    inFactura,
    tabelFacturare: {
      faraTvaEur: la2(faraTvaEur),
      tvaEur: la2(tvaEur),
      cuTvaEur: la2(faraTvaEur.plus(tvaEur)),
      totalLei: la2(z(documentTotalLei).plus(suma(inFactura.map((f) => f.leiCuTva)))),
    },
  };
}
