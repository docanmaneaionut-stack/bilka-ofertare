import { useEffect, useState } from "react";
import { apiCatalogEditor, type ProdusEditor, type StructuraOferta } from "../../api";
import { BtnSterge } from "../../components/BtnSterge";
import { CasutaCantitate } from "../../components/CasutaCantitate";
import { Mesaj, textEroare } from "../../components/ui";
import type { Catalog } from "./Produse";
import { NouaSectiuneDeSine } from "./Rubrica";
import { cheieInvelitoare, cheieNoua, RUBRICI, sectiuneaLiniei, textCheie, type LinieUI, type StareEditor } from "./editor";

type Cheie = { finisaj: string; grosime: string | null; ral: string };
// de cine tine o sectiune de speciale: de o invelitoare (ii mosteneste strict cheia) sau de sine statatoare, cu cheia ei
type Tinta = { invelitoare: string | null; cheie: Cheie };

type Props = { catalog: Catalog; stare: StareEditor; set: (f: (s: StareEditor) => StareEditor) => void; poate: boolean; structura: StructuraOferta | null };

// Accesoriile speciale 2 ML (FISA-OFERTARE cap. 5): 6 randuri presetate pe D01,
// clic pe treapta -> D01-D25 cu intervalul desfasuratei; cantitate in bucati;
// preiau cheia invelitorii principale (buton pentru secundara).
// S27 (MODIFICAREA M9; FISA-OFERTARE 3.8, cap. 5): „+ Accesorii speciale 2 ML de sine stătătoare” - o rubrica
// cu cheia ei aleasa direct (finisaj -> grosime -> culoare), aceleasi 6 randuri presetate; o rubrica per
// cheie, si fara invelitoare pe oferta, si pe langa ea (a doua cheie: inchideri perimetrale intr-o culoare,
// glafuri in alta). La export, fiecare cheie de sine statatoare face un formular fara invelitoare.
// S25 (BUG-8): un rand are aceeasi cheie inainte si dupa prima cifra - randul presetat
// devine linie pastrandu-si identitatea si locul in lista, deci casuta nu se remonteaza.
export function Speciale2ML({ catalog, stare, set, poate }: Props) {
  const principala = stare.invelitori[0];
  const [secundareDeschise, setSecundareDeschise] = useState<string[]>([]);
  const secundare = stare.invelitori.slice(1).filter((i) => i.produsId && i.culoare);
  // rubricile de sine statatoare: cheile liniilor salvate + cele deschise acum (inca fara cantitati)
  const [deschise, setDeschise] = useState<Cheie[]>([]);
  const liniiDeSine = stare.linii.filter((l) => l.rubrica === RUBRICI.speciale2ml && !l.invelitoare && l.culoare);
  const cheiDeSine = [...new Map([...liniiDeSine.map((l) => l.culoare!), ...deschise].map((c) => [textCheie(c), c])).values()];
  return (
    <section className="panou">
      <h2>Accesorii speciale 2 ML</h2>
      {principala?.produsId && principala.culoare ? (
        <SectiuneSpeciale catalog={catalog} stare={stare} set={set} poate={poate} tinta={{ invelitoare: principala.cheie, cheie: cheieInvelitoare(principala) }} titlu={`pentru ${principala.model} · ${textCheie(cheieInvelitoare(principala))}`} />
      ) : (
        cheiDeSine.length === 0 && <Mesaj>Fără învelitoare pe ofertă, accesoriile speciale se aleg de sine stătătoare, cu finisajul, grosimea și culoarea lor — butonul de mai jos.</Mesaj>
      )}
      {secundare.map((inv) =>
        secundareDeschise.includes(inv.cheie) || stare.linii.some((l) => l.invelitoare === inv.cheie && l.rubrica === RUBRICI.speciale2ml) ? (
          <SectiuneSpeciale key={inv.cheie} catalog={catalog} stare={stare} set={set} poate={poate} tinta={{ invelitoare: inv.cheie, cheie: cheieInvelitoare(inv) }} titlu={`pentru învelitoarea secundară ${inv.model} · ${textCheie(cheieInvelitoare(inv))}`} />
        ) : (
          poate && (
            <button key={inv.cheie} className="buton secundar mic" type="button" tabIndex={-1} onClick={() => setSecundareDeschise((d) => [...d, inv.cheie])}>
              + Adaugă accesorii speciale pentru învelitoarea secundară ({inv.model})
            </button>
          )
        ),
      )}
      {cheiDeSine.map((c) => (
        <SectiuneSpeciale key={textCheie(c)} catalog={catalog} stare={stare} set={set} poate={poate} tinta={{ invelitoare: null, cheie: c }} titlu={`de sine stătătoare · ${textCheie(c)}`} />
      ))}
      {poate && <NouaSectiuneDeSine catalog={catalog} eticheta="+ Accesorii speciale 2 ML de sine stătătoare" onAdauga={(c) => setDeschise((d) => (d.some((x) => textCheie(x) === textCheie(c)) ? d : [...d, c]))} />}
    </section>
  );
}

