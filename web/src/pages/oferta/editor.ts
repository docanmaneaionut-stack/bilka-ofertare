import type { InvelitoareSalvata, LinieSalvata, OfertaDetaliu, ProdusEditor, RandGolEditor, ReferinteEditor, SipcaSalvata, StareProduse, ZonaBSalvata } from "../../api";
import { cuVirgula } from "../../lib/numere";

// Logica editorului de produse (FISA-OFERTARE cap. 3-10), fara apeluri de retea:
// cascada invelitorii peste produsele din catalog, culorile, categoria invelitorii
// pentru listele implicite, starea editorului din oferta salvata.

// ordinea rubricilor pe oferta (decisa 14.09.2026, completata 19.10.2026)
export const RUBRICI = {
  invelitori: "Învelitori",
  standard: "Accesorii standard",
  speciale2ml: "Accesorii speciale (2 ML)",
  fixare: "Fixare și etanșare",
  pluvial: "Sistem pluvial",
  sipca: "Șipcă gard",
  lungimi: "Accesorii speciale la lungimi (ML)",
  ferestre: "Ferestre",
  zonaB: "Zona B",
} as const;

// o invelitoare in editor: alegerea din cascada + cantitatile
export type InvelitoareUI = {
  cheie: string;
  produsId: string | null;
  // S25 (BUG-7): furnizorul (compartimentul din catalog) si modul de cantitate - doar pe ecran;
  // "combinat" = oferta veche cu mp direct SI panotaj (se deschide identic, pleaca amandoua)
  furnizor: string;
  mod: "panotaj" | "mp" | "combinat";
  tip: string;
  model: string;
  variantaProfil: string;
  montaj: string;
  optiune: string;
  finisaj: string;
  grosime: string;
  culoare: string;
  latimeTotalaM: string;
  mpDirect: string;
  panotaj: { lungimeM: string; bucati: string }[];
};

export type LinieUI = {
  cheie: string;
  rubrica: string;
  produs: ProdusEditor;
  cantitate: string;
  // legata de o invelitoare (cheia ei) sau cu cheia ei de culoare
  invelitoare: string | null;
  culoare: { ral: string; finisaj: string; grosime: string | null } | null;
  // la ml: pozitii lungime x bucati
  pozitii: { lungimeM: string; bucati: string }[] | null;
  // sectiunea din ecran de care apartine (grupare)
  sectiune: string;
  dinLista: boolean;
  // S29b: id-ul liniei salvate (din oferta deschisa) - dupa el se citesc metrii pozitiei din rezultatul motorului
  idSalvat?: string;
};

export type SipcaUI = {
  linie: string;
  profil: string;
  capat: "drept" | "rotund";
  varianta: "comanda" | "calcul";
  tronsoane: { lungimeSipcaM: string; lungimeTronsonM: string; distantaMm: string }[];
};

export type StareEditor = {
  grupaPct: string;
  precizariZonaB: string;
  invelitori: InvelitoareUI[];
  linii: LinieUI[];
  // rubricile de sipca, oricate (FISA cap. 8, M1): fiecare cu linia, modelul si varianta ei
  sipci: SipcaUI[];
  zonaB: { denumire: string; um: string; cantitate: string; sumaLei: string; contineTva: boolean; preiaInFactura: boolean }[];
};

let contor = 0;
export function cheieNoua(prefix: string): string {
  contor += 1;
  return `${prefix}-${Date.now().toString(36)}-${contor}`;
}

// ------------------------------------------------------------- cascada

const ORDINE_TIPURI = ["Țiglă metalică", "Învelitori plate", "Tablă cutată", "Tablă plană"];

export function tipuri(produse: ProdusEditor[]): string[] {
  const t = [...new Set(produse.map((p) => p.grup))];
  return t.sort((a, b) => ORDINE_TIPURI.indexOf(a) - ORDINE_TIPURI.indexOf(b));
}

export function modele(produse: ProdusEditor[], tip: string): string[] {
  return [...new Set(produse.filter((p) => p.grup === tip).map((p) => numeModel(p)))];
}

// modelul afisat: familia fara prefixul grupului si fara paranteze (ca in pachete)
export function numeModel(p: ProdusEditor): string {
  let nume = (p.familie ?? p.denumire).trim();
  if (nume.toLowerCase().startsWith(p.grup.toLowerCase() + " ")) nume = nume.slice(p.grup.length).trim();
  return nume.replace(/\s*\([^)]*\)/g, "").trim();
}

