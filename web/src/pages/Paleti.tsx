import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiComenzi, dataRo, type RandComanda } from "../api";
import { Ajutor, Mesaj, textEroare } from "../components/ui";

// Evidenta paletilor (S22; FISA-COMENZI cap. 8): comenzile cu nota de palet - numarul
// comenzii, clientul, localitatea, nota, cine / cand a scris-o, statusul nerecuperat /
// recuperat (schimbat doar de Administratori si Admin general, cu istoric si data).
// Implicit nerecuperatii, cei mai vechi sus; filtre: recuperati, client / localitate.
// Fara tipuri sau preturi de paleti - doar nota si statusul.

const dataOra = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

export function Paleti() {
  const [recuperati, setRecuperati] = useState<"nu" | "da" | "toti">("nu");
  const [q, setQ] = useState("");
  const [rezultat, setRezultat] = useState<{ paleti: RandComanda[]; nerecuperati: number; poateSchimbaStatus: boolean } | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [ocupat, setOcupat] = useState<string | null>(null);
  const [versiune, setVersiune] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      apiComenzi
        .paleti({ recuperati, q: q.trim() || undefined })
        .then((r) => {
          setRezultat(r);
          setEroare(null);
        })
        .catch((e) => setEroare(textEroare(e)));
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [recuperati, q, versiune]);

  const schimba = (c: RandComanda, recuperat: boolean) => {
    setOcupat(c.id);
    apiComenzi
      .paletRecuperat(c.id, recuperat)
      .then(() => setVersiune((v) => v + 1))
      .catch((e) => setEroare(textEroare(e)))
      .finally(() => setOcupat(null));
  };

  return (
    <>
      <div className="antet-pagina">
        <div>
          <h1 style={{ marginBottom: 4 }}>Evidența paleților</h1>
          {rezultat && (
            <span className="text-secundar">
              {rezultat.nerecuperati} {rezultat.nerecuperati === 1 ? "palet nerecuperat" : "paleți nerecuperați"} · <Link to="/comenzi">înapoi la comenzi</Link>
            </span>
          )}
        </div>
        <div className="actiuni" style={{ flexWrap: "wrap" }}>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="client sau localitate" aria-label="Caută după client sau localitate" />
          <select value={recuperati} onChange={(e) => setRecuperati(e.target.value as "nu" | "da" | "toti")} aria-label="Statusul paletului">
            <option value="nu">nerecuperați</option>
            <option value="da">recuperați</option>
            <option value="toti">toți</option>
          </select>
        </div>
      </div>
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      {!rezultat && !eroare && <div className="text-secundar">Se încarcă…</div>}
      {rezultat && rezultat.paleti.length === 0 && <p className="text-secundar">Niciun palet {recuperati === "nu" ? "nerecuperat" : recuperati === "da" ? "recuperat" : "notat"}.</p>}
      {rezultat && rezultat.paleti.length > 0 && (
        <table className="tabel tabel-vanzari">
          <thead>
            <tr>
              <th>Comanda</th>
              <th>Client</th>
              <th className="col-optional">Localitate</th>
              <th>Nota de palet</th>
              <th className="col-optional">Notată de</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rezultat.paleti.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.numarComplet}
                  <div className="mic text-secundar">{dataRo(c.data)}</div>
                </td>
                <td>
                  <strong>{c.client.nume}</strong>
                  <div className="mic text-secundar">{c.client.telefon}</div>
                </td>
                <td className="col-optional">{c.client.localitate ?? "—"}</td>
                <td>{c.palet?.nota}</td>
                <td className="col-optional mic text-secundar">
                  {c.palet?.notatDe}, {dataOra(c.palet?.notatLa)}
                </td>
                <td>
                  <span className={`eticheta-palet ${c.palet?.recuperat ? "recuperat" : "nerecuperat"}`}>{c.palet?.recuperat ? "recuperat" : "nerecuperat"}</span>
                  {c.palet?.recuperat && c.palet.recuperatDe && (
                    <div className="mic text-secundar">
                      {c.palet.recuperatDe}, {dataOra(c.palet.recuperatLa)}
                    </div>
                  )}
                  {rezultat.poateSchimbaStatus && c.palet && (
                    <label className="mic" style={{ marginLeft: 8 }}>
                      <input type="checkbox" checked={c.palet.recuperat} disabled={ocupat === c.id} onChange={(e) => schimba(c, e.target.checked)} aria-label={`palet recuperat ${c.numarComplet}`} /> recuperat
                    </label>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Ajutor>
        <ul>
          <li>Nota de palet se scrie pe comandă (caseta „Livrare și facturare”), de Gestiune sau de un Administrator, cu istoric — text liber: ce palet a rămas și unde. Se poate scrie și pe comenzile închise.</li>
          <li>Statusul „recuperat” îl bifează un Administrator sau Admin general, cu data și istoric. Implicit aici sunt paleții nerecuperați, cei mai vechi sus; numărul lor apare și în capul tabelului de comenzi, peste toate comenzile vizibile, indiferent de perioadă.</li>
          <li>Nu se țin tipuri sau prețuri de paleți — doar nota și statusul.</li>
        </ul>
      </Ajutor>
    </>
  );
}
