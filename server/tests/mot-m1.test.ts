import { describe, expect, it } from "vitest";
import { calculeazaOferta } from "../src/modules/mot/calcul.js";
import { numeProfilSipca } from "../src/modules/mot/pachete.js";
import type { IntrareOferta, Invelitoare, LinieOferta, ProdusOferta, Sipca } from "../src/modules/mot/tipuri.js";

// MODIFICAREA M1 la motor (ETALON R9, E12; ARH §5.3-5.4): invelitorile si rubricile
// de sipca se identifica prin id-ul lor pe oferta, nu prin codul produsului;
// mai multe rubrici de sipca pe oferta; validarile legaturilor.

const produs = (p: Partial<ProdusOferta> & { cod: string }): ProdusOferta => ({ denumire: p.cod, um: "BUC", pretBazaEur: "1.00", ...p });

const CLASIC = produs({ cod: "TMCLSMAT050", denumire: "Țiglă metalică Clasic – mat – 0,50 mm", um: "M2", pretBazaEur: "6.54", grup: "Țiglă metalică", familie: "Țiglă metalică Clasic", finisaj: "mat", grosime: "0,50 mm" });
const COAMA = produs({ cod: "ACMICMAT050", denumire: "Coamă mică – mat – 0,50 mm", pretBazaEur: "4.90", grup: "Accesorii de tinichigerie", familie: "Coamă mică", finisaj: "mat", grosime: "0,50 mm" });
const OSLO = produs({ cod: "SIPCAMAT050", denumire: "Șipcă Oslo – mat – 0,50 mm", um: "ML", pretBazaEur: "1.11", grup: "Șipcă metalică de gard", familie: "Șipcă Oslo", finisaj: "mat", grosime: "0,50 mm" });
const HAGA = produs({ cod: "SIHAGMAT050", denumire: "Șipcă Haga – mat – 0,50 mm", um: "ML", pretBazaEur: "1.24", grup: "Șipcă metalică de gard", familie: "Șipcă Haga", finisaj: "mat", grosime: "0,50 mm" });
const SINUS = produs({ cod: "TCS18MAT050", denumire: "Tablă sinus S18 – mat – 0,50 mm", um: "M2", grup: "Tablă cutată", familie: "Tablă sinus S18", finisaj: "mat", grosime: "0,50 mm" });

const inv = (id: string, culoare: string, panotaj: { lungimeM: string; bucati: number }[], rol: "principala" | "secundara" = "secundara"): Invelitoare => ({
  id,
  produs: CLASIC,
  rol,
  culoare,
  latimeTotalaM: "1.20",
  panotaj,
});
const linieInv = (id: string, invelitoare: string): LinieOferta => ({ id, rubrica: "Învelitori", produs: CLASIC, cantitate: "1", invelitoare });
const legata = (id: string, invelitoare: string, cantitate: string): LinieOferta => ({ id, rubrica: "Accesorii standard", produs: COAMA, cantitate, invelitoare });
const linieSipca = (id: string, p: ProdusOferta, sipca: string, ral: string): LinieOferta => ({ id, rubrica: "Șipcă gard", produs: p, cantitate: "1", sipca, culoare: { ral, finisaj: "mat", grosime: "0,50 mm" } });

