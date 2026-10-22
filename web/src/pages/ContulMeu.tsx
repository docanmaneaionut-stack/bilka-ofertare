import { useEffect, useState, type FormEvent } from "react";
import { apiCont, type Conectare, type Utilizator } from "../api";
import { Ajutor, Camp, Mesaj, textEroare } from "../components/ui";

export const ETICHETA_ROL: Record<string, string> = {
  ADMIN_GENERAL: "Admin general",
  ADMINISTRATOR: "Administrator",
  AGENT: "Agent",
  COLABORATOR: "Colaborator",
  CONTABILITATE: "Contabilitate",
  GESTIUNE: "Gestiune",
};

function dataOra(v: string) {
  return new Date(v).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" });
}

export function FormularParola({ titlu, onGata, obligatoriu }: { titlu: string; onGata?: () => void; obligatoriu?: boolean }) {
  const [parolaVeche, setParolaVeche] = useState("");
  const [parolaNoua, setParolaNoua] = useState("");
  const [parolaNoua2, setParolaNoua2] = useState("");
  const [mesaj, setMesaj] = useState<{ tip: "ok" | "eroare"; text: string } | null>(null);
  const [seSalveaza, setSeSalveaza] = useState(false);

  async function trimite(e: FormEvent) {
    e.preventDefault();
    setMesaj(null);
    if (parolaNoua.length < 10) {
      setMesaj({ tip: "eroare", text: "Parola nouă trebuie să aibă cel puțin 10 caractere." });
      return;
    }
    if (parolaNoua !== parolaNoua2) {
      setMesaj({ tip: "eroare", text: "Parola nouă nu coincide cu repetarea ei." });
      return;
    }
    setSeSalveaza(true);
    try {
      await apiCont.schimbaParola(parolaVeche, parolaNoua);
      setMesaj({ tip: "ok", text: "Parola a fost schimbată." });
      setParolaVeche("");
      setParolaNoua("");
      setParolaNoua2("");
      onGata?.();
    } catch (err) {
      setMesaj({ tip: "eroare", text: textEroare(err) });
    } finally {
      setSeSalveaza(false);
    }
  }

  return (
    <form className="formular" onSubmit={trimite} style={{ maxWidth: 480 }}>
      <h2>{titlu}</h2>
      <Camp eticheta={obligatoriu ? "Parola primită" : "Parola actuală"} obligatoriu>
        <input type="password" value={parolaVeche} onChange={(e) => setParolaVeche(e.target.value)} required autoFocus />
      </Camp>
      <Camp eticheta="Parola nouă (minim 10 caractere)" obligatoriu>
        <input type="password" value={parolaNoua} onChange={(e) => setParolaNoua(e.target.value)} required minLength={10} />
      </Camp>
      <Camp eticheta="Repetă parola nouă" obligatoriu>
        <input type="password" value={parolaNoua2} onChange={(e) => setParolaNoua2(e.target.value)} required minLength={10} />
      </Camp>
      {mesaj && <Mesaj tip={mesaj.tip}>{mesaj.text}</Mesaj>}
      <div className="actiuni">
        <button className="buton" type="submit" disabled={seSalveaza}>
          {seSalveaza ? "Se salvează…" : "Schimbă parola"}
        </button>
      </div>
    </form>
  );
}

// prima conectare cu o parola pusa de altcineva: nimic altceva pana nu e schimbata
export function SchimbaParolaObligatoriu({ utilizator, onGata, onLogout }: { utilizator: Utilizator; onGata: () => void; onLogout: () => void }) {
  return (
    <main className="pagina-ingusta" style={{ maxWidth: 560 }}>
      <h1>Bun venit, {utilizator.nume}</h1>
      <Mesaj tip="avertizare">Parola contului a fost pusă de altcineva. Alege-ți parola ta înainte să continui — doar tu o vei ști.</Mesaj>
      <FormularParola titlu="Alege parola ta" obligatoriu onGata={onGata} />
      <p style={{ marginTop: 24 }}>
        <button className="buton secundar mic" onClick={onLogout}>
          Ieși din cont
        </button>
      </p>
    </main>
  );
}

export function ContulMeu() {
  const [date, setDate] = useState<{ utilizator: Utilizator; firma: { id: string; denumire: string } | null; conectari: Conectare[] } | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);

  useEffect(() => {
    apiCont
      .detaliu()
      .then(setDate)
      .catch((e) => setEroare(textEroare(e)));
  }, []);

  if (eroare) return <Mesaj tip="eroare">{eroare}</Mesaj>;
  if (!date) return null;
  const u = date.utilizator;

  return (
    <>
      <h1>Contul meu</h1>
      <div className="grila-totaluri" style={{ maxWidth: 900 }}>
        <div>
          <span className="numar-mare" style={{ fontSize: 22 }}>{u.nume}</span>
          <span className="text-secundar mic">{ETICHETA_ROL[u.rol] ?? u.rol}</span>
        </div>
        <div>
          <span className="numar-mare" style={{ fontSize: 22 }}>{u.email}</span>
          <span className="text-secundar mic">{u.telefon ?? "fără telefon"}</span>
        </div>
        <div>
          <span className="numar-mare" style={{ fontSize: 22 }}>{date.firma?.denumire ?? "—"}</span>
          <span className="text-secundar mic">firma</span>
        </div>
      </div>

      <FormularParola titlu="Schimbă parola" />

      <h2>Ultimele conectări</h2>
      <div className="tabel-invelis" style={{ maxWidth: 900 }}>
        <table className="tabel">
          <thead>
            <tr>
              <th>Când</th>
              <th>Rezultat</th>
              <th>De unde</th>
              <th>Dispozitiv</th>
            </tr>
          </thead>
          <tbody>
            {date.conectari.map((c, i) => (
              <tr key={i} className={c.rezultat === "SUCCES" ? undefined : "inactiv"}>
                <td>{dataOra(c.moment)}</td>
                <td>
                  <span className={`eticheta ${c.rezultat === "SUCCES" ? "" : "inactiv"}`}>{c.rezultat === "SUCCES" ? "reușit" : c.rezultat === "ESEC" ? "greșit" : "blocat"}</span>
                </td>
                <td className="mic">{c.sursa ?? "—"}</td>
                <td className="mic">{c.dispozitiv ? c.dispozitiv.slice(0, 80) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Ajutor>
        <ul>
          <li>Parola are cel puțin 10 caractere și e doar a ta; nimeni n-o poate vedea. Dacă o uiți, superiorul tău din ierarhie o resetează, iar la următoarea conectare o schimbi din nou.</li>
          <li>După 5 încercări greșite consecutive contul se blochează 15 minute.</li>
          <li>Ultimele 10 conectări arată când și de pe ce dispozitiv s-a intrat în cont — dacă vezi ceva ce nu recunoști, schimbă parola și anunță administratorul.</li>
        </ul>
      </Ajutor>
    </>
  );
}
