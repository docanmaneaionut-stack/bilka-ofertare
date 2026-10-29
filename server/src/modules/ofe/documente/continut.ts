import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Prisma } from "@prisma/client";
import { env } from "../../../env.js";
import { finisajScurt, numarRal, numeModel } from "../../mot/pachete.js";
import type { RezultatOferta } from "../../mot/tipuri.js";
import { desparteTva, la2, la3, la4, z } from "../../mot/zecimal.js";
import type { OfertaCuProduse } from "../intrareMot.js";
import { ani, esc, imagineDataUri, pagina, ro } from "./sablon.js";

// Continutul documentelor (FISA-OFERTARE cap. 13, 3.7, cap. 1, cap. 9; machetele
// din docs/design): oferta (cele trei moduri de prezentare), oferta detaliata
// (panotaj + coloana "Primit"), rezumatul (blocuri numerotate), tabelul de
// facturare (intern, in lei) si anexa "Supliment la oferta" (zona B, doar daca
// exista linii). Datele vin din oferta salvata si din rezultatul motorului (sau
// din cel salvat la "Comandat"). Fara coduri, fara semnatura, fara stampila,
// fara valabilitate.

export type TipDocument = "OFERTA" | "REZUMAT" | "DETALIATA" | "TABEL_FACTURARE";

export const TITLU: Record<TipDocument, string> = { OFERTA: "DEVIZ OFERTĂ", REZUMAT: "REZUMAT OFERTĂ", DETALIATA: "DEVIZ OFERTĂ — DETALIAT", TABEL_FACTURARE: "TABEL DE FACTURARE" };
export const ETICHETA_DOCUMENT: Record<TipDocument, string> = { OFERTA: "Deviz ofertă", REZUMAT: "Rezumat ofertă", DETALIATA: "Deviz ofertă detaliat", TABEL_FACTURARE: "Tabel de facturare" };

export interface Garantie {
  finisaj: string;
  grosime: string | null;
  culoareAni: number | null;
  coroziuneAni: number;
}

export interface ContextDocument {
  firma: { denumire: string; cui: string; nrRegCom: string; adresa: string; localitate: string | null; judet: string | null; telefon: string; email: string; logo: string | null };
  agent: { nume: string; telefon: string | null; email: string };
  client: { nume: string; telefon: string; adresa: string; localitate: string | null };
  numarComplet: string;
  data: string; // dd.mm.yyyy
  versiune: number;
  curenta: boolean;
  garantii: Garantie[];
  // compartimentele (furnizorii) produselor de pe oferta - pentru sigle
  furnizori: string[];
  tvaPct: number;
}

const FOLDER_SIGLE_FURNIZORI = fileURLToPath(new URL("../../../../../docs/design/sigle/", import.meta.url));

type Linie = OfertaCuProduse["linii"][number];
type Calc = RezultatOferta["linii"][number];

interface Banda {
  rubrica: string;
  eticheta: string;
  cheie: { ral: string; finisaj: string; grosime: string | null } | null;
  linii: { l: Linie; c: Calc; invelitoare: OfertaCuProduse["invelitori"][number] | null }[];
}

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

// numele produsului pe document: denumirea din catalog fara coada " – finisaj – grosime" (cheia e pe banda)
export function numeProdus(l: { denumire: string; finisaj: string | null; grosime: string | null }): string {
  let nume = l.denumire;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (l.finisaj) {
    const grosime = l.grosime ? `(\\s*[–-]\\s*${esc(l.grosime)})?` : "";
    nume = nume.replace(new RegExp(`\\s*[–-]\\s*(pluvial\\s+)?${esc(l.finisaj)}${grosime}\\s*$`, "i"), "");
  }
  return nume.trim();
}

function textCheie(c: { ral: string; finisaj: string; grosime: string | null }): string {
  return [[finisajScurt(c.finisaj), c.grosime].filter(Boolean).join(" "), numarRal(c.ral) ? `RAL ${numarRal(c.ral)}` : ""].filter(Boolean).join(" · ");
}

