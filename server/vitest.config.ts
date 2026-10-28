import { configDefaults, defineConfig } from "vitest/config";
import { BaseSequencer, type TestSpecification } from "vitest/node";

// fisierele ruleaza in ordine alfabetica, nu dupa durata din cache: testele
// editorului de oferta (ofe-*) folosesc catalogul Bilka importat de testul de
// import (imp-import), care trebuie sa ruleze primul pe un compartiment gol
class OrdineAlfabetica extends BaseSequencer {
  override async sort(files: TestSpecification[]): Promise<TestSpecification[]> {
    return [...files].sort((a, b) => a.moduleId.localeCompare(b.moduleId));
  }
}
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
    // ofertele-model (etalon) au comanda lor, fara baza de date: npm run test:etalon
    exclude: [...configDefaults.exclude, "tests/etalon/**"],
    globalSetup: ["tests/globalSetup.ts"],
    env: { DATABASE_URL: urlTest, DATE_DIR: "data-test", ADMIN_REZERVA_EMAIL: "rezerva-test@exemplu.local" },
    testTimeout: 30_000,
    hookTimeout: 120_000,
    // testele impart aceeasi baza; se ruleaza secvential ca sa nu se calce
    fileParallelism: false,
    sequence: { sequencer: OrdineAlfabetica },
  },
});
