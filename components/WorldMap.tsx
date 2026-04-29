"use client";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { alpha3ToNumeric, alpha3ToAlpha2 } from "i18n-iso-countries";
import type { ActivityPoint, Region } from "@/lib/types";

// Include both unpadded and zero-padded FIPS so geo.id matches regardless of topojson format
const POSTAL_TO_FIPS: Record<string, string[]> = {
  AL: ["1", "01"], AK: ["2", "02"], AZ: ["4", "04"], AR: ["5", "05"],
  CA: ["6", "06"], CO: ["8", "08"], CT: ["9", "09"], DE: ["10"],
  DC: ["11"], FL: ["12"], GA: ["13"], HI: ["15"], ID: ["16"], IL: ["17"],
  IN: ["18"], IA: ["19"], KS: ["20"], KY: ["21"], LA: ["22"], ME: ["23"],
  MD: ["24"], MA: ["25"], MI: ["26"], MN: ["27"], MS: ["28"], MO: ["29"],
  MT: ["30"], NE: ["31"], NV: ["32"], NH: ["33"], NJ: ["34"], NM: ["35"],
  NY: ["36"], NC: ["37"], ND: ["38"], OH: ["39"], OK: ["40"], OR: ["41"],
  PA: ["42"], RI: ["44"], SC: ["45"], SD: ["46"], TN: ["47"], TX: ["48"],
  UT: ["49"], VT: ["50"], VA: ["51"], WA: ["53"], WV: ["54"], WI: ["55"],
  WY: ["56"],
};

const WORLD_GEO = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const USA_GEO = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

function flagEmoji(alpha2: string) {
  return [...alpha2.toUpperCase()]
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join("");
}

interface WorldMapProps {
  region: Region;
  activeCodes: string[];
  activeRegions: { name: string; code: string }[];
  points: ActivityPoint[];
}

export function WorldMap({ region, activeCodes, activeRegions, points }: WorldMapProps) {
  const isUSA = region === "usa";

  const activeIdSet = new Set(
    isUSA
      ? activeCodes.flatMap((c) => POSTAL_TO_FIPS[c] ?? [])
      : activeCodes.map((c) => alpha3ToNumeric(c)).filter(Boolean)
  );

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="w-full rounded-2xl overflow-hidden">
        <ComposableMap
          projection={isUSA ? "geoAlbersUsa" : "geoMercator"}
          projectionConfig={isUSA ? { scale: 900 } : { scale: 100, center: [0, 0] }}
          width={800}
          height={isUSA ? 460 : 500}
          style={{ width: "100%", height: "auto", display: "block" }}
        >
          <Geographies geography={isUSA ? USA_GEO : WORLD_GEO}>
            {({ geographies }: { geographies: any[] }) =>
              geographies.map((geo: any) => {
                const isActive = activeIdSet.has(String(geo.id));
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isActive ? "#93D94E" : "#1d2e25"}
                    stroke="#0b1410"
                    strokeWidth={0.4}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: isActive ? "#a8e562" : "#243a30" },
                      pressed: { outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>
          {points.map((p, i) => (
            <Marker key={i} coordinates={[p.lng, p.lat]}>
              <circle r={2} fill="#f5f1e8" stroke="#0b1410" strokeWidth={0.5} opacity={0.9} />
            </Marker>
          ))}
        </ComposableMap>
      </div>

      {activeRegions.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center px-3 pb-1">
          {activeRegions.map((r) => (
            <RegionBadge key={r.code} name={r.name} code={r.code} region={region} />
          ))}
        </div>
      )}
    </div>
  );
}

function RegionBadge({ name, code, region }: { name: string; code: string; region: Region }) {
  if (region === "world") {
    const alpha2 = alpha3ToAlpha2(code);
    const flag = alpha2 ? flagEmoji(alpha2) : "🏳️";
    return (
      <span title={name} className="text-2xl leading-none cursor-default">
        {flag}
      </span>
    );
  }

  // US state: circle flag image from HatScripts CDN
  return (
    <img
      src={`https://hatscripts.github.io/circle-flags/flags/us-${code.toLowerCase()}.svg`}
      alt={code}
      title={name}
      width={36}
      height={36}
      className="rounded-full shadow"
    />
  );
}
