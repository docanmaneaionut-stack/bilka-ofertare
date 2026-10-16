import type { Utilizator } from "../api";

export function ZonaTehnica({
  utilizator,
  onLogout,
}: {
  utilizator: Utilizator;
  onLogout: () => void;
}) {
  return (
    <main style={{ maxWidth: 640, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h1>Zona tehnica</h1>
      <p>
        Salut, {utilizator.nume}. Aceasta pagina e goala deocamdata — ecranele reale
        (catalog, liste de preturi) vin in sesiunea S3.
      </p>
      <button onClick={onLogout}>Iesi din cont</button>
    </main>
  );
}
