import test from 'node:test';
import assert from 'node:assert/strict';
import {worldState,applyEvent,WORLD_EVENTS,storyEvents,playerIdentity,npcNotebookFacts,validateAction,worldInstruction,perceivedName} from '../src/workshop/death-note/world.js';
import {eyeAbility,isShinigami} from '../src/workshop/death-note/actors.js';
import {eyeInsight,eyeLifeCost,simulatedLifespan,originalLifespan} from '../src/workshop/death-note/eyes.js';
import {deathNoteSettingsMarkup,settingsEvent,deathNoteHelp} from '../src/workshop/death-note/settings.js';
import {setNpcVisibilityProvider,playerNpc} from '../src/npc-visibility.js';
const fixture=()=>({player:{name:'Nox'},inventory:[{id:'alpha',name:'Death Note',quantity:1}],worldClock:{day:1,time:'12:00'},location:{place:'Studio'},npcs:[{id:'a',name:'Elias Voss',race:'Human',met:true,stats:{hp:100}},{id:'b',name:'Mara Hale',race:'Human',met:true,stats:{hp:100}},{id:'bb',name:'Beyond Birthday',race:'Human',abilities:[{name:'Congenital Shinigami Eyes as a source-specific exception'}],met:false},{id:'ryuk',name:'Ryuk',race:'Shinigami',met:true},{id:'rem',name:'Rem',race:'Shinigami',met:true}],deathNoteRules:{books:[{bookId:'alpha',itemId:'alpha',ownerId:'player',holderId:'player',originalShinigamiId:'ryuk'},{bookId:'beta',itemId:'beta',ownerId:'a',holderId:'b',originalShinigamiId:'rem'}],originalLifespans:{player:{day:101,time:'12:00'},a:{day:201,time:'12:00'},b:{day:301,time:'12:00'}}}});
const message=(events,mes='A completed scene.')=>({mes,swipe_id:0,extra:{[WORLD_EVENTS]:events.map(e=>({...e,swipe:0,offset:mes.length}))}});
const source=(event,evidence)=>evidence+'<!--roleforge_death_note_world:'+JSON.stringify({events:[{...event,evidence}]})+'-->';
const form=value=>{const f=new Map(Object.entries(value));f.has=key=>Map.prototype.has.call(f,key);return f;};
for(const origin of ['innate','gift','roleplay'])test('player '+origin+' eyes require no book, cost no life, survive loss of final rights',()=>{
 const s=fixture(),w=worldState([],s);applyEvent(w,{type:'eye-ability',actorId:'player',source:origin});assert.equal(w.eyes,true);assert.equal(w.lifespanFraction,1);
 applyEvent(w,{type:'drop',bookId:'alpha'});applyEvent(w,{type:'relinquish',bookId:'alpha'});assert.equal(w.memoryLost,true);assert.equal(w.eyes,true);assert.equal(eyeInsight(w,s.npcs[1],s).trueName,'Mara Hale');assert.equal(w.lifespanFraction,1);
 s.inventory=[];s.deathNoteRules.books=[];s.deathNoteRules.actorEyes={player:{source:origin}};assert.equal(worldState([],s).eyes,true);
});
test('BB remains human with innate eyes; NPC sight neither grants a notebook nor reveals identities to player',()=>{
 const s=fixture(),w=worldState([],s);assert.equal(eyeAbility(w,'bb').source,'innate');assert.equal(isShinigami(s.npcs[2]),false);assert.equal(w.eyes,false);assert.equal(npcNotebookFacts(w,s.npcs[2]).eyeSource,'');
 applyEvent(w,{type:'actor-face-seen',actorId:'bb',npcId:'a',evidence:'BB sees Elias Voss clearly.'});assert.equal(eyeInsight(w,s.npcs[0],s,'en','bb').trueName,'Elias Voss');assert.equal(eyeInsight(w,s.npcs[0],s),null);assert.equal(playerIdentity(w,s.npcs[0],s).name,'???');assert.equal(eyeInsight(w,s.npcs[1],s,'en','bb'),null);
});
test('a paid bargain halves life, cannot repeat while eyes active, and is not refunded by configuration or relinquishment',()=>{
 const s=fixture(),w=worldState([],s),e=validateAction(w,s,{type:'eye-deal',bookId:'alpha',confirm:true});applyEvent(w,e);assert.equal(w.lifespanFraction,.5);assert.equal(w.lifeDeadlineSeconds,eyeLifeCost(worldState([],s),s).deadline);assert.throws(()=>validateAction(w,s,{type:'eye-deal',bookId:'alpha',confirm:true}));
 applyEvent(w,{type:'eye-ability',actorId:'player',source:'gift'});applyEvent(w,{type:'relinquish',bookId:'alpha'});assert.equal(w.eyes,true);assert.equal(w.lifespanFraction,.5);assert.equal(w.lifeDeadlineSeconds,e.lifeCost.deadline);
});
test('legacy paid eyes migrate without resetting the original book identity or refunding life',()=>{
 const s=fixture(),m=message([{type:'register',bookId:'alpha',ownerId:'player',holderId:'player',shinigamiId:'ryuk'},{type:'eye-deal',bookId:'alpha',lifeCost:{deadline:4320000}}]),w=worldState([m],s);
 assert.equal(eyeAbility(w).source,'deal');assert.equal(w.books.alpha.currentShinigamiId,'ryuk');assert.equal(w.books.alpha.attachedShinigamiId,'ryuk');assert.equal(w.books.alpha.id,'alpha');assert.equal(w.lifespanFraction,.5);
});
test('exchanging Shinigami swaps references atomically and preserves first owner, human rights, holder, ink and original Shinigami',()=>{
 const s=fixture(),w=worldState([],s);applyEvent(w,{type:'forge-rule',bookId:'alpha',ruleId:'r',text:'A manuscript'});const before=structuredClone(w.books);
 const e=settingsEvent(form({kind:'exchange',bookId:'alpha',otherBookId:'beta',exchangeAttachment:'on'}),w,s);applyEvent(w,e);
 assert.equal(w.books.alpha.currentShinigamiId,'rem');assert.equal(w.books.beta.currentShinigamiId,'ryuk');assert.equal(w.books.alpha.attachedShinigamiId,'rem');assert.equal(w.books.alpha.originalShinigamiId,'ryuk');
 for(const id of ['alpha','beta'])for(const key of ['id','ownerId','holderId','firstHumanOwnerId','manuscript'])assert.deepEqual(w.books[id][key],before[id][key]);
 applyEvent(w,e);assert.equal(w.books.alpha.currentShinigamiId,'rem','stale event cannot swap twice');
});
test('exchanging owners can leave attendants unchanged and the eye deal uses the actual attendant',()=>{
 const s=fixture(),w=worldState([],s);applyEvent(w,{type:'shinigami-exchange',bookId:'alpha',otherBookId:'beta',fromShinigamiId:'ryuk',toShinigamiId:'rem',exchangeAttachment:false});assert.equal(w.books.alpha.currentShinigamiId,'rem');assert.equal(w.books.alpha.attachedShinigamiId,'ryuk');
 applyEvent(w,{type:'attach-shinigami',bookId:'alpha',shinigamiId:'rem'});assert.equal(w.books.alpha.originalShinigamiId,'ryuk');assert.doesNotThrow(()=>validateAction(w,s,{type:'eye-deal',bookId:'alpha',confirm:true}));
});
test('NPC borrower is not the rights owner, so only the actual owner loses readable lifespan',()=>{
 const s=fixture(),w=worldState([],s);applyEvent(w,{type:'eye-ability',actorId:'player',source:'innate'});assert.equal(eyeInsight(w,s.npcs[0],s).lifespanReason,'owner');assert(eyeInsight(w,s.npcs[1],s).lifespan);assert.equal(npcNotebookFacts(w,s.npcs[0]).books.length,0,'hidden seeded ownership is not a player fact');
});
test('visible NPC registration distinguishes holding from an explicitly established right',()=>{
 const s=fixture();for(const [quote,rights] of [['Elias Voss holds the notebook gamma.',false],['Elias Voss owns and holds the notebook gamma.',true]]){
  const events=storyEvents(source({type:'npc-register',bookId:'gamma',actorId:'a',rightsEstablished:true},quote),s),w=worldState([],s);assert.equal(events.length,1);applyEvent(w,events[0]);assert.equal(w.books.gamma.holderId,'a');assert.equal(w.books.gamma.ownerId,rights?'a':'');assert.equal(npcNotebookFacts(w,s.npcs[0]).books[0].owner,rights);
 }
});
test('visible NPC-to-NPC loan and rights transfer remain separate and replay without duplicate halves',()=>{
 const s=fixture(),w=worldState([],s);applyEvent(w,{type:'handover',bookId:'beta',fromId:'b',toId:'a'});assert.equal(w.books.beta.ownerId,'a');
 const quote='Elias Voss makes an eye bargain with Rem for half his remaining life using notebook beta.',m=message([],source({type:'npc-eye-deal',bookId:'beta',actorId:'a',shinigamiId:'rem'},quote));
 // The scene must actually establish that the rights owner touched the notebook.
 const transfer=message([{type:'register',bookId:'beta',ownerId:'a',holderId:'a',shinigamiId:'rem'}]);const replay=worldState([transfer,m],s);assert.equal(eyeAbility(replay,'a').source,'deal');assert.equal(eyeAbility(replay,'a').paidFraction,.5);assert.equal(replay.lifeDeadlines.a,eyeLifeCost(worldState([transfer],s),s,'a').deadline);
 applyEvent(replay,{type:'handover',bookId:'beta',fromId:'a',toId:'b'});applyEvent(replay,{type:'rights-transfer',bookId:'beta',fromId:'a',toId:'b'});assert.equal(eyeAbility(replay,'a').active,false);assert.equal(eyeAbility(replay,'a').paidFraction,.5);assert.equal(replay.books.beta.ownerId,'b');
});
test('plans, hidden evidence, forged rules and non-Shinigami IDs cannot authorize exchanges or deals',()=>{
 const s=fixture(),e={type:'shinigami-exchange',bookId:'alpha',otherBookId:'beta',fromShinigamiId:'ryuk',toShinigamiId:'rem'};
 for(const q of ['Ryuk and Rem will exchange notebook alpha and beta.','Ryuk and Rem ไม่ได้แลกสมุด alpha กับ beta'])assert.equal(storyEvents(source(e,q),s).length,0);
 assert.equal(storyEvents(source({...e,toShinigamiId:'bb'},'Ryuk and Beyond Birthday exchange notebook alpha and beta.'),s).length,0);
 assert.equal(storyEvents('<!--roleforge_death_note_world:'+JSON.stringify({events:[{...e,evidence:'Ryuk and Rem exchange notebooks.'}]})+'-->',s).length,0);
 assert.equal(storyEvents(source({type:'eye-ability',actorId:'player',source:'innate'},'You now have eyes.'),s).length,0,'model cannot grant player abilities through an unproved footer');
});
test('book and ability changes follow branch prefix, truncation, active swipe, reload and chronological replay',()=>{
 const s=fixture(),start=message([]),later=message([{type:'eye-ability',actorId:'player',source:'innate'},{type:'shinigami-exchange',bookId:'alpha',otherBookId:'beta',fromShinigamiId:'ryuk',toShinigamiId:'rem',exchangeAttachment:true}]);
 assert.equal(worldState([start],s).eyes,false);const full=worldState([start,later],s);assert.equal(full.eyes,true);assert.equal(full.books.alpha.currentShinigamiId,'rem');assert.deepEqual(worldState(structuredClone([start,later]),s),full);
 later.swipe_id=1;assert.equal(worldState([start,later],s).eyes,false);later.swipe_id=0;later.mes='A';assert.equal(worldState([start,later],s).eyes,false);
});
test('simulated lifespans are recorded once, explicitly typed, never inferred from an inscription, and can be hidden without deletion',()=>{
 const s=fixture();delete s.deathNoteRules.originalLifespans.b;const value=simulatedLifespan('b',s,'manga'),m=message([{type:'settings',settings:{lifespanMode:'simulated'}},{type:'lifespan-record',actorId:'b',value},{type:'eye-ability',actorId:'player',source:'innate'}]),w=worldState([m],s);assert.equal(eyeInsight(w,s.npcs[1],s).lifespanSource,'simulation');s.worldClock.day=100;assert.deepEqual(originalLifespan(s,'b','en',worldState([m],s)),originalLifespan(s,'b','en',w));applyEvent(w,{type:'lifespan-record',actorId:'b',value:{day:999,time:'00:00'}});assert.equal(w.originalLifespans.b.day,value.day);applyEvent(w,{type:'settings',settings:{lifespanMode:'authored'}});assert.equal(eyeInsight(w,s.npcs[1],s).lifespan,'');assert.equal(w.originalLifespans.b.day,value.day);
});
test('display configuration never changes a power, never grants knowledge and never refunds lifespan',()=>{
 const s=fixture(),w=worldState([],s);applyEvent(w,{type:'eye-ability',actorId:'player',source:'innate'});applyEvent(w,settingsEvent(form({kind:'display',color:'#ff0000'}),w,s));assert.equal(w.eyes,true);assert.equal(w.settings.header,false);assert.equal(w.settings.dialogue,false);assert.equal(w.lifespanFraction,1);assert.equal(w.claims.a,undefined);assert.equal(playerIdentity(w,s.npcs[0],s).sight.trueName,'Elias Voss');
});
test('disabling identity projection removes addon annotations, preserves the source NPC and restores canonical view',()=>{
 const s=fixture(),w=worldState([],s);applyEvent(w,{type:'eye-ability',actorId:'player',source:'innate'});const before=structuredClone(s);setNpcVisibilityProvider(n=>playerIdentity(w,n,s));const p=playerNpc(s.npcs[0]);assert.equal(playerNpc(p),p,'projection is idempotent for Header/Dialogue/detail');assert(p._rfNameSight);setNpcVisibilityProvider(null);assert.equal(playerNpc(s.npcs[0]),s.npcs[0]);assert.deepEqual(s,before);
});
test('settings and writing guide support both languages, disclose simulation, and reject forged identities',()=>{
 const s=fixture(),w=worldState([],s);for(const language of ['th','en']){const ui=deathNoteSettingsMarkup({world:w,state:s,language});assert(ui.includes('data-dn-config="actor"'));assert(ui.includes('data-dn-config="exchange"'));assert(ui.includes('innate'));assert(deathNoteHelp(language).includes('Kurou Otoharada')||deathNoteHelp(language).includes('คุโร่'));}
 assert.throws(()=>settingsEvent(form({kind:'actor',actorId:'__proto__',source:'innate'}),w,s));assert.throws(()=>settingsEvent(form({kind:'actor',actorId:'player',source:'deal'}),w,s));assert.throws(()=>settingsEvent(form({kind:'book',bookId:'alpha',originalShinigamiId:'bb'}),w,s));assert(worldInstruction(w,s).includes('actorInsights'));assert.equal(originalLifespan(s,'constructor'),null);
});
test('NPC eyes can witness the player without teaching player names/faces or making the player a notebook owner',()=>{
 const s=fixture(),quote='Beyond Birthday sees Nox clearly and sees his face.',events=storyEvents(source({type:'actor-face-seen',actorId:'bb',npcId:'player'},quote),s),w=worldState([],s);assert(events.some(e=>e.type==='actor-face-seen'));for(const e of events)applyEvent(w,e);assert.equal(w.faces.bb,undefined);assert.equal(w.claims.bb,undefined);const insight=eyeInsight(w,{...s.player,id:'player',race:'Human'},s,'en','bb');assert.equal(insight.trueName,'Nox');assert.equal(insight.lifespanReason,'owner');assert.equal(w.eyes,false);
});
test('recorded NPC deal clock prevents the absolute paid deadline drifting when the scene time advances',()=>{
 const s=fixture(),m=message([{type:'register',bookId:'beta',ownerId:'a',holderId:'a',shinigamiId:'rem'},{type:'npc-eye-deal',bookId:'beta',actorId:'a',shinigamiId:'rem',recordedClock:{day:1,time:'12:00'}}]),first=worldState([m],s);s.worldClock={day:50,time:'18:00'};const next=worldState([m],s);assert.equal(first.lifeDeadlines.a,next.lifeDeadlines.a);assert.equal(next.lifeFractions.a,.5);
});