export function deModel(produse: ProdusEditor[], tip: string, model: string): ProdusEditor[] {
  return produse.filter((p) => p.grup === tip && numeModel(p) === model);
}

// variantele de profil ale modelului (Retro, Britanic, T8) din tabelul de referinta
export function variantePentru(ref: ReferinteEditor, model: string): { variantaProfil: string; restrictii: string | null }[] {
  const cheie = model.toLowerCase();
  return ref.variante.filter((v) => cheie.startsWith(v.model.toLowerCase()) || v.model.toLowerCase().startsWith(cheie.split(" ")[0]));
}

export function optiuni(produse: ProdusEditor[]): string[] {
  return [...new Set(produse.map((p) => p.optiune ?? ""))];
}

export function finisaje(produse: ProdusEditor[], optiune: string): string[] {
  return [...new Set(produse.filter((p) => (p.optiune ?? "") === optiune).map((p) => p.finisaj ?? ""))].filter(Boolean);
}

export function grosimi(produse: ProdusEditor[], optiune: string, finisaj: string): string[] {
  return [...new Set(produse.filter((p) => (p.optiune ?? "") === optiune && p.finisaj === finisaj).map((p) => p.grosime ?? ""))].filter(Boolean);
}

export function produsAles(produse: ProdusEditor[], optiune: string, finisaj: string, grosime: string): ProdusEditor | null {
  return produse.find((p) => (p.optiune ?? "") === optiune && p.finisaj === finisaj && p.grosime === grosime) ?? null;
}

// latimea totala: din catalog; tabla plana la mp din varianta (1,25 x 2,00 m)
export function latimeDinCatalog(p: ProdusEditor): string {
  if (p.latimeTotalaM) return p.latimeTotalaM;
  const m = p.tablaPlana === "mp" && p.varianta ? /^\s*(\d+(?:[.,]\d+)?)/.exec(p.varianta) : null;
  return m ? m[1].replace(",", ".") : "";
}

// culorile: exceptiile de pe produs au prioritate fata de tabelul finisaj x grosime
export function culoriPentru(ref: ReferinteEditor, p: ProdusEditor | null, finisaj: string, grosime: string): string[] {
  if (p?.culoriDisponibile?.trim()) {
    return p.culoriDisponibile
      .split(/[,;]/)
      .map((c) => c.trim())
      .filter(Boolean);
  }
  return ref.culori.filter((c) => c.finisaj.toLowerCase() === finisaj.toLowerCase() && c.grosime.replace(/\s/g, "") === grosime.replace(/\s/g, "")).map((c) => c.culoare);
}

// "8017" -> "RAL 8017"; "Black Wood" ramane
export function ral(culoare: string): string {
  return /^\d{4}$/.test(culoare.trim()) ? `RAL ${culoare.trim()}` : culoare.trim();
}

// categoria invelitorii pentru listele implicite (coloana categorie_invelitoare)
export function categorieInvelitoare(p: ProdusEditor | null, categoriiListe: string[]): string | null {
  if (!p) return null;
  const grup = p.grup.toLowerCase();
  const familie = (p.familie ?? "").toLowerCase();
  let prefix: string;
  if (grup.startsWith("țiglă metalică")) prefix = familie.includes("romanic") ? "țiglă metalică romanic" : "țiglă metalică (fără";
  else if (grup.startsWith("învelitori plate")) prefix = "învelitori plate";
  else if (grup.startsWith("tablă cutată") || grup.startsWith("tablă plană")) prefix = "tablă cutată";
  else return null;
  return categoriiListe.find((c) => c.toLowerCase().startsWith(prefix)) ?? null;
}

// cheia de culoare a unei invelitori (finisaj + grosime + RAL)
export function cheieInvelitoare(i: InvelitoareUI): { finisaj: string; grosime: string; ral: string } {
  return { finisaj: i.finisaj, grosime: i.grosime, ral: i.culoare };
}

export function textCheie(c: { finisaj: string; grosime?: string | null; ral: string }): string {
  return [c.ral, c.finisaj, c.grosime?.replace(/\s*mm$/, "")].filter(Boolean).join(" · ");
}

// ------------------------------------------------------- stare <-> server

