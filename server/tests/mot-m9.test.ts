import { describe, expect, it } from "vitest";
import { calculeazaOferta } from "../src/modules/mot/calcul.js";
import { impacheteaza } from "../src/modules/mot/pachete.js";
import type { IntrareOferta, LinieOferta, ProdusOferta } from "../src/modules/mot/tipuri.js";
import { incarcaEtalon } from "./etalon/incarcaEtalon.js";

// MODIFICAREA M9 (S27; docs/MODIFICARI-S27.md, ETALON v1.6 R10, E13): accesoriile speciale 2 ML pot fi
// DE SINE STATATOARE - linii cu cheia lor (finisaj, grosime, culoare), fara invelitoare de care sa fie
// legate - pe o oferta fara invelitoare sau, pentru o a doua cheie, pe langa invelitoare. La export:
// un formular fara invelitoare per cheie, in care stau impreuna sectiunile de sine statatoare cu aceeasi
// cheie (standard, fixare, speciale 2 ML). Motorul le accepta fara nicio schimbare in mot/ (proba din
// S27: cifrele si formularele E13 ies la ban cu motorul din v0.4-comenzi) - testele de aici fixeaza
// comportamentul, ca o viitoare schimbare a impachetarii sa nu-l strice. Cifrele E13: suita de etaloane.

const ID_NOU = "M9-D06-9005";

