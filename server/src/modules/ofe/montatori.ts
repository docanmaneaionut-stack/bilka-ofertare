import { Prisma, type Utilizator } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { cereAutentificare, cereRol } from "../accounts/middleware.js";
import { normalizeazaTelefon } from "./clienti.js";
import { scrieIstoric } from "./istoric.js";
import { ROLURI_CU_OFERTE } from "./vizibilitate.js";

// Montatorii / constructorii (FISA-OFERTARE cap. 12): lista proprie a fiecarui
// agent (nume si telefon obligatorii, localitate, tip), vazuta de el si de toti
// Administratorii; autocompletare pe oferta. Pe oferta: o singura persoana,
// "montator / recomandare", si comisionul ei ca suma fixa (asterisc rosu si
// istoric); "achitat" il bifeaza Administratorul (Etapa 5). Nimic pe documente.

export const schemaMontator = z.object({
  nume: z.string().trim().min(1, "numele e obligatoriu").max(200),
  telefon: z.string().trim().min(3, "telefonul e obligatoriu").max(40),
  localitate: z.string().trim().max(200).nullish(),
  tip: z.enum(["MONTATOR", "CONSTRUCTOR"]).default("MONTATOR"),
  activ: z.boolean().optional(),
});

export const montatoriRouter = Router();
montatoriRouter.use(cereAutentificare);

function filtruVizibil(u: Utilizator): Prisma.MontatorWhereInput {
  if (u.rol === "ADMIN_GENERAL" || u.rol === "ADMINISTRATOR") return {};
  return { utilizatorId: u.id };
}

export function poateModificaMontator(u: Utilizator, m: { utilizatorId: string }): boolean {
  return u.rol === "ADMINISTRATOR" || u.rol === "ADMIN_GENERAL" || m.utilizatorId === u.id;
}

montatoriRouter.get("/", async (req, res) => {
  const u = req.utilizator!;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const cifre = normalizeazaTelefon(q);
  const conditii: Prisma.MontatorWhereInput[] = [filtruVizibil(u)];
  if (q) conditii.push({ OR: [{ nume: { contains: q, mode: "insensitive" } }, ...(cifre.length >= 3 ? [{ telefonNormalizat: { contains: cifre } }] : []), { localitate: { contains: q, mode: "insensitive" } }] });
  if (req.query.toti !== "da") conditii.push({ activ: true });
  const montatori = await prisma.montator.findMany({ where: { AND: conditii }, orderBy: [{ nume: "asc" }], take: 100, include: { utilizator: { select: { id: true, nume: true } } } });
  res.json({ montatori });
});

montatoriRouter.post("/", cereRol(...ROLURI_CU_OFERTE), async (req, res) => {
  const u = req.utilizator!;
  const date = schemaMontator.parse(req.body);
  const m = await prisma.montator.create({ data: { utilizatorId: u.id, nume: date.nume, telefon: date.telefon, telefonNormalizat: normalizeazaTelefon(date.telefon), localitate: date.localitate || null, tip: date.tip } });
  res.status(201).json({ montator: m });
});

montatoriRouter.put("/:id", async (req, res) => {
  const u = req.utilizator!;
  const m = await prisma.montator.findUnique({ where: { id: req.params.id } });
  if (!m || !poateModificaMontator(u, m)) {
    res.status(404).json({ eroare: "Montatorul nu există sau nu e al tău" });
    return;
  }
  const date = schemaMontator.parse(req.body);
  const actualizat = await prisma.montator.update({ where: { id: m.id }, data: { nume: date.nume, telefon: date.telefon, telefonNormalizat: normalizeazaTelefon(date.telefon), localitate: date.localitate || null, tip: date.tip, ...(date.activ !== undefined ? { activ: date.activ } : {}) } });
  res.json({ montator: actualizat });
});

// pe oferta: persoana (din lista sau noua) si comisionul; permis si dupa "Comandat" (sume, cu istoric)
const suma = z.string().trim().regex(/^-?\d+([.,]\d+)?$/, "număr");
export const schemaMontatorOferta = z.object({
  montatorId: z.string().min(1).nullish(),
  montatorNou: schemaMontator.omit({ activ: true }).optional(),
  comisionRecomandareLei: suma.nullish(),
  mentiuni: z.string().trim().max(2000).nullish(),
});

export class EroareMontator extends Error {}

export async function seteazaMontatorOferta(ofertaId: string, date: z.infer<typeof schemaMontatorOferta>, u: Utilizator): Promise<void> {
  const o = await prisma.oferta.findUniqueOrThrow({ where: { id: ofertaId }, include: { montator: true } });
  let montatorId = date.montatorId === undefined ? o.montatorId : date.montatorId;
  let montatorNume = o.montator?.nume ?? null;
  await prisma.$transaction(async (tx) => {
    if (date.montatorNou) {
      const n = date.montatorNou;
      const creat = await tx.montator.create({ data: { utilizatorId: o.utilizatorId, nume: n.nume, telefon: n.telefon, telefonNormalizat: normalizeazaTelefon(n.telefon), localitate: n.localitate || null, tip: n.tip } });
      montatorId = creat.id;
      montatorNume = creat.nume;
    } else if (date.montatorId) {
      const m = await tx.montator.findUnique({ where: { id: date.montatorId } });
      if (!m) throw new EroareMontator("Montatorul ales nu există");
      montatorNume = m.nume;
    } else if (date.montatorId === null) {
      montatorNume = null;
    }
    const comisionNou = date.comisionRecomandareLei === undefined ? o.comisionRecomandareLei : date.comisionRecomandareLei === null ? null : new Prisma.Decimal(date.comisionRecomandareLei.replace(",", "."));
    if (comisionNou !== null && comisionNou !== undefined && comisionNou.lt(0)) throw new EroareMontator("Comisionul nu poate fi negativ");
    await tx.oferta.update({ where: { id: ofertaId }, data: { montatorId, comisionRecomandareLei: comisionNou, modificatDeId: u.id } });
    const intrari = [];
    if ((o.montatorId ?? null) !== (montatorId ?? null)) intrari.push({ tip: "montator", camp: "montator", inainte: o.montator?.nume ?? null, dupa: montatorNume });
    if ((o.comisionRecomandareLei?.toString() ?? null) !== (comisionNou?.toString() ?? null)) intrari.push({ tip: "suma", camp: "comisionRecomandareLei", inainte: o.comisionRecomandareLei?.toString() ?? null, dupa: comisionNou?.toString() ?? null });
    await scrieIstoric(tx, o, u, intrari, date.mentiuni);
  });
}
