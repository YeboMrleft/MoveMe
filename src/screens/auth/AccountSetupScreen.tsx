import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut, getAuth } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { createUser, applyReferralCode, registerReferralCode } from '../../services/userService';

export default function AccountSetupScreen() {
  const auth = getAuth();
  const currentUser = auth.currentUser!;

  const [role, setRole] = useState<'sender' | 'driver' | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!role) {
      Alert.alert('Select a role', 'Please choose whether you are a Sender or a Driver.');
      return;
    }
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Missing fields', 'Please enter your name and phone number.');
      return;
    }
    setLoading(true);
    try {
      await createUser(currentUser.uid, {
        name: name.trim(),
        phone: phone.trim(),
        email: currentUser.email ?? '',
        role,
        rating: 0,
        totalTrips: 0,
        createdAt: Date.now(),
      });
      await registerReferralCode(currentUser.uid);
      if (referralCode.trim()) {
        await applyReferralCode(currentUser.uid, referralCode.trim().toUpperCase());
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Complete your account</Text>
        <Text style={styles.subtitle}>
          Your profile wasn't saved during sign-up. Fill in your details to continue.
        </Text>

        <Text style={styles.label}>I am a…</Text>
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleCard, role === 'sender' && styles.roleCardActive]}
            onPress={() => setRole('sender')}
            activeOpacity={0.8}
          >
            <Ionicons name="cube-outline" size={28} color={role === 'sender' ? colors.primary : colors.textMuted} />
            <Text style={[styles.roleLabel, role === 'sender' && styles.roleLabelActive]}>Sender</Text>
            <Text style={styles.roleHint}>I need a bakkie</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleCard, role === 'driver' && styles.roleCardActive]}
            onPress={() => setRole('driver')}
            activeOpacity={0.8}
          >
            <Ionicons name="car-outline" size={28} color={role === 'driver' ? colors.primary : colors.textMuted} />
            <Text style={[styles.roleLabel, role === 'driver' && styles.roleLabelActive]}>Driver</Text>
            <Text style={styles.roleHint}>I have a bakkie</Text>
          </TouchableOpacity>
        </View>

        <Input
          label="Full Name"
          value={name}
          onChangeText={setName}
          placeholder="John Dlamini"
          autoCapitalize="words"
        />
        <Input
          label="Phone Number"
          value={phone}
          onChangeText={setPhone}
          placeholder="082 000 0000"
          keyboardType="phone-pad"
        />

        <Input
          label="Referral Code (optional)"
          value={referralCode}
          onChangeText={setReferralCode}
          placeholder="Enter a friend's invite code"
          autoCapitalize="characters"
          maxLength={8}
        />

        <Button label="Complete Setup" onPress={handleComplete} loading={loading} style={styles.mt} />

        <TouchableOpacity onPress={() => signOut(auth)} style={styles.signOutLink}>
          <Text style={styles.signOutText}>Sign out and use a different account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: 24, paddingTop: 40 },
  title: { fontSize: 28, fontWeight: '900', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 32, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 6,
    borderWidth: 2, borderColor: colors.border,
  },
  roleCardActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  roleLabel: { fontSize: 16, fontWeight: '800', color: colors.textMuted },
  roleLabelActive: { color: colors.primary },
  roleHint: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  mt: { marginTop: 8 },
  signOutLink: { alignItems: 'center', marginTop: 24 },
  signOutText: { color: colors.danger, fontSize: 13 },
});
