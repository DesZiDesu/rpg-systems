"""Fetch public source artwork unchanged; square framing is native RoleForge UI metadata."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'assets' / 'portraits'
DEST.mkdir(parents=True, exist_ok=True)
EXISTING = {r['name']: r for r in json.loads((ROOT / 'data/portrait-sources.json').read_text())} if (ROOT / 'data/portrait-sources.json').exists() else {}
SKIP = {'History', 'Purge', 'Talk (0)', 'Talk (3)', 'List of unnamed Shinigami'}
SPECIAL = {
    'L (character)': ['L.jpg', 'L_(character).jpg', 'L_Anime.jpg'],
    'Light Yagami': ['Light_Yagami.jpg', 'Light_Yagami_Anime.jpg'],
    'Beyond Birthday': ['Beyond_Birthday.jpg', 'Beyond_Birthday.png', 'BB.jpg'],
    'Armonia Justin Beyondormason': ['Armonia.jpg', 'Armonia_2.jpg'],
    'King of Death': ['King_of_Death.jpg'],
    'Kinddara Guivelostain': ['KinddaraGuivelostain.jpg'],
    'Daril Ghiroza': ['Dalil_Guillohrtha.jpg', 'Daril_Ghiroza.jpg'],
    'Nu': ['Nu.PNG'],
    'Midora': ['Midora_one-shot.JPG', 'Meadra.jpg'],
    'Gelus': ['Gelus.PNG', 'Death_Note_Jealous.png'],
    'Sidoh': ['Sidoh.jpg', 'SIDOHH.png', 'ChocoShidoh.png'],
    'Rem': ['Rem.jpg', 'Anime_remu.jpg'],
    'Ryuk': ['Ryuk.jpg', 'Ryuk.JPG', 'Ryuk1.jpg'],
    'Calikarcha': ['Calikarcha.jpg', 'Calikarcha_anime-1-.jpg'],
}
FILM = {
    'Light Yagami/Films': 'Light', 'L (character)/Films': 'L',
    'Misa Amane/Films': 'Misa', 'Naomi Misora/Films': 'Naomi',
    'Shiori Akino': 'Shiori', 'Ryuk/Films': 'Ryuk', 'Rem/Films': 'Rem',
    'Kiyomi Takada/Films': 'Kiyomi', 'Soichiro Yagami/Films': 'Soichiro',
    'Tsukuru Mishima': 'Tsukuru_Mishima', 'Ryuzaki (film character)': 'Ryuzaki',
    'Yuki Shien': 'Yuki_Shien', 'Sakura Aoi': 'Sakura', 'Arma': 'Arma',
    'Sho Nanase': 'Sho_Nanase', 'Shin Kuromoto': 'Kuromoto',
    'Junrou Sugawara': 'Sugawara', 'Uei Uragami': 'Uragami',
    'Touta Matsuda/Films 2016': 'Matsuda-LNW', 'Misa Amane/Films 2016': 'Misa-LNW',
    'Ryuk/Films 2016': 'Ryuk-LNW',
}

def slug(value):
    return ''.join(c.lower() if c.isalnum() else '-' for c in value).strip('-')

def fetch(name):
    previous = EXISTING.get(name)
    if previous and previous.get('file') and (ROOT / previous['file']).exists():
        return previous
    stem = name.replace(' ', '_')
    candidates = ([f'Films_character_icon_{FILM[name]}.jpg'] if name in FILM else
                  SPECIAL.get(name, [stem + '.jpg', stem + '.png', stem + '.PNG']))
    for filename in dict.fromkeys(candidates):
        digest = hashlib.md5(filename.encode()).hexdigest()
        url = f'https://static.wikia.nocookie.net/deathnote/images/{digest[0]}/{digest[:2]}/{urllib.parse.quote(filename)}/revision/latest/scale-to-width-down/320'
        path = DEST / (slug(name) + '.bin')
        cached = DEST / (slug(name) + '.json')
        if cached.exists():
            return json.loads(cached.read_text())
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'RoleForge-Death-Note-RPG-Reference/1.0'})
            with urllib.request.urlopen(request, timeout=14) as response:
                image = response.read(256 * 1024 + 1)
                mime = response.headers.get('Content-Type', '').split(';')[0]
            if mime not in ['image/jpeg', 'image/png', 'image/webp'] or len(image) > 256 * 1024 or len(image) < 256:
                continue
            path = path.with_suffix({'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'}[mime])
            path.write_bytes(image)
            record = {'name': name, 'file': str(path.relative_to(ROOT)), 'filename': filename,
                      'url': url, 'page': 'https://deathnote.fandom.com/wiki/File:' + urllib.parse.quote(filename),
                      'mime': mime, 'bytes': len(image), 'sha256': hashlib.sha256(image).hexdigest(),
                      'assetKind': 'published-character-reference', 'modified': False}
            cached.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
            return record
        except urllib.error.HTTPError as error:
            if error.code in (401, 403, 429):
                return {'name': name, 'missing': True, 'reason': f'HTTP {error.code}; no retry'}
        except (OSError, ValueError):
            continue
    return {'name': name, 'missing': True, 'reason': 'No verified public portrait candidate downloaded'}

rows = json.loads((ROOT / 'data' / 'research-roster.json').read_text())
names = [v['name'] for v in rows if v['name'] not in SKIP and '/' not in v['name']]
names += list(FILM)
names = list(dict.fromkeys(names))
results = []
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for record in pool.map(fetch, names):
        results.append(record)
        print(('FOUND ' if not record.get('missing') else 'MISSING ') + record['name'], flush=True)
(ROOT / 'data' / 'portrait-sources.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'candidates': len(results), 'downloaded': sum(not v.get('missing') for v in results)}), flush=True)