// numele invelitorii: model · finisaj · grosime · RAL (3.7)
export function numeInvelitoare(i: OfertaCuProduse["invelitori"][number]): string {
  const p = { cod: i.cod, denumire: i.denumire, um: i.um, pretBazaEur: "0", grup: i.grup ?? undefined, familie: i.familie ?? undefined };
  return [`${numeModel(p)}${i.variantaProfil ? ` ${i.variantaProfil}` : ""}`, finisajScurt(i.finisaj ?? undefined), i.grosime, numarRal(i.culoare ?? undefined) ? `RAL ${numarRal(i.culoare ?? undefined)}` : ""].filter(Boolean).join(" · ");
}

// liniile ofertei grupate pe benzi: rubrica + cheia de culoare, in ordinea aparitiei;
// invelitorile pe o banda proprie, cate o linie per invelitoare, doar cu suprafata
export function benzi(o: OfertaCuProduse, r: RezultatOferta): Banda[] {
  const calc = new Map(r.linii.map((c) => [c.id, c]));
  const inv = new Map(o.invelitori.map((i) => [i.id, i]));
  const rezultat: Banda[] = [];
  for (const l of o.linii) {
    const c = calc.get(l.id);
    if (!c) continue;
    const esteInv = /^învelitori/i.test(l.rubrica);
    const i = l.invelitoareId ? (inv.get(l.invelitoareId) ?? null) : null;
    const cheie = esteInv ? null : i ? { ral: i.culoare ?? "", finisaj: i.finisaj ?? "", grosime: i.grosime } : l.culoareRal ? { ral: l.culoareRal, finisaj: l.culoareFinisaj ?? l.finisaj ?? "", grosime: l.culoareGrosime ?? l.grosime } : null;
    const eticheta = esteInv ? "Învelitori" : cheie ? `${l.rubrica.replace(/\s*\(.*?\)\s*$/, "")} · ${textCheie(cheie)}` : l.rubrica;
    let banda = rezultat.find((b) => b.eticheta === eticheta);
    if (!banda) {
      banda = { rubrica: l.rubrica, eticheta, cheie, linii: [] };
      rezultat.push(banda);
    }
    banda.linii.push({ l, c, invelitoare: i });
  }
  // invelitorile primele (ordinea clasica a rubricilor), restul in ordinea aparitiei
  return [...rezultat.filter((b) => b.eticheta === "Învelitori"), ...rezultat.filter((b) => b.eticheta !== "Învelitori")];
}

// garantia dupa finisaj x grosime (tabelul de garantii); pluvialul doar pe finisaj
export function garantiePentru(garantii: Garantie[], finisaj: string | null | undefined, grosime: string | null | undefined, pluvial = false): Garantie | null {
  const f = norm(finisajScurt(finisaj ?? undefined));
  if (!f) return null;
  const primulCuvant = f.replace(/\(.*?\)/g, "").trim().split(" ")[0];
  const candidati = garantii.filter((g) => {
    const gf = norm(g.finisaj);
    if (pluvial) return gf.startsWith("pluvial") && gf.replace(/^pluvial\s+/, "").split(" ")[0] === primulCuvant;
    return !gf.startsWith("pluvial") && gf === f;
  });
  if (candidati.length === 0) return null;
  const g = norm(grosime).replace(/\s/g, "");
  return candidati.find((c) => norm(c.grosime).replace(/\s/g, "") === g) ?? candidati.find((c) => c.grosime === null) ?? (pluvial ? candidati[0] : null);
}

export function textGarantie(g: Garantie | null): string | null {
  if (!g) return null;
  if (g.culoareAni === null) return `${ani(g.coroziuneAni)} coroziune`;
  if (g.culoareAni === g.coroziuneAni) return `${ani(g.coroziuneAni)} culoare și coroziune`;
  return `${ani(g.culoareAni)} culoare, ${ani(g.coroziuneAni)} coroziune`;
}

