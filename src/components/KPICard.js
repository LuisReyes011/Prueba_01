/**
 * KPICard component
 * Displays a summary card for a single KPI scan record.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#2196F3',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  background: '#F5F5F5',
  card: '#FFFFFF',
  text: '#333333',
  textSecondary: '#757575',
  border: '#E0E0E0',
};

/**
 * Returns a color based on OEE value.
 * @param {string|number} oee
 */
function getOEEColor(oee) {
  const val = parseFloat(oee);
  if (isNaN(val)) return COLORS.textSecondary;
  if (val >= 85) return COLORS.success;
  if (val >= 70) return COLORS.warning;
  return COLORS.error;
}

/**
 * Format a date for display.
 * @param {string} dateStr ISO or DD/MM/YYYY
 */
function displayDate(dateStr) {
  if (!dateStr) return '—';
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  return dateStr;
}

/**
 * Format a time for display.
 * @param {string} isoStr
 */
function displayTime(isoStr) {
  if (!isoStr || !isoStr.includes('T')) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

/**
 * KPICard props:
 *   record  - KPI record object
 *   onPress - called when card is tapped
 *   onDelete - called when delete button is pressed (optional)
 *   compact - boolean, show a more compact version
 */
export default function KPICard({ record, onPress, onDelete, compact = false }) {
  if (!record) return null;

  const { kpis = {}, area, turno, fecha, createdAt } = record;
  const oee = kpis.OEE;
  const disponibilidad = kpis.Disponibilidad;
  const rendimiento = kpis.Rendimiento;
  const calidad = kpis.Calidad;
  const prodReal = kpis.ProduccionReal;
  const prodObj = kpis.ProduccionObjetivo;

  const displayFecha = fecha ? displayDate(fecha) : displayDate(createdAt);
  const displayHora = displayTime(createdAt);
  const oeeColor = getOEEColor(oee);

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={onPress} activeOpacity={0.75}>
        <View style={styles.compactLeft}>
          <Text style={styles.compactDate}>{displayFecha}</Text>
          <Text style={styles.compactArea} numberOfLines={1}>
            {area || 'Sin área'} · {turno || '—'}
          </Text>
        </View>
        <View style={styles.compactRight}>
          {oee !== undefined && oee !== '' ? (
            <Text style={[styles.compactOEE, { color: oeeColor }]}>
              OEE {oee}%
            </Text>
          ) : (
            <Text style={styles.compactNoData}>Sin OEE</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Ionicons name="analytics-outline" size={20} color={COLORS.primary} style={styles.headerIcon} />
          <View>
            <Text style={styles.cardArea} numberOfLines={1}>{area || 'Sin área'}</Text>
            <Text style={styles.cardDate}>
              {displayFecha}{displayHora ? `  ·  ${displayHora}` : ''}
              {turno ? `  ·  ${turno}` : ''}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {oee !== undefined && oee !== '' && (
            <View style={[styles.oeeBadge, { borderColor: oeeColor }]}>
              <Text style={[styles.oeeValue, { color: oeeColor }]}>{oee}%</Text>
              <Text style={[styles.oeeLabel, { color: oeeColor }]}>OEE</Text>
            </View>
          )}
          {onDelete && (
            <TouchableOpacity
              onPress={() => onDelete(record.id)}
              style={styles.deleteButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* KPI Grid */}
      <View style={styles.kpiGrid}>
        <KPIChip label="Disponib." value={disponibilidad} unit="%" />
        <KPIChip label="Rendim." value={rendimiento} unit="%" />
        <KPIChip label="Calidad" value={calidad} unit="%" />
      </View>

      {/* Production bar */}
      {(prodReal !== undefined && prodReal !== '') && (
        <View style={styles.prodSection}>
          <View style={styles.prodRow}>
            <Text style={styles.prodLabel}>Producción</Text>
            <Text style={styles.prodValues}>
              <Text style={styles.prodReal}>{prodReal}</Text>
              {prodObj !== undefined && prodObj !== '' && (
                <Text style={styles.prodObj}> / {prodObj}</Text>
              )}
              <Text style={styles.prodUnit}> pzs</Text>
            </Text>
          </View>
          {prodObj !== undefined && prodObj !== '' && parseFloat(prodObj) > 0 && (
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(
                      100,
                      (parseFloat(prodReal) / parseFloat(prodObj)) * 100
                    )}%`,
                    backgroundColor:
                      parseFloat(prodReal) >= parseFloat(prodObj)
                        ? COLORS.success
                        : COLORS.primary,
                  },
                ]}
              />
            </View>
          )}
        </View>
      )}

      {/* Paros / Defectos */}
      {(kpis.Paros !== undefined || kpis.Defectos !== undefined) && (
        <View style={styles.incidencias}>
          {kpis.Paros !== undefined && kpis.Paros !== '' && (
            <View style={styles.incItem}>
              <Ionicons name="pause-circle-outline" size={14} color={COLORS.warning} />
              <Text style={styles.incText}>{kpis.Paros} min paros</Text>
            </View>
          )}
          {kpis.Defectos !== undefined && kpis.Defectos !== '' && (
            <View style={styles.incItem}>
              <Ionicons name="warning-outline" size={14} color={COLORS.error} />
              <Text style={styles.incText}>{kpis.Defectos} defectos</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function KPIChip({ label, value, unit }) {
  if (value === undefined || value === '') {
    return (
      <View style={styles.chip}>
        <Text style={styles.chipLabel}>{label}</Text>
        <Text style={styles.chipEmpty}>—</Text>
      </View>
    );
  }
  const num = parseFloat(value);
  let color = COLORS.textSecondary;
  if (!isNaN(num) && unit === '%') {
    color = num >= 90 ? COLORS.success : num >= 75 ? COLORS.warning : COLORS.error;
  }
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={[styles.chipValue, { color }]}>
        {value}{unit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Full card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  headerIcon: {
    marginRight: 8,
  },
  cardArea: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  cardDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  oeeBadge: {
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    minWidth: 56,
  },
  oeeValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  oeeLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  deleteButton: {
    padding: 4,
  },
  // KPI grid
  kpiGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingVertical: 6,
    marginHorizontal: 3,
  },
  chipLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  chipValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  chipEmpty: {
    fontSize: 14,
    color: COLORS.border,
    fontWeight: '700',
  },
  // Production
  prodSection: {
    marginBottom: 8,
  },
  prodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  prodLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  prodValues: {
    fontSize: 13,
  },
  prodReal: {
    fontWeight: '700',
    color: COLORS.text,
  },
  prodObj: {
    color: COLORS.textSecondary,
  },
  prodUnit: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  // Incidencias
  incidencias: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  incItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  incText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  // Compact card
  compactCard: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  compactLeft: {
    flex: 1,
  },
  compactDate: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  compactArea: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  compactRight: {
    marginRight: 8,
  },
  compactOEE: {
    fontSize: 14,
    fontWeight: '700',
  },
  compactNoData: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
