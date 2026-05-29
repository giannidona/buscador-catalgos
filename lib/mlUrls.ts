// lib/mlUrls.ts — public Mercado Libre URLs (MLA / Argentina)

const MLA_SITE = "mercadolibre.com.ar";

/** Página de producto de catálogo (todas las publicaciones compitiendo). */
export function getCatalogPageUrl(catalogId: string): string {
  return `https://www.${MLA_SITE}/p/${catalogId.toUpperCase()}`;
}

/** Publicación individual de un vendedor. */
export function getItemPageUrl(itemId: string, permalink?: string): string {
  if (permalink?.startsWith("http")) return permalink;

  const id = itemId.toUpperCase();
  const pathId = id.startsWith("MLA") ? id.replace(/^MLA/, "MLA-") : id;
  return `https://articulo.${MLA_SITE}/${pathId}`;
}
