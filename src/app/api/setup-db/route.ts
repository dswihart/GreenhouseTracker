import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Missing Supabase credentials" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Create contacts table
    const { error: contactsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS contacts (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

        DO $$ BEGIN
          CREATE POLICY "Users can manage own contacts" ON contacts
            FOR ALL USING (auth.uid() = user_id);
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `
    });

    // Add contact_id to plants if it doesn't exist
    const { error: plantsError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ BEGIN
          ALTER TABLE plants ADD COLUMN contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
      `
    });

    // Add growing info columns to plants
    const { error: growingInfoError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ BEGIN
          ALTER TABLE plants ADD COLUMN description TEXT;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
        DO $$ BEGIN
          ALTER TABLE plants ADD COLUMN sun_requirements TEXT;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
        DO $$ BEGIN
          ALTER TABLE plants ADD COLUMN watering_needs TEXT;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
        DO $$ BEGIN
          ALTER TABLE plants ADD COLUMN planting_depth TEXT;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
        DO $$ BEGIN
          ALTER TABLE plants ADD COLUMN spacing TEXT;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
        DO $$ BEGIN
          ALTER TABLE plants ADD COLUMN harvest_info TEXT;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
        DO $$ BEGIN
          ALTER TABLE plants ADD COLUMN growing_tips TEXT;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
        DO $$ BEGIN
          ALTER TABLE plants ADD COLUMN image_url TEXT;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
      `
    });

    // Add first_name and last_name to profiles
    const { error: profilesError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ BEGIN
          ALTER TABLE profiles ADD COLUMN first_name TEXT;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
        DO $$ BEGIN
          ALTER TABLE profiles ADD COLUMN last_name TEXT;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
      `
    });

    return NextResponse.json({
      success: true,
      message: "Database setup complete",
      contactsError: contactsError?.message,
      plantsError: plantsError?.message,
      growingInfoError: growingInfoError?.message,
      profilesError: profilesError?.message
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Setup failed"
    }, { status: 500 });
  }
}
