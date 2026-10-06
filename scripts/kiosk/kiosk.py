"""The kiosk itself: shell, ribs, frame, diamond grille, sign, serving window,
price list and away sign, shutters with posters and the flyer, roof snow,
the lamp over the window and the back door."""

import math
import random

from dims import (D, DOOR_L, DOOR_OPEN_DEG, DOOR_R, DOOR_TOP, GLASS_HIGH, GLASS_LOW, HD, HW,
                  PLINTH, TOP, W, WALL, WINDOW_L, WINDOW_R, WINDOW_TOP)
from geometry import grille_segments
from lib import Merge, box, cylinder, empty, link, material, screen, snow_cap, text

SHEET = (0.4, 0.5625)    # flyer and price list: big enough to read from the street, 32:45


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


def _light_letters(name, body, loc, size, tail):
    """Glowing box letters; the last `tail` letters get their own material so
    the site can let them give out like burnt bulbs. The split is measured:
    everything right of where the shorter text ends belongs to the tail."""
    import bpy
    glow = material('sign_glow', (1.0, 0.8, 0.45), emission=4.0)
    weak = material('sign_glow_tail', (1.0, 0.8, 0.45), emission=4.0)
    obj = text(name, body, loc, size, glow, extrusion=0.012)
    obj.data.materials.append(weak)
    probe = text(f'{name}_probe', body[:-tail], loc, size, glow, extrusion=0.012)
    head_width = max(v.co.x for v in probe.data.vertices) - min(v.co.x for v in probe.data.vertices)
    probe_mesh = probe.data
    bpy.data.objects.remove(probe, do_unlink=True)
    bpy.data.meshes.remove(probe_mesh)
    split = min(v.co.x for v in obj.data.vertices) + head_width + size * 0.05
    for polygon in obj.data.polygons:
        polygon.material_index = 1 if polygon.center.x > split else 0
    return obj


def _graffiti():
    """Anchors for the street art sprayed on the side walls, painted by the
    site (assets/js/kiosk/graffiti.js), just proud of the corrugation."""
    screen('graffiti_right', (HW + 0.037, 0.0, 1.27), 1.85, 1.05, rot_z=math.pi / 2)
    screen('graffiti_left', (-HW - 0.037, 0.08, 1.12), 1.6, 0.9, rot_z=-math.pi / 2)


def _sign(M):
    panel = material('sign_panel', (0.07, 0.075, 0.09), roughness=0.6)
    box('kiosk_signbox', (W + 0.2, 0.3, 0.55), (0.0, -HD, TOP + 0.38), panel)
    trim = Merge('kiosk_signframe')
    y = -HD - 0.16
    for z in (TOP + 0.1, TOP + 0.66):
        trim.box((W + 0.24, 0.04, 0.04), (0.0, y, z), M['frame'])
    for x in (-(W + 0.2) / 2, (W + 0.2) / 2):
        trim.box((0.04, 0.04, 0.6), (x, y, TOP + 0.38), M['frame'])
    trim.finish()
    # «ДИЗАЙН У МАРАТА»; when the last two bulbs give out it reads «МАРА»
    _light_letters('kiosk_sign_text', 'ДИЗАЙН У МАРАТА', (0.0, -HD - 0.165, TOP + 0.38), 0.23, tail=2)
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


NOTICE_SIZES = ((0.15, 0.21), (0.21, 0.15), (0.17, 0.24), (0.14, 0.14), (0.19, 0.26), (0.24, 0.17))


def _notices(side, out, hinge, rng):
    """Small street notices pasted over each other on the shutter, painted by
    the site (assets/js/kiosk/notices.js): one anchor each with its size, a
    slight tilt and which notice it is. Clear of the flyer, the marker
    contacts, the price sheet and the row of three ads."""
    def blocked(x, z, w, h):
        def hits(cx, cz, half_w, half_h):
            return abs(x - cx) < half_w + w / 2 and abs(z - cz) < half_h + h / 2
        if side == 'left':
            return hits(0.45, 1.55, SHEET[0] / 2 + 0.02, SHEET[1] / 2 + 0.02) or hits(0.45, 1.02, 0.28, 0.14)
        return hits(-0.5, 1.55, SHEET[0] / 2 + 0.02, SHEET[1] / 2 + 0.02) or z + h / 2 > 1.95

    placed = []
    if side == 'right':
        # the classic three, in a row along the top
        for design, x in zip((0, 1, 2), (-0.19, -0.5, -0.81)):
            placed.append((x, 2.08, 0.26, 0.19, rng.uniform(-0.05, 0.05), design))
    tries = 0
    while len(placed) < 11 and tries < 400:
        tries += 1
        w, h = rng.choice(NOTICE_SIZES)
        x = out * rng.uniform(0.04 + w / 2, 0.96 - w / 2)
        z = rng.uniform(0.92 + h / 2, 2.3 - h / 2)
        if blocked(x, z, w, h):
            continue
        # a little overlap is how notices grow on a shutter; a lot hides them
        if any(abs(x - px) < (w + pw) * 0.38 and abs(z - pz) < (h + ph) * 0.38 for px, pz, pw, ph, *_ in placed):
            continue
        placed.append((x, z, w, h, rng.uniform(-0.09, 0.09), 3 + (len(placed) * 5 + (0 if side == 'left' else 2)) % 11))
    for index, (x, z, w, h, tilt, design) in enumerate(placed):
        anchor = screen(f'shutter_notice_{side}_{index}', (x, 0.0245 + index * 0.0007, z), w, h, rot_z=math.pi, parent=hinge)
        anchor.rotation_euler[1] = tilt
        anchor['design'] = design
        anchor['torn'] = int(rng.random() < 0.35)


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

        _notices(side, out, hinge, random.Random(seed))

        if side == 'left':
            # the sheet is printed by the site (assets/js/kiosk/paper.js)
            flyer = box('hs_flyer', (SHEET[0], 0.006, SHEET[1]), (0.45, 0.026, 1.55), M['paper'], parent=hinge)
            screen('screen_flyer', (0.0, 0.0035, 0.0), *SHEET, rot_z=math.pi, parent=flyer)
            screen('wall_contacts', (0.45, 0.024, 1.02), 0.52, 0.24, rot_z=math.pi, parent=hinge)
        else:
            # the price list, mirroring the flyer on the other shutter
            prices = box('hs_pricelist', (SHEET[0], 0.006, SHEET[1]), (-0.5, 0.026, 1.55), M['paper'], parent=hinge)
            screen('screen_price', (0.0, 0.0035, 0.0), *SHEET, rot_z=math.pi, parent=prices)


def _roof_snow(M):
    """One continuous blanket over the roof, lumpy and a little overhanging."""
    snow_cap('roof_snow', (W + 0.3, D + 0.3), 0.11, TOP + 0.1, M['snow'], overhang=0.03, lumps=12, grid=0.08)


def _roof_and_lamp(M):
    box('kiosk_roof', (W + 0.3, D + 0.3, 0.1), (0.0, 0.0, TOP + 0.05), M['paint_dark'])
    _roof_snow(M)

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
    # an invisible click area filling the opening, so «in» is easy to hit
    # (the site hides every 'hit_area' material and still picks it)
    box('hs_doorway', (DOOR_R - DOOR_L + 0.1, 0.2, DOOR_TOP - PLINTH + 0.05),
        ((DOOR_L + DOOR_R) / 2, HD, (PLINTH + DOOR_TOP) / 2), material('hit_area', (0.0, 0.0, 0.0), alpha=0.0))
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
    _graffiti()
    _roof_and_lamp(M)
    _back_door(M)
