import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { Prisma, type StatusLogistic, type TipDocument, type Utilizator } from "@prisma/client";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { env } from "../../env.js";
import { gasesteSauCreeazaClient, normalizeazaTelefon, numarComplet, schemaClient } from "../ofe/clienti.js";
import { ETICHETA_ORICE_DOCUMENT } from "../ofe/documente/index.js";
import { urmatorulNumar } from "../ofe/numerotare.js";
import { filtruVizibilitateComenzi, poateAloca, poateCreaComandaManuala, poateModificaDetalii, poateOperaLogistic, poateVedeaComanda, vedeDocumentulComenzii } from "./vizibilitate.js";

// Tabelul de comenzi (S19; FISA-COMENZI cap. 1, 3, 4b, 6; FISA-OFERTARE cap. 16):
// lista comuna cu numaratorile din cap, cautarea, filtrele, ordinea (invers cronologic
// dupa intrarea in tabel; comenzile inchise - Livrat, pana la S20 "Livrat si incasat" -
// la sfarsit, ascunse implicit), randul desfasurat (livrare si facturare, statusuri cu
// istoric, observatii cu istoric + notitele si atasamentele ofertei in citire),
// comenzile manuale (seria CM, contul alocat sau "neidentificata"), "Doc." din
// documentele existente ale ofertei. Incasarile, comisioanele, retururile, paletii si
// fisa soferului vin in S20-S23.

export const comenziRouter = Router();

export const SERIE_MANUALA = "CM";

export const ETICHETA_STATUS_LOGISTIC: Record<StatusLogistic, string> = {
  COMANDAT: "Comandat",
  RECEPTIONAT: "Recepționat",
  RECEPTIONAT_PARTIAL: "Recepționat parțial",
  LIVRAT: "Livrat",
};

// tranzitiile logistice (cap. 3): Comandat -> Receptionat / Receptionat partial -> Livrat;
// partialul poate deveni Receptionat cand vine tot
const TRANZITII: Record<StatusLogistic, StatusLogistic[]> = {
  COMANDAT: ["RECEPTIONAT", "RECEPTIONAT_PARTIAL"],
  RECEPTIONAT_PARTIAL: ["RECEPTIONAT", "LIVRAT"],
  RECEPTIONAT: ["LIVRAT"],
  LIVRAT: [],
};

// documentele ofertei care se deschid din comanda (cap. 6): formularele Bilka,
// detaliata, tabelul de facturare - nimic nou generat aici
const DOCUMENTE_COMENZII: (TipDocument | "FORMULAR_BILKA")[] = ["FORMULAR_BILKA", "DETALIATA", "TABEL_FACTURARE"];

export class EroareComanda extends Error {
  constructor(
    message: string,
    public status = 400,
    public motive?: string[],
  ) {
    super(message);
  }
}

const suma = z
  .string()
  .trim()
  .regex(/^-?\d+([.,]\d{1,2})?$/, "sumă cu cel mult două zecimale")
  .transform((s) => s.replace(",", "."));
const textOptional = z.string().trim().max(2000).nullish();
const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dată în forma AAAA-LL-ZZ");

