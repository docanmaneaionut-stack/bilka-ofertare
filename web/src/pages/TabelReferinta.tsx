import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useParams } from "react-router-dom";
import { apiReferinte, type RandReferinta } from "../api";
import { Mesaj, textEroare } from "../components/ui";
import { gasesteReferinta, type Coloana } from "../referinte";

type Valori = Record<string, unknown>;

function valoriInitiale(coloane: Coloana[], rand?: RandReferinta): Valori {
  const v: Valori = {};
  for (const c of coloane) {
    const existent = rand?.[c.cheie];
    if (existent !== undefined && existent !== null) {
      v[c.cheie] = c.tip === "numar" ? String(existent) : existent;
    } else {
      v[c.cheie] = c.implicit ?? (c.tip === "bool" ? false : "");
    }
  }
  return v;
}

function spreServer(coloane: Coloana[], v: Valori): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of coloane) {
    const val = v[c.cheie];
    if (c.tip === "numar") {
      const text = String(val ?? "").trim().replace(",", ".");
      out[c.cheie] = text === "" ? null : Number(text);
    } else if (c.tip === "bool") {
      out[c.cheie] = Boolean(val);
    } else {
      out[c.cheie] = val;
    }
  }
  return out;
}

// Tab merge natural; sagetile: sus/jos pe aceeasi coloana, stanga/dreapta
// intre celule cand cursorul e la marginea textului (ca intr-un tabel).
function navigheaza(e: KeyboardEvent<HTMLElement>) {
  const tinta = e.currentTarget as HTMLInputElement | HTMLSelectElement;
  const rand = Number(tinta.dataset.rand);
  const col = Number(tinta.dataset.col);
  if (Number.isNaN(rand) || Number.isNaN(col)) return;

  let urmRand = rand;
  let urmCol = col;

  if (e.key === "ArrowDown") urmRand = rand + 1;
  else if (e.key === "ArrowUp") urmRand = rand - 1;
  else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    const esteText = tinta instanceof HTMLInputElement && (tinta.type === "text" || tinta.type === "search");
    if (esteText) {
      const laInceput = tinta.selectionStart === 0 && tinta.selectionEnd === 0;
      const laFinal = tinta.selectionStart === tinta.value.length && tinta.selectionEnd === tinta.value.length;
      if (e.key === "ArrowLeft" && !laInceput) return;
      if (e.key === "ArrowRight" && !laFinal) return;
    }
    urmCol = e.key === "ArrowLeft" ? col - 1 : col + 1;
  } else {
    return;
  }

  const urmator = tinta.closest("table")?.querySelector<HTMLElement>(`[data-rand="${urmRand}"][data-col="${urmCol}"]`);
  if (urmator) {
    e.preventDefault();
    urmator.focus();
    if (urmator instanceof HTMLInputElement && urmator.type === "text") urmator.select();
  }
}

