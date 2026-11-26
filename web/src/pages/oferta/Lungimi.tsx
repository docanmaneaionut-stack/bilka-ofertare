import { useEffect, useState } from "react";
import { apiCatalogEditor, type ProdusEditor, type StructuraOferta } from "../../api";
import { BtnSterge } from "../../components/BtnSterge";
import { CasutaCantitate, numarDinText } from "../../components/CasutaCantitate";
import { ScoateBloc } from "../../components/ScoateBloc";
import { Mesaj, textEroare } from "../../components/ui";
import type { Catalog } from "./Produse";
import { cantitateaLiniei, cheieNoua, culoriPentru, ral, RUBRICI, sectiuneaLiniei, type LinieUI, type StareEditor } from "./editor";
import { locCuloare, MESAJ_RAND, stareaRandului } from "./probleme";
import { useRandInLucru } from "./randInLucru";

type Props = { catalog: Catalog; stare: StareEditor; set: (f: (s: StareEditor) => StareEditor) => void; poate: boolean; structura: StructuraOferta | null; iduri?: Map<string, string>; refuzata?: boolean };

const RAND_GOL = { lungimeM: "", bucati: "" };

// Accesoriile speciale la lungimi (FISA-OFERTARE cap. 5): rubrica independenta,
// pe fiecare pozitie treapta + finisaj + grosime + culoare + randuri lungime x bucati -> ml.
// S29b: treapta afisata e cea salvata (BUG-24 c: nu mai apare "D01" si finisajul / grosimea nu mai schimba pe
// tacute treapta); metrii sunt ai pozitiei, cititi dupa linia ei salvata (BUG-24 b: doua pozitii cu acelasi
// produs nu mai arata amandoua metrii primei); randul neterminat / incomplet se marcheaza la iesirea din el
// (BUG-24 a, d); eliminarea pozitiei intregi sta in antetul ei, cu confirmare, iar cosul scoate doar randul (BUG-25).
export function Lungimi({ catalog, stare, set, poate, structura, iduri, refuzata = false }: Props) {
  const [produse, setProduse] = useState<ProdusEditor[]>([]);
  const [eroare, setEroare] = useState<string | null>(null);
  const inLucru = useRandInLucru();
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
  // metrii pozitiei, din rezultatul motorului, dupa linia ei salvata
  const mlCalculat = (l: LinieUI) => cantitateaLiniei(structura, iduri?.get(l.cheie));

  // schimbarea treptei / finisajului / grosimii schimba produsul; culoarea ramane daca mai exista.
  // Fara treapta cunoscuta (produs scos din catalog, fara treapta in denumire) nu se schimba nimic de la sine.
  const alege = (l: LinieUI, treapta: string | null, finisaj: string, grosime: string) => {
    if (!treapta) return;
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
    const noua: LinieUI = { cheie: cheieNoua("lin"), rubrica: RUBRICI.lungimi, produs: p, cantitate: "1", invelitoare: null, culoare, pozitii: [{ ...RAND_GOL }], sectiune: sectiuneaLiniei(RUBRICI.lungimi, null, culoare), dinLista: false };
    set((st) => ({ ...st, linii: [...st.linii, noua] }));
  };

  return (
    <section className="panou">
      <h2>Accesorii speciale la lungimi</h2>
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      {linii.map((l, nr) => {
        const finisaj = l.culoare?.finisaj ?? l.produs.finisaj ?? "";
        const grosime = l.culoare?.grosime ?? l.produs.grosime ?? "";
        const culori = culoriPentru(catalog.ref, l.produs, finisaj, grosime);
        const treapta = l.produs.treapta;
        const interval = trepte.find((t) => t.treapta === treapta);
        const pozitii = l.pozitii ?? [];
        const grup = `lungimi-${l.cheie}`;
        const stari = pozitii.map(stareaRandului);
        const completate = stari.filter((s) => s !== "gol").length;
        const faraCuloare = stari.includes("bun") && !(l.culoare?.ral ?? "").trim();
        // metrii din oferta salvata; cand randurile de pe ecran dau alta suma, cifra e a ofertei salvate, nu a ecranului
        const ml = mlCalculat(l);
        const sumaEcran = pozitii.reduce((s, p, i) => (stari[i] === "bun" ? s + numarDinText(p.lungimeM) * Number(p.bucati) : s), 0);
        const mlVechi = ml !== null && Math.abs(Number(ml) - sumaEcran) > 0.0005;
        // cosul scoate doar randul; ultimul rand ramas se goleste, pozitia nu dispare niciodata din cos
        const scoateRandul = (i: number) => {
          const rest = pozitii.filter((_, j) => j !== i);
          schimba(l.cheie, { pozitii: rest.length > 0 ? rest : [{ ...RAND_GOL }] });
        };
        return (
          <div key={l.cheie} className="panou bloc-randuri" style={{ borderStyle: "dashed" }} data-bloc={`lungimi-${nr + 1}`}>
            <div className="antet-pagina antet-bloc" style={{ marginBottom: 8 }}>
              <strong>
                Accesoriu la lungimi {nr + 1}
                {treapta ? ` · ${treapta}` : ""}
              </strong>
              {poate && <ScoateBloc eticheta="Scoate accesoriul" intrebare={`Ștergi desfășurata${treapta ? ` ${treapta}` : ""} cu ${completate === 1 ? "rândul ei" : `cele ${completate} rânduri`}?`} cuConfirmare={completate > 0} onScoate={() => scoate(l.cheie)} />}
            </div>
            <div className="rand-campuri">
              <label className="camp">
                <span>Treaptă</span>
                <select value={treapta ?? ""} onChange={(e) => alege(l, e.target.value, finisaj, grosime)} disabled={!poate}>
                  {!treapta && <option value="">alege…</option>}
                  {trepte.map((t) => (
                    <option key={t.treapta} value={t.treapta}>
                      {t.treapta} · {t.deLaMm}–{t.panaLaMm} mm
                    </option>
                  ))}
                </select>
              </label>
              <label className="camp">
                <span>Finisaj</span>
                <select value={finisaj} onChange={(e) => alege(l, treapta, e.target.value, grosime)} disabled={!poate || !treapta}>
                  {finisaje.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
              <label className="camp">
                <span>Grosime</span>
                <select value={grosime} onChange={(e) => alege(l, treapta, finisaj, e.target.value)} disabled={!poate || !treapta}>
                  {grosimiPentru(finisaj).map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>
              <label className="camp">
                <span>Culoare</span>
                <select
                  value={l.culoare?.ral ?? ""}
                  onChange={(e) => schimba(l.cheie, { culoare: { ral: e.target.value, finisaj, grosime }, sectiune: sectiuneaLiniei(RUBRICI.lungimi, null, { ral: e.target.value, finisaj, grosime }) })}
                  disabled={!poate}
                  data-loc={locCuloare(l.cheie)}
                  className={faraCuloare ? "cu-problema" : undefined}
                >
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
            {faraCuloare && <p className="mesaj-rand">Alege culoarea: fără ea oferta nu se poate salva.</p>}
            <table className="tabel editabil" style={{ maxWidth: 560 }}>
              <thead>
                <tr>
                  <th>Lungime (m)</th>
                  <th>Bucăți</th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody {...inLucru.pe}>
                {pozitii.map((p, i) => {
                  // marcajul apare la iesirea din rand, nu cat scrii in el
                  const st = inLucru.este(grup, i) ? "bun" : stari[i];
                  const mesaj = MESAJ_RAND[st];
                  return (
                    <tr key={i} className={mesaj ? "rand-cu-problema" : undefined}>
                      <td>
                        <CasutaCantitate value={p.lungimeM} onChange={(v) => schimba(l.cheie, { pozitii: pozitii.map((x, j) => (j === i ? { ...x, lungimeM: v } : x)) })} eticheta={`Lungime poziția ${i + 1}`} disabled={!poate} grup={grup} rand={i} camp="lungime" className={st === "lungimeGresita" || st === "faraLungime" ? "cu-problema" : undefined} />
                      </td>
                      <td>
                        <CasutaCantitate value={p.bucati} onChange={(v) => schimba(l.cheie, { pozitii: pozitii.map((x, j) => (j === i ? { ...x, bucati: v } : x)) })} tip="intreg" eticheta={`Bucăți poziția ${i + 1}`} disabled={!poate} grup={grup} rand={i} camp="bucati" className={st === "faraBucati" ? "cu-problema" : undefined} />
                      </td>
                      <td>{poate && <BtnSterge onClick={() => scoateRandul(i)} eticheta={`Scoate rândul ${i + 1}`} />}</td>
                      <td className="mesaj-rand">{mesaj}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="actiuni" style={{ marginTop: 6, justifyContent: "flex-start" }}>
              {poate && (
                <button className="buton secundar mic" type="button" tabIndex={-1} data-adauga={grup} onClick={() => schimba(l.cheie, { pozitii: [...pozitii, { ...RAND_GOL }] })}>
                  + Adaugă rând
                </button>
              )}
              <span className="ml-pozitie" title={mlVechi ? "cantitatea din oferta salvată; rândurile de pe ecran nu sunt încă în ofertă" : "metri liniari = Σ lungime × bucăți"}>
                {ml ? <strong className={mlVechi ? "ml-vechi" : undefined}>{ml} ml</strong> : <span className="text-secundar">—</span>}
                {mlVechi && refuzata && <span className="mesaj-rand"> în oferta salvată — rândurile de pe ecran nu sunt încă salvate</span>}
              </span>
            </div>
          </div>
        );
      })}
      {poate && (
        <div className="actiuni" style={{ justifyContent: "flex-start" }}>
          <button className="buton adauga" type="button" tabIndex={-1} onClick={adauga} disabled={produse.length === 0}>
            + Adaugă accesoriu la lungimi
          </button>
          {produse.length === 0 && <span className="explicatie-buton">Catalogul nu are încă accesorii la lungimi pentru această cheie.</span>}
        </div>
      )}
    </section>
  );
}
