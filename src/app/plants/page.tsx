"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { usePlantStore } from "@/store/plantStore";
import { supabase } from "@/lib/supabase/client";
import type { PlantStage } from "@/lib/supabase/types";

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
  const { plants, setPlants, setLoading, isLoading } = usePlantStore();
  const [filter, setFilter] = useState<PlantStage | "all">("all");
  const [search, setSearch] = useState("");

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
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold">My Plants</h2>
          <p className="text-slate-400">{plants.length} plant{plants.length !== 1 ? 's' : ''} in your garden</p>
        </div>
        <Link
          href="/plants/new"
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-green-900/30 flex items-center gap-2"
        >
          <span className="text-xl">➕</span>
          <span>Add Plant</span>
        </Link>
      </div>

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
            <PlantCard key={plant.id} plant={plant} />
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

function PlantCard({ plant }: { plant: any }) {
  const daysPlanted = plant.date_planted
    ? Math.floor((Date.now() - new Date(plant.date_planted).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const harvestProgress = plant.date_planted && plant.days_to_maturity
    ? Math.min(100, Math.round((daysPlanted! / plant.days_to_maturity) * 100))
    : null;

  return (
    <Link
      href={`/plants/${plant.id}`}
      className="bg-slate-800/80 rounded-2xl p-5 hover:bg-slate-700/80 transition-all border border-slate-700/50 hover:border-green-600/50 hover:shadow-lg hover:shadow-green-900/20 group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{stageIcons[plant.current_stage as PlantStage]}</span>
          <div>
            <h3 className="font-bold text-xl group-hover:text-green-300 transition-colors">{plant.name}</h3>
            {plant.species && (
              <p className="text-slate-400">{plant.species}</p>
            )}
          </div>
        </div>
        <span className={`text-sm px-3 py-1.5 rounded-full font-medium bg-gradient-to-r ${stageColors[plant.current_stage as PlantStage]} shadow`}>
          {stageLabels[plant.current_stage as PlantStage]}
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
        {plant.days_to_maturity && (
          <div className="flex items-center gap-2 text-slate-400">
            <span>⏱️</span>
            <span>{plant.days_to_maturity - (daysPlanted || 0)} days left</span>
          </div>
        )}
      </div>
    </Link>
  );
}
