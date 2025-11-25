"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase/client";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  settings: Record<string, unknown> | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }

    const loadProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
      }
      setLoading(false);
    };

    loadProfile();
  }, [user, router]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
      });

    if (error) {
      setMessage({ type: "error", text: "Failed to save profile" });
    } else {
      setMessage({ type: "success", text: "Profile saved!" });
      setProfile((prev) => prev ? {
        ...prev,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
      } : null);
    }

    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSignOut = async () => {
    if (!confirm("Are you sure you want to sign out?")) return;
    await signOut();
    router.push("/auth");
  };

  if (loading) {
    return (
      <div className="p-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-4 animate-spin">⚙️</div>
        <p className="text-slate-400 text-lg">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-green-400 mb-3 transition-colors">
          <span>←</span> Back to dashboard
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span>⚙️</span> Settings
        </h1>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-4 rounded-xl ${
          message.type === "success"
            ? "bg-green-900/50 border border-green-600 text-green-300"
            : "bg-red-900/50 border border-red-600 text-red-300"
        }`}>
          {message.text}
        </div>
      )}

      {/* Profile Section */}
      <section className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 mb-6 border border-slate-700">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>👤</span> Profile
        </h2>

        <div className="space-y-4">
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <div className="px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-300">
              {user?.email}
            </div>
          </div>

          {/* First Name */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter your first name"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter your last name"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700 text-white py-3 rounded-xl font-bold transition-colors"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </section>

      {/* Account Stats */}
      <section className="bg-slate-800/80 rounded-2xl p-5 mb-6 border border-slate-700/50">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>📊</span> Account Info
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-700/30 rounded-xl p-4">
            <div className="text-sm text-slate-400">Member Since</div>
            <div className="font-bold">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString()
                : "N/A"}
            </div>
          </div>
          <div className="bg-slate-700/30 rounded-xl p-4">
            <div className="text-sm text-slate-400">User ID</div>
            <div className="font-mono text-xs text-slate-400 truncate">
              {user?.id?.slice(0, 8)}...
            </div>
          </div>
        </div>
      </section>

      {/* App Info */}
      <section className="bg-slate-800/80 rounded-2xl p-5 mb-6 border border-slate-700/50">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>🌱</span> About Greenhouse Tracker
        </h2>
        <div className="space-y-2 text-slate-400">
          <p>Version 1.0.0</p>
          <p>Track your plants from seed to harvest</p>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-gradient-to-br from-red-900/30 to-red-950/30 rounded-2xl p-5 border border-red-800/50">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-400">
          <span>⚠️</span> Account
        </h2>
        <button
          onClick={handleSignOut}
          className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold transition-colors"
        >
          Sign Out
        </button>
      </section>
    </div>
  );
}
