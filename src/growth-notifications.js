const list = value => Array.isArray(value) ? value : [];
const key = value => String(value || '').normalize('NFKC').toLocaleLowerCase().trim();
const match = (a,b) => a?.id && b?.id && a.id === b.id || key(a?.name) === key(b?.name);
const metaFor = (ops,path,entry) => {
    const operation = [...ops].reverse().find(op => op[1] === path && (!entry || match(op[2],entry)));
    return typeof operation?.[3] === 'string' ? {reason:operation[3]} : operation?.[3] || {};
};
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;

// Derive events from the committed before/after state. Repeated upserts and
// clamped/no-op changes never masquerade as new skills or positive training.
export function growthInventoryNotifications(before,after,ops = [],language = 'en',powerDefinitions = []) {
    const events = [], thai = language === 'th';
    for (const path of ['skills','proficiencies.customMagic','proficiencies.customSword','proficiencies.techniques']) {
        const read = state => path.split('.').reduce((value,part) => value?.[part],state);
        for (const entry of list(read(after))) {
            const prior = list(read(before)).find(value => match(value,entry)), meta = metaFor(ops,path,entry);
            if (!prior) events.push({kind:'learning',eyebrow:thai ? 'ได้รับสกิลใหม่' : 'NEW SKILL',title:entry.name,
                detail:meta.reason || (thai ? 'บันทึกสกิลที่เรียนรู้แล้ว' : 'Added to your skill archive.'),value:entry.rank || ''});
            else {
                const increase = number(entry.proficiency) - number(prior.proficiency);
                const rank = entry.rank && entry.rank !== prior.rank;
                if (increase > 0 || rank) events.push({kind:'training',eyebrow:thai ? 'สกิลพัฒนา' : 'SKILL PROGRESS',title:entry.name,
                    detail:meta.reason || (rank ? `${prior.rank || '—'} → ${entry.rank}` : thai ? 'ความชำนาญเพิ่มขึ้น' : 'Proficiency increased.'),
                    value:increase > 0 ? `+${increase}%` : entry.rank});
            }
        }
    }
    for (const group of ['magic','sword']) for (const [id,value] of Object.entries(after.proficiencies?.[group] || {})) {
        const delta = number(value) - number(before.proficiencies?.[group]?.[id]);
        if (delta <= 0) continue;
        const meta = metaFor(ops,`proficiencies.${group}.${id}`);
        events.push({kind:'training',eyebrow:thai ? 'ความชำนาญเพิ่มขึ้น' : 'TRAINING',title:meta.label || id,
            detail:meta.reason || `${number(before.proficiencies?.[group]?.[id])}% → ${number(value)}%`,value:`+${delta}%`});
    }
    for (const path of ['player.aura.control','player.aura.efficiency','player.aura.recovery','player.fitness.lungCapacity','player.fitness.aerobicSessions']) {
        const read = state => number(path.split('.').reduce((value,part) => value?.[part],state));
        const delta = read(after)-read(before), meta = metaFor(ops,path);
        const names = thai ? {control:'ควบคุมออร่า',efficiency:'ประสิทธิภาพออร่า',recovery:'ฟื้นฟูออร่า',lungCapacity:'ความจุปอด',aerobicSessions:'การฝึกแอโรบิก'}
            : {control:'Aura control',efficiency:'Aura efficiency',recovery:'Aura recovery',lungCapacity:'Lung capacity',aerobicSessions:'Aerobic training'};
        if (delta > 0 && (meta.category === 'training' || path.startsWith('player.fitness.'))) events.push({kind:'training',eyebrow:thai ? 'การฝึก' : 'TRAINING',title:meta.label || names[path.split('.').at(-1)],detail:meta.reason || '',value:`+${delta}`});
    }
    for (const definition of powerDefinitions) {
        if (!['rank','number'].includes(definition.type)) continue;
        const old = number(before.customPowers?.[definition.id] ?? definition.initial), next = number(after.customPowers?.[definition.id] ?? definition.initial);
        const meta = metaFor(ops,`customPowers.${definition.id}`);
        if (next <= old || definition.type === 'number' && meta.category !== 'training') continue;
        events.push({kind:'training',eyebrow:thai ? 'พลังพัฒนา' : 'POWER PROGRESS',title:definition.name,
            detail:meta.reason || (definition.type === 'rank' ? `${definition.ranks[old]} → ${definition.ranks[next]}` : `${old} → ${next}`),
            value:definition.type === 'rank' ? definition.ranks[next] : `+${next-old}`});
    }
    const seen = new Set();
    for (const entry of [...list(after.inventory),...list(before.inventory)]) {
        const identity = entry.id || key(entry.name); if (seen.has(identity)) continue; seen.add(identity);
        const old = list(before.inventory).find(value => match(value,entry)), next = list(after.inventory).find(value => match(value,entry));
        const delta = number(next?.quantity)-number(old?.quantity); if (!delta) continue;
        const meta = metaFor(ops,'inventory',entry), purchase = delta > 0 && ['purchase','buy','shopping'].includes(key(meta.category));
        events.push({kind:purchase ? 'purchase' : 'inventory',eyebrow:purchase ? thai ? 'ซื้อของสำเร็จ' : 'PURCHASE'
            : delta > 0 ? thai ? 'ได้รับไอเทม' : 'ITEM RECEIVED' : thai ? 'ไอเทมออก' : 'ITEM REMOVED',title:next?.name || old?.name,
            detail:meta.reason || (thai ? `คงเหลือ ${number(next?.quantity)}` : `Remaining: ${number(next?.quantity)}`),value:`${delta > 0 ? '+' : ''}${delta}`});
    }
    return events;
}
