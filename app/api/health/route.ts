import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    service: "taskcash",
    status: "ok",
    environment: process.env.NODE_ENV ?? "development",
    timestamp: new Date().toISOString(),
  });
}