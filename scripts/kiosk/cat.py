"""A sleeping ginger tabby, modelled as anatomy rather than stacked primitives.
UV fur, smooth silhouettes, a continuous tapered tail and a tucked sleepy face.
Everything stays editable in the existing Blender build pipeline.
"""
import math

import bpy
from mathutils import Vector

from dims import PLINTH
from lib import empty, link, material


def _mesh(name, vertices, faces, mat, parent, smooth=True):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.materials.append(mat)
    obj = link(bpy.data.objects.new(name, data), parent)
    for face in data.polygons:
        face.use_smooth = smooth
    return obj


def _oval(name, size, loc, mat, parent, segments=28, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=1)
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    obj.location = loc
    obj.scale = tuple(value / 2 for value in size)
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def _stroke(name, points, radius, mat, parent):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 5
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    path = curve.splines.new('BEZIER')
    path.bezier_points.add(len(points) - 1)
    for point, loc in zip(path.bezier_points, points):
        point.co = loc
        point.handle_left_type = point.handle_right_type = 'AUTO'
    curve.materials.append(mat)
    source = link(bpy.data.objects.new(name, curve), parent)
    bpy.context.view_layer.update()
    evaluated = source.evaluated_get(bpy.context.evaluated_depsgraph_get())
    data = bpy.data.meshes.new_from_object(evaluated)
    bpy.data.objects.remove(source, do_unlink=True)
    return link(bpy.data.objects.new(name, data), parent)


def _coat():
    mat = material('cat_tabby_coat', (0.65, 0.31, 0.12), roughness=1)
    image = bpy.data.images.new('ginger_tabby_fur', width=256, height=256)
    pixels = []
    for y in range(256):
        v = y / 255
        for x in range(256):
            u = x / 255
            # Transverse mackerel stripes across the torso, not meridians
            # converging at the sphere's pole like a pumpkin.
            px = math.sin(v * math.pi) * math.cos(u * math.tau)
            py = math.sin(v * math.pi) * math.sin(u * math.tau)
            phase = px * math.pi * 6.2 + 0.65 * math.sin(py * 5) + 0.32 * math.cos(v * 13)
            stripe = max(0, math.cos(phase)) ** 12 * (0.60 + 0.3 * abs(py))
            grain = math.sin(x * 31.1 + y * 47.7) * math.sin(x * 3.3 - y * 9.2) * 0.012
            shade = 0.022 * math.cos(v * math.tau)
            pixels.extend((0.79 - stripe * 0.22 + shade + grain,
                           0.49 - stripe * 0.18 + shade + grain,
                           0.25 - stripe * 0.11 + shade + grain, 1))
    image.pixels.foreach_set(pixels)
    image.pack()
    tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = image
    bsdf = mat.node_tree.nodes['Principled BSDF']
    mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    return mat


def _ear(side, ginger, inner, head):
    s = -1 if side == 'left' else 1
    verts = [(s * 0.032, -0.036, 0.052), (s * 0.112, -0.024, 0.046),
             (s * 0.071, 0.028, 0.061), (s * 0.094, 0.002, 0.144)]
    ear = _mesh(f'cat_ear_{side}', verts, [(0, 1, 3), (1, 2, 3), (2, 0, 3), (0, 2, 1)], ginger, head)
    bevel = ear.modifiers.new('soft ear edges', 'BEVEL')
    bevel.width = 0.006
    bevel.segments = 2
    _mesh(f'cat_ear_{side}_inner', [(s * 0.049, -0.037, 0.063), (s * 0.098, -0.029, 0.059),
                                   (s * 0.090, -0.002, 0.120)], [(0, 1, 2)], inner, head, False)


def _tail(ginger, stripe, parent):
    vertices, faces = [], []
    rings, sides = 56, 12
    for index in range(rings):
        t = index / (rings - 1)
        angle = 0.52 + t * 4.33
        centre = Vector((0.275 * math.cos(angle) + 0.005, 0.195 * math.sin(angle) + 0.015,
                         0.021 + math.sin(t * math.pi) * 0.014))
        tangent = Vector((-0.275 * math.sin(angle), 0.195 * math.cos(angle), 0)).normalized()
        out = Vector((tangent.y, -tangent.x, 0))
        radius = 0.047 * (1 - 0.35 * t)
        if t > 0.91:
            radius *= math.sqrt(max(0.03, (1 - t) / 0.09))
        for side in range(sides):
            a = side * math.tau / sides
            point = centre + out * math.cos(a) * radius + Vector((0, 0, math.sin(a) * radius))
            vertices.append(tuple(point))
    for ring in range(rings - 1):
        for side in range(sides):
            next_side = (side + 1) % sides
            faces.append((ring * sides + side, ring * sides + next_side,
                          (ring + 1) * sides + next_side, (ring + 1) * sides + side))
    faces.append(tuple(range(sides - 1, -1, -1)))
    faces.append(tuple((rings - 1) * sides + side for side in range(sides)))
    tail = _mesh('cat_tail', vertices, faces, ginger, parent)
    tail.data.materials.append(stripe)
    for index, polygon in enumerate(tail.data.polygons):
        ring = index // sides
        polygon.material_index = int(ring % 9 in (3, 4))


