import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiOferte, apiOptiuni, apiPreturi, dataRo, ETICHETA_STATUS, type ClientDate, type OfertaDetaliu as Oferta } from "../api";
import { clientGol, dinClient, FormularClient } from "../components/FormularClient";
import { Ajutor, Camp, Mesaj, textEroare } from "../components/ui";
import { Preturi } from "./oferta/Preturi";
import { Produse } from "./oferta/Produse";

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
  const [adresaLucrarii, setAdresaLucrarii] = useState("");
  const [localitate, setLocalitate] = useState("");
  const [seSalveaza, setSeSalveaza] = useState(false);
  const [surseClient, setSurseClient] = useState<string[]>([]);
  const [motive, setMotive] = useState<string[]>([]);
  const [completare, setCompletare] = useState<{ motiv: string; text: string } | null>(null);
  const [lucru, setLucru] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    apiOptiuni.lista("sursa_client").then((r) => setSurseClient(r.optiuni.map((o) => o.valoare))).catch(() => setSurseClient([]));
    apiOptiuni.lista("motiv_completare").then((r) => setMotive(r.optiuni.map((o) => o.valoare))).catch(() => setMotive([]));
  }, []);

  async function actiune(ce: string, f: () => Promise<Oferta | void>) {
    setEroare(null);
    setLucru(ce);
    try {
      const o = await f();
      if (o) {
        if (o.id !== id) navigate(`/oferte/${o.id}`);
        else preia(o);
      }
    } catch (err) {
      setEroare(textEroare(err));
    } finally {
      setLucru(null);
    }
  }

  function preia(o: Oferta) {
    setOferta(o);
    setClient(dinClient(o.client));
    setData(o.data);
    setSursaClient(o.sursaClient ?? "");
    setNote(o.note ?? "");
    setAdresaLucrarii(o.adresaLucrarii ?? "");
    setLocalitate(o.localitate ?? "");
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
      await apiOferte.antet(oferta.id, { data, sursaClient: sursaClient || null, note: note || null, adresaLucrarii: adresaLucrarii || null, localitate: localitate || null });
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
          <Link className="buton secundar" to="/oferte/afla-pret">
            Află preț
          </Link>
          {oferta.poateModifica && (
            <button className="buton secundar" type="button" disabled={lucru !== null} onClick={() => actiune("varianta", async () => (await apiPreturi.varianta(oferta.id)).oferta)} title="Versiune nouă sub același număr, cu adaosul real păstrat (11.7)">
              Creează variantă
            </button>
          )}
          {oferta.poateModifica && !oferta.completareLa && (
            <button className="buton secundar" type="button" disabled={lucru !== null} onClick={() => setCompletare({ motiv: motive[0] ?? "", text: "" })} title="Ofertă nouă legată de aceasta (cap. 2b)">
              Completare la această ofertă
            </button>
          )}
          <button className="buton secundar" disabled title="vine în S16">
            PDF ▾
          </button>
        </div>
      </div>

      {c.avertizareCurs && <Mesaj tip="avertizare">{c.avertizareCurs}</Mesaj>}
      {(oferta.versiuni?.length ?? 0) > 1 && (
        <section className="panou">
          <h2>Versiuni (variante de preț)</h2>
          <ul>
            {oferta.versiuni!.map((v) => (
              <li key={v.id}>
                {v.id === oferta.id ? <strong>varianta {v.versiune}</strong> : <Link to={`/oferte/${v.id}`}>varianta {v.versiune}</Link>} · {ETICHETA_STATUS[v.status]}
                {v.curenta ? " · curentă" : ""}
                {!v.curenta && oferta.poateModifica && (
                  <>
                    {" "}
                    <button className="buton secundar mic" type="button" disabled={lucru !== null} onClick={() => actiune("curenta", async () => (await apiPreturi.faCurenta(v.id)).oferta)}>
                      Fă-o curentă
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          <p className="mic text-secundar">Lista de oferte arată doar versiunea curentă; la S15, „Acceptată” o face curentă automat.</p>
        </section>
      )}
      {completare && (
        <section className="panou">
          <h2>Completare la {oferta.numarComplet}</h2>
          <div className="rand-campuri">
            <Camp eticheta="Motivul" obligatoriu>
              <select value={completare.motiv} onChange={(e) => setCompletare({ ...completare, motiv: e.target.value })}>
                {motive.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Camp>
            <Camp eticheta="Precizări">
              <input type="text" value={completare.text} onChange={(e) => setCompletare({ ...completare, text: e.target.value })} />
            </Camp>
          </div>
          <div className="actiuni">
            <button className="buton" type="button" disabled={lucru !== null || !completare.motiv} onClick={() => actiune("completare", async () => (await apiPreturi.completare(oferta.id, completare.motiv, completare.text || null)).oferta)}>
              Creează completarea
            </button>
            <button className="buton secundar" type="button" onClick={() => setCompletare(null)}>
              Renunță
            </button>
          </div>
          <p className="mic text-secundar">Oferta nouă primește numărul ei, preia clientul, adresa lucrării și sursa; garda nu se aplică (poate fi la 0), iar vânzările se văd pe lucrare.</p>
        </section>
      )}

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
            <Camp eticheta="Adresa lucrării">
              <input type="text" value={adresaLucrarii} onChange={(e) => setAdresaLucrarii(e.target.value)} disabled={!oferta.poateModifica} />
            </Camp>
            <Camp eticheta="Localitatea lucrării">
              <input type="text" value={localitate} onChange={(e) => setLocalitate(e.target.value)} disabled={!oferta.poateModifica} />
            </Camp>
            <Camp eticheta="Sursa clientului">
              <input type="text" list="surse-client" value={sursaClient} onChange={(e) => setSursaClient(e.target.value)} disabled={!oferta.poateModifica} />
              <datalist id="surse-client">
                {surseClient.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
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

      <Produse oferta={oferta} onOferta={setOferta} />
      <Preturi oferta={oferta} onOferta={setOferta} />

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
          <li>Numărul, firma, agentul și cursurile sunt fixate la salvare. Cât e „În lucru”, cursurile se reîmprospătează din zona de prețuri.</li>
          <li>„Creează variantă” face o versiune nouă sub același număr, cu adaosul real păstrat; „Completare la această ofertă” face o ofertă nouă legată de aceasta, fără gardă.</li>
          <li>Datele clientului se păstrează în baza comună: ce modifici aici se vede și pe celelalte oferte ale lui. Alt telefon existent leagă oferta de acel client.</li>
          <li>Oferta o modifică cine a făcut-o și Administratorul firmei; Admin general vede tot, dar nu face oferte.</li>
        </ul>
      </Ajutor>
    </>
  );
}
