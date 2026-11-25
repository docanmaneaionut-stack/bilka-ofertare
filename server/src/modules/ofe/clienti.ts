import { Prisma, type Client, type Utilizator } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { idsCuTextul } from "../../lib/normalizare.js";
import type { CampInvalid } from "../../middleware/erori.js";
import { cereAutentificare } from "../accounts/middleware.js";
import { filtruVizibilitateOferte, ROLURI_CU_OFERTE } from "./vizibilitate.js";

// Clientii (FISA-OFERTARE cap. 2): baza comuna tuturor conturilor; telefonul
// normalizat e cheia de deduplicare; la telefon existent oferta se leaga de
// clientul existent; fisa clientului arata ofertele lui in limita vizibilitatii.
//
// S26a (MODIFICAREA M6, docs/MODIFICARI-S26.md): telefonul e optional la oferta (obligatoriu la
// "Comandat" - verificat in statusuri.ts). Fara telefon = client nou, fara telefon. Unicitatea
// numarului ramane garantata de baza printr-un index unic PARTIAL (migrarea 20: doi clienti
// nemarcati nu pot avea acelasi numar); singura exceptie e clientul marcat "telefon dublat" -
// cel pe care agentul a refuzat sa-l lege de clientul existent cu acelasi numar. Clientii se
// creeaza printr-o singura functie (creeazaClientNou), cu lacat pe numar in tranzactie.
//
// S27 (BUG-15): sugestii si pe NUMELE clientului (de la 3 litere, fara diacritice) - doar clientii cu
// oferte vizibile contului si cei creati de el; cautarea dupa telefon ramane pe toata baza. Alegerea din
// lista vine ca "clientExistentId": la un client cu telefon legarea se face tot prin numar (cheia de
// deduplicare); la unul FARA telefon oferta se leaga de el prin alegere, ca sa nu apara o dublura.
//
// S27b (BUG-17): un camp LASAT GOL (adresa, localitate, telefon, e-mail, observatii) NU atinge fisa unui
// client existent - fisa se actualizeaza doar cu ce a fost scris efectiv, cu jurnal (actualizeazaClient,
// singurul loc care scrie intr-o fisa existenta). Adresa nu se completeaza niciodata din localitate: la
// comanda manuala fara adresa clientul existent ramane cum e, iar cel nou primeste "-" (necompletata).

// doar cifre; prefixul +40 / 0040 devine 0 ("+40 728 192 569" = "0728192569")
export function normalizeazaTelefon(telefon: string): string {
  const t = telefon.trim();
  let cifre = t.replace(/\D/g, "");
  if (t.startsWith("+40")) cifre = `0${cifre.slice(2)}`;
  else if (cifre.startsWith("0040")) cifre = `0${cifre.slice(4)}`;
  else if (cifre.startsWith("40") && cifre.length >= 11) cifre = `0${cifre.slice(2)}`;
  return cifre;
}

const telefonObligatoriu = z
  .string()
  .trim()
  .min(6)
  .refine((t) => !/[a-zA-Z]/.test(t), "conține litere")
  .refine((t) => normalizeazaTelefon(t).length >= 6, "trebuie să aibă cel puțin 6 cifre");
// S26a (M6): gol / lipsa = fara telefon; scris, se verifica la fel ca pana acum (BUG-4)
const telefonOptional = z
  .string()
  .trim()
  .refine((t) => t === "" || t.length >= 6, "prea scurt (minim 6 caractere)")
  .refine((t) => !/[a-zA-Z]/.test(t), "conține litere")
  .refine((t) => t === "" || normalizeazaTelefon(t).length >= 6, "trebuie să aibă cel puțin 6 cifre")
  .nullish();

export const schemaClient = z.object({
  nume: z.string().trim().min(2),
  telefon: telefonOptional,
  adresa: z.string().trim().min(2),
  localitate: z.string().trim().nullish(),
  email: z.string().trim().email().nullish().or(z.literal("")),
  observatii: z.string().trim().nullish(),
});
// comenzile manuale (FISA-COMENZI cap. 4b) pastreaza telefonul obligatoriu
export const schemaClientCuTelefon = schemaClient.extend({ telefon: telefonObligatoriu });
export type DateClient = z.infer<typeof schemaClient>;
// datele scrise pe un drum pe care adresa poate lipsi (comanda manuala - FISA-COMENZI cap. 4b)
export type DateClientScrise = Omit<DateClient, "adresa"> & { adresa?: string | null };
// adresa unui client NOU creat fara adresa (coloana e obligatorie in baza); tabelul de comenzi n-o arata
export const ADRESA_NECOMPLETATA = "-";

