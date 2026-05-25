# Canva Autofill Templates — Setup Guide

You're building two **autofill-capable Brand Templates** in Canva. Each one is a multi-page presentation. Once they're built, our code calls Canva's Autofill API to produce a fresh design with the brief content slotted into the template's text fields.

**Why this instead of the PDF import?** Canva's PDF-to-design importer mangles spaces and fonts. Autofill bypasses parsing entirely — Canva inserts native text into your designed layout, so spacing and styling are pixel-perfect every time.

You only do this **once per template**. Maybe 60–90 min total.

---

## Step 1 — Create a Brand Template in Canva

For each of the two templates, do this:

1. Open Canva. Make sure you're in the **Club She Is Team** workspace.
2. Click **Create a design** → choose **Presentation (16:9)**.
3. Design the slides (see the slide list in Step 3).
4. When you're happy, click the **Share** button (top right) → **More** → **Template** → **Publish as a Brand Template**. 
5. The template now appears under **Brand Templates** in Canva.

> ⚠️ It MUST be a Brand Template, not a plain design. Only Brand Templates can be used with the Autofill API.

---

## Step 2 — Mark text as Data Fields

For each text box that should be filled by our code:

1. Click the text box to select it.
2. In the floating toolbar, click the **⋯ more** (or right-click) → **Connect data**. (On newer Canva UIs, you might find it under **Effects** → **Connect data** instead.)
3. Choose **Create new data field**.
4. Enter the **exact field name** I list in Step 3 below — case-sensitive, no spaces, use underscores. E.g. `section_1_title`.
5. The text box now has a small data-link indicator. Repeat for every text box that needs to be dynamic.

> 💡 Text inside a data-linked text box becomes the **default**, shown if no value is supplied. So you can keep nice placeholder copy like `[Section Title Goes Here]` for the preview.

---

## Step 3 — Slide structure & exact field names

Build the two templates with these exact pages and field names. Anything else on the slide (logos, decoration, page numbers, brand colours) is purely visual — only the fields named below need to be data-linked.

### 🟪 Template A — **Project Strategy** (9 slides)

Recommended accent: **violet** (#7C3AED) — matches the 4D stage colour in the app.

| Slide | Purpose | Data fields (exact names) |
|---|---|---|
| 1 | Cover | `brand_name`, `client_name` |
| 2 | Executive Summary | `section_1_title`, `section_1_body` |
| 3 | The Client | `section_2_title`, `section_2_body` |
| 4 | Who We're Talking To | `section_3_title`, `section_3_body` |
| 5 | How We Show Up | `section_4_title`, `section_4_body` |
| 6 | What We're Building | `section_5_title`, `section_5_body` |
| 7 | Paid Media Approach | `section_6_title`, `section_6_body` |
| 8 | Timeline & Next Steps | `section_7_title`, `section_7_body` |
| 9 | Why This Will Work | `section_8_title`, `section_8_body` |

**Total: 18 data fields.**

> The `_body` field needs to handle several paragraphs. Make the text box large enough — overflow text just gets cropped, so generous height with auto-shrink-to-fit on is ideal.

---

### 🟦 Template B — **Paid Media Creative Brief** (10 slides)

Recommended accent: **teal** (#0F766E) — matches the 4C stage colour.

| Slide | Purpose | Data fields (exact names) |
|---|---|---|
| 1 | Cover | `brand_name`, `client_name` |
| 2 | The Business Problem | `section_1_title`, `section_1_body` |
| 3 | The Product, Buyer POV | `section_2_title`, `section_2_body` |
| 4 | The Customer Voice | `section_3_title`, `section_3_body` |
| 5 | The Personas | `section_4_title`, `section_4_body` |
| 6 | Awareness Level Map | `section_5_title`, `section_5_body` |
| 7 | The Messaging Territories | `section_6_title`, `section_6_body` |
| 8 | The Big Idea | `section_7_title`, `section_7_body` |
| 9 | Concept Stack | `section_8_title`, `section_8_body` |
| 10 | Test Prioritisation | `section_9_title`, `section_9_body` |

**Total: 20 data fields.**

---

## Step 4 — Send me the template IDs

When each template is published:

1. Open the template from **Brand Templates**.
2. Look at the URL — it'll look like `https://www.canva.com/design/EAGxxxxxxxx/edit` or similar.
3. The **template ID** is the bit after `/design/` — e.g. `EAGxxxxxxxx`.

Send me both IDs and I'll wire them into the code:
```
PROJECT_STRATEGY_TEMPLATE_ID = ...
PAID_MEDIA_BRIEF_TEMPLATE_ID = ...
```

---

## What I'll change on the code side

Once you've sent me the two template IDs, I'll:

1. Add the IDs as env vars on Vercel (`CANVA_TEMPLATE_PROJECT_STRATEGY`, `CANVA_TEMPLATE_PAID_MEDIA_BRIEF`).
2. Rewrite `app/api/{strategy-brief,project-strategy}/send-to-canva` to call `POST /v1/autofills` with a `{brand_template_id, data}` payload instead of importing a PDF URL.
3. The AI brief parser already splits the LLM output by `## SECTION N — TITLE` markers, so I'll map each section directly to `section_N_title` and `section_N_body`. Cover slide uses the client's brand + name.
4. Verify the autofill API's polling response, save the new `design_url` back to Supabase — same UI as today, just clean output.

The **Send to Canva** button in the app stays exactly where it is. Behind the scenes the integration switches from "import PDF" to "autofill template". You'll just notice the result is suddenly perfect.

---

## Troubleshooting

**"Connect data" isn't visible in my text toolbar** — confirm you've published the design as a Brand Template (not just a design). Data field connection is only available on Brand Templates.

**Two templates with the same field name** — fine. Field names only need to be unique within one template.

**I want to change a field name later** — change it in Canva, then send me the new template ID. The Canva ID doesn't change unless you re-publish, but the dataset schema does — I'll re-pull it.

**My text overflows the slide** — set the text box's **resize behaviour** to "Auto-shrink to fit" in Canva. Long bodies will shrink rather than overflow.
