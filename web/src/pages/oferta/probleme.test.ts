import { describe, expect, it } from "vitest";
import type { ProdusEditor } from "../../api";
import { invelitoareGoala, stareGoala, type InvelitoareUI, type LinieUI, type SipcaUI, type StareEditor } from "./editor";
import { problemaDinRefuz, problemeEditor } from "./probleme";

// S29b (BUG-24 a, d; deciziile 1 si 2 din MODIFICARI-S29B.md): randurile pe care serverul le-ar refuza
// ("refuz": lungime neterminata, pozitie cu randuri si fara culoare, cantitate neterminata) si randurile
// "incomplete" (lungime fara bucati sau invers - nu pleaca spre server, deci nu sunt in oferta). Fiecare
// problema spune ce e de corectat si unde (rubrica + casuta), ca pagina sa poata duce la rand.
// Randurile goale de produs (BUG-20) NU sunt probleme.

const LUNGIMI = "Accesorii speciale la lungimi (ML)";
const SIPCA = "Șipcă gard";

const produs = (id: string, extra: Partial<ProdusEditor> = {}): ProdusEditor => ({ id, cod: `C-${id}`, denumire: `Produs ${id}`, um: "BUC", categorie: null, compartiment: "Bilka", grup: "Accesorii", familie: null, varianta: null, optiune: null, finisaj: "mat", grosime: "0,50 mm", sistem: null, treapta: null, desfasurata: null, latimeTotalaM: null, latimeTotalaMm: null, modulCm: null, culoriDisponibile: null, tablaPlana: null, ...extra });
const inv = (panotaj: { lungimeM: string; bucati: string }[], extra: Partial<InvelitoareUI> = {}): InvelitoareUI => ({ ...invelitoareGoala(), cheie: "inv", produsId: "p1", tip: "Țiglă metalică", model: "Iberic", finisaj: "mat", grosime: "0,50 mm", culoare: "RAL 8017", latimeTotalaM: "1.18", panotaj, ...extra });
const linie = (cheie: string, extra: Partial<LinieUI> = {}): LinieUI => ({ cheie, rubrica: "Accesorii standard", produs: produs(cheie), cantitate: "", invelitoare: "inv", culoare: null, pozitii: null, sectiune: "x", dinLista: false, ...extra });
const lungimi = (cheie: string, pozitii: { lungimeM: string; bucati: string }[], ral = "RAL 7016"): LinieUI =>
  linie(cheie, { rubrica: LUNGIMI, produs: produs(cheie, { treapta: "D05", denumire: "Accesoriu special la metru liniar – D05 (201–250 mm)" }), cantitate: "1", invelitoare: null, culoare: { ral, finisaj: "mat", grosime: "0,50 mm" }, pozitii });
const stare = (c: Partial<StareEditor>): StareEditor => ({ ...stareGoala(), invelitori: [inv([{ lungimeM: "4,00", bucati: "10" }])], ...c });
const casuta = (grup: string, rand: number, camp: string) => `input[data-grup="${grup}"][data-rand="${rand}"][data-camp="${camp}"]`;

