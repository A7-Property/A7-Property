import { filterProperties, sortProperties, type Property, type SearchFilters } from "@/lib/properties";

export interface AssistantIntent {
  rawLocation: string | null;
  location: string;
  budget: number | null;
  bedrooms: number | null;
  purpose: "rent" | "sale";
}

export interface RankedRecommendation {
  property: Property;
  match: number;
  reasons: string[];
}

const locationAliases: Array<{ terms: string[]; township: string; label: string }> = [
  { terms: ["hledan", "လှည်းတန်း"], township: "Kamayut", label: "Hledan / Kamayut" },
  { terms: ["bahan"], township: "Bahan", label: "Bahan" },
  { terms: ["yankin"], township: "Yankin", label: "Yankin" },
  { terms: ["sanchaung"], township: "Sanchaung", label: "Sanchaung" },
  { terms: ["hlaing"], township: "Hlaing", label: "Hlaing" },
  { terms: ["mayangone", "8 mile"], township: "Mayangone", label: "Mayangone" },
  { terms: ["mandalay"], township: "Mandalay", label: "Mandalay" },
  { terms: ["yangon"], township: "Yangon", label: "Yangon" },
];

export function parsePropertyRequest(query: string): AssistantIntent {
  const normalized = query.toLowerCase();
  const locationMatch = locationAliases.find((item) => item.terms.some((term) => normalized.includes(term)));
  const commaBudget = normalized.match(/(?:under|below|max|budget|up to)?\s*([0-9]{1,3}(?:,[0-9]{3})+)\s*(?:mmk)?/i);
  const compactBudget = normalized.match(/(?:under|below|max|budget|up to)?\s*([0-9]+(?:\.[0-9]+)?)\s*(k|m|million|lakh)/i);
  let budget: number | null = null;
  if (commaBudget) budget = Number(commaBudget[1].replaceAll(",", ""));
  if (!budget && compactBudget) {
    const amount = Number(compactBudget[1]);
    const unit = compactBudget[2];
    budget = unit === "k" ? amount * 1_000 : unit === "lakh" ? amount * 100_000 : amount * 1_000_000;
  }
  const bedroomMatch = normalized.match(/([1-6])\s*(?:bed|bedroom|room)/i);

  return {
    rawLocation: locationMatch?.label ?? null,
    location: locationMatch?.township ?? "All Myanmar",
    budget,
    bedrooms: bedroomMatch ? Number(bedroomMatch[1]) : null,
    purpose: normalized.includes("buy") || normalized.includes("sale") ? "sale" : "rent",
  };
}

export function recommendProperties(properties: Property[], intent: AssistantIntent): RankedRecommendation[] {
  const filters: SearchFilters = {
    location: intent.location,
    minPrice: null,
    maxPrice: intent.budget,
    purpose: intent.purpose,
    propertyTypes: [],
    bedrooms: intent.bedrooms,
    bathrooms: null,
    furniture: "all",
    parking: false,
  };
  let matches = filterProperties(properties, filters);
  if (matches.length < 3) {
    matches = filterProperties(properties, { ...filters, location: "All Myanmar", bedrooms: null }).filter((property) => property.city === "Yangon");
  }
  return sortProperties(matches, "recommended").slice(0, 5).map((property, index) => {
    const reasons = [
      property.verification_status === "verified"
        ? (property.owner.phone_verified ? "Verified listing and phone contact" : "Verified listing; phone not verified")
        : property.verification_status === "pending" ? "Listing verification pending" : "Unverified listing",
      intent.budget ? `${new Intl.NumberFormat("en-US").format(intent.budget - property.price)} MMK below your limit` : "Strong value for the area",
      intent.rawLocation && property.township === intent.location ? `In your preferred ${intent.rawLocation} area` : `Easy access from ${property.township}`,
    ];
    return { property, match: Math.max(88, 98 - index * 2), reasons };
  });
}
