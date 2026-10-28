import { useEffect, useState } from "react";
import { apiCatalogEditor, type ProdusEditor, type StructuraOferta } from "../../api";
import { Camp, Mesaj, textEroare } from "../../components/ui";
import type { Catalog } from "./Produse";
import { cheieNoua, culoriPentru, ral, RUBRICI, sectiuneaLiniei, sipciTrimise, type LinieUI, type SipcaUI, type StareEditor } from "./editor";

type Props = { catalog: Catalog; stare: StareEditor; set: (f: (s: StareEditor) => StareEditor) => void; poate: boolean; structura: StructuraOferta | null };

const POZITII_PRESETATE = 5;

// Sipca de gard (FISA-OFERTARE cap. 8): o rubrica = un model (profil x capat) cu
// finisaj -> grosime -> culoare si varianta Comanda (pozitii lungime x bucati) sau
// Calcul (tronsoane -> bucati si ml pe loc, din motor). "+ Adauga rubrica sipca"
// pentru al doilea model (M1): prima merge in blocul primului formular Bilka,
// fiecare urmatoare = formular separat.
export function Sipca({ catalog, stare, set, poate, structura }: Props) {
  const [produse, setProduse] = useState<ProdusEditor[]>([]);
  const [eroare, setEroare] = useState<string | null>(null);
  useEffect(() => {
    apiCatalogEditor
      .sipca()
      .then((r) => setProduse(r.produse))
      .catch((e) => setEroare(textEroare(e)));
  }, []);

  // cantitatile vin in ordinea rubricilor trimise (cele cu linie cu produs)
  const trimise = sipciTrimise(
    stare,
    stare.linii.filter((l) => l.produs.id).map((l) => l.cheie),
  );
  const calculPentru = (s: SipcaUI) => {
    const k = trimise.indexOf(s);
    return k >= 0 ? (structura?.cantitati.sipci[k] ?? null) : null;
  };
  const literaPentru = (s: SipcaUI) => {
    const k = trimise.indexOf(s);
    return k >= 0 ? String.fromCharCode(65 + k) : null;
  };

  const adauga = () =>
    set((st) => ({
      ...st,
      sipci: [...st.sipci, { linie: cheieNoua("sip"), profil: "", capat: "drept", varianta: "comanda", tronsoane: [{ lungimeSipcaM: "", lungimeTronsonM: "", distantaMm: "" }] }],
    }));

  return (
    <section className="panou">
      <h2>Șipcă gard</h2>
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      {stare.sipci.map((s, idx) => (
        <RubricaSipca
          key={s.linie}
          idx={idx}
          litera={literaPentru(s)}
          s={s}
          produse={produse}
          catalog={catalog}
          stare={stare}
          set={set}
          poate={poate}
          calcul={calculPentru(s)}
        />
      ))}
      {poate && (
        <button className="buton secundar" type="button" onClick={adauga}>
          + Adaugă rubrică șipcă
        </button>
      )}
      {stare.sipci.length > 1 && <p className="mic text-secundar">Formularul Bilka acceptă un singur model de șipcă: prima rubrică merge pe primul formular, fiecare rubrică următoare pe un formular separat.</p>}
    </section>
  );
}

type PropsRubrica = {
  idx: number;
  litera: string | null;
  s: SipcaUI;
  produse: ProdusEditor[];
  catalog: Catalog;
  stare: StareEditor;
  set: (f: (s: StareEditor) => StareEditor) => void;
  poate: boolean;
  calcul: StructuraOferta["cantitati"]["sipci"][number] | null;
};

