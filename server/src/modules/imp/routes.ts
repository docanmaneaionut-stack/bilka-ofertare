import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { cereRol } from "../accounts/middleware.js";
import { analizeazaImport } from "./analiza.js";
import { confirmaImport } from "./aplicare.js";

export const impRouter = Router();
impRouter.use(cereRol("ADMIN_GENERAL"));

// fisierele se tin in memorie pana la analiza; apoi se scriu in folderul de date
const incarcare = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024, files: 30 } });

impRouter.post("/analiza", incarcare.array("fisiere"), async (req, res) => {
  const { compartimentId } = z.object({ compartimentId: z.string().min(1) }).parse(req.body);
  const fisiere = ((req.files as Express.Multer.File[] | undefined) ?? []).map((f) => ({
    nume: Buffer.from(f.originalname, "latin1").toString("utf8"),
    continut: f.buffer,
  }));
  const propunere = await analizeazaImport({ compartimentId, fisiere, utilizator: req.utilizator! });
  res.status(201).json({ propunere: faraRanduri(propunere) });
});

impRouter.get("/propuneri", async (req, res) => {
  const { compartimentId } = z.object({ compartimentId: z.string().optional() }).parse(req.query);
  const propuneri = await prisma.importPropunere.findMany({
    where: compartimentId ? { compartimentId } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, compartimentId: true, status: true, areProduse: true, areReferinte: true, createdAt: true, confirmataLa: true, listaPretId: true, fisiere: true, raport: true, creatDe: { select: { nume: true } } },
  });
  res.json({ propuneri });
});

impRouter.get("/propuneri/:id", async (req, res) => {
  const propunere = await prisma.importPropunere.findUnique({
    where: { id: req.params.id },
    include: { compartiment: { select: { id: true, denumire: true } }, creatDe: { select: { nume: true } }, listaPret: { select: { id: true, denumire: true, status: true } } },
  });
  if (!propunere) {
    res.status(404).json({ eroare: "Propunerea de import nu există" });
    return;
  }
  res.json({ propunere: faraRanduri(propunere) });
});

impRouter.post("/propuneri/:id/confirma", async (req, res) => {
  // la un import doar de tabele de referinta nu se creeaza versiune, deci
  // denumirea si data sunt optionale
  const { denumire, valabilaDeLa } = z
    .object({ denumire: z.string().trim().min(1).optional(), valabilaDeLa: z.coerce.date().optional() })
    .parse(req.body ?? {});
  const propunere = await confirmaImport({
    propunereId: req.params.id,
    denumire: denumire ?? `Import ${new Date().toLocaleDateString("ro-RO")}`,
    valabilaDeLa: valabilaDeLa ?? new Date(),
    utilizator: req.utilizator!,
  });
  res.json({ propunere: faraRanduri(propunere) });
});

impRouter.post("/propuneri/:id/anuleaza", async (req, res) => {
  const existenta = await prisma.importPropunere.findUniqueOrThrow({ where: { id: req.params.id } });
  if (existenta.status !== "PROPUSA") {
    res.status(409).json({ eroare: `Propunerea nu mai e deschisă (status ${existenta.status})` });
    return;
  }
  const propunere = await prisma.importPropunere.update({ where: { id: req.params.id }, data: { status: "ANULATA", anulataLa: new Date() } });
  res.json({ propunere: faraRanduri(propunere) });
});

// randurile normalizate sunt mari si folosite doar la confirmare
function faraRanduri<T extends { randuri?: unknown }>(p: T): Omit<T, "randuri"> {
  const { randuri: _randuri, ...rest } = p;
  return rest;
}
