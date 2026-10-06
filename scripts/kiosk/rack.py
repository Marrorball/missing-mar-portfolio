"""The street DVD spinner beside the kiosk: a weighted round base and pole,
a square sheet-metal core, a pocket tray with a wire lip under every row of
cases, and a lit four-sided «ВСЕ ПРОЕКТЫ» header with a bulb on top. Discs
keep their places (disc_0..31) so the site's rack layout is unchanged.

Everything hangs off `dvd_rack`, which the site spins a quarter turn per
face; the base, header and lettering sit under `hs_rack` so a click anywhere
on the stand picks the rack.
"""

import math

from dims import RACK, RACK_FACES, RACK_POCKETS, RACK_ROW_STEP, RACK_TOP_ROW
from lib import Merge, box, empty, material, snow_cap, text

CORE = 0.125           # half-width of the square sheet core
DISC_OUT = 0.18        # disc cases stand in front of the core
TRAY = (0.15, 0.205)   # tray from/to, measured from the axis
TRAY_HALF = 0.145      # < TRAY[0], so trays of neighbouring faces never touch
DISC_SIZE = (0.135, 0.014, 0.19)
LOWEST = RACK_TOP_ROW - (RACK_POCKETS // 2 - 1) * RACK_ROW_STEP
CORE_LOW, CORE_HIGH = LOWEST - 0.13, RACK_TOP_ROW + 0.13
HEADER = (0.42, 0.15)  # side, height


def _faces():
    for face in range(RACK_FACES):
        angle = math.pi + face * math.pi / 2
        out = (-math.sin(angle), math.cos(angle))
        side = (math.cos(angle), math.sin(angle))

        def at(radial, lateral, z, out=out, side=side):
            return (out[0] * radial + side[0] * lateral, out[1] * radial + side[1] * lateral, z)

        yield face, angle, out, at


def build(M):
    sheet = material('rack_sheet', (0.74, 0.74, 0.70), roughness=0.6)
    wire = material('rack_wire', (0.55, 0.56, 0.58), roughness=0.35, metallic=0.85)
    lightbox = material('rack_lightbox', (0.96, 0.90, 0.74), emission=0.45)
    rack = empty('dvd_rack', (RACK[0], RACK[1], 0.0))

    stand = Merge('hs_rack')
    stand.cylinder(0.03, CORE_LOW - 0.08, (0.0, 0.0, (CORE_LOW + 0.08) / 2), M['frame'], segments=12)
    stand.box((0.3, 0.3, 0.02), (0.0, 0.0, CORE_LOW - 0.01), M['frame'])
    stand.box((0.3, 0.3, 0.03), (0.0, 0.0, CORE_HIGH + 0.015), M['frame'])
    for face, angle, out, at in _faces():
        stand.box((2 * CORE + 0.008, 0.008, CORE_HIGH - CORE_LOW), at(CORE, 0.0, (CORE_LOW + CORE_HIGH) / 2),
                  sheet, rot=(0.0, 0.0, angle))
        for lateral in (-TRAY_HALF, TRAY_HALF):
            stand.bar(at(TRAY[1], lateral, CORE_LOW), at(TRAY[1], lateral, CORE_HIGH), 0.006, wire)
        for row in range(RACK_POCKETS // 2):
            z = RACK_TOP_ROW - row * RACK_ROW_STEP
            floor = z - DISC_SIZE[2] / 2 - 0.006
            stand.box((2 * TRAY_HALF, TRAY[1] - TRAY[0], 0.012), at(sum(TRAY) / 2, 0.0, floor), sheet,
                      rot=(0.0, 0.0, angle))
            stand.bar(at(TRAY[1], -TRAY_HALF, z - 0.05), at(TRAY[1], TRAY_HALF, z - 0.05), 0.006, wire)
            for col in range(2):
                lateral = (col - 0.5) * 0.15
                index = face * RACK_POCKETS + row * 2 + col
                box(f'disc_{index}', DISC_SIZE, at(DISC_OUT, lateral, z), M['goods'], parent=rack, rot_z=angle)
    stand = stand.finish(parent=rack)

    base = Merge('rack_base')
    base.cylinder(0.27, 0.035, (0.0, 0.0, 0.0175), M['frame'], segments=28)
    base.cylinder(0.07, 0.05, (0.0, 0.0, 0.06), M['frame'], segments=16)
    base.blob((0.5, 0.5, 0.03), (0.0, 0.0, 0.036), M['snow'], 16, 8, True)
    base.finish(parent=stand)

    side, height = HEADER
    header_z = CORE_HIGH + 0.03 + height / 2 + 0.04
    header = Merge('rack_header')
    header.bar((0.0, 0.0, CORE_HIGH + 0.03), (0.0, 0.0, header_z - height / 2), 0.03, M['frame'])
    header.box((side, side, height), (0.0, 0.0, header_z), lightbox)
    header.box((side + 0.02, side + 0.02, 0.02), (0.0, 0.0, header_z + height / 2 + 0.01), M['frame'])
    header.box((side + 0.02, side + 0.02, 0.02), (0.0, 0.0, header_z - height / 2 - 0.01), M['frame'])
    header.cylinder(0.03, 0.06, (0.0, 0.0, header_z + height / 2 + 0.05), M['frame'], segments=12)   # socket above the snow
    header.finish(parent=stand)
    snow_cap('rack_snow', (side + 0.02, side + 0.02), 0.025, header_z + height / 2 + 0.02, M['snow'],
             parent=stand, overhang=0.012, lumps=3, seed=4, grid=0.02)
    for face, angle, out, at in _faces():
        # text faces -Y unturned; face 0 looks down -Y, the others follow round
        text(f'rack_header_text_{face}', 'ВСЕ ПРОЕКТЫ', at(side / 2 + 0.004, 0.0, header_z), 0.038,
             M['ink'], parent=stand, rot_z=angle + math.pi, curve_resolution=4)
    # on the axis, so the light the site puts here stays put while the rack turns
    bulb = Merge('bulb_rack')
    bulb.blob((0.06, 0.06, 0.075), (0.0, 0.0, 0.0), M['bulb'], 14, 8, True)
    bulb.finish((0.0, 0.0, header_z + height / 2 + 0.115), parent=rack)
