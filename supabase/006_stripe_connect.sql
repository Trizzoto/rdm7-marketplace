-- Migration: Switch from manual payouts to Stripe Connect
-- The payout_email, payout_bsb, and payout_account columns are no longer needed
-- because sellers now connect their Stripe account directly via Stripe Connect.
-- The stripe_account_id column (already exists) stores the connected account ID.

ALTER TABLE profiles DROP COLUMN IF EXISTS payout_email;
ALTER TABLE profiles DROP COLUMN IF EXISTS payout_bsb;
ALTER TABLE profiles DROP COLUMN IF EXISTS payout_account;
