import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// This API route migrates existing zones to use the new trays system
// It creates a default tray for each zone and assigns existing zone_items to it

export async function POST(request: Request) {
  try {
    // Get the authorization header to verify the request
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create admin client using service role (you'll need to set SUPABASE_SERVICE_ROLE_KEY)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all zones
    const { data: zones, error: zonesError } = await supabase
      .from("zones")
      .select("*");

    if (zonesError) {
      return NextResponse.json({ error: zonesError.message }, { status: 500 });
    }

    const results = {
      zonesProcessed: 0,
      traysCreated: 0,
      itemsUpdated: 0,
      errors: [] as string[],
    };

    for (const zone of zones || []) {
      try {
        // Check if zone already has trays
        const { data: existingTrays } = await supabase
          .from("trays")
          .select("id")
          .eq("zone_id", zone.id);

        if (existingTrays && existingTrays.length > 0) {
          // Zone already has trays, skip
          continue;
        }

        // Create default tray for this zone
        const { data: newTray, error: trayError } = await supabase
          .from("trays")
          .insert({
            zone_id: zone.id,
            name: "Main Tray",
            rows: zone.grid_config?.rows || 6,
            cols: zone.grid_config?.cols || 4,
            position: 0,
          })
          .select()
          .single();

        if (trayError) {
          results.errors.push(`Failed to create tray for zone ${zone.id}: ${trayError.message}`);
          continue;
        }

        results.traysCreated++;

        // Update all zone_items for this zone to reference the new tray
        const { data: updatedItems, error: itemsError } = await supabase
          .from("zone_items")
          .update({ tray_id: newTray.id })
          .eq("zone_id", zone.id)
          .is("tray_id", null)
          .select();

        if (itemsError) {
          results.errors.push(`Failed to update items for zone ${zone.id}: ${itemsError.message}`);
        } else {
          results.itemsUpdated += updatedItems?.length || 0;
        }

        results.zonesProcessed++;
      } catch (err) {
        results.errors.push(`Error processing zone ${zone.id}: ${String(err)}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Migration completed",
      results,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "Migration failed", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "POST to this endpoint to run the migration",
    description: "This will create a default tray for each zone and assign existing zone_items to it",
  });
}
