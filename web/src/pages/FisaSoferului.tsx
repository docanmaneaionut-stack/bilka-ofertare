import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiComenzi, dataRo, type FisaSoferului as DateFisa } from "../api";
import { BtnSterge } from "../components/BtnSterge";
import { Ajutor, Camp, Mesaj, textEroare } from "../components/ui";
import { lei, textRo } from "../lib/numere";
import { CasetaAviz } from "./Comenzi";

// Fisa soferului (S23; FISA-COMENZI cap. 4c; macheta docs/design/macheta-fisa-soferului.html):
// comenzile bifate in tabel (in adresa: ?c=id1,id2,...) -> fisa generata pe loc, pentru Gestiune
// (soferii au cont de Gestiune), Administratori si Admin general: ordinea blocurilor = ordinea
// traseului (sageti sus / jos), data, masina (text, neținut minte), telefonul Gestiunii; pe fiecare
// comanda blocul cu clientul si telefonul apelabil, adresa cu linkul la locatie, marfa, livrarea,
// montatorul, "de incasat", avizul de generat / deschis, tabelul de facturare. PDF-ul se deschide
// sau se descarca pentru WhatsApp; softul nu retine fisa.

const azi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export function FisaSoferului() {
  const [parametri, setParametri] = useSearchParams();
  const ids = (parametri.get("c") ?? "").split(",").filter(Boolean);
  const [masina, setMasina] = useState("");
  const [data, setData] = useState(azi());
  const [fisa, setFisa] = useState<DateFisa | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [ocupat, setOcupat] = useState(false);
  const [versiune, setVersiune] = useState(0);
  const [avizDeschis, setAvizDeschis] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length === 0) {
      setFisa(null);
      return;
    }
    apiComenzi
      .fisaSoferului({ comenzi: ids, masina: masina.trim() || null, data })
      .then((r) => {
        setFisa(r.fisa);
        setEroare(null);
      })
      .catch((e) => setEroare(textEroare(e)));
    // masina si data intra doar in PDF; nu reincarcam la fiecare tasta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parametri, versiune]);

  const muta = (i: number, directie: -1 | 1) => {
    const nou = [...ids];
    const j = i + directie;
    if (j < 0 || j >= nou.length) return;
    [nou[i], nou[j]] = [nou[j], nou[i]];
    setParametri({ c: nou.join(",") });
  };
  const scoate = (i: number) => setParametri({ c: ids.filter((_, k) => k !== i).join(",") });

  const pdf = async (descarca: boolean) => {
    setOcupat(true);
    try {
      const blob = await apiComenzi.fisaSoferuluiPdf({ comenzi: ids, masina: masina.trim() || null, data }, descarca);
      const url = URL.createObjectURL(blob);
      if (descarca) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `fisa-soferului-${data}.pdf`;
        a.click();
      } else {
        window.open(url, "_blank", "noopener");
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setEroare(null);
    } catch (e) {
      setEroare(textEroare(e));
    } finally {
      setOcupat(false);
    }
  };

  const ruleaza = async (f: () => Promise<unknown>) => {
    setOcupat(true);
    try {
      await f();
      setVersiune((v) => v + 1);
      setEroare(null);
    } catch (e) {
      setEroare(textEroare(e));
    } finally {
      setOcupat(false);
    }
  };

  const tabelFacturare = (comandaId: string) =>
    ruleaza(async () => {
      const r = await apiComenzi.genereazaDocument(comandaId, "TABEL_FACTURARE");
      window.open(apiComenzi.caleDocument(comandaId, r.document.id), "_blank", "noopener");
    });

  return (
    <>
      <div className="antet-pagina">
        <div>
          <h1 style={{ marginBottom: 4 }}>Fișa șoferului</h1>
          <span className="text-secundar">
            {fisa ? `${fisa.dataText} · ${fisa.livrari} ${fisa.livrari === 1 ? "livrare" : "livrări"}` : "nicio comandă bifată"} · <Link to="/comenzi">înapoi la comenzi</Link>
          </span>
        </div>
        <div className="actiuni" style={{ flexWrap: "wrap" }}>
          <Camp eticheta="Data">
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </Camp>
          <Camp eticheta="Mașina">
            <input value={masina} onChange={(e) => setMasina(e.target.value)} placeholder="ex. Iveco VN 12 ABC" />
          </Camp>
          <button className="buton" disabled={ocupat || ids.length === 0} onClick={() => void pdf(false)}>
            Deschide PDF
          </button>
          <button className="buton secundar" disabled={ocupat || ids.length === 0} onClick={() => void pdf(true)} title="descarcă PDF-ul, apoi atașează-l în WhatsApp">
            Descarcă pentru WhatsApp
          </button>
        </div>
      </div>
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      {fisa?.avertizari.map((a) => (
        <Mesaj key={a} tip="avertizare">
          {a}
        </Mesaj>
      ))}
      {ids.length === 0 && (
        <Mesaj>
          Bifează comenzile în <Link to="/comenzi">tabelul de comenzi</Link> și apasă „Fișa șoferului”.
        </Mesaj>
      )}
      {fisa && (
        <p className="mic text-secundar">
          Gestiune: {fisa.gestiune.nume}
          {fisa.gestiune.telefon ? ` · ${fisa.gestiune.telefon}` : ""} · depozit: {fisa.firma.adresa}. Ordinea de mai jos e ordinea traseului — schimb-o cu săgețile.
        </p>
      )}
      {fisa?.blocuri.map((b, i) => (
        <section key={b.comandaId} className="caseta" style={{ marginBottom: 12 }}>
          <div className="actiuni" style={{ justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>
              <span className="text-secundar">{i + 1}.</span> {b.client.nume} <span className="mic text-secundar">comanda {b.numarComplet}{b.completareLa ? ` (completare la ${b.completareLa})` : ""}{b.manuala ? " (manuală)" : ""}</span>
            </h3>
            <div className="actiuni" style={{ gap: 6 }}>
              <a className="buton secundar mic" href={`tel:${b.client.telefon.replace(/\s/g, "")}`}>
                📞 {b.client.telefon}
              </a>
              <button className="buton secundar mic" disabled={i === 0} onClick={() => muta(i, -1)} aria-label="mai sus">
                ▲
              </button>
              <button className="buton secundar mic" disabled={i === fisa.blocuri.length - 1} onClick={() => muta(i, 1)} aria-label="mai jos">
                ▼
              </button>
              <BtnSterge onClick={() => scoate(i)} eticheta="scoate din fișă" />
            </div>
          </div>
          <p>
            <strong>Adresa:</strong> {b.adresa ?? "—"}
            {b.locatieUrl && (
              <>
                {" "}
                ·{" "}
                <a href={b.locatieUrl} target="_blank" rel="noreferrer">
                  locația pe hartă
                </a>
              </>
            )}
          </p>
          <p>
            <strong>Marfa:</strong> {textRo(b.rezumat)}
            {(b.coli || b.categorii.length > 0) && <span className="mic text-secundar"> · {[b.coli, ...b.categorii].filter(Boolean).join(" · ")}</span>}
          </p>
          <p>
            <strong>Livrare:</strong> {b.livrare.indicatii ?? <span className="text-secundar">fără indicații</span>}
            {b.livrare.data ? ` · ziua: ${dataRo(b.livrare.data)}` : ""}
          </p>
          <p>
            <strong>Montator:</strong>{" "}
            {b.montator ? (
              <>
                {b.montator.nume}
                {b.montator.telefon && (
                  <>
                    {" "}
                    · <a href={`tel:${b.montator.telefon.replace(/\s/g, "")}`}>📞 {b.montator.telefon}</a>
                  </>
                )}
              </>
            ) : (
              "—"
            )}
          </p>
          <p>
            <strong>De încasat:</strong> <span className="numar-mare">{lei(b.restLei)}</span>
          </p>
          <div className="actiuni" style={{ gap: 6, flexWrap: "wrap" }}>
            {b.avize.map((a) =>
              a.documentId ? (
                <a key={a.id} className="buton secundar mic" href={apiComenzi.caleDocument(b.comandaId, a.documentId)} target="_blank" rel="noreferrer">
                  Aviz · livrare din {dataRo(a.dataLivrarii)}
                  {a.partial ? " (parțială)" : ""}
                </a>
              ) : null,
            )}
            {!b.manuala && (
              <button className="buton secundar mic" disabled={ocupat} onClick={() => setAvizDeschis(avizDeschis === b.comandaId ? null : b.comandaId)}>
                {avizDeschis === b.comandaId ? "Închide avizul" : "+ Aviz pentru această livrare"}
              </button>
            )}
            {!b.manuala && (
              <button className="buton secundar mic" disabled={ocupat} onClick={() => void tabelFacturare(b.comandaId)} title="generează și deschide tabelul de facturare">
                Tabel de facturare
              </button>
            )}
          </div>
          {avizDeschis === b.comandaId && <CasetaAviz c={{ id: b.comandaId, tip: b.manuala ? "MANUALA" : "DIN_OFERTA", avize: [], drepturi: { aviz: true } }} ocupat={ocupat} ruleaza={ruleaza} deschisInitial />}
        </section>
      ))}
      <Ajutor>
        <ul>
          <li>Fișa se generează pe loc din comenzile bifate în tabelul de comenzi; softul n-o reține — cine vrea s-o păstreze salvează PDF-ul. Mașina și data intră doar în PDF.</li>
          <li>Ordinea blocurilor e ordinea propusă a traseului; o schimbi cu săgețile. Telefoanele din PDF se pot apela cu o atingere (legături „tel:”), iar „locația pe hartă” deschide linkul salvat pe comandă (caseta „Livrare și facturare”).</li>
          <li>„De încasat” e restul comenzii din încasările confirmate. La întoarcere, fișa semnată și banii ajung la Gestiune.</li>
          <li>Din fiecare bloc generezi avizul de însoțire a mărfii pentru livrarea respectivă (cu cantitățile ajustabile) și tabelul de facturare; amândouă rămân în „Doc.” al comenzii. Trimiterea pe WhatsApp e manuală: „Descarcă pentru WhatsApp”, apoi atașezi fișierul.</li>
          <li>Telefonul Gestiunii de pe fișă e telefonul contului tău („Contul meu”).</li>
        </ul>
      </Ajutor>
    </>
  );
}
