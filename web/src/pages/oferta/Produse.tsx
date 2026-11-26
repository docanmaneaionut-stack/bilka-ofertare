import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { createPortal } from "react-dom";
import { apiCatalogEditor, apiProduseOferta, type OfertaDetaliu, type ProdusEditor, type ReferinteEditor, type StructuraOferta } from "../../api";
import { Ajutor, Mesaj, textEroare } from "../../components/ui";
import { BandaRubrica, BaraRubrici, RezultatPeScurt } from "./Benzi";
import { Invelitori } from "./Invelitori";
import { Lungimi } from "./Lungimi";
import { Pluvial } from "./Pluvial";
import { Rubrica } from "./Rubrica";
import { Sipca } from "./Sipca";
import { Speciale2ML } from "./Speciale2ML";
import { ZonaB } from "./ZonaB";
import { categorieInvelitoare, RUBRICI, spreServer, stareDinOferta, stareGoala, type StareEditor } from "./editor";
import type { StareSalvareProduse } from "./file";
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
  salvareAcum?: MutableRefObject<(() => Promise<void>) | null>;
  onMergiLaPreturi?: () => void;
};

export function Produse({ oferta, onOferta, mentiuni = "", activa = true, slotBara = null, onStareSalvare, salvareAcum, onMergiLaPreturi }: Props) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [stare, setStare] = useState<StareEditor | null>(null);
  const [salvare, setSalvare] = useState<StareSalvareProduse>("salvat");
  const [eroare, setEroare] = useState<string | null>(null);
  const [structura, setStructura] = useState<{ rezultat: StructuraOferta | null; eroare: string | null } | null>(oferta.structura ?? null);
  // S29 (M12): rubricile stranse - se tin minte cat lucrezi la oferta; la redeschidere toate sunt deschise
  const [stranse, setStranse] = useState<ReadonlySet<IdRubrica>>(new Set());
  const [rubricaActiva, setRubricaActiva] = useState<IdRubrica | null>(null);
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
        const catalogLinii = new Map<string, ProdusEditor>();
        const s = oferta.invelitori.length || oferta.linii.length || (oferta.randuriGoale?.length ?? 0) > 0 ? stareDinOferta(oferta, inv.produse, catalogLinii) : stareGoala();
        setStare(s);
        ultimaTrimisa.current = JSON.stringify(spreServer(s));
      })
      .catch((e) => setEroare(textEroare(e)));
    return () => {
      activ = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ofertaId]);

  // trimiterea starii spre server (aceeasi pentru salvarea automata si pentru "Salvează" din randul ofertei)
  const trimite = async (s: StareEditor) => {
    const text = JSON.stringify(spreServer(s));
    if (text === ultimaTrimisa.current) return;
    const corp = { ...spreServer(s), ...(mentiuni.trim() ? { mentiuni: mentiuni.trim() } : {}) };
    setSalvare("se-salveaza");
    try {
      const { oferta: dupa } = await apiProduseOferta.salveaza(oferta.id, corp);
      ultimaTrimisa.current = text;
      setStructura(dupa.structura ?? null);
      onOferta(dupa);
      setSalvare("salvat");
      setEroare(null);
    } catch (e) {
      setSalvare("eroare");
      setEroare(textEroare(e));
    }
  };

  // salvarea automata: la fiecare modificare, cu o scurta intarziere
  useEffect(() => {
    if (!stare || !oferta.poateModifica) return;
    const text = JSON.stringify(spreServer(stare));
    if (text === ultimaTrimisa.current) return;
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
      if (stareCurenta.current && oferta.poateModifica) await trimiteCurent.current(stareCurenta.current);
    };
    return () => {
      salvareAcum.current = null;
    };
  }, [salvareAcum, oferta.poateModifica]);

  useEffect(() => {
    onStareSalvare?.(salvare);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salvare]);

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
        <Lungimi catalog={catalog} stare={stare} set={set} poate={poate} structura={rezultat} />
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
