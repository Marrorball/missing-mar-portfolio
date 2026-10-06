# Kiosk Detail Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill the greybox with real form: a ribbed kiosk with a diamond grille, sign frame, roof snow and posters; shelves packed with goods; a lived-in interior; and a street with drifts, a bench, a bin, bare trees, wires and panel blocks — without breaking any hotspot, slot or camera name.

**Architecture:** `scripts/kiosk/build.py` becomes a thin orchestrator over focused modules: `lib.py` (modelling kit with a `Merge` helper that packs hundreds of parts into one mesh, so the browser draws a shelf in a few calls), `palette.py` (materials), `dims.py` (shared measurements), and one module per area: `kiosk.py`, `goods.py`, `interior.py`, `street.py`. Pure geometry (grille clipping, sagging wires, tree branching) lives in `geometry.py` and is unit-tested with Python's `unittest` outside Blender. The site only gains a see-through rule for the grille and a longer fog.

**Tech Stack:** Blender 5.0 bpy/bmesh, Python 3 `unittest`, three.js, `node --test`.

Spec: `docs/superpowers/specs/2026-10-06-kiosk-portfolio-design.md` (stage 2 «Детализация»). Stage 1 plan: `docs/superpowers/plans/2026-10-06-kiosk-greybox.md`.

Code blocks preceded by `<!-- file: path -->` are complete file contents.

---

## File map

| File | Responsibility |
| --- | --- |
| `scripts/kiosk/geometry.py` | Pure maths: segment clipping, diamond grille, catenary wire, tree branches |
| `scripts/kiosk/test_geometry.py` | `unittest` for `geometry.py` |
| `scripts/kiosk/lib.py` | Materials cache, `Merge`, `box`, `cylinder`, `empty`, `text` |
| `scripts/kiosk/palette.py` | Every material of the scene in one place |
| `scripts/kiosk/dims.py` | Kiosk measurements shared by all modules |
| `scripts/kiosk/kiosk.py` | Shell, ribs, frame, grille, sign, serving window, shutters with posters, flyer, roof snow, lamp, back door |
| `scripts/kiosk/goods.py` | Shelves, packed goods, price tags, hanging crisps, project slots |
| `scripts/kiosk/interior.py` | Counter, chair with sweater, heater, stock shelves, boxes, TV and radio hotspots, wall things, bulbs |
| `scripts/kiosk/street.py` | Ground, drifts, trodden path, lamp post, cables, power line, bench, bin, trees, panel blocks, terminal hotspot |
| `scripts/kiosk/build.py` | Orchestrates the modules, camera presets, export |
| `assets/js/kiosk/hotspots.js` | Grille is see-through for picking |
| `assets/js/kiosk/scene.js` | Longer fog and far plane for the distant blocks |
| `tests/kiosk-scene-file.test.mjs` | New nodes and a draw-call budget |

---

### Task 1: Pure geometry

**Files:**
- Create: `scripts/kiosk/geometry.py`
- Create: `scripts/kiosk/test_geometry.py`
- Modify: `package.json`, `.gitignore`

- [ ] **Step 1: Write the failing tests**

<!-- file: scripts/kiosk/test_geometry.py -->
```python
"""Run: python3 -m unittest discover -s scripts/kiosk -p 'test_*.py'"""

import random
import unittest

from geometry import catenary, clip_segment, grille_segments, tree_segments


class ClipSegment(unittest.TestCase):
    def test_inside_segment_is_kept_whole(self):
        self.assertEqual(clip_segment((0.2, 0.2), (0.8, 0.8), (0, 0, 1, 1)), (0.0, 1.0))

    def test_outside_segment_is_dropped(self):
        self.assertIsNone(clip_segment((2, 2), (3, 3), (0, 0, 1, 1)))

    def test_crossing_segment_is_trimmed(self):
        t0, t1 = clip_segment((-1, 0.5), (1, 0.5), (0, 0, 1, 1))
        self.assertAlmostEqual(t0, 0.5)
        self.assertAlmostEqual(t1, 1.0)


class Grille(unittest.TestCase):
    outer = (-1.4, 1.0, 1.4, 2.2)
    hole = (-0.3, 0.9, 0.3, 1.45)

    def setUp(self):
        self.segments = grille_segments(self.outer, self.hole, 0.24)

    def test_makes_a_real_lattice(self):
        self.assertGreater(len(self.segments), 20)

    def test_bars_stay_inside_the_window(self):
        x0, z0, x1, z1 = self.outer
        for segment in self.segments:
            for x, z in segment:
                self.assertTrue(x0 - 1e-6 <= x <= x1 + 1e-6 and z0 - 1e-6 <= z <= z1 + 1e-6)

    def test_no_bar_crosses_the_serving_window(self):
        x0, z0, x1, z1 = self.hole
        for (ax, az), (bx, bz) in self.segments:
            for t in (0.25, 0.5, 0.75):
                x, z = ax + (bx - ax) * t, az + (bz - az) * t
                self.assertFalse(x0 + 1e-6 < x < x1 - 1e-6 and z0 + 1e-6 < z < z1 - 1e-6)


class Catenary(unittest.TestCase):
    def test_ends_where_asked_and_sags_in_the_middle(self):
        points = catenary((0, 0, 4), (10, 0, 4), 0.5, 10)
        self.assertEqual(points[0], (0, 0, 4))
        self.assertEqual(points[-1], (10.0, 0.0, 4.0))
        self.assertAlmostEqual(points[5][2], 3.5)


class Trees(unittest.TestCase):
    def test_same_seed_same_tree(self):
        self.assertEqual(
            tree_segments(random.Random(3), (0, 0, 0), 8),
            tree_segments(random.Random(3), (0, 0, 0), 8),
        )

    def test_trunk_goes_straight_up_and_nothing_grows_underground(self):
        segments = tree_segments(random.Random(3), (1, 2, 0), 8)
        start, end, _ = segments[0]
        self.assertEqual(start, (1, 2, 0))
        self.assertAlmostEqual(end[0], 1)
        self.assertAlmostEqual(end[1], 2)
        self.assertTrue(all(s[2] >= -1e-9 and e[2] >= -1e-9 for s, e, _ in segments))
        self.assertGreater(len(segments), 10)


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run them to see them fail**

Run: `python3 -m unittest discover -s scripts/kiosk -p 'test_*.py'`
Expected: ERROR, `No module named 'geometry'`.

- [ ] **Step 3: Implement**

<!-- file: scripts/kiosk/geometry.py -->
```python
"""Pure geometry for the kiosk build. No Blender imports: unit-tested with
`python3 -m unittest discover -s scripts/kiosk -p 'test_*.py'`."""