const schemaFiltre = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(["COMANDAT", "RECEPTIONAT", "RECEPTIONAT_PARTIAL", "LIVRAT"]).optional(),
  deLa: dataIso.optional(),
  panaLa: dataIso.optional(),
  agent: z.string().trim().max(400).optional(),
  firmaId: z.string().trim().optional(),
  inchise: z.enum(["da"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const schemaComandaManuala = z.object({
  firmaId: z.string().trim().min(1).optional(),
  // clientul: nume, telefon, localitate (cap. 4b) - adresa e optionala aici, baza
  // comuna o primeste din localitate cand lipseste
  client: schemaClient.extend({ adresa: z.string().trim().max(300).optional() }),
  rezumat: z.string().trim().min(1, "rezumatul comenzii lipsește").max(2000),
  totalLei: suma,
  totalCuTvaEur: suma.optional(),
  avansLei: suma.optional(),
  montator: z.object({ nume: z.string().trim().min(1).max(200), telefon: z.string().trim().max(50).nullish() }).nullish(),
  contAlocatId: z.string().trim().min(1).nullish(),
  indicatiiLivrare: textOptional,
  dataLivrarii: dataIso.nullish(),
  observatie: textOptional,
});

const schemaStatus = z.object({
  status: z.enum(["COMANDAT", "RECEPTIONAT", "RECEPTIONAT_PARTIAL", "LIVRAT"]),
  notaLipsuri: textOptional,
  mentiuni: textOptional,
});
const schemaLivrare = z.object({ indicatii: textOptional, dataLivrarii: dataIso.nullish() });
const schemaFacturare = z.object({ firma: textOptional, cui: z.string().trim().max(50).nullish(), adresa: textOptional });
const schemaContacte = z.object({ clientTelefon: z.string().trim().min(6).max(50).optional(), montatorNume: z.string().trim().max(200).nullish(), montatorTelefon: z.string().trim().max(50).nullish() });
const schemaAlocare = z.object({ contAlocatId: z.string().trim().min(1).nullable(), mentiuni: textOptional });
const schemaObservatie = z.object({ text: z.string().trim().min(1, "observația e goală").max(4000) });

const dataLocala = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const dataDoar = (d: Date) => d.toISOString().slice(0, 10);
const idDin = (req: { params: Record<string, unknown> }) => String(req.params.id ?? "");
const text = (v: unknown): string | null => (v === null || v === undefined ? null : v instanceof Date ? dataDoar(v) : String(v));

type Tx = Prisma.TransactionClient | typeof prisma;

interface IntrareIstoricComanda {
  tip: string;
  camp?: string | null;
  inainte?: string | null;
  dupa?: string | null;
  mentiuni?: string | null;
}

async function scrieIstoricComanda(tx: Tx, comandaId: string, u: Utilizator, intrari: IntrareIstoricComanda[]): Promise<void> {
  if (intrari.length === 0) return;
  await tx.comandaIstoric.createMany({
    data: intrari.map((i) => ({ comandaId, utilizatorId: u.id, numeUtilizatorLaMoment: u.nume, tip: i.tip, camp: i.camp ?? null, valoareInainte: i.inainte ?? null, valoareDupa: i.dupa ?? null, mentiuni: (i.mentiuni ?? "").trim() || null })),
  });
}

// ------------------------------------------------------------------ randul listei

const includeRand = {
  firma: { select: { id: true, denumire: true } },
  responsabil: { select: { id: true, nume: true, rol: true } },
  contAlocat: { select: { id: true, nume: true, rol: true } },
  oferta: { select: { id: true, utilizatorId: true, localitate: true, completareLa: { select: { serie: true, numar: true } }, motivCompletare: true } },
} satisfies Prisma.ComandaInclude;

type ComandaCuRelatii = Prisma.ComandaGetPayload<{ include: typeof includeRand }>;

function spreRand(c: ComandaCuRelatii) {
  const manuala = c.tip === "MANUALA";
  return {
    id: c.id,
    numarComplet: numarComplet(c.serie, c.numar),
    tip: c.tip,
    manuala,
    data: dataDoar(c.data),
    intratLa: c.createdAt,
    firma: c.firma,
    responsabil: c.responsabil,
    // "trimisa de ..." la comenzile din oferta; "adaugat de ... pentru: ..." / "neidentificata" la manuale
    contAlocat: c.contAlocat,
    neidentificata: manuala && !c.contAlocatId,
    ofertaId: c.ofertaId,
    completareLa: c.oferta?.completareLa ? { numarComplet: numarComplet(c.oferta.completareLa.serie, c.oferta.completareLa.numar), motiv: c.oferta.motivCompletare } : null,
    client: { nume: c.clientNume, telefon: c.clientTelefon, localitate: c.clientLocalitate },
    rezumat: c.rezumat,
    montator: c.montatorNume ? { nume: c.montatorNume, telefon: c.montatorTelefon } : null,
    totalLei: c.totalLei.toFixed(2),
    totalCuTvaEur: c.totalCuTvaEur.toFixed(2),
    avansLei: c.avansLei.toFixed(2),
    restLei: c.restLei.toFixed(2),
    statusLogistic: c.statusLogistic,
    statusLogisticEticheta: ETICHETA_STATUS_LOGISTIC[c.statusLogistic],
    statusLogisticLa: c.statusLogisticLa,
    notaLipsuri: c.notaLipsuri,
    livratLa: c.livratLa,
    livrare: { indicatii: c.indicatiiLivrare, nume: c.indicatiiLivrareNume, la: c.indicatiiLivrareLa, data: c.dataLivrarii ? dataDoar(c.dataLivrarii) : null },
    facturare: c.facturareFirma || c.facturareCui || c.facturareAdresa ? { firma: c.facturareFirma, cui: c.facturareCui, adresa: c.facturareAdresa } : null,
    // S20: incasarile; pana atunci statusul incasarii nu e derivat din nimic
    inchisa: c.statusLogistic === "LIVRAT",
  };
}

// ------------------------------------------------------------------ lista

comenziRouter.get("/", async (req, res) => {
  const u = req.utilizator!;
  const vizibilitate = await filtruVizibilitateComenzi(u);
  if (!vizibilitate) {
    res.status(403).json({ eroare: "Contul nu are acces la comenzi" });
    return;
  }
  const f = schemaFiltre.parse(req.query);
  const conditii: Prisma.ComandaWhereInput[] = [vizibilitate];
  const panaLa = f.panaLa ?? dataLocala(new Date());
  const deLa = f.deLa ?? dataDoar(new Date(new Date(`${panaLa}T00:00:00Z`).getTime() - 90 * 24 * 3600 * 1000));
  conditii.push({ data: { gte: new Date(`${deLa}T00:00:00Z`), lte: new Date(`${panaLa}T00:00:00Z`) } });
  if (f.q) {
    const q = f.q;
    const cifre = normalizeazaTelefon(q);
    const numar = /^([A-Za-z]{2,3})-?(\d+)$/.exec(q);
    conditii.push({
      OR: [
        { clientNume: { contains: q, mode: "insensitive" } },
        { clientLocalitate: { contains: q, mode: "insensitive" } },
        { montatorNume: { contains: q, mode: "insensitive" } },
        ...(cifre.length >= 4 ? [{ clientTelefon: { contains: cifre } }, { montatorTelefon: { contains: cifre } }] : []),
        ...(numar ? [{ serie: { equals: numar[1].toUpperCase() }, numar: Number(numar[2]) }] : []),
      ],
    });
  }
  // agentul (Administrator, Admin general): contul alocat; "neidentificate" = fara cont
  if (f.agent && (u.rol === "ADMINISTRATOR" || u.rol === "ADMIN_GENERAL")) {
    if (f.agent === "neidentificate") conditii.push({ contAlocatId: null, tip: "MANUALA" });
    else conditii.push({ contAlocatId: { in: f.agent.split(",").map((s) => s.trim()).filter(Boolean) } });
  }
  if (f.firmaId && (u.rol === "ADMIN_GENERAL" || u.rol === "ADMINISTRATOR" || u.rol === "CONTABILITATE" || u.rol === "GESTIUNE")) conditii.push({ firmaId: f.firmaId });

  const whereBaza: Prisma.ComandaWhereInput = { AND: conditii };
  const where: Prisma.ComandaWhereInput = f.status ? { AND: [...conditii, { statusLogistic: f.status }] } : whereBaza;
  const [toate, peStatus, neidentificate] = await Promise.all([
    prisma.comanda.findMany({ where, include: includeRand }),
    prisma.comanda.groupBy({ by: ["statusLogistic"], where: whereBaza, _count: { _all: true } }),
    prisma.comanda.count({ where: { AND: [...conditii, { tip: "MANUALA", contAlocatId: null }] } }),
  ]);
  const numar = (s: StatusLogistic) => peStatus.find((n) => n.statusLogistic === s)?._count._all ?? 0;

  // ordinea (cap. 1): invers cronologic dupa intrarea in tabel; comenzile inchise la sfarsit,
  // in aceeasi ordine, ascunse implicit ("Arata si comenzile inchise")
  const dupaIntrare = (a: ComandaCuRelatii, b: ComandaCuRelatii) => b.createdAt.getTime() - a.createdAt.getTime();
  const deschise = toate.filter((c) => c.statusLogistic !== "LIVRAT").sort(dupaIntrare);
  const inchise = f.inchise === "da" || f.status === "LIVRAT" ? toate.filter((c) => c.statusLogistic === "LIVRAT").sort(dupaIntrare) : [];
  const ordonate = [...deschise, ...inchise];
  const pagina = ordonate.slice((f.page - 1) * f.pageSize, f.page * f.pageSize);

  res.json({
    comenzi: pagina.map(spreRand),
    total: ordonate.length,
    page: f.page,
    pageSize: f.pageSize,
    numaratori: {
      active: numar("COMANDAT") + numar("RECEPTIONAT") + numar("RECEPTIONAT_PARTIAL"),
      deReceptionat: numar("COMANDAT") + numar("RECEPTIONAT_PARTIAL"),
      livrate: numar("LIVRAT"),
      // S20: incasarile si comisioanele
      neincasate: 0,
      comisioaneNeachitate: 0,
      neidentificate,
    },
    perioada: { deLa, panaLa },
  });
});

// ------------------------------------------------------------------ listele ecranului

// firmele pentru filtrul "Firma" si pentru comanda manuala: cele pe care contul le vede
comenziRouter.get("/firme", async (req, res) => {
  const u = req.utilizator!;
  const vizibilitate = await filtruVizibilitateComenzi(u);
  if (!vizibilitate) {
    res.status(403).json({ eroare: "Contul nu are acces la comenzi" });
    return;
  }
  const where = u.rol === "AGENT" || u.rol === "COLABORATOR" ? { id: u.firmaId ?? "" } : "firmaId" in vizibilitate && vizibilitate.firmaId && typeof vizibilitate.firmaId === "object" && "in" in vizibilitate.firmaId ? { id: { in: vizibilitate.firmaId.in as string[] } } : {};
  const firme = await prisma.firma.findMany({ where: { ...where, activ: true }, select: { id: true, denumire: true }, orderBy: { denumire: "asc" } });
  res.json({ firme });
});

// conturile pentru filtrul "Agent" si pentru contul alocat al comenzii manuale: conturile
// care fac oferte din firmele vazute (Administrator, Agent, Colaborator)
comenziRouter.get("/conturi", async (req, res) => {
  const u = req.utilizator!;
  const vizibilitate = await filtruVizibilitateComenzi(u);
  if (!vizibilitate || u.rol === "COLABORATOR") {
    res.status(403).json({ eroare: "Contul nu are acces la lista de conturi" });
    return;
  }
  const firme = u.rol === "AGENT" ? [u.firmaId ?? ""] : "firmaId" in vizibilitate && vizibilitate.firmaId && typeof vizibilitate.firmaId === "object" && "in" in vizibilitate.firmaId ? (vizibilitate.firmaId.in as string[]) : null;
  const conturi = await prisma.utilizator.findMany({
    where: { activ: true, rol: { in: ["ADMINISTRATOR", "AGENT", "COLABORATOR"] }, ...(firme ? { firmaId: { in: firme } } : {}) },
    select: { id: true, nume: true, rol: true, firmaId: true },
    orderBy: [{ firmaId: "asc" }, { nume: "asc" }],
  });
  res.json({ conturi });
});

// ------------------------------------------------------------------ o comanda

async function comandaVizibila(u: Utilizator, id: string) {
  const c = await prisma.comanda.findUnique({ where: { id }, include: includeRand });
  return c && (await poateVedeaComanda(u, c)) ? c : null;
}

function drepturi(u: Utilizator, c: ComandaCuRelatii) {
  return {
    logistic: poateOperaLogistic(u),
    detalii: poateModificaDetalii(u, c),
    livrare: poateOperaLogistic(u) || (u.rol === "AGENT" && c.contAlocatId === u.id),
    alocare: poateAloca(u) && c.tip === "MANUALA",
  };
}

comenziRouter.get("/:id", async (req, res) => {
  const u = req.utilizator!;
  const c = await comandaVizibila(u, idDin(req));
  if (!c) {
    res.status(404).json({ eroare: "Comanda nu există sau nu e vizibilă" });
    return;
  }
  const [istoric, observatii, atasamente, documente, notiteOferta, atasamenteOferta] = await Promise.all([
    prisma.comandaIstoric.findMany({ where: { comandaId: c.id }, orderBy: { moment: "desc" } }),
    prisma.comandaObservatie.findMany({ where: { comandaId: c.id }, orderBy: { moment: "desc" } }),
    prisma.comandaAtasament.findMany({ where: { comandaId: c.id }, orderBy: { moment: "desc" }, include: { incarcatDe: { select: { nume: true } } } }),
    c.ofertaId ? prisma.ofertaDocument.findMany({ where: { ofertaId: c.ofertaId, tip: { in: DOCUMENTE_COMENZII as TipDocument[] } }, orderBy: [{ generatLa: "desc" }], include: { generatDe: { select: { nume: true } } } }) : Promise.resolve([]),
    c.ofertaId ? prisma.ofertaNotita.findMany({ where: { ofertaId: c.ofertaId }, orderBy: { moment: "desc" } }) : Promise.resolve([]),
    c.ofertaId ? prisma.ofertaAtasament.findMany({ where: { ofertaId: c.ofertaId }, orderBy: { moment: "desc" }, include: { incarcatDe: { select: { nume: true } } } }) : Promise.resolve([]),
  ]);
  const formulare = documente.filter((d) => d.tip === "FORMULAR_BILKA");
  res.json({
    comanda: {
      ...spreRand(c),
      drepturi: drepturi(u, c),
      istoric: istoric.map((i) => ({ id: i.id, moment: i.moment, numeUtilizatorLaMoment: i.numeUtilizatorLaMoment, tip: i.tip, camp: i.camp, valoareInainte: i.valoareInainte, valoareDupa: i.valoareDupa, mentiuni: i.mentiuni })),
      observatii: observatii.map((o) => ({ id: o.id, moment: o.moment, numeUtilizatorLaMoment: o.numeUtilizatorLaMoment, text: o.text })),
      atasamente: atasamente.map((a) => ({ id: a.id, nume: a.nume, tipMime: a.tipMime, marime: a.marime, moment: a.moment, incarcatDe: a.incarcatDe?.nume ?? null })),
      // documentele ofertei (cap. 6) - doar cele pe care rolul le poate vedea
      documente: documente
        .filter((d) => vedeDocumentulComenzii(u, d.tip))
        .map((d) => ({ id: d.id, tip: d.tip, eticheta: ETICHETA_ORICE_DOCUMENT[d.tip], versiune: d.versiune, nume: d.nume, marime: d.marime, generatLa: d.generatLa, generatDe: d.generatDe?.nume ?? null, transmisLa: d.transmisLa, canal: d.canal, formularNr: d.formularNr })),
      // "formular Bilka: N formulare, trimise la ..." (cap. 16): din documentele marcate ca transmise
      formulareBilka: { generate: formulare.length, transmise: formulare.filter((d) => d.transmisLa).length, ultimaTrimitere: formulare.map((d) => d.transmisLa).filter((d): d is Date => d !== null).sort((a, b) => b.getTime() - a.getTime())[0] ?? null },
      // notitele si atasamentele ofertei raman accesibile din comanda (cap. 14), in citire
      notiteOferta: notiteOferta.map((n) => ({ id: n.id, moment: n.moment, numeUtilizatorLaMoment: n.numeUtilizatorLaMoment, text: n.text })),
      atasamenteOferta: atasamenteOferta.map((a) => ({ id: a.id, nume: a.nume, tipMime: a.tipMime, marime: a.marime, moment: a.moment, incarcatDe: a.incarcatDe?.nume ?? null })),
    },
  });
});

// ------------------------------------------------------------------ comanda manuala (cap. 4b)

export async function creeazaComandaManuala(date: z.infer<typeof schemaComandaManuala>, u: Utilizator) {
  if (!poateCreaComandaManuala(u)) throw new EroareComanda("Comenzile manuale le adaugă Administratorii și Gestiunea", 403);
  // firma: a Administratorului; Admin general si Gestiunea o aleg (Gestiunea dintre firmele ei)
  let firmaId = u.rol === "ADMINISTRATOR" ? u.firmaId : date.firmaId;
  if (u.rol === "GESTIUNE") {
    const vizibil = await filtruVizibilitateComenzi(u);
    const firme = vizibil && "firmaId" in vizibil && vizibil.firmaId && typeof vizibil.firmaId === "object" && "in" in vizibil.firmaId ? (vizibil.firmaId.in as string[]) : null;
    if (!date.firmaId && firme?.length === 1) firmaId = firme[0];
    if (!firmaId) throw new EroareComanda("Alege firma comenzii", 400);
    if (firme && !firme.includes(firmaId)) throw new EroareComanda("Contul nu are acces la firma aleasă", 403);
  }
  if (!firmaId) throw new EroareComanda("Alege firma comenzii", 400);
  const firma = await prisma.firma.findUnique({ where: { id: firmaId }, select: { id: true } });
  if (!firma) throw new EroareComanda("Firma nu există", 404);
  let contAlocat: { id: string; nume: string } | null = null;
  if (date.contAlocatId) {
    contAlocat = await prisma.utilizator.findUnique({ where: { id: date.contAlocatId }, select: { id: true, nume: true } });
    if (!contAlocat) throw new EroareComanda("Contul alocat nu există", 404);
  }
  const total = new Prisma.Decimal(date.totalLei);
  const avans = new Prisma.Decimal(date.avansLei ?? "0");
  const acum = new Date();
  return prisma.$transaction(async (tx) => {
    const { client } = await gasesteSauCreeazaClient(tx, { ...date.client, adresa: date.client.adresa || date.client.localitate || "-" }, u);
    const numar = await urmatorulNumar(tx, SERIE_MANUALA);
    const c = await tx.comanda.create({
      data: {
        firmaId: firma.id,
        responsabilId: u.id,
        serie: SERIE_MANUALA,
        numar,
        data: new Date(`${dataLocala(acum)}T00:00:00Z`),
        tip: "MANUALA",
        contAlocatId: contAlocat?.id ?? null,
        clientId: client.id,
        clientNume: date.client.nume,
        clientTelefon: date.client.telefon,
        clientLocalitate: date.client.localitate ?? null,
        montatorNume: date.montator?.nume ?? null,
        montatorTelefon: date.montator?.telefon ?? null,
        rezumat: date.rezumat,
        totalLei: total,
        totalCuTvaEur: new Prisma.Decimal(date.totalCuTvaEur ?? "0"),
        avansLei: avans,
        restLei: total.minus(avans),
        statusLogisticLa: acum,
        indicatiiLivrare: date.indicatiiLivrare?.trim() || null,
        indicatiiLivrareNume: date.indicatiiLivrare?.trim() ? u.nume : null,
        indicatiiLivrareLa: date.indicatiiLivrare?.trim() ? acum : null,
        dataLivrarii: date.dataLivrarii ? new Date(`${date.dataLivrarii}T00:00:00Z`) : null,
      },
      include: includeRand,
    });
    await scrieIstoricComanda(tx, c.id, u, [
      { tip: "creare", camp: "tip", dupa: "manuală" },
      { tip: "status", camp: "statusLogistic", inainte: null, dupa: ETICHETA_STATUS_LOGISTIC.COMANDAT },
      { tip: "alocare", camp: "contAlocat", inainte: null, dupa: contAlocat?.nume ?? "neidentificată" },
    ]);
    if (date.observatie?.trim()) await tx.comandaObservatie.create({ data: { comandaId: c.id, utilizatorId: u.id, numeUtilizatorLaMoment: u.nume, text: date.observatie.trim() } });
    return c;
  });
}

comenziRouter.post("/", async (req, res) => {
  const u = req.utilizator!;
  const date = schemaComandaManuala.parse(req.body);
  try {
    const c = await creeazaComandaManuala(date, u);
    res.status(201).json({ comanda: spreRand(c) });
  } catch (e) {
    if (e instanceof EroareComanda) {
      res.status(e.status).json({ eroare: e.message, motive: e.motive });
      return;
    }
    throw e;
  }
});

// ------------------------------------------------------------------ statusul logistic (cap. 3)

export async function schimbaStatusLogistic(comandaId: string, date: z.infer<typeof schemaStatus>, u: Utilizator) {
  const c = await comandaVizibila(u, comandaId);
  if (!c) throw new EroareComanda("Comanda nu există sau nu e vizibilă", 404);
  if (!poateOperaLogistic(u)) throw new EroareComanda("Statusul logistic îl schimbă Administratorii și Gestiunea", 403);
  const permise = TRANZITII[c.statusLogistic];
  if (!permise.includes(date.status)) {
    throw new EroareComanda(`Din „${ETICHETA_STATUS_LOGISTIC[c.statusLogistic]}” se poate trece doar la ${permise.length ? permise.map((s) => `„${ETICHETA_STATUS_LOGISTIC[s]}”`).join(" sau ") : "nimic (comanda e livrată)"}`, 409);
  }
  const nota = date.notaLipsuri?.trim() || null;
  if (date.status === "RECEPTIONAT_PARTIAL" && !nota) throw new EroareComanda("La „Recepționat parțial” se notează lipsurile", 400);
  const acum = new Date();
  return prisma.$transaction(async (tx) => {
    const dupa = await tx.comanda.update({
      where: { id: c.id },
      data: { statusLogistic: date.status, statusLogisticLa: acum, notaLipsuri: date.status === "RECEPTIONAT_PARTIAL" ? nota : c.notaLipsuri, livratLa: date.status === "LIVRAT" ? acum : c.livratLa },
      include: includeRand,
    });
    await scrieIstoricComanda(tx, c.id, u, [
      { tip: "status", camp: "statusLogistic", inainte: ETICHETA_STATUS_LOGISTIC[c.statusLogistic], dupa: ETICHETA_STATUS_LOGISTIC[date.status], mentiuni: date.mentiuni },
      ...(date.status === "RECEPTIONAT_PARTIAL" ? [{ tip: "lipsuri", camp: "notaLipsuri", inainte: c.notaLipsuri, dupa: nota }] : []),
    ]);
    return dupa;
  });
}

comenziRouter.put("/:id/status-logistic", async (req, res) => {
  const date = schemaStatus.parse(req.body);
  try {
    const c = await schimbaStatusLogistic(idDin(req), date, req.utilizator!);
    res.json({ comanda: spreRand(c) });
  } catch (e) {
    if (e instanceof EroareComanda) {
      res.status(e.status).json({ eroare: e.message });
      return;
    }
    throw e;
  }
});

// ------------------------------------------------------------------ livrarea, facturarea, contactele, alocarea

async function cuDrepturi(req: { params: Record<string, unknown> }, u: Utilizator, verifica: (c: ComandaCuRelatii) => boolean, mesaj: string) {
  const c = await comandaVizibila(u, idDin(req));
  if (!c) throw new EroareComanda("Comanda nu există sau nu e vizibilă", 404);
  if (!verifica(c)) throw new EroareComanda(mesaj, 403);
  return c;
}

function raspunde(res: { status: (n: number) => { json: (b: unknown) => void }; json: (b: unknown) => void }, e: unknown) {
  if (e instanceof EroareComanda) {
    res.status(e.status).json({ eroare: e.message });
    return;
  }
  throw e;
}

comenziRouter.put("/:id/livrare", async (req, res) => {
  const u = req.utilizator!;
  const date = schemaLivrare.parse(req.body);
  try {
    const c = await cuDrepturi(req, u, (x) => drepturi(u, x).livrare, "Livrarea o programează Gestiunea, Administratorii și agentul pe comenzile lui");
    const acum = new Date();
    // un camp netrimis ramane cum era; trimis gol = sters
    const indicatii = date.indicatii === undefined ? c.indicatiiLivrare : date.indicatii?.trim() || null;
    const dataLivrarii = date.dataLivrarii === undefined ? c.dataLivrarii : date.dataLivrarii ? new Date(`${date.dataLivrarii}T00:00:00Z`) : null;
    const schimbaIndicatii = indicatii !== c.indicatiiLivrare;
    const dupa = await prisma.$transaction(async (tx) => {
      const d = await tx.comanda.update({
        where: { id: c.id },
        data: {
          indicatiiLivrare: indicatii,
          indicatiiLivrareNume: schimbaIndicatii ? (indicatii ? u.nume : null) : c.indicatiiLivrareNume,
          indicatiiLivrareLa: schimbaIndicatii ? (indicatii ? acum : null) : c.indicatiiLivrareLa,
          dataLivrarii,
        },
        include: includeRand,
      });
      await scrieIstoricComanda(tx, c.id, u, [
        ...(indicatii !== c.indicatiiLivrare ? [{ tip: "livrare", camp: "indicatiiLivrare", inainte: c.indicatiiLivrare, dupa: indicatii }] : []),
        ...(text(dataLivrarii) !== text(c.dataLivrarii) ? [{ tip: "livrare", camp: "dataLivrarii", inainte: text(c.dataLivrarii), dupa: text(dataLivrarii) }] : []),
      ]);
      return d;
    });
    res.json({ comanda: spreRand(dupa) });
  } catch (e) {
    raspunde(res, e);
  }
});

comenziRouter.put("/:id/facturare", async (req, res) => {
  const u = req.utilizator!;
  const date = schemaFacturare.parse(req.body);
  try {
    const c = await cuDrepturi(req, u, (x) => poateModificaDetalii(u, x), "Datele de facturare le completează cine operează comanda sau contul ei");
    const noi = { facturareFirma: date.firma?.trim() || null, facturareCui: date.cui?.trim() || null, facturareAdresa: date.adresa?.trim() || null };
    const dupa = await prisma.$transaction(async (tx) => {
      const d = await tx.comanda.update({ where: { id: c.id }, data: noi, include: includeRand });
      await scrieIstoricComanda(
        tx,
        c.id,
        u,
        (Object.keys(noi) as (keyof typeof noi)[]).filter((k) => noi[k] !== c[k]).map((k) => ({ tip: "facturare", camp: k, inainte: c[k], dupa: noi[k] })),
      );
      return d;
    });
    res.json({ comanda: spreRand(dupa) });
  } catch (e) {
    raspunde(res, e);
  }
});

comenziRouter.put("/:id/contacte", async (req, res) => {
  const u = req.utilizator!;
  const date = schemaContacte.parse(req.body);
  try {
    const c = await cuDrepturi(req, u, (x) => poateModificaDetalii(u, x), "Contactele le modifică cine operează comanda sau contul ei");
    const noi = {
      clientTelefon: date.clientTelefon ?? c.clientTelefon,
      montatorNume: date.montatorNume === undefined ? c.montatorNume : date.montatorNume?.trim() || null,
      montatorTelefon: date.montatorTelefon === undefined ? c.montatorTelefon : date.montatorTelefon?.trim() || null,
    };
    const dupa = await prisma.$transaction(async (tx) => {
      const d = await tx.comanda.update({ where: { id: c.id }, data: noi, include: includeRand });
      await scrieIstoricComanda(
        tx,
        c.id,
        u,
        (Object.keys(noi) as (keyof typeof noi)[]).filter((k) => noi[k] !== c[k]).map((k) => ({ tip: "contact", camp: k, inainte: c[k], dupa: noi[k] })),
      );
      return d;
    });
    res.json({ comanda: spreRand(dupa) });
  } catch (e) {
    raspunde(res, e);
  }
});

comenziRouter.put("/:id/alocare", async (req, res) => {
  const u = req.utilizator!;
  const date = schemaAlocare.parse(req.body);
  try {
    const c = await cuDrepturi(req, u, (x) => drepturi(u, x).alocare, "Alocarea comenzilor manuale o schimbă doar Administratorii");
    let cont: { id: string; nume: string } | null = null;
    if (date.contAlocatId) {
      cont = await prisma.utilizator.findUnique({ where: { id: date.contAlocatId }, select: { id: true, nume: true } });
      if (!cont) throw new EroareComanda("Contul alocat nu există", 404);
    }
    const dupa = await prisma.$transaction(async (tx) => {
      const d = await tx.comanda.update({ where: { id: c.id }, data: { contAlocatId: cont?.id ?? null }, include: includeRand });
      if ((cont?.id ?? null) !== c.contAlocatId) await scrieIstoricComanda(tx, c.id, u, [{ tip: "alocare", camp: "contAlocat", inainte: c.contAlocat?.nume ?? "neidentificată", dupa: cont?.nume ?? "neidentificată", mentiuni: date.mentiuni }]);
      return d;
    });
    res.json({ comanda: spreRand(dupa) });
  } catch (e) {
    raspunde(res, e);
  }
});

// ------------------------------------------------------------------ observatii (se adauga, nu se rescriu)

comenziRouter.post("/:id/observatii", async (req, res) => {
  const u = req.utilizator!;
  const date = schemaObservatie.parse(req.body);
  try {
    const c = await cuDrepturi(req, u, (x) => poateModificaDetalii(u, x), "Observațiile le adaugă cine operează comanda sau contul ei");
    const o = await prisma.comandaObservatie.create({ data: { comandaId: c.id, utilizatorId: u.id, numeUtilizatorLaMoment: u.nume, text: date.text } });
    res.status(201).json({ observatie: { id: o.id, moment: o.moment, numeUtilizatorLaMoment: o.numeUtilizatorLaMoment, text: o.text } });
  } catch (e) {
    raspunde(res, e);
  }
});

// ------------------------------------------------------------------ atasamente (in folderul de date, comenzi/<id>/)

const incarcare = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024, files: 1 } });
const numeSigur = (nume: string) =>
  nume
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .slice(0, 120);

