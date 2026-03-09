# ADR 004 — SMTP Provider for Auth & Transactional Email

**Date:** 2026-03-05
**Status:** Decided — Resend
**Phase:** 3 (Login, SMTP, task views & WhatsApp)

---

## Context

Supabase's built-in email service is used by default for all auth emails (magic links, invites, password resets). It has a hard rate limit of **2 emails per hour** on the free tier and sends from a generic Supabase address with no branding. A custom SMTP provider is required before Phase 4 notifications go live.

NDS has a Microsoft 365 tenant and the question was raised whether it could serve as the SMTP relay.

---

## Options Considered

### Option 1 — Resend ✅ Chosen

| | |
|---|---|
| **Cost** | Free — 3,000 emails/month, 100/day |
| **SMTP credentials** | Host: `smtp.resend.com` · Port: `587` · User: `resend` · Password: API key |
| **Supabase integration** | Native one-click integration in Supabase dashboard, or manual SMTP entry |
| **Custom domain** | Yes — domain verified in Resend dashboard; SPF/DKIM records auto-generated |
| **Deliverability** | Excellent — purpose-built for transactional email |
| **Setup time** | ~30 minutes including DNS propagation |
| **Phase 4 reuse** | Same API key used for notification emails — no duplicate setup |
| **Risk** | Low — no auth deprecation, stable platform |

**DNS records required on sender domain (Resend generates these):**
- `TXT` — SPF record
- `TXT` — DKIM public key (2048-bit)
- `TXT` — DMARC policy (optional but recommended for deliverability)

---

### Option 2 — Microsoft 365 ❌ Rejected

NDS already pays for M365, so cost is not a factor. However:

- Supabase SMTP uses **Basic Authentication** (username + password credentials)
- Microsoft is retiring Basic Auth for SMTP AUTH on **30 April 2026** — this is a hard deadline
- After that date, `smtp.office365.com:587` with Basic Auth will return `550 5.7.30` and refuse to send
- Supabase does not support OAuth 2.0 SMTP, so there is no credential-based workaround
- If MFA is enforced on the tenant, an App Password is required — but App Passwords also rely on Basic Auth and die on the same date
- The M365 admin would need to enable per-mailbox SMTP AUTH in the Admin Centre (Users → Active Users → Mail → Manage email apps → Authenticated SMTP)

**Verdict:** Dead end for this use case. Even if configured today it would break in April 2026 with no migration path via Supabase's standard SMTP settings.

**Long-term M365 path (future phase):** The correct modern approach for M365 email is the **Microsoft Graph API** (`POST /users/{id}/sendMail`) with OAuth 2.0. This is not a standard SMTP integration — it would require a custom Supabase Edge Function to handle token acquisition and mail dispatch. Complexity is significantly higher and is best revisited in a later phase if sending from an `@ndsscouts.org.uk` address for compliance reasons becomes a requirement.

---

### Option 3 — Postmark ❌ Rejected

- Free tier is only 100 emails/month — insufficient once Phase 4 notifications are live
- First paid tier is $15/month for 10,000 emails
- Excellent deliverability but not cost-justified given Resend's 3,000/month free tier

---

### Option 4 — SendGrid ❌ Not viable

- Discontinued its free plan in May 2025
- Minimum $19.95/month
- No advantage over Resend at this scale

---

## Decision

**Use Resend for both Supabase auth emails (Phase 3) and notification emails (Phase 4).**

Setting up Resend in Phase 3 means the same API key, domain, and DNS configuration is reused in Phase 4 — no duplicate work. The 3,000 emails/month free tier comfortably covers auth emails plus all planned notification events at current team size.

---

## Setup Steps

1. Create a Resend account at [resend.com](https://resend.com) (free, no card required)
2. Add sender domain in Resend dashboard → Domains → Add Domain
3. Add the DNS records Resend provides to the domain's DNS (SPF, DKIM, optionally DMARC)
4. Wait for DNS propagation and domain verification (typically 5–30 minutes)
5. Generate an API key in Resend dashboard → API Keys
6. In Supabase → Project Settings → Authentication → SMTP Settings:
   - Enable Custom SMTP: **on**
   - Host: `smtp.resend.com`
   - Port: `587`
   - Username: `resend`
   - Password: *(Resend API key)*
   - Sender name: `NDS Maintenance`
   - Sender email: `noreply@<your-verified-domain>`
7. Send a test magic link and a test invite to confirm routing through Resend
8. Check Resend dashboard → Logs to confirm delivery and inspect any failures
9. Store the API key in Vercel env vars and `.env.local` as `RESEND_API_KEY`

---

## DNS Configuration & Email Security

### The SPF concern

Resend's required SPF record is:

```
v=spf1 include:amazonses.com ~all
```

Resend is built on Amazon SES infrastructure, so this authorises all Amazon SES IP addresses — meaning any other SES customer could technically send mail that passes SPF for your domain. The NDS M365 admin raised this as a legitimate concern.

**However, SPF is the weakest of the three email authentication layers.** The broad SPF include is a known and accepted tradeoff with shared sending infrastructure, and is fully mitigated by DKIM + DMARC (see below).

### Merging SPF with the existing M365 record

There must only ever be **one** SPF TXT record on the root domain. The M365 admin must **edit** the existing record to include both, not add a new one:

```
v=spf1 include:spf.protection.outlook.com include:amazonses.com -all
```

Use `-all` (hardfail) rather than `~all` (softfail) if the existing M365 record already uses it — it's the stronger setting.

### DKIM — why the wide SPF doesn't matter

Resend generates a **domain-specific** DKIM key pair when a domain is verified. The private key is held only by Resend for that domain. No other Amazon SES customer has it.

An attacker using Amazon SES to spoof your domain would:
- ✅ Pass SPF — they share the same SES infrastructure
- ❌ Fail DKIM — they don't have your domain's private key
- ❌ Fail DMARC — because DKIM fails, DMARC rejects or quarantines the message

DKIM is cryptographic and domain-specific. The wide SPF is irrelevant once DKIM and DMARC are in place.

### DMARC — add this record

Add a TXT record at `_dmarc.yourdomain.com`:

```
v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@yourdomain.com; pct=100
```

| Part | Meaning |
|---|---|
| `p=quarantine` | Emails failing DMARC go to spam — start here |
| `p=reject` | Emails failing DMARC are rejected outright — move to this after monitoring |
| `rua=` | Address to receive aggregate reports — monitor for a week or two |
| `pct=100` | Apply policy to 100% of mail |

Start with `p=quarantine`, review the aggregate reports, then move to `p=reject` once satisfied only legitimate mail is flowing.

---

## Notes

- The Resend API key used for SMTP is the same key used later in `lib/notifications/email.ts` (Phase 4)
- Do **not** use the Supabase service role key or anon key for email sending — use only the Resend API key
- Monitor the Resend dashboard for bounce/spam reports after initial deployment
- If NDS ever moves to a custom domain (`maintenance.ndsscouts.org.uk`), the Resend sender domain and Supabase sender email must be updated to match — see Phase 6
