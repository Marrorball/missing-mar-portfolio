"""Builds the «У МАРАТА» kiosk scene and exports assets/kiosk/kiosk.glb.

Run with `npm run build:kiosk`. The scene is rebuilt from the modules in this
folder on every run, so a change is a parameter edit, never a hand-patched
file. Node names are the contract with the site: hs_* are hotspots, slot_*
showcase hits, disc_* rack pockets, screen_* page anchors (size in extras),
cam_*/tgt_* camera presets (see assets/js/kiosk/hotspots.js).
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402

import goods  # noqa: E402
import interior  # noqa: E402
import kiosk  # noqa: E402
import rack  # noqa: E402
import street  # noqa: E402
from lib import empty  # noqa: E402
from dims import RACK  # noqa: E402
from palette import make_materials  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'assets', 'kiosk', 'kiosk.glb')

CAMERAS = {
    'home': ((3.4, -8.5, 2.5), (-0.35, -0.2, 1.4)),
    'showcase': ((0.3, -3.0, 1.65), (0.0, -0.9, 1.5)),
    'inside': ((1.10, 0.20, 1.65), (-0.55, -0.02, 0.90)),
    'cat': ((0.0, 0.30, 0.76), (-0.82, 0.03, 0.33)),
    'rack': ((RACK[0], RACK[1] - 3.0, 1.3), (RACK[0], RACK[1], 1.03)),
    'tv': ((-0.42, 0.3, 1.76), (-1.02, 0.3, 1.76)),
    'billboard': ((0.0, 1.4, 4.2), (0.0, 6.0, 4.2)),
    'terminal': ((3.0, -1.35, 1.25), (3.0, -0.6, 1.225)),
    'flyer': ((-1.79, -1.93, 1.55), (-1.938, -1.108, 1.55)),
}

# Waypoints for walking between the street and the inside: round the kiosk
# (between the rack and the lamp post on the left, wide of the terminal on
# the right) and in through the back door. See assets/js/kiosk/routes.js.
PATH = {
    'front_left': (-2.9, -2.9, 1.5),
    'side_left': (-2.9, 1.2, 1.65),
    'front_right': (3.9, -1.6, 1.6),
    'side_right': (3.9, 0.9, 1.65),
    'door_out': (0.6, 2.5, 1.6),
    'door_in': (0.6, 0.45, 1.6),
}


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    materials = make_materials()
    kiosk.build(materials)
    goods.build(materials)
    interior.build(materials)
    rack.build(materials)
    street.build(materials)
    for name, (cam, target) in CAMERAS.items():
        empty(f'cam_{name}', cam)
        empty(f'tgt_{name}', target)
    for name, point in PATH.items():
        empty(f'path_{name}', point)


def export():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=OUT,
        export_format='GLB',
        export_yup=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
    )
    print(f'kiosk exported: {OUT}')


build()
export()
