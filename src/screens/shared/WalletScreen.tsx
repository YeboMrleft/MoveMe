import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { colors } from '../../constants/colors';
import { spacing, radius, shadows } from '../../constants/spacing';
import { useAuth } from '../../hooks/useAuth';
import { listenToWallet, listenToWalletTransactions, WalletData } from '../../services/walletService';
import { WalletTransaction } from '../../types';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Divider from '../../components/Divider';

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
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Balance Card */}
        <Card variant="elevated" padding={0} style={styles.balanceCardWrapper}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available Balance</Text>

            {loading ? (
              <View style={styles.balanceLoadingContainer}>
                <ActivityIndicator color={colors.white} size="large" />
              </View>
            ) : (
              <>
                <Text style={styles.balanceValue}>
                  R{balance.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <Text style={styles.balanceCurrency}>South African Rand</Text>
              </>
            )}

            <Divider style={styles.balanceDivider} />

            <View style={styles.balanceActions}>
              <Button
                label="Add Money"
                variant="primary"
                size="md"
                onPress={() => nav.navigate('TopUp')}
                icon={<Ionicons name="add-circle" size={18} color={colors.white} />}
                style={styles.actionBtn}
              />
              {isDriver && (
                <Button
                  label="Withdraw"
                  variant="secondary"
                  size="md"
                  onPress={() => balance >= 50 && nav.navigate('Withdrawal')}
                  disabled={balance < 50}
                  icon={<Ionicons name="arrow-up-circle" size={18} color={balance >= 50 ? colors.white : colors.textMuted} />}
                  style={styles.actionBtn}
                />
              )}
            </View>

            {isDriver && balance < 50 && balance > 0 && (
              <Text style={styles.minWithdrawNote}>
                <Ionicons name="information-circle" size={12} color={colors.white + 'CC'} />
                {' '}Minimum withdrawal is R50
              </Text>
            )}
          </View>
        </Card>

        {/* How It Works */}
        <Card variant="outlined" padding={4} style={styles.howCard}>
          <Text style={styles.howTitle}>How Wallet Works</Text>
          <View style={styles.howRows}>
            <View style={styles.howRow}>
              <View style={[styles.howIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name={isDriver ? 'car' : 'add-circle'} size={16} color={colors.primary} />
              </View>
              <Text style={styles.howText}>
                {isDriver
                  ? 'Earnings from completed trips automatically credit here'
                  : 'Top up your wallet to pay drivers directly'}
              </Text>
            </View>
            <Divider variant="inset" margin={2} />
            <View style={styles.howRow}>
              <View style={[styles.howIcon, { backgroundColor: colors.accent + '20' }]}>
                <Ionicons name="wallet" size={16} color={colors.accent} />
              </View>
              <Text style={styles.howText}>
                Platform fees (R10) are deducted from your wallet automatically
              </Text>
            </View>
            {isDriver && (
              <>
                <Divider variant="inset" margin={2} />
                <View style={styles.howRow}>
                  <View style={[styles.howIcon, { backgroundColor: colors.error + '20' }]}>
                    <Ionicons name="arrow-up-circle" size={16} color={colors.error} />
                  </View>
                  <Text style={styles.howText}>
                    Withdraw to your bank account within 2 business days (min R50)
                  </Text>
                </View>
              </>
            )}
          </View>
        </Card>

        {/* Transaction History */}
        <Text style={styles.sectionTitle}>Recent Transactions</Text>

        {transactions.length === 0 ? (
          <Card variant="outlined" padding={6} style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <Ionicons name="receipt-outline" size={48} color={colors.border} />
              <Text style={styles.emptyTitle}>No Transactions Yet</Text>
              <Text style={styles.emptyText}>Your transaction history will appear here</Text>
            </View>
          </Card>
        ) : (
          <Card variant="outlined" padding={0} style={styles.txListCard}>
            {transactions.map((tx, i) => {
              const meta = TX_ICON[tx.type] ?? { icon: 'ellipse', color: colors.textMuted };
              const isCredit = tx.amount > 0;
              return (
                <View key={tx.id}>
                  {i > 0 && <Divider variant="inset" />}
                  <View style={styles.txRow}>
                    <View style={[styles.txIcon, { backgroundColor: meta.color + '15' }]}>
                      <Ionicons name={meta.icon as any} size={20} color={meta.color} />
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txLabel}>{TX_LABEL[tx.type] ?? tx.type}</Text>
                      <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                      <Text style={styles.txDate}>{fmtDate(tx.createdAt)}</Text>
                    </View>
                    <Text style={[styles.txAmount, { color: isCredit ? colors.success : colors.error }]}>
                      {isCredit ? '+' : '−'}R{Math.abs(tx.amount).toFixed(2)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>
        )}
      </ScrollView>
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '08',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },

  // Container
  container: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[8],
  },

  // Balance Card
  balanceCardWrapper: {
    marginHorizontal: 0,
  },
  balanceCard: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    gap: spacing[4],
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white + 'CC',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: 44,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: -1,
  },
  balanceCurrency: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.white + '99',
  },
  balanceLoadingContainer: {
    paddingVertical: spacing[4],
  },
  balanceDivider: {
    backgroundColor: colors.white + '20',
    height: 1,
    width: '100%',
  },
  balanceActions: {
    flexDirection: 'row',
    gap: spacing[2],
    width: '100%',
  },
  actionBtn: {
    flex: 1,
  },
  minWithdrawNote: {
    fontSize: 12,
    color: colors.white + '99',
    fontWeight: '500',
  },

  // How It Works Card
  howCard: {
    marginHorizontal: 0,
  },
  howTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing[2],
  },
  howRows: {
    gap: spacing[3],
  },
  howRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  howIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  howText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    paddingTop: spacing[1],
  },

  // Section Title
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Empty State
  emptyCard: {
    marginHorizontal: 0,
    minHeight: 240,
  },
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Transaction List
  txListCard: {
    marginHorizontal: 0,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  txInfo: {
    flex: 1,
    gap: spacing[1],
  },
  txLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  txDesc: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  txDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
