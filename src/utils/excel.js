/**
 * Excel export utility using the xlsx library.
 *
 * Creates a formatted .xlsx workbook from KPI records and returns
 * it as a base64 string suitable for writing with expo-file-system.
 */

import * as XLSX from 'xlsx';

// Column definitions for the export
const STATIC_COLUMNS = [
  { key: 'fecha', header: 'Fecha' },
  { key: 'hora', header: 'Hora' },
  { key: 'turno', header: 'Turno' },
  { key: 'area', header: 'Área' },
];

const KPI_COLUMNS = [
  { key: 'OEE', header: 'OEE (%)' },
  { key: 'Disponibilidad', header: 'Disponibilidad (%)' },
  { key: 'Rendimiento', header: 'Rendimiento (%)' },
  { key: 'Calidad', header: 'Calidad (%)' },
  { key: 'ProduccionReal', header: 'Producción Real' },
  { key: 'ProduccionObjetivo', header: 'Producción Objetivo' },
  { key: 'Paros', header: 'Paros (min)' },
  { key: 'Defectos', header: 'Defectos' },
];

/**
 * Format a date string (ISO or DD/MM/YYYY) into a friendly display string.
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  // ISO format
  if (dateStr.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, '0')}/${d.getFullYear()}`;
  }
  return dateStr;
}

/**
 * Format a time string from an ISO datetime or return empty.
 * @param {string} dateStr
 * @returns {string}
 */
function formatTime(dateStr) {
  if (!dateStr) return '';
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes()
      .toString()
      .padStart(2, '0')}`;
  }
  return '';
}

/**
 * Parse a numeric value from a string or number.
 * Returns the number or the original string if it cannot be parsed.
 */
function parseNumeric(val) {
  if (val === undefined || val === null || val === '') return '';
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? val : n;
}

/**
 * Collect all unique dynamic KPI keys present in the records (beyond the standard ones).
 * @param {Array} records
 * @returns {Array<string>}
 */
function collectDynamicKeys(records) {
  const standardKeys = new Set(KPI_COLUMNS.map((c) => c.key));
  const extra = new Set();
  for (const rec of records) {
    if (rec.kpis && typeof rec.kpis === 'object') {
      for (const k of Object.keys(rec.kpis)) {
        if (!standardKeys.has(k)) extra.add(k);
      }
    }
  }
  return Array.from(extra);
}

/**
 * Build the header row for the workbook.
 * @param {Array<string>} dynamicKeys
 * @returns {Array<string>}
 */
function buildHeaders(dynamicKeys) {
  const headers = STATIC_COLUMNS.map((c) => c.header);
  headers.push(...KPI_COLUMNS.map((c) => c.header));
  headers.push(...dynamicKeys.map((k) => k));
  return headers;
}

/**
 * Convert a single record to a row array.
 * @param {Object} record
 * @param {Array<string>} dynamicKeys
 * @returns {Array}
 */
function recordToRow(record, dynamicKeys) {
  const kpis = record.kpis || {};

  // Prefer explicit fecha/hora fields, fall back to createdAt
  const fecha = record.fecha
    ? formatDate(record.fecha)
    : formatDate(record.createdAt);
  const hora = record.hora || formatTime(record.createdAt);

  const row = [
    fecha,
    hora,
    record.turno || '',
    record.area || '',
  ];

  for (const col of KPI_COLUMNS) {
    row.push(parseNumeric(kpis[col.key]));
  }

  for (const key of dynamicKeys) {
    row.push(parseNumeric(kpis[key]));
  }

  return row;
}

/**
 * Apply basic column widths and header styles.
 * @param {XLSX.WorkSheet} ws
 * @param {number} totalCols
 */
function styleWorksheet(ws, totalCols) {
  const colWidths = [];
  // Static columns
  colWidths.push({ wch: 12 }); // Fecha
  colWidths.push({ wch: 8 });  // Hora
  colWidths.push({ wch: 10 }); // Turno
  colWidths.push({ wch: 18 }); // Área
  // KPI columns
  for (let i = 0; i < KPI_COLUMNS.length; i++) {
    colWidths.push({ wch: 18 });
  }
  // Dynamic columns
  for (let i = 0; i < totalCols - STATIC_COLUMNS.length - KPI_COLUMNS.length; i++) {
    colWidths.push({ wch: 16 });
  }
  ws['!cols'] = colWidths;
}

/**
 * Export KPI records to an Excel (.xlsx) workbook.
 * Returns the file contents as a base64 string.
 *
 * @param {Array<Object>} records - Array of KPI record objects from storage
 * @returns {Promise<string>} base64-encoded xlsx file
 */
export async function exportToExcel(records) {
  if (!records || records.length === 0) {
    throw new Error('No hay registros para exportar.');
  }

  // Collect any extra dynamic KPI keys not in the standard list
  const dynamicKeys = collectDynamicKeys(records);
  const headers = buildHeaders(dynamicKeys);

  // Build rows
  const rows = records.map((rec) => recordToRow(rec, dynamicKeys));

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  styleWorksheet(ws, headers.length);

  // Add summary sheet if there are enough records
  if (records.length >= 2) {
    const summaryWs = buildSummarySheet(records);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');
  }

  XLSX.utils.book_append_sheet(wb, ws, 'KPIs');

  // Write to base64
  const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  return base64;
}

/**
 * Build a summary statistics sheet.
 * @param {Array<Object>} records
 * @returns {XLSX.WorkSheet}
 */
function buildSummarySheet(records) {
  const kpiKeys = KPI_COLUMNS.map((c) => c.key);
  const kpiHeaders = KPI_COLUMNS.map((c) => c.header);

  const summaryData = [
    ['Resumen Estadístico de KPIs'],
    [`Generado: ${new Date().toLocaleString('es-MX')}`],
    [`Total registros: ${records.length}`],
    [],
    ['KPI', 'Promedio', 'Mínimo', 'Máximo', 'Registros con dato'],
  ];

  for (let i = 0; i < kpiKeys.length; i++) {
    const key = kpiKeys[i];
    const values = records
      .map((r) => parseFloat(r.kpis?.[key]))
      .filter((v) => !isNaN(v));

    if (values.length === 0) {
      summaryData.push([kpiHeaders[i], 'N/A', 'N/A', 'N/A', 0]);
    } else {
      const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
      const min = Math.min(...values).toFixed(2);
      const max = Math.max(...values).toFixed(2);
      summaryData.push([kpiHeaders[i], parseFloat(avg), parseFloat(min), parseFloat(max), values.length]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(summaryData);
  ws['!cols'] = [
    { wch: 22 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
  ];
  return ws;
}

/**
 * Export a single KPI record to Excel.
 * @param {Object} record
 * @returns {Promise<string>} base64-encoded xlsx
 */
export async function exportSingleRecord(record) {
  return exportToExcel([record]);
}
