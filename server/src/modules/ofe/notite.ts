import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Utilizator } from "@prisma/client";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { env } from "../../env.js";
import { poateModificaOferta, poateVedeaOferta } from "./vizibilitate.js";

// Notitele si atasamentele ofertei (FISA-OFERTARE cap. 14): stau pe oferta, nu pe
// client; odata cu "Comandat" raman accesibile din comanda. Notitele se adauga,
// nu se rescriu (FISA-CONTURI §3); fisierele (poze, schite, documente) stau in
// folderul de date, sub id-ul ofertei, cu nume, marime, cine si cand.

export const notiteRouter = Router({ mergeParams: true });

type Drepturi = { oferta: { id: string; utilizatorId: string; firmaId: string; status: string } } | { eroare: { status: number; mesaj: string } };

async function drepturi(u: Utilizator, id: string, pentruScriere: boolean): Promise<Drepturi> {
  const o = await prisma.oferta.findUnique({ where: { id }, select: { id: true, utilizatorId: true, firmaId: true, status: true } });
  if (!o || !poateVedeaOferta(u, o)) return { eroare: { status: 404, mesaj: "Oferta nu există sau nu e vizibilă" } };
  // notele se pot adauga si dupa "Comandat" (cap. 14, FISA-CONTURI §3), de cine poate modifica oferta
  if (pentruScriere && !poateModificaOferta(u, o)) return { eroare: { status: 403, mesaj: "Notițele le adaugă cine a făcut oferta și Administratorul firmei" } };
  return { oferta: o };
}

const idDin = (req: { params: Record<string, unknown> }) => String(req.params.id ?? "");

notiteRouter.get("/notite", async (req, res) => {
  const r = await drepturi(req.utilizator!, idDin(req), false);
  if ("eroare" in r) {
    res.status(r.eroare.status).json({ eroare: r.eroare.mesaj });
    return;
  }
  const notite = await prisma.ofertaNotita.findMany({ where: { ofertaId: r.oferta.id }, orderBy: { moment: "desc" } });
  res.json({ notite });
});

notiteRouter.post("/notite", async (req, res) => {
  const r = await drepturi(req.utilizator!, idDin(req), true);
  if ("eroare" in r) {
    res.status(r.eroare.status).json({ eroare: r.eroare.mesaj });
    return;
  }
  const { text } = z.object({ text: z.string().trim().min(1, "notița e goală").max(4000) }).parse(req.body);
  const u = req.utilizator!;
  const notita = await prisma.ofertaNotita.create({ data: { ofertaId: r.oferta.id, utilizatorId: u.id, numeUtilizatorLaMoment: u.nume, text } });
  res.status(201).json({ notita });
});

// atasamente: orice tip de fisier, maxim 20 MB, in folderul de date (oferte/<id>/)
const incarcare = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024, files: 1 } });

function numeSigur(nume: string): string {
  return nume
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .slice(0, 120);
}

notiteRouter.get("/atasamente", async (req, res) => {
  const r = await drepturi(req.utilizator!, idDin(req), false);
  if ("eroare" in r) {
    res.status(r.eroare.status).json({ eroare: r.eroare.mesaj });
    return;
  }
  const atasamente = await prisma.ofertaAtasament.findMany({ where: { ofertaId: r.oferta.id }, orderBy: { moment: "desc" }, include: { incarcatDe: { select: { nume: true } } } });
  res.json({ atasamente: atasamente.map((a) => ({ id: a.id, nume: a.nume, tipMime: a.tipMime, marime: a.marime, moment: a.moment, incarcatDe: a.incarcatDe?.nume ?? null })) });
});

notiteRouter.post("/atasamente", incarcare.single("fisier"), async (req, res) => {
  const r = await drepturi(req.utilizator!, idDin(req), true);
  if ("eroare" in r) {
    res.status(r.eroare.status).json({ eroare: r.eroare.mesaj });
    return;
  }
  const f = req.file;
  if (!f) {
    res.status(400).json({ eroare: "Lipsește fișierul" });
    return;
  }
  const folder = path.join(env.dateDir, "oferte", r.oferta.id);
  await fs.mkdir(folder, { recursive: true });
  // multer da numele original codat latin1; il aducem la UTF-8 (diacriticele)
  const numeOriginal = Buffer.from(f.originalname, "latin1").toString("utf8");
  const numeFisier = `${randomUUID()}-${numeSigur(numeOriginal)}`;
  await fs.writeFile(path.join(folder, numeFisier), f.buffer);
  const u = req.utilizator!;
  const atasament = await prisma.ofertaAtasament.create({
    data: { ofertaId: r.oferta.id, nume: numeOriginal, fisier: path.join("oferte", r.oferta.id, numeFisier), tipMime: f.mimetype, marime: f.size, incarcatDeId: u.id },
  });
  res.status(201).json({ atasament: { id: atasament.id, nume: atasament.nume, tipMime: atasament.tipMime, marime: atasament.marime, moment: atasament.moment, incarcatDe: u.nume } });
});

notiteRouter.get("/atasamente/:aid", async (req, res) => {
  const r = await drepturi(req.utilizator!, idDin(req), false);
  if ("eroare" in r) {
    res.status(r.eroare.status).json({ eroare: r.eroare.mesaj });
    return;
  }
  const a = await prisma.ofertaAtasament.findFirst({ where: { id: String(req.params.aid), ofertaId: r.oferta.id } });
  if (!a) {
    res.status(404).json({ eroare: "Atașamentul nu există" });
    return;
  }
  res.download(path.join(env.dateDir, a.fisier), a.nume);
});
