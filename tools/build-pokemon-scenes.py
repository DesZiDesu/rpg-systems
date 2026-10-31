#!/usr/bin/env python3
"""Paint the battle scenes and floor bases as small, resolution-free SVGs.

Every terrain gets a layered scene (sky and light, distant haze, mid-ground,
a perspective ground and soft foreground framing) plus a matching floor base
for both Pokemon. Output is deterministic: the same seed always draws the same
picture. Run: python3 tools/build-pokemon-scenes.py
"""
import math
import random
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'src/workshop/pokemon/assets/battle/scenes'
W, H, HORIZON = 1600, 900, 380


def f(v):
    return f'{v:.1f}'.rstrip('0').rstrip('.')


def pts(points):
    return ' '.join(f'{f(x)},{f(y)}' for x, y in points)


class Svg:
    def __init__(self, w=W, h=H):
        self.w, self.h, self.defs, self.body = w, h, [], []

    def grad(self, gid, stops, x2=0, y2=1, radial=False, **attrs):
        tag = 'radialGradient' if radial else 'linearGradient'
        extra = ''.join(f' {k.replace("_", "-")}="{v}"' for k, v in attrs.items())
        geom = '' if radial else f' x1="0" y1="0" x2="{x2}" y2="{y2}"'
        inner = ''.join(f'<stop offset="{o}" stop-color="{c}"{"" if a is None else f" stop-opacity={chr(34)}{a}{chr(34)}"}/>'
                        for o, c, a in [(s + (None,))[:3] for s in stops])
        self.defs.append(f'<{tag} id="{gid}"{geom}{extra}>{inner}</{tag}>')
        return f'url(#{gid})'

    def blur(self, fid, amount):
        self.defs.append(f'<filter id="{fid}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="{amount}"/></filter>')
        return f'url(#{fid})'

    def add(self, markup):
        self.body.append(markup)

    def group(self, items, **attrs):
        extra = ''.join(f' {k.replace("_", "-")}="{v}"' for k, v in attrs.items())
        self.body.append(f'<g{extra}>{"".join(items)}</g>')

    def render(self, aspect='xMidYMid slice'):
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" preserveAspectRatio="{aspect}">'
                f'<defs>{"".join(self.defs)}</defs>{"".join(self.body)}</svg>\n')


def ridge(rng, y, amp, step, roughness=0.55, left=-40, right=W + 40):
    """A smooth, natural skyline from midpoint displacement."""
    n = 1
    heights = [y + rng.uniform(-amp, amp), y + rng.uniform(-amp, amp)]
    span = amp
    while (right - left) / n > step:
        nxt = []
        for a, b in zip(heights, heights[1:]):
            nxt += [a, (a + b) / 2 + rng.uniform(-span, span)]
        nxt.append(heights[-1])
        heights, n, span = nxt, n * 2, span * roughness
    xs = [left + (right - left) * i / (len(heights) - 1) for i in range(len(heights))]
    return list(zip(xs, heights))


def ridge_path(points, bottom):
    d = f'M{f(points[0][0])},{f(bottom)} L' + ' L'.join(f'{f(x)},{f(y)}' for x, y in points)
    return d + f' L{f(points[-1][0])},{f(bottom)} Z'


def depth(y):
    """0 at the horizon, 1 at the bottom edge."""
    return max(0.0, min(1.0, (y - HORIZON) / (H - HORIZON)))


def cloud(rng, cx, cy, scale, color='#fff', shade='#d9e8f5'):
    parts = []
    for _ in range(rng.randint(5, 8)):
        rx, ry = rng.uniform(40, 90) * scale, rng.uniform(22, 40) * scale
        parts.append(f'<ellipse cx="{f(cx + rng.uniform(-110, 110) * scale)}" cy="{f(cy + rng.uniform(-18, 10) * scale)}" rx="{f(rx)}" ry="{f(ry)}" fill="{color}"/>')
    parts.append(f'<ellipse cx="{f(cx)}" cy="{f(cy + 22 * scale)}" rx="{f(150 * scale)}" ry="{f(16 * scale)}" fill="{shade}" opacity=".7"/>')
    return ''.join(parts)


def sky(svg, top, mid, horizon, sun=None, sun_color='#fff6d8'):
    svg.add(f'<rect width="{W}" height="{H}" fill="{svg.grad("sky", [(0, top), (0.55, mid), (1, horizon)])}"/>')
    if sun:
        svg.add(f'<circle cx="{sun[0]}" cy="{sun[1]}" r="420" fill="{svg.grad("sun", [(0, sun_color, 0.95), (0.2, sun_color, 0.45), (1, sun_color, 0)], radial=True)}"/>')


def clouds(svg, rng, count=6, top=40, bottom=250, tint='#ffffff', shade='#dbe9f6', opacity=0.92):
    blur = svg.blur('cloudblur', 4)
    items = [cloud(rng, rng.uniform(80, W - 80), rng.uniform(top, bottom), rng.uniform(0.6, 1.25), tint, shade) for _ in range(count)]
    svg.group(items, filter=blur, opacity=opacity)


def haze(svg, color, y0=HORIZON - 120, y1=HORIZON + 30, gid='haze'):
    svg.add(f'<rect y="{y0}" width="{W}" height="{y1 - y0}" fill="{svg.grad(gid, [(0, color, 0), (0.7, color, 0.55), (1, color, 0.8)])}"/>')


