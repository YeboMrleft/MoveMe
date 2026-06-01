import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { getAuth } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { updateUser } from '../../services/userService';
import { uploadPhoto } from '../../services/storageService';
import Button from '../../components/Button';
import Input from '../../components/Input';

interface Props { onDone?: () => void; }

export default function SenderVerifyScreen({ onDone }: Props) {
  const [selfie, setSelfie]       = useState<string | null>(null);
  const [idNumber, setIdNumber]   = useState('');
  const [phone, setPhone]         = useState('');
  const [address, setAddress]     = useState('');
  const [agreed, setAgreed]       = useState(false);
  const [loading, setLoading]     = useState(false);

  const pickSelfie = () => {
    Alert.alert('Selfie', 'Choose a source', [
      {
        text: 'Take Photo', onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') return;
          const r = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
          });
          if (!r.canceled) setSelfie(r.assets[0].uri);
        },
      },
      {
        text: 'Choose from Library', onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') return;
          const r = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
          });
          if (!r.canceled) setSelfie(r.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    if (!selfie)                   { Alert.alert('Selfie required', 'Take a clear selfie so we can verify your identity.'); return; }
    if (idNumber.replace(/\s/g, '').length < 13) {
      Alert.alert('Invalid ID number', 'Please enter your full 13-digit SA ID number.');
      return;
    }
    if (!phone.trim())             { Alert.alert('Phone required', 'Please enter your phone number.'); return; }
    if (!address.trim())           { Alert.alert('Address required', 'Please enter your residential address.'); return; }
    if (!agreed)                   { Alert.alert('Agreement required', 'Please agree to the Terms of Service and Privacy Policy.'); return; }

    setLoading(true);
    try {
      const uid = getAuth().currentUser?.uid;
      if (!uid) return;

      const selfieUrl = await uploadPhoto(selfie, `senders/${uid}/selfie.jpg`);

      await updateUser(uid, {
        selfiePhoto:        selfieUrl,
        profilePhoto:       selfieUrl,
        idNumber:           idNumber.replace(/\s/g, ''),
        phone:              phone.trim(),
        residentialAddress: address.trim(),
        profileComplete:    true,
        agreedToTerms:      true,
        agreedAt:           new Date().toISOString(),
      });

      onDone?.();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={36} color={colors.primary} />
          <Text style={styles.title}>Verify your identity</Text>
          <Text style={styles.subtitle}>
            Move-Me requires all users to verify their identity before posting jobs.
            This protects drivers and keeps our community safe.
          </Text>
        </View>

        {/* Why we need this */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.info} />
          <Text style={styles.infoText}>
            Your information is stored securely and only accessed by our team in the event of a dispute,
            reported incident, or legal requirement. We never share your data with third parties.
          </Text>
        </View>

        {/* Selfie */}
        <Text style={styles.sectionLabel}>Step 1 — Selfie</Text>
        <Text style={styles.sectionDesc}>Take a clear photo of your face. This helps us confirm you are who you say you are.</Text>
        <TouchableOpacity style={styles.selfieBox} onPress={pickSelfie} activeOpacity={0.8}>
          {selfie ? (
            <>
              <Image source={{ uri: selfie }} style={styles.selfieFill} />
              <View style={styles.selfieEdit}>
                <Ionicons name="camera" size={20} color="#fff" />
              </View>
            </>
          ) : (
            <View style={styles.selfiePlaceholder}>
              <Ionicons name="person-circle-outline" size={56} color={colors.textMuted} />
              <Text style={styles.selfieLabel}>Tap to take selfie</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ID number */}
        <Text style={styles.sectionLabel}>Step 2 — SA ID Number</Text>
        <Text style={styles.sectionDesc}>Enter your 13-digit South African ID number exactly as on your ID document.</Text>
        <Input
          label="SA ID Number"
          value={idNumber}
          onChangeText={setIdNumber}
          placeholder="0001015030083"
          keyboardType="numeric"
          maxLength={13}
        />

        {/* Contact info */}
        <Text style={styles.sectionLabel}>Step 3 — Contact Details</Text>
        <Input
          label="Phone Number"
          value={phone}
          onChangeText={setPhone}
          placeholder="+27 81 234 5678"
          keyboardType="phone-pad"
        />
        <Input
          label="Residential Address"
          value={address}
          onChangeText={setAddress}
          placeholder="123 Main Street, Cape Town, 8001"
          autoCapitalize="words"
        />

        {/* Agreement */}
        <TouchableOpacity style={styles.agreeRow} onPress={() => setAgreed(v => !v)} activeOpacity={0.8}>
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={styles.agreeText}>
            I agree to the{' '}
            <Text style={styles.link}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.link}>Privacy Policy</Text>
            . I confirm that the information I have provided is accurate and I am over 18 years old.
          </Text>
        </TouchableOpacity>

        {loading && (
          <View style={styles.uploadRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.uploadText}>Saving your profile…</Text>
          </View>
        )}

        <Button label="Complete Profile & Continue" onPress={handleSubmit} loading={loading} style={styles.mt} />

        <TouchableOpacity onPress={() => getAuth().signOut()} style={styles.signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.background },
  container:  { padding: 24, paddingTop: 32 },
  header:     { alignItems: 'center', marginBottom: 24 },
  title:      { fontSize: 24, fontWeight: '900', color: colors.text, marginTop: 12, textAlign: 'center' },
  subtitle:   { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginTop: 8, maxWidth: 320 },
  infoBox:    {
    flexDirection: 'row', gap: 10, backgroundColor: '#EEF5FF',
    borderRadius: 12, padding: 14, marginBottom: 28, alignItems: 'flex-start',
  },
  infoText:   { flex: 1, fontSize: 12, color: colors.info, lineHeight: 17 },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 4 },
  sectionDesc:  { fontSize: 13, color: colors.textSecondary, marginBottom: 14, lineHeight: 18 },
  selfieBox:  {
    width: 140, height: 140, borderRadius: 70,
    alignSelf: 'center', overflow: 'hidden',
    borderWidth: 3, borderColor: colors.border, borderStyle: 'dashed',
    marginBottom: 24,
  },
  selfieFill:        { width: '100%', height: '100%' },
  selfiePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, gap: 6 },
  selfieLabel:       { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  selfieEdit:        {
    position: 'absolute', bottom: 6, right: 6,
    backgroundColor: colors.primary, borderRadius: 14,
    width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
  },
  agreeRow:   { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 8, marginBottom: 8 },
  checkbox:   {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', flex: 0,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  agreeText:  { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  link:       { color: colors.primary, fontWeight: '600' },
  uploadRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  uploadText: { fontSize: 13, color: colors.textSecondary },
  mt:         { marginTop: 8, marginBottom: 16 },
  signOut:    { alignItems: 'center', paddingVertical: 12 },
  signOutText: { color: colors.textMuted, fontSize: 13 },
});
