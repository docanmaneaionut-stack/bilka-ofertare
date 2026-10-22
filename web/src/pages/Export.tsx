import { URL_EXPORT } from "../api";
import { Ajutor } from "../components/ui";

export function Export() {
  return (
    <>
      <h1>Export „descarcă tot”</h1>
      <div className="actiuni" style={{ marginBottom: 24 }}>
        <a className="buton" href={URL_EXPORT}>
          Descarcă tot (ZIP)
        </a>
      </div>
      <Ajutor>
        <ul>
          <li>Un singur fișier ZIP cu tot ce e în soft: câte un CSV per tabel (firme, utilizatori fără parole, compartimente, grupuri, familii, produse, versiunile de preț cu rândurile lor, tabelele de referință, jurnalul, istoricul importurilor), folderul de date al serverului (siglele și fișierele brute ale importurilor) și un README cu data, versiunea și numărătorile.</li>
          <li>Hash-urile parolelor (nu parolele — nu se pot inversa) stau separat, în <code>_sistem/parole.csv</code>, doar ca o restaurare să lase conturile funcționale.</li>
          <li>Restaurarea e o comandă tehnică, pe o bază goală: <code>npm run restore -- &lt;zip&gt;</code> în <code>server/</code>. Acceptă exporturi din aceeași versiune a softului sau mai vechi; refuză unul mai nou.</li>
          <li>Fiecare export lasă rând în jurnal (cine, când, cât).</li>
        </ul>
      </Ajutor>
    </>
  );
}
