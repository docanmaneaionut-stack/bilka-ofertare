import { useEffect, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
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
import { Firme } from "./pages/Firme";
import { Utilizatori } from "./pages/Utilizatori";
import { Export } from "./pages/Export";
import { ContulMeu, ETICHETA_ROL, SchimbaParolaObligatoriu } from "./pages/ContulMeu";
import { UtilizatorContext } from "./contextUtilizator";

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

  // parola pusa de altcineva se schimba la prima conectare, inainte de orice
  if (utilizator.parolaTrebuieSchimbata) {
    return <SchimbaParolaObligatoriu utilizator={utilizator} onGata={() => setUtilizator({ ...utilizator, parolaTrebuieSchimbata: false })} onLogout={iesiDinCont} />;
  }

  const adminGeneral = utilizator.rol === "ADMIN_GENERAL";
  const administrator = utilizator.rol === "ADMINISTRATOR";

  return (
    <UtilizatorContext.Provider value={utilizator}>
    <BrowserRouter>
      <Routes>
        {(adminGeneral || administrator) && (
          <Route path="/zona-tehnica" element={<ZonaTehnica utilizator={utilizator} onLogout={iesiDinCont} />}>
            <Route index element={<Navigate to={adminGeneral ? "compartimente" : "firme"} replace />} />
            {adminGeneral && (
              <>
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
                <Route path="export" element={<Export />} />
              </>
            )}
            <Route path="firme" element={<Firme />} />
            <Route path="utilizatori" element={<Utilizatori />} />
          </Route>
        )}
        <Route
          path="/cont"
          element={
            adminGeneral || administrator ? (
              <ZonaTehnica utilizator={utilizator} onLogout={iesiDinCont} />
            ) : (
              <PaginaSimpla utilizator={utilizator} onLogout={iesiDinCont} />
            )
          }
        >
          <Route index element={<ContulMeu />} />
        </Route>
        <Route path="*" element={<Navigate to={adminGeneral || administrator ? "/zona-tehnica" : "/cont"} replace />} />
      </Routes>
    </BrowserRouter>
    </UtilizatorContext.Provider>
  );
}

// conturile fara Zona tehnica (Agent, Colaborator, Contabilitate, Gestiune):
// deocamdata doar contul propriu; ecranele lor vin cu ofertele si comenzile
function PaginaSimpla({ utilizator, onLogout }: { utilizator: Utilizator; onLogout: () => void }) {
  return (
    <>
      <header className="bara-sus">
        <div className="titlu">Ofertare</div>
        <nav className="meniu" aria-label="Meniu">
          <Link to="/cont" className="activ">
            Contul meu
          </Link>
        </nav>
        <div className="actiuni">
          <span className="text-secundar mic">
            {utilizator.nume} · {ETICHETA_ROL[utilizator.rol] ?? utilizator.rol}
          </span>
          <button className="buton secundar mic" onClick={onLogout}>
            Ieși din cont
          </button>
        </div>
      </header>
      <main className="pagina">
        <ContulMeu />
      </main>
    </>
  );
}
