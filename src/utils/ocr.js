/**
 * OCR Utility for KPI Scanner
 *
 * NOTE: Full ML Kit text recognition requires native modules which are available
 * via react-native-mlkit-ocr or @react-native-ml-kit/text-recognition.
 * Those packages require a custom Expo Development Build (expo-dev-client) and
 * cannot run in Expo Go.
 *
 * To enable real OCR:
 *   1. Install: expo install @react-native-ml-kit/text-recognition
 *   2. Run: expo prebuild
 *   3. Replace the mockOCR function below with:
 *
 *      import TextRecognition from '@react-native-ml-kit/text-recognition';
 *      export async function recognizeText(imageUri) {
 *        const result = await TextRecognition.recognize(imageUri);
 *        return result.text;
 *      }
 *
 * Until then, this module provides a smart mock that simulates OCR output
 * with realistic KPI patterns for development and testing.
 */

import * as ImageManipulator from 'expo-image-manipulator';

// ----- KPI field definitions -----
export const KPI_FIELDS = [
  { key: 'OEE', label: 'OEE (%)', unit: '%', type: 'percentage' },
  { key: 'Disponibilidad', label: 'Disponibilidad (%)', unit: '%', type: 'percentage' },
  { key: 'Rendimiento', label: 'Rendimiento (%)', unit: '%', type: 'percentage' },
  { key: 'Calidad', label: 'Calidad (%)', unit: '%', type: 'percentage' },
  { key: 'ProduccionReal', label: 'Producción Real', unit: 'pzs', type: 'integer' },
  { key: 'ProduccionObjetivo', label: 'Producción Objetivo', unit: 'pzs', type: 'integer' },
  { key: 'Paros', label: 'Paros (min)', unit: 'min', type: 'integer' },
  { key: 'Defectos', label: 'Defectos', unit: 'pzs', type: 'integer' },
];

// ----- Patterns to extract KPI values from OCR text -----
const KPI_PATTERNS = [
  // "OEE: 85%" or "OEE 85%" or "OEE=85%"
  { key: 'OEE', pattern: /OEE\s*[=:]\s*([\d.,]+)\s*%?/i },
  { key: 'Disponibilidad', pattern: /Disponibilidad\s*[=:]\s*([\d.,]+)\s*%?/i },
  { key: 'Rendimiento', pattern: /Rendimiento\s*[=:]\s*([\d.,]+)\s*%?/i },
  { key: 'Calidad', pattern: /Calidad\s*[=:]\s*([\d.,]+)\s*%?/i },
  { key: 'ProduccionReal', pattern: /Producci[oó]n\s*Real\s*[=:]\s*([\d.,]+)/i },
  { key: 'ProduccionObjetivo', pattern: /Producci[oó]n\s*Objetivo\s*[=:]\s*([\d.,]+)/i },
  // Also match "Objetivo" alone followed by a number
  { key: 'ProduccionObjetivo', pattern: /Objetivo\s*[=:]\s*([\d.,]+)/i },
  { key: 'Paros', pattern: /Paros?\s*[=:(]\s*([\d.,]+)\s*(?:min)?/i },
  { key: 'Defectos', pattern: /Defectos?\s*[=:]\s*([\d.,]+)/i },
];

// Patterns for metadata fields
const META_PATTERNS = [
  { key: 'fecha', pattern: /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/ },
  { key: 'area', pattern: /[Áa]rea\s*[=:]\s*([A-Za-z0-9\s]+)/i },
  { key: 'turno', pattern: /Turno\s*[=:]\s*(Ma[ñn]ana|Tarde|Noche)/i },
];

/**
 * Pre-process the image for better OCR results (resize, convert to grayscale).
 * @param {string} imageUri
 * @returns {Promise<string>} processed image URI
 */
export async function preprocessImage(imageUri) {
  try {
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 1200 } }],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (e) {
    console.warn('Image preprocessing failed, using original:', e);
    return imageUri;
  }
}

/**
 * Parse structured KPI data from raw OCR text.
 * This function intelligently extracts known KPI fields and metadata.
 *
 * @param {string} rawText - The raw text output from OCR
 * @returns {{ kpis: Object, meta: Object, fragments: Array<string> }}
 */
