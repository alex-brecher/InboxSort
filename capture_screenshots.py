#!/usr/bin/env python3
"""Capture Chrome viewport from full-screen screenshot and save as PNG.

Usage: python3 capture_screenshots.py <output_filename>
Crops the full-screen capture to just the Chrome viewport area.
"""

import subprocess
import sys
import os
from PIL import Image

STORE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "store-assets")

# Chrome window position (logical/CSS pixels)
WIN_X = 88
WIN_Y = 74
CHROME_UI_HEIGHT = 173  # tabs + address bar + bookmarks
VIEWPORT_W = 1280
VIEWPORT_H = 800
RETINA_SCALE = 2

# Physical pixel coordinates for viewport crop
CROP_LEFT = WIN_X * RETINA_SCALE
CROP_TOP = (WIN_Y + CHROME_UI_HEIGHT) * RETINA_SCALE
CROP_RIGHT = CROP_LEFT + VIEWPORT_W * RETINA_SCALE
CROP_BOTTOM = CROP_TOP + VIEWPORT_H * RETINA_SCALE


def capture(output_name):
    """Capture screen, crop to viewport, save as 1280x800 PNG."""
    tmp_path = "/tmp/inboxsort_fullscreen.png"
    out_path = os.path.join(STORE_DIR, output_name)

    try:
        # Capture full screen
        subprocess.run(["screencapture", "-x", tmp_path], check=True)

        # Open and crop to viewport
        img = Image.open(tmp_path)
        if CROP_LEFT < 0 or CROP_TOP < 0 or CROP_RIGHT > img.width or CROP_BOTTOM > img.height:
            raise ValueError(
                f"Crop bounds out of screenshot range: "
                f"{(CROP_LEFT, CROP_TOP, CROP_RIGHT, CROP_BOTTOM)} vs image {(img.width, img.height)}"
            )

        viewport = img.crop((CROP_LEFT, CROP_TOP, CROP_RIGHT, CROP_BOTTOM))

        # Resize from Retina (2560x1600) to target (1280x800)
        final = viewport.resize((VIEWPORT_W, VIEWPORT_H), Image.LANCZOS)

        # Ensure RGB (no alpha) and save
        final = final.convert("RGB")
        final.save(out_path, "PNG")
        print(f"  ✓ {out_path} ({final.size[0]}x{final.size[1]})")
        return out_path
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 capture_screenshots.py <filename.png>")
        sys.exit(1)
    capture(sys.argv[1])
