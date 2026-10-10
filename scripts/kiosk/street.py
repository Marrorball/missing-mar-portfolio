"""Everything around the kiosk: snow, drifts, a trodden path, the lamp post
and its cable, a power line, a bench, a bin, bare trees, the billboard, panel
blocks far away, and the payment terminal hotspot."""

import math
import random

import bpy
import bmesh
from mathutils import Matrix

from dims import BILLBOARD, BILLBOARD_FACE, HD, HW, LAMP_POST, TERMINAL, TOP
from can import build_can
from geometry import catenary, tree_segments
from lib import Merge, box, empty, screen, snow_cap, text, material, link

TREES = ((-6.0, 6.0, 8.0), (5.5, 7.0, 7.0), (-9.0, 2.0, 9.0), (8.0, 1.0, 6.5),
         (-3.0, 11.0, 8.5), (10.0, 9.0, 7.5), (-12.0, 8.0, 8.0))
BLOCKS = ((-26.0, 40.0, 24.0, 12.0, 27.0), (2.0, 46.0, 30.0, 12.0, 33.0), (30.0, 38.0, 20.0, 12.0, 27.0),
          (-48.0, 22.0, 12.0, 30.0, 27.0), (46.0, 18.0, 12.0, 28.0, 30.0))
POWER_POLES = ((-14.0, 10.0), (0.0, 12.0), (14.0, 10.0))


def _snow(M, rng):
    box('ground_snow', (140.0, 140.0, 0.02), (0.0, 0.0, -0.01), M['snow'])
    # Footprints alone mark the way to the kiosk: no darker trodden strip.

    drifts = Merge('snow_drifts')
    edge = 0.2
    for k in range(10):
        x = -HW + k * (2 * HW / 9)
        if not 0.1 < x < 1.5:
            drifts.blob((0.7, 0.45, 0.35), (x, HD + edge, 0.0), M['snow'], 16, 10, True)
        drifts.blob((0.6, 0.4, 0.22), (x, -HD - edge - 0.1, 0.0), M['snow'], 16, 10, True)
    for y in (-0.6, 0.0, 0.6):
        drifts.blob((0.45, 0.7, 0.35), (-HW - edge, y, 0.0), M['snow'], 16, 10, True)
        drifts.blob((0.45, 0.7, 0.35), (HW + edge, y, 0.0), M['snow'], 16, 10, True)
    placed = 0
    while placed < 14:
        angle, radius = rng.uniform(0.0, 2 * math.pi), rng.uniform(4.0, 14.0)
        x, y = math.cos(angle) * radius, math.sin(angle) * radius
        if y < -1.0 and abs(x) < 4.5:
            continue  # keep the approach and the camera clear
        if abs(x - BILLBOARD[0]) < 3.2 and abs(y - BILLBOARD[1]) < 2.0:
            continue  # keep the billboard legs clear
        drifts.blob((rng.uniform(2.0, 4.0), rng.uniform(1.5, 3.0), rng.uniform(0.4, 0.9)), (x, y, 0.0), M['snow'], 16, 10, True)
        placed += 1
    drifts.finish()
    footprints = Merge('snow_footprints')
    pressed = material('snow_pressed', (0.61, 0.64, 0.69), roughness=0.98)
    # Travel starts in the street and ends at the kiosk/rack/terminal.
    # The small heel is behind the broad toe, oriented along each curved trail.
    trails = (
        ((1.75, -5.8), (.80, -3.4), (.15, -1.6), 16, 1.0),
        ((-4.65, -4.4), (-3.1, -3.8), (-2.35, -2.4), 7, .94),
        ((4.65, -4.6), (3.5, -3.5), (3.0, -1.45), 8, 1.04),
    )
    # Local seed keeps unrelated street props unchanged when these trails change.
    steps_rng = random.Random(61)
    for start, control, end, count, scale in trails:
        for step in range(count):
            t = step / (count - 1)
            u = 1 - t
            px = u*u*start[0] + 2*u*t*control[0] + t*t*end[0]
            py = u*u*start[1] + 2*u*t*control[1] + t*t*end[1]
            dx = 2*u*(control[0]-start[0]) + 2*t*(end[0]-control[0])
            dy = 2*u*(control[1]-start[1]) + 2*t*(end[1]-control[1])
            length = math.hypot(dx, dy)
            dx, dy = dx/length, dy/length
            offset = (.095 if step % 2 else -.095) + steps_rng.uniform(-.012,.012)
            px, py = px + dy*offset, py - dx*offset
            angle = math.atan2(-dx, dy) + steps_rng.uniform(-.075,.075)
            old = set(footprints.bm.verts)
            footprints.blob((.12*scale, .24*scale, .005), (0, 0, .008), pressed, 10, 6, True)
            footprints.blob((.09*scale, .085*scale, .005), (0, -.12*scale, .008), pressed, 8, 6, True)
            verts = [v for v in footprints.bm.verts if v not in old]
            bmesh.ops.transform(footprints.bm, verts=verts,
                                matrix=Matrix.Translation((px,py,0)) @ Matrix.Rotation(angle,4,'Z'))
    tracks = footprints.finish()
    tracks['trail_count'] = len(trails)
    tracks['step_count'] = sum(trail[3] for trail in trails)



