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
SLOT_LEVEL = 1.30                  # the shelf that carries the hits
SLOT_COUNT = 8
SLOT_XS = tuple(-1.2 + index * (2.4 / (SLOT_COUNT - 1)) for index in range(SLOT_COUNT))

CHAIR = (0.25, 0.10)
TV = (-1.22, 0.3, 1.75)            # centre of the TV body, screen faces +X
RACK = (-2.35, -1.85)              # street display, ahead of the left shutter
RACK_FACES, RACK_POCKETS = 4, 8
RACK_TOP_ROW, RACK_ROW_STEP = 1.43, 0.27

LAMP_POST = (-3.2, -1.6)
TERMINAL = (3.0, -0.35)
BILLBOARD = (0.0, 6.0)
BILLBOARD_FACE = (4.8, 2.4, 4.2)   # width, height, centre height