describe("M9: accesorii speciale 2 ML de sine statatoare", () => {
  it("E13 (fara invelitoare, doua chei): doua sectiuni pe cheie - specialele 8017 impreuna cu fixarea 8017, specialele 9005 separat - si doua formulare fara invelitoare", () => {
    const { intrare } = incarcaEtalon("E13");
    expect(intrare.invelitori).toHaveLength(0);
    const r = calculeazaOferta(intrare);
    const dupaCod = (cod: string) => r.linii.find((l) => l.cod === cod)!.id;
    expect(r.pachete.map((p) => [p.tip, p.nume, p.linii])).toEqual([
      ["de_sine_statatoare", "Secțiune de sine stătătoare 1 — 8017 mat 0,50", [dupaCod("ASP05MAT050"), dupaCod("ASP08MAT050"), dupaCod("SUCLE408035")]],
      ["de_sine_statatoare", "Secțiune de sine stătătoare 2 — 9005 lucios 0,50", [dupaCod("ASP06LUC050")]],
    ]);
    expect(r.formulareBilka).toHaveLength(2);
    expect(r.formulareBilka[0]).toMatchObject({ nr: 1, pachete: ["S1"], invelitoriSecundare: [], linii: [dupaCod("ASP05MAT050"), dupaCod("ASP08MAT050"), dupaCod("SUCLE408035")], pluvial: [], lungimi: [] });
    expect(r.formulareBilka[1]).toMatchObject({ nr: 2, pachete: ["S2"], linii: [dupaCod("ASP06LUC050")] });
    for (const f of r.formulareBilka) {
      expect(f.invelitoarePrincipala).toBeUndefined();
      expect(f.continut).toMatch(/^Formular fără învelitoare/);
    }
    expect(r.formulareBilka[0].continut).toContain("8017 mat 0,50");
    expect(r.formulareBilka[1].continut).toContain("9005 lucios 0,50");
    expect(r.comandabil).toEqual({ da: true, motive: [] }); // fara invelitori, nimic nu blocheaza comanda
    expect(r.avertizari).toEqual([]);
  });

  it("E01 + o linie de speciale 2 ML de sine statatoare (D06, 9005 lucios 0,50): formularul E01 neschimbat + un formular fara invelitoare cu cheia ei", () => {
    const e01 = incarcaEtalon("E01").intrare;
    const d06 = incarcaEtalon("E13").intrare.linii.find((l) => l.produs.cod === "ASP06LUC050")!;
    const linie: LinieOferta = { ...d06, id: ID_NOU, cantitate: "10" };
    expect(linie.invelitoare).toBeUndefined();
    expect(linie.culoare).toEqual({ ral: "RAL 9005", finisaj: "lucios", grosime: "0,50 mm" });
    const inainte = calculeazaOferta(e01);
    const dupa = calculeazaOferta({ ...e01, linii: [...e01.linii, linie] });
    // formularul si pachetele E01: exact aceleasi
    expect(inainte.formulareBilka).toHaveLength(1);
    expect(dupa.formulareBilka).toHaveLength(2);
    expect(dupa.formulareBilka[0]).toEqual(inainte.formulareBilka[0]);
    expect(dupa.pachete.filter((p) => p.tip !== "de_sine_statatoare").map((p) => [p.id, p.nume, p.linii])).toEqual(inainte.pachete.map((p) => [p.id, p.nume, p.linii]));
    // linia noua: sectiunea ei, pe formularul ei fara invelitoare
    const sectiune = dupa.pachete.find((p) => p.tip === "de_sine_statatoare")!;
    expect(sectiune).toMatchObject({ id: "S1", nume: "Secțiune de sine stătătoare 1 — 9005 lucios 0,50", linii: [ID_NOU], cheie: { ral: "RAL 9005", finisaj: "lucios", grosime: "0,50 mm" } });
    expect(dupa.formulareBilka[1]).toMatchObject({ nr: 2, pachete: ["S1"], linii: [ID_NOU], invelitoriSecundare: [], pluvial: [] });
    expect(dupa.formulareBilka[1].invelitoarePrincipala).toBeUndefined();
    expect(dupa.formulareBilka[1].continut).toContain("9005 lucios 0,50");
    expect(dupa.linii.find((l) => l.id === ID_NOU)).toMatchObject({ cod: "ASP06LUC050", cantitate: "10", pachet: "Secțiune de sine stătătoare 1 — 9005 lucios 0,50" });
  });

  it("sectiunile de sine statatoare cu aceeasi cheie (standard + fixare + speciale 2 ML) stau pe acelasi formular; alta cheie = alt formular; specialele legate de invelitoare raman in pachetul ei", () => {
    const p = (cod: string, extra: Partial<ProdusOferta> = {}): ProdusOferta => ({ cod, denumire: cod, um: "BUC", pretBazaEur: "5.00", finisaj: "mat", grosime: "0,50 mm", ...extra });
    const cheie = (ral: string, finisaj = "mat") => ({ ral, finisaj, grosime: "0,50 mm" });
    const linii: LinieOferta[] = [
      { id: "INV", rubrica: "Învelitori", produs: p("TMCLSMAT050", { um: "M2", grup: "Țiglă metalică", familie: "Țiglă metalică Clasic" }), cantitate: "1", invelitoare: "I1" },
      { id: "LEG", rubrica: "Accesorii speciale 2 ML", produs: p("ASP03MAT050"), cantitate: "4", invelitoare: "I1" },
      { id: "STD", rubrica: "Accesorii standard", produs: p("ACMICMAT050"), cantitate: "3", culoare: cheie("RAL 7016") },
      { id: "SPE", rubrica: "Accesorii speciale 2 ML", produs: p("ASP05MAT050"), cantitate: "6", culoare: cheie("RAL 7016") },
      { id: "FIX", rubrica: "Fixare și etanșare", produs: p("SUCLE408035", { um: "CUTIE", finisaj: undefined, grosime: undefined }), cantitate: "1", culoare: cheie("RAL 7016") },
      { id: "SPE2", rubrica: "Accesorii speciale 2 ML", produs: p("ASP06LUC050", { finisaj: "lucios" }), cantitate: "2", culoare: cheie("RAL 9005", "lucios") },
    ];
    const intrare: IntrareOferta = {
      cursBnr: "5.3485",
      tvaPct: 21,
      cont: { tip: "AGENT", adaosPct: "1.00" },
      grupaPct: "0",
      tinta: { tip: "adaos_pct", valoare: "20" },
      modPrezentare: "simplu",
      completare: false,
      invelitori: [{ id: "I1", produs: linii[0].produs, rol: "principala", culoare: "RAL 8017", latimeTotalaM: "1.20", panotaj: [{ lungimeM: "4.00", bucati: 10 }] }],
      linii,
      zonaB: [],
    };
    const r = impacheteaza(intrare);
    expect(r.pachete.map((x) => [x.id, x.linii])).toEqual([
      ["P1", ["INV", "LEG"]],
      ["S1", ["STD", "SPE", "FIX"]],
      ["S2", ["SPE2"]],
    ]);
    expect(r.formulare.map((f) => [f.nr, f.invelitoarePrincipala ?? null, f.linii])).toEqual([
      [1, "I1", ["LEG"]],
      [2, null, ["STD", "SPE", "FIX"]],
      [3, null, ["SPE2"]],
    ]);
    expect(r.avertizari).toEqual([]);
  });
});
