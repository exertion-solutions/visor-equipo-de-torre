import numpy as np, trimesh
from PIL import Image, ImageDraw
from scipy.ndimage import binary_opening
# ref.png = imagen de catálogo de un proveedor: NO se versiona (marca de agua de terceros). Copiala local en esta carpeta.
im = np.array(Image.open("ref.png").convert("RGB")).astype(int)
H, W = im.shape[:2]; x0, y0, x1, y1 = 104, 218, 395, 470
reg = im[y0:y1, x0:x1]
# color del skid = moda de los pixeles azulados claros
blue = (reg[:,:,2] > reg[:,:,0] + 25) & (reg[:,:,2] > 200)
skid = np.median(reg[blue], axis=0); print("skid rgb", skid)
dist = np.minimum(np.abs(reg - skid).sum(2), np.abs(reg - 255).sum(2))
ref = np.zeros((H, W), bool); ref[y0:y1, x0:x1] = binary_opening(dist > 60, iterations=1)
m = trimesh.load("out/choke_manifold.stl")
img = Image.new("L", (W, H), 0); d = ImageDraw.Draw(img)
# excluir la placa del skid (z<=11): solo equipo
for tri in m.triangles:
    if tri[:,2].max() <= 11.01: continue
    d.polygon([(p[0], 470 - p[1]) for p in tri], fill=255)
mod = np.array(img) > 0
box = np.zeros((H, W), bool); box[y0:y1, x0:x1] = True
ref &= box; mod &= box
iou = (ref & mod).sum() / (ref | mod).sum(); print("IoU total", round(iou, 3))
for a, b in [(218,280),(280,340),(340,400),(400,470)]:
    r, q = ref[a:b], mod[a:b]; print(f"banda py {a}-{b}", round((r&q).sum()/max((r|q).sum(),1), 3))
ov = np.full((H, W, 3), 255, np.uint8)
ov[ref & mod] = (150,150,150); ov[ref & ~mod] = (230,40,40); ov[~ref & mod] = (40,80,230)
Image.fromarray(ov).crop((90, 210, 410, 480)).resize((640, 540)).save("out/overlay.png")
