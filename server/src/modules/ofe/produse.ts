import type { Prisma, Utilizator } from "@prisma/client";
import { z } from "zod";
import { ZodError } from "zod";
import { prisma } from "../../db/prisma.js";
import { calculeazaOferta } from "../mot/calcul.js";
import { selectProdusEditor, spreProdusEditor, type ProdusEditor } from "./catalog.js";
import { includeProduse, rezultatStructura, spreIntrareMot, type RezultatStructura } from "./intrareMot.js";

// Salvarea zonei produselor (FISA-OFERTARE cap. 3-10): starea editorului vine
// intreaga, serverul ia snapshot-ul fiecarui produs din catalog (cod, denumire,
// UM, finisaj, grosime, grup, familie, optiune, pretul de baza din lista activa)
// si inlocuieste copiii ofertei intr-o tranzactie. Cat e "In lucru" nu se
// jurnalizeaza (istoricul incepe la "Transmisa", S15). Apoi motorul (INGHETAT)
// da cantitatile si structura.

const suma = z.string().trim().regex(/^-?\d+([.,]\d+)?$/, "număr");
const pozitiva = suma.refine((s) => Number(s.replace(",", ".")) > 0, "trebuie să fie mai mare decât 0");
const nenegativa = suma.refine((s) => Number(s.replace(",", ".")) >= 0, "nu poate fi negativă");
const schemaPozitie = z.object({ lungimeM: pozitiva, bucati: z.number().int().min(1) });

export const schemaProduse = z.object({
  grupaPct: nenegativa.optional(),
  precizariZonaB: z.string().trim().max(4000).nullish(),
  invelitori: z.array(
    z.object({
      cheie: z.string().min(1),
      produsId: z.string().min(1),
      culoare: z.string().trim().nullish(),
      latimeTotalaM: pozitiva.optional(),
      mpDirect: pozitiva.nullish(),
      panotaj: z.array(schemaPozitie).default([]),
      variantaProfil: z.string().trim().nullish(),
    }),
  ),
  linii: z.array(
    z.object({
      cheie: z.string().min(1),
      rubrica: z.string().trim().min(1),
      produsId: z.string().min(1),
      cantitate: pozitiva,
      invelitoare: z.string().min(1).nullish(),
      culoare: z.object({ ral: z.string().trim().min(1), finisaj: z.string().trim().nullish(), grosime: z.string().trim().nullish() }).nullish(),
      pozitii: z.array(schemaPozitie).optional(),
    }),
  ),
  sipca: z
    .object({
      linie: z.string().min(1),
      model: z.string().trim().min(1),
      culoare: z.string().trim().nullish(),
      varianta: z.enum(["comanda", "calcul"]),
      tronsoane: z.array(z.object({ lungimeSipcaM: pozitiva, lungimeTronsonM: pozitiva, distantaMm: nenegativa })).optional(),
    })
    .nullish(),
  zonaB: z
    .array(
      z.object({
        denumire: z.string().trim().min(1),
        um: z.string().trim().min(1),
        cantitate: pozitiva,
        sumaLei: nenegativa,
        contineTva: z.boolean().default(false),
        preiaInFactura: z.boolean().default(false),
      }),
    )
    .default([]),
});
export type DateProduse = z.infer<typeof schemaProduse>;

export class EroareProduse extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

const nr = (s: string) => s.replace(",", ".");

// produsele cerute, cu pretul de baza din lista activa (snapshot)
async function produseCuPret(ids: string[]): Promise<Map<string, { editor: ProdusEditor; pret: string; activ: boolean }>> {
  const randuri = await prisma.produs.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { ...selectProdusEditor, preturi: { where: { listaPret: { status: "ACTIVA" } }, select: { pret: true } } },
  });
  const m = new Map<string, { editor: ProdusEditor; pret: string; activ: boolean }>();
  for (const r of randuri) {
    const pret = r.preturi[0]?.pret;
    if (pret === undefined) continue;
    m.set(r.id, { editor: spreProdusEditor(r), pret: pret.toString(), activ: r.activ });
  }
  return m;
}

