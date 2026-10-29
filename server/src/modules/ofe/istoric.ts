import type { Prisma, PrismaClient, StatusOferta, Utilizator } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { poateVedeaOferta } from "./vizibilitate.js";

// Istoricul ofertei (FISA-OFERTARE cap. 14; FISA-CONTURI §5): tinut de la statusul
// "Transmisa" incolo - cat e "In lucru" se lucreaza liber, fara jurnal. Fiecare
// intrare: cine, cand, ce s-a schimbat (status, produs, cantitate, pret, suma,
// client, antet), inainte / dupa si mentiunile (textul liber cerut pe ecran).
// Interventiile Administratorului intra in acelasi istoric, cu numele lui.

export interface IntrareIstoric {
  tip: string;
  camp?: string | null;
  inainte?: string | null;
  dupa?: string | null;
  mentiuni?: string | null;
}

// campurile ale caror modificari poarta asteriscul rosu si "Vezi istoric"
export const CAMPURI_SUME = ["tintaValoare", "avansLei", "comisionRecomandareLei", "pretFix", "discountPct", "discountGeneralPct", "discountImplicitPct"];

export function areIstoric(status: StatusOferta): boolean {
  return status !== "IN_LUCRU";
}

type Client = PrismaClient | Prisma.TransactionClient;

export async function scrieIstoric(tx: Client, oferta: { id: string; status: StatusOferta }, u: Utilizator, intrari: IntrareIstoric[], mentiuni?: string | null): Promise<number> {
  if (!areIstoric(oferta.status) || intrari.length === 0) return 0;
  await tx.ofertaIstoric.createMany({
    data: intrari.map((i) => ({
      ofertaId: oferta.id,
      utilizatorId: u.id,
      numeUtilizatorLaMoment: u.nume,
      tip: i.tip,
      camp: i.camp ?? null,
      valoareInainte: i.inainte ?? null,
      valoareDupa: i.dupa ?? null,
      mentiuni: (i.mentiuni ?? mentiuni ?? "").trim() || null,
    })),
  });
  return intrari.length;
}

const text = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object" && "toString" in v) return String(v);
  return String(v);
};

// campurile schimbate dintre doua obiecte, ca intrari de istoric
export function diferenteCampuri(tip: string, campuri: string[], inainte: Record<string, unknown>, dupa: Record<string, unknown>): IntrareIstoric[] {
  return campuri.filter((c) => text(inainte[c]) !== text(dupa[c])).map((c) => ({ tip, camp: c, inainte: text(inainte[c]), dupa: text(dupa[c]) }));
}

export interface ProdusPentruIstoric {
  rubrica: string;
  cod: string;
  denumire: string;
  cantitate: string;
  pretFix?: string | null;
  discountPct?: string | null;
}

// zona produselor: linie cu linie (rubrica + cod) - adaugat, scos, cantitate, pret fix, discount
export function diferenteProduse(inainte: ProdusPentruIstoric[], dupa: ProdusPentruIstoric[]): IntrareIstoric[] {
  const cheie = (l: ProdusPentruIstoric) => `${l.rubrica}|${l.cod}`;
  const intrari: IntrareIstoric[] = [];
  const vechi = new Map(inainte.map((l) => [cheie(l), l]));
  const noi = new Map(dupa.map((l) => [cheie(l), l]));
  for (const [k, l] of noi) {
    const v = vechi.get(k);
    if (!v) {
      intrari.push({ tip: "produs", camp: `${l.rubrica} · ${l.denumire}`, inainte: null, dupa: `${l.cantitate}` });
      continue;
    }
    if (v.cantitate !== l.cantitate) intrari.push({ tip: "cantitate", camp: `${l.rubrica} · ${l.denumire}`, inainte: v.cantitate, dupa: l.cantitate });
    if ((v.pretFix ?? null) !== (l.pretFix ?? null)) intrari.push({ tip: "pret", camp: `pretFix · ${l.denumire}`, inainte: v.pretFix ?? null, dupa: l.pretFix ?? null });
    if ((v.discountPct ?? null) !== (l.discountPct ?? null)) intrari.push({ tip: "pret", camp: `discountPct · ${l.denumire}`, inainte: v.discountPct ?? null, dupa: l.discountPct ?? null });
  }
  for (const [k, v] of vechi) {
    if (!noi.has(k)) intrari.push({ tip: "produs", camp: `${v.rubrica} · ${v.denumire}`, inainte: `${v.cantitate}`, dupa: null });
  }
  return intrari;
}

// liniile unei oferte in forma de comparat (cantitatile ca text, fara zerouri in plus)
export function produsePentruIstoric(linii: { rubrica: string; cod: string; denumire: string; cantitate: Prisma.Decimal; pretFixTip: string | null; pretFixValoare: Prisma.Decimal | null; discountPct: Prisma.Decimal | null }[]): ProdusPentruIstoric[] {
  return linii.map((l) => ({
    rubrica: l.rubrica,
    cod: l.cod,
    denumire: l.denumire,
    cantitate: l.cantitate.toString(),
    pretFix: l.pretFixTip ? `${l.pretFixTip === "EUR_FARA_TVA" ? "" : "achiziție + "}${l.pretFixValoare?.toString() ?? ""}${l.pretFixTip === "EUR_FARA_TVA" ? " EUR" : " %"}` : null,
    discountPct: l.discountPct?.toString() ?? null,
  }));
}

// campurile cu istoric (pentru asteriscul rosu de pe ecran)
export async function campuriCuIstoric(ofertaId: string): Promise<string[]> {
  const randuri = await prisma.ofertaIstoric.findMany({ where: { ofertaId, camp: { not: null } }, select: { camp: true }, distinct: ["camp"] });
  return randuri.map((r) => r.camp!).filter((c) => CAMPURI_SUME.some((s) => c === s || c.startsWith(`${s} ·`)));
}

export const istoricRouter = Router({ mergeParams: true });

// GET /api/oferte/:id/istoric - vizibil oricui poate vedea oferta (FISA-CONTURI §2)
istoricRouter.get("/", async (req, res) => {
  const u = req.utilizator!;
  const id = String((req.params as { id?: string }).id ?? "");
  const o = await prisma.oferta.findUnique({ where: { id }, select: { id: true, utilizatorId: true, firmaId: true, status: true } });
  if (!o || !poateVedeaOferta(u, o)) {
    res.status(404).json({ eroare: "Oferta nu există sau nu e vizibilă" });
    return;
  }
  const intrari = await prisma.ofertaIstoric.findMany({ where: { ofertaId: id }, orderBy: { moment: "desc" } });
  res.json({ areIstoric: areIstoric(o.status), intrari, sumeModificate: await campuriCuIstoric(id) });
});
