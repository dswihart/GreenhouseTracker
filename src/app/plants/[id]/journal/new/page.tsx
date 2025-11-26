"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase/client";
import type { Plant } from "@/lib/supabase/types";

export default function NewJournalEntryPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");

  const plantId = params.id as string;

  useEffect(() => {
    if (!user || !plantId) return;

    const loadPlant = async () => {
      const { data } = await supabase
        .from("plants")
        .select("*")
        .eq("id", plantId)
        .eq("user_id", user.id)
        .single();

      if (data) {
        setPlant(data);
      }
      setLoading(false);
    };

    loadPlant();
  }, [user, plantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !plant) return;

    if (!notes.trim()) {
      setError("Please enter some notes");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const { error: insertError } = await supabase
        .from("journal_entries")
        .insert({
          plant_id: plant.id,
          notes: notes.trim(),
        });

      if (insertError) throw insertError;

      router.push(`/plants/${plant.id}`);
    } catch (err) {
      console.error("Error creating journal entry:", err);
      setError(err instanceof Error ? err.message : "Failed to add journal entry");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-slate-400">Loading...</div>
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

  return (
    <div className="p-4 max-w-lg mx-auto">
      <Link
        href={`/plants/${plant.id}`}
        className="text-slate-400 hover:text-slate-300 text-sm mb-4 inline-block"
      >
        &larr; Back to {plant.name}
      </Link>

      <h2 className="text-2xl font-bold mb-6">Add Journal Entry</h2>
      <p className="text-slate-400 mb-6">for {plant.name}</p>

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-600/50 rounded-xl text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="notes" className="block text-lg font-medium mb-2">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            className="w-full px-4 py-4 bg-slate-800 border-2 border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg resize-none"
            placeholder="How is your plant doing today? Any observations, measurements, or changes?"
            autoFocus
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-xl font-bold text-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-purple-800 disabled:to-indigo-800 text-white py-4 rounded-xl font-bold text-lg transition-colors shadow-lg shadow-purple-900/30"
          >
            {submitting ? "Saving..." : "Save Entry"}
          </button>
        </div>
      </form>

      <div className="mt-8 p-4 bg-blue-900/20 border border-blue-600/30 rounded-xl">
        <p className="text-blue-300 text-sm">
          <span className="font-bold">Tip:</span> Use the AI Doctor feature from the plant detail page to get health diagnoses with photo analysis.
        </p>
      </div>
    </div>
  );
}
