import { describe, expect, it } from "vitest";
import { calculeazaOferta } from "../src/modules/mot/calcul.js";
import {
  avertizariDripstop,
  bucatiSipca,
  calculeazaInvelitoare,
  calculeazaSipca,
  mlDinPozitii,
  mpDinPanotaj,
  normalizeazaUm,
  verificaComandabil,
} from "../src/modules/mot/cantitati.js";
import type { IntrareOferta, Invelitoare, ProdusOferta } from "../src/modules/mot/tipuri.js";

// Cantitatile (FISA-OFERTARE 3.2, 3.6, cap. 5, cap. 8; ETALON R8): mp din panotaj,
// suprafata directa si combinata, ml, sipca in ambele variante, comandabil,
// dripstop, UM normalizata, validarea intrarilor imposibile.

const produs = (p: Partial<ProdusOferta> & { cod: string }): ProdusOferta => ({
  denumire: p.cod,
  um: "mp",
  pretBazaEur: "1.00",
  ...p,
});

const invelitoare = (p: Partial<Invelitoare> & { id: string }): Invelitoare => ({
  produs: produs({ cod: p.id }),
  rol: "principala",
  latimeTotalaM: "1.18",
  panotaj: [],
  ...p,
});

describe("mp din panotaj", () => {
  it("E01: 4,20 x 15 + 3,10 x 20 + 2,75 x 8 + 1,19 x 5 = 152,95 m x 1,18 = 180,481 mp", () => {
    const panotaj = [
      { lungimeM: "4.20", bucati: 15 },
      { lungimeM: "3.10", bucati: 20 },
      { lungimeM: "2.75", bucati: 8 },
      { lungimeM: "1.19", bucati: 5 },
    ];
    expect(mpDinPanotaj(panotaj, "1.18")).toBe("180.481");
    const c = calculeazaInvelitoare(invelitoare({ id: "IB", panotaj }));
    expect(c).toMatchObject({ mp: "180.481", mpPanotaj: "180.481", mpDirect: "0.000", coli: 48, integralPanotata: true });
  });

  it("E11: Clasic 189,120 mp (latime 1,20) si Retro 30,406 mp (latime 0,542)", () => {
    expect(mpDinPanotaj([{ lungimeM: "4.50", bucati: 20 }, { lungimeM: "3.80", bucati: 12 }, { lungimeM: "2.20", bucati: 10 }], "1.2")).toBe("189.120");
    expect(mpDinPanotaj([{ lungimeM: "5.10", bucati: 11 }], "0.542")).toBe("30.406");
  });

  it("E03: 5,70 x 6 x 1,085 = 37,107 mp", () => {
    expect(mpDinPanotaj([{ lungimeM: "5.70", bucati: 6 }], "1.085")).toBe("37.107");
  });

  it("rotunjeste la 3 zecimale half-up, o singura data, la final", () => {
    // 1,0005 m x 1 x 1 m = 1,0005 -> 1,001 (half-up), nu 1,000
    expect(mpDinPanotaj([{ lungimeM: "1.0005", bucati: 1 }], "1")).toBe("1.001");
    // 0,0005 mp exact -> 0,001
    expect(mpDinPanotaj([{ lungimeM: "0.001", bucati: 1 }], "0.5")).toBe("0.001");
    // 2,0004 -> 2,000; 2,0005 -> 2,001
    expect(mpDinPanotaj([{ lungimeM: "2.0004", bucati: 1 }], "1")).toBe("2.000");
    expect(mpDinPanotaj([{ lungimeM: "2.0005", bucati: 1 }], "1")).toBe("2.001");
    // suma lungimilor inainte de inmultire: 3 x 1,0001 x 1,18 = 3,540354 -> 3,540
    expect(mpDinPanotaj([{ lungimeM: "1.0001", bucati: 3 }], "1.18")).toBe("3.540");
  });

  it("tabla plana la mp: latimea 1,25 data de apelant", () => {
    expect(mpDinPanotaj([{ lungimeM: "2.00", bucati: 10 }], "1.25")).toBe("25.000");
  });
});

