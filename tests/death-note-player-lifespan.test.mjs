import test from 'node:test';
import assert from 'node:assert/strict';
import {clockSeconds,deadlineValue,playerLifeDeadline,playerLifespanInfo,playerLifespanEvent,aiLifespanEvent,lifeDuration} from '../src/workshop/death-note/lifespan.js';
import {worldState,applyEvent,storyEvents,WORLD_EVENTS,validateAction,worldInstruction} from '../src/workshop/death-note/world.js';
import {eyeInsight} from '../src/workshop/death-note/eyes.js';
import {deathNoteSettingsMarkup} from '../src/workshop/death-note/settings.js';
const state=()=>({player:{name:'Nox',race:'Human'},worldClock:{day:1,time:'12:00'},npcs:[{id:'bb',name:'Beyond Birthday',race:'Human'},{id:'ryuk',name:'Ryuk',race:'Shinigami'}],inventory:[],deathNoteRules:{actorEyes:{bb:'innate'}}});
const form=o=>new Map(Object.entries(o));
const manual=(s,w,days=100)=>playerLifespanEvent(form({mode:'remaining',years:'0',days:String(days),locked:'on',allowAI:'on'}),w,s);
const row=(e,mes='A scene.')=>({mes,swipe_id:0,extra:{[WORLD_EVENTS]:[{...e,swipe:0,offset:mes.length}]}});
const source=e=>'A scene.<!--roleforge_death_note_world:'+JSON.stringify({events:[e]})+'-->';
const seed={type:'player-lifespan',actorId:'player',value:{day:101,time:'12:00'},recordedClock:{day:1,time:'12:00'}};
test('story time validates boundaries and formats Thai/English without wall-clock countdowns',()=>{
 assert.equal(clockSeconds({day:1,time:'12:00'}),43200);assert.deepEqual(deadlineValue(43201),{day:1,time:'12:00:01'});
 for(const value of [{day:0,time:'12:00'},{day:1,time:'24:00'},{day:2.5,time:'12:00'}])assert.equal(clockSeconds(value),null);
 assert.equal(deadlineValue(null),null);assert.equal(lifeDuration(366*86400,'en'),'1 yr 1 d');assert.equal(lifeDuration(366*86400),'1 ปี 1 วัน');
});
test('AI may establish a private initial baseline without claiming any NPC revealed it',()=>{
 const s=state(),events=storyEvents(source(seed),s);assert.equal(events.length,1);const w=worldState([{mes:source(seed)}],s);
 assert.equal(playerLifespanInfo(w,s).remainingSeconds,100*86400);assert.equal(w.claims.bb,undefined);assert.equal(w.actorFaces.bb,undefined);
 assert.match(worldInstruction(worldState([],s),s),/Establish one plausible/);assert.doesNotMatch(worldInstruction(w,s),/Establish one plausible/);
 const invalid=[{...seed,actorId:'bb'},{...seed,value:{day:1,time:'11:00'}},{...seed,value:{day:Infinity,time:'12:00'}},{...seed,recordedClock:null}];
 for(const e of invalid)assert.equal(aiLifespanEvent(e),null);
});
test('manual changes preserve baseline, lock, and prevent both future and repeated AI initialization',()=>{
 const s=state(),w=worldState([{mes:source(seed)}],s);applyEvent(w,manual(s,w,20));
 assert.equal(playerLifespanInfo(w,s).remainingSeconds,20*86400);assert.equal(w.playerLifespan.natural.day,101);
 applyEvent(w,aiLifespanEvent({...seed,value:{day:500,time:'12:00'}}));assert.equal(playerLifespanInfo(w,s).remainingSeconds,20*86400);
 applyEvent(w,{type:'player-lifespan-preferences',allowAI:true,locked:false});applyEvent(w,aiLifespanEvent(seed));assert.equal(playerLifespanInfo(w,s).remainingSeconds,20*86400);
 assert.throws(()=>manual(s,w,0));assert.throws(()=>manual(s,w,-1));assert.throws(()=>manual(s,w,365));
});
test('AI disabled or locked while missing cannot seed a value; user can unlock later',()=>{
 const s=state(),w=worldState([],s);applyEvent(w,{type:'player-lifespan-preferences',allowAI:false,locked:false});applyEvent(w,aiLifespanEvent(seed));assert.equal(playerLifeDeadline(w,s),null);
 applyEvent(w,{type:'player-lifespan-preferences',allowAI:true,locked:true});applyEvent(w,aiLifespanEvent(seed));assert.equal(playerLifeDeadline(w,s),null);
 applyEvent(w,{type:'player-lifespan-preferences',allowAI:true,locked:false});applyEvent(w,aiLifespanEvent(seed));assert.equal(playerLifespanInfo(w,s).remainingSeconds,100*86400);
});
test('bargain halves current remaining life at that story instant and survives loss of rights',()=>{
 const s=state(),w=worldState([],s);applyEvent(w,manual(s,w));
 applyEvent(w,{type:'register',bookId:'book',ownerId:'player',holderId:'player',shinigamiId:'ryuk'});
 s.worldClock.day=11;const deal=validateAction(w,s,{type:'eye-deal',bookId:'book',confirm:true});applyEvent(w,deal);
 assert.equal(playerLifespanInfo(w,s).remainingSeconds,45*86400);
 s.worldClock.day=12;assert.equal(playerLifespanInfo(w,s).remainingSeconds,44*86400);
 applyEvent(w,{type:'relinquish',bookId:'book'});assert.equal(playerLifespanInfo(w,s).remainingSeconds,44*86400);assert.equal(w.lifespanFraction,.5);
 applyEvent(w,{type:'take',bookId:'book'});applyEvent(w,validateAction(w,s,{type:'eye-deal',bookId:'book',confirm:true}));assert.equal(playerLifespanInfo(w,s).remainingSeconds,22*86400);assert.equal(w.lifespanFraction,.25);
});
test('a previously paid bargain still costs life if AI establishes its missing baseline later',()=>{
 const s=state(),w=worldState([],s);w.lifeFractions.player=.5;w.lifespanFraction=.5;applyEvent(w,aiLifespanEvent(seed));assert.equal(playerLifespanInfo(w,s).remainingSeconds,50*86400);
});
test('journal replay, branch prefix, swipe and shortened-message boundaries isolate configuration',()=>{
 const s=state(),initial={mes:source(seed)},w=worldState([initial],s),later=row(manual(s,w,20)),chat=[initial,later];
 assert.equal(playerLifespanInfo(worldState(chat,s),s).remainingSeconds,20*86400);
 assert.equal(playerLifespanInfo(worldState(chat.slice(0,1),s),s).remainingSeconds,100*86400);
 assert.equal(playerLifespanInfo(worldState([{...later,swipe_id:1}],s),s).known,false);
 assert.equal(playerLifespanInfo(worldState([{...later,mes:'A'}],s),s).known,false);
 assert.equal(playerLifespanInfo(worldState(structuredClone(chat),s),s).remainingSeconds,20*86400);
});
test('eyes read a nonowner player only after seeing their face; notebook owners remain hidden to human eyes',()=>{
 const s=state(),w=worldState([],s),player={...s.player,id:'player'};applyEvent(w,manual(s,w));
 assert.equal(eyeInsight(w,player,s,'en','bb'),null);applyEvent(w,{type:'actor-face-seen',actorId:'bb',npcId:'player'});
 assert(eyeInsight(w,player,s,'en','bb').lifespan);assert.equal(eyeInsight(w,player,s,'en','player'),null);
 applyEvent(w,{type:'register',bookId:'book',ownerId:'player',holderId:'player',shinigamiId:'ryuk'});assert.equal(eyeInsight(w,player,s,'en','bb').lifespanReason,'owner');
 applyEvent(w,{type:'actor-face-seen',actorId:'ryuk',npcId:'player'});assert(eyeInsight(w,player,s,'en','ryuk').lifespan);
 applyEvent(w,validateAction(w,s,{type:'eye-deal',bookId:'book',confirm:true}));applyEvent(w,{type:'relinquish',bookId:'book'});
 assert.equal(eyeInsight(w,player,s,'en','bb').lifespan,'Day 51 · 12:00:00');
});
test('no lifespan expiry automatically kills the player and settings remain bilingual',()=>{
 const s=state(),w=worldState([],s);applyEvent(w,manual(s,w));s.worldClock.day=999;assert.equal(playerLifespanInfo(w,s).remainingSeconds,0);assert.equal(s.player.hp,undefined);
 for(const language of ['th','en']){const markup=deathNoteSettingsMarkup({world:w,state:s,language,launcherEnabled:false});assert.match(markup,/data-ws-launcher="deathNote"/);assert.match(markup,/data-dn-config="lifespan"/);assert(!/data-ws-launcher="deathNote" checked/u.test(markup));assert(!markup.includes('undefined'));}
});
test('late author baseline uses the recorded bargain instant, not the later time of initialization',()=>{
 const s=state(),w=worldState([],s);applyEvent(w,{type:'register',bookId:'book',ownerId:'player',holderId:'player',shinigamiId:'ryuk'});
 applyEvent(w,{...validateAction(w,s,{type:'eye-deal',bookId:'book',confirm:true}),recordedClock:{...s.worldClock}});
 s.worldClock.day=11;applyEvent(w,aiLifespanEvent({...seed,recordedClock:{day:11,time:'12:00'}}));
 assert.equal(playerLifespanInfo(w,s).remainingSeconds,40*86400);
});
test('User turns cannot forge private AI seeds and a saved simulated value stays hidden from NPC eyes in authored-only mode',()=>{
 const s=state();assert.equal(playerLifespanInfo(worldState([{is_user:true,mes:source(seed)}],s),s).known,false);
 const w=worldState([],s);applyEvent(w,{type:'lifespan-record',actorId:'player',value:{day:101,time:'12:00'}});applyEvent(w,{type:'actor-face-seen',actorId:'bb',npcId:'player'});
 assert.equal(eyeInsight(w,{...s.player,id:'player'},s,'en','bb').lifespan,'');
 applyEvent(w,{type:'settings',settings:{lifespanMode:'simulated'}});assert(eyeInsight(w,{...s.player,id:'player'},s,'en','bb').lifespan);
});
test('malformed clocks and date-only author values neither crash nor invent a story epoch',()=>{
 assert.equal(clockSeconds(null),null);assert.equal(clockSeconds([]),null);assert.equal(aiLifespanEvent({...seed,recordedClock:[]}),null);
 const s=state();s.deathNoteRules.originalLifespans={player:{date:'2050-04-18',time:'12:00'}};const w=worldState([],s);
 assert.equal(playerLifespanInfo(w,s).known,false);assert.equal(playerLifespanInfo(w,s).naturalText,'2050-04-18 · 12:00');applyEvent(w,aiLifespanEvent(seed));assert.equal(w.playerLifespan,undefined);
 s.worldClock=null;assert.equal(playerLifespanInfo(w,s).known,false);
});
