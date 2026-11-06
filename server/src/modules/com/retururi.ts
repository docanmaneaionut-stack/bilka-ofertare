import fs from "node:fs/promises";
import path from "node:path";
import { Prisma, type Utilizator } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { env } from "../../env.js";
import type { RezultatOferta } from "../mot/tipuri.js";
import { desparteTva, la2, z as zec } from "../mot/zecimal.js";
import { numarComplet } from "../ofe/clienti.js";
import { antet, numeProdus } from "../ofe/documente/continut.js";
import { contextDocument } from "../ofe/documente/index.js";
import { randeazaPdf } from "../ofe/documente/pdf.js";
import { esc, pagina, ro } from "../ofe/documente/sablon.js";
import { comandaVizibila, cuDrepturi, EroareComanda, raspunde, scrieIstoricComanda, spreRand } from "./comenzi.js";
import { poateScrieBani } from "./vizibilitate.js";

// Retururile (S22; FISA-COMENZI cap. 5, OFERTARE cap. 19): din comanda, orice cont care vede
// comanda alege liniile si cantitatile returnate (cel mult cantitatea comandata, peste
// retururile active) din rezultatul salvat la "Comandat"; suma de restituit = preturile de
// vanzare ale liniilor din oferta comandata (pret document x cantitate, EUR fara TVA, 2 zecimale
// pe linie; TVA din suma; lei la cursul documentului - aceeasi aritmetica ca R4 / R6, cu
// mot/zecimal.ts); in paralel, valoarea de achizitie a marfii returnate (achizitia reala x
// cantitate, in lei cu TVA la cursul de achizitie, pas cu pas), pentru vanzari. Nota de retur
// (PDF pe sablonul ofertei) e document al ofertei comandate (tip NOTA_RETUR). Un retur gresit se
// anuleaza cu motiv de Administratorul firmei (nimic sters). Comenzile manuale n-au linii:
// returul lor se reflecta prin corectia sumelor manuale (cost si vanzare), cu istoric.

export const retururiRouter = Router({ mergeParams: true });

const cantitate = z
  .string()
  .trim()
  .regex(/^\d+([.,]\d{1,3})?$/, "cantitate cu cel mult trei zecimale")
  .transform((s) => s.replace(",", "."));
const schemaRetur = z.object({
  linii: z.array(z.object({ linieId: z.string().min(1), cantitate })).min(1, "alege cel puțin o linie"),
  observatii: z.string().trim().max(1000).nullish(),
});
const schemaAnulare = z.object({ motiv: z.string().trim().min(1, "anularea cere un motiv").max(500) });

const idDin = (req: { params: Record<string, unknown> }) => String(req.params.id ?? "");
const dataDoar = (d: Date) => d.toISOString().slice(0, 10);
const dataRo = (d: Date) => `${d.toISOString().slice(8, 10)}.${d.toISOString().slice(5, 7)}.${d.toISOString().slice(0, 4)}`;
const dataLocala = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

export const includeRetur = { linii: { orderBy: { cod: "asc" as const } } } satisfies Prisma.ComandaReturInclude;
type ReturCuLinii = Prisma.ComandaReturGetPayload<{ include: typeof includeRetur }>;

export function spreRetur(r: ReturCuLinii) {
  return {
    id: r.id,
    numar: r.numar,
    data: dataDoar(r.data),
    stare: r.stare,
    sumaFaraTvaEur: r.sumaFaraTvaEur.toFixed(2),
    tvaEur: r.tvaEur.toFixed(2),
    sumaCuTvaEur: r.sumaCuTvaEur.toFixed(2),
    sumaCuTvaLei: r.sumaCuTvaLei.toFixed(2),
    achizitieLei: r.achizitieLei.toFixed(2),
    cursBnr: r.cursBnr.toFixed(4),
    observatii: r.observatii,
    notatDe: r.numeNotatLaMoment,
    moment: r.moment,
    anulatLa: r.anulatLa,
    anulatDe: r.anulatDeNume,
    motivAnulare: r.motivAnulare,
    deRegularizat: r.deRegularizat,
    regularizatLa: r.regularizatLa,
    regularizatDe: r.regularizatDeNume,
    documentId: r.documentId,
    linii: r.linii.map((l) => ({ id: l.id, linieId: l.linieId, cod: l.cod, denumire: l.denumire, um: l.um, cantitate: l.cantitate.toFixed(3), pretDocumentEur: l.pretDocumentEur.toFixed(2), valoareEur: l.valoareEur.toFixed(2), achizitieLei: l.achizitieLei.toFixed(2) })),
  };
}

