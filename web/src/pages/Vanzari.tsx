import { useEffect, useState, type FormEvent } from "react";
import { apiComenzi, apiVanzari, dataRo, type ContScurt, type FiltreVanzari, type RandVanzari, type StatisticiVanzari } from "../api";
import { Ajutor, Camp, Mesaj, textEroare } from "../components/ui";
import { useUtilizator } from "../contextUtilizator";
import { ETICHETA_ROL } from "./ContulMeu";

// Tabelul de vanzari (S21; FISA-OFERTARE cap. 19, FISA-COMENZI cap. 7): ecran de lucru
// alimentat automat din comenzi - coloanele in ordinea lui Ionut, lucrarile una sub alta cu
// adaosul pe lucrare, comisionul agentului scris de Administrator cu "achitat", filtrele
// (incasat / neincasat traversand lunile; luna / an / interval; agent, mai multi agenti),
// statisticile pe selectie. Agentul vede propriul tabel, fara statistici, fara sa scrie.

type Perioada = "luna" | "an" | "interval";

const lei = (s: string | null | undefined) => (s === null || s === undefined ? "—" : Number(s).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

function perioadaInDate(p: Perioada, deLa: string, panaLa: string): { deLa?: string; panaLa?: string } {
  const azi = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (p === "luna") return {};
  if (p === "an") return { deLa: `${azi.getFullYear()}-01-01`, panaLa: iso(azi) };
  return { ...(deLa ? { deLa } : {}), ...(panaLa ? { panaLa } : {}) };
}

export function Vanzari() {
  const eu = useUtilizator();
  const administrator = eu.rol === "ADMINISTRATOR";
  const adminGeneral = eu.rol === "ADMIN_GENERAL";
  const alegeAgenti = administrator || adminGeneral;

  const [perioada, setPerioada] = useState<Perioada>("luna");
  const [deLa, setDeLa] = useState("");
  const [panaLa, setPanaLa] = useState("");
  const [incasare, setIncasare] = useState<"" | "incasat" | "neincasat">("");
  const [agenti, setAgenti] = useState<Set<string>>(new Set());
  const [firmaId, setFirmaId] = useState("");
  const [conturi, setConturi] = useState<(ContScurt & { firmaId: string | null })[]>([]);
  const [firme, setFirme] = useState<{ id: string; denumire: string }[]>([]);
  const [randuri, setRanduri] = useState<RandVanzari[] | null>(null);
  const [statistici, setStatistici] = useState<StatisticiVanzari | null>(null);
  const [poateScrie, setPoateScrie] = useState(false);
  const [eroare, setEroare] = useState<string | null>(null);
  const [versiune, setVersiune] = useState(0);

  useEffect(() => {
    if (alegeAgenti) apiComenzi.conturi().then((r) => setConturi(r.conturi)).catch(() => setConturi([]));
    if (adminGeneral) apiComenzi.firme().then((r) => setFirme(r.firme)).catch(() => setFirme([]));
  }, [alegeAgenti, adminGeneral]);

  useEffect(() => {
    const f: FiltreVanzari = { ...perioadaInDate(perioada, deLa, panaLa), incasare: incasare || undefined };
    if (agenti.size > 0) f.agent = [...agenti].join(",");
    if (adminGeneral && firmaId) f.firmaId = firmaId;
    apiVanzari
      .lista(f)
      .then((r) => {
        setRanduri(r.randuri);
        setStatistici(r.statistici);
        setPoateScrie(r.poateScrie);
        setEroare(null);
      })
      .catch((e) => setEroare(textEroare(e)));
  }, [perioada, deLa, panaLa, incasare, agenti, firmaId, adminGeneral, versiune]);

  const reincarca = () => setVersiune((v) => v + 1);
  const comutaAgent = (id: string) =>
    setAgenti((s) => {
      const nou = new Set(s);
      if (nou.has(id)) nou.delete(id);
      else nou.add(id);
      return nou;
    });
  const conturiFirmei = firmaId ? conturi.filter((c) => c.firmaId === firmaId) : conturi;

  return (
    <>
      <div className="antet-pagina">
        <div>
          <h1 style={{ marginBottom: 4 }}>Vânzări</h1>
          <span className="text-secundar">{administrator ? "tabelele agenților și colaboratorilor firmei; aici scrii comisioanele și bifezi „achitat”" : adminGeneral ? "toate firmele, în citire" : "tabelul tău, în citire"}</span>
        </div>
      </div>

      <div className="rand-campuri" style={{ marginBottom: 12 }}>
        <Camp eticheta="Încasare">
          <select value={incasare} onChange={(e) => setIncasare(e.target.value as typeof incasare)}>
            <option value="">toate (în perioadă)</option>
            <option value="neincasat">neîncasate — din toate lunile</option>
            <option value="incasat">încasate — din toate lunile</option>
          </select>
        </Camp>
        <Camp eticheta="Perioadă">
          <select value={perioada} onChange={(e) => setPerioada(e.target.value as Perioada)} disabled={incasare !== ""}>
            <option value="luna">Luna aceasta</option>
            <option value="an">Anul acesta</option>
            <option value="interval">Interval</option>
          </select>
        </Camp>
        {perioada === "interval" && incasare === "" && (
          <>
            <Camp eticheta="De la">
              <input type="date" value={deLa} onChange={(e) => setDeLa(e.target.value)} />
            </Camp>
            <Camp eticheta="Până la">
              <input type="date" value={panaLa} onChange={(e) => setPanaLa(e.target.value)} />
            </Camp>
          </>
        )}
        {adminGeneral && firme.length > 1 && (
          <Camp eticheta="Firma">
            <select value={firmaId} onChange={(e) => setFirmaId(e.target.value)}>
              <option value="">toate firmele</option>
              {firme.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.denumire}
                </option>
              ))}
            </select>
          </Camp>
        )}
      </div>
      {alegeAgenti && conturiFirmei.length > 0 && (
        <div className="filtre-status" role="group" aria-label="Agenți">
          <button className={agenti.size === 0 ? "activ" : undefined} onClick={() => setAgenti(new Set())}>
            Toți
          </button>
          {conturiFirmei.map((c) => (
            <button key={c.id} className={agenti.has(c.id) ? "activ" : undefined} onClick={() => comutaAgent(c.id)} title={ETICHETA_ROL[c.rol] ?? c.rol}>
              {c.nume}
            </button>
          ))}
        </div>
      )}

      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}

      {statistici && (
        <div className="statistici-vanzari">
          <div>
            <span className="mic text-secundar">Total cost achiziție</span>
            <strong>{lei(statistici.costAchizitieLei)} lei</strong>
          </div>
          <div>
            <span className="mic text-secundar">Total preț vânzare</span>
            <strong>{lei(statistici.pretVanzareLei)} lei</strong>
          </div>
          <div>
            <span className="mic text-secundar">Total adaos net</span>
            <strong>{lei(statistici.adaosNetLei)} lei</strong>
          </div>
          <div>
            <span className="mic text-secundar">Total adaos brut</span>
            <strong>{lei(statistici.adaosBrutLei)} lei</strong>
          </div>
          <div>
            <span className="mic text-secundar">Total comisioane</span>
            <strong>{lei(statistici.comisioaneLei)} lei</strong>
          </div>
          <div>
            <span className="mic text-secundar">Procent de adaos</span>
            <strong>{statistici.procentAdaos ? `${statistici.procentAdaos} %` : "—"}</strong>
          </div>
          <div>
            <span className="mic text-secundar">Comenzi în selecție</span>
            <strong>
              {statistici.comenzi}
              {statistici.faraSume > 0 ? ` (${statistici.faraSume} fără sume)` : ""}
            </strong>
          </div>
        </div>
      )}

      {randuri && randuri.length === 0 && <Mesaj>Nicio vânzare pentru filtrele alese.</Mesaj>}
      {randuri && randuri.length > 0 && (
        <div className="tabel-invelis">
          <table className="tabel tabel-vanzari">
            <thead>
              <tr>
                <th>Data</th>
                <th>Client</th>
                <th className="col-optional">Localitate</th>
                <th className="dreapta">Cost achiziție</th>
                <th className="dreapta">Preț vânzare</th>
                <th className="col-optional">Sursa recomandării</th>
                <th className="dreapta col-optional">Comision recomandare</th>
                <th className="col-optional">achitat</th>
                <th className="dreapta">Adaos net</th>
                <th className="dreapta col-optional">Adaos brut</th>
                <th className="dreapta">Comision agent</th>
                <th>achitat</th>
              </tr>
            </thead>
            <tbody>
              {randuri.map((r) => (
                <RandGrup key={r.comandaId} rand={r} poateScrie={poateScrie} alegeAgenti={alegeAgenti} onSchimbat={reincarca} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Ajutor>
        <ul>
          <li>Cifrele vin din rezultatul salvat la „Comandat” (fără recalcul): preț vânzare = materialele în lei, fără zona B; cost = achiziția reală cu TVA, fără grupă; adaos net = diferența; adaos brut = net ÷ 1,21. Vânzarea către un colaborator apare în tabelul Administratorului lui (vânzare = achiziția colaboratorului, cost = baza).</li>
          <li>Lucrările: completările apar sub comanda ofertei inițiale, iar adaosul lucrării e calculat din sumele tuturor comenzilor legate. Comenzile manuale intră „fără sume” până le completează Administratorul (cost și vânzare), și nu intră în totaluri până atunci.</li>
          <li>Filtrul încasat / neîncasat arată toate vânzările cu statusul ales, din toate lunile — ca Administratorul să completeze comisionul exact la lucrările încasate. Procentul de adaos = adaos net ÷ cost achiziție.</li>
          <li>Comisionul agentului îl scrie Administratorul, cu istoric (asteriscul roșu arată că a fost modificat); bifele „achitat” (agent, recomandare) le pune doar Administratorul firmei. Comisionul recomandării e cel de pe comandă.</li>
        </ul>
      </Ajutor>
    </>
  );
}

function RandGrup({ rand, poateScrie, alegeAgenti, onSchimbat }: { rand: RandVanzari; poateScrie: boolean; alegeAgenti: boolean; onSchimbat: () => void }) {
  return (
    <>
      <RandTr r={rand} poateScrie={poateScrie} alegeAgenti={alegeAgenti} onSchimbat={onSchimbat} />
      {rand.copii.map((k) => (
        <RandTr key={k.comandaId} r={k} poateScrie={poateScrie} alegeAgenti={alegeAgenti} onSchimbat={onSchimbat} completare />
      ))}
      {rand.lucrare && (
        <tr className="rand-lucrare">
          <td colSpan={3} className="mic text-secundar">
            Lucrarea {rand.numarComplet} ({rand.lucrare.comenzi} comenzi): adaosul pe lucrare
          </td>
          <td className="dreapta">{lei(rand.lucrare.costAchizitieLei)}</td>
          <td className="dreapta">{lei(rand.lucrare.pretVanzareLei)}</td>
          <td className="col-optional" colSpan={3}></td>
          <td className="dreapta">
            <strong>{lei(rand.lucrare.adaosNetLei)}</strong>
          </td>
          <td className="dreapta col-optional">
            <strong>{lei(rand.lucrare.adaosBrutLei)}</strong>
          </td>
          <td colSpan={2}></td>
        </tr>
      )}
    </>
  );
}

function RandTr({ r, poateScrie, alegeAgenti, onSchimbat, completare }: { r: RandVanzari; poateScrie: boolean; alegeAgenti: boolean; onSchimbat: () => void; completare?: boolean }) {
  const [edit, setEdit] = useState(false);
  const [suma, setSuma] = useState(r.comisionAgent?.lei ?? "");
  const [mentiuni, setMentiuni] = useState("");
  const [editSume, setEditSume] = useState(false);
  const [pret, setPret] = useState("");
  const [cost, setCost] = useState("");
  const [eroare, setEroare] = useState<string | null>(null);
  const ruleaza = (f: () => Promise<unknown>) =>
    f()
      .then(() => {
        setEroare(null);
        setEdit(false);
        setEditSume(false);
        onSchimbat();
      })
      .catch((e) => setEroare(textEroare(e)));
  return (
    <tr className={completare ? "completare" : undefined}>
      <td>
        {completare ? "↳ " : ""}
        {dataRo(r.data)}
        <div className="mic text-secundar">
          {r.numarComplet}
          {r.manuala && <span className="eticheta-manuala">manuală</span>}
          {completare && r.completareLa ? ` · completare la ${r.completareLa.numarComplet}` : ""}
        </div>
        {alegeAgenti && r.agent && (
          <div className="mic text-secundar">
            {r.agent.nume}
            {r.tabel === "administrator" ? " (colaborator → tabelul Administratorului)" : ""}
          </div>
        )}
        {eroare && <div className="mic" style={{ color: "var(--eroare-text, #a12a2a)" }}>{eroare}</div>}
      </td>
      <td>
        <strong>{r.client.nume}</strong>
        {r.faraSume && (
          <div className="mic">
            <span className="eticheta-neidentificata">fără sume</span>
            {poateScrie && r.agent && !editSume && (
              <button className="buton secundar mic" style={{ marginLeft: 6 }} onClick={() => setEditSume(true)}>
                Completează sumele
              </button>
            )}
            {editSume && (
              <form
                className="formular-mic"
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  void ruleaza(() => apiVanzari.sumeVanzare(r.comandaId, pret.trim(), cost.trim(), null));
                }}
              >
                <input value={cost} onChange={(e) => setCost(e.target.value)} placeholder="cost achiziție (lei)" inputMode="decimal" style={{ minWidth: 140 }} />
                <input value={pret} onChange={(e) => setPret(e.target.value)} placeholder="preț vânzare (lei)" inputMode="decimal" style={{ minWidth: 140 }} />
                <button className="buton mic" disabled={!pret.trim() || !cost.trim()}>
                  Salvează
                </button>
                <button type="button" className="buton secundar mic" onClick={() => setEditSume(false)}>
                  Renunță
                </button>
              </form>
            )}
            {!r.agent && <span className="mic text-secundar"> — neidentificată: întâi se alocă unui cont</span>}
          </div>
        )}
        <div className="mic">
          <span className={`status-incasare ${r.incasare.status}`}>{r.incasare.eticheta}</span>
        </div>
      </td>
      <td className="col-optional">{r.client.localitate ?? "—"}</td>
      <td className="dreapta">{lei(r.costAchizitieLei)}</td>
      <td className="dreapta">{lei(r.pretVanzareLei)}</td>
      <td className="col-optional">{r.sursaRecomandarii ?? "—"}</td>
      <td className="dreapta col-optional">{r.comisionRecomandare ? lei(r.comisionRecomandare.lei) : "—"}</td>
      <td className="col-optional">
        {r.comisionRecomandare && Number(r.comisionRecomandare.lei) > 0 ? (
          poateScrie ? (
            <input type="checkbox" checked={r.comisionRecomandare.achitat} onChange={(e) => void ruleaza(() => apiComenzi.comisionAchitat(r.comandaId, e.target.checked))} aria-label="comision recomandare achitat" />
          ) : (
            <span className="mic">{r.comisionRecomandare.achitat ? "achitat" : "neachitat"}</span>
          )
        ) : (
          "—"
        )}
      </td>
      <td className="dreapta">{lei(r.adaosNetLei)}</td>
      <td className="dreapta col-optional">{lei(r.adaosBrutLei)}</td>
      <td className="dreapta">
        {!edit && (
          <>
            {r.comisionAgent ? lei(r.comisionAgent.lei) : "—"}
            {r.comisionAgentModificat && (
              <span className="asterisc" title="modificat — vezi istoricul comenzii">
                *
              </span>
            )}
            {poateScrie && (
              <button className="buton secundar mic" style={{ marginLeft: 6 }} onClick={() => setEdit(true)} aria-label="scrie comisionul agentului">
                ✎
              </button>
            )}
          </>
        )}
        {edit && (
          <form
            className="formular-mic"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              void ruleaza(() => apiVanzari.comisionAgent(r.comandaId, suma.trim() === "" ? null : suma.trim(), mentiuni.trim() || null));
            }}
          >
            <input value={suma} onChange={(e) => setSuma(e.target.value)} inputMode="decimal" placeholder="lei" style={{ minWidth: 90 }} aria-label="Comision agent (lei)" />
            <input value={mentiuni} onChange={(e) => setMentiuni(e.target.value)} placeholder="mențiuni" style={{ minWidth: 120 }} />
            <button className="buton mic">Salvează</button>
            <button type="button" className="buton secundar mic" onClick={() => setEdit(false)}>
              Renunță
            </button>
          </form>
        )}
      </td>
      <td>
        {r.comisionAgent && Number(r.comisionAgent.lei) > 0 ? (
          poateScrie ? (
            <input type="checkbox" checked={r.comisionAgent.achitat} onChange={(e) => void ruleaza(() => apiVanzari.comisionAgentAchitat(r.comandaId, e.target.checked))} aria-label="comision agent achitat" title={r.comisionAgent.achitatDe ? `${r.comisionAgent.achitatDe}, ${dataRo(r.comisionAgent.achitatLa)}` : undefined} />
          ) : (
            <span className="mic">{r.comisionAgent.achitat ? "achitat" : "neachitat"}</span>
          )
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}
