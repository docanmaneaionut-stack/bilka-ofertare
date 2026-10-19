import type { Utilizator } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

function laText(valoare: unknown): string | null {
  if (valoare === null || valoare === undefined) return null;
  if (valoare instanceof Date) return valoare.toISOString();
  return String(valoare);
}

export async function scrieCreare(utilizator: Utilizator, entitate: string, entitateId: string) {
  await prisma.jurnalIntrare.create({
    data: {
      utilizatorId: utilizator.id,
      numeUtilizatorLaMoment: utilizator.nume,
      entitate,
      entitateId,
      actiune: "creare",
    },
  });
}

/**
 * Compara doar campurile din `campuri` intre `inainte` si `dupa` si scrie
 * cate o intrare de jurnal pentru fiecare camp schimbat (fisa CONTURI §5:
 * orice suma/valoare modificata are istoric cu valoarea dinainte/dupa).
 */
export async function scrieModificari(
  utilizator: Utilizator,
  entitate: string,
  entitateId: string,
  campuri: string[],
  inainte: Record<string, unknown>,
  dupa: Record<string, unknown>,
) {
  const randuri = campuri
    .filter((camp) => laText(inainte[camp]) !== laText(dupa[camp]))
    .map((camp) => ({
      utilizatorId: utilizator.id,
      numeUtilizatorLaMoment: utilizator.nume,
      entitate,
      entitateId,
      actiune: "modificare",
      camp,
      valoareInainte: laText(inainte[camp]),
      valoareDupa: laText(dupa[camp]),
    }));

  if (randuri.length > 0) {
    await prisma.jurnalIntrare.createMany({ data: randuri });
  }
}
