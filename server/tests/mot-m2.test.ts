import { describe, expect, it } from "vitest";
import { impacheteaza, locPluvial, sistemeProdus } from "../src/modules/mot/pachete.js";
import type { IntrareOferta, Invelitoare, LinieOferta, ProdusOferta, Sipca } from "../src/modules/mot/tipuri.js";

// MODIFICAREA M2 la motor (ETALON R10, FISA-OFERTARE v1.2 3.5 / cap. 6 / cap. 8):
// asezarea pe formularele Bilka - sase locuri de pluvial (finisaj x sistem, o
// culoare pe loc), o varianta de sipca pe formular, accesoriile la lungimi fara
// formulare in plus. Pachetele raman cele de la M1.

const produs = (p: Partial<ProdusOferta> & { cod: string }): ProdusOferta => ({ denumire: p.cod, um: "BUC", pretBazaEur: "1.00", ...p });

const CLASIC = produs({ cod: "TMCLSMAT050", denumire: "Țiglă metalică Clasic – mat – 0,50 mm", um: "M2", grup: "Țiglă metalică", familie: "Țiglă metalică Clasic", finisaj: "mat", grosime: "0,50 mm" });
const RETRO = produs({ cod: "REPROMAT050", denumire: "Retro Plus – mat – 0,50 mm", um: "M2", grup: "Învelitori plate", familie: "Retro Plus (Standard)", finisaj: "mat", grosime: "0,50 mm" });
const COAMA = produs({ cod: "ACMICMAT050", denumire: "Coamă mică – mat – 0,50 mm", grup: "Accesorii de tinichigerie", familie: "Coamă mică", finisaj: "mat", grosime: "0,50 mm" });
const OSLO = produs({ cod: "SIPCAMAT050", denumire: "Șipcă Oslo – mat – 0,50 mm", um: "ML", pretBazaEur: "1.11", grup: "Șipcă metalică de gard", familie: "Șipcă Oslo", finisaj: "mat", grosime: "0,50 mm" });
const HAGA = produs({ cod: "SIHAGMAT050", denumire: "Șipcă Haga – mat – 0,50 mm", um: "ML", pretBazaEur: "1.24", grup: "Șipcă metalică de gard", familie: "Șipcă Haga", finisaj: "mat", grosime: "0,50 mm" });
const LUNGIMI = produs({ cod: "AML11LUC050", denumire: "Accesoriu la lungimi D11 – lucios – 0,50 mm", um: "ML", grup: "Accesorii speciale la lungimi", familie: "D11", finisaj: "lucios", grosime: "0,50 mm" });

// pluvial: un jgheab per finisaj x sistem, plus o piesa comuna ("125 / 90 și 150 / 100")
const jgheab = (finisaj: string, sistem: string) =>
  produs({ cod: `JG-${finisaj}-${sistem}`, denumire: `Jgheab ${sistem.slice(0, 3)} / 4m – pluvial ${finisaj}`, grup: `Sistem pluvial ${finisaj}`, familie: `Jgheab ${sistem.slice(0, 3)} / 4m`, finisaj, sistem });
const brida = (finisaj: string) => produs({ cod: `BR-${finisaj}`, denumire: `Bridă – pluvial ${finisaj}`, grup: `Sistem pluvial ${finisaj}`, familie: "Bridă", finisaj, sistem: "125 / 90 și 150 / 100" });

const inv = (id: string, p: ProdusOferta, culoare: string, rol: "principala" | "secundara" = "principala"): Invelitoare => ({ id, produs: p, rol, culoare, latimeTotalaM: "1.20", panotaj: [{ lungimeM: "4.00", bucati: 10 }] });
const linieInv = (id: string, p: ProdusOferta, invelitoare: string): LinieOferta => ({ id, rubrica: "Învelitori", produs: p, cantitate: "1", invelitoare });
const legata = (id: string, p: ProdusOferta, invelitoare: string): LinieOferta => ({ id, rubrica: "Accesorii standard", produs: p, cantitate: "5", invelitoare });
const pluvial = (id: string, p: ProdusOferta, ral: string): LinieOferta => ({ id, rubrica: "Sistem pluvial", produs: p, cantitate: "4", culoare: { ral, finisaj: p.finisaj ?? "" } });
const linieSipca = (id: string, p: ProdusOferta, sipca: string, ral: string): LinieOferta => ({ id, rubrica: "Șipcă gard", produs: p, cantitate: "1", sipca, culoare: { ral, finisaj: "mat", grosime: "0,50 mm" } });
const laLungimi = (id: string, ral: string): LinieOferta => ({ id, rubrica: "Accesorii speciale la lungimi (ML)", produs: LUNGIMI, cantitate: "1", pozitii: [{ lungimeM: "3.00", bucati: 2 }], culoare: { ral, finisaj: "lucios", grosime: "0,50 mm" } });
const sipca = (id: string, p: ProdusOferta, model: string, culoare: string): Sipca => ({ id, produsCod: p.cod, model, culoare, latimeSipcaMm: "92.9", varianta: "comanda", pozitii: [{ lungimeM: "1.20", bucati: 10 }] });

