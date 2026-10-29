import { citesteIntrari, continutIntrare, gasesteIntrare, type IntrareZip } from "./zip.js";

// Sablonul formularului de comanda Bilka (S16b, docs/FORMULAR-BILKA-HARTA.md):
// harta celulelor se deriva din sablonul incarcat la fiecare generare - din
// numele definite (workbook.xml), din foaia SetariOferta (configuratia
// macro-urilor), din validarile foilor (listele derulante pe rand) si din
// listele AUX / AUX1 la care trimit. Nimic din harta nu sta in cod: un sablon
// caruia ii lipseste un nume asteptat opreste generarea cu mesaj clar.

export class EroareSablon extends Error {}

export interface Celula {
  t: string | undefined;
  v: string | undefined;
  f: string | undefined;
}

export interface Slot {
  lungime: string;
  coli: string;
}

export interface BlocInvelitoare {
  tip?: string;
  model: string;
  modul?: string;
  membrana?: string;
  finisaj: string;
  culoare: string;
  grosime: string;
  sloturi: Slot[];
}

export interface RandAccesoriu {
  rand: number;
  coloanaNume: string;
  coloanaCantitate: string;
  numeImplicit: string;
  // numele acceptate de lista derulanta a randului, normalizate ("" cand randul nu are lista)
  lista: string[];
}

export interface BlocPluvial {
  foaie: string;
  celulaCuloare: string | null;
  culori: { text: string; ral: string }[];
}

export interface HartaFormular {
  foaie: { comanda: string; pluvial: string; magnelis: string; speciale: string };
  antet: { numarOferta: string; localitate: string; telefon: string; mesajProductie: string };
  principala: BlocInvelitoare;
  secundara: BlocInvelitoare;
  sipca: BlocInvelitoare;
  accesorii: RandAccesoriu[];
  // numele acceptate de macro (SetariOferta J): normalizat -> exact
  numeAcceptate: Map<string, string>;
  pluvial: Map<string, { foaie: string; celulaCantitate: string; bloc: "SP" | "SM" | "SN" }>;
  blocuriPluvial: Record<"SP" | "SM" | "SN", BlocPluvial>;
  speciale: { foaie: string; randuri: number[]; coloane: { cod: string; finisaj: string; culoare: string; grosime: string; lungime: string; bucati: string } };
  liste: {
    finisaje: string[];
    grosimi: string[];
    membrane: string[];
    tipuri: string[];
    modelePeTip: Map<string, string[]>;
    modeleSipca: string[];
    modulePeModel: (model: string) => string[];
    culoriPeFinisaj: (finisaj: string) => string[];
  };
}

// normalizarea numelor la potrivire: spatiile (inclusiv cele fixe) nu conteaza, nici majusculele
export function normNume(t: string): string {
  return t.normalize("NFC").replace(/ /g, " ").replace(/\s+/g, " ").trim().toUpperCase();
}

const dezescapeaza = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, c: string) => String.fromCharCode(Number(c)));

export function coloanaDinLitere(litere: string): number {
  let n = 0;
  for (const ch of litere) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

export function litereDinColoana(n: number): string {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function desfaAdresa(adresa: string): { col: string; rand: number } {
  const m = /^\$?([A-Z]+)\$?(\d+)$/.exec(adresa);
  if (!m) throw new EroareSablon(`Adresă de celulă neașteptată: ${adresa}`);
  return { col: m[1], rand: Number(m[2]) };
}

interface Ref {
  foaie: string;
  de: string;
  la: string;
}

// "'FORMULAR COMANDA'!$P$17" / "SetariOferta!$O$2:$O$29" -> foaia si celulele (fara $)
function desfaRef(ref: string): Ref | null {
  const m = /^(?:'((?:[^']|'')+)'|([^'!]+))!\$?([A-Z]+)\$?(\d+)(?::\$?([A-Z]+)\$?(\d+))?$/.exec(ref.trim());
  if (!m) return null;
  const foaie = (m[1] ?? m[2]).replace(/''/g, "'");
  const de = `${m[3]}${m[4]}`;
  return { foaie, de, la: m[5] ? `${m[5]}${m[6]}` : de };
}

