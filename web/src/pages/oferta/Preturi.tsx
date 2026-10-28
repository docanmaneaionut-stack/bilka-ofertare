import { useEffect, useState } from "react";
import { apiPreturi, EroareGarda, type DatePreturi, type LiniePret, type OfertaDetaliu, type SursaPreluare, type TipPretFixIntrare } from "../../api";
import { Ajutor, Camp, Mesaj, textEroare } from "../../components/ui";

// Zona de preturi (FISA-OFERTARE cap. 11, 11.9): modul de prezentare, "Preia preturi
// din oferta ...", cursul; tabelul liniilor cu achizitia contului in lei cu TVA,
// pretul de document, discountul, valoarea si pretul fix pe linie; jos tinta
// (adaos % sau total cu TVA in lei), marja, adaosul real, totalurile si abaterea.
// Fiecare schimbare se salveaza pe loc; garda cazuta = serverul refuza, valoarea
// revine, liniile vinovate se coloreaza. Pretul de baza nu vine niciodata la Agent.

const ETICHETA_MOD: Record<string, string> = { SIMPLU: "simplu", LISTA_DISCOUNT_GENERAL: "listă + discount general", DISCOUNT_PER_LINIE: "discount per linie" };
const TIPURI_FIX: { tip: TipPretFixIntrare; eticheta: string }[] = [
  { tip: "eur_fara_tva", eticheta: "EUR fără TVA" },
  { tip: "eur_cu_tva", eticheta: "EUR cu TVA" },
  { tip: "lei_fara_tva", eticheta: "lei fără TVA" },
  { tip: "lei_cu_tva", eticheta: "lei cu TVA" },
  { tip: "achizitie_plus_pct", eticheta: "achiziție + %" },
];

function lei(v: string | undefined): string {
  if (v === undefined) return "—";
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v;
}

