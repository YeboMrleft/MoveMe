import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { colors } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { listenToWallet, requestWithdrawal } from '../../services/walletService';

const MIN_WITHDRAWAL = 50;
const PROCESSING_DAYS = '2 business days';

export default function WithdrawalScreen() {
  const nav = useNavigation<any>();
  const { appUser } = useAuth();
  const uid = getAuth().currentUser?.uid ?? '';

  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!uid) return;
    return listenToWallet(uid, w => setBalance(w?.balance ?? 0));
  }, [uid]);

  const bankDetails = appUser?.bankDetails;
  const parsed = parseFloat(amount) || 0;
  const canSubmit = parsed >= MIN_WITHDRAWAL && parsed <= balance && !!bankDetails;

  const handleSubmit = () => {
    if (!canSubmit || !bankDetails) return;
    Alert.alert(
      'Confirm withdrawal',
      `Withdraw R${parsed.toFixed(2)} to your ${bankDetails.bank} account ending in ****${bankDetails.accountNumber.slice(-4)}?\n\nProcessed within ${PROCESSING_DAYS}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          onPress: async () => {
            setSubmitting(true);
            try {
              await requestWithdrawal(uid, appUser?.name ?? '', parsed, bankDetails);
              Alert.alert(
                'Withdrawal requested',
                `R${parsed.toFixed(2)} will be transferred to your ${bankDetails.bank} account within ${PROCESSING_DAYS}.`,
                [{ text: 'OK', onPress: () => nav.goBack() }]
              );
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Could not submit withdrawal. Please try again.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Withdrawal</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Balance info */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available to withdraw</Text>
          <Text style={styles.balanceValue}>
            R{balance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
          </Text>
        </View>

        {/* Amount input */}
        <Text style={styles.fieldLabel}>Withdrawal amount</Text>
        <View style={styles.inputRow}>
          <Text style={styles.randSign}>R</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={v => setAmount(v.replace(/[^0-9.]/g, ''))}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity onPress={() => setAmount(balance.toFixed(2))} style={styles.maxBtn}>
            <Text style={styles.maxBtnText}>MAX</Text>
          </TouchableOpacity>
        </View>
        {parsed > 0 && parsed < MIN_WITHDRAWAL && (
          <Text style={styles.hint}>Minimum withdrawal is R{MIN_WITHDRAWAL}</Text>
        )}
        {parsed > balance && (
          <Text style={styles.hint}>Amount exceeds available balance</Text>
        )}

        {/* Bank details */}
        <Text style={styles.fieldLabel}>Pay to</Text>
        {bankDetails ? (
          <View style={styles.bankCard}>
            <View style={styles.bankRow}>
              <Ionicons name="card-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.bankName}>{bankDetails.bank}</Text>
                <Text style={styles.bankSub}>
                  {bankDetails.accountHolder} · ****{bankDetails.accountNumber.slice(-4)} · {bankDetails.accountType}
                </Text>
              </View>
              <TouchableOpacity onPress={() => nav.goBack()}>
                <Text style={styles.changeLink}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.noBankCard}
            onPress={() => {
              Alert.alert(
                'No bank details',
                'Please add your bank account in Profile before requesting a withdrawal.',
                [{ text: 'OK', onPress: () => nav.goBack() }]
              );
            }}
          >
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
            <Text style={styles.noBankText}>No bank account added. Tap to go back and add one in Profile.</Text>
          </TouchableOpacity>
        )}

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="time-outline" size={16} color={colors.textMuted} />
          <Text style={styles.infoText}>
            Withdrawals are processed manually within {PROCESSING_DAYS}. You'll receive a notification when it's done.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color={colors.white} />
            : (
              <>
                <Ionicons name="arrow-up-circle-outline" size={20} color={colors.white} />
                <Text style={styles.submitBtnText}>
                  {canSubmit ? `Withdraw R${parsed.toFixed(2)}` : 'Enter an amount'}
                </Text>
              </>
            )}
        </TouchableOpacity>
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
  container: { padding: 20, gap: 12, paddingBottom: 40 },

  balanceCard: {
    backgroundColor: colors.primary, borderRadius: 16, padding: 20, alignItems: 'center',
  },
  balanceLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  balanceValue: { fontSize: 36, fontWeight: '900', color: '#fff', marginTop: 4 },

  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, height: 60,
  },
  randSign: { fontSize: 22, fontWeight: '800', color: colors.primary, marginRight: 6 },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '900', color: colors.text },
  maxBtn: {
    backgroundColor: colors.primary + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  maxBtnText: { fontSize: 12, fontWeight: '800', color: colors.primary },
  hint: { fontSize: 12, color: colors.danger, fontWeight: '600', marginTop: -4 },

  bankCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  bankRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bankName: { fontSize: 15, fontWeight: '700', color: colors.text },
  bankSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  changeLink: { fontSize: 13, fontWeight: '700', color: colors.primary },

  noBankCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.danger + '10', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.danger + '30',
  },
  noBankText: { flex: 1, fontSize: 13, color: colors.danger, lineHeight: 18 },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 12,
  },
  infoText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 16 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 17, marginTop: 8,
  },
  submitBtnDisabled: { backgroundColor: colors.textMuted },
  submitBtnText: { fontSize: 16, fontWeight: '800', color: colors.white },
});
