import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiClienti, dataRo, ETICHETA_STATUS, momentRelativ, type Client } from "../api";
import { BtnSterge } from "../components/BtnSterge";
import { Ajutor, Mesaj, textEroare } from "../components/ui";

type Fisa = Awaited<ReturnType<typeof apiClienti.fisa>>;

// S28 (BUG-19): campurile care se pot sterge explicit din fisa (telefonul nu - se inlocuieste)
type CampDeSters = "email" | "observatii" | "adresa";
const ETICHETA_CAMP: Record<CampDeSters, string> = { email: "e-mailul", observatii: "observațiile", adresa: "adresa" };

// fisa clientului (FISA-OFERTARE cap. 2): datele lui si ofertele lui, in limita
// vizibilitatii contului. S28 (BUG-19): cosul de langa e-mail, observatii si adresa sterge campul, dupa o
// confirmare, cu jurnal - singurul drum pe care un camp al fisei se goleste (BUG-17: campul lasat gol la
// salvarea ofertei nu sterge nimic)
export function ClientFisa() {
  const { id } = useParams<{ id: string }>();
  const [fisa, setFisa] = useState<Fisa | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [deSters, setDeSters] = useState<CampDeSters | null>(null);
  const [ocupat, setOcupat] = useState(false);
  const [eroareStergere, setEroareStergere] = useState<string | null>(null);

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
  const adresa = c.adresa && c.adresa !== "-" ? c.adresa : null;
  const valoare: Record<CampDeSters, string | null> = { email: c.email || null, observatii: c.observatii || null, adresa };
  const sterge = (camp: CampDeSters) => {
    if (!id) return;
    setOcupat(true);
    setEroareStergere(null);
    apiClienti
      .stergeCamp(id, camp)
      .then((r) => setFisa((v) => (v ? { ...v, client: r.client } : v)))
      .catch((e) => setEroareStergere(textEroare(e)))
      .finally(() => {
        setOcupat(false);
        setDeSters(null);
      });
  };
  const cos = (camp: CampDeSters) => (fisa.poateSterge && valoare[camp] ? <BtnSterge eticheta={`Șterge ${ETICHETA_CAMP[camp]} din fișă`} disabled={ocupat} onClick={() => setDeSters(camp)} /> : null);

  return (
    <>
      <div className="antet-pagina">
        <div>
          <h1 style={{ marginBottom: 4 }}>{c.nume}</h1>
          <span className="text-secundar">{c.telefon ?? "fără telefon"}</span>
        </div>
        <Link className="buton secundar" to="/oferte">
          ← Oferte
        </Link>
      </div>
      <dl className="date-client">
        <dt>Adresa</dt>
        <dd>
          <span>{[adresa ?? "fără adresă", c.localitate].filter(Boolean).join(", ")}</span>
          {cos("adresa")}
        </dd>
        <dt>E-mail</dt>
        <dd>
          <span>{c.email || "—"}</span>
          {cos("email")}
        </dd>
        <dt>Observații</dt>
        <dd>
          <span>{c.observatii || "—"}</span>
          {cos("observatii")}
        </dd>
      </dl>
      {deSters && (
        <div className="confirmare-stergere" role="alertdialog" aria-label="Confirmarea ștergerii">
          <span>
            Ștergi {ETICHETA_CAMP[deSters]} „{valoare[deSters]}” din fișa clientului?
          </span>
          <button type="button" className="buton sterge" disabled={ocupat} onClick={() => sterge(deSters)}>
            Da, șterge
          </button>
          <button type="button" className="buton secundar" disabled={ocupat} onClick={() => setDeSters(null)}>
            Nu
          </button>
        </div>
      )}
      {eroareStergere && <Mesaj tip="eroare">{eroareStergere}</Mesaj>}

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
          <li>Datele clientului se modifică din oferta lui (antet și client); un câmp lăsat gol acolo nu șterge nimic din fișă.</li>
          <li>Coșul de lângă adresă, e-mail și observații șterge câmpul din fișă, după confirmare; ștergerea rămâne în jurnal (cine, când, ce valoare). Îl au conturile care au oferte pentru client și Admin general. Telefonul nu se șterge — se înlocuiește din ofertă. Ofertele își păstrează adresa lucrării lor.</li>
        </ul>
      </Ajutor>
    </>
  );
}
