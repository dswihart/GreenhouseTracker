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
    const { error } = await supabase.rpc("exec_sql", {
      sql: `
        ALTER TABLE plants ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE plants ADD COLUMN IF NOT EXISTS photo_url TEXT;
        ALTER TABLE plants ADD COLUMN IF NOT EXISTS category TEXT;
        ALTER TABLE plants ADD COLUMN IF NOT EXISTS assigned_to UUID;
        ALTER TABLE plants ADD COLUMN IF NOT EXISTS germination_days INTEGER;
        ALTER TABLE plants ADD COLUMN IF NOT EXISTS height_inches NUMERIC;
        ALTER TABLE plants ADD COLUMN IF NOT EXISTS spacing_inches NUMERIC;
        ALTER TABLE plants ADD COLUMN IF NOT EXISTS planting_depth_inches NUMERIC;
      `
    });

    return NextResponse.json({ success: true, error: error?.message || null });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
