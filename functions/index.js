const { setGlobalOptions } = require('firebase-functions/v2/options');
const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();
setGlobalOptions({ maxInstances: 10 });

function setCors(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
}

// ── Generate PayFast URL ──────────────────────────────────────────────────────
// Called by the app before opening the payment browser.
// Keeps merchant credentials off the device.
exports.generateMoveMePayFastURL = onRequest({ invoker: 'public' }, async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { paymentId, purpose, buyerName, buyerEmail } = req.body;
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
      amount:           '10.00',
      item_name:        'Move-Me Platform Fee',
      item_description: purpose === 'driver_offer' ? 'Driver offer submission fee' : 'Job acceptance fee',
      custom_str1:      paymentId,
      custom_str2:      purpose || '',
    };

    // PHP urlencode-compatible encoder (matches PayFast's signature computation exactly)
    const pfEncode = (val) =>
      encodeURIComponent(String(val).trim())
        .replace(/!/g,  '%21')
        .replace(/'/g,  '%27')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29')
        .replace(/\*/g, '%2A')
        .replace(/~/g,  '%7E')
        .replace(/%20/g, '+');

    // Build signature string — exclude empty values, preserve insertion order
    const sigString = Object.entries(params)
      .filter(([, v]) => v !== '' && v != null)
      .map(([k, v]) => `${k}=${pfEncode(v)}`)
      .join('&');

    const stringToHash = passphrase
      ? `${sigString}&passphrase=${pfEncode(passphrase)}`
      : sigString;

    const signature = crypto.createHash('md5').update(stringToHash).digest('hex');
    logger.info('PF sig string:', stringToHash);
    logger.info('PF signature:', signature);

    // Only include signature when passphrase is set — PayFast makes it optional otherwise
    if (passphrase) {
      params.signature = signature;
    }

    const payfastHost = isSandbox
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process';

    // Return an HTML form — POST avoids browser URL re-encoding that breaks GET signatures
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

    res.json({ html });
  } catch (error) {
    logger.error('generateMoveMePayFastURL error:', error);
    res.status(500).json({ error: 'Could not generate payment URL' });
  }
});

// ── PayFast ITN Webhook ───────────────────────────────────────────────────────
// PayFast calls this directly after a completed payment to confirm it server-side.
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

    if (parseFloat(data.amount_gross) !== 10.00) {
      logger.error('ITN amount mismatch', { received: data.amount_gross });
      return res.status(400).send('Amount mismatch');
    }

    const paymentId = data.custom_str1;
    if (!paymentId) return res.status(400).send('Missing paymentId');

    await admin.firestore().collection('payments').doc(paymentId).update({
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
    const snap = await admin.firestore().collection('payments').doc(paymentId).get();
    if (!snap.exists) return res.status(404).json({ error: 'Not found' });
    const d = snap.data();
    res.json({ status: d.status, amount: d.amount, purpose: d.purpose });
  } catch (error) {
    logger.error('checkMoveMePayment error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
