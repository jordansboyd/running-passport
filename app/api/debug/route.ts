import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(
    "https://www.strava.com/api/v3/athlete/activities?per_page=1&page=1",
    { headers: { Authorization: `Bearer ${session.accessToken}` } }
  );

  const activities = await res.json();
  return NextResponse.json(activities[0] ?? {});
}
