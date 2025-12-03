"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase/client";
import type { Plant, ZoneItem, Zone, Contact, Tray } from "@/lib/supabase/types";

interface PlantLabel {
  plantId: string;
  plantName: string;
  labelName: string | null;
  species: string | null;
  datePlanted: string | null;
  zoneName: string;
  trayName: string;
  contactId: string | null;
  contactName: string | null;
  contactColor: string;
  position: string;
}

// Simple readable abbreviations - returns UPPERCASE
function abbreviateName(name: string, customLabel?: string | null): string {
  // Use custom label if set
  if (customLabel && customLabel.trim()) {
    return customLabel.toUpperCase();
  }

  const simple: Record<string, string> = {
    "johnny's jalapeño": "JOHNNY JAL",
    "johnnys jalapeno": "JOHNNY JAL",
    "johnny's jalapeno": "JOHNNY JAL",
    "yellow bell": "YEL BELL",
    "mini bell": "MINI BELL",
    "red italian": "RED ITAL",
    "bell pepper": "BELL PEP",
    "sweet pepper": "SWEET PEP",
    "hot pepper": "HOT PEP",
    "poblano": "POBLANO",
    "paprika": "PAPRIKA",
    "sheepnose": "SHEEPNOSE",
    "mad hatter": "MAD HAT",
    "anaheim": "ANAHEIM",
    "cayenne": "CAYENNE",
    "habanero": "HABANERO",
    "serrano": "SERRANO",
    "jalapeno": "JALAPENO",
    "jalapeño": "JALAPENO",
    "fatalii": "FATALII",
    "primo": "PRIMO",
    "veloz": "VELOZ",
    "cherry tomato": "CHERRY TOM",
    "beefsteak": "BEEFSTEAK",
    "roma tomato": "ROMA",
    "tomato": "TOMATO",
    "cucumber": "CUCUMBER",
    "zucchini": "ZUCCHINI",
    "squash": "SQUASH",
    "pumpkin": "PUMPKIN",
    "watermelon": "WATERMELON",
    "cantaloupe": "CANTALOUPE",
    "lettuce": "LETTUCE",
    "spinach": "SPINACH",
    "kale": "KALE",
    "broccoli": "BROCCOLI",
    "cauliflower": "CAULIFLWR",
    "cabbage": "CABBAGE",
    "carrot": "CARROT",
    "onion": "ONION",
    "garlic": "GARLIC",
    "basil": "BASIL",
    "cilantro": "CILANTRO",
    "parsley": "PARSLEY",
    "oregano": "OREGANO",
    "thyme": "THYME",
    "rosemary": "ROSEMARY",
    "mint": "MINT",
  };

  const lower = name.toLowerCase().trim();

  if (simple[lower]) {
    return simple[lower];
  }

  for (const [full, short] of Object.entries(simple)) {
    if (lower.includes(full)) {
      return short;
    }
  }

  // Return name in uppercase, truncate if too long
  let result = name.toUpperCase();
  if (result.length > 12) {
    result = result.substring(0, 12).trim();
  }
  return result;
}

