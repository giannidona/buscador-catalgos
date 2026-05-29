import { NextRequest, NextResponse } from "next/server";
import { resolveEanToCatalog } from "@/lib/mlServer";

export async function GET(request: NextRequest) {
  const ean = request.nextUrl.searchParams.get("ean")?.trim();

  if (!ean) {
    return NextResponse.json({ error: "Parámetro ean requerido" }, { status: 400 });
  }

  try {
    const catalogId = await resolveEanToCatalog(ean);
    return NextResponse.json({ catalogId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al resolver EAN";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
