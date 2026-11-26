import { useState } from "react";
import { createPortal } from "react-dom";
import { apiStatus, dataRo, EroareCerere, ETICHETA_STATUS, STATUSURI_OFERTA, type AlegereLivrareBilka, type OfertaDetaliu, type StatusOferta } from "../../api";
import { DialogLivrareBilka, textAlegereLivrare } from "../../components/DialogLivrareBilka";
import { Camp, eroareCamp, Mesaj, textEroare } from "../../components/ui";
import { lei } from "../../lib/numere";

// Statusurile ofertei (FISA-OFERTARE cap. 14): cele 8, in orice ordine, cu
// revenire, totul cu istoric; doar "Comandat" e ireversibil. "Avans luat" cere
// suma (poate fi 0); "Comandat" e blocat cat o invelitoare e in mp direct, apoi
// ingheata oferta si creeaza randul de comanda (cap. 16).
// S26a: la „De comandat” (si la „Comandat” fara alegere) se deschide dialogul „Livrarea de la
// Bilka” (M7); „Comandat” fara telefonul clientului e refuzat, cu mesajul dus sub campul Telefon (M6).
//
// S29 (MODIFICAREA M12): statusurile stau pe RANDUL LOR FIX, intre randul ofertei si file - toate cele opt
// la vedere, cel curent inchis la culoare, un clic schimba statusul; regulile, dialogurile si blocarile sunt
// cele de pana acum. Ce se deschide de la un clic (suma avansului, mesajele) apare imediat sub rand. La
// „Comandat” toate opt raman la vedere, stinse. Doua bucati din vechea caseta "Status" s-au mutat in fila
// "Date generale", prin sloturile primite: "Livrarea de la Bilka" (cu „Schimbă”) si caseta "Comandă" (textul
// „Oferta e comandată din…”, rezumatul comenzii, total · avans · rest, nota de pret ajustat).
type Props = {
  oferta: OfertaDetaliu;
  onOferta: (o: OfertaDetaliu) => void;
  // S29b: inaintea schimbarii statusului pagina trimite ce e nesalvat; false = s-a oprit (refuz / rand incomplet)
  inainteDeActiune?: () => Promise<boolean>;
  mentiuni: string;
  onEroareClient?: (e: unknown) => void;
  // „Comandat” oprit de produse (panotaj necompletat): pagina trece in fila Produse
  onBlocajProduse?: () => void;
  slotLivrare?: HTMLElement | null;
  slotComanda?: HTMLElement | null;
};

export function Statusuri({ oferta, onOferta, inainteDeActiune, mentiuni, onEroareClient, onBlocajProduse, slotLivrare = null, slotComanda = null }: Props) {
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
    // S29b: intai ce e nesalvat (cand statusul vine din dialogul livrarii, poarta a trecut deja)
    if (!livrare && inainteDeActiune && !(await inainteDeActiune())) return;
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
      if (Array.isArray(err.motive)) {
        setMotive(err.motive);
        // panotajul necompletat se rezolva in fila Produse
        if (err.motive.length > 0) onBlocajProduse?.();
      }
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

  const subRand = (!poate && !comandata) || avansPentru !== null || eroare !== null || motive.length > 0;

  return (
    <>
      <div className="rand-statusuri" role="group" aria-label="Statusul ofertei">
        <span className="eticheta-rand">Status</span>
        <div className="bara-statusuri">
          {STATUSURI_OFERTA.map((s) => (
            <button
              key={s}
              type="button"
              className={`buton secundar mic ${s === oferta.status ? "status-curent" : ""}`}
              aria-pressed={s === oferta.status}
              disabled={comandata || !poate || lucru || s === oferta.status}
              title={comandata ? "Oferta e comandată: statusul nu se mai schimbă („Comandat” e ireversibil)" : undefined}
              onClick={() => (s === "AVANS_LUAT" ? setAvansPentru(s) : void schimba(s))}
            >
              {ETICHETA_STATUS[s]}
            </button>
          ))}
        </div>
        {oferta.avansLei !== null && oferta.avansLei !== undefined && (
          <span className="mic text-secundar avans-oferta">
            avans {lei(oferta.avansLei)}
            {oferta.sumeModificate?.includes("avansLei") ? (
              <span className="asterisc-rosu" title="sumă modificată — vezi istoricul">
                *
              </span>
            ) : null}
          </span>
        )}
      </div>
      {subRand && (
        <div className="sub-statusuri">
          {!poate && !comandata && <p className="explicatie-buton">Statusul îl schimbă cine a făcut oferta și Administratorul firmei.</p>}
          {avansPentru && (
            <div className="rand-campuri">
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
          {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
          {motive.length > 0 && <Mesaj tip="avertizare">Nu se poate comanda până nu completezi panotajul: {motive.join("; ")}</Mesaj>}
        </div>
      )}

      {slotLivrare &&
        createPortal(
          <section className="panou" id="livrare-bilka">
            <h2>Livrarea de la Bilka</h2>
            {!comandata && oferta.livrareBilka && (
              <p>
                {textAlegereLivrare(oferta.livrareBilka)}{" "}
                {poate && (
                  <button className="buton secundar mic" type="button" disabled={lucru} onClick={() => setDialogLivrare("schimbare")}>
                    Schimbă
                  </button>
                )}
              </p>
            )}
            {!comandata && !oferta.livrareBilka && <p className="text-secundar">Se alege la „De comandat”: la depozitul nostru sau direct în șantier.</p>}
            {comandata && oferta.comanda?.livrareBilka && (
              <p>
                {textAlegereLivrare(oferta.comanda.livrareBilka)} <span className="text-secundar">— se schimbă de pe comandă</span>
              </p>
            )}
            {comandata && !oferta.comanda?.livrareBilka && <p className="text-secundar">Fără alegere pe comandă.</p>}
          </section>,
          slotLivrare,
        )}

      {slotComanda &&
        comandata &&
        createPortal(
          <section className="panou" id="comanda-ofertei">
            <h2>Comandă</h2>
            <p>
              Oferta e comandată din {oferta.comanda?.data ? dataRo(oferta.comanda.data) : ""}: produsele, cantitățile și prețurile sunt înghețate. Avansul, montatorul, notițele și atașamentele se mai pot completa.
            </p>
            {oferta.comanda?.pretAjustat && (
              <p className="mic">
                <span className="asterisc">*</span> <strong>Preț ajustat pe comandă</strong> la {lei(oferta.comanda.totalLei)} ({oferta.comanda.pretAjustat.motiv}), de {oferta.comanda.pretAjustat.de}, la {new Date(oferta.comanda.pretAjustat.la).toLocaleDateString("ro-RO")} — oferta rămâne la {lei(oferta.comanda.pretAjustat.totalInitialLei)}.
              </p>
            )}
            {oferta.comanda && (
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
          </section>,
          slotComanda,
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
    </>
  );
}