// "Garanții: învelitoare 15 ani culoare și coroziune; sistem pluvial 15 ani culoare, 30 de ani coroziune."
export function randGarantii(o: OfertaCuProduse, ctx: ContextDocument): string | null {
  const parti: string[] = [];
  const vazute = new Set<string>();
  for (const i of o.invelitori) {
    const t = textGarantie(garantiePentru(ctx.garantii, i.finisaj, i.grosime));
    if (t && !vazute.has(`inv|${t}`)) {
      vazute.add(`inv|${t}`);
      parti.push(`învelitoare ${t}`);
    }
  }
  const pluvial = o.linii.filter((l) => /pluvial/i.test(l.rubrica));
  for (const l of pluvial) {
    const t = textGarantie(garantiePentru(ctx.garantii, l.culoareFinisaj ?? l.finisaj, null, true));
    if (t && !vazute.has(`pl|${t}`)) {
      vazute.add(`pl|${t}`);
      parti.push(`sistem pluvial ${t}`);
    }
  }
  const liniiSipci = new Set(o.sipci.map((s) => s.linieId));
  const sipci = o.linii.filter((l) => liniiSipci.has(l.id));
  for (const l of sipci) {
    const t = textGarantie(garantiePentru(ctx.garantii, l.finisaj, l.grosime));
    if (t && !vazute.has(`sip|${t}`)) {
      vazute.add(`sip|${t}`);
      parti.push(`șipcă ${t}`);
    }
  }
  return parti.length ? parti.join("; ") : null;
}

// ------------------------------------------------------------- bucati comune

function antet(ctx: ContextDocument, titlu: string, etichetaNr: string): string {
  const sigla = ctx.firma.logo ? imagineDataUri(path.resolve(env.dateDir, ctx.firma.logo)) : null;
  const furnizori = ctx.furnizori
    .map((f) => {
      const baza = f.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      for (const ext of [".png", ".jpg", ".jpeg", ".svg"]) {
        const u = imagineDataUri(path.join(FOLDER_SIGLE_FURNIZORI, baza + ext));
        if (u) return `<img src="${u}" alt="${esc(f)}">`;
      }
      return "";
    })
    .filter(Boolean)
    .join("");
  const adresaFirma = [ctx.firma.adresa, ctx.firma.localitate, ctx.firma.judet ? `jud. ${ctx.firma.judet}` : ""].filter(Boolean).join(", ");
  const varianta = ctx.versiune > 1 && !ctx.curenta ? ` · varianta ${ctx.versiune}` : ctx.versiune > 1 ? ` · varianta ${ctx.versiune}` : "";
  return `<div class="head">
  <div class="firm"><b>${esc(ctx.firma.denumire)}</b><br>CUI ${esc(ctx.firma.cui)} · ${esc(ctx.firma.nrRegCom)}<br>${esc(adresaFirma)}<br>Tel. ${esc(ctx.firma.telefon)} · ${esc(ctx.firma.email)}</div>
  <div class="logos">${sigla ? `<img class="logo-img" src="${sigla}" alt="sigla">` : ""}${furnizori ? `<div class="suppliers">${furnizori}</div>` : ""}</div>
</div>
<div class="title"><h1>${esc(titlu)}</h1><div class="nr">${esc(etichetaNr)} <b>${esc(ctx.numarComplet)}</b> / ${esc(ctx.data)}${esc(varianta)}</div></div>
<div class="parties">
  <div class="box"><div class="lbl">Client</div><b>${esc(ctx.client.nume)}</b><br>${esc([ctx.client.adresa, ctx.client.localitate].filter(Boolean).join(", "))}<br>Tel. ${esc(ctx.client.telefon)}</div>
  <div class="box"><div class="lbl">Agent</div><b>${esc(ctx.agent.nume)}</b><br>${ctx.agent.telefon ? `Tel. ${esc(ctx.agent.telefon)}<br>` : ""}${esc(ctx.agent.email)}</div>
</div>`;
}

