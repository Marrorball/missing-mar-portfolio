"""Compose the hero scene from clean, approved parts.

One deterministic pass — never a generative pass over a previous render, which
is what degraded the grass, the chrome and the portrait before.

Parts:
  landscape-background-smooth-chrome.png  the 2048px scene: smooth chrome,
                                          bladed grass, no plate, no interface
  missing-mar-profile-monument-v1.png     the approved stone plate
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
MEDIA = ROOT / 'assets' / 'media'

# Where the plate stands, in the 2048x1457 base image.
PLATE_BOX = (128, 654, 590, 590)


def solid_silhouette(monument):
    """The monument outline with the generator's interior alpha holes filled."""
    mask = monument.getchannel('A').point(lambda value: 255 if value > 200 else 0)
    outside = ImageChops.invert(mask)
    for corner in ((0, 0), (outside.width - 1, 0), (0, outside.height - 1),
                   (outside.width - 1, outside.height - 1)):
        ImageDraw.floodfill(outside, corner, 128)
    solid = outside.point(lambda value: 0 if value == 128 else 255)
    for _ in range(6):
        solid = solid.filter(ImageFilter.MaxFilter(15))
    for _ in range(6):
        solid = solid.filter(ImageFilter.MinFilter(15))
    return solid


def blade_alpha(strip, rng):
    """A hard, blade-shaped alpha cut from the grass itself.

    A soft gradient reads as a translucent sheet of green laid over the stone.
    Real grass in front of an object is opaque: the turf is solid, and only the
    blade tips break the line — so the mask is binary and short.
    """
    grey = strip.convert('L')
    relief = np.asarray(grey, dtype=float) - np.asarray(
        grey.filter(ImageFilter.GaussianBlur(5)), dtype=float
    )

    height, width = relief.shape
    rows = np.linspace(0.0, 1.0, height)[:, None]

    solid_from = 0.52
    tips = relief > 7.0
    # Tips thin out towards the top of the strip.
    survive = rng.random((height, width)) < np.clip((rows - 0.06) / (solid_from - 0.06), 0, 1) ** 0.8
    keep = (tips & survive) | (rows > solid_from)

    alpha = Image.fromarray((keep * 255).astype(np.uint8), 'L')
    alpha = alpha.filter(ImageFilter.MedianFilter(5))
    return alpha.filter(ImageFilter.GaussianBlur(0.4))


def build_scene():
    scene = Image.open(MEDIA / 'y2k' / 'landscape-background-smooth-chrome.png').convert('RGBA')
    monument = Image.open(MEDIA / 'profile' / 'missing-mar-profile-monument-v1.png').convert('RGBA')

    plate = monument.crop(solid_silhouette(monument).getbbox())
    left, top, width, height = PLATE_BOX
    plate = plate.resize((width, height), Image.Resampling.LANCZOS)
    bottom = top + height

    # Contact shadow: the turf darkens where the stone meets and presses it.
    shadow = Image.new('L', scene.size, 0)
    ImageDraw.Draw(shadow).ellipse(
        (left - 40, bottom - 52, left + width + 62, bottom + 46), fill=190
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(26))
    dark = Image.new('RGBA', scene.size, (8, 26, 12, 255))
    dark.putalpha(shadow)
    scene.alpha_composite(dark)

    grounded = scene.copy()
    scene.alpha_composite(plate, (left, top))

    # Grass in front of the base, cut blade by blade out of the same turf.
    rng = np.random.default_rng(5)
    blade_height = 46
    box = (max(left - 60, 0), bottom - blade_height, min(left + width + 60, scene.width), bottom + 34)
    strip = grounded.crop(box)
    strip.putalpha(blade_alpha(strip, rng))
    scene.alpha_composite(strip, (box[0], box[1]))
    return scene.convert('RGB')


if __name__ == '__main__':
    scene = build_scene()
    path = MEDIA / 'y2k' / 'hero-scene.png'
    scene.save(path)
    scene.save(path.with_suffix('.webp'), format='WEBP', quality=93, method=6)
    print('wrote', path)