// liniile comenzii din rezultatul salvat, cu ce s-a returnat deja (retururile active)
export async function liniileReturnabile(comandaId: string) {
  const c = await prisma.comanda.findUniqueOrThrow({ where: { id: comandaId }, include: { oferta: { include: { linii: true } }, retururi: { where: { stare: "ACTIV" }, include: { linii: true } } } });
  const rezultat = c.oferta?.rezultatMotor as unknown as RezultatOferta | null;
  if (!c.oferta || !rezultat) return null;
  const returnat = new Map<string, Prisma.Decimal>();
  for (const r of c.retururi) for (const l of r.linii) returnat.set(l.linieId, (returnat.get(l.linieId) ?? new Prisma.Decimal(0)).plus(l.cantitate));
  const dupaId = new Map(c.oferta.linii.map((l) => [l.id, l]));
  return {
    comanda: c,
    rezultat,
    linii: rezultat.linii.map((l) => {
      const o = dupaId.get(l.id);
      return {
        linieId: l.id,
        cod: l.cod,
        denumire: o ? numeProdus(o) : l.cod,
        um: l.um,
        cantitateComandata: l.cantitate,
        cantitateReturnata: (returnat.get(l.id) ?? new Prisma.Decimal(0)).toFixed(3),
        pretDocumentEur: l.pretDocumentEur,
        achizitieRealaEur: l.achizitieRealaEur,
      };
    }),
  };
}

retururiRouter.get("/", async (req, res) => {
  const u = req.utilizator!;
  const c = await comandaVizibila(u, idDin(req));
  if (!c) {
    res.status(404).json({ eroare: "Comanda nu există sau nu e vizibilă" });
    return;
  }
  const retururi = await prisma.comandaRetur.findMany({ where: { comandaId: c.id }, include: includeRetur, orderBy: { numar: "asc" } });
  const returnabile = c.tip === "DIN_OFERTA" ? await liniileReturnabile(c.id) : null;
  res.json({ retururi: retururi.map(spreRetur), linii: returnabile?.linii ?? [], manuala: c.tip === "MANUALA", poateAnula: poateScrieBani(u, c) });
});

// nota de retur: PDF pe sablonul ofertei, document al ofertei comandate
async function notaDeRetur(comanda: { ofertaId: string; serie: string; numar: number }, retur: ReturCuLinii, u: Utilizator): Promise<string> {
  const o = await prisma.oferta.findUniqueOrThrow({ where: { id: comanda.ofertaId }, include: { invelitori: true, linii: true } });
  const ctx = await contextDocument(o);
  const randuri = retur.linii
    .map((l, i) => `<tr><td class="n">${i + 1}</td><td>${esc(l.denumire)}</td><td class="c">${esc(l.um)}</td><td class="r">${ro(l.cantitate.toFixed(3), 3)}</td><td class="r">${ro(l.pretDocumentEur.toFixed(2))}</td><td class="r">${ro(l.valoareEur.toFixed(2))}</td></tr>`)
    .join("");
  const corp = `<div class="sheet">
${antet(ctx, "NOTĂ DE RETUR", "pentru oferta")}
<div class="intern">Nota de retur nr. ${retur.numar} din ${dataRo(retur.data)} — produsele returnate din comanda ${esc(numarComplet(comanda.serie, comanda.numar))}, la prețurile din oferta comandată. Suma de restituit se calculează în euro fără TVA, TVA-ul din sumă, iar în lei la cursul ofertei (${ro(retur.cursBnr.toFixed(4), 4)}).${retur.observatii ? ` ${esc(retur.observatii)}` : ""}</div>
<table class="lines">
<thead><tr><th class="n">Nr.</th><th>Produs returnat</th><th class="c">UM</th><th class="r q">Cantitate</th><th class="r p">Preț unitar (€, fără TVA)</th><th class="r v">Valoare (€)</th></tr></thead>
<tbody>${randuri}</tbody></table>
<div class="bottom"><div class="foot"><p>Marfa se primește în depozit la prezentarea acestei note. Prețurile sunt cele din oferta comandată; restituirea se face în lei, la cursul ofertei.</p></div>
<div class="totals">
  <div><span>Total fără TVA</span><span>${ro(retur.sumaFaraTvaEur.toFixed(2))} €</span></div>
  <div><span>TVA ${ro(retur.tvaPct.toFixed(0), 0)} %</span><span>${ro(retur.tvaEur.toFixed(2))} €</span></div>
  <div class="big"><span>Total de restituit</span><span>${ro(retur.sumaCuTvaEur.toFixed(2))} €</span></div>
  <div class="lei"><span>Total în lei</span><span>${ro(retur.sumaCuTvaLei.toFixed(2))} lei</span></div>
</div></div>
</div>`;
  const html = pagina(`Notă de retur ${ctx.numarComplet}`, corp);
  const pdf = await randeazaPdf(html, { subsolStanga: `${ctx.firma.denumire} · Notă de retur ${retur.numar} · comanda ${ctx.numarComplet} · ${ctx.client.nume}` });
  const pagini = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length || null;
  const marca = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()).replace(/[: ]/g, "-");
  const nume = `${ctx.numarComplet}-nota-retur-${retur.numar}-${marca}.pdf`;
  const folder = path.join(env.dateDir, "oferte", o.id, "documente");
  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(path.join(folder, nume), pdf);
  const d = await prisma.ofertaDocument.create({ data: { ofertaId: o.id, tip: "NOTA_RETUR", versiune: o.versiune, nume, fisier: path.join("oferte", o.id, "documente", nume), marime: pdf.length, pagini, generatDeId: u.id } });
  return d.id;
}

