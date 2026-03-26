-- ╔══════════════════════════════════════════════════╗
-- ║     Ride With Voxi — Supabase Database Schema    ║
-- ║  Run this in your Supabase SQL Editor once.      ║
-- ╚══════════════════════════════════════════════════╝

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── bookings table ─────────────────────────────────────────
create table if not exists bookings (
  id               uuid primary key default gen_random_uuid(),
  full_name        text not null,
  student_id       text not null,
  email            text,
  route            text not null,
  departure_time   text not null,
  date             date not null,
  seats            integer not null default 1 check (seats between 1 and 10),
  dropoff_stop     text,
  status           text not null default 'pending'
                     check (status in ('pending', 'paid', 'cancelled')),
  payment_method   text check (payment_method in ('momo', 'card', null)),
  payment_ref      text unique,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Auto-update updated_at on row change
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bookings_updated_at
  before update on bookings
  for each row execute procedure update_updated_at();

-- Indexes for common queries
create index if not exists bookings_student_id_idx on bookings (student_id);
create index if not exists bookings_date_idx        on bookings (date);
create index if not exists bookings_status_idx      on bookings (status);

-- ── Row Level Security ─────────────────────────────────────
-- Service role (backend) can do everything.
-- Anonymous users cannot read bookings directly from the client.
alter table bookings enable row level security;

-- Allow backend (service key) full access — no policy needed for service role.
-- Deny all direct client access (anon key).
create policy "No direct client access"
  on bookings for all
  to anon
  using (false);
