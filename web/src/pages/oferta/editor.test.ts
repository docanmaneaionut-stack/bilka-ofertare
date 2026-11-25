import { describe, expect, it } from "vitest";
import type { OfertaDetaliu } from "../../api";
import { invelitoareGoala, spreServer, stareDinOferta, stareGoala, type InvelitoareUI, type LinieUI, type StareEditor } from "./editor";

// S25b (BUG-12): cele trei moduri de cantitate (FISA-OFERTARE 3.2) - spre motor pleaca, in fiecare
// mod, exact ce pleca si inainte de S25 in modul acela: panotaj -> doar pozitiile; mp direct -> doar
// suprafata; combinat -> amandoua. Comutarea nu pierde nimic din stare; o oferta veche cu amandoua
// se deschide de la sine in "Combinat".

const POZITII = [
  { lungimeM: "4,20", bucati: "10" },
  { lungimeM: "2,50", bucati: "4" },
  { lungimeM: "", bucati: "" },
];

function invelitoare(mod: InvelitoareUI["mod"]): InvelitoareUI {
  return { ...invelitoareGoala(), produsId: "p1", tip: "Țiglă metalică", model: "Iberic", finisaj: "mat", grosime: "0,50 mm", culoare: "RAL 8017", latimeTotalaM: "1.18", mpDirect: "48,500", panotaj: POZITII, mod };
}

const trimis = (inv: InvelitoareUI) => spreServer({ ...stareGoala(), invelitori: [inv] }).invelitori[0];

describe("modurile de cantitate (S25b, BUG-12)", () => {
  it("combinat: pleaca panotajul SI suprafata directa, ca inainte de S25", () => {
    const t = trimis(invelitoare("combinat"));
    expect(t.panotaj).toEqual([
      { lungimeM: "4,20", bucati: 10 },
      { lungimeM: "2,50", bucati: 4 },
    ]);
    expect(t.mpDirect).toBe("48,500");
  });

  it("panotaj: doar pozitiile; mp direct: doar suprafata", () => {
    const p = trimis(invelitoare("panotaj"));
    expect(p.panotaj).toHaveLength(2);
    expect(p.mpDirect).toBeNull();
    const m = trimis(invelitoare("mp"));
    expect(m.panotaj).toEqual([]);
    expect(m.mpDirect).toBe("48,500");
  });

  it("comutarea Panotaj -> Combinat -> mp direct -> Combinat pastreaza pozitiile si mp-ul in stare", () => {
    let inv = invelitoare("panotaj");
    for (const mod of ["combinat", "mp", "combinat"] as const) {
      inv = { ...inv, mod };
      expect(inv.panotaj).toBe(POZITII);
      expect(inv.mpDirect).toBe("48,500");
    }
    const t = trimis(inv);
    expect(t.panotaj).toHaveLength(2);
    expect(t.mpDirect).toBe("48,500");
  });

  it("o oferta veche cu amandoua se deschide in „Combinat”; doar panotaj -> „Panotaj”; doar mp -> „mp direct”", () => {
    const oferta = (panotaj: { lungimeM: string; bucati: number }[], mpDirect: string | null) =>
      ({
        grupaPct: "0",
        precizariZonaB: null,
        invelitori: [{ id: "i1", produsId: null, cod: "T", denumire: "Țiglă", um: "mp", grup: "Țiglă metalică", familie: "Iberic", variantaProfil: null, montaj: null, optiune: null, finisaj: "mat", grosime: "0,50 mm", culoare: "RAL 8017", latimeTotalaM: "1.18", mpDirect, panotaj }],
        linii: [],
        sipci: [],
        zonaB: [],
      }) as unknown as OfertaDetaliu;
    const mod = (o: OfertaDetaliu) => stareDinOferta(o, [], new Map()).invelitori[0].mod;
    expect(mod(oferta([{ lungimeM: "4.20", bucati: 10 }], "48.500"))).toBe("combinat");
    expect(mod(oferta([{ lungimeM: "4.20", bucati: 10 }], null))).toBe("panotaj");
    expect(mod(oferta([], "48.500"))).toBe("mp");
    // si pleaca neschimbata: amandoua
    const s = stareDinOferta(oferta([{ lungimeM: "4.20", bucati: 10 }], "48.500"), [], new Map());
    s.invelitori[0].produsId = "p1";
    const t = spreServer(s).invelitori[0];
    // S18: la deschidere casutele primesc virgula (lungimile cu 2 zecimale, mp cu 3); serverul accepta ambele forme
    expect(t.panotaj).toEqual([{ lungimeM: "4,20", bucati: 10 }]);
    expect(t.mpDirect).toBe("48,500");
  });
});