describe("suprafata directa si combinata", () => {
  it("directa: mp introdus, 3 zecimale, fara coli, nu e integral panotata", () => {
    const c = calculeazaInvelitoare(invelitoare({ id: "A", mpDirect: "120.5" }));
    expect(c).toMatchObject({ mp: "120.500", mpPanotaj: "0.000", mpDirect: "120.500", coli: 0, integralPanotata: false });
  });

  it("combinata: mp direct + panotaj, adunate", () => {
    const c = calculeazaInvelitoare(invelitoare({ id: "A", mpDirect: "100", panotaj: [{ lungimeM: "2.50", bucati: 2 }], latimeTotalaM: "1.20" }));
    expect(c).toMatchObject({ mp: "106.000", mpPanotaj: "6.000", mpDirect: "100.000", coli: 2, integralPanotata: false });
  });
});

describe("comandabil (FISA-OFERTARE 3.2)", () => {
  it("adevarat cand fiecare invelitoare e integral in lungimi x bucati", () => {
    const inv = [invelitoare({ id: "A", panotaj: [{ lungimeM: "4", bucati: 10 }] })];
    expect(verificaComandabil(inv, inv.map(calculeazaInvelitoare))).toEqual({ da: true, motive: [] });
  });

  it("adevarat fara invelitori (E06, E10): nimic nu blocheaza", () => {
    expect(verificaComandabil([], [])).toEqual({ da: true, motive: [] });
  });

  it("fals cu motiv pe fiecare invelitoare cu mp direct", () => {
    const inv = [
      invelitoare({ id: "A", produs: produs({ cod: "A", denumire: "Țiglă Clasic" }), panotaj: [{ lungimeM: "4", bucati: 10 }] }),
      invelitoare({ id: "B", produs: produs({ cod: "B", denumire: "Retro Plus" }), rol: "secundara", mpDirect: "30.5" }),
    ];
    const c = verificaComandabil(inv, inv.map(calculeazaInvelitoare));
    expect(c.da).toBe(false);
    expect(c.motive).toHaveLength(1);
    expect(c.motive[0]).toContain("Retro Plus");
    expect(c.motive[0]).toContain("30.500 mp");
  });
});

describe("avertizare dripstop sub 40 mp (T18 / T35 / T45)", () => {
  const t35 = (optiune: string | undefined, mp: string) =>
    invelitoare({ id: "T", produs: produs({ cod: "T", denumire: "Tablă cutată T35 – dripstop", familie: "Tablă cutată T35 (acoperiș / perete)", optiune }), mpDirect: mp });

  it("avertizeaza sub 40 mp", () => {
    const inv = [t35("dripstop", "37.107")];
    const a = avertizariDripstop(inv, inv.map(calculeazaInvelitoare));
    expect(a).toHaveLength(1);
    expect(a[0]).toMatch(/37\.107 mp.*sub minimul de 40 mp/);
  });

  it("nu avertizeaza la 40 mp sau peste, nici fara dripstop, nici la alta familie", () => {
    const peste = [t35("dripstop", "40")];
    expect(avertizariDripstop(peste, peste.map(calculeazaInvelitoare))).toEqual([]);
    const fara = [t35(undefined, "20")];
    expect(avertizariDripstop(fara, fara.map(calculeazaInvelitoare))).toEqual([]);
    const clasic = [invelitoare({ id: "C", produs: produs({ cod: "C", familie: "Țiglă metalică Clasic", optiune: "dripstop" }), mpDirect: "20" })];
    expect(avertizariDripstop(clasic, clasic.map(calculeazaInvelitoare))).toEqual([]);
  });
});

describe("accesorii la lungimi: ml = suma(lungime x bucati), 3 zecimale (cap. 5)", () => {
  it("E03: 3,00 x 4 = 12,000 ml; 2,00 x 4 = 8,000 ml", () => {
    expect(mlDinPozitii([{ lungimeM: "3.00", bucati: 4 }])).toBe("12.000");
    expect(mlDinPozitii([{ lungimeM: "2.00", bucati: 4 }])).toBe("8.000");
    expect(mlDinPozitii([{ lungimeM: "1.333", bucati: 3 }, { lungimeM: "0.5", bucati: 1 }])).toBe("4.499");
  });
});

