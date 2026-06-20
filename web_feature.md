# Web Feature: Universal Indexing Engine

Turn RankLens from a passive **analysis tool** into an **action platform** where users can submit their URLs to Google Search Console, Bing, Yandex, and IndexNow — all from a single dashboard. This bridges the gap between *knowing what's wrong* and *fixing it*.

---

## 1. Architecture Overview

```
┌──────────────────────────────┐
│   React SPA (client/src/)   │
│  ┌────────────────────────┐ │
│  │    /indexing Page      │ │
│  │  - Site management     │ │
│  │  - Quick URL submit    │ │
│  │  - Submission history  │ │
│  │  - Platform status     │ │
│  └────────┬───────────────┘ │
└───────────┼──────────────────┘
            │ POST /api/submit
            │ GET  /api/sites
            │ POST /api/auth/register
            ▼
┌──────────────────────────────┐
│   Express 5 Server           │
│                              │
│  ┌────────────────────────┐ │
│  │   Routes               │ │
│  │  - /api/auth/*         │ │
│  │  - /api/sites/*        │ │
│  │  - /api/submit/*       │ │
│  └────────┬───────────────┘ │
│           │                 │
│  ┌────────▼───────────────┐ │
│  │   Service Layer        │ │
│  │  - IndexNow Service    │ │
│  │  - Sitemap Service     │ │
│  │  - Search Console Svc  │ │
│  │  - Auth Service        │ │
│  └────────┬───────────────┘ │
│           │                 │
│  ┌────────▼───────────────┐ │
│  │   SQLite (better-sqlite3)│ │
│  │   - users              │ │
│  │   - sites              │ │
│  │   - submissions        │ │
│  └────────────────────────┘ │
└──────────────────────────────┘
```

### Data Flow — URL Submission

```
User enters URL + selects platforms
        │
        ▼
Client POST /api/submit
        │
        ▼
Server validates URL + auth
        │
        ├──► IndexNow → POST api.indexnow.org ← Bing, Yandex, Seznam
        ├──► Google   → Return direct Search Console inspection URL
        │              (user clicks to verify; no programmatic API for general URLs)
        └──► Save submission record to SQLite
        │
        ▼
Client shows live status per platform
```

---

## 2. Feasibility & Constraints

### What Is Fully Doable

| Feature | Status | How |
|---|---|---|
| **Bing URL submission** | ✅ Fully automated | IndexNow API — simple POST, no OAuth, works today |
| **Yandex URL submission** | ✅ Fully automated | IndexNow API — same protocol as Bing |
| **Yahoo indexing** | ✅ Covered by Bing | Yahoo uses Bing's index; submitting to Bing covers Yahoo |
| **Seznam (Czech search)** | ✅ Fully automated | IndexNow API — same protocol |
| **Sitemap generation & submission** | ✅ Fully automated | Generate XML server-side, ping search engines |
| **Google Search Console data (read)** | ✅ Doable via OAuth | GSC API exposes index coverage, query data, sitemap status, crawl errors — but user must connect their own Google account |
| **AI Visibility analysis** | ✅ Already built | RankLens analyzes content structure, E-E-A-T, entity coverage, crawlability for AI systems |

### What Is Limited or Not Possible

| Feature | Constraint | Workaround |
|---|---|---|
| **Programmatic Google indexing requests** | ❌ Google's Indexing API only works for **JobPosting** and **BroadcastEvent** structured data — not for general URLs. The Search Console URL Inspection API is heavily rate-limited and requires OAuth. | Option A: Generate a direct link to Search Console's URL Inspection page (user clicks to submit manually).<br>Option B: User connects their own GSC account via OAuth — you can trigger inspection on their behalf (up to ~200/day per user).<br>**You cannot offer "one-click Google indexing" — this is a Google restriction, not a technical limitation of your platform.** |
| **"Submit to AI systems"** | ❌ There is no API to submit content to ChatGPT, Claude, Gemini, Perplexity, or Copilot. These systems crawl the open web on their own schedule. | AI Visibility is purely **analytical** — you check if content is AI-friendly (structured data, clear entities, E-E-A-T signals, crawlability). RankLens already does this. Market it as "AI Readiness" analysis, not "AI submission." |
| **Instant indexing** | ❌ No search engine guarantees instant indexing. IndexNow provides faster notification but crawl/ranking is still at their discretion. | Set expectations: "Submit for faster discovery" not "Get indexed immediately." |

### The Honest Pitch

> "RankLens helps you **monitor** your Google Search Console data, **submit** to Bing/Yandex/Yahoo/Seznam with one click, and **analyze** your AI visibility. For Google indexing, we guide you directly to the source."

