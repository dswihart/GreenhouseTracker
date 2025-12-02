"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { usePlantStore } from "@/store/plantStore";
import { supabase } from "@/lib/supabase/client";
import type { PlantStage } from "@/lib/supabase/types";
import { BarcodeScanner } from "@/components/BarcodeScanner";

const stages: { value: PlantStage; label: string }[] = [
  { value: "seed", label: "Seed" },
  { value: "seedling", label: "Seedling" },
  { value: "vegetative", label: "Vegetative" },
  { value: "flowering", label: "Flowering" },
  { value: "harvest_ready", label: "Harvest Ready" },
];

const categories = [
  { value: "", label: "Select a category..." },
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

export default function NewPlantPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addPlants } = usePlantStore();
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [inputTab, setInputTab] = useState<"barcode" | "url" | "manual">("barcode");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [urlLookupLoading, setUrlLookupLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanSuccess, setScanSuccess] = useState("");
  const [manualBarcode, setManualBarcode] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [growingInfo, setGrowingInfo] = useState<{
    description?: string | null;
    plantingDepth?: string | null;
    spacing?: string | null;
    rowSpacing?: string | null;
    sunRequirements?: string | null;
    wateringNeeds?: string | null;
    soilRequirements?: string | null;
    sowingInstructions?: string | null;
    transplantInfo?: string | null;
    harvestInfo?: string | null;
    height?: string | null;
    spread?: string | null;
    growingTips?: string | null;
    daysToGermination?: string | null;
    seedCount?: string | null;
    isHybrid?: boolean | null;
    isHeirloom?: boolean | null;
    isOrganic?: boolean | null;
    resistances?: string | null;
    imageUrl?: string | null;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    species: "",
    description: "",
    photo_url: "",
    category: "",
    days_to_maturity: "",
    germination_days: "",
    height_inches: "",
    spacing_inches: "",
    planting_depth_inches: "",
    current_stage: "seed" as PlantStage,
  });

  const handleBarcodeLookup = async (barcode: string) => {
    if (!barcode.trim()) return;

    setLookupLoading(true);
    setError("");
    setScanSuccess("");
    setGrowingInfo(null);

    try {
      const response = await fetch(`/api/barcode-lookup?code=${encodeURIComponent(barcode.trim())}`);
      const data = await response.json();

      if (data.found) {
        setFormData((prev) => ({
          ...prev,
          name: data.name || prev.name,
          species: data.species || prev.species,
          description: data.description || prev.description,
          photo_url: data.imageUrl || prev.photo_url,
          days_to_maturity: data.daysToMaturity?.toString() || prev.days_to_maturity,
        }));

        // Store growing information if available
        if (data.description || data.plantingDepth || data.spacing || data.sunRequirements || data.wateringNeeds || data.harvestInfo || data.growingTips || data.imageUrl) {
          setGrowingInfo({
            description: data.description,
            plantingDepth: data.plantingDepth,
            spacing: data.spacing,
            sunRequirements: data.sunRequirements,
            wateringNeeds: data.wateringNeeds,
            harvestInfo: data.harvestInfo,
            growingTips: data.growingTips,
            imageUrl: data.imageUrl,
          });
        }

        const source = data.source ? ` (from ${data.source})` : "";
        setScanSuccess(`Found: ${data.name || "Product"}${source} - Details filled in below!`);
        setManualBarcode("");
      } else {
        setError(`Barcode ${barcode} not found in database. Please enter details manually.`);
      }
    } catch (err) {
      setError("Failed to lookup barcode. Please enter details manually.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setUrlLookupLoading(true);
    setError("");
    setScanSuccess("");
    setGrowingInfo(null);

    try {
      const response = await fetch(`/api/url-import?url=${encodeURIComponent(urlInput.trim())}`);
      const data = await response.json();

      if (data.found) {
        // Parse numeric values from strings like "12 inches" or "1/4 inch"
        const parseInches = (str: string | null | undefined): string => {
          if (!str) return "";
          const match = str.match(/([\d.]+)/);
          return match ? match[1] : "";
        };

        setFormData((prev) => ({
          ...prev,
          name: data.name || prev.name,
          species: data.species || data.variety || prev.species,
          description: data.description || prev.description,
          photo_url: data.imageUrl || prev.photo_url,
          category: data.category || prev.category,
          days_to_maturity: data.daysToMaturity?.toString() || prev.days_to_maturity,
          germination_days: data.daysToGermination ? parseInches(data.daysToGermination) : prev.germination_days,
          height_inches: parseInches(data.height) || prev.height_inches,
          spacing_inches: parseInches(data.spacing) || prev.spacing_inches,
          planting_depth_inches: parseInches(data.plantingDepth) || prev.planting_depth_inches,
        }));

        // Store ALL growing information
        setGrowingInfo({
          description: data.description,
          plantingDepth: data.plantingDepth,
          spacing: data.spacing,
          rowSpacing: data.rowSpacing,
          sunRequirements: data.sunRequirements,
          wateringNeeds: data.wateringNeeds,
          soilRequirements: data.soilRequirements,
          sowingInstructions: data.sowingInstructions,
          transplantInfo: data.transplantInfo,
          harvestInfo: data.harvestInfo,
          height: data.height,
          spread: data.spread,
          growingTips: data.growingTips,
          daysToGermination: data.daysToGermination,
          seedCount: data.seedCount,
          isHybrid: data.isHybrid,
          isHeirloom: data.isHeirloom,
          isOrganic: data.isOrganic,
          resistances: data.resistances,
          imageUrl: data.imageUrl,
        });

        setScanSuccess(`Imported: ${data.name || "Plant"} from ${data.source} - Details filled in below!`);
        setUrlInput("");
      } else {
        setError(data.error || "Could not extract plant details from this URL. Please enter details manually.");
      }
    } catch (err) {
      setError("Failed to import from URL. Please check the URL and try again.");
    } finally {
      setUrlLookupLoading(false);
    }
  };

  const handleBarcodeScan = async (barcode: string) => {
    setScanning(false);
    await handleBarcodeLookup(barcode);
  };

  const handleManualBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleBarcodeLookup(manualBarcode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      // Create array of plants to insert
      const plantsToInsert = Array.from({ length: quantity }, (_, i) => ({
        user_id: user.id,
        name: quantity > 1 ? `${formData.name} #${i + 1}` : formData.name,
        species: formData.species || null,
        description: formData.description || null,
        photo_url: formData.photo_url || null,
        category: formData.category || null,
        days_to_maturity: formData.days_to_maturity
          ? parseInt(formData.days_to_maturity)
          : null,
        current_stage: formData.current_stage,
      }));

      const { data, error: insertError } = await supabase
        .from("plants")
        .insert(plantsToInsert)
        .select();

      if (insertError) throw insertError;

      if (data) {
        // Add all plants to store at once to avoid multiple re-renders
        addPlants(data);
        router.push("/plants");
      }
    } catch (err) {
      console.error("Error creating plants:", err);
      setError(err instanceof Error ? err.message : "Failed to add plant");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-400">Please sign in to add plants.</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6">Add New Plant</h2>

      {/* Input Method Tabs */}
      <div className="mb-4">
        <div className="flex gap-2 bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setInputTab("barcode")}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              inputTab === "barcode"
                ? "bg-purple-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-700"
            }`}
          >
            <span>&#128247;</span>
            <span>Barcode</span>
          </button>
          <button
            type="button"
            onClick={() => setInputTab("url")}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              inputTab === "url"
                ? "bg-cyan-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-700"
            }`}
          >
            <span>&#128279;</span>
            <span>URL</span>
          </button>
          <button
            type="button"
            onClick={() => setInputTab("manual")}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              inputTab === "manual"
                ? "bg-green-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-700"
            }`}
          >
            <span>&#9997;</span>
            <span>Manual</span>
          </button>
        </div>
      </div>

      {/* Barcode Scanner Section */}
      {inputTab === "barcode" && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setScanning(true)}
            disabled={lookupLoading || urlLookupLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-purple-800 disabled:to-indigo-800 text-white p-6 rounded-2xl font-bold text-xl shadow-lg shadow-purple-900/30 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-4"
          >
            {lookupLoading ? (
              <>
                <span className="text-3xl animate-spin">&#8987;</span>
                <span>Looking up product...</span>
              </>
            ) : (
              <>
                <span className="text-4xl">&#128247;</span>
                <div className="text-left">
                  <div>Scan Seed Packet Barcode</div>
                  <div className="text-sm font-normal text-purple-200">
                    Use camera to scan barcode
                  </div>
                </div>
              </>
            )}
          </button>
        </div>
      )}

      {/* URL Import Section */}
      {inputTab === "url" && (
      <div className="mb-4 p-4 bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border border-cyan-600/40 rounded-2xl">
        <form onSubmit={handleUrlImport}>
          <label className="block text-sm font-medium text-cyan-300 mb-2 flex items-center gap-2">
            <span className="text-xl">&#128279;</span>
            Import from Seed Vendor URL
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://www.burpee.com/..."
                className="w-full px-4 py-3 pr-10 bg-slate-800 border-2 border-cyan-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-lg placeholder-slate-500"
                disabled={urlLookupLoading || lookupLoading}
              />
              {urlInput && (
                <button
                  type="button"
                  onClick={() => {
                    setUrlInput("");
                    setGrowingInfo(null);
                    setError("");
                    setScanSuccess("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xl transition-colors"
                  aria-label="Clear URL"
                >
                  &#10005;
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={urlLookupLoading || lookupLoading || !urlInput.trim()}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2"
            >
              {urlLookupLoading ? (
                <>
                  <span className="animate-spin">&#8987;</span>
                  <span>...</span>
                </>
              ) : (
                <>
                  <span>&#128230;</span>
                  <span>Import</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Supports Burpee, Johnny's Seeds, Baker Creek, Seed Savers, Park Seed, and more
          </p>
        </form>
      </div>
      )}

      {/* Manual Barcode Entry */}
      {inputTab === "manual" && (
      <form onSubmit={handleManualBarcodeSubmit} className="mb-8">
        <label className="block text-sm font-medium text-slate-400 mb-2">
          Or type barcode number manually:
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            placeholder="Enter barcode number..."
            className="flex-1 px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg"
            disabled={lookupLoading || urlLookupLoading}
          />
          <button
            type="submit"
            disabled={lookupLoading || urlLookupLoading || !manualBarcode.trim()}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white rounded-xl font-bold transition-colors"
          >
            &#128269; Lookup
          </button>
        </div>
      </form>
      )}

      {/* Divider */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-slate-700"></div>
        <span className="text-slate-500 font-medium">plant details</span>
        <div className="flex-1 h-px bg-slate-700"></div>
      </div>

      {/* Success Message */}
      {scanSuccess && (
        <div className="mb-6 p-4 bg-green-900/30 border border-green-600/50 rounded-xl text-green-300 flex items-center gap-3">
          <span className="text-2xl">&#9989;</span>
          <span>{scanSuccess}</span>
        </div>
      )}

      {/* Growing Information Card */}
      {growingInfo && (
        <div className="mb-6 p-5 bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-emerald-600/40 rounded-2xl">
          {/* Plant Image */}
          {growingInfo.imageUrl && (
            <div className="mb-4 -mt-2 -mx-2">
              <img
                src={growingInfo.imageUrl}
                alt="What this plant looks like when mature"
                className="w-full h-48 object-cover rounded-xl"
              />
              <p className="text-xs text-slate-400 text-center mt-1">Reference: What it looks like when mature</p>
            </div>
          )}

          {/* Variety Tags */}
          {(growingInfo.isHybrid || growingInfo.isHeirloom || growingInfo.isOrganic) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {growingInfo.isHybrid && (
                <span className="px-3 py-1 bg-blue-600/30 border border-blue-500/50 rounded-full text-blue-300 text-sm font-medium">Hybrid (F1)</span>
              )}
              {growingInfo.isHeirloom && (
                <span className="px-3 py-1 bg-amber-600/30 border border-amber-500/50 rounded-full text-amber-300 text-sm font-medium">Heirloom</span>
              )}
              {growingInfo.isOrganic && (
                <span className="px-3 py-1 bg-green-600/30 border border-green-500/50 rounded-full text-green-300 text-sm font-medium">Organic</span>
              )}
            </div>
          )}

          {/* Description */}
          {growingInfo.description && (
            <div className="mb-4 p-3 bg-slate-800/50 rounded-xl">
              <p className="text-slate-200">{growingInfo.description}</p>
            </div>
          )}

          <h3 className="text-lg font-bold text-emerald-300 mb-4 flex items-center gap-2">
            <span className="text-2xl">&#127793;</span>
            Growing Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {growingInfo.sunRequirements && (
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                <span className="text-xl">&#9728;&#65039;</span>
                <div>
                  <div className="text-xs text-slate-400">Sun</div>
                  <div className="text-white font-medium text-sm">{growingInfo.sunRequirements}</div>
                </div>
              </div>
            )}
            {growingInfo.wateringNeeds && (
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                <span className="text-xl">&#128167;</span>
                <div>
                  <div className="text-xs text-slate-400">Water</div>
                  <div className="text-white font-medium text-sm">{growingInfo.wateringNeeds}</div>
                </div>
              </div>
            )}
            {growingInfo.plantingDepth && (
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                <span className="text-xl">&#128207;</span>
                <div>
                  <div className="text-xs text-slate-400">Planting Depth</div>
                  <div className="text-white font-medium text-sm">{growingInfo.plantingDepth}</div>
                </div>
              </div>
            )}
            {growingInfo.spacing && (
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                <span className="text-xl">&#8596;&#65039;</span>
                <div>
                  <div className="text-xs text-slate-400">Plant Spacing</div>
                  <div className="text-white font-medium text-sm">{growingInfo.spacing}</div>
                </div>
              </div>
            )}
            {growingInfo.rowSpacing && (
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                <span className="text-xl">&#8649;</span>
                <div>
                  <div className="text-xs text-slate-400">Row Spacing</div>
                  <div className="text-white font-medium text-sm">{growingInfo.rowSpacing}</div>
                </div>
              </div>
            )}
            {growingInfo.height && (
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                <span className="text-xl">&#8597;&#65039;</span>
                <div>
                  <div className="text-xs text-slate-400">Height</div>
                  <div className="text-white font-medium text-sm">{growingInfo.height}</div>
                </div>
              </div>
            )}
            {growingInfo.spread && (
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                <span className="text-xl">&#10231;</span>
                <div>
                  <div className="text-xs text-slate-400">Spread</div>
                  <div className="text-white font-medium text-sm">{growingInfo.spread}</div>
                </div>
              </div>
            )}
            {growingInfo.daysToGermination && (
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                <span className="text-xl">&#127807;</span>
                <div>
                  <div className="text-xs text-slate-400">Germination</div>
                  <div className="text-white font-medium text-sm">{growingInfo.daysToGermination}</div>
                </div>
              </div>
            )}
            {growingInfo.soilRequirements && (
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                <span className="text-xl">&#129683;</span>
                <div>
                  <div className="text-xs text-slate-400">Soil</div>
                  <div className="text-white font-medium text-sm">{growingInfo.soilRequirements}</div>
                </div>
              </div>
            )}
            {growingInfo.seedCount && (
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                <span className="text-xl">&#128230;</span>
                <div>
                  <div className="text-xs text-slate-400">Seeds in Packet</div>
                  <div className="text-white font-medium text-sm">{growingInfo.seedCount}</div>
                </div>
              </div>
            )}
          </div>

          {/* Full-width info sections */}
          <div className="mt-3 space-y-3">
            {growingInfo.sowingInstructions && (
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                <span className="text-xl">&#128197;</span>
                <div>
                  <div className="text-xs text-slate-400">Sowing Instructions</div>
                  <div className="text-white font-medium text-sm">{growingInfo.sowingInstructions}</div>
                </div>
              </div>
            )}
            {growingInfo.transplantInfo && (
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                <span className="text-xl">&#127794;</span>
                <div>
                  <div className="text-xs text-slate-400">Transplanting</div>
                  <div className="text-white font-medium text-sm">{growingInfo.transplantInfo}</div>
                </div>
              </div>
            )}
            {growingInfo.harvestInfo && (
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                <span className="text-xl">&#129388;</span>
                <div>
                  <div className="text-xs text-slate-400">Harvest</div>
                  <div className="text-white font-medium text-sm">{growingInfo.harvestInfo}</div>
                </div>
              </div>
            )}
            {growingInfo.resistances && (
              <div className="flex items-start gap-3 p-3 bg-green-900/30 border border-green-600/30 rounded-xl">
                <span className="text-xl">&#128170;</span>
                <div>
                  <div className="text-xs text-green-400">Disease Resistance</div>
                  <div className="text-green-100 text-sm">{growingInfo.resistances}</div>
                </div>
              </div>
            )}
            {growingInfo.growingTips && (
              <div className="flex items-start gap-3 p-3 bg-amber-900/30 border border-amber-600/30 rounded-xl">
                <span className="text-xl">&#128161;</span>
                <div>
                  <div className="text-xs text-amber-400">Growing Tips</div>
                  <div className="text-amber-100 text-sm">{growingInfo.growingTips}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-600/50 rounded-xl text-red-300 flex items-center gap-3">
          <span className="text-2xl">&#9888;&#65039;</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-lg font-medium mb-2">
            Plant Name *
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            className="w-full px-4 py-4 bg-slate-800 border-2 border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
            placeholder="e.g., Cherry Tomato #1"
            required
          />
        </div>

        <div>
          <label htmlFor="species" className="block text-lg font-medium mb-2">
            Species / Variety
          </label>
          <input
            id="species"
            type="text"
            value={formData.species}
            onChange={(e) =>
              setFormData({ ...formData, species: e.target.value })
            }
            className="w-full px-4 py-4 bg-slate-800 border-2 border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
            placeholder="e.g., Solanum lycopersicum"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-lg font-medium mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
            className="w-full px-4 py-4 bg-slate-800 border-2 border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg resize-none"
            placeholder="Notes about this plant..."
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-lg font-medium mb-2">
            Category
          </label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            className="w-full px-4 py-4 bg-slate-800 border-2 border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="days_to_maturity"
            className="block text-lg font-medium mb-2"
          >
            Days to Maturity
          </label>
          <input
            id="days_to_maturity"
            type="number"
            min="1"
            value={formData.days_to_maturity}
            onChange={(e) =>
              setFormData({ ...formData, days_to_maturity: e.target.value })
            }
            className="w-full px-4 py-4 bg-slate-800 border-2 border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
            placeholder="e.g., 75"
          />
        </div>

        <div>
          <label
            htmlFor="current_stage"
            className="block text-lg font-medium mb-2"
          >
            Current Stage
          </label>
          <select
            id="current_stage"
            value={formData.current_stage}
            onChange={(e) =>
              setFormData({
                ...formData,
                current_stage: e.target.value as PlantStage,
              })
            }
            className="w-full px-4 py-4 bg-slate-800 border-2 border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
          >
            {stages.map((stage) => (
              <option key={stage.value} value={stage.value}>
                {stage.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="quantity"
            className="block text-lg font-medium mb-2"
          >
            Quantity
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick subtract buttons */}
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 5))}
              className="w-12 h-12 bg-red-900/50 hover:bg-red-800/50 text-red-300 text-lg rounded-xl font-bold transition-colors"
            >
              -5
            </button>
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-12 h-12 bg-slate-700 hover:bg-slate-600 text-white text-xl rounded-xl font-bold transition-colors"
            >
              -1
            </button>
            
            {/* Quantity input */}
            <input
              id="quantity"
              type="number"
              min="1"
              max="100"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
              className="w-20 px-4 py-4 bg-slate-800 border-2 border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg text-center font-bold"
            />
            
            {/* Quick add buttons */}
            <button
              type="button"
              onClick={() => setQuantity(Math.min(100, quantity + 1))}
              className="w-12 h-12 bg-green-700 hover:bg-green-600 text-white text-xl rounded-xl font-bold transition-colors"
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => setQuantity(Math.min(100, quantity + 5))}
              className="w-12 h-12 bg-green-600 hover:bg-green-500 text-white text-lg rounded-xl font-bold transition-colors"
            >
              +5
            </button>
          </div>
          <span className="text-slate-400 text-sm mt-2 block">
            {quantity > 1 && `Creates ${quantity} individual plants`}
          </span>
        </div>

        <div className="flex gap-4 pt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-xl font-bold text-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-green-800 disabled:to-emerald-800 text-white py-4 rounded-xl font-bold text-lg transition-colors shadow-lg shadow-green-900/30"
          >
            {loading ? "Adding..." : quantity > 1 ? `Add ${quantity} Plants` : "Add Plant"}
          </button>
        </div>
      </form>

      {/* Barcode Scanner Modal */}
      {scanning && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setScanning(false)}
        />
      )}
    </div>
  );
}