describe("sipca (cap. 8)", () => {
  it("Calcul: bucati = tronson / (latime + distanta), rotunjit in sus", () => {
    expect(bucatiSipca("11.00", "92.9", "25")).toBe(94); // 11000 / 117,9 = 93,3 -> 94
    expect(bucatiSipca("0.70", "92.9", "25")).toBe(6); // 5,9 -> 6
    expect(bucatiSipca("1.179", "92.9", "25")).toBe(10); // exact 10 ramane 10
    expect(bucatiSipca("1.00", "100", "0")).toBe(10); // distanta 0: sipca langa sipca
    expect(bucatiSipca("1.0001", "100", "0")).toBe(11); // orice rest -> inca o sipca
  });

  it("E06, varianta Calcul: 94 + 6 = 100 buc, 112,800 + 7,200 = 120,000 ml", () => {
    const s = calculeazaSipca({
      id: "S1",
      produsCod: "SIPCAMAT050",
      model: "Oslo, capăt drept",
      latimeSipcaMm: "92.9",
      varianta: "calcul",
      tronsoane: [
        { lungimeSipcaM: "1.20", lungimeTronsonM: "11.00", distantaMm: "25" },
        { lungimeSipcaM: "1.20", lungimeTronsonM: "0.70", distantaMm: "25" },
      ],
    });
    expect(s).toEqual({ id: "S1", tronsoane: [{ bucati: 94, ml: "112.800" }, { bucati: 6, ml: "7.200" }], bucatiTotal: 100, mlTotal: "120.000" });
  });

  it("Comanda: ml = suma(lungime x bucati)", () => {
    const s = calculeazaSipca({
      id: "S2",
      produsCod: "SIPCAMAT050",
      model: "Haga, capăt rotund",
      latimeSipcaMm: "111.3",
      varianta: "comanda",
      pozitii: [{ lungimeM: "1.50", bucati: 40 }, { lungimeM: "1.20", bucati: 25 }],
    });
    expect(s).toEqual({ id: "S2", tronsoane: [{ bucati: 40, ml: "60.000" }, { bucati: 25, ml: "30.000" }], bucatiTotal: 65, mlTotal: "90.000" });
  });
});

describe("unitatea de masura normalizata", () => {
  it("M2 -> mp, BUC -> buc, ML -> ml, CUTIE -> cutie, ROLĂ -> rolă", () => {
    expect(["M2", "mp", "BUC", "Buc", "ML", "CUTIE", "ROLĂ", "rola", "SET"].map(normalizeazaUm)).toEqual(["mp", "mp", "buc", "buc", "ml", "cutie", "rolă", "rolă", "set"]);
  });
});

// o oferta minima valida, pe care testele de validare o strica pe rand
function ofertaMinima(): IntrareOferta {
  return {
    cursBnr: "5.3485",
    tvaPct: 21,
    cont: { tip: "AGENT", adaosPct: "1.00" },
    grupaPct: "0",
    tinta: { tip: "total_cu_tva_lei", valoare: "17000" },
    modPrezentare: "simplu",
    completare: false,
    invelitori: [invelitoare({ id: "TMIBEMAT050", culoare: "RAL 3005", produs: produs({ cod: "TMIBEMAT050", denumire: "Țiglă Iberic", finisaj: "mat", grosime: "0,50 mm", pretBazaEur: "6.79" }), panotaj: [{ lungimeM: "4.20", bucati: 15 }] })],
    linii: [
      { id: "L1", rubrica: "Învelitori", produs: produs({ cod: "TMIBEMAT050", denumire: "Țiglă Iberic", um: "M2", pretBazaEur: "6.79" }), cantitate: "1", invelitoare: "TMIBEMAT050" },
      { id: "L2", rubrica: "Accesorii standard", produs: produs({ cod: "ACMICMAT050", denumire: "Coamă mică", um: "BUC", pretBazaEur: "4.90" }), cantitate: "13", invelitoare: "TMIBEMAT050" },
    ],
    zonaB: [],
  };
}

