import type { Pool } from "pg";
import { createOpenAIProvider, type AIProvider } from "./ai";
import { ProcessingError } from "./schema";
import { budgetRecordingApproved } from "./approval";
export async function reserveAIRequest(
  pool: Pool,
  id: string,
  operation: "transcription" | "analysis",
  model: string,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      "SELECT * FROM sounding_ai_budget WHERE scope='module1' FOR UPDATE",
    );
    const budget = result.rows[0];
    if (
      !budget ||
      !budgetRecordingApproved(id, budget.approved_recording_id) ||
      budget.reserved_cents + 20 > budget.authorized_cents
    )
      throw new ProcessingError("spending_approval_required");
    const prior = await client.query(
      "SELECT 1 FROM sounding_ai_request WHERE recording_id=$1 AND operation=$2",
      [id, operation],
    );
    if (prior.rowCount) throw new ProcessingError("billable_request_already_reserved");
    await client.query(
      "INSERT INTO sounding_ai_request(recording_id,operation,scope,model,reserved_cents,status) VALUES($1,$2,'module1',$3,20,'reserved')",
      [id, operation, model],
    );
    await client.query(
      "UPDATE sounding_ai_budget SET reserved_cents=reserved_cents+20 WHERE scope='module1'",
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
export function estimateCostCents(
  operation: "transcription" | "analysis",
  usage: Record<string, unknown>,
) {
  const input = usage[operation === "analysis" ? "prompt_tokens" : "input_tokens"];
  const output = usage[operation === "analysis" ? "completion_tokens" : "output_tokens"];
  if (
    typeof input !== "number" ||
    typeof output !== "number" ||
    !Number.isFinite(input) ||
    !Number.isFinite(output) ||
    input < 0 ||
    output < 0
  )
    return null;
  return operation === "analysis"
    ? (input * 0.15 + output * 0.6) / 10000
    : (input * 2.5 + output * 10) / 10000;
}
export function createBudgetedProvider(pool: Pool, id: string, key: string): AIProvider {
  const provider = createOpenAIProvider(key, fetch, async (operation, usage) => {
    const fields = [
      "prompt_tokens",
      "completion_tokens",
      "total_tokens",
      "seconds",
      "input_tokens",
      "output_tokens",
    ];
    const safe = Object.fromEntries(
      fields
        .filter(
          (k) =>
            typeof usage?.[k] === "number" &&
            Number.isFinite(usage[k]) &&
            (usage[k] as number) >= 0,
        )
        .map((k) => [k, usage[k]]),
    );
    const estimate = estimateCostCents(operation, safe);
    await pool.query(
      "UPDATE sounding_ai_request SET usage=$1::jsonb,estimated_cents=COALESCE($2,estimated_cents) WHERE recording_id=$3 AND operation=$4",
      [JSON.stringify(safe), estimate, id, operation],
    );
  });
  async function run<T>(
    operation: "transcription" | "analysis",
    model: string,
    fn: () => Promise<T>,
    estimatedCents?: number,
  ) {
    await reserveAIRequest(pool, id, operation, model);
    if (estimatedCents !== undefined)
      await pool.query(
        "UPDATE sounding_ai_request SET estimated_cents=$1 WHERE recording_id=$2 AND operation=$3",
        [estimatedCents, id, operation],
      );
    try {
      const result = await fn();
      await pool.query(
        "UPDATE sounding_ai_request SET status='succeeded',completed_at=now() WHERE recording_id=$1 AND operation=$2",
        [id, operation],
      );
      return result;
    } catch (e) {
      await pool.query(
        "UPDATE sounding_ai_request SET status='uncertain',completed_at=now() WHERE recording_id=$1 AND operation=$2",
        [id, operation],
      );
      throw e;
    }
  }
  return {
    transcribe: (bytes, name, mime, duration) =>
      run(
        "transcription",
        process.env.TRANSCRIPTION_MODEL ?? "gpt-4o-transcribe-diarize",
        () => provider.transcribe(bytes, name, mime, duration),
        (duration / 60) * 0.6,
      ),
    analyze: (transcript) => run("analysis", "gpt-4o-mini", () => provider.analyze(transcript)),
  };
}
