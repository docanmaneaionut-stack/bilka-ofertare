import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiCompartimente, apiListe, type Compartiment, type ListaPret } from "../api";
import { Ajutor, Camp, Mesaj, textEroare } from "../components/ui";

export const ETICHETA_STATUS: Record<ListaPret["status"], string> = {
  SCHITA: "schiță",
  ACTIVA: "activă",
  ARHIVATA: "arhivată",
  ANULATA: "anulată",
};

export function dataRo(v: string | null | undefined) {
  if (!v) return "–";
  return new Date(v).toLocaleDateString("ro-RO");
}

export function ListePret() {
  const [params, setParams] = useSearchParams();
  const compartimentId = params.get("compartiment") ?? "";
  const [compartimente, setCompartimente] = useState<Compartiment[]>([]);
  const [liste, setListe] = useState<ListaPret[] | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);

  useEffect(() => {
    apiCompartimente
      .lista()
      .then(({ compartimente }) => {
        setCompartimente(compartimente);
        if (!compartimentId && compartimente.length > 0) setParams({ compartiment: compartimente[0].id }, { replace: true });
      })
      .catch((e) => setEroare(textEroare(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function incarca() {
    if (!compartimentId) return;
    try {
      const { liste } = await apiListe.peCompartiment(compartimentId);
      setListe(liste);
    } catch (e) {
      setEroare(textEroare(e));
    }
  }

  useEffect(() => {
    setListe(null);
    void incarca();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compartimentId]);

  async function activeaza(l: ListaPret) {
    setEroare(null);
    setMesaj(null);
    try {
      const { arhivata } = await apiListe.activeaza(l.id);
      setMesaj(`„${l.denumire}” e acum versiunea activă${arhivata ? `; „${arhivata.denumire}” a fost arhivată` : ""}.`);
      await incarca();
    } catch (e) {
      setEroare(textEroare(e));
    }
  }

  async function anuleaza(l: ListaPret) {
    setEroare(null);
    setMesaj(null);
    try {
      await apiListe.anuleaza(l.id);
      setMesaj(`Schița „${l.denumire}” a fost anulată (rămâne în istoric).`);
      await incarca();
    } catch (e) {
      setEroare(textEroare(e));
    }
  }

  const compartiment = compartimente.find((c) => c.id === compartimentId);

  return (
    <>
      <div className="antet-pagina">
        <h1>Liste de preț</h1>
        <Link className="buton" to={`/zona-tehnica/import${compartimentId ? `?compartiment=${compartimentId}` : ""}`}>
          Import din CSV
        </Link>
      </div>

      <div className="rand-campuri" style={{ marginBottom: 24, maxWidth: 420 }}>
        <Camp eticheta="Compartiment">
          <select value={compartimentId} onChange={(e) => setParams({ compartiment: e.target.value })}>
            {compartimente.length === 0 && <option value="">— niciun compartiment —</option>}
            {compartimente.map((c) => (
              <option key={c.id} value={c.id}>
                {c.denumire}
              </option>
            ))}
          </select>
        </Camp>
      </div>

      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      {mesaj && <Mesaj tip="ok">{mesaj}</Mesaj>}

      {liste && liste.length === 0 && <Mesaj>Nicio versiune de prețuri {compartiment ? `pentru ${compartiment.denumire}` : ""} încă.</Mesaj>}

      {liste && liste.length > 0 && (
        <div className="tabel-invelis">
          <table className="tabel">
            <thead>
              <tr>
                <th>Versiune</th>
                <th>Valabilă de la</th>
                <th>Stare</th>
                <th>Prețuri</th>
                <th>Creată</th>
                <th>Activată</th>
                <th>Arhivată</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {liste.map((l) => (
                <tr key={l.id} className={l.status === "ARHIVATA" || l.status === "ANULATA" ? "inactiv" : undefined}>
                  <td>
                    <strong>{l.denumire}</strong>
                    {l.sursa && <div className="text-secundar mic">{l.sursa}</div>}
                  </td>
                  <td>{dataRo(l.valabilaDeLa)}</td>
                  <td>
                    <span className={`eticheta ${l.status === "ACTIVA" ? "" : "inactiv"}`}>{ETICHETA_STATUS[l.status]}</span>
                  </td>
                  <td>{l._count?.preturi ?? "–"}</td>
                  <td className="mic">
                    {dataRo(l.createdAt)}
                    {l.creataDe && <div className="text-secundar">{l.creataDe.nume}</div>}
                  </td>
                  <td>{dataRo(l.activataLa)}</td>
                  <td>{dataRo(l.arhivataLa)}</td>
                  <td>
                    <div className="actiuni">
                      <Link className="buton secundar mic" to={`/zona-tehnica/liste/${l.id}`}>
                        Raport
                      </Link>
                      {l.status === "SCHITA" && (
                        <>
                          <button className="buton mic" onClick={() => activeaza(l)}>
                            Activează
                          </button>
                          <button className="buton secundar mic" onClick={() => anuleaza(l)}>
                            Anulează
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Ajutor>
        <ul>
          <li>
            O <strong>versiune</strong> de prețuri = toate prețurile unui compartiment la o dată. Se creează din import (sau, la Stoc, automat la primul preț manual).
          </li>
          <li>
            Stări: <strong>schiță</strong> (creată, neactivată) → <strong>activă</strong> (o singură versiune activă per compartiment; ea dă prețurile) → <strong>arhivată</strong> (când se activează alta). O schiță se poate <strong>anula</strong>; nimic nu se șterge.
          </li>
          <li>
            „Activează” arhivează automat versiunea activă de până atunci. <strong>O versiune arhivată nu se mai modifică și nu redevine activă niciodată</strong> — istoricul rămâne liniar. Revenirea la prețuri vechi = reimportul fișierelor acelei versiuni ca versiune nouă.
          </li>
          <li>„Raport” arată fișierele sursă (păstrate pe disc) și numărătorile importului.</li>
        </ul>
      </Ajutor>
    </>
  );
}
