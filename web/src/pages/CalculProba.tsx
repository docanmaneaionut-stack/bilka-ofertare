import { useEffect, useState } from "react";
import {
  apiMot,
  type InvelitoareIntrare,
  type IntrareProba,
  type LinieIntrare,
  type LinieRezultat,
  type PozitieLungime,
  type ProdusProba,
  type RezultatProba,
} from "../api";
import { Ajutor, Camp, Mesaj, textEroare } from "../components/ui";

// Ecran tehnic de proba (doar Admin general): produse din catalogul real,
// cantitati, cont, grupa, tinta, mod de prezentare, preturi fixe; rezultatul
// motorului pe loc. Nimic nu se salveaza. Motorul e pur; ecranul doar citeste
// catalogul si il apeleaza.

type LinieUI = LinieIntrare & {
  // la invelitori: panotajul si suprafata directa (motorul le primeste in "invelitori")
  panotaj?: PozitieLungime[];
  mpDirect?: string;
  latimeTotalaM?: string;
  culoareRal?: string;
  variantaProfil?: string;
};

type Stare = Omit<IntrareProba, "linii" | "invelitori"> & { linii: LinieUI[] };

const ETICHETA_MOD: Record<IntrareProba["modPrezentare"], string> = {
  simplu: "Simplu",
  lista_discount_general: "Listă + discount general",
  discount_per_linie: "Discount per linie",
};

const ETICHETA_TINTA: Record<IntrareProba["tinta"]["tip"], string> = {
  total_cu_tva_lei: "Sumă cu TVA (lei)",
  adaos_pct: "Adaos %",
  adaos_pct_pastrat: "Adaos % păstrat (variantă)",
};

function stareInitiala(): Stare {
  return {
    cursBnr: "",
    tvaPct: 21,
    cont: { tip: "AGENT", adaosPct: "1.00" },
    grupaPct: "0",
    tinta: { tip: "total_cu_tva_lei", valoare: "" },
    modPrezentare: "simplu",
    completare: false,
    linii: [],
    zonaB: [],
  };
}

function esteInvelitoare(l: LinieUI): boolean {
  return /^învelitori/i.test(l.rubrica);
}

function esteMl(l: LinieUI): boolean {
  return l.produs.um.trim().toLowerCase() === "ml" && !/șipcă|sipca/i.test(l.rubrica);
}

// intrarea motorului din starea ecranului: invelitorile se construiesc din liniile rubricii Invelitori
function spreIntrare(s: Stare): IntrareProba {
  const invelitori: InvelitoareIntrare[] = s.linii
    .filter(esteInvelitoare)
    .map((l, idx) => {
      const inv: InvelitoareIntrare = {
        id: l.produs.cod,
        produs: l.produs,
        rol: idx === 0 ? "principala" : "secundara",
        latimeTotalaM: l.latimeTotalaM ?? "",
        panotaj: (l.panotaj ?? []).filter((p) => p.lungimeM !== "" && p.bucati > 0),
      };
      if (l.culoareRal) inv.culoare = l.culoareRal;
      if (l.mpDirect) inv.mpDirect = l.mpDirect;
      if (l.variantaProfil) inv.variantaProfil = l.variantaProfil;
      return inv;
    });
  const linii: LinieIntrare[] = s.linii.map((l) => {
    const { panotaj, mpDirect, latimeTotalaM, culoareRal, variantaProfil, ...rest } = l;
    void panotaj;
    void mpDirect;
    void latimeTotalaM;
    void variantaProfil;
    const linie: LinieIntrare = { ...rest, cantitate: rest.cantitate === "" ? "1" : rest.cantitate };
    if (esteMl(l) && l.pozitii && l.pozitii.length > 0) linie.pozitii = l.pozitii.filter((p) => p.lungimeM !== "" && p.bucati > 0);
    if (!esteInvelitoare(l) && culoareRal && !linie.invelitoare) {
      linie.culoare = { ral: culoareRal, finisaj: l.produs.finisaj ?? "", ...(l.produs.grosime ? { grosime: l.produs.grosime } : {}) };
    }
    if (linie.pretFix && linie.pretFix.valoare === "") delete linie.pretFix;
    if (linie.discountPct === "") delete linie.discountPct;
    if (linie.invelitoare === "") delete linie.invelitoare;
    return linie;
  });
  const intrare: IntrareProba = { ...s, invelitori, linii };
  if (intrare.modPrezentare !== "lista_discount_general") delete intrare.discountGeneralPct;
  if (intrare.modPrezentare !== "discount_per_linie") delete intrare.discountImplicitPct;
  return intrare;
}

