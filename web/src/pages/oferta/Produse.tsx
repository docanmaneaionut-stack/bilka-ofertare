import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { apiCatalogEditor, apiProduseOferta, type OfertaDetaliu, type ProdusEditor, type ReferinteEditor, type StructuraOferta } from "../../api";
import { Ajutor, Mesaj, textEroare } from "../../components/ui";
import { Invelitori } from "./Invelitori";
import { Lungimi } from "./Lungimi";
import { Pluvial } from "./Pluvial";
import { Rubrica } from "./Rubrica";
import { Sipca } from "./Sipca";
import { Speciale2ML } from "./Speciale2ML";
import { Structura } from "./Structura";
import { ZonaB } from "./ZonaB";
import { categorieInvelitoare, RUBRICI, spreServer, stareDinOferta, stareGoala, type StareEditor } from "./editor";

// Zona produselor din pagina ofertei (FISA-OFERTARE cap. 3-10): rubricile in
// ordinea decisa, salvare automata la fiecare modificare (fara buton), rezultatul
// motorului pe loc - doar cantitati si structura, fara preturi (S14).

export type Catalog = { invelitori: ProdusEditor[]; ref: ReferinteEditor };

// sagetile ↑ ↓ si Enter muta intre casutele de cantitate si intre randurile de
// panotaj, pe aceeasi coloana a tabelului (Tab ramane); Enter pe ultimul rand de
// panotaj lasa handlerul propriu sa adauge pozitia, apoi trece pe ea
export function navigheazaCantitati(e: KeyboardEvent<HTMLElement>) {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter") return;
  const el = e.target as HTMLElement;
  if (!(el instanceof HTMLInputElement) || (el.type !== "text" && el.type !== "search")) return;
  const celula = el.closest("td");
  const rand = el.closest("tr");
  const tabel = el.closest("table");
  if (!celula || !rand || !tabel) return;
  const col = celula.cellIndex;
  const randuri = Array.from(tabel.querySelectorAll<HTMLTableRowElement>("tbody tr"));
  const idx = randuri.indexOf(rand as HTMLTableRowElement);
  const delta = e.key === "ArrowUp" ? -1 : 1;
  const focuseaza = (r: HTMLTableRowElement | undefined) => {
    const tinta = r?.cells[col]?.querySelector<HTMLInputElement>("input:not(:disabled)") ?? r?.querySelector<HTMLInputElement>("input:not(:disabled)");
    if (!tinta) return false;
    tinta.focus();
    tinta.select();
    return true;
  };
  if (focuseaza(randuri[idx + delta])) {
    e.preventDefault();
    return;
  }
  // Enter pe ultimul rand: randul nou apare dupa randare
  if (e.key === "Enter" && delta === 1) setTimeout(() => focuseaza(Array.from(tabel.querySelectorAll<HTMLTableRowElement>("tbody tr"))[idx + 1]), 0);
}

