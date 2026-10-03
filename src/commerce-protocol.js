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

// Read complete JSON objects without repairing truncated data or treating prose
// as a financial decision. Quoted braces and nested objects stay inside a span.
function jsonSpans(source) {
    const spans=[];
    for(let start=0;start<source.length&&spans.length<30;start++){
        if(source[start]!=='{')continue;
        let depth=0,quoted=false,escaped=false,end=start;
        for(;end<source.length;end++){
            const c=source[end];
            if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
            if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&!--depth)break;
        }
        if(depth)break;
        const json=source.slice(start,end+1);try{spans.push({start,end:end+1,value:JSON.parse(json)});}catch{}
        start=end;
    }
    return spans;
}
function responseParts(parsed) {
    const root=parsed?.result&&typeof parsed.result==='object'?parsed.result:parsed;
    const commerce=root?.commerce||root?.patch?.commerce;
    const decision=commerce?.decision||root?.decision||(commerce?.outcome?commerce:null)||(root?.outcome?root:null);
    const narrative=text(root?.narrative??root?.narration??root?.reply??root?.story??root?.text??root?.response??commerce?.narrative);
    return{decision,narrative};
}
export function inspectCommerceResponse(raw,{parse=JSON.parse,visible=value=>value}={}) {
    const source=typeof raw==='string'?raw:'';
    if(!source.trim()&&(!raw||typeof raw!=='object'))return{ok:false,error:'response-empty'};
    const candidates=[],spans=jsonSpans(source);
    if(raw&&typeof raw==='object')candidates.push(raw);
    else try{candidates.push(parse(raw));}catch{}
    // A host parser may select a decorative object before the actual result.
    for(const span of spans)candidates.push(span.value);
    let prose=source;
    for(const span of [...spans].reverse())prose=prose.slice(0,span.start)+prose.slice(span.end);
    prose=text(visible(prose.replace(/<(?:think|thinking|analysis)\b[^>]*>[\s\S]*?<\/(?:think|thinking|analysis)>/giu,'').replace(/<!--\s*(?:tretaresia_patch|roleforge_commerce)\s*:[\s\S]*?-->/giu,'').replace(/```(?:json)?\s*```/giu,'')));
    const answers=[];let hasDecision=false;
    for(const parsed of candidates){
        const parts=responseParts(parsed);
        if(!parts.decision||typeof parts.decision!=='object'||Array.isArray(parts.decision))continue;
        hasDecision=true;
        const narrative=parts.narrative||prose;
        if(!narrative||/^[{[]/u.test(narrative))continue;
        answers.push({narrative,decision:parts.decision});
    }
    const distinct=[...new Map(answers.map(answer=>[JSON.stringify(answer.decision),answer])).values()];
    if(distinct.length>1)return{ok:false,error:'response-conflict'};
    if(!distinct.length)return{ok:false,error:hasDecision?'response-narrative':'response-decision'};
    return{ok:true,answer:distinct[0]};
}
export function parseCommerceResponse(raw,options={}) {
    const result=inspectCommerceResponse(raw,options);return result.ok?result.answer:null;
}

export function commerceAllowedOutcomes(prepared) {
    const {session,action}=prepared;
    if(action==='talk')return['unchanged'];
    if(action==='roleplay')return session.kind==='auction'?['unchanged','joined','open','sold','unsold','left','next']:['unchanged','accept','counter','reject','cancel'];
    if(session.kind!=='auction')return action==='cancel'?['cancel']:['accept','counter','reject'];
    if(action==='join')return['joined'];
    if(action==='next')return['next'];
    if(action==='leave')return session.status==='offered'?['left']:['left','sold','unsold'];
    return['open','sold','unsold'];
}
export function commerceDecisionContract(prepared) {
    const {session,action:playerAction}=prepared;
    const round=session.kind==='auction'&&['bid','wait','leave','roleplay'].includes(playerAction)&&(session.status==='open'||playerAction==='roleplay');
    const roster=round?(playerAction==='roleplay'?session.participants.filter(p=>session.lots[session.index].bidders.includes(p.id)&&!session.lots[session.index].withdrawn.includes(p.id)):requiredCommerceParticipants(session)):[];
    const outcome=commerceAllowedOutcomes(prepared);
    const properties={outcome:{type:'string',enum:outcome}};
    if(session.kind==='auction'&&!roster.length)properties.participants={type:'array',maxItems:0};
    else if(session.kind==='auction')properties.participants={type:'array',items:{type:'object',required:['id','action','reason'],properties:{id:{type:'string',enum:roster.map(p=>p.id)},action:{type:'string',enum:['bid','pass','withdraw']},reason:{type:'string',minLength:1,description:'Short actual motive; required even for pass'},amount:{type:'integer',minimum:1,description:'Only for an NPC bid; choose an actual valid price within their funds'}}}};
    else if(playerAction!=='cancel'&&playerAction!=='talk')properties.amount={type:'integer',minimum:1};
    const decisionSchema={type:'object',required:['outcome',...(round&&playerAction!=='roleplay'?['participants']:[])],properties};
    const schema=playerAction==='roleplay'?decisionSchema:{type:'object',required:['narrative','decision'],properties:{narrative:{type:'string',minLength:1,description:'2–5 brief sentences of natural NPC dialogue/actions'},decision:decisionSchema}};
    return `OUTPUT CONTRACT FOR THIS ACTION (JSON Schema, not a response to copy): ${JSON.stringify(schema)}\nREQUIRED NPC DECISIONS: ${JSON.stringify(roster.map(p=>({id:p.id,name:p.name,remainingBudget:p.budget-p.spent})))}\nCurrent system: ${session.kind}. Player action: ${playerAction}. Allowed outcomes: ${outcome.join(', ')}. For bid decide every listed NPC, including those who pass and the former NPC leader the player just outbid. For wait/leave decide every listed NPC except the current standing NPC leader (they retain their existing bid). On talk use unchanged and no participant decisions; on join/next use joined/next without a bidding round. Never omit one because they did not bid. No narrative-only answer, no empty participants array when the list is nonempty. This is a fresh decision, not a restatement of old history.`;
}
