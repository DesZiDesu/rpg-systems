// Character Forge choices belong to the character card, while drafts belong to chats.
export const FORGE_PRESET_FIELDS = ['origins', 'standings', 'skillCategories', 'masteryRanks', 'pathRanks'];
export const FORGE_DEFAULTS = Object.freeze({
    origins: ['Central (Human) Continent', 'The Great Forest', 'Great Land of Titan', 'Drinovia', 'North Continent', 'Baluguria'],
    standings: ['Noble', 'Commoner', 'Merchant', 'Outlaw', 'Slave', 'Wanderer'],
    skillCategories: ['Intrinsic Skill', 'Common Skill', 'Extra Skill', 'Unique Skill', 'Ultimate Skill', 'Resistance'],
    masteryRanks: ['Dormant', 'Novice', 'Adept', 'Expert', 'Master', 'Transcendent'],
    pathRanks: ['Rookie', 'Basic', 'Intermediate', 'Ember'],
});
export function validateForgePreset(raw) {
    if (!raw || !['tretaresia', 'custom'].includes(raw.mode)) throw Error('Invalid Character Forge preset mode');
    const result = { mode: raw.mode, name: typeof raw.name === 'string' ? raw.name.trim().slice(0, 80) || 'Custom' : 'Custom' };
    for (const key of FORGE_PRESET_FIELDS) {
        const values = raw[key];
        if (!Array.isArray(values) || values.length > 64 || values.some(value => typeof value !== 'string' || !value.trim() || value.length > 100))
            throw Error(`Invalid ${key}: use up to 64 nonempty names (100 characters each)`);
        const names = values.map(value => value.trim());
        if (new Set(names.map(value => value.toLocaleLowerCase())).size !== names.length) throw Error(`Duplicate ${key} names`);
        result[key] = names;
    }
    return result;
}
export function readForgePreset(settings, owner) {
    const raw = owner && settings.roleforgeForgePresets?.[owner];
    const empty = () => ({ mode: 'tretaresia', name: 'Custom', ...Object.fromEntries(FORGE_PRESET_FIELDS.map(key => [key, []])) });
    try { return raw ? validateForgePreset(raw) : empty(); }
    catch { return empty(); }
}
export function writeForgePreset(settings, preset, expectedOwner, currentOwner) {
    if (!currentOwner || expectedOwner !== currentOwner) throw Error('Character card or chat changed. Reopen Character Forge presets.');
    const next = validateForgePreset(preset);
    settings.roleforgeForgePresets ||= {};
    Object.defineProperty(settings.roleforgeForgePresets, currentOwner, { value: next, enumerable: true, writable: true, configurable: true });
    return next;
}
export function activeForgeChoices(preset) {
    return preset.mode === 'custom' ? Object.fromEntries(FORGE_PRESET_FIELDS.map(key => [key, preset[key]])) : FORGE_DEFAULTS;
}
export function exportForgePreset(preset) {
    return JSON.stringify({ format: 'roleforge-character-forge-preset', version: 1, preset: validateForgePreset(preset) }, null, 2);
}
export function importForgePreset(source) {
    if (typeof source !== 'string' || new TextEncoder().encode(source).length > 1024 * 1024) throw Error('Preset file must be at most 1 MB');
    let data; try { data = JSON.parse(source.replace(/^\uFEFF/, '')); } catch { throw Error('Invalid JSON'); }
    if (data?.format !== 'roleforge-character-forge-preset' || data.version !== 1) throw Error('Unsupported Character Forge preset file');
    return validateForgePreset(data.preset);
}
