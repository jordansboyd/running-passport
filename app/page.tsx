"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import type {
  CountriesResponse,
  RegionStats,
  Category,
  Region,
} from "@/app/api/countries/route";
import { WorldMap } from "@/components/WorldMap";

const CATEGORY_ICONS: Record<Category, string> = {
  Run: "🏃",
  Hike: "🥾",
  Ride: "🚴",
};

function formatDistance(metres: number) {
  const km = metres / 1000;
  return km >= 1000 ? `${Math.round(km).toLocaleString()}` : km.toFixed(1);
}

function formatTime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatPace(ms: number) {
  if (ms === 0) return "—";
  const secsPerKm = 1000 / ms;
  const m = Math.floor(secsPerKm / 60);
  const s = Math.round(secsPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

export default function Home() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<CountriesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState<Region>("world");
  const [scope, setScope] = useState<string>("allTime");
  const [category, setCategory] = useState<Category>("Run");

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    fetch("/api/countries")
      .then((r) => r.json())
      .then((d: CountriesResponse) => setData(d))
      .finally(() => setLoading(false));
  }, [session]);

  const scoped = useMemo(() => {
    if (!data) return null;
    const regionData = region === "world" ? data.world : data.usa;
    return regionData[scope]?.[category] ?? { regions: [], points: [] };
  }, [data, region, scope, category]);

  const regions: RegionStats[] = scoped?.regions ?? [];

  const totals = useMemo(() => {
    return regions.reduce(
      (acc, c) => ({
        activities: acc.activities + c.activityCount,
        distance: acc.distance + c.totalDistance,
        time: acc.time + c.totalMovingTime,
        elevation: acc.elevation + c.totalElevationGain,
        kudos: acc.kudos + c.totalKudos,
        prs: acc.prs + c.totalPRs,
      }),
      { activities: 0, distance: 0, time: 0, elevation: 0, kudos: 0, prs: 0 }
    );
  }, [regions]);

  const overallPace = totals.time > 0 ? totals.distance / totals.time : 0;
  const placeLabel = region === "world" ? "COUNTRIES" : "STATES";

  return (
    <main className="flex flex-col items-center py-8 px-4 gap-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Running Passport</h1>
      </div>

      {status === "loading" && <p className="text-slate-400">Loading...</p>}

      {status === "unauthenticated" && (
        <button
          onClick={() => signIn("strava")}
          className="mt-12 flex items-center gap-3 bg-[#93D94E] hover:bg-[#a8e562] transition-colors text-[#223240] font-semibold px-6 py-3 rounded-xl text-lg"
        >
          Connect Strava
        </button>
      )}

      {status === "authenticated" && (
        <div className="w-full flex flex-col gap-6">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>
              Signed in as <span className="text-white font-medium">{session.user?.name}</span>
            </span>
            <button onClick={() => signOut()} className="hover:text-white transition-colors">
              Sign out
            </button>
          </div>

          {loading && <p className="text-center text-slate-400">Fetching your activities...</p>}

          {data && (
            <>
              {/* Region selector */}
              <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-2xl">
                <RegionTab label="🌍 World" active={region === "world"} onClick={() => setRegion("world")} />
                <RegionTab label="🇺🇸 USA" active={region === "usa"} onClick={() => setRegion("usa")} />
              </div>

              {/* Category selector */}
              <div className="grid grid-cols-3 gap-2 bg-white/5 p-1 rounded-2xl">
                {data.categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      category === c
                        ? "bg-[#93D94E] text-[#223240] shadow-lg"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    <span className="text-base leading-none">{CATEGORY_ICONS[c]}</span>
                    {c}
                  </button>
                ))}
              </div>

              {/* Year tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
                <YearTab
                  label="ALL-TIME"
                  active={scope === "allTime"}
                  onClick={() => setScope("allTime")}
                />
                {data.years.map((year) => (
                  <YearTab
                    key={year}
                    label={String(year)}
                    active={scope === String(year)}
                    onClick={() => setScope(String(year))}
                  />
                ))}
              </div>

              {/* Map hero */}
              <WorldMap
                region={region}
                activeCodes={regions.map((r) => r.code)}
                activeRegions={regions.map((r) => ({ name: r.name, code: r.code }))}
                points={scoped?.points ?? []}
              />

              {/* Passport title block */}
              <div className="border-t border-b border-[#3B8C66]/30 py-4">
                <h2 className="text-2xl font-extrabold tracking-wide uppercase">
                  My Running Passport
                </h2>
                <p className="text-xs text-slate-400/80 tracking-[0.25em] mt-1">
                  PASSPORT · PASS · PASAPORTE
                </p>
              </div>

              {/* Big stats grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <BigStat label="ACTIVITIES" value={totals.activities.toString()} />
                <BigStat label="DISTANCE" value={formatDistance(totals.distance)} unit="km" />
                <BigStat label="MOVING TIME" value={formatTime(totals.time)} />
                <BigStat label={placeLabel} value={regions.length.toString()} />
                <BigStat
                  label="ELEVATION"
                  value={Math.round(totals.elevation).toLocaleString()}
                  unit="m"
                />
                <BigStat label="AVG PACE" value={formatPace(overallPace)} />
              </div>

              {/* Per-region breakdown */}
              <div className="flex flex-col gap-3">
                {regions.map((r) => (
                  <RegionCard key={r.code} stats={r} />
                ))}
                {regions.length === 0 && (
                  <p className="text-center text-slate-400/80 text-sm py-8">
                    No {category} activities {scope === "allTime" ? "yet" : `in ${scope}`}
                    {region === "usa" ? " in the USA" : ""}.
                  </p>
                )}
              </div>

              {/* MRZ-style footer */}
              <div className="mt-4 pt-4 border-t border-[#3B8C66]/30">
                <p className="font-mono text-[10px] text-slate-400/60 break-all leading-relaxed">
                  {`${region.toUpperCase()}<<${scope === "allTime" ? "ALLTIME" : scope}<<${(session.user?.name ?? "ATHLETE").toUpperCase().replace(/\s+/g, "<")}<<RUNNING<<<<<PASSPORT<<<`}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}

function RegionTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
        active ? "bg-[#93D94E] text-[#223240] shadow-lg" : "text-slate-300 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function YearTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold tracking-wide transition-colors ${
        active
          ? "bg-white/10 text-white border border-white/20"
          : "text-slate-400/80 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function BigStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div>
      <p className="text-xs text-slate-400/80 tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-extrabold tracking-tight">
        {value}
        {unit && <span className="text-xl font-bold text-slate-300/80 ml-1">{unit}</span>}
      </p>
    </div>
  );
}

function RegionCard({ stats }: { stats: RegionStats }) {
  return (
    <div className="bg-white/5 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{stats.name}</h3>
        <span className="text-xs text-slate-400/80 bg-white/5 px-2 py-1 rounded-full">
          {stats.activityCount} {stats.activityCount === 1 ? "activity" : "activities"}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <MiniStat label="Distance" value={`${(stats.totalDistance / 1000).toFixed(1)} km`} />
        <MiniStat label="Time" value={formatTime(stats.totalMovingTime)} />
        <MiniStat label="Pace" value={formatPace(stats.averageSpeed)} />
        <MiniStat label="Elevation" value={`${Math.round(stats.totalElevationGain)} m`} />
        <MiniStat label="Kudos" value={stats.totalKudos.toString()} />
        <MiniStat label="PRs" value={stats.totalPRs.toString()} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-slate-400/80 uppercase tracking-wider">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
