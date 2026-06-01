import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { Rating } from '../types';

export const submitRating = async (
  data: Omit<Rating, 'id' | 'createdAt'>,
  jobField?: 'senderRated' | 'driverRated'
) => {
  const payload: Record<string, unknown> = { ...data, createdAt: Date.now() };
  Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
  await addDoc(collection(db, 'ratings'), payload);

  const allRatings = await getDocs(
    query(collection(db, 'ratings'), where('toUserId', '==', data.toUserId))
  );
  const scores = allRatings.docs.map(d => (d.data() as Rating).score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  await updateDoc(doc(db, 'users', data.toUserId), {
    rating: Math.round(avg * 10) / 10,
    totalTrips: scores.length,
  });

  if (jobField) {
    await updateDoc(doc(db, 'jobs', data.jobId), { [jobField]: true });
  }
};
