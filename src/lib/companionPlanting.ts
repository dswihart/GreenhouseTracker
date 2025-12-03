// Companion Planting Database

export interface CompanionData {
  friends: string[];
  enemies: string[];
  description?: string;
}

export function normalizePlantName(name: string): string {
  const lower = name.toLowerCase().trim();
  const mappings: Record<string, string> = {
    "tomatoes": "tomato", "peppers": "pepper", "bell pepper": "pepper",
    "hot pepper": "pepper", "chili": "pepper", "carrots": "carrot",
    "onions": "onion", "beans": "bean", "green bean": "bean",
    "bush bean": "bean", "pole bean": "bean", "lettuces": "lettuce",
    "cucumbers": "cucumber", "squash": "squash", "zucchini": "squash",
    "pumpkin": "squash", "potatoes": "potato", "corn": "corn",
    "maize": "corn", "peas": "pea", "snap pea": "pea",
    "cabbages": "cabbage", "broccoli": "brassica", "kale": "brassica",
    "radishes": "radish", "beets": "beet", "beetroot": "beet",
    "cilantro": "cilantro", "coriander": "cilantro",
    "marigolds": "marigold", "nasturtiums": "nasturtium",
    "sunflowers": "sunflower", "strawberries": "strawberry",
    "melon": "melon", "watermelon": "melon", "eggplant": "eggplant",
    "aubergine": "eggplant", "leeks": "leek", "chives": "chive",
  };
  return mappings[lower] || lower;
}

