"""Shaped retail packs and lived-in props. Shared texture batches keep draw calls low."""
import math
from pathlib import Path
import bpy
from lib import Merge, material

ROOT = Path(__file__).resolve().parents[2] / 'assets/kiosk'

def textured(name, filename):
    mat = material(name, (1,1,1))
    nodes=mat.node_tree.nodes
    if not any(n.type=='TEX_IMAGE' for n in nodes):
        tex=nodes.new('ShaderNodeTexImage'); tex.image=bpy.data.images.load(str(ROOT/filename),check_existing=True)
        mat.node_tree.links.new(tex.outputs['Color'],nodes['Principled BSDF'].inputs['Base Color'])
    return mat

def mesh(batch, vertices, faces, mat, uvs=None, smooth=False):
    verts=[batch.bm.verts.new(v) for v in vertices]
    if mat not in batch.materials: batch.materials.append(mat)
    layer=batch.bm.loops.layers.uv.verify() if uvs else None
    for indices in faces:
        face=batch.bm.faces.new([verts[i] for i in indices]); face.material_index=batch.materials.index(mat); face.smooth=smooth
        if uvs:
            for loop,i in zip(face.loops,indices): loop[layer].uv=uvs[i]

def uv(cell,u,v):
    # Padding protects adjacent atlas tiles from minification bleeding.
    return ((cell%4+(4+248*u)/256)/4, 1-(cell//4+(4+248*(1-v))/256)/2)

def label(batch, cell, vertices, coords=None):
    mesh(batch,vertices,[(0,1,2,3)],textured('retail_print','props-atlas.png'),
         [uv(cell,*p) for p in (coords or [(0,0),(1,0),(1,1),(0,1)])])

def lathe(batch, profile, loc, mat, segments=20):
    x,y,z=loc; vertices=[]
    for h,r in profile:
        vertices.extend((x+r*math.cos(a*2*math.pi/segments),y+r*math.sin(a*2*math.pi/segments),z+h) for a in range(segments))
    faces=[tuple(reversed(range(segments))),tuple((len(profile)-1)*segments+a for a in range(segments))]
    for row in range(len(profile)-1):
        for a in range(segments):
            b=(a+1)%segments; faces.append((row*segments+a,row*segments+b,(row+1)*segments+b,(row+1)*segments+a))
    mesh(batch,vertices,faces,mat,smooth=True)

def ring(batch, center, radius, tube, mat, plane='XY', start=0, end=2*math.pi, steps=24):
    vertices=[]; x,y,z=center
    for i in range(steps+1):
        a=start+(end-start)*i/steps
        for j in range(4):
            b=2*math.pi*j/4; r=radius+tube*math.cos(b); t=tube*math.sin(b)
            p=(r*math.cos(a),r*math.sin(a),t)
            if plane=='XZ': p=(p[0],p[2],p[1])
            elif plane=='YZ': p=(p[2],p[0],p[1])
            vertices.append((x+p[0],y+p[1],z+p[2]))
    faces=[]
    for i in range(steps):
        for j in range(4): faces.append((i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j))
    mesh(batch,vertices,faces,mat,smooth=True)

def pack(batch, loc, width=.13, height=.2, depth=.05, cell=0):
    """Puffed pillow bag with narrowed crimped ends and a bowed printed face."""
    x,y,z=loc; vertices=[]; coords=[]; n=4
    for side in (-1,1):
        for row in range(n+1):
            v=row/n; spread=.83+.17*math.sin(math.pi*v)
            for col in range(n+1):
                u=col/n; puff=depth*(.15+.85*math.sin(math.pi*v))*(.72+.28*math.sin(math.pi*u))
                fold=.002*math.sin(u*math.pi*7+v*5)*math.sin(math.pi*v)
                vertices.append((x+(u-.5)*width*spread,y+side*(puff/2+fold),z+height*v))
                coords.append(uv(cell,u if side==-1 else 1-u,v))
    faces=[]; stride=n+1; surface=stride*stride
    for side in range(2):
        for row in range(n):
            for col in range(n):
                a=side*surface+row*stride+col; f=(a,a+1,a+stride+1,a+stride)
                faces.append(f if side==0 else tuple(reversed(f)))
    mesh(batch,vertices,faces,textured('retail_print','props-atlas.png'),coords,smooth=True)
    for row in (0,n):
        points=[vertices[row*stride+k] for k in range(n+1)]
        batch.polyline(points,.004,material('foil_seam',(0.64,.51,.27),metallic=.2))
        for k in range(11):
            batch.bar((x+(k/10-.5)*width*.82,y,z+height*row/n),
                      (x+(k/10-.5)*width*.82,y,z+height*row/n+(.007 if row==0 else -.007)),.0015,material('foil_seam',(0.64,.51,.27),metallic=.2))
    # Thin side folds close the bag; all bodies are batched with their labels.
    for col in (0,n):
        for row in range(n):
            a=row*stride+col; mesh(batch,[vertices[a],vertices[a+stride],vertices[a+stride+surface],vertices[a+surface]],[(0,1,2,3)],material('packet_side',(.64,.48,.17)))

def bottle(batch, loc, height, M, cell=3):
    r=.034; x,y,z=loc
    lathe(batch,[(0,r*.8),(.012,r),(height*.55,r),(height*.65,r*.95),(height*.76,r*.45),(height*.93,r*.4)],loc,M['bottle_green'],16)
    for h in (.02,height*.52,height*.58): ring(batch,(x,y,z+h),r,.0015,M['bottle_green'],steps=12)
    lathe(batch,[(0,.015),(.016,.015)],(x,y,z+height*.92),M['plastic_light'],16)
    # Cylindrical label with a real radius, printed from either side.
    for side in (-1,1):
        for k in range(8):
            a=math.pi*k/8+(0 if side==1 else math.pi); b=a+math.pi/8
            vs=[(x+.0347*math.cos(t),y+.0347*math.sin(t),z+h) for h,t in [(height*.22,a),(height*.22,b),(height*.5,b),(height*.5,a)]]
            label(batch,cell,vs,[(k/8,0),((k+1)/8,0),((k+1)/8,1),(k/8,1)])

def jar(batch,loc,M,cell=4,height=.16):
    x,y,z=loc; r=.047
    lathe(batch,[(0,r*.86),(.01,r),(height*.8,r),(height*.86,r*.87),(height*.95,r*.87)],loc,M['bottle_brown'],16)
    batch.cylinder(r*.95,.017,(x,y,z+height-.009),M['ink'],segments=20)
    for k in range(20):
        a=k*math.pi/10; batch.bar((x+r*.95*math.cos(a),y+r*.95*math.sin(a),z+height-.017),(x+r*.95*math.cos(a),y+r*.95*math.sin(a),z+height),.002,M['frame'])
    for side in (0,1):
        for k in range(8):
            a=math.pi*k/8+side*math.pi; b=a+math.pi/8
            vs=[(x+(r+.0008)*math.cos(t),y+(r+.0008)*math.sin(t),z+h) for h,t in [(.025,a),(.025,b),(height*.78,b),(height*.78,a)]]
            label(batch,cell,vs,[(k/8,0),((k+1)/8,0),((k+1)/8,1),(k/8,1)])

def counter(M,y,z):
    kettle=Merge('counter_kettle'); cream=material('kettle_enamel',(.69,.73,.60),roughness=.5)
    lathe(kettle,[(0,.065),(.014,.078),(.14,.074),(.175,.05),(.19,.047)],(-.43,y,z),cream,24)
    kettle.cylinder(.049,.01,(-.43,y,z+.19),M['frame'],segments=24)
    kettle.blob((.024,.024,.02),(-.43,y,z+.204),M['ink'],smooth=True)
    # Spout is a tapering curved tube with an open dark mouth.
    kettle.cylinder(.022,.085,(-.515,y,z+.12),cream,top=.016,segments=16,rot=(0,-.85,0))
    kettle.cylinder(.012,.002,(-.547,y,z+.148),M['ink'],segments=16,rot=(0,-.85,0))
    ring(kettle,(-.352,y,z+.105),.068,.011,M['ink'],plane='XZ',start=-1.3,end=1.3,steps=12)
    kettle.cylinder(.08,.012,(-.43,y,z+.006),M['ink'],segments=24)
    kettle.polyline([(-.42,y+.075,z+.01),(-.42,y+.115,z+.004),(-.64,y+.115,z+.004)],.004,M['ink'])
    kettle.finish()
    mug=Merge('counter_mug'); ceramic=material('mug_ceramic',(.69,.23,.15),roughness=.4)
    lathe(mug,[(0,.032),(.007,.038),(.081,.04),(.086,.04),(.086,.035),(.013,.032)],(-.25,y+.05,z),ceramic,24)
    ring(mug,(-.25,y+.05,z+.086),.0375,.0025,ceramic)
    mug.cylinder(.032,.002,(-.25,y+.05,z+.067),material('tea',(.14,.065,.022),roughness=.25),segments=24)
    ring(mug,(-.196,y+.05,z+.046),.025,.006,ceramic,plane='XZ',start=-1.9,end=1.9,steps=18)
    mug.finish()
    calc=Merge('counter_calculator')
    mesh(calc,[(.39,y-.08,z),(.51,y-.08,z),(.51,y+.08,z),(.39,y+.08,z),(.39,y-.08,z+.014),(.51,y-.08,z+.014),(.51,y+.08,z+.035),(.39,y+.08,z+.035)],[(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)],M['ink'])
    calc.box((.09,.028,.003),(.45,y+.047,z+.033),material('lcd_green',(.42,.51,.35)))
    for row in range(4):
        for col in range(4): calc.box((.019,.018,.005),(.414+col*.024,y-.053+row*.023,z+.019+row*.003),M['plastic_light'] if col<3 else M['away'])
    for x in (.42,.442,.464,.486):
        for zz in (0,.007): calc.bar((x,y+.043+zz,z+.036),(x+.009,y+.043+zz,z+.036),.0013,M['ink'])
    calc.finish()
    note=Merge('counter_notebook')
    note.box((.21,.27,.018),(.12,y+.015,z+.009),material('notebook_cover',(.23,.38,.40)))
    note.box((.202,.262,.012),(.12,y+.015,z+.016),M['paper'])
    label(note,6,[(.019,y-.111,z+.023),(.221,y-.111,z+.023),(.221,y+.141,z+.023),(.019,y+.141,z+.023)])
    for yy in range(10): ring(note,(.02,y-.1+yy*.025,z+.021),.007,.0012,M['frame'],plane='XZ',steps=8)
    note.bar((.05,y-.04,z+.029),(.205,y+.08,z+.029),.006,material('pen_blue',(.08,.18,.34)))
    note.bar((.205,y+.08,z+.029),(.22,y+.092,z+.029),.004,M['frame'])
    note.finish()
    coins=Merge('counter_loose_change')
    gold=material('coin_brass',(.65,.49,.22),metallic=.65,roughness=.48)
    for i,(x,dy,r) in enumerate([(.31,.08,.011),(.33,.06,.012),(.345,.083,.01),(.305,.049,.009),(.36,.042,.012),(.32,.115,.01)]):
        h=z+.001+i%2*.001; coins.cylinder(r,.002,(x,y+dy,h),gold,segments=16); ring(coins,(x,y+dy,h+.0011),r*.85,.0006,gold,steps=12)
        coins.bar((x-r*.3,y+dy,h+.002),(x+r*.3,y+dy,h+.002),.0008,M['frame'])
    coins.finish()
    register=Merge('counter_register')
    # Low old cash box, sloped keypad and projecting paper roll.
    lathe(register,[(0,.027),(.065,.027)],(-.91,y+.045,z+.075),M['paper'],16)
    register.box((.29,.20,.055),(-.85,y,z+.028),M['device'])
    register.box((.19,.11,.036),(-.79,y+.015,z+.074),M['plastic_light'])
    for row in range(3):
        for col in range(4): register.box((.027,.023,.008),(-.851+col*.037,y-.016+row*.032,z+.095),M['ink'])
    register.box((.048,.07,.002),(-.91,y-.07,z+.071),M['paper'])
    for k in range(5): register.box((.031,.001,.001),(-.91,y-.095+k*.009,z+.073),M['ink'])
    register.finish()

def chair(M,loc):
    cx,cy=loc; parts=Merge('chair_wood')
    parts.blob((.45,.43,.065),(cx,cy,.55),M['wood'],segments=20,rings=8,smooth=True)
    for dx in (-.175,.175):
        for dy in (-.175,.175): parts.bar((cx+dx*1.16,cy+dy*1.16,.13),(cx+dx,cy+dy,.55),.035,M['wood'])
        parts.bar((cx+dx,cy+.17,.52),(cx+dx,cy+.205,1.1),.027,M['wood'])
    for dx in (-.105,-.035,.035,.105): parts.bar((cx+dx,cy+.19,.68),(cx+dx,cy+.205,1.08),.016,M['wood'])
    parts.blob((.43,.054,.075),(cx,cy+.205,1.075),M['wood'],segments=20,rings=8,smooth=True)
    parts.bar((cx-.18,cy+.18,.3),(cx+.18,cy+.18,.3),.02,M['wood']); parts.finish()
    cloth=Merge('chair_plaid_blanket'); vertices=[]; uvs=[]; nx=20
    # Continuous cloth goes up the rear, over the rail, down the front, across the seat and over its edge.
    path=[(cy+.24,.72),(cy+.24,.9),(cy+.235,1.07),(cy+.21,1.116),(cy+.178,1.07),(cy+.165,.9),(cy+.15,.7),(cy+.11,.59),(cy+.02,.591),(cy-.08,.586),(cy-.2,.574),(cy-.232,.52),(cy-.237,.40)]
    for j,(yy,zz) in enumerate(path):
        for i in range(nx+1):
            u=i/nx; fold=.012*math.sin(u*math.pi*8+j*.15)+.004*math.sin(u*math.pi*19)
            vertices.append((cx+(u-.5)*.40,yy+fold*.4,zz+fold)); uvs.append((u*1.5,j/len(path)*2.4))
    faces=[]
    for j in range(len(path)-1):
        for i in range(nx):
            a=j*(nx+1)+i; faces.append((a,a+1,a+nx+2,a+nx+1))
    mesh(cloth,vertices,faces,textured('blanket_woven_plaid','blanket-plaid.png'),uvs,smooth=True)
    for i in range(25):
        xx=cx-.19+i*.016; cloth.bar((xx,cy-.237,.399),(xx+.003*math.sin(i),cy-.235,.37+.006*math.sin(i)),.002,material('blanket_fringe',(.62,.61,.48)))
    cloth.finish()

def stock(M):
    packs=Merge('stock_shaped_goods')
    for row,base in enumerate((.6125,1.1125,1.6125,2.0125)):
        for k in range(9):
            x=-1.31+k*.148
            if row==2: continue
            if row%2==0: jar(packs,(x,.82,base),M,cell=4,height=.19 if row==0 else .16)
            elif k%3==0: bottle(packs,(x,.82,base),.24,M)
            else: pack(packs,(x,.82,base),width=.122,height=.21,depth=.058,cell=k%2)
    # Tea cartons belong in the scene, but now have folds and actual printed fronts.
    for k in range(7):
        x=-1.32+k*.20; packs.box((.155,.16,.15),(x,.82,1.7),M['goods_palette'][3])
        label(packs,5,[(x-.074,.735,1.625),(x+.074,.735,1.625),(x+.074,.735,1.775),(x-.074,.735,1.775)])
    packs.finish()

def wall_details(M,hw):
    clock=Merge('clock_face_details'); x=-hw+.098; y=-.02; z=2.1
    ring(clock,(x,y,z),.113,.009,M['ink'],plane='YZ',steps=32)
    for k in range(12):
        a=k*math.pi/6; r=.092
        clock.bar((x+.003,y+r*math.sin(a),z+r*math.cos(a)),(x+.003,y+(r-.012)*math.sin(a),z+(r-.012)*math.cos(a)),.003,M['ink'])
    clock.bar((x+.005,y,z),(x+.005,y-.064,z+.041),.004,M['ink']); clock.bar((x+.006,y,z),(x+.006,y+.027,z+.042),.006,M['ink']); clock.finish()
    calendar=Merge('calendar_print')
    label(calendar,7,[(hw-.089,.055,1.42),(hw-.089,-.355,1.42),(hw-.089,-.355,1.98),(hw-.089,.055,1.98)])
    calendar.finish()

def soften(obj, amount=.014):
    bevel=obj.modifiers.new('softened_casing_edges','BEVEL'); bevel.width=amount; bevel.segments=3
    return obj

def radio_details(M, parent):
    parts=Merge('radio_lived_in_details')
    # A cassette door, tuning scale, grill ribs and worn ivory pushbuttons.
    parts.box((.10,.006,.068),(0,.075,-.015),M['ink'])
    parts.box((.074,.007,.032),(0,.079,-.012),M['plastic_light'])
    for dx in (-.022,.022): ring(parts,(dx,.084,-.012),.010,.002,M['ink'],plane='XZ',steps=12)
    for dx in (-.10,.10):
        for k in range(-4,5):
            zz=-.01+k*.010; length=math.sqrt(max(0,.049**2-(k*.010)**2))
            parts.bar((dx-length,.081,zz),(dx+length,.081,zz),.0025,M['device'])
    for k in range(5): parts.box((.018,.016,.008),(-.048+k*.024,.045,.101),M['plastic_light'])
    for k in range(8): parts.bar((-.035+k*.009,.080,.06),(-.035+k*.009,.080,.078),.0015,M['ink'])
    parts.polyline([(-.13,0,.1),(-.13,0,.18),(.13,0,.18),(.13,0,.1)],.012,M['ink'])
    parts.finish(parent=parent)

def cartons(M):
    batch=Merge('stock_open_carton')
    x,y,z=-.15,.73,.12
    for size,loc in [((.34,.28,.014),(x,y,z+.007)),((.014,.28,.24),(x-.17,y,z+.12)),((.014,.28,.24),(x+.17,y,z+.12)),((.34,.014,.24),(x,y-.14,z+.12)),((.34,.014,.24),(x,y+.14,z+.12))]: batch.box(size,loc,M['cardboard'])
    batch.box((.11,.27,.006),(x-.205,y,z+.245),M['cardboard'],rot=(0,.3,0))
    batch.box((.11,.27,.006),(x+.205,y,z+.245),M['cardboard'],rot=(0,-.3,0))
    batch.box((.32,.09,.006),(x,y+.175,z+.25),M['cardboard'],rot=(-.3,0,0))
    for dx in (-.09,.09): jar(batch,(x+dx,y,z+.014),M,height=.19)
    batch.box((.03,.27,.001),(x-.12,y,z+.24),M['paper'])
    batch.finish()
