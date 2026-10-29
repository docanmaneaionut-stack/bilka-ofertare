import fs from "node:fs/promises";
import path from "node:path";
import type { Utilizator } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../../../db/prisma.js";
import { env } from "../../../env.js";
import { numarComplet } from "../clienti.js";
import { EroareDocument } from "../documente/index.js";
import { includeProduse } from "../intrareMot.js";
import { scrieIstoric } from "../istoric.js";
import { rezultatSauSalvat } from "../preturi.js";
import { poateVedeaOferta } from "../vizibilitate.js";
import { EroareNumeLipsa, umpleFormulare, type FormularUmplut } from "./continut.js";
import { citesteSablon, EroareSablon, type Sablon } from "./sablon.js";
import { activeazaRecalcul, EroareScriere, scrieCelule } from "./scrie.js";
import { EroareZip, rescrieZip } from "./zip.js";

// Formularele de comanda Bilka (S16b; FISA-OFERTARE 3.5, R10; docs/FORMULAR-BILKA-HARTA.md):
// un fisier .xlsm completat per formular, din sablonul firmei (incarcat de Admin
// general in Zona tehnica -> Firme), cu macro-urile Bilka neatinse; de la statusul
// "De comandat" (rezultatul motorului) si la "Comandat" (rezultatul salvat);
// fisierele raman documente ale ofertei (SERIE-NR-F1.xlsm, -F2...), cu avertizarile
// generarii; intrare in istoric. Colaboratorul nu primeste formularul (e comanda
// firmei catre furnizor). Nicio comanda nu pleaca de aici: agentul deschide
// fisierul in Excel si il trimite in SAP ca pana acum.

export const formulareBilkaRouter = Router({ mergeParams: true });

export const STATUSURI_FORMULAR = ["DE_COMANDAT", "COMANDAT"] as const;

export function poateGeneraFormulare(u: Utilizator, oferta: { utilizatorId: string; firmaId: string }): boolean {
  return poateVedeaOferta(u, oferta) && u.rol !== "COLABORATOR";
}

export function caleSablonFirma(firma: { sablonBilka: string | null }): string | null {
  return firma.sablonBilka ? path.resolve(env.dateDir, firma.sablonBilka) : null;
}

// fisierele unui set de formulare, din sablonul dat (fara baza de date; folosit si de teste)
export function fisiereDinUmplere(sablon: Sablon, formulare: FormularUmplut[]): { nr: number; continut: Buffer; avertizari: string[] }[] {
  return formulare.map((f) => {
    const peFoaie = new Map<string, Map<string, string | number | null>>();
    for (const s of f.scrieri) {
      if (!peFoaie.has(s.foaie)) peFoaie.set(s.foaie, new Map());
      peFoaie.get(s.foaie)!.set(s.celula, s.valoare);
    }
    const inlocuiri = new Map<string, Buffer>();
    for (const [foaie, celule] of peFoaie) inlocuiri.set(foaie, Buffer.from(scrieCelule(sablon.xml(foaie), celule), "utf8"));
    inlocuiri.set("xl/workbook.xml", Buffer.from(activeazaRecalcul(sablon.xml("xl/workbook.xml")), "utf8"));
    return { nr: f.nr, continut: rescrieZip(sablon.buf, sablon.intrari, inlocuiri), avertizari: f.avertizari };
  });
}

