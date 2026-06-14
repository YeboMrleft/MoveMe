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
import { spacing, radius, shadows } from '../../constants/spacing';
import { listenToDriverConversations, listenToUserConversations } from '../../services/jobService';
import { useAuth } from '../../hooks/useAuth';
import { Conversation } from '../../types';
import Avatar from '../../components/Avatar';
import Card from '../../components/Card';
import Badge from '../../components/Badge';

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
    if (!uid) return;
    const listen = isDriver ? listenToDriverConversations : listenToUserConversations;
    const unsub = listen(uid, data => {
      setConvs(data.filter(c => c.status !== 'completed'));
      setLoading(false);
    });
    return unsub;
  }, [uid, isDriver]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Text style={styles.headerSub}>Active conversations</Text>
      </View>

      <FlatList
        data={convs}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={56} color={colors.border} />
            <Text style={styles.emptyTitle}>No Messages Yet</Text>
            <Text style={styles.emptyText}>
              {isDriver
                ? 'Chats with senders will appear here after they respond to your offer.'
                : 'Message drivers from the offers screen to discuss job details.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const otherName = isDriver ? item.userName : item.driverName;
          const isUnread = !item.lastMessage;

          return (
            <Card
              variant="outlined"
              padding={4}
              onPress={() =>
                nav.navigate('Chat', {
                  conversationId: item.id,
                  jobId: item.jobId,
                  otherName,
                  otherUserId: isDriver ? item.userId : item.driverId,
                })
              }
              style={styles.conversationCard}
            >
              <View style={styles.conversationContent}>
                <Avatar
                  name={otherName}
                  size="md"
                  status={isUnread ? 'online' : undefined}
                  showBadge={isUnread}
                />

                <View style={styles.conversationMain}>
                  <View style={styles.conversationHeader}>
                    <Text style={[styles.conversationName, isUnread && styles.conversationNameUnread]}>
                      {otherName}
                    </Text>
                    <Text style={styles.conversationTime}>{timeAgo(item.lastMessageAt)}</Text>
                  </View>

                  <View style={styles.conversationFooter}>
                    <Text
                      style={[styles.conversationPreview, isUnread && styles.conversationPreviewUnread]}
                      numberOfLines={1}
                    >
                      {item.lastMessage || 'No messages yet'}
                    </Text>
                    {item.quotedPrice && (
                      <Badge
                        label={`R${item.quotedPrice}`}
                        variant="info"
                        size="sm"
                      />
                    )}
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            </Card>
          );
        }}
        scrollIndicatorInsets={{ right: 1 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    shadowColor: colors.shadowSm,
    shadowOpacity: 1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing[1],
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  // List
  list: {
    padding: spacing[4],
    gap: spacing[3],
    paddingBottom: spacing[8],
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    gap: spacing[4],
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

  // Conversation Card
  conversationCard: {
    marginHorizontal: 0,
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  conversationMain: {
    flex: 1,
    gap: spacing[2],
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conversationName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  conversationNameUnread: {
    fontWeight: '800',
  },
  conversationTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: spacing[2],
  },
  conversationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  conversationPreview: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  conversationPreviewUnread: {
    color: colors.text,
    fontWeight: '500',
  },
});
