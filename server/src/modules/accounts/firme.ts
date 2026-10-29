import { mkdir, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { env } from "../../env.js";
import { scrieCreare, scrieModificari } from "../adm/jurnal.js";
import { cereRol } from "./middleware.js";
import { citesteSablon, EroareSablon } from "../ofe/formularBilka/sablon.js";
import { EroareZip } from "../ofe/formularBilka/zip.js";

// Firme (fisa CONTURI §3): Admin general le creeaza si le modifica integral;
// Administratorul vede doar firma lui si ii modifica doar datele de contact.
export const firmeRouter = Router();
firmeRouter.use(cereRol("ADMIN_GENERAL", "ADMINISTRATOR"));

const CAMPURI_FIRMA = [
  "denumire", "cui", "platitorTva", "nrRegCom", "adresa", "localitate", "judet",
  "telefon", "email", "contBancar", "banca", "observatii", "activ",
] as const;
const CAMPURI_CONTACT = ["adresa", "localitate", "judet", "telefon", "email"] as const;

const textOptional = z.string().trim().min(1).nullish();
const schemaContact = z.object({
  adresa: z.string().trim().min(1),
  localitate: textOptional,
  judet: textOptional,
  telefon: z.string().trim().min(1),
  email: z.string().trim().min(1),
});
const schemaFirma = schemaContact.extend({
  denumire: z.string().trim().min(1),
  cui: z.string().trim().min(1),
  platitorTva: z.boolean().optional().default(true),
  nrRegCom: z.string().trim().min(1),
  contBancar: textOptional,
  banca: textOptional,
  observatii: textOptional,
  activ: z.boolean().optional().default(true),
});

function esteAdminGeneral(req: { utilizator?: { rol: string } }) {
  return req.utilizator?.rol === "ADMIN_GENERAL";
}

firmeRouter.get("/", async (req, res) => {
  const where = esteAdminGeneral(req) ? {} : { id: req.utilizator!.firmaId ?? "" };
  const firme = await prisma.firma.findMany({
    where,
    orderBy: { denumire: "asc" },
    include: { _count: { select: { utilizatori: { where: { activ: true } } } } },
  });
  res.json({ firme });
});

firmeRouter.post("/", cereRol("ADMIN_GENERAL"), async (req, res) => {
  const date = schemaFirma.parse(req.body);
  const firma = await prisma.firma.create({ data: date });
  await scrieCreare(req.utilizator!, "Firma", firma.id);
  res.status(201).json({ firma });
});

async function firmaAccesibila(req: { utilizator?: { rol: string; firmaId: string | null } }, id: string) {
  if (!esteAdminGeneral(req) && req.utilizator?.firmaId !== id) return null;
  return prisma.firma.findUnique({ where: { id }, include: { _count: { select: { utilizatori: { where: { activ: true } } } } } });
}

firmeRouter.get("/:id", async (req, res) => {
  const firma = await firmaAccesibila(req, req.params.id);
  if (!firma) {
    res.status(404).json({ eroare: "Firma nu există" });
    return;
  }
  res.json({ firma });
});

firmeRouter.put("/:id", async (req, res) => {
  const existenta = await firmaAccesibila(req, req.params.id);
  if (!existenta) {
    res.status(404).json({ eroare: "Firma nu există" });
    return;
  }
  const adminGeneral = esteAdminGeneral(req);
  const date = adminGeneral ? schemaFirma.parse(req.body) : schemaContact.parse(req.body);

  // o firma nu se dezactiveaza cat timp are utilizatori activi (fara cascada)
  if (adminGeneral && "activ" in date && date.activ === false && existenta.activ && existenta._count.utilizatori > 0) {
    res.status(409).json({ eroare: `Firma are ${existenta._count.utilizatori} utilizatori activi; dezactivează-i întâi pe ei.` });
    return;
  }

  const actualizata = await prisma.firma.update({ where: { id: existenta.id }, data: date });
  await scrieModificari(req.utilizator!, "Firma", existenta.id, adminGeneral ? [...CAMPURI_FIRMA] : [...CAMPURI_CONTACT], existenta, actualizata);
  res.json({ firma: actualizata });
});

// sigla: JPG / PNG, max 2 MB, pastrata in folderul de date sub id-ul firmei
// (nume de fisier fara diacritice si spatii)
const incarcareSigla = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, f, cb) => cb(null, f.mimetype === "image/jpeg" || f.mimetype === "image/png"),
});

