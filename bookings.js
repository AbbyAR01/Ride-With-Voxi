const express  = require('express');
const router   = express.Router();
const supabase = require('../supabaseClient');

// ── POST /api/bookings ─── Create a new booking ──────────
router.post('/', async (req, res) => {
  const { full_name, student_id, route, departure_time, date, seats, dropoff_stop, email } = req.body;

  // Basic validation
  if (!full_name || !student_id || !route || !departure_time || !date || !seats) {
    return res.status(400).json({ error: 'Missing required booking fields.' });
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert([{
      full_name,
      student_id,
      route,
      departure_time,
      date,
      seats: Number(seats),
      dropoff_stop: dropoff_stop || null,
      email: email || null,
      status: 'pending',       // pending | paid | cancelled
      payment_method: null,
      payment_ref: null,
    }])
    .select()
    .single();

  if (error) {
    console.error('Booking insert error:', error);
    return res.status(500).json({ error: 'Failed to create booking.' });
  }

  res.status(201).json({ message: 'Booking created', booking: data });
});

// ── GET /api/bookings ─── List all bookings (admin use) ──
router.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to fetch bookings.' });
  res.json({ bookings: data });
});

// ── GET /api/bookings/:id ─── Single booking ─────────────
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Booking not found.' });
  res.json({ booking: data });
});

// ── PATCH /api/bookings/:id ─── Update booking status ────
router.patch('/:id', async (req, res) => {
  const allowed = ['status', 'payment_method', 'payment_ref'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  const { data, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Failed to update booking.' });
  res.json({ message: 'Booking updated', booking: data });
});

// ── DELETE /api/bookings/:id ─── Cancel a booking ────────
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: 'Failed to cancel booking.' });
  res.json({ message: 'Booking cancelled.' });
});

module.exports = router;