import math


def clip_segment(p, q, rect):
    """Liang–Barsky. Return the (t0, t1) part of segment p→q inside
    rect = (x0, z0, x1, z1), or None when it misses."""
    x0, z0, x1, z1 = rect
    dx, dz = q[0] - p[0], q[1] - p[1]
    t0, t1 = 0.0, 1.0
    for pk, qk in ((-dx, p[0] - x0), (dx, x1 - p[0]), (-dz, p[1] - z0), (dz, z1 - p[1])):
        if abs(pk) < 1e-12:
            if qk < 0:
                return None
            continue
        t = qk / pk
        if pk < 0:
            t0 = max(t0, t)
        else:
            t1 = min(t1, t)
    return (t0, t1) if t0 < t1 else None


def grille_segments(outer, hole, step):
    """Diagonal lattice bars filling `outer`, cut around `hole`.
    Both rects are (x0, z0, x1, z1); returns [((ax, az), (bx, bz)), ...]."""
    x0, z0, x1, z1 = outer
    span = (x1 - x0) + (z1 - z0)
    segments = []
    for slope in (1, -1):
        offset = -span
        while offset <= span:
            p = (x0 - span, slope * (x0 - span) + offset)
            q = (x1 + span, slope * (x1 + span) + offset)
            inside = clip_segment(p, q, outer)
            if inside:
                parts = [inside]
                cut = clip_segment(p, q, hole)
                if cut:
                    parts = [(inside[0], min(inside[1], cut[0])), (max(inside[0], cut[1]), inside[1])]
                for a, b in parts:
                    if b - a > 1e-6:
                        segments.append((
                            (p[0] + (q[0] - p[0]) * a, p[1] + (q[1] - p[1]) * a),
                            (p[0] + (q[0] - p[0]) * b, p[1] + (q[1] - p[1]) * b),
                        ))
            offset += step
    return segments


def catenary(start, end, sag, count):
    """Points of a wire hanging between start and end, `sag` metres low in
    the middle (a parabola is close enough at this scale)."""
    sx, sy, sz = start
    ex, ey, ez = end
    points = []
    for index in range(count + 1):
        t = index / count
        points.append((
            sx + (ex - sx) * t,
            sy + (ey - sy) * t,
            sz + (ez - sz) * t - sag * 4 * t * (1 - t),
        ))
    return points


def tree_segments(rng, base, height, levels=3):
    """A bare winter tree as (start, end, thickness) segments. Branches lean
    away from their parent but never point downwards."""
    segments = []

    def grow(start, direction, length, thickness, level):
        end = tuple(s + d * length for s, d in zip(start, direction))
        segments.append((start, end, thickness))
        if level == 0:
            return
        for _ in range(rng.randint(2, 3)):
            tilt = rng.uniform(0.35, 0.8)
            turn = rng.uniform(0.0, 2 * math.pi)
            side = (math.cos(turn), math.sin(turn), 0.0)
            bent = tuple(d * math.cos(tilt) + s * math.sin(tilt) for d, s in zip(direction, side))
            norm = math.sqrt(sum(c * c for c in bent))
            bent = tuple(c / norm for c in bent)
            at = rng.uniform(0.55, 0.95)
            fork = tuple(s + d * length * at for s, d in zip(start, direction))
            grow(fork, bent, length * rng.uniform(0.5, 0.7), thickness * 0.6, level - 1)

    grow(tuple(base), (0.0, 0.0, 1.0), height * 0.45, height * 0.025, levels)
    return segments
