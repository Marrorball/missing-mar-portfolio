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

# A separate legible calendar grid; the concert photo panel remains a separate
# image/mesh so month typography and dates are always deterministic.
import calendar as calendar_dates
import math
cal=Image.new('RGB',(512,320),'#f5ecd5'); d=ImageDraw.Draw(cal)
d.rectangle((0,0,511,319),outline='#a92f27',width=8)
d.rectangle((0,0,512,60),fill='#a92f27'); centered(d,(256,31),'ИЮНЬ 2004',34,'#fff4dc')
for col,t in enumerate(['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС']): centered(d,(45+col*70,84),t,22,'#a92f27')
for row,week in enumerate(calendar_dates.monthcalendar(2004,6)):
    for col,day in enumerate(week):
        if not day: continue
        x,y=45+col*70,126+row*39
        centered(d,(x,y),str(day),30,'#ae2f26' if col>4 else '#382a24')
        if day==30:
            points=[]
            for k in range(81):
                a=2*math.pi*k/80; wobble=1.3*math.sin(a*3+.7)+.8*math.sin(a*7)
                points.append((x+(28+wobble)*math.cos(a),y+(20+wobble)*math.sin(a)))
            d.line(points,fill='#ca2926',width=4)
            d.arc((x-29,y-22,x+28,y+21),210,290,fill='#c72a25',width=3)
cal.save(OUT/'calendar-june-2004.png',optimize=True)
photo=Image.open(OUT/'props-source/calendar-tatu.jpg').convert('RGB')
photo.thumbnail((768,526))
photo.save(OUT/'calendar-tatu.jpg',quality=88,optimize=True)
