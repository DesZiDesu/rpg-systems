#!/usr/bin/env python3
"""Build an image-only update and a portable card from the supplied Fate archive.

Never rewrites untouched world-file text: manifest hashes refer to original UTF-8.
Usage: python tools/build-fate-servant-icons.py INPUT_CARD OUTPUT_DIRECTORY
"""
import base64
import collections
import gzip
import hashlib
import json
from pathlib import Path
import sys
from io import BytesIO
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CLASSES = {c: 'icons/' + c.lower().replace(' ', '') + '.png' for c in
           ['Saber', 'Archer', 'Lancer', 'Rider', 'Caster', 'Assassin', 'Berserker',
            'Ruler', 'Avenger', 'Moon Cancer', 'Alter Ego', 'Foreigner', 'Pretender', 'Shielder']}
# Non-FGO spiritual bodies whose generic occupation is not a class. These are
# stable body IDs, never name matches (human Waver/Rin/Shirou remain untouched).
CURATED = dict(zip([
    'alexandre-dumas', 'no-name-beautiful-assassin', 'alcides', 'true-assassin-snowfield',
    'gilgamesh-alter-ego-king', 'saver-buddha', 'karl-der-grosse', 'archimedes',
    'jeanne-d-arc-edo-lancer', 'aslaug', 'ragnar-lodbrok', 'galahad-alter',
    'gilgamesh-prototype-archer-body', 'sita'], [
    'Caster', 'Assassin', 'Archer', 'Assassin', 'Alter Ego', 'Saver', 'Ruler', 'Caster',
    'Lancer', 'Archer', 'Berserker', 'Saber', 'Archer', 'Archer']))
CLASSES['Saver'] = 'icons/saver.png'

def encode(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))

def sha(value):
    return hashlib.sha256(value).hexdigest()

def classify(body):
    occupation = body.get('occupation', '')
    if occupation in CLASSES:
        return occupation, CLASSES[occupation], 'Class recorded in this body’s occupation'
    key = body['id'].removeprefix('fate-body-')
    if key in CURATED:
        c = CURATED[key]
        return c, CLASSES[c], 'Curated source-specific spiritual body; see original dossier'
    if occupation == 'Grand Caster encounter':
        return 'Grand Caster', 'grands/caster.png', 'Explicit Grand Caster encounter'
    if occupation.startswith('Beast') or occupation == 'Space Beast':
        roman = occupation.split(' ')[1].split('/')[0] if occupation.startswith('Beast ') else 'none'
        return occupation, 'beasts/' + roman + '.png', 'Explicit Beast body; generic emblem if no numeral is given'
    # The supplied dossier explicitly treats these special classes/Bragi as a
    # coverage boundary. Unknown is a visual marker, not an invented class.
    return 'Unknown', 'icons/unknown.png', 'Class not verified in the supplied archive; original text preserved'

