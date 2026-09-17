# 步兵記憶庫（Vercel + GitHub DB）

送外賣時用手機開呢個網：
1. **而家去邊** — 查商戶／住宅，有記錄就 highlight 點入
2. **錄音記錄** — 實時講低入口，寫入 GitHub `data/rider-notes.json`
3. **送完補記** — 做完單再補詳情
4. **每周 Action** — 快照／對變更

## 架構

| 層 | 用途 |
|----|------|
| Vercel | 網站 + API |
| GitHub `data/bundle.json` | 商戶／住宅基底 |
| GitHub `data/rider-notes.json` | 你語音累積嘅詳細入口（database） |
| `WALKER_WRITE_KEY` | 防止陌生人寫入你 repo |

本地冇設 `GITHUB_TOKEN` 時會寫入專案 `data/`（方便開發）。

## 本機跑

```bash
cd walker-memory-web
cp .env.example .env.local   # 可先唔填 GitHub
npm run dev
```

開 http://localhost:3000

## 上線（GitHub + Vercel）

1. 開新 GitHub repo，push 呢個專案
2. Vercel Import 個 repo
3. 加 Environment Variables：
   - `GITHUB_TOKEN`（repo contents 寫入權限）
   - `GITHUB_REPO=owner/repo`
   - `GITHUB_BRANCH=main`
   - `WALKER_WRITE_KEY=你自訂密鑰`
4. 手機打開 Vercel URL，設定頁填同一個密鑰（會存 localStorage）
5. 加到主畫面當 App 用

## Token 權限

GitHub fine-grained token 或 classic `repo` scope，要能讀寫 `data/rider-notes.json`。
