"""Goods behind the showcase glass: four shelves packed two rows deep with
bottles, cans, boxes, crisps and chocolate, price tags, crisps hanging from a
rail, and the eight project slots on the eye-level shelf."""

import random

from dims import GLASS_HIGH, GLASS_LOW, HW, SHELF_LEVELS, SHELF_Y, SLOT_LEVEL, SLOT_XS, W
from lib import Merge, box

SHELF_DEPTH = 0.3
SHELF_THICK = 0.03
X_MIN, X_MAX = -HW + 0.12, HW - 0.12
SLOT_SIZE = (0.2, 0.13, 0.28)
WIDEST_ITEM = 0.15


def _item(merge, rng, left, y, base, max_h, M):
    """Stand one random item on `base` starting at x=`left`; return its width."""
    palette = M['goods_palette']
    color = rng.choice(palette)
    kind = rng.choices(('bottle', 'can', 'box', 'crisps', 'bars'), weights=(3, 3, 4, 2, 2))[0]
    if kind == 'bottle' and max_h >= 0.16:
        width = 0.075
        x = left + width / 2
        h = min(rng.uniform(0.16, 0.24), max_h)
        glass = rng.choice((M['bottle_green'], M['bottle_brown'], palette[4]))
        merge.cylinder(0.034, h * 0.7, (x, y, base + h * 0.35), glass, segments=10)
        merge.cylinder(0.034, h * 0.12, (x, y, base + h * 0.76), glass, top=0.014, segments=10)
        merge.cylinder(0.013, h * 0.18, (x, y, base + h * 0.91), glass, segments=8)
        merge.cylinder(0.0355, h * 0.25, (x, y, base + h * 0.4), color, segments=10)
        return width
    if kind == 'can' and max_h >= 0.12:
        width = 0.07
        x = left + width / 2
        h = 0.165 if max_h >= 0.17 and rng.random() < 0.5 else 0.12
        merge.cylinder(0.033, h, (x, y, base + h / 2), color, segments=12)
        merge.cylinder(0.03, 0.006, (x, y, base + h + 0.003), palette[8], segments=12)
        return width
    if kind == 'crisps' and max_h >= 0.2:
        width = 0.14
        merge.box((0.13, 0.045, 0.2), (left + width / 2, y, base + 0.1), color,
                  rot=(0.08, 0.0, rng.uniform(-0.1, 0.1)))
        return width
    if kind == 'bars':
        width = 0.13
        for k in range(rng.randint(3, 6)):
            merge.box((0.12, 0.035, 0.014), (left + width / 2, y + rng.uniform(-0.005, 0.005), base + 0.007 + k * 0.0145),
                      color if k % 2 else rng.choice(palette), rot=(0.0, 0.0, rng.uniform(-0.08, 0.08)))
        return width
    w = rng.uniform(0.06, 0.12)
    h = min(rng.uniform(0.09, 0.2), max_h)
    merge.box((w, rng.uniform(0.05, 0.08), h), (left + w / 2, y, base + h / 2), color)
    return w + 0.008


def _fill_row(merge, rng, y, base, max_h, M, skip=()):
    cursor = X_MIN
    while cursor < X_MAX - WIDEST_ITEM:
        blocked = [span for span in skip if cursor < span[1] and cursor + WIDEST_ITEM > span[0]]
        if blocked:
            cursor = blocked[0][1] + 0.01
            continue
        cursor += _item(merge, rng, cursor, y, base, max_h, M) + rng.uniform(0.0, 0.02)


def build(M):
    rng = random.Random(42)
    shelves = Merge('shelves')
    goods = Merge('goods_fill')
    tags = Merge('price_tags')
    inner_w = W - 0.24
    for index, level in enumerate(SHELF_LEVELS):
        shelves.box((inner_w, SHELF_DEPTH, SHELF_THICK), (0.0, SHELF_Y, level), M['wood'])
        base = level + SHELF_THICK / 2
        if index + 1 < len(SHELF_LEVELS):
            ceiling = SHELF_LEVELS[index + 1] - SHELF_THICK / 2 - 0.01
        else:
            ceiling = base + 0.09   # the top shelf stays low: crisps hang above it
        max_h = min(0.26, ceiling - base)
        skip = [(x - 0.13, x + 0.13) for x in SLOT_XS] if level == SLOT_LEVEL else ()
        _fill_row(goods, rng, SHELF_Y + 0.07, base, max_h, M)
        _fill_row(goods, rng, SHELF_Y - 0.07, base, max_h, M, skip)
        x = X_MIN + 0.05
        while x < X_MAX:
            tags.box((0.055, 0.004, 0.032), (x, SHELF_Y - SHELF_DEPTH / 2 - 0.006, level + 0.005),
                     rng.choice((M['paper'], M['goods_palette'][1])), rot=(0.0, rng.uniform(-0.1, 0.1), 0.0))
            x += rng.uniform(0.16, 0.3)
    for x in (X_MIN - 0.04, X_MAX + 0.04):
        shelves.box((0.03, SHELF_DEPTH, GLASS_HIGH - GLASS_LOW), (x, SHELF_Y, (GLASS_LOW + GLASS_HIGH) / 2), M['wood'])

    rail_z = GLASS_HIGH - 0.05
    rail_y = SHELF_Y - 0.1
    shelves.bar((X_MIN, rail_y, rail_z), (X_MAX, rail_y, rail_z), 0.012, M['frame'])
    x = X_MIN + 0.1
    while x < X_MAX - 0.1:
        goods.box((0.12, 0.03, 0.14), (x, rail_y, rail_z - 0.08), rng.choice(M['goods_palette']),
                  rot=(0.0, rng.uniform(-0.08, 0.08), 0.0))
        x += rng.uniform(0.15, 0.22)

    shelves.finish()
    goods.finish()
    tags.finish()

    for index, x in enumerate(SLOT_XS):
        slot = box(f'slot_{index}', SLOT_SIZE,
                   (x, SHELF_Y - 0.07, SLOT_LEVEL + SHELF_THICK / 2 + SLOT_SIZE[2] / 2), M['goods'])
        box(f'slot_{index}_tag', (0.1, 0.004, 0.05), (0.0, -0.085, -0.17), M['paper'], parent=slot)
