import { describe, expect, it } from "vitest";
import type { OfertaDetaliu } from "../../api";
import { invelitoareGoala, spreServer, stareDinOferta, stareGoala, type InvelitoareUI } from "./editor";

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
