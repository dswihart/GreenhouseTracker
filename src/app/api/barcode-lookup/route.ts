import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

interface ProductInfo {
  name: string | null;
  species: string | null;
  brand: string | null;
  description: string | null;
  daysToMaturity: number | null;
  found: boolean;
  source?: string;
  imageUrl?: string | null;
  // Extended seed info
  plantingDepth?: string | null;
  spacing?: string | null;
  sunRequirements?: string | null;
  wateringNeeds?: string | null;
  harvestInfo?: string | null;
  growingTips?: string | null;
}

interface RawProductData {
  name: string | null;
  description: string | null;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  features?: string[];
  source: string;
}

// Use OpenAI to extract seed-specific growing information and find an image
async function extractSeedInfo(productData: RawProductData): Promise<Partial<ProductInfo>> {
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey || !productData.name) {
    return {};
  }

  try {
    const openai = new OpenAI({ apiKey: openaiKey });

    const productText = [
      `Product: ${productData.name}`,
      productData.brand ? `Brand: ${productData.brand}` : "",
      productData.category ? `Category: ${productData.category}` : "",
      productData.description ? `Description: ${productData.description}` : "",
      productData.features?.length ? `Features: ${productData.features.join(", ")}` : "",
    ].filter(Boolean).join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a gardening expert. Extract seed/plant growing information from product data.
Return a JSON object with these fields (use null if not found or not applicable):
- species: Scientific or common species name (e.g., "Lactuca sativa" or "Butterhead Lettuce")
- daysToMaturity: Number of days from planting to harvest (just the number, e.g., 45)
- plantingDepth: How deep to plant seeds (e.g., "1/4 inch")
- spacing: Distance between plants (e.g., "12 inches apart")
- sunRequirements: Sun needs (e.g., "Full sun", "Partial shade")
- wateringNeeds: Watering frequency (e.g., "Keep soil moist", "1 inch per week")
- harvestInfo: When/how to harvest (e.g., "Harvest outer leaves when 4-6 inches")
- growingTips: Brief growing advice
- searchTerm: A good search term to find a reference photo of this mature plant (e.g., "mature butterhead lettuce plant garden")

If this is NOT a seed/plant product, return {"notASeed": true}.
Only return valid JSON, no other text.`
        },
        {
          role: "user",
          content: productText
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return {};

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};

    const parsed = JSON.parse(jsonMatch[0]);

    if (parsed.notASeed) {
      return {};
    }

    // Use product image first, only search Wikipedia if no image from barcode database
    let imageUrl: string | null = productData.imageUrl || null;
    if (!imageUrl && (parsed.searchTerm || productData.name)) {
      imageUrl = await searchPlantImage(parsed.searchTerm || productData.name);
    }

    return {
      species: parsed.species || null,
      daysToMaturity: parsed.daysToMaturity ? Number(parsed.daysToMaturity) : null,
      plantingDepth: parsed.plantingDepth || null,
      spacing: parsed.spacing || null,
      sunRequirements: parsed.sunRequirements || null,
      wateringNeeds: parsed.wateringNeeds || null,
      harvestInfo: parsed.harvestInfo || null,
      growingTips: parsed.growingTips || null,
      imageUrl,
    };
  } catch (error) {
    console.error("OpenAI extraction error:", error);
    return {};
  }
}

// Search for a plant image using Wikipedia API (free, no key needed)
async function searchPlantImage(searchTerm: string): Promise<string | null> {
  try {
    // Clean up search term for better results
    const query = searchTerm.replace(/seeds?|packet|pack|organic|heirloom|#\d+/gi, '').trim();

    // Search Wikipedia for the plant
    const searchResponse = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + ' plant')}&format=json&origin=*`
    );

    if (!searchResponse.ok) return null;

    const searchData = await searchResponse.json();
    const firstResult = searchData?.query?.search?.[0];
    if (!firstResult) return null;

    // Get the page with images
    const pageResponse = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(firstResult.title)}&prop=pageimages&pithumbsize=300&format=json&origin=*`
    );

    if (!pageResponse.ok) return null;

    const pageData = await pageResponse.json();
    const pages = pageData?.query?.pages;
    if (!pages) return null;

    // Get the thumbnail from the first page
    const page = Object.values(pages)[0] as { thumbnail?: { source: string } };
    if (page?.thumbnail?.source) {
      return page.thumbnail.source;
    }

    return null;
  } catch (error) {
    console.error("Wikipedia image search error:", error);
    return null;
  }
}

// Helper to parse HTML and extract product info from barcodelookup.com
function parseBarcodeLookupHtml(html: string): RawProductData | null {
  try {
    // Extract product name
    const nameMatch = html.match(/<h4[^>]*class="[^"]*product-name[^"]*"[^>]*>([^<]+)<\/h4>/i) ||
                      html.match(/<span[^>]*class="[^"]*product-name[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                      html.match(/<title>([^|<]+)/i);

    // Extract brand
    const brandMatch = html.match(/Brand:<\/span>\s*<span[^>]*>([^<]+)<\/span>/i) ||
                       html.match(/"brand"\s*:\s*"([^"]+)"/i);

    // Extract category
    const categoryMatch = html.match(/Category:<\/span>\s*<span[^>]*>([^<]+)<\/span>/i) ||
                          html.match(/"category"\s*:\s*"([^"]+)"/i);

    // Extract description - try multiple patterns
    const descMatch = html.match(/Description:<\/span>\s*<span[^>]*>([^<]+)<\/span>/i) ||
                      html.match(/<div[^>]*class="[^"]*product-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                      html.match(/"description"\s*:\s*"([^"]+)"/i);

    // Extract image URL
    const imageMatch = html.match(/<img[^>]*class="[^"]*product-image[^"]*"[^>]*src="([^"]+)"/i) ||
                       html.match(/"image"\s*:\s*"([^"]+)"/i) ||
                       html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);

    // Extract features/bullet points
    const featuresMatch = html.match(/<ul[^>]*class="[^"]*product-features[^"]*"[^>]*>([\s\S]*?)<\/ul>/i);
    const features: string[] = [];
    if (featuresMatch) {
      const liMatches = featuresMatch[1].matchAll(/<li[^>]*>([^<]+)<\/li>/gi);
      for (const match of liMatches) {
        features.push(match[1].trim());
      }
    }

    // Try to get product name from meta tags or JSON-LD
    const metaNameMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i) ||
                          html.match(/"name"\s*:\s*"([^"]+)"/i);

    // Get meta description too
    const metaDescMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i) ||
                          html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i);

    const name = nameMatch?.[1]?.trim() || metaNameMatch?.[1]?.trim();

    if (!name || name.includes('not found') || name.includes('Barcode Lookup')) {
      return null;
    }

    return {
      name: name || null,
      description: descMatch?.[1]?.trim() || metaDescMatch?.[1]?.trim() || null,
      brand: brandMatch?.[1]?.trim() || null,
      category: categoryMatch?.[1]?.trim() || null,
      imageUrl: imageMatch?.[1]?.trim() || null,
      features: features.length > 0 ? features : undefined,
      source: "Barcode Lookup (scraped)",
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const barcode = request.nextUrl.searchParams.get("code");

  if (!barcode) {
    return NextResponse.json({ error: "Barcode required" }, { status: 400 });
  }

  try {
    let rawProduct: RawProductData | null = null;

    // Try Barcode Lookup API first (best coverage, paid)
    const barcodeLookupKey = process.env.BARCODE_LOOKUP_API_KEY;

    if (barcodeLookupKey) {
      const blResponse = await fetch(
        `https://api.barcodelookup.com/v3/products?barcode=${barcode}&key=${barcodeLookupKey}`
      );

      if (blResponse.ok) {
        const blData = await blResponse.json();

        if (blData.products && blData.products.length > 0) {
          const product = blData.products[0];
          rawProduct = {
            name: product.title || product.product_name || null,
            description: product.description || null,
            brand: product.brand || null,
            category: product.category || null,
            imageUrl: product.images?.[0] || null,
            features: product.features || undefined,
            source: "Barcode Lookup",
          };
        }
      }
    }

    // Try scraping barcodelookup.com via ScraperAPI
    if (!rawProduct) {
      const scraperApiKey = process.env.SCRAPER_API_KEY;

      if (scraperApiKey) {
        const targetUrl = `https://www.barcodelookup.com/${barcode}`;
        const scraperResponse = await fetch(
          `http://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(targetUrl)}&render=true`,
          { signal: AbortSignal.timeout(30000) }
        );

        if (scraperResponse.ok) {
          const html = await scraperResponse.text();
          rawProduct = parseBarcodeLookupHtml(html);
        }
      }
    }

    // Try UPC Database (good US coverage)
    if (!rawProduct) {
      const upcDbKey = process.env.UPC_DATABASE_API_KEY;

      if (upcDbKey) {
        const upcDbResponse = await fetch(
          `https://api.upcdatabase.org/product/${barcode}`,
          {
            headers: {
              "Authorization": `Bearer ${upcDbKey}`,
            },
          }
        );

        if (upcDbResponse.ok) {
          const upcDbData = await upcDbResponse.json();

          if (upcDbData.success && upcDbData.title) {
            rawProduct = {
              name: upcDbData.title || null,
              description: upcDbData.description || null,
              brand: upcDbData.brand || null,
              category: upcDbData.category || null,
              imageUrl: upcDbData.images?.[0] || null,
              source: "UPC Database",
            };
          }
        }
      }
    }

    // Try Open Products Facts (general products, unlimited, no key)
    if (!rawProduct) {
      const opfResponse = await fetch(
        `https://world.openproductsfacts.org/api/v0/product/${barcode}.json`
      );

      if (opfResponse.ok) {
        const opfData = await opfResponse.json();

        if (opfData.status === 1 && opfData.product) {
          const product = opfData.product;
          rawProduct = {
            name: product.product_name || null,
            description: product.generic_name || null,
            brand: product.brands || null,
            category: product.categories || null,
            imageUrl: product.image_url || product.image_front_url || null,
            source: "Open Products Facts",
          };
        }
      }
    }

    // Try Open Food Facts (food items, unlimited, no key)
    if (!rawProduct) {
      const offResponse = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );

      if (offResponse.ok) {
        const offData = await offResponse.json();

        if (offData.status === 1 && offData.product) {
          const product = offData.product;
          rawProduct = {
            name: product.product_name || null,
            description: product.generic_name || null,
            brand: product.brands || null,
            category: product.categories || null,
            imageUrl: product.image_url || product.image_front_url || null,
            source: "Open Food Facts",
          };
        }
      }
    }

    // Try UPC Item DB as fallback (100/day free)
    if (!rawProduct) {
      const upcResponse = await fetch(
        `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`,
        {
          headers: {
            "Accept": "application/json",
          },
        }
      );

      if (upcResponse.ok) {
        const upcData = await upcResponse.json();

        if (upcData.items && upcData.items.length > 0) {
          const item = upcData.items[0];
          rawProduct = {
            name: item.title || null,
            description: item.description || null,
            brand: item.brand || null,
            category: item.category || null,
            imageUrl: item.images?.[0] || null,
            source: "UPC Item DB",
          };
        }
      }
    }

    // Not found in any database
    if (!rawProduct) {
      return NextResponse.json<ProductInfo>({
        found: false,
        name: null,
        species: null,
        brand: null,
        description: null,
        daysToMaturity: null,
      });
    }

    // Use AI to extract detailed seed/plant growing information
    const seedInfo = await extractSeedInfo(rawProduct);

    // Use product image if available, otherwise use AI-found image
    const finalImageUrl = rawProduct.imageUrl || seedInfo.imageUrl || null;

    return NextResponse.json<ProductInfo>({
      found: true,
      name: rawProduct.name,
      species: seedInfo.species || rawProduct.category || null,
      brand: rawProduct.brand,
      description: rawProduct.description,
      daysToMaturity: seedInfo.daysToMaturity || null,
      source: rawProduct.source,
      imageUrl: finalImageUrl,
      plantingDepth: seedInfo.plantingDepth,
      spacing: seedInfo.spacing,
      sunRequirements: seedInfo.sunRequirements,
      wateringNeeds: seedInfo.wateringNeeds,
      harvestInfo: seedInfo.harvestInfo,
      growingTips: seedInfo.growingTips,
    });

  } catch (error) {
    console.error("Barcode lookup error:", error);
    return NextResponse.json(
      { error: "Lookup failed", found: false },
      { status: 500 }
    );
  }
}
