import { calculeazaCantitati, normalizeazaUm } from "./cantitati.js";
import { impacheteaza } from "./pachete.js";
import {
  achizitieLinie,
  achizitieRealaLaCursulDocumentului,
  calculeazaTinta,
  documentDinTinta,
  randVanzari,
  randVanzariColaborator,
  totalLeiDocument,
  totaluriAchizitie,
  tvaDinNet,
  verificaGarda,
} from "./preturi.js";
import { prezinta } from "./prezentare.js";
import { schemaIntrareOferta, type IntrareOferta, type LinieCalculata, type RezultatOferta } from "./tipuri.js";
import { cursAchizitie, formateazaCantitate, la2, suma } from "./zecimal.js";
import { calculeazaZonaB } from "./zonaB.js";

// Motorul de calcul (MOT) - functie pura: oferta ca date -> oferta calculata.
//
// Pasii, in ordine:
//   S7  validarea intrarii, cursul de achizitie (R1), aritmetica zecimala
//   S8  cantitatile (panotaj, suprafata directa / combinata, ml, sipca),
//       comandabil, dripstop, UM normalizata, pachetele si formularele Bilka
//   S9  achizitia contului cu grupa (R2), tinta si marja in lei (R3), documentul
//       in euro (R4), prezentarea in cele trei moduri cu preturi fixe, restul de
//       rotunjire si abaterea (R5), totalul in lei (R6), garda (R7), vanzarile
//   S10 vanzarile colaboratorului (cap. 19), zona B - supliment si tabel de
//       facturare (cap. 9), completarea si lucrarea (cap. 2b, lucrare.ts),
//       varianta (11.7, varianta.ts), "preia preturi din oferta ..." (11.11,
//       preluare.ts - tinta "preluata": totalul rezulta din linii)
// Urmeaza S11: toate ofertele etalon verzi; ARH §5 -> INGHETAT.
// Regulile: docs/ETALON.md §0 (R1-R8) si FISA-OFERTARE v1.1 cap. 3, 5, 8, 9, 11, 19, 2b.

