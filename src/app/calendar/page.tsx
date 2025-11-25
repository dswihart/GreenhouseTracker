"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { usePlantStore } from "@/store/plantStore";
import { supabase } from "@/lib/supabase/client";
import type { CareSchedule, Plant } from "@/lib/supabase/types";

interface CalendarEvent {
  id: string;
  date: Date;
  type: "watering" | "harvest" | "planted";
  plant: Plant;
  schedule?: CareSchedule;
  daysRemaining?: number;
}

export default function CalendarPage() {
  const { user } = useAuthStore();
  const { plants, setPlants } = usePlantStore();
  const [careSchedules, setCareSchedules] = useState<(CareSchedule & { plant?: Plant })[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);

      const { data: plantsData } = await supabase
        .from("plants")
        .select("*")
        .eq("user_id", user.id);

      if (plantsData) {
        setPlants(plantsData);
      }

      const { data: careData } = await supabase
        .from("care_schedules")
        .select("*")
        .order("next_due", { ascending: true });

      if (careData && plantsData) {
        const schedulesWithPlants = careData.map((schedule) => ({
          ...schedule,
          plant: plantsData.find((p) => p.id === schedule.plant_id),
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

    await supabase
      .from("care_schedules")
      .update({
        last_watered: now.toISOString().split("T")[0],
        next_due: nextDue.toISOString().split("T")[0],
      })
      .eq("id", scheduleId);

    setCareSchedules((prev) =>
      prev.map((s) =>
        s.id === scheduleId
          ? { ...s, last_watered: now.toISOString().split("T")[0], next_due: nextDue.toISOString().split("T")[0] }
          : s
      )
    );
  };

  // Get all events for the calendar
  const getEvents = (): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Add watering events
    careSchedules.forEach((schedule) => {
      if (schedule.next_due && schedule.plant) {
        events.push({
          id: `water-${schedule.id}`,
          date: new Date(schedule.next_due),
          type: "watering",
          plant: schedule.plant,
          schedule,
        });
      }
    });

    // Add harvest events
    plants.forEach((plant) => {
      if (plant.date_planted && plant.days_to_maturity) {
        const harvestDate = new Date(plant.date_planted);
        harvestDate.setDate(harvestDate.getDate() + plant.days_to_maturity);
        const daysRemaining = Math.ceil((harvestDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysRemaining <= 90 && daysRemaining >= -7) {
          events.push({
            id: `harvest-${plant.id}`,
            date: harvestDate,
            type: "harvest",
            plant,
            daysRemaining,
          });
        }
      }

      // Add planting anniversary dates
      if (plant.date_planted) {
        const plantedDate = new Date(plant.date_planted);
        events.push({
          id: `planted-${plant.id}`,
          date: plantedDate,
          type: "planted",
          plant,
        });
      }
    });

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const events = getEvents();

  // Group events by category
  const getUpcomingWatering = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return careSchedules
      .filter((s) => s.next_due && s.plant)
      .map((schedule) => {
        const dueDate = new Date(schedule.next_due!);
        dueDate.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { ...schedule, daysUntil };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);
  };

  const getUpcomingHarvests = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return plants
      .filter((p) => p.date_planted && p.days_to_maturity)
      .map((plant) => {
        const harvestDate = new Date(plant.date_planted!);
        harvestDate.setDate(harvestDate.getDate() + plant.days_to_maturity!);
        const daysRemaining = Math.ceil((harvestDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { plant, harvestDate, daysRemaining };
      })
      .filter((item) => item.daysRemaining <= 60)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  };

  // Calendar grid helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDay = (day: number) => {
    return events.filter((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === currentMonth.getMonth() &&
        eventDate.getFullYear() === currentMonth.getFullYear()
      );
    });
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const upcomingWatering = getUpcomingWatering();
  const upcomingHarvests = getUpcomingHarvests();

  if (!user) {
    return (
      <div className="p-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">📅</div>
        <p className="text-slate-400 text-lg">Please sign in to view your calendar.</p>
        <Link href="/auth" className="mt-4 text-green-400 hover:text-green-300">
          Sign In →
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-4 animate-pulse">📅</div>
        <p className="text-slate-400 text-lg">Loading calendar...</p>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const today = new Date();

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <span>📅</span> Garden Calendar
      </h1>

      {/* Month Navigation */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 mb-6 border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={prevMonth}
            className="text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-600/50 p-2 rounded-lg transition-colors"
          >
            ← Prev
          </button>
          <h2 className="text-xl font-bold">
            {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h2>
          <button
            onClick={nextMonth}
            className="text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-600/50 p-2 rounded-lg transition-colors"
          >
            Next →
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-xs text-slate-500 font-medium py-2">
              {day}
            </div>
          ))}

          {/* Empty cells for days before the first of the month */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="p-2" />
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayEvents = getEventsForDay(day);
            const isToday =
              day === today.getDate() &&
              currentMonth.getMonth() === today.getMonth() &&
              currentMonth.getFullYear() === today.getFullYear();

            return (
              <div
                key={day}
                className={`p-1 min-h-[60px] rounded-lg text-sm ${
                  isToday
                    ? "bg-green-900/50 border border-green-600"
                    : "bg-slate-800/50"
                }`}
              >
                <div className={`font-medium ${isToday ? "text-green-400" : "text-slate-300"}`}>
                  {day}
                </div>
                <div className="flex flex-wrap gap-0.5 mt-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className={`w-2 h-2 rounded-full ${
                        event.type === "watering"
                          ? "bg-blue-400"
                          : event.type === "harvest"
                          ? "bg-amber-400"
                          : "bg-green-400"
                      }`}
                      title={`${event.type}: ${event.plant.name}`}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-xs text-slate-500">+{dayEvents.length - 3}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-4 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <span>Watering</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Harvest</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span>Planted</span>
          </div>
        </div>
      </div>

      {/* Upcoming Watering */}
      <section className="mb-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>💧</span> Watering Schedule
        </h3>
        {upcomingWatering.length === 0 ? (
          <div className="bg-slate-800/50 rounded-2xl p-6 text-center border border-slate-700/50">
            <div className="text-4xl mb-2">💧</div>
            <p className="text-slate-400">No watering schedules set up yet.</p>
            <p className="text-slate-500 text-sm mt-1">Add watering schedules to your plants!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingWatering.map((schedule) => {
              const isOverdue = schedule.daysUntil < 0;
              const isToday = schedule.daysUntil === 0;
              const isTomorrow = schedule.daysUntil === 1;

              let statusColor = "bg-green-900/30 border-green-600/40";
              let statusText = `In ${schedule.daysUntil} days`;

              if (isOverdue) {
                statusColor = "bg-red-900/30 border-red-600/40";
                statusText = `${Math.abs(schedule.daysUntil)} days overdue!`;
              } else if (isToday) {
                statusColor = "bg-amber-900/30 border-amber-600/40";
                statusText = "Water today!";
              } else if (isTomorrow) {
                statusColor = "bg-blue-900/30 border-blue-600/40";
                statusText = "Tomorrow";
              }

              return (
                <div
                  key={schedule.id}
                  className={`${statusColor} rounded-xl p-4 border flex justify-between items-center`}
                >
                  <Link href={`/plants/${schedule.plant?.id}`} className="flex items-center gap-3 flex-1">
                    {schedule.plant?.image_url ? (
                      <img
                        src={schedule.plant.image_url}
                        alt={schedule.plant.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center text-2xl">
                        🌱
                      </div>
                    )}
                    <div>
                      <div className="font-bold">{schedule.plant?.name || "Unknown Plant"}</div>
                      <div className="text-sm text-slate-400">
                        Every {schedule.water_interval_days} days • {statusText}
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => handleMarkWatered(schedule.id)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    💧 Watered
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Harvest Calendar */}
      <section>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>🥬</span> Harvest Calendar
        </h3>
        {upcomingHarvests.length === 0 ? (
          <div className="bg-slate-800/50 rounded-2xl p-6 text-center border border-slate-700/50">
            <div className="text-4xl mb-2">🥬</div>
            <p className="text-slate-400">No harvest dates coming up.</p>
            <p className="text-slate-500 text-sm mt-1">Add planting dates and days to maturity to your plants!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingHarvests.map((item) => {
              const isReady = item.daysRemaining <= 0;
              const isSoon = item.daysRemaining > 0 && item.daysRemaining <= 7;

              let statusColor = "bg-slate-800/50 border-slate-700/50";
              if (isReady) {
                statusColor = "bg-green-900/30 border-green-600/40";
              } else if (isSoon) {
                statusColor = "bg-amber-900/30 border-amber-600/40";
              }

              return (
                <Link
                  key={item.plant.id}
                  href={`/plants/${item.plant.id}`}
                  className={`${statusColor} rounded-xl p-4 border flex justify-between items-center hover:border-green-500/50 transition-colors`}
                >
                  <div className="flex items-center gap-3">
                    {item.plant.image_url ? (
                      <img
                        src={item.plant.image_url}
                        alt={item.plant.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center text-2xl">
                        🌱
                      </div>
                    )}
                    <div>
                      <div className="font-bold">{item.plant.name}</div>
                      <div className="text-sm text-slate-400">
                        {item.plant.species || "Unknown species"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-300">
                      {item.harvestDate.toLocaleDateString()}
                    </div>
                    <div className={`text-sm font-medium ${
                      isReady ? "text-green-400" : isSoon ? "text-amber-400" : "text-slate-400"
                    }`}>
                      {isReady ? "Ready to harvest!" : `${item.daysRemaining} days`}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
