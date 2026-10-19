import { genereazaCodIntern } from "../../cat/codIntern.js";
import { citesteCsv, daNu, intreg, numar, text, type RandCsv } from "../csv.js";
import type { FisierCitit, Problema, ProdusImport, RandReferintaImport, TipFisier, TipReferinta } from "../tipuri.js";

// Formatul "bilka-v1": CSV-urile din docs/import/Bilka (README, "Coloanele CSV").
// Fisierele se recunosc dupa coloane, nu dupa nume.

const COLOANE_OBLIGATORII_PRODUSE = ["cod_furnizor", "grup", "denumire", "um", "pret_eur", "categorie_oferta", "activ"];

// echivalentele de rubrica specifice listelor Bilka (08 / 09) si categoria
// dubla a tablei plane (un cod, doua produse: la mp si la coala)
const ECHIVALENTE_RUBRICA: Record<string, string> = {
  "Accesorii speciale": "Accesorii speciale (2 ML)",
  "Accesorii speciale la lungimi": "Accesorii speciale la lungimi (ML)",
};
const CATEGORIE_TABLA_PLANA = "Învelitori plate (mp) + Accesorii standard (coală 1,25 × 2,00 m = 2,5 mp)";
const RUBRICA_TABLA_PLANA_MP = "Învelitori";
const RUBRICA_TABLA_PLANA_COALA = "Accesorii standard";
const SUFIX_COALA = " – coală 1,25 × 2,00 m (2,5 mp)";
const MP_PE_COALA = 2.5;

export function recunoasteTip(coloane: string[]): TipFisier | null {
  const are = (c: string) => coloane.includes(c);
  if (are("cod_furnizor") && are("pret_eur") && are("denumire")) return "produse";
  if (are("model") && are("varianta_profil")) return "variante-profil";
  if (are("garantie_culoare_ani")) return "garantii-finisaj-grosime";
  if (are("rubrica") && are("categorie_invelitoare") && are("produs")) return "liste-implicite-oferta";
  if (are("treapta") && are("de_la_mm")) return "trepte-desfasurata";
  if (are("finisaj") && are("grosime") && are("culoare")) return "culori-finisaj-grosime";
  return null;
}

export type ContextFormat = {
  codScurtCompartiment: string;
  denumireCompartiment: string;
  monedaCompartiment: string;
  rubrici: string[]; // denumirile rubricilor existente (CategorieOferta)
};

export function citesteFisierBilkaV1(nume: string, continut: Buffer, ctx: ContextFormat): FisierCitit {
  const probleme: Problema[] = [];
  const { coloane, randuri } = citesteCsv(continut);
  const tip = recunoasteTip(coloane);

  if (!tip) {
    probleme.push({ nivel: "eroare", fisier: nume, mesaj: `Fișier nerecunoscut după coloane (${coloane.join(", ") || "fără antet"})` });
    return { nume, tip: "produse", randuri: randuri.length, coloane, produse: [], referinte: [], probleme };
  }

  if (tip === "produse") {
    const lipsa = COLOANE_OBLIGATORII_PRODUSE.filter((c) => !coloane.includes(c));
    if (lipsa.length > 0) {
      probleme.push({ nivel: "eroare", fisier: nume, mesaj: `Coloane lipsă: ${lipsa.join(", ")}` });
      return { nume, tip, randuri: randuri.length, coloane, produse: [], referinte: [], probleme };
    }
    const produse: ProdusImport[] = [];
    randuri.forEach((r, i) => produse.push(...produsDinRand(nume, i + 2, r, ctx, probleme)));
    return { nume, tip, randuri: randuri.length, coloane, produse, referinte: [], probleme };
  }

  const referinte: RandReferintaImport[] = [];
  randuri.forEach((r, i) => {
    const rand = referintaDinRand(tip, nume, i + 2, r, ctx, probleme);
    if (rand) referinte.push(rand);
  });
  return { nume, tip, randuri: randuri.length, coloane, produse: [], referinte, probleme };
}

function rubricaDin(valoare: string | null, ctx: ContextFormat): string | null {
  if (!valoare) return null;
  const candidat = ECHIVALENTE_RUBRICA[valoare] ?? valoare;
  return ctx.rubrici.includes(candidat) ? candidat : null;
}

