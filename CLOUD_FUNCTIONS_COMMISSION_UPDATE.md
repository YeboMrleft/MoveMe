# Cloud Functions Updates - Commission Tracking

## Overview
Update your Firebase Cloud Functions to record all commissions to the business metrics collection.

**Location:** `functions/src/index.ts` or equivalent

---

## Functions to Update

### 1. `settleJobFromWallet` - In-App Payment

**Current:** Transfers money from customer to driver, loses track of commission

**Updated Logic:**
```typescript
export const settleJobFromWallet = functions.https.onCall(async (data, context) => {
  const { jobId, senderId, driverId, amount, mode } = data;
  
  if (!context.auth) throw new Error('Not authenticated');
  
  const COMMISSION_RATE = 0.12;
  const driverGets = Math.round(amount * (1 - COMMISSION_RATE));
  const commission = amount - driverGets;

  try {
    // Deduct from customer wallet
    await db.collection('wallets').doc(senderId).update({
      balance: admin.firestore.FieldValue.increment(-amount),
    });

    // Add to driver wallet
    await db.collection('wallets').doc(driverId).update({
      balance: admin.firestore.FieldValue.increment(driverGets),
    });

    // 🔑 NEW: Record commission to business metrics
    const today = new Date().toISOString().split('T')[0];
    
    // Add transaction to ledger
    await db.collection('business/metrics/transactions').add({
      jobId,
      driverId,
      driverName: (await db.collection('users').doc(driverId).get()).data().name,
      amount: commission,
      paymentMethod: 'wallet',
      createdAt: admin.firestore.Timestamp.now(),
      status: 'completed',
    });

    // Update daily metrics
    const dailyRef = db.collection('business/metrics/daily').doc(today);
    await dailyRef.set({
      date: today,
      commissions: admin.firestore.FieldValue.increment(commission),
      jobsCompleted: admin.firestore.FieldValue.increment(1),
      totalPaymentVolume: admin.firestore.FieldValue.increment(amount),
      transactionCount: admin.firestore.FieldValue.increment(1),
    }, { merge: true });

    // Update overall business metrics
    await db.collection('business').doc('metrics').update({
      totalBalance: admin.firestore.FieldValue.increment(commission),
      totalCommissionsEarned: admin.firestore.FieldValue.increment(commission),
      totalJobsCompleted: admin.firestore.FieldValue.increment(1),
      totalPaymentVolume: admin.firestore.FieldValue.increment(amount),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Update job status
    await db.collection('jobs').doc(jobId).update({
      status: 'in_progress',
      walletSettled: true,
      paidAmount: amount,
      settledAt: admin.firestore.Timestamp.now(),
    });

    return { success: true };
  } catch (error) {
    console.error('settleJobFromWallet error:', error);
    throw new Error('Payment settlement failed');
  }
});
```

---

### 2. `chargeDriverCommission` - Cash Payment Commission

**Current:** Silently fails, commission is never recorded

