import React from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Share, Linking, Pressable, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

const STORE_LINK = Platform.OS === 'ios'
  ? 'https://apps.apple.com/app/moveme'
  : 'https://play.google.com/store/apps/details?id=com.inkatech.moveme';

interface Props {
  visible: boolean;
  onClose: () => void;
  referralCode?: string;
  jobCompleted?: boolean;
}

export default function ShareModal({ visible, onClose, referralCode, jobCompleted }: Props) {
  const message = referralCode
    ? `Hey! I've been using MoveMe to book affordable bakkies for moving.\n\nDownload it here: ${STORE_LINK}\n\nUse my invite code *${referralCode}* when you sign up!`
    : `Hey! I've been using MoveMe to book affordable bakkies for moving.\n\nDownload it here: ${STORE_LINK}`;

  const shareWhatsApp = () => {
    const encoded = encodeURIComponent(message);
    Linking.openURL(`whatsapp://send?text=${encoded}`).catch(() =>
      Linking.openURL(`https://wa.me/?text=${encoded}`)
    );
    onClose();
  };

  const shareNative = async () => {
    await Share.share({ message, url: STORE_LINK });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        {jobCompleted && (
          <View style={styles.celebRow}>
            <Text style={styles.celebEmoji}>🎉</Text>
            <View>
              <Text style={styles.celebTitle}>Move complete!</Text>
              <Text style={styles.celebSub}>Know someone who needs a bakkie?</Text>
            </View>
          </View>
        )}

        {!jobCompleted && (
          <Text style={styles.title}>Invite friends to MoveMe</Text>
        )}

        {referralCode && (
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>Your invite code</Text>
            <Text style={styles.code}>{referralCode}</Text>
            <Text style={styles.codeHint}>Friends enter this when they sign up</Text>
          </View>
        )}

        <TouchableOpacity style={styles.whatsappBtn} onPress={shareWhatsApp} activeOpacity={0.85}>
          <Ionicons name="logo-whatsapp" size={22} color={colors.white} />
          <Text style={styles.whatsappText}>Share on WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.nativeBtn} onPress={shareNative} activeOpacity={0.85}>
          <Ionicons name="share-outline" size={20} color={colors.primary} />
          <Text style={styles.nativeBtnText}>More sharing options</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} style={styles.skipBtn}>
          <Text style={styles.skipText}>{jobCompleted ? 'Maybe later' : 'Close'}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 28, paddingBottom: 40, gap: 14,
  },
  celebRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4,
  },
  celebEmoji: { fontSize: 40 },
  celebTitle: { fontSize: 20, fontWeight: '900', color: colors.text },
  celebSub: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  title: { fontSize: 20, fontWeight: '900', color: colors.text },
  codeBox: {
    backgroundColor: colors.primary + '10', borderRadius: 16,
    borderWidth: 1.5, borderColor: colors.primary + '30',
    paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', gap: 4,
  },
  codeLabel: {
    fontSize: 11, fontWeight: '700', color: colors.primary,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  code: { fontSize: 28, fontWeight: '900', color: colors.primary, letterSpacing: 4 },
  codeHint: { fontSize: 12, color: colors.textMuted },
  whatsappBtn: {
    backgroundColor: '#25D366', borderRadius: 16,
    paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  whatsappText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  nativeBtn: {
    borderWidth: 1.5, borderColor: colors.primary, borderRadius: 16,
    paddingVertical: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  nativeBtnText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  skipBtn: { alignItems: 'center', paddingVertical: 4 },
  skipText: { color: colors.textMuted, fontSize: 14 },
});
