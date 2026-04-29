// eslint-disable-next-line @typescript-eslint/no-require-imports
const _bpip = require("@turf/boolean-point-in-polygon");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const booleanPointInPolygon: (pt: any, poly: any) => boolean = _bpip.default ?? _bpip;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { feature } = require("topojson-client");

const STATE_DATA = [
  { fips: 1, postal: "AL", name: "Alabama" },
  { fips: 2, postal: "AK", name: "Alaska" },
  { fips: 4, postal: "AZ", name: "Arizona" },
  { fips: 5, postal: "AR", name: "Arkansas" },
  { fips: 6, postal: "CA", name: "California" },
  { fips: 8, postal: "CO", name: "Colorado" },
  { fips: 9, postal: "CT", name: "Connecticut" },
  { fips: 10, postal: "DE", name: "Delaware" },
  { fips: 11, postal: "DC", name: "District of Columbia" },
  { fips: 12, postal: "FL", name: "Florida" },
  { fips: 13, postal: "GA", name: "Georgia" },
  { fips: 15, postal: "HI", name: "Hawaii" },
  { fips: 16, postal: "ID", name: "Idaho" },
  { fips: 17, postal: "IL", name: "Illinois" },
  { fips: 18, postal: "IN", name: "Indiana" },
  { fips: 19, postal: "IA", name: "Iowa" },
  { fips: 20, postal: "KS", name: "Kansas" },
  { fips: 21, postal: "KY", name: "Kentucky" },
  { fips: 22, postal: "LA", name: "Louisiana" },
  { fips: 23, postal: "ME", name: "Maine" },
  { fips: 24, postal: "MD", name: "Maryland" },
  { fips: 25, postal: "MA", name: "Massachusetts" },
  { fips: 26, postal: "MI", name: "Michigan" },
  { fips: 27, postal: "MN", name: "Minnesota" },
  { fips: 28, postal: "MS", name: "Mississippi" },
  { fips: 29, postal: "MO", name: "Missouri" },
  { fips: 30, postal: "MT", name: "Montana" },
  { fips: 31, postal: "NE", name: "Nebraska" },
  { fips: 32, postal: "NV", name: "Nevada" },
  { fips: 33, postal: "NH", name: "New Hampshire" },
  { fips: 34, postal: "NJ", name: "New Jersey" },
  { fips: 35, postal: "NM", name: "New Mexico" },
  { fips: 36, postal: "NY", name: "New York" },
  { fips: 37, postal: "NC", name: "North Carolina" },
  { fips: 38, postal: "ND", name: "North Dakota" },
  { fips: 39, postal: "OH", name: "Ohio" },
  { fips: 40, postal: "OK", name: "Oklahoma" },
  { fips: 41, postal: "OR", name: "Oregon" },
  { fips: 42, postal: "PA", name: "Pennsylvania" },
  { fips: 44, postal: "RI", name: "Rhode Island" },
  { fips: 45, postal: "SC", name: "South Carolina" },
  { fips: 46, postal: "SD", name: "South Dakota" },
  { fips: 47, postal: "TN", name: "Tennessee" },
  { fips: 48, postal: "TX", name: "Texas" },
  { fips: 49, postal: "UT", name: "Utah" },
  { fips: 50, postal: "VT", name: "Vermont" },
  { fips: 51, postal: "VA", name: "Virginia" },
  { fips: 53, postal: "WA", name: "Washington" },
  { fips: 54, postal: "WV", name: "West Virginia" },
  { fips: 55, postal: "WI", name: "Wisconsin" },
  { fips: 56, postal: "WY", name: "Wyoming" },
];

const FIPS_TO_INFO = new Map(
  STATE_DATA.map((s) => [s.fips, { postal: s.postal, name: s.name }])
);

export const POSTAL_TO_FIPS: Record<string, string> = Object.fromEntries(
  STATE_DATA.map((s) => [s.postal, String(s.fips)])
);

const STATES_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedFeatures: any[] | null = null;

export async function loadStates() {
  if (cachedFeatures) return cachedFeatures;
  const res = await fetch(STATES_URL);
  const topo = await res.json();
  const collection = feature(topo, topo.objects.states);
  cachedFeatures = collection.features;
  return cachedFeatures!;
}

export interface StateInfo {
  name: string;
  code: string; // postal abbreviation
}

export function getState(
  lat: number,
  lng: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  features: any[]
): StateInfo | null {
  const pt = { type: "Point" as const, coordinates: [lng, lat] };
  for (const f of features) {
    if (booleanPointInPolygon(pt, f)) {
      const info = FIPS_TO_INFO.get(Number(f.id));
      if (info) return { name: info.name, code: info.postal };
    }
  }
  return null;
}
