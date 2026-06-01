import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { getAuth } from 'firebase/auth';
import { useAuth } from '../../hooks/useAuth';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { GooglePlacesAutocompleteRef } from 'react-native-google-places-autocomplete';
import { colors } from '../../constants/colors';
import Button from '../../components/Button';
import Input from '../../components/Input';
import CityPickerModal from '../../components/CityPickerModal';
import AddressAutocomplete, { Coords } from '../../components/AddressAutocomplete';
import SchedulePickerModal from '../../components/SchedulePickerModal';
import { createJob } from '../../services/jobService';
import { getUser, saveJobTemplate } from '../../services/userService';
import { uploadPhoto } from '../../services/storageService';
import { formatScheduledTime } from '../../utils/formatSchedule';
import { JobTemplate } from '../../types';
import { JOB_CATEGORIES, JobCategory } from '../../constants/categories';
import { LoadWeight } from '../../services/distanceService';
import { SenderStackParams } from '../../navigation/SenderNavigator';

type Nav = StackNavigationProp<SenderStackParams, 'PostJob'>;

const EMPTY_COORDS: Coords = { latitude: 0, longitude: 0 };

export default function PostJobScreen() {
  const nav = useNavigation<Nav>();
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [pickupCoords, setPickupCoords] = useState<Coords>(EMPTY_COORDS);
  const [dropoffCoords, setDropoffCoords] = useState<Coords>(EMPTY_COORDS);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<JobCategory>('general');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [city, setCity] = useState('');
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [loadPhotoUri, setLoadPhotoUri] = useState<string | null>(null);
  const [scheduledFor, setScheduledFor] = useState<number | null>(null);
  const [schedulePickerOpen, setSchedulePickerOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [loadWeight, setLoadWeight] = useState<LoadWeight>('medium');

  const { appUser } = useAuth();
  const pickupRef = useRef<GooglePlacesAutocompleteRef>(null);
  const dropoffRef = useRef<GooglePlacesAutocompleteRef>(null);

  const fillMyAddress = async () => {
    const saved = (appUser as any)?.residentialAddress as string | undefined;
    if (!saved) return;
    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ??
        (Constants.expoConfig?.extra as any)?.googleMapsKey ?? '';
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(saved)}&key=${apiKey}`
      );
      const json = await res.json();
      const loc = json.results?.[0]?.geometry?.location;
      if (loc?.lat != null && loc?.lng != null) {
        dropoffRef.current?.setAddressText(saved);
        setDropoffAddress(saved);
        setDropoffCoords({ latitude: loc.lat, longitude: loc.lng });
      } else {
        dropoffRef.current?.setAddressText(saved);
        setDropoffAddress(saved);
      }
    } catch {
      dropoffRef.current?.setAddressText(saved);
      setDropoffAddress(saved);
    }
  };

  const getMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Enable location to auto-fill your pickup.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync(loc.coords);
      const streetPart = [place.streetNumber, place.street].filter(Boolean).join(' ');
      const addr = [streetPart || place.name, place.district || place.subregion || place.city, place.city, place.region]
        .filter((v, i, arr) => Boolean(v) && arr.indexOf(v) === i) // deduplicate
        .slice(0, 3)
        .join(', ');
      pickupRef.current?.setAddressText(addr);
      setPickupAddress(addr);
      setPickupCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch {
      Alert.alert('Error', 'Could not get your location. Try again.');
    } finally {
      setLocating(false);
    }
  };

  const pickLoadPhoto = () => {
    Alert.alert('Add load photo', 'Choose a source', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access.'); return; }
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.75 });
          if (!result.canceled) setLoadPhotoUri(result.assets[0].uri);
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.75 });
          if (!result.canceled) setLoadPhotoUri(result.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handlePost = async () => {
    if (!city) { Alert.alert('City required', 'Please select the city / town for this job.'); return; }

    const rawPickup = (pickupRef.current?.getAddressText?.() ?? pickupAddress).trim();
    const rawDropoff = (dropoffRef.current?.getAddressText?.() ?? dropoffAddress).trim();

    if (!rawPickup) { Alert.alert('Pickup required', 'Please enter a pickup address.'); return; }
    if (!rawDropoff) { Alert.alert('Dropoff required', 'Please enter a dropoff address.'); return; }
    if (!description.trim()) { Alert.alert('Description required', 'Please list your items so drivers can assess the job and quote accurately.'); return; }
    if (!loadPhotoUri) { Alert.alert('Photo required', 'Please add a photo of your load so drivers can assess the job.'); return; }

    if (pickupCoords.latitude === 0 && pickupCoords.longitude === 0) {
      Alert.alert(
        'Pickup not found',
        'We could not locate that address. Please select an address from the suggestions dropdown.',
        [{ text: 'OK' }]
      );
      return;
    }
    if (dropoffCoords.latitude === 0 && dropoffCoords.longitude === 0) {
      Alert.alert(
        'Dropoff not found',
        'We could not locate that address. Please select an address from the suggestions dropdown.',
        [{ text: 'OK' }]
      );
      return;
    }
    if (saveAsTemplate && !templateName.trim()) {
      Alert.alert('Template name required', 'Enter a name for this saved route.'); return;
    }

    setLoading(true);
    try {
      const uid = getAuth().currentUser?.uid ?? '';
      const user = await getUser(uid);

      let loadPhotoUrl: string | undefined;
      if (loadPhotoUri) loadPhotoUrl = await uploadPhoto(loadPhotoUri, `jobs/${uid}`);

      const jobId = await createJob({
        posterId: uid,
        posterName: user?.name ?? '',
        city,
        pickup: { address: pickupAddress.trim(), coords: pickupCoords },
        dropoff: { address: dropoffAddress.trim(), coords: dropoffCoords },
        description: description.trim(),
        category,
        when: scheduledFor ?? 'now',
        status: 'open',
        ...(loadPhotoUrl ? { loadPhotoUrl } : {}),
      });

      if (saveAsTemplate && templateName.trim()) {
        const template: JobTemplate = {
          id: Date.now().toString(),
          name: templateName.trim(),
          city,
          pickupAddress: pickupAddress.trim(),
          pickupCoords,
          dropoffAddress: dropoffAddress.trim(),
          dropoffCoords,
          description: description.trim() || undefined,
        };
        await saveJobTemplate(uid, template);
      }

      nav.replace('JobOffers', { jobId });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const scheduleLabel = scheduledFor ? formatScheduledTime(scheduledFor) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Post a job</Text>
        <Text style={styles.subtitle}>Tell drivers where to come and where you're going.</Text>

        {/* City */}
        <TouchableOpacity style={styles.cityRow} onPress={() => setCityPickerOpen(true)} activeOpacity={0.7}>
          <Ionicons name="location" size={20} color={city ? colors.primary : colors.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cityLabel}>City / Town</Text>
            <Text style={[styles.cityValue, !city && styles.cityPlaceholder]}>
              {city || 'Select the city for this job'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Pickup */}
        <View style={styles.locationRow}>
          <View style={{ flex: 1, zIndex: 20 }}>
            <AddressAutocomplete
              ref={pickupRef}
              label="Pickup Address"
              placeholder="Where must the driver come?"
              onSelect={(addr, coords) => { setPickupAddress(addr); setPickupCoords(coords); }}
              zIndex={20}
            />
          </View>
          <TouchableOpacity style={styles.gpsBtn} onPress={getMyLocation} disabled={locating}>
            <Ionicons name="locate" size={22} color={locating ? colors.textMuted : colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Dropoff */}
        <View style={{ zIndex: 10 }}>
          {(appUser as any)?.residentialAddress ? (
            <TouchableOpacity style={styles.myAddressChip} onPress={fillMyAddress} activeOpacity={0.75}>
              <Ionicons name="home-outline" size={14} color={colors.primary} />
              <Text style={styles.myAddressText} numberOfLines={1}>
                Use my address: {(appUser as any).residentialAddress}
              </Text>
            </TouchableOpacity>
          ) : null}
          <AddressAutocomplete
            ref={dropoffRef}
            label="Dropoff Address"
            placeholder="Where are you going?"
            onSelect={(addr, coords) => { setDropoffAddress(addr); setDropoffCoords(coords); }}
            zIndex={10}
          />
        </View>

        {/* Category */}
        <Text style={styles.catLabel}>What are you moving?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          {JOB_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.catChip, category === cat.key && { backgroundColor: cat.color, borderColor: cat.color }]}
              onPress={() => setCategory(cat.key)}
              activeOpacity={0.8}
            >
              <Ionicons name={cat.icon as any} size={15} color={category === cat.key ? colors.white : colors.textMuted} />
              <Text style={[styles.catChipText, category === cat.key && { color: colors.white }]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Load weight */}
        <Text style={styles.catLabel}>How heavy is the load?</Text>
        <View style={styles.weightRow}>
          {([
            { key: 'light', label: 'Light', sub: 'Boxes / small items' },
            { key: 'medium', label: 'Medium', sub: '1-bedroom load' },
            { key: 'heavy', label: 'Heavy', sub: '2–3 bedrooms' },
          ] as { key: LoadWeight; label: string; sub: string }[]).map(w => (
            <TouchableOpacity
              key={w.key}
              style={[styles.weightChip, loadWeight === w.key && styles.weightChipActive]}
              onPress={() => setLoadWeight(w.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.weightLabel, loadWeight === w.key && { color: colors.white }]}>{w.label}</Text>
              <Text style={[styles.weightSub, loadWeight === w.key && { color: colors.white + 'CC' }]}>{w.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Describe your items"
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. 2-seater couch, queen bed, 15 boxes, washing machine — the more detail, the more accurate the quote"
          multiline numberOfLines={3}
          style={{ height: 90, textAlignVertical: 'top', paddingTop: 10 }}
        />

        {/* Load photo */}
        <TouchableOpacity style={styles.photoBox} onPress={pickLoadPhoto} activeOpacity={0.8}>
          {loadPhotoUri ? (
            <>
              <Image source={{ uri: loadPhotoUri }} style={styles.photoPreview} />
              <View style={styles.photoOverlay}>
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={styles.photoOverlayText}>Change photo</Text>
              </View>
            </>
          ) : (
            <>
              <Ionicons name="image-outline" size={32} color={colors.textMuted} />
              <Text style={styles.photoLabel}>Add a photo of your load <Text style={{ color: colors.danger }}>*</Text></Text>
              <Text style={styles.photoHint}>Required — helps drivers assess the job and price</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Schedule */}
        <TouchableOpacity
          style={[styles.optionRow, scheduleLabel && styles.optionRowActive]}
          onPress={() => setSchedulePickerOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={scheduleLabel ? colors.primary : colors.textMuted}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionLabel, scheduleLabel && { color: colors.primary }]}>
              {scheduleLabel ?? 'Schedule for later'}
            </Text>
            {!scheduleLabel && (
              <Text style={styles.optionSub}>Currently set to right now</Text>
            )}
          </View>
          {scheduleLabel ? (
            <TouchableOpacity onPress={() => setScheduledFor(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          )}
        </TouchableOpacity>

        {/* Save as template */}
        <TouchableOpacity
          style={[styles.optionRow, saveAsTemplate && styles.optionRowActive]}
          onPress={() => setSaveAsTemplate(v => !v)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={saveAsTemplate ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={saveAsTemplate ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.optionLabel, saveAsTemplate && { color: colors.primary }]}>
            Save as a route template
          </Text>
        </TouchableOpacity>

        {saveAsTemplate && (
          <Input
            label="Template name"
            value={templateName}
            onChangeText={setTemplateName}
            placeholder="e.g. Monthly furniture pickup"
          />
        )}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.info} />
          <Text style={styles.infoText}>
            Drivers will see your job and send you their price in rands. You pick who to go with.
          </Text>
        </View>

        <Button label="Post Job" onPress={handlePost} loading={loading} style={styles.mt} />
      </ScrollView>

      <CityPickerModal visible={cityPickerOpen} selected={city} onSelect={setCity} onClose={() => setCityPickerOpen(false)} />
      <SchedulePickerModal
        visible={schedulePickerOpen}
        onConfirm={ts => { setScheduledFor(ts); setSchedulePickerOpen(false); }}
        onClose={() => setSchedulePickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: 24, paddingTop: 16 },
  back: { marginBottom: 24 },
  backText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '900', color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginBottom: 28, lineHeight: 22 },
  cityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: colors.border, marginBottom: 20,
  },
  cityLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  cityValue: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 2 },
  cityPlaceholder: { color: colors.textMuted, fontWeight: '400' },
  locationRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, zIndex: 20 },
  myAddressChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '12',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.primary + '30',
    marginBottom: 8, maxWidth: '100%',
  },
  myAddressText: {
    fontSize: 12, fontWeight: '600', color: colors.primary, flexShrink: 1,
  },
  gpsBtn: {
    width: 50, height: 50, borderRadius: 10,
    backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 1.5, borderColor: colors.border,
  },
  photoBox: {
    borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
    borderRadius: 12, height: 160, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceAlt, overflow: 'hidden', marginBottom: 16, gap: 6,
  },
  photoPreview: { ...StyleSheet.absoluteFillObject },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  photoOverlayText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  photoLabel: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  photoHint: { fontSize: 12, color: colors.textMuted },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: colors.border, marginBottom: 12,
  },
  optionRowActive: { borderColor: colors.primary + '60', backgroundColor: colors.primary + '08' },
  optionLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  optionSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  infoBox: {
    flexDirection: 'row', backgroundColor: '#E8F0FF',
    borderRadius: 10, padding: 14, gap: 10, alignItems: 'flex-start', marginTop: 4,
  },
  infoText: { flex: 1, fontSize: 13, color: colors.info, lineHeight: 18 },
  catLabel: {
    fontSize: 13, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  catRow: { gap: 8, paddingBottom: 16 },
  weightRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  weightChip: {
    flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', gap: 2,
  },
  weightChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  weightLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  weightSub: { fontSize: 10, color: colors.textMuted, textAlign: 'center' },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 8,
  },
  catChipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  mt: { marginTop: 20 },
});
