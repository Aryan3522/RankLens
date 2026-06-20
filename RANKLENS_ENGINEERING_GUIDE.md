# RankLens — Engineering & Design Guide

> **Single source of truth** for stack, structure, and design rules. Read this before writing or reviewing code so you don't invent structure, APIs, or styles that don't exist. Product mission/principles live in `RANKLENS_PRODUCT_GUIDELINES.md`.

---

## 1. Tech stack (authoritative — do NOT assume otherwise)

**This is a React + Vite SPA, NOT Next.js. There is no SSR, no `app/` router, no server components.**

### Client (`client/`)
- **React 19** + **TypeScript 5.9**, bundled by **Vite 7** (`@vitejs/plugin-react`).
- **Routing:** `wouter` (tiny client router) — see `client/src/App.tsx`. NOT react-router.
- **Styling:** **Tailwind CSS v4** configured via `@theme inline { … }` **inside `client/src/index.css`** (there is **no `tailwind.config.js`**). Dark mode = `class` strategy via `next-themes`.
- **Animation:** **Framer Motion** (helpers in `client/src/lib/motion.ts`). **Scroll-linked animation uses Framer Motion `useScroll`/`useTransform` + the `three/useScroll.ts` singleton — NOT GSAP/ScrollTrigger** (deliberately avoided to keep the bundle lean; they overlap what we already have).
- **Smooth scroll:** **Lenis** (`client/src/lib/useSmoothScroll.ts`, mounted once in `App.tsx`). No-op under `prefers-reduced-motion`; in-page `#anchor` links delegate to `lenis.scrollTo`.
- **3D:** **React Three Fiber** + **three** + `@react-three/drei` + `maath`. Bundled into a separate `vendor-three` chunk (lazy).
- **Data fetching/cache:** **TanStack Query v5**.
- **Local persistence:** **IndexedDB via `localforage`** (`client/src/lib/storage/index.ts`). No backend DB today.
- **UI primitives:** Radix UI + a local shadcn-style set in `client/src/components/ui/`. Icons: `lucide-react`. Class helper: `cn()` in `client/src/lib/utils.ts`.
- **Dev server:** Vite on **port 8081**, proxies `/api` → `VITE_API_URL` (default `http://127.0.0.1:8080`).

### Server (`server/`)
- **Express 5** + TypeScript, run with `tsx`. Deployed on **Render** (`server/scripts/render-build.sh`).
- **Analysis engine:** **Lighthouse** + **puppeteer-core** with a pooled Chromium (`browser-pool.ts`), HTML parsing via **cheerio**.
- **Optional LLM enhancement:** Anthropic SDK (`@anthropic-ai/sdk`), gated on `ANTHROPIC_API_KEY` (model default `claude-haiku-4-5`).
- **Stateless:** no database, no auth, no sessions. Rate limiting is in-memory per-IP (1 analysis/min). Single endpoint: `POST /api/analyses`.

### Planned (NOT yet built)
- **Supabase** (Postgres + Auth) for user accounts + email verification + persistent, cross-device analysis history, and a server-enforced anonymous "one analysis only, auto-deleted on close" limit. Until then, all history is local IndexedDB.
- **Testimonials submission + admin approval** (submissions stay private until approved) — needs the Supabase DB.
- **Subscriptions/payments via Razorpay** (chosen for no setup fee + free test mode + ₹/GST/webhooks). Server-side validation + webhook verification + premium-access middleware — needs the backend. The marketing header's Log in / Sign up route to the app as placeholders until auth lands.

---

## 2. Folder structure

```
RankLens/
├─ client/                      # React + Vite SPA
│  ├─ index.html                # SEO meta, fonts, JSON-LD
│  ├─ vite.config.ts            # aliases (@ → src, @assets), manualChunks (vendor-three etc.)
│  └─ src/
│     ├─ main.tsx               # entry; next-themes ThemeProvider (default dark)
│     ├─ App.tsx                # wouter routes + TanStack QueryClient
│     ├─ index.css              # Tailwind v4 @theme, design tokens, skeuomorphic utilities
│     ├─ api/                   # customFetch + generated API client (custom-fetch.ts, @/api)
│     ├─ components/
│     │  ├─ ui/                 # shadcn-style primitives (button, card, input, glow-card, …)
│     │  ├─ marketing/          # marketing homepage: sections/, data.ts (single content source), useAnalyze.ts
│     │  └─ three/              # 3D: Scene, Lazy3D, use3DEnabled, usePointer, useScroll,
│     │     │                   #     palette.ts, PersistentCompanion, scenes/, fallbacks/
│     │     ├─ scenes/          # R3F scenes (ScrollCompanion, AIVisibilityUniverse, CompetitiveBattlefield, …)
│     │     └─ fallbacks/       # static SVG posters mirroring each scene (zero-CLS, mobile/reduced-motion)
│     ├─ hooks/                 # useLocalApi.ts (storage-backed CRUD), useLatestAnalysis.ts
│     ├─ lib/                   # utils.ts (cn, normalizeUrl), motion.ts, storage/ (IndexedDB), export-analysis.ts
│     ├─ pages/                 # route components (marketing-home, dashboard, analyzer, analysis-detail, …)
│     └─ services/             # client-side service helpers
├─ server/                      # Express analysis API (stateless)
│  └─ src/
│     ├─ index.ts               # bootstrap (Chrome pre-warm, graceful shutdown)
│     ├─ routes/                # analyses.ts (POST /api/analyses), health
│     ├─ middlewares/           # request middleware
│     ├─ lib/                   # seo-analyzer, ai-visibility-analyzer, lighthouse-service, browser-pool,
│     │                         #   concurrency (queue + rate limit), url-guard (SSRF), env, llm-insights
│     └─ types/                 # shared/generated types
├─ RANKLENS_ENGINEERING_GUIDE.md  # ← this file
├─ RANKLENS_PRODUCT_GUIDELINES.md # product mission & principles
├─ GEMINI.md / CLAUDE.md          # AI-tool entry points (both reference this guide)
└─ README.md
```

