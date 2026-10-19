import type { ReactNode } from "react";

export function Camp({
  eticheta,
  ajutor,
  obligatoriu,
  children,
}: {
  eticheta: string;
  ajutor?: string;
  obligatoriu?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="camp">
      <span>
        {eticheta}
        {obligatoriu && <span aria-hidden="true"> *</span>}
        {ajutor && <span className="ajutor"> — {ajutor}</span>}
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

export function textEroare(e: unknown): string {
  return e instanceof Error ? e.message : "Eroare necunoscută";
}
