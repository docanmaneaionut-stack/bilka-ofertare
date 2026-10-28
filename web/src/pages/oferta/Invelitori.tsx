import type { StructuraOferta } from "../../api";
import { Camp } from "../../components/ui";
import type { Catalog } from "./Produse";
import {
  culoriPentru,
  deModel,
  finisaje,
  grosimi,
  invelitoareGoala,
  invelitoriTrimise,
  latimeDinCatalog,
  modele,
  optiuni,
  produsAles,
  ral,
  tipuri,
  variantePentru,
  type InvelitoareUI,
  type StareEditor,
} from "./editor";

type Props = { catalog: Catalog; stare: StareEditor; set: (f: (s: StareEditor) => StareEditor) => void; poate: boolean; structura: StructuraOferta | null };

// Invelitorile (FISA-OFERTARE cap. 3): cascada tip -> model (-> varianta de profil
// / optiune) -> finisaj -> grosime -> culoare; cele trei moduri de cantitate
export function Invelitori({ catalog, stare, set, poate, structura }: Props) {
  const seteaza = (cheie: string, schimba: (i: InvelitoareUI) => InvelitoareUI) =>
    set((s) => ({ ...s, invelitori: s.invelitori.map((i) => (i.cheie === cheie ? schimba(i) : i)) }));
  // M1: cantitatile vin pe id-ul din baza, necunoscut pe ecran; ordinea e aceeasi
  // cu a invelitorilor trimise (doua invelitori cu acelasi produs se disting asa)
  const trimise = invelitoriTrimise(stare);
  const calculPentru = (inv: InvelitoareUI) => {
    const k = trimise.indexOf(inv);
    return k >= 0 ? (structura?.cantitati.invelitori[k] ?? null) : null;
  };

  return (
    <section className="panou">
      <h2>Învelitori</h2>
      {stare.invelitori.map((inv, idx) => (
        <InvelitoareRand
          key={inv.cheie}
          inv={inv}
          idx={idx}
          catalog={catalog}
          poate={poate}
          calcul={calculPentru(inv)}
          onSchimba={(f) => seteaza(inv.cheie, f)}
          onSterge={idx > 0 ? () => set((s) => ({ ...s, invelitori: s.invelitori.filter((i) => i.cheie !== inv.cheie), linii: s.linii.filter((l) => l.invelitoare !== inv.cheie) })) : undefined}
        />
      ))}
      {poate && (
        <button className="buton secundar" type="button" onClick={() => set((s) => ({ ...s, invelitori: [...s.invelitori, invelitoareGoala()] }))}>
          + Adaugă învelitoare
        </button>
      )}
    </section>
  );
}

