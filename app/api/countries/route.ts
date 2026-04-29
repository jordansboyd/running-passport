import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { loadStates, getState } from "@/lib/states";
import {
  CATEGORIES,
  CATEGORY_LIST,
  type Category,
  type Region,
  type RegionStats,
  type ActivityPoint,
  type ScopedData,
  type CountriesResponse,
} from "@/lib/types";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const crg = require("country-reverse-geocoding").country_reverse_geocoding();

const SPORT_TO_CATEGORY: Record<string, Category> = Object.entries(CATEGORIES).reduce(
  (acc, [cat, sports]) => {
    for (const s of sports) acc[s] = cat as Category;
    return acc;
  },
  {} as Record<string, Category>
);

interface StravaActivity {
  sport_type: string;
  start_latlng: [number, number] | [];
  start_date: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  kudos_count: number;
  pr_count: number;
}

interface EnrichedActivity {
  category: Category;
  year: number;
  lat: number;
  lng: number;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  kudos_count: number;
  pr_count: number;
  country: { name: string; code: string };
  state: { name: string; code: string } | null;
}

async function fetchAllActivities(token: string): Promise<StravaActivity[]> {
  const list: StravaActivity[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=200&page=${page}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) break;
    const batch: StravaActivity[] = await res.json();
    if (batch.length === 0) break;
    list.push(...batch);
    page++;
  }
  return list;
}

function aggregate(activities: EnrichedActivity[], region: Region): ScopedData {
  const map = new Map<string, RegionStats>();
  const points: ActivityPoint[] = [];
  const seen = new Set<string>();

  for (const a of activities) {
    const r = region === "world" ? a.country : a.state;
    if (!r) continue;

    const existing = map.get(r.code) ?? {
      name: r.name,
      code: r.code,
      activityCount: 0,
      totalDistance: 0,
      totalMovingTime: 0,
      averageSpeed: 0,
      totalElevationGain: 0,
      totalKudos: 0,
      totalPRs: 0,
    };
    existing.activityCount += 1;
    existing.totalDistance += a.distance ?? 0;
    existing.totalMovingTime += a.moving_time ?? 0;
    existing.totalElevationGain += a.total_elevation_gain ?? 0;
    existing.totalKudos += a.kudos_count ?? 0;
    existing.totalPRs += a.pr_count ?? 0;
    map.set(r.code, existing);

    const key = `${a.lat.toFixed(2)},${a.lng.toFixed(2)}`;
    if (!seen.has(key)) {
      seen.add(key);
      points.push({ lat: a.lat, lng: a.lng });
    }
  }

  for (const stats of map.values()) {
    stats.averageSpeed = stats.totalMovingTime > 0
      ? stats.totalDistance / stats.totalMovingTime
      : 0;
  }

  const regions = Array.from(map.values()).sort((a, b) => b.totalDistance - a.totalDistance);
  return { regions, points };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [activities, stateFeatures] = await Promise.all([
    fetchAllActivities(session.accessToken),
    loadStates(),
  ]);

  const enriched: EnrichedActivity[] = [];
  const yearSet = new Set<number>();

  for (const a of activities) {
    if (!a.start_latlng || a.start_latlng.length !== 2) continue;
    const category = SPORT_TO_CATEGORY[a.sport_type];
    if (!category) continue;

    const [lat, lng] = a.start_latlng as [number, number];
    const country = crg.get_country(lat, lng);
    if (!country?.name) continue;

    const state = country.code === "USA" ? getState(lat, lng, stateFeatures) : null;
    const year = new Date(a.start_date).getUTCFullYear();
    yearSet.add(year);

    enriched.push({
      category,
      year,
      lat,
      lng,
      distance: a.distance,
      moving_time: a.moving_time,
      total_elevation_gain: a.total_elevation_gain,
      kudos_count: a.kudos_count,
      pr_count: a.pr_count,
      country: { name: country.name, code: country.code },
      state,
    });
  }

  function buildScope(
    filter: (a: EnrichedActivity) => boolean,
    region: Region
  ): Record<string, ScopedData> {
    const result: Record<string, ScopedData> = {};
    for (const cat of CATEGORY_LIST) {
      const filtered = enriched.filter((a) => a.category === cat && filter(a));
      result[cat] = aggregate(filtered, region);
    }
    return result;
  }

  const world: Record<string, Record<string, ScopedData>> = {
    allTime: buildScope(() => true, "world"),
  };
  const usa: Record<string, Record<string, ScopedData>> = {
    allTime: buildScope((a) => a.country.code === "USA", "usa"),
  };

  for (const year of yearSet) {
    const yk = String(year);
    world[yk] = buildScope((a) => a.year === year, "world");
    usa[yk] = buildScope((a) => a.year === year && a.country.code === "USA", "usa");
  }

  const years = Array.from(yearSet).sort((a, b) => b - a);

  return NextResponse.json({
    categories: CATEGORY_LIST,
    years,
    world,
    usa,
  } satisfies CountriesResponse);
}
