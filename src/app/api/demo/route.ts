import { getAuth } from "@/lib/auth";
import { sameOrigin } from "@/lib/http-security";
import { getPool } from "@/lib/db";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ message: "Invalid request origin." }, { status: 403 });
  if (!process.env.DEMO_PASSWORD)
    return Response.json({ message: "The demo is not configured." }, { status: 503 });
  try {
    // Persisted global quota bounds creation across serverless instances; no attacker-supplied IP bypass.
    const { rows } = await getPool()
      .query(`INSERT INTO sounding_demo_quota (bucket,hits) VALUES (date_trunc('minute',now()),1)
      ON CONFLICT(bucket) DO UPDATE SET hits=sounding_demo_quota.hits+1 RETURNING hits`);
    if (Number(rows[0].hits) > 40)
      return Response.json(
        { message: "Demo sign-ins are busy. Try again in a minute." },
        { status: 429 },
      );
    return getAuth().api.signInEmail({
      body: {
        email: process.env.DEMO_EMAIL ?? "demo@sounding.example",
        password: process.env.DEMO_PASSWORD,
      },
      headers: request.headers,
      asResponse: true,
    });
  } catch {
    return Response.json(
      { message: "Could not start the demo. Please try again." },
      { status: 503 },
    );
  }
}
