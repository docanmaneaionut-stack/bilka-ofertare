import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiCompartimente, apiProduse, type Compartiment, type FiltreProduse, type Grup, type Produs } from "../api";
import { Camp, Mesaj, textEroare } from "../components/ui";

const PAGE_SIZE = 50;

export function Produse() {
  const navigate = useNavigate();
  const [compartimente, setCompartimente] = useState<Compartiment[]>([]);
  const [grupuri, setGrupuri] = useState<Grup[]>([]);
  const [filtre, setFiltre] = useState<FiltreProduse>({ page: 1, pageSize: PAGE_SIZE });
  const [rezultat, setRezultat] = useState<{ produse: Produs[]; total: number } | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);

  useEffect(() => {
    apiCompartimente
      .lista()
      .then(({ compartimente }) => setCompartimente(compartimente))
      .catch((e) => setEroare(textEroare(e)));
  }, []);

  useEffect(() => {
    if (!filtre.compartimentId) {
      setGrupuri([]);
      return;
    }
    apiCompartimente
      .detaliu(filtre.compartimentId)
      .then(({ compartiment }) => setGrupuri(compartiment.grupuri))
      .catch((e) => setEroare(textEroare(e)));
  }, [filtre.compartimentId]);

  useEffect(() => {
    apiProduse
      .lista(filtre)
      .then(setRezultat)
      .catch((e) => setEroare(textEroare(e)));
  }, [filtre]);

  function seteaza(schimbari: Partial<FiltreProduse>) {
    setFiltre((f) => ({ ...f, ...schimbari, page: 1 }));
  }

  const grupSelectat = grupuri.find((g) => g.id === filtre.grupId);
  const totalPagini = rezultat ? Math.max(1, Math.ceil(rezultat.total / PAGE_SIZE)) : 1;

  return (
    <>
      <div className="antet-pagina">
        <div>
          <h1>Produse</h1>
          <p className="text-secundar">Catalogul, pe compartimente. Importul listelor Bilka vine în sesiunea următoare; aici se adaugă și se corectează manual.</p>
        </div>
        <Link className="buton" to="/zona-tehnica/produse/nou">
          Adaugă produs
        </Link>
      </div>

      <div className="rand-campuri" style={{ marginBottom: 24 }}>
        <Camp eticheta="Caută" ajutor="cod sau denumire">
          <input type="search" value={filtre.q ?? ""} onChange={(e) => seteaza({ q: e.target.value })} />
        </Camp>
        <Camp eticheta="Compartiment">
          <select value={filtre.compartimentId ?? ""} onChange={(e) => seteaza({ compartimentId: e.target.value, grupId: "", familieId: "" })}>
            <option value="">toate</option>
            {compartimente.map((c) => (
              <option key={c.id} value={c.id}>
                {c.denumire}
              </option>
            ))}
          </select>
        </Camp>
        <Camp eticheta="Grup">
          <select value={filtre.grupId ?? ""} onChange={(e) => seteaza({ grupId: e.target.value, familieId: "" })} disabled={!filtre.compartimentId}>
            <option value="">toate</option>
            {grupuri.map((g) => (
              <option key={g.id} value={g.id}>
                {g.denumire}
              </option>
            ))}
          </select>
        </Camp>
        <Camp eticheta="Familie">
          <select value={filtre.familieId ?? ""} onChange={(e) => seteaza({ familieId: e.target.value })} disabled={!grupSelectat}>
            <option value="">toate</option>
            {grupSelectat?.familii.map((f) => (
              <option key={f.id} value={f.id}>
                {f.denumire}
              </option>
            ))}
          </select>
        </Camp>
        <Camp eticheta="Finisaj">
          <input type="text" value={filtre.finisaj ?? ""} onChange={(e) => seteaza({ finisaj: e.target.value })} />
        </Camp>
        <Camp eticheta="Grosime">
          <input type="text" value={filtre.grosime ?? ""} onChange={(e) => seteaza({ grosime: e.target.value })} />
        </Camp>
      </div>

      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}

      {rezultat && rezultat.total === 0 && <Mesaj>Niciun produs pentru filtrele alese.</Mesaj>}

      {rezultat && rezultat.total > 0 && (
        <>
          <p className="text-secundar mic">{rezultat.total} produse</p>
          <div className="tabel-invelis">
            <table className="tabel">
              <thead>
                <tr>
                  <th>Cod intern</th>
                  <th>Cod furnizor</th>
                  <th>Denumire</th>
                  <th>Compartiment / grup / familie</th>
                  <th>Finisaj</th>
                  <th>Grosime</th>
                  <th>UM</th>
                  <th>Stare</th>
                </tr>
              </thead>
              <tbody>
                {rezultat.produse.map((p) => (
                  <tr
                    key={p.id}
                    className={`selectabil ${p.activ ? "" : "inactiv"}`}
                    onClick={() => navigate(`/zona-tehnica/produse/${p.id}`)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") navigate(`/zona-tehnica/produse/${p.id}`);
                    }}
                  >
                    <td className="mic">{p.codIntern}</td>
                    <td className="mic">{p.codFurnizor ?? "–"}</td>
                    <td>
                      <strong>{p.denumire}</strong>
                    </td>
                    <td className="mic">
                      {p.compartiment?.denumire} / {p.grup?.denumire}
                      {p.familie ? ` / ${p.familie.denumire}` : ""}
                    </td>
                    <td>{p.finisaj ?? "–"}</td>
                    <td>{p.grosime ?? "–"}</td>
                    <td>{p.um}</td>
                    <td>
                      <span className={`eticheta ${p.activ ? "" : "inactiv"}`}>{p.activ ? "activ" : "inactiv"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="paginare">
            <button className="buton secundar mic" disabled={(filtre.page ?? 1) <= 1} onClick={() => setFiltre((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}>
              ← Anterioara
            </button>
            <span>
              Pagina {filtre.page ?? 1} din {totalPagini}
            </span>
            <button className="buton secundar mic" disabled={(filtre.page ?? 1) >= totalPagini} onClick={() => setFiltre((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}>
              Următoarea →
            </button>
          </div>
        </>
      )}
    </>
  );
}