test('a witnessed Shinigami dossier lists each book role separately, without exposing an untouched hidden book',()=>{
 const s=fixture(),w=worldState([],s),ryuk=s.npcs.find(n=>n.id==='ryuk'),rem=s.npcs.find(n=>n.id==='rem');
 assert.deepEqual(npcNotebookFacts(w,ryuk).books.map(b=>b.id),['alpha']);assert.equal(npcNotebookFacts(w,rem).books.length,0);
 applyEvent(w,{type:'shinigami-exchange',bookId:'alpha',otherBookId:'beta',fromShinigamiId:'ryuk',toShinigamiId:'rem',exchangeAttachment:true});
 const facts=npcNotebookFacts(w,rem);assert.equal(facts.books[0].currentShinigami,true);assert.equal(facts.books[0].originalShinigami,false);assert.equal(facts.books[0].attachedShinigami,true);
});

test('an immediate inscription retains its physical notebook ID after Shinigami exchange',async()=>{
 const {makeInscription}=await import('../src/workshop/death-note/core.js'),s=fixture(),entry=makeInscription(s,{bookId:'alpha',targetId:'a',name:'Elias Voss',faceKnown:true});assert.equal(entry.bookId,'alpha');const w=worldState([],s);applyEvent(w,{type:'shinigami-exchange',bookId:'alpha',otherBookId:'beta',fromShinigamiId:'ryuk',toShinigamiId:'rem',exchangeAttachment:true});assert.equal(entry.bookId,w.books.alpha.id);assert.equal(w.books.alpha.originalShinigamiId,'ryuk');
});

