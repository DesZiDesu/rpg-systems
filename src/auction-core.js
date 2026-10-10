import {currencyValues,currencyScheme} from './currency-config.js?v=0.63.0';
import {completeItemDefinition,ITEM_DEFINITION_INSTRUCTIONS} from './item-definition.js?v=0.63.0';
import { interactionEvidence, withInteractionEvidence } from './interaction-evidence.js?v=0.63.0';
import {commercePricePattern} from './commerce-prices.js?v=0.63.0';
// Auction amounts, commitments and settlement are owned by the extension, not AI.
const clean = (value, size = 160) => typeof value === 'string' ? value.trim().slice(0, size) : '';
const key = value => clean(value, 1200).normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu, ' ');
const integer = (value, fallback = 0, min = 0, max = 999999999) => Number.isSafeInteger(Number(value)) && Number(value) >= min && Number(value) <= max ? Number(value) : fallback;
const hash = value => { let n = 2166136261; for (const ch of value) n = Math.imul(n ^ ch.codePointAt(0), 16777619); return (n >>> 0).toString(36); };
const copy = value => structuredClone(value);
const denominations = ['gold','silver','copper'];
const auctionWords = /auction|ประมูล/iu;

export const AUCTION_INSTRUCTIONS = ITEM_DEFINITION_INSTRUCTIONS+'\n'+'Auction UI: when the player actually arrives at an auction venue in the CURRENT scene, include auction in this same invisible patch. Shape: {"id":"stable-event-id-including-story-day","title":"auction name","location":"exact current place","evidence":"exact quote from this reply confirming player arrival at the auction","denomination":"gold|silver|copper","entryFee":0,"deposit":0,"lots":[{"id":"stable-lot-id","name":"item name","description":"publicly revealed details","category":"Equipment","rarity":"known rarity or empty","quantity":1,"openingBid":5,"minIncrement":1,"bidders":[{"name":"present rival bidder","npcId":"known-id-or-empty","maxBid":12}]}]}. Create 1–8 plausible lots and 0–5 present rivals per lot. Fees/deposit are zero unless established in the story. maxBid is a fixed private ceiling consistent with that bidder; never reveal it in narration. Keep event/lot IDs and catalog stable on revisits; a new event needs a new ID. No auction for future plans, mere mentions or OOC discussion. The player joins and bids through the UI. The local engine owns bids, rival counters, three auctioneer counts, winners, fees, deposits, payment and item delivery. NEVER patch auction state or grant/deduct auction money/items, including on a later reply describing the outcome. Auction summaries in state are already committed facts: narrate them without replaying effects. Do not emit HTML/UI. No time limit or automatic auction progress while the player is away.';

export function normalizeAuctionOffer(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const location = clean(raw.location), title = clean(raw.title) || 'Auction House';
    if (!location || !denominations.includes(raw.denomination)) return null;
    const id = clean(raw.id,100) || `auction-${hash(`${key(location)}|${key(title)}|${key(raw.evidence)}`)}`;
    const lots = [], ids = new Set();
    for (const input of Array.isArray(raw.lots) ? raw.lots : []) {
        if (!input || typeof input !== 'object' || !clean(input.name)) continue;
        const lotId = clean(input.id,100) || `lot-${hash(key(input.name))}`;
        if (ids.has(lotId)) continue;
        const openingBid = integer(input.openingBid,0,1), minIncrement = integer(input.minIncrement,0,1);
        if (!openingBid || !minIncrement) continue;
        ids.add(lotId);
        const bidders = [], names = new Set();
        for (const bidder of Array.isArray(input.bidders) ? input.bidders : []) {
            const name = clean(bidder?.name,100), maxBid = integer(bidder?.budget ?? bidder?.maxBid);
            if (!name || names.has(key(name)) || (bidder.budget === undefined && maxBid < openingBid)) continue;
            names.add(key(name)); bidders.push({id:`bidder-${hash(key(name))}`,name,npcId:clean(bidder.npcId,100),maxBid,...(bidder.budget !== undefined ? {budget:maxBid} : {})});
            if (bidders.length === 5) break;
        }
        lots.push({id:lotId,name:clean(input.name,100),description:completeItemDefinition(input).description,usage:completeItemDefinition(input).usage,properties:completeItemDefinition(input).properties,category:clean(input.category,60) || 'Item',
            rarity:completeItemDefinition(input).rarity,quantity:integer(input.quantity,1,1,9999),openingBid,minIncrement,bidders});
        if(input.currentBidder||input.currentBid){
            const leader=bidders.find(b=>b.id===input.currentBidder||b.name===input.currentBidder),price=integer(input.currentBid);
            if(!leader||price<openingBid||price>(leader.budget??leader.maxBid))return null;
            Object.assign(lots.at(-1),{currentBid:price,currentBidder:leader.id});
        }
        if (lots.length === 8) break;
    }
    if (!lots.length) return null;
    return {id,title,location,evidence:clean(raw.evidence,600),denomination:raw.denomination,entryFee:integer(raw.entryFee),deposit:integer(raw.deposit),lots};
}