function totaluri(r: RezultatOferta, modPrezentare: string, tvaPct: number, discountGeneralPct: string | null): string {
  const t = r.totaluri;
  const randuri: string[] = [];
  if (modPrezentare === "LISTA_DISCOUNT_GENERAL" && t.totalListaFaraTvaEur) {
    randuri.push(`<div><span>Total listă fără TVA</span><span>${ro(t.totalListaFaraTvaEur)} €</span></div>`);
    randuri.push(`<div><span>Discount general ${discountGeneralPct ? `${ro(discountGeneralPct, 0)} %` : ""}</span><span>− ${ro(t.discountGeneralEur ?? "0")} €</span></div>`);
  }
  randuri.push(`<div><span>Total fără TVA</span><span>${ro(t.documentFaraTvaEur)} €</span></div>`);
  randuri.push(`<div><span>TVA ${ro(tvaPct, 0)} %</span><span>${ro(t.tvaEur)} €</span></div>`);
  randuri.push(`<div class="big"><span>Total cu TVA</span><span>${ro(t.documentCuTvaEur)} €</span></div>`);
  randuri.push(`<div class="lei"><span>Total în lei</span><span>${ro(t.documentTotalLei)} lei</span></div>`);
  return `<div class="totals">${randuri.join("")}</div>`;
}

function subsol(randuri: (string | null)[]): string {
  return `<div class="foot">${randuri.filter((x): x is string => Boolean(x)).map((x) => `<p>${x}</p>`).join("")}</div>`;
}

// anexa "Supliment la oferta" (cap. 9, E07): toate liniile zonei B, in lei, cum au
// fost scrise; pagina noua, numerotata in continuare; doar daca exista linii
function anexa(o: OfertaCuProduse, ctx: ContextDocument, document: string): string {
  if (o.zonaB.length === 0) return "";
  const randuri = o.zonaB
    .map((l) => `<tr><td>${esc(l.denumire)}${l.um || l.cantitate ? `<span style="color:#6a6a6a"> · ${ro(l.cantitate.toString(), 3).replace(/,000$/, "")} ${esc(l.um)}</span>` : ""}</td><td class="r">${ro(l.sumaLei.toString())} lei${l.contineTva ? "" : " (fără TVA)"}</td></tr>`)
    .join("");
  const total = la2(o.zonaB.reduce((s, l) => s.plus(z(l.sumaLei.toString())), z(0)));
  return `<div class="sheet page2">
<div class="title"><h1>SUPLIMENT LA OFERTĂ</h1><div class="nr">la ${esc(document.toLowerCase())} <b>${esc(ctx.numarComplet)}</b> / ${esc(ctx.data)} · ${esc(ctx.client.nume)}</div></div>
<div class="supl"><table>${randuri}<tr><td><b>Total supliment</b></td><td class="r"><b>${ro(total)} lei</b></td></tr></table>
${o.precizariZonaB ? `<div class="precizari">${esc(o.precizariZonaB)}</div>` : ""}
<div class="note">Sumele de mai sus sunt în lei, așa cum au fost stabilite, și nu fac parte din totalul devizului de ofertă.</div></div>
</div>`;
}

const cant = (c: Calc) => ro(c.cantitate, /\./.test(c.cantitate) && !/\.000$/.test(c.cantitate) ? 3 : /^(mp|ml)$/i.test(c.um) ? 3 : 0);

// ------------------------------------------------------------- documentele

