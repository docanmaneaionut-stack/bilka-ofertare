import { BtnSterge } from "../../components/BtnSterge";
import { CasutaCantitate } from "../../components/CasutaCantitate";
import { Camp } from "../../components/ui";
import type { StareEditor } from "./editor";

// Zona B (FISA-OFERTARE cap. 9): linii integral manuale, in lei, cu "contine TVA"
// si "preia in factura" pe fiecare linie, plus campul liber de precizari
export function ZonaB({ stare, set, poate }: { stare: StareEditor; set: (f: (s: StareEditor) => StareEditor) => void; poate: boolean }) {
  const linii = stare.zonaB;
  const setLinii = (z: StareEditor["zonaB"]) => set((s) => ({ ...s, zonaB: z }));
  const schimba = (i: number, c: Partial<StareEditor["zonaB"][number]>) => setLinii(linii.map((l, j) => (j === i ? { ...l, ...c } : l)));
  return (
    <section className="panou">
      <h2>Zona B — supliment la ofertă</h2>
      {linii.length > 0 && (
        <div className="tabel-invelis">
          <table className="tabel editabil">
            <thead>
              <tr>
                <th>Denumire</th>
                <th>UM</th>
                <th>Cantitate</th>
                <th>Sumă (lei)</th>
                <th>Conține TVA</th>
                <th>Preia în factură</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {linii.map((l, i) => (
                <tr key={i}>
                  <td>
                    <input type="text" value={l.denumire} onChange={(e) => schimba(i, { denumire: e.target.value })} disabled={!poate} aria-label="Denumire" />
                  </td>
                  <td>
                    <input type="text" value={l.um} onChange={(e) => schimba(i, { um: e.target.value })} disabled={!poate} style={{ width: 80 }} aria-label="UM" placeholder="ml, mp, buc, lucrare" />
                  </td>
                  <td>
                    <CasutaCantitate value={l.cantitate} onChange={(v) => schimba(i, { cantitate: v })} eticheta={`Cantitate zona B rândul ${i + 1}`} disabled={!poate} latime={90} grup="zonaB" rand={i} camp="cantitate" />
                  </td>
                  <td>
                    <CasutaCantitate value={l.sumaLei} onChange={(v) => schimba(i, { sumaLei: v })} eticheta={`Sumă lei rândul ${i + 1}`} disabled={!poate} latime={110} grup="zonaB" rand={i} camp="suma" />
                  </td>
                  <td>
                    <input type="checkbox" checked={l.contineTva} onChange={(e) => schimba(i, { contineTva: e.target.checked })} disabled={!poate} aria-label="Conține TVA" />
                  </td>
                  <td>
                    <input type="checkbox" checked={l.preiaInFactura} onChange={(e) => schimba(i, { preiaInFactura: e.target.checked })} disabled={!poate} aria-label="Preia în factură" />
                  </td>
                  <td>
                    {poate && <BtnSterge onClick={() => setLinii(linii.filter((_, j) => j !== i))} eticheta={`Scoate rândul ${i + 1} din zona B`} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {poate && (
        <button className="buton secundar mic" type="button" tabIndex={-1} style={{ marginTop: 8 }} onClick={() => setLinii([...linii, { denumire: "", um: "buc", cantitate: "1", sumaLei: "", contineTva: false, preiaInFactura: false }])}>
          + Adaugă linie în zona B
        </button>
      )}
      <div style={{ marginTop: 12 }}>
        <Camp eticheta="Precizări la zona B (text liber)">
          <textarea value={stare.precizariZonaB} onChange={(e) => set((s) => ({ ...s, precizariZonaB: e.target.value }))} disabled={!poate} rows={2} />
        </Camp>
      </div>
    </section>
  );
}
