"""The kiosk itself: shell, ribs, frame, diamond grille, sign, serving window,
price list and away sign, shutters with posters and the flyer, roof snow,
the lamp over the window and the back door."""

import math
import random

from dims import (D, DOOR_L, DOOR_OPEN_DEG, DOOR_R, DOOR_TOP, GLASS_HIGH, GLASS_LOW, HD, HW,
                  PLINTH, TOP, W, WALL, WINDOW_L, WINDOW_R, WINDOW_TOP)
from geometry import grille_segments
from lib import Merge, box, cylinder, empty, screen, text

ADS = ('СДАМ\nКВАРТИРУ', 'РЕМОНТ\nКОМПЬЮТЕРОВ', 'КУПЛЮ ВОЛОСЫ\nДОРОГО')


def _shell(M):
    wall_h = TOP - PLINTH
    wall_z = PLINTH + wall_h / 2
    front_y = -HD + WALL / 2
    back_y = HD - WALL / 2
    box('kiosk_floor', (W, D, PLINTH), (0.0, 0.0, PLINTH / 2), M['paint_dark'])
    box('kiosk_front_lower', (W, WALL, GLASS_LOW - PLINTH), (0.0, front_y, (PLINTH + GLASS_LOW) / 2), M['paint'])
    box('kiosk_front_top', (W, WALL, TOP - GLASS_HIGH), (0.0, front_y, (GLASS_HIGH + TOP) / 2), M['paint'])
    for side, x in (('l', -HW + WALL / 2), ('r', HW - WALL / 2)):
        box(f'kiosk_wall_{side}', (WALL, D, wall_h), (x, 0.0, wall_z), M['paint'])
    box('kiosk_back_left', (DOOR_L + HW, WALL, wall_h), ((DOOR_L - HW) / 2, back_y, wall_z), M['paint'])
    box('kiosk_back_right', (HW - DOOR_R, WALL, wall_h), ((DOOR_R + HW) / 2, back_y, wall_z), M['paint'])
    box('kiosk_back_top', (DOOR_R - DOOR_L, WALL, TOP - DOOR_TOP),
        ((DOOR_L + DOOR_R) / 2, back_y, (DOOR_TOP + TOP) / 2), M['paint'])
    box('hs_showcase', (W - 0.2, 0.02, GLASS_HIGH - GLASS_LOW),
        (0.0, -HD + 0.01, (GLASS_LOW + GLASS_HIGH) / 2), M['glass'])

    # corrugated sheet: vertical ribs on every outer face, seams on the sides
    ribs = Merge('kiosk_ribs')
    rib = 0.035
    for x_face, out in ((-HW, -1), (HW, 1)):
        y = -HD + 0.2
        while y < HD - 0.1:
            ribs.box((rib, rib, wall_h - 0.1), (x_face + out * rib / 2, y, wall_z), M['paint'])
            y += 0.25
        for z in (PLINTH + 0.05, TOP - 0.05):
            ribs.box((rib, D, rib), (x_face + out * rib / 2, 0.0, z), M['paint_dark'])
    x = -HW + 0.2
    while x < HW - 0.1:
        if not DOOR_L - 0.05 < x < DOOR_R + 0.05:
            ribs.box((rib, rib, wall_h - 0.1), (x, HD + rib / 2, wall_z), M['paint'])
        ribs.box((rib, rib, GLASS_LOW - PLINTH - 0.1), (x, -HD - rib / 2, (PLINTH + GLASS_LOW) / 2), M['paint'])
        x += 0.25
    ribs.finish()

    frame = Merge('kiosk_frame')
    for x in (-HW, HW):
        for y in (-HD, HD):
            frame.box((0.07, 0.07, wall_h + 0.02), (x, y, wall_z), M['frame'])
    for z in (GLASS_LOW, GLASS_HIGH):
        frame.box((W - 0.1, 0.05, 0.05), (0.0, -HD - 0.01, z), M['frame'])
    for x in (-HW + 0.06, -0.686, 0.686, HW - 0.06):
        frame.box((0.05, 0.05, GLASS_HIGH - GLASS_LOW), (x, -HD - 0.01, (GLASS_LOW + GLASS_HIGH) / 2), M['frame'])
    frame.box((0.08, 0.3, 0.42), (HW + 0.04, 0.45, 1.7), M['device'])       # power box
    frame.bar((HW + 0.03, 0.45, 1.91), (HW + 0.03, 0.45, TOP + 0.08), 0.03, M['frame'])
    frame.finish()


