import { Router } from "express";
import type { RolUtilizator, Utilizator } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { env } from "../../env.js";
import { scrieCreare, scrieModificari } from "../adm/jurnal.js";
import { hashParola, LUNGIME_MINIMA_PAROLA, REGEX_SERIE_OFERTA } from "./auth.js";
import { cereRol } from "./middleware.js";

// Utilizatori (fisa CONTURI §1, §3, §6, §7, §8): Admin general creeaza orice
// cont (nu si un al doilea Admin general); Administratorul creeaza si vede
// doar Agenti / Colaboratori pe firma lui si isi seteaza adaosul.
export const utilizatoriRouter = Router();
utilizatoriRouter.use(cereRol("ADMIN_GENERAL", "ADMINISTRATOR"));

const ROLURI_CU_OFERTE: RolUtilizator[] = ["ADMINISTRATOR", "AGENT", "COLABORATOR"];
const ROLURI_SUBORDONATE: RolUtilizator[] = ["AGENT", "COLABORATOR"];
const ROLURI_ACCES_FIRME: RolUtilizator[] = ["CONTABILITATE", "GESTIUNE"];

const CAMPURI_UTILIZATOR = ["nume", "telefon", "email", "rol", "firmaId", "administratorId", "serieOferta", "adaosProcent", "accesGeneralFirme", "activ"] as const;

function esteRezerva(u: { email: string }) {
  return !!env.adminRezervaEmail && u.email === env.adminRezervaEmail;
}

// ce vede un administrator despre conturi (fara parola si contoare)
function utilizatorAdmin(u: Utilizator & { firma?: { denumire: string } | null; firmeAcces?: { firmaId: string }[] }) {
  return {
    id: u.id,
    nume: u.nume,
    telefon: u.telefon,
    email: u.email,
    rol: u.rol,
    firmaId: u.firmaId,
    firma: u.firma?.denumire ?? null,
    administratorId: u.administratorId,
    serieOferta: u.serieOferta,
    adaosProcent: u.adaosProcent === null ? null : Number(u.adaosProcent),
    accesGeneralFirme: u.accesGeneralFirme,
    firmeAcces: u.firmeAcces?.map((f) => f.firmaId) ?? [],
    activ: u.activ,
    parolaTrebuieSchimbata: u.parolaTrebuieSchimbata,
    blocatPanaLa: u.blocatPanaLa,
    esteRezerva: esteRezerva(u),
    createdAt: u.createdAt,
  };
}

const serieSchema = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine((v) => REGEX_SERIE_OFERTA.test(v), "Seria are 2–3 litere");

const schemaBaza = z.object({
  nume: z.string().trim().min(1),
  telefon: z.string().trim().min(1).nullish(),
  email: z.string().trim().min(3).transform((v) => v.toLowerCase()),
  rol: z.enum(["ADMINISTRATOR", "AGENT", "COLABORATOR", "CONTABILITATE", "GESTIUNE"]),
  firmaId: z.string().min(1).nullish(),
  serieOferta: serieSchema.nullish(),
  adaosProcent: z.number().min(0).max(100).nullish(),
  accesGeneralFirme: z.boolean().optional().default(false),
  firmeAcces: z.array(z.string().min(1)).optional().default([]),
  activ: z.boolean().optional().default(true),
});
const schemaCreare = schemaBaza.extend({ parolaInitiala: z.string().min(LUNGIME_MINIMA_PAROLA) });

type DateUtilizator = z.infer<typeof schemaBaza>;

// regulile pe roluri din fisa CONTURI; intoarce mesajul de eroare sau null
async function verificaReguli(date: DateUtilizator, idExistent: string | null): Promise<{ eroare?: string; administratorId: string | null }> {
  const faceOferte = ROLURI_CU_OFERTE.includes(date.rol);
  if (faceOferte && !date.serieOferta) return { eroare: "Seria de ofertă (2–3 litere) e obligatorie pentru conturile care fac oferte", administratorId: null };
  if (!faceOferte && date.serieOferta) return { eroare: "Doar conturile care fac oferte au serie de ofertă", administratorId: null };

  if (date.rol === "ADMINISTRATOR") {
    if (!date.firmaId) return { eroare: "Administratorul are exact o firmă", administratorId: null };
    const alt = await prisma.utilizator.findFirst({ where: { rol: "ADMINISTRATOR", firmaId: date.firmaId, activ: true, NOT: idExistent ? { id: idExistent } : undefined } });
    if (alt) return { eroare: `Firma are deja un Administrator activ (${alt.nume})`, administratorId: null };
    return { administratorId: null };
  }
  if (ROLURI_SUBORDONATE.includes(date.rol)) {
    if (!date.firmaId) return { eroare: "Agentul / Colaboratorul lucrează pe firma unui Administrator", administratorId: null };
    const administrator = await prisma.utilizator.findFirst({ where: { rol: "ADMINISTRATOR", firmaId: date.firmaId, activ: true } });
    if (!administrator) return { eroare: "Firma aleasă nu are un Administrator activ", administratorId: null };
    return { administratorId: administrator.id };
  }
  // Contabilitate / Gestiune: acces general, o firma sau mai multe
  if (!date.accesGeneralFirme && date.firmeAcces.length === 0) return { eroare: "Contabilitatea / Gestiunea are acces general sau pe cel puțin o firmă", administratorId: null };
  return { administratorId: null };
}