function Celula({
  coloana,
  valoare,
  onChange,
  rand,
  col,
}: {
  coloana: Coloana;
  valoare: unknown;
  onChange: (v: unknown) => void;
  rand: number;
  col: number;
}) {
  const comun = { "data-rand": rand, "data-col": col, onKeyDown: navigheaza, "aria-label": coloana.eticheta };
  if (coloana.tip === "bool") {
    return <input type="checkbox" checked={Boolean(valoare)} onChange={(e) => onChange(e.target.checked)} {...comun} />;
  }
  if (coloana.tip === "select") {
    return (
      <select value={String(valoare ?? "")} onChange={(e) => onChange(e.target.value)} required={coloana.obligatoriu} {...comun}>
        {coloana.optiuni?.map((o) => (
          <option key={o.valoare} value={o.valoare}>
            {o.eticheta}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      type="text"
      inputMode={coloana.tip === "numar" ? "decimal" : undefined}
      value={String(valoare ?? "")}
      onChange={(e) => onChange(e.target.value)}
      required={coloana.obligatoriu}
      {...comun}
    />
  );
}

function RandEditabil({
  coloane,
  initial,
  index,
  etichetaSalvare,
  onSalveaza,
}: {
  coloane: Coloana[];
  initial: Valori;
  index: number;
  etichetaSalvare: string;
  onSalveaza: (v: Record<string, unknown>) => Promise<void>;
}) {
  const [valori, setValori] = useState<Valori>(initial);
  const [eroare, setEroare] = useState<string | null>(null);
  const [seSalveaza, setSeSalveaza] = useState(false);

  useEffect(() => setValori(initial), [initial]);

  const modificat = useMemo(() => coloane.some((c) => String(valori[c.cheie] ?? "") !== String(initial[c.cheie] ?? "")), [coloane, valori, initial]);

  async function salveaza() {
    setEroare(null);
    setSeSalveaza(true);
    try {
      await onSalveaza(spreServer(coloane, valori));
    } catch (e) {
      setEroare(textEroare(e));
    } finally {
      setSeSalveaza(false);
    }
  }

  const inactiv = coloane.some((c) => c.cheie === "activ") && valori.activ === false;

  return (
    <>
      <tr className={`${modificat ? "modificat" : ""} ${inactiv ? "inactiv" : ""}`}>
        {coloane.map((c, col) => (
          <td key={c.cheie} style={{ width: c.latime }}>
            <Celula coloana={c} valoare={valori[c.cheie]} rand={index} col={col} onChange={(v) => setValori((s) => ({ ...s, [c.cheie]: v }))} />
          </td>
        ))}
        <td style={{ width: 150 }}>
          <button
            type="button"
            className="buton mic"
            disabled={!modificat || seSalveaza}
            onClick={salveaza}
            data-rand={index}
            data-col={coloane.length}
            onKeyDown={navigheaza}
          >
            {seSalveaza ? "…" : etichetaSalvare}
          </button>
        </td>
      </tr>
      {eroare && (
        <tr>
          <td colSpan={coloane.length + 1}>
            <Mesaj tip="eroare">{eroare}</Mesaj>
          </td>
        </tr>
      )}
    </>
  );
}

export function TabelReferinta() {
  const { cheie } = useParams();
  const config = gasesteReferinta(cheie);
  const [randuri, setRanduri] = useState<RandReferinta[] | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [cheieRandNou, setCheieRandNou] = useState(0);
  const [arataInactive, setArataInactive] = useState(false);

  async function incarca() {
    if (!config) return;
    try {
      const { randuri } = await apiReferinte.lista(config.cale);
      setRanduri(randuri);
    } catch (e) {
      setEroare(textEroare(e));
    }
  }

  useEffect(() => {
    setRanduri(null);
    void incarca();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cheie]);

  const initialeRandNou = useMemo(() => valoriInitiale(config?.coloane ?? []), [config]);

  if (!config) return <Mesaj tip="eroare">Tabel necunoscut.</Mesaj>;

  const areActiv = config.coloane.some((c) => c.cheie === "activ");
  const vizibile = (randuri ?? []).filter((r) => arataInactive || !areActiv || r.activ !== false);
  const ascunse = (randuri?.length ?? 0) - vizibile.length;

  return (
    <>
      <div className="antet-pagina">
        <div>
          <h1>{config.titlu}</h1>
          <p className="text-secundar">{config.descriere}</p>
          <p className="text-secundar mic">
            Scrii direct în celule; <kbd>Tab</kbd> și săgețile te mută între căsuțe; „Salvează” se aprinde pe rândul modificat. Rândul gol de jos adaugă o intrare nouă.
          </p>
        </div>
        {areActiv && ascunse > 0 && (
          <button className="buton secundar" onClick={() => setArataInactive((v) => !v)}>
            {arataInactive ? "Ascunde inactivele" : `Arată și inactivele (${ascunse})`}
          </button>
        )}
      </div>

      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}

      {randuri && (
        <>
          <p className="text-secundar mic">{vizibile.length} rânduri</p>
          <div className="tabel-invelis">
            <table className="tabel editabil">
              <thead>
                <tr>
                  {config.coloane.map((c) => (
                    <th key={c.cheie} style={{ width: c.latime }}>
                      {c.eticheta}
                      {c.obligatoriu ? " *" : ""}
                    </th>
                  ))}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {vizibile.map((r, i) => (
                  <RandEditabil
                    key={r.id}
                    coloane={config.coloane}
                    initial={valoriInitiale(config.coloane, r)}
                    index={i}
                    etichetaSalvare="Salvează"
                    onSalveaza={async (v) => {
                      await apiReferinte.actualizeaza(config.cale, r.id, v);
                      await incarca();
                    }}
                  />
                ))}
                <RandEditabil
                  key={`nou-${cheieRandNou}`}
                  coloane={config.coloane}
                  initial={initialeRandNou}
                  index={vizibile.length}
                  etichetaSalvare="Adaugă"
                  onSalveaza={async (v) => {
                    await apiReferinte.creeaza(config.cale, v);
                    setCheieRandNou((k) => k + 1);
                    await incarca();
                  }}
                />
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
