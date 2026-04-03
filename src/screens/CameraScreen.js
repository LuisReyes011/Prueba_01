import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { runOCR, KPI_FIELDS } from '../utils/ocr';

const COLORS = {
  primary: '#2196F3',
  success: '#4CAF50',
  white: '#FFFFFF',
  black: '#000000',
  text: '#333333',
  textLight: '#757575',
  overlay: 'rgba(0,0,0,0.55)',
};

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [capturedUri, setCapturedUri] = useState(null);
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef(null);

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Ionicons name="camera-off-outline" size={64} color={COLORS.textLight} />
        <Text style={styles.permText}>Se necesita acceso a la cámara</Text>
        <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
          <Text style={styles.permButtonText}>Conceder permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const processImage = async (uri) => {
    setProcessing(true);
    try {
      const result = await runOCR(uri);
      navigation.navigate('Review', { ocrResult: result, imageUri: uri });
    } catch (e) {
      Alert.alert('Error de OCR', 'No se pudo procesar la imagen. Intenta de nuevo.');
      console.error(e);
    } finally {
      setProcessing(false);
      setCapturedUri(null);
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      setCapturedUri(photo.uri);
    } catch (e) {
      Alert.alert('Error', 'No se pudo tomar la foto.');
      console.error(e);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      await processImage(result.assets[0].uri);
    }
  };

  // Preview mode: show captured image + confirm/retake
  if (capturedUri) {
    return (
      <View style={styles.previewContainer}>
        <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="contain" />
        {processing ? (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color={COLORS.white} />
            <Text style={styles.processingText}>Procesando imagen con OCR...</Text>
          </View>
        ) : (
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={() => setCapturedUri(null)}
            >
              <Ionicons name="refresh" size={20} color={COLORS.white} />
              <Text style={styles.previewActionText}>Retomar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => processImage(capturedUri)}
            >
              <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
              <Text style={styles.previewActionText}>Procesar OCR</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
        {/* Overlay frame guide */}
        <View style={styles.frameGuide} pointerEvents="none">
          <View style={styles.frameCornerTL} />
          <View style={styles.frameCornerTR} />
          <View style={styles.frameCornerBL} />
          <View style={styles.frameCornerBR} />
        </View>

        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>
            Apunta la cámara a la pantalla con los KPIs
          </Text>
        </View>

        {/* Bottom controls */}
        <View style={styles.controls}>
          {/* Gallery */}
          <TouchableOpacity style={styles.sideButton} onPress={handlePickImage}>
            <Ionicons name="images-outline" size={28} color={COLORS.white} />
            <Text style={styles.sideButtonText}>Galería</Text>
          </TouchableOpacity>

          {/* Capture */}
          <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
            <View style={styles.captureInner} />
          </TouchableOpacity>

          {/* Flip */}
          <TouchableOpacity
            style={styles.sideButton}
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
          >
            <Ionicons name="camera-reverse-outline" size={28} color={COLORS.white} />
            <Text style={styles.sideButtonText}>Voltear</Text>
          </TouchableOpacity>
        </View>
      </CameraView>

      {/* KPI fields reminder */}
      <ScrollView style={styles.fieldsInfo} horizontal showsHorizontalScrollIndicator={false}>
        <Text style={styles.fieldsLabel}>Campos a capturar: </Text>
        {KPI_FIELDS.map((f) => (
          <View key={f.key} style={styles.fieldChip}>
            <Text style={styles.fieldChipText}>{f.label}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F5F5F5',
  },
  camera: { flex: 1 },
  permText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  permButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 8,
  },
  permButtonText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },

  // Frame guide overlay
  frameGuide: {
    position: 'absolute',
    top: '15%',
    left: '5%',
    right: '5%',
    bottom: '25%',
  },
  frameCornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: COLORS.white,
  },
  frameCornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: COLORS.white,
  },
  frameCornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: COLORS.white,
  },
  frameCornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: COLORS.white,
  },

  hintContainer: {
    position: 'absolute',
    top: '10%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: COLORS.white,
    backgroundColor: COLORS.overlay,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 13,
  },

  controls: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  sideButton: { alignItems: 'center', gap: 4 },
  sideButtonText: { color: COLORS.white, fontSize: 11 },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.white,
  },

  fieldsInfo: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexGrow: 0,
  },
  fieldsLabel: { color: '#AAA', fontSize: 12, alignSelf: 'center', marginRight: 4 },
  fieldChip: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    alignSelf: 'center',
  },
  fieldChipText: { color: '#DDD', fontSize: 11 },

  // Preview
  previewContainer: { flex: 1, backgroundColor: COLORS.black },
  previewImage: { flex: 1 },
  processingOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  processingText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  previewActions: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 32,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#555',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.success,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  previewActionText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
});
