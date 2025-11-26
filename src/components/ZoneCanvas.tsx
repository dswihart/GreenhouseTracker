"use client";

import { useCallback, useRef, useState } from "react";
import { Stage, Layer, Rect, Group, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useZoneStore } from "@/store/zoneStore";
import { usePlantStore } from "@/store/plantStore";
import { supabase } from "@/lib/supabase/client";
import type { Zone, ZoneItem, ZoneType, Plant, Contact } from "@/lib/supabase/types";

// Larger cells for senior accessibility (minimum 60px touch target)
const CELL_SIZE = 70;
const CELL_GAP = 4;

interface ZoneCanvasProps {
  zone: Zone;
  items: ZoneItem[];
  width: number;
  height: number;
  onTransplant?: (plantId: string) => void;
  highlightRow?: number | null;
  contacts?: Contact[];
}

export function ZoneCanvas({
  zone,
  items,
  width,
  height,
  onTransplant,
  highlightRow,
  contacts = [],
}: ZoneCanvasProps) {
  const { updateZoneItem } = useZoneStore();
  const { plants } = usePlantStore();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    plant: Plant | null;
    item: ZoneItem | null;
  }>({ visible: false, x: 0, y: 0, plant: null, item: null });

  const handleDragEnd = useCallback(
    async (itemId: string, e: KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const cellUnit = CELL_SIZE + CELL_GAP;
      const x = Math.round(node.x() / cellUnit);
      const y = Math.round(node.y() / cellUnit);

      // Clamp to grid bounds
      const clampedX = Math.max(0, Math.min(x, zone.grid_config.cols - 1));
      const clampedY = Math.max(0, Math.min(y, zone.grid_config.rows - 1));

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
    [zone.grid_config.cols, zone.grid_config.rows, updateZoneItem]
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
    // If assigned to a contact, use their color
    if (assignedTo) {
      const contact = contacts.find((c) => c.id === assignedTo);
      if (contact?.color) return contact.color;
    }

    // Otherwise use stage-based color
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
        return "🌰";
      case "seedling":
        return "🌱";
      case "vegetative":
        return "🌿";
      case "flowering":
        return "🌸";
      case "harvest_ready":
        return "🥕";
      default:
        return "🌱";
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
  const cellUnit = CELL_SIZE + CELL_GAP;
  const canvasWidth = zone.grid_config.cols * cellUnit;

  // If filtering by row, only show that single row
  const displayRows = highlightRow !== null ? 1 : zone.grid_config.rows;
  const canvasHeight = displayRows * cellUnit;

  // Calculate scale to fit within container
  // Don't scale up for single row - keep original size for readability
  const scaleX = width / canvasWidth;
  const scaleY = height / canvasHeight;
  const scale = Math.min(scaleX, scaleY, 1); // Never scale up, only down if needed

  const handleMouseEnter = (item: ZoneItem, e: KonvaEventObject<MouseEvent>) => {
    const plant = plants.find((p) => p.id === item.plant_id);
    if (!plant) return;

    // Get the cell position and calculate tooltip position
    const displayY = highlightRow !== null ? 0 : item.y;
    const cellX = item.x * cellUnit * scale;
    const cellY = displayY * cellUnit * scale;

    // Position tooltip to the right of the cell, or left if near edge
    const tooltipX = cellX + (CELL_SIZE * scale) + 10;
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

  return (
    <div
      ref={containerRef}
      className="overflow-auto relative"
      style={{
        maxWidth: width,
        maxHeight: height,
        backgroundColor: zoneColors.bg,
        touchAction: "pan-y",
      }}
    >
      <Stage
        width={canvasWidth * scale}
        height={canvasHeight * scale}
        scaleX={scale}
        scaleY={scale}
        style={{ touchAction: "pan-y" }}
      >
        {/* Grid Layer */}
        <Layer>
          {Array.from({ length: displayRows }).map((_, rowIndex) => {
            // When filtering, rowIndex is 0 but we show the highlighted row
            const actualRow = highlightRow !== null ? highlightRow : rowIndex;
            return Array.from({ length: zone.grid_config.cols }).map((_, col) => (
              <Rect
                key={`${actualRow}-${col}`}
                x={col * cellUnit}
                y={rowIndex * cellUnit}
                width={CELL_SIZE}
                height={CELL_SIZE}
                fill={zoneColors.cell}
                cornerRadius={8}
                stroke={zoneColors.border}
                strokeWidth={2}
              />
            ));
          })}
        </Layer>

        {/* Plants Layer */}
        <Layer>
          {items.map((item) => {
            const plantName = getPlantName(item.plant_id);
            const plantStage = getPlantStage(item.plant_id);
            const displayName = plantName.length > 8
              ? plantName.substring(0, 7) + "…"
              : plantName;

            // When filtering by row, position all items at y=0 (single row view)
            const displayY = highlightRow !== null ? 0 : item.y;

            return (
              <Group
                key={item.id}
                x={item.x * cellUnit}
                y={displayY * cellUnit}
                draggable={highlightRow === null}
                onDragEnd={(e) => handleDragEnd(item.id, e)}
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
                  cornerRadius={10}
                  shadowColor="black"
                  shadowBlur={6}
                  shadowOpacity={0.4}
                  shadowOffsetY={2}
                />

                {/* Stage Indicator Bar */}
                <Rect
                  y={CELL_SIZE - 8}
                  width={CELL_SIZE}
                  height={8}
                  fill="rgba(0,0,0,0.3)"
                  cornerRadius={[0, 0, 10, 10]}
                />

                {/* Plant Name */}
                <Text
                  text={displayName}
                  fontSize={11}
                  fill="white"
                  width={CELL_SIZE}
                  height={CELL_SIZE - 12}
                  align="center"
                  verticalAlign="middle"
                  fontStyle="bold"
                  shadowColor="black"
                  shadowBlur={2}
                  shadowOpacity={0.5}
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
            className="absolute pointer-events-none z-50 bg-slate-900/95 border border-slate-500 rounded-xl p-3 shadow-2xl backdrop-blur-sm"
            style={{
              left: `${tooltip.x}px`,
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
              <span className="text-lg">{getStageIcon(tooltip.plant.current_stage)}</span>
              <span className="text-slate-200 font-medium">
                {formatStage(tooltip.plant.current_stage)}
              </span>
            </div>
            {/* Assigned To */}
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
