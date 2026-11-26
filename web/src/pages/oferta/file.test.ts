import { describe, expect, it } from "vitest";
import type { OfertaDetaliu } from "../../api";
import { stareGoala, type LinieUI, type StareEditor } from "./editor";
import { ancoraFilei, FILE, filaDinAncora, filaDinTasta, motivPlecare, rezumatFile, stareaSalvarii } from "./file";
import { numarPeRubrici, rezumatRubrica, RUBRICI_BARA } from "./rubrici";

// S29 (MODIFICAREA M12, docs/MODIFICARI-S29.md v1.3): pagina ofertei pe trei file - logica fara ecran:
// ce fila e in adresa, Alt + 1 / 2 / 3, rezumatul si punctul rosu de sub numele fiecarei file, starea
// "salvat / nesalvat" din randul ofertei, numarul de produse cu cantitate din bara de rubrici si textul
// rubricii stranse.

const oferta = (peste: Record<string, unknown> = {}) =>
  ({
    status: "IN_LUCRU",
    client: { telefon: "0730 000 001" },
    invelitori: [{ id: "i1" }],
    linii: [{ rubrica: "Învelitori" }, { rubrica: "Accesorii standard" }, { rubrica: "Accesorii standard" }, { rubrica: "Fixare și etanșare" }],
    structura: { rezultat: { comandabil: { da: true, motive: [] } }, eroare: null },
    preturi: { rezultat: { totaluri: { documentTotalLei: "12490.11" }, garda: { aplicata: true, respectata: true, liniiSubAchizitie: [] } }, eroare: null },
    ...peste,
  }) as unknown as OfertaDetaliu;

