import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing, radius, shadows } from '../../constants/spacing';
import { submitRating } from '../../services/ratingService';
import Button from '../../components/Button';
import Card from '../../components/Card';
import StarRating from '../../components/StarRating';
import Input from '../../components/Input';
import Divider from '../../components/Divider';
import { useAuth } from '../../hooks/useAuth';

type RateParams = { Rate: { jobId: string; toUserId: string; toName: string } };

const RATINGS = ['Poor', 'Fair', 'Good', 'Great', 'Excellent'];
const RATING_COLORS = [colors.error, colors.warning, colors.info, colors.accent, colors.success];

export default function RateScreen() {
  const nav = useNavigation<any>();
  const { params } = useRoute<RouteProp<RateParams, 'Rate'>>();
  const { jobId, toUserId, toName } = params;
  const { appUser } = useAuth();

  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (score === 0) {
      Alert.alert('Select a Rating', 'Please select a star rating before submitting.');
      return;
    }
    setLoading(true);
    try {
      const uid = getAuth().currentUser?.uid ?? '';
      const jobField = appUser?.role === 'sender' ? 'senderRated' : 'driverRated';
      await submitRating(
        { jobId, fromUserId: uid, toUserId, score, comment: comment.trim() || undefined },
        jobField
      );
      nav.popToTop();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const ratingLabel = RATINGS[score - 1];
  const ratingColor = score > 0 ? RATING_COLORS[score - 1] : colors.border;

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'bottom', 'left']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={styles.title}>Rate Your Experience</Text>
        <Text style={styles.subtitle}>
          How was your trip with{'\n'}
          <Text style={styles.personName}>{toName}</Text>?
        </Text>

        {/* Rating Card */}
        <Card variant="elevated" padding={6} style={styles.ratingCard}>
          <View style={styles.ratingContent}>
            <View style={styles.starsContainer}>
              <StarRating
                value={score}
                onChange={setScore}
                size="lg"
                interactive
              />
            </View>

            {score > 0 && (
              <View style={[styles.ratingLabel, { backgroundColor: ratingColor + '15' }]}>
                <Ionicons name="star-outline" size={16} color={ratingColor} />
                <Text style={[styles.ratingText, { color: ratingColor }]}>
                  {ratingLabel}
                </Text>
              </View>
            )}

            {score === 0 && (
              <Text style={styles.ratingPlaceholder}>Select a rating above</Text>
            )}
          </View>
        </Card>

        {/* Quick Reasons (if low rating) */}
        {score > 0 && score <= 2 && (
          <Card variant="outlined" padding={4} style={styles.issuesCard}>
            <Text style={styles.issuesTitle}>What could be improved?</Text>
            <Text style={styles.issuesText}>
              Your feedback helps us improve the service.
            </Text>
          </Card>
        )}

        {/* Comment Section */}
        <View style={styles.commentSection}>
          <Text style={styles.commentLabel}>Add a Comment</Text>
          <Text style={styles.commentHint}>Optional — Help others make informed decisions</Text>
          <Input
            value={comment}
            onChangeText={setComment}
            placeholder="Share your experience..."
            size="md"
            variant="outlined"
            multiline
            numberOfLines={4}
            style={{ height: 100, textAlignVertical: 'top' }}
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            label="Submit Rating"
            variant="primary"
            size="lg"
            onPress={handleSubmit}
            loading={loading}
            disabled={score === 0}
            style={styles.submitBtn}
          />
          <Button
            label="Skip for Now"
            variant="outline"
            size="lg"
            onPress={() => nav.popToTop()}
            style={styles.skipBtn}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    padding: spacing[4],
    paddingTop: spacing[8],
    paddingBottom: spacing[8],
    gap: spacing[6],
  },

  // Header
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 24,
  },
  personName: {
    fontWeight: '800',
    color: colors.primary,
  },

  // Rating Card
  ratingCard: {
    marginHorizontal: 0,
  },
  ratingContent: {
    alignItems: 'center',
    gap: spacing[4],
  },
  starsContainer: {
    paddingVertical: spacing[2],
  },
  ratingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.lg,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: '700',
  },
  ratingPlaceholder: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  // Issues Card
  issuesCard: {
    marginHorizontal: 0,
    backgroundColor: colors.error + '08',
  },
  issuesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing[1],
  },
  issuesText: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Comment Section
  commentSection: {
    gap: spacing[2],
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  commentHint: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Actions
  actions: {
    gap: spacing[3],
    marginTop: spacing[4],
  },
  submitBtn: {},
  skipBtn: {},
});
