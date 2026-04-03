import AsyncStorage from '@react-native-async-storage/async-storage';

const RECORDS_KEY = '@kpi_scanner:records';

/**
 * Load all KPI records from AsyncStorage.
 * @returns {Promise<Array>}
 */
export async function loadRecords() {
  try {
    const json = await AsyncStorage.getItem(RECORDS_KEY);
    if (json === null) return [];
    return JSON.parse(json);
  } catch (e) {
    console.error('storage.loadRecords error:', e);
    return [];
  }
}

/**
 * Save the full records array to AsyncStorage.
 * @param {Array} records
 */
export async function saveRecords(records) {
  try {
    await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('storage.saveRecords error:', e);
    throw e;
  }
}

/**
 * Remove all stored records.
 */
export async function clearAllRecords() {
  try {
    await AsyncStorage.removeItem(RECORDS_KEY);
  } catch (e) {
    console.error('storage.clearAllRecords error:', e);
    throw e;
  }
}

/**
 * Add a single record (utility, prefer context methods).
 * @param {Object} record
 * @returns {Promise<Array>} updated records
 */
export async function addRecord(record) {
  const current = await loadRecords();
  const updated = [record, ...current];
  await saveRecords(updated);
  return updated;
}
