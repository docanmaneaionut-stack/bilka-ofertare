import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  apiComenzi,
  EroareCerere,
  dataRo,
  ETICHETA_STATUS_LOGISTIC,
  STATUSURI_LOGISTICE,
  type ComandaDetaliu,
  type ComandaManualaNoua,
  type ContScurt,
  type FiltreComenzi,
  type AvizComanda,
  type LinieDeAvizat,
  type LinieReturnabila,
  type ListaComenzi,
  type RandComanda,
  type StatusLogistic,
} from "../api";
import { DialogLivrareBilka } from "../components/DialogLivrareBilka";
import { Ajutor, Camp, eroareCamp, Mesaj, textEroare } from "../components/ui";
import { euro, lei, textRo } from "../lib/numere";
import { useUtilizator } from "../contextUtilizator";
import { ETICHETA_ROL } from "./ContulMeu";

// Tabelul de comenzi (S19; FISA-COMENZI cap. 1, 3, 4b, 6; macheta docs/design/ecran-tabel-comenzi):
// capul cu numaratorile, cautarea intr-o casuta, casuta de selectie pe rand (fisa
// soferului, S23), "+ Comanda manuala", filtrele, coloanele din fisa, randul desfasurat
// cu cele patru casete (Incasari - S20 -, Livrare si facturare, Statusuri, Observatii),
// ordinea (invers cronologic; Livrat la sfarsit, ascuns implicit), varianta pe telefon.
// S23: "Fisa soferului (n)" din comenzile bifate (Gestiune, Administratori, Admin general),
// avizul de insotire a marfii din "Doc." (caseta "Aviz"), linkul la locatie, generarea
// detaliatei / tabelului de facturare din comanda.

type Perioada = "90" | "luna" | "an" | "interval";

function perioadaInDate(p: Perioada, deLa: string, panaLa: string): { deLa?: string; panaLa?: string } {
  const azi = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (p === "90") return {};
  if (p === "luna") return { deLa: iso(new Date(azi.getFullYear(), azi.getMonth(), 1)), panaLa: iso(azi) };
  if (p === "an") return { deLa: `${azi.getFullYear()}-01-01`, panaLa: iso(azi) };
  return { ...(deLa ? { deLa } : {}), ...(panaLa ? { panaLa } : {}) };
}

const dataOra = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");

export function Comenzi() {
  const eu = useUtilizator();
  const adminGeneral = eu.rol === "ADMIN_GENERAL";
  const administrator = eu.rol === "ADMINISTRATOR";
  const gestiune = eu.rol === "GESTIUNE";
  const vedeAgent = adminGeneral || administrator;
  const vedeFirma = adminGeneral || administrator || gestiune || eu.rol === "CONTABILITATE";
  const adaugaManuala = adminGeneral || administrator || gestiune;
  // S23: fisa soferului - Gestiune, Administratori, Admin general (FISA-COMENZI cap. 4c)
  const faceFisa = adminGeneral || administrator || gestiune;
  const navigheaza = useNavigate();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusLogistic | "">("");
  const [incasareFiltru, setIncasareFiltru] = useState<"" | "neincasat" | "partial" | "incasat">("");
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
    const filtre: FiltreComenzi = { q: q.trim() || undefined, status: status || undefined, incasare: incasareFiltru || undefined, ...perioadaInDate(perioada, deLa, panaLa), inchise, page, pageSize: 25 };
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
  }, [q, status, incasareFiltru, perioada, deLa, panaLa, agent, firmaId, inchise, page, vedeAgent, vedeFirma, versiune]);

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
              {n.active} active · {n.deReceptionat} de recepționat · {n.neincasate} neîncasate complet · {n.comisioaneNeachitate} comisioane neachitate · {n.neidentificate} neidentificat{n.neidentificate === 1 ? "ă" : "e"} ·{" "}
              <Link to="/comenzi/paleti" title="Evidența paleților">
                {n.paletiNerecuperati} {n.paletiNerecuperati === 1 ? "palet nerecuperat" : "paleți nerecuperați"}
              </Link>
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
            placeholder="Caută după client, telefon, număr comandă, localitate, adresă, montator…"
            aria-label="Caută"
            style={{ minWidth: 320 }}
          />
          {faceFisa && (
            <button className="buton secundar" disabled={selectate.size === 0} title={selectate.size === 0 ? "Bifează comenzile din tabel, în ordinea traseului" : "Fișa șoferului pentru comenzile bifate"} onClick={() => navigheaza(`/comenzi/fisa-soferului?c=${[...selectate].join(",")}`)}>
              🚚 Fișa șoferului{selectate.size > 0 ? ` (${selectate.size})` : ""}
            </button>
          )}
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
          <select
            value={incasareFiltru}
            onChange={(e) => {
              setIncasareFiltru(e.target.value as typeof incasareFiltru);
              setPage(1);
            }}
          >
            <option value="">toate</option>
            <option value="neincasat">neîncasat</option>
            <option value="partial">încasat parțial</option>
            <option value="incasat">încasat</option>
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
          <span>Arată și comenzile închise (livrate și încasate)</span>
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
                  <th>Nr. · data</th>
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
          <li>Ordinea: după data intrării în tabel, cele mai noi sus; comenzile livrate trec la sfârșitul listei și sunt ascunse până bifezi „Arată și comenzile închise” (livrate și încasate).</li>
          <li>„Deschide ▾” desfășoară rândul: livrarea și facturarea, statusurile cu istoric, observațiile cu istoric și atașamentele, documentele ofertei (formularele Bilka, detaliata, tabelul de facturare). Încasările (doar Administratorul firmei le notează, confirmă și anulează) și comisionul recomandării cu „achitat” sunt în rândul desfășurat.</li>
          <li>Prima coloană arată doar numărul și data comenzii; cine a trimis-o („Responsabil: trimisă de …”, la cele manuale „adăugat de … pentru: …”) e prima linie din rândul desfășurat. Clientul apare cu localitatea și adresa lucrării; căutarea găsește și după adresă.</li>
          <li>Coloana „Montator” arată montatorul de execuție (cine montează și e în șantier la livrare — apare și pe fișa șoferului); îl schimbă contul comenzii, orice Administrator și Gestiunea. Recomandarea (cine a adus lucrarea) și comisionul ei sunt dedesubt și merg în tabelul de vânzări; le schimbă contul ofertei și Administratorul firmei.</li>
          <li>„Ajustează prețul de vânzare” (doar Administratorul firmei comenzii, în caseta Încasări): suma nouă cu TVA și motivul; cât comanda nu e încasată integral și nu sub achiziție. Totalul ajustat poartă asteriscul roșu, iar istoricul e în aceeași casetă.</li>
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

