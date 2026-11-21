import { dashboardCachePolicy, saveWebDeliveryEstimate } from "../../lib/measurements/web-delivery-v1.mjs";

export async function migrate(client) {
  await client.query(`
    CREATE TABLE web_delivery_estimates (
      run_id uuid PRIMARY KEY REFERENCES runs ON DELETE CASCADE,
      transferred_bytes bigint NOT NULL CHECK (transferred_bytes >= 0),
      total_grams_co2e double precision NOT NULL CHECK (
        total_grams_co2e >= 0 AND total_grams_co2e < 'Infinity'::double precision
      ),
      estimator_version text NOT NULL,
      model_version smallint NOT NULL CHECK (model_version > 0),
      assumptions jsonb NOT NULL
    )
  `);

  let after = null;
  while (true) {
    const { rows } = await client.query(`
      SELECT r.id, transfers.bytes
      FROM runs r
      CROSS JOIN LATERAL (
        SELECT array_agg(o.original_reading ORDER BY visit.number) AS bytes
        FROM generate_series(1, r.completed_visits) AS visit(number)
        JOIN observations o ON o.run_id = r.id AND o.subject = visit.number::text
          AND o.metric = 'transferred' AND o.unit = 'B' AND o.original_unit = 'B'
        HAVING count(*) = r.completed_visits
      ) transfers
      WHERE r.source_schema_version = 1 AND r.assertion = 'passed' AND r.cache_policy = $1
        AND ($2::uuid IS NULL OR r.id > $2)
      ORDER BY r.id
      LIMIT 100
    `, [dashboardCachePolicy, after]);
    for (const { id, bytes } of rows) await saveWebDeliveryEstimate(client, id, bytes);
    if (rows.length < 100) break;
    after = rows.at(-1).id;
  }
}