export function htmlOferta(o: OfertaCuProduse, r: RezultatOferta, ctx: ContextDocument, detaliata = false): string {
  const mod = o.modPrezentare;
  const perLinie = mod === "DISCOUNT_PER_LINIE";
  const lista = mod === "LISTA_DISCOUNT_GENERAL";
  const colPret = lista ? "Preț listă (€)" : perLinie ? "Preț listă (€)" : "Preț unitar (€)";
  const coloane = 5 + (perLinie ? 2 : 0);
  const cap = `<thead><tr><th class="n">Nr.</th><th>Produs</th><th class="c">UM</th><th class="r q">Cantitate</th><th class="r p">${colPret}</th>${perLinie ? `<th class="r d">Discount</th><th class="r p">Preț net (€)</th>` : ""}<th class="r v">Valoare (€)</th>${detaliata ? `<th class="k">Primit</th>` : ""}</tr></thead>`;
  const randuri: string[] = [];
  let nr = 0;
  const mp = new Map(r.cantitati.invelitori.map((i) => [i.id, i]));
  for (const b of benzi(o, r)) {
    const subtotal = la2(b.linii.reduce((s, x) => s.plus(z(x.c.valoareEur)), z(0)));
    randuri.push(`<tr class="cat"><td colspan="${coloane}">${esc(b.eticheta)}</td><td class="r subv">${ro(subtotal)}</td>${detaliata ? "<td></td>" : ""}</tr>`);
    for (const { l, c, invelitoare } of b.linii) {
      nr += 1;
      const nume = invelitoare && /^învelitori/i.test(l.rubrica) ? numeInvelitoare(invelitoare) : numeProdus(l);
      const pret = lista ? (c.pretListaEur ?? c.pretDocumentEur) : perLinie ? (c.pretListaEur ?? c.pretDocumentEur) : c.pretDocumentEur;
      const celule = [`<td class="n">${nr}</td>`, `<td>${esc(nume)}</td>`, `<td class="c">${esc(c.um)}</td>`, `<td class="r">${cant(c)}</td>`, `<td class="r">${ro(pret)}</td>`];
      if (perLinie) celule.push(`<td class="r">${c.discountPct ? `${ro(c.discountPct, 0)} %` : "—"}</td>`, `<td class="r">${ro(c.pretNetEur ?? c.pretDocumentEur)}</td>`);
      celule.push(`<td class="r">${ro(c.valoareEur)}</td>`);
      if (detaliata) celule.push(`<td class="k"><span class="cb"></span></td>`);
      randuri.push(`<tr>${celule.join("")}</tr>`);
      // detaliata: panotajul sub fiecare invelitoare (lungime x bucati cu mp, total coli, latime, mp)
      if (detaliata && invelitoare && /^învelitori/i.test(l.rubrica) && invelitoare.panotaj.length > 0) {
        const latime = invelitoare.latimeTotalaM.toString();
        const calc = mp.get(invelitoare.id);
        randuri.push(`<tr class="panh"><td colspan="2">Panotaj — lungime coală × bucăți</td><td></td><td class="r">mp</td><td colspan="${coloane - 3}"></td></tr>`);
        for (const p of invelitoare.panotaj) {
          randuri.push(`<tr class="pan"><td colspan="2">${ro(p.lungimeM.toString(), 2)} m × ${p.bucati} buc</td><td></td><td class="r">${ro(la3(z(p.lungimeM.toString()).times(p.bucati).times(z(latime))), 3)}</td><td colspan="${coloane - 4}"></td><td class="k"><span class="cb"></span></td></tr>`);
        }
        randuri.push(`<tr class="pan"><td colspan="2"><b>${calc?.coli ?? invelitoare.panotaj.reduce((s, p) => s + p.bucati, 0)} coli · lățime totală ${ro(latime, 2)} m</b>${calc && calc.mpDirect !== "0.000" ? ` + ${ro(calc.mpDirect, 3)} mp suprafață directă` : ""}</td><td></td><td class="r"><b>${ro(calc?.mp ?? "0", 3)}</b></td><td colspan="${coloane - 3}"></td></tr>`);
      }
    }
  }
  const document = detaliata ? ETICHETA_DOCUMENT.DETALIATA : ETICHETA_DOCUMENT.OFERTA;
  const garantii = randGarantii(o, ctx);
  const corp = `<div class="sheet">
${antet(ctx, detaliata ? TITLU.DETALIATA : TITLU.OFERTA, "Nr.")}
<table class="lines">${cap}<tbody>${randuri.join("")}</tbody></table>
<div class="bottom">
${subsol([garantii ? `<b>Garanții:</b> ${esc(garantii)}.` : null, `<b>Curs EURO – ${ro(r.cursBnr, 4)}</b>`, detaliata ? "Coloana „Primit”: de bifat la recepția mărfii." : null, o.note ? esc(o.note) : null])}
${totaluri(r, mod, ctx.tvaPct, o.discountGeneralPct?.toString() ?? null)}
</div>
</div>
${anexa(o, ctx, document)}`;
  return pagina(`${document} ${ctx.numarComplet}`, corp);
}

