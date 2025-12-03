import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data, error } = await supabase
      .from("plants")
      .select("label_name")
      .limit(1);
    
    if (error) {
      return NextResponse.json({ 
        exists: false, 
        message: "Column does not exist. Add it in Supabase dashboard.",
        sql: "ALTER TABLE plants ADD COLUMN label_name TEXT;"
      });
    }
    
    return NextResponse.json({ exists: true, message: "Column exists!" });
  } catch (error: any) {
    return NextResponse.json({ exists: false, error: error.message });
  }
}