def perspective_stripes(svg, color, opacity, count=14, vx=W / 2, vy=HORIZON - 260):
    """Mowed-lawn style bands converging on a far vanishing point."""
    items = []
    for i in range(count):
        if i % 2:
            continue
        a, b = -W * 0.6 + (W * 2.2) * i / count, -W * 0.6 + (W * 2.2) * (i + 1) / count
        t = (HORIZON - vy) / (H - vy)
        top_a, top_b = vx + (a - vx) * t, vx + (b - vx) * t
        items.append(f'<polygon points="{pts([(top_a, HORIZON), (top_b, HORIZON), (b, H), (a, H)])}"/>')
    svg.group(items, fill=color, opacity=opacity)


def tuft(x, y, size, color, rng, blades=7, lean=0.0):
    paths = []
    for _ in range(blades):
        h = size * rng.uniform(0.6, 1.0)
        dx = rng.uniform(-0.45, 0.45) * size + lean * size
        bx = x + rng.uniform(-0.25, 0.25) * size
        w = size * 0.07
        paths.append(f'M{f(bx - w)},{f(y)} Q{f(bx + dx * 0.4)},{f(y - h * 0.55)} {f(bx + dx)},{f(y - h)} Q{f(bx + dx * 0.35 + w)},{f(y - h * 0.5)} {f(bx + w)},{f(y)}Z')
    return f'<path d="{"".join(paths)}" fill="{color}"/>'


def scatter_tufts(svg, rng, count, colors, min_size=8, max_size=60, y0=HORIZON + 8, blades=6):
    items = []
    for _ in range(count):
        y = y0 + (H - y0) * (rng.random() ** 1.6)
        d = depth(y)
        size = min_size + (max_size - min_size) * d
        items.append(tuft(rng.uniform(-20, W + 20), y, size, rng.choice(colors), rng, blades))
    items.sort(key=lambda s: float(s.split(',')[1].split(' ')[0]) if ',' in s else 0)
    svg.group(items)


def flowers(svg, rng, count, colors):
    items = []
    for _ in range(count):
        y = HORIZON + 10 + (H - HORIZON - 10) * (rng.random() ** 1.4)
        r = 1.2 + 6 * depth(y)
        x = rng.uniform(0, W)
        items.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r)}" fill="{rng.choice(colors)}"/>')
        if r > 3:
            items.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r * 0.38)}" fill="#ffe27a"/>')
    svg.group(items, opacity=0.9)


def foreground_frame(svg, rng, colors, height=150, count=34):
    """Big blurred blades along the bottom corners: depth of field."""
    blur = svg.blur('fore', 5)
    items = []
    for _ in range(count):
        side = rng.random() < 0.5
        x = rng.uniform(-40, 320) if side else rng.uniform(W - 320, W + 40)
        items.append(tuft(x, H + 10, rng.uniform(height * 0.6, height), rng.choice(colors), rng, 5, lean=(0.25 if side else -0.25)))
    svg.group(items, filter=blur, opacity=0.95)


def tree_line(svg, rng, y, colors, density=1.0, scale=1.0):
    items = []
    x = -40
    while x < W + 40:
        r = rng.uniform(18, 38) * scale
        cy = y - rng.uniform(0, 22) * scale
        items.append(f'<circle cx="{f(x)}" cy="{f(cy)}" r="{f(r)}" fill="{rng.choice(colors)}"/>')
        items.append(f'<circle cx="{f(x - r * 0.3)}" cy="{f(cy - r * 0.35)}" r="{f(r * 0.45)}" fill="#ffffff" opacity=".08"/>')
        x += rng.uniform(12, 30) * scale / density
    items.append(f'<rect x="-40" y="{f(y - 4)}" width="{W + 80}" height="{f(40 * scale)}" fill="{colors[0]}"/>')
    svg.group(items)


def vignette(svg, strength=0.35):
    svg.add(f'<rect width="{W}" height="{H}" fill="{svg.grad("vig", [(0.55, "#000", 0), (1, "#000", strength)], radial=True, cx="50%", cy="45%", r="75%")}"/>')


def ground(svg, top, bottom, gid='ground'):
    svg.add(f'<rect y="{HORIZON}" width="{W}" height="{H - HORIZON}" fill="{svg.grad(gid, [(0, top), (1, bottom)])}"/>')