function poateVedea(actor: Utilizator, tinta: Utilizator) {
  if (actor.rol === "ADMIN_GENERAL") return true;
  if (tinta.id === actor.id) return true;
  return ROLURI_SUBORDONATE.includes(tinta.rol) && tinta.firmaId === actor.firmaId;
}

utilizatoriRouter.get("/", async (req, res) => {
  const actor = req.utilizator!;
  const where =
    actor.rol === "ADMIN_GENERAL"
      ? {}
      : { OR: [{ id: actor.id }, { firmaId: actor.firmaId ?? "", rol: { in: ROLURI_SUBORDONATE } }] };
  const utilizatori = await prisma.utilizator.findMany({
    where,
    orderBy: [{ rol: "asc" }, { nume: "asc" }],
    include: { firma: { select: { denumire: true } }, firmeAcces: { select: { firmaId: true } } },
  });
  res.json({ utilizatori: utilizatori.map(utilizatorAdmin) });
});

utilizatoriRouter.post("/", async (req, res) => {
  const actor = req.utilizator!;
  const date = schemaCreare.parse(req.body);

  if (actor.rol === "ADMINISTRATOR") {
    if (!ROLURI_SUBORDONATE.includes(date.rol)) {
      res.status(403).json({ eroare: "Administratorul creează doar Agenți și Colaboratori" });
      return;
    }
    date.firmaId = actor.firmaId;
  }
  const reguli = await verificaReguli(date, null);
  if (reguli.eroare) {
    res.status(400).json({ eroare: reguli.eroare });
    return;
  }

  const { parolaInitiala, firmeAcces, ...rest } = date;
  const utilizator = await prisma.utilizator.create({
    data: {
      ...rest,
      firmaId: ROLURI_ACCES_FIRME.includes(date.rol) ? null : date.firmaId,
      administratorId: reguli.administratorId,
      accesGeneralFirme: ROLURI_ACCES_FIRME.includes(date.rol) ? date.accesGeneralFirme : false,
      parolaHash: await hashParola(parolaInitiala),
      // parola pusa de altcineva se schimba la prima conectare
      parolaTrebuieSchimbata: true,
      firmeAcces: ROLURI_ACCES_FIRME.includes(date.rol) && !date.accesGeneralFirme ? { create: firmeAcces.map((firmaId) => ({ firmaId })) } : undefined,
    },
    include: { firma: { select: { denumire: true } }, firmeAcces: { select: { firmaId: true } } },
  });
  await scrieCreare(actor, "Utilizator", utilizator.id);
  res.status(201).json({ utilizator: utilizatorAdmin(utilizator) });
});

utilizatoriRouter.get("/:id", async (req, res) => {
  const tinta = await prisma.utilizator.findUnique({ where: { id: req.params.id }, include: { firma: { select: { denumire: true } }, firmeAcces: { select: { firmaId: true } } } });
  if (!tinta || !poateVedea(req.utilizator!, tinta)) {
    res.status(404).json({ eroare: "Utilizatorul nu există" });
    return;
  }
  res.json({ utilizator: utilizatorAdmin(tinta) });
});

