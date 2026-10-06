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

    def blob(self, size, loc, mat, segments=10, rings=6, smooth=False):
        verts = bmesh.ops.create_uvsphere(self.bm, u_segments=segments, v_segments=rings, radius=0.5)['verts']
        bmesh.ops.scale(self.bm, vec=Vector(size), verts=verts)
        self._place(verts, Matrix.Translation(loc), mat)
        for face in {face for vert in verts for face in vert.link_faces}:
            face.smooth = smooth

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


def text(name, body, loc, size, mat, parent=None, rot_z=0.0, bold=True, font_path=None, curve_resolution=12, extrusion=0.004):
    """Upright text facing -Y (rot_z=math.pi faces +Y), baked to a mesh."""
    curve = bpy.data.curves.new(name, 'FONT')
    curve.body = body
    curve.size = size
    curve.align_x = 'CENTER'
    curve.align_y = 'CENTER'
    curve.extrude = extrusion
    curve.resolution_u = curve_resolution
    font = bpy.data.fonts.load(font_path, check_existing=True) if font_path else (_sign_font() if bold else None)
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


def screen(name, loc, width, height, rot_z=0.0, parent=None):
    """Anchor for an in-scene HTML page: the centre of the screen, facing its
    local -Y. The size travels to the site as glTF extras."""
    obj = empty(name, loc, parent=parent, rot_z=rot_z)
    obj['width'] = width
    obj['height'] = height
    return obj
