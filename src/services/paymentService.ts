import { db } from './firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export type PaymentPurpose = 'driver_offer' | 'sender_accept';

const FUNCTIONS_BASE = 'https://us-central1-move-me-acc55.cloudfunctions.net';

export async function initPayment(
  purpose: PaymentPurpose,
  referenceId: string,
  buyerName?: string,
  buyerEmail?: string,
): Promise<{ paymentId: string; html: string }> {
  const uid = getAuth().currentUser?.uid ?? '';

  const ref = await addDoc(collection(db, 'payments'), {
    uid,
    purpose,
    referenceId,
    amount: 10,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  const paymentId = ref.id;

  const res = await fetch(`${FUNCTIONS_BASE}/generateMoveMePayFastURL`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId, purpose, buyerName, buyerEmail }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Could not generate payment URL');
  }

  const { html } = await res.json();
  return { paymentId, html };
}

export async function completePayment(paymentId: string) {
  await updateDoc(doc(db, 'payments', paymentId), {
    status: 'complete',
    completedAt: serverTimestamp(),
  });
}

export async function cancelPayment(paymentId: string) {
  await updateDoc(doc(db, 'payments', paymentId), { status: 'cancelled' });
}