This positioning is honest, delivers real value, and avoids overpromising.

---

## 3. Pricing & Monetization

### Plan Structure

#### Free Plan — $0
For individual site owners trying RankLens for the first time.

| Feature | Included |
|---|---|
| SEO Analysis | ✅ Unlimited |
| AI Visibility Analysis | ✅ Unlimited |
| Keyword Analysis | ✅ Unlimited |
| Technical SEO Audit | ✅ Unlimited |
| Content Quality Analysis | ✅ Unlimited |
| Analysis History | ✅ 30 days |
| URL Indexing Submission | ❌ |
| Sitemap Management | ❌ |
| Google Search Console Integration | ❌ |
| Bulk Operations | ❌ |
| Priority Support | ❌ |

#### Pro Plan — $49/mo or $39/mo (billed yearly, $468/yr)
For professionals and small agencies who need to actively manage their search presence.

| Feature | Included |
|---|---|
| Everything in Free | ✅ Unlimited |
| **Bing URL Submission** | ✅ Up to 10,000 URLs/mo |
| **Yandex URL Submission** | ✅ Up to 10,000 URLs/mo |
| **Yahoo URL Submission** | ✅ (via Bing) |
| **Seznam URL Submission** | ✅ Up to 10,000 URLs/mo |
| **IndexNow Protocol Access** | ✅ Full access |
| **Sitemap Generation & Submission** | ✅ Unlimited sitemaps |
| **Google Search Console Dashboard** | ✅ Connect your GSC account, view index coverage, query data, sitemap status, crawl errors |
| **Google Indexing Requests** | ✅ Direct GSC inspection links |
| **Site Management** | ✅ Up to 10 sites |
| **Submission History** | ✅ 12 months retention |
| **Scheduled Re-analysis** | ✅ Weekly |
| **Priority Queue** | ✅ Higher API priority |
| **Email Support** | ✅ 48h response |

#### Enterprise Plan — $99/mo or $89/mo (billed yearly, $1,068/yr)
For agencies, SaaS companies, and large-scale site portfolios.

| Feature | Included |
|---|---|
| Everything in Pro | ✅ Unlimited |
| **Site Management** | ✅ Unlimited sites |
| **Bulk URL Upload (CSV)** | ✅ Unlimited |
| **Team Seats** | ✅ Up to 10 team members |
| **White-Label Reports** | ✅ Custom branding |
| **API Access** | ✅ Rate-limited API keys |
| **Google Search Console OAuth** | ✅ Full integration with inspection requests |
| **Custom Integrations** | ✅ Webhooks, Zapier |
| **Sitemap Hosting** | ✅ Hosted on RankLens CDN |
| **Scheduled Re-analysis** | ✅ Daily |
| **Priority Support** | ✅ 24h response + Slack channel |
| **SLA** | ✅ 99.9% uptime |

### Comparison Table

| | Free | Pro | Enterprise |
|---|---|---|---|
| **Price (monthly)** | $0 | **$49/mo** | **$99/mo** |
| **Price (yearly)** | $0 | **$39/mo** ($468/yr) | **$89/mo** ($1,068/yr) |
| SEO / AI Analysis | Unlimited | Unlimited | Unlimited |
| IndexNow Submission (Bing/Yandex) | ❌ | ✅ 10K URLs/mo | ✅ Unlimited |
| Sitemap Management | ❌ | ✅ | ✅ + Hosted |
| GSC Dashboard | ❌ | ✅ Read-only | ✅ Full OAuth |
| Sites | — | 10 | Unlimited |
| Team Seats | 1 | 1 | 10 |
| Support | Community | Email 48h | Slack + 24h |

### Why This Pricing Works

- **Free tier** keeps RankLens' core promise ("everything must remain free" per product guidelines) for analysis — no change to the current experience
- **Pro tier** priced at $49/mo sits competitively with tools like Ahrefs Webmaster Tools ($0), but the IndexNow automation + GSC dashboard justifies the cost. Annual $39/mo ($468/yr) feels like a clear win.
- **Enterprise tier** at $99/mo ($89/yr) is a no-brainer for agencies managing 10+ client sites who currently pay $199/mo for comparable tools
- **Psychological pricing**: $49 (not $50), $39 (not $40), $99 (not $100), $89 (not $90)

### Implementation Notes

- **Stripe** or **Razorpay** (as planned in product roadmap) for payment processing
- Plan gating on the server via `users.plan` column in SQLite
- Feature flags checked in route middleware (e.g., `requirePlan('pro')`)
- No changes to existing analysis routes — they stay free for all
- New indexing routes check `user.plan` before allowing submissions

---

