"""Builds the «У МАРАТА» kiosk scene and exports assets/kiosk/kiosk.glb.

Run with `npm run build:kiosk`. The scene is rebuilt from the modules in this
folder on every run, so a change is a parameter edit, never a hand-patched
file. Node names are the contract with the site: hs_* are hotspots, slot_*
shelf slots, cam_*/tgt_* camera presets (see assets/js/kiosk/hotspots.js).
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402

import goods  # noqa: E402
import interior  # noqa: E402
import kiosk  # noqa: E402
import street  # noqa: E402
from lib import empty  # noqa: E402
from palette import make_materials  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'assets', 'kiosk', 'kiosk.glb')

CAMERAS = {
    'home': ((3.4, -7.2, 2.1), (0.0, 0.0, 1.4)),
    'showcase': ((0.3, -3.0, 1.65), (0.0, -0.9, 1.5)),
    'flyer': ((-1.7, -3.1, 1.65), (-1.94, -1.11, 1.55)),
    'terminal': ((3.7, -2.7, 1.5), (3.0, -0.55, 1.2)),
    'pricelist': ((-0.75, -2.2, 1.3), (-0.9, -0.95, 1.12)),
    'inside': ((1.15, 0.8, 1.6), (0.1, -0.1, 1.35)),
}


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    materials = make_materials()
    kiosk.build(materials)
    goods.build(materials)
    interior.build(materials)
    street.build(materials)
    for name, (cam, target) in CAMERAS.items():
        empty(f'cam_{name}', cam)
        empty(f'tgt_{name}', target)


def export():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=OUT,
        export_format='GLB',
        export_yup=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
    )
    print(f'kiosk exported: {OUT}')


build()
export()
