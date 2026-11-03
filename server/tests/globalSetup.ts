import { execSync } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
import path from "node:path";
import pg from "pg";

// ruleaza o data, inainte de toate testele: migrarile pe baza de test, apoi
// golirea tuturor tabelelor (TRUNCATE nu declanseaza trigger-ele pe rand) si a
// folderului de date al testelor (fisierele ofertelor, sabloanele, importurile -
// orfane dupa golirea bazei; fara golire se adunau sute de MB intre rulari, iar
// exportul "descarca tot" din teste depasea limita de descarcare - S17b)
export default async function setup() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("Lipseste DATABASE_URL_TEST");
  const u = new URL(url);
  const numeBaza = u.pathname.replace(/^\//, "");
  const schema = u.searchParams.get("schema") ?? "public";
  if (!/test/i.test(numeBaza) && !/test/i.test(schema)) {
    throw new Error(`Refuz: baza "${numeBaza}" / schema "${schema}" nu contine "test"`);
  }
  const dateDir = process.env.DATE_DIR ?? "data-test";
  if (!/test/i.test(path.basename(dateDir))) throw new Error(`Refuz: folderul de date "${dateDir}" nu contine "test"`);
  const caleDate = path.resolve(process.cwd(), dateDir);
  for (const intrare of (() => { try { return readdirSync(caleDate); } catch { return [] as string[]; } })()) {
    rmSync(path.join(caleDate, intrare), { recursive: true, force: true });
  }

  execSync("npx prisma migrate deploy", { stdio: "pipe", env: { ...process.env, DATABASE_URL: url } });

  const pool = new pg.Pool({ connectionString: url });
  try {
    await pool.query(`SET search_path TO "${schema}"`);
    const { rows } = await pool.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = $1 AND tablename <> '_prisma_migrations'`,
      [schema],
    );
    if (rows.length > 0) {
      const tabele = rows.map((r) => `"${schema}"."${r.tablename}"`).join(", ");
      await pool.query(`TRUNCATE TABLE ${tabele} RESTART IDENTITY CASCADE`);
    }
  } finally {
    await pool.end();
  }
}