// starea ecranului dintr-o intrare primita de la server (etalon)
function dinIntrare(i: IntrareProba): Stare {
  const linii: LinieUI[] = i.linii.map((l) => {
    const ui: LinieUI = { ...l };
    if (l.culoare) ui.culoareRal = l.culoare.ral;
    if (/^învelitori/i.test(l.rubrica)) {
      const inv = i.invelitori.find((x) => x.id === l.produs.cod);
      if (inv) {
        ui.panotaj = inv.panotaj;
        ui.latimeTotalaM = inv.latimeTotalaM;
        if (inv.mpDirect) ui.mpDirect = inv.mpDirect;
        if (inv.culoare) ui.culoareRal = inv.culoare;
        if (inv.variantaProfil) ui.variantaProfil = inv.variantaProfil;
      }
    }
    return ui;
  });
  const { invelitori, ...rest } = i;
  void invelitori;
  return { ...rest, linii };
}

function produsDinCatalog(p: ProdusProba): LinieUI["produs"] {
  const produs: LinieUI["produs"] = { cod: p.cod, denumire: p.denumire, um: p.um, pretBazaEur: p.pretEur };
  if (p.finisaj) produs.finisaj = p.finisaj;
  if (p.grosime) produs.grosime = p.grosime;
  if (p.grup) produs.grup = p.grup;
  if (p.familie) produs.familie = p.familie;
  if (p.optiune) produs.optiune = p.optiune;
  return produs;
}

function latimeDinCatalog(p: ProdusProba): string {
  if (p.latimeTotalaM) return p.latimeTotalaM;
  const m = p.tablaPlana === "mp" && p.varianta ? /^\s*(\d+(?:[.,]\d+)?)/.exec(p.varianta) : null;
  return m ? m[1].replace(",", ".") : "";
}

