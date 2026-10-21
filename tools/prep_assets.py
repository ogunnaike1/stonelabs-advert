"""Split the official logo into its two stones (pixel-exact, same canvas) + make grain tile."""
import numpy as np
from PIL import Image
from scipy import ndimage

src = Image.open('public/logo/mark-graphite.png')
a = np.array(src)[..., 3].astype(np.float32) / 255
lab, n = ndimage.label(a > 0.5)
sizes = ndimage.sum(np.ones_like(a), lab, range(1, n + 1))
keep = np.argsort(sizes)[::-1][:2] + 1
# assign every (anti-aliased) pixel to its nearest core component
dist, idx = ndimage.distance_transform_edt(~np.isin(lab, keep), return_indices=True)
owner = lab[idx[0], idx[1]]
cents = {k: ndimage.center_of_mass(lab == k) for k in keep}
order = sorted(keep, key=lambda k: cents[k][0])  # top first
for name, k in zip(['top', 'bottom'], order):
    for col_name, col in [('graphite', (27, 27, 26)), ('ivory', (242, 239, 232))]:
        out = np.zeros(a.shape + (4,), np.uint8)
        out[..., :3] = col
        out[..., 3] = np.where(owner == k, a, 0) * 255
        Image.fromarray(out).save(f'public/logo/stone-{name}-{col_name}.png')
print('components', n, 'kept sizes', sizes[keep - 1], 'canvas', a.shape)

rng = np.random.default_rng(7)
g = rng.normal(128, 40, (512, 512)).clip(0, 255).astype(np.uint8)
Image.fromarray(g, 'L').save('public/grain.png')
