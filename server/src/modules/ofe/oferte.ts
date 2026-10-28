import type { Prisma, StatusOferta, Utilizator } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { env } from "../../env.js";
import { cereAutentificare, cereRol } from "../accounts/middleware.js";
import { scrieCreare, scrieModificari } from "../adm/jurnal.js";
import { cursulZilei, EroareCurs } from "../curs/serviciu.js";
import { clientPublic, gasesteSauCreeazaClient, normalizeazaTelefon, numarComplet, schemaClient } from "./clienti.js";
import { catalogEditorRouter } from "./catalog.js";
import { calculeazaStructura, EroareProduse, salveazaProduse, schemaProduse } from "./produse.js";
import { seteazaContor, urmatorulNumar } from "./numerotare.js";
import { filtruVizibilitateOferte, poateModificaOferta, poateVedeaOferta, ROLURI_CU_OFERTE, vedePreturiDeBaza } from "./vizibilitate.js";

// /api/oferte (S12): lista cu filtre si vizibilitate pe rol, crearea ofertei
// (antet + client -> "In lucru", numar dat la prima salvare, cele doua cursuri
// inghetate), citirea, antetul si clientul. Produsele vin la S13, preturile la
// S14, statusurile si istoricul la S15.

export const oferteRouter = Router();
oferteRouter.use(cereAutentificare);
// catalogul pentru editor (inainte de rutele cu :id)
oferteRouter.use("/catalog", catalogEditorRouter);

const STATUSURI: StatusOferta[] = ["IN_LUCRU", "TRANSMISA", "DE_REVIZIONAT", "ACCEPTATA", "NEACCEPTATA", "AVANS_LUAT", "DE_COMANDAT", "COMANDAT"];