def _lamp_and_wires(M):
    px, py = LAMP_POST
    post = Merge('lamppost')
    post.cylinder(0.07, 4.4, (0.0, 0.0, 2.2), M['frame'], segments=10)
    post.bar((0.0, 0.0, 4.25), (0.8, 0.0, 4.45), 0.05, M['frame'])
    post.box((0.45, 0.2, 0.1), (0.95, 0.0, 4.42), M['frame'])
    post.box((0.3, 0.14, 0.02), (0.95, 0.0, 4.36), M['bulb'])
    post.finish((px, py, 0.0))

    wires = Merge('cables')
    wires.polyline(catenary((-HW + 0.15, -HD + 0.4, TOP + 0.12), (px, py, 4.1), 0.45, 18), 0.012, M['ink'])
    poles = Merge('power_poles')
    tops = []
    for x, y in POWER_POLES:
        poles.cylinder(0.12, 9.0, (x, y, 4.5), M['wood'], segments=8)
        poles.box((1.8, 0.1, 0.1), (x, y, 8.6), M['wood'])
        tops.append((x, y))
    for (ax, ay), (bx, by) in zip(tops, tops[1:]):
        for dx in (-0.8, 0.8):
            wires.polyline(catenary((ax + dx, ay, 8.65), (bx + dx, by, 8.65), 0.9, 20), 0.02, M['ink'])
    poles.finish()
    wires.finish()
    empty('light_street', (px + 0.95, py, 4.3))
    empty('light_street_target', (px + 0.95, py - 0.3, 0.0))


def _bench_and_bin(M):
    bench = Merge('bench')
    for x in (-0.7, 0.7):
        bench.box((0.08, 0.42, 0.42), (x, 0.0, 0.21), M['frame'])
        bench.box((0.06, 0.06, 0.45), (x, 0.2, 0.62), M['frame'])
    for y in (-0.12, 0.0, 0.12):
        bench.box((1.7, 0.09, 0.03), (0.0, y, 0.45), M['wood'])
    for z in (0.65, 0.8):
        bench.box((1.7, 0.03, 0.09), (0.0, 0.22, z), M['wood'])
    bench.blob((1.5, 0.36, 0.07), (0.0, 0.0, 0.48), M['snow'])
    bench.finish((-4.3, -2.8, 0.0))

    bin_ = Merge('bin')
    bin_.cylinder(0.2, 0.6, (0.0, 0.0, 0.3), M['device'], top=0.24, segments=14)
    bin_.cylinder(0.25, 0.04, (0.0, 0.0, 0.6), M['frame'], segments=14)
    bin_.blob((0.4, 0.4, 0.1), (0.0, 0.0, 0.62), M['snow'], 18, 8, True)
    bin_.finish((1.9, -1.9, 0.0))


def _trees(M, rng):
    trees = Merge('trees')
    for x, y, height in TREES:
        for start, end, thickness in tree_segments(rng, (x, y, 0.0), height):
            trees.bar(start, end, max(thickness, 0.02), M['bark'])
    trees.finish()


def _billboard(M):
    bx, by = BILLBOARD
    width, height, centre = BILLBOARD_FACE
    bottom, top = centre - height / 2, centre + height / 2
    frame = Merge('billboard_frame')
    for x in (-1.6, 1.6):
        frame.cylinder(0.14, bottom + 0.1, (x, 0.25, (bottom + 0.1) / 2), M['frame'], segments=10)
    for z in (bottom - 0.05, top + 0.05):
        frame.box((width + 0.2, 0.25, 0.1), (0.0, 0.0, z), M['frame'])
    for x in (-width / 2 - 0.05, width / 2 + 0.05):
        frame.box((0.1, 0.25, height), (x, 0.0, centre), M['frame'])
    for x in (-1.6, 0.0, 1.6):
        frame.bar((x, 0.0, top + 0.1), (x, -0.6, top + 0.35), 0.04, M['frame'])
        frame.box((0.3, 0.15, 0.08), (x, -0.62, top + 0.33), M['frame'])
    frame.finish((bx, by, 0.0))
    box('hs_billboard', (width, 0.12, height), (bx, by + 0.08, centre), M['device'])
    screen('screen_billboard', (bx, by - 0.1, centre), width, height)
    for index, x in enumerate((-1.6, 0.0, 1.6)):
        empty(f'light_billboard_{index}', (bx + x, by - 0.62, top + 0.28))
    empty('light_billboard_target', (bx, by, centre))


