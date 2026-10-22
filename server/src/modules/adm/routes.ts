import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import { cereRol } from "../accounts/middleware.js";
import { firmeRouter } from "../accounts/firme.js";
import { utilizatoriRouter } from "../accounts/utilizatori.js";
import { catRouter } from "../cat/index.js";
import { lpRouter } from "../lp/routes.js";
import { impRouter } from "../imp/routes.js";
import { env } from "../../env.js";
import { prisma } from "../../db/prisma.js";
import { scrieExport } from "./exportDate.js";

export const admRouter = Router();

// Zona tehnica: Admin general integral; Administratorul doar firma lui si
// utilizatorii lui (verificat rută cu rută in modulele respective)
admRouter.get("/", cereRol("ADMIN_GENERAL", "ADMINISTRATOR"), (_req, res) => {
  res.json({ status: "ok", mesaj: "Zona tehnica" });
});

admRouter.use("/cat", catRouter);
admRouter.use("/lp", lpRouter);
admRouter.use("/imp", impRouter);
admRouter.use("/con/firme", firmeRouter);
admRouter.use("/con/utilizatori", utilizatoriRouter);

// export "descarca tot" (fisa CONTURI §8.4): in Etapa 1 doar Admin general;
// exportul pentru Administratori vine odata cu ofertele (Etapa 3)
admRouter.get("/export", cereRol("ADMIN_GENERAL"), async (req, res) => {
  const acum = new Date();
  const marcaj = acum.toISOString().slice(0, 16).replace(/[-:T]/g, "").replace(/(\d{8})(\d{4})/, "$1-$2");
  const numeZip = `ofertare-export-${marcaj}.zip`;
  const folderTemp = path.join(env.dateDir, "_temp");
  await mkdir(folderTemp, { recursive: true });
  const caleZip = path.join(folderTemp, numeZip);
  try {
    const { numaratori, fisiere } = await scrieExport(caleZip);
    await prisma.jurnalIntrare.create({
      data: {
        utilizatorId: req.utilizator!.id,
        numeUtilizatorLaMoment: req.utilizator!.nume,
        entitate: "Export",
        entitateId: numeZip,
        actiune: "export_descarca_tot",
        valoareDupa: `${Object.values(numaratori).reduce((s, n) => s + n, 0)} rânduri, ${fisiere} fișiere`,
      },
    });
    await new Promise<void>((resolve, reject) => res.download(caleZip, numeZip, (e) => (e ? reject(e) : resolve())));
  } finally {
    await rm(caleZip, { force: true });
  }
});
