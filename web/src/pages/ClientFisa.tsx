import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiClienti, dataRo, ETICHETA_STATUS, momentRelativ, type Client } from "../api";
import { Ajutor, Mesaj, textEroare } from "../components/ui";

type Fisa = Awaited<ReturnType<typeof apiClienti.fisa>>;

// fisa clientului (FISA-OFERTARE cap. 2): datele lui si ofertele lui, in limita
// vizibilitatii contului
export function ClientFisa() {
  const { id } = useParams<{ id: string }>();
  const [fisa, setFisa] = useState<Fisa | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiClienti
      .fisa(id)
      .then(setFisa)
      .catch((e) => setEroare(textEroare(e)));
  }, [id]);

  if (eroare) return <Mesaj tip="eroare">{eroare}</Mesaj>;
  if (!fisa) return null;
  const c: Client = fisa.client;

  return (
    <>
      <div className="antet-pagina">
        <div>
          <h1 style={{ marginBottom: 4 }}>{c.nume}</h1>
          <span className="text-secundar">
            {c.telefon} · {c.adresa}
            {c.localitate ? `, ${c.localitate}` : ""}
            {c.email ? ` · ${c.email}` : ""}
          </span>
        </div>
        <Link className="buton secundar" to="/oferte">
          ← Oferte
        </Link>
      </div>
      {c.observatii && <p>{c.observatii}</p>}

      <h2>Ofertele clientului</h2>
      {fisa.oferte.length === 0 && <Mesaj>Nicio ofertă vizibilă pentru contul tău.</Mesaj>}
      {fisa.oferte.length > 0 && (
        <div className="tabel-invelis">
          <table className="tabel">
            <thead>
              <tr>
                <th>Nr. · data</th>
                <th>Status</th>
                <th className="col-optional">Agent</th>
                <th className="col-optional">Modificat</th>
              </tr>
            </thead>
            <tbody>
              {fisa.oferte.map((o) => (
                <tr key={o.id}>
                  <td className="numar-oferta">
                    <Link to={`/oferte/${o.id}`}>{o.numarComplet}</Link>
                    <div className="mic text-secundar" style={{ fontWeight: 400 }}>
                      {dataRo(o.data)}
                      {o.completareLa ? ` · completare la ${o.completareLa.serie}-${String(o.completareLa.numar).padStart(4, "0")}` : ""}
                    </div>
                  </td>
                  <td>
                    <span className={`status-oferta ${o.status}`}>{ETICHETA_STATUS[o.status]}</span>
                  </td>
                  <td className="col-optional">{o.utilizator.nume}</td>
                  <td className="col-optional mic text-secundar">{momentRelativ(o.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Ajutor>
        <ul>
          <li>Baza de clienți e comună; aici vezi doar ofertele pe care contul tău le poate vedea.</li>
          <li>Datele clientului se modifică din oferta lui (antet și client).</li>
        </ul>
      </Ajutor>
    </>
  );
}