export function invelitoareGoala(): InvelitoareUI {
  return { cheie: cheieNoua("inv"), produsId: null, furnizor: "", mod: "panotaj", tip: "", model: "", variantaProfil: "", montaj: "", optiune: "", finisaj: "", grosime: "", culoare: "", latimeTotalaM: "", mpDirect: "", panotaj: [{ lungimeM: "", bucati: "" }] };
}

export function stareGoala(): StareEditor {
  return { grupaPct: "0", precizariZonaB: "", invelitori: [invelitoareGoala()], linii: [], sipci: [], zonaB: [] };
}

// S29b (BUG-24 c, BUG-26, BUG-27): produsul unei linii salvate e cel din catalog (vine odata cu oferta -
// "produseCatalog"), cu tot ce nu se tine pe linie: treapta, sistemul, culorile lui. Doar cand produsul nu mai
// e in catalog se reface din ce s-a salvat pe linie - treapta din denumire, sistemul din coloana liniei.
export function treaptaDinDenumire(denumire: string): string | null {
  return /\bD\d{2}\b/.exec(denumire)?.[0] ?? null;
}

export function catalogulLiniilor(o: OfertaDetaliu): Map<string, ProdusEditor> {
  return new Map((o.produseCatalog ?? []).map((p) => [p.id, p]));
}

function produsDinSnapshot(l: LinieSalvata | InvelitoareSalvata, categorie: string | null, catalog: Map<string, ProdusEditor>): ProdusEditor {
  const dinCatalog = l.produsId ? catalog.get(l.produsId) : undefined;
  if (dinCatalog) return dinCatalog;
  return {
    id: l.produsId ?? "",
    cod: l.cod,
    denumire: l.denumire,
    um: l.um,
    categorie,
    compartiment: "",
    grup: l.grup ?? "",
    familie: l.familie,
    varianta: null,
    optiune: l.optiune,
    finisaj: l.finisaj,
    grosime: l.grosime,
    sistem: (l as { sistem?: string | null }).sistem ?? null,
    treapta: treaptaDinDenumire(l.denumire),
    desfasurata: null,
    latimeTotalaM: null,
    latimeTotalaMm: null,
    modulCm: null,
    culoriDisponibile: null,
    tablaPlana: null,
  };
}