utilizatoriRouter.put("/:id", async (req, res) => {
  const actor = req.utilizator!;
  const existent = await prisma.utilizator.findUnique({ where: { id: req.params.id }, include: { firmeAcces: { select: { firmaId: true } } } });
  if (!existent || !poateVedea(actor, existent)) {
    res.status(404).json({ eroare: "Utilizatorul nu există" });
    return;
  }
  if (existent.rol === "ADMIN_GENERAL" || esteRezerva(existent)) {
    res.status(409).json({ eroare: "Contul Admin general și contul de rezervă nu se modifică din ecran" });
    return;
  }

  let date: DateUtilizator;
  let campuri: string[];
  if (actor.rol === "ADMIN_GENERAL") {
    date = schemaBaza.parse(req.body);
    campuri = [...CAMPURI_UTILIZATOR];
  } else if (existent.id === actor.id) {
    // Administratorul pe el insusi: nume, telefon, adaosul propriu
    const propriu = z.object({ nume: z.string().trim().min(1), telefon: z.string().trim().min(1).nullish(), adaosProcent: z.number().min(0).max(100).nullish() }).parse(req.body);
    date = { ...schemaBaza.parse({ ...existent, adaosProcent: existent.adaosProcent === null ? null : Number(existent.adaosProcent), firmeAcces: [] }), ...propriu };
    campuri = ["nume", "telefon", "adaosProcent"];
  } else {
    // Administratorul pe subordonati: rolul ramane Agent / Colaborator, firma ramane a lui
    const sub = schemaBaza.omit({ firmaId: true, accesGeneralFirme: true, firmeAcces: true }).parse(req.body);
    if (!ROLURI_SUBORDONATE.includes(sub.rol)) {
      res.status(403).json({ eroare: "Administratorul administrează doar Agenți și Colaboratori" });
      return;
    }
    date = { ...sub, firmaId: actor.firmaId, accesGeneralFirme: false, firmeAcces: [] };
    campuri = ["nume", "telefon", "email", "rol", "serieOferta", "adaosProcent", "activ"];
  }

  const reguli = await verificaReguli(date, existent.id);
  if (reguli.eroare) {
    res.status(400).json({ eroare: reguli.eroare });
    return;
  }

  const { firmeAcces, ...rest } = date;
  const esteAccesFirme = ROLURI_ACCES_FIRME.includes(date.rol);
  const actualizat = await prisma.utilizator.update({
    where: { id: existent.id },
    data: {
      ...rest,
      firmaId: esteAccesFirme ? null : date.firmaId,
      administratorId: reguli.administratorId,
      accesGeneralFirme: esteAccesFirme ? date.accesGeneralFirme : false,
      firmeAcces: actor.rol === "ADMIN_GENERAL" ? { deleteMany: {}, create: esteAccesFirme && !date.accesGeneralFirme ? firmeAcces.map((firmaId) => ({ firmaId })) : [] } : undefined,
    },
    include: { firma: { select: { denumire: true } }, firmeAcces: { select: { firmaId: true } } },
  });

  await scrieModificari(actor, "Utilizator", existent.id, campuri, existent, actualizat);
  if (actor.rol === "ADMIN_GENERAL") {
    const inainte = existent.firmeAcces.map((f) => f.firmaId).sort().join(",");
    const dupa = actualizat.firmeAcces.map((f) => f.firmaId).sort().join(",");
    if (inainte !== dupa) {
      await prisma.jurnalIntrare.create({
        data: { utilizatorId: actor.id, numeUtilizatorLaMoment: actor.nume, entitate: "Utilizator", entitateId: existent.id, actiune: "modificare", camp: "firmeAcces", valoareInainte: inainte || null, valoareDupa: dupa || null },
      });
    }
  }
  res.json({ utilizator: utilizatorAdmin(actualizat) });
});

// resetarea parolei de catre superiorul din ierarhie: parola noua se schimba
// la prima conectare; jurnal fara valori
utilizatoriRouter.post("/:id/parola", async (req, res) => {
  const actor = req.utilizator!;
  const { parolaNoua } = z.object({ parolaNoua: z.string().min(LUNGIME_MINIMA_PAROLA) }).parse(req.body);
  const tinta = await prisma.utilizator.findUnique({ where: { id: req.params.id } });
  if (!tinta || !poateVedea(actor, tinta) || tinta.id === actor.id) {
    res.status(404).json({ eroare: "Utilizatorul nu există" });
    return;
  }
  if (tinta.rol === "ADMIN_GENERAL" || esteRezerva(tinta)) {
    res.status(409).json({ eroare: "Contul Admin general și contul de rezervă nu se modifică din ecran" });
    return;
  }
  await prisma.utilizator.update({
    where: { id: tinta.id },
    data: { parolaHash: await hashParola(parolaNoua), parolaTrebuieSchimbata: true, incercariEsuate: 0, blocatPanaLa: null },
  });
  await prisma.jurnalIntrare.create({
    data: { utilizatorId: actor.id, numeUtilizatorLaMoment: actor.nume, entitate: "Utilizator", entitateId: tinta.id, actiune: "resetare_parola" },
  });
  res.json({ ok: true });
});
