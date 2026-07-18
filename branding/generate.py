"""
Generate the Stoki LinkedIn brand pack (PNG assets ready for upload).

Renders the same three-block Stoki mark defined in
`app/src/components/Logo.tsx`, sized and composed for LinkedIn's
specific asset dimensions plus a few general-purpose sizes.

Requires: Pillow (`pip install Pillow`).

Run from repo root:
    python branding/generate.py

Outputs to `branding/png/`:
    - linkedin-avatar-dark.png     400x400  · dark-ink bg, emerald mark
    - linkedin-avatar-emerald.png  400x400  · emerald bg, white mark
    - linkedin-cover.png           1584x396 · company page cover
    - linkedin-post-square.png     1080x1080 · square feed post
    - linkedin-post-link.png       1200x627 · link-preview image
    - mark-emerald.png             1024x1024 · large mark for future use
    - mark-white.png               1024x1024 · large mark for future use
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

# ── Brand tokens ─────────────────────────────────────────────────────
BRAND_EMERALD = (0, 200, 150)      # #00C896  — primary
BRAND_INK     = (10, 14, 23)       # #0A0E17  — bg / body text on light
BRAND_WHITE   = (255, 255, 255)
BRAND_MUTED   = (180, 200, 220)    # supporting text on dark

OUT = Path(__file__).parent / "png"
OUT.mkdir(parents=True, exist_ok=True)

# ── Font resolution ──────────────────────────────────────────────────
# Try common cross-platform fonts. Falls back to Pillow's default
# bitmap font if nothing better is found (which looks poor but the
# script still runs). For production LinkedIn assets, install DM Sans
# locally and swap FONT_CANDIDATES accordingly.
FONT_CANDIDATES = [
    "C:/Windows/Fonts/segoeuib.ttf",       # Segoe UI Bold (Windows)
    "C:/Windows/Fonts/arialbd.ttf",        # Arial Bold (Windows)
    "/System/Library/Fonts/Helvetica.ttc", # macOS
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",  # Linux
]

def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in FONT_CANDIDATES:
        try:
            return ImageFont.truetype(path, size=size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()

# ── Mark renderer ────────────────────────────────────────────────────

def draw_mark(
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    size: float,
    color: tuple[int, int, int],
    opacity_middle: float = 0.78,
) -> None:
    """
    Draw the three-block Stoki mark centred at (cx, cy) fitting within
    a `size` × `size` bounding box. Mirrors the geometry in
    app/src/components/Logo.tsx (viewBox 64×64) so this PNG output is
    pixel-consistent with the in-app SVG mark.
    """
    scale = size / 64.0
    origin_x = cx - size / 2
    origin_y = cy - size / 2

    r, g, b = color
    fill_full = (r, g, b, 255)
    fill_mid  = (r, g, b, int(round(255 * opacity_middle)))

    def block(x: float, y: float, w: float, h: float, rx: float, fill: tuple):
        left   = origin_x + x * scale
        top    = origin_y + y * scale
        right  = left + w * scale
        bottom = top + h * scale
        draw.rounded_rectangle(
            [left, top, right, bottom],
            radius=rx * scale,
            fill=fill,
        )

    block(20, 10, 32, 12, 3, fill_full)  # top
    block(12, 26, 32, 12, 3, fill_mid)   # middle
    block(20, 42, 32, 12, 3, fill_full)  # bottom

# ── Wordmark renderer (mark + "stoki" text) ──────────────────────────

def draw_wordmark(
    canvas: Image.Image,
    cx: float,
    cy: float,
    mark_size: int,
    color: tuple[int, int, int],
    text_color: tuple[int, int, int] | None = None,
) -> None:
    """
    Draw mark + 'stoki' wordmark centred at (cx, cy). Mark on the left,
    wordmark to the right, baseline-aligned to the mark's centre.
    """
    if text_color is None:
        text_color = color
    draw = ImageDraw.Draw(canvas, "RGBA")

    # Font size ~= mark size (visual balance)
    font_size = int(mark_size * 0.82)
    font = load_font(font_size)

    text = "stoki"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    gap = int(mark_size * 0.18)
    total_w = mark_size + gap + text_w
    start_x = cx - total_w / 2

    mark_cx = start_x + mark_size / 2
    draw_mark(draw, mark_cx, cy, mark_size, color)

    text_x = start_x + mark_size + gap
    # Vertical align text visually to the mark's centre. The font's
    # ascent is what dominates the vertical bbox; nudge down slightly.
    text_y = cy - text_h / 2 - bbox[1] - int(font_size * 0.06)
    draw.text((text_x, text_y), text, fill=text_color + (255,), font=font)

# ── Individual asset makers ──────────────────────────────────────────

def make_avatar_dark(path: Path, size: int = 400) -> None:
    """Dark-ink background, emerald mark. Reads as: 'the app'."""
    img = Image.new("RGBA", (size, size), BRAND_INK + (255,))
    draw = ImageDraw.Draw(img, "RGBA")
    mark_size = int(size * 0.62)
    draw_mark(draw, size / 2, size / 2, mark_size, BRAND_EMERALD)
    img.save(path)
    print(f"  [ok] {path.name}  ({size}×{size})")

def make_avatar_emerald(path: Path, size: int = 400) -> None:
    """Emerald background, white mark. Reads as: 'the brand'."""
    img = Image.new("RGBA", (size, size), BRAND_EMERALD + (255,))
    draw = ImageDraw.Draw(img, "RGBA")
    mark_size = int(size * 0.62)
    draw_mark(draw, size / 2, size / 2, mark_size, BRAND_WHITE)
    img.save(path)
    print(f"  [ok] {path.name}  ({size}×{size})")

def make_cover(path: Path, w: int = 1584, h: int = 396) -> None:
    """
    LinkedIn company-page cover. Dark background, wordmark centred-ish
    on the left, tagline underneath. Emerald arc/glow on the right adds
    warmth without competing with the wordmark.
    """
    img = Image.new("RGBA", (w, h), BRAND_INK + (255,))
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay, "RGBA")

    # Soft emerald glow on the right — approximates a radial gradient
    # by drawing concentric transparent ellipses.
    glow_cx = int(w * 0.86)
    glow_cy = int(h * 0.52)
    for i, radius in enumerate(range(320, 0, -20)):
        alpha = max(0, 26 - i * 2)
        odraw.ellipse(
            [glow_cx - radius, glow_cy - radius, glow_cx + radius, glow_cy + radius],
            fill=BRAND_EMERALD + (alpha,),
        )
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img, "RGBA")

    # Wordmark on the left
    mark_size = int(h * 0.36)
    left_pad = int(w * 0.06)
    title_x = left_pad + mark_size / 2
    title_cy = int(h * 0.42)
    draw_mark(draw, title_x, title_cy, mark_size, BRAND_EMERALD)

    # "stoki" wordmark next to mark
    title_font_size = int(mark_size * 1.15)
    title_font = load_font(title_font_size)
    text_x = left_pad + mark_size + int(mark_size * 0.4)
    bbox = draw.textbbox((0, 0), "stoki", font=title_font)
    text_h = bbox[3] - bbox[1]
    text_y = title_cy - text_h / 2 - bbox[1] - int(title_font_size * 0.06)
    draw.text((text_x, text_y), "stoki", fill=BRAND_WHITE + (255,), font=title_font)

    # Tagline underneath
    tagline_font = load_font(int(h * 0.075))
    tagline_y = int(h * 0.62)
    draw.text(
        (left_pad, tagline_y),
        "Run your business without the chaos.",
        fill=BRAND_MUTED + (255,),
        font=tagline_font,
    )

    # Small "made in SA" strip
    strip_font = load_font(int(h * 0.048))
    draw.text(
        (left_pad, tagline_y + int(h * 0.14)),
        "AI-powered business assistant · made in South Africa",
        fill=(120, 140, 170, 255),
        font=strip_font,
    )

    img.save(path)
    print(f"  [ok] {path.name}  ({w}×{h})")

def make_cover_wordmark_only(path: Path, w: int = 1584, h: int = 396) -> None:
    """
    Alternative LinkedIn company-page cover — big centred wordmark +
    tagline, no logo mark. Cleaner / more editorial. Use when the
    logo already appears prominently as the profile avatar and the
    banner feels redundant.
    """
    img = Image.new("RGBA", (w, h), BRAND_INK + (255,))
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay, "RGBA")

    # Two soft emerald glows — one right, one lower-left — for depth
    # without stealing focus from the centred wordmark.
    for i, radius in enumerate(range(360, 0, -20)):
        alpha = max(0, 24 - i * 2)
        odraw.ellipse(
            [w * 0.90 - radius, h * 0.5 - radius, w * 0.90 + radius, h * 0.5 + radius],
            fill=BRAND_EMERALD + (alpha,),
        )
    for i, radius in enumerate(range(240, 0, -20)):
        alpha = max(0, 18 - i * 2)
        odraw.ellipse(
            [w * 0.08 - radius, h * 0.85 - radius, w * 0.08 + radius, h * 0.85 + radius],
            fill=BRAND_EMERALD + (alpha,),
        )
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img, "RGBA")

    # Stack layout: wordmark → underline → tagline → strip.
    # Each element measured with its own bbox, then positioned by
    # accumulating a `cursor_y` down the canvas. Guarantees no overlap.
    def measure(text: str, font) -> tuple[int, int, int]:
        """Return (width, height, top_offset) using Pillow's textbbox."""
        b = draw.textbbox((0, 0), text, font=font)
        return b[2] - b[0], b[3] - b[1], b[1]

    title = "stoki"
    title_font_size = int(h * 0.30)   # was 0.42 — too tall, ate the tagline
    title_font = load_font(title_font_size)
    tw, th, ttop = measure(title, title_font)

    tagline = "Run your business without the chaos."
    tagline_font = load_font(int(h * 0.078))
    ttw, tth, ttop2 = measure(tagline, tagline_font)

    strip = "AI-powered business assistant  ·  made in South Africa"
    strip_font = load_font(int(h * 0.045))
    stw, sth, stop = measure(strip, strip_font)

    underline_h = max(4, int(h * 0.014))
    underline_w = int(tw * 0.32)
    gap_after_title    = int(h * 0.025)
    gap_after_underline = int(h * 0.055)
    gap_after_tagline   = int(h * 0.045)

    total_stack_h = th + gap_after_title + underline_h + gap_after_underline \
                    + tth + gap_after_tagline + sth
    start_y = (h - total_stack_h) // 2  # vertical centre

    # Wordmark
    cursor_y = start_y
    draw.text(
        (w / 2 - tw / 2, cursor_y - ttop),  # subtract ttop so text top hits cursor_y
        title,
        fill=BRAND_WHITE + (255,),
        font=title_font,
    )
    cursor_y += th + gap_after_title

    # Emerald underline
    draw.rounded_rectangle(
        [w / 2 - underline_w / 2, cursor_y, w / 2 + underline_w / 2, cursor_y + underline_h],
        radius=underline_h / 2,
        fill=BRAND_EMERALD + (255,),
    )
    cursor_y += underline_h + gap_after_underline

    # Tagline
    draw.text(
        (w / 2 - ttw / 2, cursor_y - ttop2),
        tagline,
        fill=BRAND_MUTED + (255,),
        font=tagline_font,
    )
    cursor_y += tth + gap_after_tagline

    # Strip
    draw.text(
        (w / 2 - stw / 2, cursor_y - stop),
        strip,
        fill=(120, 140, 170, 255),
        font=strip_font,
    )

    img.save(path)
    print(f"  [ok] {path.name}  ({w}x{h})")

