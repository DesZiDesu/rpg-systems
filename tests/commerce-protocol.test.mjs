import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCommerceDecision,parseCommerceResponse,commerceDecisionContract} from '../src/commerce-protocol.js';
const session=()=>({kind:'auction',status:'open',index:0,participants:[{id:'npc-1',name:'Rally',budget:18,spent:0},{id:'npc-2',name:'Mira',budget:10,spent:0}],lots:[{bidders:['npc-1','npc-2'],withdrawn:[],leader:'player',price:6}]});
const choices=()=>[{name:'Rally',choice:'raise',bid_amount:'๑๘',motive:'A family heirloom'},{npc_name:'Mira',decision:'withdrawn',rationale:'Beyond my budget'}];
test('provider names, alternate choice fields and numeric strings preserve explicit NPC intent',()=>{const r=normalizeCommerceDecision({status:'ongoing',npcActions:choices()},session());assert.equal(r.ok,true);assert.deepEqual(r.decision,{outcome:'open',amount:undefined,participants:[{id:'npc-2',action:'withdraw',reason:'Beyond my budget'},{id:'npc-1',action:'bid',amount:18,reason:'A family heirloom'}]});});
test('object-keyed decisions resolve existing IDs or unique names',()=>{const r=normalizeCommerceDecision({outcome:'sold',bidders:{'npc-1':{action:'pass',reason:'Saving for rent'},Mira:{choice:'skip',explanation:'Not my weapon'}}},session());assert.equal(r.ok,true);assert.deepEqual(r.decision.participants.map(p=>p.id),['npc-1','npc-2']);});
test('missing bidder is identified and never silently assigned pass',()=>{const r=normalizeCommerceDecision({outcome:'sold',participants:[choices()[0]]},session());assert.equal(r.error,'participants-missing');assert.deepEqual(r.details.people,['Mira']);});
test('missing motive has a specific error instead of reporting missing participants',()=>{const r=normalizeCommerceDecision({outcome:'open',participants:[{id:'npc-1',action:'pass'},choices()[1]]},session());assert.equal(r.error,'participant-reason');assert.deepEqual(r.details.people,['Rally']);});
test('unknown and ambiguous NPC identities are rejected without adding new budgets',()=>{const s=session();assert.equal(normalizeCommerceDecision({participants:[{name:'Stranger',action:'pass',reason:'Waiting'}]},s).error,'participant-identity');s.participants[1].name='Rally';assert.equal(normalizeCommerceDecision({participants:choices()},s).error,'participant-identity');});
test('duplicate conflicting choices cannot override one another',()=>{const a={id:'npc-1',action:'pass',reason:'Waiting'};assert.equal(normalizeCommerceDecision({participants:[a,{...a,action:'withdraw'},choices()[1]]},session()).error,'participant-duplicate');});
test('unchanged withdrawn NPC and standing leader restatements do not become new bids',()=>{const s=session();s.lots[0].withdrawn=['npc-2'];s.lots[0].leader='npc-1';s.lots[0].price=18;const r=normalizeCommerceDecision({outcome:'sold',participants:[{name:'Rally',action:'bid',amount:18},{name:'Mira',action:'withdraw'}]},s);assert.equal(r.ok,true);assert.deepEqual(r.decision.participants,[]);});
test('simultaneous bids are evaluated in price order independent of response array order',()=>{const r=normalizeCommerceDecision({outcome:'open',participants:[{id:'npc-1',action:'bid',amount:18,reason:'Heirloom'},{id:'npc-2',action:'bid',amount:9,reason:'Useful weapon'}]},session());assert.equal(r.ok,true);assert.deepEqual(r.decision.participants.map(p=>p.amount),[9,18]);});
const expected={narrative:'NPC considers the price.',decision:{outcome:'accept',amount:6}};
for(const [label,raw]of [['plain JSON',JSON.stringify(expected)],['fenced JSON','```json\n'+JSON.stringify(expected)+'\n```'],['alternate narrative',JSON.stringify({narration:expected.narrative,decision:expected.decision})],['nested result',JSON.stringify({result:expected})],['story plus patch',expected.narrative+'\n<!--tretaresia_patch:'+JSON.stringify({commerce:{decision:expected.decision}})+'-->']])test(`reads ${label} with an explicit decision`,()=>assert.deepEqual(parseCommerceResponse(raw,{visible:v=>v.replace(/<!--[\s\S]*?-->/gu,'').trim()}),{...expected,narrative:'<tr-narrative>'+expected.narrative+'</tr-narrative>'}));
for(const raw of ['NPC agrees.', '{"narrative":"NPC agrees.","decision":',JSON.stringify({narrative:'NPC agrees.'})])test(`incomplete provider response is not interpreted as consent: ${raw}`,()=>assert.equal(parseCommerceResponse(raw),null));
test('quiet prompt gives exact roster, while role-play bids still include the former NPC leader',()=>{const s=session();s.lots[0].leader='npc-1';assert.doesNotMatch(commerceDecisionContract({session:s,action:'wait'}).split('REQUIRED NPC DECISIONS:')[1].split('\n')[0],/npc-1/);assert.match(commerceDecisionContract({session:s,action:'roleplay'}).split('REQUIRED NPC DECISIONS:')[1].split('\n')[0],/npc-1/);assert.match(commerceDecisionContract({session:s,action:'bid'}),/required even for pass/);});

