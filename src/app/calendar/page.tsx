"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { usePlantStore } from "@/store/plantStore";
import { supabase } from "@/lib/supabase/client";
import type { CareSchedule, Plant } from "@/lib/supabase/types";

interface HarvestItem {
  plant: Plant;
  harvestDate: Date;
  daysRemaining: number;
}

interface CalendarEvent {
  date: Date;
  type: "planted" | "harvest" | "watering";
  plant: Plant;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function CalendarPage() {
  const { user } = useAuthStore();
  const { plants, setPlants } = usePlantStore();
  const [careSchedules, setCareSchedules] = useState<
    (CareSchedule & { plant?: Plant })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);

      // Load plants
      const { data: plantsData } = await supabase
        .from("plants")
        .select("*")
        .eq("user_id", user.id);

      if (plantsData) {
        setPlants(plantsData);
      }

      // Load care schedules
      const { data: careData } = await supabase
        .from("care_schedules")
        .select("*")
        .order("next_due", { ascending: true });

      if (careData && plantsData) {
        const typedPlants = plantsData as Plant[];
        const schedulesWithPlants = (careData as CareSchedule[]).map((schedule) => ({
          ...schedule,
          plant: typedPlants.find((p) => p.id === schedule.plant_id),
        }));
        setCareSchedules(schedulesWithPlants);
      }

