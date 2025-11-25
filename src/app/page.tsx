"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { usePlantStore } from "@/store/plantStore";
import { supabase } from "@/lib/supabase/client";
import type { CareSchedule, Profile } from "@/lib/supabase/types";

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuthStore();
  const { plants, setPlants, setLoading } = usePlantStore();
  const [upcomingCare, setUpcomingCare] = useState<CareSchedule[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [inspiration, setInspiration] = useState<string>("");

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);

      // Load plants
      const { data: plantsData } = await supabase
        .from("plants")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (plantsData) {
        setPlants(plantsData);
      }

      // Load care schedules
      const { data: careData } = await supabase
        .from("care_schedules")
        .select("*")
        .lte("next_due", new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString())
        .order("next_due", { ascending: true })
        .limit(5);

      if (careData) {
        setUpcomingCare(careData);
      }

      // Load user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      setLoading(false);
    };

    const loadInspiration = async () => {
      try {
        const response = await fetch("/api/inspiration");
        const data = await response.json();
        if (data.message) {
          setInspiration(data.message);
        }
      } catch (error) {
        // Use fallback if API fails
        setInspiration("Every seed planted is a vote for the future.");
      }
    };

    loadData();
    loadInspiration();
  }, [user, setPlants, setLoading]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="text-6xl mb-4">🌿</div>
          <div className="text-slate-400 text-lg">Loading your garden...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
        {/* Hero Section */}
        <div className="text-center max-w-2xl">
          <div className="text-8xl mb-6 animate-bounce">🌿</div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
            Greenhouse Tracker
          </h1>
          <p className="text-xl text-slate-300 mb-8 leading-relaxed">
            Your personal gardening companion. Track your plants, get AI-powered health diagnostics, and never miss a watering again.
          </p>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <FeatureCard icon="🌱" title="Track Plants" desc="Monitor growth stages" />
            <FeatureCard icon="🩺" title="AI Doctor" desc="Diagnose plant issues" />
            <FeatureCard icon="📅" title="Calendar" desc="Plan your harvests" />
          </div>

          <Link
            href="/auth"
            className="inline-block bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white text-xl px-10 py-4 rounded-2xl font-bold shadow-lg shadow-green-900/30 transition-all transform hover:scale-105"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    );
  }

  const greeting = getGreeting();
  // Check profile first, then user metadata, then fallback
  const firstName = profile?.first_name || user?.user_metadata?.first_name || "Gardener";

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 rounded-2xl p-6 mb-6 border border-green-700/30">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              {greeting}, {firstName}! 👋
            </h2>
            <p className="text-slate-300 text-lg">
              {plants.length === 0
                ? "Ready to start your garden? Add your first plant below!"
                : `You have ${plants.length} plant${plants.length === 1 ? '' : 's'} growing in your garden.`}
            </p>
          </div>
          <Link
            href="/settings"
            className="text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 p-3 rounded-xl transition-colors"
            title="Settings"
          >
            <span className="text-2xl">⚙️</span>
          </Link>
        </div>
      </div>

      {/* Daily Inspiration */}
      {inspiration && (
        <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 rounded-2xl p-5 mb-6 border border-amber-600/30">
          <div className="flex items-start gap-4">
            <span className="text-3xl">✨</span>
            <div>
              <p className="text-amber-100 text-lg italic">&ldquo;{inspiration}&rdquo;</p>
              <p className="text-amber-400/70 text-sm mt-2">Today&apos;s Garden Inspiration</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard
          icon="🌱"
          label="Total Plants"
          value={plants.length}
          color="from-green-600 to-green-700"
        />
        <StatCard
          icon="💧"
          label="Need Water"
          value={upcomingCare.length}
          color="from-blue-600 to-blue-700"
        />
      </div>

      {/* Quick Actions */}
      <section className="mb-8">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="text-2xl">⚡</span> Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <ActionCard
            href="/plants/new"
            icon="➕"
            label="Add Plant"
            color="bg-gradient-to-br from-green-600 to-green-700"
          />
          <ActionCard
            href="/doctor"
            icon="🩺"
            label="AI Doctor"
            color="bg-gradient-to-br from-blue-600 to-blue-700"
          />
          <ActionCard
            href="/zones"
            icon="🗺️"
            label="View Zones"
            color="bg-gradient-to-br from-purple-600 to-purple-700"
          />
          <ActionCard
            href="/reports"
            icon="📊"
            label="Reports"
            color="bg-gradient-to-br from-teal-600 to-teal-700"
          />
        </div>
      </section>

      {/* Care Reminders */}
      {upcomingCare.length > 0 && (
        <section className="mb-8">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">💧</span> Upcoming Care
          </h3>
          <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 rounded-2xl p-5 border border-blue-700/30">
            <ul className="space-y-3">
              {upcomingCare.map((care) => (
                <li
                  key={care.id}
                  className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl"
                >
                  <span className="font-medium text-lg">Plant needs water</span>
                  <span className="text-blue-400 bg-blue-900/30 px-3 py-1 rounded-full text-sm">
                    {care.next_due
                      ? new Date(care.next_due).toLocaleDateString()
                      : "Soon"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Recent Plants */}
      {plants.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">🌿</span> Recent Plants
            </h3>
            <Link href="/plants" className="text-green-400 hover:text-green-300 font-medium">
              View All →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {plants.slice(0, 4).map((plant) => (
              <Link
                key={plant.id}
                href={`/plants/${plant.id}`}
                className="bg-slate-800/80 rounded-2xl p-5 hover:bg-slate-700/80 transition-all border border-slate-700/50 hover:border-green-600/50"
              >
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-lg">{plant.name}</h4>
                  <StageLabel stage={plant.current_stage} />
                </div>
                {plant.species && (
                  <p className="text-slate-400 mb-2">{plant.species}</p>
                )}
                {plant.date_planted && (
                  <p className="text-sm text-slate-500">
                    Planted {new Date(plant.date_planted).toLocaleDateString()}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {plants.length === 0 && (
        <section className="text-center py-12">
          <div className="text-6xl mb-4">🌱</div>
          <h3 className="text-2xl font-bold mb-2">Start Your Garden</h3>
          <p className="text-slate-400 mb-6 text-lg">
            Add your first plant to begin tracking your greenhouse journey.
          </p>
          <Link
            href="/plants/new"
            className="inline-block bg-gradient-to-r from-green-600 to-emerald-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-green-900/30 hover:from-green-500 hover:to-emerald-400 transition-all"
          >
            ➕ Add Your First Plant
          </Link>
        </section>
      )}
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="font-bold text-lg">{title}</div>
      <div className="text-slate-400 text-sm">{desc}</div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl p-5 text-center shadow-lg`}>
      <span className="text-3xl">{icon}</span>
      <div className="text-3xl font-bold mt-2">{value}</div>
      <div className="text-sm text-white/80 font-medium">{label}</div>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  label,
  color,
}: {
  href: string;
  icon: string;
  label: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className={`${color} text-white p-5 rounded-2xl text-center transition-all transform hover:scale-105 shadow-lg`}
    >
      <span className="text-3xl block mb-2">{icon}</span>
      <span className="font-bold">{label}</span>
    </Link>
  );
}

function StageLabel({ stage }: { stage: string }) {
  const colors: Record<string, string> = {
    seed: "bg-amber-600",
    seedling: "bg-lime-600",
    vegetative: "bg-green-600",
  };
  const labels: Record<string, string> = {
    seed: "Seed",
    seedling: "Seedling",
    vegetative: "Vegetative",
  };
  return (
    <span className={`text-sm px-3 py-1 rounded-full font-medium ${colors[stage] || "bg-slate-600"}`}>
      {labels[stage] || stage}
    </span>
  );
}
