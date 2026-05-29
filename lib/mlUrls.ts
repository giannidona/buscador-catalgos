// lib/mlUrls.ts — public Mercado Libre URLs (MLA / Argentina)

const MLA_SITE = "mercadolibre.com.ar";
const MLA_ORIGIN = `https://www.${MLA_SITE}`;

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function withCatalogSellersQuery(url: string): string {
  if (url.includes("/s?")) return url;
  return url.replace(/\/?$/, "/s?");
}

/** Página de catálogo con listado de vendedores (/?s). */
export function getCatalogPageUrl(
  catalogId: string,
  title?: string,
  permalink?: string
): string {
  const id = catalogId.toUpperCase();

  if (permalink?.trim()) {
    const raw = permalink.trim();
    const absolute = raw.startsWith("http")
      ? raw
      : `${MLA_ORIGIN}${raw.startsWith("/") ? raw : `/${raw}`}`;
    return withCatalogSellersQuery(absolute);
  }

  const slug = title?.trim() ? slugify(title) : "";
  if (slug) {
    return `${MLA_ORIGIN}/${slug}/p/${id}/s?`;
  }

  return `${MLA_ORIGIN}/p/${id}/s?`;
}

/** Publicación individual de un vendedor. */
export function getItemPageUrl(itemId: string, permalink?: string): string {
  if (permalink?.startsWith("http")) return permalink;

  const id = itemId.toUpperCase();
  const pathId = id.startsWith("MLA") ? id.replace(/^MLA/, "MLA-") : id;
  return `https://articulo.${MLA_SITE}/${pathId}`;
}