function oferta(invelitori: Invelitoare[], linii: LinieOferta[], sipci?: Sipca[]): IntrareOferta {
  const o: IntrareOferta = { cursBnr: "5.3485", tvaPct: 21, cont: { tip: "AGENT", adaosPct: "1.00" }, grupaPct: "0", tinta: { tip: "adaos_pct", valoare: "20" }, modPrezentare: "simplu", completare: false, invelitori, linii, zonaB: [] };
  if (sipci) o.sipci = sipci;
  return o;
}

const CASA = [inv("I1", CLASIC, "RAL 8017")];
const LINIA_CASEI = linieInv("L1", CLASIC, "I1");

describe("M2: sistemul pluvial din catalog", () => {
  it("sistemeProdus si locul de pe formular", () => {
    expect(sistemeProdus(jgheab("mat", "125 / 90"))).toEqual(["125/90"]);
    expect(sistemeProdus(jgheab("mat", "150 / 100"))).toEqual(["150/100"]);
    expect(sistemeProdus(brida("mat"))).toEqual(["125/90", "150/100"]);
    expect(sistemeProdus(produs({ cod: "X" }))).toEqual(["125/90"]);
    expect(locPluvial("pluvial colorat (lucios)", "125 / 90")).toBe("colorat (lucios)|125/90");
  });
});

