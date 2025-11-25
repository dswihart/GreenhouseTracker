"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { usePlantStore } from "@/store/plantStore";
import { supabase } from "@/lib/supabase/client";
import type { Plant, PlantStage, JournalEntry, Contact } from "@/lib/supabase/types";

const stageConfig: Record<PlantStage, { label: string; icon: string; color: string }> = {
  seed: { label: "Seed", icon: "🌰", color: "from-amber-600 to-amber-700" },
  seedling: { label: "Seedling", icon: "🌱", color: "from-lime-600 to-lime-700" },
  vegetative: { label: "Vegetative", icon: "🌿", color: "from-green-600 to-green-700" },
};

const stages: PlantStage[] = ["seed", "seedling", "vegetative"];

export default function PlantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { updatePlant, removePlant } = usePlantStore();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Quick note state
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Contact state
  const [showContactModal, setShowContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [addingContact, setAddingContact] = useState(false);

  const plantId = params.id as string;

  useEffect(() => {
    if (!user || !plantId) return;

    const loadData = async () => {
      // Load plant
      const { data: plantData } = await supabase
        .from("plants")
        .select("*")
        .eq("id", plantId)
        .eq("user_id", user.id)
        .single();

      if (plantData) {
        setPlant(plantData);
      }

      // Load journal entries
      const { data: journalData } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("plant_id", plantId)
        .order("created_at", { ascending: false });

      if (journalData) {
        setJournal(journalData);
      }

      // Load contacts
      const { data: contactsData } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (contactsData) {
        setContacts(contactsData);
      }

      setLoading(false);
    };

    loadData();
  }, [user, plantId]);

  const handleStageChange = async (newStage: PlantStage) => {
    if (!plant) return;
    setUpdating(true);

    const { error } = await supabase
      .from("plants")
      .update({ current_stage: newStage })
      .eq("id", plant.id);

    if (!error) {
      setPlant({ ...plant, current_stage: newStage });
      updatePlant(plant.id, { current_stage: newStage });
    }

    setUpdating(false);
  };

  const handleAddNote = async () => {
    if (!plant || !newNote.trim()) return;
    setAddingNote(true);

    const { data, error } = await supabase
      .from("journal_entries")
      .insert({
        plant_id: plant.id,
        notes: newNote.trim(),
      })
      .select()
      .single();

    if (data && !error) {
      setJournal([data, ...journal]);
      setNewNote("");
    }

    setAddingNote(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;

    const { error } = await supabase
      .from("journal_entries")
      .delete()
      .eq("id", noteId);

    if (!error) {
      setJournal(journal.filter((j) => j.id !== noteId));
    }
  };

  const handleAssignContact = async (contactId: string | null) => {
    if (!plant) return;

    const { error } = await supabase
      .from("plants")
      .update({ contact_id: contactId })
      .eq("id", plant.id);

    if (!error) {
      setPlant({ ...plant, contact_id: contactId });
    }
  };

  const handleAddContact = async () => {
    if (!user || !newContactName.trim()) return;
    setAddingContact(true);

    const { data, error } = await supabase
      .from("contacts")
      .insert({
        user_id: user.id,
        name: newContactName.trim(),
        phone: newContactPhone.trim() || null,
      })
      .select()
      .single();

    if (data && !error) {
      setContacts([...contacts, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewContactName("");
      setNewContactPhone("");
      // Auto-assign to current plant
      handleAssignContact(data.id);
      setShowContactModal(false);
    }

    setAddingContact(false);
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm("Delete this contact? Plants assigned to them will be unassigned.")) return;

    // Unassign from any plants first
    await supabase
      .from("plants")
      .update({ contact_id: null })
      .eq("contact_id", contactId);

    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", contactId);

    if (!error) {
      setContacts(contacts.filter((c) => c.id !== contactId));
      if (plant?.contact_id === contactId) {
        setPlant({ ...plant, contact_id: null });
      }
    }
  };

  const handleDelete = async () => {
    if (!plant || !confirm("Delete this plant and all its journal entries?")) return;

    // Delete journal entries first
    await supabase.from("journal_entries").delete().eq("plant_id", plant.id);
    // Delete zone items
    await supabase.from("zone_items").delete().eq("plant_id", plant.id);
    // Delete plant
    const { error } = await supabase.from("plants").delete().eq("id", plant.id);

    if (!error) {
      removePlant(plant.id);
      router.push("/plants");
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-4 animate-bounce">🌱</div>
        <p className="text-slate-400 text-lg">Loading plant...</p>
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="p-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">❓</div>
        <p className="text-slate-400 mb-4 text-xl">Plant not found</p>
        <Link href="/plants" className="text-green-400 hover:text-green-300 text-lg font-medium">
          ← Back to plants
        </Link>
      </div>
    );
  }

  const assignedContact = contacts.find((c) => c.id === plant.contact_id);
  const currentStage = stageConfig[plant.current_stage];

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/plants" className="inline-flex items-center gap-2 text-slate-400 hover:text-green-400 mb-3 transition-colors">
          <span>←</span> Back to plants
        </Link>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700">
          {/* Plant Image */}
          {plant.image_url && (
            <div className="mb-4 -mt-2 -mx-2">
              <img
                src={plant.image_url}
                alt={`${plant.name} mature plant`}
                className="w-full h-48 object-cover rounded-xl"
              />
              <p className="text-xs text-slate-500 text-center mt-1">Reference: What it looks like when mature</p>
            </div>
          )}

          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{currentStage.icon}</span>
              <div>
                <h2 className="text-2xl font-bold">{plant.name}</h2>
                {plant.species && <p className="text-slate-400">{plant.species}</p>}
                <span className={`text-sm px-3 py-1 rounded-full font-medium bg-gradient-to-r ${currentStage.color} inline-block mt-2`}>
                  {currentStage.label}
                </span>
              </div>
            </div>
            <button
              onClick={handleDelete}
              className="text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 px-3 py-2 rounded-xl transition-colors text-sm"
            >
              🗑️
            </button>
          </div>

          {/* Assigned Contact */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Going to:</span>
              {assignedContact ? (
                <div className="flex items-center gap-2">
                  <span className="bg-purple-600/30 text-purple-300 px-3 py-1 rounded-full text-sm font-medium">
                    👤 {assignedContact.name}
                  </span>
                  <button
                    onClick={() => handleAssignContact(null)}
                    className="text-slate-400 hover:text-red-400 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowContactModal(true)}
                  className="text-sm text-purple-400 hover:text-purple-300"
                >
                  + Assign contact
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Growth Stage */}
      <section className="bg-slate-800/80 rounded-2xl p-5 mb-6 border border-slate-700/50">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <span className="text-xl">📊</span> Growth Stage
        </h3>
        <div className="flex gap-2">
          {stages.map((stage) => {
            const config = stageConfig[stage];
            const isActive = plant.current_stage === stage;
            return (
              <button
                key={stage}
                onClick={() => handleStageChange(stage)}
                disabled={updating}
                className={`flex-1 p-3 rounded-xl transition-all ${
                  isActive
                    ? `bg-gradient-to-r ${config.color} text-white shadow-lg`
                    : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                }`}
              >
                <span className="text-2xl block mb-1">{config.icon}</span>
                <span className="text-sm font-medium">{config.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Details */}
      {(plant.date_planted || plant.days_to_maturity) && (
        <section className="bg-slate-800/80 rounded-2xl p-5 mb-6 border border-slate-700/50">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <span className="text-xl">📅</span> Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {plant.date_planted && (
              <div className="bg-slate-700/30 rounded-xl p-3">
                <div className="text-sm text-slate-400">Planted</div>
                <div className="font-bold">{new Date(plant.date_planted).toLocaleDateString()}</div>
              </div>
            )}
            {plant.days_to_maturity && (
              <div className="bg-slate-700/30 rounded-xl p-3">
                <div className="text-sm text-slate-400">Days to Maturity</div>
                <div className="font-bold">{plant.days_to_maturity} days</div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Growing Info */}
      {(plant.description || plant.sun_requirements || plant.watering_needs || plant.planting_depth || plant.spacing || plant.harvest_info || plant.growing_tips) && (
        <section className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 rounded-2xl p-5 mb-6 border border-emerald-600/40">
          {/* Description */}
          {plant.description && (
            <div className="mb-4 p-3 bg-slate-800/50 rounded-xl">
              <p className="text-slate-200">{plant.description}</p>
            </div>
          )}
          <h3 className="font-bold mb-4 flex items-center gap-2 text-emerald-300">
            <span className="text-xl">🌱</span> Growing Information
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {plant.sun_requirements && (
              <div className="bg-slate-800/50 rounded-xl p-3 flex items-start gap-3">
                <span className="text-2xl">☀️</span>
                <div>
                  <div className="text-xs text-slate-400">Sun</div>
                  <div className="text-sm font-medium">{plant.sun_requirements}</div>
                </div>
              </div>
            )}
            {plant.watering_needs && (
              <div className="bg-slate-800/50 rounded-xl p-3 flex items-start gap-3">
                <span className="text-2xl">💧</span>
                <div>
                  <div className="text-xs text-slate-400">Water</div>
                  <div className="text-sm font-medium">{plant.watering_needs}</div>
                </div>
              </div>
            )}
            {plant.planting_depth && (
              <div className="bg-slate-800/50 rounded-xl p-3 flex items-start gap-3">
                <span className="text-2xl">📏</span>
                <div>
                  <div className="text-xs text-slate-400">Planting Depth</div>
                  <div className="text-sm font-medium">{plant.planting_depth}</div>
                </div>
              </div>
            )}
            {plant.spacing && (
              <div className="bg-slate-800/50 rounded-xl p-3 flex items-start gap-3">
                <span className="text-2xl">↔️</span>
                <div>
                  <div className="text-xs text-slate-400">Spacing</div>
                  <div className="text-sm font-medium">{plant.spacing}</div>
                </div>
              </div>
            )}
            {plant.harvest_info && (
              <div className="bg-slate-800/50 rounded-xl p-3 flex items-start gap-3 col-span-2">
                <span className="text-2xl">🥬</span>
                <div>
                  <div className="text-xs text-slate-400">Harvest</div>
                  <div className="text-sm font-medium">{plant.harvest_info}</div>
                </div>
              </div>
            )}
            {plant.growing_tips && (
              <div className="bg-amber-900/30 border border-amber-600/30 rounded-xl p-3 flex items-start gap-3 col-span-2">
                <span className="text-2xl">💡</span>
                <div>
                  <div className="text-xs text-amber-400">Growing Tips</div>
                  <div className="text-sm text-amber-100">{plant.growing_tips}</div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section className="grid grid-cols-2 gap-4 mb-6">
        <Link
          href={`/doctor?plant=${plant.id}`}
          className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white p-4 rounded-2xl text-center transition-colors shadow-lg"
        >
          <span className="text-3xl block mb-2">🩺</span>
          <span className="font-bold">AI Doctor</span>
        </Link>
        <button
          onClick={() => setShowContactModal(true)}
          className="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white p-4 rounded-2xl text-center transition-colors shadow-lg"
        >
          <span className="text-3xl block mb-2">👥</span>
          <span className="font-bold">Contacts</span>
        </button>
      </section>

      {/* Add Note */}
      <section className="bg-slate-800/80 rounded-2xl p-5 mb-6 border border-slate-700/50">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <span className="text-xl">📝</span> Add Note
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Type a note about this plant..."
            className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
          />
          <button
            onClick={handleAddNote}
            disabled={addingNote || !newNote.trim()}
            className="bg-green-600 hover:bg-green-500 disabled:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold transition-colors"
          >
            {addingNote ? "..." : "Add"}
          </button>
        </div>
      </section>

      {/* Journal History */}
      <section>
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <span className="text-xl">📖</span> Journal ({journal.length})
        </h3>
        {journal.length === 0 ? (
          <div className="bg-slate-800/50 rounded-2xl p-6 text-center border border-slate-700/50">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-slate-400">No journal entries yet</p>
            <p className="text-slate-500 text-sm mt-1">Add your first note above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {journal.map((entry) => (
              <div key={entry.id} className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/50">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm text-slate-400">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                  <div className="flex items-center gap-2">
                    {entry.ai_diagnosis && (
                      <span className="text-xs bg-blue-600 px-2 py-1 rounded-full">
                        🩺 AI
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteNote(entry.id)}
                      className="text-slate-500 hover:text-red-400 text-sm transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {entry.notes && <p className="text-slate-200">{entry.notes}</p>}
                {entry.ai_diagnosis && (
                  <div className="mt-3 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg text-sm">
                    <strong className="text-blue-300">Diagnosis:</strong>{" "}
                    <span className="text-slate-300">
                      {(entry.ai_diagnosis as { diagnosis?: string }).diagnosis || "N/A"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-700 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">👥</span> Contacts
            </h3>

            {/* Add New Contact */}
            <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
              <h4 className="font-medium mb-3 text-sm text-slate-300">Add New Contact</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Name *"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="tel"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleAddContact}
                  disabled={addingContact || !newContactName.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white py-2 rounded-lg font-medium transition-colors"
                >
                  {addingContact ? "Adding..." : "+ Add & Assign"}
                </button>
              </div>
            </div>

            {/* Contact List */}
            {contacts.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium mb-3 text-sm text-slate-300">Select Contact</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {contacts.map((contact) => {
                    const isAssigned = plant.contact_id === contact.id;
                    return (
                      <div
                        key={contact.id}
                        className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                          isAssigned
                            ? "bg-purple-600/30 border border-purple-500"
                            : "bg-slate-700/50 hover:bg-slate-700"
                        }`}
                      >
                        <button
                          onClick={() => handleAssignContact(isAssigned ? null : contact.id)}
                          className="flex-1 text-left"
                        >
                          <div className="font-medium">{contact.name}</div>
                          {contact.phone && (
                            <div className="text-sm text-slate-400">{contact.phone}</div>
                          )}
                        </button>
                        <div className="flex items-center gap-2">
                          {isAssigned && (
                            <span className="text-xs text-purple-300">Assigned</span>
                          )}
                          <button
                            onClick={() => handleDeleteContact(contact.id)}
                            className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowContactModal(false)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
