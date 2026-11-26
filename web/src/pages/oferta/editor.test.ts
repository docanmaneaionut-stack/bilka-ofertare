import { describe, expect, it } from "vitest";
import type { OfertaDetaliu, ProdusEditor } from "../../api";
import { cantitateaLiniei, catalogulLiniilor, idurileLiniilor, invelitoareGoala, sistemulLiniei, spreServer, stareDinOferta, stareGoala, treaptaDinDenumire, type InvelitoareUI, type LinieUI, type StareEditor } from "./editor";

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

// S29b (BUG-24 c, BUG-26, BUG-27): oferta redeschisa isi aduce treapta si sistemul fiecarei linii - din catalog
// (produsele liniilor vin odata cu oferta), iar cand produsul nu mai e in catalog, din ce s-a salvat pe linie.
// Niciun rand salvat nu-si schimba produsul la redeschidere; fiecare pozitie isi stie linia salvata (metrii ei).
describe("oferta redeschisa: treapta, sistemul, linia salvata (S29b)", () => {
  const catalog = (id: string, extra: Partial<ProdusEditor>): ProdusEditor => ({ id, cod: `C-${id}`, denumire: `Produs ${id}`, um: "ML", categorie: null, compartiment: "Bilka", grup: "Accesorii", familie: null, varianta: null, optiune: null, finisaj: "mat", grosime: "0,50 mm", sistem: null, treapta: null, desfasurata: null, latimeTotalaM: null, latimeTotalaMm: null, modulCm: null, culoriDisponibile: null, tablaPlana: null, ...extra });
  const salvata = (id: string, rubrica: string, produsId: string, extra: Record<string, unknown> = {}) => ({ id, ordine: 1, rubrica, produsId, cod: `C-${produsId}`, denumire: `Produs ${produsId}`, um: "ML", finisaj: "mat", grosime: "0,50 mm", grup: "Accesorii", familie: null, optiune: null, sistem: null, cantitate: "1", invelitoareId: null, culoareRal: "RAL 7016", culoareFinisaj: "mat", culoareGrosime: "0,50 mm", pozitii: [], ...extra });
  const oferta = (linii: unknown[], produseCatalog: ProdusEditor[] = []) => ({ grupaPct: "0", precizariZonaB: null, invelitori: [], linii, sipci: [], zonaB: [], randuriGoale: [], produseCatalog }) as unknown as OfertaDetaliu;
  const LUNGIMI = "Accesorii speciale la lungimi (ML)";
  const SPECIALE = "Accesorii speciale (2 ML)";
  const PLUVIAL = "Sistem pluvial";

  it("linia la lungimi si cea de speciale 2 ML isi aduc treapta din catalog (D05, nu D01)", () => {
    const o = oferta(
      [salvata("l1", LUNGIMI, "ml5", { pozitii: [{ id: "p", ordine: 1, lungimeM: "2.5", bucati: 4 }] }), salvata("l2", SPECIALE, "sp5", { cantitate: "4" })],
      [catalog("ml5", { treapta: "D05" }), catalog("sp5", { treapta: "D05", culoriDisponibile: "7016, 8017" })],
    );
    const s = stareDinOferta(o, [], catalogulLiniilor(o));
    expect(s.linii.map((l) => l.produs.treapta)).toEqual(["D05", "D05"]);
    // produsul intreg din catalog: si culorile lui, si tot ce nu se tine pe linia salvata
    expect(s.linii[1].produs.culoriDisponibile).toBe("7016, 8017");
    expect(s.linii.map((l) => l.idSalvat)).toEqual(["l1", "l2"]);
  });

  it("produsul nu mai e in catalog: treapta se citeste din denumirea salvata, sistemul din linia salvata", () => {
    const o = oferta([
      salvata("l1", LUNGIMI, "ml9", { denumire: "Accesoriu special la metru liniar – D09 (401–450 mm) – lucios – 0,50 mm" }),
      salvata("l2", PLUVIAL, "j150", { denumire: "Jgheab 150 / 4m – pluvial mat", sistem: "150 / 100", culoareGrosime: null }),
    ]);
    const s = stareDinOferta(o, [], catalogulLiniilor(o));
    expect(s.linii[0].produs.treapta).toBe("D09");
    expect(s.linii[1].produs.sistem).toBe("150 / 100");
    expect(treaptaDinDenumire("Accesoriu special 2 ML – D05 (201–250 mm) – mat – 0,50 mm")).toBe("D05");
    expect(treaptaDinDenumire("Coamă mică")).toBeNull();
  });

  it("redeschisa si retrimisa neatinsa: aceleasi produse, in aceeasi ordine, cu aceleasi randuri", () => {
    const o = oferta(
      [salvata("l1", LUNGIMI, "ml5", { pozitii: [{ id: "p1", ordine: 1, lungimeM: "2.5", bucati: 4 }, { id: "p2", ordine: 2, lungimeM: "1.2", bucati: 3 }] }), salvata("l2", SPECIALE, "sp5", { cantitate: "4" }), salvata("l3", PLUVIAL, "j150", { cantitate: "3", sistem: "150 / 100", culoareGrosime: null })],
      [catalog("ml5", { treapta: "D05" }), catalog("sp5", { treapta: "D05" }), catalog("j150", { sistem: "150 / 100" })],
    );
    const t = spreServer(stareDinOferta(o, [], catalogulLiniilor(o)));
    expect(t.linii.map((l) => [l.produsId, l.cantitate])).toEqual([["ml5", "1"], ["sp5", "4"], ["j150", "3"]]);
    expect(t.linii[0].pozitii).toEqual([{ lungimeM: "2,50", bucati: 4 }, { lungimeM: "1,20", bucati: 3 }]);
  });

  it("cascada invelitorii se reface din produsul din catalog; redeschisa si retrimisa, invelitoarea are acelasi produs", () => {
    const tigla = catalog("inv1", { grup: "Țiglă metalică", familie: "Țiglă metalică Iberic", um: "M2", finisaj: "mat", grosime: "0,50 mm", latimeTotalaM: "1.18" });
    const o = {
      ...oferta([]),
      invelitori: [{ id: "i1", produsId: "inv1", cod: "T", denumire: "Țiglă", um: "mp", grup: "Țiglă metalică", familie: "Țiglă metalică Iberic", variantaProfil: null, montaj: null, optiune: null, finisaj: "mat", grosime: "0,50 mm", culoare: "RAL 8017", latimeTotalaM: "1.18", mpDirect: null, panotaj: [{ lungimeM: "4.20", bucati: 10 }] }],
    } as unknown as OfertaDetaliu;
    const s = stareDinOferta(o, [tigla], catalogulLiniilor(o));
    expect(s.invelitori[0]).toMatchObject({ produsId: "inv1", furnizor: "Bilka", tip: "Țiglă metalică", model: "Iberic", finisaj: "mat", grosime: "0,50 mm", culoare: "RAL 8017" });
    expect(spreServer(s).invelitori.map((i) => [i.produsId, i.culoare, i.panotaj])).toEqual([["inv1", "RAL 8017", [{ lungimeM: "4,20", bucati: 10 }]]]);
    // produsul scos din catalog: invelitoarea isi pastreaza produsul salvat, nu primeste altul
    expect(spreServer(stareDinOferta(o, [], catalogulLiniilor(o))).invelitori[0].produsId).toBe("inv1");
  });

  it("sistemul pluvial al unei linii: 150 / 100 ramane 150 / 100; piesele comune urmeaza grupul finisajului si culorii lor", () => {
    const linie = (id: string, sistem: string | null, ral = "RAL 7016"): LinieUI => ({ cheie: id, rubrica: PLUVIAL, produs: catalog(id, { sistem }), cantitate: "1", invelitoare: null, culoare: { ral, finisaj: "mat", grosime: null }, pozitii: null, sectiune: "x", dinLista: false });
    const j150 = linie("j150", "150 / 100");
    const comuna = linie("carlig", "125 / 90 și 150 / 100");
    const j125 = linie("j125", "125 / 90", "RAL 8017");
    const comunaSingura = linie("carlig2", "125 / 90 și 150 / 100", "RAL 3011");
    const toate = [j150, comuna, j125, comunaSingura];
    expect(sistemulLiniei(j150, toate)).toBe("150 / 100");
    expect(sistemulLiniei(comuna, toate)).toBe("150 / 100");
    expect(sistemulLiniei(j125, toate)).toBe("125 / 90");
    // singura in grupul ei: locul 125 / 90 (ARH §5.4)
    expect(sistemulLiniei(comunaSingura, toate)).toBe("125 / 90");
  });

  it("fiecare pozitie isi stie linia salvata: doua pozitii cu acelasi produs au fiecare metrii ei", () => {
    const iduri = idurileLiniilor(["kA", "kB", "kC"], [{ id: "inv", rubrica: "Învelitori" }, { id: "s1", rubrica: LUNGIMI }, { id: "s2", rubrica: LUNGIMI }, { id: "s3", rubrica: SPECIALE }]);
    expect([...iduri]).toEqual([["kA", "s1"], ["kB", "s2"], ["kC", "s3"]]);
    const rezultat = { linii: [{ id: "s1", cod: "AML05", um: "ML", cantitate: "19.600" }, { id: "s2", cod: "AML05", um: "ML", cantitate: "10.000" }] };
    expect(cantitateaLiniei(rezultat, iduri.get("kA"))).toBe("19.600");
    expect(cantitateaLiniei(rezultat, iduri.get("kB"))).toBe("10.000");
    expect(cantitateaLiniei(rezultat, undefined)).toBeNull();
  });
});
