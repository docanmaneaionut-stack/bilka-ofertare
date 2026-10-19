import { useState, type ReactNode } from "react";

const PE_PAGINA = 100;

export type ColoanaTabel<T> = { titlu: string; celula: (rand: T) => ReactNode; latime?: string };

// tabel randat paginat (max 100 randuri odata) - la primul import sunt mii
export function TabelPaginat<T>({ randuri, coloane, cheie }: { randuri: T[]; coloane: ColoanaTabel<T>[]; cheie: (rand: T, i: number) => string }) {
  const [pagina, setPagina] = useState(1);
  const totalPagini = Math.max(1, Math.ceil(randuri.length / PE_PAGINA));
  const vizibile = randuri.slice((pagina - 1) * PE_PAGINA, pagina * PE_PAGINA);

  if (randuri.length === 0) return <p className="text-secundar mic">Nimic.</p>;

  return (
    <>
      <div className="tabel-invelis">
        <table className="tabel">
          <thead>
            <tr>
              {coloane.map((c) => (
                <th key={c.titlu} style={{ width: c.latime }}>
                  {c.titlu}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vizibile.map((r, i) => (
              <tr key={cheie(r, i)}>
                {coloane.map((c) => (
                  <td key={c.titlu}>{c.celula(r)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPagini > 1 && (
        <div className="paginare">
          <button className="buton secundar mic" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
            ← Anterioara
          </button>
          <span>
            Pagina {pagina} din {totalPagini} · {randuri.length} rânduri
          </span>
          <button className="buton secundar mic" disabled={pagina >= totalPagini} onClick={() => setPagina((p) => p + 1)}>
            Următoarea →
          </button>
        </div>
      )}
    </>
  );
}

// sectiune pliata implicit, cu numaratoarea in titlu; continutul se randeaza
// doar cand e deschisa
export function Sectiune({ titlu, numar, children }: { titlu: string; numar: number; children: ReactNode }) {
  const [deschis, setDeschis] = useState(false);
  return (
    <details className="sectiune-diferente" onToggle={(e) => setDeschis(e.currentTarget.open)}>
      <summary>
        {titlu} <span className="eticheta">{numar}</span>
      </summary>
      {deschis && <div style={{ paddingTop: 12 }}>{children}</div>}
    </details>
  );
}
