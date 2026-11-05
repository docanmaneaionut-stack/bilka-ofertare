import type { Prisma, Utilizator } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

// Cine vede / cine face pe comenzi (FISA-CONTURI §2-3, FISA-COMENZI cap. 1; S19).
// Lista de comenzi e comuna (depozitul e unul): Admin general si orice Administrator
// vad toate comenzile, ale tuturor firmelor; agentul vede lista completa a firmei lui
// si modifica doar detaliile comenzilor lui (contacte, observatii); colaboratorul
// doar ale lui; Contabilitatea si Gestiunea pe firmele setarii lor de acces
// (Contabilitatea doar vizualizare si documente). Statusul logistic, livrarea si
// nota lipsurilor: orice Administrator, pe toate comenzile, si Gestiunea. Alocarea
// comenzilor manuale: Administratorii si Admin general. Banii (incasari, "achitat")
// raman pe firma - doar Administratorul firmei agentului (S20).

export interface ComandaPentruDrepturi {
  firmaId: string;
  contAlocatId: string | null;
}

// firmele unui cont de Contabilitate / Gestiune: null = acces general (toate)
export async function firmeleContului(u: Utilizator): Promise<string[] | null> {
  if (u.accesGeneralFirme) return null;
  const randuri = await prisma.utilizatorFirma.findMany({ where: { utilizatorId: u.id }, select: { firmaId: true } });
  return randuri.map((r) => r.firmaId);
}

// filtrul listei; null = nu vede comenzi deloc
export async function filtruVizibilitateComenzi(u: Utilizator): Promise<Prisma.ComandaWhereInput | null> {
  switch (u.rol) {
    case "ADMIN_GENERAL":
    case "ADMINISTRATOR":
      return {};
    case "AGENT":
      return u.firmaId ? { firmaId: u.firmaId } : { contAlocatId: u.id };
    case "COLABORATOR":
      return { contAlocatId: u.id };
    case "CONTABILITATE":
    case "GESTIUNE": {
      const firme = await firmeleContului(u);
      return firme === null ? {} : { firmaId: { in: firme } };
    }
    default:
      return null;
  }
}

export async function poateVedeaComanda(u: Utilizator, c: ComandaPentruDrepturi): Promise<boolean> {
  switch (u.rol) {
    case "ADMIN_GENERAL":
    case "ADMINISTRATOR":
      return true;
    case "AGENT":
      return u.firmaId ? c.firmaId === u.firmaId : c.contAlocatId === u.id;
    case "COLABORATOR":
      return c.contAlocatId === u.id;
    case "CONTABILITATE":
    case "GESTIUNE": {
      const firme = await firmeleContului(u);
      return firme === null || firme.includes(c.firmaId);
    }
    default:
      return false;
  }
}

// statusul logistic, livrarea, nota lipsurilor, facturarea: orice Administrator si Gestiunea
export function poateOperaLogistic(u: Utilizator): boolean {
  return u.rol === "ADMIN_GENERAL" || u.rol === "ADMINISTRATOR" || u.rol === "GESTIUNE";
}

// detaliile comenzii (contacte, observatii, atasamente): cine opereaza logistic, plus
// agentul / colaboratorul pe comenzile lui
export function poateModificaDetalii(u: Utilizator, c: ComandaPentruDrepturi): boolean {
  if (poateOperaLogistic(u)) return true;
  if (u.rol === "AGENT" || u.rol === "COLABORATOR") return c.contAlocatId === u.id;
  return false;
}

// comenzile manuale le adauga Administratorii si Gestiunea (cap. 4b); Admin general la fel
export function poateCreaComandaManuala(u: Utilizator): boolean {
  return u.rol === "ADMIN_GENERAL" || u.rol === "ADMINISTRATOR" || u.rol === "GESTIUNE";
}

// alocarea (contul "pentru: ...") o schimba doar Administratorii (si Admin general)
export function poateAloca(u: Utilizator): boolean {
  return u.rol === "ADMIN_GENERAL" || u.rol === "ADMINISTRATOR";
}

// tabelul de facturare si formularul Bilka nu sunt pentru colaborator (CONTURI §2)
export function vedeDocumentulComenzii(u: Utilizator, tip: string): boolean {
  if (u.rol === "COLABORATOR" && (tip === "TABEL_FACTURARE" || tip === "FORMULAR_BILKA")) return false;
  return true;
}
