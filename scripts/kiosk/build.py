"""Greybox of the «У МАРАТА» kiosk.

Run with `npm run build:kiosk`. The whole scene is rebuilt from the numbers
below on every run and exported to assets/kiosk/kiosk.glb, so a change is a
parameter edit, never a hand-patched file.

Blender metres, Z up, the kiosk front faces -Y. Node names are the contract
with the site: hs_* are hotspots, slot_* shelf slots, cam_*/tgt_* camera
presets (see assets/js/kiosk/hotspots.js).
"""

import math
import os

import bmesh
import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'assets', 'kiosk', 'kiosk.glb')

W, D = 3.0, 2.0            # kiosk footprint
PLINTH = 0.12              # floor height above the snow
TOP = 2.4                  # top of the walls
GLASS_LOW, GLASS_HIGH = 0.95, 2.25
WALL = 0.06
SLOT_COUNT = 8

CAMERAS = {
    'home': ((3.4, -7.2, 2.1), (0.0, 0.0, 1.4)),
    'showcase': ((0.3, -3.0, 1.65), (0.0, -0.9, 1.5)),
    'flyer': ((-1.7, -3.1, 1.65), (-1.94, -1.11, 1.55)),
    'terminal': ((3.7, -2.7, 1.5), (3.0, -0.55, 1.2)),
    'pricelist': ((-0.75, -2.2, 1.3), (-0.9, -0.95, 1.12)),
    'inside': ((1.15, 0.8, 1.6), (0.1, -0.1, 1.35)),
}

_materials = {}


def material(name, color, alpha=1.0, emission=0.0):
    if name in _materials:
        return _materials[name]
    mat = bpy.data.materials.new(name)  # Blender 5: always node-based
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.85
    bsdf.inputs['Alpha'].default_value = alpha
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*color, 1.0)
        bsdf.inputs['Emission Strength'].default_value = emission
    if alpha < 1.0 and hasattr(mat, 'surface_render_method'):
        mat.surface_render_method = 'BLENDED'
    _materials[name] = mat
    return mat


def link(obj, parent=None):
    bpy.context.scene.collection.objects.link(obj)
    if parent is not None:
        obj.parent = parent
    return obj


def box(name, size, loc, mat, parent=None, rot_z=0.0):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat)
    obj = link(bpy.data.objects.new(name, mesh), parent)
    obj.location = loc
    obj.rotation_euler = (0.0, 0.0, rot_z)
    return obj


def cylinder(name, radius, depth, loc, mat, parent=None):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=radius, radius2=radius, depth=depth)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat)
    obj = link(bpy.data.objects.new(name, mesh), parent)
    obj.location = loc
    return obj


def empty(name, loc, parent=None, rot_z=0.0):
    obj = link(bpy.data.objects.new(name, None), parent)
    obj.location = loc
    obj.rotation_euler = (0.0, 0.0, rot_z)
    return obj


