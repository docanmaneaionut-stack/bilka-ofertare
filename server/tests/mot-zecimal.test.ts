import { describe, expect, it } from "vitest";
import {
  cursAchizitie,
  cuTva,
  desparteTva,
  eurInLei,
  faraTva,
  formateazaCantitate,
  la2,
  leiInEur,
  rotunjeste,
  suma,
  z,
} from "../src/modules/mot/zecimal.js";

// Aritmetica motorului: rotunjiri half-up la 2 / 3 / 4 zecimale (ETALON R2-R8,
// FISA-OFERTARE 3.6) si conversiile EUR <-> lei (R1, R4). Valorile de
// referinta sunt cele din ofertele-model aprobate.

describe("rotunjire half-up", () => {
  it("0,005 urca la 0,01 (nu 'la par' ca in JavaScript)", () => {
    expect(rotunjeste("1.005", 2)).toBe("1.01");
    expect(rotunjeste("2.675", 2)).toBe("2.68");
    expect(rotunjeste("6.8579", 2)).toBe("6.86");
    expect(rotunjeste("1.0047", 3)).toBe("1.005");
    expect(rotunjeste("5.401985", 4)).toBe("5.4020");
  });

  it("sub jumatate coboara, peste jumatate urca", () => {
    expect(rotunjeste("4.9449", 2)).toBe("4.94");
    expect(rotunjeste("4.9451", 2)).toBe("4.95");
    expect(rotunjeste("4.945", 2)).toBe("4.95");
  });

  it("pastreaza numarul de zecimale cerut, ca text", () => {
    expect(rotunjeste("4.9", 2)).toBe("4.90");
    expect(rotunjeste("6", 3)).toBe("6.000");
    expect(rotunjeste("17000", 2)).toBe("17000.00");
    expect(rotunjeste("1.18", 4)).toBe("1.1800");
  });

  it("la negative rotunjeste departe de zero (half-up pe modul)", () => {
    expect(rotunjeste("-202.045", 2)).toBe("-202.05");
    expect(rotunjeste("-0.004", 2)).toBe("-0.00");
    expect(rotunjeste("-100", 2)).toBe("-100.00");
  });

  it("accepta virgula, spatii si minusul tipografic; refuza text invalid", () => {
    expect(la2("6,79")).toBe("6.79");
    expect(la2(" 1 234,5 ")).toBe("1234.50");
    expect(la2("−0.01")).toBe("-0.01");
    expect(() => z("")).toThrow(/Suma invalida/);
    expect(() => z("abc")).toThrow(/Suma invalida/);
    expect(() => z("1.2.3")).toThrow(/Suma invalida/);
  });

  it("nu pierde precizie la inmultiri repetate (nu e aritmetica binara)", () => {
    expect(la2(z("0.1").plus("0.2"))).toBe("0.30");
    expect(z("0.1").plus("0.2").eq("0.3")).toBe(true);
    expect(suma(["1483.55", "47.52", "77.09"]).toString()).toBe("1608.16");
  });
});

describe("cursul de achizitie (R1): BNR x 1,01, 4 zecimale", () => {
  it("reproduce cursurile din ofertele-model", () => {
    expect(cursAchizitie("5.3485")).toBe("5.4020"); // E01, E02, E04, E05, E07-E11
    expect(cursAchizitie("5.3285")).toBe("5.3818"); // E03
    expect(cursAchizitie("5.3297")).toBe("5.3830"); // E06
  });

  it("rotunjeste half-up la a patra zecimala", () => {
    expect(cursAchizitie("5.2446")).toBe("5.2970"); // 5.297046
    expect(cursAchizitie("5.0000")).toBe("5.0500");
  });
});

