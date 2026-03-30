-- Add Stripe payments support to RDM-7 Marketplace

-- Add stripe_account_id to profiles for Stripe Connect
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id text;

-- Purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id uuid REFERENCES profiles(id),
  layout_id uuid REFERENCES layouts(id) ON DELETE CASCADE,
  stripe_session_id text,
  amount_cents int NOT NULL,
  platform_fee_cents int NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(buyer_id, layout_id)
);

-- Row Level Security
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Users can see their own purchases
CREATE POLICY "Users can view own purchases"
  ON purchases FOR SELECT
  USING (auth.uid() = buyer_id);

-- Sellers can view purchases of their layouts
CREATE POLICY "Sellers can view purchases of own layouts"
  ON purchases FOR SELECT
  USING (
    layout_id IN (
      SELECT id FROM layouts WHERE author_id = auth.uid()
    )
  );

-- System (service role / webhook) can insert purchases
CREATE POLICY "System can insert purchases"
  ON purchases FOR INSERT
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_layout ON purchases(layout_id);
CREATE INDEX IF NOT EXISTS idx_purchases_session ON purchases(stripe_session_id);
