"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { usePlantStore } from "@/store/plantStore";
import { supabase } from "@/lib/supabase/client";

interface Diagnosis {
  diagnosis: string;
  confidence_score: number;
  issues_found: string[];
  suggested_treatment: string;
  plant_health: string;
  additional_notes?: string;
}

function DoctorContent() {
  const searchParams = useSearchParams();
  const plantIdParam = searchParams.get("plant");
  const { user } = useAuthStore();
  const { plants, setPlants } = usePlantStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedPlantId, setSelectedPlantId] = useState<string>(plantIdParam || "");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    const loadPlants = async () => {
      const { data } = await (supabase as any).from("plants").select("*").eq("user_id", user.id);
      if (data) setPlants(data);
    };
    loadPlants();
  }, [user, setPlants]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => setImagePreview(event.target?.result as string);
    reader.readAsDataURL(file);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxWidth = 1024;
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
      setImageBase64(base64);
    };
    img.src = URL.createObjectURL(file);
    setDiagnosis(null);
    setError("");
  };

  const handleAnalyze = async () => {
    if (!imageBase64) { setError("Please select an image first"); return; }
    setAnalyzing(true);
    setError("");
    setDiagnosis(null);

    try {
      const response = await fetch("/api/analyze-plant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed");
      setDiagnosis(data);

      if (selectedPlantId && user) {
        await (supabase as any).from("journal_entries").insert({
          plant_id: selectedPlantId,
          ai_diagnosis: data,
          notes: `AI Analysis: ${data.diagnosis}`,
        });
      }
    } catch (err: any) {
      setError(err.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const getHealthColor = (health: string) => {
    const colors: any = { healthy: "bg-green-600", minor_issues: "bg-yellow-600", moderate_issues: "bg-orange-600", severe_issues: "bg-red-600" };
    return colors[health] || "bg-slate-600";
  };

  if (!user) return <div className="p-4 text-center text-slate-400">Please sign in to use the AI Doctor.</div>;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">AI Plant Doctor</h2>
      <p className="text-slate-400 text-sm mb-6">Upload a photo of your plant to diagnose diseases, pests, or nutrient deficiencies.</p>

      {plants.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Link to Plant (Optional)</label>
          <select value={selectedPlantId} onChange={(e) => setSelectedPlantId(e.target.value)} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg">
            <option value="">-- No plant selected --</option>
            {plants.map((plant: any) => <option key={plant.id} value={plant.id}>{plant.name}</option>)}
          </select>
        </div>
      )}

      <div className="mb-6">
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
        {imagePreview ? (
          <div className="relative">
            <img src={imagePreview} alt="Plant to analyze" className="w-full rounded-lg max-h-80 object-cover" />
            <button onClick={() => { setImagePreview(null); setImageBase64(null); setDiagnosis(null); }} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full text-xl">✕</button>
          </div>
        ) : (
          <button onClick={() => fileInputRef.current?.click()} className="w-full h-48 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center hover:border-green-500">
            <span className="text-4xl mb-2">📷</span>
            <span className="text-slate-400">Tap to take photo or upload image</span>
          </button>
        )}
      </div>

      <button onClick={handleAnalyze} disabled={!imageBase64 || analyzing} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white py-3 rounded-lg font-medium mb-6">
        {analyzing ? "Analyzing..." : "Analyze Plant"}
      </button>

      {error && <div className="text-red-400 bg-red-400/10 p-4 rounded-lg mb-6">{error}</div>}

      {diagnosis && (
        <div className="bg-slate-800 rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-lg">Diagnosis Results</h3>
            <span className={`text-xs px-2 py-1 rounded-full ${getHealthColor(diagnosis.plant_health)}`}>{diagnosis.plant_health.replace("_", " ")}</span>
          </div>
          <div><h4 className="text-sm text-slate-400 mb-1">Assessment</h4><p>{diagnosis.diagnosis}</p></div>
          <div><h4 className="text-sm text-slate-400 mb-1">Confidence: {Math.round(diagnosis.confidence_score * 100)}%</h4></div>
          {diagnosis.issues_found.length > 0 && (
            <div><h4 className="text-sm text-slate-400 mb-1">Issues Found</h4><ul className="list-disc list-inside text-sm">{diagnosis.issues_found.map((issue, i) => <li key={i}>{issue}</li>)}</ul></div>
          )}
          <div><h4 className="text-sm text-slate-400 mb-1">Recommended Treatment</h4><p className="text-sm">{diagnosis.suggested_treatment}</p></div>
        </div>
      )}
    </div>
  );
}

export default function DoctorPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-slate-400">Loading...</div>}>
      <DoctorContent />
    </Suspense>
  );
}
