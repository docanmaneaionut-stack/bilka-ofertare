import fs from "node:fs/promises";
import path from "node:path";
import type { TipDocument as TipDocumentDb, Utilizator } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../../db/prisma.js";
import { env } from "../../../env.js";
import { numarComplet } from "../clienti.js";
import { includeProduse } from "../intrareMot.js";
import { scrieIstoric } from "../istoric.js";
import { rezultatSauSalvat } from "../preturi.js";
import { poateVedeaOferta } from "../vizibilitate.js";
import { ETICHETA_DOCUMENT, garantiiDinDb, htmlDocument, type ContextDocument, type TipDocument } from "./continut.js";
import { randeazaPdf } from "./pdf.js";

// Documentele ofertei (FISA-OFERTARE cap. 13.6, 14; FISA-CONTURI §2): generate pe
// server din rezultatul motorului (sau din cel salvat la "Comandat"), pastrate in
// folderul de date al ofertei ca documente ale ofertei (tip, varianta, data-ora,
// fisier), listate pe pagina ofertei si in "PDF ▾"; "marcheaza ca transmis"
// (canal) scrie in istoric. Colaboratorul vede doar PDF-urile ofertei lui, nu
// tabelul de facturare; trimiterea efectiva pe e-mail / WhatsApp vine mai tarziu.

export const documenteRouter = Router({ mergeParams: true });

const TIPURI: TipDocument[] = ["OFERTA", "REZUMAT", "DETALIATA", "TABEL_FACTURARE"];
const schemaGenerare = z.object({ tip: z.enum(TIPURI as [TipDocument, ...TipDocument[]]) });
const schemaTransmis = z.object({ canal: z.enum(["WHATSAPP", "EMAIL", "PRINT"]), mentiuni: z.string().trim().max(2000).nullish() });

export class EroareDocument extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

// cine poate vedea / genera un document: cine vede oferta; colaboratorul nu
// primeste tabelul de facturare (FISA-CONTURI §2)
export function poateVedeaDocument(u: Utilizator, oferta: { utilizatorId: string; firmaId: string }, tip: TipDocument | "FORMULAR_BILKA"): boolean {
  if (!poateVedeaOferta(u, oferta)) return false;
  // colaboratorul nu primeste tabelul de facturare si nici formularul de comanda
  // Bilka (S16b: comanda firmei catre furnizor)
  if (u.rol === "COLABORATOR" && (tip === "TABEL_FACTURARE" || tip === "FORMULAR_BILKA")) return false;
  return true;
}

// eticheta oricarui document al ofertei (PDF-urile + formularul Bilka)
export const ETICHETA_ORICE_DOCUMENT: Record<TipDocumentDb, string> = { ...ETICHETA_DOCUMENT, FORMULAR_BILKA: "Formular Bilka" };
const TIP_CONTINUT: Record<string, string> = { ".pdf": "application/pdf", ".xlsm": "application/vnd.ms-excel.sheet.macroEnabled.12" };

const dataRo = (d: Date) => new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);

export async function contextDocument(o: { firmaId: string; utilizatorId: string; clientId: string; serie: string; numar: number; data: Date; versiune: number; curenta: boolean; tvaPct: { toString(): string }; adresaLucrarii: string | null; localitate: string | null; invelitori: { produsId: string | null }[]; linii: { produsId: string | null }[] }): Promise<ContextDocument> {
  const [firma, agent, client, garantii] = await Promise.all([
    prisma.firma.findUniqueOrThrow({ where: { id: o.firmaId }, select: { denumire: true, cui: true, nrRegCom: true, adresa: true, localitate: true, judet: true, telefon: true, email: true, logo: true } }),
    prisma.utilizator.findUniqueOrThrow({ where: { id: o.utilizatorId }, select: { nume: true, telefon: true, email: true } }),
    prisma.client.findUniqueOrThrow({ where: { id: o.clientId }, select: { nume: true, telefon: true, adresa: true, localitate: true } }),
    prisma.garantieFinisajGrosime.findMany({ where: { activ: true }, select: { finisaj: true, grosime: true, garantieCuloareAni: true, garantieCoroziuneAni: true } }),
  ]);
  const ids = [...new Set([...o.invelitori, ...o.linii].map((x) => x.produsId).filter((x): x is string => Boolean(x)))];
  const compartimente = ids.length ? await prisma.produs.findMany({ where: { id: { in: ids } }, select: { compartiment: { select: { denumire: true } } }, distinct: ["compartimentId"] }) : [];
  return {
    firma,
    agent,
    // adresa lucrarii de pe oferta (cap. 2b), nu cea din fisa clientului
    client: { nume: client.nume, telefon: client.telefon, adresa: o.adresaLucrarii ?? client.adresa, localitate: o.localitate ?? client.localitate },
    numarComplet: numarComplet(o.serie, o.numar),
    data: dataRo(o.data),
    versiune: o.versiune,
    curenta: o.curenta,
    garantii: garantiiDinDb(garantii),
    furnizori: compartimente.map((c) => c.compartiment.denumire),
    tvaPct: Number(o.tvaPct.toString()),
  };
}

