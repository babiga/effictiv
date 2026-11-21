import "server-only";

import { Pool } from "pg";

let pool: Pool | undefined;

export function database() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required");
    pool = new Pool({ connectionString, max: 3, connectionTimeoutMillis: 5000 });
    pool.on("error", (error) => console.error("Idle measurements database connection failed", error));
  }
  return pool;
}

export async function publicProjectExists(repositoryId: string) {
  const result = await database().query(
    "SELECT 1 FROM projects WHERE repository_id = $1 AND is_public", [repositoryId],
  );
  return result.rows.length > 0;
}
