import { doc, collection, onSnapshot, updateDoc, arrayUnion, increment, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface CommissionTransaction {
  id: string;
  jobId: string;
  driverId: string;
  driverName: string;
  amount: number;
  paymentMethod: 'wallet' | 'cash';
  createdAt: number;
  status: 'pending' | 'completed' | 'disputed';
}

export interface BusinessMetrics {
  totalBalance: number;
  totalCommissionsEarned: number;
  totalJobsCompleted: number;
  totalPaymentVolume: number;
  updatedAt: number;
}

export interface DailyMetrics {
  date: string; // YYYY-MM-DD
  commissions: number;
  jobsCompleted: number;
  totalPaymentVolume: number;
  transactionCount: number;
}

/**
 * Listen to real-time business metrics (overall stats)
 */
export const listenToBusinessMetrics = (cb: (metrics: BusinessMetrics | null) => void) => {
  return onSnapshot(doc(db, 'business', 'metrics'), snap => {
    cb(snap.exists() ? (snap.data() as BusinessMetrics) : null);
  });
};

/**
 * Listen to daily metrics breakdown
 */
export const listenToDailyMetrics = (cb: (metrics: Map<string, DailyMetrics>) => void) => {
  return onSnapshot(collection(db, 'business/metrics/daily'), snap => {
    const map = new Map<string, DailyMetrics>();
    snap.docs.forEach(doc => {
      map.set(doc.id, doc.data() as DailyMetrics);
    });
    cb(map);
  });
};

/**
 * Listen to commission transaction history
 */
export const listenToCommissionTransactions = (cb: (txs: CommissionTransaction[]) => void) => {
  return onSnapshot(
    collection(db, 'business/metrics/transactions'),
    snap => {
      cb(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommissionTransaction)));
    }
  );
};

/**
 * Record a commission transaction (called by Cloud Function)
 * This is called server-side, but you can call it from client for testing
 */
export const recordCommissionTransaction = async (
  jobId: string,
  driverId: string,
  driverName: string,
  amount: number,
  paymentMethod: 'wallet' | 'cash'
): Promise<void> => {
  const today = new Date().toISOString().split('T')[0];

  // Add to transactions ledger
  await updateDoc(doc(db, 'business/metrics/transactions', `${jobId}-${Date.now()}`), {
    jobId,
    driverId,
    driverName,
    amount,
    paymentMethod,
    createdAt: Date.now(),
    status: 'completed',
  });

  // Update daily metrics
  const dailyRef = doc(db, 'business/metrics/daily', today);
  await updateDoc(dailyRef, {
    commissions: increment(amount),
    jobsCompleted: increment(1),
    totalPaymentVolume: increment(amount * (100 / 12)), // Reverse-calculate from commission
    transactionCount: increment(1),
  }).catch(async () => {
    // If daily doc doesn't exist, create it
    await updateDoc(dailyRef, {
      date: today,
      commissions: amount,
      jobsCompleted: 1,
      totalPaymentVolume: amount * (100 / 12),
      transactionCount: 1,
    });
  });

  // Update overall metrics
  await updateDoc(doc(db, 'business/metrics'), {
    totalBalance: increment(amount),
    totalCommissionsEarned: increment(amount),
    totalJobsCompleted: increment(1),
    totalPaymentVolume: increment(amount * (100 / 12)),
    updatedAt: serverTimestamp(),
  });
};

/**
 * Get commission summary for a date range
 */
export const getCommissionSummary = async (
  startDate: string,
  endDate: string
): Promise<{
  totalCommissions: number;
  totalJobs: number;
  totalVolume: number;
  avgCommissionPerJob: number;
}> => {
  // This would be implemented in Cloud Function
  // For now, return placeholder
  return {
    totalCommissions: 0,
    totalJobs: 0,
    totalVolume: 0,
    avgCommissionPerJob: 0,
  };
};

/**
 * Request withdrawal of business balance to bank account
 */
export const requestBusinessWithdrawal = async (
  amount: number,
  bankDetails: {
    accountHolder: string;
    accountNumber: string;
    bank: string;
    accountType: 'cheque' | 'savings';
  }
): Promise<{ withdrawalId: string }> => {
  // This calls a Cloud Function to initiate bank transfer
  const res = await fetch('https://us-central1-move-me-acc55.cloudfunctions.net/requestBusinessWithdrawal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, bankDetails }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Withdrawal request failed');
  return data;
};
