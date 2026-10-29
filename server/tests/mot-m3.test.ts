import { describe, expect, it } from "vitest";
import { impacheteaza } from "../src/modules/mot/pachete.js";
import type { IntrareOferta, Invelitoare, LinieOferta, ProdusOferta, Sipca } from "../src/modules/mot/tipuri.js";

// MODIFICAREA M3 la motor (S17a): fiecare formular Bilka poarta, pe langa textul
// pentru agent, continutul structurat - invelitorile (id), liniile de accesorii,
// locurile de pluvial cu liniile lor, blocul de sipca, foaia de lungimi - ca
// generatorul formularului sa citeasca structura, nu textul. Regulile R10 nu se
// schimba: numarul si ordinea formularelor raman cele de la M2 (etaloanele neatinse).


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

describe("M3: continutul structurat al formularelor", () => {
  it("E11: invelitorile pe id, accesoriile pe formularul pachetului lor, pluvialul mat pe locul lui cu liniile lui", () => {
    const o = oferta(
      [inv("I1", CLASIC, "RAL 8017"), inv("I2", RETRO, "RAL 7016", "secundara")],
      [linieInv("L1", CLASIC, "I1"), linieInv("L2", RETRO, "I2"), legata("L3", COAMA, "I1"), legata("L4", COAMA, "I2"), pluvial("L5", jgheab("mat", "125 / 90"), "RAL 8017"), pluvial("L6", jgheab("mat", "125 / 90"), "RAL 7016")],
    );
    const r = impacheteaza(o);
    expect(r.formulare).toHaveLength(2);
    expect(r.formulare[0]).toMatchObject({ nr: 1, invelitoarePrincipala: "I1", invelitoriSecundare: [], linii: ["L3"], lungimi: [] });
    expect(r.formulare[0].pluvial).toEqual([{ finisaj: "mat", sistem: "125/90", ral: "RAL 8017", linii: ["L5"] }]);
    expect(r.formulare[0].sipca).toBeUndefined();
    expect(r.formulare[1]).toMatchObject({ nr: 2, invelitoarePrincipala: "I2", linii: ["L4"] });
    expect(r.formulare[1].pluvial).toEqual([{ finisaj: "mat", sistem: "125/90", ral: "RAL 7016", linii: ["L6"] }]);
    // textul ramane, neschimbat, pentru agent
    expect(r.formulare[1].continut).toContain("pluvial mat 125/90 RAL 7016");
  });

  it("secundara fara accesorii proprii sta pe formularul principalei (E01)", () => {
    const o = oferta([inv("I1", CLASIC, "RAL 8017"), inv("I2", RETRO, "RAL 8017", "secundara")], [linieInv("L1", CLASIC, "I1"), linieInv("L2", RETRO, "I2"), legata("L3", COAMA, "I1")]);
    const r = impacheteaza(o);
    expect(r.formulare).toHaveLength(1);
    expect(r.formulare[0]).toMatchObject({ invelitoarePrincipala: "I1", invelitoriSecundare: ["I2"], linii: ["L3"], pluvial: [] });
  });

  it("E12: sipca A pe primul formular, sipca B pe formularul garajului, fiecare cu rubrica si liniile ei", () => {
    const S1 = sipca("S1", OSLO, "Oslo, capăt drept", "RAL 7016");
    const S2 = sipca("S2", HAGA, "Haga, capăt rotund", "RAL 8017");
    const o = oferta(
      [inv("I1", CLASIC, "RAL 8017"), inv("I2", CLASIC, "RAL 7016", "secundara")],
      [linieInv("L1", CLASIC, "I1"), linieInv("L2", CLASIC, "I2"), legata("L3", COAMA, "I2"), linieSipca("L4", OSLO, "S1", "RAL 7016"), linieSipca("L5", HAGA, "S2", "RAL 8017")],
      [S1, S2],
    );
    const r = impacheteaza(o);
    expect(r.formulare[0].sipca).toEqual({ id: "S1", linii: ["L4"] });
    expect(r.formulare[1].sipca).toEqual({ id: "S2", linii: ["L5"] });
    expect(r.formulare[0].linii).toEqual([]);
    expect(r.formulare[1].linii).toEqual(["L3"]);
  });

  it("sipca singura: formular fara invelitoare, cu blocul ei", () => {
    const S1 = sipca("S1", OSLO, "Oslo, capăt drept", "RAL 7016");
    const r = impacheteaza(oferta([], [linieSipca("L1", OSLO, "S1", "RAL 7016")], [S1]));
    expect(r.formulare).toHaveLength(1);
    expect(r.formulare[0]).toMatchObject({ nr: 1, invelitoriSecundare: [], linii: [], pluvial: [], sipca: { id: "S1", linii: ["L1"] } });
    expect(r.formulare[0].invelitoarePrincipala).toBeUndefined();
  });

  it("E03: accesoriile la lungimi pe foaia primului formular, oricate culori; nu pe al doilea", () => {
    const o = oferta(
      [inv("I1", CLASIC, "RAL 8017"), inv("I2", RETRO, "RAL 7016", "secundara")],
      [linieInv("L1", CLASIC, "I1"), linieInv("L2", RETRO, "I2"), legata("L3", COAMA, "I2"), laLungimi("L4", "RAL 9002"), laLungimi("L5", "RAL 8017")],
    );
    const r = impacheteaza(o);
    expect(r.formulare).toHaveLength(2);
    expect(r.formulare[0].lungimi).toEqual(["L4", "L5"]);
    expect(r.formulare[1].lungimi).toEqual([]);
    expect(r.formulare[0].linii).toEqual([]);
  });

  it("un pachet de pluvial impartit pe doua formulare: fiecare loc cu liniile lui; piesa comuna urmeaza grupul finisajului si culorii ei", () => {
    // 125/90 mat e ocupat de 7016 pe formularul casei; 8017 125/90 pleaca pe un formular nou,
    // iar 8017 150/100 incape pe formularul casei - acelasi pachet (Pluvial B - mat 8017) pe doua formulare
    const linii = [LINIA_CASEI, pluvial("L2", jgheab("mat", "125 / 90"), "RAL 7016"), pluvial("L3", jgheab("mat", "125 / 90"), "RAL 8017"), pluvial("L4", jgheab("mat", "150 / 100"), "RAL 8017"), pluvial("L5", brida("mat"), "RAL 8017")];
    const r = impacheteaza(oferta(CASA, linii));
    expect(r.formulare).toHaveLength(2);
    expect(r.formulare[0].pluvial).toEqual([
      { finisaj: "mat", sistem: "125/90", ral: "RAL 7016", linii: ["L2"] },
      { finisaj: "mat", sistem: "150/100", ral: "RAL 8017", linii: ["L4"] },
    ]);
    expect(r.formulare[1].pluvial).toEqual([{ finisaj: "mat", sistem: "125/90", ral: "RAL 8017", linii: ["L3", "L5"] }]);
    expect(r.formulare[1].pachete).toEqual(["PLB"]);
    expect(r.formulare[0].pachete).toEqual(["P1", "PLA", "PLB"]);
  });

  it("linia unei sipci 'comanda' (cu pozitii lungime x bucati) sta in blocul de sipca, nu pe foaia de lungimi", () => {
    const S1 = sipca("S1", HAGA, "Haga, capăt rotund", "RAL 8017");
    const linie: LinieOferta = { ...linieSipca("L2", HAGA, "S1", "RAL 8017"), pozitii: [{ lungimeM: "1.20", bucati: 60 }] };
    const r = impacheteaza(oferta(CASA, [LINIA_CASEI, linie], [S1]));
    expect(r.formulare).toHaveLength(1);
    expect(r.formulare[0].sipca).toEqual({ id: "S1", linii: ["L2"] });
    expect(r.formulare[0].lungimi).toEqual([]);
    expect(r.formulare[0].continut).not.toContain("la lungimi");
  });

  it("sectiunea de sine statatoare: formular fara invelitoare cu liniile ei", () => {
    const r = impacheteaza(oferta([], [{ id: "L1", rubrica: "Accesorii standard", produs: COAMA, cantitate: "5", culoare: { ral: "RAL 8017", finisaj: "mat", grosime: "0,50 mm" } }]));
    expect(r.formulare).toHaveLength(1);
    expect(r.formulare[0]).toMatchObject({ invelitoriSecundare: [], linii: ["L1"], pluvial: [], lungimi: [] });
  });
});