export function confirmedAuctionOffer(raw, story, user, location, options={}) {
    // An auctioneer can quote a bid without repeating the word "auction".
    // A current explicit auction request supplies that context; the price still
    // needs an exact affirmative quote in this reply, never a future plan.
    const pricing=commercePricePattern(options.currency);
    const contextual=auctionWords.test(String(user||''))&&!/(?:พรุ่งนี้|เมื่อวาน|สมมุติ|ยังไม่|tomorrow|yesterday|hypothetical)/iu.test(String(user||''));
    const subject=contextual?new RegExp(`${auctionWords.source}|${pricing.source}`,'iu'):auctionWords;
    const action=/(?:arriv|enter|reach|stand|sit|walk|approach|join|attend|inspect|browse|display|present|show|มาถึง|เดิน|เข้า|ยืน|นั่ง|ร่วม|ดู|อ่าน|แสดง|เปิด|วาง)/iu;
    const activity=contextual?new RegExp(`${action.source}|${pricing.source}`,'iu'):action;
    const offer = normalizeAuctionOffer(withInteractionEvidence(raw, story, location, subject, activity)), evidence = offer?.evidence;
    if (!offer || !currencyValues(options.currency)[offer.denomination] || key(offer.location) !== key(location)) return null;
    if (!interactionEvidence(evidence, story, user, subject, activity)) return null;
    if(options.currency?.scheme)offer.currencyScheme=currencyScheme(options.currency);
    return offer;
}

export function normalizeAuctions(values) {
    const sessions = new Map();
    for (const raw of Array.isArray(values) ? values : []) {
        const offer = normalizeAuctionOffer(raw);
        if (!offer || !['Joined','Completed','Left'].includes(raw.status) || sessions.has(offer.id)) continue;
        const lots = offer.lots.map((lot,index) => {
            const saved = raw.lots.find(entry => entry?.id === lot.id) || raw.lots[index];
            const highestBidder = saved.highestBidder === 'player' || lot.bidders.some(b => b.id === saved.highestBidder) ? saved.highestBidder : '';
            const price = integer(saved.price);
            return {...lot,status:['Pending','Open','Sold','Unsold'].includes(saved.status) ? saved.status : 'Pending',price,
                highestBidder:price >= lot.openingBid ? highestBidder : '',closingCount:integer(saved.closingCount,0,0,3),round:integer(saved.round),
                history:(Array.isArray(saved.history) ? saved.history : []).filter(h => h && typeof h === 'object').slice(-30)
                    .map(h => ({bidder:clean(h.bidder,100),amount:integer(h.amount),round:integer(h.round)}))};
        });
        sessions.set(offer.id,{...offer,lots,status:raw.status,index:integer(raw.index,0,0,lots.length-1),revision:integer(raw.revision),currencyName:clean(raw.currencyName,100) || 'Coins',joinedAt:clean(raw.joinedAt,60)});
    }
    const all = [...sessions.values()];
    return [...all.filter(s => s.status !== 'Joined').slice(-50),...all.filter(s => s.status === 'Joined')];
}

export function normalizeAuctionReceipts(values) {
    const receipts = new Map();
    for (const raw of Array.isArray(values) ? values : []) {
        if (!raw || typeof raw !== 'object' || !clean(raw.auctionId,100) || !clean(raw.lotId,100)) continue;
        const id = `${clean(raw.auctionId,100)}:${clean(raw.lotId,100)}`;
        receipts.set(id,{id,auctionId:clean(raw.auctionId,100),lotId:clean(raw.lotId,100),winner:clean(raw.winner,100),amount:integer(raw.amount),
            denomination:denominations.includes(raw.denomination) ? raw.denomination : 'gold',itemName:clean(raw.itemName,100),quantity:integer(raw.quantity),savedAt:clean(raw.savedAt,60)});
    }
    // Settlement receipts are never pruned: retiring a catalog must not enable payment again.
    return [...receipts.values()];
}

