// A card opts into a bundled catalog. Never infer a universe from a mutable
// display name, NPC name, role or chat text, and never store this globally.
export const ICON_PACKS_FIELD='roleforge_icon_packs';
export const FATE_SERVANT_ICON_PACK='fate-servant-classes';
const fateArchives=new Set(['fate-nasuverse-archive-v3-test']);
const fateCards=new Set(['fate-nasuverse-v3-core','fate-nasuverse-v3-native']);
export function availableIconPacks({declared,archiveId,characterPackId}={}){
    // An explicit empty/invalid declaration disables even a legacy default.
    if(declared!==undefined)return Array.isArray(declared)&&declared.slice(0,16).includes(FATE_SERVANT_ICON_PACK)?[FATE_SERVANT_ICON_PACK]:[];
    return fateArchives.has(archiveId)||fateCards.has(characterPackId)?[FATE_SERVANT_ICON_PACK]:[];
}
