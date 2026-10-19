import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { apiImport, apiListe, type ImportPropunere as TipPropunere, type Problema, type RaportImport, type SchimbareCamp } from "../api";
import { Ajutor, Camp, Mesaj, textEroare } from "../components/ui";
import { Sectiune, TabelPaginat } from "../components/TabelPaginat";
import { dataRo } from "./ListePret";

const TITLU_REFERINTA: Record<string, string> = {
  "variante-profil": "Variante de profil",
  "culori-finisaj-grosime": "Culori finisaj × grosime",
  "garantii-finisaj-grosime": "Garanții",
  "liste-implicite-oferta": "Liste implicite pe rubrică",
  "trepte-desfasurata": "Trepte D",
};

function pret(v: number) {
  return v.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function Campuri({ campuri }: { campuri: SchimbareCamp[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {campuri.map((c) => (
        <li key={c.camp} className="mic">
          <strong>{c.camp}</strong>: {c.inainte ?? "—"} → {c.dupa ?? "—"}
        </li>
      ))}
    </ul>
  );
}

function ListaProbleme({ probleme }: { probleme: Problema[] }) {
  return (
    <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
      {probleme.map((p, i) => (
        <li key={i}>
          {p.fisier && <strong>{p.fisier}</strong>}
          {p.rand ? ` rândul ${p.rand}` : ""}
          {p.fisier ? ": " : ""}
          {p.mesaj}
        </li>
      ))}
    </ul>
  );
}

export function RaportFisiere({ raport }: { raport: RaportImport }) {
  const t = raport.totaluri;
  return (
    <>
      <h2>Raport</h2>
      <div className="grila-totaluri">
        <div>
          <span className="numar-mare">{t.randuri}</span>
          <span className="text-secundar mic">rânduri citite</span>
        </div>
        <div>
          <span className="numar-mare">{t.randuriPret}</span>
          <span className="text-secundar mic">rânduri de preț</span>
        </div>
        <div>
          <span className="numar-mare">{t.coduriDistincte}</span>
          <span className="text-secundar mic">coduri furnizor distincte</span>
        </div>
        <div>
          <span className="numar-mare">{t.faraCod}</span>
          <span className="text-secundar mic">fără cod</span>
        </div>
        <div>
          <span className="numar-mare">{t.perechiTablaPlana}</span>
          <span className="text-secundar mic">perechi tablă plană</span>
        </div>
        <div>
          <span className="numar-mare">{t.inactive}</span>
          <span className="text-secundar mic">inactive în CSV</span>
        </div>
      </div>
      <div className="tabel-invelis">
        <table className="tabel">
          <thead>
            <tr>
              <th>Fișier</th>
              <th>Tip</th>
              <th>Rânduri</th>
              <th>Coduri distincte</th>
              <th>Fără cod</th>
              <th>Față de versiunea anterioară</th>
            </tr>
          </thead>
          <tbody>
            {raport.fisiere.map((f) => (
              <tr key={f.nume}>
                <td>{f.nume}</td>
                <td className="mic">{f.tip === "produse" ? "produse" : (TITLU_REFERINTA[f.tip] ?? f.tip)}</td>
                <td>{f.randuri}</td>
                <td>{f.coduriDistincte ?? "–"}</td>
                <td>{f.faraCod ?? "–"}</td>
                <td className="mic">
                  {!f.anterior && (raport.primulImport ? "primul import" : "fișier nou")}
                  {f.anterior && f.avertizari.length === 0 && "identic ca numărători"}
                  {f.avertizari.length > 0 && <span style={{ color: "var(--avertizare-text)" }}>{f.avertizari.join(" · ")}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function ImportPropunere() {
  const { id } = useParams();
  const [propunere, setPropunere] = useState<TipPropunere | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [denumire, setDenumire] = useState("");
  const [valabilaDeLa, setValabilaDeLa] = useState(new Date().toISOString().slice(0, 10));
  const [seLucreaza, setSeLucreaza] = useState(false);

  async function incarca() {
    if (!id) return;
    try {
      const { propunere } = await apiImport.detaliu(id);
      setPropunere(propunere);
      if (!denumire && propunere.compartiment) setDenumire(`${propunere.compartiment.denumire} — ${new Date().toLocaleDateString("ro-RO")}`);
    } catch (e) {
      setEroare(textEroare(e));
    }
  }

  useEffect(() => {
    void incarca();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (eroare && !propunere) return <Mesaj tip="eroare">{eroare}</Mesaj>;
  if (!propunere) return null;

  const d = propunere.diferente;
  const p = d.produse;
  const blocat = propunere.erori.length > 0;
  const deschisa = propunere.status === "PROPUSA";

  async function confirma(e: FormEvent) {
    e.preventDefault();
    setEroare(null);
    setMesaj(null);
    setSeLucreaza(true);
    try {
      await apiImport.confirma(propunere!.id, propunere!.areProduse ? { denumire, valabilaDeLa } : {});
      setMesaj(propunere!.areProduse ? "Importul a fost confirmat: catalogul e actualizat și versiunea e creată ca schiță. O poți activa acum." : "Tabelele de referință au fost actualizate.");
      await incarca();
    } catch (err) {
      setEroare(textEroare(err));
    } finally {
      setSeLucreaza(false);
    }
  }

  async function activeaza() {
    if (!propunere?.listaPretId) return;
    setEroare(null);
    setSeLucreaza(true);
    try {
      const { arhivata } = await apiListe.activeaza(propunere.listaPretId);
      setMesaj(`Versiunea e activă${arhivata ? `; „${arhivata.denumire}” a fost arhivată` : ""}.`);
      await incarca();
    } catch (err) {
      setEroare(textEroare(err));
    } finally {
      setSeLucreaza(false);
    }
  }

  async function anuleaza() {
    setEroare(null);
    setSeLucreaza(true);
    try {
      await apiImport.anuleaza(propunere!.id);
      await incarca();
    } catch (err) {
      setEroare(textEroare(err));
    } finally {
      setSeLucreaza(false);
    }
  }

  return (
    <>
      <p className="mic">
        <Link to={`/zona-tehnica/import?compartiment=${propunere.compartimentId}`}>← Import</Link>
      </p>
      <div className="antet-pagina">
        <h1>
          Diferențe — {propunere.compartiment?.denumire}{" "}
          <span className={`eticheta ${deschisa ? "" : "inactiv"}`}>
            {propunere.status === "PROPUSA" ? "propusă" : propunere.status === "CONFIRMATA" ? "confirmată" : "anulată"}
          </span>
        </h1>
        <span className="text-secundar mic">
          {dataRo(propunere.createdAt)}
          {propunere.creatDe ? ` · ${propunere.creatDe.nume}` : ""}
        </span>
      </div>

      {propunere.erori.length > 0 && (
        <Mesaj tip="eroare">
          <strong>{propunere.erori.length} erori — confirmarea e blocată.</strong> Se corectează CSV-urile și se reîncarcă.
          <ListaProbleme probleme={propunere.erori.slice(0, 50)} />
          {propunere.erori.length > 50 && <p className="mic">… și încă {propunere.erori.length - 50}.</p>}
        </Mesaj>
      )}
      {propunere.avertizari.length > 0 && (
        <Mesaj tip="avertizare">
          <strong>{propunere.avertizari.length} avertizări</strong> (nu blochează).
          <ListaProbleme probleme={propunere.avertizari.slice(0, 50)} />
        </Mesaj>
      )}
      {mesaj && <Mesaj tip="ok">{mesaj}</Mesaj>}
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}

      {propunere.areProduse && (
        <>
          <h2>Produse și prețuri</h2>
          {propunere.raport.primulImport && <p className="text-secundar mic">Primul import pe acest compartiment: totul e „nou”.</p>}
          <Sectiune titlu="Produse noi" numar={p.noi.length}>
            <TabelPaginat
              randuri={p.noi}
              cheie={(r) => r.codIntern}
              coloane={[
                { titlu: "Cod furnizor", celula: (r) => r.codFurnizor ?? "—", latime: "150px" },
                { titlu: "Denumire", celula: (r) => r.denumire },
                { titlu: "Rubrică", celula: (r) => r.categorieOferta, latime: "200px" },
                { titlu: "UM", celula: (r) => r.um, latime: "70px" },
                { titlu: "Preț", celula: (r) => pret(r.pret), latime: "100px" },
                { titlu: "Fișier", celula: (r) => <span className="mic">{r.fisier}</span>, latime: "200px" },
              ]}
            />
          </Sectiune>
          <Sectiune titlu="Prețuri modificate" numar={p.preturiModificate.length}>
            <TabelPaginat
              randuri={p.preturiModificate}
              cheie={(r) => r.produsId}
              coloane={[
                { titlu: "Cod intern", celula: (r) => <span className="mic">{r.codIntern}</span>, latime: "170px" },
                { titlu: "Denumire", celula: (r) => r.denumire },
                { titlu: "Vechi", celula: (r) => pret(r.vechi), latime: "100px" },
                { titlu: "Nou", celula: (r) => <strong>{pret(r.nou)}</strong>, latime: "100px" },
                { titlu: "Diferență", celula: (r) => `${r.diferenta > 0 ? "+" : ""}${pret(r.diferenta)} (${r.procent > 0 ? "+" : ""}${r.procent}%)`, latime: "180px" },
              ]}
            />
          </Sectiune>
          <Sectiune titlu="Produse modificate (câmpuri)" numar={p.modificate.length}>
            <TabelPaginat
              randuri={p.modificate}
              cheie={(r) => r.produsId}
              coloane={[
                { titlu: "Denumire", celula: (r) => r.denumire },
                { titlu: "Câmpuri", celula: (r) => <Campuri campuri={r.campuri} /> },
              ]}
            />
          </Sectiune>
          <Sectiune titlu="Redenumiri (același produs)" numar={p.redenumiri.length}>
            <TabelPaginat
              randuri={p.redenumiri}
              cheie={(r) => r.produsId}
              coloane={[
                { titlu: "Cod furnizor", celula: (r) => r.codFurnizor ?? "—", latime: "150px" },
                { titlu: "Denumire veche", celula: (r) => r.denumireVeche },
                { titlu: "Denumire nouă", celula: (r) => <strong>{r.denumireNoua}</strong> },
                { titlu: "Cod intern", celula: (r) => <span className="mic">{r.codInternVechi} → {r.codInternNou}</span>, latime: "260px" },
                { titlu: "Alte câmpuri", celula: (r) => (r.campuri.length ? <Campuri campuri={r.campuri} /> : "—") },
              ]}
            />
          </Sectiune>
          <Sectiune titlu="Reapărute (inactive → active)" numar={p.reaparute.length}>
            <TabelPaginat randuri={p.reaparute} cheie={(r) => r.produsId} coloane={[{ titlu: "Cod intern", celula: (r) => <span className="mic">{r.codIntern}</span>, latime: "170px" }, { titlu: "Denumire", celula: (r) => r.denumire }]} />
          </Sectiune>
          <Sectiune titlu="Dispărute (devin inactive)" numar={p.disparute.length}>
            <TabelPaginat
              randuri={p.disparute}
              cheie={(r) => r.produsId}
              coloane={[
                { titlu: "Cod furnizor", celula: (r) => r.codFurnizor ?? "—", latime: "150px" },
                { titlu: "Cod intern", celula: (r) => <span className="mic">{r.codIntern}</span>, latime: "170px" },
                { titlu: "Denumire", celula: (r) => r.denumire },
              ]}
            />
          </Sectiune>
          <Sectiune titlu="Grupuri noi" numar={d.grupuriNoi.length}>
            <ul>
              {d.grupuriNoi.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </Sectiune>
          <Sectiune titlu="Familii noi" numar={d.familiiNoi.length}>
            <TabelPaginat randuri={d.familiiNoi} cheie={(r) => `${r.grup}|${r.familie}`} coloane={[{ titlu: "Grup", celula: (r) => r.grup, latime: "260px" }, { titlu: "Familie", celula: (r) => r.familie }]} />
          </Sectiune>
          <p className="text-secundar mic">
            Neschimbate: {p.neschimbate}
            {p.preturiNoi > 0 && !propunere.raport.primulImport ? ` · produse existente fără preț în versiunea activă: ${p.preturiNoi}` : ""}
          </p>
        </>
      )}

      {propunere.areReferinte && (
        <>
          <h2>Tabele de referință</h2>
          {Object.entries(d.referinte).map(([tip, r]) => (
            <div key={tip}>
              <h3>{TITLU_REFERINTA[tip] ?? tip}</h3>
              <Sectiune titlu="Apărute" numar={r.aparute.length}>
                <TabelPaginat randuri={r.aparute} cheie={(x) => x.cheie} coloane={[{ titlu: "Rând", celula: (x) => Object.values(x.valori).filter((v) => v !== null && v !== "").join(" · ") }]} />
              </Sectiune>
              <Sectiune titlu="Modificate" numar={r.modificate.length}>
                <TabelPaginat randuri={r.modificate} cheie={(x) => x.id} coloane={[{ titlu: "Rând", celula: (x) => x.cheie, latime: "320px" }, { titlu: "Câmpuri", celula: (x) => <Campuri campuri={x.campuri} /> }]} />
              </Sectiune>
              <Sectiune titlu="Reapărute" numar={r.reaparute.length}>
                <TabelPaginat randuri={r.reaparute} cheie={(x) => x.id} coloane={[{ titlu: "Rând", celula: (x) => x.cheie }]} />
              </Sectiune>
              <Sectiune titlu="Dispărute (devin inactive)" numar={r.disparute.length}>
                <TabelPaginat randuri={r.disparute} cheie={(x) => x.id} coloane={[{ titlu: "Rând", celula: (x) => x.cheie }]} />
              </Sectiune>
              <p className="text-secundar mic">Neschimbate: {r.neschimbate}</p>
            </div>
          ))}
        </>
      )}

      <RaportFisiere raport={propunere.raport} />

      <hr className="separator" />

      {deschisa && (
        <form className="formular" onSubmit={confirma} style={{ maxWidth: 720 }}>
          <h2>Confirmare</h2>
          {propunere.areProduse && (
            <div className="rand-campuri">
              <Camp eticheta="Denumirea versiunii" obligatoriu>
                <input type="text" value={denumire} onChange={(e) => setDenumire(e.target.value)} required />
              </Camp>
              <Camp eticheta="Valabilă de la" obligatoriu>
                <input type="date" value={valabilaDeLa} onChange={(e) => setValabilaDeLa(e.target.value)} required />
              </Camp>
            </div>
          )}
          {blocat && <Mesaj tip="eroare">Confirmarea e blocată de erori.</Mesaj>}
          <div className="actiuni">
            <button className="buton" type="submit" disabled={blocat || seLucreaza}>
              {seLucreaza ? "Se scrie…" : propunere.areProduse ? "Confirmă importul (creează versiunea ca schiță)" : "Aplică în catalog"}
            </button>
            <button className="buton secundar" type="button" onClick={anuleaza} disabled={seLucreaza}>
              Anulează propunerea
            </button>
          </div>
        </form>
      )}

      {propunere.status === "CONFIRMATA" && propunere.listaPret && (
        <div className="formular" style={{ maxWidth: 720 }}>
          <h2>Versiunea „{propunere.listaPret.denumire}”</h2>
          <p>
            Stare: <strong>{propunere.listaPret.status === "SCHITA" ? "schiță" : propunere.listaPret.status === "ACTIVA" ? "activă" : propunere.listaPret.status.toLowerCase()}</strong>
          </p>
          <div className="actiuni">
            {propunere.listaPret.status === "SCHITA" && (
              <button className="buton" onClick={activeaza} disabled={seLucreaza}>
                Activează versiunea
              </button>
            )}
            <Link className="buton secundar" to={`/zona-tehnica/liste/${propunere.listaPret.id}`}>
              Raportul versiunii
            </Link>
            <Link className="buton secundar" to="/zona-tehnica/produse">
              Vezi produsele
            </Link>
          </div>
        </div>
      )}

      <Ajutor>
        <ul>
          <li>Fiecare secțiune e pliată; numărul din titlu spune câte rânduri conține. Tabelele mari se arată paginat.</li>
          <li>
            <strong>Produse noi</strong> nu există încă în catalog. <strong>Prețuri modificate</strong>: față de versiunea activă (vechi → nou, diferența în monedă și în procente). <strong>Produse modificate</strong>: alte câmpuri decât prețul.
          </li>
          <li>
            <strong>Redenumiri</strong>: un produs dispărut și unul nou pe același cod furnizor, aceeași rubrică (și UM) — e tratat ca același produs, redenumit; își păstrează istoricul, primește denumirea și codul intern noi (jurnal: „cod intern: vechi → nou”). Ce rămâne ambiguu apare ca dispărut + nou, cu avertizare.
          </li>
          <li>
            <strong>Dispărute</strong> nu se șterg: devin inactive. <strong>Reapărute</strong>: produse inactive care sunt din nou în CSV și redevin active.
          </li>
          <li>Confirmarea scrie totul într-o singură operație (tot sau nimic) și creează versiunea ca schiță; „Activează versiunea” o face activă și o arhivează pe cea de dinainte.</li>
        </ul>
      </Ajutor>
    </>
  );
}
