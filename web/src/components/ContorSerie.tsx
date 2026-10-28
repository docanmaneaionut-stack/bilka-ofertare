import { useEffect, useState, type FormEvent } from "react";
import { apiOferte } from "../api";
import { Camp, Mesaj, textEroare } from "./ui";

// Admin general: contorul unei serii de oferta poate porni de la un numar dat
// (dupa prototip), cu jurnal; nu coboara sub ultimul numar folosit deja
export function ContorSerie({ serie }: { serie: string }) {
  const [ultimul, setUltimul] = useState<number | null>(null);
  const [valoare, setValoare] = useState("");
  const [mesaj, setMesaj] = useState<{ tip: "ok" | "eroare"; text: string } | null>(null);

  useEffect(() => {
    apiOferte
      .contor(serie)
      .then((r) => {
        setUltimul(r.ultimulNumar);
        setValoare(String(r.ultimulNumar));
      })
      .catch((e) => setMesaj({ tip: "eroare", text: textEroare(e) }));
  }, [serie]);

  async function salveaza(e: FormEvent) {
    e.preventDefault();
    setMesaj(null);
    try {
      const r = await apiOferte.seteazaContor(serie, Number(valoare));
      setUltimul(r.ultimulNumar);
      setMesaj({ tip: "ok", text: `Următoarea ofertă pe seria ${serie} va fi ${serie}-${String(r.ultimulNumar + 1).padStart(4, "0")}.` });
    } catch (err) {
      setMesaj({ tip: "eroare", text: textEroare(err) });
    }
  }

  return (
    <form className="formular" onSubmit={salveaza} style={{ maxWidth: 520 }}>
      <h3>Numerotarea pe seria {serie}</h3>
      <Camp eticheta={`Ultimul număr folosit${ultimul !== null ? ` (acum ${ultimul})` : ""}`}>
        <input type="number" min={0} value={valoare} onChange={(e) => setValoare(e.target.value)} />
      </Camp>
      {mesaj && <Mesaj tip={mesaj.tip}>{mesaj.text}</Mesaj>}
      <div className="actiuni">
        <button className="buton secundar" type="submit">
          Setează contorul
        </button>
      </div>
    </form>
  );
}
