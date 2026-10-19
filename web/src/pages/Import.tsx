import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiCompartimente, apiImport, type Compartiment, type ImportPropunere } from "../api";
import { Ajutor, Camp, Mesaj, textEroare } from "../components/ui";
import { dataRo } from "./ListePret";

export function Import() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [compartimente, setCompartimente] = useState<Compartiment[]>([]);
  const [compartimentId, setCompartimentId] = useState(params.get("compartiment") ?? "");
  const [fisiere, setFisiere] = useState<File[]>([]);
  const [istoric, setIstoric] = useState<ImportPropunere[]>([]);
  const [eroare, setEroare] = useState<string | null>(null);
  const [seAnalizeaza, setSeAnalizeaza] = useState(false);

  useEffect(() => {
    apiCompartimente
      .lista()
      .then(({ compartimente }) => {
        setCompartimente(compartimente);
        if (!compartimentId && compartimente.length > 0) setCompartimentId(compartimente[0].id);
      })
      .catch((e) => setEroare(textEroare(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!compartimentId) return;
    apiImport
      .propuneri(compartimentId)
      .then(({ propuneri }) => setIstoric(propuneri))
      .catch((e) => setEroare(textEroare(e)));
  }, [compartimentId]);

  const compartiment = compartimente.find((c) => c.id === compartimentId);

  async function trimite(e: FormEvent) {
    e.preventDefault();
    setEroare(null);
    if (fisiere.length === 0) {
      setEroare("Alege cel puțin un fișier CSV.");
      return;
    }
    setSeAnalizeaza(true);
    try {
      const { propunere } = await apiImport.analiza(compartimentId, fisiere);
      navigate(`/zona-tehnica/import/${propunere.id}`);
    } catch (err) {
      setEroare(textEroare(err));
    } finally {
      setSeAnalizeaza(false);
    }
  }

  return (
    <>
      <h1>Import din CSV</h1>

      <form className="formular" onSubmit={trimite} style={{ maxWidth: 720 }}>
        <Camp eticheta="Compartiment" obligatoriu>
          <select value={compartimentId} onChange={(e) => setCompartimentId(e.target.value)} required>
            {compartimente.map((c) => (
              <option key={c.id} value={c.id}>
                {c.denumire}
                {c.formatImport ? ` (format ${c.formatImport})` : " — fără format de import"}
              </option>
            ))}
          </select>
        </Camp>
        <Camp eticheta="Fișierele CSV" obligatoriu>
          <input type="file" accept=".csv,text/csv" multiple onChange={(e) => setFisiere(Array.from(e.target.files ?? []))} />
        </Camp>
        {fisiere.length > 0 && (
          <p className="text-secundar mic">
            {fisiere.length} fișiere: {fisiere.map((f) => f.name).join(", ")}
          </p>
        )}
        {compartiment && !compartiment.formatImport && <Mesaj tip="avertizare">Compartimentul nu are „format import” completat; importul nu știe cum să citească fișierele.</Mesaj>}
        {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
        <div className="actiuni">
          <button className="buton" type="submit" disabled={seAnalizeaza || !compartimentId}>
            {seAnalizeaza ? "Se analizează…" : "Analizează fișierele"}
          </button>
          <Link className="buton secundar" to={`/zona-tehnica/liste${compartimentId ? `?compartiment=${compartimentId}` : ""}`}>
            Listele de preț
          </Link>
        </div>
      </form>

      {istoric.length > 0 && (
        <>
          <h2>Importuri anterioare</h2>
          <div className="tabel-invelis">
            <table className="tabel">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Fișiere</th>
                  <th>Stare</th>
                  <th>Versiune</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {istoric.map((p) => (
                  <tr key={p.id} className={p.status === "ANULATA" ? "inactiv" : undefined}>
                    <td>
                      {dataRo(p.createdAt)}
                      {p.creatDe && <div className="text-secundar mic">{p.creatDe.nume}</div>}
                    </td>
                    <td className="mic">{p.fisiere.map((f) => f.nume).join(", ")}</td>
                    <td>
                      <span className={`eticheta ${p.status === "PROPUSA" ? "" : "inactiv"}`}>
                        {p.status === "PROPUSA" ? "propusă" : p.status === "CONFIRMATA" ? "confirmată" : "anulată"}
                      </span>
                    </td>
                    <td>{p.listaPretId ? <Link to={`/zona-tehnica/liste/${p.listaPretId}`}>versiunea</Link> : "–"}</td>
                    <td>
                      <Link className="buton secundar mic" to={`/zona-tehnica/import/${p.id}`}>
                        Deschide
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Ajutor>
        <ul>
          <li>Se încarcă fișierele CSV ale compartimentului (la Bilka: cele 9 liste de produse și cele 5 tabele de referință din <code>docs/import/Bilka</code>). Fișierele se recunosc după coloane, nu după nume.</li>
          <li>Analiza nu scrie nimic: arată diferențele față de catalog și față de versiunea activă, raportul pe fișier, erorile și avertizările. Abia „Confirmă importul” scrie, iar versiunea nouă rămâne schiță până o activezi.</li>
          <li>
            <strong>Set complet</strong>: o versiune de prețuri se creează numai dacă sunt încărcate toate listele de produse ale versiunii active (altfel sute de produse ar părea dispărute). Tabelele de referință se pot încărca și singure — actualizează catalogul, nu creează versiune.
          </li>
          <li>
            <strong>Erorile</strong> (rubrică necunoscută, același produs de două ori, preț sau UM necitibile, coloane lipsă, set incomplet) blochează confirmarea — se corectează CSV-ul și se reîncarcă. <strong>Avertizările</strong> (numărători diferite față de versiunea anterioară) nu blochează.
          </li>
          <li>Codul furnizorului poate lipsi (produse noi) și poate să se repete („un cod, două produse”); identitatea unui produs e codul intern, calculat din cod furnizor + denumire. Tabla plană intră ca două produse: la mp (Învelitori) și la coală de 2,5 mp (Accesorii standard).</li>
        </ul>
      </Ajutor>
    </>
  );
}