## 4. What to Add — Complete File Manifest

### Server — New Files (8)

| File | Purpose |
|---|---|
| `server/src/db/index.ts` | SQLite init, schema, helper queries |
| `server/src/lib/auth-service.ts` | API key generation, auth middleware |
| `server/src/lib/indexnow-service.ts` | IndexNow protocol submission |
| `server/src/lib/sitemap-service.ts` | Sitemap XML generation |
| `server/src/lib/search-console-service.ts` | Google Search Console URL builder |
| `server/src/routes/auth.ts` | Register / login / me routes |
| `server/src/routes/sites.ts` | Site CRUD + verification |
| `server/src/routes/submit.ts` | URL submission + sitemap routes |

### Server — Modified Files (3)

| File | Change |
|---|---|
| `server/package.json` | Add `better-sqlite3`, `uuid` |
| `server/src/app.ts` | Wire new route modules |
| `server/src/routes/index.ts` | Export new routes |
| `server/src/lib/env.ts` | Add `DATABASE_PATH`, `JWT_SECRET`, `INDEXNOW_KEY` |

### Client — New Files (2)

| File | Purpose |
|---|---|
| `client/src/api/indexing.ts` | API client for all indexing endpoints |
| `client/src/pages/indexing.tsx` | Full indexing management page |

### Client — Modified Files (2)

| File | Change |
|---|---|
| `client/src/App.tsx` | Add `/indexing` route |
| `client/src/components/app-layout.tsx` | Add "Indexing" nav item |

---

## 5. Step-by-Step Implementation

### Phase A: Database Layer

#### 5a. Add dependencies

**`server/package.json`** — add to `dependencies`:
```json
"better-sqlite3": "^11.7.0",
"uuid": "^10.0.0"
```
Add to `devDependencies`:
```json
"@types/better-sqlite3": "^7.6.12",
"@types/uuid": "^10.0.0"
```
Run: `cd server && npm install`

#### 5b. Environment variables

**`server/src/lib/env.ts`** — add to the `envSchema`:
```ts
DATABASE_PATH: z.string().default("./data/ranklens.db"),
JWT_SECRET: z.string().optional(),
INDEXNOW_KEY: z.string().optional(),
```

**`server/.env.example`** — add:
```
DATABASE_PATH=./data/ranklens.db
JWT_SECRET=your_jwt_secret_change_me
INDEXNOW_KEY=your_indexnow_api_key
```

#### 5c. Database initialization

**`server/src/db/index.ts`** — what to build:

```
┌─────────────────────────────────────────────┐
│  db/index.ts                               │
│                                             │
│  getDb(): Database                         │
│    - Returns singleton better-sqlite3      │
│      instance (WAL mode)                   │
│    - Creates data/ directory if missing    │
│                                             │
│  Tables on init:                           │
│    users(id TEXT PK, email TEXT UNIQUE,     │
│          api_key TEXT UNIQUE,               │
│          created_at TEXT)                   │
│                                             │
│    sites(id TEXT PK, user_id TEXT FK,       │
│          domain TEXT, verified INT,         │
│          verification_token TEXT,           │
│          created_at TEXT,                   │
│          UNIQUE(user_id, domain))           │
│                                             │
│    submissions(id TEXT PK, user_id TEXT FK, │
│                site_id TEXT FK nullable,    │
│                url TEXT,                    │
│                platform TEXT,               │
│                status TEXT DEFAULT 'pending',│
│                response TEXT nullable,      │
│                created_at TEXT)             │
│                                             │
│  Helper exports:                           │
│    createUser(email) → user                │
│    getUserByApiKey(key) → user | null      │
│    getUserByEmail(email) → user | null     │
│    createSite(userId, domain) → site       │
│    getSitesByUser(userId) → site[]         │
│    deleteSite(id, userId) → boolean        │
│    createSubmission(...) → submission      │
│    getSubmissionsByUser(userId, limit) → []│
│    getSubmissionStats(userId) → stats      │
└─────────────────────────────────────────────┘
```

Use `better-sqlite3` with these specific patterns:

```ts
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, "../../data/ranklens.db");
  // Ensure directory exists
  // Initialize in WAL mode
  // Create tables (IF NOT EXISTS)
  _db = db;
  return _db;
}
```

---

### Phase B: Service Layer

#### 5d. Auth Service

**`server/src/lib/auth-service.ts`** — what to build:

```ts
// generateApiKey(): string - generates crypto-random 32-char hex key
// hashApiKey(key: string): string - sha256 hash for storage
// authMiddleware(req, res, next) - Express middleware that:
//   1. Reads Authorization: Bearer <key> header
//   2. Hashes the key
//   3. Looks up user by hashed key in DB
//   4. Attaches user to req (req.user = user)
//   5. Returns 401 if invalid
```