def build(M):
    x, y = -0.82, 0.03
    quilt = material('cat_quilt', (0.27, 0.105, 0.095))
    thread = material('cat_quilt_thread', (0.48, 0.23, 0.18))
    bed = _oval('cat_bed', (0.72, 0.55, 0.11), (x, y, PLINTH + 0.055), quilt, None)
    _stroke('cat_bed_hem', [(0.337 * math.cos(k * math.tau / 24), 0.245 * math.sin(k * math.tau / 24), 0.014)
                           for k in range(25)], 0.0025, thread, bed)
    # Bed has object scale; keep the seam separate in metre coordinates.
    hem = bpy.data.objects['cat_bed_hem']
    hem.parent = None
    hem.location = bed.location
    cat = empty('hs_cat', (x, y, PLINTH + 0.13), rot_z=math.pi - 0.65)
    ginger = material('cat_ginger', (0.57, 0.22, 0.07), roughness=1)
    cream = material('cat_cream', (0.83, 0.67, 0.43), roughness=1)
    stripe = material('cat_stripes', (0.37, 0.16, 0.055), roughness=1)
    eye = material('cat_eye', (0.055, 0.032, 0.024))
    pink = material('cat_nose', (0.46, 0.20, 0.15))
    inner = material('cat_ear_pink', (0.57, 0.31, 0.22))
    _oval('cat_body', (0.54, 0.395, 0.25), (0.025, 0.043, 0.09), _coat(), cat, 32, 20)
    _oval('cat_haunch', (0.24, 0.24, 0.20), (0.145, 0.015, 0.068), ginger, cat)
    _tail(ginger, stripe, cat)
    for side, loc in [('left', (-0.055, -0.167, 0.017)), ('right', (-0.135, -0.17, 0.019))]:
        _oval(f'cat_paw_{side}', (0.132, 0.093, 0.066), loc, cream, cat, 20, 12)
        for toe in (-0.022, 0.012):
            _stroke(f'cat_{side}_toe_{toe}', [(loc[0] + toe, loc[1] - 0.042, loc[2]),
                    (loc[0] + toe, loc[1] - 0.037, loc[2] + 0.019)], 0.001, stripe, cat)
    head = empty('cat_face', (-0.165, -0.080, 0.10), cat, rot_z=-0.18)
    head.rotation_euler.x = -0.12
    _oval('cat_head', (0.244, 0.21, 0.203), (0, 0, 0), ginger, head, 32, 20)
    for side in ('left', 'right'):
        _ear(side, ginger, inner, head)
    for side, sign in [('left', -1), ('right', 1)]:
        _oval(f'cat_cheek_{side}', (0.074, 0.046, 0.056), (sign * 0.028, -0.111, -0.029), cream, head, 20, 12)
        points = []
        for k in range(9):
            dx = sign * 0.049 + (k / 8 - 0.5) * 0.064
            z = 0.011 - math.sin(k * math.pi / 8) * 0.009
            front = -0.105 * math.sqrt(max(0.1, 1 - (dx / 0.122) ** 2 - (z / 0.1015) ** 2)) - 0.004
            points.append((dx, front, z))
        _stroke(f'cat_eye_{side}', points, 0.0025, eye, head)
        for index in range(3):
            _stroke(f'cat_whisker_{side}_{index}', [(sign * 0.035, -0.138, -0.027),
                    (sign * 0.087, -0.145, -0.016 + index * 0.011),
                    (sign * 0.145, -0.152, -0.008 + index * 0.016)], 0.0008, cream, head)
    _mesh('cat_nose_tip', [(-0.014, -0.121, -0.002), (0.014, -0.121, -0.002),
                          (0, -0.134, -0.015), (0, -0.118, -0.022)], [(0, 1, 2), (0, 2, 3), (1, 3, 2)], pink, head)
    for sign in (-1, 1):
        _stroke(f'cat_mouth_{sign}', [(0, -0.126, -0.015), (0, -0.127, -0.034),
                (sign * 0.018, -0.125, -0.040)], 0.0012, eye, head)
    for index, dx in enumerate((-0.043, 0, 0.043)):
        points = []
        for px, z in ((dx * 0.6, 0.071), (dx * 0.8, 0.044), (dx, 0.030)):
            front = -0.105 * math.sqrt(1 - (px / 0.122) ** 2 - (z / 0.1015) ** 2) - 0.003
            points.append((px, front, z))
        _stroke(f'cat_forehead_stripe_{index}', points, 0.0018, stripe, head)
