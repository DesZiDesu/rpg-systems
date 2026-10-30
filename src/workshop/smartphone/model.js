import {sha256} from '../../vendor/js-sha256/index.js?v=0.90.17';

export const PHONE_FIELD='roleforge_smartphone';
export const PHONE_PROMPT='roleforge_smartphone_context';
export const APPS=[
 {id:'phone',name:'Calls',th:'โทรศัพท์',row:0,col:0,builtIn:true},
 {id:'messages',name:'Messages',th:'ข้อความ',row:0,col:1,builtIn:true},
 {id:'contacts',name:'Contacts',th:'รายชื่อ',row:0,col:2,builtIn:true},
 {id:'wallet',name:'Wallet',th:'กระเป๋าเงิน',row:0,col:3,builtIn:true},
 {id:'store',name:'Harbor Store',th:'Harbor Store',row:1,col:0,builtIn:true},
 {id:'browser',name:'Drift',th:'Drift',row:1,col:1,builtIn:true},
 {id:'gather',name:'Gather',th:'Gather',row:1,col:2,builtIn:false},
 {id:'lumen',name:'Lumen',th:'Lumen',row:1,col:3,builtIn:false},
 {id:'murmur',name:'Murmur',th:'Murmur',row:2,col:0,builtIn:false},
 {id:'stickers',name:'Stickers',th:'สติกเกอร์',row:2,col:1,builtIn:true},
 {id:'photos',name:'Photos',th:'รูปภาพ',row:2,col:2,builtIn:true},
 {id:'notes',name:'Notes',th:'โน้ต',row:2,col:3,builtIn:true},
 {id:'maps',name:'Maps',th:'แผนที่',row:3,col:0,builtIn:true},
 {id:'settings',name:'Settings',th:'ตั้งค่า',row:3,col:1,builtIn:true},
];
export const SOCIAL_APPS=['gather','lumen','murmur'];
export const clean=(v,n=1000)=>typeof v==='string'?v.trim().slice(0,n):'';
export const id=()=>globalThis.crypto?.randomUUID?.()||'p-'+Date.now()+'-'+Math.random().toString(36).slice(2);
export const fingerprint=v=>sha256(typeof v==='string'?v:JSON.stringify(v));
export const key=v=>typeof v==='string'&&/^[\p{L}\p{N}_.:-]{1,160}$/u.test(v)&&!['__proto__','constructor','prototype'].includes(v);
export const clone=v=>structuredClone(v);
export function safeImage(v){
 if(typeof v!=='string'||v.length>750000)return '';
 if(/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/u.test(v))return v;
 if(/^\/scripts\/extensions\/third-party\/rpg-systems\/src\/workshop\/smartphone\/assets\/[\w./-]+$/u.test(v)&&!v.includes('..'))return v;
 return '';
}
export const configDefaults=()=>({
 deviceType:'smartphone',keitaiCase:'silver',keitaiWallpaper:'crossing',keitaiTone:'komorebi',keitaiOpenToAnswer:true,keitaiOuterPreview:true,keitaiMail:'',language:'inherit',theme:'light',wallpaper:'clay',replyMode:'deferred',requireDevice:true,assumeDevice:false,
 incomingMessages:true,incomingCalls:false,socialActivity:true,offscreenActivity:false,
 notifications:true,capsule:true,motion:true,sound:false,voiceAuto:false,voiceFallback:'',callInput:'both',
 floating:true,wand:true,position:{x:.92,y:.08},maxEvents:8,walletUnit:'',walletLabel:'My wallet',
});
export function phoneConfig(raw={}){
 const d=configDefaults(),bool=['keitaiOpenToAnswer','keitaiOuterPreview','requireDevice','assumeDevice','incomingMessages','incomingCalls','socialActivity','offscreenActivity','notifications','capsule','motion','sound','voiceAuto','floating','wand'];
 for(const k of bool)if(typeof raw[k]==='boolean')d[k]=raw[k];
 for(const [k,values]of Object.entries({deviceType:['smartphone','keitai'],keitaiCase:['silver','ink','sakura'],keitaiWallpaper:['crossing','river'],keitaiTone:['komorebi','night','mail'],language:['inherit','th','en'],theme:['light','dark','system'],wallpaper:['clay','ocean','ink'],replyMode:['deferred','immediate'],callInput:['both','phone','user','main']}))if(values.includes(raw[k]))d[k]=raw[k];
 d.keitaiMail=clean(raw.keitaiMail,160);d.keitaiWallpaperPhoto=clean(raw.keitaiWallpaperPhoto,160);d.voiceFallback=clean(raw.voiceFallback,160);d.walletUnit=clean(raw.walletUnit,64);d.walletLabel=clean(raw.walletLabel,80)||d.walletLabel;
 d.maxEvents=Math.max(1,Math.min(12,Number(raw.maxEvents)||8));
 d.position={x:Math.max(0,Math.min(1,Number.isFinite(raw.position?.x)?raw.position.x:.92)),y:Math.max(0,Math.min(1,Number.isFinite(raw.position?.y)?raw.position.y:.08))};
 return d;
}
export function blankPhone(){return{
 schema:1,revision:0,keitaiDraft:null,alarms:[],webPages:[],alarmClock:null,incomingRoutingVersion:1,relationshipRoutingVersion:1,contacts:[],profiles:{player:{}},threads:[],messages:[],drafts:{},attachments:{},pending:[],calls:[],
 posts:[],relationships:[],stickers:[],photos:[],notes:[],news:[],notifications:[],
 installed:['phone','messages','contacts','wallet','store','browser','stickers','photos','notes','maps','settings'],
 browser:{tabs:[{id:'start',url:'drift://start'}],activeTab:'start',history:[],bookmarks:[]},
 accounts:[],ledger:[],receipts:[],processed:[],deletedThreads:[],sessions:{},storySync:null,deviceName:'Aster One',
};}
export function normalizePhone(raw){
 const d=blankPhone();if(!raw||raw.schema!==1)return d;
 for(const k of ['alarms','webPages','contacts','threads','messages','pending','calls','posts','relationships','stickers','photos','notes','news','notifications','accounts','ledger','receipts','processed','deletedThreads'])if(Array.isArray(raw[k]))d[k]=clone(raw[k]);
 if(raw.keitaiDraft&&typeof raw.keitaiDraft==='object')d.keitaiDraft={contactId:clean(raw.keitaiDraft.contactId,160),channel:raw.keitaiDraft.channel==='sms'?'sms':'mail',subject:clean(raw.keitaiDraft.subject,180),text:clean(raw.keitaiDraft.text,6000),photoId:clean(raw.keitaiDraft.photoId,160)};if(raw.alarmClock&&typeof raw.alarmClock==='object')d.alarmClock={day:Number(raw.alarmClock.day)||1,time:clean(raw.alarmClock.time,10)};d.alarms=d.alarms.filter(a=>a&&key(a.id)&&/^([01]\d|2[0-3]):[0-5]\d$/u.test(a.time||'')).slice(0,8).map(a=>({id:a.id,time:a.time,enabled:a.enabled!==false,label:clean(a.label,80),...(Number.isSafeInteger(a.lastFiredDay)?{lastFiredDay:a.lastFiredDay}:{})}));d.webPages=d.webPages.filter(p=>p&&['news','weather','travel'].includes(p.section)).slice(-3).map(p=>({id:clean(p.id,160),section:p.section,title:clean(p.title,180),body:clean(p.body,6000),source:clean(p.source,100),time:p.time}));d.relationshipRoutingVersion=raw.relationshipRoutingVersion===1?1:0;if(raw.relationshipSync&&typeof raw.relationshipSync==='object')d.relationshipSync={checkedAt:clean(raw.relationshipSync.checkedAt,60),recovered:raw.relationshipSync.recovered===true,checks:Array.isArray(raw.relationshipSync.checks)?clone(raw.relationshipSync.checks).slice(-24):[]};
 d.incomingRoutingVersion=raw.incomingRoutingVersion===1?1:0;d.revision=Number.isSafeInteger(raw.revision)?raw.revision:0;d.deviceName=clean(raw.deviceName,80)||'Aster One';
 for(const k of ['profiles','drafts','attachments'])if(raw[k]&&typeof raw[k]==='object'&&!Array.isArray(raw[k]))d[k]=JSON.parse(JSON.stringify(raw[k]),(k,v)=>['__proto__','constructor','prototype'].includes(k)?undefined:v);
 if(raw.browser&&Array.isArray(raw.browser.tabs))d.browser=clone(raw.browser);
 if(raw.storySync&&typeof raw.storySync==='object')d.storySync={source:clean(raw.storySync.source,180),messageId:Number(raw.storySync.messageId),status:raw.storySync.status==='working'?'interrupted':clean(raw.storySync.status,30),error:clean(raw.storySync.error,500)};
 if(Array.isArray(raw.installed))d.installed=[...new Set([...APPS.filter(a=>a.builtIn).map(a=>a.id),...raw.installed.filter(a=>SOCIAL_APPS.includes(a))])];
 // Authentication is session-only; it never survives reload, export or branch.
 d.sessions={};return d;
}
export function publicProfile(phone,actor,app='messages',fallback=''){
 const p=phone.profiles?.[actor]?.[app]||{};
 return {displayName:clean(p.displayName,80)||fallback||actor,handle:clean(p.handle,48),bio:clean(p.bio,800),avatar:safeImage(p.avatar),banner:safeImage(p.banner),status:clean(p.status,160),private:p.private===true,voiceId:clean(p.voiceId,160)};
}
export function contactLabel(contact){return contact?.label||contact?.name||contact?.number||'Unknown contact';}
export function hasDevice(state,config){
 return !config.requireDevice||config.assumeDevice||(state.inventory||[]).some(i=>i.quantity>0&&((i.properties||[]).includes('roleforge:addon:smartphone')||/\b(?:smartphone|mobile phone|cellphone|flip phone|keitai|aster (?:one|k06))\b|มือถือฝาพับ|เคไต|สมาร์ทโฟน|โทรศัพท์(?:มือถือ)?/iu.test(i.name||'')));
}
export function contactFromNpc(npc){
 const number=clean(npc.phone||npc.phoneNumber,50),email=clean(npc.email||npc.phoneEmail,160);
 if(!number&&!email)return null;
 return {id:'npc-'+npc.id,npcId:npc.id,label:npc.name,number,email,avatar:safeImage(npc.portrait),blocked:false,muted:false,source:'story',notes:'',created:false};
}
export function storyTime(state){const c=state.worldClock||{};return {day:Number(c.day)||0,time:clean(c.time,10)||'--:--'};}
export function plainSpeech(text){
 return String(text||'').replace(/<tr-thought\b[^>]*>[\s\S]*?<\/tr-thought>/giu,'').replace(/\|[^|]*\|/gu,'').replace(/<tr-narrative\b[^>]*>[\s\S]*?<\/tr-narrative>/giu,'').replace(/\*[^*]*\*/gu,'').replace(/<[^>]+>/gu,'').trim().slice(0,3000);
}
export function callSpeech(message,contact,isUser=false){
 const text=String(message?.mes||'');
 if(isUser)return plainSpeech(text);
 const aliases=[contact.npcId,contact.name,contact.label].filter(Boolean).map(v=>v.toLocaleLowerCase());
 return [...text.matchAll(/<tr-dialogue\b[^>]*name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/tr-dialogue>/giu)].filter(m=>aliases.includes(m[1].trim().toLocaleLowerCase())).map(m=>plainSpeech(m[2])).filter(Boolean).join('\n');
}

// Profile edits are deliberate configuration, unlike AI-created profiles and
// reversible messages/posts. Retain edits only for actors present at the target
// point (plus the player); this must never resurrect a future contact.
export function retainPhoneProfileEdits(target,current){
 let result=target;
 const actors=new Set(['player',...(target?.contacts||[]).map(c=>c.id)]);
 for(const [actor,apps]of Object.entries(current?.profiles||{})){
  if(!key(actor)||!actors.has(actor)||!apps||typeof apps!=='object')continue;
  for(const app of ['messages',...SOCIAL_APPS]){
   const profile=apps[app];if(!profile||profile.locked!==true)continue;
   if(JSON.stringify(profile)===JSON.stringify(result?.profiles?.[actor]?.[app]))continue;
   if(result===target)result=normalizePhone(target);
   result.profiles||={};result.profiles[actor]||={};result.profiles[actor][app]=clone(profile);
  }
 }
 if(result!==target)result.revision=(Number.isSafeInteger(target?.revision)?target.revision:0)+1;
 return result;
}
