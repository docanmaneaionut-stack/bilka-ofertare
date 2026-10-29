import express from "express";
import cors from "cors";
import { sessionMiddleware } from "./modules/accounts/session.js";
import { incarcaUtilizator } from "./modules/accounts/middleware.js";
import { accountsRouter } from "./modules/accounts/routes.js";
import { contRouter } from "./modules/accounts/cont.js";
import { admRouter } from "./modules/adm/routes.js";
import { motRouter } from "./modules/mot/routes.js";
import { cursRouter } from "./modules/curs/routes.js";
import { clientiRouter } from "./modules/ofe/clienti.js";
import { oferteRouter } from "./modules/ofe/oferte.js";
import { pretRapidRouter } from "./modules/ofe/pretRapid.js";
import { montatoriRouter } from "./modules/ofe/montatori.js";
import { gestioneazaErori } from "./middleware/erori.js";
import { env } from "./env.js";

export function creeazaApp() {
  const app = express();

  // in dezvoltare cererile vin prin proxy-ul Vite de pe aceeasi masina;
  // cu trust proxy pe loopback, req.ip e adresa reala a dispozitivului
  // (tableta din retea), nu 127.0.0.1 - conteaza pentru jurnalul de autentificari
  app.set("trust proxy", "loopback");

  app.use(cors({ origin: env.frontendOrigin, credentials: true }));
  app.use(express.json());
  app.use(sessionMiddleware);
  app.use(incarcaUtilizator);

  app.get("/api/sanatate", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", accountsRouter);
  app.use("/api/cont", contRouter);
  app.use("/api/adm", admRouter);
  app.use("/api/mot", motRouter);
  app.use("/api/curs", cursRouter);
  app.use("/api/clienti", clientiRouter);
  app.use("/api/oferte", oferteRouter);
  app.use("/api/pret-rapid", pretRapidRouter);
  app.use("/api/montatori", montatoriRouter);

  app.use(gestioneazaErori);

  return app;
}
