import { describe, expect, it } from "vitest";
import { gasesteTotalLista, pretFixNormalizat, prezinta, type LiniePentruPrezentare } from "../src/modules/mot/prezentare.js";
import { achizitieLinie } from "../src/modules/mot/preturi.js";
import { la2, z } from "../src/modules/mot/zecimal.js";

// Prezentarea (FISA-OFERTARE 11.4, 11.5; ETALON R5): cele trei moduri, preturile
// fixe, repartizarea restului de rotunjire si abaterea.

const CURS = { cursAchizitie: "5.4020", cursBnr: "5.3485" };

function linie(id: string, baza: string, cantitate: string, um = "buc", extra: Partial<LiniePentruPrezentare> = {}): LiniePentruPrezentare {
  const a = achizitieLinie(baza, cantitate, "1.00", "0", CURS.cursAchizitie, 21);
  return { id, um, cantitate, achizitieContEur: a.achizitieContEur, achizitieRealaEur: a.achizitieRealaEur, valoareAchizitieEur: a.valoareAchizitieEur, ...extra };
}

// un acoperis mic, construit sa aiba rest de rotunjire
const LINII = [
  linie("tigla", "6.79", "100.000", "mp"),
  linie("coama", "4.90", "13"),
  linie("carlig", "1.46", "56"),
  linie("brida", "0.68", "50"),
  linie("element", "1.38", "8"),
  linie("cot", "2.31", "18"),
  // o linie cu cantitatea 1: orice rest marunt se poate repartiza in centi intregi
  linie("jgheab2", "4.36", "1"),
];

describe("preturile fixe (11.5)", () => {
  it("EUR fara TVA: cum a fost scris", () => {
    expect(pretFixNormalizat({ tip: "eur_fara_tva", valoare: "24" }, "19.82", CURS.cursAchizitie, CURS.cursBnr)).toBe("24.00");
  });

  it("'achizitie reala + x %' porneste de la achizitia reala la cursul documentului (E02: 6,86 -> 6,93 -> 7,28)", () => {
    expect(pretFixNormalizat({ tip: "achizitie_plus_pct", valoare: "5" }, "6.86", CURS.cursAchizitie, CURS.cursBnr)).toBe("7.28");
    expect(pretFixNormalizat({ tip: "achizitie_plus_pct", valoare: "0" }, "6.86", CURS.cursAchizitie, CURS.cursBnr)).toBe("6.93");
  });
});