describe("M2: cele sase locuri de pluvial (R10)", () => {
  const SISTEME = ["125 / 90", "150 / 100"];
  const FINISAJE = ["colorat (lucios)", "mat", "Magnelis"];

  it("sase sisteme diferite (finisaj x dimensiune), oricate culori -> un singur formular", () => {
    const linii = [LINIA_CASEI];
    let k = 2;
    for (const f of FINISAJE) for (const s of SISTEME) linii.push(pluvial(`L${k++}`, jgheab(f, s), k % 2 ? "RAL 8017" : "RAL 9005"));
    const r = impacheteaza(oferta(CASA, linii));
    expect(r.formulare).toHaveLength(1);
    expect(r.formulare[0].continut).toMatch(/pe locul „colorat \(lucios\) 125\/90”/);
    expect(r.formulare[0].continut).toMatch(/pe locul „Magnelis 150\/100”/);
    expect(r.text).toMatch(/^Se va genera 1 formular Bilka/);
  });

  it("al saptelea sistem (acelasi loc, alta culoare) -> al doilea formular, doar cu pluvial", () => {
    const linii = [LINIA_CASEI];
    let k = 2;
    for (const f of FINISAJE) for (const s of SISTEME) linii.push(pluvial(`L${k++}`, jgheab(f, s), "RAL 8017"));
    linii.push(pluvial("L8", jgheab("mat", "125 / 90"), "RAL 7016"));
    const r = impacheteaza(oferta(CASA, linii));
    expect(r.formulare).toHaveLength(2);
    expect(r.formulare[1].pachete).toEqual(["PLD"]); // al patrulea pachet de pluvial (mat 7016)
    expect(r.formulare[1].continut).toMatch(/^Formular doar cu pluvial \(locul „mat 125\/90” e ocupat/);
    expect(r.formulare[1].continut).toContain("pluvial mat 125/90 RAL 7016 (1 poziții)");
    // pachetele raman pe finisaj + culoare, ca la M1
    expect(r.pachete.filter((p) => p.tip === "pluvial").map((p) => p.nume)).toEqual(["Pluvial A — colorat (lucios) 8017", "Pluvial B — mat 8017", "Pluvial C — Magnelis 8017", "Pluvial D — mat 7016"]);
  });

  it("acelasi loc in doua culori cu un al doilea formular existent -> a doua culoare pe formularul garajului (E11)", () => {
    const o = oferta(
      [inv("I1", CLASIC, "RAL 8017"), inv("I2", RETRO, "RAL 7016", "secundara")],
      [linieInv("L1", CLASIC, "I1"), linieInv("L2", RETRO, "I2"), legata("L3", COAMA, "I2"), pluvial("L4", jgheab("mat", "125 / 90"), "RAL 8017"), pluvial("L5", jgheab("mat", "125 / 90"), "RAL 7016")],
    );
    const r = impacheteaza(o);
    expect(r.formulare.map((f) => f.pachete)).toEqual([
      ["P1", "PLA"],
      ["P2", "PLB"],
    ]);
    expect(r.formulare[1].continut).toContain("pluvial mat 125/90 RAL 7016");
  });

  it("acelasi finisaj in doua dimensiuni si aceeasi culoare -> doua locuri pe acelasi formular; piesa comuna urmeaza grupul finisajului si culorii ei", () => {
    const r = impacheteaza(oferta(CASA, [LINIA_CASEI, pluvial("L2", jgheab("mat", "125 / 90"), "RAL 8017"), pluvial("L3", jgheab("mat", "150 / 100"), "RAL 8017"), pluvial("L4", brida("mat"), "RAL 8017")]));
    expect(r.formulare).toHaveLength(1);
    expect(r.formulare[0].continut).toContain("pluvial mat 125/90 RAL 8017 (2 poziții)"); // jgheabul 125 + brida
    expect(r.formulare[0].continut).toContain("pluvial mat 150/100 RAL 8017 (1 poziții)");
  });

  it("piesa comuna singura -> locul 125 / 90", () => {
    const r = impacheteaza(oferta(CASA, [LINIA_CASEI, pluvial("L2", brida("mat"), "RAL 8017")]));
    expect(r.formulare[0].continut).toContain("pluvial mat 125/90 RAL 8017 (1 poziții)");
  });

  it("un formular doar cu pluvial isi ofera si el locurile urmatoarelor grupuri", () => {
    const linii = [LINIA_CASEI, pluvial("L2", jgheab("mat", "125 / 90"), "RAL 8017"), pluvial("L3", jgheab("mat", "125 / 90"), "RAL 7016"), pluvial("L4", jgheab("mat", "125 / 90"), "RAL 9005"), pluvial("L5", jgheab("mat", "150 / 100"), "RAL 7016")];
    const r = impacheteaza(oferta(CASA, linii));
    // 8017 pe formularul casei; 7016 pe un formular nou; 9005 pe al treilea; 150/100 7016 incape pe formularul casei (locul lui e liber)
    expect(r.formulare).toHaveLength(3);
    expect(r.formulare[0].continut).toContain("pluvial mat 150/100 RAL 7016");
  });
});

describe("M2: sipca - o varianta pe formular", () => {
  const S1 = sipca("S1", OSLO, "Oslo, capăt drept", "RAL 7016");
  const S2 = sipca("S2", HAGA, "Haga, capăt rotund", "RAL 8017");
  const S3 = sipca("S3", OSLO, "Oslo, capăt drept", "RAL 8017"); // acelasi profil, alta culoare = alta varianta

  it("a doua rubrica, cu un formular fara sipca (garajul) -> pe acel formular, fara formular nou (E12)", () => {
    const o = oferta(
      [inv("I1", CLASIC, "RAL 8017"), inv("I2", CLASIC, "RAL 7016", "secundara")],
      [linieInv("L1", CLASIC, "I1"), linieInv("L2", CLASIC, "I2"), legata("L3", COAMA, "I2"), linieSipca("L4", OSLO, "S1", "RAL 7016"), linieSipca("L5", HAGA, "S2", "RAL 8017")],
      [S1, S2],
    );
    const r = impacheteaza(o);
    expect(r.formulare.map((f) => f.pachete)).toEqual([
      ["P1", "SIPA"],
      ["P2", "SIPB"],
    ]);
    expect(r.formulare[1].continut).toContain("blocul de șipcă B (Haga 8017 mat) — primul formular fără șipcă");
  });

  it("a doua rubrica fara formular liber -> formular nou doar cu sipca; a treia pe al doilea formular? nu - are deja sipca -> al treilea", () => {
    const r = impacheteaza(oferta(CASA, [LINIA_CASEI, linieSipca("L2", OSLO, "S1", "RAL 7016"), linieSipca("L3", HAGA, "S2", "RAL 8017"), linieSipca("L4", OSLO, "S3", "RAL 8017")], [S1, S2, S3]));
    expect(r.formulare.map((f) => f.pachete)).toEqual([["P1", "SIPA"], ["SIPB"], ["SIPC"]]);
    expect(r.formulare[1].continut).toMatch(/^Formular doar cu blocul de șipcă B \(Haga 8017 mat\)/);
    expect(r.text).toMatch(/^Se vor genera 3 formulare Bilka/);
  });
});

describe("M2: accesoriile la lungimi", () => {
  it("trei culori la lungimi -> tot un formular, pe foaia lui", () => {
    const r = impacheteaza(oferta(CASA, [LINIA_CASEI, laLungimi("L2", "RAL 9002"), laLungimi("L3", "RAL 8017"), laLungimi("L4", "RAL 9005")]));
    expect(r.formulare).toHaveLength(1);
    expect(r.formulare[0].continut).toContain("accesorii speciale la lungimi pe foaia lor, cu culoarea pe rând (3 rânduri)");
    expect(r.pachete.map((p) => p.tip)).toEqual(["invelitoare"]); // lungimile nu fac pachet
  });

  it("doar lungimi, fara invelitoare -> un formular fara invelitoare", () => {
    const r = impacheteaza(oferta([], [laLungimi("L1", "RAL 9002"), laLungimi("L2", "RAL 8017")]));
    expect(r.formulare).toHaveLength(1);
    expect(r.formulare[0].continut).toMatch(/^Formular fără învelitoare \+ accesorii speciale la lungimi/);
  });
});
