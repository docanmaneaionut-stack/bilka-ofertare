import { describe, expect, it } from "vitest";
import { calculeazaOferta } from "../src/modules/mot/calcul.js";
import { impacheteaza } from "../src/modules/mot/pachete.js";
import type { IntrareOferta, Invelitoare, LinieOferta, ProdusOferta } from "../src/modules/mot/tipuri.js";

// MODIFICAREA M4 la motor (S17d; raspunsul 7 din docs/INTREBARI-BILKA.md): orice rand
// cu lista al formularului Bilka tine o singura varianta pe formular. Ofertarea da
// fiecarei linii randul formularului pe care incape (`randFormular`, din tabela de
// corespondenta si sablonul firmei); a doua linie care cere acelasi rand pleaca pe
// primul formular existent cu aceeasi cheie (finisaj, grosime, culoare) care are
// randul liber, altfel pe un formular nou cu cheia sectiunii. Liniile fara rand raman
// exact ca la M2 / M3 - etaloanele (fara `randFormular`) nu se schimba.

const produs = (p: Partial<ProdusOferta> & { cod: string }): ProdusOferta => ({ denumire: p.cod, um: "BUC", pretBazaEur: "1.00", ...p });

const CLASIC = produs({ cod: "TMCLSMAT050", denumire: "Țiglă metalică Clasic – mat – 0,50 mm", um: "M2", grup: "Țiglă metalică", familie: "Țiglă metalică Clasic", finisaj: "mat", grosime: "0,50 mm" });
const RETRO = produs({ cod: "REPROMAT050", denumire: "Retro Plus – mat – 0,50 mm", um: "M2", grup: "Învelitori plate", familie: "Retro Plus (Standard)", finisaj: "mat", grosime: "0,50 mm" });
const SPRAY = produs({ cod: "AXSPRMAT400", denumire: "Spray corector 400 ml – mat", grup: "Accesorii auxiliare", familie: "Corectoare", finisaj: "mat" });
const CORECTOR = produs({ cod: "BIL-60FEB9E05C", denumire: "Corector colorat pentru acoperiș – mat", grup: "Accesorii auxiliare", familie: "Corector colorat pentru acoperiș", finisaj: "mat" });
const DOLIE417 = produs({ cod: "ADO41MAT050", denumire: "Dolie – 417 mm / 2 m – mat – 0,50 mm", grup: "Accesorii de tinichigerie", familie: "Dolie", finisaj: "mat", grosime: "0,50 mm" });
const DOLIE625 = produs({ cod: "ADO62MAT050", denumire: "Dolie – 625 mm / 2 m – mat – 0,50 mm", grup: "Accesorii de tinichigerie", familie: "Dolie", finisaj: "mat", grosime: "0,50 mm" });
const COAMA = produs({ cod: "ACMICMAT050", denumire: "Coamă mică – mat – 0,50 mm", grup: "Accesorii de tinichigerie", familie: "Coamă mică", finisaj: "mat", grosime: "0,50 mm" });
const COAMA_MARE = produs({ cod: "ACMARMAT050", denumire: "Coamă mare – mat – 0,50 mm", grup: "Accesorii de tinichigerie", familie: "Coamă mare", finisaj: "mat", grosime: "0,50 mm" });
const PROFIL_U = (t: string, cod: string) => produs({ cod, denumire: `Profil U tablă cutată ${t} – mat – 0,50 mm`, grup: "Accesorii de tinichigerie", familie: `Profil U tablă cutată ${t}`, finisaj: "mat", grosime: "0,50 mm" });

const inv = (id: string, p: ProdusOferta, culoare: string, rol: "principala" | "secundara" = "principala"): Invelitoare => ({ id, produs: p, rol, culoare, latimeTotalaM: "1.20", panotaj: [{ lungimeM: "4.00", bucati: 10 }] });
const linieInv = (id: string, p: ProdusOferta, invelitoare: string): LinieOferta => ({ id, rubrica: "Învelitori", produs: p, cantitate: "1", invelitoare });
// linie legata de invelitoare, cu randul formularului dat de ofertare
const legata = (id: string, p: ProdusOferta, invelitoare: string, randFormular?: string): LinieOferta => ({ id, rubrica: "Accesorii standard", produs: p, cantitate: "5", invelitoare, ...(randFormular ? { randFormular } : {}) });
// linie de sine statatoare (cheie proprie), cu randul ei
const singura = (id: string, p: ProdusOferta, ral: string, randFormular?: string): LinieOferta => ({ id, rubrica: "Accesorii standard", produs: p, cantitate: "5", culoare: { ral, finisaj: "mat", grosime: "0,50 mm" }, ...(randFormular ? { randFormular } : {}) });

function oferta(invelitori: Invelitoare[], linii: LinieOferta[]): IntrareOferta {
  return { cursBnr: "5.3485", tvaPct: 21, cont: { tip: "AGENT", adaosPct: "1.00" }, grupaPct: "0", tinta: { tip: "adaos_pct", valoare: "20" }, modPrezentare: "simplu", completare: false, invelitori, linii, zonaB: [] };
}

const CASA = [inv("I1", CLASIC, "RAL 8017")];
const LINIA_CASEI = linieInv("L1", CLASIC, "I1");

