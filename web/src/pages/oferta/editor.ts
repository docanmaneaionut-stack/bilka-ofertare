import type { InvelitoareSalvata, LinieSalvata, OfertaDetaliu, ProdusEditor, ReferinteEditor, SipcaSalvata, StareProduse, ZonaBSalvata } from "../../api";

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
  tip: string;
  model: string;
  variantaProfil: string;
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
  sipca: SipcaUI | null;
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
  return { cheie: cheieNoua("inv"), produsId: null, tip: "", model: "", variantaProfil: "", optiune: "", finisaj: "", grosime: "", culoare: "", latimeTotalaM: "", mpDirect: "", panotaj: [{ lungimeM: "", bucati: "" }] };
}

export function stareGoala(): StareEditor {
  return { grupaPct: "0", precizariZonaB: "", invelitori: [invelitoareGoala()], linii: [], sipca: null, zonaB: [] };
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
    sistem: null,
    treapta: null,
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
    return {
      cheie,
      produsId: i.produsId,
      tip: p?.grup ?? i.grup ?? "",
      model: p ? numeModel(p) : (i.familie ?? ""),
      variantaProfil: i.variantaProfil ?? "",
      optiune: i.optiune ?? "",
      finisaj: i.finisaj ?? "",
      grosime: i.grosime ?? "",
      culoare: i.culoare ?? "",
      latimeTotalaM: i.latimeTotalaM,
      mpDirect: i.mpDirect ?? "",
      panotaj: i.panotaj.length ? i.panotaj.map((p) => ({ lungimeM: p.lungimeM, bucati: String(p.bucati) })) : [{ lungimeM: "", bucati: "" }],
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
        cantitate: l.cantitate,
        invelitoare,
        culoare,
        pozitii: l.pozitii.length ? l.pozitii.map((p) => ({ lungimeM: p.lungimeM, bucati: String(p.bucati) })) : null,
        sectiune: sectiuneaLiniei(l.rubrica, invelitoare, culoare),
        dinLista: false,
      };
    });
  const sipcaSalvata = o.sipca as SipcaSalvata | null;
  let sipca: SipcaUI | null = null;
  if (sipcaSalvata) {
    const linie = liniiSalvate.find((l) => l.id === sipcaSalvata.linieId);
    const idx = liniiSalvate.filter((l) => l.rubrica !== RUBRICI.invelitori).findIndex((l) => l.id === sipcaSalvata.linieId);
    const [profil, capat] = sipcaSalvata.model.split(",").map((s) => s.trim());
    sipca = {
      linie: idx >= 0 ? linii[idx].cheie : "",
      profil: profil || (linie?.familie ?? ""),
      capat: /rotund/i.test(capat ?? "") ? "rotund" : "drept",
      varianta: sipcaSalvata.varianta === "CALCUL" ? "calcul" : "comanda",
      tronsoane: sipcaSalvata.tronsoane.map((t) => ({ lungimeSipcaM: t.lungimeSipcaM, lungimeTronsonM: t.lungimeTronsonM, distantaMm: t.distantaMm })),
    };
  }
  return {
    grupaPct: o.grupaPct ?? "0",
    precizariZonaB: o.precizariZonaB ?? "",
    invelitori: invelitori.length ? invelitori : [invelitoareGoala()],
    linii,
    sipca,
    zonaB: (o.zonaB as ZonaBSalvata[]).map((z) => ({ denumire: z.denumire, um: z.um, cantitate: z.cantitate, sumaLei: z.sumaLei, contineTva: z.contineTva, preiaInFactura: z.preiaInFactura })),
  };
}

// identificatorul sectiunii din ecran: rubrica + invelitoarea sau cheia proprie
export function sectiuneaLiniei(rubrica: string, invelitoare: string | null, culoare: { ral: string; finisaj: string; grosime: string | null } | null): string {
  if (invelitoare) return `${rubrica}|inv:${invelitoare}`;
  if (culoare) return `${rubrica}|cheie:${culoare.finisaj}|${culoare.grosime ?? ""}|${culoare.ral}`;
  return `${rubrica}|`;
}

// ce pleaca spre server: doar invelitorile cu produs si liniile cu cantitate
export function spreServer(s: StareEditor): StareProduse {
  const invelitori = s.invelitori
    .filter((i) => i.produsId)
    .map((i) => ({
      cheie: i.cheie,
      produsId: i.produsId!,
      culoare: i.culoare || null,
      ...(i.latimeTotalaM ? { latimeTotalaM: i.latimeTotalaM } : {}),
      mpDirect: i.mpDirect.trim() ? i.mpDirect.trim() : null,
      panotaj: i.panotaj.filter((p) => p.lungimeM.trim() && Number(p.bucati) > 0).map((p) => ({ lungimeM: p.lungimeM.trim(), bucati: Number(p.bucati) })),
      variantaProfil: i.variantaProfil || null,
    }));
  const cheiInv = new Set(invelitori.map((i) => i.cheie));
  const linii = s.linii
    .filter((l) => l.produs.id && (Number(l.cantitate.replace(",", ".")) > 0 || (l.pozitii && l.pozitii.some((p) => p.lungimeM.trim() && Number(p.bucati) > 0))))
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
  const sipca = s.sipca && linii.some((l) => l.cheie === s.sipca!.linie)
    ? {
        linie: s.sipca.linie,
        model: `${s.sipca.profil}, capăt ${s.sipca.capat}`,
        varianta: s.sipca.varianta,
        ...(s.sipca.varianta === "calcul"
          ? { tronsoane: s.sipca.tronsoane.filter((t) => t.lungimeSipcaM.trim() && t.lungimeTronsonM.trim()).map((t) => ({ lungimeSipcaM: t.lungimeSipcaM.trim(), lungimeTronsonM: t.lungimeTronsonM.trim(), distantaMm: t.distantaMm.trim() || "0" })) }
          : {}),
      }
    : null;
  return {
    grupaPct: s.grupaPct.trim() || "0",
    precizariZonaB: s.precizariZonaB.trim() || null,
    invelitori,
    linii,
    sipca,
    zonaB: s.zonaB.filter((z) => z.denumire.trim() && Number(z.cantitate) > 0).map((z) => ({ ...z, denumire: z.denumire.trim(), um: z.um.trim() || "buc", cantitate: z.cantitate.trim(), sumaLei: z.sumaLei.trim() || "0" })),
  };
}