# ── Outdoor scenes ────────────────────────────────────────────────────────
def meadow(tall=False, seed=11):
    rng, svg = random.Random(seed), Svg()
    sky(svg, '#4fa8ea', '#a9dcfb', '#e8f6ff', sun=(300, 110))
    clouds(svg, rng, 7)
    far = svg.blur('far', 2.5)
    svg.add(f'<path d="{ridge_path(ridge(rng, HORIZON - 130, 70, 24), HORIZON + 10)}" fill="#9fc3e0" filter="{far}"/>')
    svg.add(f'<path d="{ridge_path(ridge(rng, HORIZON - 80, 50, 20), HORIZON + 10)}" fill="#86b5d6" filter="{far}"/>')
    haze(svg, '#e8f6ff')
    svg.add(f'<path d="{ridge_path(ridge(rng, HORIZON - 30, 22, 16, 0.5), HORIZON + 30)}" fill="{svg.grad("hill", [(0, "#8ccf6a"), (1, "#5fae49")])}"/>')
    tree_line(svg, rng, HORIZON - 2, ['#2f7a3c', '#3a8a44', '#2a6e36', '#47984c'], 1.0, 0.8)
    ground(svg, '#a3dc76', '#4f9e3c')
    perspective_stripes(svg, '#ffffff', 0.06)
    flowers(svg, rng, 220, ['#ffffff', '#ffd6e6', '#fff3a8', '#cfe6ff'])
    greens = ['#3e8f37', '#4fa443', '#5bb24c', '#357d30']
    scatter_tufts(svg, rng, 220 if tall else 170, greens, 6, 70 if tall else 46, blades=5)
    if tall:
        for i in range(3):
            band_y = HORIZON + 60 + i * 140
            items = [tuft(rng.uniform(-30, W + 30), band_y + rng.uniform(-20, 20), rng.uniform(60, 110) * (0.6 + i * 0.25), rng.choice(['#2f7a2c', '#3e8f37', '#2a6b28']), rng, 5) for _ in range(46)]
            svg.group(items, opacity=0.9)
    foreground_frame(svg, rng, ['#2d6f2a', '#3a8634', '#256024'], 230 if tall else 170)
    vignette(svg, 0.28)
    return svg.render()


def beach(seed=21):
    rng, svg = random.Random(seed), Svg()
    sky(svg, '#3f9fe0', '#9bd6f6', '#fde8c6', sun=(1240, 160), sun_color='#fff1c9')
    clouds(svg, rng, 5, tint='#fffaf0', shade='#f3dcc0')
    svg.add(f'<path d="{ridge_path(ridge(rng, HORIZON - 40, 18, 14), HORIZON - 8)}" fill="#7aa6b8" opacity=".75"/>')
    svg.add(f'<rect y="{HORIZON - 30}" width="{W}" height="100" fill="{svg.grad("sea", [(0, "#2e8fcf"), (1, "#5cc8ea")])}"/>')
    glints = [f'<rect x="{f(rng.uniform(0, W))}" y="{f(HORIZON - 26 + rng.uniform(0, 90))}" width="{f(rng.uniform(20, 90))}" height="2" fill="#fff" opacity="{f(rng.uniform(.25, .7))}"/>' for _ in range(70)]
    svg.group(glints)
    sand_top = HORIZON + 60
    svg.add(f'<rect y="{sand_top}" width="{W}" height="{H - sand_top}" fill="{svg.grad("sand", [(0, "#e8c98d"), (0.12, "#f5e1ae"), (1, "#e6c483")])}"/>')
    foam = ' '.join(f'{f(x)},{f(sand_top + 6 * math.sin(x / 70) + rng.uniform(-2, 2))}' for x in range(-20, W + 40, 20))
    svg.add(f'<polyline points="{foam}" fill="none" stroke="#fff" stroke-width="7" opacity=".85"/>')
    ripples = []
    for _ in range(90):
        y = sand_top + 30 + (H - sand_top - 30) * rng.random() ** 1.3
        w = 30 + 140 * depth(y)
        x = rng.uniform(0, W)
        ripples.append(f'<path d="M{f(x - w)},{f(y)} Q{f(x)},{f(y - 6 - 8 * depth(y))} {f(x + w)},{f(y)}" fill="none" stroke="#c9a265" stroke-width="{f(1 + 2.5 * depth(y))}" opacity=".35"/>')
    svg.group(ripples)
    shells = [f'<circle cx="{f(rng.uniform(0, W))}" cy="{f(rng.uniform(sand_top + 40, H))}" r="{f(rng.uniform(2, 6))}" fill="{rng.choice(["#fff4ea", "#f6c6b0", "#e7d6c4"])}"/>' for _ in range(60)]
    svg.group(shells)
    # A palm frames the left edge.
    trunk = 'M150,920 C170,700 120,520 220,330'
    svg.add(f'<path d="{trunk}" fill="none" stroke="#7a5532" stroke-width="34" stroke-linecap="round"/>')
    fronds = []
    for ang in range(-170, 30, 28):
        a = math.radians(ang)
        ex, ey = 220 + math.cos(a) * 260, 330 + math.sin(a) * 120 + 90
        fronds.append(f'<path d="M220,330 Q{f(220 + math.cos(a) * 140)},{f(300 + math.sin(a) * 60)} {f(ex)},{f(ey)} Q{f(220 + math.cos(a) * 120)},{f(350 + math.sin(a) * 50)} 220,340Z" fill="{rng.choice(["#2f7d3a", "#3c8f44", "#276b31"])}"/>')
    svg.group(fronds, filter=svg.blur('palm', 1.2))
    vignette(svg, 0.22)
    return svg.render()


def sea(seed=31):
    rng, svg = random.Random(seed), Svg()
    sky(svg, '#3a92d8', '#8fcff4', '#dff3ff', sun=(1150, 140))
    clouds(svg, rng, 6)
    svg.add(f'<path d="{ridge_path(ridge(rng, HORIZON - 50, 30, 18), HORIZON + 2)}" fill="#6c97b2" opacity=".7"/>')
    svg.add(f'<rect y="{HORIZON}" width="{W}" height="{H - HORIZON}" fill="{svg.grad("water", [(0, "#4fb6e6"), (0.5, "#2a8ccc"), (1, "#16609f")])}"/>')
    svg.add(f'<polygon points="{pts([(1080, HORIZON), (1220, HORIZON), (1500, H), (800, H)])}" fill="{svg.grad("glint", [(0, "#fff", 0.55), (1, "#fff", 0)])}"/>')
    waves = []
    for _ in range(260):
        y = HORIZON + 6 + (H - HORIZON) * rng.random() ** 1.5
        w = 8 + 120 * depth(y)
        x = rng.uniform(-50, W + 50)
        waves.append(f'<path d="M{f(x - w)},{f(y)} Q{f(x)},{f(y - 3 - 7 * depth(y))} {f(x + w)},{f(y)}" fill="none" stroke="#fff" stroke-width="{f(1 + 3 * depth(y))}" opacity="{f(0.25 + 0.4 * rng.random())}"/>')
    svg.group(waves)
    vignette(svg, 0.3)
    return svg.render()


