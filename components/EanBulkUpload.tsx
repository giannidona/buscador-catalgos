"use client";

import { useCallback, useRef, useState } from "react";
import type { EanAnalyzeResult } from "@/types/mercadolibre";
import { analyzeEan } from "@/lib/mlApi";
import {
  parseEansFromFile,
  exportEmptyCatalogsToExcel,
  exportEmptyCatalogsToCsv,
  downloadExcelBuffer,
  downloadTextFile,
} from "@/lib/eanExcel";
import styles from "./EanBulkUpload.module.css";

const DELAY_MS = 350;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function statusLabel(result: EanAnalyzeResult): string {
  switch (result.status) {
    case "empty":
      return "Catálogo vacío";
    case "active":
      return `${result.competitorCount} competidores`;
    case "unresolved":
      return result.message;
    case "error":
      return result.message;
  }
}

export default function EanBulkUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  const [fileName, setFileName] = useState<string | null>(null);
  const [eans, setEans] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [log, setLog] = useState<EanAnalyzeResult[]>([]);
  const [emptyRows, setEmptyRows] = useState<
    Extract<EanAnalyzeResult, { status: "empty" }>[]
  >([]);
  const [stats, setStats] = useState({ empty: 0, active: 0, other: 0 });
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setLog([]);
    setEmptyRows([]);
    setStats({ empty: 0, active: 0, other: 0 });
    setProgress({ current: 0, total: 0 });

    const buffer = await file.arrayBuffer();
    const parsed = parseEansFromFile(buffer, file.name);

    if (!parsed.length) {
      setError(
        "No se encontraron EANs válidos. En Excel o CSV usá una columna EAN/GTIN o la primera columna."
      );
      setEans([]);
      setFileName(null);
      return;
    }

    setFileName(file.name);
    setEans(parsed);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  };

  const runScan = useCallback(async () => {
    if (!eans.length || running) return;

    abortRef.current = false;
    setRunning(true);
    setError(null);
    setLog([]);
    setEmptyRows([]);
    setStats({ empty: 0, active: 0, other: 0 });
    setProgress({ current: 0, total: eans.length });

    const empty: Extract<EanAnalyzeResult, { status: "empty" }>[] = [];
    const history: EanAnalyzeResult[] = [];
    let activeCount = 0;
    let otherCount = 0;

    for (let i = 0; i < eans.length; i++) {
      if (abortRef.current) break;

      const ean = eans[i];
      try {
        const result = await analyzeEan(ean);
        history.unshift(result);
        if (result.status === "empty") {
          empty.push(result);
        } else if (result.status === "active") {
          activeCount += 1;
        } else {
          otherCount += 1;
        }
        setLog([...history].slice(0, 12));
        setEmptyRows([...empty]);
        setStats({
          empty: empty.length,
          active: activeCount,
          other: otherCount,
        });
      } catch (err) {
        const fail: EanAnalyzeResult = {
          status: "error",
          ean,
          message:
            err instanceof Error ? err.message : "Error de red al consultar",
        };
        history.unshift(fail);
        otherCount += 1;
        setLog([...history].slice(0, 12));
        setStats({
          empty: empty.length,
          active: activeCount,
          other: otherCount,
        });
      }

      setProgress({ current: i + 1, total: eans.length });

      if (i < eans.length - 1 && !abortRef.current) {
        await sleep(DELAY_MS);
      }
    }

    setRunning(false);
  }, [eans, running]);

  const stopScan = () => {
    abortRef.current = true;
  };

  const exportResults = (format: "xlsx" | "csv") => {
    if (!emptyRows.length) return;
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === "csv") {
      const csv = exportEmptyCatalogsToCsv(emptyRows);
      downloadTextFile(
        csv,
        `catalogos-vacios-${stamp}.csv`,
        "text/csv;charset=utf-8"
      );
    } else {
      const buffer = exportEmptyCatalogsToExcel(emptyRows);
      downloadExcelBuffer(buffer, `catalogos-vacios-${stamp}.xlsx`);
    }
  };

  const pct =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <div className={styles.wrap}>
      <p className={styles.intro}>
        Subí un <strong>Excel</strong> (.xlsx, .xls) o <strong>CSV</strong> con
        EANs (columna <strong>EAN</strong> / <strong>GTIN</strong> o primera
        columna; CSV con coma o punto y coma). Si el catálogo está vacío, podés
        exportar el resultado en Excel o CSV.
      </p>

      <div className={styles.panel}>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className={styles.fileInput}
          onChange={onFileChange}
          disabled={running}
        />
        <button
          type="button"
          className={styles.fileBtn}
          onClick={() => inputRef.current?.click()}
          disabled={running}
        >
          Elegir archivo
        </button>
        {fileName && (
          <span className={styles.fileMeta}>
            {fileName} — {eans.length} EAN{eans.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={() => void runScan()}
          disabled={!eans.length || running}
        >
          {running ? "Analizando…" : "Analizar EANs"}
        </button>
        {running && (
          <button type="button" className={styles.secondaryBtn} onClick={stopScan}>
            Detener
          </button>
        )}
        <button
          type="button"
          className={styles.exportBtn}
          onClick={() => exportResults("xlsx")}
          disabled={!emptyRows.length || running}
        >
          Excel ({emptyRows.length})
        </button>
        <button
          type="button"
          className={styles.exportBtn}
          onClick={() => exportResults("csv")}
          disabled={!emptyRows.length || running}
        >
          CSV ({emptyRows.length})
        </button>
      </div>

      {error && (
        <div className={styles.errorBox} role="alert">
          {error}
        </div>
      )}

      {(running || progress.current > 0) && progress.total > 0 && (
        <div className={styles.progressBlock}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
          <p className={styles.progressText}>
            {progress.current} / {progress.total} — {pct}%
            {!running && progress.current === progress.total && " — listo"}
          </p>
        </div>
      )}

      {!running && progress.total > 0 && (
        <div className={styles.summary}>
          <span>
            Catálogos vacíos: <strong>{stats.empty}</strong>
          </span>
          <span>
            Con competencia: <strong>{stats.active}</strong>
          </span>
          <span>
            Sin catálogo / error: <strong>{stats.other}</strong>
          </span>
        </div>
      )}

      {log.length > 0 && (
        <div className={styles.log}>
          <p className={styles.logTitle}>Últimos resultados</p>
          <ul className={styles.logList}>
            {log.map((r, idx) => (
              <li
                key={`${r.ean}-${idx}`}
                className={
                  r.status === "empty"
                    ? styles.logEmpty
                    : r.status === "active"
                      ? styles.logActive
                      : styles.logOther
                }
              >
                <span className={styles.logEan}>{r.ean}</span>
                {r.status === "empty" || r.status === "active" ? (
                  <span className={styles.logMla}>{r.catalogId}</span>
                ) : null}
                <span className={styles.logStatus}>{statusLabel(r)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
