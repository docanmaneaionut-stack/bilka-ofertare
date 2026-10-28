import { describe, expect, it } from "vitest";
import { calculeazaOferta } from "../src/modules/mot/calcul.js";
import { agregaLucrare } from "../src/modules/mot/lucrare.js";
import { adaosuriPeRubrica, preiaPreturi, renuntaLaPreluare } from "../src/modules/mot/preluare.js";
import type { IntrareOferta, ProdusOferta } from "../src/modules/mot/tipuri.js";
import { construiesteVarianta, liniiLegateDeInvelitoare } from "../src/modules/mot/varianta.js";
import { la2, z } from "../src/modules/mot/zecimal.js";
import { calculeazaZonaB } from "../src/modules/mot/zonaB.js";
import { catalogCsv } from "./etalon/catalogCsv.js";
import { compara, incarcaEtalon, raport, spreAsteptat } from "./etalon/incarcaEtalon.js";

// Regulile din S10, fiecare pe cifrele ofertelor-model: colaboratorul (E03, cap. 19),
// zona B (E07, cap. 9), completarea si lucrarea (E10, cap. 2b), varianta (E01 -> E09,
// 11.7) si "preia preturi din oferta ..." (11.11, fara etalon - test propriu).

function rezultatEtalon(id: string) {
  const { etalon, intrare } = incarcaEtalon(id);
  return { etalon, intrare, rezultat: calculeazaOferta(intrare) };
}

describe("colaboratorul (cap. 19, E03)", () => {
  it("blocul de vanzari e randul Administratorului: vanzare = achizitia lui cu TVA, cost = baza x curs achizitie x 1,21", () => {
    const { rezultat } = rezultatEtalon("E03");
    expect(rezultat.vanzari).toMatchObject({ pretVanzareLei: "3751.94", costAchizitieLei: "3572.21", adaosNetLei: "179.73", adaosBrutLei: "148.54", tabel: "administrator" });
    expect(rezultat.vanzari.nota).toMatch(/tabelul Administratorului/);
    // oferta lui catre clientul final (4.202,16 lei) nu intra in vanzarile firmei
    expect(rezultat.totaluri.documentTotalLei).toBe("4202.16");
    expect(rezultat.vanzari.pretVanzareLei).not.toBe(rezultat.totaluri.documentTotalLei);
  });

  it("la Agent randul e cel propriu: vanzare = totalul in lei, cost = achizitia reala", () => {
    const { rezultat } = rezultatEtalon("E01");
    expect(rezultat.vanzari).toMatchObject({ pretVanzareLei: "17000.00", costAchizitieLei: "14337.77", tabel: "propriu" });
  });
});

