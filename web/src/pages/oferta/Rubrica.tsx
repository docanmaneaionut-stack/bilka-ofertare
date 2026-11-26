import { useEffect, useRef, useState } from "react";
import { apiCatalogEditor, type ProdusEditor, type StructuraOferta } from "../../api";
import { BtnSterge } from "../../components/BtnSterge";
import { CasutaCantitate } from "../../components/CasutaCantitate";
import { Camp, Mesaj, textEroare } from "../../components/ui";
import { ordoneazaFinisaje } from "../../lib/finisaje";
import type { Catalog } from "./Produse";
import { categorieInvelitoare, cheieInvelitoare, cheieNoua, culoriPentru, ral, sectiuneaLiniei, textCheie, type LinieUI, type StareEditor } from "./editor";

type Cheie = { finisaj: string; grosime: string | null; ral: string };

type Props = {
  rubrica: string;
  titlu: string;
  catalog: Catalog;
  stare: StareEditor;
  set: (f: (s: StareEditor) => StareEditor) => void;
  poate: boolean;
  categoriePrincipala: string | null;
  structura: StructuraOferta | null;
  cuSecundare?: boolean;
};

// O rubrica de accesorii (standard, fixare): sectiunea invelitorii principale cu
// lista implicita + "+ Adauga...", sectiuni pentru invelitorile secundare cu alta
// cheie si sectiuni de sine statatoare (cheie proprie, fara invelitoare).
export function Rubrica({ rubrica, titlu, catalog, stare, set, poate, categoriePrincipala, cuSecundare }: Props) {
  const principala = stare.invelitori[0];
  const produsPrincipal = principala?.produsId ? catalog.invelitori.find((p) => p.id === principala.produsId) : null;
  const [deSine, setDeSine] = useState<Cheie | null>(null);
  // S17b BUG-3: sectiunea unei invelitori secundare are lista categoriei ei (la plate,
  // suruburile Retro Panel), nu a principalei
  const categoriiListe = [...new Set(catalog.ref.categoriiListe.map((c) => c.categorieInvelitoare))];
  const categoriaInvelitorii = (produsId: string | null) => categorieInvelitoare(produsId ? (catalog.invelitori.find((p) => p.id === produsId) ?? null) : null, categoriiListe);

  const sectiuniSecundare = cuSecundare
    ? stare.invelitori.slice(1).filter((i) => i.produsId && (textCheie(cheieInvelitoare(i)) !== textCheie(cheieInvelitoare(principala)) || stare.linii.some((l) => l.invelitoare === i.cheie && l.rubrica === rubrica)))
    : [];
  const [secundareDeschise, setSecundareDeschise] = useState<string[]>([]);
  const liniiDeSine = stare.linii.filter((l) => l.rubrica === rubrica && !l.invelitoare && l.culoare);
  const cheiDeSine = [...new Map(liniiDeSine.map((l) => [textCheie(l.culoare!), l.culoare!])).values()];
  if (deSine && !cheiDeSine.some((c) => textCheie(c) === textCheie(deSine))) cheiDeSine.push(deSine);

  return (
    <section className="panou">
      <h2>{titlu}</h2>
      {produsPrincipal && principala.culoare ? (
        <Sectiune rubrica={rubrica} categorie={categoriePrincipala} cheie={cheieInvelitoare(principala)} invelitoare={principala.cheie} titlu={`pentru ${principala.model} · ${textCheie(cheieInvelitoare(principala))}`} stare={stare} set={set} poate={poate} catalog={catalog} />
      ) : (
        <Mesaj>Alege întâi învelitoarea principală, cu finisaj, grosime și culoare.</Mesaj>
      )}
      {sectiuniSecundare.map((inv) =>
        secundareDeschise.includes(inv.cheie) || stare.linii.some((l) => l.invelitoare === inv.cheie && l.rubrica === rubrica) ? (
          <Sectiune key={inv.cheie} rubrica={rubrica} categorie={categoriaInvelitorii(inv.produsId) ?? categoriePrincipala} cheie={cheieInvelitoare(inv)} invelitoare={inv.cheie} titlu={`pentru învelitoarea secundară ${inv.model} · ${textCheie(cheieInvelitoare(inv))}`} stare={stare} set={set} poate={poate} catalog={catalog} />
        ) : (
          poate && (
            <button key={inv.cheie} className="buton secundar mic" type="button" tabIndex={-1} onClick={() => setSecundareDeschise((d) => [...d, inv.cheie])} style={{ marginRight: 8 }}>
              + Adaugă {rubrica === "Fixare și etanșare" ? "fixare" : "accesorii"} pentru învelitoarea secundară ({inv.model} {textCheie(cheieInvelitoare(inv))})
            </button>
          )
        ),
      )}
      {cheiDeSine.map((c) => (
        <Sectiune key={textCheie(c)} rubrica={rubrica} categorie={categoriePrincipala} cheie={c} invelitoare={null} titlu={`secțiune de sine stătătoare · ${textCheie(c)}`} stare={stare} set={set} poate={poate} catalog={catalog} />
      ))}
      {poate && <NouaSectiuneDeSine catalog={catalog} onAdauga={(c) => setDeSine(c)} />}
    </section>
  );
}

