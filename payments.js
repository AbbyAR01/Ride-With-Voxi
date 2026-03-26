const express  = require('express');
const router   = express.Router();
const axios    = require('axios');
const supabase = require('../supabaseClient');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE   = 'https://api.paystack.co';

const paystackHeaders = {
  Authorization: `Bearer ${PAYSTACK_SECRET}`,
  'Content-Type': 'application/json',
};

// ── POST /api/payments/initialize ────────────────────────
// Initialise a Paystack transaction (card or MoMo)
router.post('/initialize', async (req, res) => {
  const { booking_id, email, amount_ghs, payment_method, momo_number, momo_provider } = req.body;

  if (!booking_id || !email || !amount_ghs) {
    return res.status(400).json({ error: 'booking_id, email and amount_ghs are required.' });
  }

  // Paystack expects amount in kobo/pesewas (smallest unit) × 100
  const amount_pesewas = Math.round(Number(amount_ghs) * 100);

  const payload = {
    email,
    amount: amount_pesewas,
    currency: 'GHS',
    metadata: { booking_id, payment_method: payment_method || 'card' },
    callback_url: `${process.env.FRONTEND_URL}/payment-success.html`,
  };

  // Mobile Money — pass channel + mobile_money block
  if (payment_method === 'momo') {
    if (!momo_number || !momo_provider) {
      return res.status(400).json({ error: 'momo_number and momo_provider are required for MoMo payments.' });
    }
    payload.channel = ['mobile_money'];
    payload.mobile_money = {
      phone: momo_number,
      provider: momo_provider.toLowerCase(), // 'mtn', 'vodafone', 'airtel'
    };
  }

  try {
    const { data } = await axios.post(`${PAYSTACK_BASE}/transaction/initialize`, payload, { headers: paystackHeaders });

    // Save reference to booking
    await supabase
      .from('bookings')
      .update({ payment_ref: data.data.reference, payment_method: payment_method || 'card' })
      .eq('id', booking_id);

    res.json({
      message: 'Payment initialized',
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch (err) {
    console.error('Paystack init error:', err?.response?.data || err.message);
    res.status(502).json({ error: 'Failed to initialize payment with Paystack.' });
  }
});

// ── GET /api/payments/verify/:reference ──────────────────
// Verify a transaction and mark booking as paid
router.get('/verify/:reference', async (req, res) => {
  const { reference } = req.params;

  try {
    const { data } = await axios.get(`${PAYSTACK_BASE}/transaction/verify/${reference}`, { headers: paystackHeaders });
    const txn = data.data;

    if (txn.status === 'success') {
      const booking_id = txn.metadata?.booking_id;

      if (booking_id) {
        await supabase
          .from('bookings')
          .update({ status: 'paid' })
          .eq('id', booking_id);
      }

      return res.json({ message: 'Payment verified and booking confirmed.', transaction: txn });
    }

    res.status(402).json({ error: 'Payment not successful.', status: txn.status });
  } catch (err) {
    console.error('Paystack verify error:', err?.response?.data || err.message);
    res.status(502).json({ error: 'Failed to verify payment.' });
  }
});

// ── POST /api/payments/webhook ────────────────────────────
// Paystack webhook — auto-confirm payments server-side
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(req.body)
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body);

  if (event.event === 'charge.success') {
    const { reference, metadata } = event.data;
    const booking_id = metadata?.booking_id;

    if (booking_id) {
      await supabase
        .from('bookings')
        .update({ status: 'paid', payment_ref: reference })
        .eq('id', booking_id);
    }
  }

  res.sendStatus(200);
});

module.exports = router;
