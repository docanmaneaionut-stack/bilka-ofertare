import { achizitieRealaLaCursulDocumentului, procentCaFactor } from "./preturi.js";
import type { ModPrezentare, PretFix } from "./tipuri.js";
import { ZERO, esteUmCuZecimale, la2, suma, z, type Suma, type Zecimal } from "./zecimal.js";

// Prezentarea (FISA-OFERTARE 11.4, 11.5; ETALON R5): cum ajung preturile pe
// document astfel incat totalul fara TVA sa fie exact cel cerut.
//   simplu: pretul de pe linie = achizitie x coeficient
//   lista + discount general: preturi de lista (ancora) si un discount la total;
//     totalul de lista L e cel pentru care L - round(L x d) = totalul net
//   discount per linie: netul din calculul invers, discountul e doar ancora
//     (lista = net / (1 - d)), exceptii pe produs, pretul fix are discount 0
// Preturile fixe raman cum au fost scrise si ies din calcul; liniile libere
// impart ce ramane. Restul de rotunjire se repartizeaza +/-0,01 EUR/unitate pe
// liniile libere la bucata (niciodata mp / ml), descrescator dupa cantitate (la
// egalitate, in ordinea din oferta), astfel incat suma cantitatilor alese =
// restul in centi; apoi, pe linia cu cantitatea cea mai mica, cati centi
// intregi pe unitate mai incap; ce nu incape ramane abatere.

export interface LiniePentruPrezentare {
  id: string;
  um: string;
  cantitate: Suma;
  achizitieContEur: Suma;
  achizitieRealaEur: Suma;
  valoareAchizitieEur: Suma;
  pretFix?: PretFix;
  discountPct?: Suma;
}

export interface PretPrezentare {
  id: string;
  // pretul asa cum apare pe document: netul la "simplu" si "discount per
  // linie", pretul de lista la "lista + discount general"
  pretDocumentEur: Suma;
  pretNetEur: Suma;
  pretListaEur?: Suma;
  discountPct?: Suma;
  valoareEur: Suma;
  pretFix: boolean;
}

export interface RezultatPrezentare {
  preturi: PretPrezentare[];
  // suma valorilor de pe document (net, sau lista la modul cu discount general)
  totalLiniiEur: Suma;
  documentFaraTvaEur: Suma;
  totalListaFaraTvaEur?: Suma;
  discountGeneralEur?: Suma;
  // R5: ce n-a incaput in centi intregi; "0.00" cand totalul e exact
  abatereEur: Suma;
  avertizari: string[];
}

export interface ContextPrezentare {
  mod: ModPrezentare;
  discountGeneralPct?: Suma;
  discountImplicitPct?: Suma;
  cursAchizitie: Suma;
  cursBnr: Suma;
  // 11.11: oferta care preia preturi nu are tinta - liniile sunt toate fixe, iar
  // totalul e suma lor; o linie ramasa libera iese cu pret 0 (apelantul avertizeaza)
  faraTinta?: boolean;
}

// 11.5: pretul fix normalizat in EUR fara TVA; "achizitie reala + x %" porneste
// de la achizitia reala adusa la cursul documentului (E02: 6,86 -> 6,93 -> 7,28)
export function pretFixNormalizat(fix: PretFix, achizitieRealaEur: Suma, cursAchizitie: Suma, cursBnr: Suma): Suma {
  if (fix.tip === "eur_fara_tva") return la2(fix.valoare);
  const achizitieDoc = z(achizitieRealaLaCursulDocumentului(achizitieRealaEur, cursAchizitie, cursBnr));
  return la2(achizitieDoc.times(procentCaFactor(fix.valoare)));
}

// totalul de lista L pentru care L - round2(L x d) = net; se cauta in jurul lui
// net / (1 - d). Daca niciun L nu da exact netul, se ia cel mai apropiat (diferenta
// iese ca abatere).
export function gasesteTotalLista(netEur: Suma, discountPct: Suma): Suma {
  const net = z(netEur);
  const d = z(discountPct).div(100);
  const candidat = z(la2(net.div(z(1).minus(d))));
  for (const delta of ["0", "0.01", "-0.01", "0.02", "-0.02", "0.03", "-0.03"]) {
    const l = candidat.plus(delta);
    if (l.minus(z(la2(l.times(d)))).eq(net)) return la2(l);
  }
  return la2(candidat);
}

interface PretLucru {
  linie: LiniePentruPrezentare;
  pretDoc: Zecimal;
  fix: boolean;
}

function valoare(p: PretLucru): Zecimal {
  return z(la2(p.pretDoc.times(z(p.linie.cantitate))));
}

