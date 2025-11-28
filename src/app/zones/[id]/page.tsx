"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/store/authStore";
import { useZoneStore } from "@/store/zoneStore";
import { usePlantStore } from "@/store/plantStore";
import { supabase } from "@/lib/supabase/client";
import { TransplantModal } from "@/components/TransplantModal";
import type { Zone, ZoneItem, ZoneType, Contact, Tray } from "@/lib/supabase/types";

const ZoneCanvas = dynamic(
  () => import("@/components/ZoneCanvas").then((mod) => mod.ZoneCanvas),
  { ssr: false, loading: () => <div className="text-slate-400 p-8 text-center">Loading canvas...</div> }
);

const zoneTypeConfig: Record<ZoneType, { icon: string; label: string; color: string; bgColor: string }> = {
  greenhouse: {
    icon: "🌿",
    label: "Greenhouse",
    color: "from-green-600 to-emerald-700",
    bgColor: "bg-green-900/20 border-green-700/30"
  },
  garden_bed: {
    icon: "🥕",
    label: "Garden Bed",
    color: "from-amber-600 to-orange-700",
    bgColor: "bg-amber-900/20 border-amber-700/30"
  },
  indoors: {
    icon: "🏠",
    label: "Indoors",
    color: "from-blue-600 to-indigo-700",
    bgColor: "bg-blue-900/20 border-blue-700/30"
  },
};

