"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { usePlantStore } from "@/store/plantStore";
import { supabase } from "@/lib/supabase/client";

export default function CalendarPage() {
  const { user } = useAuthStore();
  const { plants, setPlants } = usePlantStore();
  const [careSchedules, setCareSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);

      const { data: plantsData } = await (supabase as any)
        .from("plants")
        .select("*")
        .eq("user_id", user.id);

      if (plantsData) {
        setPlants(plantsData);
      }

      const { data: careData } = await (supabase as any)
        .from("care_schedules")
        .select("*")
        .order("next_due", { ascending: true });

      if (careData && plantsData) {
        const schedulesWithPlants = careData.map((schedule: any) => ({
          ...schedule,
          plant: plantsData.find((p: any) => p.id === schedule.plant_id),
        }));
        setCareSchedules(schedulesWithPlants);
      }

      setLoading(false);
    };

    loadData();
  }, [user, setPlants]);

  const handleMarkWatered = async (scheduleId: string) => {
    const schedule = careSchedules.find((s) => s.id === scheduleId);
    if (!schedule) return;

    const now = new Date();
    const nextDue = new Date(now);
    nextDue.setDate(nextDue.getDate() + schedule.water_interval_days);

    await (supabase as any)
      .from("care_schedules")
      .update({
        last_watered: now.toISOString(),
        next_due: nextDue.toISOString(),
      })
      .eq("id", scheduleId);

    setCareSchedules((prev) =>
      prev.map((s) =>
        s.id === scheduleId
          ? { ...s, last_watered: now.toISOString(), next_due: nextDue.toISOString() }
          : s
      )
    );
  };

  const getHarvestItems = () => {
    const now = new Date();
    return plants
      .filter((p: any) => p.date_planted && p.days_to_maturity)
      .map((plant: any) => {
        const harvestDate = new Date(plant.date_planted);
        harvestDate.setDate(harvestDate.getDate() + plant.days_to_maturity);
        const daysRemaining = Math.ceil((harvestDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { plant, harvestDate, daysRemaining };
      })
      .filter((item) => item.daysRemaining <= 60)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  };

  const harvestItems = getHarvestItems();

  if (!user) {
    return <div className="p-4 text-center text-slate-400">Please sign in to view your calendar.</div>;
  }

  if (loading) {
    return <div className="p-4 text-center text-slate-400">Loading calendar...</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Calendar</h2>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-3">💧 Watering Schedule</h3>
        {careSchedules.length === 0 ? (
          <div className="bg-slate-800 rounded-lg p-4 text-center text-slate-400">No care schedules set up yet.</div>
        ) : (
          <div className="space-y-2">
            {careSchedules.map((schedule) => (
              <div key={schedule.id} className="bg-slate-800 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium">{schedule.plant?.name || "Unknown Plant"}</div>
                  <div className="text-sm text-slate-400">
                    Every {schedule.water_interval_days} days
                    {schedule.next_due && ` • Due: ${new Date(schedule.next_due).toLocaleDateString()}`}
                  </div>
                </div>
                <button onClick={() => handleMarkWatered(schedule.id)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                  Mark Watered
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">🥕 Harvest Calendar</h3>
        {harvestItems.length === 0 ? (
          <div className="bg-slate-800 rounded-lg p-4 text-center text-slate-400">No harvest dates. Add planting dates to your plants.</div>
        ) : (
          <div className="space-y-2">
            {harvestItems.map((item) => (
              <div key={item.plant.id} className="bg-slate-800 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium">{item.plant.name}</div>
                  <div className="text-sm text-slate-400">{item.plant.species || "Unknown species"}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">{item.harvestDate.toLocaleDateString()}</div>
                  <div className={`text-xs ${item.daysRemaining <= 0 ? "text-green-400" : "text-slate-400"}`}>
                    {item.daysRemaining <= 0 ? "Ready!" : `${item.daysRemaining} days`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