For hashing, use Node.js built-in `crypto`:
```ts
import { randomBytes, createHash } from "crypto";

export function generateApiKey(): string {
  return randomBytes(32).toString("hex");
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
```

**Route: `POST /api/auth/register`**
- Body: `{ email: string }`
- Validates email with zod (z.string().email())
- Checks no duplicate email
- Creates user with generated API key
- Returns `{ apiKey, user: { id, email } }`
- ⚠️ API key is returned only once (store it client-side)

**Route: `POST /api/auth/login`**
- Body: `{ email: string }` 
- Looks up user by email
- If found, generates a new API key (rotates)
- Returns `{ apiKey, user: { id, email } }`

**Route: `GET /api/auth/me`**
- Requires auth middleware
- Returns `{ id, email, createdAt, siteCount, submissionCount }`

#### 5e. IndexNow Service

**`server/src/lib/indexnow-service.ts`** — what to build:

```
IndexNow Protocol
────────────────
POST https://api.indexnow.org/indexnow
Content-Type: application/json

{
  "host": "example.com",
  "key": "your-api-key",
  "keyLocation": "https://example.com/your-api-key.txt",
  "urlList": ["https://example.com/page"]
}

Responses:
- 200 OK → accepted
- 202 Accepted → queued
- 400 → bad request
- 422 → validation failed
- 429 → rate limited
```

Implementation:

```ts
const INDEXNOW_URL = "https://api.indexnow.org/indexnow";
const BING_URL = "https://www.bing.com/indexnow";
// Yandex and Seznam also accept IndexNow submissions

interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

interface SubmissionResult {
  platform: "bing" | "yandex" | "indexnow" | "seznam";
  success: boolean;
  statusCode: number;
  message: string;
}

async function submitToIndexNow(
  host: string,
  key: string,
  keyLocation: string,
  urls: string[],
  endpoint: string = INDEXNOW_URL,
): Promise<{ success: boolean; statusCode: number; message: string }>

async function submitToAllIndexNow(
  host: string,
  key: string,
  keyLocation: string,
  urls: string[],
): Promise<SubmissionResult[]>
```

#### 5f. Sitemap Service

**`server/src/lib/sitemap-service.ts`** — what to build:

Generates `sitemap.xml` and submits to search engines via IndexNow (ping).

```ts
interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number; // 0.0 - 1.0
}

function generateSitemapXml(urls: SitemapUrl[]): string
// Returns valid XML string with urlset + url entries

function generateSitemapIndexXml(sitemaps: string[]): string
// For multiple sitemaps (>50K URLs or >50MB)
```

#### 5g. Search Console URL Builder

**`server/src/lib/search-console-service.ts`** — what to build:

Google does not offer a programmatic API for general URL indexing requests. The correct approach is:

1. **Generate direct Search Console inspection URLs** (user clicks to submit manually)
2. **Optionally** support user-provided Google API credentials (OAuth 2.0) for advanced users

```ts
function getSearchConsoleInspectionUrl(domain: string, url: string): string
// Returns: https://search.google.com/search-console/inspect?resource_id=sc_domain:{domain}&query={url}

function getSearchConsoleDashboardUrl(domain: string): string
// Returns: https://search.google.com/search-console?resource_id=sc_domain:{domain}
```

**Why not the Indexing API?**
- Google's Indexing API (v3) is restricted to **JobPosting** and **BroadcastEvent** structured data only
- General URL indexing requests must go through Search Console's URL Inspection tool (manual UI)
- The Indexing API also requires OAuth 2.0 + Google Cloud Project + quota approval

---

### Phase C: API Routes

#### 5h. Auth Routes

**`server/src/routes/auth.ts`**

```
POST /api/auth/register  → { apiKey, user }
POST /api/auth/login     → { apiKey, user }  (rotates key)
GET  /api/auth/me        → user profile      [auth required]
```

Wire into `app.ts`:
```ts
app.use("/api/auth", authRouter);
```

#### 5i. Site Routes

**`server/src/routes/sites.ts`**

```
GET    /api/sites           → site[]          [auth required]
POST   /api/sites           → site            [auth required]
DELETE /api/sites/:id       → { success }     [auth required]
POST   /api/sites/:id/verify→ { verificationToken, instructions }
GET    /api/sites/:id/status→ { verified, verificationMethod }
```

**`POST /api/sites`**:
- Body: `{ domain: string }`
- Validates domain format
- Normalizes: strips protocol, trailing slashes
- Generates verification token (UUID)
- Creates site record (verified: false)
- Returns site + verification instructions

