"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase/client";
import type { Contact, Plant, ZoneItem, Zone, Tray } from "@/lib/supabase/types";

const defaultColors = ["#22c55e", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#06b6d4"];

export default function PlanningPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [zoneItems, setZoneItems] = useState<ZoneItem[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [trays, setTrays] = useState<Tray[]>([]);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [selectedColor, setSelectedColor] = useState(defaultColors[0]);
  const [addingPerson, setAddingPerson] = useState(false);

  // Distribution modal state
  const [distributingPlant, setDistributingPlant] = useState<Plant | null>(null);
  const [distributingItems, setDistributingItems] = useState<ZoneItem[]>([]);
  const [distribution, setDistribution] = useState<Map<string | null, number>>(new Map());
  const [totalPlants, setTotalPlants] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [contactsRes, zoneItemsRes, plantsRes, zonesRes, traysRes] = await Promise.all([
      supabase.from("contacts").select("*").eq("user_id", user.id),
      supabase.from("zone_items").select("*"),
      supabase.from("plants").select("*").eq("user_id", user.id),
      supabase.from("zones").select("*").eq("user_id", user.id),
      supabase.from("trays").select("*"),
    ]);

    setContacts(contactsRes.data || []);
    setZoneItems(zoneItemsRes.data || []);
    setPlants(plantsRes.data || []);
    setZones(zonesRes.data || []);
    setTrays(traysRes.data || []);
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
    if (!confirm("Delete this person? Their plant assignments will be removed.")) return;

    await supabase.from("zone_items").update({ assigned_to: null }).eq("assigned_to", contactId);
    await supabase.from("contacts").delete().eq("id", contactId);

    setContacts(contacts.filter(c => c.id !== contactId));
    fetchData();
  };

  // Open distribution modal for a plant
  const handlePlantClick = (plant: Plant) => {
    const plantItems = zoneItems.filter(item => item.plant_id === plant.id);

    // Build current distribution
    const currentDist = new Map<string | null, number>();
    currentDist.set(null, 0); // Unassigned
    contacts.forEach(c => currentDist.set(c.id, 0));

    for (const item of plantItems) {
      const key = item.assigned_to || null;
      currentDist.set(key, (currentDist.get(key) || 0) + 1);
    }

    setDistributingPlant(plant);
    setDistributingItems(plantItems);
    setDistribution(currentDist);
    setTotalPlants(plantItems.length);
  };

  // Change total plants count
  const changeTotalPlants = (delta: number) => {
    const newTotal = Math.max(0, totalPlants + delta);
    setTotalPlants(newTotal);

    // Recalculate unassigned
    let assigned = 0;
    for (const [key, val] of distribution) {
      if (key !== null) assigned += val;
    }
    const newUnassigned = Math.max(0, newTotal - assigned);
    const newDist = new Map(distribution);
    newDist.set(null, newUnassigned);
    setDistribution(newDist);
  };

  // Update distribution count for a person
  const updateDistribution = (contactId: string | null, delta: number) => {
    const newDist = new Map(distribution);
    const currentCount = newDist.get(contactId) || 0;
    const newCount = Math.max(0, currentCount + delta);

    // Calculate total assigned by others
    let totalOthers = 0;
    for (const [key, val] of newDist) {
      if (key !== contactId && key !== null) totalOthers += val;
    }

    // Don't allow more than totalPlants
    const maxForThis = totalPlants - totalOthers;
    const finalCount = Math.min(newCount, maxForThis);

    newDist.set(contactId, finalCount);

    // Auto-fill unassigned with remainder
    let assigned = 0;
    for (const [key, val] of newDist) {
      if (key !== null) assigned += val;
    }
    newDist.set(null, totalPlants - assigned);

    setDistribution(newDist);
  };

  // Set exact count for a person
  const setDistributionCount = (contactId: string | null, count: number) => {
    const newDist = new Map(distribution);
    const safeCount = Math.max(0, count);

    // Calculate total assigned by others
    let totalOthers = 0;
    for (const [key, val] of newDist) {
      if (key !== contactId && key !== null) totalOthers += val;
    }

    // Don't allow more than totalPlants
    const maxForThis = totalPlants - totalOthers;
    const finalCount = Math.min(safeCount, maxForThis);

    newDist.set(contactId, finalCount);

    // Auto-fill unassigned with remainder
    let assigned = 0;
    for (const [key, val] of newDist) {
      if (key !== null) assigned += val;
    }
    newDist.set(null, totalPlants - assigned);

    setDistribution(newDist);
  };

  // Find next available position in a tray
  const findNextPosition = (trayId: string, existingPositions: Set<string>) => {
    const tray = trays.find(t => t.id === trayId);
    if (!tray) return { x: 0, y: 0 };

    for (let y = 0; y < tray.rows; y++) {
      for (let x = 0; x < tray.cols; x++) {
        const key = `${x},${y}`;
        if (!existingPositions.has(key)) {
          return { x, y };
        }
      }
    }
    return { x: 0, y: 0 };
  };

  // Save the distribution
  const saveDistribution = async () => {
    if (!distributingPlant) return;
    setSaving(true);

    // Find a tray to add new plants to
    const firstZone = zones[0];
    const firstTray = trays.find(t => t.zone_id === firstZone?.id) || trays[0];

    if (!firstTray && totalPlants > distributingItems.length) {
      alert("No tray available to add new plants. Please create a tray first.");
      setSaving(false);
      return;
    }

    // Get existing positions in the tray
    const existingPositions = new Set(
      zoneItems
        .filter(item => item.tray_id === firstTray?.id)
        .map(item => `${item.x},${item.y}`)
    );

    // Create new zone_items if needed
    const newItems: ZoneItem[] = [];
    const plantsToAdd = totalPlants - distributingItems.length;

    if (plantsToAdd > 0 && firstTray) {
      const today = new Date().toISOString().split("T")[0];

      for (let i = 0; i < plantsToAdd; i++) {
        const pos = findNextPosition(firstTray.id, existingPositions);
        existingPositions.add(`${pos.x},${pos.y}`);

        const { data, error } = await supabase
          .from("zone_items")
          .insert({
            zone_id: firstTray.zone_id,
            tray_id: firstTray.id,
            plant_id: distributingPlant.id,
            x: pos.x,
            y: pos.y,
            assigned_to: null,
          })
          .select()
          .single();

        if (data && !error) {
          newItems.push(data);
        }
      }

      // Update plant's date_planted if not set
      if (!distributingPlant.date_planted) {
        await supabase.from("plants").update({ date_planted: today }).eq("id", distributingPlant.id);
      }
    }

    // Combine existing and new items
    const allItems = [...distributingItems, ...newItems];

    // Build list of assignments needed
    const assignments: { itemId: string; contactId: string | null }[] = [];
    const itemsToAssign = [...allItems];

    // Assign to each person based on distribution
    for (const contact of contacts) {
      const count = distribution.get(contact.id) || 0;
      for (let i = 0; i < count && itemsToAssign.length > 0; i++) {
        const item = itemsToAssign.shift()!;
        assignments.push({ itemId: item.id, contactId: contact.id });
      }
    }

    // Remaining go to unassigned
    for (const item of itemsToAssign) {
      assignments.push({ itemId: item.id, contactId: null });
    }

    // Update database
    for (const { itemId, contactId } of assignments) {
      await supabase
        .from("zone_items")
        .update({ assigned_to: contactId })
        .eq("id", itemId);
    }

    // Update local state
    const updatedZoneItems = [...zoneItems, ...newItems];
    const assignmentMap = new Map(assignments.map(a => [a.itemId, a.contactId]));
    setZoneItems(updatedZoneItems.map(item =>
      assignmentMap.has(item.id)
        ? { ...item, assigned_to: assignmentMap.get(item.id)! }
        : item
    ));

    setSaving(false);
    setDistributingPlant(null);
    setDistributingItems([]);
    setTotalPlants(0);
  };

  // Build the grid data
  const buildGridData = () => {
    const placedPlantIds = new Set(zoneItems.map(item => item.plant_id));
    const placedPlants = plants.filter(p => placedPlantIds.has(p.id));

    const counts: Map<string, Map<string | null, number>> = new Map();

    for (const item of zoneItems) {
      if (!counts.has(item.plant_id)) {
        counts.set(item.plant_id, new Map());
      }
      const plantCounts = counts.get(item.plant_id)!;
      const contactId = item.assigned_to || null;
      plantCounts.set(contactId, (plantCounts.get(contactId) || 0) + 1);
    }

    return { placedPlants, counts };
  };

  const { placedPlants, counts } = buildGridData();

  // Calculate totals
  const personTotals: Map<string | null, number> = new Map();
  personTotals.set(null, 0);
  contacts.forEach(c => personTotals.set(c.id, 0));

  for (const [, plantCounts] of counts) {
    for (const [contactId, count] of plantCounts) {
      personTotals.set(contactId, (personTotals.get(contactId) || 0) + count);
    }
  }

  const plantTotals: Map<string, number> = new Map();
  for (const [plantId, plantCounts] of counts) {
    let total = 0;
    for (const [, count] of plantCounts) {
      total += count;
    }
    plantTotals.set(plantId, total);
  }

  const grandTotal = Array.from(personTotals.values()).reduce((a, b) => a + b, 0);

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
        <p className="text-slate-400">Loading planning grid...</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-full mx-auto pb-24">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-3xl font-bold">Plant Planning Grid</h2>
          <p className="text-slate-400">Tap a plant to distribute among people</p>
        </div>
        <button
          onClick={() => setShowAddPerson(true)}
          className="px-5 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-lg transition-colors"
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

      {/* Distribution Modal */}
      {distributingPlant && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50" onClick={() => !saving && setDistributingPlant(null)}>
          <div className="bg-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-700">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-2xl flex items-center gap-2">
                    <span>🌱</span> {distributingPlant.name}
                  </h3>
                </div>
                <button
                  onClick={() => !saving && setDistributingPlant(null)}
                  disabled={saving}
                  className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-white bg-slate-700 rounded-full text-2xl disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto" style={{ maxHeight: "50vh" }}>
              {/* Total Plants Control */}
              <div className="flex items-center justify-between bg-green-900/30 rounded-2xl p-4 border border-green-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-xl font-bold text-white">
                    #
                  </div>
                  <div>
                    <span className="font-semibold text-lg text-green-300">Total Plants</span>
                    {totalPlants > distributingItems.length && (
                      <div className="text-sm text-green-400">
                        +{totalPlants - distributingItems.length} new
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => changeTotalPlants(-1)}
                    disabled={totalPlants === 0 || saving}
                    className="w-12 h-12 rounded-xl bg-slate-600 hover:bg-slate-500 disabled:opacity-30 disabled:hover:bg-slate-600 text-2xl font-bold flex items-center justify-center"
                  >
                    −
                  </button>
                  <div className="w-16 h-12 text-center text-xl font-bold bg-green-800 border-2 border-green-600 rounded-xl flex items-center justify-center text-green-300">
                    {totalPlants}
                  </div>
                  <button
                    onClick={() => changeTotalPlants(1)}
                    disabled={saving}
                    className="w-12 h-12 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-30 text-2xl font-bold flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Person distribution rows */}
              {contacts.map((contact) => {
                const count = distribution.get(contact.id) || 0;
                return (
                  <div key={contact.id} className="flex items-center justify-between bg-slate-700/50 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white"
                        style={{ backgroundColor: contact.color }}
                      >
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-lg">{contact.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateDistribution(contact.id, -1)}
                        disabled={count === 0 || saving}
                        className="w-12 h-12 rounded-xl bg-slate-600 hover:bg-slate-500 disabled:opacity-30 disabled:hover:bg-slate-600 text-2xl font-bold flex items-center justify-center"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={count}
                        onChange={(e) => setDistributionCount(contact.id, parseInt(e.target.value) || 0)}
                        disabled={saving}
                        className="w-16 h-12 text-center text-xl font-bold bg-slate-800 border-2 border-slate-600 rounded-xl focus:border-green-500 focus:outline-none disabled:opacity-50"
                      />
                      <button
                        onClick={() => updateDistribution(contact.id, 1)}
                        disabled={saving}
                        className="w-12 h-12 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-30 text-2xl font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Unassigned row */}
              <div className="flex items-center justify-between bg-amber-900/30 rounded-2xl p-4 border border-amber-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-600 flex items-center justify-center text-xl font-bold text-white">
                    ?
                  </div>
                  <span className="font-semibold text-lg text-amber-300">Unassigned</span>
                </div>
                <div className="text-3xl font-bold text-amber-400 px-4">
                  {distribution.get(null) || 0}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 space-y-3">
              <button
                onClick={saveDistribution}
                disabled={saving || totalPlants === 0}
                className="w-full py-5 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white text-xl font-bold rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="animate-spin">⏳</span> Saving...
                  </>
                ) : (
                  <>✓ Save Distribution</>
                )}
              </button>
              <button
                onClick={() => !saving && setDistributingPlant(null)}
                disabled={saving}
                className="w-full py-4 text-slate-400 hover:text-white text-lg font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-3xl font-bold text-green-400">{placedPlants.length}</div>
          <div className="text-slate-400 text-sm">Plant Types</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-3xl font-bold text-blue-400">{contacts.length}</div>
          <div className="text-slate-400 text-sm">People</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-3xl font-bold text-purple-400">{grandTotal}</div>
          <div className="text-slate-400 text-sm">Total Plants</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-3xl font-bold text-amber-400">{personTotals.get(null) || 0}</div>
          <div className="text-slate-400 text-sm">Unassigned</div>
        </div>
      </div>

      {placedPlants.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/50 rounded-2xl border border-slate-700/50">
          <div className="text-6xl mb-4">🌱</div>
          <h3 className="text-xl font-bold mb-2">No Plants Placed Yet</h3>
          <p className="text-slate-400 mb-4">
            Add plants to zones to see them in the planning grid.
          </p>
          <Link
            href="/zones"
            className="inline-block px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-medium transition-colors"
          >
            Go to Zones →
          </Link>
        </div>
      ) : contacts.length === 0 ? (
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
        /* Planning Grid Table */
        <div className="overflow-x-auto rounded-2xl border border-slate-700/50">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-800">
                <th className="p-4 font-bold text-lg border-b border-slate-700 sticky left-0 bg-slate-800 z-10 min-w-[180px]">
                  Plant
                </th>
                <th className="p-4 font-bold text-lg border-b border-slate-700 text-center min-w-[80px]">
                  Total
                </th>
                {contacts.map(contact => (
                  <th
                    key={contact.id}
                    className="p-4 font-bold text-lg border-b border-slate-700 text-center min-w-[100px]"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: contact.color }}
                      >
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm">{contact.name}</span>
                    </div>
                  </th>
                ))}
                <th className="p-4 font-bold text-lg border-b border-slate-700 text-center min-w-[100px]">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold">
                      ?
                    </div>
                    <span className="text-sm text-amber-400">Unassigned</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {placedPlants.map((plant) => {
                const plantCounts = counts.get(plant.id) || new Map();
                const plantTotal = plantTotals.get(plant.id) || 0;
                return (
                  <tr
                    key={plant.id}
                    onClick={() => handlePlantClick(plant)}
                    className="hover:bg-slate-700/30 cursor-pointer transition-colors"
                  >
                    <td className="p-4 border-b border-slate-700/50 sticky left-0 bg-slate-900 z-10">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🌱</span>
                        <div>
                          <div className="font-semibold">{plant.name}</div>
                          {plant.variety && (
                            <div className="text-sm text-slate-400">{plant.variety}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center border-b border-slate-700/50 font-bold text-xl text-green-400">
                      {plantTotal}
                    </td>
                    {contacts.map(contact => {
                      const count = plantCounts.get(contact.id) || 0;
                      return (
                        <td
                          key={contact.id}
                          className="p-4 text-center border-b border-slate-700/50"
                        >
                          {count > 0 ? (
                            <span
                              className="inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg text-white"
                              style={{ backgroundColor: contact.color }}
                            >
                              {count}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-4 text-center border-b border-slate-700/50">
                      {(plantCounts.get(null) || 0) > 0 ? (
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg bg-amber-600 text-white">
                          {plantCounts.get(null)}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 font-bold">
                <td className="p-4 border-t-2 border-slate-600 sticky left-0 bg-slate-900 z-10 text-xl">
                  TOTALS
                </td>
                <td className="p-4 text-center border-t-2 border-slate-600 text-2xl text-green-400">
                  {grandTotal}
                </td>
                {contacts.map(contact => (
                  <td
                    key={contact.id}
                    className="p-4 text-center border-t-2 border-slate-600"
                  >
                    <span
                      className="inline-flex items-center justify-center w-12 h-12 rounded-full font-bold text-xl text-white"
                      style={{ backgroundColor: contact.color }}
                    >
                      {personTotals.get(contact.id) || 0}
                    </span>
                  </td>
                ))}
                <td className="p-4 text-center border-t-2 border-slate-600">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-full font-bold text-xl bg-amber-600 text-white">
                    {personTotals.get(null) || 0}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Manage People Section */}
      {contacts.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4">Manage People</h3>
          <div className="flex flex-wrap gap-3">
            {contacts.map(contact => (
              <div
                key={contact.id}
                className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-3 border border-slate-700/50"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: contact.color }}
                >
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium">{contact.name}</span>
                <button
                  onClick={() => handleDeletePerson(contact.id)}
                  className="text-red-400 hover:text-red-300 ml-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
