"use client";

// components/CatalogScout.tsx

import { useState, useCallback, KeyboardEvent } from "react";
import type { CatalogData, MLItem } from "@/types/mercadolibre";
import {
  resolveEANtoCatalog,
  getCatalogItems,
  getCatalogDetail,
} from "@/lib/mlApi";
import styles from "./CatalogScout.module.css";

const MAX_VISIBLE_ITEMS = 10;

// ─── helpers ────────────────────────────────────────────────────────────────

function formatPrice(n: number): string {
  return n.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function isEAN(q: string): boolean {
  return /^\d{8,14}$/.test(q);
}

function isMLA(q: string): boolean {
  return /^MLA\d+$/i.test(q);
}

// ─── sub-components ──────────────────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <div className={styles.metric}>
      <div className={styles.metricLabel}>
        <span className={`ti ${icon}`} aria-hidden />
        {label}
      </div>
      <div className={styles.metricValue} style={accent ? { color: accent } : {}}>
        {value}
      </div>
      <div className={styles.metricSub}>{sub}</div>
    </div>
  );
}

function CompetitorRow({
  item,
  rank,
  minPrice,
  maxPrice,
}: {
  item: MLItem;
  rank: number;
  minPrice: number | null;
  maxPrice: number | null;
}) {
  const price = item.price ?? item.selling_price;
  const isWinner = rank === 1 || item.is_winner;
  const sellerName =
    item.seller_nickname ?? item.seller?.nickname ?? `Vendedor ${rank}`;
  const hasFreeShipping =
    item.shipping?.free_shipping ?? item.free_shipping ?? false;

  let priceClass = styles.compPrice;
  if (price != null) {
    if (price === minPrice) priceClass += ` ${styles.priceMin}`;
    else if (price === maxPrice) priceClass += ` ${styles.priceMax}`;
  }

  return (
    <div className={styles.compRow}>
      <div className={`${styles.compRank} ${isWinner ? styles.winner : ""}`}>
        {isWinner ? (
          <span className="ti ti-crown" aria-hidden />
        ) : (
          rank
        )}
      </div>

      <div className={styles.compSeller}>
        <div className={styles.compSellerName}>{sellerName}</div>
        {item.seller_reputation_level && (
          <div className={styles.compSellerMeta}>
            {item.seller_reputation_level}
          </div>
        )}
      </div>

      {price != null && (
        <div className={priceClass}>{formatPrice(price)}</div>
      )}

      <div className={styles.tags}>
        {isWinner && <span className={`${styles.tag} ${styles.tagWinner}`}>Ganador</span>}
        {hasFreeShipping && (
          <span className={`${styles.tag} ${styles.tagFree}`}>Envío gratis</span>
        )}
      </div>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function CatalogScout() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Consultando API...");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CatalogData | null>(null);
  const [resolvedNote, setResolvedNote] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const addToHistory = useCallback((q: string) => {
    setHistory((prev) => [q, ...prev.filter((x) => x !== q)].slice(0, 6));
  }, []);

  const handleSearch = useCallback(
    async (overrideQuery?: string) => {
      const rawQuery = (overrideQuery ?? query).trim();
      if (!rawQuery) return;

      setLoading(true);
      setError(null);
      setData(null);
      setResolvedNote(null);

      try {
        let catalogId = rawQuery.toUpperCase();

        if (isEAN(rawQuery)) {
          setLoadingMsg("Resolviendo EAN a catálogo...");
          catalogId = await resolveEANtoCatalog(rawQuery);
          setResolvedNote(`EAN ${rawQuery} resuelto a ${catalogId}`);
        } else if (!isMLA(rawQuery)) {
          throw new Error(
            "Formato no reconocido. Usá un ID de catálogo (MLA...) o un código EAN (8–14 dígitos)."
          );
        }

        setLoadingMsg("Obteniendo competidores...");

        const [itemsData, catalogDetail] = await Promise.all([
          getCatalogItems(catalogId),
          getCatalogDetail(catalogId),
        ]);

        const items = itemsData.results ?? itemsData.items ?? [];
        const totalCompetitors = itemsData.paging?.total ?? items.length;
        const prices = items
          .map((i) => i.price ?? i.selling_price)
          .filter((p): p is number => p != null);

        addToHistory(rawQuery.toUpperCase());

        setData({
          catalogId,
          title: catalogDetail?.name ?? catalogDetail?.title ?? catalogId,
          status: catalogDetail?.status ?? "active",
          totalCompetitors,
          minPrice: prices.length ? Math.min(...prices) : null,
          maxPrice: prices.length ? Math.max(...prices) : null,
          items,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error desconocido al consultar la API"
        );
      } finally {
        setLoading(false);
      }
    },
    [query, addToHistory]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const moreCount =
    data && data.totalCompetitors > MAX_VISIBLE_ITEMS
      ? data.totalCompetitors - MAX_VISIBLE_ITEMS
      : 0;

  return (
    <div className={styles.app}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.mlBadge}>ML</span>
          Catalog Scout
        </h1>
        <p className={styles.subtitle}>
          Buscá competidores por ID de catálogo (MLA) o código EAN
        </p>
      </div>

      {/* Search box */}
      <div className={styles.searchBox}>
        <div className={styles.inputRow}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel} htmlFor="queryInput">
              Catálogo / EAN
            </label>
            <input
              id="queryInput"
              type="text"
              className={styles.input}
              placeholder="MLA12345 o 7790001234567"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <button
            className={styles.searchBtn}
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            aria-label="Buscar catálogo"
          >
            <span className="ti ti-search" aria-hidden />
            Buscar
          </button>
        </div>

        <p className={styles.hint}>
          <span className="ti ti-info-circle" aria-hidden />
          Ingresá MLA para buscar directo, o EAN para resolver el catálogo primero
        </p>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className={styles.history}>
          <p className={styles.historyLabel}>Búsquedas recientes</p>
          <div className={styles.historyPills}>
            {history.map((q) => (
              <button
                key={q}
                className={styles.historyPill}
                onClick={() => {
                  setQuery(q);
                  handleSearch(q);
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className={styles.errorBox} role="alert">
          <span className="ti ti-alert-circle" aria-hidden />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className={styles.loadingBox} aria-live="polite">
          <div className={styles.spinner} />
          <span>{loadingMsg}</span>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className={styles.results}>
          {resolvedNote && (
            <p className={styles.resolvedNote}>
              <span className="ti ti-arrows-exchange" aria-hidden />
              {resolvedNote}
            </p>
          )}

          {/* Catalog header */}
          <div className={styles.catalogHeader}>
            <div className={styles.catalogInfo}>
              <div className={styles.catalogId}>{data.catalogId}</div>
              <div className={styles.catalogTitle}>{data.title}</div>
              <div className={styles.catalogStatus}>
                <span className={`${styles.pill} ${styles.pillGreen}`}>
                  {data.status}
                </span>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className={styles.metrics}>
            <MetricCard
              icon="ti-users"
              label="Competidores"
              value={String(data.totalCompetitors)}
              sub="publicaciones activas"
            />
            <MetricCard
              icon="ti-trending-down"
              label="Precio mínimo"
              value={data.minPrice != null ? formatPrice(data.minPrice) : "—"}
              sub="más bajo del catálogo"
              accent="var(--color-success, #1a7f4b)"
            />
            <MetricCard
              icon="ti-trending-up"
              label="Precio máximo"
              value={data.maxPrice != null ? formatPrice(data.maxPrice) : "—"}
              sub="más alto del catálogo"
            />
          </div>

          {/* Competitors list */}
          <div className={styles.competitorsSection}>
            <div className={styles.sectionHead}>
              <span>Competidores del catálogo</span>
              <small>
                {Math.min(data.items.length, MAX_VISIBLE_ITEMS)} de{" "}
                {data.totalCompetitors}
              </small>
            </div>

            {data.items.length === 0 ? (
              <div className={styles.noItems}>
                Sin ítems encontrados en este catálogo
              </div>
            ) : (
              data.items.slice(0, MAX_VISIBLE_ITEMS).map((item, idx) => (
                <CompetitorRow
                  key={item.item_id ?? idx}
                  item={item}
                  rank={idx + 1}
                  minPrice={data.minPrice}
                  maxPrice={data.maxPrice}
                />
              ))
            )}

            {moreCount > 0 && (
              <div className={styles.moreRow}>
                +{moreCount} competidores más en la API
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <div className={styles.emptyState}>
          <span className="ti ti-list-search" aria-hidden />
          <p>Ingresá un ID de catálogo o EAN para ver los competidores</p>
        </div>
      )}
    </div>
  );
}
