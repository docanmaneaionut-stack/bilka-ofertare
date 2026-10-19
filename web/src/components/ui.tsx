import type { ReactNode } from "react";

export function Camp({ eticheta, obligatoriu, children }: { eticheta: string; obligatoriu?: boolean; children: ReactNode }) {
  return (
    <label className="camp">
      <span>
        {eticheta}
        {obligatoriu && <span aria-hidden="true"> *</span>}
      </span>
      {children}
    </label>
  );
}

export function Mesaj({ tip, children }: { tip?: "avertizare" | "eroare" | "ok"; children: ReactNode }) {
  return (
    <div className={`mesaj ${tip ?? ""}`} role={tip === "eroare" ? "alert" : "status"}>
      {children}
    </div>
  );
}

// Capitolul 0, pct. 10: nicio explicatie permanenta in pagina - toate textele
// explicative stau aici, la finalul paginii, pliate implicit.
export function Ajutor({ children }: { children: ReactNode }) {
  return (
    <details className="ajutor-pagina">
      <summary>Ajutor pentru această pagină</summary>
      <div>{children}</div>
    </details>
  );
}

export function textEroare(e: unknown): string {
  return e instanceof Error ? e.message : "Eroare necunoscută";
}
