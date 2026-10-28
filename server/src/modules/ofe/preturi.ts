import { Prisma, type Utilizator } from "@prisma/client";
import { z } from "zod";
import { ZodError } from "zod";
import { prisma } from "../../db/prisma.js";
import { env } from "../../env.js";
import { cursulZilei } from "../curs/serviciu.js";
import { calculeazaOferta } from "../mot/calcul.js";
import { agregaLucrare } from "../mot/lucrare.js";
import { preiaPreturi as preiaPreturiMot, renuntaLaPreluare as renuntaLaPreluareMot } from "../mot/preluare.js";
import type { IntrareOferta, RandVanzari, RezultatOferta, Tinta } from "../mot/tipuri.js";
import { la2, la4, z as zec } from "../mot/zecimal.js";
import { numarComplet } from "./clienti.js";
import { includeProduse, spreIntrareMot, type OfertaCuProduse } from "./intrareMot.js";
import { urmatorulNumar } from "./numerotare.js";
import { filtruVizibilitateOferte, poateVedeaOferta, vedePreturiDeBaza } from "./vizibilitate.js";

// Preturile ofertei (S14; FISA-OFERTARE cap. 11, 2b, 21): zona de tinta, modul de
// prezentare, preturile fixe pe linie (normalizate in EUR fara TVA), garda
// (serverul refuza schimbarea si intoarce liniile vinovate), varianta (versiune
// noua sub acelasi numar), "preia preturi din oferta ...", completarea, cursul si
// "preturi vechi". Motorul (INGHETAT) se apeleaza prin harta ARH §5.9; nimic nu
// se recalculeaza aici. Pretul de baza si adaosul % al contului nu pleaca
// niciodata spre Agent / Colaborator (FISA-CONTURI §2).

const suma = z.string().trim().regex(/^-?\d+([.,]\d+)?$/, "număr");
const nenegativa = suma.refine((s) => Number(s.replace(",", ".")) >= 0, "nu poate fi negativă");
const nr = (s: string) => new Prisma.Decimal(s.replace(",", "."));

export class EroarePreturi extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

// garda (11.6, R7): schimbarea nu se salveaza; ecranul primeste liniile vinovate
export class EroareGarda extends Error {
  constructor(public linii: { id: string; cod: string; denumire: string }[]) {
    super("Prețul ar duce linii sub achiziția reală a contului; schimbarea nu s-a salvat");
  }
}

// ------------------------------------------------------------ rezultatul

export interface RezultatPreturi extends Omit<RezultatOferta, "linii" | "vanzari"> {
  linii: (Omit<RezultatOferta["linii"][number], "bazaEur"> & { bazaEur?: string; denumire: string; pretFixPreluat: boolean })[];
  vanzari: RandVanzari | null;
  // lucrarea (cap. 2b, 19): oferta initiala + completarile ei, pe oferta initiala
  lucrare: RandVanzari | null;
}

