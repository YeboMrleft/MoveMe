import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { colors } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { listenToWallet, listenToWalletTransactions, WalletData } from '../../services/walletService';
import { WalletTransaction } from '../../types';

const TX_ICON: Record<string, { icon: string; color: string }> = {
  topup:        { icon: 'arrow-down-circle', color: colors.primary },
  job_payment:  { icon: 'cube-outline',      color: '#E03C31' },
  job_earning:  { icon: 'car',               color: colors.primary },
  platform_fee: { icon: 'storefront-outline', color: '#F59E0B' },
  withdrawal:   { icon: 'arrow-up-circle',   color: '#E03C31' },
  refund:       { icon: 'return-up-back',    color: colors.primary },
};

const TX_LABEL: Record<string, string> = {
  topup:        'Wallet top-up',
  job_payment:  'Job payment',
  job_earning:  'Trip earnings',
  platform_fee: 'Platform fee',
  withdrawal:   'Withdrawal',
  refund:       'Refund',
};

function fmtDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: '2-digit' });
}

export default function WalletScreen() {
  const nav = useNavigation<any>();
  const { appUser } = useAuth();
  const uid = getAuth().currentUser?.uid ?? '';
  const isDriver = appUser?.role === 'driver';

  const [wallet, setWallet] = useState<WalletData | null | 'loading'>('loading');
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);

  useEffect(() => {
    if (!uid) return;
    const unsub1 = listenToWallet(uid, setWallet);
    const unsub2 = listenToWalletTransactions(uid, setTransactions);
    return () => { unsub1(); unsub2(); };
  }, [uid]);

  const balance = wallet && wallet !== 'loading' ? wallet.balance ?? 0 : 0;
  const loading = wallet === 'loading';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          {loading ? (
            <ActivityIndicator color={colors.white} size="large" style={{ marginVertical: 12 }} />
          ) : (
            <Text style={styles.balanceValue}>
              R {balance.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          )}
          <Text style={styles.balanceCurrency}>South African Rand · ZAR</Text>

          <View style={styles.balanceActions}>
            <TouchableOpacity
              style={styles.balanceBtn}
              onPress={() => nav.navigate('TopUp')}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.balanceBtnText}>Add Money</Text>
            </TouchableOpacity>

            {isDriver && (
              <TouchableOpacity
                style={[styles.balanceBtn, balance < 50 && styles.balanceBtnDisabled]}
                onPress={() => balance >= 50 && nav.navigate('Withdrawal')}
                activeOpacity={balance >= 50 ? 0.85 : 1}
              >
                <Ionicons
                  name="arrow-up-circle-outline"
                  size={20}
                  color={balance >= 50 ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.balanceBtnText, balance < 50 && { color: colors.textMuted }]}>
                  Withdraw
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {isDriver && balance < 50 && balance > 0 && (
            <Text style={styles.minWithdrawNote}>Minimum withdrawal is R50</Text>
          )}
        </View>

        {/* How it works */}
        <View style={styles.howCard}>
          <Text style={styles.howTitle}>How it works</Text>
          <View style={styles.howRow}>
            <View style={[styles.howDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.howText}>
              {isDriver
                ? 'Earn money on completed trips — it lands here automatically'
                : 'Add money and use it to pay drivers without cash'}
            </Text>
          </View>
          <View style={styles.howRow}>
            <View style={[styles.howDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.howText}>
              Pay the Move-Me platform fee (R10) from your wallet instead of card
            </Text>
          </View>
          {isDriver && (
            <View style={styles.howRow}>
              <View style={[styles.howDot, { backgroundColor: '#E03C31' }]} />
              <Text style={styles.howText}>
                Request a withdrawal to your bank account (min R50, processed within 2 business days)
              </Text>
            </View>
          )}
        </View>

        {/* Transaction history */}
        <Text style={styles.sectionTitle}>Transaction History</Text>

        {transactions.length === 0 ? (
          <View style={styles.emptyTx}>
            <Ionicons name="receipt-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTxText}>No transactions yet</Text>
            <Text style={styles.emptyTxSub}>Add money to get started</Text>
          </View>
        ) : (
          <View style={styles.txList}>
            {transactions.map((tx, i) => {
              const meta = TX_ICON[tx.type] ?? { icon: 'ellipse', color: colors.textMuted };
              const isCredit = tx.amount > 0;
              return (
                <View key={tx.id}>
                  {i > 0 && <View style={styles.txDivider} />}
                  <View style={styles.txRow}>
                    <View style={[styles.txIcon, { backgroundColor: meta.color + '15' }]}>
                      <Ionicons name={meta.icon as any} size={20} color={meta.color} />
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txLabel}>{TX_LABEL[tx.type] ?? tx.type}</Text>
                      <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                      <Text style={styles.txDate}>{fmtDate(tx.createdAt)}</Text>
                    </View>
                    <Text style={[styles.txAmount, { color: isCredit ? colors.primary : '#E03C31' }]}>
                      {isCredit ? '+' : ''}R{Math.abs(tx.amount).toFixed(2)}
                    </Text>
                  </View>
                </View>
              );
            })}
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
  container: { padding: 20, gap: 16, paddingBottom: 40 },

  balanceCard: {
    backgroundColor: colors.primary, borderRadius: 20, padding: 24,
    alignItems: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  balanceLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5 },
  balanceValue: {
    fontSize: 48, fontWeight: '900', color: '#fff', marginVertical: 8, letterSpacing: -1,
  },
  balanceCurrency: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 20 },
  balanceActions: { flexDirection: 'row', gap: 12, width: '100%' },
  balanceBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 14, paddingVertical: 13,
  },
  balanceBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.4)' },
  balanceBtnText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  minWithdrawNote: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 8 },

  howCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border, gap: 10,
  },
  howTitle: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 4 },
  howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  howDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
  howText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  emptyTx: {
    alignItems: 'center', paddingVertical: 40, gap: 8,
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  emptyTxText: { fontSize: 16, fontWeight: '700', color: colors.text },
  emptyTxSub: { fontSize: 13, color: colors.textMuted },

  txList: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  txDivider: { height: 1, backgroundColor: colors.divider, marginLeft: 68 },
  txRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  txIcon: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  txInfo: { flex: 1 },
  txLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  txDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  txDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '800' },
});
