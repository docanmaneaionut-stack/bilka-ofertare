import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { logout, obtineUtilizatorCurent, type Utilizator } from "./api";
import { Login } from "./pages/Login";
import { ZonaTehnica } from "./pages/ZonaTehnica";
import { Compartimente } from "./pages/Compartimente";
import { CompartimentDetaliu } from "./pages/CompartimentDetaliu";
import { Produse } from "./pages/Produse";
import { ProdusFormular } from "./pages/ProdusFormular";
import { TabelReferinta } from "./pages/TabelReferinta";
import { ListePret } from "./pages/ListePret";
import { ListaDetaliu } from "./pages/ListaDetaliu";
import { Import } from "./pages/Import";
import { ImportPropunere } from "./pages/ImportPropunere";

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

  if (utilizator.rol !== "ADMIN_GENERAL") {
    return (
      <main className="pagina-ingusta">
        <h1>Bine ai venit, {utilizator.nume}</h1>
        <p>Contul tău ({utilizator.rol}) nu are încă niciun ecran construit.</p>
        <button className="buton" onClick={iesiDinCont}>
          Ieși din cont
        </button>
      </main>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/zona-tehnica" element={<ZonaTehnica utilizator={utilizator} onLogout={iesiDinCont} />}>
          <Route index element={<Navigate to="compartimente" replace />} />
          <Route path="compartimente" element={<Compartimente />} />
          <Route path="compartimente/:id" element={<CompartimentDetaliu />} />
          <Route path="produse" element={<Produse />} />
          <Route path="produse/nou" element={<ProdusFormular />} />
          <Route path="produse/:id" element={<ProdusFormular />} />
          <Route path="referinte/:cheie" element={<TabelReferinta />} />
          <Route path="liste" element={<ListePret />} />
          <Route path="liste/:id" element={<ListaDetaliu />} />
          <Route path="import" element={<Import />} />
          <Route path="import/:id" element={<ImportPropunere />} />
        </Route>
        <Route path="*" element={<Navigate to="/zona-tehnica" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
