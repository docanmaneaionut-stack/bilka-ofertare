import path from "node:path";
import type { Utilizator } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { env } from "../../env.js";
import type { RezultatOferta } from "../mot/tipuri.js";
import { numarComplet } from "../ofe/clienti.js";
import { benzi } from "../ofe/documente/continut.js";
import { randeazaPdf } from "../ofe/documente/pdf.js";
import { esc, imagineDataUri, pagina, ro } from "../ofe/documente/sablon.js";
import { includeProduse } from "../ofe/intrareMot.js";
import { includeAviz, spreAviz } from "./avize.js";
import { EroareComanda, includeRand, rezumatIncasari } from "./comenzi.js";
import { CSS_COMENZI, dataDoar, dataLocala, dataRoDinIso, telefonApelabil } from "./sablonComenzi.js";
import { poateFaceFisaSoferului, poateVedeaComanda } from "./vizibilitate.js";

// Fisa soferului (S23; FISA-COMENZI cap. 4c, macheta docs/design/macheta-fisa-soferului.html):
// pentru Gestiune (soferii au cont de Gestiune), Administratori si Admin general. Din tabelul de
// comenzi se bifeaza comenzile -> ecranul fisei: ordinea blocurilor = ordinea traseului (cea in
// care vin id-urile), sus data, numarul de livrari, masina (text scris pe loc) si telefonul
// Gestiunii (telefonul contului care genereaza fisa); pe fiecare comanda numarul, clientul cu
// telefonul apelabil (tel: in PDF + text), adresa lucrarii cu linkul la locatie cand exista,
// marfa (rezumatul, colile cu lungimi x bucati, piesele pe categorii), indicatiile de livrare,
// montatorul cu telefonul apelabil, "de incasat" (restul din S20, mare), casutele "predat".
// Softul nu retine fisa (document de moment): nimic in baza, nimic in istoric. Trimiterea pe
// WhatsApp ramane manuala - "Descarca pentru WhatsApp" = acelasi PDF, ca fisier de descarcat.

export const fisaRouter = Router();

