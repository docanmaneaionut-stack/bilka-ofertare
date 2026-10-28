import { Router } from "express";
import { compartimenteRouter } from "./compartimente.js";
import { grupuriFamiliiRouter } from "./grupuriFamilii.js";
import { produseRouter } from "./produse.js";
import {
  categoriiOfertaRouter,
  culoriFinisajGrosimeRouter,
  garantiiFinisajGrosimeRouter,
  listeImpliciteOfertaRouter,
  optiuniListeRouter,
  trepteDesfasurataRouter,
  varianteProfilRouter,
} from "./referinte.js";

export const catRouter = Router();

catRouter.use("/compartimente", compartimenteRouter);
catRouter.use("/", grupuriFamiliiRouter);
catRouter.use("/produse", produseRouter);
catRouter.use("/referinte/variante-profil", varianteProfilRouter);
catRouter.use("/referinte/culori-finisaj-grosime", culoriFinisajGrosimeRouter);
catRouter.use("/referinte/garantii-finisaj-grosime", garantiiFinisajGrosimeRouter);
catRouter.use("/referinte/liste-implicite-oferta", listeImpliciteOfertaRouter);
catRouter.use("/referinte/trepte-desfasurata", trepteDesfasurataRouter);
catRouter.use("/referinte/categorii-oferta", categoriiOfertaRouter);
catRouter.use("/referinte/optiuni-liste", optiuniListeRouter);
