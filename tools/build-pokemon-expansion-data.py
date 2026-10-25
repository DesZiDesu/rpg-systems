"""Build supplemental game data from the same pinned PokeAPI snapshot."""
import csv,io,json,urllib.request,concurrent.futures
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];PK=ROOT/'src/workshop/pokemon';catalog=json.loads((PK/'data/catalog.json').read_text());ref=catalog['source']['commit'];cache=Path('/workspace/artifacts/pokemon-preview/data-source');cache.mkdir(parents=True,exist_ok=True)
def load(name):
 p=cache/(ref+'-'+name+'.csv')
 if not p.exists():p.write_bytes(urllib.request.urlopen(urllib.request.Request(f'https://raw.githubusercontent.com/PokeAPI/pokeapi/{ref}/data/v2/csv/{name}.csv',headers={'User-Agent':'RoleForge-Pokemon-Preview'}),timeout=90).read())
 return name,list(csv.DictReader(io.StringIO(p.read_text())))
tables=['pokemon_species','pokemon_stats','items','item_names','move_meta','move_meta_stat_changes','pokemon_moves','pokemon_dex_numbers','pokedexes','machines']
with concurrent.futures.ThreadPoolExecutor(max_workers=8)as pool:db=dict(pool.map(load,tables))
n=lambda v,d=0:int(v) if str(v).strip() else d
profiles={n(r['id']):{'genderRate':n(r['gender_rate']),'habitat':n(r['habitat_id'])} for r in db['pokemon_species']}
yields={}
for r in db['pokemon_stats']:yields.setdefault(n(r['pokemon_id']),[0]*6)[n(r['stat_id'])-1]=n(r['effort'])
item_names={n(r['item_id']):r['name'] for r in db['item_names'] if r['local_language_id']=='9'}
items=[{'id':r['identifier'],'name':item_names.get(n(r['id']),r['identifier'].replace('-',' ').title()),'number':n(r['id']),'category':n(r['category_id']),'cost':n(r['cost'])} for r in db['items']]
meta={n(r['move_id']):{'category':n(r['meta_category_id']),'ailment':n(r['meta_ailment_id']),'ailmentChance':n(r['ailment_chance']),'statChance':n(r['stat_chance']),'healing':n(r['healing']),'drain':n(r['drain']),'flinchChance':n(r['flinch_chance']),'minHits':n(r['min_hits']),'maxHits':n(r['max_hits']),'minTurns':n(r['min_turns']),'maxTurns':n(r['max_turns'])} for r in db['move_meta']}
for r in db['move_meta_stat_changes']:meta.setdefault(n(r['move_id']),{}).setdefault('stats',[]).append([n(r['stat_id']),n(r['change'])])
training={};groups={}
for r in db['pokemon_moves']:
 pid=n(r['pokemon_id']);vg=n(r['version_group_id']);method=n(r['pokemon_move_method_id'])
 if method not in [1,3,4]:continue
 if vg>groups.get(pid,0):groups[pid]=vg;training[pid]={'level':[],'tutor':[],'machine':[],'versionGroup':vg}
 if vg==groups[pid]:training[pid][{1:'level',3:'tutor',4:'machine'}[method]].append([n(r['level']),n(r['move_id'])] if method==1 else n(r['move_id']))
for p,t in training.items():
 for method in ['machine','tutor']:t[method]=sorted(set(t[method]))
 t['level']=sorted(set(tuple(v)for v in t['level']))
pokedexes={n(r['id']):r['identifier'] for r in db['pokedexes']};regional={}
for r in db['pokemon_dex_numbers']:regional.setdefault(pokedexes.get(n(r['pokedex_id']),''),[]).append(n(r['species_id']))
result={'schema':1,'source':{'repo':catalog['source']['repo'],'commit':ref,'note':'Training compatibility uses the latest available version group for each Pokemon; not a claim all moves exist in Scarlet/Violet.'},'machines':[{'item':next((i['id'] for i in items if i['number']==n(r['item_id'])),''),'move':n(r['move_id']),'versionGroup':n(r['version_group_id'])} for r in db['machines']],'profiles':profiles,'evYields':yields,'items':items,'moveMeta':meta,'training':training,'regionalDexes':regional}
(PK/'data/expansion.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')))
print('Built',len(items),'items,',len(training),'training sets,',len(meta),'move effect definitions')
print('Dexes:',list(regional))
