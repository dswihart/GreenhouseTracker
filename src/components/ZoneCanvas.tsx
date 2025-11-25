"use client";

import { useCallback, useRef } from "react";
import { Stage, Layer, Rect, Group, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useZoneStore } from "@/store/zoneStore";
import { usePlantStore } from "@/store/plantStore";
import { supabase } from "@/lib/supabase/client";
import type { Zone, ZoneItem, ZoneType } from "@/lib/supabase/types";

const CELL_SIZE = 70;
const CELL_GAP = 4;

interface ZoneCanvasProps {
  zone: Zone;
  items: ZoneItem[];
  width: number;
  height: number;
  onTransplant?: (plantId: string) => void;
}

export function ZoneCanvas({ zone, items, width, height, onTransplant }: ZoneCanvasProps) {
  const { updateZoneItem } = useZoneStore();
  const { plants } = usePlantStore();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleDragEnd = useCallback(
    async (itemId: string, e: KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const cellUnit = CELL_SIZE + CELL_GAP;
      const x = Math.round(node.x() / cellUnit);
      const y = Math.round(node.y() / cellUnit);
      const clampedX = Math.max(0, Math.min(x, zone.grid_config.cols - 1));
      const clampedY = Math.max(0, Math.min(y, zone.grid_config.rows - 1));
      node.x(clampedX * cellUnit);
      node.y(clampedY * cellUnit);
      updateZoneItem(itemId, { x: clampedX, y: clampedY });
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        await supabase.from("zone_items").update({ x: clampedX, y: clampedY }).eq("id", itemId);
      }, 500);
    },
    [zone.grid_config.cols, zone.grid_config.rows, updateZoneItem]
  );

  const getPlantName = (plantId: string) => plants.find((p) => p.id === plantId)?.name || "?";
  const getPlantStage = (plantId: string) => plants.find((p) => p.id === plantId)?.current_stage || "seed";

  const getPlantColor = (plantId: string) => {
    const plant = plants.find((p) => p.id === plantId);
    if (!plant) return "#64748b";
    switch (plant.current_stage) {
      case "seed": return "#d97706";
      case "seedling": return "#84cc16";
      case "vegetative": return "#22c55e";
      default: return "#64748b";
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case "seed": return "🌰";
      case "seedling": return "🌱";
      case "vegetative": return "🌿";
      default: return "🌱";
    }
  };

  const getZoneColors = (type: ZoneType) => {
    switch (type) {
      case "greenhouse": return { bg: "#0d2818", cell: "#1a3d2b", border: "#2d5a40" };
      default: return { bg: "#1e293b", cell: "#1e293b", border: "#334155" };
    }
  };

  const zoneColors = getZoneColors(zone.type);
  const cellUnit = CELL_SIZE + CELL_GAP;
  const canvasWidth = zone.grid_config.cols * cellUnit;
  const canvasHeight = zone.grid_config.rows * cellUnit;
  const scaleX = width / canvasWidth;
  const scaleY = height / canvasHeight;
  const scale = Math.min(scaleX, scaleY, 1);

  return (
    <div className="overflow-auto" style={{ maxWidth: width, maxHeight: height, backgroundColor: zoneColors.bg }}>
      <Stage width={canvasWidth * scale} height={canvasHeight * scale} scaleX={scale} scaleY={scale}>
        <Layer>
          {Array.from({ length: zone.grid_config.rows }).map((_, row) =>
            Array.from({ length: zone.grid_config.cols }).map((_, col) => (
              <Rect key={`${row}-${col}`} x={col * cellUnit} y={row * cellUnit} width={CELL_SIZE} height={CELL_SIZE} fill={zoneColors.cell} cornerRadius={8} stroke={zoneColors.border} strokeWidth={2} />
            ))
          )}
        </Layer>
        <Layer>
          {items.map((item) => {
            const plantName = getPlantName(item.plant_id);
            const displayName = plantName.length > 8 ? plantName.substring(0, 7) + "…" : plantName;
            return (
              <Group key={item.id} x={item.x * cellUnit} y={item.y * cellUnit} draggable onDragEnd={(e) => handleDragEnd(item.id, e)} onDblClick={() => onTransplant?.(item.plant_id)} onDblTap={() => onTransplant?.(item.plant_id)}>
                <Rect width={CELL_SIZE} height={CELL_SIZE} fill={getPlantColor(item.plant_id)} cornerRadius={10} shadowColor="black" shadowBlur={6} shadowOpacity={0.4} shadowOffsetY={2} />
                <Rect y={CELL_SIZE - 8} width={CELL_SIZE} height={8} fill="rgba(0,0,0,0.3)" cornerRadius={[0, 0, 10, 10]} />
                <Text text={displayName} fontSize={11} fill="white" width={CELL_SIZE} height={CELL_SIZE - 12} align="center" verticalAlign="middle" fontStyle="bold" shadowColor="black" shadowBlur={2} shadowOpacity={0.5} />
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
