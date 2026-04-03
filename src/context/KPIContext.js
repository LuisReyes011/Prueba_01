import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadRecords, saveRecords, clearAllRecords } from '../utils/storage';
import { exportToExcel } from '../utils/excel';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const KPIContext = createContext(null);

export function KPIProvider({ children }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await loadRecords();
        setRecords(stored);
      } catch (e) {
        console.error('Error loading records:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addRecord = useCallback(async (record) => {
    const newRecord = {
      ...record,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    const updated = [newRecord, ...records];
    setRecords(updated);
    await saveRecords(updated);
    return newRecord;
  }, [records]);

  const updateRecord = useCallback(async (id, updatedData) => {
    const updated = records.map((r) =>
      r.id === id ? { ...r, ...updatedData, updatedAt: new Date().toISOString() } : r
    );
    setRecords(updated);
    await saveRecords(updated);
  }, [records]);

  const deleteRecord = useCallback(async (id) => {
    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    await saveRecords(updated);
  }, [records]);

  const clearAll = useCallback(async () => {
    setRecords([]);
    await clearAllRecords();
  }, []);

  const exportAllToExcel = useCallback(async (filteredRecords) => {
    const data = filteredRecords || records;
    if (data.length === 0) {
      throw new Error('No hay registros para exportar.');
    }
    const base64 = await exportToExcel(data);
    const filename = `KPIs_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const fileUri = FileSystem.cacheDirectory + filename;
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const available = await Sharing.isAvailableAsync();
    if (available) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Exportar KPIs a Excel',
        UTI: 'com.microsoft.excel.xlsx',
      });
    } else {
      throw new Error('La función de compartir no está disponible en este dispositivo.');
    }
    return fileUri;
  }, [records]);

  const getStats = useCallback(() => {
    if (records.length === 0) {
      return {
        total: 0,
        today: 0,
        avgOEE: null,
        avgDisponibilidad: null,
      };
    }
    const today = new Date().toISOString().slice(0, 10);
    const todayRecords = records.filter((r) => r.fecha === today || r.createdAt?.startsWith(today));

    const oeeValues = records
      .map((r) => parseFloat(r.kpis?.OEE))
      .filter((v) => !isNaN(v));
    const dispValues = records
      .map((r) => parseFloat(r.kpis?.Disponibilidad))
      .filter((v) => !isNaN(v));

    return {
      total: records.length,
      today: todayRecords.length,
      avgOEE: oeeValues.length > 0
        ? (oeeValues.reduce((a, b) => a + b, 0) / oeeValues.length).toFixed(1)
        : null,
      avgDisponibilidad: dispValues.length > 0
        ? (dispValues.reduce((a, b) => a + b, 0) / dispValues.length).toFixed(1)
        : null,
    };
  }, [records]);

  return (
    <KPIContext.Provider
      value={{
        records,
        loading,
        addRecord,
        updateRecord,
        deleteRecord,
        clearAll,
        exportAllToExcel,
        getStats,
      }}
    >
      {children}
    </KPIContext.Provider>
  );
}

export function useKPI() {
  const ctx = useContext(KPIContext);
  if (!ctx) {
    throw new Error('useKPI must be used within a KPIProvider');
  }
  return ctx;
}
