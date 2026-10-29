"""Separate the pinned FireRed field into row-background and two transparent bases.
The original decoded fields have horizontal background bands and foreground bases.
Field-layer extraction runs at build time rather than in the browser.
"""
from PIL import Image
from pathlib import Path
from collections import Counter
import json
root=Path(__file__).resolve().parents[1]/'src/workshop/pokemon/assets/battle'
manifest=[]
for src in sorted(root.glob('firered-*.png')):
 im=Image.open(src).convert('RGB'); w,h=im.size
 bg=Image.new('RGB',im.size)
 colors=[]
 for y in range(h):
  # Sample a clean edge: opponent plate is on the right, player on the left.
  # A whole-row mode mistakes the widest plate row for the background.
  clean=range(0,80) if y<88 else range(160,w)
  color=Counter(im.getpixel((x,y)) for x in clean).most_common(1)[0][0];colors.append(color)
  for x in range(w):bg.putpixel((x,y),color)
 key=src.stem.removeprefix('firered-');folder=root/'layers';folder.mkdir(exist_ok=True)
 bg.save(folder/(key+'-background.png'))
 for side,box in [('foe',(80,30,240,88)),('ally',(0,68,126,112))]:
  layer=Image.new('RGBA',(box[2]-box[0],box[3]-box[1]))
  for y in range(box[1],box[3]):
   for x in range(box[0],box[2]):
    pixel=im.getpixel((x,y))
    if pixel!=colors[y]:layer.putpixel((x-box[0],y-box[1]),(*pixel,255))
  bounds=layer.getbbox()
  if bounds:
   layer=layer.crop(bounds)
   # Transparent gutters preserve both rounded ends under pixel filtering.
   padded=Image.new('RGBA',(layer.width+4,layer.height+4))
   padded.alpha_composite(layer,(2,2));layer=padded
  layer.save(folder/(key+'-'+side+'.png'))
 # The original player plate is clipped by the 112px source viewport.
 # Use the complete same-terrain plate at the player perspective instead.
 Image.open(folder/(key+'-foe.png')).save(folder/(key+'-ally.png'))
 manifest.append({'id':key,'source':src.name,'background':'layers/'+key+'-background.png','ally':'layers/'+key+'-ally.png','foe':'layers/'+key+'-foe.png'})
(root/'layers/manifest.json').write_text(json.dumps({'method':'Clean-edge row-band reconstruction and full-width transparent foreground extraction from pinned FireRed assets; complete same-terrain opponent plate reused for clipped player plate','fields':manifest},indent=2))
print('Built',len(manifest),'layered fields')
