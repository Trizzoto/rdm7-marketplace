-- Migration: Add item_type column to support layouts AND DBC files
-- Run this in Supabase SQL Editor

ALTER TABLE layouts ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'layout';
CREATE INDEX IF NOT EXISTS idx_layouts_item_type ON layouts(item_type) WHERE is_published = true;
