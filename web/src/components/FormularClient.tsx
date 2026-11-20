import { useEffect, useState } from "react";
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
  return { nume: c.nume, telefon: c.telefon ?? "", adresa: c.adresa, localitate: c.localitate ?? "", email: c.email ?? "", observatii: c.observatii ?? "" };
}

function cifreTelefon(t: string): string {
  return t.replace(/\D/g, "").replace(/^(0040|40)(?=\d{9})/, "0");
}

// `eroare`: eroarea cererii de salvare (BUG-4) - motivele apar sub campurile lor;
// `prefix`: calea campurilor clientului in corpul cererii ("client." la "Oferta noua")
export function FormularClient({ client, onSchimba, onAlegeExistent, eroare, prefix = "client." }: { client: ClientDate; onSchimba: (c: ClientDate) => void; onAlegeExistent: (c: Client) => void; eroare?: unknown; prefix?: string }) {
  const [sugestii, setSugestii] = useState<Client[]>([]);
  // sugestiile pe nume; dupa o alegere nu mai apar pana cand numele se schimba
  const [sugestiiNume, setSugestiiNume] = useState<Client[]>([]);
  const [numeAles, setNumeAles] = useState<string | null>(null);
  const numeCautat = client.nume.trim();
  useEffect(() => {
    if (numeCautat.length < 3 || numeCautat === numeAles) return;
    const t = setTimeout(() => {
      apiClienti
        .cauta({ nume: numeCautat })
        .then(({ clienti }) => setSugestiiNume(clienti))
        .catch(() => setSugestiiNume([]));
    }, 250);
    return () => clearTimeout(t);
  }, [numeCautat, numeAles]);
  const vizibileNume = numeCautat.length >= 3 && numeCautat !== numeAles ? sugestiiNume : [];
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
          <input type="text" value={client.nume} onChange={(e) => set("nume", e.target.value)} required autoComplete="off" />
          {vizibileNume.length > 0 && (
            <ul className="lista-sugestii" aria-label="Clienți cu acest nume">
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
