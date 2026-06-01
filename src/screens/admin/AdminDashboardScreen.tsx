import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { colors } from '../../constants/colors';

interface Stats {
  totalDrivers: number;
  verifiedDrivers: number;
  pendingDrivers: number;
  totalSenders: number;
  totalJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  openJobs: number;
  revenue: number;
  marketplaceItems: number;
  newUsersWeek: number;
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color?: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: (color ?? colors.primary) + '18' }]}>
        <Ionicons name={icon as any} size={22} color={color ?? colors.primary} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function AdminDashboardScreen() {
  const nav = useNavigation<any>();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const weekAgo = Date.now() - 7 * 86400000;
      const [drivers, senders, jobs, marketplace, newUsers] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role', '==', 'driver'))),
        getDocs(query(collection(db, 'users'), where('role', '==', 'sender'))),
        getDocs(collection(db, 'jobs')),
        getDocs(query(collection(db, 'marketplace'), where('status', '==', 'available'))),
        getDocs(query(collection(db, 'users'), where('createdAt', '>=', weekAgo))),
      ]);

      const driverDocs = drivers.docs.map(d => d.data());
      const jobDocs = jobs.docs.map(d => d.data());
      const completedJobs = jobDocs.filter(j => j.status === 'completed');

      setStats({
        totalDrivers: driverDocs.length,
        verifiedDrivers: driverDocs.filter(d => d.verificationStatus === 'verified').length,
        pendingDrivers: driverDocs.filter(d => d.verificationStatus === 'pending').length,
        totalSenders: senders.size,
        totalJobs: jobs.size,
        completedJobs: completedJobs.length,
        cancelledJobs: jobDocs.filter(j => j.status === 'cancelled').length,
        openJobs: jobDocs.filter(j => j.status === 'open').length,
        revenue: completedJobs.length * 10,
        marketplaceItems: marketplace.size,
        newUsersWeek: newUsers.size,
      });
    } catch (e) {
      console.error('Stats error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity onPress={loadStats}>
          <Ionicons name="refresh-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading || !stats ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} size="large" />
      ) : (
        <ScrollView contentContainerStyle={styles.container}>

          <Text style={styles.sectionTitle}>Users</Text>
          <View style={styles.grid}>
            <StatCard icon="people-outline" label="Total Drivers" value={stats.totalDrivers} />
            <StatCard icon="shield-checkmark-outline" label="Verified" value={stats.verifiedDrivers} color="#059669" />
            <StatCard icon="time-outline" label="Pending" value={stats.pendingDrivers} color="#D97706" />
            <StatCard icon="cube-outline" label="Senders" value={stats.totalSenders} color="#0EA5E9" />
          </View>

          <View style={styles.highlightCard}>
            <Ionicons name="people" size={28} color={colors.primary} />
            <View>
              <Text style={styles.highlightVal}>{stats.totalDrivers + stats.totalSenders}</Text>
              <Text style={styles.highlightLabel}>Total users · {stats.newUsersWeek} new this week</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Jobs</Text>
          <View style={styles.grid}>
            <StatCard icon="list-outline" label="Total Jobs" value={stats.totalJobs} />
            <StatCard icon="checkmark-circle-outline" label="Completed" value={stats.completedJobs} color="#059669" />
            <StatCard icon="radio-button-on-outline" label="Open Now" value={stats.openJobs} color="#0EA5E9" />
            <StatCard icon="close-circle-outline" label="Cancelled" value={stats.cancelledJobs} color={colors.danger} />
          </View>

          <Text style={styles.sectionTitle}>Revenue</Text>
          <View style={styles.revenueCard}>
            <Ionicons name="cash-outline" size={32} color="#059669" />
            <View>
              <Text style={styles.revenueVal}>R{stats.revenue.toLocaleString('en-ZA')}</Text>
              <Text style={styles.revenueLabel}>Platform fees collected · R10 per completed trip</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Marketplace</Text>
          <View style={styles.grid}>
            <StatCard icon="storefront-outline" label="Active Listings" value={stats.marketplaceItems} color="#7C3AED" />
          </View>

        </ScrollView>
      )}
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 8,
  },
  statIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 24, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center' },
  highlightCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: colors.primary + '10', borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: colors.primary + '30',
  },
  highlightVal: { fontSize: 28, fontWeight: '900', color: colors.primary },
  highlightLabel: { fontSize: 13, color: colors.textSecondary },
  revenueCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#059669' + '10', borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: '#059669' + '30',
  },
  revenueVal: { fontSize: 28, fontWeight: '900', color: '#059669' },
  revenueLabel: { fontSize: 13, color: colors.textSecondary },
});
