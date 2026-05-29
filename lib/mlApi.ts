// lib/mlApi.ts — client calls our API routes (same origin, no CORS)

import type {
  MLItemsResponse,
  MLCatalogDetail,
  EanAnalyzeResult,
} from "@/types/mercadolibre";

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(path);

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Error HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function resolveEANtoCatalog(ean: string): Promise<string> {
  const data = await fetchApi<{ catalogId: string }>(
    `/api/ml/ean?ean=${encodeURIComponent(ean)}`
  );
  return data.catalogId;
}

export async function getCatalogItems(
  catalogId: string
): Promise<MLItemsResponse> {
  return fetchApi<MLItemsResponse>(
    `/api/ml/catalog/${encodeURIComponent(catalogId)}/items`
  );
}

export async function getCatalogDetail(
  catalogId: string
): Promise<MLCatalogDetail | null> {
  try {
    return await fetchApi<MLCatalogDetail>(
      `/api/ml/catalog/${encodeURIComponent(catalogId)}`
    );
  } catch {
    return null;
  }
}

export async function analyzeEan(ean: string): Promise<EanAnalyzeResult> {
  return fetchApi<EanAnalyzeResult>(
    `/api/ml/ean-analyze?ean=${encodeURIComponent(ean)}`
  );
}
