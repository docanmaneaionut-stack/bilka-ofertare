import { useState, type FormEvent } from "react";
import { login, type Utilizator } from "../api";

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
    <main style={{ maxWidth: 360, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h1>Autentificare</h1>
      <form onSubmit={trimite}>
        <label style={{ display: "block", marginBottom: 12 }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ display: "block", width: "100%" }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          Parola
          <input
            type="password"
            value={parola}
            onChange={(e) => setParola(e.target.value)}
            required
            style={{ display: "block", width: "100%" }}
          />
        </label>
        {eroare && <p style={{ color: "crimson" }}>{eroare}</p>}
        <button type="submit" disabled={seIncarca}>
          {seIncarca ? "Se autentifica..." : "Intra in cont"}
        </button>
      </form>
    </main>
  );
}