// S29 (BUG-20): randul adaugat cu "+" ramane FARA cantitate, la locul lui, pana e scos din cos - si dupa
// salvare si redeschidere. Spre server, liniile cu cantitate pleaca in ordinea randurilor (nu a completarii),
// iar randurile goale separat, fiecare cu locul lui ("dupaLinii"); la redeschidere editorul le reasaza.
describe("randurile fara cantitate (S29, BUG-20)", () => {
  const produs = (id: string) => ({ id, cod: `C-${id}`, denumire: `Produs ${id}`, um: "BUC", categorie: "Accesorii standard", compartiment: "Bilka", grup: "Accesorii", familie: null, varianta: null, optiune: null, finisaj: "mat", grosime: "0,50 mm", sistem: null, treapta: null, desfasurata: null, latimeTotalaM: null, latimeTotalaMm: null, modulCm: null, culoriDisponibile: null, tablaPlana: null }) as unknown as LinieUI["produs"];
  const linie = (id: string, cantitate: string, extra: Partial<LinieUI> = {}): LinieUI => ({ cheie: `k-${id}`, rubrica: "Accesorii standard", produs: produs(id), cantitate, invelitoare: "inv", culoare: null, pozitii: null, sectiune: "Accesorii standard|inv:inv", dinLista: false, ...extra });
  const stare = (linii: LinieUI[]): StareEditor => ({ ...stareGoala(), invelitori: [{ ...invelitoare("panotaj"), cheie: "inv" }], linii });
  // ce ar intoarce serverul dupa salvare: liniile cu cantitate + randurile goale, cu datele produsului copiate
  const dinServer = (s: StareEditor) => {
    const t = spreServer(s);
    const snapshot = (id: string) => ({ produsId: id, cod: `C-${id}`, denumire: `Produs ${id}`, um: "BUC", finisaj: "mat", grosime: "0,50 mm", grup: "Accesorii", familie: null, optiune: null, sistem: null });
    return {
      grupaPct: "0",
      precizariZonaB: null,
      invelitori: [{ id: "i1", produsId: "p1", cod: "T", denumire: "Țiglă", um: "mp", grup: "Țiglă metalică", familie: "Iberic", variantaProfil: null, montaj: null, optiune: null, finisaj: "mat", grosime: "0,50 mm", culoare: "RAL 8017", latimeTotalaM: "1.18", mpDirect: null, panotaj: [{ lungimeM: "4.20", bucati: 10 }] }],
      linii: t.linii.map((l, k) => ({ id: `l${k}`, rubrica: l.rubrica, ...snapshot(l.produsId), cantitate: l.cantitate, invelitoareId: l.invelitoare ? "i1" : null, culoareRal: l.culoare?.ral ?? null, culoareFinisaj: l.culoare?.finisaj ?? null, culoareGrosime: l.culoare?.grosime ?? null, pozitii: [] })),
      randuriGoale: t.randuriGoale.map((g, k) => ({ id: `g${k}`, ordine: k + 1, dupaLinii: g.dupaLinii, rubrica: g.rubrica, ...snapshot(g.produsId), invelitoareId: g.invelitoare ? "i1" : null, culoareRal: g.culoare?.ral || null, culoareFinisaj: g.culoare?.finisaj ?? null, culoareGrosime: g.culoare?.grosime ?? null })),
      sipci: [],
      zonaB: [],
    } as unknown as OfertaDetaliu;
  };
  const peEcran = (s: StareEditor) => s.linii.map((l) => `${l.produs.id}:${l.cantitate}`);

  it("randul fara cantitate nu pleaca intre linii, ci separat, cu locul lui; redeschiderea il pune la loc", () => {
    const s = stare([linie("X", "12"), linie("A", ""), linie("B", ""), linie("C", "")]);
    const t = spreServer(s);
    expect(t.linii.map((l) => l.produsId)).toEqual(["X"]);
    expect(t.randuriGoale).toEqual(["A", "B", "C"].map((id) => ({ rubrica: "Accesorii standard", produsId: id, invelitoare: "inv", culoare: null, dupaLinii: 1 })));
    expect(peEcran(stareDinOferta(dinServer(s), [], new Map()))).toEqual(["X:12", "A:", "B:", "C:"]);
  });

  it("locul e stabil: A, B, C goale; se completeaza C, apoi A -> ecranul arata A, B (gol), C; liniile pleaca A, C", () => {
    let s = stare([linie("A", ""), linie("B", ""), linie("C", "")]);
    s = { ...s, linii: s.linii.map((l) => (l.produs.id === "C" ? { ...l, cantitate: "3" } : l)) };
    s = { ...s, linii: s.linii.map((l) => (l.produs.id === "A" ? { ...l, cantitate: "2" } : l)) };
    const t = spreServer(s);
    expect(t.linii.map((l) => `${l.produsId}:${l.cantitate}`)).toEqual(["A:2", "C:3"]);
    expect(t.randuriGoale.map((g) => [g.produsId, g.dupaLinii])).toEqual([["B", 1]]);
    const redeschisa = stareDinOferta(dinServer(s), [], new Map());
    expect(peEcran(redeschisa)).toEqual(["A:2", "B:", "C:3"]);
    // cantitatea stearsa: randul ramane la locul lui; redeschiderea nu schimba nimic din ce pleaca spre server
    const golita = { ...redeschisa, linii: redeschisa.linii.map((l) => (l.produs.id === "A" ? { ...l, cantitate: "" } : l)) };
    expect(peEcran(stareDinOferta(dinServer(golita), [], new Map()))).toEqual(["A:", "B:", "C:3"]);
    // redeschisa si retrimisa neschimbata: aceleasi linii, in aceeasi ordine, acelasi rand gol la acelasi loc
    const iar = spreServer(redeschisa);
    expect(iar.linii.map((l) => `${l.produsId}:${l.cantitate}`)).toEqual(["A:2", "C:3"]);
    expect(iar.randuriGoale.map((g) => [g.produsId, g.dupaLinii])).toEqual([["B", 1]]);
  });

  it("accesoriile la lungimi: randul fara pozitii completate e rand gol (nu mai pleaca drept cantitate 1); cu pozitii, e linie", () => {
    const lungimi = (id: string, pozitii: { lungimeM: string; bucati: string }[]) => linie(id, "1", { rubrica: "Accesorii speciale la lungimi (ML)", invelitoare: null, culoare: { ral: "", finisaj: "mat", grosime: "0,50 mm" }, pozitii, sectiune: "x" });
    const t = spreServer(stare([lungimi("L1", [{ lungimeM: "", bucati: "" }]), lungimi("L2", [{ lungimeM: "2,5", bucati: "4" }])]));
    expect(t.linii.map((l) => [l.produsId, l.cantitate, l.pozitii])).toEqual([["L2", "1", [{ lungimeM: "2,5", bucati: 4 }]]]);
    expect(t.randuriGoale).toEqual([{ rubrica: "Accesorii speciale la lungimi (ML)", produsId: "L1", invelitoare: null, culoare: { ral: "", finisaj: "mat", grosime: "0,50 mm" }, dupaLinii: 0 }]);
  });

  it("o oferta fara randuri goale pleaca exact ca inainte (plus lista goala)", () => {
    const t = spreServer(stare([linie("X", "12"), linie("Y", "1,5")]));
    expect(t.linii.map((l) => `${l.produsId}:${l.cantitate}`)).toEqual(["X:12", "Y:1,5"]);
    expect(t.randuriGoale).toEqual([]);
  });
});
