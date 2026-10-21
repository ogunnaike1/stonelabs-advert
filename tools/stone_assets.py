"""Slab-ratio pano stills, honed-stone texture, and exact vector contours of the two logo stones (for 3D extrusion)."""
import json, numpy as np
from PIL import Image
from scipy import ndimage
from skimage import measure
import importlib.util, sys
sys.path.insert(0, 'tools')
from pano_assets import rectilinear  # noqa

for name, u, p, fov in [('living-room', 0.33, -6, 80), ('kitchen', 0.25, -8, 80), ('hallway', 0.06, -4, 74), ('bathroom', 0.40, -10, 80), ('dining-room', 0.31, -6, 80)]:
    eq = np.asarray(Image.open(f'public/panos/360-{name}.jpg').convert('RGB')).astype(np.float32)
    Image.fromarray(rectilinear(eq, u, p, fov, 860, 1416)).save(f'public/stillsc/pano_{name}.jpg', quality=92)

# honed stone: warm off-white, soft fBm mottling + faint veins (tileable via wrap-mode filters)
rng = np.random.default_rng(3)
N = 1024
def fbm(scale_list):
    acc = np.zeros((N, N))
    for s, a in scale_list:
        acc += ndimage.gaussian_filter(rng.normal(0, 1, (N, N)), s, mode='wrap') * a * s
    return (acc - acc.mean()) / acc.std()
mott = fbm([(48, 1.0), (16, 0.5), (5, 0.25), (1.5, 0.12)])
vein = np.abs(fbm([(60, 1.0), (20, 0.5), (6, 0.2)]))
vein = np.exp(-vein * 9) * 0.5
base = np.array([236, 231, 222], np.float32)
img = base[None, None] * (1 + mott[..., None] * 0.025) - vein[..., None] * np.array([28, 30, 34]) 
pores = (rng.random((N, N)) < 0.0025)
img[pores] *= 0.86
Image.fromarray(img.clip(0, 255).astype(np.uint8)).save('public/stone/honed.jpg', quality=92)
rough = (0.62 + mott * 0.05 + pores * 0.15).clip(0, 1)
Image.fromarray((rough * 255).astype(np.uint8)).save('public/stone/rough.jpg', quality=92)

# logo contours (same canvas as stone-top/bottom PNGs → exact silhouette)
out = {}
for part in ['top', 'bottom']:
    a = np.asarray(Image.open(f'public/logo/stone-{part}-graphite.png'))[..., 3].astype(np.float32) / 255
    a = np.pad(a, 2)
    c = max(measure.find_contours(a, 0.5), key=len)
    c = measure.approximate_polygon(c, tolerance=0.6)
    h, w = a.shape
    pts = [[(x - 2 - (w - 4) / 2) / (w - 4), -((y - 2) - (h - 4) / 2) / (w - 4)] for y, x in c]  # normalised to logo width, y up
    out[part] = pts
    print(part, len(pts), 'points')
json.dump({'aspect': (h - 4) / (w - 4), **out}, open('public/logo/stones.json', 'w'))
