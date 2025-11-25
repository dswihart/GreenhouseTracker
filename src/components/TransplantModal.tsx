"use client";

import { useState } from "react";
import { useZoneStore } from "@/store/zoneStore";
import { usePlantStore } from "@/store/plantStore";
import { supabase } from "@/lib/supabase/client";
import type { Zone } from "@/lib/supabase/types";

interface TransplantModalProps {
  onClose: () => void;
  onComplete: () => void;
}

export function TransplantModal({ onClose, onComplete }: TransplantModalProps) {
  const { transplantMode, zones, zoneItems, cancelTransplant, completeTransplant } =
    useZoneStore();
  const { plants, updatePlant } = usePlantStore();
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<{ x: number; y: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const plant = plants.find((p) => p.id === transplantMode.plantId);
  const destinationZones = zones.filter(
    (z) => z.id !== transplantMode.sourceZoneId && z.type === "indoors"
  );
  const selectedZone = zones.find((z) => z.id === selectedZoneId);

  const getOccupiedPositions = (zoneId: string) => {
    return zoneItems
      .filter((item) => item.zone_id === zoneId)
      .map((item) => ({ x: item.x, y: item.y }));
  };

  const handleTransplant = async () => {
    if (!transplantMode.plantId || !selectedZoneId || !selectedPosition) return;

    setLoading(true);

    try {
      // Remove from source zone
      const sourceItem = zoneItems.find(
        (item) =>
          item.plant_id === transplantMode.plantId &&
          item.zone_id === transplantMode.sourceZoneId
      );

      if (sourceItem) {
        await (supabase as any).from("zone_items").delete().eq("id", sourceItem.id);
      }

      // Add to destination zone
      await (supabase as any).from("zone_items").insert({
        zone_id: selectedZoneId,
        plant_id: transplantMode.plantId,
        x: selectedPosition.x,
        y: selectedPosition.y,
      });

      // Update plant: set transplant_date and stage to vegetative
      const now = new Date().toISOString();
      await supabase
        .from("plants")
        .update({
          transplant_date: now,
          current_stage: "vegetative",
        })
        .eq("id", transplantMode.plantId);

      updatePlant(transplantMode.plantId, {
        transplant_date: now,
        current_stage: "vegetative",
      });

      completeTransplant();
      onComplete();
    } catch (error) {
      console.error("Transplant failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    cancelTransplant();
    onClose();
  };

  if (!transplantMode.active || !plant) return null;

  const occupiedPositions = selectedZoneId
    ? getOccupiedPositions(selectedZoneId)
    : [];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold">Transplant Plant</h2>
          <p className="text-slate-400 text-sm mt-1">
            Moving <strong>{plant.name}</strong> to garden bed
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Zone Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Destination Garden Bed
            </label>
            {destinationZones.length === 0 ? (
              <p className="text-slate-400 text-sm">
                No garden beds available. Create a garden bed zone first.
              </p>
            ) : (
              <select
                value={selectedZoneId}
                onChange={(e) => {
                  setSelectedZoneId(e.target.value);
                  setSelectedPosition(null);
                }}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">-- Select a garden bed --</option>
                {destinationZones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} ({zone.grid_config.cols}x{zone.grid_config.rows})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Position Selection Grid */}
          {selectedZone && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Position
              </label>
              <div
                className="grid gap-1 bg-slate-900 p-2 rounded-lg overflow-auto"
                style={{
                  gridTemplateColumns: `repeat(${selectedZone.grid_config.cols}, 40px)`,
                }}
              >
                {Array.from({ length: selectedZone.grid_config.rows }).map(
                  (_, row) =>
                    Array.from({ length: selectedZone.grid_config.cols }).map(
                      (_, col) => {
                        const isOccupied = occupiedPositions.some(
                          (p) => p.x === col && p.y === row
                        );
                        const isSelected =
                          selectedPosition?.x === col &&
                          selectedPosition?.y === row;

                        return (
                          <button
                            key={`${row}-${col}`}
                            disabled={isOccupied}
                            onClick={() =>
                              setSelectedPosition({ x: col, y: row })
                            }
                            className={`w-10 h-10 rounded text-xs transition-colors ${
                              isOccupied
                                ? "bg-slate-600 cursor-not-allowed"
                                : isSelected
                                ? "bg-green-600"
                                : "bg-slate-700 hover:bg-slate-600"
                            }`}
                          >
                            {isOccupied ? "X" : isSelected ? "✓" : ""}
                          </button>
                        );
                      }
                    )
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-700 flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleTransplant}
            disabled={!selectedZoneId || !selectedPosition || loading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-2 rounded-lg transition-colors"
          >
            {loading ? "Transplanting..." : "Transplant"}
          </button>
        </div>
      </div>
    </div>
  );
}
