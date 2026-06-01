import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, signOut } from 'firebase/auth';
import { colors } from '../../constants/colors';
import { getUser } from '../../services/userService';
import { User } from '../../types';

interface Props {
  user: User;
  onResubmit: () => void;
}

export default function DriverVerifyPendingScreen({ user, onResubmit }: Props) {
  const [checking, setChecking] = useState(false);
  const [latestStatus, setLatestStatus] = useState(user.verificationStatus);
  const [rejectionReason, setRejectionReason] = useState(user.rejectionReason as string | undefined);

  const isPending  = latestStatus === 'pending';
  const isRejected = latestStatus === 'rejected';

  const checkStatus = async () => {
    setChecking(true);
    try {
      const fresh = await getUser(user.id);
      if (fresh) {
        setLatestStatus(fresh.verificationStatus);
        setRejectionReason(fresh.rejectionReason as string | undefined);
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Icon */}
        <View style={[styles.iconWrap, isRejected && styles.iconWrapRed]}>
          <Ionicons
            name={isPending ? 'time-outline' : 'close-circle-outline'}
            size={52}
            color={isPending ? colors.primary : colors.danger}
          />
        </View>

        <Text style={styles.title}>
          {isPending ? 'Documents under review' : 'Verification not approved'}
        </Text>

        <Text style={styles.subtitle}>
          {isPending
            ? "Our team is reviewing your documents. This usually takes up to 24 hours. You'll receive a notification once approved."
            : "Unfortunately your documents were not approved. Please check the reason below and resubmit."}
        </Text>

        {/* Rejection reason */}
        {isRejected && rejectionReason && (
          <View style={styles.reasonCard}>
            <Ionicons name="information-circle-outline" size={20} color={colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.reasonLabel}>Reason</Text>
              <Text style={styles.reasonText}>{rejectionReason}</Text>
            </View>
          </View>
        )}

        {/* Status steps */}
        <View style={styles.stepsCard}>
          <Step
            icon="checkmark-circle"
            label="Documents submitted"
            done
          />
          <StepLine />
          <Step
            icon={isPending ? 'ellipse-outline' : isRejected ? 'close-circle' : 'checkmark-circle'}
            label="Admin review"
            done={!isPending}
            danger={isRejected}
            active={isPending}
          />
          <StepLine />
          <Step
            icon="rocket-outline"
            label="Go online & accept jobs"
            done={false}
            active={false}
          />
        </View>

        {/* Actions */}
        {isRejected && (
          <TouchableOpacity style={styles.primaryBtn} onPress={onResubmit} activeOpacity={0.85}>
            <Ionicons name="refresh-outline" size={18} color={colors.white} />
            <Text style={styles.primaryBtnText}>Resubmit Documents</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={checkStatus}
          disabled={checking}
          activeOpacity={0.7}
        >
          {checking
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Ionicons name="refresh-outline" size={16} color={colors.primary} />}
          <Text style={styles.refreshText}>
            {checking ? 'Checking…' : 'Check status'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={() => signOut(getAuth())}
          activeOpacity={0.7}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function Step({ icon, label, done, active, danger }: {
  icon: string; label: string; done: boolean; active?: boolean; danger?: boolean;
}) {
  const iconColor = danger ? colors.danger : done ? colors.primary : active ? colors.primary : colors.textMuted;
  return (
    <View style={styles.step}>
      <Ionicons name={icon as any} size={22} color={iconColor} />
      <Text style={[styles.stepLabel, done && styles.stepDone, danger && styles.stepDanger, active && styles.stepActive]}>
        {label}
      </Text>
    </View>
  );
}

function StepLine() {
  return <View style={styles.stepLine} />;
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: colors.background },
  container: { padding: 28, paddingTop: 48, alignItems: 'center' },

  iconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.primary + '15',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  iconWrapRed: { backgroundColor: colors.danger + '15' },

  title: {
    fontSize: 22, fontWeight: '900', color: colors.text,
    textAlign: 'center', marginBottom: 12,
  },
  subtitle: {
    fontSize: 14, color: colors.textSecondary, textAlign: 'center',
    lineHeight: 21, marginBottom: 24, maxWidth: 300,
  },

  reasonCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: colors.danger + '10',
    borderRadius: 12, padding: 14, width: '100%',
    borderWidth: 1, borderColor: colors.danger + '30', marginBottom: 20,
  },
  reasonLabel: { fontSize: 11, fontWeight: '700', color: colors.danger, textTransform: 'uppercase', letterSpacing: 0.4 },
  reasonText:  { fontSize: 14, color: colors.text, marginTop: 2, lineHeight: 20 },

  stepsCard: {
    backgroundColor: colors.surface, borderRadius: 14,
    padding: 20, width: '100%', borderWidth: 1, borderColor: colors.border,
    marginBottom: 28,
  },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepLine: { width: 2, height: 20, backgroundColor: colors.border, marginLeft: 10, marginVertical: 4 },
  stepLabel:  { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  stepDone:   { color: colors.primary },
  stepActive: { color: colors.primary },
  stepDanger: { color: colors.danger },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 28,
    width: '100%', justifyContent: 'center', marginBottom: 12,
  },
  primaryBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },

  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 12, paddingHorizontal: 20,
  },
  refreshText: { color: colors.primary, fontWeight: '600', fontSize: 14 },

  signOutBtn:  { marginTop: 8, padding: 10 },
  signOutText: { color: colors.textMuted, fontSize: 13 },
});
