#!/usr/bin/env python3
"""Build one icon atlas for every item in the Pokémon catalogue.

Source: PokeAPI/sprites at a pinned commit (original game item sprites
mirrored by PokeAPI; see src/workshop/pokemon/CREDITS.md). Each sprite is
trimmed to its visible pixels and fitted into a 48 px cell: small pixel art
is enlarged by a whole-number factor with nearest-neighbour, larger art is
reduced smoothly. Output: assets/items/atlas.webp + data/item-icons.json.

Usage: python tools/build-pokemon-item-icons.py [local sprites/items dir]
Without a directory the sprites are downloaded from the pinned commit.
"""
import hashlib, io, json, math, os, sys, urllib.request
from PIL import Image

COMMIT = '1dd55c0436d2a5b6e324c0b780e1b1b416fbfb64'
CELL, PAD = 48, 2
ROOT = os.path.join(os.path.dirname(__file__), '..', 'src', 'workshop', 'pokemon')
items = json.load(open(os.path.join(ROOT, 'data', 'expansion.json')))['items']
ids = [i['id'] for i in items]
local = sys.argv[1] if len(sys.argv) > 1 else ''

def load(name):
    if local:
        return open(os.path.join(local, name + '.png'), 'rb').read()
    url = f'https://raw.githubusercontent.com/PokeAPI/sprites/{COMMIT}/sprites/items/{name}.png'
    return urllib.request.urlopen(url, timeout=30).read()

def fit(raw):
    im = Image.open(io.BytesIO(raw)).convert('RGBA')
    box = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    if box: im = im.crop(box)
    room = CELL - 2 * PAD; w, h = im.size
    if max(w, h) <= room // 2:
        k = max(1, room // max(w, h)); im = im.resize((w * k, h * k), Image.NEAREST)
    elif max(w, h) > room:
        s = room / max(w, h); im = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    cell = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    cell.paste(im, ((CELL - im.width) // 2, (CELL - im.height) // 2), im)
    return cell

cols = 48; rows = math.ceil(len(ids) / cols)
atlas = Image.new('RGBA', (cols * CELL, rows * CELL), (0, 0, 0, 0))
sources = {}
for n, name in enumerate(ids):
    raw = load(name); sources[name] = hashlib.sha256(raw).hexdigest()
    atlas.paste(fit(raw), ((n % cols) * CELL, (n // cols) * CELL))
out = io.BytesIO(); atlas.save(out, 'WEBP', lossless=True, method=6); data = out.getvalue()
open(os.path.join(ROOT, 'assets', 'items', 'atlas.webp'), 'wb').write(data)
index = {'schema': 1, 'mirror': 'PokeAPI/sprites', 'commit': COMMIT, 'cell': CELL, 'columns': cols, 'rows': rows,
         'atlas': 'assets/items/atlas.webp', 'sha256': hashlib.sha256(data).hexdigest(), 'ids': ids,
         'rights': 'Pokémon assets belong to Nintendo / Game Freak / Creatures / The Pokémon Company. These are community mirrors, not official hosting.'}
json.dump(index, open(os.path.join(ROOT, 'data', 'item-icons.json'), 'w'), separators=(',', ':'))
# Checksums of every source sprite, kept out of the runtime index.
json.dump({'mirror': 'PokeAPI/sprites', 'commit': COMMIT, 'sha256': sources}, open(os.path.join(os.path.dirname(__file__), 'pokemon-item-icon-sources.json'), 'w'), indent=0)
print('Packed', len(ids), 'item icons,', len(data), 'bytes')