// starea editorului din oferta salvata (snapshot + cataloagele deja incarcate)
export function stareDinOferta(o: OfertaDetaliu, invelitoriCatalog: ProdusEditor[], catalogLinii: Map<string, ProdusEditor>): StareEditor {
  const invSalvate = o.invelitori as InvelitoareSalvata[];
  const liniiSalvate = o.linii as LinieSalvata[];
  const cheiInv = new Map<string, string>();
  const invelitori: InvelitoareUI[] = invSalvate.map((i) => {
    const cheie = cheieNoua("inv");
    cheiInv.set(i.id, cheie);
    const p = i.produsId ? invelitoriCatalog.find((x) => x.id === i.produsId) : undefined;
    const arePanotaj = i.panotaj.length > 0;
    const areMp = Boolean(i.mpDirect && i.mpDirect.trim());
    return {
      cheie,
      produsId: i.produsId,
      furnizor: p?.compartiment ?? "",
      mod: areMp && arePanotaj ? "combinat" : areMp ? "mp" : "panotaj",
      tip: p?.grup ?? i.grup ?? "",
      model: p ? numeModel(p) : (i.familie ?? ""),
      variantaProfil: i.variantaProfil ?? "",
      montaj: i.montaj ?? "",
      optiune: i.optiune ?? "",
      finisaj: i.finisaj ?? "",
      grosime: i.grosime ?? "",
      culoare: i.culoare ?? "",
      latimeTotalaM: i.latimeTotalaM,
      // S25b: suprafata directa cu 3 zecimale la deschidere (serverul o da fara zerourile finale)
      mpDirect: i.mpDirect ? cuVirgula(Number(i.mpDirect).toFixed(3)) : "",
      panotaj: i.panotaj.length ? i.panotaj.map((p) => ({ lungimeM: cuVirgula(Number(p.lungimeM).toFixed(2)), bucati: String(p.bucati) })) : [{ lungimeM: "", bucati: "" }],
    };
  });
  const linii: LinieUI[] = liniiSalvate
    .filter((l) => l.rubrica !== RUBRICI.invelitori)
    .map((l) => {
      const cheie = cheieNoua("lin");
      const invelitoare = l.invelitoareId ? (cheiInv.get(l.invelitoareId) ?? null) : null;
      const culoare = !invelitoare && l.culoareRal ? { ral: l.culoareRal, finisaj: l.culoareFinisaj ?? l.finisaj ?? "", grosime: l.culoareGrosime ?? l.grosime } : null;
      return {
        cheie,
        rubrica: l.rubrica,
        produs: produsDinSnapshot(l, l.rubrica, catalogLinii),
        cantitate: cuVirgula(l.cantitate),
        invelitoare,
        culoare,
        pozitii: l.pozitii.length ? l.pozitii.map((p) => ({ lungimeM: cuVirgula(Number(p.lungimeM).toFixed(2)), bucati: String(p.bucati) })) : null,
        sectiune: sectiuneaLiniei(l.rubrica, invelitoare, culoare),
        dinLista: false,
        idSalvat: l.id,
      };
    });
  const sipci: SipcaUI[] = ((o.sipci ?? []) as SipcaSalvata[]).map((sipcaSalvata) => {
    const linie = liniiSalvate.find((l) => l.id === sipcaSalvata.linieId);
    const idx = liniiSalvate.filter((l) => l.rubrica !== RUBRICI.invelitori).findIndex((l) => l.id === sipcaSalvata.linieId);
    const [profil, capat] = sipcaSalvata.model.split(",").map((s) => s.trim());
    return {
      linie: idx >= 0 ? linii[idx].cheie : "",
      profil: profil || (linie?.familie ?? ""),
      capat: /rotund/i.test(capat ?? "") ? "rotund" : "drept",
      varianta: sipcaSalvata.varianta === "CALCUL" ? "calcul" : "comanda",
      tronsoane: sipcaSalvata.tronsoane.length ? sipcaSalvata.tronsoane.map((t) => ({ lungimeSipcaM: cuVirgula(t.lungimeSipcaM), lungimeTronsonM: cuVirgula(t.lungimeTronsonM), distantaMm: cuVirgula(t.distantaMm) })) : [{ lungimeSipcaM: "", lungimeTronsonM: "", distantaMm: "" }],
    };
  });
  // S29 (BUG-20): randurile adaugate cu "+" si lasate fara cantitate revin la locul lor - fiecare dupa atatea
  // linii cu cantitate cate avea inainte la salvare ("dupaLinii"), in ordinea in care au fost adaugate
  const liniiCuGoale = [...linii];
  for (const [k, g] of [...(o.randuriGoale ?? [])].sort((a, b) => a.ordine - b.ordine).entries()) {
    const invelitoare = g.invelitoareId ? (cheiInv.get(g.invelitoareId) ?? null) : null;
    const culoare = !invelitoare && (g.culoareRal || g.culoareFinisaj) ? { ral: g.culoareRal ?? "", finisaj: g.culoareFinisaj ?? g.finisaj ?? "", grosime: g.culoareGrosime ?? g.grosime } : null;
    const goala: LinieUI = {
      cheie: cheieNoua("lin"),
      rubrica: g.rubrica,
      produs: produsDinSnapshot(g as unknown as LinieSalvata, g.rubrica, catalogLinii),
      cantitate: "",
      invelitoare,
      culoare,
      pozitii: g.rubrica === RUBRICI.lungimi ? [{ lungimeM: "", bucati: "" }] : null,
      sectiune: sectiuneaLiniei(g.rubrica, invelitoare, culoare && culoare.ral ? culoare : null),
      dinLista: false,
    };
    liniiCuGoale.splice(Math.min(g.dupaLinii + k, liniiCuGoale.length), 0, goala);
  }
  return {
    grupaPct: o.grupaPct ?? "0",
    precizariZonaB: o.precizariZonaB ?? "",
    invelitori: invelitori.length ? invelitori : [invelitoareGoala()],
    linii: liniiCuGoale,
    sipci,
    zonaB: (o.zonaB as ZonaBSalvata[]).map((z) => ({ denumire: z.denumire, um: z.um, cantitate: cuVirgula(z.cantitate), sumaLei: cuVirgula(z.sumaLei), contineTva: z.contineTva, preiaInFactura: z.preiaInFactura })),
  };
}

