"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import type {
  CountriesResponse,
  RegionStats,
  Category,
  Region,
} from "@/lib/types";
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
  return `${m}:${s.toString().padStart(2, "0")}`;
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
  const placeLabel = region === "world" ? "Countries" : "States";

  function handleShare() {
    const text = `Stamped — ${regions.length} ${placeLabel.toLowerCase()}, ${formatDistance(totals.distance)} km of ${category.toLowerCase()}.`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "Stamped", text, url: window.location.href }).catch(() => {});
    } else if (typeof navigator !== "undefined") {
      navigator.clipboard?.writeText(`${text} ${window.location.href}`);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-5 py-6 max-w-2xl mx-auto">
      {/* Editorial brand header */}
      <header className="w-full flex items-start justify-between text-[10px] tracking-[0.25em] uppercase font-mono text-ink-dim mb-6">
        <span>+ A Concept By</span>
        <span className="text-ink">Stamped</span>
        <span>No. 001 +</span>
      </header>

      {status === "loading" && <p className="text-ink-dim">Loading...</p>}

      {status === "unauthenticated" && (
        <div className="flex flex-col items-center gap-8 mt-20">
          <h1 className="font-serif text-7xl text-center leading-[0.95]">
            Every step,<br />
            <span className="italic text-passport-accent">stamped.</span>
          </h1>
          <p className="text-ink-dim max-w-sm text-center text-sm leading-relaxed">
            Connect your Strava and watch every run, hike, and ride get stamped onto a personal atlas of every country and state you&apos;ve moved in.
          </p>
          <button
            onClick={() => signIn("strava")}
            className="bg-passport-accent hover:bg-[#a8e562] transition-colors text-canvas font-semibold px-7 py-3 rounded-full text-sm tracking-wide"
          >
            CONNECT STRAVA →
          </button>
        </div>
      )}

      {status === "authenticated" && (
        <div className="w-full flex flex-col gap-8">
          {/* Account row */}
          <div className="flex items-center justify-between text-xs text-ink-dim font-mono uppercase tracking-wider">
            <span>{session.user?.name}</span>
            <button onClick={() => signOut()} className="hover:text-ink transition-colors">
              Sign out →
            </button>
          </div>

          {loading && <p className="text-center text-ink-dim text-sm">Fetching activities...</p>}

          {data && (
            <>
              {/* Filter controls */}
              <div className="flex flex-col gap-3">
                <SegmentedControl
                  options={[
                    { value: "world", label: "🌍 World" },
                    { value: "usa", label: "🇺🇸 USA" },
                  ]}
                  value={region}
                  onChange={(v) => setRegion(v as Region)}
                />
                <SegmentedControl
                  options={data.categories.map((c) => ({
                    value: c,
                    label: `${CATEGORY_ICONS[c]} ${c}`,
                  }))}
                  value={category}
                  onChange={(v) => setCategory(v as Category)}
                />
                <div className="flex gap-1.5 overflow-x-auto -mx-5 px-5 scrollbar-hide pb-1">
                  <YearTab
                    label="ALL TIME"
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
              </div>

              {/* PASSPORT POSTER — the shareable hero */}
              <section className="relative grain leather bg-canvas-raised rounded-3xl border border-canvas-line overflow-hidden">
                {/* Corner marks */}
                <div className="absolute top-3 left-3 font-mono text-[10px] text-ink-faint">+</div>
                <div className="absolute top-3 right-3 font-mono text-[10px] text-ink-faint">+</div>
                <div className="absolute bottom-3 left-3 font-mono text-[10px] text-ink-faint">+</div>
                <div className="absolute bottom-3 right-3 font-mono text-[10px] text-ink-faint">+</div>

                <div className="px-5 pt-6 pb-2 flex items-start justify-between">
                  <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink-dim">
                    {region === "world" ? "World Edition" : "USA Edition"}
                  </div>
                  <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink-dim">
                    {scope === "allTime" ? "All Time" : scope}
                  </div>
                </div>

                {/* Hero map */}
                <div className="px-3">
                  <WorldMap
                    region={region}
                    activeCodes={regions.map((r) => r.code)}
                    activeRegions={regions.map((r) => ({ name: r.name, code: r.code }))}
                    points={scoped?.points ?? []}
                  />
                </div>

                {/* Title block */}
                <div className="px-5 pt-2 pb-4">
                  <h2 className="font-serif text-5xl leading-[0.95] tracking-tight">
                    {category === "Hike" ? "Hiking" : category === "Ride" ? "Cycling" : "Running"}{" "}
                    <span className="italic text-passport-accent">Stamped</span>
                  </h2>
                  <p className="font-mono text-[10px] tracking-[0.3em] mt-2 text-ink-dim uppercase">
                    Passport · Pass · Pasaporte
                  </p>
                </div>

                {/* Magazine-style stats */}
                <div className="px-5 pb-5">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-6 border-t border-canvas-line pt-5">
                    <BigStat
                      label={placeLabel}
                      value={regions.length.toString()}
                      highlight
                    />
                    <BigStat
                      label="Activities"
                      value={totals.activities.toString()}
                    />
                    <BigStat
                      label="Distance"
                      value={formatDistance(totals.distance)}
                      unit="km"
                    />
                    <BigStat
                      label="Moving Time"
                      value={formatTime(totals.time)}
                    />
                    <BigStat
                      label="Elevation"
                      value={Math.round(totals.elevation).toLocaleString()}
                      unit="m"
                    />
                    <BigStat
                      label="Avg Pace"
                      value={formatPace(overallPace)}
                      unit="/km"
                    />
                  </div>

                  {/* Issued line */}
                  <div className="mt-6 pt-4 border-t border-canvas-line flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                    <span>Issued · {(session.user?.name ?? "Athlete").split(" ")[0]}</span>
                    <span>RP · 2026</span>
                  </div>
                </div>
              </section>

              {/* Share button */}
              <button
                onClick={handleShare}
                className="self-center -mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-dim hover:text-passport-accent transition-colors px-5 py-2 border border-canvas-line rounded-full"
              >
                ↗ Share My Stamped Passport
              </button>

              {/* Per-region breakdown */}
              {regions.length > 0 && (
                <section className="flex flex-col gap-4">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-serif text-2xl">
                      Your <span className="italic">Stamps</span>
                    </h3>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">
                      {regions.length} {placeLabel}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {regions.map((r) => (
                      <RegionRow key={r.code} stats={r} category={category} />
                    ))}
                  </div>
                </section>
              )}

              {regions.length === 0 && (
                <p className="text-center text-ink-dim text-sm py-8 font-mono uppercase tracking-wider text-[11px]">
                  No {category} activities {scope === "allTime" ? "yet" : `in ${scope}`}
                  {region === "usa" ? " · USA" : ""}.
                </p>
              )}

              {/* MRZ-style footer */}
              <footer className="mt-2 pt-6 border-t border-canvas-line">
                <p className="font-mono text-[10px] text-ink-faint break-all leading-relaxed">
                  {`${region.toUpperCase()}<<${scope === "allTime" ? "ALLTIME" : scope}<<${(session.user?.name ?? "ATHLETE").toUpperCase().replace(/\s+/g, "<")}<<${category.toUpperCase()}<<<<<STAMPED<<<`}
                </p>
                <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-ink-faint mt-3 text-center">
                  · End of Stamped ·
                </p>
              </footer>
            </>
          )}
        </div>
      )}
    </main>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="grid gap-1 bg-canvas-raised border border-canvas-line p-1 rounded-full"
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex items-center justify-center gap-2 py-2 rounded-full text-xs font-medium transition-colors ${
            value === o.value
              ? "bg-passport-accent text-canvas"
              : "text-ink-dim hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
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
      className={`shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-mono tracking-wider uppercase transition-colors ${
        active
          ? "bg-canvas-raised text-passport-accent border border-passport-accent/40"
          : "text-ink-dim hover:text-ink border border-canvas-line"
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
  highlight,
}: {
  label: string;
  value: string;
  unit?: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-ink-dim mb-1.5">
        {label}
      </p>
      <p className={`font-serif text-5xl leading-[0.95] tracking-tight ${highlight ? "text-passport-accent" : "text-ink"}`}>
        {value}
        {unit && (
          <span className="font-serif italic text-2xl text-ink-dim ml-1">{unit}</span>
        )}
      </p>
    </div>
  );
}

function PassportStamp() {
  return (
    <svg
      width="36"
      height="28"
      viewBox="0 0 36 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: "rotate(-6deg)", flexShrink: 0 }}
    >
      <rect
        x="1.5"
        y="1.5"
        width="33"
        height="25"
        rx="4"
        stroke="#93D94E"
        strokeWidth="1.5"
        strokeDasharray="2.5 2"
        opacity="0.55"
      />
      <rect
        x="5"
        y="5"
        width="26"
        height="18"
        rx="2"
        stroke="#93D94E"
        strokeWidth="0.75"
        opacity="0.3"
      />
      <path
        d="M12 14l4 4 8-8"
        stroke="#93D94E"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
    </svg>
  );
}

const ACTIVITY_LABEL: Record<Category, [string, string]> = {
  Run: ["run", "runs"],
  Hike: ["hike", "hikes"],
  Ride: ["ride", "rides"],
};

function RegionRow({ stats, category }: { stats: RegionStats; category: Category }) {
  const [singular, plural] = ACTIVITY_LABEL[category];
  return (
    <div className="bg-canvas-raised border border-canvas-line rounded-2xl px-4 py-3 flex items-center gap-3">
      <PassportStamp />
      <div className="flex-1 min-w-0">
        <h4 className="font-serif text-xl leading-tight truncate">{stats.name}</h4>
        <p className="font-mono text-[10px] uppercase tracking-wider text-ink-dim mt-0.5">
          {stats.activityCount} {stats.activityCount === 1 ? singular : plural} ·{" "}
          {(stats.totalDistance / 1000).toFixed(1)} km · {formatTime(stats.totalMovingTime)}
        </p>
      </div>
      <div className="text-right">
        <p className="font-serif text-2xl leading-none">
          {(stats.totalDistance / 1000).toFixed(0)}
          <span className="font-serif italic text-sm text-ink-dim ml-0.5">km</span>
        </p>
      </div>
    </div>
  );
}