def make_post_square(path: Path, size: int = 1080) -> None:
    """
    Square feed-post template. Big wordmark centred, headline above,
    call-out below. Good for announcements: 'We're live', 'New
    feature', etc. Swap the headline/subhead in the code below when
    reusing.
    """
    img = Image.new("RGBA", (size, size), BRAND_INK + (255,))
    overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay, "RGBA")

    # Diagonal emerald wash top-right
    for i, radius in enumerate(range(480, 0, -20)):
        alpha = max(0, 20 - i * 1)
        odraw.ellipse(
            [size - radius, -radius, size + radius, radius * 1.4],
            fill=BRAND_EMERALD + (alpha,),
        )
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img, "RGBA")

    # Wordmark centred
    draw_wordmark(img, size / 2, int(size * 0.42), int(size * 0.14), BRAND_EMERALD, BRAND_WHITE)

    # Headline
    headline_font = load_font(int(size * 0.056))
    headline = "The AI business assistant for South African businesses"
    # Simple manual line-wrap (Pillow doesn't have one built-in)
    lines = _wrap_text(draw, headline, headline_font, int(size * 0.78))
    line_h = int(size * 0.075)
    total_h = line_h * len(lines)
    start_y = int(size * 0.58)
    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=headline_font)
        tw = bbox[2] - bbox[0]
        draw.text(
            (size / 2 - tw / 2, start_y + i * line_h),
            line,
            fill=BRAND_WHITE + (255,),
            font=headline_font,
        )

    # Bottom call-out
    cta_font = load_font(int(size * 0.028))
    cta = "stokiapp.com"
    bbox = draw.textbbox((0, 0), cta, font=cta_font)
    tw = bbox[2] - bbox[0]
    draw.text(
        (size / 2 - tw / 2, int(size * 0.88)),
        cta,
        fill=BRAND_EMERALD + (255,),
        font=cta_font,
    )

    img.save(path)
    print(f"  [ok] {path.name}  ({size}×{size})")

