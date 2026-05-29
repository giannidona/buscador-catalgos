// types/mercadolibre.ts

export interface MLItem {
  item_id: string;
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

export interface CatalogData {
  catalogId: string;
  title: string;
  status: string;
  totalCompetitors: number;
  minPrice: number | null;
  maxPrice: number | null;
  items: MLItem[];
}
