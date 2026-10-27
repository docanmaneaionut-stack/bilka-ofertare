import { describe, expect, it } from "vitest";
import {
  achizitieLinie,
  achizitieRealaLaCursulDocumentului,
  calculeazaTinta,
  documentDinTinta,
  randVanzari,
  totalLeiDocument,
  totaluriAchizitie,
  tvaDinNet,
  verificaGarda,
} from "../src/modules/mot/preturi.js";

// Straturile de pret (FISA-OFERTARE 11.2, 11.6, 11.8, cap. 19; ETALON R1-R4, R6, R7),
// cu valorile din ofertele-model aprobate.

describe("achizitia contului (R2)", () => {
  it("baza x (1 + adaos cont), 2 zecimale; afisata in lei cu TVA cu o singura rotunjire", () => {
    const tigla = achizitieLinie("6.79", "180.481", "1.00", "0", "5.4020", 21); // E01
    expect(tigla).toEqual({
      achizitieContEur: "6.86",
      achizitieRealaEur: "6.86",
      achizitieContLeiCuTva: "44.84",
      valoareAchizitieEur: "1238.10",
      valoareAchizitieRealaEur: "1238.10",
    });
    // 6,31 x 5,4020 x 1,21 = 41,2448 -> 41,24 (rotunjind intai lei-ul fara TVA ar iesi 41,25)
    expect(achizitieLinie("6.25", "9", "1.00", "0", "5.4020", 21).achizitieContLeiCuTva).toBe("41.24");
    expect(achizitieLinie("2.69", "6", "1.00", "0", "5.4020", 21).achizitieContLeiCuTva).toBe("17.78");
  });

  it("cu grupa: achizitia afisata creste, achizitia reala ramane (E05)", () => {
    const tigla = achizitieLinie("6.79", "180.481", "1.00", "5.00", "5.4020", 21);
    expect(tigla.achizitieContEur).toBe("7.20"); // 6,79 x 1,01 x 1,05 = 7,2008
    expect(tigla.achizitieRealaEur).toBe("6.86");
    expect(tigla.achizitieContLeiCuTva).toBe("47.06");
    expect(achizitieLinie("4.90", "13", "1.00", "5.00", "5.4020", 21).achizitieContEur).toBe("5.20");
  });

  it("colaborator cu adaos 5 % (E03): rotunjirea la 2 zecimale e acceptata prin D2", () => {
    expect(achizitieLinie("0.86", "12", "5.00", "0", "5.3818", 21).achizitieContEur).toBe("0.90"); // +4,65 % efectiv
    expect(achizitieLinie("6.94", "37.107", "5.00", "0", "5.3818", 21).achizitieContLeiCuTva).toBe("47.47");
  });

  it("totalurile sunt sume de valori rotunjite pe linie, apoi lantul in lei rotunjit pas cu pas (E01)", () => {
    const linii = [
      achizitieLinie("6.79", "180.481", "1.00", "0", "5.4020", 21),
      achizitieLinie("6.54", "6.000", "1.00", "0", "5.4020", 21),
      achizitieLinie("4.90", "13", "1.00", "0", "5.4020", 21),
    ];
    const t = totaluriAchizitie(linii, "5.4020", 21);
    expect(t.contEurFaraTva).toBe("1342.11"); // 1238,10 + 39,66 + 64,35
    expect(t.contLeiFaraTva).toBe("7250.08");
    expect(t.contLeiCuTva).toBe("8772.60");
    expect(t.realaLeiCuTva).toBe("8772.60");
  });
});

describe("tinta in lei (R3)", () => {
  it("suma discutata: marja si adaosul real in lei (E01)", () => {
    expect(calculeazaTinta({ tip: "total_cu_tva_lei", valoare: "17000" }, "14337.77")).toEqual({
      tintaLeiCuTva: "17000.00",
      marjaLei: "2662.23",
      adaosRealPct: "18.57",
      adaosRealPctExact: "18.5680",
    });
  });

  it("adaos %: tinta = achizitia x (1 + adaos), pe lantul rotunjit (E02, E05, E09)", () => {
    expect(calculeazaTinta({ tip: "adaos_pct", valoare: "20" }, "14337.77").tintaLeiCuTva).toBe("17205.32");
    expect(calculeazaTinta({ tip: "adaos_pct", valoare: "2" }, "15054.36")).toMatchObject({ tintaLeiCuTva: "15355.45", marjaLei: "301.09", adaosRealPct: "2.00" });
    expect(calculeazaTinta({ tip: "adaos_pct_pastrat", valoare: "18.5680" }, "17688.28")).toMatchObject({ tintaLeiCuTva: "20972.64", marjaLei: "3284.36" });
  });

  it("completare la 0 lei: adaos -100 %, marja negativa (E10)", () => {
    expect(calculeazaTinta({ tip: "total_cu_tva_lei", valoare: "0" }, "202.05")).toEqual({
      tintaLeiCuTva: "0.00",
      marjaLei: "-202.05",
      adaosRealPct: "-100.00",
      adaosRealPctExact: "-100.0000",
    });
    expect(calculeazaTinta({ tip: "adaos_pct", valoare: "20" }, "0.00").adaosRealPct).toBe("0.00");
  });
});

