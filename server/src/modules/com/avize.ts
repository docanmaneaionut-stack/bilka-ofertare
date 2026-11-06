import fs from "node:fs/promises";
import path from "node:path";
import { Prisma, type Utilizator } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { env } from "../../env.js";
import type { RezultatOferta } from "../mot/tipuri.js";
import { la3, z as zec } from "../mot/zecimal.js";
import { antet, benzi, numeInvelitoare, numeProdus } from "../ofe/documente/continut.js";
import { contextDocument } from "../ofe/documente/index.js";
import { randeazaPdf } from "../ofe/documente/pdf.js";
import { esc, pagina, ro } from "../ofe/documente/sablon.js";
import { includeProduse, type OfertaCuProduse } from "../ofe/intrareMot.js";
import { comandaVizibila, EroareComanda, scrieIstoricComanda } from "./comenzi.js";
import { CSS_COMENZI, dataDoar, dataLocala, dataRoDinIso, marcaFisier, paginiPdf } from "./sablonComenzi.js";
import { poateGeneraAviz } from "./vizibilitate.js";

// Avizul de insotire a marfii (S23; FISA-COMENZI cap. 9, macheta docs/design/macheta-aviz.html):
// documentul de livrare, generat din comanda ("Doc.") sau din fisa soferului, de orice cont care
// vede comanda in afara colaboratorului (CONTURI §2-3). Continutul = detaliata fara valori, din
// rezultatul salvat la "Comandat": categoriile in ordinea clasica, produsul, UM, cantitatea,
// panotajul sub invelitoare (lungime x bucati, mp, total coli), o casuta de bifat pe fiecare rand
// si pe fiecare lungime, totalul in cuvinte, casetele "Predat" / "Am receptionat marfa"; ambele
// exemplare in acelasi PDF, fiecare pe pagina lui. Un aviz per livrare: cantitatile propuse =
// restul de livrat (comandat minus avizele anterioare), orice valoare pana la cea comandata,
// liniile cu zero lipsesc, "livrare partiala" cand nu pleaca tot. Identificat prin numarul
// comenzii + data livrarii; fara serie fiscala, fara preturi, fara datele soferului / masinii.
// Nu se anuleaza si nu se sterge: un aviz gresit se inlocuieste cu altul, amandoua raman.
// Avizul nu schimba statusul logistic.

export const avizeRouter = Router({ mergeParams: true });

const cantitate = z
  .string()
  .trim()
  .regex(/^\d+([.,]\d{1,3})?$/, "cantitate cu cel mult trei zecimale")
  .transform((s) => s.replace(",", "."));
export const schemaAviz = z.object({
  dataLivrarii: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dată în forma AAAA-LL-ZZ"),
  // lipsa ambelor liste = cantitatile propuse (restul de livrat); altfel, ce nu e trecut = 0
  linii: z.array(z.object({ linieId: z.string().min(1), cantitate })).optional(),
  pozitii: z.array(z.object({ pozitieId: z.string().min(1), bucati: z.number().int().min(0) })).optional(),
});

const idDin = (req: { params: Record<string, unknown> }) => String(req.params.id ?? "");

export const includeAviz = { linii: { orderBy: { ordine: "asc" as const } } } satisfies Prisma.ComandaAvizInclude;
type AvizCuLinii = Prisma.ComandaAvizGetPayload<{ include: typeof includeAviz }>;

export function spreAviz(a: AvizCuLinii) {
  return {
    id: a.id,
    numar: a.numar,
    dataLivrarii: dataDoar(a.dataLivrarii),
    partial: a.partial,
    coli: a.coli,
    piese: a.piese.toFixed(3),
    generatDe: a.numeGeneratLaMoment,
    moment: a.moment,
    documentId: a.documentId,
    linii: a.linii.map((l) => ({ id: l.id, linieId: l.linieId, pozitieId: l.pozitieId, cod: l.cod, denumire: l.denumire, um: l.um, cantitate: l.cantitate.toFixed(3), lungimeM: l.lungimeM?.toFixed(2) ?? null, bucati: l.bucati })),
  };
}

// o linie a comenzii in ordinea documentului (benzile detaliatei), cu panotajul invelitorii
interface LinieDoc {
  linieId: string;
  cod: string;
  denumire: string;
  um: string;
  banda: string;
  rubrica: string;
  cantitateComandata: string;
  invelitoare: { id: string; latimeTotalaM: string; panotaj: { pozitieId: string; lungimeM: string; bucati: number }[] } | null;
}

