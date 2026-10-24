# KnowledgePaat eBook Platform: Deployment & Operations Runbook (Repaired)

**Scope:** Deployment, Cutover, Verification, and Rollback Procedures for KnowledgePaat eBook Platform  
**Target Environments:**
- **Staging / Preview:** Supabase `lzuinimbsdxnhzmjpxmr` | Razorpay Test Mode (`rzp_test_...`)
- **Production:** Supabase `csjywuflkvohytbvglxf` | Razorpay Live Mode (`rzp_live_...`) | Domain `knowledgepaat.com`  
**Repository Branch / Commit SHA:** `ebook-storefront` / `d0c857e48a6d3468fc7b854c7576117cc247122a`  
**Application Root:** `frontend` (Next.js 16.3.0, Node.js v20.20.2)  
**Date:** October 24, 2026  

---

## 1. Overview & Safety Boundaries

This runbook establishes two strictly separated procedures:
1. **Part A: Staging Deployment Procedure** — For deploying a dedicated preview/staging project to Vercel connected exclusively to staging Supabase and Razorpay Test Mode.
2. **Part B: Production Cutover Procedure** — For production deployment to Vercel, live payment gateway cutover, transactional email domain activation, and post-launch smoke testing.

### Safety Policies
- Test scripts and staging deployments must fail closed if pointed at production `csjywuflkvohytbvglxf`.
- No live financial transactions may be executed until production cutover is explicitly authorized.
- Never commit credentials, service role keys, webhook secrets, or OTPs to version control.

---

## 2. Environment Variables Specification

The application source code references the following environment variables. Set them in the Vercel Dashboard under **Project Settings > Environment Variables**, selecting either **Preview** (Staging) or **Production**.

| Variable Name | Required Scope | Source Code Reference | Description / Required Value |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_SITE_URL` | Staging / Prod | `lib/safeRedirect.ts` | Staging: Vercel-assigned staging URL; Production: `https://knowledgepaat.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Staging / Prod | `utils/supabase/server.ts` | Staging: `https://lzuinimbsdxnhzmjpxmr.supabase.co`; Production: `https://csjywuflkvohytbvglxf.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging / Prod | `utils/supabase/server.ts` | Legacy Supabase Anon Public Key (browser-safe). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`| Staging / Prod | `utils/supabase/server.ts` | Modern Supabase Publishable Key (code falls back to Anon Key if omitted). |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging / Prod | `utils/supabase/server.ts` | Server-only privileged service role key. **Never expose to browser.** |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Staging / Prod | `lib/razorpay.ts` | Staging: `rzp_test_...`; Production: `rzp_live_...` |
| `RAZORPAY_KEY_ID` | Staging / Prod | `lib/razorpay.ts` | Same as `NEXT_PUBLIC_RAZORPAY_KEY_ID`. |
| `RAZORPAY_KEY_SECRET` | Staging / Prod | `lib/razorpay.ts` | Server-only Razorpay secret key. **Never expose to browser.** |
| `RAZORPAY_WEBHOOK_SECRET` | Staging / Prod | `app/api/ebooks/orders/webhook` | Webhook secret configured in Razorpay Dashboard for signature verification. |
| `RESEND_API_KEY` | Staging / Prod | `lib/email/transport.ts` | Transactional email provider API key (`re_...`). |
| `EMAIL_FROM_ADDRESS` | Staging / Prod | `lib/email/transport.ts` | Sender email address (e.g. `books@knowledgepaat.com` or `noreply@mail.knowledgepaat.com`). |
| `EMAIL_SENDER_NAME` | Staging / Prod | `lib/email/transport.ts` | Display sender name (e.g. `KnowledgePaat Books`). |
| `CRON_SECRET` | Staging / Prod | `app/api/ebooks/receipts` | Cryptographically random secret protecting `/process-outbox`. |
| `EDGE_AUTH_SECRET` | Staging / Prod | `lib/rateLimit.ts` | Shared edge token between ingress proxy and application server. |
| `STAGING_MODE` | Staging / Prod | `utils/supabase/server.ts` | Staging: `true`; Production: `false` (triggers fail-closed guards). |
| `NODE_ENV` | Staging / Prod | `app/api/admin/...` | `production` |

---

## 3. PART A: Staging Deployment Procedure (Vercel Preview)

Deploying a dedicated staging instance allows full verification without touching live production databases or live payment gateways.

### Step A.1: Verify Branch & Clean Working Tree
Confirm repository branch is `ebook-storefront` at commit `d0c857e48a6d3468fc7b854c7576117cc247122a`:
```bash
git checkout ebook-storefront
git rev-parse HEAD
# Output must match: d0c857e48a6d3468fc7b854c7576117cc247122a
git status -s
```

