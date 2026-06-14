import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, Image,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Keyboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../constants/colors';
import { spacing, radius } from '../../constants/spacing';
import { listenToMessages, sendMessage } from '../../services/jobService';
import { sendPushNotification } from '../../services/notificationService';
import { uploadPhoto } from '../../services/storageService';
import { Message } from '../../types';
import Input from '../../components/Input';
import Badge from '../../components/Badge';
import { useAuth } from '../../hooks/useAuth';

type ChatParams = {
  Chat: { conversationId: string; jobId: string; otherName: string; otherUserId: string };
};

const EMOJIS = [
  '👋', '😊', '😄', '😅', '😂', '🙏', '❤️', '👍',
  '👏', '💪', '🎉', '✅', '⚠️', '❓', '🔥', '💯',
  '🚗', '🛻', '🏠', '📦', '📍', '⏰', '🗺️', '🏁',
];

const DRIVER_GREETINGS = [
  { id: '1', text: 'Hi! I can do this job 👋' },
  { id: '2', text: 'On my way to pick up! 🚗' },
  { id: '3', text: 'What time works for you? ⏰' },
  { id: '4', text: 'Just arrived at pickup 📍' },
  { id: '5', text: 'Goods collected, heading your way 🛻' },
];

const SENDER_GREETINGS = [
  { id: '1', text: 'Hi! Looking forward to it 👋' },
  { id: '2', text: 'Please handle with care 📦' },
  { id: '3', text: "I'll be at the pickup point 📍" },
  { id: '4', text: 'Thanks for the quick response! 🙏' },
  { id: '5', text: 'Can you give me an ETA? ⏰' },
];

export default function ChatScreen() {
  const nav = useNavigation<any>();
  const { params } = useRoute<RouteProp<ChatParams, 'Chat'>>();
  const { conversationId, otherName, otherUserId } = params;
  const { appUser } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const listRef = useRef<FlatList>(null);

  const isDriver = appUser?.role === 'driver';
  const uid = getAuth().currentUser?.uid ?? '';
  const greetings = isDriver ? DRIVER_GREETINGS : SENDER_GREETINGS;

  useEffect(() => {
    return listenToMessages(conversationId, msgs => {
      setMessages(msgs);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });
  }, [conversationId]);

  const doSendText = async (msgText: string) => {
    if (!msgText.trim()) return;
    setSending(true);
    try {
      await sendMessage(conversationId, {
        senderId: uid,
        senderName: appUser?.name ?? '',
        text: msgText.trim(),
        type: 'text',
      });
      sendPushNotification(otherUserId, appUser?.name ?? 'New message', msgText.trim(), 'message');
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    const t = text.trim();
    setText('');
    await doSendText(t);
  };

  const pickPhoto = () => {
    Alert.alert('Send a photo', 'Choose a source', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission needed', 'Allow camera access to take a photo.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.7,
          });
          if (!result.canceled) uploadChatPhoto(result.assets[0].uri);
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission needed', 'Allow photo library access.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.7,
          });
          if (!result.canceled) uploadChatPhoto(result.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const uploadChatPhoto = async (uri: string) => {
    setUploadingPhoto(true);
    try {
      const url = await uploadPhoto(uri, `chat/${conversationId}`);
      await sendMessage(conversationId, {
        senderId: uid,
        senderName: appUser?.name ?? '',
        text: '',
        type: 'image',
        imageUrl: url,
      });
      sendPushNotification(otherUserId, appUser?.name ?? 'New message', '📷 Photo', 'message');
    } catch {
      Alert.alert('Upload failed', 'Could not send the photo. Try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const mine = item.senderId === uid;
    const isQuote = item.type === 'quote';
    const isImage = item.type === 'image';
    return (
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
        {isQuote && item.price !== undefined && (
          <View style={styles.quoteBadge}>
            <Text style={styles.quoteLabel}>Price Quote</Text>
            <Text style={styles.quoteAmount}>R{item.price}</Text>
          </View>
        )}
        {isImage && item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.msgImage} resizeMode="cover" />
        ) : null}
        {!!item.text && item.text !== `Quote: R${item.price}` && (
          <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextOther]}>
            {item.text}
          </Text>
        )}
        <View style={styles.metaRow}>
          <Text style={[styles.timestamp, mine && styles.timestampMine]}>
            {new Date(item.timestamp).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {mine && <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.7)" />}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{otherName}</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.msgList}
          style={{ flex: 1 }}
          renderItem={renderMessage}
          ListFooterComponent={
            messages.length === 0 ? (
              <View style={styles.greetingsWrap}>
                <Text style={styles.greetingsLabel}>Suggestions</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.greetingsRow}
                >
                  {greetings.map(g => (
                    <TouchableOpacity
                      key={g.id}
                      style={styles.chip}
                      onPress={() => doSendText(g.text)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.chipText}>{g.text}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null
          }
        />

        {showEmoji && (
          <View style={styles.emojiPanel}>
            <View style={styles.emojiGrid}>
              {EMOJIS.map(e => (
                <TouchableOpacity key={e} style={styles.emojiBtn} onPress={() => setText(t => t + e)}>
                  <Text style={styles.emoji}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.inputArea}>
          <View style={styles.messageRow}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                setShowEmoji(v => !v);
                if (!showEmoji) Keyboard.dismiss();
              }}
            >
              <Ionicons
                name={showEmoji ? 'close-circle-outline' : 'happy-outline'}
                size={24}
                color={showEmoji ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtn} onPress={pickPhoto} disabled={uploadingPhoto}>
              {uploadingPhoto
                ? <ActivityIndicator size={20} color={colors.primary} />
                : <Ionicons name="image-outline" size={24} color={colors.textMuted} />}
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Input
                value={text}
                onChangeText={setText}
                placeholder="Type a message…"
                style={{ marginBottom: 0 }}
                onFocus={() => setShowEmoji(false)}
              />
            </View>

            <TouchableOpacity
              style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={sending || !text.trim()}
            >
              <Ionicons name="send" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safe: {
    flex: 1,
  },

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
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },

  // Message List
  msgList: {
    padding: spacing[4],
    gap: spacing[3],
    paddingBottom: spacing[3],
  },

  // Message Bubbles
  bubble: {
    maxWidth: '75%',
    borderRadius: radius.lg,
    padding: spacing[3],
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.sm,
    shadowColor: colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  bubbleTextMine: {
    color: colors.white,
    fontWeight: '500',
  },
  bubbleTextOther: {
    color: colors.text,
    fontWeight: '500',
  },
  msgImage: {
    width: 200,
    height: 150,
    borderRadius: radius.lg,
    marginBottom: spacing[2],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[2],
    alignSelf: 'flex-end',
  },
  timestamp: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },
  timestampMine: {
    color: 'rgba(255,255,255,0.7)',
  },

  // Quote Badge
  quoteBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing[2],
    marginBottom: spacing[2],
    alignItems: 'center',
  },
  quoteLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quoteAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.black,
    letterSpacing: -0.5,
  },

  // Greeting Suggestions
  greetingsWrap: {
    marginTop: spacing[6],
  },
  greetingsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[3],
    paddingHorizontal: spacing[4],
  },
  greetingsRow: {
    gap: spacing[2],
    paddingHorizontal: spacing[4],
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },

  // Emoji Panel
  emojiPanel: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingVertical: spacing[2],
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[2],
  },
  emojiBtn: {
    width: '12.5%',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  emoji: {
    fontSize: 24,
  },

  // Input Area
  inputArea: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
  },
  iconBtn: {
    width: 40,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  sendBtn: {
    width: 44,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sendBtnDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
});
