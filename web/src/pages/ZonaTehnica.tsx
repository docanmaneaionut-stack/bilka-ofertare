import { NavLink, Outlet } from "react-router-dom";
import type { Utilizator } from "../api";
import { REFERINTE } from "../referinte";

export function ZonaTehnica({ utilizator, onLogout }: { utilizator: Utilizator; onLogout: () => void }) {
  const clasa = ({ isActive }: { isActive: boolean }) => (isActive ? "activ" : undefined);

  return (
    <>
      <header className="bara-sus">
        <div className="titlu">Zona tehnică</div>
        <nav className="meniu" aria-label="Catalog">
          <NavLink to="/zona-tehnica/compartimente" className={clasa}>
            Compartimente
          </NavLink>
          <NavLink to="/zona-tehnica/produse" className={clasa}>
            Produse
          </NavLink>
          {REFERINTE.map((r) => (
            <NavLink key={r.cheie} to={`/zona-tehnica/referinte/${r.cheie}`} className={clasa}>
              {r.titluScurt}
            </NavLink>
          ))}
        </nav>
        <div className="actiuni">
          <span className="text-secundar mic">{utilizator.nume}</span>
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
