import { locPluvial, numarRal, sistemeProdus } from "../../mot/pachete.js";
import { esteLinieInvelitoare, type RezultatOferta } from "../../mot/tipuri.js";
import type { OfertaCuProduse } from "../intrareMot.js";
import { normNume, type BlocInvelitoare, type HartaFormular } from "./sablon.js";
import type { ValoareCelula } from "./scrie.js";

// Continutul unui formular Bilka (S16b; FISA-OFERTARE 3.5, R10; FORMULAR-BILKA-HARTA
// §5-6): din pachetele si formularele motorului (sau din rezultatul salvat la
// "Comandat") -> valorile celulelor de intrare ale sablonului firmei. Produsul
// fara loc nu dispare: intra in avertizari ("Nu au loc in formularul Bilka: ...").
// Numele de pe randurile cu nume vin din tabela de corespondenta (Referinte),
// verificate pe listele sablonului incarcat; harta celulelor e cea derivata din sablon.

export interface Corespondenta {
  cheie: string;
  cuvant: string;
  numeFormular: string;
}

export interface DateProdus {
  modulCm: string | null;
  treapta: string | null;
}

export interface ScriereCelula {
  foaie: string;
  celula: string;
  valoare: ValoareCelula;
}

export interface FormularUmplut {
  nr: number;
  continut: string;
  scrieri: ScriereCelula[];
  avertizari: string[];
}

export interface IntrareUmplere {
  harta: HartaFormular;
  oferta: OfertaCuProduse;
  rezultat: RezultatOferta;
  corespondente: Corespondenta[];
  // date din catalog care nu sunt in snapshot-ul liniei: modulul tiglei, treapta
  produse: Map<string, DateProdus>;
  antet: { numarComplet: string; localitate: string | null; telefon: string | null };
}

type Invelitoare = OfertaCuProduse["invelitori"][number];
type Linie = OfertaCuProduse["linii"][number];

interface Cheie {
  ral: string;
  finisaj: string;
  grosime: string | null;
}

const faraDiacritice = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// potrivirea din tabela de corespondenta: codul intreg, apoi prefixul familiei (5);
// cuvantul de deosebire se cauta in contextele date, in ordinea lor (varianta de
// profil / modelul sipcii inaintea denumirii); la egalitate castiga cuvantul mai lung,
// iar randul fara cuvant e rezerva
export function numeDinCorespondenta(corespondente: Corespondenta[], cod: string, contexte: string[]): string | undefined {
  const ctx = contexte.map((c) => faraDiacritice(c ?? ""));
  const potrivite = (cheie: string) =>
    corespondente
      .filter((c) => c.cheie.toUpperCase() === cheie.toUpperCase())
      .map((c) => {
        const cuvant = faraDiacritice(c.cuvant.trim());
        const unde = cuvant === "" ? ctx.length : ctx.findIndex((t) => t !== "" && t.includes(cuvant));
        return { c, unde: unde < 0 ? -1 : unde };
      })
      .filter((x) => x.unde >= 0)
      .sort((a, b) => a.unde - b.unde || b.c.cuvant.length - a.c.cuvant.length);
  return (potrivite(cod)[0] ?? potrivite(cod.slice(0, 5))[0])?.c.numeFormular;
}

// finisajul din codul de ierarhie (pozitiile 6-8) sau din textul finisajului -> textul listei sablonului
export function finisajFormular(cod: string, finisajText: string | null | undefined, lista: string[]): string | undefined {
  const codF = cod.length >= 8 ? cod.slice(5, 8).toUpperCase() : "";
  const text = faraDiacritice(finisajText ?? "");
  const cauta = (pred: (n: string) => boolean) => lista.find((n) => pred(normNume(n)));
  if (/^\d{3}$/.test(codF)) {
    // "803" = RAL 8003 (Bilka scurteaza al doilea 0): comparam cifrele listei fara zeroul din mijloc
    const dupaCifre = cauta((n) => n.replace(/\D/g, "") === codF || n.replace(/\D/g, "").replace(/^(\d)0/, "$1") === codF);
    if (dupaCifre) return dupaCifre;
  } else if (/^[A-Z]{3}$/.test(codF)) {
    const prefix = codF === "ZN1" || codF === "ZN2" || codF === "ZNC" ? "ZINC" : codF === "SPX" ? "DPL" : codF === "MPX" ? "DPM" : codF === "WOD" ? "WOOD" : codF;
    const dupaCod = cauta((n) => n.startsWith(prefix));
    if (dupaCod) return dupaCod;
  }
  if (text.includes("dubluvopsit") && text.includes("lucios")) return cauta((n) => n === "DPL");
  if (text.includes("dubluvopsit") && text.includes("mat")) return cauta((n) => n === "DPM");
  if (text.includes("grande")) return cauta((n) => n === "GDM");
  if (text.includes("magnelis")) return cauta((n) => n.startsWith("MGN"));
  if (text.includes("zincat")) return cauta((n) => n.startsWith("ZINC"));
  if (text.includes("wood")) return cauta((n) => n === "WOOD");
  if (text.includes("8003")) return cauta((n) => n.includes("8003"));
  if (text.includes("lucios")) return cauta((n) => n === "LUCIOS");
  if (text.includes("mat")) return cauta((n) => n === "MAT");
  return undefined;
}

