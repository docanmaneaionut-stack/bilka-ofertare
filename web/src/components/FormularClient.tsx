import { useEffect, useState, type FocusEvent } from "react";
import { Link } from "react-router-dom";
import { apiClienti, type Client, type ClientDate } from "../api";
import { Camp, eroareCamp } from "./ui";

// formularul clientului (FISA-OFERTARE cap. 2), cu autocompletare dupa telefon:
// la un telefon existent softul propune clientul existent. S26a (M6): telefonul e optional la
// oferta (devine obligatoriu la „Comandat”); numele si adresa lucrarii raman obligatorii.
// S27 (BUG-15): sugestii si pe NUME - de la 3 litere, fara diacritice, doar clientii vizibili contului,
// cu telefonul si localitatea alaturi; alegerea completeaza datele (parintele tine minte clientul ales).

export function clientGol(): ClientDate {
  return { nume: "", telefon: "", adresa: "", localitate: "", email: "", observatii: "" };
}

export function dinClient(c: Client): ClientDate {
  // S27b (BUG-17): "-" = adresa necompletata (client creat de o comanda manuala fara adresa) - campul ramane gol
  return { nume: c.nume, telefon: c.telefon ?? "", adresa: c.adresa === "-" ? "" : c.adresa, localitate: c.localitate ?? "", email: c.email ?? "", observatii: c.observatii ?? "" };
}

function cifreTelefon(t: string): string {
  return t.replace(/\D/g, "").replace(/^(0040|40)(?=\d{9})/, "0");
}

// `eroare`: eroarea cererii de salvare (BUG-4) - motivele apar sub campurile lor;
// `prefix`: calea campurilor clientului in corpul cererii ("client." la "Oferta noua")
// `clientLegatId` (S29): clientul de care oferta e deja legata - nu se propune in sugestiile pe nume
export function FormularClient({ client, onSchimba, onAlegeExistent, eroare, prefix = "client.", clientLegatId }: { client: ClientDate; onSchimba: (c: ClientDate) => void; onAlegeExistent: (c: Client) => void; eroare?: unknown; prefix?: string; clientLegatId?: string }) {
  const [sugestii, setSugestii] = useState<Client[]>([]);
  // sugestiile pe nume; dupa o alegere nu mai apar pana cand numele se schimba
  const [sugestiiNume, setSugestiiNume] = useState<Client[]>([]);
  const [numeAles, setNumeAles] = useState<string | null>(null);
  // S29: lista de sugestii pe nume se deschide DOAR cat scrii in campul Nume (de la 3 litere) - nu la
  // intrarea pe pagina, cand numele vine din oferta salvata; se inchide cand iesi din camp sau alegi
  const [scrieNume, setScrieNume] = useState(false);
  const numeCautat = client.nume.trim();
  useEffect(() => {
    if (!scrieNume || numeCautat.length < 3 || numeCautat === numeAles) return;
    const t = setTimeout(() => {
      apiClienti
        .cauta({ nume: numeCautat })
        .then(({ clienti }) => setSugestiiNume(clienti))
        .catch(() => setSugestiiNume([]));
    }, 250);
    return () => clearTimeout(t);
  }, [numeCautat, numeAles, scrieNume]);
  const vizibileNume = scrieNume && numeCautat.length >= 3 && numeCautat !== numeAles ? sugestiiNume.filter((s) => s.id !== clientLegatId) : [];
  // iesirea din campul Nume (si din lista lui) inchide sugestiile; trecerea cu Tab pe o sugestie nu
  const laIesireaDinNume = (e: FocusEvent<HTMLElement>) => {
    const camp = e.currentTarget.closest("label");
    if (!camp || !camp.contains(e.relatedTarget as Node | null)) setScrieNume(false);
  };
  const set = (k: keyof ClientDate, v: string) => onSchimba({ ...client, [k]: v });
  const cifre = cifreTelefon(client.telefon);
  const la = (camp: keyof ClientDate) => eroareCamp(eroare, `${prefix}${camp}`, camp);

  useEffect(() => {
    if (cifre.length < 4) return;
    const t = setTimeout(() => {
      apiClienti
        .cauta({ telefon: cifre })
        .then(({ clienti }) => setSugestii(clienti))
        .catch(() => setSugestii([]));
    }, 250);
    return () => clearTimeout(t);
  }, [cifre]);

  const vizibile = cifre.length >= 4 ? sugestii : [];
  const exact = vizibile.find((s) => cifreTelefon(s.telefon ?? "") === cifre);
  const alege = (s: Client) => {
    onAlegeExistent(s);
    setSugestii([]);
    setSugestiiNume([]);
    setNumeAles(s.nume.trim());
    setScrieNume(false);
  };

  return (
    <>
      <div className="rand-campuri">
        <Camp eticheta="Telefon (obligatoriu la „Comandat”)" eroare={la("telefon")}>
          <input type="tel" value={client.telefon} onChange={(e) => set("telefon", e.target.value)} autoComplete="off" />
          {vizibile.length > 0 && !(exact && exact.nume === client.nume) && (
            <ul className="lista-sugestii" aria-label="Clienți existenți">
              {vizibile.map((s) => (
                <li key={s.id} tabIndex={0} onClick={() => alege(s)} onKeyDown={(e) => e.key === "Enter" && alege(s)}>
                  <strong>{s.nume}</strong> · {s.telefon}
                  {s.localitate ? ` · ${s.localitate}` : ""}
                </li>
              ))}
            </ul>
          )}
        </Camp>
        <Camp eticheta="Nume" obligatoriu eroare={la("nume")}>
          <input
            type="text"
            value={client.nume}
            onChange={(e) => {
              set("nume", e.target.value);
              setScrieNume(true);
            }}
            onBlur={laIesireaDinNume}
            required
            autoComplete="off"
          />
          {vizibileNume.length > 0 && (
            <ul className="lista-sugestii" aria-label="Clienți cu acest nume" onBlur={laIesireaDinNume}>
              {vizibileNume.map((s) => (
                <li key={s.id} tabIndex={0} onClick={() => alege(s)} onKeyDown={(e) => e.key === "Enter" && alege(s)}>
                  <strong>{s.nume}</strong> · {s.telefon ?? "fără telefon"}
                  {s.localitate ? ` · ${s.localitate}` : ""}
                </li>
              ))}
            </ul>
          )}
        </Camp>
        <Camp eticheta="Adresa lucrării" obligatoriu eroare={la("adresa")}>
          <input type="text" value={client.adresa} onChange={(e) => set("adresa", e.target.value)} required />
        </Camp>
        <Camp eticheta="Localitate" eroare={la("localitate")}>
          <input type="text" value={client.localitate ?? ""} onChange={(e) => set("localitate", e.target.value)} />
        </Camp>
        <Camp eticheta="E-mail" eroare={la("email")}>
          <input type="email" value={client.email ?? ""} onChange={(e) => set("email", e.target.value)} />
        </Camp>
        <Camp eticheta="Observații" eroare={la("observatii")}>
          <input type="text" value={client.observatii ?? ""} onChange={(e) => set("observatii", e.target.value)} />
        </Camp>
      </div>
      {exact && exact.nume === client.nume && (
        <p className="mic text-secundar">
          Client existent în bază · <Link to={`/clienti/${exact.id}`}>fișa clientului</Link>
        </p>
      )}
    </>
  );
}
