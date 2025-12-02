"use client";

import { useCallback, useRef, useState } from "react";
import { Stage, Layer, Rect, Group, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useZoneStore } from "@/store/zoneStore";
import { usePlantStore } from "@/store/plantStore";
import { supabase } from "@/lib/supabase/client";
import type { Zone, ZoneItem, ZoneType, Plant, Contact, Tray } from "@/lib/supabase/types";

// Base cell size - will be scaled to fit
const BASE_CELL_SIZE = 100;
const CELL_GAP = 8;

interface ZoneCanvasProps {
  zone: Zone;
  tray?: Tray | null;
  items: ZoneItem[];
  width: number;
  height: number;
  onTransplant?: (plantId: string) => void;
  onPlantClick?: (plantId: string) => void;
  onMoveToTray?: (itemId: string, trayId: string) => void;
  contacts?: Contact[];
}

export function ZoneCanvas({
  zone,
  tray,
  items,
  width,
  height,
  onTransplant,
  onPlantClick,
  onMoveToTray,
  contacts = [],
}: ZoneCanvasProps) {
  const { updateZoneItem } = useZoneStore();
  const { plants } = usePlantStore();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    plant: Plant | null;
    item: ZoneItem | null;
  }>({ visible: false, x: 0, y: 0, plant: null, item: null });

  // Use tray config if available, otherwise fall back to zone config
  const gridConfig = tray
    ? { rows: tray.rows, cols: tray.cols }
    : zone.grid_config;

  // Calculate the actual cell size to fit the grid in the available space
  const availableWidth = width - 20; // padding
  const availableHeight = height - 20;

  // Calculate cell size based on available space
  const cellSizeFromWidth = (availableWidth - (CELL_GAP * (gridConfig.cols - 1))) / gridConfig.cols;
  const cellSizeFromHeight = (availableHeight - (CELL_GAP * (gridConfig.rows - 1))) / gridConfig.rows;

  // Use the smaller of the two to ensure grid fits, with minimum size for touch targets
  const CELL_SIZE = Math.max(60, Math.min(cellSizeFromWidth, cellSizeFromHeight, BASE_CELL_SIZE));

  const cellUnit = CELL_SIZE + CELL_GAP;

  // Calculate actual canvas dimensions
  const canvasWidth = gridConfig.cols * CELL_SIZE + (gridConfig.cols - 1) * CELL_GAP;
  const canvasHeight = gridConfig.rows * CELL_SIZE + (gridConfig.rows - 1) * CELL_GAP;

  const handleDragEnd = useCallback(
    async (itemId: string, e: KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const x = Math.round(node.x() / cellUnit);
      const y = Math.round(node.y() / cellUnit);

      // Clamp to grid bounds
      const clampedX = Math.max(0, Math.min(x, gridConfig.cols - 1));
      const clampedY = Math.max(0, Math.min(y, gridConfig.rows - 1));

      // Snap to grid
      node.x(clampedX * cellUnit);
      node.y(clampedY * cellUnit);

      // Update local state
      updateZoneItem(itemId, { x: clampedX, y: clampedY });

      // Debounced save to DB
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        await supabase
          .from("zone_items")
          .update({ x: clampedX, y: clampedY })
          .eq("id", itemId);
      }, 500);
    },
    [gridConfig.cols, gridConfig.rows, updateZoneItem, cellUnit]
  );

  const getPlantName = (plantId: string) => {
    const plant = plants.find((p) => p.id === plantId);
    return plant?.name || "?";
  };

  const getPlantStage = (plantId: string) => {
    const plant = plants.find((p) => p.id === plantId);
    return plant?.current_stage || "seed";
  };

  const getPlantColor = (plantId: string, assignedTo: string | null) => {
    if (assignedTo) {
      const contact = contacts.find((c) => c.id === assignedTo);
      if (contact?.color) return contact.color;
    }

    const plant = plants.find((p) => p.id === plantId);
    if (!plant) return "#64748b";

    switch (plant.current_stage) {
      case "seed":
        return "#d97706";
      case "seedling":
        return "#84cc16";
      case "vegetative":
        return "#22c55e";
      case "flowering":
        return "#ec4899";
      case "harvest_ready":
        return "#f97316";
      default:
        return "#64748b";
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case "seed":
        return "seed";
      case "seedling":
        return "seedling";
      case "vegetative":
        return "veg";
      case "flowering":
        return "flower";
      case "harvest_ready":
        return "ready";
      default:
        return "plant";
    }
  };

  const getZoneColors = (type: ZoneType) => {
    switch (type) {
      case "greenhouse":
        return { bg: "#0d2818", cell: "#1a3d2b", border: "#2d5a40" };
      case "garden_bed":
        return { bg: "#2d1f0e", cell: "#3d2a15", border: "#5a4020" };
      case "indoors":
        return { bg: "#1a1f2e", cell: "#252b3d", border: "#3d4560" };
      default:
        return { bg: "#1e293b", cell: "#1e293b", border: "#334155" };
    }
  };

  const formatStage = (stage: string) => {
    return stage.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const zoneColors = getZoneColors(zone.type);

  const handleMouseEnter = (item: ZoneItem, e: KonvaEventObject<MouseEvent>) => {
    const plant = plants.find((p) => p.id === item.plant_id);
    if (!plant) return;

    const cellX = item.x * cellUnit;
    const cellY = item.y * cellUnit;

    const tooltipX = cellX + CELL_SIZE + 10;
    const tooltipY = cellY;

    setTooltip({
      visible: true,
      x: tooltipX,
      y: tooltipY,
      plant,
      item,
    });
  };

  const handleMouseLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0, plant: null, item: null });
  };

  // Calculate font sizes based on cell size
  const nameFontSize = Math.max(10, Math.min(14, CELL_SIZE / 7));
  const stageFontSize = Math.max(8, Math.min(10, CELL_SIZE / 10));
  const stageBarHeight = Math.max(10, CELL_SIZE / 8);

  return (
    <div
      className="relative rounded-xl flex items-start justify-start overflow-hidden"
      style={{
        width: width,
        height: canvasHeight + 20,
        backgroundColor: zoneColors.bg,
        padding: "10px",
      }}
    >
      <Stage
        width={canvasWidth}
        height={canvasHeight}
      >
        {/* Grid Layer */}
        <Layer>
          {Array.from({ length: gridConfig.rows }).map((_, rowIndex) =>
            Array.from({ length: gridConfig.cols }).map((_, col) => (
              <Rect
                key={`${rowIndex}-${col}`}
                x={col * cellUnit}
                y={rowIndex * cellUnit}
                width={CELL_SIZE}
                height={CELL_SIZE}
                fill={zoneColors.cell}
                cornerRadius={Math.min(12, CELL_SIZE / 8)}
                stroke={zoneColors.border}
                strokeWidth={2}
              />
            ))
          )}
        </Layer>

        {/* Plants Layer */}
        <Layer>
          {items.map((item) => {
            const plantName = getPlantName(item.plant_id);
            const plantStage = getPlantStage(item.plant_id);
            const maxChars = Math.floor(CELL_SIZE / 8);
            const displayName = plantName.length > maxChars
              ? plantName.substring(0, maxChars - 1) + "..."
              : plantName;

            return (
              <Group
                key={item.id}
                x={item.x * cellUnit}
                y={item.y * cellUnit}
                draggable
                onDragEnd={(e) => handleDragEnd(item.id, e)}
                onClick={() => onPlantClick?.(item.plant_id)}
                onTap={() => onPlantClick?.(item.plant_id)}
                onDblClick={() => onTransplant?.(item.plant_id)}
                onDblTap={() => onTransplant?.(item.plant_id)}
                onMouseEnter={(e) => handleMouseEnter(item, e)}
                onMouseLeave={handleMouseLeave}
              >
                {/* Plant Card Background */}
                <Rect
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  fill={getPlantColor(item.plant_id, item.assigned_to)}
                  cornerRadius={Math.min(12, CELL_SIZE / 8)}
                  shadowColor="black"
                  shadowBlur={6}
                  shadowOpacity={0.4}
                  shadowOffsetY={2}
                />

                {/* Stage Indicator Bar */}
                <Rect
                  y={CELL_SIZE - stageBarHeight}
                  width={CELL_SIZE}
                  height={stageBarHeight}
                  fill="rgba(0,0,0,0.3)"
                  cornerRadius={[0, 0, Math.min(12, CELL_SIZE / 8), Math.min(12, CELL_SIZE / 8)]}
                />

                {/* Stage Text */}
                <Text
                  text={getStageIcon(plantStage)}
                  fontSize={stageFontSize}
                  fill="rgba(255,255,255,0.8)"
                  width={CELL_SIZE}
                  y={CELL_SIZE - stageBarHeight + 1}
                  height={stageBarHeight - 2}
                  align="center"
                  fontStyle="bold"
                />

                {/* Plant Name */}
                <Text
                  text={displayName}
                  fontSize={nameFontSize}
                  fill="white"
                  width={CELL_SIZE}
                  height={CELL_SIZE - stageBarHeight}
                  align="center"
                  verticalAlign="middle"
                  fontStyle="bold"
                  shadowColor="black"
                  shadowBlur={2}
                  shadowOpacity={0.6}
                  padding={4}
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>

      {/* Tooltip */}
      {tooltip.visible && tooltip.plant && tooltip.item && (() => {
        const assignedContact = tooltip.item.assigned_to
          ? contacts.find(c => c.id === tooltip.item!.assigned_to)
          : null;
        return (
          <div
            className="absolute pointer-events-none z-50 bg-slate-900/95 border border-slate-500 rounded-xl p-4 shadow-2xl backdrop-blur-sm"
            style={{
              left: `${Math.min(tooltip.x, width - 200)}px`,
              top: `${tooltip.y}px`,
              minWidth: "160px",
              maxWidth: "220px",
            }}
          >
            <div className="font-bold text-white text-base mb-1">
              {tooltip.plant.name}
            </div>
            {tooltip.plant.species && (
              <div className="text-slate-300 text-sm capitalize mb-2">
                {tooltip.plant.species}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm mb-2">
              <span className="text-slate-200 font-medium">
                {formatStage(tooltip.plant.current_stage)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm mb-2">
              <span className="text-slate-400">Assigned:</span>
              {assignedContact ? (
                <span
                  className="px-2 py-0.5 rounded text-white text-xs font-medium"
                  style={{ backgroundColor: assignedContact.color || '#22c55e' }}
                >
                  {assignedContact.name}
                </span>
              ) : (
                <span className="text-slate-500">Unassigned</span>
              )}
            </div>
            <div className="text-slate-400 text-xs pt-2 border-t border-slate-700">
              <div>Column {tooltip.item.x + 1}, Row {tooltip.item.y + 1}</div>
              {tooltip.plant.date_planted && (
                <div className="mt-1">
                  Planted: {new Date(tooltip.plant.date_planted).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
