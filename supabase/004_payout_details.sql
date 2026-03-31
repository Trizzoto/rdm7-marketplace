ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_email text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_bsb text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_account text;
