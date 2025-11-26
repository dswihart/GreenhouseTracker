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
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanSuccess, setScanSuccess] = useState("");
  const [manualBarcode, setManualBarcode] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [growingInfo, setGrowingInfo] = useState<{
    description?: string | null;
    plantingDepth?: string | null;
    spacing?: string | null;
    sunRequirements?: string | null;
    wateringNeeds?: string | null;
    harvestInfo?: string | null;
    growingTips?: string | null;
    imageUrl?: string | null;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    species: "",
    description: "",
    photo_url: "",
    category: "",
    days_to_maturity: "",
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

      {/* Barcode Scanner Button - Large and Prominent */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setScanning(true)}
          disabled={lookupLoading}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-purple-800 disabled:to-indigo-800 text-white p-6 rounded-2xl font-bold text-xl shadow-lg shadow-purple-900/30 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-4"
        >
          {lookupLoading ? (
            <>
              <span className="text-3xl animate-spin">⏳</span>
              <span>Looking up product...</span>
            </>
          ) : (
            <>
              <span className="text-4xl">📷</span>
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

      {/* Manual Barcode Entry */}
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
            disabled={lookupLoading}
          />
          <button
            type="submit"
            disabled={lookupLoading || !manualBarcode.trim()}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white rounded-xl font-bold transition-colors"
          >
            🔍 Lookup
          </button>
        </div>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-slate-700"></div>
        <span className="text-slate-500 font-medium">plant details</span>
        <div className="flex-1 h-px bg-slate-700"></div>
      </div>

      {/* Success Message */}
      {scanSuccess && (
        <div className="mb-6 p-4 bg-green-900/30 border border-green-600/50 rounded-xl text-green-300 flex items-center gap-3">
          <span className="text-2xl">✅</span>
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
          {/* Description */}
          {growingInfo.description && (
            <div className="mb-4 p-3 bg-slate-800/50 rounded-xl">
              <p className="text-slate-200">{growingInfo.description}</p>
            </div>
          )}
          <h3 className="text-lg font-bold text-emerald-300 mb-4 flex items-center gap-2">
            <span className="text-2xl">🌱</span>
            Growing Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {growingInfo.sunRequirements && (
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                <span className="text-2xl">☀️</span>
                <div>
                  <div className="text-sm text-slate-400">Sun</div>
                  <div className="text-white font-medium">{growingInfo.sunRequirements}</div>
                </div>
              </div>
            )}
            {growingInfo.wateringNeeds && (
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                <span className="text-2xl">💧</span>
                <div>
                  <div className="text-sm text-slate-400">Water</div>
                  <div className="text-white font-medium">{growingInfo.wateringNeeds}</div>
                </div>
              </div>
            )}
            {growingInfo.plantingDepth && (
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                <span className="text-2xl">📏</span>
                <div>
                  <div className="text-sm text-slate-400">Planting Depth</div>
                  <div className="text-white font-medium">{growingInfo.plantingDepth}</div>
                </div>
              </div>
            )}
            {growingInfo.spacing && (
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                <span className="text-2xl">↔️</span>
                <div>
                  <div className="text-sm text-slate-400">Spacing</div>
                  <div className="text-white font-medium">{growingInfo.spacing}</div>
                </div>
              </div>
            )}
            {growingInfo.harvestInfo && (
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl col-span-full">
                <span className="text-2xl">🥬</span>
                <div>
                  <div className="text-sm text-slate-400">Harvest</div>
                  <div className="text-white font-medium">{growingInfo.harvestInfo}</div>
                </div>
              </div>
            )}
            {growingInfo.growingTips && (
              <div className="flex items-start gap-3 p-3 bg-amber-900/30 border border-amber-600/30 rounded-xl col-span-full">
                <span className="text-2xl">💡</span>
                <div>
                  <div className="text-sm text-amber-400">Growing Tips</div>
                  <div className="text-amber-100">{growingInfo.growingTips}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-600/50 rounded-xl text-red-300 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
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
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-14 h-14 bg-slate-700 hover:bg-slate-600 text-white text-2xl rounded-xl font-bold transition-colors"
            >
              -
            </button>
            <input
              id="quantity"
              type="number"
              min="1"
              max="50"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
              className="w-24 px-4 py-4 bg-slate-800 border-2 border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg text-center font-bold"
            />
            <button
              type="button"
              onClick={() => setQuantity(Math.min(50, quantity + 1))}
              className="w-14 h-14 bg-slate-700 hover:bg-slate-600 text-white text-2xl rounded-xl font-bold transition-colors"
            >
              +
            </button>
            <span className="text-slate-400 text-sm flex-1">
              {quantity > 1 && `Creates ${quantity} individual plants`}
            </span>
          </div>
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
