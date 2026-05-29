import { NextResponse } from "next/server";
import { getCatalogItems } from "@/lib/mlServer";

type RouteContext = { params: Promise<{ catalogId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { catalogId } = await context.params;

  if (!catalogId) {
    return NextResponse.json({ error: "ID de catálogo requerido" }, { status: 400 });
  }

  try {
    const items = await getCatalogItems(catalogId);
    return NextResponse.json(items);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al obtener ítems";
    const status =
      err instanceof Error && err.message.includes("no encontrado")
        ? 404
        : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
