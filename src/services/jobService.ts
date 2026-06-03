import {
  collection, doc, addDoc, updateDoc, onSnapshot,
  query, where, orderBy, getDocs, serverTimestamp, getDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { Job, JobStatus, Conversation, Message } from '../types';

// Jobs
export const createJob = async (data: Omit<Job, 'id' | 'createdAt'>) => {
  const ref = await addDoc(collection(db, 'jobs'), {
    ...data,
    createdAt: Date.now(),
  });
  return ref.id;
};

export const updateJobStatus = (jobId: string, status: JobStatus, extra?: Partial<Job>) =>
  updateDoc(doc(db, 'jobs', jobId), { status, ...extra });

export const updateJobDriverLocation = (jobId: string, latitude: number, longitude: number) =>
  updateDoc(doc(db, 'jobs', jobId), {
    driverLocation: { latitude, longitude, updatedAt: Date.now() },
  });

export const markArrived = (jobId: string) =>
  updateDoc(doc(db, 'jobs', jobId), { status: 'arrived' });

export const startTrip = (jobId: string) =>
  updateDoc(doc(db, 'jobs', jobId), { status: 'in_progress', paymentMethod: 'cash' });

export const confirmCashPayment = (jobId: string) =>
  updateDoc(doc(db, 'jobs', jobId), {
    cashConfirmedBySender: true,
    cashConfirmedAt: Date.now(),
  });

export const listenToJob = (jobId: string, cb: (job: Job) => void) =>
  onSnapshot(doc(db, 'jobs', jobId), snap => {
    if (snap.exists()) cb({ id: snap.id, ...snap.data() } as Job);
  });

export const listenToOpenJobsNear = (city: string, cb: (jobs: Job[]) => void) => {
  const q = query(
    collection(db, 'jobs'),
    where('status', '==', 'open'),
    where('city', '==', city),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Job)));
  });
};

export const listenToUserJobs = (userId: string, cb: (jobs: Job[]) => void) => {
  const q = query(
    collection(db, 'jobs'),
    where('posterId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Job)));
  });
};

// Conversations (offers)
export const createConversation = async (data: Omit<Conversation, 'id' | 'createdAt'>) => {
  const existing = await getDocs(
    query(
      collection(db, 'conversations'),
      where('jobId', '==', data.jobId),
      where('driverId', '==', data.driverId)
    )
  );
  if (!existing.empty) return existing.docs[0].id;
  const ref = await addDoc(collection(db, 'conversations'), {
    ...data,
    createdAt: Date.now(),
  });
  return ref.id;
};

export const updateConversation = (convId: string, data: Partial<Conversation>) =>
  updateDoc(doc(db, 'conversations', convId), data);

export const archiveJobConversations = async (jobId: string) => {
  const snap = await getDocs(
    query(collection(db, 'conversations'), where('jobId', '==', jobId))
  );
  await Promise.all(
    snap.docs.map(d => updateDoc(d.ref, { status: 'completed' }))
  );
};

export const listenToJobConversations = (jobId: string, cb: (convs: Conversation[]) => void) => {
  const q = query(
    collection(db, 'conversations'),
    where('jobId', '==', jobId),
    orderBy('lastMessageAt', 'desc')
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation)));
  });
};

export const listenToDriverConversations = (driverId: string, cb: (convs: Conversation[]) => void) => {
  const q = query(
    collection(db, 'conversations'),
    where('driverId', '==', driverId),
    orderBy('lastMessageAt', 'desc')
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation)));
  });
};

export const listenToDriverJobHistory = (driverId: string, cb: (jobs: Job[]) => void) => {
  const q = query(
    collection(db, 'jobs'),
    where('acceptedDriverId', '==', driverId),
    where('status', 'in', ['completed', 'cancelled']),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Job)));
  });
};

export const listenToDriverActiveJob = (driverId: string, cb: (job: Job | null) => void) => {
  const q = query(
    collection(db, 'jobs'),
    where('acceptedDriverId', '==', driverId),
    where('status', 'in', ['accepted', 'arrived', 'in_progress']),
  );
  return onSnapshot(q, snap => {
    cb(snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as Job));
  });
};

export const listenToUserConversations = (userId: string, cb: (convs: Conversation[]) => void) => {
  const q = query(
    collection(db, 'conversations'),
    where('userId', '==', userId),
    orderBy('lastMessageAt', 'desc')
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation)));
  });
};

// Messages
export const sendMessage = async (
  convId: string,
  msg: Omit<Message, 'id' | 'timestamp'>,
  quotePrice?: number
) => {
  const msgData: any = { ...msg, timestamp: Date.now() };
  if (quotePrice !== undefined) msgData.price = quotePrice;
  await addDoc(collection(db, 'conversations', convId, 'messages'), msgData);
  await updateDoc(doc(db, 'conversations', convId), {
    lastMessage: msg.type === 'image' ? '📷 Photo' : msg.type === 'quote' ? `Quote: R${quotePrice}` : msg.text,
    lastMessageAt: Date.now(),
    ...(quotePrice !== undefined ? { quotedPrice: quotePrice } : {}),
  });
};

export const listenToMessages = (convId: string, cb: (msgs: Message[]) => void) => {
  const q = query(
    collection(db, 'conversations', convId, 'messages'),
    orderBy('timestamp', 'asc')
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
  });
};