// grosimea din cod (pozitiile 9-11: "050" -> 0,50) sau din text ("0,50 mm") -> textul listei ("0.50")
export function grosimeFormular(cod: string, grosimeText: string | null | undefined, lista: string[]): string | undefined {
  const dinCod = /^\d{3}$/.test(cod.slice(8, 11)) ? Number(cod.slice(8, 11)) : 0;
  const dinText = Number((grosimeText ?? "").replace(",", ".").replace(/[^\d.]/g, ""));
  const tinta = dinCod > 0 ? dinCod / 100 : dinText;
  if (!(tinta > 0)) return undefined;
  return lista.find((g) => Math.abs(Number(String(g).replace(",", ".")) - tinta) < 0.001);
}

// culoarea: numarul RAL ca numar; ZINCAT / MGNL au textul lor din lista finisajului
function culoareFormular(ral: string, finisajForm: string | undefined, culoriFinisaj: string[]): ValoareCelula | undefined {
  const nr = numarRal(ral);
  if (/^\d{4}$/.test(nr)) return Number(nr);
  const f = normNume(finisajForm ?? "");
  if (f === "ZINCAT" || f === "MGNL") return culoriFinisaj[0];
  if (nr && culoriFinisaj.some((c) => normNume(c) === normNume(nr))) return culoriFinisaj.find((c) => normNume(c) === normNume(nr))!;
  if (!nr && culoriFinisaj.length === 1) return culoriFinisaj[0];
  return undefined;
}

const numar = (s: { toString(): string } | string | null | undefined): number => Number(String(s ?? "0").replace(",", "."));
const rotund = (n: number) => Math.round(n * 1000) / 1000;

function cheieInvelitoare(inv: Invelitoare): Cheie {
  return { ral: inv.culoare ?? "", finisaj: inv.finisaj ?? "", grosime: inv.grosime ?? null };
}

function cheieLinie(l: Linie, invelitori: Invelitoare[]): Cheie {
  const inv = l.invelitoareId ? invelitori.find((i) => i.id === l.invelitoareId) : undefined;
  if (inv) return cheieInvelitoare(inv);
  return { ral: l.culoareRal ?? "", finisaj: l.culoareFinisaj ?? l.finisaj ?? "", grosime: l.culoareGrosime ?? l.grosime ?? null };
}

const esteRubricaPluvial = (rubrica: string) => /pluvial/i.test(rubrica);
const esteRubricaLungimi = (rubrica: string) => /la lungimi|\(ML\)/i.test(rubrica);
const esteRubricaSpeciale = (rubrica: string) => /special/i.test(rubrica) && !esteRubricaLungimi(rubrica);

function treaptaLiniei(l: Linie, produse: Map<string, DateProdus>): string | undefined {
  const t = l.produsId ? produse.get(l.produsId)?.treapta : null;
  if (t) return t.toUpperCase();
  const m = /^A(?:SP|ML)(\d\d)/i.exec(l.cod);
  return m ? `D${m[1]}` : undefined;
}

