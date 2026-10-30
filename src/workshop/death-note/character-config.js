import {actorKey,defaultDeathNoteSettings} from './actors.js?v=0.90.17';
import {clockSeconds} from './lifespan.js?v=0.90.17';

// Only explicit author preferences are shared. Notebook ownership, bargains,
// deaths, known faces and learned names stay in the selected chat's journal.
export function normalizeDeathNoteConfig(raw={}) {
 const config={actors:{}};
 if(raw.settings)config.settings=defaultDeathNoteSettings(raw.settings);
 for(const [id,row]of Object.entries(raw.actors||{}).slice(0,512))if(actorKey(id)&&['none','innate','gift','roleplay'].includes(row?.source)&&typeof row.revision==='string'&&row.revision.length<180)config.actors[id]={source:row.source,knownToPlayer:row.knownToPlayer===true,revision:row.revision};
 const life=raw.lifespan;
 if(life&&typeof life.revision==='string'&&life.revision.length<180){config.lifespan={allowAI:life.allowAI!==false,locked:life.locked===true,revision:life.revision};if(Number.isSafeInteger(life.remaining)&&life.remaining>0&&life.remaining<=20001*365*86400)config.lifespan.remaining=life.remaining;}
 return config;
}
export function updateDeathNoteConfig(raw,event,revision) {
 const config=normalizeDeathNoteConfig(raw);
 if(event.type==='settings')config.settings=defaultDeathNoteSettings(event.settings);
 else if(event.type==='eye-ability'&&actorKey(event.actorId)&&['none','innate','gift','roleplay'].includes(event.source))config.actors[event.actorId]={source:event.source,knownToPlayer:event.knownToPlayer===true,revision};
 else if(['player-lifespan','player-lifespan-preferences'].includes(event.type))config.lifespan={...config.lifespan,allowAI:event.allowAI!==false,locked:event.locked===true,revision,...(event.type==='player-lifespan'?{remaining:event.deadline-event.at}:{})};
 else return null;
 return normalizeDeathNoteConfig(config);
}
export function characterConfigEvents(config,rows,state) {
 const c=normalizeDeathNoteConfig(config),seen=new Set(rows.map(e=>e.configRevision).filter(Boolean)),events=[];
 for(const [actorId,row]of Object.entries(c.actors))if(!seen.has(row.revision)&&(actorId==='player'||(state.npcs||[]).some(n=>n.id===actorId)))events.push({type:'eye-ability',actorId,source:row.source,knownToPlayer:row.knownToPlayer,configRevision:row.revision});
 const life=c.lifespan,at=clockSeconds(state.worldClock);
 if(life&&!seen.has(life.revision)&&at!==null)events.push({type:life.remaining?'player-lifespan':'player-lifespan-preferences',source:'manual',at,...(life.remaining?{deadline:at+life.remaining}:{}),allowAI:life.allowAI,locked:life.locked,configRevision:life.revision});
 return events;
}
