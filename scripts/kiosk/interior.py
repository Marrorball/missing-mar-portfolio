"""Inside the kiosk: the seller's counter, chair with a sweater, ribbed
heater, stock shelves and boxes, crates, wall clock, calendar, poster, a
jacket on a hook, hanging bulbs, the TV on a DVD player, the DVD rack with
32 discs, and the radio."""

import math
import random

from dims import (CHAIR, DOOR_L, HD, HW, PLINTH, RACK, RACK_FACES, RACK_POCKETS, RACK_ROW_STEP,
                  RACK_TOP_ROW, TOP, TV, W)
from lib import Merge, box, cylinder, empty, screen, text, material

COUNTER_Y = -0.60
COUNTER_TOP = PLINTH + 0.9


def _room(M, rng):
    room = Merge('interior')

    room.box((W - 0.3, 0.3, 0.88), (0.0, COUNTER_Y, PLINTH + 0.44), M['wood'])
    room.box((W - 0.26, 0.34, 0.03), (0.0, COUNTER_Y, COUNTER_TOP - 0.005), M['paint_dark'])

    cx, cy = CHAIR
    room.box((0.42, 0.42, 0.05), (cx, cy, 0.55), M['wood'])
    room.box((0.42, 0.05, 0.48), (cx, cy + 0.2, 0.82), M['wood'])
    for dx in (-0.18, 0.18):
        for dy in (-0.18, 0.18):
            room.box((0.035, 0.035, 0.42), (cx + dx, cy + dy, PLINTH + 0.21), M['frame'])
    room.blob((0.46, 0.16, 0.34), (cx, cy + 0.2, 0.92), M['fabric'])

    for k in range(8):
        room.box((0.05, 0.18, 0.5), (-1.15 + k * 0.065, 0.45, PLINTH + 0.3), M['plastic_light'])
    room.box((0.55, 0.12, 0.03), (-0.92, 0.45, PLINTH + 0.04), M['frame'])

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

    for k, (w, h) in enumerate(((0.5, 0.35), (0.42, 0.3), (0.34, 0.26))):
        room.box((w, 0.3, h), (-1.12, 0.73, PLINTH + h / 2 + sum((0.35, 0.3, 0.26)[:k])), M['cardboard'])
    for k in range(3):
        room.box((0.4, 0.3, 0.28), (-0.15, 0.73, PLINTH + 0.14 + k * 0.29),
                 rng.choice((M['goods_palette'][0], M['goods_palette'][3])))

    room.cylinder(0.12, 0.03, (-HW + 0.08, -0.02, 2.1), M['paper'], segments=20, rot=(0.0, math.pi / 2, 0.0))
    room.box((0.01, 0.42, 0.56), (HW - 0.08, -0.15, 1.7), M['paper'])
    room.box((0.012, 0.42, 0.12), (HW - 0.081, -0.15, 1.92), M['away'])
    room.box((0.01, 0.4, 0.55), (-HW + 0.08, -0.35, 1.75), rng.choice(M['posters']))
    room.box((0.04, 0.04, 0.04), (HW - 0.1, 0.42, 1.95), M['frame'])
    room.blob((0.14, 0.36, 0.7), (HW - 0.16, 0.42, 1.55), M['fabric_dark'])

    room.cylinder(0.09, 0.22, (-0.4, COUNTER_Y, COUNTER_TOP + 0.11), M['plastic_light'])
    room.cylinder(0.045, 0.09, (-0.25, COUNTER_Y + 0.05, COUNTER_TOP + 0.045), M['goods_palette'][0])
    room.box((0.1, 0.16, 0.025), (0.45, COUNTER_Y, COUNTER_TOP + 0.0125), M['device'])
    room.box((0.22, 0.3, 0.02), (0.15, COUNTER_Y + 0.02, COUNTER_TOP + 0.01), M['goods_palette'][2])
    room.box((0.3, 0.22, 0.1), (-0.85, COUNTER_Y, COUNTER_TOP + 0.05), M['device'])

    for index, (x, y) in enumerate(((-0.75, -0.2), (0.0, 0.1), (0.75, -0.2))):
        room.bar((x, y, TOP), (x, y, TOP - 0.25), 0.008, M['ink'])
        cylinder(f'bulb_{index}', 0.035, 0.08, (x, y, TOP - 0.29), M['bulb'])
    room.finish()


def _tv(M):
    tx, ty, tz = TV
    tv = box('hs_tv', (0.36, 0.42, 0.34), (tx, ty, tz), M['device'])
    box('tv_screen', (0.02, 0.32, 0.24), (0.19, 0.0, 0.01), M['screen'], parent=tv)
    parts = Merge('tv_details')
    parts.box((0.42, 0.62, 0.03), (0.0, 0.0, -0.25), M['wood'])                    # wall shelf
    parts.bar((0.0, 0.0, 0.17), (-0.06, -0.18, 0.45), 0.008, M['frame'])           # rabbit ears
    parts.bar((0.0, 0.0, 0.17), (-0.06, 0.18, 0.45), 0.008, M['frame'])
    parts.finish(parent=tv)
    player = box('dvd_player', (0.34, 0.32, 0.055), (tx, ty, tz - 0.205), M['device'])
    tray = Merge('dvd_player_details')
    tray.box((0.005, 0.2, 0.012), (0.171, -0.02, 0.0), M['ink'])                    # disc tray
    tray.box((0.005, 0.03, 0.01), (0.171, 0.12, 0.0), M['screen'])                  # display
    tray.finish(parent=player)
    screen('screen_tv', (tx + 0.202, ty, tz + 0.01), 0.32, 0.24, rot_z=math.pi / 2)


