// types/mercadolibre.ts

export interface MLItem {
  item_id: string;
  seller_id?: number;
  title?: string;
  price?: number;
  selling_price?: number;
  currency_id?: string;
  is_winner?: boolean;
  winner_item_id?: string;
  seller_nickname?: string;
  seller?: {
    id: number;
    nickname: string;
  };
  seller_reputation_level?: string;
  shipping?: {
    free_shipping: boolean;
  };
  free_shipping?: boolean;
  thumbnail?: string;
  permalink?: string;
}

export interface MLItemsResponse {
  results?: MLItem[];
  items?: MLItem[];
  paging?: {
    total: number;
    offset: number;
    limit: number;
  };
}

export interface MLCatalogDetail {
  id: string;
  name?: string;
  title?: string;
  status?: string;
  domain_id?: string;
  permalink?: string;
  pictures?: { url: string }[];
}

export interface MLSearchResult {
  catalog_product_id?: string;
  id?: string;
  name?: string;
}

export interface MLSearchResponse {
  results: MLSearchResult[];
  paging: {
    total: number;
    offset: number;
    limit: number;
  };
}

export type EanAnalyzeResult =
  | {
      status: "empty";
      ean: string;
      catalogId: string;
      title: string | null;
      catalogUrl: string;
    }
  | {
      status: "active";
      ean: string;
      catalogId: string;
      title: string | null;
      competitorCount: number;
      catalogUrl: string;
    }
  | { status: "unresolved"; ean: string; message: string }
  | { status: "error"; ean: string; message: string };

export interface CatalogData {
  catalogId: string;
  title: string;
  catalogUrl: string;
  status: string;
  totalCompetitors: number;
  minPrice: number | null;
  maxPrice: number | null;
  items: MLItem[];
}