```

- [ ] **Step 4: Run the tests**

Run: `python3 -m unittest discover -s scripts/kiosk -p 'test_*.py'`
Expected: `Ran 9 tests ... OK`.

- [ ] **Step 5: Wire into `npm test` and ignore caches**

In `package.json` set:

```json
"test": "node --test tests/*.test.mjs && python3 -m unittest discover -s scripts/kiosk -p 'test_*.py'",
```

Append `__pycache__/` to `.gitignore`.

Run: `npm test`
Expected: node `pass 43`, then Python `OK`.

- [ ] **Step 6: Commit**

```bash
git add scripts/kiosk/geometry.py scripts/kiosk/test_geometry.py package.json .gitignore
git commit -m "feat: tested geometry for the kiosk grille, wires and trees"
```

---

### Task 2: Modelling kit, palette, measurements

**Files:**
- Create: `scripts/kiosk/lib.py`, `scripts/kiosk/palette.py`, `scripts/kiosk/dims.py`

These need Blender and are exercised by the scene build in Task 7.

- [ ] **Step 1: Create the kit**

<!-- file: scripts/kiosk/lib.py -->
```python
"""Small modelling kit shared by the kiosk build modules.

`Merge` packs many parts into a single mesh object, one material slot per
material, so a shelf of two hundred goods costs the browser a handful of draw
calls instead of hundreds.
"""

import math

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

_materials = {}


def material(name, color, alpha=1.0, emission=0.0, roughness=0.85, metallic=0.0):
    if name in _materials:
        return _materials[name]
    mat = bpy.data.materials.new(name)  # Blender 5: always node-based
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Alpha'].default_value = alpha
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*color, 1.0)
        bsdf.inputs['Emission Strength'].default_value = emission
    if alpha < 1.0:
        mat.surface_render_method = 'BLENDED'
    _materials[name] = mat
    return mat


def link(obj, parent=None):
    bpy.context.scene.collection.objects.link(obj)
    if parent is not None:
        obj.parent = parent
    return obj


def empty(name, loc, parent=None, rot_z=0.0):
    obj = link(bpy.data.objects.new(name, None), parent)
    obj.location = loc
    obj.rotation_euler = (0.0, 0.0, rot_z)
    return obj


class Merge:
    """Accumulates boxes, cylinders, blobs and bars into one mesh object."""

    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.materials = []

    def _place(self, verts, matrix, mat):
        bmesh.ops.transform(self.bm, matrix=matrix, verts=verts)
        if mat not in self.materials:
            self.materials.append(mat)
        index = self.materials.index(mat)
        for face in {face for vert in verts for face in vert.link_faces}:
            face.material_index = index

    def box(self, size, loc, mat, rot=(0.0, 0.0, 0.0)):
        verts = bmesh.ops.create_cube(self.bm, size=1.0)['verts']
        bmesh.ops.scale(self.bm, vec=Vector(size), verts=verts)
        self._place(verts, Matrix.Translation(loc) @ Euler(rot).to_matrix().to_4x4(), mat)

    def cylinder(self, radius, depth, loc, mat, top=None, segments=12, rot=(0.0, 0.0, 0.0)):
        verts = bmesh.ops.create_cone(
            self.bm, cap_ends=True, segments=segments,
            radius1=radius, radius2=radius if top is None else top, depth=depth,
        )['verts']
        self._place(verts, Matrix.Translation(loc) @ Euler(rot).to_matrix().to_4x4(), mat)

    def blob(self, size, loc, mat):
        verts = bmesh.ops.create_uvsphere(self.bm, u_segments=10, v_segments=6, radius=0.5)['verts']
        bmesh.ops.scale(self.bm, vec=Vector(size), verts=verts)
        self._place(verts, Matrix.Translation(loc), mat)

    def bar(self, start, end, thickness, mat):
        start, end = Vector(start), Vector(end)
        direction = end - start
        if direction.length < 1e-6:
            return
        verts = bmesh.ops.create_cube(self.bm, size=1.0)['verts']
        bmesh.ops.scale(self.bm, vec=Vector((direction.length, thickness, thickness)), verts=verts)
        orient = direction.to_track_quat('X', 'Z').to_matrix().to_4x4()
        self._place(verts, Matrix.Translation((start + end) / 2) @ orient, mat)

    def polyline(self, points, thickness, mat):
        for start, end in zip(points, points[1:]):
            self.bar(start, end, thickness, mat)

    def finish(self, loc=(0.0, 0.0, 0.0), parent=None, rot_z=0.0):
        if not self.bm.faces:
            self.bm.free()
            return None
        mesh = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(mesh)
        self.bm.free()
        for mat in self.materials:
            mesh.materials.append(mat)
        obj = link(bpy.data.objects.new(self.name, mesh), parent)
        obj.location = loc
        obj.rotation_euler = (0.0, 0.0, rot_z)
        return obj


def box(name, size, loc, mat, parent=None, rot_z=0.0):
    part = Merge(name)
    part.box(size, (0.0, 0.0, 0.0), mat)
    return part.finish(loc, parent, rot_z)


def cylinder(name, radius, depth, loc, mat, parent=None, segments=16):
    part = Merge(name)
    part.cylinder(radius, depth, (0.0, 0.0, 0.0), mat, segments=segments)
    return part.finish(loc, parent)


SIGN_FONTS = (
    '/System/Library/Fonts/Supplemental/Arial Black.ttf',
    '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
)


def _sign_font():
    for path in SIGN_FONTS:
        try:
            return bpy.data.fonts.load(path, check_existing=True)
        except RuntimeError:
            continue
    return None


