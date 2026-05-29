// lib/eanExcel.ts — parse / export EAN spreadsheets (client-safe)

import * as XLSX from "xlsx";
import type { EanAnalyzeResult } from "@/types/mercadolibre";

const EAN_HEADER = /^(ean|gtin|codigo|c[oó]digo|barcode|upc)$/i;

function normalizeEanCell(value: unknown): string | null {
  const digits = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/[^\d]/g, "");
  return /^\d{8,14}$/.test(digits) ? digits : null;
}

function findEanColumnIndex(headerRow: unknown[]): number {
  for (let i = 0; i < headerRow.length; i++) {
    const label = String(headerRow[i] ?? "").trim();
    if (EAN_HEADER.test(label)) return i;
  }
  return 0;
}

export function parseEansFromExcelBuffer(buffer: ArrayBuffer): string[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  }) as unknown[][];

  if (!rows.length) return [];

  const eanCol = findEanColumnIndex(rows[0]);
  const startRow =
    rows.length > 1 && EAN_HEADER.test(String(rows[0][eanCol] ?? "").trim())
      ? 1
      : 0;

  const seen = new Set<string>();
  const eans: string[] = [];

  for (let r = startRow; r < rows.length; r++) {
    const ean = normalizeEanCell(rows[r][eanCol]);
    if (ean && !seen.has(ean)) {
      seen.add(ean);
      eans.push(ean);
    }
  }

  return eans;
}

export function exportEmptyCatalogsToExcel(
  rows: Extract<EanAnalyzeResult, { status: "empty" }>[]
): ArrayBuffer {
  const data = [
    ["EAN", "MLA", "Título", "URL catálogo", "Notas"],
    ...rows.map((r) => [
      r.ean,
      r.catalogId,
      r.title ?? "",
      r.catalogUrl,
      "Catálogo vacío — apto para publicar",
    ]),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet["!cols"] = [{ wch: 16 }, { wch: 14 }, { wch: 48 }, { wch: 72 }, { wch: 36 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Catalogos vacios");

  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

export function downloadExcelBuffer(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
