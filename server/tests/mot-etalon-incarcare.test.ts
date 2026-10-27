import { describe, expect, it } from "vitest";
import { calculeazaOferta } from "../src/modules/mot/calcul.js";
import { la2, z } from "../src/modules/mot/zecimal.js";
import { catalogCsv, SUFIX_COALA } from "./etalon/catalogCsv.js";
import { citesteEtalon, compara, incarcaEtalon, listeazaEtaloane } from "./etalon/incarcaEtalon.js";

// Incarcatorul ofertelor-model: fisierele se citesc, fiecare linie e gasita in
// CSV-urile Bilka pe cod + denumire, iar pretul de baza din CSV e exact cel din
// blocul "asteptat". Verde din S7; calculul propriu-zis e testat in
// tests/etalon/etalon.test.ts (npm run test:etalon).

describe("catalogul din CSV-urile Bilka", () => {
  const catalog = catalogCsv();

  it("citeste cele 9 liste de produse", () => {
    expect(catalog.fisiere).toHaveLength(9);
    expect(catalog.numarProduse).toBeGreaterThan(3000);
  });

  it("acelasi cod poate avea mai multe denumiri - cautarea e pe cod + denumire", () => {
    const variante = catalog.variante("BANDAETAT35").map((p) => p.denumire).sort();
    expect(variante).toEqual(["Bandă etanșare profilată T35 – coamă", "Bandă etanșare profilată T35 – streașină"]);
    expect(catalog.gaseste("BANDAETAT35", "Bandă etanșare profilată T35 – coamă").pretEur).toBe("1.10");
    expect(() => catalog.gaseste("BANDAETAT35", "Bandă etanșare profilată T35")).toThrow(/denumiri in CSV/);
    expect(() => catalog.gaseste("XXXXXXXXXXX", "nimic")).toThrow(/codul nu exista/);
  });

  it("tabla plana e derivata si la coala (2,5 mp, pret x 2,5, BUC)", () => {
    const laMp = catalog.variante("TPLANLUC070").find((p) => p.tablaPlana === "mp");
    const coala = catalog.variante("TPLANLUC070").find((p) => p.tablaPlana === "coala");
    expect(laMp).toBeDefined();
    expect(coala).toBeDefined();
    expect(coala!.denumire).toBe(laMp!.denumire + SUFIX_COALA);
    expect(coala!.um).toBe("BUC");
    expect(coala!.pretEur).toBe(la2(z(laMp!.pretEur).times("2.5")));
  });

  it("latimile totale vin din CSV", () => {
    expect(catalog.gaseste("TMIBEMAT050", "Țiglă metalică Iberic – mat – 0,50 mm").latimeTotalaM).toBe("1,18");
    expect(catalog.gaseste("TCT35MAT050", "Tablă cutată T35 (acoperiș / perete) – mat – 0,50 mm").latimeTotalaM).toBe("1,085");
    expect(catalog.gaseste("SIPCAMAT050", "Șipcă Oslo – mat – 0,50 mm").latimeTotalaMm).toBe("92,9");
  });
});

