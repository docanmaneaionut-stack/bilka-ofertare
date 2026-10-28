import type { Prisma, Utilizator } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

// Numerotarea ofertelor (FISA-OFERTARE cap. 1): seria contului, numarul = urmatorul
// pe serie, continuu, fara reluare anuala, dat la prima salvare. Contorul se
// incrementeaza atomic (un singur UPDATE), in aceeasi tranzactie cu inserarea
// ofertei - doua salvari simultane nu pot primi acelasi numar; cheia unica
// (serie, numar, versiune) e plasa de siguranta.

export async function urmatorulNumar(tx: Prisma.TransactionClient, serie: string): Promise<number> {
  const randuri = await tx.$queryRaw<{ ultimulNumar: number }[]>`
    INSERT INTO "contor_serie" ("serie", "ultimulNumar", "updatedAt")
    VALUES (${serie}, 1, now())
    ON CONFLICT ("serie") DO UPDATE
      SET "ultimulNumar" = "contor_serie"."ultimulNumar" + 1, "updatedAt" = now()
    RETURNING "ultimulNumar"`;
  return randuri[0].ultimulNumar;
}

// contorul poate porni de la un numar dat (Admin general, dupa prototip), cu
// jurnal; nu poate cobori sub ultimul numar folosit deja
export async function seteazaContor(serie: string, ultimulNumar: number, utilizator: Utilizator): Promise<void> {
  const folosit = await prisma.oferta.aggregate({ where: { serie }, _max: { numar: true } });
  const maxim = folosit._max.numar ?? 0;
  if (ultimulNumar < maxim) throw new Error(`Seria ${serie} are deja oferte până la numărul ${maxim}; contorul nu poate coborî sub el`);
  const inainte = await prisma.contorSerie.findUnique({ where: { serie } });
  await prisma.contorSerie.upsert({ where: { serie }, create: { serie, ultimulNumar }, update: { ultimulNumar } });
  await prisma.jurnalIntrare.create({
    data: {
      utilizatorId: utilizator.id,
      numeUtilizatorLaMoment: utilizator.nume,
      entitate: "ContorSerie",
      entitateId: serie,
      actiune: "modificare",
      camp: "ultimulNumar",
      valoareInainte: inainte ? String(inainte.ultimulNumar) : null,
      valoareDupa: String(ultimulNumar),
    },
  });
}
