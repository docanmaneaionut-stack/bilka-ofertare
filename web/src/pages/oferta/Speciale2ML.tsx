import { useEffect, useState } from "react";
import { apiCatalogEditor, type ProdusEditor, type StructuraOferta } from "../../api";
import { Mesaj, textEroare } from "../../components/ui";
import type { Catalog } from "./Produse";
import { cheieInvelitoare, cheieNoua, RUBRICI, sectiuneaLiniei, textCheie, type InvelitoareUI, type LinieUI, type StareEditor } from "./editor";

type Props = { catalog: Catalog; stare: StareEditor; set: (f: (s: StareEditor) => StareEditor) => void; poate: boolean; structura: StructuraOferta | null };

// Accesoriile speciale 2 ML (FISA-OFERTARE cap. 5): 6 randuri presetate pe D01,
// clic pe treapta -> D01-D25 cu intervalul desfasuratei; cantitate in bucati;
// preiau cheia invelitorii principale (buton pentru secundara).
export function Speciale2ML({ catalog, stare, set, poate }: Props) {
  const principala = stare.invelitori[0];
  const [secundareDeschise, setSecundareDeschise] = useState<string[]>([]);
  const secundare = stare.invelitori.slice(1).filter((i) => i.produsId && i.culoare);
  return (
    <section className="panou">
      <h2>Accesorii speciale 2 ML</h2>
      {principala?.produsId && principala.culoare ? (
        <SectiuneSpeciale catalog={catalog} stare={stare} set={set} poate={poate} inv={principala} titlu={`pentru ${principala.model} · ${textCheie(cheieInvelitoare(principala))}`} />
      ) : (
        <Mesaj>Alege întâi învelitoarea principală, cu finisaj, grosime și culoare.</Mesaj>
      )}
      {secundare.map((inv) =>
        secundareDeschise.includes(inv.cheie) || stare.linii.some((l) => l.invelitoare === inv.cheie && l.rubrica === RUBRICI.speciale2ml) ? (
          <SectiuneSpeciale key={inv.cheie} catalog={catalog} stare={stare} set={set} poate={poate} inv={inv} titlu={`pentru învelitoarea secundară ${inv.model} · ${textCheie(cheieInvelitoare(inv))}`} />
        ) : (
          poate && (
            <button key={inv.cheie} className="buton secundar mic" type="button" onClick={() => setSecundareDeschise((d) => [...d, inv.cheie])}>
              + Adaugă accesorii speciale pentru învelitoarea secundară ({inv.model})
            </button>
          )
        ),
      )}
    </section>
  );
}

const RANDURI_PRESETATE = 6;

function SectiuneSpeciale({ catalog, stare, set, poate, inv, titlu }: { catalog: Catalog; stare: StareEditor; set: (f: (s: StareEditor) => StareEditor) => void; poate: boolean; inv: InvelitoareUI; titlu: string }) {
  const [produse, setProduse] = useState<ProdusEditor[]>([]);
  const [eroare, setEroare] = useState<string | null>(null);
  // randurile presetate (fara cantitate inca) stau local; cand primesc cantitate devin linii
  const [presetate, setPresetate] = useState<{ cheie: string; treapta: string }[]>([]);
  const sectiune = sectiuneaLiniei(RUBRICI.speciale2ml, inv.cheie, null);
  const linii = stare.linii.filter((l) => l.sectiune === sectiune);

  useEffect(() => {
    apiCatalogEditor
      .speciale(RUBRICI.speciale2ml, { finisaj: inv.finisaj, grosime: inv.grosime })
      .then((r) => setProduse(r.produse))
      .catch((e) => setEroare(textEroare(e)));
  }, [inv.finisaj, inv.grosime]);

  useEffect(() => {
    const lipsa = Math.max(0, RANDURI_PRESETATE - linii.length - presetate.length);
    if (lipsa > 0) setPresetate((p) => [...p, ...Array.from({ length: lipsa }, () => ({ cheie: cheieNoua("pre"), treapta: "D01" }))]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linii.length]);

  const produsTreapta = (t: string) => produse.find((p) => p.treapta === t) ?? null;
  const interval = (t: string) => {
    const tr = catalog.ref.trepte.find((x) => x.treapta === t);
    return tr ? `${tr.deLaMm}–${tr.panaLaMm} mm` : "";
  };
  const trepte = catalog.ref.trepte.map((t) => t.treapta);

  const adaugaLinie = (treapta: string, cantitate: string, cheiePresetata?: string) => {
    const p = produsTreapta(treapta);
    if (!p) return;
    const noua: LinieUI = { cheie: cheieNoua("lin"), rubrica: RUBRICI.speciale2ml, produs: p, cantitate, invelitoare: inv.cheie, culoare: null, pozitii: null, sectiune, dinLista: true };
    set((s) => ({ ...s, linii: [...s.linii, noua] }));
    if (cheiePresetata) setPresetate((pr) => pr.filter((x) => x.cheie !== cheiePresetata));
  };
  const schimbaLinie = (cheie: string, c: Partial<LinieUI>) => set((s) => ({ ...s, linii: s.linii.map((l) => (l.cheie === cheie ? { ...l, ...c } : l)) }));
  const scoate = (cheie: string) => set((s) => ({ ...s, linii: s.linii.filter((l) => l.cheie !== cheie) }));

  return (
    <div style={{ marginBottom: 20 }}>
      <p className="mic text-secundar" style={{ margin: "8px 0" }}>
        {titlu}
      </p>
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      <div className="tabel-invelis">
        <table className="tabel editabil">
          <thead>
            <tr>
              <th style={{ width: 160 }}>Treaptă</th>
              <th>Desfășurata</th>
              <th>Produs</th>
              <th style={{ width: 120 }}>Cantitate (buc)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {linii.map((l) => (
              <tr key={l.cheie}>
                <td>
                  <select value={l.produs.treapta ?? ""} onChange={(e) => schimbaLinie(l.cheie, { produs: produsTreapta(e.target.value) ?? l.produs })} disabled={!poate}>
                    {trepte.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="mic">{interval(l.produs.treapta ?? "")}</td>
                <td className="mic">
                  {l.produs.denumire} · {l.produs.cod}
                </td>
                <td>
                  <input type="text" inputMode="numeric" value={l.cantitate} onChange={(e) => (e.target.value.trim() === "" ? scoate(l.cheie) : schimbaLinie(l.cheie, { cantitate: e.target.value }))} disabled={!poate} aria-label="Cantitate" />
                </td>
                <td>
                  {poate && (
                    <button className="buton secundar mic" type="button" onClick={() => scoate(l.cheie)} aria-label="Scoate">
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {presetate.map((p) => (
              <tr key={p.cheie} className="inactiv">
                <td>
                  <select value={p.treapta} onChange={(e) => setPresetate((pr) => pr.map((x) => (x.cheie === p.cheie ? { ...x, treapta: e.target.value } : x)))} disabled={!poate}>
                    {trepte.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="mic">{interval(p.treapta)}</td>
                <td className="mic">{produsTreapta(p.treapta)?.denumire ?? "—"}</td>
                <td>
                  <input type="text" inputMode="numeric" value="" onChange={(e) => e.target.value.trim() && adaugaLinie(p.treapta, e.target.value, p.cheie)} disabled={!poate || !produsTreapta(p.treapta)} aria-label="Cantitate" />
                </td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {poate && (
        <button className="buton secundar mic" type="button" style={{ marginTop: 8 }} onClick={() => setPresetate((pr) => [...pr, { cheie: cheieNoua("pre"), treapta: "D01" }])}>
          + Adaugă accesoriu special
        </button>
      )}
    </div>
  );
}