describe("calculeazaOferta: cantitatile pe linii", () => {
  it("linia invelitorii primeste mp-ul calculat din panotaj, UM normalizata, bucatile intregi", () => {
    const r = calculeazaOferta(ofertaMinima());
    expect(r.linii.map((l) => [l.id, l.um, l.cantitate])).toEqual([
      ["L1", "mp", "74.340"], // 4,20 x 15 x 1,18 = 74,34
      ["L2", "buc", "13"],
    ]);
    expect(r.cantitati.invelitori).toEqual([{ id: "TMIBEMAT050", mp: "74.340", mpPanotaj: "74.340", mpDirect: "0.000", coli: 15, integralPanotata: true }]);
    expect(r.comandabil).toEqual({ da: true, motive: [] });
  });

  it("cu mp direct oferta nu e comandabila, cu motiv", () => {
    const o = ofertaMinima();
    o.invelitori[0].panotaj = [];
    o.invelitori[0].mpDirect = "74.34";
    const r = calculeazaOferta(o);
    expect(r.comandabil.da).toBe(false);
    expect(r.comandabil.motive[0]).toContain("74.340 mp");
    expect(r.linii[0].cantitate).toBe("74.340");
  });
});

describe("validarea intrarilor imposibile: eroare, nu rezultat", () => {
  it("cantitate 0 sau negativa pe linie", () => {
    const o = ofertaMinima();
    o.linii[1].cantitate = "0";
    expect(() => calculeazaOferta(o)).toThrow(/mai mare decat 0/);
    o.linii[1].cantitate = "-3";
    expect(() => calculeazaOferta(o)).toThrow(/mai mare decat 0/);
  });

  it("lungime 0 sau bucati 0 in panotaj", () => {
    const o = ofertaMinima();
    o.invelitori[0].panotaj = [{ lungimeM: "0", bucati: 15 }];
    expect(() => calculeazaOferta(o)).toThrow(/mai mare decat 0/);
    o.invelitori[0].panotaj = [{ lungimeM: "4.20", bucati: 0 }];
    expect(() => calculeazaOferta(o)).toThrow();
  });

  it("latime totala 0, invelitoare fara panotaj si fara mp", () => {
    const o = ofertaMinima();
    o.invelitori[0].latimeTotalaM = "0";
    expect(() => calculeazaOferta(o)).toThrow(/mai mare decat 0/);
    const o2 = ofertaMinima();
    o2.invelitori[0].panotaj = [];
    expect(() => calculeazaOferta(o2)).toThrow(/fie panotaj/);
  });

  it("sipca: distanta negativa, tronson 0, varianta Calcul fara tronsoane", () => {
    const sipca = (t: { lungimeSipcaM: string; lungimeTronsonM: string; distantaMm: string }[]) => {
      const o = ofertaMinima();
      o.linii.push({ id: "L3", rubrica: "Șipcă gard", produs: produs({ cod: "SIPCAMAT050", denumire: "Șipcă Oslo", um: "ML", pretBazaEur: "1.11" }), cantitate: "1", sipca: "S1", culoare: { ral: "RAL 7016", finisaj: "mat", grosime: "0,50 mm" } });
      o.sipci = [{ id: "S1", produsCod: "SIPCAMAT050", model: "Oslo", latimeSipcaMm: "92.9", varianta: "calcul", tronsoane: t }];
      return o;
    };
    expect(() => calculeazaOferta(sipca([{ lungimeSipcaM: "1.20", lungimeTronsonM: "11", distantaMm: "-5" }]))).toThrow(/nu poate fi negativa/);
    expect(() => calculeazaOferta(sipca([{ lungimeSipcaM: "1.20", lungimeTronsonM: "0", distantaMm: "25" }]))).toThrow(/mai mare decat 0/);
    expect(() => calculeazaOferta(sipca([]))).toThrow(/tronsoane/);
    const r = calculeazaOferta(sipca([{ lungimeSipcaM: "1.20", lungimeTronsonM: "11", distantaMm: "0" }]));
    expect(r.cantitati.sipci).toEqual([{ id: "S1", tronsoane: [{ bucati: 119, ml: "142.800" }], bucatiTotal: 119, mlTotal: "142.800" }]); // 11000 / 92,9 = 118,4 -> 119
    expect(r.linii[2].cantitate).toBe("142.800");
  });

  it("curs 0, text in loc de numar", () => {
    const o = ofertaMinima();
    o.cursBnr = "0";
    expect(() => calculeazaOferta(o)).toThrow(/mai mare decat 0/);
    const o2 = ofertaMinima();
    o2.linii[1].cantitate = "treisprezece";
    expect(() => calculeazaOferta(o2)).toThrow(/suma zecimala/);
  });
});
