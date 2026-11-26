import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { createPortal } from "react-dom";
import { apiCatalogEditor, apiProduseOferta, EroareCerere, type OfertaDetaliu, type ProdusEditor, type ReferinteEditor, type StructuraOferta } from "../../api";
import { Ajutor, Mesaj, textEroare } from "../../components/ui";
import { BandaRubrica, BaraRubrici, RezultatPeScurt } from "./Benzi";
import { Invelitori } from "./Invelitori";
import { Lungimi } from "./Lungimi";
import { Pluvial } from "./Pluvial";
import { Rubrica } from "./Rubrica";
import { Sipca } from "./Sipca";
import { Speciale2ML } from "./Speciale2ML";
import { ZonaB } from "./ZonaB";
import { catalogulLiniilor, categorieInvelitoare, idurileLiniilor, RUBRICI, spreServer, stareDinOferta, stareGoala, type StareEditor } from "./editor";
import type { StareSalvareProduse } from "./file";
import { problemaDinRefuz, problemeEditor, type Problema } from "./probleme";
import { idRubricaPeEcran, numarPeRubrici, rezumatRubrica, RUBRICI_BARA, type IdRubrica } from "./rubrici";
import { navigheazaTastatura } from "./tastatura";

// Zona produselor din pagina ofertei (FISA-OFERTARE cap. 3-10): rubricile in
// ordinea decisa, salvare automata la fiecare modificare (fara buton), rezultatul
// motorului pe loc - doar cantitati si structura, fara preturi (S14).
//
// S29 (MODIFICAREA M12): zona produselor e fila "Produse" a paginii ofertei. Rubricile raman cele de pana
// acum, cu lista lor intreaga, toate deschise la intrarea in oferta; fiecare se strange / deschide cu un clic
// pe banda ei (doar pentru ochi). Bara de rubrici sta in randurile fixe ale paginii ("slotBara"). Starea
// salvarii se arata in randul ofertei ("onStareSalvare"), iar "Salvează" de acolo forteaza salvarea aflata in
// asteptare ("salvareAcum"). Rezultatul intreg al motorului e in fila "Preturi si documente"; aici, jos, pe scurt.

export type Catalog = { invelitori: ProdusEditor[]; ref: ReferinteEditor };

type Props = {
  oferta: OfertaDetaliu;
  onOferta: (o: OfertaDetaliu) => void;
  mentiuni?: string;
  // fila e la vedere (bara de rubrici se arata doar atunci)
  activa?: boolean;
  slotBara?: HTMLElement | null;
  onStareSalvare?: (s: StareSalvareProduse) => void;
  // S29b: trimite pe loc ce e nesalvat si intoarce ce opreste (refuzul salvarii sau un rand incomplet); null = totul e in oferta
  salvareAcum?: MutableRefObject<(() => Promise<Problema | null>) | null>;
  // S29b: ce e de corectat acum (refuzul salvarii, primul rand incomplet) - pentru randul ofertei si avertizarea la plecare
  onProbleme?: (p: { refuz: Problema | null; incomplet: Problema | null }) => void;
  // S29b: duce la randul cu problema (deschide rubrica daca era stransa, pune cursorul in casuta)
  duLaProblema?: MutableRefObject<((p: Problema) => void) | null>;
  onMergiLaPreturi?: () => void;
};

