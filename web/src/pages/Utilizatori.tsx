import { useEffect, useState, type FormEvent } from "react";
import { apiFirme, apiUtilizatori, type Firma, type RolCont, type UtilizatorAdmin } from "../api";
import { ContorSerie } from "../components/ContorSerie";
import { Ajutor, Camp, Mesaj, textEroare } from "../components/ui";
import { useUtilizator } from "../contextUtilizator";
import { ETICHETA_ROL } from "./ContulMeu";

const ROLURI_CU_OFERTE: RolCont[] = ["ADMINISTRATOR", "AGENT", "COLABORATOR"];
const ROLURI_ACCES: RolCont[] = ["CONTABILITATE", "GESTIUNE"];

const GOL = {
  nume: "",
  telefon: "",
  email: "",
  rol: "AGENT" as RolCont,
  firmaId: "",
  serieOferta: "",
  adaosProcent: "",
  accesGeneralFirme: true,
  firmeAcces: [] as string[],
  activ: true,
  parolaInitiala: "",
};
type Date = typeof GOL;

function dinUtilizator(u: UtilizatorAdmin): Date {
  return {
    nume: u.nume,
    telefon: u.telefon ?? "",
    email: u.email,
    rol: u.rol,
    firmaId: u.firmaId ?? "",
    serieOferta: u.serieOferta ?? "",
    adaosProcent: u.adaosProcent === null ? "" : String(u.adaosProcent),
    accesGeneralFirme: u.accesGeneralFirme,
    firmeAcces: u.firmeAcces,
    activ: u.activ,
    parolaInitiala: "",
  };
}

function spreServer(d: Date, nou: boolean) {
  return {
    nume: d.nume,
    telefon: d.telefon || null,
    email: d.email,
    rol: d.rol,
    firmaId: ROLURI_ACCES.includes(d.rol) ? null : d.firmaId || null,
    serieOferta: ROLURI_CU_OFERTE.includes(d.rol) ? d.serieOferta.toUpperCase() || null : null,
    adaosProcent: ROLURI_CU_OFERTE.includes(d.rol) && d.adaosProcent.trim() !== "" ? Number(d.adaosProcent.replace(",", ".")) : null,
    accesGeneralFirme: ROLURI_ACCES.includes(d.rol) ? d.accesGeneralFirme : false,
    firmeAcces: ROLURI_ACCES.includes(d.rol) && !d.accesGeneralFirme ? d.firmeAcces : [],
    activ: d.activ,
    ...(nou ? { parolaInitiala: d.parolaInitiala } : {}),
  };
}

