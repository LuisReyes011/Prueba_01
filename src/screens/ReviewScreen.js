import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useKPI } from '../context/KPIContext';
import { KPI_FIELDS } from '../utils/ocr';

const COLORS = {
  primary: '#2196F3',
  success: '#4CAF50',
  warning: '#FF9800',
  background: '#F5F5F5',
  white: '#FFFFFF',
  text: '#333333',
  textLight: '#757575',
  border: '#E0E0E0',
  inputBg: '#FAFAFA',
};

const TURNOS = ['Mañana', 'Tarde', 'Noche'];

function Field({ label, value, onChangeText, keyboardType = 'default', unit, multiline }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder="—"
          placeholderTextColor="#BDBDBD"
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
        />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

export default function ReviewScreen({ route, navigation }) {
  const { ocrResult, imageUri, record: existingRecord, readOnly } = route.params || {};
  const { addRecord, updateRecord, exportAllToExcel } = useKPI();

  // Initialize form state
  const initKpis = () => {
    if (existingRecord) return { ...existingRecord.kpis };
    if (ocrResult?.kpis) return { ...ocrResult.kpis };
    return {};
  };

  const today = new Date().toISOString().slice(0, 10);

  const [fecha, setFecha] = useState(existingRecord?.fecha || ocrResult?.meta?.fecha || today);
  const [turno, setTurno] = useState(existingRecord?.turno || ocrResult?.meta?.turno || 'Mañana');
  const [area, setArea] = useState(existingRecord?.area || ocrResult?.meta?.area || '');
  const [notas, setNotas] = useState(existingRecord?.notas || '');
  const [kpis, setKpis] = useState(initKpis);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saved, setSaved] = useState(!!existingRecord);

  const imgUri = imageUri || existingRecord?.imageUri;

  const setKpi = (key, val) => setKpis((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!area.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa el Área.');
      return;
    }
    setSaving(true);
    try {
      const payload = { fecha, turno, area: area.trim(), notas, kpis, imageUri: imgUri };
      if (existingRecord) {
        await updateRecord(existingRecord.id, payload);
      } else {
        await addRecord(payload);
      }
      setSaved(true);
      Alert.alert('Guardado', 'El registro KPI se guardó correctamente.', [
        {
          text: 'Ir al historial',
          onPress: () => navigation.navigate('Historial'),
        },
        { text: 'OK' },
      ]);
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el registro.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!saved) {
      Alert.alert('Guarda primero', 'Guarda el registro antes de exportar.');
      return;
    }
    setExporting(true);
    try {
      await exportAllToExcel();
    } catch (e) {
      Alert.alert('Error al exportar', e.message || 'No se pudo generar el Excel.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* Image thumbnail */}
        {imgUri && (
          <Image source={{ uri: imgUri }} style={styles.thumbnail} resizeMode="cover" />
        )}

        {/* OCR raw text preview */}
        {ocrResult?.rawText && (
          <TouchableOpacity
            style={styles.rawTextContainer}
            onPress={() =>
              Alert.alert('Texto OCR extraído', ocrResult.rawText, [{ text: 'Cerrar' }])
            }
          >
            <Ionicons name="document-text-outline" size={16} color={COLORS.primary} />
            <Text style={styles.rawTextHint}>Ver texto detectado por OCR</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información General</Text>

          <Field
            label="Fecha"
            value={fecha}
            onChangeText={setFecha}
            keyboardType="default"
          />

          {/* Turno selector */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Turno</Text>
            <View style={styles.turnoRow}>
              {TURNOS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.turnoChip, turno === t && styles.turnoChipActive]}
                  onPress={() => !readOnly && setTurno(t)}
                >
                  <Text
                    style={[styles.turnoText, turno === t && styles.turnoTextActive]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Field label="Área / Línea" value={area} onChangeText={setArea} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indicadores KPI</Text>

          {KPI_FIELDS.map((field) => (
            <Field
              key={field.key}
              label={field.label}
              value={String(kpis[field.key] ?? '')}
              onChangeText={(v) => setKpi(field.key, v)}
              keyboardType="numeric"
              unit={field.unit}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notas</Text>
          <Field
            label="Observaciones"
            value={notas}
            onChangeText={setNotas}
            multiline
          />
        </View>

        {/* Action buttons */}
        {!readOnly && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name="save" size={18} color={COLORS.white} />
              )}
              <Text style={styles.saveButtonText}>
                {saving ? 'Guardando...' : 'Guardar Registro'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportButton, (!saved || exporting) && styles.buttonDisabled]}
              onPress={handleExport}
              disabled={!saved || exporting}
            >
              {exporting ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name="download" size={18} color={COLORS.white} />
              )}
              <Text style={styles.exportButtonText}>
                {exporting ? 'Exportando...' : 'Exportar a Excel'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  thumbnail: {
    width: '100%',
    height: 180,
    backgroundColor: '#111',
  },
  rawTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E3F2FD',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  rawTextHint: { flex: 1, color: COLORS.primary, fontSize: 13 },
  section: {
    backgroundColor: COLORS.white,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textLight, marginBottom: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.inputBg,
  },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  unit: { fontSize: 13, color: COLORS.textLight, width: 36, textAlign: 'right' },
  turnoRow: { flexDirection: 'row', gap: 8 },
  turnoChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  turnoChipActive: { borderColor: COLORS.primary, backgroundColor: '#E3F2FD' },
  turnoText: { fontSize: 14, color: COLORS.textLight, fontWeight: '500' },
  turnoTextActive: { color: COLORS.primary, fontWeight: '700' },
  actions: { padding: 16, gap: 12 },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    borderRadius: 10,
    paddingVertical: 14,
    gap: 8,
  },
  saveButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    gap: 8,
  },
  exportButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
});