comenziRouter.post("/:id/atasamente", incarcare.single("fisier"), async (req, res) => {
  const u = req.utilizator!;
  try {
    const c = await cuDrepturi(req, u, (x) => poateModificaDetalii(u, x), "Atașamentele le adaugă cine operează comanda sau contul ei");
    const f = req.file;
    if (!f) throw new EroareComanda("Lipsește fișierul", 400);
    const folder = path.join(env.dateDir, "comenzi", c.id);
    await fs.mkdir(folder, { recursive: true });
    const numeOriginal = Buffer.from(f.originalname, "latin1").toString("utf8");
    const numeFisier = `${randomUUID()}-${numeSigur(numeOriginal)}`;
    await fs.writeFile(path.join(folder, numeFisier), f.buffer);
    const a = await prisma.comandaAtasament.create({ data: { comandaId: c.id, nume: numeOriginal, fisier: path.join("comenzi", c.id, numeFisier), tipMime: f.mimetype, marime: f.size, incarcatDeId: u.id } });
    res.status(201).json({ atasament: { id: a.id, nume: a.nume, tipMime: a.tipMime, marime: a.marime, moment: a.moment, incarcatDe: u.nume } });
  } catch (e) {
    raspunde(res, e);
  }
});

comenziRouter.get("/:id/atasamente/:aid", async (req, res) => {
  const u = req.utilizator!;
  const c = await comandaVizibila(u, idDin(req));
  if (!c) {
    res.status(404).json({ eroare: "Comanda nu există sau nu e vizibilă" });
    return;
  }
  const a = await prisma.comandaAtasament.findFirst({ where: { id: String(req.params.aid), comandaId: c.id } });
  if (!a) {
    res.status(404).json({ eroare: "Atașamentul nu există" });
    return;
  }
  res.download(path.join(env.dateDir, a.fisier), a.nume);
});

