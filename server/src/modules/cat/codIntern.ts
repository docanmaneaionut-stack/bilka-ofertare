import { createHash } from "node:crypto";

/**
 * Cod intern determinist: acelasi (cod furnizor, denumire) produce mereu
 * acelasi cod, in cadrul aceluiasi compartiment (identificat prin codScurt).
 * Stabil la reimport (S4) si folosit si la introducerea manuala (S3) cand
 * campul e lasat gol.
 */
export function genereazaCodIntern(params: {
  codScurtCompartiment: string;
  codFurnizor: string | null | undefined;
  denumire: string;
}): string {
  const intrare = `${params.codFurnizor?.trim().toUpperCase() ?? ""}|${params.denumire.trim().toLowerCase()}`;
  const amprenta = createHash("sha256").update(intrare, "utf8").digest("hex").slice(0, 10).toUpperCase();
  return `${params.codScurtCompartiment.toUpperCase()}-${amprenta}`;
}