// HTML-ul unui document (folosit si de teste, fara PDF)
export async function htmlPentru(ofertaId: string, tip: TipDocument): Promise<{ html: string; subsolStanga: string; versiune: number; numarComplet: string }> {
  const o = await prisma.oferta.findUniqueOrThrow({ where: { id: ofertaId }, include: includeProduse });
  if (o.invelitori.length === 0 && o.linii.length === 0) throw new EroareDocument("Oferta nu are produse; nu are ce să conțină documentul", 409);
  const { rezultat, eroare } = rezultatSauSalvat(o);
  if (!rezultat) throw new EroareDocument(`Oferta nu se poate calcula: ${eroare ?? "fără rezultat"}`, 409);
  const ctx = await contextDocument(o);
  const html = htmlDocument(tip, o, rezultat, ctx);
  return { html, subsolStanga: `${ctx.firma.denumire} · ${ETICHETA_DOCUMENT[tip]} ${ctx.numarComplet} / ${ctx.data} · ${ctx.client.nume}`, versiune: o.versiune, numarComplet: ctx.numarComplet };
}

export async function genereazaDocument(ofertaId: string, tip: TipDocument, u: Utilizator) {
  const { html, subsolStanga, versiune, numarComplet: nrComplet } = await htmlPentru(ofertaId, tip);
  const pdf = await randeazaPdf(html, { subsolStanga });
  const pagini = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length || null;
  const acum = new Date();
  const marca = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(acum).replace(/[: ]/g, "-");
  const numeTip = { OFERTA: "oferta", REZUMAT: "rezumat", DETALIATA: "oferta-detaliata", TABEL_FACTURARE: "tabel-facturare" }[tip];
  const nume = `${nrComplet}${versiune > 1 ? `-v${versiune}` : ""}-${numeTip}-${marca}.pdf`;
  const relativ = path.join("oferte", ofertaId, "documente", nume);
  const folder = path.join(env.dateDir, "oferte", ofertaId, "documente");
  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(path.join(folder, nume), pdf);
  return prisma.ofertaDocument.create({ data: { ofertaId, tip: tip as TipDocumentDb, versiune, nume, fisier: relativ, marime: pdf.length, pagini, generatDeId: u.id }, include: { generatDe: { select: { nume: true } } } });
}

const idDin = (req: { params: Record<string, unknown> }) => String(req.params.id ?? "");

async function ofertaVizibila(u: Utilizator, id: string) {
  const o = await prisma.oferta.findUnique({ where: { id }, select: { id: true, utilizatorId: true, firmaId: true, status: true } });
  return o && poateVedeaOferta(u, o) ? o : null;
}

const spreRaspuns = (d: { id: string; tip: TipDocumentDb; versiune: number; nume: string; marime: number; pagini: number | null; generatLa: Date; transmisLa: Date | null; canal: string | null; generatDe: { nume: string } | null; formularNr?: number | null; avertizari?: string | null }) => ({
  id: d.id,
  tip: d.tip,
  eticheta: ETICHETA_ORICE_DOCUMENT[d.tip],
  versiune: d.versiune,
  nume: d.nume,
  marime: d.marime,
  pagini: d.pagini,
  generatLa: d.generatLa,
  generatDe: d.generatDe?.nume ?? null,
  transmisLa: d.transmisLa,
  canal: d.canal,
  formularNr: d.formularNr ?? null,
  avertizari: d.avertizari ?? null,
});

