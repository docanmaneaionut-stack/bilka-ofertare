import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  apiCompartimente,
  apiProduse,
  apiReferinte,
  type CategorieOferta,
  type Compartiment,
  type Grup,
  type Produs,
} from "../api";
import { Camp, Mesaj, textEroare } from "../components/ui";

const PRODUS_GOL = {
  compartimentId: "",
  grupId: "",
  familieId: "",
  codIntern: "",
  codFurnizor: "",
  varianta: "",
  finisaj: "",
  grosime: "",
  optiune: "",
  denumire: "",
  um: "",
  moneda: "",
  categorieOfertaId: "",
  categorieBilka: "",
  latimeTotalaM: "",
  latimeTotalaMm: "",
  modulCm: "",
  sistem: "",
  treapta: "",
  desfasurata: "",
  culoriDisponibile: "",
  sursa: "",
  observatii: "",
  ordine: "",
  activ: true,
};

type Date = typeof PRODUS_GOL;

function dinProdus(p: Produs): Date {
  return {
    compartimentId: p.compartimentId,
    grupId: p.grupId,
    familieId: p.familieId ?? "",
    codIntern: p.codIntern,
    codFurnizor: p.codFurnizor ?? "",
    varianta: p.varianta ?? "",
    finisaj: p.finisaj ?? "",
    grosime: p.grosime ?? "",
    optiune: p.optiune ?? "",
    denumire: p.denumire,
    um: p.um,
    moneda: p.moneda,
    categorieOfertaId: p.categorieOfertaId ?? "",
    categorieBilka: p.categorieBilka ?? "",
    latimeTotalaM: p.latimeTotalaM == null ? "" : String(p.latimeTotalaM),
    latimeTotalaMm: p.latimeTotalaMm == null ? "" : String(p.latimeTotalaMm),
    modulCm: p.modulCm == null ? "" : String(p.modulCm),
    sistem: p.sistem ?? "",
    treapta: p.treapta ?? "",
    desfasurata: p.desfasurata ?? "",
    culoriDisponibile: p.culoriDisponibile ?? "",
    sursa: p.sursa ?? "",
    observatii: p.observatii ?? "",
    ordine: p.ordine == null ? "" : String(p.ordine),
    activ: p.activ,
  };
}

function numarSauNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function spreServer(d: Date) {
  return {
    ...d,
    latimeTotalaM: numarSauNull(d.latimeTotalaM),
    latimeTotalaMm: numarSauNull(d.latimeTotalaMm),
    modulCm: numarSauNull(d.modulCm),
    ordine: d.ordine.trim() === "" ? null : Math.trunc(Number(d.ordine)),
  };
}

