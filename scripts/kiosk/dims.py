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
