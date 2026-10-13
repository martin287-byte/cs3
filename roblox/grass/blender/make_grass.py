"""Builds the grass blade pack in Blender and exports it for Roblox Studio.

Run headless:   blender --background --python make_grass.py
or with the pip module:   python make_grass.py

Everything is modelled in studs (1 Blender unit = 1 stud) and Y is up on export,
which is what Roblox Studio's 3D Importer expects. Output goes to ../export.
"""
import math
import os
import random

import bpy
import bmesh
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "export"))
TEX = os.path.join(OUT, "textures")
os.makedirs(TEX, exist_ok=True)


# ----------------------------------------------------------------- textures --
def lerp(a, b, t):
    return a + (b - a) * t


def make_texture(name, base, mid, tip, seed):
    """Vertical gradient (V=0 root, V=1 tip) with faint lengthwise veins."""
    w, h = 64, 256
    rnd = random.Random(seed)
    veins = [rnd.uniform(-0.04, 0.04) for _ in range(w)]
    px = []
    for y in range(h):
        t = y / (h - 1)
        if t < 0.45:
            c = [lerp(base[i], mid[i], t / 0.45) for i in range(3)]
        else:
            c = [lerp(mid[i], tip[i], (t - 0.45) / 0.55) for i in range(3)]
        for x in range(w):
            u = x / (w - 1)
            rib = 1.0 - 0.10 * abs(u - 0.5) * 2  # centre rib slightly brighter
            v = veins[x] * (0.5 + t)
            px.extend([max(0, min(1, c[0] * rib + v)),
                       max(0, min(1, c[1] * rib + v)),
                       max(0, min(1, c[2] * rib + v)), 1.0])
    img = bpy.data.images.new(name, w, h, alpha=False)
    img.pixels = px
    img.filepath_raw = os.path.join(TEX, name + ".png")
    img.file_format = "PNG"
    img.save()
    return img


def make_material(name, img):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.85
    return mat


# -------------------------------------------------------------------- blade --
def add_blade(bm, uv, origin, height, width, lean, yaw, twist, segments=5):
    """One tapered, creased, curved blade. Both sides are real faces because
    Roblox culls back faces, so a single-sided blade would vanish from behind."""
    rows = []
    for s in range(segments + 1):
        t = s / segments
        # bend: blade leans further the higher it goes (quadratic arc)
        fwd = lean * height * t * t
        up = height * t * (1.0 - 0.18 * lean * t)
        half = width * 0.5 * (1.0 - t ** 1.6)  # taper to a point
        crease = width * 0.12 * (1.0 - t)       # V-fold along the midrib
        ang = yaw + twist * t
        side = Vector((math.cos(ang), 0.0, math.sin(ang)))      # across the blade
        front = Vector((-math.sin(ang), 0.0, math.cos(ang)))    # lean direction
        centre = Vector(origin) + front * fwd + Vector((0, up, 0))
        if s == segments:
            rows.append([(centre, 0.5, t)])
        else:
            rows.append([
                (centre - side * half, 0.0, t),
                (centre + front * crease, 0.5, t),
                (centre + side * half, 1.0, t),
            ])
    # front and back get separate vertices so each side has its own normals
    front_v = [[(bm.verts.new(p), u, v) for p, u, v in row] for row in rows]
    back_v = [[(bm.verts.new(p), u, v) for p, u, v in row] for row in rows]

    def face(vs, flip):
        seq = list(reversed(vs)) if flip else vs
        f = bm.faces.new([bv for bv, _, _ in seq])
        for loop, (_, u, v) in zip(f.loops, seq):
            loop[uv].uv = (u, v)
        f.smooth = True

    for verts, flip in ((front_v, False), (back_v, True)):
        for s in range(segments):
            a, b = verts[s], verts[s + 1]
            if len(b) == 1:
                face([a[0], a[1], b[0]], flip)
                face([a[1], a[2], b[0]], flip)
            else:
                face([a[0], a[1], b[1], b[0]], flip)
                face([a[1], a[2], b[2], b[1]], flip)


def build(name, mat, blades, seed):
    rnd = random.Random(seed)
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    for spec in blades(rnd):
        add_blade(bm, uv, **spec)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(mat)
    bpy.context.collection.objects.link(obj)
    return obj


