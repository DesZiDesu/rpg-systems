// User stats are chat-owned numeric state. Practice buttons and typed practice
// both resolve through the normal story reply and its committed state patch.
const clean=(v,n=600)=>typeof v==='string'?v.trim().slice(0,n):'';
const finite=(v,fallback,min=0,max=999999)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):fallback;
const validId=id=>typeof id==='string'&&/^[a-z][a-z0-9_-]{0,47}$/u.test(id)&&!['constructor','prototype','__proto__'].includes(id);
const escapeRx=v=>v.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
const normalizedText=v=>String(v).normalize('NFKC').replace(/\u0e4d\u0e32/gu,'\u0e33');
export const CORE_USER_STATS=Object.freeze([
 {id:'hp',name:'HP',path:'player.hp.max',initial:100,gain:2,description:'Maximum health and resilience / พลังชีวิตสูงสุดและความทนทาน',methods:['Progressive conditioning, controlled endurance exercise and adequate recovery / ฝึกความทนทานอย่างค่อยเป็นค่อยไปและพักฟื้นให้พอ','Safe resistance work with breathing and recovery intervals / ฝึกแรงต้านอย่างปลอดภัยร่วมกับการหายใจและพักเป็นช่วง'],aliases:['health','vitality','พลังชีวิต','ความทนทาน']},
 {id:'mp',name:'MP',path:'player.mp.max',initial:100,gain:2,description:'Maximum mana or the world’s established energy reserve / มานาหรือพลังงานสูงสุดตามโลกโรล',methods:['Meditation, controlled mana circulation and recovery / ทำสมาธิ หมุนเวียนมานาอย่างควบคุมและพักฟื้น','Repeat low-cost channeling exercises with measured rest / ฝึกส่งพลังทีละน้อยและพักตามความเหมาะสม'],aliases:['mana','มานา']},
 {id:'stamina',name:'ST',path:'player.stamina.max',initial:100,gain:2,description:'Maximum stamina and sustained effort / สตามิน่าสูงสุดและกำลังในการออกแรงต่อเนื่อง',methods:['Interval jogging, swimming or cycling with rest / วิ่ง ว่ายน้ำ หรือปั่นจักรยานแบบสลับช่วงพัก','Paced sustained movement while maintaining breathing / เคลื่อนไหวต่อเนื่องตามกำลังและควบคุมลมหายใจ'],aliases:['stamina','st','สตามิน่า','jogging','swimming','cycling','วิ่ง','ว่ายน้ำ','ปั่นจักรยาน']},
 {id:'intelligence',name:'INT',path:'player.attributes.intelligence',initial:10,gain:1,description:'Knowledge, reasoning and learning / ความรู้ การใช้เหตุผลและการเรียนรู้',methods:['Study, solve problems and explain the result in practice / ศึกษา แก้ปัญหาและอธิบายผลที่นำไปใช้จริง','Research a relevant topic and test the conclusions / ค้นคว้าเรื่องที่เกี่ยวข้องแล้วทดสอบข้อสรุป'],aliases:['intelligence','int','สติปัญญา','study','studying','research','ศึกษา','ค้นคว้า']},
 {id:'strength',name:'STR',path:'player.attributes.strength',initial:10,gain:1,description:'Physical strength and controlled force / พละกำลังและการควบคุมแรง',methods:['Progressive lifting or bodyweight work with good form / ยกน้ำหนักหรือฝึกด้วยน้ำหนักตัว เพิ่มความหนักตามกำลัง','Practice carrying or striking against safe resistance / ฝึกแบกน้ำหนักหรือออกแรงกับแรงต้านที่ปลอดภัย'],aliases:['strength','str','พละกำลัง','วิดพื้น','push-ups','weightlifting','lifting','ยกน้ำหนัก','กล้ามเนื้อ']},
 {id:'defense',name:'DF',path:'player.attributes.defense',initial:10,gain:1,description:'Guard, balance and damage mitigation / การป้องกัน สมดุลและลดความเสียหาย',methods:['Guard drills, controlled blocks and defensive footwork / ฝึกตั้งการ์ด ปัดป้องอย่างควบคุมและยืนตำแหน่งป้องกัน','Practice bracing and balance with a safe sparring partner / ฝึกทรงตัวและรับแรงกับคู่ซ้อมอย่างปลอดภัย'],aliases:['defense','defence','df','def','การป้องกัน','guard drills','blocking','ตั้งการ์ด','ปัดป้อง']},
 {id:'agility',name:'AG',path:'player.attributes.agility',initial:10,gain:1,description:'Movement speed, coordination and reaction / ความคล่องตัว การประสานร่างกายและการตอบสนอง',methods:['Footwork, obstacle drills and controlled dodging / ฝึกฟุตเวิร์ก ผ่านสิ่งกีดขวางและหลบอย่างควบคุม','Reaction drills with changing cues and direction / ฝึกตอบสนองต่อสัญญาณและเปลี่ยนทิศทาง'],aliases:['agility','ag','agi','ความคล่องตัว','footwork','dodging','reaction drills','ฟุตเวิร์ก','หลบหลีก']},
]);

