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
