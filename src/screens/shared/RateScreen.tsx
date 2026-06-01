import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { colors } from '../../constants/colors';
import { submitRating } from '../../services/ratingService';
import Button from '../../components/Button';
import StarRating from '../../components/StarRating';
import Input from '../../components/Input';
import { useAuth } from '../../hooks/useAuth';

type RateParams = { Rate: { jobId: string; toUserId: string; toName: string } };

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
      Alert.alert('Select a rating', 'Please give a star rating before submitting.');
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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Rate your experience</Text>
        <Text style={styles.subtitle}>
          How was your trip with <Text style={styles.name}>{toName}</Text>?
        </Text>

        <View style={styles.starsBox}>
          <StarRating value={score} onChange={setScore} size={48} />
          <Text style={styles.scoreLabel}>
            {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][score] ?? ''}
          </Text>
        </View>

        <Input
          label="Leave a comment (optional)"
          value={comment}
          onChangeText={setComment}
          placeholder="Anything to add?"
          multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: 'top', paddingTop: 10 }}
        />

        <Button label="Submit Rating" onPress={handleSubmit} loading={loading} style={styles.mt} />
        <Button label="Skip" onPress={() => nav.popToTop()} variant="ghost" style={styles.skip} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '900', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 40, lineHeight: 22 },
  name: { fontWeight: '700', color: colors.text },
  starsBox: { alignItems: 'center', gap: 12, marginBottom: 40 },
  scoreLabel: { fontSize: 18, fontWeight: '700', color: colors.primary, height: 24 },
  mt: { marginTop: 8 },
  skip: { marginTop: 8 },
});
