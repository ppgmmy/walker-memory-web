import { NextResponse } from "next/server";
import { loadBundle, loadRiderNotes, mergePlaces, storageMode } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const [bundle, notes] = await Promise.all([loadBundle(), loadRiderNotes()]);
  const places = mergePlaces(bundle, notes);
  return NextResponse.json({
    storage: storageMode(),
    updatedAt: notes.updatedAt || bundle.updatedAt,
    counts: {
      merchants: places.filter((p) => p.kind === "merchant").length,
      residences: places.filter((p) => p.kind === "residence").length,
      riderNotes: notes.notes.length,
    },
    places,
    recentNotes: notes.notes.slice(-20).reverse(),
  });
}
