"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/store/authStore";
import { useZoneStore } from "@/store/zoneStore";
import { usePlantStore } from "@/store/plantStore";
import { supabase } from "@/lib/supabase/client";
import { TransplantModal } from "@/components/TransplantModal";
import type { Zone, ZoneItem, ZoneType, Contact } from "@/lib/supabase/types";

const ZoneCanvas = dynamic(
  () => import("@/components/ZoneCanvas").then((mod) => mod.ZoneCanvas),
  { ssr: false, loading: () => <div className="text-slate-400 p-8 text-center">Loading canvas...</div> }
);

const zoneTypeConfig: Record<ZoneType, { icon: string; label: string; color: string; bgColor: string }> = {
  greenhouse: {
    icon: "🌿",
    label: "Greenhouse",
    color: "from-green-600 to-emerald-700",
    bgColor: "bg-green-900/20 border-green-700/30"
  },
  garden_bed: {
    icon: "🥕",
    label: "Garden Bed",
    color: "from-amber-600 to-orange-700",
    bgColor: "bg-amber-900/20 border-amber-700/30"
  },
  indoors: {
    icon: "🏠",
    label: "Indoors",
    color: "from-blue-600 to-indigo-700",
    bgColor: "bg-blue-900/20 border-blue-700/30"
  },
};