### Step A.2: Import Project in Vercel Dashboard
1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New... > Project**.
3. Select the `KnowledgePaat` repository.
4. Configure Project Settings:
   - **Project Name:** `knowledgepaat-staging`
   - **Framework Preset:** `Next.js`
   - **Root Directory:** Click edit and set to `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm install`
5. Under **Environment Variables**, select the **Preview** environment and populate with staging credentials (`lzuinimbsdxnhzmjpxmr`, `rzp_test_...`, `STAGING_MODE=true`).
6. Click **Deploy**.

### Step A.3: Record Vercel-Assigned Staging URL
1. Once deployment finishes, copy the Vercel-assigned deployment URL (e.g. `https://knowledgepaat-staging-<hash>.vercel.app` or `https://knowledgepaat-staging.vercel.app`).
2. Update `NEXT_PUBLIC_SITE_URL` in Vercel Preview settings with this actual URL.
3. Perform staging smoke test:
   ```bash
   curl -s https://<actual-staging-url>/api/ebooks | jq .
   ```

---

## 4. PART B: Production Cutover Procedure

Execute this procedure only when all launch blockers are satisfied and production cutover is formally authorized.

### Step B.1: Production Project Configuration
1. In the Vercel Dashboard, navigate to the production project.
2. Ensure **Root Directory** is `frontend`, framework is `Next.js`, and Node.js version is **20.x**.
3. Under **Environment Variables**, select the **Production** environment.
4. Enter the verified production credentials:
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://csjywuflkvohytbvglxf.supabase.co`
   - Production publishable/anon and service-role keys.
   - `STAGING_MODE`: `false`
5. Deploy commit `d0c857e48a6d3468fc7b854c7576117cc247122a` from branch `ebook-storefront`.

### Step B.2: Payment Gateway Live Mode Setup (Razorpay)
1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Toggle header switch from **Test Mode** to **Live Mode**.
3. Navigate to **Account & Settings > API Keys** and generate live keys.
4. Add `RAZORPAY_KEY_ID` (`rzp_live_...`) and `RAZORPAY_KEY_SECRET` to Vercel production environment.
5. Navigate to **Account & Settings > Webhooks > Add New Webhook**:
   - **Webhook URL:** `https://knowledgepaat.com/api/ebooks/orders/webhook`
   - **Secret:** Generate a 32+ character random string and set as `RAZORPAY_WEBHOOK_SECRET` in Vercel.
   - **Active Events (Register ONLY the 3 supported events):**
     * `order.paid`
     * `payment.captured`
     * `payment.failed`
   - Click **Save**.

