import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Switch,
  Alert, ScrollView, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import Avatar from '../../components/Avatar';
import StarRating from '../../components/StarRating';
import CityPickerModal from '../../components/CityPickerModal';
import { updateUser, deleteJobTemplate } from '../../services/userService';
import { Share } from 'react-native';
import { uploadPhoto } from '../../services/storageService';
import { getAuth } from 'firebase/auth';
import TierBadge from '../../components/TierBadge';
import { getDriverTier, getNextTier, TIER_DEFS } from '../../utils/driverTier';

const APP_VERSION = '1.0.0';
const SUPPORT_EMAIL = 'support@move-me.co.za';

const VERIFICATION_LABEL: Record<string, string> = {
  unverified: 'Not verified',
  pending: 'Verification pending',
  verified: 'Verified',
  rejected: 'Verification rejected',
};
const VERIFICATION_COLOR: Record<string, string> = {
  unverified: colors.textMuted,
  pending: colors.pending,
  verified: colors.primary,
  rejected: colors.danger,
};
const VERIFICATION_ICON: Record<string, string> = {
  unverified: 'shield-outline',
  pending: 'time-outline',
  verified: 'shield-checkmark',
  rejected: 'close-circle-outline',
};

export default function ProfileScreen() {
  const { appUser } = useAuth();
  const nav = useNavigation<any>();
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVehicle, setUploadingVehicle] = useState(false);

  if (!appUser) return null;

  const uid = getAuth().currentUser?.uid ?? '';
  const isDriver = appUser.role === 'driver';
  const driverTier = isDriver ? getDriverTier(appUser.totalTrips ?? 0, appUser.rating) : null;
  const nextTier = driverTier ? getNextTier(driverTier) : null;
  const verStatus = appUser.verificationStatus ?? 'unverified';
  const prefs = appUser.notificationPrefs ?? { newOffers: true, messages: true, tripUpdates: true };

  const handleCitySelect = async (city: string) => {
    try {
      await updateUser(appUser.id, { serviceCity: city });
    } catch {
      Alert.alert('Error', 'Could not save city. Please try again.');
    }
  };

  const togglePref = async (key: keyof typeof prefs) => {
    await updateUser(uid, {
      notificationPrefs: { ...prefs, [key]: !prefs[key] },
    });
  };

  const pickProfilePhoto = () => {
    Alert.alert('Profile photo', 'Choose a source', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission needed', 'Allow camera access to take a photo.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
          });
          if (!result.canceled) uploadProfilePhoto(result.assets[0].uri);
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission needed', 'Allow photo library access.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
          });
          if (!result.canceled) uploadProfilePhoto(result.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const uploadProfilePhoto = async (uri: string) => {
    setUploadingPhoto(true);
    try {
      const url = await uploadPhoto(uri, `users/${uid}`);
      await updateUser(uid, { profilePhoto: url });
    } catch {
      Alert.alert('Upload failed', 'Could not save your photo. Try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const changeVehiclePhoto = () => {
    if (appUser.vehiclePhotoPending) {
      Alert.alert(
        'Photo pending approval',
        'Your new vehicle photo is being reviewed. Would you like to replace it with a different photo?',
        [
          { text: 'Keep current', style: 'cancel' },
          { text: 'Replace', onPress: () => launchVehiclePhotoPicker() },
        ]
      );
      return;
    }
    launchVehiclePhotoPicker();
  };

  const launchVehiclePhotoPicker = () => {
    Alert.alert('Vehicle photo', 'The new photo will be reviewed before it goes live.', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access.'); return; }
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
          if (!result.canceled) uploadVehiclePhoto(result.assets[0].uri);
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
          if (!result.canceled) uploadVehiclePhoto(result.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const uploadVehiclePhoto = async (uri: string) => {
    setUploadingVehicle(true);
    try {
      const url = await uploadPhoto(uri, `users/${uid}/vehicle`);
      await updateUser(uid, { vehiclePhotoPending: url });
      Alert.alert('Submitted for review', 'Your new vehicle photo will go live once approved by our team.');
    } catch {
      Alert.alert('Upload failed', 'Could not upload the photo. Try again.');
    } finally {
      setUploadingVehicle(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut(getAuth()) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <TouchableOpacity onPress={pickProfilePhoto} activeOpacity={0.85} style={styles.avatarWrap}>
            <Avatar name={appUser.name} uri={appUser.profilePhoto} size={96} />
            <View style={styles.cameraBadge}>
              {uploadingPhoto
                ? <ActivityIndicator size={12} color={colors.white} />
                : <Ionicons name="camera" size={14} color={colors.white} />}
            </View>
          </TouchableOpacity>

          <Text style={styles.heroName}>{appUser.name}</Text>

          <View style={styles.heroMeta}>
            <View style={styles.rolePill}>
              <Ionicons
                name={isDriver ? 'car' : 'cube'}
                size={13}
                color={isDriver ? colors.primary : colors.info}
              />
              <Text style={[styles.roleText, { color: isDriver ? colors.primary : colors.info }]}>
                {isDriver ? 'Driver' : 'Sender'}
              </Text>
            </View>
            {driverTier && <TierBadge tier={driverTier} size="md" />}
          </View>

          {appUser.rating > 0 ? (
            <View style={styles.ratingRow}>
              <StarRating value={Math.round(appUser.rating)} size={18} />
              <Text style={styles.ratingNum}>{appUser.rating.toFixed(1)}</Text>
              <Text style={styles.ratingTotal}>· {appUser.totalTrips ?? 0} trip{appUser.totalTrips !== 1 ? 's' : ''}</Text>
            </View>
          ) : (
            <Text style={styles.noRating}>No ratings yet</Text>
          )}
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{appUser.totalTrips ?? 0}</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={[styles.statCard, styles.statDivider]}>
            <Text style={styles.statValue}>{appUser.rating > 0 ? appUser.rating.toFixed(1) : '—'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            {isDriver ? (
              <>
                <Text style={styles.statValue}>
                  R{(appUser.totalEarned ?? 0).toLocaleString('en-ZA')}
                </Text>
                <Text style={styles.statLabel}>Earned</Text>
              </>
            ) : (
              <>
                <Text style={[styles.statValue, { color: colors.info, fontSize: 16 }]}>Sender</Text>
                <Text style={styles.statLabel}>Role</Text>
              </>
            )}
          </View>
        </View>

        {/* ── Account info ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color={colors.textMuted} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{appUser.phone}</Text>
            </View>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{appUser.email}</Text>
            </View>
          </View>

          {isDriver && (
            <>
              <View style={styles.rowDivider} />
              <View style={styles.infoRow}>
                <Ionicons
                  name={VERIFICATION_ICON[verStatus] as any}
                  size={18}
                  color={VERIFICATION_COLOR[verStatus]}
                />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Identity verification</Text>
                  <Text style={[styles.infoValue, { color: VERIFICATION_COLOR[verStatus] }]}>
                    {VERIFICATION_LABEL[verStatus]}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* ── Driver: service city ── */}
        {isDriver && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <TouchableOpacity style={styles.infoRow} onPress={() => setCityPickerOpen(true)} activeOpacity={0.7}>
              <Ionicons name="location-outline" size={18} color={colors.textMuted} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Service city</Text>
                <Text style={[styles.infoValue, !appUser.serviceCity && styles.placeholder]}>
                  {appUser.serviceCity ?? 'Tap to set'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.border} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Driver: tier progress ── */}
        {isDriver && driverTier && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Driver Tier</Text>
            <View style={styles.tierRow}>
              <TierBadge tier={driverTier} size="md" />
              <View style={{ flex: 1 }}>
                <Text style={styles.tierLabel}>{driverTier.label} Driver</Text>
                {nextTier ? (
                  <Text style={styles.tierSub}>
                    {Math.max(0, nextTier.minTrips - (appUser.totalTrips ?? 0))} trips to {nextTier.label}
                  </Text>
                ) : (
                  <Text style={styles.tierSub}>Highest tier — keep it up!</Text>
                )}
              </View>
              <View style={styles.tierBars}>
                {TIER_DEFS.slice().reverse().map(t => (
                  <View
                    key={t.tier}
                    style={[styles.tierBar, {
                      backgroundColor: (appUser.totalTrips ?? 0) >= t.minTrips ? t.color : colors.border,
                    }]}
                  />
                ))}
              </View>
            </View>
            {nextTier && (
              <View style={styles.tierProgress}>
                <View style={[styles.tierProgressFill, {
                  width: `${Math.min(100, ((appUser.totalTrips ?? 0) / nextTier.minTrips) * 100)}%`,
                  backgroundColor: nextTier.color,
                }]} />
              </View>
            )}
          </View>
        )}

        {/* ── Sender: saved routes ── */}
        {!isDriver && (appUser.jobTemplates ?? []).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Saved Routes</Text>
            {(appUser.jobTemplates ?? []).map((t, i) => (
              <View key={t.id}>
                {i > 0 && <View style={styles.rowDivider} />}
                <View style={styles.templateRow}>
                  <Ionicons name="bookmark-outline" size={18} color={colors.primary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoValue}>{t.name}</Text>
                    <Text style={styles.infoLabel} numberOfLines={1}>
                      {t.pickupAddress} → {t.dropoffAddress}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert('Delete route?', `Remove "${t.name}" from saved routes?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteJobTemplate(uid, t.id) },
                      ]);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Notifications ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.toggleRow}>
            <Ionicons name="megaphone-outline" size={18} color={colors.textMuted} />
            <View style={styles.infoContent}>
              <Text style={styles.infoValue}>{isDriver ? 'New job matches' : 'New driver offers'}</Text>
              <Text style={styles.infoLabel}>Alert when drivers respond to your jobs</Text>
            </View>
            <Switch
              value={prefs.newOffers}
              onValueChange={() => togglePref('newOffers')}
              trackColor={{ false: colors.border, true: colors.primary + '60' }}
              thumbColor={prefs.newOffers ? colors.primary : colors.textMuted}
            />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.toggleRow}>
            <Ionicons name="chatbubble-outline" size={18} color={colors.textMuted} />
            <View style={styles.infoContent}>
              <Text style={styles.infoValue}>Messages</Text>
              <Text style={styles.infoLabel}>Push alert for new chat messages</Text>
            </View>
            <Switch
              value={prefs.messages}
              onValueChange={() => togglePref('messages')}
              trackColor={{ false: colors.border, true: colors.primary + '60' }}
              thumbColor={prefs.messages ? colors.primary : colors.textMuted}
            />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.toggleRow}>
            <Ionicons name="navigate-outline" size={18} color={colors.textMuted} />
            <View style={styles.infoContent}>
              <Text style={styles.infoValue}>Trip updates</Text>
              <Text style={styles.infoLabel}>Pickup, delivery, and status changes</Text>
            </View>
            <Switch
              value={prefs.tripUpdates}
              onValueChange={() => togglePref('tripUpdates')}
              trackColor={{ false: colors.border, true: colors.primary + '60' }}
              thumbColor={prefs.tripUpdates ? colors.primary : colors.textMuted}
            />
          </View>
        </View>

        {/* ── Driver: vehicle ── */}
        {isDriver && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Bakkie</Text>

            <TouchableOpacity
              style={styles.vehiclePhotoWrap}
              onPress={changeVehiclePhoto}
              activeOpacity={0.85}
            >
              {appUser.vehiclePhoto || appUser.vehiclePhotoPending ? (
                <>
                  <Image
                    source={{ uri: appUser.vehiclePhotoPending ?? appUser.vehiclePhoto }}
                    style={styles.vehiclePhoto}
                    resizeMode="cover"
                  />
                  {appUser.vehiclePhotoPending && (
                    <View style={styles.pendingOverlay}>
                      <Ionicons name="time-outline" size={14} color={colors.white} />
                      <Text style={styles.pendingOverlayText}>Pending approval</Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.vehiclePhotoEmpty}>
                  <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
                  <Text style={styles.vehiclePhotoEmptyText}>Add vehicle photo</Text>
                </View>
              )}
              <View style={styles.vehicleCameraBtn}>
                {uploadingVehicle
                  ? <ActivityIndicator size={12} color={colors.white} />
                  : <Ionicons name="camera" size={14} color={colors.white} />}
              </View>
            </TouchableOpacity>

            <View style={[styles.infoRow, { marginTop: 4 }]}>
              <Ionicons name="car-outline" size={18} color={colors.textMuted} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Registration</Text>
                <Text style={[styles.infoValue, !appUser.registrationNumber && styles.placeholder]}>
                  {appUser.registrationNumber ?? 'Not added'}
                </Text>
              </View>
              <View style={styles.lockBadge}>
                <Ionicons name="lock-closed-outline" size={13} color={colors.textMuted} />
              </View>
            </View>
          </View>
        )}

        {/* ── Referral ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invite friends</Text>
          <View style={styles.infoRow}>
            <Ionicons name="gift-outline" size={18} color={colors.textMuted} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Your invite code</Text>
              <Text style={styles.referralCode}>{uid.substring(0, 8).toUpperCase()}</Text>
            </View>
            <TouchableOpacity
              style={styles.shareCodeBtn}
              onPress={() => Share.share({
                message: `Join me on Move-Me — the bakkie transport app! Use my invite code ${uid.substring(0, 8).toUpperCase()} when you sign up. Download the app today.`,
                title: 'Join Move-Me',
              })}
            >
              <Ionicons name="share-outline" size={16} color={colors.primary} />
              <Text style={styles.shareCodeText}>Share</Text>
            </TouchableOpacity>
          </View>
          {(appUser.referralCount ?? 0) > 0 && (
            <>
              <View style={styles.rowDivider} />
              <View style={styles.infoRow}>
                <Ionicons name="people-outline" size={18} color={colors.textMuted} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Friends invited</Text>
                  <Text style={styles.infoValue}>{appUser.referralCount}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* ── Leaderboard ── */}
        <TouchableOpacity
          style={styles.leaderboardBtn}
          onPress={() => (nav as any).navigate('Leaderboard')}
          activeOpacity={0.8}
        >
          <Ionicons name="trophy-outline" size={18} color={colors.accent} />
          <Text style={styles.leaderboardBtnText}>View Driver Leaderboard</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.accent} />
        </TouchableOpacity>

        {/* ── Sign out ── */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        {/* ── App version footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Move-Me v{APP_VERSION}</Text>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
            <Text style={styles.footerLink}>Contact support</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <CityPickerModal
        visible={cityPickerOpen}
        selected={appUser.serviceCity ?? ''}
        onSelect={handleCitySelect}
        onClose={() => setCityPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: colors.text },

  container: { paddingBottom: 40 },

  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 16,
  },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  cameraBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: colors.surface,
  },
  heroName: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 8 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.surfaceAlt, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  roleText: { fontSize: 13, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingNum: { fontSize: 16, fontWeight: '800', color: colors.text },
  ratingTotal: { fontSize: 14, color: colors.textMuted },
  noRating: { fontSize: 14, color: colors.textMuted },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16, marginHorizontal: 16, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statDivider: {
    borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border,
  },
  statValue: { fontSize: 22, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.4 },

  // Sections
  section: {
    backgroundColor: colors.surface, borderRadius: 16,
    marginHorizontal: 16, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', color: colors.text },
  placeholder: { color: colors.textMuted, fontWeight: '400' },
  rowDivider: { height: 1, backgroundColor: colors.divider, marginLeft: 48 },

  // Tier
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  tierLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  tierSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  tierBars: { flexDirection: 'row', gap: 3 },
  tierBar: { width: 10, height: 28, borderRadius: 4 },
  tierProgress: {
    height: 6, backgroundColor: colors.border, borderRadius: 3,
    marginHorizontal: 16, marginBottom: 14, overflow: 'hidden',
  },
  tierProgressFill: { height: '100%', borderRadius: 3 },

  // Template rows
  templateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 13,
  },

  // Notification toggles
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 12,
  },

  // Vehicle
  vehiclePhotoWrap: { position: 'relative' },
  vehiclePhoto: {
    width: '100%', height: 160,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  vehiclePhotoEmpty: {
    width: '100%', height: 100,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceAlt, gap: 6,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  vehiclePhotoEmptyText: { fontSize: 13, color: colors.textMuted },
  pendingOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 6,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  pendingOverlayText: { fontSize: 12, fontWeight: '700', color: colors.white },
  vehicleCameraBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.surface,
  },
  lockBadge: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  // Referral
  referralCode: { fontSize: 20, fontWeight: '900', color: colors.primary, letterSpacing: 2 },
  shareCodeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary + '12', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  shareCodeText: { fontSize: 13, fontWeight: '700', color: colors.primary },

  // Leaderboard button
  leaderboardBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: colors.accent + '12', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: colors.accent + '30',
  },
  leaderboardBtnText: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.accent },

  // Sign out
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 4, marginBottom: 8,
    backgroundColor: colors.surface, borderRadius: 14,
    paddingVertical: 16, borderWidth: 1, borderColor: colors.danger + '40',
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: colors.danger },

  // Footer
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 16,
  },
  footerText: { fontSize: 12, color: colors.textMuted },
  footerDot: { fontSize: 12, color: colors.textMuted },
  footerLink: { fontSize: 12, color: colors.primary, fontWeight: '600' },
});
