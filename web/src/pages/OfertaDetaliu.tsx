import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiDocumente, apiFormulareBilka, apiOferte, apiOptiuni, apiPreturi, apiStatus, dataRo, ETICHETA_STATUS, type ClientDate, type OfertaDetaliu as Oferta, type SursaPreluare, type TipDocument } from "../api";
import { clientGol, dinClient, FormularClient } from "../components/FormularClient";
import { MeniuActiuni } from "../components/MeniuActiuni";
import { Ajutor, Camp, Mesaj, textEroare } from "../components/ui";
import { Documente, ETICHETA_TIP } from "./oferta/Documente";
import { Istoric, NotiteAtasamente } from "./oferta/IstoricNotite";
import { Montator } from "./oferta/Montator";
import { Preturi } from "./oferta/Preturi";
import { Produse } from "./oferta/Produse";
import { Statusuri } from "./oferta/Statusuri";

// Pagina ofertei: antetul si clientul, statusurile (cap. 14), zona produselor
// (cap. 3-10), preturile (cap. 11), montatorul / recomandarea (cap. 12), istoricul,
// notitele si atasamentele (cap. 14), varianta, completarea si legarea ulterioara
// (cap. 2b), copierea (cap. 15). Documentele (PDF) vin in S16.
export function OfertaDetaliu() {
  const { id } = useParams<{ id: string }>();
  const [parametri, setParametri] = useSearchParams();
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
  const [dialog, setDialog] = useState<"completare" | "legare" | "preia-in" | "copie" | null>(null);
  const [motiv, setMotiv] = useState({ motiv: "", text: "" });
  const [cautare, setCautare] = useState("");
  const [surse, setSurse] = useState<SursaPreluare[]>([]);
  const [clientCopie, setClientCopie] = useState<ClientDate>(clientGol());
  const [mentiuni, setMentiuni] = useState("");
  const [lucru, setLucru] = useState<string | null>(null);
  const [reincarcaIstoric, setReincarcaIstoric] = useState(0);
  const navigate = useNavigate();

  // S16b: formularele de comanda Bilka - un .xlsm per formular, de la "De comandat" si la
  // "Comandat"; raman in panoul "Documente", avertizarile (produse fara loc) se arata aici
  const [avertizariFormulare, setAvertizariFormulare] = useState<string[]>([]);
  const [cereFormulare, setCereFormulare] = useState(false);
  useEffect(() => {
    if (!cereFormulare || !oferta) return;
    setCereFormulare(false);
    void formulareBilka();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cereFormulare, oferta]);
  async function formulareBilka() {
    if (!oferta) return;
    setEroare(null);
    setAvertizariFormulare([]);
    setLucru("formulare");
    try {
      const r = await apiFormulareBilka.genereaza(oferta.id);
      setMesaj(`Formulare Bilka generate: ${r.documente.map((d) => d.nume).join(", ")} — le găsești în panoul „Documente” (descarcă, deschide în Excel, trimite în SAP).`);
      setAvertizariFormulare(r.avertizari);
      setReincarcaIstoric((n) => n + 1);
      document.getElementById("documente")?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      setEroare(textEroare(err));
    } finally {
      setLucru(null);
    }
  }

  // "PDF ▾": genereaza documentul si il deschide; ramane in lista documentelor ofertei
  async function pdf(tip: TipDocument) {
    if (!oferta) return;
    setEroare(null);
    setLucru(`pdf-${tip}`);
    try {
      const { document } = await apiDocumente.genereaza(oferta.id, tip);
      window.open(apiDocumente.cale(oferta.id, document.id), "_blank", "noopener");
      setReincarcaIstoric((n) => n + 1);
    } catch (err) {
      setEroare(textEroare(err));
    } finally {
      setLucru(null);
    }
  }

  useEffect(() => {
    apiOptiuni.lista("sursa_client").then((r) => setSurseClient(r.optiuni.map((o) => o.valoare))).catch(() => setSurseClient([]));
    apiOptiuni.lista("motiv_completare").then((r) => setMotive(r.optiuni.map((o) => o.valoare))).catch(() => setMotive([]));
  }, []);

  // actiunea ceruta din meniul ⋯ al listei (?actiune=...)
  useEffect(() => {
    const a = parametri.get("actiune");
    if (a === "completare" || a === "legare" || a === "preia-in" || a === "copie") setDialog(a);
    if (a === "formulare") setCereFormulare(true);
    if (a) setParametri({}, { replace: true });
  }, [parametri, setParametri]);

  useEffect(() => {
    if (dialog !== "legare" && dialog !== "preia-in") return;
    if (!oferta) return;
    const t = setTimeout(() => apiPreturi.surse(oferta.id, cautare.trim()).then((r) => setSurse(r.oferte)).catch(() => setSurse([])), 250);
    return () => clearTimeout(t);
  }, [dialog, cautare, oferta]);

  function preia(o: Oferta) {
    setOferta(o);
    setClient(dinClient(o.client));
    setClientCopie(dinClient(o.client));
    setData(o.data);
    setSursaClient(o.sursaClient ?? "");
    setNote(o.note ?? "");
    setAdresaLucrarii(o.adresaLucrarii ?? "");
    setLocalitate(o.localitate ?? "");
    setReincarcaIstoric((n) => n + 1);
  }

  useEffect(() => {
    if (!id) return;
    apiOferte
      .detaliu(id)
      .then(({ oferta }) => preia(oferta))
      .catch((e) => setEroare(textEroare(e)));
  }, [id]);

  async function actiune(ce: string, f: () => Promise<Oferta | void>) {
    setEroare(null);
    setLucru(ce);
    try {
      const o = await f();
      if (o) {
        if (o.id !== id) navigate(`/oferte/${o.id}`);
        else preia(o);
      }
      setDialog(null);
    } catch (err) {
      setEroare(textEroare(err));
    } finally {
      setLucru(null);
    }
  }

  async function salveaza(e: FormEvent) {
    e.preventDefault();
    if (!oferta) return;
    setEroare(null);
    setMesaj(null);
    setSeSalveaza(true);
    try {
      const m = mentiuni.trim() || null;
      await apiOferte.antet(oferta.id, { data, sursaClient: sursaClient || null, note: note || null, adresaLucrarii: adresaLucrarii || null, localitate: localitate || null, mentiuni: m });
      const { oferta: dupa } = await apiOferte.client(oferta.id, { ...client, mentiuni: m } as ClientDate);
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
  const comandata = oferta.status === "COMANDAT";
  const poateSume = oferta.poateModificaSume ?? oferta.poateModifica;
  const deschideMotiv = (d: "completare" | "legare") => {
    setMotiv({ motiv: motive[0] ?? "", text: "" });
    setCautare("");
    setDialog(d);
  };

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
            {oferta.completareLa ? (
              <>
                {" "}
                · completare la <Link to={`/oferte/${oferta.completareLa.id}`}>{oferta.completareLa.numarComplet}</Link>
                {oferta.motivCompletare ? ` · ${oferta.motivCompletare}` : ""}
              </>
            ) : null}
          </span>
        </div>
        <div className="actiuni">
          <Link className="buton secundar" to="/oferte">
            ← Oferte
          </Link>
          <Link className="buton secundar" to="/oferte/afla-pret">
            Află preț
          </Link>
          {(oferta.status === "DE_COMANDAT" || comandata) && (
            <button className="buton" type="button" disabled={lucru !== null} onClick={() => void formulareBilka()} title="Generează formularele de comandă Bilka (.xlsm) din șablonul firmei; la „Comandat” din rezultatul salvat">
              {lucru === "formulare" ? "se generează…" : `Formulare Bilka${oferta.structura?.rezultat ? ` (${oferta.structura.rezultat.formulareBilka.length})` : ""}`}
            </button>
          )}
          <MeniuActiuni
            eticheta={lucru?.startsWith("pdf-") ? "se generează…" : "PDF ▾"}
            actiuni={(["OFERTA", "REZUMAT", "DETALIATA", "TABEL_FACTURARE"] as TipDocument[]).map((tip) => ({
              eticheta: `${ETICHETA_TIP[tip]} (PDF)`,
              explicatie: tip === "TABEL_FACTURARE" ? "intern, în lei" : undefined,
              onClick: () => void pdf(tip),
              dezactivat: oferta.invelitori.length === 0 && oferta.linii.length === 0 ? "oferta nu are încă produse" : lucru ? "se generează alt document" : undefined,
            }))}
          />
          <MeniuActiuni
            actiuni={[
              { eticheta: "Copiază oferta", explicatie: "ofertă nouă cu aceleași produse și prețuri", onClick: () => setDialog("copie"), dezactivat: poateSume ? undefined : "doar cine a făcut oferta și Administratorul" },
              { eticheta: "Creează variantă", explicatie: "versiune nouă sub același număr, cu adaosul real păstrat", onClick: () => void actiune("varianta", async () => (await apiPreturi.varianta(oferta.id)).oferta), dezactivat: comandata ? "oferta e comandată" : oferta.poateModifica ? undefined : "doar cine a făcut oferta și Administratorul" },
              { eticheta: "Completare la această ofertă", explicatie: "ofertă nouă legată de aceasta, fără gardă", onClick: () => deschideMotiv("completare"), dezactivat: oferta.completareLa ? "oferta e ea însăși o completare" : poateSume ? undefined : "doar cine a făcut oferta și Administratorul" },
              { eticheta: "Leagă ca completare la…", explicatie: "oferta aceasta devine completarea unei oferte inițiale", onClick: () => deschideMotiv("legare"), dezactivat: oferta.completareLa ? `e deja completare la ${oferta.completareLa.numarComplet}` : poateSume ? undefined : "doar cine a făcut oferta și Administratorul" },
              { eticheta: "Preia prețurile în altă ofertă", explicatie: "aplică prețurile de aici pe o altă ofertă „În lucru”", onClick: () => setDialog("preia-in") },
              { eticheta: "Istoric", onClick: () => document.getElementById("istoric")?.scrollIntoView({ behavior: "smooth" }) },
              { eticheta: "Notițe și atașamente", onClick: () => document.getElementById("notite")?.scrollIntoView({ behavior: "smooth" }) },
            ]}
          />
        </div>
      </div>

      {c.avertizareCurs && <Mesaj tip="avertizare">{c.avertizareCurs}</Mesaj>}
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      {avertizariFormulare.length > 0 && (
        <Mesaj tip="avertizare">
          <strong>Formularele Bilka — de verificat în Excel:</strong>
          <ul style={{ margin: "4px 0 0 18px" }}>
            {avertizariFormulare.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </Mesaj>
      )}

      {oferta.areIstoric && poateSume && (
        <div className="rand-campuri">
          <Camp eticheta="Mențiuni pentru istoric (se notează la fiecare modificare de acum încolo)">
            <input type="text" value={mentiuni} onChange={(e) => setMentiuni(e.target.value)} placeholder="de ce se schimbă: cererea clientului, corectură…" />
          </Camp>
        </div>
      )}

      <Statusuri oferta={oferta} onOferta={preia} mentiuni={mentiuni} />

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
                    <button className="buton secundar mic" type="button" disabled={lucru !== null} onClick={() => void actiune("curenta", async () => (await apiPreturi.faCurenta(v.id)).oferta)}>
                      Fă-o curentă
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          <p className="mic text-secundar">Lista de oferte arată doar versiunea curentă; „Acceptată” o face curentă automat.</p>
        </section>
      )}

      {(dialog === "completare" || dialog === "legare") && (
        <section className="panou">
          <h2>{dialog === "completare" ? `Completare la ${oferta.numarComplet}` : `Leagă ${oferta.numarComplet} ca completare la…`}</h2>
          {dialog === "legare" && (
            <Camp eticheta="Oferta inițială (număr sau client)">
              <input type="search" value={cautare} onChange={(e) => setCautare(e.target.value)} placeholder="IB-0147 sau numele clientului" autoFocus />
            </Camp>
          )}
          <div className="rand-campuri">
            <Camp eticheta="Motivul" obligatoriu>
              <select value={motiv.motiv} onChange={(e) => setMotiv({ ...motiv, motiv: e.target.value })}>
                {motive.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Camp>
            <Camp eticheta="Precizări">
              <input type="text" value={motiv.text} onChange={(e) => setMotiv({ ...motiv, text: e.target.value })} />
            </Camp>
          </div>
          {dialog === "legare" && surse.length > 0 && (
            <ul>
              {surse.map((s) => (
                <li key={s.id}>
                  <button className="buton secundar mic" type="button" disabled={lucru !== null || !motiv.motiv} onClick={() => void actiune("legare", async () => (await apiStatus.leaga(oferta.id, s.id, motiv.motiv, motiv.text || null, mentiuni.trim() || null)).oferta)}>
                    leagă la {s.numarComplet}
                  </button>{" "}
                  {s.client.nume} · {s.data} · {ETICHETA_STATUS[s.status]}
                </li>
              ))}
            </ul>
          )}
          <div className="actiuni">
            {dialog === "completare" && (
              <button className="buton" type="button" disabled={lucru !== null || !motiv.motiv} onClick={() => void actiune("completare", async () => (await apiPreturi.completare(oferta.id, motiv.motiv, motiv.text || null)).oferta)}>
                Creează completarea
              </button>
            )}
            <button className="buton secundar" type="button" onClick={() => setDialog(null)}>
              Renunță
            </button>
          </div>
          <p className="mic text-secundar">
            {dialog === "completare"
              ? "Oferta nouă primește numărul ei, preia clientul, adresa lucrării și sursa; garda nu se aplică (poate fi la 0), iar vânzările se văd pe lucrare."
              : "De la legare, oferta aceasta e completare: garda e oprită, iar vânzările se văd pe lucrarea ofertei inițiale. Se poate lega și după comandă."}
          </p>
        </section>
      )}

      {dialog === "preia-in" && (
        <section className="panou">
          <h2>Preia prețurile din {oferta.numarComplet} în altă ofertă</h2>
          <Camp eticheta="Oferta care preia (număr sau client)">
            <input type="search" value={cautare} onChange={(e) => setCautare(e.target.value)} placeholder="IB-0150 sau numele clientului" autoFocus />
          </Camp>
          {surse.length > 0 && (
            <ul>
              {surse.map((s) => (
                <li key={s.id}>
                  <button className="buton secundar mic" type="button" disabled={lucru !== null} onClick={() => void actiune("preia-in", async () => (await apiPreturi.preia(s.id, oferta.id)).oferta)}>
                    aplică pe {s.numarComplet}
                  </button>{" "}
                  {s.client.nume} · {s.data} · {ETICHETA_STATUS[s.status]}
                </li>
              ))}
            </ul>
          )}
          <div className="actiuni">
            <button className="buton secundar" type="button" onClick={() => setDialog(null)}>
              Renunță
            </button>
          </div>
        </section>
      )}

      {dialog === "copie" && (
        <section className="panou">
          <h2>Copiază {oferta.numarComplet}</h2>
          <p className="mic text-secundar">Ofertă nouă, cu număr nou, aceleași produse și prețuri, „În lucru”, fără istoric. Clientul: același sau altul (vecinul cu un acoperiș asemănător).</p>
          <FormularClient client={clientCopie} onSchimba={setClientCopie} onAlegeExistent={(cl) => setClientCopie(dinClient(cl))} />
          <div className="actiuni">
            <button className="buton" type="button" disabled={lucru !== null} onClick={() => void actiune("copie", async () => (await apiStatus.copie(oferta.id, clientCopie)).oferta)}>
              Creează copia
            </button>
            <button className="buton secundar" type="button" onClick={() => setDialog(null)}>
              Renunță
            </button>
          </div>
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

        {oferta.poateModifica ? (
          <div className="actiuni" style={{ marginBottom: 24 }}>
            <button className="buton" type="submit" disabled={seSalveaza}>
              {seSalveaza ? "Se salvează…" : "Salvează antetul și clientul"}
            </button>
          </div>
        ) : (
          <p className="explicatie-buton" style={{ marginBottom: 16 }}>
            {comandata ? "Oferta e comandată: antetul și clientul sunt înghețate." : "Antetul și clientul le modifică cine a făcut oferta și Administratorul firmei."}
          </p>
        )}
        {mesaj && <Mesaj tip="ok">{mesaj}</Mesaj>}
      </form>

      <Produse oferta={oferta} onOferta={preia} mentiuni={mentiuni} />
      <Preturi oferta={oferta} onOferta={preia} mentiuni={mentiuni} />
      <Montator oferta={oferta} onOferta={preia} mentiuni={mentiuni} />

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

      <Documente oferta={oferta} reincarca={reincarcaIstoric} mentiuni={mentiuni} onSchimbare={() => setReincarcaIstoric((n) => n + 1)} />
      <NotiteAtasamente oferta={oferta} />
      <Istoric oferta={oferta} reincarca={reincarcaIstoric} />

      <Ajutor>
        <ul>
          <li>Statusurile se pun în orice ordine, cu revenire, toate cu istoric; doar „Comandat” e ireversibil și îngheață produsele, cantitățile și prețurile. „Avans luat” cere suma; „Acceptată” face varianta curentă.</li>
          <li>Istoricul pornește la „Transmisă”: fiecare modificare (status, produs, cantitate, preț, sumă, client, antet) se notează cu cine, când, înainte / după și mențiunile scrise sus. Sumele modificate poartă asteriscul roșu.</li>
          <li>Numărul, firma, agentul și cursurile sunt fixate la salvare; cât e „În lucru”, cursurile se reîmprospătează din zona de prețuri.</li>
          <li>Meniul ⋯: copiază oferta, creează variantă, completare, legare ca completare, preia prețurile în altă ofertă, istoric, notițe și atașamente.</li>
          <li>„PDF ▾” generează documentul (ofertă, rezumat, ofertă detaliată, tabel de facturare) și îl deschide; fiecare generare rămâne în panoul „Documente”, de unde se marchează ca transmis.</li>
        </ul>
      </Ajutor>
    </>
  );
}