describe("modul simplu si repartizarea restului (R5)", () => {
  it("liniile libere primesc achizitie x coeficient, iar totalul fara TVA e atins exact", () => {
    const r = prezinta({ mod: "simplu", ...CURS }, "1000.00", LINII);
    const total = r.preturi.reduce((s, p) => s + Number(p.valoareEur), 0);
    expect(total.toFixed(2)).toBe("1000.00");
    expect(r.documentFaraTvaEur).toBe("1000.00");
    expect(r.abatereEur).toBe("0.00");
    expect(r.preturi.every((p) => !p.pretFix && p.pretListaEur === undefined)).toBe(true);
  });

  it("E01: restul de 1,14 EUR merge +0,01 pe carlig (56), brida (50) si element (8) - descrescator, suma cantitatilor = restul", () => {
    const linii = [
      linie("tigla", "6.79", "180.481", "mp"),
      linie("t8", "6.54", "6.000", "mp"),
      linie("coama", "4.90", "13"),
      linie("bordura", "6.54", "17"),
      linie("colector", "2.45", "16"),
      linie("streasina", "3.27", "21"),
      linie("fixare", "3.92", "7"),
      linie("dolie", "6.54", "4"),
      linie("opritor", "3.27", "12"),
      linie("cos", "19.62", "1"),
      linie("special", "4.41", "2"),
      linie("holt35", "6.25", "9", "cutie"),
      linie("holt20", "6.25", "1", "cutie"),
      linie("spray", "4.50", "3"),
      linie("capac", "3.94", "4"),
      linie("banda", "11.35", "3", "rolă"),
      linie("mastic", "6.05", "3"),
      linie("jgheab4", "8.71", "10"),
      linie("jgheab2", "4.36", "1"),
      linie("burlan", "8.07", "6"),
      linie("carlig", "1.46", "56"),
      linie("brida", "0.68", "50"),
      linie("colier", "0.86", "12"),
      linie("capacj", "0.86", "12"),
      linie("element", "1.38", "8"),
      linie("racord", "2.31", "6"),
      linie("cot", "2.31", "18"),
      linie("prelungitor", "2.69", "6"),
    ];
    const r = prezinta({ mod: "simplu", ...CURS }, "2626.83", linii);
    const pret = (id: string) => r.preturi.find((p) => p.id === id)!.pretNetEur;
    expect(pret("tigla")).toBe("8.22");
    expect(pret("carlig")).toBe("1.75"); // 1,74 + 0,01
    expect(pret("brida")).toBe("0.82"); // 0,81 + 0,01
    expect(pret("element")).toBe("1.65"); // 1,64 + 0,01
    expect(pret("cot")).toBe("2.79"); // neatins (18 > 8 ramase)
    expect(r.documentFaraTvaEur).toBe("2626.83");
    expect(r.abatereEur).toBe("0.00");
  });

  it("la cantitati egale castiga linia care apare prima in oferta (E08: holtsuruburi 4,8 x 20 inaintea jgheabului de 2 m)", () => {
    const linii = [linie("a", "10.00", "100.000", "mp"), linie("holt20", "6.25", "1", "cutie"), linie("jgheab2", "4.36", "1")];
    // tinta aleasa ca restul sa fie exact 1 cent
    const achizitie = linii.reduce((s, l) => s + Number(l.valoareAchizitieEur), 0);
    const r = prezinta({ mod: "simplu", ...CURS }, (achizitie + 0.01).toFixed(2), linii);
    const holt = r.preturi.find((p) => p.id === "holt20")!;
    const jgheab = r.preturi.find((p) => p.id === "jgheab2")!;
    expect(Number(holt.pretNetEur) - 6.31).toBeCloseTo(0.01, 6);
    expect(jgheab.pretNetEur).toBe("4.40");
    expect(r.abatereEur).toBe("0.00");
  });

  it("restul negativ se repartizeaza cu -0,01 pe unitate, dupa aceeasi regula", () => {
    const linii = [linie("a", "10.00", "100.000", "mp"), linie("b", "1.00", "3"), linie("c", "1.00", "2")];
    const achizitie = linii.reduce((s, l) => s + Number(l.valoareAchizitieEur), 0);
    const r = prezinta({ mod: "simplu", ...CURS }, (achizitie - 0.03).toFixed(2), linii);
    expect(r.preturi.find((p) => p.id === "b")!.pretNetEur).toBe("1.00"); // 1,01 - 0,01
    expect(r.preturi.find((p) => p.id === "c")!.pretNetEur).toBe("1.01");
    expect(r.abatereEur).toBe("0.00");
  });

  it("E06: ce nu incape in centi intregi ramane abatere, cu avertizare", () => {
    const linii = [linie("sipca", "1.11", "120.000", "ml"), linie("holt", "6.25", "2", "cutie")];
    const r = prezinta({ mod: "simplu", cursAchizitie: "5.3830", cursBnr: "5.3297" }, "155.07", linii);
    expect(r.preturi.map((p) => [p.id, p.pretNetEur, p.valoareEur])).toEqual([
      ["sipca", "1.18", "141.60"],
      ["holt", "6.73", "13.46"], // 6,66 + 0,01 + 6 x 0,01
    ]);
    expect(r.documentFaraTvaEur).toBe("155.06");
    expect(r.abatereEur).toBe("-0.01");
    expect(r.avertizari[0]).toMatch(/nu se poate repartiza/);
  });

  it("invelitorile (mp) si liniile la ml nu primesc niciodata restul", () => {
    const linii = [linie("tigla", "6.79", "10.000", "mp"), linie("ml", "5.53", "12.000", "ml")];
    const achizitie = linii.reduce((s, l) => s + Number(l.valoareAchizitieEur), 0);
    const r = prezinta({ mod: "simplu", ...CURS }, (achizitie + 0.05).toFixed(2), linii);
    expect(r.abatereEur).toBe("-0.05");
    expect(r.preturi.map((p) => p.pretNetEur)).toEqual(["6.86", "5.59"]);
  });

  it("pretul fix ramane cum a fost scris, restul liniilor absorb diferenta (E02)", () => {
    const linii = [
      linie("tigla", "6.79", "180.481", "mp", { pretFix: { tip: "achizitie_plus_pct", valoare: "5" } }),
      linie("coama", "4.90", "13"),
      linie("colector", "2.45", "16"),
      linie("jgheab2", "4.36", "1"),
    ];
    const r = prezinta({ mod: "simplu", ...CURS }, "1500.00", linii);
    const tigla = r.preturi.find((p) => p.id === "tigla")!;
    expect(tigla).toMatchObject({ pretNetEur: "7.28", valoareEur: "1313.90", pretFix: true });
    expect(r.documentFaraTvaEur).toBe("1500.00");
    expect(r.abatereEur).toBe("0.00");
    // liniile libere impart 1.500 - 1.313,90 = 186,10 EUR
    const libere = r.preturi.filter((p) => !p.pretFix).reduce((s, p) => s + Number(p.valoareEur), 0);
    expect(libere).toBeCloseTo(186.1, 6);
  });

  it("tinta 0 (completare pe costul nostru): toate preturile 0, fara abatere (E10)", () => {
    const r = prezinta({ mod: "simplu", ...CURS }, "0.00", [linie("coama", "4.90", "2"), linie("carlig", "1.46", "10")]);
    expect(r.preturi.map((p) => p.pretNetEur)).toEqual(["0.00", "0.00"]);
    expect(r.documentFaraTvaEur).toBe("0.00");
    expect(r.abatereEur).toBe("0.00");
  });
});

