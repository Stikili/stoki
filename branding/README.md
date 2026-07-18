# Stoki — Brand Pack

Everything you need to represent Stoki visually on LinkedIn, other social platforms, and in general marketing collateral. Ready-to-upload PNGs in [`png/`](png/), editable SVG sources in [`svg/`](svg/), regeneration script at [`generate.py`](generate.py).

---

## LinkedIn assets — ready to upload

| File | Dimensions | Where it goes |
|---|---|---|
| [`png/linkedin-avatar-dark.png`](png/linkedin-avatar-dark.png) | 400 × 400 | Company page profile picture. Dark background, emerald mark. **Recommended default.** |
| [`png/linkedin-avatar-emerald.png`](png/linkedin-avatar-emerald.png) | 400 × 400 | Alternate: emerald background, white mark. More brand-forward — use if the dark avatar disappears in a feed. |
| [`png/linkedin-cover.png`](png/linkedin-cover.png) | 1584 × 396 | Company page cover / banner. Wordmark + tagline + subtle emerald glow. |
| [`png/linkedin-post-square.png`](png/linkedin-post-square.png) | 1080 × 1080 | Square feed post template. Good for announcements ("we're live", "new feature"). Edit the headline in `generate.py` and re-run to customise. |
| [`png/linkedin-post-link.png`](png/linkedin-post-link.png) | 1200 × 627 | Link preview image (Open Graph 1.91:1). Automatically used when someone shares a stokiapp.com URL — will pull whichever image is set in the app's meta tags. |
| [`png/mark-emerald-transparent.png`](png/mark-emerald-transparent.png) | 1024 × 1024 | Standalone mark, emerald on transparent. For layering on any custom background. |
| [`png/mark-white-transparent.png`](png/mark-white-transparent.png) | 1024 × 1024 | Standalone mark, white on transparent. For dark backgrounds not covered by the fixed avatars. |

### Uploading to LinkedIn

**Company page profile picture:**
1. LinkedIn → your company page → **Edit page** → **Overview → Logo**
2. Upload `png/linkedin-avatar-dark.png`
3. Position: centered (no crop needed — the source is square)

**Company page cover:**
1. Same **Edit page** → **Overview → Cover image**
2. Upload `png/linkedin-cover.png`
3. LinkedIn will preview it; the wordmark + tagline sit far enough from the crop-safe area

**Post images:**
- For a general "we exist" post → use `linkedin-post-square.png`
- For sharing the app link → the OG image on your site handles that automatically once the meta tag is set

---

## Colour palette

| Name | Hex | RGB | Where it's used |
|---|---|---|---|
| **Emerald (primary)** | `#00C896` | `0, 200, 150` | Brand accent. Logo. CTAs. Positive state (profit, success). |
| **Ink (dark bg)** | `#0A0E17` | `10, 14, 23` | App background, avatar background, cover background. |
| **White** | `#FFFFFF` | `255, 255, 255` | Body text on dark, mark on emerald bg |
| **Muted grey (body on dark)** | `#B4C8DC` | `180, 200, 220` | Secondary text on dark backgrounds. |
| **Deep sub-muted** | `#4A5878` | `74, 88, 120` | Tertiary text, borders, tag pills. |

> **When in doubt**: emerald on dark ink is the canonical Stoki look. Emerald on white is fine. Emerald on light grey backgrounds is fine. **Never** put the mark on a coloured background it wasn't designed for (red, blue, orange) — use the white variant on a coloured background instead.

---

## Typography

### Fonts

- **DM Sans** — primary UI font, wordmark, headings. Free from Google Fonts.
- **Space Grotesk** — reserved for the landing hero (`.stoki-display` class).
- **Outfit** — reserved for the landing hero secondary text.

For LinkedIn posts drafted OUTSIDE the app (Canva, Figma, etc.), use **DM Sans Bold** or **Segoe UI Bold** as the closest fallback.

### Sizing rules of thumb

- Wordmark: `letter-spacing: -0.03em`, bold weight (700)
- Headlines: bold, tight line-height (1.05-1.15)
- Body: 15-18px, comfortable line-height (1.5-1.6)

---

## The logo (mark) — how it works

Three stacked, rounded blocks offset to suggest an "S" silhouette:

```
   ▰▰▰▰▰     ← top (right-aligned)
▰▰▰▰▰        ← middle (left-aligned, 78% opacity for depth)
   ▰▰▰▰▰     ← bottom (right-aligned, mirrors the top)
```

**Reads as:**
- Inventory / stacks / a shop's stock (the "stoki" concept)
- An "S" from a distance (Stoki initial)
- A ledger / balance (accounting)
- Movement (offset stack suggests flow)

