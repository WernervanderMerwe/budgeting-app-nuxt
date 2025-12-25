# Cloudflare Pages Deployment Plan

## Architecture Decision: Subdomain Approach

**Target URL:** `budget.wernerbuildsapps.co.za`

### Why Subdomains (Professional Standard)
- **Industry pattern**: Notion (`app.notion.so`), Slack (`app.slack.com`), Vercel
- **Zero complexity**: Each app is independent Cloudflare Pages project
- **Future-proof**: Easy to add custom domains when monetizing apps
- **No code changes**: Nuxt works as-is (no baseURL needed)

### Future Portfolio Structure
```
wernerbuildsapps.co.za          → Landing page (Vue 3 SPA, later)
budget.wernerbuildsapps.co.za   → Budgeting app (this deployment)
app2.wernerbuildsapps.co.za     → Future app 2
myapp.co.za                     → Paid app (buy domain when ready)
```

---

## Current State Summary

**Supabase (Ready)**
- Project URL: `https://pqyzllcywfswqjvqhseq.supabase.co`
- All 12 tables exist in `budgeting` schema
- 8 migrations applied, auth system configured

**Cloudflare (Ready)**
- Account: `02d0c4942d03497b0091284ba7ddfba9`
- Domain: `wernerbuildsapps.co.za` (DNS managed)
- No pages/workers deployed yet

**Code (Mostly Ready)**
- `cloudflare_module` preset already configured in nuxt.config.ts
- Supabase module integrated

---

## Issues to Fix Before Deployment

### Security Issues (5)
| Level | Issue | Location |
|-------|-------|----------|
| ERROR | RLS disabled on `_prisma_migrations` | public schema |
| WARN | Function search_path mutable | `generate_profile_token` |
| WARN | Function search_path mutable | `get_current_profile_token` |
| WARN | pgaudit extension in public | public schema |
| WARN | Leaked password protection disabled | Supabase Auth |

### Code Issues (2)
| Issue | File | Line |
|-------|------|------|
| Missing TypeScript types | `types/database.types.ts` | N/A |
| Cookie secure: false | `nuxt.config.ts` | 55 |

### Performance Issues (10)
- 8 unindexed foreign keys
- 2 RLS policy optimizations needed on profiles table

---

## Phase 1: Database Security Fixes

### Task 1.1: Fix Function Search Paths
Apply Supabase migration to secure functions:
```sql
ALTER FUNCTION budgeting.generate_profile_token() SET search_path = budgeting;
ALTER FUNCTION budgeting.get_current_profile_token() SET search_path = budgeting;
```

### Task 1.2: Optimize RLS Policies
Fix profiles table RLS to use SELECT subqueries:
```sql
DROP POLICY IF EXISTS "Users can view own profile" ON budgeting.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON budgeting.profiles;

CREATE POLICY "Users can view own profile" ON budgeting.profiles
  FOR SELECT USING (auth_user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile" ON budgeting.profiles
  FOR UPDATE USING (auth_user_id = (SELECT auth.uid()));
```

### Task 1.3: Add Foreign Key Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_transaction_categories_month_id
  ON budgeting.transaction_categories(month_id);
CREATE INDEX IF NOT EXISTS idx_transaction_entries_category_id
  ON budgeting.transaction_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_transaction_fixed_payments_month_id
  ON budgeting.transaction_fixed_payments(month_id);
CREATE INDEX IF NOT EXISTS idx_yearly_categories_parent_id
  ON budgeting.yearly_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_yearly_categories_section_id
  ON budgeting.yearly_categories(section_id);
CREATE INDEX IF NOT EXISTS idx_yearly_deductions_income_entry_id
  ON budgeting.yearly_deductions(income_entry_id);
CREATE INDEX IF NOT EXISTS idx_yearly_income_sources_budget_id
  ON budgeting.yearly_income_sources(yearly_budget_id);
CREATE INDEX IF NOT EXISTS idx_yearly_sections_budget_id
  ON budgeting.yearly_sections(yearly_budget_id);
