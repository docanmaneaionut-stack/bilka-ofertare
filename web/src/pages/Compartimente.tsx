import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiCompartimente, type Compartiment } from "../api";
import { Ajutor, Camp, Mesaj, textEroare } from "../components/ui";

export function AjutorCampuriCompartiment() {
  return (
    <ul>
      <li>
        <strong>Compartiment</strong> = un furnizor (Bilka, Novatik, Fakro…) sau Stocul propriu, cu produsele, moneda și listele lui de preț.
      </li>
      <li>
        <strong>Cod scurt</strong>: 2–6 litere / cifre (ex. BIL). E prefixul codurilor interne ale produselor; după ce există produse, nu se mai schimbă.
      </li>
      <li>
        <strong>Mod de preț</strong>: „listă de achiziție” (Bilka, Novatik, Stoc — prețul de bază e achiziția) sau „catalog public cu discount” (Fakro, Velux).
      </li>
      <li>
        <strong>Format import</strong>: identificatorul fișierului CSV al furnizorului (ex. bilka-v1); îl folosește importul listelor de preț.
      </li>
      <li>
        <strong>Contactul furnizorului</strong>: agentul de vânzări și directorul zonal alocați; exportul formularelor de comandă pleacă pe e-mail către acest contact.
      </li>
      <li>Un compartiment inactiv rămâne în istoric, dar nu mai apare la ofertă.</li>
    </ul>
  );
}

export const COMPARTIMENT_GOL = {
  denumire: "",
  codScurt: "",
  tip: "FURNIZOR" as Compartiment["tip"],
  moneda: "EUR",
  modPret: "LISTA_ACHIZITIE" as Compartiment["modPret"],
  formatImport: "",
  contactFurnizorNume: "",
  contactFurnizorTelefon: "",
  contactFurnizorEmail: "",
  contactDirectorZonal: "",
  activ: true,
};

export type DateCompartiment = typeof COMPARTIMENT_GOL;

export function FormularCompartiment({
  initial,
  codScurtBlocat,
  onSalveaza,
  onRenunta,
  etichetaSalvare,
}: {
  initial: DateCompartiment;
  codScurtBlocat?: boolean;
  onSalveaza: (date: DateCompartiment) => Promise<void>;
  onRenunta?: () => void;
  etichetaSalvare: string;
}) {
  const [date, setDate] = useState<DateCompartiment>(initial);
  const [eroare, setEroare] = useState<string | null>(null);
  const [seSalveaza, setSeSalveaza] = useState(false);

  function seteaza<K extends keyof DateCompartiment>(cheie: K, valoare: DateCompartiment[K]) {
    setDate((d) => ({ ...d, [cheie]: valoare }));
  }

  async function trimite(e: FormEvent) {
    e.preventDefault();
    setEroare(null);
    setSeSalveaza(true);
    try {
      await onSalveaza(date);
    } catch (err) {
      setEroare(textEroare(err));
    } finally {
      setSeSalveaza(false);
    }
  }

  return (
    <form className="formular" onSubmit={trimite}>
      <div className="rand-campuri">
        <Camp eticheta="Denumire" obligatoriu>
          <input type="text" value={date.denumire} onChange={(e) => seteaza("denumire", e.target.value)} required autoFocus />
        </Camp>
        <Camp eticheta="Cod scurt" obligatoriu>
          <input
            type="text"
            value={date.codScurt}
            onChange={(e) => seteaza("codScurt", e.target.value.toUpperCase())}
            required
            minLength={2}
            maxLength={6}
            pattern="[A-Za-z0-9]+"
            disabled={codScurtBlocat}
          />
        </Camp>
        <Camp eticheta="Tip" obligatoriu>
          <select value={date.tip} onChange={(e) => seteaza("tip", e.target.value as DateCompartiment["tip"])}>
            <option value="FURNIZOR">Furnizor</option>
            <option value="STOC_PROPRIU">Stoc propriu</option>
          </select>
        </Camp>
        <Camp eticheta="Monedă" obligatoriu>
          <input type="text" value={date.moneda} onChange={(e) => seteaza("moneda", e.target.value.toUpperCase())} required />
        </Camp>
        <Camp eticheta="Mod de preț" obligatoriu>
          <select value={date.modPret} onChange={(e) => seteaza("modPret", e.target.value as DateCompartiment["modPret"])}>
            <option value="LISTA_ACHIZITIE">Listă de achiziție (Bilka, Novatik, Stoc)</option>
            <option value="CATALOG_DISCOUNT">Catalog public cu discount (Fakro, Velux)</option>
          </select>
        </Camp>
        <Camp eticheta="Format import">
          <input type="text" value={date.formatImport} onChange={(e) => seteaza("formatImport", e.target.value)} />
        </Camp>
      </div>

      <h3>Contactul furnizorului pentru comenzi</h3>
      <div className="rand-campuri">
        <Camp eticheta="Agent de vânzări — nume">
          <input type="text" value={date.contactFurnizorNume} onChange={(e) => seteaza("contactFurnizorNume", e.target.value)} />
        </Camp>
        <Camp eticheta="Telefon">
          <input type="text" value={date.contactFurnizorTelefon} onChange={(e) => seteaza("contactFurnizorTelefon", e.target.value)} />
        </Camp>
        <Camp eticheta="E-mail">
          <input type="email" value={date.contactFurnizorEmail} onChange={(e) => seteaza("contactFurnizorEmail", e.target.value)} />
        </Camp>
        <Camp eticheta="Director zonal">
          <input type="text" value={date.contactDirectorZonal} onChange={(e) => seteaza("contactDirectorZonal", e.target.value)} />
        </Camp>
      </div>

      <label className="camp-bifa">
        <input type="checkbox" checked={date.activ} onChange={(e) => seteaza("activ", e.target.checked)} />
        Activ
      </label>

      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}

      <div className="actiuni">
        <button className="buton" type="submit" disabled={seSalveaza}>
          {seSalveaza ? "Se salvează…" : etichetaSalvare}
        </button>
        {onRenunta && (
          <button className="buton secundar" type="button" onClick={onRenunta}>
            Renunță
          </button>
        )}
      </div>
    </form>
  );
}

