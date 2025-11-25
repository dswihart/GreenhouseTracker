export type PlantStage = "seed" | "seedling" | "vegetative";
export type ZoneType = "greenhouse" | "indoors";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string | null;
          last_name: string | null;
          settings: Record<string, unknown> | null;
        };
        Insert: {
          id: string;
          first_name?: string | null;
          last_name?: string | null;
          settings?: Record<string, unknown> | null;
        };
        Update: {
          id?: string;
          first_name?: string | null;
          last_name?: string | null;
          settings?: Record<string, unknown> | null;
        };
      };
      contacts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
        };
      };
      plants: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          species: string | null;
          date_planted: string | null;
          transplant_date: string | null;
          days_to_maturity: number | null;
          current_stage: PlantStage;
          contact_id: string | null;
          description: string | null;
          sun_requirements: string | null;
          watering_needs: string | null;
          planting_depth: string | null;
          spacing: string | null;
          harvest_info: string | null;
          growing_tips: string | null;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          species?: string | null;
          date_planted?: string | null;
          transplant_date?: string | null;
          days_to_maturity?: number | null;
          current_stage?: PlantStage;
          contact_id?: string | null;
          description?: string | null;
          sun_requirements?: string | null;
          watering_needs?: string | null;
          planting_depth?: string | null;
          spacing?: string | null;
          harvest_info?: string | null;
          growing_tips?: string | null;
          image_url?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          species?: string | null;
          date_planted?: string | null;
          transplant_date?: string | null;
          days_to_maturity?: number | null;
          current_stage?: PlantStage;
          contact_id?: string | null;
          description?: string | null;
          sun_requirements?: string | null;
          watering_needs?: string | null;
          planting_depth?: string | null;
          spacing?: string | null;
          harvest_info?: string | null;
          growing_tips?: string | null;
          image_url?: string | null;
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
        };
        Insert: {
          id?: string;
          zone_id: string;
          plant_id: string;
          x: number;
          y: number;
        };
        Update: {
          id?: string;
          zone_id?: string;
          plant_id?: string;
          x?: number;
          y?: number;
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
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
