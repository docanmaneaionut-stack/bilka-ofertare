import type { CSSProperties, ReactNode } from "react";
import type { StructuraOferta } from "../../api";
import { Mesaj } from "../../components/ui";
import { idRubricaPeEcran, RUBRICI_BARA, type IdRubrica } from "./rubrici";

// S29 (MODIFICAREA M12): rubricile filei "Produse" se pot strange pe un rand cu un clic pe banda lor si se
// deschid la loc cu inca un clic. Invelisul de aici NU rescrie rubrica: titlul ei (h2) devine banda cu sageata,
// iar strangerea doar ascunde continutul (ramane montat - nimic nu se schimba in oferta, in calcul sau in
// documente). La intrarea in oferta toate rubricile sunt deschise; softul nu strange nimic de la sine.

export function BandaRubrica({ id, stransa, onComuta, rezumat, children }: { id: IdRubrica; stransa: boolean; onComuta: () => void; rezumat: string; children: ReactNode }) {
  return (
    <div
      className={`rubrica${stransa ? " stransa" : ""}`}
      id={idRubricaPeEcran(id)}
      data-rubrica={id}
      data-stransa={stransa ? "da" : "nu"}
      // textul de pe banda (ce are completat rubrica) vine prin CSS, ca titlul rubricii sa ramana neatins
      style={{ "--rezumat": JSON.stringify(rezumat) } as CSSProperties}
      onClick={(e) => {
        // doar clicul pe banda rubricii (titlul ei), nu pe titlurile dinauntru
        const titlu = (e.target as HTMLElement).closest("h2");
        if (titlu && titlu.parentElement?.parentElement === e.currentTarget) onComuta();
      }}
    >
      {children}
    </div>
  );
}

// Bara de rubrici, fixa sub cele trei randuri: numele rubricii si cate produse au cantitate; rubricile fara
// nimic completat apar sterse (doar in bara); un clic sare la rubrica si o deschide daca era stransa.
export function BaraRubrici({ numere, activa, onSalt }: { numere: Record<IdRubrica, number>; activa: IdRubrica | null; onSalt: (id: IdRubrica) => void }) {
  return (
    <nav className="bara-rubrici" aria-label="Rubricile ofertei">
      {RUBRICI_BARA.map((r) => (
        <button key={r.id} type="button" tabIndex={-1} className={`salt-rubrica${numere[r.id] === 0 ? " goala" : ""}${activa === r.id ? " activa" : ""}`} onClick={() => onSalt(r.id)} title={numere[r.id] === 0 ? `${r.scurt}: nimic completat` : `${r.scurt}: ${numere[r.id]} cu cantitate`}>
          {r.scurt}
          {numere[r.id] > 0 && <span className="numar">{numere[r.id]}</span>}
        </button>
      ))}
    </nav>
  );
}

// Jos, in fila Produse: rezultatul pe scurt (se poate comanda / de ce nu, cate formulare) si "Mergi la
// Preturi"; rezultatul intreg (mp si coli pe invelitoare, formularele, pachetele) e in fila Preturi si documente.
export function RezultatPeScurt({ structura, onMergiLaPreturi }: { structura: { rezultat: StructuraOferta | null; eroare: string | null } | null; onMergiLaPreturi: () => void }) {
  const r = structura?.rezultat ?? null;
  return (
    <section className="panou rezultat-scurt" aria-live="polite">
      {structura?.eroare && <Mesaj tip="eroare">Motorul nu poate calcula oferta: {structura.eroare}</Mesaj>}
      <div className="rand-rezultat-scurt">
        <span>
          {!r && !structura?.eroare && <span className="text-secundar">Rezultatul apare după ce oferta are produse.</span>}
          {r && !r.comandabil.da && (
            <>
              <strong className="text-rosu">Nu se poate comanda:</strong> {r.comandabil.motive.join("; ")}
            </>
          )}
          {r && r.comandabil.da && r.cantitati.invelitori.length > 0 && <strong>Oferta se poate comanda.</strong>}
          {r && <span className="text-secundar"> {r.textFormulare.replace(/:.*$/, ".")}</span>}
        </span>
        <button className="buton secundar" type="button" tabIndex={-1} onClick={onMergiLaPreturi}>
          Mergi la Prețuri →
        </button>
      </div>
    </section>
  );
}