function snapshot(p: ProdusEditor, pret: string) {
  return { produsId: p.id, cod: p.cod, denumire: p.denumire, um: p.um, finisaj: p.finisaj, grosime: p.grosime, grup: p.grup, familie: p.familie, optiune: p.optiune, pretBazaEur: pret };
}

// latimea totala a invelitorii: din catalog, iar la tabla plana la mp din varianta (1,25 m)
export function latimeInvelitoare(p: ProdusEditor): string | null {
  if (p.latimeTotalaM) return p.latimeTotalaM;
  if (p.tablaPlana === "mp" && p.varianta) {
    const m = /^\s*(\d+(?:[.,]\d+)?)/.exec(p.varianta);
    if (m) return m[1].replace(",", ".");
  }
  return null;
}

export async function salveazaProduse(ofertaId: string, date: DateProduse, u: Utilizator): Promise<void> {
  const ids = [...date.invelitori.map((i) => i.produsId), ...date.linii.map((l) => l.produsId)];
  const produse = await produseCuPret(ids);
  const ia = (id: string, ce: string) => {
    const p = produse.get(id);
    if (!p) throw new EroareProduse(`${ce}: produsul nu există în catalog sau nu are preț în lista activă`);
    if (!p.activ) throw new EroareProduse(`${ce}: produsul ${p.editor.denumire} e inactiv în catalog`);
    return p;
  };
  const cheiInvelitori = new Set(date.invelitori.map((i) => i.cheie));
  for (const l of date.linii) {
    if (l.invelitoare && !cheiInvelitori.has(l.invelitoare)) throw new EroareProduse(`Linia ${l.cheie} e legată de o învelitoare care nu există`);
    if (l.invelitoare && l.culoare) throw new EroareProduse(`Linia ${l.cheie}: o linie are fie învelitoarea, fie cheia ei de culoare, nu amândouă`);
  }
  if (date.sipca && !date.linii.some((l) => l.cheie === date.sipca!.linie)) throw new EroareProduse("Șipca nu are linie în ofertă");
  if (date.sipca?.varianta === "calcul" && !(date.sipca.tronsoane?.length)) throw new EroareProduse("Șipca în varianta Calcul are nevoie de cel puțin un tronson");
  for (const i of date.invelitori) {
    if (i.panotaj.length === 0 && !i.mpDirect) throw new EroareProduse(`Învelitoarea ${ia(i.produsId, "învelitoare").editor.denumire} nu are cantitate: panotaj (lungime × bucăți) sau suprafață în mp`);
  }

  await prisma.$transaction(async (tx) => {
    // copiii vechi, in ordinea cheilor straine
    await tx.ofertaTronson.deleteMany({ where: { sipca: { ofertaId } } });
    await tx.ofertaSipca.deleteMany({ where: { ofertaId } });
    await tx.ofertaPozitie.deleteMany({ where: { OR: [{ linie: { ofertaId } }, { invelitoare: { ofertaId } }] } });
    await tx.ofertaLinie.deleteMany({ where: { ofertaId } });
    await tx.ofertaInvelitoare.deleteMany({ where: { ofertaId } });
    await tx.ofertaZonaB.deleteMany({ where: { ofertaId } });

    const idInvelitoare = new Map<string, string>();
    for (const [idx, i] of date.invelitori.entries()) {
      const p = ia(i.produsId, `Învelitoarea ${idx + 1}`);
      const latime = i.latimeTotalaM ? nr(i.latimeTotalaM) : latimeInvelitoare(p.editor);
      if (!latime) throw new EroareProduse(`Învelitoarea ${p.editor.denumire} nu are lățime totală în catalog; introdu-o`);
      const creat = await tx.ofertaInvelitoare.create({
        data: {
          ofertaId,
          ordine: idx + 1,
          rol: idx === 0 ? "principala" : "secundara",
          ...snapshot(p.editor, p.pret),
          culoare: i.culoare || null,
          latimeTotalaM: latime,
          mpDirect: i.mpDirect ? nr(i.mpDirect) : null,
          variantaProfil: i.variantaProfil || null,
          panotaj: { create: i.panotaj.map((poz, k) => ({ ordine: k + 1, lungimeM: nr(poz.lungimeM), bucati: poz.bucati })) },
        },
      });
      idInvelitoare.set(i.cheie, creat.id);
    }
    // linia fiecarei invelitori (rubrica Invelitori): motorul o cere pentru mp si pachet;
    // cantitatea o calculeaza el din panotaj / mp direct
    let ordine = 0;
    for (const i of date.invelitori) {
      const p = ia(i.produsId, "Învelitoarea");
      await tx.ofertaLinie.create({ data: { ofertaId, ordine: ++ordine, rubrica: "Învelitori", ...snapshot(p.editor, p.pret), cantitate: "1" } });
    }
    const idLinie = new Map<string, string>();
    for (const [idx, l] of date.linii.entries()) {
      const p = ia(l.produsId, `Linia ${idx + 1}`);
      const creat = await tx.ofertaLinie.create({
        data: {
          ofertaId,
          ordine: ++ordine,
          rubrica: l.rubrica,
          ...snapshot(p.editor, p.pret),
          cantitate: nr(l.cantitate),
          invelitoareId: l.invelitoare ? idInvelitoare.get(l.invelitoare)! : null,
          culoareRal: l.culoare?.ral ?? null,
          culoareFinisaj: l.culoare?.finisaj ?? null,
          culoareGrosime: l.culoare?.grosime ?? null,
          pozitii: { create: (l.pozitii ?? []).map((poz, k) => ({ ordine: k + 1, lungimeM: nr(poz.lungimeM), bucati: poz.bucati })) },
        },
      });
      idLinie.set(l.cheie, creat.id);
    }
    if (date.sipca) {
      const linie = date.linii.find((l) => l.cheie === date.sipca!.linie)!;
      const p = ia(linie.produsId, "Șipca");
      const latime = p.editor.latimeTotalaMm;
      if (!latime) throw new EroareProduse(`${p.editor.denumire}: lățimea șipcii lipsește din catalog`);
      await tx.ofertaSipca.create({
        data: {
          ofertaId,
          linieId: idLinie.get(date.sipca.linie)!,
          model: date.sipca.model,
          culoare: date.sipca.culoare || null,
          latimeSipcaMm: latime,
          varianta: date.sipca.varianta === "calcul" ? "CALCUL" : "COMANDA",
          tronsoane: { create: (date.sipca.tronsoane ?? []).map((t, k) => ({ ordine: k + 1, lungimeSipcaM: nr(t.lungimeSipcaM), lungimeTronsonM: nr(t.lungimeTronsonM), distantaMm: nr(t.distantaMm) })) },
        },
      });
    }
    if (date.zonaB.length > 0) {
      await tx.ofertaZonaB.createMany({ data: date.zonaB.map((zb, k) => ({ ofertaId, ordine: k + 1, denumire: zb.denumire, um: zb.um, cantitate: nr(zb.cantitate), sumaLei: nr(zb.sumaLei), contineTva: zb.contineTva, preiaInFactura: zb.preiaInFactura })) });
    }
    const data: Prisma.OfertaUpdateInput = { modificatDe: { connect: { id: u.id } } };
    if (date.grupaPct !== undefined) data.grupaPct = nr(date.grupaPct);
    if (date.precizariZonaB !== undefined) data.precizariZonaB = date.precizariZonaB || null;
    await tx.oferta.update({ where: { id: ofertaId }, data });
  });
}

// rezultatul motorului pentru oferta (doar cantitati si structura); o oferta
// fara produse nu se calculeaza
export async function calculeazaStructura(ofertaId: string): Promise<{ rezultat: RezultatStructura | null; eroare: string | null }> {
  const o = await prisma.oferta.findUniqueOrThrow({ where: { id: ofertaId }, include: includeProduse });
  if (o.invelitori.length === 0 && o.linii.length === 0) return { rezultat: null, eroare: null };
  try {
    return { rezultat: rezultatStructura(calculeazaOferta(spreIntrareMot(o))), eroare: null };
  } catch (e) {
    if (e instanceof ZodError) return { rezultat: null, eroare: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
    return { rezultat: null, eroare: e instanceof Error ? e.message : String(e) };
  }
}
