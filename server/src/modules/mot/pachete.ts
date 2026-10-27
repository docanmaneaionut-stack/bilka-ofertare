import { esteLinieInvelitoare } from "./cantitati.js";
import type { CheieCuloare, FormularBilka, IntrareOferta, Invelitoare, LinieOferta, Pachet, ProdusOferta } from "./tipuri.js";

// Pachetele si formularele Bilka (FISA-OFERTARE 3.3-3.5, 3.8; ETALON E11).
// Impachetarea o decide softul; agentul vede doar "se vor genera N formulare" si de ce.
//   - un pachet = o invelitoare + liniile legate de ea (tinichigerie, fixare);
//   - a doua invelitoare cu aceeasi cheie (finisaj, grosime, culoare) ramane in
//     pachetul principalei; cu alta cheie dar fara accesorii proprii - tot acolo
//     (intra ca secundara pe formular); cu alta cheie SI accesorii proprii -
//     pachet separat;
//   - pluvialul: un grup (si un formular) per finisaj + culoare;
//   - sectiunile de sine statatoare (linii cu cheie proprie, fara invelitoare):
//     un formular fara invelitoare per cheie;
//   - accesoriile la lungimi au foaia lor pe primul formular; zona B nu intra.
// Numele pachetelor se deriva din catalog: familia fara prefixul grupului si
// fara paranteze + numarul RAL + finisajul (fara liste de prescurtari in cod).

const ZERO2 = "0.00";

export function numeModel(produs: ProdusOferta): string {
  let nume = (produs.familie ?? produs.denumire).trim();
  const grup = (produs.grup ?? "").trim();
  if (grup && nume.toLowerCase().startsWith(grup.toLowerCase() + " ")) nume = nume.slice(grup.length).trim();
  nume = nume.replace(/\s*\([^)]*\)/g, "").trim();
  return nume || produs.denumire;
}

// "RAL 8017" -> "8017"
export function numarRal(ral: string | undefined): string {
  return (ral ?? "").replace(/^\s*RAL\s*/i, "").trim();
}

// "pluvial colorat (lucios)" / "colorat (lucios)" -> "colorat (lucios)"; "pluvial mat" -> "mat"
export function finisajScurt(finisaj: string | undefined): string {
  return (finisaj ?? "").replace(/^\s*pluvial\s+/i, "").trim();
}

export function cheieInvelitoare(inv: Invelitoare): CheieCuloare {
  const cheie: CheieCuloare = { ral: inv.culoare ?? "", finisaj: inv.produs.finisaj ?? "" };
  if (inv.produs.grosime) cheie.grosime = inv.produs.grosime;
  return cheie;
}

export function aceeasiCheie(a: CheieCuloare, b: CheieCuloare): boolean {
  const n = (s: string | undefined) => (s ?? "").trim().toLowerCase();
  return n(a.ral) === n(b.ral) && n(a.finisaj) === n(b.finisaj) && n(a.grosime) === n(b.grosime);
}

export function textCheie(c: CheieCuloare): string {
  return [numarRal(c.ral), finisajScurt(c.finisaj), c.grosime?.replace(/\s*mm$/i, "")].filter(Boolean).join(" ");
}

function esteRubricaPluvial(rubrica: string): boolean {
  return /pluvial/i.test(rubrica);
}

function esteRubricaLungimi(rubrica: string): boolean {
  return /la lungimi|\(ML\)/i.test(rubrica);
}

function cheieLinie(l: LinieOferta): CheieCuloare {
  const c: CheieCuloare = { ral: l.culoare?.ral ?? "", finisaj: l.produs.finisaj ?? l.culoare?.finisaj ?? "" };
  const grosime = l.produs.grosime ?? l.culoare?.grosime;
  if (grosime) c.grosime = grosime;
  return c;
}

export interface Impachetare {
  pachete: Pachet[];
  formulare: FormularBilka[];
  text: string;
  pachetPeLinie: Map<string, string>;
  avertizari: string[];
}