export function ProdusFormular() {
  const { id } = useParams();
  const navigate = useNavigate();
  const esteNou = !id;

  const [date, setDate] = useState<Date>(PRODUS_GOL);
  const [produsExistent, setProdusExistent] = useState<Produs | null>(null);
  const [compartimente, setCompartimente] = useState<Compartiment[]>([]);
  const [grupuri, setGrupuri] = useState<Grup[]>([]);
  const [categorii, setCategorii] = useState<CategorieOferta[]>([]);
  const [culori, setCulori] = useState<{ sursa: "exceptie" | "tabel_general"; culori: string[] } | null>(null);
  const [duplicatCod, setDuplicatCod] = useState<Produs[]>([]);
  const [eroare, setEroare] = useState<string | null>(null);
  const [salvat, setSalvat] = useState(false);
  const [seSalveaza, setSeSalveaza] = useState(false);

  function seteaza<K extends keyof Date>(cheie: K, valoare: Date[K]) {
    setDate((d) => ({ ...d, [cheie]: valoare }));
    setSalvat(false);
  }

  useEffect(() => {
    Promise.all([apiCompartimente.lista(), apiReferinte.lista("categorii-oferta")])
      .then(([c, cat]) => {
        setCompartimente(c.compartimente);
        setCategorii(cat.randuri as unknown as CategorieOferta[]);
      })
      .catch((e) => setEroare(textEroare(e)));
  }, []);

  useEffect(() => {
    if (!id) {
      setDate(PRODUS_GOL);
      setProdusExistent(null);
      return;
    }
    apiProduse
      .detaliu(id)
      .then(({ produs }) => {
        setProdusExistent(produs);
        setDate(dinProdus(produs));
      })
      .catch((e) => setEroare(textEroare(e)));
  }, [id]);

  const compartiment = compartimente.find((c) => c.id === date.compartimentId);

  useEffect(() => {
    if (!date.compartimentId) {
      setGrupuri([]);
      return;
    }
    apiCompartimente
      .detaliu(date.compartimentId)
      .then(({ compartiment }) => setGrupuri(compartiment.grupuri))
      .catch((e) => setEroare(textEroare(e)));
  }, [date.compartimentId]);

  // moneda produsului e implicit cea a compartimentului (FISA-CATALOG regula 8)
  useEffect(() => {
    if (compartiment && date.moneda === "") {
      setDate((d) => ({ ...d, moneda: compartiment.moneda }));
    }
  }, [compartiment, date.moneda]);

  // panoul de verificare a culorilor: exceptiile produsului au prioritate,
  // altfel tabelul general finisaj × grosime (REGULI-CULORI-BILKA §1.3)
  useEffect(() => {
    if (!date.compartimentId || !date.finisaj.trim() || !date.grosime.trim()) {
      setCulori(null);
      return;
    }
    apiProduse
      .culoriVerificare({
        compartimentId: date.compartimentId,
        finisaj: date.finisaj.trim(),
        grosime: date.grosime.trim(),
        exceptii: date.culoriDisponibile.trim() || undefined,
      })
      .then(setCulori)
      .catch(() => setCulori(null));
  }, [date.compartimentId, date.finisaj, date.grosime, date.culoriDisponibile]);

  async function verificaDuplicatCod() {
    const cod = date.codFurnizor.trim();
    if (!cod || !date.compartimentId) {
      setDuplicatCod([]);
      return;
    }
    try {
      const { produse } = await apiProduse.lista({ compartimentId: date.compartimentId, q: cod, pageSize: 20 });
      setDuplicatCod(produse.filter((p) => p.codFurnizor === cod && p.id !== id));
    } catch {
      setDuplicatCod([]);
    }
  }

  async function trimite(e: FormEvent) {
    e.preventDefault();
    setEroare(null);
    setSeSalveaza(true);
    try {
      const payload = spreServer(date);
      if (esteNou) {
        const { produs } = await apiProduse.creeaza(payload);
        navigate(`/zona-tehnica/produse/${produs.id}`, { replace: true });
      } else {
        const { produs } = await apiProduse.actualizeaza(id!, payload);
        setProdusExistent(produs);
        setDate(dinProdus(produs));
        setSalvat(true);
      }
    } catch (err) {
      setEroare(textEroare(err));
    } finally {
      setSeSalveaza(false);
    }
  }

  const grupSelectat = grupuri.find((g) => g.id === date.grupId);

  return (
    <>
      <p className="mic">
        <Link to="/zona-tehnica/produse">← Toate produsele</Link>
      </p>
      <h1>{esteNou ? "Produs nou" : produsExistent?.denumire ?? "Produs"}</h1>
      {!esteNou && produsExistent && (
        <p className="text-secundar">
          Cod intern <strong>{produsExistent.codIntern}</strong>
          {produsExistent.codFurnizor && (
            <>
              {" "}
              · cod furnizor <strong>{produsExistent.codFurnizor}</strong>
            </>
          )}
        </p>
      )}

      <form className="formular" onSubmit={trimite}>
        <h2>Unde stă produsul</h2>
        <div className="rand-campuri">
          <Camp eticheta="Compartiment" obligatoriu>
            <select
              value={date.compartimentId}
              onChange={(e) => {
                seteaza("compartimentId", e.target.value);
                seteaza("grupId", "");
                seteaza("familieId", "");
                seteaza("moneda", "");
              }}
              required
              autoFocus={esteNou}
            >
              <option value="">alege…</option>
              {compartimente.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.denumire}
                </option>
              ))}
            </select>
          </Camp>
          <Camp eticheta="Grup" obligatoriu>
            <select
              value={date.grupId}
              onChange={(e) => {
                seteaza("grupId", e.target.value);
                seteaza("familieId", "");
              }}
              required
              disabled={!date.compartimentId}
            >
              <option value="">alege…</option>
              {grupuri.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.denumire}
                </option>
              ))}
            </select>
          </Camp>
          <Camp eticheta="Familie (model)">
            <select value={date.familieId} onChange={(e) => seteaza("familieId", e.target.value)} disabled={!grupSelectat}>
              <option value="">— fără —</option>
              {grupSelectat?.familii.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.denumire}
                </option>
              ))}
            </select>
          </Camp>
          <Camp eticheta="Categorie (rubrica) de ofertă">
            <select value={date.categorieOfertaId} onChange={(e) => seteaza("categorieOfertaId", e.target.value)}>
              <option value="">— nestabilită —</option>
              {categorii.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.denumire}
                </option>
              ))}
            </select>
          </Camp>
        </div>

        <h2>Identificare</h2>
        <div className="rand-campuri">
          <Camp eticheta="Denumire" obligatoriu ajutor="cum apare în soft">
            <input type="text" value={date.denumire} onChange={(e) => seteaza("denumire", e.target.value)} required />
          </Camp>
          <Camp eticheta="Cod furnizor" ajutor="poate lipsi; poate să se repete (un cod, două produse)">
            <input type="text" value={date.codFurnizor} onChange={(e) => seteaza("codFurnizor", e.target.value)} onBlur={verificaDuplicatCod} />
          </Camp>
          <Camp eticheta="Cod intern" ajutor={esteNou ? "gol = se generează automat din cod furnizor + denumire" : "stabil; se schimbă doar cu motiv"}>
            <input type="text" value={date.codIntern} onChange={(e) => seteaza("codIntern", e.target.value)} />
          </Camp>
          <Camp eticheta="Unitate de măsură" obligatoriu ajutor="M2, BUC, ML, CUTIE, ROLA">
            <input type="text" value={date.um} onChange={(e) => seteaza("um", e.target.value.toUpperCase())} required />
          </Camp>
          <Camp eticheta="Monedă" obligatoriu ajutor="implicit cea a compartimentului">
            <input type="text" value={date.moneda} onChange={(e) => seteaza("moneda", e.target.value.toUpperCase())} required />
          </Camp>
        </div>

        {duplicatCod.length > 0 && (
          <Mesaj tip="avertizare">
            Mai există {duplicatCod.length === 1 ? "un produs" : `${duplicatCod.length} produse`} cu codul furnizor <strong>{date.codFurnizor}</strong> în acest
            compartiment: {duplicatCod.map((p) => p.denumire).join("; ")}. E în regulă dacă e cazul „un cod, două produse” (ruperea pantei, colțar, tablă plană);
            altfel verifică.
          </Mesaj>
        )}

        <h2>Caracteristici</h2>
        <div className="rand-campuri">
          <Camp eticheta="Variantă">
            <input type="text" value={date.varianta} onChange={(e) => seteaza("varianta", e.target.value)} />
          </Camp>
          <Camp eticheta="Finisaj">
            <input type="text" value={date.finisaj} onChange={(e) => seteaza("finisaj", e.target.value)} />
          </Camp>
          <Camp eticheta="Grosime" ajutor="ex. 0,50 mm">
            <input type="text" value={date.grosime} onChange={(e) => seteaza("grosime", e.target.value)} />
          </Camp>
          <Camp eticheta="Opțiune" ajutor="dripstop / soundcontrol">
            <input type="text" value={date.optiune} onChange={(e) => seteaza("optiune", e.target.value)} />
          </Camp>
          <Camp eticheta="Categorie Bilka" ajutor="doar lista 01">
            <input type="text" value={date.categorieBilka} onChange={(e) => seteaza("categorieBilka", e.target.value)} />
          </Camp>
        </div>

        <h2>Dimensiuni și sisteme</h2>
        <div className="rand-campuri">
          <Camp eticheta="Lățime totală (m)" ajutor="învelitori">
            <input type="text" inputMode="decimal" value={date.latimeTotalaM} onChange={(e) => seteaza("latimeTotalaM", e.target.value)} />
          </Camp>
          <Camp eticheta="Lățime totală (mm)" ajutor="șipcă gard">
            <input type="text" inputMode="decimal" value={date.latimeTotalaMm} onChange={(e) => seteaza("latimeTotalaMm", e.target.value)} />
          </Camp>
          <Camp eticheta="Modul (cm)" ajutor="țiglă: 35">
            <input type="text" inputMode="decimal" value={date.modulCm} onChange={(e) => seteaza("modulCm", e.target.value)} />
          </Camp>
          <Camp eticheta="Sistem" ajutor="pluvial: 125 / 90 sau 150 / 100">
            <input type="text" value={date.sistem} onChange={(e) => seteaza("sistem", e.target.value)} />
          </Camp>
          <Camp eticheta="Treaptă" ajutor="accesorii speciale: D01…D25">
            <input type="text" value={date.treapta} onChange={(e) => seteaza("treapta", e.target.value)} />
          </Camp>
          <Camp eticheta="Desfășurată" ajutor="ex. 0–50 mm">
            <input type="text" value={date.desfasurata} onChange={(e) => seteaza("desfasurata", e.target.value)} />
          </Camp>
        </div>

        <h2>Culori</h2>
        <div className="rand-campuri">
          <Camp eticheta="Culori disponibile — excepții pe produs" ajutor="doar la pluvial, holțșuruburi, calote…; despărțite prin virgulă; au prioritate față de tabelul general">
            <textarea value={date.culoriDisponibile} onChange={(e) => seteaza("culoriDisponibile", e.target.value)} />
          </Camp>
          <div className="camp">
            <span>Verificare: culorile care vor apărea la ofertă</span>
            {!culori && <p className="text-secundar mic">Completează compartimentul, finisajul și grosimea ca să vezi lista.</p>}
            {culori && culori.culori.length === 0 && (
              <Mesaj tip="avertizare">
                Nicio culoare în tabelul general pentru {date.finisaj} × {date.grosime}
                {compartiment ? ` la ${compartiment.denumire}` : ""}. Verifică ecranul „Culori” sau completează excepțiile.
              </Mesaj>
            )}
            {culori && culori.culori.length > 0 && (
              <>
                <p className="text-secundar mic">
                  {culori.sursa === "exceptie" ? "din excepțiile produsului" : `din tabelul general finisaj × grosime`} · {culori.culori.length} culori
                </p>
                <div className="lista-culori">
                  {culori.culori.map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <h2>Altele</h2>
        <div className="rand-campuri">
          <Camp eticheta="Sursa" ajutor="ex. PDF 01 + ListaPret">
            <input type="text" value={date.sursa} onChange={(e) => seteaza("sursa", e.target.value)} />
          </Camp>
          <Camp eticheta="Ordine">
            <input type="text" inputMode="numeric" value={date.ordine} onChange={(e) => seteaza("ordine", e.target.value)} />
          </Camp>
        </div>
        <Camp eticheta="Observații">
          <textarea value={date.observatii} onChange={(e) => seteaza("observatii", e.target.value)} />
        </Camp>
        <label className="camp-bifa">
          <input type="checkbox" checked={date.activ} onChange={(e) => seteaza("activ", e.target.checked)} />
          Activ (un produs inactiv nu apare la ofertă, dar rămâne în istoric)
        </label>

        {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
        {salvat && <Mesaj tip="ok">Salvat. Modificările sunt în jurnal, cu valoarea dinainte și după.</Mesaj>}

        <div className="actiuni">
          <button className="buton" type="submit" disabled={seSalveaza}>
            {seSalveaza ? "Se salvează…" : esteNou ? "Salvează produsul" : "Salvează modificările"}
          </button>
          <Link className="buton secundar" to="/zona-tehnica/produse">
            Înapoi la listă
          </Link>
        </div>
      </form>
    </>
  );
}
