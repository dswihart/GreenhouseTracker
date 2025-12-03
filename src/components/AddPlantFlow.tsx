"use client";

import { useState } from "react";
import type { Plant, Contact, Tray, ZoneItem } from "@/lib/supabase/types";
import { getCompanionRelation, getCompanions } from "@/lib/companionPlanting";

interface AddPlantFlowProps {
  unplacedPlants: Plant[];
  tray: Tray;
  existingItems: ZoneItem[];
  contacts: Contact[];
  onClose: () => void;
  onAddPlant: (plantId: string, x: number, y: number, contactId: string | null) => Promise<void>;
  allPlants?: Plant[];
}

type Step = "select-mode" | "select-plant" | "select-slot" | "select-person";
type Mode = "single" | "bulk";

export function AddPlantFlow({
  unplacedPlants,
  tray,
  existingItems,
  contacts,
  onClose,
  onAddPlant,
  allPlants = [] as Plant[],
}: AddPlantFlowProps) {
  const [mode, setMode] = useState<Mode>("single");
  const [step, setStep] = useState<Step>("select-mode");
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ x: number; y: number } | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Array<{ x: number; y: number }>>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const [addedPlants, setAddedPlants] = useState<string[]>([]);
  const [addedSlots, setAddedSlots] = useState<Array<{x: number, y: number}>>([]);
  const [lastPerson, setLastPerson] = useState<string | null>(null);

  const availablePlants = allPlants.length > 0 ? allPlants : unplacedPlants;
  
  // Sort by last planted (most recent first)
  const sortedPlants = [...availablePlants].sort((a, b) => {
    if (!a.date_planted && !b.date_planted) return 0;
    if (!a.date_planted) return 1;
    if (!b.date_planted) return -1;
    return new Date(b.date_planted).getTime() - new Date(a.date_planted).getTime();
  });
  
  const filteredPlants = sortedPlants.filter((plant) =>
    plant.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isSlotOccupied = (x: number, y: number) => {
    return existingItems.some((item) => item.x === x && item.y === y) ||
           addedSlots.some((slot) => slot.x === x && slot.y === y);
  };

  const isSlotSelected = (x: number, y: number) => {
    return selectedSlots.some((slot) => slot.x === x && slot.y === y);
  };

  const getAdjacentPlants = (x: number, y: number) => {
    const adjacent: Plant[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const item = existingItems.find(i => i.x === x + dx && i.y === y + dy);
        if (item) {
          const plant = allPlants.find(p => p.id === item.plant_id);
          if (plant) adjacent.push(plant);
        }
      }
    }
    return adjacent;
  };

  const handleSelectPlant = (plant: Plant) => {
    setSelectedPlant(plant);
    setStep("select-slot");
  };

  const handleSelectSlot = (x: number, y: number) => {
    if (isSlotOccupied(x, y)) return;

    if (mode === "bulk") {
      if (isSlotSelected(x, y)) {
        setSelectedSlots(selectedSlots.filter(s => s.x !== x || s.y !== y));
      } else {
        setSelectedSlots([...selectedSlots, { x, y }]);
      }
    } else {
      setSelectedSlot({ x, y });
      if (contacts.length > 0) {
        setStep("select-person");
      } else {
        finishAddingPlant(selectedPlant!.id, x, y, null);
      }
    }
  };

  const handleBulkConfirm = () => {
    if (selectedSlots.length === 0 || !selectedPlant) return;
    if (contacts.length > 0) {
      setStep("select-person");
    } else {
      finishBulkAdd(null);
    }
  };

  const handleSelectPerson = (contactId: string | null) => {
    if (mode === "bulk") {
      finishBulkAdd(contactId);
    } else {
      if (!selectedPlant || !selectedSlot) return;
      finishAddingPlant(selectedPlant.id, selectedSlot.x, selectedSlot.y, contactId);
    }
  };

  const finishBulkAdd = async (contactId: string | null) => {
    if (!selectedPlant || selectedSlots.length === 0) return;
    setIsAdding(true);
    try {
      for (const slot of selectedSlots) {
        await onAddPlant(selectedPlant.id, slot.x, slot.y, contactId);
      }
      setAddedPlants(prev => [...prev, selectedPlant.id]);
      setAddedSlots(prev => [...prev, ...selectedSlots]);
      setLastPerson(contactId);
      setSelectedPlant(null);
      setSelectedSlots([]);
      setSearchTerm("");
      setStep("select-plant");
    } catch (error) {
      console.error("Failed to add plants:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const finishAddingPlant = async (plantId: string, x: number, y: number, contactId: string | null) => {
    setIsAdding(true);
    try {
      await onAddPlant(plantId, x, y, contactId);
      setAddedPlants(prev => [...prev, plantId]);
      setAddedSlots(prev => [...prev, { x, y }]);
      setLastPerson(contactId);
      setSelectedPlant(null);
      setSelectedSlot(null);
      setSearchTerm("");
      setStep("select-plant");
    } catch (error) {
      console.error("Failed to add plant:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const getPersonName = (contactId: string | null) => {
    if (!contactId) return null;
    return contacts.find((c) => c.id === contactId)?.name || null;
  };

  // LARGER cells for easier tapping
  // Smaller cells for landscape mode
  const maxCellSize = 44;
  const cellSize = Math.min(maxCellSize, Math.floor(240 / Math.max(tray.cols, tray.rows)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-slate-800 rounded-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header - LARGER text */}
        <div className="p-3 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Add Plants</h2>
            <button
              onClick={onClose}
              className="w-14 h-14 flex items-center justify-center text-3xl text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-full active:bg-slate-500"
            >
              ✕
            </button>
          </div>



          {addedSlots.length > 0 && (
            <div className="mt-4 flex items-center gap-3 text-green-400 bg-green-900/30 p-3 rounded-xl">
              <span className="text-3xl">✓</span>
              <span className="text-xl font-bold">{addedSlots.length} plant{addedSlots.length !== 1 ? "s" : ""} added!</span>
            </div>
          )}
        </div>

        {/* Step 0: Select Mode */}
        {step === "select-mode" && (
          <div className="p-5 flex-1">
            <h3 className="text-xl font-bold mb-6 text-center">
              How would you like to add plants?
            </h3>
            
            <div className="space-y-4">
              <button
                onClick={() => { setMode("single"); setStep("select-plant"); }}
                className="w-full p-6 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-2xl text-left transition-colors border-2 border-transparent hover:border-green-500"
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">☝️</span>
                  <div>
                    <div className="text-xl font-bold">One at a Time</div>
                    <div className="text-slate-400">Add plants individually to specific spots</div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => { setMode("bulk"); setStep("select-plant"); }}
                className="w-full p-6 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-2xl text-left transition-colors border-2 border-transparent hover:border-green-500"
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">✋</span>
                  <div>
                    <div className="text-xl font-bold">Fill Multiple Spots</div>
                    <div className="text-slate-400">Select many cells, then add the same plant</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Select Plant */}
        {step === "select-plant" && (
          <div className="p-5 overflow-y-auto" style={{ maxHeight: "55vh" }}>
            <button
              onClick={() => { setStep("select-mode"); setSelectedSlots([]); setSelectedSlot(null); }}
              className="flex items-center gap-1 text-base text-green-400 hover:text-green-300 mb-3"
            >
              <span className="text-xl">←</span> Change Mode
            </button>
            <h3 className="text-lg font-bold mb-3">
              Pick a Plant ({mode === "bulk" ? "Fill Multiple" : "One at a Time"})
            </h3>

            {availablePlants.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">✓</div>
                <p className="text-slate-300 text-xl font-medium">
                  {addedSlots.length > 0 ? "All done!" : "All plants placed!"}
                </p>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Type to search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-700 border-2 border-slate-600 rounded-xl text-xl mb-4 focus:border-green-500 focus:outline-none"
                />

                <div className="space-y-3">
                  {filteredPlants.map((plant) => (
                    <button
                      key={plant.id}
                      onClick={() => handleSelectPlant(plant)}
                      className="w-full flex items-center gap-4 px-5 py-5 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-2xl text-left transition-colors"
                    >
                      <span className="text-4xl">🌱</span>
                      <div className="flex-1">
                        <div className="text-xl font-bold">{plant.name}</div>
                        {plant.species && <div className="text-lg text-slate-400">{plant.species}</div>}
                      </div>
                      <span className="text-3xl text-slate-500">→</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2: Select Slot(s) */}
        {step === "select-slot" && selectedPlant && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="p-4 overflow-y-auto flex-1 min-h-0">
            <button
              onClick={() => { setStep("select-plant"); setSelectedSlots([]); }}
              className="flex items-center gap-1 text-base text-green-400 hover:text-green-300 mb-2"
            >
              <span className="text-xl">←</span> Back
            </button>

            <h3 className="text-lg font-bold mb-1">
              Step 2: {mode === "bulk" ? "Tap Cells to Fill" : "Pick a Spot"}
            </h3>
            <p className="text-sm text-slate-300 mb-2">
              Placing: <span className="font-bold text-green-400">{selectedPlant.name}</span>
              {mode === "bulk" && selectedSlots.length > 0 && (
                <span className="ml-2 text-amber-400">({selectedSlots.length} selected)</span>
              )}
            </p>

            <div className="flex justify-center mb-2">
              <div
                className="grid gap-2 p-4 bg-slate-900 rounded-2xl"
                style={{ gridTemplateColumns: `repeat(${tray.cols}, ${cellSize}px)` }}
              >
                {Array.from({ length: tray.rows }).map((_, y) =>
                  Array.from({ length: tray.cols }).map((_, x) => {
                    const occupied = isSlotOccupied(x, y);
                    const selected = isSlotSelected(x, y);
                    const adjacentPlants = getAdjacentPlants(x, y);
                    let borderColor = "border-green-600/50";

                    if (!occupied && selectedPlant && adjacentPlants.length > 0) {
                      const hasEnemy = adjacentPlants.some(p => getCompanionRelation(selectedPlant.name, p.name) === "enemy");
                      const hasFriend = adjacentPlants.some(p => getCompanionRelation(selectedPlant.name, p.name) === "friend");
                      if (hasEnemy) borderColor = "border-red-500 border-4";
                      else if (hasFriend) borderColor = "border-green-400 border-4";
                    }

                    return (
                      <button
                        key={`${x}-${y}`}
                        onClick={() => handleSelectSlot(x, y)}
                        disabled={occupied}
                        className={`rounded-xl flex items-center justify-center text-2xl font-bold transition-all ${
                          occupied
                            ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                            : selected
                            ? "bg-green-500 text-white border-4 border-green-300"
                            : `bg-green-800/50 hover:bg-green-600 active:bg-green-500 text-white border-2 border-dashed ${borderColor}`
                        }`}
                        style={{ width: cellSize, height: cellSize }}
                      >
                        {occupied ? "🌱" : selected ? "✓" : ""}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Legend - compact */}
            <div className="flex justify-center gap-4 text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded border-2 border-green-400 bg-slate-800"></span>
                Good
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded border-2 border-red-500 bg-slate-800"></span>
                Bad
              </span>
            </div>

            </div>
            {/* Sticky confirm button */}
            {mode === "bulk" && selectedSlots.length > 0 && (
              <div className="p-3 border-t border-slate-700 bg-slate-800 flex-shrink-0">
                <button
                  onClick={handleBulkConfirm}
                  disabled={isAdding}
                  className="w-full py-3 bg-green-600 hover:bg-green-500 active:bg-green-400 text-white text-lg font-bold rounded-xl disabled:opacity-50"
                >
                  {isAdding ? "Adding..." : `Plant ${selectedSlots.length} ${selectedPlant.name}`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Select Person */}
        {step === "select-person" && selectedPlant && (selectedSlot || selectedSlots.length > 0) && (
          <div className="p-5 overflow-y-auto" style={{ maxHeight: "55vh" }}>
            <button
              onClick={() => setStep("select-slot")}
              className="flex items-center gap-2 text-lg text-green-400 hover:text-green-300 mb-4 py-2"
            >
              <span className="text-2xl">←</span> Back
            </button>

            <h3 className="text-xl font-bold mb-2">Step 3: Who Manages This?</h3>
            <p className="text-lg text-slate-300 mb-4">
              {mode === "bulk"
                ? `Assign ${selectedSlots.length} plants to someone?`
                : "Assign this plant to someone?"}
            </p>

            <div className="space-y-3">
              {/* Skip option - BIGGER */}
              <button
                onClick={() => handleSelectPerson(null)}
                disabled={isAdding}
                className="w-full flex items-center gap-4 px-5 py-5 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-2xl text-left disabled:opacity-50"
              >
                <div className="w-16 h-16 rounded-full bg-slate-600 flex items-center justify-center text-3xl">−</div>
                <div>
                  <div className="text-xl font-bold">Skip</div>
                  <div className="text-lg text-slate-400">No one assigned</div>
                </div>
              </button>

              {/* Last person - BIGGER */}
              {lastPerson && (
                <button
                  onClick={() => handleSelectPerson(lastPerson)}
                  disabled={isAdding}
                  className="w-full flex items-center gap-4 px-5 py-5 bg-green-700 hover:bg-green-600 active:bg-green-500 rounded-2xl text-left ring-4 ring-green-400 disabled:opacity-50"
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                    style={{ backgroundColor: contacts.find(c => c.id === lastPerson)?.color || "#666" }}
                  >
                    {getPersonName(lastPerson)?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xl font-bold">{getPersonName(lastPerson)}</div>
                    <div className="text-lg text-green-200">Same as before</div>
                  </div>
                </button>
              )}

              {/* Other contacts - BIGGER */}
              {contacts.filter(c => c.id !== lastPerson).map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => handleSelectPerson(contact.id)}
                  disabled={isAdding}
                  className="w-full flex items-center gap-4 px-5 py-5 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-2xl text-left disabled:opacity-50"
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                    style={{ backgroundColor: contact.color }}
                  >
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-xl font-bold">{contact.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer - BIGGER buttons */}
        <div className="p-5 border-t border-slate-700">
          {addedSlots.length > 0 ? (
            <button
              onClick={onClose}
              className="w-full py-5 bg-green-600 hover:bg-green-500 active:bg-green-400 text-white text-2xl font-bold rounded-2xl"
            >
              Done ✓
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-4 text-xl text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
