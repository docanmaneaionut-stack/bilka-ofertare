import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Testele de componenta ale web-ului (S25): jsdom + testing-library; `npm test` in web/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.tsx", "src/**/*.test.ts"],
    setupFiles: ["src/test-setup.ts"],
  },
});