// "pluvial mat 125/90 RAL 8017 (3 poziții) pe locul „mat 125/90”" -> locurile unui formular
function locuriDinText(continut: string): { loc: string; ral: string }[] {
  const out: { loc: string; ral: string }[] = [];
  for (const m of continut.matchAll(/pluvial (.+?) RAL (\S+) \(\d+ pozi/g)) {
    const parti = m[1].trim().split(/\s+/);
    const sistem = parti.pop() ?? "";
    out.push({ loc: locPluvial(parti.join(" "), sistem), ral: m[2] });
  }
  return out;
}

export function umpleFormulare(intrare: IntrareUmplere): FormularUmplut[] {
  const { harta, oferta, rezultat, corespondente, produse, antet } = intrare;
  const liste = harta.liste;
  const linieDupaId = new Map(oferta.linii.map((l) => [l.id, l]));
  const sipcaPeLinie = new Map(oferta.sipci.map((s) => [s.linieId, s]));
  const calcDupaId = new Map(rezultat.linii.map((c) => [c.id, c]));
  const cantitateLiniei = (l: Linie) => numar(calcDupaId.get(l.id)?.cantitate ?? l.cantitate);
  const formulareLiniilorPluvial = pluvialPeFormulare(oferta, rezultat);
  const liniiLungimi = oferta.linii.filter((l) => esteRubricaLungimi(l.rubrica));

  return rezultat.formulareBilka.map((f) => {
    const scrieri = new Map<string, ValoareCelula>();
    const avertizari: string[] = [];
    const faraLoc: string[] = [];
    const pune = (foaie: string, celula: string, valoare: ValoareCelula) => scrieri.set(`${foaie}\n${celula}`, valoare);
    const comanda = harta.foaie.comanda;

    // 0. golirea celulelor de intrare (valorile vechi din sablon)
    for (const b of [harta.principala, harta.secundara, harta.sipca]) {
      for (const c of [b.tip, b.model, b.modul, b.membrana, b.finisaj, b.culoare, b.grosime]) if (c) pune(comanda, c, null);
      for (const s of b.sloturi) {
        pune(comanda, s.lungime, null);
        pune(comanda, s.coli, null);
      }
    }
    for (const r of harta.accesorii) pune(comanda, `${r.coloanaCantitate}${r.rand}`, null);
    for (const p of harta.pluvial.values()) pune(p.foaie, p.celulaCantitate, null);
    for (const b of Object.values(harta.blocuriPluvial)) if (b.celulaCuloare) pune(b.foaie, b.celulaCuloare, null);
    for (const rand of harta.speciale.randuri) for (const col of Object.values(harta.speciale.coloane)) pune(harta.speciale.foaie, `${col}${rand}`, null);
    for (const c of Object.values(harta.antet)) pune(comanda, c, null);

    // 1. antetul: numarul ofertei, localitatea lucrarii, telefonul clientului; mesajul de productie ramane al agentului
    pune(comanda, harta.antet.numarOferta, antet.numarComplet);
    if (antet.localitate) pune(comanda, harta.antet.localitate, antet.localitate);
    if (antet.telefon) pune(comanda, harta.antet.telefon, antet.telefon);

    // 2. pachetele si liniile formularului
    const pachete = rezultat.pachete.filter((p) => f.pachete.includes(p.id));
    const pachetPrincipal = pachete.find((p) => p.tip === "invelitoare" && p.invelitoarePrincipala);
    const idLinii = new Set<string>();
    for (const p of pachete) {
      if (p.tip === "pluvial") continue;
      for (const id of p.linii) idLinii.add(id);
    }
    for (const [id, nr] of formulareLiniilorPluvial) if (nr === f.nr) idLinii.add(id);
    const linii = [...idLinii].map((id) => linieDupaId.get(id)).filter((l): l is Linie => l !== undefined);

    // 3. cheia formularului: a invelitorii principale sau a primului pachet (formular fara invelitoare)
    const principala = pachetPrincipal ? oferta.invelitori.find((i) => i.id === pachetPrincipal.invelitoarePrincipala) : undefined;
    // formular fara invelitoare: cheia primului pachet, dupa text (fara cod de ierarhie)
    const cheieFormular: Cheie = principala ? cheieInvelitoare(principala) : { ral: pachete[0]?.cheie.ral ?? "", finisaj: pachete[0]?.cheie.finisaj ?? "", grosime: pachete[0]?.cheie.grosime ?? null };
    const codCheie = principala?.cod ?? "";

    const scrieBlocInvelitoare = (bloc: BlocInvelitoare, inv: Invelitoare | undefined, cheie: Cheie, cod: string, eticheta: string, cuModel: boolean) => {
      const finisaj = finisajFormular(cod, cheie.finisaj, liste.finisaje);
      if (finisaj) pune(comanda, bloc.finisaj, finisaj);
      else avertizari.push(`${eticheta}: finisajul „${cheie.finisaj}” nu are corespondent în listele șablonului`);
      const grosime = grosimeFormular(cod, cheie.grosime, liste.grosimi);
      if (grosime) pune(comanda, bloc.grosime, grosime);
      else if (cheie.grosime) avertizari.push(`${eticheta}: grosimea „${cheie.grosime}” nu e în lista șablonului`);
      const culoare = culoareFormular(cheie.ral, finisaj, finisaj ? liste.culoriPeFinisaj(finisaj) : []);
      if (culoare !== undefined) pune(comanda, bloc.culoare, culoare);
      else if (cheie.ral || finisaj) avertizari.push(`${eticheta}: culoarea „${cheie.ral}” nu se poate scrie pe formular`);
      if (!cuModel || !inv) return;
      // modelul (tabela de corespondenta), tipul, modulul, membrana
      // doar varianta de profil, optiunea si unitatea: denumirea familiei insira toate
      // variantele ("Retro Plus (Standard, Micro-Ribs, Flat, Double Line)") si ar alege gresit
      let model = numeDinCorespondenta(corespondente, inv.cod, [inv.variantaProfil ?? "", inv.optiune ?? "", inv.um]);
      if (!model) {
        avertizari.push(`${eticheta}: produsul ${inv.cod} (${inv.denumire}) nu are corespondență în tabela „Formular Bilka” din Referințe`);
      } else {
        if (/^T \d+$/.test(model)) model = `${model} ${inv.montaj === "perete" ? "P" : "A"}`;
        const tip = [...liste.modelePeTip.entries()].find(([, modele]) => modele.some((m) => normNume(m) === normNume(model!)))?.[0];
        if (!tip) avertizari.push(`${eticheta}: modelul „${model}” nu e în listele de modele ale șablonului`);
        else {
          if (bloc.tip) pune(comanda, bloc.tip, tip);
          const exact = liste.modelePeTip.get(tip)!.find((m) => normNume(m) === normNume(model!))!;
          pune(comanda, bloc.model, exact);
          if (bloc.modul) {
            const module = liste.modulePeModel(exact);
            if (module.length > 0) {
              const modulCm = Number(String(inv.produsId ? (produse.get(inv.produsId)?.modulCm ?? "") : "").replace(",", "."));
              const gasit = modulCm > 0 ? module.find((m) => Math.abs(Number(m.replace(/[^\d.,]/g, "").replace(",", ".")) - modulCm) < 0.01) : undefined;
              if (gasit) pune(comanda, bloc.modul, gasit);
              else avertizari.push(`${eticheta}: modulul ${modulCm > 0 ? `${modulCm} cm` : "(lipsă în catalog)"} nu e în lista șablonului (${module.join(", ")})`);
            }
          }
          if (bloc.membrana && liste.membrane.length > 0) {
            const optiune = faraDiacritice(inv.optiune ?? "");
            const vrea = optiune.includes("soundcontrol") ? "CU SOUNDCONTROL" : optiune.includes("dripstop") || /^TD/i.test(inv.cod) ? "CU DRIPSTOP" : "FARA MEMBRANA";
            const m = liste.membrane.find((x) => normNume(x) === vrea);
            if (m) pune(comanda, bloc.membrana, m);
          }
        }
      }
      // lungimile x coli
      const panotaj = inv.panotaj;
      if (panotaj.length === 0) avertizari.push(`${eticheta}: nu are lungimi × bucăți (doar suprafață în mp) — lungimile se completează în Excel`);
      panotaj.slice(0, bloc.sloturi.length).forEach((p, k) => {
        pune(comanda, bloc.sloturi[k].lungime, rotund(numar(p.lungimeM)));
        pune(comanda, bloc.sloturi[k].coli, p.bucati);
      });
      if (panotaj.length > bloc.sloturi.length) avertizari.push(`${eticheta}: ${panotaj.length} lungimi, formularul are ${bloc.sloturi.length} sloturi — ultimele ${panotaj.length - bloc.sloturi.length} nu au intrat`);
    };

    scrieBlocInvelitoare(harta.principala, principala, cheieFormular, codCheie, "Învelitoarea principală", Boolean(principala));
    const secundare = (pachetPrincipal?.invelitoriSecundare ?? []).map((id) => oferta.invelitori.find((i) => i.id === id)).filter((i): i is Invelitoare => i !== undefined);
    if (secundare[0]) scrieBlocInvelitoare(harta.secundara, secundare[0], cheieInvelitoare(secundare[0]), secundare[0].cod, "Învelitoarea secundară", true);
    for (const s of secundare.slice(1)) faraLoc.push(`${s.denumire} (a ${secundare.indexOf(s) + 1}-a învelitoare secundară; formularul are un singur loc)`);

    // 4. liniile: tinichigerie / auxiliare pe randurile cu nume, speciale 2 ML pe treapta, pluvial, sipca, lungimi
    const randuriFolosite = new Set<string>();
    const plaseaza = (nume: string, cantitate: number, descriere: string) => {
      const k = normNume(nume);
      const exact = harta.numeAcceptate.get(k);
      if (!exact) {
        faraLoc.push(`${descriere} — numele „${nume}” nu există în șablonul firmei`);
        return;
      }
      const libere = harta.accesorii.filter((r) => !randuriFolosite.has(`${r.coloanaNume}${r.rand}`));
      const rand = libere.find((r) => normNume(r.numeImplicit) === k) ?? libere.find((r) => r.numeImplicit === "" && r.lista.includes(k)) ?? libere.find((r) => r.lista.includes(k));
      if (!rand) {
        faraLoc.push(`${descriere} — niciun rând liber pentru „${exact}”`);
        return;
      }
      randuriFolosite.add(`${rand.coloanaNume}${rand.rand}`);
      if (normNume(rand.numeImplicit) !== k) pune(comanda, `${rand.coloanaNume}${rand.rand}`, exact);
      pune(comanda, `${rand.coloanaCantitate}${rand.rand}`, cantitate);
    };
    const culoriBloc = new Map<string, string>();
    const blocuriSipca: Linie[] = [];
    for (const l of linii) {
      if (esteLinieInvelitoare(l.rubrica)) continue;
      const descriere = `${l.denumire} (${l.cod})`;
      if (sipcaPeLinie.has(l.id)) {
        blocuriSipca.push(l);
        continue;
      }
      if (esteRubricaLungimi(l.rubrica)) continue; // foaia lor, pe primul formular (mai jos)
      const cantitate = rotund(cantitateLiniei(l));
      if (esteRubricaPluvial(l.rubrica)) {
        const loc = harta.pluvial.get(l.cod.toUpperCase());
        if (!loc) {
          faraLoc.push(`${descriere} — pluvialul acesta nu are foaie în formular`);
          continue;
        }
        pune(loc.foaie, loc.celulaCantitate, cantitate);
        const bloc = harta.blocuriPluvial[loc.bloc];
        if (bloc.celulaCuloare) {
          const ral = numarRal(cheieLinie(l, oferta.invelitori).ral);
          const culoare = bloc.culori.find((c) => c.ral === ral);
          if (!culoare) avertizari.push(`${descriere}: culoarea RAL ${ral} nu e în lista de culori a blocului de pluvial din șablon — se alege în Excel`);
          else {
            const pusa = culoriBloc.get(loc.bloc);
            if (pusa && pusa !== culoare.text) avertizari.push(`${descriere}: blocul de pluvial are deja culoarea „${pusa}”; RAL ${ral} nu încape pe acest formular`);
            else {
              culoriBloc.set(loc.bloc, culoare.text);
              pune(bloc.foaie, bloc.celulaCuloare, culoare.text);
            }
          }
        }
        continue;
      }
      if (esteRubricaSpeciale(l.rubrica)) {
        const treapta = treaptaLiniei(l, produse);
        if (!treapta) faraLoc.push(`${descriere} — fără treaptă D01–D25`);
        else plaseaza(`ACCESORIU SPECIAL ${treapta}`, cantitate, descriere);
        continue;
      }
      const cheie = cheieLinie(l, oferta.invelitori);
      let nume = numeDinCorespondenta(corespondente, l.cod, [l.optiune ?? "", l.um, l.denumire, l.familie ?? ""]);
      if (!nume) {
        faraLoc.push(`${descriere} — fără corespondență în tabela „Formular Bilka” din Referințe`);
        continue;
      }
      if (nume.includes("{RAL}")) nume = nume.replace("{RAL}", numarRal(cheie.ral));
      plaseaza(nume, cantitate, descriere);
    }

    // 5. accesoriile la lungimi: foaia lor, pe primul formular, un rand per pozitie
    if (f.nr === 1 && liniiLungimi.length > 0) {
      const randuri = [...harta.speciale.randuri];
      const col = harta.speciale.coloane;
      for (const l of liniiLungimi) {
        const descriere = `${l.denumire} (${l.cod})`;
        const treapta = treaptaLiniei(l, produse);
        if (!treapta) {
          faraLoc.push(`${descriere} — fără treaptă D01–D25`);
          continue;
        }
        const cheie = cheieLinie(l, oferta.invelitori);
        const finisaj = finisajFormular(l.cod, cheie.finisaj, liste.finisaje);
        const grosime = grosimeFormular(l.cod, cheie.grosime, liste.grosimi);
        const culoare = culoareFormular(cheie.ral, finisaj, finisaj ? liste.culoriPeFinisaj(finisaj) : []);
        const pozitii = l.pozitii.length > 0 ? l.pozitii : null;
        if (!pozitii) {
          faraLoc.push(`${descriere} — fără lungime × bucăți`);
          continue;
        }
        for (const p of pozitii) {
          const rand = randuri.shift();
          if (rand === undefined) {
            faraLoc.push(`${descriere} ${p.lungimeM} m × ${p.bucati} — foaia de accesorii speciale e plină (${harta.speciale.randuri.length} rânduri)`);
            continue;
          }
          const foaie = harta.speciale.foaie;
          pune(foaie, `${col.cod}${rand}`, `ACCESORIU SPECIAL ${treapta}`);
          if (finisaj) pune(foaie, `${col.finisaj}${rand}`, finisaj);
          if (culoare !== undefined) pune(foaie, `${col.culoare}${rand}`, culoare);
          if (grosime) pune(foaie, `${col.grosime}${rand}`, grosime);
          pune(foaie, `${col.lungime}${rand}`, rotund(numar(p.lungimeM)));
          pune(foaie, `${col.bucati}${rand}`, p.bucati);
        }
      }
    }

    // 6. blocul de sipca: o varianta pe formular
    if (blocuriSipca.length > 0) {
      const ids = [...new Set(blocuriSipca.map((l) => sipcaPeLinie.get(l.id)!.id))];
      for (const extra of ids.slice(1)) faraLoc.push(`a doua rubrică de șipcă (${oferta.sipci.find((s) => s.id === extra)?.model ?? extra}) pe același formular — formularul are un singur bloc de șipcă`);
      const sipca = oferta.sipci.find((s) => s.id === ids[0]);
      const linie = blocuriSipca.find((l) => sipcaPeLinie.get(l.id)!.id === ids[0])!;
      if (sipca) {
        const bloc = harta.sipca;
        const cheie: Cheie = { ral: sipca.culoare ?? cheieLinie(linie, oferta.invelitori).ral, finisaj: linie.finisaj ?? "", grosime: linie.grosime ?? null };
        const eticheta = "Șipca";
        const finisaj = finisajFormular(linie.cod, cheie.finisaj, liste.finisaje);
        if (finisaj) pune(comanda, bloc.finisaj, finisaj);
        else avertizari.push(`${eticheta}: finisajul „${cheie.finisaj}” nu are corespondent în listele șablonului`);
        const grosime = grosimeFormular(linie.cod, cheie.grosime, liste.grosimi);
        if (grosime) pune(comanda, bloc.grosime, grosime);
        const culoare = culoareFormular(cheie.ral, finisaj, finisaj ? liste.culoriPeFinisaj(finisaj) : []);
        if (culoare !== undefined) pune(comanda, bloc.culoare, culoare);
        else avertizari.push(`${eticheta}: culoarea „${cheie.ral}” nu se poate scrie pe formular`);
        const model = numeDinCorespondenta(corespondente, linie.cod, [sipca.model, linie.denumire]);
        const exact = model ? liste.modeleSipca.find((m) => normNume(m) === normNume(model)) : undefined;
        if (!model) avertizari.push(`${eticheta}: produsul ${linie.cod} (${sipca.model}) nu are corespondență în tabela „Formular Bilka”`);
        else if (!exact) avertizari.push(`${eticheta}: modelul „${model}” nu e în lista de modele de șipcă a șablonului`);
        else pune(comanda, bloc.model, exact);
        let pozitii: { lungimeM: number; bucati: number }[];
        if (sipca.varianta === "CALCUL") {
          const calc = rezultat.cantitati.sipci.find((s) => s.id === sipca.id);
          pozitii = (calc?.tronsoane ?? []).map((t, k) => ({ lungimeM: numar(sipca.tronsoane[k]?.lungimeSipcaM ?? (t.bucati > 0 ? numar(t.ml) / t.bucati : 0)), bucati: t.bucati }));
        } else {
          pozitii = linie.pozitii.map((p) => ({ lungimeM: numar(p.lungimeM), bucati: p.bucati }));
        }
        pozitii.slice(0, bloc.sloturi.length).forEach((p, k) => {
          pune(comanda, bloc.sloturi[k].lungime, rotund(p.lungimeM));
          pune(comanda, bloc.sloturi[k].coli, p.bucati);
        });
        if (pozitii.length > bloc.sloturi.length) avertizari.push(`${eticheta}: ${pozitii.length} lungimi, formularul are ${bloc.sloturi.length} sloturi`);
        if (pozitii.length === 0) avertizari.push(`${eticheta}: fără lungimi × bucăți`);
      }
    }

    if (faraLoc.length > 0) avertizari.unshift(`Nu au loc în formularul Bilka: ${faraLoc.join("; ")}`);
    return {
      nr: f.nr,
      continut: f.continut,
      scrieri: [...scrieri.entries()].map(([k, valoare]) => {
        const [foaie, celula] = k.split("\n");
        return { foaie, celula, valoare };
      }),
      avertizari,
    };
  });
}

// pe ce formular merge fiecare linie de pluvial (R10): pachetul de pluvial care e pe un
// singur formular isi duce toate liniile acolo; cand e pe mai multe (locul 125/90 si
// 150/100 pe formulare diferite), liniile se impart dupa locurile scrise de motor in
// continutul formularului - piesele comune urmeaza grupul finisajului si culorii lor
function pluvialPeFormulare(oferta: OfertaCuProduse, rezultat: RezultatOferta): Map<string, number> {
  const out = new Map<string, number>();
  const linieDupaId = new Map(oferta.linii.map((l) => [l.id, l]));
  for (const p of rezultat.pachete.filter((x) => x.tip === "pluvial")) {
    const formulare = rezultat.formulareBilka.filter((f) => f.pachete.includes(p.id));
    if (formulare.length === 0) continue;
    if (formulare.length === 1) {
      for (const id of p.linii) out.set(id, formulare[0].nr);
      continue;
    }
    const locuri = formulare.flatMap((f) => locuriDinText(f.continut).map((x) => ({ ...x, nr: f.nr })));
    // locul fiecarei linii: piesele cu un singur sistem fac grupurile, cele comune urmeaza
    // primul grup existent cu acelasi finisaj si aceeasi culoare
    const linii = p.linii.map((id) => linieDupaId.get(id)).filter((l): l is Linie => l !== undefined);
    const ral = numarRal(p.cheie.ral);
    const locLinie = (l: Linie, sistem: string) => locPluvial(l.culoareFinisaj ?? l.finisaj ?? p.cheie.finisaj, sistem);
    const grupuri: string[] = [];
    const locuriLinii = new Map<string, string>();
    for (const l of linii) {
      const sisteme = sistemeProdus({ cod: l.cod, denumire: l.denumire, um: l.um, pretBazaEur: "0", sistem: l.sistem ?? undefined });
      if (sisteme.length !== 1) continue;
      const loc = locLinie(l, sisteme[0]);
      if (!grupuri.includes(loc)) grupuri.push(loc);
      locuriLinii.set(l.id, loc);
    }
    for (const l of linii) {
      if (locuriLinii.has(l.id)) continue;
      const sisteme = sistemeProdus({ cod: l.cod, denumire: l.denumire, um: l.um, pretBazaEur: "0", sistem: l.sistem ?? undefined });
      locuriLinii.set(l.id, grupuri[0] ?? locLinie(l, sisteme[0]));
    }
    for (const l of linii) {
      const loc = locuriLinii.get(l.id)!;
      const gasit = locuri.find((x) => x.loc === loc && numarRal(x.ral) === ral) ?? locuri.find((x) => x.loc === loc);
      out.set(l.id, gasit?.nr ?? formulare[0].nr);
    }
  }
  return out;
}
