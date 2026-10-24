# KnowledgePaat: Email Verification & Branded Sender Configuration Guide

**Scope:** Resolution of email-verification mismatch, branded Supabase GoTrue confirmation template deployment, Custom SMTP (Resend) integration, and DNS authentication records.  
**Target Environments:**
- **Staging:** Supabase `lzuinimbsdxnhzmjpxmr` (`https://lzuinimbsdxnhzmjpxmr.supabase.co`)
- **Production (Protected):** Supabase `csjywuflkvohytbvglxf` (`https://csjywuflkvohytbvglxf.supabase.co`)  
**Maintained Repository Templates:**
- HTML Template: [`docs/email/CONFIRM_SIGNUP_EMAIL_TEMPLATE.html`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/docs/email/CONFIRM_SIGNUP_EMAIL_TEMPLATE.html)
- Plain Text Template: [`docs/email/CONFIRM_SIGNUP_EMAIL_TEMPLATE.txt`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/docs/email/CONFIRM_SIGNUP_EMAIL_TEMPLATE.txt)
- Source Implementation: [`frontend/lib/email/templates.ts`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/frontend/lib/email/templates.ts)  
**Date:** October 24, 2026  

---

## 1. Root Cause Analysis

### The Verification Mismatch Problem
1. **Link vs Code:** When a new user registers on `https://knowledgepaat.com/register`, the frontend transitions to the verification screen (`/register?step=verify`), instructing the user to paste or enter an OTP code.
2. **Default Supabase Template:** Supabase GoTrue's default out-of-the-box "Confirm signup" template contains only `<a href="{{ .ConfirmationURL }}">Confirm your mail</a>`. It completely omits the verification token variable `{{ .Token }}`.
3. **Sender Identity:** Out-of-the-box Supabase Auth sends emails from `Supabase Auth <noreply@mail.app.supabase.io>` using Supabase's shared pool, causing confusion for KnowledgePaat users and rate-limiting signups to 30 emails/hour.

### Resolution Architecture
- **In Website Code (`frontend/app/register/page.tsx`):** The registration screen expects a numeric OTP (`inputMode="numeric"`, `maxLength={8}`, auto-verifies on 8 digits, validates `length >= 6`), submitting to `supabase.auth.verifyOtp({ email, token, type: 'signup' })`. Added double-submission protection on both registration and OTP verification.
- **In Supabase GoTrue Auth Configuration:** Update the active "Confirm signup" template to render `{{ .Token }}` as a prominent, selectable verification code within a responsive, branded email container (`#1D1855`, `#6F42DD`, `#F8F7FF`), accompanied by clear expiry instructions (60 minutes).
- **In Transactional Email Transport:** Configure Custom SMTP on Supabase Auth pointing to a verified sender (`no-reply@knowledgepaat.com`) via Resend, completely eliminating the 30 emails/hour ceiling.

---

## 2. Step-by-Step Supabase Dashboard Setup

> [!IMPORTANT]
> Supabase Auth email templates and Custom SMTP credentials cannot be modified via client SDK or project service role keys; they must be configured in the Supabase Dashboard or via the Supabase Management API using an account-level Personal Access Token. Follow the exact steps below.

### Procedure 2.1: Apply the Branded "Confirm signup" Template

