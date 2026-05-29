// lib/analyzeEan.ts — server-only EAN → catalog vacancy check

import { resolveEanToCatalog, getCatalogDetail, mlFetch } from "@/lib/mlServer";
import { getCatalogPageUrl } from "@/lib/mlUrls";
import type { EanAnalyzeResult } from "@/types/mercadolibre";

async function getCatalogCompetitorCount(
  catalogId: string
): Promise<number | null> {
  const res = await mlFetch(`/products/${catalogId}/items`);

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Error al obtener ítems (HTTP ${res.status})`);
  }

  const data = await res.json();
  const items = data.results ?? data.items ?? [];
  return data.paging?.total ?? items.length;
}

export async function analyzeEan(ean: string): Promise<EanAnalyzeResult> {
  const normalized = ean.trim().replace(/\D/g, "");

  if (!/^\d{8,14}$/.test(normalized)) {
    return {
      status: "error",
      ean: normalized || ean,
      message: "EAN inválido (8–14 dígitos)",
    };
  }

  try {
    const catalogId = await resolveEanToCatalog(normalized);
    const detail = await getCatalogDetail(catalogId);
    const title = detail?.name ?? detail?.title ?? null;
    const catalogUrl = getCatalogPageUrl(
      catalogId,
      title ?? undefined,
      detail?.permalink
    );

    let competitorCount: number | null;
    try {
      competitorCount = await getCatalogCompetitorCount(catalogId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al consultar competidores";
      return { status: "error", ean: normalized, message };
    }

    if (competitorCount == null || competitorCount === 0) {
      return {
        status: "empty",
        ean: normalized,
        catalogId,
        title,
        catalogUrl,
      };
    }

    return {
      status: "active",
      ean: normalized,
      catalogId,
      title,
      competitorCount,
      catalogUrl,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error desconocido";
    return { status: "unresolved", ean: normalized, message };
  }
}
