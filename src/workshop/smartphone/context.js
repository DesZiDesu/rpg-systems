import {isKeitai,KEITAI_INSTRUCTIONS} from './handset.js?v=0.89.1';
import {APPS,clean,contactLabel,publicProfile} from './model.js?v=0.89.1';

const purposes={
 phone:'Calls: incoming/outgoing calls and text call dialogue; optional Voice Addon speech.',
 messages:'Messages: private direct phone messages, photo attachments and stickers. Separate from Gather.',
 contacts:'Contacts: saved contact labels, numbers and linked NPCs; saved labels may differ from app profile names.',
 wallet:'Wallet: balances and transfers linked to the story currency. Transactions are settled by the engine.',
 store:'Harbor Store: install/open/remove Gather, Lumen and Murmur. Removing an app keeps its saved data.',
 browser:'Drift: in-world browser with tabs, bookmarks and news. Night Arcade is a website inside Drift, not a separate installed app.',
 gather:'Gather: private direct chats, group conversations and stickers, with its own account profiles.',
 lumen:'Lumen: photo posts, stories, profiles, comments, likes and follows.',
 murmur:'Murmur: short public posts, replies/comments, reposts, profiles and follows.',
 stickers:'Stickers: the player-uploaded sticker library and usage cues; NPCs may use only permitted stickers.',
 photos:'Photos: the private player gallery. Only explicitly shared photos/captions are available to recipients.',
 notes:'Notes: private player notes. Other NPCs cannot read them without an established in-world disclosure.',
 maps:'Maps: locations from RoleForge story state, not real GPS.',
 settings:'Settings: local phone preferences; opening or changing a setting is not automatically visible to NPCs.',
};
export const PHONE_WORLD_KNOWLEDGE='Aster is the in-world phone hardware brand; Aster One is the current handset model. It is a smartphone, not a messaging app named Aster. NPCs can naturally refer to its actual app/platform names when appropriate: “message me on Gather”, “post it on Lumen”, “check Murmur”, “open Drift”, or “get it from Harbor Store”. Keep these brand names in both Thai and English dialogue; generic app labels may follow the conversation language. Use the catalog mapping for hidden event app IDs; never put UI actions or internal IDs into spoken dialogue. Installed means installed on the player’s handset, not whether a platform exists elsewhere. NPCs may suggest an uninstalled app, but cannot deliver app events through it until installed. Do not substitute real-world brands/apps unless the story separately establishes them. Catalog knowledge does not grant access to a phone screen, private messages, notes, gallery, account credentials or other NPCs’ conversations. Use recorded activity, profiles and confirmed scenes; never invent player taps, posts, follows or installations just because an app supports them.';

export function phoneEnvironment(phone,config={}){
 if(isKeitai(config))return {device:{brand:'Aster',model:'Aster K06',type:'flip phone / keitai',capabilities:['calls','sms','mobile-mail','photo-journal','camera','mobile-web','notes','alarms','melodies'],instructions:KEITAI_INSTRUCTIONS},apps:[['phone','Calls'],['sms','SMS'],['mail','Mobile Mail'],['contacts','Contacts'],['photos','Photo Album'],['browser','Mobile Portal'],['notes','Notes'],['alarms','Alarms'],['settings','Settings']].map(([id,name])=>({id,name,installed:true})),sites:[{name:'In-world news, weather and travel',url:'aster://portal',insideApp:'browser'}]};
 return {device:{brand:'Aster',model:'Aster One',type:'smartphone'},apps:APPS.map(a=>({id:a.id,name:a.name,thaiName:a.th,purpose:purposes[a.id],installed:phone.installed.includes(a.id)})),sites:[{name:'World news',url:'drift://news',insideApp:'browser'},{name:'Night Arcade',url:'drift://night-arcade',insideApp:'browser',purpose:'Fictional registered accounts, deposits/withdrawals and games; the engine settles outcomes.'}]};
}

export function phoneAppChannel(phone,threadId){
 const thread=phone.threads.find(t=>t.id===threadId&&!t.deleted),app=APPS.find(a=>a.id===thread?.app);
 return app?{app:app.id,appName:thread.channel==='mail'?'Mobile Mail':thread.channel==='sms'?'SMS':app.name,...(thread.channel?{channel:thread.channel}: {})}:{};
}

// Public activity is bounded and excludes blocked/deleted/private records.
// App names and self-chosen account names travel with posts, not secret NPC identities.
export function publicPhonePosts(phone){
 const blocked=actor=>{const contact=phone.contacts.find(c=>c.id===actor);return phone.contacts.some(c=>c.blocked&&(c.id===actor||contact?.npcId&&c.npcId===contact.npcId));};
 const account=(actor,app)=>{
  const c=phone.contacts.find(c=>c.id===actor),p=publicProfile(phone,actor,app,actor==='player'?'Player':contactLabel(c));
  return {actor,displayName:p.displayName,handle:p.handle};
 };
 return phone.posts.filter(p=>['lumen','murmur'].includes(p.app)&&!p.deleted&&!blocked(p.actor)&&!publicProfile(phone,p.actor,p.app).private).slice(-8).map(p=>({id:p.id,actor:p.actor,app:p.app,appName:APPS.find(a=>a.id===p.app).name,account:account(p.actor,p.app),kind:p.kind,text:clean(p.text,1200),time:p.time,likes:(p.likes||[]).length,reposts:(p.reposts||[]).length,comments:(p.comments||[]).filter(c=>!c.deleted&&!blocked(c.actor)).slice(-3).map(c=>({account:account(c.actor,p.app),text:clean(c.text,400),time:c.time}))}));
}
