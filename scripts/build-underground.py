"""Derive the underground section's materials from the hero artwork.

Keeping the stone, chrome and grass in the archive physically identical to the
hero is what ties the two halves of the page together.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
MEDIA = ROOT / 'assets' / 'media' / 'y2k'


def wrap_blend(patch):
    """Make a crop tile seamlessly by cross-fading it with its own shifts.

    Mirroring produced kaleidoscope symmetry and a Voronoi fake produced
    triangles; cross-fading keeps the real material and only softens it.
    """
    array = np.asarray(patch, dtype=float)
    height, width = array.shape[:2]

    ramp_x = np.linspace(0, 1, width, endpoint=False)[None, :, None]
    ramp_y = np.linspace(0, 1, height, endpoint=False)[:, None, None]
    fx = ramp_x * ramp_x * (3 - 2 * ramp_x)
    fy = ramp_y * ramp_y * (3 - 2 * ramp_y)

    shifted_x = np.roll(array, width // 2, axis=1)
    shifted_y = np.roll(array, height // 2, axis=0)
    shifted_xy = np.roll(shifted_x, height // 2, axis=0)

    blended = (
        array * (1 - fx) * (1 - fy)
        + shifted_x * fx * (1 - fy)
        + shifted_y * (1 - fx) * fy
        + shifted_xy * fx * fy
    )
    return Image.fromarray(np.clip(blended, 0, 255).astype(np.uint8), 'RGB')


def build_stone():
    """The slabs use the monument's own stone, so both read as one material."""
    monument = Image.open(
        ROOT / 'assets' / 'media' / 'profile' / 'missing-mar-profile-monument-v1.png'
    ).convert('RGB')
    patch = monument.crop((312, 672, 680, 1040)).resize((512, 512), Image.Resampling.LANCZOS)
    tile = wrap_blend(patch)
    tile = ImageEnhance.Brightness(tile).enhance(1.04)
    tile.save(MEDIA / 'stone-tile.webp', format='WEBP', quality=92, method=6)


def value_noise(shape, cells, rng):
    """Smooth noise from an upsampled random grid."""
    grid = rng.random((cells, cells))
    return np.asarray(
        Image.fromarray((grid * 255).astype(np.uint8), 'L').resize(shape[::-1], Image.Resampling.BICUBIC),
        dtype=float,
    ) / 255.0


def build_soil():
    """A strip of packed earth: banded strata, clumps and grit."""
    shape = (540, 540)
    rng = np.random.default_rng(11)

    rows = np.linspace(0, 1, shape[0])[:, None]
    strata = (
        0.5
        + 0.20 * np.sin(rows * 26)
        + 0.11 * np.sin(rows * 71 + 1.2)
        + 0.07 * np.sin(rows * 133 + 2.4)
    )
    clumps = (
        0.50 * value_noise(shape, 6, rng)
        + 0.30 * value_noise(shape, 17, rng)
        + 0.20 * value_noise(shape, 48, rng)
    )
    grit = rng.normal(0, 0.16, shape)
    field = np.clip(0.42 * strata + 0.48 * clumps + grit, 0, 1)
    field = np.clip((field - 0.5) * 1.55 + 0.5, 0, 1)

    top = np.array([58, 36, 22], dtype=float)
    deep = np.array([17, 12, 10], dtype=float)
    ramp = np.linspace(0, 1, shape[0])[:, None, None]
    base = top * (1 - ramp) + deep * ramp
    soil = np.clip(base * (0.40 + 1.15 * field[:, :, None]), 0, 255).astype(np.uint8)

    # Mirrored so the strata run continuously instead of banding at every seam.
    image = wrap_blend(Image.fromarray(soil, 'RGB'))
    image.save(MEDIA / 'soil-tile.webp', format='WEBP', quality=90, method=6)


if __name__ == '__main__':
    build_stone()
    build_soil()
    print('wrote stone-tile, soil-tile')
