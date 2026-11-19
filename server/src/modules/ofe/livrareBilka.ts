import type { LivrareBilka } from "@prisma/client";
import { z } from "zod";
import { normalizeazaTelefon } from "./clienti.js";

// Livrarea de la Bilka (S26a, MODIFICAREA M7; FISA-OFERTARE cap. 16, docs/MODIFICARI-S26.md):
// la "De comandat" se alege unde livreaza Bilka marfa - la depozitul nostru (in formular celulele
// de localitate si telefon raman goale, cum se completau de mana) sau direct in santier
// (localitatea si telefonul de contact, obligatorii, intra in formular). Alegerea sta pe oferta
// pana la "Comandat", apoi pe comanda, unde apare ca text si se poate schimba cu istoric.
// Aici: schema cererii si textele - aceleasi pentru oferta si pentru comanda.

const campuri = {
  tip: z.enum(["DEPOZIT", "SANTIER"]),
  localitate: z.string().trim().max(200).nullish(),
  telefon: z.string().trim().max(50).nullish(),
};

function verifica(v: { tip: LivrareBilka; localitate?: string | null; telefon?: string | null }, ctx: z.RefinementCtx) {
  if (v.tip !== "SANTIER") return;
  if (!v.localitate) ctx.addIssue({ code: "custom", path: ["localitate"], message: "lipsește — la livrarea în șantier se scrie localitatea" });
  if (!v.telefon) ctx.addIssue({ code: "custom", path: ["telefon"], message: "lipsește — la livrarea în șantier se scrie telefonul de contact" });
  else if (/[a-zA-Z]/.test(v.telefon)) ctx.addIssue({ code: "custom", path: ["telefon"], message: "conține litere" });
  else if (normalizeazaTelefon(v.telefon).length < 6) ctx.addIssue({ code: "custom", path: ["telefon"], message: "trebuie să aibă cel puțin 6 cifre" });
}

// alegerea trimisa odata cu statusul ("De comandat" / "Comandat")
export const schemaLivrareBilka = z.object(campuri).superRefine(verifica);
// alegerea schimbata separat (pe oferta cat nu e "Comandat"; pe comanda dupa), cu mentiuni pentru istoric
export const schemaSchimbareLivrareBilka = z.object({ ...campuri, mentiuni: z.string().trim().max(2000).nullish() }).superRefine(verifica);

export type AlegereLivrareBilka = z.infer<typeof schemaLivrareBilka>;

export interface LivrareBilkaSalvata {
  livrareBilka: LivrareBilka | null;
  livrareBilkaLocalitate: string | null;
  livrareBilkaTelefon: string | null;
}

// campurile de salvat: la depozit localitatea si telefonul nu se pastreaza
export function valoriLivrareBilka(a: AlegereLivrareBilka): { livrareBilka: LivrareBilka; livrareBilkaLocalitate: string | null; livrareBilkaTelefon: string | null } {
  const santier = a.tip === "SANTIER";
  return { livrareBilka: a.tip, livrareBilkaLocalitate: santier ? a.localitate?.trim() || null : null, livrareBilkaTelefon: santier ? a.telefon?.trim() || null : null };
}

export function aceeasiLivrareBilka(a: LivrareBilkaSalvata, b: LivrareBilkaSalvata): boolean {
  return a.livrareBilka === b.livrareBilka && a.livrareBilkaLocalitate === b.livrareBilkaLocalitate && a.livrareBilkaTelefon === b.livrareBilkaTelefon;
}

// pentru istoric: "la depozit" / "șantier: Cotești · 0787 877 989"; fara alegere = null
export function descriereLivrareBilka(x: LivrareBilkaSalvata): string | null {
  if (!x.livrareBilka) return null;
  return x.livrareBilka === "DEPOZIT" ? "la depozit" : `șantier: ${[x.livrareBilkaLocalitate, x.livrareBilkaTelefon].filter(Boolean).join(" · ")}`;
}

// textul vizibil pe comanda si pe fisa soferului; la depozit nu apare nimic in plus
export function textLivrareBilka(x: LivrareBilkaSalvata): string | null {
  return x.livrareBilka === "SANTIER" ? `Livrare Bilka — ${descriereLivrareBilka(x)}` : null;
}

// forma din raspunsuri (oferta si comanda); fara alegere = null (ofertele / comenzile dinainte de S26a)
export function livrareBilkaPublic(x: LivrareBilkaSalvata & { livrareBilkaLa: Date | null }) {
  if (!x.livrareBilka) return null;
  return { tip: x.livrareBilka, localitate: x.livrareBilkaLocalitate, telefon: x.livrareBilkaTelefon, text: textLivrareBilka(x), la: x.livrareBilkaLa };
}

export const ETICHETA_LIVRARE_BILKA = "Livrarea de la Bilka";
export const MESAJ_FARA_LIVRARE_BILKA = "Alege livrarea de la Bilka: la depozitul nostru sau direct în șantier.";
