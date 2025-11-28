import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

interface UrlImportResult {
  found: boolean;
  name: string | null;
  species: string | null;
  variety: string | null;
  description: string | null;
  daysToMaturity: number | null;
  category: string | null;
  imageUrl: string | null;
  plantingDepth: string | null;
  spacing: string | null;
  rowSpacing: string | null;
  sunRequirements: string | null;
  wateringNeeds: string | null;
  soilRequirements: string | null;
  sowingInstructions: string | null;
  transplantInfo: string | null;
  harvestInfo: string | null;
  height: string | null;
  spread: string | null;
  growingTips: string | null;
  daysToGermination: string | null;
  seedCount: string | null;
  isHybrid: boolean | null;
  isHeirloom: boolean | null;
  isOrganic: boolean | null;
  resistances: string | null;
  source: string;
  sourceUrl: string;
  error?: string;
}

// Supported seed vendor domains
const SUPPORTED_DOMAINS = [
  "burpee.com",
  "www.burpee.com",
  "johnnyseeds.com",
  "www.johnnyseeds.com",
  "rareseeds.com",
  "www.rareseeds.com",
  "seedsavers.org",
  "www.seedsavers.org",
  "parkseed.com",
  "www.parkseed.com",
  "territorialseed.com",
  "www.territorialseed.com",
  "highmowingseeds.com",
  "www.highmowingseeds.com",
  "harrisseeds.com",
  "www.harrisseeds.com",
  "botanicalinterests.com",
  "www.botanicalinterests.com",
  "seedsnow.com",
  "www.seedsnow.com",
  "edenbrothers.com",
  "www.edenbrothers.com",
];

// Get vendor display name from hostname
function getVendorName(hostname: string): string {
  const vendorNames: Record<string, string> = {
    "burpee.com": "Burpee",
    "johnnyseeds.com": "Johnny's Selected Seeds",
    "rareseeds.com": "Baker Creek Heirloom Seeds",
    "seedsavers.org": "Seed Savers Exchange",
    "parkseed.com": "Park Seed",
    "territorialseed.com": "Territorial Seed",
    "highmowingseeds.com": "High Mowing Organic Seeds",
    "harrisseeds.com": "Harris Seeds",
    "botanicalinterests.com": "Botanical Interests",
    "seedsnow.com": "Seeds N Such",
    "edenbrothers.com": "Eden Brothers",
  };

  const cleanHost = hostname.replace(/^www\./, "");
  return vendorNames[cleanHost] || cleanHost;
}

// Validate URL and extract hostname
function validateUrl(urlString: string): { valid: boolean; hostname: string; error?: string } {
  try {
    const url = new URL(urlString);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { valid: false, hostname: "", error: "URL must use http or https protocol" };
    }

    const hostname = url.hostname.toLowerCase();
    const isSupported = SUPPORTED_DOMAINS.some(
      domain => hostname === domain || hostname.endsWith("." + domain)
    );

    if (!isSupported) {
      return {
        valid: false,
        hostname,
        error: "This seed vendor is not yet supported. Try Burpee, Johnny's Seeds, Baker Creek, or other major vendors."
      };
    }

    return { valid: true, hostname };
  } catch {
    return { valid: false, hostname: "", error: "Please enter a valid URL" };
  }
}

