import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { colors } from '../../constants/colors';
import { spacing, radius } from '../../constants/spacing';
import {
  listenToNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  NotificationItem,
} from '../../services/notificationService';
import Card from '../../components/Card';

const CATEGORY_ICON: Record<string, string> = {
  newOffer: 'pricetag-outline',
  message: 'chatbubble-outline',
  tripUpdate: 'navigate-outline',
  general: 'notifications-outline',
};

const CATEGORY_COLOR: Record<string, string> = {
  newOffer: '#7C3AED',
  message: '#0EA5E9',
  tripUpdate: '#059669',
  general: '#6B7280',
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsScreen() {
  const nav = useNavigation<any>();
  const uid = getAuth().currentUser?.uid ?? '';
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return listenToNotifications(uid, data => {
      setItems(data);
      setLoading(false);
    });
  }, [uid]);

  const unreadCount = items.filter(i => !i.read).length;

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={() => markAllNotificationsRead(uid, items)}>
            <Text style={styles.markAllText}>Mark read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          scrollIndicatorInsets={{ right: 1 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={56} color={colors.border} />
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptyText}>Trip updates, offers, and messages will appear here</Text>
            </View>
          }
          renderItem={({ item }) => {
            const icon = CATEGORY_ICON[item.category] ?? CATEGORY_ICON.general;
            const color = CATEGORY_COLOR[item.category] ?? CATEGORY_COLOR.general;
            return (
              <Card
                variant="outlined"
                padding={4}
                onPress={() => markNotificationRead(uid, item.id)}
                style={[styles.notificationCard, !item.read && styles.unreadCard]}
              >
                <View style={styles.notifContent}>
                  <View style={[styles.iconWrap, { backgroundColor: color + '15' }]}>
                    <Ionicons name={icon as any} size={22} color={color} />
                  </View>
                  <View style={styles.textContent}>
                    <View style={styles.titleRow}>
                      <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                      {!item.read && <View style={styles.unreadIndicator} />}
                    </View>
                    <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
                    <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}
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
  markAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  // List
  list: { padding: spacing[4], gap: spacing[3], paddingBottom: spacing[8] },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[12],
    gap: spacing[4],
    paddingHorizontal: spacing[4],
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Notification Card
  notificationCard: {
    marginHorizontal: 0,
  },
  unreadCard: {
    backgroundColor: colors.primary + '05',
  },
  notifContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textContent: {
    flex: 1,
    gap: spacing[1],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    flexShrink: 0,
  },
  body: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  time: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing[1],
  },
});
