"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { usePlantStore } from "@/store/plantStore";
import { useZoneStore } from "@/store/zoneStore";
import { supabase } from "@/lib/supabase/client";

export default function PlanningPage() {
  const { user } = useAuthStore();

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

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-3xl font-bold">Planting Planner</h2>
          <p className="text-slate-400">Plan your growing season</p>
        </div>
      </div>
      <div className="text-center py-16 bg-slate-800/50 rounded-2xl border border-slate-700/50">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-2xl font-bold mb-2">Coming Soon!</h3>
        <p className="text-slate-400 mb-6 text-lg">
          The planning feature is under development.
        </p>
      </div>
    </div>
  );
}