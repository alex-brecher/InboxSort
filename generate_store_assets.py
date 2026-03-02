#!/usr/bin/env python3
"""Generate Chrome Web Store promo tiles and store icon for InboxSort.

Creates:
  1. Store icon (128x128, no alpha) — from existing icon
  2. Small promo tile (440x280, no alpha)
  3. Marquee promo tile (1400x560, no alpha)

Note: Screenshots are captured via browser automation, not generated here.
"""

from PIL import Image, ImageDraw, ImageFont
import os
import math

STORE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "store-assets")
ICON_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons")
os.makedirs(STORE_DIR, exist_ok=True)

# ── Brand colors ──────────────────────────────────────────────────
BLUE = (26, 115, 232)
BLUE_DARK = (21, 95, 190)
BLUE_DEEPER = (15, 70, 155)
BLUE_LIGHT = (210, 227, 252)
WHITE = (255, 255, 255)
GRAY_50 = (248, 249, 250)
GRAY_100 = (241, 243, 244)
GRAY_200 = (218, 220, 224)
GRAY_500 = (154, 160, 166)
GRAY_700 = (95, 99, 104)
GRAY_800 = (60, 64, 67)
GRAY_900 = (32, 33, 36)


def get_font(size, bold=False):
    """Try to load a clean sans-serif font."""
    font_paths = [
        "/System/Library/Fonts/SFPro-Bold.ttf" if bold else "/System/Library/Fonts/SFPro-Regular.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size)
            except Exception:
                continue
    return ImageFont.load_default()


def text_size(draw, text, font):
    """Get text width and height."""
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def draw_gradient(draw, w, h, color_top, color_bottom):
    """Draw a vertical gradient."""
    for y in range(h):
        t = y / h
        r = int(color_top[0] + (color_bottom[0] - color_top[0]) * t)
        g = int(color_top[1] + (color_bottom[1] - color_top[1]) * t)
        b = int(color_top[2] + (color_bottom[2] - color_top[2]) * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b))


