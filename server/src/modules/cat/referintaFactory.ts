import { Router } from "express";
import type { ZodType } from "zod";
import { cereRol } from "../accounts/middleware.js";
import { scrieCreare, scrieModificari } from "../adm/jurnal.js";

// forma comuna a unui Prisma delegate (ex. prisma.culoareFinisajGrosime) -
// suficient de generica pentru cele sase tabele de referinta, care au toate
// acelasi tipar: lista + adaugare + editare, fara stergere (vezi plan S3).
// Prisma genereaza un tip strict per model pentru orderBy/data - `any` aici
// e deliberat, ca sa poata fi folosit acelasi factory pentru toate; datele
// care intra sunt deja validate cu zod inainte sa ajunga la Prisma.
type DelegatReferinta = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findMany: (args: { orderBy?: any }) => Promise<Record<string, unknown>[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (args: { data: any }) => Promise<Record<string, unknown>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (args: { where: { id: string }; data: any }) => Promise<Record<string, unknown>>;
  findUniqueOrThrow: (args: { where: { id: string } }) => Promise<Record<string, unknown>>;
};

export function creeazaRuterReferinta(opts: {
  entitate: string;
  model: DelegatReferinta;
  schema: ZodType<Record<string, unknown>>;
  campuri: readonly string[];
  orderBy?: unknown;
}) {
  const router = Router();
  router.use(cereRol("ADMIN_GENERAL"));

  router.get("/", async (_req, res) => {
    const randuri = await opts.model.findMany({ orderBy: opts.orderBy });
    res.json({ randuri });
  });

  router.post("/", async (req, res) => {
    const date = opts.schema.parse(req.body);
    const rand = await opts.model.create({ data: date });
    await scrieCreare(req.utilizator!, opts.entitate, rand.id as string);
    res.status(201).json({ rand });
  });

  router.put("/:id", async (req, res) => {
    const date = opts.schema.parse(req.body);
    const existent = await opts.model.findUniqueOrThrow({ where: { id: req.params.id } });
    const actualizat = await opts.model.update({ where: { id: req.params.id }, data: date });
    await scrieModificari(req.utilizator!, opts.entitate, existent.id as string, [...opts.campuri], existent, actualizat);
    res.json({ rand: actualizat });
  });

  return router;
}