def _grille(M):
    grille = Merge('kiosk_grille')
    outer = (-HW + 0.08, GLASS_LOW + 0.03, HW - 0.08, GLASS_HIGH - 0.03)
    hole = (WINDOW_L - 0.02, GLASS_LOW - 0.1, WINDOW_R + 0.02, WINDOW_TOP + 0.03)
    y = -HD - 0.035
    for (ax, az), (bx, bz) in grille_segments(outer, hole, 0.24):
        grille.bar((ax, y, az), (bx, y, bz), 0.012, M['frame'])
    grille.finish()


def _sign(M):
    box('kiosk_signbox', (W + 0.2, 0.3, 0.55), (0.0, -HD, TOP + 0.38), M['sign'])
    trim = Merge('kiosk_signframe')
    y = -HD - 0.16
    for z in (TOP + 0.1, TOP + 0.66):
        trim.box((W + 0.24, 0.04, 0.04), (0.0, y, z), M['frame'])
    for x in (-(W + 0.2) / 2, (W + 0.2) / 2):
        trim.box((0.04, 0.04, 0.6), (x, y, TOP + 0.38), M['frame'])
    trim.finish()
    text('kiosk_sign_text', 'ДИЗАЙН У МАРА', (0.0, -HD - 0.16, TOP + 0.38), 0.255, M['ink'])
    text('glass_tag', 'missing mar', (1.05, -HD - 0.012, GLASS_LOW + 0.12), 0.06, M['paper'], bold=False)


def _window(M):
    y = -HD - 0.03
    win = Merge('kiosk_window')
    win.box((WINDOW_R - WINDOW_L + 0.04, 0.06, 0.04), (0.0, y, WINDOW_TOP), M['frame'])
    for x in (WINDOW_L, WINDOW_R):
        win.box((0.04, 0.06, WINDOW_TOP - GLASS_LOW), (x, y, (GLASS_LOW + WINDOW_TOP) / 2), M['frame'])
        win.box((0.03, 0.2, 0.03), (x, -HD - 0.1, GLASS_LOW - 0.05), M['frame'])     # shelf brackets
    win.box((0.7, 0.28, 0.04), (0.0, -HD - 0.13, GLASS_LOW + 0.02), M['wood'])      # counter shelf
    win.box((0.3, 0.01, 0.4), (0.13, -HD + 0.03, (GLASS_LOW + WINDOW_TOP) / 2), M['glass'])  # sliding pane
    win.finish()
    box('card_knock', (0.36, 0.005, 0.09), (0.0, -HD - 0.04, WINDOW_TOP + 0.09), M['paper'])
    text('card_knock_text', 'СТУЧИТЕ', (0.0, -HD - 0.044, WINDOW_TOP + 0.09), 0.05, M['ink'])

    away = box('hs_sign_away', (0.3, 0.01, 0.18), (0.0, -HD + 0.06, 1.2), M['away'])
    text('away_text', 'ОТОШЁЛ\n5 МИН', (0.0, -0.007, 0.0), 0.045, M['paper'], parent=away)
    prices = box('hs_pricelist', (0.3, 0.01, 0.36), (-0.9, -HD + 0.06, 1.12), M['paper'])
    text('pricelist_title', 'ПРАЙС', (0.0, -0.007, 0.13), 0.045, M['ink'], parent=prices)
    lines = Merge('pricelist_lines')
    for index in range(7):
        lines.box((0.22, 0.004, 0.006), (0.0, -0.006, 0.07 - index * 0.035), M['ink'])
    lines.finish(parent=prices)


