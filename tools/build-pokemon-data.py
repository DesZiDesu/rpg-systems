"""Build the offline Pokédex from pinned PokeAPI CSVs; artwork remains lazy loaded."""
import csv,io,json,urllib.request,concurrent.futures,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'src/workshop/pokemon'
CACHE=Path('/workspace/artifacts/pokemon-preview/data-source');CACHE.mkdir(parents=True,exist_ok=True)
def get(url):
 req=urllib.request.Request(url,headers={'User-Agent':'RoleForge-Pokemon-Preview/0.1'})
 with urllib.request.urlopen(req,timeout=90) as r:return r.read()
ref=json.loads(get('https://api.github.com/repos/PokeAPI/pokeapi/commits/master'))['sha']
tables=['pokemon','pokemon_species','pokemon_species_names','pokemon_types','types','pokemon_stats','pokemon_abilities','abilities','pokemon_forms','pokemon_form_names','pokemon_evolution','items','moves','move_names','pokemon_moves','type_efficacy','experience']
def load(name):
 path=CACHE/(ref+'-'+name+'.csv')
 if not path.exists():path.write_bytes(get(f'https://raw.githubusercontent.com/PokeAPI/pokeapi/{ref}/data/v2/csv/{name}.csv'))
 return name,list(csv.DictReader(io.StringIO(path.read_text())))
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:db=dict(pool.map(load,tables))
num=lambda x,default=0:int(x) if str(x).strip() else default
by=lambda name,key='id':{num(r[key]):r for r in db[name]}
eng=lambda name,key,field:{num(r[key]):r[field] for r in db[name] if r.get('local_language_id')=='9'}
species=by('pokemon_species');names=eng('pokemon_species_names','pokemon_species_id','name');genera=eng('pokemon_species_names','pokemon_species_id','genus')
types={int(r['id']):r['identifier'] for r in db['types'] if int(r['id'])<=18};abilities={int(r['id']):r['identifier'] for r in db['abilities']};items={int(r['id']):r['identifier'] for r in db['items']}
formnames=eng('pokemon_form_names','pokemon_form_id','form_name');pnames=eng('pokemon_form_names','pokemon_form_id','pokemon_name')
stats={};ptypes={};pabilities={};learnsets={}
for r in db['pokemon_stats']:stats.setdefault(num(r['pokemon_id']),{})[num(r['stat_id'])]=num(r['base_stat'])
for r in db['pokemon_types']:ptypes.setdefault(num(r['pokemon_id']),[]).append((num(r['slot']),types.get(num(r['type_id']),'normal')))
for r in db['pokemon_abilities']:pabilities.setdefault(num(r['pokemon_id']),[]).append({'name':abilities.get(num(r['ability_id']),''),'hidden':r['is_hidden']=='1'})
moves={};mn=eng('move_names','move_id','name')
for r in db['moves']:
 if num(r['id'])>10000:continue
 moves[num(r['id'])]={'id':num(r['id']),'name':mn.get(num(r['id']),r['identifier'].replace('-',' ').title()),'type':types.get(num(r['type_id']),'normal'),'power':num(r['power']),'accuracy':num(r['accuracy'],100),'pp':max(1,num(r['pp'],5)),'class':num(r['damage_class_id']),'priority':num(r['priority']),'target':num(r['target_id'])}
for r in db['pokemon_moves']:
 if r['pokemon_move_method_id']!='1':continue
 pid=num(r['pokemon_id']);vg=num(r['version_group_id']);old=learnsets.get(pid)
 if old is None or vg>old[0]:learnsets[pid]=(vg,[])
 if vg==learnsets[pid][0] and num(r['move_id']) in moves:learnsets[pid][1].append([num(r['level']),num(r['move_id'])])
evolutions={}
for r in db['pokemon_evolution']:
 sid=num(r['evolved_species_id']);source=num(species.get(sid,{}).get('evolves_from_species_id',''))
 if not source:continue
 e={'to':sid,'trigger':num(r['evolution_trigger_id']),'level':num(r['minimum_level']),'item':items.get(num(r['trigger_item_id']),''),'held':items.get(num(r['held_item_id']),''),'gender':num(r['gender_id']),'time':r['time_of_day'],'friendship':num(r['minimum_happiness']),'affection':num(r['minimum_affection']),'knownMove':num(r['known_move_id']),'knownType':types.get(num(r['known_move_type_id']),''),'location':num(r['location_id']),'tradeSpecies':num(r['trade_species_id']),'partySpecies':num(r['party_species_id']),'partyType':types.get(num(r['party_type_id']),''),'rain':r['needs_overworld_rain']=='1','upsideDown':r['turn_upside_down']=='1','relativeStats':r['relative_physical_stats']}
 evolutions.setdefault(source,[]).append(e)
# Canonical species and battle variants are distinct records. Cosmetic forms use
# the PokeAPI form identifier as a separate key instead of collapsing to species.
pokemon=by('pokemon');forms=[]
for r in db['pokemon_forms']:
 pid=num(r['pokemon_id']);p=pokemon.get(pid)
 if not p:continue
 sid=num(p['species_id']);s=species[sid];identifier=r['identifier'];variant=pid!=sid or bool(r['form_identifier'])
 label=formnames.get(num(r['id'])) or (r['form_identifier'].replace('-',' ').title() if r['form_identifier'] else '')
 forms.append({'key':identifier,'formId':num(r['id']),'pokemonId':pid,'speciesId':sid,'name':names.get(sid,p['identifier'].title()),'form':label if variant else '', 'generation':num(s['generation_id']),'types':[v for _,v in sorted(ptypes.get(pid,ptypes.get(sid,[(1,'normal')])) )],'stats':[stats.get(pid,stats.get(sid,{})).get(i,50) for i in range(1,7)],'abilities':pabilities.get(pid,pabilities.get(sid,[])),'height':num(p['height'])/10,'weight':num(p['weight'])/10,'baseExp':num(p['base_experience'],64),'catchRate':num(s['capture_rate'],45),'growth':num(s['growth_rate_id'],2),'genus':genera.get(sid,''),'legendary':s['is_legendary']=='1','mythical':s['is_mythical']=='1','battleOnly':r['is_battle_only']=='1','default':r['is_default']=='1' and p['is_default']=='1','prevo':num(s['evolves_from_species_id']),'evolutions':evolutions.get(sid,[]),'learnset':sorted(set(tuple(x) for x in learnsets.get(pid,learnsets.get(sid,(0,[])))[1]))})
experience={}
for r in db['experience']:experience.setdefault(r['growth_rate_id'],{})[r['level']]=num(r['experience'])
result={'schema':1,'source':{'name':'PokeAPI','repo':'https://github.com/PokeAPI/pokeapi','commit':ref,'species':len(species),'forms':len(forms),'note':'PokeAPI snapshot; not a claim of unreleased or absent franchise content.'},'types':list(types.values()),'typeChart':{types[num(r['damage_type_id'])]+':'+types[num(r['target_type_id'])]:num(r['damage_factor'])/100 for r in db['type_efficacy'] if num(r['damage_type_id']) in types and num(r['target_type_id']) in types},'moves':moves,'experience':experience,'forms':forms}
(ROOT/'data/catalog.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')))
(ROOT/'data/source.json').write_text(json.dumps(result['source'],indent=2)+'\n')
print(json.dumps(result['source']), 'bytes:',(ROOT/'data/catalog.json').stat().st_size)