test('an NPC can regain a notebook and make a second paid deal without stale memory loss disabling the new eyes',()=>{
 const s=fixture(),w=worldState([],s);applyEvent(w,{type:'handover',bookId:'beta',fromId:'b',toId:'a'});applyEvent(w,{type:'npc-eye-deal',bookId:'beta',actorId:'a',shinigamiId:'rem'});applyEvent(w,{type:'npc-relinquish',bookId:'beta',actorId:'a'});assert.equal(eyeAbility(w,'a').active,false);assert.equal(w.actorMemoryLost.a,true);applyEvent(w,{type:'acquire',bookId:'beta',actorId:'a'});applyEvent(w,{type:'npc-eye-deal',bookId:'beta',actorId:'a',shinigamiId:'rem'});assert.equal(eyeAbility(w,'a').active,true);assert.equal(eyeAbility(w,'a').paidFraction,.25);
});

test('later visible ownership identifies the same notebook without changing a conflicting owner or physical holder',()=>{
 const s=fixture(),w=worldState([],s);applyEvent(w,{type:'register',bookId:'gamma',holderId:'a',knownToPlayer:true});assert.equal(w.books.gamma.ownerId,'');
 for(const e of storyEvents(source({type:'npc-register',bookId:'gamma',actorId:'a',rightsEstablished:true},'Elias Voss owns and holds notebook gamma.'),s))applyEvent(w,e);
 assert.equal(w.books.gamma.ownerId,'a');assert.equal(w.books.gamma.ownerKnownToPlayer,true);
 for(const e of storyEvents(source({type:'npc-register',bookId:'gamma',actorId:'b',rightsEstablished:true},'Mara Hale owns and holds notebook gamma.'),s))applyEvent(w,e);
 assert.equal(w.books.gamma.ownerId,'a');assert.equal(w.books.gamma.holderId,'a');
});