def make_post_link(path: Path, w: int = 1200, h: int = 627) -> None:
    """
    Link-preview image (1.91:1 aspect, LinkedIn's preferred). Used
    when someone shares a stokiapp.com URL. Wordmark on left, tagline
    on right — landscape composition that reads at small preview size.
    """
    img = Image.new("RGBA", (w, h), BRAND_INK + (255,))
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay, "RGBA")

    for i, radius in enumerate(range(420, 0, -20)):
        alpha = max(0, 20 - i * 1)
        odraw.ellipse(
            [w - radius * 0.8, h - radius, w + radius * 0.6, h + radius * 0.4],
            fill=BRAND_EMERALD + (alpha,),
        )
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img, "RGBA")

    # Wordmark left
    left_pad = int(w * 0.06)
    mark_size = int(h * 0.32)
    draw_mark(draw, left_pad + mark_size / 2, int(h * 0.32), mark_size, BRAND_EMERALD)

    title_font = load_font(int(h * 0.11))
    text_x = left_pad + mark_size + int(mark_size * 0.35)
    bbox = draw.textbbox((0, 0), "stoki", font=title_font)
    text_h = bbox[3] - bbox[1]
    text_y = int(h * 0.32) - text_h / 2 - bbox[1] - int(h * 0.008)
    draw.text((text_x, text_y), "stoki", fill=BRAND_WHITE + (255,), font=title_font)

    # Big tagline underneath
    tagline_font = load_font(int(h * 0.075))
    lines = _wrap_text(draw, "The AI business assistant for South African businesses.", tagline_font, int(w * 0.88))
    line_h = int(h * 0.1)
    start_y = int(h * 0.55)
    for i, line in enumerate(lines):
        draw.text((left_pad, start_y + i * line_h), line, fill=BRAND_MUTED + (255,), font=tagline_font)

    img.save(path)
    print(f"  [ok] {path.name}  ({w}×{h})")

