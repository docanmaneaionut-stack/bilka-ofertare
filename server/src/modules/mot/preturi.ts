import type { Garda, RandVanzari, Tinta, TipTinta } from "./tipuri.js";
import { ZERO, factorTva, la2, la4, suma, z, type Suma, type Zecimal } from "./zecimal.js";

// Straturile de pret ale ofertei (FISA-OFERTARE 11.2, 11.6, 11.8, cap. 19;
// ETALON R1-R4, R6, R7):
//   achizitia contului (R2), tinta si marja in lei (R3), documentul in euro
//   derivat din lei-ul fara TVA (R4), totalul in lei (R6), garda (R7),
//   randul din tabelul de vanzari (cap. 19).
// Toate rotunjirile sunt half-up, la 2 zecimale, exact unde spune fisa.

export interface AchizitieLinie {
  // R2: baza x (1 + adaos cont) x (1 + grupa), 2 zecimale
  achizitieContEur: Suma;
  // fara grupa: pe ea stau garda si costul din vanzari
  achizitieRealaEur: Suma;
  // ce vede agentul: achizitie cont x curs achizitie x (1 + TVA), o singura rotunjire
  achizitieContLeiCuTva: Suma;
  // achizitie x cantitate, 2 zecimale (totalurile sunt sume de valori pe linie)
  valoareAchizitieEur: Suma;
  valoareAchizitieRealaEur: Suma;
  // baza din catalog x cantitate: costul firmei la colaboratori (cap. 19)
  valoareBazaEur: Suma;
}

export function procentCaFactor(pct: Suma | number): Zecimal {
  return z(1).plus(z(pct).div(100));
}

export function achizitieLinie(
  pretBazaEur: Suma,
  cantitate: Suma,
  adaosContPct: Suma,
  grupaPct: Suma,
  cursAchizitie: Suma,
  tvaPct: number | Suma,
): AchizitieLinie {
  const baza = z(pretBazaEur);
  const reala = z(la2(baza.times(procentCaFactor(adaosContPct))));
  const cont = z(la2(baza.times(procentCaFactor(adaosContPct)).times(procentCaFactor(grupaPct))));
  return {
    achizitieContEur: la2(cont),
    achizitieRealaEur: la2(reala),
    achizitieContLeiCuTva: la2(cont.times(z(cursAchizitie)).times(factorTva(tvaPct))),
    valoareAchizitieEur: la2(cont.times(z(cantitate))),
    valoareAchizitieRealaEur: la2(reala.times(z(cantitate))),
    valoareBazaEur: la2(baza.times(z(cantitate))),
  };
}

export interface TotaluriAchizitie {
  contEurFaraTva: Suma;
  contLeiFaraTva: Suma;
  contLeiCuTva: Suma;
  realaEurFaraTva: Suma;
  realaLeiFaraTva: Suma;
  realaLeiCuTva: Suma;
  bazaEurFaraTva: Suma;
  bazaLeiFaraTva: Suma;
  bazaLeiCuTva: Suma;
}

// R3: achizitia totala in lei = suma valorilor (EUR, 2 zecimale pe linie) x cursul
// de achizitie, apoi TVA-ul - lantul rotunjit pas cu pas
export function totaluriAchizitie(linii: AchizitieLinie[], cursAchizitie: Suma, tvaPct: number | Suma): TotaluriAchizitie {
  const contEur = suma(linii.map((l) => l.valoareAchizitieEur));
  const realaEur = suma(linii.map((l) => l.valoareAchizitieRealaEur));
  const bazaEur = suma(linii.map((l) => l.valoareBazaEur));
  const contLei = z(la2(contEur.times(z(cursAchizitie))));
  const realaLei = z(la2(realaEur.times(z(cursAchizitie))));
  const bazaLei = z(la2(bazaEur.times(z(cursAchizitie))));
  return {
    contEurFaraTva: la2(contEur),
    contLeiFaraTva: la2(contLei),
    contLeiCuTva: la2(contLei.times(factorTva(tvaPct))),
    realaEurFaraTva: la2(realaEur),
    realaLeiFaraTva: la2(realaLei),
    realaLeiCuTva: la2(realaLei.times(factorTva(tvaPct))),
    bazaEurFaraTva: la2(bazaEur),
    bazaLeiFaraTva: la2(bazaLei),
    bazaLeiCuTva: la2(bazaLei.times(factorTva(tvaPct))),
  };
}

export interface TintaCalculata {
  tintaLeiCuTva: Suma;
  marjaLei: Suma;
  adaosRealPct: Suma;
  adaosRealPctExact: Suma;
}

