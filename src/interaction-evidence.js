// Validate the completed interaction, including a stationary player. Conditions
// about price/eligibility in a different sentence do not negate an actual visit.
export const evidenceText = value => String(value ?? '').replace(/<[^>]*>/gu, ' ').normalize('NFKC').replace(/\s+/gu, ' ').trim();
export function interactionEvidence(evidence, story, user, subject, action) {
    if (/^\s*(?:\(?OOC\b|\[OOC\b)/iu.test(String(user ?? ''))) return false;
    const quote = evidenceText(evidence), visible = evidenceText(story);
    if (quote.length < 8 || !visible.includes(quote)) return false;
    const sentences = String(evidence ?? '').replace(/<[^>]*>/gu, ' ').split(/[.!?。\n]+/u).map(evidenceText).filter(Boolean);
    const negative = /(?:not yet|haven['’]?t|hasn['’]?t|have not|has not|did not|does not|do not|don['’]?t|didn['’]?t|cannot|can['’]?t|never|\bwill\b|tomorrow|plan(?:s|ning)? to|might|would|if you|ยังไม่ได้|ไม่ได้|ไม่เคย|พรุ่งนี้|ตั้งใจจะ|วางแผนจะ|อาจจะ|ถ้า|หาก)/iu;
    return sentences.some(sentence => subject.test(sentence) && action.test(sentence) && !negative.test(sentence));
}

export function withInteractionEvidence(raw, story, location, subject, action) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
    const result = {...raw, location: raw.location || location};
    if (raw.evidence) return result; // Incorrect supplied evidence is never replaced.
    const quote = String(story ?? '').replace(/<[^>]*>/gu, ' ').split(/[.!?。\n]+/u)
        .map(value => value.trim()).find(value => value.length <= 600 && interactionEvidence(value, story, '', subject, action));
    return {...result, evidence: quote || ''};
}

export function namedInteraction(name, evidence, story) {
    const canonical = evidenceText(name).toLocaleLowerCase();
    if (!canonical) return false;
    if (evidenceText(evidence).toLocaleLowerCase().includes(canonical)) return true;
    // RoleForge dialogue/header markup identifies a speaker outside their quote.
    // Another NPC elsewhere in the reply cannot supply that identity.
    const source = String(story ?? '');
    const headers = [...source.matchAll(/<tr-(?:header|dialogue)\b[^>]*\bname=["']([^"']+)["'][^>]*>/giu)];
    return headers.some((header,index) => evidenceText(header[1]).toLocaleLowerCase() === canonical
        && evidenceText(source.slice(header.index + header[0].length, headers[index+1]?.index))
            .includes(evidenceText(evidence)));
}