function Formular({ initial, nou, propriu, adminGeneral, firme, onSalveaza, onRenunta }: { initial: Date; nou: boolean; propriu: boolean; adminGeneral: boolean; firme: Firma[]; onSalveaza: (d: Date) => Promise<void>; onRenunta: () => void }) {
  const [d, setD] = useState(initial);
  const [eroare, setEroare] = useState<string | null>(null);
  const [seSalveaza, setSeSalveaza] = useState(false);
  const set = <K extends keyof Date>(k: K, v: Date[K]) => setD((s) => ({ ...s, [k]: v }));
  const faceOferte = ROLURI_CU_OFERTE.includes(d.rol);
  const acces = ROLURI_ACCES.includes(d.rol);
  const roluriPermise: RolCont[] = adminGeneral ? ["ADMINISTRATOR", "AGENT", "COLABORATOR", "CONTABILITATE", "GESTIUNE"] : ["AGENT", "COLABORATOR"];

  async function trimite(e: FormEvent) {
    e.preventDefault();
    setEroare(null);
    if (nou && d.parolaInitiala.length < 10) {
      setEroare("Parola inițială trebuie să aibă cel puțin 10 caractere.");
      return;
    }
    setSeSalveaza(true);
    try {
      await onSalveaza(d);
    } catch (err) {
      setEroare(textEroare(err));
    } finally {
      setSeSalveaza(false);
    }
  }

  return (
    <form className="formular" onSubmit={trimite}>
      <div className="rand-campuri">
        <Camp eticheta="Nume" obligatoriu>
          <input type="text" value={d.nume} onChange={(e) => set("nume", e.target.value)} required autoFocus />
        </Camp>
        <Camp eticheta="Telefon">
          <input type="text" value={d.telefon} onChange={(e) => set("telefon", e.target.value)} />
        </Camp>
        {!propriu && (
          <Camp eticheta="E-mail (login)" obligatoriu>
            <input type="email" value={d.email} onChange={(e) => set("email", e.target.value)} required />
          </Camp>
        )}
        {!propriu && (
          <Camp eticheta="Rol" obligatoriu>
            <select value={d.rol} onChange={(e) => set("rol", e.target.value as RolCont)}>
              {roluriPermise.map((r) => (
                <option key={r} value={r}>
                  {ETICHETA_ROL[r]}
                </option>
              ))}
            </select>
          </Camp>
        )}
        {!propriu && !acces && adminGeneral && (
          <Camp eticheta="Firma" obligatoriu>
            <select value={d.firmaId} onChange={(e) => set("firmaId", e.target.value)} required>
              <option value="">alege…</option>
              {firme.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.denumire}
                </option>
              ))}
            </select>
          </Camp>
        )}
        {!propriu && faceOferte && (
          <Camp eticheta="Serie de ofertă (2–3 litere)" obligatoriu>
            <input type="text" value={d.serieOferta} onChange={(e) => set("serieOferta", e.target.value.toUpperCase())} required minLength={2} maxLength={3} pattern="[A-Za-z]{2,3}" />
          </Camp>
        )}
        {faceOferte && (
          <Camp eticheta="Adaos % la prețul de achiziție">
            <input type="text" inputMode="decimal" value={d.adaosProcent} onChange={(e) => set("adaosProcent", e.target.value)} />
          </Camp>
        )}
      </div>

      {!propriu && acces && adminGeneral && (
        <>
          <label className="camp-bifa">
            <input type="checkbox" checked={d.accesGeneralFirme} onChange={(e) => set("accesGeneralFirme", e.target.checked)} />
            Acces general (toate firmele)
          </label>
          {!d.accesGeneralFirme && (
            <div className="camp">
              <span>Firmele la care are acces</span>
              {firme.map((f) => (
                <label key={f.id} className="camp-bifa" style={{ minHeight: 36 }}>
                  <input
                    type="checkbox"
                    checked={d.firmeAcces.includes(f.id)}
                    onChange={(e) => set("firmeAcces", e.target.checked ? [...d.firmeAcces, f.id] : d.firmeAcces.filter((x) => x !== f.id))}
                  />
                  {f.denumire}
                </label>
              ))}
            </div>
          )}
        </>
      )}

      {nou && (
        <div className="rand-campuri">
          <Camp eticheta="Parola inițială (minim 10 caractere)" obligatoriu>
            <input type="text" value={d.parolaInitiala} onChange={(e) => set("parolaInitiala", e.target.value)} required minLength={10} autoComplete="off" />
          </Camp>
        </div>
      )}

      {!nou && !propriu && (
        <label className="camp-bifa">
          <input type="checkbox" checked={d.activ} onChange={(e) => set("activ", e.target.checked)} />
          Activ
        </label>
      )}

      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      <div className="actiuni">
        <button className="buton" type="submit" disabled={seSalveaza}>
          {seSalveaza ? "Se salvează…" : nou ? "Creează contul" : "Salvează modificările"}
        </button>
        <button className="buton secundar" type="button" onClick={onRenunta}>
          Renunță
        </button>
      </div>
    </form>
  );
}

