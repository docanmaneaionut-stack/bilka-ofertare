import type { Prisma, RolUtilizator, Utilizator } from "@prisma/client";

// Cine vede ce (FISA-CONTURI §2): Agentul si Colaboratorul doar ofertele lor;
// Administratorul toate ofertele firmei lui; Admin general toate; Contabilitate
// si Gestiune le vad prin comenzi (Etapa 5) - pana atunci nimic.

export const ROLURI_CU_OFERTE: RolUtilizator[] = ["ADMINISTRATOR", "AGENT", "COLABORATOR"];

export function filtruVizibilitateOferte(u: Utilizator): Prisma.OfertaWhereInput | null {
  switch (u.rol) {
    case "ADMIN_GENERAL":
      return {};
    case "ADMINISTRATOR":
      return { firmaId: u.firmaId ?? "" };
    case "AGENT":
    case "COLABORATOR":
      return { utilizatorId: u.id };
    default:
      return null;
  }
}

export function poateVedeaOferta(u: Utilizator, oferta: { utilizatorId: string; firmaId: string }): boolean {
  switch (u.rol) {
    case "ADMIN_GENERAL":
      return true;
    case "ADMINISTRATOR":
      return oferta.firmaId === u.firmaId;
    case "AGENT":
    case "COLABORATOR":
      return oferta.utilizatorId === u.id;
    default:
      return false;
  }
}

// cine poate modifica (FISA-CONTURI §3): cine a facut oferta si Administratorul
// firmei; Admin general vede tot, dar nu face oferte
export function poateModificaOferta(u: Utilizator, oferta: { utilizatorId: string; firmaId: string }): boolean {
  if (u.rol === "ADMINISTRATOR") return oferta.firmaId === u.firmaId;
  if (u.rol === "AGENT" || u.rol === "COLABORATOR") return oferta.utilizatorId === u.id;
  return false;
}

// adaosul % al contului si pretul de baza nu pleaca niciodata spre Agent / Colaborator
export function vedePreturiDeBaza(u: Utilizator): boolean {
  return u.rol === "ADMIN_GENERAL" || u.rol === "ADMINISTRATOR";
}
