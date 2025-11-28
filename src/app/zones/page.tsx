"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useZoneStore } from "@/store/zoneStore";
import { supabase } from "@/lib/supabase/client";
import type { ZoneType, Tray } from "@/lib/supabase/types";

const zoneTypeConfig: Record<ZoneType, { icon: string; label: string; color: string; bgColor: string }> = {
  greenhouse: {
    icon: "🌿",
    label: "Greenhouse",
    color: "from-green-600 to-emerald-700",
    bgColor: "bg-green-900/20 border-green-700/30"
  },
  garden_bed: { icon: "🥕", label: "Garden Bed", color: "from-amber-600 to-orange-700", bgColor: "bg-amber-900/20 border-amber-700/30" },
  indoors: {
    icon: "🏠",
    label: "Indoors",
    color: "from-blue-600 to-indigo-700",
    bgColor: "bg-blue-900/20 border-blue-700/30"
  },
};

export default function ZonesPage() {
  const { user } = useAuthStore();
  const { zones, setZones, addZone, zoneItems, setZoneItems, trays, setTrays } = useZoneStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadZones = async () => {
      const { data: zonesData } = await supabase
        .from("zones")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

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

      setLoading(false);
    };

    loadZones();
  }, [user, setZones, setZoneItems, setTrays]);

  const getPlantCount = (zoneId: string) => {
    return zoneItems.filter((item) => item.zone_id === zoneId).length;
  };

  const getTrayCount = (zoneId: string) => {
    return trays.filter((tray) => tray.zone_id === zoneId).length;
  };

  const getTotalSlots = (zoneId: string) => {
    const zoneTrays = trays.filter((tray) => tray.zone_id === zoneId);
    if (zoneTrays.length > 0) {
      return zoneTrays.reduce((sum, tray) => sum + (tray.rows * tray.cols), 0);
    }
    // Fallback to zone grid_config for zones without trays
    const zone = zones.find((z) => z.id === zoneId);
    return zone ? zone.grid_config.cols * zone.grid_config.rows : 0;
  };

  if (!user) {
    return (
      <div className="p-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">🔒</div>
        <p className="text-slate-400 text-xl">Please sign in to manage zones.</p>
        <Link href="/auth" className="mt-4 text-green-400 hover:text-green-300 font-medium text-lg">
          Sign In →
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-4 animate-bounce">🗺️</div>
        <p className="text-slate-400 text-lg">Loading your zones...</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold">My Zones</h2>
          <p className="text-slate-400">Organize your growing spaces</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-green-900/30 flex items-center gap-2"
        >
          <span className="text-xl">➕</span>
          <span>New Zone</span>
        </button>
      </div>

      {/* Zone Type Legend */}
      <div className="mb-8 flex flex-wrap gap-3">
        {(Object.keys(zoneTypeConfig) as ZoneType[]).map((type) => (
          <div
            key={type}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${zoneTypeConfig[type].bgColor}`}
          >
            <span className="text-2xl">{zoneTypeConfig[type].icon}</span>
            <span className="font-medium">{zoneTypeConfig[type].label}</span>
          </div>
        ))}
      </div>

      {zones.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/50 rounded-2xl border border-slate-700/50">
          <div className="text-7xl mb-6">🗺️</div>
          <h3 className="text-2xl font-bold mb-3">No Zones Yet</h3>
          <p className="text-slate-400 mb-8 text-lg max-w-md mx-auto">
            Create zones to organize your plants by location - greenhouse, garden bed, or indoors.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-block bg-gradient-to-r from-green-600 to-emerald-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg"
          >
            ➕ Create Your First Zone
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {zones.map((zone) => {
            const config = zoneTypeConfig[zone.type];
            const plantCount = getPlantCount(zone.id);
            const trayCount = getTrayCount(zone.id);
            const totalSlots = getTotalSlots(zone.id);
            const usagePercent = totalSlots > 0 ? Math.round((plantCount / totalSlots) * 100) : 0;

            return (
              <Link
                key={zone.id}
                href={`/zones/${zone.id}`}
                className={`rounded-2xl p-5 transition-all border hover:shadow-lg hover:scale-[1.02] ${config.bgColor}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{config.icon}</span>
                    <div>
                      <h3 className="font-bold text-xl">{zone.name}</h3>
                      <span className={`text-sm px-3 py-1 rounded-full font-medium bg-gradient-to-r ${config.color} inline-block mt-1`}>
                        {config.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Zone Info */}
                <div className="mb-4 p-3 bg-slate-800/50 rounded-xl">
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-slate-400">Trays</span>
                    <span className="font-medium">{trayCount || 1}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Total Slots</span>
                    <span className="font-medium">{totalSlots}</span>
                  </div>
                </div>

                {/* Usage Bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Plants Placed</span>
                    <span className="text-green-400 font-medium">{plantCount} / {totalSlots}</span>
                  </div>
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${config.color} rounded-full transition-all`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                </div>

                {/* Tap to Open */}
                <div className="text-center text-slate-500 text-sm mt-4">
                  Tap to open zone →
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Zone Modal */}
      {showCreateForm && (
        <CreateZoneModal
          onClose={() => setShowCreateForm(false)}
          onCreated={async (zone) => {
            addZone(zone);
            // Auto-create a default tray for the new zone
            const { data: newTray } = await supabase
              .from("trays")
              .insert({
                zone_id: zone.id,
                name: "Main Tray",
                rows: zone.grid_config.rows,
                cols: zone.grid_config.cols,
                position: 0,
              })
              .select()
              .single();
            if (newTray) {
              setTrays([...trays, newTray]);
            }
            setShowCreateForm(false);
          }}
        />
      )}
    </div>
  );
}

function CreateZoneModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (zone: any) => void;
}) {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    name: "",
    type: "greenhouse" as ZoneType,
    rows: 4,
    cols: 6,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("zones")
      .insert({
        user_id: user.id,
        name: formData.name,
        type: formData.type,
        grid_config: { rows: formData.rows, cols: formData.cols },
      })
      .select()
      .single();

    setLoading(false);

    if (data && !error) {
      onCreated(data);
    }
  };

  const selectedConfig = zoneTypeConfig[formData.type];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <span className="text-3xl">🗺️</span>
            Create New Zone
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-lg font-medium mb-2">Zone Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-4 bg-slate-700 border-2 border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-lg"
              placeholder="e.g., Main Greenhouse"
              required
            />
          </div>

          <div>
            <label className="block text-lg font-medium mb-3">Zone Type</label>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(zoneTypeConfig) as ZoneType[]).map((type) => {
                const config = zoneTypeConfig[type];
                const isSelected = formData.type === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, type })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? `border-green-500 bg-gradient-to-br ${config.color}`
                        : "border-slate-600 bg-slate-700 hover:border-slate-500"
                    }`}
                  >
                    <span className="text-3xl block mb-1">{config.icon}</span>
                    <span className="text-sm font-medium">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-lg font-medium mb-3">First Tray Size</label>
            <p className="text-sm text-slate-400 mb-3">You can add more trays later with different sizes.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Columns</label>
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={formData.cols}
                  onChange={(e) =>
                    setFormData({ ...formData, cols: parseInt(e.target.value) || 6 })
                  }
                  className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-lg text-center"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Rows</label>
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={formData.rows}
                  onChange={(e) =>
                    setFormData({ ...formData, rows: parseInt(e.target.value) || 4 })
                  }
                  className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-lg text-center"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className={`p-4 rounded-xl border ${selectedConfig.bgColor}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedConfig.icon}</span>
                <span className="font-medium">{formData.name || "Your Zone"}</span>
              </div>
              <span className="text-slate-400">
                {formData.cols * formData.rows} slots
              </span>
            </div>
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
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-slate-700 disabled:to-slate-700 text-white py-4 rounded-xl font-bold text-lg transition-colors shadow-lg"
            >
              {loading ? "Creating..." : "Create Zone"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
