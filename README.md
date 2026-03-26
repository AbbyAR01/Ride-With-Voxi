# 🚌 Ride With Voxi — Fullstack Setup Guide

## Project Structure

```
ridewithvoxi/
├── backend/
│   ├── server.js            ← Express app entry point
│   ├── supabaseClient.js    ← Supabase connection
│   ├── schema.sql           ← Run this in Supabase SQL Editor
│   ├── package.json
│   ├── .env.example         ← Copy to .env and fill in values
│   └── routes/
│       ├── bookings.js      ← CRUD for ride bookings
│       └── payments.js      ← Paystack MoMo + card payments
└── frontend/
    ├── index.html           ← Main landing + booking page
    └── payment-success.html ← Shown after Paystack redirect
```

---

## Step 1 — Set up Supabase (Database)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (remember your database password)
3. Go to **SQL Editor** and paste the entire contents of `backend/schema.sql` → click **Run**
4. Go to **Project Settings → API** and copy:
   - `Project URL` → this is your `SUPABASE_URL`
   - `service_role` secret key → this is your `SUPABASE_SERVICE_KEY` ⚠️ keep this secret!

---

## Step 2 — Set up Paystack (Payments)

1. Go to [paystack.com](https://paystack.com) and create an account
2. From the dashboard, go to **Settings → API Keys**
3. Copy your **Secret Key** (use Test key while developing, Live key for production)
4. In your Paystack dashboard, set the callback URL to:
   ```
   https://your-netlify-site.netlify.app/payment-success.html
   ```
5. Also add a **Webhook URL** pointing to:
   ```
   https://your-backend.onrender.com/api/payments/webhook
   ```

---

## Step 3 — Deploy Backend to Render

1. Push your `backend/` folder to a GitHub repo
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo
4. Set these settings:
   - **Root directory**: `backend`
   - **Build command**: `npm install`
   - **Start command**: `npm start`
   - **Environment**: Node
5. Add environment variables (from `.env.example`):
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   PAYSTACK_SECRET_KEY=sk_live_xxxx
   FRONTEND_URL=https://your-netlify-site.netlify.app
   ```
6. Deploy — Render gives you a URL like `https://ridewithvoxi.onrender.com`

---

## Step 4 — Deploy Frontend to Netlify

1. Go to [netlify.com](https://netlify.com) → **Add new site → Deploy manually**
2. Drag and drop your `frontend/` folder
3. Netlify gives you a URL like `https://ridewithvoxi.netlify.app`
4. **Important:** Open `frontend/index.html` and `frontend/payment-success.html`
   and replace:
   ```js
   const API_BASE = 'https://your-backend.onrender.com';
   ```
   with your actual Render backend URL

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bookings` | Create a booking |
| GET | `/api/bookings` | List all bookings |
| GET | `/api/bookings/:id` | Get single booking |
| PATCH | `/api/bookings/:id` | Update booking status |
| DELETE | `/api/bookings/:id` | Cancel booking |
| POST | `/api/payments/initialize` | Start a Paystack payment |
| GET | `/api/payments/verify/:ref` | Verify payment after redirect |
| POST | `/api/payments/webhook` | Paystack webhook (auto-confirm) |

---

## Booking Flow

```
Student fills form → POST /api/bookings (status: pending)
         ↓
Student clicks Pay → POST /api/payments/initialize
         ↓
Redirected to Paystack hosted page (MoMo prompt or card form)
         ↓
Payment succeeds → Paystack redirects to /payment-success.html
         ↓
GET /api/payments/verify/:ref → booking status updated to "paid"
         ↓
Paystack also sends webhook → double-confirms payment server-side
```

---

## Local Development

```bash
cd backend
cp .env.example .env   # fill in your keys
npm install
npm run dev            # runs on http://localhost:4000
```

Open `frontend/index.html` in your browser and change `API_BASE` to `http://localhost:4000`.