export function normalizeStatTraining(raw){
 const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{},seen=new Set(CORE_USER_STATS.map(s=>s.id)),names=new Set(CORE_USER_STATS.flatMap(s=>[s.name,...s.aliases]).map(n=>n.toLocaleLowerCase()));
 const definitions=(Array.isArray(source.definitions)?source.definitions:[]).slice(0,32).flatMap(d=>{
  if(!validId(d?.id)||seen.has(d.id)||!clean(d.name,80)||names.has(clean(d.name,80).toLocaleLowerCase())||!clean(d.description,600)||!Array.isArray(d.methods))return[];
  const methods=d.methods.map(m=>clean(m,600)).filter(Boolean).slice(0,8);if(!methods.length)return[];
  const min=finite(d.min,0,-999999),max=finite(d.max,999999,min);seen.add(d.id);names.add(clean(d.name,80).toLocaleLowerCase());
  return[{id:d.id,name:clean(d.name,80),description:clean(d.description,600),methods,min,max,initial:finite(d.initial,min,min,max),gain:finite(d.gain,1,.001,999999),showTraining:d.showTraining!==false,showStatus:d.showStatus!==false,unit:clean(d.unit,30)}];
 });
 return {version:1,definitions,hidden:[...new Set((Array.isArray(source.hidden)?source.hidden:[]).filter(id=>CORE_USER_STATS.some(s=>s.id===id)))]};
}
export function normalizeUserAttributes(raw,fallback={}){return Object.fromEntries(CORE_USER_STATS.filter(s=>s.path.startsWith('player.attributes')).map(s=>[s.id,finite(raw?.[s.id],finite(fallback?.[s.id],s.initial))]));}
export function normalizeUserCustomStats(raw,config,fallback={}){
 // Inactive definitions stay in the chat's value store when presets change.
 // Only configured definitions are exposed to AI operations and training.
 const stored=Object.fromEntries(Object.entries({...fallback,...raw}).filter(([id,value])=>validId(id)&&typeof value==='number'&&Number.isFinite(value)).slice(0,1024));
 return {...stored,...Object.fromEntries(normalizeStatTraining(config).definitions.map(d=>[d.id,finite(raw?.[d.id],finite(fallback?.[d.id],d.initial,d.min,d.max),d.min,d.max)]))};
}
export function statTrainingTargets(state){
 const config=normalizeStatTraining(state?.statTraining),read=path=>path.split('.').reduce((v,k)=>v?.[k],state);
 return [...CORE_USER_STATS.map(d=>({...d,min:d.path.endsWith('.max')?1:0,max:999999,showTraining:!config.hidden.includes(d.id),showStatus:true,value:finite(read(d.path),d.initial),unit:''})),...config.definitions.map(d=>({...d,path:`player.customStats.${d.id}`,value:finite(state?.player?.customStats?.[d.id],d.initial,d.min,d.max),aliases:[d.name]}))];
}
export function applyUserStatOperation(state,verb,path,value){
 const d=statTrainingTargets(state).find(d=>d.path===path);if(!d||!['inc','set'].includes(verb)||typeof value!=='number'||!Number.isFinite(value))return false;
 const amount=verb==='inc'?d.value+value:value;if(!Number.isFinite(amount))return false;
 const parts=path.split('.'),key=parts.pop();let target=state;for(const p of parts){target[p]||={};target=target[p];}target[key]=finite(amount,d.value,d.min,d.max);return target[key]!==d.value;
}
export function statTrainingAction(target,method=0,language='en'){
 if(!target)return'';const text=target.methods[method]||target.methods[0];
 return language==='th'?`ฉันเริ่มฝึก ${target.name} ด้วยวิธีนี้: ${text} ขอให้เล่าการฝึกต่อจากฉากปัจจุบันและตัดสินผลตามการฝึกจริง ไม่ถือว่าสำเร็จทันที${target.path.endsWith('.max')?' หากฝึกสำเร็จจะพัฒนาค่าสูงสุดถาวร ไม่ใช่ฟื้นค่าปัจจุบัน':''}`
  :`I begin ${target.name} training: ${text}. Continue the practice from the current scene and judge the actual completed exercise, without granting automatic success.${target.path.endsWith('.max')?' Successful practice develops the permanent maximum, rather than restoring the current resource.':''}`;
}
export function statTrainingInstructions(state){
 const targets=statTrainingTargets(state).map(({id,name,path,value,min,max,gain,description,methods})=>{const builtin=CORE_USER_STATS.some(d=>d.id===id);return {id,name,path,value,min,max,gainLimit:gain,description:builtin?description.split(' / ')[0]:description,methods:methods.map(m=>builtin?m.split(' / ')[0]:m)};});
 return '[USER STAT TRAINING]\nButtons and typed main-chat training are the same in-story action. Resolve safe, plausible practice using the current scene and the stat’s defined methods. No reward for clicking, an intention, a plan, a question, rest, failed/interrupted practice or OOC text. Never train a mana system the world does not have. Describe the exercise, duration/effort, recovery and outcome; record actual fatigue or resource costs separately. HP/MP/ST training increases only permanent max; do not refill current values or invent a temporary cap. INT/STR/DF/AG and configured custom stats increase their numeric value. For confirmed successful completed practice, include one inc op at the exact listed path with {category:"training",reason:"brief confirmed outcome",label:"stat name"}; gain at most gainLimit per stat for this reply, with configured bounds. Do not invent unconfigured custom stats. Hidden buttons only affect display, never typed practice.\n'+JSON.stringify(targets).replace(/</gu,'\\u003c');
}
const trainingWords=/\b(?:train(?:ing|ed)?|practi[cs](?:e|ing|ed)|exercise|drill|workout|study(?:ing)?|studied|research)\b|ฝึก|ซ้อม|ศึกษา|วิดพื้น/iu;
const completedWords=/\b(?:completed|finished|improved|increased|successful|mastered|grew|gained|stronger)\b|เสร็จ|สำเร็จ|เพิ่มขึ้น|พัฒนาขึ้น|แข็งแรงขึ้น/iu;
const refusedWords=/\b(?:failed|interrupted|unable|could not|not yet|did not|not (?:completed|finished|successful|improved)|will|would|might|plan to|hypothetical)\b|ล้มเหลว|ไม่สำเร็จ|ถูกขัดจังหวะ|ยังไม่(?:เสร็จ|สำเร็จ)|สมมุติ|สมมติ|ยังไม่ได้ฝึก/iu;
const publicText=value=>normalizedText(String(value).replace(/<(?:planning|analysis|thinking|think|reasoning)\b[^>]*>[\s\S]*?<\/(?:planning|analysis|thinking|think|reasoning)>/giu,' ').replace(/<[^>]*>/gu,' '));
const nonAction=/^\s*(?:\(?OOC\b|\[OOC\b|how\b|can I\b|could I\b|should I\b|what\b|is it\b|do you\b|ควร|สามารถ|ถาม|วิธี|ถ้า|หาก|ฝึก.*(?:ยังไง|อย่างไร|ได้ไหม|ได้มั้ย))|\b(?:plan(?:ning)? to|tomorrow|hypothetical|if I|will train later)\b|วางแผน|พรุ่งนี้|สมมุ?ติ|ไม่ได้ฝึก|ไม่(?:ฝึก|ซ้อม)/iu;
const mentions=(source,d)=>[d.name,...d.aliases||[]].some(name=>{name=normalizedText(name);const term=escapeRx(name);return new RegExp(/^[a-z][a-z0-9 -]*$/iu.test(name)?`(?<![a-z])${term}(?![a-z])`:term,'iu').test(source);});
export function resolveStatTrainingOps(ops,state,{user='',story=''}={}){
 const targets=statTrainingTargets(state),userText=publicText(user).slice(0,30000),storyText=publicText(story).slice(0,60000),eligible=new Map();
 const practicing=trainingWords.test(userText)&&!nonAction.test(userText)&&!refusedWords.test(userText.replace(/without granting automatic success|ไม่ถือว่าสำเร็จทันที/giu,''));
 const player=normalizedText(clean(state?.player?.name,120)),foreignActor=/^\s*(?:I (?:watch|ask|tell)|ฉัน(?:ดู|สั่ง|ขอให้)|ผม(?:ดู|สั่ง|ขอให้))/iu.test(userText)||Boolean(player&&/^\s*[\p{L}]+\s+(?:is\s+)?(?:train(?:s|ed|ing)?|practi[cs](?:es|ed|ing)|studies|studied)\b/iu.test(userText)&&!userText.trimStart().startsWith(player)&&!/^\s*I\b/iu.test(userText));
 const clauses=storyText.split(/[.!?。\n]+/u).map(v=>v.trim()).filter(Boolean);
 if(practicing&&!foreignActor&&trainingWords.test(storyText))for(const d of targets){
  const exercise=clauses.filter(c=>trainingWords.test(c)&&mentions(c,d));
  const completed=clauses.some(c=>mentions(c,d)&&completedWords.test(c)&&!refusedWords.test(c)&&!(player&&/^[\p{L}]+\s+(?:completed|finished|improved|gained|trained)\b/iu.test(c)&&!c.startsWith(player)&&!/^You\b/iu.test(c)));
  if(mentions(userText,d)&&completed&&exercise.some(c=>!refusedWords.test(c))&&!exercise.some(c=>refusedWords.test(c)))eligible.set(d.path,d);
 }
 const gains=new Map(),out=[];
 for(const op of Array.isArray(ops)?ops:[]){
  const [verb,path,value,meta]=op,d=targets.find(d=>d.path===path),increase=d&&typeof value==='number'?(verb==='inc'?value:verb==='set'?value-d.value:0):0;
  if(!d||increase<=0||meta?.category!=='training'&&!trainingWords.test(userText)){out.push(op);continue;}
  if(!eligible.has(path))continue;
  const remaining=Math.max(0,d.gain-(gains.get(path)||0)),amount=Math.min(increase,remaining,d.max-d.value);if(amount<=0)continue;
  out.push(['inc',path,amount,{...meta,category:'training',label:d.name}]);gains.set(path,(gains.get(path)||0)+amount);
 }
 // A complete narration may omit its numeric patch. Recover only clearly
 // named completed practice, never infer a gain from the player's request.
 for(const [path,d]of eligible)if(!out.some(op=>op[1]===path)&&d.value<d.max)out.push(['inc',path,Math.min(d.gain,d.max-d.value),{category:'training',label:d.name,reason:'Completed practice confirmed in the story'}]);
 return out;
}
export function userStatGrowth(before,after){const previous=new Map(statTrainingTargets(before).map(d=>[d.id,d]));return statTrainingTargets(after).flatMap(d=>{const prior=previous.get(d.id);return prior&&d.value>prior.value?[{id:d.id,name:d.name,path:d.path,before:prior.value,after:d.value,delta:Number((d.value-prior.value).toFixed(6))}]:[];});}
export function customStatId(name){let n=2166136261;for(const c of String(name))n=Math.imul(n^c.codePointAt(0),16777619);return 'stat-'+(n>>>0).toString(36);}
