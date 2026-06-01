import {
  collection, addDoc, doc, updateDoc, onSnapshot,
  query, where, orderBy, getDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { MarketplaceItem } from '../types';

export const createMarketplaceItem = async (
  data: Omit<MarketplaceItem, 'id' | 'createdAt'>
): Promise<string> => {
  const ref = await addDoc(collection(db, 'marketplace'), {
    ...data,
    createdAt: Date.now(),
  });
  return ref.id;
};

export const listenToMarketplaceItems = (
  city: string,
  cb: (items: MarketplaceItem[]) => void
) => {
  const q = query(
    collection(db, 'marketplace'),
    where('city', '==', city),
    where('status', '==', 'available'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as MarketplaceItem)));
  });
};

export const getMarketplaceItem = async (itemId: string): Promise<MarketplaceItem | null> => {
  const snap = await getDoc(doc(db, 'marketplace', itemId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as MarketplaceItem) : null;
};

export const updateMarketplaceItemStatus = (
  itemId: string,
  status: MarketplaceItem['status']
) => updateDoc(doc(db, 'marketplace', itemId), { status });

export const listenToMyListings = (
  sellerId: string,
  cb: (items: MarketplaceItem[]) => void
) => {
  const q = query(
    collection(db, 'marketplace'),
    where('sellerId', '==', sellerId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as MarketplaceItem)));
  });
};
