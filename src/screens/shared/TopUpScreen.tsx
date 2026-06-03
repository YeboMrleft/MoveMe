import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { colors } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { listenToWallet, generateTopUpURL } from '../../services/walletService';

const PRESETS = [50, 100, 200, 500];
const MIN_TOPUP = 20;

type Step = 'pick' | 'webview' | 'success' | 'error';

export default function TopUpScreen() {
  const nav = useNavigation<any>();
  const { appUser } = useAuth();
  const uid = getAuth().currentUser?.uid ?? '';

  const [step, setStep] = useState<Step>('pick');
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [html, setHtml] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const prevBalance = useRef<number | null>(null);
  const handledRef = useRef(false);

  const amount = selected ?? (parseFloat(custom) || 0);

  // Watch wallet balance so we can detect when the topup is confirmed
  useEffect(() => {
    if (step !== 'webview' || !uid) return;
    return listenToWallet(uid, wallet => {
      const bal = wallet?.balance ?? 0;
      if (prevBalance.current === null) {
        prevBalance.current = bal;
        return;
      }
      if (!handledRef.current && bal > prevBalance.current) {
        handledRef.current = true;
        setStep('success');
      }
    });
  }, [step, uid]);

  const handleProceed = async () => {
    if (amount < MIN_TOPUP) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const { html: h, paymentId: pid } = await generateTopUpURL(
        uid,
        amount,
        appUser?.name,
        appUser?.email ?? getAuth().currentUser?.email ?? undefined
      );
      setHtml(h);
      setPaymentId(pid);
      setStep('webview');
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Could not open payment page.');
    } finally {
      setLoading(false);
    }
  };

  const checkUrl = (url: string) => {
    if (url.includes('/payment/cancel') || url.includes('moveme://payment/cancel')) {
      nav.goBack();
      return false;
    }
    if (url.includes('/payment/success') || url.includes('moveme://payment/success')) {
      // Don't navigate back yet — wait for wallet listener to confirm
      return false;
    }
    return true;
  };

  if (step === 'success') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={48} color={colors.white} />
          </View>
          <Text style={styles.successTitle}>Money Added!</Text>
          <Text style={styles.successSub}>
            R{amount.toFixed(2)} has been added to your wallet.
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => nav.goBack()}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'webview' && html) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => nav.goBack()}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Add Money</Text>
            <Text style={styles.headerAmount}>R{amount.toFixed(2)}</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
        <WebView
          source={{ html }}
          onShouldStartLoadWithRequest={req => checkUrl(req.url)}
          onNavigationStateChange={state => { if (state.url) checkUrl(state.url); }}
          startInLoadingState
          renderLoading={() => (
            <View style={[StyleSheet.absoluteFill, styles.webLoading]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Connecting to PayFast…</Text>
            </View>
          )}
          style={{ flex: 1 }}
        />
        <View style={styles.confirmingBanner}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.confirmingText}>Waiting for payment confirmation…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Money</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.container}>
          <Text style={styles.sectionLabel}>Choose an amount</Text>

          <View style={styles.presets}>
            {PRESETS.map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.presetBtn, selected === p && styles.presetBtnActive]}
                onPress={() => { setSelected(p); setCustom(''); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.presetBtnText, selected === p && styles.presetBtnTextActive]}>
                  R{p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Or enter custom amount</Text>
          <View style={styles.inputRow}>
            <Text style={styles.randSign}>R</Text>
            <TextInput
              style={styles.amountInput}
              value={custom}
              onChangeText={v => { setCustom(v.replace(/[^0-9]/g, '')); setSelected(null); }}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              maxLength={5}
            />
          </View>

          {errorMsg ? (
            <Text style={styles.errorText}>{errorMsg}</Text>
          ) : null}

          <View style={styles.infoBox}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} />
            <Text style={styles.infoText}>
              Payments are processed securely via PayFast. Card, EFT, and SnapScan accepted.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.proceedBtn, amount < MIN_TOPUP && styles.proceedBtnDisabled]}
            onPress={handleProceed}
            disabled={loading || amount < MIN_TOPUP}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={colors.white} />
              : (
                <>
                  <Ionicons name="card-outline" size={20} color={colors.white} />
                  <Text style={styles.proceedBtnText}>
                    {amount >= MIN_TOPUP ? `Add R${amount.toFixed(2)} to Wallet` : `Minimum R${MIN_TOPUP}`}
                  </Text>
                </>
              )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  headerCenter: { alignItems: 'center' },
  headerAmount: { fontSize: 13, color: colors.primary, fontWeight: '800' },

  container: { flex: 1, padding: 20, gap: 14 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  presetBtn: {
    flex: 1, minWidth: '45%', paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', backgroundColor: colors.surface,
    borderWidth: 2, borderColor: colors.border,
  },
  presetBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '0A' },
  presetBtnText: { fontSize: 18, fontWeight: '800', color: colors.text },
  presetBtnTextActive: { color: colors.primary },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, height: 60,
  },
  randSign: { fontSize: 22, fontWeight: '800', color: colors.primary, marginRight: 6 },
  amountInput: { flex: 1, fontSize: 32, fontWeight: '900', color: colors.text },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 12,
  },
  infoText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 16 },
  errorText: { fontSize: 13, color: colors.danger, fontWeight: '600' },

  proceedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 17, marginTop: 'auto',
  },
  proceedBtnDisabled: { backgroundColor: colors.textMuted },
  proceedBtnText: { fontSize: 16, fontWeight: '800', color: colors.white },

  webLoading: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, gap: 12 },
  loadingText: { fontSize: 14, color: colors.textSecondary },
  confirmingBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  confirmingText: { fontSize: 12, color: colors.textSecondary },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  successCircle: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  successTitle: { fontSize: 28, fontWeight: '900', color: colors.text },
  successSub: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  doneBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 48, paddingVertical: 16,
    borderRadius: 14, marginTop: 8,
  },
  doneBtnText: { fontSize: 16, fontWeight: '800', color: colors.white },
});
