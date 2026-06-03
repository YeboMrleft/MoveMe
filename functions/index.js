const { setGlobalOptions } = require('firebase-functions/v2/options');
const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();
setGlobalOptions({ maxInstances: 10 });

const db = admin.firestore();

// ── Commission ────────────────────────────────────────────────────────────────
const COMMISSION_RATE = 0.12; // 12% of agreed price on every completed job

function setCors(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
}

// ── Wallet helpers (run inside Firestore transactions) ────────────────────────
async function creditWallet(tx, uid, amount, type, description, jobId = null) {
  const walletRef = db.collection('wallets').doc(uid);
  const snap = await tx.get(walletRef);
  const current = snap.exists ? (snap.data().balance ?? 0) : 0;
  const next = parseFloat((current + amount).toFixed(2));

  if (snap.exists) {
    tx.update(walletRef, { balance: next, updatedAt: Date.now() });
  } else {
    tx.set(walletRef, { balance: next, currency: 'ZAR', updatedAt: Date.now() });
  }

  const txRef = walletRef.collection('transactions').doc();
  tx.set(txRef, {
    type, amount, description,
    ...(jobId && { jobId }),
    status: 'completed',
    createdAt: Date.now(),
  });

  return next;
}

async function debitWallet(tx, uid, amount, type, description, jobId = null) {
  const walletRef = db.collection('wallets').doc(uid);
  const snap = await tx.get(walletRef);
  if (!snap.exists) throw new Error('Wallet not found');

  const current = snap.data().balance ?? 0;
  if (current < amount) throw new Error('Insufficient wallet balance');

  const next = parseFloat((current - amount).toFixed(2));
  tx.update(walletRef, { balance: next, updatedAt: Date.now() });

  const txRef = walletRef.collection('transactions').doc();
  tx.set(txRef, {
    type, amount: -amount, description,
    ...(jobId && { jobId }),
    status: 'completed',
    createdAt: Date.now(),
  });

  return next;
}

