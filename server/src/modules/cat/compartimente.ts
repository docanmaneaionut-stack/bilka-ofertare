import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { cereRol } from "../accounts/middleware.js";
import { scrieCreare, scrieModificari } from "../adm/jurnal.js";

export const compartimenteRouter = Router();
compartimenteRouter.use(cereRol("ADMIN_GENERAL"));

const CAMPURI_EDITABILE = [
  "denumire",
  "codScurt",
  "tip",
  "moneda",
  "modPret",
  "formatImport",
  "contactFurnizorNume",
  "contactFurnizorTelefon",
  "contactFurnizorEmail",
  "contactDirectorZonal",
  "activ",
] as const;

const schemaCompartiment = z.object({
  denumire: z.string().trim().min(1),
  codScurt: z
    .string()
    .trim()
    .min(2)
    .max(6)
    .regex(/^[A-Za-z0-9]+$/)
    .transform((v) => v.toUpperCase()),
  tip: z.enum(["FURNIZOR", "STOC_PROPRIU"]),
  moneda: z.string().trim().min(1),
  modPret: z.enum(["LISTA_ACHIZITIE", "CATALOG_DISCOUNT"]),
  formatImport: z.string().trim().min(1).nullish(),
  contactFurnizorNume: z.string().trim().min(1).nullish(),
  contactFurnizorTelefon: z.string().trim().min(1).nullish(),
  contactFurnizorEmail: z.string().trim().min(1).nullish(),
  contactDirectorZonal: z.string().trim().min(1).nullish(),
  activ: z.boolean().optional().default(true),
});

compartimenteRouter.get("/", async (_req, res) => {
  const compartimente = await prisma.compartiment.findMany({
    orderBy: { denumire: "asc" },
    include: { _count: { select: { grupuri: true, produse: true } } },
  });
  res.json({ compartimente });
});

compartimenteRouter.get("/:id", async (req, res) => {
  const compartiment = await prisma.compartiment.findUnique({
    where: { id: req.params.id },
    include: { grupuri: { orderBy: { ordine: "asc" }, include: { familii: { orderBy: { ordine: "asc" } } } } },
  });
  if (!compartiment) {
    res.status(404).json({ eroare: "Compartimentul nu exista" });
    return;
  }
  res.json({ compartiment });
});

compartimenteRouter.post("/", async (req, res) => {
  const date = schemaCompartiment.parse(req.body);
  const compartiment = await prisma.compartiment.create({ data: date });
  await scrieCreare(req.utilizator!, "Compartiment", compartiment.id);
  res.status(201).json({ compartiment });
});

compartimenteRouter.put("/:id", async (req, res) => {
  const date = schemaCompartiment.parse(req.body);
  const existent = await prisma.compartiment.findUniqueOrThrow({ where: { id: req.params.id } });
  const actualizat = await prisma.compartiment.update({ where: { id: req.params.id }, data: date });
  await scrieModificari(req.utilizator!, "Compartiment", existent.id, [...CAMPURI_EDITABILE], existent, actualizat);
  res.json({ compartiment: actualizat });
});