export const companionData: Record<string, CompanionData> = {
  tomato: {
    friends: ["basil", "carrot", "parsley", "marigold", "nasturtium", "chive", "onion", "garlic", "pepper", "celery", "asparagus"],
    enemies: ["brassica", "cabbage", "corn", "fennel", "potato", "dill"],
    description: "Basil repels pests and improves flavor. Marigolds deter nematodes."
  },
  pepper: {
    friends: ["tomato", "basil", "carrot", "onion", "parsley", "spinach", "marigold"],
    enemies: ["fennel", "bean", "brassica"],
    description: "Peppers and tomatoes have similar needs and protect each other."
  },
  carrot: {
    friends: ["tomato", "lettuce", "chive", "onion", "leek", "rosemary", "sage", "pea", "bean"],
    enemies: ["dill", "celery"],
    description: "Onion family repels carrot fly. Tomatoes provide shade."
  },
  lettuce: {
    friends: ["carrot", "radish", "strawberry", "chive", "onion", "garlic", "beet", "bean", "pea"],
    enemies: ["celery"],
    description: "Quick-growing lettuce can be interplanted between slower crops."
  },
  cucumber: {
    friends: ["bean", "pea", "corn", "sunflower", "radish", "lettuce", "dill", "marigold"],
    enemies: ["potato", "melon", "sage", "mint"],
    description: "Beans fix nitrogen. Sunflowers provide support."
  },
  squash: {
    friends: ["corn", "bean", "radish", "marigold", "nasturtium", "oregano", "sunflower"],
    enemies: ["potato", "brassica"],
    description: "Part of Three Sisters (corn, beans, squash) - classic companion trio."
  },
  bean: {
    friends: ["corn", "squash", "cucumber", "carrot", "beet", "cabbage", "lettuce", "pea", "radish", "strawberry", "marigold"],
    enemies: ["onion", "garlic", "chive", "leek", "pepper", "fennel"],
    description: "Beans fix nitrogen in soil, benefiting nearby plants."
  },
  pea: {
    friends: ["carrot", "corn", "cucumber", "bean", "radish", "lettuce", "spinach", "mint"],
    enemies: ["onion", "garlic", "chive", "leek"],
    description: "Peas fix nitrogen and provide ground cover."
  },
  corn: {
    friends: ["bean", "pea", "squash", "cucumber", "melon", "sunflower"],
    enemies: ["tomato", "celery"],
    description: "Provides support for climbing beans, part of Three Sisters."
  },
  potato: {
    friends: ["bean", "corn", "cabbage", "marigold", "pea"],
    enemies: ["tomato", "cucumber", "squash", "sunflower", "carrot", "onion"],
    description: "Keep away from tomatoes - they share diseases."
  },
  onion: {
    friends: ["carrot", "lettuce", "tomato", "pepper", "beet", "cabbage", "strawberry"],
    enemies: ["bean", "pea", "asparagus", "sage"],
    description: "Strong scent deters many pests. Great with carrots."
  },
  garlic: {
    friends: ["tomato", "pepper", "lettuce", "beet", "carrot", "strawberry"],
    enemies: ["bean", "pea", "asparagus", "sage"],
    description: "Natural pest repellent, especially for aphids."
  },
  cabbage: {
    friends: ["bean", "celery", "onion", "potato", "dill", "mint", "rosemary", "sage", "thyme"],
    enemies: ["tomato", "pepper", "strawberry"],
    description: "Aromatic herbs help repel cabbage moths."
  },
  brassica: {
    friends: ["bean", "celery", "onion", "potato", "dill", "mint", "rosemary", "sage", "thyme", "beet"],
    enemies: ["tomato", "pepper", "strawberry"],
    description: "All brassicas benefit from aromatic herbs that deter pests."
  },
  basil: {
    friends: ["tomato", "pepper", "oregano", "parsley", "marigold"],
    enemies: ["sage"],
    description: "Classic tomato companion - improves growth and flavor."
  },
  marigold: {
    friends: ["tomato", "pepper", "cucumber", "squash", "bean", "potato", "lettuce"],
    enemies: [],
    description: "Pest-repelling superstar! Plant throughout garden."
  },
  nasturtium: {
    friends: ["tomato", "cucumber", "squash", "cabbage", "brassica", "bean"],
    enemies: [],
    description: "Trap crop for aphids. Edible flowers attract pollinators."
  },
  radish: {
    friends: ["lettuce", "pea", "bean", "cucumber", "carrot", "spinach", "squash"],
    enemies: [],
    description: "Fast-growing, can be used as row markers."
  },
  spinach: {
    friends: ["strawberry", "pea", "bean", "celery", "eggplant", "radish"],
    enemies: [],
    description: "Grows well in partial shade of taller plants."
  },
  strawberry: {
    friends: ["bean", "lettuce", "onion", "spinach", "thyme"],
    enemies: ["cabbage", "brassica"],
    description: "Thyme improves flavor and disease resistance."
  },
  beet: {
    friends: ["onion", "garlic", "lettuce", "cabbage", "bean", "brassica"],
    enemies: [],
    description: "Beet greens provide ground cover for soil moisture."
  },
  celery: {
    friends: ["bean", "cabbage", "tomato", "spinach", "leek", "onion"],
    enemies: ["corn", "carrot", "potato"],
    description: "Heavy feeder - benefits from nitrogen-fixing beans."
  },
  asparagus: {
    friends: ["tomato", "parsley", "basil", "marigold", "nasturtium"],
    enemies: ["onion", "garlic", "potato"],
    description: "Tomatoes repel asparagus beetles."
  },
  eggplant: {
    friends: ["bean", "pepper", "spinach", "thyme", "marigold"],
    enemies: ["fennel"],
    description: "Thyme deters garden moths."
  },
  melon: {
    friends: ["corn", "sunflower", "radish", "marigold", "nasturtium"],
    enemies: ["potato", "cucumber"],
    description: "Needs space and pollinators - sunflowers help!"
  },
  sunflower: {
    friends: ["corn", "cucumber", "squash", "melon", "lettuce"],
    enemies: ["potato", "bean"],
    description: "Attracts pollinators, provides support and shade."
  },
  dill: {
    friends: ["cabbage", "cucumber", "lettuce", "onion", "brassica"],
    enemies: ["carrot", "tomato"],
    description: "Attracts beneficial insects. Keep away from carrots!"
  },
  cilantro: {
    friends: ["tomato", "pepper", "spinach", "bean", "pea"],
    enemies: [],
    description: "Attracts beneficial insects, deters aphids."
  },
  parsley: {
    friends: ["tomato", "asparagus", "corn"],
    enemies: ["lettuce", "mint"],
    description: "Attracts beneficial insects to tomatoes."
  },
  mint: {
    friends: ["cabbage", "tomato", "pea", "brassica"],
    enemies: ["parsley"],
    description: "Deters pests but is invasive - use containers!"
  },
  rosemary: {
    friends: ["bean", "cabbage", "carrot", "sage", "brassica"],
    enemies: [],
    description: "Deters bean beetles, cabbage moths, and carrot fly."
  },
  sage: {
    friends: ["rosemary", "cabbage", "carrot", "tomato", "strawberry", "brassica"],
    enemies: ["cucumber", "onion", "garlic", "basil"],
    description: "Repels cabbage moth and carrot fly."
  },
  thyme: {
    friends: ["cabbage", "eggplant", "potato", "strawberry", "tomato", "brassica"],
    enemies: [],
    description: "General pest deterrent, attracts beneficial insects."
  },
  chive: {
    friends: ["carrot", "tomato"],
    enemies: ["bean", "pea"],
    description: "Deters aphids and Japanese beetles."
  },
  oregano: {
    friends: ["pepper", "tomato", "squash", "basil"],
    enemies: [],
    description: "Pest deterrent, attracts pollinators."
  },
  leek: {
    friends: ["carrot", "celery", "onion", "strawberry"],
    enemies: ["bean", "pea"],
    description: "Deters carrot fly when interplanted."
  },
};

