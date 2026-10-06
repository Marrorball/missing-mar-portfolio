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
atlas = Image.new('RGB', (1024, 512), '#ece4cd')
colors = ['#edc748', '#c65b31', '#4d2818', '#83b6ca', '#642821', '#154f3d', '#eee7d4', '#eee7d4']
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
    elif i==3:
        d.ellipse((20,54,236,168),fill='#f1f1da'); centered(d,(128,110),'МЯТА',36,'#233d7e')
        centered(d,(128,187),'ЖЕВАТЕЛЬНАЯ РЕЗИНКА',12,'#16385f')
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
    else:
        d.rectangle((0,0,256,60),fill='#b4342b'); centered(d,(128,30),'ДЕКАБРЬ 2004',23,'#fff5dc')
        for col,t in enumerate(['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС']): centered(d,(22+col*35,81),t,13,'#58504b')
        for n in range(1,32):
            col=(n+1)%7; row=(n+1)//7
            centered(d,(22+col*35,108+row*28),str(n),17,'#b4342b' if col>4 else '#383d39')
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
