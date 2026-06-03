import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { colors } from '../../constants/colors';
import { initPayment, completePayment, cancelPayment, PaymentPurpose } from '../../services/paymentService';
import { setPaymentResult } from '../../services/paymentResultStore';
import { getUser } from '../../services/userService';

type Params = {
  purpose: PaymentPurpose;
  referenceId: string;
  returnTo: string;
  extra?: Record<string, unknown>;
};

export default function PaymentScreen() {
  const nav          = useNavigation<any>();
  const { params }   = useRoute<any>();
  const { purpose, referenceId } = params as Params;

  const [html, setHtml]             = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [bypassing, setBypassing]   = useState(false);
  const paymentIdRef = useRef<string | null>(null);

  // ── TEST BYPASS — remove before production ──────────────────────────────────
  const bypassPayment = async () => {
    const pid = paymentIdRef.current;
    if (!pid) return;
    setBypassing(true);
    try {
      await completePayment(pid);
      setPaymentResult({ paymentId: pid });
      nav.goBack();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBypassing(false);
    }
  };
  const handledRef   = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const uid  = getAuth().currentUser?.uid ?? '';
        const user = await getUser(uid).catch(() => null);
        const { paymentId, html: h } = await initPayment(
          purpose,
          referenceId,
          user?.name,
          user?.email ?? getAuth().currentUser?.email ?? undefined,
        );
        paymentIdRef.current = paymentId;
        setHtml(h);
      } catch (e: any) {
        setError(e.message ?? 'Could not open payment page.');
      }
    })();
  }, []);

  const handleSuccess = async (pid: string) => {
    if (handledRef.current) return;
    handledRef.current = true;
    setProcessing(true);
    try {
      await completePayment(pid);
      setPaymentResult({ paymentId: pid });
      nav.goBack();
    } catch {
      setError('Payment confirmed but could not update record. Please contact support.');
    }
  };

  const handleCancel = async (pid: string) => {
    if (handledRef.current) return;
    handledRef.current = true;
    await cancelPayment(pid).catch(() => {});
    nav.goBack();
  };

  const checkUrl = (url: string) => {
    const pid = paymentIdRef.current ?? '';
    if (url.includes('move-me-acc55.web.app/payment/success') ||
        url.includes('moveme://payment/success')) {
      handleSuccess(pid);
      return false;
    }
    if (url.includes('move-me-acc55.web.app/payment/cancel') ||
        url.includes('moveme://payment/cancel')) {
      handleCancel(pid);
      return false;
    }
    return true;
  };

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={52} color={colors.danger} />
          <Text style={styles.errorTitle}>Payment error</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <TouchableOpacity style={styles.btn} onPress={() => nav.goBack()}>
            <Text style={styles.btnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!html || processing) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>
            {processing ? 'Verifying payment…' : 'Loading PayFast…'}
          </Text>

          {/* TEST BYPASS — remove before production */}
          {!processing && paymentIdRef.current && (
            <TouchableOpacity
              style={styles.bypassBtn}
              onPress={bypassPayment}
              disabled={bypassing}
            >
              <Text style={styles.bypassText}>
                {bypassing ? 'Processing…' : '⚡ Skip payment (test only)'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => handleCancel(paymentIdRef.current ?? '')}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Platform Fee</Text>
          <Text style={styles.headerAmount}>R10.00</Text>
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

      {/* TEST BYPASS — remove before production */}
      <TouchableOpacity style={styles.bypassOverlay} onPress={bypassPayment} disabled={bypassing}>
        <Text style={styles.bypassText}>
          {bypassing ? 'Processing…' : '⚡ Skip (test)'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerCenter: { alignItems: 'center' },
  headerTitle:  { fontSize: 15, fontWeight: '700', color: colors.text },
  headerAmount: { fontSize: 13, color: colors.primary, fontWeight: '800' },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  loadingText: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
  webLoading: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  errorSub:   { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  btn: {
    backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 13,
    borderRadius: 12, marginTop: 8,
  },
  btnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  walletBtn: {
    marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 24,
    width: '100%',
  },
  walletBtnTitle: { fontSize: 15, fontWeight: '800', color: colors.white },
  walletBtnSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  bypassBtn: {
    marginTop: 16, paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 10, borderWidth: 1.5, borderColor: colors.border,
    borderStyle: 'dashed',
  },
  bypassOverlay: {
    position: 'absolute', bottom: 16, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 18,
  },
  bypassText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
});
