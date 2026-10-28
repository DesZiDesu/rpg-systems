#!/usr/bin/env python3
"""Freeze named, non-prose source index facts. Input HTML is downloaded separately."""
import hashlib,json,re,unicodedata
from collections import defaultdict,Counter
from pathlib import Path
from lxml import html
source=Path('/workspace/artifacts/pokemon-game-characters.html')
tiles=Path('/workspace/artifacts/pokemon-characters-tiles.json')
anime=Path('/workspace/artifacts/pokemon-anime-list.html')
assert source.exists() and tiles.exists() and anime.exists()
def clean(s):return re.sub(r'\s+',' ',s or '').strip()
def norm(s):return unicodedata.normalize('NFKC',clean(s)).casefold()
def slug(s):
 s=unicodedata.normalize('NFKD',s);s=''.join(c for c in s if not unicodedata.combining(c));return re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')
groups=[];wiki={};tree=html.parse(str(source))
for h in tree.xpath('//h3'):
 label=clean(h.text_content());table=h.getnext()
 if 'Pokémon ' not in label or table is None or table.tag!='table':continue
 generation=clean(h.xpath('preceding::h2[1]')[0].text_content()) if h.xpath('preceding::h2[1]') else ''
 characters=[];seen=set()
 for cell in table.xpath('./tbody/tr/td'):
  for a in cell.xpath('.//a[@href and not(descendant::img)]'):
   path=a.get('href','');name=clean(a.text_content())
   if not path.startswith('/wiki/') or any(x in path for x in ('File:','Category:')) or not name or len(name)>100 or path in seen:continue
   seen.add(path);characters.append({'name':name,'path':path});wiki.setdefault(path,{'name':name,'path':path,'games':[],'series':[],'pokemon':False})['games'].append(label)
 groups.append({'name':label,'generation':generation,'characters':characters})
assert len(groups)>=45 and len(wiki)>=800
anime_group_names={
 'Pokémon the Series: The Beginning':'Anime · Original: Kanto & Orange Islands',
 'Pokémon the Series: Gold and Silver':'Anime · Johto',
 'Pokémon the Series: Ruby and Sapphire':'Anime · Advanced Generation',
 'Pokémon the Series: Diamond and Pearl':'Anime · Diamond & Pearl',
 'Pokémon the Series: Black & White':'Anime · Black & White',
 'Pokémon the Series: XY':'Anime · XY',
 'Pokémon the Series: Sun & Moon':'Anime · Sun & Moon',
 'Pokémon Journeys: The Series':'Anime · Journeys',
 'Pokémon Horizons: The Series':'Anime · Horizons',
 'Main characters':'Anime · Main cast','Movies':'Anime · Film reference','Specials':'Anime · Specials','Side stories':'Anime · Side stories'
}
anime_groups=[]
for heading in html.parse(str(anime)).xpath('//h2|//h3'):
 label=clean(heading.text_content());table=heading.getnext()
 if table is None or table.tag!='table' or not(label=='Main characters' or label.startswith('Pokémon') or label in ['Movies','Specials','Side stories']):continue
 parent=clean(heading.xpath('preceding::h2[1]')[0].text_content()) if heading.tag=='h3' and heading.xpath('preceding::h2[1]') else label
 tags=list(dict.fromkeys([anime_group_names.get(parent,'Anime · '+parent), 'Anime · '+label]))
 chars=[];seen=set()
 for row in table.xpath('./tbody/tr'):
  cells=row.xpath('./td')
  if not cells:continue
  anchors=cells[0].xpath('.//a[@href and not(descendant::img)]')
  if not anchors:continue
  a=anchors[0];href=a.get('href','');name=clean(a.text_content())
  if not href.startswith('/wiki/') or not name or len(name)>100 or href in seen:continue
  seen.add(href);kind=clean(cells[-1].text_content()) if label!='Main characters' and len(cells)>2 else ''
  pokemon=bool(re.search(r'(?:^|,\s*)(?:Legendary |Mythical )?Pokémon(?:,|$)',kind))
  item=wiki.setdefault(href,{'name':name,'path':href,'games':[],'series':[],'pokemon':False})
  item['series']=list(dict.fromkeys(item['series']+tags));item['pokemon']=item['pokemon'] or pokemon
  chars.append({'name':name,'path':href,'pokemon':pokemon})
 anime_groups.append({'name':label,'parent':parent,'characters':chars})