for(const [label,raw]of [
 ['prose outside decision JSON','<tr-dialogue name="Varek">Six silver acknowledged.</tr-dialogue>\n```json\n'+JSON.stringify({decision:{outcome:'joined'}})+'\n```'],
 ['prose with a direct commerce decision','<tr-narrative>The auctioneer acknowledges entry.</tr-narrative>\n<!--tretaresia_patch:'+JSON.stringify({commerce:{outcome:'joined'}})+'-->'],
 ['flattened result',JSON.stringify({narrative:'The auctioneer acknowledges entry.',outcome:'joined'})],
 ['response text alias',JSON.stringify({response:'The auctioneer acknowledges entry.',decision:{outcome:'joined'}})],
 ['decorative JSON before the decision','{"scene":"Hall"}\nThe auctioneer acknowledges entry.\n'+JSON.stringify({decision:{outcome:'joined'}})],
])test(`recover ${label} without an extra API request`,()=>{const result=parseCommerceResponse(raw);assert.ok(result);assert.equal(result.decision.outcome,'joined');assert.doesNotMatch(result.narrative,/```|tretaresia_patch|"decision"|"scene"/);});
test('external private reasoning never becomes the visible NPC reaction',()=>{const raw='<think>Private model reasoning.</think>\nThe auctioneer acknowledges entry.\n'+JSON.stringify({decision:{outcome:'joined'}});assert.equal(parseCommerceResponse(raw).narrative,'<tr-narrative>The auctioneer acknowledges entry.</tr-narrative>');});
test('two conflicting explicit decisions are rejected rather than choosing the convenient result',()=>assert.equal(parseCommerceResponse('NPC reacts.\n'+JSON.stringify({decision:{outcome:'open'}})+'\n'+JSON.stringify({decision:{outcome:'sold'}})),null));
test('a complete decision with no NPC prose is still incomplete',()=>assert.equal(parseCommerceResponse(JSON.stringify({decision:{outcome:'joined'}})),null));
test('button contracts use typed fields instead of copyable fake choices and prices',()=>{const prompt=commerceDecisionContract({session:session(),action:'bid'});assert.match(prompt,/"enum":\["open","sold","unsold"\]/);assert.doesNotMatch(prompt,/"amount":0|AI chooses|"accept"|"counter"/);});
test('normal auction contract allows joining and talk and does not require standalone narration JSON',()=>{const prompt=commerceDecisionContract({session:session(),action:'roleplay'});assert.match(prompt,/"unchanged","joined","open"/);assert.doesNotMatch(prompt,/"narrative"|"accept"|"counter"/);});

test('legacy prose is safely rendered as narrative and required markup survives unchanged',()=>{
 const text='Garrick counts five silver & hands over the key. <img src=x onerror=alert(1)>';
 const response=parseCommerceResponse({narrative:text,decision:{outcome:'accept',amount:5}});
 assert.match(response.narrative,/^<tr-narrative>/);assert.match(response.narrative,/&amp;/);assert.match(response.narrative,/&lt;img/);assert.doesNotMatch(response.narrative,/<img\b/);
 const marked='<tr-narrative>Garrick counts the payment.</tr-narrative><tr-dialogue name="Garrick">Here is your key.</tr-dialogue>';
 assert.equal(parseCommerceResponse({narrative:marked,decision:{outcome:'accept',amount:5}}).narrative,marked);
});

test('mixed provider markup wraps every loose prose span without exposing embedded reasoning',()=>{
 const marked='<tr-dialogue name="Garrick">Here is your key.</tr-dialogue>';
 const response=parseCommerceResponse({narrative:'<think>Private planning</think>He counts the money.\n'+marked+'\nHe writes the receipt.',decision:{outcome:'accept',amount:5}});
 assert.equal(response.narrative,'<tr-narrative>He counts the money.</tr-narrative>'+marked+'<tr-narrative>He writes the receipt.</tr-narrative>');
});
