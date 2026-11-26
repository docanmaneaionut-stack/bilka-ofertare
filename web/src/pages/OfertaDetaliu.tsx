import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiDocumente, apiFormulareBilka, apiOferte, apiOptiuni, apiPreturi, apiStatus, dataRo, EroareCerere, ETICHETA_STATUS, type Client, type ClientDate, type OfertaDetaliu as Oferta, type SursaPreluare, type TipDocument } from "../api";
import { DialogLivrareBilka } from "../components/DialogLivrareBilka";
import { clientGol, dinClient, FormularClient } from "../components/FormularClient";
import { MeniuActiuni, type ActiuneMeniu } from "../components/MeniuActiuni";
import { Ajutor, Camp, eroareCamp, Mesaj, textEroare } from "../components/ui";
import { lei, nr } from "../lib/numere";
import { Documente, ETICHETA_TIP } from "./oferta/Documente";
import { ancoraFilei, FILA_IMPLICITA, FILE, filaDinAncora, filaDinTasta, motivPlecare, rezumatFile, stareaSalvarii, type Fila, type StareSalvareProduse } from "./oferta/file";
import { Istoric, NotiteAtasamente } from "./oferta/IstoricNotite";
import { Montator } from "./oferta/Montator";
import { Preturi } from "./oferta/Preturi";
import type { Problema } from "./oferta/probleme";
import { idRubricaPeEcran } from "./oferta/rubrici";
import { Produse } from "./oferta/Produse";
import { Statusuri } from "./oferta/Statusuri";
import { Structura } from "./oferta/Structura";

