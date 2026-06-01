import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  collection, addDoc, onSnapshot, updateDoc, doc, query, orderBy, limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { getUser, updateUser } from './userService';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  category: string;
  read: boolean;
  createdAt: number;
}

const storeNotification = async (
  toUserId: string,
  title: string,
  body: string,
  category: string
) => {
  try {
    await addDoc(collection(db, 'notifications', toUserId, 'items'), {
      title, body, category, read: false, createdAt: Date.now(),
    });
  } catch {}
};

export const listenToNotifications = (
  userId: string,
  cb: (items: NotificationItem[]) => void
) => {
  const q = query(
    collection(db, 'notifications', userId, 'items'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as NotificationItem)));
  });
};

export const markNotificationRead = (userId: string, notifId: string) =>
  updateDoc(doc(db, 'notifications', userId, 'items', notifId), { read: true });

export const markAllNotificationsRead = async (userId: string, items: NotificationItem[]) => {
  await Promise.all(
    items.filter(i => !i.read).map(i => markNotificationRead(userId, i.id))
  );
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForPushNotifications = async (uid: string): Promise<void> => {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Move-Me',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1E88E5',
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await updateUser(uid, { pushToken: token });
  } catch {
    // Push token unavailable (e.g. simulator, no EAS project) — skip silently
  }
};

export type NotificationCategory = 'newOffer' | 'message' | 'tripUpdate';

export const sendPushNotification = async (
  toUserId: string,
  title: string,
  body: string,
  category?: NotificationCategory,
  data?: Record<string, unknown>
): Promise<void> => {
  try {
    const user = await getUser(toUserId);
    if (!user?.pushToken) return;

    if (category && user.notificationPrefs) {
      const p = user.notificationPrefs;
      if (category === 'message' && p.messages === false) return;
      if (category === 'newOffer' && p.newOffers === false) return;
      if (category === 'tripUpdate' && p.tripUpdates === false) return;
    }

    storeNotification(toUserId, title, body, category ?? 'general');

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
      },
      body: JSON.stringify({
        to: user.pushToken,
        title,
        body,
        data: data ?? {},
        sound: 'default',
        priority: 'high',
      }),
    });
  } catch {
    // Fire-and-forget — never throw
  }
};
