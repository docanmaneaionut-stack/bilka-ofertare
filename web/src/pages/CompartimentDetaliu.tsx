import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { apiCompartimente, type CompartimentDetaliu as TipDetaliu, type Familie, type Grup } from "../api";
import { Ajutor, Mesaj, textEroare } from "../components/ui";
import { AjutorCampuriCompartiment, FormularCompartiment, type DateCompartiment } from "./Compartimente";

function spreFormular(c: TipDetaliu): DateCompartiment {
  return {
    denumire: c.denumire,
    codScurt: c.codScurt,
    tip: c.tip,
    moneda: c.moneda,
    modPret: c.modPret,
    formatImport: c.formatImport ?? "",
    contactFurnizorNume: c.contactFurnizorNume ?? "",
    contactFurnizorTelefon: c.contactFurnizorTelefon ?? "",
    contactFurnizorEmail: c.contactFurnizorEmail ?? "",
    contactDirectorZonal: c.contactDirectorZonal ?? "",
    activ: c.activ,
  };
}

// un rand editabil (denumire + ordine) - folosit si la grupuri, si la familii
function RandDenumireOrdine({
  initial,
  onSalveaza,
  onRenunta,
  etichetaSalvare,
  autoFocus,
}: {
  initial: { denumire: string; ordine: number };
  onSalveaza: (d: { denumire: string; ordine: number }) => Promise<void>;
  onRenunta?: () => void;
  etichetaSalvare: string;
  autoFocus?: boolean;
}) {
  const [denumire, setDenumire] = useState(initial.denumire);
  const [ordine, setOrdine] = useState(String(initial.ordine));
  const [eroare, setEroare] = useState<string | null>(null);

  async function trimite(e: FormEvent) {
    e.preventDefault();
    setEroare(null);
    try {
      await onSalveaza({ denumire: denumire.trim(), ordine: Number(ordine) || 0 });
    } catch (err) {
      setEroare(textEroare(err));
    }
  }

  return (
    <form onSubmit={trimite} className="formular" style={{ gridTemplateColumns: "1fr 120px auto auto", alignItems: "center", gap: 12 }}>
      <input type="text" value={denumire} onChange={(e) => setDenumire(e.target.value)} placeholder="Denumire" required autoFocus={autoFocus} aria-label="Denumire" />
      <input type="number" value={ordine} onChange={(e) => setOrdine(e.target.value)} aria-label="Ordine" />
      <button className="buton mic" type="submit">
        {etichetaSalvare}
      </button>
      {onRenunta && (
        <button className="buton secundar mic" type="button" onClick={onRenunta}>
          Renunță
        </button>
      )}
      {eroare && (
        <div style={{ gridColumn: "1 / -1" }}>
          <Mesaj tip="eroare">{eroare}</Mesaj>
        </div>
      )}
    </form>
  );
}