export default function ZoneDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    zones,
    setZones,
    zoneItems,
    setZoneItems,
    addZoneItem,
    removeZoneItem,
    trays,
    setTrays,
    addTray,
    removeTray,
    activeTrayId,
    setActiveTray,
    transplantMode,
    startTransplant,
  } = useZoneStore();
  const { plants, setPlants } = usePlantStore();
  const [loading, setLoading] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [showTransplantModal, setShowTransplantModal] = useState(false);
  const [showTrayModal, setShowTrayModal] = useState(false);
  const [editingTray, setEditingTray] = useState<Tray | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [dragOverTrayId, setDragOverTrayId] = useState<string | null>(null);

  const zoneId = params.id as string;
  const zone = zones.find((z) => z.id === zoneId);
  const zoneTrays = trays.filter((t) => t.zone_id === zoneId).sort((a, b) => a.position - b.position);
  const activeTray = zoneTrays.find((t) => t.id === activeTrayId) || zoneTrays[0] || null;

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: Math.min(window.innerWidth - 32, 1200),
        height: Math.min(window.innerHeight - 280, 600),
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      const { data: zonesData } = await supabase
        .from("zones")
        .select("*")
        .eq("user_id", user.id);

      if (zonesData) {
        setZones(zonesData);
      }

      // Load trays
      const { data: traysData } = await supabase
        .from("trays")
        .select("*")
        .order("position", { ascending: true });

      if (traysData) {
        setTrays(traysData);
      }

      const { data: itemsData } = await supabase.from("zone_items").select("*");

      if (itemsData) {
        setZoneItems(itemsData);
      }

      const { data: plantsData } = await supabase
        .from("plants")
        .select("*")
        .eq("user_id", user.id);

      if (plantsData) {
        setPlants(plantsData);
      }

      const { data: contactsData } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id);

      if (contactsData) {
        const colors = ["#22c55e", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#06b6d4", "#a855f7"];
        const contactsWithColors = contactsData.map((contact, index) => ({
          ...contact,
          color: colors[index % colors.length]
        }));
        setContacts(contactsWithColors);
      }

      setLoading(false);
    };

    loadData();
  }, [user, setZones, setZoneItems, setPlants, setTrays]);

  // Set initial active tray
  useEffect(() => {
    if (zoneTrays.length > 0 && !activeTrayId) {
      setActiveTray(zoneTrays[0].id);
    }
  }, [zoneTrays, activeTrayId, setActiveTray]);

  const zoneItemsForThisZone = zoneItems.filter(
    (item) => item.zone_id === zoneId
  );

  // Items for the active tray (or items without tray_id for backwards compatibility)
  const itemsForActiveTray = activeTray
    ? zoneItemsForThisZone.filter((item) => item.tray_id === activeTray.id || (!item.tray_id && zoneTrays.indexOf(activeTray) === 0))
    : zoneItemsForThisZone.filter((item) => !item.tray_id);

  const unplacedPlants = plants.filter(
    (plant) => !zoneItems.some((item) => item.plant_id === plant.id)
  );

  const handleAddToZone = async (plantId: string) => {
    if (!zone || !activeTray) return;

    // Find first empty cell in active tray
    for (let y = 0; y < activeTray.rows; y++) {
      for (let x = 0; x < activeTray.cols; x++) {
        const occupied = itemsForActiveTray.some(
          (item) => item.x === x && item.y === y
        );
        if (!occupied) {
          const today = new Date().toISOString().split("T")[0];
          await supabase
            .from("plants")
            .update({ date_planted: today })
            .eq("id", plantId);

          const updatedPlants = plants.map((p) =>
            p.id === plantId ? { ...p, date_planted: today } : p
          );
          setPlants(updatedPlants);

          const { data, error } = await supabase
            .from("zone_items")
            .insert({
              zone_id: zoneId,
              plant_id: plantId,
              tray_id: activeTray.id,
              x,
              y,
            })
            .select()
            .single();

          if (data && !error) {
            addZoneItem(data);
          }
          return;
        }
      }
    }
    alert("No empty cells available in this tray!");
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
    await supabase.from("trays").delete().eq("zone_id", zoneId);
    await supabase.from("zones").delete().eq("id", zoneId);

    router.push("/zones");
  };

  const handleCreateTray = async (name: string, rows: number, cols: number) => {
    if (!user || !zone) return;

    const position = zoneTrays.length;
    const { data, error } = await supabase
      .from("trays")
      .insert({
        zone_id: zoneId,
        name,
        rows,
        cols,
        position,
      })
      .select()
      .single();

    if (data && !error) {
      addTray(data);
      setActiveTray(data.id);
    }
    setShowTrayModal(false);
    setEditingTray(null);
  };

  const handleUpdateTray = async (trayId: string, name: string, rows: number, cols: number) => {
    const { error } = await supabase
      .from("trays")
      .update({ name, rows, cols })
      .eq("id", trayId);

    if (!error) {
      const updated = trays.map((t) =>
        t.id === trayId ? { ...t, name, rows, cols } : t
      );
      setTrays(updated);
    }
    setShowTrayModal(false);
    setEditingTray(null);
  };

  const handleDeleteTray = async (trayId: string) => {
    if (!confirm("Delete this tray? Plants will be unassigned.")) return;

    await supabase.from("zone_items").delete().eq("tray_id", trayId);
    await supabase.from("trays").delete().eq("id", trayId);
    removeTray(trayId);

    if (activeTrayId === trayId && zoneTrays.length > 1) {
      const remaining = zoneTrays.filter((t) => t.id !== trayId);
      setActiveTray(remaining[0]?.id || null);
    }
  };

  const handleMoveToTray = async (itemId: string, targetTrayId: string) => {
    const targetTray = trays.find((t) => t.id === targetTrayId);
    if (!targetTray) return;

    // Find first empty cell in target tray
    const targetItems = zoneItems.filter((i) => i.tray_id === targetTrayId);
    for (let y = 0; y < targetTray.rows; y++) {
      for (let x = 0; x < targetTray.cols; x++) {
        const occupied = targetItems.some((item) => item.x === x && item.y === y);
        if (!occupied) {
          const { error } = await supabase
            .from("zone_items")
            .update({ tray_id: targetTrayId, x, y })
            .eq("id", itemId);

          if (!error) {
            const updated = zoneItems.map((item) =>
              item.id === itemId ? { ...item, tray_id: targetTrayId, x, y } : item
            );
            setZoneItems(updated);
          }
          return;
        }
      }
    }
    alert("No empty cells in target tray!");
  };

  const reloadData = async () => {
    const { data: itemsData } = await supabase.from("zone_items").select("*");
    if (itemsData) {
      setZoneItems(itemsData);
    }
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

  const config = zoneTypeConfig[zone.type];
  const isGreenhouse = zone.type === "greenhouse";
  const totalPlantsInZone = zoneItemsForThisZone.length;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/zones"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-green-400 mb-3 text-lg transition-colors"
        >
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

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-slate-800/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{zoneTrays.length}</div>
              <div className="text-sm text-slate-400">Trays</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-green-400">{totalPlantsInZone}</div>
              <div className="text-sm text-slate-400">Plants</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-slate-300">{unplacedPlants.length}</div>
              <div className="text-sm text-slate-400">Unplaced</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tray Tabs */}
      <div className="mb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {zoneTrays.map((t) => {
            const trayItems = zoneItems.filter((i) => i.tray_id === t.id);
            const isActive = activeTray?.id === t.id;
            const isDragOver = dragOverTrayId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTray(t.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverTrayId(t.id);
                }}
                onDragLeave={() => setDragOverTrayId(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const itemId = e.dataTransfer.getData("itemId");
                  if (itemId && t.id !== activeTray?.id) {
                    handleMoveToTray(itemId, t.id);
                  }
                  setDragOverTrayId(null);
                }}
                className={`px-5 py-3 rounded-t-xl font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-slate-800 text-white border-t-2 border-x-2 border-green-500"
                    : isDragOver
                    ? "bg-green-900/50 text-green-300 border-2 border-dashed border-green-500"
                    : "bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {t.name}
                <span className="ml-2 text-xs opacity-70">
                  ({trayItems.length}/{t.rows * t.cols})
                </span>
              </button>
            );
          })}
          <button
            onClick={() => {
              setEditingTray(null);
              setShowTrayModal(true);
            }}
            className="px-4 py-3 rounded-xl bg-green-600/20 text-green-400 hover:bg-green-600/30 font-medium transition-colors whitespace-nowrap"
          >
            + Add Tray
          </button>
        </div>
      </div>

      {/* Active Tray Content */}
      {activeTray ? (
        <div className="bg-slate-800 rounded-2xl border-2 border-slate-700 overflow-hidden">
          {/* Tray Header */}
          <div className="flex justify-between items-center p-4 bg-slate-800/50 border-b border-slate-700">
            <div>
              <h3 className="text-xl font-bold">{activeTray.name}</h3>
              <p className="text-sm text-slate-400">
                {activeTray.cols}×{activeTray.rows} grid • {itemsForActiveTray.length}/{activeTray.cols * activeTray.rows} plants
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingTray(activeTray);
                  setShowTrayModal(true);
                }}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm"
              >
                ✏️ Edit
              </button>
              {zoneTrays.length > 1 && (
                <button
                  onClick={() => handleDeleteTray(activeTray.id)}
                  className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg text-sm"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>

          {/* Canvas */}
          <div className="p-4">
            {dimensions.width > 0 && (
              <ZoneCanvas
                zone={zone}
                tray={activeTray}
                items={itemsForActiveTray}
                width={dimensions.width - 40}
                height={dimensions.height}
                onTransplant={isGreenhouse ? handleTransplantClick : undefined}
                onPlantClick={(plantId) => router.push(`/plants/${plantId}`)}
                contacts={contacts}
              />
            )}
          </div>

          {/* Instructions */}
          <div className="px-4 pb-4">
            <div className="bg-slate-700/30 rounded-xl p-3 text-center text-sm text-slate-400">
              <strong>Drag</strong> plants to rearrange • <strong>Click</strong> to view details
              {zoneTrays.length > 1 && (
                <> • <strong>Drop on tab</strong> to move between trays</>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-2xl p-8 text-center border-2 border-slate-700">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-bold mb-2">No Trays Yet</h3>
          <p className="text-slate-400 mb-4">Create your first tray to start organizing plants.</p>
          <button
            onClick={() => setShowTrayModal(true)}
            className="bg-green-600 hover:bg-green-500 px-6 py-3 rounded-xl font-bold"
          >
            + Create First Tray
          </button>
        </div>
      )}

      {/* Quick Add Plants */}
      <section className="mt-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="text-2xl">➕</span> Add Unplaced Plants
        </h3>
        {unplacedPlants.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl p-6 text-center border border-slate-700/50">
            <p className="text-slate-400">All plants are placed.</p>
            <Link href="/plants/new" className="text-green-400 hover:text-green-300 font-medium mt-2 inline-block">
              Add a new plant →
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {unplacedPlants.slice(0, 10).map((plant) => (
              <button
                key={plant.id}
                onClick={() => handleAddToZone(plant.id)}
                className="bg-gradient-to-r from-slate-700 to-slate-600 hover:from-green-700 hover:to-green-600 px-5 py-3 rounded-xl text-base font-medium transition-all flex items-center gap-2 shadow"
              >
                <span className="text-xl">🌱</span>
                {plant.name}
              </button>
            ))}
            {unplacedPlants.length > 10 && (
              <span className="px-4 py-3 text-slate-400">+{unplacedPlants.length - 10} more</span>
            )}
          </div>
        )}
      </section>

      {/* Plants in Current Tray */}
      {activeTray && itemsForActiveTray.length > 0 && (
        <section className="mt-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">🌿</span> Plants in {activeTray.name}
            <span className="text-slate-400 font-normal">({itemsForActiveTray.length})</span>
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {itemsForActiveTray.map((item) => {
              const plant = plants.find((p) => p.id === item.plant_id);
              if (!plant) return null;
              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("itemId", item.id);
                  }}
                  className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/50 cursor-move hover:border-green-600/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🌱</span>
                      <div>
                        <div className="font-bold text-lg">{plant.name}</div>
                        <div className="text-sm text-slate-400">
                          Col {item.x + 1}, Row {item.y + 1}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFromZone(item.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Tray Modal */}
      {showTrayModal && (
        <TrayModal
          tray={editingTray}
          onClose={() => {
            setShowTrayModal(false);
            setEditingTray(null);
          }}
          onCreate={handleCreateTray}
          onUpdate={handleUpdateTray}
        />
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

function TrayModal({
  tray,
  onClose,
  onCreate,
  onUpdate,
}: {
  tray: Tray | null;
  onClose: () => void;
  onCreate: (name: string, rows: number, cols: number) => void;
  onUpdate: (id: string, name: string, rows: number, cols: number) => void;
}) {
  const [name, setName] = useState(tray?.name || "");
  const [rows, setRows] = useState(tray?.rows || 4);
  const [cols, setCols] = useState(tray?.cols || 6);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (tray) {
      onUpdate(tray.id, name.trim(), rows, cols);
    } else {
      onCreate(name.trim(), rows, cols);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl max-w-md w-full shadow-2xl">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold">
            {tray ? "Edit Tray" : "Create New Tray"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-lg font-medium mb-2">Tray Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-4 bg-slate-700 border-2 border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-lg"
              placeholder="e.g., Seedling Rack"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Columns</label>
              <input
                type="number"
                min="1"
                max="20"
                value={cols}
                onChange={(e) => setCols(parseInt(e.target.value) || 6)}
                className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-lg text-center"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Rows</label>
              <input
                type="number"
                min="1"
                max="20"
                value={rows}
                onChange={(e) => setRows(parseInt(e.target.value) || 4)}
                className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-lg text-center"
              />
            </div>
          </div>

          <div className="bg-slate-700/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold">{cols * rows}</div>
            <div className="text-sm text-slate-400">Total cells</div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-xl font-bold text-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white py-4 rounded-xl font-bold text-lg transition-colors shadow-lg"
            >
              {tray ? "Save Changes" : "Create Tray"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
