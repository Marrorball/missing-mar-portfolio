"""A sleeping ginger tabby curled on a quilted bed. Body, haunch, chest,
paws, head and cheeks are one metaball surface, so the cat reads as one soft
animal rather than a pile of ovals; its stripes and cream chest are painted on
that surface. Ears, the closed eyes, nose, whiskers and the tail are separate.
"""
import math

import bpy
from mathutils import Euler, Vector

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


# A metaball surface sits at ~0.571 of an element's radius (stiffness 2).
SURFACE = 0.571
HEAD = Vector((-0.165, -0.080, 0.10))
HEAD_TURN = Euler((-0.12, 0.0, -0.18))
CURL = Vector((0.03, 0.04, 0.0))


GINGER = Vector((0.57, 0.22, 0.07))
STRIPE = Vector((0.24, 0.085, 0.03))
CREAM = Vector((0.83, 0.67, 0.43))


def _smooth(edge0, edge1, value):
    t = max(0.0, min(1.0, (value - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)


def _ball(elements, co, half, turn=None):
    """An ellipsoid element whose visible half-extents are `half` (metres)."""
    radius = 0.2
    element = elements.new(type='ELLIPSOID')
    element.co = co
    element.radius = radius
    element.stiffness = 2.0
    element.size_x, element.size_y, element.size_z = (h / (SURFACE * radius) for h in half)
    if turn is not None:
        element.rotation = turn.to_quaternion()


def _fur_material():
    """Base colour from the mesh's own painted fur, so stripes are soft."""
    mat = material('cat_fur', (1.0, 1.0, 1.0), roughness=1)
    nodes = mat.node_tree.nodes
    if 'fur' not in nodes:
        attribute = nodes.new('ShaderNodeVertexColor')
        attribute.name = 'fur'
        attribute.layer_name = 'fur'
        mat.node_tree.links.new(attribute.outputs['Color'], nodes['Principled BSDF'].inputs['Base Color'])
    return mat


def _surface(name, parent, add_elements, paint):
    """Melt metaball elements into one smooth mesh and paint its fur."""
    meta = bpy.data.metaballs.new(f'{name}_field')
    meta.resolution = meta.render_resolution = 0.01
    source = link(bpy.data.objects.new(f'{name}_field', meta), parent)
    add_elements(meta.elements)
    bpy.context.view_layer.update()
    data = bpy.data.meshes.new_from_object(source.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(source, do_unlink=True)
    bpy.data.metaballs.remove(meta)
    data.name = name
    data.materials.append(_fur_material())
    fur = data.color_attributes.new('fur', 'FLOAT_COLOR', 'POINT')
    for vertex in data.vertices:
        r, g, b = paint(vertex.co, vertex.normal)
        fur.data[vertex.index].color = (r, g, b, 1.0)
    for polygon in data.polygons:
        polygon.use_smooth = True
    return link(bpy.data.objects.new(name, data), parent)


PAWS = (Vector((-0.055, -0.168, 0.02)), Vector((-0.135, -0.172, 0.022)))


def _body(parent):
    def elements(balls):
        # the curl, from the rump round the back to the shoulder
        _ball(balls, (0.15, 0.0, 0.065), (0.11, 0.11, 0.09))
        _ball(balls, (0.11, 0.105, 0.078), (0.12, 0.11, 0.092))
        _ball(balls, (0.0, 0.145, 0.08), (0.13, 0.10, 0.092))
        _ball(balls, (-0.115, 0.095, 0.078), (0.11, 0.11, 0.088))
        _ball(balls, (-0.17, -0.01, 0.065), (0.095, 0.10, 0.08))
        _ball(balls, (0.02, 0.04, 0.05), (0.17, 0.13, 0.07))        # tucked belly
        _ball(balls, (-0.09, -0.09, 0.04), (0.08, 0.07, 0.055))     # chest under the chin
        for paw in PAWS:
            _ball(balls, paw, (0.062, 0.044, 0.03))

    def paint(co, normal):
        offset = Vector((co.x - CURL.x, co.y - CURL.y))
        reach = offset.length
        angle = math.atan2(offset.y, offset.x)
        # mackerel bands across the spine, on the outer back of the curl only
        band = math.sin(angle * 9.0 + 0.6 * math.sin(angle * 3.0) + reach * 14.0)
        stripe = _smooth(0.2, 0.6, band) * _smooth(0.03, 0.09, reach) * _smooth(-0.2, 0.3, normal.z)
        colour = GINGER.lerp(STRIPE, stripe) * (0.92 + 0.08 * max(0.0, normal.z))
        cream = max(max(_smooth(0.07, 0.035, (co - paw).length) for paw in PAWS),
                    _smooth(0.03, -0.02, co.y + 0.05) * _smooth(0.07, 0.02, co.z))
        return colour.lerp(CREAM, cream)

    return _surface('cat_body', parent, elements, paint)


def _head(parent):
    """Head, cheeks and muzzle melted together, resting against the body."""
    turn = HEAD_TURN.to_matrix()
    cheeks = [HEAD + turn @ Vector((sign * 0.03, -0.097, -0.032)) for sign in (-1, 1)]
    chin = HEAD + turn @ Vector((0.0, -0.085, -0.06))

    def elements(balls):
        _ball(balls, HEAD, (0.118, 0.10, 0.095), HEAD_TURN)
        for cheek in cheeks:
            _ball(balls, cheek, (0.036, 0.026, 0.027), HEAD_TURN)
        _ball(balls, chin, (0.03, 0.025, 0.02), HEAD_TURN)

    def paint(co, normal):
        muzzle = max(_smooth(0.05, 0.02, min((co - cheek).length for cheek in cheeks)),
                     _smooth(0.04, 0.015, (co - chin).length))
        return (GINGER * (0.9 + 0.1 * max(0.0, normal.z))).lerp(CREAM, muzzle)

    return _surface('cat_head', parent, elements, paint)


def _ear(side, ginger, inner, head):
    s = -1 if side == 'left' else 1
    verts = [(s * 0.026, -0.03, 0.08), (s * 0.088, -0.022, 0.058),
             (s * 0.056, 0.028, 0.073), (s * 0.07, 0.0, 0.16)]
    ear = _mesh(f'cat_ear_{side}', verts, [(0, 1, 3), (1, 2, 3), (2, 0, 3), (0, 2, 1)], ginger, head)
    bevel = ear.modifiers.new('soft ear edges', 'BEVEL')
    bevel.width = 0.006
    bevel.segments = 2
    _mesh(f'cat_ear_{side}_inner', [(s * 0.036, -0.032, 0.083), (s * 0.08, -0.026, 0.066),
                                   (s * 0.067, -0.006, 0.142)], [(0, 1, 2)], inner, head, False)


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
    _body(cat)
    _head(cat)
    _tail(ginger, stripe, cat)
    for side, loc in [('left', (-0.055, -0.168, 0.02)), ('right', (-0.135, -0.172, 0.022))]:
        for toe in (-0.022, 0.012):
            _stroke(f'cat_{side}_toe_{toe}', [(loc[0] + toe, loc[1] - 0.045, loc[2] - 0.004),
                    (loc[0] + toe, loc[1] - 0.04, loc[2] + 0.02)], 0.0012, stripe, cat)
    head = empty('cat_face', tuple(HEAD), cat)
    head.rotation_euler = HEAD_TURN
    for side in ('left', 'right'):
        _ear(side, ginger, inner, head)
    for side, sign in [('left', -1), ('right', 1)]:
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
    _mesh('cat_nose_tip', [(-0.013, -0.119, -0.004), (0.013, -0.119, -0.004),
                          (0, -0.129, -0.016), (0, -0.116, -0.022)], [(0, 1, 2), (0, 2, 3), (1, 3, 2)], pink, head)
    for sign in (-1, 1):
        _stroke(f'cat_mouth_{sign}', [(0, -0.125, -0.017), (0, -0.126, -0.034),
                (sign * 0.018, -0.124, -0.040)], 0.0012, eye, head)
    for index, dx in enumerate((-0.043, 0, 0.043)):
        points = []
        for px, z in ((dx * 0.6, 0.071), (dx * 0.8, 0.044), (dx, 0.030)):
            front = -0.105 * math.sqrt(1 - (px / 0.122) ** 2 - (z / 0.1015) ** 2) - 0.003
            points.append((px, front, z))
        _stroke(f'cat_forehead_stripe_{index}', points, 0.0018, stripe, head)
