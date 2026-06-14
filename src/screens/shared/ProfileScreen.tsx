import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Switch,
  Alert, ScrollView, ActivityIndicator, Linking, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing, radius, shadows } from '../../constants/spacing';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import Avatar from '../../components/Avatar';
import StarRating from '../../components/StarRating';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import CityPickerModal from '../../components/CityPickerModal';
import { updateUser, deleteJobTemplate } from '../../services/userService';
import { Share } from 'react-native';
import { uploadPhoto } from '../../services/storageService';
import { getAuth } from 'firebase/auth';
import TierBadge from '../../components/TierBadge';
import { getDriverTier, getNextTier, TIER_DEFS } from '../../utils/driverTier';
import { listenToWallet } from '../../services/walletService';

const SA_BANKS = [
  'Absa', 'Capitec', 'FNB', 'Nedbank', 'Standard Bank',
  'TymeBank', 'African Bank', 'Bidvest', 'Discovery Bank', 'Investec',
];

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
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [bankForm, setBankForm] = useState({
    bank: appUser?.bankDetails?.bank ?? '',
    accountHolder: appUser?.bankDetails?.accountHolder ?? '',
    accountNumber: appUser?.bankDetails?.accountNumber ?? '',
    accountType: (appUser?.bankDetails?.accountType ?? 'cheque') as 'cheque' | 'savings',
  });
  const [savingBank, setSavingBank] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const uid = getAuth().currentUser?.uid ?? '';

  useEffect(() => {
    if (!uid) return;
    return listenToWallet(uid, w => setWalletBalance(w?.balance ?? null));
  }, [uid]);

  if (!appUser) return null;
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

  const handleSaveBank = async () => {
    if (!bankForm.bank || !bankForm.accountHolder.trim() || !bankForm.accountNumber.trim()) {
      Alert.alert('Required fields', 'Please fill in all bank details.');
      return;
    }
    setSavingBank(true);
    try {
      await updateUser(uid, { bankDetails: bankForm });
      setBankModalOpen(false);
      Alert.alert('Saved', 'Your payout details have been saved.');
    } catch {
      Alert.alert('Error', 'Could not save bank details. Please try again.');
    } finally {
      setSavingBank(false);
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
        <TouchableOpacity
          onPress={() => (nav as any).navigate('Wallet')}
          style={styles.walletHeaderBtn}
        >
          <Ionicons name="wallet-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <Card variant="outlined" padding={0} style={styles.heroCard}>
          <View style={styles.hero}>
            <TouchableOpacity onPress={pickProfilePhoto} activeOpacity={0.85} style={styles.avatarWrap}>
              <Avatar name={appUser.name} uri={appUser.profilePhoto} size="xl" />
              <View style={styles.cameraBadge}>
                {uploadingPhoto
                  ? <ActivityIndicator size={12} color={colors.white} />
                  : <Ionicons name="camera" size={14} color={colors.white} />}
              </View>
            </TouchableOpacity>

            <Text style={styles.heroName}>{appUser.name}</Text>

            <View style={styles.heroMeta}>
              <Badge
                variant={isDriver ? 'default' : 'info'}
                size="sm"
              >
                <Ionicons
                  name={isDriver ? 'car' : 'cube'}
                  size={11}
                  color={colors.white}
                />
                <Text style={styles.badgeText}>
                  {isDriver ? 'Driver' : 'Sender'}
                </Text>
              </Badge>
              {driverTier && <TierBadge tier={driverTier} size="md" />}
            </View>

            {appUser.rating > 0 ? (
              <View style={styles.ratingSection}>
                <View style={styles.ratingRow}>
                  <StarRating value={Math.round(appUser.rating)} size="md" />
                  <Text style={styles.ratingNum}>{appUser.rating.toFixed(1)}</Text>
                </View>
                <Text style={styles.ratingMeta}>{appUser.totalTrips ?? 0} trip{appUser.totalTrips !== 1 ? 's' : ''}</Text>
              </View>
            ) : (
              <Text style={styles.noRating}>No ratings yet</Text>
            )}
          </View>
        </Card>

        {/* ── Stats ── */}
        <View style={styles.statsGrid}>
          <Card variant="outlined" padding={4} style={styles.statCard}>
            <Text style={styles.statValue}>{appUser.totalTrips ?? 0}</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </Card>
          <Card variant="outlined" padding={4} style={styles.statCard}>
            <Text style={styles.statValue}>{appUser.rating > 0 ? appUser.rating.toFixed(1) : '—'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </Card>
          <Card variant="outlined" padding={4} style={styles.statCard}>
            {isDriver ? (
              <>
                <Text style={styles.statValue}>
                  R{Math.round((appUser.totalEarned ?? 0) / 1000)}k
                </Text>
                <Text style={styles.statLabel}>Earned</Text>
              </>
            ) : (
              <>
                <Text style={[styles.statValue, { fontSize: 18 }]}>📦</Text>
                <Text style={styles.statLabel}>Sender</Text>
              </>
            )}
          </Card>
        </View>

        {/* ── Account info ── */}
        <Card variant="outlined" padding={0} style={styles.section}>
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
        </Card>

        {/* ── Driver: service city ── */}
        {isDriver && (
          <Card variant="outlined" padding={0} style={styles.section}>
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
          </Card>
        )}

        {/* ── Driver: tier progress ── */}
        {isDriver && driverTier && (
          <Card variant="outlined" padding={0} style={styles.section}>
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
          <Card variant="outlined" padding={0} style={styles.section}>
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
        <Card variant="outlined" padding={0} style={styles.section}>
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
          <Card variant="outlined" padding={0} style={styles.section}>
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

        {/* ── Driver: payout details ── */}
        {isDriver && (
          <Card variant="outlined" padding={0} style={styles.section}>
            <Text style={styles.sectionTitle}>Payout Details</Text>
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => {
                setBankForm({
                  bank: appUser.bankDetails?.bank ?? '',
                  accountHolder: appUser.bankDetails?.accountHolder ?? '',
                  accountNumber: appUser.bankDetails?.accountNumber ?? '',
                  accountType: appUser.bankDetails?.accountType ?? 'cheque',
                });
                setBankModalOpen(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="card-outline" size={18} color={colors.textMuted} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Bank account</Text>
                {appUser.bankDetails?.bank ? (
                  <Text style={styles.infoValue}>
                    {appUser.bankDetails.bank} · ****{appUser.bankDetails.accountNumber.slice(-4)}
                  </Text>
                ) : (
                  <Text style={[styles.infoValue, styles.placeholder]}>Tap to add</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.border} />
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <View style={[styles.infoRow, { paddingVertical: 10 }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.infoLabel, { flex: 1, lineHeight: 16 }]}>
                Your bank details are stored securely and will be used for future automated payouts.
              </Text>
            </View>
          </View>
        )}

        {/* ── Referral ── */}
        <Card variant="outlined" padding={0} style={styles.section}>
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

      {/* Bank details modal */}
      <Modal visible={bankModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setBankModalOpen(false)}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setBankModalOpen(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Payout Details</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.bankFieldLabel}>Bank</Text>
            <TouchableOpacity style={styles.bankPickerBtn} onPress={() => setBankPickerOpen(v => !v)} activeOpacity={0.8}>
              <Text style={[styles.bankPickerText, !bankForm.bank && styles.placeholder]}>
                {bankForm.bank || 'Select your bank'}
              </Text>
              <Ionicons name={bankPickerOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
            </TouchableOpacity>
            {bankPickerOpen && (
              <View style={styles.bankList}>
                {SA_BANKS.map(b => (
                  <TouchableOpacity
                    key={b}
                    style={[styles.bankListItem, bankForm.bank === b && styles.bankListItemActive]}
                    onPress={() => { setBankForm(f => ({ ...f, bank: b })); setBankPickerOpen(false); }}
                  >
                    <Text style={[styles.bankListItemText, bankForm.bank === b && { color: colors.primary }]}>{b}</Text>
                    {bankForm.bank === b && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.bankFieldLabel}>Account holder name</Text>
            <TextInput
              style={styles.bankInput}
              value={bankForm.accountHolder}
              onChangeText={v => setBankForm(f => ({ ...f, accountHolder: v }))}
              placeholder="Full name as on bank card"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.bankFieldLabel}>Account number</Text>
            <TextInput
              style={styles.bankInput}
              value={bankForm.accountNumber}
              onChangeText={v => setBankForm(f => ({ ...f, accountNumber: v.replace(/\D/g, '') }))}
              placeholder="Enter account number"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.bankFieldLabel}>Account type</Text>
            <View style={styles.accountTypeRow}>
              {(['cheque', 'savings'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.accountTypeBtn, bankForm.accountType === t && styles.accountTypeBtnActive]}
                  onPress={() => setBankForm(f => ({ ...f, accountType: t }))}
                >
                  <Text style={[styles.accountTypeBtnText, bankForm.accountType === t && { color: colors.primary }]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBankBtn} onPress={handleSaveBank} disabled={savingBank} activeOpacity={0.85}>
              {savingBank
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.saveBankBtnText}>Save Details</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    shadowColor: colors.shadowSm,
    shadowOpacity: 1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  walletHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '08',
    alignItems: 'center',
    justifyContent: 'center',
  },

  container: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[8],
  },

  // Hero Card
  heroCard: {
    marginHorizontal: 0,
  },
  hero: {
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[4],
  },
  avatarWrap: {
    position: 'relative',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: spacing[1],
    right: spacing[1],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: colors.surface,
  },
  heroName: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  ratingSection: {
    alignItems: 'center',
    gap: spacing[1],
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  ratingNum: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  ratingMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  noRating: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    marginHorizontal: 0,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // Sections
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  infoContent: {
    flex: 1,
    gap: spacing[1],
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  placeholder: {
    color: colors.textMuted,
    fontWeight: '400',
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: spacing[12],
  },

  // Tier
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  tierLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  tierSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing[1],
  },
  tierBars: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  tierBar: {
    width: 10,
    height: 24,
    borderRadius: radius.sm,
  },
  tierProgress: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: radius.sm,
    marginHorizontal: spacing[4],
    marginVertical: spacing[3],
    overflow: 'hidden',
  },
  tierProgressFill: {
    height: '100%',
    borderRadius: radius.sm,
  },

  // Template rows
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },

  // Notification toggles
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },

  // Vehicle
  vehiclePhotoWrap: {
    position: 'relative',
  },
  vehiclePhoto: {
    width: '100%',
    height: 160,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  vehiclePhotoEmpty: {
    width: '100%',
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    gap: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  vehiclePhotoEmptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  pendingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pendingOverlayText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  vehicleCameraBtn: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  lockBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Referral
  referralCode: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 2,
  },
  shareCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary + '12',
    borderRadius: radius.md,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  shareCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  // Leaderboard button
  leaderboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.accent + '08',
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderWidth: 1,
    borderColor: colors.accent + '25',
  },
  leaderboardBtnText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.accent,
  },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing[4],
    borderWidth: 1,
    borderColor: colors.error + '25',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.error,
  },

  // Bank modal
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  modalBody: {
    padding: spacing[4],
    gap: spacing[1],
    paddingBottom: spacing[8],
  },
  bankFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  bankInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: 15,
    color: colors.text,
  },
  bankPickerBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bankPickerText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  bankList: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: spacing[2],
  },
  bankListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  bankListItemActive: {
    backgroundColor: colors.primary + '0A',
  },
  bankListItemText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  accountTypeRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  accountTypeBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountTypeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '0A',
  },
  accountTypeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  saveBankBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
    marginTop: spacing[6],
  },
  saveBankBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[4],
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  footerDot: {
    fontSize: 12,
    color: colors.textMuted,
  },
  footerLink: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
});
