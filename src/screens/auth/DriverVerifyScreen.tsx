import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Image,
  TouchableOpacity, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { getAuth } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { updateUser } from '../../services/userService';
import { verifyDriverIdentity } from '../../services/verificationService';
import { uploadPhoto } from '../../services/storageService';
import Button from '../../components/Button';
import Input from '../../components/Input';

type PhotoSlot =
  | 'selfie'
  | 'idDocument'
  | 'licence'
  | 'vehicleDisc'
  | 'vehiclePlate'
  | 'vehicleFront'
  | 'vehicleBack'
  | 'vehicleLeft'
  | 'vehicleRight';

interface SlotState {
  selfie: string | null;
  idDocument: string | null;
  licence: string | null;
  vehicleDisc: string | null;
  vehiclePlate: string | null;
  vehicleFront: string | null;
  vehicleBack: string | null;
  vehicleLeft: string | null;
  vehicleRight: string | null;
}

function PhotoBox({
  label,
  uri,
  icon,
  wide,
  onPress,
}: {
  label: string;
  uri: string | null;
  icon: string;
  wide?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.photoBox, wide && styles.photoBoxWide]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.photoFill} resizeMode="cover" />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Ionicons name={icon as any} size={wide ? 44 : 36} color={colors.textMuted} />
          <Text style={styles.photoLabel}>{label}</Text>
        </View>
      )}
      {uri && (
        <View style={styles.photoDone}>
          <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function DriverVerifyScreen({ onDone }: { onDone?: () => void } = {}) {
  const [photos, setPhotos] = useState<SlotState>({
    selfie: null,
    idDocument: null,
    licence: null,
    vehicleDisc: null,
    vehiclePlate: null,
    vehicleFront: null,
    vehicleBack: null,
    vehicleLeft: null,
    vehicleRight: null,
  });

  const [idNumber, setIdNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const pickPhoto = async (slot: PhotoSlot, camera: boolean) => {
    const permFn = camera
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;
    const { status } = await permFn();
    if (status !== 'granted') {
      Alert.alert('Permission needed', `Allow ${camera ? 'camera' : 'photo library'} access to continue.`);
      return;
    }
    const launchFn = camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await launchFn({
      mediaTypes: ['images'],
      allowsEditing: slot === 'selfie',
      aspect: slot === 'selfie' ? [1, 1] : undefined,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotos(p => ({ ...p, [slot]: result.assets[0].uri }));
    }
  };

  const showPicker = (slot: PhotoSlot) => {
    Alert.alert('Add photo', 'Choose source', [
      { text: 'Take Photo', onPress: () => pickPhoto(slot, true) },
      { text: 'Choose from Library', onPress: () => pickPhoto(slot, false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    if (!photos.selfie) { Alert.alert('Selfie required', 'Take a clear selfie so we can verify your identity.'); return; }
    if (!photos.idDocument) { Alert.alert('ID document required', 'Upload a photo of your SA ID card or book.'); return; }
    if (!photos.licence) { Alert.alert("Driver's licence required", 'Upload a photo of your driver\'s licence.'); return; }
    if (!photos.vehicleDisc) { Alert.alert('Vehicle disc required', 'Upload a photo of your vehicle licence disc.'); return; }
    if (!photos.vehiclePlate) { Alert.alert('Number plate required', 'Upload a clear photo of your number plate.'); return; }
    if (!photos.vehicleFront || !photos.vehicleBack || !photos.vehicleLeft || !photos.vehicleRight) {
      Alert.alert('Vehicle photos required', 'Upload all 4 photos of your bakkie (front, back, left, right).'); return;
    }
    if (!idNumber.trim() || idNumber.replace(/\s/g, '').length < 13) {
      Alert.alert('Invalid ID number', 'Please enter your full 13-digit SA ID number.'); return;
    }
    if (!firstName.trim() || !lastName.trim()) { Alert.alert('Name required', 'Enter your first and last name as on your ID.'); return; }
    if (!dob.trim()) { Alert.alert('Date of birth required', 'Enter your date of birth (YYYY-MM-DD).'); return; }
    if (!regNumber.trim()) { Alert.alert('Registration required', 'Enter your bakkie registration number.'); return; }

    setLoading(true);
    try {
      const uid = getAuth().currentUser?.uid;
      if (!uid) return;

      const [
        selfieUrl, idDocUrl, licenceUrl,
        vehicleDiscUrl, vehiclePlateUrl,
        vehicleFrontUrl, vehicleBackUrl, vehicleLeftUrl, vehicleRightUrl,
      ] = await Promise.all([
        uploadPhoto(photos.selfie!, `drivers/${uid}/selfie.jpg`),
        uploadPhoto(photos.idDocument!, `drivers/${uid}/id_document.jpg`),
        uploadPhoto(photos.licence!, `drivers/${uid}/licence.jpg`),
        uploadPhoto(photos.vehicleDisc!, `drivers/${uid}/vehicle_disc.jpg`),
        uploadPhoto(photos.vehiclePlate!, `drivers/${uid}/vehicle_plate.jpg`),
        uploadPhoto(photos.vehicleFront!, `drivers/${uid}/vehicle_front.jpg`),
        uploadPhoto(photos.vehicleBack!, `drivers/${uid}/vehicle_back.jpg`),
        uploadPhoto(photos.vehicleLeft!, `drivers/${uid}/vehicle_left.jpg`),
        uploadPhoto(photos.vehicleRight!, `drivers/${uid}/vehicle_right.jpg`),
      ]);

      await updateUser(uid, {
        profilePhoto: selfieUrl,
        selfiePhoto: selfieUrl,
        idDocumentPhoto: idDocUrl,
        licencePhotoUrl: licenceUrl,
        vehicleDiscPhotoUrl: vehicleDiscUrl,
        vehiclePlatePhotoUrl: vehiclePlateUrl,
        vehicleFrontPhotoUrl: vehicleFrontUrl,
        vehicleBackPhotoUrl: vehicleBackUrl,
        vehicleLeftPhotoUrl: vehicleLeftUrl,
        vehicleRightPhotoUrl: vehicleRightUrl,
        vehiclePhoto: vehicleFrontUrl,
        registrationNumber: regNumber.trim().toUpperCase(),
        idNumber: idNumber.replace(/\s/g, ''),
        isOnline: false,
        verificationStatus: 'pending',
      });

      await verifyDriverIdentity(uid, {
        idNumber: idNumber.replace(/\s/g, ''),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth: dob.trim(),
        selfieBase64: '',
        idDocumentBase64: '',
      });

      onDone?.();
      Alert.alert(
        'Documents submitted!',
        "Our team will review your documents within 24 hours. You'll be notified once approved."
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const requiredCount = [
    photos.selfie, photos.idDocument, photos.licence,
    photos.vehicleDisc, photos.vehiclePlate,
    photos.vehicleFront, photos.vehicleBack, photos.vehicleLeft, photos.vehicleRight,
  ].filter(Boolean).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Verify your profile</Text>
        <Text style={styles.subtitle}>
          All drivers are vetted before going live. Upload your documents and bakkie photos below.
        </Text>

        {/* Progress */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(requiredCount / 9) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>{requiredCount} of 9 items complete</Text>

        {/* ── Step 1: Personal identity ── */}
        <View style={styles.section}>
          <Text style={styles.stepLabel}>Step 1 — Identity</Text>

          <Text style={styles.stepDesc}>Take a selfie and upload your SA ID card or book (front).</Text>
          <View style={styles.twoCol}>
            <PhotoBox
              label="Take selfie"
              uri={photos.selfie}
              icon="person-circle-outline"
              onPress={() => showPicker('selfie')}
            />
            <PhotoBox
              label="SA ID document"
              uri={photos.idDocument}
              icon="card-outline"
              onPress={() => showPicker('idDocument')}
            />
          </View>

          <Input label="First Name (as on ID)" value={firstName} onChangeText={setFirstName} placeholder="Sipho" autoCapitalize="words" />
          <Input label="Last Name (as on ID)" value={lastName} onChangeText={setLastName} placeholder="Dlamini" autoCapitalize="words" />
          <Input
            label="SA ID Number (13 digits)"
            value={idNumber}
            onChangeText={setIdNumber}
            placeholder="0001015030083"
            keyboardType="numeric"
            maxLength={13}
          />
          <Input
            label="Date of Birth"
            value={dob}
            onChangeText={setDob}
            placeholder="YYYY-MM-DD"
            keyboardType="numeric"
          />
        </View>

        {/* ── Step 2: Driver's licence ── */}
        <View style={styles.section}>
          <Text style={styles.stepLabel}>Step 2 — Driver's Licence</Text>
          <Text style={styles.stepDesc}>Upload both sides of your valid driver's licence card.</Text>
          <PhotoBox
            label="Tap to upload driver's licence"
            uri={photos.licence}
            icon="id-card-outline"
            wide
            onPress={() => showPicker('licence')}
          />
        </View>

        {/* ── Step 3: Vehicle documents ── */}
        <View style={styles.section}>
          <Text style={styles.stepLabel}>Step 3 — Bakkie registration</Text>
          <Text style={styles.stepDesc}>Your registration number, vehicle licence disc, and number plate photo.</Text>

          <Input
            label="Registration Number"
            value={regNumber}
            onChangeText={setRegNumber}
            placeholder="e.g. CA 123-456"
            autoCapitalize="characters"
          />

          <View style={styles.twoCol}>
            <PhotoBox
              label="Licence disc"
              uri={photos.vehicleDisc}
              icon="document-text-outline"
              onPress={() => showPicker('vehicleDisc')}
            />
            <PhotoBox
              label="Number plate"
              uri={photos.vehiclePlate}
              icon="text-outline"
              onPress={() => showPicker('vehiclePlate')}
            />
          </View>
        </View>

        {/* ── Step 4: Vehicle photos ── */}
        <View style={styles.section}>
          <Text style={styles.stepLabel}>Step 4 — Bakkie photos</Text>
          <Text style={styles.stepDesc}>4 clear photos of your bakkie. Make sure the vehicle is clean and visible.</Text>

          <View style={styles.twoCol}>
            <PhotoBox label="Front" uri={photos.vehicleFront} icon="car-outline" onPress={() => showPicker('vehicleFront')} />
            <PhotoBox label="Back" uri={photos.vehicleBack} icon="car-outline" onPress={() => showPicker('vehicleBack')} />
          </View>
          <View style={[styles.twoCol, { marginTop: 10 }]}>
            <PhotoBox label="Left side" uri={photos.vehicleLeft} icon="car-outline" onPress={() => showPicker('vehicleLeft')} />
            <PhotoBox label="Right side" uri={photos.vehicleRight} icon="car-outline" onPress={() => showPicker('vehicleRight')} />
          </View>
        </View>

        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
          <Text style={styles.securityText}>
            Your documents are used only for vetting and are reviewed by our team. We never share your data with third parties.
          </Text>
        </View>

        {loading && (
          <View style={styles.uploadingNote}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.uploadingText}>Uploading documents… please wait</Text>
          </View>
        )}

        <Button label="Submit for Review" onPress={handleSubmit} loading={loading} style={styles.mt} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: 24, paddingTop: 40 },
  title: { fontSize: 26, fontWeight: '900', color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 16, lineHeight: 20 },

  progressBar: {
    height: 6, backgroundColor: colors.border, borderRadius: 3, marginBottom: 6,
  },
  progressFill: {
    height: '100%', backgroundColor: colors.primary, borderRadius: 3,
  },
  progressText: { fontSize: 12, color: colors.textMuted, marginBottom: 24, textAlign: 'right' },

  section: { marginBottom: 28 },
  stepLabel: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 4 },
  stepDesc: { fontSize: 13, color: colors.textSecondary, marginBottom: 14, lineHeight: 18 },

  twoCol: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  photoBox: {
    flex: 1, height: 130, borderRadius: 12, overflow: 'hidden',
    borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
  },
  photoBoxWide: { flex: 0, width: '100%', height: 160 },
  photoFill: { width: '100%', height: '100%' },
  photoPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceAlt, gap: 6,
  },
  photoLabel: { color: colors.textMuted, fontSize: 12, textAlign: 'center', paddingHorizontal: 8 },
  photoDone: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: colors.surface, borderRadius: 11,
  },

  securityNote: {
    flexDirection: 'row', gap: 10, backgroundColor: colors.surfaceAlt,
    borderRadius: 10, padding: 14, alignItems: 'flex-start', marginBottom: 8,
  },
  securityText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },

  uploadingNote: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 12, marginBottom: 8,
  },
  uploadingText: { fontSize: 13, color: colors.textSecondary },

  mt: { marginTop: 4, marginBottom: 32 },
});
