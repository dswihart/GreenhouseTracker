"use client";

import { useState } from "react";
import type { Plant, Contact, Tray, ZoneItem } from "@/lib/supabase/types";

interface AddPlantFlowProps {
  unplacedPlants: Plant[];
  tray: Tray;
  existingItems: ZoneItem[];
  contacts: Contact[];
  onClose: () => void;
  onAddPlant: (plantId: string, x: number, y: number, contactId: string | null) => Promise<void>;
}

type Step = "select-plant" | "select-slot" | "select-person";

export function AddPlantFlow({
  unplacedPlants,
  tray,
  existingItems,
  contacts,
  onClose,
  onAddPlant,
}: AddPlantFlowProps) {
  const [step, setStep] = useState<Step>("select-plant");
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ x: number; y: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Multi-plant tracking
  const [addedPlants, setAddedPlants] = useState<string[]>([]);
  const [addedSlots, setAddedSlots] = useState<Array<{x: number, y: number}>>([]);
  const [lastPerson, setLastPerson] = useState<string | null>(null);

  // Filter plants already added in this session
  const availablePlants = unplacedPlants.filter(p => !addedPlants.includes(p.id));

  const filteredPlants = availablePlants.filter((plant) =>
    plant.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isSlotOccupied = (x: number, y: number) => {
    return existingItems.some((item) => item.x === x && item.y === y) ||
           addedSlots.some((slot) => slot.x === x && slot.y === y);
  };

  const handleSelectPlant = (plant: Plant) => {
    setSelectedPlant(plant);
    setStep("select-slot");
  };

  const handleSelectSlot = (x: number, y: number) => {
    if (isSlotOccupied(x, y)) return;
    setSelectedSlot({ x, y });
    if (contacts.length > 0) {
      setStep("select-person");
    } else {
      // No contacts, add directly
      finishAddingPlant(selectedPlant!.id, x, y, null);
    }
  };

  const handleSelectPerson = (contactId: string | null) => {
    if (!selectedPlant || !selectedSlot) return;
    finishAddingPlant(selectedPlant.id, selectedSlot.x, selectedSlot.y, contactId);
  };

  const finishAddingPlant = async (plantId: string, x: number, y: number, contactId: string | null) => {
    setIsAdding(true);
    try {
      await onAddPlant(plantId, x, y, contactId);

      // Track what was added
      setAddedPlants(prev => [...prev, plantId]);
      setAddedSlots(prev => [...prev, { x, y }]);
      setLastPerson(contactId);

      // Reset for next plant
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

  // Grid cell size
  const maxCellSize = 80;
  const cellSize = Math.min(maxCellSize, Math.floor(320 / Math.max(tray.cols, tray.rows)));

  const addedCount = addedPlants.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-slate-800 rounded-3xl shadow-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Add Plants to Tray</h2>
              <p className="text-slate-400 mt-1">{tray.name}</p>
            </div>
            <button
              onClick={onClose}
              className="w-12 h-12 flex items-center justify-center text-2xl text-slate-400 hover:text-white bg-slate-700 rounded-full"
            >
              ✕
            </button>
          </div>

          {addedCount > 0 && (
            <div className="mt-3 flex items-center gap-2 text-green-400">
              <span className="text-2xl">✓</span>
              <span className="text-lg font-medium">
                {addedCount} plant{addedCount !== 1 ? "s" : ""} added
              </span>
            </div>
          )}

          {/* Progress */}
          <div className="flex items-center gap-2 mt-4">
            <div className={`flex-1 h-2 rounded-full ${step === "select-plant" || step === "select-slot" || step === "select-person" ? "bg-green-500" : "bg-slate-600"}`} />
            <div className={`flex-1 h-2 rounded-full ${step === "select-slot" || step === "select-person" ? "bg-green-500" : "bg-slate-600"}`} />
            {contacts.length > 0 && (
              <div className={`flex-1 h-2 rounded-full ${step === "select-person" ? "bg-green-500" : "bg-slate-600"}`} />
            )}
          </div>
        </div>

        {/* Step 1: Select Plant */}
        {step === "select-plant" && (
          <div className="p-6 overflow-y-auto" style={{ maxHeight: "60vh" }}>
            <h3 className="text-xl font-semibold mb-4">1. Choose a Plant</h3>

            {availablePlants.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✓</div>
                <p className="text-slate-300 text-lg font-medium">
                  {addedCount > 0 ? "All done!" : "All plants are already placed!"}
                </p>
              </div>
            ) : (
              <>
                {lastPerson && (
                  <div className="mb-4 p-3 bg-slate-700/50 rounded-xl text-sm">
                    Assigning to: <span className="font-semibold">{getPersonName(lastPerson)}</span>
                    <button onClick={() => setLastPerson(null)} className="ml-2 text-slate-400 hover:text-white">(change)</button>
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Search plants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-700 border-2 border-slate-600 rounded-xl text-lg mb-4"
                />

                <div className="space-y-2">
                  {filteredPlants.map((plant) => (
                    <button
                      key={plant.id}
                      onClick={() => handleSelectPlant(plant)}
                      className="w-full flex items-center gap-4 px-5 py-4 bg-slate-700 hover:bg-slate-600 rounded-xl text-left"
                    >
                      <span className="text-3xl">🌱</span>
                      <div>
                        <div className="text-lg font-semibold">{plant.name}</div>
                        {plant.species && <div className="text-slate-400">{plant.species}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2: Select Slot */}
        {step === "select-slot" && selectedPlant && (
          <div className="p-6">
            <button onClick={() => setStep("select-plant")} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4">
              <span>←</span> Back
            </button>

            <h3 className="text-xl font-semibold mb-2">2. Choose a Slot</h3>
            <p className="text-slate-400 mb-4">Tap where to place {selectedPlant.name}</p>

            <div className="flex justify-center">
              <div
                className="grid gap-1 p-4 bg-slate-900 rounded-xl"
                style={{ gridTemplateColumns: `repeat(${tray.cols}, ${cellSize}px)` }}
              >
                {Array.from({ length: tray.rows }).map((_, y) =>
                  Array.from({ length: tray.cols }).map((_, x) => {
                    const occupied = isSlotOccupied(x, y);
                    return (
                      <button
                        key={`${x}-${y}`}
                        onClick={() => handleSelectSlot(x, y)}
                        disabled={occupied}
                        className={`rounded-lg flex items-center justify-center text-xl font-bold ${
                          occupied
                            ? "bg-slate-600 text-slate-500 cursor-not-allowed"
                            : "bg-green-700/50 hover:bg-green-600 text-white border-2 border-dashed border-green-500"
                        }`}
                        style={{ width: cellSize, height: cellSize }}
                      >
                        {occupied ? "🌱" : "+"}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Select Person */}
        {step === "select-person" && selectedPlant && selectedSlot && (
          <div className="p-6 overflow-y-auto" style={{ maxHeight: "60vh" }}>
            <button onClick={() => setStep("select-slot")} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4">
              <span>←</span> Back
            </button>

            <h3 className="text-xl font-semibold mb-2">3. Assign to Person</h3>
            <p className="text-slate-400 mb-4">Who will manage {selectedPlant.name}?</p>

            <div className="space-y-3">
              {/* Quick pick last person */}
              {lastPerson && (
                <button
                  onClick={() => handleSelectPerson(lastPerson)}
                  disabled={isAdding}
                  className="w-full flex items-center gap-4 px-6 py-5 bg-green-700 hover:bg-green-600 rounded-2xl text-left ring-2 ring-green-500 disabled:opacity-50"
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                    style={{ backgroundColor: contacts.find(c => c.id === lastPerson)?.color || "#666" }}
                  >
                    {getPersonName(lastPerson)?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xl font-semibold">{getPersonName(lastPerson)}</div>
                    <div className="text-green-200">Same as last plant</div>
                  </div>
                </button>
              )}

              {/* Skip option */}
              <button
                onClick={() => handleSelectPerson(null)}
                disabled={isAdding}
                className="w-full flex items-center gap-4 px-6 py-5 bg-slate-700 hover:bg-slate-600 rounded-2xl text-left disabled:opacity-50"
              >
                <div className="w-14 h-14 rounded-full bg-slate-600 flex items-center justify-center text-2xl">✕</div>
                <div>
                  <div className="text-xl font-semibold">Skip</div>
                  <div className="text-slate-400">Leave unassigned</div>
                </div>
              </button>

              {/* Other contacts */}
              {contacts.filter(c => c.id !== lastPerson).map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => handleSelectPerson(contact.id)}
                  disabled={isAdding}
                  className="w-full flex items-center gap-4 px-6 py-5 bg-slate-700 hover:bg-slate-600 rounded-2xl text-left disabled:opacity-50"
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                    style={{ backgroundColor: contact.color }}
                  >
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-xl font-semibold">{contact.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-slate-700">
          {addedCount > 0 ? (
            <button
              onClick={onClose}
              className="w-full py-5 bg-green-600 hover:bg-green-500 text-white text-xl font-bold rounded-2xl"
            >
              Done ({addedCount} added)
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-4 text-slate-400 hover:text-white text-lg"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