def text(name, body, loc, size, mat, parent=None, rot_z=0.0, bold=True):
    """Upright text facing -Y (rot_z=math.pi faces +Y), baked to a mesh."""
    curve = bpy.data.curves.new(name, 'FONT')
    curve.body = body
    curve.size = size
    curve.align_x = 'CENTER'
    curve.align_y = 'CENTER'
    curve.extrude = 0.004
    font = _sign_font() if bold else None
    if font is not None:
        curve.font = font
    source = link(bpy.data.objects.new(name + '_curve', curve))
    bpy.context.view_layer.update()
    evaluated = source.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = bpy.data.meshes.new_from_object(evaluated)
    bpy.data.objects.remove(source)
    mesh.transform(Matrix.Rotation(math.pi / 2, 4, 'X'))
    mesh.materials.clear()
    mesh.materials.append(mat)
    obj = link(bpy.data.objects.new(name, mesh), parent)
    obj.location = loc
    obj.rotation_euler = (0.0, 0.0, rot_z)
    return obj
```

<!-- file: scripts/kiosk/palette.py -->
```python
"""Every material in the kiosk scene. Flat colours for now: stage 3 replaces
them with baked textures (rust, dirt, wet snow, warm light)."""

from lib import material

GOODS_COLORS = {
    'goods_red': (0.70, 0.08, 0.07),
    'goods_yellow': (0.95, 0.75, 0.10),
    'goods_blue': (0.08, 0.20, 0.62),
    'goods_green': (0.10, 0.45, 0.18),
    'goods_white': (0.90, 0.90, 0.86),
    'goods_orange': (0.92, 0.42, 0.08),
    'goods_purple': (0.35, 0.12, 0.45),
    'goods_black': (0.06, 0.06, 0.07),
    'goods_silver': (0.62, 0.64, 0.66),
    'goods_pink': (0.88, 0.40, 0.55),
}

POSTER_COLORS = {
    'poster_cream': (0.86, 0.82, 0.70),
    'poster_tan': (0.80, 0.70, 0.55),
    'poster_white': (0.92, 0.88, 0.80),
    'poster_grey': (0.70, 0.75, 0.78),
    'poster_yellow': (0.88, 0.78, 0.60),
}


def make_materials():
    m = {
        'paint': material('paint', (0.42, 0.50, 0.55)),
        'paint_dark': material('paint_dark', (0.28, 0.33, 0.36)),
        'frame': material('frame', (0.16, 0.17, 0.18), roughness=0.6, metallic=0.4),
        'glass': material('glass', (0.75, 0.85, 0.95), alpha=0.18),
        'snow': material('snow', (0.86, 0.89, 0.94)),
        'snow_trodden': material('snow_trodden', (0.55, 0.57, 0.60)),
        'sign': material('sign', (0.93, 0.90, 0.82)),
        'ink': material('ink', (0.08, 0.08, 0.09)),
        'paper': material('paper', (0.95, 0.93, 0.86)),
        'wood': material('wood', (0.45, 0.33, 0.22)),
        'cardboard': material('cardboard', (0.62, 0.47, 0.30)),
        'device': material('device', (0.18, 0.19, 0.21)),
        'plastic_light': material('plastic_light', (0.78, 0.78, 0.74)),
        'screen': material('screen', (0.35, 0.55, 0.70), emission=0.6),
        'bulb': material('bulb', (1.0, 0.72, 0.38), emission=6.0),
        'away': material('away', (0.90, 0.22, 0.18)),
        'fabric': material('fabric', (0.45, 0.10, 0.10)),
        'fabric_dark': material('fabric_dark', (0.12, 0.13, 0.16)),
        'bottle_green': material('bottle_green', (0.10, 0.32, 0.14), roughness=0.3),
        'bottle_brown': material('bottle_brown', (0.32, 0.16, 0.05), roughness=0.3),
        'bark': material('bark', (0.12, 0.11, 0.10)),
        'building': material('building', (0.30, 0.32, 0.36)),
        'window_dark': material('window_dark', (0.06, 0.07, 0.10)),
        'window_lit': material('window_lit', (1.0, 0.70, 0.40), emission=3.0),
        'goods': material('goods', (0.85, 0.72, 0.45)),
    }
    m['goods_palette'] = [material(name, color) for name, color in GOODS_COLORS.items()]
    m['posters'] = [material(name, color) for name, color in POSTER_COLORS.items()]
    return m
```

<!-- file: scripts/kiosk/dims.py -->
```python
"""Kiosk measurements shared by every build module.
Blender metres, Z up, the kiosk front faces -Y."""

W, D = 3.0, 2.0
HW, HD = W / 2, D / 2
PLINTH = 0.12                      # floor height above the snow
TOP = 2.4                          # top of the walls
WALL = 0.06
GLASS_LOW, GLASS_HIGH = 0.95, 2.25
WINDOW_L, WINDOW_R, WINDOW_TOP = -0.3, 0.3, 1.41   # serving window in the glass
DOOR_L, DOOR_R, DOOR_TOP = 0.2, 1.0, 2.05          # back door opening
DOOR_OPEN_DEG = -115

SHELF_Y = -HD + 0.2                # centre line of the showcase shelves
SHELF_LEVELS = (0.98, 1.30, 1.62, 1.94)
SLOT_LEVEL = 1.30                  # the shelf that carries the projects
SLOT_COUNT = 8
SLOT_XS = tuple(-1.2 + index * (2.4 / (SLOT_COUNT - 1)) for index in range(SLOT_COUNT))

