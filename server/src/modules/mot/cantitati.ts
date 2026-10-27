import type { Comandabil, IntrareOferta, Invelitoare, InvelitoareCalculata, PozitieLungime, Sipca, SipcaCalculata } from "./tipuri.js";
import { ZERO, la3, suma, z, type Suma, type Zecimal } from "./zecimal.js";

// Cantitatile ofertei (FISA-OFERTARE 3.2, 3.6, cap. 5, cap. 8; ETALON R8):
//   invelitori: mp = suma(lungime x bucati) x latimea totala, 3 zecimale half-up;
//               coli = suma bucati; suprafata directa; combinata = directa + panotaj
//   accesorii la lungimi: ml = suma(lungime x bucati), 3 zecimale
//   sipca: Comanda - ml = suma(lungime x bucati);
//          Calcul - bucati = tronson (mm) / (latimea sipcii + distanta), rotunjit in sus,
//                   ml = bucati x lungimea sipcii
// Fara nicio regula de pret.

// FISA-OFERTARE 3.2: avertizare la dripstop sub 40 mp, per invelitoare, la
// profilele cutate T18 / T35 / T45
export const MP_MINIM_DRIPSTOP = "40";
const FAMILII_DRIPSTOP = /\bT(18|35|45)\b/;

// unitatile de masura ale ofertei, scrise la fel indiferent cum vin din catalog
export function normalizeazaUm(um: string): string {
  const u = um.trim().toLowerCase();
  const tabel: Record<string, string> = {
    m2: "mp",
    mp: "mp",
    ml: "ml",
    m: "ml",
    buc: "buc",
    bucata: "buc",
    bucată: "buc",
    cutie: "cutie",
    rola: "rolă",
    rolă: "rolă",
    set: "set",
  };
  return tabel[u] ?? u;
}

export function metriDinPozitii(pozitii: PozitieLungime[]): Zecimal {
  return suma(pozitii.map((p) => z(p.lungimeM).times(p.bucati)));
}

export function coliDinPozitii(pozitii: PozitieLungime[]): number {
  return pozitii.reduce((t, p) => t + p.bucati, 0);
}

// mp din panotaj: suma(lungime x bucati) x latime, 3 zecimale (o singura rotunjire, la final)
export function mpDinPanotaj(panotaj: PozitieLungime[], latimeTotalaM: Suma): Suma {
  if (panotaj.length === 0) return la3(ZERO);
  return la3(metriDinPozitii(panotaj).times(z(latimeTotalaM)));
}

export function calculeazaInvelitoare(inv: Invelitoare): InvelitoareCalculata {
  const mpPanotaj = mpDinPanotaj(inv.panotaj, inv.latimeTotalaM);
  const mpDirect = inv.mpDirect === undefined ? la3(ZERO) : la3(inv.mpDirect);
  return {
    id: inv.id,
    mp: la3(z(mpPanotaj).plus(mpDirect)),
    mpPanotaj,
    mpDirect,
    coli: coliDinPozitii(inv.panotaj),
    integralPanotata: z(mpDirect).isZero(),
  };
}

// ml pentru accesoriile la lungimi
export function mlDinPozitii(pozitii: PozitieLungime[]): Suma {
  return la3(metriDinPozitii(pozitii));
}

// sipca, varianta Calcul: bucati = tronson / (latime + distanta), rotunjit in sus
export function bucatiSipca(lungimeTronsonM: Suma, latimeSipcaMm: Suma, distantaMm: Suma): number {
  const pas = z(latimeSipcaMm).plus(z(distantaMm));
  if (pas.lte(0)) throw new Error("Latimea sipcii plus distanta trebuie sa fie mai mare decat 0");
  return z(lungimeTronsonM).times(1000).div(pas).ceil().toNumber();
}

