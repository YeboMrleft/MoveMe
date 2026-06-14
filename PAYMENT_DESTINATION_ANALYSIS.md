# Payment Flow: Where Does Money Go?

## Current System Architecture

### **Wallets Structure:**
```
/wallets/{uid}/
  ├─ balance: number
  ├─ currency: 'ZAR'
  ├─ transactions/
  │  └─ txId: { type, amount, description, createdAt }
```

Each user (customer & driver) has their own wallet with Firestore.

---

## **Payment Flows**

### **Flow 1: In-App Wallet Payment (At Arrival)**

**Customer:**
```
Customer wallet: R100 available
Customer clicks "Pay in-app"
↓
Cloud Function: settleJobFromWallet()
  ├─ Deduct R100 from customer wallet
  ├─ Calculate: Driver gets R88 (12% commission)
  ├─ Add R88 to driver wallet
  ├─ WHERE DOES R12 GO?
  └─ Create transaction logs
```

**Question:** 🔴 **The R12 commission is NOT being stored anywhere in the current code!**

---

### **Flow 2: Cash Payment (Hand-to-Hand)**

```
Customer has cash
Driver arrives
Customer clicks "Pay Cash"
Driver gets confirmation alert
Driver completes delivery

AFTER delivery:
Cloud Function: chargeDriverCommission()
  └─ Try to deduct R12 (12%) from driver wallet as commission
     ├─ If driver has R12: Deducted ✓
     ├─ If driver has <R12: SILENTLY FAILS ❌
     └─ WHERE DOES THIS R12 GO? (Also nowhere!)
```

---

### **Flow 3: Wallet Top-Up**

```
Customer loads wallet with R500
PayFast integration:
  ├─ R500 goes to Move-Me PayFast merchant account
  ├─ Move-Me business account receives R500
  ├─ R500 credited to customer's Move-Me wallet
  └─ Move-Me keeps R500 in their business bank
```

**This IS going to your business account** ✅

---

## 🚨 **CRITICAL ISSUE: Commission Disappears**

### **In-App Payments:**
```
Example: R100 job
Customer pays: R100 (to customer wallet)
Driver receives: R88 (to driver wallet)
Commission: R12 (LOST! 🔴)
```

### **Cash Payments:**
```
Example: R100 job
Customer pays: R100 cash to driver (not app)
Driver commission: R12 deducted from driver wallet (if they have it)
Commission goes: NOWHERE (to deleted transaction?)
```

---

## **What SHOULD Happen**

### **Recommended Commission Flow:**

```
/wallets/BUSINESS_ACCOUNT/
  ├─ balance: accumulated commissions
  └─ transactions/
     └─ job-123: { type: 'commission', amount: 12, from: 'driver-456' }
```

**Better Yet: Separate Column**

```
/platformMetrics/{date}/
  ├─ totalRevenue: 0
  ├─ totalCommissions: 0
  ├─ totalJobs: 0
  └─ transactions: [...]
```

---

## **Current Money Tracking**

| Payment Type | Customer | Driver | Commission | Business |
|--------------|----------|--------|------------|----------|
| **Wallet Payment** | Deducted ✓ | +88% ✓ | Lost ❌ | Lost ❌ |
| **Cash Payment** | Direct ✓ | Manual ✓ | Lost ❌ | Lost ❌ |
| **Top-Up** | -R500 ✓ | N/A | N/A | +R500 ✓ |

---

## **Answer to Your Question**

### **Currently:**
- ❌ Top-up payments come to your PayFast merchant account
- ❌ In-app commissions are NOT being tracked
- ❌ Cash payment commissions disappear silently
- ❌ You have NO visibility into total earnings

### **What's Broken:**
1. No business wallet to receive commissions
2. No accounting for where 12% goes
3. No financial reports/dashboards
4. No way to track profitability

---

## **Recommended Fix**

### **Create Business Wallet:**

```typescript
// Add to walletService.ts
export const listenToBusinessMetrics = (cb: (metrics: BusinessMetrics) => void) =>
  onSnapshot(doc(db, 'business', 'metrics'), snap => {
    cb(snap.data() as BusinessMetrics);
  });

// Structure:
/business/metrics/
  ├─ totalBalance: 0
  ├─ totalCommissionsEarned: 0
  ├─ totalTransactions: 0
  ├─ byDate: {
  │  '2026-06-14': {
  │    commissions: 1250,
  │    jobsCompleted: 25,
  │    totalPaymentVolume: 10500
  │  }
  └─ transactions/ ← Ledger of all commissions
```

### **Update Cloud Functions:**

```
settleJobFromWallet() should:
1. Deduct from customer: R100
2. Add to driver: R88
3. Add to business/metrics: R12 ← **NEW**
4. Log transaction to business/metrics/transactions

chargeDriverCommission() should:
1. Deduct from driver: R12
2. Add to business/metrics: R12
3. Log with jobId reference
```

---

## **Implementation Priority**

**Priority 1: Create business metrics collection** (1 hour)
```
/business/metrics/ with totalBalance, transactionHistory
```

**Priority 2: Update Cloud Functions** (2 hours)
```
All payment functions route commission to /business/metrics
```

**Priority 3: Add admin dashboard** (3 hours)
```
View daily/weekly/monthly revenue
See commission breakdown by job type
```

**Priority 4: Add business wallet withdrawal** (1 hour)
```
Transfer business balance to actual bank account
```

---

## **Bottom Line**

Right now:
- ✅ You get top-up money (PayFast)
- ❌ You lose commission money (not tracked)
- ❌ You have no financial dashboard
- ❌ You can't prove your earnings to investors/tax/bank

**Fix needed:** Track where the 12% commission actually goes.
