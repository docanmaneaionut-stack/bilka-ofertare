import express from "express";
import cors from "cors";
import { sessionMiddleware } from "./modules/accounts/session.js";
import { incarcaUtilizator } from "./modules/accounts/middleware.js";
import { accountsRouter } from "./modules/accounts/routes.js";
import { admRouter } from "./modules/adm/routes.js";
import { gestioneazaErori } from "./middleware/erori.js";
import { env } from "./env.js";

export function creeazaApp() {
  const app = express();

  app.use(cors({ origin: env.frontendOrigin, credentials: true }));
  app.use(express.json());
  app.use(sessionMiddleware);
  app.use(incarcaUtilizator);

  app.get("/api/sanatate", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", accountsRouter);
  app.use("/api/adm", admRouter);

  app.use(gestioneazaErori);

  return app;
}
