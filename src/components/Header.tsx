"use client";

import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

export function Header() {
  const { user } = useAuthStore();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="bg-slate-900 border-b-2 border-slate-600 px-4 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-4xl" aria-hidden="true">🌿</span>
          <h1 className="text-2xl font-bold text-green-300">
            Greenhouse Tracker
          </h1>
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-base text-slate-300 hidden sm:block font-medium">
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-base bg-slate-700 hover:bg-slate-600 text-white px-5 py-3 rounded-xl font-medium transition-colors"
                aria-label="Sign out of your account"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="text-lg bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-bold transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
