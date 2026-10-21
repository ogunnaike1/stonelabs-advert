"""Rectilinear stills (for phone screens) + Blender-style clay/wire passes (for the 360 orbs) from the equirect renders."""
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

def rectilinear(eq, yaw_u, pitch_deg, vfov_deg, W, H):
    h, w, _ = eq.shape
    yaw = 2 * np.pi * (yaw_u - 0.5); pitch = np.radians(pitch_deg); tv = np.tan(np.radians(vfov_deg) / 2)
    xs = (np.linspace(-1, 1, W) * tv * W / H)[None, :]; ys = (np.linspace(1, -1, H) * tv)[:, None]
    f = np.array([np.sin(yaw) * np.cos(pitch), np.sin(pitch), np.cos(yaw) * np.cos(pitch)])
    r = np.array([np.cos(yaw), 0, -np.sin(yaw)]); u = np.cross(f, r)
    d = f[None, None] + xs[..., None] * r + ys[..., None] * u
    d /= np.linalg.norm(d, axis=-1, keepdims=True)
    lon = np.arctan2(d[..., 0], d[..., 2]); lat = np.arcsin(np.clip(d[..., 1], -1, 1))
    px = ((lon / (2 * np.pi) + 0.5) % 1) * w; py = (0.5 - lat / np.pi) * h
    out = np.stack([ndimage.map_coordinates(eq[..., c], [py, px], order=1, mode='wrap') for c in range(3)], -1)
    return out.clip(0, 255).astype(np.uint8)

STILLS = [('living-room', 0.33, -6, 88), ('kitchen', 0.25, -8, 88), ('dining-room', 0.31, -6, 88),
          ('hallway', 0.06, -4, 80), ('bathroom', 0.40, -10, 88)]
for name, u, p, fov in STILLS:
    eq = np.asarray(Image.open(f'public/panos/360-{name}.jpg').convert('RGB')).astype(np.float32)
    Image.fromarray(rectilinear(eq, u, p, fov, 860, 1864)).save(f'public/stills/pano_{name}.jpg', quality=92)
    # clay pass: flat light-grey shading from luminance + dark wire edges (Blender workbench + wireframe look)
    g = eq.mean(-1) / 255
    shade = 0.80 + 0.22 * (ndimage.gaussian_filter(g, 3) - 0.5)
    e = np.hypot(ndimage.sobel(ndimage.gaussian_filter(g, 1.2), 0), ndimage.sobel(ndimage.gaussian_filter(g, 1.2), 1))
    e = np.clip((e - 0.06) * 3.2, 0, 1)
    clay = np.clip(shade - e * 0.55, 0, 1)
    rgb = np.stack([clay * 0.97, clay * 0.97, clay * 1.0], -1) * 255
    Image.fromarray(rgb.astype(np.uint8)).resize((2048, 1024), Image.LANCZOS).save(f'public/clay/{name}.jpg', quality=90)
    Image.open(f'public/panos/360-{name}.jpg').resize((2048, 1024), Image.LANCZOS).save(f'public/clay/{name}_color.jpg', quality=92)
    print(name)
