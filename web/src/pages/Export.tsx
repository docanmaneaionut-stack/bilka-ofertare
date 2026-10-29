import { URL_EXPORT } from "../api";
import { Ajutor } from "../components/ui";
import { useUtilizator } from "../contextUtilizator";

// Export "descarca tot" (fisa CONTURI §8.4): Admin general - tot; Administratorul
// (S17a) - exportul de firma: doar datele firmei lui, fara parole
export function Export() {
  const eu = useUtilizator();
  const deFirma = eu.rol === "ADMINISTRATOR";
  return (
    <>
      <h1>{deFirma ? "Export — datele firmei mele" : "Export „descarcă tot”"}</h1>
      <div className="actiuni" style={{ marginBottom: 24 }}>
        <a className="buton" href={URL_EXPORT}>
          {deFirma ? "Descarcă datele firmei (ZIP)" : "Descarcă tot (ZIP)"}
        </a>
      </div>
      <Ajutor>
        <ul>
          {deFirma ? (
            <li>Un singur fișier ZIP cu datele firmei tale: firma, utilizatorii ei (fără parole), clienții, ofertele cu produsele, prețurile, istoricul, notițele, documentele și formularele Bilka, comenzile, montatorii, jurnalul utilizatorilor firmei, plus tabelele comune (catalog, referințe, cursuri). Fără parole, fără datele altor firme. Nu se restaurează cu <code>npm run restore</code> — e o copie de siguranță a firmei, nu a întregului soft.</li>
          ) : (
            <li>Un singur fișier ZIP cu tot ce e în soft: câte un CSV per tabel (firme, utilizatori fără parole, catalogul, versiunile de preț, tabelele de referință, clienții, ofertele cu produsele, prețurile, istoricul, notițele, documentele și formularele Bilka, comenzile, montatorii, cursurile, jurnalul, istoricul importurilor), folderul de date al serverului (siglele, șabloanele Bilka, documentele generate, atașamentele, fișierele brute ale importurilor) și un README cu data, versiunea și numărătorile.</li>
          )}
          {!deFirma && (
            <li>Hash-urile parolelor (nu parolele — nu se pot inversa) stau separat, în <code>_sistem/parole.csv</code>, doar ca o restaurare să lase conturile funcționale.</li>
          )}
          {!deFirma && (
            <li>Restaurarea e o comandă tehnică, pe o bază goală: <code>npm run restore -- &lt;zip&gt;</code> în <code>server/</code>. Acceptă exporturi din aceeași versiune a softului sau mai vechi; refuză unul mai nou și refuză un export de firmă.</li>
          )}
          <li>Fiecare export lasă rând în jurnal (cine, când, cât).</li>
        </ul>
      </Ajutor>
    </>
  );
}
