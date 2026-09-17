# 步兵記憶庫（Vercel + GitHub DB）

**線上：** https://walker-memory-web.vercel.app/

送外賣時用手機開呢個網：
1. **而家去邊** — 查商戶／住宅，有記錄就 highlight 點入
2. **錄音記錄** — 實時講低入口，寫入 GitHub `data/rider-notes.json`
3. **送完補記** — 做完單再補詳情
4. **每周 Action** — 快照／對變更

## 架構

| 層 | 用途 |
|----|------|
| Vercel | 網站 + API |
| GitHub `data/bundle.json` | 商戶／住宅基底（可選；程式內已有屯門種子） |
| GitHub `data/rider-notes.json` | 你語音累積嘅詳細入口（database） |
| `WALKER_WRITE_KEY` | 防止陌生人寫入你 repo |

未設 `GITHUB_TOKEN` 時：讀取用內建種子；寫入只係本機／Vercel 暫時檔（**唔持久**）。上線要持久記錄，一定要接 GitHub。

## 本機跑

```bash
cd walker-memory-web
cp .env.example .env.local   # 可先唔填 GitHub
npm run dev
```

開 http://localhost:3000

## 接 GitHub 做 database（重要）

1. 喺 GitHub 開新 repo，將本專案 `git push`
2. Vercel 專案已存在：`walker-memory-web` — 可改為連結呢個 GitHub repo（之後 push 自動 deploy）
3. Vercel → Settings → Environment Variables 加：
   - `GITHUB_TOKEN`（要有 contents 寫入權限）
   - `GITHUB_REPO=你的名/walker-memory-web`
   - `GITHUB_BRANCH=main`
   - `WALKER_WRITE_KEY=你自訂長密鑰`
4. Redeploy 一次
5. 手機開網站，錄音頁填同一個密鑰（存 localStorage）
6. 加到主畫面當 App

完成後，頁面會顯示 `storage: github`；每次講完記錄會 commit 去 `data/rider-notes.json`。

## Token 權限

GitHub fine-grained token 或 classic `repo` scope，要能讀寫 `data/rider-notes.json`。