const schemaFisa = z.object({
  comenzi: z.array(z.string().min(1)).min(1, "alege cel puțin o comandă").max(40),
  masina: z.string().trim().max(120).nullish(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dată în forma AAAA-LL-ZZ").optional(),
});

const ZILE = ["duminică", "luni", "marți", "miercuri", "joi", "vineri", "sâmbătă"];
const ziua = (iso: string) => ZILE[new Date(`${iso}T12:00:00Z`).getUTCDay()];
const rubricaScurta = (r: string) => r.replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

export interface BlocFisa {
  comandaId: string;
  numarComplet: string;
  completareLa: string | null;
  manuala: boolean;
  client: { nume: string; telefon: string };
  adresa: string | null;
  locatieUrl: string | null;
  rezumat: string;
  // "35 coli (6,20 × 10 · 5,40 × 8 · …)" per invelitoare; null la comenzile manuale / fara invelitoare
  coli: string | null;
  // "accesorii standard 92 buc", "fixare și etanșare 16 art.", "sistem pluvial 107 buc"
  categorii: string[];
  livrare: { indicatii: string | null; data: string | null };
  montator: { nume: string; telefon: string | null } | null;
  restLei: string;
  statusLogistic: string;
  avize: { id: string; numar: number; dataLivrarii: string; partial: boolean; documentId: string | null }[];
}

export interface DateFisa {
  data: string;
  dataText: string;
  masina: string | null;
  gestiune: { nume: string; telefon: string | null };
  firma: { denumire: string; adresa: string; logo: string | null };
  livrari: number;
  blocuri: BlocFisa[];
  avertizari: string[];
}

// datele fisei pentru comenzile cerute, in ordinea ceruta; toate trebuie sa fie vizibile contului
export async function dateFisa(u: Utilizator, cerere: z.infer<typeof schemaFisa>): Promise<DateFisa> {
  if (!poateFaceFisaSoferului(u)) throw new EroareComanda("Fișa șoferului o fac Gestiunea, Administratorii și Admin general (FISA-COMENZI cap. 4c)", 403);
  const ids = [...new Set(cerere.comenzi)];
  const comenzi = await prisma.comanda.findMany({ where: { id: { in: ids } }, include: { ...includeRand, avize: { include: includeAviz, orderBy: { numar: "asc" } } } });
  const blocuri: BlocFisa[] = [];
  for (const id of ids) {
    const c = comenzi.find((x) => x.id === id);
    if (!c || !(await poateVedeaComanda(u, c))) throw new EroareComanda("O comandă din listă nu există sau nu e vizibilă", 404);
    // adresa: a lucrarii (de pe oferta) + localitatea; la manuale adresa clientului din baza comuna
    const client = c.clientId ? await prisma.client.findUnique({ where: { id: c.clientId }, select: { adresa: true } }) : null;
    let adresa: string | null = [client?.adresa, c.clientLocalitate].filter(Boolean).join(", ") || null;
    let coli: string | null = null;
    const categorii: string[] = [];
    if (c.ofertaId) {
      const o = await prisma.oferta.findUniqueOrThrow({ where: { id: c.ofertaId }, include: includeProduse });
      adresa = [o.adresaLucrarii, o.localitate ?? c.clientLocalitate].filter(Boolean).join(", ") || null;
      const r = o.rezultatMotor as unknown as RezultatOferta | null;
      if (r) {
        const bucati = o.invelitori.filter((i) => i.panotaj.length > 0).map((i) => `${i.panotaj.reduce((s, p) => s + p.bucati, 0)} coli (${i.panotaj.map((p) => `${ro(p.lungimeM.toString(), 2)} × ${p.bucati}`).join(" · ")})`);
        coli = bucati.length ? bucati.join("; ") : null;
        for (const b of benzi(o, r).filter((x) => x.eticheta !== "Învelitori")) {
          const ume = new Set(b.linii.map((x) => x.c.um.toLowerCase()));
          const total = b.linii.reduce((s, x) => s + Number(x.c.cantitate), 0);
          const nr = Number.isInteger(total) ? String(total) : ro(total, 3);
          categorii.push(`${rubricaScurta(b.rubrica)} ${nr} ${ume.size === 1 && ume.has("buc") ? "buc" : ume.size === 1 ? [...ume][0] : "art."}`);
        }
      }
    }
    blocuri.push({
      comandaId: c.id,
      numarComplet: numarComplet(c.serie, c.numar),
      completareLa: c.oferta?.completareLa ? numarComplet(c.oferta.completareLa.serie, c.oferta.completareLa.numar) : null,
      manuala: c.tip === "MANUALA",
      client: { nume: c.clientNume, telefon: c.clientTelefon },
      adresa,
      locatieUrl: c.locatieUrl,
      rezumat: c.rezumat,
      coli,
      categorii,
      livrare: { indicatii: c.indicatiiLivrare, data: c.dataLivrarii ? dataDoar(c.dataLivrarii) : null },
      montator: c.montatorNume ? { nume: c.montatorNume, telefon: c.montatorTelefon } : null,
      restLei: rezumatIncasari(c).restLei,
      statusLogistic: c.statusLogistic,
      avize: c.avize.map((a) => ({ id: a.id, numar: a.numar, dataLivrarii: dataDoar(a.dataLivrarii), partial: a.partial, documentId: spreAviz(a).documentId })),
    });
  }
  const firma = await prisma.firma.findUniqueOrThrow({ where: { id: u.firmaId ?? comenzi.find((c) => c.id === ids[0])!.firmaId }, select: { denumire: true, adresa: true, localitate: true, logo: true } });
  const data = cerere.data ?? dataLocala(new Date());
  const avertizari: string[] = [];
  if (!u.telefon) avertizari.push("Contul tău n-are telefon: pe fișă nu apare telefonul Gestiunii. Completează-l în „Contul meu”.");
  return {
    data,
    dataText: `${ziua(data)}, ${dataRoDinIso(data)}`,
    masina: cerere.masina?.trim() || null,
    gestiune: { nume: u.nume, telefon: u.telefon },
    firma: { denumire: firma.denumire, adresa: [firma.adresa, firma.localitate].filter(Boolean).join(", "), logo: firma.logo },
    livrari: blocuri.length,
    blocuri,
    avertizari,
  };
}

export function htmlFisa(f: DateFisa): { html: string; subsolStanga: string } {
  const sigla = f.firma.logo ? imagineDataUri(path.resolve(env.dateDir, f.firma.logo)) : null;
  const blocuri = f.blocuri
    .map((b, i) => {
      const sub = [b.coli, ...b.categorii].filter(Boolean).join(" · ");
      return `<div class="dl">
  <div class="dlh"><span class="n">${i + 1}</span><b>${esc(b.client.nume)}</b><span class="nr">comanda ${esc(b.numarComplet)}${b.completareLa ? ` (completare la ${esc(b.completareLa)})` : ""}${b.manuala ? " (manuală)" : ""}</span>${telefonApelabil(b.client.telefon)}</div>
  <div class="dlb">
    <span class="k">Adresa</span><span class="v">${esc(b.adresa ?? "—")}${b.locatieUrl ? ` &nbsp;·&nbsp; <a href="${esc(b.locatieUrl)}">locația pe hartă</a>` : ""}</span>
    <span class="k">Marfa</span><span class="v">${esc(b.rezumat)}${sub ? `<br><span class="sub">${esc(sub)}</span>` : ""}</span>
    <span class="k">Livrare</span><span class="v">${esc(b.livrare.indicatii ?? "")}${b.livrare.data ? `${b.livrare.indicatii ? " · " : ""}ziua: ${dataRoDinIso(b.livrare.data)}` : ""}${!b.livrare.indicatii && !b.livrare.data ? "—" : ""}</span>
    <span class="k">Montator</span><span class="v">${b.montator ? `${esc(b.montator.nume)}${b.montator.telefon ? ` &nbsp;·&nbsp; ${telefonApelabil(b.montator.telefon)}` : ""}` : "—"}</span>
    <span class="k">De încasat</span><span class="v big">${ro(b.restLei)} lei</span>
    <span class="k">Predat</span><span class="v"><span class="cb"></span> marfă &nbsp;&nbsp; <span class="cb"></span> bani &nbsp;&nbsp; <span class="cb"></span> aviz semnat</span>
  </div>
</div>`;
    })
    .join("");
  const avize = f.blocuri.flatMap((b) => b.avize.map((a) => `aviz comanda ${b.numarComplet} (livrare din ${dataRoDinIso(a.dataLivrarii)}${a.partial ? ", parțială" : ""})`));
  const corp = `<style>${CSS_COMENZI}</style><div class="sheet fisa">
<div class="head">
  <div class="firm"><b>${esc(f.firma.denumire)}</b><br>Depozit: ${esc(f.firma.adresa)}<br>Gestiune: ${esc(f.gestiune.nume)}${f.gestiune.telefon ? ` · ${telefonApelabil(f.gestiune.telefon)}` : ""}</div>
  <div class="logos">${sigla ? `<img class="logo-img" src="${sigla}" alt="sigla">` : ""}</div>
</div>
<div class="title"><h1>FIȘA ȘOFERULUI</h1><div class="nr">${esc(ziua(f.data))}, <b>${dataRoDinIso(f.data)}</b> · ${f.livrari} ${f.livrari === 1 ? "livrare" : "livrări"}${f.masina ? ` · ${esc(f.masina)}` : ""}</div></div>
<div class="intern">Document intern, pentru încărcare și livrare. Telefoanele se pot apela direct din PDF. Ordinea de mai jos e ordinea propusă a traseului.</div>
${blocuri}
<div class="foot"><p>${avize.length ? `<b>Documente anexate:</b> ${esc(avize.join(" · "))}. &nbsp; ` : ""}<b>La întoarcere:</b> fișa semnată și banii la Gestiune.</p></div>
</div>`;
  return { html: pagina(`Fișa șoferului ${dataRoDinIso(f.data)}`, corp), subsolStanga: `${f.firma.denumire} · Fișa șoferului · ${dataRoDinIso(f.data)} · ${f.livrari} ${f.livrari === 1 ? "livrare" : "livrări"}` };
}

const raspundeFisa = (res: { status: (n: number) => { json: (b: unknown) => void } }, e: unknown) => {
  if (e instanceof EroareComanda) {
    res.status(e.status).json({ eroare: e.message });
    return;
  }
  throw e;
};

// datele fisei pentru ecran
fisaRouter.post("/", async (req, res) => {
  const u = req.utilizator!;
  try {
    res.json({ fisa: await dateFisa(u, schemaFisa.parse(req.body)) });
  } catch (e) {
    raspundeFisa(res, e);
  }
});

// PDF-ul fisei, nereținut; ?descarca=da -> fisier de descarcat ("Descarca pentru WhatsApp")
fisaRouter.post("/pdf", async (req, res) => {
  const u = req.utilizator!;
  try {
    const f = await dateFisa(u, schemaFisa.parse(req.body));
    const { html, subsolStanga } = htmlFisa(f);
    const pdf = await randeazaPdf(html, { subsolStanga });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${req.query.descarca === "da" ? "attachment" : "inline"}; filename="fisa-soferului-${f.data}.pdf"`);
    res.send(pdf);
  } catch (e) {
    raspundeFisa(res, e);
  }
});
