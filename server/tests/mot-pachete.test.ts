import { describe, expect, it } from "vitest";
import { calculeazaOferta } from "../src/modules/mot/calcul.js";
import { finisajScurt, impacheteaza, numarRal, numeModel } from "../src/modules/mot/pachete.js";
import type { IntrareOferta, Invelitoare, LinieOferta, ProdusOferta } from "../src/modules/mot/tipuri.js";

// Pachetele si formularele Bilka (FISA-OFERTARE 3.3-3.5, 3.8; ETALON E11):
// cele trei reguli de impachetare, pluvialul in doua culori, sectiunea de sine
// statatoare, numele derivate din catalog si textul pentru agent.

const produs = (p: Partial<ProdusOferta> & { cod: string }): ProdusOferta => ({ denumire: p.cod, um: "BUC", pretBazaEur: "1.00", ...p });

const CLASIC = produs({ cod: "TMCLSMAT050", denumire: "Țiglă metalică Clasic – mat – 0,50 mm", um: "M2", grup: "Țiglă metalică", familie: "Țiglă metalică Clasic", finisaj: "mat", grosime: "0,50 mm" });
const RETRO = produs({ cod: "REPROMAT050", denumire: "Retro Plus (Standard, Micro-Ribs, Flat, Double Line) – mat – 0,50 mm", um: "M2", grup: "Învelitori plate", familie: "Retro Plus (Standard, Micro-Ribs, Flat, Double Line)", finisaj: "mat", grosime: "0,50 mm" });
const T8 = produs({ cod: "TCT08MAT050", denumire: "Tablă cutată T8 (perete) – mat – 0,50 mm", um: "M2", grup: "Tablă cutată", familie: "Tablă cutată T8 (perete)", finisaj: "mat", grosime: "0,50 mm" });
const COAMA = produs({ cod: "ACMICMAT050", denumire: "Coamă mică – mat – 0,50 mm", grup: "Accesorii de tinichigerie", familie: "Coamă mică", finisaj: "mat", grosime: "0,50 mm" });
const COAMA_RETRO = produs({ cod: "ACR41MAT050", denumire: "Coamă Retro – 417 mm / 2 m – mat – 0,50 mm", grup: "Accesorii de tinichigerie", familie: "Coamă Retro", finisaj: "mat", grosime: "0,50 mm" });
const SURUB = produs({ cod: "SUCLE408035", denumire: "Holțșuruburi în culoare, lemn – 4,8 × 35 mm", um: "CUTIE", grup: "Elemente de fixare", familie: "Holțșuruburi în culoare, lemn" });
const JGHEAB_MAT = produs({ cod: "SMJGH1254ML", denumire: "Jgheab 125 / 4m – pluvial mat", grup: "Sistem pluvial mat", familie: "Jgheab 125 / 4m", finisaj: "mat" });
const BURLAN_MAT = produs({ cod: "SMBUR0903ML", denumire: "Burlan 90 / 3m – pluvial mat", grup: "Sistem pluvial mat", familie: "Burlan 90 / 3m", finisaj: "mat" });
const JGHEAB_LUC = produs({ cod: "SPJGH1254ML", denumire: "Jgheab 125 / 4m – pluvial colorat (lucios)", grup: "Sistem pluvial colorat (lucios)", familie: "Jgheab 125 / 4m", finisaj: "colorat (lucios)" });

const inv = (id: string, p: ProdusOferta, culoare: string, rol: "principala" | "secundara" = "principala", extra: Partial<Invelitoare> = {}): Invelitoare => ({
  id,
  produs: p,
  rol,
  culoare,
  latimeTotalaM: "1.20",
  panotaj: [{ lungimeM: "4.00", bucati: 10 }],
  ...extra,
});

// linia invelitorii poarta id-ul ei (M1); in testele de aici id-ul invelitorii e codul produsului
const linieInv = (id: string, p: ProdusOferta, invelitoare = p.cod): LinieOferta => ({ id, rubrica: "Învelitori", produs: p, cantitate: "1", invelitoare });
const legata = (id: string, p: ProdusOferta, invelitoare: string, cantitate = "5"): LinieOferta => ({ id, rubrica: "Accesorii standard", produs: p, cantitate, invelitoare });
const pluvial = (id: string, p: ProdusOferta, ral: string, cantitate = "4"): LinieOferta => ({ id, rubrica: "Sistem pluvial", produs: p, cantitate, culoare: { ral, finisaj: p.finisaj ?? "" } });
const deSine = (id: string, p: ProdusOferta, ral: string, grosime = "0,50 mm"): LinieOferta => ({ id, rubrica: "Fixare și etanșare", produs: p, cantitate: "2", culoare: { ral, finisaj: "mat", grosime } });

