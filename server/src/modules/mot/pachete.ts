import { esteLinieInvelitoare } from "./cantitati.js";
import type { CheieCuloare, FormularBilka, IntrareOferta, Invelitoare, LinieOferta, LocPluvialFormular, Pachet, ProdusOferta } from "./tipuri.js";

// Pachetele si formularele Bilka (FISA-OFERTARE 3.3-3.5, 3.8; ETALON E11).
// Impachetarea o decide softul; agentul vede doar "se vor genera N formulare" si de ce.
//   - un pachet = o invelitoare + liniile legate de ea (tinichigerie, fixare);
//   - a doua invelitoare cu aceeasi cheie (finisaj, grosime, culoare) ramane in
//     pachetul principalei; cu alta cheie dar fara accesorii proprii - tot acolo
//     (intra ca secundara pe formular); cu alta cheie SI accesorii proprii -
//     pachet separat;
//   - pluvialul: un grup (pachet) per finisaj + culoare; pe formulare, sase
//     locuri finisaj x sistem cu o culoare pe loc (M2, R10);
//   - sectiunile de sine statatoare (linii cu cheie proprie, fara invelitoare):
//     un formular fara invelitoare per cheie;
//   - sipca: o varianta pe formular (M2); accesoriile la lungimi au foaia lor pe
//     primul formular; zona B nu intra.
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

