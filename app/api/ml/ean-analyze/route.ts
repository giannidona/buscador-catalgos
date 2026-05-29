import { NextRequest, NextResponse } from "next/server";
import { analyzeEan } from "@/lib/analyzeEan";

export async function GET(request: NextRequest) {
  const ean = request.nextUrl.searchParams.get("ean")?.trim();

  if (!ean) {
    return NextResponse.json({ error: "Parámetro ean requerido" }, { status: 400 });
  }

  try {
    const result = await analyzeEan(ean);
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al analizar EAN";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