describe("filele paginii ofertei (S29, M12)", () => {
  it("adresa tine fila: #date-generale, #produse, #preturi; orice altceva = nicio fila (se deschide Produse)", () => {
    expect(filaDinAncora("#date-generale")).toBe("generale");
    expect(filaDinAncora("#produse")).toBe("produse");
    expect(filaDinAncora("#preturi")).toBe("preturi");
    expect(filaDinAncora("")).toBeNull();
    expect(filaDinAncora("#altceva")).toBeNull();
    expect((["generale", "produse", "preturi"] as const).map(ancoraFilei)).toEqual(["#date-generale", "#produse", "#preturi"]);
    // pe telefon fila a treia se numeste scurt, ca sa nu apara taiata
    expect(FILE.map((f) => [f.nume, f.scurt])).toEqual([
      ["Date generale", "Date generale"],
      ["Produse", "Produse"],
      ["Prețuri și documente", "Prețuri"],
    ]);
  });

  it("Alt + 1 / 2 / 3 schimba fila; fara Alt sau cu Ctrl nu", () => {
    const tasta = (code: string, peste: Record<string, boolean> = {}) => ({ altKey: true, ctrlKey: false, metaKey: false, code, ...peste });
    expect(filaDinTasta(tasta("Digit1"))).toBe("generale");
    expect(filaDinTasta(tasta("Digit2"))).toBe("produse");
    expect(filaDinTasta(tasta("Numpad3"))).toBe("preturi");
    expect(filaDinTasta(tasta("Digit4"))).toBeNull();
    expect(filaDinTasta(tasta("Digit1", { altKey: false }))).toBeNull();
    expect(filaDinTasta(tasta("Digit1", { ctrlKey: true }))).toBeNull();
  });

  it("sub numele filei: pe scurt ce e inauntru; fara nimic de semnalat, niciun punct rosu", () => {
    const r = rezumatFile(oferta());
    expect(r.generale).toEqual({ text: "complet", lipsa: null });
    expect(r.produse).toEqual({ text: "1 învelitoare · 3 produse", lipsa: null });
    expect(r.preturi).toEqual({ text: "12.490,11 lei", lipsa: null });
    expect(rezumatFile(oferta({ invelitori: [], linii: [], structura: null, preturi: null }))).toMatchObject({ produse: { text: "niciun produs", lipsa: null }, preturi: { text: "fără prețuri încă", lipsa: null } });
    expect(rezumatFile(oferta({ invelitori: [{ id: "a" }, { id: "b" }], linii: [{ rubrica: "Învelitori" }, { rubrica: "Învelitori" }, { rubrica: "Sistem pluvial" }] })).produse.text).toBe("2 învelitori · 1 produs");
  });

  it("punctul rosu = ceva din fila ar opri „Comandat” sau e o eroare; sub nume scrie ce lipseste", () => {
    expect(rezumatFile(oferta({ client: { telefon: null } })).generale).toEqual({ text: "fără telefon", lipsa: "fără telefon" });
    expect(rezumatFile(oferta({ structura: { rezultat: { comandabil: { da: false, motive: ["învelitoarea 1 e în mp direct"] } }, eroare: null } })).produse.lipsa).toBe("nu se poate comanda");
    expect(rezumatFile(oferta({ structura: { rezultat: null, eroare: "linia 3" } })).produse.lipsa).toBe("eroare de calcul");
    expect(rezumatFile(oferta({ preturi: { rezultat: { totaluri: { documentTotalLei: "100.00" }, garda: { aplicata: true, respectata: false, liniiSubAchizitie: ["x"] } }, eroare: null } })).preturi).toEqual({ text: "linii sub achiziție", lipsa: "linii sub achiziție" });
    expect(rezumatFile(oferta({ preturi: { rezultat: null, eroare: "curs lipsă" } })).preturi.lipsa).toBe("eroare de preț");
    // garda neaplicata (completare) nu aprinde punctul
    expect(rezumatFile(oferta({ preturi: { rezultat: { totaluri: { documentTotalLei: "100.00" }, garda: { aplicata: false, respectata: false, liniiSubAchizitie: ["x"] } }, eroare: null } })).preturi.lipsa).toBeNull();
  });

  it("pe o oferta comandata punctul rosu nu apare", () => {
    const r = rezumatFile(oferta({ status: "COMANDAT", client: { telefon: null }, structura: { rezultat: { comandabil: { da: false, motive: ["x"] } }, eroare: null } }));
    expect([r.generale.lipsa, r.produse.lipsa, r.preturi.lipsa]).toEqual([null, null, null]);
    expect(r.generale.text).toBe("comandată");
  });

  it("starea din randul ofertei: salvat / nesalvat / se salveaza / eroare", () => {
    expect(stareaSalvarii({ produse: "salvat", antetModificat: false, seSalveaza: false })).toEqual({ text: "salvat", fel: "salvat" });
    expect(stareaSalvarii({ produse: "modificat", antetModificat: false, seSalveaza: false })).toEqual({ text: "nesalvat", fel: "nesalvat" });
    expect(stareaSalvarii({ produse: "salvat", antetModificat: true, seSalveaza: false })).toEqual({ text: "nesalvat", fel: "nesalvat" });
    expect(stareaSalvarii({ produse: "se-salveaza", antetModificat: false, seSalveaza: false }).text).toBe("se salvează…");
    expect(stareaSalvarii({ produse: "salvat", antetModificat: true, seSalveaza: true }).text).toBe("se salvează…");
    // S29b: salvarea refuzata se spune limpede - oferta NU e salvata (nu "eroare la salvare")
    expect(stareaSalvarii({ produse: "eroare", antetModificat: false, seSalveaza: false })).toEqual({ text: "NU e salvată", fel: "eroare" });
    expect(stareaSalvarii({ produse: "eroare", antetModificat: true, seSalveaza: true })).toEqual({ text: "NU e salvată", fel: "eroare" });
  });

  it("S29b: cat salvarea produselor e refuzata, fila Produse are punctul rosu si spune „nesalvat”; pe o oferta comandata nu", () => {
    expect(rezumatFile(oferta(), { produseNesalvate: true }).produse).toEqual({ text: "nesalvat", lipsa: "nesalvat" });
    expect(rezumatFile(oferta(), { produseNesalvate: false }).produse).toEqual({ text: "1 învelitoare · 3 produse", lipsa: null });
    expect(rezumatFile(oferta(), { produseNesalvate: true }).generale.lipsa).toBeNull();
    expect(rezumatFile(oferta({ status: "COMANDAT" }), { produseNesalvate: true }).produse.lipsa).toBeNull();
  });

  it("S29b: la plecarea din pagina se intreaba doar cand ramane ceva nesalvat pe care pagina nu-l poate salva singura", () => {
    const nimic = { produse: "salvat" as const, antetModificat: false, randIncomplet: false };
    expect(motivPlecare(nimic)).toBeNull();
    // ce asteapta salvarea automata pleaca singur spre server la plecare: nu se intreaba
    expect(motivPlecare({ ...nimic, produse: "modificat" })).toBeNull();
    expect(motivPlecare({ ...nimic, produse: "se-salveaza" })).toBeNull();
    expect(motivPlecare({ ...nimic, produse: "eroare" })).toContain("NU e salvată");
    expect(motivPlecare({ ...nimic, randIncomplet: true })).toContain("incomplet");
    expect(motivPlecare({ ...nimic, antetModificat: true })).toContain("Date generale");
    // refuzul e cel mai grav: el se spune primul
    expect(motivPlecare({ produse: "eroare", antetModificat: true, randIncomplet: true })).toContain("NU e salvată");
  });
});

