import process from "node:process";

// Server-only verified-phone lookup via Apify's Google Maps Scraper.
// Returns REAL phone numbers + official names + addresses scraped from Google Maps
// (not AI-guessed). Requires APIFY_API_TOKEN in .env.
//
// Two passes maximise phone hit-rate:
//   1) search by "name + province" (matches the lead's locale)
//   2) for any lead still without a phone, retry by "name only" — this catches
//      HQs / call centres listed in a different province than the lead's area,
//      and rebranded/duplicate pins where the locale match has no phone.

export type PlacesPhone = {
  phone: string; // formatted, e.g. "02 027 7888"
  mapsUrl: string; // Google Maps link to the matched place
  matchedName: string; // official business name as listed on Google Maps
  address: string; // full address from Google Maps
  lat?: number; // matched place latitude (for real distance filtering)
  lng?: number; // matched place longitude
};

// compass/crawler-google-places — the standard Google Maps Scraper actor
const ACTOR = "compass~crawler-google-places";

const hasToken = () => !!process.env.APIFY_API_TOKEN;
export const placesEnabled = hasToken;

const norm = (s: string) => (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
const rowHasPhone = (r: any) => !!(r?.phone || r?.phoneUnformatted);

// One Apify run for a set of queries. Returns the chosen raw row per query
// (highest-ranked candidate that has a phone, else the top candidate), aligned by index.
async function scrapeBatch(queries: string[], names: string[]): Promise<(any | null)[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token || !queries.length) return queries.map(() => null);

  const res = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchStringsArray: queries,
        maxCrawledPlacesPerSearch: 3, // a few candidates so we can skip phone-less pins
        language: "th",
        countryCode: "th",
        skipClosedPlaces: false,
      }),
      signal: AbortSignal.timeout(280_000),
    },
  );
  if (!res.ok) return queries.map(() => null);
  const rows: any[] = await res.json();
  if (!Array.isArray(rows)) return queries.map(() => null);

  const byQuery = new Map<string, any[]>();
  const byTitle: { title: string; row: any }[] = [];
  for (const r of rows) {
    if (r?.searchString) {
      const k = norm(r.searchString);
      if (!byQuery.has(k)) byQuery.set(k, []);
      byQuery.get(k)!.push(r);
    }
    if (r?.title) byTitle.push({ title: norm(r.title), row: r });
  }
  const pick = (cands: any[]) => cands.find(rowHasPhone) ?? cands[0];

  return queries.map((query, i) => {
    const nm = norm(names[i]);
    let cands = byQuery.get(norm(query));
    if (!cands?.length) {
      const t = byTitle.filter((x) => x.title.includes(nm) || nm.includes(x.title)).map((x) => x.row);
      cands = t.length ? t : rows.length === queries.length ? [rows[i]] : [];
    }
    return cands.length ? pick(cands) : null;
  });
}

const toPlace = (r: any): PlacesPhone | null => {
  if (!r?.title) return null;
  const lat = r.location?.lat ?? r.lat;
  const lng = r.location?.lng ?? r.lng;
  return {
    phone: r.phone || r.phoneUnformatted || "",
    mapsUrl: r.url || r.googleMapsUrl || "",
    matchedName: r.title,
    address: r.address || r.street || "",
    lat: typeof lat === "number" ? lat : undefined,
    lng: typeof lng === "number" ? lng : undefined,
  };
};

// Batch lookup for many leads. Returns results aligned to input order.
export async function enrichPhones(items: { name: string; locationHint?: string }[]): Promise<(PlacesPhone | null)[]> {
  if (!hasToken() || !items.length) return items.map(() => null);
  try {
    const names = items.map((it) => it.name);
    // Pass 1 — name + province
    const primary = await scrapeBatch(
      items.map((it) => [it.name, it.locationHint].filter(Boolean).join(" ").trim()),
      names,
    );

    // Pass 2 — name only, for leads still missing a phone
    const missIdx = items.map((_, i) => i).filter((i) => !rowHasPhone(primary[i]));
    const fb: Record<number, any> = {};
    if (missIdx.length) {
      const fbRows = await scrapeBatch(missIdx.map((i) => names[i]), missIdx.map((i) => names[i]));
      missIdx.forEach((i, k) => (fb[i] = fbRows[k]));
    }

    return items.map((_, i) => {
      const p = primary[i];
      const f = fb[i];
      // Prefer whichever pass found a phone; otherwise keep any matched place (name/address).
      const chosen = rowHasPhone(p) ? p : rowHasPhone(f) ? f : (p ?? f ?? null);
      return chosen ? toPlace(chosen) : null;
    });
  } catch {
    return items.map(() => null); // timeout / network / parse — never crash the search
  }
}

export async function lookupPlacePhone(name: string, locationHint = ""): Promise<PlacesPhone | null> {
  const [r] = await enrichPhones([{ name, locationHint }]);
  return r ?? null;
}
