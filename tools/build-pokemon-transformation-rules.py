"""Extract declarative transformation facts from a pinned Showdown data checkout.

Usage: python tools/build-pokemon-transformation-rules.py /path/to/sources
The directory contains moves.ts, items.ts, pokedex.ts and commit.txt. No source
code is evaluated. Engine callbacks are implemented and tested separately.
"""
import json
import pathlib
import re
import sys

root = pathlib.Path(__file__).resolve().parents[1]
source = pathlib.Path(sys.argv[1])
catalog = json.loads((root / 'src/workshop/pokemon/data/catalog.json').read_text())
expansion = json.loads((root / 'src/workshop/pokemon/data/expansion.json').read_text())
norm = lambda s: re.sub('[^a-z0-9]', '', s.lower())
blocks = {}
for name in ['pokedex', 'items', 'moves']:
    blocks[name] = dict(re.findall(r'^\t([a-z0-9]+): \{(.*?)(?=^\t[a-z0-9]+: \{|\Z)',
                                 (source / (name + '.ts')).read_text(), re.M | re.S))

def string(block, key):
    match = re.search(r'\b' + key + r': [\'"]([^\'"]+)[\'"]', block)
    return match[1] if match else ''

items = {norm(i['name']): i['id'] for i in expansion['items']}
forms = {norm(p['key']): p for p in catalog['forms']}
forms.update({'meowsticmmega': forms['meowsticmalemega'], 'meowsticfmega': forms['meowsticfemalemega']})
mega = {}
for key, block in blocks['pokedex'].items():
    p = forms.get(key)
    if not p or not re.search('-mega(?:-|$)', p['key']):
        continue
    item = items.get(norm(string(block, 'requiredItem')))
    if not item and p['key'] != 'rayquaza-mega':
        raise ValueError('Missing Mega Stone: ' + p['key'])
    # Showdown explicitly identifies special bases such as Eternal Floette.
    base = string(block, 'battleOnly') or string(block, 'baseSpecies')
    mega[p['key']] = {'item': item or '', 'base': base}
expected = {p['key'] for p in catalog['forms'] if re.search('-mega(?:-|$)', p['key'])}
if set(mega) != expected:
    raise ValueError('Unmapped Mega forms: ' + str(expected - set(mega)))

moves = {}
for key, block in blocks['moves'].items():
    num = re.search(r'^\s*num: (\d+),', block)
    if not num:
        continue
    z = re.search(r'\bzMove: \{(.*?)\},', block, re.S)
    entry = {}
    if z:
        power = re.search(r'basePower: (\d+)', z[1])
        if power:
            entry['zPower'] = int(power[1])
        boost = re.search(r'boost: \{([^}]+)', z[1])
        if boost:
            entry['zBoost'] = {k: int(v) for k, v in re.findall(r'(\w+): (-?\d+)', boost[1])}
        effect = string(z[1], 'effect')
        if effect:
            entry['zEffect'] = effect
    max_power = re.search(r'\bmaxMove: \{ basePower: (\d+)', block)
    if max_power:
        entry['maxPower'] = int(max_power[1])
    flags = re.search(r'flags: \{([^}]+)', block)
    if flags:
        found = [flag for flag in ['pulse', 'slicing', 'bullet', 'sound'] if re.search(r'\b' + flag + r': 1', flags[1])]
        if found:
            entry['flags'] = found
    if entry:
        moves[num[1]] = entry

zitems = {}
for block in blocks['items'].values():
    if 'zMove:' not in block:
        continue
    item = items.get(norm(string(block, 'name')))
    if not item:
        continue
    move = string(block, 'zMove')
    data = {'type': string(block, 'zMoveType').lower()} if not move else {
        'move': move, 'from': string(block, 'zMoveFrom'),
        'users': re.findall(r'"([^"]+)"', re.search(r'itemUser: \[([^]]+)\]', block)[1])}
    for candidate in expansion['items']:
        if norm(candidate['name']) == norm(string(block, 'name')):
            zitems[candidate['id']] = data

out = {'source': {'name': 'Pokemon Showdown', 'repo': 'https://github.com/smogon/pokemon-showdown',
                  'commit': (source / 'commit.txt').read_text().strip(), 'license': 'MIT'},
       'mega': mega, 'moves': moves, 'zItems': zitems}
target = root / 'src/workshop/pokemon/transformation-data.js'
target.write_text('// Generated declarative facts; see tools/build-pokemon-transformation-rules.py and CREDITS.md.\n'
                  'export const TRANSFORMATION_DATA=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('Mega:', len(mega), 'move overrides:', len(moves), 'Z crystals:', len(zitems))
