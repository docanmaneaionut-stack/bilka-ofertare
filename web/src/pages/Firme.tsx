import { useEffect, useState, type FormEvent } from "react";
import { apiFirme, type Firma } from "../api";
import { Ajutor, Camp, Mesaj, textEroare } from "../components/ui";
import { useUtilizator } from "../contextUtilizator";

const FIRMA_GOALA = {
  denumire: "",
  cui: "",
  platitorTva: true,
  nrRegCom: "",
  adresa: "",
  localitate: "",
  judet: "",
  telefon: "",
  email: "",
  contBancar: "",
  banca: "",
  observatii: "",
  activ: true,
};
type DateFirma = typeof FIRMA_GOALA;

function dinFirma(f: Firma): DateFirma {
  return {
    denumire: f.denumire,
    cui: f.cui,
    platitorTva: f.platitorTva,
    nrRegCom: f.nrRegCom,
    adresa: f.adresa,
    localitate: f.localitate ?? "",
    judet: f.judet ?? "",
    telefon: f.telefon,
    email: f.email,
    contBancar: f.contBancar ?? "",
    banca: f.banca ?? "",
    observatii: f.observatii ?? "",
    activ: f.activ,
  };
}

function FormularFirma({ initial, doarContact, onSalveaza, onRenunta, eticheta }: { initial: DateFirma; doarContact: boolean; onSalveaza: (d: DateFirma) => Promise<void>; onRenunta: () => void; eticheta: string }) {
  const [d, setD] = useState(initial);
  const [eroare, setEroare] = useState<string | null>(null);
  const [seSalveaza, setSeSalveaza] = useState(false);
  const set = <K extends keyof DateFirma>(k: K, v: DateFirma[K]) => setD((s) => ({ ...s, [k]: v }));

  async function trimite(e: FormEvent) {
    e.preventDefault();
    setEroare(null);
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
      {!doarContact && (
        <div className="rand-campuri">
          <Camp eticheta="Denumire" obligatoriu>
            <input type="text" value={d.denumire} onChange={(e) => set("denumire", e.target.value)} required autoFocus />
          </Camp>
          <Camp eticheta="CUI" obligatoriu>
            <input type="text" value={d.cui} onChange={(e) => set("cui", e.target.value.toUpperCase())} required />
          </Camp>
          <Camp eticheta="Nr. Registrul Comerțului" obligatoriu>
            <input type="text" value={d.nrRegCom} onChange={(e) => set("nrRegCom", e.target.value)} required />
          </Camp>
          <label className="camp-bifa">
            <input type="checkbox" checked={d.platitorTva} onChange={(e) => set("platitorTva", e.target.checked)} />
            Plătitor de TVA
          </label>
        </div>
      )}
      <div className="rand-campuri">
        <Camp eticheta="Adresă" obligatoriu>
          <input type="text" value={d.adresa} onChange={(e) => set("adresa", e.target.value)} required autoFocus={doarContact} />
        </Camp>
        <Camp eticheta="Localitate">
          <input type="text" value={d.localitate} onChange={(e) => set("localitate", e.target.value)} />
        </Camp>
        <Camp eticheta="Județ">
          <input type="text" value={d.judet} onChange={(e) => set("judet", e.target.value)} />
        </Camp>
        <Camp eticheta="Telefon" obligatoriu>
          <input type="text" value={d.telefon} onChange={(e) => set("telefon", e.target.value)} required />
        </Camp>
        <Camp eticheta="E-mail" obligatoriu>
          <input type="email" value={d.email} onChange={(e) => set("email", e.target.value)} required />
        </Camp>
      </div>
      {!doarContact && (
        <>
          <div className="rand-campuri">
            <Camp eticheta="Cont bancar (IBAN)">
              <input type="text" value={d.contBancar} onChange={(e) => set("contBancar", e.target.value.toUpperCase())} />
            </Camp>
            <Camp eticheta="Banca">
              <input type="text" value={d.banca} onChange={(e) => set("banca", e.target.value)} />
            </Camp>
          </div>
          <Camp eticheta="Observații">
            <textarea value={d.observatii} onChange={(e) => set("observatii", e.target.value)} />
          </Camp>
          <label className="camp-bifa">
            <input type="checkbox" checked={d.activ} onChange={(e) => set("activ", e.target.checked)} />
            Activă
          </label>
        </>
      )}
      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      <div className="actiuni">
        <button className="buton" type="submit" disabled={seSalveaza}>
          {seSalveaza ? "Se salvează…" : eticheta}
        </button>
        <button className="buton secundar" type="button" onClick={onRenunta}>
          Renunță
        </button>
      </div>
    </form>
  );
}

