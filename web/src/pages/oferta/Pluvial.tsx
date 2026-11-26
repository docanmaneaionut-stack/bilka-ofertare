import { useEffect, useRef, useState } from "react";
import { apiCatalogEditor, type ProdusEditor, type StructuraOferta } from "../../api";
import { BtnSterge } from "../../components/BtnSterge";
import { ScoateBloc } from "../../components/ScoateBloc";
import { CasutaCantitate } from "../../components/CasutaCantitate";
import { Camp, Mesaj, textEroare } from "../../components/ui";
import { ordoneazaFinisaje } from "../../lib/finisaje";
import { potriveste } from "../../lib/text";
import type { Catalog } from "./Produse";
import { cheieNoua, culoriPentru, ral, RUBRICI, sectiuneaLiniei, SISTEME_PLUVIAL, sistemulLiniei, type LinieUI, type StareEditor } from "./editor";

type Props = { catalog: Catalog; stare: StareEditor; set: (f: (s: StareEditor) => StareEditor) => void; poate: boolean; structura: StructuraOferta | null };

type SistemUI = { cheie: string; finisaj: string; sistem: string; ral: string };

const SISTEME = SISTEME_PLUVIAL;

// liniile unei sectiuni: acelasi finisaj, aceeasi culoare si acelasi sistem (al liniei, din catalog)
type Sistemul = (l: LinieUI, toate: LinieUI[]) => string;
const aSectiunii = (l: LinieUI, s: SistemUI, toate: LinieUI[], sistemul: Sistemul): boolean => l.rubrica === RUBRICI.pluvial && l.culoare !== null && l.culoare.finisaj === s.finisaj && l.culoare.ral === s.ral && sistemul(l, toate) === s.sistem;
const alePluvialului = (linii: LinieUI[]) => linii.filter((l) => l.rubrica === RUBRICI.pluvial && l.culoare);

// Sistemul pluvial (FISA-OFERTARE cap. 6): 125/90 implicit, clic -> 150/100;
// finisaj + culoare; lista implicita; "+ Adauga sistem pluvial" pentru alta
// culoare sau alt sistem (la export, un formular per finisaj + culoare)
export function Pluvial({ catalog, stare, set, poate }: Props) {
  const [finisaje, setFinisaje] = useState<string[]>([]);
  const [noi, setNoi] = useState<SistemUI[]>([]);

  useEffect(() => {
    apiCatalogEditor
      .cauta("jgheab", RUBRICI.pluvial, {})
      .then((r) => setFinisaje([...new Set(r.produse.map((p) => p.finisaj ?? ""))].filter(Boolean)))
      .catch(() => setFinisaje([]));
  }, []);

  // sectiunile din liniile existente (finisaj + sistem + culoare), plus cele deschise si inca goale
  const dinLinii = new Map<string, SistemUI>();
  // S29b (BUG-27): sistemul e cel din catalog al liniei salvate (150 / 100 ramane 150 / 100 si dupa
  // redeschidere); piesele comune celor doua sisteme urmeaza grupul finisajului si culorii lor
  const sistemul: Sistemul = (l, toate) => sistemulLiniei(l, toate, noi.find((n) => n.finisaj === l.culoare?.finisaj && n.ral === l.culoare?.ral)?.sistem);
  const liniiPluvial = alePluvialului(stare.linii);
  for (const l of liniiPluvial) {
    const sistem = sistemul(l, liniiPluvial);
    const cheie = `${l.culoare!.finisaj}|${sistem}|${l.culoare!.ral}`;
    if (!dinLinii.has(cheie)) dinLinii.set(cheie, { cheie, finisaj: l.culoare!.finisaj, sistem, ral: l.culoare!.ral });
  }
  const sectiuni = [...dinLinii.values(), ...noi.filter((n) => !dinLinii.has(n.cheie))];
  const principala = stare.invelitori[0];
  const finisajImplicit = principala?.finisaj && /mat/i.test(principala.finisaj) ? "mat" : "colorat (lucios)";

  return (
    <section className="panou">
      <h2>Sistem pluvial</h2>
      {sectiuni.length === 0 && <Mesaj>Niciun sistem pluvial pe ofertă.</Mesaj>}
      {sectiuni.map((s, idx) => (
        <SectiunePluvial
          key={s.cheie}
          s={s}
          idx={idx}
          finisaje={ordoneazaFinisaje(finisaje, catalog.ref.ordineFinisaje ?? [])}
          sistemul={sistemul}
          catalog={catalog}
          stare={stare}
          set={set}
          poate={poate}
          onSchimba={(n) => {
            // culoarea / finisajul / sistemul nou se aplica liniilor sectiunii
            set((st) => ({
              ...st,
              linii: st.linii.map((l) => (aSectiunii(l, s, alePluvialului(st.linii), sistemul) && n.finisaj === s.finisaj && n.sistem === s.sistem ? { ...l, culoare: { ...l.culoare!, ral: n.ral }, sectiune: sectiuneaLiniei(RUBRICI.pluvial, null, { ...l.culoare!, ral: n.ral }) } : l)),
            }));
            setNoi((p) => [...p.filter((x) => x.cheie !== s.cheie), { ...n, cheie: `${n.finisaj}|${n.sistem}|${n.ral}` }]);
          }}
          onScoate={() => {
            set((st) => ({ ...st, linii: st.linii.filter((l) => !aSectiunii(l, s, alePluvialului(st.linii), sistemul)) }));
            setNoi((p) => p.filter((x) => x.cheie !== s.cheie));
          }}
        />
      ))}
      {poate && (
        <button className="buton secundar" type="button" tabIndex={-1} onClick={() => setNoi((p) => [...p, { cheie: cheieNoua("pl"), finisaj: finisajImplicit, sistem: "125 / 90", ral: "" }])}>
          + Adaugă sistem pluvial
        </button>
      )}
    </section>
  );
}