export async function genereazaFormulareBilka(ofertaId: string, u: Utilizator) {
  const o = await prisma.oferta.findUniqueOrThrow({ where: { id: ofertaId }, include: { ...includeProduse, client: { select: { nume: true, telefon: true, localitate: true } }, firma: { select: { denumire: true, sablonBilka: true, sablonBilkaVersiune: true } } } });
  if (!(STATUSURI_FORMULAR as readonly string[]).includes(o.status)) throw new EroareDocument("Formularele Bilka se generează de la statusul „De comandat” (și la „Comandat”, din rezultatul salvat)", 409);
  const cale = caleSablonFirma(o.firma);
  if (!cale) throw new EroareDocument(`Firma ${o.firma.denumire} nu are încărcat șablonul formularului de comandă Bilka — Admin general îl încarcă din Zona tehnică → Firme`, 409);
  let sablon: Sablon;
  try {
    sablon = citesteSablon(await fs.readFile(cale));
  } catch (e) {
    if (e instanceof EroareSablon || e instanceof EroareZip) throw new EroareDocument(`Șablonul firmei nu poate fi folosit: ${e.message}`, 409);
    if ((e as NodeJS.ErrnoException).code === "ENOENT") throw new EroareDocument("Fișierul șablonului Bilka lipsește din folderul de date; încarcă-l din nou din Zona tehnică → Firme", 409);
    throw e;
  }
  const { rezultat, eroare } = rezultatSauSalvat(o);
  if (!rezultat) throw new EroareDocument(`Oferta nu se poate calcula: ${eroare ?? "fără rezultat"}`, 409);
  if (rezultat.formulareBilka.length === 0) throw new EroareDocument("Oferta nu are produse pentru formularul Bilka", 409);

  const corespondente = await prisma.corespondentaFormularBilka.findMany({ where: { activ: true }, select: { cheie: true, cuvant: true, numeFormular: true } });
  const ids = [...new Set([...o.invelitori, ...o.linii].map((x) => x.produsId).filter((x): x is string => Boolean(x)))];
  const produse = new Map((ids.length ? await prisma.produs.findMany({ where: { id: { in: ids } }, select: { id: true, modulCm: true, treapta: true } }) : []).map((p) => [p.id, { modulCm: p.modulCm?.toString() ?? null, treapta: p.treapta }]));
  const nrComplet = numarComplet(o.serie, o.numar);
  let formulare: FormularUmplut[];
  try {
    formulare = umpleFormulare({
      harta: sablon.harta,
      oferta: o,
      rezultat,
      corespondente,
      produse,
      antet: { numarComplet: nrComplet, localitate: o.localitate ?? o.client.localitate, telefon: o.client.telefon },
    });
  } catch (e) {
    // G6: tabela de corespondenta si sablonul nu se potrivesc - oprire cu mesaj, nu formular gresit
    if (e instanceof EroareNumeLipsa) throw new EroareDocument(e.message, 409);
    throw e;
  }
  let fisiere: ReturnType<typeof fisiereDinUmplere>;
  try {
    fisiere = fisiereDinUmplere(sablon, formulare);
  } catch (e) {
    if (e instanceof EroareScriere) throw new EroareDocument(`Șablonul firmei nu se poate completa: ${e.message}`, 409);
    throw e;
  }

  const acum = new Date();
  const marca = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(acum).replace(/[: ]/g, "-");
  const folder = path.join(env.dateDir, "oferte", o.id, "documente");
  await fs.mkdir(folder, { recursive: true });
  const documente: Awaited<ReturnType<typeof prisma.ofertaDocument.create<{ data: { ofertaId: string; tip: "FORMULAR_BILKA"; versiune: number; nume: string; fisier: string; marime: number; generatDeId: string; formularNr: number; avertizari: string | null }; include: { generatDe: { select: { nume: true } } } }>>>[] = [];
  for (const f of fisiere) {
    const nume = `${nrComplet}${o.versiune > 1 ? `-v${o.versiune}` : ""}-F${f.nr}.xlsm`;
    const peDisc = `${nrComplet}${o.versiune > 1 ? `-v${o.versiune}` : ""}-F${f.nr}-${marca}.xlsm`;
    await fs.writeFile(path.join(folder, peDisc), f.continut);
    documente.push(
      await prisma.ofertaDocument.create({
        data: { ofertaId: o.id, tip: "FORMULAR_BILKA", versiune: o.versiune, nume, fisier: path.join("oferte", o.id, "documente", peDisc), marime: f.continut.length, generatDeId: u.id, formularNr: f.nr, avertizari: f.avertizari.length > 0 ? f.avertizari.join("\n") : null },
        include: { generatDe: { select: { nume: true } } },
      }),
    );
  }
  const avertizari = fisiere.flatMap((f) => f.avertizari.map((a) => (fisiere.length > 1 ? `F${f.nr}: ${a}` : a)));
  await prisma.$transaction(async (tx) => {
    await scrieIstoric(tx, o, u, [{ tip: "document", camp: "document", inainte: null, dupa: `Formulare Bilka generate din șablonul „${o.firma.sablonBilkaVersiune ?? "?"}”: ${documente.map((d) => d.nume).join(", ")}${avertizari.length > 0 ? ` — ${avertizari.length} avertizări` : ""}` }]);
  });
  return { documente, avertizari, continut: formulare.map((f) => ({ nr: f.nr, continut: f.continut })) };
}

const idDin = (req: { params: Record<string, unknown> }) => String(req.params.id ?? "");

formulareBilkaRouter.post("/", async (req, res) => {
  const u = req.utilizator!;
  const o = await prisma.oferta.findUnique({ where: { id: idDin(req) }, select: { id: true, utilizatorId: true, firmaId: true, status: true } });
  if (!o || !poateVedeaOferta(u, o)) {
    res.status(404).json({ eroare: "Oferta nu există sau nu e vizibilă" });
    return;
  }
  if (!poateGeneraFormulare(u, o)) {
    res.status(403).json({ eroare: "Formularul de comandă Bilka nu e disponibil colaboratorilor" });
    return;
  }
  try {
    const r = await genereazaFormulareBilka(o.id, u);
    res.status(201).json({
      documente: r.documente.map((d) => ({ id: d.id, tip: d.tip, eticheta: "Formular Bilka", versiune: d.versiune, nume: d.nume, marime: d.marime, pagini: null, generatLa: d.generatLa, generatDe: d.generatDe?.nume ?? null, transmisLa: d.transmisLa, canal: d.canal, formularNr: d.formularNr, avertizari: d.avertizari })),
      avertizari: r.avertizari,
    });
  } catch (e) {
    if (e instanceof EroareDocument) {
      res.status(e.status).json({ eroare: e.message });
      return;
    }
    throw e;
  }
});
