import { describe, expect, it } from "vitest";
import { hashParola, verificaParola } from "../src/modules/accounts/auth.js";

describe("hashParola / verificaParola", () => {
  it("o parola corecta se verifica cu succes dupa hash", async () => {
    const hash = await hashParola("parola-super-secreta");
    await expect(verificaParola("parola-super-secreta", hash)).resolves.toBe(true);
  });

  it("o parola gresita e respinsa", async () => {
    const hash = await hashParola("parola-super-secreta");
    await expect(verificaParola("alta-parola", hash)).resolves.toBe(false);
  });

  it("hash-ul nu contine parola in clar", async () => {
    const hash = await hashParola("parola-super-secreta");
    expect(hash).not.toContain("parola-super-secreta");
  });
});
