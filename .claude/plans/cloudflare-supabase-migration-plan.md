# Cloudflare Pages + Supabase Migration Plan

## Overview

Migrate Nuxt 3 budgeting app from SQLite to Supabase PostgreSQL, deploy to Cloudflare Pages, add authentication, and implement data privacy via pseudonymization.

**Phases:**
- **Prerequisites:** Account setup & domain purchase (do this first!)
- **Phase A:** Infrastructure (Cloudflare + Supabase setup)
- **Phase B:** Authentication (Supabase Auth)
- **Phase C:** Data Privacy (Pseudonymization + RLS)
- **Phase D:** Audit Logging
- **Phase E:** Deployment & Migration

---

## Prerequisites (Do These First!)

Before we can start coding, you need to set up accounts and purchase a domain.

### 1. Purchase a Domain

#### Option A: South African Domain (.co.za) - Recommended for Local Users

**South African Registrars:**
| Registrar | Price | Notes |
|-----------|-------|-------|
| [HOSTAFRICA](https://hostafrica.co.za/domains/) | R49/year | Cheapest, free with hosting |
| [Absolute Hosting](https://absolutehosting.co.za/domains) | R86/year | Top .ZA Registrar 2025 |
| [Domains.co.za](https://www.domains.co.za/domain-registration) | ~R99/year | Only ICANN Accredited in SA |
| [xneelo](https://xneelo.co.za/domains/) | ~R99/year | 7-day refund policy |
| [RegisterDomain.co.za](https://www.registerdomain.co.za/) | R75/year (reseller) | 10-15 min registration |

**Benefits of .co.za:**
- Local SEO boost for South African searches
- No restrictions - anyone can register
- Cheaper than international TLDs
- Signals "South African" to users

**Steps (HOSTAFRICA - Cheapest):**
1. Go to https://hostafrica.co.za/domains/
2. Search for your desired domain (e.g., `yourname.co.za`)
3. Add to cart (R49/year first year, R109 renewal)
4. Create account and purchase
5. Later, update nameservers to Cloudflare

#### Option B: International Domain (.com, .dev, .app)

**Cloudflare Registrar (at-cost pricing):**
1. Go to https://dash.cloudflare.com
2. Sign up for a free account
3. Click **"Register Domains"** in sidebar
4. Search and purchase:
   - `.com` domains: ~$10/year (~R180)
   - `.dev` domains: ~$12/year (~R220)
   - `.app` domains: ~$14/year (~R250)

**Other International Registrars:**
- Namecheap
- Porkbun (often cheapest)
- Google Domains (now Squarespace)

#### Which to Choose?

| Domain Type | Best For | Price |
|-------------|----------|-------|
| `.co.za` | SA-focused app, local SEO | R49-99/year |
| `.com` | International reach | ~R180/year |
| `.dev` | Developer/tech projects | ~R220/year |
| `.app` | Mobile/web apps | ~R250/year |

**Recommendation:** If all users are South African and you want the cheapest option, go with `.co.za` from HOSTAFRICA. If you might expand internationally later, get a `.com` from Cloudflare Registrar.

### 2. Create Cloudflare Account

**What you get (Free tier):**
- Unlimited websites
- Free SSL certificates
- CDN (content delivery network)
- Cloudflare Pages (100,000 requests/day)
- Workers (100,000 requests/day)

**Steps:**
1. Go to https://dash.cloudflare.com/sign-up
2. Enter email and create password
3. Verify your email
4. If you bought domain elsewhere:
   - Click **"Add a Site"**
   - Enter your domain name
   - Select **Free plan**
   - Cloudflare will scan existing DNS records
   - Update nameservers at your registrar to Cloudflare's nameservers
   - Wait for propagation (can take up to 24 hours, usually minutes)

**Cloudflare Dashboard Layout (for reference):**
```
Dashboard
├── Websites (your domains)
├── Workers & Pages (where your app deploys)
├── Register Domains (buy domains)
├── R2 (object storage - optional)
└── D1 (SQLite database - we're using Supabase instead)
```

### 3. Create Supabase Account

**What you get (Free tier):**
- 500 MB database storage
- 50,000 monthly active users
- 1 GB file storage
- 2 active projects
- Unlimited API requests
- Built-in authentication

**Steps:**
1. Go to https://supabase.com
2. Click **"Start your project"**
3. Sign up with GitHub (recommended) or email
4. Once logged in, click **"New Project"**
5. Configure your project:
   - **Name:** `budgeting-app` (or your preferred name)
   - **Database Password:** Generate a strong password and **SAVE IT SECURELY**
   - **Region:** `eu-west-2 (London)` - **IMPORTANT for South Africa!** (closest available region, ~100-150ms latency)
   - **Pricing Plan:** Free
6. Click **"Create new project"**
7. Wait ~2 minutes for project to provision

**After project is created, note these credentials:**
```
Project URL:     https://xxxxxxxxxx.supabase.co
API Key (anon):  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
API Key (service_role): eyJhbGciOiJIUzI1NiIsInR5cCI6... (keep secret!)
```

**Finding Connection Strings:**
1. In Supabase dashboard, click **"Settings"** (gear icon)
2. Click **"Database"** in the left menu
3. Scroll to **"Connection string"** section
4. You'll see:
   - **URI** (direct connection) - for migrations
   - **Connection pooling** - for runtime (use this in app)

### 4. Link Domain to Cloudflare (if purchased elsewhere)

If you didn't buy through Cloudflare Registrar:
1. Log into Cloudflare dashboard
2. Click **"Add a Site"**
3. Enter your domain
4. Select **Free** plan
5. Cloudflare shows you two nameservers (e.g., `ada.ns.cloudflare.com`)
6. Go to your domain registrar
7. Find DNS/Nameserver settings
8. Replace existing nameservers with Cloudflare's
9. Wait for propagation (check at https://dnschecker.org)

### Prerequisites Checklist

- [ ] Domain purchased (any registrar)
- [ ] Cloudflare account created
- [ ] Domain added to Cloudflare (nameservers updated if needed)
- [ ] Supabase account created
- [ ] Supabase project created
- [ ] Database password saved securely
- [ ] Noted Supabase Project URL, anon key, service_role key, and connection strings

**Once all prerequisites are complete, proceed to Phase A!**

---

## Supabase Free Tier Capacity

| Resource | Limit | Your Usage Estimate |
|----------|-------|---------------------|
| Database | 500 MB | ~50-100 MB per user (3 years data) |
| MAUs | 50,000 | Plenty for personal use |
| Projects | 2 | Using 1 with separate schemas |
| Bandwidth | 10 GB | Sufficient |

**Estimate:** 5-10 users before hitting storage limits. MAUs won't be the bottleneck.

---

## Performance for South African Users

### The Honest Assessment

Your app has two parts with different latency characteristics:

| Component | Location | Latency from SA |
|-----------|----------|-----------------|
| **Static Assets (HTML, JS, CSS)** | Cloudflare Edge (JHB/CPT/DBN) | **~10-30ms** |
| **Database (Supabase)** | EU (London) | **~100-180ms** |

### Cloudflare Edge in South Africa

**Good news:** Cloudflare has 3 data centers in South Africa:
- Johannesburg (JNB)
- Cape Town (CPT)
- Durban (DUR)

This means your static content (Vue components, CSS, JS bundles) will be served from within South Africa with excellent latency (~10-30ms).

**Caveat:** Some users have reported [occasional routing issues](https://community.cloudflare.com/t/high-latency-as-most-south-african-traffic-is-being-routed-via-london-data-center/775964) where traffic gets routed to London instead of local data centers. This is rare and typically resolved quickly.

### Supabase (Database) Latency

**Bad news:** Supabase does NOT have a South Africa region. [Community has requested it](https://github.com/orgs/supabase/discussions/34614), but it's not available.

**Closest regions:**
| Region | Latency from SA |
|--------|-----------------|
| EU West (London) | ~100-150ms |
| EU Central (Frankfurt) | ~150-180ms |

**Recommendation:** Use **EU West (London)** - it's the closest hop from South Africa.

### Real-World Impact on Your App

For a budgeting app, this is **acceptable** because:

1. **Initial page load:** Fast (~50-100ms) - served from Cloudflare SA edge
2. **API calls (database):** ~100-150ms round trip to London
3. **User experience:** Feels snappy for form submissions and data fetches

**What 100-150ms feels like:**
- Button click → data appears in ~150ms (imperceptible to most users)
- Form submit → confirmation in ~200ms (feels instant)
- Page navigation → content loads in ~300-400ms (fast)

### Cloudflare vs Alternatives for South Africa

| Provider | SA Edge Locations | Free Tier | Best For |
|----------|-------------------|-----------|----------|
| **Cloudflare Pages** | 3 (JHB, CPT, DBN) | 100k req/day | Static + SSR apps |
| Vercel | 1 (Cape Town) | 100GB bandwidth | Next.js apps |
| Netlify | 0 (routes to São Paulo!) | 100GB bandwidth | Static sites |

**Verdict: Cloudflare is the best choice** for South African users because:
1. Most edge locations in SA (3 vs 1 vs 0)
2. Generous free tier (100k requests/day)
3. No premium pricing for SA region (Vercel charges extra)
4. Nuxt 3 has excellent Cloudflare support via Nitro

### Caching Strategy (No CDN Staleness Issues)

Your app won't have CDN caching problems because:

1. **Static assets:** Cached at SA edge, auto-invalidated on deploy
2. **API responses:** NOT cached by CDN - always fresh from Supabase
3. **User data:** Real-time from database (no stale data risk)

Cloudflare Pages handles cache invalidation automatically on each deployment.

### Alternative: Self-Host Supabase in SA

If ~100ms latency is unacceptable, you could self-host Supabase on a South African VPS:
- [HOSTAFRICA VPS](https://www.hostafrica.com.gh/supabase-vps/) - SA-based
- Hetzner South Africa
- AWS Cape Town (af-south-1)

**Trade-offs:** More complexity, more cost, more maintenance. For a personal budgeting app, **not recommended** - the managed Supabase free tier is worth the ~100ms latency.

### Performance Summary

| Scenario | Expected Latency | User Experience |
|----------|------------------|-----------------|
| Page load (cached) | 30-50ms | Instant |
| Page load (first visit) | 100-200ms | Fast |
| Save transaction | 100-150ms | Instant |
| Load month data | 100-150ms | Fast |
| Switch between months | 50-100ms | Instant (cached UI) |

**Bottom line:** Your South African users will have a good experience. The ~100ms database latency is standard for apps using cloud databases from SA.

---

## Phase A: Infrastructure Setup

### A1. Create Supabase Project
1. Sign up at https://supabase.com
2. Create new project, note:
   - Project URL: `https://<project-ref>.supabase.co`
   - Anon key (client-side)
   - Service role key (server-side only)
   - Connection strings (Direct port 5432, Pooled port 6543)

### A2. Create PostgreSQL Schema for Multi-App
```sql
CREATE SCHEMA IF NOT EXISTS budgeting;
GRANT USAGE ON SCHEMA budgeting TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA budgeting TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA budgeting TO anon, authenticated, service_role;
```

### A3. Install Dependencies
```bash
npm install @nuxtjs/supabase @supabase/supabase-js
```

### A4. Update Prisma Schema
**File:** `prisma/schema.prisma`

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
  schemas   = ["budgeting"]
}

// Add @@schema("budgeting") to ALL models
```

### A5. Environment Variables
**File:** `.env` (don't commit!)

```env
# Pooled connection (runtime) - Port 6543
DATABASE_URL=postgresql://postgres.<ref>:<pass>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct connection (migrations) - Port 5432
DIRECT_URL=postgresql://postgres.<ref>:<pass>@aws-0-<region>.pooler.supabase.com:5432/postgres

# Supabase
NUXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NUXT_PUBLIC_SUPABASE_KEY=<anon-key>
SUPABASE_SERVICE_KEY=<service-role-key>
```

### A6. Update Nuxt Config
**File:** `nuxt.config.ts`

```typescript
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/color-mode',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/supabase',  // Add
  ],

  nitro: {
    preset: 'cloudflare_module',  // Add
  },

  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      include: ['/transaction/*', '/yearly/*'],
      exclude: ['/'],
    },
  },
})
```

---

## Phase B: Authentication

### B1. Create Auth Composable
**File:** `composables/useAuth.ts`

- `signInWithPassword(email, password)`
- `signUp(email, password)`
- `signOut()`
- `user`, `isAuthenticated` computed refs

### B2. Create Auth Middleware
**File:** `middleware/auth.ts`

- Redirect unauthenticated users to `/login`
- Allow public routes: `/`, `/login`, `/signup`, `/confirm`

### B3. Create Auth Pages
**Files to create:**
- `pages/login.vue` - Email/password login form
- `pages/signup.vue` - Registration form
- `pages/confirm.vue` - Email confirmation handler

---

## Phase C: Data Privacy (Pseudonymization)

### Architecture
```
Supabase Auth (auth.users)
         |
         v
budgeting.profiles (auth_user_id -> profile_token)
         |
         v profile_token (prf_xxx)
Financial Data Tables (reference profile_token, NOT user email)
```

**Why this works:** Even if DB is compromised, attacker sees `prf_a1b2c3d4...` not `john@email.com`. The mapping is protected by RLS.

### C1. Create Profile Token System
**SQL in Supabase:**

```sql
-- Profiles table
CREATE TABLE budgeting.profiles (
  id SERIAL PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  profile_token TEXT UNIQUE NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Auto-generate tokens
CREATE OR REPLACE FUNCTION budgeting.generate_profile_token()
RETURNS TEXT AS $$
BEGIN
  RETURN 'prf_' || encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Auto-create profile on signup (trigger)
CREATE OR REPLACE FUNCTION budgeting.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO budgeting.profiles (auth_user_id, profile_token, created_at, updated_at)
  VALUES (NEW.id, budgeting.generate_profile_token(),
          EXTRACT(EPOCH FROM NOW())::BIGINT,
          EXTRACT(EPOCH FROM NOW())::BIGINT);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION budgeting.handle_new_user();
```

### C2. Update Prisma Models
**File:** `prisma/schema.prisma`

Change `userId` to `profileToken` in:
- `TransactionMonth`
- `YearlyBudget`

```prisma
model Profile {
  id           Int    @id @default(autoincrement())
  authUserId   String @unique @map("auth_user_id") @db.Uuid
  profileToken String @unique @map("profile_token")
  createdAt    Int    @map("created_at")
  updatedAt    Int    @map("updated_at")

  transactionMonths TransactionMonth[]
  yearlyBudgets     YearlyBudget[]

  @@map("profiles")
  @@schema("budgeting")
}

model TransactionMonth {
  // Change userId to profileToken
  profileToken String @map("profile_token")
  profile      Profile @relation(fields: [profileToken], references: [profileToken])
  // ... rest unchanged
}
```

### C3. Row Level Security (RLS)
**SQL in Supabase:**

```sql
-- Helper function
CREATE OR REPLACE FUNCTION budgeting.get_profile_token()
RETURNS TEXT AS $$
  SELECT profile_token FROM budgeting.profiles WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE budgeting.transaction_months ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables

-- Example policy
CREATE POLICY "Users can view own months"
  ON budgeting.transaction_months FOR SELECT
  USING (profile_token = budgeting.get_profile_token());
```

### C4. Server Auth Utility
**File:** `server/utils/auth.ts`

```typescript
export async function getProfileToken(event: H3Event): Promise<string> {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const profile = await prisma.profile.findUnique({
    where: { authUserId: user.sub },
    select: { profileToken: true },
  })

  if (!profile) throw createError({ statusCode: 404, message: 'Profile not found' })
  return profile.profileToken
}
```

### C5. Update All API Routes (39 files)
**Pattern:**

```typescript
// Before
const months = await prisma.transactionMonth.findMany()

// After
const profileToken = await getProfileToken(event)
const months = await prisma.transactionMonth.findMany({
  where: { profileToken }
})
```

**Files to modify:**
- `server/api/months/*.ts` (7 files)
- `server/api/fixed-payments/*.ts` (3 files)
- `server/api/categories/*.ts` (3 files)
- `server/api/transactions/*.ts` (3 files)
- `server/api/yearly/*.ts` (23 files)

---

## Phase D: Audit Logging

### D1. Create Audit Table
```sql
CREATE TABLE budgeting.audit_logs (
  id SERIAL PRIMARY KEY,
  profile_token TEXT,
  action TEXT NOT NULL,  -- CREATE, READ, UPDATE, DELETE
  table_name TEXT NOT NULL,
  record_id INT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at BIGINT NOT NULL
);

CREATE INDEX idx_audit_logs_profile ON budgeting.audit_logs(profile_token);
```

### D2. Create Audit Utility
**File:** `server/utils/audit.ts`

```typescript
export async function logAudit({ profileToken, action, tableName, recordId, oldData, newData, event }) {
  // Log to audit_logs table
}
```

---

## Phase E: Deployment

### E1. Cloudflare Pages Setup
1. Create account at https://dash.cloudflare.com
2. Go to Pages > Create project
3. Connect GitHub repository
4. Configure build:
   - Build command: `npm run build`
   - Output directory: `.output/public`

### E2. Environment Variables in Cloudflare
Set in Cloudflare Pages dashboard:
- `DATABASE_URL`
- `DIRECT_URL`
- `NUXT_PUBLIC_SUPABASE_URL`
- `NUXT_PUBLIC_SUPABASE_KEY`
- `SUPABASE_SERVICE_KEY`

### E3. Custom Domain
1. In Cloudflare Pages > Custom domains
2. Add `budget.yourdomain.com`
3. Update DNS as instructed

### E4. Data Migration
1. Export SQLite data: `npx tsx scripts/export-data.ts`
2. Create your profile in new system
3. Import with your profile token

---

## Implementation Order

### Step 0: Prerequisites (You do this manually)
- [ ] Purchase domain (Cloudflare Registrar recommended)
- [ ] Create Cloudflare account
- [ ] Add domain to Cloudflare
- [ ] Create Supabase account
- [ ] Create Supabase project
- [ ] Save database password securely
- [ ] Note all credentials (Project URL, keys, connection strings)

### Step 1: Supabase Schema Setup (SQL in Supabase dashboard)
- [ ] Run schema creation SQL (create `budgeting` schema)
- [ ] Run profile token system SQL (profiles table + trigger)
- [ ] Run RLS policies SQL

### Step 2: Local Development Setup
- [ ] Install `@nuxtjs/supabase`
- [ ] Update `.env` with Supabase credentials
- [ ] Update `nuxt.config.ts`
- [ ] Update `prisma/schema.prisma` for PostgreSQL + multiSchema

### Step 3: Authentication
- [ ] Create `composables/useAuth.ts`
- [ ] Create `middleware/auth.ts`
- [ ] Create `pages/login.vue`, `pages/signup.vue`, `pages/confirm.vue`
- [ ] Create `server/utils/auth.ts`

### Step 4: Pseudonymization
- [ ] Add Profile model to Prisma
- [ ] Update TransactionMonth and YearlyBudget to use profileToken
- [ ] Run `npx prisma db push`

### Step 5: Update API Routes (39 files)
- [ ] Add `getProfileToken(event)` to each route
- [ ] Filter queries by `profileToken`
- [ ] Add audit logging

### Step 6: RLS Policies
- [ ] Run RLS SQL in Supabase

### Step 7: Cloudflare Deployment
- [ ] Connect repo to Cloudflare Pages
- [ ] Set environment variables
- [ ] Deploy and test

### Step 8: Data Migration
- [ ] Export existing data
- [ ] Import to Supabase with profile token

---

## Critical Files Summary

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | PostgreSQL + multiSchema + Profile model |
| `nuxt.config.ts` | Supabase module + Cloudflare preset |
| `server/utils/auth.ts` | `getProfileToken()` utility |
| `.env` | Supabase credentials (never commit) |
| All `server/api/**/*.ts` | Add auth + profileToken filtering |

---

## Security Summary

| Layer | Protection |
|-------|------------|
| **Transport** | HTTPS (Cloudflare) |
| **Authentication** | Supabase Auth (JWT) |
| **Authorization** | Row Level Security (RLS) |
| **Data Privacy** | Pseudonymization (profile tokens) |
| **Audit Trail** | Audit logs table |
| **Encryption** | At-rest encryption (Supabase default) |

**Result:** Even with full DB access, attacker sees:
- `prf_a1b2c3d4e5f6...` instead of `john@email.com`
- Financial data cannot be linked to real identity without RLS-protected mapping