// identificatorul sectiunii din ecran: rubrica + invelitoarea sau cheia proprie
export function sectiuneaLiniei(rubrica: string, invelitoare: string | null, culoare: { ral: string; finisaj: string; grosime: string | null } | null): string {
  if (invelitoare) return `${rubrica}|inv:${invelitoare}`;
  if (culoare) return `${rubrica}|cheie:${culoare.finisaj}|${culoare.grosime ?? ""}|${culoare.ral}`;
  return `${rubrica}|`;
}

// S29b (BUG-27): sistemul pluvial al unei linii, asa cum e in catalog. Piesele comune ("125 / 90 si 150 / 100")
// urmeaza grupul finisajului si culorii lor; singure, locul 125 / 90 (ARH §5.4).
export const SISTEME_PLUVIAL = ["125 / 90", "150 / 100"] as const;
const sistemPropriu = (sistem: string | null): string | null => {
  const are125 = /125/.test(sistem ?? "");
  const are150 = /150/.test(sistem ?? "");
  return are150 && !are125 ? "150 / 100" : are125 && !are150 ? "125 / 90" : null;
};
// "deschis" = sistemul sectiunii abia deschise pe ecran pentru finisajul si culoarea liniei (doar pana la salvare)
export function sistemulLiniei(l: LinieUI, linii: LinieUI[], deschis?: string | null): string {
  const propriu = sistemPropriu(l.produs.sistem);
  if (propriu) return propriu;
  const grup = linii.filter((x) => x.rubrica === l.rubrica && x.culoare && l.culoare && x.culoare.finisaj === l.culoare.finisaj && x.culoare.ral === l.culoare.ral).map((x) => sistemPropriu(x.produs.sistem));
  if (grup.includes("150 / 100") && !grup.includes("125 / 90")) return "150 / 100";
  if (grup.includes("125 / 90")) return "125 / 90";
  return deschis ?? "125 / 90";
}

// S29b (BUG-24 b): fiecare linie de pe ecran isi stie linia salvata. Serverul creeaza liniile in ordinea primita
// (dupa liniile invelitorilor), deci a k-a linie trimisa e a k-a linie salvata din afara rubricii Invelitori.
export function idurileLiniilor(cheiTrimise: string[], liniiSalvate: { id: string; rubrica: string }[]): Map<string, string> {
  const salvate = liniiSalvate.filter((l) => l.rubrica !== RUBRICI.invelitori);
  return new Map(cheiTrimise.flatMap((cheie, k) => (salvate[k] ? [[cheie, salvate[k].id] as [string, string]] : [])));
}

// cantitatea calculata de motor pentru o linie salvata (la accesoriile la lungimi: metrii pozitiei)
export function cantitateaLiniei(rezultat: { linii: { id: string; cantitate: string }[] } | null | undefined, id: string | undefined): string | null {
  return (id && rezultat?.linii.find((x) => x.id === id)?.cantitate) || null;
}

// invelitorile care pleaca spre server (cu produs), in ordine: pozitia lor e si
// pozitia in cantitatile intoarse de motor (M1: id-ul din baza nu e cunoscut pe ecran)
export function invelitoriTrimise(s: StareEditor): InvelitoareUI[] {
  return s.invelitori.filter((i) => i.produsId);
}

// rubricile de sipca care pleaca spre server: cele cu linie trimisa
export function sipciTrimise(s: StareEditor, cheiLiniiTrimise: string[]): SipcaUI[] {
  return s.sipci.filter((x) => cheiLiniiTrimise.includes(x.linie));
}

// o linie "are cantitate" cand intra in oferta: cantitate scrisa sau pozitii lungime x bucati completate
// (S29, BUG-20: la accesoriile la lungimi cantitatea vine DOAR din pozitii - randul fara pozitii e un rand gol)
const pozitieCompletata = (p: { lungimeM: string; bucati: string }) => Boolean(p.lungimeM.trim()) && Number(p.bucati) > 0;
export function areCantitate(l: LinieUI): boolean {
  if (!l.produs.id) return false;
  const cuPozitii = Boolean(l.pozitii && l.pozitii.some(pozitieCompletata));
  if (l.rubrica === RUBRICI.lungimi) return cuPozitii;
  return Number(l.cantitate.replace(",", ".")) > 0 || cuPozitii;
}

