import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  apiFirme,
  apiOferte,
  apiUtilizatori,
  dataRo,
  ETICHETA_STATUS,
  momentRelativ,
  STATUSURI_OFERTA,
  apiPreturi,
  apiStatus,
  type FiltreOferte,
  type Firma,
  type ListaOferte,
  type RandOferta,
  type StatusOferta,
  type UtilizatorAdmin,
} from "../api";
import { MeniuActiuni } from "../components/MeniuActiuni";
import { Ajutor, Camp, Mesaj, textEroare } from "../components/ui";
import { useUtilizator } from "../contextUtilizator";

// Lista de oferte (FISA-OFERTARE cap. 15, macheta docs/design/ecran-lista-oferte):
// cautare intr-o casuta, filtre, coloanele din fisa, ordinea cronologica cu
// blocul "Comandat" la sfarsit, completarile indentate, cine vede ce.

type Perioada = "90" | "luna" | "an" | "interval";

function perioadaInDate(p: Perioada, deLa: string, panaLa: string): { deLa?: string; panaLa?: string } {
  const azi = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (p === "90") return {};
  if (p === "luna") return { deLa: iso(new Date(azi.getFullYear(), azi.getMonth(), 1)), panaLa: iso(azi) };
  if (p === "an") return { deLa: `${azi.getFullYear()}-01-01`, panaLa: iso(azi) };
  return { ...(deLa ? { deLa } : {}), ...(panaLa ? { panaLa } : {}) };
}

