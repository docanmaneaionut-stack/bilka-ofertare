import { NavLink, Outlet } from "react-router-dom";
import type { Utilizator } from "../api";
import { ETICHETA_ROL } from "./ContulMeu";

// zona de lucru a ofertarii (Administrator, Agent, Colaborator; Admin general
// vede tot): Oferte · Contul meu · Zona tehnica pentru administratori
export function Ofertare({ utilizator, onLogout }: { utilizator: Utilizator; onLogout: () => void }) {
  const clasa = ({ isActive }: { isActive: boolean }) => (isActive ? "activ" : undefined);
  const areZonaTehnica = utilizator.rol === "ADMIN_GENERAL" || utilizator.rol === "ADMINISTRATOR";
  return (
    <>
      <header className="bara-sus">
        <div className="titlu">Ofertare</div>
        <nav className="meniu" aria-label="Ofertare">
          <NavLink to="/oferte" className={clasa}>
            Oferte
          </NavLink>
          <NavLink to="/cont" className={clasa}>
            Contul meu
          </NavLink>
          {areZonaTehnica && (
            <NavLink to="/zona-tehnica" className={clasa}>
              Zona tehnică
            </NavLink>
          )}
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
        <Outlet />
      </main>
    </>
  );
}
