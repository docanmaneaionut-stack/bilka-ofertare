import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { cereRol } from "../accounts/middleware.js";
import { scrieCreare, scrieModificari } from "../adm/jurnal.js";
import { genereazaCodIntern } from "./codIntern.js";

export const produseRouter = Router();
produseRouter.use(cereRol("ADMIN_GENERAL"));

const CAMPURI_PRODUS = [
  "compartimentId",
  "grupId",
  "familieId",
  "codIntern",
  "codFurnizor",
  "varianta",
  "finisaj",
  "grosime",
  "optiune",
  "denumire",
  "um",
  "moneda",
  "categorieOfertaId",
  "categorieBilka",
  "latimeTotalaM",
  "latimeTotalaMm",
  "modulCm",
  "sistem",
  "treapta",
  "desfasurata",
  "culoriDisponibile",
  "sursa",
  "observatii",
  "activ",
  "ordine",
] as const;

const textOptional = z.string().trim().min(1).nullish();
const decimalOptional = z.number().nullish();

const schemaProdus = z.object({
  compartimentId: z.string().min(1),
  grupId: z.string().min(1),
  familieId: z.string().min(1).nullish(),
  // gol -> se genereaza automat din (cod furnizor, denumire); vezi codIntern.ts
  codIntern: z.string().trim().min(1).nullish(),
  codFurnizor: textOptional,
  varianta: textOptional,
  finisaj: textOptional,
  grosime: textOptional,
  optiune: textOptional,
  denumire: z.string().trim().min(1),
  um: z.string().trim().min(1),
  moneda: z.string().trim().min(1),
  categorieOfertaId: z.string().min(1).nullish(),
  categorieBilka: textOptional,
  latimeTotalaM: decimalOptional,
  latimeTotalaMm: decimalOptional,
  modulCm: decimalOptional,
  sistem: textOptional,
  treapta: textOptional,
  desfasurata: textOptional,
  culoriDisponibile: textOptional,
  sursa: textOptional,
  observatii: textOptional,
  activ: z.boolean().optional().default(true),
  ordine: z.number().int().nullish(),
});

const paginareSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(50),
  q: z.string().trim().optional(),
  compartimentId: z.string().optional(),
  grupId: z.string().optional(),
  familieId: z.string().optional(),
  finisaj: z.string().optional(),
  grosime: z.string().optional(),
});

produseRouter.get("/", async (req, res) => {
  const { page, pageSize, q, compartimentId, grupId, familieId, finisaj, grosime } = paginareSchema.parse(
    req.query,
  );

  const where = {
    ...(compartimentId ? { compartimentId } : {}),
    ...(grupId ? { grupId } : {}),
    ...(familieId ? { familieId } : {}),
    ...(finisaj ? { finisaj: { contains: finisaj, mode: "insensitive" as const } } : {}),
    ...(grosime ? { grosime: { contains: grosime, mode: "insensitive" as const } } : {}),
    ...(q
      ? {
          OR: [
            { denumire: { contains: q, mode: "insensitive" as const } },
            { codFurnizor: { contains: q, mode: "insensitive" as const } },
            { codIntern: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, produse] = await Promise.all([
    prisma.produs.count({ where }),
    prisma.produs.findMany({
      where,
      orderBy: { denumire: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        compartiment: { select: { id: true, denumire: true } },
        grup: { select: { id: true, denumire: true } },
        familie: { select: { id: true, denumire: true } },
        categorieOferta: { select: { id: true, denumire: true } },
      },
    }),
  ]);

  res.json({ produse, total, page, pageSize });
});

produseRouter.get("/culori-verificare", async (req, res) => {
  const schema = z.object({
    compartimentId: z.string().min(1),
    finisaj: z.string().trim().min(1),
    grosime: z.string().trim().min(1),
    exceptii: z.string().trim().optional(),
  });
  const { compartimentId, finisaj, grosime, exceptii } = schema.parse(req.query);

  if (exceptii) {
    const culori = exceptii
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    res.json({ sursa: "exceptie", culori });
    return;
  }

  const compartiment = await prisma.compartiment.findUniqueOrThrow({ where: { id: compartimentId } });
  const randuri = await prisma.culoareFinisajGrosime.findMany({
    where: { activ: true, furnizor: compartiment.denumire, finisaj, grosime },
    orderBy: { culoare: "asc" },
  });
  res.json({ sursa: "tabel_general", culori: randuri.map((r) => r.culoare) });
});

produseRouter.get("/:id", async (req, res) => {
  const produs = await prisma.produs.findUnique({
    where: { id: req.params.id },
    include: {
      compartiment: true,
      grup: true,
      familie: true,
      categorieOferta: true,
    },
  });
  if (!produs) {
    res.status(404).json({ eroare: "Produsul nu exista" });
    return;
  }
  res.json({ produs });
});

produseRouter.post("/", async (req, res) => {
  const date = schemaProdus.parse(req.body);

  let codIntern = date.codIntern ?? null;
  if (!codIntern) {
    const compartiment = await prisma.compartiment.findUniqueOrThrow({ where: { id: date.compartimentId } });
    codIntern = genereazaCodIntern({
      codScurtCompartiment: compartiment.codScurt,
      codFurnizor: date.codFurnizor,
      denumire: date.denumire,
    });
  }

  const produs = await prisma.produs.create({ data: { ...date, codIntern } });
  await scrieCreare(req.utilizator!, "Produs", produs.id);
  res.status(201).json({ produs });
});

produseRouter.put("/:id", async (req, res) => {
  const date = schemaProdus.parse(req.body);
  const existent = await prisma.produs.findUniqueOrThrow({ where: { id: req.params.id } });

  const codIntern = date.codIntern ?? existent.codIntern;
  const actualizat = await prisma.produs.update({
    where: { id: req.params.id },
    data: { ...date, codIntern },
  });
  await scrieModificari(req.utilizator!, "Produs", existent.id, [...CAMPURI_PRODUS], existent, actualizat);
  res.json({ produs: actualizat });
});
