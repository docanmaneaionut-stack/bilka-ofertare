import { Router } from "express";
import { cereRol } from "../accounts/middleware.js";

export const admRouter = Router();

// Zona tehnica e goala in Etapa 1 S2 - ecranul real vine in S3.
// Doar Admin general are acces (fisa CONTURI: catalogul si pretul de baza
// se vad si se modifica numai de Admin general).
admRouter.get("/", cereRol("ADMIN_GENERAL"), (_req, res) => {
  res.json({ status: "ok", mesaj: "Zona tehnica - in constructie" });
});