def make_high_res_mark(path: Path, color: tuple[int, int, int], transparent_bg: bool = True, size: int = 1024) -> None:
    """1024×1024 mark on transparent or coloured background."""
    if transparent_bg:
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    else:
        img = Image.new("RGBA", (size, size), BRAND_INK + (255,))
    draw = ImageDraw.Draw(img, "RGBA")
    draw_mark(draw, size / 2, size / 2, int(size * 0.72), color)
    img.save(path)
    print(f"  [ok] {path.name}  ({size}×{size})")

# ── Helpers ──────────────────────────────────────────────────────────

def _wrap_text(draw: ImageDraw.ImageDraw, text: str, font, max_w: int) -> list[str]:
    """Naive word-wrap for headline text."""
    words = text.split()
    lines: list[str] = []
    current: list[str] = []
    for word in words:
        trial = " ".join(current + [word])
        bbox = draw.textbbox((0, 0), trial, font=font)
        if bbox[2] - bbox[0] <= max_w:
            current.append(word)
        else:
            if current:
                lines.append(" ".join(current))
            current = [word]
    if current:
        lines.append(" ".join(current))
    return lines

# ── Run ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"Generating brand pack -> {OUT}")
    print()
    make_avatar_dark(OUT / "linkedin-avatar-dark.png")
    make_avatar_emerald(OUT / "linkedin-avatar-emerald.png")
    make_cover(OUT / "linkedin-cover.png")
    make_cover_wordmark_only(OUT / "linkedin-cover-wordmark-only.png")
    make_post_square(OUT / "linkedin-post-square.png")
    make_post_link(OUT / "linkedin-post-link.png")
    make_high_res_mark(OUT / "mark-emerald-transparent.png", BRAND_EMERALD, transparent_bg=True)
    make_high_res_mark(OUT / "mark-white-transparent.png", BRAND_WHITE, transparent_bg=True)
    print()
    print("Done. Upload from branding/png/ to LinkedIn.")
