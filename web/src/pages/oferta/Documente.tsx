import { useEffect, useState } from "react";
import { apiDocumente, type DocumentOferta, type OfertaDetaliu, type TipDocument, type TipDocumentOrice } from "../../api";
import { Mesaj, textEroare } from "../../components/ui";

// Documentele ofertei (FISA-OFERTARE cap. 13.6, 14): generate pe server din
// rezultatul motorului (la "Comandat" din cel salvat), pastrate cu tipul, varianta,
// data-ora si fisierul; "Marcheaza ca transmis" (WhatsApp · e-mail · print) scrie
// in istoric. Trimiterea efectiva pe e-mail / WhatsApp vine dupa punerea in functiune.

export const ETICHETA_TIP: Record<TipDocumentOrice, string> = { OFERTA: "Ofertă", REZUMAT: "Rezumat", DETALIATA: "Ofertă detaliată", TABEL_FACTURARE: "Tabel de facturare", FORMULAR_BILKA: "Formular Bilka" };
const CANALE = [
  { canal: "WHATSAPP", eticheta: "WhatsApp" },
  { canal: "EMAIL", eticheta: "e-mail" },
  { canal: "PRINT", eticheta: "print" },
] as const;

export function Documente({ oferta, reincarca, mentiuni, onSchimbare }: { oferta: OfertaDetaliu; reincarca: number; mentiuni: string; onSchimbare?: () => void }) {
  const [documente, setDocumente] = useState<DocumentOferta[]>([]);
  const [tipuri, setTipuri] = useState<TipDocument[]>([]);
  const [eroare, setEroare] = useState<string | null>(null);
  const [lucru, setLucru] = useState<string | null>(null);
  const areProduse = oferta.invelitori.length > 0 || oferta.linii.length > 0;

  const incarca = () =>
    apiDocumente
      .lista(oferta.id)
      .then((r) => {
        setDocumente(r.documente);
        setTipuri(r.tipuriPermise);
      })
      .catch((e) => setEroare(textEroare(e)));
  useEffect(() => {
    void incarca();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oferta.id, reincarca]);

  async function genereaza(tip: TipDocument) {
    setEroare(null);
    setLucru(tip);
    try {
      const { document } = await apiDocumente.genereaza(oferta.id, tip);
      await incarca();
      onSchimbare?.();
      window.open(apiDocumente.cale(oferta.id, document.id), "_blank", "noopener");
    } catch (e) {
      setEroare(textEroare(e));
    } finally {
      setLucru(null);
    }
  }

  async function transmis(d: DocumentOferta, canal: "WHATSAPP" | "EMAIL" | "PRINT") {
    setEroare(null);
    setLucru(d.id);
    try {
      await apiDocumente.transmis(oferta.id, d.id, canal, mentiuni.trim() || null);
      await incarca();
      onSchimbare?.();
    } catch (e) {
      setEroare(textEroare(e));
    } finally {
      setLucru(null);
    }
  }

  const marime = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);

  return (
    <section className="panou" id="documente">
      <h2>Documente (PDF și formulare Bilka)</h2>
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      <div className="actiuni" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
        {(["OFERTA", "REZUMAT", "DETALIATA", "TABEL_FACTURARE"] as TipDocument[]).map((tip) => {
          const permis = tipuri.includes(tip);
          return (
            <span key={tip}>
              <button className="buton secundar mic" type="button" disabled={!permis || !areProduse || lucru !== null} onClick={() => void genereaza(tip)}>
                {lucru === tip ? "se generează…" : `Generează: ${ETICHETA_TIP[tip]}`}
              </button>
              {!permis && tipuri.length > 0 && <span className="explicatie-buton"> tabelul de facturare nu e disponibil colaboratorilor</span>}
            </span>
          );
        })}
        {!areProduse && <span className="explicatie-buton">Documentele se generează după ce oferta are produse.</span>}
      </div>
      {oferta.status === "COMANDAT" && <p className="mic text-secundar">Oferta e comandată: documentele se generează din rezultatul salvat la „Comandat”, fără recalcul.</p>}
      {documente.length > 0 && (
        <div className="tabel-invelis" style={{ marginTop: 8 }}>
          <table className="tabel">
            <thead>
              <tr>
                <th>Document</th>
                <th>Varianta</th>
                <th>Generat</th>
                <th>Transmis</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {documente.map((d) => (
                <tr key={d.id}>
                  <td>
                    <a href={apiDocumente.cale(oferta.id, d.id)} target="_blank" rel="noreferrer">
                      {d.eticheta}
                      {d.formularNr ? ` F${d.formularNr}` : ""}
                    </a>
                    <div className="mic text-secundar">
                      {d.nume} · {marime(d.marime)}
                      {d.pagini ? ` · ${d.pagini} pag.` : ""}
                    </div>
                    {d.avertizari && (
                      <div className="mic" style={{ color: "var(--avertizare-text)", whiteSpace: "pre-line" }}>
                        ⚠ {d.avertizari}
                      </div>
                    )}
                  </td>
                  <td>{d.versiune > 1 ? `varianta ${d.versiune}` : "—"}</td>
                  <td className="mic">
                    {new Date(d.generatLa).toLocaleString("ro-RO")}
                    {d.generatDe ? ` · ${d.generatDe}` : ""}
                  </td>
                  <td className="mic">
                    {d.transmisLa ? (
                      `${CANALE.find((c) => c.canal === d.canal)?.eticheta ?? d.canal} · ${new Date(d.transmisLa).toLocaleString("ro-RO")}`
                    ) : (
                      <span className="actiuni" style={{ gap: 4 }}>
                        {CANALE.map((c) => (
                          <button key={c.canal} className="buton secundar mic" type="button" disabled={lucru !== null} onClick={() => void transmis(d, c.canal)} title={`Marchează ca transmis pe ${c.eticheta} (scrie în istoric)`}>
                            {c.eticheta}
                          </button>
                        ))}
                      </span>
                    )}
                  </td>
                  <td>
                    <a className="buton secundar mic" href={`${apiDocumente.cale(oferta.id, d.id)}?descarca=da`}>
                      Descarcă
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mic text-secundar">Fiecare generare rămâne atașată ofertei (tip, variantă, dată-oră). „Marchează ca transmis” notează canalul în istoric; trimiterea efectivă pe e-mail / WhatsApp vine după punerea în funcțiune. Formularele de comandă Bilka (.xlsm, cu macro-urile Bilka) se generează din „Formulare Bilka” de sus, de la „De comandat”; se deschid în Excel și se trimit în SAP ca până acum.</p>
    </section>
  );
}
