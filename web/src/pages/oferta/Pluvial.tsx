import { useEffect, useState } from "react";
import { apiCatalogEditor, type ProdusEditor, type StructuraOferta } from "../../api";
import { Camp, Mesaj, textEroare } from "../../components/ui";
import type { Catalog } from "./Produse";
import { cheieNoua, culoriPentru, ral, RUBRICI, sectiuneaLiniei, type LinieUI, type StareEditor } from "./editor";

type Props = { catalog: Catalog; stare: StareEditor; set: (f: (s: StareEditor) => StareEditor) => void; poate: boolean; structura: StructuraOferta | null };

type SistemUI = { cheie: string; finisaj: string; sistem: string; ral: string };

const SISTEME = ["125 / 90", "150 / 100"];

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
  for (const l of stare.linii.filter((l) => l.rubrica === RUBRICI.pluvial && l.culoare)) {
    const sistem = /150/.test(l.produs.sistem ?? "") && !/125/.test(l.produs.sistem ?? "") ? "150 / 100" : "125 / 90";
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
          finisaje={finisaje}
          catalog={catalog}
          stare={stare}
          set={set}
          poate={poate}
          onSchimba={(n) => {
            // culoarea / finisajul / sistemul nou se aplica liniilor sectiunii
            set((st) => ({
              ...st,
              linii: st.linii.map((l) => (l.rubrica === RUBRICI.pluvial && l.culoare && `${l.culoare.finisaj}|${s.sistem}|${l.culoare.ral}` === s.cheie && n.finisaj === s.finisaj && n.sistem === s.sistem ? { ...l, culoare: { ...l.culoare, ral: n.ral }, sectiune: sectiuneaLiniei(RUBRICI.pluvial, null, { ...l.culoare, ral: n.ral }) } : l)),
            }));
            setNoi((p) => [...p.filter((x) => x.cheie !== s.cheie), { ...n, cheie: `${n.finisaj}|${n.sistem}|${n.ral}` }]);
          }}
          onScoate={() => {
            set((st) => ({ ...st, linii: st.linii.filter((l) => !(l.rubrica === RUBRICI.pluvial && l.culoare && `${l.culoare.finisaj}|${s.sistem}|${l.culoare.ral}` === s.cheie)) }));
            setNoi((p) => p.filter((x) => x.cheie !== s.cheie));
          }}
        />
      ))}
      {poate && (
        <button className="buton secundar" type="button" onClick={() => setNoi((p) => [...p, { cheie: cheieNoua("pl"), finisaj: finisajImplicit, sistem: "125 / 90", ral: "" }])}>
          + Adaugă sistem pluvial
        </button>
      )}
    </section>
  );
}

function SectiunePluvial({ s, idx, finisaje, catalog, stare, set, poate, onSchimba, onScoate }: { s: SistemUI; idx: number; finisaje: string[]; catalog: Catalog; stare: StareEditor; set: (f: (st: StareEditor) => StareEditor) => void; poate: boolean; onSchimba: (n: SistemUI) => void; onScoate: () => void }) {
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
  const linii = culoare ? stare.linii.filter((l) => l.rubrica === RUBRICI.pluvial && l.culoare && `${l.culoare.finisaj}|${s.sistem}|${l.culoare.ral}` === s.cheie) : [];

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
  const gasite = cautare.trim().length >= 2 ? restul.filter((p) => p.denumire.toLowerCase().includes(cautare.trim().toLowerCase())).slice(0, 12) : [];
  const randuri = [...implicite.map((p) => ({ produs: p as ProdusEditor, numeLista: p.numeLista as string | null, linie: linii.find((l) => l.produs.id === p.id) ?? null })), ...linii.filter((l) => !implicite.some((p) => p.id === l.produs.id)).map((l) => ({ produs: l.produs, numeLista: null, linie: l }))];

  return (
    <div className="panou" style={{ borderStyle: "dashed" }}>
      <div className="antet-pagina" style={{ marginBottom: 8 }}>
        <strong>Sistem pluvial {String.fromCharCode(65 + idx)}</strong>
        {poate && (
          <button className="buton secundar mic" type="button" onClick={onScoate}>
            Scoate sistemul
          </button>
        )}
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
                {randuri.map((r) => (
                  <tr key={r.produs.id} className={r.linie ? undefined : "inactiv"}>
                    <td>
                      {r.numeLista ?? r.produs.denumire}
                      <div className="mic text-secundar">
                        {r.produs.denumire} · {r.produs.cod}
                      </div>
                    </td>
                    <td>{r.produs.um.toLowerCase()}</td>
                    <td>
                      <input type="text" inputMode="decimal" value={r.linie?.cantitate ?? ""} onChange={(e) => (e.target.value.trim() === "" && r.linie ? scoate(r.linie.cheie) : seteazaCantitate(r.produs, e.target.value))} disabled={!poate} aria-label={`Cantitate ${r.produs.denumire}`} />
                    </td>
                    <td>
                      {r.linie && poate && (
                        <button className="buton secundar mic" type="button" onClick={() => scoate(r.linie!.cheie)} aria-label="Scoate">
                          ✕
                        </button>
                      )}
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
                      onClick={() => {
                        seteazaCantitate(p, "1");
                        setCautare("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          seteazaCantitate(p, "1");
                          setCautare("");
                        }
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
