"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/store/authStore";
import { useZoneStore } from "@/store/zoneStore";
import { usePlantStore } from "@/store/plantStore";
import { supabase } from "@/lib/supabase/client";
import { TransplantModal } from "@/components/TransplantModal";
import type { ZoneType, PlantStage, Plant } from "@/lib/supabase/types";

const ZoneCanvas = dynamic(
  () => import("@/components/ZoneCanvas").then((mod) => mod.ZoneCanvas),
  { ssr: false, loading: () => <div className="text-slate-400 p-8 text-center">Loading canvas...</div> }
);

const zoneTypeConfig: Record<ZoneType, { icon: string; label: string; color: string; bgColor: string }> = {
  greenhouse: { icon: "🌿", label: "Greenhouse", color: "from-green-600 to-emerald-700", bgColor: "bg-green-900/20 border-green-700/30" },
  garden_bed: { icon: "🥕", label: "Garden Bed", color: "from-amber-600 to-orange-700", bgColor: "bg-amber-900/20 border-amber-700/30" },
  indoors: { icon: "🏠", label: "Indoors", color: "from-blue-600 to-indigo-700", bgColor: "bg-blue-900/20 border-blue-700/30" },
};

export default function ZoneDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { zones, setZones, zoneItems, setZoneItems, addZoneItem, removeZoneItem, startTransplant } = useZoneStore();
  const { plants, setPlants, addPlant } = usePlantStore();
  const [loading, setLoading] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [showTransplantModal, setShowTransplantModal] = useState(false);
  const [duplicatingPlant, setDuplicatingPlant] = useState<string | null>(null);

  // Edit grid state
  const [showEditGrid, setShowEditGrid] = useState(false);
  const [editCols, setEditCols] = useState(4);
  const [editRows, setEditRows] = useState(4);
  const [editLoading, setEditLoading] = useState(false);

  const zoneId = params.id as string;
  const zone = zones.find((z) => z.id === zoneId);

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: Math.min(window.innerWidth - 32, 800),
        height: Math.min(window.innerHeight - 300, 500),
      });
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      const { data: zonesData } = await supabase.from("zones").select("*").eq("user_id", user.id);
      if (zonesData) setZones(zonesData);
      const { data: itemsData } = await supabase.from("zone_items").select("*");
      if (itemsData) setZoneItems(itemsData);
      const { data: plantsData } = await supabase.from("plants").select("*").eq("user_id", user.id);
      if (plantsData) setPlants(plantsData);
      setLoading(false);
    };
    loadData();
  }, [user, setZones, setZoneItems, setPlants]);

  // Initialize edit values when zone loads
  useEffect(() => {
    if (zone) {
      setEditCols(zone.grid_config.cols);
      setEditRows(zone.grid_config.rows);
    }
  }, [zone]);

  const zoneItemsForThisZone = zoneItems.filter((item) => item.zone_id === zoneId);
  const unplacedPlants = plants.filter((plant) => !zoneItems.some((item) => item.plant_id === plant.id));
  const totalSlots = zone ? zone.grid_config.cols * zone.grid_config.rows : 0;
  const usedSlots = zoneItemsForThisZone.length;
  const availableSlots = totalSlots - usedSlots;

  // Calculate plants that would be removed if grid is resized
  const plantsOutsideNewGrid = zoneItemsForThisZone.filter(
    (item) => item.x >= editCols || item.y >= editRows
  );

  const handleEditGrid = async () => {
    if (!zone) return;

    // Warn if plants will be removed
    if (plantsOutsideNewGrid.length > 0) {
      const confirmed = confirm(
        `Resizing will remove ${plantsOutsideNewGrid.length} plant(s) from the grid. The plants won't be deleted, just unassigned from this zone. Continue?`
      );
      if (!confirmed) return;
    }

    setEditLoading(true);

    try {
      // Remove plants outside new grid bounds
      for (const item of plantsOutsideNewGrid) {
        await supabase.from("zone_items").delete().eq("id", item.id);
        removeZoneItem(item.id);
      }

      // Update zone grid config
      const { error } = await supabase
        .from("zones")
        .update({
          grid_config: { cols: editCols, rows: editRows },
        })
        .eq("id", zoneId);

      if (error) throw error;

      // Update local state
      setZones(
        zones.map((z) =>
          z.id === zoneId
            ? { ...z, grid_config: { cols: editCols, rows: editRows } }
            : z
        )
      );

      setShowEditGrid(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update grid");
    } finally {
      setEditLoading(false);
    }
  };

  const handleAddToZone = async (plantId: string) => {
    if (!zone) return;
    for (let y = 0; y < zone.grid_config.rows; y++) {
      for (let x = 0; x < zone.grid_config.cols; x++) {
        const occupied = zoneItemsForThisZone.some((item) => item.x === x && item.y === y);
        if (!occupied) {
          const { data, error } = await supabase
            .from("zone_items")
            .insert({ zone_id: zoneId, plant_id: plantId, x, y })
            .select()
            .single();
          if (data && !error) {
            addZoneItem(data);
            // Set date_planted if not already set
            const plant = plants.find((p) => p.id === plantId);
            if (plant && !plant.date_planted) {
              const today = new Date().toISOString().split("T")[0];
              await supabase.from("plants").update({ date_planted: today }).eq("id", plantId);
              updatePlant(plantId, { date_planted: today });
            }
          }
          return;
        }
      }
    }
    alert("No empty cells available!");
  };

  const handleDuplicatePlant = async (plant: Plant, count: number = 1) => {
    if (!user || !zone || availableSlots < count) return;

    setDuplicatingPlant(plant.id);

    try {
      // Find the highest number suffix for this plant name
      const baseName = plant.name.replace(/ #\d+$/, "");
      const existingNumbers = plants
        .filter((p) => p.name.startsWith(baseName))
        .map((p) => {
          const match = p.name.match(/#(\d+)$/);
          return match ? parseInt(match[1]) : 1;
        });
      let nextNumber = Math.max(0, ...existingNumbers) + 1;

      // Create new plants
      const plantsToInsert = Array.from({ length: count }, (_, i) => ({
        user_id: user.id,
        name: `${baseName} #${nextNumber + i}`,
        species: plant.species,
        date_planted: new Date().toISOString().split("T")[0],
        days_to_maturity: plant.days_to_maturity,
        current_stage: "seed" as PlantStage,
      }));

      const { data: newPlants, error: plantError } = await supabase
        .from("plants")
        .insert(plantsToInsert)
        .select();

      if (plantError) throw plantError;
      if (!newPlants) throw new Error("No plants created");

      // Add to store
      newPlants.forEach((p) => addPlant(p));

      // Place in zone
      let currentItems = [...zoneItemsForThisZone];
      for (const newPlant of newPlants) {
        for (let y = 0; y < zone.grid_config.rows; y++) {
          let placed = false;
          for (let x = 0; x < zone.grid_config.cols; x++) {
            const occupied = currentItems.some((item) => item.x === x && item.y === y);
            if (!occupied) {
              const { data: zoneItem } = await supabase
                .from("zone_items")
                .insert({ zone_id: zoneId, plant_id: newPlant.id, x, y })
                .select()
                .single();
              if (zoneItem) {
                addZoneItem(zoneItem);
                currentItems.push(zoneItem);
              }
              placed = true;
              break;
            }
          }
          if (placed) break;
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to duplicate plant");
    } finally {
      setDuplicatingPlant(null);
    }
  };

  const handleRemoveFromZone = async (itemId: string) => {
    await supabase.from("zone_items").delete().eq("id", itemId);
    removeZoneItem(itemId);
  };

  const handleTransplantClick = (plantId: string) => {
    startTransplant(plantId, zoneId);
    setShowTransplantModal(true);
  };

  const handleDeleteZone = async () => {
    if (!zone || !confirm("Delete this zone? Plants will be unassigned but not deleted.")) return;
    await supabase.from("zone_items").delete().eq("zone_id", zoneId);
    await supabase.from("zones").delete().eq("id", zoneId);
    router.push("/zones");
  };

  const reloadData = async () => {
    const { data: itemsData } = await supabase.from("zone_items").select("*");
    if (itemsData) setZoneItems(itemsData);
  };

  if (!user) {
    return (
      <div className="p-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">🔒</div>
        <p className="text-slate-400 text-xl">Please sign in.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-4 animate-bounce">🗺️</div>
        <p className="text-slate-400 text-lg">Loading zone...</p>
      </div>
    );
  }

  if (!zone) {
    return (
      <div className="p-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">❓</div>
        <p className="text-slate-400 mb-4 text-xl">Zone not found</p>
        <Link href="/zones" className="text-green-400 hover:text-green-300 text-lg font-medium">
          ← Back to zones
        </Link>
      </div>
    );
  }

  const config = zoneTypeConfig[zone.type] || zoneTypeConfig.greenhouse;
  const isGreenhouse = zone.type === "greenhouse";

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/zones" className="inline-flex items-center gap-2 text-slate-400 hover:text-green-400 mb-3 text-lg transition-colors">
          <span>←</span> Back to zones
        </Link>

        <div className={`rounded-2xl p-5 border ${config.bgColor}`}>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{config.icon}</span>
              <div>
                <h2 className="text-2xl font-bold">{zone.name}</h2>
                <span className={`text-sm px-3 py-1 rounded-full font-medium bg-gradient-to-r ${config.color} inline-block mt-1`}>
                  {config.label}
                </span>
              </div>
            </div>
            <button
              onClick={handleDeleteZone}
              className="text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 px-4 py-2 rounded-xl transition-colors text-sm font-medium"
            >
              🗑️ Delete
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <button
              onClick={() => setShowEditGrid(true)}
              className="bg-slate-800/50 hover:bg-slate-700/50 rounded-xl p-3 text-center transition-colors group"
            >
              <div className="text-2xl font-bold group-hover:text-green-400 transition-colors">
                {zone.grid_config.cols} × {zone.grid_config.rows}
              </div>
              <div className="text-sm text-slate-400 group-hover:text-slate-300">
                Grid Size <span className="text-xs">(tap to edit)</span>
              </div>
            </button>
            <div className="bg-slate-800/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-green-400">{usedSlots}</div>
              <div className="text-sm text-slate-400">Plants Placed</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-slate-300">{availableSlots}</div>
              <div className="text-sm text-slate-400">Empty Slots</div>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="mb-6 rounded-2xl overflow-hidden border-2 border-slate-700">
        {dimensions.width > 0 && (
          <ZoneCanvas
            zone={zone}
            items={zoneItemsForThisZone}
            width={dimensions.width}
            height={dimensions.height}
            onTransplant={isGreenhouse ? handleTransplantClick : undefined}
          />
        )}
      </div>

      {/* Plants in Zone */}
      <section className="mb-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="text-2xl">🌿</span> Plants in Zone ({zoneItemsForThisZone.length})
        </h3>
        {zoneItemsForThisZone.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl p-6 text-center border border-slate-700/50">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-slate-400">No plants in this zone yet.</p>
            <Link href="/plants/new" className="text-green-400 hover:text-green-300 font-medium mt-2 inline-block">
              Add a new plant →
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {zoneItemsForThisZone.map((item) => {
              const plant = plants.find((p) => p.id === item.plant_id);
              if (!plant) return null;
              const isDuplicating = duplicatingPlant === plant.id;
              return (
                <div
                  key={item.id}
                  className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/50"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🌱</span>
                      <div>
                        <div className="font-bold">{plant.name}</div>
                        <div className="text-sm text-slate-400">
                          Col {item.x + 1}, Row {item.y + 1}
                          {plant.species && ` • ${plant.species}`}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFromZone(item.id)}
                      className="text-slate-400 hover:text-red-400 p-1 transition-colors"
                      title="Remove from zone"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDuplicatePlant(plant, 1)}
                      disabled={isDuplicating || availableSlots === 0}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-slate-600 disabled:to-slate-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      {isDuplicating ? "Adding..." : "+ Add 1 More"}
                    </button>
                    <button
                      onClick={() => handleDuplicatePlant(plant, 5)}
                      disabled={isDuplicating || availableSlots < 5}
                      className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      +5
                    </button>
                    <button
                      onClick={() => handleDuplicatePlant(plant, availableSlots)}
                      disabled={isDuplicating || availableSlots === 0}
                      className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Fill
                    </button>
                    {isGreenhouse && (
                      <button
                        onClick={() => handleTransplantClick(plant.id)}
                        className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        🌱
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Unplaced Plants */}
      {unplacedPlants.length > 0 && (
        <section className="mb-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">📦</span> Unplaced Plants ({unplacedPlants.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {unplacedPlants.map((plant) => (
              <div
                key={plant.id}
                className="bg-slate-800/80 rounded-xl p-4 flex items-center justify-between border border-slate-700/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🌱</span>
                  <div>
                    <div className="font-bold">{plant.name}</div>
                    {plant.species && <div className="text-sm text-slate-400">{plant.species}</div>}
                  </div>
                </div>
                <button
                  onClick={() => handleAddToZone(plant.id)}
                  disabled={availableSlots === 0}
                  className="bg-green-600 hover:bg-green-500 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Edit Grid Modal */}
      {showEditGrid && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-700 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">📐</span> Edit Grid Size
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Columns: {editCols}
                </label>
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={editCols}
                  onChange={(e) => setEditCols(parseInt(e.target.value))}
                  className="w-full accent-green-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>1</span>
                  <span>12</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Rows: {editRows}
                </label>
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={editRows}
                  onChange={(e) => setEditRows(parseInt(e.target.value))}
                  className="w-full accent-green-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>1</span>
                  <span>12</span>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold">{editCols} × {editRows}</div>
                <div className="text-slate-400">= {editCols * editRows} total slots</div>
              </div>

              {plantsOutsideNewGrid.length > 0 && (
                <div className="bg-amber-900/30 border border-amber-600/50 rounded-xl p-4 text-amber-300">
                  <div className="flex items-center gap-2 font-medium">
                    <span>⚠️</span>
                    {plantsOutsideNewGrid.length} plant(s) will be unassigned
                  </div>
                  <p className="text-sm text-amber-400 mt-1">
                    These plants are outside the new grid bounds and will be moved to unplaced.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditGrid(false);
                  setEditCols(zone.grid_config.cols);
                  setEditRows(zone.grid_config.rows);
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditGrid}
                disabled={editLoading || (editCols === zone.grid_config.cols && editRows === zone.grid_config.rows)}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-slate-600 disabled:to-slate-600 text-white py-3 rounded-xl font-bold transition-colors"
              >
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transplant Modal */}
      {showTransplantModal && (
        <TransplantModal
          onClose={() => setShowTransplantModal(false)}
          onComplete={() => {
            setShowTransplantModal(false);
            reloadData();
          }}
        />
      )}
    </div>
  );
}
