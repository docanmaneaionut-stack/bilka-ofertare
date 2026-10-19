import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { cereRol } from "../accounts/middleware.js";
import { activeazaLista, anuleazaLista, istoricPreturi, seteazaPretManual } from "./liste.js";

export const lpRouter = Router();
lpRouter.use(cereRol("ADMIN_GENERAL"));

lpRouter.get("/compartimente/:compartimentId/liste", async (req, res) => {
  const liste = await prisma.listaPret.findMany({
    where: { compartimentId: req.params.compartimentId },
    orderBy: [{ createdAt: "desc" }],
    include: { _count: { select: { preturi: true } }, creataDe: { select: { nume: true } }, propuneri: { select: { id: true }, take: 1 } },
  });
  res.json({ liste });
});

lpRouter.get("/liste/:id", async (req, res) => {
  const lista = await prisma.listaPret.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { preturi: true } }, creataDe: { select: { nume: true } }, compartiment: { select: { id: true, denumire: true } }, propuneri: { select: { id: true } } },
  });
  if (!lista) {
    res.status(404).json({ eroare: "Lista de preț nu există" });
    return;
  }
  res.json({ lista });
});

lpRouter.post("/liste/:id/activeaza", async (req, res) => {
  const rezultat = await activeazaLista(req.params.id, req.utilizator!);
  res.json(rezultat);
});

lpRouter.post("/liste/:id/anuleaza", async (req, res) => {
  const lista = await anuleazaLista(req.params.id, req.utilizator!);
  res.json({ lista });
});

lpRouter.get("/produse/:id/preturi", async (req, res) => {
  const istoric = await istoricPreturi(req.params.id);
  res.json({ istoric });
});

lpRouter.put("/produse/:id/pret-manual", async (req, res) => {
  const { pret } = z.object({ pret: z.number().min(0) }).parse(req.body);
  const rezultat = await seteazaPretManual(req.params.id, pret, req.utilizator!);
  res.json({ lista: rezultat.lista, pret: rezultat.pret });
});
