import { Prisma, type StatusOferta, type Utilizator } from "@prisma/client";
import { z } from "zod";
import { ZodError } from "zod";
import { prisma } from "../../db/prisma.js";
import { calculeazaOferta } from "../mot/calcul.js";
import { finisajScurt, numarRal, numeModel } from "../mot/pachete.js";
import type { RezultatOferta } from "../mot/tipuri.js";
import { includeProduse, spreIntrareMot, type OfertaCuProduse } from "./intrareMot.js";
import { scrieIstoric } from "./istoric.js";

// Statusurile ofertei (FISA-OFERTARE cap. 14; FISA-CONTURI §3-4): cele 8, in orice
// ordine, cu revenire, totul cu istoric; doar "Comandat" e ireversibil. "Avans
// luat" cere suma (poate fi 0); "Acceptata" face varianta curenta; "Comandat"
// (cap. 16, 3.2) e blocat cat o invelitoare e in mp direct, ingheata produsele,
// cantitatile si preturile, salveaza rezultatul complet al motorului si creeaza
// randul de comanda minim. Le schimba cine a facut oferta si Administratorul
// firmei (verificat de ruta).

export const STATUSURI: StatusOferta[] = ["IN_LUCRU", "TRANSMISA", "DE_REVIZIONAT", "ACCEPTATA", "NEACCEPTATA", "AVANS_LUAT", "DE_COMANDAT", "COMANDAT"];
export const ETICHETA_STATUS: Record<StatusOferta, string> = {
  IN_LUCRU: "În lucru",
  TRANSMISA: "Transmisă",
  DE_REVIZIONAT: "De revizionat",
  ACCEPTATA: "Acceptată",
  NEACCEPTATA: "Neacceptată",
  AVANS_LUAT: "Avans luat",
  DE_COMANDAT: "De comandat",
  COMANDAT: "Comandat",
};

const suma = z.string().trim().regex(/^-?\d+([.,]\d+)?$/, "număr");
export const schemaStatus = z.object({
  status: z.enum(STATUSURI as [StatusOferta, ...StatusOferta[]]),
  avansLei: suma.nullish(),
  mentiuni: z.string().trim().max(2000).nullish(),
});

export class EroareStatus extends Error {
  constructor(
    message: string,
    public status = 409,
    public motive: string[] = [],
  ) {
    super(message);
  }
}

const nr = (s: string) => new Prisma.Decimal(s.replace(",", "."));

// rezumatul comenzii (cap. 16): invelitoarea principala + secundara (model,
// culoare, finisaj, grosime, mp), apoi celelalte categorii cu cheia lor de culoare
export function rezumatComenzii(o: OfertaCuProduse, r: RezultatOferta): string {
  const grosime = (g: string | null | undefined) => (g ?? "").replace(/\s*mm$/i, "").replace(/^0,/, "0,");
  const invelitori = o.invelitori.map((i) => {
    const mp = r.cantitati.invelitori.find((c) => c.id === i.id)?.mp ?? "";
    const p = { cod: i.cod, denumire: i.denumire, um: i.um, pretBazaEur: "0", grup: i.grup ?? undefined, familie: i.familie ?? undefined };
    return `${numeModel(p)}${i.variantaProfil ? ` ${i.variantaProfil}` : ""} ${numarRal(i.culoare ?? undefined)} ${finisajScurt(i.finisaj ?? undefined)} ${grosime(i.grosime)} — ${mp} mp`.replace(/\s+/g, " ").trim();
  });
  // restul: pe cheie de culoare (RAL + finisaj), rubricile care o au
  const cheiInv = new Map(o.invelitori.map((i) => [i.id, { ral: i.culoare ?? "", finisaj: i.finisaj ?? "" }]));
  const peCheie = new Map<string, { ral: string; finisaj: string; rubrici: string[] }>();
  for (const l of o.linii) {
    if (/^învelitori/i.test(l.rubrica)) continue;
    const cheie = l.invelitoareId ? cheiInv.get(l.invelitoareId) : l.culoareRal ? { ral: l.culoareRal, finisaj: l.culoareFinisaj ?? l.finisaj ?? "" } : null;
    const k = cheie ? `${numarRal(cheie.ral)}|${finisajScurt(cheie.finisaj)}` : "|";
    const g = peCheie.get(k) ?? { ral: cheie ? numarRal(cheie.ral) : "", finisaj: cheie ? finisajScurt(cheie.finisaj) : "", rubrici: [] };
    const rubrica = l.rubrica.replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    if (!g.rubrici.includes(rubrica)) g.rubrici.push(rubrica);
    peCheie.set(k, g);
  }
  const restul = [...peCheie.values()].map((g) => `${g.rubrici.join(" + ")}${g.ral || g.finisaj ? ` ${[g.ral, g.finisaj].filter(Boolean).join(" ")}` : ""}`);
  return [invelitori.join(" + "), ...restul].filter(Boolean).join("; ");
}

