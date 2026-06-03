import { doc, collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import { WalletTransaction } from '../types';

const CLOUD_BASE = 'https://us-central1-move-me-acc55.cloudfunctions.net';

export interface WalletData {
  balance: number;
  currency: 'ZAR';
  updatedAt: number;
}

export const listenToWallet = (uid: string, cb: (wallet: WalletData | null) => void) =>
  onSnapshot(doc(db, 'wallets', uid), snap => {
    cb(snap.exists() ? (snap.data() as WalletData) : null);
  });

export const listenToWalletTransactions = (
  uid: string,
  cb: (txs: WalletTransaction[]) => void
) => {
  const q = query(
    collection(db, 'wallets', uid, 'transactions'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as WalletTransaction)))
  );
};

async function callFn(endpoint: string, body: object): Promise<any> {
  const res = await fetch(`${CLOUD_BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || `${endpoint} failed`);
  return data;
}

export const generateTopUpURL = (
  uid: string,
  amount: number,
  name?: string,
  email?: string
): Promise<{ html: string; paymentId: string }> =>
  callFn('generateMoveMePayFastURL', {
    paymentId: `topup-${uid}-${Date.now()}`,
    purpose: 'wallet_topup',
    amount: amount.toFixed(2),
    buyerName: name,
    buyerEmail: email,
    uid,
  });

export const chargeDriverCommission = (
  driverId: string,
  jobId: string,
  agreedPrice: number
): Promise<void> =>
  callFn('chargeDriverCommission', { driverId, jobId, agreedPrice });

export const settleJobFromWallet = (
  jobId: string,
  senderId: string,
  driverId: string,
  amount: number,
  mode: 'arrival' | 'completion' = 'completion'
): Promise<void> =>
  callFn('settleJobFromWallet', { jobId, senderId, driverId, amount, mode });

export const cancelJobWithFee = (
  jobId: string,
  senderId: string,
  driverId?: string
): Promise<{ cancellationFee: number; refunded: number }> =>
  callFn('cancelJobWithFee', { jobId, senderId, driverId });


export const requestWithdrawal = (
  uid: string,
  driverName: string,
  amount: number,
  bankDetails: { bank: string; accountHolder: string; accountNumber: string; accountType: 'cheque' | 'savings' }
): Promise<void> =>
  callFn('requestWithdrawal', { uid, driverName, amount, bankDetails });
