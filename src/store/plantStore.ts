import { create } from "zustand";
import type { Plant } from "@/lib/supabase/types";

interface PlantState {
  plants: Plant[];
  selectedPlant: Plant | null;
  isLoading: boolean;
  setPlants: (plants: Plant[]) => void;
  addPlant: (plant: Plant) => void;
  updatePlant: (id: string, updates: Partial<Plant>) => void;
  removePlant: (id: string) => void;
  selectPlant: (plant: Plant | null) => void;
  setLoading: (loading: boolean) => void;
}

export const usePlantStore = create<PlantState>((set) => ({
  plants: [],
  selectedPlant: null,
  isLoading: false,

  setPlants: (plants) => set({ plants }),

  addPlant: (plant) =>
    set((state) => ({ plants: [...state.plants, plant] })),

  updatePlant: (id, updates) =>
    set((state) => ({
      plants: state.plants.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  removePlant: (id) =>
    set((state) => ({
      plants: state.plants.filter((p) => p.id !== id),
      selectedPlant:
        state.selectedPlant?.id === id ? null : state.selectedPlant,
    })),

  selectPlant: (plant) => set({ selectedPlant: plant }),

  setLoading: (isLoading) => set({ isLoading }),
}));
