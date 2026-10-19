import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { cereRol } from "../accounts/middleware.js";
import { scrieCreare, scrieModificari } from "../adm/jurnal.js";

export const grupuriFamiliiRouter = Router();
grupuriFamiliiRouter.use(cereRol("ADMIN_GENERAL"));

const CAMPURI_GRUP_FAMILIE = ["denumire", "ordine"] as const;

const schemaGrupFamilie = z.object({
  denumire: z.string().trim().min(1),
  ordine: z.number().int().optional().default(0),
});

grupuriFamiliiRouter.post("/compartimente/:compartimentId/grupuri", async (req, res) => {
  const date = schemaGrupFamilie.parse(req.body);
  const grup = await prisma.grup.create({
    data: { ...date, compartimentId: req.params.compartimentId },
  });
  await scrieCreare(req.utilizator!, "Grup", grup.id);
  res.status(201).json({ grup });
});

grupuriFamiliiRouter.put("/grupuri/:id", async (req, res) => {
  const date = schemaGrupFamilie.parse(req.body);
  const existent = await prisma.grup.findUniqueOrThrow({ where: { id: req.params.id } });
  const actualizat = await prisma.grup.update({ where: { id: req.params.id }, data: date });
  await scrieModificari(req.utilizator!, "Grup", existent.id, [...CAMPURI_GRUP_FAMILIE], existent, actualizat);
  res.json({ grup: actualizat });
});

grupuriFamiliiRouter.post("/grupuri/:grupId/familii", async (req, res) => {
  const date = schemaGrupFamilie.parse(req.body);
  const familie = await prisma.familie.create({
    data: { ...date, grupId: req.params.grupId },
  });
  await scrieCreare(req.utilizator!, "Familie", familie.id);
  res.status(201).json({ familie });
});

grupuriFamiliiRouter.put("/familii/:id", async (req, res) => {
  const date = schemaGrupFamilie.parse(req.body);
  const existent = await prisma.familie.findUniqueOrThrow({ where: { id: req.params.id } });
  const actualizat = await prisma.familie.update({ where: { id: req.params.id }, data: date });
  await scrieModificari(req.utilizator!, "Familie", existent.id, [...CAMPURI_GRUP_FAMILIE], existent, actualizat);
  res.json({ familie: actualizat });
});
