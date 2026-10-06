"""Bake small shared textures for the procedural kiosk props (Pillow)."""
from pathlib import Path
import random
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/kiosk'
FONT = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
def font(size): return ImageFont.truetype(FONT, size)
def centered(d, xy, value, size, fill):
    d.text(xy, value, font=font(size), fill=fill, anchor='mm')
atlas = Image.new('RGB', (1024, 1024), '#ece4cd')
# 4 x 4 cells of 256 px. 0-7 keep their old places; 8-15 are the 2000s
# kiosk range: drinks, juice, crunchy snacks, gum, noodles.
colors = ['#edc748', '#c65b31', '#4d2818', '#2f6fb3', '#642821', '#154f3d', '#eee7d4', '#9b1d22',
          '#e8d64a', '#e9dfc4', '#f3efe4', '#b72822', '#1b1b1d', '#1d4f9b', '#f2a7c3', '#d8312a']

def ring_text(d, xy, value, size, fill, outline=None):
    if outline:
        for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2)):
            centered(d, (xy[0] + dx, xy[1] + dy), value, size, outline)
    centered(d, xy, value, size, fill)

for i, color in enumerate(colors):
    tile = Image.new('RGB', (256,256), color); d=ImageDraw.Draw(tile)
    if i in (0,1):
        d.ellipse((40,65,216,158),fill='#ab2520'); centered(d,(128,110),'ЧИПСЫ',32,'#fff4d4')
        centered(d,(128,169),'СОЛЬ' if i==0 else 'ПАПРИКА',18,'#fff4d4')
        for x,y in [(74,209),(119,214),(168,209)]:
            d.ellipse((x-29,y-16,x+29,y+16),fill='#f6db81',outline='#b98c3b',width=2)
            for dy in (-7,0,7): d.line((x-20,y+dy,x+20,y+dy), fill='#d4ad53',width=2)
    elif i==2:
        src=Image.open(OUT/'props-source/snickers.png').convert('RGBA')
        src=src.crop((70,325,569,466)); src.thumbnail((236,90))
        tile.paste(src,((256-src.width)//2,80),src)
        centered(d,(128,188),'CHOCOLATE',15,'#dcb48d')
    elif i==3:   # a pack of gum sticks
        d.rectangle((0,0,256,256),fill='#2f6fb3'); d.rectangle((0,88,256,168),fill='#f5f2ea')
        ring_text(d,(128,52),'ЖВАЧКА',40,'#fff',outline='#173c6e')
        centered(d,(128,128),'МЯТНАЯ',34,'#2f6fb3'); centered(d,(128,206),'5 ПЛАСТИНОК',18,'#e9f1fb')
    elif i==4:
        centered(d,(128,87),'КОФЕ',38,'#ead0a4'); centered(d,(128,124),'CLASSIC',18,'#ead0a4')
        d.ellipse((77,151,180,205),fill='#fff0cd'); d.ellipse((87,154,170,184),fill='#38251c')
    elif i==5:
        d.rectangle((21,23,235,234),outline='#c6ad76',width=4)
        centered(d,(128,80),'ЧАЙ',42,'#e2c99a'); centered(d,(128,128),'ИНДИЙСКИЙ',17,'#e2c99a')
        centered(d,(128,182),'100 г',22,'#e2c99a')
    elif i==6:
        for y in range(25,256,15): d.line((0,y,256,y),fill='#a6bcc4',width=1)
        d.line((31,0,31,256),fill='#c7736b',width=2)
        centered(d,(125,34),'ЗАПИСИ / СМЕНА',14,'#424d62')
        for k,t in enumerate(['хлеб   12','чай     18','сдача  150','заказать молоко']): d.text((42,65+k*30),t,font=font(14),fill='#465d75')
    elif i==7:   # chocolate bar wrapper
        d.rectangle((0,0,256,256),fill='#9b1d22'); d.rectangle((0,170,256,256),fill='#f3e6c8')
        ring_text(d,(128,70),'ШОКОЛАД',38,'#f6e2b5',outline='#5e0f12'); centered(d,(128,122),'МОЛОЧНЫЙ',24,'#f6e2b5')
        for x in (70,128,186): d.ellipse((x-22,190,x+22,236),fill='#5a3220'); d.line((x,194,x,232),fill='#8a5434',width=3)
    elif i==8:   # lemonade label
        d.ellipse((14,30,242,226),fill='#f7f3df',outline='#2d7a3a',width=6)
        ring_text(d,(128,92),'ЛИМОНАД',34,'#2d7a3a')
        d.ellipse((92,118,164,190),fill='#f4d13a',outline='#c79a1d',width=3)
        for k in range(8):
            import math as _m; a=k*_m.pi/4; d.line((128,154,128+30*_m.cos(a),154+30*_m.sin(a)),fill='#e9bd26',width=3)
        centered(d,(128,206),'0,5 л',18,'#2d7a3a')
    elif i==9:   # beer label
        d.rectangle((0,0,256,256),fill='#e9dfc4'); d.ellipse((10,26,246,230),fill='#f6efd8',outline='#8c1d1d',width=6)
        centered(d,(128,82),'ПИВО',46,'#8c1d1d'); centered(d,(128,130),'ЖИГУЛЁВСКОЕ',22,'#3c2a18')
        for k in range(5): d.ellipse((96+k*14,156,108+k*14,184),fill='#c9a24a')
        centered(d,(128,204),'0,5 л',18,'#3c2a18')
    elif i==10:  # apple juice carton front
        d.rectangle((0,0,256,62),fill='#2f8a3a'); centered(d,(128,32),'СОК',38,'#fff')
        centered(d,(128,90),'ЯБЛОЧНЫЙ',26,'#2f8a3a')
        d.ellipse((76,112,180,212),fill='#d9302a'); d.ellipse((96,126,124,150),fill='#f06a62')
        d.line((128,112,134,92),fill='#5a3a1c',width=5); d.ellipse((134,90,168,108),fill='#3f9c3c')
        centered(d,(128,236),'1 литр',18,'#2f8a3a')
    elif i==11:  # croutons bag
        d.rectangle((0,0,256,256),fill='#b72822')
        ring_text(d,(128,70),'СУХАРИКИ',36,'#ffe14d',outline='#5b0f0d')
        centered(d,(128,118),'ХОЛОДЕЦ',22,'#fff'); centered(d,(128,144),'С ХРЕНОМ',22,'#fff')
        for x,y in [(70,196),(118,206),(166,192),(200,214)]: d.rounded_rectangle((x-20,y-14,x+20,y+14),5,fill='#d9a45a',outline='#8c5a24',width=2)
    elif i==12:  # sunflower seeds bag
        d.rectangle((0,0,256,256),fill='#1b1b1d')
        ring_text(d,(128,54),'СЕМЕЧКИ',36,'#ffcf2e')
        for k in range(14):
            import math as _m; a=k*_m.tau/14; cx,cy=128+44*_m.cos(a),148+44*_m.sin(a)
            d.ellipse((cx-16,cy-16,cx+16,cy+16),fill='#f7c21c')
        d.ellipse((92,112,164,184),fill='#4a2b14')
        centered(d,(128,230),'ЖАРЕНЫЕ',20,'#ffcf2e')
    elif i==13:  # gin-tonic can wrap
        d.rectangle((0,0,256,256),fill='#1d4f9b'); d.rectangle((0,150,256,256),fill='#c7d3dc')
        ring_text(d,(128,60),'ДЖИН-',36,'#fff'); ring_text(d,(128,104),'ТОНИК',36,'#fff')
        d.ellipse((96,166,160,230),fill='#7ac043',outline='#3e7a24',width=4)
        for k in range(6):
            import math as _m; a=k*_m.pi/3; d.line((128,198,128+26*_m.cos(a),198+26*_m.sin(a)),fill='#cfe9a8',width=3)
    elif i==14:  # gum display box: «love is…» style
        d.rectangle((0,0,256,256),fill='#f2a7c3')
        ring_text(d,(128,50),'ЖВАЧКА',30,'#fff',outline='#c43c74')
        centered(d,(128,96),'ЛЮБОВЬ ЭТО…',26,'#c43c74')
        for x,y in [(80,160),(176,160),(128,206)]:
            d.ellipse((x-22,y-18,x,y+4),fill='#e2245a'); d.ellipse((x,y-18,x+22,y+4),fill='#e2245a')
            d.polygon([(x-21,y-3),(x+21,y-3),(x,y+22)],fill='#e2245a')
    else:        # instant noodles cup wrap
        d.rectangle((0,0,256,256),fill='#d8312a'); d.rectangle((0,70,256,186),fill='#ffd23c')
        ring_text(d,(128,38),'ЛАПША',36,'#fff')
        centered(d,(128,112),'БЫСТРОГО',22,'#9b1b16'); centered(d,(128,144),'ПРИГОТОВЛЕНИЯ',18,'#9b1b16')
        centered(d,(128,222),'ГОВЯДИНА',22,'#fff')
    atlas.paste(tile,((i%4)*256,(i//4)*256))
atlas.save(OUT/'props-atlas.png',optimize=True)
blanket=Image.new('RGB',(256,256),'#5e736d'); d=ImageDraw.Draw(blanket)
for a in range(-32,288,64):
    d.rectangle((a,0,a+24,256),fill='#384d52'); d.rectangle((0,a,256,a+24),fill='#384d52')
    d.line((a+30,0,a+30,256),fill='#c5b28a',width=3); d.line((0,a+30,256,a+30),fill='#c5b28a',width=3)
rng=random.Random(91)
for y in range(256):
    for x in range(0,256,2):
        if rng.random()<.23: d.point((x,y),fill='#84918a')
blanket.save(OUT/'blanket-plaid.png',optimize=True)

# The wall calendar, one printed sheet: the photo on top, then June 2004 laid
# out the Russian way (weekdays down the side, weeks across), May and July in
# small on the right, the punched holes for the wire binding along the top and
# the notch for the hanger. 720 x 1056 px is the 0.30 x 0.44 m sheet.
import calendar as calendar_dates
import math
CAL_W, CAL_H = 720, 1056
WALL_PAINT = '#8f9ca3'          # the kiosk wall seen through the holes
RED, INK, GREY = '#c8202a', '#2a2522', '#77706a'
def face(name, size): return ImageFont.truetype(f'/System/Library/Fonts/Supplemental/{name}.ttf', size)
cal = Image.new('RGB', (CAL_W, CAL_H), '#f8f6f0'); d = ImageDraw.Draw(cal)
rng = random.Random(2004)
for _ in range(9000):           # paper grain
    x, y = rng.randrange(CAL_W), rng.randrange(CAL_H); d.point((x, y), fill='#ece8df')
# wire-o holes every 8.8 mm, none where the hanger notch is
pitch = CAL_W * 0.0088 / 0.30
for k in range(int(CAL_W / pitch)):
    x = (k + 0.5) * pitch
    if abs(x - CAL_W / 2) < 34: continue
    d.rounded_rectangle((x - 4, 12, x + 4, 24), 2, fill=WALL_PAINT)
d.pieslice((CAL_W / 2 - 26, -26, CAL_W / 2 + 26, 26), 0, 180, fill=WALL_PAINT)
# the photo, cropped from the top of the heads down to the belts
photo = Image.open(OUT / 'props-source/calendar-tatu.jpg').convert('RGB')
box = (36, 46, CAL_W - 36, 628)
frame_w, frame_h = box[2] - box[0], box[3] - box[1]
crop_w = 1040; crop_h = round(crop_w * frame_h / frame_w)
photo = photo.crop((80, 60, 80 + crop_w, 60 + crop_h)).resize((frame_w, frame_h), Image.LANCZOS)
cal.paste(photo, box[:2])
d.text((box[2], box[3] + 6), 't.A.T.u.', font=face('Arial Italic', 15), fill=GREY, anchor='ra')
d.text((40, 708), 'ИЮНЬ', font=face('Arial Bold', 60), fill=RED, anchor='ls')
d.text((CAL_W - 40, 708), '2004', font=face('Arial Bold', 60), fill='#4a4440', anchor='rs')
d.line((40, 724, CAL_W - 40, 724), fill=RED, width=3)
DAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']
HOLIDAYS = {5: {1, 2, 9}, 6: {12}, 7: set()}
def month(m, x0, y0, col, row, size, label_size, labels=True):
    weeks = calendar_dates.monthcalendar(2004, m)
    for r, name in enumerate(DAYS):
        y = y0 + r * row
        if labels:
            d.text((x0, y), name, font=face('Arial Bold', label_size), fill=RED if r > 4 else GREY, anchor='lm')
        for c, week in enumerate(weeks):
            day = week[r]
            if not day: continue
            red = r > 4 or day in HOLIDAYS[m]
            d.text((x0 + col * (c + 1.4), y), str(day), font=face('Arial Bold' if size > 20 else 'Arial', size),
                   fill=RED if red else INK, anchor='rm')
    return weeks
weeks = month(6, 44, 760, 76, 41, 34, 22)
# the 30th circled in red marker, a little lopsided
c = next(c for c, week in enumerate(weeks) if 30 in week)
x, y = 44 + 76 * (c + 1.4) - 18, 760 + 2 * 41
points = []
for k in range(91):
    a = 2.15 * math.pi * k / 90 - 0.4; wobble = 1.4 * math.sin(a * 3 + .7) + .8 * math.sin(a * 7)
    points.append((x + (32 + wobble + k * .05) * math.cos(a), y + (22 + wobble) * math.sin(a)))
d.line(points, fill='#d4232a', width=4, joint='curve')
d.line((476, 744, 476, 1030), fill='#ddd6cb', width=2)
for m, name, y0 in ((5, 'МАЙ', 750), (7, 'ИЮЛЬ', 902)):
    d.text((500, y0), name, font=face('Arial Bold', 17), fill=RED, anchor='lm')
    month(m, 500, y0 + 24, 27, 17.5, 14, 11)
cal.save(OUT / 'calendar-june-2004.jpg', quality=90, optimize=True)
