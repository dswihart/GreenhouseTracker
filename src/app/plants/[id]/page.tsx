"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { usePlantStore } from "@/store/plantStore";
import { supabase } from "@/lib/supabase/client";
import type { Plant, PlantStage, JournalEntry, Contact, ZoneItem } from "@/lib/supabase/types";

const stageLabels: Record<PlantStage, string> = {
  seed: "Seed",
  seedling: "Seedling",
  vegetative: "Vegetative",
  flowering: "Flowering",
  harvest_ready: "Harvest Ready",
};

const stages: PlantStage[] = [
  "seed",
  "seedling",
  "vegetative",
  "flowering",
  "harvest_ready",
];

const categories = [
  { value: "", label: "None" },
  { value: "vegetable", label: "Vegetable" },
  { value: "fruit", label: "Fruit" },
  { value: "herb", label: "Herb" },
  { value: "flower", label: "Flower" },
  { value: "pepper", label: "Pepper" },
  { value: "tomato", label: "Tomato" },
  { value: "leafy_green", label: "Leafy Green" },
  { value: "root_vegetable", label: "Root Vegetable" },
  { value: "squash", label: "Squash" },
  { value: "bean", label: "Bean / Legume" },
  { value: "other", label: "Other" },
];

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

export default function PlantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { updatePlant, removePlant } = usePlantStore();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [zoneItem, setZoneItem] = useState<ZoneItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editingGermination, setEditingGermination] = useState(false);
  const [germinationInput, setGerminationInput] = useState("");
  const [editingHeight, setEditingHeight] = useState(false);
  const [heightInput, setHeightInput] = useState("");
  const [editingSpacing, setEditingSpacing] = useState(false);
  const [spacingInput, setSpacingInput] = useState("");
  const [editingDepth, setEditingDepth] = useState(false);
  const [depthInput, setDepthInput] = useState("");
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelInput, setLabelInput] = useState("");

  const plantId = params.id as string;

  useEffect(() => {
    if (!user || !plantId) return;

    const loadPlant = async () => {
      const { data: plantData } = await supabase
        .from("plants")
        .select("*")
        .eq("id", plantId)
        .eq("user_id", user.id)
        .single();

      if (plantData) {
        setPlant(plantData);
      }

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
        .eq("user_id", user.id);

      if (contactsData) {
        const colors = ["#22c55e", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#06b6d4", "#a855f7"];
        const contactsWithColors = contactsData.map((contact, index) => ({
          ...contact,
          color: colors[index % colors.length]
        }));
        setContacts(contactsWithColors);
      }

      // Load zone item for this plant (if placed in a zone)
      const { data: zoneItemData } = await supabase
        .from("zone_items")
        .select("*")
        .eq("plant_id", plantId)
        .single();

      if (zoneItemData) {
        setZoneItem(zoneItemData);
      }

      setLoading(false);
    };

    loadPlant();
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

  const handleCategoryChange = async (newCategory: string) => {
    if (!plant) return;
    setUpdating(true);

    const categoryValue = newCategory || null;
    const { error } = await supabase
      .from("plants")
      .update({ category: categoryValue })
      .eq("id", plant.id);

    if (!error) {
      setPlant({ ...plant, category: categoryValue });
      updatePlant(plant.id, { category: categoryValue });
    }

    setUpdating(false);
  };


  const handleGerminationSave = async () => {
    if (!plant) return;
    setUpdating(true);

    const value = germinationInput.trim() ? parseInt(germinationInput) : null;
    const { error } = await supabase
      .from("plants")
      .update({ germination_days: value })
      .eq("id", plant.id);

    if (!error) {
      setPlant({ ...plant, germination_days: value });
      updatePlant(plant.id, { germination_days: value });
    }

    setUpdating(false);
    setEditingGermination(false);
  };

  const handleHeightSave = async () => {
    if (!plant) return;
    setUpdating(true);

    const value = heightInput.trim() ? parseFloat(heightInput) : null;
    const { error } = await supabase
      .from("plants")
      .update({ height_inches: value })
      .eq("id", plant.id);

    if (!error) {
      setPlant({ ...plant, height_inches: value });
      updatePlant(plant.id, { height_inches: value });
    }

    setUpdating(false);
    setEditingHeight(false);
  };

  const handleSpacingSave = async () => {
    if (!plant) return;
    setUpdating(true);

    const value = spacingInput.trim() ? parseFloat(spacingInput) : null;
    const { error } = await supabase
      .from("plants")
      .update({ spacing_inches: value })
      .eq("id", plant.id);

    if (!error) {
      setPlant({ ...plant, spacing_inches: value });
      updatePlant(plant.id, { spacing_inches: value });
    }

    setUpdating(false);
    setEditingSpacing(false);
  };

  const handleDepthSave = async () => {
    if (!plant) return;
    setUpdating(true);

    const value = depthInput.trim() ? parseFloat(depthInput) : null;
    const { error } = await supabase
      .from("plants")
      .update({ planting_depth_inches: value })
      .eq("id", plant.id);

    if (!error) {
      setPlant({ ...plant, planting_depth_inches: value });
      updatePlant(plant.id, { planting_depth_inches: value });
    }

    setUpdating(false);
    setEditingDepth(false);
  };

  const handleDelete = async () => {
    if (!plant || !confirm("Are you sure you want to delete this plant?"))
      return;

    const { error } = await supabase.from("plants").delete().eq("id", plant.id);

    if (!error) {
      removePlant(plant.id);
      router.push("/plants");
    }
  };

  const getHarvestDate = () => {
    if (!plant?.date_planted || !plant?.days_to_maturity) return null;
    const harvest = new Date(plant.date_planted);
    harvest.setDate(harvest.getDate() + plant.days_to_maturity);
    return harvest;
  };

  const getDaysRemaining = () => {
    const harvestDate = getHarvestDate();
    if (!harvestDate) return null;
    const now = new Date();
    return Math.ceil(
      (harvestDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-slate-400">Loading plant...</div>
    );
  }

  if (!plant) {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-400 mb-4">Plant not found</p>
        <Link href="/plants" className="text-green-400 hover:text-green-300">
          Back to plants
        </Link>
      </div>
    );
  }

  const harvestDate = getHarvestDate();
  const daysRemaining = getDaysRemaining();

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex gap-3 mb-2">
              {zoneItem ? (
                <Link
                  href={`/zones/${zoneItem.zone_id}`}
                  className="text-green-400 hover:text-green-300 text-sm inline-flex items-center gap-1 bg-green-900/30 px-3 py-1 rounded-full"
                >
                  &larr; Back to Tray
                </Link>
              ) : null}
              <Link
                href="/plants"
                className="text-slate-400 hover:text-slate-300 text-sm inline-flex items-center gap-1"
              >
                &larr; All Plants
              </Link>
            </div>
            <h2 className="text-2xl font-bold">{plant.name}</h2>
            {plant.species && (
              <p className="text-slate-400">{plant.species}</p>
            )}
          </div>
          <button
            onClick={handleDelete}
            className="text-red-400 hover:text-red-300 text-sm"
          >
            Delete
          </button>
        </div>

        {/* Photo */}
        {plant.photo_url && (
          <div className="bg-slate-800 rounded-lg overflow-hidden mb-6">
            <img
              src={plant.photo_url}
              alt={plant.name}
              className="w-full h-48 object-cover"
            />
          </div>
        )}

        {/* Growing Information */}
        {plant.description && (
          <div className="bg-slate-800 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-green-400">
              <span>🌱</span> Growing Information
            </h3>
            <div className="space-y-3">
              {plant.description.split("\n").map((line, idx) => {
                if (!line.trim()) return null;

                // Parse the line to add icons
                let icon = "📝";
                let label = "";
                let value = line;

                if (line.startsWith("Sun:")) { icon = "☀️"; label = "Sun"; value = line.replace("Sun:", "").trim(); }
                else if (line.startsWith("Water:")) { icon = "💧"; label = "Water"; value = line.replace("Water:", "").trim(); }
                else if (line.startsWith("Soil:")) { icon = "🪴"; label = "Soil"; value = line.replace("Soil:", "").trim(); }
                else if (line.startsWith("Planting Depth:")) { icon = "📏"; label = "Planting Depth"; value = line.replace("Planting Depth:", "").trim(); }
                else if (line.startsWith("Spacing:")) { icon = "↔️"; label = "Spacing"; value = line.replace("Spacing:", "").trim(); }
                else if (line.startsWith("Row Spacing:")) { icon = "↕️"; label = "Row Spacing"; value = line.replace("Row Spacing:", "").trim(); }
                else if (line.startsWith("Height:")) { icon = "📐"; label = "Height"; value = line.replace("Height:", "").trim(); }
                else if (line.startsWith("Spread:")) { icon = "🌿"; label = "Spread"; value = line.replace("Spread:", "").trim(); }
                else if (line.startsWith("Germination:")) { icon = "🌱"; label = "Germination"; value = line.replace("Germination:", "").trim(); }
                else if (line.startsWith("Sowing:")) { icon = "🌰"; label = "Sowing"; value = line.replace("Sowing:", "").trim(); }
                else if (line.startsWith("Transplant:")) { icon = "🔄"; label = "Transplanting"; value = line.replace("Transplant:", "").trim(); }
                else if (line.startsWith("Harvest:")) { icon = "🥬"; label = "Harvest"; value = line.replace("Harvest:", "").trim(); }
                else if (line.startsWith("Tips:")) { icon = "💡"; label = "Growing Tips"; value = line.replace("Tips:", "").trim(); }
                else if (line.startsWith("Seeds:")) { icon = "🔢"; label = "Seeds in Packet"; value = line.replace("Seeds:", "").trim(); }
                else { label = ""; value = line; }

                return (
                  <div key={idx} className={label ? "flex items-start gap-3" : "text-slate-300 text-sm"}>
                    {label ? (
                      <>
                        <span className="text-xl flex-shrink-0">{icon}</span>
                        <div>
                          <div className="text-slate-400 text-xs">{label}</div>
                          <div className="text-slate-200">{value}</div>
                        </div>
                      </>
                    ) : (
                      <div className="text-slate-300">{value}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Stage Progress */}
      <section className="bg-slate-800 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3">Growth Stage</h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {stages.map((stage) => (
            <button
              key={stage}
              onClick={() => handleStageChange(stage)}
              disabled={updating}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                plant.current_stage === stage
                  ? "bg-green-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {stageLabels[stage]}
            </button>
          ))}
        </div>
      </section>

      {/* Category */}
      <section className="bg-slate-800 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3">Category</h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => handleCategoryChange(cat.value)}
              disabled={updating}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                (plant.category || "") === cat.value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Details */}
      <section className="bg-slate-800 rounded-lg p-5 mb-6">
        <h3 className="font-semibold mb-4 text-lg">Details</h3>
        <dl className="divide-y divide-slate-700">
          {plant.date_planted && (
            <div className="flex justify-between py-3">
              <dt className="text-slate-400">Date Added</dt>
              <dd>{new Date(plant.date_planted).toLocaleDateString()}</dd>
            </div>
          )}
          <div className="flex justify-between items-center py-3">
            <dt className="text-slate-400">Germination Time</dt>
            <dd>
              {editingGermination ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={germinationInput}
                    onChange={(e) => setGerminationInput(e.target.value)}
                    className="w-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-center"
                    placeholder="days"
                    autoFocus
                  />
                  <button
                    onClick={handleGerminationSave}
                    disabled={updating}
                    className="text-green-400 hover:text-green-300 px-3 py-2 bg-slate-700 rounded-lg"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingGermination(false)}
                    className="text-slate-400 hover:text-slate-300 px-2 py-2"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setGerminationInput(plant.germination_days?.toString() || "");
                    setEditingGermination(true);
                  }}
                  className="text-slate-200 hover:text-green-400 transition-colors"
                >
                  {plant.germination_days ? `${plant.germination_days} days` : "Set..."}
                </button>
              )}
            </dd>
          </div>
          <div className="flex justify-between items-center py-3">
            <dt className="text-slate-400">Planting Depth</dt>
            <dd>
              {editingDepth ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={depthInput}
                    onChange={(e) => setDepthInput(e.target.value)}
                    className="w-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-center"
                    placeholder="in"
                    autoFocus
                  />
                  <button
                    onClick={handleDepthSave}
                    disabled={updating}
                    className="text-green-400 hover:text-green-300 px-3 py-2 bg-slate-700 rounded-lg"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingDepth(false)}
                    className="text-slate-400 hover:text-slate-300 px-2 py-2"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setDepthInput(plant.planting_depth_inches?.toString() || "");
                    setEditingDepth(true);
                  }}
                  className="text-slate-200 hover:text-green-400 transition-colors"
                >
                  {plant.planting_depth_inches ? `${plant.planting_depth_inches}"` : "Set..."}
                </button>
              )}
            </dd>
          </div>
          <div className="flex justify-between items-center py-3">
            <dt className="text-slate-400">Spacing</dt>
            <dd>
              {editingSpacing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={spacingInput}
                    onChange={(e) => setSpacingInput(e.target.value)}
                    className="w-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-center"
                    placeholder="in"
                    autoFocus
                  />
                  <button
                    onClick={handleSpacingSave}
                    disabled={updating}
                    className="text-green-400 hover:text-green-300 px-3 py-2 bg-slate-700 rounded-lg"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingSpacing(false)}
                    className="text-slate-400 hover:text-slate-300 px-2 py-2"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setSpacingInput(plant.spacing_inches?.toString() || "");
                    setEditingSpacing(true);
                  }}
                  className="text-slate-200 hover:text-green-400 transition-colors"
                >
                  {plant.spacing_inches ? `${plant.spacing_inches}"` : "Set..."}
                </button>
              )}
            </dd>
          </div>
          <div className="flex justify-between items-center py-3">
            <dt className="text-slate-400">Height</dt>
            <dd>
              {editingHeight ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={heightInput}
                    onChange={(e) => setHeightInput(e.target.value)}
                    className="w-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-center"
                    placeholder="in"
                    autoFocus
                  />
                  <button
                    onClick={handleHeightSave}
                    disabled={updating}
                    className="text-green-400 hover:text-green-300 px-3 py-2 bg-slate-700 rounded-lg"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingHeight(false)}
                    className="text-slate-400 hover:text-slate-300 px-2 py-2"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setHeightInput(plant.height_inches?.toString() || "");
                    setEditingHeight(true);
                  }}
                  className="text-slate-200 hover:text-green-400 transition-colors"
                >
                  {plant.height_inches ? `${plant.height_inches}"` : "Set..."}
                </button>
              )}
            </dd>
          </div>
          {plant.days_to_maturity && (
            <div className="flex justify-between py-3">
              <dt className="text-slate-400">Days to Maturity</dt>
              <dd>{plant.days_to_maturity} days</dd>
            </div>
          )}
          {harvestDate && (
            <div className="flex justify-between py-3">
              <dt className="text-slate-400">Est. Harvest Date</dt>
              <dd className="text-green-400">
                {harvestDate.toLocaleDateString()}
              </dd>
            </div>
          )}
          {daysRemaining !== null && (
            <div className="flex justify-between py-3">
              <dt className="text-slate-400">Days Remaining</dt>
              <dd
                className={
                  daysRemaining <= 7 ? "text-orange-400 font-semibold" : "text-slate-200"
                }
              >
                {daysRemaining > 0 ? `${daysRemaining} days` : "Ready!"}
              </dd>
            </div>
          )}
        </dl>
      </section>


      {/* Actions */}
      <section className="grid grid-cols-2 gap-4 mb-6">
        <Link
          href={`/doctor?plant=${plant.id}`}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-center transition-colors"
        >
          <span className="text-xl block mb-1">🩺</span>
          AI Doctor
        </Link>
        <Link
          href={`/plants/${plant.id}/journal/new`}
          className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg text-center transition-colors"
        >
          <span className="text-xl block mb-1">📝</span>
          Add Journal Entry
        </Link>
      </section>

      {/* Journal */}
      <section>
        <h3 className="font-semibold mb-3">Journal History</h3>
        {journal.length === 0 ? (
          <div className="bg-slate-800 rounded-lg p-4 text-center text-slate-400">
            No journal entries yet
          </div>
        ) : (
          <div className="space-y-3">
            {journal.map((entry) => (
              <div key={entry.id} className="bg-slate-800 rounded-lg overflow-hidden">
                {entry.photo_url && (
                  <img
                    src={entry.photo_url}
                    alt="Journal entry photo"
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-slate-400">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                    {entry.ai_diagnosis && (
                      <span className="text-xs bg-blue-600 px-2 py-0.5 rounded">
                        AI Analyzed
                      </span>
                    )}
                  </div>
                  {entry.notes && <p className="text-sm">{entry.notes}</p>}
                  {entry.ai_diagnosis && (
                    <div className="mt-2 p-2 bg-slate-700 rounded text-xs">
                      <strong>Diagnosis:</strong>{" "}
                      {(entry.ai_diagnosis as { diagnosis?: string }).diagnosis ||
                        "N/A"}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