describe("bara de rubrici si rubricile stranse (S29, M12)", () => {
  const produs = (id: string) => ({ id, cod: id, denumire: id, um: "BUC", finisaj: "mat", grosime: "0,50 mm" }) as unknown as LinieUI["produs"];
  const linie = (rubrica: string, cantitate: string, extra: Partial<LinieUI> = {}): LinieUI => ({ cheie: `${rubrica}-${cantitate}-${Math.random()}`, rubrica, produs: produs("p"), cantitate, invelitoare: "inv", culoare: null, pozitii: null, sectiune: rubrica, dinLista: false, ...extra });
  const stare = (peste: Partial<StareEditor>): StareEditor => ({ ...stareGoala(), ...peste });
  const invelitoare = { ...stareGoala().invelitori[0], cheie: "inv", produsId: "p1", tip: "Țiglă metalică", model: "Iberic", finisaj: "mat", grosime: "0,50 mm", culoare: "RAL 8017" };

  it("bara are cele opt rubrici, in ordinea clasica", () => {
    expect(RUBRICI_BARA.map((r) => r.scurt)).toEqual(["Învelitori", "Accesorii standard", "Speciale 2 ML", "Fixare și etanșare", "Sistem pluvial", "Șipcă gard", "La lungimi", "Zona B"]);
  });

  it("numarul din bara = produsele CU cantitate (randurile goale nu se numara)", () => {
    const s = stare({
      invelitori: [invelitoare, { ...stareGoala().invelitori[0], cheie: "goala" }],
      linii: [linie("Accesorii standard", "12"), linie("Accesorii standard", "1,5"), linie("Accesorii standard", ""), linie("Fixare și etanșare", "3"), linie("Accesorii speciale (2 ML)", ""), linie("Accesorii speciale la lungimi (ML)", "1", { pozitii: [{ lungimeM: "", bucati: "" }] })],
      zonaB: [{ denumire: "Manoperă", um: "lucrare", cantitate: "1", sumaLei: "500", contineTva: false, preiaInFactura: false }, { denumire: "", um: "buc", cantitate: "1", sumaLei: "", contineTva: false, preiaInFactura: false }],
    });
    expect(numarPeRubrici(s)).toEqual({ invelitori: 1, standard: 2, speciale: 0, fixare: 1, pluvial: 0, sipca: 0, lungimi: 0, zonaB: 1 });
    expect(numarPeRubrici(stareGoala())).toEqual({ invelitori: 0, standard: 0, speciale: 0, fixare: 0, pluvial: 0, sipca: 0, lungimi: 0, zonaB: 0 });
  });

  it("rubrica stransa arata pe randul ei ce are completat", () => {
    const s = stare({ invelitori: [invelitoare], linii: [linie("Accesorii standard", "12"), linie("Accesorii standard", "2"), linie("Fixare și etanșare", "3")], zonaB: [{ denumire: "Manoperă", um: "lucrare", cantitate: "1", sumaLei: "500", contineTva: false, preiaInFactura: false }] });
    const structura = { cantitati: { invelitori: [{ id: "x", mp: "178.239", coli: 57 }] } } as never;
    expect(rezumatRubrica("invelitori", s, structura)).toBe("Iberic · mat · 0,50 mm · RAL 8017 · 178,239 mp · 57 coli");
    expect(rezumatRubrica("invelitori", s, null)).toBe("Iberic · mat · 0,50 mm · RAL 8017");
    expect(rezumatRubrica("standard", s, null)).toBe("2 produse");
    expect(rezumatRubrica("fixare", s, null)).toBe("1 produs");
    expect(rezumatRubrica("pluvial", s, null)).toBe("nimic completat");
    expect(rezumatRubrica("zonaB", s, null)).toBe("1 linie");
    expect(rezumatRubrica("invelitori", stareGoala(), null)).toBe("nimic completat");
  });
});
