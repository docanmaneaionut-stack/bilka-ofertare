import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { env } from "../../env.js";
import { cereAutentificare } from "../accounts/middleware.js";
import { cursulZilei, EroareCurs } from "../curs/serviciu.js";
import { achizitieLinie } from "../mot/preturi.js";
import { cuvinte, selectProdusEditor, spreProdusEditor } from "./catalog.js";
import { vedePreturiDeBaza } from "./vizibilitate.js";

// "Afla pret" (FISA-OFERTARE cap. 21): o casuta de cautare, produsele potrivite de
// la toti furnizorii (active, cu pret in lista activa), alegerea caracteristicilor,
// apoi pretul contului cu TVA pe unitate (R2: baza x (1 + adaosul contului), 2
// zecimale, x cursul de achizitie al zilei x (1 + TVA), o singura rotunjire).
// Fara istoric, fara camp de adaos; pretul de baza il vad doar Admin general si
// Administratorul.

export const pretRapidRouter = Router();
pretRapidRouter.use(cereAutentificare);

const schemaCautare = z.object({ q: z.string().trim().min(2).max(100) });

pretRapidRouter.get("/", async (req, res) => {
  const { q } = schemaCautare.parse(req.query);
  const termeni = cuvinte(q);
  const randuri = await prisma.produs.findMany({
    where: { activ: true, preturi: { some: { listaPret: { status: "ACTIVA" } } } },
    select: selectProdusEditor,
    orderBy: { denumire: "asc" },
  });
  const produse = randuri
    .map(spreProdusEditor)
    .filter((p) => {
      const text = cuvinte([p.denumire, p.familie ?? "", p.grup, p.varianta ?? "", p.optiune ?? "", p.desfasurata ?? "", p.treapta ?? ""].join(" "), true);
      return termeni.every((t) => text.some((c) => c.startsWith(t)));
    })
    .slice(0, 200);
  res.json({ produse });
});

pretRapidRouter.get("/:produsId", async (req, res) => {
  const u = req.utilizator!;
  const p = await prisma.produs.findUnique({
    where: { id: req.params.produsId },
    select: { ...selectProdusEditor, preturi: { where: { listaPret: { status: "ACTIVA" } }, select: { pret: true } } },
  });
  const pretBaza = p?.preturi[0]?.pret;
  if (!p || !p.activ || pretBaza === undefined) {
    res.status(404).json({ eroare: "Produsul nu există, e inactiv sau nu are preț în lista activă" });
    return;
  }
  let curs;
  try {
    curs = await cursulZilei();
  } catch (e) {
    if (e instanceof EroareCurs) {
      res.status(409).json({ eroare: e.message });
      return;
    }
    throw e;
  }
  const adaosPct = u.adaosProcent?.toString() ?? "0";
  const a = achizitieLinie(pretBaza.toString(), "1", adaosPct, "0", curs.cursAchizitie, env.tvaPct);
  res.json({
    produs: spreProdusEditor(p),
    pret: {
      achizitieContEur: a.achizitieContEur,
      achizitieContLeiCuTva: a.achizitieContLeiCuTva,
      um: p.um,
      cursAchizitie: curs.cursAchizitie,
      dataCurs: curs.dataCurs,
      avertizareCurs: curs.avertizareCurs,
      ...(vedePreturiDeBaza(u) ? { pretBazaEur: pretBaza.toString() } : {}),
    },
  });
});
