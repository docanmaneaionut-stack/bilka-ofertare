import { Prisma, type Utilizator } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { agregaLucrare } from "../../modules/mot/lucrare.js";
import type { RandVanzari, RezultatOferta } from "../../modules/mot/tipuri.js";
import { numarComplet } from "../ofe/clienti.js";
import { ETICHETA_STATUS_INCASARE, rezumatIncasari, type StatusIncasare } from "./comenzi.js";

// Tabelul de vanzari (S21; FISA-OFERTARE cap. 19, FISA-COMENZI cap. 7): ecran de lucru
// alimentat automat din comenzi. Cifrele vin din blocul `vanzari` al rezultatului salvat la
// "Comandat" (niciun recalcul): pret vanzare = materialele in lei (fara zona B), cost =
// achizitia reala cu TVA (fara grupa - E05), adaos net = diferenta, adaos brut = net / 1,21;
// la colaborator blocul e deja "al Administratorului" (vanzare = achizitia colaboratorului,
// cost = baza - E03) si randul apare in tabelul Administratorului lui. Comenzile manuale intra
// fara sume pana le completeaza Administratorul firmei. Lucrarile (oferta initiala +
// completarile, cap. 2b) apar una sub alta, cu adaosul pe lucrare (`agregaLucrare`, E01 + E10).
// Cine vede ce: agentul propriul tabel (fara statistici, fara sa scrie); Administratorul
// tabelele agentilor si colaboratorilor lui, statisticile, combinatiile, si scrie comisioanele
// si bifele; Admin general vede tot; colaboratorul, Contabilitatea, Gestiunea n-au tabel.

export const vanzariRouter = Router();

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dată în forma AAAA-LL-ZZ");
const schemaFiltre = z.object({
  deLa: dataIso.optional(),
  panaLa: dataIso.optional(),
  // "incasat" / "neincasat" traverseaza lunile: cand e ales, perioada nu mai limiteaza
  incasare: z.enum(["incasat", "neincasat"]).optional(),
  // unul sau mai multi agenti (contul alocat al comenzii), despartiti prin virgula
  agent: z.string().trim().max(800).optional(),
  firmaId: z.string().trim().optional(),
});

const dataDoar = (d: Date) => d.toISOString().slice(0, 10);
const dataLocala = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const D = (s: string | number | Prisma.Decimal) => new Prisma.Decimal(s);
const la2 = (d: Prisma.Decimal) => d.toFixed(2);

export function areTabelDeVanzari(u: Utilizator): boolean {
  return u.rol === "ADMIN_GENERAL" || u.rol === "ADMINISTRATOR" || u.rol === "AGENT";
}

// statisticile si scrierea: Administratorul (pe firma lui); Admin general vede statisticile, nu scrie
export function vedeStatistici(u: Utilizator): boolean {
  return u.rol === "ADMIN_GENERAL" || u.rol === "ADMINISTRATOR";
}

const includeVanzari = {
  firma: { select: { id: true, denumire: true } },
  contAlocat: { select: { id: true, nume: true, rol: true, administratorId: true } },
  oferta: { select: { id: true, tvaPct: true, completareLaId: true, rezultatMotor: true, completareLa: { select: { serie: true, numar: true } }, motivCompletare: true } },
  incasari: true,
} satisfies Prisma.ComandaInclude;

type ComandaVanzari = Prisma.ComandaGetPayload<{ include: typeof includeVanzari }>;

// blocul de vanzari al unei comenzi: din rezultatul salvat (oferta) sau din sumele manuale
function vanzarileComenzii(c: ComandaVanzari): RandVanzari | null {
  if (c.tip === "DIN_OFERTA") {
    const r = c.oferta?.rezultatMotor as unknown as RezultatOferta | null;
    return r?.vanzari ?? null;
  }
  if (c.vanzarePretLei === null || c.vanzareCostLei === null) return null;
  const net = c.vanzarePretLei.minus(c.vanzareCostLei);
  return { pretVanzareLei: la2(c.vanzarePretLei), costAchizitieLei: la2(c.vanzareCostLei), adaosNetLei: la2(net), adaosBrutLei: la2(net.div(1.21)), tabel: "propriu", nota: "comandă manuală: sumele completate de Administrator" };
}