def _window_person(M, wx, face, wz, smoking):
    """A neighbour at a lit window, facing the street. The figure is a soft
    silhouette painted by the site (assets/js/kiosk/neighbours.js) on this
    anchor, just inside the frame; the sill crops it at the waist."""
    pose = 'smoking' if smoking else 'looking'
    anchor = screen(f'window_person_{pose}', (wx, face - 0.07, wz), 1.1, 1.32)
    anchor['pose'] = 'smoking' if smoking else 'looking_out'

    trim = Merge('window_occupied_trim_smoking' if smoking else 'window_occupied_trim_looking')
    frame = material('apartment_window_frame', (.19, .20, .23))
    curtain = material('apartment_curtain', (.24, .20, .17), emission=.15)
    for side in (-1, 1):
        trim.box((.045, .06, 1.43), (side*.60, -.115, 0), frame)
        trim.box((.10, .012, 1.30), (side*.53, -.047, 0), curtain)
    trim.box((1.25, .17, .07), (0, -.11, -.68), frame)
    trim.box((1.25, .06, .045), (0, -.115, .70), frame)
    trim.finish((wx, face, wz))


def _blocks(M, rng):
    blocks = Merge('buildings')
    # Two neighbours only; colours use their own seed so the existing lit/dark
    # pattern and unrelated street props stay stable between rebuilds.
    neighbours = {(0, 2, 7): True, (1, 6, 1): False}
    light_rng = random.Random(204)
    tones = ['window_lit', 'window_lit', 'window_amber', 'window_soft_white',
             'window_cool', 'window_dim_warm']
    for building, (x, y, w, d, h) in enumerate(BLOCKS):
        blocks.box((w, d, h), (x, y, h / 2), M['building'])
        face = y - d / 2 - 0.03
        floors, columns = int(h // 3), int(w // 2.4)
        for floor in range(floors):
            for column in range(columns):
                wx = x - w / 2 + 1.2 + column * (w - 2.4) / max(columns - 1, 1)
                lit = rng.random() < 0.18
                wz = 1.8 + floor * 3
                occupant = neighbours.get((building, floor, column))
                tone = light_rng.choice(tones) if lit else 'window_dark'
                if occupant is not None:
                    tone = 'window_amber' if occupant else 'window_soft_white'
                    _window_person(M, wx, face, wz, occupant)
                blocks.box((1.2, 0.06, 1.4), (wx, face, wz), M[tone])
    blocks.finish()


def _terminal(M):
    tx, ty = TERMINAL
    terminal = box('hs_terminal', (0.62, 0.45, 1.75), (tx, ty, 0.875), M['terminal_orange'])
    bevel = terminal.modifiers.new('rounded battered edges', 'BEVEL')
    bevel.width = 0.025
    bevel.segments = 2
    box('terminal_screen', (0.45, 0.02, 0.32), (0.0, -0.235, 0.35), M['screen'], parent=terminal)
    parts = Merge('terminal_details')
    front = -0.235
    parts.box((0.66, 0.5, 0.22), (0.0, 0.0, 0.985), M['terminal_orange'])
    for row in range(4):
        for col in range(3):
            parts.box((0.05, 0.015, 0.035), (-0.07 + col * 0.07, front, 0.08 - row * 0.05), M['plastic_light'])
    parts.box((0.2, 0.02, 0.04), (0.0, front, -0.2), M['ink'])
    parts.box((0.12, 0.02, 0.02), (0.0, front, -0.32), M['ink'])
    parts.box((0.7, 0.5, 0.06), (0.0, 0.0, -0.845), M['frame'])
    parts.finish(parent=terminal)
    exposed = material('terminal_exposed', (0.31, 0.32, 0.30), metallic=0.55, roughness=0.85)
    wear = Merge('terminal_wear')
    for cx, z, w in [(-0.27, -0.63, 0.05), (0.26, -0.53, 0.055), (-0.275, 0.04, 0.045),
                     (0.25, 0.60, 0.035), (-0.18, -0.20, 0.025)]:
        wear.box((w, 0.006, 0.025), (cx, -0.229, z), exposed, rot=(0, 0.12, 0.1))
        wear.bar((cx - w / 2, -0.234, z - 0.013), (cx + w / 2, -0.234, z + 0.015), 0.004, M['ink'])
    for z in (-0.62, 0.64):
        for cx in (-0.255, 0.255):
            wear.cylinder(0.009, 0.006, (cx, -0.232, z), exposed, segments=10, rot=(math.pi / 2, 0, 0))
    wear.finish(parent=terminal)
    label = text('terminal_label', 'ОПЫТ\nИ НАВЫКИ', (0.0, -0.255, 0.985), 0.068, M['ink'], parent=terminal)
    label['caption'] = 'ОПЫТ И НАВЫКИ'
    screen('screen_terminal', (tx, ty - 0.247, 1.225), 0.45, 0.32)
    # the receipt feeds out of the small slot under the bill acceptor (scene.js)
    empty('terminal_receipt_slot', (tx, ty - 0.247, 0.552))
    empty('light_terminal', (tx, ty - 0.60, 2.06))
    lamp = Merge('terminal_lamp')
    lamp.bar((tx, ty - 0.15, 1.98), (tx, ty - 0.57, 2.06), 0.012, M['frame'])
    lamp.box((0.12, 0.06, 0.025), (tx, ty - 0.57, 2.045), M['bulb'])
    lamp.finish()
    snow_cap('terminal_snow', (0.66, 0.5), 0.045, 1.97, M['snow'], loc=(tx, ty, 0.0), overhang=0.015, lumps=3, seed=9,
             grid=0.025)
    snow_cap('terminal_lamp_snow', (0.12, 0.06), 0.015, 2.058, M['snow'], loc=(tx, ty - 0.57, 0.0), overhang=0.006,
             lumps=1, seed=3, grid=0.012)


def _lost_phone(M):
    """A push-button phone of the early 2000s someone dropped by the trail,
    face up and one edge sunk in the snow. Its screen lights up now and then
    like a text came in (scene.js); a click picks it up for a game of Snake."""
    phone = box('hs_phone', (0.048, 0.113, 0.02), (1.15, -3.0, 0.008), material('phone_body', (0.13, 0.19, 0.29), roughness=0.55),
                rot_z=math.radians(35))
    phone.rotation_euler[0] = 0.08
    bevel = phone.modifiers.new('rounded phone', 'BEVEL')
    bevel.width = 0.006
    bevel.segments = 3
    face = Merge('phone_details')
    face.box((0.044, 0.108, 0.002), (0.0, 0.0, 0.0105), material('phone_face', (0.18, 0.27, 0.40), roughness=0.4))
    face.box((0.038, 0.032, 0.0012), (0.0, 0.022, 0.0118), M['ink'])                      # the screen's dark frame
    face.box((0.012, 0.002, 0.001), (0.0, 0.046, 0.0118), M['ink'])                       # earpiece
    face.box((0.022, 0.009, 0.0016), (0.0, -0.002, 0.0118), M['plastic_light'])           # the big navi key
    for row in range(4):
        for col in range(3):
            face.box((0.009, 0.006, 0.0014), (-0.012 + col * 0.012, -0.016 - row * 0.009, 0.0118), M['plastic_light'])
    face.box((0.014, 0.01, 0.008), (0.012, 0.058, 0.006), material('phone_body', (0.13, 0.19, 0.29)))  # antenna hump
    face.finish(parent=phone)
    box('phone_screen', (0.03, 0.022, 0.001), (0.0, 0.022, 0.0126), material('phone_screen', (0.55, 0.68, 0.38), emission=0.35),
        parent=phone)
    # a phone is tiny from the street: tap anywhere around it
    box('phone_hit', (0.32, 0.32, 0.12), (0.0, 0.0, 0.03), material('hit_area', (0.0, 0.0, 0.0), alpha=0.0), parent=phone)


def build(M):
    rng = random.Random(13)
    _snow(M, rng)
    _lamp_and_wires(M)
    _bench_and_bin(M)
    _trees(M, rng)
    _billboard(M)
    _blocks(M, rng)
    _terminal(M)
    _lost_phone(M)
    build_can('cola_can_bin', (2.065, -2.038, 0.62), 0.24, M)