retururiRouter.post("/", async (req, res) => {
  const u = req.utilizator!;
  const date = schemaRetur.parse(req.body);
  try {
    const c = await comandaVizibila(u, idDin(req));
    if (!c) throw new EroareComanda("Comanda nu există sau nu e vizibilă", 404);
    if (c.tip !== "DIN_OFERTA" || !c.ofertaId) throw new EroareComanda("Comanda manuală n-are linii cu prețuri: returul se reflectă prin corecția sumelor de vânzare (cost și vânzare), de către Administratorul firmei", 409);
    const r = await liniileReturnabile(c.id);
    if (!r) throw new EroareComanda("Comanda n-are rezultatul salvat la „Comandat”", 409);
    const tvaPct = Number(r.comanda.oferta!.tvaPct);
    const cursBnr = r.rezultat.cursBnr;
    const cursAchizitie = r.rezultat.cursAchizitie;
    const linii: { linieId: string; cod: string; denumire: string; um: string; cantitate: Prisma.Decimal; pretDocumentEur: Prisma.Decimal; valoareEur: Prisma.Decimal; achizitieRealaEur: Prisma.Decimal; achizitieLei: Prisma.Decimal }[] = [];
    const motive: string[] = [];
    for (const cerut of date.linii) {
      const l = r.linii.find((x) => x.linieId === cerut.linieId);
      if (!l) throw new EroareComanda(`Linia ${cerut.linieId} nu e în comandă`, 400);
      const q = new Prisma.Decimal(cerut.cantitate);
      if (q.lte(0)) throw new EroareComanda(`${l.denumire}: cantitatea returnată trebuie să fie mai mare ca zero`, 400);
      const ramasa = new Prisma.Decimal(l.cantitateComandata).minus(l.cantitateReturnata);
      if (q.gt(ramasa)) motive.push(`${l.denumire}: se pot returna cel mult ${ramasa.toFixed(3)} ${l.um} (comandat ${l.cantitateComandata}, returnat deja ${l.cantitateReturnata})`);
      const valoareEur = new Prisma.Decimal(la2(zec(l.pretDocumentEur).times(zec(q.toString()))));
      const achEur = new Prisma.Decimal(la2(zec(l.achizitieRealaEur).times(zec(q.toString()))));
      linii.push({ linieId: l.linieId, cod: l.cod, denumire: l.denumire, um: l.um, cantitate: q, pretDocumentEur: new Prisma.Decimal(l.pretDocumentEur), valoareEur, achizitieRealaEur: new Prisma.Decimal(l.achizitieRealaEur), achizitieLei: new Prisma.Decimal(la2(zec(la2(zec(achEur.toString()).times(zec(cursAchizitie)))).times(zec(1 + tvaPct / 100)))) });
    }
    if (motive.length > 0) throw new EroareComanda("Cantități peste cele comandate", 400, motive);
    // R4 / R6: suma fara TVA din linii, TVA din suma, lei la cursul documentului; achizitia pas cu pas
    const faraTvaEur = linii.reduce((s, l) => s.plus(l.valoareEur), new Prisma.Decimal(0));
    const tvaEur = new Prisma.Decimal(la2(zec(faraTvaEur.toString()).times(tvaPct / 100)));
    const cuTvaEur = faraTvaEur.plus(tvaEur);
    const cuTvaLei = new Prisma.Decimal(la2(zec(cuTvaEur.toString()).times(zec(cursBnr))));
    const achEurTotal = linii.reduce((s, l) => s.plus(new Prisma.Decimal(la2(zec(l.achizitieRealaEur.toString()).times(zec(l.cantitate.toString()))))), new Prisma.Decimal(0));
    const achLei = new Prisma.Decimal(la2(zec(la2(zec(achEurTotal.toString()).times(zec(cursAchizitie)))).times(zec(1 + tvaPct / 100))));
    const acum = new Date();
    const retur = await prisma.$transaction(async (tx) => {
      const numar = (await tx.comandaRetur.count({ where: { comandaId: c.id } })) + 1;
      const creat = await tx.comandaRetur.create({
        data: {
          comandaId: c.id,
          numar,
          data: new Date(`${dataLocala(acum)}T00:00:00Z`),
          sumaFaraTvaEur: faraTvaEur,
          tvaEur,
          sumaCuTvaEur: cuTvaEur,
          sumaCuTvaLei: cuTvaLei,
          achizitieLei: achLei,
          cursBnr: new Prisma.Decimal(cursBnr),
          cursAchizitie: new Prisma.Decimal(cursAchizitie),
          tvaPct: new Prisma.Decimal(tvaPct),
          observatii: date.observatii?.trim() || null,
          notatDeId: u.id,
          numeNotatLaMoment: u.nume,
          // comisionul era deja achitat -> randul cu minus ramane "de regularizat" pana il bifeaza Administratorul
          deRegularizat: c.comisionAchitat || c.comisionAgentAchitat,
          linii: { create: linii.map((l) => ({ linieId: l.linieId, cod: l.cod, denumire: l.denumire, um: l.um, cantitate: l.cantitate, pretDocumentEur: l.pretDocumentEur, valoareEur: l.valoareEur, achizitieRealaEur: l.achizitieRealaEur, achizitieLei: l.achizitieLei })) },
        },
        include: includeRetur,
      });
      await scrieIstoricComanda(tx, c.id, u, [{ tip: "retur", camp: "retur", inainte: null, dupa: `retur ${numar}: ${linii.length} linii, ${cuTvaLei.toFixed(2)} lei de restituit${creat.deRegularizat ? " — de regularizat (comision achitat)" : ""}` }]);
      return creat;
    });
    const documentId = await notaDeRetur({ ofertaId: c.ofertaId, serie: c.serie, numar: c.numar }, retur, u);
    const final = await prisma.comandaRetur.update({ where: { id: retur.id }, data: { documentId }, include: includeRetur });
    res.status(201).json({ retur: spreRetur(final), comanda: spreRand((await comandaVizibila(u, c.id))!) });
  } catch (e) {
    if (e instanceof EroareComanda) {
      res.status(e.status).json({ eroare: e.message, motive: e.motive });
      return;
    }
    throw e;
  }
});

