import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { cereAutentificare, cereRol } from "../accounts/middleware.js";
import { cursuriDinTabel, cursulZilei, EroareCurs, preiaCursuri, salveazaCursuri } from "./serviciu.js";

// /api/curs: cursul valabil acum (regula 13:00), ultimele cursuri, preluare
// manuala si introducere manuala (Admin general, Zona tehnica - "Curs BNR")
export const cursRouter = Router();
cursRouter.use(cereAutentificare);

cursRouter.get("/", async (_req, res) => {
  const ultimele = await cursuriDinTabel(15);
  try {
    const azi = await cursulZilei(new Date(), null);
    res.json({ azi, ultimele });
  } catch (e) {
    if (e instanceof EroareCurs) {
      res.json({ azi: null, ultimele, eroare: e.message });
      return;
    }
    throw e;
  }
});

cursRouter.post("/preia", cereRol("ADMIN_GENERAL"), async (req, res) => {
  const { istoric } = z.object({ istoric: z.boolean().optional() }).parse(req.body ?? {});
  const rezultat = await preiaCursuri({ istoric: istoric ?? false });
  await prisma.jurnalIntrare.create({
    data: { utilizatorId: req.utilizator!.id, numeUtilizatorLaMoment: req.utilizator!.nume, entitate: "CursValutar", entitateId: "EUR", actiune: "preluare", valoareDupa: `${rezultat.salvate} cursuri (${rezultat.sursa})` },
  });
  res.json(rezultat);
});

cursRouter.post("/manual", cereRol("ADMIN_GENERAL"), async (req, res) => {
  const { data, curs } = z.object({ data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), curs: z.string().regex(/^\d+(\.\d{1,4})?$/) }).parse(req.body);
  await salveazaCursuri([{ data, curs: Number(curs).toFixed(4), sursa: "manual" }]);
  await prisma.jurnalIntrare.create({
    data: { utilizatorId: req.utilizator!.id, numeUtilizatorLaMoment: req.utilizator!.nume, entitate: "CursValutar", entitateId: data, actiune: "manual", valoareDupa: Number(curs).toFixed(4) },
  });
  res.json({ ok: true });
});