def text(name, body, loc, size, mat):
    curve = bpy.data.curves.new(name, 'FONT')
    curve.body = body
    curve.size = size
    curve.align_x = 'CENTER'
    curve.align_y = 'CENTER'
    curve.extrude = 0.012
    source = link(bpy.data.objects.new(name + '_curve', curve))
    source.location = loc
    source.rotation_euler = (math.pi / 2, 0.0, 0.0)
    bpy.context.view_layer.update()
    evaluated = source.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = bpy.data.meshes.new_from_object(evaluated)
    mesh.materials.clear()
    mesh.materials.append(mat)
    obj = link(bpy.data.objects.new(name, mesh))
    obj.matrix_world = source.matrix_world.copy()
    bpy.data.objects.remove(source)
    return obj


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)

    paint = material('paint', (0.46, 0.52, 0.56))
    paint_dark = material('paint_dark', (0.30, 0.34, 0.37))
    frame = material('frame', (0.22, 0.24, 0.26))
    glass = material('glass', (0.75, 0.85, 0.95), alpha=0.18)
    snow = material('snow', (0.86, 0.89, 0.94))
    sign = material('sign', (0.93, 0.90, 0.82))
    ink = material('ink', (0.08, 0.08, 0.09))
    paper = material('paper', (0.95, 0.93, 0.86))
    poster = material('poster', (0.80, 0.74, 0.62))
    wood = material('wood', (0.45, 0.33, 0.22))
    goods = material('goods', (0.78, 0.55, 0.30))
    filler = material('filler', (0.55, 0.40, 0.38))
    device = material('device', (0.20, 0.21, 0.23))
    screen = material('screen', (0.35, 0.55, 0.70), emission=0.6)
    bulb = material('bulb', (1.0, 0.72, 0.38), emission=6.0)
    away = material('away', (0.90, 0.22, 0.18))

    hw = W / 2
    hd = D / 2
    wall_h = TOP - PLINTH
    wall_z = PLINTH + wall_h / 2
    front_y = -hd + WALL / 2

    # ground and street
    box('ground_snow', (30.0, 30.0, 0.02), (0.0, 0.0, -0.01), snow)
    cylinder('prop_lamppost', 0.06, 4.2, (-3.2, -1.6, 2.1), frame)
    box('prop_lamphead', (0.5, 0.18, 0.12), (-3.0, -1.6, 4.2), frame)

    # shell
    box('kiosk_floor', (W, D, PLINTH), (0.0, 0.0, PLINTH / 2), paint_dark)
    box('kiosk_front_lower', (W, WALL, GLASS_LOW - PLINTH), (0.0, front_y, (PLINTH + GLASS_LOW) / 2), paint)
    box('kiosk_front_top', (W, WALL, TOP - GLASS_HIGH), (0.0, front_y, (GLASS_HIGH + TOP) / 2), paint)
    for side, x in (('l', -hw + 0.05), ('r', hw - 0.05)):
        box(f'kiosk_post_{side}', (0.1, WALL, GLASS_HIGH - GLASS_LOW), (x, front_y, (GLASS_LOW + GLASS_HIGH) / 2), frame)
    box('hs_showcase', (W - 0.2, 0.02, GLASS_HIGH - GLASS_LOW), (0.0, -hd + 0.01, (GLASS_LOW + GLASS_HIGH) / 2), glass)
    for side, x in (('l', -hw + WALL / 2), ('r', hw - WALL / 2)):
        box(f'kiosk_wall_{side}', (WALL, D, wall_h), (x, 0.0, wall_z), paint)

    # back wall with the door opening between x=0.2 and x=1.0
    door_l, door_r, door_top = 0.2, 1.0, 2.05
    back_y = hd - WALL / 2
    box('kiosk_back_left', (door_l + hw, WALL, wall_h), ((door_l - hw) / 2, back_y, wall_z), paint)
    box('kiosk_back_right', (hw - door_r, WALL, wall_h), ((door_r + hw) / 2, back_y, wall_z), paint)
    box('kiosk_back_top', (door_r - door_l, WALL, TOP - door_top), ((door_l + door_r) / 2, back_y, (door_top + TOP) / 2), paint)
    hinge = empty('door_hinge', (door_r, hd, 0.0), rot_z=math.radians(-115))
    box('hs_backdoor', (door_r - door_l, 0.05, door_top - PLINTH), (-(door_r - door_l) / 2, 0.03, (PLINTH + door_top) / 2), paint_dark, parent=hinge)

    # roof and sign
    box('kiosk_roof', (W + 0.3, D + 0.3, 0.1), (0.0, 0.0, TOP + 0.05), paint_dark)
    box('kiosk_signbox', (W + 0.2, 0.3, 0.55), (0.0, -hd, TOP + 0.38), sign)
    text('kiosk_sign_text', 'У МАРАТА', (0.0, -hd - 0.16, TOP + 0.38), 0.34, ink)

    # serving window, the away sign and the price list behind the glass
    window_y = -hd - 0.03
    box('kiosk_window_top', (0.64, 0.06, 0.04), (0.0, window_y, 1.41), frame)
    for side, x in (('l', -0.3), ('r', 0.3)):
        box(f'kiosk_window_{side}', (0.04, 0.06, 0.46), (x, window_y, 1.18), frame)
    box('kiosk_counter_shelf', (0.7, 0.25, 0.04), (0.0, -hd - 0.12, GLASS_LOW + 0.02), wood)
    box('hs_sign_away', (0.3, 0.01, 0.18), (0.0, -hd + 0.06, 1.2), away)
    box('hs_pricelist', (0.3, 0.01, 0.36), (-0.9, -hd + 0.06, 1.12), paper)

    # shutters swung open like «Мечта»; inner faces with posters face the street
    left = empty('shutter_left_hinge', (-hw, -hd, 0.0), rot_z=math.radians(190))
    box('shutter_left', (1.0, 0.04, 1.5), (0.5, 0.0, 1.6), paint, parent=left)
    box('hs_flyer', (0.32, 0.01, 0.45), (0.45, 0.03, 1.55), paper, parent=left)
    box('poster_left_a', (0.28, 0.01, 0.2), (0.78, 0.03, 1.95), poster, parent=left)
    box('poster_left_b', (0.22, 0.01, 0.3), (0.15, 0.03, 1.2), poster, parent=left)
    right = empty('shutter_right_hinge', (hw, -hd, 0.0), rot_z=math.radians(170))
    box('shutter_right', (1.0, 0.04, 1.5), (-0.5, 0.0, 1.6), paint, parent=right)
    box('poster_right_a', (0.3, 0.01, 0.42), (-0.5, 0.03, 1.5), poster, parent=right)

    # shelves: slots on the front row, filler above
    shelf_y = -hd + 0.2
    box('shelf_front', (W - 0.3, 0.3, 0.03), (0.0, shelf_y, 1.3), wood)
    for index in range(SLOT_COUNT):
        x = -1.2 + index * (2.4 / (SLOT_COUNT - 1))
        box(f'slot_{index}', (0.22, 0.14, 0.3), (x, shelf_y, 1.465), goods)
    box('shelf_upper', (W - 0.3, 0.3, 0.03), (0.0, shelf_y, 1.85), wood)
    for index in range(10):
        x = -1.25 + index * 0.28
        height = 0.18 + (index % 3) * 0.06
        box(f'filler_{index}', (0.2, 0.14, height), (x, shelf_y, 1.865 + height / 2), filler)

    # inside
    box('prop_counter', (W - 0.3, 0.45, 0.9), (0.0, -0.55, PLINTH + 0.45), wood)
    box('prop_chair_seat', (0.45, 0.45, 0.06), (0.2, 0.15, 0.55), wood)
    box('prop_chair_back', (0.45, 0.05, 0.5), (0.2, 0.38, 0.83), wood)
    box('prop_heater', (0.5, 0.18, 0.55), (-1.0, 0.72, PLINTH + 0.28), frame)
    box('prop_tv_shelf', (0.4, 0.6, 0.03), (-1.22, 0.3, 1.55), wood)
    box('hs_tv', (0.36, 0.42, 0.34), (-1.22, 0.3, 1.74), device)
    box('tv_screen', (0.02, 0.32, 0.24), (-1.03, 0.3, 1.75), screen)
    box('hs_radio', (0.36, 0.14, 0.2), (0.9, -0.55, PLINTH + 1.0), device)
    cylinder('prop_kettle', 0.09, 0.22, (-0.4, -0.55, PLINTH + 1.01), frame)
    box('prop_calendar', (0.4, 0.01, 0.55), (-0.8, hd - WALL - 0.01, 1.6), paper)
    for index, x in enumerate((-0.6, 0.6)):
        cylinder(f'bulb_{index}', 0.04, 0.09, (x, 0.0, TOP - 0.2), bulb)
    cylinder('bulb_outside', 0.05, 0.1, (0.0, -hd - 0.15, TOP - 0.05), bulb)

    # payment terminal beside the kiosk
    terminal = box('hs_terminal', (0.62, 0.45, 1.75), (3.0, -0.35, 0.875), device)
    box('terminal_screen', (0.45, 0.02, 0.32), (0.0, -0.235, 0.35), screen, parent=terminal)

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
