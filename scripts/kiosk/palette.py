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
        'snow_trodden': material('snow_trodden', (0.74, 0.77, 0.81)),
        'sign': material('sign', (0.93, 0.90, 0.82)),
        'ink': material('ink', (0.08, 0.08, 0.09)),
        'paper': material('paper', (0.95, 0.93, 0.86)),
        'wood': material('wood', (0.45, 0.33, 0.22)),
        'cardboard': material('cardboard', (0.62, 0.47, 0.30)),
        'device': material('device', (0.18, 0.19, 0.21)),
        'tv_plastic': material('tv_plastic', (0.035, 0.035, 0.04), roughness=0.45),
        'terminal_orange': material('terminal_orange', (0.88, 0.29, 0.045), roughness=0.72),
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
        'window_lit': material('window_lit', (1.0, 0.70, 0.40), emission=1.6),
        'goods': material('goods', (0.85, 0.72, 0.45)),
    }
    m['goods_palette'] = [material(name, color) for name, color in GOODS_COLORS.items()]
    m['posters'] = [material(name, color) for name, color in POSTER_COLORS.items()]
    return m
