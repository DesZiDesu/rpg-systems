import {validatePresetConfig} from './world-presets.js?v=0.89.3';

// User choices survive chat deletion. Story state and preset-library records
// never enter these maps. Avatar-based owners are supplied by characterOwner.
export const CHARACTER_PRESETS = 'roleforgeCharacterPresets';
export const CHARACTER_PREFERENCES = 'roleforgeCharacterPreferences';
const safeOwner = owner => typeof owner === 'string' && owner.length > 0 && owner.length <= 1000 && !['__proto__','constructor','prototype'].includes(owner);
const cache = new WeakMap();
const copy = value => structuredClone(value);
export function characterPreset(settings, owner) {
    if (!safeOwner(owner)) return {};
    const raw = settings?.[CHARACTER_PRESETS]?.[owner];
    if (!raw || typeof raw !== 'object') return {};
    if(cache.has(raw))return cache.get(raw);
    try { const value=validatePresetConfig(raw);cache.set(raw,value);return value; } catch { return {}; }
}
export function saveCharacterPreset(settings, owner, changes) {
    if (!safeOwner(owner)) return false;
    const next = validatePresetConfig({...characterPreset(settings, owner), ...validatePresetConfig(changes)});
    settings[CHARACTER_PRESETS] = {...settings[CHARACTER_PRESETS], [owner]:copy(next)};
    return true;
}
export function characterPreference(settings, owner, key, fallback) {
    if (!safeOwner(owner)) return fallback;
    const row = settings?.[CHARACTER_PREFERENCES]?.[owner];
    return row && Object.hasOwn(row, key) ? row[key] : fallback;
}
export function saveCharacterPreference(settings, owner, key, value) {
    if (!safeOwner(owner) || ['__proto__','constructor','prototype'].includes(key)) return false;
    settings[CHARACTER_PREFERENCES] = {...settings[CHARACTER_PREFERENCES], [owner]:{...settings[CHARACTER_PREFERENCES]?.[owner], [key]:copy(value)}};
    return true;
}