export interface RandTabelVanzari {
  comandaId: string;
  numarComplet: string;
  manuala: boolean;
  data: string;
  firma: { id: string; denumire: string };
  client: { nume: string; localitate: string | null };
  // al cui e randul: contul alocat; la colaborator randul e in tabelul Administratorului lui
  agent: { id: string; nume: string; rol: string } | null;
  tabelulLui: string | null;
  tabel: "propriu" | "administrator";
  faraSume: boolean;
  costAchizitieLei: string | null;
  pretVanzareLei: string | null;
  adaosNetLei: string | null;
  adaosBrutLei: string | null;
  sursaRecomandarii: string | null;
  comisionRecomandare: { lei: string; achitat: boolean } | null;
  comisionAgent: { lei: string; achitat: boolean; achitatLa: Date | null; achitatDe: string | null } | null;
  comisionAgentModificat: boolean;
  incasare: { status: StatusIncasare; eticheta: string; incasatLei: string; restLei: string };
  completareLa: { numarComplet: string; motiv: string | null } | null;
  // lucrarea (oferta initiala + completarile din selectie), pe randul initialei
  lucrare: { pretVanzareLei: string; costAchizitieLei: string; adaosNetLei: string; adaosBrutLei: string; comenzi: number } | null;
  copii: RandTabelVanzari[];
}

function spreRand(c: ComandaVanzari, comisionModificat: Set<string>): RandTabelVanzari {
  const v = vanzarileComenzii(c);
  const tabel = v?.tabel ?? "propriu";
  const inc = rezumatIncasari(c);
  return {
    comandaId: c.id,
    numarComplet: numarComplet(c.serie, c.numar),
    manuala: c.tip === "MANUALA",
    data: dataDoar(c.data),
    firma: c.firma,
    client: { nume: c.clientNume, localitate: c.clientLocalitate },
    agent: c.contAlocat ? { id: c.contAlocat.id, nume: c.contAlocat.nume, rol: c.contAlocat.rol } : null,
    tabelulLui: tabel === "administrator" ? (c.contAlocat?.administratorId ?? null) : (c.contAlocatId ?? null),
    tabel,
    faraSume: v === null,
    costAchizitieLei: v?.costAchizitieLei ?? null,
    pretVanzareLei: v?.pretVanzareLei ?? null,
    adaosNetLei: v?.adaosNetLei ?? null,
    adaosBrutLei: v?.adaosBrutLei ?? null,
    sursaRecomandarii: c.montatorNume,
    comisionRecomandare: c.comisionLei !== null ? { lei: la2(c.comisionLei), achitat: c.comisionAchitat } : null,
    comisionAgent: c.comisionAgentLei !== null ? { lei: la2(c.comisionAgentLei), achitat: c.comisionAgentAchitat, achitatLa: c.comisionAgentAchitatLa, achitatDe: c.comisionAgentAchitatDeNume } : null,
    comisionAgentModificat: comisionModificat.has(c.id),
    incasare: { status: inc.status, eticheta: ETICHETA_STATUS_INCASARE[inc.status], incasatLei: inc.incasatLei, restLei: inc.restLei },
    completareLa: c.oferta?.completareLa ? { numarComplet: numarComplet(c.oferta.completareLa.serie, c.oferta.completareLa.numar), motiv: c.oferta.motivCompletare } : null,
    lucrare: null,
    copii: [],
  };
}