**Site Verification** — for MVP, use **HTML meta tag** method:
- Server generates a unique verification token
- User adds `<meta name="ranklens-verify" content="{token}">` to their site's `<head>`
- On `POST /api/sites/:id/verify`, server fetches the site's HTML and checks for the meta tag
- If found, sets `verified = 1`

#### 5j. Submit Routes

**`server/src/routes/submit.ts`**

```
POST /api/submit            → { submissions: SubmissionResult[] }  [auth required]
POST /api/submit/sitemap     → { sitemapUrl, submissions }         [auth required]
GET  /api/submissions       → submission[]                        [auth required]
GET  /api/submissions/stats  → { total, today, byPlatform }       [auth required]
```

**`POST /api/submit`**:
- Body: `{ url: string, platform: "all" | "bing" | "yandex" | "indexnow", siteId?: string }`
- Validates URL (must be valid HTTP/HTTPS)
- Calls the appropriate service(s)
- Records submission in SQLite
- Returns per-platform results

**`POST /api/submit/sitemap`**:
- Body: `{ urls: string[], siteId: string, platform: "all" | "bing" | "yandex" | "indexnow" }`
- Generates a sitemap XML from the urls
- For MVP: returns the sitemap as text (user hosts it themselves), submits URLs via IndexNow
- Future: host sitemap on RankLens infrastructure

---

### Phase D: Modify Existing Server Files

#### 5k. Update `server/src/routes/index.ts`

```ts
import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import analysesRouter from "./analyses.js";
import authRouter from "./auth.js";
import sitesRouter from "./sites.js";
import submitRouter from "./submit.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(analysesRouter);
router.use(authRouter);
router.use(sitesRouter);
router.use(submitRouter);

export default router;
```

#### 5l. Update `server/src/app.ts`

The auth middleware needs to be wired. Some routes (analyses) should remain unprotected, while indexing routes require auth. Best approach: apply auth middleware per-route (inside the route files), not globally.

---

### Phase E: Client-Side

#### 5m. API Client

**`client/src/api/indexing.ts`** — what to build:

```ts
// All functions use customFetch from @/api/custom-fetch

interface User {
  id: string;
  email: string;
  createdAt: string;
  siteCount?: number;
  submissionCount?: number;
}

interface Site {
  id: string;
  domain: string;
  verified: boolean;
  verificationToken: string | null;
  createdAt: string;
}

interface Submission {
  id: string;
  url: string;
  platform: string;
  status: string;
  response: string | null;
  createdAt: string;
}

interface SubmissionResult {
  platform: string;
  success: boolean;
  statusCode: number;
  message: string;
}

// Auth
export async function register(email: string): Promise<{ apiKey: string; user: User }>
export async function login(email: string): Promise<{ apiKey: string; user: User }>
export async function getMe(): Promise<User>

// Sites
export async function listSites(): Promise<Site[]>
export async function addSite(domain: string): Promise<Site>
export async function deleteSite(id: string): Promise<void>
export async function verifySite(id: string): Promise<{ verified: boolean }>
export async function getSiteStatus(id: string): Promise<{ verified: boolean }>

// Submissions
export async function submitUrl(url: string, platform: string, siteId?: string): Promise<SubmissionResult[]>
export async function submitSitemap(urls: string[], siteId: string, platform: string): Promise<any>
export async function listSubmissions(): Promise<Submission[]>
export async function getSubmissionStats(): Promise<{ total: number; today: number; byPlatform: Record<string, number> }>

// API Key management (client-side)
const API_KEY_STORAGE_KEY = "ranklens_api_key";

export function getStoredApiKey(): string | null
export function storeApiKey(key: string): void
export function clearApiKey(): void
```

**Important**: Set the auth token getter at app init (in `App.tsx` or `main.tsx`):
```ts
import { setAuthTokenGetter } from "@/api/custom-fetch";

setAuthTokenGetter(() => localStorage.getItem("ranklens_api_key"));
```

#### 5n. Indexing Page

**`client/src/pages/indexing.tsx`** — what to build:

