import { NextRequest, NextResponse } from "next/server";
import {
  assertWriteKey,
  loadRiderNotes,
  saveRiderNotes,
  type PlaceKind,
  type RiderNote,
} from "@/lib/store";

export const dynamic = "force-dynamic";

function uid(): string {
  return `note_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(req: NextRequest) {
  try {
    assertWriteKey(req.headers.get("x-walker-key"));
    const body = (await req.json()) as {
      kind?: PlaceKind | "auto";
      name?: string;
      tip?: string;
      area?: string;
      transcript?: string;
      wasteMinutes?: number;
    };

    const transcript = (body.transcript || "").trim();
    let kind: PlaceKind =
      body.kind === "merchant" || body.kind === "residence"
        ? body.kind
        : /(餐廳|食肆|麥當勞|肯德基|超市|便利店|舖|商場)/.test(`${body.name || ""} ${transcript}`)
          ? "merchant"
          : "residence";

    let name = (body.name || "").trim();
    let tip = (body.tip || "").trim();

    if ((!name || !tip) && transcript) {
      const m = transcript.match(/^(?:餐廳|住址|地址)?\s*([^，,。]+?)(?:[，,。]|$)/);
      if (!name && m) name = m[1].replace(/^(餐廳|住址|地址)/, "").trim();
      if (!tip) {
        tip = transcript.replace(m?.[0] || "", "").replace(/^[,，。\s]+/, "").trim() || transcript;
      }
      tip = tip.replace(/花(?:咗|了)?\s*\d+\s*分鐘?/g, "").trim() || tip;
    }

    if (!name || !tip) {
      return NextResponse.json({ error: "需要名稱同點入詳情" }, { status: 400 });
    }

    const note: RiderNote = {
      id: uid(),
      kind,
      name,
      tip,
      area: (body.area || "").trim() || undefined,
      transcript: transcript || undefined,
      wasteMinutes: body.wasteMinutes || undefined,
      createdAt: new Date().toISOString(),
      source: "rider",
    };

    const doc = await loadRiderNotes();
    doc.notes.push(note);
    doc.updatedAt = new Date().toISOString().slice(0, 10);
    const mode = await saveRiderNotes(doc, `rider-note: ${kind} ${name}`);

    return NextResponse.json({ ok: true, mode, note });
  } catch (err) {
    const status = (err as { status?: number }).status || 500;
    return NextResponse.json({ error: (err as Error).message || "save failed" }, { status });
  }
}
