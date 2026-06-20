# CLAUDE.md

**Read [`RANKLENS_ENGINEERING_GUIDE.md`](./RANKLENS_ENGINEERING_GUIDE.md) first.** It is the single source of truth for this repo's tech stack, full folder structure, and design rules — read it before writing or reviewing code so you don't invent structure, APIs, or styles that don't exist.

Quick orientation (details in the guide):

- **Stack:** React 19 + **Vite** SPA (⚠️ **NOT Next.js** — no SSR/`app/` router), `wouter` routing, **Tailwind v4** via `@theme` in `client/src/index.css` (no `tailwind.config.js`), Framer Motion, React Three Fiber, TanStack Query, IndexedDB via `localforage`. Server is a stateless **Express 5** Lighthouse/Puppeteer analyzer. Accounts/auth (Supabase) are **planned, not built**.
- **Design system:** **skeuomorphic** surfaces on a **graphite** palette — use the `.skeu` / `.skeu-inset` / `.skeu-btn` utilities and semantic color tokens, never glassmorphism or raw hex. **4× spacing** only (multiples of 4px; no `*-1.5`/`*-2.5`). Mobile-first, fully responsive. See the guide's §3 Design system.
- **3D:** scenes wrap `Scene`, mount via `Lazy3D` (gated by `use3DEnabled`) with a static fallback; colors come from `components/three/palette.ts`.
- **Product mission/principles:** `RANKLENS_PRODUCT_GUIDELINES.md`.
- **Verify:** `npm run typecheck` + `npm run build` in `client/` (one known pre-existing recharts/React-19 typecheck error in `pages/dashboard.tsx`).