// Pagina ofertei: antetul si clientul, statusurile (cap. 14), zona produselor
// (cap. 3-10), preturile (cap. 11), montatorul / recomandarea (cap. 12), istoricul,
// notitele si atasamentele (cap. 14), varianta, completarea si legarea ulterioara
// (cap. 2b), copierea (cap. 15). Documentele (PDF) vin in S16.
//
// S29 (MODIFICAREA M12, docs/MODIFICARI-S29.md v1.3): pagina e pe TREI FILE, sub trei randuri fixe -
// randul ofertei (numar, client, total, starea salvarii, butoanele paginii, „Salvează”), randul statusurilor
// (toate la vedere, un clic schimba statusul) si randul filelor: 1 Date generale (client, antet, recomandare,
// montator, livrarea de la Bilka, notite, istoric) · 2 Produse (invelitori, rubrici, zona B) · 3 Preturi si
// documente (rezultat, preturi, documente). Toate filele sunt incarcate si doar se arata / ascund: nimic nu
// se pierde la schimbarea filei si fiecare isi tine locul de derulare. E doar asezarea ecranului - calculul,
// datele, regulile statusurilor si drepturile sunt cele de pana acum.
export function OfertaDetaliu() {
  const { id } = useParams<{ id: string }>();
  const [parametri, setParametri] = useSearchParams();
  const [oferta, setOferta] = useState<Oferta | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  // eroarea cererii de salvare a antetului / clientului: motivele la camp (BUG-4)
  const [eroareFormular, setEroareFormular] = useState<unknown>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [client, setClient] = useState<ClientDate>(clientGol());
  const [data, setData] = useState("");
  const [sursaClient, setSursaClient] = useState("");
  const [note, setNote] = useState("");
  const [adresaLucrarii, setAdresaLucrarii] = useState("");
  const [localitate, setLocalitate] = useState("");
  const [seSalveaza, setSeSalveaza] = useState(false);
  const [surseClient, setSurseClient] = useState<string[]>([]);
  const [motive, setMotive] = useState<string[]>([]);
  const [dialog, setDialog] = useState<"completare" | "legare" | "preia-in" | "copie" | null>(null);
  const [motiv, setMotiv] = useState({ motiv: "", text: "" });
  const [cautare, setCautare] = useState("");
  const [surse, setSurse] = useState<SursaPreluare[]>([]);
  const [clientCopie, setClientCopie] = useState<ClientDate>(clientGol());
  const [mentiuni, setMentiuni] = useState("");
  const [lucru, setLucru] = useState<string | null>(null);
  const [reincarcaIstoric, setReincarcaIstoric] = useState(0);
  const navigate = useNavigate();
  // S26a (M6): propunerea de legare - telefonul completat e deja al unui client existent;
  // clientul ales din sugestii se leaga direct (alegerea lui e raspunsul)
  const [propunere, setPropunere] = useState<Client | null>(null);
  const [alesExistent, setAlesExistent] = useState(false);
  // S27 (BUG-15): clientul ales din sugestii (si pe nume) - id-ul lui pleaca odata cu salvarea
  const [alesClient, setAlesClient] = useState<Client | null>(null);
  // S26a (M7): generarea formularului fara alegerea livrarii deschide dialogul
  const [dialogLivrare, setDialogLivrare] = useState(false);

  // ------------------------------------------------------------- S29 (M12): filele
  const [fila, setFila] = useState<Fila>(() => filaDinAncora(window.location.hash) ?? FILA_IMPLICITA);
  // locul de derulare al fiecarei file; "tinta" = unde se merge dupa schimbarea filei (rubrica, camp)
  const pozitii = useRef<Record<Fila, number>>({ generale: 0, produse: 0, preturi: 0 });
  const tinta = useRef<{ id?: string; focus?: string; problema?: Problema } | null>(null);
  const refFix = useRef<HTMLDivElement>(null);
  // locurile din pagina in care alte componente isi pun bucatile (bara de rubrici; din Statusuri: livrarea, comanda)
  const [slotBara, setSlotBara] = useState<HTMLElement | null>(null);
  const [slotLivrare, setSlotLivrare] = useState<HTMLElement | null>(null);
  const [slotComanda, setSlotComanda] = useState<HTMLElement | null>(null);
  // starea salvarii produselor (salvare automata) si salvarea ei pe loc, la „Salvează”
  const [salvareProduse, setSalvareProduse] = useState<StareSalvareProduse>("salvat");
  // S29b: „Salvează” / poarta dinaintea actiunilor primesc inapoi ce opreste (refuzul salvarii, un rand incomplet)
  const salvareAcum = useRef<(() => Promise<Problema | null>) | null>(null);
  const duLaProblema = useRef<((p: Problema) => void) | null>(null);
  const [problemeProduse, setProblemeProduse] = useState<{ refuz: Problema | null; incomplet: Problema | null }>({ refuz: null, incomplet: null });

  const laTinta = () => {
    const t = tinta.current;
    tinta.current = null;
    if (!t) return;
    requestAnimationFrame(() => {
      if (t.id) document.getElementById(t.id)?.scrollIntoView({ block: "start" });
      if (t.focus) document.querySelector<HTMLElement>(t.focus)?.focus();
      if (t.problema) duLaProblema.current?.(t.problema);
    });
  };
  // schimba fila (tinandu-i locul celei parasite) si, optional, merge la o rubrica / un camp din ea
  const mergiLa = (noua: Fila, spre?: { id?: string; focus?: string; problema?: Problema }) => {
    tinta.current = spre ?? null;
    if (noua === fila) {
      laTinta();
      return;
    }
    pozitii.current[fila] = window.scrollY;
    setFila(noua);
  };
  const mergiLaCurent = useRef(mergiLa);
  mergiLaCurent.current = mergiLa;

  // dupa schimbarea filei: adresa tine fila (reincarcarea revine in ea), iar pagina revine la locul filei
  useLayoutEffect(() => {
    if (window.location.hash !== ancoraFilei(fila)) window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}${ancoraFilei(fila)}`);
    if (tinta.current) laTinta();
    else window.scrollTo(0, pozitii.current[fila]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fila, parametri]);

  // Alt + 1 / 2 / 3 schimba fila
  useEffect(() => {
    const laTasta = (e: KeyboardEvent) => {
      const noua = filaDinTasta(e);
      if (!noua) return;
      e.preventDefault();
      mergiLaCurent.current(noua);
    };
    window.addEventListener("keydown", laTasta);
    return () => window.removeEventListener("keydown", laTasta);
  }, []);

  // inaltimea randurilor fixe: saltul la o rubrica o aduce sub ele, nu dedesubtul lor
  const incarcata = oferta !== null;
  useEffect(() => {
    const el = refFix.current;
    if (!el) return;
    const masoara = () => document.documentElement.style.setProperty("--inaltime-fix", `${Math.ceil(el.getBoundingClientRect().height)}px`);
    const observator = new ResizeObserver(masoara);
    observator.observe(el);
    masoara();
    return () => {
      observator.disconnect();
      document.documentElement.style.removeProperty("--inaltime-fix");
    };
  }, [incarcata]);

  // S16b: formularele de comanda Bilka - un .xlsm per formular, de la "De comandat" si la
  // "Comandat"; raman in panoul "Documente", avertizarile (produse fara loc) se arata aici
  const [avertizariFormulare, setAvertizariFormulare] = useState<string[]>([]);
  const [cereFormulare, setCereFormulare] = useState(false);
  useEffect(() => {
    if (!cereFormulare || !oferta) return;
    setCereFormulare(false);
    void formulareBilka();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cereFormulare, oferta]);
  async function formulareBilka(livrareAleasa = false) {
    if (!oferta) return;
    if (!(await inainteDeActiune())) return;
    setEroare(null);
    setAvertizariFormulare([]);
    if (oferta.status === "DE_COMANDAT" && !oferta.livrareBilka && !livrareAleasa) {
      setDialogLivrare(true);
      return;
    }
    setLucru("formulare");
    try {
      const r = await apiFormulareBilka.genereaza(oferta.id);
      setMesaj(`Formulare Bilka generate: ${r.documente.map((d) => d.nume).join(", ")} — le găsești în panoul „Documente”. Deschide fișierul în Excel, verifică-l și salvează-l înainte de a-l trimite.`);
      setAvertizariFormulare(r.avertizari);
      setReincarcaIstoric((n) => n + 1);
      mergiLa("preturi", { id: "documente" });
    } catch (err) {
      if (err instanceof EroareCerere && err.campuri.some((c) => c.camp === "livrareBilka")) setDialogLivrare(true);
      else setEroare(textEroare(err));
    } finally {
      setLucru(null);
    }
  }

  // "PDF ▾": genereaza documentul si il deschide; ramane in lista documentelor ofertei
  async function pdf(tip: TipDocument) {
    if (!oferta) return;
    if (!(await inainteDeActiune())) return;
    setEroare(null);
    setLucru(`pdf-${tip}`);
    try {
      const { document } = await apiDocumente.genereaza(oferta.id, tip);
      window.open(apiDocumente.cale(oferta.id, document.id), "_blank", "noopener");
      setReincarcaIstoric((n) => n + 1);
    } catch (err) {
      setEroare(textEroare(err));
    } finally {
      setLucru(null);
    }
  }

  useEffect(() => {
    apiOptiuni.lista("sursa_client").then((r) => setSurseClient(r.optiuni.map((o) => o.valoare))).catch(() => setSurseClient([]));
    apiOptiuni.lista("motiv_completare").then((r) => setMotive(r.optiuni.map((o) => o.valoare))).catch(() => setMotive([]));
  }, []);

  // actiunea ceruta din meniul ⋯ al listei (?actiune=...)
  useEffect(() => {
    const a = parametri.get("actiune");
    if (a === "completare" || a === "legare" || a === "preia-in" || a === "copie") setDialog(a);
    if (a === "formulare") setCereFormulare(true);
    if (a) setParametri({}, { replace: true });
  }, [parametri, setParametri]);

  useEffect(() => {
    if (dialog !== "legare" && dialog !== "preia-in") return;
    if (!oferta) return;
    const t = setTimeout(() => apiPreturi.surse(oferta.id, cautare.trim()).then((r) => setSurse(r.oferte)).catch(() => setSurse([])), 250);
    return () => clearTimeout(t);
  }, [dialog, cautare, oferta]);

  function preia(o: Oferta) {
    setOferta(o);
    setClient(dinClient(o.client));
    setClientCopie(dinClient(o.client));
    setData(o.data);
    setSursaClient(o.sursaClient ?? "");
    setNote(o.note ?? "");
    setAdresaLucrarii(o.adresaLucrarii ?? "");
    setLocalitate(o.localitate ?? "");
    setPropunere(null);
    setAlesExistent(false);
    setAlesClient(null);
    setReincarcaIstoric((n) => n + 1);
  }

  useEffect(() => {
    if (!id) return;
    apiOferte
      .detaliu(id)
      .then(({ oferta }) => preia(oferta))
      .catch((e) => setEroare(textEroare(e)));
  }, [id]);

  async function actiune(ce: string, f: () => Promise<Oferta | void>) {
    setEroare(null);
    setLucru(ce);
    try {
      const o = await f();
      if (o) {
        if (o.id !== id) navigate(`/oferte/${o.id}`);
        else preia(o);
      }
      setDialog(null);
    } catch (err) {
      setEroare(textEroare(err));
    } finally {
      setLucru(null);
    }
  }

  // "legare" = raspunsul la propunerea de legare (antetul e deja salvat atunci).
  // S29 (M12): cand ceva opreste salvarea (un camp gresit, propunerea de legare), pagina trece in fila
  // "Date generale", la client, cu cursorul pe primul camp cu problema (regula BUG-4)
  async function salveaza(e: FormEvent | null, legare?: "leaga" | "pastreaza"): Promise<boolean> {
    e?.preventDefault();
    if (!oferta) return false;
    setEroare(null);
    setEroareFormular(null);
    setMesaj(null);
    setPropunere(null);
    setSeSalveaza(true);
    try {
      const m = mentiuni.trim() || null;
      if (!legare) await apiOferte.antet(oferta.id, { data, sursaClient: sursaClient || null, note: note || null, adresaLucrarii: adresaLucrarii || null, localitate: localitate || null, mentiuni: m });
      const raspuns = legare ?? (alesExistent ? "leaga" : undefined);
      const { oferta: dupa } = await apiOferte.client(oferta.id, { ...client, mentiuni: m, ...(raspuns ? { legare: raspuns } : {}), ...(alesClient ? { clientExistentId: alesClient.id } : {}) });
      preia(dupa);
      setMesaj("Antetul și clientul au fost salvate.");
      return true;
    } catch (err) {
      if (err instanceof EroareCerere && err.propunereLegare) {
        setPropunere(err.propunereLegare);
        mergiLa("generale", { id: "client" });
      } else {
        setEroare(textEroare(err));
        setEroareFormular(err);
        mergiLa("generale", { focus: "#fila-generale .camp.cu-eroare input, #fila-generale .camp.cu-eroare select" });
      }
      return false;
    } finally {
      setSeSalveaza(false);
    }
  }

  // antetul si clientul sunt singurele care nu se salveaza singure: modificate = "nesalvat"
  function antetNesalvat(): boolean {
    if (!oferta || !oferta.poateModifica) return false;
    return data !== oferta.data || sursaClient !== (oferta.sursaClient ?? "") || note !== (oferta.note ?? "") || adresaLucrarii !== (oferta.adresaLucrarii ?? "") || localitate !== (oferta.localitate ?? "") || JSON.stringify(client) !== JSON.stringify(dinClient(oferta.client));
  }

  // S29b (decizia 2): inaintea schimbarii statusului, a oricarei generari de document si a actiunilor din „⋯”
  // (copiere, varianta, completare, preluare de preturi), pagina trimite intai ce e nesalvat. Daca salvarea e
  // refuzata sau exista un rand incomplet, se opreste si duce la rand. Regulile statusurilor de pe server
  // raman neatinse: e doar ordinea in care pagina face lucrurile.
  async function inainteDeActiune(): Promise<boolean> {
    if (!oferta || !oferta.poateModifica) return true;
    const p = (await salvareAcum.current?.()) ?? null;
    if (p) {
      setMesaj(null);
      setEroare(p.fel === "refuz" ? `Oferta NU e salvată — ${p.text}. Corectează rândul, apoi reia acțiunea.` : `${p.text}. Completează rândul sau golește-l, apoi reia acțiunea.`);
      mergiLa("produse", { problema: p });
      return false;
    }
    if (antetNesalvat()) return salveaza(null);
    return true;
  }
  const cuPoarta = (f: () => void) => () => void inainteDeActiune().then((ok) => (ok ? f() : undefined));

  // S29b (decizia 1): avertizarea la plecarea din pagina cu ceva nesalvat pe care pagina nu-l poate salva singura
  const motivDePlecare = oferta?.poateModifica ? motivPlecare({ produse: salvareProduse, antetModificat: antetNesalvat(), randIncomplet: problemeProduse.incomplet !== null }) : null;
  const motivCurent = useRef<string | null>(null);
  motivCurent.current = motivDePlecare;
  useEffect(() => {
    // inchiderea / reincarcarea filei de browser
    const laInchidere = (e: BeforeUnloadEvent) => {
      if (!motivCurent.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    // legaturile din aplicatie (meniul de sus, „← Oferte”, linkurile din pagina)
    const laClic = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.origin !== window.location.origin || a.hasAttribute("download")) return;
      if (a.pathname === window.location.pathname) return;
      if (motivCurent.current && !window.confirm(motivCurent.current)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", laInchidere);
    document.addEventListener("click", laClic, true);
    return () => {
      window.removeEventListener("beforeunload", laInchidere);
      document.removeEventListener("click", laClic, true);
    };
  }, []);

  if (eroare && !oferta) return <Mesaj tip="eroare">{eroare}</Mesaj>;
  if (!oferta) return null;
  const c = oferta.curs;
  const comandata = oferta.status === "COMANDAT";
  const poateSume = oferta.poateModificaSume ?? oferta.poateModifica;
  const deschideMotiv = (d: "completare" | "legare") => {
    setMotiv({ motiv: motive[0] ?? "", text: "" });
    setCautare("");
    setDialog(d);
  };

  const antetModificat = antetNesalvat();
  const stare = stareaSalvarii({ produse: salvareProduse, antetModificat, seSalveaza });
  // „Salvează” din randul ofertei: salveaza tot ce e nesalvat, din orice fila
  const salveazaTot = async () => {
    await salvareAcum.current?.();
    if (antetModificat) await salveaza(null);
  };
  // plecarea din pagina din butoanele ei (pe telefon „← Oferte” e in „⋯”): aceeasi intrebare ca la legaturi
  const pleaca = (cale: string) => {
    if (!motivDePlecare || window.confirm(motivDePlecare)) navigate(cale);
  };

  const refuzProduse = salvareProduse === "eroare" ? problemeProduse.refuz : null;
  const rezumate = rezumatFile(oferta, { produseNesalvate: salvareProduse === "eroare" });
  const total = oferta.preturi?.rezultat ? lei(oferta.preturi.rezultat.totaluri.documentTotalLei) : null;
  const pretAjustat = comandata && Boolean(oferta.comanda?.pretAjustat);
  const formulareLaVedere = oferta.status === "DE_COMANDAT" || comandata;
  const etichetaFormulare = `Formulare Bilka${oferta.structura?.rezultat ? ` (${oferta.structura.rezultat.formulareBilka.length})` : ""}`;
  const faraProduse = oferta.invelitori.length === 0 && oferta.linii.length === 0;
  const actiuniPdf: ActiuneMeniu[] = (["OFERTA", "REZUMAT", "DETALIATA", "TABEL_FACTURARE"] as TipDocument[]).map((tip) => ({
    eticheta: `${ETICHETA_TIP[tip]} (PDF)`,
    explicatie: tip === "TABEL_FACTURARE" ? "intern, în lei" : undefined,
    onClick: () => void pdf(tip),
    dezactivat: faraProduse ? "oferta nu are încă produse" : lucru ? "se generează alt document" : undefined,
  }));
  // pe telefon randul ofertei tine doar numarul, totalul, „Salvează” si „⋯”: restul butoanelor paginii sunt in „⋯”
  const actiuniTelefon: ActiuneMeniu[] = [
    { eticheta: "← Oferte", onClick: () => pleaca("/oferte"), clasa: "doar-telefon" },
    { eticheta: "Află preț", onClick: () => pleaca("/oferte/afla-pret"), clasa: "doar-telefon" },
    ...(formulareLaVedere ? [{ eticheta: etichetaFormulare, explicatie: "generează formularele de comandă Bilka (.xlsm)", onClick: () => void formulareBilka(), dezactivat: lucru ? "se generează alt document" : undefined, clasa: "doar-telefon" }] : []),
    ...actiuniPdf.map((a) => ({ ...a, clasa: "doar-telefon" })),
  ];
  const campMentiuni = oferta.areIstoric && poateSume && (
    <div className="rand-campuri mentiuni-istoric">
      <Camp eticheta="Mențiuni pentru istoric (se notează la fiecare modificare de acum încolo)">
        <input type="text" value={mentiuni} onChange={(e) => setMentiuni(e.target.value)} placeholder="de ce se schimbă: cererea clientului, corectură…" />
      </Camp>
    </div>
  );

  return (
    <>
      {/* ------------------------------------------------ cele trei randuri fixe (+ bara de rubrici, in fila Produse) */}
      <div className="oferta-fix" ref={refFix}>
        <div className="rand-oferta">
          <div className="rand-oferta-stanga">
            <h1>
              {oferta.numarComplet}
              {oferta.versiune > 1 ? ` · varianta ${oferta.versiune}` : ""}
            </h1>
            <span className="client-oferta">
              {oferta.client.nume}
              {(oferta.localitate ?? oferta.client.localitate) ? ` · ${oferta.localitate ?? oferta.client.localitate}` : ""}
            </span>
            {!oferta.client.telefon && (
              <span className="eticheta-fara-telefon" title="clientul n-are telefon; se completează înainte de „Comandat”">
                fără telefon
              </span>
            )}
            {pretAjustat && (
              <span className="eticheta-pret-ajustat" title="prețul de vânzare a fost ajustat pe comandă — vezi caseta „Comandă” din Date generale">
                preț ajustat
              </span>
            )}
            <span className="rand-oferta-detalii text-secundar mic">
              {dataRo(oferta.data)} · {oferta.firma.denumire} · {oferta.cont.nume}
              {oferta.completareLa ? (
                <>
                  {" "}
                  · completare la <Link to={`/oferte/${oferta.completareLa.id}`}>{oferta.completareLa.numarComplet}</Link>
                  {oferta.motivCompletare ? ` · ${oferta.motivCompletare}` : ""}
                </>
              ) : null}
            </span>
          </div>
          <div className="actiuni rand-oferta-dreapta">
            {total && (
              <strong className="total-oferta" title="totalul documentului, în lei">
                {total}
              </strong>
            )}
            <span className={`eticheta stare-salvare ${stare.fel}`} aria-live="polite">
              {stare.text}
            </span>
            <Link className="buton secundar doar-lat" to="/oferte">
              ← Oferte
            </Link>
            <Link className="buton secundar doar-lat" to="/oferte/afla-pret">
              Află preț
            </Link>
            {formulareLaVedere && (
              <button className="buton doar-lat" type="button" disabled={lucru !== null} onClick={() => void formulareBilka()} title="Generează formularele de comandă Bilka (.xlsm) din șablonul firmei; la „Comandat” din rezultatul salvat. Deschide fișierul în Excel, verifică-l și salvează-l înainte de a-l trimite.">
                {lucru === "formulare" ? "se generează…" : etichetaFormulare}
              </button>
            )}
            <span className="doar-lat">
              <MeniuActiuni eticheta={lucru?.startsWith("pdf-") ? "se generează…" : "PDF ▾"} actiuni={actiuniPdf} />
            </span>
            <MeniuActiuni
              actiuni={[
                ...actiuniTelefon,
                { eticheta: "Copiază oferta", explicatie: "ofertă nouă cu aceleași produse și prețuri", onClick: cuPoarta(() => setDialog("copie")), dezactivat: poateSume ? undefined : "doar cine a făcut oferta și Administratorul" },
                { eticheta: "Creează variantă", explicatie: "versiune nouă sub același număr, cu adaosul real păstrat", onClick: cuPoarta(() => void actiune("varianta", async () => (await apiPreturi.varianta(oferta.id)).oferta)), dezactivat: comandata ? "oferta e comandată" : oferta.poateModifica ? undefined : "doar cine a făcut oferta și Administratorul" },
                { eticheta: "Completare la această ofertă", explicatie: "ofertă nouă legată de aceasta, fără gardă", onClick: cuPoarta(() => deschideMotiv("completare")), dezactivat: oferta.completareLa ? "oferta e ea însăși o completare" : poateSume ? undefined : "doar cine a făcut oferta și Administratorul" },
                { eticheta: "Leagă ca completare la…", explicatie: "oferta aceasta devine completarea unei oferte inițiale", onClick: cuPoarta(() => deschideMotiv("legare")), dezactivat: oferta.completareLa ? `e deja completare la ${oferta.completareLa.numarComplet}` : poateSume ? undefined : "doar cine a făcut oferta și Administratorul" },
                { eticheta: "Preia prețurile în altă ofertă", explicatie: "aplică prețurile de aici pe o altă ofertă „În lucru”", onClick: cuPoarta(() => setDialog("preia-in")) },
                { eticheta: "Istoric", onClick: () => mergiLa("generale", { id: "istoric" }) },
                { eticheta: "Notițe și atașamente", onClick: () => mergiLa("generale", { id: "notite" }) },
              ]}
            />
            <button className="buton salveaza-oferta" type="button" disabled={!oferta.poateModifica || seSalveaza} onClick={() => void salveazaTot()} title={oferta.poateModifica ? "Salvează tot ce e nesalvat, din orice filă (produsele se salvează și singure)" : comandata ? "Oferta e comandată: nu mai e nimic de salvat aici" : "Oferta o modifică cine a făcut-o și Administratorul firmei"}>
              {seSalveaza ? "Se salvează…" : "Salvează"}
            </button>
          </div>
        </div>

        {refuzProduse && (
          <button type="button" className="banda-nesalvat" role="alert" onClick={() => mergiLa("produse", { problema: refuzProduse })} title="Du-mă la rândul de corectat">
            <strong>Oferta NU e salvată.</strong> <span className="banda-nesalvat-text">{refuzProduse.text}</span> <span className="banda-nesalvat-salt">Du-mă la rând →</span>
          </button>
        )}

        <Statusuri
          oferta={oferta}
          onOferta={preia}
          inainteDeActiune={inainteDeActiune}
          mentiuni={mentiuni}
          slotLivrare={slotLivrare}
          slotComanda={slotComanda}
          onEroareClient={(e) => {
            setEroareFormular(e);
            mergiLa("generale", { id: "client", focus: '#client input[type="tel"]' });
          }}
          onBlocajProduse={() => mergiLa("produse", { id: idRubricaPeEcran("invelitori") })}
        />

        <div className="rand-file" role="tablist" aria-label="Filele ofertei">
          {FILE.map((f) => {
            const r = rezumate[f.id];
            return (
              <button key={f.id} type="button" role="tab" id={`tab-${f.id}`} aria-selected={fila === f.id} aria-controls={`fila-${f.id}`} className={`fila-buton${fila === f.id ? " activa" : ""}`} onClick={() => mergiLa(f.id)} title={`${f.nume} (Alt + ${f.nr})`}>
                <span className="fila-nr">{f.nr}</span>
                <span className="fila-nume">
                  <span className="nume-lung">{f.nume}</span>
                  <span className="nume-scurt">{f.scurt}</span>
                </span>
                <span className={`fila-rezumat${r.lipsa ? " lipsa" : ""}`}>
                  {r.lipsa && <span className="punct-rosu" aria-hidden="true" />}
                  {r.text}
                </span>
              </button>
            );
          })}
        </div>
        <div className="slot-bara-rubrici" ref={setSlotBara} hidden={fila !== "produse"} />
      </div>

      {/* ------------------------------------------------ mesajele paginii si panourile din „⋯”, in orice fila */}
      {c.avertizareCurs && <Mesaj tip="avertizare">{c.avertizareCurs}</Mesaj>}
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      {mesaj && <Mesaj tip="ok">{mesaj}</Mesaj>}
      {avertizariFormulare.length > 0 && (
        <Mesaj tip="avertizare">
          <strong>Formularele Bilka — de verificat în Excel:</strong>
          <ul style={{ margin: "4px 0 0 18px" }}>
            {avertizariFormulare.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </Mesaj>
      )}
      {dialogLivrare && (
        <DialogLivrareBilka
          localitateImplicita={oferta.localitate ?? oferta.client.localitate}
          telefonImplicit={oferta.client.telefon}
          etichetaConfirmare="Salvează și generează formularele"
          nota="Formularele Bilka se generează după alegerea livrării."
          onConfirma={async (alegere) => {
            const { oferta: dupa } = await apiStatus.livrareBilka(oferta.id, alegere, mentiuni.trim() || null);
            preia(dupa);
            setDialogLivrare(false);
            await formulareBilka(true);
          }}
          onRenunta={() => setDialogLivrare(false)}
        />
      )}

      {(dialog === "completare" || dialog === "legare") && (
        <section className="panou">
          <h2>{dialog === "completare" ? `Completare la ${oferta.numarComplet}` : `Leagă ${oferta.numarComplet} ca completare la…`}</h2>
          {dialog === "legare" && (
            <Camp eticheta="Oferta inițială (număr sau client)">
              <input type="search" value={cautare} onChange={(e) => setCautare(e.target.value)} placeholder="IB-0147 sau numele clientului" autoFocus />
            </Camp>
          )}
          <div className="rand-campuri">
            <Camp eticheta="Motivul" obligatoriu>
              <select value={motiv.motiv} onChange={(e) => setMotiv({ ...motiv, motiv: e.target.value })}>
                {motive.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Camp>
            <Camp eticheta="Precizări">
              <input type="text" value={motiv.text} onChange={(e) => setMotiv({ ...motiv, text: e.target.value })} />
            </Camp>
          </div>
          {dialog === "legare" && surse.length > 0 && (
            <ul>
              {surse.map((s) => (
                <li key={s.id}>
                  <button className="buton secundar mic" type="button" disabled={lucru !== null || !motiv.motiv} onClick={() => void actiune("legare", async () => (await apiStatus.leaga(oferta.id, s.id, motiv.motiv, motiv.text || null, mentiuni.trim() || null)).oferta)}>
                    leagă la {s.numarComplet}
                  </button>{" "}
                  {s.client.nume} · {s.data} · {ETICHETA_STATUS[s.status]}
                </li>
              ))}
            </ul>
          )}
          <div className="actiuni">
            {dialog === "completare" && (
              <button className="buton" type="button" disabled={lucru !== null || !motiv.motiv} onClick={() => void actiune("completare", async () => (await apiPreturi.completare(oferta.id, motiv.motiv, motiv.text || null)).oferta)}>
                Creează completarea
              </button>
            )}
            <button className="buton secundar" type="button" onClick={() => setDialog(null)}>
              Renunță
            </button>
          </div>
          <p className="mic text-secundar">
            {dialog === "completare"
              ? "Oferta nouă primește numărul ei, preia clientul, adresa lucrării și sursa; garda nu se aplică (poate fi la 0), iar vânzările se văd pe lucrare."
              : "De la legare, oferta aceasta e completare: garda e oprită, iar vânzările se văd pe lucrarea ofertei inițiale. Se poate lega și după comandă."}
          </p>
        </section>
      )}

      {dialog === "preia-in" && (
        <section className="panou">
          <h2>Preia prețurile din {oferta.numarComplet} în altă ofertă</h2>
          <Camp eticheta="Oferta care preia (număr sau client)">
            <input type="search" value={cautare} onChange={(e) => setCautare(e.target.value)} placeholder="IB-0150 sau numele clientului" autoFocus />
          </Camp>
          {surse.length > 0 && (
            <ul>
              {surse.map((s) => (
                <li key={s.id}>
                  <button className="buton secundar mic" type="button" disabled={lucru !== null} onClick={() => void actiune("preia-in", async () => (await apiPreturi.preia(s.id, oferta.id)).oferta)}>
                    aplică pe {s.numarComplet}
                  </button>{" "}
                  {s.client.nume} · {s.data} · {ETICHETA_STATUS[s.status]}
                </li>
              ))}
            </ul>
          )}
          <div className="actiuni">
            <button className="buton secundar" type="button" onClick={() => setDialog(null)}>
              Renunță
            </button>
          </div>
        </section>
      )}

      {dialog === "copie" && (
        <section className="panou">
          <h2>Copiază {oferta.numarComplet}</h2>
          <p className="mic text-secundar">Ofertă nouă, cu număr nou, aceleași produse și prețuri, „În lucru”, fără istoric. Clientul: același sau altul (vecinul cu un acoperiș asemănător).</p>
          <FormularClient client={clientCopie} onSchimba={setClientCopie} onAlegeExistent={(cl) => setClientCopie(dinClient(cl))} />
          <div className="actiuni">
            <button className="buton" type="button" disabled={lucru !== null} onClick={() => void actiune("copie", async () => (await apiStatus.copie(oferta.id, clientCopie)).oferta)}>
              Creează copia
            </button>
            <button className="buton secundar" type="button" onClick={() => setDialog(null)}>
              Renunță
            </button>
          </div>
        </section>
      )}

      {/* ------------------------------------------------ fila 1: Date generale */}
      <div className="fila" role="tabpanel" id="fila-generale" aria-labelledby="tab-generale" hidden={fila !== "generale"}>
        {campMentiuni}
        <div className="coloane-generale">
          <div>
            {/* caseta "Comandă" (doar la „Comandat”) - o pune randul statusurilor aici */}
            <div ref={setSlotComanda} />
            <form className="formular" onSubmit={(e) => void salveaza(e)}>
              <section className="panou" id="client">
                <h2>
                  Client{" "}
                  <Link className="mic" to={`/clienti/${oferta.client.id}`} style={{ fontWeight: 400 }}>
                    fișa clientului
                  </Link>
                </h2>
                {oferta.poateModifica ? (
                  <FormularClient
                    client={client}
                    onSchimba={(cl) => {
                      setClient(cl);
                      setAlesExistent(false);
                      if (alesClient && cl.nume.trim() !== alesClient.nume.trim()) setAlesClient(null);
                    }}
                    onAlegeExistent={(cl) => {
                      setClient(dinClient(cl));
                      setAlesExistent(true);
                      setAlesClient(cl);
                    }}
                    eroare={eroareFormular}
                    prefix=""
                    clientLegatId={oferta.client.id}
                  />
                ) : (
                  <p>
                    <strong>{oferta.client.nume}</strong> · {oferta.client.telefon ?? "fără telefon"} · {oferta.client.adresa === "-" ? "fără adresă" : oferta.client.adresa}
                    {oferta.client.localitate ? `, ${oferta.client.localitate}` : ""}
                  </p>
                )}
                {propunere && (
                  <Mesaj tip="avertizare">
                    <strong>Este același client?</strong> Telefonul e deja al clientului <Link to={`/clienti/${propunere.id}`}>{propunere.nume}</Link>
                    {propunere.localitate ? ` (${propunere.localitate})` : ""} · {propunere.telefon}.
                    <div className="actiuni" style={{ justifyContent: "flex-start", marginTop: 6, flexWrap: "wrap" }}>
                      <button className="buton mic" type="button" disabled={seSalveaza} onClick={() => void salveaza(null, "leaga")}>
                        Da — leagă oferta de clientul existent
                      </button>
                      <button className="buton secundar mic" type="button" disabled={seSalveaza} onClick={() => void salveaza(null, "pastreaza")}>
                        Nu — e alt client, păstrează-l pe cel nou
                      </button>
                      <button className="buton secundar mic" type="button" onClick={() => setPropunere(null)}>
                        Renunță
                      </button>
                    </div>
                  </Mesaj>
                )}
              </section>

              <section className="panou" id="antet">
                <h2>Antet</h2>
                <div className="rand-campuri">
                  <Camp eticheta="Data ofertei" obligatoriu eroare={eroareCamp(eroareFormular, "data")}>
                    <input type="date" value={data} onChange={(e) => setData(e.target.value)} required disabled={!oferta.poateModifica} />
                  </Camp>
                  <Camp eticheta="Curs BNR (documentul)">
                    <input type="text" value={`${nr(c.cursBnr, 4)} · ${dataRo(c.dataCurs)} · ${c.sursaCurs}`} readOnly />
                  </Camp>
                  <Camp eticheta="Curs de achiziție (BNR × 1,01)">
                    <input type="text" value={nr(c.cursAchizitie, 4)} readOnly />
                  </Camp>
                  <Camp eticheta="Adresa lucrării" eroare={eroareCamp(eroareFormular, "adresaLucrarii")}>
                    <input type="text" value={adresaLucrarii} onChange={(e) => setAdresaLucrarii(e.target.value)} disabled={!oferta.poateModifica} />
                  </Camp>
                  <Camp eticheta="Localitatea lucrării" eroare={eroareCamp(eroareFormular, "localitate")}>
                    <input type="text" value={localitate} onChange={(e) => setLocalitate(e.target.value)} disabled={!oferta.poateModifica} />
                  </Camp>
                  <Camp eticheta="Sursa clientului" eroare={eroareCamp(eroareFormular, "sursaClient")}>
                    <input type="text" list="surse-client" value={sursaClient} onChange={(e) => setSursaClient(e.target.value)} disabled={!oferta.poateModifica} />
                    <datalist id="surse-client">
                      {surseClient.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </Camp>
                  <Camp eticheta="Note" eroare={eroareCamp(eroareFormular, "note")}>
                    <input type="text" value={note} onChange={(e) => setNote(e.target.value)} disabled={!oferta.poateModifica} />
                  </Camp>
                  <Camp eticheta="Lista de preț">
                    <input type="text" value={oferta.listaPret?.denumire ?? "—"} readOnly />
                  </Camp>
                </div>
              </section>

              {oferta.poateModifica ? (
                <>
                  {/* Enter intr-un camp salveaza antetul si clientul, ca pana acum; butonul e „Salvează” din randul ofertei */}
                  <button type="submit" className="ascuns-vizual" tabIndex={-1} aria-hidden="true">
                    Salvează antetul și clientul
                  </button>
                  <p className="explicatie-buton" style={{ marginBottom: 16 }}>
                    Antetul și clientul se salvează cu „Salvează” din rândul de sus (sau cu Enter într-un câmp).
                  </p>
                </>
              ) : (
                <p className="explicatie-buton" style={{ marginBottom: 16 }}>
                  {comandata ? "Oferta e comandată: antetul și clientul sunt înghețate." : "Antetul și clientul le modifică cine a făcut oferta și Administratorul firmei."}
                </p>
              )}
            </form>
          </div>

          <div>
            <Montator oferta={oferta} onOferta={preia} mentiuni={mentiuni} />
            {/* "Livrarea de la Bilka" (cu „Schimbă”) - o pune randul statusurilor aici */}
            <div ref={setSlotLivrare} />
            {oferta.completari.length > 0 && (
              <section className="panou" id="completari">
                <h2>Completări</h2>
                <ul>
                  {oferta.completari.map((cp) => (
                    <li key={cp.id}>
                      <Link to={`/oferte/${cp.id}`}>{cp.numarComplet}</Link> · {ETICHETA_STATUS[cp.status]}
                      {cp.motiv ? ` · ${cp.motiv}` : ""}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <NotiteAtasamente oferta={oferta} />
            <Istoric oferta={oferta} reincarca={reincarcaIstoric} />
          </div>
        </div>

        <Ajutor>
          <ul>
            <li>Pagina ofertei are trei file — Date generale, Produse, Prețuri și documente — sub trei rânduri care rămân la vedere: rândul ofertei, rândul statusurilor și rândul filelor. Fiecare filă își ține locul; Alt + 1 / 2 / 3 schimbă fila. Punctul roșu de pe o filă arată că ceva de acolo ar opri „Comandat”.</li>
            <li>„Salvează” din rândul ofertei salvează tot ce e nesalvat, din orice filă: antetul și clientul (singurele care nu se salvează singure) și produsele aflate în așteptare. Lângă el scrie „salvat” sau „nesalvat”.</li>
            <li>Statusurile se pun în orice ordine, cu revenire, toate cu istoric; doar „Comandat” e ireversibil și îngheață produsele, cantitățile și prețurile. „Avans luat” cere suma; „Acceptată” face varianta curentă.</li>
            <li>Istoricul pornește la „Transmisă”: fiecare modificare (status, produs, cantitate, preț, sumă, client, antet) se notează cu cine, când, înainte / după și mențiunile scrise sus. Sumele modificate poartă asteriscul roșu.</li>
            <li>Telefonul clientului e opțional la ofertă și obligatoriu la „Comandat”. Când completezi un telefon care e deja al altui client, softul întreabă dacă e același client: „Da” leagă oferta de el și îi actualizează fișa; „Nu” păstrează clientul nou.</li>
            <li>La „De comandat” alegi livrarea de la Bilka: la depozitul nostru (formularul pleacă fără localitate și telefon) sau direct în șantier (cu localitatea și telefonul de contact). Alegerea se poate schimba până la „Comandat”; după aceea, de pe comandă.</li>
            <li>Numărul, firma, agentul și cursurile sunt fixate la salvare; cât e „În lucru”, cursurile se reîmprospătează din zona de prețuri.</li>
            <li>Meniul ⋯: copiază oferta, creează variantă, completare, legare ca completare, preia prețurile în altă ofertă, istoric, notițe și atașamente.</li>
          </ul>
        </Ajutor>
      </div>

      {/* ------------------------------------------------ fila 2: Produse */}
      <div className="fila" role="tabpanel" id="fila-produse" aria-labelledby="tab-produse" hidden={fila !== "produse"}>
        {campMentiuni}
        <Produse oferta={oferta} onOferta={preia} mentiuni={mentiuni} activa={fila === "produse"} slotBara={slotBara} onStareSalvare={setSalvareProduse} salvareAcum={salvareAcum} onProbleme={setProblemeProduse} duLaProblema={duLaProblema} onMergiLaPreturi={() => mergiLa("preturi")} />
      </div>

      {/* ------------------------------------------------ fila 3: Preturi si documente */}
      <div className="fila" role="tabpanel" id="fila-preturi" aria-labelledby="tab-preturi" hidden={fila !== "preturi"}>
        {campMentiuni}
        <Structura structura={oferta.structura ?? null} />

        {(oferta.versiuni?.length ?? 0) > 1 && (
          <section className="panou" id="versiuni">
            <h2>Versiuni (variante de preț)</h2>
            <ul>
              {oferta.versiuni!.map((v) => (
                <li key={v.id}>
                  {v.id === oferta.id ? <strong>varianta {v.versiune}</strong> : <Link to={`/oferte/${v.id}`}>varianta {v.versiune}</Link>} · {ETICHETA_STATUS[v.status]}
                  {v.curenta ? " · curentă" : ""}
                  {!v.curenta && oferta.poateModifica && (
                    <>
                      {" "}
                      <button className="buton secundar mic" type="button" disabled={lucru !== null} onClick={() => void actiune("curenta", async () => (await apiPreturi.faCurenta(v.id)).oferta)}>
                        Fă-o curentă
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <p className="mic text-secundar">Lista de oferte arată doar versiunea curentă; „Acceptată” o face curentă automat.</p>
          </section>
        )}

        <Preturi oferta={oferta} onOferta={preia} mentiuni={mentiuni} inainteDeActiune={inainteDeActiune} />
        <Documente oferta={oferta} reincarca={reincarcaIstoric} mentiuni={mentiuni} onSchimbare={() => setReincarcaIstoric((n) => n + 1)} inainteDeActiune={inainteDeActiune} />

        <Ajutor>
          <ul>
            <li>Sus e rezultatul motorului: dacă oferta se poate comanda, mp și coli pe învelitoare, pachetele și formularele Bilka. Pe scurt apare și în josul filei Produse.</li>
            <li>„PDF ▾” din rândul ofertei generează documentul (ofertă, rezumat, ofertă detaliată, tabel de facturare) și îl deschide; fiecare generare rămâne în panoul „Documente”, de unde se marchează ca transmis.</li>
            <li>Pe documente și în lista de prețuri produsele apar în ordinea de pe ecranul ofertei — rubricile în ordinea lor, în fiecare rubrică lista implicită, apoi produsele adăugate cu „+” —, nu în ordinea în care au fost completate.</li>
          </ul>
        </Ajutor>
      </div>
    </>
  );
}
