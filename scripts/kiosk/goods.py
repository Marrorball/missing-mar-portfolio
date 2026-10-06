"""Goods behind the showcase glass, a 2000s kiosk range: juice and instant
noodles at the bottom, gum, chocolate and a lollipop stand at eye level
between the eight project slots, beer, lemonade, pop and cans above, and
crisps, croutons and sunflower seeds hanging from the rail."""

import random
import props

from dims import GLASS_HIGH, GLASS_LOW, HW, SHELF_LEVELS, SHELF_Y, SLOT_LEVEL, SLOT_XS, W
from lib import Merge, box

SHELF_DEPTH = 0.3
COUNTER_TOP_BELOW = 1.02   # the seller's counter top; shelves under it keep their back row clear
SHELF_THICK = 0.03
X_MIN, X_MAX = -HW + 0.12, HW - 0.12
SLOT_SIZE = (0.2, 0.13, 0.28)
WIDEST_ITEM = 0.15


# Each kind: (width, height, builder). The kiosk's 2000s range.
def _kinds(M):
    return {
        'beer': (.078, .23, lambda b, x, y, z: props.bottle(b, (x, y, z), .23, M, cell=9, glass=M['bottle_brown'])),
        'lemonade': (.078, .23, lambda b, x, y, z: props.bottle(b, (x, y, z), .23, M, cell=8)),
        'pop': (.092, .25, lambda b, x, y, z: props.pet(b, (x, y, z), .25, 8, M)),
        'can': (.072, .12, lambda b, x, y, z: props.can(b, (x, y, z), .12, 13, M)),
        'juice': (.082, .2, lambda b, x, y, z: props.carton(b, (x, y, z), 10, M)),
        'noodles': (.1, .105, lambda b, x, y, z: props.noodle_cup(b, (x, y, z), 15, M)),
        'coffee': (.1, .16, lambda b, x, y, z: props.jar(b, (x, y, z), M, height=.16)),
        'chips': (.14, .2, lambda b, x, y, z: props.pack(b, (x, y, z), cell=(x * 100) // 1 % 2)),
        'croutons': (.11, .15, lambda b, x, y, z: props.pack(b, (x, y, z), width=.1, height=.15, depth=.04, cell=11)),
        'seeds': (.11, .15, lambda b, x, y, z: props.pack(b, (x, y, z), width=.1, height=.15, depth=.04, cell=12)),
        'gum': (.12, .09, lambda b, x, y, z: props.gum_box(b, (x, y, z), 14, M)),
        'choc': (.16, .09, lambda b, x, y, z: props.choc_display(b, (x, y, z), 7, M)),
        'snickers': (.16, .09, lambda b, x, y, z: props.choc_display(b, (x, y, z), 2, M, count=3)),
        'lolly': (.2, .26, lambda b, x, y, z: props.lollipops(b, (x, y, z), M)),
    }


def _fill_row(merge, rng, y, base, max_h, kinds, mix, skip=(), once=()):
    """Stand goods of the shelf's mix along a row, left to right."""
    cursor = X_MIN
    used = set()
    names = [name for name, weight in mix]
    weights = [weight for name, weight in mix]
    while cursor < X_MAX - WIDEST_ITEM:
        blocked = [span for span in skip if cursor < span[1] and cursor + WIDEST_ITEM > span[0]]
        if blocked:
            cursor = blocked[0][1] + 0.01
            continue
        name = rng.choices(names, weights)[0]
        width, height, build = kinds[name]
        if height > max_h or (name in once and name in used) or cursor + width > X_MAX:
            fallback = [n for n in names if kinds[n][1] <= max_h and n not in once]
            if not fallback:
                break
            name = rng.choice(fallback)
            width, height, build = kinds[name]
        used.add(name)
        build(merge, cursor + width / 2, y, base)
        cursor += width + rng.uniform(0.004, 0.018)


# What each showcase shelf carries, bottom to top: (back row, front row).
SHELF_MIX = (
    (None, [('juice', 3), ('noodles', 3), ('coffee', 1)]),                     # under the counter top
    ([('lolly', 1), ('gum', 3), ('choc', 3), ('snickers', 3), ('chips', 2)],     # eye level, projects in front
     [('gum', 2), ('choc', 2), ('snickers', 2)]),
    ([('pop', 3), ('lemonade', 2), ('beer', 2)], [('beer', 3), ('lemonade', 3), ('can', 4)]),
    ([('gum', 2), ('choc', 2), ('snickers', 2)], [('gum', 2), ('choc', 2), ('snickers', 2)]),
)


def build(M):
    rng = random.Random(42)
    kinds = _kinds(M)
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
        back, front = SHELF_MIX[index]
        # the counter (top at 1.02 m, reaching y -0.77) covers the back of the
        # lowest shelf: nothing stands there, or it would grow out of the counter
        if back and level >= COUNTER_TOP_BELOW:
            _fill_row(goods, rng, SHELF_Y + 0.07, base, max_h, kinds, back, once=('lolly',))
        _fill_row(goods, rng, SHELF_Y - 0.07, base, max_h, kinds, front, skip)
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
        # crisps, croutons and seeds hang on the rail by their crimped tops
        cell = rng.choice((0, 1, 11, 12))
        size = (.12, .14) if cell < 2 else (.1, .12)
        props.pack(goods, (x, rail_y, rail_z - .02 - size[1]), width=size[0], height=size[1], depth=.036, cell=cell)
        x += size[0] + rng.uniform(0.03, 0.08)

    shelves.finish()
    goods.finish()
    tags.finish()

    for index, x in enumerate(SLOT_XS):
        slot = box(f'slot_{index}', SLOT_SIZE,
                   (x, SHELF_Y - 0.07, SLOT_LEVEL + SHELF_THICK / 2 + SLOT_SIZE[2] / 2), M['goods'])
        box(f'slot_{index}_tag', (0.1, 0.004, 0.05), (0.0, -0.085, -0.17), M['paper'], parent=slot)