export type CompanionRelation = "friend" | "enemy" | "neutral";

export function getCompanionRelation(plant1: string, plant2: string): CompanionRelation {
  const name1 = normalizePlantName(plant1);
  const name2 = normalizePlantName(plant2);
  if (name1 === name2) return "neutral";
  const data1 = companionData[name1];
  const data2 = companionData[name2];
  if (data1?.enemies.includes(name2) || data2?.enemies.includes(name1)) return "enemy";
  if (data1?.friends.includes(name2) || data2?.friends.includes(name1)) return "friend";
  return "neutral";
}

export function getCompanions(plantName: string): { friends: string[]; enemies: string[] } | null {
  const normalized = normalizePlantName(plantName);
  const data = companionData[normalized];
  if (!data) return null;
  return { friends: data.friends, enemies: data.enemies };
}

export function getCompanionDescription(plantName: string): string | null {
  const normalized = normalizePlantName(plantName);
  return companionData[normalized]?.description || null;
}

export interface CompanionAnalysis {
  warnings: { plant1: string; plant2: string; message: string }[];
  suggestions: { plant1: string; plant2: string; message: string }[];
}

export function analyzeTrayCompanions(
  plants: { id: string; name: string; x: number; y: number }[]
): CompanionAnalysis {
  const warnings: CompanionAnalysis["warnings"] = [];
  const suggestions: CompanionAnalysis["suggestions"] = [];
  const checked = new Set<string>();

  for (let i = 0; i < plants.length; i++) {
    for (let j = i + 1; j < plants.length; j++) {
      const p1 = plants[i];
      const p2 = plants[j];
      const pairKey = [p1.id, p2.id].sort().join("-");
      if (checked.has(pairKey)) continue;
      checked.add(pairKey);
      const distance = Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
      const isAdjacent = distance <= 1;
      const isNearby = distance <= 2;
      const relation = getCompanionRelation(p1.name, p2.name);
      if (relation === "enemy" && isNearby) {
        const name1 = normalizePlantName(p1.name);
        const data = companionData[name1];
        warnings.push({
          plant1: p1.name,
          plant2: p2.name,
          message: data?.description || `${p1.name} and ${p2.name} do not grow well together`,
        });
      } else if (relation === "friend" && isAdjacent) {
        suggestions.push({
          plant1: p1.name,
          plant2: p2.name,
          message: `Great pairing! ${p1.name} and ${p2.name} help each other.`,
        });
      }
    }
  }
  return { warnings, suggestions };
}