const RANDURI_PRESETATE = 6;

function SectiuneSpeciale({ catalog, stare, set, poate, tinta, titlu }: { catalog: Catalog; stare: StareEditor; set: (f: (s: StareEditor) => StareEditor) => void; poate: boolean; tinta: Tinta; titlu: string }) {
  const [produse, setProduse] = useState<ProdusEditor[]>([]);
  const [eroare, setEroare] = useState<string | null>(null);
  // randurile presetate (fara cantitate inca) stau local, cu cheia lor; cand primesc
  // cantitate devin linii CU ACEEASI CHEIE; ordinea randurilor e ordinea aparitiei
  const [presetate, setPresetate] = useState<{ cheie: string; treapta: string }[]>([]);
  const [ordine, setOrdine] = useState<string[]>([]);
  // sectiunea de sine statatoare isi poarta cheia pe fiecare linie; cea legata o mosteneste de la invelitoare
  const culoareLinie = tinta.invelitoare ? null : tinta.cheie;
  const sectiune = sectiuneaLiniei(RUBRICI.speciale2ml, tinta.invelitoare, culoareLinie);
  const linii = stare.linii.filter((l) => l.sectiune === sectiune);

  useEffect(() => {
    apiCatalogEditor
      .speciale(RUBRICI.speciale2ml, { finisaj: tinta.cheie.finisaj, grosime: tinta.cheie.grosime ?? undefined })
      .then((r) => setProduse(r.produse))
      .catch((e) => setEroare(textEroare(e)));
  }, [tinta.cheie.finisaj, tinta.cheie.grosime]);

  // S27: completarea pana la 6 randuri se face pe starea curenta (nu pe cea de la montare), ca in modul de
  // dezvoltare - unde React ruleaza efectul de doua ori - sa nu apara 12 randuri in loc de 6
  useEffect(() => {
    setPresetate((p) => {
      const lipsa = Math.max(0, RANDURI_PRESETATE - linii.length - p.length);
      return lipsa > 0 ? [...p, ...Array.from({ length: lipsa }, () => ({ cheie: cheieNoua("spec"), treapta: "D01" }))] : p;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linii.length]);
  // randurile presetate noi isi iau locul la sfarsitul ordinii (o singura data fiecare)
  useEffect(() => {
    setOrdine((o) => {
      const noi = presetate.map((x) => x.cheie).filter((k) => !o.includes(k));
      return noi.length > 0 ? [...o, ...noi] : o;
    });
  }, [presetate]);

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
    const noua: LinieUI = { cheie, rubrica: RUBRICI.speciale2ml, produs: p, cantitate, invelitoare: tinta.invelitoare, culoare: culoareLinie, pozitii: null, sectiune, dinLista: true };
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
  const grup = `speciale-${tinta.invelitoare ?? textCheie(tinta.cheie)}`;

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
