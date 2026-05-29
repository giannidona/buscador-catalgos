// lib/mlApi.ts

import type {
  MLItemsResponse,
  MLCatalogDetail,
  MLSearchResponse,
} from "@/types/mercadolibre";

const ML_API = "https://api.mercadolibre.com";

function getHeaders(token?: string): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function resolveEANtoCatalog(
  ean: string,
  token?: string
): Promise<string> {
  const url = `${ML_API}/products/search?site_id=MLA&product_identifier=${ean}`;
  const res = await fetch(url, { headers: getHeaders(token) });

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
  catalogId: string,
  token?: string
): Promise<MLItemsResponse> {
  const url = `${ML_API}/products/${catalogId}/items`;
  const res = await fetch(url, { headers: getHeaders(token) });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Catálogo "${catalogId}" no encontrado`);
    }
    throw new Error(`Error al obtener ítems (HTTP ${res.status})`);
  }

  return res.json();
}

export async function getCatalogDetail(
  catalogId: string,
  token?: string
): Promise<MLCatalogDetail | null> {
  try {
    const url = `${ML_API}/products/${catalogId}`;
    const res = await fetch(url, { headers: getHeaders(token) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
