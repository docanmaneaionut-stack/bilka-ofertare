import { defineConfig } from "vitest/config";
import { config as incarcaEnv } from "dotenv";

incarcaEnv();

// Testele NU ruleaza pe baza de dezvoltare (contine catalogul real, iar
// trigger-ul de imutabilitate ar bloca si curatarea). Baza de test se da prin
// DATABASE_URL_TEST, iar numele bazei sau al schemei trebuie sa contina "test".
const urlTest = process.env.DATABASE_URL_TEST;
if (!urlTest) {
  throw new Error("Lipseste DATABASE_URL_TEST din .env - testele ruleaza doar pe o baza de test");
}
const u = new URL(urlTest);
const numeBaza = u.pathname.replace(/^\//, "");
const schema = u.searchParams.get("schema") ?? "public";
if (!/test/i.test(numeBaza) && !/test/i.test(schema)) {
  throw new Error(`DATABASE_URL_TEST trebuie sa indice o baza sau o schema cu "test" in nume (baza: ${numeBaza}, schema: ${schema})`);
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/globalSetup.ts"],
    env: { DATABASE_URL: urlTest, DATE_DIR: "data-test" },
    testTimeout: 30_000,
    hookTimeout: 120_000,
    // testele impart aceeasi baza; se ruleaza secvential ca sa nu se calce
    fileParallelism: false,
  },
});
