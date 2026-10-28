import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { creeazaRuterReferinta } from "./referintaFactory.js";

const textOptional = z.string().trim().min(1).nullish();

export const varianteProfilRouter = creeazaRuterReferinta({
  entitate: "VariantaProfil",
  model: prisma.variantaProfil,
  orderBy: [{ furnizor: "asc" }, { model: "asc" }],
  campuri: ["furnizor", "model", "variantaProfil", "restrictii", "listaSursa", "activ"],
  schema: z.object({
    furnizor: z.string().trim().min(1),
    model: z.string().trim().min(1),
    variantaProfil: z.string().trim().min(1),
    restrictii: textOptional,
    listaSursa: textOptional,
    activ: z.boolean().optional().default(true),
  }),
});

export const culoriFinisajGrosimeRouter = creeazaRuterReferinta({
  entitate: "CuloareFinisajGrosime",
  model: prisma.culoareFinisajGrosime,
  orderBy: [{ furnizor: "asc" }, { finisaj: "asc" }, { grosime: "asc" }, { culoare: "asc" }],
  campuri: ["furnizor", "finisaj", "grosime", "culoare", "activ"],
  schema: z.object({
    furnizor: z.string().trim().min(1),
    finisaj: z.string().trim().min(1),
    grosime: z.string().trim().min(1),
    culoare: z.string().trim().min(1),
    activ: z.boolean().optional().default(true),
  }),
});

export const garantiiFinisajGrosimeRouter = creeazaRuterReferinta({
  entitate: "GarantieFinisajGrosime",
  model: prisma.garantieFinisajGrosime,
  orderBy: [{ furnizor: "asc" }, { finisaj: "asc" }, { grosime: "asc" }],
  campuri: [
    "furnizor",
    "finisaj",
    "grosime",
    "garantieCuloareAni",
    "garantieCoroziuneAni",
    "stratZincGMp",
    "stratVopseaUmExtInt",
    "activ",
  ],
  schema: z.object({
    furnizor: z.string().trim().min(1),
    finisaj: z.string().trim().min(1),
    // pluvialul nu are grosime; lipsa garantiei la culoare = fara garantie, nu zero
    grosime: textOptional,
    garantieCuloareAni: z.number().int().min(0).nullish(),
    garantieCoroziuneAni: z.number().int().min(0),
    stratZincGMp: z.number().nullish(),
    stratVopseaUmExtInt: textOptional,
    activ: z.boolean().optional().default(true),
  }),
});

export const listeImpliciteOfertaRouter = creeazaRuterReferinta({
  entitate: "ListaImplicitaOferta",
  model: prisma.listaImplicitaOferta,
  orderBy: [{ furnizor: "asc" }, { categorieInvelitoare: "asc" }, { ordine: "asc" }],
  campuri: ["furnizor", "rubrica", "categorieInvelitoare", "ordine", "produs", "activ"],
  schema: z.object({
    furnizor: z.string().trim().min(1),
    rubrica: z.string().trim().min(1),
    categorieInvelitoare: z.string().trim().min(1),
    ordine: z.number().int(),
    produs: z.string().trim().min(1),
    activ: z.boolean().optional().default(true),
  }),
});

export const trepteDesfasurataRouter = creeazaRuterReferinta({
  entitate: "TreaptaDesfasurata",
  model: prisma.treaptaDesfasurata,
  orderBy: [{ furnizor: "asc" }, { deLaMm: "asc" }],
  campuri: ["furnizor", "treapta", "deLaMm", "panaLaMm", "denumireBilka", "activ"],
  schema: z.object({
    furnizor: z.string().trim().min(1),
    treapta: z.string().trim().min(1),
    deLaMm: z.number().int().min(0),
    panaLaMm: z.number().int().min(0),
    denumireBilka: z.string().trim().min(1),
    activ: z.boolean().optional().default(true),
  }),
});

// listele de optiuni configurabile (S14): motivele completarii, sursa clientului
export const optiuniListeRouter = creeazaRuterReferinta({
  entitate: "OptiuneLista",
  model: prisma.optiuneLista,
  orderBy: [{ lista: "asc" }, { ordine: "asc" }, { valoare: "asc" }],
  campuri: ["lista", "valoare", "ordine", "activ"],
  schema: z.object({
    lista: z.enum(["motiv_completare", "sursa_client"]),
    valoare: z.string().trim().min(1),
    ordine: z.number().int().optional().default(0),
    activ: z.boolean().optional().default(true),
  }),
});

export const categoriiOfertaRouter = creeazaRuterReferinta({
  entitate: "CategorieOferta",
  model: prisma.categorieOferta,
  orderBy: [{ ordine: "asc" }],
  campuri: ["denumire", "zona", "ordine"],
  schema: z.object({
    denumire: z.string().trim().min(1),
    zona: z.enum(["A", "B"]),
    ordine: z.number().int().optional().default(0),
  }),
});
