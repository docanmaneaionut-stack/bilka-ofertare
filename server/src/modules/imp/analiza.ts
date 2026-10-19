import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Prisma, Utilizator } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { env } from "../../env.js";
import { gasesteFormat } from "./formate/index.js";
import { calculeazaDiferenteProduse, calculeazaDiferenteReferinta, CHEIE_REFERINTA, type RandReferintaExistent } from "./diferente.js";
import {
  TIPURI_REFERINTA,
  type Diferente,
  type FisierCitit,
  type FisierStocat,
  type Problema,
  type ProdusImport,
  type Raport,
  type RaportFisier,
  type TipReferinta,
} from "./tipuri.js";

export class EroareImport extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export type FisierIncarcat = { nume: string; continut: Buffer };

const MODEL_REFERINTA = {
  "variante-profil": "variantaProfil",
  "culori-finisaj-grosime": "culoareFinisajGrosime",
  "garantii-finisaj-grosime": "garantieFinisajGrosime",
  "liste-implicite-oferta": "listaImplicitaOferta",
  "trepte-desfasurata": "treaptaDesfasurata",
} as const;

export async function incarcaReferinteExistente(tip: TipReferinta, furnizor: string): Promise<RandReferintaExistent[]> {
  const model = MODEL_REFERINTA[tip];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const randuri = (await (prisma as any)[model].findMany({ where: { furnizor } })) as Record<string, unknown>[];
  return randuri.map((r) => ({
    id: r.id as string,
    cheie: CHEIE_REFERINTA[tip](r),
    activ: r.activ as boolean,
    valori: normalizeazaValori(r),
  }));
}

function normalizeazaValori(r: Record<string, unknown>) {
  const v: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(r)) {
    if (["id", "furnizor", "activ", "createdAt", "updatedAt"].includes(k)) continue;
    v[k] = val !== null && typeof val === "object" && "toNumber" in (val as object) ? (val as { toNumber: () => number }).toNumber() : val;
  }
  return v;
}

export async function incarcaProduseExistente(compartimentId: string) {
  const listaActiva = await prisma.listaPret.findFirst({ where: { compartimentId, status: "ACTIVA" } });
  const preturi = listaActiva
    ? await prisma.pretListaProdus.findMany({ where: { listaPretId: listaActiva.id }, select: { produsId: true, pret: true } })
    : [];
  const pretDupaProdus = new Map(preturi.map((p) => [p.produsId, p.pret.toNumber()]));
  const produse = await prisma.produs.findMany({
    where: { compartimentId },
    include: { grup: true, familie: true, categorieOferta: true },
  });
  return {
    listaActiva,
    produse: produse.map((p) => ({
      ...p,
      grupDenumire: p.grup.denumire,
      familieDenumire: p.familie?.denumire ?? null,
      categorieOfertaDenumire: p.categorieOferta?.denumire ?? null,
      pretActiv: pretDupaProdus.get(p.id) ?? null,
    })),
  };
}