test('unknown-name masking is a reversible display preference and never teaches a true name',()=>{
 const s=fixture(),w=worldState([],s),npc=s.npcs[0];
 assert.equal(playerIdentity(w,npc,s).name,'???');
 applyEvent(w,settingsEvent(form({kind:'display'}),w,s));
 assert.equal(playerIdentity(w,npc,s).name,'Elias Voss');assert.equal(w.claims.a,undefined);assert.equal(perceivedName(w,npc),'???');assert.equal(eyeInsight(w,npc,s),null);
 applyEvent(w,settingsEvent(form({kind:'display',maskUnknownNames:'on'}),w,s));assert.equal(playerIdentity(w,npc,s).name,'???');
 applyEvent(w,{type:'introduce',npcId:'a',claimedName:'Adrian Grey'});assert.equal(playerIdentity(w,npc,s).name,'Adrian Grey');
});
test('eye author controls use the active persona while keeping the stable player actor id',()=>{
 const s=fixture();s.player.name='Adventurer';const w=worldState([],s);
 const html=deathNoteSettingsMarkup({world:w,state:s,personaName:'Light <Yagami>'});
 assert(html.includes('value="player" selected>Light &lt;Yagami&gt;</option>'));assert(!html.includes('Adventurer'));
 assert.equal(settingsEvent(form({kind:'actor',actorId:'player',source:'innate'}),w,s).actorId,'player');
});
