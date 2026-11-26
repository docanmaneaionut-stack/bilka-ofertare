import { invelitoriTrimise, RUBRICI, spreServer, type InvelitoareUI, type LinieUI, type StareEditor } from "./editor";
import { RUBRICI_BARA, type IdRubrica } from "./rubrici";

// S29b (BUG-24 a, d; MODIFICARI-S29B.md, deciziile 1 si 2): salvarea ramane "totul sau nimic", dar la vedere.
// Aici, fara ecran: ce randuri ar refuza serverul ("refuz" - aceleasi reguli ca in schema de pe server:
// numar scris pana la capat si mai mare decat 0, culoare aleasa pe pozitia cu randuri) si ce randuri sunt
// "incomplete" (lungime fara bucati sau invers: nu pleaca spre server, deci NU sunt in oferta). Fiecare problema
// spune ce e de corectat si unde - rubrica si casuta -, ca pagina sa poata duce la rand.
// Randurile goale de produs (fara cantitate, BUG-20) nu sunt probleme: nu se marcheaza si nu opresc nimic.

export type Problema = { fel: "refuz" | "incomplet"; text: string; rubrica: IdRubrica | null; selector: string | null };

type Pozitie = { lungimeM: string; bucati: string };

// numarul scris pana la capat (regula serverului: cifre, cel mult un separator urmat de cifre) si mai mare decat 0
const NUMAR = /^\d+([.,]\d+)?$/;
const numar = (t: string) => Number(t.trim().replace(",", "."));
export const numarBun = (text: string, cuZero = false): boolean => NUMAR.test(text.trim()) && (cuZero ? numar(text) >= 0 : numar(text) > 0);

// starea unui rand lungime x bucati: gol, bun, cu lungimea gresita, fara bucati, fara lungime
export type StareRand = "gol" | "bun" | "lungimeGresita" | "faraBucati" | "faraLungime";
export function stareaRandului(p: Pozitie): StareRand {
  const lungime = p.lungimeM.trim();
  const bucati = p.bucati.trim();
  const cuBucati = Number(bucati) > 0;
  if (!lungime) return bucati ? "faraLungime" : "gol";
  if (!cuBucati) return "faraBucati";
  return numarBun(lungime) ? "bun" : "lungimeGresita";
}

// mesajul de langa rand (null = nimic de spus)
export const MESAJ_RAND: Record<StareRand, string | null> = {
  gol: null,
  bun: null,
  lungimeGresita: "lungimea nu e scrisă până la capăt",
  faraBucati: "lungime fără bucăți — rândul nu e în ofertă",
  faraLungime: "bucăți fără lungime — rândul nu e în ofertă",
};

// starea unui tronson de sipca (varianta Calcul): lungimea sipcii singura e doar presetarea, nu o problema
export type StareTronson = "gol" | "bun" | "faraLungimeaSipcii" | "lungimeGresita" | "tronsonGresit" | "distantaGresita";
export function stareaTronsonului(t: { lungimeSipcaM: string; lungimeTronsonM: string; distantaMm: string }): StareTronson {
  const sipca = t.lungimeSipcaM.trim();
  const tronson = t.lungimeTronsonM.trim();
  if (!tronson) return "gol";
  if (!sipca) return "faraLungimeaSipcii";
  if (!numarBun(sipca)) return "lungimeGresita";
  if (!numarBun(tronson)) return "tronsonGresit";
  if (t.distantaMm.trim() && !numarBun(t.distantaMm, true)) return "distantaGresita";
  return "bun";
}

export const MESAJ_TRONSON: Record<StareTronson, string | null> = {
  gol: null,
  bun: null,
  faraLungimeaSipcii: "lungimea tronsonului fără lungimea șipcii — tronsonul nu e în ofertă",
  lungimeGresita: "lungimea șipcii nu e scrisă până la capăt",
  tronsonGresit: "lungimea tronsonului nu e scrisă până la capăt",
  distantaGresita: "distanța nu e scrisă până la capăt",
};

const casuta = (grup: string, rand: number, camp: string) => `input[data-grup="${grup}"][data-rand="${rand}"][data-camp="${camp}"]`;
export const locCuloare = (cheie: string) => `culoare-${cheie}`;
const dupaLoc = (loc: string) => `[data-loc="${loc}"]`;

