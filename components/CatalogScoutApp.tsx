"use client";

import { useState } from "react";
import CatalogScout from "@/components/CatalogScout";
import EanBulkUpload from "@/components/EanBulkUpload";
import styles from "./CatalogScoutApp.module.css";

type Tab = "search" | "bulk";

export default function CatalogScoutApp() {
  const [tab, setTab] = useState<Tab>("search");

  return (
    <div>
      <header className={styles.topBar}>
        <div className={styles.topInner}>
          <div className={styles.brand}>
            <span className={styles.mlBadge}>ML</span>
            <span className={styles.brandName}>Catalog Scout</span>
          </div>
          <nav className={styles.tabs} aria-label="Secciones">
            <button
              type="button"
              className={`${styles.tab} ${tab === "search" ? styles.tabActive : ""}`}
              onClick={() => setTab("search")}
            >
              Buscar catálogo
            </button>
            <button
              type="button"
              className={`${styles.tab} ${tab === "bulk" ? styles.tabActive : ""}`}
              onClick={() => setTab("bulk")}
            >
              Carga masiva EAN
            </button>
          </nav>
        </div>
      </header>

      {tab === "search" ? <CatalogScout hideHeader /> : <EanBulkUpload />}
    </div>
  );
}