describe("conversii EUR <-> lei, 2 zecimale", () => {
  it("euro in lei la cursul dat", () => {
    expect(eurInLei("3178.46", "5.3485")).toBe("16999.99"); // E01: diferenta de 1 ban acceptata (R6)
    expect(eurInLei("187.62", "5.3297")).toBe("999.96"); // E06
    expect(eurInLei("788.62", "5.3285")).toBe("4202.16"); // E03
    expect(eurInLei("2193.52", "5.4020")).toBe("11849.40"); // E01 achizitie lei fara TVA
  });

  it("lei in euro la cursul dat", () => {
    expect(leiInEur("17000", "5.3485")).toBe("3178.46"); // E01
    expect(leiInEur("17205.32", "5.3485")).toBe("3216.85"); // E02
    expect(leiInEur("4202.17", "5.3285")).toBe("788.62"); // E03
    expect(leiInEur("1000", "5.3297")).toBe("187.63"); // E06
    expect(leiInEur("1850", "5.3485")).toBe("345.89"); // E07 zona B in factura
  });

  it("achizitia contului afisata in lei cu TVA (R2)", () => {
    expect(cuTva(eurInLei("6.86", "5.4020"), 21)).toBe("44.84"); // E01 tigla: 6,86 x 5,4020 = 37,06 -> x 1,21
    expect(cuTva("11849.40", 21)).toBe("14337.77"); // E01 total achizitie
    expect(cuTva("3100.78", 21)).toBe("3751.94"); // E03
  });
});

describe("TVA (R4): fara TVA + TVA = cu TVA, exact", () => {
  it("desface totalurile cu TVA din ofertele-model", () => {
    expect(desparteTva("3178.46", 21)).toEqual({ faraTva: "2626.83", tva: "551.63", cuTva: "3178.46" }); // E01
    expect(desparteTva("3216.85", 21)).toEqual({ faraTva: "2658.55", tva: "558.30", cuTva: "3216.85" }); // E02
    expect(desparteTva("788.62", 21)).toEqual({ faraTva: "651.75", tva: "136.87", cuTva: "788.62" }); // E03
    expect(desparteTva("2870.98", 21)).toEqual({ faraTva: "2372.71", tva: "498.27", cuTva: "2870.98" }); // E05
    expect(desparteTva("187.62", 21)).toEqual({ faraTva: "155.06", tva: "32.56", cuTva: "187.62" }); // E06
    expect(desparteTva("3921.22", 21)).toEqual({ faraTva: "3240.68", tva: "680.54", cuTva: "3921.22" }); // E09
    expect(desparteTva("3280.33", 21)).toEqual({ faraTva: "2711.02", tva: "569.31", cuTva: "3280.33" }); // E11
  });

  it("suma partilor da intotdeauna totalul", () => {
    for (const total of ["0.01", "0.02", "1.21", "99.99", "1234.56", "19238.50"]) {
      const { faraTva: net, tva } = desparteTva(total, 21);
      expect(la2(z(net).plus(tva))).toBe(la2(total));
    }
  });

  it("fara TVA dintr-o suma cu TVA, alta cota", () => {
    expect(faraTva("119", 19)).toBe("100.00");
    expect(faraTva("9500", 21)).toBe("7851.24"); // E07, cazul 'contine TVA'
  });
});

describe("cantitati (R8): 3 zecimale la mp / ml, intreg la bucata", () => {
  it("formateaza dupa unitatea de masura", () => {
    expect(formateazaCantitate("180.481", "mp")).toBe("180.481");
    expect(formateazaCantitate("6", "mp")).toBe("6.000");
    expect(formateazaCantitate("12", "ml")).toBe("12.000");
    expect(formateazaCantitate("13", "buc")).toBe("13");
    expect(formateazaCantitate("9", "cutie")).toBe("9");
    expect(formateazaCantitate("3", "rolă")).toBe("3");
  });

  it("panotajul din E01 da 180,481 mp (suma lungime x bucati x latime)", () => {
    const metri = suma(["4.20", "3.10", "2.75", "1.19"].map((l, i) => z(l).times([15, 20, 8, 5][i])));
    expect(metri.toString()).toBe("152.95");
    expect(formateazaCantitate(metri.times("1.18"), "mp")).toBe("180.481");
  });
});