def _rack(M):
    rack = empty('dvd_rack', (RACK[0], RACK[1], 0.0))
    frame = Merge('hs_rack')
    frame.cylinder(0.02, 1.62, (0.0, 0.0, 0.86), M['frame'], segments=10)
    frame.box((0.5, 0.05, 0.04), (0.0, 0.0, 0.07), M['frame'])
    frame.box((0.05, 0.5, 0.04), (0.0, 0.0, 0.07), M['frame'])
    frame.box((0.3, 0.3, 0.03), (0.0, 0.0, 1.68), M['frame'])
    for face in range(RACK_FACES):
        angle = math.pi + face * math.pi / 2
        out = (-math.sin(angle), math.cos(angle))
        side = (math.cos(angle), math.sin(angle))
        for z in (1.55, 0.5):
            frame.bar((0.0, 0.0, z), (out[0] * 0.18, out[1] * 0.18, z), 0.01, M['frame'])
        for row in range(RACK_POCKETS // 2):
            z = RACK_TOP_ROW - row * RACK_ROW_STEP
            frame.bar((out[0] * 0.2 - side[0] * 0.16, out[1] * 0.2 - side[1] * 0.16, z - 0.09),
                      (out[0] * 0.2 + side[0] * 0.16, out[1] * 0.2 + side[1] * 0.16, z - 0.09), 0.008, M['frame'])
            for col in range(2):
                lateral = (col - 0.5) * 0.15
                index = face * RACK_POCKETS + row * 2 + col
                box(f'disc_{index}', (0.135, 0.014, 0.19),
                    (out[0] * 0.18 + side[0] * lateral, out[1] * 0.18 + side[1] * lateral, z),
                    M['goods'], parent=rack, rot_z=angle)
    frame.finish(parent=rack)
    box('rack_header', (0.56, 0.025, 0.16), (0, -0.23, 1.72), M['paper'], parent=rack)
    text('rack_header_text', 'ДИСКИ', (0, -0.246, 1.72), 0.075, M['ink'], parent=rack)
    cylinder('bulb_rack', 0.022, 0.055, (RACK[0], RACK[1] - 0.30, 1.91), M['bulb'])


def _cat(M):
    # A warm quilt beside the heater, clear of the chair and back entrance.
    x, y = -0.82, 0.03
    bed = Merge('cat_bed')
    bed.blob((0.69, 0.48, 0.095), (0, 0, 0), M['fabric'])
    for dx in (-0.22, 0, 0.22):
        bed.bar((dx, -0.18, 0.015), (dx, 0.18, 0.015), 0.012, M['paper'])
    bed.finish((x, y, PLINTH + 0.045))
    ginger = material('cat_ginger', (0.78, 0.31, 0.075))
    cream = material('cat_cream', (0.94, 0.77, 0.49))
    stripe = material('cat_stripes', (0.40, 0.15, 0.04))
    pink = material('cat_nose', (0.57, 0.25, 0.20))
    cat = Merge('hs_cat')
    cat.blob((0.50, 0.35, 0.24), (0.01, 0.025, 0.06), ginger)
    cat.blob((0.22, 0.20, 0.19), (-0.16, -0.105, 0.035), ginger)
    cat.blob((0.15, 0.075, 0.08), (-0.16, -0.187, 0.003), cream)
    for dx in (-0.065, 0.065):
        cat.cylinder(0.057, 0.105, (-0.16 + dx, -0.075, 0.14), ginger, top=0, segments=3)
        cat.bar((-0.16 + dx - 0.025, -0.194, 0.041), (-0.16 + dx + 0.016, -0.197, 0.029), 0.009, stripe)
    cat.blob((0.032, 0.022, 0.025), (-0.16, -0.222, 0.007), pink)
    # Thick tail wraps around the outside of the curled body, tip by the paws.
    for index in range(20):
        angle = 0.2 + index * 4.5 / 19
        cat.blob((0.092, 0.085, 0.09), (0.245 * math.cos(angle), 0.16 * math.sin(angle), 0.017),
                 stripe if index in (3, 7, 11, 15) else ginger)
    cat.blob((0.12, 0.075, 0.065), (-0.04, -0.17, -0.006), cream)
    for dx in (-0.04, 0.065, 0.16):
        cat.bar((dx, -0.04, 0.169), (dx + 0.02, 0.06, 0.169), 0.016, stripe)
    cat.finish((x, y, PLINTH + 0.12), rot_z=math.pi)


def build(M):
    rng = random.Random(5)
    _room(M, rng)
    _tv(M)
    _rack(M)
    _cat(M)

    radio = box('hs_radio', (0.36, 0.14, 0.2), (0.9, COUNTER_Y, COUNTER_TOP + 0.1), M['device'])
    radio_parts = Merge('radio_details')
    for dx in (-0.1, 0.1):
        radio_parts.cylinder(0.055, 0.01, (dx, 0.072, -0.01), M['ink'], segments=16, rot=(math.pi / 2, 0.0, 0.0))
    radio_parts.box((0.08, 0.01, 0.03), (0.0, 0.072, 0.07), M['screen'])
    radio_parts.bar((0.14, 0.0, 0.1), (0.05, 0.0, 0.45), 0.006, M['frame'])
    radio_parts.finish(parent=radio)