LAMP_POST = (-3.2, -1.6)
TERMINAL = (3.0, -0.35)
```

- [ ] **Step 2: Commit**

```bash
git add scripts/kiosk/lib.py scripts/kiosk/palette.py scripts/kiosk/dims.py
git commit -m "feat: kiosk modelling kit, palette and shared measurements"
```

---

### Task 3: The kiosk

**Files:**
- Create: `scripts/kiosk/kiosk.py`

- [ ] **Step 1: Create the module**

<!-- file: scripts/kiosk/kiosk.py -->
```python
"""The kiosk itself: shell, ribs, frame, diamond grille, sign, serving window,
price list and away sign, shutters with posters and the flyer, roof snow,
the lamp over the window and the back door."""

import math
import random

from dims import (D, DOOR_L, DOOR_OPEN_DEG, DOOR_R, DOOR_TOP, GLASS_HIGH, GLASS_LOW, HD, HW,
                  PLINTH, TOP, W, WALL, WINDOW_L, WINDOW_R, WINDOW_TOP)
from geometry import grille_segments
from lib import Merge, box, cylinder, empty, text

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
    text('kiosk_sign_text', 'У МАРАТА', (0.0, -HD - 0.16, TOP + 0.38), 0.34, M['ink'])
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


def _roof_and_lamp(M):
    box('kiosk_roof', (W + 0.3, D + 0.3, 0.1), (0.0, 0.0, TOP + 0.05), M['paint_dark'])
    snow = Merge('roof_snow')
    rng = random.Random(7)
    for _ in range(14):
        snow.blob((rng.uniform(0.5, 1.2), rng.uniform(0.5, 1.0), rng.uniform(0.08, 0.16)),
                  (rng.uniform(-1.2, 1.2), rng.uniform(-0.75, 1.0), TOP + 0.1), M['snow'])
    snow.finish()

    lamp = Merge('lamp_outside')
    lamp.bar((0.0, -HD, TOP - 0.02), (0.0, -HD - 0.27, TOP - 0.02), 0.02, M['frame'])
    lamp.cylinder(0.11, 0.09, (0.0, -HD - 0.27, TOP - 0.08), M['frame'], top=0.03, segments=16)
    lamp.finish()
    cylinder('bulb_outside', 0.035, 0.07, (0.0, -HD - 0.27, TOP - 0.15), M['bulb'])


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
```

- [ ] **Step 2: Commit**

```bash
git add scripts/kiosk/kiosk.py
git commit -m "feat: detailed kiosk shell, grille, sign, shutters and roof"
```

---

### Task 4: Goods

**Files:**
- Create: `scripts/kiosk/goods.py`

- [ ] **Step 1: Create the module**

<!-- file: scripts/kiosk/goods.py -->
```python
"""Goods behind the showcase glass: four shelves packed two rows deep with
bottles, cans, boxes, crisps and chocolate, price tags, crisps hanging from a
rail, and the eight project slots on the eye-level shelf."""

import random

from dims import GLASS_HIGH, GLASS_LOW, HW, SHELF_LEVELS, SHELF_Y, SLOT_LEVEL, SLOT_XS, W
from lib import Merge, box

SHELF_DEPTH = 0.3
SHELF_THICK = 0.03
X_MIN, X_MAX = -HW + 0.12, HW - 0.12
SLOT_SIZE = (0.2, 0.13, 0.28)
WIDEST_ITEM = 0.15


def _item(merge, rng, left, y, base, max_h, M):
    """Stand one random item on `base` starting at x=`left`; return its width."""
    palette = M['goods_palette']
    color = rng.choice(palette)
    kind = rng.choices(('bottle', 'can', 'box', 'crisps', 'bars'), weights=(3, 3, 4, 2, 2))[0]
    if kind == 'bottle' and max_h >= 0.16:
        width = 0.075
        x = left + width / 2
        h = min(rng.uniform(0.16, 0.24), max_h)
        glass = rng.choice((M['bottle_green'], M['bottle_brown'], palette[4]))
        merge.cylinder(0.034, h * 0.7, (x, y, base + h * 0.35), glass, segments=10)
        merge.cylinder(0.034, h * 0.12, (x, y, base + h * 0.76), glass, top=0.014, segments=10)
        merge.cylinder(0.013, h * 0.18, (x, y, base + h * 0.91), glass, segments=8)
        merge.cylinder(0.0355, h * 0.25, (x, y, base + h * 0.4), color, segments=10)
        return width
    if kind == 'can' and max_h >= 0.12:
        width = 0.07
        x = left + width / 2
        h = 0.165 if max_h >= 0.17 and rng.random() < 0.5 else 0.12
        merge.cylinder(0.033, h, (x, y, base + h / 2), color, segments=12)
        merge.cylinder(0.03, 0.006, (x, y, base + h + 0.003), palette[8], segments=12)
        return width
    if kind == 'crisps' and max_h >= 0.2:
        width = 0.14
        merge.box((0.13, 0.045, 0.2), (left + width / 2, y, base + 0.1), color,
                  rot=(0.08, 0.0, rng.uniform(-0.1, 0.1)))
        return width
    if kind == 'bars':
        width = 0.13
        for k in range(rng.randint(3, 6)):
            merge.box((0.12, 0.035, 0.014), (left + width / 2, y + rng.uniform(-0.005, 0.005), base + 0.007 + k * 0.0145),
                      color if k % 2 else rng.choice(palette), rot=(0.0, 0.0, rng.uniform(-0.08, 0.08)))
        return width
    w = rng.uniform(0.06, 0.12)
    h = min(rng.uniform(0.09, 0.2), max_h)
    merge.box((w, rng.uniform(0.05, 0.08), h), (left + w / 2, y, base + h / 2), color)
    return w + 0.008


