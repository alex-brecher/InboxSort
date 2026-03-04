#!/usr/bin/env python3
"""Generate InboxSort extension icons at 16, 48, 128, and 512px.

Design: Gmail-blue rounded square with a white envelope +
sort arrows overlaid on the bottom-right.
"""

from PIL import Image, ImageDraw
import os

ICON_DIR = os.path.join(os.path.dirname(__file__), "icons")
os.makedirs(ICON_DIR, exist_ok=True)

GMAIL_BLUE = (26, 115, 232, 255)
WHITE = (255, 255, 255, 255)


def draw_icon_hires():
    """Draw at 512px then downscale for crisp results."""
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # ─── Background: rounded rectangle ───
    pad = 24
    corner = 110
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=corner,
        fill=GMAIL_BLUE,
    )

    # ─── Envelope body ───
    env_l = 90
    env_t = 150
    env_r = 340
    env_b = 380
    env_rad = 24

    draw.rounded_rectangle(
        [env_l, env_t, env_r, env_b],
        radius=env_rad,
        fill=WHITE,
    )

    # ─── Envelope flap (triangle from top edge down to center) ───
    flap_pts = [
        (env_l + 4, env_t + 4),
        (env_r - 4, env_t + 4),
        ((env_l + env_r) // 2, (env_t + env_b) // 2 - 10),
    ]
    draw.polygon(flap_pts, fill=GMAIL_BLUE)

    # Draw flap lines
    cx = (env_l + env_r) // 2
    cy = (env_t + env_b) // 2 - 10
    lw = 12
    draw.line([(env_l, env_t + 6), (cx, cy)], fill=WHITE, width=lw)
    draw.line([(env_r, env_t + 6), (cx, cy)], fill=WHITE, width=lw)
    # Top edge of envelope
    draw.line([(env_l, env_t + 8), (env_l + 20, env_t + 8)], fill=WHITE, width=lw)
    draw.line([(env_r, env_t + 8), (env_r - 20, env_t + 8)], fill=WHITE, width=lw)

    # ─── Sort arrows (bottom-right quadrant) ───
    badge_cx = 390
    badge_cy = 370
    badge_r = 85
    draw.ellipse(
        [badge_cx - badge_r, badge_cy - badge_r,
         badge_cx + badge_r, badge_cy + badge_r],
        fill=WHITE,
    )

    # Up arrow
    a_lw = 14
    up_x = badge_cx - 28
    draw.line([(up_x, badge_cy + 32), (up_x, badge_cy - 38)], fill=GMAIL_BLUE, width=a_lw)
    draw.line([(up_x - 22, badge_cy - 14), (up_x, badge_cy - 38)], fill=GMAIL_BLUE, width=a_lw)
    draw.line([(up_x + 22, badge_cy - 14), (up_x, badge_cy - 38)], fill=GMAIL_BLUE, width=a_lw)

    # Down arrow
    dn_x = badge_cx + 28
    draw.line([(dn_x, badge_cy - 32), (dn_x, badge_cy + 38)], fill=GMAIL_BLUE, width=a_lw)
    draw.line([(dn_x - 22, badge_cy + 14), (dn_x, badge_cy + 38)], fill=GMAIL_BLUE, width=a_lw)
    draw.line([(dn_x + 22, badge_cy + 14), (dn_x, badge_cy + 38)], fill=GMAIL_BLUE, width=a_lw)

    return img


def generate_icons():
    # Generate master at 512px, then downscale
    master = draw_icon_hires()

    for px in [16, 48, 128]:
        icon = master.resize((px, px), Image.LANCZOS)
        path = os.path.join(ICON_DIR, f"icon{px}.png")
        icon.save(path, "PNG", optimize=True)
        print(f"  Created {path} ({px}x{px})")

    # Also save 512px for store listing
    store_path = os.path.join(ICON_DIR, "icon512.png")
    master.save(store_path, "PNG", optimize=True)
    print(f"  Created {store_path} (512x512) [for store listing]")

    print("Done!")


if __name__ == "__main__":
    generate_icons()
