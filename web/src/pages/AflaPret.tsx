import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiPretRapid, type PretRapid, type ProdusEditor } from "../api";
import { Ajutor, Camp, Mesaj, textEroare } from "../components/ui";

// "Afla pret" (FISA-OFERTARE cap. 21): o casuta de cautare, produsele potrivite de la
// toti furnizorii, alegerea caracteristicilor (finisaj, grosime, varianta), apoi
// pretul contului cu TVA pe unitate. Fara istoric, fara camp de adaos.
export function AflaPret() {
  const [q, setQ] = useState("");
  const [produse, setProduse] = useState<ProdusEditor[]>([]);
  const [eroare, setEroare] = useState<string | null>(null);
  const [familie, setFamilie] = useState<string | null>(null);
  const [finisaj, setFinisaj] = useState("");
  const [grosime, setGrosime] = useState("");
  const [varianta, setVarianta] = useState("");
  const [pret, setPret] = useState<PretRapid | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setProduse([]);
      return;
    }
    const t = setTimeout(() => {
      apiPretRapid
        .cauta(q.trim())
        .then((r) => {
          setProduse(r.produse);
          setEroare(null);
        })
        .catch((e) => setEroare(textEroare(e)));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // gruparea pe familie (model), apoi caracteristicile din produsele familiei
  const familii = useMemo(() => {
    const m = new Map<string, ProdusEditor[]>();
    for (const p of produse) {
      const cheie = `${p.compartiment} · ${p.grup} · ${p.familie ?? p.denumire}`;
      m.set(cheie, [...(m.get(cheie) ?? []), p]);
    }
    return m;
  }, [produse]);
  const aleFamiliei = familie ? (familii.get(familie) ?? []) : [];
  const finisaje = [...new Set(aleFamiliei.map((p) => p.finisaj ?? ""))];
  const grosimi = [...new Set(aleFamiliei.filter((p) => (p.finisaj ?? "") === finisaj).map((p) => p.grosime ?? ""))];
  const variante = [...new Set(aleFamiliei.filter((p) => (p.finisaj ?? "") === finisaj && (p.grosime ?? "") === grosime).map((p) => p.varianta ?? ""))];
  const ales = aleFamiliei.find((p) => (p.finisaj ?? "") === finisaj && (p.grosime ?? "") === grosime && (p.varianta ?? "") === varianta) ?? null;

  useEffect(() => {
    setPret(null);
    if (!ales) return;
    apiPretRapid
      .pret(ales.id)
      .then(setPret)
      .catch((e) => setEroare(textEroare(e)));
  }, [ales]);

  const alegeFamilia = (cheie: string) => {
    setFamilie(cheie);
    const prima = familii.get(cheie)?.[0];
    setFinisaj(prima?.finisaj ?? "");
    setGrosime(prima?.grosime ?? "");
    setVarianta(prima?.varianta ?? "");
  };

  return (
    <>
      <div className="antet-pagina">
        <h1>Află preț</h1>
        <div className="actiuni">
          <Link className="buton secundar" to="/oferte">
            ← Oferte
          </Link>
        </div>
      </div>
      <section className="panou">
        <Camp eticheta="Caută un produs (clasic, adriatic, fronton, folie 120…)">
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setFamilie(null);
            }}
            autoFocus
            style={{ minWidth: 320 }}
          />
        </Camp>
        {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
        {q.trim().length >= 2 && familii.size === 0 && <p className="text-secundar">Niciun produs potrivit.</p>}
        {familii.size > 0 && (
          <ul>
            {[...familii.keys()].map((cheie) => (
              <li key={cheie}>
                <button className={`buton mic ${familie === cheie ? "" : "secundar"}`} type="button" onClick={() => alegeFamilia(cheie)}>
                  {cheie}
                </button>{" "}
                <span className="mic text-secundar">{familii.get(cheie)!.length} variante</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {familie && (
        <section className="panou">
          <h2>{familie}</h2>
          <div className="rand-campuri">
            {finisaje.some(Boolean) && (
              <Camp eticheta="Finisaj">
                <select value={finisaj} onChange={(e) => setFinisaj(e.target.value)}>
                  {finisaje.map((f) => (
                    <option key={f} value={f}>
                      {f || "—"}
                    </option>
                  ))}
                </select>
              </Camp>
            )}
            {grosimi.some(Boolean) && (
              <Camp eticheta="Grosime">
                <select value={grosime} onChange={(e) => setGrosime(e.target.value)}>
                  {grosimi.map((g) => (
                    <option key={g} value={g}>
                      {g || "—"}
                    </option>
                  ))}
                </select>
              </Camp>
            )}
            {variante.some(Boolean) && (
              <Camp eticheta="Variantă">
                <select value={varianta} onChange={(e) => setVarianta(e.target.value)}>
                  {variante.map((v) => (
                    <option key={v} value={v}>
                      {v || "—"}
                    </option>
                  ))}
                </select>
              </Camp>
            )}
          </div>
          {ales && (
            <p className="mic text-secundar">
              {ales.denumire} · {ales.cod}
              {ales.desfasurata ? ` · desfășurată ${ales.desfasurata}` : ""}
            </p>
          )}
          {pret && (
            <div className="grila-totaluri">
              <div>
                <span className="text-secundar mic">Prețul contului, cu TVA, pe {pret.pret.um}</span>
                <span className="numar-mare">{Number(pret.pret.achizitieContLeiCuTva).toLocaleString("ro-RO", { minimumFractionDigits: 2 })} lei</span>
                <span className="mic text-secundar">
                  {pret.pret.achizitieContEur} EUR fără TVA · curs achiziție {pret.pret.cursAchizitie} ({pret.pret.dataCurs})
                </span>
              </div>
              {pret.pret.pretBazaEur && (
                <div>
                  <span className="text-secundar mic">Prețul de bază (catalog)</span>
                  <span className="numar-mare">{pret.pret.pretBazaEur} EUR</span>
                </div>
              )}
            </div>
          )}
          {pret?.pret.avertizareCurs && <Mesaj tip="avertizare">{pret.pret.avertizareCurs}</Mesaj>}
        </section>
      )}
      <Ajutor>
        <ul>
          <li>Prețul e achiziția contului: prețul de bază + adaosul contului, la cursul de achiziție al zilei (BNR + 1 %), cu TVA, pe unitate. Nu se memorează nimic.</li>
          <li>Caută pe cuvinte: „folie” aduce toate foliile, „folie 120” doar cele de 120 g, „fronton” toate frontoanele cu desfășuratele lor.</li>
        </ul>
      </Ajutor>
    </>
  );
}