export function calculeazaSipca(sipca: Sipca): SipcaCalculata {
  if (sipca.varianta === "calcul") {
    const tronsoane = (sipca.tronsoane ?? []).map((t) => {
      const bucati = bucatiSipca(t.lungimeTronsonM, sipca.latimeSipcaMm, t.distantaMm);
      return { bucati, ml: la3(z(t.lungimeSipcaM).times(bucati)) };
    });
    return {
      tronsoane,
      bucatiTotal: tronsoane.reduce((t, x) => t + x.bucati, 0),
      mlTotal: la3(suma(tronsoane.map((t) => t.ml))),
    };
  }
  const pozitii = sipca.pozitii ?? [];
  return {
    tronsoane: pozitii.map((p) => ({ bucati: p.bucati, ml: la3(z(p.lungimeM).times(p.bucati)) })),
    bucatiTotal: coliDinPozitii(pozitii),
    mlTotal: mlDinPozitii(pozitii),
  };
}

// FISA-OFERTARE 3.2: comanda doar cand fiecare invelitoare e integral in
// lungimi x bucati (formularul Bilka nu primeste mp)
export function verificaComandabil(invelitori: Invelitoare[], calculate: InvelitoareCalculata[]): Comandabil {
  const motive: string[] = [];
  for (const c of calculate) {
    if (c.integralPanotata) continue;
    const inv = invelitori.find((i) => i.id === c.id);
    const nume = inv?.produs.denumire ?? c.id;
    motive.push(`${nume}: ${c.mpDirect} mp sunt dati ca suprafata, fara lungimi x bucati - formularul Bilka nu primeste mp`);
  }
  return { da: motive.length === 0, motive };
}

export function avertizariDripstop(invelitori: Invelitoare[], calculate: InvelitoareCalculata[]): string[] {
  const avertizari: string[] = [];
  for (const inv of invelitori) {
    const areDripstop = /dripstop/i.test(inv.produs.optiune ?? "");
    const familieCutata = FAMILII_DRIPSTOP.test(inv.produs.familie ?? "");
    if (!areDripstop || !familieCutata) continue;
    const c = calculate.find((x) => x.id === inv.id);
    if (c && z(c.mp).lt(MP_MINIM_DRIPSTOP)) {
      avertizari.push(`${inv.produs.denumire}: ${c.mp} mp cu dripstop - sub minimul de ${MP_MINIM_DRIPSTOP} mp`);
    }
  }
  return avertizari;
}

export interface CantitatiOferta {
  invelitori: InvelitoareCalculata[];
  accesoriiMl: { linieId: string; ml: Suma }[];
  sipca?: SipcaCalculata;
  comandabil: Comandabil;
  avertizari: string[];
  // cantitatea calculata a fiecarei linii (declarata, acolo unde nu se calculeaza)
  peLinie: Map<string, Suma>;
}

export function calculeazaCantitati(intrare: IntrareOferta): CantitatiOferta {
  const invelitori = intrare.invelitori.map(calculeazaInvelitoare);
  const accesoriiMl = intrare.linii
    .filter((l) => l.pozitii !== undefined && l.pozitii.length > 0)
    .map((l) => ({ linieId: l.id, ml: mlDinPozitii(l.pozitii ?? []) }));
  const sipca = intrare.sipca ? calculeazaSipca(intrare.sipca) : undefined;

  const peLinie = new Map<string, Suma>();
  for (const l of intrare.linii) {
    const inv = esteLinieInvelitoare(l.rubrica) ? invelitori.find((i) => i.id === l.produs.cod) : undefined;
    const ml = accesoriiMl.find((a) => a.linieId === l.id);
    if (inv) peLinie.set(l.id, inv.mp);
    else if (ml) peLinie.set(l.id, ml.ml);
    else if (sipca && intrare.sipca?.linieId === l.id) peLinie.set(l.id, sipca.mlTotal);
    else peLinie.set(l.id, l.cantitate);
  }

  const rezultat: CantitatiOferta = {
    invelitori,
    accesoriiMl,
    comandabil: verificaComandabil(intrare.invelitori, invelitori),
    avertizari: avertizariDripstop(intrare.invelitori, invelitori),
    peLinie,
  };
  if (sipca) rezultat.sipca = sipca;
  return rezultat;
}

export function esteLinieInvelitoare(rubrica: string): boolean {
  return /^învelitori/i.test(rubrica.trim()) || /^invelitori/i.test(rubrica.trim());
}
