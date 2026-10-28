import type { Prisma } from "@prisma/client";
import type { IntrareOferta, LinieOferta, ProdusOferta, RezultatOferta, TipTinta } from "../mot/tipuri.js";

// Oferta din baza de date -> intrarea motorului (ARH §4.3: transformare 1:1,
// fara traduceri). Invelitorile se identifica in motor prin codul produsului
// (asa lucreaza pachetele si cantitatile din mot/, INGHETAT) - doua invelitori
// cu acelasi produs pe aceeasi oferta nu se disting (notat pentru MODIFICARE).

export const includeProduse = {
  utilizator: { select: { rol: true, adaosProcent: true } },
  invelitori: { orderBy: { ordine: "asc" as const }, include: { panotaj: { orderBy: { ordine: "asc" as const } } } },
  linii: { orderBy: { ordine: "asc" as const }, include: { pozitii: { orderBy: { ordine: "asc" as const } } } },
  sipca: { include: { tronsoane: { orderBy: { ordine: "asc" as const } } } },
  zonaB: { orderBy: { ordine: "asc" as const } },
} satisfies Prisma.OfertaInclude;

export type OfertaCuProduse = Prisma.OfertaGetPayload<{ include: typeof includeProduse }>;

const TINTA: Record<string, TipTinta> = {
  TOTAL_CU_TVA_LEI: "total_cu_tva_lei",
  ADAOS_PCT: "adaos_pct",
  ADAOS_PCT_PASTRAT: "adaos_pct_pastrat",
  PRELUATA: "preluata",
};

const MOD: Record<string, IntrareOferta["modPrezentare"]> = {
  SIMPLU: "simplu",
  LISTA_DISCOUNT_GENERAL: "lista_discount_general",
  DISCOUNT_PER_LINIE: "discount_per_linie",
};

function produsDinSnapshot(s: { cod: string; denumire: string; um: string; pretBazaEur: Prisma.Decimal; finisaj: string | null; grosime: string | null; grup: string | null; familie: string | null; optiune: string | null }): ProdusOferta {
  const p: ProdusOferta = { cod: s.cod, denumire: s.denumire, um: s.um, pretBazaEur: s.pretBazaEur.toString() };
  if (s.finisaj) p.finisaj = s.finisaj;
  if (s.grosime) p.grosime = s.grosime;
  if (s.grup) p.grup = s.grup;
  if (s.familie) p.familie = s.familie;
  if (s.optiune) p.optiune = s.optiune;
  return p;
}