// Clean HTML content for AI processing
function cleanHtmlContent(html: string): string {
  // Remove scripts, styles, and other non-content elements
  let cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "");

  // Extract title
  const titleMatch = cleaned.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";

  // Extract meta description
  const metaDescMatch = cleaned.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                        cleaned.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  const metaDesc = metaDescMatch ? metaDescMatch[1].trim() : "";

  // Extract og:image
  const ogImageMatch = cleaned.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                       cleaned.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  const ogImage = ogImageMatch ? ogImageMatch[1].trim() : "";

  // Extract main product image (common patterns)
  const productImageMatch = cleaned.match(/<img[^>]*class=["'][^"']*product[^"']*["'][^>]*src=["']([^"']+)["']/i) ||
                           cleaned.match(/<img[^>]*src=["']([^"']+)["'][^>]*class=["'][^"']*product[^"']*["']/i) ||
                           cleaned.match(/<img[^>]*id=["'][^"']*product[^"']*["'][^>]*src=["']([^"']+)["']/i);
  const productImage = productImageMatch ? productImageMatch[1].trim() : "";

  // Convert HTML to text while preserving structure
  cleaned = cleaned
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<td[^>]*>/gi, " | ")
    .replace(/<th[^>]*>/gi, " | ")
    .replace(/<h[1-6][^>]*>/gi, "\n\n### ")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();

  // Truncate to reasonable size for AI
  if (cleaned.length > 15000) {
    cleaned = cleaned.substring(0, 15000) + "...";
  }

  return `TITLE: ${title}\n\nMETA DESCRIPTION: ${metaDesc}\n\nIMAGE URL: ${ogImage || productImage}\n\nPAGE CONTENT:\n${cleaned}`;
}

// Extract plant data using AI
async function extractPlantDataWithAI(
  content: string,
  url: string,
  vendorName: string
): Promise<UrlImportResult> {
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    return {
      found: false,
      name: null,
      species: null,
      variety: null,
      description: null,
      daysToMaturity: null,
      category: null,
      imageUrl: null,
      plantingDepth: null,
      spacing: null,
      rowSpacing: null,
      sunRequirements: null,
      wateringNeeds: null,
      soilRequirements: null,
      sowingInstructions: null,
      transplantInfo: null,
      harvestInfo: null,
      height: null,
      spread: null,
      growingTips: null,
      daysToGermination: null,
      seedCount: null,
      isHybrid: null,
      isHeirloom: null,
      isOrganic: null,
      resistances: null,
      source: vendorName,
      sourceUrl: url,
      error: "AI extraction not configured",
    };
  }

  try {
    const openai = new OpenAI({ apiKey: openaiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert horticulturist and seed catalog analyst. Extract ALL available seed/plant information from webpage content.

Return a JSON object with these fields (use null ONLY if the information is truly not on the page):
- name: Product name/variety name (e.g., "Marathon Broccoli", "Sun Gold Tomato")
- species: Scientific name if available (e.g., "Brassica oleracea", "Solanum lycopersicum")
- variety: Specific variety/cultivar name (e.g., "Marathon Hybrid", "Sun Gold F1")
- description: Full product description from the page
- category: One of: vegetable, fruit, herb, flower, pepper, tomato, leafy_green, root_vegetable, squash, bean, other
- daysToMaturity: Number of days from planting/transplanting to harvest (just the number, use average if range given)
- plantingDepth: How deep to plant seeds - look for "Sow Depth", "Planting Depth", or similar (e.g., "1/4 inch", "1/2 inch", "surface sow")
- spacing: Distance between plants - look for "Spacing", "Plant Spacing", "Space" (e.g., "18-24 inches", "12 inches apart")
- rowSpacing: Distance between rows if mentioned (e.g., "24-36 inches between rows")
- sunRequirements: Sun/light needs - look for "Sun", "Light", "Exposure" (e.g., "Full Sun", "Part Shade", "6-8 hours")
- wateringNeeds: Watering requirements (e.g., "1 inch per week", "Keep evenly moist", "Moderate")
- soilRequirements: Soil type/pH if mentioned (e.g., "Well-drained, fertile soil", "pH 6.0-7.0")
- sowingInstructions: When/how to start seeds - indoor vs outdoor, timing (e.g., "Start indoors 6-8 weeks before last frost")
- transplantInfo: Transplanting instructions if available
- harvestInfo: When/how to harvest (e.g., "Harvest when heads are 4-6 inches, before flowering")
- height: Plant height at maturity (e.g., "18-24 inches", "3-4 feet")
- spread: Plant spread/width (e.g., "12-18 inches")
- growingTips: Any additional growing advice, tips, or notes
- daysToGermination: Days for seeds to germinate if mentioned (e.g., "7-14 days")
- seedCount: Number of seeds in packet if shown
- isHybrid: true/false - is this a hybrid variety (F1)?
- isHeirloom: true/false - is this an heirloom/open-pollinated variety?
- isOrganic: true/false - are the seeds organic?
- resistances: Disease/pest resistances (e.g., "Resistant to downy mildew, powdery mildew")
- imageUrl: Extract the main product image URL from the content

IMPORTANT:
- Extract EVERY piece of growing information you can find on the page
- Look carefully for planting charts, specification tables, and "How to Grow" sections
- If this is NOT a seed/plant product page, return {"found": false, "error": "Not a plant product page"}
- For numeric values with ranges (70-75 days), use the average (72)
- Category mapping: tomatoes->"tomato", peppers->"pepper", lettuce/spinach/kale->"leafy_green", carrots/beets/radish->"root_vegetable"
- If the content says "PRODUCT FROM URL" and asks for your knowledge, use your training data to provide accurate growing information for that specific seed variety. Be thorough and provide all standard growing details.

Return valid JSON only, no other text.`
        },
        {
          role: "user",
          content: `Extract ALL seed/plant information from this product page. Be thorough - get spacing, depth, timing, everything:

URL: ${url}
Vendor: ${vendorName}

${content}`
        }
      ],
      temperature: 0.1,
      max_tokens: 1500,
    });

    const aiContent = response.choices[0]?.message?.content?.trim();
    if (!aiContent) {
      throw new Error("No response from AI");
    }

    // Parse JSON response
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid JSON response from AI");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (parsed.found === false) {
      return {
        found: false,
        name: null,
        species: null,
        variety: null,
        description: null,
        daysToMaturity: null,
        category: null,
        imageUrl: null,
        plantingDepth: null,
        spacing: null,
        rowSpacing: null,
        sunRequirements: null,
        wateringNeeds: null,
        soilRequirements: null,
        sowingInstructions: null,
        transplantInfo: null,
        harvestInfo: null,
        height: null,
        spread: null,
        growingTips: null,
        daysToGermination: null,
        seedCount: null,
        isHybrid: null,
        isHeirloom: null,
        isOrganic: null,
        resistances: null,
        source: vendorName,
        sourceUrl: url,
        error: parsed.error || "Not a plant product page",
      };
    }

    return {
      found: true,
      name: parsed.name || null,
      species: parsed.species || null,
      variety: parsed.variety || null,
      description: parsed.description || null,
      daysToMaturity: parsed.daysToMaturity ? Number(parsed.daysToMaturity) : null,
      category: parsed.category || null,
      imageUrl: parsed.imageUrl || null,
      plantingDepth: parsed.plantingDepth || null,
      spacing: parsed.spacing || null,
      rowSpacing: parsed.rowSpacing || null,
      sunRequirements: parsed.sunRequirements || null,
      wateringNeeds: parsed.wateringNeeds || null,
      soilRequirements: parsed.soilRequirements || null,
      sowingInstructions: parsed.sowingInstructions || null,
      transplantInfo: parsed.transplantInfo || null,
      harvestInfo: parsed.harvestInfo || null,
      height: parsed.height || null,
      spread: parsed.spread || null,
      growingTips: parsed.growingTips || null,
      daysToGermination: parsed.daysToGermination || null,
      seedCount: parsed.seedCount || null,
      isHybrid: parsed.isHybrid ?? null,
      isHeirloom: parsed.isHeirloom ?? null,
      isOrganic: parsed.isOrganic ?? null,
      resistances: parsed.resistances || null,
      source: vendorName,
      sourceUrl: url,
    };

  } catch (error) {
    console.error("AI extraction error:", error);
    return {
      found: false,
      name: null,
      species: null,
      variety: null,
      description: null,
      daysToMaturity: null,
      category: null,
      imageUrl: null,
      plantingDepth: null,
      spacing: null,
      rowSpacing: null,
      sunRequirements: null,
      wateringNeeds: null,
      soilRequirements: null,
      sowingInstructions: null,
      transplantInfo: null,
      harvestInfo: null,
      height: null,
      spread: null,
      growingTips: null,
      daysToGermination: null,
      seedCount: null,
      isHybrid: null,
      isHeirloom: null,
      isOrganic: null,
      resistances: null,
      source: vendorName,
      sourceUrl: url,
      error: "Failed to extract plant information",
    };
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 });
  }

  // Validate URL
  const validation = validateUrl(url);
  if (!validation.valid) {
    return NextResponse.json({
      found: false,
      error: validation.error,
      supportedVendors: ["Burpee", "Johnny's Seeds", "Baker Creek", "Seed Savers", "Park Seed", "Territorial Seed"]
    }, { status: 400 });
  }

  const vendorName = getVendorName(validation.hostname);

  try {
    let html: string = "";
    let fetchMethod = "direct";

    // Try direct fetch first (faster, works for most seed sites)
    try {
      const directResponse = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (directResponse.ok) {
        html = await directResponse.text();
        // Check if we got meaningful content (not just a shell for JS rendering)
        if (html.length < 5000 || !html.includes("product") && !html.includes("seed")) {
          html = ""; // Reset to trigger ScraperAPI fallback
        }
      }
    } catch {
      // Direct fetch failed, will try ScraperAPI
    }

    // Fall back to ScraperAPI for JavaScript-rendered content
    if (!html) {
      const scraperApiKey = process.env.SCRAPER_API_KEY;

      if (scraperApiKey) {
        fetchMethod = "scraperapi";

        // Try with premium=true for protected sites like Burpee
        try {
          const scraperResponse = await fetch(
            `http://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(url)}&render=true&country_code=us&premium=true`,
            { signal: AbortSignal.timeout(60000) }
          );

          if (scraperResponse.ok) {
            html = await scraperResponse.text();

            // Check if ScraperAPI returned an error message
            if (html.includes("Request failed") || html.includes("not be charged") || html.length < 1000) {
              html = ""; // Reset to trigger Exa fallback
            }
          }
        } catch {
          // ScraperAPI failed, will try Exa
        }
      }
    }

    // Final fallback: Extract product info from URL and use AI knowledge
    if (!html || html.length < 1000) {
      fetchMethod = "ai-knowledge";

      // Extract product name from URL
      const urlPath = new URL(url).pathname;
      const productSlug = urlPath.split('/').pop()?.replace(/\.html$/, '') || '';
      const productName = productSlug
        .replace(/-prod\d+$/, '')  // Remove Burpee product ID
        .replace(/-seed-?\d*$/, '')  // Remove seed suffix
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());

      html = `PRODUCT FROM URL: ${productName}\nVENDOR: ${vendorName}\nURL: ${url}\n\nPlease provide growing information for this seed product based on your knowledge.`;
    }

    if (!html || html.length < 50) {
      throw new Error("Could not fetch page content. The site may be blocking automated access.");
    }

    // Clean and extract content
    const cleanedContent = fetchMethod === "ai-knowledge" ? html : cleanHtmlContent(html);

    // Extract plant data using AI
    const plantData = await extractPlantDataWithAI(cleanedContent, url, vendorName);

    return NextResponse.json(plantData);

  } catch (error) {
    console.error("URL import error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("timeout")) {
      return NextResponse.json({
        found: false,
        error: "Request timed out. Please try again.",
        source: vendorName,
        sourceUrl: url,
      }, { status: 504 });
    }

    return NextResponse.json({
      found: false,
      error: "Failed to fetch page. Please check the URL and try again.",
      source: vendorName,
      sourceUrl: url,
    }, { status: 500 });
  }
}
