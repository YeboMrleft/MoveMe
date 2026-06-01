import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { listenToDriverConversations, listenToUserConversations } from '../../services/jobService';
import { useAuth } from '../../hooks/useAuth';
import { Conversation } from '../../types';
import Avatar from '../../components/Avatar';

function timeAgo(ts?: number): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ConversationsScreen() {
  const nav = useNavigation<any>();
  const { appUser } = useAuth();
  const uid = getAuth().currentUser?.uid ?? '';
  const isDriver = appUser?.role === 'driver';

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const listen = isDriver ? listenToDriverConversations : listenToUserConversations;
    const unsub = listen(uid, data => {
      setConvs(data);
      setLoading(false);
    });
    return unsub;
  }, [uid, isDriver]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <FlatList
        data={convs}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.border} />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>
              {isDriver
                ? 'When a sender starts a chat with you after your offer, it will appear here.'
                : 'Start a chat with a driver from the offers screen.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const otherName = isDriver ? item.userName : item.driverName;
          const hasUnread = !item.lastMessage;
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                nav.navigate('Chat', {
                  conversationId: item.id,
                  jobId: item.jobId,
                  otherName,
                  otherUserId: isDriver ? item.userId : item.driverId,
                })
              }
              activeOpacity={0.75}
            >
              <Avatar name={otherName} size={50} />

              <View style={styles.rowContent}>
                <View style={styles.rowTop}>
                  <Text style={styles.name} numberOfLines={1}>{otherName}</Text>
                  <Text style={styles.time}>{timeAgo(item.lastMessageAt)}</Text>
                </View>

                <View style={styles.rowBottom}>
                  <Text style={styles.preview} numberOfLines={1}>
                    {item.lastMessage ?? 'No messages yet'}
                  </Text>
                  {item.quotedPrice ? (
                    <View style={styles.priceBadge}>
                      <Text style={styles.priceText}>R{item.quotedPrice}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <Ionicons name="chevron-forward" size={18} color={colors.border} />
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: colors.text },
  list: { flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: colors.background, gap: 14,
  },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  time: { fontSize: 12, color: colors.textMuted, marginLeft: 8 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preview: { flex: 1, fontSize: 13, color: colors.textSecondary },
  priceBadge: {
    backgroundColor: colors.primary + '20',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  priceText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: 80 },
});
