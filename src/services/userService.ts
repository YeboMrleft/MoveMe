import {
  doc, setDoc, getDoc, updateDoc, onSnapshot, increment,
  arrayUnion, arrayRemove, collection, query, where, orderBy, limit, getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { User, JobTemplate } from '../types';

export const createUser = (uid: string, data: Omit<User, 'id'>) =>
  setDoc(doc(db, 'users', uid), data);

export const getUser = async (uid: string): Promise<User | null> => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as User) : null;
};

export const updateUser = (uid: string, data: Partial<User>) =>
  updateDoc(doc(db, 'users', uid), data);

export const listenToUser = (uid: string, cb: (user: User) => void) =>
  onSnapshot(doc(db, 'users', uid), snap => {
    if (snap.exists()) cb({ id: snap.id, ...snap.data() } as User);
  });

export const updateDriverLocation = (uid: string, lat: number, lng: number) =>
  updateDoc(doc(db, 'users', uid), {
    currentLocation: { latitude: lat, longitude: lng },
  });

export const setDriverOnline = (uid: string, online: boolean) =>
  updateDoc(doc(db, 'users', uid), { isOnline: online });

export const incrementTotalEarned = (uid: string, amount: number) =>
  updateDoc(doc(db, 'users', uid), { totalEarned: increment(amount) });

export const addFavouriteDriver = (uid: string, driverId: string) =>
  updateDoc(doc(db, 'users', uid), { favouriteDriverIds: arrayUnion(driverId) });

export const removeFavouriteDriver = (uid: string, driverId: string) =>
  updateDoc(doc(db, 'users', uid), { favouriteDriverIds: arrayRemove(driverId) });

export const saveJobTemplate = async (uid: string, template: JobTemplate) => {
  const user = await getUser(uid);
  const existing = user?.jobTemplates ?? [];
  const filtered = existing.filter(t => t.id !== template.id);
  await updateDoc(doc(db, 'users', uid), { jobTemplates: [...filtered, template] });
};

export const deleteJobTemplate = async (uid: string, templateId: string) => {
  const user = await getUser(uid);
  const updated = (user?.jobTemplates ?? []).filter(t => t.id !== templateId);
  await updateDoc(doc(db, 'users', uid), { jobTemplates: updated });
};

export const getLeaderboard = async (city: string): Promise<User[]> => {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'driver'),
    where('serviceCity', '==', city),
    orderBy('totalTrips', 'desc'),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
};

export const applyReferralCode = async (newUid: string, code: string): Promise<boolean> => {
  // Find the user whose UID starts with the code (first 8 chars uppercased)
  const snap = await getDocs(collection(db, 'users'));
  const referrer = snap.docs.find(d => d.id.substring(0, 8).toUpperCase() === code.toUpperCase());
  if (!referrer) return false;
  await updateDoc(doc(db, 'users', newUid), { referredBy: referrer.id });
  await updateDoc(doc(db, 'users', referrer.id), { referralCount: increment(1) });
  return true;
};
