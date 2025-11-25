-- Greenhouse Tracker Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plant stages enum
CREATE TYPE plant_stage AS ENUM ('seed', 'seedling', 'vegetative', 'flowering', 'harvest_ready');

-- Zone types enum
CREATE TYPE zone_type AS ENUM ('greenhouse', 'garden_bed', 'indoors');

-- Plants table
CREATE TABLE IF NOT EXISTS plants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT,
  date_planted DATE,
  transplant_date DATE,
  days_to_maturity INTEGER,
  current_stage plant_stage DEFAULT 'seed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Zones table
CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  type zone_type NOT NULL DEFAULT 'greenhouse',
  grid_config JSONB NOT NULL DEFAULT '{"rows": 10, "cols": 8}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Zone items (plants placed in zones)
CREATE TABLE IF NOT EXISTS zone_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id UUID NOT NULL REFERENCES zones ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES plants ON DELETE CASCADE,
  x INTEGER NOT NULL DEFAULT 0,
  y INTEGER NOT NULL DEFAULT 0,
  UNIQUE(zone_id, plant_id)
);

-- Map layout (legacy - keep for backwards compatibility)
CREATE TABLE IF NOT EXISTS map_layout (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  grid_config JSONB NOT NULL DEFAULT '{"rows": 10, "cols": 8}'::jsonb,
  items JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Journal entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_id UUID NOT NULL REFERENCES plants ON DELETE CASCADE,
  photo_url TEXT,
  notes TEXT,
  ai_diagnosis JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Care schedules
CREATE TABLE IF NOT EXISTS care_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_id UUID NOT NULL REFERENCES plants ON DELETE CASCADE,
  water_interval_days INTEGER NOT NULL DEFAULT 3,
  last_watered TIMESTAMP WITH TIME ZONE,
  next_due TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_plants_user_id ON plants(user_id);
CREATE INDEX IF NOT EXISTS idx_zones_user_id ON zones(user_id);
CREATE INDEX IF NOT EXISTS idx_zone_items_zone_id ON zone_items(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_items_plant_id ON zone_items(plant_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_plant_id ON journal_entries(plant_id);
CREATE INDEX IF NOT EXISTS idx_care_schedules_plant_id ON care_schedules(plant_id);
CREATE INDEX IF NOT EXISTS idx_care_schedules_next_due ON care_schedules(next_due);

-- Row Level Security Policies

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Plants
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own plants" ON plants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plants" ON plants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plants" ON plants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plants" ON plants FOR DELETE USING (auth.uid() = user_id);

-- Zones
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own zones" ON zones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own zones" ON zones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own zones" ON zones FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own zones" ON zones FOR DELETE USING (auth.uid() = user_id);

-- Zone items (need to check via zones table)
ALTER TABLE zone_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own zone items" ON zone_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM zones WHERE zones.id = zone_items.zone_id AND zones.user_id = auth.uid()));
CREATE POLICY "Users can insert own zone items" ON zone_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM zones WHERE zones.id = zone_items.zone_id AND zones.user_id = auth.uid()));
CREATE POLICY "Users can update own zone items" ON zone_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM zones WHERE zones.id = zone_items.zone_id AND zones.user_id = auth.uid()));
CREATE POLICY "Users can delete own zone items" ON zone_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM zones WHERE zones.id = zone_items.zone_id AND zones.user_id = auth.uid()));

-- Map layout
ALTER TABLE map_layout ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own map layout" ON map_layout FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own map layout" ON map_layout FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own map layout" ON map_layout FOR UPDATE USING (auth.uid() = user_id);

-- Journal entries (need to check via plants table)
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own journal entries" ON journal_entries FOR SELECT
  USING (EXISTS (SELECT 1 FROM plants WHERE plants.id = journal_entries.plant_id AND plants.user_id = auth.uid()));
CREATE POLICY "Users can insert own journal entries" ON journal_entries FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM plants WHERE plants.id = journal_entries.plant_id AND plants.user_id = auth.uid()));
CREATE POLICY "Users can update own journal entries" ON journal_entries FOR UPDATE
  USING (EXISTS (SELECT 1 FROM plants WHERE plants.id = journal_entries.plant_id AND plants.user_id = auth.uid()));
CREATE POLICY "Users can delete own journal entries" ON journal_entries FOR DELETE
  USING (EXISTS (SELECT 1 FROM plants WHERE plants.id = journal_entries.plant_id AND plants.user_id = auth.uid()));

-- Care schedules (need to check via plants table)
ALTER TABLE care_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own care schedules" ON care_schedules FOR SELECT
  USING (EXISTS (SELECT 1 FROM plants WHERE plants.id = care_schedules.plant_id AND plants.user_id = auth.uid()));
CREATE POLICY "Users can insert own care schedules" ON care_schedules FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM plants WHERE plants.id = care_schedules.plant_id AND plants.user_id = auth.uid()));
CREATE POLICY "Users can update own care schedules" ON care_schedules FOR UPDATE
  USING (EXISTS (SELECT 1 FROM plants WHERE plants.id = care_schedules.plant_id AND plants.user_id = auth.uid()));
CREATE POLICY "Users can delete own care schedules" ON care_schedules FOR DELETE
  USING (EXISTS (SELECT 1 FROM plants WHERE plants.id = care_schedules.plant_id AND plants.user_id = auth.uid()));

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
