import type { Produs } from "@prisma/client";
import { CAMPURI_PRODUS_IMPORT, type Diferente, type ProdusImport, type RandReferintaImport, type SchimbareCamp, type TipReferinta } from "./tipuri.js";

type ProdusExistent = Produs & { categorieOfertaDenumire: string | null; grupDenumire: string; familieDenumire: string | null; pretActiv: number | null };

function laText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(6)));
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "object" && v !== null && "toNumber" in (v as object)) {
    // Prisma Decimal
    return laText((v as { toNumber: () => number }).toNumber());
  }
  return String(v);
}

function valoareExistenta(p: ProdusExistent, camp: (typeof CAMPURI_PRODUS_IMPORT)[number]): unknown {
  switch (camp) {
    case "grup":
      return p.grupDenumire;
    case "familie":
      return p.familieDenumire;
    case "categorieOferta":
      return p.categorieOfertaDenumire;
    default:
      return p[camp];
  }
}

export function campuriSchimbate(existent: ProdusExistent, nou: ProdusImport, faraActiv = false): SchimbareCamp[] {
  const schimbari: SchimbareCamp[] = [];
  for (const camp of CAMPURI_PRODUS_IMPORT) {
    if (faraActiv && camp === "activ") continue;
    const inainte = laText(valoareExistenta(existent, camp));
    const dupa = laText(nou[camp]);
    if (inainte !== dupa) schimbari.push({ camp, inainte, dupa });
  }
  return schimbari;
}

function cheieRedenumire(codFurnizor: string | null, categorie: string | null, um: string | null) {
  return `${codFurnizor}|${categorie}|${um}`;
}

export function calculeazaDiferenteProduse(
  existente: ProdusExistent[],
  importate: ProdusImport[],
): { produse: Diferente["produse"]; grupuriNoi: string[]; familiiNoi: { grup: string; familie: string }[] } {
  const dupaCod = new Map(existente.map((p) => [p.codIntern, p]));
  const vazute = new Set<string>();

  const noi: ProdusImport[] = [];
  const modificate: Diferente["produse"]["modificate"] = [];
  const preturiModificate: Diferente["produse"]["preturiModificate"] = [];
  const reaparute: Diferente["produse"]["reaparute"] = [];
  let preturiNoi = 0;
  let neschimbate = 0;

  for (const nou of importate) {
    vazute.add(nou.codIntern);
    const existent = dupaCod.get(nou.codIntern);
    if (!existent) {
      noi.push(nou);
      continue;
    }

    const schimbari = campuriSchimbate(existent, nou, true);
    const reapare = !existent.activ && nou.activ;
    if (reapare) reaparute.push({ produsId: existent.id, codIntern: existent.codIntern, denumire: nou.denumire });
    else if (existent.activ !== nou.activ) schimbari.push({ camp: "activ", inainte: laText(existent.activ), dupa: laText(nou.activ) });

    if (schimbari.length > 0) modificate.push({ produsId: existent.id, codIntern: existent.codIntern, denumire: existent.denumire, campuri: schimbari });

    if (existent.pretActiv === null) preturiNoi += 1;
    else if (Math.abs(existent.pretActiv - nou.pret) > 0.00001) {
      const diferenta = Math.round((nou.pret - existent.pretActiv) * 10000) / 10000;
      preturiModificate.push({
        produsId: existent.id,
        codIntern: existent.codIntern,
        denumire: nou.denumire,
        vechi: existent.pretActiv,
        nou: nou.pret,
        diferenta,
        procent: existent.pretActiv === 0 ? 0 : Math.round((diferenta / existent.pretActiv) * 10000) / 100,
      });
    }

    if (schimbari.length === 0 && !reapare && existent.pretActiv !== null && Math.abs(existent.pretActiv - nou.pret) <= 0.00001) neschimbate += 1;
  }

  const disparute = existente
    .filter((p) => p.activ && !vazute.has(p.codIntern))
    .map((p) => ({ produsId: p.id, codIntern: p.codIntern, codFurnizor: p.codFurnizor, denumire: p.denumire, categorie: p.categorieOfertaDenumire, um: p.um }));

  // redenumiri: dispărut + nou pe aceeași cheie (cod furnizor + rubrică + UM), 1-la-1;
  // ce rămâne n-la-n se arată ca dispărut + nou
  const redenumiri: Diferente["produse"]["redenumiri"] = [];
  const noiRamase: ProdusImport[] = [];
  const disparuteRamase: typeof disparute = [];
  const grupeazaNoi = new Map<string, ProdusImport[]>();
  for (const n of noi) {
    if (!n.codFurnizor) {
      noiRamase.push(n);
      continue;
    }
    const k = cheieRedenumire(n.codFurnizor, n.categorieOferta, n.um);
    grupeazaNoi.set(k, [...(grupeazaNoi.get(k) ?? []), n]);
  }
  const grupeazaDisparute = new Map<string, typeof disparute>();
  for (const d of disparute) {
    if (!d.codFurnizor) {
      disparuteRamase.push(d);
      continue;
    }
    const k = cheieRedenumire(d.codFurnizor, d.categorie, d.um);
    grupeazaDisparute.set(k, [...(grupeazaDisparute.get(k) ?? []), d]);
  }
  for (const [k, listaNoi] of grupeazaNoi) {
    const listaDisp = grupeazaDisparute.get(k) ?? [];
    if (listaNoi.length === 1 && listaDisp.length === 1) {
      const nou = listaNoi[0];
      const d = listaDisp[0];
      const existent = dupaCod.get(d.codIntern)!;
      const campuri = campuriSchimbate(existent, nou, true).filter((c) => c.camp !== "denumire");
      redenumiri.push({
        produsId: d.produsId,
        codFurnizor: d.codFurnizor,
        codInternVechi: d.codIntern,
        codInternNou: nou.codIntern,
        denumireVeche: d.denumire,
        denumireNoua: nou.denumire,
        campuri,
      });
      if (existent.pretActiv !== null && Math.abs(existent.pretActiv - nou.pret) > 0.00001) {
        const diferenta = Math.round((nou.pret - existent.pretActiv) * 10000) / 10000;
        preturiModificate.push({
          produsId: d.produsId,
          codIntern: nou.codIntern,
          denumire: nou.denumire,
          vechi: existent.pretActiv,
          nou: nou.pret,
          diferenta,
          procent: existent.pretActiv === 0 ? 0 : Math.round((diferenta / existent.pretActiv) * 10000) / 100,
        });
      }
      grupeazaDisparute.delete(k);
    } else {
      noiRamase.push(...listaNoi);
    }
  }
  for (const lista of grupeazaDisparute.values()) disparuteRamase.push(...lista);

  const grupuriExistente = new Set(existente.map((p) => p.grupDenumire));
  const familiiExistente = new Set(existente.filter((p) => p.familieDenumire).map((p) => `${p.grupDenumire}|${p.familieDenumire}`));
  const grupuriNoi = [...new Set(importate.map((p) => p.grup).filter((g) => !grupuriExistente.has(g)))];
  const familiiNoi = [...new Set(importate.filter((p) => p.familie).map((p) => `${p.grup}|${p.familie}`))]
    .filter((k) => !familiiExistente.has(k))
    .map((k) => {
      const [grup, familie] = k.split("|");
      return { grup, familie };
    });

  return {
    produse: {
      noi: noiRamase.map((n) => ({ codIntern: n.codIntern, codFurnizor: n.codFurnizor, denumire: n.denumire, categorieOferta: n.categorieOferta, um: n.um, pret: n.pret, fisier: n.fisier })),
      modificate,
      preturiModificate,
      preturiNoi,
      disparute: disparuteRamase.map(({ produsId, codIntern, codFurnizor, denumire }) => ({ produsId, codIntern, codFurnizor, denumire })),
      redenumiri,
      reaparute,
      neschimbate,
    },
    grupuriNoi,
    familiiNoi,
  };
}

