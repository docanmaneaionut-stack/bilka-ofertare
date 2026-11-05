import { useEffect, useState, type FormEvent } from "react";
import {
  apiComenzi,
  dataRo,
  ETICHETA_STATUS_LOGISTIC,
  momentRelativ,
  STATUSURI_LOGISTICE,
  type ComandaDetaliu,
  type ComandaManualaNoua,
  type ContScurt,
  type FiltreComenzi,
  type ListaComenzi,
  type RandComanda,
  type StatusLogistic,
} from "../api";
import { Ajutor, Camp, Mesaj, textEroare } from "../components/ui";
import { useUtilizator } from "../contextUtilizator";
import { ETICHETA_ROL } from "./ContulMeu";

// Tabelul de comenzi (S19; FISA-COMENZI cap. 1, 3, 4b, 6; macheta docs/design/ecran-tabel-comenzi):
// capul cu numaratorile, cautarea intr-o casuta, casuta de selectie pe rand (fisa
// soferului, S23), "+ Comanda manuala", filtrele, coloanele din fisa, randul desfasurat
// cu cele patru casete (Incasari - S20 -, Livrare si facturare, Statusuri, Observatii),
// ordinea (invers cronologic; Livrat la sfarsit, ascuns implicit), varianta pe telefon.

type Perioada = "90" | "luna" | "an" | "interval";

function perioadaInDate(p: Perioada, deLa: string, panaLa: string): { deLa?: string; panaLa?: string } {
  const azi = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (p === "90") return {};
  if (p === "luna") return { deLa: iso(new Date(azi.getFullYear(), azi.getMonth(), 1)), panaLa: iso(azi) };
  if (p === "an") return { deLa: `${azi.getFullYear()}-01-01`, panaLa: iso(azi) };
  return { ...(deLa ? { deLa } : {}), ...(panaLa ? { panaLa } : {}) };
}

