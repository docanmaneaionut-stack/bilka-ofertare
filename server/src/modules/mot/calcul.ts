import { calculeazaCantitati, normalizeazaUm } from "./cantitati.js";
import { impacheteaza } from "./pachete.js";
import { schemaIntrareOferta, type IntrareOferta, type LinieCalculata, type RezultatOferta } from "./tipuri.js";
import { cursAchizitie, formateazaCantitate, la2 } from "./zecimal.js";

// Motorul de calcul (MOT) - functie pura: oferta ca date -> oferta calculata.
//
// Pasii construiti pana acum:
//   S7  validarea intrarii, cursul de achizitie (R1), aritmetica zecimala
//   S8  cantitatile (panotaj, suprafata directa / combinata, ml, sipca),
//       comandabil, dripstop, UM normalizata, pachetele si formularele Bilka
// Urmeaza:
//   S9  achizitia contului cu grupa, tinta in lei, prezentarea (3 moduri),
//       restul de rotunjire si abaterea, garda, varianta B de TVA
//   S10 variante, preturi fixe, preluare preturi, completari, colaboratori
//   S11 toate ofertele etalon verzi; ARH §5 -> INGHETAT
// Toate campurile de pret sunt "0.00" pana la S9.
// Regulile: docs/ETALON.md §0 (R1-R8) si FISA-OFERTARE v1.1 cap. 3, 5, 8, 9, 11, 19, 2b.

const ZERO2 = "0.00";

export function calculeazaOferta(intrareBruta: IntrareOferta): RezultatOferta {
  const intrare = schemaIntrareOferta.parse(intrareBruta) as IntrareOferta;
  const curs = cursAchizitie(intrare.cursBnr);
  const cantitati = calculeazaCantitati(intrare);
  const impachetare = impacheteaza(intrare);

  const linii: LinieCalculata[] = intrare.linii.map((l) => {
    const um = normalizeazaUm(l.produs.um);
    const linie: LinieCalculata = {
      id: l.id,
      cod: l.produs.cod,
      rubrica: l.rubrica,
      um,
      cantitate: formateazaCantitate(cantitati.peLinie.get(l.id) ?? l.cantitate, um),
      bazaEur: la2(l.produs.pretBazaEur),
      achizitieContEur: ZERO2,
      achizitieRealaEur: ZERO2,
      achizitieContLeiCuTva: ZERO2,
      pretDocumentEur: ZERO2,
      valoareEur: ZERO2,
      pretFix: l.pretFix !== undefined,
    };
    if (intrare.modPrezentare === "lista_discount_general") linie.pretListaEur = ZERO2;
    if (intrare.modPrezentare === "discount_per_linie") {
      linie.pretListaEur = ZERO2;
      linie.discountPct = "0";
      linie.pretNetEur = ZERO2;
    }
    if (l.invelitoare !== undefined) linie.invelitoare = l.invelitoare;
    const pachet = impachetare.pachetPeLinie.get(l.id);
    if (pachet !== undefined) linie.pachet = pachet;
    return linie;
  });

  const rezultat: RezultatOferta = {
    cursBnr: intrare.cursBnr,
    cursAchizitie: curs,
    cantitati: {
      invelitori: cantitati.invelitori,
      accesoriiMl: cantitati.accesoriiMl,
      ...(cantitati.sipca ? { sipca: cantitati.sipca } : {}),
    },
    comandabil: cantitati.comandabil,
    linii,
    totaluri: {
      achizitieContEurFaraTva: ZERO2,
      achizitieContLeiFaraTva: ZERO2,
      achizitieContLeiCuTva: ZERO2,
      achizitieRealaLeiCuTva: ZERO2,
      tintaLeiCuTva: ZERO2,
      adaosRealPct: ZERO2,
      adaosRealPctExact: "0.0000",
      marjaLei: ZERO2,
      documentFaraTvaEur: ZERO2,
      tvaEur: ZERO2,
      documentCuTvaEur: ZERO2,
      documentTotalLei: ZERO2,
      ...(intrare.modPrezentare === "lista_discount_general" ? { totalListaFaraTvaEur: ZERO2, discountGeneralEur: ZERO2 } : {}),
    },
    vanzari: { pretVanzareLei: ZERO2, costAchizitieLei: ZERO2, adaosNetLei: ZERO2, adaosBrutLei: ZERO2 },
    abatereEur: ZERO2,
    garda: { respectata: true, liniiSubAchizitie: [], aplicata: !intrare.completare },
    pachete: impachetare.pachete,
    formulareBilka: impachetare.formulare,
    textFormulare: impachetare.text,
    avertizari: [
      ...cantitati.avertizari,
      ...impachetare.avertizari,
      "Motorul de calcul este in constructie (S8): preturile nu sunt inca calculate.",
    ],
  };
  if (intrare.zonaB.length > 0) {
    rezultat.zonaB = {
      supliment: intrare.zonaB.map((l) => ({ denumire: l.denumire, sumaLei: la2(l.sumaLei) })),
      suplimentTotalLei: ZERO2,
      inFactura: [],
      tabelFacturare: { faraTvaEur: ZERO2, tvaEur: ZERO2, cuTvaEur: ZERO2, totalLei: ZERO2 },
    };
  }
  return rezultat;
}