---

## 3. Design system

### Visual language — **Skeuomorphic on graphite**
Surfaces are physically **raised** from the Deep-Graphite background (top inner highlight + outer drop shadow, subtle Slate→Carbon gradient). Inputs/tracks/wells are **inset** (concave). Buttons depress on press. Premium and tactile — **not** flat-gray neumorphism, **not** glassmorphism. Do not add `backdrop-blur` cards.

**Use the shared utilities in `index.css` — never hand-roll surface shadows:**
| Class | Use |
|---|---|
| `.skeu` | Raised tactile panel (the default surface; replaces old glass cards) |
| `.skeu-sm` | Lighter raise for nested/inline surfaces, chips, badges |
| `.skeu-inset` | Concave well — inputs, progress tracks, code, recessed regions |
| `.skeu-interactive` | Add to `.skeu` for hover-lift + press-in feedback |
| `.skeu-btn` / `.skeu-btn-primary` | Tactile buttons (the `Button` component already uses these) |

Legacy classes `.depth-card`, `.glass-panel`, `.glass-panel-strong/-subtle` are **aliased to the skeuomorphic recipe** — existing markup keeps working; prefer `.skeu*` in new code. The `Card`, `Button`, `Input`, `Textarea`, `Select` primitives are already skeuomorphic, so use them rather than re-styling.

### Color theme — graphite palette (tokens in `index.css`)
| Token (HSL) | Role | Hex |
|---|---|---|
| `--background` | Deep Graphite | `#0B0D11` |
| `--card`/`--popover` | Carbon | `#11151B` |
| `--muted`/`--accent` | Slate Graphite | `#171D24` |
| `--primary`/`--ring` | Electric Blue | `#4F8CFF` |
| `--secondary` | AI Purple | `#7C5CFF` |
| `--accent-cyan` | Cyan Glow | `#4FE5FF` |
| `--destructive` / success / warning | status | `#FF5E7A` / `#29D398` / `#FFB648` |

Always use the **semantic tokens** (`bg-primary`, `text-secondary`, `text-muted-foreground`, `bg-destructive`) — never raw hex in components, and never the old neon `cyan-400`/`purple-400` literals. 3D scenes use literal hex from `client/src/components/three/palette.ts` (`C` + `ENGINE_COLORS`); keep them in sync with the tokens here.

### Spacing — strict **4× rule**
Tailwind v4's unit is `0.25rem = 4px`. **Only use spacing that is a multiple of 4px.** Allowed scale: `1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32 …` (×4px). **Banned:** fractional classes (`p-1.5`, `gap-2.5`, `mt-0.5`, `space-y-1.5`) and `*-7` (28px is fine as `7`×4=28 → actually allowed; the banned ones are the `.5` fractionals). When in doubt round to the nearest 4px step.

### Responsiveness
Mobile-first; design for 360px → ultrawide. Breakpoints: `sm 640` / `md 768` / `lg 1024` / `xl 1280`. Rules:
- Section padding scales: `px-4 sm:px-6 … py-16 md:py-24`.
- Grids must reflow gradually (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-…`) — never jump 1→5.
- No fixed pixel widths on layout containers; use `max-w-*` + fluid grids/flex.
- Verify no horizontal scroll at 360px and 1920px.

### 3D rules
- Every scene wraps the shared `Scene` and mounts via `Lazy3D` (capability-gated by `use3DEnabled`: needs ≥768px, no reduced-motion, ≥4 cores, WebGL, no Data-Saver) with a matching static **fallback** for zero CLS.
- Read pointer/scroll via the `usePointer` / `useScroll` module singletons inside `useFrame` — **never** per-frame React state.
- Keep geometry modest (points/lines/low-poly, instancing) so `vendor-three` stays bounded and 60fps holds. The persistent brand element is `PersistentCompanion` → `scenes/ScrollCompanion`.

---

## 4. Conventions
- **Imports:** `@/…` → `client/src/…`. Data/CRUD hooks come from `@/api` (re-exports `hooks/useLocalApi.ts`).
- **Marketing content** is single-sourced in `components/marketing/data.ts` (the FAQ JSON-LD derives from it — never duplicate copy).
- **Real vs demo data:** visuals bind to the visitor's latest completed analysis via `hooks/useLatestAnalysis.ts`, falling back to the demo constants when none exists. Label live data ("Live from your last scan").
- **Class composition:** always `cn(...)`. **URL normalization:** `normalizeUrl()` in `lib/utils.ts`.
- **Dev tooling:** **Agentation** (visual feedback tool for AI agents) is wired in `App.tsx`, **dev + localhost only** — lazy-imported inside an `import.meta.env.DEV` branch (tree-shaken from prod; it's a `devDependency`) and gated to localhost hostnames at runtime. Optional: connect it to this agent via the `agentation-mcp` server.
- **Verify** with `npm run typecheck` + `npm run build` in `client/`. Known pre-existing typecheck error: one recharts-2.x + React-19 `@types` JSX mismatch in `pages/dashboard.tsx` (runtime is fine; build ignores it).