// atasamentele ofertei, in citire, prin comanda (cap. 14)
comenziRouter.get("/:id/atasamente-oferta/:aid", async (req, res) => {
  const u = req.utilizator!;
  const c = await comandaVizibila(u, idDin(req));
  if (!c || !c.ofertaId) {
    res.status(404).json({ eroare: "Comanda nu există sau nu e vizibilă" });
    return;
  }
  const a = await prisma.ofertaAtasament.findFirst({ where: { id: String(req.params.aid), ofertaId: c.ofertaId } });
  if (!a) {
    res.status(404).json({ eroare: "Atașamentul nu există" });
    return;
  }
  res.download(path.join(env.dateDir, a.fisier), a.nume);
});

// ------------------------------------------------------------------ documentele ofertei, prin comanda (cap. 6)

const TIP_CONTINUT: Record<string, string> = { ".pdf": "application/pdf", ".xlsm": "application/vnd.ms-excel.sheet.macroEnabled.12" };

comenziRouter.get("/:id/documente/:did", async (req, res) => {
  const u = req.utilizator!;
  const c = await comandaVizibila(u, idDin(req));
  if (!c || !c.ofertaId) {
    res.status(404).json({ eroare: "Comanda nu există sau nu e vizibilă" });
    return;
  }
  const d = await prisma.ofertaDocument.findFirst({ where: { id: String(req.params.did), ofertaId: c.ofertaId } });
  if (!d || !(DOCUMENTE_COMENZII as string[]).includes(d.tip) || !vedeDocumentulComenzii(u, d.tip)) {
    res.status(404).json({ eroare: "Documentul nu există" });
    return;
  }
  const extensie = path.extname(d.nume).toLowerCase();
  res.setHeader("Content-Type", TIP_CONTINUT[extensie] ?? "application/octet-stream");
  res.setHeader("Content-Disposition", `${req.query.descarca === "da" || extensie !== ".pdf" ? "attachment" : "inline"}; filename="${d.nume}"`);
  res.sendFile(path.resolve(env.dateDir, d.fisier));
});