describe("lista + discount general (E04)", () => {
  it("totalul de lista L: L - round(L x d) = net", () => {
    expect(gasesteTotalLista("2626.83", "25")).toBe("3502.44");
    expect(gasesteTotalLista("100.00", "30")).toBe("142.86"); // 142,86 - 42,86 = 100,00
    expect(gasesteTotalLista("0.00", "25")).toBe("0.00");
  });

  it("preturile de lista sunt ancora; garda si netul pe lista x (1 - d); discountul o singura data, la total", () => {
    const r = prezinta({ mod: "lista_discount_general", discountGeneralPct: "25", ...CURS }, "1000.00", LINII);
    expect(r.totalListaFaraTvaEur).toBe("1333.33");
    expect(r.discountGeneralEur).toBe("333.33");
    expect(r.documentFaraTvaEur).toBe("1000.00");
    expect(r.abatereEur).toBe("0.00");
    for (const p of r.preturi) {
      expect(p.pretListaEur).toBe(p.pretDocumentEur);
      expect(p.pretNetEur).toBe(la2(z(p.pretListaEur!).times("0.75")));
    }
    const sumaLista = r.preturi.reduce((s, p) => s + Number(p.valoareEur), 0);
    expect(sumaLista.toFixed(2)).toBe("1333.33");
  });

  it("refuza un discount de 100 % sau mai mare", () => {
    expect(() => prezinta({ mod: "lista_discount_general", discountGeneralPct: "100", ...CURS }, "1000.00", LINII)).toThrow(/sub 100/);
  });
});

describe("discount per linie (E08)", () => {
  it("netul din calculul invers; lista = net / (1 - d); exceptia schimba doar ancora; fixul are discount 0", () => {
    const linii = [
      linie("tigla", "6.79", "180.481", "mp", { discountPct: "10" }),
      linie("coama", "4.90", "13"),
      linie("cos", "19.62", "1", "buc", { pretFix: { tip: "eur_fara_tva", valoare: "24.00" } }),
      linie("jgheab2", "4.36", "1"),
    ];
    const r = prezinta({ mod: "discount_per_linie", discountImplicitPct: "25", ...CURS }, "1600.00", linii);
    const tigla = r.preturi.find((p) => p.id === "tigla")!;
    const coama = r.preturi.find((p) => p.id === "coama")!;
    const cos = r.preturi.find((p) => p.id === "cos")!;
    expect(tigla.discountPct).toBe("10");
    expect(Number(tigla.pretListaEur)).toBeCloseTo(Number(tigla.pretNetEur) / 0.9, 2);
    expect(coama.discountPct).toBe("25");
    expect(Number(coama.pretListaEur)).toBeCloseTo(Number(coama.pretNetEur) / 0.75, 2);
    expect(cos).toMatchObject({ pretNetEur: "24.00", pretListaEur: "24.00", discountPct: "0", pretFix: true });
    expect(r.documentFaraTvaEur).toBe("1600.00");
  });

  it("E08: coama mica 5,93 net -> 7,91 lista la 25 %; tigla 8,21 -> 9,12 la 10 %", () => {
    const linii = [linie("tigla", "6.79", "180.481", "mp", { discountPct: "10" }), linie("coama", "4.90", "13")];
    const r = prezinta({ mod: "discount_per_linie", discountImplicitPct: "25", ...CURS }, "1558.84", linii); // 1481,75 + 77,09
    expect(r.preturi.map((p) => [p.pretNetEur, p.pretListaEur])).toEqual([
      ["8.21", "9.12"],
      ["5.93", "7.91"],
    ]);
  });
});
