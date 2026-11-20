import { useEffect, useState } from "react";
import { apiMontatori, apiStatus, ETICHETA_TIP_PERSOANA, type Montator as MontatorTip, type OfertaDetaliu, type TipPersoana } from "../../api";
import { Camp, eroareCamp, Mesaj, textEroare } from "../../components/ui";

// Montatorul / recomandarea (FISA-OFERTARE cap. 12): o singura persoana pe oferta,
// din lista agentului (autocompletare) sau noua; comisionul ca suma fixa, cu
// asterisc rosu si istoric; "achitat" il bifeaza Administratorul (Etapa 5).
// Nimic pe documente; sursa clientului ramane separata (statistica).
//
// S26b (MODIFICAREA M8): doua rubrici. RECOMANDARE - comision: persoana care a adus lucrarea (din lista
// agentului - montator / constructor / colaborator - sau noua) + comisionul -> tabelul de vanzari.
// MONTATOR (EXECUTIE): nume + telefon, din lista sau scris de mana -> coloana Montator din comenzi si fisa
// soferului; daca e completat, telefonul e obligatoriu. Butoanele „același ca recomandarea”, „clientul este
// montatorul” si, simetric, „același ca montatorul”. Dupa „Comandat” montatorul se schimba de pe comanda.
export function Montator({ oferta, onOferta, mentiuni }: { oferta: OfertaDetaliu; onOferta: (o: OfertaDetaliu) => void; mentiuni: string }) {
  const poate = oferta.poateModificaSume ?? oferta.poateModifica;
  const [cautare, setCautare] = useState("");
  const [sugestii, setSugestii] = useState<MontatorTip[]>([]);
  const [nou, setNou] = useState<{ nume: string; telefon: string; localitate: string; tip: TipPersoana } | null>(null);
  // montatorul de executie: scris de mana sau ales din lista
  const comandata = oferta.status === "COMANDAT";
  const executie = comandata ? (oferta.comanda?.montator ?? null) : (oferta.montatorExecutie ?? null);
  const [exNume, setExNume] = useState("");
  const [exTelefon, setExTelefon] = useState("");
  const [sugestiiEx, setSugestiiEx] = useState<MontatorTip[]>([]);
  useEffect(() => {
    if (exNume.trim().length < 2) {
      setSugestiiEx([]);
      return;
    }
    const t = setTimeout(() => apiMontatori.lista(exNume.trim()).then((r) => setSugestiiEx(r.montatori)).catch(() => setSugestiiEx([])), 250);
    return () => clearTimeout(t);
  }, [exNume]);
  const [comision, setComision] = useState(oferta.comisionRecomandareLei ?? "");
  const [eroare, setEroare] = useState<string | null>(null);
  const [eroareCerere, setEroareCerere] = useState<unknown>(null);
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
    setEroareCerere(null);
    setLucru(true);
    try {
      const { oferta: dupa } = await apiStatus.montator(oferta.id, { ...date, mentiuni: mentiuni.trim() || null });
      onOferta(dupa);
      setCautare("");
      setSugestii([]);
      setNou(null);
      setExNume("");
      setExTelefon("");
      setSugestiiEx([]);
    } catch (e) {
      setEroare(textEroare(e));
      setEroareCerere(e);
    } finally {
      setLucru(false);
    }
  }

  // „același ca montatorul”: persoana din lista ta cu acelasi telefon, altfel una noua in lista
  async function recomandareCaMontatorul() {
    if (!executie?.telefon) return;
    const cifre = executie.telefon.replace(/\D/g, "");
    let existent: MontatorTip | undefined;
    try {
      existent = (await apiMontatori.lista(cifre)).montatori.find((m) => m.telefon.replace(/\D/g, "") === cifre);
    } catch {
      existent = undefined;
    }
    await salveaza(existent ? { montatorId: existent.id } : { montatorNou: { nume: executie.nume, telefon: executie.telefon, tip: "MONTATOR" } });
  }

  return (
    <section className="panou">
      <h2>Montator și recomandare</h2>
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      <h3>Recomandare — comision</h3>
      <div className="rand-campuri">
        <Camp eticheta="Cine a adus lucrarea (din lista ta)">
          {oferta.montator ? (
            <div className="actiuni" style={{ justifyContent: "flex-start" }}>
              <span>
                <strong>{oferta.montator.nume}</strong> · {oferta.montator.telefon}
                {oferta.montator.localitate ? ` · ${oferta.montator.localitate}` : ""} · {ETICHETA_TIP_PERSOANA[oferta.montator.tip] ?? "montator"}
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
              {poate && !nou && executie?.telefon && (
                <button type="button" className="buton secundar mic" style={{ marginTop: 6, justifySelf: "start" }} disabled={lucru} onClick={() => void recomandareCaMontatorul()}>
                  același ca montatorul
                </button>
              )}
            </>
          )}
        </Camp>
        <Camp eticheta="Comision recomandare (lei, sumă fixă)" eroare={eroareCamp(eroareCerere, "comisionRecomandareLei")}>
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
          <Camp eticheta="Nume" obligatoriu eroare={eroareCamp(eroareCerere, "montatorNou.nume")}>
            <input type="text" value={nou.nume} onChange={(e) => setNou({ ...nou, nume: e.target.value })} />
          </Camp>
          <Camp eticheta="Telefon" obligatoriu eroare={eroareCamp(eroareCerere, "montatorNou.telefon")}>
            <input type="text" value={nou.telefon} onChange={(e) => setNou({ ...nou, telefon: e.target.value })} />
          </Camp>
          <Camp eticheta="Localitate" eroare={eroareCamp(eroareCerere, "montatorNou.localitate")}>
            <input type="text" value={nou.localitate} onChange={(e) => setNou({ ...nou, localitate: e.target.value })} />
          </Camp>
          <Camp eticheta="Tip">
            <select value={nou.tip} onChange={(e) => setNou({ ...nou, tip: e.target.value as TipPersoana })}>
              <option value="MONTATOR">montator</option>
              <option value="CONSTRUCTOR">constructor</option>
              <option value="COLABORATOR">colaborator</option>
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
      <h3>Montator (execuție)</h3>
      {comandata ? (
        <p>
          {executie ? (
            <>
              <strong>{executie.nume}</strong> · {executie.telefon}
            </>
          ) : (
            <span className="text-secundar">necompletat</span>
          )}{" "}
          <span className="mic text-secundar">— se schimbă de pe comandă</span>
        </p>
      ) : executie ? (
        <div className="actiuni" style={{ justifyContent: "flex-start" }}>
          <span>
            <strong>{executie.nume}</strong> · {executie.telefon}
          </span>
          {poate && (
            <button className="buton secundar mic" type="button" disabled={lucru} onClick={() => void salveaza({ montatorExecutie: null })}>
              Scoate
            </button>
          )}
        </div>
      ) : (
        <div className="rand-campuri">
          <Camp eticheta="Cine montează (din lista ta sau scris de mână)" eroare={eroareCamp(eroareCerere, "montatorExecutie.nume")}>
            <input type="text" value={exNume} onChange={(e) => setExNume(e.target.value)} disabled={!poate} />
            {sugestiiEx.length > 0 && (
              <ul className="lista-sugestii">
                {sugestiiEx.map((m) => (
                  <li key={m.id}>
                    <button type="button" className="buton secundar mic" disabled={lucru} onClick={() => void salveaza({ montatorExecutie: { nume: m.nume, telefon: m.telefon } })}>
                      {m.nume} · {m.telefon}
                      {m.localitate ? ` · ${m.localitate}` : ""}
                      {m.adaugatDeNume ? ` · adăugat de ${m.adaugatDeNume}` : ""}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Camp>
          <Camp eticheta="Telefon (îl sună șoferul la livrare)" eroare={eroareCamp(eroareCerere, "montatorExecutie.telefon")}>
            <input type="tel" value={exTelefon} onChange={(e) => setExTelefon(e.target.value)} disabled={!poate} />
          </Camp>
          {poate && (
            <div className="actiuni" style={{ alignSelf: "end", justifyContent: "flex-start", flexWrap: "wrap" }}>
              {exNume.trim() !== "" && (
                <button className="buton mic" type="button" disabled={lucru || exTelefon.trim() === ""} onClick={() => void salveaza({ montatorExecutie: { nume: exNume.trim(), telefon: exTelefon.trim() } })}>
                  Salvează montatorul
                </button>
              )}
              {exNume.trim() !== "" && exTelefon.trim() === "" && <span className="explicatie-buton">scrie și telefonul</span>}
              {oferta.montator && (
                <button className="buton secundar mic" type="button" disabled={lucru} onClick={() => void salveaza({ montatorExecutie: { nume: oferta.montator!.nume, telefon: oferta.montator!.telefon } })}>
                  același ca recomandarea
                </button>
              )}
              {oferta.client.telefon ? (
                <button className="buton secundar mic" type="button" disabled={lucru} onClick={() => void salveaza({ montatorExecutie: { nume: oferta.client.nume, telefon: oferta.client.telefon! } })}>
                  clientul este montatorul
                </button>
              ) : (
                <span className="explicatie-buton">„clientul este montatorul” cere telefonul clientului</span>
              )}
            </div>
          )}
        </div>
      )}
      <p className="mic text-secundar">Recomandarea și comisionul ei merg în tabelul de vânzări; montatorul de execuție în tabelul de comenzi și pe fișa șoferului. Pot fi aceeași persoană sau nu; oricare poate lipsi. Un montator scris de mână intră singur în lista ta și e propus data viitoare. „Achitat” îl bifează Administratorul, în tabelul de comenzi. Nimic de aici nu apare pe documente.</p>
    </section>
  );
}
