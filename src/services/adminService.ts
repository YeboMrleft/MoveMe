import {
  collection, query, where, onSnapshot, doc, updateDoc, orderBy, deleteField,
} from 'firebase/firestore';
import { db } from './firebase';
import { User } from '../types';
import { sendPushNotification } from './notificationService';

export const listenToPendingDrivers = (cb: (drivers: User[]) => void) => {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'driver'),
    where('verificationStatus', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
  });
};

export const approveDriver = async (uid: string) => {
  await updateDoc(doc(db, 'users', uid), {
    verificationStatus: 'verified',
    rejectionReason: deleteField(),
  });
  await sendPushNotification(
    uid,
    "You're verified! 🎉",
    "Your documents have been approved. You can now go online and start accepting jobs.",
  );
};

export const rejectDriver = async (uid: string, reason?: string) => {
  await updateDoc(doc(db, 'users', uid), {
    verificationStatus: 'rejected',
    ...(reason ? { rejectionReason: reason } : {}),
  });
  await sendPushNotification(
    uid,
    'Verification update',
    reason ?? 'Your verification was not approved. Please resubmit your documents.',
  );
};

export const approveVehiclePhoto = (uid: string, pendingUrl: string) =>
  updateDoc(doc(db, 'users', uid), {
    vehiclePhoto: pendingUrl,
    vehiclePhotoPending: deleteField(),
  });

export const rejectVehiclePhoto = (uid: string) =>
  updateDoc(doc(db, 'users', uid), { vehiclePhotoPending: deleteField() });
