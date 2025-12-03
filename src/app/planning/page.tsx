"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase/client";
import type { Contact, Plant } from "@/lib/supabase/types";

const defaultColors = ["#3b82f6", "#10b981", "#eab308", "#ec4899", "#ffffff", "#8b5cf6", "#14b8a6", "#f59e0b"];

interface PlantPlan {
  plantId: string;
  total: number;
  distribution: Record<string, number>;
}

export default function PlanningPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [plans, setPlans] = useState<Record<string, PlantPlan>>({});
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [selectedColor, setSelectedColor] = useState(defaultColors[0]);
  const [addingPerson, setAddingPerson] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);

  // Load plans from localStorage
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`plans_${user.id}`);
      if (saved) {
        try {
          setPlans(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to load plans:", e);
        }
      }
    }
  }, [user]);

  // Save plans to localStorage
  const savePlans = (newPlans: Record<string, PlantPlan>) => {
    if (user) {
      localStorage.setItem(`plans_${user.id}`, JSON.stringify(newPlans));
      setPlans(newPlans);
    }
  };

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [contactsRes, plantsRes] = await Promise.all([
      supabase.from("contacts").select("*").eq("user_id", user.id),
      supabase.from("plants").select("*").eq("user_id", user.id),
    ]);

    setContacts(contactsRes.data || []);
    setPlants(plantsRes.data || []);
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
      setNewPersonName("");
      setShowAddPerson(false);
      setSelectedColor(defaultColors[(contacts.length + 1) % defaultColors.length]);
    }
    setAddingPerson(false);
  };

  const handleDeletePerson = async (contactId: string) => {
    if (!confirm("Delete this person?")) return;

    await supabase.from("contacts").delete().eq("id", contactId);
    setContacts(contacts.filter(c => c.id !== contactId));

    // Remove from all plans
    const newPlans = { ...plans };
    for (const plantId in newPlans) {
      delete newPlans[plantId].distribution[contactId];
    }
    savePlans(newPlans);
  };

  const getPlan = (plantId: string): PlantPlan => {
    return plans[plantId] || { plantId, total: 0, distribution: {} };
  };

  const updatePlanTotal = (plantId: string, total: number) => {
    const plan = getPlan(plantId);
    const newPlans = { ...plans, [plantId]: { ...plan, total: Math.max(0, total) } };
    savePlans(newPlans);
  };

  const updatePlanDistribution = (plantId: string, contactId: string, count: number) => {
    const plan = getPlan(plantId);
    const newDist = { ...plan.distribution, [contactId]: Math.max(0, count) };
    const newPlans = { ...plans, [plantId]: { ...plan, distribution: newDist } };
    savePlans(newPlans);
  };

  const getDistributedTotal = (plantId: string): number => {
    const plan = getPlan(plantId);
    return Object.values(plan.distribution).reduce((sum, n) => sum + n, 0);
  };

  const getUnassigned = (plantId: string): number => {
    const plan = getPlan(plantId);
    return Math.max(0, plan.total - getDistributedTotal(plantId));
  };

  const getPersonTotal = (contactId: string): number => {
    return Object.values(plans).reduce((sum, plan) => sum + (plan.distribution[contactId] || 0), 0);
  };

  const grandTotal = Object.values(plans).reduce((sum, plan) => sum + plan.total, 0);
  const grandAssigned = Object.values(plans).reduce((sum, plan) => sum + getDistributedTotal(plan.plantId), 0);
  const grandUnassigned = grandTotal - grandAssigned;

  if (!user) {
    return (
      <div className="p-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">📋</div>
        <p className="text-slate-400 text-xl">Please sign in.</p>
        <Link href="/auth" className="mt-4 text-green-400 hover:text-green-300 font-medium text-lg">Sign In →</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-4xl animate-pulse mb-4">📋</div>
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-full mx-auto pb-24">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-3xl font-bold">Plant Planning</h2>
          <p className="text-slate-400">Plan how many plants each person gets</p>
        </div>
        <button onClick={() => setShowAddPerson(true)} className="px-5 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-lg">
          + Add Person
        </button>
      </div>

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
                <input type="text" value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)} placeholder="Enter name..." className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-lg focus:border-green-500 focus:outline-none" autoFocus />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {defaultColors.slice(0, 5).map((color) => (
                    <button key={color} onClick={() => setSelectedColor(color)} className={`w-12 h-12 rounded-full transition-all ${selectedColor === color ? "ring-4 ring-white ring-offset-2 ring-offset-slate-800" : ""}`} style={{ backgroundColor: color, border: color === "#ffffff" ? "2px solid #666" : "none" }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-700">
              <button onClick={handleAddPerson} disabled={!newPersonName.trim() || addingPerson} className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:text-slate-400 rounded-xl font-bold">
                {addingPerson ? "Adding..." : "Add Person"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Plant Modal */}
      {editingPlant && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50" onClick={() => setEditingPlant(null)}>
          <div className="bg-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-700">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-2xl flex items-center gap-2"><span>🌱</span> {editingPlant.name}</h3>
                </div>
                <button onClick={() => setEditingPlant(null)} className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-white bg-slate-700 rounded-full text-2xl">✕</button>
              </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto" style={{ maxHeight: "60vh" }}>
              {/* Total Planned */}
              <div className="bg-green-900/30 rounded-2xl p-4 border border-green-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-xl font-bold text-white">#</div>
                    <span className="font-semibold text-lg text-green-300">Total Planned</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updatePlanTotal(editingPlant.id, getPlan(editingPlant.id).total - 1)} className="w-14 h-14 rounded-xl bg-slate-600 hover:bg-slate-500 text-3xl font-bold flex items-center justify-center">−</button>
                    <input
                      type="number"
                      value={getPlan(editingPlant.id).total}
                      onChange={(e) => updatePlanTotal(editingPlant.id, parseInt(e.target.value) || 0)}
                      className="w-20 h-14 text-center text-2xl font-bold bg-slate-800 border-2 border-slate-600 rounded-xl"
                    />
                    <button onClick={() => updatePlanTotal(editingPlant.id, getPlan(editingPlant.id).total + 1)} className="w-14 h-14 rounded-xl bg-green-600 hover:bg-green-500 text-3xl font-bold flex items-center justify-center">+</button>
                  </div>
                </div>
              </div>

              {/* Distribution */}
              {contacts.map((contact) => {
                const count = getPlan(editingPlant.id).distribution[contact.id] || 0;
                return (
                  <div key={contact.id} className="flex items-center justify-between bg-slate-700/50 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold" style={{ backgroundColor: contact.color, color: contact.color === "#ffffff" || contact.color === "#eab308" ? "#000" : "#fff", border: contact.color === "#ffffff" ? "2px solid #666" : "none" }}>
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-lg">{contact.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updatePlanDistribution(editingPlant.id, contact.id, count - 1)} disabled={count === 0} className="w-14 h-14 rounded-xl bg-slate-600 hover:bg-slate-500 disabled:opacity-30 text-3xl font-bold flex items-center justify-center">−</button>
                      <div className="w-20 h-14 text-center text-2xl font-bold bg-slate-800 border-2 border-slate-600 rounded-xl flex items-center justify-center">{count}</div>
                      <button onClick={() => updatePlanDistribution(editingPlant.id, contact.id, count + 1)} className="w-14 h-14 rounded-xl bg-green-600 hover:bg-green-500 text-3xl font-bold flex items-center justify-center">+</button>
                    </div>
                  </div>
                );
              })}

              {/* Unassigned */}
              <div className="flex items-center justify-between bg-amber-900/30 rounded-2xl p-4 border border-amber-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-600 flex items-center justify-center text-xl font-bold text-white">?</div>
                  <span className="font-semibold text-lg text-amber-300">Unassigned</span>
                </div>
                <div className="text-3xl font-bold text-amber-400 px-4">{getUnassigned(editingPlant.id)}</div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700">
              <button onClick={() => setEditingPlant(null)} className="w-full py-5 bg-green-600 hover:bg-green-500 text-white text-xl font-bold rounded-2xl">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-3xl font-bold text-green-400">{plants.filter(p => {
              const cat = (p.category || "").toLowerCase();
              const name = (p.name || "").toLowerCase();
              return cat === "tomato" || cat === "pepper" || 
                     name.includes("tomato") || name.includes("pepper") ||
                     name.includes("jalap") || name.includes("habanero") ||
                     name.includes("cayenne") || name.includes("bell");
            }).length}</div>
          <div className="text-slate-400 text-sm">Tomatoes & Peppers</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-3xl font-bold text-blue-400">{contacts.length}</div>
          <div className="text-slate-400 text-sm">People</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-3xl font-bold text-purple-400">{grandTotal}</div>
          <div className="text-slate-400 text-sm">Total Planned</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-3xl font-bold text-amber-400">{grandUnassigned}</div>
          <div className="text-slate-400 text-sm">Unassigned</div>
        </div>
      </div>

      {plants.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/50 rounded-2xl border border-slate-700/50">
          <div className="text-6xl mb-4">🌱</div>
          <h3 className="text-xl font-bold mb-2">No Plants Yet</h3>
          <p className="text-slate-400 mb-4">Add plants first.</p>
          <Link href="/plants" className="inline-block px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-medium">Go to Plants →</Link>
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/50 rounded-2xl border border-slate-700/50">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-bold mb-2">No People Yet</h3>
          <p className="text-slate-400 mb-4">Add people to assign plants.</p>
          <button onClick={() => setShowAddPerson(true)} className="inline-block px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-medium">+ Add First Person</button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-700/50">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-800">
                <th className="p-4 font-bold text-lg border-b border-slate-700 sticky left-0 bg-slate-800 z-10 min-w-[180px]">Plant</th>
                <th className="p-4 font-bold text-lg border-b border-slate-700 text-center min-w-[80px]">Planned</th>
                {contacts.map(contact => (
                  <th key={contact.id} className="p-4 font-bold text-lg border-b border-slate-700 text-center min-w-[100px]">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: contact.color, color: contact.color === "#ffffff" || contact.color === "#eab308" ? "#000" : "#fff", border: contact.color === "#ffffff" ? "2px solid #666" : "none" }}>
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm">{contact.name}</span>
                    </div>
                  </th>
                ))}
                <th className="p-4 font-bold text-lg border-b border-slate-700 text-center min-w-[100px]">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold">?</div>
                    <span className="text-sm text-amber-400">Unassigned</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {plants.filter(p => {
              const cat = (p.category || "").toLowerCase();
              const name = (p.name || "").toLowerCase();
              return cat === "tomato" || cat === "pepper" || 
                     name.includes("tomato") || name.includes("pepper") ||
                     name.includes("jalap") || name.includes("habanero") ||
                     name.includes("cayenne") || name.includes("bell");
            }).map((plant) => {
                const plan = getPlan(plant.id);
                return (
                  <tr key={plant.id} onClick={() => setEditingPlant(plant)} className="hover:bg-slate-700/30 cursor-pointer transition-colors">
                    <td className="p-4 border-b border-slate-700/50 sticky left-0 bg-slate-900 z-10">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🌱</span>
                        <div>
                          <div className="font-semibold">{plant.name}</div>
                          {plant.variety && <div className="text-sm text-slate-400">{plant.variety}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center border-b border-slate-700/50 font-bold text-xl text-green-400">{plan.total || "-"}</td>
                    {contacts.map(contact => {
                      const count = plan.distribution[contact.id] || 0;
                      return (
                        <td key={contact.id} className="p-4 text-center border-b border-slate-700/50">
                          {count > 0 ? (
                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg" style={{ backgroundColor: contact.color, color: contact.color === "#ffffff" || contact.color === "#eab308" ? "#000" : "#fff", border: contact.color === "#ffffff" ? "2px solid #666" : "none" }}>{count}</span>
                          ) : <span className="text-slate-600">-</span>}
                        </td>
                      );
                    })}
                    <td className="p-4 text-center border-b border-slate-700/50">
                      {getUnassigned(plant.id) > 0 ? (
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg bg-amber-600 text-white">{getUnassigned(plant.id)}</span>
                      ) : <span className="text-slate-600">-</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 font-bold">
                <td className="p-4 border-t-2 border-slate-600 sticky left-0 bg-slate-900 z-10 text-xl">TOTALS</td>
                <td className="p-4 text-center border-t-2 border-slate-600 text-2xl text-green-400">{grandTotal}</td>
                {contacts.map(contact => (
                  <td key={contact.id} className="p-4 text-center border-t-2 border-slate-600">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full font-bold text-xl" style={{ backgroundColor: contact.color, color: contact.color === "#ffffff" || contact.color === "#eab308" ? "#000" : "#fff", border: contact.color === "#ffffff" ? "2px solid #666" : "none" }}>{getPersonTotal(contact.id)}</span>
                  </td>
                ))}
                <td className="p-4 text-center border-t-2 border-slate-600">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-full font-bold text-xl bg-amber-600 text-white">{grandUnassigned}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {contacts.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4">Manage People</h3>
          <div className="flex flex-wrap gap-3">
            {contacts.map(contact => (
              <div key={contact.id} className="flex items-center gap-2 bg-slate-800 rounded-xl px-4 py-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: contact.color, color: contact.color === "#ffffff" || contact.color === "#eab308" ? "#000" : "#fff", border: contact.color === "#ffffff" ? "2px solid #666" : "none" }}>
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <span>{contact.name}</span>
                <button onClick={() => handleDeletePerson(contact.id)} className="ml-2 text-red-400 hover:text-red-300 text-lg">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
