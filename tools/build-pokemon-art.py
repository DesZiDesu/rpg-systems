"""Pin sprite availability and cache the starter/showcase artwork locally."""
from pathlib import Path
import urllib.request,json,concurrent.futures,re,os
root=Path(__file__).resolve().parents[1]/'src/workshop/pokemon'
def get(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'RoleForge-Pokemon-Preview/0.1'}),timeout=60) as r:return r.read()
pinned=json.loads((root/'data/source.json').read_text()).get('spritesCommit')
sha=os.environ.get('POKEMON_SPRITES_COMMIT') or pinned or json.loads(get('https://api.github.com/repos/PokeAPI/sprites/commits/master'))['sha']
def tree(ref):return json.loads(get('https://api.github.com/repos/PokeAPI/sprites/git/trees/'+ref))['tree']
branch=sha
for segment in ['sprites','pokemon']:branch=next(v['sha'] for v in tree(branch) if v['path']==segment)
entries=tree(branch);files={v['path'] for v in entries if v['type']=='blob'}
other=next(v['sha'] for v in entries if v['path']=='other')
art=next(v['sha'] for v in tree(other) if v['path']=='official-artwork');artfiles={v['path'] for v in tree(art) if v['type']=='blob'}
raw='https://raw.githubusercontent.com/PokeAPI/sprites/'+sha+'/sprites/pokemon/'
catalog=json.loads((root/'data/catalog.json').read_text());missing=[]
for f in catalog['forms']:
 pid=f['pokemonId'];suffix=f['key'].removeprefix(f['name'].lower().replace(' ','-')+'-')
 candidates=[f'{pid}-{suffix}.png',f'{f["speciesId"]}-{suffix}.png']
 sprite=next((n for n in candidates if n in files),None)
 if not sprite and (f['default'] or pid!=f['speciesId']):sprite=f'{pid}.png' if f'{pid}.png' in files else None
 artwork=f'other/official-artwork/{pid}.png' if (f['default'] or pid!=f['speciesId']) and f'{pid}.png' in artfiles else None
 f['image']=raw+(artwork or sprite) if artwork or sprite else ''
 if not f['image']:missing.append(f['key'])
selected={1,4,7,152,155,158,252,255,258,387,390,393,495,498,501,650,653,656,722,725,728,810,813,816,906,909,912,16,19,10,13,25,43,63,129,133,280,281,282,10051}
selected.update(range(1,31));selected.add(134)
selected.update(pid for pool in json.loads(re.search(r'export const ENCOUNTERS=(.*?);',(root/'core.js').read_text()).group(1)) for pid in pool)
jobs={f['pokemonId']:f['image'] for f in catalog['forms'] if f['pokemonId'] in selected and f['image'] and (f['default'] or f['pokemonId']!=f['speciesId'])}
def download(job):
 pid,url=job;path=root/'assets'/f'{pid}.png'
 try:
  if not path.exists():path.write_bytes(get(url))
  return pid
 except Exception:return None
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:downloaded=set(pool.map(download,jobs.items()))
for f in catalog['forms']:
 if f['pokemonId'] in downloaded and (f['default'] or f['pokemonId']!=f['speciesId']):f['localImage']=f'assets/{f["pokemonId"]}.png'
catalog['source']['spritesCommit']=sha;catalog['source']['formsWithImage']=len(catalog['forms'])-len(missing);catalog['source']['localArtwork']=len(downloaded)
(root/'data/catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':')))
(root/'data/source.json').write_text(json.dumps({**catalog['source'],'missingFormImages':missing},indent=2)+'\n')
# CREDITS.md is authored source; rebuilding artwork must not overwrite credits.
print(json.dumps(catalog['source']), 'missing exact form images:',len(missing))