// R3: tinta = suma discutata (lei cu TVA) sau achizitia x (1 + adaos %);
// adaosul real si marja se calculeaza in lei
export function calculeazaTinta(tinta: Tinta, achizitieContLeiCuTva: Suma): TintaCalculata {
  const achizitie = z(achizitieContLeiCuTva);
  const tintaLei =
    tinta.tip === "total_cu_tva_lei" ? z(la2(tinta.valoare)) : z(la2(achizitie.times(procentCaFactor(tinta.valoare))));
  const marja = tintaLei.minus(achizitie);
  const adaosExact = achizitie.isZero() ? ZERO : tintaLei.div(achizitie).minus(1).times(100);
  return {
    tintaLeiCuTva: la2(tintaLei),
    marjaLei: la2(marja),
    adaosRealPct: la2(adaosExact),
    adaosRealPctExact: la4(adaosExact),
  };
}

export interface DocumentEur {
  tintaFaraTvaLei: Suma;
  faraTvaEur: Suma;
  tvaEur: Suma;
  cuTvaEur: Suma;
}

// R4: documentul in euro porneste de la lei-ul fara TVA: tinta fara TVA (lei) =
// tinta / (1 + TVA), 2 zecimale; fara TVA (EUR) = / curs BNR, 2 zecimale;
// TVA (EUR) = fara TVA x cota, 2 zecimale; cu TVA = suma lor
export function documentDinTinta(tintaLeiCuTva: Suma, cursBnr: Suma, tvaPct: number | Suma): DocumentEur {
  const tintaFaraLei = z(la2(z(tintaLeiCuTva).div(factorTva(tvaPct))));
  const faraTva = la2(tintaFaraLei.div(z(cursBnr)));
  const { tva, cuTva } = tvaDinNet(faraTva, tvaPct);
  return { tintaFaraTvaLei: la2(tintaFaraLei), faraTvaEur: faraTva, tvaEur: tva, cuTvaEur: cuTva };
}

export function tvaDinNet(faraTvaEur: Suma, tvaPct: number | Suma): { faraTva: Suma; tva: Suma; cuTva: Suma } {
  const net = z(faraTvaEur);
  const tva = z(la2(net.times(z(tvaPct).div(100))));
  return { faraTva: la2(net), tva: la2(tva), cuTva: la2(net.plus(tva)) };
}

// R6: tinta = suma si liniile ating exact totalul -> suma discutata, exact (chiar
// daca total EUR x curs difera cu 1-3 bani); tinta = suma cu abatere -> "cat
// iese" din linii; tinta = adaos % -> total EUR x curs, cu bani
export function totalLeiDocument(tipTinta: TipTinta, tintaLeiCuTva: Suma, documentCuTvaEur: Suma, cursBnr: Suma, abatereEur: Suma): Suma {
  if (tipTinta === "total_cu_tva_lei" && z(abatereEur).isZero()) return la2(tintaLeiCuTva);
  return la2(z(documentCuTvaEur).times(z(cursBnr)));
}

// R7: pragul gardei = achizitia reala a contului (la cursul de achizitie) adusa la
// cursul documentului, 2 zecimale
export function achizitieRealaLaCursulDocumentului(achizitieRealaEur: Suma, cursAchizitie: Suma, cursBnr: Suma): Suma {
  return la2(z(achizitieRealaEur).times(z(cursAchizitie)).div(z(cursBnr)));
}

export function verificaGarda(linii: { id: string; pretNetEur: Suma; achizitieRealaDocEur: Suma }[], completare: boolean): Garda {
  if (completare) return { respectata: true, liniiSubAchizitie: [], aplicata: false };
  const sub = linii.filter((l) => z(l.pretNetEur).lt(z(l.achizitieRealaDocEur))).map((l) => l.id);
  return { respectata: sub.length === 0, liniiSubAchizitie: sub, aplicata: true };
}

// cap. 19: pret vanzare = totalul in lei al documentului (materiale, fara zona B);
// cost = achizitia reala a contului cu TVA (fara grupa); adaos net = diferenta;
// adaos brut = net / (1 + TVA)
export function randVanzari(pretVanzareLei: Suma, costAchizitieLei: Suma, tvaPct: number | Suma): RandVanzari {
  const net = z(pretVanzareLei).minus(z(costAchizitieLei));
  return {
    pretVanzareLei: la2(pretVanzareLei),
    costAchizitieLei: la2(costAchizitieLei),
    adaosNetLei: la2(net),
    adaosBrutLei: la2(net.div(factorTva(tvaPct))),
    tabel: "propriu",
  };
}

// cap. 19 (decis 23.10.2026, E03): colaboratorul nu are tabel de vanzari; ce ii
// vinde firma - achizitia lui (baza + adaosul negociat, la cursul de achizitie, cu
// TVA) - apare ca vanzare in tabelul Administratorului, cu costul = pretul de baza.
// Oferta lui catre clientul final nu intra in vanzarile firmei.
export function randVanzariColaborator(achizitieColaboratorLeiCuTva: Suma, bazaLeiCuTva: Suma, tvaPct: number | Suma): RandVanzari {
  return {
    ...randVanzari(achizitieColaboratorLeiCuTva, bazaLeiCuTva, tvaPct),
    tabel: "administrator",
    nota: "vânzarea apare în tabelul Administratorului: preț vânzare = achiziția colaboratorului, cost = prețul de bază; oferta lui către client nu intră în vânzările firmei",
  };
}