describe("M4: un rand cu lista tine o singura varianta pe formular", () => {
  it("spray + corector pe aceeasi invelitoare (randul SPRAY RETUS / CORECTOR): al doilea pe un formular nou, cu cheia sectiunii", () => {
    const r = impacheteaza(oferta(CASA, [LINIA_CASEI, legata("L2", SPRAY, "I1", "M71"), legata("L3", CORECTOR, "I1", "M71")]));
    expect(r.formulare).toHaveLength(2);
    expect(r.formulare[0]).toMatchObject({ nr: 1, invelitoarePrincipala: "I1", linii: ["L2"] });
    expect(r.formulare[1]).toMatchObject({ nr: 2, invelitoriSecundare: [], linii: ["L3"], pluvial: [], lungimi: [] });
    expect(r.formulare[1].invelitoarePrincipala).toBeUndefined();
    // textul spune de ce: a doua varianta pe acelasi rand, cu cheia formularului
    expect(r.formulare[1].continut).toContain("Corector colorat pentru acoperiș – mat");
    expect(r.formulare[1].continut).toMatch(/a doua variantă pe același rând/);
    expect(r.formulare[1].continut).toContain("8017 mat 0,50");
    expect(r.text).toContain("Se vor genera 2 formulare");
    // pachetele nu se schimba: ambele linii raman in pachetul casei
    expect(r.pachetPeLinie.get("L3")).toBe(r.pachetPeLinie.get("L2"));
    expect(r.formulare[1].pachete).toEqual(["P1"]);
  });

  it("doua marimi de dolie pe acelasi rand: a doua pe primul formular existent cu aceeasi cheie si randul liber (sectiunea de sine statatoare)", () => {
    // casa mat 8017 0,50 cu dolie 417 si 625 (randul DOLIE); o sectiune de sine statatoare cu aceeasi cheie are randul liber
    const r = impacheteaza(oferta(CASA, [LINIA_CASEI, legata("L2", DOLIE417, "I1", "C74"), legata("L3", DOLIE625, "I1", "C74"), singura("L4", COAMA, "RAL 8017", "C64")]));
    expect(r.formulare).toHaveLength(2);
    expect(r.formulare[0].linii).toEqual(["L2"]);
    expect(r.formulare[1].linii).toEqual(["L4", "L3"]);
    expect(r.formulare[1].continut).toMatch(/Dolie – 625 mm.*a doua variantă pe același rând/);
  });

  it("alta cheie nu primeste a doua varianta: dolia 625 nu merge pe formularul garajului (7016)", () => {
    const r = impacheteaza(oferta([inv("I1", CLASIC, "RAL 8017"), inv("I2", RETRO, "RAL 7016", "secundara")], [LINIA_CASEI, linieInv("L5", RETRO, "I2"), legata("L2", DOLIE417, "I1", "C74"), legata("L3", DOLIE625, "I1", "C74"), legata("L4", COAMA, "I2", "C64")]));
    expect(r.formulare).toHaveLength(3);
    expect(r.formulare[1]).toMatchObject({ invelitoarePrincipala: "I2", linii: ["L4"] });
    expect(r.formulare[2].linii).toEqual(["L3"]);
    expect(r.formulare[2].invelitoarePrincipala).toBeUndefined();
  });

  it("trei profile U pe acelasi rand: T35 pe casa, T45 pe un formular nou, T8 pe al treilea (randul e ocupat si pe al doilea)", () => {
    const r = impacheteaza(oferta(CASA, [LINIA_CASEI, legata("L2", PROFIL_U("T35", "APU35MAT050"), "I1", "C110"), legata("L3", PROFIL_U("T45", "APU45MAT050"), "I1", "C110"), legata("L4", PROFIL_U("T8", "APU08MAT050"), "I1", "C110")]));
    expect(r.formulare).toHaveLength(3);
    expect(r.formulare.map((f) => f.linii)).toEqual([["L2"], ["L3"], ["L4"]]);
  });

  it("randuri diferite nu se despart (coama mica si coama mare au randuri separate in sablon); liniile fara rand raman ca la M3", () => {
    const r = impacheteaza(oferta(CASA, [LINIA_CASEI, legata("L2", COAMA, "I1", "C64"), legata("L3", COAMA_MARE, "I1", "C65"), legata("L4", DOLIE417, "I1"), legata("L5", DOLIE625, "I1")]));
    expect(r.formulare).toHaveLength(1);
    expect(r.formulare[0].linii).toEqual(["L2", "L3", "L4", "L5"]);
  });

  it("formularul nou cu cheia sectiunii primeste si el variante urmatoare de pe alte randuri, in ordinea liniilor", () => {
    // doua perechi pe doua randuri: ambele a doua variante merg pe acelasi formular nou (randuri diferite acolo)
    const r = impacheteaza(oferta(CASA, [LINIA_CASEI, legata("L2", DOLIE417, "I1", "C74"), legata("L3", DOLIE625, "I1", "C74"), legata("L4", SPRAY, "I1", "M71"), legata("L5", CORECTOR, "I1", "M71")]));
    expect(r.formulare).toHaveLength(2);
    expect(r.formulare[0].linii).toEqual(["L2", "L4"]);
    expect(r.formulare[1].linii).toEqual(["L3", "L5"]);
  });

  it("intrarea motorului accepta randFormular si calculul intreg da formularele dupa M4", () => {
    const r = calculeazaOferta(oferta(CASA, [LINIA_CASEI, legata("L2", SPRAY, "I1", "M71"), legata("L3", CORECTOR, "I1", "M71")]));
    expect(r.formulareBilka).toHaveLength(2);
    expect(r.formulareBilka[1].linii).toEqual(["L3"]);
  });
});