const CAMPURI_CLIENT = ["nume", "telefon", "adresa", "localitate", "email", "observatii"] as const;

export interface DateClientCurate {
  nume: string;
  telefon: string | null;
  telefonNormalizat: string | null;
  adresa: string | null;
  localitate: string | null;
  email: string | null;
  observatii: string | null;
  telefonDublat?: boolean;
}

function dateCurate(date: DateClientScrise): DateClientCurate {
  const telefon = date.telefon?.trim() || null;
  return {
    nume: date.nume,
    telefon,
    telefonNormalizat: telefon ? normalizeazaTelefon(telefon) : null,
    adresa: date.adresa?.trim() || null,
    localitate: date.localitate || null,
    email: date.email || null,
    observatii: date.observatii || null,
  };
}

// refuzul legat de client, cu campul si motivul (regula BUG-4); la telefonul unui client existent
// poarta si propunerea de legare (clientul existent)
export class EroareClient extends Error {
  constructor(
    message: string,
    public status = 409,
    public campuri: CampInvalid[] = [],
    public propunereLegare: ReturnType<typeof clientPublic> | null = null,
  ) {
    super(message);
  }
}

const esteIncalcareDeUnicitate = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
const eroareTelefonExistent = () =>
  new EroareClient("Telefon: există deja un client cu acest număr — caută-l după telefon și leagă oferta de el", 409, [{ camp: "telefon", eticheta: "Telefon", mesaj: "există deja un client cu acest număr" }]);

