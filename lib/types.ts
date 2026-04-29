export const CATEGORIES = {
  Run: ["Run", "TrailRun"],
  Hike: ["Hike", "Walk"],
  Ride: ["Ride", "VirtualRide"],
} as const;

export type Category = keyof typeof CATEGORIES;
export const CATEGORY_LIST: Category[] = ["Run", "Hike", "Ride"];

export type Region = "world" | "usa";

export interface RegionStats {
  name: string;
  code: string;
  activityCount: number;
  totalDistance: number;
  totalMovingTime: number;
  averageSpeed: number;
  totalElevationGain: number;
  totalKudos: number;
  totalPRs: number;
}

export interface ActivityPoint {
  lat: number;
  lng: number;
}

export interface ScopedData {
  regions: RegionStats[];
  points: ActivityPoint[];
}

export interface CountriesResponse {
  categories: Category[];
  years: number[];
  world: Record<string, Record<string, ScopedData>>;
  usa: Record<string, Record<string, ScopedData>>;
}
