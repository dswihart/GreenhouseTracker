"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { usePlantStore } from "@/store/plantStore";
import { supabase } from "@/lib/supabase/client";
import type { PlantStage, Plant } from "@/lib/supabase/types";

const stageColors: Record<PlantStage, string> = {
  seed: "from-amber-600 to-amber-700",
  seedling: "from-lime-600 to-lime-700",
  vegetative: "from-green-600 to-green-700",
};

const stageIcons: Record<PlantStage, string> = {
  seed: "🌰",
  seedling: "🌱",
  vegetative: "🌿",
};

const stageLabels: Record<PlantStage, string> = {
  seed: "Seed",
  seedling: "Seedling",
  vegetative: "Vegetative",
};

export default function PlantsPage() {
  const { user } = useAuthStore();
  const { plants, setPlants, setLoading, isLoading, removePlant } = usePlantStore();
  const [filter, setFilter] = useState<PlantStage | "all">("all");
  const [search, setSearch] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedPlants, setSelectedPlants] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadPlants = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("plants")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setPlants(data);
      }
      setLoading(false);
    };

    loadPlants();
  }, [user, setPlants, setLoading]);

  const filteredPlants = plants.filter((plant) => {
    const matchesFilter = filter === "all" || plant.current_stage === filter;
    const matchesSearch =
      plant.name.toLowerCase().includes(search.toLowerCase()) ||
      plant.species?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    setSelectedPlants(new Set());
  };

  const togglePlantSelection = (plantId: string) => {
    const newSelected = new Set(selectedPlants);
    if (newSelected.has(plantId)) {
      newSelected.delete(plantId);
    } else {
      newSelected.add(plantId);
    }
    setSelectedPlants(newSelected);
  };

  const selectAll = () => {
    if (selectedPlants.size === filteredPlants.length) {
      setSelectedPlants(new Set());
    } else {
      setSelectedPlants(new Set(filteredPlants.map((p) => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPlants.size === 0) return;

    const count = selectedPlants.size;
    if (!confirm(`Delete ${count} plant${count !== 1 ? "s" : ""}? This cannot be undone.`)) return;

    setDeleting(true);

    try {
      const plantIds = Array.from(selectedPlants);

      // Delete journal entries first
      await supabase
        .from("journal_entries")
        .delete()
        .in("plant_id", plantIds);

      // Delete zone items
      await supabase
        .from("zone_items")
        .delete()
        .in("plant_id", plantIds);

      // Delete care schedules
      await supabase
        .from("care_schedules")
        .delete()
        .in("plant_id", plantIds);

      // Delete plants
      const { error } = await supabase
        .from("plants")
        .delete()
        .in("id", plantIds);

      if (!error) {
        // Update local state
        plantIds.forEach((id) => removePlant(id));
        setSelectedPlants(new Set());
        setSelectMode(false);
      }
    } catch (error) {
      console.error("Bulk delete error:", error);
      alert("Failed to delete some plants. Please try again.");
    }

    setDeleting(false);
  };

  if (!user) {
    return (
      <div className="p-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">🔒</div>
        <p className="text-slate-400 text-xl">Please sign in to view your plants.</p>
        <Link href="/auth" className="mt-4 text-green-400 hover:text-green-300 font-medium text-lg">
          Sign In →
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-3xl font-bold">My Plants</h2>
          <p className="text-slate-400">{plants.length} plant{plants.length !== 1 ? 's' : ''} in your garden</p>
        </div>
        <div className="flex gap-2">
          {plants.length > 0 && (
            <button
              onClick={toggleSelectMode}
              className={`px-4 py-3 rounded-xl font-medium transition-all ${
                selectMode
                  ? "bg-amber-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {selectMode ? "Cancel" : "Select"}
            </button>
          )}
          <Link
            href="/plants/new"
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-green-900/30 flex items-center gap-2"
          >
            <span className="text-xl">➕</span>
            <span>Add</span>
          </Link>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectMode && (
        <div className="bg-slate-800 rounded-xl p-4 mb-6 border border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={selectAll}
              className="text-sm text-slate-300 hover:text-white"
            >
              {selectedPlants.size === filteredPlants.length ? "Deselect All" : "Select All"}
            </button>
            <span className="text-slate-400">
              {selectedPlants.size} selected
            </span>
          </div>
          <button
            onClick={handleBulkDelete}
            disabled={selectedPlants.size === 0 || deleting}
            className="bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {deleting ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <span>🗑️</span>
                <span>Delete ({selectedPlants.size})</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">🔍</span>
          <input
            type="text"
            placeholder="Search plants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-14 pr-4 py-4 bg-slate-800 border-2 border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
          />
        </div>
      </div>

      {/* Filter Pills */}
      <div className="mb-8">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <FilterPill
            active={filter === "all"}
            onClick={() => setFilter("all")}
            icon="🌍"
            label="All"
            count={plants.length}
          />
          {(Object.keys(stageLabels) as PlantStage[]).map((stage) => {
            const count = plants.filter(p => p.current_stage === stage).length;
            return (
              <FilterPill
                key={stage}
                active={filter === stage}
                onClick={() => setFilter(stage)}
                icon={stageIcons[stage]}
                label={stageLabels[stage]}
                count={count}
              />
            );
          })}
        </div>
      </div>

      {/* Plant List */}
      {isLoading ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4 animate-bounce">🌱</div>
          <p className="text-slate-400 text-lg">Loading your plants...</p>
        </div>
      ) : filteredPlants.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/50 rounded-2xl border border-slate-700/50">
          <div className="text-6xl mb-4">🌱</div>
          <h3 className="text-2xl font-bold mb-2">No Plants Found</h3>
          <p className="text-slate-400 mb-6 text-lg">
            {plants.length === 0
              ? "Start your garden by adding your first plant!"
              : "No plants match your current filter."}
          </p>
          {plants.length === 0 && (
            <Link
              href="/plants/new"
              className="inline-block bg-gradient-to-r from-green-600 to-emerald-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg"
            >
              ➕ Add Your First Plant
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredPlants.map((plant) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              selectMode={selectMode}
              selected={selectedPlants.has(plant.id)}
              onToggleSelect={() => togglePlantSelection(plant.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-base font-medium whitespace-nowrap transition-all ${
        active
          ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg"
          : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
      <span className={`px-2 py-0.5 rounded-full text-sm ${active ? "bg-white/20" : "bg-slate-700"}`}>
        {count}
      </span>
    </button>
  );
}

function PlantCard({
  plant,
  selectMode,
  selected,
  onToggleSelect,
}: {
  plant: Plant;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const daysPlanted = plant.date_planted
    ? Math.floor((Date.now() - new Date(plant.date_planted).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const harvestProgress = plant.date_planted && plant.days_to_maturity
    ? Math.min(100, Math.round((daysPlanted! / plant.days_to_maturity) * 100))
    : null;

  const CardWrapper = selectMode ? "div" : Link;
  const cardProps = selectMode
    ? { onClick: onToggleSelect }
    : { href: `/plants/${plant.id}` };

  return (
    <CardWrapper
      {...(cardProps as any)}
      className={`bg-slate-800/80 rounded-2xl p-5 transition-all border-2 group cursor-pointer ${
        selected
          ? "border-red-500 bg-red-900/20"
          : "border-slate-700/50 hover:border-green-600/50 hover:bg-slate-700/80"
      } hover:shadow-lg hover:shadow-green-900/20`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          {selectMode && (
            <div
              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                selected
                  ? "bg-red-600 border-red-600 text-white"
                  : "border-slate-500 hover:border-slate-400"
              }`}
            >
              {selected && <span className="text-sm">✓</span>}
            </div>
          )}
          <span className="text-4xl">{stageIcons[plant.current_stage]}</span>
          <div>
            <h3 className="font-bold text-xl group-hover:text-green-300 transition-colors">{plant.name}</h3>
            {plant.species && (
              <p className="text-slate-400">{plant.species}</p>
            )}
          </div>
        </div>
        <span className={`text-sm px-3 py-1.5 rounded-full font-medium bg-gradient-to-r ${stageColors[plant.current_stage]} shadow`}>
          {stageLabels[plant.current_stage]}
        </span>
      </div>

      {/* Progress Bar */}
      {harvestProgress !== null && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-400">Harvest Progress</span>
            <span className="text-green-400 font-medium">{harvestProgress}%</span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
              style={{ width: `${harvestProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex justify-between text-sm">
        {plant.date_planted && (
          <div className="flex items-center gap-2 text-slate-400">
            <span>📅</span>
            <span>{daysPlanted} days old</span>
          </div>
        )}
        {plant.days_to_maturity && daysPlanted !== null && (
          <div className="flex items-center gap-2 text-slate-400">
            <span>⏱️</span>
            <span>{Math.max(0, plant.days_to_maturity - daysPlanted)} days left</span>
          </div>
        )}
      </div>
    </CardWrapper>
  );
}