// R5: repartizarea restului; intoarce centii ramasi nerepartizati (cu semn)
export function repartizeazaRest(libere: PretLucru[], restEur: Zecimal): number {
  let centi = restEur.times(100).toDecimalPlaces(0).toNumber();
  if (centi === 0) return 0;
  const semn = centi > 0 ? 1 : -1;
  centi = Math.abs(centi);
  const pas = z("0.01").times(semn);
  // liniile la bucata, descrescator dupa cantitate, la egalitate in ordinea ofertei
  const laBucata = libere
    .filter((p) => !esteUmCuZecimale(p.linie.um))
    .map((p, idx) => ({ p, idx, q: z(p.linie.cantitate).toNumber() }))
    .sort((a, b) => b.q - a.q || a.idx - b.idx);
  for (const x of laBucata) {
    if (x.q <= centi && x.q > 0) {
      x.p.pretDoc = x.p.pretDoc.plus(pas);
      centi -= x.q;
    }
  }
  if (centi > 0 && laBucata.length > 0) {
    const ultima = laBucata[laBucata.length - 1];
    const k = Math.floor(centi / ultima.q);
    if (k > 0) {
      ultima.p.pretDoc = ultima.p.pretDoc.plus(pas.times(k));
      centi -= k * ultima.q;
    }
  }
  return centi * semn;
}

export function prezinta(ctx: ContextPrezentare, tintaFaraTvaEur: Suma, linii: LiniePentruPrezentare[]): RezultatPrezentare {
  const lista = ctx.mod === "lista_discount_general";
  const dGeneral = lista ? z(ctx.discountGeneralPct ?? "0").div(100) : ZERO;
  if (lista && dGeneral.gte(1)) throw new Error("Discountul general trebuie sa fie sub 100 %");

  // tinta liniilor: netul (simplu, per linie) sau totalul de lista L
  let tintaLinii = lista ? z(gasesteTotalLista(tintaFaraTvaEur, ctx.discountGeneralPct ?? "0")) : z(tintaFaraTvaEur);

  const lucru: PretLucru[] = linii.map((l) => {
    if (!l.pretFix) return { linie: l, pretDoc: ZERO, fix: false };
    const net = z(pretFixNormalizat(l.pretFix, l.achizitieRealaEur, ctx.cursAchizitie, ctx.cursBnr));
    // la "lista + discount general" fixul e netul platit; pe document apare ca lista
    const pretDoc = lista ? z(la2(net.div(z(1).minus(dGeneral)))) : net;
    return { linie: l, pretDoc, fix: true };
  });

  const fixe = lucru.filter((p) => p.fix);
  const libere = lucru.filter((p) => !p.fix);
  const valoareFixe = suma(fixe.map(valoare));
  const achizitieLibere = suma(libere.map((p) => p.linie.valoareAchizitieEur));
  if (ctx.faraTinta) tintaLinii = valoareFixe;
  const coeficient = achizitieLibere.isZero() || ctx.faraTinta ? ZERO : tintaLinii.minus(valoareFixe).div(achizitieLibere);
  for (const p of libere) p.pretDoc = z(la2(z(p.linie.achizitieContEur).times(coeficient)));

  const rest = tintaLinii.minus(suma(lucru.map(valoare)));
  const centiRamasi = repartizeazaRest(libere, rest);
  const abatere = z(centiRamasi).div(100).negated();

  const preturi: PretPrezentare[] = lucru.map((p) => {
    const val = la2(valoare(p));
    if (lista) {
      const net = la2(p.pretDoc.times(z(1).minus(dGeneral)));
      return { id: p.linie.id, pretDocumentEur: la2(p.pretDoc), pretNetEur: net, pretListaEur: la2(p.pretDoc), valoareEur: val, pretFix: p.fix };
    }
    if (ctx.mod === "discount_per_linie") {
      // fixul are discount 0, afara de cazul in care linia poarta explicit un discount (ex. preluat din alta oferta)
      const dPct = p.fix ? (p.linie.discountPct ?? "0") : (p.linie.discountPct ?? ctx.discountImplicitPct ?? "0");
      const d = z(dPct).div(100);
      if (d.gte(1)) throw new Error(`Discountul pe linie trebuie sa fie sub 100 % (linia ${p.linie.id})`);
      return {
        id: p.linie.id,
        pretDocumentEur: la2(p.pretDoc),
        pretNetEur: la2(p.pretDoc),
        pretListaEur: la2(p.pretDoc.div(z(1).minus(d))),
        discountPct: z(dPct).toString(),
        valoareEur: val,
        pretFix: p.fix,
      };
    }
    return { id: p.linie.id, pretDocumentEur: la2(p.pretDoc), pretNetEur: la2(p.pretDoc), valoareEur: val, pretFix: p.fix };
  });

  const totalLinii = suma(preturi.map((p) => p.valoareEur));
  const rezultat: RezultatPrezentare = {
    preturi,
    totalLiniiEur: la2(totalLinii),
    documentFaraTvaEur: la2(totalLinii),
    abatereEur: la2(abatere),
    avertizari: [],
  };
  if (lista) {
    const discount = z(la2(totalLinii.times(dGeneral)));
    rezultat.totalListaFaraTvaEur = la2(totalLinii);
    rezultat.discountGeneralEur = la2(discount);
    rezultat.documentFaraTvaEur = la2(totalLinii.minus(discount));
  }
  if (!abatere.isZero()) {
    rezultat.avertizari.push(
      `Totalul fără TVA al documentului (${rezultat.documentFaraTvaEur} EUR) diferă cu ${la2(abatere)} EUR de țintă: restul de rotunjire nu se poate repartiza în cenți întregi pe liniile la bucată.`,
    );
  }
  return rezultat;
}
