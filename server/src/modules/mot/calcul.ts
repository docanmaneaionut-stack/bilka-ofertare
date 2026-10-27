import { cursAchizitie, formateazaCantitate, la2, la3 } from "./zecimal.js";
import { schemaIntrareOferta, type IntrareOferta, type LinieCalculata, type RezultatOferta } from "./tipuri.js";

// Motorul de calcul (MOT) - functie pura: oferta ca date -> oferta calculata.
//
// S7 (fundatia): se valideaza intrarea, se deriva cursul de achizitie (R1) si
// se intorc liniile cu cantitatile declarate si pretul de baza din catalog;
// toate campurile de pret sunt "0.00". Pasii de calcul se adauga pe rand:
//   S8  cantitati (panotaj, suprafata directa / combinata, ml, sipca)
//   S9  achizitia contului cu grupa, tinta in lei, prezentarea (3 moduri),
//       restul de rotunjire si abaterea, garda, varianta B de TVA
//   S10 variante, preturi fixe, preluare preturi, completari, colaboratori
//   S11 toate ofertele etalon verzi; ARH §5 -> INGHETAT
// Regulile: docs/ETALON.md §0 (R1-R8) si FISA-OFERTARE v1.1 cap. 3, 8, 9, 11, 19, 2b.

const ZERO2 = "0.00";
const ZERO3 = "0.000";

export function calculeazaOferta(intrareBruta: IntrareOferta): RezultatOferta {
  const intrare = schemaIntrareOferta.parse(intrareBruta) as IntrareOferta;
  const curs = cursAchizitie(intrare.cursBnr);

  const linii: LinieCalculata[] = intrare.linii.map((l) => ({
    id: l.id,
    cod: l.produs.cod,
    um: l.produs.um,
    cantitate: formateazaCantitate(l.cantitate, l.produs.um),
    bazaEur: la2(l.produs.pretBazaEur),
    achizitieContEur: ZERO2,
    achizitieRealaEur: ZERO2,
    achizitieContLeiCuTva: ZERO2,
    pretDocumentEur: ZERO2,
    valoareEur: ZERO2,
    ...(intrare.modPrezentare === "lista_discount_general" ? { pretListaEur: ZERO2 } : {}),
    ...(intrare.modPrezentare === "discount_per_linie" ? { pretListaEur: ZERO2, discountPct: "0", pretNetEur: ZERO2 } : {}),
    pretFix: l.pretFix !== undefined,
    ...(l.invelitoare !== undefined ? { invelitoare: l.invelitoare } : {}),
  }));

  return {
    cursBnr: intrare.cursBnr,
    cursAchizitie: curs,
    cantitati: {
      invelitori: intrare.invelitori.map((i) => ({ id: i.id, mp: ZERO3, coli: 0 })),
      accesoriiMl: intrare.linii.filter((l) => l.pozitii !== undefined).map((l) => ({ linieId: l.id, ml: ZERO3 })),
      ...(intrare.sipca
        ? {
            sipca: {
              tronsoane: (intrare.sipca.tronsoane ?? []).map(() => ({ bucati: 0, ml: ZERO3 })),
              bucatiTotal: 0,
              mlTotal: la3(ZERO3),
            },
          }
        : {}),
    },
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
    ...(intrare.zonaB.length > 0
      ? {
          zonaB: {
            supliment: intrare.zonaB.map((l) => ({ denumire: l.denumire, sumaLei: la2(l.sumaLei) })),
            suplimentTotalLei: ZERO2,
            inFactura: [],
            tabelFacturare: { faraTvaEur: ZERO2, tvaEur: ZERO2, cuTvaEur: ZERO2, totalLei: ZERO2 },
          },
        }
      : {}),
    pachete: [],
    formulareBilka: [],
    avertizari: ["Motorul de calcul este in constructie (S7): preturile nu sunt inca calculate."],
  };
}