export function impacheteaza(intrare: IntrareOferta): Impachetare {
  const pachete: Pachet[] = [];
  const pachetPeLinie = new Map<string, string>();
  const avertizari: string[] = [];
  const linii = intrare.linii;

  const atribuie = (p: Pachet, ids: string[]) => {
    for (const id of ids) {
      if (!p.linii.includes(id)) p.linii.push(id);
      pachetPeLinie.set(id, p.nume);
    }
  };
  const liniaInvelitorii = (inv: Invelitoare) => linii.filter((l) => esteLinieInvelitoare(l.rubrica) && l.produs.cod === inv.id).map((l) => l.id);
  const liniileLegate = (inv: Invelitoare) => linii.filter((l) => l.invelitoare === inv.id).map((l) => l.id);

  // 1. pachetele invelitorilor
  const principala = intrare.invelitori.find((i) => i.rol === "principala") ?? intrare.invelitori[0];
  const secundare = intrare.invelitori.filter((i) => i !== principala);
  let pachetPrincipal: Pachet | undefined;
  if (principala) {
    pachetPrincipal = {
      id: "P1",
      nume: `P1 — ${numeModel(principala.produs)} ${numarRal(principala.culoare)} ${finisajScurt(principala.produs.finisaj)}`.trim(),
      tip: "invelitoare",
      cheie: cheieInvelitoare(principala),
      invelitoarePrincipala: principala.id,
      invelitoriSecundare: [],
      linii: [],
      achizitieEur: ZERO2,
    };
    pachete.push(pachetPrincipal);
    atribuie(pachetPrincipal, [...liniaInvelitorii(principala), ...liniileLegate(principala)]);
  }
  for (const sec of secundare) {
    const proprii = liniileLegate(sec);
    const aceeasi = pachetPrincipal ? aceeasiCheie(cheieInvelitoare(sec), pachetPrincipal.cheie) : false;
    if (pachetPrincipal && (aceeasi || proprii.length === 0)) {
      pachetPrincipal.invelitoriSecundare.push(sec.id);
      atribuie(pachetPrincipal, [...liniaInvelitorii(sec), ...proprii]);
      continue;
    }
    const nr = pachete.filter((p) => p.tip === "invelitoare").length + 1;
    const p: Pachet = {
      id: `P${nr}`,
      nume: `P${nr} — ${numeModel(sec.produs)} ${numarRal(sec.culoare)} ${finisajScurt(sec.produs.finisaj)}`.trim(),
      tip: "invelitoare",
      cheie: cheieInvelitoare(sec),
      invelitoarePrincipala: sec.id,
      invelitoriSecundare: [],
      linii: [],
      achizitieEur: ZERO2,
    };
    pachete.push(p);
    atribuie(p, [...liniaInvelitorii(sec), ...proprii]);
  }

  // 2. pluvialul: un grup per finisaj + culoare, in ordinea aparitiei
  const litere = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const l of linii.filter((x) => esteRubricaPluvial(x.rubrica) && !pachetPeLinie.has(x.id))) {
    const cheie = cheieLinie(l);
    delete cheie.grosime;
    let p = pachete.find((x) => x.tip === "pluvial" && aceeasiCheie(x.cheie, cheie));
    if (!p) {
      const idx = pachete.filter((x) => x.tip === "pluvial").length;
      const litera = litere[idx] ?? String(idx + 1);
      p = {
        id: `PL${litera}`,
        nume: `Pluvial ${litera} — ${finisajScurt(cheie.finisaj)} ${numarRal(cheie.ral)}`.trim(),
        tip: "pluvial",
        cheie,
        invelitoriSecundare: [],
        linii: [],
        achizitieEur: ZERO2,
      };
      pachete.push(p);
    }
    atribuie(p, [l.id]);
  }

  // 3. sectiunile de sine statatoare (cheie proprie, fara invelitoare); accesoriile
  //    la lungimi raman pe foaia lor, nu formeaza pachet
  const laLungimi = linii.filter((x) => esteRubricaLungimi(x.rubrica) || (x.pozitii !== undefined && x.pozitii.length > 0 && !esteLinieInvelitoare(x.rubrica)));
  for (const l of linii.filter((x) => !pachetPeLinie.has(x.id) && x.culoare && !laLungimi.includes(x))) {
    const cheie = cheieLinie(l);
    let p = pachete.find((x) => x.tip === "de_sine_statatoare" && aceeasiCheie(x.cheie, cheie));
    if (!p) {
      const nr = pachete.filter((x) => x.tip === "de_sine_statatoare").length + 1;
      p = {
        id: `S${nr}`,
        nume: `Secțiune de sine stătătoare ${nr} — ${textCheie(cheie)}`,
        tip: "de_sine_statatoare",
        cheie,
        invelitoriSecundare: [],
        linii: [],
        achizitieEur: ZERO2,
      };
      pachete.push(p);
    }
    atribuie(p, [l.id]);
  }

  // 4. ce a ramas fara pachet: liniile legate de principala fara cheie proprie,
  //    sau linii neatribuite (avertizare)
  for (const l of linii.filter((x) => !pachetPeLinie.has(x.id) && !laLungimi.includes(x))) {
    if (pachetPrincipal) {
      atribuie(pachetPrincipal, [l.id]);
    } else {
      avertizari.push(`Linia ${l.produs.denumire} nu are nici învelitoare, nici cheie de culoare - nu intră în niciun formular`);
    }
  }

  // 5. formularele: unul per pachet de invelitoare, unul per pluvial, unul per
  //    sectiune de sine statatoare; accesoriile la lungimi si sipca pe primul
  const formulare: FormularBilka[] = [];
  const numeInvelitoare = (id: string) => {
    const inv = intrare.invelitori.find((i) => i.id === id);
    if (!inv) return id;
    const varianta = inv.variantaProfil ? ` ${inv.variantaProfil}` : "";
    return `${numeModel(inv.produs)}${varianta} ${numarRal(inv.culoare)} ${finisajScurt(inv.produs.finisaj)} ${(inv.produs.grosime ?? "").replace(/\s*mm$/i, "")}`.trim();
  };
  for (const p of pachete) {
    const nr = formulare.length + 1;
    let continut: string;
    if (p.tip === "invelitoare" && p.invelitoarePrincipala) {
      const accesorii = p.linii.filter((id) => !linii.find((l) => l.id === id && esteLinieInvelitoare(l.rubrica))).length;
      const secundare = p.invelitoriSecundare.map((id) => `${numeInvelitoare(id)} ca învelitoare secundară`);
      const motiv = nr > 1 ? " — pachet separat: altă cheie și accesorii proprii" : "";
      continut = [`${numeInvelitoare(p.invelitoarePrincipala)} ca învelitoare principală`, ...secundare, `${accesorii} linii de accesorii și fixare (cheie ${textCheie(p.cheie)})`].join(" + ") + motiv;
    } else if (p.tip === "pluvial") {
      continut = `Pluvial ${finisajScurt(p.cheie.finisaj)} RAL ${numarRal(p.cheie.ral)} (${p.linii.length} poziții) — un formular per finisaj + culoare`;
    } else {
      continut = `Formular fără învelitoare: doar finisaj, grosime și culoare (${textCheie(p.cheie)}), ${p.linii.length} linii`;
    }
    formulare.push({ nr, pachete: [p.id], continut });
  }
  if (laLungimi.length > 0) {
    if (formulare.length === 0) formulare.push({ nr: 1, pachete: [], continut: "Formular fără învelitoare" });
    formulare[0].continut += ` + accesorii speciale la lungimi pe foaia lor, cu culoarea pe rând (${laLungimi.length} rânduri)`;
  }
  if (intrare.sipca) {
    const pachetSipca = pachetPeLinie.get(intrare.sipca.linieId);
    const f = formulare.find((x) => pachete.some((p) => x.pachete.includes(p.id) && p.nume === pachetSipca)) ?? formulare[0];
    if (f) f.continut += ` + blocul de șipcă (${intrare.sipca.model})`;
  }

  const n = formulare.length;
  const text =
    n === 0
      ? "Nu se generează niciun formular Bilka (oferta nu are produse pentru formular)."
      : `Se ${n === 1 ? "va genera 1 formular" : `vor genera ${n} formulare`} Bilka: ${formulare.map((f) => `${f.nr}) ${f.continut}`).join("; ")}.`;

  return { pachete, formulare, text, pachetPeLinie, avertizari };
}