// profilul sipcii pentru numele pachetului (M1, R9): familia fara cuvintele de
// inceput comune cu grupul - "Șipcă Oslo" in grupul "Șipcă metalică de gard" ->
// "Oslo"; nu se aplica la celelalte pachete ("Tablă sinus S18" ramane intreg)
export function numeProfilSipca(produs: ProdusOferta): string {
  const familie = numeModel(produs);
  const cuvinte = familie.split(/\s+/);
  const grup = (produs.grup ?? "").trim().split(/\s+/);
  let n = 0;
  while (n < cuvinte.length - 1 && n < grup.length && cuvinte[n].toLowerCase() === grup[n].toLowerCase()) n++;
  return cuvinte.slice(n).join(" ") || familie;
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
  // M1 (R9): linia invelitorii si liniile legate de ea se recunosc prin id-ul
  // invelitorii pe oferta, nu prin codul produsului (acelasi produs poate fi
  // de doua ori, in culori diferite - E12)
  const liniaInvelitorii = (inv: Invelitoare) => linii.filter((l) => esteLinieInvelitoare(l.rubrica) && l.invelitoare === inv.id).map((l) => l.id);
  const liniileLegate = (inv: Invelitoare) => linii.filter((l) => !esteLinieInvelitoare(l.rubrica) && l.invelitoare === inv.id).map((l) => l.id);
  const esteLinieSipca = (l: LinieOferta) => l.sipca !== undefined;

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
  // M3: linia unei sipci "comanda" are si ea pozitii, dar sta in blocul de sipca, nu pe foaia de lungimi
  const laLungimi = linii.filter((x) => !esteLinieSipca(x) && (esteRubricaLungimi(x.rubrica) || (x.pozitii !== undefined && x.pozitii.length > 0 && !esteLinieInvelitoare(x.rubrica))));
  for (const l of linii.filter((x) => !pachetPeLinie.has(x.id) && x.culoare && !laLungimi.includes(x) && !esteLinieSipca(x))) {
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
  for (const l of linii.filter((x) => !pachetPeLinie.has(x.id) && !laLungimi.includes(x) && !esteLinieSipca(x))) {
    if (pachetPrincipal) {
      atribuie(pachetPrincipal, [l.id]);
    } else {
      avertizari.push(`Linia ${l.produs.denumire} nu are nici învelitoare, nici cheie de culoare - nu intră în niciun formular`);
    }
  }

  // 4b. rubricile de sipca (M1, R9): fiecare rubrica e pachetul ei, "Sipca A — <profil> <RAL> <finisaj>",
  //     in ordinea din oferta; profilul vine din catalog (familia fara cuvintele comune cu grupul)
  const pacheteSipca: Pachet[] = [];
  (intrare.sipci ?? []).forEach((s, idx) => {
    const liniileSipcii = linii.filter((l) => l.sipca === s.id);
    const linie = liniileSipcii[0];
    if (!linie) return;
    const litera = litere[idx] ?? String(idx + 1);
    const cheie = cheieLinie(linie);
    if (s.culoare) cheie.ral = s.culoare;
    const p: Pachet = {
      id: `SIP${litera}`,
      nume: `Șipcă ${litera} — ${numeProfilSipca(linie.produs)} ${numarRal(cheie.ral)} ${finisajScurt(cheie.finisaj)}`.trim(),
      tip: "sipca",
      cheie,
      invelitoriSecundare: [],
      linii: [],
      achizitieEur: ZERO2,
    };
    pachete.push(p);
    pacheteSipca.push(p);
    atribuie(
      p,
      liniileSipcii.map((l) => l.id),
    );
  });

  // 5. formularele (M2, R10 - FISA-OFERTARE 3.5, cap. 6, cap. 8): pornesc de la
  //    pachetele de invelitoare (unul per pachet) si de la sectiunile de sine
  //    statatoare (formular fara invelitoare); fiecare formular are sase locuri
  //    de pluvial (finisaj x sistem din catalog), cu o singura culoare pe loc; un
  //    grup de pluvial (finisaj + sistem + culoare) intra pe primul formular cu
  //    locul lui liber (sau ocupat de aceeasi culoare), altfel pe un formular nou
  //    doar cu pluvial; piesele comune "125 / 90 si 150 / 100" urmeaza grupul
  //    finisajului si culorii lor (singure: locul 125 / 90); sipca: o varianta
  //    (model + finisaj + grosime + culoare) pe formular - prima in blocul
  //    primului formular, fiecare urmatoare pe primul formular fara sipca, altfel
  //    formular nou; accesoriile la lungimi: foaia primului formular, fara
  //    formulare in plus.
  interface FormularInLucru {
    nr: number;
    pachete: string[];
    parti: string[];
    locuri: Map<string, string>;
    variantaSipca?: string;
    // M3 (S17a): continutul structurat, pe id-uri
    invelitoarePrincipala?: string;
    invelitoriSecundare: string[];
    linii: string[];
    pluvial: LocPluvialFormular[];
    sipca?: { id: string; linii: string[] };
    lungimi: string[];
  }
  const formulare: FormularInLucru[] = [];
  const formularNou = (pachetId: string | null, descriere: string): FormularInLucru => {
    const f: FormularInLucru = { nr: formulare.length + 1, pachete: pachetId ? [pachetId] : [], parti: [descriere], locuri: new Map(), invelitoriSecundare: [], linii: [], pluvial: [], lungimi: [] };
    formulare.push(f);
    return f;
  };
  const adaugaPachet = (f: FormularInLucru, id: string) => {
    if (!f.pachete.includes(id)) f.pachete.push(id);
  };
  const primulFormular = () => formulare[0] ?? formularNou(null, "Formular fără învelitoare");
  const numeInvelitoare = (id: string) => {
    const inv = intrare.invelitori.find((i) => i.id === id);
    if (!inv) return id;
    const varianta = inv.variantaProfil ? ` ${inv.variantaProfil}` : "";
    return `${numeModel(inv.produs)}${varianta} ${numarRal(inv.culoare)} ${finisajScurt(inv.produs.finisaj)} ${(inv.produs.grosime ?? "").replace(/\s*mm$/i, "")}`.trim();
  };

  // 5a. un formular per pachet de invelitoare
  for (const p of pachete.filter((x) => x.tip === "invelitoare" && x.invelitoarePrincipala)) {
    const idAccesorii = p.linii.filter((id) => !linii.find((l) => l.id === id && esteLinieInvelitoare(l.rubrica)));
    const secundare = p.invelitoriSecundare.map((id) => `${numeInvelitoare(id)} ca învelitoare secundară`);
    const motiv = formulare.length > 0 ? " — pachet separat: altă cheie și accesorii proprii" : "";
    const f = formularNou(p.id, [`${numeInvelitoare(p.invelitoarePrincipala!)} ca învelitoare principală`, ...secundare, `${idAccesorii.length} linii de accesorii și fixare (cheie ${textCheie(p.cheie)})`].join(" + ") + motiv);
    f.invelitoarePrincipala = p.invelitoarePrincipala;
    f.invelitoriSecundare = [...p.invelitoriSecundare];
    f.linii = idAccesorii;
  }
  // 5b. sectiunile de sine statatoare: formular fara invelitoare, unul per cheie
  for (const p of pachete.filter((x) => x.tip === "de_sine_statatoare")) {
    formularNou(p.id, `Formular fără învelitoare: doar finisaj, grosime și culoare (${textCheie(p.cheie)}), ${p.linii.length} linii`).linii = [...p.linii];
  }

  // 5c. pluvialul pe locurile finisaj x sistem
  const liniiPluvial = linii.filter((x) => esteRubricaPluvial(x.rubrica));
  const grupuri: { loc: string; finisaj: string; sistem: string; ral: string; pachet: string; linii: string[] }[] = [];
  const grupPentru = (l: LinieOferta, sistem: string) => {
    const cheie = cheieLinie(l);
    const loc = locPluvial(cheie.finisaj, sistem);
    let g = grupuri.find((x) => x.loc === loc && aceeasiCheie({ ral: x.ral, finisaj: x.finisaj }, { ral: cheie.ral, finisaj: cheie.finisaj }));
    if (!g) {
      g = { loc, finisaj: cheie.finisaj, sistem, ral: cheie.ral, pachet: pachetPeLinie.get(l.id) ?? "", linii: [] };
      grupuri.push(g);
    }
    g.linii.push(l.id);
  };
  // intai piesele cu un singur sistem (ele fac grupurile), apoi piesele comune
  for (const l of liniiPluvial) {
    const sisteme = sistemeProdus(l.produs);
    if (sisteme.length === 1) grupPentru(l, sisteme[0]);
  }
  for (const l of liniiPluvial) {
    const sisteme = sistemeProdus(l.produs);
    if (sisteme.length === 1) continue;
    const cheie = cheieLinie(l);
    const existent = grupuri.find((g) => aceeasiCheie({ ral: g.ral, finisaj: g.finisaj }, { ral: cheie.ral, finisaj: cheie.finisaj }));
    if (existent) existent.linii.push(l.id);
    else grupPentru(l, sisteme[0]);
  }
  for (const g of grupuri) {
    const pachetId = pachete.find((p) => p.nume === g.pachet)?.id ?? null;
    const descriere = `pluvial ${finisajScurt(g.finisaj)} ${g.sistem} RAL ${numarRal(g.ral)} (${g.linii.length} poziții) pe locul „${finisajScurt(g.finisaj)} ${g.sistem}”`;
    const liber = formulare.find((f) => !f.locuri.has(g.loc) || f.locuri.get(g.loc) === g.ral);
    const locStructurat: LocPluvialFormular = { finisaj: g.finisaj, sistem: g.sistem, ral: g.ral, linii: [...g.linii] };
    if (liber) {
      liber.locuri.set(g.loc, g.ral);
      if (pachetId) adaugaPachet(liber, pachetId);
      liber.parti.push(descriere);
      liber.pluvial.push(locStructurat);
    } else {
      const f = formularNou(pachetId, `Formular doar cu pluvial (locul „${finisajScurt(g.finisaj)} ${g.sistem}” e ocupat de altă culoare pe formularele dinainte)`);
      f.locuri.set(g.loc, g.ral);
      f.parti.push(descriere);
      f.pluvial.push(locStructurat);
    }
  }

  // 5d. accesoriile la lungimi: foaia primului formular, oricate culori
  if (laLungimi.length > 0) {
    const f = primulFormular();
    f.parti.push(`accesorii speciale la lungimi pe foaia lor, cu culoarea pe rând (${laLungimi.length} rânduri)`);
    f.lungimi = laLungimi.map((l) => l.id);
  }

  // 5e. sipca: o varianta pe formular
  for (const p of pacheteSipca) {
    const sipca = (intrare.sipci ?? []).find((s) => linii.some((l) => l.sipca === s.id && p.linii.includes(l.id)));
    const varianta = [sipca?.model ?? "", p.cheie.finisaj, p.cheie.grosime ?? "", p.cheie.ral].map((x) => x.trim().toLowerCase()).join("|");
    const descriere = `blocul de șipcă ${p.id.replace(/^SIP/, "")} (${p.nume.replace(/^Șipcă \S+ — /, "")})`;
    // fara niciun formular (sipca singura): formularul fara invelitoare, cu blocul ei
    const liber = formulare.length === 0 ? primulFormular() : formulare.find((f) => f.variantaSipca === undefined || f.variantaSipca === varianta);
    if (liber) {
      liber.variantaSipca = varianta;
      if (sipca) liber.sipca = { id: sipca.id, linii: [...p.linii] };
      adaugaPachet(liber, p.id);
      liber.parti.push(descriere + (liber.nr > 1 ? " — primul formular fără șipcă" : ""));
    } else {
      const f = formularNou(p.id, `Formular doar cu ${descriere} (formularul Bilka acceptă o singură variantă de șipcă)`);
      f.variantaSipca = varianta;
      if (sipca) f.sipca = { id: sipca.id, linii: [...p.linii] };
    }
  }

  const rezultatFormulare: FormularBilka[] = formulare.map((f) => ({
    nr: f.nr,
    pachete: f.pachete,
    continut: f.parti.join(" + "),
    ...(f.invelitoarePrincipala ? { invelitoarePrincipala: f.invelitoarePrincipala } : {}),
    invelitoriSecundare: f.invelitoriSecundare,
    linii: f.linii,
    pluvial: f.pluvial,
    ...(f.sipca ? { sipca: f.sipca } : {}),
    lungimi: f.lungimi,
  }));
  const n = rezultatFormulare.length;
  const text =
    n === 0
      ? "Nu se generează niciun formular Bilka (oferta nu are produse pentru formular)."
      : `Se ${n === 1 ? "va genera 1 formular" : `vor genera ${n} formulare`} Bilka: ${rezultatFormulare.map((f) => `${f.nr}) ${f.continut}`).join("; ")}.`;

  return { pachete, formulare: rezultatFormulare, text, pachetPeLinie, avertizari };
}

// sistemele pluviale ale unui produs, din catalog: "125 / 90" -> ["125/90"];
// "125 / 90 și 150 / 100" (piesa comuna) -> ["125/90", "150/100"]; fara sistem -> ["125/90"]
export function sistemeProdus(produs: ProdusOferta): string[] {
  const text = (produs.sistem ?? "").toLowerCase();
  const gasite = [...text.matchAll(/(\d{2,3})\s*\/\s*(\d{2,3})/g)].map((m) => `${m[1]}/${m[2]}`);
  return gasite.length > 0 ? gasite : ["125/90"];
}

// locul de pe formular: finisaj x sistem ("mat|125/90")
export function locPluvial(finisaj: string, sistem: string): string {
  return `${finisajScurt(finisaj).toLowerCase()}|${sistem.replace(/\s/g, "")}`;
}
