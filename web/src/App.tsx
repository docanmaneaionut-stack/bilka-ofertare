import { useEffect, useState } from "react";
import { logout, obtineUtilizatorCurent, type Utilizator } from "./api";
import { Login } from "./pages/Login";
import { ZonaTehnica } from "./pages/ZonaTehnica";

export default function App() {
  const [utilizator, setUtilizator] = useState<Utilizator | null>(null);
  const [seIncarca, setSeIncarca] = useState(true);

  useEffect(() => {
    obtineUtilizatorCurent()
      .then(({ utilizator }) => setUtilizator(utilizator))
      .catch(() => setUtilizator(null))
      .finally(() => setSeIncarca(false));
  }, []);

  async function iesiDinCont() {
    await logout();
    setUtilizator(null);
  }

  if (seIncarca) {
    return null;
  }

  if (!utilizator) {
    return <Login onLogin={setUtilizator} />;
  }

  if (utilizator.rol === "ADMIN_GENERAL") {
    return <ZonaTehnica utilizator={utilizator} onLogout={iesiDinCont} />;
  }

  return (
    <main style={{ maxWidth: 640, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h1>Bine ai venit, {utilizator.nume}</h1>
      <p>Contul tau ({utilizator.rol}) nu are inca niciun ecran construit.</p>
      <button onClick={iesiDinCont}>Iesi din cont</button>
    </main>
  );
}
