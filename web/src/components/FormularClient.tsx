import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClienti, type Client, type ClientDate } from "../api";
import { Camp } from "./ui";

// formularul clientului (FISA-OFERTARE cap. 2), cu autocompletare dupa telefon:
// la un telefon existent softul propune clientul existent

export function clientGol(): ClientDate {
  return { nume: "", telefon: "", adresa: "", localitate: "", email: "", observatii: "" };
}

export function dinClient(c: Client): ClientDate {
  return { nume: c.nume, telefon: c.telefon, adresa: c.adresa, localitate: c.localitate ?? "", email: c.email ?? "", observatii: c.observatii ?? "" };
}

function cifreTelefon(t: string): string {
  return t.replace(/\D/g, "").replace(/^(0040|40)(?=\d{9})/, "0");
}

export function FormularClient({ client, onSchimba, onAlegeExistent }: { client: ClientDate; onSchimba: (c: ClientDate) => void; onAlegeExistent: (c: Client) => void }) {
  const [sugestii, setSugestii] = useState<Client[]>([]);
  const set = (k: keyof ClientDate, v: string) => onSchimba({ ...client, [k]: v });
  const cifre = cifreTelefon(client.telefon);

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
  const exact = vizibile.find((s) => cifreTelefon(s.telefon) === cifre);
  const alege = (s: Client) => {
    onAlegeExistent(s);
    setSugestii([]);
  };

  return (
    <>
      <div className="rand-campuri">
        <Camp eticheta="Telefon" obligatoriu>
          <input type="tel" value={client.telefon} onChange={(e) => set("telefon", e.target.value)} required autoComplete="off" />
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
        <Camp eticheta="Nume" obligatoriu>
          <input type="text" value={client.nume} onChange={(e) => set("nume", e.target.value)} required />
        </Camp>
        <Camp eticheta="Adresa lucrării" obligatoriu>
          <input type="text" value={client.adresa} onChange={(e) => set("adresa", e.target.value)} required />
        </Camp>
        <Camp eticheta="Localitate">
          <input type="text" value={client.localitate ?? ""} onChange={(e) => set("localitate", e.target.value)} />
        </Camp>
        <Camp eticheta="E-mail">
          <input type="email" value={client.email ?? ""} onChange={(e) => set("email", e.target.value)} />
        </Camp>
        <Camp eticheta="Observații">
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
