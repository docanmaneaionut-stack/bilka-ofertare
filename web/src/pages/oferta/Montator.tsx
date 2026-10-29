import { useEffect, useState } from "react";
import { apiMontatori, apiStatus, type Montator as MontatorTip, type OfertaDetaliu } from "../../api";
import { Camp, Mesaj, textEroare } from "../../components/ui";

// Montatorul / recomandarea (FISA-OFERTARE cap. 12): o singura persoana pe oferta,
// din lista agentului (autocompletare) sau noua; comisionul ca suma fixa, cu
// asterisc rosu si istoric; "achitat" il bifeaza Administratorul (Etapa 5).
// Nimic pe documente; sursa clientului ramane separata (statistica).
export function Montator({ oferta, onOferta, mentiuni }: { oferta: OfertaDetaliu; onOferta: (o: OfertaDetaliu) => void; mentiuni: string }) {
  const poate = oferta.poateModificaSume ?? oferta.poateModifica;
  const [cautare, setCautare] = useState("");
  const [sugestii, setSugestii] = useState<MontatorTip[]>([]);
  const [nou, setNou] = useState<{ nume: string; telefon: string; localitate: string; tip: "MONTATOR" | "CONSTRUCTOR" } | null>(null);
  const [comision, setComision] = useState(oferta.comisionRecomandareLei ?? "");
  const [eroare, setEroare] = useState<string | null>(null);
  const [lucru, setLucru] = useState(false);

  useEffect(() => setComision(oferta.comisionRecomandareLei ?? ""), [oferta.comisionRecomandareLei]);
  useEffect(() => {
    if (cautare.trim().length < 2) {
      setSugestii([]);
      return;
    }
    const t = setTimeout(() => apiMontatori.lista(cautare.trim()).then((r) => setSugestii(r.montatori)).catch(() => setSugestii([])), 250);
    return () => clearTimeout(t);
  }, [cautare]);

  async function salveaza(date: Parameters<typeof apiStatus.montator>[1]) {
    setEroare(null);
    setLucru(true);
    try {
      const { oferta: dupa } = await apiStatus.montator(oferta.id, { ...date, mentiuni: mentiuni.trim() || null });
      onOferta(dupa);
      setCautare("");
      setSugestii([]);
      setNou(null);
    } catch (e) {
      setEroare(textEroare(e));
    } finally {
      setLucru(false);
    }
  }

  return (
    <section className="panou">
      <h2>Montator / recomandare</h2>
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      <div className="rand-campuri">
        <Camp eticheta="Persoana (din lista ta)">
          {oferta.montator ? (
            <div className="actiuni" style={{ justifyContent: "flex-start" }}>
              <span>
                <strong>{oferta.montator.nume}</strong> · {oferta.montator.telefon}
                {oferta.montator.localitate ? ` · ${oferta.montator.localitate}` : ""} · {oferta.montator.tip === "CONSTRUCTOR" ? "constructor" : "montator"}
              </span>
              {poate && (
                <button className="buton secundar mic" type="button" disabled={lucru} onClick={() => void salveaza({ montatorId: null })}>
                  Scoate
                </button>
              )}
            </div>
          ) : (
            <>
              <input type="search" value={cautare} onChange={(e) => setCautare(e.target.value)} placeholder="caută după nume sau telefon…" disabled={!poate} />
              {sugestii.length > 0 && (
                <ul className="lista-sugestii">
                  {sugestii.map((m) => (
                    <li key={m.id}>
                      <button type="button" className="buton secundar mic" onClick={() => void salveaza({ montatorId: m.id })}>
                        {m.nume} · {m.telefon}
                        {m.localitate ? ` · ${m.localitate}` : ""}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {poate && !nou && cautare.trim().length >= 2 && (
                <button type="button" className="buton secundar mic" style={{ marginTop: 6 }} onClick={() => setNou({ nume: cautare.trim(), telefon: "", localitate: "", tip: "MONTATOR" })}>
                  + Adaugă „{cautare.trim()}” în lista ta
                </button>
              )}
            </>
          )}
        </Camp>
        <Camp eticheta="Comision recomandare (lei, sumă fixă)">
          <div className="actiuni" style={{ justifyContent: "flex-start" }}>
            <input
              type="text"
              inputMode="decimal"
              value={comision}
              onChange={(e) => setComision(e.target.value)}
              onBlur={() => comision.trim() !== (oferta.comisionRecomandareLei ?? "") && void salveaza({ comisionRecomandareLei: comision.trim() ? comision.trim().replace(",", ".") : null })}
              disabled={!poate}
              style={{ maxWidth: 160 }}
            />
            {oferta.sumeModificate?.includes("comisionRecomandareLei") && <span className="asterisc-rosu" title="sumă modificată — vezi istoricul">*</span>}
            {oferta.comisionAchitat && <span className="eticheta">achitat</span>}
          </div>
        </Camp>
      </div>
      {nou && (
        <div className="rand-campuri" style={{ marginTop: 8 }}>
          <Camp eticheta="Nume" obligatoriu>
            <input type="text" value={nou.nume} onChange={(e) => setNou({ ...nou, nume: e.target.value })} />
          </Camp>
          <Camp eticheta="Telefon" obligatoriu>
            <input type="text" value={nou.telefon} onChange={(e) => setNou({ ...nou, telefon: e.target.value })} />
          </Camp>
          <Camp eticheta="Localitate">
            <input type="text" value={nou.localitate} onChange={(e) => setNou({ ...nou, localitate: e.target.value })} />
          </Camp>
          <Camp eticheta="Tip">
            <select value={nou.tip} onChange={(e) => setNou({ ...nou, tip: e.target.value as "MONTATOR" | "CONSTRUCTOR" })}>
              <option value="MONTATOR">montator</option>
              <option value="CONSTRUCTOR">constructor</option>
            </select>
          </Camp>
          <div className="actiuni" style={{ alignSelf: "end" }}>
            <button className="buton mic" type="button" disabled={lucru || !nou.nume.trim() || nou.telefon.trim().length < 3} onClick={() => void salveaza({ montatorNou: { nume: nou.nume.trim(), telefon: nou.telefon.trim(), localitate: nou.localitate.trim() || null, tip: nou.tip } })}>
              Salvează și pune pe ofertă
            </button>
            <button className="buton secundar mic" type="button" onClick={() => setNou(null)}>
              Renunță
            </button>
          </div>
        </div>
      )}
      <p className="mic text-secundar">Comisionul e al persoanei care a recomandat; împărțirile compuse le fac oamenii între ei. „Achitat” îl bifează Administratorul, în tabelul de comenzi. Nimic de aici nu apare pe documente.</p>
    </section>
  );
}
