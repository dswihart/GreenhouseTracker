"use client";

import { useState } from "react";
import type { Plant, Contact, Tray } from "@/lib/supabase/types";

interface PlantActionSheetProps {
  plant: Plant;
  position: { x: number; y: number };
  trayName: string;
  assignedContact: Contact | null;
  contacts: Contact[];
  trays: Tray[];
  currentTrayId: string;
  onClose: () => void;
  onAssignPerson: (contactId: string | null) => void;
  onMoveTray: (trayId: string) => void;
  onRemove: () => void;
  onViewDetails: () => void;
}

type View = "main" | "assign" | "move";

export function PlantActionSheet({
  plant,
  position,
  trayName,
  assignedContact,
  contacts,
  trays,
  currentTrayId,
  onClose,
  onAssignPerson,
  onMoveTray,
  onRemove,
  onViewDetails,
}: PlantActionSheetProps) {
  const [view, setView] = useState<View>("main");
  const [confirmRemove, setConfirmRemove] = useState(false);

  const otherTrays = trays.filter((t) => t.id !== currentTrayId);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-slate-800 rounded-t-3xl shadow-2xl animate-[slideUp_0.3s_ease-out]">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-slate-600 rounded-full" />
        </div>

        {view === "main" && (
          <div className="px-6 pb-8">
            <div className="text-center mb-6 pb-4 border-b border-slate-700">
              <div className="text-4xl mb-2">🌱</div>
              <h2 className="text-2xl font-bold">{plant.name}</h2>
              <p className="text-slate-400 text-lg mt-1">
                {trayName} - Row {position.y + 1}, Col {position.x + 1}
              </p>
              {assignedContact ? (
                <div
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-lg"
                  style={{ backgroundColor: assignedContact.color }}
                >
                  <span>👤</span>
                  <span>{assignedContact.name}</span>
                </div>
              ) : (
                <p className="text-slate-500 mt-2 text-lg">Not assigned to anyone</p>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setView("assign")}
                className="w-full flex items-center gap-4 px-6 py-5 bg-slate-700 hover:bg-slate-600 rounded-2xl text-left transition-colors"
              >
                <span className="text-3xl">👤</span>
                <div>
                  <div className="text-xl font-semibold">Assign to Person</div>
                  <div className="text-slate-400">Choose who manages this plant</div>
                </div>
              </button>

              {otherTrays.length > 0 && (
                <button
                  onClick={() => setView("move")}
                  className="w-full flex items-center gap-4 px-6 py-5 bg-slate-700 hover:bg-slate-600 rounded-2xl text-left transition-colors"
                >
                  <span className="text-3xl">📋</span>
                  <div>
                    <div className="text-xl font-semibold">Move to Different Tray</div>
                    <div className="text-slate-400">Relocate to another tray</div>
                  </div>
                </button>
              )}

              <button
                onClick={onViewDetails}
                className="w-full flex items-center gap-4 px-6 py-5 bg-slate-700 hover:bg-slate-600 rounded-2xl text-left transition-colors"
              >
                <span className="text-3xl">📄</span>
                <div>
                  <div className="text-xl font-semibold">View Plant Details</div>
                  <div className="text-slate-400">See growing info and history</div>
                </div>
              </button>

              {!confirmRemove ? (
                <button
                  onClick={() => setConfirmRemove(true)}
                  className="w-full flex items-center gap-4 px-6 py-5 bg-red-900/30 hover:bg-red-900/50 rounded-2xl text-left transition-colors"
                >
                  <span className="text-3xl">🗑️</span>
                  <div>
                    <div className="text-xl font-semibold text-red-400">Remove from Tray</div>
                    <div className="text-slate-400">Take plant out of this tray</div>
                  </div>
                </button>
              ) : (
                <div className="bg-red-900/30 rounded-2xl p-5">
                  <p className="text-center text-lg mb-4">Remove this plant from the tray?</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmRemove(false)}
                      className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onRemove}
                      className="flex-1 py-4 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-lg"
                    >
                      Yes, Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full mt-4 py-5 text-slate-400 hover:text-white text-xl font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {view === "assign" && (
          <div className="px-6 pb-8">
            <button
              onClick={() => setView("main")}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 py-2"
            >
              <span className="text-2xl">←</span>
              <span className="text-lg">Back</span>
            </button>

            <h2 className="text-2xl font-bold mb-2">Assign to Person</h2>
            <p className="text-slate-400 text-lg mb-6">Who will manage {plant.name}?</p>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              <button
                onClick={() => {
                  onAssignPerson(null);
                  onClose();
                }}
                className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl text-left transition-colors ${
                  !assignedContact
                    ? "bg-green-600 ring-2 ring-green-400"
                    : "bg-slate-700 hover:bg-slate-600"
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-slate-600 flex items-center justify-center text-2xl">
                  ✕
                </div>
                <div>
                  <div className="text-xl font-semibold">Nobody</div>
                  <div className="text-slate-300">Leave unassigned</div>
                </div>
                {!assignedContact && <span className="ml-auto text-2xl">✓</span>}
              </button>

              {contacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => {
                    onAssignPerson(contact.id);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl text-left transition-colors ${
                    assignedContact?.id === contact.id
                      ? "bg-green-600 ring-2 ring-green-400"
                      : "bg-slate-700 hover:bg-slate-600"
                  }`}
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                    style={{ backgroundColor: contact.color }}
                  >
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xl font-semibold">{contact.name}</div>
                  </div>
                  {assignedContact?.id === contact.id && <span className="ml-auto text-2xl">✓</span>}
                </button>
              ))}
            </div>

            <button
              onClick={() => setView("main")}
              className="w-full mt-6 py-5 text-slate-400 hover:text-white text-xl font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {view === "move" && (
          <div className="px-6 pb-8">
            <button
              onClick={() => setView("main")}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 py-2"
            >
              <span className="text-2xl">←</span>
              <span className="text-lg">Back</span>
            </button>

            <h2 className="text-2xl font-bold mb-2">Move to Tray</h2>
            <p className="text-slate-400 text-lg mb-6">Select destination for {plant.name}</p>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {otherTrays.map((tray) => (
                <button
                  key={tray.id}
                  onClick={() => {
                    onMoveTray(tray.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 px-6 py-5 bg-slate-700 hover:bg-slate-600 rounded-2xl text-left transition-colors"
                >
                  <div className="w-14 h-14 rounded-xl bg-slate-600 flex items-center justify-center text-2xl">
                    📋
                  </div>
                  <div>
                    <div className="text-xl font-semibold">{tray.name}</div>
                    <div className="text-slate-400">{tray.cols} x {tray.rows} grid</div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setView("main")}
              className="w-full mt-6 py-5 text-slate-400 hover:text-white text-xl font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
