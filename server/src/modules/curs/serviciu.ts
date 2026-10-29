import { prisma } from "../../db/prisma.js";
import { cursAchizitie } from "../mot/zecimal.js";
import { cursPentruMoment, lipsesteCursulZilei, localRomania, parseazaBnrXml, type CursZi } from "./regula.js";

// Preluarea si pastrarea cursului BNR (FISA-OFERTARE 11.8): sursa oficiala
// nbrfxrates.xml, rezerva cursbnr.ro, fisierul anual BNR pentru istoric; tabelul
// curs_valutar tine cate un curs pe zi (data de publicare). Cursul de achizitie
// (BNR x 1,01) vine din motor (mot/zecimal.ts), nu se recalculeaza aici.

export const URL_BNR_ZI = "https://www.bnr.ro/nbrfxrates.xml";
export const urlBnrAn = (an: number) => `https://www.bnr.ro/files/xml/years/nbrfxrates${an}.xml`;
export const URL_CURSBNR = "https://www.cursbnr.ro/";

export type Preluator = (url: string) => Promise<string>;

async function preiaText(url: string): Promise<string> {
  const controler = new AbortController();
  const t = setTimeout(() => controler.abort(), 10_000);
  try {
    const r = await fetch(url, { signal: controler.signal, headers: { "user-agent": "ofertare-bilka/1.0" } });
    if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

// rezerva: pagina cursbnr.ro - parser strict pe randul EUR ("1 EURO = 5.3495 Lei"
// sau celula de dupa <td>EUR</td>); nimic altceva nu e acceptat (pagina are "EUR"
// si inaintea valorii dolarului, intr-un meniu - 28.10.2026)
export function parseazaCursbnr(html: string): CursZi | null {
  const data = /(\d{4}-\d{2}-\d{2})|(\d{2})[./](\d{2})[./](\d{4})/.exec(html);
  const curs = /1\s*EURO?\s*=\s*(\d\.\d{4})\s*Lei/i.exec(html) ?? /<td[^>]*>\s*EUR\s*<\/td>[\s\S]{0,400}?<td[^>]*>\s*(\d\.\d{4})\s*<\/td>/i.exec(html);
  if (!curs) return null;
  let dataIso: string;
  if (data?.[1]) dataIso = data[1];
  else if (data?.[2]) dataIso = `${data[4]}-${data[3]}-${data[2]}`;
  else dataIso = localRomania(new Date()).data;
  return { data: dataIso, curs: Number(curs[1]).toFixed(4), sursa: "cursbnr.ro" };
}

export async function salveazaCursuri(cursuri: CursZi[]): Promise<number> {
  let salvate = 0;
  for (const c of cursuri) {
    await prisma.cursValutar.upsert({
      where: { data_moneda: { data: new Date(`${c.data}T00:00:00Z`), moneda: "EUR" } },
      create: { data: new Date(`${c.data}T00:00:00Z`), moneda: "EUR", curs: c.curs, sursa: c.sursa },
      update: { curs: c.curs, sursa: c.sursa, preluatLa: new Date() },
    });
    salvate++;
  }
  return salvate;
}

// ultima incercare de preluare (de la pornirea serverului): cand, sursa care a
// raspuns, reusit / esuat si mesajul - pagina "Curs BNR" o arata
export interface IncercareCurs {
  la: string;
  sursa: string;
  reusit: boolean;
  salvate: number;
  mesaj: string;
}
let ultimaIncercare: IncercareCurs | null = null;
export function ultimaIncercareCurs(): IncercareCurs | null {
  return ultimaIncercare;
}

const mesajEroare = (e: unknown) => (e instanceof Error ? e.message : String(e));

// XML-ul BNR trebuie sa contina cuburile cu cursuri; o pagina HTML (site-ul BNR
// refuza cererile automate - 28.10.2026) sau un XML fara EUR = esec, nu "0 cursuri"
export function cursuriDinXmlBnr(xml: string): CursZi[] {
  const cursuri = parseazaBnrXml(xml);
  if (cursuri.length > 0) return cursuri;
  if (/<DataSet|<Cube/i.test(xml)) throw new Error("XML-ul BNR nu conține cursul EUR");
  if (/Request Rejected/i.test(xml)) throw new Error("site-ul BNR a respins cererea automată (Request Rejected)");
  throw new Error("BNR nu a răspuns cu XML, ci cu o pagină HTML (site-ul refuză cererile automate)");
}

// preia cursul zilei (si, optional, istoricul anului); intoarce ce a salvat.
// Ordinea: sursa oficiala BNR intai; daca nu da XML, rezerva cursbnr.ro - cand
// BNR redeschide XML-ul, revenim singuri la ea.
export async function preiaCursuri(optiuni: { istoric?: boolean; preluator?: Preluator } = {}): Promise<{ salvate: number; sursa: string; mesaj: string }> {
  const preluator = optiuni.preluator ?? preiaText;
  const gasite: CursZi[] = [];
  const mesaje: string[] = [];
  let sursa = "BNR";
  try {
    gasite.push(...cursuriDinXmlBnr(await preluator(URL_BNR_ZI)));
    if (optiuni.istoric) {
      const an = Number(localRomania(new Date()).data.slice(0, 4));
      for (const a of [an - 1, an]) {
        try {
          gasite.push(...cursuriDinXmlBnr(await preluator(urlBnrAn(a))));
        } catch (e) {
          mesaje.push(`istoric ${a}: ${mesajEroare(e)}`);
        }
      }
    }
  } catch (e) {
    mesaje.push(`BNR: ${mesajEroare(e)}`);
    try {
      const rezerva = parseazaCursbnr(await preluator(URL_CURSBNR));
      if (!rezerva) throw new Error("pagina nu are rândul EUR în forma așteptată");
      gasite.push(rezerva);
      sursa = "cursbnr.ro";
    } catch (e2) {
      mesaje.push(`cursbnr.ro: ${mesajEroare(e2)}`);
    }
  }
  const salvate = gasite.length === 0 ? 0 : await salveazaCursuri(gasite);
  const reusit = salvate > 0;
  const rezultat = { salvate, sursa: reusit ? sursa : "niciuna", mesaj: mesaje.join("; ") };
  ultimaIncercare = { la: new Date().toISOString(), sursa: rezultat.sursa, reusit, salvate, mesaj: rezultat.mesaj };
  return rezultat;
}

export async function cursuriDinTabel(limita = 400): Promise<CursZi[]> {
  const randuri = await prisma.cursValutar.findMany({ where: { moneda: "EUR" }, orderBy: { data: "desc" }, take: limita });
  return randuri.map((r) => ({ data: r.data.toISOString().slice(0, 10), curs: r.curs.toFixed(4), sursa: r.sursa }));
}

export interface CursInghetat {
  cursBnr: string;
  cursAchizitie: string;
  dataCurs: string;
  sursaCurs: string;
  avertizareCurs: string | null;
}

// cursul valabil acum, dupa regula orei 13:00; daca e dupa 13:00 si cursul zilei
// lipseste, o incercare de preluare pe loc; daca nu reuseste, cursul precedent cu
// avertizare ("curs de ieri / offline"). Fara niciun curs in tabel -> eroare.
export async function cursulZilei(acum: Date = new Date(), preluator?: Preluator | null): Promise<CursInghetat> {
  let cursuri = await cursuriDinTabel();
  let avertizare: string | null = null;
  if (lipsesteCursulZilei(acum, cursuri)) {
    if (preluator !== null) await preiaCursuri(preluator ? { preluator } : {});
    cursuri = await cursuriDinTabel();
    if (lipsesteCursulZilei(acum, cursuri)) avertizare = "curs de ieri / offline: cursul BNR al zilei nu a putut fi preluat";
  }
  const curs = cursPentruMoment(acum, cursuri);
  if (!curs) throw new EroareCurs("Nu există niciun curs BNR în baza de date. Preia cursul din Zona tehnică (Curs BNR) sau introdu-l manual.");
  return { cursBnr: curs.curs, cursAchizitie: cursAchizitie(curs.curs), dataCurs: curs.data, sursaCurs: curs.sursa, avertizareCurs: avertizare };
}

export class EroareCurs extends Error {}

// preluarea zilnica: la pornire si apoi la fiecare 10 minute, cand e dupa 13:00
// si cursul zilei lipseste
export function pornestePlanificatorCurs(): NodeJS.Timeout {
  const incearca = async () => {
    try {
      const cursuri = await cursuriDinTabel(5);
      if (cursuri.length === 0 || lipsesteCursulZilei(new Date(), cursuri)) {
        const r = await preiaCursuri({ istoric: cursuri.length === 0 });
        if (r.salvate > 0) console.log(`Curs BNR preluat (${r.sursa}): ${r.salvate} cursuri${r.mesaj ? ` - ${r.mesaj}` : ""}`);
        else console.warn(`Cursul BNR nu a putut fi preluat: ${r.mesaj}`);
      }
    } catch (e) {
      console.warn("Preluarea cursului BNR a esuat:", e instanceof Error ? e.message : e);
    }
  };
  void incearca();
  const t = setInterval(incearca, 10 * 60 * 1000);
  t.unref();
  return t;
}
