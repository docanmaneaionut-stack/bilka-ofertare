import { useState, type FormEvent } from "react";
import { EroareCerere, type AlegereLivrareBilka, type LivrareBilka } from "../api";
import { Camp, Mesaj, textEroare } from "./ui";

// S26a (MODIFICAREA M7; FISA-OFERTARE cap. 16): dialogul „Livrarea de la Bilka” - la depozitul
// nostru (implicit; in formular celulele de localitate si telefon raman goale) sau direct in
// santier (localitatea si telefonul de contact, obligatorii, intra in formular). Acelasi dialog
// la „De comandat”, la „Comandat” fara alegere, la generarea formularului fara alegere, la
// schimbarea alegerii pe oferta si pe comanda (acolo cu mentiuni pentru istoric).

export function textAlegereLivrare(l: LivrareBilka | null | undefined): string {
  if (!l) return "nealeasă";
  return l.tip === "DEPOZIT" ? "la depozitul nostru" : `direct în șantier — ${[l.localitate, l.telefon].filter(Boolean).join(" · ")}`;
}

// motivul de sub camp: din raspunsul cererii de status ("livrareBilka.telefon") sau al schimbarii directe ("telefon")
function laCamp(e: unknown, camp: "localitate" | "telefon"): string | undefined {
  if (!(e instanceof EroareCerere)) return undefined;
  return e.campuri.find((c) => c.camp === `livrareBilka.${camp}` || c.camp === camp)?.mesaj;
}

export function DialogLivrareBilka({
  initial,
  localitateImplicita,
  telefonImplicit,
  etichetaConfirmare,
  nota,
  cuMentiuni,
  onConfirma,
  onRenunta,
}: {
  initial?: LivrareBilka | null;
  localitateImplicita?: string | null;
  telefonImplicit?: string | null;
  etichetaConfirmare: string;
  nota?: string;
  cuMentiuni?: boolean;
  onConfirma: (alegere: AlegereLivrareBilka, mentiuni: string | null) => Promise<void>;
  onRenunta: () => void;
}) {
  const [tip, setTip] = useState<"DEPOZIT" | "SANTIER">(initial?.tip ?? "DEPOZIT");
  const [localitate, setLocalitate] = useState(initial?.localitate ?? localitateImplicita ?? "");
  const [telefon, setTelefon] = useState(initial?.telefon ?? telefonImplicit ?? "");
  const [mentiuni, setMentiuni] = useState("");
  const [eroare, setEroare] = useState<unknown>(null);
  const [lucru, setLucru] = useState(false);

  async function trimite(e: FormEvent) {
    e.preventDefault();
    setEroare(null);
    setLucru(true);
    try {
      await onConfirma(tip === "SANTIER" ? { tip, localitate: localitate.trim(), telefon: telefon.trim() } : { tip }, mentiuni.trim() || null);
    } catch (err) {
      setEroare(err);
    } finally {
      setLucru(false);
    }
  }

  return (
    <div className="fundal-dialog" role="dialog" aria-modal="true" aria-label="Livrarea de la Bilka">
      <form className="dialog dialog-ingust" onSubmit={trimite}>
        <h2>Livrarea de la Bilka</h2>
        {nota && <p className="mic text-secundar">{nota}</p>}
        <label className="camp-bifa">
          <input type="radio" name="livrare-bilka" checked={tip === "DEPOZIT"} onChange={() => setTip("DEPOZIT")} />
          <span>la depozitul nostru</span>
        </label>
        <label className="camp-bifa">
          <input type="radio" name="livrare-bilka" checked={tip === "SANTIER"} onChange={() => setTip("SANTIER")} />
          <span>direct în șantier — livrare Bilka</span>
        </label>
        {tip === "SANTIER" && (
          <div className="rand-campuri">
            <Camp eticheta="Localitatea" obligatoriu eroare={laCamp(eroare, "localitate")}>
              <input type="text" value={localitate} onChange={(e) => setLocalitate(e.target.value)} required autoFocus />
            </Camp>
            <Camp eticheta="Telefon de contact (client sau montator)" obligatoriu eroare={laCamp(eroare, "telefon")}>
              <input type="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} required />
            </Camp>
          </div>
        )}
        {cuMentiuni && (
          <Camp eticheta="Mențiuni (pentru istoric)">
            <input type="text" value={mentiuni} onChange={(e) => setMentiuni(e.target.value)} placeholder="de ce se schimbă: mașina Bilka nu ajunge, cererea clientului…" />
          </Camp>
        )}
        {eroare !== null && <Mesaj tip="eroare">{textEroare(eroare)}</Mesaj>}
        <div className="actiuni">
          <button className="buton" type="submit" disabled={lucru}>
            {lucru ? "Se salvează…" : etichetaConfirmare}
          </button>
          <button className="buton secundar" type="button" onClick={onRenunta} disabled={lucru}>
            Renunță
          </button>
        </div>
        <p className="mic text-secundar">La depozit, celulele de localitate și telefon din formularul Bilka rămân goale; la șantier se completează cu cele de aici.</p>
      </form>
    </div>
  );
}