// rezumatul (13.4, 3.7): blocuri numerotate - invelitorile cu suprafata si garantia,
// apoi cate un bloc pe banda: "Cuprinde" (familiile), "Total" piese, garantia
export function htmlRezumat(o: OfertaCuProduse, r: RezultatOferta, ctx: ContextDocument): string {
  const blocuri: string[] = [];
  let n = 0;
  const mp = new Map(r.cantitati.invelitori.map((i) => [i.id, i]));
  for (const i of o.invelitori) {
    n += 1;
    const g = textGarantie(garantiePentru(ctx.garantii, i.finisaj, i.grosime));
    blocuri.push(`<div class="block"><div class="bh"><span class="bn">${n}.</span><span class="bt">Învelitoare</span><span class="bs">— ${esc(numeInvelitoare(i))}</span></div>
<div class="bb"><span class="k">Suprafață</span><span class="v"><b>${ro(mp.get(i.id)?.mp ?? "0", 3)} mp</b></span>${g ? `<span class="k">Garanție</span><span class="v">${esc(g)}</span>` : ""}</div></div>`);
  }
  for (const b of benzi(o, r).filter((x) => x.eticheta !== "Învelitori")) {
    n += 1;
    const familii = [...new Set(b.linii.map((x) => (x.l.familie ?? numeProdus(x.l)).toLowerCase()))];
    const ume = new Set(b.linii.map((x) => x.c.um.toLowerCase()));
    const total = b.linii.reduce((s, x) => s.plus(z(x.c.cantitate)), z(0));
    const totalText = ume.size === 1 && ume.has("buc") ? `${ro(total.toString(), 0)} piese` : ume.size === 1 && ume.has("ml") ? `${ro(total.toString(), 3)} ml` : `${ro(total.toString(), 0)} articole (${[...ume].join(", ")})`;
    const pluvial = /pluvial/i.test(b.rubrica);
    const g = b.cheie ? textGarantie(garantiePentru(ctx.garantii, b.cheie.finisaj, b.cheie.grosime, pluvial)) : null;
    const [titlu, spec] = b.eticheta.split(" · ").length > 1 ? [b.eticheta.split(" · ")[0], b.eticheta.split(" · ").slice(1).join(" · ")] : [b.eticheta, ""];
    blocuri.push(`<div class="block"><div class="bh"><span class="bn">${n}.</span><span class="bt">${esc(titlu)}</span>${spec ? `<span class="bs">— ${esc(spec)}</span>` : ""}</div>
<div class="bb"><span class="k">Cuprinde</span><span class="v">${esc(familii.join(", "))}</span><span class="k">Total</span><span class="v"><b>${totalText}</b></span>${g ? `<span class="k">Garanție</span><span class="v">${esc(g)}</span>` : ""}</div></div>`);
  }
  const corp = `<div class="sheet">
${antet(ctx, TITLU.REZUMAT, "Nr.")}
<div class="intro">Vă prezentăm pe scurt materialele cuprinse în oferta noastră:</div>
${blocuri.join("")}
<div class="bottom">
${subsol(["Oferta detaliată, cu cantitățile pe fiecare produs, se predă la confirmarea comenzii.", `<b>Curs EURO – ${ro(r.cursBnr, 4)}</b>`])}
${totaluri(r, o.modPrezentare, ctx.tvaPct, o.discountGeneralPct?.toString() ?? null)}
</div>
</div>
${anexa(o, ctx, ETICHETA_DOCUMENT.REZUMAT)}`;
  return pagina(`${ETICHETA_DOCUMENT.REZUMAT} ${ctx.numarComplet}`, corp);
}

