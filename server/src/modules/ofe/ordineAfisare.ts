import { prisma } from "../../db/prisma.js";
import { categorieInvelitoare, listaImplicita } from "./catalog.js";

// S29 (BUG-21, FISA-OFERTARE "Ordinea rubricilor", precizarea din 25.11.2026): ORDINEA DE AFISARE a liniilor
// unei oferte - aceeasi pe toate documentele (oferta, detaliata, rezumat, tabel de facturare, aviz, fisa
// soferului), in lista "Preturi pe linii" din editor si in lista de la retur. E SINGURUL loc care o stabileste.
//
// Regula = ecranul ofertei, de sus in jos:
//   1. rubrica, in ordinea clasica;
//   2. sectiunea, cum stau pe ecran: a invelitorii principale, ale secundarelor, apoi sectiunile de sine
//      statatoare si sistemele adaugate (in ordinea in care au fost deschise);
//   3. in sectiune: produsele din lista implicita, in ordinea listei;
//   4. apoi cele adaugate cu "+", in ordinea adaugarii.
//
// Se schimba DOAR afisarea. Ordinea salvata a liniilor ("ordine" din oferta_linie) si cea in care pleaca spre
// motor raman neatinse (R5 departajeaza dupa ea) - de aceea rangul se calculeaza aici, la afisare, din listele
// implicite de acum, si nu se scrie nicaieri.

// ordinea clasica a rubricilor (decisa 14.09.2026, completata 19.10.2026) - aceeasi ca in editor
export const ORDINEA_RUBRICILOR = ["Învelitori", "Accesorii standard", "Accesorii speciale (2 ML)", "Fixare și etanșare", "Sistem pluvial", "Șipcă gard", "Accesorii speciale la lungimi (ML)", "Ferestre", "Zona B"];
// rubricile cu lista implicita pe cheia invelitorii (finisaj + grosime) si pe categoria ei
const RUBRICI_CU_LISTA = new Set(["Accesorii standard", "Fixare și etanșare"]);
const PLUVIAL = "Sistem pluvial";
const FARA_LOC = 1_000_000;

export interface OfertaPentruRang {
  invelitori: { id: string; ordine: number; grup: string | null; familie: string | null; finisaj: string | null; grosime: string | null }[];
  linii: {
    id: string;
    ordine: number;
    rubrica: string;
    produsId: string | null;
    invelitoareId: string | null;
    finisaj: string | null;
    grosime: string | null;
    sistem: string | null;
    culoareRal: string | null;
    culoareFinisaj: string | null;
    culoareGrosime: string | null;
  }[];
  sipci: { linieId: string; ordine: number }[];
}

const rangRubrica = (rubrica: string) => {
  const i = ORDINEA_RUBRICILOR.indexOf(rubrica);
  return i >= 0 ? i : ORDINEA_RUBRICILOR.length;
};

