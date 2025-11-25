"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase/client";
import type { Plant, Contact } from "@/lib/supabase/types";

interface PlantSummary {
  name: string;
  species: string | null;
  count: number;
  stages: {
    seed: number;
    seedling: number;
    vegetative: number;
  };
  contacts: { name: string; count: number }[];
}

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"count" | "name">("count");

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);

      // Load all plants
      const { data: plantsData } = await supabase
        .from("plants")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (plantsData) {
        setPlants(plantsData);
      }

      // Load contacts
      const { data: contactsData } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id);

      if (contactsData) {
        setContacts(contactsData);
      }

      setLoading(false);
    };

    loadData();
  }, [user]);

  // Generate plant summaries
  const plantSummaries: PlantSummary[] = (() => {
    const summaryMap = new Map<string, PlantSummary>();

    plants.forEach((plant) => {
      // Extract base name (remove #N suffix if present)
      const baseName = plant.name.replace(/\s*#\d+$/, "").trim();
      const key = `${baseName}|${plant.species || ""}`;

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          name: baseName,
          species: plant.species,
          count: 0,
          stages: { seed: 0, seedling: 0, vegetative: 0 },
          contacts: [],
        });
      }

      const summary = summaryMap.get(key)!;
      summary.count++;
      summary.stages[plant.current_stage]++;

      // Track contacts
      if (plant.contact_id) {
        const contact = contacts.find((c) => c.id === plant.contact_id);
        if (contact) {
          const existingContact = summary.contacts.find((c) => c.name === contact.name);
          if (existingContact) {
            existingContact.count++;
          } else {
            summary.contacts.push({ name: contact.name, count: 1 });
          }
        }
      }
    });

    const summaries = Array.from(summaryMap.values());

    // Sort summaries
    if (sortBy === "count") {
      summaries.sort((a, b) => b.count - a.count);
    } else {
      summaries.sort((a, b) => a.name.localeCompare(b.name));
    }

    return summaries;
  })();

  // Calculate totals
  const totalPlants = plants.length;
  const totalTypes = plantSummaries.length;
  const totalByStage = plants.reduce(
    (acc, plant) => {
      acc[plant.current_stage]++;
      return acc;
    },
    { seed: 0, seedling: 0, vegetative: 0 }
  );
  const plantsWithContacts = plants.filter((p) => p.contact_id).length;

  if (loading) {
    return (
      <div className="p-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-4 animate-spin">📊</div>
        <p className="text-slate-400 text-lg">Loading reports...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">🔒</div>
        <p className="text-slate-400 text-lg">Please sign in to view reports</p>
        <Link href="/auth" className="mt-4 text-green-400 hover:text-green-300">
          Sign In →
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-green-400 mb-3 transition-colors"
        >
          <span>←</span> Back to Dashboard
        </Link>
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <span className="text-3xl">📊</span> Plant Reports
        </h2>
        <p className="text-slate-400 mt-1">Overview of your garden statistics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-5 text-center shadow-lg">
          <span className="text-3xl">🌱</span>
          <div className="text-3xl font-bold mt-2">{totalPlants}</div>
          <div className="text-sm text-white/80 font-medium">Total Plants</div>
        </div>
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-5 text-center shadow-lg">
          <span className="text-3xl">🏷️</span>
          <div className="text-3xl font-bold mt-2">{totalTypes}</div>
          <div className="text-sm text-white/80 font-medium">Plant Types</div>
        </div>
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-center shadow-lg">
          <span className="text-3xl">👥</span>
          <div className="text-3xl font-bold mt-2">{contacts.length}</div>
          <div className="text-sm text-white/80 font-medium">Contacts</div>
        </div>
        <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl p-5 text-center shadow-lg">
          <span className="text-3xl">🎁</span>
          <div className="text-3xl font-bold mt-2">{plantsWithContacts}</div>
          <div className="text-sm text-white/80 font-medium">Assigned</div>
        </div>
      </div>

      {/* Stage Breakdown */}
      <section className="bg-slate-800/80 rounded-2xl p-5 mb-6 border border-slate-700/50">
        <h3 className="font-bold mb-4 flex items-center gap-2 text-lg">
          <span className="text-xl">📈</span> Growth Stage Breakdown
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-amber-900/30 rounded-xl p-4 text-center border border-amber-600/30">
            <span className="text-3xl">🌰</span>
            <div className="text-2xl font-bold mt-2 text-amber-300">{totalByStage.seed}</div>
            <div className="text-sm text-amber-400/80">Seeds</div>
          </div>
          <div className="bg-lime-900/30 rounded-xl p-4 text-center border border-lime-600/30">
            <span className="text-3xl">🌱</span>
            <div className="text-2xl font-bold mt-2 text-lime-300">{totalByStage.seedling}</div>
            <div className="text-sm text-lime-400/80">Seedlings</div>
          </div>
          <div className="bg-green-900/30 rounded-xl p-4 text-center border border-green-600/30">
            <span className="text-3xl">🌿</span>
            <div className="text-2xl font-bold mt-2 text-green-300">{totalByStage.vegetative}</div>
            <div className="text-sm text-green-400/80">Vegetative</div>
          </div>
        </div>
      </section>

      {/* Plants By Type */}
      <section className="bg-slate-800/80 rounded-2xl p-5 mb-6 border border-slate-700/50">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold flex items-center gap-2 text-lg">
            <span className="text-xl">🌿</span> Plants by Type
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy("count")}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                sortBy === "count"
                  ? "bg-green-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              By Count
            </button>
            <button
              onClick={() => setSortBy("name")}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                sortBy === "name"
                  ? "bg-green-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              By Name
            </button>
          </div>
        </div>

        {plantSummaries.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🌱</div>
            <p className="text-slate-400">No plants yet. Add some to see your reports!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {plantSummaries.map((summary, idx) => (
              <div
                key={`${summary.name}-${summary.species}-${idx}`}
                className="bg-slate-700/50 rounded-xl p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-lg">{summary.name}</h4>
                    {summary.species && (
                      <p className="text-slate-400 text-sm">{summary.species}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-400">{summary.count}</div>
                    <div className="text-xs text-slate-400">plant{summary.count !== 1 ? "s" : ""}</div>
                  </div>
                </div>

                {/* Stage breakdown bar */}
                <div className="flex h-3 rounded-full overflow-hidden mb-3 bg-slate-800">
                  {summary.stages.seed > 0 && (
                    <div
                      className="bg-amber-500"
                      style={{ width: `${(summary.stages.seed / summary.count) * 100}%` }}
                      title={`${summary.stages.seed} seeds`}
                    />
                  )}
                  {summary.stages.seedling > 0 && (
                    <div
                      className="bg-lime-500"
                      style={{ width: `${(summary.stages.seedling / summary.count) * 100}%` }}
                      title={`${summary.stages.seedling} seedlings`}
                    />
                  )}
                  {summary.stages.vegetative > 0 && (
                    <div
                      className="bg-green-500"
                      style={{ width: `${(summary.stages.vegetative / summary.count) * 100}%` }}
                      title={`${summary.stages.vegetative} vegetative`}
                    />
                  )}
                </div>

                <div className="flex gap-4 text-sm">
                  <span className="text-amber-400">🌰 {summary.stages.seed}</span>
                  <span className="text-lime-400">🌱 {summary.stages.seedling}</span>
                  <span className="text-green-400">🌿 {summary.stages.vegetative}</span>
                </div>

                {/* Contact assignments */}
                {summary.contacts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-600">
                    <span className="text-sm text-slate-400">Going to: </span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {summary.contacts.map((contact) => (
                        <span
                          key={contact.name}
                          className="bg-purple-600/30 text-purple-300 px-2 py-1 rounded-full text-xs"
                        >
                          👤 {contact.name} ({contact.count})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Contact Distribution */}
      {contacts.length > 0 && (
        <section className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700/50">
          <h3 className="font-bold mb-4 flex items-center gap-2 text-lg">
            <span className="text-xl">👥</span> Plants by Contact
          </h3>
          <div className="space-y-3">
            {contacts.map((contact) => {
              const assignedPlants = plants.filter((p) => p.contact_id === contact.id);
              return (
                <div
                  key={contact.id}
                  className="bg-slate-700/50 rounded-xl p-4 flex justify-between items-center"
                >
                  <div>
                    <h4 className="font-bold">{contact.name}</h4>
                    {contact.phone && (
                      <p className="text-slate-400 text-sm">{contact.phone}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-400">
                      {assignedPlants.length}
                    </div>
                    <div className="text-xs text-slate-400">
                      plant{assignedPlants.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Unassigned plants */}
            <div className="bg-slate-700/50 rounded-xl p-4 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-400">Unassigned</h4>
                <p className="text-slate-500 text-sm">No contact assigned</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-400">
                  {totalPlants - plantsWithContacts}
                </div>
                <div className="text-xs text-slate-500">
                  plant{totalPlants - plantsWithContacts !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