export function liniileDocumentului(o: OfertaCuProduse, r: RezultatOferta): LinieDoc[] {
  const linii: LinieDoc[] = [];
  for (const b of benzi(o, r)) {
    for (const { l, c, invelitoare } of b.linii) {
      const esteInv = invelitoare !== null && /^învelitori/i.test(l.rubrica);
      linii.push({
        linieId: l.id,
        cod: l.cod,
        denumire: esteInv ? numeInvelitoare(invelitoare) : numeProdus(l),
        um: c.um,
        banda: b.eticheta,
        rubrica: b.rubrica,
        cantitateComandata: c.cantitate,
        invelitoare: esteInv ? { id: invelitoare.id, latimeTotalaM: invelitoare.latimeTotalaM.toString(), panotaj: invelitoare.panotaj.map((p) => ({ pozitieId: p.id, lungimeM: p.lungimeM.toString(), bucati: p.bucati })) } : null,
      });
    }
  }
  return linii;
}

// comanda cu oferta, rezultatul salvat, liniile in ordinea documentului si ce s-a livrat deja
export async function structuraAvizului(comandaId: string) {
  const c = await prisma.comanda.findUniqueOrThrow({ where: { id: comandaId }, include: { avize: { include: includeAviz, orderBy: { numar: "asc" } } } });
  if (!c.ofertaId) return null;
  const o = await prisma.oferta.findUniqueOrThrow({ where: { id: c.ofertaId }, include: includeProduse });
  const rezultat = o.rezultatMotor as unknown as RezultatOferta | null;
  if (!rezultat) return null;
  const livrateLinii = new Map<string, Prisma.Decimal>();
  const livratePozitii = new Map<string, number>();
  for (const a of c.avize) {
    for (const l of a.linii) {
      if (l.pozitieId) livratePozitii.set(l.pozitieId, (livratePozitii.get(l.pozitieId) ?? 0) + (l.bucati ?? 0));
      else if (l.linieId) livrateLinii.set(l.linieId, (livrateLinii.get(l.linieId) ?? new Prisma.Decimal(0)).plus(l.cantitate));
    }
  }
  const linii = liniileDocumentului(o, rezultat);
  const rest = (comandat: string, livrat: Prisma.Decimal | undefined) => {
    const r = new Prisma.Decimal(comandat).minus(livrat ?? 0);
    return (r.lt(0) ? new Prisma.Decimal(0) : r).toFixed(3);
  };
  return {
    comanda: c,
    oferta: o,
    rezultat,
    linii: linii.map((l) => ({
      ...l,
      livrata: (livrateLinii.get(l.linieId) ?? new Prisma.Decimal(0)).toFixed(3),
      propusa: l.invelitoare ? null : rest(l.cantitateComandata, livrateLinii.get(l.linieId)),
      panotaj: l.invelitoare ? l.invelitoare.panotaj.map((p) => ({ ...p, livrate: livratePozitii.get(p.pozitieId) ?? 0, propuse: Math.max(0, p.bucati - (livratePozitii.get(p.pozitieId) ?? 0)) })) : null,
    })),
  };
}

// R8: mp = suma(lungime x bucati) x latime, o singura rotunjire la 3 zecimale
const mpPanotaj = (latime: string, pozitii: { lungimeM: string; bucati: number }[]) => la3(pozitii.reduce((s, p) => s.plus(zec(p.lungimeM).times(p.bucati)), zec(0)).times(zec(latime)));
const fmt = (q: string, um: string) => ro(q, /^(mp|ml)$/i.test(um) || !/\.000$/.test(Number(q).toFixed(3)) ? 3 : 0);

// categoriile din afara invelitorii, in cuvinte: "accesorii standard, fixare și etanșare și sistem pluvial"
function categoriiInCuvinte(rubrici: string[]): string {
  const nume = [...new Set(rubrici.map((r) => r.replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim().toLowerCase()))];
  if (nume.length <= 1) return nume.join("");
  return `${nume.slice(0, -1).join(", ")} și ${nume[nume.length - 1]}`;
}