// S27 (MODIFICAREA M10; FISA-COMENZI cap. 1): responsabilul nu mai sta in coloana 1 - e prima linie din
// randul desfasurat („trimisă de …” / „adăugat de … pentru: …”; la comanda manuala fara cont: „cont nealocat”)
function Responsabil({ c }: { c: RandComanda }) {
  if (!c.manuala) {
    return (
      <div className="responsabil-comanda">
        <strong>Responsabil:</strong> trimisă de <strong>{c.responsabil.nume}</strong>
        {c.responsabil.rol !== "AGENT" && c.responsabil.rol !== "ADMINISTRATOR" ? ` (${ETICHETA_ROL[c.responsabil.rol] ?? c.responsabil.rol})` : ""}
      </div>
    );
  }
  return (
    <div className="responsabil-comanda">
      <strong>Responsabil:</strong> adăugat de <strong>{c.responsabil.nume}</strong>
      {c.contAlocat ? (
        <>
          {" "}
          pentru: <strong>{c.contAlocat.nume}</strong>
          {c.contAlocat.rol === "COLABORATOR" ? " (colaborator)" : ""}
        </>
      ) : (
        "; cont nealocat"
      )}
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
          {c.neidentificata && <span className="eticheta-neidentificata">neidentificată</span>}
          <div className="mic text-secundar" style={{ fontWeight: 400 }}>
            {dataRo(c.data)}
          </div>
        </td>
        <td onClick={onComuta}>
          <strong>{c.client.nume}</strong>
          <div className="mic text-secundar">{[c.completareLa ? `completare la ${c.completareLa.numarComplet}` : null, c.client.localitate, c.client.adresa].filter(Boolean).join(" · ")}</div>
          <div className="mic text-secundar">{c.client.telefon}</div>
        </td>
        <td className="rezumat-comanda" onClick={onComuta}>
          {textRo(c.rezumat)}
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
          {(c.recomandare || c.comision) && (
            <div className="mic text-secundar">
              recomandare: {c.recomandare?.nume ?? "—"}
              {c.comision ? ` · comision ${lei(c.comision.lei)} · ${c.comision.achitat ? "☑ achitat" : "☐ neachitat"}` : ""}
            </div>
          )}
        </td>
        <td className="total-oferta" onClick={onComuta}>
          <span className="numar-mare">{lei(c.totalLei)}</span>
          {c.pretAjustat && (
            <span className="asterisc" title={`preț ajustat: ${lei(c.pretAjustat.totalInitialLei)} la „Comandat” — ${c.pretAjustat.motiv} (${c.pretAjustat.de}); istoricul e în rândul desfășurat`}>
              *
            </span>
          )}
          <div className="mic text-secundar">{euro(c.totalCuTvaEur)}</div>
        </td>
        <td className="col-optional" onClick={onComuta}>
          <strong>{lei(c.incasare.incasatLei)}</strong>
          <div className="mic text-secundar">rest {lei(c.incasare.restLei)}</div>
          <span className={`status-incasare ${c.incasare.status}`}>{c.incasare.eticheta}</span>
          {c.incasare.propuse > 0 && <div className="mic text-secundar">avans propus {lei(c.incasare.propuseLei)} — de confirmat</div>}
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
          {c.livrareBilka?.text && <div className="eticheta-livrare-bilka">{c.livrareBilka.text}</div>}
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
  // S22: nota de palet
  const [editPalet, setEditPalet] = useState(false);
  const [notaPalet, setNotaPalet] = useState("");
  // S23: linkul la locatie
  const [editLocatie, setEditLocatie] = useState(false);
  const [locatieUrl, setLocatieUrl] = useState("");
  // S26a (M7): livrarea de la Bilka pe comanda
  const [dialogLivrareBilka, setDialogLivrareBilka] = useState(false);

  const incarca = () =>
    apiComenzi
      .detaliu(id)
      .then((r) => {
        setC(r.comanda);
        setIndicatii(r.comanda.livrare.indicatii ?? "");
        setDataLivrarii(r.comanda.livrare.data ?? "");
        setFacturare({ firma: r.comanda.facturare?.firma ?? "", cui: r.comanda.facturare?.cui ?? "", adresa: r.comanda.facturare?.adresa ?? "" });
        setContNou(r.comanda.contAlocat?.id ?? "");
        setNotaPalet(r.comanda.palet?.nota ?? "");
        setLocatieUrl(r.comanda.locatieUrl ?? "");
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
      <div style={{ gridColumn: "1 / -1" }}>
        <Responsabil c={c} />
      </div>
      {eroare && (
        <div style={{ gridColumn: "1 / -1" }}>
          <Mesaj tip="eroare">{eroare}</Mesaj>
        </div>
      )}
      <CasetaIncasari
        c={c}
        ocupat={ocupat}
        ruleaza={ruleaza}
        dupa={async () => {
          await incarca();
          onSchimbat();
        }}
      />

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
        {(c.livrareBilka?.text || d.livrareBilka) && (
          <p>
            {c.livrareBilka?.text && <span className="eticheta-livrare-bilka">{c.livrareBilka.text}</span>}
            {d.livrareBilka && (
              <button className="buton secundar mic" style={{ marginLeft: c.livrareBilka?.text ? 8 : 0 }} onClick={() => setDialogLivrareBilka(true)}>
                {c.livrareBilka?.text ? "Schimbă" : "Livrarea de la Bilka…"}
              </button>
            )}
          </p>
        )}
        <MontatorExecutie
          c={c}
          dupa={async () => {
            await incarca();
            onSchimbat();
          }}
        />
        {dialogLivrareBilka && (
          <DialogLivrareBilka
            initial={c.livrareBilka}
            localitateImplicita={c.client.localitate}
            telefonImplicit={c.client.telefon}
            etichetaConfirmare="Salvează"
            cuMentiuni
            nota="Schimbarea se notează în istoricul comenzii. Formularele Bilka generate până acum rămân, marcate."
            onConfirma={async (alegere, mentiuni) => {
              await apiComenzi.livrareBilka(c.id, alegere, mentiuni);
              setDialogLivrareBilka(false);
              await incarca();
              onSchimbat();
            }}
            onRenunta={() => setDialogLivrareBilka(false)}
          />
        )}
        <p>
          <strong>Locația:</strong>{" "}
          {c.locatieUrl ? (
            <a href={c.locatieUrl} target="_blank" rel="noreferrer">
              locația pe hartă
            </a>
          ) : (
            <span className="text-secundar">fără link</span>
          )}
          {d.locatie && !editLocatie && (
            <button className="buton secundar mic" style={{ marginLeft: 8 }} onClick={() => setEditLocatie(true)}>
              {c.locatieUrl ? "Schimbă" : "Adaugă link"}
            </button>
          )}
        </p>
        {editLocatie && (
          <form
            className="formular-mic"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              void ruleaza(() => apiComenzi.locatie(c.id, locatieUrl.trim() || null)).then(() => setEditLocatie(false));
            }}
          >
            <Camp eticheta="Adresa web a locației (http / https — din Google Maps sau WhatsApp)">
              <input value={locatieUrl} onChange={(e) => setLocatieUrl(e.target.value)} placeholder="https://maps.app.goo.gl/…" style={{ minWidth: 320 }} />
            </Camp>
            <div className="actiuni">
              <button className="buton mic" disabled={ocupat}>
                Salvează
              </button>
              <button type="button" className="buton secundar mic" onClick={() => setEditLocatie(false)}>
                Renunță
              </button>
            </div>
          </form>
        )}
        <p>
          <strong>Facturare:</strong> {c.facturare ? [c.facturare.firma, c.facturare.cui, c.facturare.adresa].filter(Boolean).join(" · ") : "ca în datele clientului"}
        </p>
        <p>
          <strong>Palet:</strong>{" "}
          {c.palet ? (
            <>
              {c.palet.nota}
              <span className="mic text-secundar">
                {" "}
                — {c.palet.notatDe}, {dataOra(c.palet.notatLa)}
              </span>{" "}
              <span className={`eticheta-palet ${c.palet.recuperat ? "recuperat" : "nerecuperat"}`}>{c.palet.recuperat ? "recuperat" : "nerecuperat"}</span>
              {c.palet.recuperat && c.palet.recuperatDe && (
                <span className="mic text-secundar">
                  {" "}
                  de {c.palet.recuperatDe}, {dataOra(c.palet.recuperatLa)}
                </span>
              )}
              {d.statusPalet && (
                <label className="mic" style={{ marginLeft: 8 }}>
                  <input type="checkbox" checked={c.palet.recuperat} disabled={ocupat} onChange={(e) => void ruleaza(() => apiComenzi.paletRecuperat(c.id, e.target.checked))} /> recuperat
                </label>
              )}
            </>
          ) : (
            <span className="text-secundar">fără notă de palet</span>
          )}
        </p>
        {d.notaPalet && !editPalet && (
          <button className="buton secundar mic" onClick={() => setEditPalet(true)}>
            {c.palet ? "Modifică nota de palet" : "Notă palet"}
          </button>
        )}
        {editPalet && (
          <form
            className="formular-mic"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              void ruleaza(() => apiComenzi.notaPalet(c.id, notaPalet.trim() || null)).then(() => setEditPalet(false));
            }}
          >
            <Camp eticheta="Nota de palet (ce palet a rămas și unde)">
              <input value={notaPalet} onChange={(e) => setNotaPalet(e.target.value)} placeholder="ex. 2 paleți la client, în curte" />
            </Camp>
            <div className="actiuni">
              <button className="buton mic" disabled={ocupat}>
                Salvează
              </button>
              <button type="button" className="buton secundar mic" onClick={() => setEditPalet(false)}>
                Renunță
              </button>
            </div>
          </form>
        )}
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
        {d.documente && (
          <div className="actiuni" style={{ marginTop: 8, gap: 6, flexWrap: "wrap" }}>
            <button className="buton secundar mic" disabled={ocupat} onClick={() => void ruleaza(() => apiComenzi.genereazaDocument(c.id, "TABEL_FACTURARE"))} title="generează tabelul de facturare al ofertei comandate">
              Tabel de facturare
            </button>
            <button className="buton secundar mic" disabled={ocupat} onClick={() => void ruleaza(() => apiComenzi.genereazaDocument(c.id, "DETALIATA"))} title="generează oferta detaliată (cu panotaj și coloana „Primit”)">
              Ofertă detaliată
            </button>
          </div>
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
                    {doc.inainteDeSchimbareaLivrarii ? " · ⚠ generat înainte de schimbarea livrării" : ""}
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
        <Recomandare
          c={c}
          dupa={async () => {
            await incarca();
            onSchimbat();
          }}
        />
        <Comision c={c} ocupat={ocupat} ruleaza={ruleaza} />
        {altIstoric.length > 0 && (
          <details>
            <summary className="mic">Istoric complet ({c.istoric.length})</summary>
            <ul className="lista-istoric mic">
              {altIstoric.map((i) => (
                <li key={i.id}>
                  {i.tip}
                  {i.camp ? ` · ${i.camp === "livrareBilka" ? "livrarea de la Bilka" : i.camp}` : ""}: {i.valoareInainte ?? "—"} → {i.valoareDupa ?? "—"}
                  {i.mentiuni ? ` — ${i.mentiuni}` : ""} <span className="text-secundar">({dataOra(i.moment)}, {i.numeUtilizatorLaMoment})</span>
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

      <CasetaRetururi c={c} ocupat={ocupat} ruleaza={ruleaza} />
      <CasetaAviz c={c} ocupat={ocupat} ruleaza={ruleaza} />
    </div>
  );
}

// ------------------------------------------------------------------ retururile (S22, cap. 5)

const eur = euro;

function CasetaRetururi({ c, ocupat, ruleaza }: { c: ComandaDetaliu; ocupat: boolean; ruleaza: (f: () => Promise<unknown>) => Promise<void> }) {
  const [formular, setFormular] = useState(false);
  const [linii, setLinii] = useState<LinieReturnabila[]>([]);
  const [cantitati, setCantitati] = useState<Record<string, string>>({});
  const [observatii, setObservatii] = useState("");
  const [motivId, setMotivId] = useState<string | null>(null);
  const [motiv, setMotiv] = useState("");
  const [eroare, setEroare] = useState<string | null>(null);
  const d = c.drepturi;
  const deschide = () => {
    setEroare(null);
    apiComenzi
      .retururi(c.id)
      .then((r) => {
        setLinii(r.linii);
        setCantitati({});
        setFormular(true);
      })
      .catch((e) => setEroare(textEroare(e)));
  };
  const alese = Object.entries(cantitati).filter(([, q]) => q.trim() !== "" && Number(q.replace(",", ".")) > 0);
  return (
    <section className="caseta" style={{ gridColumn: "1 / -1" }}>
      <h4>Retururi</h4>
      {c.tip === "MANUALA" && (
        <p className="mic text-secundar">
          Retur: comanda manuală n-are linii cu prețuri — returul se reflectă prin corecția sumelor manuale (cost și vânzare) de către Administratorul firmei, cu istoric, în <Link to="/vanzari">tabelul de vânzări</Link> („corectează sumele”).
        </p>
      )}
      {c.retururi.length === 0 && c.tip !== "MANUALA" && <p className="text-secundar mic">niciun retur</p>}
      {c.retururi.length > 0 && (
        <table className="tabel-incasari">
          <tbody>
            {c.retururi.map((r) => (
              <tr key={r.id} className={r.stare === "ANULAT" ? "anulata" : undefined}>
                <td className="mic">{dataRo(r.data)}</td>
                <td className="mic">
                  <strong>Retur {r.numar}</strong>: {r.linii.map((l) => `${Number(l.cantitate).toLocaleString("ro-RO", { maximumFractionDigits: 3 })} ${l.um} ${l.denumire}`).join(", ")}
                  {r.observatii ? ` — ${r.observatii}` : ""}
                  {r.stare === "ANULAT" && (
                    <span className="mic text-secundar">
                      {" "}
                      · anulat: {r.motivAnulare} ({r.anulatDe})
                    </span>
                  )}
                  {r.stare === "ACTIV" && r.deRegularizat && <span className="eticheta-regularizat">de regularizat — comisionul era achitat</span>}
                  {r.stare === "ACTIV" && !r.deRegularizat && r.regularizatDe && <span className="mic text-secundar"> · regularizat de {r.regularizatDe}</span>}
                  <div className="text-secundar">
                    notat de {r.notatDe}
                    {r.documentId && (
                      <>
                        {" "}
                        ·{" "}
                        <a href={apiComenzi.caleDocument(c.id, r.documentId)} target="_blank" rel="noreferrer">
                          Notă de retur
                        </a>
                      </>
                    )}
                  </div>
                </td>
                <td className="suma">
                  {lei(r.sumaCuTvaLei)}
                  <div className="mic text-secundar">
                    {eur(r.sumaFaraTvaEur)} + TVA = {eur(r.sumaCuTvaEur)}
                  </div>
                </td>
                {d.anuleazaRetur && (
                  <td className="mic">
                    {r.stare === "ACTIV" && r.deRegularizat && (
                      <button className="buton secundar mic" disabled={ocupat} onClick={() => void ruleaza(() => apiComenzi.regularizat(c.id, r.id))}>
                        Regularizat
                      </button>
                    )}{" "}
                    {r.stare === "ACTIV" && motivId !== r.id && (
                      <button className="buton secundar mic" disabled={ocupat} onClick={() => setMotivId(r.id)}>
                        Anulează
                      </button>
                    )}
                    {motivId === r.id && (
                      <form
                        className="formular-mic"
                        onSubmit={(e: FormEvent) => {
                          e.preventDefault();
                          void ruleaza(() => apiComenzi.anuleazaRetur(c.id, r.id, motiv.trim())).then(() => {
                            setMotivId(null);
                            setMotiv("");
                          });
                        }}
                      >
                        <input value={motiv} onChange={(e) => setMotiv(e.target.value)} placeholder="motivul anulării" aria-label="Motivul anulării" />
                        <button className="buton mic" disabled={ocupat || !motiv.trim()}>
                          Confirmă
                        </button>
                        <button type="button" className="buton secundar mic" onClick={() => setMotivId(null)}>
                          Renunță
                        </button>
                      </form>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      {d.retur && !formular && (
        <button className="buton adauga mic" disabled={ocupat} onClick={deschide}>
          + Retur
        </button>
      )}
      {formular && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void ruleaza(() =>
              apiComenzi.retur(
                c.id,
                alese.map(([linieId, cantitate]) => ({ linieId, cantitate: cantitate.trim() })),
                observatii.trim() || null,
              ),
            ).then(() => {
              setFormular(false);
              setObservatii("");
            });
          }}
        >
          <p className="mic text-secundar">Alege produsele și cantitățile returnate (cel mult cantitatea comandată, mai puțin ce s-a returnat deja). Suma de restituit = prețurile din oferta comandată; nota de retur se generează la salvare.</p>
          <table className="tabel-incasari">
            <tbody>
              {linii.map((l) => {
                const ramas = Number(l.cantitateComandata) - Number(l.cantitateReturnata);
                return (
                  <tr key={l.linieId}>
                    <td className="mic">
                      {l.denumire} <span className="text-secundar">({l.cod})</span>
                      <div className="text-secundar">
                        comandat {Number(l.cantitateComandata).toLocaleString("ro-RO", { maximumFractionDigits: 3 })} {l.um}
                        {Number(l.cantitateReturnata) > 0 ? ` · returnat deja ${Number(l.cantitateReturnata).toLocaleString("ro-RO", { maximumFractionDigits: 3 })}` : ""} · {eur(l.pretDocumentEur)}/{l.um}
                      </div>
                    </td>
                    <td className="suma">
                      <input value={cantitati[l.linieId] ?? ""} onChange={(e) => setCantitati({ ...cantitati, [l.linieId]: e.target.value })} inputMode="decimal" placeholder="0" disabled={ramas <= 0} style={{ width: 90, textAlign: "right" }} aria-label={`Cantitate returnată ${l.denumire}`} />
                      <span className="mic text-secundar"> / {ramas.toLocaleString("ro-RO", { maximumFractionDigits: 3 })}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="formular-mic">
            <input value={observatii} onChange={(e) => setObservatii(e.target.value)} placeholder="observații (opțional)" style={{ minWidth: 260 }} />
            <button className="buton mic" disabled={ocupat || alese.length === 0}>
              Salvează returul
            </button>
            <button type="button" className="buton secundar mic" onClick={() => setFormular(false)}>
              Renunță
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ "+ Comanda manuala" (cap. 4b)

// S23 - avizul de insotire a marfii (cap. 9): avizele comenzii (unul per livrare, cu data livrarii si
// "partial") si formularul de generare cu cantitatile propuse (restul de livrat), ajustabile
export function CasetaAviz({ c, ocupat, ruleaza, deschisInitial = false }: { c: { id: string; tip: RandComanda["tip"]; avize: AvizComanda[]; drepturi: { aviz: boolean } }; ocupat: boolean; ruleaza: (f: () => Promise<unknown>) => Promise<void>; deschisInitial?: boolean }) {
  const [formular, setFormular] = useState(false);
  const [linii, setLinii] = useState<LinieDeAvizat[]>([]);
  const [dataLivrarii, setDataLivrarii] = useState("");
  const [cantitati, setCantitati] = useState<Record<string, string>>({});
  const [bucati, setBucati] = useState<Record<string, string>>({});
  const [eroare, setEroare] = useState<string | null>(null);
  const deschide = () => {
    setEroare(null);
    apiComenzi
      .aviz(c.id)
      .then((r) => {
        setLinii(r.linii);
        setDataLivrarii(r.dataPropusa);
        const q: Record<string, string> = {};
        const b: Record<string, string> = {};
        for (const l of r.linii) {
          if (l.propusa !== null) q[l.linieId] = l.propusa.replace(/\.000$/, "");
          for (const p of l.panotaj ?? []) b[p.pozitieId] = String(p.propuse);
        }
        setCantitati(q);
        setBucati(b);
        setFormular(true);
      })
      .catch((e) => setEroare(textEroare(e)));
  };
  useEffect(() => {
    if (deschisInitial && c.drepturi.aviz) deschide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deschisInitial]);
  // S25 BUG-5: la comanda manuala nu exista rezultat salvat, deci nici cantitati de propus - se spune pe ecran
  if (c.tip === "MANUALA")
    return (
      <section className="caseta" style={{ gridColumn: "1 / -1" }}>
        <h4>Aviz de însoțire a mărfii</h4>
        <p className="mic text-secundar">Comanda manuală n-are rezultat salvat (linii cu cantități), deci nu există cantități de propus pe aviz: avizul ei se scrie în afara softului.</p>
      </section>
    );
  const genereaza = () =>
    ruleaza(() =>
      apiComenzi.genereazaAviz(c.id, {
        dataLivrarii,
        linii: linii.filter((l) => l.propusa !== null).map((l) => ({ linieId: l.linieId, cantitate: (cantitati[l.linieId] ?? "0").trim() || "0" })),
        pozitii: linii.flatMap((l) => (l.panotaj ?? []).map((p) => ({ pozitieId: p.pozitieId, bucati: Number(bucati[p.pozitieId] ?? 0) || 0 }))),
      }),
    ).then(() => setFormular(false));
  let banda: string | null = null;
  return (
    <section className="caseta" style={{ gridColumn: "1 / -1" }}>
      <h4>Aviz de însoțire a mărfii</h4>
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      {c.avize.length === 0 && <p className="text-secundar mic">niciun aviz generat</p>}
      {c.avize.length > 0 && (
        <ul className="lista-documente">
          {c.avize.map((a) => (
            <li key={a.id}>
              {a.documentId ? (
                <a href={apiComenzi.caleDocument(c.id, a.documentId)} target="_blank" rel="noreferrer">
                  Aviz {a.numar} · livrare din {dataRo(a.dataLivrarii)}
                </a>
              ) : (
                <span>
                  Aviz {a.numar} · livrare din {dataRo(a.dataLivrarii)}
                </span>
              )}
              {a.partial && <span className="eticheta-regularizat" style={{ marginLeft: 6 }}>livrare parțială</span>}
              <span className="mic text-secundar">
                {" "}
                · {a.coli} coli · {a.piese.replace(/\.000$/, "")} piese · {a.generatDe}, {dataOra(a.moment)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {c.drepturi.aviz && !formular && (
        <button className="buton adauga mic" onClick={deschide}>
          + Aviz pentru o livrare
        </button>
      )}
      {formular && (
        <form
          className="formular-mic"
          style={{ flexDirection: "column", alignItems: "stretch" }}
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void genereaza();
          }}
        >
          <div className="rand-campuri">
            <Camp eticheta="Data livrării" obligatoriu>
              <input type="date" value={dataLivrarii} onChange={(e) => setDataLivrarii(e.target.value)} required />
            </Camp>
            <span className="mic text-secundar" style={{ alignSelf: "flex-end" }}>
              Cantitățile propuse sunt restul de livrat (comandat minus avizele anterioare). Scrie mai puțin pentru o livrare parțială; o linie cu 0 nu apare pe aviz.
            </span>
          </div>
          <table className="tabel-incasari">
            <thead>
              <tr>
                <th>Produs</th>
                <th>UM</th>
                <th className="dreapta">Comandat</th>
                <th className="dreapta">Livrat deja</th>
                <th className="dreapta">Pe acest aviz</th>
              </tr>
            </thead>
            <tbody>
              {linii.flatMap((l) => {
                const randuri = [];
                if (l.banda !== banda) {
                  banda = l.banda;
                  randuri.push(
                    <tr key={`b-${l.linieId}`}>
                      <td colSpan={5}>
                        <strong className="mic">{l.banda}</strong>
                      </td>
                    </tr>,
                  );
                }
                randuri.push(
                  <tr key={l.linieId}>
                    <td>{l.denumire}</td>
                    <td className="mic">{l.um}</td>
                    <td className="dreapta">{l.cantitateComandata}</td>
                    <td className="dreapta mic text-secundar">{l.livrata.replace(/\.000$/, "")}</td>
                    <td className="dreapta">{l.panotaj ? <span className="mic text-secundar">din lungimi</span> : <input value={cantitati[l.linieId] ?? ""} onChange={(e) => setCantitati({ ...cantitati, [l.linieId]: e.target.value })} inputMode="decimal" style={{ width: 90, textAlign: "right" }} aria-label={`cantitate ${l.denumire}`} />}</td>
                  </tr>,
                );
                for (const p of l.panotaj ?? []) {
                  randuri.push(
                    <tr key={p.pozitieId}>
                      <td className="mic" style={{ paddingLeft: 24 }}>
                        {Number(p.lungimeM).toLocaleString("ro-RO", { minimumFractionDigits: 2 })} m
                      </td>
                      <td className="mic">buc</td>
                      <td className="dreapta">{p.bucati}</td>
                      <td className="dreapta mic text-secundar">{p.livrate}</td>
                      <td className="dreapta">
                        <input value={bucati[p.pozitieId] ?? ""} onChange={(e) => setBucati({ ...bucati, [p.pozitieId]: e.target.value })} inputMode="numeric" style={{ width: 90, textAlign: "right" }} aria-label={`bucăți ${p.lungimeM} m`} />
                      </td>
                    </tr>,
                  );
                }
                return randuri;
              })}
            </tbody>
          </table>
          <div className="actiuni">
            <button className="buton mic" disabled={ocupat || !dataLivrarii}>
              Generează avizul (PDF, 2 exemplare)
            </button>
            <button type="button" className="buton secundar mic" onClick={() => setFormular(false)}>
              Renunță
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function FormularComandaManuala({ firme, conturi, onInchide, onCreata }: { firme: { id: string; denumire: string }[]; conturi: (ContScurt & { firmaId: string | null })[]; onInchide: () => void; onCreata: () => void }) {
  const eu = useUtilizator();
  const [date, setDate] = useState<ComandaManualaNoua>({ firmaId: firme.length === 1 ? firme[0].id : eu.firmaId ?? "", client: { nume: "", telefon: "", localitate: "" }, rezumat: "", totalLei: "", totalCuTvaEur: "", avansLei: "", montator: null, contAlocatId: null, indicatiiLivrare: "", observatie: "" });
  const [montatorNume, setMontatorNume] = useState("");
  const [montatorTelefon, setMontatorTelefon] = useState("");
  // S26b (M8): recomandarea (cine a adus lucrarea), separat de montatorul de executie
  const [recomandareNume, setRecomandareNume] = useState("");
  const [recomandareTelefon, setRecomandareTelefon] = useState("");
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
      montator: montatorNume.trim() ? { nume: montatorNume.trim(), telefon: montatorTelefon.trim() } : null,
      recomandare: recomandareNume.trim() ? { nume: recomandareNume.trim(), telefon: recomandareTelefon.trim() || null } : null,
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
          <Camp eticheta="Montator (execuție)">
            <input value={montatorNume} onChange={(e) => setMontatorNume(e.target.value)} />
          </Camp>
          <Camp eticheta="Telefon montator" obligatoriu={montatorNume.trim() !== ""}>
            <input type="tel" value={montatorTelefon} onChange={(e) => setMontatorTelefon(e.target.value)} required={montatorNume.trim() !== ""} />
          </Camp>
          <Camp eticheta="Recomandare (cine a adus lucrarea)">
            <input value={recomandareNume} onChange={(e) => setRecomandareNume(e.target.value)} />
          </Camp>
          <Camp eticheta="Telefon recomandare">
            <input type="tel" value={recomandareTelefon} onChange={(e) => setRecomandareTelefon(e.target.value)} />
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

// ------------------------------------------------------------------ S20: caseta Incasari (cap. 2)

function CasetaIncasari({ c, ocupat, ruleaza, dupa }: { c: ComandaDetaliu; ocupat: boolean; ruleaza: (f: () => Promise<unknown>) => Promise<void>; dupa: () => Promise<void> }) {
  const [suma, setSuma] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [ce, setCe] = useState("");
  const [motivId, setMotivId] = useState<string | null>(null);
  const [motiv, setMotiv] = useState("");
  const poate = c.drepturi.bani;
  return (
    <section className="caseta">
      <h4>Încasări</h4>
      {c.incasari.length === 0 && <p className="text-secundar mic">nicio încasare notată</p>}
      <table className="tabel-incasari">
        <tbody>
          {c.incasari.map((i) => (
            <tr key={i.id} className={i.stare === "ANULATA" ? "anulata" : i.stare === "PROPUSA" ? "propusa" : undefined}>
              <td className="mic">{dataRo(i.data)}</td>
              <td className="mic">
                {i.ceReprezinta}
                {i.stare === "PROPUSA" && <span className="eticheta-propusa">propusă — de confirmat</span>}
                {i.stare === "ANULATA" && (
                  <span className="mic text-secundar">
                    {" "}
                    · anulată: {i.motivAnulare} ({i.anulatDe})
                  </span>
                )}
                <div className="text-secundar">
                  notată de {i.notatDe}
                  {i.confirmatDe && i.stare === "CONFIRMATA" && i.confirmatDe !== i.notatDe ? ` · confirmată de ${i.confirmatDe}` : ""}
                </div>
              </td>
              <td className="suma">{lei(i.sumaLei)}</td>
              {poate && (
                <td className="mic" style={{ whiteSpace: "nowrap" }}>
                  {i.stare === "PROPUSA" && (
                    <button className="buton mic" disabled={ocupat} onClick={() => void ruleaza(() => apiComenzi.confirmaIncasare(c.id, i.id))}>
                      Confirmă
                    </button>
                  )}
                  {i.stare !== "ANULATA" && (
                    <button className="buton secundar mic" disabled={ocupat} onClick={() => setMotivId(motivId === i.id ? null : i.id)}>
                      Anulează
                    </button>
                  )}
                  {motivId === i.id && (
                    <form
                      className="formular-mic"
                      onSubmit={(e: FormEvent) => {
                        e.preventDefault();
                        if (!motiv.trim()) return;
                        void ruleaza(() => apiComenzi.anuleazaIncasare(c.id, i.id, motiv.trim())).then(() => {
                          setMotivId(null);
                          setMotiv("");
                        });
                      }}
                    >
                      <input value={motiv} onChange={(e) => setMotiv(e.target.value)} placeholder="motivul anulării" aria-label="Motivul anulării" />
                      <button className="buton mic sterge" disabled={ocupat || !motiv.trim()}>
                        Anulează cu motiv
                      </button>
                    </form>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="rest-incasat">
        <strong>Rest de încasat: {lei(c.incasare.restLei)}</strong> <span className={`status-incasare ${c.incasare.status}`}>{c.incasare.eticheta}</span>
        <span className="mic text-secundar">
          {" "}
          · încasat {lei(c.incasare.incasatLei)} din {lei(c.totalLei)}
          {c.pretAjustat && (
            <span className="asterisc" title="preț ajustat după „Comandat” — vezi istoricul de mai jos">
              *
            </span>
          )}
        </span>
      </p>
      <AjustarePret c={c} dupa={dupa} />
      {poate ? (
        <form
          className="formular-mic"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (!suma.trim() || !ce.trim()) return;
            void ruleaza(() => apiComenzi.incasare(c.id, { sumaLei: suma.trim(), data, ceReprezinta: ce.trim() })).then(() => {
              setSuma("");
              setCe("");
            });
          }}
        >
          <Camp eticheta="Suma (lei)" obligatoriu>
            <input value={suma} onChange={(e) => setSuma(e.target.value)} inputMode="decimal" style={{ minWidth: 110 }} />
          </Camp>
          <Camp eticheta="Data" obligatoriu>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </Camp>
          <Camp eticheta="Ce reprezintă" obligatoriu>
            <input value={ce} onChange={(e) => setCe(e.target.value)} placeholder="ex. tranșa 2, numerar la birou; 600 € la 5,05" />
          </Camp>
          <button className="buton mic adauga" disabled={ocupat || !suma.trim() || !ce.trim()}>
            + Notează încasare
          </button>
        </form>
      ) : (
        <p className="mic text-secundar">Încasările le notează și le confirmă doar Administratorul firmei.</p>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ S26b (M5): ajustarea pretului de vanzare

// "16.500,00" / "16500,5" / "16500.50" -> ce asteapta serverul (fara separatorul de mii)
const sumaCurata = (s: string) => s.trim().replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "");

// Butonul „Ajustează prețul de vânzare” (doar Administratorul firmei comenzii): suma noua (total cu TVA,
// lei) + motivul obligatoriu; oprit cu motivul alaturi cand comanda e incasata integral. Refuzurile
// serverului (sub achizitie cu suma minima, suma care nu iese la ban cu cea mai apropiata, sub incasat)
// apar aici, cu suma propusa la un clic. Istoricul ajustarilor il vede oricine vede comanda.
function AjustarePret({ c, dupa }: { c: ComandaDetaliu; dupa: () => Promise<void> }) {
  const [edit, setEdit] = useState(false);
  const [suma, setSuma] = useState("");
  const [motiv, setMotiv] = useState("");
  const [eroare, setEroare] = useState<unknown>(null);
  const [ocupat, setOcupat] = useState(false);
  const incasataIntegral = Number(c.incasare.restLei) <= 0;
  const propusa = eroare instanceof EroareCerere ? ((eroare.corp.sumaMinimaLei ?? eroare.corp.sumaApropiataLei) as string | undefined) : undefined;
  const trimite = async (e: FormEvent) => {
    e.preventDefault();
    setEroare(null);
    setOcupat(true);
    try {
      await apiComenzi.ajustarePret(c.id, sumaCurata(suma), motiv.trim());
      setEdit(false);
      setSuma("");
      setMotiv("");
      await dupa();
    } catch (err) {
      setEroare(err);
    } finally {
      setOcupat(false);
    }
  };
  if (c.ajustariPret.length === 0 && !c.drepturi.ajustarePret) return null;
  return (
    <div className="ajustare-pret">
      {c.pretAjustat && (
        <>
          <p className="mic">
            <span className="asterisc">*</span> <strong>Preț de vânzare ajustat:</strong> {lei(c.pretAjustat.totalInitialLei)} la „Comandat” → {lei(c.totalLei)} acum
          </p>
          <details>
            <summary className="mic">Vezi istoric ({c.ajustariPret.length})</summary>
            <ul className="lista-istoric mic">
              {c.ajustariPret.map((a) => (
                <li key={a.versiune}>
                  {lei(a.totalVechiLei)} → {lei(a.totalNouLei)} — {a.motiv}{" "}
                  <span className="text-secundar">
                    ({a.de}, {dataOra(a.moment)})
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
      {c.drepturi.ajustarePret && !edit && (
        <p>
          <button className="buton secundar mic" type="button" disabled={incasataIntegral} onClick={() => setEdit(true)}>
            Ajustează prețul de vânzare
          </button>
          {incasataIntegral && <span className="explicatie-buton"> Comanda e încasată integral — prețul nu se mai poate ajusta.</span>}
        </p>
      )}
      {edit && (
        <form className="formular-mic" onSubmit={(e) => void trimite(e)}>
          <Camp eticheta={`Suma nouă — total cu TVA, lei (acum ${lei(c.totalLei)})`} obligatoriu eroare={eroareCamp(eroare, "totalLei")}>
            <input value={suma} onChange={(e) => setSuma(e.target.value)} inputMode="decimal" style={{ minWidth: 130 }} autoFocus />
          </Camp>
          <Camp eticheta="Motivul (rămâne în istoric)" obligatoriu eroare={eroareCamp(eroare, "motiv")}>
            <input value={motiv} onChange={(e) => setMotiv(e.target.value)} placeholder="ex. discount acordat la livrare, plată cash" style={{ minWidth: 260 }} />
          </Camp>
          <div className="actiuni">
            <button className="buton mic" disabled={ocupat || !suma.trim() || !motiv.trim()}>
              {ocupat ? "Se calculează…" : "Ajustează"}
            </button>
            {!motiv.trim() && suma.trim() !== "" && <span className="explicatie-buton">scrie și motivul</span>}
            <button
              type="button"
              className="buton secundar mic"
              onClick={() => {
                setEdit(false);
                setEroare(null);
              }}
            >
              Renunță
            </button>
          </div>
          {eroare !== null && (
            <div style={{ flexBasis: "100%" }}>
              <Mesaj tip="eroare">
                {textEroare(eroare)}
                {propusa && (
                  <>
                    {" "}
                    <button type="button" className="buton secundar mic" onClick={() => setSuma(propusa.replace(".", ","))}>
                      folosește {lei(propusa)}
                    </button>
                  </>
                )}
              </Mesaj>
            </div>
          )}
          <p className="mic text-secundar" style={{ flexBasis: "100%" }}>
            Produsele, cantitățile și costul rămân cele de la „Comandat”; se recalculează prețurile pe linii, restul de încasat, adaosul din vânzări și tabelul de facturare. Sub achiziție nu se poate.
          </p>
        </form>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ S26b (M8): montatorul de executie si recomandarea pe comanda

const telefonApel = (t: string) => `tel:${t.replace(/\s/g, "")}`;

// Montatorul de executie (cine monteaza si e in santier la livrare): il schimba contul comenzii, orice
// Administrator si Gestiunea, cu istoric; completat, cere telefonul. „același ca recomandarea” la un clic.
function MontatorExecutie({ c, dupa }: { c: ComandaDetaliu; dupa: () => Promise<void> }) {
  const [edit, setEdit] = useState(false);
  const [nume, setNume] = useState("");
  const [telefon, setTelefon] = useState("");
  const [mentiuni, setMentiuni] = useState("");
  const [eroare, setEroare] = useState<unknown>(null);
  const [ocupat, setOcupat] = useState(false);
  const salveaza = async (m: { nume: string; telefon: string } | null) => {
    setEroare(null);
    setOcupat(true);
    try {
      await apiComenzi.montator(c.id, m, mentiuni.trim() || null);
      setEdit(false);
      setMentiuni("");
      await dupa();
    } catch (err) {
      setEroare(err);
    } finally {
      setOcupat(false);
    }
  };
  const caRecomandarea = () => {
    if (!c.recomandare) return;
    if (c.recomandare.telefon) void salveaza({ nume: c.recomandare.nume, telefon: c.recomandare.telefon });
    else {
      // recomandarea n-are telefon: numele se preia, telefonul se scrie
      setNume(c.recomandare.nume);
      setTelefon("");
      setEdit(true);
    }
  };
  return (
    <div>
      <p>
        <strong>Montator (execuție):</strong>{" "}
        {c.montator ? (
          <>
            {c.montator.nume}
            {c.montator.telefon && (
              <>
                {" "}
                · <a href={telefonApel(c.montator.telefon)}>{c.montator.telefon}</a>
              </>
            )}
          </>
        ) : (
          <span className="text-secundar">necompletat</span>
        )}
        {c.drepturi.montator && !edit && (
          <>
            <button
              className="buton secundar mic"
              style={{ marginLeft: 8 }}
              disabled={ocupat}
              onClick={() => {
                setNume(c.montator?.nume ?? "");
                setTelefon(c.montator?.telefon ?? "");
                setEdit(true);
              }}
            >
              {c.montator ? "Schimbă" : "Completează"}
            </button>
            {!c.montator && c.recomandare && (
              <button className="buton secundar mic" style={{ marginLeft: 6 }} disabled={ocupat} onClick={caRecomandarea}>
                același ca recomandarea
              </button>
            )}
          </>
        )}
      </p>
      {edit && (
        <form
          className="formular-mic"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void salveaza({ nume: nume.trim(), telefon: telefon.trim() });
          }}
        >
          <Camp eticheta="Nume" obligatoriu eroare={eroareCamp(eroare, "montator.nume")}>
            <input value={nume} onChange={(e) => setNume(e.target.value)} autoFocus />
          </Camp>
          <Camp eticheta="Telefon (îl sună șoferul)" obligatoriu eroare={eroareCamp(eroare, "montator.telefon")}>
            <input type="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} />
          </Camp>
          <Camp eticheta="Mențiuni">
            <input value={mentiuni} onChange={(e) => setMentiuni(e.target.value)} />
          </Camp>
          <div className="actiuni">
            <button className="buton mic" disabled={ocupat || !nume.trim() || !telefon.trim()}>
              Salvează
            </button>
            {nume.trim() !== "" && !telefon.trim() && <span className="explicatie-buton">scrie și telefonul</span>}
            {c.montator && (
              <button type="button" className="buton secundar mic sterge" disabled={ocupat} onClick={() => void salveaza(null)}>
                Scoate
              </button>
            )}
            <button type="button" className="buton secundar mic" onClick={() => setEdit(false)}>
              Renunță
            </button>
          </div>
          {eroare !== null && (
            <div style={{ flexBasis: "100%" }}>
              <Mesaj tip="eroare">{textEroare(eroare)}</Mesaj>
            </div>
          )}
        </form>
      )}
      {!edit && eroare !== null && <Mesaj tip="eroare">{textEroare(eroare)}</Mesaj>}
    </div>
  );
}

// Recomandarea (cine a adus lucrarea; comisionul ei e dedesubt): o schimba contul ofertei si
// Administratorul firmei, cu istoric; alimenteaza „Sursa recomandării” din tabelul de vanzari
function Recomandare({ c, dupa }: { c: ComandaDetaliu; dupa: () => Promise<void> }) {
  const [edit, setEdit] = useState(false);
  const [nume, setNume] = useState("");
  const [telefon, setTelefon] = useState("");
  const [eroare, setEroare] = useState<unknown>(null);
  const [ocupat, setOcupat] = useState(false);
  const salveaza = async (r: { nume: string; telefon: string | null } | null) => {
    setEroare(null);
    setOcupat(true);
    try {
      await apiComenzi.recomandare(c.id, r, null);
      setEdit(false);
      await dupa();
    } catch (err) {
      setEroare(err);
    } finally {
      setOcupat(false);
    }
  };
  return (
    <div>
      <p>
        <strong>Recomandare:</strong>{" "}
        {c.recomandare ? (
          <>
            {c.recomandare.nume}
            {c.recomandare.telefon ? ` · ${c.recomandare.telefon}` : ""}
          </>
        ) : (
          <span className="text-secundar">fără recomandare</span>
        )}
        {c.drepturi.recomandare && !edit && (
          <button
            className="buton secundar mic"
            style={{ marginLeft: 8 }}
            onClick={() => {
              setNume(c.recomandare?.nume ?? "");
              setTelefon(c.recomandare?.telefon ?? "");
              setEdit(true);
            }}
          >
            {c.recomandare ? "Schimbă" : "Completează"}
          </button>
        )}
      </p>
      {edit && (
        <form
          className="formular-mic"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void salveaza({ nume: nume.trim(), telefon: telefon.trim() || null });
          }}
        >
          <Camp eticheta="Cine a adus lucrarea" obligatoriu eroare={eroareCamp(eroare, "recomandare.nume")}>
            <input value={nume} onChange={(e) => setNume(e.target.value)} autoFocus />
          </Camp>
          <Camp eticheta="Telefon">
            <input type="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} />
          </Camp>
          <div className="actiuni">
            <button className="buton mic" disabled={ocupat || !nume.trim()}>
              Salvează
            </button>
            {c.montator && (
              <button
                type="button"
                className="buton secundar mic"
                onClick={() => {
                  setNume(c.montator!.nume);
                  setTelefon(c.montator!.telefon ?? "");
                }}
              >
                același ca montatorul
              </button>
            )}
            {c.recomandare && (
              <button type="button" className="buton secundar mic sterge" disabled={ocupat} onClick={() => void salveaza(null)}>
                Scoate
              </button>
            )}
            <button type="button" className="buton secundar mic" onClick={() => setEdit(false)}>
              Renunță
            </button>
          </div>
          {eroare !== null && (
            <div style={{ flexBasis: "100%" }}>
              <Mesaj tip="eroare">{textEroare(eroare)}</Mesaj>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ S20: comisionul montatorului / recomandarii (cap. 4)

function Comision({ c, ocupat, ruleaza }: { c: ComandaDetaliu; ocupat: boolean; ruleaza: (f: () => Promise<unknown>) => Promise<void> }) {
  const [edit, setEdit] = useState(false);
  const [suma, setSuma] = useState(c.comision?.lei ?? "");
  const [mentiuni, setMentiuni] = useState("");
  const modificat = c.istoric.some((i) => i.tip === "suma" && i.camp === "comisionLei");
  return (
    <div className="comision">
      <p>
        <strong>Comision recomandare:</strong>{" "}
        {c.comision ? (
          <>
            {lei(c.comision.lei)}
            {modificat && (
              <span className="asterisc" title="modificat — vezi istoricul">
                *
              </span>
            )}
            {c.drepturi.bani && Number(c.comision.lei) > 0 ? (
              <label className="mic" style={{ marginLeft: 8 }}>
                <input type="checkbox" checked={c.comision.achitat} disabled={ocupat} onChange={(e) => void ruleaza(() => apiComenzi.comisionAchitat(c.id, e.target.checked))} /> achitat
              </label>
            ) : (
              <span className="mic text-secundar"> · {c.comision.achitat ? "achitat" : "neachitat"}</span>
            )}
            {c.comision.achitat && c.comision.achitatDe && (
              <span className="mic text-secundar">
                {" "}
                ({c.comision.achitatDe}, {dataRo(c.comision.achitatLa)})
              </span>
            )}
          </>
        ) : (
          <span className="text-secundar">fără comision</span>
        )}
      </p>
      {c.drepturi.comision && !edit && (
        <button className="buton secundar mic" onClick={() => setEdit(true)}>
          Modifică comisionul
        </button>
      )}
      {edit && (
        <form
          className="formular-mic"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void ruleaza(() => apiComenzi.comision(c.id, suma.trim() === "" ? null : suma.trim(), mentiuni.trim() || null)).then(() => setEdit(false));
          }}
        >
          <Camp eticheta="Comision (lei)">
            <input value={suma} onChange={(e) => setSuma(e.target.value)} inputMode="decimal" style={{ minWidth: 110 }} />
          </Camp>
          <Camp eticheta="Mențiuni">
            <input value={mentiuni} onChange={(e) => setMentiuni(e.target.value)} />
          </Camp>
          <button className="buton mic" disabled={ocupat}>
            Salvează
          </button>
          <button type="button" className="buton secundar mic" onClick={() => setEdit(false)}>
            Renunță
          </button>
        </form>
      )}
    </div>
  );
}
