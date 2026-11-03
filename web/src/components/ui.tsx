import type { ReactNode } from "react";
import { EroareCerere } from "../api";

// `eroare`: motivul validarii pentru acest camp (S17b BUG-4), aratat sub el, in rosu
export function Camp({ eticheta, obligatoriu, eroare, children }: { eticheta: string; obligatoriu?: boolean; eroare?: string; children: ReactNode }) {
  return (
    <label className={`camp${eroare ? " cu-eroare" : ""}`}>
      <span>
        {eticheta}
        {obligatoriu && <span aria-hidden="true"> *</span>}
      </span>
      {children}
      {eroare && (
        <span className="eroare-camp" role="alert">
          {eroare}
        </span>
      )}
    </label>
  );
}

// motivul validarii pentru un camp, din eroarea unei cereri (BUG-4): calea exacta
// ("client.telefon") sau, cand nu e data cu prefix, orice cale care se termina cu ea
export function eroareCamp(e: unknown, ...campuri: string[]): string | undefined {
  if (!(e instanceof EroareCerere)) return undefined;
  for (const camp of campuri) {
    const gasit = e.campuri.find((c) => c.camp === camp) ?? e.campuri.find((c) => c.camp.endsWith(`.${camp}`));
    if (gasit) return gasit.mesaj;
  }
  return undefined;
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