export function auctionReserved(state) {
    const reserved = {gold:0,silver:0,copper:0};
    for (const session of state.auctions || []) if (session.status === 'Joined') {
        const lot = session.lots[session.index];
        reserved[session.denomination] += session.deposit + (lot?.status === 'Open' && lot.highestBidder === 'player' ? lot.price : 0);
    }
    return reserved;
}
export function auctionAvailable(state) {
    const reserved = auctionReserved(state);
    return Object.fromEntries(denominations.map(d => [d,Math.max(0,(state.progression?.currency?.[d] || 0)-reserved[d])]));
}
export function auctionFundsValid(state, previous = state) {
    const reserved = auctionReserved(state);
    return denominations.every(d => (state.progression?.currency?.[d] || 0) >= reserved[d])
        && (!(previous.auctions || []).some(s => s.status === 'Joined') || state.progression.currency.name === previous.progression.currency.name);
}
export function auctionPublicSummary(state) {
    return (state.auctions || []).slice(-6).map(session => ({id:session.id,title:session.title,location:session.location,status:session.status,
        currency:session.currencyName,denomination:session.denomination,entryFee:session.entryFee,deposit:session.deposit,
        lots:session.lots.map(lot => ({id:lot.id,name:lot.name,status:lot.status,price:lot.price,
            highestBidder:lot.highestBidder === 'player' ? state.player.name : lot.bidders.find(b => b.id === lot.highestBidder)?.name || '',closingCount:lot.closingCount}))}));
}
export function auctionBlocksOperation(operation) {
    if (!Array.isArray(operation)) return false;
    const [,path,value,meta] = operation;
    if (['auctions','auctionReceipts'].includes(path) || /^auctions\./u.test(String(path))) return true;
    if (path !== 'inventory' && !/^progression\.currency\./u.test(String(path))) return false;
    return Boolean(meta?.auctionId || meta?.lotId || auctionWords.test(`${meta?.reason || ''} ${meta?.category || ''} ${meta?.label || ''} ${value?.source || ''}`));
}

export function auctionView(state, offer, {available = true, busy = false, token = ''} = {}) {
    const session = (state.auctions || []).find(s => s.id === offer?.id);
    const source = session || normalizeAuctionOffer(offer);
    if (!source) return null;
    const lot = source.lots[session?.index || 0];
    const leader = lot.highestBidder === 'player' ? state.player.name : lot.bidders.find(b => b.id === lot.highestBidder)?.name || '';
    return {id:source.id,title:source.title,location:source.location,denomination:source.denomination,currencyName:session?.currencyName || state.progression.currency.name,
        entryFee:source.entryFee,deposit:source.deposit,status:session?.status || 'Offered',revision:session?.revision || 0,index:session?.index || 0,total:source.lots.length,
        lots:source.lots.map(l => ({id:l.id,name:l.name,status:l.status || 'Pending',description:l.description,rarity:l.rarity,quantity:l.quantity,openingBid:l.openingBid,minIncrement:l.minIncrement,price:l.price || 0})),
        lot:{id:lot.id,name:lot.name,description:lot.description,rarity:lot.rarity,category:lot.category,quantity:lot.quantity,status:lot.status || 'Pending',
            price:lot.price || 0,openingBid:lot.openingBid,minIncrement:lot.minIncrement,leader,playerLeading:lot.highestBidder === 'player',closingCount:lot.closingCount || 0,
            nextBid:lot.highestBidder ? lot.price+lot.minIncrement : lot.openingBid,history:copy(lot.history || []),bidders:lot.bidders.map(b => b.name)},
        funds:auctionAvailable(state)[source.denomination],reserved:auctionReserved(state)[source.denomination],available,busy,token,
        retired:!session && (state.auctionReceipts || []).some(r => r.auctionId === source.id)};
}