```
┌─────────────────────────────────────────────────────┐
│  🔍 Indexing Engine                                 │
│  Submit your URLs to search engines in one click    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─── Setup Section (if no API key stored) ──────┐  │
│  │  Email: [____________________] [Get Started]   │  │
│  │  Your API Key: sk-... (show once)              │  │
│  └────────────────────────────────────────────────┘  │
│                                                     │
│  ┌─── Sites ─────────────────────────────────────┐  │
│  │  example.com     ✅ Verified      [Manage]    │  │
│  │  myblog.com      ❌ Unverified    [Verify ▾]  │  │
│  │  [ + Add Site ]                               │  │
│  └────────────────────────────────────────────────┘  │
│                                                     │
│  ┌─── Quick Submit ──────────────────────────────┐  │
│  │  URL: [_________________________________]     │  │
│  │  Submit to: [Bing ☐] [Yandex ☐] [Google ☐]  │  │
│  │  [Submit to Selected]  [Submit to All]        │  │
│  └────────────────────────────────────────────────┘  │
│                                                     │
│  ┌─── Recent Submissions ────────────────────────┐  │
│  │  URL           Platform  Status   Date         │  │
│  │  /page-1       Bing      ✅ Done  2m ago      │  │
│  │  /page-2       All       ⏳ Sent  5m ago      │  │
│  │  /page-3       Yandex    ❌ Fail  10m ago     │  │
│  │  [ View all → ]                              │  │
│  └────────────────────────────────────────────────┘  │
│                                                     │
│  ┌─── Stats ────────────────────────────────────┐  │
│  │  Total: 47  |  Today: 12  |  This week: 35   │  │
│  │  Bing: 20  |  Yandex: 15  |  Google: 12      │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Design rules**: Follow the Skeuomorphic design from `RANKLENS_ENGINEERING_GUIDE.md`:
- Use `.skeu` / `.skeu-inset` / `.skeu-btn` classes
- Use semantic color tokens (never raw hex)
- Use components from `@/components/ui/` (GlowCard, Button, Input, Select)
- Use icons from `lucide-react`
- Use `cn()` from `@/lib/utils` for class composition
- Use `framer-motion` for animations
- 4× spacing rule (only multiples of 4px)
- Mobile-first responsive design

**Key states to handle per section:**
- **Setup**: Empty state (no API key) → registration form. Loading state (registering). Success (show key once).
- **Sites**: Empty state (no sites) → prompt to add. Loading (skeleton). Error (fetch failed). Each site shows verified/unverified badge.
- **Submit**: URL validation error. In-flight submission (loading per platform button). Success toast. Error toast.
- **History**: Empty state (no submissions). Loading (skeleton). Paginated (show latest 10, "load more" button).
- **Stats**: Loading (skeleton placeholders). Zero state ("No submissions yet"). Computed from submission data.

#### 5o. Update `client/src/App.tsx`

Add import and route:
```tsx
import Indexing from "@/pages/indexing";

// In AppRouter, add after Reports route:
<Route path="/indexing">
  <AppLayout><Indexing /></AppLayout>