const idRubrica = (rubrica: string): IdRubrica | null => RUBRICI_BARA.find((r) => r.rubrica === rubrica)?.id ?? null;
const numeInvelitoare = (s: StareEditor, i: InvelitoareUI) => (s.invelitori.indexOf(i) === 0 ? "Învelitoarea principală" : `Învelitoarea secundară ${s.invelitori.indexOf(i) + 1}`);
const numeLinie = (l: LinieUI) => {
  if (l.rubrica === RUBRICI.lungimi) return `Accesorii la lungimi · ${l.produs.treapta ?? l.produs.denumire}`;
  if (l.rubrica === RUBRICI.sipca) return `Șipcă · ${l.produs.familie ?? l.produs.denumire}`;
  return `${l.rubrica} · ${l.produs.denumire}`;
};

// problemele randurilor lungime x bucati ale unui bloc (panotaj, pozitie la lungimi, sipca)
function problemeRanduri(nume: string, rubrica: IdRubrica | null, grup: string, randuri: Pozitie[]): Problema[] {
  const p: Problema[] = [];
  randuri.forEach((r, k) => {
    const st = stareaRandului(r);
    const unde = `${nume} · poziția ${k + 1}`;
    if (st === "lungimeGresita") p.push({ fel: "refuz", text: `${unde}: lungimea „${r.lungimeM.trim()}” nu e scrisă până la capăt`, rubrica, selector: casuta(grup, k, "lungime") });
    else if (st === "faraBucati") p.push({ fel: "incomplet", text: `${unde}: lungime fără bucăți — rândul nu e în ofertă`, rubrica, selector: casuta(grup, k, "bucati") });
    else if (st === "faraLungime") p.push({ fel: "incomplet", text: `${unde}: bucăți fără lungime — rândul nu e în ofertă`, rubrica, selector: casuta(grup, k, "lungime") });
  });
  return p;
}

export function problemeEditor(s: StareEditor): Problema[] {
  const p: Problema[] = [];
  const trimise = new Set(spreServer(s).linii.map((l) => l.cheie));

  // invelitorile: pozitiile de panotaj pleaca doar in modurile cu panotaj
  for (const i of invelitoriTrimise(s)) {
    if (i.mod !== "mp") p.push(...problemeRanduri(numeInvelitoare(s, i), "invelitori", `panotaj-${i.cheie}`, i.panotaj));
    if (i.mod !== "panotaj" && i.mpDirect.trim() && !numarBun(i.mpDirect)) p.push({ fel: "refuz", text: `${numeInvelitoare(s, i)}: suprafața „${i.mpDirect.trim()}” nu e scrisă până la capăt`, rubrica: "invelitori", selector: null });
  }

  for (const l of s.linii) {
    if (!l.produs.id) continue;
    const rubrica = idRubrica(l.rubrica);
    const sipca = l.rubrica === RUBRICI.sipca ? (s.sipci.find((x) => x.linie === l.cheie) ?? null) : null;
    const cuPozitii = l.rubrica === RUBRICI.lungimi || (sipca !== null && sipca.varianta === "comanda");
    if (cuPozitii) p.push(...problemeRanduri(numeLinie(l), rubrica, `${l.rubrica === RUBRICI.lungimi ? "lungimi" : "sipca"}-${l.cheie}`, l.pozitii ?? []));
    if (sipca?.varianta === "calcul") {
      sipca.tronsoane.forEach((t, k) => {
        const st = stareaTronsonului(t);
        const unde = `${numeLinie(l)} · tronsonul ${k + 1}`;
        const grup = `tronsoane-${l.cheie}`;
        if (st === "faraLungimeaSipcii") p.push({ fel: "incomplet", text: `${unde}: lungimea tronsonului fără lungimea șipcii — tronsonul nu e în ofertă`, rubrica, selector: casuta(grup, k, "lungime") });
        else if (st === "lungimeGresita") p.push({ fel: "refuz", text: `${unde}: lungimea șipcii „${t.lungimeSipcaM.trim()}” nu e scrisă până la capăt`, rubrica, selector: casuta(grup, k, "lungime") });
        else if (st === "tronsonGresit") p.push({ fel: "refuz", text: `${unde}: lungimea tronsonului „${t.lungimeTronsonM.trim()}” nu e scrisă până la capăt`, rubrica, selector: casuta(grup, k, "lungimeTronson") });
        else if (st === "distantaGresita") p.push({ fel: "refuz", text: `${unde}: distanța „${t.distantaMm.trim()}” nu e scrisă până la capăt`, rubrica, selector: casuta(grup, k, "distanta") });
      });
    }
    if (!trimise.has(l.cheie)) continue;
    // linia care pleaca spre server: cantitatea scrisa pana la capat si, la cele cu cheia lor, culoarea aleasa
    if (!cuPozitii && !sipca && !numarBun(l.cantitate)) p.push({ fel: "refuz", text: `${numeLinie(l)}: cantitatea „${l.cantitate.trim()}” nu e scrisă până la capăt`, rubrica, selector: null });
    if (!l.invelitoare && l.culoare && !l.culoare.ral.trim()) p.push({ fel: "refuz", text: `${numeLinie(l)}: alege culoarea — fără ea oferta nu se poate salva`, rubrica, selector: dupaLoc(locCuloare(l.cheie)) });
  }

  s.zonaB.forEach((z, k) => {
    if (!z.denumire.trim() || !(numar(z.cantitate) > 0)) return;
    if (!numarBun(z.cantitate)) p.push({ fel: "refuz", text: `Zona B · rândul ${k + 1}: cantitatea „${z.cantitate.trim()}” nu e scrisă până la capăt`, rubrica: "zonaB", selector: null });
    else if (z.sumaLei.trim() && !numarBun(z.sumaLei, true)) p.push({ fel: "refuz", text: `Zona B · rândul ${k + 1}: suma „${z.sumaLei.trim()}” nu e scrisă până la capăt`, rubrica: "zonaB", selector: null });
  });
  if (s.grupaPct.trim() && !numarBun(s.grupaPct, true)) p.push({ fel: "refuz", text: `Grupă %: „${s.grupaPct.trim()}” nu e scrisă până la capăt`, rubrica: null, selector: 'input[aria-label="Grupă %"]' });
  return p;
}