// alegerea cheii pentru o sectiune de sine statatoare (comanda doar de accesorii, completari);
// S27 (M9): folosita si de rubrica accesoriilor speciale 2 ML, cu eticheta ei
export function NouaSectiuneDeSine({ catalog, onAdauga, eticheta = "+ Secțiune de sine stătătoare (altă cheie, fără învelitoare)" }: { catalog: Catalog; onAdauga: (c: Cheie) => void; eticheta?: string }) {
  const [deschis, setDeschis] = useState(false);
  const [finisaj, setFinisaj] = useState("");
  const [grosime, setGrosime] = useState("");
  const [culoare, setCuloare] = useState("");
  const finisaje = ordoneazaFinisaje([...new Set(catalog.ref.culori.map((c) => c.finisaj))], catalog.ref.ordineFinisaje ?? []);
  const grosimi = [...new Set(catalog.ref.culori.filter((c) => c.finisaj === finisaj).map((c) => c.grosime))];
  const culori = finisaj && grosime ? culoriPentru(catalog.ref, null, finisaj, grosime) : [];
  if (!deschis)
    return (
      <button className="buton secundar mic" type="button" tabIndex={-1} onClick={() => setDeschis(true)}>
        {eticheta}
      </button>
    );
  return (
    <div className="rand-campuri" style={{ marginTop: 12 }}>
      <Camp eticheta="Finisaj">
        <select value={finisaj} onChange={(e) => setFinisaj(e.target.value)}>
          <option value="">alege…</option>
          {finisaje.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </Camp>
      <Camp eticheta="Grosime">
        <select value={grosime} onChange={(e) => setGrosime(e.target.value)} disabled={!finisaj}>
          <option value="">alege…</option>
          {grosimi.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </Camp>
      <Camp eticheta="Culoare">
        <select value={culoare} onChange={(e) => setCuloare(e.target.value)} disabled={!grosime}>
          <option value="">alege…</option>
          {culori.map((c) => (
            <option key={c} value={ral(c)}>
              {ral(c)}
            </option>
          ))}
        </select>
      </Camp>
      <div className="actiuni" style={{ alignSelf: "end" }}>
        <button
          className="buton secundar"
          type="button" tabIndex={-1}
          disabled={!culoare}
          onClick={() => {
            onAdauga({ finisaj, grosime, ral: culoare });
            setDeschis(false);
          }}
        >
          Deschide secțiunea
        </button>
      </div>
    </div>
  );
}

// o sectiune: lista implicita (randuri cu cantitate goala pana le completezi) + liniile adaugate + "+ Adauga..."
export function Sectiune({
  rubrica,
  categorie,
  cheie,
  invelitoare,
  titlu,
  stare,
  set,
  poate,
  catalog,
}: {
  rubrica: string;
  categorie: string | null;
  cheie: Cheie;
  invelitoare: string | null;
  titlu: string;
  stare: StareEditor;
  set: (f: (s: StareEditor) => StareEditor) => void;
  poate: boolean;
  catalog: Catalog;
}) {
  const [implicite, setImplicite] = useState<(ProdusEditor & { numeLista: string })[]>([]);
  const [nerezolvate, setNerezolvate] = useState<string[]>([]);
  const [eroare, setEroare] = useState<string | null>(null);
  const [cautare, setCautare] = useState("");
  const [gasite, setGasite] = useState<ProdusEditor[]>([]);
  const sectiune = sectiuneaLiniei(rubrica, invelitoare, invelitoare ? null : { ral: cheie.ral, finisaj: cheie.finisaj, grosime: cheie.grosime });
  const linii = stare.linii.filter((l) => l.sectiune === sectiune);
  void catalog;

  useEffect(() => {
    apiCatalogEditor
      .listaImplicita(rubrica, categorie ?? undefined, { finisaj: cheie.finisaj, grosime: cheie.grosime ?? undefined })
      .then((r) => {
        setImplicite(r.produse);
        setNerezolvate(r.nerezolvate.map((n) => n.nume));
      })
      .catch((e) => setEroare(textEroare(e)));
  }, [rubrica, categorie, cheie.finisaj, cheie.grosime]);

  useEffect(() => {
    if (cautare.trim().length < 2) return;
    const t = setTimeout(() => {
      apiCatalogEditor
        .cauta(cautare.trim(), rubrica, { finisaj: cheie.finisaj, grosime: cheie.grosime ?? undefined })
        .then((r) => setGasite(r.produse))
        .catch(() => setGasite([]));
    }, 250);
    return () => clearTimeout(t);
  }, [cautare, rubrica, cheie.finisaj, cheie.grosime]);

  const culoare = invelitoare ? null : { ral: cheie.ral, finisaj: cheie.finisaj, grosime: cheie.grosime };
  const seteazaCantitate = (produs: ProdusEditor, cantitate: string, dinLista: boolean) =>
    set((s) => {
      const existenta = s.linii.find((l) => l.sectiune === sectiune && l.produs.id === produs.id);
      if (existenta) return { ...s, linii: s.linii.map((l) => (l === existenta ? { ...l, cantitate } : l)) };
      const noua: LinieUI = { cheie: cheieNoua("lin"), rubrica, produs, cantitate, invelitoare, culoare, pozitii: null, sectiune, dinLista };
      return { ...s, linii: [...s.linii, noua] };
    });
  const scoate = (cheieLinie: string) => set((s) => ({ ...s, linii: s.linii.filter((l) => l.cheie !== cheieLinie) }));
  // S29 (BUG-20): "+ Adauga..." creeaza randul FARA cantitate, cu cursorul in casuta lui; randul ramane
  // (si gol) pana e scos din cos. Un produs deja pe ecran nu se dubleaza si nu-si pierde cantitatea.
  const deFocalizat = useRef<string | null>(null);
  const adaugaGol = (produs: ProdusEditor) => {
    const existenta = linii.find((l) => l.produs.id === produs.id);
    if (!existenta && !implicite.some((p) => p.id === produs.id)) seteazaCantitate(produs, "", false);
    deFocalizat.current = produs.id;
    setCautare("");
    setGasite([]);
  };

  const randuri: { produs: ProdusEditor; linie: LinieUI | null; numeLista: string | null }[] = [
    ...implicite.map((p) => ({ produs: p, linie: linii.find((l) => l.produs.id === p.id) ?? null, numeLista: p.numeLista })),
    ...linii.filter((l) => !implicite.some((p) => p.id === l.produs.id)).map((l) => ({ produs: l.produs, linie: l, numeLista: null })),
  ];

  // cursorul in casuta randului abia adaugat (dupa ce randul apare pe ecran)
  useEffect(() => {
    if (!deFocalizat.current) return;
    const rand = randuri.findIndex((r) => r.produs.id === deFocalizat.current);
    if (rand < 0) return;
    const casuta = [...document.querySelectorAll<HTMLInputElement>('input[data-camp="cantitate"]')].find((c) => c.dataset.grup === sectiune && c.dataset.rand === String(rand));
    casuta?.focus();
    deFocalizat.current = null;
  });

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="banda">{titlu}</div>
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      {nerezolvate.length > 0 && <Mesaj tip="avertizare">Din lista implicită nu s-au găsit în catalog pentru această cheie: {nerezolvate.join(", ")}.</Mesaj>}
      <div className="tabel-invelis">
        <table className="tabel editabil">
          <thead>
            <tr>
              <th>Produs</th>
              <th>UM</th>
              <th style={{ width: 120 }}>Cantitate</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {randuri.map((r, idx) => (
              <tr key={r.produs.id} className={r.linie && r.linie.cantitate.trim() ? undefined : "inactiv"}>
                <td className="produs">
                  <span className="celula-produs" title={`${r.numeLista ?? r.produs.denumire} · ${r.produs.denumire} · ${r.produs.cod}`}>
                    {r.numeLista ?? r.produs.denumire} <span className="mic text-secundar">· {r.produs.denumire !== r.numeLista ? `${r.produs.denumire} · ${r.produs.cod}` : r.produs.cod}</span>
                  </span>
                </td>
                <td>{r.produs.um.toLowerCase()}</td>
                <td>
                  <CasutaCantitate value={r.linie?.cantitate ?? ""} onChange={(v) => (v.trim() === "" && r.linie && r.numeLista !== null ? scoate(r.linie.cheie) : seteazaCantitate(r.produs, v, r.numeLista !== null))} eticheta={`Cantitate ${r.produs.denumire}`} disabled={!poate} grup={sectiune} rand={idx} camp="cantitate" />
                </td>
                <td>
                  {r.linie && poate && <BtnSterge onClick={() => scoate(r.linie!.cheie)} eticheta={`Scoate ${r.produs.denumire}`} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {poate && (
        <div style={{ marginTop: 8, maxWidth: 520 }}>
          <input type="search" value={cautare} onChange={(e) => setCautare(e.target.value)} placeholder={`+ Adaugă… (caută în ${rubrica.toLowerCase()})`} aria-label={`Adaugă în ${rubrica}`} />
          {cautare.trim().length >= 2 && gasite.length > 0 && (
            <ul className="lista-sugestii">
              {gasite.map((p) => (
                <li
                  key={p.id}
                  tabIndex={0}
                  onClick={() => adaugaGol(p)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") adaugaGol(p);
                  }}
                >
                  {p.denumire} <span className="mic text-secundar">· {p.cod}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
