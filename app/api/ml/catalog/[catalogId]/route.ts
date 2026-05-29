import { NextResponse } from "next/server";
import { getCatalogDetail } from "@/lib/mlServer";

type RouteContext = { params: Promise<{ catalogId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { catalogId } = await context.params;

  if (!catalogId) {
    return NextResponse.json({ error: "ID de catálogo requerido" }, { status: 400 });
  }

  try {
    const detail = await getCatalogDetail(catalogId);
    if (!detail) {
      return NextResponse.json(
        { error: `Catálogo "${catalogId}" no encontrado` },
        { status: 404 }
      );
    }
    return NextResponse.json(detail);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al obtener catálogo";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