def draw_icon_on(img, x, y, size):
    """Draw the InboxSort icon at the given position and size."""
    icon_path = os.path.join(ICON_DIR, "icon512.png")
    if not os.path.exists(icon_path):
        icon_path = os.path.join(ICON_DIR, "icon128.png")
    if os.path.exists(icon_path):
        icon = Image.open(icon_path).convert("RGBA")
        icon = icon.resize((size, size), Image.LANCZOS)
        img.paste(icon, (x, y), icon)
    else:
        draw = ImageDraw.Draw(img)
        draw.rounded_rectangle([x, y, x + size, y + size], size // 5, fill=BLUE)


# ══════════════════════════════════════════════════════════════════
# 1. STORE ICON — 128x128, no alpha
# ══════════════════════════════════════════════════════════════════

def create_store_icon():
    icon_path = os.path.join(ICON_DIR, "icon128.png")
    if not os.path.exists(icon_path):
        icon_path = os.path.join(ICON_DIR, "icon512.png")
    if os.path.exists(icon_path):
        icon = Image.open(icon_path).convert("RGBA")
        icon = icon.resize((128, 128), Image.LANCZOS)
        bg = Image.new("RGB", (128, 128), WHITE)
        bg.paste(icon, (0, 0), icon)
        out = os.path.join(STORE_DIR, "store-icon-128.png")
        bg.save(out, "PNG")
        print(f"  ✓ Store icon: {out}")
    else:
        print("  ✗ No icon file found!")


# ══════════════════════════════════════════════════════════════════
# 2. SMALL PROMO TILE — 440x280, no alpha
# ══════════════════════════════════════════════════════════════════

def create_small_promo():
    w, h = 440, 280
    img = Image.new("RGB", (w, h), BLUE)
    draw = ImageDraw.Draw(img)

    # Gradient background
    draw_gradient(draw, w, h, BLUE, BLUE_DARK)

    # Subtle decorative circles (very soft)
    for cx, cy, cr, alpha in [(380, 30, 100, 15), (-20, 230, 80, 12), (200, -40, 60, 10)]:
        for r in range(cr, 0, -1):
            t = r / cr
            color = (
                min(255, BLUE[0] + int(alpha * t)),
                min(255, BLUE[1] + int(alpha * t)),
                min(255, BLUE[2] + int(alpha * t)),
            )
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)

    # Icon
    icon_size = 56
    draw_icon_on(img, w // 2 - icon_size // 2, 36, icon_size)

    # Title
    font_title = get_font(30, bold=True)
    title = "InboxSort"
    tw, _ = text_size(draw, title, font_title)
    draw.text(((w - tw) // 2, 102), title, fill=WHITE, font=font_title)

    # Tagline
    font_tag = get_font(14)
    tagline = "Sort your Gmail inbox your way"
    tgw, _ = text_size(draw, tagline, font_tag)
    draw.text(((w - tgw) // 2, 142), tagline, fill=(190, 215, 255), font=font_tag)

    # Feature pills row
    font_pill = get_font(11, bold=True)
    pills = ["Date", "Sender", "Unread", "Group"]
    pill_gap = 8
    pill_pad_x = 14
    pill_h = 28

    # Measure total width
    pill_widths = []
    for pill in pills:
        pw, _ = text_size(draw, pill, font_pill)
        pill_widths.append(pw + pill_pad_x * 2)
    total_pills_w = sum(pill_widths) + pill_gap * (len(pills) - 1)

    px = (w - total_pills_w) // 2
    py = 185

    for i, pill in enumerate(pills):
        pw = pill_widths[i]
        tw, _ = text_size(draw, pill, font_pill)
        # First pill gets solid white background (active look)
        if i == 0:
            draw.rounded_rectangle([px, py, px + pw, py + pill_h], pill_h // 2, fill=WHITE)
            draw.text((px + pill_pad_x, py + 6), pill, fill=BLUE, font=font_pill)
        else:
            draw.rounded_rectangle([px, py, px + pw, py + pill_h], pill_h // 2,
                                   fill=None, outline=(150, 195, 255), width=2)
            draw.text((px + pill_pad_x, py + 6), pill, fill=(220, 235, 255), font=font_pill)
        px += pw + pill_gap

    # Bottom tagline
    font_bottom = get_font(11)
    bottom_text = "Free · No data collected · Works offline"
    bw, _ = text_size(draw, bottom_text, font_bottom)
    draw.text(((w - bw) // 2, 235), bottom_text, fill=(140, 180, 240), font=font_bottom)

    out = os.path.join(STORE_DIR, "small-promo-440x280.png")
    img.save(out, "PNG")
    print(f"  ✓ Small promo tile: {out}")


# ══════════════════════════════════════════════════════════════════
# 3. MARQUEE PROMO TILE — 1400x560, no alpha
# ══════════════════════════════════════════════════════════════════

def create_marquee_promo():
    w, h = 1400, 560
    img = Image.new("RGB", (w, h), BLUE)
    draw = ImageDraw.Draw(img)

    # Gradient background
    draw_gradient(draw, w, h, BLUE, BLUE_DEEPER)

    # Decorative subtle circles
    for cx, cy, cr, alpha in [
        (1300, 80, 200, 12), (-60, 450, 140, 10),
        (700, -60, 100, 8), (1100, 500, 120, 10)
    ]:
        for r in range(cr, 0, -1):
            t = r / cr
            color = (
                min(255, BLUE_DARK[0] + int(alpha * t)),
                min(255, BLUE_DARK[1] + int(alpha * t)),
                min(255, BLUE_DARK[2] + int(alpha * t)),
            )
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)

    # ── Left side: branding + features ──
    left_x = 100

    # Icon + title row
    icon_size = 72
    draw_icon_on(img, left_x, 80, icon_size)
    font_title = get_font(48, bold=True)
    draw.text((left_x + icon_size + 20, 90), "InboxSort", fill=WHITE, font=font_title)

    # Tagline
    font_tag = get_font(20)
    draw.text((left_x, 180), "Sort your Gmail inbox by date, sender,", fill=(195, 220, 255), font=font_tag)
    draw.text((left_x, 210), "or unread status — right inside Gmail.", fill=(195, 220, 255), font=font_tag)

    # Feature list with icons
    font_feat = get_font(16, bold=True)
    features = [
        "5 sort modes — oldest, newest, sender A→Z / Z→A, unread first",
        "Group emails by sender alphabetically",
        "Keyboard shortcuts for power users",
        "Live inbox stats — total, unread, starred, attachments",
        "Remembers your sort preference",
    ]
    icons = ["⚡", "👥", "⌨️", "📊", "💾"]
    fy = 275
    for icon, feat in zip(icons, features):
        draw.text((left_x + 4, fy), icon, fill=WHITE, font=font_feat)
        draw.text((left_x + 30, fy), feat, fill=WHITE, font=font_feat)
        fy += 36

    # Bottom badge
    font_badge = get_font(13)
    badge_text = "Free · Privacy-first · No data collected"
    draw.text((left_x, h - 50), badge_text, fill=(140, 180, 240), font=font_badge)

    # ── Right side: mini mockup ──
    rx, ry = 820, 80
    mock_w, mock_h = 480, 400

    # Shadow
    for s in range(12, 0, -1):
        shadow_color = (
            max(0, BLUE_DEEPER[0] - 10),
            max(0, BLUE_DEEPER[1] - 10),
            max(0, BLUE_DEEPER[2] - 10),
        )
        draw.rounded_rectangle(
            [rx + s, ry + s, rx + mock_w + s, ry + mock_h + s],
            radius=16, fill=shadow_color
        )

    # Mockup background
    draw.rounded_rectangle([rx, ry, rx + mock_w, ry + mock_h], radius=16, fill=WHITE)

    # Mini toolbar
    font_mini = get_font(11, bold=True)
    font_mini_reg = get_font(11)
    toolbar_y = ry + 14
    tabs_mini = [
        ("↑ Oldest", True), ("Sender", False),
        ("Unread", False), ("Group", False)
    ]
    tx = rx + 14
    for label, active in tabs_mini:
        tw, _ = text_size(draw, label, font_mini)
        tab_w = tw + 20
        if active:
            draw.rounded_rectangle([tx, toolbar_y, tx + tab_w, toolbar_y + 26], 13, fill=BLUE)
            draw.text((tx + 10, toolbar_y + 5), label, fill=WHITE, font=font_mini)
        else:
            draw.rounded_rectangle([tx, toolbar_y, tx + tab_w, toolbar_y + 26], 13, fill=GRAY_100)
            draw.text((tx + 10, toolbar_y + 5), label, fill=GRAY_700, font=font_mini_reg)
        tx += tab_w + 6

    # Stats on the right side of toolbar
    font_stat = get_font(10)
    draw.text((rx + mock_w - 120, toolbar_y + 2), "12 emails", fill=GRAY_500, font=font_stat)
    draw.text((rx + mock_w - 120, toolbar_y + 14), "4 unread", fill=BLUE, font=font_stat)

    # Divider line
    draw.line([rx + 12, toolbar_y + 34, rx + mock_w - 12, toolbar_y + 34], fill=GRAY_200, width=1)

    # Mini email rows
    ey = toolbar_y + 42
    mini_emails = [
        ("Amazon", "Your order has shipped — Track your...", "Jan 2", True),
        ("LinkedIn", "New connection request from John...", "Jan 5", True),
        ("GitHub", "Security alert for repository app...", "Jan 8", False),
        ("Spotify", "Your weekly playlist is ready now...", "Jan 12", False),
        ("Google", "Billing summary for January is now...", "Jan 15", True),
        ("Slack", "New message in #general channel...", "Jan 18", False),
        ("Figma", "Design review requested by Sarah...", "Jan 21", True),
        ("Stripe", "Payment received for $2,450.00...", "Jan 24", False),
        ("Notion", "Page shared with you: Q1 OKRs...", "Jan 27", False),
    ]

    font_sender = get_font(11, bold=True)
    font_sender_read = get_font(11)
    font_subj = get_font(10)
    font_date = get_font(9)

    for sender, subj, date, unread in mini_emails:
        row_h = 34
        bg = (242, 246, 252) if unread else WHITE
        draw.rectangle([rx + 4, ey, rx + mock_w - 4, ey + row_h], fill=bg)
        draw.line([rx + 12, ey + row_h, rx + mock_w - 12, ey + row_h], fill=GRAY_100)

        if unread:
            draw.ellipse([rx + 12, ey + 13, rx + 18, ey + 19], fill=BLUE)

        sf = font_sender if unread else font_sender_read
        sc = GRAY_900 if unread else GRAY_500
        draw.text((rx + 26, ey + 9), sender, fill=sc, font=sf)
        draw.text((rx + 120, ey + 10), subj, fill=GRAY_500, font=font_subj)

        dw, _ = text_size(draw, date, font_date)
        draw.text((rx + mock_w - dw - 14, ey + 11),
                  date, fill=BLUE if unread else GRAY_500, font=font_date)
        ey += row_h + 1

    out = os.path.join(STORE_DIR, "marquee-promo-1400x560.png")
    img.save(out, "PNG")
    print(f"  ✓ Marquee promo tile: {out}")


# ══════════════════════════════════════════════════════════════════
# Generate all assets
# ══════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("Generating Chrome Web Store promo assets...\n")
    create_store_icon()
    create_small_promo()
    create_marquee_promo()
    print(f"\nAll assets saved to: {STORE_DIR}/")
    print("Done! ✨")
