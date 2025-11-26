-- Migration: Add category field to plants table
-- Run this in your Supabase SQL Editor

-- Add category column to plants
ALTER TABLE plants ADD COLUMN IF NOT EXISTS category TEXT;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_plants_category ON plants(category);
