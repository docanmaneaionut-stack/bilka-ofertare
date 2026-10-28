import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiCurs, apiOfertare, apiOferte, dataRo, type ClientDate, type CursAzi } from "../api";
import { clientGol, dinClient, FormularClient } from "../components/FormularClient";
import { Ajutor, Camp, Mesaj, textEroare } from "../components/ui";
import { useUtilizator } from "../contextUtilizator";

// "+ Oferta noua" (FISA-OFERTARE cap. 1, 2): antetul (firma si agentul contului,
// data, cele doua cursuri) + clientul -> oferta "In lucru" salvata si deschisa.
export function OfertaNoua() {
  const eu = useUtilizator();
  const navigate = useNavigate();
  const [firma, setFirma] = useState<string>("");
  const [curs, setCurs] = useState<{ azi: CursAzi | null; eroare?: string } | null>(null);
  const [client, setClient] = useState<ClientDate>(clientGol());
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [sursaClient, setSursaClient] = useState("");
  const [eroare, setEroare] = useState<string | null>(null);
  const [seSalveaza, setSeSalveaza] = useState(false);

  useEffect(() => {
    apiOfertare
      .cont()
      .then(({ firma }) => setFirma(firma?.denumire ?? ""))
      .catch(() => setFirma(""));
    apiCurs
      .azi()
      .then((r) => setCurs({ azi: r.azi, ...(r.eroare ? { eroare: r.eroare } : {}) }))
      .catch((e) => setCurs({ azi: null, eroare: textEroare(e) }));
  }, []);

  async function trimite(e: FormEvent) {
    e.preventDefault();
    setEroare(null);
    setSeSalveaza(true);
    try {
      const { oferta } = await apiOferte.creeaza(client, { data, sursaClient: sursaClient || null });
      navigate(`/oferte/${oferta.id}`);
    } catch (err) {
      setEroare(textEroare(err));
    } finally {
      setSeSalveaza(false);
    }
  }

  return (
    <>
      <div className="antet-pagina">
        <h1>Ofertă nouă</h1>
      </div>

      <form className="formular" onSubmit={trimite}>
        <section className="panou">
          <h2>Antet</h2>
          <div className="rand-campuri">
            <Camp eticheta="Firma">
              <input type="text" value={firma} readOnly />
            </Camp>
            <Camp eticheta="Agent">
              <input type="text" value={eu.nume} readOnly />
            </Camp>
            <Camp eticheta="Data ofertei" obligatoriu>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            </Camp>
            <Camp eticheta="Curs BNR (documentul)">
              <input type="text" value={curs?.azi ? `${curs.azi.cursBnr} · ${dataRo(curs.azi.dataCurs)}` : "…"} readOnly />
            </Camp>
            <Camp eticheta="Curs de achiziție (BNR × 1,01)">
              <input type="text" value={curs?.azi ? curs.azi.cursAchizitie : "…"} readOnly />
            </Camp>
            <Camp eticheta="Sursa clientului">
              <input type="text" value={sursaClient} onChange={(e) => setSursaClient(e.target.value)} placeholder="recomandare montator, client vechi, online…" />
            </Camp>
          </div>
          {curs?.azi?.avertizareCurs && <Mesaj tip="avertizare">{curs.azi.avertizareCurs}</Mesaj>}
          {curs?.eroare && <Mesaj tip="eroare">{curs.eroare}</Mesaj>}
        </section>

        <section className="panou">
          <h2>Client</h2>
          <FormularClient client={client} onSchimba={setClient} onAlegeExistent={(c) => setClient(dinClient(c))} />
        </section>

        {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
        <div className="actiuni">
          <button className="buton" type="submit" disabled={seSalveaza || !curs?.azi}>
            {seSalveaza ? "Se salvează…" : "Salvează oferta (În lucru)"}
          </button>
          <button className="buton secundar" type="button" onClick={() => navigate("/oferte")}>
            Renunță
          </button>
        </div>
      </form>

      <Ajutor>
        <ul>
          <li>Numărul ofertei (SERIE-NUMĂR) se dă automat la salvare, continuu pe seria contului tău.</li>
          <li>Cursurile se îngheață pe ofertă la salvare: cursul BNR al zilei pentru document și BNR × 1,01 pentru achiziție. Până la 13:00 cursul zilei e cel din ziua precedentă.</li>
          <li>La un telefon care există deja, softul propune clientul existent; oferta se leagă de el, iar datele scrise aici îi actualizează fișa (baza de clienți e comună).</li>
          <li>Adresa e adresa lucrării (livrare, locația pe WhatsApp). Datele de facturare se cer abia la comandă.</li>
        </ul>
      </Ajutor>
    </>
  );
}
