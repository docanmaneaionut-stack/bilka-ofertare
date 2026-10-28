import { esteLinieInvelitoare, type IntrareOferta, type ProdusOferta, type RezultatOferta } from "./tipuri.js";

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
  // M1: id-urile invelitorilor, ale rubricilor de sipca si legaturile liniilor
  // raman neschimbate (sunt id-uri pe oferta, nu coduri); se schimba doar produsele
  varianta.invelitori = baza.invelitori.map((inv) => ({ ...structuredClone(inv), produs: produsNou(inv.produs) }));
  varianta.linii = baza.linii.map((l) => ({ ...structuredClone(l), produs: produsNou(l.produs) }));
  if (baza.sipci) varianta.sipci = baza.sipci.map((s) => ({ ...structuredClone(s), produsCod: codNou(s.produsCod) }));
  varianta.tinta = { tip: "adaos_pct_pastrat", valoare: rezultatBaza.totaluri.adaosRealPctExact };
  return varianta;
}

// liniile care urmeaza cheia unei invelitori (de inlocuit odata cu ea)
export function liniiLegateDeInvelitoare(intrare: IntrareOferta, idInvelitoare: string): string[] {
  return intrare.linii.filter((l) => l.invelitoare === idInvelitoare && !esteLinieInvelitoare(l.rubrica)).map((l) => l.produs.cod);
}
