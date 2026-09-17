import { readFile, writeFile } from "fs/promises";
import path from "path";
import { SEED_BUNDLE } from "./seed";
import type {
  DatasetBundle,
  PlaceKind,
  PlaceRecord,
  RiderNote,
  RiderNotesFile,
} from "./types";

export type { DatasetBundle, PlaceKind, PlaceRecord, RiderNote, RiderNotesFile };

const DATA_DIR = path.join(process.cwd(), "data");

function norm(s: string): string {
  return s.toLowerCase().replace(/[\s\-_/｜|]+/g, "").replace(/[()（）\[\]【】]/g, "");
}

export function scoreMatch(query: string, item: PlaceRecord | RiderNote): number {
  const q = norm(query);
  if (!q) return 0;
  const aliases = "nameAliases" in item ? item.nameAliases || [] : [];
  const tip = "entranceTip" in item ? item.entranceTip : "tip" in item ? item.tip : "";
  const hay = norm([item.name, item.area, tip, ...aliases].filter(Boolean).join(" "));
  if (!hay) return 0;
  if (hay.includes(q) || q.includes(norm(item.name))) return 100;
  const tokens = query
    .toLowerCase()
    .split(/[\s,，、\-_/｜|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  if (!tokens.length) return 0;
  let hit = 0;
  for (const t of tokens) if (hay.includes(norm(t))) hit += 1;
  return Math.round((hit / tokens.length) * 85);
}

async function readJsonFile<T>(fileName: string): Promise<T> {
  const raw = await readFile(path.join(DATA_DIR, fileName), "utf8");
  return JSON.parse(raw) as T;
}

async function writeJsonFile(fileName: string, data: unknown): Promise<void> {
  await writeFile(path.join(DATA_DIR, fileName), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

type GithubConfig = {
  token: string;
  owner: string;
  repo: string;
  branch: string;
};

function githubConfig(): GithubConfig | null {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const repoFull = process.env.GITHUB_REPO; // owner/repo
  if (!token || !repoFull || !repoFull.includes("/")) return null;
  const [owner, repo] = repoFull.split("/");
  return {
    token,
    owner,
    repo,
    branch: process.env.GITHUB_BRANCH || "main",
  };
}

async function githubGetFile(cfg: GithubConfig, filePath: string): Promise<{ sha: string; content: string } | null> {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${filePath}?ref=${encodeURIComponent(cfg.branch)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status}`);
  const json = (await res.json()) as { sha: string; content: string; encoding: string };
  const content = Buffer.from(json.content, "base64").toString("utf8");
  return { sha: json.sha, content };
}

async function githubPutFile(
  cfg: GithubConfig,
  filePath: string,
  content: string,
  message: string,
  sha?: string,
): Promise<void> {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${filePath}`;
  const body: Record<string, string> = {
    message,
    content: Buffer.from(content, "utf8").toString("base64"),
    branch: cfg.branch,
  };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub PUT failed: ${res.status} ${text}`);
  }
}

export function storageMode(): "github" | "local" {
  return githubConfig() ? "github" : "local";
}

export async function loadBundle(): Promise<DatasetBundle> {
  const cfg = githubConfig();
  if (cfg) {
    const file = await githubGetFile(cfg, "data/bundle.json");
    if (file) return JSON.parse(file.content) as DatasetBundle;
  }
  try {
    return await readJsonFile<DatasetBundle>("bundle.json");
  } catch {
    return SEED_BUNDLE;
  }
}

export async function loadRiderNotes(): Promise<RiderNotesFile> {
  const cfg = githubConfig();
  if (cfg) {
    const file = await githubGetFile(cfg, "data/rider-notes.json");
    if (file) return JSON.parse(file.content) as RiderNotesFile;
    return { version: "1.0.0", updatedAt: new Date().toISOString().slice(0, 10), notes: [] };
  }
  try {
    return await readJsonFile<RiderNotesFile>("rider-notes.json");
  } catch {
    return { version: "1.0.0", updatedAt: new Date().toISOString().slice(0, 10), notes: [] };
  }
}

export async function saveRiderNotes(doc: RiderNotesFile, commitMessage: string): Promise<"github" | "local"> {
  const payload = `${JSON.stringify(doc, null, 2)}\n`;
  const cfg = githubConfig();
  if (cfg) {
    const existing = await githubGetFile(cfg, "data/rider-notes.json");
    await githubPutFile(cfg, "data/rider-notes.json", payload, commitMessage, existing?.sha);
    return "github";
  }
  await writeJsonFile("rider-notes.json", doc);
  return "local";
}

export function mergePlaces(bundle: DatasetBundle, notes: RiderNotesFile): PlaceRecord[] {
  const map = new Map<string, PlaceRecord>();

  const upsert = (rec: PlaceRecord) => {
    const key = `${rec.kind}:${norm(rec.name)}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, rec);
      return;
    }
    map.set(key, {
      ...prev,
      ...rec,
      entranceTip: rec.entranceTip || prev.entranceTip,
      visits: Math.max(prev.visits || 0, rec.visits || 0),
      nameAliases: Array.from(new Set([...(prev.nameAliases || []), ...(rec.nameAliases || [])])),
    });
  };

  for (const m of bundle.merchants || []) upsert({ ...m, kind: "merchant" });
  for (const r of bundle.residences || []) upsert({ ...r, kind: "residence" });
  for (const n of notes.notes || []) {
    upsert({
      id: n.id,
      kind: n.kind,
      name: n.name,
      area: n.area,
      entranceTip: n.tip,
      source: "rider",
      visits: 1,
      lastWasteMinutes: n.wasteMinutes,
      updatedAt: n.createdAt.slice(0, 10),
      status: "active",
    });
  }

  return Array.from(map.values());
}

export function searchPlaces(places: PlaceRecord[], query: string, limit = 8): Array<{ item: PlaceRecord; score: number }> {
  return places
    .map((item) => ({ item, score: scoreMatch(query, item) }))
    .filter((x) => x.score >= 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function assertWriteKey(reqKey: string | null): void {
  const expected = process.env.WALKER_WRITE_KEY;
  if (!expected) return; // open write in local/dev if unset
  if (!reqKey || reqKey !== expected) {
    const err = new Error("Unauthorized");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
}