describe("randurile cu probleme din editor (S29b)", () => {
  it("o oferta completata corect nu are nicio problema; randurile goale de produs (BUG-20) nu sunt probleme", () => {
    const s = stare({
      linii: [linie("a", { cantitate: "12" }), linie("gol", { cantitate: "" }), lungimi("L", [{ lungimeM: "2,5", bucati: "4" }, { lungimeM: "", bucati: "" }]), lungimi("Lgol", [{ lungimeM: "", bucati: "" }], "")],
    });
    expect(problemeEditor(s)).toEqual([]);
  });

  it("panotaj: lungimea neterminata „5,” e refuz, cu locul ei; lungime fara bucati si bucati fara lungime sunt „incomplete”", () => {
    const s = stare({ invelitori: [inv([{ lungimeM: "4,00", bucati: "10" }, { lungimeM: "5,", bucati: "2" }, { lungimeM: "6", bucati: "" }, { lungimeM: "", bucati: "3" }, { lungimeM: "", bucati: "" }])] });
    const p = problemeEditor(s);
    expect(p.map((x) => [x.fel, x.rubrica, x.selector])).toEqual([
      ["refuz", "invelitori", casuta("panotaj-inv", 1, "lungime")],
      ["incomplet", "invelitori", casuta("panotaj-inv", 2, "bucati")],
      ["incomplet", "invelitori", casuta("panotaj-inv", 3, "lungime")],
    ]);
    expect(p[0].text).toContain("poziția 2");
    expect(p[0].text).toContain("5,");
    expect(p[1].text).toContain("fără bucăți");
    expect(p[2].text).toContain("fără lungime");
  });

  it("panotaj in modul „mp direct”: pozitiile nu pleaca, deci nu sunt probleme", () => {
    expect(problemeEditor(stare({ invelitori: [inv([{ lungimeM: "5,", bucati: "2" }, { lungimeM: "6", bucati: "" }], { mod: "mp", mpDirect: "48,5" })] }))).toEqual([]);
  });

  it("accesorii la lungimi: rand neterminat, rand incomplet, pozitie cu randuri si fara culoare", () => {
    const s = stare({
      linii: [lungimi("A", [{ lungimeM: "2,5", bucati: "4" }, { lungimeM: "5,", bucati: "2" }, { lungimeM: "3", bucati: "0" }]), lungimi("B", [{ lungimeM: "4", bucati: "3" }], "")],
    });
    const p = problemeEditor(s);
    expect(p.map((x) => [x.fel, x.rubrica, x.selector])).toEqual([
      ["refuz", "lungimi", casuta("lungimi-A", 1, "lungime")],
      ["incomplet", "lungimi", casuta("lungimi-A", 2, "bucati")],
      ["refuz", "lungimi", '[data-loc="culoare-B"]'],
    ]);
    expect(p[0].text).toContain("D05");
    expect(p[2].text).toContain("culoarea");
  });

  it("sipca: pozitiile ca la lungimi; tronsonul cu lungimea tronsonului si fara lungimea sipcii e „incomplet”, cel doar presetat nu", () => {
    const s: StareEditor = stare({
      linii: [linie("sip", { rubrica: SIPCA, cantitate: "1", invelitoare: null, culoare: { ral: "RAL 8017", finisaj: "mat", grosime: "0,40 mm" }, pozitii: [{ lungimeM: "1,5", bucati: "10" }, { lungimeM: "1,", bucati: "5" }, { lungimeM: "", bucati: "4" }] })],
      sipci: [{ linie: "sip", profil: "Șipcă Berna", capat: "drept", varianta: "comanda", tronsoane: [{ lungimeSipcaM: "", lungimeTronsonM: "", distantaMm: "" }] }],
    });
    expect(problemeEditor(s).map((x) => [x.fel, x.rubrica, x.selector])).toEqual([
      ["refuz", "sipca", casuta("sipca-sip", 1, "lungime")],
      ["incomplet", "sipca", casuta("sipca-sip", 2, "lungime")],
    ]);
    const calcul: SipcaUI = { linie: "sip", profil: "Șipcă Berna", capat: "drept", varianta: "calcul", tronsoane: [{ lungimeSipcaM: "1,5", lungimeTronsonM: "2,5", distantaMm: "20" }, { lungimeSipcaM: "1,5", lungimeTronsonM: "", distantaMm: "20" }, { lungimeSipcaM: "", lungimeTronsonM: "3", distantaMm: "" }, { lungimeSipcaM: "1,5", lungimeTronsonM: "2,", distantaMm: "20" }] };
    // in varianta Calcul pozitiile de comanda nu pleaca: raman doar problemele tronsoanelor
    expect(problemeEditor({ ...s, sipci: [calcul] }).map((x) => [x.fel, x.selector])).toEqual([
      ["incomplet", casuta("tronsoane-sip", 2, "lungime")],
      ["refuz", casuta("tronsoane-sip", 3, "lungimeTronson")],
    ]);
  });

  it("o cantitate neterminata („1,”) intr-o rubrica obisnuita e refuz, cu rubrica ei", () => {
    const p = problemeEditor(stare({ linii: [linie("a", { cantitate: "1," })] }));
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ fel: "refuz", rubrica: "standard" });
    expect(p[0].text).toContain("Produs a");
  });

  it("refuzul venit de la server se asaza pe randul lui: indexul din ce s-a trimis -> randul de pe ecran", () => {
    const s = stare({
      invelitori: [inv([{ lungimeM: "4,00", bucati: "10" }, { lungimeM: "", bucati: "" }, { lungimeM: "5,", bucati: "2" }])],
      linii: [linie("gol"), linie("a", { cantitate: "2" }), lungimi("L", [{ lungimeM: "2,5", bucati: "4" }, { lungimeM: "", bucati: "" }, { lungimeM: "5,", bucati: "2" }])],
    });
    // pozitiile goale nu pleaca: a doua pozitie trimisa e a treia de pe ecran
    expect(problemaDinRefuz(s, "invelitori.0.panotaj.1.lungimeM", "m")).toMatchObject({ fel: "refuz", rubrica: "invelitori", selector: casuta("panotaj-inv", 2, "lungime"), text: "m" });
    // linia goala nu pleaca: linia 1 trimisa e „L”
    expect(problemaDinRefuz(s, "linii.1.pozitii.1.lungimeM", "m")).toMatchObject({ rubrica: "lungimi", selector: casuta("lungimi-L", 2, "lungime") });
    expect(problemaDinRefuz(s, "linii.1.culoare.ral", "m")).toMatchObject({ rubrica: "lungimi", selector: '[data-loc="culoare-L"]' });
    expect(problemaDinRefuz(s, "linii.0.cantitate", "m")).toMatchObject({ rubrica: "standard", selector: null });
    // un camp necunoscut: mesajul ramane, fara loc
    expect(problemaDinRefuz(s, undefined, "Produsul nu mai e activ")).toEqual({ fel: "refuz", text: "Produsul nu mai e activ", rubrica: null, selector: null });
  });
});
