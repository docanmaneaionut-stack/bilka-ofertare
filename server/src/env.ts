import "dotenv/config";
import path from "node:path";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Lipseste variabila de mediu ${name} (vezi .env.example)`);
  }
  return value;
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  sessionSecret: required("SESSION_SECRET"),
  port: Number(process.env.PORT ?? 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  // folderul de date al serverului (fisierele brute ale importurilor); nu e in git
  dateDir: process.env.DATE_DIR ?? path.resolve(process.cwd(), "data"),
};