export function calculeazaOferta(intrareBruta: IntrareOferta): RezultatOferta {
  const intrare = schemaIntrareOferta.parse(intrareBruta) as IntrareOferta;
  const completare = intrare.completare || Boolean(intrare.completareLa);
  const preluata = intrare.tinta.tip === "preluata";
  const curs = cursAchizitie(intrare.cursBnr);
  const cantitati = calculeazaCantitati(intrare);
  const impachetare = impacheteaza(intrare);

  // cantitatile finale pe linie (calculate la invelitori / ml / sipca, declarate in rest)
  const cantitatePeLinie = new Map(intrare.linii.map((l) => [l.id, cantitati.peLinie.get(l.id) ?? l.cantitate]));

  // R2: achizitia pe linie si totalurile
  const achizitii = new Map(
    intrare.linii.map((l) => [
      l.id,
      achizitieLinie(l.produs.pretBazaEur, cantitatePeLinie.get(l.id) ?? l.cantitate, intrare.cont.adaosPct, intrare.grupaPct, curs, intrare.tvaPct),
    ]),
  );
  const totAch = totaluriAchizitie([...achizitii.values()], curs, intrare.tvaPct);

  // R3 + R4: tinta in lei, documentul in euro (la "preluata" se deduc din linii, mai jos)
  let tinta = calculeazaTinta(preluata ? { tip: "total_cu_tva_lei", valoare: "0" } : intrare.tinta, totAch.contLeiCuTva);
  const document = documentDinTinta(tinta.tintaLeiCuTva, intrare.cursBnr, intrare.tvaPct);

  // R5: prezentarea
  const prezentare = prezinta(
    {
      mod: intrare.modPrezentare,
      cursAchizitie: curs,
      cursBnr: intrare.cursBnr,
      ...(intrare.discountGeneralPct !== undefined ? { discountGeneralPct: intrare.discountGeneralPct } : {}),
      ...(intrare.discountImplicitPct !== undefined ? { discountImplicitPct: intrare.discountImplicitPct } : {}),
      ...(preluata ? { faraTinta: true } : {}),
    },
    document.faraTvaEur,
    intrare.linii.map((l) => {
      const a = achizitii.get(l.id)!;
      return {
        id: l.id,
        um: normalizeazaUm(l.produs.um),
        cantitate: cantitatePeLinie.get(l.id) ?? l.cantitate,
        achizitieContEur: a.achizitieContEur,
        achizitieRealaEur: a.achizitieRealaEur,
        valoareAchizitieEur: a.valoareAchizitieEur,
        ...(l.pretFix ? { pretFix: l.pretFix } : {}),
        ...(l.discountPct !== undefined ? { discountPct: l.discountPct } : {}),
      };
    }),
  );
  const preturi = new Map(prezentare.preturi.map((p) => [p.id, p]));

  // totalurile documentului se recalculeaza din linii (identice cu R4 cand nu e abatere)
  const tvaDoc = tvaDinNet(prezentare.documentFaraTvaEur, intrare.tvaPct);
  const totalLei = totalLeiDocument(intrare.tinta.tip, tinta.tintaLeiCuTva, tvaDoc.cuTva, intrare.cursBnr, prezentare.abatereEur);
  const avertizari: string[] = [...cantitati.avertizari, ...impachetare.avertizari, ...prezentare.avertizari];
  if (preluata) {
    // 11.11: fara camp de tinta - tinta, marja si adaosul real rezulta din linii
    tinta = calculeazaTinta({ tip: "total_cu_tva_lei", valoare: totalLei }, totAch.contLeiCuTva);
    const libere = intrare.linii.filter((l) => !l.pretFix).map((l) => l.produs.denumire);
    if (libere.length > 0) avertizari.push(`Preluare de prețuri: ${libere.length} linii fără preț preluat au ieșit cu 0 (${libere.join(", ")})`);
  }

  const linii: LinieCalculata[] = intrare.linii.map((l) => {
    const a = achizitii.get(l.id)!;
    const p = preturi.get(l.id)!;
    const um = normalizeazaUm(l.produs.um);
    const achizitieRealaDoc = achizitieRealaLaCursulDocumentului(a.achizitieRealaEur, curs, intrare.cursBnr);
    const linie: LinieCalculata = {
      id: l.id,
      cod: l.produs.cod,
      rubrica: l.rubrica,
      um,
      cantitate: formateazaCantitate(cantitatePeLinie.get(l.id) ?? l.cantitate, um),
      bazaEur: la2(l.produs.pretBazaEur),
      achizitieContEur: a.achizitieContEur,
      achizitieRealaEur: a.achizitieRealaEur,
      achizitieContLeiCuTva: a.achizitieContLeiCuTva,
      pretDocumentEur: p.pretDocumentEur,
      valoareEur: p.valoareEur,
      pretFix: p.pretFix,
      achizitieRealaDocEur: achizitieRealaDoc,
      subAchizitie: !completare && Number(p.pretNetEur) < Number(achizitieRealaDoc),
    };
    if (p.pretListaEur !== undefined) linie.pretListaEur = p.pretListaEur;
    if (p.discountPct !== undefined) linie.discountPct = p.discountPct;
    if (intrare.modPrezentare !== "simplu") linie.pretNetEur = p.pretNetEur;
    if (l.invelitoare !== undefined) linie.invelitoare = l.invelitoare;
    const pachet = impachetare.pachetPeLinie.get(l.id);
    if (pachet !== undefined) linie.pachet = pachet;
    return linie;
  });

  const garda = verificaGarda(
    intrare.linii.map((l) => ({ id: l.id, pretNetEur: preturi.get(l.id)!.pretNetEur, achizitieRealaDocEur: linii.find((x) => x.id === l.id)!.achizitieRealaDocEur })),
    completare,
  );
  if (garda.aplicata && !garda.respectata) {
    avertizari.push(`Gardă: ${garda.liniiSubAchizitie.length} linii sub achiziția reală a contului - oferta nu se poate salva așa.`);
  }

  const pachete = impachetare.pachete.map((p) => ({
    ...p,
    achizitieEur: la2(suma(p.linii.map((id) => achizitii.get(id)?.valoareAchizitieEur ?? "0"))),
  }));

  // cap. 19: vanzarea contului; la colaborator, randul Administratorului
  const vanzari =
    intrare.cont.tip === "COLABORATOR"
      ? randVanzariColaborator(totAch.contLeiCuTva, totAch.bazaLeiCuTva, intrare.tvaPct)
      : randVanzari(totalLei, totAch.realaLeiCuTva, intrare.tvaPct);

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
      achizitieContEurFaraTva: totAch.contEurFaraTva,
      achizitieContLeiFaraTva: totAch.contLeiFaraTva,
      achizitieContLeiCuTva: totAch.contLeiCuTva,
      achizitieRealaLeiCuTva: totAch.realaLeiCuTva,
      tintaLeiCuTva: tinta.tintaLeiCuTva,
      adaosRealPct: tinta.adaosRealPct,
      adaosRealPctExact: tinta.adaosRealPctExact,
      marjaLei: tinta.marjaLei,
      documentFaraTvaEur: tvaDoc.faraTva,
      tvaEur: tvaDoc.tva,
      documentCuTvaEur: tvaDoc.cuTva,
      documentTotalLei: totalLei,
      ...(prezentare.totalListaFaraTvaEur !== undefined ? { totalListaFaraTvaEur: prezentare.totalListaFaraTvaEur } : {}),
      ...(prezentare.discountGeneralEur !== undefined ? { discountGeneralEur: prezentare.discountGeneralEur } : {}),
    },
    vanzari,
    abatereEur: prezentare.abatereEur,
    garda,
    pachete,
    formulareBilka: impachetare.formulare,
    textFormulare: impachetare.text,
    avertizari,
  };
  if (intrare.zonaB.length > 0) {
    rezultat.zonaB = calculeazaZonaB(intrare.zonaB, intrare.cursBnr, intrare.tvaPct, tvaDoc.faraTva, totalLei);
  }
  return rezultat;
}