export function spreIntrareMot(o: OfertaCuProduse): IntrareOferta {
  const codInvelitoare = new Map(o.invelitori.map((i) => [i.id, i.cod]));
  const intrare: IntrareOferta = {
    cursBnr: o.cursBnr.toFixed(4),
    tvaPct: Number(o.tvaPct),
    cont: { tip: o.utilizator.rol, adaosPct: o.utilizator.adaosProcent?.toString() ?? "0" },
    grupaPct: o.grupaPct.toString(),
    tinta: { tip: TINTA[o.tintaTip] ?? "adaos_pct", valoare: o.tintaValoare.toString() },
    modPrezentare: MOD[o.modPrezentare] ?? "simplu",
    completare: o.completareLaId !== null,
    invelitori: o.invelitori.map((i, idx) => {
      const inv: IntrareOferta["invelitori"][number] = {
        id: i.cod,
        produs: produsDinSnapshot(i),
        rol: i.rol === "principala" || (i.rol !== "secundara" && idx === 0) ? "principala" : "secundara",
        latimeTotalaM: i.latimeTotalaM.toString(),
        panotaj: i.panotaj.map((p) => ({ lungimeM: p.lungimeM.toString(), bucati: p.bucati })),
      };
      if (i.culoare) inv.culoare = i.culoare;
      if (i.mpDirect !== null) inv.mpDirect = i.mpDirect.toString();
      if (i.variantaProfil) inv.variantaProfil = i.variantaProfil;
      return inv;
    }),
    linii: o.linii.map((l) => {
      const linie: LinieOferta = { id: l.id, rubrica: l.rubrica, produs: produsDinSnapshot(l), cantitate: l.cantitate.toString() };
      if (l.pozitii.length > 0) linie.pozitii = l.pozitii.map((p) => ({ lungimeM: p.lungimeM.toString(), bucati: p.bucati }));
      if (l.invelitoareId && codInvelitoare.has(l.invelitoareId)) linie.invelitoare = codInvelitoare.get(l.invelitoareId)!;
      else if (l.culoareRal) {
        linie.culoare = { ral: l.culoareRal, finisaj: l.culoareFinisaj ?? l.finisaj ?? "" };
        const grosime = l.culoareGrosime ?? l.grosime;
        if (grosime) linie.culoare.grosime = grosime;
      }
      if (l.pretFixTip && l.pretFixValoare !== null) {
        linie.pretFix = { tip: l.pretFixTip === "EUR_FARA_TVA" ? "eur_fara_tva" : "achizitie_plus_pct", valoare: l.pretFixValoare.toString() };
        if (l.pretFixPreluat) linie.pretFix.preluat = true;
      }
      if (l.discountPct !== null) linie.discountPct = l.discountPct.toString();
      return linie;
    }),
    zonaB: o.zonaB.map((z) => ({ denumire: z.denumire, um: z.um, cantitate: z.cantitate.toString(), sumaLei: z.sumaLei.toString(), contineTva: z.contineTva, preiaInFactura: z.preiaInFactura })),
  };
  if (o.discountGeneralPct !== null) intrare.discountGeneralPct = o.discountGeneralPct.toString();
  if (o.discountImplicitPct !== null) intrare.discountImplicitPct = o.discountImplicitPct.toString();
  if (o.completareLaId) intrare.completareLa = o.completareLaId;
  if (o.motivCompletare) intrare.motivCompletare = o.motivCompletare;
  if (o.preluataDinId) intrare.preluataDin = o.preluataDinId;
  if (o.sipca) {
    const s = o.sipca;
    const linie = o.linii.find((l) => l.id === s.linieId);
    intrare.sipca = {
      linieId: s.linieId,
      produsCod: linie?.cod ?? "",
      model: s.model,
      latimeSipcaMm: s.latimeSipcaMm.toString(),
      varianta: s.varianta === "CALCUL" ? "calcul" : "comanda",
    };
    if (s.culoare) intrare.sipca.culoare = s.culoare;
    if (s.varianta === "CALCUL") intrare.sipca.tronsoane = s.tronsoane.map((t) => ({ lungimeSipcaM: t.lungimeSipcaM.toString(), lungimeTronsonM: t.lungimeTronsonM.toString(), distantaMm: t.distantaMm.toString() }));
    else intrare.sipca.pozitii = (linie?.pozitii ?? []).map((p) => ({ lungimeM: p.lungimeM.toString(), bucati: p.bucati }));
  }
  return intrare;
}

// S13: pe ecran doar cantitatile si structura - niciun pret, niciun total,
// indiferent de rol (preturile vin la S14, prin filtrul de rol)
export interface RezultatStructura {
  cantitati: RezultatOferta["cantitati"];
  comandabil: RezultatOferta["comandabil"];
  linii: { id: string; cod: string; um: string; cantitate: string; pachet?: string }[];
  pachete: { id: string; nume: string; tip: string; linii: string[] }[];
  formulareBilka: RezultatOferta["formulareBilka"];
  textFormulare: string;
  avertizari: string[];
}

export function rezultatStructura(r: RezultatOferta): RezultatStructura {
  return {
    cantitati: r.cantitati,
    comandabil: r.comandabil,
    linii: r.linii.map((l) => ({ id: l.id, cod: l.cod, um: l.um, cantitate: l.cantitate, ...(l.pachet ? { pachet: l.pachet } : {}) })),
    pachete: r.pachete.map((p) => ({ id: p.id, nume: p.nume, tip: p.tip, linii: p.linii })),
    formulareBilka: r.formulareBilka,
    textFormulare: r.textFormulare,
    // avertizarile de pret (garda, tinta, abatere) nu au ce cauta pe ecran la S13
    avertizari: r.avertizari.filter((a) => !/gard|țint|tint|abater|preț|pret|total/i.test(a)),
  };
}
