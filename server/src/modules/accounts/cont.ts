import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { hashParola, LUNGIME_MINIMA_PAROLA, verificaParola } from "./auth.js";
import { cereAutentificare } from "./middleware.js";
import { utilizatorPublic } from "./routes.js";

// pagina proprie a oricarui cont: parola si ultimele conectari (fisa CONTURI §8)
export const contRouter = Router();
contRouter.use(cereAutentificare);

contRouter.get("/", async (req, res) => {
  const u = req.utilizator!;
  const [firma, conectari] = await Promise.all([
    u.firmaId ? prisma.firma.findUnique({ where: { id: u.firmaId }, select: { id: true, denumire: true } }) : null,
    prisma.jurnalAutentificare.findMany({
      where: { utilizatorId: u.id },
      orderBy: { moment: "desc" },
      take: 10,
      select: { moment: true, rezultat: true, dispozitiv: true, sursa: true },
    }),
  ]);
  res.json({ utilizator: utilizatorPublic(u), firma, conectari });
});

contRouter.put("/parola", async (req, res) => {
  const { parolaVeche, parolaNoua } = z
    .object({ parolaVeche: z.string(), parolaNoua: z.string().min(LUNGIME_MINIMA_PAROLA) })
    .parse(req.body);
  const u = req.utilizator!;
  if (!(await verificaParola(parolaVeche, u.parolaHash))) {
    res.status(400).json({ eroare: "Parola actuală nu e corectă" });
    return;
  }
  await prisma.utilizator.update({
    where: { id: u.id },
    data: { parolaHash: await hashParola(parolaNoua), parolaTrebuieSchimbata: false },
  });
  // fara valori: doar cine, cand, pentru cine
  await prisma.jurnalIntrare.create({
    data: { utilizatorId: u.id, numeUtilizatorLaMoment: u.nume, entitate: "Utilizator", entitateId: u.id, actiune: "schimbare_parola" },
  });
  res.json({ ok: true });
});