// S29 (BUG-20): randurile adaugate cu "+" si lasate fara cantitate - raman pe ecran pana sunt scoase din
// cos; pleaca separat de linii (nu intra in calcul), fiecare cu locul lui: cate linii cu cantitate are inainte
export function randuriGoaleTrimise(s: StareEditor, cheiInvelitori: Set<string>): RandGolEditor[] {
  const goale: RandGolEditor[] = [];
  let inainte = 0;
  for (const l of s.linii) {
    if (!l.produs.id) continue;
    if (areCantitate(l)) {
      inainte += 1;
      continue;
    }
    // rubrica de sipca isi tine singura randurile (linia ei pleaca oricum, cu cantitatea calculata de motor)
    if (l.rubrica === RUBRICI.sipca) continue;
    const legata = l.invelitoare && cheiInvelitori.has(l.invelitoare) ? l.invelitoare : null;
    goale.push({ rubrica: l.rubrica, produsId: l.produs.id, invelitoare: legata, culoare: legata || !l.culoare ? null : { ral: l.culoare.ral, finisaj: l.culoare.finisaj, grosime: l.culoare.grosime }, dupaLinii: inainte });
  }
  return goale;
}

// ce pleaca spre server: doar invelitorile cu produs si liniile cu cantitate
export function spreServer(s: StareEditor): StareProduse {
  const invelitori = invelitoriTrimise(s)
    .map((i) => ({
      cheie: i.cheie,
      produsId: i.produsId!,
      culoare: i.culoare || null,
      ...(i.latimeTotalaM ? { latimeTotalaM: i.latimeTotalaM } : {}),
      // S25: in fiecare mod pleaca exact ce pleca si inainte in modul acela - nu amandoua tacut
      mpDirect: i.mod !== "panotaj" && i.mpDirect.trim() ? i.mpDirect.trim() : null,
      panotaj: i.mod === "mp" ? [] : i.panotaj.filter((p) => p.lungimeM.trim() && Number(p.bucati) > 0).map((p) => ({ lungimeM: p.lungimeM.trim(), bucati: Number(p.bucati) })),
      variantaProfil: i.variantaProfil || null,
      montaj: i.montaj === "acoperis" || i.montaj === "perete" ? (i.montaj as "acoperis" | "perete") : null,
    }));
  const cheiInv = new Set(invelitori.map((i) => i.cheie));
  const linii = s.linii
    .filter((l) => (l.rubrica === RUBRICI.sipca ? Boolean(l.produs.id) && Number(l.cantitate.replace(",", ".")) > 0 : areCantitate(l)))
    .map((l) => {
      const pozitii = l.pozitii?.filter((p) => p.lungimeM.trim() && Number(p.bucati) > 0).map((p) => ({ lungimeM: p.lungimeM.trim(), bucati: Number(p.bucati) }));
      return {
        cheie: l.cheie,
        rubrica: l.rubrica,
        produsId: l.produs.id,
        cantitate: pozitii?.length ? "1" : l.cantitate.trim(),
        invelitoare: l.invelitoare && cheiInv.has(l.invelitoare) ? l.invelitoare : null,
        culoare: l.invelitoare && cheiInv.has(l.invelitoare) ? null : l.culoare,
        ...(pozitii?.length ? { pozitii } : {}),
      };
    });
  // rubricile de sipca care au linie cu produs, in ordinea de pe ecran (motorul
  // le intoarce in aceeasi ordine - asa se potrivesc cantitatile pe rubrica)
  const sipci = sipciTrimise(s, linii.map((l) => l.cheie)).map((x) => ({
    linie: x.linie,
    model: `${x.profil}, capăt ${x.capat}`,
    varianta: x.varianta,
    ...(x.varianta === "calcul"
      ? { tronsoane: x.tronsoane.filter((t) => t.lungimeSipcaM.trim() && t.lungimeTronsonM.trim()).map((t) => ({ lungimeSipcaM: t.lungimeSipcaM.trim(), lungimeTronsonM: t.lungimeTronsonM.trim(), distantaMm: t.distantaMm.trim() || "0" })) }
      : {}),
  }));
  return {
    grupaPct: s.grupaPct.trim() || "0",
    precizariZonaB: s.precizariZonaB.trim() || null,
    invelitori,
    linii,
    sipci,
    zonaB: s.zonaB.filter((z) => z.denumire.trim() && Number(z.cantitate.replace(",", ".")) > 0).map((z) => ({ ...z, denumire: z.denumire.trim(), um: z.um.trim() || "buc", cantitate: z.cantitate.trim(), sumaLei: z.sumaLei.trim() || "0" })),
    randuriGoale: randuriGoaleTrimise(s, cheiInv),
  };
}
