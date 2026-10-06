"""Inside the kiosk: the seller's counter, chair with a sweater, ribbed
heater, stock shelves and boxes, crates, wall clock, calendar, poster, a
jacket on a hook, hanging bulbs, and the TV and radio hotspots."""

import math
import random

from dims import DOOR_L, HD, HW, PLINTH, TOP, W
from lib import Merge, box, cylinder

COUNTER_Y = -0.42
COUNTER_TOP = PLINTH + 0.9


def build(M):
    rng = random.Random(5)
    room = Merge('interior')

    room.box((W - 0.3, 0.3, 0.88), (0.0, COUNTER_Y, PLINTH + 0.44), M['wood'])
    room.box((W - 0.26, 0.34, 0.03), (0.0, COUNTER_Y, COUNTER_TOP - 0.005), M['paint_dark'])

    # chair with a sweater thrown over the back
    cx, cy = 0.25, 0.2
    room.box((0.42, 0.42, 0.05), (cx, cy, 0.55), M['wood'])
    room.box((0.42, 0.05, 0.48), (cx, cy + 0.2, 0.82), M['wood'])
    for dx in (-0.18, 0.18):
        for dy in (-0.18, 0.18):
            room.box((0.035, 0.035, 0.42), (cx + dx, cy + dy, PLINTH + 0.21), M['frame'])
    room.blob((0.46, 0.16, 0.34), (cx, cy + 0.2, 0.92), M['fabric'])

    # oil heater with fins
    for k in range(8):
        room.box((0.05, 0.18, 0.5), (-1.15 + k * 0.065, 0.45, PLINTH + 0.3), M['plastic_light'])
    room.box((0.55, 0.12, 0.03), (-0.92, 0.45, PLINTH + 0.04), M['frame'])

    # stock shelves on the back wall, left of the door
    left, right = -HW + 0.08, DOOR_L - 0.08
    for level in (0.6, 1.1, 1.6, 2.0):
        room.box((right - left, 0.26, 0.025), ((left + right) / 2, HD - 0.18, level), M['wood'])
        x = left + 0.03
        while x < right - 0.12:
            w, h = rng.uniform(0.14, 0.3), rng.uniform(0.12, 0.3)
            room.box((w, 0.22, h), (x + w / 2, HD - 0.18, level + 0.0125 + h / 2),
                     M['cardboard'] if rng.random() < 0.7 else rng.choice(M['goods_palette']))
            x += w + 0.02
    for x in (left, right):
        room.box((0.03, 0.26, 2.0 - PLINTH), (x, HD - 0.18, (PLINTH + 2.0) / 2), M['wood'])

    # boxes on the floor and beer crates by the door
    for k, (w, h) in enumerate(((0.5, 0.35), (0.42, 0.3), (0.34, 0.26))):
        room.box((w, 0.4, h), (-1.12, 0.05, PLINTH + h / 2 + sum((0.35, 0.3, 0.26)[:k])), M['cardboard'])
    for k in range(3):
        room.box((0.4, 0.3, 0.28), (1.2, 0.55, PLINTH + 0.14 + k * 0.29), rng.choice((M['goods_palette'][0], M['goods_palette'][3])))

    # walls: clock, calendar, poster, jacket
    room.cylinder(0.12, 0.03, (-HW + 0.08, -0.02, 2.1), M['paper'], segments=20, rot=(0.0, math.pi / 2, 0.0))
    room.box((0.01, 0.42, 0.56), (HW - 0.08, -0.15, 1.7), M['paper'])
    room.box((0.012, 0.42, 0.12), (HW - 0.081, -0.15, 1.92), M['away'])
    room.box((0.01, 0.4, 0.55), (-HW + 0.08, -0.35, 1.75), rng.choice(M['posters']))
    room.box((0.04, 0.04, 0.04), (HW - 0.1, 0.42, 1.95), M['frame'])
    room.blob((0.14, 0.36, 0.7), (HW - 0.16, 0.42, 1.55), M['fabric_dark'])

    # on the counter: kettle, mug, calculator, notebook, cash box
    room.cylinder(0.09, 0.22, (-0.4, COUNTER_Y, COUNTER_TOP + 0.11), M['plastic_light'])
    room.cylinder(0.045, 0.09, (-0.25, COUNTER_Y + 0.05, COUNTER_TOP + 0.045), M['goods_palette'][0])
    room.box((0.1, 0.16, 0.025), (0.45, COUNTER_Y, COUNTER_TOP + 0.0125), M['device'])
    room.box((0.22, 0.3, 0.02), (0.15, COUNTER_Y + 0.02, COUNTER_TOP + 0.01), M['goods_palette'][2])
    room.box((0.3, 0.22, 0.1), (-0.85, COUNTER_Y, COUNTER_TOP + 0.05), M['device'])

    # bulbs hanging on wires
    for index, (x, y) in enumerate(((-0.75, -0.2), (0.0, 0.1), (0.75, -0.2))):
        room.bar((x, y, TOP), (x, y, TOP - 0.25), 0.008, M['ink'])
        cylinder(f'bulb_{index}', 0.035, 0.08, (x, y, TOP - 0.29), M['bulb'])
    room.finish()

    # hotspots with their details as children
    tv = box('hs_tv', (0.36, 0.42, 0.34), (-1.22, 0.3, 1.74), M['device'])
    tv_parts = Merge('tv_details')
    tv_parts.box((0.02, 0.32, 0.24), (0.19, 0.0, 0.0), M['screen'])
    tv_parts.box((0.4, 0.6, 0.03), (0.0, 0.0, -0.185), M['wood'])                  # wall shelf
    tv_parts.bar((0.0, 0.0, 0.17), (-0.06, -0.18, 0.45), 0.008, M['frame'])         # rabbit ears
    tv_parts.bar((0.0, 0.0, 0.17), (-0.06, 0.18, 0.45), 0.008, M['frame'])
    tv_parts.finish(parent=tv)

    radio = box('hs_radio', (0.36, 0.14, 0.2), (0.9, COUNTER_Y, COUNTER_TOP + 0.1), M['device'])
    radio_parts = Merge('radio_details')
    for dx in (-0.1, 0.1):
        radio_parts.cylinder(0.055, 0.01, (dx, 0.072, -0.01), M['ink'], segments=16, rot=(math.pi / 2, 0.0, 0.0))
    radio_parts.box((0.08, 0.01, 0.03), (0.0, 0.072, 0.07), M['screen'])
    radio_parts.bar((0.14, 0.0, 0.1), (0.05, 0.0, 0.45), 0.006, M['frame'])         # antenna
    radio_parts.finish(parent=radio)
