import { useEffect, useState } from "react";
import { apiCatalogEditor, type ProdusEditor, type StructuraOferta } from "../../api";
import { BtnSterge } from "../../components/BtnSterge";
import { CasutaCantitate } from "../../components/CasutaCantitate";
import { Mesaj, textEroare } from "../../components/ui";
import type { Catalog } from "./Produse";
import { cheieInvelitoare, cheieNoua, RUBRICI, sectiuneaLiniei, textCheie, type InvelitoareUI, type LinieUI, type StareEditor } from "./editor";

type Props = { catalog: Catalog; stare: StareEditor; set: (f: (s: StareEditor) => StareEditor) => void; poate: boolean; structura: StructuraOferta | null };

// Accesoriile speciale 2 ML (FISA-OFERTARE cap. 5): 6 randuri presetate pe D01,
// clic pe treapta -> D01-D25 cu intervalul desfasuratei; cantitate in bucati;
// preiau cheia invelitorii principale (buton pentru secundara).
// S25 (BUG-8): un rand are aceeasi cheie inainte si dupa prima cifra - randul presetat
// devine linie pastrandu-si identitatea si locul in lista, deci casuta nu se remonteaza.
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
            <button key={inv.cheie} className="buton secundar mic" type="button" tabIndex={-1} onClick={() => setSecundareDeschise((d) => [...d, inv.cheie])}>
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
  // randurile presetate (fara cantitate inca) stau local, cu cheia lor; cand primesc
  // cantitate devin linii CU ACEEASI CHEIE; ordinea randurilor e ordinea aparitiei
  const [presetate, setPresetate] = useState<{ cheie: string; treapta: string }[]>([]);
  const [ordine, setOrdine] = useState<string[]>([]);
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
    if (lipsa > 0) {
      const noi = Array.from({ length: lipsa }, () => ({ cheie: cheieNoua("spec"), treapta: "D01" }));
      setPresetate((p) => [...p, ...noi]);
      setOrdine((o) => [...o, ...noi.map((n) => n.cheie)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linii.length]);

  const produsTreapta = (t: string) => produse.find((p) => p.treapta === t) ?? null;
  const interval = (t: string) => {
    const tr = catalog.ref.trepte.find((x) => x.treapta === t);
    return tr ? `${tr.deLaMm}–${tr.panaLaMm} mm` : "";
  };
  const trepte = catalog.ref.trepte.map((t) => t.treapta);

  // randul presetat devine linie cu aceeasi cheie (BUG-8)
  const adaugaLinie = (cheie: string, treapta: string, cantitate: string) => {
    const p = produsTreapta(treapta);
    if (!p) return;
    const noua: LinieUI = { cheie, rubrica: RUBRICI.speciale2ml, produs: p, cantitate, invelitoare: inv.cheie, culoare: null, pozitii: null, sectiune, dinLista: true };
    set((s) => ({ ...s, linii: [...s.linii, noua] }));
    setPresetate((pr) => pr.filter((x) => x.cheie !== cheie));
  };
  const schimbaLinie = (cheie: string, c: Partial<LinieUI>) => set((s) => ({ ...s, linii: s.linii.map((l) => (l.cheie === cheie ? { ...l, ...c } : l)) }));
  // linia golita redevine rand presetat, pe acelasi loc, cu treapta ei
  const goleste = (l: LinieUI) => {
    set((s) => ({ ...s, linii: s.linii.filter((x) => x.cheie !== l.cheie) }));
    setPresetate((pr) => [...pr, { cheie: l.cheie, treapta: l.produs.treapta ?? "D01" }]);
  };
  // cosul scoate randul de tot
  const scoate = (cheie: string) => {
    set((s) => ({ ...s, linii: s.linii.filter((x) => x.cheie !== cheie) }));
    setPresetate((pr) => pr.filter((x) => x.cheie !== cheie));
    setOrdine((o) => o.filter((x) => x !== cheie));
  };
  const adaugaPresetat = () => {
    const n = { cheie: cheieNoua("spec"), treapta: "D01" };
    setPresetate((pr) => [...pr, n]);
    setOrdine((o) => [...o, n.cheie]);
  };

  // randurile in ordinea aparitiei: liniile salvate (fara loc in ordine) primele, apoi ordinea locala
  const chei = [...linii.filter((l) => !ordine.includes(l.cheie)).map((l) => l.cheie), ...ordine];
  const randuri = chei
    .map((cheie) => {
      const linie = linii.find((l) => l.cheie === cheie);
      if (linie) return { cheie, linie, treapta: linie.produs.treapta ?? "D01" };
      const pre = presetate.find((p) => p.cheie === cheie);
      return pre ? { cheie, linie: null, treapta: pre.treapta } : null;
    })
    .filter((r): r is { cheie: string; linie: LinieUI | null; treapta: string } => r !== null);
  const grup = `speciale-${inv.cheie}`;

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="banda">{titlu}</div>
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
            {randuri.map((r, idx) => (
              <tr key={r.cheie} className={r.linie ? undefined : "inactiv"}>
                <td>
                  <select
                    value={r.treapta}
                    onChange={(e) => (r.linie ? schimbaLinie(r.cheie, { produs: produsTreapta(e.target.value) ?? r.linie!.produs }) : setPresetate((pr) => pr.map((x) => (x.cheie === r.cheie ? { ...x, treapta: e.target.value } : x))))}
                    disabled={!poate}
                    aria-label={`Treapta rândul ${idx + 1}`}
                  >
                    {trepte.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="mic">{interval(r.treapta)}</td>
                <td className="mic">{r.linie ? `${r.linie.produs.denumire} · ${r.linie.produs.cod}` : (produsTreapta(r.treapta)?.denumire ?? "—")}</td>
                <td>
                  <CasutaCantitate
                    value={r.linie?.cantitate ?? ""}
                    onChange={(v) => (r.linie ? (v.trim() === "" ? goleste(r.linie) : schimbaLinie(r.cheie, { cantitate: v })) : v.trim() ? adaugaLinie(r.cheie, r.treapta, v) : undefined)}
                    tip="intreg"
                    eticheta={`Cantitate rândul ${idx + 1}`}
                    disabled={!poate || (!r.linie && !produsTreapta(r.treapta))}
                    grup={grup}
                    rand={idx}
                    camp="cantitate"
                  />
                </td>
                <td>{poate && <BtnSterge onClick={() => scoate(r.cheie)} eticheta={`Scoate rândul ${idx + 1}`} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {poate && (
        <button className="buton adauga mic" type="button" tabIndex={-1} style={{ marginTop: 8 }} data-adauga={grup} onClick={adaugaPresetat}>
          + Adaugă accesoriu special
        </button>
      )}
    </div>
  );
}