def _shutters(M):
    for side, rot, out, seed in (('left', 190, 1, 11), ('right', 170, -1, 23)):
        hinge = empty(f'shutter_{side}_hinge', (out * -HW, -HD, 0.0), rot_z=math.radians(rot))
        box(f'shutter_{side}', (1.0, 0.04, 1.5), (out * 0.5, 0.0, 1.6), M['paint'], parent=hinge)
        trim = Merge(f'shutter_{side}_trim')
        for z in (0.87, 2.33):
            trim.box((1.0, 0.05, 0.035), (out * 0.5, 0.0, z), M['paint_dark'])
        for x in (0.02, 0.98):
            trim.box((0.035, 0.05, 1.5), (out * x, 0.0, 1.6), M['paint_dark'])
        for z in (1.1, 2.1):
            trim.cylinder(0.02, 0.12, (0.0, -0.03, z), M['frame'])
        trim.finish(parent=hinge)

        rng = random.Random(seed)
        posters = Merge(f'posters_{side}')
        for index in range(12):
            w, h = rng.uniform(0.12, 0.3), rng.uniform(0.1, 0.3)
            x, z = out * rng.uniform(0.15, 0.85), rng.uniform(1.0, 2.2)
            if side == 'left' and abs(x - 0.45) < 0.26 and abs(z - 1.55) < 0.34:
                continue  # the flyer lives here
            if side == 'left' and abs(x - 0.45) < 0.3 and z < 1.25:
                continue  # marker contacts live here
            if side == 'right' and abs(x + 0.5) < 0.3 and z > 1.25:
                continue  # the three ads live here
            depth = 0.024 + index * 0.0006
            posters.box((w, 0.004, h), (x, depth, z), rng.choice(M['posters']), rot=(0.0, rng.uniform(-0.12, 0.12), 0.0))
            if rng.random() < 0.4:
                for k in range(6):
                    posters.box((w / 7, 0.003, 0.05), (x - w / 2 + (k + 0.75) * w / 6.5, depth + 0.001, z - h / 2 - 0.03), M['paper'])
        if side == 'right':
            for index, (body, z) in enumerate(zip(ADS, (2.05, 1.75, 1.45))):
                posters.box((0.34, 0.004, 0.24), (-0.5, 0.026, z), M['paper'])
                text(f'ad_{index}', body, (-0.5, 0.03, z + 0.02), 0.035, M['ink'], parent=hinge, rot_z=math.pi)
        posters.finish(parent=hinge)

        if side == 'left':
            flyer = box('hs_flyer', (0.32, 0.006, 0.45), (0.45, 0.026, 1.55), M['paper'], parent=hinge)
            details = Merge('flyer_details')
            details.box((0.2, 0.004, 0.16), (0.0, 0.004, 0.03), M['ink'])      # photo
            for k in range(8):
                details.box((0.032, 0.004, 0.08), (-0.14 + k * 0.04, 0.0, -0.27), M['paper'])
            details.finish(parent=flyer)
            text('flyer_title', 'ПРОПАЛ', (0.0, 0.006, 0.17), 0.06, M['ink'], parent=flyer, rot_z=math.pi)
            screen('screen_flyer', (0.0, 0.0035, 0.0), 0.32, 0.45, rot_z=math.pi, parent=flyer)
            screen('wall_contacts', (0.45, 0.024, 1.02), 0.52, 0.24, rot_z=math.pi, parent=hinge)


def _roof_and_lamp(M):
    box('kiosk_roof', (W + 0.3, D + 0.3, 0.1), (0.0, 0.0, TOP + 0.05), M['paint_dark'])
    snow = Merge('roof_snow')
    rng = random.Random(7)
    for _ in range(14):
        snow.blob((rng.uniform(0.5, 1.2), rng.uniform(0.5, 1.0), rng.uniform(0.08, 0.16)),
                  (rng.uniform(-1.2, 1.2), rng.uniform(-0.75, 1.0), TOP + 0.1), M['snow'], 16, 10, True)
    snow.finish()

    lamp = Merge('lamp_outside')
    lamp.bar((0.0, -HD, TOP - 0.02), (0.0, -HD - 0.27, TOP - 0.02), 0.02, M['frame'])
    lamp.cylinder(0.11, 0.09, (0.0, -HD - 0.27, TOP - 0.08), M['frame'], top=0.03, segments=16)
    lamp.finish()
    cylinder('bulb_outside', 0.035, 0.07, (0.0, -HD - 0.27, TOP - 0.15), M['bulb'])

    # the warm spill through the showcase: just behind the glass, aimed at
    # the snow in front, so the grille throws its diamonds on the snow
    empty('light_window', (0.0, -HD + 0.07, GLASS_HIGH - 0.05))
    empty('light_window_target', (0.0, -3.2, 0.0))


def _back_door(M):
    hinge = empty('door_hinge', (DOOR_R, HD, 0.0), rot_z=math.radians(DOOR_OPEN_DEG))
    width = DOOR_R - DOOR_L
    box('hs_backdoor', (width, 0.05, DOOR_TOP - PLINTH), (-width / 2, 0.03, (PLINTH + DOOR_TOP) / 2),
        M['paint_dark'], parent=hinge)
    details = Merge('door_details')
    details.box((0.03, 0.04, 0.16), (-width + 0.08, 0.075, 1.05), M['frame'])     # handle
    for z in (0.45, 1.05, 1.65):
        details.box((width - 0.06, 0.012, 0.03), (-width / 2, 0.06, z), M['paint'])
    details.finish(parent=hinge)


def build(M):
    _shell(M)
    _grille(M)
    _sign(M)
    _window(M)
    _shutters(M)
    _roof_and_lamp(M)
    _back_door(M)
