import { useState } from "react";
import { apiStatus, ETICHETA_STATUS, STATUSURI_OFERTA, type OfertaDetaliu, type StatusOferta } from "../../api";
import { Camp, Mesaj, textEroare } from "../../components/ui";

// Statusurile ofertei (FISA-OFERTARE cap. 14): cele 8, in orice ordine, cu
// revenire, totul cu istoric; doar "Comandat" e ireversibil. "Avans luat" cere
// suma (poate fi 0); "Comandat" e blocat cat o invelitoare e in mp direct, apoi
// ingheata oferta si creeaza randul de comanda (cap. 16).
export function Statusuri({ oferta, onOferta, mentiuni }: { oferta: OfertaDetaliu; onOferta: (o: OfertaDetaliu) => void; mentiuni: string }) {
  const [eroare, setEroare] = useState<string | null>(null);
  const [motive, setMotive] = useState<string[]>([]);
  const [lucru, setLucru] = useState(false);
  const [avansPentru, setAvansPentru] = useState<StatusOferta | null>(null);
  const [avans, setAvans] = useState(oferta.avansLei ?? "0");
  const comandata = oferta.status === "COMANDAT";
  const poate = oferta.poateModificaSume ?? oferta.poateModifica;

  async function schimba(status: StatusOferta, avansLei?: string) {
    setEroare(null);
    setMotive([]);
    if (status === "COMANDAT" && !window.confirm("„Comandat” e ireversibil: oferta se îngheață (produse, cantități, prețuri), rezultatul se salvează și se creează rândul de comandă. Continui?")) return;
    setLucru(true);
    try {
      const { oferta: dupa } = await apiStatus.schimba(oferta.id, status, { ...(avansLei !== undefined ? { avansLei } : {}), mentiuni: mentiuni.trim() || null });
      onOferta(dupa);
      setAvansPentru(null);
    } catch (e) {
      const err = e as Error & { motive?: string[] };
      setEroare(textEroare(e));
      if (Array.isArray(err.motive)) setMotive(err.motive);
    } finally {
      setLucru(false);
    }
  }

  return (
    <section className="panou">
      <h2>
        Status: <span className={`status-oferta ${oferta.status}`}>{ETICHETA_STATUS[oferta.status]}</span>
        {oferta.avansLei !== null && oferta.avansLei !== undefined && (
          <span className="mic text-secundar">
            {" "}
            · avans {oferta.avansLei} lei{oferta.sumeModificate?.includes("avansLei") ? <span className="asterisc-rosu" title="sumă modificată — vezi istoricul">*</span> : null}
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
              <Camp eticheta="Suma avansului (lei, poate fi 0)" obligatoriu>
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
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      {motive.length > 0 && (
        <Mesaj tip="avertizare">
          Nu se poate comanda până nu completezi panotajul: {motive.join("; ")}
        </Mesaj>
      )}
      {comandata && oferta.comanda && (
        <div className="grila-totaluri">
          <div>
            <span className="text-secundar mic">Rezumatul comenzii</span>
            <span>{oferta.comanda.rezumat}</span>
          </div>
          <div>
            <span className="text-secundar mic">Total · avans · rest (lei)</span>
            <span className="numar-mare">{oferta.comanda.totalLei}</span>
            <span className="mic text-secundar">
              avans {oferta.comanda.avansLei} · rest {oferta.comanda.restLei} · trimisă de {oferta.comanda.responsabil}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