function RubricaSipca({ idx, litera, s, produse, catalog, stare, set, poate, calcul }: PropsRubrica) {
  const linie = stare.linii.find((l) => l.cheie === s.linie) ?? null;
  const profile = [...new Set(produse.map((p) => p.familie ?? ""))].filter(Boolean);
  const aleProfilului = produse.filter((p) => p.familie === s.profil);
  const finisaje = [...new Set(aleProfilului.map((p) => p.finisaj ?? ""))].filter(Boolean);
  const finisaj = linie?.produs.finisaj ?? "";
  const grosimi = [...new Set(aleProfilului.filter((p) => p.finisaj === finisaj).map((p) => p.grosime ?? ""))].filter(Boolean);
  const grosime = linie?.produs.grosime ?? "";
  const culori = linie ? culoriPentru(catalog.ref, linie.produs, finisaj, grosime) : [];

  const setSipca = (f: (x: SipcaUI) => SipcaUI) => set((st) => ({ ...st, sipci: st.sipci.map((x) => (x.linie === s.linie ? f(x) : x)) }));
  const setLinie = (c: Partial<LinieUI>) => set((st) => ({ ...st, linii: st.linii.map((l) => (l.cheie === s.linie ? { ...l, ...c } : l)) }));
  const scoate = () => set((st) => ({ ...st, sipci: st.sipci.filter((x) => x.linie !== s.linie), linii: st.linii.filter((l) => l.cheie !== s.linie) }));

  // alegerea produsului dupa profil + finisaj + grosime; culoarea se pastreaza daca exista
  const alegeProdus = (profil: string, fin: string, gro: string) => {
    const p = produse.find((x) => x.familie === profil && (fin ? x.finisaj === fin : true) && (gro ? x.grosime === gro : true));
    if (!p) return;
    set((st) => {
      const existenta = st.linii.find((l) => l.cheie === s.linie);
      const culoare = existenta?.culoare && culoriPentru(catalog.ref, p, p.finisaj ?? "", p.grosime ?? "").some((c) => ral(c) === existenta.culoare!.ral) ? { ...existenta.culoare, finisaj: p.finisaj ?? "", grosime: p.grosime ?? null } : { ral: "", finisaj: p.finisaj ?? "", grosime: p.grosime ?? null };
      const sectiune = sectiuneaLiniei(RUBRICI.sipca, null, culoare);
      const pozitii = existenta?.pozitii ?? Array.from({ length: POZITII_PRESETATE }, () => ({ lungimeM: "", bucati: "" }));
      const linieNoua: LinieUI = existenta ? { ...existenta, produs: p, culoare, sectiune } : { cheie: s.linie, rubrica: RUBRICI.sipca, produs: p, cantitate: "1", invelitoare: null, culoare, pozitii, sectiune, dinLista: false };
      return {
        ...st,
        sipci: st.sipci.map((x) => (x.linie === s.linie ? { ...x, profil } : x)),
        linii: existenta ? st.linii.map((l) => (l.cheie === existenta.cheie ? linieNoua : l)) : [...st.linii, linieNoua],
      };
    });
  };

  return (
    <div className="sub-sectiune" style={{ marginBottom: 16 }}>
      <div className="antet-pagina" style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>
          Rubrica {idx + 1}
          {litera ? ` · Șipcă ${litera}` : ""}
          {idx > 0 ? " (formular Bilka separat)" : ""}
        </h3>
        {poate && (
          <button className="buton secundar mic" type="button" onClick={scoate}>
            Scoate rubrica
          </button>
        )}
      </div>
      <div className="rand-campuri">
        <Camp eticheta="Profil">
          <select value={s.profil} onChange={(e) => alegeProdus(e.target.value, "", "")} disabled={!poate}>
            <option value="">alege…</option>
            {profile.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Camp>
        <Camp eticheta="Capăt">
          <select value={s.capat} onChange={(e) => setSipca((x) => ({ ...x, capat: e.target.value as "drept" | "rotund" }))} disabled={!poate}>
            <option value="drept">drept</option>
            <option value="rotund">rotund</option>
          </select>
        </Camp>
        <Camp eticheta="Finisaj">
          <select value={finisaj} onChange={(e) => alegeProdus(s.profil, e.target.value, "")} disabled={!poate || !s.profil}>
            <option value="">alege…</option>
            {finisaje.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Camp>
        <Camp eticheta="Grosime">
          <select value={grosime} onChange={(e) => alegeProdus(s.profil, finisaj, e.target.value)} disabled={!poate || !finisaj}>
            <option value="">alege…</option>
            {grosimi.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </Camp>
        <Camp eticheta="Culoare">
          <select value={linie?.culoare?.ral ?? ""} onChange={(e) => linie && setLinie({ culoare: { ...linie.culoare!, ral: e.target.value }, sectiune: sectiuneaLiniei(RUBRICI.sipca, null, { ...linie.culoare!, ral: e.target.value }) })} disabled={!poate || !linie}>
            <option value="">alege…</option>
            {culori.map((c) => (
              <option key={c} value={ral(c)}>
                {ral(c)}
              </option>
            ))}
          </select>
        </Camp>
        <Camp eticheta="Varianta">
          <select value={s.varianta} onChange={(e) => setSipca((x) => ({ ...x, varianta: e.target.value as "comanda" | "calcul" }))} disabled={!poate}>
            <option value="comanda">Comandă (lungime × bucăți)</option>
            <option value="calcul">Calcul (tronsoane)</option>
          </select>
        </Camp>
      </div>
      {linie && (
        <p className="mic text-secundar">
          {linie.produs.denumire} · {linie.produs.cod} · lățimea șipcii {linie.produs.latimeTotalaMm ?? "?"} mm
        </p>
      )}

      {linie && s.varianta === "comanda" && (
        <table className="tabel editabil" style={{ maxWidth: 420 }}>
          <thead>
            <tr>
              <th>Lungime șipcă (m)</th>
              <th>Bucăți</th>
            </tr>
          </thead>
          <tbody>
            {(linie.pozitii ?? []).map((p, i) => (
              <tr key={i}>
                <td>
                  <input type="text" inputMode="decimal" value={p.lungimeM} onChange={(e) => setLinie({ pozitii: (linie.pozitii ?? []).map((x, j) => (j === i ? { ...x, lungimeM: e.target.value } : x)) })} disabled={!poate} aria-label="Lungime" />
                </td>
                <td>
                  <input type="text" inputMode="numeric" value={p.bucati} onChange={(e) => setLinie({ pozitii: (linie.pozitii ?? []).map((x, j) => (j === i ? { ...x, bucati: e.target.value } : x)) })} disabled={!poate} aria-label="Bucăți" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {linie && s.varianta === "comanda" && poate && (
        <button className="buton secundar mic" type="button" style={{ marginTop: 6 }} onClick={() => setLinie({ pozitii: [...(linie.pozitii ?? []), { lungimeM: "", bucati: "" }] })}>
          + Adaugă poziție
        </button>
      )}

      {linie && s.varianta === "calcul" && (
        <>
          <table className="tabel editabil" style={{ maxWidth: 720 }}>
            <thead>
              <tr>
                <th>Lungime șipcă (m)</th>
                <th>Lungime tronson (m)</th>
                <th>Distanța între șipci (mm)</th>
                <th>Bucăți</th>
                <th>ml</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {s.tronsoane.map((t, i) => (
                <tr key={i}>
                  <td>
                    <input type="text" inputMode="decimal" value={t.lungimeSipcaM} onChange={(e) => setSipca((x) => ({ ...x, tronsoane: x.tronsoane.map((y, j) => (j === i ? { ...y, lungimeSipcaM: e.target.value } : y)) }))} disabled={!poate} aria-label="Lungime șipcă" />
                  </td>
                  <td>
                    <input type="text" inputMode="decimal" value={t.lungimeTronsonM} onChange={(e) => setSipca((x) => ({ ...x, tronsoane: x.tronsoane.map((y, j) => (j === i ? { ...y, lungimeTronsonM: e.target.value } : y)) }))} disabled={!poate} aria-label="Lungime tronson" />
                  </td>
                  <td>
                    <input type="text" inputMode="decimal" value={t.distantaMm} onChange={(e) => setSipca((x) => ({ ...x, tronsoane: x.tronsoane.map((y, j) => (j === i ? { ...y, distantaMm: e.target.value } : y)) }))} disabled={!poate} aria-label="Distanța" />
                  </td>
                  <td>{calcul?.tronsoane[i]?.bucati ?? "—"}</td>
                  <td>{calcul?.tronsoane[i]?.ml ?? "—"}</td>
                  <td>
                    {poate && s.tronsoane.length > 1 && (
                      <button className="buton secundar mic" type="button" onClick={() => setSipca((x) => ({ ...x, tronsoane: x.tronsoane.filter((_, j) => j !== i) }))} aria-label="Scoate tronsonul">
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {poate && (
            <button className="buton secundar mic" type="button" style={{ marginTop: 6 }} onClick={() => setSipca((x) => ({ ...x, tronsoane: [...x.tronsoane, { lungimeSipcaM: x.tronsoane[0]?.lungimeSipcaM ?? "", lungimeTronsonM: "", distantaMm: x.tronsoane[0]?.distantaMm ?? "" }] }))}>
              + Adaugă tronson
            </button>
          )}
        </>
      )}
      {calcul && (
        <p>
          <strong>{calcul.bucatiTotal} buc</strong> · <strong>{calcul.mlTotal} ml</strong>
        </p>
      )}
    </div>
  );
}
