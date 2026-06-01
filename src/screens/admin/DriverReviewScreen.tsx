import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { getUser } from '../../services/userService';
import { approveDriver, rejectDriver, approveVehiclePhoto, rejectVehiclePhoto } from '../../services/adminService';
import { User } from '../../types';
import Button from '../../components/Button';
import { AdminStackParams } from '../../navigation/AdminNavigator';

type Nav = StackNavigationProp<AdminStackParams, 'DriverReview'>;
type Route = RouteProp<AdminStackParams, 'DriverReview'>;

function PhotoCard({ label, uri }: { label: string; uri?: string }) {
  return (
    <View style={styles.photoCard}>
      <Text style={styles.photoLabel}>{label}</Text>
      {uri ? (
        <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
      ) : (
        <View style={[styles.photo, styles.noPhoto]}>
          <Ionicons name="image-outline" size={32} color={colors.textMuted} />
          <Text style={styles.noPhotoText}>Not uploaded</Text>
        </View>
      )}
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={16} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value ?? '—'}</Text>
      </View>
    </View>
  );
}

export default function DriverReviewScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { driverId } = params;

  const [driver, setDriver] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);

  useEffect(() => {
    getUser(driverId).then(u => { setDriver(u); setLoading(false); });
  }, [driverId]);

  const handleApprove = () => {
    Alert.alert(
      'Approve driver?',
      `${driver?.name} will be marked as verified and can go online immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setActioning(true);
            await approveDriver(driverId);
            setActioning(false);
            Alert.alert('Approved', `${driver?.name} is now verified.`, [
              { text: 'OK', onPress: () => nav.goBack() },
            ]);
          },
        },
      ]
    );
  };

  const handleReject = () => {
    Alert.alert(
      'Reject driver?',
      'Select a reason to send to the driver.',
      [
        {
          text: 'ID unclear / unreadable',
          onPress: () => confirmReject('Your ID document photo was unclear. Please resubmit with a clearer photo.'),
        },
        {
          text: 'Face does not match ID',
          onPress: () => confirmReject('Your selfie does not match the ID document provided.'),
        },
        {
          text: "Licence / disc / plate unclear",
          onPress: () => confirmReject('One or more of your vehicle documents were unclear. Please resubmit clearer photos.'),
        },
        {
          text: 'Vehicle photos insufficient',
          onPress: () => confirmReject('Your bakkie photos were unclear or incomplete. Please submit all 4 angles clearly.'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const confirmReject = async (reason: string) => {
    setActioning(true);
    await rejectDriver(driverId, reason);
    setActioning(false);
    Alert.alert('Rejected', `${driver?.name} has been notified.`, [
      { text: 'OK', onPress: () => nav.goBack() },
    ]);
  };

  if (loading || !driver) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Review</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Identity photos */}
        <Text style={styles.sectionTitle}>Identity</Text>
        <View style={styles.photosRow}>
          <PhotoCard label="Selfie" uri={driver.selfiePhoto} />
          <PhotoCard label="SA ID Document" uri={driver.idDocumentPhoto} />
        </View>

        {/* Driver's licence */}
        <Text style={styles.sectionTitle}>Driver's Licence</Text>
        <View style={styles.photosRow}>
          <PhotoCard label="Licence" uri={driver.licencePhotoUrl} />
          <View style={{ flex: 1 }} />
        </View>

        {/* Vehicle documents */}
        <Text style={styles.sectionTitle}>Vehicle Documents</Text>
        <View style={styles.photosRow}>
          <PhotoCard label="Licence Disc" uri={driver.vehicleDiscPhotoUrl} />
          <PhotoCard label="Number Plate" uri={driver.vehiclePlatePhotoUrl} />
        </View>

        {/* Bakkie photos — 4 angles */}
        <Text style={styles.sectionTitle}>Bakkie Photos</Text>
        <View style={styles.photosRow}>
          <PhotoCard label="Front" uri={driver.vehicleFrontPhotoUrl} />
          <PhotoCard label="Back" uri={driver.vehicleBackPhotoUrl} />
        </View>
        <View style={[styles.photosRow, { marginTop: 8 }]}>
          <PhotoCard label="Left" uri={driver.vehicleLeftPhotoUrl} />
          <PhotoCard label="Right" uri={driver.vehicleRightPhotoUrl} />
        </View>

        {/* Pending vehicle photo change */}
        {driver.vehiclePhotoPending && (
          <>
            <Text style={styles.sectionTitle}>Pending Vehicle Photo Change</Text>
            <Image source={{ uri: driver.vehiclePhotoPending }} style={styles.vehiclePhoto} resizeMode="cover" />
          </>
        )}

        {/* Driver details */}
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.detailsCard}>
          <InfoRow icon="person-outline" label="Full Name" value={driver.name} />
          <View style={styles.divider} />
          <InfoRow icon="call-outline" label="Phone" value={driver.phone} />
          <View style={styles.divider} />
          <InfoRow icon="mail-outline" label="Email" value={driver.email} />
          <View style={styles.divider} />
          <InfoRow icon="card-outline" label="SA ID Number" value={driver.idNumber} />
          <View style={styles.divider} />
          <InfoRow icon="car-outline" label="Registration" value={driver.registrationNumber} />
          <View style={styles.divider} />
          <InfoRow
            icon="calendar-outline"
            label="Submitted"
            value={new Date(driver.createdAt).toLocaleString('en-ZA')}
          />
        </View>

        {/* Checklist */}
        <Text style={styles.sectionTitle}>Verification Checklist</Text>
        <View style={styles.checklistCard}>
          {[
            'Selfie is clear — face fully visible',
            'SA ID document legible — not expired',
            'Face in selfie matches ID document',
            'ID number matches the document',
            "Driver's licence is valid and legible",
            'Vehicle disc is current and visible',
            'Number plate is legible and matches registration',
            'All 4 bakkie photos are clear',
          ].map((item, i) => (
            <View key={i} style={styles.checkRow}>
              <Ionicons name="checkbox-outline" size={18} color={colors.primary} />
              <Text style={styles.checkText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Vehicle photo change approval */}
        {driver.vehiclePhotoPending && (
          <>
            <Text style={styles.sectionTitle}>Vehicle Photo Change</Text>
            <View style={styles.actions}>
              <Button
                label="Approve photo change"
                onPress={async () => {
                  setActioning(true);
                  await approveVehiclePhoto(driverId, driver.vehiclePhotoPending!);
                  setActioning(false);
                  Alert.alert('Approved', 'Vehicle photo updated.', [{ text: 'OK', onPress: () => nav.goBack() }]);
                }}
                loading={actioning}
              />
              <Button
                label="Reject photo change"
                onPress={async () => {
                  setActioning(true);
                  await rejectVehiclePhoto(driverId);
                  setActioning(false);
                  Alert.alert('Rejected', 'Pending photo removed.', [{ text: 'OK', onPress: () => nav.goBack() }]);
                }}
                variant="danger"
                disabled={actioning}
              />
            </View>
          </>
        )}

        {/* Actions */}
        {driver.verificationStatus === 'pending' && (
          <View style={styles.actions}>
            <Button
              label="Approve Driver"
              onPress={handleApprove}
              loading={actioning}
              style={styles.approveBtn}
            />
            <Button
              label="Reject"
              onPress={handleReject}
              variant="danger"
              disabled={actioning}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  container: { padding: 20, gap: 12 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8,
  },
  photosRow: { flexDirection: 'row', gap: 12 },
  photoCard: { flex: 1 },
  photoLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
  photo: { width: '100%', aspectRatio: 0.75, borderRadius: 12, backgroundColor: colors.border },
  noPhoto: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  noPhotoText: { fontSize: 11, color: colors.textMuted },
  vehiclePhoto: {
    width: '100%', height: 180, borderRadius: 12,
    backgroundColor: colors.border,
  },
  detailsCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValue: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.divider, marginHorizontal: 14 },
  checklistCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border, gap: 12,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkText: { flex: 1, fontSize: 14, color: colors.text },
  actions: { gap: 10, marginTop: 8, paddingBottom: 32 },
  approveBtn: {},
});