function produsDinRand(fisier: string, rand: number, r: RandCsv, ctx: ContextFormat, probleme: Problema[]): ProdusImport[] {
  const eroare = (mesaj: string) => probleme.push({ nivel: "eroare", fisier, rand, mesaj });

  const denumire = text(r.denumire);
  const grup = text(r.grup);
  const um = text(r.um)?.toUpperCase() ?? null;
  const pret = numar(r.pret_eur);
  const activ = daNu(r.activ);
  const categorieCsv = text(r.categorie_oferta);

  if (!denumire) eroare("Denumire lipsă");
  if (!grup) eroare("Grup lipsă");
  if (!um) eroare("UM lipsă sau necitibilă");
  if (pret === null || Number.isNaN(pret)) eroare(`Preț necitibil: „${r.pret_eur ?? ""}”`);
  if (activ === null) eroare(`Valoare „activ” necunoscută: „${r.activ}” (se acceptă da / nu)`);

  const esteTablaPlana = categorieCsv === CATEGORIE_TABLA_PLANA;
  const rubrica = esteTablaPlana ? RUBRICA_TABLA_PLANA_MP : rubricaDin(categorieCsv, ctx);
  if (!rubrica || (esteTablaPlana && !ctx.rubrici.includes(RUBRICA_TABLA_PLANA_COALA))) {
    eroare(`Rubrică necunoscută: „${categorieCsv ?? ""}”`);
  }

  const numere = {
    latimeTotalaM: numar(r.latime_totala_m),
    latimeTotalaMm: numar(r.latime_totala_mm),
    modulCm: numar(r.modul_cm),
  };
  for (const [camp, v] of Object.entries(numere)) {
    if (v !== null && Number.isNaN(v)) eroare(`Valoare numerică necitibilă la ${camp}`);
  }

  if (!denumire || !grup || !um || pret === null || Number.isNaN(pret) || activ === null || !rubrica) return [];

  const codFurnizor = text(r.cod_furnizor);
  const baza = {
    fisier,
    rand,
    codFurnizor,
    grup,
    familie: text(r.familie),
    varianta: text(r.varianta),
    finisaj: text(r.finisaj),
    grosime: text(r.grosime),
    optiune: text(r.optiune),
    moneda: text(r.moneda)?.toUpperCase() ?? ctx.monedaCompartiment,
    categorieBilka: text(r.categorie_bilka),
    latimeTotalaM: Number.isNaN(numere.latimeTotalaM) ? null : numere.latimeTotalaM,
    latimeTotalaMm: Number.isNaN(numere.latimeTotalaMm) ? null : numere.latimeTotalaMm,
    modulCm: Number.isNaN(numere.modulCm) ? null : numere.modulCm,
    sistem: text(r.sistem),
    treapta: text(r.treapta),
    desfasurata: text(r.desfasurata),
    culoriDisponibile: text(r.culori_disponibile),
    sursa: text(r.sursa),
    observatii: text(r.observatii),
    activ,
  };

  const principal: ProdusImport = {
    ...baza,
    denumire,
    um,
    pret,
    categorieOferta: rubrica,
    codIntern: genereazaCodIntern({ codScurtCompartiment: ctx.codScurtCompartiment, codFurnizor, denumire }),
    ...(esteTablaPlana ? { tablaPlana: "mp" as const } : {}),
  };
  if (!esteTablaPlana) return [principal];

  // regula "un cod, doua produse" (FISA-CATALOG 3, OFERTARE 3.4): aceeasi
  // tabla, la mp (invelitoare) si la coala de 2,5 mp (accesoriu, BUC)
  const denumireCoala = denumire + SUFIX_COALA;
  const coala: ProdusImport = {
    ...baza,
    denumire: denumireCoala,
    um: "BUC",
    pret: Math.round(pret * MP_PE_COALA * 100) / 100,
    categorieOferta: RUBRICA_TABLA_PLANA_COALA,
    codIntern: genereazaCodIntern({ codScurtCompartiment: ctx.codScurtCompartiment, codFurnizor, denumire: denumireCoala }),
    tablaPlana: "coala",
  };
  return [principal, coala];
}

