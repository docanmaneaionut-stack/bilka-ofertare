const BAZA_API = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export type Utilizator = {
  id: string;
  nume: string;
  email: string;
  rol: string;
  firmaId: string | null;
};

async function cerere<T>(cale: string, optiuni?: RequestInit): Promise<T> {
  const raspuns = await fetch(`${BAZA_API}${cale}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...optiuni,
  });
  if (!raspuns.ok) {
    const corp = await raspuns.json().catch(() => ({}));
    throw new Error(corp.eroare ?? `Cerere esuata (${raspuns.status})`);
  }
  if (raspuns.status === 204) {
    return undefined as T;
  }
  return raspuns.json() as Promise<T>;
}

export function obtineUtilizatorCurent() {
  return cerere<{ utilizator: Utilizator }>("/api/auth/me");
}

export function login(email: string, parola: string) {
  return cerere<{ utilizator: Utilizator }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, parola }),
  });
}

export function logout() {
  return cerere<void>("/api/auth/logout", { method: "POST" });
}