function oferta(invelitori: Invelitoare[], linii: LinieOferta[]): IntrareOferta {
  return {
    cursBnr: "5.3485",
    tvaPct: 21,
    cont: { tip: "AGENT", adaosPct: "1.00" },
    grupaPct: "0",
    tinta: { tip: "adaos_pct", valoare: "20" },
    modPrezentare: "simplu",
    completare: false,
    invelitori,
    linii,
    zonaB: [],
  };
}

describe("numele derivate din catalog (fara liste de prescurtari)", () => {
  it("familia fara prefixul grupului si fara paranteze", () => {
    expect(numeModel(CLASIC)).toBe("Clasic");
    expect(numeModel(RETRO)).toBe("Retro Plus");
    expect(numeModel(T8)).toBe("T8");
    expect(numeModel(produs({ cod: "X", denumire: "Produs fără familie" }))).toBe("Produs fără familie");
  });

  it("numarul RAL si finisajul scurt", () => {
    expect(numarRal("RAL 8017")).toBe("8017");
    expect(numarRal("ral7016")).toBe("7016");
    expect(finisajScurt("pluvial mat")).toBe("mat");
    expect(finisajScurt("pluvial colorat (lucios)")).toBe("colorat (lucios)");
    expect(finisajScurt("mat")).toBe("mat");
  });
});

describe("cele trei reguli de impachetare (FISA-OFERTARE 3.4)", () => {
  it("secundara cu aceeasi cheie -> acelasi pachet, cu accesoriile ei", () => {
    const o = oferta(
      [inv("TMCLSMAT050", CLASIC, "RAL 8017"), inv("TCT08MAT050", T8, "RAL 8017", "secundara")],
      [linieInv("L1", CLASIC), linieInv("L2", T8), legata("L3", COAMA, "TMCLSMAT050"), legata("L4", SURUB, "TCT08MAT050")],
    );
    const r = impacheteaza(o);
    expect(r.pachete).toHaveLength(1);
    expect(r.pachete[0]).toMatchObject({ id: "P1", nume: "P1 — Clasic 8017 mat", invelitoarePrincipala: "TMCLSMAT050", invelitoriSecundare: ["TCT08MAT050"], linii: ["L1", "L3", "L2", "L4"] });
    expect(r.formulare).toHaveLength(1);
    expect(r.text).toMatch(/^Se va genera 1 formular Bilka: 1\) Clasic 8017 mat 0,50 ca învelitoare principală \+ T8 8017 mat 0,50 ca învelitoare secundară/);
  });

  it("secundara cu alta cheie, fara accesorii proprii -> acelasi pachet (intra ca secundara pe formular)", () => {
    const o = oferta(
      [inv("TMCLSMAT050", CLASIC, "RAL 8017"), inv("REPROMAT050", RETRO, "RAL 7016", "secundara")],
      [linieInv("L1", CLASIC), linieInv("L2", RETRO), legata("L3", COAMA, "TMCLSMAT050")],
    );
    const r = impacheteaza(o);
    expect(r.pachete.map((p) => [p.id, p.linii])).toEqual([["P1", ["L1", "L3", "L2"]]]);
    expect(r.pachete[0].invelitoriSecundare).toEqual(["REPROMAT050"]);
    expect(r.formulare).toHaveLength(1);
  });

  it("secundara cu alta cheie SI accesorii proprii -> pachet separat (E11)", () => {
    const o = oferta(
      [inv("TMCLSMAT050", CLASIC, "RAL 8017"), inv("REPROMAT050", RETRO, "RAL 7016", "secundara", { variantaProfil: "Standard", latimeTotalaM: "0.542" })],
      [linieInv("L1", CLASIC), linieInv("L2", RETRO), legata("L3", COAMA, "TMCLSMAT050"), legata("L4", COAMA_RETRO, "REPROMAT050"), legata("L5", SURUB, "REPROMAT050")],
    );
    const r = impacheteaza(o);
    expect(r.pachete.map((p) => [p.id, p.nume, p.linii])).toEqual([
      ["P1", "P1 — Clasic 8017 mat", ["L1", "L3"]],
      ["P2", "P2 — Retro Plus 7016 mat", ["L2", "L4", "L5"]],
    ]);
    expect(r.pachetPeLinie.get("L5")).toBe("P2 — Retro Plus 7016 mat");
    expect(r.formulare.map((f) => f.nr)).toEqual([1, 2]);
    expect(r.formulare[1].continut).toContain("Retro Plus Standard 7016 mat 0,50 ca învelitoare principală");
    expect(r.formulare[1].continut).toContain("pachet separat");
    expect(r.text).toMatch(/^Se vor genera 2 formulare Bilka: 1\) .*; 2\) .*\.$/);
  });
});