export function Oferte() {
  const eu = useUtilizator();
  const navigate = useNavigate();
  const adminGeneral = eu.rol === "ADMIN_GENERAL";
  const administrator = eu.rol === "ADMINISTRATOR";
  const faceOferte = administrator || eu.rol === "AGENT" || eu.rol === "COLABORATOR";
  const vedeAgent = adminGeneral || administrator;

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusOferta | "">("");
  const [perioada, setPerioada] = useState<Perioada>("90");
  const [deLa, setDeLa] = useState("");
  const [panaLa, setPanaLa] = useState("");
  const [agent, setAgent] = useState("");
  const [firmaId, setFirmaId] = useState("");
  const [clientMultiplu, setClientMultiplu] = useState(false);
  const [page, setPage] = useState(1);
  const [agenti, setAgenti] = useState<UtilizatorAdmin[]>([]);
  const [firme, setFirme] = useState<Firma[]>([]);
  const [rezultat, setRezultat] = useState<ListaOferte | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);

  useEffect(() => {
    if (administrator) apiUtilizatori.lista().then(({ utilizatori }) => setAgenti(utilizatori.filter((u) => u.activ))).catch(() => setAgenti([]));
    if (adminGeneral) apiFirme.lista().then(({ firme }) => setFirme(firme)).catch(() => setFirme([]));
  }, [administrator, adminGeneral]);

  useEffect(() => {
    const filtre: FiltreOferte = { q: q.trim() || undefined, status: status || undefined, ...perioadaInDate(perioada, deLa, panaLa), page, pageSize: 25 };
    if (administrator && agent) filtre.agent = agent;
    if (adminGeneral && firmaId) filtre.firmaId = firmaId;
    if (adminGeneral && clientMultiplu) filtre.clientMultiplu = true;
    const t = setTimeout(() => {
      apiOferte
        .lista(filtre)
        .then((r) => {
          setRezultat(r);
          setEroare(null);
        })
        .catch((e) => setEroare(textEroare(e)));
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q, status, perioada, deLa, panaLa, agent, firmaId, clientMultiplu, page, administrator, adminGeneral]);

  const n = rezultat?.numaratori;
  const totalPagini = rezultat ? Math.max(1, Math.ceil(rezultat.total / rezultat.pageSize)) : 1;
  const necomandate = rezultat?.oferte.filter((o) => o.status !== "COMANDAT") ?? [];
  const comandate = rezultat?.oferte.filter((o) => o.status === "COMANDAT") ?? [];

  return (
    <>
      <div className="antet-pagina">
        <div>
          <h1 style={{ marginBottom: 4 }}>Oferte</h1>
          {n && (
            <span className="text-secundar">
              {n.total} oferte · {n.inLucru} în lucru · {n.deComandat} de comandat · {n.comandate} comandate
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
            placeholder="Caută după client, telefon, număr ofertă, localitate…"
            aria-label="Caută"
            style={{ minWidth: 320 }}
          />
          <Link className="buton secundar" to="/oferte/afla-pret">
            Află preț
          </Link>
          {faceOferte && (
            <Link className="buton" to="/oferte/noua">
              + Ofertă nouă
            </Link>
          )}
        </div>
      </div>

      <div className="filtre-status" role="group" aria-label="Status">
        <button className={status === "" ? "activ" : undefined} onClick={() => setStatus("")}>
          Toate
        </button>
        {STATUSURI_OFERTA.map((s) => (
          <button
            key={s}
            className={status === s ? "activ" : undefined}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
          >
            {ETICHETA_STATUS[s]}
          </button>
        ))}
      </div>

      <div className="rand-campuri" style={{ marginBottom: 20 }}>
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
        {administrator && (
          <Camp eticheta="Agent">
            <select value={agent} onChange={(e) => setAgent(e.target.value)}>
              <option value="">Ofertele mele</option>
              <option value="toate">Toți agenții firmei</option>
              {agenti
                .filter((a) => a.id !== eu.id)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nume}
                  </option>
                ))}
            </select>
          </Camp>
        )}
        {adminGeneral && (
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
        {adminGeneral && (
          <label className="camp-bifa">
            <input type="checkbox" checked={clientMultiplu} onChange={(e) => setClientMultiplu(e.target.checked)} />
            <span>Client cu mai multe oferte</span>
          </label>
        )}
      </div>

      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      {rezultat && rezultat.total === 0 && <Mesaj>Nicio ofertă pentru filtrele alese.</Mesaj>}

      {rezultat && rezultat.total > 0 && (
        <>
          <div className="tabel-invelis">
            <table className="tabel">
              <thead>
                <tr>
                  <th>Nr. · data</th>
                  <th>Client</th>
                  <th className="col-optional">Învelitoare</th>
                  <th style={{ textAlign: "right" }}>Total cu TVA</th>
                  <th>Status</th>
                  {vedeAgent && <th className="col-optional">Agent</th>}
                  <th className="col-optional">Modificat</th>
                  <th className="col-optional"></th>
                </tr>
              </thead>
              <tbody>
                {necomandate.map((o) => (
                  <RandOfertaGrup key={o.id} oferta={o} vedeAgent={vedeAgent} adminGeneral={adminGeneral} onDeschide={(id) => navigate(`/oferte/${id}`)} />
                ))}
                {comandate.length > 0 && (
                  <tr className="bloc-comandate">
                    <td colSpan={vedeAgent ? 8 : 7}>Comandate — la sfârșitul listei, după data comenzii</td>
                  </tr>
                )}
                {comandate.map((o) => (
                  <RandOfertaGrup key={o.id} oferta={o} vedeAgent={vedeAgent} adminGeneral={adminGeneral} onDeschide={(id) => navigate(`/oferte/${id}`)} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="paginare">
            <button className="buton secundar mic" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              ← Anterioara
            </button>
            <span>
              Pagina {page} din {totalPagini} · {rezultat.total} oferte
            </span>
            <button className="buton secundar mic" disabled={page >= totalPagini} onClick={() => setPage(page + 1)}>
              Următoarea →
            </button>
          </div>
        </>
      )}

      <Ajutor>
        <ul>
          <li>Căutarea găsește după numele clientului, telefon (indiferent cum e scris), numărul ofertei (ex. IB-0147) sau localitate. Perioada implicită: ultimele 90 de zile.</li>
          <li>Ordinea: cele mai noi sus, indiferent de status; ofertele comandate trec la sfârșitul listei, după data comenzii. Completările apar indentate sub oferta inițială.</li>
          <li>
            {administrator
              ? "Lista arată implicit ofertele tale; din „Agent” alegi un agent al firmei sau pe toți."
              : adminGeneral
                ? "Vezi toate firmele; filtrul „Firma” și marcajul „Client cu mai multe oferte” (același telefon) sunt doar aici."
                : "Vezi doar ofertele tale."}
          </li>
          <li>„+ Ofertă nouă” cere antetul și clientul și salvează oferta „În lucru”. Prețurile și „Află preț” sunt gata; PDF-urile vin în S16.</li>
          <li>Nimic nu se șterge: o ofertă făcută din greșeală trece la „Neacceptată”.</li>
          <li>La „Avans luat” rândul arată și suma avansului. Meniul ⋯ de pe rând: copiază oferta, creează variantă, completare, legare ca completare, preia prețurile în altă ofertă, istoric, notițe. „PDF ▾” vine în S16.</li>
        </ul>
      </Ajutor>
    </>
  );
}

function RandOfertaGrup({ oferta, vedeAgent, adminGeneral, onDeschide }: { oferta: RandOferta; vedeAgent: boolean; adminGeneral: boolean; onDeschide: (id: string) => void }) {
  return (
    <>
      <RandOfertaTr oferta={oferta} vedeAgent={vedeAgent} adminGeneral={adminGeneral} onDeschide={onDeschide} />
      {(oferta.completari ?? []).map((c) => (
        <RandOfertaTr key={c.id} oferta={c} vedeAgent={vedeAgent} adminGeneral={adminGeneral} onDeschide={onDeschide} completare />
      ))}
    </>
  );
}

function RandOfertaTr({ oferta: o, vedeAgent, adminGeneral, onDeschide, completare }: { oferta: RandOferta; vedeAgent: boolean; adminGeneral: boolean; onDeschide: (id: string) => void; completare?: boolean }) {
  const eu = useUtilizator();
  const faceOferte = eu.rol === "ADMINISTRATOR" || eu.rol === "AGENT" || eu.rol === "COLABORATOR";
  void apiStatus;
  return (
    <tr className={`selectabil ${completare ? "completare" : ""}`} tabIndex={0} onClick={() => onDeschide(o.id)} onKeyDown={(e) => e.key === "Enter" && onDeschide(o.id)}>
      <td className="numar-oferta">
        {completare ? "↳ " : ""}
        {o.numarComplet}
        {o.versiune > 1 ? ` · v${o.versiune}` : ""}
        <div className="mic text-secundar" style={{ fontWeight: 400 }}>
          {dataRo(o.data)}
        </div>
      </td>
      <td>
        {adminGeneral && o.clientMultiplu && <span className="punct-client" title="client cu mai multe oferte" />}
        <strong>{o.client.nume}</strong>
        <div className="mic text-secundar">
          {o.completareLa ? `completare la ${o.completareLa.numarComplet}${o.completareLa.motiv ? ` · ${o.completareLa.motiv}` : ""}` : [o.client.localitate, o.client.telefon].filter(Boolean).join(" · ")}
        </div>
      </td>
      <td className="col-optional text-secundar">{o.invelitoare ?? "—"}</td>
      <td className="total-oferta">
        <span className="numar-mare">{o.totalCuTvaEur ? `${o.totalCuTvaEur} €` : "—"}</span>
        <div className="mic text-secundar">{o.totalLei ? `${o.totalLei} lei` : ""}</div>
      </td>
      <td>
        <span className={`status-oferta ${o.status}`}>{ETICHETA_STATUS[o.status]}</span>
        {o.status === "AVANS_LUAT" && o.avansLei !== null && <div className="mic">avans {o.avansLei} lei</div>}
        {o.avertizareCurs && (
          <div className="mic" style={{ color: "var(--avertizare-text)" }}>
            ⚠ {o.avertizareCurs.split(":")[0]}
          </div>
        )}
      </td>
      {vedeAgent && <td className="col-optional">{o.agent.nume}</td>}
      <td className="col-optional mic text-secundar">{momentRelativ(o.modificatLa)}</td>
      <td className="col-optional" onClick={(e) => e.stopPropagation()}>
        <div className="actiuni" style={{ gap: 6 }}>
          <button className="buton secundar mic" onClick={() => onDeschide(o.id)}>
            Deschide
          </button>
          <MeniuActiuni eticheta="PDF ▾" actiuni={[{ eticheta: "Ofertă", dezactivat: "vine în S16" }, { eticheta: "Rezumat", dezactivat: "vine în S16" }, { eticheta: "Ofertă detaliată", dezactivat: "vine în S16" }, { eticheta: "Tabel de facturare", dezactivat: "vine în S16" }]} />
          <MeniuActiuni
            actiuni={[
              { eticheta: "Copiază oferta", onClick: () => onDeschide(`${o.id}?actiune=copie`), dezactivat: faceOferte ? undefined : "doar conturile care fac oferte" },
              { eticheta: "Creează variantă", onClick: () => void apiPreturi.varianta(o.id).then((r) => onDeschide(r.oferta.id)).catch((e) => window.alert(textEroare(e))), dezactivat: o.status === "COMANDAT" ? "oferta e comandată" : faceOferte ? undefined : "doar conturile care fac oferte" },
              { eticheta: "Completare la această ofertă", onClick: () => onDeschide(`${o.id}?actiune=completare`), dezactivat: o.completareLa ? "e ea însăși o completare" : faceOferte ? undefined : "doar conturile care fac oferte" },
              { eticheta: "Leagă ca completare la…", onClick: () => onDeschide(`${o.id}?actiune=legare`), dezactivat: o.completareLa ? `e deja completare la ${o.completareLa.numarComplet}` : faceOferte ? undefined : "doar conturile care fac oferte" },
              { eticheta: "Preia prețurile în altă ofertă", onClick: () => onDeschide(`${o.id}?actiune=preia-in`) },
              { eticheta: "Istoric", onClick: () => onDeschide(`${o.id}#istoric`) },
              { eticheta: "Notițe și atașamente", onClick: () => onDeschide(`${o.id}#notite`) },
            ]}
          />
        </div>
      </td>
    </tr>
  );
}
