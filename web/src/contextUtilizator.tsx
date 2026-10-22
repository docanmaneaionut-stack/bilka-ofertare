import { createContext, useContext } from "react";
import type { Utilizator } from "./api";

// utilizatorul conectat, furnizat o singura data in App; paginile il citesc
// cu useUtilizator() in loc sa depinda de contextul rutelor
export const UtilizatorContext = createContext<Utilizator | null>(null);

export function useUtilizator(): Utilizator {
  const u = useContext(UtilizatorContext);
  if (!u) throw new Error("useUtilizator() folosit in afara unui cont conectat");
  return u;
}
