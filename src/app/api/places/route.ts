import { NextRequest, NextResponse } from "next/server";
import { loadBundle, loadRiderNotes, mergePlaces, searchPlaces } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (!q) {
    return NextResponse.json({ query: q, results: [] });
  }
  const [bundle, notes] = await Promise.all([loadBundle(), loadRiderNotes()]);
  const places = mergePlaces(bundle, notes);
  const results = searchPlaces(places, q, 8);
  return NextResponse.json({ query: q, results });
}
