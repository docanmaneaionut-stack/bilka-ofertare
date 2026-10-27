import { defineConfig } from "vitest/config";

// Testele etalon (ofertele-model din docs/etalon) ruleaza separat de restul
// suitei: npm run test:etalon. Motorul de calcul e pur, deci nu e nevoie de
// baza de date, de .env sau de globalSetup. Pana la S11 sunt rosii, cu raportul
// de diferente; npm test ramane verde.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/etalon/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