      setLoading(false);
    };

    loadData();
  }, [user, setPlants]);

  const calculateHarvestItems = (): HarvestItem[] => {
    const now = new Date();
    const items: HarvestItem[] = [];

    plants.forEach((plant) => {
      if (!plant.date_planted || !plant.days_to_maturity) return;

      const harvestDate = new Date(plant.date_planted);
      harvestDate.setDate(harvestDate.getDate() + plant.days_to_maturity);

      const daysRemaining = Math.ceil(
        (harvestDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Show plants harvesting within next 60 days or already ready
      if (daysRemaining <= 60) {
        items.push({ plant, harvestDate, daysRemaining });
      }
    });

    return items.sort((a, b) => a.daysRemaining - b.daysRemaining);
  };

  const handleMarkWatered = async (scheduleId: string, plantId: string) => {
    const now = new Date();
    const schedule = careSchedules.find((s) => s.id === scheduleId);
    if (!schedule) return;

    const nextDue = new Date(now);
    nextDue.setDate(nextDue.getDate() + schedule.water_interval_days);

    const { error } = await supabase
      .from("care_schedules")
      .update({
        last_watered: now.toISOString(),
        next_due: nextDue.toISOString(),
      })
      .eq("id", scheduleId);

    if (!error) {
      setCareSchedules((prev) =>
        prev.map((s) =>
          s.id === scheduleId
            ? { ...s, last_watered: now.toISOString(), next_due: nextDue.toISOString() }
            : s
        )
      );
    }
  };

  const harvestItems = calculateHarvestItems();

  // Get recently planted items (within last 30 days) and upcoming plants
  const getPlantedItems = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return plants
      .filter((plant) => plant.date_planted)
      .map((plant) => ({
        plant,
        plantedDate: new Date(plant.date_planted!),
        daysAgo: Math.floor(
          (now.getTime() - new Date(plant.date_planted!).getTime()) / (1000 * 60 * 60 * 24)
        ),
      }))
      .filter((item) => item.plantedDate >= thirtyDaysAgo)
      .sort((a, b) => b.plantedDate.getTime() - a.plantedDate.getTime());
  };

  const recentlyPlanted = getPlantedItems();

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const events: CalendarEvent[] = [];

    plants.forEach((plant) => {
      // Check planted date
      if (plant.date_planted) {
        const plantedDate = new Date(plant.date_planted);
        if (isSameDay(plantedDate, date)) {
          events.push({ date: plantedDate, type: "planted", plant });
        }
      }

      // Check harvest date
      if (plant.date_planted && plant.days_to_maturity) {
        const harvestDate = new Date(plant.date_planted);
        harvestDate.setDate(harvestDate.getDate() + plant.days_to_maturity);
        if (isSameDay(harvestDate, date)) {
          events.push({ date: harvestDate, type: "harvest", plant });
        }
      }
    });

    return events;
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Generate calendar grid
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  if (!user) {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-400">Please sign in to view your calendar.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-slate-400">Loading calendar...</div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Calendar</h2>

      {/* Visual Calendar */}
      <section className="mb-6">
        <div className="bg-slate-800 rounded-xl p-4">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-xl"
            >
              ←
            </button>
            <div className="text-center">
              <h3 className="text-xl font-bold">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h3>
              <button
                onClick={goToToday}
                className="text-sm text-green-400 hover:text-green-300"
              >
                Today
              </button>
            </div>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-xl"
            >
              →
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map((day) => (
              <div key={day} className="text-center text-xs text-slate-400 font-medium py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="h-12" />;
              }

              const events = getEventsForDate(date);
              const hasPlanted = events.some((e) => e.type === "planted");
              const hasHarvest = events.some((e) => e.type === "harvest");
              const isSelected = selectedDate && isSameDay(date, selectedDate);

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={`h-12 rounded-lg text-sm font-medium relative transition-colors ${
                    isToday(date)
                      ? "bg-green-600 text-white"
                      : isSelected
                      ? "bg-slate-600 text-white"
                      : "hover:bg-slate-700 text-slate-300"
                  }`}
                >
                  {date.getDate()}
                  {/* Event Indicators */}
                  {(hasPlanted || hasHarvest) && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                      {hasPlanted && (
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      )}
                      {hasHarvest && (
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-700 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span>Planted</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <span>Harvest</span>
            </div>
          </div>
        </div>

        {/* Selected Date Events */}
        {selectedDate && (
          <div className="mt-3 bg-slate-800/50 rounded-xl p-3">
            <h4 className="text-sm font-medium text-slate-300 mb-2">
              {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h4>
            {selectedDateEvents.length === 0 ? (
              <p className="text-sm text-slate-500">No events on this day</p>
            ) : (
              <div className="space-y-1">
                {selectedDateEvents.map((event, index) => (
                  <div
                    key={`${event.plant.id}-${event.type}-${index}`}
                    className={`text-sm px-2 py-1 rounded flex items-center gap-2 ${
                      event.type === "planted"
                        ? "bg-green-900/30 text-green-300"
                        : "bg-orange-900/30 text-orange-300"
                    }`}
                  >
                    <span>{event.type === "planted" ? "🌱" : "🥕"}</span>
                    <span>{event.plant.name}</span>
                    <span className="text-xs opacity-75">
                      ({event.type === "planted" ? "Planted" : "Harvest"})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Two Column Layout for smaller sections */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Recently Planted - Compact */}
        <section className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <span>🌱</span> Recently Planted
          </h3>
          {recentlyPlanted.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-2">No recent plantings</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentlyPlanted.slice(0, 5).map((item) => (
                <div
                  key={item.plant.id}
                  className="bg-slate-700/50 rounded-lg p-2 flex justify-between items-center text-sm"
                >
                  <div>
                    <div className="font-medium text-sm">{item.plant.name}</div>
                    {item.plant.category && (
                      <div className="text-xs text-slate-400 capitalize">{item.plant.category}</div>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    {item.daysAgo === 0 ? "Today" : `${item.daysAgo}d ago`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming Harvests - Compact */}
        <section className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <span>🥕</span> Upcoming Harvests
          </h3>
          {harvestItems.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-2">No harvest dates</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {harvestItems.slice(0, 5).map((item) => (
                <div
                  key={item.plant.id}
                  className={`bg-slate-700/50 rounded-lg p-2 flex justify-between items-center text-sm ${
                    item.daysRemaining <= 0 ? "border-l-2 border-green-500" : ""
                  }`}
                >
                  <div>
                    <div className="font-medium text-sm">{item.plant.name}</div>
                    <div className="text-xs text-slate-400">
                      {item.harvestDate.toLocaleDateString()}
                    </div>
                  </div>
                  <div className={`text-xs font-medium ${
                    item.daysRemaining <= 0
                      ? "text-green-400"
                      : item.daysRemaining <= 7
                      ? "text-orange-400"
                      : "text-slate-400"
                  }`}>
                    {item.daysRemaining <= 0 ? "Ready!" : `${item.daysRemaining}d`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Care Due */}
      <section className="mt-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span>💧</span> Watering Schedule
        </h3>
        {careSchedules.length === 0 ? (
          <div className="bg-slate-800 rounded-lg p-4 text-center text-slate-400">
            No care schedules set up yet.
            <p className="text-sm mt-1">
              Add watering schedules from individual plant pages.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {careSchedules.map((schedule) => {
              const isDue =
                schedule.next_due && new Date(schedule.next_due) <= new Date();
              return (
                <div
                  key={schedule.id}
                  className={`bg-slate-800 rounded-lg p-4 flex justify-between items-center ${
                    isDue ? "border-l-4 border-blue-500" : ""
                  }`}
                >
                  <div>
                    <div className="font-medium">
                      {schedule.plant?.name || "Unknown Plant"}
                    </div>
                    <div className="text-sm text-slate-400">
                      Every {schedule.water_interval_days} days
                      {schedule.next_due && (
                        <span>
                          {" "}
                          • Due:{" "}
                          {new Date(schedule.next_due).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleMarkWatered(schedule.id, schedule.plant_id)
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Mark Watered
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
