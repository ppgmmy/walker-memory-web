"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PlaceKind = "merchant" | "residence";

type PlaceRecord = {
  id: string;
  kind: PlaceKind;
  name: string;
  area?: string;
  district?: string;
  address?: string;
  entranceTip?: string;
  visits?: number;
  lastWasteMinutes?: number;
  source?: string;
  status?: string;
};

type Hit = { item: PlaceRecord; score: number };

const KEY_STORAGE = "walker-write-key";

function mapsUrl(name: string, address?: string) {
  const q = encodeURIComponent([name, address].filter(Boolean).join(" "));
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function walkingDir(pickup: string, drop: string) {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent("我的位置")}&destination=${encodeURIComponent(drop)}&waypoints=${encodeURIComponent(pickup)}&travelmode=walking`;
}

export default function HomePage() {
  const [tab, setTab] = useState<"go" | "record" | "done">("go");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [storage, setStorage] = useState("...");
  const [counts, setCounts] = useState({ merchants: 0, residences: 0, riderNotes: 0 });
  const [writeKey, setWriteKey] = useState("");

  const [kind, setKind] = useState<"auto" | PlaceKind>("auto");
  const [name, setName] = useState("");
  const [tip, setTip] = useState("");
  const [area, setArea] = useState("");
  const [waste, setWaste] = useState("");
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const recogRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  const selected = hits[0]?.item;

  useEffect(() => {
    setWriteKey(localStorage.getItem(KEY_STORAGE) || "");
    void refreshMeta();
  }, []);

  async function refreshMeta() {
    try {
      const res = await fetch("/api/dataset", { cache: "no-store" });
      const data = await res.json();
      setStorage(data.storage);
      setCounts(data.counts);
    } catch {
      setStorage("error");
    }
  }

  async function lookup(q = query) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/places?q=${encodeURIComponent(q.trim())}`, { cache: "no-store" });
      const data = await res.json();
      setHits(data.results || []);
      if ((data.results || []).length) {
        const top = data.results[0].item as PlaceRecord;
        setName(top.name);
        setTip(top.entranceTip || "");
        setArea(top.area || "");
        setKind(top.kind);
      }
    } catch {
      setError("查詢失敗，請再試");
    } finally {
      setLoading(false);
    }
  }

  function ensureRecog() {
    const w = window as Window & {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    type SpeechRec = {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      start: () => void;
      stop: () => void;
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return null;
    if (recogRef.current) return recogRef.current;
    const recog = new SR();
    recog.lang = "zh-HK";
    recog.continuous = false;
    recog.interimResults = true;
    recog.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
      setTranscript(text.trim());
      const last = event.results[event.results.length - 1] as ArrayLike<{ transcript: string }> & { isFinal?: boolean };
      if (last.isFinal) applyTranscript(text.trim());
    };
    recog.onerror = () => setListening(false);
    recog.onend = () => setListening(false);
    recogRef.current = recog;
    return recog;
  }

  function applyTranscript(text: string) {
    const m = text.match(/^(?:餐廳|住址|地址)?\s*([^，,。]+?)(?:[，,。]|$)/);
    if (m) {
      const n = m[1].replace(/^(餐廳|住址|地址)/, "").trim();
      if (n) setName(n);
      const rest = text.replace(m[0], "").replace(/^[,，。\s]+/, "").trim();
      if (rest) setTip(rest.replace(/花(?:咗|了)?\s*\d+\s*分鐘?/g, "").trim() || rest);
    } else if (!name) {
      setName(text.slice(0, 24));
      setTip(text);
    } else {
      setTip(text);
    }
    const wasteMatch = text.match(/花(?:咗|了)?\s*(\d+)\s*分/);
    if (wasteMatch) setWaste(wasteMatch[1]);
    if (/(餐廳|食肆|麥當勞|肯德基|超市|便利店|舖|商場)/.test(text)) setKind("merchant");
    else if (/(住址|屋苑|邨|花園|座)/.test(text)) setKind("residence");
  }

  function toggleMic() {
    const recog = ensureRecog();
    if (!recog) {
      setError("呢個瀏覽器唔支援語音。用 Android Chrome，或直接打字。");
      return;
    }
    setError("");
    if (listening) {
      recog.stop();
      return;
    }
    setListening(true);
    setTranscript("");
    recog.start();
  }

  async function saveNote() {
    setSaveMsg("");
    setError("");
    if (writeKey) localStorage.setItem(KEY_STORAGE, writeKey);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(writeKey ? { "x-walker-key": writeKey } : {}),
        },
        body: JSON.stringify({
          kind,
          name,
          tip,
          area,
          transcript,
          wasteMinutes: waste ? Number(waste) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "儲存失敗");
      setSaveMsg(`已記錄（${data.mode === "github" ? "已寫入 GitHub" : "本機 data 檔"}）：${data.note.name}`);
      await refreshMeta();
      if (name) await lookup(name);
      setTab("go");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const highlight = useMemo(() => hits.slice(0, 3), [hits]);

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-16 pt-5">
      <div className="mb-3 inline-flex rounded-full border border-[rgba(62,207,142,0.35)] bg-[rgba(62,207,142,0.12)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
        送餐即查 · 講完即記 · 下次 highlight
      </div>
      <h1 className="mb-1 text-2xl font-bold tracking-wide">步兵記憶庫</h1>
      <p className="mb-4 text-sm leading-relaxed text-[var(--muted)]">
        實時搵餐廳／住址詳情；送完用口講記錄入口。資料可寫入 GitHub（Vercel 上線後持久）。
        而家 storage：<strong className="text-[var(--accent2)]">{storage}</strong>
        {" · "}商戶 {counts.merchants}／住宅 {counts.residences}／筆記 {counts.riderNotes}
      </p>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {(
          [
            ["go", "而家去邊"],
            ["record", "錄音記錄"],
            ["done", "送完補記"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-xl border px-2 py-3 text-sm font-bold ${
              tab === id
                ? "border-[rgba(62,207,142,0.45)] bg-[rgba(62,207,142,0.18)] text-[var(--accent)]"
                : "border-[var(--line)] bg-white/5 text-[var(--muted)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "go" && (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 backdrop-blur">
          <h2 className="mb-2 text-base font-bold">接單後即查</h2>
          <label className="mb-1 block text-xs text-[var(--muted)]">餐廳／屋苑／關鍵字</label>
          <input
            className="mb-3 w-full rounded-xl border border-[var(--line)] bg-black/30 px-3 py-3"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例如：置樂 A 座 / 市廣場麥當勞"
            onKeyDown={(e) => {
              if (e.key === "Enter") void lookup();
            }}
          />
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl bg-[var(--accent)] px-4 py-3 font-bold text-[#062016]"
              onClick={() => void lookup()}
              disabled={loading}
            >
              {loading ? "查緊…" : "查記憶庫"}
            </button>
            {selected && (
              <a
                className="rounded-xl border border-[rgba(240,199,94,0.35)] bg-[rgba(240,199,94,0.16)] px-4 py-3 font-bold text-[var(--accent2)]"
                href={
                  hits[0] && hits[1]
                    ? walkingDir(hits.find((h) => h.item.kind === "merchant")?.item.name || selected.name, hits.find((h) => h.item.kind === "residence")?.item.name || selected.name)
                    : mapsUrl(selected.name, selected.address)
                }
                target="_blank"
                rel="noreferrer"
              >
                開地圖
              </a>
            )}
          </div>

          {!highlight.length && <p className="text-sm text-[var(--muted)]">未有命中。第一次去完記得去「錄音記錄」。</p>}
          {highlight.map(({ item, score }) => (
            <article
              key={item.id}
              className="mb-3 rounded-2xl border-2 border-[rgba(240,199,94,0.7)] bg-[linear-gradient(180deg,rgba(240,199,94,0.2),rgba(240,199,94,0.06))] p-3 shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
            >
              <div className="mb-2 inline-block rounded-full bg-[var(--accent2)] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#3a2a00]">
                {item.kind === "merchant" ? "商戶" : "住宅"} · 命中 {score}分
              </div>
              <h3 className="text-lg font-bold">{item.name}</h3>
              <p className="mt-2 rounded-xl border-l-4 border-[var(--accent2)] bg-black/30 p-3 text-base leading-relaxed text-[#fff8dd]">
                👉 {item.entranceTip || "未有點入詳情——送完講低就有"}
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {[item.area || item.district, item.source, item.visits ? `去過 ${item.visits} 次` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-[var(--line)] bg-white/10 px-3 py-2 text-xs font-semibold"
                  onClick={() => {
                    setName(item.name);
                    setTip(item.entranceTip || "");
                    setArea(item.area || "");
                    setKind(item.kind);
                    setTab("record");
                  }}
                >
                  用呢筆去補記
                </button>
                <a
                  className="rounded-lg border border-[var(--line)] bg-white/10 px-3 py-2 text-xs font-semibold"
                  href={mapsUrl(item.name, item.address)}
                  target="_blank"
                  rel="noreferrer"
                >
                  地圖搜尋
                </a>
              </div>
            </article>
          ))}
        </section>
      )}

      {(tab === "record" || tab === "done") && (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 backdrop-blur">
          <h2 className="mb-2 text-base font-bold">
            {tab === "done" ? "送完補記入口" : "實時錄音記錄"}
          </h2>
          <p className="mb-3 text-sm text-[var(--muted)]">
            講法：<code className="text-[var(--accent2)]">餐廳 市廣場麥當勞，二樓近 AEON 轉右</code>
          </p>
          <button
            type="button"
            onClick={toggleMic}
            className={`mb-3 w-full rounded-2xl px-4 py-4 text-base font-bold text-white ${
              listening ? "animate-pulse bg-[#d62828]" : "bg-gradient-to-br from-[#ff5a5a] to-[#d62828]"
            }`}
          >
            {listening ? "錄音中…再按停止" : "🎤 按住講／再按停止"}
          </button>

          <label className="mb-1 block text-xs text-[var(--muted)]">語音文字</label>
          <textarea
            className="mb-2 min-h-24 w-full rounded-xl border border-[var(--line)] bg-black/30 px-3 py-3"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="錄音結果會出現喺度，可改"
          />
          <div className="mb-2 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">類型</label>
              <select
                className="w-full rounded-xl border border-[var(--line)] bg-black/30 px-3 py-3"
                value={kind}
                onChange={(e) => setKind(e.target.value as "auto" | PlaceKind)}
              >
                <option value="auto">自動</option>
                <option value="merchant">商戶</option>
                <option value="residence">住宅</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">花咗幾多分鐘</label>
              <input
                className="w-full rounded-xl border border-[var(--line)] bg-black/30 px-3 py-3"
                value={waste}
                onChange={(e) => setWaste(e.target.value)}
                inputMode="numeric"
                placeholder="9"
              />
            </div>
          </div>
          <label className="mb-1 block text-xs text-[var(--muted)]">地點名稱</label>
          <input
            className="mb-2 w-full rounded-xl border border-[var(--line)] bg-black/30 px-3 py-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label className="mb-1 block text-xs text-[var(--muted)]">區域</label>
          <input
            className="mb-2 w-full rounded-xl border border-[var(--line)] bg-black/30 px-3 py-3"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="屯門市中心／置樂／兆康"
          />
          <label className="mb-1 block text-xs text-[var(--muted)]">點入詳情（重點）</label>
          <textarea
            className="mb-3 min-h-24 w-full rounded-xl border border-[var(--line)] bg-black/30 px-3 py-3"
            value={tip}
            onChange={(e) => setTip(e.target.value)}
            placeholder="邊個閘、邊條電梯、近邊間舖"
          />
          <label className="mb-1 block text-xs text-[var(--muted)]">寫入密鑰（Vercel 上嘅 WALKER_WRITE_KEY）</label>
          <input
            className="mb-3 w-full rounded-xl border border-[var(--line)] bg-black/30 px-3 py-3"
            value={writeKey}
            onChange={(e) => setWriteKey(e.target.value)}
            placeholder="本機可留空；上線後要填"
          />
          <button
            type="button"
            onClick={() => void saveNote()}
            className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-bold text-[#062016]"
          >
            確認寫入資料庫
          </button>
          {saveMsg && <p className="mt-3 text-sm text-[var(--accent)]">{saveMsg}</p>}
        </section>
      )}

      {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}

      <section className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 text-sm leading-relaxed text-[var(--muted)]">
        <p className="font-bold text-[var(--text)]">現場流程</p>
        <p>1. 接單 →「而家去邊」查庫 → 有記錄就跟黃框入</p>
        <p>2. 第一次／唔夠詳 →「錄音記錄」講低點入 → 寫入 GitHub</p>
        <p>3. 送完仲想補 →「送完補記」</p>
        <p>4. 每周 Action 對執笠／搬舖／新樓</p>
      </section>
    </main>
  );
}