### Step B.3: Transactional Email & Domain DNS Verification
1. Log in to [Resend Dashboard](https://resend.com/domains) and add domain `knowledgepaat.com`.
2. Retrieve provider-generated DNS records and insert them into domain DNS (Cloudflare):
   - **SPF:** `TXT` record pointing to provider SPF include.
   - **DKIM:** Three `CNAME` records pointing to `resend._domainkey...`
   - **DMARC:** `TXT` record for `_dmarc.knowledgepaat.com` with value `v=DMARC1; p=quarantine;`
3. In [Supabase Dashboard (csjywuflkvohytbvglxf)](https://supabase.com/dashboard/project/csjywuflkvohytbvglxf/auth/templates):
   - Navigate to **Authentication > SMTP Settings**.
   - Enable **Custom SMTP** with Resend SMTP credentials to eliminate burst signup rate ceilings.
   - Save and send test verification email.

### Step B.4: Vercel Cron Verification
Verify that `frontend/vercel.json` is deployed with:
```json
{
  "crons": [
    {
      "path": "/api/ebooks/receipts/process-outbox",
      "schedule": "*/5 * * * *"
    }
  ]
}
```
In Vercel Dashboard > **Settings > Cron Jobs**, confirm the `/api/ebooks/receipts/process-outbox` job is listed as active.

---

## 5. Post-Deployment Smoke Test Protocol

Immediately following production deployment, execute the following smoke tests using `GET` requests to verify JSON responses and dynamic pricing:

### Test 1: Storefront Catalogue API Health Check
```bash
curl -s https://knowledgepaat.com/api/ebooks | jq '{books_count: (.books | length), page: .page, total: .total}'
```
*Acceptance:* Returns HTTP 200 with non-empty `books` array and matching pagination metadata.

### Test 2: Dynamic Admin-Controlled Pricing Inspection
```bash
# Inspect the authoritative edition pricing of the first published book
curl -s https://knowledgepaat.com/api/ebooks | jq '.books[0] | {title: .title, online_paise: .price_read_online_paise, download_paise: .price_read_download_paise}'
```
*Acceptance:* Authoritative prices match database values (e.g. 4900 paise / 9900 paise).

### Test 3: Homepage Promotional Media API
```bash
curl -s https://knowledgepaat.com/api/ebooks/homepage | jq '{hasHero: (.hero != null), hasCarousel: (.carousel != null)}'
```
*Acceptance:* Returns HTTP 200 with structured JSON hero and carousel content in < 100ms.

### Test 4: Free Sample Reader
Navigate in browser to:
```
https://knowledgepaat.com/e-books
```
Click "Read Sample" on any published title. Verify sample chapter loads without requiring login.

### Test 5: Authorized Live End-to-End Purchase
1. Log in with an internal company test user account.
2. Select a published title and proceed to checkout using the authoritative dynamic price.
3. Complete live payment via Razorpay checkout (corporate card or UPI).
4. Verify:
   - Immediate redirect to `/checkout/success`.
   - Title appears in `/my-books` within 3 seconds.
   - Reader opens paid chapter content without authorization errors.
   - Customer receives transactional receipt email in inbox.
   - Razorpay Dashboard records payment status as `captured`.

---

## 6. Reviewed Recovery & Rollback Procedures

If an operational anomaly occurs post-launch, execute only the narrowly scoped, reviewed procedure matching the incident type. **Do not execute blanket permission revocations or wildcard updates.**

### Procedure 1: Application Rollback (Vercel)
*Scenario:* Application frontend bug, styling defect, or unexpected edge runtime exception.
1. In [Vercel Dashboard](https://vercel.com) > **Deployments**, locate the last known healthy production deployment.
2. Click `...` > **Instant Rollback**.
3. Traffic is rerouted in < 5 seconds.
4. Database remains completely intact because schema changes were non-destructive.

### Procedure 2: Emergency Feature Disablement (Targeted Feature Flags)
*Scenario:* Payment gateway outage or unexpected checkout behavior requiring immediate pause of sales while keeping the website and existing customer reader active.
1. Run targeted SQL update in Supabase SQL Editor on verified row identifier `id = 'global'`:
   ```sql
   UPDATE public.platform_settings 
   SET feature_flags = jsonb_set(
     jsonb_set(
       COALESCE(feature_flags, '{}'::jsonb),
       '{ebook_checkout}', 'false'::jsonb
     ),
     '{ebook_pdf_download}', 'false'::jsonb
   ),
   updated_at = NOW(),
   updated_by = 'ops-incident-response'
   WHERE id = 'global';
   ```
2. Verify: Navigating to `/e-books` continues to display books and free samples, while checkout CTAs display a "Temporarily Paused for Maintenance" notice.
3. Existing owners retain uninterrupted reading access to their purchased digital library.

### Procedure 3: Payment & Webhook Reconciliation
*Scenario:* Customer was charged on Razorpay, but network interruption delayed the webhook callback.
1. Customer provides Razorpay Payment ID (`pay_...`).
2. Run audited read-only status query via admin endpoint:
   ```bash
   curl -s -X POST https://knowledgepaat.com/api/admin/ebooks/reconciliation \
     -H "Authorization: Bearer $ADMIN_SESSION_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"paymentId": "pay_..."}' | jq .
   ```
3. If order is marked `pending` while gateway shows `captured`, trigger single-order reconciliation to safely fulfill entitlement without duplicate grants.

### Procedure 4: Database Quarantine (Zero-Data-Loss)
*Scenario:* An eBook table requires emergency write-pause without affecting the rest of KnowledgePaat.
1. If write traffic to orders must be quarantined, disable only the specific insert/update grant for the eBook orders table:
   ```sql
   -- Pause only new order creation; existing student portal tables remain untouched
   REVOKE INSERT ON public.ebook_orders FROM authenticated, anon;
   ```
2. To restore order processing:
   ```sql
   GRANT INSERT ON public.ebook_orders TO authenticated, anon;
   ```
3. Never drop tables or execute destructive DDL on live databases during recovery.

---

## 7. Monitoring, Alerts & Support

- **Runtime Logs:** Vercel Dashboard > Functions > Runtime Logs.
- **Database Metrics:** Supabase Dashboard > Database > Reports (Connection pool, CPU, Disk I/O).
- **Payment Logs:** Razorpay Dashboard > Webhook Logs & Transaction Reports.
- **Email Delivery:** Resend Dashboard > Logs (Delivery rate, Bounces, Spam rate).
- **Escalation Contact:** `support@knowledgepaat.com`