describe("documentul in euro (R4): din lei-ul fara TVA", () => {
  it("tinta fara TVA (lei) -> / curs -> TVA din net -> cu TVA", () => {
    expect(documentDinTinta("17000.00", "5.3485", 21)).toEqual({ tintaFaraTvaLei: "14049.59", faraTvaEur: "2626.83", tvaEur: "551.63", cuTvaEur: "3178.46" }); // E01
    expect(documentDinTinta("17205.32", "5.3485", 21)).toMatchObject({ faraTvaEur: "2658.55", tvaEur: "558.30", cuTvaEur: "3216.85" }); // E02
    expect(documentDinTinta("4202.17", "5.3285", 21)).toMatchObject({ faraTvaEur: "651.75", tvaEur: "136.87", cuTvaEur: "788.62" }); // E03
    expect(documentDinTinta("1000.00", "5.3297", 21)).toMatchObject({ faraTvaEur: "155.07", cuTvaEur: "187.63" }); // E06, inainte de abatere
  });

  it("E11: citirea literala 'cu TVA = tinta / curs' ar da 3.280,34; din net iese 3.280,33", () => {
    expect(documentDinTinta("17544.88", "5.3485", 21)).toMatchObject({ faraTvaEur: "2711.02", tvaEur: "569.31", cuTvaEur: "3280.33" });
  });

  it("TVA din net: fara TVA + TVA = cu TVA, exact", () => {
    expect(tvaDinNet("155.06", 21)).toEqual({ faraTva: "155.06", tva: "32.56", cuTva: "187.62" });
    expect(tvaDinNet("0.00", 21)).toEqual({ faraTva: "0.00", tva: "0.00", cuTva: "0.00" });
  });
});

describe("totalul in lei (R6)", () => {
  it("tinta suma, fara abatere: suma discutata exact, chiar daca EUR x curs difera cu 1-3 bani", () => {
    // 3.178,46 x 5,3485 = 16.999,99, dar pe document apare 17.000,00
    expect(totalLeiDocument("total_cu_tva_lei", "17000.00", "3178.46", "5.3485", "0.00")).toBe("17000.00");
  });

  it("tinta suma cu abatere: cat iese din linii (E06)", () => {
    expect(totalLeiDocument("total_cu_tva_lei", "1000.00", "187.62", "5.3297", "-0.01")).toBe("999.96");
  });

  it("tinta adaos %: total EUR x curs, cu bani (E02, E05, E11)", () => {
    expect(totalLeiDocument("adaos_pct", "17205.32", "3216.85", "5.3485", "0.00")).toBe("17205.32");
    expect(totalLeiDocument("adaos_pct", "15355.45", "2870.98", "5.3485", "0.00")).toBe("15355.44");
    expect(totalLeiDocument("adaos_pct", "17544.88", "3280.33", "5.3485", "0.00")).toBe("17544.85");
    expect(totalLeiDocument("adaos_pct_pastrat", "20972.64", "3921.22", "5.3485", "0.00")).toBe("20972.65");
  });
});

describe("garda (R7)", () => {
  it("pragul = achizitia reala adusa la cursul documentului (E02: 6,86 -> 6,93)", () => {
    expect(achizitieRealaLaCursulDocumentului("6.86", "5.4020", "5.3485")).toBe("6.93");
    expect(achizitieRealaLaCursulDocumentului("0.69", "5.4020", "5.3485")).toBe("0.70");
  });

  it("listeaza liniile cu netul sub prag; egal cu pragul e permis", () => {
    const g = verificaGarda(
      [
        { id: "L1", pretNetEur: "8.22", achizitieRealaDocEur: "6.93" },
        { id: "L2", pretNetEur: "0.70", achizitieRealaDocEur: "0.70" },
        { id: "L3", pretNetEur: "0.69", achizitieRealaDocEur: "0.70" },
      ],
      false,
    );
    expect(g).toEqual({ respectata: false, liniiSubAchizitie: ["L3"], aplicata: true });
  });

  it("completarea marcata nu e verificata (E10: linii la 0)", () => {
    expect(verificaGarda([{ id: "L1", pretNetEur: "0.00", achizitieRealaDocEur: "5.00" }], true)).toEqual({ respectata: true, liniiSubAchizitie: [], aplicata: false });
  });
});

describe("randul din tabelul de vanzari (cap. 19)", () => {
  it("vanzare = totalul in lei, cost = achizitia reala cu TVA, net, brut / 1,21", () => {
    expect(randVanzari("17000.00", "14337.77", 21)).toEqual({ pretVanzareLei: "17000.00", costAchizitieLei: "14337.77", adaosNetLei: "2662.23", adaosBrutLei: "2200.19" }); // E01
    expect(randVanzari("15355.44", "14337.77", 21)).toEqual({ pretVanzareLei: "15355.44", costAchizitieLei: "14337.77", adaosNetLei: "1017.67", adaosBrutLei: "841.05" }); // E05: grupa nu intra in cost
    expect(randVanzari("999.96", "957.61", 21)).toMatchObject({ adaosNetLei: "42.35", adaosBrutLei: "35.00" }); // E06
    expect(randVanzari("0.00", "202.05", 21)).toMatchObject({ adaosNetLei: "-202.05", adaosBrutLei: "-166.98" }); // E10
  });
});
