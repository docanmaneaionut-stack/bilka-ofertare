import { useEffect, useState } from "react";
import { apiCatalogEditor, type ProdusEditor, type StructuraOferta } from "../../api";
import { Mesaj, textEroare } from "../../components/ui";
import type { Catalog } from "./Produse";
import { cheieNoua, culoriPentru, ral, RUBRICI, sectiuneaLiniei, type LinieUI, type StareEditor } from "./editor";

type Props = { catalog: Catalog; stare: StareEditor; set: (f: (s: StareEditor) => StareEditor) => void; poate: boolean; structura: StructuraOferta | null };

// Accesoriile speciale la lungimi (FISA-OFERTARE cap. 5): rubrica independenta,
// pe fiecare rand treapta + finisaj + grosime + culoare + pozitii lungime x bucati -> ml
export function Lungimi({ catalog, stare, set, poate, structura }: Props) {
  const [produse, setProduse] = useState<ProdusEditor[]>([]);
  const [eroare, setEroare] = useState<string | null>(null);
  useEffect(() => {
    apiCatalogEditor
      .speciale(RUBRICI.lungimi, {})
      .then((r) => setProduse(r.produse))
      .catch((e) => setEroare(textEroare(e)));
  }, []);

  const linii = stare.linii.filter((l) => l.rubrica === RUBRICI.lungimi);
  const trepte = catalog.ref.trepte;
  const finisaje = [...new Set(produse.map((p) => p.finisaj ?? ""))].filter(Boolean);
  const grosimiPentru = (finisaj: string) => [...new Set(produse.filter((p) => p.finisaj === finisaj).map((p) => p.grosime ?? ""))].filter(Boolean);
  const produsPentru = (treapta: string, finisaj: string, grosime: string) => produse.find((p) => p.treapta === treapta && p.finisaj === finisaj && p.grosime === grosime) ?? null;
  const schimba = (cheie: string, c: Partial<LinieUI>) => set((st) => ({ ...st, linii: st.linii.map((l) => (l.cheie === cheie ? { ...l, ...c } : l)) }));
  const scoate = (cheie: string) => set((st) => ({ ...st, linii: st.linii.filter((l) => l.cheie !== cheie) }));
  const mlCalculat = (l: LinieUI) => structura?.linii.find((x) => x.cod === l.produs.cod)?.cantitate ?? null;

  // schimbarea treptei / finisajului / grosimii schimba produsul; culoarea ramane daca mai exista
  const alege = (l: LinieUI, treapta: string, finisaj: string, grosime: string) => {
    const grosimi = grosimiPentru(finisaj);
    const g = grosimi.includes(grosime) ? grosime : (grosimi[0] ?? "");
    const p = produsPentru(treapta, finisaj, g);
    if (!p) return;
    const culoriNoi = culoriPentru(catalog.ref, p, finisaj, g);
    const ralVechi = l.culoare?.ral ?? "";
    const culoare = { ral: culoriNoi.some((c) => ral(c) === ralVechi) ? ralVechi : "", finisaj, grosime: g };
    schimba(l.cheie, { produs: p, culoare, sectiune: sectiuneaLiniei(RUBRICI.lungimi, null, culoare) });
  };

  const adauga = () => {
    const principala = stare.invelitori[0];
    const finisaj = finisaje.includes(principala?.finisaj) ? principala.finisaj : (finisaje[0] ?? "");
    const grosime = grosimiPentru(finisaj).includes(principala?.grosime) ? principala.grosime : (grosimiPentru(finisaj)[0] ?? "");
    const p = produsPentru(trepte[0]?.treapta ?? "D01", finisaj, grosime);
    if (!p) return;
    const culoare = { ral: "", finisaj, grosime };
    const noua: LinieUI = { cheie: cheieNoua("lin"), rubrica: RUBRICI.lungimi, produs: p, cantitate: "1", invelitoare: null, culoare, pozitii: [{ lungimeM: "", bucati: "" }], sectiune: sectiuneaLiniei(RUBRICI.lungimi, null, culoare), dinLista: false };
    set((st) => ({ ...st, linii: [...st.linii, noua] }));
  };

  return (
    <section className="panou">
      <h2>Accesorii speciale la lungimi</h2>
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      {linii.map((l) => {
        const finisaj = l.culoare?.finisaj ?? l.produs.finisaj ?? "";
        const grosime = l.culoare?.grosime ?? l.produs.grosime ?? "";
        const culori = culoriPentru(catalog.ref, l.produs, finisaj, grosime);
        const interval = trepte.find((t) => t.treapta === l.produs.treapta);
        return (
          <div key={l.cheie} className="panou" style={{ borderStyle: "dashed" }}>
            <div className="rand-campuri">
              <label className="camp">
                <span>Treaptă</span>
                <select value={l.produs.treapta ?? ""} onChange={(e) => alege(l, e.target.value, finisaj, grosime)} disabled={!poate}>
                  {trepte.map((t) => (
                    <option key={t.treapta} value={t.treapta}>
                      {t.treapta} · {t.deLaMm}–{t.panaLaMm} mm
                    </option>
                  ))}
                </select>
              </label>
              <label className="camp">
                <span>Finisaj</span>
                <select value={finisaj} onChange={(e) => alege(l, l.produs.treapta ?? "D01", e.target.value, grosime)} disabled={!poate}>
                  {finisaje.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
              <label className="camp">
                <span>Grosime</span>
                <select value={grosime} onChange={(e) => alege(l, l.produs.treapta ?? "D01", finisaj, e.target.value)} disabled={!poate}>
                  {grosimiPentru(finisaj).map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>
              <label className="camp">
                <span>Culoare</span>
                <select value={l.culoare?.ral ?? ""} onChange={(e) => schimba(l.cheie, { culoare: { ral: e.target.value, finisaj, grosime }, sectiune: sectiuneaLiniei(RUBRICI.lungimi, null, { ral: e.target.value, finisaj, grosime }) })} disabled={!poate}>
                  <option value="">alege…</option>
                  {culori.map((c) => (
                    <option key={c} value={ral(c)}>
                      {ral(c)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mic text-secundar">
              {l.produs.denumire} · {l.produs.cod}
              {interval ? ` · desfășurata ${interval.deLaMm}–${interval.panaLaMm} mm` : ""}
            </p>
            <table className="tabel editabil" style={{ maxWidth: 420 }}>
              <thead>
                <tr>
                  <th>Lungime (m)</th>
                  <th>Bucăți</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(l.pozitii ?? []).map((p, i) => (
                  <tr key={i}>
                    <td>
                      <input type="text" inputMode="decimal" value={p.lungimeM} onChange={(e) => schimba(l.cheie, { pozitii: (l.pozitii ?? []).map((x, j) => (j === i ? { ...x, lungimeM: e.target.value } : x)) })} disabled={!poate} aria-label="Lungime" />
                    </td>
                    <td>
                      <input type="text" inputMode="numeric" value={p.bucati} onChange={(e) => schimba(l.cheie, { pozitii: (l.pozitii ?? []).map((x, j) => (j === i ? { ...x, bucati: e.target.value } : x)) })} disabled={!poate} aria-label="Bucăți" />
                    </td>
                    <td>
                      {poate && (
                        <button className="buton secundar mic" type="button" onClick={() => schimba(l.cheie, { pozitii: (l.pozitii ?? []).filter((_, j) => j !== i) })} aria-label="Scoate poziția">
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="actiuni" style={{ marginTop: 6 }}>
              {poate && (
                <button className="buton secundar mic" type="button" onClick={() => schimba(l.cheie, { pozitii: [...(l.pozitii ?? []), { lungimeM: "", bucati: "" }] })}>
                  + poziție
                </button>
              )}
              <span>{mlCalculat(l) ? <strong>{mlCalculat(l)} ml</strong> : <span className="text-secundar">—</span>}</span>
              {poate && (
                <button className="buton secundar mic" type="button" onClick={() => scoate(l.cheie)}>
                  Scoate rândul
                </button>
              )}
            </div>
          </div>
        );
      })}
      {poate && (
        <div className="actiuni" style={{ justifyContent: "flex-start" }}>
          <button className="buton secundar" type="button" onClick={adauga} disabled={produse.length === 0}>
            + Adaugă accesoriu la lungimi
          </button>
          {produse.length === 0 && <span className="explicatie-buton">Catalogul nu are încă accesorii la lungimi pentru această cheie.</span>}
        </div>
      )}
    </section>
  );
}