function SectiunePluvial({ s, idx, finisaje, sistemul, catalog, stare, set, poate, onSchimba, onScoate }: { s: SistemUI; idx: number; finisaje: string[]; sistemul: Sistemul; catalog: Catalog; stare: StareEditor; set: (f: (st: StareEditor) => StareEditor) => void; poate: boolean; onSchimba: (n: SistemUI) => void; onScoate: () => void }) {
  const [implicite, setImplicite] = useState<(ProdusEditor & { numeLista: string })[]>([]);
  const [restul, setRestul] = useState<ProdusEditor[]>([]);
  const [nerezolvate, setNerezolvate] = useState<string[]>([]);
  const [eroare, setEroare] = useState<string | null>(null);
  const [cautare, setCautare] = useState("");

  useEffect(() => {
    if (!s.finisaj) return;
    apiCatalogEditor
      .pluvial(s.finisaj, s.sistem)
      .then((r) => {
        setImplicite(r.implicite);
        setRestul(r.restul);
        setNerezolvate(r.nerezolvate.map((n) => n.nume));
      })
      .catch((e) => setEroare(textEroare(e)));
  }, [s.finisaj, s.sistem]);

  const culori = culoriPentru(catalog.ref, implicite[0] ?? null, s.finisaj, "");
  const culoare = s.ral ? { ral: s.ral, finisaj: s.finisaj, grosime: null } : null;
  const sectiune = culoare ? sectiuneaLiniei(RUBRICI.pluvial, null, culoare) : "";
  const linii = culoare ? stare.linii.filter((l) => aSectiunii(l, s, alePluvialului(stare.linii), sistemul)) : [];

  const seteazaCantitate = (produs: ProdusEditor, cantitate: string) => {
    if (!culoare) return;
    set((st) => {
      const existenta = linii.find((l) => l.produs.id === produs.id);
      if (existenta) return { ...st, linii: st.linii.map((l) => (l.cheie === existenta.cheie ? { ...l, cantitate } : l)) };
      const noua: LinieUI = { cheie: cheieNoua("lin"), rubrica: RUBRICI.pluvial, produs, cantitate, invelitoare: null, culoare, pozitii: null, sectiune, dinLista: true };
      return { ...st, linii: [...st.linii, noua] };
    });
  };
  const scoate = (cheie: string) => set((st) => ({ ...st, linii: st.linii.filter((l) => l.cheie !== cheie) }));
  // S29 (BUG-20): piesa adaugata cu "+" apare FARA cantitate, cu cursorul in casuta ei, si ramane pana e
  // scoasa din cos; una deja pe ecran nu se dubleaza si nu-si pierde cantitatea
  const deFocalizat = useRef<string | null>(null);
  const adaugaGol = (produs: ProdusEditor) => {
    if (!linii.some((l) => l.produs.id === produs.id) && !implicite.some((p) => p.id === produs.id)) seteazaCantitate(produs, "");
    deFocalizat.current = produs.id;
    setCautare("");
  };
  // S25 BUG-10: cautarea locala fara diacritice, in ambele sensuri
  const gasite = cautare.trim().length >= 2 ? restul.filter((p) => potriveste(`${p.denumire} ${p.cod}`, cautare)).slice(0, 12) : [];
  const randuri = [...implicite.map((p) => ({ produs: p as ProdusEditor, numeLista: p.numeLista as string | null, linie: linii.find((l) => l.produs.id === p.id) ?? null })), ...linii.filter((l) => !implicite.some((p) => p.id === l.produs.id)).map((l) => ({ produs: l.produs, numeLista: null, linie: l }))];
  // cursorul in casuta piesei abia adaugate (dupa ce randul apare pe ecran)
  const grupCasute = `pluvial-${s.cheie}`;
  useEffect(() => {
    if (!deFocalizat.current) return;
    const rand = randuri.findIndex((r) => r.produs.id === deFocalizat.current);
    if (rand < 0) return;
    const casuta = [...document.querySelectorAll<HTMLInputElement>('input[data-camp="cantitate"]')].find((c) => c.dataset.grup === grupCasute && c.dataset.rand === String(rand));
    casuta?.focus();
    deFocalizat.current = null;
  });

  return (
    <div className="panou" style={{ borderStyle: "dashed" }}>
      <div className="antet-pagina" style={{ marginBottom: 8 }}>
        <strong>Sistem pluvial {String.fromCharCode(65 + idx)}</strong>
        {poate && <ScoateBloc eticheta="Scoate sistemul" intrebare={`Ștergi sistemul pluvial ${String.fromCharCode(65 + idx)} (${s.sistem}) cu ${linii.length === 1 ? "piesa lui" : `cele ${linii.length} piese`}?`} cuConfirmare={linii.length > 0} onScoate={onScoate} />}
      </div>
      <div className="rand-campuri">
        <Camp eticheta="Finisaj">
          <select value={s.finisaj} onChange={(e) => onSchimba({ ...s, finisaj: e.target.value, ral: "" })} disabled={!poate || linii.length > 0}>
            <option value="">alege…</option>
            {finisaje.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Camp>
        <Camp eticheta="Sistem">
          <select value={s.sistem} onChange={(e) => onSchimba({ ...s, sistem: e.target.value })} disabled={!poate || linii.length > 0}>
            {SISTEME.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </Camp>
        <Camp eticheta="Culoare">
          <select value={s.ral} onChange={(e) => onSchimba({ ...s, ral: e.target.value })} disabled={!poate || !s.finisaj}>
            <option value="">alege…</option>
            {culori.map((c) => (
              <option key={c} value={ral(c)}>
                {ral(c)}
              </option>
            ))}
          </select>
        </Camp>
      </div>
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      {nerezolvate.length > 0 && <Mesaj tip="avertizare">Din lista implicită nu s-au găsit pentru acest finisaj / sistem: {nerezolvate.join(", ")}.</Mesaj>}
      {!culoare && s.finisaj && <Mesaj>Alege culoarea sistemului pluvial.</Mesaj>}
      {culoare && (
        <>
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
                        {r.numeLista ?? r.produs.denumire}{" "}
                        <span className="mic text-secundar">
                          · {r.produs.denumire} · {r.produs.cod}
                        </span>
                      </span>
                    </td>
                    <td>{r.produs.um.toLowerCase()}</td>
                    <td>
                      <CasutaCantitate value={r.linie?.cantitate ?? ""} onChange={(v) => (v.trim() === "" && r.linie && r.numeLista !== null ? scoate(r.linie.cheie) : seteazaCantitate(r.produs, v))} eticheta={`Cantitate ${r.produs.denumire}`} disabled={!poate} grup={`pluvial-${s.cheie}`} rand={idx} camp="cantitate" />
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
              <input type="search" value={cautare} onChange={(e) => setCautare(e.target.value)} placeholder="+ Adaugă… (restul pieselor sistemului)" aria-label="Adaugă piesă pluvial" />
              {gasite.length > 0 && (
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
        </>
      )}
    </div>
  );
}
