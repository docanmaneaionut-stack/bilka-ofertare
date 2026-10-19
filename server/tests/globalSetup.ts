import { execSync } from "node:child_process";
import pg from "pg";

// ruleaza o data, inainte de toate testele: migrarile pe baza de test, apoi
// golirea tuturor tabelelor (TRUNCATE nu declanseaza trigger-ele pe rand)
export default async function setup() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("Lipseste DATABASE_URL_TEST");
  const u = new URL(url);
  const numeBaza = u.pathname.replace(/^\//, "");
  const schema = u.searchParams.get("schema") ?? "public";
  if (!/test/i.test(numeBaza) && !/test/i.test(schema)) {
    throw new Error(`Refuz: baza "${numeBaza}" / schema "${schema}" nu contine "test"`);
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
