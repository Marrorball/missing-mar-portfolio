"""A 0.33 l can of no-name cola: 66 mm across, 115 mm tall, a tapered
bottom, a necked silver lid with a ring pull, a red body with «КОЛА» and a
white wave printed round it. One stands on the bin rim, its twin on the
seller's counter."""

import math

from lib import Merge, empty, material, text

R = 0.0331
BODY = (0.012, 0.100)       # red printed part, bottom to top
NECK_R = 0.0272
LID_Z = 0.112


def _materials():
    return (
        material('cola_red', (0.68, 0.016, 0.025), emission=0.08, roughness=0.32, metallic=0.35),
        material('cola_print', (0.98, 0.96, 0.91), emission=0.1),
        material('cola_silver', (0.66, 0.68, 0.70), roughness=0.22, metallic=0.85),
    )


def _wrap(obj, radius):
    """Bend flat lettering facing -Y round the can instead of floating on a card."""
    for vertex in obj.data.vertices:
        x = vertex.co.x
        vertex.co.y += radius - math.sqrt(max(1e-6, radius ** 2 - x ** 2))


def build_can(name, loc, rot_z, M):
    red, ink, silver = _materials()
    can = empty(name, loc, rot_z=rot_z)

    shell = Merge(f'{name}_shell')
    low, high = BODY
    shell.cylinder(R, high - low, (0.0, 0.0, (low + high) / 2), red, segments=40)
    shell.cylinder(0.027, 0.006, (0.0, 0.0, 0.003), silver, top=0.031, segments=40)          # foot
    shell.cylinder(0.031, low - 0.006, (0.0, 0.0, (low + 0.006) / 2), silver, top=R, segments=40)
    shell.cylinder(R, LID_Z - high, (0.0, 0.0, (high + LID_Z) / 2), silver, top=NECK_R, segments=40)
    shell.cylinder(NECK_R + 0.0008, 0.003, (0.0, 0.0, LID_Z + 0.0015), silver, segments=40)  # rim
    shell.cylinder(NECK_R - 0.002, 0.001, (0.0, 0.0, LID_Z + 0.0025), M['frame'], segments=40)
    shell.blob((0.013, 0.024, 0.002), (0.0, 0.006, LID_Z + 0.0035), silver, 16, 6, True)      # ring pull
    shell.blob((0.009, 0.012, 0.0012), (0.0, -0.012, LID_Z + 0.0032), M['ink'], 12, 6, True)  # mouth
    shell.finish(parent=can)

    label = text(f'{name}_label', 'КОЛА', (0.0, -R - 0.0004, 0.061), 0.021, ink, parent=can,
                 curve_resolution=3, extrusion=0.0002)
    _wrap(label, R + 0.0004)

    wave = Merge(f'{name}_wave')
    points = []
    for index in range(25):
        angle = -1.25 + index * 2.5 / 24
        points.append((math.sin(angle) * (R + 0.0006), -math.cos(angle) * (R + 0.0006),
                       0.034 + 0.005 * math.sin(index * 0.55)))
    wave.polyline(points, 0.0025, ink)
    wave.finish(parent=can)
    return can