vanzariRouter.get("/", async (req, res) => {
  const u = req.utilizator!;
  if (!areTabelDeVanzari(u)) {
    res.status(403).json({ eroare: "Tabelul de vânzări e al agenților și al Administratorilor (colaboratorul, Contabilitatea și Gestiunea nu au tabel)" });
    return;
  }
  const f = schemaFiltre.parse(req.query);
  const conditii: Prisma.ComandaWhereInput[] = [];
  if (u.rol === "ADMINISTRATOR") conditii.push({ firmaId: u.firmaId ?? "" });
  if (u.rol === "AGENT") conditii.push({ contAlocatId: u.id });
  if (u.rol === "ADMIN_GENERAL" && f.firmaId) conditii.push({ firmaId: f.firmaId });
  if (f.agent && u.rol !== "AGENT") conditii.push({ contAlocatId: { in: f.agent.split(",").map((s) => s.trim()).filter(Boolean) } });
  // perioada: implicit luna aceasta; cu filtrul incasat / neincasat perioada nu limiteaza
  let perioada: { deLa: string; panaLa: string } | null = null;
  if (!f.incasare) {
    const azi = dataLocala(new Date());
    const panaLa = f.panaLa ?? azi;
    const deLa = f.deLa ?? `${azi.slice(0, 7)}-01`;
    perioada = { deLa, panaLa };
    conditii.push({ data: { gte: new Date(`${deLa}T00:00:00Z`), lte: new Date(`${panaLa}T00:00:00Z`) } });
  }
  const comenzi = await prisma.comanda.findMany({ where: { AND: conditii }, include: includeVanzari, orderBy: [{ data: "desc" }, { createdAt: "desc" }] });
  const modificate = new Set((await prisma.comandaIstoric.findMany({ where: { comandaId: { in: comenzi.map((c) => c.id) }, tip: "suma", camp: "comisionAgentLei" }, select: { comandaId: true } })).map((i) => i.comandaId));

  let randuri = comenzi.map((c) => spreRand(c, modificate));
  // agentul: doar randurile tabelului lui (randul colaboratorului e al Administratorului)
  if (u.rol === "AGENT") randuri = randuri.filter((r) => r.tabel === "propriu");
  if (f.incasare) randuri = randuri.filter((r) => (f.incasare === "incasat" ? r.incasare.status === "INCASAT" : r.incasare.status !== "INCASAT"));

  // lucrarile: completarea sub comanda ofertei initiale, cand initiala e in selectie
  const dupaOferta = new Map(comenzi.filter((c) => c.ofertaId).map((c) => [c.ofertaId!, c]));
  const randDupaComanda = new Map(randuri.map((r) => [r.comandaId, r]));
  const radacini: RandTabelVanzari[] = [];
  for (const c of comenzi) {
    const r = randDupaComanda.get(c.id);
    if (!r) continue;
    const parinte = c.oferta?.completareLaId ? dupaOferta.get(c.oferta.completareLaId) : undefined;
    const randParinte = parinte ? randDupaComanda.get(parinte.id) : undefined;
    if (randParinte) randParinte.copii.push(r);
    else radacini.push(r);
  }
  for (const r of radacini) {
    if (r.copii.length === 0 || r.faraSume) continue;
    const initiala = comenzi.find((c) => c.id === r.comandaId)!;
    const rezInitiala = { vanzari: vanzarileComenzii(initiala)! } as RezultatOferta;
    const completari = r.copii.map((k) => vanzarileComenzii(comenzi.find((c) => c.id === k.comandaId)!)).filter((v): v is RandVanzari => v !== null).map((v) => ({ vanzari: v }) as RezultatOferta);
    const l = agregaLucrare(rezInitiala, completari, initiala.oferta?.tvaPct?.toString() ?? "21");
    r.lucrare = { pretVanzareLei: l.pretVanzareLei, costAchizitieLei: l.costAchizitieLei, adaosNetLei: l.adaosNetLei, adaosBrutLei: l.adaosBrutLei, comenzi: 1 + completari.length };
  }

  // statisticile pe selectie (Administrator, Admin general): randurile cu sume, fiecare comanda o data
  let statistici: { comenzi: number; faraSume: number; costAchizitieLei: string; pretVanzareLei: string; adaosNetLei: string; adaosBrutLei: string; comisioaneLei: string; procentAdaos: string | null } | null = null;
  if (vedeStatistici(u)) {
    const toate = [...randuri];
    const cuSume = toate.filter((r) => !r.faraSume);
    const cost = cuSume.reduce((s, r) => s.plus(D(r.costAchizitieLei!)), D(0));
    const vanzare = cuSume.reduce((s, r) => s.plus(D(r.pretVanzareLei!)), D(0));
    const net = vanzare.minus(cost);
    const comisioane = toate.reduce((s, r) => s.plus(D(r.comisionAgent?.lei ?? 0)).plus(D(r.comisionRecomandare?.lei ?? 0)), D(0));
    statistici = { comenzi: toate.length, faraSume: toate.length - cuSume.length, costAchizitieLei: la2(cost), pretVanzareLei: la2(vanzare), adaosNetLei: la2(net), adaosBrutLei: la2(net.div(1.21)), comisioaneLei: la2(comisioane), procentAdaos: cost.gt(0) ? net.div(cost).mul(100).toFixed(2) : null };
  }

  res.json({ randuri: radacini, statistici, perioada, poateScrie: u.rol === "ADMINISTRATOR" });
});
