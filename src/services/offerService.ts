import {
  collection, doc, addDoc, updateDoc, onSnapshot,
  query, where, orderBy, getDocs, getDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { DriverOffer } from '../types';

export const submitOffer = async (offer: Omit<DriverOffer, 'id' | 'createdAt' | 'score' | 'status'>) => {
  // prevent duplicate offer from same driver on same job
  const existing = await getDocs(
    query(
      collection(db, 'offers'),
      where('jobId', '==', offer.jobId),
      where('driverId', '==', offer.driverId)
    )
  );
  if (!existing.empty) {
    // update existing offer with new price
    const ref = existing.docs[0].ref;
    await updateDoc(ref, { price: offer.price, note: offer.note ?? '', createdAt: Date.now() });
    return existing.docs[0].id;
  }

  const cleaned = Object.fromEntries(
    Object.entries(offer).filter(([, v]) => v != null)
  );
  const ref = await addDoc(collection(db, 'offers'), {
    ...cleaned,
    status: 'submitted',
    createdAt: Date.now(),
  });

  // update offer count on job
  const jobSnap = await getDoc(doc(db, 'jobs', offer.jobId));
  if (jobSnap.exists()) {
    const current = (jobSnap.data().offersCount ?? 0) + 1;
    await updateDoc(doc(db, 'jobs', offer.jobId), { offersCount: current });
  }

  return ref.id;
};

export const listenToJobOffers = (jobId: string, cb: (offers: DriverOffer[]) => void) => {
  const q = query(
    collection(db, 'offers'),
    where('jobId', '==', jobId),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as DriverOffer)));
  });
};

export const hasDriverSubmittedOffer = async (jobId: string, driverId: string): Promise<boolean> => {
  const snap = await getDocs(
    query(
      collection(db, 'offers'),
      where('jobId', '==', jobId),
      where('driverId', '==', driverId)
    )
  );
  return !snap.empty;
};

// Score formula: weight rating (0.4) and price rank (0.6)
// Lower price = better price rank. Higher rating = better rating score.
export const scoreAndSelectTop3 = (offers: DriverOffer[]): DriverOffer[] => {
  if (offers.length === 0) return [];

  const prices = offers.map(o => o.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const scored = offers.map(o => {
    const ratingScore = (o.driverRating / 5) * 0.4;
    // lower price → higher price score (1 = cheapest, 0 = most expensive)
    const priceScore = (1 - (o.price - minPrice) / priceRange) * 0.6;
    return { ...o, score: Math.round((ratingScore + priceScore) * 100) / 100 };
  });

  return scored
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3);
};

export const updateOfferStatus = (offerId: string, status: DriverOffer['status']) =>
  updateDoc(doc(db, 'offers', offerId), { status });
