-- Migration: Add trays table for multiple grids per zone
-- Run this in your Supabase SQL Editor

-- Create trays table
CREATE TABLE IF NOT EXISTS trays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id UUID NOT NULL REFERENCES zones ON DELETE CASCADE,
  name TEXT NOT NULL,
  rows INTEGER NOT NULL DEFAULT 6,
  cols INTEGER NOT NULL DEFAULT 4,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add tray_id to zone_items (nullable initially for migration)
ALTER TABLE zone_items ADD COLUMN IF NOT EXISTS tray_id UUID REFERENCES trays ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trays_zone_id ON trays(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_items_tray_id ON zone_items(tray_id);

-- RLS policies for trays
ALTER TABLE trays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trays" ON trays FOR SELECT
  USING (EXISTS (SELECT 1 FROM zones WHERE zones.id = trays.zone_id AND zones.user_id = auth.uid()));
CREATE POLICY "Users can insert own trays" ON trays FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM zones WHERE zones.id = trays.zone_id AND zones.user_id = auth.uid()));
CREATE POLICY "Users can update own trays" ON trays FOR UPDATE
  USING (EXISTS (SELECT 1 FROM zones WHERE zones.id = trays.zone_id AND zones.user_id = auth.uid()));
CREATE POLICY "Users can delete own trays" ON trays FOR DELETE
  USING (EXISTS (SELECT 1 FROM zones WHERE zones.id = trays.zone_id AND zones.user_id = auth.uid()));