export function Produse({ oferta, onOferta, mentiuni = "" }: { oferta: OfertaDetaliu; onOferta: (o: OfertaDetaliu) => void; mentiuni?: string }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [stare, setStare] = useState<StareEditor | null>(null);
  const [salvare, setSalvare] = useState<"salvat" | "modificat" | "se-salveaza" | "eroare">("salvat");
  const [eroare, setEroare] = useState<string | null>(null);
  const [structura, setStructura] = useState<{ rezultat: StructuraOferta | null; eroare: string | null } | null>(oferta.structura ?? null);
  const ultimaTrimisa = useRef<string>("");
  const ofertaId = oferta.id;

  // cataloagele (o singura data) si starea din oferta salvata
  useEffect(() => {
    let activ = true;
    Promise.all([apiCatalogEditor.invelitori(), apiCatalogEditor.referinte()])
      .then(([inv, ref]) => {
        if (!activ) return;
        const c = { invelitori: inv.produse, ref };
        setCatalog(c);
        const catalogLinii = new Map<string, ProdusEditor>();
        const s = oferta.invelitori.length || oferta.linii.length ? stareDinOferta(oferta, inv.produse, catalogLinii) : stareGoala();
        setStare(s);
        ultimaTrimisa.current = JSON.stringify(spreServer(s));
      })
      .catch((e) => setEroare(textEroare(e)));
    return () => {
      activ = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ofertaId]);

  // salvarea automata: la fiecare modificare, cu o scurta intarziere
  useEffect(() => {
    if (!stare || !oferta.poateModifica) return;
    const corp = { ...spreServer(stare), ...(mentiuni.trim() ? { mentiuni: mentiuni.trim() } : {}) };
    const text = JSON.stringify(spreServer(stare));
    if (text === ultimaTrimisa.current) return;
    setSalvare("modificat");
    const t = setTimeout(async () => {
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
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stare]);

  const principala = stare?.invelitori[0] ?? null;
  const produsPrincipal = useMemo(() => (catalog && principala?.produsId ? (catalog.invelitori.find((p) => p.id === principala.produsId) ?? null) : null), [catalog, principala?.produsId]);
  const categoriiListe = useMemo(() => [...new Set(catalog?.ref.categoriiListe.map((c) => c.categorieInvelitoare) ?? [])], [catalog]);
  const categoriePrincipala = categorieInvelitoare(produsPrincipal, categoriiListe);

  if (eroare && !stare) return <Mesaj tip="eroare">{eroare}</Mesaj>;
  if (!catalog || !stare) return <p className="text-secundar">Se încarcă catalogul…</p>;

  const poate = oferta.poateModifica;
  const set = (schimba: (s: StareEditor) => StareEditor) => setStare((s) => (s ? schimba(s) : s));

  return (
    <div className="zona-produse" onKeyDown={navigheazaCantitati}>
      <div className="antet-pagina" style={{ marginTop: 8 }}>
        <h2 style={{ margin: 0 }}>Produse</h2>
        <div className="actiuni">
          <label className="camp" style={{ gridTemplateColumns: "auto auto", alignItems: "center", gap: 8 }} title="Grupă (adaos discret, 11.3)">
            <span className="mic text-secundar">Grupă %</span>
            <input type="text" inputMode="decimal" value={stare.grupaPct} onChange={(e) => set((s) => ({ ...s, grupaPct: e.target.value }))} disabled={!poate} style={{ width: 70 }} aria-label="Grupă %" />
          </label>
          <span className={`eticheta ${salvare === "eroare" ? "" : "inactiv"}`} aria-live="polite">
            {salvare === "salvat" ? "salvat" : salvare === "modificat" ? "modificat…" : salvare === "se-salveaza" ? "se salvează…" : "eroare la salvare"}
          </span>
        </div>
      </div>
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      {!poate && <Mesaj>{oferta.status === "COMANDAT" ? "Oferta e comandată: produsele, cantitățile și prețurile sunt înghețate (orice material în plus = completare)." : "Oferta se poate modifica doar de cine a făcut-o și de Administratorul firmei."}</Mesaj>}

      <Invelitori catalog={catalog} stare={stare} set={set} poate={poate} structura={structura?.rezultat ?? null} />

      <Rubrica rubrica={RUBRICI.standard} titlu="Accesorii standard" catalog={catalog} stare={stare} set={set} poate={poate} categoriePrincipala={categoriePrincipala} structura={structura?.rezultat ?? null} cuSecundare />
      <Speciale2ML catalog={catalog} stare={stare} set={set} poate={poate} structura={structura?.rezultat ?? null} />
      <Rubrica rubrica={RUBRICI.fixare} titlu="Fixare și etanșare" catalog={catalog} stare={stare} set={set} poate={poate} categoriePrincipala={null} structura={structura?.rezultat ?? null} cuSecundare />
      <Pluvial catalog={catalog} stare={stare} set={set} poate={poate} structura={structura?.rezultat ?? null} />
      <Sipca catalog={catalog} stare={stare} set={set} poate={poate} structura={structura?.rezultat ?? null} />
      <Lungimi catalog={catalog} stare={stare} set={set} poate={poate} structura={structura?.rezultat ?? null} />
      <section className="panou in-lucru">
        <h2>Ferestre</h2>
        <p>Rubrica ferestrelor (Fakro, Velux) vine în Etapa 4, cu al doilea compartiment de catalog.</p>
      </section>
      <ZonaB stare={stare} set={set} poate={poate} />

      <Structura structura={structura} />

      <Ajutor>
        <ul>
          <li>Totul se salvează automat la fiecare modificare; indicatorul din dreapta sus arată starea. Fără buton de salvare.</li>
          <li>Învelitoarea se alege în cascadă: tip → model → finisaj → grosime → culoare; cantitatea în mp direct, prin panotaj (lungime × bucăți, cu Tab și săgeți) sau amândouă. Prima învelitoare e principală; „Adaugă învelitoare” pentru secundare.</li>
          <li>Fiecare rubrică arată lista implicită pentru categoria învelitorii principale; restul produselor sunt sub „+ Adaugă…”, căutate în catalog pe rubrică și pe cheia de culoare. Cantitățile sunt manuale, fără calcule.</li>
          <li>Accesoriile standard, speciale 2 ML și fixarea iau culoarea învelitorii principale; pentru o învelitoare secundară cu altă cheie există „Adaugă pentru învelitoarea secundară”. Pluvialul, șipca și accesoriile la lungimi își aleg finisajul și culoarea.</li>
          <li>Rezultatul de jos vine din motorul de calcul: mp și coli, pachetele și formularele Bilka, dacă oferta se poate comanda.</li>
          <li>Tastatură: Tab trece la următoarea căsuță; săgețile ↑ ↓ și Enter mută între căsuțele de cantitate și între rândurile de panotaj (Enter pe ultimul rând adaugă o poziție).</li>
        </ul>
      </Ajutor>
    </div>
  );
}
