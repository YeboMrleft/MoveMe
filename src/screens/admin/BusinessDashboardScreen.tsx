import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing, radius } from '../../constants/spacing';
import { listenToBusinessMetrics, listenToCommissionTransactions, CommissionTransaction, BusinessMetrics } from '../../services/businessMetricsService';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';

export default function BusinessDashboardScreen() {
  const nav = useNavigation<any>();
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [transactions, setTransactions] = useState<CommissionTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub1 = listenToBusinessMetrics(data => {
      setMetrics(data);
      setLoading(false);
    });
    const unsub2 = listenToCommissionTransactions(setTransactions);
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const handleWithdrawal = () => {
    if (!metrics || metrics.totalBalance < 50) {
      Alert.alert('Insufficient Balance', 'Minimum withdrawal is R50');
      return;
    }
    nav.navigate('BusinessWithdrawal', { availableBalance: metrics.totalBalance });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const balance = metrics?.totalBalance ?? 0;
  const commissions = metrics?.totalCommissionsEarned ?? 0;
  const jobs = metrics?.totalJobsCompleted ?? 0;
  const volume = metrics?.totalPaymentVolume ?? 0;
  const avgPerJob = jobs > 0 ? Math.round(commissions / jobs) : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Available Balance Card */}
        <Card variant="elevated" padding={0} style={styles.balanceCard}>
          <View style={styles.balanceContent}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>R{balance.toLocaleString('en-ZA')}</Text>
            <Text style={styles.balanceSubtext}>From {commissions > 0 ? `${jobs} jobs` : 'no commissions yet'}</Text>
            <Button
              label={balance >= 50 ? 'Withdraw Funds' : 'Minimum R50 required'}
              variant={balance >= 50 ? 'primary' : 'outline'}
              size="md"
              onPress={handleWithdrawal}
              disabled={balance < 50}
              style={styles.withdrawBtn}
            />
          </View>
        </Card>

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <Card variant="outlined" padding={4} style={styles.metricCard}>
            <View style={styles.metricIcon}>
              <Ionicons name="wallet-outline" size={24} color={colors.primary} />
            </View>
            <Text style={styles.metricValue}>{commissions > 0 ? `R${commissions}` : 'R0'}</Text>
            <Text style={styles.metricLabel}>Total Earned</Text>
          </Card>

          <Card variant="outlined" padding={4} style={styles.metricCard}>
            <View style={styles.metricIcon}>
              <Ionicons name="cube-outline" size={24} color={colors.accent} />
            </View>
            <Text style={styles.metricValue}>{jobs}</Text>
            <Text style={styles.metricLabel}>Jobs</Text>
          </Card>

          <Card variant="outlined" padding={4} style={styles.metricCard}>
            <View style={styles.metricIcon}>
              <Ionicons name="trending-up" size={24} color={colors.success} />
            </View>
            <Text style={styles.metricValue}>{avgPerJob > 0 ? `R${avgPerJob}` : 'R0'}</Text>
            <Text style={styles.metricLabel}>Avg/Job</Text>
          </Card>
        </View>

        {/* Payment Volume */}
        <Card variant="outlined" padding={4} style={styles.volumeCard}>
          <View style={styles.volumeRow}>
            <View>
              <Text style={styles.volumeLabel}>Total Payment Volume</Text>
              <Text style={styles.volumeAmount}>R{volume.toLocaleString('en-ZA')}</Text>
            </View>
            <View style={styles.volumePercentage}>
              <Text style={styles.volumePercent}>12%</Text>
              <Text style={styles.volumePercentLabel}>Your cut</Text>
            </View>
          </View>
        </Card>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Commissions</Text>
          {transactions.length === 0 ? (
            <Card variant="outlined" padding={4}>
              <Text style={styles.emptyText}>No transactions yet</Text>
            </Card>
          ) : (
            transactions.slice(0, 10).map(tx => (
              <Card key={tx.id} variant="outlined" padding={4} style={styles.txCard}>
                <View style={styles.txRow}>
                  <View style={styles.txLeft}>
                    <View style={[styles.txIcon, { backgroundColor: tx.paymentMethod === 'wallet' ? colors.primary + '15' : colors.accent + '15' }]}>
                      <Ionicons
                        name={tx.paymentMethod === 'wallet' ? 'wallet-outline' : 'cash-outline'}
                        size={18}
                        color={tx.paymentMethod === 'wallet' ? colors.primary : colors.accent}
                      />
                    </View>
                    <View>
                      <Text style={styles.txDriver}>{tx.driverName}</Text>
                      <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                  <Text style={styles.txAmount}>+R{tx.amount}</Text>
                </View>
              </Card>
            ))
          )}
        </View>

        {/* Info Box */}
        <Card variant="outlined" padding={4} style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={18} color={colors.info} />
            <Text style={styles.infoText}>
              Move-Me keeps 12% commission on all in-app payments. Wallet top-ups go directly to your business account.
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
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

  container: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[8],
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Balance Card
  balanceCard: {
    marginHorizontal: 0,
  },
  balanceContent: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    gap: spacing[3],
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white + 'CC',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 44,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: -1,
  },
  balanceSubtext: {
    fontSize: 13,
    color: colors.white + '99',
  },
  withdrawBtn: {
    width: '100%',
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginHorizontal: 0,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Volume Card
  volumeCard: {
    marginHorizontal: 0,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  volumeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  volumeAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing[1],
  },
  volumePercentage: {
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.accent + '10',
    borderRadius: radius.md,
  },
  volumePercent: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.accent,
  },
  volumePercentLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing[1],
  },

  // Section
  section: {
    gap: spacing[3],
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Transaction
  txCard: {
    marginHorizontal: 0,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flex: 1,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  txDriver: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  txDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing[1],
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.success,
  },

  // Info
  infoCard: {
    marginHorizontal: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing[4],
  },
});
