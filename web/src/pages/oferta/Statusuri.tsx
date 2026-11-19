import { useState } from "react";
import { apiStatus, EroareCerere, ETICHETA_STATUS, STATUSURI_OFERTA, type AlegereLivrareBilka, type OfertaDetaliu, type StatusOferta } from "../../api";
import { DialogLivrareBilka, textAlegereLivrare } from "../../components/DialogLivrareBilka";
import { Camp, eroareCamp, Mesaj, textEroare } from "../../components/ui";
import { lei } from "../../lib/numere";

// Statusurile ofertei (FISA-OFERTARE cap. 14): cele 8, in orice ordine, cu
// revenire, totul cu istoric; doar "Comandat" e ireversibil. "Avans luat" cere
// suma (poate fi 0); "Comandat" e blocat cat o invelitoare e in mp direct, apoi
// ingheata oferta si creeaza randul de comanda (cap. 16).
// S26a: la „De comandat” (si la „Comandat” fara alegere) se deschide dialogul „Livrarea de la
// Bilka” (M7); „Comandat” fara telefonul clientului e refuzat, cu mesajul dus sub campul Telefon (M6).
export function Statusuri({ oferta, onOferta, mentiuni, onEroareClient }: { oferta: OfertaDetaliu; onOferta: (o: OfertaDetaliu) => void; mentiuni: string; onEroareClient?: (e: unknown) => void }) {
  const [eroare, setEroare] = useState<string | null>(null);
  const [eroareCerere, setEroareCerere] = useState<unknown>(null);
  const [motive, setMotive] = useState<string[]>([]);
  const [lucru, setLucru] = useState(false);
  const [avansPentru, setAvansPentru] = useState<StatusOferta | null>(null);
  const [avans, setAvans] = useState(oferta.avansLei ?? "0");
  // dialogul livrarii: pentru statusul cerut sau pentru schimbarea alegerii deja facute
  const [dialogLivrare, setDialogLivrare] = useState<"DE_COMANDAT" | "COMANDAT" | "schimbare" | null>(null);
  const comandata = oferta.status === "COMANDAT";
  const poate = oferta.poateModificaSume ?? oferta.poateModifica;

  async function schimba(status: StatusOferta, avansLei?: string, livrare?: { alegere?: AlegereLivrareBilka; aleasa?: boolean }) {
    setEroare(null);
    setEroareCerere(null);
    setMotive([]);
    // fara alegerea livrarii de la Bilka: intai dialogul
    if ((status === "DE_COMANDAT" || status === "COMANDAT") && !oferta.livrareBilka && !livrare?.alegere && !livrare?.aleasa) {
      setDialogLivrare(status);
      return;
    }
    if (status === "COMANDAT" && !window.confirm("„Comandat” e ireversibil: oferta se îngheață (produse, cantități, prețuri), rezultatul se salvează și se creează rândul de comandă. Continui?")) return;
    setLucru(true);
    try {
      const { oferta: dupa } = await apiStatus.schimba(oferta.id, status, { ...(avansLei !== undefined ? { avansLei } : {}), ...(livrare?.alegere ? { livrareBilka: livrare.alegere } : {}), mentiuni: mentiuni.trim() || null });
      onOferta(dupa);
      setAvansPentru(null);
      setDialogLivrare(null);
    } catch (e) {
      // un camp gresit din dialog (localitatea, telefonul de contact) ramane de corectat in dialog
      if (livrare?.alegere && e instanceof EroareCerere && e.status === 400) throw e;
      setDialogLivrare(null);
      if (e instanceof EroareCerere) {
        // telefonul clientului lipseste: mesajul apare si sub campul Telefon
        if (e.campuri.some((c) => c.camp === "client.telefon")) onEroareClient?.(e);
        else if (e.campuri.some((c) => c.camp === "livrareBilka") && (status === "DE_COMANDAT" || status === "COMANDAT")) setDialogLivrare(status);
      }
      const err = e as Error & { motive?: string[] };
      setEroare(textEroare(e));
      setEroareCerere(e);
      if (Array.isArray(err.motive)) setMotive(err.motive);
    } finally {
      setLucru(false);
    }
  }

  async function confirmaLivrare(alegere: AlegereLivrareBilka) {
    if (dialogLivrare === "DE_COMANDAT") {
      // alegerea pleaca odata cu statusul
      await schimba("DE_COMANDAT", undefined, { alegere });
      return;
    }
    // schimbarea alegerii / „Comandat” fara alegere: intai se salveaza alegerea, apoi (la „Comandat”) statusul
    const urmeaza = dialogLivrare;
    const { oferta: dupa } = await apiStatus.livrareBilka(oferta.id, alegere, mentiuni.trim() || null);
    onOferta(dupa);
    setDialogLivrare(null);
    if (urmeaza === "COMANDAT") await schimba("COMANDAT", undefined, { aleasa: true });
  }

  return (
    <section className="panou">
      <h2>
        Status: <span className={`status-oferta ${oferta.status}`}>{ETICHETA_STATUS[oferta.status]}</span>
        {oferta.avansLei !== null && oferta.avansLei !== undefined && (
          <span className="mic text-secundar">
            {" "}
            · avans {lei(oferta.avansLei)}{oferta.sumeModificate?.includes("avansLei") ? <span className="asterisc-rosu" title="sumă modificată — vezi istoricul">*</span> : null}
          </span>
        )}
      </h2>
      {comandata ? (
        <p>
          Oferta e comandată din {oferta.comanda?.data ?? ""}: produsele, cantitățile și prețurile sunt înghețate. Avansul, montatorul, notițele și atașamentele se mai pot completa.
        </p>
      ) : (
        <>
          <div className="bara-statusuri">
            {STATUSURI_OFERTA.map((s) => (
              <button
                key={s}
                type="button"
                className={`buton secundar mic ${s === oferta.status ? "status-curent" : ""}`}
                disabled={!poate || lucru || s === oferta.status}
                onClick={() => (s === "AVANS_LUAT" ? setAvansPentru(s) : void schimba(s))}
              >
                {ETICHETA_STATUS[s]}
              </button>
            ))}
          </div>
          {!poate && <p className="explicatie-buton">Statusul îl schimbă cine a făcut oferta și Administratorul firmei.</p>}
          {avansPentru && (
            <div className="rand-campuri" style={{ marginTop: 8 }}>
              <Camp eticheta="Suma avansului (lei, poate fi 0)" obligatoriu eroare={eroareCamp(eroareCerere, "avansLei")}>
                <input type="text" inputMode="decimal" value={avans} onChange={(e) => setAvans(e.target.value)} autoFocus />
              </Camp>
              <div className="actiuni" style={{ alignSelf: "end" }}>
                <button className="buton mic" type="button" disabled={lucru || !avans.trim()} onClick={() => void schimba("AVANS_LUAT", avans.trim().replace(",", "."))}>
                  Pune „Avans luat”
                </button>
                <button className="buton secundar mic" type="button" onClick={() => setAvansPentru(null)}>
                  Renunță
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {!comandata && oferta.livrareBilka && (
        <p className="mic" style={{ marginTop: 8 }}>
          <strong>Livrarea de la Bilka:</strong> {textAlegereLivrare(oferta.livrareBilka)}{" "}
          {poate && (
            <button className="buton secundar mic" type="button" disabled={lucru} onClick={() => setDialogLivrare("schimbare")}>
              Schimbă
            </button>
          )}
        </p>
      )}
      {comandata && oferta.comanda?.livrareBilka && (
        <p className="mic">
          <strong>Livrarea de la Bilka:</strong> {textAlegereLivrare(oferta.comanda.livrareBilka)} <span className="text-secundar">— se schimbă de pe comandă</span>
        </p>
      )}
      {dialogLivrare && (
        <DialogLivrareBilka
          initial={oferta.livrareBilka}
          localitateImplicita={oferta.localitate ?? oferta.client.localitate}
          telefonImplicit={oferta.client.telefon}
          etichetaConfirmare={dialogLivrare === "DE_COMANDAT" ? "Pune „De comandat”" : dialogLivrare === "COMANDAT" ? "Continuă spre „Comandat”" : "Salvează"}
          nota={dialogLivrare === "schimbare" ? "Formularele Bilka generate până acum rămân în listă, marcate; după schimbare se regenerează." : undefined}
          onConfirma={confirmaLivrare}
          onRenunta={() => setDialogLivrare(null)}
        />
      )}
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      {motive.length > 0 && (
        <Mesaj tip="avertizare">
          Nu se poate comanda până nu completezi panotajul: {motive.join("; ")}
        </Mesaj>
      )}
      {comandata && oferta.comanda?.pretAjustat && (
        <p className="mic">
          <span className="asterisc">*</span> <strong>Preț ajustat pe comandă</strong> la {lei(oferta.comanda.totalLei)} ({oferta.comanda.pretAjustat.motiv}), de {oferta.comanda.pretAjustat.de}, la {new Date(oferta.comanda.pretAjustat.la).toLocaleDateString("ro-RO")} — oferta rămâne la {lei(oferta.comanda.pretAjustat.totalInitialLei)}.
        </p>
      )}
      {comandata && oferta.comanda && (
        <div className="grila-totaluri">
          <div>
            <span className="text-secundar mic">Rezumatul comenzii</span>
            <span>{oferta.comanda.rezumat}</span>
          </div>
          <div>
            <span className="text-secundar mic">Total · avans · rest (lei)</span>
            <span className="numar-mare">{lei(oferta.comanda.totalLei)}</span>
            <span className="mic text-secundar">
              avans {lei(oferta.comanda.avansLei)} · rest {lei(oferta.comanda.restLei)} · trimisă de {oferta.comanda.responsabil}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
