"""Shaped retail packs and lived-in props. Shared texture batches keep draw calls low."""
import math
from pathlib import Path
import bpy
from dims import WALL
from lib import Merge, box, empty, material, screen

ROOT = Path(__file__).resolve().parents[2] / 'assets/kiosk'

def hanging_jacket(M, hw):
    """A short work jacket on a wooden hanger, front facing into the room.

    The old stand-in was one ellipsoid. Separate hanging sleeves, shoulders,
    an open collar and a zipper give this a recognisable clothing silhouette.
    It hugs the right wall, clear of the calendar and the back-door route.
    """
    cx, cy = hw-.105, .58
    cloth = material('jacket_fabric', (.14, .18, .23), roughness=.98)
    lining = material('jacket_lining', (.045, .055, .07), roughness=1)
    rib = material('jacket_ribbing', (.075, .095, .12), roughness=1)
    stitch = material('jacket_seam', (.24, .28, .32), roughness=1)
    zip_metal = material('jacket_zipper', (.50, .51, .49), metallic=.55, roughness=.6)
    jacket = Merge('hanging_jacket')
    # z, lateral centre, half-width, thickness radius. Sections are elliptical
    # rather than spherical; slight uneven folds break up the flat front.
    rows = [(1.18,0,.148,.022), (1.21,0,.163,.032), (1.36,0,.178,.043),
            (1.55,0,.19,.047), (1.72,0,.208,.040), (1.79,0,.172,.032),
            (1.835,0,.070,.021), (1.85,0,.055,.018)]

    def loft(sections, fabric, end_cap=True):
        vertices, faces = [], []
        segments = 24
        for z, centre, width, depth in sections:
            for i in range(segments):
                a = 2*math.pi*i/segments
                fold = .0025*math.sin(a*5+z*17)*math.sin(a)**2
                vertices.append((cx+(depth+fold)*math.cos(a), cy+centre+width*math.sin(a), z))
        faces.append(tuple(reversed(range(segments))))
        for row in range(len(sections)-1):
            for i in range(segments):
                j = (i+1)%segments
                faces.append((row*segments+i,row*segments+j,(row+1)*segments+j,(row+1)*segments+i))
        if end_cap:
            faces.append(tuple((len(sections)-1)*segments+i for i in range(segments)))
        mesh(jacket, vertices, faces, fabric, smooth=True)

    loft(rows, cloth, end_cap=False)
    loft([(1.177,0,.148,.022), (1.205,0,.162,.031)], rib)
    for side in (-1,1):
        sleeve = [(1.20,side*.25,.045,.025), (1.235,side*.253,.051,.029),
                  (1.43,side*.270,.058,.033), (1.61,side*.250,.077,.035),
                  (1.735,side*.217,.084,.032), (1.78,side*.173,.064,.027)]
        loft(sleeve, cloth)
        loft([(1.194,side*.249,.044,.025), (1.233,side*.253,.051,.029)], rib)
        # Ribbed cuffs, very small grooves instead of a featureless cylinder.
        for z in (1.202,1.213,1.224):
            jacket.bar((cx-.027,cy+side*.249-.035,z),(cx-.027,cy+side*.249+.035,z),.0017,stitch)

    def front(z, offset=0, proud=.004):
        for low, high in zip(rows,rows[1:]):
            if low[0] <= z <= high[0]:
                t = (z-low[0])/(high[0]-low[0])
                width = low[2]+(high[2]-low[2])*t
                depth = low[3]+(high[3]-low[3])*t
                return (cx-depth*math.sqrt(max(.02,1-(offset/width)**2))-proud,cy+offset,z)
        return (cx-.021-proud,cy+offset,z)

    # Open stand collar, with its dark inner fabric visible from the room.
    outer, faces = [], []
    for radius_x, radius_y, z in ((.021,.069,1.827),(.027,.064,1.888),
                                (.022,.058,1.888),(.016,.063,1.827)):
        outer.extend((cx+radius_x*math.cos(a*2*math.pi/24),cy+radius_y*math.sin(a*2*math.pi/24),z) for a in range(24))
    for row in range(4):
        for i in range(24):
            j = (i+1)%24
            faces.append((row*24+i,row*24+j,((row+1)%4)*24+j,((row+1)%4)*24+i))
    mesh(jacket,outer,faces,rib,smooth=True)
    # Neck lining closes the deeper torso without filling the collar opening.
    jacket.blob((.025,.092,.015),(cx,cy,1.835),lining,16,8,True)
    zip_points = [front(z,0,.006) for z in (1.205,1.36,1.55,1.72,1.79,1.83)]
    jacket.polyline(zip_points,.012,lining)
    jacket.polyline([front(p[2],0,.014) for p in zip_points],.003,zip_metal)
    for k in range(46):
        z = 1.216+k*.013
        for offset in (-.004,.004):
            jacket.box((.002,.004,.002),front(z,offset,.015),zip_metal)
    jacket.box((.004,.014,.027),front(1.70,0,.020),zip_metal,rot=(.12,0,0))
    # Two slanted pocket mouths with sewn welts, following the curved front.
    for side in (-1,1):
        points = [front(z,side*y,.005) for y,z in ((.065,1.42),(.105,1.447),(.145,1.474))]
        jacket.polyline(points,.010,lining)
        jacket.polyline([front(p[2]+.008,p[1]-cy,.006) for p in points],.003,stitch)
        jacket.polyline([front(z,side*y,.006) for y,z in ((.066,1.413),(.072,1.32),(.133,1.325),(.144,1.464))],.0017,stitch)
    # A compact waist-length jacket. Keep its hanger at the original hook
    # height and leave more space between the clothing and the fixed eye.
    for vertex in jacket.bm.verts:
        vertex.co.z = 1.95+(vertex.co.z-1.95)*.9
        vertex.co.y = cy+(vertex.co.y-cy)*.94
    jacket.finish()

    hanger = Merge('jacket_hanger')
    wood = material('jacket_hanger_wood', (.45,.30,.16), roughness=.8)
    for side in (-1,1):
        hanger.bar((cx+.006,cy,1.858),(cx+.006,cy+side*.215,1.75),.017,wood)
    hanger.bar((cx+.006,cy-.215,1.75),(cx+.006,cy+.215,1.75),.013,wood)
    hanger.bar((cx+.006,cy,1.855),(cx+.006,cy,1.933),.003,zip_metal)
    ring(hanger,(cx+.006,cy,1.94),.023,.002,zip_metal,plane='XZ',
         start=0,end=math.pi*1.65,steps=18)
    # A screwed plate and upturned hook attach the hanger to the actual wall.
    hanger.box((.010,.050,.075),(hw-WALL-.006,cy,1.952),M['frame'])
    hanger.polyline(((hw-WALL-.014,cy,1.937),(cx+.005,cy,1.92),
                     (cx-.015,cy,1.92),(cx-.019,cy,1.936)),.005,zip_metal)
    for z in (1.930,1.974):
        hanger.cylinder(.003,.002,(hw-WALL-.013,cy,z),zip_metal,segments=10,rot=(0,math.pi/2,0))
    for vertex in hanger.bm.verts:
        vertex.co.z = 1.95+(vertex.co.z-1.95)*.9
        vertex.co.y = cy+(vertex.co.y-cy)*.94
    hanger.finish()


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
    return ((cell%4+(4+248*u)/256)/4, 1-(cell//4+(4+248*(1-v))/256)/4)

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

def wrap(batch, cell, centre, r0, r1, z0, z1, segments=8):
    """A printed label round a cylinder or a cone (radius r0 at z0, r1 at
    z1), printed on both halves so it reads from any side."""
    x, y, z = centre
    for side in (0, 1):
        for k in range(segments):
            a = math.pi * k / segments + side * math.pi
            b = a + math.pi / segments
            vs = [(x + r * math.cos(t), y + r * math.sin(t), z + h) for h, r, t in
                  [(z0, r0, a), (z0, r0, b), (z1, r1, b), (z1, r1, a)]]
            label(batch, cell, vs, [(k / segments, 0), ((k + 1) / segments, 0), ((k + 1) / segments, 1), (k / segments, 1)])


def _metal():
    return material('crown_cap_metal', (0.7, 0.68, 0.6), roughness=0.3, metallic=0.85)


def bottle(batch, loc, height, M, cell=8, glass=None):
    """A half-litre glass bottle with a crown cap: lemonade, beer, tarhun."""
    r = .034; x, y, z = loc
    glass = glass or M['bottle_green']
    lathe(batch, [(0, r * .8), (.012, r), (height * .55, r), (height * .65, r * .95), (height * .76, r * .45),
                  (height * .93, r * .4)], loc, glass, 16)
    ring(batch, (x, y, z + .02), r, .0015, glass, steps=12)
    lathe(batch, [(0, .0145), (.011, .0145)], (x, y, z + height * .925), _metal(), 14)
    ring(batch, (x, y, z + height * .925 + .003), .0148, .0016, _metal(), steps=14)
    wrap(batch, cell, loc, r + .0008, r + .0008, height * .2, height * .5)


def pet(batch, loc, height, cell, M):
    """A litre plastic bottle of fizzy pop, tinted plastic, coloured cap."""
    r = .041; x, y, z = loc
    plastic = material('pet_green', (0.32, 0.62, 0.36), roughness=0.18)
    lathe(batch, [(0, r * .75), (.01, r * .92), (.02, r), (height * .62, r), (height * .7, r * .9),
                  (height * .86, r * .42), (height * .93, r * .34)], loc, plastic, 16)
    for h in (height * .08, height * .15):
        ring(batch, (x, y, z + h), r, .002, plastic, steps=14)
    lathe(batch, [(0, .016), (.018, .016)], (x, y, z + height * .93), material('pet_cap', (0.8, 0.12, 0.1)), 14)
    wrap(batch, cell, loc, r + .0008, r + .0008, height * .3, height * .58)


def can(batch, loc, height, cell, M):
    """A 0.33 can with its print wrapped round it."""
    r = .033; x, y, z = loc
    silver = material('can_silver', (0.72, 0.74, 0.76), roughness=0.3, metallic=0.8)
    lathe(batch, [(0, r * .82), (.008, r), (height - .012, r), (height - .004, r * .86), (height, r * .86)], loc, silver, 16)
    ring(batch, (x, y, z + height), r * .86, .0015, silver, steps=16)
    wrap(batch, cell, loc, r + .0006, r + .0006, .01, height - .014)


def carton(batch, loc, cell, M, w=.07, d=.06, h=.17):
    """A litre of juice in a gable-top carton."""
    x, y, z = loc
    white = material('carton_white', (0.93, 0.92, 0.88))
    batch.box((w, d, h), (x, y, z + h / 2), white)
    for side in (-1, 1):
        coords = [(0, 0), (1, 0), (1, 1), (0, 1)] if side == -1 else [(1, 0), (0, 0), (0, 1), (1, 1)]
        label(batch, cell, [(x - w / 2 + .002, y + side * (d / 2 + .0006), z + .004), (x + w / 2 - .002, y + side * (d / 2 + .0006), z + .004),
                            (x + w / 2 - .002, y + side * (d / 2 + .0006), z + h - .004), (x - w / 2 + .002, y + side * (d / 2 + .0006), z + h - .004)], coords)
    ridge = z + h + .028
    mesh(batch, [(x - w / 2, y - d / 2, z + h), (x + w / 2, y - d / 2, z + h), (x + w / 2, y, ridge), (x - w / 2, y, ridge),
                 (x - w / 2, y + d / 2, z + h), (x + w / 2, y + d / 2, z + h)],
         [(0, 1, 2, 3), (3, 2, 5, 4), (0, 3, 4), (1, 5, 2)], white)
    batch.box((w, .003, .012), (x, y, ridge + .004), white)


def noodle_cup(batch, loc, cell, M, h=.1):
    """Instant noodles: a tapered foam cup with a foil lid."""
    x, y, z = loc
    foam = material('cup_foam', (0.95, 0.94, 0.9))
    lathe(batch, [(0, .034), (h, .046)], loc, foam, 18)
    wrap(batch, cell, loc, .0348, .0468, .006, h - .006)
    batch.cylinder(.048, .003, (x, y, z + h + .0015), material('foil_lid', (0.82, 0.82, 0.84), metallic=0.7, roughness=0.35), segments=18)


def gum_box(batch, loc, cell, M):
    """An open shop box of gum with its printed lid flipped up behind."""
    x, y, z = loc
    w, d, h = .11, .065, .035
    pink = material('gum_box_pink', (0.93, 0.55, 0.68))
    batch.box((w, d, .005), (x, y, z + .0025), pink)
    batch.box((w, .004, h), (x, y - d / 2, z + h / 2), pink)
    for sx in (-1, 1):
        batch.box((.004, d, h), (x + sx * w / 2, y, z + h / 2), pink)
    label(batch, cell, [(x - w / 2, y - d / 2 - .0026, z + .002), (x + w / 2, y - d / 2 - .0026, z + .002),
                        (x + w / 2, y - d / 2 - .0026, z + h), (x - w / 2, y - d / 2 - .0026, z + h)], [(0, .1), (1, .1), (1, .55), (0, .55)])
    lid = [(x - w / 2, y + d / 2, z + h), (x + w / 2, y + d / 2, z + h), (x + w / 2, y + d / 2 + .018, z + h + .05), (x - w / 2, y + d / 2 + .018, z + h + .05)]
    mesh(batch, lid, [(0, 1, 2, 3)], pink)
    label(batch, cell, [(px, py - .002, pz) for px, py, pz in lid])
    for k in range(8):
        batch.box((.0105, .046, .028), (x - w / 2 + .011 + k * .0125, y + .002, z + .019),
                  M['goods_palette'][4] if k % 2 else material('gum_white', (0.95, 0.95, 0.93)))


def lollipops(batch, loc, M):
    """A spinning stand of lollipops stuck into a ball, a kiosk counter classic."""
    x, y, z = loc
    batch.cylinder(.05, .012, (x, y, z + .006), M['ink'], segments=18)
    batch.cylinder(.006, .17, (x, y, z + .09), M['frame'], segments=8)
    batch.blob((.085, .085, .075), (x, y, z + .2), material('lolly_holder', (0.95, 0.94, 0.9)), 14, 8, True)
    colours = [M['goods_palette'][i] for i in (0, 1, 3, 4, 9, 6)]
    for k in range(16):
        a = k * 2.399
        tilt = .25 + .9 * ((k * 7) % 5) / 5
        dx, dy, dz = math.cos(a) * math.sin(tilt), math.sin(a) * math.sin(tilt), math.cos(tilt)
        start = (x + dx * .03, y + dy * .03, z + .2 + dz * .028)
        end = (x + dx * .085, y + dy * .085, z + .2 + dz * .07)
        batch.bar(start, end, .003, material('lolly_stick', (0.95, 0.95, 0.93)))
        batch.blob((.026, .026, .026), end, colours[k % len(colours)], 10, 6, True)


def choc_display(batch, loc, cell, M, count=4):
    """Chocolate bars standing in their open display tray."""
    x, y, z = loc
    batch.box((.15, .07, .018), (x, y, z + .009), material('choc_tray', (0.55, 0.12, 0.13)))
    for k in range(count):
        yy = y - .024 + k * .016
        batch.box((.14, .011, .07), (x, yy, z + .018 + .035), M['ink'])
        label(batch, cell, [(x - .07, yy - .0058, z + .019), (x + .07, yy - .0058, z + .019),
                            (x + .07, yy - .0058, z + .087), (x - .07, yy - .0058, z + .087)])


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
    # A pocket calculator lies flat. Display is away from the seller (+Y),
    # with the keypad and operator column facing the working side.
    calc.box((.12,.16,.014),(.92,y,z+.007),M['ink'])
    calc.box((.09,.028,.0012),(.92,y-.047,z+.0146),material('lcd_green',(.42,.51,.35)))
    for row in range(4):
        for col in range(4):
            calc.box((.019,.018,.004),(.956-col*.024,y+.053-row*.023,z+.017),M['plastic_light'] if col<3 else M['away'])
    for x in (.89,.912,.934,.956):
        for dy in (0,.007):
            calc.bar((x,y-.051+dy,z+.0158),(x+.009,y-.051+dy,z+.0158),.0013,M['ink'])
    calc.finish()
    note=Merge('counter_notebook')
    # The A6 notebook stays on the free rear half of the counter, clear of goods.
    nx, ny = .12, y+.072
    note.box((.21,.18,.018),(nx,ny,z+.009),material('notebook_cover',(.23,.38,.40)))
    note.box((.202,.174,.012),(nx,ny,z+.016),M['paper'])
    label(note,6,[(nx-.101,ny-.087,z+.023),(nx+.101,ny-.087,z+.023),(nx+.101,ny+.087,z+.023),(nx-.101,ny+.087,z+.023)],[(1,1),(0,1),(0,0),(1,0)])
    for yy in range(7): ring(note,(nx+.10,ny-.072+yy*.024,z+.021),.007,.0012,M['frame'],plane='XZ',steps=8)
    # Pen beside the notebook, not crossing its written page.
    note.bar((nx-.132,ny-.070,z+.003),(nx-.132,ny+.065,z+.003),.006,material('pen_blue',(.08,.18,.34)))
    note.bar((nx-.132,ny+.065,z+.003),(nx-.132,ny+.079,z+.003),.004,M['frame'])
    note.finish()
    coins=Merge('counter_loose_change')
    gold=material('coin_brass',(.65,.49,.22),metallic=.65,roughness=.48)
    for i,(x,dy,r) in enumerate([(.73,.08,.011),(.75,.06,.012),(.765,.083,.01),(.725,.049,.009),(.78,.042,.012),(.74,.115,.01)]):
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
    # Continuous cloth goes up the rear, over the rail, down the front, across
    # the seat and over its edge. Each point sits just clear of the wood and
    # carries the direction away from it; folds only ever push outward, so
    # the chair never shows through the plaid.
    d=.7071
    path=[(cy+.242,.70,(1,0)),(cy+.242,.88,(1,0)),(cy+.242,1.06,(1,0)),
          (cy+.226,1.105,(d,d)),(cy+.205,1.124,(0,1)),(cy+.184,1.105,(-d,d)),
          (cy+.176,1.04,(-1,0)),(cy+.168,.90,(-1,0)),(cy+.155,.74,(-1,0)),
          (cy+.13,.635,(-d,d)),(cy+.07,.6,(0,1)),(cy-.03,.598,(0,1)),(cy-.13,.592,(0,1)),
          (cy-.2,.578,(-d,d)),(cy-.232,.53,(-1,0)),(cy-.236,.40,(-1,0))]
    for j,(yy,zz,(ny,nz)) in enumerate(path):
        for i in range(nx+1):
            u=i/nx; fold=.004+.007*(.5+.5*math.sin(u*math.pi*8+j*.7))+.002*(.5+.5*math.sin(u*math.pi*19))
            vertices.append((cx+(u-.5)*.40,yy+ny*fold,zz+nz*fold)); uvs.append((u*1.5,j/len(path)*2.4))
    faces=[]
    for j in range(len(path)-1):
        for i in range(nx):
            a=j*(nx+1)+i; faces.append((a,a+1,a+nx+2,a+nx+1))
    mesh(cloth,vertices,faces,textured('blanket_woven_plaid','blanket-plaid.png'),uvs,smooth=True)
    for i in range(25):
        xx=cx-.19+i*.016; cloth.bar((xx,cy-.244,.401),(xx+.003*math.sin(i),cy-.243,.372+.006*math.sin(i)),.002,material('blanket_fringe',(.62,.61,.48)))
    cloth.finish()

def stock(M):
    packs=Merge('stock_shaped_goods')
    for row,base in enumerate((.6125,1.1125,1.6125,2.0125)):
        for k in range(9):
            x=-1.31+k*.148
            if row==2: continue
            if row%2==0: jar(packs,(x,.82,base),M,cell=4,height=.19 if row==0 else .16)
            elif k%3==0: bottle(packs,(x,.82,base),.24,M,cell=9,glass=M['bottle_brown'])
            else: pack(packs,(x,.82,base),width=.122,height=.21,depth=.058,cell=(11,12,0,1)[k%4])
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
    wall_calendar(hw)

CALENDAR=(-.15,.30,1.93,.44)   # centre y, width, top, height of the sheet (0.30 x 0.44 m)

def _sheet(batch, wall, mat, lift=0.0, drop=0.0, v0=0.0, uvs=True):
    """A paper sheet hanging from its top edge: off the wall by the binding,
    bowing out a little more towards the bottom, with a soft ripple."""
    cy,width,top,height=CALENDAR; nu,nv=8,14
    vertices=[]; coords=[]
    for j in range(nv+1):
        v=v0+(1-v0)*j/nv
        for i in range(nu+1):
            u=i/nu
            off=.006+.010*v**1.6-lift+.0012*v*math.sin(u*math.pi*3+.6)
            vertices.append((wall-off,cy+width/2-width*u,top-(height+drop)*v)); coords.append((u,1-v))
    faces=[]
    for j in range(nv):
        for i in range(nu):
            a=j*(nu+1)+i; faces.append((a,a+nu+1,a+nu+2,a+1))   # facing -X, into the kiosk
    mesh(batch,vertices,faces,mat,coords if uvs else None,smooth=True)

def wall_calendar(hw):
    """June 2004 on the right wall, the way a wire-bound calendar really hangs:
    one thin printed sheet on a nail, the rest of the year showing as an edge
    of paper under it, twin wire loops through the punched holes and the
    hanger in the notch. hs_calendar answers a click (hotspots.js)."""
    wall=hw-WALL
    cy,width,top,_=CALENDAR
    holder=empty('hs_calendar',(0,0,0))
    page=Merge('calendar_print')
    _sheet(page,wall,textured('calendar_june_2004','calendar-june-2004.jpg'))
    page=page.finish(parent=holder)
    page['year']=2004; page['month']=6; page['marked_day']=30
    binding=Merge('calendar_binding')
    paper=material('calendar_paper',(.9,.89,.86))
    for k in (1,2,3):   # July to December, a little lower and closer to the wall each
        _sheet(binding,wall,paper,lift=.0007*k,drop=.0013*k,v0=.8,uvs=False)
    wire=material('calendar_wire',(.62,.63,.66),roughness=.35,metallic=.7)
    x=wall-.006
    pitch=.0088
    for k in range(int(width/pitch)):
        y=cy+width/2-(k+.5)*pitch
        if abs(y-cy)<.014: continue
        for dy in (-.0012,.0012):   # twin loop: two strands per hole
            ring(binding,(x,y+dy,top-.0025),.0055,.0006,wire,plane='XZ',start=.6,end=2*math.pi-.6,steps=10)
    # the hanger hooks over a nail in the wall above the notch
    nail=(wall-.004,cy,top+.03)
    for side in (-1,1):
        binding.bar((x-.004,cy+side*.012,top-.002),(nail[0]-.002,cy+side*.003,nail[2]+.002),.0013,wire)
    binding.bar((nail[0]-.002,cy-.003,nail[2]+.002),(nail[0]-.002,cy+.003,nail[2]+.002),.0013,wire)
    steel=material('calendar_nail',(.25,.25,.26),roughness=.5,metallic=.6)
    binding.bar((wall,cy,nail[2]),(wall-.006,cy,nail[2]),.0015,steel)
    binding.cylinder(.0035,.002,(wall-.007,cy,nail[2]),steel,segments=10,rot=(0,math.pi/2,0))
    binding.finish(parent=holder)

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
    # what the site moves when the radio plays (assets/js/kiosk/radio.js):
    # the tuning needle at the left end of the scale as the seller sees it
    # (facing the front, +x is on their left), the on-lamp beside it
    # and a green LCD between the scale and the cassette
    box('radio_needle',(.0018,.002,.024),(.028,.0815,.069),material('radio_needle',(.85,.1,.08),emission=.6),parent=parent)
    box('radio_led',(.007,.004,.007),(.052,.0795,.069),material('radio_led',(.3,.03,.03)),parent=parent)
    screen('screen_radio',(0,.0785,.037),.07,.018,rot_z=math.pi,parent=parent)

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