export function parseKPIFromText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { kpis: {}, meta: {}, fragments: [] };
  }

  const kpis = {};
  const meta = {};

  // Extract KPI values
  for (const { key, pattern } of KPI_PATTERNS) {
    if (kpis[key] !== undefined) continue; // already found
    const match = rawText.match(pattern);
    if (match) {
      // Normalize: replace comma decimal separator with dot
      const value = match[1].replace(',', '.');
      kpis[key] = value;
    }
  }

  // Extract metadata
  for (const { key, pattern } of META_PATTERNS) {
    const match = rawText.match(pattern);
    if (match) {
      meta[key] = match[1].trim();
    }
  }

  // Extract all number/percentage fragments for manual mapping
  const fragments = extractNumberFragments(rawText);

  return { kpis, meta, fragments };
}

/**
 * Extract meaningful text fragments (numbers, percentages, labeled values)
 * from raw OCR text, useful for the manual mapping UI.
 *
 * @param {string} text
 * @returns {Array<{ text: string, type: string, value: string }>}
 */
export function extractNumberFragments(text) {
  const fragments = [];
  const lines = text.split(/[\n\r]+/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Percentage values
    const percentMatches = [...line.matchAll(/([\w\s]*?)\s*([\d.,]+)\s*%/g)];
    for (const m of percentMatches) {
      fragments.push({
        text: m[0].trim(),
        label: m[1].trim() || 'Valor',
        value: m[2].replace(',', '.'),
        type: 'percentage',
      });
    }

    // Labeled numbers: "Label: 1234" or "Label = 1234"
    const labeledMatches = [...line.matchAll(/([A-Za-záéíóúÁÉÍÓÚñÑ\s]+)\s*[=:]\s*([\d.,]+)/g)];
    for (const m of labeledMatches) {
      const label = m[1].trim();
      const value = m[2].replace(',', '.');
      // Skip if already captured as percentage
      if (!fragments.some((f) => f.value === value && f.label === label)) {
        fragments.push({
          text: m[0].trim(),
          label,
          value,
          type: 'number',
        });
      }
    }
  }

  // Deduplicate by text
  const seen = new Set();
  return fragments.filter((f) => {
    if (seen.has(f.text)) return false;
    seen.add(f.text);
    return true;
  });
}

/**
 * Mock OCR function for development/testing in Expo Go.
 * Generates realistic KPI text that simulates what an OCR engine would return
 * from a manufacturing dashboard or display screen.
 *
 * Replace this with a real ML Kit call in a development build.
 *
 * @param {string} imageUri - (unused in mock, but matches real signature)
 * @returns {Promise<string>} simulated OCR raw text
 */
export async function mockOCR(imageUri) {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 1200));

  // Random realistic values to simulate different scans
  const oee = (72 + Math.random() * 20).toFixed(1);
  const disp = (80 + Math.random() * 15).toFixed(1);
  const rend = (85 + Math.random() * 12).toFixed(1);
  const cal = (95 + Math.random() * 4).toFixed(1);
  const prodReal = Math.floor(800 + Math.random() * 400);
  const prodObj = Math.floor(prodReal + 50 + Math.random() * 150);
  const paros = Math.floor(5 + Math.random() * 55);
  const defectos = Math.floor(Math.random() * 30);

  const areas = ['Línea A', 'Línea B', 'Ensamble', 'Pintura', 'Soldadura'];
  const area = areas[Math.floor(Math.random() * areas.length)];

  const today = new Date();
  const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${today.getFullYear()}`;

  return `REPORTE DE PRODUCCIÓN
Fecha: ${dateStr}
Área: ${area}
Turno: Mañana

--- INDICADORES DE EFICIENCIA ---
OEE: ${oee}%
Disponibilidad: ${disp}%
Rendimiento: ${rend}%
Calidad: ${cal}%

--- PRODUCCIÓN ---
Producción Real: ${prodReal}
Producción Objetivo: ${prodObj}

--- INCIDENCIAS ---
Paros: ${paros} min
Defectos: ${defectos}

Operador: _________________
Supervisó: _________________`;
}

/**
 * Main OCR entry point.
 * In production: replace mockOCR with real ML Kit recognition.
 *
 * @param {string} imageUri
 * @returns {Promise<{ rawText: string, kpis: Object, meta: Object, fragments: Array }>}
 */
export async function runOCR(imageUri) {
  // Step 1: Pre-process image
  const processedUri = await preprocessImage(imageUri);

  // Step 2: Run text recognition
  // TODO: Replace mockOCR with real implementation:
  // import TextRecognition from '@react-native-ml-kit/text-recognition';
  // const result = await TextRecognition.recognize(processedUri);
  // const rawText = result.text;
  const rawText = await mockOCR(processedUri);

  // Step 3: Parse structured data from text
  const { kpis, meta, fragments } = parseKPIFromText(rawText);

  return { rawText, kpis, meta, fragments, processedUri };
}
