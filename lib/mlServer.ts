// lib/mlServer.ts — server-side Mercado Libre API (no CORS)

import type {
  MLItemsResponse,
  MLCatalogDetail,
  MLSearchResponse,
} from "@/types/mercadolibre";
import { getAccessToken } from "@/lib/mlAuth";
import { enrichItemsWithSellerNames } from "@/lib/mlSellers";

const ML_API = "https://api.mercadolibre.com";

export async function mlFetch(path: string): Promise<Response> {
  const token = await getAccessToken();
  return fetch(`${ML_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });
}

export async function resolveEanToCatalog(ean: string): Promise<string> {
  const res = await mlFetch(
    `/products/search?site_id=MLA&product_identifier=${encodeURIComponent(ean)}`
  );

  if (!res.ok) {
    throw new Error(`No se pudo resolver el EAN (HTTP ${res.status})`);
  }

  const data: MLSearchResponse = await res.json();

  if (!data.results?.length) {
    throw new Error("No se encontró ningún catálogo para ese EAN");
  }

  const catalogId =
    data.results[0].catalog_product_id || data.results[0].id;

  if (!catalogId) {
    throw new Error("La API no devolvió un ID de catálogo válido");
  }

  return catalogId;
}

export async function getCatalogItems(
  catalogId: string
): Promise<MLItemsResponse> {
  const res = await mlFetch(`/products/${catalogId}/items`);

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Catálogo "${catalogId}" no encontrado`);
    }
    throw new Error(`Error al obtener ítems (HTTP ${res.status})`);
  }

  const data: MLItemsResponse = await res.json();
  const raw = data.results ?? data.items ?? [];
  const enriched = await enrichItemsWithSellerNames(raw);

  if (data.results) return { ...data, results: enriched };
  if (data.items) return { ...data, items: enriched };
  return { ...data, results: enriched };
}

export async function getCatalogDetail(
  catalogId: string
): Promise<MLCatalogDetail | null> {
  try {
    const res = await mlFetch(`/products/${catalogId}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