function BlocGrup({ grup, onSchimbat }: { grup: Grup; onSchimbat: () => Promise<void> }) {
  const [editeaza, setEditeaza] = useState(false);
  const [adaugaFamilie, setAdaugaFamilie] = useState(false);
  const [familieEditata, setFamilieEditata] = useState<Familie | null>(null);

  return (
    <section className="mesaj" style={{ padding: 20 }}>
      {editeaza ? (
        <RandDenumireOrdine
          initial={grup}
          etichetaSalvare="Salvează"
          autoFocus
          onRenunta={() => setEditeaza(false)}
          onSalveaza={async (d) => {
            await apiCompartimente.actualizeazaGrup(grup.id, d);
            setEditeaza(false);
            await onSchimbat();
          }}
        />
      ) : (
        <div className="antet-pagina" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>
            {grup.denumire} <span className="text-secundar mic">· ordine {grup.ordine}</span>
          </h3>
          <div className="actiuni">
            <button className="buton secundar mic" onClick={() => setEditeaza(true)}>
              Editează grupul
            </button>
            <button className="buton secundar mic" onClick={() => setAdaugaFamilie(true)}>
              Adaugă familie
            </button>
          </div>
        </div>
      )}

      {grup.familii.length === 0 && !adaugaFamilie && <p className="text-secundar mic">Fără familii încă.</p>}

      {grup.familii.length > 0 && (
        <table className="tabel" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Familie</th>
              <th style={{ width: 120 }}>Ordine</th>
              <th style={{ width: 140 }}></th>
            </tr>
          </thead>
          <tbody>
            {grup.familii.map((f) =>
              familieEditata?.id === f.id ? (
                <tr key={f.id}>
                  <td colSpan={3}>
                    <RandDenumireOrdine
                      initial={f}
                      etichetaSalvare="Salvează"
                      autoFocus
                      onRenunta={() => setFamilieEditata(null)}
                      onSalveaza={async (d) => {
                        await apiCompartimente.actualizeazaFamilie(f.id, d);
                        setFamilieEditata(null);
                        await onSchimbat();
                      }}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={f.id}>
                  <td>{f.denumire}</td>
                  <td>{f.ordine}</td>
                  <td>
                    <button className="buton secundar mic" onClick={() => setFamilieEditata(f)}>
                      Editează
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      )}

      {adaugaFamilie && (
        <div style={{ marginTop: 16 }}>
          <RandDenumireOrdine
            initial={{ denumire: "", ordine: grup.familii.length + 1 }}
            etichetaSalvare="Adaugă familia"
            autoFocus
            onRenunta={() => setAdaugaFamilie(false)}
            onSalveaza={async (d) => {
              await apiCompartimente.adaugaFamilie(grup.id, d);
              setAdaugaFamilie(false);
              await onSchimbat();
            }}
          />
        </div>
      )}
    </section>
  );
}

export function CompartimentDetaliu() {
  const { id } = useParams();
  const [compartiment, setCompartiment] = useState<TipDetaliu | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [editeaza, setEditeaza] = useState(false);
  const [salvat, setSalvat] = useState(false);
  const [adaugaGrup, setAdaugaGrup] = useState(false);

  async function incarca() {
    if (!id) return;
    try {
      const { compartiment } = await apiCompartimente.detaliu(id);
      setCompartiment(compartiment);
    } catch (e) {
      setEroare(textEroare(e));
    }
  }

  useEffect(() => {
    void incarca();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (eroare) return <Mesaj tip="eroare">{eroare}</Mesaj>;
  if (!compartiment) return null;

  return (
    <>
      <p className="mic">
        <Link to="/zona-tehnica/compartimente">← Toate compartimentele</Link>
      </p>
      <div className="antet-pagina">
        <div>
          <h1>
            {compartiment.denumire} <span className="text-secundar">· {compartiment.codScurt}</span>
          </h1>
          <p className="text-secundar">
            {compartiment.tip === "FURNIZOR" ? "Furnizor" : "Stoc propriu"} · {compartiment.moneda} ·{" "}
            {compartiment.modPret === "LISTA_ACHIZITIE" ? "listă de achiziție" : "catalog cu discount"}
            {!compartiment.activ && " · INACTIV"}
          </p>
          {compartiment.contactFurnizorNume && (
            <p className="mic">
              Contact comenzi: {compartiment.contactFurnizorNume}
              {compartiment.contactFurnizorTelefon && ` · ${compartiment.contactFurnizorTelefon}`}
              {compartiment.contactFurnizorEmail && ` · ${compartiment.contactFurnizorEmail}`}
              {compartiment.contactDirectorZonal && ` · director zonal: ${compartiment.contactDirectorZonal}`}
            </p>
          )}
        </div>
        {!editeaza && (
          <button className="buton secundar" onClick={() => setEditeaza(true)}>
            Editează compartimentul
          </button>
        )}
      </div>

      {salvat && <Mesaj tip="ok">Modificările au fost salvate și scrise în jurnal.</Mesaj>}

      {editeaza && (
        <>
          <h2>Editare compartiment</h2>
          <FormularCompartiment
            initial={spreFormular(compartiment)}
            codScurtBlocat={(compartiment._count?.produse ?? 0) > 0}
            etichetaSalvare="Salvează modificările"
            onRenunta={() => setEditeaza(false)}
            onSalveaza={async (date) => {
              await apiCompartimente.actualizeaza(compartiment.id, date);
              setEditeaza(false);
              setSalvat(true);
              await incarca();
            }}
          />
          <hr className="separator" />
        </>
      )}

      <div className="antet-pagina">
        <h2 style={{ margin: 0 }}>Grupuri și familii</h2>
        {!adaugaGrup && (
          <button className="buton" onClick={() => setAdaugaGrup(true)}>
            Adaugă grup
          </button>
        )}
      </div>
      {adaugaGrup && (
        <div className="mesaj" style={{ marginBottom: 16 }}>
          <RandDenumireOrdine
            initial={{ denumire: "", ordine: compartiment.grupuri.length + 1 }}
            etichetaSalvare="Adaugă grupul"
            autoFocus
            onRenunta={() => setAdaugaGrup(false)}
            onSalveaza={async (d) => {
              await apiCompartimente.adaugaGrup(compartiment.id, d);
              setAdaugaGrup(false);
              await incarca();
            }}
          />
        </div>
      )}

      {compartiment.grupuri.length === 0 && !adaugaGrup && <Mesaj>Niciun grup încă.</Mesaj>}

      <div style={{ display: "grid", gap: 16 }}>
        {compartiment.grupuri.map((g) => (
          <BlocGrup key={g.id} grup={g} onSchimbat={incarca} />
        ))}
      </div>

      <Ajutor>
        <ul>
          <li>
            <strong>Grup</strong> = categoria mare de produse a furnizorului (ex. „Țiglă metalică”, „Sistem pluvial”); <strong>familie</strong> = modelul (ex. „Dacic”, „Jgheab 125 / 4m”).
          </li>
          <li>Produsele se leagă de grup și, opțional, de familie. „Ordine” stabilește poziția în liste.</li>
          <li>Orice modificare a compartimentului, a unui grup sau a unei familii se scrie în jurnal, cu valoarea dinainte și după.</li>
        </ul>
        <AjutorCampuriCompartiment />
      </Ajutor>
    </>
  );
}