firmeRouter.post("/:id/sigla", cereRol("ADMIN_GENERAL"), incarcareSigla.single("sigla"), async (req, res) => {
  const firma = await prisma.firma.findUnique({ where: { id: String(req.params.id) } });
  if (!firma) {
    res.status(404).json({ eroare: "Firma nu există" });
    return;
  }
  const fisier = req.file;
  if (!fisier) {
    res.status(400).json({ eroare: "Sigla trebuie să fie un fișier JPG sau PNG de cel mult 2 MB" });
    return;
  }
  const extensie = fisier.mimetype === "image/png" ? "png" : "jpg";
  const folder = path.join(env.dateDir, "sigle");
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, `${firma.id}.${extensie}`), fisier.buffer);
  const logo = `sigle/${firma.id}.${extensie}`;
  const actualizata = await prisma.firma.update({ where: { id: firma.id }, data: { logo } });
  await scrieModificari(req.utilizator!, "Firma", firma.id, ["logo"], firma, actualizata);
  res.json({ firma: actualizata });
});

firmeRouter.get("/:id/sigla", async (req, res) => {
  const firma = await firmaAccesibila(req, req.params.id);
  if (!firma?.logo) {
    res.status(404).json({ eroare: "Fără siglă" });
    return;
  }
  res.sendFile(path.resolve(env.dateDir, firma.logo));
});

// sablonul formularului de comanda Bilka al firmei (S16b, FORMULAR-BILKA-HARTA §8):
// .xlsm, max 8 MB, verificat la incarcare (numele definite si foile asteptate);
// pastrat in folderul de date sub id-ul firmei; versiunea = numele fisierului +
// data modificarii din arhiva; cine si cand l-a incarcat; intrare in jurnal
const incarcareSablon = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, f, cb) => cb(null, /.xlsm$/i.test(f.originalname)),
});

firmeRouter.post("/:id/sablon-bilka", cereRol("ADMIN_GENERAL"), incarcareSablon.single("sablon"), async (req, res) => {
  const firma = await prisma.firma.findUnique({ where: { id: String(req.params.id) } });
  if (!firma) {
    res.status(404).json({ eroare: "Firma nu există" });
    return;
  }
  const fisier = req.file;
  if (!fisier) {
    res.status(400).json({ eroare: "Șablonul trebuie să fie un fișier .xlsm (formularul de comandă Bilka) de cel mult 8 MB" });
    return;
  }
  let modificatLa: string | null;
  try {
    const sablon = citesteSablon(fisier.buffer);
    modificatLa = sablon.modificatLa;
  } catch (e) {
    if (e instanceof EroareSablon || e instanceof EroareZip) {
      res.status(400).json({ eroare: `Fișierul nu poate fi folosit ca șablon: ${e.message}` });
      return;
    }
    throw e;
  }
  const numeOriginal = Buffer.from(fisier.originalname, "latin1").toString("utf8");
  const folder = path.join(env.dateDir, "sabloane-bilka");
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, `${firma.id}.xlsm`), fisier.buffer);
  const actualizata = await prisma.firma.update({
    where: { id: firma.id },
    data: { sablonBilka: `sabloane-bilka/${firma.id}.xlsm`, sablonBilkaVersiune: `${numeOriginal}${modificatLa ? ` (modificat ${modificatLa})` : ""}`, sablonBilkaIncarcatLa: new Date(), sablonBilkaIncarcatDe: req.utilizator!.nume },
  });
  await scrieModificari(req.utilizator!, "Firma", firma.id, ["sablonBilka", "sablonBilkaVersiune"], firma, actualizata);
  res.json({ firma: actualizata });
});

firmeRouter.get("/:id/sablon-bilka", async (req, res) => {
  const firma = await firmaAccesibila(req, req.params.id);
  if (!firma?.sablonBilka) {
    res.status(404).json({ eroare: "Firma nu are șablon de formular Bilka" });
    return;
  }
  res.setHeader("Content-Type", "application/vnd.ms-excel.sheet.macroEnabled.12");
  res.setHeader("Content-Disposition", `attachment; filename="sablon-formular-bilka.xlsm"`);
  createReadStream(path.resolve(env.dateDir, firma.sablonBilka)).pipe(res);
});