describe("zona B (cap. 9, E07)", () => {
  it("suplimentul in lei cum a fost scris; in factura doar liniile bifate, la cursul documentului, pret unitar cu 4 zecimale", () => {
    const { rezultat } = rezultatEtalon("E07");
    expect(rezultat.zonaB?.supliment.map((s) => s.sumaLei)).toEqual(["1850.00", "9500.00"]);
    expect(rezultat.zonaB?.suplimentTotalLei).toBe("11350.00");
    expect(rezultat.zonaB?.inFactura).toEqual([
      { denumire: "Șipcă lemn 4 × 5 cm, tratată", um: "ml", cantitate: "320", pretUnitarLeiFaraTva: "5.7813", leiFaraTva: "1850.00", leiCuTva: "2238.50", eurFaraTva: "345.89" },
    ]);
    expect(rezultat.zonaB?.tabelFacturare).toEqual({ faraTvaEur: "2972.72", tvaEur: "624.27", cuTvaEur: "3596.99", totalLei: "19238.50" });
    // documentul de oferta si vanzarile raman pe materiale
    expect(rezultat.totaluri.documentTotalLei).toBe("17000.00");
    expect(rezultat.vanzari.pretVanzareLei).toBe("17000.00");
  });

  it("o linie cu 'contine TVA' se desface: 9.500 lei -> 7.851,24 fara TVA -> 1.467,93 EUR; lei-ul ramane cel scris", () => {
    const zb = calculeazaZonaB(
      [{ denumire: "Manoperă montaj", um: "lucrare", cantitate: "1", sumaLei: "9500", contineTva: true, preiaInFactura: true }],
      "5.3485",
      21,
      "2626.83",
      "17000.00",
    );
    expect(zb.inFactura[0]).toMatchObject({ pretUnitarLeiFaraTva: "7851.2400", leiFaraTva: "7851.24", leiCuTva: "9500.00", eurFaraTva: "1467.93" });
    expect(zb.tabelFacturare.totalLei).toBe("26500.00");
    expect(zb.supliment[0].sumaLei).toBe("9500.00");
  });

  it("totalul in lei al facturii = oferta + liniile preluate in lei cu TVA, nu EUR x curs", () => {
    const { rezultat } = rezultatEtalon("E07");
    expect(rezultat.zonaB?.tabelFacturare.totalLei).toBe("19238.50"); // 17.000 + 1.850 x 1,21
    // cand EUR x curs difera cu cativa bani, ramane lei-ul (aceeasi logica ca R6)
    const zb = calculeazaZonaB([{ denumire: "Șipcă lemn", um: "ml", cantitate: "100", sumaLei: "777.77", contineTva: false, preiaInFactura: true }], "5.3485", 21, "2626.83", "17000.00");
    expect(zb.tabelFacturare.totalLei).toBe("17941.10"); // 17.000 + 777,77 x 1,21 = 941,10
    expect(la2(z(zb.tabelFacturare.cuTvaEur).times("5.3485"))).not.toBe("17941.10");
  });
});

describe("completarea si lucrarea (cap. 2b, E10)", () => {
  it("completarea marcata: garda neaplicata, preturi 0, adaos -100 %", () => {
    const { rezultat, intrare } = rezultatEtalon("E10");
    expect(intrare.completare).toBe(true);
    expect(rezultat.garda).toEqual({ respectata: true, liniiSubAchizitie: [], aplicata: false });
    expect(rezultat.linii.map((l) => l.pretDocumentEur)).toEqual(["0.00", "0.00", "0.00"]);
    expect(rezultat.totaluri).toMatchObject({ documentTotalLei: "0.00", adaosRealPct: "-100.00", marjaLei: "-202.05" });
  });

  it("aceleasi linii la 0 pe o oferta obisnuita sunt refuzate de garda", () => {
    const { intrare } = rezultatEtalon("E10");
    const obisnuita: IntrareOferta = { ...intrare, completare: false };
    delete obisnuita.completareLa;
    const r = calculeazaOferta(obisnuita);
    expect(r.garda.aplicata).toBe(true);
    expect(r.garda.liniiSubAchizitie).toEqual(["L1", "L2", "L3"]);
    expect(r.avertizari.some((a) => /Gardă/.test(a))).toBe(true);
  });

  it("lucrarea E01 + E10: vanzare 17.000, cost 14.539,82, adaos net 2.460,18, brut 2.033,21", () => {
    const e01 = rezultatEtalon("E01").rezultat;
    const e10 = rezultatEtalon("E10").rezultat;
    expect(agregaLucrare(e01, [e10], 21)).toMatchObject({ pretVanzareLei: "17000.00", costAchizitieLei: "14539.82", adaosNetLei: "2460.18", adaosBrutLei: "2033.21", tabel: "propriu" });
    expect(agregaLucrare(e01, [], 21)).toMatchObject({ pretVanzareLei: "17000.00", adaosNetLei: "2662.23" });
  });

  it("intrarea poarta legatura cu oferta initiala si motivul", () => {
    const { intrare } = rezultatEtalon("E01");
    const completare: IntrareOferta = { ...intrare, completare: false, completareLa: "IB-0001", motivCompletare: "greșeală agent", tinta: { tip: "total_cu_tva_lei", valoare: "0" } };
    const r = calculeazaOferta(completare);
    expect(r.garda.aplicata).toBe(false);
  });
});

