// Tolerate equivalent provider formatting, never invent missing NPC decisions.
const text=value=>typeof value==='string'?value.trim():'';
const identity=value=>text(value).normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu,' ');
const number=value=>typeof value==='string'&&/^[0-9๐-๙]+(?:\.0+)?$/u.test(value.trim())?Number(value.trim().replace(/[๐-๙]/gu,c=>'๐๑๒๓๔๕๖๗๘๙'.indexOf(c))):value;
const aliases={ongoing:'open',continue:'open',accepted:'accept',agreed:'accept',counteroffer:'counter',rejected:'reject',cancelled:'cancel',canceled:'cancel',withdrawn:'withdraw',skip:'pass',hold:'pass',wait:'pass',no_bid:'pass',raise:'bid','ผ่าน':'pass','รอ':'pass','ถอนตัว':'withdraw','เสนอราคา':'bid'};
const action=value=>{const normalized=identity(value);return aliases[normalized]||normalized;};
const fault=(code,people=[])=>({ok:false,error:code,details:{people}});
export function requiredCommerceParticipants(session) {
    const lot=session.kind==='auction'?session.lots[session.index]:null;
    return lot?session.participants.filter(p=>lot.bidders.includes(p.id)&&!lot.withdrawn.includes(p.id)&&p.id!==lot.leader):[];
}
export function normalizeCommerceDecision(raw,session) {
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return fault('response');
    const decision={outcome:action(raw.outcome??raw.status),amount:number(raw.amount??raw.price)};
    if(session.kind!=='auction')return{ok:true,decision:{...decision,...(raw.participants?{participants:raw.participants}:{})}};
    const lot=session.lots[session.index];
    let responses=raw.participants??raw.bidders??raw.npcActions??raw.participantDecisions;
    if(responses&&typeof responses==='object'&&!Array.isArray(responses))responses=Object.entries(responses).map(([name,value])=>({...value,name:value?.name||name,id:value?.id||name}));
    const required=requiredCommerceParticipants(session);
    if(responses==null&&!required.length)responses=[]; // Nobody needs an NPC choice.
    if(!Array.isArray(responses)||responses.length>20)return fault('participants-missing',required.map(p=>p.name));
    const normalized=[],seen=new Map();
    for(const response of responses){
        if(!response||typeof response!=='object')return fault('participant-format');
        const ids=[response.id,response.participantId,response.bidderId,response.npcId,response.participant_id,response.bidder_id,response.npc_id].filter(Boolean);
        const direct=session.participants.filter(p=>ids.some(id=>id===p.id||p.npcId&&id===p.npcId));
        const names=[response.name,response.bidderName,response.npcName,response.bidder_name,response.npc_name,...ids].filter(Boolean).map(identity);
        const candidates=direct.length?direct:session.participants.filter(p=>names.includes(identity(p.name)));
        if(candidates.length!==1)return fault('participant-identity');
        const participant=candidates[0],choice=action(response.action??response.choice??response.decision),amount=number(response.amount??response.bidAmount??response.bid_amount??response.bid??response.price);
        if(!lot.bidders.includes(participant.id))return fault('participant-identity');
        // Models sometimes restate a retired bidder or the standing winning bid.
        // Ignoring an unchanged fact does not invent a fresh decision.
        if(lot.withdrawn.includes(participant.id)&&['pass','withdraw'].includes(choice))continue;
        if(lot.leader===participant.id&&choice==='bid'&&amount===lot.price)continue;
        if(!['bid','pass','withdraw'].includes(choice))return fault('participant-action',[participant.name]);
        const reason=text(response.reason??response.motivation??response.motive??response.rationale??response.explanation).slice(0,240);
        if(!reason)return fault('participant-reason',[participant.name]);
        const entry={id:participant.id,action:choice,reason,...(choice==='bid'?{amount}: {})};
        if(seen.has(entry.id)){if(JSON.stringify(seen.get(entry.id))===JSON.stringify(entry))continue;return fault('participant-duplicate',[participant.name]);}
        seen.set(entry.id,entry);normalized.push(entry);
    }
    const missing=required.filter(p=>!seen.has(p.id));
    if(missing.length)return fault('participants-missing',missing.map(p=>p.name));
    // A JSON array's order does not define the order of simultaneous NPC offers.
    normalized.sort((a,b)=>(a.action==='bid'?1:0)-(b.action==='bid'?1:0)||(a.action==='bid'&&b.action==='bid'?a.amount-b.amount:0));
    return{ok:true,decision:{...decision,participants:normalized}};
}

export function parseCommerceResponse(raw,{parse=JSON.parse,visible=value=>value}={}) {
    const source=typeof raw==='string'?raw:'';let parsed;
    try{parsed=typeof raw==='object'&&raw!==null?raw:parse(raw);}catch{
        const candidates=[...source.matchAll(/<!--\s*tretaresia_patch\s*:([\s\S]*?)-->|```(?:json)?\s*([\s\S]*?)```/giu)];
        for(const candidate of candidates.reverse()){try{parsed=JSON.parse(candidate[1]||candidate[2]);break;}catch{}}
    }
    const root=parsed?.result?.decision?parsed.result:parsed;
    const commerce=root?.commerce||root?.patch?.commerce;
    const decision=commerce?.decision||root?.decision;
    const narrative=text(root?.narrative??root?.narration??root?.reply??root?.story??root?.text??commerce?.narrative)
        || (commerce?.decision?text(visible(source)): '');
    if(!decision||!narrative||/^[{[]/u.test(narrative))return null;
    return{narrative,decision};
}

export function commerceDecisionContract(prepared) {
    const {session,action:playerAction}=prepared;
    const round=session.kind==='auction'&&['bid','wait','leave','roleplay'].includes(playerAction)&&(session.status==='open'||playerAction==='roleplay');
    const roster=round?(playerAction==='roleplay'?session.participants.filter(p=>session.lots[session.index].bidders.includes(p.id)&&!session.lots[session.index].withdrawn.includes(p.id)):requiredCommerceParticipants(session)):[];
    const shape={narrative:'Brief NPC dialogue/actions',decision:{outcome:playerAction==='talk'?'unchanged':session.kind==='auction'?playerAction==='join'?'joined':playerAction==='next'?'next':playerAction==='leave'&&session.status==='offered'?'left':'AI chooses open, sold, unsold or left':'AI chooses accept, counter, reject or cancel',
        ...(session.kind==='auction'?{participants:roster.map(p=>({id:p.id,action:'AI chooses bid, pass or withdraw',reason:'A short actual motive; required even for pass',amount:0}))}:{amount:session.quote})}};
    return `OUTPUT CONTRACT FOR THIS ACTION: ${JSON.stringify(shape)}\nREQUIRED NPC DECISIONS: ${JSON.stringify(roster.map(p=>({id:p.id,name:p.name,remainingBudget:p.budget-p.spent})))}\nFor bid decide every listed NPC, including those who pass and the former NPC leader the player just outbid. For wait/leave decide every listed NPC except the current standing NPC leader (they retain their existing bid). On talk use unchanged and no participant decisions; on join/next use joined/next without a bidding round. Never omit one because they did not bid. Do not copy the example's placeholders or amount 0 for a bid. No narrative-only answer, no empty participants array when the list is nonempty. This is a fresh decision, not a restatement of old history.`;
}