</Route>
```

#### 5p. Update `client/src/components/app-layout.tsx`

Add to `navItems` array:
```ts
import { Globe } from "lucide-react"; // or Send, Upload, Radio

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/analyzer", label: "Analyzer", icon: Search },
  { href: "/indexing", label: "Indexing", icon: Globe },      // ← ADD
  { href: "/keywords", label: "Keywords", icon: Key },
  { href: "/reports", label: "Reports", icon: FileText },
];
```

---

## 6. API Reference — Complete Contract

### `POST /api/auth/register`
```
Request:  { "email": "user@example.com" }
Response: { "apiKey": "a1b2c3...", "user": { "id": "uuid", "email": "user@example.com", "createdAt": "..." } }
Errors:   400 (invalid email), 409 (email taken)
```

### `POST /api/auth/login`
```
Request:  { "email": "user@example.com" }
Response: { "apiKey": "new-key...", "user": { ... } }
Errors:   404 (email not found)
```

### `GET /api/auth/me`
```
Headers:  Authorization: Bearer <apiKey>
Response: { "id": "...", "email": "...", "createdAt": "...", "siteCount": 3, "submissionCount": 27 }
Errors:   401 (invalid/missing key)
```

### `GET /api/sites`
```
Response: [
  { "id": "...", "domain": "example.com", "verified": true, "verificationToken": "...", "createdAt": "..." }
]
```

### `POST /api/sites`
```
Request:  { "domain": "example.com" }
Response: { "id": "...", "domain": "example.com", "verified": false, "verificationToken": "uuid", "createdAt": "..." }
```

### `DELETE /api/sites/:id`
```
Response: { "success": true }
```

### `POST /api/sites/:id/verify`
```
Response: { "verified": true } | { "verified": false, "error": "Meta tag not found" }
```

### `GET /api/sites/:id/status`
```
Response: { "verified": true, "method": "meta-tag" } | { "verified": false }
```

### `POST /api/submit`
```
Request:  { "url": "https://example.com/page", "platform": "all" | "bing" | "yandex" | "indexnow", "siteId": "optional-uuid" }
Response: {
  "submissions": [
    { "platform": "bing", "success": true, "statusCode": 200, "message": "URL submitted to Bing successfully" },
    { "platform": "yandex", "success": true, "statusCode": 200, "message": "URL submitted via IndexNow" },
  ]
}
```

### `POST /api/submit/sitemap`
```
Request:  { "urls": ["https://ex.com/a", "https://ex.com/b"], "siteId": "uuid", "platform": "all" }
Response: { "sitemapUrl": "https://ex.com/sitemap.xml (you host this)", "submissions": [...] }
```

### `GET /api/submissions`
```
Query:    ?limit=10&offset=0
Response: { "submissions": [...], "total": 47 }
```

### `GET /api/submissions/stats`
```
Response: { "total": 47, "today": 12, "byPlatform": { "bing": 20, "yandex": 15, "indexnow": 12 } }
```

---

## 7. Dependency Details

### Server Dependencies

| Package | Why | Version |
|---|---|---|
| `better-sqlite3` | Embedded SQLite DB (zero configuration, file-based) | ^11.7.0 |
| `uuid` | Generate UUIDs for IDs, API keys, verification tokens | ^10.0.0 |

**No additional client dependencies needed** — the existing stack (lucide-react, sonner, framer-motion, wouter, @tanstack/react-query, custom-fetch) covers everything.

### Dev Dependencies (server)

| Package | Why |
|---|---|
| `@types/better-sqlite3` | TypeScript types |
| `@types/uuid` | TypeScript types |

**Install command**: `cd server && npm install better-sqlite3 uuid`
**Install dev deps**: `cd server && npm install -D @types/better-sqlite3 @types/uuid`

---

## 8. Design & UX Considerations

### Authentication UX
- First visit to `/indexing`: show a clean registration card (email input + "Get API Key" button)
- After registration: display the API key **once** in a highlighted box with copy button + warning "save this"
- Store key in `localStorage` automatically
- Show "Connected as {email}" badge in the header
- "Disconnect" button clears the key

### Verification UX
- After adding a site, show a modal/panel with step-by-step instructions:
  1. "Copy this meta tag: `<meta name="ranklens-verify" content="...">`"
  2. "Paste it into your site's `<head>` section"
  3. "Click Verify when deployed"
- Show a "Verify" button that triggers `POST /sites/:id/verify`
- The server fetches the site and checks for the meta tag
- Show success/failure with clear next steps

### Submission UX
- Quick submit: large single URL input + platform checkboxes (Bing, Yandex) + "Submit" button
- Google option: generates a clickable link to Search Console (greyed out, tooltip says "opens Search Console")
- Show results inline below the form per platform
- Success: green checkmark + timestamp
- Rate limited: show countdown (matching existing pattern in analyzer.tsx)

### Empty States
- **No sites**: "Add your first site to get started" with illustration
- **No submissions**: "Submit a URL to see your submission history"
- **Not registered**: "Connect your email to start indexing"

### Error States
- **Network error**: "Could not reach the server. Check your connection."
- **Auth expired**: "Your session expired. Please reconnect." → show registration again
- **Invalid URL**: "Enter a valid HTTP or HTTPS URL"
- **Domain not verified**: "Verify your site ownership before submitting"

### Loading States
- **Submitting**: Animated button with spinner "Submitting to Bing..."
- **Fetching sites**: Skeleton cards (3 rows)
- **Verifying**: Pulsing badge "Checking..."

### Rate Limiting
- Follow existing pattern: 1 submit per 60 seconds (reuse `analysisRateLimiter` or create a `submissionRateLimiter`)
- Use `RateLimitDialog` component from existing codebase
- Show countdown timer

### Integration with Existing Analyzer (Future)
- After an analysis completes, show a "Submit for Indexing" action button
- Analysis results could identify which pages need indexing
- The "Indexing" tab becomes the action hub for analysis findings

---

## 9. Verification & Testing

### Type Checking
```bash
cd server && npm run typecheck
cd client && npm run typecheck
```

### Build
```bash
cd client && npm run build
```

### Manual Test Checklist
1. Register with email → get API key
2. Refresh page → stays logged in
3. Add a site (domain)
4. Verify site ownership (meta tag)
5. Submit a URL to Bing → success
6. Submit a URL to Yandex → success
7. Submit to All → both succeed
8. View submission history
9. Delete a site
10. Disconnect (clear API key) → back to registration

### Edge Cases
- URL with trailing slash normalization
- URL without protocol (auto-prepend https://)
- International domains (IDN)
- Very long URLs (>2000 chars)
- Submitting the same URL twice (duplicate allowed, show warning?)
- Submitting to platform without verified site (show error)
- Server restart: SQLite file persists
- Concurrent submissions: each gets recorded independently

---

## 10. Deployment Notes

### SQLite on Render
- `better-sqlite3` compiles native addons via `node-gyp` — Render supports this
- Set `DATABASE_PATH` env to a persistent disk path (Render persistent disks: `/opt/render/project/data/`)
- SQLite WAL mode handles concurrent reads well; writes are serialized (fine for MVP scale)

### Security Considerations
- API keys: hashed with SHA-256 before storage (never store raw keys)
- Rate limiting: per-IP + per-API-key (reuse existing `LocalRateLimiter` pattern)
- SSRF protection: validate URLs with existing `validatePublicUrl` from `url-guard.ts` before submitting to external APIs
- SQL injection: prevented by `better-sqlite3` parameterized queries
- Store `INDEXNOW_KEY` as server env var, not client-accessible
- No sensitive data in client-side bundles

### Future Scale Path
- SQLite → PostgreSQL (when Supabase is added per product roadmap)
- Auth → Supabase Auth (when planned auth lands)
- Google OAuth → Full OAuth 2.0 flow for Search Console API
- File-based sitemaps → Hosted on RankLens CDN
- Batch submissions → Background job queue (BullMQ as planned)

---

## 11. Quick-Start Implementation Checklist

```
Server Side:
☐ npm install better-sqlite3 uuid (in server/)
☐ Add @types/better-sqlite3 @types/uuid as devDeps
☐ Create server/src/db/index.ts
☐ Create server/src/lib/auth-service.ts
☐ Create server/src/lib/indexnow-service.ts
☐ Create server/src/lib/sitemap-service.ts
☐ Create server/src/lib/search-console-service.ts
☐ Create server/src/routes/auth.ts
☐ Create server/src/routes/sites.ts
☐ Create server/src/routes/submit.ts
☐ Update server/src/routes/index.ts
☐ Update server/src/app.ts (add routes)
☐ Update server/src/lib/env.ts (add vars)
☐ npm run typecheck (server)