describe("varianta (11.7, E01 -> E09)", () => {
  it("din E01 cu inlocuirile Grande Mat iese exact E09, cu adaosul bazei pastrat ca procent cu 4 zecimale", () => {
    const baza = rezultatEtalon("E01");
    const e09 = incarcaEtalon("E09");
    // inlocuirile: linie cu linie, unde codul difera (invelitorile, accesoriile legate, capacul de coama)
    const inlocuiri: Record<string, ProdusOferta> = {};
    baza.intrare.linii.forEach((l, i) => {
      const nou = e09.intrare.linii[i].produs;
      if (nou.cod !== l.produs.cod) inlocuiri[l.produs.cod] = nou;
    });
    expect(Object.keys(inlocuiri).sort()).toEqual(["ABF36MAT050", "ACF15MAT050", "ACMICMAT050", "ADO41MAT050", "AFP25MAT050", "AOZ20MAT050", "ASCF4MAT050", "ASP05MAT050", "AST20MAT050", "AXCAPMAT000", "TCT08MAT050", "TMIBEMAT050"]);

    const varianta = construiesteVarianta(baza.intrare, baza.rezultat, inlocuiri);
    expect(varianta.tinta).toEqual({ tip: "adaos_pct_pastrat", valoare: "18.5680" });
    // M1: id-urile si legaturile raman, se schimba doar produsele
    expect(varianta.invelitori.map((i) => [i.id, i.produs.cod])).toEqual([["I1", "TMIBEGDM050"], ["I2", "TCT08GDM050"]]);
    expect(varianta.linii[2].invelitoare).toBe("I1");

    const rezultat = calculeazaOferta(varianta);
    const diferente = compara(e09.etalon.asteptat, spreAsteptat(rezultat, varianta));
    if (diferente.length > 0) expect.fail(raport("E09 din E01", "varianta", diferente));
    expect(rezultat.totaluri.documentTotalLei).toBe("20972.65");
  });

  it("liniile legate de invelitoare sunt cele care urmeaza cheia", () => {
    const { intrare } = rezultatEtalon("E01");
    const legate = liniiLegateDeInvelitoare(intrare, "I1");
    expect(legate).not.toContain("TMIBEMAT050"); // linia invelitorii insesi nu e "legata"
    expect(legate).toContain("ACMICMAT050");
    expect(legate).not.toContain("SPJGH1254ML"); // pluvialul are culoarea lui
  });
});