export type RandReferintaExistent = { id: string; cheie: string; activ: boolean; valori: Record<string, unknown> };

export function calculeazaDiferenteReferinta(existente: RandReferintaExistent[], importate: RandReferintaImport[]) {
  const dupaCheie = new Map(existente.map((r) => [r.cheie, r]));
  const vazute = new Set<string>();
  const aparute: { cheie: string; valori: Record<string, string | number | null> }[] = [];
  const modificate: { id: string; cheie: string; campuri: SchimbareCamp[] }[] = [];
  const reaparute: { id: string; cheie: string }[] = [];
  let neschimbate = 0;

  for (const nou of importate) {
    if (vazute.has(nou.cheie)) continue;
    vazute.add(nou.cheie);
    const existent = dupaCheie.get(nou.cheie);
    if (!existent) {
      aparute.push({ cheie: nou.cheie, valori: nou.valori });
      continue;
    }
    const campuri: SchimbareCamp[] = [];
    for (const [camp, v] of Object.entries(nou.valori)) {
      const inainte = laText(existent.valori[camp]);
      const dupa = laText(v);
      if (inainte !== dupa) campuri.push({ camp, inainte, dupa });
    }
    if (!existent.activ) reaparute.push({ id: existent.id, cheie: nou.cheie });
    if (campuri.length > 0) modificate.push({ id: existent.id, cheie: nou.cheie, campuri });
    if (campuri.length === 0 && existent.activ) neschimbate += 1;
  }

  const disparute = existente.filter((r) => r.activ && !vazute.has(r.cheie)).map((r) => ({ id: r.id, cheie: r.cheie }));
  return { aparute, disparute, modificate, reaparute, neschimbate };
}

export const CHEIE_REFERINTA: Record<TipReferinta, (v: Record<string, unknown>) => string> = {
  "variante-profil": (v) => `${v.model}|${v.variantaProfil}`,
  "culori-finisaj-grosime": (v) => `${v.finisaj}|${v.grosime}|${v.culoare}`,
  "garantii-finisaj-grosime": (v) => `${v.finisaj}|${v.grosime ?? ""}`,
  "liste-implicite-oferta": (v) => `${v.rubrica}|${v.categorieInvelitoare}|${v.produs}`,
  "trepte-desfasurata": (v) => `${v.treapta}`,
};
