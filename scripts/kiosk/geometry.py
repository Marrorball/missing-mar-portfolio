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