function* celuleleIntervalului(r: Ref): Generator<string> {
  const a = desfaAdresa(r.de);
  const b = desfaAdresa(r.la);
  const c1 = coloanaDinLitere(a.col);
  const c2 = coloanaDinLitere(b.col);
  for (let rand = a.rand; rand <= b.rand; rand++) for (let c = c1; c <= c2; c++) yield `${litereDinColoana(c)}${rand}`;
}

function inInterval(adresa: string, sqref: string): boolean {
  const { col, rand } = desfaAdresa(adresa);
  const c = coloanaDinLitere(col);
  for (const parte of sqref.trim().split(/\s+/)) {
    const [de, la = de] = parte.split(":");
    const a = desfaAdresa(de);
    const b = desfaAdresa(la);
    if (rand >= a.rand && rand <= b.rand && c >= coloanaDinLitere(a.col) && c <= coloanaDinLitere(b.col)) return true;
  }
  return false;
}

export interface Validare {
  sqref: string;
  formula: string;
}

export class Sablon {
  readonly intrari: IntrareZip[];
  readonly foi = new Map<string, string>();
  readonly numeDefinite = new Map<string, string>();
  readonly siruri: string[];
  readonly harta: HartaFormular;
  readonly modificatLa: string | null;
  private readonly cacheXml = new Map<string, string>();
  private readonly cacheCelule = new Map<string, Map<string, Celula>>();
  private readonly cacheValidari = new Map<string, Validare[]>();

