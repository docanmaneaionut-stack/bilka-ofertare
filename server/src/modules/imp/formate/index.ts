import { formatBilkaV1 } from "./bilkaV1.js";

// importatorul se alege dupa compartiment.formatImport; un furnizor nou =
// un format nou aici, fara sa atinga restul importului (ARH §6, IMP)
export const FORMATE = {
  [formatBilkaV1.id]: formatBilkaV1,
} as const;

export function gasesteFormat(id: string | null | undefined) {
  if (!id) return null;
  return (FORMATE as Record<string, typeof formatBilkaV1>)[id] ?? null;
}
