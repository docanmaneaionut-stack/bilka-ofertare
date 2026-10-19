import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiListe, type ListaPret } from "../api";
import { Ajutor, Mesaj, textEroare } from "../components/ui";
import { dataRo, ETICHETA_STATUS } from "./ListePret";
import { RaportFisiere } from "./ImportPropunere";

export function ListaDetaliu() {
  const { id } = useParams();
  const [lista, setLista] = useState<ListaPret | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiListe
      .detaliu(id)
      .then(({ lista }) => setLista(lista))
      .catch((e) => setEroare(textEroare(e)));
  }, [id]);

  if (eroare) return <Mesaj tip="eroare">{eroare}</Mesaj>;
  if (!lista) return null;

  return (
    <>
      <p className="mic">
        <Link to={`/zona-tehnica/liste?compartiment=${lista.compartimentId}`}>← Listele de preț</Link>
      </p>
      <h1>
        {lista.denumire} <span className={`eticheta ${lista.status === "ACTIVA" ? "" : "inactiv"}`}>{ETICHETA_STATUS[lista.status]}</span>
      </h1>
      <div className="grila-totaluri">
        <div>
          <span className="numar-mare">{lista._count?.preturi ?? "–"}</span>
          <span className="text-secundar mic">prețuri</span>
        </div>
        <div>
          <span className="numar-mare">{dataRo(lista.valabilaDeLa)}</span>
          <span className="text-secundar mic">valabilă de la</span>
        </div>
        <div>
          <span className="numar-mare">{dataRo(lista.activataLa)}</span>
          <span className="text-secundar mic">activată</span>
        </div>
        <div>
          <span className="numar-mare">{dataRo(lista.arhivataLa)}</span>
          <span className="text-secundar mic">arhivată</span>
        </div>
      </div>
      <p className="text-secundar mic">
        {lista.compartiment?.denumire} · creată {dataRo(lista.createdAt)}
        {lista.creataDe ? ` de ${lista.creataDe.nume}` : ""}
        {lista.propuneri && lista.propuneri.length > 0 && (
          <>
            {" "}
            · <Link to={`/zona-tehnica/import/${lista.propuneri[0].id}`}>diferențele importului</Link>
          </>
        )}
      </p>

      {lista.raport ? <RaportFisiere raport={lista.raport} /> : <Mesaj>Fără raport de import (versiune creată manual).</Mesaj>}

      <Ajutor>
        <ul>
          <li>Fișierele sursă sunt păstrate pe disc, în folderul de date al serverului, exact cum au fost încărcate — sursa unei versiuni e reproductibilă.</li>
          <li>Numărătorile pe fișier se compară cu versiunea anterioară; o diferență apare ca avertizare, nu blochează.</li>
          <li>O versiune arhivată nu se modifică; pentru prețuri vechi se reimportă fișierele ei ca versiune nouă.</li>
        </ul>
      </Ajutor>
    </>
  );
}