// HTML-ul avizului (ambele exemplare), din liniile salvate ale avizului; folosit si de teste
export async function htmlAvizPentru(avizId: string): Promise<{ html: string; subsolStanga: string; numarComplet: string }> {
  const a = await prisma.comandaAviz.findUniqueOrThrow({ where: { id: avizId }, include: includeAviz });
  const s = await structuraAvizului(a.comandaId);
  if (!s) throw new EroareComanda("Comanda n-are rezultatul salvat la „Comandat”", 409);
  const ctx = await contextDocument(s.oferta);
  const peLinie = new Map(a.linii.filter((l) => l.linieId && !l.pozitieId).map((l) => [l.linieId!, l]));
  const pePozitie = new Map(a.linii.filter((l) => l.pozitieId).map((l) => [l.pozitieId!, l]));
  const randuri: string[] = [];
  let nr = 0;
  let mpTotal = zec(0);
  let piese = zec(0);
  const rubriciPiese: string[] = [];
  let banda: string | null = null;
  let randuriBanda: string[] = [];
  const inchideBanda = () => {
    if (banda !== null && randuriBanda.length > 0) randuri.push(`<tr class="cat"><td colspan="5">${esc(banda)}</td></tr>`, ...randuriBanda);
    randuriBanda = [];
  };
  for (const l of s.linii) {
    const rand = peLinie.get(l.linieId);
    if (!rand || rand.cantitate.lte(0)) continue;
    if (l.banda !== banda) {
      inchideBanda();
      banda = l.banda;
    }
    nr += 1;
    randuriBanda.push(`<tr><td class="n">${nr}</td><td>${esc(l.denumire)}</td><td class="c">${esc(l.um)}</td><td class="r">${fmt(rand.cantitate.toFixed(3), l.um)}</td><td class="k"><span class="cb"></span></td></tr>`);
    if (l.invelitoare) {
      const pozitii = l.invelitoare.panotaj.map((p) => ({ ...p, rand: pePozitie.get(p.pozitieId) })).filter((p) => p.rand && (p.rand.bucati ?? 0) > 0);
      if (pozitii.length > 0) {
        randuriBanda.push(`<tr class="panh"><td colspan="2">Panotaj — lungime coală × bucăți</td><td></td><td class="r">mp</td><td></td></tr>`);
        let coli = 0;
        for (const p of pozitii) {
          coli += p.rand!.bucati ?? 0;
          randuriBanda.push(`<tr class="pan"><td colspan="2">${ro(p.lungimeM, 2)} m × ${p.rand!.bucati} buc</td><td></td><td class="r">${ro(p.rand!.cantitate.toFixed(3), 3)}</td><td class="k"><span class="cb"></span></td></tr>`);
        }
        randuriBanda.push(`<tr class="pan"><td colspan="2"><b>${coli} coli · lățime totală ${ro(l.invelitoare.latimeTotalaM, 2)} m</b></td><td></td><td class="r"><b>${ro(rand.cantitate.toFixed(3), 3)}</b></td><td></td></tr>`);
      }
      mpTotal = mpTotal.plus(zec(rand.cantitate.toFixed(3)));
    } else {
      piese = piese.plus(zec(rand.cantitate.toFixed(3)));
      rubriciPiese.push(l.rubrica);
    }
  }
  inchideBanda();
  const parti: string[] = [];
  if (a.coli > 0) parti.push(`<b>${a.coli} coli</b> de învelitoare (${ro(mpTotal.toFixed(3), 3)} mp)`);
  if (piese.gt(0)) parti.push(`<b>${fmt(piese.toFixed(3), "buc")} piese</b> ${esc(categoriiInCuvinte(rubriciPiese))}`);
  const total = parti.length ? `<div class="aviz-tot">Total: ${parti.join(" · ")}</div>` : "";
  const dataLivrarii = dataRoDinIso(dataDoar(a.dataLivrarii));
  const semnaturi = `<div class="semn">
  <div class="sbox"><div class="slbl">Predat</div><div class="sline">Numele: ______________________________</div><div class="sline">Semnătura: ___________________________</div><div class="sline">Data: ____ / ____ / ________</div></div>
  <div class="sbox"><div class="slbl">Am recepționat marfa</div><div class="sline">Numele: ______________________________</div><div class="sline">Semnătura: ___________________________</div><div class="sline">Data: ____ / ____ / ________</div></div>
</div>`;
  const exemplar = (n: 1 | 2) => `<div class="sheet aviz${n === 2 ? " page2" : ""}">
${antet(ctx, "AVIZ DE ÎNSOȚIRE A MĂRFII", "Comanda")}
<div class="intern">Exemplarul ${n} din 2 — ${n === 1 ? "furnizor" : "client"} · livrare din ${dataLivrarii} · cantități fără valori${a.partial ? " · livrare parțială" : ""}</div>
<table class="lines">
<thead><tr><th class="n">Nr.</th><th>Produs</th><th class="c">UM</th><th class="r q">Cantitate</th><th class="k">Primit</th></tr></thead>
<tbody>${randuri.join("")}</tbody></table>
${total}
${semnaturi}
</div>`;
  const html = pagina(`Aviz de însoțire a mărfii ${ctx.numarComplet} · livrare din ${dataLivrarii}`, `<style>${CSS_COMENZI}</style>${exemplar(1)}${exemplar(2)}`);
  return { html, subsolStanga: `${ctx.firma.denumire} · Aviz de însoțire a mărfii · comanda ${ctx.numarComplet} · ${ctx.client.nume}`, numarComplet: ctx.numarComplet };
}