export function applyAuctionAction(state, rawOffer, action, {amount,revision = 0,available = true,now = new Date().toISOString()} = {}) {
    const offer = normalizeAuctionOffer(rawOffer);
    const fail = error => ({ok:false,error,next:state,events:[]});
    if (!offer) return fail('invalid');
    const next = copy(state); next.auctions = normalizeAuctions(next.auctions); next.auctionReceipts = normalizeAuctionReceipts(next.auctionReceipts);
    let session = next.auctions.find(s => s.id === offer.id);
    if ((session?.revision || 0) !== revision) return fail('stale');
    const events = [], d = offer.denomination;
    if (action === 'join') {
        if (!available) return fail('away');
        if (session || next.auctionReceipts.some(r => r.auctionId === offer.id)) return fail('joined');
        if (next.auctions.some(s => s.status === 'Joined')) return fail('active');
        if (auctionAvailable(next)[d] < offer.entryFee+offer.deposit) return fail('funds');
        session = {...offer,status:'Joined',index:0,revision:1,currencyName:next.progression.currency.name,joinedAt:now,
            lots:offer.lots.map((l,i) => ({...l,status:i ? 'Pending' : 'Open',price:0,highestBidder:'',closingCount:0,round:0,history:[]}))};
        next.auctions.push(session);
        next.auctionReceipts.push({id:`${session.id}:@join`,auctionId:session.id,lotId:'@join',winner:'player',amount:offer.entryFee,denomination:d,itemName:'',quantity:0,savedAt:now});
        if (offer.entryFee) { next.progression.currency[d] -= offer.entryFee; events.push({type:'fee',amount:offer.entryFee}); }
        events.push({type:'joined'});
        return {ok:true,next,events};
    }
    if (!session || session.status !== 'Joined') return fail('closed');
    const lot = session.lots[session.index];
    const bid = (bidder,value) => {
        lot.highestBidder = bidder; lot.price = value; lot.closingCount = 0; lot.round++;
        lot.history.push({bidder:bidder === 'player' ? next.player.name : lot.bidders.find(b => b.id === bidder).name,amount:value,round:lot.round});
        lot.history = lot.history.slice(-30);
    };
    const counter = () => {
        const minimum = lot.highestBidder ? lot.price+lot.minIncrement : lot.openingBid;
        const eligible = lot.bidders.filter(b => b.id !== lot.highestBidder && b.maxBid >= minimum);
        if (!eligible.length) return false;
        const rival = eligible[lot.round % eligible.length], wasPlayer = lot.highestBidder === 'player';
        bid(rival.id,minimum); events.push({type:wasPlayer ? 'outbid' : 'rival',name:rival.name,amount:minimum}); return true;
    };
    if (action === 'bid') {
        if (!available) return fail('away');
        if (lot.status !== 'Open' || lot.highestBidder === 'player') return fail('leading');
        const minimum = lot.highestBidder ? lot.price+lot.minIncrement : lot.openingBid;
        const value = integer(amount,0,1);
        if (!value || value < minimum) return fail('amount');
        if (auctionAvailable(next)[session.denomination] < value) return fail('funds');
        bid('player',value); events.push({type:'bid',amount:value}); counter();
    } else if (action === 'wait') {
        if (lot.status !== 'Open') return fail('closed');
        // Away from the venue, existing commitments can be resolved but no new bid is permitted.
        if (!counter()) {
            lot.closingCount++; events.push({type:'count',count:lot.closingCount});
            if (lot.closingCount === 3) {
                const receiptId = `${session.id}:${lot.id}`;
                if (next.auctionReceipts.some(r => r.id === receiptId)) return fail('settled');
                if (lot.highestBidder === 'player') {
                    if (next.progression.currency[session.denomination] < lot.price+session.deposit) return fail('funds');
                    const existing = next.inventory.find(i => key(i.name) === key(lot.name));
                    if (!existing && next.inventory.length >= 200 || existing && existing.quantity+lot.quantity > 99999) return fail('inventory');
                    next.progression.currency[session.denomination] -= lot.price;
                    if (existing) existing.quantity += lot.quantity;
                    else next.inventory.push({id:`auction-item-${hash(`${session.id}:${lot.id}`)}`,name:lot.name,quantity:lot.quantity,category:lot.category,description:[lot.rarity,lot.description].filter(Boolean).join('\n').slice(0,300)});
                    events.push({type:'won',name:lot.name,amount:lot.price,quantity:lot.quantity});
                } else events.push({type:lot.highestBidder ? 'sold' : 'unsold',name:lot.bidders.find(b => b.id === lot.highestBidder)?.name || '',amount:lot.price});
                lot.status = lot.highestBidder ? 'Sold' : 'Unsold';
                next.auctionReceipts.push({id:receiptId,auctionId:session.id,lotId:lot.id,winner:lot.highestBidder,amount:lot.price,denomination:session.denomination,itemName:lot.name,quantity:lot.quantity,savedAt:now});
                if (session.index === session.lots.length-1) { session.status = 'Completed'; events.push({type:'completed'}); }
            }
        }
    } else if (action === 'next') {
        if (!available) return fail('away');
        if (!['Sold','Unsold'].includes(lot.status) || session.index >= session.lots.length-1) return fail('closed');
        session.index++; session.lots[session.index].status = 'Open'; events.push({type:'next'});
    } else if (action === 'leave') {
        if (lot.status === 'Open' && lot.highestBidder === 'player') return fail('committed');
        session.status = 'Left'; events.push({type:'left'});
    } else return fail('invalid');
    session.revision++;
    if (!auctionFundsValid(next,state)) return fail('funds');
    return {ok:true,next,events};
}
