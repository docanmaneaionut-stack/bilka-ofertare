import { useEffect, useState, type FormEvent } from "react";
import { apiCurs, dataRo, type CursAzi, type CursZi } from "../api";
import { Ajutor, Camp, Mesaj, textEroare } from "../components/ui";

// Zona tehnica - Curs BNR (FISA-OFERTARE 11.8): cursul valabil acum, ultimele
// cursuri, preluare manuala (BNR, rezerva cursbnr.ro) si introducere manuala
export function CursBnr() {
  const [azi, setAzi] = useState<CursAzi | null>(null);
  const [ultimele, setUltimele] = useState<CursZi[]>([]);
  const [eroare, setEroare] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [curs, setCurs] = useState("");
  const [seLucreaza, setSeLucreaza] = useState(false);

  async function incarca() {
    try {
      const r = await apiCurs.azi();
      setAzi(r.azi);
      setUltimele(r.ultimele);
      setEroare(r.eroare ?? null);
    } catch (e) {
      setEroare(textEroare(e));
    }
  }

  useEffect(() => {
    void incarca();
  }, []);

  async function preia(istoric: boolean) {
    setMesaj(null);
    setSeLucreaza(true);
    try {
      const r = await apiCurs.preia(istoric);
      setMesaj(r.salvate > 0 ? `Preluate ${r.salvate} cursuri (${r.sursa}).` : "Nicio sursă nu a răspuns; rămâne ultimul curs din tabel.");
      await incarca();
    } catch (e) {
      setEroare(textEroare(e));
    } finally {
      setSeLucreaza(false);
    }
  }

  async function manual(e: FormEvent) {
    e.preventDefault();
    setMesaj(null);
    try {
      await apiCurs.manual(data, curs.replace(",", "."));
      setMesaj(`Curs manual salvat pentru ${dataRo(data)}.`);
      setCurs("");
      await incarca();
    } catch (err) {
      setEroare(textEroare(err));
    }
  }

  return (
    <>
      <div className="antet-pagina">
        <h1>Curs BNR</h1>
        <div className="actiuni">
          <button className="buton" onClick={() => preia(false)} disabled={seLucreaza}>
            Preia acum
          </button>
          <button className="buton secundar" onClick={() => preia(true)} disabled={seLucreaza}>
            Preia și istoricul
          </button>
        </div>
      </div>

      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      {mesaj && <Mesaj tip="ok">{mesaj}</Mesaj>}
      {azi?.avertizareCurs && <Mesaj tip="avertizare">{azi.avertizareCurs}</Mesaj>}

      {azi && (
        <div className="grila-totaluri">
          <div>
            <span className="text-secundar mic">Curs valabil acum (documentul)</span>
            <span className="numar-mare">{azi.cursBnr}</span>
          </div>
          <div>
            <span className="text-secundar mic">Curs de achiziție (BNR × 1,01)</span>
            <span className="numar-mare">{azi.cursAchizitie}</span>
          </div>
          <div>
            <span className="text-secundar mic">Data cursului · sursa</span>
            <span style={{ fontWeight: 600 }}>
              {dataRo(azi.dataCurs)} · {azi.sursaCurs}
            </span>
          </div>
        </div>
      )}

      {ultimele.length > 0 && (
        <div className="tabel-invelis" style={{ maxWidth: 560 }}>
          <table className="tabel">
            <thead>
              <tr>
                <th>Data</th>
                <th>Curs EUR</th>
                <th>Sursa</th>
              </tr>
            </thead>
            <tbody>
              {ultimele.map((c) => (
                <tr key={c.data}>
                  <td>{dataRo(c.data)}</td>
                  <td>{c.curs}</td>
                  <td className="mic">{c.sursa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form className="formular" onSubmit={manual} style={{ maxWidth: 560, marginTop: 24 }}>
        <h2>Curs introdus manual</h2>
        <div className="rand-campuri">
          <Camp eticheta="Data" obligatoriu>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </Camp>
          <Camp eticheta="Curs EUR (4 zecimale)" obligatoriu>
            <input type="text" inputMode="decimal" value={curs} onChange={(e) => setCurs(e.target.value)} required pattern="[0-9]+([.,][0-9]{1,4})?" placeholder="5.3485" />
          </Camp>
        </div>
        <div className="actiuni">
          <button className="buton secundar" type="submit">
            Salvează cursul manual
          </button>
        </div>
      </form>

      <Ajutor>
        <ul>
          <li>Cursul se preia automat zilnic după 13:00 din nbrfxrates.xml (BNR), cu cursbnr.ro ca rezervă. Până la 13:00 cursul zilei e cel din ziua precedentă.</li>
          <li>„Preia și istoricul” aduce și fișierele anuale BNR (anul curent și cel precedent), ca tabelul să aibă cursurile trecute.</li>
          <li>Cursul manual e pentru zilele fără internet; sursa rămâne notată pe fiecare curs și pe ofertele create cu el.</li>
        </ul>
      </Ajutor>
    </>
  );
}
