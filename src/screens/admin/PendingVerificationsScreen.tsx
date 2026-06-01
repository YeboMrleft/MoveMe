import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { signOut, getAuth } from 'firebase/auth';
import { colors } from '../../constants/colors';
import { listenToPendingDrivers } from '../../services/adminService';
import { User } from '../../types';
import Avatar from '../../components/Avatar';
import { AdminStackParams } from '../../navigation/AdminNavigator';

type Nav = StackNavigationProp<AdminStackParams, 'PendingVerifications'>;

export default function PendingVerificationsScreen() {
  const nav = useNavigation<Nav>();
  const [drivers, setDrivers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return listenToPendingDrivers(data => {
      setDrivers(data);
      setLoading(false);
    });
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>Move-Me</Text>
          <Text style={styles.adminLabel}>Admin Panel</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => nav.navigate('AdminDashboard')}>
            <Ionicons name="stats-chart-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => signOut(getAuth())}>
            <Ionicons name="log-out-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Pending Verifications</Text>
        {!loading && (
          <View style={[styles.countBadge, { backgroundColor: drivers.length > 0 ? colors.danger : colors.border }]}>
            <Text style={[styles.countText, { color: drivers.length > 0 ? colors.white : colors.textMuted }]}>
              {drivers.length}
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} size="large" />
      ) : (
        <FlatList
          data={drivers}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={64} color={colors.primary} />
              <Text style={styles.emptyTitle}>All clear</Text>
              <Text style={styles.emptyText}>No drivers waiting for review.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => nav.navigate('DriverReview', { driverId: item.id })}
              activeOpacity={0.8}
            >
              <View style={styles.cardLeft}>
                {item.selfiePhoto ? (
                  <Image source={{ uri: item.selfiePhoto }} style={styles.selfie} />
                ) : (
                  <Avatar name={item.name} size={52} />
                )}
                <View style={styles.cardInfo}>
                  <Text style={styles.driverName}>{item.name}</Text>
                  <Text style={styles.driverPhone}>{item.phone}</Text>
                  {item.registrationNumber && (
                    <View style={styles.regRow}>
                      <Ionicons name="car-outline" size={13} color={colors.textMuted} />
                      <Text style={styles.regText}>{item.registrationNumber}</Text>
                    </View>
                  )}
                  <Text style={styles.submitted}>
                    Submitted {new Date(item.createdAt).toLocaleDateString('en-ZA')}
                  </Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>Pending</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          )}
        />
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
  logo: { fontSize: 20, fontWeight: '900', color: colors.primary },
  adminLabel: { fontSize: 11, fontWeight: '700', color: colors.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  countBadge: {
    minWidth: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
  },
  countText: { fontSize: 13, fontWeight: '800' },
  list: { padding: 16, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textSecondary },
  card: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  cardLeft: { flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 },
  selfie: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: colors.border },
  cardInfo: { flex: 1, gap: 2 },
  driverName: { fontSize: 16, fontWeight: '700', color: colors.text },
  driverPhone: { fontSize: 13, color: colors.textSecondary },
  regRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  regText: { fontSize: 12, color: colors.textMuted },
  submitted: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingBadge: {
    backgroundColor: colors.pending + '25', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  pendingText: { fontSize: 11, fontWeight: '700', color: colors.pending },
});