export function rezultatOfertei(o: OfertaCuProduse): { rezultat: RezultatOferta | null; eroare: string | null } {
  if (o.invelitori.length === 0 && o.linii.length === 0) return { rezultat: null, eroare: null };
  try {
    return { rezultat: calculeazaOferta(spreIntrareMot(o)), eroare: null };
  } catch (e) {
    if (e instanceof ZodError) return { rezultat: null, eroare: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
    return { rezultat: null, eroare: e instanceof Error ? e.message : String(e) };
  }
}

// ce pleaca spre ecran, dupa rol: Agentul / Colaboratorul nu primesc pretul de
// baza; randul de vanzari al Administratorului (colaborator) nu pleaca spre colaborator
export function filtreazaPeRol(r: RezultatOferta, o: OfertaCuProduse, u: Utilizator, lucrare: RandVanzari | null): RezultatPreturi {
  const complet = vedePreturiDeBaza(u);
  const denumiri = new Map(o.linii.map((l) => [l.id, { denumire: l.denumire, preluat: l.pretFixPreluat }]));
  const linii = r.linii.map((l) => {
    const { bazaEur, ...rest } = l;
    const d = denumiri.get(l.id);
    return { ...rest, ...(complet ? { bazaEur } : {}), denumire: d?.denumire ?? l.cod, pretFixPreluat: d?.preluat ?? false };
  });
  const vanzari = complet || r.vanzari.tabel === "propriu" ? r.vanzari : null;
  return { ...r, linii, vanzari, lucrare };
}

export async function blocPreturi(ofertaId: string, u: Utilizator): Promise<{ rezultat: RezultatPreturi | null; eroare: string | null }> {
  const o = await prisma.oferta.findUniqueOrThrow({ where: { id: ofertaId }, include: includeProduse });
  const { rezultat, eroare } = rezultatOfertei(o);
  if (!rezultat) return { rezultat: null, eroare };
  // lucrarea: oferta initiala + completarile ei curente (cap. 2b, 19)
  let lucrare: RandVanzari | null = null;
  if (!o.completareLaId) {
    const completari = await prisma.oferta.findMany({ where: { completareLaId: o.id, curenta: true }, include: includeProduse });
    const rezultate = completari.map((c) => rezultatOfertei(c).rezultat).filter((x): x is RezultatOferta => x !== null);
    if (rezultate.length > 0) lucrare = agregaLucrare(rezultat, rezultate, Number(o.tvaPct));
  }
  return { rezultat: filtreazaPeRol(rezultat, o, u, lucrare), eroare: null };
}

// ------------------------------------------------------------- salvarea

export const schemaPreturi = z.object({
  tinta: z.object({ tip: z.enum(["ADAOS_PCT", "TOTAL_CU_TVA_LEI"]), valoare: suma }).optional(),
  modPrezentare: z.enum(["SIMPLU", "LISTA_DISCOUNT_GENERAL", "DISCOUNT_PER_LINIE"]).optional(),
  discountGeneralPct: nenegativa.nullish(),
  discountImplicitPct: nenegativa.nullish(),
  // pe linie: pretul fix (lei / EUR, cu / fara TVA, sau "achizitie + x %") sau null
  // = fara fix; discountul pe linie (exceptia) sau null
  linii: z
    .array(
      z.object({
        id: z.string().min(1),
        pretFix: z.object({ tip: z.enum(["eur_fara_tva", "eur_cu_tva", "lei_fara_tva", "lei_cu_tva", "achizitie_plus_pct"]), valoare: nenegativa }).nullable().optional(),
        discountPct: nenegativa.nullable().optional(),
      }),
    )
    .default([]),
});
export type DatePreturi = z.infer<typeof schemaPreturi>;

// 11.5: pretul fix se normalizeaza in EUR fara TVA la cursul documentului, o
// singura rotunjire; "achizitie + x %" ramane procent (motorul il aplica pe
// achizitia reala adusa la cursul documentului, R5 / E02)
export function normalizeazaPretFix(fix: { tip: string; valoare: string }, cursBnr: string, tvaPct: number): { tip: "EUR_FARA_TVA" | "ACHIZITIE_PLUS_PCT"; valoare: string } {
  const v = zec(fix.valoare.replace(",", "."));
  const factorTva = zec(1).plus(zec(tvaPct).div(100));
  switch (fix.tip) {
    case "achizitie_plus_pct":
      return { tip: "ACHIZITIE_PLUS_PCT", valoare: la4(v) };
    case "eur_fara_tva":
      return { tip: "EUR_FARA_TVA", valoare: la2(v) };
    case "eur_cu_tva":
      return { tip: "EUR_FARA_TVA", valoare: la2(v.div(factorTva)) };
    case "lei_fara_tva":
      return { tip: "EUR_FARA_TVA", valoare: la2(v.div(zec(cursBnr))) };
    default:
      return { tip: "EUR_FARA_TVA", valoare: la2(v.div(factorTva).div(zec(cursBnr))) };
  }
}

// ruleaza motorul pe oferta propusa; garda cazuta (si oferta nu e completare) = refuz
function verificaGarda(o: OfertaCuProduse): RezultatOferta {
  let rezultat: RezultatOferta;
  try {
    rezultat = calculeazaOferta(spreIntrareMot(o));
  } catch (e) {
    if (e instanceof ZodError) throw new EroarePreturi(e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    throw new EroarePreturi(e instanceof Error ? e.message : String(e));
  }
  if (rezultat.garda.aplicata && !rezultat.garda.respectata) {
    const vinovate = o.linii.filter((l) => rezultat.garda.liniiSubAchizitie.includes(l.id)).map((l) => ({ id: l.id, cod: l.cod, denumire: l.denumire }));
    throw new EroareGarda(vinovate);
  }
  return rezultat;
}

export async function salveazaPreturi(ofertaId: string, date: DatePreturi, u: Utilizator): Promise<void> {
  const o = await prisma.oferta.findUniqueOrThrow({ where: { id: ofertaId }, include: includeProduse });
  if (date.tinta && o.tintaTip === "PRELUATA") throw new EroarePreturi("Oferta preia prețurile din altă ofertă; renunță la preluare ca să pui o țintă", 409);
  const completare = o.completareLaId !== null;
  if (date.tinta && date.tinta.tip === "TOTAL_CU_TVA_LEI" && Number(date.tinta.valoare.replace(",", ".")) <= 0 && !completare) {
    throw new EroarePreturi("Totalul cu TVA trebuie să fie mai mare decât 0; doar o completare marcată poate fi la 0 (cap. 2b)");
  }
  if (date.tinta && date.tinta.tip === "ADAOS_PCT" && Number(date.tinta.valoare.replace(",", ".")) < -100) throw new EroarePreturi("Adaosul nu poate fi sub -100 %");

  // propunerea, aplicata pe oferta incarcata, ca motorul sa o verifice inainte de scriere
  if (date.tinta) {
    o.tintaTip = date.tinta.tip;
    o.tintaValoare = nr(date.tinta.valoare);
  }
  if (date.modPrezentare) o.modPrezentare = date.modPrezentare;
  if (date.discountGeneralPct !== undefined) o.discountGeneralPct = date.discountGeneralPct === null ? null : nr(date.discountGeneralPct);
  if (date.discountImplicitPct !== undefined) o.discountImplicitPct = date.discountImplicitPct === null ? null : nr(date.discountImplicitPct);
  if (o.modPrezentare === "LISTA_DISCOUNT_GENERAL" && o.discountGeneralPct === null) throw new EroarePreturi("Modul „listă + discount general” are nevoie de discountul afișat");
  if (o.modPrezentare === "DISCOUNT_PER_LINIE" && o.discountImplicitPct === null) throw new EroarePreturi("Modul „discount per linie” are nevoie de discountul implicit");
  const cursBnr = o.cursBnr.toFixed(4);
  const tvaPct = Number(o.tvaPct);
  const liniiSchimbate = new Map<string, { pretFixTip: "EUR_FARA_TVA" | "ACHIZITIE_PLUS_PCT" | null; pretFixValoare: Prisma.Decimal | null; pretFixPreluat: boolean; discountPct: Prisma.Decimal | null }>();
  for (const s of date.linii) {
    const l = o.linii.find((x) => x.id === s.id);
    if (!l) throw new EroarePreturi(`Linia ${s.id} nu există pe ofertă`);
    const schimbare = { pretFixTip: l.pretFixTip, pretFixValoare: l.pretFixValoare, pretFixPreluat: l.pretFixPreluat, discountPct: l.discountPct };
    if (s.pretFix !== undefined) {
      if (s.pretFix === null) {
        schimbare.pretFixTip = null;
        schimbare.pretFixValoare = null;
        schimbare.pretFixPreluat = false;
      } else {
        const n = normalizeazaPretFix(s.pretFix, cursBnr, tvaPct);
        schimbare.pretFixTip = n.tip;
        schimbare.pretFixValoare = nr(n.valoare);
        schimbare.pretFixPreluat = false;
      }
    }
    if (s.discountPct !== undefined) schimbare.discountPct = s.discountPct === null ? null : nr(s.discountPct);
    Object.assign(l, schimbare);
    liniiSchimbate.set(l.id, schimbare);
  }

  verificaGarda(o);

  await prisma.$transaction(async (tx) => {
    await tx.oferta.update({
      where: { id: ofertaId },
      data: {
        tintaTip: o.tintaTip,
        tintaValoare: o.tintaValoare,
        modPrezentare: o.modPrezentare,
        discountGeneralPct: o.discountGeneralPct,
        discountImplicitPct: o.discountImplicitPct,
        modificatDeId: u.id,
      },
    });
    for (const [id, s] of liniiSchimbate) {
      await tx.ofertaLinie.update({ where: { id }, data: s });
    }
  });
}

// ------------------------------------------------------------- varianta

// 11.7 / E09: versiune noua sub acelasi numar, copie a ofertei, cu tinta =
// adaosul real al bazei pastrat cu 4 zecimale; produsele le schimba apoi agentul
export async function creeazaVarianta(ofertaId: string, u: Utilizator): Promise<string> {
  const baza = await prisma.oferta.findUniqueOrThrow({ where: { id: ofertaId }, include: includeProduse });
  const { rezultat } = rezultatOfertei(baza);
  const tinta: { tip: "ADAOS_PCT_PASTRAT" | "ADAOS_PCT" | "TOTAL_CU_TVA_LEI" | "PRELUATA"; valoare: Prisma.Decimal } = rezultat
    ? { tip: "ADAOS_PCT_PASTRAT", valoare: nr(rezultat.totaluri.adaosRealPctExact) }
    : { tip: baza.tintaTip === "PRELUATA" ? "ADAOS_PCT" : baza.tintaTip, valoare: baza.tintaTip === "PRELUATA" ? nr(env.adaosTintaImplicitPct) : baza.tintaValoare };

  return prisma.$transaction(async (tx) => {
    const ultima = await tx.oferta.aggregate({ where: { serie: baza.serie, numar: baza.numar }, _max: { versiune: true } });
    const noua = await tx.oferta.create({
      data: {
        firmaId: baza.firmaId,
        utilizatorId: baza.utilizatorId,
        serie: baza.serie,
        numar: baza.numar,
        versiune: (ultima._max.versiune ?? baza.versiune) + 1,
        curenta: false,
        data: baza.data,
        clientId: baza.clientId,
        sursaClient: baza.sursaClient,
        adresaLucrarii: baza.adresaLucrarii,
        localitate: baza.localitate,
        precizariZonaB: baza.precizariZonaB,
        cursBnr: baza.cursBnr,
        cursAchizitie: baza.cursAchizitie,
        dataCurs: baza.dataCurs,
        sursaCurs: baza.sursaCurs,
        avertizareCurs: baza.avertizareCurs,
        listaPretId: baza.listaPretId,
        tvaPct: baza.tvaPct,
        modPrezentare: baza.modPrezentare,
        discountGeneralPct: baza.discountGeneralPct,
        discountImplicitPct: baza.discountImplicitPct,
        tintaTip: tinta.tip,
        tintaValoare: tinta.valoare,
        grupaPct: baza.grupaPct,
        completareLaId: baza.completareLaId,
        motivCompletare: baza.motivCompletare,
        note: baza.note,
        creatDeId: u.id,
        modificatDeId: u.id,
      },
    });
    const idInvelitoare = new Map<string, string>();
    for (const i of baza.invelitori) {
      const { id, ofertaId: _o, panotaj, ...rest } = i;
      void _o;
      const creat = await tx.ofertaInvelitoare.create({ data: { ...rest, ofertaId: noua.id, panotaj: { create: panotaj.map(({ id: _p, invelitoareId: _i, linieId: _l, ...p }) => (void _p, void _i, void _l, p)) } } });
      idInvelitoare.set(id, creat.id);
    }
    const idLinie = new Map<string, string>();
    for (const l of baza.linii) {
      const { id, ofertaId: _o, invelitoareId, pozitii, ...rest } = l;
      void _o;
      // preturile fixe preluate din alta oferta nu se copiaza (varianta isi face preturile ei)
      const fix = l.pretFixPreluat ? { pretFixTip: null, pretFixValoare: null, pretFixPreluat: false } : {};
      const creat = await tx.ofertaLinie.create({
        data: { ...rest, ...fix, ofertaId: noua.id, invelitoareId: invelitoareId ? (idInvelitoare.get(invelitoareId) ?? null) : null, pozitii: { create: pozitii.map(({ id: _p, invelitoareId: _i, linieId: _l, ...p }) => (void _p, void _i, void _l, p)) } },
      });
      idLinie.set(id, creat.id);
    }
    for (const s of baza.sipci) {
      const { id: _s, ofertaId: _o, linieId, tronsoane, ...rest } = s;
      void _s;
      void _o;
      await tx.ofertaSipca.create({ data: { ...rest, ofertaId: noua.id, linieId: idLinie.get(linieId)!, tronsoane: { create: tronsoane.map(({ id: _t, sipcaId: _sp, ...t }) => (void _t, void _sp, t)) } } });
    }
    for (const zb of baza.zonaB) {
      const { id: _z, ofertaId: _o, ...rest } = zb;
      void _z;
      void _o;
      await tx.ofertaZonaB.create({ data: { ...rest, ofertaId: noua.id } });
    }
    return noua.id;
  });
}

export async function faCurenta(ofertaId: string, u: Utilizator): Promise<void> {
  const o = await prisma.oferta.findUniqueOrThrow({ where: { id: ofertaId }, select: { serie: true, numar: true } });
  await prisma.$transaction([
    prisma.oferta.updateMany({ where: { serie: o.serie, numar: o.numar }, data: { curenta: false } }),
    prisma.oferta.update({ where: { id: ofertaId }, data: { curenta: true, modificatDeId: u.id } }),
  ]);
}

export async function versiunile(serie: string, numar: number) {
  const v = await prisma.oferta.findMany({ where: { serie, numar }, orderBy: { versiune: "asc" }, select: { id: true, versiune: true, curenta: true, status: true, tintaTip: true, tintaValoare: true, updatedAt: true } });
  return v.map((x) => ({ ...x, tintaValoare: x.tintaValoare.toString() }));
}

// ------------------------------------------------------------- preluarea

export async function surseDePreluare(u: Utilizator, ofertaId: string, q: string | undefined) {
  const vizibilitate = filtruVizibilitateOferte(u) ?? { id: "" };
  const conditii: Prisma.OfertaWhereInput[] = [vizibilitate, { curenta: true }, { id: { not: ofertaId } }, { linii: { some: {} } }];
  if (q) {
    const numar = /^([A-Za-z]{2,3})-?(\d+)$/.exec(q.trim());
    conditii.push({
      OR: [{ client: { nume: { contains: q, mode: "insensitive" } } }, ...(numar ? [{ serie: { equals: numar[1].toUpperCase() }, numar: Number(numar[2]) }] : [])],
    });
  }
  const oferte = await prisma.oferta.findMany({
    where: { AND: conditii },
    orderBy: [{ data: "desc" }, { createdAt: "desc" }],
    take: 20,
    select: { id: true, serie: true, numar: true, versiune: true, data: true, status: true, client: { select: { nume: true, localitate: true } } },
  });
  return oferte.map((o) => ({ id: o.id, numarComplet: numarComplet(o.serie, o.numar), versiune: o.versiune, data: o.data.toISOString().slice(0, 10), status: o.status, client: o.client }));
}

const MOD_SPRE_DB = { simplu: "SIMPLU", lista_discount_general: "LISTA_DISCOUNT_GENERAL", discount_per_linie: "DISCOUNT_PER_LINIE" } as const;

// scrie in baza preturile fixe / discounturile din intrarea data de motor
async function scrieLiniiDinIntrare(tx: Prisma.TransactionClient, intrare: IntrareOferta) {
  for (const l of intrare.linii) {
    await tx.ofertaLinie.update({
      where: { id: l.id },
      data: {
        pretFixTip: l.pretFix ? (l.pretFix.tip === "eur_fara_tva" ? "EUR_FARA_TVA" : "ACHIZITIE_PLUS_PCT") : null,
        pretFixValoare: l.pretFix ? nr(l.pretFix.valoare) : null,
        pretFixPreluat: l.pretFix?.preluat ?? false,
        discountPct: l.discountPct !== undefined ? nr(l.discountPct) : null,
      },
    });
  }
}

export async function preiaPreturiDinOferta(ofertaId: string, sursaId: string, u: Utilizator): Promise<void> {
  if (sursaId === ofertaId) throw new EroarePreturi("O ofertă nu poate prelua prețurile din ea însăși");
  const o = await prisma.oferta.findUniqueOrThrow({ where: { id: ofertaId }, include: includeProduse });
  const sursa = await prisma.oferta.findUnique({ where: { id: sursaId }, include: includeProduse });
  if (!sursa || !poateVedeaOferta(u, sursa)) throw new EroarePreturi("Oferta-sursă nu există sau nu e vizibilă contului", 404);
  const rezSursa = rezultatOfertei(sursa);
  if (!rezSursa.rezultat) throw new EroarePreturi(`Oferta-sursă nu are prețuri calculabile${rezSursa.eroare ? `: ${rezSursa.eroare}` : ""}`, 409);
  if (o.linii.length === 0) throw new EroarePreturi("Oferta nu are încă produse", 409);
  const noua = preiaPreturiMot(spreIntrareMot(o), spreIntrareMot(sursa), rezSursa.rezultat, numarComplet(sursa.serie, sursa.numar));

  // garda se verifica si pe preturile preluate (alt cont poate avea alta achizitie);
  // propunerea se aplica pe obiectul incarcat (nu se scrie decat explicit, mai jos)
  const propusa = o;
  propusa.tintaTip = "PRELUATA";
  propusa.tintaValoare = nr("0");
  propusa.modPrezentare = MOD_SPRE_DB[noua.modPrezentare];
  propusa.discountGeneralPct = noua.discountGeneralPct !== undefined ? nr(noua.discountGeneralPct) : null;
  propusa.discountImplicitPct = noua.discountImplicitPct !== undefined ? nr(noua.discountImplicitPct) : null;
  propusa.preluataDinId = sursa.id;
  for (const l of propusa.linii) {
    const n = noua.linii.find((x) => x.id === l.id);
    if (!n) continue;
    l.pretFixTip = n.pretFix ? (n.pretFix.tip === "eur_fara_tva" ? "EUR_FARA_TVA" : "ACHIZITIE_PLUS_PCT") : null;
    l.pretFixValoare = n.pretFix ? nr(n.pretFix.valoare) : null;
    l.pretFixPreluat = n.pretFix?.preluat ?? false;
    l.discountPct = n.discountPct !== undefined ? nr(n.discountPct) : null;
  }
  verificaGarda(propusa);

  await prisma.$transaction(async (tx) => {
    await tx.oferta.update({
      where: { id: ofertaId },
      data: { tintaTip: "PRELUATA", tintaValoare: nr("0"), modPrezentare: propusa.modPrezentare, discountGeneralPct: propusa.discountGeneralPct, discountImplicitPct: propusa.discountImplicitPct, preluataDinId: sursa.id, modificatDeId: u.id },
    });
    await scrieLiniiDinIntrare(tx, noua);
  });
}

export async function renuntaLaPreluare(ofertaId: string, tinta: { tip: "ADAOS_PCT" | "TOTAL_CU_TVA_LEI"; valoare: string }, u: Utilizator): Promise<void> {
  const o = await prisma.oferta.findUniqueOrThrow({ where: { id: ofertaId }, include: includeProduse });
  if (o.tintaTip !== "PRELUATA") throw new EroarePreturi("Oferta nu preia prețuri din altă ofertă", 409);
  const tintaMot: Tinta = { tip: tinta.tip === "ADAOS_PCT" ? "adaos_pct" : "total_cu_tva_lei", valoare: tinta.valoare.replace(",", ".") };
  const noua = renuntaLaPreluareMot(spreIntrareMot(o), tintaMot);
  const propusa = o;
  propusa.tintaTip = tinta.tip;
  propusa.tintaValoare = nr(tinta.valoare);
  propusa.preluataDinId = null;
  for (const l of propusa.linii) {
    const n = noua.linii.find((x) => x.id === l.id);
    if (!n) continue;
    l.pretFixTip = n.pretFix ? (n.pretFix.tip === "eur_fara_tva" ? "EUR_FARA_TVA" : "ACHIZITIE_PLUS_PCT") : null;
    l.pretFixValoare = n.pretFix ? nr(n.pretFix.valoare) : null;
    l.pretFixPreluat = false;
  }
  verificaGarda(propusa);
  await prisma.$transaction(async (tx) => {
    await tx.oferta.update({ where: { id: ofertaId }, data: { tintaTip: tinta.tip, tintaValoare: nr(tinta.valoare), preluataDinId: null, modificatDeId: u.id } });
    await scrieLiniiDinIntrare(tx, noua);
  });
}

// ----------------------------------------------------------- completarea

export const schemaCompletare = z.object({
  motiv: z.string().trim().min(1, "motivul e obligatoriu").max(200),
  text: z.string().trim().max(1000).nullish(),
});

// cap. 2b: oferta noua cu numarul ei, legata de cea initiala; preia clientul,
// adresa lucrarii, localitatea si sursa; garda nu se aplica (motorul stie din
// completareLa), preturile pot fi 0
export async function creeazaCompletare(ofertaId: string, date: z.infer<typeof schemaCompletare>, u: Utilizator): Promise<string> {
  const initiala = await prisma.oferta.findUniqueOrThrow({ where: { id: ofertaId } });
  if (!u.serieOferta || !u.firmaId) throw new EroarePreturi("Contul nu are serie de ofertă sau firmă");
  const curs = await cursulZilei();
  const listaActiva = await prisma.listaPret.findFirst({ where: { status: "ACTIVA" }, orderBy: { activataLa: "desc" }, select: { id: true } });
  const motiv = date.text ? `${date.motiv} — ${date.text}` : date.motiv;
  const serie = u.serieOferta;
  return prisma.$transaction(async (tx) => {
    const numar = await urmatorulNumar(tx, serie);
    const noua = await tx.oferta.create({
      data: {
        firmaId: u.firmaId!,
        utilizatorId: u.id,
        serie,
        numar,
        data: new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())}T00:00:00Z`),
        clientId: initiala.clientId,
        sursaClient: initiala.sursaClient,
        adresaLucrarii: initiala.adresaLucrarii,
        localitate: initiala.localitate,
        cursBnr: curs.cursBnr,
        cursAchizitie: curs.cursAchizitie,
        dataCurs: new Date(`${curs.dataCurs}T00:00:00Z`),
        sursaCurs: curs.sursaCurs,
        avertizareCurs: curs.avertizareCurs,
        listaPretId: listaActiva?.id ?? null,
        tvaPct: env.tvaPct,
        tintaTip: "ADAOS_PCT",
        tintaValoare: env.adaosTintaImplicitPct,
        completareLaId: initiala.id,
        motivCompletare: motiv,
        creatDeId: u.id,
        modificatDeId: u.id,
      },
    });
    return noua.id;
  });
}

// ------------------------------------------------------ cursul si lista

// 11.8: cat e "In lucru", ambele cursuri se reiau din cursul zilei
export async function reimprospateazaCursul(ofertaId: string, u: Utilizator): Promise<void> {
  const o = await prisma.oferta.findUniqueOrThrow({ where: { id: ofertaId }, select: { status: true } });
  if (o.status !== "IN_LUCRU") throw new EroarePreturi("Cursul se reîmprospătează doar cât oferta e „În lucru”", 409);
  const curs = await cursulZilei();
  await prisma.oferta.update({
    where: { id: ofertaId },
    data: { cursBnr: curs.cursBnr, cursAchizitie: curs.cursAchizitie, dataCurs: new Date(`${curs.dataCurs}T00:00:00Z`), sursaCurs: curs.sursaCurs, avertizareCurs: curs.avertizareCurs, modificatDeId: u.id },
  });
}

// pretul activ al fiecarui produs: din lista activa a compartimentului lui (fiecare
// compartiment - Bilka, mai tarziu Fakro - are lista lui; la mai multe, cea
// activata ultima)
async function preturiActive(ids: string[]): Promise<Map<string, { pret: Prisma.Decimal; listaPretId: string }>> {
  const randuri = await prisma.pretListaProdus.findMany({
    where: { produsId: { in: ids }, listaPret: { status: "ACTIVA" } },
    select: { produsId: true, pret: true, listaPretId: true, listaPret: { select: { activataLa: true } } },
  });
  randuri.sort((a, b) => (b.listaPret.activataLa?.getTime() ?? 0) - (a.listaPret.activataLa?.getTime() ?? 0));
  const m = new Map<string, { pret: Prisma.Decimal; listaPretId: string }>();
  for (const r of randuri) if (!m.has(r.produsId)) m.set(r.produsId, { pret: r.pret, listaPretId: r.listaPretId });
  return m;
}

type ProdusSnapshot = { produsId: string | null; pretBazaEur: Prisma.Decimal };

// "⚠ preturi vechi" (11.8): un snapshot e vechi cand pretul de baza al produsului
// din lista activa difera de el (sau produsul nu mai are pret activ)
export async function suntPreturiVechi(produse: ProdusSnapshot[]): Promise<boolean> {
  const ids = [...new Set(produse.map((p) => p.produsId).filter((x): x is string => Boolean(x)))];
  if (ids.length === 0) return false;
  const active = await preturiActive(ids);
  return produse.some((p) => {
    if (!p.produsId) return false;
    const a = active.get(p.produsId);
    return !a || !a.pret.equals(p.pretBazaEur);
  });
}

// "recalculeaza": preturile de baza din snapshot se refac din listele active;
// fara istoric cat e "In lucru"
export async function recalculeazaPreturiDeBaza(ofertaId: string, u: Utilizator): Promise<void> {
  const o = await prisma.oferta.findUniqueOrThrow({ where: { id: ofertaId }, include: includeProduse });
  if (o.status !== "IN_LUCRU") throw new EroarePreturi("Prețurile de bază se refac doar cât oferta e „În lucru”", 409);
  const toate = [...o.invelitori, ...o.linii];
  const ids = [...new Set(toate.map((x) => x.produsId).filter((x): x is string => Boolean(x)))];
  const active = await preturiActive(ids);
  const lipsa = toate.filter((x) => !x.produsId || !active.has(x.produsId)).map((x) => x.denumire);
  if (lipsa.length > 0) throw new EroarePreturi(`Fără preț în lista activă: ${[...new Set(lipsa)].join(", ")}`, 409);
  const listaPrincipala = active.get(toate[0]?.produsId ?? "")?.listaPretId ?? null;
  await prisma.$transaction(async (tx) => {
    for (const i of o.invelitori) await tx.ofertaInvelitoare.update({ where: { id: i.id }, data: { pretBazaEur: active.get(i.produsId!)!.pret } });
    for (const l of o.linii) await tx.ofertaLinie.update({ where: { id: l.id }, data: { pretBazaEur: active.get(l.produsId!)!.pret } });
    await tx.oferta.update({ where: { id: ofertaId }, data: { listaPretId: listaPrincipala, modificatDeId: u.id } });
  });
}