assert len(anime_groups)>=30
anime_patterns=[('Anime · Original: Kanto & Orange Islands',r'Pokémon the Series: The Beginning'),('Anime · Johto',r'Pokémon the Series: Gold and Silver'),('Anime · Advanced Generation',r'Pokémon the Series: Ruby and Sapphire'),('Anime · Diamond & Pearl',r'Pokémon the Series: Diamond and Pearl'),('Anime · Black & White',r'Pokémon the Series: Black & White'),('Anime · XY',r'Pokémon the Series: XY'),('Anime · Sun & Moon',r'Pokémon the Series: Sun & Moon'),('Anime · Journeys',r'Pokémon (?:Ultimate |Master |)Journeys'),('Anime · Horizons',r'Pokémon Horizons'),('Anime · Twilight Wings',r'Pokémon: Twilight Wings'),('Anime · Hisuian Snow',r'Pokémon: Hisuian Snow'),('Anime · Paldean Winds',r'Pokémon: Paldean Winds'),('Anime · Path to the Peak',r'Pokémon: Path to the Peak'),('Anime · Evolutions',r'Pokémon Evolutions'),('Anime · Origins',r'Pokémon Origins')]
people=[]
for r in json.loads(tiles.read_text()):
 name=clean(r.get('name'));id=clean(r.get('slug'));variant=clean(r.get('variant'));alt=clean(r.get('alt'));ja=clean(r.get('nameJa'))
 if not name or len(name)>100 or not re.fullmatch(r'[a-z0-9-]{1,100}',id):continue
 series=[label for label,pattern in anime_patterns if re.search(pattern,alt,re.I)]
 if r.get('role')=='movie':series.append('Anime · Film reference')
 if r.get('world') in ('anime','both') and not series:series.append('Anime · General / source unspecified')
 people.append({'slug':id,'name':name,'variant':variant,'nameJa':ja if 1<len(ja)<60 else '', 'region':clean(r.get('region')), 'series':list(dict.fromkeys(series)),'sourceWorld':r.get('world') or 'unknown'})
assert len(people)>=2000
wikiByName=defaultdict(list);peopleByName=defaultdict(list)
for x in wiki.values():wikiByName[norm(x['name'])].append(x)
for x in people:peopleByName[norm(x['name'])].append(x)
merged=[];consumed=set()
for path,x in sorted(wiki.items()):
 key=norm(x['name']);candidates=peopleByName.get(key,[])
 match=None
 matching=[p for p in candidates if not p['variant'] and p['slug']==slug(x['name'])]
 if len(wikiByName[key])==1 and len(matching)==1:match=matching[0]
 elif len(matching)==1:
  p=matching[0];candidatesForWorld=[w for w in wikiByName[key] if (w['series'] if p['sourceWorld']=='anime' else w['games'] if p['sourceWorld']=='game' else w['series'] if p['series'] and p['series']!=['Anime · General / source unspecified'] else w['games'])]
  if len(candidatesForWorld)==1 and candidatesForWorld[0]['path']==path:match=p
 if x['name']=='Professor Oak' and path=='/wiki/Professor_Oak':match=next((p for p in people if p['slug']=='professor-samuel-oak'),None)
 if match:consumed.add(match['slug'])
 ident='professor-oak' if path=='/wiki/Professor_Oak' else ('pk-game-' if x['games'] else 'pk-anime-')+hashlib.sha256(path.encode()).hexdigest()[:12]
 aliases=[]
 if match:
  if match['name']!=x['name']:aliases.append(match['name'])
  if match['nameJa']:aliases.append(match['nameJa'])
 if path=='/wiki/Professor_Oak':aliases += ['ศาสตราจารย์โอ๊ก','Professor Samuel Oak']
 merged.append({'id':ident,'name':x['name'],'aliases':list(dict.fromkeys(aliases)), 'games':list(dict.fromkeys(x['games'])),'series':list(dict.fromkeys(x['series']+(match['series'] if match else []))),'pokemon':x['pokemon'],'region':match['region'] if match else '', 'source':'https://bulbapedia.bulbagarden.net'+path, 'indexSource':'https://tltcg.com/characters/'+match['slug'] if match else ''})
for p in people:
 if p['slug'] in consumed:continue
 ident='pk-index-'+p['slug'];label=(p['name']+' ('+p['variant']+')') if p['variant'] else p['name']
 aliases=[p['nameJa']] if p['nameJa'] else []
 # Namesakes with a source variant remain separate records; the visible name identifies the variant.
 merged.append({'id':ident,'name':label,'aliases':aliases,'games':[],'series':p['series'] or ['Game · source unspecified'],'pokemon':False,'region':p['region'], 'source':'https://tltcg.com/characters/'+p['slug'],'indexSource':''})
assert len(set(x['id'] for x in merged))==len(merged)
meta={'version':1,'snapshotDate':'2026-10-28','sources':[{'url':'https://bulbapedia.bulbagarden.net/wiki/Game_characters','usedFor':'Game character names, links and listed game groupings; later game sections can list only newly introduced characters.'},{'url':'https://bulbapedia.bulbagarden.net/wiki/List_of_animated_series_characters','usedFor':'Anime, movie and special character names and source-series groupings, including individually identified Pokémon.'},{'url':'https://tltcg.com/characters','usedFor':'Additional named anime, film, game and spin-off index records and explicitly labelled series. Role/age assertions were not imported.'},{'url':'https://horizons.pokemon.com/en-us/','usedFor':'Official Horizons overview.'},{'url':'https://windswaves.pokemon.com/en-us/','usedFor':'Official 2027 announcement; unreleased material is not presented as established canon.'}], 'counts':{'gameGroups':len(groups),'gameLinks':sum(bool(v['games']) for v in wiki.values()),'animeGroups':len(anime_groups),'animeLinks':sum(bool(v['series']) for v in wiki.values()),'indexRecords':len(people),'mergedRecords':len(merged)},'games':groups,'animeGroups':anime_groups,'characters':merged}
out=Path('cards/pokemon-rpg/data/reference-snapshot.json');out.write_text(json.dumps(meta,ensure_ascii=False,separators=(',',':'))+'\n');print(json.dumps(meta['counts']))
