import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export function hashParola(parolaClara: string): Promise<string> {
  return bcrypt.hash(parolaClara, SALT_ROUNDS);
}

export function verificaParola(parolaClara: string, hash: string): Promise<boolean> {
  return bcrypt.compare(parolaClara, hash);
}
