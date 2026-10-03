import { sql } from "@/lib/db";

export async function GET() {
  try {
    const result = await sql`select now() as database_time`;

    return Response.json({
      service: "taskcash",
      status: "ok",
      database: "connected",
      databaseTime: result[0]?.database_time ?? null,
    });
  } catch {
    return Response.json(
      { service: "taskcash", status: "degraded", database: "unavailable" },
      { status: 503 },
    );
  }
}
