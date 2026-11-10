import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// host: true -> aplicatia e accesibila din reteaua locala (tableta, telefon,
// acelasi Wi-Fi), nu doar de pe acest calculator.
// proxy /api -> serverul Express: aplicatia si API-ul au acelasi origin, deci
// cookie-ul de sesiune merge de pe orice adresa, fara CORS.
// xfwd: trimite adresa reala a dispozitivului (X-Forwarded-For), ca jurnalul
// de autentificari sa o vada, nu 127.0.0.1 (serverul are trust proxy loopback).
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        // VITE_API_PROXY: o a doua instanta (ex. verificarea in browser pe baza de test, S25)
        target: process.env.VITE_API_PROXY ?? "http://localhost:4000",
        xfwd: true,
      },
    },
  },
});