documenteRouter.get("/", async (req, res) => {
  const u = req.utilizator!;
  const o = await ofertaVizibila(u, idDin(req));
  if (!o) {
    res.status(404).json({ eroare: "Oferta nu există sau nu e vizibilă" });
    return;
  }
  const documente = await prisma.ofertaDocument.findMany({ where: { ofertaId: o.id }, orderBy: { generatLa: "desc" }, include: { generatDe: { select: { nume: true } } } });
  res.json({ documente: documente.filter((d) => poateVedeaDocument(u, o, d.tip)).map(spreRaspuns), tipuriPermise: TIPURI.filter((t) => poateVedeaDocument(u, o, t)) });
});

documenteRouter.post("/", async (req, res) => {
  const u = req.utilizator!;
  const o = await ofertaVizibila(u, idDin(req));
  if (!o) {
    res.status(404).json({ eroare: "Oferta nu există sau nu e vizibilă" });
    return;
  }
  const { tip } = schemaGenerare.parse(req.body);
  if (!poateVedeaDocument(u, o, tip)) {
    res.status(403).json({ eroare: "Tabelul de facturare nu e disponibil colaboratorilor (FISA-CONTURI §2)" });
    return;
  }
  try {
    const d = await genereazaDocument(o.id, tip, u);
    res.status(201).json({ document: spreRaspuns(d) });
  } catch (e) {
    if (e instanceof EroareDocument) {
      res.status(e.status).json({ eroare: e.message });
      return;
    }
    throw e;
  }
});

documenteRouter.get("/:did", async (req, res) => {
  const u = req.utilizator!;
  const o = await ofertaVizibila(u, idDin(req));
  if (!o) {
    res.status(404).json({ eroare: "Oferta nu există sau nu e vizibilă" });
    return;
  }
  const d = await prisma.ofertaDocument.findFirst({ where: { id: String(req.params.did), ofertaId: o.id } });
  if (!d || !poateVedeaDocument(u, o, d.tip)) {
    res.status(404).json({ eroare: "Documentul nu există" });
    return;
  }
  const extensie = path.extname(d.nume).toLowerCase();
  res.setHeader("Content-Type", TIP_CONTINUT[extensie] ?? "application/octet-stream");
  // formularul Bilka (.xlsm) se descarca mereu; PDF-ul se deschide in browser
  res.setHeader("Content-Disposition", `${req.query.descarca === "da" || extensie !== ".pdf" ? "attachment" : "inline"}; filename="${d.nume}"`);
  res.sendFile(path.resolve(env.dateDir, d.fisier));
});

// "marcheaza ca transmis" (cap. 13.6, 14): canalul si momentul pe document, intrarea in istoric
documenteRouter.put("/:did/transmis", async (req, res) => {
  const u = req.utilizator!;
  const o = await ofertaVizibila(u, idDin(req));
  if (!o) {
    res.status(404).json({ eroare: "Oferta nu există sau nu e vizibilă" });
    return;
  }
  const d = await prisma.ofertaDocument.findFirst({ where: { id: String(req.params.did), ofertaId: o.id } });
  if (!d || !poateVedeaDocument(u, o, d.tip)) {
    res.status(404).json({ eroare: "Documentul nu există" });
    return;
  }
  const { canal, mentiuni } = schemaTransmis.parse(req.body);
  const ETICHETA_CANAL = { WHATSAPP: "WhatsApp", EMAIL: "e-mail", PRINT: "print" } as const;
  const acum = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.ofertaDocument.update({ where: { id: d.id }, data: { transmisLa: acum, canal } });
    await scrieIstoric(tx, o, u, [{ tip: "document", camp: "document", inainte: null, dupa: `${ETICHETA_ORICE_DOCUMENT[d.tip]}${d.versiune > 1 ? ` (varianta ${d.versiune})` : ""} transmis pe ${ETICHETA_CANAL[canal]} — ${d.nume}` }], mentiuni);
  });
  const actualizat = await prisma.ofertaDocument.findUniqueOrThrow({ where: { id: d.id }, include: { generatDe: { select: { nume: true } } } });
  res.json({ document: spreRaspuns(actualizat) });
});
