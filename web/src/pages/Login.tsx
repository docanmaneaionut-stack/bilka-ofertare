import { useState, type FormEvent } from "react";
import { login, type Utilizator } from "../api";
import { Camp, Mesaj } from "../components/ui";

// Autentificarea (S18: acelasi stil ca restul softului - card, campuri, butonul principal)
export function Login({ onLogin }: { onLogin: (utilizator: Utilizator) => void }) {
  const [email, setEmail] = useState("");
  const [parola, setParola] = useState("");
  const [eroare, setEroare] = useState<string | null>(null);
  const [seIncarca, setSeIncarca] = useState(false);

  async function trimite(event: FormEvent) {
    event.preventDefault();
    setEroare(null);
    setSeIncarca(true);
    try {
      const { utilizator } = await login(email, parola);
      onLogin(utilizator);
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Eroare necunoscuta");
    } finally {
      setSeIncarca(false);
    }
  }

  return (
    <main className="pagina-ingusta">
      <section className="panou">
        <h2>Autentificare</h2>
        <form className="formular" onSubmit={trimite}>
          <Camp eticheta="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
          </Camp>
          <Camp eticheta="Parola">
            <input type="password" value={parola} onChange={(e) => setParola(e.target.value)} required autoComplete="current-password" />
          </Camp>
          {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
          <div className="actiuni">
            <button className="buton" type="submit" disabled={seIncarca}>
              {seIncarca ? "Se autentifica..." : "Intra in cont"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
