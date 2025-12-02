"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase/client";
import type { Contact, Plant, ZoneItem, Zone } from "@/lib/supabase/types";

interface PersonPlantCount {
  contact: Contact;
  plants: { plant: Plant; count: number; zoneName: string }[];
  totalCount: number;
}

const defaultColors = ["#22c55e", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#06b6d4"];

export default function PlanningPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [personCounts, setPersonCounts] = useState<PersonPlantCount[]>([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [selectedColor, setSelectedColor] = useState(defaultColors[0]);
  const [addingPerson, setAddingPerson] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [contactsRes, zoneItemsRes, plantsRes, zonesRes] = await Promise.all([
      supabase.from("contacts").select("*").eq("user_id", user.id),
      supabase.from("zone_items").select("*"),
      supabase.from("plants").select("*").eq("user_id", user.id),
      supabase.from("zones").select("*").eq("user_id", user.id),
    ]);

    const contactsList = contactsRes.data || [];
    const zoneItems = zoneItemsRes.data || [];
    const plants = plantsRes.data || [];
    const zones = zonesRes.data || [];

    setContacts(contactsList);

    const plantMap = new Map(plants.map(p => [p.id, p]));
    const zoneMap = new Map(zones.map(z => [z.id, z]));

    const countsByContact = new Map<string, Map<string, { plant: Plant; count: number; zoneId: string }>>();
    let unassigned = 0;

    for (const item of zoneItems) {
      const plant = plantMap.get(item.plant_id);
      if (!plant) continue;

      if (!item.assigned_to) {
        unassigned++;
        continue;
      }

      if (!countsByContact.has(item.assigned_to)) {
        countsByContact.set(item.assigned_to, new Map());
      }

      const contactPlants = countsByContact.get(item.assigned_to)!;
      const key = `${item.plant_id}-${item.zone_id}`;

      if (contactPlants.has(key)) {
        contactPlants.get(key)!.count++;
      } else {
        contactPlants.set(key, { plant, count: 1, zoneId: item.zone_id });
      }
    }

    const result: PersonPlantCount[] = contactsList.map(contact => {
      const plantCounts = countsByContact.get(contact.id);
      if (!plantCounts) {
        return { contact, plants: [], totalCount: 0 };
      }

      const plantsArray = Array.from(plantCounts.values()).map(({ plant, count, zoneId }) => ({
        plant,
        count,
        zoneName: zoneMap.get(zoneId)?.name || "Unknown Zone",
      }));

      const totalCount = plantsArray.reduce((sum, p) => sum + p.count, 0);

      return { contact, plants: plantsArray, totalCount };
    }).sort((a, b) => {
      // Sort by total count descending, but keep zero-count at the end
      if (a.totalCount === 0 && b.totalCount > 0) return 1;
      if (b.totalCount === 0 && a.totalCount > 0) return -1;
      return b.totalCount - a.totalCount;
    });

    setPersonCounts(result);
    setUnassignedCount(unassigned);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const handleAddPerson = async () => {
    if (!newPersonName.trim() || !user) return;
    setAddingPerson(true);

    const { data, error } = await supabase
      .from("contacts")
      .insert({
        user_id: user.id,
        name: newPersonName.trim(),
        color: selectedColor,
      })
      .select()
      .single();

    if (data && !error) {
      setContacts([...contacts, data]);
      setPersonCounts([...personCounts, { contact: data, plants: [], totalCount: 0 }]);
      setNewPersonName("");
      setShowAddPerson(false);
      setSelectedColor(defaultColors[(contacts.length + 1) % defaultColors.length]);
    }
    setAddingPerson(false);
  };

  const handleDeletePerson = async (contactId: string) => {
    if (!confirm("Delete this person? Their plant assignments will be removed.")) return;

    await supabase.from("zone_items").update({ assigned_to: null }).eq("assigned_to", contactId);
    await supabase.from("contacts").delete().eq("id", contactId);

    setContacts(contacts.filter(c => c.id !== contactId));
    setPersonCounts(personCounts.filter(p => p.contact.id !== contactId));
    fetchData();
  };

  if (!user) {
    return (
      <div className="p-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">📋</div>
        <p className="text-slate-400 text-xl">Please sign in to view the planning page.</p>
        <Link href="/auth" className="mt-4 text-green-400 hover:text-green-300 font-medium text-lg">
          Sign In →
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-4xl animate-pulse mb-4">📋</div>
        <p className="text-slate-400">Loading assignments...</p>
      </div>
    );
  }

  const totalAssigned = personCounts.reduce((sum, p) => sum + p.totalCount, 0);

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-3xl font-bold">Plant Assignments</h2>
          <p className="text-slate-400">Plants assigned to each person</p>
        </div>
        <button
          onClick={() => setShowAddPerson(true)}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-xl font-medium transition-colors"
        >
          + Add Person
        </button>
      </div>

      {/* Add Person Modal */}
      {showAddPerson && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowAddPerson(false)}>
          <div className="bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-700">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-xl">Add New Person</h3>
                <button onClick={() => setShowAddPerson(false)} className="text-slate-400 hover:text-white text-2xl">&times;</button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Name</label>
                <input
                  type="text"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="Enter name..."
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-lg focus:border-green-500 focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {defaultColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-10 h-10 rounded-full transition-all ${selectedColor === color ? "ring-2 ring-white ring-offset-2 ring-offset-slate-800" : ""}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-700">
              <button
                onClick={handleAddPerson}
                disabled={!newPersonName.trim() || addingPerson}
                className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:text-slate-400 rounded-xl font-bold transition-colors"
              >
                {addingPerson ? "Adding..." : "Add Person"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-3xl font-bold text-blue-400">{contacts.length}</div>
          <div className="text-slate-400 text-sm">People</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-3xl font-bold text-green-400">{totalAssigned}</div>
          <div className="text-slate-400 text-sm">Assigned</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-3xl font-bold text-amber-400">{unassignedCount}</div>
          <div className="text-slate-400 text-sm">Unassigned</div>
        </div>
      </div>

      {personCounts.length === 0 && contacts.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/50 rounded-2xl border border-slate-700/50">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-bold mb-2">No People Yet</h3>
          <p className="text-slate-400 mb-4">
            Add people to assign plants to them.
          </p>
          <button
            onClick={() => setShowAddPerson(true)}
            className="inline-block px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-medium transition-colors"
          >
            + Add First Person
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {personCounts.map(({ contact, plants, totalCount }) => (
            <div
              key={contact.id}
              className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-4"
                style={{ borderLeft: `4px solid ${contact.color}` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: contact.color }}
                  >
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-lg">{contact.name}</div>
                    <div className="text-slate-400 text-sm">{totalCount} plant{totalCount !== 1 ? "s" : ""}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold" style={{ color: contact.color }}>
                    {totalCount}
                  </div>
                  <button
                    onClick={() => handleDeletePerson(contact.id)}
                    className="text-red-400 hover:text-red-300 text-sm px-2 py-1"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {plants.length > 0 && (
                <div className="border-t border-slate-700/50 p-4 space-y-2">
                  {plants.map(({ plant, count, zoneName }, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300">{plant.name}</span>
                        <span className="text-slate-500">in {zoneName}</span>
                      </div>
                      <span className="font-medium text-slate-300">×{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}


        </div>
      )}

      {/* Link to zones */}
      <div className="mt-6 text-center">
        <Link href="/zones" className="text-green-400 hover:text-green-300 font-medium">
          Go to Zones to assign plants →
        </Link>
      </div>
    </div>
  );
}
