"""Inside the kiosk: the seller's counter, chair with a plaid blanket, ribbed
heater, stock shelves and boxes, crates, wall clock, calendar, poster, a
jacket on a hook, fluorescent tubes on the ceiling, the TV on a DVD player, a can of cola and
the radio. The DVD rack stands on the street (rack.py)."""

import math
import random

import cat
import props

from can import build_can
from dims import CHAIR, DOOR_L, HD, HW, PLINTH, TOP, TV, W
from lib import Merge, box, material, screen

COUNTER_Y = -0.60
COUNTER_TOP = PLINTH + 0.9
COUNTER_SURFACE = COUNTER_TOP + 0.01
TUBES, TUBE_Y = (-0.72, 0.62), -0.1     # fluorescent fittings along the ceiling


def _room(M, rng):
    room = Merge('interior')

    room.box((W - 0.3, 0.3, 0.88), (0.0, COUNTER_Y, PLINTH + 0.44), M['wood'])
    room.box((W - 0.26, 0.34, 0.03), (0.0, COUNTER_Y, COUNTER_TOP - 0.005), M['paint_dark'])

    for k in range(8):
        room.box((0.05, 0.18, 0.5), (-1.15 + k * 0.065, 0.45, PLINTH + 0.3), M['plastic_light'])
    room.box((0.55, 0.12, 0.03), (-0.92, 0.45, PLINTH + 0.04), M['frame'])

    left, right = -HW + 0.08, DOOR_L - 0.08
    for level in (0.6, 1.1, 1.6, 2.0):
        room.box((right - left, 0.26, 0.025), ((left + right) / 2, HD - 0.18, level), M['wood'])
    for x in (left, right):
        room.box((0.03, 0.26, 2.0 - PLINTH), (x, HD - 0.18, (PLINTH + 2.0) / 2), M['wood'])

    for k, (w, h) in enumerate(((0.5, 0.22), (0.42, 0.21))):
        room.box((w, 0.3, h), (-1.12, 0.73, PLINTH + h / 2 + sum((0.22, 0.21)[:k])), M['cardboard'])
    room.cylinder(0.12, 0.03, (-HW + 0.08, -0.02, 2.1), M['paper'], segments=20, rot=(0.0, math.pi / 2, 0.0))
    room.box((0.01, 0.4, 0.55), (-HW + 0.08, -0.35, 1.75), rng.choice(M['posters']))

    room.finish()
    props.chair(M, CHAIR)
    props.counter(M, COUNTER_Y, COUNTER_SURFACE)
    props.stock(M)
    props.cartons(M)
    props.wall_details(M, HW)
    props.hanging_jacket(M, HW)


def _tubes(M):
    """Two ceiling fittings of the old-block kind, two bare fluorescent tubes
    each. The site hangs a light on every tube_* (assets/js/kiosk/atmosphere.js)."""
    glow = material('tube', (0.97, 0.98, 0.94), emission=1.8)
    for index, x in enumerate(TUBES):
        fitting = Merge(f'tube_fitting_{index}')
        fitting.box((1.26, 0.2, 0.04), (x, TUBE_Y, TOP - 0.02), M['plastic_light'])
        for side in (-0.6, 0.6):
            fitting.box((0.035, 0.17, 0.05), (x + side, TUBE_Y, TOP - 0.055), M['plastic_light'])
        fitting.finish()
        tubes = Merge(f'tube_{index}')
        for dy in (-0.05, 0.05):
            tubes.cylinder(0.013, 1.16, (0.0, dy, 0.0), glow, segments=10, rot=(0.0, math.pi / 2, 0.0))
        tubes.finish((x, TUBE_Y, TOP - 0.065))


def _tv(M):
    tx, ty, tz = TV
    tv = box('hs_tv', (0.36, 0.42, 0.34), (tx, ty, tz), M['tv_plastic'])
    props.soften(tv, .018)
    box('tv_screen', (0.02, 0.32, 0.24), (0.19, 0.0, 0.01), M['screen'], parent=tv)
    parts = Merge('tv_details')
    parts.box((0.42, 0.62, 0.03), (0.0, 0.0, -0.25), M['wood'])                    # wall shelf
    parts.bar((0.0, 0.0, 0.17), (-0.06, -0.18, 0.45), 0.008, M['frame'])           # rabbit ears
    parts.bar((0.0, 0.0, 0.17), (-0.06, 0.18, 0.45), 0.008, M['frame'])
    parts.finish(parent=tv)
    player = box('dvd_player', (0.34, 0.32, 0.055), (tx, ty, tz - 0.205), M['tv_plastic'])
    tray = Merge('dvd_player_details')
    tray.box((0.005, 0.2, 0.012), (0.171, -0.02, 0.0), M['ink'])                    # disc tray
    tray.box((0.005, 0.03, 0.01), (0.171, 0.12, 0.0), M['screen'])                  # display
    tray.finish(parent=player)
    screen('screen_tv', (tx + 0.202, ty, tz + 0.01), 0.32, 0.24, rot_z=math.pi / 2)


def build(M):
    rng = random.Random(5)
    _room(M, rng)
    _tubes(M)
    _tv(M)
    cat.build(M)
    build_can('cola_can_counter', (0.62, COUNTER_Y + 0.05, COUNTER_TOP + 0.01), math.pi - 0.5, M)  # label to the seller

    radio = box('hs_radio', (0.36, 0.14, 0.2), (0.9, COUNTER_Y, COUNTER_TOP + 0.1), M['device'])
    props.soften(radio, .012)
    props.radio_details(M, radio)
    radio_parts = Merge('radio_details')
    for dx in (-0.1, 0.1):
        radio_parts.cylinder(0.055, 0.01, (dx, 0.072, -0.01), M['ink'], segments=16, rot=(math.pi / 2, 0.0, 0.0))
    radio_parts.box((0.08, 0.01, 0.03), (0.0, 0.072, 0.07), M['screen'])
    radio_parts.bar((0.14, 0.0, 0.1), (0.05, 0.0, 0.45), 0.006, M['frame'])
    radio_parts.finish(parent=radio)
