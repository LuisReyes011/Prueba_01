import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKPI } from '../context/KPIContext';

const COLORS = {
  primary: '#2196F3',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  background: '#F5F5F5',
  white: '#FFFFFF',
  text: '#333333',
  textLight: '#757575',
  border: '#E0E0E0',
};

function StatCard({ icon, label, value, color, unit }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>
        {value !== null && value !== undefined ? value : '—'}
        {unit && value !== null && value !== undefined ? (
          <Text style={styles.statUnit}>{unit}</Text>
        ) : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { records, loading, getStats, exportAllToExcel } = useKPI();
  const insets = useSafeAreaInsets();
  const [exporting, setExporting] = React.useState(false);

  const stats = getStats();

  const handleExport = async () => {
    if (records.length === 0) return;
    setExporting(true);
    try {
      await exportAllToExcel();
    } catch (e) {
      console.error('Export error:', e);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      {/* Header banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>KPI Scanner</Text>
        <Text style={styles.bannerSubtitle}>
          Escanea y registra tus indicadores de producción
        </Text>
      </View>

      {/* Quick Scan Button */}
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => navigation.navigate('Escanear')}
        activeOpacity={0.85}
      >
        <Ionicons name="camera" size={28} color={COLORS.white} />
        <Text style={styles.scanButtonText}>Escanear KPI</Text>
      </TouchableOpacity>

      {/* Stats */}
      <Text style={styles.sectionTitle}>Resumen</Text>
      <View style={styles.statsRow}>
        <StatCard
          icon="document-text"
          label="Total registros"
          value={stats.total}
          color={COLORS.primary}
        />
        <StatCard
          icon="today"
          label="Hoy"
          value={stats.today}
          color={COLORS.success}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          icon="analytics"
          label="OEE Promedio"
          value={stats.avgOEE}
          unit="%"
          color={stats.avgOEE >= 85 ? COLORS.success : stats.avgOEE >= 70 ? COLORS.warning : COLORS.error}
        />
        <StatCard
          icon="speedometer"
          label="Disponibilidad Prom."
          value={stats.avgDisponibilidad}
          unit="%"
          color={stats.avgDisponibilidad >= 90 ? COLORS.success : COLORS.warning}
        />
      </View>

      {/* Recent records */}
      {records.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Últimos registros</Text>
          {records.slice(0, 5).map((record) => (
            <TouchableOpacity
              key={record.id}
              style={styles.recentCard}
              onPress={() =>
                navigation.navigate('Historial', {
                  screen: 'Review',
                  params: { record, readOnly: true },
                })
              }
            >
              <View style={styles.recentLeft}>
                <Text style={styles.recentArea}>{record.area || 'Sin área'}</Text>
                <Text style={styles.recentDate}>
                  {record.fecha ||
                    new Date(record.createdAt).toLocaleDateString('es-MX')}{' '}
                  · {record.turno || ''}
                </Text>
              </View>
              <View style={styles.recentRight}>
                {record.kpis?.OEE ? (
                  <Text style={styles.recentOEE}>OEE {record.kpis.OEE}%</Text>
                ) : null}
                <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
              </View>
            </TouchableOpacity>
          ))}

          {/* Export button */}
          <TouchableOpacity
            style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
            onPress={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="download" size={18} color={COLORS.white} />
            )}
            <Text style={styles.exportButtonText}>
              {exporting ? 'Exportando...' : 'Exportar Todo a Excel'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {records.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="bar-chart-outline" size={64} color={COLORS.border} />
          <Text style={styles.emptyTitle}>Sin registros aún</Text>
          <Text style={styles.emptySubtitle}>
            Usa el botón "Escanear KPI" para capturar tu primer indicador.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  banner: {
    backgroundColor: COLORS.primary,
    padding: 24,
    paddingTop: 32,
    paddingBottom: 32,
  },
  bannerTitle: {
    color: COLORS.white,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  bannerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 12,
    paddingVertical: 18,
    gap: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  scanButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    alignItems: 'flex-start',
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 6,
  },
  statUnit: { fontSize: 14, fontWeight: '400', color: COLORS.textLight },
  statLabel: { fontSize: 12, color: COLORS.textLight },
  recentCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  recentLeft: { flex: 1 },
  recentArea: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  recentDate: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  recentRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recentOEE: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    paddingVertical: 14,
    gap: 8,
  },
  exportButtonDisabled: { opacity: 0.7 },
  exportButtonText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  emptyState: {
    alignItems: 'center',
    marginTop: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textLight, marginTop: 16 },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
