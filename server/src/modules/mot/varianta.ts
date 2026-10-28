import type { IntrareOferta, ProdusOferta, RezultatOferta } from "./tipuri.js";

// Varianta de pret (FISA-OFERTARE 11.7; ETALON E09): "Creeaza varianta" - aceeasi
// oferta, acelasi numar, cu alt model / finisaj / grosime sau alte produse, care
// pastreaza adaosul % al variantei de baza (procent cu 4 zecimale, in lei) aplicat
// pe noile preturi de achizitie si se recalculeaza. Inlocuirile vin de la apelant
// (catalogul): cod vechi -> produsul nou; accesoriile legate de o invelitoare
// urmeaza cheia ei, deci apelantul le inlocuieste si pe ele. Cursurile, contul,
// grupa, modul de prezentare si cantitatile raman.

export type Inlocuiri = Record<string, ProdusOferta>;

export function construiesteVarianta(baza: IntrareOferta, rezultatBaza: RezultatOferta, inlocuiri: Inlocuiri): IntrareOferta {
  const codNou = (cod: string) => inlocuiri[cod]?.cod ?? cod;
  const produsNou = (p: ProdusOferta) => (inlocuiri[p.cod] ? { ...inlocuiri[p.cod] } : { ...p });

  const varianta: IntrareOferta = structuredClone(baza);
  varianta.invelitori = baza.invelitori.map((inv) => ({
    ...structuredClone(inv),
    id: inv.id === inv.produs.cod ? codNou(inv.produs.cod) : inv.id,
    produs: produsNou(inv.produs),
  }));
  varianta.linii = baza.linii.map((l) => {
    const linie = { ...structuredClone(l), produs: produsNou(l.produs) };
    if (l.invelitoare !== undefined) linie.invelitoare = codNou(l.invelitoare);
    return linie;
  });
  if (baza.sipca) varianta.sipca = { ...structuredClone(baza.sipca), produsCod: codNou(baza.sipca.produsCod) };
  varianta.tinta = { tip: "adaos_pct_pastrat", valoare: rezultatBaza.totaluri.adaosRealPctExact };
  return varianta;
}

// liniile care urmeaza cheia unei invelitori (de inlocuit odata cu ea)
export function liniiLegateDeInvelitoare(intrare: IntrareOferta, codInvelitoare: string): string[] {
  return intrare.linii.filter((l) => l.invelitoare === codInvelitoare).map((l) => l.produs.cod);
}