retururiRouter.put("/:rid/anuleaza", async (req, res) => {
  const u = req.utilizator!;
  const date = schemaAnulare.parse(req.body);
  try {
    const c = await cuDrepturi(req, u, (x) => poateScrieBani(u, x), "Un retur îl anulează doar Administratorul firmei comenzii");
    const r = await prisma.comandaRetur.findFirst({ where: { id: String(req.params.rid), comandaId: c.id }, include: includeRetur });
    if (!r) throw new EroareComanda("Returul nu există", 404);
    if (r.stare === "ANULAT") throw new EroareComanda("Returul e deja anulat", 409);
    const dupa = await prisma.$transaction(async (tx) => {
      const d = await tx.comandaRetur.update({ where: { id: r.id }, data: { stare: "ANULAT", anulatLa: new Date(), anulatDeNume: u.nume, motivAnulare: date.motiv }, include: includeRetur });
      await scrieIstoricComanda(tx, c.id, u, [{ tip: "retur", camp: "anulare", inainte: `retur ${r.numar}: ${r.sumaCuTvaLei.toFixed(2)} lei`, dupa: "anulat", mentiuni: date.motiv }]);
      return d;
    });
    res.json({ retur: spreRetur(dupa) });
  } catch (e) {
    raspunde(res, e);
  }
});

// "de regularizat" -> bifat de Administratorul firmei cand comisionul a fost regularizat
retururiRouter.put("/:rid/regularizat", async (req, res) => {
  const u = req.utilizator!;
  try {
    const c = await cuDrepturi(req, u, (x) => poateScrieBani(u, x), "Regularizarea o bifează doar Administratorul firmei comenzii");
    const r = await prisma.comandaRetur.findFirst({ where: { id: String(req.params.rid), comandaId: c.id }, include: includeRetur });
    if (!r) throw new EroareComanda("Returul nu există", 404);
    if (!r.deRegularizat) throw new EroareComanda("Returul nu e de regularizat", 409);
    const dupa = await prisma.$transaction(async (tx) => {
      const d = await tx.comandaRetur.update({ where: { id: r.id }, data: { deRegularizat: false, regularizatLa: new Date(), regularizatDeNume: u.nume }, include: includeRetur });
      await scrieIstoricComanda(tx, c.id, u, [{ tip: "retur", camp: "regularizare", inainte: "de regularizat", dupa: "regularizat" }]);
      return d;
    });
    res.json({ retur: spreRetur(dupa) });
  } catch (e) {
    raspunde(res, e);
  }
});
