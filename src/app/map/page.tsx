"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/store/authStore";
import { usePlantStore } from "@/store/plantStore";
import { useMapStore } from "@/store/mapStore";
import { supabase } from "@/lib/supabase/client";

// Dynamic import for canvas (requires client-side only)
const GreenhouseCanvas = dynamic(
  () =>
    import("@/components/GreenhouseCanvas").then((mod) => mod.GreenhouseCanvas),
  { ssr: false, loading: () => <div className="text-slate-400">Loading canvas...</div> }
);

export default function MapPage() {
  const { user } = useAuthStore();
  const { plants, setPlants } = usePlantStore();
  const { items, addItem, gridConfig } = useMapStore();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: Math.min(window.innerWidth - 32, 800),
        height: Math.min(window.innerHeight - 300, 600),
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadPlants = async () => {
      const { data } = await supabase
        .from("plants")
        .select("*")
        .eq("user_id", user.id);

      if (data) {
        setPlants(data);
      }
    };

    loadPlants();
  }, [user, setPlants]);

  const unplacedPlants = plants.filter(
    (plant) => !items.some((item) => item.plant_id === plant.id)
  );

  const handleAddToMap = (plantId: string) => {
    // Find first empty cell
    for (let y = 0; y < gridConfig.rows; y++) {
      for (let x = 0; x < gridConfig.cols; x++) {
        const occupied = items.some((item) => item.x === x && item.y === y);
        if (!occupied) {
          addItem(plantId, x, y);
          return;
        }
      }
    }
    alert("No empty cells available!");
  };

  if (!user) {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-400">Please sign in to view your greenhouse map.</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Greenhouse Map</h2>
      <p className="text-slate-400 text-sm mb-4">
        Drag plants to arrange them on your greenhouse table. Changes save automatically.
      </p>

      {/* Canvas */}
      <div className="mb-6">
        {dimensions.width > 0 && (
          <GreenhouseCanvas
            width={dimensions.width}
            height={dimensions.height}
          />
        )}
      </div>

      {/* Unplaced Plants */}
      {unplacedPlants.length > 0 && (
        <section>
          <h3 className="font-semibold mb-3">Add Plants to Map</h3>
          <div className="flex flex-wrap gap-2">
            {unplacedPlants.map((plant) => (
              <button
                key={plant.id}
                onClick={() => handleAddToMap(plant.id)}
                className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg text-sm transition-colors"
              >
                + {plant.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {plants.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-400 mb-2">No plants to display</p>
          <a href="/plants/new" className="text-green-400 hover:text-green-300">
            Add your first plant
          </a>
        </div>
      )}
    </div>
  );
}