# ------------------------------------------------------------- the variants --
# Blender is Z-up; blades are built with Y as "up", so each object is rotated
# +90° on X at the end. The FBX/GLB exporters then convert Z-up to Roblox's Y-up.
def single(height, width, lean):
    def gen(rnd):
        return [dict(origin=(0, 0, 0), height=height, width=width, lean=lean,
                     yaw=rnd.uniform(0, math.tau), twist=rnd.uniform(-0.5, 0.5))]
    return gen


def tuft(count, h_min, h_max, radius, w_min=0.10, w_max=0.18, lean_max=0.55):
    def gen(rnd):
        out = []
        for i in range(count):
            a = rnd.uniform(0, math.tau)
            r = radius * math.sqrt(rnd.random())
            pos = (math.cos(a) * r, 0, math.sin(a) * r)
            # blades lean outward from the clump centre, like real tufts
            yaw = math.atan2(-pos[0], pos[2]) if r > 1e-4 else rnd.uniform(0, math.tau)
            yaw += rnd.uniform(-0.6, 0.6)
            h = rnd.uniform(h_min, h_max)
            if i < count // 4:
                h *= 1.15  # a few taller blades break up the silhouette
            out.append(dict(origin=pos, height=h, width=rnd.uniform(w_min, w_max),
                            lean=rnd.uniform(0.1, lean_max), yaw=yaw,
                            twist=rnd.uniform(-0.7, 0.7)))
        return out
    return gen


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "NONE"

    green = make_material("GrassGreen", make_texture(
        "grass_green", (0.07, 0.16, 0.04), (0.22, 0.42, 0.10), (0.55, 0.70, 0.25), 1))
    lush = make_material("GrassLush", make_texture(
        "grass_lush", (0.04, 0.14, 0.04), (0.14, 0.38, 0.09), (0.36, 0.62, 0.18), 2))
    dry = make_material("GrassDry", make_texture(
        "grass_dry", (0.20, 0.17, 0.07), (0.52, 0.45, 0.20), (0.80, 0.72, 0.42), 3))

    variants = [
        ("Grass_Blade_Tall",   green, single(2.6, 0.22, 0.45), 11),
        ("Grass_Blade_Short",  green, single(1.4, 0.20, 0.30), 12),
        ("Grass_Blade_Wide",   lush,  single(2.0, 0.38, 0.55), 13),
        ("Grass_Tuft_Small",   green, tuft(6, 0.9, 1.6, 0.25), 21),
        ("Grass_Tuft_Medium",  green, tuft(11, 1.2, 2.2, 0.40), 22),
        ("Grass_Tuft_Large",   lush,  tuft(18, 1.6, 2.9, 0.60), 23),
        ("Grass_Tuft_Wild",    lush,  tuft(14, 1.0, 3.4, 0.55, 0.08, 0.14, 0.8), 24),
        ("Grass_Tuft_Dry",     dry,   tuft(12, 1.1, 2.4, 0.45, 0.07, 0.12, 0.75), 25),
    ]

    objs = []
    for i, (name, mat, gen, seed) in enumerate(variants):
        obj = build(name, mat, gen, seed)
        obj.data.transform(Matrix.Rotation(math.radians(90), 4, "X"))
        obj.data.update()
        obj.location = ((i % 4) * 4.0, (i // 4) * 4.0, 0)
        objs.append(obj)
        tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
        print(f"{name:20s} {tris:5d} tris")

    common = dict(object_types={"MESH"}, axis_forward="-Z", axis_up="Y",
                  apply_scale_options="FBX_SCALE_UNITS", mesh_smooth_type="FACE",
                  path_mode="COPY", embed_textures=True, bake_space_transform=True)

    # One file per variant, each centred on the origin with its root at y=0.
    for obj in objs:
        loc = obj.location.copy()
        obj.location = (0, 0, 0)
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.export_scene.fbx(filepath=os.path.join(OUT, obj.name + ".fbx"),
                                 use_selection=True, **common)
        obj.location = loc

    # The whole pack in one file: Studio imports it as a Model with 8 MeshParts.
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.fbx(filepath=os.path.join(OUT, "GrassPack.fbx"),
                             use_selection=True, **common)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "GrassPack.glb"),
                              export_format="GLB", export_yup=True)

    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "grass_pack.blend"))


if __name__ == "__main__":
    main()
