# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm run dev      # Start dev server on localhost:3000
npm run build    # Production build (TypeScript check + Next.js build)
npm run start    # Run production server locally
```

No test framework is configured. No linter configured in package.json scripts.

Deployment: push to `master` branch auto-deploys to Vercel.

## Architecture

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 3 + Supabase (PostgreSQL, Auth, Storage) + Stripe

**What this app is:** A marketplace for sharing/selling RDM-7 dashboard layout files (.rdm) and DBC (CAN database) files. Users can upload, browse, buy, download, and rate items.

### Broader Project Context

This repo (RDM Marketplace) is one part of a larger RDM-7 ecosystem that includes:
- **Web Studio** — browser-based dashboard designer
- **Desktop Studio** — desktop dashboard designer
- **RDM Marketplace** — this repo; community marketplace for layouts and DBC files
- **RDM-7 Dash** — the dashboard display/runtime

All four apps are part of one project. Layouts (.rdm files) created in Web/Desktop Studio are shared via this Marketplace and consumed by RDM-7 Dash.

### Key Directories

- `src/app/` — Next.js App Router pages and API routes
- `src/components/` — React components (mix of server and client components)
- `src/lib/` — Supabase client (`supabase.ts`), Stripe client (`stripe.ts`), favorites utilities
- `supabase/` — SQL migration files applied sequentially (schema.sql, 002-005)

### Data Flow

- **Auth:** Supabase Auth with Google OAuth + email/password. Admin access gated by email whitelist in `src/app/admin/page.tsx`.
- **Database:** Supabase PostgreSQL with Row-Level Security (RLS). Core tables: `profiles`, `layouts`, `ratings`, `downloads`, `purchases`.
- **Storage:** Two Supabase buckets — `screenshots` (preview images) and `layouts` (RDM/DBC files).
- **Payments:** Stripe Checkout Sessions created via `POST /api/checkout`. Webhook at `/api/webhooks/stripe` handles `checkout.session.completed`. Platform takes 15% fee.

### Page Rendering Strategy

- Server Components (async data fetching): homepage (`/`), layout detail (`/layout-detail/[id]`), creator profiles (`/profile/[id]`)
- Client Components (`"use client"`): browse, search, dashboard, admin, auth pages
- ISR revalidation: 30-60 seconds on server-rendered pages

### Notable Components

- `UploadForm.tsx` (~1000 lines) — Multi-step upload wizard that parses .rdm/.dbc files client-side, extracts metadata (widget count, signal count, ECU type), handles screenshot + file upload to Supabase storage.
- `BuyButton.tsx` — Stripe checkout integration for paid items.
- `SearchBar.tsx` — Global search with Cmd+K shortcut.
- `AuthGuard.tsx` — HOC for protecting routes requiring authentication.

### Environment Variables

Required in `.env.local` (see `.env.local.example`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL`

### Design System

- Accent color: `#CC0000` (red), defined as CSS variables in `globals.css` and mapped in `tailwind.config.js` under `rdm-*` prefix
- Fonts: Barlow Condensed (headings), Inter (body)
- Custom border radius token: `rounded-card` (12px)
