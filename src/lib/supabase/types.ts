export type PlantStage = "seed" | "seedling" | "vegetative" | "flowering" | "harvest_ready";
export type ZoneType = "greenhouse" | "garden_bed" | "indoors";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          settings: Record<string, unknown> | null;
        };
        Insert: {
          id: string;
          settings?: Record<string, unknown> | null;
        };
        Update: {
          id?: string;
          settings?: Record<string, unknown> | null;
        };
      };
      plants: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          species: string | null;
          description: string | null;
          photo_url: string | null;
          category: string | null;
          assigned_to: string | null;
          date_planted: string | null;
          transplant_date: string | null;
          days_to_maturity: number | null;
          germination_days: number | null;
          height_inches: number | null;
          spacing_inches: number | null;
          planting_depth_inches: number | null;
          current_stage: PlantStage;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          species?: string | null;
          description?: string | null;
          photo_url?: string | null;
          category?: string | null;
          assigned_to?: string | null;
          date_planted?: string | null;
          transplant_date?: string | null;
          days_to_maturity?: number | null;
          germination_days?: number | null;
          height_inches?: number | null;
          spacing_inches?: number | null;
          planting_depth_inches?: number | null;
          current_stage?: PlantStage;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          species?: string | null;
          description?: string | null;
          photo_url?: string | null;
          category?: string | null;
          assigned_to?: string | null;
          date_planted?: string | null;
          transplant_date?: string | null;
          days_to_maturity?: number | null;
          germination_days?: number | null;
          height_inches?: number | null;
          spacing_inches?: number | null;
          planting_depth_inches?: number | null;
          current_stage?: PlantStage;
        };
      };
      zones: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: ZoneType;
          grid_config: { rows: number; cols: number };
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: ZoneType;
          grid_config?: { rows: number; cols: number };
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: ZoneType;
          grid_config?: { rows: number; cols: number };
        };
      };
      zone_items: {
        Row: {
          id: string;
          zone_id: string;
          plant_id: string;
          x: number;
          y: number;
          assigned_to: string | null;
        };
        Insert: {
          id?: string;
          zone_id: string;
          plant_id: string;
          x: number;
          y: number;
          assigned_to?: string | null;
        };
        Update: {
          id?: string;
          zone_id?: string;
          plant_id?: string;
          x?: number;
          y?: number;
          assigned_to?: string | null;
        };
      };
      contacts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
        };
      };
      map_layout: {
        Row: {
          id: string;
          user_id: string;
          grid_config: { rows: number; cols: number };
          items: Array<{ plant_id: string; x: number; y: number }>;
        };
        Insert: {
          id?: string;
          user_id: string;
          grid_config?: { rows: number; cols: number };
          items?: Array<{ plant_id: string; x: number; y: number }>;
        };
        Update: {
          id?: string;
          user_id?: string;
          grid_config?: { rows: number; cols: number };
          items?: Array<{ plant_id: string; x: number; y: number }>;
        };
      };
      journal_entries: {
        Row: {
          id: string;
          plant_id: string;
          photo_url: string | null;
          notes: string | null;
          ai_diagnosis: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          plant_id: string;
          photo_url?: string | null;
          notes?: string | null;
          ai_diagnosis?: Record<string, unknown> | null;
        };
        Update: {
          id?: string;
          plant_id?: string;
          photo_url?: string | null;
          notes?: string | null;
          ai_diagnosis?: Record<string, unknown> | null;
        };
      };
      care_schedules: {
        Row: {
          id: string;
          plant_id: string;
          water_interval_days: number;
          last_watered: string | null;
          next_due: string | null;
        };
        Insert: {
          id?: string;
          plant_id: string;
          water_interval_days: number;
          last_watered?: string | null;
          next_due?: string | null;
        };
        Update: {
          id?: string;
          plant_id?: string;
          water_interval_days?: number;
          last_watered?: string | null;
          next_due?: string | null;
        };
      };
    };
  };
}

export type Plant = Database["public"]["Tables"]["plants"]["Row"];
export type PlantInsert = Database["public"]["Tables"]["plants"]["Insert"];
export type Zone = Database["public"]["Tables"]["zones"]["Row"];
export type ZoneItem = Database["public"]["Tables"]["zone_items"]["Row"];
export type MapLayout = Database["public"]["Tables"]["map_layout"]["Row"];
export type JournalEntry = Database["public"]["Tables"]["journal_entries"]["Row"];
export type CareSchedule = Database["public"]["Tables"]["care_schedules"]["Row"];
export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