def main():
    input_path, output = Path(sys.argv[1]), Path(sys.argv[2])
    output.mkdir(parents=True, exist_ok=True)
    card = json.loads(input_path.read_text())
    ext = card['data']['extensions']
    ext['roleforge_icon_packs'] = ['fate-servant-classes']
    ref, payload = ext['roleforge_world_archive'], ext['roleforge_world_archive_payload']
    zipped = base64.b64decode(payload['data'], validate=True)
    assert len(zipped) == payload['compressedBytes'] and sha(zipped) == payload['compressedSha256']
    unpacked = gzip.decompress(zipped)
    assert len(unpacked) == payload['uncompressedBytes']
    envelope = json.loads(unpacked)
    original = {r['path']: r['text'] for r in envelope['files']}
    assert len(original) == len(envelope['files'])
    files = dict(original)
    manifest = json.loads(files['manifest.json'])
    assert sha(files['manifest.json'].encode()) == ref['manifestSha256']
    for row in manifest['files']:
        data = files[row['path']].encode()
        assert len(data) == row['bytes'] and sha(data) == row['sha256'], row['path']
    index = json.loads(files[manifest['indexes']['npcs']])
    patch = {'format': 'roleforge-npc-icon-update', 'version': 1,
             'id': 'fate-nasuverse-servant-icons-v1', 'name': 'Fate · Servant class icons',
             'target': {'archiveId': ref['archiveId'], 'characterPackId': ext['roleforge_character_pack']['id'],
                        'characterPackIds': ['fate-nasuverse-v3-native']},
             'icons': {}, 'entries': [],
             'notes': 'Image-only update. Unknown marks unverified classes, not a new canon class. Alcides uses Archer as his primary vessel; his Avenger aspects stay in the dossier. All alternate versions were checked; these bodies retain the same class across their recorded versions and inherit the base icon.',
             'credit': 'gears · Servant class icons. Original source and attribution are included in ATTRIBUTION.md.'}
    report = {'counts': manifest['counts'], 'classes': {}, 'assigned': [], 'unknown': [], 'untouched': [], 'versionsChecked': 0}
    changed_paths = set()
    for row in index:
        b = json.loads(files[row['basePath']])
        versions = [json.loads(files[v['path']]) for v in row['versions']]
        report['versionsChecked'] += len(versions)
        spiritual = b['id'].startswith('fate-fgo-') or any(s in b.get('race', '').lower() for s in ['manifested spirit origin', 'summoned spiritual body', 'demi-servant']) or b['id'] == 'fate-body-sidra-azrael-assassin-body'
        if not spiritual:
            report['untouched'].append({'id': b['id'], 'name': b['name']})
            continue
        c, path, evidence = classify(b)
        for v in versions:
            fields = v.get('fields', {})
            # Fail the build rather than silently labeling a different class
            # with its parent's image. This pack currently has no such version.
            assert fields.get('occupation', b.get('occupation')) == b.get('occupation'), (b['id'], v['id'])
        key = path[:-4].replace('/', '-')
        if key not in patch['icons']:
            compact = BytesIO()
            Image.open(ROOT / 'assets/servant-classes' / path).save(compact, format='WEBP', quality=90, method=6)
            image = 'data:image/webp;base64,' + base64.b64encode(compact.getvalue()).decode()
            assert len(image) <= 32768
            patch['icons'][key] = image
        b['roleIconImage'] = patch['icons'][key]
        files[row['basePath']] = encode(b)
        changed_paths.add(row['basePath'])
        patch['entries'].append({'npcId': b['id'], 'versionId': '', 'icon': key, 'label': b['name'], 'class': c})
        assignment = {'id': b['id'], 'name': b['name'], 'class': c, 'image': path, 'versions': len(versions), 'evidence': evidence}
        report['assigned'].append(assignment)
        if c == 'Unknown': report['unknown'].append(assignment)
    manifest['revision'] = '3.0.0-servant-icons.1'
    for row in manifest['files']:
        if row['path'] in changed_paths:
            data = files[row['path']].encode()
            row['bytes'], row['sha256'] = len(data), sha(data)
    files['manifest.json'] = encode(manifest)
    for path, text in original.items():
        if path not in changed_paths and path != 'manifest.json': assert files[path] == text, path
    for row in index:
        before, after = json.loads(original[row['basePath']]), json.loads(files[row['basePath']])
        after.pop('roleIconImage', None)
        assert before == after, row['id']
    ref.update(revision=manifest['revision'], manifestSha256=sha(files['manifest.json'].encode()))
    raw = encode({'format': 'roleforge-inline-world-pack-files', 'version': 1,
                  'files': [{'path': path, 'text': text} for path, text in files.items()]}).encode()
    compressed = gzip.compress(raw, compresslevel=9, mtime=0)
    ext['roleforge_world_archive_payload'] = {'format': 'roleforge-inline-world-pack', 'version': 1, 'encoding': 'gzip-base64',
        'compressedBytes': len(compressed), 'uncompressedBytes': len(raw), 'compressedSha256': sha(compressed), 'data': base64.b64encode(compressed).decode()}
    report['classes'] = dict(collections.Counter(r['class'] for r in report['assigned']))
    report.update(npcsWithIcons=len(patch['entries']), inheritedVersions=sum(r['versions'] for r in report['assigned']),
                  changedFiles=len(changed_paths), unchangedFileTexts=len(files)-len(changed_paths)-1,
                  compressedBytes=len(compressed), uncompressedBytes=len(raw), reference=ref)
    for name, value in [('Fate-Nasuverse-Servant-Icons-Card.json', card), ('Fate-Servant-Icons-Update.json', patch), ('Icon-Coverage-Report.json', report)]:
        (output / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) if name != 'Fate-Nasuverse-Servant-Icons-Card.json' else encode(value))
    credit = (ROOT / 'assets/servant-classes/ATTRIBUTION.md').read_text().replace(
        'These are the original 128px PNG exports (no modification).',
        'The card/update contain compact 128px WebP encodings (quality 90) of the supplied PNG artwork, retaining transparency. The original PNG assets remain available in RoleForge.')
    (output / 'ATTRIBUTION.md').write_text(credit)
    print(json.dumps({k: v for k, v in report.items() if k not in ['assigned', 'untouched', 'unknown']}, indent=2))

if __name__ == '__main__': main()
