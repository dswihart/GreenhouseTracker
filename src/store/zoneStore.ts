import { create } from "zustand";
import type { Zone, ZoneItem } from "@/lib/supabase/types";

interface ZoneState {
  zones: Zone[];
  zoneItems: ZoneItem[];
  activeZoneId: string | null;
  transplantMode: {
    active: boolean;
    plantId: string | null;
    sourceZoneId: string | null;
  };
  setZones: (zones: Zone[]) => void;
  addZone: (zone: Zone) => void;
  setZoneItems: (items: ZoneItem[]) => void;
  addZoneItem: (item: ZoneItem) => void;
  updateZoneItem: (id: string, updates: Partial<ZoneItem>) => void;
  removeZoneItem: (id: string) => void;
  setActiveZone: (zoneId: string | null) => void;
  startTransplant: (plantId: string, sourceZoneId: string) => void;
  cancelTransplant: () => void;
  completeTransplant: () => void;
}

export const useZoneStore = create<ZoneState>((set) => ({
  zones: [],
  zoneItems: [],
  activeZoneId: null,
  transplantMode: {
    active: false,
    plantId: null,
    sourceZoneId: null,
  },

  setZones: (zones) => set({ zones }),

  addZone: (zone) =>
    set((state) => ({ zones: [...state.zones, zone] })),

  setZoneItems: (zoneItems) => set({ zoneItems }),

  addZoneItem: (item) =>
    set((state) => ({ zoneItems: [...state.zoneItems, item] })),

  updateZoneItem: (id, updates) =>
    set((state) => ({
      zoneItems: state.zoneItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    })),

  removeZoneItem: (id) =>
    set((state) => ({
      zoneItems: state.zoneItems.filter((item) => item.id !== id),
    })),

  setActiveZone: (activeZoneId) => set({ activeZoneId }),

  startTransplant: (plantId, sourceZoneId) =>
    set({
      transplantMode: {
        active: true,
        plantId,
        sourceZoneId,
      },
    }),

  cancelTransplant: () =>
    set({
      transplantMode: {
        active: false,
        plantId: null,
        sourceZoneId: null,
      },
    }),

  completeTransplant: () =>
    set({
      transplantMode: {
        active: false,
        plantId: null,
        sourceZoneId: null,
      },
    }),
}));
