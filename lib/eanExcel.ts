// lib/eanExcel.ts — parse / export EAN spreadsheets (client-safe)

import * as XLSX from "xlsx";
import type { EanAnalyzeResult } from "@/types/mercadolibre";

const EAN_HEADER = /^(ean|gtin|codigo|c[oó]digo|barcode|upc)$/i;

function normalizeEanCell(value: unknown): string | null {
  let raw = String(value ?? "").trim().replace(/\s/g, "");

  // Excel a veces exporta EANs largos en notación científica
  if (/^[\d.]+[eE][+-]?\d+$/.test(raw)) {
    const n = Number(raw);
    if (Number.isFinite(n)) {
      raw = String(Math.trunc(n));
    }
  }

  const digits = raw.replace(/[^\d]/g, "");
  return /^\d{8,14}$/.test(digits) ? digits : null;
}

function findEanColumnIndex(headerRow: unknown[]): number {
  for (let i = 0; i < headerRow.length; i++) {
    const label = String(headerRow[i] ?? "").trim();
    if (EAN_HEADER.test(label)) return i;
  }
  return 0;
}

function extractEansFromRows(rows: unknown[][]): string[] {
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

function parseCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += c;
    }
  }

  fields.push(current.trim());
  return fields;
}

function parseCsvRows(buffer: ArrayBuffer): unknown[][] {
  const text = new TextDecoder("utf-8")
    .decode(buffer)
    .replace(/^\uFEFF/, "");

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return [];

  const semicolons = (lines[0].match(/;/g) ?? []).length;
  const commas = (lines[0].match(/,/g) ?? []).length;
  const delimiter = semicolons > commas ? ";" : ",";

  return lines.map((line) => parseCsvLine(line, delimiter));
}

function parseXlsxRows(buffer: ArrayBuffer): unknown[][] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  }) as unknown[][];
}

/** Lee EANs desde Excel (.xlsx, .xls) o CSV. */
export function parseEansFromFile(buffer: ArrayBuffer, filename: string): string[] {
  const isCsv = /\.csv$/i.test(filename);

  if (isCsv) {
    const csvRows = parseCsvRows(buffer);
    const fromCsv = extractEansFromRows(csvRows);
    if (fromCsv.length) return fromCsv;

    // Fallback por si el CSV tiene formato raro
    try {
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (sheet) {
        const rows = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
        }) as unknown[][];
        return extractEansFromRows(rows);
      }
    } catch {
      /* usar resultado vacío del parser CSV */
    }
    return [];
  }

  return extractEansFromRows(parseXlsxRows(buffer));
}

/** @deprecated Usar parseEansFromFile */
export function parseEansFromExcelBuffer(buffer: ArrayBuffer): string[] {
  return parseEansFromFile(buffer, "upload.xlsx");
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

export function exportEmptyCatalogsToCsv(
  rows: Extract<EanAnalyzeResult, { status: "empty" }>[]
): string {
  const escape = (v: string) => {
    if (/[",;\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
  };

  const lines = [
    ["EAN", "MLA", "Título", "URL catálogo", "Notas"].join(";"),
    ...rows.map((r) =>
      [
        r.ean,
        r.catalogId,
        r.title ?? "",
        r.catalogUrl,
        "Catálogo vacío — apto para publicar",
      ]
        .map(escape)
        .join(";")
    ),
  ];

  return "\uFEFF" + lines.join("\r\n");
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

export function downloadTextFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