export async function schimbaStatus(ofertaId: string, date: z.infer<typeof schemaStatus>, u: Utilizator): Promise<void> {
  const o = await prisma.oferta.findUniqueOrThrow({ where: { id: ofertaId }, include: { ...includeProduse, client: true, montator: true } });
  if (o.status === "COMANDAT") throw new EroareStatus("Oferta e comandată: statusul nu se mai schimbă (doar „Comandat” e ireversibil)");
  if (date.status === "AVANS_LUAT" && date.avansLei === undefined) throw new EroareStatus("La „Avans luat” se completează suma avansului (poate fi 0)", 400);
  if (date.avansLei !== undefined && date.avansLei !== null && Number(date.avansLei.replace(",", ".")) < 0) throw new EroareStatus("Avansul nu poate fi negativ", 400);

  let rezultat: RezultatOferta | null = null;
  if (date.status === "COMANDAT") {
    if (o.invelitori.length === 0 && o.linii.length === 0) throw new EroareStatus("Oferta nu are produse; nu se poate comanda");
    try {
      rezultat = calculeazaOferta(spreIntrareMot(o));
    } catch (e) {
      const mesaj = e instanceof ZodError ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") : e instanceof Error ? e.message : String(e);
      throw new EroareStatus(`Oferta nu se poate calcula: ${mesaj}`);
    }
    // 3.2: fiecare invelitoare integral in lungimi x bucati - formularul Bilka nu primeste mp
    if (!rezultat.comandabil.da) throw new EroareStatus("Nu se poate comanda: o învelitoare nu e integral în lungimi × bucăți", 409, rezultat.comandabil.motive);
  }

  const avansNou = date.avansLei === undefined ? o.avansLei : date.avansLei === null ? null : nr(date.avansLei);
  const acum = new Date();
  await prisma.$transaction(async (tx) => {
    const data: Prisma.OfertaUpdateInput = { status: date.status, statusLa: acum, modificatDe: { connect: { id: u.id } } };
    if (date.avansLei !== undefined) data.avansLei = avansNou;
    if (date.status === "COMANDAT") {
      data.comandatLa = acum;
      data.rezultatMotor = rezultat as unknown as Prisma.InputJsonValue;
      data.rezultatSalvatLa = acum;
    }
    if (date.status === "ACCEPTATA" && !o.curenta) {
      await tx.oferta.updateMany({ where: { serie: o.serie, numar: o.numar }, data: { curenta: false } });
      data.curenta = true;
    }
    await tx.oferta.update({ where: { id: ofertaId }, data });

    // istoricul porneste la "Transmisa": schimbarea de status se scrie daca
    // oferta era deja in istoric SAU tocmai intra (statusul nou nu e "In lucru")
    const inIstoric = o.status !== "IN_LUCRU" || date.status !== "IN_LUCRU";
    if (inIstoric) {
      const intrari: { tip: string; camp: string; inainte: string | null; dupa: string | null }[] = [{ tip: "status", camp: "status", inainte: ETICHETA_STATUS[o.status], dupa: ETICHETA_STATUS[date.status] }];
      if (date.avansLei !== undefined && (o.avansLei?.toString() ?? null) !== (avansNou?.toString() ?? null)) {
        intrari.push({ tip: "suma", camp: "avansLei", inainte: o.avansLei?.toString() ?? null, dupa: avansNou?.toString() ?? null });
      }
      await scrieIstoric(tx, { id: ofertaId, status: date.status === "IN_LUCRU" ? o.status : date.status }, u, intrari, date.mentiuni);
    }

    if (date.status === "COMANDAT" && rezultat) {
      const total = rezultat.totaluri.documentTotalLei;
      const avans = avansNou ?? new Prisma.Decimal(0);
      await tx.comanda.create({
        data: {
          ofertaId,
          firmaId: o.firmaId,
          responsabilId: u.id,
          serie: o.serie,
          numar: o.numar,
          data: new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(acum)}T00:00:00Z`),
          clientNume: o.client.nume,
          clientTelefon: o.client.telefon,
          clientLocalitate: o.localitate ?? o.client.localitate,
          montatorNume: o.montator?.nume ?? null,
          montatorTelefon: o.montator?.telefon ?? null,
          rezumat: rezumatComenzii(o, rezultat),
          totalCuTvaEur: rezultat.totaluri.documentCuTvaEur,
          totalLei: total,
          avansLei: avans,
          restLei: new Prisma.Decimal(total).minus(avans),
        },
      });
    }
  });
}