Client Side:
☐ Create client/src/api/indexing.ts
☐ Create client/src/pages/indexing.tsx
☐ Update client/src/App.tsx (add /indexing route)
☐ Update client/src/components/app-layout.tsx (add nav item)
☐ npm run typecheck (client)
☐ npm run build (client)

Manual Testing:
☐ Registration flow
☐ Site management flow
☐ URL submission flow
☐ Submission history
☐ Error states
☐ Edge cases
```

---

## 12. IndexNow Protocol Reference

The IndexNow protocol is an open standard supported by Bing, Yandex, Seznam, and others. It is the simplest way to notify search engines of content changes.

**API endpoint**: `https://api.indexnow.org/indexnow`

**Request format**:
```json
{
  "host": "www.example.com",
  "key": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "keyLocation": "https://www.example.com/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.txt",
  "urlList": [
    "https://www.example.com/url1",
    "https://www.example.com/url2"
  ]
}
```

**Key verification**: The API key must be accessible at `https://{host}/{key}.txt` containing just the key string. This verifies domain ownership.

**Direct Bing submission**: `https://www.bing.com/indexnow` (same payload)
**Direct Yandex submission**: `https://yandex.com/indexnow` (same payload — Yandex uses IndexNow)

**Rate limits**: Generally 100 URLs per call, up to 10,000 URLs per day.

**For MVP**: Use a single shared IndexNow key stored on the server. Users don't need to generate their own.
- Pro: Zero setup for users
- Con: Key must be hosted at `https://{user-domain}/{key}.txt` — user still needs to host a file
- Alternative: Have users generate their own key and host the file; we provide clear instructions

**Recommendation for MVP**: Guide users through creating their own IndexNow key:
1. User generates a random hex string (we provide a button)
2. User hosts `https://{domain}/{key}.txt` containing the key
3. User submits the key + domain to RankLens
4. RankLens verifies by fetching the file, then uses it for submissions

---

## 13. Future Enhancements (Post-MVP)

| Feature | When | Complexity |
|---|---|---|
| Google Search Console OAuth integration | After Supabase auth | High |
| Scheduled recurring submissions | After job queue | Medium |
| Bulk URL upload (CSV) | MVP+1 | Low |
| Auto-submit after analysis completes | MVP+1 | Low |
| Sitemap hosting on RankLens | After CDN/storage | Medium |
| Submission analytics (click tracking) | Future | High |
| Multi-user team workspaces | After Supabase | Medium |
| IndexNow key auto-generation + hosting | After file storage | Medium |
| AI-powered recommendations ("these pages need indexing") | After analysis integration | Medium |