function InvelitoareRand({
  inv,
  idx,
  catalog,
  poate,
  calcul,
  onSchimba,
  onSterge,
}: {
  inv: InvelitoareUI;
  idx: number;
  catalog: Catalog;
  poate: boolean;
  calcul: StructuraOferta["cantitati"]["invelitori"][number] | null;
  onSchimba: (f: (i: InvelitoareUI) => InvelitoareUI) => void;
  onSterge?: () => void;
}) {
  const produse = catalog.invelitori;
  const listaTipuri = tipuri(produse);
  const listaModele = inv.tip ? modele(produse, inv.tip) : [];
  const aleModelului = inv.tip && inv.model ? deModel(produse, inv.tip, inv.model) : [];
  const variante = inv.model ? variantePentru(catalog.ref, inv.model) : [];
  const listaOptiuni = optiuni(aleModelului);
  const listaFinisaje = finisaje(aleModelului, inv.optiune);
  const listaGrosimi = inv.finisaj ? grosimi(aleModelului, inv.optiune, inv.finisaj) : [];
  const produs = inv.produsId ? (produse.find((p) => p.id === inv.produsId) ?? null) : null;
  const culori = produs ? culoriPentru(catalog.ref, produs, inv.finisaj, inv.grosime) : [];

  // orice schimbare in cascada recalculeaza produsul si reseteaza ce nu mai e valabil
  const alege = (schimbari: Partial<InvelitoareUI>) =>
    onSchimba((i) => {
      const n = { ...i, ...schimbari };
      const ale = n.tip && n.model ? deModel(produse, n.tip, n.model) : [];
      if (!optiuni(ale).includes(n.optiune)) n.optiune = optiuni(ale)[0] ?? "";
      if (!finisaje(ale, n.optiune).includes(n.finisaj)) n.finisaj = "";
      if (!grosimi(ale, n.optiune, n.finisaj).includes(n.grosime)) n.grosime = "";
      const p = n.finisaj && n.grosime ? produsAles(ale, n.optiune, n.finisaj, n.grosime) : null;
      n.produsId = p?.id ?? null;
      if (p && p.id !== i.produsId) n.latimeTotalaM = latimeDinCatalog(p);
      const culoriNoi = p ? culoriPentru(catalog.ref, p, n.finisaj, n.grosime) : [];
      if (!culoriNoi.some((c) => ral(c) === n.culoare)) n.culoare = "";
      return n;
    });

  const pozitii = inv.panotaj;
  const setPozitii = (p: InvelitoareUI["panotaj"]) => onSchimba((i) => ({ ...i, panotaj: p }));

  return (
    <div className="panou" style={{ borderStyle: idx === 0 ? "solid" : "dashed" }}>
      <div className="antet-pagina" style={{ marginBottom: 8 }}>
        <strong>{idx === 0 ? "Învelitoarea principală" : `Învelitoare secundară ${idx + 1}`}</strong>
        {onSterge && poate && (
          <button className="buton secundar mic" type="button" onClick={onSterge}>
            Scoate învelitoarea
          </button>
        )}
      </div>
      <div className="rand-campuri">
        <Camp eticheta="Tip">
          <select value={inv.tip} onChange={(e) => alege({ tip: e.target.value, model: "" })} disabled={!poate}>
            <option value="">alege…</option>
            {listaTipuri.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Camp>
        <Camp eticheta="Model">
          <select value={inv.model} onChange={(e) => alege({ model: e.target.value })} disabled={!poate || !inv.tip}>
            <option value="">alege…</option>
            {listaModele.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Camp>
        {variante.length > 0 && (
          <Camp eticheta="Varianta de profil">
            <select value={inv.variantaProfil} onChange={(e) => onSchimba((i) => ({ ...i, variantaProfil: e.target.value }))} disabled={!poate}>
              <option value="">alege…</option>
              {variante.map((v) => (
                <option key={v.variantaProfil} value={v.variantaProfil}>
                  {v.variantaProfil}
                  {v.restrictii ? ` (${v.restrictii})` : ""}
                </option>
              ))}
            </select>
          </Camp>
        )}
        {listaOptiuni.length > 1 && (
          <Camp eticheta="Opțiune">
            <select value={inv.optiune} onChange={(e) => alege({ optiune: e.target.value })} disabled={!poate}>
              {listaOptiuni.map((o) => (
                <option key={o} value={o}>
                  {o || "fără"}
                </option>
              ))}
            </select>
          </Camp>
        )}
        <Camp eticheta="Finisaj">
          <select value={inv.finisaj} onChange={(e) => alege({ finisaj: e.target.value })} disabled={!poate || !inv.model}>
            <option value="">alege…</option>
            {listaFinisaje.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Camp>
        <Camp eticheta="Grosime">
          <select value={inv.grosime} onChange={(e) => alege({ grosime: e.target.value })} disabled={!poate || !inv.finisaj}>
            <option value="">alege…</option>
            {listaGrosimi.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </Camp>
        <Camp eticheta="Culoare">
          <select value={inv.culoare} onChange={(e) => onSchimba((i) => ({ ...i, culoare: e.target.value }))} disabled={!poate || !produs}>
            <option value="">alege…</option>
            {culori.map((c) => (
              <option key={c} value={ral(c)}>
                {ral(c)}
              </option>
            ))}
          </select>
        </Camp>
        <Camp eticheta="Lățime totală (m)">
          <input type="text" inputMode="decimal" value={inv.latimeTotalaM} onChange={(e) => onSchimba((i) => ({ ...i, latimeTotalaM: e.target.value }))} disabled={!poate || !produs} />
        </Camp>
        {produs?.modulCm && (
          <Camp eticheta="Modul (cm)">
            <input type="text" value={produs.modulCm} readOnly />
          </Camp>
        )}
      </div>
      {produs && (
        <p className="mic text-secundar">
          {produs.denumire} · {produs.cod}
        </p>
      )}

      <div className="rand-campuri" style={{ marginTop: 12, alignItems: "start" }}>
        <Camp eticheta="Suprafață directă (mp)">
          <input type="text" inputMode="decimal" value={inv.mpDirect} onChange={(e) => onSchimba((i) => ({ ...i, mpDirect: e.target.value }))} disabled={!poate} placeholder="ex. 148.000" />
        </Camp>
        <div className="camp" style={{ gridColumn: "span 2" }}>
          <span>Panotaj: lungime (m) × bucăți</span>
          <table className="tabel editabil" style={{ maxWidth: 420 }}>
            <thead>
              <tr>
                <th>Lungime (m)</th>
                <th>Bucăți</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pozitii.map((p, i) => (
                <tr key={i}>
                  <td>
                    <input type="text" inputMode="decimal" value={p.lungimeM} onChange={(e) => setPozitii(pozitii.map((x, j) => (j === i ? { ...x, lungimeM: e.target.value } : x)))} disabled={!poate} aria-label={`Lungime poziția ${i + 1}`} />
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={p.bucati}
                      onChange={(e) => setPozitii(pozitii.map((x, j) => (j === i ? { ...x, bucati: e.target.value } : x)))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && i === pozitii.length - 1) setPozitii([...pozitii, { lungimeM: "", bucati: "" }]);
                      }}
                      disabled={!poate}
                      aria-label={`Bucăți poziția ${i + 1}`}
                    />
                  </td>
                  <td>
                    {poate && (
                      <button className="buton secundar mic" type="button" onClick={() => setPozitii(pozitii.length > 1 ? pozitii.filter((_, j) => j !== i) : [{ lungimeM: "", bucati: "" }])} aria-label="Șterge poziția">
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {poate && (
            <div className="actiuni" style={{ marginTop: 6 }}>
              <button className="buton secundar mic" type="button" onClick={() => setPozitii([...pozitii, { lungimeM: "", bucati: "" }])}>
                + poziție
              </button>
              <button className="buton secundar mic" type="button" onClick={() => setPozitii([...pozitii].sort((a, b) => Number(b.lungimeM.replace(",", ".")) - Number(a.lungimeM.replace(",", "."))))}>
                Sortează descrescător
              </button>
            </div>
          )}
        </div>
        <div className="camp">
          <span>Rezultat</span>
          {calcul ? (
            <span>
              <span className="numar-mare">{calcul.mp} mp</span>
              <span className="mic text-secundar"> · {calcul.coli} coli{calcul.integralPanotata ? "" : " · nu se poate comanda așa (mp direct)"}</span>
            </span>
          ) : (
            <span className="text-secundar">—</span>
          )}
        </div>
      </div>
    </div>
  );
}