export default function LabelsPage() {
  const { user } = useAuthStore();
  const [labels, setLabels] = useState<PlantLabel[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<string | "all" | "unassigned">("all");
  const [selectedZone, setSelectedZone] = useState<string | "all">("all");
  const [zones, setZones] = useState<Zone[]>([]);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      const { data: zonesData } = await supabase
        .from("zones")
        .select("*")
        .eq("user_id", user.id);

      const { data: traysData } = await supabase
        .from("trays")
        .select("*");

      const { data: itemsData } = await supabase
        .from("zone_items")
        .select("*");

      const { data: plantsData } = await supabase
        .from("plants")
        .select("*")
        .eq("user_id", user.id);

      const { data: contactsData } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id);

      if (zonesData) setZones(zonesData);
      if (contactsData) {
        const colors = ["#3b82f6", "#10b981", "#eab308", "#ec4899", "#ffffff"];
        setContacts(contactsData.map((c, i) => ({
          ...c,
          color: colors[i % colors.length]
        })));
      }

      const labelList: PlantLabel[] = [];

      if (itemsData && plantsData && zonesData && traysData) {
        for (const item of itemsData) {
          const plant = plantsData.find(p => p.id === item.plant_id);
          const zone = zonesData.find(z => z.id === item.zone_id);
          const tray = traysData?.find(t => t.id === item.tray_id);
          const contact = contactsData?.find(c => c.id === item.assigned_to);

          if (plant && zone) {
            labelList.push({
              plantId: plant.id,
              plantName: plant.name,
              labelName: plant.label_name || null,
              species: plant.species,
              datePlanted: plant.date_planted,
              zoneName: zone.name,
              trayName: tray?.name || "Main",
              contactId: item.assigned_to,
              contactName: contact?.name || null,
              contactColor: contact ? (["#3b82f6", "#10b981", "#eab308", "#ec4899", "#ffffff"][contactsData?.indexOf(contact) % 5] || "#888") : "#888888",
              position: `${String.fromCharCode(65 + item.y)}${item.x + 1}`,
            });
          }
        }
      }

      setLabels(labelList);
      setLoading(false);
    };

    loadData();
  }, [user]);

  const filteredLabels = labels.filter(label => {
    if (selectedContact === "unassigned" && label.contactId !== null) return false;
    if (selectedContact !== "all" && selectedContact !== "unassigned" && label.contactId !== selectedContact) return false;
    if (selectedZone !== "all" && !zones.find(z => z.name === label.zoneName && z.id === selectedZone)) return false;
    return true;
  });

  const groupedByContact = filteredLabels.reduce((acc, label) => {
    const key = label.contactName || "Unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key].push(label);
    return acc;
  }, {} as Record<string, PlantLabel[]>);

  const handlePrint = () => {
    window.print();
  };

  if (!user) {
    return (
      <div className="p-6 text-center">
        <p className="text-xl text-slate-400">Please sign in to print labels.</p>
        <Link href="/auth" className="text-green-400 hover:text-green-300 mt-4 inline-block text-lg">
          Sign In →
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="text-5xl mb-4 animate-bounce">🏷️</div>
        <p className="text-xl text-slate-400">Loading labels...</p>
      </div>
    );
  }

  return (
    <>
      {/* Print styles - black text on white background */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 5mm;
          }
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .label-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 2mm;
            padding: 2mm;
          }
          .stake-label {
            page-break-inside: avoid;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .contact-section {
            page-break-before: always;
          }
          .contact-section:first-child {
            page-break-before: avoid;
          }
          .section-header-print {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 3mm;
            color: black !important;
            border-bottom: 1px solid #ccc;
            padding-bottom: 2mm;
          }
        }
      `}</style>

      <div className="p-4 max-w-6xl mx-auto pb-24">
        {/* Header - hidden when printing */}
        <div className="no-print mb-6">
          <Link href="/" className="text-green-400 hover:text-green-300 text-lg mb-4 inline-block">
            ← Back to Home
          </Link>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <span className="text-4xl">🏷️</span>
                Plant Stake Labels
              </h1>
              <p className="text-slate-400 text-lg mt-1">
                ALL CAPS black text on white labels
              </p>
            </div>

            <button
              onClick={handlePrint}
              className="bg-green-600 hover:bg-green-500 active:bg-green-400 text-white px-8 py-4 rounded-xl text-xl font-bold flex items-center gap-3"
            >
              <span className="text-2xl">🖨️</span>
              Print Labels
            </button>
          </div>

          {/* Filters */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-lg font-medium mb-2">Filter by Person</label>
              <select
                value={selectedContact}
                onChange={(e) => setSelectedContact(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-xl text-lg"
              >
                <option value="all">All People</option>
                <option value="unassigned">Unassigned Only</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-lg font-medium mb-2">Filter by Zone</label>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-xl text-lg"
              >
                <option value="all">All Zones</option>
                {zones.map(z => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 flex gap-4 flex-wrap">
            <div className="bg-slate-800 px-6 py-4 rounded-xl">
              <div className="text-3xl font-bold text-green-400">{filteredLabels.length}</div>
              <div className="text-slate-400">Labels to Print</div>
            </div>
            {Object.entries(groupedByContact).map(([name, items]) => (
              <div key={name} className="bg-slate-800 px-6 py-4 rounded-xl">
                <div className="text-2xl font-bold">{items.length}</div>
                <div className="text-slate-400">{name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Labels Preview / Print Area */}
        <div className="print-area">
          {filteredLabels.length === 0 ? (
            <div className="no-print text-center py-12 bg-slate-800 rounded-2xl">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-2xl font-bold mb-2">No Plants to Label</h3>
              <p className="text-slate-400 text-lg">Place some plants in your zones first.</p>
              <Link href="/zones" className="text-green-400 hover:text-green-300 mt-4 inline-block text-lg">
                Go to Zones →
              </Link>
            </div>
          ) : (
            <div>
              {Object.entries(groupedByContact).map(([contactName, contactLabels]) => (
                <div key={contactName} className="contact-section mb-8">
                  <h2 className="text-2xl font-bold mb-4 text-slate-200 no-print">
                    {contactName}
                    <span className="ml-3 text-slate-400 font-normal">({contactLabels.length} labels)</span>
                  </h2>
                  <div className="section-header-print hidden print:block">
                    {contactName} - {contactLabels.length} labels
                  </div>

                  {/* White labels with LARGE BLACK ALL CAPS text */}
                  <div className="label-grid flex flex-wrap gap-2">
                    {contactLabels.map((label, idx) => (
                      <div
                        key={`${label.plantId}-${idx}`}
                        className="stake-label flex flex-col items-center"
                        style={{
                          width: "32px",
                          height: "180px",
                          backgroundColor: "#ffffff",
                          border: "1px solid #000",
                          borderRadius: "3px",
                        }}
                      >
                        {/* Vertical text - LARGE BLACK ALL CAPS */}
                        <div
                          className="flex-1 flex items-center justify-center"
                          style={{
                            writingMode: "vertical-rl",
                            textOrientation: "mixed",
                            transform: "rotate(180deg)",
                            fontSize: "16px",
                            fontWeight: "900",
                            color: "#000000",
                            padding: "10px 4px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxHeight: "170px",
                            letterSpacing: "1px",
                            fontFamily: "Arial Black, Arial, sans-serif",
                            textTransform: "uppercase",
                          }}
                        >
                          {abbreviateName(label.plantName, label.labelName)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Print Instructions */}
        {filteredLabels.length > 0 && (
          <div className="no-print mt-8 bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
              <span className="text-2xl">💡</span>
              Printing Tips
            </h3>
            <ul className="space-y-2 text-lg text-slate-300">
              <li>• Print in <strong>landscape orientation</strong></li>
              <li>• Use <strong>white card stock</strong> or label paper</li>
              <li>• Labels print as <strong>BOLD ALL CAPS black text</strong></li>
              <li>• Cut each label strip vertically</li>
              <li>• Labels are grouped by person for easy sorting</li>
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