export function Preturi({ oferta, onOferta }: { oferta: OfertaDetaliu; onOferta: (o: OfertaDetaliu) => void }) {
  const r = oferta.preturi?.rezultat ?? null;
  const poate = oferta.poateModifica;
  const [eroare, setEroare] = useState<string | null>(null);
  const [vinovate, setVinovate] = useState<{ id: string; denumire: string }[]>([]);
  const [lucru, setLucru] = useState(false);
  // campurile editabile, din oferta; la refuzul gardei revin
  const [adaos, setAdaos] = useState("");
  const [total, setTotal] = useState("");
  const [discountGeneral, setDiscountGeneral] = useState("");
  const [discountImplicit, setDiscountImplicit] = useState("");
  const [fixPentru, setFixPentru] = useState<string | null>(null);
  const [fix, setFix] = useState<{ tip: TipPretFixIntrare; valoare: string }>({ tip: "eur_fara_tva", valoare: "" });
  const [exceptii, setExceptii] = useState<Record<string, string>>({});
  const [cautare, setCautare] = useState<string | null>(null);
  const [surse, setSurse] = useState<SursaPreluare[]>([]);

  useEffect(() => {
    setAdaos(oferta.tinta.tip === "ADAOS_PCT" || oferta.tinta.tip === "ADAOS_PCT_PASTRAT" ? oferta.tinta.valoare : "");
    setTotal(oferta.tinta.tip === "TOTAL_CU_TVA_LEI" ? oferta.tinta.valoare : "");
    setDiscountGeneral(oferta.discountGeneralPct ?? "");
    setDiscountImplicit(oferta.discountImplicitPct ?? "");
    const e: Record<string, string> = {};
    for (const l of r?.linii ?? []) if (l.discountPct !== undefined && !l.pretFix) e[l.id] = l.discountPct;
    setExceptii(e);
  }, [oferta, r]);

  async function salveaza(date: DatePreturi) {
    setEroare(null);
    setLucru(true);
    try {
      const { oferta: dupa } = await apiPreturi.salveaza(oferta.id, date);
      setVinovate([]);
      onOferta(dupa);
      setFixPentru(null);
    } catch (e) {
      if (e instanceof EroareGarda) {
        setVinovate(e.linii);
        setEroare(`${e.message}: ${e.linii.map((l) => l.denumire).join(", ")}`);
      } else setEroare(textEroare(e));
      // valorile revin la cele salvate
      setAdaos(oferta.tinta.tip === "ADAOS_PCT" || oferta.tinta.tip === "ADAOS_PCT_PASTRAT" ? oferta.tinta.valoare : "");
      setTotal(oferta.tinta.tip === "TOTAL_CU_TVA_LEI" ? oferta.tinta.valoare : "");
    } finally {
      setLucru(false);
    }
  }

  async function actiune(f: () => Promise<OfertaDetaliu>) {
    setEroare(null);
    setLucru(true);
    try {
      onOferta(await f());
      setVinovate([]);
    } catch (e) {
      if (e instanceof EroareGarda) {
        setVinovate(e.linii);
        setEroare(`${e.message}: ${e.linii.map((l) => l.denumire).join(", ")}`);
      } else setEroare(textEroare(e));
    } finally {
      setLucru(false);
    }
  }

  const preluata = oferta.tinta.tip === "PRELUATA";
  const mod = oferta.modPrezentare;
  const idVinovate = new Set(vinovate.map((v) => v.id));

  if (!r) {
    return (
      <section className="panou">
        <h2>Prețuri</h2>
        {oferta.preturi?.eroare ? <Mesaj tip="eroare">Motorul nu poate calcula prețurile: {oferta.preturi.eroare}</Mesaj> : <p className="text-secundar">Prețurile apar după ce oferta are produse.</p>}
      </section>
    );
  }

  const aplicaTinta = (tip: "ADAOS_PCT" | "TOTAL_CU_TVA_LEI", valoare: string) => {
    const v = valoare.trim().replace(",", ".");
    if (!v || !/^-?\d+(\.\d+)?$/.test(v)) return;
    if ((tip === "ADAOS_PCT" && oferta.tinta.tip === tip && oferta.tinta.valoare === v) || (tip === "TOTAL_CU_TVA_LEI" && oferta.tinta.tip === tip && oferta.tinta.valoare === v)) return;
    void salveaza({ tinta: { tip, valoare: v } });
  };

  return (
    <section className="panou">
      <div className="antet-pagina" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Prețuri</h2>
        <div className="actiuni">
          {poate && oferta.status === "IN_LUCRU" && (
            <button
              className="buton secundar mic"
              type="button"
              disabled={lucru}
              onClick={() => {
                if (window.confirm(`Reiau ambele cursuri din cursul zilei (acum ${oferta.curs.cursBnr} din ${oferta.curs.dataCurs}) și recalculez prețurile?`)) void actiune(async () => (await apiPreturi.curs(oferta.id)).oferta);
              }}
            >
              Reîmprospătează cursul
            </button>
          )}
          {poate && !preluata && (
            <button className="buton secundar mic" type="button" disabled={lucru} onClick={() => setCautare(cautare === null ? "" : null)}>
              Preia prețuri din oferta…
            </button>
          )}
          <span className="eticheta inactiv">{lucru ? "se salvează…" : "salvat"}</span>
        </div>
      </div>
      {oferta.preturiVechi && (
        <Mesaj tip="avertizare">
          ⚠ prețuri vechi: lista de preț a ofertei nu mai e cea activă.{" "}
          {poate && oferta.status === "IN_LUCRU" && (
            <button className="buton secundar mic" type="button" disabled={lucru} onClick={() => void actiune(async () => (await apiPreturi.recalculeaza(oferta.id)).oferta)}>
              recalculează
            </button>
          )}
        </Mesaj>
      )}
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      {r.avertizari.map((a, i) => (
        <Mesaj key={i} tip="avertizare">
          {a}
        </Mesaj>
      ))}
      {r.garda.aplicata && !r.garda.respectata && <Mesaj tip="eroare">Linii sub achiziția reală a contului: {r.linii.filter((l) => l.subAchizitie).map((l) => l.denumire).join(", ")} — prețurile trebuie refăcute.</Mesaj>}

      {cautare !== null && (
        <div className="sub-sectiune" style={{ marginBottom: 12 }}>
          <Camp eticheta="Oferta-sursă (număr sau client)">
            <input
              type="search"
              value={cautare}
              onChange={(e) => {
                setCautare(e.target.value);
                if (e.target.value.trim().length >= 2) apiPreturi.surse(oferta.id, e.target.value.trim()).then((x) => setSurse(x.oferte)).catch(() => setSurse([]));
              }}
              placeholder="IB-0147 sau numele clientului"
            />
          </Camp>
          {surse.length > 0 && (
            <ul>
              {surse.map((s) => (
                <li key={s.id}>
                  <button className="buton secundar mic" type="button" disabled={lucru} onClick={() => void actiune(async () => (await apiPreturi.preia(oferta.id, s.id)).oferta)}>
                    {s.numarComplet}
                    {s.versiune > 1 ? ` v${s.versiune}` : ""}
                  </button>{" "}
                  {s.client.nume} · {s.data}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="rand-campuri">
        <Camp eticheta="Mod de prezentare">
          <select value={mod} onChange={(e) => void salveaza({ modPrezentare: e.target.value as DatePreturi["modPrezentare"], ...(e.target.value === "LISTA_DISCOUNT_GENERAL" && !discountGeneral ? { discountGeneralPct: "25" } : {}), ...(e.target.value === "DISCOUNT_PER_LINIE" && !discountImplicit ? { discountImplicitPct: "25" } : {}) })} disabled={!poate || lucru}>
            {Object.entries(ETICHETA_MOD).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Camp>
        {mod === "LISTA_DISCOUNT_GENERAL" && (
          <Camp eticheta="Discount general afișat %">
            <input type="text" inputMode="decimal" value={discountGeneral} onChange={(e) => setDiscountGeneral(e.target.value)} onBlur={() => discountGeneral.trim() && discountGeneral !== (oferta.discountGeneralPct ?? "") && void salveaza({ discountGeneralPct: discountGeneral.trim() })} disabled={!poate || lucru} />
          </Camp>
        )}
        {mod === "DISCOUNT_PER_LINIE" && (
          <Camp eticheta="Discount implicit pe linie %">
            <input type="text" inputMode="decimal" value={discountImplicit} onChange={(e) => setDiscountImplicit(e.target.value)} onBlur={() => discountImplicit.trim() && discountImplicit !== (oferta.discountImplicitPct ?? "") && void salveaza({ discountImplicitPct: discountImplicit.trim() })} disabled={!poate || lucru} />
          </Camp>
        )}
        <Camp eticheta="Cursul documentului / de achiziție">
          <input type="text" value={`${r.cursBnr} / ${r.cursAchizitie}`} readOnly />
        </Camp>
      </div>

      <div className="tabel-invelis">
        <table className="tabel">
          <thead>
            <tr>
              <th>Produs</th>
              <th>Cant.</th>
              <th title="achiziția contului, cu TVA, pe unitate (R2)">Achiziție lei cu TVA</th>
              {mod === "LISTA_DISCOUNT_GENERAL" && <th>Preț listă EUR</th>}
              {mod === "DISCOUNT_PER_LINIE" && <th>Preț listă EUR</th>}
              {mod === "DISCOUNT_PER_LINIE" && <th>Discount %</th>}
              <th>{mod === "LISTA_DISCOUNT_GENERAL" ? "Preț listă EUR" : "Preț document EUR"}</th>
              <th>Valoare EUR</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {r.linii.map((l) => (
              <RandLinie key={l.id} l={l} mod={mod} vinovata={idVinovate.has(l.id)} poate={poate && !lucru} exceptie={exceptii[l.id] ?? ""} setExceptie={(v) => setExceptii((e) => ({ ...e, [l.id]: v }))} salveazaExceptie={() => void salveaza({ linii: [{ id: l.id, discountPct: exceptii[l.id]?.trim() ? exceptii[l.id].trim() : null }] })} fixDeschis={fixPentru === l.id} deschideFix={() => {
                setFixPentru(fixPentru === l.id ? null : l.id);
                setFix({ tip: "eur_fara_tva", valoare: l.pretNetEur ?? l.pretDocumentEur });
              }} fix={fix} setFix={setFix} fixeaza={() => void salveaza({ linii: [{ id: l.id, pretFix: { tip: fix.tip, valoare: fix.valoare.trim().replace(",", ".") } }] })} scoateFix={() => void salveaza({ linii: [{ id: l.id, pretFix: null }] })} />
            ))}
          </tbody>
        </table>
      </div>

      <h3>Țintă</h3>
      {preluata ? (
        <p>
          Prețurile sunt preluate din oferta <strong>{oferta.preluataDin?.numarComplet ?? "…"}</strong>: totalul rezultă din cantități, fără câmp de țintă.{" "}
          {poate && (
            <button className="buton secundar mic" type="button" disabled={lucru} onClick={() => void actiune(async () => (await apiPreturi.renunta(oferta.id, { tip: "ADAOS_PCT", valoare: "20" })).oferta)}>
              Renunță la preluare
            </button>
          )}
        </p>
      ) : (
        <div className="rand-campuri">
          <Camp eticheta="Adaos țintă %">
            <input type="text" inputMode="decimal" value={adaos} onChange={(e) => setAdaos(e.target.value)} onBlur={() => aplicaTinta("ADAOS_PCT", adaos)} onKeyDown={(e) => e.key === "Enter" && aplicaTinta("ADAOS_PCT", adaos)} disabled={!poate || lucru} />
          </Camp>
          <Camp eticheta="sau total cu TVA (lei)">
            <input type="text" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} onBlur={() => aplicaTinta("TOTAL_CU_TVA_LEI", total)} onKeyDown={(e) => e.key === "Enter" && aplicaTinta("TOTAL_CU_TVA_LEI", total)} disabled={!poate || lucru} />
          </Camp>
          {oferta.tinta.tip === "ADAOS_PCT_PASTRAT" && (
            <Camp eticheta="Varianta">
              <input type="text" value={`adaosul bazei păstrat: ${oferta.tinta.valoare} %`} readOnly />
            </Camp>
          )}
        </div>
      )}
      <div className="grila-totaluri">
        <div>
          <span className="text-secundar mic">Total achiziție (lei cu TVA)</span>
          <span className="numar-mare">{lei(r.totaluri.achizitieContLeiCuTva)}</span>
        </div>
        <div>
          <span className="text-secundar mic">Țintă (lei cu TVA)</span>
          <span className="numar-mare">{lei(r.totaluri.tintaLeiCuTva)}</span>
        </div>
        <div>
          <span className="text-secundar mic">Marja rămasă (lei)</span>
          <span className="numar-mare">{lei(r.totaluri.marjaLei)}</span>
        </div>
        <div>
          <span className="text-secundar mic">Adaos real</span>
          <span className="numar-mare">{r.totaluri.adaosRealPct} %</span>
        </div>
      </div>

      <h3>Totalurile documentului</h3>
      <div className="grila-totaluri">
        {mod === "LISTA_DISCOUNT_GENERAL" && r.totaluri.totalListaFaraTvaEur && (
          <div>
            <span className="text-secundar mic">Total listă · discount</span>
            <span className="numar-mare">{lei(r.totaluri.totalListaFaraTvaEur)} EUR</span>
            <span className="mic text-secundar">− {lei(r.totaluri.discountGeneralEur)} EUR ({oferta.discountGeneralPct} %)</span>
          </div>
        )}
        <div>
          <span className="text-secundar mic">Fără TVA</span>
          <span className="numar-mare">{lei(r.totaluri.documentFaraTvaEur)} EUR</span>
        </div>
        <div>
          <span className="text-secundar mic">TVA {oferta.tvaPct} %</span>
          <span className="numar-mare">{lei(r.totaluri.tvaEur)} EUR</span>
        </div>
        <div>
          <span className="text-secundar mic">Cu TVA</span>
          <span className="numar-mare">{lei(r.totaluri.documentCuTvaEur)} EUR</span>
        </div>
        <div>
          <span className="text-secundar mic">Total în lei</span>
          <span className="numar-mare">{lei(r.totaluri.documentTotalLei)} lei</span>
        </div>
      </div>
      {r.abatereEur !== "0.00" && <Mesaj tip="avertizare">Ținta nu se poate atinge exact: abatere {r.abatereEur} EUR (restul de rotunjire nu încape pe liniile la bucată); totalul în lei e cel calculat din linii.</Mesaj>}
      {r.zonaB && <p className="mic text-secundar">Zona B: supliment {lei(r.zonaB.suplimentTotalLei)} lei · tabelul de facturare {lei(r.zonaB.tabelFacturare.totalLei)} lei.</p>}
      {r.lucrare && (
        <p className="mic text-secundar">
          Lucrarea (oferta inițială + completările): vânzare {lei(r.lucrare.pretVanzareLei)} · cost {lei(r.lucrare.costAchizitieLei)} · adaos net {lei(r.lucrare.adaosNetLei)} · brut {lei(r.lucrare.adaosBrutLei)} lei.
        </p>
      )}

      <Ajutor>
        <ul>
          <li>Achiziția contului e în lei cu TVA, la cursul de achiziție (BNR + 1 %); grupa din zona produselor intră în ea. Ținta se dă fie ca adaos %, fie ca totalul cu TVA discutat cu clientul; marja și adaosul real se calculează în lei.</li>
          <li>Prețul fix pe linie (butonul „fix”) se dă în lei sau EUR, cu sau fără TVA, ori ca „achiziție + x %”; se normalizează în EUR fără TVA și linia iese din calcul; restul liniilor absorb diferența.</li>
          <li>Garda: nicio linie sub achiziția reală (fără grupă). O schimbare care ar duce o linie sub achiziție nu se salvează; liniile apar colorate. Excepția: completarea marcată.</li>
          <li>„Preia prețuri din oferta…”: produsele comune primesc prețul sursei, cele noi adaosul rubricii lor din sursă; câmpul de țintă dispare până la „Renunță la preluare”.</li>
        </ul>
      </Ajutor>
    </section>
  );
}

function RandLinie({
  l,
  mod,
  vinovata,
  poate,
  exceptie,
  setExceptie,
  salveazaExceptie,
  fixDeschis,
  deschideFix,
  fix,
  setFix,
  fixeaza,
  scoateFix,
}: {
  l: LiniePret;
  mod: string;
  vinovata: boolean;
  poate: boolean;
  exceptie: string;
  setExceptie: (v: string) => void;
  salveazaExceptie: () => void;
  fixDeschis: boolean;
  deschideFix: () => void;
  fix: { tip: TipPretFixIntrare; valoare: string };
  setFix: (f: { tip: TipPretFixIntrare; valoare: string }) => void;
  fixeaza: () => void;
  scoateFix: () => void;
}) {
  const coloane = 5 + (mod === "LISTA_DISCOUNT_GENERAL" ? 1 : 0) + (mod === "DISCOUNT_PER_LINIE" ? 2 : 0);
  return (
    <>
      <tr className={vinovata || l.subAchizitie ? "sub-achizitie" : undefined}>
        <td>
          <span className={l.pretFix ? (l.pretFixPreluat ? "pret-fix pret-preluat" : "pret-fix") : undefined} title={l.pretFix ? (l.pretFixPreluat ? "preț preluat din altă ofertă" : "preț fix") : undefined}>
            {l.denumire}
          </span>
          <span className="mic text-secundar"> · {l.rubrica}</span>
        </td>
        <td>
          {l.cantitate} {l.um}
        </td>
        <td>{lei(l.achizitieContLeiCuTva)}</td>
        {mod === "LISTA_DISCOUNT_GENERAL" && <td>{lei(l.pretListaEur)}</td>}
        {mod === "DISCOUNT_PER_LINIE" && <td>{lei(l.pretListaEur)}</td>}
        {mod === "DISCOUNT_PER_LINIE" && (
          <td>
            {l.pretFix ? (
              <span className="text-secundar">{l.discountPct ?? "0"}</span>
            ) : (
              <input type="text" inputMode="decimal" value={exceptie} placeholder={l.discountPct ?? ""} onChange={(e) => setExceptie(e.target.value)} onBlur={salveazaExceptie} disabled={!poate} style={{ width: 60 }} aria-label="Discount pe linie" />
            )}
          </td>
        )}
        <td>{lei(mod === "LISTA_DISCOUNT_GENERAL" ? l.pretListaEur : (l.pretNetEur ?? l.pretDocumentEur))}</td>
        <td>{lei(l.valoareEur)}</td>
        <td>
          {poate && (
            <button className="buton secundar mic" type="button" onClick={deschideFix} aria-label={`Preț fix pentru ${l.denumire}`}>
              {l.pretFix ? "fix ✎" : "fix"}
            </button>
          )}
        </td>
      </tr>
      {fixDeschis && (
        <tr>
          <td colSpan={coloane}>
            <div className="actiuni" style={{ justifyContent: "flex-start" }}>
              <select value={fix.tip} onChange={(e) => setFix({ ...fix, tip: e.target.value as TipPretFixIntrare })} aria-label="Felul prețului fix">
                {TIPURI_FIX.map((t) => (
                  <option key={t.tip} value={t.tip}>
                    {t.eticheta}
                  </option>
                ))}
              </select>
              <input type="text" inputMode="decimal" value={fix.valoare} onChange={(e) => setFix({ ...fix, valoare: e.target.value })} onKeyDown={(e) => e.key === "Enter" && fixeaza()} style={{ width: 110 }} aria-label="Valoarea prețului fix" />
              <button className="buton mic" type="button" onClick={fixeaza} disabled={!fix.valoare.trim()}>
                Fixează
              </button>
              {l.pretFix && (
                <button className="buton secundar mic" type="button" onClick={scoateFix}>
                  Scoate fixul
                </button>
              )}
              <span className="mic text-secundar">achiziția reală la cursul documentului: {lei(l.achizitieRealaDocEur)} EUR</span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