def _fill_row(merge, rng, y, base, max_h, M, skip=()):
    cursor = X_MIN
    while cursor < X_MAX - WIDEST_ITEM:
        blocked = [span for span in skip if cursor < span[1] and cursor + WIDEST_ITEM > span[0]]
        if blocked:
            cursor = blocked[0][1] + 0.01
            continue
        cursor += _item(merge, rng, cursor, y, base, max_h, M) + rng.uniform(0.0, 0.02)


def build(M):
    rng = random.Random(42)
    shelves = Merge('shelves')
    goods = Merge('goods_fill')
    tags = Merge('price_tags')
    inner_w = W - 0.24
    for index, level in enumerate(SHELF_LEVELS):
        shelves.box((inner_w, SHELF_DEPTH, SHELF_THICK), (0.0, SHELF_Y, level), M['wood'])
        base = level + SHELF_THICK / 2
        if index + 1 < len(SHELF_LEVELS):
            ceiling = SHELF_LEVELS[index + 1] - SHELF_THICK / 2 - 0.01
        else:
            ceiling = base + 0.09   # the top shelf stays low: crisps hang above it
        max_h = min(0.26, ceiling - base)
        skip = [(x - 0.13, x + 0.13) for x in SLOT_XS] if level == SLOT_LEVEL else ()
        _fill_row(goods, rng, SHELF_Y + 0.07, base, max_h, M)
        _fill_row(goods, rng, SHELF_Y - 0.07, base, max_h, M, skip)
        x = X_MIN + 0.05
        while x < X_MAX:
            tags.box((0.055, 0.004, 0.032), (x, SHELF_Y - SHELF_DEPTH / 2 - 0.006, level + 0.005),
                     rng.choice((M['paper'], M['goods_palette'][1])), rot=(0.0, rng.uniform(-0.1, 0.1), 0.0))
            x += rng.uniform(0.16, 0.3)
    for x in (X_MIN - 0.04, X_MAX + 0.04):
        shelves.box((0.03, SHELF_DEPTH, GLASS_HIGH - GLASS_LOW), (x, SHELF_Y, (GLASS_LOW + GLASS_HIGH) / 2), M['wood'])

    rail_z = GLASS_HIGH - 0.05
    rail_y = SHELF_Y - 0.1
    shelves.bar((X_MIN, rail_y, rail_z), (X_MAX, rail_y, rail_z), 0.012, M['frame'])
    x = X_MIN + 0.1
    while x < X_MAX - 0.1:
        goods.box((0.12, 0.03, 0.14), (x, rail_y, rail_z - 0.08), rng.choice(M['goods_palette']),
                  rot=(0.0, rng.uniform(-0.08, 0.08), 0.0))
        x += rng.uniform(0.15, 0.22)

    shelves.finish()
    goods.finish()
    tags.finish()

    for index, x in enumerate(SLOT_XS):
        slot = box(f'slot_{index}', SLOT_SIZE,
                   (x, SHELF_Y - 0.07, SLOT_LEVEL + SHELF_THICK / 2 + SLOT_SIZE[2] / 2), M['goods'])
        box(f'slot_{index}_tag', (0.1, 0.004, 0.05), (0.0, -0.085, -0.17), M['paper'], parent=slot)
```

- [ ] **Step 2: Commit**

```bash
git add scripts/kiosk/goods.py
git commit -m "feat: packed shelves, price tags and project slots"
```

---

### Task 5: Interior

**Files:**
- Create: `scripts/kiosk/interior.py`

- [ ] **Step 1: Create the module**

<!-- file: scripts/kiosk/interior.py -->
```python
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
```

- [ ] **Step 2: Commit**

```bash
git add scripts/kiosk/interior.py
git commit -m "feat: lived-in kiosk interior with TV and radio hotspots"
```

---

### Task 6: Street

**Files:**
- Create: `scripts/kiosk/street.py`

- [ ] **Step 1: Create the module**

<!-- file: scripts/kiosk/street.py -->
```python
"""Everything around the kiosk: snow, drifts, a trodden path, the lamp post
and its cable, a power line, a bench, a bin, bare trees, panel blocks far
away, and the payment terminal hotspot."""

import math
import random

from dims import HD, HW, LAMP_POST, TERMINAL, TOP
from geometry import catenary, tree_segments
from lib import Merge, box, text

TREES = ((-6.0, 6.0, 8.0), (5.5, 7.0, 7.0), (-9.0, 2.0, 9.0), (8.0, 1.0, 6.5),
         (-3.0, 11.0, 8.5), (10.0, 9.0, 7.5), (-12.0, 8.0, 8.0))
BLOCKS = ((-26.0, 40.0, 24.0, 12.0, 27.0), (2.0, 46.0, 30.0, 12.0, 33.0), (30.0, 38.0, 20.0, 12.0, 27.0),
          (-48.0, 22.0, 12.0, 30.0, 27.0), (46.0, 18.0, 12.0, 28.0, 30.0))