export default function ZoneDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    zones,
    setZones,
    zoneItems,
    setZoneItems,
    addZoneItem,
    removeZoneItem,
    transplantMode,
    startTransplant,
  } = useZoneStore();
  const { plants, setPlants } = usePlantStore();
  const [loading, setLoading] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [showTransplantModal, setShowTransplantModal] = useState(false);
  const [filterRow, setFilterRow] = useState<number | null>(null);
  const [filterContact, setFilterContact] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [assigningPlantId, setAssigningPlantId] = useState<string | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<string | null>(null);
  const [duplicateCount, setDuplicateCount] = useState(1);

  const zoneId = params.id as string;
  const zone = zones.find((z) => z.id === zoneId);

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: Math.min(window.innerWidth - 32, 1200),
        height: Math.min(window.innerHeight - 200, 600),
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      const { data: zonesData } = await supabase
        .from("zones")
        .select("*")
        .eq("user_id", user.id);

      if (zonesData) {
        setZones(zonesData);
      }

      const { data: itemsData } = await supabase.from("zone_items").select("*");

      if (itemsData) {
        setZoneItems(itemsData);
      }

      const { data: plantsData } = await supabase
        .from("plants")
        .select("*")
        .eq("user_id", user.id);

      if (plantsData) {
        setPlants(plantsData);
      }

      const { data: contactsData } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id);

      if (contactsData) {
        // Assign unique colors to contacts based on their position (no orange - reserved for unassigned)
        const colors = ["#22c55e", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#06b6d4", "#a855f7"];
        const contactsWithColors = contactsData.map((contact, index) => ({
          ...contact,
          color: colors[index % colors.length]
        }));
        setContacts(contactsWithColors);

        // Update colors in database for contacts that have the default color
        contactsData.forEach(async (contact, index) => {
          const newColor = colors[index % colors.length];
          if (contact.color === "#22c55e" && newColor !== "#22c55e") {
            await supabase.from("contacts").update({ color: newColor }).eq("id", contact.id);
          }
        });
      }

      setLoading(false);
    };

    loadData();
  }, [user, setZones, setZoneItems, setPlants]);

  const zoneItemsForThisZone = zoneItems.filter(
    (item) => item.zone_id === zoneId
  );

  const unplacedPlants = plants.filter(
    (plant) => !zoneItems.some((item) => item.plant_id === plant.id)
  );

  // Get unique categories from plants in this zone
  const categoriesInZone = Array.from(
    new Set(
      zoneItemsForThisZone
        .map((item) => {
          const plant = plants.find((p) => p.id === item.plant_id);
          return plant?.category;
        })
        .filter((c): c is string => !!c)
    )
  ).sort();

  const categoryLabels: Record<string, string> = {
    vegetable: "Vegetable",
    fruit: "Fruit",
    herb: "Herb",
    flower: "Flower",
    pepper: "Pepper",
    tomato: "Tomato",
    leafy_green: "Leafy Green",
    root_vegetable: "Root Vegetable",
    squash: "Squash",
    bean: "Bean / Legume",
    other: "Other",
  };

  // Apply filters to zone items
  const filteredZoneItems = zoneItemsForThisZone.filter((item) => {
    // Row filter
    if (filterRow !== null && item.y !== filterRow) {
      return false;
    }
    // Category filter
    if (filterCategory !== null) {
      const plant = plants.find((p) => p.id === item.plant_id);
      if (!plant?.category || plant.category.toLowerCase() !== filterCategory.toLowerCase()) {
        return false;
      }
    }
    // Contact filter
    if (filterContact !== null) {
      if (filterContact === "unassigned") {
        if (item.assigned_to !== null) return false;
      } else {
        if (item.assigned_to !== filterContact) return false;
      }
    }
    return true;
  });

  const handleAddToZone = async (plantId: string) => {
    if (!zone) return;

    // Find first empty cell
    for (let y = 0; y < zone.grid_config.rows; y++) {
      for (let x = 0; x < zone.grid_config.cols; x++) {
        const occupied = zoneItemsForThisZone.some(
          (item) => item.x === x && item.y === y
        );
        if (!occupied) {
          // Set the plant's date_planted to today
          const today = new Date().toISOString().split("T")[0];
          await supabase
            .from("plants")
            .update({ date_planted: today })
            .eq("id", plantId);

          // Update local state
          const updatedPlants = plants.map((p) =>
            p.id === plantId ? { ...p, date_planted: today } : p
          );
          setPlants(updatedPlants);

          const { data, error } = await supabase
            .from("zone_items")
            .insert({
              zone_id: zoneId,
              plant_id: plantId,
              x,
              y,
            })
            .select()
            .single();

          if (data && !error) {
            addZoneItem(data);
          }
          return;
        }
      }
    }
    alert("No empty cells available!");
  };

  const handleRemoveFromZone = async (itemId: string) => {
    await supabase.from("zone_items").delete().eq("id", itemId);
    removeZoneItem(itemId);
  };

  const handleDuplicatePlants = async () => {
    if (!zone || !user || !duplicateSource) return;

    const sourcePlant = plants.find((p) => p.id === duplicateSource);
    if (!sourcePlant) return;

    // Find all empty cells
    const emptyCells: { x: number; y: number }[] = [];
    for (let y = 0; y < zone.grid_config.rows; y++) {
      for (let x = 0; x < zone.grid_config.cols; x++) {
        const occupied = zoneItemsForThisZone.some(
          (item) => item.x === x && item.y === y
        );
        if (!occupied) {
          emptyCells.push({ x, y });
        }
      }
    }

    const countToCreate = Math.min(duplicateCount, emptyCells.length);
    if (countToCreate === 0) {
      alert("No empty cells available!");
      return;
    }

    // Create duplicates
    const today = new Date().toISOString().split("T")[0];
    for (let i = 0; i < countToCreate; i++) {
      const cell = emptyCells[i];

      // Create new plant with same properties, set date_planted to today
      const { data: newPlant, error: plantError } = await supabase
        .from("plants")
        .insert({
          user_id: user.id,
          name: sourcePlant.name,
          species: sourcePlant.species,
          category: sourcePlant.category,
          current_stage: sourcePlant.current_stage,
          days_to_maturity: sourcePlant.days_to_maturity,
          date_planted: today,
        })
        .select()
        .single();

      if (plantError || !newPlant) {
        console.error("Error creating plant:", plantError);
        continue;
      }

      // Add to zone
      const { data: zoneItem, error: zoneError } = await supabase
        .from("zone_items")
        .insert({
          zone_id: zoneId,
          plant_id: newPlant.id,
          x: cell.x,
          y: cell.y,
        })
        .select()
        .single();

      if (!zoneError && zoneItem) {
        setPlants((prev) => [...prev, newPlant]);
        addZoneItem(zoneItem);
      }
    }

    setShowDuplicateModal(false);
    setDuplicateSource(null);
    setDuplicateCount(1);
  };

  const openDuplicateModal = (plantId: string) => {
    setDuplicateSource(plantId);
    setDuplicateCount(1);
    setShowDuplicateModal(true);
  };

  const handleTransplantClick = (plantId: string) => {
    startTransplant(plantId, zoneId);
    setShowTransplantModal(true);
  };

  const handleDeleteZone = async () => {
    if (!zone || !confirm("Delete this zone? Plants will be unassigned but not deleted.")) return;

    await supabase.from("zone_items").delete().eq("zone_id", zoneId);
    await supabase.from("zones").delete().eq("id", zoneId);

    router.push("/zones");
  };

  const reloadData = async () => {
    const { data: itemsData } = await supabase.from("zone_items").select("*");
    if (itemsData) {
      setZoneItems(itemsData);
    }
  };

  const handleAddContact = async () => {
    if (!user) {
      alert("Please sign in to add contacts");
      return;
    }
    if (!newContactName.trim()) {
      alert("Please enter a name");
      return;
    }

    const { data, error } = await supabase
      .from("contacts")
      .insert({ user_id: user.id, name: newContactName.trim() })
      .select()
      .single();

    if (error) {
      console.error("Error adding contact:", error);
      alert(`Error adding contact: ${error.message}`);
      return;
    }

    if (data) {
      // Assign the next color in sequence based on current contact count (no orange - reserved for unassigned)
      const colors = ["#22c55e", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#06b6d4", "#a855f7"];
      const newColor = colors[contacts.length % colors.length];
      const contactWithColor = {
        ...data,
        color: newColor
      };

      // Update the color in the database
      await supabase.from("contacts").update({ color: newColor }).eq("id", data.id);

      setContacts([...contacts, contactWithColor]);
      setNewContactName("");
      setShowContactModal(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm("Delete this contact? Plants will be unassigned.")) return;

    await supabase.from("contacts").delete().eq("id", contactId);
    setContacts(contacts.filter(c => c.id !== contactId));

    // Reload zone items to reflect unassigned plants
    reloadData();
  };

  const handleAssignContact = async (itemId: string, contactId: string | null) => {
    const { error } = await supabase
      .from("zone_items")
      .update({ assigned_to: contactId })
      .eq("id", itemId);

    if (!error) {
      // Update local state
      const updatedItems = zoneItems.map(item =>
        item.id === itemId ? { ...item, assigned_to: contactId } : item
      );
      setZoneItems(updatedItems);
    }
    setAssigningPlantId(null);
  };

  const getContactById = (contactId: string | null) => {
    if (!contactId) return null;
    return contacts.find(c => c.id === contactId);
  };

  if (!user) {
    return (
      <div className="p-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">🔒</div>
        <p className="text-slate-400 text-xl">Please sign in.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-4 animate-bounce">🗺️</div>
        <p className="text-slate-400 text-lg">Loading zone...</p>
      </div>
    );
  }

  if (!zone) {
    return (
      <div className="p-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">❓</div>
        <p className="text-slate-400 mb-4 text-xl">Zone not found</p>
        <Link href="/zones" className="text-green-400 hover:text-green-300 text-lg font-medium">
          ← Back to zones
        </Link>
      </div>
    );
  }

  const config = zoneTypeConfig[zone.type];
  const isGreenhouse = zone.type === "greenhouse";
  const totalSlots = zone.grid_config.cols * zone.grid_config.rows;
  const usedSlots = zoneItemsForThisZone.length;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/zones"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-green-400 mb-3 text-lg transition-colors"
        >
          <span>←</span> Back to zones
        </Link>

        <div className={`rounded-2xl p-5 border ${config.bgColor}`}>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{config.icon}</span>
              <div>
                <h2 className="text-2xl font-bold">{zone.name}</h2>
                <span className={`text-sm px-3 py-1 rounded-full font-medium bg-gradient-to-r ${config.color} inline-block mt-1`}>
                  {config.label}
                </span>
              </div>
            </div>
            <button
              onClick={handleDeleteZone}
              className="text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 px-4 py-2 rounded-xl transition-colors text-sm font-medium"
            >
              🗑️ Delete
            </button>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-slate-800/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{zone.grid_config.cols} × {zone.grid_config.rows}</div>
              <div className="text-sm text-slate-400">Grid Size</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-green-400">{usedSlots}</div>
              <div className="text-sm text-slate-400">Plants Placed</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-slate-300">{totalSlots - usedSlots}</div>
              <div className="text-sm text-slate-400">Empty Slots</div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700/50">
        <p className="text-slate-300 text-center">
          <span className="text-xl mr-2">👆</span>
          <strong>Drag plants</strong> to rearrange them in the grid below
          {isGreenhouse && (
            <>
              <span className="mx-2">•</span>
              <span className="text-xl mr-2">👆👆</span>
              <strong>Double-tap</strong> a plant to transplant it
            </>
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700/50">
        <div className="flex flex-col gap-4">
          {/* Row Filter */}
          <div>
            <label className="text-sm text-slate-400 font-medium mb-2 block">Filter by Row</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterRow(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterRow === null
                    ? "bg-green-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                All Rows
              </button>
              {Array.from({ length: zone.grid_config.rows }).map((_, rowIndex) => (
                <button
                  key={rowIndex}
                  onClick={() => setFilterRow(rowIndex)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterRow === rowIndex
                      ? "bg-green-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Row {rowIndex + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          {categoriesInZone.length > 0 && (
            <div>
              <label className="text-sm text-slate-400 font-medium mb-2 block">Filter by Category</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterCategory(null)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterCategory === null
                      ? "bg-green-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  All Categories
                </button>
                {categoriesInZone.map((category) => (
                  <button
                    key={category}
                    onClick={() => setFilterCategory(category)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filterCategory === category
                        ? "bg-green-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {categoryLabels[category] || category}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Assigned To Filter */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-slate-400 font-medium">Assigned to</label>
              <button
                onClick={() => setShowContactModal(true)}
                className="text-sm text-green-400 hover:text-green-300"
              >
                + Add People
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterContact(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterContact === null
                    ? "bg-green-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                All People
              </button>
              <button
                onClick={() => setFilterContact("unassigned")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterContact === "unassigned"
                    ? "bg-green-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                Unassigned
              </button>
              {contacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => setFilterContact(contact.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterContact === contact.id
                      ? "text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                  style={filterContact === contact.id ? { backgroundColor: contact.color } : {}}
                >
                  {contact.name}
                </button>
              ))}
            </div>
          </div>

          {/* Active Filters Summary */}
          {(filterRow !== null || filterCategory !== null || filterContact !== null) && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-700 flex-wrap">
              <span className="text-sm text-slate-400">Active filters:</span>
              {filterRow !== null && (
                <span className="bg-green-600/20 text-green-400 px-3 py-1 rounded-full text-sm">
                  Row {filterRow + 1}
                </span>
              )}
              {filterCategory !== null && (
                <span className="bg-green-600/20 text-green-400 px-3 py-1 rounded-full text-sm">
                  {categoryLabels[filterCategory] || filterCategory}
                </span>
              )}
              {filterContact !== null && (
                <span className="bg-green-600/20 text-green-400 px-3 py-1 rounded-full text-sm">
                  {filterContact === "unassigned" ? "Unassigned" : getContactById(filterContact)?.name}
                </span>
              )}
              <button
                onClick={() => {
                  setFilterRow(null);
                  setFilterCategory(null);
                  setFilterContact(null);
                }}
                className="ml-auto text-sm text-red-400 hover:text-red-300"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="mb-6 rounded-2xl overflow-hidden border-2 border-slate-700">
        {dimensions.width > 0 && (
          <ZoneCanvas
            key={`canvas-${filterRow}-${filterCategory}-${filterContact}`}
            zone={zone}
            items={filteredZoneItems}
            width={dimensions.width}
            height={dimensions.height}
            onTransplant={isGreenhouse ? handleTransplantClick : undefined}
            onPlantClick={(plantId) => router.push(`/plants/${plantId}`)}
            highlightRow={filterRow}
            contacts={contacts}
          />
        )}
      </div>

      {/* Quick Add / Duplicate Plants */}
      <section className="mb-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="text-2xl">📋</span> Quick Add (Duplicate Existing)
        </h3>
        <p className="text-slate-400 text-sm mb-3">Click a plant type to create copies and place them in empty cells:</p>
        {plants.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl p-6 text-center border border-slate-700/50">
            <p className="text-slate-400">No plants in your inventory yet.</p>
            <Link href="/plants/new" className="text-green-400 hover:text-green-300 font-medium mt-2 inline-block">
              Add your first plant →
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {/* Get unique plant types by name+species */}
            {Array.from(
              new Map(
                plants.map((p) => [`${p.name}-${p.species || ""}`, p])
              ).values()
            ).map((plant) => (
              <button
                key={plant.id}
                onClick={() => openDuplicateModal(plant.id)}
                className="bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 px-5 py-3 rounded-xl text-base font-medium transition-all flex items-center gap-2 shadow"
              >
                <span className="text-xl">📋</span>
                {plant.name}
                {plant.species && <span className="text-blue-200 text-sm">({plant.species})</span>}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Unplaced Plants */}
      <section className="mb-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="text-2xl">➕</span> Add Unplaced Plants
        </h3>
        {unplacedPlants.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl p-6 text-center border border-slate-700/50">
            <p className="text-slate-400">
              All your plants are already placed in zones.
            </p>
            <Link href="/plants/new" className="text-green-400 hover:text-green-300 font-medium mt-2 inline-block">
              Add a new plant →
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {unplacedPlants.map((plant) => (
              <button
                key={plant.id}
                onClick={() => handleAddToZone(plant.id)}
                className="bg-gradient-to-r from-slate-700 to-slate-600 hover:from-green-700 hover:to-green-600 px-5 py-3 rounded-xl text-base font-medium transition-all flex items-center gap-2 shadow"
              >
                <span className="text-xl">🌱</span>
                {plant.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Plants in Zone */}
      <section>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="text-2xl">🌿</span> Plants in Zone
          {(filterRow !== null || filterCategory !== null || filterContact !== null) ? (
            <span className="text-slate-400 font-normal">
              ({filteredZoneItems.length} of {zoneItemsForThisZone.length} shown)
            </span>
          ) : (
            <span>({zoneItemsForThisZone.length})</span>
          )}
        </h3>
        {filteredZoneItems.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl p-6 text-center border border-slate-700/50">
            <div className="text-4xl mb-2">📭</div>
            {zoneItemsForThisZone.length === 0 ? (
              <>
                <p className="text-slate-400">No plants placed in this zone yet.</p>
                <p className="text-slate-500 text-sm mt-1">Use the buttons above to add plants.</p>
              </>
            ) : (
              <>
                <p className="text-slate-400">No plants match your current filters.</p>
                <button
                  onClick={() => {
                    setFilterRow(null);
                    setFilterCategory(null);
                    setFilterContact(null);
                  }}
                  className="text-green-400 hover:text-green-300 font-medium mt-2"
                >
                  Clear filters →
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredZoneItems.map((item) => {
              const plant = plants.find((p) => p.id === item.plant_id);
              const assignedContact = getContactById(item.assigned_to);
              if (!plant) return null;
              return (
                <div
                  key={item.id}
                  className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/50"
                  style={assignedContact ? { borderLeftColor: assignedContact.color, borderLeftWidth: "4px" } : {}}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🌱</span>
                      <div>
                        <div className="font-bold text-lg">{plant.name}</div>
                        <div className="text-sm text-slate-400">
                          {plant.species && (
                            <span className="capitalize">{plant.species} • </span>
                          )}
                          Column {item.x + 1}, Row {item.y + 1}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFromZone(item.id)}
                      className="bg-slate-700 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                      title="Remove from zone"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Assignment Section */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">Assigned to:</span>
                      {assigningPlantId === item.id ? (
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => handleAssignContact(item.id, null)}
                            className="px-2 py-1 rounded text-xs bg-slate-600 hover:bg-slate-500"
                          >
                            None
                          </button>
                          {contacts.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => handleAssignContact(item.id, c.id)}
                              className="px-2 py-1 rounded text-xs text-white"
                              style={{ backgroundColor: c.color }}
                            >
                              {c.name}
                            </button>
                          ))}
                          <button
                            onClick={() => setAssigningPlantId(null)}
                            className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-400"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAssigningPlantId(item.id)}
                          className="px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                          style={assignedContact
                            ? { backgroundColor: assignedContact.color, color: "white" }
                            : { backgroundColor: "#374151", color: "#9ca3af" }
                          }
                        >
                          {assignedContact ? assignedContact.name : "Unassigned"}
                        </button>
                      )}
                    </div>
                    {isGreenhouse && (
                      <button
                        onClick={() => handleTransplantClick(plant.id)}
                        className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors shadow"
                      >
                        Transplant
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Transplant Modal */}
      {showTransplantModal && (
        <TransplantModal
          onClose={() => setShowTransplantModal(false)}
          onComplete={() => {
            setShowTransplantModal(false);
            reloadData();
          }}
        />
      )}

      {/* Contact Management Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-xl font-bold mb-4">Manage People</h3>

            {/* Add New Contact */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                placeholder="Enter name..."
                className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-white"
                onKeyDown={(e) => e.key === "Enter" && handleAddContact()}
              />
              <button
                onClick={handleAddContact}
                disabled={!newContactName.trim()}
                className="bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl font-medium transition-colors"
              >
                Add
              </button>
            </div>

            {/* Contact List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {contacts.length === 0 ? (
                <p className="text-slate-400 text-center py-4">No people added yet</p>
              ) : (
                contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between bg-slate-700/50 rounded-xl p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: contact.color }}
                      />
                      <span className="font-medium">{contact.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      className="text-red-400 hover:text-red-300 px-2 py-1 rounded"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowContactModal(false)}
              className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-xl font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Duplicate Plant Modal */}
      {showDuplicateModal && duplicateSource && (() => {
        const sourcePlant = plants.find((p) => p.id === duplicateSource);
        const emptySlots = totalSlots - usedSlots;
        if (!sourcePlant) return null;
        return (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700">
              <h3 className="text-xl font-bold mb-4">Duplicate Plant</h3>

              <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🌱</span>
                  <div>
                    <div className="font-bold text-lg">{sourcePlant.name}</div>
                    {sourcePlant.species && (
                      <div className="text-slate-400 capitalize">{sourcePlant.species}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-sm text-slate-400 font-medium mb-2 block">
                  How many copies? ({emptySlots} empty slots available)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDuplicateCount(Math.max(1, duplicateCount - 1))}
                    className="bg-slate-700 hover:bg-slate-600 text-white w-12 h-12 rounded-xl text-2xl font-bold"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={emptySlots}
                    value={duplicateCount}
                    onChange={(e) => setDuplicateCount(Math.max(1, Math.min(emptySlots, parseInt(e.target.value) || 1)))}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white text-center text-xl font-bold"
                  />
                  <button
                    onClick={() => setDuplicateCount(Math.min(emptySlots, duplicateCount + 1))}
                    className="bg-slate-700 hover:bg-slate-600 text-white w-12 h-12 rounded-xl text-2xl font-bold"
                  >
                    +
                  </button>
                </div>
                {/* Quick buttons */}
                <div className="flex gap-2 mt-3">
                  {[5, 10, 20].filter(n => n <= emptySlots).map((n) => (
                    <button
                      key={n}
                      onClick={() => setDuplicateCount(n)}
                      className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      {n}
                    </button>
                  ))}
                  {emptySlots > 0 && (
                    <button
                      onClick={() => setDuplicateCount(emptySlots)}
                      className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      Fill All ({emptySlots})
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDuplicateModal(false);
                    setDuplicateSource(null);
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDuplicatePlants}
                  disabled={emptySlots === 0}
                  className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-medium transition-colors"
                >
                  Create {duplicateCount} Plants
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