function Sigla({ firma, poateIncarca, onIncarcata }: { firma: Firma; poateIncarca: boolean; onIncarcata: () => Promise<void> }) {
  const [fisier, setFisier] = useState<File | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [versiune, setVersiune] = useState(0);

  async function incarca() {
    if (!fisier) return;
    setMesaj(null);
    try {
      await apiFirme.incarcaSigla(firma.id, fisier);
      setFisier(null);
      setVersiune((v) => v + 1);
      await onIncarcata();
    } catch (e) {
      setMesaj(textEroare(e));
    }
  }

  return (
    <div className="camp">
      <span>Sigla</span>
      {firma.logo ? (
        <img src={`${apiFirme.urlSigla(firma.id)}?v=${versiune}`} alt={`Sigla ${firma.denumire}`} style={{ maxWidth: 240, maxHeight: 120, border: "2px solid var(--border)", borderRadius: 6, padding: 6, background: "#fff" }} />
      ) : (
        <span className="text-secundar mic">fără siglă</span>
      )}
      {poateIncarca && (
        <div className="actiuni" style={{ marginTop: 8 }}>
          <input type="file" accept="image/jpeg,image/png" onChange={(e) => setFisier(e.target.files?.[0] ?? null)} />
          <button type="button" className="buton secundar mic" onClick={incarca} disabled={!fisier}>
            Încarcă sigla
          </button>
        </div>
      )}
      {mesaj && <Mesaj tip="eroare">{mesaj}</Mesaj>}
    </div>
  );
}

// S16b: sablonul formularului de comanda Bilka al firmei (.xlsm, cu datele de cont Bilka
// ale firmei); il incarca Admin general; versiunea = numele fisierului + data modificarii
function SablonBilka({ firma, poateIncarca, onIncarcat }: { firma: Firma; poateIncarca: boolean; onIncarcat: () => Promise<void> }) {
  const [fisier, setFisier] = useState<File | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [lucru, setLucru] = useState(false);

  async function incarca() {
    if (!fisier) return;
    setMesaj(null);
    setLucru(true);
    try {
      await apiFirme.incarcaSablonBilka(firma.id, fisier);
      setFisier(null);
      await onIncarcat();
    } catch (e) {
      setMesaj(textEroare(e));
    } finally {
      setLucru(false);
    }
  }

  return (
    <div className="camp">
      <span>Șablon formular Bilka</span>
      {firma.sablonBilka ? (
        <span className="mic">
          <a href={apiFirme.urlSablonBilka(firma.id)}>{firma.sablonBilkaVersiune ?? "șablon încărcat"}</a>
          {firma.sablonBilkaIncarcatLa ? ` · încărcat ${new Date(firma.sablonBilkaIncarcatLa).toLocaleString("ro-RO")}` : ""}
          {firma.sablonBilkaIncarcatDe ? ` de ${firma.sablonBilkaIncarcatDe}` : ""}
        </span>
      ) : (
        <span className="text-secundar mic">fără șablon — formularele de comandă Bilka nu se pot genera pentru ofertele firmei</span>
      )}
      {poateIncarca && (
        <div className="actiuni" style={{ marginTop: 8 }}>
          <input type="file" accept=".xlsm" onChange={(e) => setFisier(e.target.files?.[0] ?? null)} />
          <button type="button" className="buton secundar mic" onClick={incarca} disabled={!fisier || lucru}>
            {lucru ? "se verifică…" : "Încarcă șablonul (.xlsm)"}
          </button>
        </div>
      )}
      <span className="text-secundar mic">Formularul de comandă Bilka al firmei (cu datele ei de cont Bilka în foaia „Date Client”), cu macro-urile Bilka. Se verifică la încărcare (numele definite și foile așteptate) și se păstrează în folderul de date, nu în git.</span>
      {mesaj && <Mesaj tip="eroare">{mesaj}</Mesaj>}
    </div>
  );
}

