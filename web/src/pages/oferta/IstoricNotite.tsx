import { useEffect, useState } from "react";
import { apiNotite, apiStatus, type Atasament, type IntrareIstoric, type Notita, type OfertaDetaliu } from "../../api";
import { Mesaj, textEroare } from "../../components/ui";

const ETICHETA_TIP: Record<string, string> = {
  status: "status",
  antet: "antet",
  client: "client",
  produs: "produs",
  cantitate: "cantitate",
  pret: "preț",
  suma: "sumă",
  montator: "montator",
  completare: "completare",
};

// Istoricul (cap. 14): de la "Transmisa" - cine, cand, ce, inainte / dupa, mentiuni
export function Istoric({ oferta, reincarca }: { oferta: OfertaDetaliu; reincarca: number }) {
  const [intrari, setIntrari] = useState<IntrareIstoric[]>([]);
  const [eroare, setEroare] = useState<string | null>(null);
  useEffect(() => {
    apiStatus
      .istoric(oferta.id)
      .then((r) => setIntrari(r.intrari))
      .catch((e) => setEroare(textEroare(e)));
  }, [oferta.id, reincarca]);
  return (
    <section className="panou" id="istoric">
      <h2>Istoric</h2>
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      {!oferta.areIstoric && <p className="text-secundar">Cât e „În lucru” nu se ține istoric; începe la „Transmisă”.</p>}
      {intrari.length > 0 && (
        <ul className="istoric" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {intrari.map((i) => (
            <li key={i.id}>
              <span className="mic text-secundar">
                {new Date(i.moment).toLocaleString("ro-RO")} · {i.numeUtilizatorLaMoment} · {ETICHETA_TIP[i.tip] ?? i.tip}
                {i.camp && i.camp !== i.tip ? ` · ${i.camp}` : ""}
              </span>
              <div>
                {i.valoareInainte !== null && i.valoareDupa !== null ? (
                  <>
                    <s>{i.valoareInainte}</s> → <strong>{i.valoareDupa}</strong>
                  </>
                ) : i.valoareDupa !== null ? (
                  <>
                    adăugat: <strong>{i.valoareDupa}</strong>
                  </>
                ) : (
                  <>
                    scos: <s>{i.valoareInainte}</s>
                  </>
                )}
                {i.mentiuni && <div className="mic">„{i.mentiuni}”</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Notitele si atasamentele (cap. 14): pe oferta; raman accesibile din comanda
export function NotiteAtasamente({ oferta }: { oferta: OfertaDetaliu }) {
  const poate = oferta.poateModificaSume ?? oferta.poateModifica;
  const [notite, setNotite] = useState<Notita[]>([]);
  const [atasamente, setAtasamente] = useState<Atasament[]>([]);
  const [text, setText] = useState("");
  const [eroare, setEroare] = useState<string | null>(null);
  const [lucru, setLucru] = useState(false);

  const incarca = () => {
    apiNotite.lista(oferta.id).then((r) => setNotite(r.notite)).catch((e) => setEroare(textEroare(e)));
    apiNotite.atasamente(oferta.id).then((r) => setAtasamente(r.atasamente)).catch((e) => setEroare(textEroare(e)));
  };
  useEffect(incarca, [oferta.id]);

  async function adauga() {
    if (!text.trim()) return;
    setLucru(true);
    try {
      await apiNotite.adauga(oferta.id, text.trim());
      setText("");
      incarca();
    } catch (e) {
      setEroare(textEroare(e));
    } finally {
      setLucru(false);
    }
  }

  async function incarcaFisier(f: File | undefined) {
    if (!f) return;
    setLucru(true);
    try {
      await apiNotite.incarca(oferta.id, f);
      incarca();
    } catch (e) {
      setEroare(textEroare(e));
    } finally {
      setLucru(false);
    }
  }

  const marime = (n: number | null) => (n === null ? "" : n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);

  return (
    <section className="panou" id="notite">
      <h2>Notițe și atașamente</h2>
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      {poate && (
        <div className="actiuni" style={{ justifyContent: "flex-start", alignItems: "stretch" }}>
          <input type="text" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void adauga()} placeholder="notiță nouă (se adaugă, nu se rescrie)" style={{ flex: 1, minWidth: 240 }} />
          <button className="buton secundar mic" type="button" disabled={lucru || !text.trim()} onClick={() => void adauga()}>
            + Adaugă notița
          </button>
          <label className="buton secundar mic" style={{ cursor: "pointer" }}>
            + Atașament
            <input type="file" style={{ display: "none" }} disabled={lucru} onChange={(e) => void incarcaFisier(e.target.files?.[0])} />
          </label>
        </div>
      )}
      {notite.length === 0 && atasamente.length === 0 && <p className="text-secundar">Nicio notiță și niciun atașament încă.</p>}
      {notite.length > 0 && (
        <ul className="istoric" style={{ listStyle: "none", padding: 0 }}>
          {notite.map((n) => (
            <li key={n.id}>
              <span className="mic text-secundar">
                {new Date(n.moment).toLocaleString("ro-RO")} · {n.numeUtilizatorLaMoment}
              </span>
              <div>{n.text}</div>
            </li>
          ))}
        </ul>
      )}
      {atasamente.length > 0 && (
        <ul>
          {atasamente.map((a) => (
            <li key={a.id}>
              <a href={apiNotite.caleDescarcare(oferta.id, a.id)} target="_blank" rel="noreferrer">
                {a.nume}
              </a>{" "}
              <span className="mic text-secundar">
                {marime(a.marime)} · {a.incarcatDe ?? ""} · {new Date(a.moment).toLocaleString("ro-RO")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