def lake(seed=41):
    rng, svg = random.Random(seed), Svg()
    sky(svg, '#5aa9e2', '#b2dcf6', '#eaf6fb', sun=(260, 120))
    clouds(svg, rng, 6)
    far = svg.blur('far', 2)
    svg.add(f'<path d="{ridge_path(ridge(rng, HORIZON - 110, 60, 22), HORIZON)}" fill="#8db3cf" filter="{far}"/>')
    tree_line(svg, rng, HORIZON - 4, ['#255f34', '#2f7040', '#1f5130', '#3a7f48'], 1.3, 1.1)
    svg.add(f'<rect y="{HORIZON}" width="{W}" height="{H - HORIZON}" fill="{svg.grad("lake", [(0, "#3e7f63"), (0.08, "#5fb2c9"), (1, "#2f7fa6")])}"/>')
    lines = [f'<rect x="{f(rng.uniform(0, W))}" y="{f(HORIZON + 12 + (H - HORIZON) * rng.random() ** 1.5)}" width="{f(rng.uniform(30, 160))}" height="2" fill="#fff" opacity="{f(rng.uniform(.15, .45))}"/>' for _ in range(120)]
    svg.group(lines)
    pads = []
    for _ in range(26):
        y = HORIZON + 40 + (H - HORIZON - 40) * rng.random()
        r = 10 + 40 * depth(y)
        x = rng.uniform(0, W)
        pads.append(f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="{f(r)}" ry="{f(r * 0.35)}" fill="#3f8f45"/>')
        if rng.random() < 0.4:
            pads.append(f'<circle cx="{f(x + r * 0.2)}" cy="{f(y - r * 0.15)}" r="{f(r * 0.18)}" fill="#ffc6dc"/>')
    svg.group(pads)
    foreground_frame(svg, rng, ['#2b6a2f', '#3a7d36', '#4b8f3f'], 200, 40)
    vignette(svg, 0.28)
    return svg.render()


def underwater(seed=51):
    rng, svg = random.Random(seed), Svg()
    svg.add(f'<rect width="{W}" height="{H}" fill="{svg.grad("deep", [(0, "#5fd0ee"), (0.45, "#1f8fc4"), (1, "#0b3d72")])}"/>')
    rays = svg.blur('rays', 10)
    beams = [f'<polygon points="{pts([(x, -20), (x + rng.uniform(40, 90), -20), (x + rng.uniform(160, 300), H), (x + rng.uniform(40, 120), H)])}" fill="#ffffff" opacity="{f(rng.uniform(.06, .14))}"/>' for x in range(-100, W, 170)]
    svg.group(beams, filter=rays)
    svg.add(f'<path d="{ridge_path(ridge(rng, HORIZON + 40, 60, 20), H)}" fill="#1a5d86" opacity=".7" filter="{svg.blur("far", 3)}"/>')
    svg.add(f'<path d="{ridge_path(ridge(rng, HORIZON + 140, 30, 18, 0.5), H)}" fill="{svg.grad("seabed", [(0, "#c9b989"), (1, "#8f7f57")])}"/>')
    kelp = []
    for x in [40, 110, 180, 1420, 1500, 1560, 720]:
        hgt = rng.uniform(320, 560)
        d = f'M{x},{H + 10}'
        for i in range(1, 9):
            d += f' Q{f(x + 30 * math.sin(i * 1.3 + x))},{f(H - hgt * (i - 0.5) / 8)} {f(x + 18 * math.sin(i * 1.7 + x))},{f(H - hgt * i / 8)}'
        kelp.append(f'<path d="{d}" fill="none" stroke="{rng.choice(["#2e8f6a", "#24785a", "#3aa07a"])}" stroke-width="{f(rng.uniform(10, 18))}" stroke-linecap="round" opacity=".9"/>')
    svg.group(kelp)
    bubbles = [f'<circle cx="{f(rng.uniform(0, W))}" cy="{f(rng.uniform(0, H))}" r="{f(rng.uniform(3, 14))}" fill="none" stroke="#e8fbff" stroke-width="2" opacity="{f(rng.uniform(.25, .6))}"/>' for _ in range(40)]
    svg.group(bubbles)
    vignette(svg, 0.45)
    return svg.render()


def mountain(seed=61):
    rng, svg = random.Random(seed), Svg()
    sky(svg, '#3c7fc4', '#9cc8ec', '#e4f1fb', sun=(1250, 120))
    clouds(svg, rng, 5)
    peaks = ridge(rng, HORIZON - 190, 190, 30, 0.5)
    svg.add(f'<path d="{ridge_path(ridge(rng, HORIZON - 250, 120, 30, 0.5), HORIZON)}" fill="#aebfd3" opacity=".8" filter="{svg.blur("farpeak", 2)}"/>')
    svg.add(f'<path d="{ridge_path(peaks, HORIZON + 20)}" fill="{svg.grad("peak", [(0, "#8c9db4"), (1, "#5d6f87")])}"/>')
    # Snow only on the high summits: a band that follows the ridge down.
    line = min(y for _, y in peaks) + 110
    snow = [(x, y) for x, y in peaks]
    lower = [(x, max(y, min(line, y + 55))) for x, y in reversed(peaks)]
    svg.add(f'<clipPath id="high"><rect width="{W}" height="{f(line)}"/></clipPath>')
    svg.add(f'<polygon points="{pts(snow + lower)}" fill="#f4f8fc" opacity=".95" clip-path="url(#high)"/>')
    shade = [(x + 18, y + 10) for x, y in peaks]
    svg.add(f'<path d="{ridge_path(shade, HORIZON + 20)}" fill="#3d4b5e" opacity=".18"/>')
    haze(svg, '#dbe9f6')
    svg.add(f'<path d="{ridge_path(ridge(rng, HORIZON - 20, 30, 16), HORIZON + 40)}" fill="#7a6d60"/>')
    ground(svg, '#a59482', '#6c5d4f')
    rocks = []
    for _ in range(70):
        y = HORIZON + 20 + (H - HORIZON) * rng.random() ** 1.4
        r = 4 + 34 * depth(y)
        x = rng.uniform(-20, W + 20)
        rocks.append(f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="{f(r * 1.4)}" ry="{f(r * 0.8)}" fill="{rng.choice(["#8a7a69", "#7a6b5c", "#968672"])}"/><ellipse cx="{f(x - r * 0.3)}" cy="{f(y - r * 0.3)}" rx="{f(r * 0.7)}" ry="{f(r * 0.3)}" fill="#fff" opacity=".12"/>')
    svg.group(rocks)
    scatter_tufts(svg, rng, 90, ['#8b8a4a', '#7a7a3e', '#a0a05c'], 5, 34)
    vignette(svg, 0.3)
    return svg.render()


def cave(seed=71):
    rng, svg = random.Random(seed), Svg()
    svg.add(f'<rect width="{W}" height="{H}" fill="{svg.grad("cavebg", [(0, "#2a2238"), (0.5, "#3b2f45"), (1, "#16111d")])}"/>')
    svg.add(f'<ellipse cx="800" cy="-40" rx="260" ry="200" fill="{svg.grad("hole", [(0, "#fff3cf", 0.55), (1, "#fff3cf", 0)], radial=True)}"/>')
    wall = ridge(rng, HORIZON - 20, 40, 20, 0.5)
    svg.add(f'<path d="{ridge_path(wall, HORIZON + 40)}" fill="#4a3b52" opacity=".8"/>')
    tites = []
    for x in range(-20, W + 40, 46):
        hgt = rng.uniform(40, 200)
        wdt = rng.uniform(22, 50)
        tites.append(f'<polygon points="{pts([(x - wdt, -10), (x + wdt, -10), (x + rng.uniform(-6, 6), hgt)])}" fill="{rng.choice(["#3a2e44", "#2e2437", "#45374f"])}"/>')
    svg.group(tites)
    ground(svg, '#5a4a5c', '#231b28')
    svg.add(f'<ellipse cx="800" cy="{HORIZON + 260}" rx="560" ry="160" fill="{svg.grad("pool", [(0, "#ffe9b8", 0.28), (1, "#ffe9b8", 0)], radial=True)}"/>')
    glow = svg.blur('glow', 6)
    crystals = []
    for _ in range(14):
        x = rng.choice([rng.uniform(20, 380), rng.uniform(1220, 1580)])
        y = HORIZON + rng.uniform(40, 460)
        s = 20 + 60 * depth(y)
        c = rng.choice(['#7ef0ff', '#d58cff', '#8cb8ff'])
        shard = pts([(x, y), (x - s * 0.25, y - s * 0.6), (x, y - s * 1.3), (x + s * 0.25, y - s * 0.6)])
        crystals.append(f'<polygon points="{shard}" fill="{c}" opacity=".35" filter="{glow}"/><polygon points="{shard}" fill="{c}" opacity=".85"/>')
    svg.group(crystals)
    mites = []
    for _ in range(18):
        y = HORIZON + rng.uniform(30, 500)
        s = 20 + 120 * depth(y)
        x = rng.uniform(-20, W + 20)
        if 520 < x < 1080 and y > HORIZON + 120:
            continue
        mites.append(f'<polygon points="{pts([(x - s * 0.35, y), (x + s * 0.35, y), (x, y - s)])}" fill="{rng.choice(["#4a3b52", "#3b2f45"])}"/>')
    svg.group(mites)
    vignette(svg, 0.6)
    return svg.render()


def building(seed=81):
    rng, svg = random.Random(seed), Svg()
    svg.add(f'<rect width="{W}" height="{HORIZON + 20}" fill="{svg.grad("wall", [(0, "#efe4d0"), (1, "#e2d2b6")])}"/>')
    svg.add(f'<rect y="{HORIZON - 90}" width="{W}" height="110" fill="#c9a77d"/><rect y="{HORIZON - 96}" width="{W}" height="8" fill="#a8845a"/>')
    beams = []
    for i, x in enumerate([220, 640, 1060]):
        svg.add(f'<rect x="{x}" y="60" width="300" height="190" rx="6" fill="#bfe4fb" stroke="#8a6a46" stroke-width="12"/><line x1="{x + 150}" y1="60" x2="{x + 150}" y2="250" stroke="#8a6a46" stroke-width="8"/>')
        beams.append(f'<polygon points="{pts([(x, 250), (x + 300, 250), (x + 420, H), (x - 140, H)])}" fill="#fff8e0" opacity=".16"/>')
    planks = []
    for i in range(-14, 15):
        x0 = 800 + i * 34
        planks.append(f'<line x1="{f(x0)}" y1="{HORIZON + 20}" x2="{f(800 + i * 150)}" y2="{H}" stroke="#7a5233" stroke-width="2" opacity=".35"/>')
    ground_top = HORIZON + 20
    svg.add(f'<rect y="{ground_top}" width="{W}" height="{H - ground_top}" fill="{svg.grad("floor", [(0, "#b27c4c"), (1, "#7d5232")])}"/>')
    svg.group(planks)
    svg.group(beams, filter=svg.blur('beam', 8))
    svg.add(f'<ellipse cx="800" cy="{H - 160}" rx="620" ry="150" fill="#8e3b3b" opacity=".25"/>')
    for x in (60, 1500):
        svg.add(f'<rect x="{x}" y="{HORIZON + 30}" width="60" height="70" rx="8" fill="#a65b3a"/>')
        leaves = ''.join(f'<ellipse cx="{f(x + 30 + rng.uniform(-50, 50))}" cy="{f(HORIZON + 10 - rng.uniform(0, 120))}" rx="18" ry="40" transform="rotate({f(rng.uniform(-40, 40))} {f(x + 30)} {HORIZON + 20})" fill="{rng.choice(["#3f8f45", "#2f7a3c"])}"/>' for _ in range(9))
        svg.add(leaves)
    vignette(svg, 0.3)
    return svg.render()


# ── Indoor arenas ─────────────────────────────────────────────────────────
ARENAS = {
    'indoor-plain': dict(wall='#26324a', floor=('#9db1c7', '#6c819b'), line='#ffffff', accent='#4fa3ff', crowd=True),
    'indoor-1': dict(wall='#1f3a40', floor=('#5fb3a8', '#2f7d74'), line='#e8fffb', accent='#5ff0d8', crowd=True),
    'indoor-2': dict(wall='#3a2a20', floor=('#c99b62', '#8a6136'), line='#fff2d6', accent='#ffb15a', crowd=True),
    'indoor-gym': dict(wall='#2a2030', floor=('#e2585a', '#a8302f'), line='#ffffff', accent='#ff5a5a', crowd=True),
    'indoor-leader': dict(wall='#2a1e1a', floor=('#e2b45a', '#a9772a'), line='#fff6d8', accent='#ffcf4a', crowd=True, banner='#b8282c'),
    'indoor-lorelei': dict(wall='#17324a', floor=('#cdeef8', '#7cc2dc'), line='#ffffff', accent='#9be8ff', ice=True),
    'indoor-bruno': dict(wall='#2c2018', floor=('#b88458', '#7a5333'), line='#ffe2b8', accent='#ff8a3a', torches=True),
    'indoor-agatha': dict(wall='#1c1428', floor=('#6a4a8c', '#33224a'), line='#e3c8ff', accent='#b47bff', fog=True),
    'indoor-lance': dict(wall='#1c1414', floor=('#a33a3a', '#5e1d22'), line='#ffe0c8', accent='#3fd6c8', banner='#1f8a82'),
    'indoor-champion': dict(wall='#efe6d2', floor=('#f7f3ea', '#d9cfb8'), line='#c9a13a', accent='#ffd36a', radiant=True),
    'indoor-link': dict(wall='#060b16', floor=('#0f1d36', '#071022'), line='#3fe0ff', accent='#3fe0ff', grid=True),
}


def arena(key, seed=91):
    p, rng, svg = ARENAS[key], random.Random(seed + len(key)), Svg()
    svg.add(f'<rect width="{W}" height="{H}" fill="{p["wall"]}"/>')
    if p.get('radiant'):
        rays = ''.join(f'<polygon points="{pts([(800, HORIZON - 120), (800 + math.cos(math.radians(a)) * 1400, HORIZON - 120 + math.sin(math.radians(a)) * 1400), (800 + math.cos(math.radians(a + 6)) * 1400, HORIZON - 120 + math.sin(math.radians(a + 6)) * 1400)])}" fill="#fff6dc" opacity=".55"/>' for a in range(180, 360, 14))
        svg.add(rays)
    if p.get('crowd'):
        crowd = []
        for row in range(7):
            y = 60 + row * 36
            for x in range(-10, W + 10, 14):
                crowd.append(f'<circle cx="{x + (row % 2) * 7}" cy="{y + rng.uniform(-3, 3):.0f}" r="5" fill="{rng.choice(["#e86a6a", "#6aa8e8", "#f2d36a", "#8fd38a", "#e8e8e8", "#b48ae8"])}"/>')
        svg.group(crowd, opacity=0.55, filter=svg.blur('crowd', 1.6))
        svg.add(f'<rect y="{HORIZON - 120}" width="{W}" height="26" fill="{p["accent"]}" opacity=".85"/>')
    if p.get('banner'):
        for x in (180, 1300):
            svg.add(f'<polygon points="{pts([(x, 0), (x + 120, 0), (x + 120, 250), (x + 60, 300), (x, 250)])}" fill="{p["banner"]}"/><circle cx="{x + 60}" cy="140" r="34" fill="none" stroke="#fff" stroke-width="6" opacity=".7"/>')
    if p.get('ice'):
        shards = ''.join(f'<polygon points="{pts([(x, HORIZON), (x + rng.uniform(20, 50), HORIZON - rng.uniform(80, 240)), (x + rng.uniform(50, 90), HORIZON)])}" fill="#bfefff" opacity="{f(rng.uniform(.35, .75))}"/>' for x in range(-20, W, 60))
        svg.add(shards)
    if p.get('torches'):
        for x in (160, 520, 1080, 1440):
            svg.add(f'<rect x="{x - 8}" y="150" width="16" height="90" fill="#5a3a22"/><circle cx="{x}" cy="140" r="60" fill="{svg.grad("torch" + str(x), [(0, "#ffb347", 0.7), (1, "#ffb347", 0)], radial=True)}"/><ellipse cx="{x}" cy="136" rx="12" ry="22" fill="#ffd27a"/>')
    lights = []
    for x in (200, 600, 1000, 1400):
        lights.append(f'<circle cx="{x}" cy="40" r="20" fill="#fff"/><polygon points="{pts([(x - 14, 40), (x + 14, 40), (x + 220, HORIZON + 200), (x - 220, HORIZON + 200)])}" fill="#ffffff" opacity=".07"/>')
    svg.group(lights, filter=svg.blur('lights', 6))
    # The court: a trapezoid in perspective with Pokémon field lines.
    left_top, right_top, left_bot, right_bot = 360, 1240, -300, 1900
    svg.add(f'<rect y="{HORIZON - 10}" width="{W}" height="{H - HORIZON + 10}" fill="{p["floor"][1]}"/>')
    svg.add(f'<polygon points="{pts([(left_top, HORIZON), (right_top, HORIZON), (right_bot, H), (left_bot, H)])}" fill="{svg.grad("court", [(0, p["floor"][0]), (1, p["floor"][1])])}"/>')
    mid_y = HORIZON + (H - HORIZON) * 0.42
    line = p['line']
    svg.add(f'<polygon points="{pts([(left_top, HORIZON), (right_top, HORIZON), (right_bot, H), (left_bot, H)])}" fill="none" stroke="{line}" stroke-width="8" opacity=".85"/>')
    svg.add(f'<line x1="{f(left_top - (left_top - left_bot) * 0.42)}" y1="{f(mid_y)}" x2="{f(right_top + (right_bot - right_top) * 0.42)}" y2="{f(mid_y)}" stroke="{line}" stroke-width="8" opacity=".85"/>')
    svg.add(f'<ellipse cx="800" cy="{f(mid_y)}" rx="230" ry="62" fill="none" stroke="{line}" stroke-width="8" opacity=".85"/>')
    svg.add(f'<ellipse cx="800" cy="{f(mid_y)}" rx="54" ry="15" fill="{line}" opacity=".85"/>')
    if p.get('grid'):
        grid = ''.join(f'<line x1="{f(800 + i * 60)}" y1="{HORIZON}" x2="{f(800 + i * 260)}" y2="{H}" stroke="{line}" stroke-width="2" opacity=".35"/>' for i in range(-12, 13))
        grid += ''.join(f'<line x1="0" y1="{f(HORIZON + (H - HORIZON) * (k / 10) ** 1.6)}" x2="{W}" y2="{f(HORIZON + (H - HORIZON) * (k / 10) ** 1.6)}" stroke="{line}" stroke-width="2" opacity=".3"/>' for k in range(1, 11))
        svg.add(grid)
    shine = svg.grad('shine', [(0, '#ffffff', 0.25), (1, '#ffffff', 0)], radial=True)
    svg.add(f'<ellipse cx="800" cy="{f(mid_y)}" rx="700" ry="180" fill="{shine}"/>')
    if p.get('fog'):
        fog = ''.join(f'<ellipse cx="{f(rng.uniform(0, W))}" cy="{f(rng.uniform(HORIZON - 40, H))}" rx="{f(rng.uniform(160, 380))}" ry="{f(rng.uniform(30, 70))}" fill="#d9b8ff" opacity=".18"/>' for _ in range(16))
        svg.group([fog], filter=svg.blur('fog', 14))
        flames = ''.join(f'<ellipse cx="{x}" cy="{HORIZON - 40}" rx="9" ry="18" fill="#c58bff"/><circle cx="{x}" cy="{HORIZON - 40}" r="40" fill="#c58bff" opacity=".2"/>' for x in (120, 420, 1180, 1480))
        svg.add(flames)
    vignette(svg, 0.5 if p['wall'] < '#8' else 0.25)
    return svg.render()


# ── Floor bases ───────────────────────────────────────────────────────────
BASES = {
    'grass': ('#8fd36a', '#4e9a3c', '#2f6e2a', 'grass'), 'longgrass': ('#78c25a', '#3f8a33', '#275e24', 'grass'),
    'sand': ('#f6e2b0', '#d9b673', '#a5824a', 'sand'), 'water': ('#bfe9fb', '#4fb3e3', '#2a7fb8', 'water'),
    'pond': ('#b9e6f2', '#58b4cf', '#2f7fa0', 'water'), 'underwater': ('#e2d3a4', '#bda774', '#7f6d47', 'sand'),
    'mountain': ('#b3a594', '#857565', '#5a4d41', 'rock'), 'cave': ('#7b6880', '#4f4058', '#2c2333', 'rock'),
    'building': ('#c25a52', '#943a35', '#5e2320', 'rug'),
}


def base(kind, seed=7):
    top, mid, edge, style = BASES.get(kind, (None, None, None, 'arena'))
    rng, svg = random.Random(seed + len(kind)), Svg(400, 120)
    if style == 'arena':
        accent = ARENAS[kind]['accent']
        svg.add(f'<ellipse cx="200" cy="66" rx="196" ry="50" fill="{svg.grad("sh", [(0, "#000", 0.35), (1, "#000", 0)], radial=True)}"/>')
        svg.add(f'<ellipse cx="200" cy="60" rx="182" ry="44" fill="none" stroke="{accent}" stroke-width="6" opacity=".9"/>')
        svg.add(f'<ellipse cx="200" cy="60" rx="182" ry="44" fill="{svg.grad("ring", [(0, accent, 0.0), (0.7, accent, 0.15), (1, accent, 0.45)], radial=True)}"/>')
        svg.add(f'<ellipse cx="200" cy="60" rx="140" ry="32" fill="none" stroke="#ffffff" stroke-width="2" opacity=".5"/>')
        return svg.render('none')
    svg.add(f'<ellipse cx="200" cy="74" rx="198" ry="44" fill="{svg.grad("shadow", [(0, "#000", 0.32), (1, "#000", 0)], radial=True)}"/>')
    if style == 'water':
        for i, (rx, ry, op) in enumerate([(190, 46, .35), (150, 36, .5), (106, 25, .65)]):
            svg.add(f'<ellipse cx="200" cy="60" rx="{rx}" ry="{ry}" fill="none" stroke="#ffffff" stroke-width="{4 - i}" opacity="{op}"/>')
        svg.add(f'<ellipse cx="200" cy="60" rx="186" ry="44" fill="{svg.grad("wat", [(0, top, 0.55), (1, mid, 0.15)], radial=True)}"/>')
        return svg.render('none')
    svg.add(f'<ellipse cx="200" cy="66" rx="186" ry="46" fill="{edge}"/>')
    svg.add(f'<ellipse cx="200" cy="56" rx="186" ry="44" fill="{svg.grad("top", [(0, top), (1, mid)], radial=True, cx="45%", cy="35%", r="75%")}"/>')
    if style == 'grass':
        for _ in range(60):
            a, r = rng.uniform(0, math.tau), rng.uniform(0.2, 1) ** 0.5
            x, y = 200 + math.cos(a) * 170 * r, 56 + math.sin(a) * 38 * r
            svg.add(tuft(x, y + 6, rng.uniform(8, 18), rng.choice(['#3e8f37', '#5bb24c', '#2f7a2c']), rng, 4))
        for _ in range(26):
            a = rng.uniform(math.pi * 0.05, math.pi * 0.95)
            svg.add(tuft(200 + math.cos(a) * 184, 58 + math.sin(a) * 44 + 8, rng.uniform(12, 22), rng.choice(['#3e8f37', '#2f7a2c']), rng, 4))
    elif style == 'sand':
        for _ in range(12):
            y = rng.uniform(30, 86)
            svg.add(f'<path d="M{f(rng.uniform(60, 200))},{f(y)} q60,-6 120,0" fill="none" stroke="{edge}" stroke-width="2" opacity=".35"/>')
    elif style == 'rock':
        for _ in range(16):
            a, r = rng.uniform(0, math.tau), rng.uniform(0, 1) ** 0.5
            svg.add(f'<ellipse cx="{f(200 + math.cos(a) * 160 * r)}" cy="{f(56 + math.sin(a) * 34 * r)}" rx="{f(rng.uniform(6, 16))}" ry="{f(rng.uniform(3, 6))}" fill="{edge}" opacity=".35"/>')
        svg.add('<path d="M70,50 L120,44 L150,58" fill="none" stroke="#000" stroke-width="2" opacity=".2"/>')
    elif style == 'rug':
        svg.add(f'<ellipse cx="200" cy="56" rx="150" ry="34" fill="none" stroke="#f3d48a" stroke-width="5" opacity=".8"/>')
        svg.add(f'<ellipse cx="200" cy="56" rx="110" ry="24" fill="none" stroke="#f3d48a" stroke-width="2" opacity=".6"/>')
    svg.add(f'<ellipse cx="170" cy="44" rx="110" ry="18" fill="#ffffff" opacity=".12"/>')
    return svg.render('none')


SCENES = {
    'grass': lambda: meadow(False), 'longgrass': lambda: meadow(True, seed=13), 'sand': beach, 'water': sea,
    'pond': lake, 'underwater': underwater, 'mountain': mountain, 'cave': cave, 'building': building,
    **{key: (lambda k=key: arena(k)) for key in ARENAS},
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for key, paint in SCENES.items():
        for name, text in ((f'{key}.svg', paint()), (f'{key}-base.svg', base(key))):
            (OUT / name).write_text(text)
            total += len(text)
    print(f'{len(SCENES)} scenes, {total // 1024} KB')


if __name__ == '__main__':
    main()
