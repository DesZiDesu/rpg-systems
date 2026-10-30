#!/usr/bin/env python3
"""Index every game-version sprite style in PokeAPI/sprites for the Pokémon addon.

The index records, per style and per catalogue form, which views exist
(front/back x standard/shiny/female/shiny-female). It is built from the file
listing of the pinned sprite revision, so nothing is guessed and no image is
downloaded. Images still load on demand from that revision.

Produce the listing without downloading blobs:

  git clone --filter=blob:none --no-checkout https://github.com/PokeAPI/sprites.git sprites
  git -C sprites ls-tree -r --name-only <commit> sprites/pokemon > sprite-tree.txt
  python tools/build-pokemon-sprite-styles.py sprite-tree.txt <commit>
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'src/workshop/pokemon/data'

# id, folder, extension, family, generation, animated, heavy, labels (en, th).
# heavy: large animated files (over ~1 MB); menus show a still instead.
STYLES = [
    ('official-artwork', 'other/official-artwork', 'png', 'art', 10, False, False, 'Official artwork', 'อาร์ตเวิร์กทางการ'),
    ('home', 'other/home', 'png', 'art', 9, False, False, 'Pokémon HOME (HD render)', 'Pokémon HOME (ภาพ HD)'),
    ('dream-world', 'other/dream-world', 'svg', 'art', 5, False, False, 'Dream World (vector)', 'Dream World (ภาพเวกเตอร์)'),
    ('art-red-green', 'other/official-artwork/versions/generation-i/red-and-green', 'png', 'art', 1, False, False, 'Original art · Red & Green', 'อาร์ตต้นฉบับ · Red & Green'),
    ('art-red-blue', 'other/official-artwork/versions/generation-i/red-and-blue', 'png', 'art', 1, False, False, 'Original art · Red & Blue', 'อาร์ตต้นฉบับ · Red & Blue'),
    ('art-gold-silver', 'other/official-artwork/versions/generation-ii/gold-and-silver', 'png', 'art', 2, False, False, 'Original art · Gold & Silver', 'อาร์ตต้นฉบับ · Gold & Silver'),
    ('gen1-red-green', 'versions/generation-i/red-green-japan', 'png', 'pixel', 1, False, False, 'Gen I · Red & Green (Japan)', 'Gen I · Red & Green (ญี่ปุ่น)'),
    ('gen1-red-blue', 'versions/generation-i/red-blue/transparent', 'png', 'pixel', 1, False, False, 'Gen I · Red & Blue', 'Gen I · Red & Blue'),
    ('gen1-yellow', 'versions/generation-i/yellow/transparent', 'png', 'pixel', 1, False, False, 'Gen I · Yellow', 'Gen I · Yellow'),
    ('gen1-yellow-gbc', 'versions/generation-i/yellow/gbc', 'png', 'pixel', 1, False, False, 'Gen I · Yellow (Game Boy Color)', 'Gen I · Yellow (Game Boy Color)'),
    ('gen2-gold', 'versions/generation-ii/gold/transparent', 'png', 'pixel', 2, False, False, 'Gen II · Gold', 'Gen II · Gold'),
    ('gen2-silver', 'versions/generation-ii/silver/transparent', 'png', 'pixel', 2, False, False, 'Gen II · Silver', 'Gen II · Silver'),
    ('gen2-crystal', 'versions/generation-ii/crystal/transparent', 'png', 'pixel', 2, False, False, 'Gen II · Crystal', 'Gen II · Crystal'),
    ('gen2-crystal-animated', 'versions/generation-ii/crystal/animated', 'gif', 'pixel', 2, True, False, 'Gen II · Crystal (animated)', 'Gen II · Crystal (เคลื่อนไหว)'),
    ('gen3-ruby-sapphire', 'versions/generation-iii/ruby-sapphire', 'png', 'pixel', 3, False, False, 'Gen III · Ruby & Sapphire', 'Gen III · Ruby & Sapphire'),
    ('gen3-emerald', 'versions/generation-iii/emerald', 'png', 'pixel', 3, False, False, 'Gen III · Emerald', 'Gen III · Emerald'),
    ('gen3-emerald-animated', 'versions/generation-iii/emerald/animated', 'png', 'pixel', 3, True, False, 'Gen III · Emerald (animated)', 'Gen III · Emerald (เคลื่อนไหว)'),
    ('gen3-firered-leafgreen', 'versions/generation-iii/firered-leafgreen', 'png', 'pixel', 3, False, False, 'Gen III · FireRed & LeafGreen', 'Gen III · FireRed & LeafGreen'),
    ('gen4-diamond-pearl', 'versions/generation-iv/diamond-pearl', 'png', 'pixel', 4, False, False, 'Gen IV · Diamond & Pearl', 'Gen IV · Diamond & Pearl'),
    ('gen4-diamond-pearl-animated', 'versions/generation-iv/diamond-pearl/animated', 'png', 'pixel', 4, True, False, 'Gen IV · Diamond & Pearl (animated)', 'Gen IV · Diamond & Pearl (เคลื่อนไหว)'),
    ('gen4-platinum', 'versions/generation-iv/platinum', 'png', 'pixel', 4, False, False, 'Gen IV · Platinum', 'Gen IV · Platinum'),
    ('gen4-platinum-animated', 'versions/generation-iv/platinum/animated', 'png', 'pixel', 4, True, False, 'Gen IV · Platinum (animated)', 'Gen IV · Platinum (เคลื่อนไหว)'),
    ('gen4-heartgold-soulsilver', 'versions/generation-iv/heartgold-soulsilver', 'png', 'pixel', 4, False, False, 'Gen IV · HeartGold & SoulSilver', 'Gen IV · HeartGold & SoulSilver'),
    ('gen4-heartgold-soulsilver-animated', 'versions/generation-iv/heartgold-soulsilver/animated', 'png', 'pixel', 4, True, False, 'Gen IV · HeartGold & SoulSilver (animated)', 'Gen IV · HeartGold & SoulSilver (เคลื่อนไหว)'),
    ('gen5-black-white', 'versions/generation-v/black-white', 'png', 'pixel', 5, False, False, 'Gen V · Black & White', 'Gen V · Black & White'),
    ('gen5-black-white-animated', 'versions/generation-v/black-white/animated', 'gif', 'pixel', 5, True, False, 'Gen V · Black & White (animated)', 'Gen V · Black & White (เคลื่อนไหว)'),
    ('gen6-x-y', 'versions/generation-vi/x-y', 'png', 'model', 6, False, False, 'Gen VI · X & Y', 'Gen VI · X & Y'),
    ('gen6-omega-ruby-alpha-sapphire', 'versions/generation-vi/omega-ruby-alpha-sapphire', 'png', 'model', 6, False, False, 'Gen VI · Omega Ruby & Alpha Sapphire', 'Gen VI · Omega Ruby & Alpha Sapphire'),
    ('gen7-ultra-sun-ultra-moon', 'versions/generation-vii/ultra-sun-ultra-moon', 'gif', 'model', 7, True, False, 'Gen VII · Ultra Sun & Ultra Moon (animated)', 'Gen VII · Ultra Sun & Ultra Moon (เคลื่อนไหว)'),
    ('gen7-lets-go', 'versions/generation-vii/lets-go-pikachu-lets-go-eevee', 'gif', 'model', 7, True, True, "Gen VII · Let's Go (animated HD)", "Gen VII · Let's Go (เคลื่อนไหว HD)"),
    ('gen8-sword-shield', 'versions/generation-viii/sword-shield', 'webp', 'model', 8, True, True, 'Gen VIII · Sword & Shield (animated HD)', 'Gen VIII · Sword & Shield (เคลื่อนไหว HD)'),
    ('gen8-brilliant-diamond-shining-pearl', 'versions/generation-viii/brilliant-diamond-shining-pearl', 'webp', 'model', 8, True, True, 'Gen VIII · Brilliant Diamond & Shining Pearl (animated HD)', 'Gen VIII · Brilliant Diamond & Shining Pearl (เคลื่อนไหว HD)'),
    ('gen8-legends-arceus', 'versions/generation-viii/legends-arceus', 'webp', 'model', 8, True, True, 'Gen VIII · Legends: Arceus (animated HD)', 'Gen VIII · Legends: Arceus (เคลื่อนไหว HD)'),
    ('gen9-scarlet-violet', 'versions/generation-ix/scarlet-violet', 'webp', 'model', 9, True, True, 'Gen IX · Scarlet & Violet (animated HD)', 'Gen IX · Scarlet & Violet (เคลื่อนไหว HD)'),
    ('gen9-legends-za', 'versions/generation-ix/legends-za', 'webp', 'model', 9, True, True, 'Gen IX · Legends: Z-A (animated HD)', 'Gen IX · Legends: Z-A (เคลื่อนไหว HD)'),
    ('gen9-champions', 'versions/generation-ix/champions', 'webp', 'model', 9, True, True, 'Pokémon Champions (animated HD)', 'Pokémon Champions (เคลื่อนไหว HD)'),
    ('showdown', 'other/showdown', 'gif', 'model', 7, True, False, 'Showdown (animated)', 'Showdown (เคลื่อนไหว)'),
    ('classic', '', 'png', 'pixel', 5, False, False, 'Classic sprite', 'สไปรต์คลาสสิก'),
]
# Selectable, but never a stand-in for another game: Showdown's newest
# Pokémon are small placeholder animations.
NOT_FALLBACK = {'showdown'}
# Files named differently from the catalogue form they show.
ALIASES = {'ogerpon': ['1017-nomask']}
# Bit order matches the variant index used by the addon at runtime.
VIEWS = ['', 'shiny/', 'female/', 'shiny/female/', 'back/', 'back/shiny/', 'back/female/', 'back/shiny/female/']


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    listing, commit = Path(sys.argv[1]), sys.argv[2]
    files = {line.strip() for line in listing.read_text().splitlines() if line.strip()}
    catalog = json.loads((DATA / 'catalog.json').read_text())
    battle = json.loads((DATA / 'battle-sprites.json').read_text())
    if battle['commit'] != commit:
        sys.exit(f'Sprite revision {commit} differs from battle-sprites.json ({battle["commit"]}).')
    forms = catalog['forms']
    keys = [f['key'] for f in forms]

    shared = {}
    for form in forms:
        shared[form['pokemonId']] = shared.get(form['pokemonId'], 0) + 1

    # Exact stems first, then the "<species>-<form>" names some folders use.
    # A pokemonId shared by cosmetic forms names the default form's image, so
    # other forms never borrow it: no form or colour is ever substituted.
    def stems(form):
        row = battle['entries'].get(form['key']) or []
        parts = form['key'].split('-')
        found = [row[4] if len(row) > 4 else '', row[0] if row else '', row[2] if len(row) > 2 else '']
        found += [f"{form['speciesId']}-{'-'.join(parts[i:])}" for i in range(1, len(parts))]
        found += ALIASES.get(form['key'], [])
        if form['default'] or shared[form['pokemonId']] == 1:
            found.append(str(form['pokemonId']))
        return [s for i, s in enumerate(found) if s and s not in found[:i]]

    styles, unmatched = [], {}
    for sid, folder, ext, family, gen, animated, heavy, en, th in STYLES:
        base = 'sprites/pokemon/' + (folder + '/' if folder else '')
        masks, exceptions, used = [], {}, set()
        for form in forms:
            choices = stems(form)
            mask, stem = 0, ''
            for candidate in choices:
                m = sum(1 << bit for bit, view in enumerate(VIEWS) if f'{base}{view}{candidate}.{ext}' in files)
                if m & 1 or (m and not mask):
                    mask, stem = m, candidate
                if m & 1:
                    break
            masks.append(mask)
            if mask:
                used.add(stem)
                if stem != choices[0]:
                    exceptions[form['key']] = stem
        names = {p[len(base):].rsplit('.', 1)[0].split('/')[-1] for p in files
                 if p.startswith(base) and p.endswith('.' + ext) and '/'.join(p[len(base):].split('/')[:-1] + ['']) in VIEWS}
        unmatched[sid] = sorted(names - used, key=lambda v: (len(v), v))
        style = {'id': sid, 'folder': folder, 'ext': ext, 'family': family, 'gen': gen, 'animated': animated, 'heavy': heavy,
                 'label': en, 'labelTh': th, 'masks': ''.join(f'{m:02x}' for m in masks)}
        if sid in NOT_FALLBACK:
            style['fallback'] = False
        if exceptions:
            style['stems'] = exceptions
        styles.append(style)

    out = {'schema': 1, 'source': 'PokeAPI/sprites', 'commit': commit, 'views': VIEWS, 'forms': keys,
           'stems': [(stems(form) or [''])[0] for form in forms], 'styles': styles}
    (DATA / 'sprite-styles.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n')
    print('style'.ljust(40), 'forms  front  shiny  back  female  unmatched files')
    for style in styles:
        m = [int(style['masks'][i:i + 2], 16) for i in range(0, len(style['masks']), 2)]
        count = lambda bit: sum(1 for v in m if v & (1 << bit))
        print(style['id'].ljust(40), str(sum(1 for v in m if v)).rjust(5), str(count(0)).rjust(6), str(count(1)).rjust(6),
              str(count(4)).rjust(5), str(count(2)).rjust(7), len(unmatched[style['id']]), unmatched[style['id']][:6])


if __name__ == '__main__':
    main()