describe("pluvialul si sectiunile de sine statatoare (FISA-OFERTARE 3.5, 3.8)", () => {
  it("doua culori de pluvial -> doua grupuri; pe formulare (M2): a doua culoare pe un formular nou doar cu pluvial", () => {
    const o = oferta(
      [inv("TMCLSMAT050", CLASIC, "RAL 8017")],
      [linieInv("L1", CLASIC), pluvial("L2", JGHEAB_MAT, "RAL 8017"), pluvial("L3", BURLAN_MAT, "RAL 8017"), pluvial("L4", JGHEAB_MAT, "RAL 7016"), pluvial("L5", BURLAN_MAT, "RAL 7016")],
    );
    const r = impacheteaza(o);
    expect(r.pachete.map((p) => [p.id, p.nume, p.linii])).toEqual([
      ["P1", "P1 — Clasic 8017 mat", ["L1"]],
      ["PLA", "Pluvial A — mat 8017", ["L2", "L3"]],
      ["PLB", "Pluvial B — mat 7016", ["L4", "L5"]],
    ]);
    expect(r.formulare).toHaveLength(2);
    expect(r.formulare[0].continut).toContain("pluvial mat 125/90 RAL 8017 (2 poziții) pe locul „mat 125/90”");
    expect(r.formulare[1].continut).toMatch(/^Formular doar cu pluvial/);
    expect(r.formulare[1].continut).toContain("pluvial mat 125/90 RAL 7016 (2 poziții)");
  });

  it("pluvial lucios si mat in aceeasi culoare -> doua pachete, dar un singur formular (locuri diferite, M2)", () => {
    const o = oferta([inv("TMCLSMAT050", CLASIC, "RAL 8017")], [linieInv("L1", CLASIC), pluvial("L2", JGHEAB_MAT, "RAL 8017"), pluvial("L3", JGHEAB_LUC, "RAL 8017")]);
    const r = impacheteaza(o);
    expect(r.pachete.filter((p) => p.tip === "pluvial").map((p) => p.nume)).toEqual(["Pluvial A — mat 8017", "Pluvial B — colorat (lucios) 8017"]);
    expect(r.formulare).toHaveLength(1);
  });

  it("sectiune de sine statatoare (fara invelitoare) -> formular fara invelitoare, unul per cheie (E10)", () => {
    const o = oferta([], [deSine("L1", COAMA, "RAL 3005"), deSine("L2", SURUB, "RAL 3005"), deSine("L3", COAMA, "RAL 9005"), pluvial("L4", JGHEAB_LUC, "RAL 3005")]);
    const r = impacheteaza(o);
    expect(r.pachete.map((p) => [p.tip, p.linii])).toEqual([
      ["pluvial", ["L4"]],
      ["de_sine_statatoare", ["L1", "L2"]],
      ["de_sine_statatoare", ["L3"]],
    ]);
    // M2: doua sectiuni = doua formulare fara invelitoare; pluvialul intra pe locul lui de pe primul
    expect(r.formulare).toHaveLength(2);
    expect(r.formulare[0].continut).toMatch(/^Formular fără învelitoare: doar finisaj, grosime și culoare \(3005 mat 0,50\), 2 linii \+ pluvial colorat \(lucios\) 125\/90 RAL 3005/);
    expect(r.text).toMatch(/^Se vor genera 2 formulare Bilka/);
  });

  it("fara niciun produs de formular: text explicit, fara avertizari", () => {
    const r = impacheteaza(oferta([], []));
    expect(r.pachete).toEqual([]);
    expect(r.text).toMatch(/^Nu se generează niciun formular/);
  });
});

describe("calculeazaOferta leaga pachetele de linii", () => {
  it("fiecare linie primeste pachetul ei, iar rezultatul are pachete, formulare si textul pentru agent", () => {
    const o = oferta(
      [inv("TMCLSMAT050", CLASIC, "RAL 8017"), inv("REPROMAT050", RETRO, "RAL 7016", "secundara")],
      [linieInv("L1", CLASIC), linieInv("L2", RETRO), legata("L3", COAMA_RETRO, "REPROMAT050"), pluvial("L4", JGHEAB_MAT, "RAL 8017")],
    );
    const r = calculeazaOferta(o);
    expect(r.linii.map((l) => l.pachet)).toEqual(["P1 — Clasic 8017 mat", "P2 — Retro Plus 7016 mat", "P2 — Retro Plus 7016 mat", "Pluvial A — mat 8017"]);
    // achizitia pe pachet = suma valorilor de achizitie ale liniilor (1,00 x 1,01 = 1,01 EUR pe unitate)
    expect(r.pachete.map((p) => p.achizitieEur)).toEqual(["48.48", "53.53", "4.04"]); // 48 mp, 48 mp + 5 buc, 4 buc
    expect(r.formulareBilka.map((f) => f.nr)).toEqual([1, 2]); // M2: pluvialul pe locul lui de pe primul formular
    expect(r.textFormulare).toMatch(/^Se vor genera 2 formulare Bilka: 1\) Clasic 8017 mat 0,50 ca învelitoare principală/);
  });
});
