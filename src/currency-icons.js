// Pixel currency icons. Existing preset IDs remain stable.
// All artwork uses integer pixels; animation swaps whole pixel frames.
export const sets=[
 {id:'stack',name:'STACK',thai:'เหรียญซ้อน',motion:'เหรียญชั้นบนยกขึ้นและลง · ประกายพิกเซล',duration:2.4},
 {id:'minted',name:'MINTED',thai:'เหรียญตราดาว',motion:'หมุนเหรียญเป็นเฟรม · เห็นด้านข้าง',duration:2.4},
 {id:'outline',name:'RUNE',thai:'เหรียญรูน',motion:'พลังวิ่งรอบขอบ · รูนส่องแสงเป็นจังหวะ',duration:2.4},
 {id:'pixel',name:'PIXEL',thai:'เหรียญเกมคลาสสิก',motion:'เหรียญเด้งทีละพิกเซล · แสงเปลี่ยนเฟรม',duration:2.4},
 {id:'banknote',name:'BANKNOTE',thai:'ปึกธนบัตร',motion:'ธนบัตรชั้นบนขยับ · แสงบนขอบกระดาษ',duration:2.4},
 {id:'gem',name:'GEM',thai:'อัญมณีเจียระไน',motion:'อัญมณีลอยขึ้นและลง · สลับแสงบนเหลี่ยม',duration:2.4},
 {id:'crest',name:'CREST',thai:'เหรียญตรามงกุฎ',motion:'ตราลอยทีละพิกเซล · ประกายบนขอบ',duration:2.4},
 {id:'neon',name:'ARCADE',thai:'โทเคนแสงพิกเซล',motion:'แสงไล่รอบเหรียญ · ตรากลางกะพริบ',duration:2.4},
];
export const units=[
 {id:'gold',name:'ทอง',color:'#dfbf65'},
 {id:'silver',name:'เงิน',color:'#c0c8d2'},
 {id:'copper',name:'ทองแดง',color:'#c58c65'},
];
export const pixelCss=`
.rf-pixel-money-icon{display:inline-block;vertical-align:middle;width:24px;height:24px;flex-shrink:0;shape-rendering:crispEdges;image-rendering:pixelated;overflow:visible}
.rf-pixel-money-icon .px-d{fill:var(--px-dark)}.rf-pixel-money-icon .px-m{fill:var(--px-mid)}.rf-pixel-money-icon .px-b{fill:var(--px-base)}.rf-pixel-money-icon .px-l{fill:var(--px-light)}.rf-pixel-money-icon .px-w{fill:var(--px-white)}.rf-pixel-money-icon .px-k{fill:var(--px-ink)}.rf-pixel-money-icon .px-s{fill:#101312}
.rf-pixel-money-icon .px-frame{opacity:0;animation:rf-pixel-frame var(--px-duration,2.4s) steps(1,end) infinite}
.rf-pixel-money-icon .px-frame[data-frame="0"]{opacity:1;animation-delay:0s}
.rf-pixel-money-icon .px-frame[data-frame="1"]{animation-delay:calc(var(--px-duration,2.4s)*-.75)}
.rf-pixel-money-icon .px-frame[data-frame="2"]{animation-delay:calc(var(--px-duration,2.4s)*-.5)}
.rf-pixel-money-icon .px-frame[data-frame="3"]{animation-delay:calc(var(--px-duration,2.4s)*-.25)}
@keyframes rf-pixel-frame{0%{opacity:1}25%,100%{opacity:0}}
.rf-pixel-money-icon[data-motion="off"] .px-frame{animation:none;opacity:0}
.rf-pixel-money-icon[data-motion="off"] .px-frame[data-frame="0"]{opacity:1}
@media(prefers-reduced-motion:reduce){.rf-pixel-money-icon .px-frame{animation:none!important;opacity:0!important}.rf-pixel-money-icon .px-frame[data-frame="0"]{opacity:1!important}}
`;