export function Compartimente() {
  const [compartimente, setCompartimente] = useState<Compartiment[] | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [adauga, setAdauga] = useState(false);
  const navigate = useNavigate();

  async function incarca() {
    try {
      const { compartimente } = await apiCompartimente.lista();
      setCompartimente(compartimente);
    } catch (e) {
      setEroare(textEroare(e));
    }
  }

  useEffect(() => {
    void incarca();
  }, []);

  return (
    <>
      <div className="antet-pagina">
        <h1>Compartimente</h1>
        {!adauga && (
          <button className="buton" onClick={() => setAdauga(true)}>
            Adaugă compartiment
          </button>
        )}
      </div>

      {adauga && (
        <>
          <h2>Compartiment nou</h2>
          <FormularCompartiment
            initial={COMPARTIMENT_GOL}
            etichetaSalvare="Salvează compartimentul"
            onRenunta={() => setAdauga(false)}
            onSalveaza={async (date) => {
              const { compartiment } = await apiCompartimente.creeaza(date);
              setAdauga(false);
              navigate(`/zona-tehnica/compartimente/${compartiment.id}`);
            }}
          />
          <hr className="separator" />
        </>
      )}

      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}

      {compartimente && compartimente.length === 0 && !adauga && (
        <Mesaj>Niciun compartiment încă.</Mesaj>
      )}

      {compartimente && compartimente.length > 0 && (
        <div className="tabel-invelis">
          <table className="tabel">
            <thead>
              <tr>
                <th>Denumire</th>
                <th>Cod scurt</th>
                <th>Tip</th>
                <th>Monedă</th>
                <th>Mod de preț</th>
                <th>Grupuri</th>
                <th>Produse</th>
                <th>Stare</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {compartimente.map((c) => (
                <tr key={c.id} className={c.activ ? undefined : "inactiv"}>
                  <td>
                    <strong>{c.denumire}</strong>
                  </td>
                  <td>{c.codScurt}</td>
                  <td>{c.tip === "FURNIZOR" ? "Furnizor" : "Stoc propriu"}</td>
                  <td>{c.moneda}</td>
                  <td>{c.modPret === "LISTA_ACHIZITIE" ? "Listă de achiziție" : "Catalog cu discount"}</td>
                  <td>{c._count?.grupuri ?? "–"}</td>
                  <td>{c._count?.produse ?? "–"}</td>
                  <td>
                    <span className={`eticheta ${c.activ ? "" : "inactiv"}`}>{c.activ ? "activ" : "inactiv"}</span>
                  </td>
                  <td>
                    <Link className="buton secundar mic" to={`/zona-tehnica/compartimente/${c.id}`}>
                      Deschide
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Ajutor>
        <p>Lista compartimentelor din catalog. „Deschide” duce la grupurile, familiile și datele compartimentului.</p>
        <AjutorCampuriCompartiment />
      </Ajutor>
    </>
  );
}