1. Log into the [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your staging project: **`lzuinimbsdxnhzmjpxmr`** (and repeat for production **`csjywuflkvohytbvglxf`** when ready).
3. In the left navigation sidebar, click **Authentication** (lock icon) ➔ **Email Templates**.
4. In the list of templates, select **Confirm signup**.
5. Update the fields as follows:
   - **Subject Line:**
     ```
     Your KnowledgePaat verification code
     ```
   - **Message Body (HTML):**
     Open [`docs/email/CONFIRM_SIGNUP_EMAIL_TEMPLATE.html`](file:///home/harsha/Documents/Documents/Project/KnowledgePaat/docs/email/CONFIRM_SIGNUP_EMAIL_TEMPLATE.html), copy the entire file content, and paste it into the **Message Body (HTML)** box.
6. Click **Save Changes** at the bottom of the page.

---

## 3. Branded Sender & Custom SMTP Configuration (Resend)

To replace `Supabase Auth <noreply@mail.app.supabase.io>` with `KnowledgePaat <no-reply@knowledgepaat.com>`:

### Procedure 3.1: Configure Supabase Custom SMTP

1. In the Supabase Dashboard, navigate to **Project Settings** (gear icon) ➔ **Authentication**.
2. Scroll down to **SMTP Settings** and toggle **Enable Custom SMTP** to **ON**.
3. Fill in the official Resend SMTP parameters:
   - **Sender email:** `no-reply@knowledgepaat.com` (or `noreply@knowledgepaat.com`)
   - **Sender name:** `KnowledgePaat`
   - **Host:** `smtp.resend.com`
   - **Port number:** `465` (with SSL enabled) or `587` (with TLS enabled)
   - **Minimum interval between emails:** `1` second (or leave default `60` seconds for basic rate protection)
   - **User:** `resend`
   - **Password:** `<YOUR_RESEND_API_KEY>` (e.g. `re_...`)
4. Click **Save Changes**.
5. Use the **Send Test Email** button to verify that the credentials connect successfully before testing user signups.

> [!NOTE]
> Adding `RESEND_API_KEY` to Next.js `.env.local` only configures application-level receipt outbox processing. It does **not** configure Supabase Auth emails. Supabase Auth generates signup OTPs independently and requires the Custom SMTP dashboard configuration above.

---

## 4. Root Domain DNS Setup (`knowledgepaat.com`)

When sending directly from the root domain `@knowledgepaat.com` without a subdomain, follow these safe DNS rules to protect existing Google Workspace email delivery:

### Step 4.1: Add Domain to Resend
1. Log in to [Resend Dashboard](https://resend.com/domains).
2. Click **Add Domain** and enter **`knowledgepaat.com`**.
3. Resend will display your DKIM and SPF verification records.

### Step 4.2: Update DNS Records in Cloudflare / DNS Registrar

| Record Type | Host / Name | Target / Value | Rule / Action |
| :---: | :--- | :--- | :--- |
| **SPF (TXT)** | `@` (root) | `v=spf1 include:dc-aa8e722993._spfm.knowledgepaat.com include:resend.com ~all` | **DO NOT ADD A SECOND SPF RECORD.** Edit the existing root TXT record to add `include:resend.com` before `~all`. Per RFC 7208, multiple SPF records break mail delivery. |
| **DKIM (CNAME)** | `resend._domainkey` *(and any 2nd/3rd selectors provided by Resend)* | `feedback-smtp.resend.com` *(or exact target shown in Resend)* | Add new CNAME records. These dedicated selectors do not conflict with Google Workspace DKIM. |
| **MX Records** | `@` (root) | **PRESERVE EXISTING GOOGLE WORKSPACE MX RECORDS:**<br>`1 aspmx.l.google.com`<br>`5 alt1.aspmx.l.google.com`<br>`5 alt2.aspmx.l.google.com`<br>`10 alt3.aspmx.l.google.com`<br>`10 alt4.aspmx.l.google.com` | **DO NOT OVERWRITE OR REPLACE.** Resend only needs DKIM and SPF to send outbound email. Google Workspace handles your inbound mail. |
| **DMARC (TXT)** | `_dmarc` | `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;` | **PRESERVE AS-IS.** The existing DMARC policy will automatically align with Resend once the DKIM keys are verified. |

> [!TIP]
> **Disable Link Tracking for Auth Emails:** In Resend Dashboard ➔ Domains ➔ `knowledgepaat.com` ➔ Settings, toggle **Open Tracking** and **Click Tracking** to **OFF**. Authentication codes and OTP verification links must never be rewritten through third-party tracking redirectors, as privacy-focused mail clients (e.g. Apple Mail Privacy Protection) or corporate firewalls may flag rewritten auth links as phishing.

---

## 5. Capacity & Quota Comparison

| Infrastructure Layer | Default Supabase Mailer | Resend Custom SMTP |
| :--- | :---: | :---: |
| **Sending Limit** | **30 emails / hour** (hard ceiling) | **50,000+ emails / month** (expandable) |
| **Burst Throughput** | 1 req / 2 seconds | 25–100 req / second |
| **Sender Address** | `noreply@mail.app.supabase.io` | `no-reply@knowledgepaat.com` |
| **Sender Display Name** | `Supabase Auth` | `KnowledgePaat` |
| **Deliverability** | Shared pool (frequent spam folder placement) | Dedicated DKIM/SPF domain reputation |
| **OTP Delivery Reliability** | High failure during launch spikes | Enterprise transactional tier |

---

## 6. End-to-End Verification Protocol

When Custom SMTP and the template are saved in the Supabase Dashboard, execute the following 5-point verification:

1. **Signup Verification:** Register a new user at `http://localhost:3000/register`.
2. **Mailbox Inspection:** Confirm the email arrives from `KnowledgePaat <no-reply@knowledgepaat.com>` with subject `Your KnowledgePaat verification code`.
3. **Code Fidelity:** Confirm the email displays the **8-digit numeric OTP** matching `{{ .Token }}`.
4. **Session Verification:** Paste the code into the OTP input box on `/register?step=verify`. Verify that:
   - The user is redirected to `/e-books` (or the internal `redirectTo` destination).
   - Session cookies (`sb-*-auth-token`) are created.
   - User identity in Supabase Auth shows `email_confirmed_at` timestamp.
5. **Security Edge Cases:** Test wrong OTP (`00000000`) and reused OTP to confirm clear, helpful error messages (`Invalid verification code` and `Token has expired or is invalid`).
