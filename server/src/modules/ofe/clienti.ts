import type { Prisma, Utilizator } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { cereAutentificare } from "../accounts/middleware.js";
import { filtruVizibilitateOferte, ROLURI_CU_OFERTE } from "./vizibilitate.js";

// Clientii (FISA-OFERTARE cap. 2): baza comuna tuturor conturilor; telefonul
// normalizat e cheia de deduplicare; la telefon existent oferta se leaga de
// clientul existent; fisa clientului arata ofertele lui in limita vizibilitatii.

// doar cifre; prefixul +40 / 0040 devine 0 ("+40 728 192 569" = "0728192569")
export function normalizeazaTelefon(telefon: string): string {
  const t = telefon.trim();
  let cifre = t.replace(/\D/g, "");
  if (t.startsWith("+40")) cifre = `0${cifre.slice(2)}`;
  else if (cifre.startsWith("0040")) cifre = `0${cifre.slice(4)}`;
  else if (cifre.startsWith("40") && cifre.length >= 11) cifre = `0${cifre.slice(2)}`;
  return cifre;
}

export const schemaClient = z.object({
  nume: z.string().trim().min(2),
  telefon: z
    .string()
    .trim()
    .min(6)
    .refine((t) => normalizeazaTelefon(t).length >= 6, "Telefonul trebuie să aibă cel puțin 6 cifre"),
  adresa: z.string().trim().min(2),
  localitate: z.string().trim().nullish(),
  email: z.string().trim().email().nullish().or(z.literal("")),
  observatii: z.string().trim().nullish(),
});
export type DateClient = z.infer<typeof schemaClient>;

const CAMPURI_CLIENT = ["nume", "telefon", "adresa", "localitate", "email", "observatii"] as const;

function dateCurate(date: DateClient) {
  return {
    nume: date.nume,
    telefon: date.telefon,
    telefonNormalizat: normalizeazaTelefon(date.telefon),
    adresa: date.adresa,
    localitate: date.localitate || null,
    email: date.email || null,
    observatii: date.observatii || null,
  };
}

// clientul cu acest telefon, sau unul nou; datele trimise actualizeaza clientul
// existent (baza e comuna, ultimele date sunt cele bune), cu jurnal
export async function gasesteSauCreeazaClient(tx: Prisma.TransactionClient, date: DateClient, utilizator: Utilizator): Promise<{ client: { id: string }; nou: boolean }> {
  const curate = dateCurate(date);
  const existent = await tx.client.findUnique({ where: { telefonNormalizat: curate.telefonNormalizat } });
  if (existent) {
    const schimbat = CAMPURI_CLIENT.some((c) => (existent[c] ?? null) !== (curate[c] ?? null));
    if (schimbat) {
      await tx.client.update({ where: { id: existent.id }, data: curate });
      await scrieModificariTx(tx, utilizator, "Client", existent.id, [...CAMPURI_CLIENT], existent, curate);
    }
    return { client: existent, nou: false };
  }
  const client = await tx.client.create({ data: { ...curate, creatDeId: utilizator.id } });
  await tx.jurnalIntrare.create({ data: { utilizatorId: utilizator.id, numeUtilizatorLaMoment: utilizator.nume, entitate: "Client", entitateId: client.id, actiune: "creare" } });
  return { client, nou: true };
}

async function scrieModificariTx(tx: Prisma.TransactionClient, utilizator: Utilizator, entitate: string, entitateId: string, campuri: string[], inainte: Record<string, unknown>, dupa: Record<string, unknown>) {
  const laText = (v: unknown) => (v === null || v === undefined ? null : String(v));
  const randuri = campuri
    .filter((c) => laText(inainte[c]) !== laText(dupa[c]))
    .map((c) => ({ utilizatorId: utilizator.id, numeUtilizatorLaMoment: utilizator.nume, entitate, entitateId, actiune: "modificare", camp: c, valoareInainte: laText(inainte[c]), valoareDupa: laText(dupa[c]) }));
  if (randuri.length > 0) await tx.jurnalIntrare.createMany({ data: randuri });
}

export function clientPublic(c: { id: string; nume: string; telefon: string; adresa: string; localitate: string | null; email: string | null; observatii: string | null }) {
  return { id: c.id, nume: c.nume, telefon: c.telefon, adresa: c.adresa, localitate: c.localitate, email: c.email, observatii: c.observatii };
}

export const clientiRouter = Router();
clientiRouter.use(cereAutentificare);
clientiRouter.use((req, res, next) => {
  if (!ROLURI_CU_OFERTE.includes(req.utilizator!.rol) && req.utilizator!.rol !== "ADMIN_GENERAL") {
    res.status(403).json({ eroare: "Clienții se văd din zona de ofertare (Etapa 5 pentru Contabilitate / Gestiune)" });
    return;
  }
  next();
});

// cautare pentru autocompletare: dupa telefon (normalizat, prefix) sau nume
clientiRouter.get("/", async (req, res) => {
  const { telefon, q } = z.object({ telefon: z.string().trim().optional(), q: z.string().trim().optional() }).parse(req.query);
  const where: Prisma.ClientWhereInput = {};
  if (telefon && normalizeazaTelefon(telefon).length >= 4) where.telefonNormalizat = { startsWith: normalizeazaTelefon(telefon) };
  else if (q && q.length >= 2) where.OR = [{ nume: { contains: q, mode: "insensitive" } }, { localitate: { contains: q, mode: "insensitive" } }];
  else {
    res.json({ clienti: [] });
    return;
  }
  const clienti = await prisma.client.findMany({ where, orderBy: { nume: "asc" }, take: 10 });
  res.json({ clienti: clienti.map(clientPublic) });
});

// fisa clientului: datele lui si ofertele lui, in limita vizibilitatii contului
clientiRouter.get("/:id", async (req, res) => {
  const client = await prisma.client.findUnique({ where: { id: req.params.id } });
  if (!client) {
    res.status(404).json({ eroare: "Clientul nu există" });
    return;
  }
  const vizibilitate = filtruVizibilitateOferte(req.utilizator!);
  const oferte = vizibilitate
    ? await prisma.oferta.findMany({
        where: { AND: [vizibilitate, { clientId: client.id, curenta: true }] },
        orderBy: [{ data: "desc" }, { createdAt: "desc" }],
        select: { id: true, serie: true, numar: true, data: true, status: true, statusLa: true, updatedAt: true, utilizator: { select: { id: true, nume: true } }, completareLa: { select: { serie: true, numar: true } }, motivCompletare: true },
      })
    : [];
  res.json({ client: clientPublic(client), oferte: oferte.map((o) => ({ ...o, numarComplet: numarComplet(o.serie, o.numar) })) });
});

export function numarComplet(serie: string, numar: number): string {
  return `${serie}-${String(numar).padStart(4, "0")}`;
}