**Design rules:**
- Minimum size: 16 × 16px (favicon). Below this it loses the "S" silhouette.
- Clear space: leave at least 1/8 of the mark's height on all sides (padding).
- Never stretch, skew, rotate, or recolour the individual blocks. All-emerald or all-white or all-ink — no rainbow.
- The middle block is 78% opacity intentionally (depth). Don't "fix" this by making all three fully opaque.

---

## Company boilerplate for LinkedIn "About" section

### Short (one-line, for the profile subtitle)

> AI-powered business assistant for South African shops & SMMEs.

### Medium (2-3 sentences, for the About section preview)

> Stoki is the AI-powered business assistant built for South African shops and SMMEs. From your first sale to your next SARS submission — one app that runs your till, tracks your money, and answers your questions in plain English. Works on WhatsApp or the web, even offline.

### Long (full About section)

> **Stoki** is the operating system for South African small businesses. We combine a retail till, credit book, invoicing, payroll, VAT reporting, and an AI advisor grounded in the SA economy — all in one app that works on WhatsApp or the web, even offline.
>
> **Built for:**
> - Spaza shops, general dealers, food stalls
> - Salons, mobile operators, tradespeople, small contractors
> - Growing SMMEs with employees (formal, VAT-registered)
>
> **What makes us different:**
> - **WhatsApp-native**: sell, invoice, ask questions in your own language — right from the app your customers already message you on
> - **AI that knows the SA economy**: SARB rates, fuel prices, SARS deadlines, load-shedding, competitor tracking — every insight grounded in your numbers *and* the local market
> - **Offline-first**: keep trading through load-shedding and dodgy Wi-Fi; sync when you're back online
> - **Made in South Africa, for South Africa**: PAYE / UIF / SDL / VAT201 are first-class, not afterthoughts
>
> Free forever for your first store. **[Get started at stokiapp.com](https://www.stokiapp.com)**.

### Tagline

**Run your business without the chaos.**

Alternatives if you want to A/B test:
- *"Your AI business assistant, made in South Africa."*
- *"The whole shop, in one app."*
- *"From first sale to SARS — one app."*

---

## Launch-week LinkedIn post templates

Draft copy you can adapt. Use `linkedin-post-square.png` as the image (or replace the headline in `generate.py` and re-render).

### Post 1 — Founder announcement

> After [N months] of building, Stoki is live. 🟢
>
> It's the AI-powered business assistant I wish I'd had every time I've helped a small business owner untangle their books.
>
> Not another accounting app. Not another till. **The whole shop in one app** — sales, stock, credit, invoices, payroll, VAT, and an AI that actually knows the SA economy (fuel prices, SARB rates, SARS deadlines, load-shedding — all grounded in *your* numbers).
>
> Works on WhatsApp. Works on the web. Works offline.
> Free for your first store. 90-day Business trial for everyone.
>
> If you run a shop, salon, food stall, or any small business in SA — I built this for you.
>
> 👉 stokiapp.com

### Post 2 — Problem/solution

> Every SA small business owner I know is running three apps:
> 📱 Yoco for cards
> 📓 A spreadsheet for stock
> 💬 WhatsApp to chase customers who owe them money
>
> Plus an accountant for the bit they can't figure out.
>
> **Stoki does all of it in one place** — with an AI that knows the SA economy well enough to answer "can I afford to hire?" grounded in your numbers.
>
> Free for your first store. stokiapp.com

### Post 3 — Feature spotlight

> Ask Stoki "how is business?" on WhatsApp.
>
> It'll tell you:
> ✓ Today's revenue (from your till)
> ✓ What's low on stock (from your inventory)
> ✓ Who owes you money (from your credit book)
> ✓ What the SARB rate does to your customers' spending this month
>
> All grounded in your numbers. All in plain English.
>
> This is what "AI for small business" actually looks like when it's built for SA.
>
> Try it → stokiapp.com

---

## Regenerating the pack

If you edit the mark, the tagline, or want a different post headline:

```bash
# from repo root
pip install Pillow  # first time only
python branding/generate.py
```

Outputs to `branding/png/`. Overwrites existing files.

To customise a specific asset, edit the corresponding function in `generate.py` (`make_avatar_dark`, `make_cover`, `make_post_square`, etc.) and re-run.

---

## Do's and Don'ts

**Do:**
- Use the dark-ink avatar as the default
- Pair emerald with dark ink for the highest-recognition look
- Give the mark plenty of clear space (1/8 of mark height minimum)
- Use the exact hex codes (`#00C896`, `#0A0E17`) — no "close enough"

**Don't:**
- Add a drop shadow, glow, or gradient to the mark
- Rotate, stretch, or skew the mark
- Put the emerald mark on a coloured background (blue, orange, red)
- Use a raster PNG when a vector SVG is available for a print/large-format use case
- Add words INSIDE the mark
- Change the middle block's opacity (78% is intentional)

---

## Questions

Email [hello@stokiapp.com](mailto:hello@stokiapp.com) for brand-usage questions.
