"""Index exact-form front/back sprite availability at the pinned sprite revision.
Battle images remain lazy, on-demand downloads. --build-stills extracts small
PNG fallbacks only for exact forms whose only source is an animated WebP.
Pass --trees-dir to rebuild from cached path lists without network access.
"""
import argparse
import concurrent.futures
import hashlib
import json
import re
import unicodedata
from collections import Counter
from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT/'src/workshop/pokemon/data/catalog.json').read_text())
REV = CATALOG['source']['spritesCommit']
TREES = {
    'bw': ('versions/generation-v/black-white/animated', True),
    'showdown': ('other/showdown', True),
    'genix': ('versions/generation-ix', True),
    'static-front': ('', False),
    'static-front-female': ('female', True),
    'static-front-shiny': ('shiny', True),
    'static-back': ('back', True),
}
VARIANTS = ['', 'female/', 'shiny/', 'shiny/female/']
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--trees-dir', type=Path)
parser.add_argument('--build-stills', action='store_true')
args = parser.parse_args()

def paths(entry):
    name, (folder, recursive) = entry
    if args.trees_dir:
        return name, set(json.loads((args.trees_dir/(name+'-paths.json')).read_text()))
    url = f'https://api.github.com/repos/PokeAPI/sprites/git/trees/{REV}:sprites/pokemon'
    if folder:
        url += '/'+folder
    if recursive:
        url += '?recursive=1'
    with urlopen(Request(url, headers={'User-Agent': 'RoleForge-sprite-index'}), timeout=60) as response:
        tree = json.load(response)
    if tree.get('truncated'):
        raise RuntimeError('Incomplete sprite tree: '+folder)
    return name, {node['path'] for node in tree['tree'] if node['type'] == 'blob'}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    source = dict(pool.map(paths, TREES.items()))
front = source['static-front'] | {'female/'+p for p in source['static-front-female']} | {'shiny/'+p for p in source['static-front-shiny']}
back = source['static-back']

def png_mask(stem, files):
    return sum(1 << i for i, variant in enumerate(VARIANTS) if variant+stem+'.png' in files)

def gif_pair(stems, files):
    for stem in stems:
        mask = sum(1 << i for i, variant in enumerate(VARIANTS)
                   if variant+stem+'.gif' in files and 'back/'+variant+stem+'.gif' in files)
        if mask:
            return stem, mask
    return '', 0

# These internal evolution-origin forms are visually identical. This explicit
# allowlist does not apply to Vivillon, Burmy or Wormadam, whose patterns differ.
# References: pokemondb.net/sprites/{mothim,scatterbug,spewpa} and
# bulbapedia.bulbagarden.net/wiki/Scatterbug_(Pokémon), section Form data.
SHARED_VISUAL_SPECIES = {414, 664, 665}
shared_visual_forms = {}
pokemon_counts = Counter(f['pokemonId'] for f in CATALOG['forms'])
extra_models = {}
still_sources = {}
entries = {}
for form in CATALOG['forms']:
    stems = []
    if form.get('image'):
        stems.append(form['image'].rsplit('/', 1)[-1].removesuffix('.png'))
    # Exact canonical suffixes cover cosmetic forms whose catalogue artwork is
    # empty (e.g. Flabébé Yellow). Only filenames present in the pinned trees
    # are admitted; this never invents an image or drops a form suffix.
    species_slug = re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFKD', form['name']).encode('ascii', 'ignore').decode().lower()).strip('-')
    if form['key'].startswith(species_slug+'-'):
        suffix = form['key'][len(species_slug)+1:]
        stems.append(str(form['speciesId'])+'-'+suffix)
    # A canonical Pokémon's default form may use a named artwork filename
    # (e.g. Vivillon Meadow) while its battle sprite uses the Pokémon ID.
    # Never apply this alias to a cosmetic/non-default form such as Unown B.
    if form['default']:
        stems.append(str(form['pokemonId']))
    if form['speciesId'] in SHARED_VISUAL_SPECIES and not form['default']:
        stems.append(str(form['speciesId']))
        shared_visual_forms[form['key']] = str(form['speciesId'])
    stems = list(dict.fromkeys(stems))
    pixel, pixel_mask = gif_pair(stems, source['bw'])
    model, model_mask = gif_pair(stems, source['showdown'])
    still = next((s for s in stems if png_mask(s, front) or png_mask(s, back)), '')
    entries[form['key']] = [pixel, pixel_mask, model, model_mask, still, png_mask(still, front), png_mask(still, back)]
    # Newer game renders are animated WebP, not GIF. Prefer the smaller GIF
    # library; add a game render only where its exact color has no GIF pair.
    modern_stems = list(stems)
    if pokemon_counts[form['pokemonId']] == 1:
        modern_stems.append(str(form['pokemonId']))
    for folder in ['scarlet-violet', 'legends-za', 'champions']:
        for stem in dict.fromkeys(modern_stems):
            mask = sum(1 << i for i, variant in enumerate(VARIANTS)
                       if f'{folder}/{variant}{stem}.webp' in source['genix']
                       and f'{folder}/back/{variant}{stem}.webp' in source['genix'])
            mask &= ~(pixel_mask | model_mask)
            if not mask:
                continue
            local = mask & ~(png_mask(still, front) & png_mask(still, back))
            extra_models[form['key']] = {'folder': folder, 'stem': stem, 'mask': mask, 'static': local}
            for i, variant in enumerate(VARIANTS):
                if not local & (1 << i):
                    continue
                for side in ['', 'back/']:
                    relative = side+variant+stem+'.png'
                    still_sources[relative] = f'versions/generation-ix/{folder}/{side}{variant}{stem}.webp'
            break
        if form['key'] in extra_models:
            break

