// Request hints only guide the normal reply. The final AI intent and an actual
// present, validated NPC offer decide whether commerce opens; keywords do not.
const visible=value=>String(value??'').replace(/<[^>]*>/gu,' ').normalize('NFKC').replace(/\s+/gu,' ').trim();
const ooc=/^\s*(?:\(?OOC\b|\[OOC\b)/iu;
const discussion=/(?:คำว่า|พูดถึง|พูดเรื่อง|คุยเรื่อง|เล่าเรื่อง|ระบบ(?:ซื้อ|ขาย)|\b(?:word|discuss|talk about|talking about|system|mechanic)\b)/iu;
const deferred=/(?:พรุ่งนี้|เมื่อวาน|สมมุติ|สมมติ|ถ้าหาก|\b(?:tomorrow|yesterday|hypothetical|suppose|if)\b)/iu;
const refusal=/(?:ยังไม่|ไม่(?:ได้|อยาก|ต้องการ|คิด|สนใจ|ตั้งใจ)?(?:จะ)?\s*(?:ซื้อ|ขาย|เช่า|จ้าง|จอง)|\b(?:not yet|never|don['’]?t|do not|did not|won['’]?t|would not|not (?:buying|selling|interested))\b)/iu;
export function commerceRequestHint(user){
    const text=String(user??'').replace(/<[^>]*>/gu,' ');if(ooc.test(text))return '';
    for(const clause of text.split(/[.!?。\n]+|\bbut\b|แต่(?:ว่า)?/iu)){
        if(discussion.test(clause)||refusal.test(clause)||deferred.test(clause))continue;
        if(/(?:ขอ|อยาก|ต้องการ|จะ|พร้อมที่จะ)\s*ขาย|ฉัน\s*(?:ขอ|จะ|อยาก)?\s*ขาย|^\s*["“]?ขาย|\b(?:I (?:want to |would like to |will |offer to )?sell|sell(?:ing)?\s+(?:my|this|these|the)|please buy my)\b|^\s*sell\s*$/iu.test(clause))return 'sell';
        if(/(?:ขอ|อยาก|ต้องการ|จะ|พร้อมที่จะ)\s*(?:ซื้อ|เช่า|จอง|จ้าง)|ฉัน\s*(?:ขอ|จะ|อยาก)?\s*(?:ซื้อ|เช่า|จอง|จ้าง)|^\s*["“]?(?:ซื้อ|เช่า|จอง|จ้าง)|(?:ขอ|หา)\s*(?:ห้อง|ที่พัก)|(?:ขอ|ยืน|เดิน|แวะ|เข้า|ไป|เปิด)?\s*(?:ดู|อ่าน|เลือก|ถาม|ต่อรอง)[^\n.!?]{0,40}(?:สินค้า|ของ|ร้าน|ราคา|ค่าห้อง|ห้องพัก)|(?:เดิน|แวะ|เข้า|ไปหา)[^\n.!?]{0,30}(?:ร้าน|พ่อค้า|แม่ค้า)|(?:ราคา|ค่าห้อง|ห้อง|ที่พัก)[^\n.!?]{0,45}(?:เท่าไหร่|เท่าไร|กี่)|\b(?:buy|rent|hire|book|browse|show|visit|haggle|how much|room rates?|room prices?)\b|ต่อรองราคา/iu.test(clause))return 'buy';
    }
    return '';
}
export function commerceDiscussionOnly(user){
    const text=String(user??'');return ooc.test(text)||!commerceRequestHint(text)&&(discussion.test(text)||refusal.test(text)||deferred.test(text));
}
export function confirmedCommerceIntent(raw,user){
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||!['buy','sell','none'].includes(raw.kind))return null;
    const evidence=visible(raw.evidence),text=visible(user);
    if(evidence.length<2||evidence.length>600||!text.includes(evidence))return null;
    if(raw.kind!=='none'&&commerceDiscussionOnly(evidence))return null;
    return{kind:raw.kind,evidence};
}
export const COMMERCE_INTENT_INSTRUCTIONS='COMMERCE INTENT — Read the WHOLE latest player role-play and its context in this SAME normal generation, before choosing a system. Merely saying buy/sell, quoting those words, talking about prices or trade in general, a past transaction, refusal, hypothetical plan or future intention is NOT a current transaction. Do not invent a merchant/catalog or force a purchase from those words. A genuine current request to see goods, ask an NPC for the price/availability of a specific product or service, rent a room, offer owned items for sale or negotiate DOES request an offer, even before the player commits to payment. When commerce vocabulary is relevant, include top-level commerceIntent:{kind:"buy"|"sell"|"none",evidence:"exact short quote from the latest USER message"} in the final patch. kind describes the player\'s actual current intent, not an imagined NPC decision; none keeps commerce closed. For buy/sell also include marketplace ONLY if THIS reply actually establishes the present named NPC\'s priced offer, with all public entries and typed terms. If unavailable/refused, give the story reply without a marketplace. Never make a separate API call to classify intent. With an existing commerce session, mere conversation uses commerce.action="talk" and outcome="unchanged"; only explicit authorized actions may transact.';
