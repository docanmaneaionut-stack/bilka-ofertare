import { Router } from "express";
import { cereRol } from "../accounts/middleware.js";
import { catRouter } from "../cat/index.js";
import { lpRouter } from "../lp/routes.js";
import { impRouter } from "../imp/routes.js";

export const admRouter = Router();

// Doar Admin general are acces la Zona tehnica (fisa CONTURI: catalogul si
// pretul de baza se vad si se modifica numai de Admin general).
admRouter.get("/", cereRol("ADMIN_GENERAL"), (_req, res) => {
  res.json({ status: "ok", mesaj: "Zona tehnica" });
});

admRouter.use("/cat", catRouter);
admRouter.use("/lp", lpRouter);
admRouter.use("/imp", impRouter);