// ── Generate PayFast URL ──────────────────────────────────────────────────────
exports.generateMoveMePayFastURL = onRequest({ invoker: 'public' }, async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { paymentId, purpose, buyerName, buyerEmail, uid, amount: reqAmount } = req.body;
    if (!paymentId) return res.status(400).json({ error: 'paymentId required' });

    const HOSTING_BASE = 'https://move-me-acc55.web.app';
    const RETURN_URL   = `${HOSTING_BASE}/payment/success`;
    const CANCEL_URL   = `${HOSTING_BASE}/payment/cancel`;
    const NOTIFY_URL   = `https://us-central1-move-me-acc55.cloudfunctions.net/moveMePayFastNotify`;

    const merchantId  = process.env.PAYFAST_MERCHANT_ID  || '10000100';
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY || '46f0cd694581a';
    const passphrase  = process.env.PAYFAST_PASSPHRASE   || '';
    const isSandbox   = process.env.PAYFAST_SANDBOX === 'true' || merchantId === '10000100';

    const firstName = (buyerName || 'Customer').split(' ')[0];
    const lastName  = (buyerName || '').split(' ').slice(1).join(' ') || 'User';

    // Determine amount: wallet top-up uses variable amount, platform fee is fixed
    const isTopup = purpose === 'wallet_topup';
    const amount = isTopup && reqAmount ? parseFloat(reqAmount).toFixed(2) : '10.00';

    const params = {
      merchant_id:      merchantId,
      merchant_key:     merchantKey,
      return_url:       RETURN_URL,
      cancel_url:       CANCEL_URL,
      notify_url:       NOTIFY_URL,
      name_first:       firstName,
      name_last:        lastName,
      email_address:    buyerEmail || 'customer@moveme.app',
      m_payment_id:     `MM-${paymentId}`,
      amount,
      item_name:        isTopup ? 'Move-Me Wallet Top-Up' : 'Move-Me Platform Fee',
      item_description: isTopup
        ? `Wallet top-up R${amount}`
        : (purpose === 'driver_offer' ? 'Driver offer submission fee' : 'Job acceptance fee'),
      custom_str1:      paymentId,
      custom_str2:      purpose || '',
      ...(isTopup && uid ? { custom_str3: uid } : {}),
    };

    const pfEncode = (val) =>
      encodeURIComponent(String(val).trim())
        .replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28')
        .replace(/\)/g, '%29').replace(/\*/g, '%2A').replace(/~/g, '%7E')
        .replace(/%20/g, '+');

    const sigString = Object.entries(params)
      .filter(([, v]) => v !== '' && v != null)
      .map(([k, v]) => `${k}=${pfEncode(v)}`)
      .join('&');

    const stringToHash = passphrase
      ? `${sigString}&passphrase=${pfEncode(passphrase)}`
      : sigString;

    const signature = crypto.createHash('md5').update(stringToHash).digest('hex');
    if (passphrase) params.signature = signature;

    const payfastHost = isSandbox
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process';

    const inputs = Object.entries(params)
      .map(([k, v]) => `<input type="hidden" name="${k}" value="${String(v).replace(/"/g, '&quot;')}">`)
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f5f5f5;display:flex;align-items:center;justify-content:center;height:100vh;">
<p style="font-family:sans-serif;color:#555;font-size:15px;">Connecting to PayFast…</p>
<form method="POST" action="${payfastHost}" id="pf">${inputs}</form>
<script>setTimeout(function(){document.getElementById('pf').submit();},400);</script>
</body>
</html>`;

    res.json({ html, paymentId });
  } catch (error) {
    logger.error('generateMoveMePayFastURL error:', error);
    res.status(500).json({ error: 'Could not generate payment URL' });
  }
});

// ── PayFast ITN Webhook ───────────────────────────────────────────────────────
exports.moveMePayFastNotify = onRequest({ invoker: 'public' }, async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const passphrase = process.env.PAYFAST_PASSPHRASE || '';
    const data = { ...req.body };
    const receivedSignature = data.signature;
    delete data.signature;

    const queryString = Object.keys(data)
      .sort()
      .filter(k => data[k] !== '' && data[k] != null)
      .map(k => `${k}=${encodeURIComponent(data[k]).replace(/%20/g, '+')}`)
      .join('&');

    const stringToHash = passphrase
      ? `${queryString}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`
      : queryString;

    const computedSignature = crypto.createHash('md5').update(stringToHash).digest('hex');

    if (receivedSignature !== computedSignature) {
      logger.error('ITN invalid signature', { received: receivedSignature, computed: computedSignature });
      return res.status(400).send('Invalid signature');
    }

    if (data.payment_status !== 'COMPLETE') {
      logger.info('ITN payment not complete:', data.payment_status);
      return res.status(200).send('OK');
    }

    const paymentId = data.custom_str1;
    const purpose   = data.custom_str2;
    const uid       = data.custom_str3;

    if (!paymentId) return res.status(400).send('Missing paymentId');

    // ── Wallet top-up: credit the wallet ──────────────────────────────────────
    if (purpose === 'wallet_topup' && uid) {
      const amount = parseFloat(data.amount_gross);
      if (isNaN(amount) || amount <= 0) {
        logger.error('ITN wallet topup invalid amount', { amount: data.amount_gross });
        return res.status(400).send('Invalid amount');
      }

      await db.runTransaction(async (tx) => {
        await creditWallet(tx, uid, amount, 'topup', `Wallet top-up via PayFast`);
      });

      // Update payment record if it exists
      const payRef = db.collection('payments').doc(paymentId);
      const paySnap = await payRef.get();
      if (paySnap.exists) {
        await payRef.update({ status: 'complete', itnData: data, completedAt: admin.firestore.FieldValue.serverTimestamp() });
      }

      logger.info('Wallet top-up credited:', { uid, amount });
      return res.status(200).send('OK');
    }

    // ── Platform fee: fixed R10 ───────────────────────────────────────────────
    if (parseFloat(data.amount_gross) !== 10.00) {
      logger.error('ITN amount mismatch', { received: data.amount_gross });
      return res.status(400).send('Amount mismatch');
    }

    await db.collection('payments').doc(paymentId).update({
      status:      'complete',
      itnData:     data,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info('ITN payment confirmed:', paymentId);
    res.status(200).send('OK');
  } catch (error) {
    logger.error('moveMePayFastNotify error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// ── Check Payment Status ──────────────────────────────────────────────────────
exports.checkMoveMePayment = onRequest({ invoker: 'public' }, async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  try {
    const { paymentId } = req.query;
    if (!paymentId) return res.status(400).json({ error: 'paymentId required' });
    const snap = await db.collection('payments').doc(paymentId).get();
    if (!snap.exists) return res.status(404).json({ error: 'Not found' });
    const d = snap.data();
    res.json({ status: d.status, amount: d.amount, purpose: d.purpose });
  } catch (error) {
    logger.error('checkMoveMePayment error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ── Charge driver commission (cash jobs) ──────────────────────────────────────
// Called at job completion when sender paid cash.
// Deducts 12% of agreed price from driver wallet. Soft: records pending if insufficient.
exports.chargeDriverCommission = onRequest({ invoker: 'public' }, async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { driverId, jobId, agreedPrice } = req.body;
    if (!driverId || !jobId || !agreedPrice) {
      return res.status(400).json({ error: 'driverId, jobId, agreedPrice required' });
    }

    const price = parseFloat(agreedPrice);
    const commission = parseFloat((price * COMMISSION_RATE).toFixed(2));

    const walletRef = db.collection('wallets').doc(driverId);
    const snap = await walletRef.get();
    const balance = snap.exists ? (snap.data().balance ?? 0) : 0;

    if (balance >= commission) {
      await db.runTransaction(async (tx) => {
        await debitWallet(tx, driverId, commission, 'platform_fee',
          `Move-Me commission (12% of R${price.toFixed(0)})`, jobId);
      });
      return res.json({ success: true, deducted: true, commission });
    }

    // Insufficient balance — record as pending
    await walletRef.collection('transactions').add({
      type: 'platform_fee',
      amount: -commission,
      description: `Move-Me commission pending — top up wallet to pay`,
      jobId,
      status: 'pending',
      createdAt: Date.now(),
    });
    return res.json({ success: true, deducted: false, pending: true, commission });
  } catch (error) {
    logger.error('chargeDriverCommission error:', error);
    res.status(500).json({ error: error.message || 'Could not charge commission' });
  }
});

// ── Settle job payment from wallet ───────────────────────────────────────────
// mode='arrival': sender pays discounted amount, driver gets it all, job → in_progress
// mode='completion': sender pays full amount, driver gets amount-fee (existing)
exports.settleJobFromWallet = onRequest({ invoker: 'public' }, async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { jobId, senderId, driverId, amount, mode = 'completion' } = req.body;
    if (!jobId || !senderId || !driverId || !amount) {
      return res.status(400).json({ error: 'jobId, senderId, driverId, amount required' });
    }

    const total = parseFloat(amount);
    if (isNaN(total) || total <= 0) return res.status(400).json({ error: 'Invalid amount' });

    // Commission: Move-Me takes 12%, driver keeps 88%
    const commission    = parseFloat((total * COMMISSION_RATE).toFixed(2));
    const driverEarning = parseFloat((total - commission).toFixed(2));
    const isArrival     = mode === 'arrival';

    await db.runTransaction(async (tx) => {
      await debitWallet(tx, senderId, total, 'job_payment',
        `Job payment (in-app)`, jobId);

      await creditWallet(tx, driverId, driverEarning, 'job_earning',
        `Trip earnings — R${commission.toFixed(2)} (12%) Move-Me commission`, jobId);

      const jobRef = db.collection('jobs').doc(jobId);
      tx.update(jobRef, {
        walletSettled: true,
        walletSettledAt: Date.now(),
        paymentMethod: 'wallet',
        paidAmount: total,
        commission,
        ...(isArrival ? { status: 'in_progress' } : {}),
      });
    });

    logger.info('Job settled from wallet:', { jobId, mode, total, driverEarning, commission });
    res.json({ success: true, senderDebited: total, driverCredited: driverEarning, commission });
  } catch (error) {
    logger.error('settleJobFromWallet error:', error);
    res.status(500).json({ error: error.message || 'Could not settle job payment' });
  }
});

// ── Cancel job with fee (20% if in-app payment was made) ─────────────────────
exports.cancelJobWithFee = onRequest({ invoker: 'public' }, async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { jobId, senderId, driverId } = req.body;
    if (!jobId || !senderId) return res.status(400).json({ error: 'jobId and senderId required' });

    const jobRef = db.collection('jobs').doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) return res.status(404).json({ error: 'Job not found' });

    const job = jobSnap.data();
    const paidAmount = job.paidAmount ?? 0;
    const wasInAppPaid = job.walletSettled && paidAmount > 0;

    if (!wasInAppPaid) {
      // No payment made — just cancel with no fee
      await jobRef.update({ status: 'cancelled' });
      return res.json({ success: true, cancellationFee: 0, refunded: 0 });
    }

    const CANCEL_FEE_RATE = 0.20; // 20%
    const cancellationFee = parseFloat((paidAmount * CANCEL_FEE_RATE).toFixed(2));
    const refundAmount    = parseFloat((paidAmount - cancellationFee).toFixed(2));

    await db.runTransaction(async (tx) => {
      // Refund 80% to sender wallet
      await creditWallet(tx, senderId, refundAmount, 'refund',
        `Cancellation refund (80%) — R${cancellationFee} fee retained`, jobId);

      // Cancel the job
      tx.update(jobRef, {
        status: 'cancelled',
        cancellationFee,
        refundedAmount: refundAmount,
        cancelledAt: Date.now(),
      });

      // Driver compensation: 50% of cancellation fee (10% of total paid)
      if (driverId) {
        const driverComp = parseFloat((cancellationFee * 0.5).toFixed(2));
        await creditWallet(tx, driverId, driverComp, 'refund',
          `Cancellation compensation for arrived job`, jobId);
      }
    });

    logger.info('Job cancelled with fee:', { jobId, paidAmount, cancellationFee, refundAmount });
    res.json({ success: true, cancellationFee, refunded: refundAmount });
  } catch (error) {
    logger.error('cancelJobWithFee error:', error);
    res.status(500).json({ error: error.message || 'Could not cancel job' });
  }
});

// ── Request withdrawal ────────────────────────────────────────────────────────
exports.requestWithdrawal = onRequest({ invoker: 'public' }, async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { uid, driverName, amount, bankDetails } = req.body;
    if (!uid || !amount || !bankDetails) {
      return res.status(400).json({ error: 'uid, amount, and bankDetails required' });
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < 50) {
      return res.status(400).json({ error: 'Minimum withdrawal is R50' });
    }

    await db.runTransaction(async (tx) => {
      await debitWallet(tx, uid, withdrawAmount, 'withdrawal',
        `Withdrawal to ${bankDetails.bank} ****${bankDetails.accountNumber.slice(-4)}`);

      const reqRef = db.collection('withdrawalRequests').doc();
      tx.set(reqRef, {
        uid, driverName, amount: withdrawAmount, bankDetails,
        status: 'pending',
        createdAt: Date.now(),
      });
    });

    logger.info('Withdrawal requested:', { uid, amount: withdrawAmount });
    res.json({ success: true });
  } catch (error) {
    logger.error('requestWithdrawal error:', error);
    res.status(500).json({ error: error.message || 'Could not submit withdrawal request' });
  }
});