// lacatul pe numar: doua cereri simultane cu acelasi telefon trec pe rand prin "cauta sau creeaza"
// (se elibereaza singur la sfarsitul tranzactiei)
async function lacatPeTelefon(tx: Prisma.TransactionClient, telefonNormalizat: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`client-telefon:${telefonNormalizat}`}))`;
}

// SINGURA functie care creeaza clienti. Indexul unic partial din baza e plasa de siguranta: daca
// numarul e deja al unui client nemarcat, raspunsul e 409 cu campul si motivul, nu eroare generica.
export async function creeazaClientNou(tx: Prisma.TransactionClient, curate: DateClientCurate, utilizator: Utilizator): Promise<Client> {
  let client: Client;
  try {
    client = await tx.client.create({ data: { ...curate, adresa: curate.adresa ?? ADRESA_NECOMPLETATA, creatDeId: utilizator.id } });
  } catch (e) {
    if (esteIncalcareDeUnicitate(e)) throw eroareTelefonExistent();
    throw e;
  }
  await tx.jurnalIntrare.create({ data: { utilizatorId: utilizator.id, numeUtilizatorLaMoment: utilizator.nume, entitate: "Client", entitateId: client.id, actiune: "creare" } });
  return client;
}

// datele trimise actualizeaza fisa clientului (baza e comuna, ultimele date sunt cele bune), cu jurnal.
// S27b (BUG-17): DOAR ce a fost scris efectiv - un camp lasat gol (lipsa, null sau text gol) nu sterge si
// nu inlocuieste nimic din fisa unui client existent. E singurul loc care scrie intr-o fisa existenta.
async function actualizeazaClient(tx: Prisma.TransactionClient, existent: Client, curate: DateClientCurate, utilizator: Utilizator): Promise<void> {
  const scrise: Prisma.ClientUncheckedUpdateInput = {};
  const dupa: Record<string, unknown> = { ...existent };
  const campuri: string[] = [];
  for (const c of CAMPURI_CLIENT) {
    const valoare = curate[c];
    if (valoare === null || valoare === undefined || valoare === "" || valoare === existent[c]) continue;
    scrise[c] = valoare;
    dupa[c] = valoare;
    campuri.push(c);
  }
  // telefonul scris isi aduce si forma normalizata (cheia de deduplicare)
  if (campuri.includes("telefon")) scrise.telefonNormalizat = curate.telefonNormalizat;
  if (curate.telefonDublat !== undefined && curate.telefonDublat !== existent.telefonDublat) {
    scrise.telefonDublat = curate.telefonDublat;
    dupa.telefonDublat = curate.telefonDublat;
    campuri.push("telefonDublat");
  }
  if (campuri.length === 0) return;
  try {
    await tx.client.update({ where: { id: existent.id }, data: scrise });
  } catch (e) {
    if (esteIncalcareDeUnicitate(e)) throw eroareTelefonExistent();
    throw e;
  }
  await scrieModificariTx(tx, utilizator, "Client", existent.id, campuri, existent, dupa);
}

// clientii pe care contul ii poate primi ca sugestie pe nume / alege din lista: cei cu oferte vizibile lui
// (Agent / Colaborator - ofertele lui; Administrator - ale firmei; Admin general - toate) si cei creati de el
export function filtruClientiVizibili(u: Utilizator): Prisma.ClientWhereInput {
  const oferte = filtruVizibilitateOferte(u);
  return { OR: [...(oferte ? [{ oferte: { some: oferte } }] : []), { creatDeId: u.id }] };
}

// clientul ales din lista de sugestii, daca e vizibil contului si NU are telefon (cel cu telefon se leaga prin numar)
async function clientAlesFaraTelefon(tx: Prisma.TransactionClient, alesId: string | null | undefined, utilizator: Utilizator): Promise<Client | null> {
  if (!alesId) return null;
  const ales = await tx.client.findFirst({ where: { AND: [{ id: alesId }, filtruClientiVizibili(utilizator)] } });
  return ales && !ales.telefonNormalizat ? ales : null;
}

// clientul cu acest telefon (cel nemarcat "telefon dublat"), sau unul nou; fara telefon = client nou.
// "alesId" (BUG-15) = clientul ales din sugestiile pe nume: daca n-are telefon, oferta se leaga de el
// (i se pune si telefonul scris acum, cand numarul e nou in baza)
export async function gasesteSauCreeazaClient(tx: Prisma.TransactionClient, date: DateClientScrise, utilizator: Utilizator, alesId?: string | null): Promise<{ client: { id: string }; nou: boolean }> {
  const curate = dateCurate(date);
  const ales = await clientAlesFaraTelefon(tx, alesId, utilizator);
  if (ales) {
    if (curate.telefonNormalizat) await lacatPeTelefon(tx, curate.telefonNormalizat);
    const alAltuia = curate.telefonNormalizat ? await tx.client.findFirst({ where: { telefonNormalizat: curate.telefonNormalizat, telefonDublat: false } }) : null;
    if (!alAltuia) {
      await actualizeazaClient(tx, ales, curate, utilizator);
      return { client: ales, nou: false };
    }
    // numarul scris e al altui client: legarea obisnuita, pe numar (mai jos)
  }
  if (!curate.telefonNormalizat) return { client: await creeazaClientNou(tx, curate, utilizator), nou: true };
  await lacatPeTelefon(tx, curate.telefonNormalizat);
  const existent = await tx.client.findFirst({ where: { telefonNormalizat: curate.telefonNormalizat, telefonDublat: false } });
  if (existent) {
    await actualizeazaClient(tx, existent, curate, utilizator);
    return { client: existent, nou: false };
  }
  return { client: await creeazaClientNou(tx, curate, utilizator), nou: true };
}

// clientul unei oferte existente, dupa datele scrise pe pagina ei (PUT /api/oferte/:id/client):
// - acelasi numar (sau tot fara telefon): datele se actualizeaza pe loc;
// - clientul n-avea telefon si primeste unul: numar nou in baza -> se pune pe el; numarul unui client
//   existent -> PROPUNEREA DE LEGARE (409 cu clientul existent); "leaga" muta oferta pe clientul
//   existent si ii actualizeaza fisa, "pastreaza" lasa telefonul pe clientul ofertei, marcat "telefon dublat";
// - clientul avea telefon si numarul se schimba sau se sterge: ca pana acum - clientul cu noul numar
//   (existent sau nou); cel vechi ramane neatins.
export async function clientulOfertei(tx: Prisma.TransactionClient, clientCurentId: string, date: DateClient, legare: "leaga" | "pastreaza" | undefined, utilizator: Utilizator, alesId?: string | null): Promise<string> {
  const curate = dateCurate(date);
  const curent = await tx.client.findUniqueOrThrow({ where: { id: clientCurentId } });
  // S27 (BUG-15): clientul ales din sugestiile pe nume - fara telefon: oferta se muta pe el prin alegere;
  // cu telefon: alegerea e raspunsul "leaga" la propunerea de legare (numarul ramane cheia)
  if (alesId && alesId !== curent.id) {
    const ales = await clientAlesFaraTelefon(tx, alesId, utilizator);
    if (ales && !curate.telefonNormalizat) {
      await actualizeazaClient(tx, ales, curate, utilizator);
      return ales.id;
    }
    if (!ales && curate.telefonNormalizat && !legare) {
      const cuTelefon = await tx.client.findFirst({ where: { AND: [{ id: alesId, telefonNormalizat: curate.telefonNormalizat }, filtruClientiVizibili(utilizator)] }, select: { id: true } });
      if (cuTelefon) legare = "leaga";
    }
  }
  if (curate.telefonNormalizat === curent.telefonNormalizat) {
    await actualizeazaClient(tx, curent, curate, utilizator);
    return curent.id;
  }
  if (!curent.telefonNormalizat && curate.telefonNormalizat) {
    await lacatPeTelefon(tx, curate.telefonNormalizat);
    const existent = await tx.client.findFirst({ where: { telefonNormalizat: curate.telefonNormalizat, telefonDublat: false } });
    if (!existent) {
      await actualizeazaClient(tx, curent, curate, utilizator);
      return curent.id;
    }
    if (!legare) {
      throw new EroareClient(
        `Telefonul e deja al clientului ${existent.nume}${existent.localitate ? ` (${existent.localitate})` : ""}. Este același client?`,
        409,
        [{ camp: "telefon", eticheta: "Telefon", mesaj: `numărul e deja al clientului ${existent.nume} — leagă oferta de el sau păstrează clientul nou` }],
        clientPublic(existent),
      );
    }
    if (legare === "leaga") {
      await actualizeazaClient(tx, existent, curate, utilizator);
      return existent.id;
    }
    await actualizeazaClient(tx, curent, { ...curate, telefonDublat: true }, utilizator);
    return curent.id;
  }
  return (await gasesteSauCreeazaClient(tx, date, utilizator)).client.id;
}

async function scrieModificariTx(tx: Prisma.TransactionClient, utilizator: Utilizator, entitate: string, entitateId: string, campuri: string[], inainte: Record<string, unknown>, dupa: Record<string, unknown>) {
  const laText = (v: unknown) => (v === null || v === undefined ? null : String(v));
  const randuri = campuri
    .filter((c) => laText(inainte[c]) !== laText(dupa[c]))
    .map((c) => ({ utilizatorId: utilizator.id, numeUtilizatorLaMoment: utilizator.nume, entitate, entitateId, actiune: "modificare", camp: c, valoareInainte: laText(inainte[c]), valoareDupa: laText(dupa[c]) }));
  if (randuri.length > 0) await tx.jurnalIntrare.createMany({ data: randuri });
}

// S28 (BUG-19): stergerea EXPLICITA dintr-o fisa (cosul de pe fisa clientului) - singurul drum pe care un camp
// se goleste (BUG-17: un camp lasat gol la salvare nu sterge nimic). Doar e-mailul, observatiile si adresa;
// telefonul e cheia de deduplicare si se inlocuieste, nu se sterge. Adresa stearsa ramane "necompletata"
// (coloana e obligatorie in baza); ofertele isi pastreaza adresa lucrarii lor.
const CAMPURI_DE_STERS = ["email", "observatii", "adresa"] as const;
type CampDeSters = (typeof CAMPURI_DE_STERS)[number];
const ETICHETA_CAMP_DE_STERS: Record<CampDeSters, string> = { email: "e-mailul", observatii: "observațiile", adresa: "adresa" };

// cosul il au conturile care fac oferte, pe clientii pe care ii vad (regula sugestiilor pe nume, BUG-15), si Admin general
async function poateStergeDinFisa(u: Utilizator, clientId: string): Promise<boolean> {
  if (u.rol === "ADMIN_GENERAL") return true;
  return (await prisma.client.count({ where: { AND: [{ id: clientId }, filtruClientiVizibili(u)] } })) > 0;
}

export function clientPublic(c: { id: string; nume: string; telefon: string | null; adresa: string; localitate: string | null; email: string | null; observatii: string | null }) {
  return { id: c.id, nume: c.nume, telefon: c.telefon, adresa: c.adresa, localitate: c.localitate, email: c.email, observatii: c.observatii };
}

export const clientiRouter = Router();
clientiRouter.use(cereAutentificare);
clientiRouter.use((req, res, next) => {
  if (!ROLURI_CU_OFERTE.includes(req.utilizator!.rol) && req.utilizator!.rol !== "ADMIN_GENERAL") {
    res.status(403).json({ eroare: "Clienții se văd din zona de ofertare (Etapa 5 pentru Contabilitate / Gestiune)" });
    return;
  }
  next();
});

// cautare pentru autocompletare: dupa telefon (normalizat, prefix) sau nume
clientiRouter.get("/", async (req, res) => {
  const { telefon, q, nume } = z.object({ telefon: z.string().trim().optional(), q: z.string().trim().optional(), nume: z.string().trim().max(100).optional() }).parse(req.query);
  // S27 (BUG-15): sugestiile pe nume - de la 3 litere, fara diacritice, doar clientii vizibili contului
  if (nume !== undefined) {
    if (nume.length < 3) {
      res.json({ clienti: [] });
      return;
    }
    const gasiti = await prisma.client.findMany({ where: { AND: [{ id: { in: await idsCuTextul("client", ["nume"], nume) } }, filtruClientiVizibili(req.utilizator!)] }, orderBy: [{ nume: "asc" }, { createdAt: "asc" }], take: 10 });
    res.json({ clienti: gasiti.map(clientPublic) });
    return;
  }
  const where: Prisma.ClientWhereInput = {};
  if (telefon && normalizeazaTelefon(telefon).length >= 4) where.telefonNormalizat = { startsWith: normalizeazaTelefon(telefon) };
  // S25 BUG-10: numele si localitatea fara diacritice
  else if (q && q.length >= 2) where.id = { in: await idsCuTextul("client", ["nume", "localitate"], q) };
  else {
    res.json({ clienti: [] });
    return;
  }
  const clienti = await prisma.client.findMany({ where, orderBy: { nume: "asc" }, take: 10 });
  res.json({ clienti: clienti.map(clientPublic) });
});

// fisa clientului: datele lui si ofertele lui, in limita vizibilitatii contului
clientiRouter.get("/:id", async (req, res) => {
  const client = await prisma.client.findUnique({ where: { id: req.params.id } });
  if (!client) {
    res.status(404).json({ eroare: "Clientul nu există" });
    return;
  }
  const vizibilitate = filtruVizibilitateOferte(req.utilizator!);
  const oferte = vizibilitate
    ? await prisma.oferta.findMany({
        where: { AND: [vizibilitate, { clientId: client.id, curenta: true }] },
        orderBy: [{ data: "desc" }, { createdAt: "desc" }],
        select: { id: true, serie: true, numar: true, data: true, status: true, statusLa: true, updatedAt: true, utilizator: { select: { id: true, nume: true } }, completareLa: { select: { serie: true, numar: true } }, motivCompletare: true },
      })
    : [];
  // S28 (BUG-19): "poateSterge" = contul are cosul pe aceasta fisa
  res.json({ client: clientPublic(client), poateSterge: await poateStergeDinFisa(req.utilizator!, client.id), oferte: oferte.map((o) => ({ ...o, numarComplet: numarComplet(o.serie, o.numar) })) });
});

// S28 (BUG-19): cosul - goleste un camp al fisei, cu jurnal (cine, cand, valoarea stearsa)
clientiRouter.delete("/:id/campuri/:camp", async (req, res) => {
  const u = req.utilizator!;
  const camp = String(req.params.camp) as CampDeSters;
  if (!CAMPURI_DE_STERS.includes(camp)) {
    res.status(400).json({
      eroare: String(req.params.camp) === "telefon" ? "Telefonul nu se șterge — se înlocuiește cu numărul corect (după el recunoaște softul clientul)" : "Din fișa clientului se pot șterge doar e-mailul, observațiile și adresa",
    });
    return;
  }
  const client = await prisma.client.findUnique({ where: { id: req.params.id } });
  if (!client) {
    res.status(404).json({ eroare: "Clientul nu există" });
    return;
  }
  if (!(await poateStergeDinFisa(u, client.id))) {
    res.status(403).json({ eroare: `Din fișa clientului șterg doar conturile care au oferte pentru el și Admin general (${ETICHETA_CAMP_DE_STERS[camp]} rămâne)` });
    return;
  }
  const veche = client[camp];
  const goala = camp === "adresa" ? ADRESA_NECOMPLETATA : null;
  if (veche === null || veche.trim() === "" || veche === goala) {
    res.json({ client: clientPublic(client) }); // deja gol: nimic de sters, nimic in jurnal
    return;
  }
  const dupa = await prisma.$transaction(async (tx) => {
    const d = await tx.client.update({ where: { id: client.id }, data: { [camp]: goala } });
    await tx.jurnalIntrare.create({ data: { utilizatorId: u.id, numeUtilizatorLaMoment: u.nume, entitate: "Client", entitateId: client.id, actiune: "modificare", camp, valoareInainte: veche, valoareDupa: null } });
    return d;
  });
  res.json({ client: clientPublic(dupa) });
});

export function numarComplet(serie: string, numar: number): string {
  return `${serie}-${String(numar).padStart(4, "0")}`;
}
