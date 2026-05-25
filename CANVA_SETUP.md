# Canva Integration — Setup Guide

This integration lets the team click "Send to Canva" on a Creative Strategy Brief and have it land in your Canva account as an editable design (via Canva's URL-import API).

**Architecture:** one shared Canva account, OAuth token stored in Supabase, all designs land in that account.

You only do this setup **once**. Five steps, ~20 minutes total.

---

## 1. Run the Supabase migration

Open the Supabase SQL editor for project `xwlfmqpwuapiyvublvaa` and run:

```sql
CREATE TABLE IF NOT EXISTS flow_canva_auth (
  id TEXT PRIMARY KEY DEFAULT 'default',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT DEFAULT '',
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT canva_auth_single_row CHECK (id = 'default')
);
ALTER TABLE flow_canva_auth ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on flow_canva_auth" ON flow_canva_auth;
CREATE POLICY "Allow all on flow_canva_auth" ON flow_canva_auth FOR ALL USING (true) WITH CHECK (true);
```

The same SQL lives at the bottom of [supabase/migration.sql](supabase/migration.sql) for reference.

---

## 2. Register a Canva integration

Sign in at <https://www.canva.com/developers/> using the **Canva account that should own the generated designs** (this is the account every brief will land in).

1. **Create app** → name it `ClubSheIs Client Flow`.
2. **Authentication** tab → enable **OAuth 2.0** with **PKCE** (S256).
3. **Redirect URIs** → add both:
   - `http://localhost:3002/api/canva/auth/callback` (dev)
   - `https://clubsheis-client-flow.vercel.app/api/canva/auth/callback` (prod — adjust if your Vercel URL differs)
4. **Scopes** → enable all of these:
   - `design:content:read`
   - `design:content:write`
   - `design:meta:read`
   - `asset:read`
   - `asset:write`
   - `brandtemplate:content:read`
   - `brandtemplate:meta:read`
5. **Credentials** tab → copy the **Client ID** and **Client Secret**.

---

## 3. Set environment variables

### Local (`.env.local`)

```bash
CANVA_CLIENT_ID=<paste the Client ID from step 2>
CANVA_CLIENT_SECRET=<paste the Client Secret from step 2>
# Optional — only set if you want to force a specific redirect URI.
# If unset, the app uses {origin}/api/canva/auth/callback.
# CANVA_REDIRECT_URI=https://clubsheis-client-flow.vercel.app/api/canva/auth/callback

# Required for production: the public base URL of the deployed app.
# Canva imports the strategy-brief page from this URL — it MUST be publicly accessible HTTPS.
NEXT_PUBLIC_APP_URL=https://clubsheis-client-flow.vercel.app
```

### Vercel (Production)

In the Vercel dashboard → Project → Settings → Environment Variables, add the same three variables for the **Production** environment.

After adding env vars on Vercel, redeploy (push a commit or trigger from the Vercel dashboard) so the runtime picks them up.

---

## 4. Connect the team's Canva account (one-time)

Once the env vars are set and deployed:

1. Make sure you're signed into Canva (the team account) in the browser.
2. Visit `https://clubsheis-client-flow.vercel.app/api/canva/auth/start` (or `http://localhost:3002/api/canva/auth/start` for local).
3. Canva asks you to approve the scopes → click **Allow**.
4. You land back on a page that says **"✓ Canva connected"**.

The OAuth tokens are now stored in `flow_canva_auth` in Supabase. The app will refresh them automatically as needed. You don't need to do this again unless tokens are revoked or the row is deleted.

---

## 5. Use it

Open any client at the **Creative Strategy Brief** stage. After generating the brief, you'll see a Canva section at the bottom with:

- **Status pill** — "Canva connected" (green) or "not connected" (red).
- **Send to Canva** button — kicks off the URL import. Canva imports the published `/strategy-brief/{clientId}` page as an editable design, then opens it in a new tab.
- **Open in Canva** — appears once a design has been created, links back to it.
- **Last sent** timestamp.

The brief lives in Canva from then on — your team can edit it, restyle it, share it with the client, export PDF, whatever. Re-sending creates a fresh import (the old design stays untouched).

---

## How it works under the hood

- The brief page at `/strategy-brief/{clientId}` is **public** (matches the existing `/proposal/{id}` pattern).
- The send-to-canva route calls Canva's `POST /v1/url-imports` with that public URL.
- Canva fetches the HTML, converts it to a Canva design, returns a design ID + edit URL.
- The route polls for completion (up to ~50s), then saves the design URL back to Supabase under `strategy-brief:canva_design_url`.
- If Canva is still working after 50s, the route returns the job ID and a poll endpoint `/api/strategy-brief/canva-status?jobId=…&clientId=…` you can hit to finish the loop.

## Troubleshooting

**"Canva cannot import from localhost"** — Expected. Canva's import API can only reach public HTTPS URLs. Deploy first, then test.

**Auth start says "CANVA_CLIENT_ID not set"** — env var missing. Double-check `.env.local` (local) or Vercel env vars (production).

**State mismatch on callback** — the OAuth cookies expired (10 min TTL). Just hit `/api/canva/auth/start` again.

**Token refresh failed** — likely the Client Secret rotated, or the integration was deleted in Canva's developer portal. Re-run step 4.

**Status pill stays "not connected" after OAuth succeeds** — refresh the client page. The status is fetched on mount.

**Brief looks bad in Canva** — Canva's URL-import does its best to interpret HTML. Complex CSS (gradients, custom fonts, transforms) may not survive. If quality matters, the next iteration would be a brand template + autofill API. Ask for path B from the original spec.