export function Produse({ oferta, onOferta, mentiuni = "", activa = true, slotBara = null, onStareSalvare, salvareAcum, onProbleme, duLaProblema, onMergiLaPreturi }: Props) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [stare, setStare] = useState<StareEditor | null>(null);
  const [salvare, setSalvare] = useState<StareSalvareProduse>("salvat");
  const [eroare, setEroare] = useState<string | null>(null);
  // S29b: salvarea refuzata, cu randul ei (cat tine, nimic din ce se scrie nu ajunge in oferta)
  const [refuz, setRefuz] = useState<Problema | null>(null);
  // oferta a carei stare e pe ecran (la trecerea de la o oferta la alta, starea veche nu se trimite celei noi)
  const idStare = useRef<string | null>(null);
  const [structura, setStructura] = useState<{ rezultat: StructuraOferta | null; eroare: string | null } | null>(oferta.structura ?? null);
  // S29 (M12): rubricile stranse - se tin minte cat lucrezi la oferta; la redeschidere toate sunt deschise
  const [stranse, setStranse] = useState<ReadonlySet<IdRubrica>>(new Set());
  const [rubricaActiva, setRubricaActiva] = useState<IdRubrica | null>(null);
  // S29b (BUG-24 b): linia salvata a fiecarei linii de pe ecran (cheia de pe ecran -> id-ul din oferta salvata);
  // dupa ea isi citeste fiecare pozitie metrii ei din rezultatul motorului, nu dupa codul produsului
  const [iduri, setIduri] = useState<Map<string, string>>(new Map());
  const ultimaTrimisa = useRef<string>("");
  const temporizator = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ofertaId = oferta.id;

  // cataloagele (o singura data) si starea din oferta salvata
  useEffect(() => {
    let activ = true;
    setStranse(new Set());
    Promise.all([apiCatalogEditor.invelitori(), apiCatalogEditor.referinte()])
      .then(([inv, ref]) => {
        if (!activ) return;
        const c = { invelitori: inv.produse, ref };
        setCatalog(c);
        // S29b: produsele din catalog ale liniilor vin odata cu oferta (treapta, sistemul, culorile lor)
        const s = oferta.invelitori.length || oferta.linii.length || (oferta.randuriGoale?.length ?? 0) > 0 ? stareDinOferta(oferta, inv.produse, catalogulLiniilor(oferta)) : stareGoala();
        setStare(s);
        idStare.current = oferta.id;
        setRefuz(null);
        setIduri(new Map(s.linii.flatMap((l) => (l.idSalvat ? [[l.cheie, l.idSalvat] as [string, string]] : []))));
        ultimaTrimisa.current = JSON.stringify(spreServer(s));
      })
      .catch((e) => setEroare(textEroare(e)));
    return () => {
      activ = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ofertaId]);

  // trimiterea starii spre server (aceeasi pentru salvarea automata si pentru "Salvează" din randul ofertei)
  // S29b: intoarce refuzul (cu randul lui) sau null cand starea e in oferta. Salvarile pleaca una dupa alta
  // ("coada"): cea ceruta cat alta e pe drum o asteapta pe aceea, ca o stare mai veche sa nu ajunga ultima.
  const coada = useRef<Promise<unknown>>(Promise.resolve());
  const trimite = (s: StareEditor): Promise<Problema | null> => {
    const rezultat = coada.current.then(() => trimiteAcum(s));
    coada.current = rezultat.catch(() => null);
    return rezultat;
  };
  const trimiteAcum = async (s: StareEditor): Promise<Problema | null> => {
    const text = JSON.stringify(spreServer(s));
    if (text === ultimaTrimisa.current) return null;
    const corp = { ...spreServer(s), ...(mentiuni.trim() ? { mentiuni: mentiuni.trim() } : {}) };
    setSalvare("se-salveaza");
    try {
      const { oferta: dupa } = await apiProduseOferta.salveaza(oferta.id, corp);
      ultimaTrimisa.current = text;
      setIduri(idurileLiniilor(corp.linii.map((l) => l.cheie), dupa.linii as { id: string; rubrica: string }[]));
      setStructura(dupa.structura ?? null);
      onOferta(dupa);
      setSalvare("salvat");
      setEroare(null);
      setRefuz(null);
      return null;
    } catch (e) {
      // randul cu problema: cel gasit pe ecran dupa regulile serverului; altfel campul din raspunsul serverului
      const p = problemeEditor(s).find((x) => x.fel === "refuz") ?? problemaDinRefuz(s, e instanceof EroareCerere ? e.campuri[0]?.camp : undefined, textEroare(e));
      setSalvare("eroare");
      setEroare(textEroare(e));
      setRefuz(p);
      return p;
    }
  };

  // salvarea automata: la fiecare modificare, cu o scurta intarziere
  useEffect(() => {
    if (!stare || !oferta.poateModifica) return;
    const text = JSON.stringify(spreServer(stare));
    if (text === ultimaTrimisa.current) {
      // S29b: ecranul e din nou exact ce e in oferta (o modificare anulata sau randul gresit golit): nu mai e
      // nimic de salvat si nimic refuzat - starea nu ramane pe „nesalvat” / „NU e salvată”
      setSalvare((v) => (v === "modificat" || v === "eroare" ? "salvat" : v));
      setEroare(null);
      setRefuz(null);
      return;
    }
    setSalvare("modificat");
    temporizator.current = setTimeout(() => {
      temporizator.current = null;
      void trimite(stare);
    }, 600);
    return () => {
      if (temporizator.current) clearTimeout(temporizator.current);
      temporizator.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stare]);

  // "Salvează" din randul ofertei: ce astepta sa se salveze pleaca acum
  const stareCurenta = useRef<StareEditor | null>(null);
  stareCurenta.current = stare;
  const trimiteCurent = useRef(trimite);
  trimiteCurent.current = trimite;
  useEffect(() => {
    if (!salvareAcum) return;
    salvareAcum.current = async () => {
      if (temporizator.current) clearTimeout(temporizator.current);
      temporizator.current = null;
      const s = stareCurenta.current;
      if (!s || !oferta.poateModifica) return null;
      const refuzat = await trimiteCurent.current(s);
      // un rand incomplet nu pleaca spre server, deci nu opreste salvarea - dar nu e in oferta
      return refuzat ?? problemeEditor(s).find((x) => x.fel === "incomplet") ?? null;
    };
    return () => {
      salvareAcum.current = null;
    };
  }, [salvareAcum, oferta.poateModifica]);

  useEffect(() => {
    onStareSalvare?.(salvare);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salvare]);

  // S29b: ce e de corectat acum, spre randul ofertei (refuzul) si spre avertizarea la plecare (randul incomplet)
  const incomplet = useMemo(() => (stare && oferta.poateModifica ? (problemeEditor(stare).find((x) => x.fel === "incomplet") ?? null) : null), [stare, oferta.poateModifica]);
  useEffect(() => {
    onProbleme?.({ refuz: salvare === "eroare" ? refuz : null, incomplet });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salvare, refuz, incomplet]);

  // S29b: la parasirea paginii, ce astepta salvarea automata pleaca spre server (pana acum se pierdea)
  const poateCurent = useRef(oferta.poateModifica);
  poateCurent.current = oferta.poateModifica;
  const idCurent = useRef(oferta.id);
  idCurent.current = oferta.id;
  useEffect(
    () => () => {
      const s = stareCurenta.current;
      if (s && poateCurent.current && idStare.current === idCurent.current) void trimiteCurent.current(s);
    },
    [],
  );

  // rubrica de sus (pentru bara de rubrici): cea mai de jos rubrica al carei inceput a trecut de randurile fixe
  const incarcat = stare !== null;
  useEffect(() => {
    if (!activa) return;
    let cadru = 0;
    const masoara = () => {
      cadru = 0;
      const prag = (document.querySelector<HTMLElement>(".oferta-fix")?.getBoundingClientRect().bottom ?? 0) + 12;
      let gasita: IdRubrica | null = null;
      for (const r of RUBRICI_BARA) {
        const el = document.getElementById(idRubricaPeEcran(r.id));
        if (el && el.getBoundingClientRect().top <= prag) gasita = r.id;
      }
      setRubricaActiva(gasita);
    };
    const laDerulare = () => {
      if (!cadru) cadru = requestAnimationFrame(masoara);
    };
    window.addEventListener("scroll", laDerulare, { passive: true });
    masoara();
    return () => {
      window.removeEventListener("scroll", laDerulare);
      if (cadru) cancelAnimationFrame(cadru);
    };
  }, [activa, incarcat]);

  const principala = stare?.invelitori[0] ?? null;
  const produsPrincipal = useMemo(() => (catalog && principala?.produsId ? (catalog.invelitori.find((p) => p.id === principala.produsId) ?? null) : null), [catalog, principala?.produsId]);
  const categoriiListe = useMemo(() => [...new Set(catalog?.ref.categoriiListe.map((c) => c.categorieInvelitoare) ?? [])], [catalog]);
  const categoriePrincipala = categorieInvelitoare(produsPrincipal, categoriiListe);

  if (eroare && !stare) return <Mesaj tip="eroare">{eroare}</Mesaj>;
  if (!catalog || !stare) return <p className="text-secundar">Se încarcă catalogul…</p>;

  const poate = oferta.poateModifica;
  const set = (schimba: (s: StareEditor) => StareEditor) => setStare((s) => (s ? schimba(s) : s));
  const rezultat = structura?.rezultat ?? null;
  const comuta = (id: IdRubrica) =>
    setStranse((v) => {
      const nou = new Set(v);
      if (nou.has(id)) nou.delete(id);
      else nou.add(id);
      return nou;
    });
  // saltul din bara: rubrica se deschide (daca era stransa) si vine sub randurile fixe
  const sariLa = (id: IdRubrica) => {
    setStranse((v) => {
      if (!v.has(id)) return v;
      const nou = new Set(v);
      nou.delete(id);
      return nou;
    });
    requestAnimationFrame(() => document.getElementById(idRubricaPeEcran(id))?.scrollIntoView({ block: "start" }));
  };
  // S29b: la randul cu problema - rubrica se deschide, randul vine in mijlocul ecranului, cursorul in casuta lui
  if (duLaProblema)
    duLaProblema.current = (p: Problema) => {
      if (p.rubrica) {
        const rubrica = p.rubrica;
        setStranse((v) => {
          if (!v.has(rubrica)) return v;
          const nou = new Set(v);
          nou.delete(rubrica);
          return nou;
        });
      }
      requestAnimationFrame(() => {
        const zona = p.rubrica ? document.getElementById(idRubricaPeEcran(p.rubrica)) : document.querySelector<HTMLElement>(".zona-produse");
        const tinta = (p.selector ? document.querySelector<HTMLElement>(p.selector) : null) ?? zona?.querySelector<HTMLElement>(".casuta-cantitate.neterminata, .cu-problema") ?? null;
        if (!tinta) {
          zona?.scrollIntoView({ block: "start" });
          return;
        }
        tinta.scrollIntoView({ block: "center" });
        tinta.focus({ preventScroll: true });
        const rand = tinta.closest<HTMLElement>("tr, .bi-pozitie, .camp") ?? tinta;
        rand.classList.add("dus-aici");
        setTimeout(() => rand.classList.remove("dus-aici"), 2600);
      });
    };
  const banda = (id: IdRubrica) => ({ id, stransa: stranse.has(id), onComuta: () => comuta(id), rezumat: rezumatRubrica(id, stare, rezultat) });

  return (
    <div className="zona-produse" onKeyDown={navigheazaTastatura}>
      {activa && slotBara && createPortal(<BaraRubrici numere={numarPeRubrici(stare)} activa={rubricaActiva} onSalt={sariLa} />, slotBara)}
      <div className="cap-produse">
        <label className="camp" style={{ gridTemplateColumns: "auto auto", alignItems: "center", gap: 8 }} title="Grupă (adaos discret, 11.3)">
          <span className="mic text-secundar">Grupă %</span>
          <input type="text" inputMode="decimal" value={stare.grupaPct} onChange={(e) => set((s) => ({ ...s, grupaPct: e.target.value }))} disabled={!poate} style={{ width: 70 }} aria-label="Grupă %" />
        </label>
      </div>
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      {!poate && <Mesaj>{oferta.status === "COMANDAT" ? "Oferta e comandată: produsele, cantitățile și prețurile sunt înghețate (orice material în plus = completare)." : "Oferta se poate modifica doar de cine a făcut-o și de Administratorul firmei."}</Mesaj>}

      <BandaRubrica {...banda("invelitori")}>
        <Invelitori catalog={catalog} stare={stare} set={set} poate={poate} structura={rezultat} />
      </BandaRubrica>

      <BandaRubrica {...banda("standard")}>
        <Rubrica rubrica={RUBRICI.standard} titlu="Accesorii standard" catalog={catalog} stare={stare} set={set} poate={poate} categoriePrincipala={categoriePrincipala} structura={rezultat} cuSecundare />
      </BandaRubrica>
      <BandaRubrica {...banda("speciale")}>
        <Speciale2ML catalog={catalog} stare={stare} set={set} poate={poate} structura={rezultat} />
      </BandaRubrica>
      <BandaRubrica {...banda("fixare")}>
        <Rubrica rubrica={RUBRICI.fixare} titlu="Fixare și etanșare" catalog={catalog} stare={stare} set={set} poate={poate} categoriePrincipala={categoriePrincipala} structura={rezultat} cuSecundare />
      </BandaRubrica>
      <BandaRubrica {...banda("pluvial")}>
        <Pluvial catalog={catalog} stare={stare} set={set} poate={poate} structura={rezultat} />
      </BandaRubrica>
      <BandaRubrica {...banda("sipca")}>
        <Sipca catalog={catalog} stare={stare} set={set} poate={poate} structura={rezultat} />
      </BandaRubrica>
      <BandaRubrica {...banda("lungimi")}>
        <Lungimi catalog={catalog} stare={stare} set={set} poate={poate} structura={rezultat} iduri={iduri} refuzata={salvare === "eroare"} />
      </BandaRubrica>
      <section className="panou in-lucru">
        <h2>Ferestre</h2>
        <p>Rubrica ferestrelor (Fakro, Velux) vine în Etapa 4, cu al doilea compartiment de catalog.</p>
      </section>
      <BandaRubrica {...banda("zonaB")}>
        <ZonaB stare={stare} set={set} poate={poate} />
      </BandaRubrica>

      <RezultatPeScurt structura={structura} onMergiLaPreturi={() => onMergiLaPreturi?.()} />

      <Ajutor>
        <ul>
          <li>Totul se salvează automat la fiecare modificare; starea („salvat”, „nesalvat”, „se salvează…”) e în rândul ofertei, sus. „Salvează” de acolo trimite pe loc ce aștepta să se salveze.</li>
          <li>
            Dacă un rând nu e scris până la capăt (o lungime rămasă „5,”, o poziție cu rânduri și fără culoare), oferta <strong>nu se salvează deloc</strong> până îl corectezi: sus scrie „NU e salvată”, cu ce e de corectat și un clic care te duce la rând, iar fila Produse are un punct roșu. Un rând cu lungime și fără bucăți (sau invers) e marcat „incomplet”: nu e în ofertă. Cât există așa
            ceva, statusul, documentele și acțiunile din „⋯” se opresc și te duc la rând; la plecarea din pagină ești întrebat.
          </li>
          <li>La blocurile cu rânduri (accesorii la lungimi, șipcă), coșul de la capătul rândului scoate doar rândul; „Scoate accesoriul / rubrica / sistemul / învelitoarea” e în antetul blocului și cere confirmare când blocul are ceva completat.</li>
          <li>Toate rubricile sunt deschise când intri în ofertă, cu lista lor întreagă. Un clic pe banda unei rubrici o strânge pe un rând (arată ce are completat); încă un clic o deschide la loc. Strângerea e doar pentru ochi: nu schimbă nimic în ofertă, în calcul sau în documente.</li>
          <li>Bara de rubrici de sus arată câte produse au cantitate în fiecare rubrică (cele fără nimic completat apar șterse doar acolo); un clic sare la rubrică și o deschide dacă era strânsă.</li>
          <li>Învelitoarea se alege în cascadă: tip → model → finisaj → grosime → culoare; cantitatea în mp direct, prin panotaj (lungime × bucăți, cu Tab și săgeți) sau amândouă. Prima învelitoare e principală; „Adaugă învelitoare” pentru secundare.</li>
          <li>Fiecare rubrică arată lista implicită pentru categoria învelitorii principale; restul produselor sunt sub „+ Adaugă…”, căutate în catalog pe rubrică și pe cheia de culoare. Produsul adăugat apare fără cantitate și rămâne pe ecran până îl scoți din coș; cât e gol nu intră în calcul și în documente. Cantitățile sunt manuale, fără calcule.</li>
          <li>Accesoriile standard, speciale 2 ML și fixarea iau culoarea învelitorii principale; pentru o învelitoare secundară cu altă cheie există „Adaugă pentru învelitoarea secundară”. Pluvialul, șipca și accesoriile la lungimi își aleg finisajul și culoarea.</li>
          <li>Rezultatul de jos e pe scurt (se poate comanda sau nu, câte formulare); rezultatul întreg — mp și coli, pachetele și formularele Bilka — e în fila „Prețuri și documente”.</li>
          <li>Tastatură: Tab trece la următoarea căsuță completabilă (sare peste coșuri și butoane); Enter trece pe lungimea poziției următoare (1…8, apoi 9…16; pe ultima adaugă o poziție) sau pe cantitatea rândului următor; săgețile ↑ ↓ mută pe același câmp. Ștergerea doar cu clic pe coș. Alt + 1 / 2 / 3 schimbă fila.</li>
        </ul>
      </Ajutor>
    </div>
  );
}