export async function analizeazaImport(params: { compartimentId: string; fisiere: FisierIncarcat[]; utilizator: Utilizator }) {
  const { compartimentId, fisiere, utilizator } = params;
  if (fisiere.length === 0) throw new EroareImport("Niciun fișier încărcat");

  const compartiment = await prisma.compartiment.findUnique({ where: { id: compartimentId } });
  if (!compartiment) throw new EroareImport("Compartimentul nu există", 404);
  const format = gasesteFormat(compartiment.formatImport);
  if (!format) throw new EroareImport(`Compartimentul „${compartiment.denumire}” nu are un format de import cunoscut (format: ${compartiment.formatImport ?? "gol"})`);

  const rubrici = (await prisma.categorieOferta.findMany()).map((c) => c.denumire);
  const ctx = {
    codScurtCompartiment: compartiment.codScurt,
    denumireCompartiment: compartiment.denumire,
    monedaCompartiment: compartiment.moneda,
    rubrici,
  };

  const citite: FisierCitit[] = fisiere.map((f) => format.citesteFisier(f.nume, f.continut, ctx));
  const erori: Problema[] = [];
  const avertizari: Problema[] = [];
  for (const f of citite) for (const p of f.probleme) (p.nivel === "eroare" ? erori : avertizari).push(p);

  const fisiereProduse = citite.filter((f) => f.tip === "produse");
  const fisiereReferinte = citite.filter((f) => f.tip !== "produse");
  const areProduse = fisiereProduse.length > 0;
  const areReferinte = fisiereReferinte.length > 0;

  // acelasi tip de referinta de doua ori = ambiguu
  const tipuriVazute = new Set<string>();
  for (const f of fisiereReferinte) {
    if (tipuriVazute.has(f.tip)) erori.push({ nivel: "eroare", fisier: f.nume, mesaj: `Două fișiere de tipul „${f.tip}” în același import` });
    tipuriVazute.add(f.tip);
  }

  const { listaActiva, produse: existente } = await incarcaProduseExistente(compartimentId);
  const fisiereAnterioare = (listaActiva?.fisiere as FisierStocat[] | null) ?? [];

  // set complet: fata de versiunea activa nu poate lipsi o lista de produse
  if (areProduse && listaActiva) {
    const numeIncarcate = new Set(fisiereProduse.map((f) => f.nume.toLowerCase()));
    for (const vechi of fisiereAnterioare.filter((f) => f.tip === "produse")) {
      if (!numeIncarcate.has(vechi.nume.toLowerCase())) {
        erori.push({ nivel: "eroare", mesaj: `Set incomplet: lipsește lista „${vechi.nume}” față de versiunea activă „${listaActiva.denumire}”. O versiune de prețuri se creează numai dintr-un set complet.` });
      }
    }
  }

  const toateProdusele: ProdusImport[] = fisiereProduse.flatMap((f) => f.produse);

  // acelasi cod intern de doua ori (cod furnizor + denumire identice) = eroare
  const dupaCodIntern = new Map<string, ProdusImport>();
  for (const p of toateProdusele) {
    const dublura = dupaCodIntern.get(p.codIntern);
    if (dublura) {
      erori.push({
        nivel: "eroare",
        fisier: p.fisier,
        rand: p.rand,
        mesaj: `Același produs de două ori (cod furnizor „${p.codFurnizor ?? "—"}”, denumire „${p.denumire}”): și în ${dublura.fisier} rândul ${dublura.rand}`,
      });
    } else dupaCodIntern.set(p.codIntern, p);
  }

  const diferente: Diferente = {
    produse: { noi: [], modificate: [], preturiModificate: [], preturiNoi: 0, disparute: [], redenumiri: [], reaparute: [], neschimbate: 0 },
    grupuriNoi: [],
    familiiNoi: [],
    referinte: {},
  };
  if (areProduse) {
    const rezultat = calculeazaDiferenteProduse(existente, [...dupaCodIntern.values()]);
    diferente.produse = rezultat.produse;
    diferente.grupuriNoi = rezultat.grupuriNoi;
    diferente.familiiNoi = rezultat.familiiNoi;
  }
  for (const f of fisiereReferinte) {
    const tip = f.tip as TipReferinta;
    const existenteRef = await incarcaReferinteExistente(tip, compartiment.denumire);
    diferente.referinte[tip] = calculeazaDiferenteReferinta(existenteRef, f.referinte);
  }

  // raportul pe fisier, comparat cu versiunea anterioara
  const raportFisiere: RaportFisier[] = citite.map((f) => {
    const esteProduse = f.tip === "produse";
    const coduri = esteProduse ? new Set(f.produse.filter((p) => p.codFurnizor).map((p) => p.codFurnizor)) : null;
    const faraCod = esteProduse ? f.produse.filter((p) => !p.codFurnizor && !p.tablaPlana).length : null;
    const anteriorStocat = fisiereAnterioare.find((a) => a.nume.toLowerCase() === f.nume.toLowerCase());
    const anterior = anteriorStocat ? { randuri: anteriorStocat.randuri, coduriDistincte: anteriorStocat.coduriDistincte, faraCod: anteriorStocat.faraCod } : null;
    const avert: string[] = [];
    if (anterior) {
      if (anterior.randuri !== f.randuri) avert.push(`Rânduri: ${anterior.randuri} înainte → ${f.randuri} acum`);
      if (coduri && anterior.coduriDistincte !== null && anterior.coduriDistincte !== coduri.size) avert.push(`Coduri distincte: ${anterior.coduriDistincte} → ${coduri.size}`);
      if (faraCod !== null && anterior.faraCod !== null && anterior.faraCod !== faraCod) avert.push(`Fără cod: ${anterior.faraCod} → ${faraCod}`);
    }
    for (const a of avert) avertizari.push({ nivel: "avertizare", fisier: f.nume, mesaj: a });
    return { nume: f.nume, tip: f.tip, randuri: f.randuri, coduriDistincte: coduri ? coduri.size : null, faraCod, anterior, avertizari: avert };
  });

  const coduriToate = new Set(toateProdusele.filter((p) => p.codFurnizor).map((p) => p.codFurnizor));
  const raport: Raport = {
    fisiere: raportFisiere,
    totaluri: {
      randuri: fisiereProduse.reduce((s, f) => s + f.randuri, 0),
      randuriPret: toateProdusele.length,
      coduriDistincte: coduriToate.size,
      faraCod: toateProdusele.filter((p) => !p.codFurnizor && !p.tablaPlana).length,
      perechiTablaPlana: toateProdusele.filter((p) => p.tablaPlana === "coala").length,
      inactive: toateProdusele.filter((p) => !p.activ).length,
      produseNoi: diferente.produse.noi.length,
      modificate: diferente.produse.modificate.length,
      preturiModificate: diferente.produse.preturiModificate.length,
      disparute: diferente.produse.disparute.length,
      redenumiri: diferente.produse.redenumiri.length,
      reaparute: diferente.produse.reaparute.length,
      neschimbate: diferente.produse.neschimbate,
    },
    primulImport: !listaActiva,
  };

  // fisierele brute se pastreaza pe disc, la propunere (si apoi la versiune)
  const propunereId = randomUUID();
  const folder = path.join(env.dateDir, "import", propunereId);
  await mkdir(folder, { recursive: true });
  const stocate: FisierStocat[] = [];
  for (let i = 0; i < fisiere.length; i++) {
    const numeSigur = path.basename(fisiere[i].nume).replace(/[^\w.\-ăâîșțĂÂÎȘȚ ]/g, "_");
    const cale = path.join(folder, numeSigur);
    await writeFile(cale, fisiere[i].continut);
    const rf = raportFisiere[i];
    stocate.push({ nume: fisiere[i].nume, cale, tip: citite[i].tip, randuri: rf.randuri, coduriDistincte: rf.coduriDistincte, faraCod: rf.faraCod });
  }

  const propunere = await prisma.importPropunere.create({
    data: {
      id: propunereId,
      compartimentId,
      creatDeId: utilizator.id,
      areProduse,
      areReferinte,
      fisiere: stocate as unknown as Prisma.InputJsonValue,
      diferente: diferente as unknown as Prisma.InputJsonValue,
      raport: raport as unknown as Prisma.InputJsonValue,
      erori: erori as unknown as Prisma.InputJsonValue,
      avertizari: avertizari as unknown as Prisma.InputJsonValue,
      randuri: {
        produse: toateProdusele,
        referinte: fisiereReferinte.map((f) => ({ tip: f.tip, randuri: f.referinte })),
      } as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.jurnalIntrare.create({
    data: {
      utilizatorId: utilizator.id,
      numeUtilizatorLaMoment: utilizator.nume,
      entitate: "ImportPropunere",
      entitateId: propunere.id,
      actiune: "import_analiza",
      valoareDupa: `${fisiere.length} fișiere, ${erori.length} erori, ${avertizari.length} avertizări`,
    },
  });

  return propunere;
}

export { TIPURI_REFERINTA };