POWER_POLES = ((-14.0, 10.0), (0.0, 12.0), (14.0, 10.0))


def _snow(M, rng):
    box('ground_snow', (140.0, 140.0, 0.02), (0.0, 0.0, -0.01), M['snow'])
    trodden = Merge('snow_trodden')
    for k in range(9):
        t = k / 8
        trodden.blob((1.3 - t * 0.4, 0.9, 0.01), (0.2 + t * 2.0, -1.6 - t * 5.0, 0.002), M['snow_trodden'])
    trodden.finish()

    drifts = Merge('snow_drifts')
    edge = 0.2
    for k in range(10):
        x = -HW + k * (2 * HW / 9)
        if not 0.1 < x < 1.5:
            drifts.blob((0.7, 0.45, 0.35), (x, HD + edge, 0.0), M['snow'])
        drifts.blob((0.6, 0.4, 0.22), (x, -HD - edge - 0.1, 0.0), M['snow'])
    for y in (-0.6, 0.0, 0.6):
        drifts.blob((0.45, 0.7, 0.35), (-HW - edge, y, 0.0), M['snow'])
        drifts.blob((0.45, 0.7, 0.35), (HW + edge, y, 0.0), M['snow'])
    placed = 0
    while placed < 14:
        angle, radius = rng.uniform(0.0, 2 * math.pi), rng.uniform(4.0, 14.0)
        x, y = math.cos(angle) * radius, math.sin(angle) * radius
        if y < -1.0 and abs(x) < 4.5:
            continue  # keep the approach and the camera clear
        drifts.blob((rng.uniform(2.0, 4.0), rng.uniform(1.5, 3.0), rng.uniform(0.4, 0.9)), (x, y, 0.0), M['snow'])
        placed += 1
    drifts.finish()


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
    bench.finish((-2.5, -2.8, 0.0))

    bin_ = Merge('bin')
    bin_.cylinder(0.2, 0.6, (0.0, 0.0, 0.3), M['device'], top=0.24, segments=14)
    bin_.cylinder(0.25, 0.04, (0.0, 0.0, 0.6), M['frame'], segments=14)
    bin_.blob((0.4, 0.4, 0.1), (0.0, 0.0, 0.62), M['snow'])
    bin_.finish((1.9, -1.9, 0.0))


def _trees(M, rng):
    trees = Merge('trees')
    for x, y, height in TREES:
        for start, end, thickness in tree_segments(rng, (x, y, 0.0), height):
            trees.bar(start, end, max(thickness, 0.02), M['bark'])
    trees.finish()