// rangul de afisare al fiecarei linii: id -> 0, 1, 2, ... (de sus in jos)
export async function rangDeAfisare(o: OfertaPentruRang): Promise<Map<string, number>> {
  const invelitori = new Map(o.invelitori.map((i) => [i.id, i]));
  const principala = [...o.invelitori].sort((a, b) => a.ordine - b.ordine)[0] ?? null;
  const sipci = new Map(o.sipci.map((s) => [s.linieId, s.ordine]));

  // categoriile de invelitoare ale listelor (o singura citire) si listele cerute (o citire per cheie)
  let categoriiListe: string[] | null = null;
  const categoria = async (inv: { grup: string | null; familie: string | null } | null): Promise<string | null> => {
    if (!inv?.grup) return null;
    categoriiListe ??= (await prisma.listaImplicitaOferta.findMany({ where: { activ: true }, distinct: ["categorieInvelitoare"], select: { categorieInvelitoare: true } })).map((c) => c.categorieInvelitoare).filter((c): c is string => Boolean(c));
    return categorieInvelitoare({ grup: inv.grup, familie: inv.familie }, categoriiListe);
  };
  const liste = new Map<string, Promise<Map<string, number>>>();
  const lista = (rubrica: string, categorie: string | null, cheie: { finisaj?: string; grosime?: string; sistem?: string }): Promise<Map<string, number>> => {
    const k = JSON.stringify([rubrica, categorie, cheie.finisaj ?? "", cheie.grosime ?? "", cheie.sistem ?? ""]);
    let p = liste.get(k);
    if (!p) {
      p = listaImplicita(rubrica, categorie, cheie).then((r) => new Map(r.produse.map((x, i) => [x.id, i])));
      liste.set(k, p);
    }
    return p;
  };

  // sectiunile fara invelitoare (cheie proprie, sisteme pluviale): in ordinea in care apar in oferta
  const primaAparitie = new Map<string, number>();
  const sectiuneProprie = (l: OfertaPentruRang["linii"][number]) => [l.rubrica, l.culoareFinisaj ?? "", l.culoareGrosime ?? "", l.rubrica === PLUVIAL ? (l.sistem ?? "") : "", l.culoareRal ?? ""].join("|");
  for (const l of [...o.linii].sort((a, b) => a.ordine - b.ordine)) {
    if (l.invelitoareId && invelitori.has(l.invelitoareId)) continue;
    const k = sectiuneProprie(l);
    if (!primaAparitie.has(k)) primaAparitie.set(k, l.ordine);
  }

  const chei: { id: string; cheie: [number, number, number, number] }[] = [];
  for (const l of o.linii) {
    const inv = l.invelitoareId ? (invelitori.get(l.invelitoareId) ?? null) : null;
    // sectiunea: invelitorile in ordinea lor (principala = 1), apoi cele cu cheie proprie; sipca - rubricile ei
    const sectiune = sipci.has(l.id) ? sipci.get(l.id)! : inv ? inv.ordine : FARA_LOC + (primaAparitie.get(sectiuneProprie(l)) ?? 0);
    let inLista = FARA_LOC;
    if (l.produsId && RUBRICI_CU_LISTA.has(l.rubrica)) {
      // sectiunea unei invelitori are lista categoriei ei; cea de sine statatoare - a principalei (ca pe ecran)
      const finisaj = (inv ? inv.finisaj : (l.culoareFinisaj ?? l.finisaj)) ?? undefined;
      const grosime = (inv ? inv.grosime : (l.culoareGrosime ?? l.grosime)) ?? undefined;
      const categorie = (await categoria(inv)) ?? (await categoria(principala));
      inLista = (await lista(l.rubrica, categorie, { finisaj, grosime })).get(l.produsId) ?? FARA_LOC;
    } else if (l.produsId && l.rubrica === PLUVIAL && l.sistem) {
      inLista = (await lista(PLUVIAL, null, { finisaj: (l.culoareFinisaj ?? l.finisaj) ?? undefined, sistem: l.sistem })).get(l.produsId) ?? FARA_LOC;
    }
    chei.push({ id: l.id, cheie: [rangRubrica(l.rubrica), sectiune, inLista, l.ordine] });
  }
  chei.sort((a, b) => a.cheie[0] - b.cheie[0] || a.cheie[1] - b.cheie[1] || a.cheie[2] - b.cheie[2] || a.cheie[3] - b.cheie[3]);
  return new Map(chei.map((x, i) => [x.id, i]));
}

// rangul, pentru o oferta cunoscuta doar dupa id (lista de la retur)
export async function rangDeAfisarePentruOferta(ofertaId: string): Promise<Map<string, number>> {
  const o = await prisma.oferta.findUniqueOrThrow({
    where: { id: ofertaId },
    select: {
      invelitori: { select: { id: true, ordine: true, grup: true, familie: true, finisaj: true, grosime: true } },
      linii: { select: { id: true, ordine: true, rubrica: true, produsId: true, invelitoareId: true, finisaj: true, grosime: true, sistem: true, culoareRal: true, culoareFinisaj: true, culoareGrosime: true } },
      sipci: { select: { linieId: true, ordine: true } },
    },
  });
  return rangDeAfisare(o);
}

// aceleasi elemente, in ordinea de afisare (ce n-are rang ramane la coada, in ordinea primita)
export function inOrdineaDeAfisare<T>(elemente: T[], id: (e: T) => string, rang: Map<string, number>): T[] {
  return elemente
    .map((e, i) => ({ e, i, r: rang.get(id(e)) ?? FARA_LOC * 10 }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.e);
}
