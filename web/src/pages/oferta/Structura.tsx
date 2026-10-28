import type { StructuraOferta } from "../../api";
import { Mesaj } from "../../components/ui";

// rezultatul motorului, pe loc (S13: doar cantitati si structura; preturile la S14)
export function Structura({ structura }: { structura: { rezultat: StructuraOferta | null; eroare: string | null } | null }) {
  if (!structura) return null;
  if (structura.eroare) return <Mesaj tip="eroare">Motorul nu poate calcula oferta: {structura.eroare}</Mesaj>;
  const r = structura.rezultat;
  if (!r) return null;
  return (
    <section className="panou" aria-live="polite">
      <h2>Rezultat</h2>
      {r.avertizari.map((a, i) => (
        <Mesaj key={i} tip="avertizare">
          {a}
        </Mesaj>
      ))}
      {!r.comandabil.da && <Mesaj tip="avertizare">Nu se poate comanda: {r.comandabil.motive.join("; ")}</Mesaj>}
      {r.comandabil.da && r.cantitati.invelitori.length > 0 && <Mesaj tip="ok">Oferta se poate comanda: fiecare învelitoare e integral în lungimi × bucăți.</Mesaj>}
      <div className="grila-totaluri">
        {r.cantitati.invelitori.map((i) => (
          <div key={i.id}>
            <span className="text-secundar mic">{i.id}</span>
            <span className="numar-mare">{i.mp} mp</span>
            <span className="mic text-secundar">{i.coli} coli{i.mpDirect !== "0.000" ? ` · ${i.mpDirect} mp direct` : ""}</span>
          </div>
        ))}
        {r.cantitati.sipca && (
          <div>
            <span className="text-secundar mic">Șipcă</span>
            <span className="numar-mare">{r.cantitati.sipca.mlTotal} ml</span>
            <span className="mic text-secundar">{r.cantitati.sipca.bucatiTotal} buc</span>
          </div>
        )}
      </div>
      <p>{r.textFormulare}</p>
      {r.pachete.length > 0 && (
        <ul>
          {r.pachete.map((p) => (
            <li key={p.id}>
              <strong>{p.nume}</strong> — {p.linii.length} linii
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