  constructor(readonly buf: Buffer) {
    this.intrari = citesteIntrari(buf);
    const workbook = this.xml("xl/workbook.xml");
    const rels = this.xml("xl/_rels/workbook.xml.rels");
    const tinte = new Map<string, string>();
    for (const m of rels.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
      const id = /\bId="([^"]*)"/.exec(m[1])?.[1];
      const tinta = /\bTarget="([^"]*)"/.exec(m[1])?.[1];
      if (id && tinta) tinte.set(id, tinta.startsWith("/") ? tinta.slice(1) : `xl/${tinta}`);
    }
    for (const m of workbook.matchAll(/<sheet\b([^>]*)\/?>/g)) {
      const nume = /\bname="([^"]*)"/.exec(m[1])?.[1];
      const rid = /\br:id="([^"]*)"/.exec(m[1])?.[1];
      if (nume && rid && tinte.has(rid)) this.foi.set(dezescapeaza(nume), tinte.get(rid)!);
    }
    for (const m of workbook.matchAll(/<definedName\b([^>]*)>([^<]*)<\/definedName>/g)) {
      const nume = /\bname="([^"]*)"/.exec(m[1])?.[1];
      if (!nume || /localSheetId=/.test(m[1])) continue;
      if (!this.numeDefinite.has(nume)) this.numeDefinite.set(nume, dezescapeaza(m[2]));
    }
    const ss = this.xml("xl/sharedStrings.xml");
    this.siruri = [...ss.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => dezescapeaza([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")));
    const core = this.xml("docProps/core.xml");
    this.modificatLa = /<dcterms:modified[^>]*>([^<]+)</.exec(core)?.[1]?.slice(0, 10) ?? null;
    this.harta = this.deriveazaHarta();
  }

  xml(nume: string): string {
    const gata = this.cacheXml.get(nume);
    if (gata !== undefined) return gata;
    const e = gasesteIntrare(this.intrari, nume);
    const text = e ? continutIntrare(this.buf, e).toString("utf8") : "";
    this.cacheXml.set(nume, text);
    return text;
  }

  fisierFoaie(nume: string): string {
    const f = this.foi.get(nume);
    if (!f) throw new EroareSablon(`Șablonul nu are foaia „${nume}”`);
    return f;
  }

  // celulele unei foi (fisier): adresa -> tip, valoare (sirurile partajate rezolvate), formula
  celule(fisier: string): Map<string, Celula> {
    const gata = this.cacheCelule.get(fisier);
    if (gata) return gata;
    const x = this.xml(fisier);
    const map = new Map<string, Celula>();
    for (const c of x.matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const t = / t="([^"]*)"/.exec(c[2])?.[1];
      const inner = c[3] ?? "";
      const f = /<f[^>]*>([\s\S]*?)<\/f>/.exec(inner)?.[1];
      let v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
      if (t === "s" && v !== undefined) v = this.siruri[Number(v)];
      else if (t === "inlineStr") v = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join("");
      map.set(c[1], { t, v: v !== undefined ? dezescapeaza(v) : undefined, f: f !== undefined ? dezescapeaza(f) : /<f[^>]*\/>/.test(inner) ? "" : undefined });
    }
    this.cacheCelule.set(fisier, map);
    return map;
  }

  valoare(foaie: string, adresa: string): string | undefined {
    return this.celule(this.fisierFoaie(foaie)).get(adresa)?.v;
  }

  // valorile (nevide) dintr-un interval "Foaie!$A$1:$A$9"
  valoriInterval(ref: string): string[] {
    const r = desfaRef(ref);
    if (!r) return [];
    const celule = this.celule(this.fisierFoaie(r.foaie));
    const out: string[] = [];
    for (const a of celuleleIntervalului(r)) {
      const v = celule.get(a)?.v;
      if (v !== undefined && v !== "") out.push(v);
    }
    return out;
  }

  // o lista derulanta: numele definit sau intervalul din formula -> valorile ei
  rezolvaLista(formula: string): string[] {
    const f = formula.trim();
    if (/^INDIRECT\(/i.test(f)) return [];
    const ref = this.numeDefinite.get(f) ?? f;
    return this.valoriInterval(ref);
  }

  validari(fisier: string): Validare[] {
    const gata = this.cacheValidari.get(fisier);
    if (gata) return gata;
    const x = this.xml(fisier);
    const lista: Validare[] = [];
    for (const m of x.matchAll(/<dataValidation\b([^>]*)>([\s\S]*?)<\/dataValidation>/g)) {
      const sqref = /\bsqref="([^"]*)"/.exec(m[1])?.[1];
      const formula = /<formula1>([^<]*)<\/formula1>/.exec(m[2])?.[1];
      if (sqref && formula) lista.push({ sqref, formula: dezescapeaza(formula) });
    }
    for (const m of x.matchAll(/<x14:dataValidation\b[^>]*>([\s\S]*?)<\/x14:dataValidation>/g)) {
      const sqref = /<xm:sqref>([^<]*)<\/xm:sqref>/.exec(m[1])?.[1];
      const formula = /<xm:f>([^<]*)<\/xm:f>/.exec(m[1])?.[1];
      if (sqref && formula) lista.push({ sqref, formula: dezescapeaza(formula) });
    }
    this.cacheValidari.set(fisier, lista);
    return lista;
  }

  validareaCelulei(fisier: string, adresa: string): Validare | undefined {
    return this.validari(fisier).find((v) => inInterval(adresa, v.sqref));
  }

  private celulaNumita(nume: string): { foaie: string; fisier: string; adresa: string } {
    const ref = this.numeDefinite.get(nume);
    const r = ref ? desfaRef(ref) : null;
    if (!r) throw new EroareSablon(`Șablonul nu are numele definit „${nume}” (sau nu trimite la o celulă)`);
    return { foaie: r.foaie, fisier: this.fisierFoaie(r.foaie), adresa: r.de };
  }

  private deriveazaHarta(): HartaFormular {
    const lipsa = [
      "_OFERTA_NUMAR_OFERTA", "_OFERTA_LOCALITATE", "_OFERTA_CONTACT_LIVRARE", "_OFERTA_TEXT_PRODUCTIE",
      "_FC_FINISAJ", "_FC_CULOARE", "_FC_GROSIME", "_FC_INVELITOARE_RL", "_FC_MODEL",
      "_FC_FINISAJ2", "_FC_CULOARE2", "_FC_GROSIME2", "_FC_INVELITOARE_RL2",
      "_SIPCA_FINISAJ", "_SIPCA_CULOARE", "_SIPCA_GROSIME", "_SIPCA_RL",
      "_FC_ACCESORII_RL", "_FC_ACCESORII_TAB_CANT_NUME", "_FC_TAB_LISTA_ACCESORII",
      "_SPC_TAB_CANTITATE_IERARHIE", "_SPC_TAB_CULORI", "_OFERTA_CULOARE_SP", "_OFERTA_CULOARE_SM", "_OFERTA_CULOARE_SA",
      "_ASP_RL", "_ASP_RC", "_AML_CC", "Listafinisaj", "Listamodelsipca", "TipInvelitoare",
    ].filter((n) => !this.numeDefinite.has(n));
    if (lipsa.length > 0) throw new EroareSablon(`Șablonul nu are numele definite așteptate: ${lipsa.join(", ")} — nu este formularul de comandă Bilka (v10) sau structura s-a schimbat`);

    const numar = this.celulaNumita("_OFERTA_NUMAR_OFERTA");
    const comanda = numar.fisier;
    const numeComanda = numar.foaie;
    const validariComanda = this.validari(comanda);
    const celuleComanda = this.celule(comanda);
    const adresaIn = (nume: string, fisier = comanda) => {
      const c = this.celulaNumita(nume);
      if (c.fisier !== fisier) throw new EroareSablon(`Numele „${nume}” nu e pe foaia așteptată`);
      return c.adresa;
    };

    // foaia AUX1: cea la care trimite _FC_MODEL; sloturile = formulele ei "'FORMULAR COMANDA'!D27"
    const aux1 = this.celulaNumita("_FC_MODEL").fisier;
    const celuleAux1 = this.celule(aux1);
    const sloturiDin = (numeRL: string): Slot[] => {
      const randuri = this.valoriInterval(this.numeDefinite.get(numeRL)!).map(Number).filter((n) => Number.isInteger(n) && n > 0);
      const sloturi: Slot[] = [];
      for (const rand of randuri) {
        const fa = celuleAux1.get(`A${rand}`)?.f ?? "";
        const fb = celuleAux1.get(`B${rand}`)?.f ?? "";
        const a = desfaRef(fa.replace(/^=/, ""));
        const b = desfaRef(fb.replace(/^=/, ""));
        if (!a || !b || a.foaie !== numeComanda || b.foaie !== numeComanda) throw new EroareSablon(`Slotul de pe rândul ${rand} din AUX1 nu trimite la FORMULAR COMANDA (${numeRL})`);
        sloturi.push({ lungime: a.de, coli: b.de });
      }
      if (sloturi.length === 0) throw new EroareSablon(`Niciun slot lungime × coli pentru ${numeRL}`);
      return sloturi;
    };

    const tipuriCelule = validariComanda.filter((v) => v.formula === "TipInvelitoare").flatMap((v) => v.sqref.split(/\s+/));
    const primaCelula = (sqref: string) => sqref.split(/\s+/)[0].split(":")[0];
    const blocInvelitoare = (sufix: "" | "2", numeRL: string): BlocInvelitoare => {
      const finisaj = adresaIn(`_FC_FINISAJ${sufix}`);
      const randAntet = desfaAdresa(finisaj).rand - 2;
      const tip = tipuriCelule.find((c) => desfaAdresa(c).rand === randAntet);
      if (!tip) throw new EroareSablon(`Nu găsesc celula tipului învelitorii pe rândul ${randAntet}`);
      // in sablon, lista modelului secundarei depinde tot de tipul principalei
      // (INDIRECT(H22) pe E23 si pe E36), deci cautam orice INDIRECT(<celula de tip>)
      const indirectSpre = (v: Validare, coloane: string[]) => {
        const m = /^INDIRECT\(\$?([A-Z]+)\$?(\d+)\)$/i.exec(v.formula.trim());
        return m !== null && coloane.includes(m[1]);
      };
      const model = validariComanda
        .filter((v) => indirectSpre(v, tipuriCelule.map((c) => desfaAdresa(c).col)))
        .flatMap((v) => v.sqref.split(/\s+/).map((s) => s.split(":")[0]))
        .find((c) => desfaAdresa(c).rand === randAntet + 1);
      if (!model) throw new EroareSablon(`Nu găsesc celula modelului învelitorii (INDIRECT(${tip}))`);
      const modul = validariComanda
        .filter((v) => indirectSpre(v, [desfaAdresa(model).col]))
        .flatMap((v) => v.sqref.split(/\s+/).map((s) => s.split(":")[0]))
        .find((c) => desfaAdresa(c).rand === randAntet);
      const membrana = validariComanda
        .filter((v) => this.rezolvaLista(v.formula).some((x) => normNume(x) === "FARA MEMBRANA"))
        .flatMap((v) => v.sqref.split(/\s+/).map((s) => s.split(":")[0]))
        .find((c) => desfaAdresa(c).rand === randAntet);
      return { tip, model, modul, membrana, finisaj, culoare: adresaIn(`_FC_CULOARE${sufix}`), grosime: adresaIn(`_FC_GROSIME${sufix}`), sloturi: sloturiDin(numeRL) };
    };
    const principala = blocInvelitoare("", "_FC_INVELITOARE_RL");
    const secundara = blocInvelitoare("2", "_FC_INVELITOARE_RL2");
    const modelSipca = validariComanda.find((v) => v.formula === "Listamodelsipca");
    if (!modelSipca) throw new EroareSablon("Nu găsesc celula modelului de șipcă (Listamodelsipca)");
    const sipca: BlocInvelitoare = { model: primaCelula(modelSipca.sqref), finisaj: adresaIn("_SIPCA_FINISAJ"), culoare: adresaIn("_SIPCA_CULOARE"), grosime: adresaIn("_SIPCA_GROSIME"), sloturi: sloturiDin("_SIPCA_RL") };

    // accesoriile: randurile si perechile (coloana cantitate, coloana nume) din SetariOferta
    const randuriAcc = this.valoriInterval(this.numeDefinite.get("_FC_ACCESORII_RL")!).map(Number).filter((n) => Number.isInteger(n) && n > 0);
    const tabCantNume = desfaRef(this.numeDefinite.get("_FC_ACCESORII_TAB_CANT_NUME")!);
    if (!tabCantNume) throw new EroareSablon("_FC_ACCESORII_TAB_CANT_NUME nu e un interval");
    const setari = this.celule(this.fisierFoaie(tabCantNume.foaie));
    const perechi: { cant: string; nume: string }[] = [];
    {
      const a = desfaAdresa(tabCantNume.de);
      const b = desfaAdresa(tabCantNume.la);
      const colCant = a.col;
      const colNume = litereDinColoana(coloanaDinLitere(a.col) + 1);
      for (let r = a.rand; r <= b.rand; r++) {
        const cant = Number(setari.get(`${colCant}${r}`)?.v);
        const nume = Number(setari.get(`${colNume}${r}`)?.v);
        if (cant > 0 && nume > 0) perechi.push({ cant: litereDinColoana(cant), nume: litereDinColoana(nume) });
      }
    }
    if (perechi.length === 0 || randuriAcc.length === 0) throw new EroareSablon("Configurația rândurilor de accesorii (SetariOferta) e goală");
    const accesorii: RandAccesoriu[] = [];
    for (const rand of randuriAcc) {
      for (const p of perechi) {
        const adresaNume = `${p.nume}${rand}`;
        const val = this.validareaCelulei(comanda, adresaNume);
        accesorii.push({ rand, coloanaNume: p.nume, coloanaCantitate: p.cant, numeImplicit: celuleComanda.get(adresaNume)?.v ?? "", lista: val ? this.rezolvaLista(val.formula).map(normNume) : [] });
      }
    }
    const listaNume = desfaRef(this.numeDefinite.get("_FC_TAB_LISTA_ACCESORII")!);
    if (!listaNume) throw new EroareSablon("_FC_TAB_LISTA_ACCESORII nu e un interval");
    const numeAcceptate = new Map<string, string>();
    for (const n of this.valoriInterval(`'${listaNume.foaie}'!${listaNume.de}:${desfaAdresa(listaNume.de).col}${desfaAdresa(listaNume.la).rand}`)) {
      const k = normNume(n);
      if (!numeAcceptate.has(k)) numeAcceptate.set(k, n);
    }

    // pluvialul: codul de ierarhie = numele definit al celulei de pret; cantitatea pe coloana din SetariOferta
    const tabCant = desfaRef(this.numeDefinite.get("_SPC_TAB_CANTITATE_IERARHIE")!);
    const colCantitate = litereDinColoana(Number(tabCant ? this.celule(this.fisierFoaie(tabCant.foaie)).get(tabCant.de)?.v : 0));
    if (!colCantitate) throw new EroareSablon("_SPC_TAB_CANTITATE_IERARHIE nu dă coloana de cantitate");
    // piesele: orice nume definit (cod de ierarhie, 11 caractere) care trimite la o
    // singura celula din coloana de pret a foilor de pluvial; blocul (lucios / mat /
    // Magnelis) vine din foaie si din pozitia celulei de culoare a blocului
    const colIerarhie = litereDinColoana(Number(tabCant ? this.celule(this.fisierFoaie(tabCant.foaie)).get(`${litereDinColoana(coloanaDinLitere(desfaAdresa(tabCant.de).col) + 1)}${desfaAdresa(tabCant.de).rand}`)?.v : 0));
    const culoareSP = this.celulaNumita("_OFERTA_CULOARE_SP");
    const culoareSM = this.celulaNumita("_OFERTA_CULOARE_SM");
    const culoareSA = this.celulaNumita("_OFERTA_CULOARE_SA");
    const pluvial = new Map<string, { foaie: string; celulaCantitate: string; bloc: "SP" | "SM" | "SN" }>();
    for (const [nume, ref] of this.numeDefinite) {
      if (!/^[A-Z0-9]{11}$/.test(nume)) continue;
      const r = desfaRef(ref);
      if (!r || r.de !== r.la) continue;
      const fisier = this.foi.get(r.foaie);
      if (!fisier || (fisier !== culoareSP.fisier && fisier !== culoareSA.fisier)) continue;
      const { col, rand } = desfaAdresa(r.de);
      if (col !== colIerarhie) continue;
      let bloc: "SP" | "SM" | "SN";
      if (fisier === culoareSA.fisier && culoareSA.fisier !== culoareSP.fisier) bloc = "SN";
      else if (culoareSM.fisier === fisier && rand >= desfaAdresa(culoareSM.adresa).rand) bloc = "SM";
      else bloc = "SP";
      pluvial.set(nume, { foaie: fisier, celulaCantitate: `${colCantitate}${rand}`, bloc });
    }
    if (pluvial.size === 0) throw new EroareSablon("Șablonul nu are numele definite ale pieselor de pluvial");
    const tabCulori = desfaRef(this.numeDefinite.get("_SPC_TAB_CULORI")!)!;
    const culoriToate: { text: string; ral: string }[] = [];
    {
      const cs = this.celule(this.fisierFoaie(tabCulori.foaie));
      const a = desfaAdresa(tabCulori.de);
      const b = desfaAdresa(tabCulori.la);
      const colRal = litereDinColoana(coloanaDinLitere(a.col) + 1);
      for (let r = a.rand; r <= b.rand; r++) {
        const text = cs.get(`${a.col}${r}`)?.v;
        const ral = cs.get(`${colRal}${r}`)?.v;
        if (text && ral) culoriToate.push({ text, ral: String(ral) });
      }
    }
    const blocPluvial = (numeCuloare: string, cuLista: boolean): BlocPluvial => {
      const c = this.celulaNumita(numeCuloare);
      if (!cuLista) return { foaie: c.fisier, celulaCuloare: null, culori: [] };
      const val = this.validareaCelulei(c.fisier, c.adresa);
      const texte = val ? this.rezolvaLista(val.formula).map(normNume) : [];
      return { foaie: c.fisier, celulaCuloare: c.adresa, culori: culoriToate.filter((x) => texte.includes(normNume(x.text))) };
    };
    const blocuriPluvial = { SP: blocPluvial("_OFERTA_CULOARE_SP", true), SM: blocPluvial("_OFERTA_CULOARE_SM", true), SN: blocPluvial("_OFERTA_CULOARE_SA", false) };
    const pluvialFile = blocuriPluvial.SP.foaie;
    const magnelisFile = blocuriPluvial.SN.foaie;

    // accesoriile speciale la lungimi: foaia si coloanele
    const aml = desfaRef(this.numeDefinite.get("_AML_CC")!);
    if (!aml) throw new EroareSablon("_AML_CC nu e un interval");
    const specialeFile = this.fisierFoaie(aml.foaie);
    const randuriSpec = this.valoriInterval(this.numeDefinite.get("_ASP_RL")!).map(Number).filter((n) => Number.isInteger(n) && n > 0);
    const colBucati = litereDinColoana(Number(this.valoriInterval(this.numeDefinite.get("_ASP_RC")!)[0]));
    const valSpec = this.validari(specialeFile);
    const primulRand = randuriSpec[0];
    const colDin = (gaseste: (v: Validare) => boolean, ce: string) => {
      const v = valSpec.find((x) => gaseste(x) && x.sqref.split(/\s+/).some((s) => inInterval(`${desfaAdresa(s.split(":")[0]).col}${primulRand}`, s)));
      if (!v) throw new EroareSablon(`Nu găsesc coloana „${ce}” pe foaia accesoriilor speciale`);
      // celulele unite (F:G, B:E) apar in validare pe mai multe parti: luam coloana cea mai din stanga
      const coloane = v.sqref
        .split(/\s+/)
        .filter((s) => desfaAdresa(s.split(":")[0]).rand <= primulRand && desfaAdresa(s.split(":")[1] ?? s).rand >= primulRand)
        .map((s) => coloanaDinLitere(desfaAdresa(s.split(":")[0]).col));
      return litereDinColoana(Math.min(...coloane));
    };
    const colCod = colDin((v) => this.rezolvaLista(v.formula).some((x) => /^ACCESORIU SPECIAL D\d\d$/i.test(x)), "cod (treapta)");
    const colFinisaj = colDin((v) => this.rezolvaLista(v.formula).some((x) => normNume(x) === "LUCIOS"), "finisaj");
    const colCuloare = colDin((v) => /^INDIRECT\(\$?[A-Z]+\$?\d+\)$/i.test(v.formula.trim()), "culoare");
    const colGrosime = colDin((v) => this.rezolvaLista(v.formula).some((x) => /^0[.,]50$/.test(x)), "grosime");
    const celuleSpec = this.celule(specialeFile);
    let colLungime: string | undefined;
    for (const [adresa, c] of celuleSpec) {
      if (desfaAdresa(adresa).rand !== primulRand || !c.f) continue;
      const m = new RegExp(`^([A-Z]+)${primulRand}\\*([A-Z]+)${primulRand}$`).exec(c.f.replace(/^=/, ""));
      if (m && (m[1] === colBucati || m[2] === colBucati)) colLungime = m[1] === colBucati ? m[2] : m[1];
    }
    if (!colLungime) throw new EroareSablon("Nu găsesc coloana lungimii pe foaia accesoriilor speciale (formula total ml)");

    // listele
    const tipuri = this.rezolvaLista("TipInvelitoare").filter((t) => this.numeDefinite.has(t));
    const modelePeTip = new Map(tipuri.map((t) => [t, this.rezolvaLista(t)]));
    const grosimiVal = this.validareaCelulei(comanda, principala.grosime);
    const membraneVal = principala.membrana ? this.validareaCelulei(comanda, principala.membrana) : undefined;
    return {
      foaie: { comanda, pluvial: pluvialFile, magnelis: magnelisFile, speciale: specialeFile },
      antet: { numarOferta: numar.adresa, localitate: adresaIn("_OFERTA_LOCALITATE"), telefon: adresaIn("_OFERTA_CONTACT_LIVRARE"), mesajProductie: adresaIn("_OFERTA_TEXT_PRODUCTIE") },
      principala,
      secundara,
      sipca,
      accesorii,
      numeAcceptate,
      pluvial,
      blocuriPluvial,
      speciale: { foaie: specialeFile, randuri: randuriSpec, coloane: { cod: colCod, finisaj: colFinisaj, culoare: colCuloare, grosime: colGrosime, lungime: colLungime, bucati: colBucati } },
      liste: {
        finisaje: this.rezolvaLista("Listafinisaj"),
        grosimi: grosimiVal ? this.rezolvaLista(grosimiVal.formula) : [],
        membrane: membraneVal ? this.rezolvaLista(membraneVal.formula) : [],
        tipuri,
        modelePeTip,
        modeleSipca: this.rezolvaLista("Listamodelsipca"),
        modulePeModel: (model) => (this.numeDefinite.has(model) ? this.rezolvaLista(model) : []),
        culoriPeFinisaj: (finisaj) => (this.numeDefinite.has(finisaj) ? this.rezolvaLista(finisaj) : []),
      },
    };
  }
}

export function citesteSablon(buf: Buffer): Sablon {
  return new Sablon(buf);
}
