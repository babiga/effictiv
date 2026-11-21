import { readdir, readFile } from "node:fs/promises";
import { Client } from "pg";

const migrations = new URL("../db/migrations/", import.meta.url);
const files = (await readdir(migrations)).filter((name) => /^\d+-.+\.(sql|mjs)$/.test(name)).sort();
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DATABASE_URL to the Effictiv PostgreSQL database");

const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(1306723014)");
  await client.query(`
    CREATE TABLE IF NOT EXISTS effictiv_schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  const { rows } = await client.query("SELECT name FROM effictiv_schema_migrations");
  const applied = new Set(rows.map(({ name }) => name));
  const pending = files.filter((name) => !applied.has(name));
  for (const name of pending) {
    const file = new URL(name, migrations);
    if (name.endsWith(".sql")) {
      await client.query(await readFile(file, "utf8"));
    } else {
      const { migrate } = await import(file.href);
      await migrate(client);
    }
    await client.query("INSERT INTO effictiv_schema_migrations (name) VALUES ($1)", [name]);
  }
  await client.query("COMMIT");
  console.log(pending.length ? `Applied ${pending.join(", ")}` : "Database is up to date.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
