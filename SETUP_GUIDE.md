# RDM-7 Marketplace — Admin & Setup Guide

**Admin Email:** tommyrosato@gmail.com
**Live URL:** https://marketplace.realtimedatamonitoring.com.au (pending DNS)
**Fallback URL:** https://rdm7-marketplace-onj37e59c-tommys-projects-c6336e9a.vercel.app
**GitHub:** https://github.com/Trizzoto/rdm7-marketplace
**Supabase Dashboard:** https://supabase.com/dashboard/project/udodyyculqyciclgafqm

---

## 1. DNS Setup (One-Time)

Go to **Cloudflare** → `realtimedatamonitoring.com.au` → **DNS** → **Add Record**:

| Field | Value |
|-------|-------|
| Type | CNAME |
| Name | marketplace |
| Target | cname.vercel-dns.com |
| Proxy | OFF (DNS only — gray cloud) |

After adding, wait 5-10 minutes for propagation. SSL is automatic via Vercel.

---

## 2. Accessing Admin Console

1. Go to the marketplace and sign in with **tommyrosato@gmail.com**
2. Navigate to `/admin` (e.g., `https://marketplace.realtimedatamonitoring.com.au/admin`)
3. You'll see:
   - **Stats overview** — total layouts, DBC files, downloads, users
   - **Recent uploads** — approve or unpublish any listing
   - **Quick actions** — feature layouts, remove listings by ID

Only emails in the `ADMIN_EMAILS` list can access this page. To add more admins, edit `src/app/admin/page.tsx` line 7.

---

## 3. Stripe Setup (Accepting Payments with 10% Cut)

### Step 1: Create Stripe Account
1. Go to https://dashboard.stripe.com/register
2. Sign up with your business details
3. Complete identity verification

### Step 2: Enable Stripe Connect
1. In Stripe Dashboard → **Settings** → **Connect** → **Settings**
2. Enable **Express accounts** (this lets sellers onboard with minimal friction)
3. Set your platform's business name: "RDM-7 Marketplace"
4. Set the platform fee: The code hardcodes **10%** — Stripe deducts this automatically

### Step 3: Get API Keys
1. Stripe Dashboard → **Developers** → **API Keys**
2. Copy:
   - **Publishable key** (starts with `pk_live_` or `pk_test_`)
   - **Secret key** (starts with `sk_live_` or `sk_test_`)

### Step 4: Set Up Webhook
1. Stripe Dashboard → **Developers** → **Webhooks** → **Add Endpoint**
2. Endpoint URL: `https://marketplace.realtimedatamonitoring.com.au/api/webhooks/stripe`
3. Events to listen for: `checkout.session.completed`
4. Copy the **Webhook Signing Secret** (starts with `whsec_`)

### Step 5: Update Environment Variables
In **Vercel Dashboard** → `rdm7-marketplace` → **Settings** → **Environment Variables**:

| Variable | Value |
|----------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_...` (or `sk_test_...` for testing) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` (or `pk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |

After updating, **redeploy** the project (Settings → Deployments → Redeploy).

### Step 6: Test the Flow
1. Set a layout price in your Creator Dashboard (e.g., $5.00)
2. Visit the layout as a different user
3. Click "Buy for $5.00" — should redirect to Stripe Checkout
4. Complete payment with test card: `4242 4242 4242 4242`
5. Check Stripe Dashboard → **Payments** — you should see:
   - Total: $5.00
   - Application fee: $0.50 (10%)
   - Seller receives: $4.50

---

## 4. How Payments Work

### For Buyers:
- Free layouts/DBC files: instant download, no account needed
- Paid items: click "Buy" → Stripe Checkout → payment → instant download access

### For Sellers:
1. Go to **Dashboard** → see "Connect Stripe to sell" banner
2. Click → redirected to Stripe Connect onboarding (Express account)
3. Complete identity verification (takes 1-2 min)
4. Once verified, they can set prices on their layouts
5. Revenue split: **90% to seller, 10% platform fee**
6. Stripe handles all payouts to sellers automatically

### Platform Revenue:
- 10% of every paid sale goes to your Stripe Connect platform account
- View earnings in Stripe Dashboard → **Connect** → **Collected fees**

---

## 5. Managing the Marketplace

### Approve/Reject Uploads:
- Admin console shows all recent uploads
- Click "Unpublish" to hide a listing
- Listings are published immediately by default — change this in `UploadForm.tsx` (`is_published: false`) if you want manual approval

### Featured Layouts:
- Use the admin console "Feature" action to highlight layouts
- Featured layouts appear at the top of the homepage

### User Management:
- Supabase Dashboard → **Authentication** → **Users** — manage all user accounts
- Supabase Dashboard → **Table Editor** → `profiles` — edit user profiles, set `is_admin`

---

## 6. Google OAuth Setup

Already enabled. If you need to update credentials:

1. Go to https://console.cloud.google.com
2. Create OAuth 2.0 credentials (Web application type)
3. Set Authorized redirect URI: `https://udodyyculqyciclgafqm.supabase.co/auth/v1/callback`
4. Copy Client ID + Secret
5. Go to Supabase → Auth → Providers → Google → paste credentials

---

## 7. Environment Variables Reference

### Vercel (Production):
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://udodyyculqyciclgafqm.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `NEXT_PUBLIC_APP_URL` | `https://marketplace.realtimedatamonitoring.com.au` |

### Local Development:
Copy `.env.local.example` → `.env.local` and fill in values.

---

## 8. Deploying Updates

### Automatic (recommended):
Push to `master` branch → Vercel auto-deploys.

### Manual:
```bash
cd rdm7-marketplace
npx vercel --prod
```

---

## 9. Database Migrations

Migration files are in `supabase/` folder. Run them in Supabase SQL Editor:
- `schema.sql` — initial tables (already run)
- `002_add_item_type.sql` — DBC file support (already run)
- `003_add_payments.sql` — purchases table (already run)

---

## 10. Tech Stack Reference

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 3 |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| Payments | Stripe Connect (Express accounts) |
| Hosting | Vercel (auto-deploy from GitHub) |
| Domain | Cloudflare DNS → Vercel |
| Fonts | Barlow Condensed + Inter (Google Fonts) |