describe("incarcarea ofertelor-model", () => {
  const ids = listeazaEtaloane();

  it("gaseste E01-E11", () => {
    expect(ids).toEqual(["E01", "E02", "E03", "E04", "E05", "E06", "E07", "E08", "E09", "E10", "E11"]);
  });

  for (const id of ids) {
    it(`${id}: toate liniile sunt in catalog, cu pretul de baza din CSV = baza_eur din asteptat`, () => {
      const { etalon, intrare } = incarcaEtalon(id);
      expect(intrare.linii).toHaveLength(etalon.intrari.linii.length);
      expect(etalon.asteptat.linii).toHaveLength(etalon.intrari.linii.length);
      intrare.linii.forEach((linie, idx) => {
        const asteptat = etalon.asteptat.linii[idx] as { cod_bilka: string; baza_eur: string };
        expect(linie.produs.cod, `${id} linia ${idx + 1}`).toBe(asteptat.cod_bilka);
        expect(linie.produs.pretBazaEur, `${id} linia ${idx + 1} (${linie.produs.cod})`).toBe(asteptat.baza_eur);
      });
      expect(intrare.invelitori.length).toBeGreaterThanOrEqual(0);
    });
  }

  it("campurile v1.1: invelitoare pe liniile legate, culoare pe cele independente, pret fix structurat", () => {
    const e01 = incarcaEtalon("E01").intrare;
    expect(e01.linii[2].invelitoare).toBe("TMIBEMAT050"); // coama mica
    expect(e01.linii[17].culoare).toEqual({ ral: "RAL 3005", finisaj: "pluvial colorat (lucios)" }); // jgheab
    expect(e01.invelitori.map((i) => [i.id, i.rol, i.latimeTotalaM, i.panotaj.length])).toEqual([
      ["TMIBEMAT050", "principala", "1.18", 4],
      ["TCT08MAT050", "secundara", "1.2", 1],
    ]);

    const e02 = incarcaEtalon("E02").intrare;
    expect(e02.linii[0].pretFix).toEqual({ tip: "achizitie_plus_pct", valoare: "5" });
    expect(e02.tinta).toEqual({ tip: "adaos_pct", valoare: "20" });
    expect(e02.invelitori.map((i) => i.mpDirect)).toEqual(["180.481", "6.000"]); // fara bloc de panotaj

    const e03 = incarcaEtalon("E03").intrare;
    expect(e03.cont).toEqual({ tip: "COLABORATOR", adaosPct: "5.00" });
    expect(e03.linii[10].pozitii).toEqual([{ lungimeM: "3.00", bucati: 4 }]);
    expect(e03.linii[10].culoare).toEqual({ ral: "RAL 9002", finisaj: "lucios", grosime: "0,50 mm" });

    const e04 = incarcaEtalon("E04").intrare;
    expect(e04.modPrezentare).toBe("lista_discount_general");
    expect(e04.discountGeneralPct).toBe("25");

    const e05 = incarcaEtalon("E05").intrare;
    expect(e05.grupaPct).toBe("5.00");

    const e06 = incarcaEtalon("E06").intrare;
    expect(e06.sipca).toMatchObject({ linieId: "L1", produsCod: "SIPCAMAT050", latimeSipcaMm: "92.9", varianta: "calcul" });
    expect(e06.sipca?.tronsoane).toHaveLength(2);

    const e07 = incarcaEtalon("E07").intrare;
    expect(e07.zonaB).toHaveLength(2);
    expect(e07.zonaB[0]).toMatchObject({ um: "ml", cantitate: "320", sumaLei: "1850.00", contineTva: false, preiaInFactura: true });

    const e08 = incarcaEtalon("E08").intrare;
    expect(e08.modPrezentare).toBe("discount_per_linie");
    expect(e08.discountImplicitPct).toBe("25");
    expect(e08.linii[0].discountPct).toBe("10"); // exceptia pe tigla
    expect(e08.linii[9].pretFix).toEqual({ tip: "eur_fara_tva", valoare: "24.00" }); // setul de cos de fum

    const e09 = incarcaEtalon("E09").intrare;
    expect(e09.tinta).toEqual({ tip: "adaos_pct_pastrat", valoare: "18.5680" });

    const e10 = incarcaEtalon("E10").intrare;
    expect(e10.completare).toBe(true);
    expect(e10.tinta).toEqual({ tip: "total_cu_tva_lei", valoare: "0" });

    const e11 = incarcaEtalon("E11").intrare;
    expect(e11.invelitori.map((i) => [i.id, i.rol, i.variantaProfil])).toEqual([
      ["TMCLSMAT050", "principala", undefined],
      ["REPROMAT050", "secundara", "Standard"],
    ]);
    expect(e11.linii[6].invelitoare).toBe("REPROMAT050"); // coama Retro
    expect(e11.linii[17].culoare).toEqual({ ral: "RAL 7016", finisaj: "pluvial mat" }); // pluvial B
  });

  it("intrarea trece de validarea motorului si cursul de achizitie din asteptat se regaseste", () => {
    for (const id of ids) {
      const { etalon, intrare } = incarcaEtalon(id);
      const rezultat = calculeazaOferta(intrare);
      expect(rezultat.cursAchizitie, id).toBe(etalon.asteptat.curs_achizitie);
      expect(rezultat.linii).toHaveLength(intrare.linii.length);
    }
  });

  it("comparatia raporteaza diferentele pe cale, cifra cu cifra", () => {
    const diferente = compara(
      { curs: "5.4020", linii: [{ a: "6.86", b: "1" }, { a: "2.00" }], nota: "text liber", abatere_eur: "−0.01 (explicatie)" },
      { curs: "5.4020", linii: [{ a: "0.00", b: 1 }], nota: "altceva", abatere_eur: "-0.01" },
    );
    expect(diferente).toEqual([
      { cale: "linii.length", asteptat: "2", obtinut: "1" },
      { cale: "linii[0].a", asteptat: "6.86", obtinut: "0.00" },
      { cale: "linii[1].a", asteptat: "2.00", obtinut: "(lipsa)" },
    ]);
  });

  it("fisierele etalon sunt in formatul v1.1", () => {
    for (const id of ids) {
      expect(citesteEtalon(id).format, id).toMatch(/^v1\.1/);
    }
  });
});