assets = ROOT/'src/workshop/pokemon/assets/battle/sprites'
checksums = {}
def extract_still(entry):
    relative, source_path = entry
    target = assets/relative
    if args.build_stills:
        from PIL import Image
        url = f'https://raw.githubusercontent.com/PokeAPI/sprites/{REV}/sprites/pokemon/{source_path}'
        request = Request(url, headers={'User-Agent': 'RoleForge-sprite-index'})
        with urlopen(request, timeout=120) as response:
            image = Image.open(BytesIO(response.read()))
            image.seek(0)
            still_image = image.convert('RGBA')
            # Retain source proportions/transparency, cap local fallback size.
            still_image.thumbnail((256, 256))
            target.parent.mkdir(parents=True, exist_ok=True)
            still_image.save(target, optimize=True)
    if not target.is_file():
        raise RuntimeError('Missing local still; rebuild using --build-stills: '+relative)
    return relative, {'source': source_path, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    checksums = dict(pool.map(extract_still, sorted(still_sources.items())))

base_forms = [next(f for f in CATALOG['forms'] if f['pokemonId'] == i and f['default']) for i in range(1, 1026)]
def coverage(forms):
    rows = [entries[f['key']] for f in forms]
    extra = [extra_models.get(f['key'], {}) for f in forms]
    return {'total': len(rows), 'pixelPairs': sum(bool(r[1]&1) for r in rows),
            'modelPairs': sum(bool(r[3]&1) for r in rows),
            'webpPairs': sum(bool(e.get('mask',0)&1) for e in extra),
            'animatedPairs': sum(bool((r[1]|r[3]|e.get('mask',0))&1) for r,e in zip(rows,extra)),
            'staticPairs': sum(bool(((r[5]&r[6])|e.get('static',0))&1) for r,e in zip(rows,extra)),
            'frontAvailable': sum(bool((r[1]|r[3]|r[5]|e.get('mask',0)|e.get('static',0))&1) for r,e in zip(rows,extra)),
            'backAvailable': sum(bool((r[1]|r[3]|r[6]|e.get('mask',0)|e.get('static',0))&1) for r,e in zip(rows,extra))}
result = {'schema': 1, 'commit': REV,
          'columns': ['pixelStem', 'pixelPairMask', 'modelStem', 'modelPairMask', 'staticStem', 'frontPngMask', 'backPngMask'],
          'variantBits': ['standard', 'female', 'shiny', 'shinyFemale'],
          'coverage': {'species': coverage(base_forms), 'forms': coverage(CATALOG['forms'])},
          'sharedVisualForms': shared_visual_forms,
          'extraModels': extra_models, 'localStillSources': checksums,
          'missingBackForms': [f['key'] for f in CATALOG['forms'] if not (entries[f['key']][1]|entries[f['key']][3]|entries[f['key']][6]|extra_models.get(f['key'],{}).get('mask',0))&1],
          'sourcePathHashes': {name: hashlib.sha256('\n'.join(sorted(files)).encode()).hexdigest() for name, files in source.items()},
          'entries': entries}
output = ROOT/'src/workshop/pokemon/data/battle-sprites.json'
output.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':'))+'\n')
print(json.dumps(result['coverage'], indent=2))
print('Index bytes:', output.stat().st_size)
