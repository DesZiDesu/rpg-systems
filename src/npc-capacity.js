import {uiText} from './ui-language.js?v=0.81.1';

// Storage capacity is user-owned and independent of enabled state/AI context.
// Zero means unlimited. Changing a limit never truncates an existing archive.
export const NPC_DEFAULT_ENTRY_LIMIT = 0;
export function npcEntryLimit(options={}) {
    return Number.isSafeInteger(options?.entryLimit)&&options.entryLimit>=0?options.entryLimit:NPC_DEFAULT_ENTRY_LIMIT;
}
export function validateNpcOptions(raw) {
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.entryLimit!==undefined&&(!Number.isSafeInteger(raw.entryLimit)||raw.entryLimit<0))
        throw Error(uiText('Character limit must be a whole number from 0 upwards. 0 means unlimited.'));
    return {entryLimit:npcEntryLimit(raw)};
}
export function hasNpcCapacity(count,options={}) {
    const limit=npcEntryLimit(options);return !limit||count<limit;
}
export function assertNpcCapacity(count,options={},previousCount=0) {
    const limit=npcEntryLimit(options);
    if(limit&&count>limit&&count>previousCount)
        throw Error(uiText('Characters are limited to {0} per library. Change the limit in Character Management.',[limit.toLocaleString()]));
}