function ResetareParola({ u, onGata }: { u: UtilizatorAdmin; onGata: () => void }) {
  const [parola, setParola] = useState("");
  const [mesaj, setMesaj] = useState<{ tip: "ok" | "eroare"; text: string } | null>(null);

  async function trimite(e: FormEvent) {
    e.preventDefault();
    setMesaj(null);
    try {
      await apiUtilizatori.reseteazaParola(u.id, parola);
      setMesaj({ tip: "ok", text: `Parola a fost resetată; ${u.nume} o va schimba la prima conectare.` });
      setParola("");
      onGata();
    } catch (err) {
      setMesaj({ tip: "eroare", text: textEroare(err) });
    }
  }

  return (
    <form className="formular" onSubmit={trimite} style={{ maxWidth: 520 }}>
      <h3>Resetează parola pentru {u.nume}</h3>
      <Camp eticheta="Parola nouă (minim 10 caractere)" obligatoriu>
        <input type="text" value={parola} onChange={(e) => setParola(e.target.value)} required minLength={10} autoComplete="off" />
      </Camp>
      {mesaj && <Mesaj tip={mesaj.tip}>{mesaj.text}</Mesaj>}
      <div className="actiuni">
        <button className="buton secundar" type="submit">
          Resetează
        </button>
      </div>
    </form>
  );
}

