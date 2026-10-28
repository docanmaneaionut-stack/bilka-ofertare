import { achizitieLinie } from "./preturi.js";
import type { IntrareOferta, LinieCalculata, RezultatOferta, Tinta } from "./tipuri.js";
import { cursAchizitie, la2, suma, z, type Zecimal } from "./zecimal.js";

// "Preia preturi din oferta ..." (FISA-OFERTARE 11.11): doua-trei masuratori la
// vecini sau rude care "fac impreuna" - produsele similare trebuie sa aiba
// aceleasi preturi, desi necesarul si totalul difera.
//   - produsele comune primesc pretul unitar de prezentare al sursei (netul; cu
//     modul de prezentare, discountul afisat si preturile fixe ale sursei);
//   - produsele care nu coincid primesc adaosul procentual al rubricii lor din
//     sursa (pretul de prezentare / achizitia contului, pe rubrica; fara rubrica
//     in sursa - adaosul global al sursei);
//   - oferta care preia nu mai are camp de tinta: totalul rezulta din cantitati;
//   - renuntarea la preluare scoate preturile preluate si reda tinta.

function netLinie(l: LinieCalculata): string {
  return l.pretNetEur ?? l.pretDocumentEur;
}

export interface AdaosuriSursa {
  peRubrica: Map<string, Zecimal>;
  global: Zecimal;
}

// adaosul (ca factor) al fiecarei rubrici din oferta-sursa: suma(net x cant) / suma(achizitie x cant)
export function adaosuriPeRubrica(rezultatSursa: RezultatOferta): AdaosuriSursa {
  const netPeRubrica = new Map<string, Zecimal>();
  const achPeRubrica = new Map<string, Zecimal>();
  for (const l of rezultatSursa.linii) {
    const net = z(netLinie(l)).times(z(l.cantitate));
    const ach = z(l.achizitieContEur).times(z(l.cantitate));
    netPeRubrica.set(l.rubrica, (netPeRubrica.get(l.rubrica) ?? z(0)).plus(net));
    achPeRubrica.set(l.rubrica, (achPeRubrica.get(l.rubrica) ?? z(0)).plus(ach));
  }
  const peRubrica = new Map<string, Zecimal>();
  for (const [rubrica, net] of netPeRubrica) {
    const ach = achPeRubrica.get(rubrica) ?? z(0);
    if (!ach.isZero()) peRubrica.set(rubrica, net.div(ach));
  }
  const netTotal = suma([...netPeRubrica.values()]);
  const achTotal = suma([...achPeRubrica.values()]);
  return { peRubrica, global: achTotal.isZero() ? z(0) : netTotal.div(achTotal) };
}

export function preiaPreturi(noua: IntrareOferta, sursa: IntrareOferta, rezultatSursa: RezultatOferta, identificatorSursa: string): IntrareOferta {
  const rezultat: IntrareOferta = structuredClone(noua);
  rezultat.modPrezentare = sursa.modPrezentare;
  delete rezultat.discountGeneralPct;
  delete rezultat.discountImplicitPct;
  if (sursa.discountGeneralPct !== undefined) rezultat.discountGeneralPct = sursa.discountGeneralPct;
  if (sursa.discountImplicitPct !== undefined) rezultat.discountImplicitPct = sursa.discountImplicitPct;

  const adaosuri = adaosuriPeRubrica(rezultatSursa);
  const curs = cursAchizitie(rezultat.cursBnr);
  for (const l of rezultat.linii) {
    // un pret fix pus de agent inainte de preluare ramane (11.5: fixul e litera legii)
    if (l.pretFix && !l.pretFix.preluat) continue;
    const dinSursa = rezultatSursa.linii.find((s) => s.cod === l.produs.cod);
    if (dinSursa) {
      l.pretFix = { tip: "eur_fara_tva", valoare: netLinie(dinSursa), preluat: true };
      if (dinSursa.discountPct !== undefined) l.discountPct = dinSursa.discountPct;
      else delete l.discountPct;
      continue;
    }
    const factor = adaosuri.peRubrica.get(l.rubrica) ?? adaosuri.global;
    const achizitie = achizitieLinie(l.produs.pretBazaEur, l.cantitate, rezultat.cont.adaosPct, rezultat.grupaPct, curs, rezultat.tvaPct);
    l.pretFix = { tip: "eur_fara_tva", valoare: la2(z(achizitie.achizitieContEur).times(factor)), preluat: true };
    if (rezultat.modPrezentare === "discount_per_linie" && l.discountPct === undefined && rezultat.discountImplicitPct !== undefined) {
      l.discountPct = rezultat.discountImplicitPct;
    }
  }
  rezultat.tinta = { tip: "preluata", valoare: "0" };
  rezultat.preluataDin = identificatorSursa;
  return rezultat;
}

export function renuntaLaPreluare(intrare: IntrareOferta, tinta: Tinta): IntrareOferta {
  const rezultat: IntrareOferta = structuredClone(intrare);
  for (const l of rezultat.linii) {
    if (l.pretFix?.preluat) delete l.pretFix;
  }
  delete rezultat.preluataDin;
  rezultat.tinta = { ...tinta };
  return rezultat;
}
