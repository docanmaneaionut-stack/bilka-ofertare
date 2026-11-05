import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

// S20: corectie de date cu jurnal pentru comenzile din oferta create inainte de S19 / S20:
// contul alocat si clientul din oferta lor (S19), comisionul montatorului / recomandarii
// copiat din oferta si avansul de la "Avans luat" ca incasare propusa (S20). Idempotent:
// un camp deja completat nu se mai atinge; o comanda cu incasari nu mai primeste avansul.
// Nimic sters, nicio suma schimbata pe oferta (inghetata).

export interface RezultatCorectieComenzi {
  verificate: number;
  contAlocat: number;
  client: number;
  comision: number;
  avansPropus: number;
  aplicat: boolean;
}

export async function corecteazaComenzile(params: { utilizator: { id: string | null; nume: string }; aplica: boolean }): Promise<RezultatCorectieComenzi> {
  const comenzi = await prisma.comanda.findMany({
    where: { tip: "DIN_OFERTA", ofertaId: { not: null } },
    include: { oferta: { select: { utilizatorId: true, clientId: true, comisionRecomandareLei: true, comisionAchitat: true } }, incasari: { select: { id: true } } },
  });
  const r: RezultatCorectieComenzi = { verificate: comenzi.length, contAlocat: 0, client: 0, comision: 0, avansPropus: 0, aplicat: params.aplica };
  const jurnal = (entitateId: string, camp: string, inainte: string | null, dupa: string | null) => ({
    utilizatorId: params.utilizator.id,
    numeUtilizatorLaMoment: params.utilizator.nume,
    entitate: "Comanda",
    entitateId,
    actiune: "corectie_date_comenzi",
    camp,
    valoareInainte: inainte,
    valoareDupa: dupa,
  });
  for (const c of comenzi) {
    const o = c.oferta!;
    const date: Prisma.ComandaUpdateInput = {};
    const intrari: ReturnType<typeof jurnal>[] = [];
    if (!c.contAlocatId) {
      date.contAlocat = { connect: { id: o.utilizatorId } };
      intrari.push(jurnal(c.id, "contAlocatId", null, o.utilizatorId));
      r.contAlocat++;
    }
    if (!c.clientId) {
      date.client = { connect: { id: o.clientId } };
      intrari.push(jurnal(c.id, "clientId", null, o.clientId));
      r.client++;
    }
    if (c.comisionLei === null && o.comisionRecomandareLei !== null) {
      date.comisionLei = o.comisionRecomandareLei;
      date.comisionAchitat = o.comisionAchitat;
      intrari.push(jurnal(c.id, "comisionLei", null, o.comisionRecomandareLei.toFixed(2)));
      r.comision++;
    }
    const avans = c.avansLei.gt(0) && c.incasari.length === 0;
    if (avans) {
      intrari.push(jurnal(c.id, "incasare", null, `avans propus ${c.avansLei.toFixed(2)} lei`));
      r.avansPropus++;
    }
    if (!params.aplica || intrari.length === 0) continue;
    await prisma.$transaction(async (tx) => {
      if (Object.keys(date).length > 0) await tx.comanda.update({ where: { id: c.id }, data: date });
      if (avans) {
        await tx.comandaIncasare.create({
          data: { comandaId: c.id, sumaLei: c.avansLei, data: c.data, ceReprezinta: "avans luat de agent (la „Avans luat”) — preluat la corecția de date S20", stare: "PROPUSA", notatDeId: params.utilizator.id, numeNotatLaMoment: params.utilizator.nume },
        });
      }
      await tx.jurnalIntrare.createMany({ data: intrari });
    });
  }
  return r;
}