```

### Task 1.4: Enable Leaked Password Protection
- Manual step in Supabase Dashboard: Auth > Settings > Password Security
- Enable "Check passwords against leaked password database"

---

## Phase 2: Code Fixes

### Task 2.1: Generate Supabase TypeScript Types
**File:** `types/database.types.ts` (new)
- Use Supabase MCP tool to generate types
- Eliminates the repeated warning in dev server

### Task 2.2: Fix Cookie Security Setting
**File:** `nuxt.config.ts` (line 55)
```typescript
// Change from:
secure: false,
// To:
secure: process.env.NODE_ENV === 'production',
```

### Task 2.3: Update Supabase Auth Redirect URLs
In Supabase Dashboard (Authentication > URL Configuration):
- Site URL: `https://budget.wernerbuildsapps.co.za`
- Redirect URLs: Add `https://budget.wernerbuildsapps.co.za/**`

---

## Phase 3: Cloudflare Deployment

### Task 3.1: Create wrangler.toml
**File:** `wrangler.toml` (new)
```toml
name = "budgeting-app"
compatibility_date = "2025-01-15"
pages_build_output_dir = ".output/public"

[vars]
NODE_ENV = "production"
```

### Task 3.2: Build the Application
```bash
npm run build
```
Output will be in `.output/` directory.

### Task 3.3: Test Locally with Wrangler
```bash
npx wrangler pages dev .output/public
```

### Task 3.4: Create Cloudflare Pages Project
```bash
npx wrangler pages project create budgeting-app
```

### Task 3.5: Configure Environment Variables
In Cloudflare Dashboard or via CLI, set:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Supabase anon/public key
- `DATABASE_URL` - Supabase pooling connection string (port 6543)
- `DIRECT_URL` - Supabase direct connection string (port 5432)

### Task 3.6: Deploy to Cloudflare Pages
```bash
npx wrangler pages deploy .output/public --project-name=budgeting-app
```

### Task 3.7: Configure Subdomain DNS
In Cloudflare Dashboard (DNS section for wernerbuildsapps.co.za):
1. Add CNAME record:
   - Name: `budget`
   - Target: `budgeting-app.pages.dev`
   - Proxy: Enabled (orange cloud)

### Task 3.8: Add Custom Domain to Pages Project
In Cloudflare Dashboard:
1. Go to Pages > budgeting-app > Custom domains
2. Add: `budget.wernerbuildsapps.co.za`
3. SSL certificate auto-provisioned

---

## Phase 4: Post-Deployment Verification

### Task 4.1: Test Authentication Flow
- [ ] Login page loads
- [ ] Registration works
- [ ] Email confirmation works
- [ ] Redirect to app after auth

### Task 4.2: Test Transaction Mode
- [ ] Create new month
- [ ] Add categories
- [ ] Add transactions
- [ ] View summary

### Task 4.3: Test Yearly Mode
- [ ] Create yearly budget
- [ ] Add income sources
- [ ] Add budget sections/categories
- [ ] View yearly summary

### Task 4.4: Run Security Advisor Check
Re-run Supabase security advisors to confirm all issues resolved.

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `nuxt.config.ts` | Edit | Fix cookie secure setting |
| `types/database.types.ts` | Create | Generate Supabase types |
| `wrangler.toml` | Create | Cloudflare Pages config |

## Supabase Migrations to Apply

1. `fix_function_search_paths` - Security fix
2. `optimize_rls_policies` - Performance fix
3. `add_foreign_key_indexes` - Performance fix

---

## Future: GitHub CI/CD Integration

After manual deployment is verified working:
1. Connect GitHub repo to Cloudflare Pages
2. Configure build settings:
   - Build command: `npm run build`
   - Build output: `.output/public`
   - Root directory: `/`
3. Set environment variables in Cloudflare Pages settings
4. Enable automatic deployments on push to main

---

## Summary

**Target:** `budget.wernerbuildsapps.co.za`

**Total Tasks:** 17
- Phase 1 (Database): 4 tasks
- Phase 2 (Code): 3 tasks
- Phase 3 (Deploy): 8 tasks
- Phase 4 (Verify): 4 tasks (manual testing)

**Effort:** Moderate - achievable in one session

---

## Research Sources

- [Cloudflare Workers Routes](https://developers.cloudflare.com/workers/configuration/routing/routes/)
- [Route Multiple Workers/Pages to Different Paths](https://community.cloudflare.com/t/route-multiple-cloudflare-workers-pages-to-different-url-paths-on-a-single-domain/808544)
- [Deploying to Subdirectory Challenges](https://community.cloudflare.com/t/deploying-cloudflare-page-to-subdirectory-big-issues/782674)
- [Multi-Domain SaaS with Cloudflare](https://medium.com/codex/how-i-use-cloudflare-to-build-multi-domain-saas-applications-with-react-single-page-applications-527e1a742401)
