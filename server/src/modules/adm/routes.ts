import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
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

// export "descarca tot" (fisa CONTURI §8.4): Admin general - tot; Administratorul
// (S17a) - exportul de firma: doar datele firmei lui, fara parole
admRouter.get("/export", cereRol("ADMIN_GENERAL", "ADMINISTRATOR"), async (req, res) => {
  const acum = new Date();
  const zi = `${acum.getFullYear()}-${String(acum.getMonth() + 1).padStart(2, "0")}-${String(acum.getDate()).padStart(2, "0")}`;
  const deFirma = req.utilizator!.rol === "ADMINISTRATOR";
  if (deFirma && !req.utilizator!.firmaId) {
    res.status(400).json({ eroare: "Contul nu are firmă; exportul de firmă nu are ce să cuprindă" });
    return;
  }
  const numeZip = deFirma ? `export-firma-${zi}.zip` : `export-${zi}.zip`;
  // ZIP-ul se scrie in folderul temporar al sistemului, NU in folderul de date:
  // exportul arhiveaza tot folderul de date si s-ar citi pe sine la nesfarsit
  const folderTemp = await mkdtemp(path.join(os.tmpdir(), "ofertare-export-"));
  const caleZip = path.join(folderTemp, numeZip);
  try {
    const { numaratori, fisiere } = await scrieExport(caleZip, deFirma ? { firmaId: req.utilizator!.firmaId! } : {});
    await prisma.jurnalIntrare.create({
      data: {
        utilizatorId: req.utilizator!.id,
        numeUtilizatorLaMoment: req.utilizator!.nume,
        entitate: "Export",
        entitateId: numeZip,
        actiune: deFirma ? "export_firma" : "export_descarca_tot",
        valoareDupa: `${Object.values(numaratori).reduce((s, n) => s + n, 0)} rânduri, ${fisiere} fișiere`,
      },
    });
    await new Promise<void>((resolve, reject) => res.download(caleZip, numeZip, (e) => (e ? reject(e) : resolve())));
  } finally {
    await rm(folderTemp, { recursive: true, force: true });
  }
});
