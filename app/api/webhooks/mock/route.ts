import { NextResponse } from "next/server";
import { mockProvider } from "@/lib/task-engine/providers/mock";

export async function POST(request: Request) {
  try {
    const conversion = await mockProvider.verifyConversion(request);

    if (!conversion.externalConversionId || !conversion.userExternalId) {
      return NextResponse.json({ error: "Invalid conversion payload" }, { status: 400 });
    }

    // Production path: resolve provider + user, verify signature, enforce idempotency,
    // persist conversion, then create a pending ledger entry in one transaction.
    return NextResponse.json({
      ok: true,
      status: "accepted",
      conversionId: conversion.externalConversionId,
    });
  } catch {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
}