const lei = (s: string) => `${Number(s).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei`;
const euro = (s: string) => `${Number(s).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const dataOra = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");

export function Comenzi() {
  const eu = useUtilizator();
  const adminGeneral = eu.rol === "ADMIN_GENERAL";
  const administrator = eu.rol === "ADMINISTRATOR";
  const gestiune = eu.rol === "GESTIUNE";
  const vedeAgent = adminGeneral || administrator;
  const vedeFirma = adminGeneral || administrator || gestiune || eu.rol === "CONTABILITATE";
  const adaugaManuala = adminGeneral || administrator || gestiune;

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusLogistic | "">("");
  const [perioada, setPerioada] = useState<Perioada>("90");
  const [deLa, setDeLa] = useState("");
  const [panaLa, setPanaLa] = useState("");
  const [agent, setAgent] = useState("");
  const [firmaId, setFirmaId] = useState("");
  const [inchise, setInchise] = useState(false);
  const [page, setPage] = useState(1);
  const [conturi, setConturi] = useState<(ContScurt & { firmaId: string | null })[]>([]);
  const [firme, setFirme] = useState<{ id: string; denumire: string }[]>([]);
  const [rezultat, setRezultat] = useState<ListaComenzi | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [deschisa, setDeschisa] = useState<string | null>(null);
  const [selectate, setSelectate] = useState<Set<string>>(new Set());
  const [formularManual, setFormularManual] = useState(false);
  const [versiune, setVersiune] = useState(0);

  useEffect(() => {
    if (vedeAgent) apiComenzi.conturi().then((r) => setConturi(r.conturi)).catch(() => setConturi([]));
    if (vedeFirma) apiComenzi.firme().then((r) => setFirme(r.firme)).catch(() => setFirme([]));
  }, [vedeAgent, vedeFirma]);

  useEffect(() => {
    const filtre: FiltreComenzi = { q: q.trim() || undefined, status: status || undefined, ...perioadaInDate(perioada, deLa, panaLa), inchise, page, pageSize: 25 };
    if (vedeAgent && agent) filtre.agent = agent;
    if (vedeFirma && firmaId) filtre.firmaId = firmaId;
    const t = setTimeout(() => {
      apiComenzi
        .lista(filtre)
        .then((r) => {
          setRezultat(r);
          setEroare(null);
        })
        .catch((e) => setEroare(textEroare(e)));
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q, status, perioada, deLa, panaLa, agent, firmaId, inchise, page, vedeAgent, vedeFirma, versiune]);

  const n = rezultat?.numaratori;
  const totalPagini = rezultat ? Math.max(1, Math.ceil(rezultat.total / rezultat.pageSize)) : 1;
  const reincarca = () => setVersiune((v) => v + 1);
  const comutaSelectie = (id: string) =>
    setSelectate((s) => {
      const nou = new Set(s);
      if (nou.has(id)) nou.delete(id);
      else nou.add(id);
      return nou;
    });

  return (
    <>
      <div className="antet-pagina">
        <div>
          <h1 style={{ marginBottom: 4 }}>Comenzi</h1>
          {n && (
            <span className="text-secundar">
              {n.active} active · {n.deReceptionat} de recepționat · {n.neincasate} neîncasate complet · {n.comisioaneNeachitate} comisioane neachitate · {n.neidentificate} neidentificat{n.neidentificate === 1 ? "ă" : "e"}
            </span>
          )}
        </div>
        <div className="actiuni" style={{ flexWrap: "wrap" }}>
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Caută după client, telefon, număr comandă, localitate, montator…"
            aria-label="Caută"
            style={{ minWidth: 320 }}
          />
          <button className="buton secundar" disabled title="Fișa șoferului vine la S23">
            🚚 Fișa șoferului{selectate.size > 0 ? ` (${selectate.size})` : ""}
          </button>
          {adaugaManuala && (
            <button className="buton" onClick={() => setFormularManual(true)}>
              + Comandă manuală
            </button>
          )}
        </div>
      </div>

      <div className="filtre-status" role="group" aria-label="Status logistic">
        <button className={status === "" ? "activ" : undefined} onClick={() => setStatus("")}>
          Toate
        </button>
        {STATUSURI_LOGISTICE.map((s) => (
          <button
            key={s}
            className={status === s ? "activ" : undefined}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
          >
            {ETICHETA_STATUS_LOGISTIC[s]}
          </button>
        ))}
      </div>

      <div className="rand-campuri" style={{ marginBottom: 20 }}>
        <Camp eticheta="Încasare">
          <select disabled title="Încasările vin la S20">
            <option>toate</option>
          </select>
        </Camp>
        <Camp eticheta="Perioadă">
          <select value={perioada} onChange={(e) => setPerioada(e.target.value as Perioada)}>
            <option value="90">Ultimele 90 de zile</option>
            <option value="luna">Luna aceasta</option>
            <option value="an">Anul acesta</option>
            <option value="interval">Interval</option>
          </select>
        </Camp>
        {perioada === "interval" && (
          <>
            <Camp eticheta="De la">
              <input type="date" value={deLa} onChange={(e) => setDeLa(e.target.value)} />
            </Camp>
            <Camp eticheta="Până la">
              <input type="date" value={panaLa} onChange={(e) => setPanaLa(e.target.value)} />
            </Camp>
          </>
        )}
        {vedeAgent && (
          <Camp eticheta="Agent">
            <select value={agent} onChange={(e) => setAgent(e.target.value)}>
              <option value="">toți</option>
              <option value="neidentificate">neidentificate</option>
              {conturi.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nume} ({ETICHETA_ROL[c.rol] ?? c.rol})
                </option>
              ))}
            </select>
          </Camp>
        )}
        {vedeFirma && firme.length > 1 && (
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
        <label className="camp-bifa">
          <input type="checkbox" checked={inchise} onChange={(e) => setInchise(e.target.checked)} />
          <span>Arată și comenzile închise (livrate)</span>
        </label>
      </div>

      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      {rezultat && rezultat.total === 0 && <Mesaj>Nicio comandă pentru filtrele alese.</Mesaj>}

      {rezultat && rezultat.total > 0 && (
        <>
          <div className="tabel-invelis">
            <table className="tabel tabel-comenzi">
              <thead>
                <tr>
                  <th className="col-optional"></th>
                  <th>Nr. · responsabil</th>
                  <th>Client</th>
                  <th>Rezumat comandă</th>
                  <th className="col-optional">Montator</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th className="col-optional">Încasat</th>
                  <th>Status</th>
                  <th className="col-optional">Livrare</th>
                  <th className="col-optional"></th>
                </tr>
              </thead>
              <tbody>
                {rezultat.comenzi.map((c) => (
                  <RandComandaTr key={c.id} comanda={c} vedeAgent={vedeAgent} deschisa={deschisa === c.id} selectata={selectate.has(c.id)} onSelecteaza={() => comutaSelectie(c.id)} onComuta={() => setDeschisa(deschisa === c.id ? null : c.id)} onSchimbat={reincarca} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="paginare">
            <button className="buton secundar mic" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              ← Anterioara
            </button>
            <span>
              Pagina {page} din {totalPagini} · {rezultat.total} comenzi
            </span>
            <button className="buton secundar mic" disabled={page >= totalPagini} onClick={() => setPage(page + 1)}>
              Următoarea →
            </button>
          </div>
        </>
      )}

      <Ajutor>
        <ul>
          <li>Ordinea: după data intrării în tabel, cele mai noi sus; comenzile livrate trec la sfârșitul listei și sunt ascunse până bifezi „Arată și comenzile închise” (la S20: livrate și încasate).</li>
          <li>„Deschide ▾” desfășoară rândul: livrarea și facturarea, statusurile cu istoric, observațiile cu istoric și atașamentele, documentele ofertei (formularele Bilka, detaliata, tabelul de facturare). Încasările și comisioanele vin la S20, fișa șoferului la S23.</li>
          <li>Responsabilul e contul care a trimis comanda la furnizor; comenzile manuale (seria CM) arată „adăugat de … pentru: …” sau „neidentificată” până se află a cui e — alocarea o schimbă doar Administratorii.</li>
          <li>Statusul logistic, livrarea și nota lipsurilor le schimbă orice Administrator și Gestiunea; agentul modifică doar detaliile comenzilor lui (contacte, observații, livrarea); Contabilitatea doar vede și deschide documentele.</li>
        </ul>
      </Ajutor>

      {formularManual && (
        <FormularComandaManuala
          firme={firme}
          conturi={conturi}
          onInchide={() => setFormularManual(false)}
          onCreata={() => {
            setFormularManual(false);
            reincarca();
          }}
        />
      )}
    </>
  );
}

function Responsabil({ c }: { c: RandComanda }) {
  if (!c.manuala) {
    return (
      <div className="mic text-secundar">
        trimisă de <strong>{c.responsabil.nume}</strong>
        {c.responsabil.rol !== "AGENT" && c.responsabil.rol !== "ADMINISTRATOR" ? ` (${ETICHETA_ROL[c.responsabil.rol] ?? c.responsabil.rol})` : ""}
      </div>
    );
  }
  return (
    <div className="mic text-secundar">
      adăugat de <strong>{c.responsabil.nume}</strong> pentru: {c.contAlocat ? <strong>{c.contAlocat.nume}</strong> : <span className="eticheta-neidentificata">neidentificată</span>}
      {c.contAlocat && c.contAlocat.rol === "COLABORATOR" ? " (colaborator)" : ""}
    </div>
  );
}

function RandComandaTr({ comanda: c, vedeAgent, deschisa, selectata, onSelecteaza, onComuta, onSchimbat }: { comanda: RandComanda; vedeAgent: boolean; deschisa: boolean; selectata: boolean; onSelecteaza: () => void; onComuta: () => void; onSchimbat: () => void }) {
  void vedeAgent;
  return (
    <>
      <tr className={`selectabil ${deschisa ? "deschisa" : ""}`}>
        <td className="col-optional" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={selectata} onChange={onSelecteaza} aria-label={`selectează ${c.numarComplet}`} />
        </td>
        <td className="numar-oferta" onClick={onComuta}>
          {c.numarComplet}
          {c.manuala && <span className="eticheta-manuala">manuală</span>}
          <div className="mic text-secundar" style={{ fontWeight: 400 }}>
            {dataRo(c.data)}
          </div>
          <Responsabil c={c} />
        </td>
        <td onClick={onComuta}>
          <strong>{c.client.nume}</strong>
          <div className="mic text-secundar">
            {c.completareLa ? `completare la ${c.completareLa.numarComplet}` : c.client.localitate}
            {c.client.localitate && c.completareLa ? ` · ${c.client.localitate}` : ""}
          </div>
          <div className="mic text-secundar">{c.client.telefon}</div>
        </td>
        <td className="rezumat-comanda" onClick={onComuta}>
          {c.rezumat}
        </td>
        <td className="col-optional" onClick={onComuta}>
          {c.montator ? (
            <>
              <strong>{c.montator.nume}</strong>
              <div className="mic text-secundar">{c.montator.telefon ?? ""}</div>
            </>
          ) : (
            <span className="text-secundar">—</span>
          )}
        </td>
        <td className="total-oferta" onClick={onComuta}>
          <span className="numar-mare">{lei(c.totalLei)}</span>
          <div className="mic text-secundar">{euro(c.totalCuTvaEur)}</div>
        </td>
        <td className="col-optional" onClick={onComuta}>
          <strong>{lei(c.avansLei)}</strong>
          <div className="mic text-secundar">rest {lei(c.restLei)}</div>
          <div className="mic text-secundar">(încasările: S20)</div>
        </td>
        <td onClick={onComuta}>
          <span className={`status-logistic ${c.statusLogistic}`}>
            {c.statusLogisticEticheta}
            {c.statusLogistic === "RECEPTIONAT_PARTIAL" && <span className="asterisc">*</span>}
          </span>
          {c.statusLogistic === "RECEPTIONAT_PARTIAL" && c.notaLipsuri && <div className="mic text-secundar">lipsă: {c.notaLipsuri}</div>}
        </td>
        <td className="col-optional mic" onClick={onComuta}>
          {c.statusLogistic === "LIVRAT" ? `livrat ${dataRo(c.livratLa)}` : c.livrare.indicatii ? c.livrare.indicatii : <span className="text-secundar">de programat</span>}
          {c.livrare.data && c.statusLogistic !== "LIVRAT" && <div className="text-secundar">ziua: {dataRo(c.livrare.data)}</div>}
        </td>
        <td className="col-optional" onClick={(e) => e.stopPropagation()}>
          <div className="actiuni" style={{ gap: 6 }}>
            <button className="buton secundar mic" onClick={onComuta}>
              {deschisa ? "Închide ▴" : "Deschide ▾"}
            </button>
            <button className="buton secundar mic" onClick={onComuta} title="documentele comenzii, în rândul desfășurat">
              Doc. ▾
            </button>
          </div>
        </td>
      </tr>
      {deschisa && (
        <tr className="detaliu-comanda">
          <td colSpan={10}>
            <DetaliuComanda id={c.id} onSchimbat={onSchimbat} />
          </td>
        </tr>
      )}
    </>
  );
}

// ------------------------------------------------------------------ randul desfasurat

const URMATOARELE: Record<StatusLogistic, StatusLogistic[]> = { COMANDAT: ["RECEPTIONAT", "RECEPTIONAT_PARTIAL"], RECEPTIONAT_PARTIAL: ["RECEPTIONAT", "LIVRAT"], RECEPTIONAT: ["LIVRAT"], LIVRAT: [] };

function DetaliuComanda({ id, onSchimbat }: { id: string; onSchimbat: () => void }) {
  const [c, setC] = useState<ComandaDetaliu | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [ocupat, setOcupat] = useState(false);
  // formularele din casete
  const [statusNou, setStatusNou] = useState<StatusLogistic | "">("");
  const [notaLipsuri, setNotaLipsuri] = useState("");
  const [mentiuniStatus, setMentiuniStatus] = useState("");
  const [indicatii, setIndicatii] = useState("");
  const [dataLivrarii, setDataLivrarii] = useState("");
  const [editLivrare, setEditLivrare] = useState(false);
  const [facturare, setFacturare] = useState({ firma: "", cui: "", adresa: "" });
  const [editFacturare, setEditFacturare] = useState(false);
  const [observatie, setObservatie] = useState("");
  const [conturi, setConturi] = useState<(ContScurt & { firmaId: string | null })[]>([]);
  const [contNou, setContNou] = useState("");

  const incarca = () =>
    apiComenzi
      .detaliu(id)
      .then((r) => {
        setC(r.comanda);
        setIndicatii(r.comanda.livrare.indicatii ?? "");
        setDataLivrarii(r.comanda.livrare.data ?? "");
        setFacturare({ firma: r.comanda.facturare?.firma ?? "", cui: r.comanda.facturare?.cui ?? "", adresa: r.comanda.facturare?.adresa ?? "" });
        setContNou(r.comanda.contAlocat?.id ?? "");
        setEroare(null);
        if (r.comanda.drepturi.alocare) apiComenzi.conturi().then((x) => setConturi(x.conturi)).catch(() => setConturi([]));
      })
      .catch((e) => setEroare(textEroare(e)));

  useEffect(() => {
    void incarca();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const ruleaza = async (f: () => Promise<unknown>) => {
    setOcupat(true);
    try {
      await f();
      await incarca();
      onSchimbat();
    } catch (e) {
      setEroare(textEroare(e));
    } finally {
      setOcupat(false);
    }
  };

  if (eroare && !c) return <Mesaj tip="eroare">{eroare}</Mesaj>;
  if (!c) return <div className="text-secundar">Se încarcă…</div>;
  const d = c.drepturi;
  const istoricStatus = c.istoric.filter((i) => i.tip === "status" || i.tip === "lipsuri");
  const altIstoric = c.istoric.filter((i) => i.tip !== "status" && i.tip !== "lipsuri");

  return (
    <div className="casete-comanda">
      {eroare && (
        <div style={{ gridColumn: "1 / -1" }}>
          <Mesaj tip="eroare">{eroare}</Mesaj>
        </div>
      )}
      <section className="caseta">
        <h4>Încasări</h4>
        <p className="text-secundar mic">Încasările, restul de încasat și „+ Notează încasare” vin la S20. Până atunci: avans {lei(c.avansLei)}, rest {lei(c.restLei)}.</p>
      </section>

      <section className="caseta">
        <h4>Livrare și facturare</h4>
        <p>
          <strong>Livrare:</strong> {c.livrare.indicatii ?? <span className="text-secundar">de programat</span>}
          {c.livrare.data ? ` · ziua: ${dataRo(c.livrare.data)}` : ""}
          {c.livrare.nume && (
            <span className="mic text-secundar">
              {" "}
              — {c.livrare.nume}, {dataOra(c.livrare.la)}
            </span>
          )}
          {c.livratLa ? <span className="mic text-secundar"> · livrat {dataOra(c.livratLa)}</span> : ""}
        </p>
        {d.livrare && !editLivrare && (
          <button className="buton secundar mic" onClick={() => setEditLivrare(true)}>
            Programează livrarea
          </button>
        )}
        {editLivrare && (
          <form
            className="formular-mic"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              void ruleaza(() => apiComenzi.livrare(c.id, indicatii.trim() || null, dataLivrarii || null)).then(() => setEditLivrare(false));
            }}
          >
            <Camp eticheta="Indicații de livrare">
              <input value={indicatii} onChange={(e) => setIndicatii(e.target.value)} placeholder="ex. marți după 14:00, sună înainte" />
            </Camp>
            <Camp eticheta="Ziua livrării">
              <input type="date" value={dataLivrarii} onChange={(e) => setDataLivrarii(e.target.value)} />
            </Camp>
            <div className="actiuni">
              <button className="buton mic" disabled={ocupat}>
                Salvează
              </button>
              <button type="button" className="buton secundar mic" onClick={() => setEditLivrare(false)}>
                Renunță
              </button>
            </div>
          </form>
        )}
        <p>
          <strong>Facturare:</strong> {c.facturare ? [c.facturare.firma, c.facturare.cui, c.facturare.adresa].filter(Boolean).join(" · ") : "ca în datele clientului"}
        </p>
        {d.detalii && !editFacturare && (
          <button className="buton secundar mic" onClick={() => setEditFacturare(true)}>
            Date de facturare diferite
          </button>
        )}
        {editFacturare && (
          <form
            className="formular-mic"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              void ruleaza(() => apiComenzi.facturare(c.id, { firma: facturare.firma.trim() || null, cui: facturare.cui.trim() || null, adresa: facturare.adresa.trim() || null })).then(() => setEditFacturare(false));
            }}
          >
            <Camp eticheta="Firma">
              <input value={facturare.firma} onChange={(e) => setFacturare({ ...facturare, firma: e.target.value })} />
            </Camp>
            <Camp eticheta="CUI">
              <input value={facturare.cui} onChange={(e) => setFacturare({ ...facturare, cui: e.target.value })} />
            </Camp>
            <Camp eticheta="Adresa">
              <input value={facturare.adresa} onChange={(e) => setFacturare({ ...facturare, adresa: e.target.value })} />
            </Camp>
            <div className="actiuni">
              <button className="buton mic" disabled={ocupat}>
                Salvează
              </button>
              <button type="button" className="buton secundar mic" onClick={() => setEditFacturare(false)}>
                Renunță
              </button>
            </div>
          </form>
        )}
        {c.ofertaId && (
          <p>
            <strong>Formular Bilka:</strong> {c.formulareBilka.generate === 0 ? "negenerat încă" : `${c.formulareBilka.generate} formular${c.formulareBilka.generate === 1 ? "" : "e"}, ${c.formulareBilka.transmise === 0 ? "netrimise" : `${c.formulareBilka.transmise} trimis${c.formulareBilka.transmise === 1 ? "" : "e"}${c.formulareBilka.ultimaTrimitere ? ` ${dataRo(c.formulareBilka.ultimaTrimitere)}` : ""}`}`}
          </p>
        )}
        {c.documente.length > 0 && (
          <>
            <h4 style={{ marginTop: 10 }}>Documente</h4>
            <ul className="lista-documente">
              {c.documente.map((doc) => (
                <li key={doc.id}>
                  <a href={apiComenzi.caleDocument(c.id, doc.id)} target="_blank" rel="noreferrer">
                    {doc.eticheta}
                    {doc.formularNr ? ` F${doc.formularNr}` : ""}
                    {doc.versiune > 1 ? ` · v${doc.versiune}` : ""}
                  </a>
                  <span className="mic text-secundar">
                    {" "}
                    · {dataRo(doc.generatLa)}
                    {doc.transmisLa ? ` · transmis ${dataRo(doc.transmisLa)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        {!c.ofertaId && c.documente.length === 0 && <p className="mic text-secundar">Comandă manuală: documentele ofertei nu există; atașamentele sunt în caseta Observații.</p>}
      </section>

      <section className="caseta">
        <h4>Statusuri</h4>
        <ul className="lista-istoric">
          {istoricStatus.map((i) => (
            <li key={i.id}>
              {i.tip === "lipsuri" ? (
                <>
                  <span className="asterisc">*</span> lipsuri: {i.valoareDupa}
                </>
              ) : (
                <strong>{i.valoareDupa}</strong>
              )}{" "}
              <span className="mic text-secundar">
                {dataOra(i.moment)} — {i.numeUtilizatorLaMoment}
                {i.mentiuni ? ` · ${i.mentiuni}` : ""}
              </span>
            </li>
          ))}
        </ul>
        {d.logistic && URMATOARELE[c.statusLogistic].length > 0 && (
          <form
            className="formular-mic"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (!statusNou) return;
              void ruleaza(() => apiComenzi.statusLogistic(c.id, statusNou, notaLipsuri.trim() || null, mentiuniStatus.trim() || null)).then(() => {
                setStatusNou("");
                setNotaLipsuri("");
                setMentiuniStatus("");
              });
            }}
          >
            <Camp eticheta="Status nou">
              <select value={statusNou} onChange={(e) => setStatusNou(e.target.value as StatusLogistic | "")}>
                <option value="">alege…</option>
                {URMATOARELE[c.statusLogistic].map((s) => (
                  <option key={s} value={s}>
                    {ETICHETA_STATUS_LOGISTIC[s]}
                  </option>
                ))}
              </select>
            </Camp>
            {statusNou === "RECEPTIONAT_PARTIAL" && (
              <Camp eticheta="Nota lipsurilor" obligatoriu>
                <input value={notaLipsuri} onChange={(e) => setNotaLipsuri(e.target.value)} placeholder="ce lipsește" />
              </Camp>
            )}
            <Camp eticheta="Mențiuni">
              <input value={mentiuniStatus} onChange={(e) => setMentiuniStatus(e.target.value)} />
            </Camp>
            <button className="buton mic" disabled={ocupat || !statusNou}>
              Schimbă statusul
            </button>
          </form>
        )}
        {c.montator && (
          <p className="mic text-secundar">
            Comision montator: vine la S20 ({c.montator.nume}
            {c.montator.telefon ? `, ${c.montator.telefon}` : ""}).
          </p>
        )}
        {altIstoric.length > 0 && (
          <details>
            <summary className="mic">Istoric complet ({c.istoric.length})</summary>
            <ul className="lista-istoric mic">
              {altIstoric.map((i) => (
                <li key={i.id}>
                  {i.tip}
                  {i.camp ? ` · ${i.camp}` : ""}: {i.valoareInainte ?? "—"} → {i.valoareDupa ?? "—"} <span className="text-secundar">({dataOra(i.moment)}, {i.numeUtilizatorLaMoment})</span>
                </li>
              ))}
            </ul>
          </details>
        )}
        {d.alocare && (
          <form
            className="formular-mic"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              void ruleaza(() => apiComenzi.alocare(c.id, contNou || null, null));
            }}
          >
            <Camp eticheta="Contul alocat (pentru:)">
              <select value={contNou} onChange={(e) => setContNou(e.target.value)}>
                <option value="">neidentificată</option>
                {conturi.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nume} ({ETICHETA_ROL[x.rol] ?? x.rol})
                  </option>
                ))}
              </select>
            </Camp>
            <button className="buton secundar mic" disabled={ocupat || contNou === (c.contAlocat?.id ?? "")}>
              Schimbă alocarea
            </button>
          </form>
        )}
      </section>

      <section className="caseta">
        <h4>Observații</h4>
        <ul className="lista-istoric">
          {c.observatii.map((o) => (
            <li key={o.id}>
              „{o.text}”{" "}
              <span className="mic text-secundar">
                — {o.numeUtilizatorLaMoment}, {dataOra(o.moment)}
              </span>
            </li>
          ))}
          {c.observatii.length === 0 && <li className="text-secundar mic">nicio observație încă</li>}
        </ul>
        {d.detalii && (
          <form
            className="formular-mic"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (!observatie.trim()) return;
              void ruleaza(() => apiComenzi.observatie(c.id, observatie.trim())).then(() => setObservatie(""));
            }}
          >
            <input value={observatie} onChange={(e) => setObservatie(e.target.value)} placeholder="+ adaugă observație" aria-label="Observație nouă" />
            <button className="buton secundar mic" disabled={ocupat || !observatie.trim()}>
              Adaugă
            </button>
          </form>
        )}
        <p className="mic">
          <strong>Atașamente:</strong>{" "}
          {c.atasamente.length === 0 && c.atasamenteOferta.length === 0 && <span className="text-secundar">niciunul</span>}
          {c.atasamente.map((a) => (
            <span key={a.id}>
              <a href={apiComenzi.caleAtasament(c.id, a.id)} target="_blank" rel="noreferrer">
                {a.nume}
              </a>{" "}
            </span>
          ))}
          {c.atasamenteOferta.map((a) => (
            <span key={a.id}>
              <a href={apiComenzi.caleAtasamentOferta(c.id, a.id)} target="_blank" rel="noreferrer" title="atașament al ofertei">
                {a.nume}
              </a>{" "}
            </span>
          ))}
        </p>
        {d.detalii && (
          <label className="mic">
            <input
              type="file"
              aria-label="Adaugă atașament"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void ruleaza(() => apiComenzi.atasament(c.id, f));
                e.target.value = "";
              }}
            />
          </label>
        )}
        {c.notiteOferta.length > 0 && (
          <details>
            <summary className="mic">Notițele ofertei ({c.notiteOferta.length})</summary>
            <ul className="lista-istoric mic">
              {c.notiteOferta.map((o) => (
                <li key={o.id}>
                  „{o.text}” <span className="text-secundar">— {o.numeUtilizatorLaMoment}, {dataOra(o.moment)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ "+ Comanda manuala" (cap. 4b)

function FormularComandaManuala({ firme, conturi, onInchide, onCreata }: { firme: { id: string; denumire: string }[]; conturi: (ContScurt & { firmaId: string | null })[]; onInchide: () => void; onCreata: () => void }) {
  const eu = useUtilizator();
  const [date, setDate] = useState<ComandaManualaNoua>({ firmaId: firme.length === 1 ? firme[0].id : eu.firmaId ?? "", client: { nume: "", telefon: "", localitate: "" }, rezumat: "", totalLei: "", totalCuTvaEur: "", avansLei: "", montator: null, contAlocatId: null, indicatiiLivrare: "", observatie: "" });
  const [montatorNume, setMontatorNume] = useState("");
  const [montatorTelefon, setMontatorTelefon] = useState("");
  const [eroare, setEroare] = useState<string | null>(null);
  const [ocupat, setOcupat] = useState(false);
  const [conturiToate, setConturiToate] = useState(conturi);

  useEffect(() => {
    if (conturi.length === 0) apiComenzi.conturi().then((r) => setConturiToate(r.conturi)).catch(() => setConturiToate([]));
  }, [conturi]);

  const trimite = (e: FormEvent) => {
    e.preventDefault();
    setOcupat(true);
    setEroare(null);
    const corp: ComandaManualaNoua = {
      ...date,
      firmaId: date.firmaId || undefined,
      totalCuTvaEur: date.totalCuTvaEur || undefined,
      avansLei: date.avansLei || undefined,
      montator: montatorNume.trim() ? { nume: montatorNume.trim(), telefon: montatorTelefon.trim() || null } : null,
      contAlocatId: date.contAlocatId || null,
      indicatiiLivrare: date.indicatiiLivrare || null,
      observatie: date.observatie || null,
    };
    apiComenzi
      .creeazaManuala(corp)
      .then(() => onCreata())
      .catch((err) => setEroare(textEroare(err)))
      .finally(() => setOcupat(false));
  };
  const conturiFirmei = date.firmaId ? conturiToate.filter((c) => c.firmaId === date.firmaId) : conturiToate;

  return (
    <div className="fundal-dialog" role="dialog" aria-modal="true" aria-label="Comandă manuală">
      <form className="dialog" onSubmit={trimite}>
        <h2>+ Comandă manuală</h2>
        <p className="mic text-secundar">Comenzi care n-au trecut prin soft (necesaruri de la colaboratori, comenzi telefonice, comenzi direct la fabrică). De la creare încolo totul e ca la o comandă din ofertă; apare cu seria CM și marcajul „manuală”.</p>
        {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
        {firme.length > 1 && (
          <Camp eticheta="Firma" obligatoriu>
            <select value={date.firmaId ?? ""} onChange={(e) => setDate({ ...date, firmaId: e.target.value })}>
              <option value="">alege…</option>
              {firme.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.denumire}
                </option>
              ))}
            </select>
          </Camp>
        )}
        <div className="rand-campuri">
          <Camp eticheta="Client" obligatoriu>
            <input value={date.client.nume} onChange={(e) => setDate({ ...date, client: { ...date.client, nume: e.target.value } })} required />
          </Camp>
          <Camp eticheta="Telefon" obligatoriu>
            <input value={date.client.telefon} onChange={(e) => setDate({ ...date, client: { ...date.client, telefon: e.target.value } })} required />
          </Camp>
          <Camp eticheta="Localitate">
            <input value={date.client.localitate ?? ""} onChange={(e) => setDate({ ...date, client: { ...date.client, localitate: e.target.value } })} />
          </Camp>
        </div>
        <Camp eticheta="Rezumatul comenzii" obligatoriu>
          <textarea value={date.rezumat} onChange={(e) => setDate({ ...date, rezumat: e.target.value })} rows={2} placeholder="ex. T18 9005 mat 0,5 — 140 mp; coame 9005 mat" required />
        </Camp>
        <div className="rand-campuri">
          <Camp eticheta="Total cu TVA (lei)" obligatoriu>
            <input value={date.totalLei} onChange={(e) => setDate({ ...date, totalLei: e.target.value })} inputMode="decimal" required />
          </Camp>
          <Camp eticheta="Total (€)">
            <input value={date.totalCuTvaEur ?? ""} onChange={(e) => setDate({ ...date, totalCuTvaEur: e.target.value })} inputMode="decimal" />
          </Camp>
          <Camp eticheta="Avans (lei)">
            <input value={date.avansLei ?? ""} onChange={(e) => setDate({ ...date, avansLei: e.target.value })} inputMode="decimal" />
          </Camp>
        </div>
        <div className="rand-campuri">
          <Camp eticheta="Montator">
            <input value={montatorNume} onChange={(e) => setMontatorNume(e.target.value)} />
          </Camp>
          <Camp eticheta="Telefon montator">
            <input value={montatorTelefon} onChange={(e) => setMontatorTelefon(e.target.value)} />
          </Camp>
          <Camp eticheta="Contul alocat (pentru:)">
            <select value={date.contAlocatId ?? ""} onChange={(e) => setDate({ ...date, contAlocatId: e.target.value || null })}>
              <option value="">neidentificată (nu se știe încă a cui e)</option>
              {conturiFirmei.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nume} ({ETICHETA_ROL[c.rol] ?? c.rol})
                </option>
              ))}
            </select>
          </Camp>
        </div>
        <Camp eticheta="Indicații de livrare">
          <input value={date.indicatiiLivrare ?? ""} onChange={(e) => setDate({ ...date, indicatiiLivrare: e.target.value })} />
        </Camp>
        <Camp eticheta="Observație">
          <input value={date.observatie ?? ""} onChange={(e) => setDate({ ...date, observatie: e.target.value })} />
        </Camp>
        <p className="mic text-secundar">Atașamentele (necesarul primit, formularul trimis) se adaugă din rândul desfășurat, după creare.</p>
        <div className="actiuni">
          <button className="buton" disabled={ocupat}>
            Adaugă comanda
          </button>
          <button type="button" className="buton secundar" onClick={onInchide}>
            Renunță
          </button>
        </div>
      </form>
    </div>
  );
}
