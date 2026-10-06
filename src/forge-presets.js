// Character Forge choices belong to the character card, while drafts belong to chats.
export const FORGE_PRESET_FIELDS = ['origins', 'standings', 'skillCategories', 'masteryRanks', 'pathRanks', 'arsenalTypes', 'alignments'];
export const FORGE_DEFAULTS = Object.freeze({
    origins: ['Central (Human) Continent', 'The Great Forest', 'Great Land of Titan', 'Drinovia', 'North Continent', 'Baluguria'],
    standings: ['Noble', 'Commoner', 'Merchant', 'Outlaw', 'Slave', 'Wanderer'],
    skillCategories: ['Intrinsic Skill', 'Common Skill', 'Extra Skill', 'Unique Skill', 'Ultimate Skill', 'Resistance'],
    masteryRanks: ['Dormant', 'Novice', 'Adept', 'Expert', 'Master', 'Transcendent'],
    pathRanks: ['Rookie', 'Basic', 'Intermediate', 'Ember'],
    arsenalTypes: ['Weapon', 'Armor', 'Construct', 'Divine Construct', 'Tool', 'Relic', 'Other'],
    alignments: ['Good', 'Neutral', 'Evil', 'Villain'],
    rankLabel: 'Adventurer Rank', showRank: true,
});
export function validateForgePreset(raw) {
    if (!raw || !['tretaresia', 'custom'].includes(raw.mode)) throw Error('Invalid Character Forge preset mode');
    const result = { mode: raw.mode, name: typeof raw.name === 'string' ? raw.name.trim().slice(0, 80) || 'Custom' : 'Custom' };
    for (const key of FORGE_PRESET_FIELDS) {
        // New fields are optional in v1 presets; preserve every old choice.
        const values = raw[key] === undefined && ['arsenalTypes', 'alignments'].includes(key) ? FORGE_DEFAULTS[key] : raw[key];
        const max = key === 'arsenalTypes' ? 60 : 100;
        if (!Array.isArray(values) || values.length > 64 || values.some(value => typeof value !== 'string' || !value.trim() || value.length > max))
            throw Error(`Invalid ${key}: use up to 64 nonempty names (${max} characters each)`);
        const names = values.map(value => value.trim());
        if (new Set(names.map(value => value.toLocaleLowerCase())).size !== names.length) throw Error(`Duplicate ${key} names`);
        result[key] = names;
    }
    if (raw.rankLabel !== undefined && (typeof raw.rankLabel !== 'string' || !raw.rankLabel.trim() || raw.rankLabel.length > 100)) throw Error('Invalid rank label');
    if (raw.showRank !== undefined && typeof raw.showRank !== 'boolean') throw Error('Invalid rank visibility');
    result.rankLabel = raw.rankLabel?.trim() || FORGE_DEFAULTS.rankLabel;
    result.showRank = raw.showRank ?? true;
    return result;
}
export function readForgePreset(settings, owner) {
    const raw = owner && settings.roleforgeForgePresets?.[owner];
    const empty = () => ({ mode: 'tretaresia', name: 'Custom', rankLabel: FORGE_DEFAULTS.rankLabel, showRank: true, ...Object.fromEntries(FORGE_PRESET_FIELDS.map(key => [key, []])) });
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
    return preset.mode === 'custom' ? { ...Object.fromEntries(FORGE_PRESET_FIELDS.map(key => [key, preset[key]])), rankLabel: preset.rankLabel || FORGE_DEFAULTS.rankLabel, showRank: preset.showRank !== false } : FORGE_DEFAULTS;
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