function dataDoar(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dataLocalaAzi(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

// ---------------------------------------------------------------- lista

const schemaFiltre = z.object({
  q: z.string().trim().optional(),
  status: z.enum(STATUSURI as [StatusOferta, ...StatusOferta[]]).optional(),
  deLa: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  panaLa: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // "toate" sau lista de id-uri separate prin virgula (Administrator)
  agent: z.string().trim().optional(),
  firmaId: z.string().trim().optional(),
  clientMultiplu: z.enum(["da"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(25),
});

const selectLista = {
  id: true,
  serie: true,
  numar: true,
  versiune: true,
  data: true,
  status: true,
  statusLa: true,
  comandatLa: true,
  avertizareCurs: true,
  motivCompletare: true,
  completareLaId: true,
  localitate: true,
  createdAt: true,
  updatedAt: true,
  client: { select: { id: true, nume: true, localitate: true, telefon: true, telefonNormalizat: true } },
  utilizator: { select: { id: true, nume: true } },
  firma: { select: { id: true, denumire: true } },
  completareLa: { select: { serie: true, numar: true } },
  _count: { select: { invelitori: true, linii: true } },
} satisfies Prisma.OfertaSelect;

type RandLista = Prisma.OfertaGetPayload<{ select: typeof selectLista }>;

interface RandOferta {
  id: string;
  numarComplet: string;
  serie: string;
  numar: number;
  versiune: number;
  data: string;
  status: StatusOferta;
  statusLa: Date;
  comandatLa: Date | null;
  avertizareCurs: string | null;
  client: { id: string; nume: string; localitate: string | null; telefon: string };
  clientMultiplu: boolean;
  agent: { id: string; nume: string };
  firma: { id: string; denumire: string };
  invelitoare: string | null;
  totalCuTvaEur: string | null;
  totalLei: string | null;
  completareLa: { numarComplet: string; motiv: string | null } | null;
  modificatLa: Date;
}

function spreRandSimplu(o: RandLista, clientiMultipli: Set<string> | null): RandOferta {
  return {
    id: o.id,
    numarComplet: numarComplet(o.serie, o.numar),
    serie: o.serie,
    numar: o.numar,
    versiune: o.versiune,
    data: dataDoar(o.data),
    status: o.status,
    statusLa: o.statusLa,
    comandatLa: o.comandatLa,
    avertizareCurs: o.avertizareCurs,
    client: { id: o.client.id, nume: o.client.nume, localitate: o.localitate ?? o.client.localitate, telefon: o.client.telefon },
    clientMultiplu: clientiMultipli ? clientiMultipli.has(o.client.telefonNormalizat) : false,
    agent: o.utilizator,
    firma: o.firma,
    // invelitoarea si totalul vin cu produsele (S13) si preturile (S14)
    invelitoare: null as string | null,
    totalCuTvaEur: null as string | null,
    totalLei: null as string | null,
    completareLa: o.completareLa ? { numarComplet: numarComplet(o.completareLa.serie, o.completareLa.numar), motiv: o.motivCompletare } : null,
    modificatLa: o.updatedAt,
  };
}

function spreRand(o: RandLista, clientiMultipli: Set<string> | null): RandOferta & { completari: RandOferta[] } {
  return { ...spreRandSimplu(o, clientiMultipli), completari: [] };
}

// ordinea din cap. 15: cronologic descrescator indiferent de status; blocul
// "Comandat" la sfarsit, dupa data comenzii, ultima comandata prima
function ordoneaza(oferte: RandLista[]): RandLista[] {
  const dupaData = (a: RandLista, b: RandLista) => b.data.getTime() - a.data.getTime() || b.createdAt.getTime() - a.createdAt.getTime();
  const necomandate = oferte.filter((o) => o.status !== "COMANDAT").sort(dupaData);
  const comandate = oferte
    .filter((o) => o.status === "COMANDAT")
    .sort((a, b) => (b.comandatLa?.getTime() ?? 0) - (a.comandatLa?.getTime() ?? 0) || dupaData(a, b));
  return [...necomandate, ...comandate];
}

oferteRouter.get("/", async (req, res) => {
  const u = req.utilizator!;
  const vizibilitate = filtruVizibilitateOferte(u);
  if (!vizibilitate) {
    res.status(403).json({ eroare: "Ofertele se văd prin comenzi (Etapa 5)" });
    return;
  }
  const f = schemaFiltre.parse(req.query);

  const conditii: Prisma.OfertaWhereInput[] = [vizibilitate, { curenta: true }];
  // perioada: implicit ultimele 90 de zile
  const panaLa = f.panaLa ?? dataLocalaAzi();
  const deLa = f.deLa ?? dataDoar(new Date(new Date(`${panaLa}T00:00:00Z`).getTime() - 90 * 24 * 3600 * 1000));
  conditii.push({ data: { gte: new Date(`${deLa}T00:00:00Z`), lte: new Date(`${panaLa}T00:00:00Z`) } });
  if (f.q) {
    const q = f.q;
    const cifre = normalizeazaTelefon(q);
    const numar = /^([A-Za-z]{2,3})-?(\d+)$/.exec(q);
    conditii.push({
      OR: [
        { client: { nume: { contains: q, mode: "insensitive" } } },
        { client: { localitate: { contains: q, mode: "insensitive" } } },
        ...(cifre.length >= 4 ? [{ client: { telefonNormalizat: { contains: cifre } } }] : []),
        ...(numar ? [{ serie: { equals: numar[1].toUpperCase() }, numar: Number(numar[2]) }] : []),
        ...(/^[A-Za-z]{2,3}$/.test(q) ? [{ serie: { equals: q.toUpperCase() } }] : []),
      ],
    });
  }
  if (u.rol === "ADMINISTRATOR") {
    // implicit ofertele lui; "toate" sau o lista de agenti ai firmei la un clic
    if (!f.agent) conditii.push({ utilizatorId: u.id });
    else if (f.agent !== "toate") conditii.push({ utilizatorId: { in: f.agent.split(",").map((s) => s.trim()).filter(Boolean) } });
  }
  if (u.rol === "ADMIN_GENERAL" && f.firmaId) conditii.push({ firmaId: f.firmaId });
  const whereFaraStatus: Prisma.OfertaWhereInput = { AND: conditii };
  const where: Prisma.OfertaWhereInput = f.status ? { AND: [...conditii, { status: f.status }] } : whereFaraStatus;

  const [toate, numaratori] = await Promise.all([
    prisma.oferta.findMany({ where, select: selectLista }),
    prisma.oferta.groupBy({ by: ["status"], where: whereFaraStatus, _count: { _all: true } }),
  ]);

  // marcajul "client cu mai multe oferte" (Admin general): acelasi telefon pe mai multe oferte
  let clientiMultipli: Set<string> | null = null;
  if (u.rol === "ADMIN_GENERAL") {
    const grupuri = await prisma.oferta.groupBy({ by: ["clientId"], where: { curenta: true }, _count: { _all: true }, having: { clientId: { _count: { gt: 1 } } } });
    const clienti = await prisma.client.findMany({ where: { id: { in: grupuri.map((g) => g.clientId) } }, select: { telefonNormalizat: true } });
    clientiMultipli = new Set(clienti.map((c) => c.telefonNormalizat));
  }
  let filtrate = toate;
  if (f.clientMultiplu && clientiMultipli) filtrate = toate.filter((o) => clientiMultipli!.has(o.client.telefonNormalizat));

  // completarile apar sub oferta initiala (cand initiala e in lista), indentate
  const ids = new Set(filtrate.map((o) => o.id));
  const parinti = ordoneaza(filtrate.filter((o) => !o.completareLaId || !ids.has(o.completareLaId)));
  const copii = filtrate.filter((o) => o.completareLaId && ids.has(o.completareLaId));
  const total = parinti.length;
  const pagina = parinti.slice((f.page - 1) * f.pageSize, f.page * f.pageSize);
  const randuri = pagina.map((o) => {
    const rand = spreRand(o, clientiMultipli);
    rand.completari = ordoneaza(copii.filter((c) => c.completareLaId === o.id)).map((c) => spreRandSimplu(c, clientiMultipli));
    return rand;
  });

  const numar = (s: StatusOferta) => numaratori.find((n) => n.status === s)?._count._all ?? 0;
  res.json({
    oferte: randuri,
    total,
    page: f.page,
    pageSize: f.pageSize,
    numaratori: { total: numaratori.reduce((s, n) => s + n._count._all, 0), inLucru: numar("IN_LUCRU"), deComandat: numar("DE_COMANDAT"), comandate: numar("COMANDAT") },
    perioada: { deLa, panaLa },
  });
});

// ---------------------------------------------------------------- creare

const schemaAntet = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sursaClient: z.string().trim().max(200).nullish(),
  note: z.string().trim().max(4000).nullish(),
  // adresa lucrarii si localitatea stau pe oferta (migrarea 7; cap. 2b)
  adresaLucrarii: z.string().trim().max(400).nullish(),
  localitate: z.string().trim().max(200).nullish(),
});

oferteRouter.post("/", cereRol(...ROLURI_CU_OFERTE), async (req, res) => {
  const u = req.utilizator!;
  const corp = z.object({ client: schemaClient, antet: schemaAntet.optional() }).parse(req.body);
  if (!u.serieOferta) {
    res.status(400).json({ eroare: "Contul nu are serie de ofertă; Administratorul o setează în Utilizatori" });
    return;
  }
  if (!u.firmaId) {
    res.status(400).json({ eroare: "Contul nu are firmă" });
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
  const listaActiva = await prisma.listaPret.findFirst({ where: { status: "ACTIVA" }, orderBy: { activataLa: "desc" }, select: { id: true } });
  const serie = u.serieOferta;

  const oferta = await prisma.$transaction(async (tx) => {
    const { client } = await gasesteSauCreeazaClient(tx, corp.client, u);
    const numar = await urmatorulNumar(tx, serie);
    return tx.oferta.create({
      data: {
        firmaId: u.firmaId!,
        utilizatorId: u.id,
        serie,
        numar,
        data: new Date(`${corp.antet?.data ?? dataLocalaAzi()}T00:00:00Z`),
        clientId: client.id,
        // adresa lucrarii: din antet daca e data, altfel copiata de la client
        adresaLucrarii: corp.antet?.adresaLucrarii || corp.client.adresa,
        localitate: corp.antet?.localitate || corp.client.localitate || null,
        sursaClient: corp.antet?.sursaClient || null,
        note: corp.antet?.note || null,
        cursBnr: curs.cursBnr,
        cursAchizitie: curs.cursAchizitie,
        dataCurs: new Date(`${curs.dataCurs}T00:00:00Z`),
        sursaCurs: curs.sursaCurs,
        avertizareCurs: curs.avertizareCurs,
        listaPretId: listaActiva?.id ?? null,
        tvaPct: env.tvaPct,
        tintaTip: "ADAOS_PCT",
        tintaValoare: env.adaosTintaImplicitPct,
        creatDeId: u.id,
        modificatDeId: u.id,
      },
    });
  });
  await scrieCreare(u, "Oferta", oferta.id);
  res.status(201).json({ oferta: await detaliu(oferta.id, u) });
});

// ---------------------------------------------------------------- detaliu

async function detaliu(id: string, u: Utilizator) {
  const o = await prisma.oferta.findUniqueOrThrow({
    where: { id },
    include: {
      client: true,
      firma: { select: { id: true, denumire: true, cui: true, nrRegCom: true, adresa: true, telefon: true, email: true, localitate: true, judet: true } },
      utilizator: { select: { id: true, nume: true, telefon: true, email: true, serieOferta: true } },
      completareLa: { select: { id: true, serie: true, numar: true } },
      completari: { where: { curenta: true }, select: { id: true, serie: true, numar: true, motivCompletare: true, status: true } },
      listaPret: { select: { id: true, denumire: true, status: true } },
      invelitori: { orderBy: { ordine: "asc" }, include: { panotaj: { orderBy: { ordine: "asc" } } } },
      linii: { orderBy: { ordine: "asc" }, include: { pozitii: { orderBy: { ordine: "asc" } } } },
      sipca: { include: { tronsoane: { orderBy: { ordine: "asc" } } } },
      zonaB: { orderBy: { ordine: "asc" } },
    },
  });
  const cuPreturi = vedePreturiDeBaza(u);
  const faraBaza = <T extends { pretBazaEur: unknown }>(x: T) => {
    if (cuPreturi) return x;
    const { pretBazaEur, ...rest } = x;
    void pretBazaEur;
    return rest;
  };
  return {
    id: o.id,
    numarComplet: numarComplet(o.serie, o.numar),
    serie: o.serie,
    numar: o.numar,
    versiune: o.versiune,
    curenta: o.curenta,
    data: dataDoar(o.data),
    status: o.status,
    statusLa: o.statusLa,
    comandatLa: o.comandatLa,
    firma: o.firma,
    cont: o.utilizator,
    client: clientPublic(o.client),
    sursaClient: o.sursaClient,
    adresaLucrarii: o.adresaLucrarii,
    localitate: o.localitate,
    precizariZonaB: o.precizariZonaB,
    curs: { cursBnr: o.cursBnr.toFixed(4), cursAchizitie: o.cursAchizitie.toFixed(4), dataCurs: dataDoar(o.dataCurs), sursaCurs: o.sursaCurs, avertizareCurs: o.avertizareCurs },
    listaPret: o.listaPret,
    tvaPct: o.tvaPct.toString(),
    modPrezentare: o.modPrezentare,
    discountGeneralPct: o.discountGeneralPct?.toString() ?? null,
    discountImplicitPct: o.discountImplicitPct?.toString() ?? null,
    tinta: { tip: o.tintaTip, valoare: o.tintaValoare.toString() },
    grupaPct: o.grupaPct.toString(),
    completareLa: o.completareLa ? { id: o.completareLa.id, numarComplet: numarComplet(o.completareLa.serie, o.completareLa.numar) } : null,
    motivCompletare: o.motivCompletare,
    completari: o.completari.map((c) => ({ id: c.id, numarComplet: numarComplet(c.serie, c.numar), motiv: c.motivCompletare, status: c.status })),
    preluataDinId: o.preluataDinId,
    note: o.note,
    invelitori: o.invelitori.map((i) => faraBaza({ ...i, latimeTotalaM: i.latimeTotalaM.toString(), mpDirect: i.mpDirect?.toString() ?? null, panotaj: i.panotaj.map((p) => ({ ...p, lungimeM: p.lungimeM.toString() })) })),
    linii: o.linii.map((l) => faraBaza({ ...l, cantitate: l.cantitate.toString(), pretFixValoare: l.pretFixValoare?.toString() ?? null, discountPct: l.discountPct?.toString() ?? null, pozitii: l.pozitii.map((p) => ({ ...p, lungimeM: p.lungimeM.toString() })) })),
    sipca: o.sipca ? { ...o.sipca, latimeSipcaMm: o.sipca.latimeSipcaMm.toString(), tronsoane: o.sipca.tronsoane.map((t) => ({ ...t, lungimeSipcaM: t.lungimeSipcaM.toString(), lungimeTronsonM: t.lungimeTronsonM.toString(), distantaMm: t.distantaMm.toString() })) } : null,
    zonaB: o.zonaB.map((zb) => ({ ...zb, cantitate: zb.cantitate.toString(), sumaLei: zb.sumaLei.toString() })),
    structura: await calculeazaStructura(o.id),
    poateModifica: poateModificaOferta(u, o),
    creatDeId: o.creatDeId,
    modificatDeId: o.modificatDeId,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

async function incarcaCuDrepturi(req: Parameters<typeof oferteRouter.get>[1] extends never ? never : { params: { id?: string }; utilizator?: Utilizator }, pentruModificare: boolean) {
  const u = req.utilizator!;
  const o = await prisma.oferta.findUnique({ where: { id: req.params.id ?? "" }, select: { id: true, utilizatorId: true, firmaId: true, status: true } });
  if (!o) return { eroare: { status: 404, mesaj: "Oferta nu există" } };
  if (!poateVedeaOferta(u, o)) return { eroare: { status: 403, mesaj: "Nu ai acces la această ofertă" } };
  if (pentruModificare && !poateModificaOferta(u, o)) return { eroare: { status: 403, mesaj: "Doar cine a făcut oferta și Administratorul firmei o pot modifica" } };
  if (pentruModificare && o.status === "COMANDAT") return { eroare: { status: 409, mesaj: "Oferta e comandată: antetul și clientul nu se mai modifică" } };
  return { oferta: o };
}

oferteRouter.get("/:id", async (req, res) => {
  const r = await incarcaCuDrepturi(req, false);
  if (r.eroare) {
    res.status(r.eroare.status).json({ eroare: r.eroare.mesaj });
    return;
  }
  res.json({ oferta: await detaliu(r.oferta.id, req.utilizator!) });
});

// antetul: data, sursa clientului, note (S12); restul campurilor la S14-S15
oferteRouter.put("/:id/antet", async (req, res) => {
  const r = await incarcaCuDrepturi(req, true);
  if (r.eroare) {
    res.status(r.eroare.status).json({ eroare: r.eroare.mesaj });
    return;
  }
  const date = schemaAntet.parse(req.body);
  const u = req.utilizator!;
  const inainte = await prisma.oferta.findUniqueOrThrow({ where: { id: r.oferta.id }, select: { data: true, sursaClient: true, note: true, adresaLucrarii: true, localitate: true } });
  const dupa = {
    data: date.data ? new Date(`${date.data}T00:00:00Z`) : inainte.data,
    sursaClient: date.sursaClient === undefined ? inainte.sursaClient : date.sursaClient || null,
    note: date.note === undefined ? inainte.note : date.note || null,
    adresaLucrarii: date.adresaLucrarii === undefined ? inainte.adresaLucrarii : date.adresaLucrarii || null,
    localitate: date.localitate === undefined ? inainte.localitate : date.localitate || null,
  };
  await prisma.oferta.update({ where: { id: r.oferta.id }, data: { ...dupa, modificatDeId: u.id } });
  await scrieModificari(u, "Oferta", r.oferta.id, ["data", "sursaClient", "note", "adresaLucrarii", "localitate"], inainte, dupa);
  res.json({ oferta: await detaliu(r.oferta.id, u) });
});

// clientul ofertei: datele lui (baza comuna) sau, la alt telefon existent,
// legarea de clientul existent
oferteRouter.put("/:id/client", async (req, res) => {
  const r = await incarcaCuDrepturi(req, true);
  if (r.eroare) {
    res.status(r.eroare.status).json({ eroare: r.eroare.mesaj });
    return;
  }
  const date = schemaClient.parse(req.body);
  const u = req.utilizator!;
  const inainte = await prisma.oferta.findUniqueOrThrow({ where: { id: r.oferta.id }, select: { clientId: true } });
  await prisma.$transaction(async (tx) => {
    const { client } = await gasesteSauCreeazaClient(tx, date, u);
    if (client.id !== inainte.clientId) {
      await tx.oferta.update({ where: { id: r.oferta.id }, data: { clientId: client.id, modificatDeId: u.id } });
      await tx.jurnalIntrare.create({ data: { utilizatorId: u.id, numeUtilizatorLaMoment: u.nume, entitate: "Oferta", entitateId: r.oferta.id, actiune: "modificare", camp: "clientId", valoareInainte: inainte.clientId, valoareDupa: client.id } });
    }
  });
  res.json({ oferta: await detaliu(r.oferta.id, u) });
});

// zona produselor (cap. 3-10): salvare automata cu snapshot, apoi structura din motor
oferteRouter.put("/:id/produse", async (req, res) => {
  const r = await incarcaCuDrepturi(req, true);
  if (r.eroare) {
    res.status(r.eroare.status).json({ eroare: r.eroare.mesaj });
    return;
  }
  const date = schemaProduse.parse(req.body);
  try {
    await salveazaProduse(r.oferta.id, date, req.utilizator!);
  } catch (e) {
    if (e instanceof EroareProduse) {
      res.status(e.status).json({ eroare: e.message });
      return;
    }
    throw e;
  }
  res.json({ oferta: await detaliu(r.oferta.id, req.utilizator!) });
});

// contorul unei serii poate porni de la un numar dat (Admin general), cu jurnal
oferteRouter.put("/contor/:serie", cereRol("ADMIN_GENERAL"), async (req, res) => {
  const serie = z.string().regex(/^[A-Z]{2,3}$/).parse(req.params.serie);
  const { ultimulNumar } = z.object({ ultimulNumar: z.number().int().min(0) }).parse(req.body);
  try {
    await seteazaContor(serie, ultimulNumar, req.utilizator!);
  } catch (e) {
    res.status(409).json({ eroare: e instanceof Error ? e.message : String(e) });
    return;
  }
  res.json({ serie, ultimulNumar });
});

oferteRouter.get("/contor/:serie", cereRol("ADMIN_GENERAL"), async (req, res) => {
  const serie = z.string().regex(/^[A-Z]{2,3}$/).parse(req.params.serie);
  const contor = await prisma.contorSerie.findUnique({ where: { serie } });
  res.json({ serie, ultimulNumar: contor?.ultimulNumar ?? 0 });
});