function oferta(invelitori: Invelitoare[], linii: LinieOferta[], sipci?: Sipca[]): IntrareOferta {
  const o: IntrareOferta = {
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
  if (sipci) o.sipci = sipci;
  return o;
}

describe("M1: invelitorile se identifica prin id, nu prin cod (R9)", () => {
  it("acelasi produs in doua culori, fiecare cu accesorii proprii: P1 si P2; coama cu acelasi cod in pachete diferite", () => {
    const o = oferta(
      [inv("I1", "RAL 8017", [{ lungimeM: "4.50", bucati: 20 }], "principala"), inv("I2", "RAL 7016", [{ lungimeM: "5.10", bucati: 6 }])],
      [linieInv("L1", "I1"), linieInv("L2", "I2"), legata("L3", "I1", "12"), legata("L4", "I2", "4")],
    );
    const r = calculeazaOferta(o);
    expect(r.cantitati.invelitori.map((i) => [i.id, i.mp, i.coli])).toEqual([
      ["I1", "108.000", 20],
      ["I2", "36.720", 6],
    ]);
    // linia fiecarei invelitori primeste mp-ul ei, desi codul e acelasi
    expect(r.linii.map((l) => l.cantitate)).toEqual(["108.000", "36.720", "12", "4"]);
    expect(r.pachete.map((p) => [p.nume, p.linii])).toEqual([
      ["P1 — Clasic 8017 mat", ["L1", "L3"]],
      ["P2 — Clasic 7016 mat", ["L2", "L4"]],
    ]);
    expect(r.linii.map((l) => l.pachet)).toEqual(["P1 — Clasic 8017 mat", "P2 — Clasic 7016 mat", "P1 — Clasic 8017 mat", "P2 — Clasic 7016 mat"]);
    expect(r.formulareBilka).toHaveLength(2);
    expect(r.comandabil.da).toBe(true);
  });

  it("acelasi produs, alta culoare, fara accesorii proprii: ramane in P1 ca secundara (FISA 3.4)", () => {
    const o = oferta(
      [inv("I1", "RAL 8017", [{ lungimeM: "4.50", bucati: 20 }], "principala"), inv("I2", "RAL 7016", [{ lungimeM: "5.10", bucati: 6 }])],
      [linieInv("L1", "I1"), linieInv("L2", "I2"), legata("L3", "I1", "12")],
    );
    const r = calculeazaOferta(o);
    expect(r.pachete.map((p) => [p.nume, p.linii, p.invelitoriSecundare])).toEqual([["P1 — Clasic 8017 mat", ["L1", "L3", "L2"], ["I2"]]]);
    expect(r.formulareBilka).toHaveLength(1);
  });

  it("validari: id dublat, legatura la o invelitoare inexistenta, invelitoare fara linie sau cu doua linii", () => {
    const buna = () => oferta([inv("I1", "RAL 8017", [{ lungimeM: "4.50", bucati: 20 }], "principala")], [linieInv("L1", "I1"), legata("L2", "I1", "3")]);
    expect(() => calculeazaOferta(buna())).not.toThrow();

    const dublat = buna();
    dublat.invelitori.push(inv("I1", "RAL 7016", [{ lungimeM: "2.00", bucati: 1 }]));
    expect(() => calculeazaOferta(dublat)).toThrow(/id de invelitoare dublat: I1/);

    const inexistenta = buna();
    inexistenta.linii[1].invelitoare = "I9";
    expect(() => calculeazaOferta(inexistenta)).toThrow(/invelitoare inexistenta: I9/);

    const faraLinie = buna();
    delete faraLinie.linii[0].invelitoare;
    expect(() => calculeazaOferta(faraLinie)).toThrow(/are 0 linii in rubrica Invelitori/);

    const douaLinii = buna();
    douaLinii.linii.push(linieInv("L3", "I1"));
    expect(() => calculeazaOferta(douaLinii)).toThrow(/are 2 linii in rubrica Invelitori/);
  });
});

describe("M1: mai multe rubrici de sipca (FISA cap. 8, R9)", () => {
  const S1: Sipca = { id: "S1", produsCod: OSLO.cod, model: "Oslo, capăt drept", culoare: "RAL 7016", latimeSipcaMm: "92.9", varianta: "calcul", tronsoane: [{ lungimeSipcaM: "1.50", lungimeTronsonM: "14.00", distantaMm: "30" }] };
  const S2: Sipca = { id: "S2", produsCod: HAGA.cod, model: "Haga, capăt rotund", culoare: "RAL 8017", latimeSipcaMm: "111.3", varianta: "comanda", pozitii: [{ lungimeM: "1.20", bucati: 60 }] };

  it("doua rubrici: cantitati pe fiecare, Sipca A in blocul primului formular, Sipca B formular separat", () => {
    const o = oferta(
      [inv("I1", "RAL 8017", [{ lungimeM: "4.50", bucati: 20 }], "principala")],
      [linieInv("L1", "I1"), linieSipca("L2", OSLO, "S1", "RAL 7016"), linieSipca("L3", HAGA, "S2", "RAL 8017")],
      [S1, S2],
    );
    const r = calculeazaOferta(o);
    expect(r.cantitati.sipci).toEqual([
      { id: "S1", tronsoane: [{ bucati: 114, ml: "171.000" }], bucatiTotal: 114, mlTotal: "171.000" }, // 14000 / 122,9 = 113,9 -> 114
      { id: "S2", tronsoane: [{ bucati: 60, ml: "72.000" }], bucatiTotal: 60, mlTotal: "72.000" },
    ]);
    expect(r.linii.map((l) => l.cantitate)).toEqual(["108.000", "171.000", "72.000"]);
    expect(r.pachete.map((p) => [p.id, p.nume, p.tip, p.linii])).toEqual([
      ["P1", "P1 — Clasic 8017 mat", "invelitoare", ["L1"]],
      ["SIPA", "Șipcă A — Oslo 7016 mat", "sipca", ["L2"]],
      ["SIPB", "Șipcă B — Haga 8017 mat", "sipca", ["L3"]],
    ]);
    expect(r.formulareBilka).toHaveLength(2);
    expect(r.formulareBilka[0].pachete).toEqual(["P1", "SIPA"]);
    expect(r.formulareBilka[0].continut).toMatch(/\+ blocul de șipcă A \(Oslo 7016 mat\)/);
    expect(r.formulareBilka[1]).toMatchObject({ nr: 2, pachete: ["SIPB"] });
    expect(r.formulareBilka[1].continut).toMatch(/^Șipcă B — Haga 8017 mat singură/);
    expect(r.textFormulare).toMatch(/^Se vor genera 2 formulare Bilka/);
  });

  it("sipca singura, fara invelitoare: un formular fara invelitoare cu blocul de sipca A", () => {
    const r = calculeazaOferta(oferta([], [linieSipca("L1", OSLO, "S1", "RAL 7016")], [S1]));
    expect(r.pachete.map((p) => p.nume)).toEqual(["Șipcă A — Oslo 7016 mat"]);
    expect(r.formulareBilka).toHaveLength(1);
    expect(r.formulareBilka[0].continut).toMatch(/^Formular fără învelitoare \+ blocul de șipcă A/);
  });

  it("validari: id de sipca dublat, linie care trimite la o rubrica inexistenta, rubrica fara linie sau cu doua linii", () => {
    const baza = () => oferta([], [linieSipca("L1", OSLO, "S1", "RAL 7016")], [structuredClone(S1)]);
    expect(() => calculeazaOferta(baza())).not.toThrow();

    const dublat = baza();
    dublat.sipci!.push({ ...structuredClone(S1) });
    dublat.linii.push(linieSipca("L2", OSLO, "S1", "RAL 7016"));
    expect(() => calculeazaOferta(dublat)).toThrow(/id de rubrica de sipca dublat: S1/);

    const inexistenta = baza();
    inexistenta.linii[0].sipca = "S9";
    expect(() => calculeazaOferta(inexistenta)).toThrow(/rubrica de sipca inexistenta: S9/);

    const faraLinie = baza();
    delete faraLinie.linii[0].sipca;
    expect(() => calculeazaOferta(faraLinie)).toThrow(/rubrica de sipca S1 .* are 0 linii/);

    const douaLinii = baza();
    douaLinii.linii.push(linieSipca("L2", OSLO, "S1", "RAL 7016"));
    expect(() => calculeazaOferta(douaLinii)).toThrow(/are 2 linii/);
  });

  it("numele profilului vine din catalog: familia fara cuvintele comune cu grupul, doar la sipca", () => {
    expect(numeProfilSipca(OSLO)).toBe("Oslo");
    expect(numeProfilSipca(HAGA)).toBe("Haga");
    expect(numeProfilSipca(SINUS)).toBe("sinus S18"); // de aceea regula nu se aplica la celelalte pachete (numeModel ramane "Tablă sinus S18")
  });
});