// tabelul de facturare (13.5): intern, in lei la cursul ofertei; materialele +
// liniile zonei B bifate "preia in factura"; preturi unitare la 4 zecimale;
// totalurile din motor (R6: oferta + liniile preluate - E07 19.238,50)
export function htmlTabelFacturare(o: OfertaCuProduse, r: RezultatOferta, ctx: ContextDocument): string {
  const curs = r.cursBnr;
  const randuri: string[] = [];
  let nr = 0;
  for (const b of benzi(o, r)) {
    for (const { l, c, invelitoare } of b.linii) {
      nr += 1;
      const nume = invelitoare && /^învelitori/i.test(l.rubrica) ? numeInvelitoare(invelitoare) : `${numeProdus(l)}${b.cheie ? ` · ${textCheie(b.cheie)}` : ""}`;
      const unitar = la4(z(c.pretNetEur ?? c.pretDocumentEur).times(z(curs)));
      const valoare = la2(z(unitar).times(z(c.cantitate)));
      const tva = la2(z(valoare).times(z(ctx.tvaPct).div(100)));
      randuri.push(`<tr><td class="n">${nr}</td><td>${esc(nume)}</td><td class="c">${esc(c.um)}</td><td class="r">${ro(c.cantitate, 3)}</td><td class="r">${ro(unitar, 4)}</td><td class="r">${ro(valoare)}</td><td class="r">${ro(tva)}</td></tr>`);
    }
  }
  for (const l of r.zonaB?.inFactura ?? []) {
    nr += 1;
    const tva = la2(z(l.leiCuTva).minus(z(l.leiFaraTva)));
    randuri.push(`<tr><td class="n">${nr}</td><td>${esc(l.denumire)}</td><td class="c">${esc(l.um)}</td><td class="r">${ro(l.cantitate, 3)}</td><td class="r">${ro(l.pretUnitarLeiFaraTva, 4)}</td><td class="r">${ro(l.leiFaraTva)}</td><td class="r">${ro(tva)}</td></tr>`);
  }
  const totalLei = r.zonaB ? r.zonaB.tabelFacturare.totalLei : r.totaluri.documentTotalLei;
  const { faraTva, tva } = desparteTva(totalLei, ctx.tvaPct);
  const corp = `<div class="sheet">
${antet(ctx, TITLU.TABEL_FACTURARE, "pentru oferta")}
<div class="intern">Document intern, pentru contabilitate — cantitățile și prețurile de facturat, în lei, la cursul ofertei (${ro(curs, 4)}). Date de facturare: cele ale clientului, dacă în comandă nu sunt altele.</div>
<table class="lines">
<thead><tr><th class="n">Nr.</th><th>Denumire</th><th class="c">UM</th><th class="r q">Cantitate</th><th class="r p">Preț unitar (lei)</th><th class="r v">Valoare (lei)</th><th class="r v">TVA ${ro(ctx.tvaPct, 0)} % (lei)</th></tr></thead>
<tbody>${randuri.join("")}</tbody></table>
<div class="bottom"><div class="foot"><p>Totalurile sunt cele ale ofertei${r.zonaB ? " plus liniile preluate din supliment" : ""}; conversia pe linie poate diferi cu câțiva bani (13.5).</p></div>
<div class="totals">
  <div><span>Total fără TVA</span><span>${ro(faraTva)} lei</span></div>
  <div><span>TVA ${ro(ctx.tvaPct, 0)} %</span><span>${ro(tva)} lei</span></div>
  <div class="big"><span>Total de facturat</span><span>${ro(totalLei)} lei</span></div>
</div></div>
</div>`;
  return pagina(`${ETICHETA_DOCUMENT.TABEL_FACTURARE} ${ctx.numarComplet}`, corp);
}

export function htmlDocument(tip: TipDocument, o: OfertaCuProduse, r: RezultatOferta, ctx: ContextDocument): string {
  switch (tip) {
    case "OFERTA":
      return htmlOferta(o, r, ctx, false);
    case "DETALIATA":
      return htmlOferta(o, r, ctx, true);
    case "REZUMAT":
      return htmlRezumat(o, r, ctx);
    default:
      return htmlTabelFacturare(o, r, ctx);
  }
}

export type GarantieDb = Prisma.GarantieFinisajGrosimeGetPayload<{ select: { finisaj: true; grosime: true; garantieCuloareAni: true; garantieCoroziuneAni: true } }>;
export function garantiiDinDb(randuri: GarantieDb[]): Garantie[] {
  return randuri.map((g) => ({ finisaj: g.finisaj, grosime: g.grosime, culoareAni: g.garantieCuloareAni, coroziuneAni: g.garantieCoroziuneAni }));
}
