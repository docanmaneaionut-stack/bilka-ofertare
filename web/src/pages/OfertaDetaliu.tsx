import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { apiOferte, dataRo, ETICHETA_STATUS, type ClientDate, type OfertaDetaliu as Oferta } from "../api";
import { clientGol, dinClient, FormularClient } from "../components/FormularClient";
import { Ajutor, Camp, Mesaj, textEroare } from "../components/ui";

// Pagina ofertei (S12): antetul si clientul se editeaza; zona produselor vine la
// S13, preturile la S14, statusurile si istoricul la S15, documentele la S16.
export function OfertaDetaliu() {
  const { id } = useParams<{ id: string }>();
  const [oferta, setOferta] = useState<Oferta | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [client, setClient] = useState<ClientDate>(clientGol());
  const [data, setData] = useState("");
  const [sursaClient, setSursaClient] = useState("");
  const [note, setNote] = useState("");
  const [seSalveaza, setSeSalveaza] = useState(false);

  function preia(o: Oferta) {
    setOferta(o);
    setClient(dinClient(o.client));
    setData(o.data);
    setSursaClient(o.sursaClient ?? "");
    setNote(o.note ?? "");
  }

  useEffect(() => {
    if (!id) return;
    apiOferte
      .detaliu(id)
      .then(({ oferta }) => preia(oferta))
      .catch((e) => setEroare(textEroare(e)));
  }, [id]);

  async function salveaza(e: FormEvent) {
    e.preventDefault();
    if (!oferta) return;
    setEroare(null);
    setMesaj(null);
    setSeSalveaza(true);
    try {
      await apiOferte.antet(oferta.id, { data, sursaClient: sursaClient || null, note: note || null });
      const { oferta: dupa } = await apiOferte.client(oferta.id, client);
      preia(dupa);
      setMesaj("Antetul și clientul au fost salvate.");
    } catch (err) {
      setEroare(textEroare(err));
    } finally {
      setSeSalveaza(false);
    }
  }

  if (eroare && !oferta) return <Mesaj tip="eroare">{eroare}</Mesaj>;
  if (!oferta) return null;
  const c = oferta.curs;

  return (
    <>
      <div className="antet-pagina">
        <div>
          <h1 style={{ marginBottom: 4 }}>
            {oferta.numarComplet}
            {oferta.versiune > 1 ? ` · varianta ${oferta.versiune}` : ""} <span className={`status-oferta ${oferta.status}`}>{ETICHETA_STATUS[oferta.status]}</span>
          </h1>
          <span className="text-secundar">
            {dataRo(oferta.data)} · {oferta.firma.denumire} · {oferta.cont.nume}
            {oferta.completareLa ? ` · completare la ${oferta.completareLa.numarComplet}` : ""}
          </span>
        </div>
        <div className="actiuni">
          <Link className="buton secundar" to="/oferte">
            ← Oferte
          </Link>
          <button className="buton secundar" disabled title="vine în S14">
            Află preț
          </button>
          <button className="buton secundar" disabled title="vine în S16">
            PDF ▾
          </button>
        </div>
      </div>

      {c.avertizareCurs && <Mesaj tip="avertizare">{c.avertizareCurs}</Mesaj>}

      <form className="formular" onSubmit={salveaza}>
        <section className="panou">
          <h2>Antet</h2>
          <div className="rand-campuri">
            <Camp eticheta="Data ofertei" obligatoriu>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} required disabled={!oferta.poateModifica} />
            </Camp>
            <Camp eticheta="Curs BNR (documentul)">
              <input type="text" value={`${c.cursBnr} · ${dataRo(c.dataCurs)} · ${c.sursaCurs}`} readOnly />
            </Camp>
            <Camp eticheta="Curs de achiziție (BNR × 1,01)">
              <input type="text" value={c.cursAchizitie} readOnly />
            </Camp>
            <Camp eticheta="Sursa clientului">
              <input type="text" value={sursaClient} onChange={(e) => setSursaClient(e.target.value)} disabled={!oferta.poateModifica} />
            </Camp>
            <Camp eticheta="Note">
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} disabled={!oferta.poateModifica} />
            </Camp>
            <Camp eticheta="Lista de preț">
              <input type="text" value={oferta.listaPret?.denumire ?? "—"} readOnly />
            </Camp>
          </div>
        </section>

        <section className="panou">
          <h2>
            Client{" "}
            <Link className="mic" to={`/clienti/${oferta.client.id}`} style={{ fontWeight: 400 }}>
              fișa clientului
            </Link>
          </h2>
          {oferta.poateModifica ? (
            <FormularClient client={client} onSchimba={setClient} onAlegeExistent={(cl) => setClient(dinClient(cl))} />
          ) : (
            <p>
              <strong>{oferta.client.nume}</strong> · {oferta.client.telefon} · {oferta.client.adresa}
              {oferta.client.localitate ? `, ${oferta.client.localitate}` : ""}
            </p>
          )}
        </section>

        {oferta.poateModifica && (
          <div className="actiuni" style={{ marginBottom: 24 }}>
            <button className="buton" type="submit" disabled={seSalveaza}>
              {seSalveaza ? "Se salvează…" : "Salvează antetul și clientul"}
            </button>
          </div>
        )}
        {mesaj && <Mesaj tip="ok">{mesaj}</Mesaj>}
        {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      </form>

      <section className="panou in-lucru">
        <h2>Produse</h2>
        <p>Zona produselor vine în S13: învelitori cu panotaj, accesorii, fixare, pluvial, șipcă, zona B.</p>
      </section>
      <section className="panou in-lucru">
        <h2>Prețuri</h2>
        <p>Zona de țintă și prezentarea vin în S14. Statusurile și istoricul în S15, documentele în S16.</p>
      </section>

      {oferta.completari.length > 0 && (
        <section className="panou">
          <h2>Completări</h2>
          <ul>
            {oferta.completari.map((cp) => (
              <li key={cp.id}>
                <Link to={`/oferte/${cp.id}`}>{cp.numarComplet}</Link> · {ETICHETA_STATUS[cp.status]}
                {cp.motiv ? ` · ${cp.motiv}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Ajutor>
        <ul>
          <li>Numărul, firma, agentul și cursurile sunt fixate la salvare. Cursurile se vor putea reîmprospăta cât e „În lucru” (S14).</li>
          <li>Datele clientului se păstrează în baza comună: ce modifici aici se vede și pe celelalte oferte ale lui. Alt telefon existent leagă oferta de acel client.</li>
          <li>Oferta o modifică cine a făcut-o și Administratorul firmei; Admin general vede tot, dar nu face oferte.</li>
        </ul>
      </Ajutor>
    </>
  );
}