avizeRouter.get("/", async (req, res) => {
  const u = req.utilizator!;
  const c = await comandaVizibila(u, idDin(req));
  if (!c) {
    res.status(404).json({ eroare: "Comanda nu există sau nu e vizibilă" });
    return;
  }
  const s = c.tip === "DIN_OFERTA" ? await structuraAvizului(c.id) : null;
  res.json({
    avize: (s?.comanda.avize ?? []).map(spreAviz),
    linii: (s?.linii ?? []).map((l) => ({ linieId: l.linieId, cod: l.cod, denumire: l.denumire, um: l.um, banda: l.banda, cantitateComandata: l.cantitateComandata, livrata: l.livrata, propusa: l.propusa, latimeTotalaM: l.invelitoare?.latimeTotalaM ?? null, panotaj: l.panotaj })),
    dataPropusa: c.dataLivrarii ? dataDoar(c.dataLivrarii) : dataLocala(new Date()),
    manuala: c.tip === "MANUALA",
    poateGenera: poateGeneraAviz(u) && c.tip === "DIN_OFERTA",
  });
});

// generarea unui aviz: cantitatile (propuse sau ajustate), liniile, PDF-ul ca document al ofertei
export async function genereazaAviz(comandaId: string, date: z.infer<typeof schemaAviz>, u: Utilizator) {
  const s = await structuraAvizului(comandaId);
  if (!s) throw new EroareComanda("Comanda n-are rezultatul salvat la „Comandat”", 409);
  const explicit = date.linii !== undefined || date.pozitii !== undefined;
  const cerLinie = new Map((date.linii ?? []).map((l) => [l.linieId, l.cantitate]));
  const cerPoz = new Map((date.pozitii ?? []).map((p) => [p.pozitieId, p.bucati]));
  const cunoscuteLinii = new Set(s.linii.map((l) => l.linieId));
  const cunoscutePozitii = new Set(s.linii.flatMap((l) => l.panotaj?.map((p) => p.pozitieId) ?? []));
  for (const id of cerLinie.keys()) if (!cunoscuteLinii.has(id)) throw new EroareComanda(`Linia ${id} nu e în comandă`, 400);
  for (const id of cerPoz.keys()) if (!cunoscutePozitii.has(id)) throw new EroareComanda(`Lungimea ${id} nu e în comandă`, 400);
  const motive: string[] = [];
  const randuri: Prisma.ComandaAvizLinieCreateWithoutAvizInput[] = [];
  let partial = false;
  let coli = 0;
  let piese = new Prisma.Decimal(0);
  let ordine = 0;
  for (const l of s.linii) {
    if (l.invelitoare && l.panotaj) {
      const pozitii = l.panotaj.map((p) => {
        const b = explicit ? (cerPoz.get(p.pozitieId) ?? 0) : p.propuse;
        if (b > p.bucati) motive.push(`${l.denumire}, ${ro(p.lungimeM, 2)} m: cel mult ${p.bucati} buc (comandate)`);
        if (b < p.bucati) partial = true;
        return { ...p, bucati: b };
      });
      const livrate = pozitii.filter((p) => p.bucati > 0);
      if (livrate.length === 0) {
        partial = true;
        continue;
      }
      const mp = mpPanotaj(l.invelitoare.latimeTotalaM, livrate);
      randuri.push({ ordine: ordine++, linieId: l.linieId, cod: l.cod, denumire: l.denumire, um: l.um, cantitate: new Prisma.Decimal(mp) });
      for (const p of livrate) {
        coli += p.bucati;
        randuri.push({ ordine: ordine++, linieId: l.linieId, pozitieId: p.pozitieId, cod: l.cod, denumire: `${ro(p.lungimeM, 2)} m × ${p.bucati} buc`, um: "mp", cantitate: new Prisma.Decimal(la3(zec(p.lungimeM).times(p.bucati).times(zec(l.invelitoare.latimeTotalaM)))), lungimeM: new Prisma.Decimal(p.lungimeM), bucati: p.bucati });
      }
    } else {
      const q = new Prisma.Decimal(explicit ? (cerLinie.get(l.linieId) ?? "0") : (l.propusa ?? "0"));
      const comandata = new Prisma.Decimal(l.cantitateComandata);
      if (q.gt(comandata)) motive.push(`${l.denumire}: cel mult ${fmt(comandata.toFixed(3), l.um)} ${l.um} (comandate)`);
      if (q.lt(comandata)) partial = true;
      if (q.lte(0)) continue;
      piese = piese.plus(q);
      randuri.push({ ordine: ordine++, linieId: l.linieId, cod: l.cod, denumire: l.denumire, um: l.um, cantitate: q });
    }
  }
  if (motive.length > 0) throw new EroareComanda("Cantități peste cele comandate", 400, motive);
  if (randuri.length === 0) throw new EroareComanda("Avizul n-are nicio cantitate de livrat", 400);
  const c = s.comanda;
  const aviz = await prisma.$transaction(async (tx) => {
    const numar = (await tx.comandaAviz.count({ where: { comandaId: c.id } })) + 1;
    const creat = await tx.comandaAviz.create({
      data: { comandaId: c.id, numar, dataLivrarii: new Date(`${date.dataLivrarii}T00:00:00Z`), partial, coli, piese, generatDeId: u.id, numeGeneratLaMoment: u.nume, linii: { create: randuri } },
      include: includeAviz,
    });
    await scrieIstoricComanda(tx, c.id, u, [{ tip: "aviz", camp: "aviz", inainte: null, dupa: `aviz ${numar}: livrare din ${dataRoDinIso(date.dataLivrarii)}${partial ? " (parțială)" : ""} — ${coli} coli, ${fmt(piese.toFixed(3), "buc")} piese` }]);
    return creat;
  });
  const { html, subsolStanga, numarComplet } = await htmlAvizPentru(aviz.id);
  const pdf = await randeazaPdf(html, { subsolStanga });
  const nume = `${numarComplet}-aviz-${aviz.numar}-${date.dataLivrarii}-${marcaFisier()}.pdf`;
  const folder = path.join(env.dateDir, "oferte", s.oferta.id, "documente");
  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(path.join(folder, nume), pdf);
  const d = await prisma.ofertaDocument.create({ data: { ofertaId: s.oferta.id, tip: "AVIZ", versiune: s.oferta.versiune, nume, fisier: path.join("oferte", s.oferta.id, "documente", nume), marime: pdf.length, pagini: paginiPdf(pdf), generatDeId: u.id } });
  return prisma.comandaAviz.update({ where: { id: aviz.id }, data: { documentId: d.id }, include: includeAviz });
}

avizeRouter.post("/", async (req, res) => {
  const u = req.utilizator!;
  const date = schemaAviz.parse(req.body);
  try {
    const c = await comandaVizibila(u, idDin(req));
    if (!c) throw new EroareComanda("Comanda nu există sau nu e vizibilă", 404);
    if (!poateGeneraAviz(u)) throw new EroareComanda("Avizul nu e disponibil colaboratorilor (FISA-CONTURI §2)", 403);
    if (c.tip !== "DIN_OFERTA") throw new EroareComanda("Comanda manuală n-are linii: avizul ei se scrie în afara softului", 409);
    const aviz = await genereazaAviz(c.id, date, u);
    res.status(201).json({ aviz: spreAviz(aviz) });
  } catch (e) {
    if (e instanceof EroareComanda) {
      res.status(e.status).json({ eroare: e.message, motive: e.motive });
      return;
    }
    throw e;
  }
});
