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
import { colors } from '../../constants/colors';
import { spacing, radius, shadows } from '../../constants/spacing';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Badge from '../../components/Badge';
import Header from '../../components/Header';
import Divider from '../../components/Divider';
import CityPickerModal from '../../components/CityPickerModal';
import AddressAutocomplete, { Coords, AddressAutocompleteRef } from '../../components/AddressAutocomplete';
import SchedulePickerModal from '../../components/SchedulePickerModal';
import { createJob } from '../../services/jobService';
import { getUser, saveJobTemplate } from '../../services/userService';
import { uploadPhoto } from '../../services/storageService';
import { formatScheduledTime } from '../../utils/formatSchedule';
import { JobTemplate } from '../../types';
import { JOB_CATEGORIES, JobCategory } from '../../constants/categories';
import { LoadWeight, getRouteDistance, RouteInfo } from '../../services/distanceService';
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
  const [priceEstimate, setPriceEstimate] = useState<RouteInfo | null>(null);

  const { appUser } = useAuth();

  useEffect(() => {
    if (!pickupCoords.latitude || !dropoffCoords.latitude) { setPriceEstimate(null); return; }
    getRouteDistance(pickupCoords, dropoffCoords, loadWeight).then(info => {
      setPriceEstimate(info);
    }).catch(() => {});
  }, [pickupCoords.latitude, pickupCoords.longitude, dropoffCoords.latitude, dropoffCoords.longitude, loadWeight]);
  const pickupRef  = useRef<AddressAutocompleteRef>(null);
  const dropoffRef = useRef<AddressAutocompleteRef>(null);

  const fillMyAddress = async () => {
    const saved = (appUser as any)?.residentialAddress as string | undefined;
    if (!saved) return;
    try {
      const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ??
        (Constants.expoConfig?.extra as any)?.mapboxToken ?? '';
      const res  = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(saved)}.json` +
        `?access_token=${token}&country=ZA&language=en&limit=1`
      );
      const json = await res.json();
      const feature = json.features?.[0];
      if (feature) {
        const [lng, lat] = feature.center;
        dropoffRef.current?.setText(saved);
        setDropoffAddress(saved);
        setDropoffCoords({ latitude: lat, longitude: lng });
        return;
      }
    } catch {}
    dropoffRef.current?.setText(saved);
    setDropoffAddress(saved);
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
      pickupRef.current?.setText(addr);
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
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <Header
        title="Post a Job"
        subtitle="Describe your move in detail"
        leftAction={{
          icon: 'chevron-back',
          onPress: () => nav.goBack(),
        }}
      />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" nestedScrollEnabled>

        {/* Section 1: Location */}
        <Text style={styles.sectionTitle}>Location</Text>

        <Card variant="outlined" padding={4} style={styles.marginBottom}>
          <TouchableOpacity
            style={styles.cityRow}
            onPress={() => setCityPickerOpen(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="location" size={22} color={city ? colors.primary : colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>City / Town</Text>
              <Text style={[styles.fieldValue, !city && styles.fieldPlaceholder]}>
                {city || 'Select city for this job'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        <View style={{ zIndex: 20, marginBottom: spacing[4] }}>
          <View style={styles.addressRow}>
            <View style={{ flex: 1 }}>
              <AddressAutocomplete
                ref={pickupRef}
                label="Pickup Address"
                placeholder="Where must the driver come?"
                onSelect={(addr, coords) => { setPickupAddress(addr); setPickupCoords(coords); }}
                zIndex={20}
              />
            </View>
            <TouchableOpacity
              style={[styles.gpsBtn, locating && styles.gpsBtnDisabled]}
              onPress={getMyLocation}
              disabled={locating}
            >
              <Ionicons name="locate" size={20} color={locating ? colors.textMuted : colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ zIndex: 10 }}>
          <AddressAutocomplete
            ref={dropoffRef}
            label="Dropoff Address"
            placeholder="Where are you going?"
            onSelect={(addr, coords) => { setDropoffAddress(addr); setDropoffCoords(coords); }}
            zIndex={10}
          />
        </View>

        {/* Section 2: Load Details */}
        <Text style={styles.sectionTitle}>Load Details</Text>

        <View style={styles.marginBottom}>
          <Text style={styles.fieldLabel}>What are you moving?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
            {JOB_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.catChip,
                  category === cat.key && styles.catChipActive,
                ]}
                onPress={() => setCategory(cat.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={16}
                  color={category === cat.key ? colors.white : colors.textMuted}
                />
                <Text
                  style={[
                    styles.catChipText,
                    category === cat.key && styles.catChipTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.marginBottom}>
          <Text style={styles.fieldLabel}>How heavy is the load?</Text>
          <View style={styles.weightRow}>
            {([
              { key: 'light', label: 'Light', sub: 'Boxes / small items' },
              { key: 'medium', label: 'Medium', sub: '1-bedroom load' },
              { key: 'heavy', label: 'Heavy', sub: '2–3 bedrooms' },
            ] as { key: LoadWeight; label: string; sub: string }[]).map(w => (
              <TouchableOpacity
                key={w.key}
                style={[
                  styles.weightChip,
                  loadWeight === w.key && styles.weightChipActive,
                ]}
                onPress={() => setLoadWeight(w.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.weightLabel,
                    loadWeight === w.key && styles.weightLabelActive,
                  ]}
                >
                  {w.label}
                </Text>
                <Text
                  style={[
                    styles.weightSub,
                    loadWeight === w.key && styles.weightSubActive,
                  ]}
                >
                  {w.sub}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Price Estimate */}
        {priceEstimate && (
          <Card variant="filled" padding={4} style={styles.marginBottom}>
            <View style={styles.estimateHeader}>
              <View style={styles.estimateIconBox}>
                <Ionicons name="cash-outline" size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.estimateLabel}>Estimated Driver Price</Text>
                <Text style={styles.estimateRange}>
                  R{priceEstimate.suggestedMin} – R{priceEstimate.suggestedMax}
                </Text>
              </View>
            </View>
            <Divider margin={3} variant="inset" />
            <Text style={styles.estimateSub}>
              {priceEstimate.distanceKm} km · ~{priceEstimate.durationMin} min · Drivers set their own price
            </Text>
          </Card>
        )}

        <Input
          label="Describe Your Items"
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. 2-seater couch, queen bed, 15 boxes, washing machine"
          size="md"
          variant="outlined"
          multiline
          numberOfLines={4}
          style={{ height: 100, textAlignVertical: 'top' }}
          error={!description.trim() && loading ? 'Description required' : undefined}
        />

        {/* Section 3: Photo & Details */}
        <Text style={[styles.sectionTitle, styles.marginTop]}>Add Photos</Text>

        <TouchableOpacity
          style={[styles.photoBox, loadPhotoUri && styles.photoBoxWithImage]}
          onPress={pickLoadPhoto}
          activeOpacity={0.8}
        >
            {loadPhotoUri ? (
            <>
              <Image source={{ uri: loadPhotoUri }} style={styles.photoPreview} />
              <View style={styles.photoOverlay}>
                <View style={styles.photoOverlayContent}>
                  <Ionicons name="camera" size={24} color={colors.white} />
                  <Text style={styles.photoOverlayText}>Change Photo</Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <Ionicons name="image-outline" size={40} color={colors.accent} />
              <View style={styles.photoTextContent}>
                <Text style={styles.photoLabel}>
                  Add a Photo of Your Load <Text style={{ color: colors.error }}>*</Text>
                </Text>
                <Text style={styles.photoHint}>Helps drivers accurately assess the job</Text>
              </View>
            </>
          )}
        </TouchableOpacity>

        {/* Section 4: Options */}
        <Text style={[styles.sectionTitle, styles.marginTop]}>Options</Text>

        <Card variant="outlined" padding={4} style={styles.marginBottom}>
          <TouchableOpacity
            style={[styles.optionRow, scheduleLabel && styles.optionRowActive]}
            onPress={() => setSchedulePickerOpen(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="calendar-outline"
              size={20}
              color={scheduleLabel ? colors.primary : colors.textMuted}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, scheduleLabel && styles.optionLabelActive]}>
                {scheduleLabel || 'Schedule for Later'}
              </Text>
              {!scheduleLabel && (
                <Text style={styles.optionSub}>Moving now</Text>
              )}
            </View>
            {scheduleLabel ? (
              <TouchableOpacity
                onPress={() => setScheduledFor(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        </Card>

        <Card variant="outlined" padding={4} style={styles.marginBottom}>
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setSaveAsTemplate(v => !v)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={saveAsTemplate ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={saveAsTemplate ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.optionLabel,
                saveAsTemplate && styles.optionLabelActive,
              ]}
            >
              Save as Route Template
            </Text>
          </TouchableOpacity>
        </Card>

        {saveAsTemplate && (
          <Input
            label="Template Name"
            value={templateName}
            onChangeText={setTemplateName}
            placeholder="e.g. Monthly furniture pickup"
            size="md"
            variant="outlined"
          />
        )}

        <Card variant="filled" padding={4} style={[styles.marginBottom, styles.infoBox]}>
          <View style={styles.infoContent}>
            <Ionicons name="information-circle" size={20} color={colors.info} />
            <Text style={styles.infoText}>
              Drivers will see your job details and send you their price. You choose who to book.
            </Text>
          </View>
        </Card>

        <Button
          label="Post Job"
          variant="primary"
          size="lg"
          onPress={handlePost}
          loading={loading}
          style={styles.postButton}
        />
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
  container: { padding: spacing[4], paddingBottom: spacing[8] },

  // Section Styling
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[3],
  },
  marginBottom: { marginBottom: spacing[4] },
  marginTop: { marginTop: spacing[6] },

  // Field Labels
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing[1],
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  fieldPlaceholder: {
    color: colors.textMuted,
    fontWeight: '400',
  },

  // City Row
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },

  // Address Input
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
    zIndex: 20,
  },
  gpsBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing[2],
  },
  gpsBtnDisabled: {
    opacity: 0.6,
  },
  myAddressChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '10',
    borderRadius: 20,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderWidth: 1,
    borderColor: colors.primary + '20',
    marginBottom: spacing[2],
  },
  myAddressText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    flexShrink: 1,
  },

  // Photo Section
  photoBox: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  photoBoxWithImage: {
    gap: 0,
  },
  photoPreview: {
    ...StyleSheet.absoluteFillObject,
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOverlayContent: {
    alignItems: 'center',
    gap: spacing[2],
  },
  photoOverlayText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  photoLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  photoHint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  photoTextContent: {
    alignItems: 'center',
    gap: spacing[2],
  },

  // Category & Weight
  catRow: { gap: spacing[2], paddingBottom: spacing[4] },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  catChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  catChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },

  // Weight Chip
  weightRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  weightChip: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    alignItems: 'center',
    gap: spacing[1],
  },
  weightChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  weightLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  weightLabelActive: {
    color: colors.white,
  },
  weightSub: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  weightSubActive: {
    color: colors.white + '99',
  },

  // Price Estimate
  estimateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  estimateIconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  estimateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  estimateRange: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing[1],
  },
  estimateSub: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Options
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  optionRowActive: {
    backgroundColor: colors.primary + '08',
    borderColor: colors.primary + '30',
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  optionLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  optionSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing[1],
  },

  // Info Box
  infoBox: {
    marginBottom: spacing[6],
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.info,
    lineHeight: 20,
  },

  // Button
  postButton: {
    marginBottom: spacing[4],
  },
});