export function Utilizatori() {
  const eu = useUtilizator();
  const adminGeneral = eu.rol === "ADMIN_GENERAL";
  const [utilizatori, setUtilizatori] = useState<UtilizatorAdmin[] | null>(null);
  const [firme, setFirme] = useState<Firma[]>([]);
  const [eroare, setEroare] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [adauga, setAdauga] = useState(false);
  const [editat, setEditat] = useState<UtilizatorAdmin | null>(null);
  const [resetare, setResetare] = useState<UtilizatorAdmin | null>(null);

  async function incarca() {
    try {
      const [{ utilizatori }, { firme }] = await Promise.all([apiUtilizatori.lista(), apiFirme.lista()]);
      setUtilizatori(utilizatori);
      setFirme(firme);
    } catch (e) {
      setEroare(textEroare(e));
    }
  }
  useEffect(() => {
    void incarca();
  }, []);

  return (
    <>
      <div className="antet-pagina">
        <h1>Utilizatori</h1>
        {!adauga && (
          <button className="buton" onClick={() => { setEditat(null); setResetare(null); setAdauga(true); }}>
            Adaugă cont
          </button>
        )}
      </div>

      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      {mesaj && <Mesaj tip="ok">{mesaj}</Mesaj>}

      {adauga && (
        <>
          <h2>Cont nou</h2>
          <Formular
            initial={{ ...GOL, firmaId: adminGeneral ? "" : (eu.firmaId ?? "") }}
            nou
            propriu={false}
            adminGeneral={adminGeneral}
            firme={firme}
            onRenunta={() => setAdauga(false)}
            onSalveaza={async (d) => {
              await apiUtilizatori.creeaza(spreServer(d, true));
              setAdauga(false);
              setMesaj(`Contul ${d.email} a fost creat; la prima conectare își va alege propria parolă.`);
              await incarca();
            }}
          />
          <hr className="separator" />
        </>
      )}

      {editat && (
        <>
          <h2>{editat.id === eu.id ? "Contul meu (adaos)" : editat.nume}</h2>
          <Formular
            initial={dinUtilizator(editat)}
            nou={false}
            propriu={editat.id === eu.id}
            adminGeneral={adminGeneral}
            firme={firme}
            onRenunta={() => setEditat(null)}
            onSalveaza={async (d) => {
              const payload = editat.id === eu.id && !adminGeneral ? { nume: d.nume, telefon: d.telefon || null, adaosProcent: d.adaosProcent.trim() === "" ? null : Number(d.adaosProcent.replace(",", ".")) } : spreServer(d, false);
              await apiUtilizatori.actualizeaza(editat.id, payload);
              setEditat(null);
              setMesaj("Modificările au fost salvate și scrise în jurnal (fiecare câmp, cu dinainte / după).");
              await incarca();
            }}
          />
          {adminGeneral && editat.serieOferta && <ContorSerie serie={editat.serieOferta} />}
          <hr className="separator" />
        </>
      )}

      {resetare && (
        <>
          <ResetareParola u={resetare} onGata={() => setResetare(null)} />
          <hr className="separator" />
        </>
      )}

      {utilizatori && (
        <div className="tabel-invelis">
          <table className="tabel">
            <thead>
              <tr>
                <th>Nume</th>
                <th>Rol</th>
                <th>Firma / acces</th>
                <th>E-mail</th>
                <th>Serie</th>
                {(adminGeneral || true) && <th>Adaos %</th>}
                <th>Stare</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {utilizatori.map((u) => {
                const blocat = u.blocatPanaLa && new Date(u.blocatPanaLa) > new Date();
                const neatins = u.rol === "ADMIN_GENERAL" || u.esteRezerva;
                return (
                  <tr key={u.id} className={u.activ ? undefined : "inactiv"}>
                    <td>
                      <strong>{u.nume}</strong>
                      {u.esteRezerva && <span className="eticheta inactiv" style={{ marginLeft: 8 }}>rezervă</span>}
                      {u.id === eu.id && <span className="text-secundar mic"> (eu)</span>}
                      {u.telefon && <div className="text-secundar mic">{u.telefon}</div>}
                    </td>
                    <td>{ETICHETA_ROL[u.rol]}</td>
                    <td className="mic">{ROLURI_ACCES.includes(u.rol) ? (u.accesGeneralFirme ? "toate firmele" : `${u.firmeAcces.length} firme`) : (u.firma ?? "—")}</td>
                    <td className="mic">{u.email}</td>
                    <td>{u.serieOferta ?? "—"}</td>
                    <td>{u.adaosProcent === null ? "—" : `${u.adaosProcent} %`}</td>
                    <td>
                      <span className={`eticheta ${u.activ ? "" : "inactiv"}`}>{u.activ ? "activ" : "inactiv"}</span>
                      {blocat && <span className="eticheta inactiv" style={{ marginLeft: 6 }}>blocat</span>}
                      {u.parolaTrebuieSchimbata && u.activ && <div className="text-secundar mic">parolă de schimbat</div>}
                    </td>
                    <td>
                      {!neatins && (
                        <div className="actiuni">
                          <button className="buton secundar mic" onClick={() => { setAdauga(false); setResetare(null); setEditat(u); }}>
                            Editează
                          </button>
                          {u.id !== eu.id && (
                            <button className="buton secundar mic" onClick={() => { setAdauga(false); setEditat(null); setResetare(u); }}>
                              Parolă
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Ajutor>
        <ul>
          <li>
            <strong>Roluri</strong>: Admin general (unic) → Administrator (unul per firmă; face și oferte) → Agent / Colaborator (pe firma Administratorului lor). Contabilitatea și Gestiunea au acces general sau pe anumite firme, modificabil oricând.
          </li>
          <li>Admin general creează orice cont (nu și un al doilea Admin general). Administratorul creează și administrează doar Agenți și Colaboratori pe firma lui și își setează propriul adaos.</li>
          <li>
            <strong>Seria de ofertă</strong> (2–3 litere, unică) identifică agentul în numărul ofertei (ex. IB-0147); e obligatorie pentru cine face oferte. <strong>Adaosul %</strong> se adaugă la prețul de bază din catalog pentru a da prețul de achiziție al contului (agenți ~1 %, colaboratori după negociere); fiecare schimbare are istoric.
          </li>
          <li>
            <strong>Parola inițială</strong> o pune cine creează contul (minim 10 caractere); la prima conectare softul cere schimbarea ei, deci cel care a creat contul nu rămâne cu parola în mână. „Parolă” resetează la fel, prin superiorul din ierarhie.
          </li>
          <li>Predarea unui cont (alt agent preia telefonul): același cont — se schimbă numele, telefonul și parola; istoricul păstrează numele de la momentul fiecărei acțiuni.</li>
          <li>Conturile se dezactivează, nu se șterg; un cont inactiv nu se mai poate conecta. Contul de rezervă al Admin general nu se modifică din ecran.</li>
          <li>Orice câmp modificat lasă rând în jurnal cu valoarea dinainte și după; schimbările de parolă lasă rând fără valori (cine, când, pentru cine).</li>
        </ul>
      </Ajutor>
    </>
  );
}