describe("preia preturi din oferta ... (11.11)", () => {
  function ofertaCareIa(): IntrareOferta {
    const { intrare } = rezultatEtalon("E01");
    const noua: IntrareOferta = structuredClone(intrare);
    // jumatate din cantitati (invelitorile prin panotaj: jumatate din bucati)
    noua.invelitori = noua.invelitori.map((i) => ({ ...i, panotaj: i.panotaj.map((p) => ({ ...p, bucati: Math.max(1, Math.round(p.bucati / 2)) })) }));
    noua.linii = noua.linii.map((l) => ({ ...l, cantitate: la2(z(l.cantitate).div(2)).replace(/\.00$/, "") }));
    // un produs nou, care nu e in sursa: coama mare mat 0,50 (Accesorii standard)
    const coamaMare = catalogCsv().gaseste("ACMARMAT050", "Coamă mare – mat – 0,50 mm");
    noua.linii.push({
      id: "L29",
      rubrica: "Accesorii standard",
      produs: { cod: coamaMare.cod, denumire: coamaMare.denumire, um: "buc", pretBazaEur: coamaMare.pretEur, finisaj: "mat", grosime: "0,50 mm" },
      cantitate: "6",
      invelitoare: "I1",
    });
    noua.tinta = { tip: "total_cu_tva_lei", valoare: "9000" };
    return noua;
  }

  it("produsele comune primesc pretul de prezentare al sursei; cel nou, adaosul rubricii lui; totalul 'cat iese', fara tinta", () => {
    const sursa = rezultatEtalon("E01");
    const noua = preiaPreturi(ofertaCareIa(), sursa.intrare, sursa.rezultat, "IB-0001");
    expect(noua.tinta.tip).toBe("preluata");
    expect(noua.preluataDin).toBe("IB-0001");
    expect(noua.linii.every((l) => l.pretFix?.preluat)).toBe(true);

    const r = calculeazaOferta(noua);
    // liniile comune: exact preturile din E01
    sursa.rezultat.linii.forEach((ls, i) => {
      expect(r.linii[i].pretDocumentEur, ls.cod).toBe(ls.pretDocumentEur);
    });
    // coama mare: achizitia ei x adaosul rubricii "Accesorii standard" din E01
    const adaosuri = adaosuriPeRubrica(sursa.rezultat);
    const factor = adaosuri.peRubrica.get("Accesorii standard")!;
    // aproape de coeficientul de prezentare al E01 (1,197541); difera putin prin rotunjirile pe linie
    expect(factor.gt("1.19") && factor.lt("1.21")).toBe(true);
    const coama = r.linii.find((l) => l.cod === "ACMARMAT050")!;
    expect(coama.achizitieContEur).toBe("5.96"); // 5,90 x 1,01
    expect(coama.pretDocumentEur).toBe(la2(z("5.96").times(factor)));
    expect(coama.pretDocumentEur).toBe("7.14");
    // totalul rezulta din linii: tinta = totalul in lei, marja din el, fara abatere
    expect(r.totaluri.documentFaraTvaEur).toBe(la2(r.linii.reduce((s, l) => s.plus(l.valoareEur), z(0))));
    expect(r.totaluri.documentTotalLei).toBe(la2(z(r.totaluri.documentCuTvaEur).times("5.3485")));
    expect(r.totaluri.tintaLeiCuTva).toBe(r.totaluri.documentTotalLei);
    expect(r.abatereEur).toBe("0.00");
    expect(r.garda.respectata).toBe(true);
    expect(r.vanzari.pretVanzareLei).toBe(r.totaluri.documentTotalLei);
  });

  it("preia modul de prezentare si discountul afisat al sursei (E08: discount per linie, exceptia pe tigla, fixul pe setul de cos)", () => {
    const sursa = rezultatEtalon("E08");
    const noua = preiaPreturi(ofertaCareIa(), sursa.intrare, sursa.rezultat, "IB-0008");
    expect(noua.modPrezentare).toBe("discount_per_linie");
    expect(noua.discountImplicitPct).toBe("25");
    expect(noua.linii[0].discountPct).toBe("10");
    const r = calculeazaOferta(noua);
    expect(r.linii[0]).toMatchObject({ pretNetEur: "8.21", pretListaEur: "9.12", discountPct: "10" });
    expect(r.linii[9]).toMatchObject({ pretNetEur: "24.00", discountPct: "0" });
  });

  it("renuntarea la preluare scoate doar preturile preluate si reda campul de tinta", () => {
    const sursa = rezultatEtalon("E01");
    const inainte = ofertaCareIa();
    inainte.linii[2].pretFix = { tip: "eur_fara_tva", valoare: "6.00" }; // un fix al agentului, pus inainte de preluare
    const preluata = preiaPreturi(inainte, sursa.intrare, sursa.rezultat, "IB-0001");
    const inapoi = renuntaLaPreluare(preluata, { tip: "total_cu_tva_lei", valoare: "9000" });
    expect(inapoi.tinta).toEqual({ tip: "total_cu_tva_lei", valoare: "9000" });
    expect(inapoi.preluataDin).toBeUndefined();
    expect(inapoi.linii.filter((l) => l.pretFix).map((l) => l.id)).toEqual(["L3"]);
    expect(inapoi.linii[2].pretFix).toEqual({ tip: "eur_fara_tva", valoare: "6.00" });
    const r = calculeazaOferta(inapoi);
    expect(r.totaluri.documentTotalLei).toBe("9000.00");
  });
});
