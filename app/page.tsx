// app/catalog-scout/page.tsx
// (o pages/catalog-scout.tsx si usás Pages Router — solo cambiá el export default)

import CatalogScoutApp from "@/components/CatalogScoutApp";

export const metadata = {
  title: "Catalog Scout — MercadoLibre",
  description: "Buscador de catálogos de MercadoLibre por MLA o EAN",
};

export default function CatalogScoutPage() {
  return <CatalogScoutApp />;
}