def _blocks(M, rng):
    blocks = Merge('buildings')
    for x, y, w, d, h in BLOCKS:
        blocks.box((w, d, h), (x, y, h / 2), M['building'])
        face = y - d / 2 - 0.03
        floors, columns = int(h // 3), int(w // 2.4)
        for floor in range(floors):
            for column in range(columns):
                wx = x - w / 2 + 1.2 + column * (w - 2.4) / max(columns - 1, 1)
                lit = rng.random() < 0.18
                blocks.box((1.2, 0.06, 1.4), (wx, face, 1.8 + floor * 3), M['window_lit'] if lit else M['window_dark'])
    blocks.finish()


def _terminal(M):
    tx, ty = TERMINAL
    terminal = box('hs_terminal', (0.62, 0.45, 1.75), (tx, ty, 0.875), M['device'])
    parts = Merge('terminal_details')
    front = -0.235
    parts.box((0.66, 0.5, 0.22), (0.0, 0.0, 0.985), M['sign'])                    # light box on top
    parts.box((0.45, 0.02, 0.32), (0.0, front, 0.35), M['screen'])
    for row in range(4):
        for col in range(3):
            parts.box((0.05, 0.015, 0.035), (-0.07 + col * 0.07, front, 0.08 - row * 0.05), M['plastic_light'])
    parts.box((0.2, 0.02, 0.04), (0.0, front, -0.2), M['ink'])                      # banknote slot
    parts.box((0.12, 0.02, 0.02), (0.0, front, -0.32), M['ink'])                    # receipt slot
    parts.box((0.7, 0.5, 0.06), (0.0, 0.0, -0.845), M['frame'])                     # base
    parts.finish(parent=terminal)
    text('terminal_label', 'ОПЛАТА', (0.0, -0.255, 0.985), 0.09, M['ink'], parent=terminal)


def build(M):
    rng = random.Random(13)
    _snow(M, rng)
    _lamp_and_wires(M)
    _bench_and_bin(M)
    _trees(M, rng)
    _blocks(M, rng)
    _terminal(M)
```

- [ ] **Step 2: Commit**

```bash
git add scripts/kiosk/street.py
git commit -m "feat: snowy street with trees, wires, bench, bin and panel blocks"
```

---

### Task 7: Orchestrate and export

**Files:**
- Modify: `scripts/kiosk/build.py` (full replacement)
- Modify: `tests/kiosk-scene-file.test.mjs`
- Modify: `assets/kiosk/kiosk.glb` (generated)

- [ ] **Step 1: Extend the scene test**

<!-- file: tests/kiosk-scene-file.test.mjs -->
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { HOTSPOTS, PRESETS } from '../assets/js/kiosk/hotspots.js';
import { SLOT_COUNT } from '../assets/js/kiosk/slots.js';

const GLB = 'assets/kiosk/kiosk.glb';

function gltf() {
  const buffer = readFileSync(GLB);
  assert.equal(buffer.readUInt32LE(0), 0x46546c67, 'not a GLB file');
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8'));
}

test('the kiosk scene exports every hotspot, slot and camera preset', () => {
  const names = new Set(gltf().nodes.map(node => node.name));
  for (const node of Object.keys(HOTSPOTS)) assert.ok(names.has(node), node);
  for (let index = 0; index < SLOT_COUNT; index += 1) assert.ok(names.has(`slot_${index}`), `slot_${index}`);
  for (const preset of PRESETS) {
    assert.ok(names.has(`cam_${preset}`), `cam_${preset}`);
    assert.ok(names.has(`tgt_${preset}`), `tgt_${preset}`);
  }
});

test('the detail pass is in the scene', () => {
  const names = new Set(gltf().nodes.map(node => node.name));
  for (const node of ['kiosk_grille', 'kiosk_ribs', 'goods_fill', 'price_tags', 'interior', 'trees', 'buildings', 'snow_drifts', 'terminal_details']) {
    assert.ok(names.has(node), node);
  }
});

test('the kiosk scene stays inside the desktop budget', () => {
  const json = gltf();
  const primitives = json.nodes
    .filter(node => node.mesh !== undefined)
    .reduce((sum, node) => sum + json.meshes[node.mesh].primitives.length, 0);
  assert.ok(primitives < 400, `${primitives} draw calls`);
  assert.ok(statSync(GLB).size < 8 * 1024 * 1024);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test tests/kiosk-scene-file.test.mjs`
Expected: FAIL in «the detail pass is in the scene» (`kiosk_grille`).

- [ ] **Step 3: Replace the build script**

<!-- file: scripts/kiosk/build.py -->
```python
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
```

- [ ] **Step 4: Build and run all tests**

Run: `npm run build:kiosk`
Expected: ends with `kiosk exported: …/assets/kiosk/kiosk.glb`, exit 0, no Python traceback.

Run: `npm test`
Expected: all node tests pass (44+), Python `OK`.

- [ ] **Step 5: Commit**

```bash
git add scripts/kiosk/build.py tests/kiosk-scene-file.test.mjs assets/kiosk/kiosk.glb
git commit -m "feat: assemble the detailed kiosk scene from modules"
```

---

### Task 8: See-through grille for picking

**Files:**
- Modify: `assets/js/kiosk/hotspots.js`
- Modify: `tests/kiosk-hotspots.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/kiosk-hotspots.test.mjs`:

```js
test('the window grille never blocks what is behind it', () => {
  assert.equal(pickHotspot(['kiosk_grille', 'hs_showcase', 'slot_2']), 'slot_2');
  assert.equal(pickHotspot(['kiosk_grille', 'hs_flyer']), 'hs_flyer');
  assert.equal(pickHotspot(['kiosk_grille']), null);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test tests/kiosk-hotspots.test.mjs`
Expected: FAIL, `null !== 'slot_2'`.

- [ ] **Step 3: Implement**

In `assets/js/kiosk/hotspots.js` replace `pickHotspot` with:

```js
// Thin enough to click through: hits on these are ignored.
const SEE_THROUGH = new Set(['kiosk_grille']);

// `names` are the pickable-or-mesh names of ray hits, nearest first. The
// showcase glass is see-through: a slot behind it wins, while anything opaque
// in front of a hotspot blocks it.
export function pickHotspot(names = []) {
  let glass = null;
  for (const name of names) {
    if (SEE_THROUGH.has(name)) continue;
    if (name === 'hs_showcase') {
      glass ??= name;
      continue;
    }
    if (isPickable(name)) return name;
    return glass;
  }
  return glass;
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/kiosk-hotspots.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add assets/js/kiosk/hotspots.js tests/kiosk-hotspots.test.mjs
git commit -m "feat: clicks pass through the window grille"
```

---

### Task 9: Let the distant blocks show

**Files:**
- Modify: `assets/js/kiosk/scene.js`

- [ ] **Step 1: Longer fog and far plane**

In `assets/js/kiosk/scene.js` replace

```js
  scene.fog = new THREE.Fog(SKY, 14, 34);
```

with

```js
  scene.fog = new THREE.Fog(SKY, 18, 90);
```

and replace

```js
  const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.05, 80);
```

with

```js
  const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.05, 160);
```

- [ ] **Step 2: Commit**

```bash
git add assets/js/kiosk/scene.js
git commit -m "feat: fog reaches far enough for the panel blocks"
```

---

### Task 10: Look at it

- [ ] **Step 1:** Dev server running (`npx vite --port 5173 --strictPort`).
- [ ] **Step 2:** Screenshots at 1440×900 of `home`, `showcase`, `inside`, the back (orbit 180°), `terminal`; and 390×844 `home` (headless Playwright if the browser pane is hidden).
- [ ] **Step 3:** Check: no z-fighting on the sign and posters, goods do not poke through shelves or glass, nothing floats, every hotspot still opens its view, frame rate stays smooth.
- [ ] **Step 4:** Fix by editing parameters in the modules, rebuild with `npm run build:kiosk`, rerun `npm test`, commit `fix: tune kiosk detail after browser check`.
- [ ] **Step 5:** Save the final screenshots to `docs/superpowers/qa/kiosk-detail/` and show Marat.