export function Firme() {
  const utilizator = useUtilizator();
  const adminGeneral = utilizator.rol === "ADMIN_GENERAL";
  const [firme, setFirme] = useState<Firma[] | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [adauga, setAdauga] = useState(false);
  const [editata, setEditata] = useState<Firma | null>(null);

  async function incarca() {
    try {
      const { firme } = await apiFirme.lista();
      setFirme(firme);
      if (editata) setEditata(firme.find((f) => f.id === editata.id) ?? null);
    } catch (e) {
      setEroare(textEroare(e));
    }
  }
  useEffect(() => {
    void incarca();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="antet-pagina">
        <h1>{adminGeneral ? "Firme" : "Firma mea"}</h1>
        {adminGeneral && !adauga && (
          <button className="buton" onClick={() => setAdauga(true)}>
            Adaugă firmă
          </button>
        )}
      </div>

      {eroare && <Mesaj tip="eroare">{eroare}</Mesaj>}
      {mesaj && <Mesaj tip="ok">{mesaj}</Mesaj>}

      {adauga && (
        <>
          <h2>Firmă nouă</h2>
          <FormularFirma
            initial={FIRMA_GOALA}
            doarContact={false}
            eticheta="Salvează firma"
            onRenunta={() => setAdauga(false)}
            onSalveaza={async (d) => {
              await apiFirme.creeaza(d);
              setAdauga(false);
              setMesaj("Firma a fost creată. Poți încărca sigla din „Editează”.");
              await incarca();
            }}
          />
          <hr className="separator" />
        </>
      )}

      {editata && (
        <>
          <h2>{editata.denumire}</h2>
          <div className="rand-campuri" style={{ marginBottom: 16 }}>
            <Sigla firma={editata} poateIncarca={adminGeneral} onIncarcata={incarca} />
            <SablonBilka firma={editata} poateIncarca={adminGeneral} onIncarcat={incarca} />
          </div>
          <FormularFirma
            initial={dinFirma(editata)}
            doarContact={!adminGeneral}
            eticheta="Salvează modificările"
            onRenunta={() => setEditata(null)}
            onSalveaza={async (d) => {
              await apiFirme.actualizeaza(editata.id, d);
              setEditata(null);
              setMesaj("Modificările au fost salvate și scrise în jurnal.");
              await incarca();
            }}
          />
          <hr className="separator" />
        </>
      )}

      {firme && firme.length === 0 && <Mesaj>Nicio firmă încă.</Mesaj>}
      {firme && firme.length > 0 && (
        <div className="tabel-invelis">
          <table className="tabel">
            <thead>
              <tr>
                <th>Firma</th>
                <th>CUI</th>
                <th>Localitate</th>
                <th>Telefon</th>
                <th>E-mail</th>
                <th>Utilizatori activi</th>
                <th>Stare</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {firme.map((f) => (
                <tr key={f.id} className={f.activ ? undefined : "inactiv"}>
                  <td>
                    <strong>{f.denumire}</strong>
                    {f.logo && <span className="text-secundar mic"> · cu siglă</span>}
                  </td>
                  <td>
                    {f.cui}
                    {!f.platitorTva && <span className="text-secundar mic"> (neplătitor TVA)</span>}
                  </td>
                  <td>{[f.localitate, f.judet].filter(Boolean).join(", ") || "—"}</td>
                  <td>{f.telefon}</td>
                  <td className="mic">{f.email}</td>
                  <td>{f._count?.utilizatori ?? "–"}</td>
                  <td>
                    <span className={`eticheta ${f.activ ? "" : "inactiv"}`}>{f.activ ? "activă" : "inactivă"}</span>
                  </td>
                  <td>
                    <button className="buton secundar mic" onClick={() => setEditata(f)}>
                      {adminGeneral ? "Editează" : "Date de contact"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Ajutor>
        <ul>
          <li>Firma emitentă apare în antetul ofertelor: denumire, CUI, nr. Reg. Com., adresă, telefon, e-mail și sigla (JPG / PNG, cel mult 2 MB).</li>
          <li>Admin general creează firmele și le modifică integral; Administratorul își modifică doar datele de contact (adresă, localitate, județ, telefon, e-mail).</li>
          <li>O firmă nu se șterge: se dezactivează — și numai după ce toți utilizatorii ei au fost dezactivați.</li>
          <li>Orice modificare lasă rând în jurnal, cu valoarea dinainte și după.</li>
        </ul>
      </Ajutor>
    </>
  );
}