function referintaDinRand(
  tip: TipReferinta,
  fisier: string,
  rand: number,
  r: RandCsv,
  ctx: ContextFormat,
  probleme: Problema[],
): RandReferintaImport | null {
  const eroare = (mesaj: string) => {
    probleme.push({ nivel: "eroare", fisier, rand, mesaj });
    return null;
  };

  const furnizor = text(r.furnizor);
  if (furnizor && furnizor !== ctx.denumireCompartiment) {
    return eroare(`Furnizorul „${furnizor}” nu e compartimentul ales („${ctx.denumireCompartiment}”)`);
  }

  const obligatoriu = (coloana: string) => {
    const v = text(r[coloana]);
    if (!v) eroare(`Coloana „${coloana}” e goală`);
    return v;
  };
  const intregObligatoriu = (coloana: string) => {
    const v = intreg(r[coloana]);
    if (v === null || Number.isNaN(v)) eroare(`Număr necitibil la „${coloana}”: „${r[coloana] ?? ""}”`);
    return v;
  };

  switch (tip) {
    case "variante-profil": {
      const model = obligatoriu("model");
      const variantaProfil = obligatoriu("varianta_profil");
      if (!model || !variantaProfil) return null;
      return {
        tip, fisier, rand,
        cheie: `${model}|${variantaProfil}`,
        valori: { model, variantaProfil, restrictii: text(r.restrictii), listaSursa: text(r.lista_sursa) },
      };
    }
    case "culori-finisaj-grosime": {
      const finisaj = obligatoriu("finisaj");
      const grosime = obligatoriu("grosime");
      const culoare = obligatoriu("culoare");
      if (!finisaj || !grosime || !culoare) return null;
      return { tip, fisier, rand, cheie: `${finisaj}|${grosime}|${culoare}`, valori: { finisaj, grosime, culoare } };
    }
    case "garantii-finisaj-grosime": {
      // pluvialul nu are grosime (se potriveste doar pe finisaj) si poate sa nu
      // aiba garantie la culoare (Magnelis, Aluzinc): lipsa = fara garantie, nu zero
      const finisaj = obligatoriu("finisaj");
      const grosime = text(r.grosime);
      const garantieCuloareAni = intreg(r.garantie_culoare_ani);
      if (garantieCuloareAni !== null && Number.isNaN(garantieCuloareAni)) eroare(`Număr necitibil la „garantie_culoare_ani”: „${r.garantie_culoare_ani ?? ""}”`);
      const garantieCoroziuneAni = intregObligatoriu("garantie_coroziune_ani");
      const stratZinc = numar(r.strat_zinc_g_mp);
      if (!finisaj || Number.isNaN(garantieCuloareAni) || garantieCoroziuneAni === null || Number.isNaN(garantieCoroziuneAni)) return null;
      return {
        tip, fisier, rand,
        cheie: `${finisaj}|${grosime ?? ""}`,
        valori: {
          finisaj, grosime, garantieCuloareAni, garantieCoroziuneAni,
          stratZincGMp: stratZinc === null || Number.isNaN(stratZinc) ? null : stratZinc,
          stratVopseaUmExtInt: text(r.strat_vopsea_um_ext_int),
        },
      };
    }
    case "liste-implicite-oferta": {
      const rubrica = obligatoriu("rubrica");
      const categorieInvelitoare = obligatoriu("categorie_invelitoare");
      const produs = obligatoriu("produs");
      const ordine = intregObligatoriu("ordine");
      if (!rubrica || !categorieInvelitoare || !produs || ordine === null || Number.isNaN(ordine)) return null;
      return { tip, fisier, rand, cheie: `${rubrica}|${categorieInvelitoare}|${produs}`, valori: { rubrica, categorieInvelitoare, produs, ordine } };
    }
    case "trepte-desfasurata": {
      const treapta = obligatoriu("treapta");
      const deLaMm = intregObligatoriu("de_la_mm");
      const panaLaMm = intregObligatoriu("pana_la_mm");
      const denumireBilka = obligatoriu("denumire_bilka");
      if (!treapta || deLaMm === null || Number.isNaN(deLaMm) || panaLaMm === null || Number.isNaN(panaLaMm) || !denumireBilka) return null;
      return { tip, fisier, rand, cheie: treapta, valori: { treapta, deLaMm, panaLaMm, denumireBilka } };
    }
  }
}

export const formatBilkaV1 = { id: "bilka-v1", citesteFisier: citesteFisierBilkaV1 };
