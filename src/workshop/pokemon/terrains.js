// Original FireRed field/palette combinations, decoded locally from pinned assets.
export const TERRAINS=[
 ['grass','ทุ่งหญ้า','Grassland'],['longgrass','หญ้าสูง','Tall grass'],['sand','ชายหาด / ทราย','Sand / beach'],
 ['water','ทะเล','Open water'],['pond','บ่อน้ำ','Pond'],['underwater','ใต้น้ำ','Underwater'],
 ['mountain','ภูเขา','Mountain'],['cave','ถ้ำ','Cave'],['building','อาคาร','Building'],
 ['indoor-plain','สนามในอาคาร','Indoor arena'],['indoor-1','สนามในอาคาร I','Indoor arena I'],['indoor-2','สนามในอาคาร II','Indoor arena II'],
 ['indoor-gym','ยิม','Gym'],['indoor-leader','หัวหน้ายิม','Gym Leader'],['indoor-lorelei','Elite Four · Lorelei','Elite Four · Lorelei'],
 ['indoor-bruno','Elite Four · Bruno','Elite Four · Bruno'],['indoor-agatha','Elite Four · Agatha','Elite Four · Agatha'],
 ['indoor-lance','Elite Four · Lance','Elite Four · Lance'],['indoor-champion','แชมเปียน','Champion'],['indoor-link','สนาม Link Battle','Link Battle arena'],
].map(([id,th,en])=>({id,th,en}));
export const validTerrain=id=>id==='auto'||TERRAINS.some(t=>t.id===id);
export function resolveTerrain(choice='auto',location={}){
 if(choice!=='auto'&&validTerrain(choice))return TERRAINS.find(t=>t.id===choice);
 const scene=typeof location==='string'?location:['place','position','region'].map(k=>typeof location?.[k]==='string'?location[k]:'').join(' ');
 const inferred=[
 ['indoor-champion',/แชมเปียน|champion/iu],['indoor-leader',/หัวหน้ายิม|gym leader/iu],['indoor-gym',/ยิม|\bgym\b/iu],
 ['underwater',/ใต้น้ำ|underwater/iu],['cave',/ถ้ำ|\bcave\b|cavern/iu],['sand',/ชายหาด|ทะเลทราย|หาดทราย|\bbeach\b|\bdesert\b/iu],
 ['mountain',/ภูเขา|ยอดเขา|\bmountain\b|summit/iu],['pond',/บ่อน้ำ|ทะเลสาบ|\bpond\b|\blake\b/iu],
 ['water',/ทะเล|มหาสมุทร|\bsea\b|\bocean\b/iu],['longgrass',/หญ้าสูง|tall grass|long grass/iu],
 ['building',/อาคาร|ในบ้าน|ภายในบ้าน|\bbuilding\b|indoors/iu],
 ].find(([,pattern])=>pattern.test(scene))?.[0]||'grass';
 return TERRAINS.find(t=>t.id===inferred);
}
