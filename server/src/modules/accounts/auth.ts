import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

// fisa CONTURI §8.2: parole complexe, minim 10 caractere
export const LUNGIME_MINIMA_PAROLA = 10;

// fisa CONTURI §8.3: blocare temporara dupa incercari gresite repetate
export const MAX_INCERCARI_GRESITE = 5;
export const DURATA_BLOCARE_MINUTE = 15;

export function hashParola(parolaClara: string): Promise<string> {
  return bcrypt.hash(parolaClara, SALT_ROUNDS);
}

export function verificaParola(parolaClara: string, hash: string): Promise<boolean> {
  return bcrypt.compare(parolaClara, hash);
}

export function parolaEsteValida(parola: string): boolean {
  return typeof parola === "string" && parola.length >= LUNGIME_MINIMA_PAROLA;
}

export const REGEX_SERIE_OFERTA = /^[A-Z]{2,3}$/;
