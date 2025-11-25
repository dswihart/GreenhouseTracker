"use client";

import { useEffect, useRef, useCallback } from "react";
import { Stage, Layer, Rect, Group, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useMapStore } from "@/store/mapStore";
import { usePlantStore } from "@/store/plantStore";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/authStore";

const CELL_SIZE = 60;
const CELL_GAP = 4;

interface GreenhouseCanvasProps {
  width: number;
  height: number;
}

export function GreenhouseCanvas({ width, height }: GreenhouseCanvasProps) {
  const { user } = useAuthStore();
  const { gridConfig, items, setItems, moveItem, isDirty, markClean } =
    useMapStore();
  const { plants } = usePlantStore();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load map layout
  useEffect(() => {
    if (!user) return;

    const loadMap = async () => {
      const { data } = await supabase
        .from("map_layout")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setItems(data.items || []);
      }
    };

    loadMap();
  }, [user, setItems]);

  // Auto-save with debounce
  const saveMap = useCallback(async () => {
    if (!user || !isDirty) return;

    const { data: existing } = await supabase
      .from("map_layout")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      await supabase
        .from("map_layout")
        .update({ items })
        .eq("id", existing.id);
    } else {
      await (supabase as any).from("map_layout").insert({
        user_id: user.id,
        grid_config: gridConfig,
        items,
      });
    }

    markClean();
  }, [user, items, gridConfig, isDirty, markClean]);

  useEffect(() => {
    if (!isDirty) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(saveMap, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isDirty, saveMap]);

  const handleDragEnd = (
    plantId: string,
    e: KonvaEventObject<DragEvent>
  ) => {
    const node = e.target;
    const x = Math.round(node.x() / (CELL_SIZE + CELL_GAP));
    const y = Math.round(node.y() / (CELL_SIZE + CELL_GAP));

    // Clamp to grid bounds
    const clampedX = Math.max(0, Math.min(x, gridConfig.cols - 1));
    const clampedY = Math.max(0, Math.min(y, gridConfig.rows - 1));

    // Snap to grid
    node.x(clampedX * (CELL_SIZE + CELL_GAP));
    node.y(clampedY * (CELL_SIZE + CELL_GAP));

    moveItem(plantId, clampedX, clampedY);
  };

  const getPlantName = (plantId: string) => {
    const plant = plants.find((p) => p.id === plantId);
    return plant?.name || "?";
  };

  const getPlantColor = (plantId: string) => {
    const plant = plants.find((p) => p.id === plantId);
    if (!plant) return "#64748b";

    switch (plant.current_stage) {
      case "seed":
        return "#d97706";
      case "seedling":
        return "#84cc16";
      case "vegetative":
        return "#22c55e";
      default:
        return "#64748b";
    }
  };

  const canvasWidth = gridConfig.cols * (CELL_SIZE + CELL_GAP);
  const canvasHeight = gridConfig.rows * (CELL_SIZE + CELL_GAP);

  return (
    <div
      className="overflow-auto bg-slate-900 rounded-lg"
      style={{ maxWidth: width, maxHeight: height }}
    >
      <Stage width={canvasWidth} height={canvasHeight}>
        {/* Grid Layer */}
        <Layer>
          {Array.from({ length: gridConfig.rows }).map((_, row) =>
            Array.from({ length: gridConfig.cols }).map((_, col) => (
              <Rect
                key={`${row}-${col}`}
                x={col * (CELL_SIZE + CELL_GAP)}
                y={row * (CELL_SIZE + CELL_GAP)}
                width={CELL_SIZE}
                height={CELL_SIZE}
                fill="#1e293b"
                cornerRadius={4}
              />
            ))
          )}
        </Layer>

        {/* Plants Layer */}
        <Layer>
          {items.map((item) => (
            <Group
              key={item.plant_id}
              x={item.x * (CELL_SIZE + CELL_GAP)}
              y={item.y * (CELL_SIZE + CELL_GAP)}
              draggable
              onDragEnd={(e) => handleDragEnd(item.plant_id, e)}
            >
              <Rect
                width={CELL_SIZE}
                height={CELL_SIZE}
                fill={getPlantColor(item.plant_id)}
                cornerRadius={8}
                shadowColor="black"
                shadowBlur={4}
                shadowOpacity={0.3}
              />
              <Text
                text={getPlantName(item.plant_id).substring(0, 8)}
                fontSize={10}
                fill="white"
                width={CELL_SIZE}
                height={CELL_SIZE}
                align="center"
                verticalAlign="middle"
                fontStyle="bold"
              />
            </Group>
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