const size=32;
const canvas=()=>Array.from({length:size},()=>Array(size).fill(''));
function rect(c,x,y,w,h,color){for(let dy=Math.max(0,y);dy<Math.min(size,y+h);dy++)for(let dx=Math.max(0,x);dx<Math.min(size,x+w);dx++)c[dy][dx]=color;}
function poly(c,points,color){
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
   const [ax,ay]=points[i],[bx,by]=points[j];
   if((ay>y+.5)!==(by>y+.5)&&x+.5<(bx-ax)*(y+.5-ay)/(by-ay)+ax)inside=!inside;
  }
  if(inside)c[y][x]=color;
 }
}
function oct(c,x,y,w,h,cut,color){for(let row=0;row<h;row++){const inset=Math.max(0,cut-row,cut-(h-1-row));rect(c,x+inset,y+row,w-inset*2,1,color);}}
function glyph(c,rows,x,y,color,scale=1){rows.forEach((r,dy)=>[...r].forEach((p,dx)=>{if(p!==' '&&p!=='.')rect(c,x+dx*scale,y+dy*scale,scale,scale,color);}));}
function shadow(c,x=8,y=29,w=16){rect(c,x,y,w,1,'s');rect(c,x+2,y+1,w-4,1,'s');}
function spark(c,x,y,phase=0){
 const p=phase%4;
 if(p===0){rect(c,x,y,1,1,'w');rect(c,x-1,y+1,1,1,'l');}
 if(p===1){rect(c,x,y-2,1,5,'w');rect(c,x-2,y,5,1,'w');rect(c,x-1,y-1,3,3,'l');rect(c,x,y,1,1,'w');}
 if(p===2){rect(c,x-2,y-2,1,1,'l');rect(c,x+2,y-2,1,1,'w');rect(c,x-2,y+2,1,1,'w');rect(c,x+2,y+2,1,1,'l');}
 if(p===3){rect(c,x,y,1,1,'l');}
}
function flatCoin(c,x,y,w){
 const side=7;
 rect(c,x+2,y+2,w-4,side,'d');rect(c,x+1,y+2,w-2,side-2,'m');
 rect(c,x+3,y+6,w-6,1,'l');rect(c,x+2,y+4,1,2,'l');rect(c,x+w-3,y+3,1,3,'d');
 rect(c,x+5,y,w-10,1,'l');rect(c,x+2,y+1,w-4,1,'w');rect(c,x+1,y+2,w-2,1,'l');
 rect(c,x+2,y+3,w-4,1,'b');rect(c,x+4,y+4,w-8,1,'l');
 rect(c,x+6,y+1,w-12,1,'m');rect(c,x+5,y+2,w-10,1,'b');rect(c,x+7,y+3,w-14,1,'d');
 rect(c,x+4,y+5,2,1,'b');rect(c,x+8,y+5,2,1,'b');rect(c,x+w-7,y+5,2,1,'b');
}
function coin(c,phase=0,dy=0,center='b'){
 oct(c,4,4+dy,24,24,5,'d');oct(c,5,4+dy,21,22,4,'l');oct(c,6,5+dy,20,21,4,'b');
 oct(c,7,6+dy,18,20,3,'m');oct(c,8,7+dy,16,18,3,center);
 rect(c,11,5+dy,8,1,'w');rect(c,7,8+dy,1,4,'w');rect(c,5,13+dy,1,6,'l');
 rect(c,11,25+dy,9,1,'m');rect(c,24,13+dy,1,8,'d');
 for(let i=0;i<4;i++)rect(c,11+i*3,26+dy,1,1,i===phase?'l':'d');
}
const star=['.....#.....','....###....','....###....','###########','.#########.','..#######..','...#####...','..#######..','..###.###..','.###...###.','.##.....##.'];
const dollar=['..#....','.#####.','##.#...','##.#...','.#####.','...#.##','...#.##','.#####.','..#....'];
const crown=['#....#....#','##..###..##','###.###.###','.#########.','.#########.','..#######..','..#######..'];
function emboss(c,rows,x,y,color='l'){
 glyph(c,rows,x+1,y+1,'d');glyph(c,rows,x-1,y,'m');glyph(c,rows,x,y,color);
}
function shrinkX(c,width){
 const result=canvas();const left=Math.floor((32-width)/2);
 for(let y=0;y<size;y++)for(let x=0;x<width;x++){
  const src=Math.min(31,Math.floor(x/width*32));
  result[y][left+x]=c[y][src];
 }
 return result;
}
function shift(c,dx,dy){const result=canvas();c.forEach((row,y)=>row.forEach((v,x)=>{if(v&&x+dx>=0&&x+dx<size&&y+dy>=0&&y+dy<size)result[y+dy][x+dx]=v;}));return result;}
function stamp(destination,source){source.forEach((row,y)=>row.forEach((v,x)=>{if(v)destination[y][x]=v;}));}

