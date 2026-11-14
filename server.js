require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const QRCode = require('qrcode');

const {
  OPENNODE_API_KEY = '', OPENNODE_ENV = 'dev', PAYMENT_AMOUNT = '1.50',
  PAYMENT_CURRENCY = 'USD', PUBLIC_URL = '', CRYPTOVEND_URL = '', PORT = 3000,
} = process.env;

const MOCK = !OPENNODE_API_KEY;
const API = OPENNODE_ENV === 'live' ? 'https://api.opennode.com' : 'https://dev-api.opennode.com';
const orders = new Map(); // id -> { status, credited, createdAt, mockPaidAt }

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // OpenNode webhooks are form-encoded
app.use(express.static('public'));

async function opennode(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: { Authorization: OPENNODE_API_KEY, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || `OpenNode error ${res.status}`);
  return body.data;
}

// Tell the vending machine that credit is available. Runs at most once per order.
async function creditMachine(id) {
  const order = orders.get(id);
  if (!order || order.credited) return;
  order.credited = true;
  const payload = { event: 'credit', orderId: id, amount: PAYMENT_AMOUNT, currency: PAYMENT_CURRENCY };
  if (!CRYPTOVEND_URL) return console.log('[vend] CRYPTOVEND_URL not set, would send:', payload);
  try {
    const r = await fetch(CRYPTOVEND_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    console.log('[vend] credit sent, status', r.status);
  } catch (e) {
    order.credited = false; // allow retry on next poll
    console.error('[vend] credit failed:', e.message);
  }
}

app.get('/api/config', (_req, res) =>
  res.json({ mock: MOCK, amount: PAYMENT_AMOUNT, currency: PAYMENT_CURRENCY }));

app.post('/api/start', async (_req, res) => {
  try {
    let id, payreq;
    if (MOCK) {
      id = 'mock_' + crypto.randomBytes(6).toString('hex');
      payreq = 'lnbc' + crypto.randomBytes(24).toString('hex') + '_MOCK_NOT_A_REAL_INVOICE';
      orders.set(id, { status: 'unpaid', credited: false, createdAt: Date.now(), mockPaidAt: Date.now() + 10000 });
    } else {
      const charge = await opennode('/v1/charges', {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(PAYMENT_AMOUNT), currency: PAYMENT_CURRENCY,
          description: 'Vending machine purchase',
          ...(PUBLIC_URL && { callback_url: PUBLIC_URL.replace(/\/$/, '') + '/api/webhook' }),
        }),
      });
      id = charge.id;
      payreq = charge.lightning_invoice.payreq;
      orders.set(id, { status: 'unpaid', credited: false, createdAt: Date.now() });
    }
    const qr = await QRCode.toDataURL('lightning:' + payreq.toUpperCase(), { margin: 1, width: 420 });
    res.json({ id, qr, payreq, expiresIn: 600 });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: 'Could not create the payment. Please try again.' });
  }
});

app.get('/api/status/:id', async (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Unknown payment' });
  try {
    if (order.status !== 'paid') {
      if (MOCK) {
        if (Date.now() >= order.mockPaidAt) order.status = 'paid';
      } else {
        const charge = await opennode('/v1/charge/' + encodeURIComponent(req.params.id));
        order.status = charge.status;
      }
    }
    if (order.status === 'paid') await creditMachine(req.params.id);
    res.json({ status: order.status });
  } catch (e) {
    res.status(502).json({ error: 'Could not check payment status.' });
  }
});

// Optional: OpenNode webhook (faster than polling, needs PUBLIC_URL). Verifies HMAC signature.
app.post('/api/webhook', async (req, res) => {
  const { id, status, hashed_order } = req.body || {};
  const expected = crypto.createHmac('sha256', OPENNODE_API_KEY).update(String(id)).digest('hex');
  if (!id || !hashed_order || hashed_order.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(hashed_order), Buffer.from(expected))) return res.sendStatus(401);
  const order = orders.get(id);
  if (order && status === 'paid') { order.status = 'paid'; await creditMachine(id); }
  res.sendStatus(200);
});

app.listen(PORT, () => console.log(
  `Lightning vend UI on http://localhost:${PORT} (${MOCK ? 'MOCK mode, no real payments' : OPENNODE_ENV + ' OpenNode'})`));
