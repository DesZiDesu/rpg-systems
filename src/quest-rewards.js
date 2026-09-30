// Persist payment identity independently of prose, amount and the visible quest archive.
const clean = (value, limit = 180) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const key = value => clean(value).normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu, ' ');
const rewardCategory = /^(?:quest-reward|mission-reward)$/iu;
const rewardWords = /\b(?:reward|payout|payment|compensation|share)\b|รางวัล|ค่าตอบแทน|ส่วนแบ่ง/iu;
const questWords = /\b(?:quest|mission|contract)\b|เควสต์|เควส|ภารกิจ/iu;
const stopWords = new Set('a an the of for from to in and your my our quest mission contract reward rewards payment payout share fair urgent'.split(' '));

function mentionsQuest(reason, name) {
    const prose = key(reason), title = key(name);
    if (!title || !prose) return false;
    if (title.length >= 4 && prose.includes(title)) return true;
    const words = title.match(/[\p{L}\p{N}]+/gu) || [];
    const terms = [...new Set(words.filter(word => word.length >= 3 && !stopWords.has(word)))];
    return terms.length >= 2 && terms.filter(term => {
        if (/^[a-z0-9]+$/iu.test(term)) return (prose.match(/[\p{L}\p{N}]+/gu) || []).includes(term);
        return prose.includes(term);
    }).length >= Math.max(2, Math.ceil(terms.length * .5));
}

export function normalizeQuestRewardReceipts(values, quests = []) {
    const receipts = new Map();
    const claimedQuests = (Array.isArray(quests) ? quests : []).filter(quest => quest && typeof quest === 'object' && quest.rewardClaimed);
    for (const value of [...(Array.isArray(values) ? values : []), ...claimedQuests]) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
        const questId = clean(value.questId || value.id, 100), name = clean(value.name, 120);
        if (!questId || !name) continue;
        const existing = receipts.get(questId);
        receipts.set(questId, {questId, name, at: clean(value.at || value.rewardClaimedAt || value.completedAt, 60),
            aliases: [...new Set([...(existing?.aliases || []), ...(Array.isArray(value.aliases) ? value.aliases : []), existing?.name, name]
                .map(alias => clean(alias, 120)).filter(Boolean))]});
    }
    return [...receipts.values()];
}

function positiveReward(state, operation) {
    const [verb, path, value] = operation;
    if (!['inc', 'set', 'upsert'].includes(verb)) return false;
    if (/^progression\.currency\.(?:gold|silver|copper)$/u.test(path)
        || ['progression.experience', 'progression.reputation', 'player.level'].includes(path)) {
        if (!Number.isFinite(Number(value))) return false;
        const before = path.split('.').reduce((object, field) => object?.[field], state) || 0;
        return verb === 'inc' ? Number(value) > 0 : verb === 'set' && Number(value) > Number(before);
    }
    if (path === 'inventory') {
        if (verb === 'inc') return Number(value?.quantity ?? value?.amount ?? value?.delta) > 0;
        const previous = (state.inventory || []).find(item => item.id === value?.id || key(item.name) === key(value?.name));
        return verb === 'upsert' && Number(value?.quantity ?? 1) > Number(previous?.quantity || 0);
    }
    if (verb === 'upsert' && ['skills', 'proficiencies.customMagic', 'proficiencies.customSword', 'proficiencies.techniques'].includes(path)) return true;
    return verb === 'set' && ['progression.adventurerRank', 'progression.customRankName', 'progression.magicRank', 'progression.swordRank'].includes(path)
        && clean(value) && value !== path.split('.').reduce((object, field) => object?.[field], state);
}

export function questRewardGuard(state, operations) {
    const records = [];
    const quests = (Array.isArray(state.quests) ? state.quests : []).filter(quest => quest && typeof quest === 'object');
    const receipts = normalizeQuestRewardReceipts(state.questRewardReceipts, quests);
    const add = (value, claimed = false) => {
        if (!clean(value?.name) || !clean(value?.id || value?.questId)) return null;
        const id = clean(value.id || value.questId, 100), name = clean(value.name, 120);
        let record = records.find(record => record.ids.has(id) || record.names.has(key(name)));
        if (!record) {record = {id, name, ids: new Set(), names: new Set(), claimed: false}; records.push(record);}
        record.ids.add(id); record.names.add(key(name));
        for (const alias of Array.isArray(value.aliases) ? value.aliases : []) if (clean(alias)) record.names.add(key(alias));
        record.claimed ||= claimed;
        return record;
    };
    for (const receipt of receipts) add(receipt, true);
    for (const quest of quests) add(quest, Boolean(quest.rewardClaimed));
    const completions = new Set();
    for (const [verb, path, value] of operations) if (verb === 'upsert' && path === 'quests') {
        const record = add(value);
        if (record && value.status === 'Completed') completions.add(record);
    }
    const paid = new Map(), components = new Set();
    return {
        inspect(operation, candidate = state) {
            if (!positiveReward(candidate, operation)) return {blocked: false};
            const meta = operation[3] && typeof operation[3] === 'object' ? operation[3] : {reason: operation[3]};
            const questId = clean(meta.questId || meta.missionId, 100), reason = clean(meta.reason || meta.label, 300);
            const category = clean(meta.category, 40);
            const definite = Boolean(questId || rewardCategory.test(category) || rewardWords.test(reason) && questWords.test(reason));
            if (!definite && !/^reward$/iu.test(category) && !rewardWords.test(reason)) return {blocked: false};
            let matches = questId ? records.filter(record => record.ids.has(questId))
                : records.filter(record => [...record.names].some(name => mentionsQuest(reason, name)));
            if (!matches.length && !questId && definite && completions.size === 1) matches = [...completions];
            if (matches.length !== 1) return {blocked: definite}; // A quest payout must name one identifiable quest.
            const record = matches[0];
            const component = `${record.id}:${operation[1]}:${clean(operation[2]?.id || operation[2]?.name).toLocaleLowerCase()}`;
            return {blocked: record.claimed || components.has(component), record, component};
        },
        accept(result) {
            if (!result.record) return;
            components.add(result.component); paid.set(result.record.id, result.record);
        },
        finish(candidate) {
            candidate.questRewardReceipts = normalizeQuestRewardReceipts([
                ...receipts, ...[...paid.values()].map(record => ({
                    questId: record.id, name: record.name, aliases: [...record.names], at: new Date().toISOString(),
                })),
            ], quests);
            for (const quest of candidate.quests || []) {
                const receipt = candidate.questRewardReceipts.find(receipt => receipt.questId === quest.id
                    || [receipt.name, ...(receipt.aliases || [])].some(name => key(name) === key(quest.name)));
                if (receipt) {quest.rewardClaimed = true; quest.rewardClaimedAt ||= receipt.at;}
            }
        },
    };
}
