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

// tabelul de facturare, formularul Bilka si avizul (S23) nu sunt pentru colaborator (CONTURI §2)
export function vedeDocumentulComenzii(u: Utilizator, tip: string): boolean {
  if (u.rol === "COLABORATOR" && (tip === "TABEL_FACTURARE" || tip === "FORMULAR_BILKA" || tip === "AVIZ")) return false;
  // nota de retur (S22) o vede oricine vede comanda, colaboratorul inclus (e documentul lui)
  return true;
}

// S22 - statusul paletului (nerecuperat / recuperat): orice Administrator si Admin general
// (COMENZI cap. 8); nota de palet o scriu cei care opereaza logistic (Gestiunea, Administratorii)
export function poateSchimbaStatusPalet(u: Utilizator): boolean {
  return u.rol === "ADMINISTRATOR" || u.rol === "ADMIN_GENERAL";
}

// S23 - avizul de insotire a marfii (COMENZI cap. 9; CONTURI §2-3): il genereaza si il printeaza orice
// cont care vede comanda, in afara colaboratorului; la fel tabelul de facturare si detaliata din comanda
export function poateGeneraAviz(u: Utilizator): boolean {
  return u.rol !== "COLABORATOR";
}

// S23 - fisa soferului (COMENZI cap. 4c): Gestiunea (soferii au cont de Gestiune), Administratorii, Admin general
export function poateFaceFisaSoferului(u: Utilizator): boolean {
  return u.rol === "GESTIUNE" || u.rol === "ADMINISTRATOR" || u.rol === "ADMIN_GENERAL";
}

// S20 - banii raman pe firma (CONTURI §3): incasarile (notare, confirmare, anulare) si bifa
// "achitat" la comision - doar Administratorul firmei comenzii; Admin general vede, nu scrie
export function poateScrieBani(u: Utilizator, c: ComandaPentruDrepturi): boolean {
  return u.rol === "ADMINISTRATOR" && u.firmaId !== null && u.firmaId === c.firmaId;
}

// comisionul ca suma (OFERTARE cap. 12): contul ofertei (contul alocat) si Administratorul lui
export function poateModificaComision(u: Utilizator, c: ComandaPentruDrepturi): boolean {
  return poateScrieBani(u, c) || ((u.rol === "AGENT" || u.rol === "COLABORATOR") && c.contAlocatId === u.id);
}
