import { create } from "zustand";
import type { Zone, ZoneItem, Tray } from "@/lib/supabase/types";

interface ZoneState {
  zones: Zone[];
  zoneItems: ZoneItem[];
  trays: Tray[];
  activeZoneId: string | null;
  activeTrayId: string | null;
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
  // Tray management
  setTrays: (trays: Tray[]) => void;
  addTray: (tray: Tray) => void;
  updateTray: (id: string, updates: Partial<Tray>) => void;
  removeTray: (id: string) => void;
  setActiveTray: (trayId: string | null) => void;
  // Transplant mode
  startTransplant: (plantId: string, sourceZoneId: string) => void;
  cancelTransplant: () => void;
  completeTransplant: () => void;
}

export const useZoneStore = create<ZoneState>((set) => ({
  zones: [],
  zoneItems: [],
  trays: [],
  activeZoneId: null,
  activeTrayId: null,
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

  // Tray management
  setTrays: (trays) => set({ trays }),

  addTray: (tray) =>
    set((state) => ({ trays: [...state.trays, tray] })),

  updateTray: (id, updates) =>
    set((state) => ({
      trays: state.trays.map((tray) =>
        tray.id === id ? { ...tray, ...updates } : tray
      ),
    })),

  removeTray: (id) =>
    set((state) => ({
      trays: state.trays.filter((tray) => tray.id !== id),
    })),

  setActiveTray: (activeTrayId) => set({ activeTrayId }),

  // Transplant mode
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