// Refuzul venit de la server (regula BUG-4: { camp, mesaj }) asezat pe randul lui. Campul e o cale in ce s-a
// trimis ("linii.1.pozitii.1.lungimeM"): liniile si pozitiile goale nu pleaca, deci indexul trimis se duce inapoi
// la randul de pe ecran. Un camp necunoscut pastreaza mesajul, fara loc.
export function problemaDinRefuz(s: StareEditor, camp: string | undefined, mesaj: string): Problema {
  const faraLoc: Problema = { fel: "refuz", text: mesaj, rubrica: null, selector: null };
  const parti = (camp ?? "").split(".");
  const alK = (lista: Pozitie[], k: number) => lista.map((x, i) => ({ x, i })).filter(({ x }) => x.lungimeM.trim() && Number(x.bucati) > 0)[k]?.i ?? null;
  const campRand = (nume: string | undefined) => (nume === "bucati" ? "bucati" : "lungime");
  if (parti[0] === "invelitori") {
    const i = invelitoriTrimise(s)[Number(parti[1])];
    if (!i) return faraLoc;
    const rand = parti[2] === "panotaj" ? alK(i.panotaj, Number(parti[3])) : null;
    return { ...faraLoc, rubrica: "invelitori", selector: rand !== null ? casuta(`panotaj-${i.cheie}`, rand, campRand(parti[4])) : null };
  }
  if (parti[0] === "linii") {
    const cheie = spreServer(s).linii[Number(parti[1])]?.cheie;
    const l = s.linii.find((x) => x.cheie === cheie);
    if (!l) return faraLoc;
    const rubrica = idRubrica(l.rubrica);
    if (parti[2] === "pozitii") {
      const rand = alK(l.pozitii ?? [], Number(parti[3]));
      return { ...faraLoc, rubrica, selector: rand !== null ? casuta(`${l.rubrica === RUBRICI.lungimi ? "lungimi" : "sipca"}-${l.cheie}`, rand, campRand(parti[4])) : null };
    }
    if (parti[2] === "culoare") return { ...faraLoc, rubrica, selector: dupaLoc(locCuloare(l.cheie)) };
    return { ...faraLoc, rubrica };
  }
  if (parti[0] === "sipci") return { ...faraLoc, rubrica: "sipca" };
  if (parti[0] === "zonaB") return { ...faraLoc, rubrica: "zonaB" };
  if (parti[0] === "grupaPct") return { ...faraLoc, selector: 'input[aria-label="Grupă %"]' };
  return faraLoc;
}