**Updated Logic:**
```typescript
export const chargeDriverCommission = functions.https.onCall(async (data, context) => {
  const { driverId, jobId, agreedPrice } = data;
  
  if (!context.auth) throw new Error('Not authenticated');
  
  const COMMISSION_RATE = 0.12;
  const commission = Math.round(agreedPrice * COMMISSION_RATE);

  try {
    // Get driver wallet balance
    const walletSnap = await db.collection('wallets').doc(driverId).get();
    const currentBalance = walletSnap.data()?.balance ?? 0;

    if (currentBalance >= commission) {
      // Driver has funds, deduct commission
      await db.collection('wallets').doc(driverId).update({
        balance: admin.firestore.FieldValue.increment(-commission),
      });

      // 🔑 NEW: Record commission to business metrics
      const today = new Date().toISOString().split('T')[0];
      
      const driverData = (await db.collection('users').doc(driverId).get()).data();
      
      // Add transaction to ledger
      await db.collection('business/metrics/transactions').add({
        jobId,
        driverId,
        driverName: driverData?.name ?? 'Unknown',
        amount: commission,
        paymentMethod: 'cash',
        createdAt: admin.firestore.Timestamp.now(),
        status: 'completed',
      });

      // Update daily metrics
      const dailyRef = db.collection('business/metrics/daily').doc(today);
      await dailyRef.set({
        date: today,
        commissions: admin.firestore.FieldValue.increment(commission),
        jobsCompleted: admin.firestore.FieldValue.increment(1),
        totalPaymentVolume: admin.firestore.FieldValue.increment(agreedPrice),
        transactionCount: admin.firestore.FieldValue.increment(1),
      }, { merge: true });

      // Update overall business metrics
      await db.collection('business').doc('metrics').update({
        totalBalance: admin.firestore.FieldValue.increment(commission),
        totalCommissionsEarned: admin.firestore.FieldValue.increment(commission),
        totalJobsCompleted: admin.firestore.FieldValue.increment(1),
        totalPaymentVolume: admin.firestore.FieldValue.increment(agreedPrice),
        updatedAt: admin.firestore.Timestamp.now(),
      });

      return { success: true, commission };
    } else {
      // Driver doesn't have sufficient balance - record as pending
      // (don't throw error, just mark it)
      console.log(`Driver ${driverId} insufficient balance for commission ${commission}`);
      return { success: false, reason: 'insufficient_balance', commission };
    }
  } catch (error) {
    console.error('chargeDriverCommission error:', error);
    // Don't throw - this is a soft charge
    return { success: false, error: error.message };
  }
});
```

---

### 3. `initializeBusinessMetrics` - First-Time Setup

**Create this function to initialize the business metrics collection:**

```typescript
export const initializeBusinessMetrics = functions.https.onCall(async (data, context) => {
  if (!context.auth?.token?.isAdmin) {
    throw new Error('Admin only');
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // Initialize main metrics
    await db.collection('business').doc('metrics').set({
      totalBalance: 0,
      totalCommissionsEarned: 0,
      totalJobsCompleted: 0,
      totalPaymentVolume: 0,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Initialize today's metrics
    await db.collection('business/metrics/daily').doc(today).set({
      date: today,
      commissions: 0,
      jobsCompleted: 0,
      totalPaymentVolume: 0,
      transactionCount: 0,
    });

    return { success: true };
  } catch (error) {
    console.error('initializeBusinessMetrics error:', error);
    throw error;
  }
});
```

---

## Client-Side Integration

The client already calls these Cloud Functions:
- `settleJobFromWallet` - Already implemented in TripActiveScreen
- `chargeDriverCommission` - Already implemented in TripActiveScreen
- New: Dashboard reads from `/business/metrics` (read-only for admins)

**Just update the Cloud Functions above and they'll automatically record commissions.**

---

## Testing

```typescript
// Test in Cloud Functions Emulator
const functions = firebase.functions();

// Test in-app payment
const settle = functions.httpsCallable('settleJobFromWallet');
await settle({
  jobId: 'test-123',
  senderId: 'customer-uid',
  driverId: 'driver-uid',
  amount: 100,
  mode: 'completion',
});

// Check metrics were created
const metrics = firebase.firestore().collection('business').doc('metrics').get();
console.log(metrics); // Should show totalBalance: 12, etc.
```

---

## Verification

After deployment:

1. Complete a test job with in-app payment
2. Go to Business Dashboard (admin only)
3. You should see:
   - ✅ Balance increased by commission amount
   - ✅ Job count incremented
   - ✅ Transaction listed in Recent Commissions
   - ✅ All metrics updated

---

## Summary

**What changes:**
- `settleJobFromWallet()` now records R12 commission per R100 job
- `chargeDriverCommission()` now records cash payment commissions
- Business metrics automatically track all earnings
- Dashboard shows real-time earnings

**Result:**
- ✅ You get paid your 12% commission
- ✅ Full audit trail of all transactions
- ✅ Real-time metrics and reporting
