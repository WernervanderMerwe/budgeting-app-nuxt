# Next Session — TODO

_Rewritten 2026-07-07. The 2026-07-01 version of this file told you to add a Cloudflare payment method and finish the Zero Trust/Hyperdrive path — that whole approach is DEAD. Do not pursue it._

## Current state (2026-07-07)

- **Supabase security remediation (old Track B): DONE** — Werner handled the key rotation himself from the tutoring repo. Not independently verified; offer a 401-check if relevant, don't nag.
- **Budgeting cutover (old Track A): re-planned.** The app now deploys ON the VPS via the ecom template (build Docker image on desktop → ghcr.io → VPS pull; nginx + Cloudflare Origin Cert; DB = shared `infra-postgres` over the Docker network). No Zero Trust, no Hyperdrive, no card.

## 👉 THE ONE THING TO DO

Execute **`docs/plans/2026-07-07-phase2e-vps-hosted-cutover.md`** task-by-task (it's self-contained; use superpowers:executing-plans / subagent-driven-development). Reviewed and approved by Werner 2026-07-07; execution green-lit through Task 6b.

- Tasks 1–6b: local code changes (pnpm switch, node_server preset, Dockerfile/compose/scripts/nginx, Cloudflare-breadcrumb sweep). Commit per task.
- **Task 7 ⛔:** STOP — Werner reviews and pushes the branch himself.
- Tasks 8–10: image build+push, VPS bring-up, DNS.
- **Task 11 ⛔:** STOP — Werner smoke-tests before it counts as live.
- Task 12: ask-first cleanup (tunnel route, Hyperdrive config, Pages project, Supabase Cloud, `.env.local`).

## Still owed (after cutover is stable)

- Nightly `pg_dump` backups (tutoring + budgeting) with offsite copy — VPS has **none**.
- General VPS audit (memory: `vps-security-audit-pending`).
- ~27 GB reclaimable Docker cruft on the VPS.
