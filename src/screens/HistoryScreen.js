import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

function oeeColor(oee) {
  const v = parseFloat(oee);
  if (isNaN(v)) return COLORS.textLight;
  if (v >= 85) return COLORS.success;
  if (v >= 70) return COLORS.warning;
  return COLORS.error;
}

function RecordItem({ record, onPress, onDelete }) {
  const oee = record.kpis?.OEE;
  const color = oeeColor(oee);
  const dateStr = record.fecha || new Date(record.createdAt).toLocaleDateString('es-MX');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.cardAccent, { backgroundColor: color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardArea}>{record.area || 'Sin área'}</Text>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          </TouchableOpacity>
        </View>
        <Text style={styles.cardMeta}>
          {dateStr} · {record.turno || 'Sin turno'}
        </Text>
        <View style={styles.kpiRow}>
          {oee ? (
            <View style={styles.kpiBadge}>
              <Text style={[styles.kpiBadgeValue, { color }]}>{oee}%</Text>
              <Text style={styles.kpiBadgeLabel}>OEE</Text>
            </View>
          ) : null}
          {record.kpis?.Disponibilidad ? (
            <View style={styles.kpiBadge}>
              <Text style={styles.kpiBadgeValue}>{record.kpis.Disponibilidad}%</Text>
              <Text style={styles.kpiBadgeLabel}>Disp.</Text>
            </View>
          ) : null}
          {record.kpis?.ProduccionReal ? (
            <View style={styles.kpiBadge}>
              <Text style={styles.kpiBadgeValue}>{record.kpis.ProduccionReal}</Text>
              <Text style={styles.kpiBadgeLabel}>Prod. Real</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} style={styles.chevron} />
    </TouchableOpacity>
  );
}

export default function HistoryScreen({ navigation }) {
  const { records, deleteRecord, exportAllToExcel, clearAll, loading } = useKPI();
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter(
      (r) =>
        r.area?.toLowerCase().includes(q) ||
        r.turno?.toLowerCase().includes(q) ||
        r.fecha?.includes(q)
    );
  }, [records, search]);

  const handleDelete = (id) => {
    Alert.alert(
      'Eliminar registro',
      '¿Seguro que deseas eliminar este registro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteRecord(id),
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Eliminar todo',
      '¿Eliminar TODOS los registros? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar todo', style: 'destructive', onPress: clearAll },
      ]
    );
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAllToExcel(filtered.length < records.length ? filtered : undefined);
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo exportar.');
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
    <View style={styles.container}>
      {/* Search + Export bar */}
      <View style={styles.topBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={COLORS.textLight} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por área, turno, fecha..."
            placeholderTextColor="#BDBDBD"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.textLight} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.exportBtn, (records.length === 0 || exporting) && styles.btnDisabled]}
          onPress={handleExport}
          disabled={records.length === 0 || exporting}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Ionicons name="download" size={18} color={COLORS.white} />
          )}
        </TouchableOpacity>
      </View>

      {/* Count */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}
          {filtered.length < records.length ? ` (de ${records.length})` : ''}
        </Text>
        {records.length > 0 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearAll}>Eliminar todo</Text>
          </TouchableOpacity>
        )}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-outline" size={64} color={COLORS.border} />
          <Text style={styles.emptyText}>
            {records.length === 0
              ? 'Sin registros. Escanea tu primer KPI.'
              : 'No hay resultados para la búsqueda.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RecordItem
              record={item}
              onPress={() =>
                navigation.navigate('Review', { record: item, readOnly: false })
              }
              onDelete={() => handleDelete(item.id)}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FAFAFA',
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  exportBtn: {
    backgroundColor: COLORS.primary,
    padding: 10,
    borderRadius: 8,
  },
  btnDisabled: { opacity: 0.4 },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  countText: { fontSize: 13, color: COLORS.textLight },
  clearAll: { fontSize: 13, color: COLORS.error, fontWeight: '600' },
  list: { padding: 12, gap: 10 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    overflow: 'hidden',
  },
  cardAccent: { width: 5, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 14 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardArea: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cardMeta: { fontSize: 12, color: COLORS.textLight, marginBottom: 8 },
  kpiRow: { flexDirection: 'row', gap: 12 },
  kpiBadge: { alignItems: 'center' },
  kpiBadgeValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  kpiBadgeLabel: { fontSize: 10, color: COLORS.textLight },
  chevron: { paddingRight: 10 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32 },
  emptyText: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
});
