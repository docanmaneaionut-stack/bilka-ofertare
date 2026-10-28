import { prisma } from "../src/db/prisma.js";
import type { FisierEtalon } from "../src/modules/mot/etalon.js";
import { cursAchizitie } from "../src/modules/mot/zecimal.js";

// Ajutoare comune pentru testele prin API pe ofertele-model (docs/etalon, format
// v1.3): corpul zonei produselor si corpul zonei de preturi, construite din
// blocul "intrari" al unui etalon, cu produsele reale din catalogul de test.

export async function produsDinCatalog(cod: string, denumire: string) {
  const p = await prisma.produs.findFirst({ where: { codFurnizor: cod, denumire, activ: true }, include: { categorieOferta: true } });
  if (!p) throw new Error(`Produs lipsa in catalogul de test: ${cod} ${denumire}`);
  return { id: p.id, categorie: p.categorieOferta?.denumire ?? "" };
}

// corpul PUT /produse din intrarile unui etalon: invelitorile din blocul lor, liniile
// din rubricile de accesorii (liniile de invelitoare le creeaza serverul)
export async function corpDinEtalon(e: FisierEtalon) {
  const i = e.intrari;
  const invelitori = [];
  // format v1.3: invelitorile si rubricile de sipca pe id; linia invelitorii poarta id-ul ei
  for (const inv of i.invelitori ?? []) {
    const linie = i.linii.find((l) => l.invelitoare === inv.id && l.rubrica === "Învelitori")!;
    const p = await produsDinCatalog(inv.cod_bilka, linie.denumire);
    invelitori.push({ cheie: inv.id, produsId: p.id, culoare: inv.culoare, panotaj: (inv.panotaj ?? []).map((x) => ({ lungimeM: x.lungime_m, bucati: x.bucati })), variantaProfil: inv.varianta_profil ?? null });
  }
  const linii = [];
  for (const [idx, l] of i.linii.entries()) {
    if (l.rubrica === "Învelitori") continue;
    const p = await produsDinCatalog(l.cod_bilka, l.denumire);
    const sipcaLiniei = l.sipca ? i.sipci?.find((s) => s.id === l.sipca) : undefined;
    const pozitii = sipcaLiniei?.pozitii
      ? sipcaLiniei.pozitii.map((p) => ({ lungimeM: p.lungime_m, bucati: p.bucati }))
      : (i.accesorii_ml ?? []).filter((a) => a.cod_bilka === l.cod_bilka).map((a) => ({ lungimeM: a.lungime_m, bucati: a.bucati }));
    linii.push({
      cheie: `L${idx + 1}`,
      rubrica: p.categorie,
      produsId: p.id,
      cantitate: l.cantitate,
      invelitoare: l.invelitoare ?? null,
      culoare: l.culoare ? { ral: l.culoare.ral, finisaj: l.culoare.finisaj, grosime: l.culoare.grosime ?? null } : null,
      ...(pozitii.length ? { pozitii } : {}),
    });
  }
  const sipci = (i.sipci ?? []).map((s) => {
    const idx = i.linii.findIndex((l) => l.sipca === s.id);
    const calcul = s.varianta.trim().toLowerCase() === "calcul";
    return {
      linie: `L${idx + 1}`,
      model: s.model,
      culoare: s.culoare,
      varianta: calcul ? ("calcul" as const) : ("comanda" as const),
      ...(calcul ? { tronsoane: (s.tronsoane ?? []).map((t) => ({ lungimeSipcaM: t.lungime_sipca_m, lungimeTronsonM: t.lungime_tronson_m, distantaMm: t.distanta_mm })) } : {}),
    };
  });
  return { grupaPct: i.grupa_pct || "0", invelitori, linii, sipci, zonaB: (i.zona_b ?? []).map((zb) => ({ denumire: zb.denumire, um: zb.um, cantitate: zb.cantitate, sumaLei: zb.suma_lei, contineTva: zb.contine_tva, preiaInFactura: zb.preia_in_factura })) };
}

const TINTA_DB = { total_cu_tva_lei: "TOTAL_CU_TVA_LEI", adaos_pct: "ADAOS_PCT" } as const;
const MOD_DB = { simplu: "SIMPLU", lista_discount_general: "LISTA_DISCOUNT_GENERAL", discount_per_linie: "DISCOUNT_PER_LINIE" } as const;

// corpul PUT /preturi din intrarile unui etalon (tinta, modul, discounturile, preturile
// fixe si exceptiile pe linii); liniile ofertei salvate au aceeasi ordine ca in etalon
// (liniile de invelitoare primele, apoi restul), deci pozitia leaga linia
export function preturiDinEtalon(e: FisierEtalon, liniiSalvate: { id: string; cod: string }[]) {
  const i = e.intrari;
  if (liniiSalvate.length !== i.linii.length) throw new Error(`${e.id}: oferta are ${liniiSalvate.length} linii, etalonul ${i.linii.length}`);
  const linii: { id: string; pretFix?: { tip: "eur_fara_tva" | "achizitie_plus_pct"; valoare: string } | null; discountPct?: string | null }[] = [];
  i.linii.forEach((l, idx) => {
    const salvata = liniiSalvate[idx];
    if (salvata.cod !== l.cod_bilka) throw new Error(`${e.id} linia ${idx + 1}: oferta are ${salvata.cod}, etalonul ${l.cod_bilka}`);
    const schimbare: (typeof linii)[number] = { id: salvata.id };
    if (l.pret_fix) schimbare.pretFix = { tip: l.pret_fix.tip as "eur_fara_tva" | "achizitie_plus_pct", valoare: l.pret_fix.valoare };
    else if (l.pret_fix_eur) schimbare.pretFix = { tip: "eur_fara_tva", valoare: l.pret_fix_eur };
    const exceptie = i.exceptii_discount?.[l.cod_bilka];
    if (exceptie !== undefined) schimbare.discountPct = exceptie;
    if (schimbare.pretFix || schimbare.discountPct !== undefined) linii.push(schimbare);
  });
  const tip = TINTA_DB[i.tinta.tip as keyof typeof TINTA_DB];
  return {
    ...(tip ? { tinta: { tip, valoare: i.tinta.valoare } } : {}),
    modPrezentare: MOD_DB[i.mod_prezentare as keyof typeof MOD_DB],
    discountGeneralPct: i.discount_general_pct ?? null,
    discountImplicitPct: i.discount_implicit_pct ?? null,
    linii,
  };
}

// cursurile etalonului (R1) puse direct pe oferta din baza de test, inainte de preturi
export async function puneCursulEtalonului(ofertaId: string, e: FisierEtalon) {
  const curs = e.intrari.curs_bnr;
  await prisma.oferta.update({ where: { id: ofertaId }, data: { cursBnr: curs, cursAchizitie: cursAchizitie(curs), tvaPct: e.intrari.tva_pct } });
}