function art(set,phase){
 const c=canvas(),bob=[0,-1,-2,-1][phase];
 if(set==='stack'){
  shadow(c,6,30,22);flatCoin(c,4,21,24);flatCoin(c,5,15,22);flatCoin(c,7,9+bob,20);
  spark(c,26,5,phase);spark(c,3,24,(phase+2)%4);
 }else if(set==='minted'){
  shadow(c);const sprite=canvas();coin(sprite,phase);glyph(sprite,star,10,10,'d');rect(sprite,15,10,1,2,'m');rect(sprite,11,13,3,1,'m');
  const widths=[32,22,7,22];const face=phase===0?sprite:shrinkX(sprite,widths[phase]);
  if(phase===2){rect(face,15,6,2,20,'l');rect(face,17,9,1,15,'m');rect(face,15,11,1,9,'w');}
  stamp(c,face);spark(c,27,4,phase);
 }else if(set==='outline'){
  shadow(c);coin(c,phase,0,'m');oct(c,10,10,12,12,2,'d');
  const color=['l','w','l','b'][phase];
  glyph(c,['....##....','...####...','..##..##..','.##....##.','##..##..##','##..##..##','.##....##.','..##..##..','...####...','....##....'],11,11,color);
  const runes=[[14,6],[24,14],[16,24],[6,16]];const [x,y]=runes[phase];rect(c,x,y,2,2,'w');
  spark(c,28,7,phase);
 }else if(set==='pixel'){
  shadow(c);coin(c,phase,bob);emboss(c,dollar,13,11+bob,'d');rect(c,10,10+bob,2,2,phase===1?'w':'l');
  spark(c,28,6,phase);spark(c,3,24,(phase+2)%4);
 }else if(set==='banknote'){
  shadow(c,4,29,24);oct(c,5,14,25,13,1,'d');oct(c,4,12,25,13,1,'m');
  rect(c,6,23,19,1,'b');rect(c,8,25,19,1,'l');rect(c,28,15,1,9,'b');
  const y=9+bob;oct(c,2,y,25,14,1,'d');oct(c,3,y+1,23,11,1,'l');oct(c,4,y+2,21,9,1,'b');
  rect(c,5,y+3,2,2,'m');rect(c,5,y+8,2,2,'m');rect(c,22,y+3,2,2,'m');rect(c,22,y+8,2,2,'m');
  oct(c,10,y+3,9,8,2,'m');oct(c,12,y+4,5,6,1,'l');rect(c,14,y+5,1,4,'d');
  rect(c,4+phase*4,y+1,4,1,'w');spark(c,27,6,phase);
 }else if(set==='gem'){
  shadow(c,9,30,14);const stone=canvas();
  poly(stone,[[10,3],[22,3],[29,11],[17,29],[15,29],[3,11]],'d');
  poly(stone,[[10,4],[21,4],[27,11],[16,26],[5,11]],'b');
  poly(stone,[[10,5],[15,5],[12,10],[6,10]],'l');
  poly(stone,[[17,5],[22,6],[25,10],[18,10]],'m');
  poly(stone,[[14,5],[16,5],[18,10],[12,10]],phase===1?'w':'l');
  poly(stone,[[6,12],[12,12],[15,24]],'m');
  poly(stone,[[13,12],[18,12],[16,25]],phase===2?'w':'l');
  poly(stone,[[19,12],[25,12],[18,23]],'b');rect(stone,8,10,17,1,'w');
  stamp(c,shift(stone,0,bob));spark(c,27,5,phase);spark(c,3,20,(phase+2)%4);
 }else if(set==='crest'){
  shadow(c);const plate=canvas();
  poly(plate,[[16,3],[27,9],[27,22],[16,29],[5,22],[5,9]],'d');
  poly(plate,[[16,4],[26,10],[26,21],[16,28],[6,21],[6,10]],'l');
  poly(plate,[[16,7],[23,11],[23,20],[16,25],[9,20],[9,11]],'m');
  poly(plate,[[16,9],[21,12],[21,19],[16,23],[11,19],[11,12]],'b');
  glyph(plate,crown,11,12,'d');rect(plate,11,12,1,1,'w');rect(plate,16,12,1,1,'w');rect(plate,21,12,1,1,'w');rect(plate,13,19,7,1,'l');rect(plate,14,21,5,1,'d');
  rect(plate,7,11,1,8,'w');rect(plate,24,13,1,7,'b');
  stamp(c,shift(plate,0,[0,-1,0,1][phase]));spark(c,28,6,phase);
 }else{
  shadow(c);oct(c,4,4,24,24,5,'d');oct(c,5,5,22,22,4,'b');oct(c,7,7,18,18,3,'l');oct(c,9,9,14,14,2,'d');
  const edge=[[12,4,8,2],[26,12,2,8],[12,26,8,2],[4,12,2,8]][phase];rect(c,...edge,'w');
  rect(c,14,11,4,10,phase===1?'w':'l');rect(c,11,14,10,4,phase===1?'w':'l');
  rect(c,15,15,2,2,'w');
  const pixels=[[8,6],[25,8],[23,25],[6,23]];pixels.forEach(([x,y],i)=>rect(c,x,y,2,2,i===phase?'w':'m'));
  spark(c,28,4,phase);spark(c,3,28,(phase+2)%4);
 }
 return c;
}
const cache=new Map();
export function pixelFrames(set){if(!cache.has(set))cache.set(set,Array.from({length:4},(_,i)=>art(set,i)));return cache.get(set);}
function markup(c){
 let result='';
 for(let y=0;y<size;y++)for(let x=0;x<size;){
  const color=c[y][x];if(!color){x++;continue;}
  let end=x+1;while(end<size&&c[y][end]===color)end++;
  result+=`<rect x="${x}" y="${y}" width="${end-x}" height="1" class="px-${color}"/>`;x=end;
 }
 return result;
}
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const mix=(color,other,amount)=>'#'+rgb(color).map((v,i)=>Math.round(v+(rgb(other)[i]-v)*amount).toString(16).padStart(2,'0')).join('');
export function pixelPalette(color){const base=/^#[0-9a-f]{6}$/i.test(color||'')?color:'#dfbf65';return {dark:mix(base,'#11151b',.67),mid:mix(base,'#181c23',.32),base,light:mix(base,'#fff6d8',.38),white:mix(base,'#ffffff',.76),ink:mix(base,'#080b10',.84)};}
// Geometry is shared across all colors, widgets and rerenders. Only palette
// variables change per unit, so typing in settings does not redraw every pixel.
const packedCache=new Map();
function packedArt(artSet){
 if(packedCache.has(artSet))return packedCache.get(artSet);
 const frames=pixelFrames(artSet),common=canvas();
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const value=frames[0][y][x];if(value&&frames.every(frame=>frame[y][x]===value))common[y][x]=value;}
 const changing=frames.map(frame=>frame.map((row,y)=>row.map((value,x)=>common[y][x]?'':value)));
 const result=`<g class="px-static">${markup(common)}</g>`+changing.map((frame,i)=>`<g class="px-frame" data-frame="${i}">${markup(frame)}</g>`).join('');
 packedCache.set(artSet,result);return result;
}
export function pixelMoneyMarkup(set='stack',unit=units[0],{color=unit.color,motion=true,standalone=false,shape='default'}={}){
 const definition=sets.find(s=>s.id===set)||sets[0];const palette=pixelPalette(color);
 const style=Object.entries(palette).map(([k,v])=>`--px-${k}:${v}`).join(';')+`;--px-duration:${definition.duration}s`;
 const selected=['default','coin','note','gem','token'].includes(shape)?shape:'default',artSet=selected==='default'?definition.id:selected==='note'?'banknote':selected==='gem'?'gem':selected==='token'?(definition.id==='neon'?'neon':'crest'):selected==='coin'?(['stack','minted','outline','pixel','neon'].includes(definition.id)?definition.id:'pixel'):definition.id;
 return `<svg xmlns="http://www.w3.org/2000/svg" class="rf-commerce-icon rf-pixel-money-icon" viewBox="0 0 32 32" shape-rendering="crispEdges" data-coin-style="${definition.id}" data-icon-shape="${selected}" ${['gold','silver','copper'].includes(unit.id)?`data-currency="${unit.id}"`: ''} data-motion="${motion?'on':'off'}" style="stroke:none;stroke-width:0;color:${palette.base};${style}" aria-hidden="true" focusable="false">${standalone?`<style>${pixelCss}</style>`:''}${packedArt(artSet)}</svg>`;
}