export function CalculProba() {
  const [stare, setStare] = useState<Stare>(stareInitiala);
  const [etaloane, setEtaloane] = useState<{ id: string; titlu: string }[]>([]);
  const [etalonAles, setEtalonAles] = useState("E01");
  const [titluEtalon, setTitluEtalon] = useState<string | null>(null);
  const [cautare, setCautare] = useState("");
  const [gasite, setGasite] = useState<ProdusProba[]>([]);
  const [rezultat, setRezultat] = useState<RezultatProba | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [seCalculeaza, setSeCalculeaza] = useState(false);
  let urmatorId = stare.linii.length + 1;

  useEffect(() => {
    apiMot
      .etaloane()
      .then(({ etaloane }) => setEtaloane(etaloane))
      .catch((e) => setEroare(textEroare(e)));
  }, []);

  useEffect(() => {
    if (cautare.trim().length < 2) return;
    const t = setTimeout(() => {
      apiMot
        .produse(cautare.trim())
        .then(({ produse }) => setGasite(produse))
        .catch((e) => setEroare(textEroare(e)));
    }, 250);
    return () => clearTimeout(t);
  }, [cautare]);

  async function calculeaza(s: Stare = stare) {
    setEroare(null);
    setSeCalculeaza(true);
    try {
      const { rezultat } = await apiMot.proba(spreIntrare(s));
      setRezultat(rezultat);
    } catch (e) {
      setRezultat(null);
      setEroare(textEroare(e));
    } finally {
      setSeCalculeaza(false);
    }
  }

  async function incarcaEtalon() {
    setEroare(null);
    try {
      const { etalon, intrare } = await apiMot.etalon(etalonAles);
      const s = dinIntrare(intrare);
      setStare(s);
      setTitluEtalon(`${etalon.id} — ${etalon.titlu}`);
      await calculeaza(s);
    } catch (e) {
      setEroare(textEroare(e));
    }
  }

  function seteaza(schimbari: Partial<Stare>) {
    setStare((s) => ({ ...s, ...schimbari }));
    setTitluEtalon(null);
  }

  function seteazaLinie(id: string, schimbari: Partial<LinieUI>) {
    setStare((s) => ({ ...s, linii: s.linii.map((l) => (l.id === id ? { ...l, ...schimbari } : l)) }));
  }

  function adaugaProdus(p: ProdusProba) {
    const id = `L${urmatorId++}`;
    const rubrica = p.rubrica ?? p.grup ?? "Alte produse";
    const linie: LinieUI = { id, rubrica, produs: produsDinCatalog(p), cantitate: "1" };
    if (/^învelitori/i.test(rubrica) && p.tablaPlana !== "coala") {
      linie.panotaj = [{ lungimeM: "", bucati: 0 }];
      linie.latimeTotalaM = latimeDinCatalog(p);
    } else {
      const principala = stare.linii.find(esteInvelitoare);
      if (principala && /tinichigerie|accesorii standard|accesorii speciale 2|fixare/i.test(rubrica)) linie.invelitoare = principala.produs.cod;
    }
    setStare((s) => ({ ...s, linii: [...s.linii, linie] }));
    setCautare("");
    setGasite([]);
    setTitluEtalon(null);
  }

  function stergeLinie(id: string) {
    setStare((s) => ({ ...s, linii: s.linii.filter((l) => l.id !== id) }));
  }

  const invelitori = stare.linii.filter(esteInvelitoare);
  const perLinie = stare.modPrezentare === "discount_per_linie";
  const lista = stare.modPrezentare === "lista_discount_general";
  const rezultatPeLinie = new Map<string, LinieRezultat>((rezultat?.linii ?? []).map((l) => [l.id, l]));
  const t = rezultat?.totaluri;

  return (
    <>
      <div className="antet-pagina">
        <h1>Calcul de probă</h1>
        <div className="actiuni">
          <select value={etalonAles} onChange={(e) => setEtalonAles(e.target.value)} aria-label="Oferta-model">
            {etaloane.map((e) => (
              <option key={e.id} value={e.id}>
                {e.id} — {e.titlu.slice(0, 70)}
                {e.titlu.length > 70 ? "…" : ""}
              </option>
            ))}
          </select>
          <button className="buton secundar" onClick={incarcaEtalon} disabled={etaloane.length === 0}>
            Încarcă etalonul {etalonAles}
          </button>
        </div>
      </div>

      {titluEtalon && <p className="text-secundar">{titluEtalon}</p>}
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}

      <div className="rand-campuri" style={{ marginBottom: 20 }}>
        <Camp eticheta="Curs BNR (documentul)" obligatoriu>
          <input type="text" inputMode="decimal" value={stare.cursBnr} onChange={(e) => seteaza({ cursBnr: e.target.value })} placeholder="5.3485" />
        </Camp>
        <Camp eticheta="Cont">
          <select value={stare.cont.tip} onChange={(e) => seteaza({ cont: { ...stare.cont, tip: e.target.value } })}>
            <option value="AGENT">Agent</option>
            <option value="ADMINISTRATOR">Administrator</option>
            <option value="COLABORATOR">Colaborator</option>
          </select>
        </Camp>
        <Camp eticheta="Adaos cont %">
          <input type="text" inputMode="decimal" value={stare.cont.adaosPct} onChange={(e) => seteaza({ cont: { ...stare.cont, adaosPct: e.target.value } })} />
        </Camp>
        <Camp eticheta="Grupă %">
          <input type="text" inputMode="decimal" value={stare.grupaPct} onChange={(e) => seteaza({ grupaPct: e.target.value })} />
        </Camp>
        <Camp eticheta="TVA %">
          <input type="number" value={stare.tvaPct} onChange={(e) => seteaza({ tvaPct: Number(e.target.value) })} />
        </Camp>
        <Camp eticheta="Mod de prezentare">
          <select value={stare.modPrezentare} onChange={(e) => seteaza({ modPrezentare: e.target.value as Stare["modPrezentare"] })}>
            {Object.entries(ETICHETA_MOD).map(([v, et]) => (
              <option key={v} value={v}>
                {et}
              </option>
            ))}
          </select>
        </Camp>
        {lista && (
          <Camp eticheta="Discount general %">
            <input type="text" inputMode="decimal" value={stare.discountGeneralPct ?? ""} onChange={(e) => seteaza({ discountGeneralPct: e.target.value })} />
          </Camp>
        )}
        {perLinie && (
          <Camp eticheta="Discount implicit pe linie %">
            <input type="text" inputMode="decimal" value={stare.discountImplicitPct ?? ""} onChange={(e) => seteaza({ discountImplicitPct: e.target.value })} />
          </Camp>
        )}
        <Camp eticheta="Țintă">
          <select value={stare.tinta.tip} onChange={(e) => seteaza({ tinta: { ...stare.tinta, tip: e.target.value as Stare["tinta"]["tip"] } })}>
            {Object.entries(ETICHETA_TINTA).map(([v, et]) => (
              <option key={v} value={v}>
                {et}
              </option>
            ))}
          </select>
        </Camp>
        <Camp eticheta={stare.tinta.tip === "total_cu_tva_lei" ? "Suma discutată (lei cu TVA)" : "Adaos țintă %"} obligatoriu>
          <input type="text" inputMode="decimal" value={stare.tinta.valoare} onChange={(e) => seteaza({ tinta: { ...stare.tinta, valoare: e.target.value } })} />
        </Camp>
        <label className="camp-bifa">
          <input type="checkbox" checked={stare.completare} onChange={(e) => seteaza({ completare: e.target.checked })} />
          <span>Completare marcată (garda nu se aplică)</span>
        </label>
      </div>

      <h2>Produse</h2>
      <div className="rand-campuri" style={{ marginBottom: 12 }}>
        <Camp eticheta="Adaugă produs din catalog (denumire sau cod Bilka)">
          <input
            type="search"
            value={cautare}
            onChange={(e) => {
              setCautare(e.target.value);
              if (e.target.value.trim().length < 2) setGasite([]);
            }}
            placeholder="ex. Iberic mat 0,50 sau TMIBEMAT050"
          />
        </Camp>
      </div>
      {gasite.length > 0 && (
        <div className="tabel-invelis" style={{ marginBottom: 16 }}>
          <table className="tabel">
            <tbody>
              {gasite.map((p) => (
                <tr key={p.produsId} className="selectabil" tabIndex={0} onClick={() => adaugaProdus(p)} onKeyDown={(e) => e.key === "Enter" && adaugaProdus(p)}>
                  <td className="mic">{p.cod}</td>
                  <td>
                    <strong>{p.denumire}</strong>
                  </td>
                  <td className="mic">{p.rubrica ?? p.grup}</td>
                  <td>{p.um}</td>
                  <td>{p.pretEur} EUR</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stare.linii.length === 0 && <Mesaj>Nicio linie. Caută un produs sau încarcă o ofertă-model.</Mesaj>}

      {stare.linii.length > 0 && (
        <div className="tabel-invelis">
          <table className="tabel editabil">
            <thead>
              <tr>
                <th>Nr</th>
                <th>Produs</th>
                <th>Rubrică</th>
                <th>UM</th>
                <th>Cantitate</th>
                <th>Învelitoare</th>
                <th>RAL</th>
                <th>Preț fix</th>
                {perLinie && <th>Disc. %</th>}
                <th>Achiziție lei cu TVA</th>
                {(lista || perLinie) && <th>Preț listă</th>}
                {perLinie && <th>Disc.</th>}
                <th>{lista ? "Preț net" : "Preț document"}</th>
                <th>Valoare EUR</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {stare.linii.map((l, idx) => {
                const r = rezultatPeLinie.get(l.id);
                const inv = esteInvelitoare(l);
                const ml = esteMl(l);
                return (
                  <LinieRand
                    key={l.id}
                    nr={idx + 1}
                    linie={l}
                    rezultat={r}
                    invelitoare={inv}
                    ml={ml}
                    invelitori={invelitori}
                    perLinie={perLinie}
                    lista={lista}
                    onSchimba={(s) => seteazaLinie(l.id, s)}
                    onSterge={() => stergeLinie(l.id)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="actiuni" style={{ margin: "16px 0 24px" }}>
        <button className="buton" onClick={() => calculeaza()} disabled={seCalculeaza || stare.linii.length === 0}>
          {seCalculeaza ? "Se calculează…" : "Calculează"}
        </button>
        <button
          className="buton secundar"
          onClick={() => {
            setStare(stareInitiala());
            setRezultat(null);
            setTitluEtalon(null);
          }}
        >
          Golește
        </button>
      </div>

      {rezultat && t && (
        <>
          <h2>Rezultat</h2>
          {rezultat.avertizari.map((a, i) => (
            <Mesaj key={i} tip="avertizare">
              {a}
            </Mesaj>
          ))}
          {!rezultat.comandabil.da && (
            <Mesaj tip="avertizare">
              Nu se poate comanda: {rezultat.comandabil.motive.join("; ")}
            </Mesaj>
          )}
          {rezultat.garda.aplicata && !rezultat.garda.respectata && (
            <Mesaj tip="eroare">Gardă: linii sub achiziția reală a contului: {rezultat.garda.liniiSubAchizitie.join(", ")}</Mesaj>
          )}

          <div className="grila-totaluri">
            <Total eticheta="Curs achiziție (BNR × 1,01)" valoare={rezultat.cursAchizitie} />
            <Total eticheta="Achiziție cont, lei cu TVA" valoare={t.achizitieContLeiCuTva} />
            {t.achizitieRealaLeiCuTva !== t.achizitieContLeiCuTva && <Total eticheta="Achiziție reală (fără grupă), lei cu TVA" valoare={t.achizitieRealaLeiCuTva} />}
            <Total eticheta="Țintă, lei cu TVA" valoare={t.tintaLeiCuTva} />
            <Total eticheta="Marjă, lei" valoare={t.marjaLei} />
            <Total eticheta="Adaos real %" valoare={t.adaosRealPct} />
          </div>
          <div className="grila-totaluri">
            {lista && <Total eticheta="Total listă fără TVA, EUR" valoare={t.totalListaFaraTvaEur} />}
            {lista && <Total eticheta={`Discount ${stare.discountGeneralPct ?? ""} %, EUR`} valoare={t.discountGeneralEur} />}
            <Total eticheta="Total fără TVA, EUR" valoare={t.documentFaraTvaEur} />
            <Total eticheta={`TVA ${stare.tvaPct} %, EUR`} valoare={t.tvaEur} />
            <Total eticheta="Total cu TVA, EUR" valoare={t.documentCuTvaEur} />
            <Total eticheta="Total în lei" valoare={t.documentTotalLei} accent />
            <Total eticheta="Abatere, EUR" valoare={rezultat.abatereEur} />
          </div>
          <div className="grila-totaluri">
            <Total eticheta="Vânzări: preț vânzare, lei" valoare={rezultat.vanzari.pretVanzareLei} />
            <Total eticheta="Vânzări: cost achiziție, lei" valoare={rezultat.vanzari.costAchizitieLei} />
            <Total eticheta="Vânzări: adaos net, lei" valoare={rezultat.vanzari.adaosNetLei} />
            <Total eticheta="Vânzări: adaos brut, lei" valoare={rezultat.vanzari.adaosBrutLei} />
          </div>

          <h3>Pachete și formulare Bilka</h3>
          <p>{rezultat.textFormulare}</p>
          {rezultat.pachete.length > 0 && (
            <ul>
              {rezultat.pachete.map((p) => (
                <li key={p.id}>
                  <strong>{p.nume}</strong> — {p.linii.length} linii, achiziție {p.achizitieEur} EUR
                </li>
              ))}
            </ul>
          )}
          {rezultat.cantitati.invelitori.length > 0 && (
            <p className="text-secundar mic">
              Învelitori:{" "}
              {rezultat.cantitati.invelitori.map((i) => `${i.id} ${i.mp} mp (${i.coli} coli)`).join(" · ")}
              {rezultat.cantitati.sipci.length ? ` · Șipcă: ${rezultat.cantitati.sipci.map((s) => `${s.bucatiTotal} buc, ${s.mlTotal} ml`).join(" / ")}` : ""}
            </p>
          )}
        </>
      )}

      <Ajutor>
        <ul>
          <li>Ecran de probă pentru motorul de calcul: nimic nu se salvează. Prețurile de bază vin din lista de preț activă a catalogului.</li>
          <li>
            <strong>Încarcă etalonul</strong> umple formularul cu o ofertă-model din <code>docs/etalon</code> și calculează pe loc; rezultatul trebuie să coincidă cu blocul „asteptat” al fișierului.
          </li>
          <li>La învelitori, cantitatea se calculează din panotaj (lungime × bucăți × lățimea totală, 3 zecimale) și / sau din mp-ul direct; la accesoriile la ml din lungime × bucăți. Liniile de tinichigerie și fixare moștenesc culoarea învelitorii alese; pluvialul și liniile fără învelitoare au RAL-ul lor.</li>
          <li>Prețul fix: o sumă în EUR fără TVA sau „achiziție reală + x %”. Ținta: suma discutată cu TVA sau un adaos %. Grupa se adaugă la achiziția afișată, nu la costul din vânzări.</li>
          <li>Abaterea arată restul de rotunjire care nu a încăput în cenți întregi pe liniile la bucată; atunci totalul în lei e cel calculat, nu suma discutată.</li>
        </ul>
      </Ajutor>
    </>
  );
}

function Total({ eticheta, valoare, accent }: { eticheta: string; valoare?: string; accent?: boolean }) {
  return (
    <div>
      <span className="text-secundar mic">{eticheta}</span>
      <span className={accent ? "numar-mare" : undefined} style={{ fontWeight: 600 }}>
        {valoare ?? "–"}
      </span>
    </div>
  );
}

function LinieRand({
  nr,
  linie,
  rezultat,
  invelitoare,
  ml,
  invelitori,
  perLinie,
  lista,
  onSchimba,
  onSterge,
}: {
  nr: number;
  linie: LinieUI;
  rezultat?: LinieRezultat;
  invelitoare: boolean;
  ml: boolean;
  invelitori: LinieUI[];
  perLinie: boolean;
  lista: boolean;
  onSchimba: (s: Partial<LinieUI>) => void;
  onSterge: () => void;
}) {
  const pozitii = invelitoare ? (linie.panotaj ?? []) : (linie.pozitii ?? []);
  const seteazaPozitii = (p: PozitieLungime[]) => onSchimba(invelitoare ? { panotaj: p } : { pozitii: p });
  const legabila = !invelitoare && !/pluvial|lungimi|șipcă|sipca/i.test(linie.rubrica);
  return (
    <>
      <tr className={rezultat?.subAchizitie ? "inactiv" : undefined}>
        <td className="mic">{nr}</td>
        <td>
          <strong>{linie.produs.denumire}</strong>
          <div className="mic text-secundar">
            {linie.produs.cod} · bază {linie.produs.pretBazaEur} EUR
          </div>
        </td>
        <td className="mic">{linie.rubrica}</td>
        <td>{rezultat?.um ?? linie.produs.um}</td>
        <td>
          {invelitoare || (ml && pozitii.length > 0) ? (
            <span>{rezultat?.cantitate ?? "–"}</span>
          ) : (
            <input type="text" inputMode="decimal" value={linie.cantitate} onChange={(e) => onSchimba({ cantitate: e.target.value })} style={{ width: 80 }} />
          )}
        </td>
        <td>
          {legabila ? (
            <select value={linie.invelitoare ?? ""} onChange={(e) => onSchimba({ invelitoare: e.target.value || undefined })}>
              <option value="">– independentă –</option>
              {invelitori.map((i) => (
                <option key={i.id} value={i.produs.cod}>
                  {i.produs.denumire}
                </option>
              ))}
            </select>
          ) : (
            <span className="mic text-secundar">{invelitoare ? "învelitoare" : "–"}</span>
          )}
        </td>
        <td>
          {invelitoare || !linie.invelitoare ? (
            <input type="text" value={linie.culoareRal ?? ""} onChange={(e) => onSchimba({ culoareRal: e.target.value })} placeholder="RAL 3005" style={{ width: 100 }} />
          ) : (
            <span className="mic text-secundar">moștenit</span>
          )}
        </td>
        <td>
          <div style={{ display: "flex", gap: 4 }}>
            <select
              value={linie.pretFix?.tip ?? ""}
              onChange={(e) => onSchimba({ pretFix: e.target.value ? { tip: e.target.value as "eur_fara_tva" | "achizitie_plus_pct", valoare: linie.pretFix?.valoare ?? "" } : undefined })}
            >
              <option value="">–</option>
              <option value="eur_fara_tva">EUR</option>
              <option value="achizitie_plus_pct">achiz. + %</option>
            </select>
            {linie.pretFix && (
              <input type="text" inputMode="decimal" value={linie.pretFix.valoare} onChange={(e) => onSchimba({ pretFix: { tip: linie.pretFix!.tip, valoare: e.target.value } })} style={{ width: 70 }} />
            )}
          </div>
        </td>
        {perLinie && (
          <td>
            <input type="text" inputMode="decimal" value={linie.discountPct ?? ""} onChange={(e) => onSchimba({ discountPct: e.target.value || undefined })} placeholder="implicit" style={{ width: 70 }} />
          </td>
        )}
        <td>{rezultat?.achizitieContLeiCuTva ?? "–"}</td>
        {(lista || perLinie) && <td>{rezultat?.pretListaEur ?? "–"}</td>}
        {perLinie && <td>{rezultat?.discountPct !== undefined ? `${rezultat.discountPct} %` : "–"}</td>}
        <td>
          {rezultat ? (lista ? rezultat.pretNetEur : rezultat.pretDocumentEur) : "–"}
          {rezultat?.pretFix && <span className="eticheta"> fix</span>}
          {rezultat?.subAchizitie && <span className="eticheta"> sub achiziție</span>}
        </td>
        <td>{rezultat?.valoareEur ?? "–"}</td>
        <td>
          <button className="buton secundar mic" onClick={onSterge} aria-label={`Șterge linia ${nr}`}>
            ✕
          </button>
        </td>
      </tr>
      {(invelitoare || ml) && (
        <tr>
          <td></td>
          <td colSpan={perLinie ? 14 : lista ? 12 : 11}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
              {invelitoare && (
                <>
                  <Camp eticheta="Lățime totală (m)">
                    <input type="text" inputMode="decimal" value={linie.latimeTotalaM ?? ""} onChange={(e) => onSchimba({ latimeTotalaM: e.target.value })} style={{ width: 90 }} />
                  </Camp>
                  <Camp eticheta="Suprafață directă (mp)">
                    <input type="text" inputMode="decimal" value={linie.mpDirect ?? ""} onChange={(e) => onSchimba({ mpDirect: e.target.value || undefined })} style={{ width: 100 }} />
                  </Camp>
                </>
              )}
              <Camp eticheta={invelitoare ? "Panotaj: lungime (m) × bucăți" : "Lungime (m) × bucăți"}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {pozitii.map((p, i) => (
                    <span key={i} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={p.lungimeM}
                        onChange={(e) => seteazaPozitii(pozitii.map((x, j) => (j === i ? { ...x, lungimeM: e.target.value } : x)))}
                        style={{ width: 70 }}
                        aria-label="Lungime (m)"
                      />
                      ×
                      <input
                        type="number"
                        min={0}
                        value={p.bucati || ""}
                        onChange={(e) => seteazaPozitii(pozitii.map((x, j) => (j === i ? { ...x, bucati: Number(e.target.value) } : x)))}
                        style={{ width: 60 }}
                        aria-label="Bucăți"
                      />
                      <button className="buton secundar mic" onClick={() => seteazaPozitii(pozitii.filter((_, j) => j !== i))} aria-label="Șterge poziția">
                        ✕
                      </button>
                    </span>
                  ))}
                  <button className="buton secundar mic" onClick={() => seteazaPozitii([...pozitii, { lungimeM: "", bucati: 0 }])}>
                    + poziție
                  </button>
                </div>
              </Camp>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
