import { create } from "zustand";

interface MapItem {
  plant_id: string;
  x: number;
  y: number;
}

interface GridConfig {
  rows: number;
  cols: number;
}

interface MapState {
  gridConfig: GridConfig;
  items: MapItem[];
  isDirty: boolean;
  setGridConfig: (config: GridConfig) => void;
  setItems: (items: MapItem[]) => void;
  moveItem: (plantId: string, x: number, y: number) => void;
  addItem: (plantId: string, x: number, y: number) => void;
  removeItem: (plantId: string) => void;
  markClean: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  gridConfig: { rows: 10, cols: 8 },
  items: [],
  isDirty: false,

  setGridConfig: (config) => set({ gridConfig: config }),

  setItems: (items) => set({ items, isDirty: false }),

  moveItem: (plantId, x, y) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.plant_id === plantId ? { ...item, x, y } : item
      ),
      isDirty: true,
    })),

  addItem: (plantId, x, y) =>
    set((state) => ({
      items: [...state.items, { plant_id: plantId, x, y }],
      isDirty: true,
    })),

  removeItem: (plantId) =>
    set((state) => ({
      items: state.items.filter((item) => item.plant_id !== plantId),
      isDirty: true,
    })),

  markClean: () => set({ isDirty: false }),
}));
