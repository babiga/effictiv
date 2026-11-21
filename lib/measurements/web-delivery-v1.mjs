import { co2 } from "@tgwf/co2";

const estimatorVersion = "0.19.0";
const modelVersion = 4;
const model = new co2({ model: "swd", version: modelVersion });
const greenHosting = false;
const { variables } = model.perByteTrace(0, greenHosting);

export const dashboardCachePolicy = "fresh-browser-context-per-visit";

const assumptions = {
  gridRegion: "global",
  gridIntensityGramsCo2ePerKwh: variables.gridIntensity.device.value,
  greenHostingFactor: variables.greenHostingFactor,
  cachePolicy: dashboardCachePolicy,
  boundary: "Operational and embodied emissions for the network, data center, and visitor device",
};

/**
 * @param {{query: (sql: string, values: unknown[]) => Promise<unknown>}} client
 * @param {string} runId
 * @param {number[]} bytesPerVisit
 */
export async function saveWebDeliveryEstimate(client, runId, bytesPerVisit) {
  if (!bytesPerVisit.length || bytesPerVisit.some((bytes) => !Number.isSafeInteger(bytes) || bytes < 0)) return;

  let transferredBytes = 0n;
  let totalGramsCo2e = 0;
  for (const bytes of bytesPerVisit) {
    transferredBytes += BigInt(bytes);
    totalGramsCo2e += model.perByte(bytes, greenHosting);
  }

  await client.query(`
    INSERT INTO web_delivery_estimates (
      run_id, transferred_bytes, total_grams_co2e, estimator_version, model_version, assumptions
    ) VALUES ($1, $2, $3, $4, $5, $6)
  `, [runId, transferredBytes.toString(), totalGramsCo2e, estimatorVersion, modelVersion, assumptions]);
}
