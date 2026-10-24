"""Cache original game sprites and decode FireRed's grass battle tilemap.

Sources are pinned mirrors, not official hosting. No substitute fan artwork.
Requires Pillow; does not require a ROM. Run from any working directory.
"""
import hashlib
import io
import json
from pathlib import Path
import struct
import urllib.request
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'src/workshop/pokemon'
FIRE_RED = 'ce6406d8c2eaf46d543c8a2606de0c3cb1951982'
SPRITES = '97a7832d307311c0e1c6ea9035308bf80cc94f81'
ITEMS = ['poke-ball', 'great-ball', 'potion', 'fire-stone', 'water-stone',
         'thunder-stone', 'leaf-stone', 'moon-stone']
sources = []


def fetch(url):
    body = urllib.request.urlopen(url, timeout=45).read()
    sources.append({'url': url, 'sha256': hashlib.sha256(body).hexdigest()})
    return body


def write_image(image, relative):
    path = ROOT / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format='PNG', optimize=True)


base = f'https://raw.githubusercontent.com/pret/pokefirered/{FIRE_RED}/graphics/battle_terrain/grass/'
tiles = Image.open(io.BytesIO(fetch(base + 'terrain.png')))
entries = struct.unpack('<2048H', fetch(base + 'terrain.bin'))
palette = [tuple(map(int, row.split())) for row in fetch(base + 'terrain.pal').decode().splitlines()[3:]]
canvas = Image.new('RGB', (256, 256))
# FireRed loads the terrain palettes at BG palette bank 2. The first screenblock
# contains the 240 x 112 visible battle field; subsequent blocks are not shown.
for index, entry in enumerate(entries[:1024]):
    tile_id = entry & 1023
    x, y = tile_id % 8 * 8, tile_id // 8 * 8
    tile = tiles.crop((x, y, x + 8, y + 8))
    bank = max(0, (entry >> 12) - 2)
    colors = [v for rgb in palette[bank * 16:bank * 16 + 16] for v in rgb]
    tile.putpalette(colors + [0] * (768 - len(colors)))
    if entry & 1024:
        tile = tile.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    if entry & 2048:
        tile = tile.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    canvas.paste(tile.convert('RGB'), (index % 32 * 8, index // 32 * 8))
write_image(canvas.crop((0, 0, 240, 112)), 'assets/battle/firered-grass.png')

for name in ITEMS:
    url = f'https://raw.githubusercontent.com/PokeAPI/sprites/{SPRITES}/sprites/items/{name}.png'
    image = Image.open(io.BytesIO(fetch(url)))
    write_image(image, f'assets/items/{name}.png')

manifest = {'battle': {'game': 'Pokémon FireRed', 'terrain': 'grass',
    'mirror': 'pret/pokefirered', 'commit': FIRE_RED, 'visibleSize': [240, 112],
    'note': 'Original game tilemap and palettes reconstructed; platforms are part of this image.'},
    'items': {'mirror': 'PokeAPI/sprites', 'commit': SPRITES, 'names': ITEMS},
    'rights': 'Pokémon assets belong to Nintendo / Game Freak / Creatures / The Pokémon Company. These are community mirrors, not official hosting.',
    'sources': sources}
(ROOT / 'data/game-assets.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('Cached FireRed battle terrain and', len(ITEMS), 'original item sprites.')
