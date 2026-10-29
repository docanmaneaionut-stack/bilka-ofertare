import { useEffect, useRef, useState, type ReactNode } from "react";

// meniul ⋯ (FISA-OFERTARE cap. 15): o lista de actiuni; fiecare actiune
// dezactivata spune de ce (Capitolul 0 - niciun buton gri fara explicatie)
export type ActiuneMeniu = { eticheta: string; onClick?: () => void; dezactivat?: string; explicatie?: string };

export function MeniuActiuni({ actiuni, eticheta = "⋯", copii }: { actiuni: ActiuneMeniu[]; eticheta?: ReactNode; copii?: ReactNode }) {
  const [deschis, setDeschis] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!deschis) return;
    const inchide = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setDeschis(false);
    };
    document.addEventListener("mousedown", inchide);
    return () => document.removeEventListener("mousedown", inchide);
  }, [deschis]);
  return (
    <div className="meniu-actiuni" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button className="buton secundar mic" type="button" aria-haspopup="menu" aria-expanded={deschis} onClick={() => setDeschis(!deschis)}>
        {eticheta}
      </button>
      {deschis && (
        <ul role="menu">
          {copii}
          {actiuni.map((a) => (
            <li key={a.eticheta} role="none">
              <button
                role="menuitem"
                type="button"
                disabled={Boolean(a.dezactivat)}
                title={a.dezactivat}
                onClick={() => {
                  setDeschis(false);
                  a.onClick?.();
                }}
              >
                {a.eticheta}
                {a.dezactivat && <div className="explicatie-buton">{a.dezactivat}</div>}
                {!a.dezactivat && a.explicatie && <div className="explicatie-buton">{a.explicatie}</div>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
