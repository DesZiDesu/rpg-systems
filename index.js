/* global SillyTavern, toastr */

const EXTENSION_FOLDER = 'third-party/rpg-systems';
const SETTINGS_KEY = 'tretaresia_rpg';
const METADATA_KEY = 'tretaresia_rpg_state';
const TURN_HISTORY_KEY = 'tretaresia_rpg_turn_history';
const PROMPT_KEY = 'tretaresia_rpg_roleplay_state';
const ACTION_PROMPT_KEY = 'tretaresia_rpg_hidden_action';
const STATE_PACKAGE_FORMAT = 'tretaresia-rpg-state';
const CONTINUITY_STORAGE_PREFIX = 'tretaresia-rpg:continuity:';
const SUMMARY_NEW_CHAT_MENU_ID = 'st_new_chat_with_summary_wand_button';
const TURN_RECONCILE_VERSION = 3;
const PATCH_COMMENT_PATTERN = /<!--\s*tretaresia_patch\s*:\s*([\s\S]*?)\s*-->/gi;
const PATCH_TAG_PATTERN = /<tretaresia_patch>\s*([\s\S]*?)\s*<\/tretaresia_patch>/gi;
const PATCH_BRACKET_PATTERN = /\[\[?\s*tretaresia[_ -]?patch\s*\]?\]\s*([\s\S]*?)\s*\[\[?\s*\/\s*tretaresia[_ -]?patch\s*\]?\]/gi;
const PATCH_FENCE_PATTERN = /```(?:tretaresia[_ -]?patch|json\s+tretaresia[_ -]?patch)\s*([\s\S]*?)```/gi;
const RANKS = ['Rookie', 'Basic', 'Intermediate', 'Ember', 'Custom Rank'];
const MASTERY = ['Dormant', 'Initiate', 'Practiced', 'Adept', 'Expert', 'Master', 'Grandmaster', 'Mythic'];
const DUNGEON_RANKS = ['Unranked', 'E-', 'E', 'E+', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+', 'S-', 'S', 'S+', 'SS'];
const GUILD_CREATION_FEE = Object.freeze({ gold: 10, silver: 0, copper: 0 });
const HOUSEHOLD_ROLES = ['Partner', 'Spouse', 'Child', 'Mother', 'Father', 'Sibling', 'Relative', 'Guardian', 'Other'];
const QUEST_TYPES = ['Story', 'Side-Story', 'Mission', 'Quest', 'Dungeon', 'Contract', 'Personal'];
const QUEST_SECTIONS = Object.freeze([
    { id: 'story', label: 'STORY' },
    { id: 'side-story', label: 'SIDE-STORY' },
    { id: 'active', label: 'ACTIVE MISSION' },
    { id: 'completed', label: 'COMPLETED MISSION' },
    { id: 'failed', label: 'FAILED MISSION' },
]);
const HOSTILE_NPC_TERMS = new Set(['hostile', 'enemy', 'enemies', 'foe', 'foes', 'opponent', 'opponents', 'antagonist', 'antagonists', 'aggressor', 'aggressors', 'villain', 'villains', 'threat', 'threatening', 'hostile npc', 'enemy npc', 'dangerous enemy']);
const MAGIC_DISCIPLINES = [
    { id: 'falseMagic', name: 'False Magic', icon: 'fa-solid fa-wand-sparkles', tone: '#789ac7' },
    { id: 'trueMagic', name: 'True Magic', icon: 'fa-solid fa-hand-sparkles', tone: '#d8bb72' },
    { id: 'aura', name: 'Aura', icon: 'fa-solid fa-fire-flame-curved', tone: '#bc7655' },
    { id: 'formlessAura', name: 'Formless Aura', icon: 'fa-solid fa-circle-notch', tone: '#a38ccc' },
    { id: 'bloodAura', name: 'Blood Aura', icon: 'fa-solid fa-droplet', tone: '#b34f5b' },
    { id: 'sageMana', name: 'Sage Mana', icon: 'fa-solid fa-leaf', tone: '#69a574' },
    { id: 'divineMana', name: 'Divine Mana', icon: 'fa-solid fa-sun', tone: '#e2cd7b' },
    { id: 'construct', name: 'Construct', icon: 'fa-solid fa-hammer', tone: '#9d8d74' },
    { id: 'divineConstruct', name: 'Divine Construct', icon: 'fa-solid fa-gem', tone: '#d5a7d0' },
];
const SWORD_STYLES = [
    { id: 'swordplay', name: 'Swordplay', icon: 'fa-solid fa-khanda', tone: '#c4ad79' },
    { id: 'martialArts', name: 'Martial Arts', icon: 'fa-solid fa-hand-fist', tone: '#bd765d' },
    { id: 'rangedCombat', name: 'Ranged Combat', icon: 'fa-solid fa-bullseye', tone: '#73a89b' },
];
const PROFICIENCY_ICON_PRESETS = [
    { key: 'arcane', label: 'Arcane', icon: 'fa-solid fa-wand-sparkles', tone: '#a88bd4', words: 'arcane magic mana spell mystic' },
    { key: 'gravity', label: 'Gravity', icon: 'fa-solid fa-circle-dot', tone: '#9b78cf', words: 'gravity weight attraction repel force' },
    { key: 'fire', label: 'Fire', icon: 'fa-solid fa-fire', tone: '#d86b43', words: 'fire flame heat blaze combustion' },
    { key: 'water', label: 'Water', icon: 'fa-solid fa-droplet', tone: '#4f9fd8', words: 'water aqua ocean river tide' },
    { key: 'ice', label: 'Ice', icon: 'fa-solid fa-snowflake', tone: '#89c9e8', words: 'ice frost snow cold blizzard' },
    { key: 'earth', label: 'Earth', icon: 'fa-solid fa-mountain', tone: '#a47b4e', words: 'earth stone rock sand ground' },
    { key: 'wind', label: 'Wind', icon: 'fa-solid fa-wind', tone: '#79b6a2', words: 'wind air gale storm breeze' },
    { key: 'lightning', label: 'Lightning', icon: 'fa-solid fa-bolt', tone: '#d9bd55', words: 'lightning thunder electric shock voltage' },
    { key: 'light', label: 'Light', icon: 'fa-solid fa-sun', tone: '#e0c873', words: 'light holy divine radiant exorcism' },
    { key: 'shadow', label: 'Shadow', icon: 'fa-solid fa-moon', tone: '#7774a8', words: 'shadow dark darkness night moon' },
    { key: 'healing', label: 'Healing', icon: 'fa-solid fa-hand-holding-heart', tone: '#72bd83', words: 'heal healing recovery restoration regeneration' },
    { key: 'poison', label: 'Poison', icon: 'fa-solid fa-flask', tone: '#829e62', words: 'poison toxin venom acid detox alchemy' },
    { key: 'barrier', label: 'Barrier', icon: 'fa-solid fa-shield-halved', tone: '#7194c6', words: 'barrier shield ward protection defense' },
    { key: 'summoning', label: 'Summoning', icon: 'fa-solid fa-draw-polygon', tone: '#b579b2', words: 'summon summoning familiar spirit contract' },
    { key: 'space', label: 'Space', icon: 'fa-solid fa-expand', tone: '#668eb8', words: 'space spatial dimension portal teleport' },
    { key: 'time', label: 'Time', icon: 'fa-solid fa-clock', tone: '#be9f68', words: 'time temporal clock age slow haste' },
    { key: 'sound', label: 'Sound', icon: 'fa-solid fa-volume-high', tone: '#b5789c', words: 'sound sonic voice music vibration' },
    { key: 'illusion', label: 'Illusion', icon: 'fa-solid fa-masks-theater', tone: '#bd7fb4', words: 'illusion mirage dream mind hypnosis' },
    { key: 'death', label: 'Death', icon: 'fa-solid fa-skull', tone: '#7d8278', words: 'death necromancy undead soul curse' },
    { key: 'nature', label: 'Nature', icon: 'fa-solid fa-seedling', tone: '#67a56b', words: 'nature plant wood flower forest' },
    { key: 'blood', label: 'Blood', icon: 'fa-solid fa-droplet', tone: '#ad4f57', words: 'blood crimson vampire life' },
    { key: 'beast', label: 'Beast', icon: 'fa-solid fa-paw', tone: '#a47d62', words: 'beast animal fang claw wild' },
    { key: 'sword', label: 'Sword', icon: 'fa-solid fa-khanda', tone: '#b9a57d', words: 'sword blade fencing kenjutsu style school' },
    { key: 'power', label: 'Power', icon: 'fa-solid fa-hand-fist', tone: '#c0785b', words: 'power strength heavy crushing force' },
    { key: 'speed', label: 'Speed', icon: 'fa-solid fa-person-running', tone: '#68aeb0', words: 'speed swift quick flash movement' },
    { key: 'precision', label: 'Precision', icon: 'fa-solid fa-bullseye', tone: '#c09067', words: 'precision accurate aim focus thrust' },
    { key: 'counter', label: 'Counter', icon: 'fa-solid fa-rotate', tone: '#6e9aaa', words: 'counter parry redirect flowing reactive' },
    { key: 'defense', label: 'Defense', icon: 'fa-solid fa-shield', tone: '#748ba6', words: 'defense defensive guard fortress stance' },
    { key: 'dual', label: 'Dual Wield', icon: 'fa-solid fa-arrows-left-right', tone: '#a081bd', words: 'dual twin paired double two' },
    { key: 'compass', label: 'Tactical', icon: 'fa-solid fa-compass', tone: '#a98763', words: 'north tactical adaptable trick unorthodox' },
    { key: 'dragon', label: 'Dragon', icon: 'fa-solid fa-dragon', tone: '#b26355', words: 'dragon draconic wyrm emperor' },
    { key: 'star', label: 'Celestial', icon: 'fa-solid fa-star', tone: '#d0b86f', words: 'star celestial cosmic heaven' },
];
const NPC_CORE_STATS = [
    { id: 'strength', name: 'Strength' }, { id: 'agility', name: 'Agility' },
    { id: 'intelligence', name: 'Intelligence' }, { id: 'endurance', name: 'Endurance' },
];
const COMBAT_DIMENSIONS = Object.freeze([
    ['physicalPower', 'Physical Power'], ['speed', 'Speed'], ['durability', 'Durability'],
    ['manaCapacity', 'Mana Capacity'], ['manaControl', 'Mana Control'], ['mastery', 'Skill / Mastery'],
    ['experience', 'Combat Experience'], ['condition', 'Current Condition'],
]);
const PARTY_ROLES = Object.freeze(['Vanguard', 'Tank', 'Striker', 'Support', 'Healer', 'Scout', 'Rear Guard', 'Companion']);
const EFFECT_SEVERITIES = Object.freeze(['Minor', 'Moderate', 'Severe', 'Critical']);
const DAY_PHASES = ['Morning', 'Afternoon', 'Evening', 'Night'];
const ZONE_TYPES = ['Safe Zone', 'Neutral Zone', 'Danger Zone', 'Unknown Zone'];
const ROOM_TYPES = ['Room', 'Hall', 'Corridor', 'Stairs', 'Entrance', 'Garden', 'Utility', 'Unknown'];
const CONNECTION_TYPES = ['Door', 'Passage', 'Stairs', 'Archway', 'Window'];
const SOURCE_MAP_WIDTH = 1448;
const SOURCE_MAP_HEIGHT = 1086;
const WORLD_MAP_WIDTH = 2400;
const WORLD_MAP_HEIGHT = 1800;
const WORLD_TILE_SIZE = 512;
const WORLD_ATLASES = Object.freeze({
    'present-world': Object.freeze({ id: 'present-world', name: 'Present World', era: 'Present Era', atlasVersion: 4 }),
    'alternate-present-world': Object.freeze({ id: 'alternate-present-world', name: 'Alternate Present World TRETARESIA', era: 'Alternate Present Era', atlasVersion: 4 }),
});
const WORLD_ATLAS = WORLD_ATLASES['present-world'];
const WORLD_TILE_ROOTS = Object.freeze({
    'present-world': Object.freeze({
        day: `/scripts/extensions/${EXTENSION_FOLDER}/assets/world-map/tiles`,
        night: `/scripts/extensions/${EXTENSION_FOLDER}/assets/world-map/tiles-night`,
    }),
    'alternate-present-world': Object.freeze({
        day: `/scripts/extensions/${EXTENSION_FOLDER}/assets/world-map/tiles-alternate`,
        night: `/scripts/extensions/${EXTENSION_FOLDER}/assets/world-map/tiles-alternate-night`,
    }),
});
const WORLD_MAP_ZOOM_LEVELS = Object.freeze({ regional: 1.35, local: 2.4 });
const WORLD_TILE_LEVELS = [
    { z: 0, width: 512, height: 384, columns: 1, rows: 1 },
    { z: 1, width: 1024, height: 768, columns: 2, rows: 2 },
    { z: 2, width: 2048, height: 1536, columns: 4, rows: 3 },
    { z: 3, width: 4096, height: 3072, columns: 8, rows: 6 },
];
const MAP_COARSE_POINTER = Boolean(globalThis.matchMedia?.('(pointer: coarse)')?.matches);
// Mobile Safari is far more sensitive to decoded image memory and concurrent
// image decodes than desktop browsers. Keep only the active atlas/lighting
// context, use a deliberately small LRU, and never decode a wall of tiles at
// once while the user is trying to pan.
const MAP_TILE_CACHE_LIMIT = MAP_COARSE_POINTER ? 8 : 32;
const MAP_TILE_LOAD_LIMIT = MAP_COARSE_POINTER ? 2 : 6;
const MAP_PORTRAIT_THUMBNAIL_SIZE = MAP_COARSE_POINTER ? 64 : 96;
const MAP_PORTRAIT_CACHE_LIMIT = MAP_COARSE_POINTER ? 40 : 56;
const MAP_VISIBLE_PORTRAIT_LIMIT = MAP_COARSE_POINTER ? 24 : 40;
const MAP_ROSTER_PORTRAIT_LIMIT = MAP_COARSE_POINTER ? 18 : 32;
const MAP_CLUSTER_THRESHOLD = MAP_COARSE_POINTER ? 30 : 48;
const MAP_DRAW_INTERVAL = 16;
const MAP_INTERACTION_SETTLE = 140;
const atlasPoint = (x, y) => [
    Math.round(x / SOURCE_MAP_WIDTH * WORLD_MAP_WIDTH),
    Math.round(y / SOURCE_MAP_HEIGHT * WORLD_MAP_HEIGHT),
];
const atlasPolygon = points => points.map(([x, y]) => atlasPoint(x, y));
const atlasBounds = polygons => {
    const points = polygons.flat();
    const xs = points.map(point => point[0]);
    const ys = points.map(point => point[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};
const atlasContinent = (id, name, className, label, sourcePolygons) => {
    const polygons = sourcePolygons.map(atlasPolygon);
    return { id, name, className, label: atlasPoint(...label), polygons, bounds: atlasBounds(polygons) };
};
const PRESENT_WORLD_CONTINENTS = [
    atlasContinent('central', 'Central Continent', 'central', [455, 430], [[
        [205, 290], [260, 245], [320, 220], [420, 225], [520, 230], [620, 250], [675, 320],
        [660, 430], [630, 520], [680, 620], [655, 725], [600, 665], [520, 650], [450, 620],
        [375, 590], [310, 550], [270, 490], [230, 420], [220, 350],
    ]]),
    atlasContinent('forest', 'The Great Forest', 'forest', [1185, 680], [[
        [990, 600], [1030, 555], [1120, 520], [1220, 500], [1310, 530], [1340, 620], [1320, 710],
        [1300, 800], [1220, 835], [1120, 820], [1030, 780], [960, 750], [900, 770], [940, 680],
    ]]),
    atlasContinent('titan', 'Great Land of Titan', 'titan', [375, 765], [[
        [145, 555], [205, 540], [290, 585], [350, 650], [430, 700], [520, 745], [610, 800],
        [665, 880], [620, 915], [510, 900], [400, 900], [300, 880], [230, 850], [175, 810], [155, 730],
    ]]),
    atlasContinent('drinovia', 'Drinovia Continent', 'drinovia', [1180, 245], [[
        [1020, 85], [1110, 75], [1210, 90], [1300, 110], [1320, 185], [1305, 265], [1295, 350],
        [1250, 425], [1170, 405], [1120, 370], [1080, 300], [1050, 220],
    ]]),
    atlasContinent('north', 'North Continent', 'north', [425, 145], [[
        [145, 150], [180, 110], [300, 85], [430, 70], [560, 85], [690, 130], [675, 215],
        [610, 245], [500, 240], [400, 235], [300, 230], [220, 215], [150, 195],
    ]]),
    atlasContinent('baluguria', 'Baluguria Continent', 'baluguria', [780, 875], [
        [[505, 680], [540, 670], [580, 675], [610, 700], [605, 735], [575, 755], [535, 750], [505, 725]],
        [[635, 720], [680, 730], [730, 750], [780, 760], [830, 750], [880, 720], [920, 690],
            [930, 735], [880, 770], [820, 790], [760, 795], [700, 780], [655, 755]],
        [[740, 920], [800, 900], [860, 925], [920, 910], [990, 925], [1030, 965], [980, 1005],
            [900, 995], [830, 1000], [760, 980]],
    ]),
];

const ALTERNATE_WORLD_CONTINENTS = [
    atlasContinent('alt-westreach', 'Westreach Crownlands', 'central', [390, 410], [[
        [105, 125], [230, 80], [410, 85], [610, 120], [720, 230], [760, 400], [720, 590],
        [650, 705], [480, 720], [320, 650], [180, 520], [120, 350],
    ]]),
    atlasContinent('alt-sakura', 'Sakura-Frost Dominion', 'north', [825, 245], [[
        [650, 55], [820, 35], [1005, 65], [1050, 205], [1020, 390], [920, 500],
        [760, 475], [655, 360], [625, 190],
    ]]),
    atlasContinent('alt-ember', 'Sunscorched East', 'drinovia', [1160, 260], [[
        [1010, 65], [1260, 55], [1335, 145], [1320, 360], [1235, 465], [1060, 430], [1005, 285],
    ]]),
    atlasContinent('alt-verdant', 'Verdant Southeast', 'forest', [1140, 650], [[
        [900, 430], [1120, 390], [1325, 430], [1390, 600], [1340, 815], [1120, 850],
        [930, 790], [840, 650],
    ]]),
    atlasContinent('alt-south', 'Southern Wildlands', 'baluguria', [390, 770], [[
        [105, 515], [270, 485], [470, 555], [650, 650], [720, 835], [630, 930],
        [390, 920], [180, 830], [110, 680],
    ]]),
    atlasContinent('alt-isles', 'Inner Sea Archipelago', 'titan', [760, 850], [[
        [470, 560], [690, 540], [900, 610], [1110, 760], [1050, 1030], [700, 1045],
        [500, 910], [410, 710],
    ]]),
];
// These coordinates are hand-placed against the supplied atlas artwork. The order mirrors
// WORLD_LOCATIONS below, keeping every named destination on visible land or a visible island.
const WORLD_LOCATION_POINTS = {
    'Central Continent': [
        [535, 250], [265, 335], [485, 435], [560, 560], [310, 415], [430, 350], [560, 360],
        [340, 500], [510, 300], [575, 510], [285, 370], [390, 460], [380, 535], [600, 430],
        [475, 555], [530, 590], [320, 450], [500, 600], [430, 570], [560, 520], [470, 385],
    ],
    'The Great Forest': [
        [1210, 610], [1200, 650], [1030, 700], [1250, 550], [1120, 700], [1290, 730], [1110, 780],
        [1190, 580], [1260, 670], [1140, 620], [1240, 790], [1290, 620], [1180, 720], [1080, 730],
        [1160, 800], [1310, 680], [1040, 650], [1220, 560], [1300, 780], [1100, 810], [1250, 820],
    ],
    'Great Land of Titan': [
        [380, 815], [300, 720], [250, 760], [335, 675], [250, 650], [460, 730], [500, 790],
        [320, 830], [420, 755], [410, 870], [230, 700], [500, 850], [280, 860], [520, 840],
        [470, 850], [250, 800], [520, 880], [360, 780], [220, 840], [440, 800], [490, 875],
    ],
    'Drinovia Continent': [
        [1250, 130], [1160, 260], [1280, 250], [1200, 180], [1100, 220], [1190, 120], [1240, 330],
        [1110, 320], [1210, 300], [1270, 190], [1110, 150], [1190, 280], [1140, 330], [1270, 340],
        [1080, 180], [1260, 220], [1170, 350], [1240, 380], [1080, 250], [1270, 300], [1160, 380],
    ],
    'North Continent': [
        [333, 152], [470, 125], [580, 145], [540, 105], [620, 175], [650, 210], [400, 160],
        [575, 210], [270, 175], [455, 210], [235, 150], [600, 105], [350, 205], [500, 85],
        [420, 190], [560, 90], [475, 180], [390, 215], [300, 110], [530, 200], [360, 95],
    ],
    'Baluguria Continent': [
        [533, 718], [815, 760], [814, 940], [920, 918], [515, 732], [689, 748], [791, 758],
        [782, 924], [836, 950], [874, 946], [926, 964], [535, 696], [551, 710], [515, 712],
        [795, 780], [777, 776], [819, 786], [735, 786], [853, 774], [776, 962], [958, 942],
    ],
};
const worldLocationPointCursor = {};
const mapSite = (id, name, continent, region, x, y, tier = 2, kind = 'landmark', zone = 'Neutral Zone') => (
    (() => {
        const cursor = worldLocationPointCursor[continent] || 0;
        const sourcePoint = WORLD_LOCATION_POINTS[continent]?.[cursor];
        worldLocationPointCursor[continent] = cursor + 1;
        const [mapX, mapY] = sourcePoint ? atlasPoint(...sourcePoint) : [x, y];
        return { id, name, continent, region, x: mapX, y: mapY, tier, kind, zone };
    })()
);
const exactMapSite = (id, name, continent, region, x, y, tier = 0, kind = 'landmark', zone = 'Neutral Zone') => (
    { id, name, continent, region, x, y, tier, kind, zone }
);
const PRESENT_WORLD_LOCATIONS = [
    mapSite('central-capital', 'Central Crown', 'Central Continent', 'Crown Heartlands', 1135, 690, 0, 'capital', 'Safe Zone'),
    mapSite('great-academy', 'The Great Academy', 'Central Continent', 'Academy March', 1010, 600, 0, 'academy', 'Safe Zone'),
    mapSite('grand-crossroads', 'Grand Crossroads', 'Central Continent', 'Kingroads', 1250, 790, 0, 'city', 'Safe Zone'),
    mapSite('eastwake-port', 'Eastwake Port', 'Central Continent', 'Eastwake Coast', 1510, 890, 0, 'port', 'Safe Zone'),
    mapSite('sunmere', 'Sunmere Principality', 'Central Continent', 'Sunmere', 860, 520, 1, 'city', 'Safe Zone'),
    mapSite('river-crown', 'River Crown', 'Central Continent', 'Crown Heartlands', 1180, 585, 1, 'city', 'Safe Zone'),
    mapSite('bellfoundry', 'Bellfoundry', 'Central Continent', 'Iron Vale', 1395, 550, 1, 'town', 'Neutral Zone'),
    mapSite('redwillow', 'Redwillow', 'Central Continent', 'Western Farms', 770, 735, 1, 'town', 'Safe Zone'),
    mapSite('greymark', 'Greymark Citadel', 'Central Continent', 'Northern March', 1100, 410, 1, 'fortress', 'Neutral Zone'),
    mapSite('hollowbridge', 'Hollowbridge', 'Central Continent', 'Kingroads', 1325, 895, 1, 'town', 'Safe Zone'),
    mapSite('westmere-port', 'Westmere Port', 'Central Continent', 'Westmere Coast', 690, 855, 1, 'port', 'Safe Zone'),
    mapSite('saint-orsen', 'Saint Orsen Hospice', 'Central Continent', 'Pilgrim Fields', 945, 820, 2, 'sanctuary', 'Safe Zone'),
    mapSite('moonmill', 'Moonmill Village', 'Central Continent', 'Western Farms', 830, 940, 2, 'village', 'Safe Zone'),
    mapSite('ashen-orchard', 'Ashen Orchard', 'Central Continent', 'Cinder Downs', 1460, 730, 2, 'village', 'Neutral Zone'),
    mapSite('old-ars-road', 'Old Ars Road', 'Central Continent', 'Ancient Roads', 1045, 965, 2, 'road', 'Neutral Zone'),
    mapSite('copper-den', 'Copper Den', 'Central Continent', 'Iron Vale', 1425, 990, 2, 'mine', 'Danger Zone'),
    mapSite('veilwood', 'Veilwood Hamlet', 'Central Continent', 'Veilwood', 760, 625, 2, 'village', 'Neutral Zone'),
    mapSite('larkspur-waystation', 'Larkspur Waystation', 'Central Continent', 'Kingroads', 1210, 1015, 2, 'waystation', 'Safe Zone'),
    mapSite('glasswater-lake', 'Glasswater Lake', 'Central Continent', 'Lake Country', 930, 1035, 2, 'lake', 'Neutral Zone'),
    mapSite('black-bell-dungeon', 'Black Bell Dungeon', 'Central Continent', 'Cinder Downs', 1525, 1010, 2, 'dungeon', 'Danger Zone'),
    mapSite('nameless-chapel', 'Nameless Chapel', 'Central Continent', 'Pilgrim Fields', 1280, 475, 2, 'ruin', 'Danger Zone'),

    mapSite('cloud-tree', 'The Cloud-Piercing Tree', 'The Great Forest', 'Worldroot Core', 2070, 1040, 0, 'world-tree', 'Danger Zone'),
    mapSite('worldroot-expanse', 'Worldroot Expanse', 'The Great Forest', 'Worldroot Core', 2000, 960, 0, 'forest', 'Danger Zone'),
    mapSite('forbidden-verge', 'Forbidden Verge', 'The Great Forest', 'Human Exclusion Border', 1745, 905, 0, 'border', 'Danger Zone'),
    mapSite('verdant-court', 'Verdant Court', 'The Great Forest', 'Elder Canopy', 2150, 870, 0, 'capital', 'Safe Zone'),
    mapSite('canopy-waystation', 'Canopy Waystation', 'The Great Forest', 'Outer Canopy', 1810, 1020, 1, 'waystation', 'Neutral Zone'),
    mapSite('rainfang', 'Rainfang Village', 'The Great Forest', 'Rainfang Basin', 2250, 1090, 1, 'village', 'Safe Zone'),
    mapSite('jade-river', 'Jade River Crossing', 'The Great Forest', 'Jadewater', 1930, 1185, 1, 'crossing', 'Neutral Zone'),
    mapSite('moss-crown', 'Moss Crown', 'The Great Forest', 'Elder Canopy', 2055, 780, 1, 'town', 'Safe Zone'),
    mapSite('thousand-vines', 'Thousand-Vine Maze', 'The Great Forest', 'Tangled Interior', 2200, 970, 1, 'labyrinth', 'Danger Zone'),
    mapSite('greenwhisper', 'Greenwhisper', 'The Great Forest', 'Whispering Boughs', 1865, 820, 1, 'village', 'Safe Zone'),
    mapSite('orchid-falls', 'Orchid Falls', 'The Great Forest', 'Jadewater', 2115, 1220, 1, 'waterfall', 'Neutral Zone'),
    mapSite('sleeping-grove', 'Sleeping Grove', 'The Great Forest', 'Dreamwood', 2290, 1245, 2, 'grove', 'Danger Zone'),
    mapSite('bone-orchard', 'Bone Orchard', 'The Great Forest', 'Tangled Interior', 1965, 855, 2, 'ruin', 'Danger Zone'),
    mapSite('amber-hive', 'Amber Hive', 'The Great Forest', 'Outer Canopy', 1785, 1130, 2, 'settlement', 'Neutral Zone'),
    mapSite('starcap-cavern', 'Starcap Cavern', 'The Great Forest', 'Worldroot Core', 2020, 1290, 2, 'dungeon', 'Danger Zone'),
    mapSite('moonfern-lake', 'Moonfern Lake', 'The Great Forest', 'Dreamwood', 2185, 1320, 2, 'lake', 'Neutral Zone'),
    mapSite('heretic-bloom', 'Heretic Bloom Shrine', 'The Great Forest', 'Tangled Interior', 2310, 835, 2, 'cult', 'Danger Zone'),
    mapSite('beast-tongue-market', 'Beast-Tongue Market', 'The Great Forest', 'Rainfang Basin', 2205, 1155, 2, 'market', 'Safe Zone'),
    mapSite('rootwatch', 'Rootwatch Tower', 'The Great Forest', 'Human Exclusion Border', 1735, 790, 2, 'tower', 'Danger Zone'),
    mapSite('lost-leaf', 'Lost Leaf Village', 'The Great Forest', 'Whispering Boughs', 1880, 1265, 2, 'hidden-village', 'Neutral Zone'),
    mapSite('pale-mangrove', 'Pale Mangrove', 'The Great Forest', 'Southern Wetlands', 2240, 1340, 2, 'swamp', 'Danger Zone'),

    mapSite('khaduzar', 'Grand Kingdom of Khaduzar', 'Great Land of Titan', 'Khaduzar', 365, 1080, 0, 'capital', 'Safe Zone'),
    mapSite('titan-hand', "Titan's Hand", 'Great Land of Titan', 'Khaduzar Dunes', 460, 1000, 0, 'monument', 'Neutral Zone'),
    mapSite('sunscar-port', 'Sunscar Port', 'Great Land of Titan', 'Burning Coast', 165, 1165, 0, 'port', 'Safe Zone'),
    mapSite('dune-throne', 'Dune Throne', 'Great Land of Titan', 'Royal Sands', 335, 920, 0, 'city', 'Safe Zone'),
    mapSite('glass-dunes', 'Glass Dunes', 'Great Land of Titan', 'Titan Wastes', 190, 930, 1, 'desert', 'Danger Zone'),
    mapSite('red-aquifer', 'Red Aquifer', 'Great Land of Titan', 'Deep Wells', 520, 1160, 1, 'oasis', 'Neutral Zone'),
    mapSite('iron-sirocco', 'Iron Sirocco', 'Great Land of Titan', 'Stormbelt', 585, 1010, 1, 'fortress', 'Danger Zone'),
    mapSite('salt-crown', 'Salt Crown', 'Great Land of Titan', 'White Salt', 260, 1250, 1, 'town', 'Safe Zone'),
    mapSite('giant-step', "Giant's Step", 'Great Land of Titan', 'Khaduzar Dunes', 520, 900, 1, 'waystation', 'Neutral Zone'),
    mapSite('mirage-market', 'Mirage Market', 'Great Land of Titan', 'Royal Sands', 405, 1215, 1, 'market', 'Safe Zone'),
    mapSite('sunken-obelisk', 'Sunken Obelisk', 'Great Land of Titan', 'Titan Wastes', 110, 1045, 1, 'ruin', 'Danger Zone'),
    mapSite('black-cistern', 'Black Cistern', 'Great Land of Titan', 'Deep Wells', 600, 1265, 2, 'dungeon', 'Danger Zone'),
    mapSite('seven-tents', 'Seven Tents', 'Great Land of Titan', 'Caravan Sea', 320, 1310, 2, 'caravan', 'Safe Zone'),
    mapSite('bonewind-camp', 'Bonewind Camp', 'Great Land of Titan', 'Stormbelt', 635, 1125, 2, 'camp', 'Danger Zone'),
    mapSite('blue-flame-oasis', 'Blue-Flame Oasis', 'Great Land of Titan', 'Deep Wells', 475, 1295, 2, 'oasis', 'Neutral Zone'),
    mapSite('shifting-maw', 'Shifting Maw', 'Great Land of Titan', 'Titan Wastes', 135, 1260, 2, 'dungeon', 'Danger Zone'),
    mapSite('hammerfall-quarry', 'Hammerfall Quarry', 'Great Land of Titan', 'Khaduzar', 570, 1340, 2, 'mine', 'Neutral Zone'),
    mapSite('scorpion-road', 'Scorpion Road', 'Great Land of Titan', 'Caravan Sea', 245, 1085, 2, 'road', 'Danger Zone'),
    mapSite('pale-sultanate', 'Pale Sultanate', 'Great Land of Titan', 'White Salt', 95, 1185, 2, 'city', 'Safe Zone'),
    mapSite('wrist-shadow', 'Wrist-Shadow Village', 'Great Land of Titan', 'Khaduzar Dunes', 485, 1065, 2, 'village', 'Safe Zone'),
    mapSite('howling-vault', 'Howling Vault', 'Great Land of Titan', 'Stormbelt', 655, 1305, 2, 'dungeon', 'Danger Zone'),

    mapSite('duel-crown', 'Duel Crown', 'Drinovia Continent', 'Crown of Blades', 2070, 335, 0, 'capital', 'Neutral Zone'),
    mapSite('fallen-arms', 'Field of Fallen Arms', 'Drinovia Continent', 'Gravefields', 1950, 425, 0, 'battlefield', 'Danger Zone'),
    mapSite('ash-march', 'Ash March', 'Drinovia Continent', 'Ash Frontier', 2250, 455, 0, 'region', 'Danger Zone'),
    mapSite('red-arena', 'Red Arena', 'Drinovia Continent', 'Crown of Blades', 2160, 245, 0, 'arena', 'Neutral Zone'),
    mapSite('speargrave', 'Speargrave', 'Drinovia Continent', 'Gravefields', 1835, 330, 1, 'city', 'Neutral Zone'),
    mapSite('iron-widow', 'Iron Widow Keep', 'Drinovia Continent', 'Widow Hills', 1980, 155, 1, 'fortress', 'Danger Zone'),
    mapSite('victors-rest', "Victor's Rest", 'Drinovia Continent', 'Crown of Blades', 2200, 570, 1, 'city', 'Safe Zone'),
    mapSite('broken-standard', 'Broken Standard', 'Drinovia Continent', 'Gravefields', 1745, 465, 1, 'town', 'Danger Zone'),
    mapSite('bloodford', 'Bloodford', 'Drinovia Continent', 'Redwater', 2075, 535, 1, 'crossing', 'Danger Zone'),
    mapSite('last-challenge', 'Last Challenge', 'Drinovia Continent', 'Ash Frontier', 2320, 345, 1, 'fortress', 'Danger Zone'),
    mapSite('weapon-rain', 'Weapon Rain Plateau', 'Drinovia Continent', 'Widow Hills', 1870, 215, 1, 'battlefield', 'Danger Zone'),
    mapSite('nameless-duel', 'Nameless Duel Stone', 'Drinovia Continent', 'Crown of Blades', 2110, 440, 2, 'monument', 'Neutral Zone'),
    mapSite('rust-prayer', 'Rust Prayer Chapel', 'Drinovia Continent', 'Gravefields', 1905, 540, 2, 'ruin', 'Danger Zone'),
    mapSite('black-banner', 'Black Banner Camp', 'Drinovia Continent', 'Ash Frontier', 2280, 555, 2, 'camp', 'Danger Zone'),
    mapSite('thousand-swords', 'Thousand Swords Ravine', 'Drinovia Continent', 'Widow Hills', 1770, 190, 2, 'ravine', 'Danger Zone'),
    mapSite('cinder-lance', 'Cinder Lance', 'Drinovia Continent', 'Ash Frontier', 2340, 245, 2, 'town', 'Neutral Zone'),
    mapSite('mourning-smithy', 'Mourning Smithy', 'Drinovia Continent', 'Gravefields', 1830, 520, 2, 'smithy', 'Safe Zone'),
    mapSite('champion-well', "Champion's Well", 'Drinovia Continent', 'Redwater', 2145, 620, 2, 'sanctuary', 'Safe Zone'),
    mapSite('skull-gate', 'Skull Gate', 'Drinovia Continent', 'Widow Hills', 1665, 360, 2, 'gate', 'Danger Zone'),
    mapSite('oathbreaker-pit', 'Oathbreaker Pit', 'Drinovia Continent', 'Crown of Blades', 2220, 155, 2, 'dungeon', 'Danger Zone'),
    mapSite('quiet-blade', 'Quiet Blade Village', 'Drinovia Continent', 'Redwater', 2015, 595, 2, 'village', 'Safe Zone'),

    mapSite('frostgate', 'Frostgate', 'North Continent', 'North Coast', 1120, 245, 0, 'capital', 'Safe Zone'),
    mapSite('deepwinter', 'Deepwinter Reach', 'North Continent', 'Far North', 900, 115, 0, 'region', 'Danger Zone'),
    mapSite('white-wastes', 'White Wastes', 'North Continent', 'Outer North', 1340, 145, 0, 'region', 'Danger Zone'),
    mapSite('aurora-hold', 'Aurora Hold', 'North Continent', 'Aurora Shelf', 1240, 230, 0, 'city', 'Safe Zone'),
    mapSite('ice-vein', 'Ice-Vein Mine', 'North Continent', 'Outer North', 1460, 205, 1, 'mine', 'Danger Zone'),
    mapSite('snowblind-port', 'Snowblind Port', 'North Continent', 'North Coast', 1510, 250, 1, 'port', 'Neutral Zone'),
    mapSite('cold-sun', 'Cold Sun Monastery', 'North Continent', 'Aurora Shelf', 1040, 125, 1, 'monastery', 'Safe Zone'),
    mapSite('wolfglass', 'Wolfglass Village', 'North Continent', 'Outer North', 1390, 265, 1, 'village', 'Safe Zone'),
    mapSite('winter-throne', 'Winter Throne', 'North Continent', 'Far North', 780, 190, 1, 'fortress', 'Danger Zone'),
    mapSite('blue-ice-road', 'Blue-Ice Road', 'North Continent', 'North Coast', 1185, 285, 1, 'road', 'Neutral Zone'),
    mapSite('breathless-field', 'Breathless Field', 'North Continent', 'Far North', 720, 105, 1, 'wilderness', 'Danger Zone'),
    mapSite('dead-star-crater', 'Dead Star Crater', 'North Continent', 'Outer North', 1560, 120, 2, 'crater', 'Danger Zone'),
    mapSite('mammoth-grave', 'Mammoth Grave', 'North Continent', 'Far North', 840, 260, 2, 'graveyard', 'Danger Zone'),
    mapSite('frozen-mouth', 'Frozen Mouth Dungeon', 'North Continent', 'Aurora Shelf', 1280, 80, 2, 'dungeon', 'Danger Zone'),
    mapSite('three-fires', 'Three Fires Camp', 'North Continent', 'North Coast', 1010, 270, 2, 'camp', 'Safe Zone'),
    mapSite('pale-choir', 'Pale Choir Ruins', 'North Continent', 'Outer North', 1435, 85, 2, 'ruin', 'Danger Zone'),
    mapSite('iceblood-lake', 'Iceblood Lake', 'North Continent', 'Aurora Shelf', 1170, 85, 2, 'lake', 'Danger Zone'),
    mapSite('last-pine', 'Last Pine', 'North Continent', 'North Coast', 945, 285, 2, 'waystation', 'Safe Zone'),
    mapSite('storm-nest', 'Storm Nest', 'North Continent', 'Far North', 690, 205, 2, 'lair', 'Danger Zone'),
    mapSite('silent-thermals', 'Silent Thermals', 'North Continent', 'Aurora Shelf', 1325, 280, 2, 'springs', 'Neutral Zone'),
    mapSite('minus-three-hundred', '-300 Marker', 'North Continent', 'Far North', 760, 60, 2, 'monument', 'Danger Zone'),

    mapSite('exile-port', 'Exile Port', 'Baluguria Continent', 'Balugurian Coast', 1010, 1290, 0, 'port', 'Neutral Zone'),
    mapSite('gilded-vice', 'Gilded Vice', 'Baluguria Continent', 'Pleasure District', 1280, 1260, 0, 'city', 'Danger Zone'),
    mapSite('chainmarket', 'Chainmarket', 'Baluguria Continent', 'Trade Ward', 1420, 1310, 0, 'market', 'Danger Zone'),
    mapSite('underworld-quarter', 'Underworld Quarter', 'Baluguria Continent', 'Lower Baluguria', 1210, 1345, 0, 'district', 'Danger Zone'),
    mapSite('black-dice', 'Black Dice', 'Baluguria Continent', 'Gambling Ward', 1160, 1220, 1, 'casino-city', 'Danger Zone'),
    mapSite('silk-lantern', 'Silk Lantern Row', 'Baluguria Continent', 'Pleasure District', 1335, 1340, 1, 'district', 'Danger Zone'),
    mapSite('prisoners-mile', "Prisoners' Mile", 'Baluguria Continent', 'Exile Road', 1080, 1360, 1, 'road', 'Danger Zone'),
    mapSite('smuggler-crown', "Smuggler's Crown", 'Baluguria Continent', 'Lower Baluguria', 1535, 1260, 1, 'fortress', 'Danger Zone'),
    mapSite('orion-auction', 'Orion Auction Hall', 'Baluguria Continent', 'Trade Ward', 1455, 1250, 1, 'auction', 'Danger Zone'),
    mapSite('velvet-dock', 'Velvet Dock', 'Baluguria Continent', 'Balugurian Coast', 930, 1340, 1, 'port', 'Neutral Zone'),
    mapSite('red-ledger', 'Red Ledger Bank', 'Baluguria Continent', 'Gambling Ward', 1245, 1190, 1, 'bank', 'Danger Zone'),
    mapSite('faceless-den', 'Faceless Den', 'Baluguria Continent', 'Lower Baluguria', 1385, 1380, 2, 'hideout', 'Danger Zone'),
    mapSite('broken-collar', 'Broken Collar Inn', 'Baluguria Continent', 'Exile Road', 1050, 1200, 2, 'inn', 'Neutral Zone'),
    mapSite('nightglass', 'Nightglass Alley', 'Baluguria Continent', 'Pleasure District', 1305, 1375, 2, 'district', 'Danger Zone'),
    mapSite('coin-eater', 'Coin-Eater Pit', 'Baluguria Continent', 'Gambling Ward', 1175, 1350, 2, 'arena', 'Danger Zone'),
    mapSite('contraband-bazaar', 'Contraband Bazaar', 'Baluguria Continent', 'Trade Ward', 1490, 1365, 2, 'market', 'Danger Zone'),
    mapSite('salt-cellars', 'Salt Cellars', 'Baluguria Continent', 'Balugurian Coast', 970, 1190, 2, 'dungeon', 'Danger Zone'),
    mapSite('ash-chain-yard', 'Ash Chain Yard', 'Baluguria Continent', 'Exile Road', 1115, 1265, 2, 'yard', 'Danger Zone'),
    mapSite('whisper-broker', 'Whisper Broker Court', 'Baluguria Continent', 'Lower Baluguria', 1570, 1340, 2, 'court', 'Danger Zone'),
    mapSite('golden-cage', 'Golden Cage', 'Baluguria Continent', 'Pleasure District', 1360, 1210, 2, 'estate', 'Danger Zone'),
    mapSite('last-freeman', "Last Freeman's Shrine", 'Baluguria Continent', 'Balugurian Coast', 900, 1260, 2, 'shrine', 'Neutral Zone'),
];
const ALTERNATE_PRESENT_TARGET_BOUNDS = Object.freeze({
    'Central Continent': Object.freeze({ continent: 'Westreach Crownlands', bounds: [300, 260, 1120, 1080] }),
    'North Continent': Object.freeze({ continent: 'Sakura-Frost Dominion', bounds: [1120, 120, 1660, 740] }),
    'Drinovia Continent': Object.freeze({ continent: 'Sunscorched East', bounds: [1740, 180, 2160, 720] }),
    'The Great Forest': Object.freeze({ continent: 'Verdant Southeast', bounds: [1560, 800, 2180, 1320] }),
    'Great Land of Titan': Object.freeze({ continent: 'Southern Wildlands', bounds: [260, 980, 1120, 1490] }),
    'Baluguria Continent': Object.freeze({ continent: 'Inner Sea Archipelago', bounds: [900, 1000, 1920, 1650] }),
});
const ALTERNATE_PRESENT_COORDINATE_OVERRIDES = Object.freeze({
    'grand-crossroads': Object.freeze([810, 720]),
    'copper-den': Object.freeze([920, 1025]),
    'amber-hive': Object.freeze([1700, 1115]),
    'howling-vault': Object.freeze([1000, 1450]),
    'cinder-lance': Object.freeze([2085, 415]),
    'wolfglass': Object.freeze([1530, 690]),
    'gilded-vice': Object.freeze([1620, 1125]),
});
const ALTERNATE_PRESENT_SOURCE_BOUNDS = Object.freeze(Object.fromEntries(Object.keys(ALTERNATE_PRESENT_TARGET_BOUNDS).map(continent => {
    const entries = PRESENT_WORLD_LOCATIONS.filter(location => location.continent === continent);
    return [continent, Object.freeze([
        Math.min(...entries.map(location => location.x)), Math.min(...entries.map(location => location.y)),
        Math.max(...entries.map(location => location.x)), Math.max(...entries.map(location => location.y)),
    ])];
})));
function alternatePresentSite(site) {
    const target = ALTERNATE_PRESENT_TARGET_BOUNDS[site.continent];
    const sourceBounds = ALTERNATE_PRESENT_SOURCE_BOUNDS[site.continent];
    if (!target || !sourceBounds) return { ...site, id: `alt-present-${site.id}` };
    const [sourceLeft, sourceTop, sourceRight, sourceBottom] = sourceBounds;
    const [targetLeft, targetTop, targetRight, targetBottom] = target.bounds;
    const ratioX = (site.x - sourceLeft) / Math.max(1, sourceRight - sourceLeft);
    const ratioY = (site.y - sourceTop) / Math.max(1, sourceBottom - sourceTop);
    return {
        ...site,
        id: `alt-present-${site.id}`,
        continent: target.continent,
        x: ALTERNATE_PRESENT_COORDINATE_OVERRIDES[site.id]?.[0] ?? Math.round(targetLeft + ratioX * (targetRight - targetLeft)),
        y: ALTERNATE_PRESENT_COORDINATE_OVERRIDES[site.id]?.[1] ?? Math.round(targetTop + ratioY * (targetBottom - targetTop)),
    };
}
// Every named Present World destination still exists in the Alternate timeline.
// It is remapped onto the corresponding expanded landmass, then combined with Alternate-exclusive sites.
const ALTERNATE_PRESENT_LOCATIONS = PRESENT_WORLD_LOCATIONS.map(alternatePresentSite);
const ALTERNATE_NEW_LOCATIONS = [
    exactMapSite('alt-chaos-breaker', 'Chaos Breaker', 'Westreach Crownlands', "Kaliasna Oryu's Sky Dominion", 1080, 792, 0, 'sky-castle', 'Neutral Zone'),
    exactMapSite('alt-eastern-tradition-kingdom', 'Eastern Tradition Kingdom', 'Sakura-Frost Dominion', 'Japanese-Tradition Realm', 1272, 360, 0, 'capital', 'Safe Zone'),

    exactMapSite('alt-crownheart-citadel', 'Crownheart Citadel', 'Westreach Crownlands', 'Northern Crown', 576, 252, 0, 'capital', 'Safe Zone'),
    exactMapSite('alt-bluewatch-port', 'Bluewatch Port', 'Westreach Crownlands', 'Western Coast', 432, 558, 0, 'port', 'Safe Zone'),
    exactMapSite('alt-stonegate', 'Stonegate', 'Westreach Crownlands', 'Western Coast', 456, 666, 1, 'fortress', 'Neutral Zone'),
    exactMapSite('alt-frostgate-bastion', 'Frostgate Bastion', 'Westreach Crownlands', 'Northern Crown', 888, 396, 1, 'fortress', 'Neutral Zone'),
    exactMapSite('alt-elderwheel-ruins', 'Elderwheel Ruins', 'Westreach Crownlands', 'Old Kingdom Basin', 576, 522, 1, 'ruin', 'Danger Zone'),
    exactMapSite('alt-graypine-crossing', 'Graypine Crossing', 'Westreach Crownlands', 'Graypine Range', 768, 630, 1, 'crossing', 'Neutral Zone'),
    exactMapSite('alt-westwind-abbey', 'Westwind Abbey', 'Westreach Crownlands', 'Pilgrim Downs', 768, 756, 2, 'sanctuary', 'Safe Zone'),
    exactMapSite('alt-lakeglass', 'Lakeglass', 'Westreach Crownlands', 'Bluewater Vale', 600, 810, 2, 'lake', 'Neutral Zone'),
    exactMapSite('alt-ravenroad', 'Ravenroad', 'Westreach Crownlands', 'Southern March', 912, 954, 2, 'road', 'Neutral Zone'),
    exactMapSite('alt-southspire', 'Southspire', 'Westreach Crownlands', 'Southern March', 1032, 1026, 1, 'city', 'Safe Zone'),
    exactMapSite('alt-sable-march', 'Sable March', 'Westreach Crownlands', 'Southern March', 1080, 1080, 2, 'region', 'Danger Zone'),
    exactMapSite('alt-westmere-isles', 'Westmere Isles', 'Westreach Crownlands', 'Western Sea', 384, 864, 2, 'island', 'Neutral Zone'),

    exactMapSite('alt-sakura-palace', 'Sakura Palace', 'Sakura-Frost Dominion', 'Japanese-Tradition Realm', 1320, 306, 1, 'palace', 'Safe Zone'),
    exactMapSite('alt-frostbloom-shrine', 'Frostbloom Shrine', 'Sakura-Frost Dominion', 'Petal Snowfields', 1152, 414, 1, 'shrine', 'Safe Zone'),
    exactMapSite('alt-snowpetal-monastery', 'Snowpetal Monastery', 'Sakura-Frost Dominion', 'White Cedar Heights', 1464, 234, 1, 'monastery', 'Safe Zone'),
    exactMapSite('alt-giantwood-sanctuary', 'Giantwood Sanctuary', 'Sakura-Frost Dominion', 'Colossal Forest', 1488, 486, 0, 'world-tree', 'Neutral Zone'),
    exactMapSite('alt-worldroot-observatory', 'Worldroot Observatory', 'Sakura-Frost Dominion', 'Colossal Forest', 1560, 558, 1, 'tower', 'Neutral Zone'),
    exactMapSite('alt-moonblossom-village', 'Moonblossom Village', 'Sakura-Frost Dominion', 'Petal Snowfields', 1368, 612, 2, 'village', 'Safe Zone'),
    exactMapSite('alt-white-crane-pass', 'White Crane Pass', 'Sakura-Frost Dominion', 'Eastern Snowwall', 1680, 378, 2, 'pass', 'Danger Zone'),
    exactMapSite('alt-frozen-cedar-reach', 'Frozen Cedar Reach', 'Sakura-Frost Dominion', 'White Cedar Heights', 1608, 252, 2, 'forest', 'Danger Zone'),
    exactMapSite('alt-petal-coast', 'Petal Coast', 'Sakura-Frost Dominion', 'Blossom Coast', 1200, 522, 2, 'coast', 'Neutral Zone'),
    exactMapSite('alt-dragonfang-ring', 'Dragonfang Ring', 'Sakura-Frost Dominion', "Kaliasna Oryu's Sky Dominion", 1056, 774, 1, 'mountain-ring', 'Danger Zone'),

    exactMapSite('alt-aurelian-sand-crown', 'Aurelian Sand Crown', 'Sunscorched East', 'Golden Throne', 2064, 216, 0, 'capital', 'Safe Zone'),
    exactMapSite('alt-emberlake-hold', 'Emberlake Hold', 'Sunscorched East', 'Emberlake', 1848, 270, 1, 'fortress', 'Neutral Zone'),
    exactMapSite('alt-ashen-meridian', 'Ashen Meridian', 'Sunscorched East', 'Ash Meridian', 1752, 396, 1, 'city', 'Neutral Zone'),
    exactMapSite('alt-red-dune-citadel', 'Red Dune Citadel', 'Sunscorched East', 'Red Dunes', 2016, 432, 1, 'fortress', 'Danger Zone'),
    exactMapSite('alt-cinderwell', 'Cinderwell', 'Sunscorched East', 'Cinder Basin', 1968, 558, 2, 'town', 'Safe Zone'),
    exactMapSite('alt-golden-steppe', 'Golden Steppe', 'Sunscorched East', 'Eastern Steppe', 2088, 648, 2, 'region', 'Neutral Zone'),
    exactMapSite('alt-eastern-furnace', 'Eastern Furnace', 'Sunscorched East', 'Cinder Basin', 1824, 612, 2, 'mine', 'Danger Zone'),
    exactMapSite('alt-sunscar-canyon', 'Sunscar Canyon', 'Sunscorched East', 'Red Dunes', 1896, 468, 2, 'canyon', 'Danger Zone'),
    exactMapSite('alt-saltwind-port', 'Saltwind Port', 'Sunscorched East', 'Saltwind Coast', 2088, 702, 1, 'port', 'Safe Zone'),
    exactMapSite('alt-mirage-gate', 'Mirage Gate', 'Sunscorched East', 'Ash Meridian', 1752, 576, 2, 'waystation', 'Neutral Zone'),

    exactMapSite('alt-greenwake-capital', 'Greenwake Capital', 'Verdant Southeast', 'Greenwake Basin', 2040, 864, 0, 'capital', 'Safe Zone'),
    exactMapSite('alt-worldtree-court', 'Worldtree Court', 'Verdant Southeast', 'Elder Canopy', 2112, 1044, 0, 'world-tree', 'Safe Zone'),
    exactMapSite('alt-silverriver-port', 'Silverriver Port', 'Verdant Southeast', 'Southern Delta', 2016, 1242, 1, 'port', 'Safe Zone'),
    exactMapSite('alt-mosslight', 'Mosslight', 'Verdant Southeast', 'Mosslight Woods', 1872, 1116, 1, 'town', 'Safe Zone'),
    exactMapSite('alt-violet-ridge', 'Violet Ridge', 'Verdant Southeast', 'Amethyst Range', 1800, 1080, 1, 'mountain', 'Neutral Zone'),
    exactMapSite('alt-marshcrown', 'Marshcrown', 'Verdant Southeast', 'Western Wetlands', 1656, 990, 2, 'settlement', 'Neutral Zone'),
    exactMapSite('alt-three-rivers', 'Three Rivers', 'Verdant Southeast', 'River Country', 1680, 1152, 2, 'crossing', 'Safe Zone'),
    exactMapSite('alt-dawncoast', 'Dawncoast', 'Verdant Southeast', 'Dawn Coast', 1992, 1350, 2, 'city', 'Safe Zone'),
    exactMapSite('alt-floodplain-abbey', 'Floodplain Abbey', 'Verdant Southeast', 'River Country', 1560, 1206, 2, 'sanctuary', 'Safe Zone'),
    exactMapSite('alt-rootglass-lake', 'Rootglass Lake', 'Verdant Southeast', 'Elder Canopy', 1752, 1260, 2, 'lake', 'Neutral Zone'),

    exactMapSite('alt-blackwood-crown', 'Blackwood Crown', 'Southern Wildlands', 'Blackwood Interior', 624, 1332, 0, 'capital', 'Neutral Zone'),
    exactMapSite('alt-azure-caldera', 'Azure Caldera', 'Southern Wildlands', 'Western Caldera', 456, 1260, 1, 'lake', 'Danger Zone'),
    exactMapSite('alt-duskpine', 'Duskpine', 'Southern Wildlands', 'Duskpine Forest', 528, 1404, 1, 'town', 'Neutral Zone'),
    exactMapSite('alt-dustmarch-keep', 'Dustmarch Keep', 'Southern Wildlands', 'Eastern Dustmarch', 1032, 1476, 1, 'fortress', 'Danger Zone'),
    exactMapSite('alt-wyrmroad-camp', 'Wyrmroad Camp', 'Southern Wildlands', 'Wyrmroad', 888, 1386, 2, 'camp', 'Neutral Zone'),
    exactMapSite('alt-southwestern-port', 'Southwestern Port', 'Southern Wildlands', 'Southwestern Coast', 696, 1566, 1, 'port', 'Safe Zone'),
    exactMapSite('alt-broken-mesa', 'Broken Mesa', 'Southern Wildlands', 'Eastern Dustmarch', 1104, 1332, 2, 'region', 'Danger Zone'),
    exactMapSite('alt-ironwood-bastion', 'Ironwood Bastion', 'Southern Wildlands', 'Blackwood Interior', 600, 1188, 2, 'fortress', 'Neutral Zone'),
    exactMapSite('alt-lakefort', 'Lakefort', 'Southern Wildlands', 'Western Caldera', 672, 1350, 2, 'fortress', 'Safe Zone'),
    exactMapSite('alt-burning-tail', 'Burning Tail', 'Southern Wildlands', 'Ashen Peninsula', 1176, 1476, 2, 'coast', 'Danger Zone'),

    exactMapSite('alt-roundhold-isle', 'Roundhold Isle', 'Inner Sea Archipelago', 'Roundhold Waters', 888, 1188, 0, 'island-fortress', 'Safe Zone'),
    exactMapSite('alt-lantern-archipelago', 'Lantern Archipelago', 'Inner Sea Archipelago', 'Lantern Sea', 1320, 1494, 1, 'archipelago', 'Neutral Zone'),
    exactMapSite('alt-crosswind-haven', 'Crosswind Haven', 'Inner Sea Archipelago', 'Crosswind Channel', 1272, 1296, 1, 'port', 'Safe Zone'),
    exactMapSite('alt-pearlchain-port', 'Pearlchain Port', 'Inner Sea Archipelago', 'Pearlchain Isles', 1488, 1494, 1, 'port', 'Safe Zone'),
    exactMapSite('alt-whisperreef', 'Whisperreef', 'Inner Sea Archipelago', 'Whispering Reefs', 1752, 1602, 2, 'reef', 'Danger Zone'),
    exactMapSite('alt-southsea-crown', 'Southsea Crown', 'Inner Sea Archipelago', 'Southsea Isles', 1992, 1584, 1, 'island-city', 'Safe Zone'),
    exactMapSite('alt-oracle-isle', 'Oracle Isle', 'Inner Sea Archipelago', 'Oracle Waters', 1152, 1170, 2, 'shrine', 'Neutral Zone'),
    exactMapSite('alt-black-compass-atoll', 'Black Compass Atoll', 'Inner Sea Archipelago', 'Black Compass Sea', 1464, 1278, 2, 'atoll', 'Danger Zone'),
    exactMapSite('alt-central-tideway', 'Central Tideway', 'Inner Sea Archipelago', 'Central Passage', 1344, 1152, 2, 'sea-route', 'Neutral Zone'),
    exactMapSite('alt-glassbell-island', 'Glassbell Island', 'Inner Sea Archipelago', 'Western Inner Sea', 840, 936, 2, 'island', 'Neutral Zone'),
    // Westreach Crownlands — dense heartland, coast, mountain and sky-domain routes.
    exactMapSite('alt-ironbell-city', 'Ironbell City', 'Westreach Crownlands', 'Iron Vale', 720, 540, 1, 'city', 'Safe Zone'),
    exactMapSite('alt-crownroad-market', 'Crownroad Market', 'Westreach Crownlands', 'Kingroads', 840, 684, 1, 'market', 'Safe Zone'),
    exactMapSite('alt-whitecliff-watch', 'Whitecliff Watch', 'Westreach Crownlands', 'Northern Crown', 696, 306, 2, 'tower', 'Neutral Zone'),
    exactMapSite('alt-northstar-village', 'Northstar Village', 'Westreach Crownlands', 'Northern Crown', 768, 342, 2, 'village', 'Safe Zone'),
    exactMapSite('alt-hollow-crown-mine', 'Hollow Crown Mine', 'Westreach Crownlands', 'Graypine Range', 864, 522, 2, 'mine', 'Danger Zone'),
    exactMapSite('alt-graypine-monastery', 'Graypine Monastery', 'Westreach Crownlands', 'Graypine Range', 936, 594, 2, 'monastery', 'Safe Zone'),
    exactMapSite('alt-old-king-road', 'Old King Road', 'Westreach Crownlands', 'Old Kingdom Basin', 648, 612, 2, 'road', 'Neutral Zone'),
    exactMapSite('alt-mirrorfen', 'Mirrorfen', 'Westreach Crownlands', 'Bluewater Vale', 480, 756, 2, 'swamp', 'Danger Zone'),
    exactMapSite('alt-liongate', 'Liongate', 'Westreach Crownlands', 'Pilgrim Downs', 792, 846, 1, 'gate', 'Safe Zone'),
    exactMapSite('alt-western-windmill', 'Western Windmill', 'Westreach Crownlands', 'Pilgrim Downs', 552, 702, 2, 'village', 'Safe Zone'),
    exactMapSite('alt-moonbridge', 'Moonbridge', 'Westreach Crownlands', 'Bluewater Vale', 672, 882, 2, 'bridge', 'Neutral Zone'),
    exactMapSite('alt-ravenwatch', 'Ravenwatch', 'Westreach Crownlands', 'Southern March', 960, 864, 2, 'tower', 'Danger Zone'),
    exactMapSite('alt-cinderfield', 'Cinderfield', 'Westreach Crownlands', 'Southern March', 984, 990, 2, 'battlefield', 'Danger Zone'),
    exactMapSite('alt-stormharbor', 'Stormharbor', 'Westreach Crownlands', 'Western Coast', 312, 612, 1, 'port', 'Safe Zone'),
    exactMapSite('alt-drowned-cathedral', 'Drowned Cathedral', 'Westreach Crownlands', 'Western Sea', 336, 792, 2, 'ruin', 'Danger Zone'),
    exactMapSite('alt-cloudfall-steps', 'Cloudfall Steps', 'Westreach Crownlands', "Kaliasna Oryu's Sky Dominion", 1008, 720, 2, 'mountain-pass', 'Danger Zone'),
    exactMapSite('alt-dragons-shadow-village', "Dragon's Shadow Village", 'Westreach Crownlands', "Kaliasna Oryu's Sky Dominion", 984, 774, 1, 'village', 'Neutral Zone'),

    // Sakura-Frost Dominion — cities, sacred sites, snowfields and giantwood settlements.
    exactMapSite('alt-crimson-torii-city', 'Crimson Torii City', 'Sakura-Frost Dominion', 'Japanese-Tradition Realm', 1392, 396, 1, 'city', 'Safe Zone'),
    exactMapSite('alt-shirogane-keep', 'Shirogane Keep', 'Sakura-Frost Dominion', 'Japanese-Tradition Realm', 1512, 342, 1, 'fortress', 'Safe Zone'),
    exactMapSite('alt-hanakage-village', 'Hanakage Village', 'Sakura-Frost Dominion', 'Blossom Coast', 1272, 594, 2, 'village', 'Safe Zone'),
    exactMapSite('alt-yukimori-fort', 'Yukimori Fort', 'Sakura-Frost Dominion', 'Eastern Snowwall', 1632, 432, 1, 'fortress', 'Neutral Zone'),
    exactMapSite('alt-kitsune-falls', 'Kitsune Falls', 'Sakura-Frost Dominion', 'Petal Snowfields', 1440, 540, 2, 'waterfall', 'Neutral Zone'),
    exactMapSite('alt-sakura-road', 'Sakura Road', 'Sakura-Frost Dominion', 'Japanese-Tradition Realm', 1320, 468, 2, 'road', 'Safe Zone'),
    exactMapSite('alt-snow-lantern-port', 'Snow Lantern Port', 'Sakura-Frost Dominion', 'Blossom Coast', 1152, 558, 1, 'port', 'Safe Zone'),
    exactMapSite('alt-ice-petal-lake', 'Ice-Petal Lake', 'Sakura-Frost Dominion', 'Petal Snowfields', 1488, 450, 2, 'lake', 'Neutral Zone'),
    exactMapSite('alt-cedar-sword-dojo', 'Cedar Sword Dojo', 'Sakura-Frost Dominion', 'White Cedar Heights', 1536, 288, 2, 'dojo', 'Safe Zone'),
    exactMapSite('alt-thousand-bells', 'Temple of a Thousand Bells', 'Sakura-Frost Dominion', 'Japanese-Tradition Realm', 1344, 324, 2, 'temple', 'Safe Zone'),
    exactMapSite('alt-oni-gate', 'Oni Gate', 'Sakura-Frost Dominion', 'Eastern Snowwall', 1680, 504, 2, 'gate', 'Danger Zone'),
    exactMapSite('alt-moon-rabbit-fields', 'Moon-Rabbit Fields', 'Sakura-Frost Dominion', 'Petal Snowfields', 1368, 684, 2, 'farmland', 'Safe Zone'),
    exactMapSite('alt-frost-dragon-cave', 'Frost Dragon Cave', 'Sakura-Frost Dominion', 'Eastern Snowwall', 1608, 594, 2, 'lair', 'Danger Zone'),
    exactMapSite('alt-pink-snow-basin', 'Pink-Snow Basin', 'Sakura-Frost Dominion', 'Petal Snowfields', 1248, 666, 2, 'wilderness', 'Neutral Zone'),
    exactMapSite('alt-great-tree-village', 'Great-Tree Village', 'Sakura-Frost Dominion', 'Colossal Forest', 1512, 648, 1, 'hidden-village', 'Neutral Zone'),
    exactMapSite('alt-shogun-grave', "Last Shogun's Grave", 'Sakura-Frost Dominion', 'White Cedar Heights', 1440, 216, 2, 'graveyard', 'Danger Zone'),
    exactMapSite('alt-white-fox-shrine', 'White Fox Shrine', 'Sakura-Frost Dominion', 'Japanese-Tradition Realm', 1296, 414, 2, 'shrine', 'Safe Zone'),
    exactMapSite('alt-eastern-cloud-port', 'Eastern Cloud Port', 'Sakura-Frost Dominion', 'Blossom Coast', 1668, 648, 1, 'port', 'Safe Zone'),
    exactMapSite('alt-celestial-bamboo-grove', 'Celestial Bamboo Grove', 'Sakura-Frost Dominion', 'Colossal Forest', 1560, 720, 2, 'grove', 'Neutral Zone'),

    // Sunscorched East — desert kingdoms, caravan arteries, volcanic ruins and oases.
    exactMapSite('alt-solaris-gate', 'Solaris Gate', 'Sunscorched East', 'Golden Throne', 1992, 288, 1, 'gate', 'Safe Zone'),
    exactMapSite('alt-brasshaven', 'Brasshaven', 'Sunscorched East', 'Ash Meridian', 1872, 342, 1, 'city', 'Safe Zone'),
    exactMapSite('alt-scorpion-crown', 'Scorpion Crown', 'Sunscorched East', 'Red Dunes', 2112, 378, 2, 'fortress', 'Danger Zone'),
    exactMapSite('alt-copper-sun-market', 'Copper Sun Market', 'Sunscorched East', 'Golden Throne', 2040, 342, 2, 'market', 'Safe Zone'),
    exactMapSite('alt-blackglass-dunes', 'Blackglass Dunes', 'Sunscorched East', 'Red Dunes', 1920, 540, 2, 'desert', 'Danger Zone'),
    exactMapSite('alt-phoenix-well', 'Phoenix Well', 'Sunscorched East', 'Cinder Basin', 2016, 612, 2, 'oasis', 'Safe Zone'),
    exactMapSite('alt-sunwheel-observatory', 'Sunwheel Observatory', 'Sunscorched East', 'Golden Throne', 2136, 252, 2, 'observatory', 'Neutral Zone'),
    exactMapSite('alt-ember-road', 'Ember Road', 'Sunscorched East', 'Ash Meridian', 1824, 486, 2, 'road', 'Neutral Zone'),
    exactMapSite('alt-saffron-caravanserai', 'Saffron Caravanserai', 'Sunscorched East', 'Eastern Steppe', 2064, 594, 2, 'caravan', 'Safe Zone'),
    exactMapSite('alt-red-moon-oasis', 'Red Moon Oasis', 'Sunscorched East', 'Red Dunes', 2136, 486, 2, 'oasis', 'Neutral Zone'),
    exactMapSite('alt-ash-kings-tomb', "Ash King's Tomb", 'Sunscorched East', 'Ash Meridian', 1776, 306, 2, 'tomb', 'Danger Zone'),
    exactMapSite('alt-furnace-depths', 'Furnace Depths', 'Sunscorched East', 'Cinder Basin', 1848, 666, 2, 'dungeon', 'Danger Zone'),
    exactMapSite('alt-golden-vulture-roost', 'Golden Vulture Roost', 'Sunscorched East', 'Eastern Steppe', 2160, 630, 2, 'lair', 'Danger Zone'),
    exactMapSite('alt-dry-river-city', 'Dry River City', 'Sunscorched East', 'Saltwind Coast', 2112, 720, 1, 'city', 'Safe Zone'),
    exactMapSite('alt-smoldering-bridge', 'Smoldering Bridge', 'Sunscorched East', 'Ash Meridian', 1896, 594, 2, 'bridge', 'Neutral Zone'),
    exactMapSite('alt-bronze-lion-fort', 'Bronze Lion Fort', 'Sunscorched East', 'Golden Throne', 2184, 324, 1, 'fortress', 'Neutral Zone'),
    exactMapSite('alt-singing-sand-village', 'Singing Sand Village', 'Sunscorched East', 'Red Dunes', 2040, 504, 2, 'village', 'Safe Zone'),
    exactMapSite('alt-coalwind-mine', 'Coalwind Mine', 'Sunscorched East', 'Cinder Basin', 1800, 630, 2, 'mine', 'Danger Zone'),
    exactMapSite('alt-eastfire-lighthouse', 'Eastfire Lighthouse', 'Sunscorched East', 'Saltwind Coast', 2184, 684, 2, 'lighthouse', 'Safe Zone'),
    exactMapSite('alt-mirage-burial-ground', 'Mirage Burial Ground', 'Sunscorched East', 'Red Dunes', 1968, 450, 2, 'graveyard', 'Danger Zone'),

    // Verdant Southeast — river cities, worldtree settlements, wetlands and deep-forest ruins.
    exactMapSite('alt-emerald-bridge', 'Emerald Bridge', 'Verdant Southeast', 'River Country', 1776, 1008, 1, 'bridge-city', 'Safe Zone'),
    exactMapSite('alt-canopy-crown', 'Canopy Crown', 'Verdant Southeast', 'Elder Canopy', 2016, 972, 1, 'city', 'Safe Zone'),
    exactMapSite('alt-rainbell-village', 'Rainbell Village', 'Verdant Southeast', 'Greenwake Basin', 1944, 900, 2, 'village', 'Safe Zone'),
    exactMapSite('alt-jade-delta', 'Jade Delta', 'Verdant Southeast', 'Southern Delta', 1920, 1314, 2, 'wetland', 'Neutral Zone'),
    exactMapSite('alt-rootbound-library', 'Rootbound Library', 'Verdant Southeast', 'Elder Canopy', 2088, 1116, 2, 'library', 'Safe Zone'),
    exactMapSite('alt-violet-pass', 'Violet Pass', 'Verdant Southeast', 'Amethyst Range', 1752, 1026, 2, 'pass', 'Danger Zone'),
    exactMapSite('alt-thornwall-fort', 'Thornwall Fort', 'Verdant Southeast', 'Western Wetlands', 1584, 936, 1, 'fortress', 'Neutral Zone'),
    exactMapSite('alt-lotus-market', 'Lotus Market', 'Verdant Southeast', 'River Country', 1728, 1188, 2, 'market', 'Safe Zone'),
    exactMapSite('alt-deepmoss-ruins', 'Deepmoss Ruins', 'Verdant Southeast', 'Mosslight Woods', 1848, 1188, 2, 'ruin', 'Danger Zone'),
    exactMapSite('alt-green-dragon-falls', 'Green Dragon Falls', 'Verdant Southeast', 'Greenwake Basin', 2112, 918, 2, 'waterfall', 'Neutral Zone'),
    exactMapSite('alt-sunleaf-monastery', 'Sunleaf Monastery', 'Verdant Southeast', 'Dawn Coast', 2160, 1260, 2, 'monastery', 'Safe Zone'),
    exactMapSite('alt-mangrove-gate', 'Mangrove Gate', 'Verdant Southeast', 'Western Wetlands', 1512, 1080, 2, 'gate', 'Neutral Zone'),
    exactMapSite('alt-river-serpent-lair', 'River Serpent Lair', 'Verdant Southeast', 'River Country', 1680, 1242, 2, 'lair', 'Danger Zone'),
    exactMapSite('alt-glowfern-hollow', 'Glowfern Hollow', 'Verdant Southeast', 'Mosslight Woods', 1800, 1146, 2, 'grove', 'Neutral Zone'),
    exactMapSite('alt-southern-jade-port', 'Southern Jade Port', 'Verdant Southeast', 'Southern Delta', 2088, 1332, 1, 'port', 'Safe Zone'),
    exactMapSite('alt-elderbark-sanctum', 'Elderbark Sanctum', 'Verdant Southeast', 'Elder Canopy', 2160, 1080, 2, 'sanctuary', 'Danger Zone'),
    exactMapSite('alt-cloudvine-tower', 'Cloudvine Tower', 'Verdant Southeast', 'Amethyst Range', 1848, 1008, 2, 'tower', 'Neutral Zone'),
    exactMapSite('alt-flooded-palace', 'Flooded Palace', 'Verdant Southeast', 'Western Wetlands', 1584, 1152, 2, 'dungeon', 'Danger Zone'),
    exactMapSite('alt-dawn-orchid-city', 'Dawn Orchid City', 'Verdant Southeast', 'Dawn Coast', 2208, 1188, 1, 'city', 'Safe Zone'),
    exactMapSite('alt-silverroot-mine', 'Silverroot Mine', 'Verdant Southeast', 'Amethyst Range', 1776, 1104, 2, 'mine', 'Danger Zone'),

    // Southern Wildlands — forest realms, caldera towns, frontier roads and lost strongholds.
    exactMapSite('alt-nightpine-city', 'Nightpine City', 'Southern Wildlands', 'Blackwood Interior', 552, 1260, 1, 'city', 'Neutral Zone'),
    exactMapSite('alt-blue-crater-village', 'Blue Crater Village', 'Southern Wildlands', 'Western Caldera', 432, 1332, 2, 'village', 'Safe Zone'),
    exactMapSite('alt-ashen-wyrm-fort', 'Ashen Wyrm Fort', 'Southern Wildlands', 'Ashen Peninsula', 1080, 1422, 1, 'fortress', 'Danger Zone'),
    exactMapSite('alt-wild-king-road', 'Wild King Road', 'Southern Wildlands', 'Wyrmroad', 816, 1320, 2, 'road', 'Neutral Zone'),
    exactMapSite('alt-obsidian-lake', 'Obsidian Lake', 'Southern Wildlands', 'Western Caldera', 504, 1386, 2, 'lake', 'Danger Zone'),
    exactMapSite('alt-wolfroot-village', 'Wolfroot Village', 'Southern Wildlands', 'Duskpine Forest', 456, 1458, 2, 'village', 'Neutral Zone'),
    exactMapSite('alt-giant-antler-grove', 'Giant Antler Grove', 'Southern Wildlands', 'Duskpine Forest', 624, 1458, 2, 'grove', 'Danger Zone'),
    exactMapSite('alt-dustwind-market', 'Dustwind Market', 'Southern Wildlands', 'Eastern Dustmarch', 984, 1386, 2, 'market', 'Neutral Zone'),
    exactMapSite('alt-lost-titan-watch', 'Lost Titan Watch', 'Southern Wildlands', 'Eastern Dustmarch', 1128, 1278, 2, 'ruin', 'Danger Zone'),
    exactMapSite('alt-black-feather-abbey', 'Black Feather Abbey', 'Southern Wildlands', 'Blackwood Interior', 672, 1242, 2, 'abbey', 'Neutral Zone'),
    exactMapSite('alt-greenfire-swamp', 'Greenfire Swamp', 'Southern Wildlands', 'Duskpine Forest', 744, 1422, 2, 'swamp', 'Danger Zone'),
    exactMapSite('alt-caldera-crown', 'Caldera Crown', 'Southern Wildlands', 'Western Caldera', 384, 1206, 1, 'fortress', 'Danger Zone'),
    exactMapSite('alt-southtail-lighthouse', 'Southtail Lighthouse', 'Southern Wildlands', 'Ashen Peninsula', 1128, 1512, 2, 'lighthouse', 'Safe Zone'),
    exactMapSite('alt-ironbark-quarry', 'Ironbark Quarry', 'Southern Wildlands', 'Blackwood Interior', 744, 1278, 2, 'mine', 'Danger Zone'),
    exactMapSite('alt-bone-road-camp', 'Bone Road Camp', 'Southern Wildlands', 'Wyrmroad', 864, 1458, 2, 'camp', 'Neutral Zone'),
    exactMapSite('alt-thunder-mesa', 'Thunder Mesa', 'Southern Wildlands', 'Eastern Dustmarch', 1032, 1242, 2, 'mesa', 'Danger Zone'),
    exactMapSite('alt-deepwood-shrine', 'Deepwood Shrine', 'Southern Wildlands', 'Duskpine Forest', 576, 1512, 2, 'shrine', 'Neutral Zone'),
    exactMapSite('alt-crimson-tail-port', 'Crimson Tail Port', 'Southern Wildlands', 'Ashen Peninsula', 984, 1530, 1, 'port', 'Safe Zone'),
    exactMapSite('alt-hollow-beast-den', 'Hollow Beast Den', 'Southern Wildlands', 'Blackwood Interior', 816, 1206, 2, 'lair', 'Danger Zone'),
    exactMapSite('alt-old-caldera-aqueduct', 'Old Caldera Aqueduct', 'Southern Wildlands', 'Western Caldera', 552, 1332, 2, 'ruin', 'Neutral Zone'),

    // Inner Sea Archipelago — ports, island cities, reefs, shrines, prisons and sea lanes.
    exactMapSite('alt-coral-crown-city', 'Coral Crown City', 'Inner Sea Archipelago', 'Pearlchain Isles', 1512, 1440, 1, 'island-city', 'Safe Zone'),
    exactMapSite('alt-stormglass-harbor', 'Stormglass Harbor', 'Inner Sea Archipelago', 'Crosswind Channel', 1200, 1368, 1, 'port', 'Safe Zone'),
    exactMapSite('alt-seven-sails-market', 'Seven Sails Market', 'Inner Sea Archipelago', 'Central Passage', 1392, 1260, 2, 'market', 'Safe Zone'),
    exactMapSite('alt-moonwake-island', 'Moonwake Island', 'Inner Sea Archipelago', 'Western Inner Sea', 960, 1080, 2, 'island', 'Neutral Zone'),
    exactMapSite('alt-turtleback-fort', 'Turtleback Fort', 'Inner Sea Archipelago', 'Roundhold Waters', 984, 1224, 1, 'island-fortress', 'Neutral Zone'),
    exactMapSite('alt-siren-bone-reef', 'Siren Bone Reef', 'Inner Sea Archipelago', 'Whispering Reefs', 1680, 1512, 2, 'reef', 'Danger Zone'),
    exactMapSite('alt-pearl-diver-village', 'Pearl Diver Village', 'Inner Sea Archipelago', 'Pearlchain Isles', 1584, 1530, 2, 'village', 'Safe Zone'),
    exactMapSite('alt-drowned-oracle-temple', 'Drowned Oracle Temple', 'Inner Sea Archipelago', 'Oracle Waters', 1248, 1224, 2, 'ruin', 'Danger Zone'),
    exactMapSite('alt-black-sail-prison', 'Black Sail Prison', 'Inner Sea Archipelago', 'Black Compass Sea', 1488, 1350, 1, 'prison', 'Danger Zone'),
    exactMapSite('alt-lantern-tideway', 'Lantern Tideway', 'Inner Sea Archipelago', 'Lantern Sea', 1320, 1566, 2, 'sea-route', 'Neutral Zone'),
    exactMapSite('alt-whale-song-sanctuary', 'Whale-Song Sanctuary', 'Inner Sea Archipelago', 'Southsea Isles', 1800, 1620, 2, 'sanctuary', 'Neutral Zone'),
    exactMapSite('alt-ruby-atoll', 'Ruby Atoll', 'Inner Sea Archipelago', 'Southsea Isles', 1920, 1656, 2, 'atoll', 'Neutral Zone'),
    exactMapSite('alt-gullwatch-tower', 'Gullwatch Tower', 'Inner Sea Archipelago', 'Crosswind Channel', 1296, 1320, 2, 'tower', 'Safe Zone'),
    exactMapSite('alt-dead-mariners-cove', "Dead Mariners' Cove", 'Inner Sea Archipelago', 'Black Compass Sea', 1536, 1404, 2, 'cove', 'Danger Zone'),
    exactMapSite('alt-blue-bell-isle', 'Blue Bell Isle', 'Inner Sea Archipelago', 'Western Inner Sea', 888, 1026, 2, 'island', 'Safe Zone'),
    exactMapSite('alt-sea-dragon-gate', 'Sea Dragon Gate', 'Inner Sea Archipelago', 'Central Passage', 1440, 1170, 1, 'sea-gate', 'Neutral Zone'),
    exactMapSite('alt-far-south-lighthouse', 'Far South Lighthouse', 'Inner Sea Archipelago', 'Southsea Isles', 1728, 1692, 2, 'lighthouse', 'Safe Zone'),
    exactMapSite('alt-shattered-compass-wreck', 'Shattered Compass Wreck', 'Inner Sea Archipelago', 'Black Compass Sea', 1608, 1458, 2, 'shipwreck', 'Danger Zone'),
    exactMapSite('alt-sunrise-pearl-port', 'Sunrise Pearl Port', 'Inner Sea Archipelago', 'Pearlchain Isles', 1656, 1566, 1, 'port', 'Safe Zone'),
    exactMapSite('alt-mist-chain-islands', 'Mist Chain Islands', 'Inner Sea Archipelago', 'Lantern Sea', 1200, 1602, 2, 'archipelago', 'Neutral Zone'),
];
const ALTERNATE_WORLD_LOCATIONS = [...ALTERNATE_PRESENT_LOCATIONS, ...ALTERNATE_NEW_LOCATIONS];

const ALL_WORLD_LOCATIONS = [...PRESENT_WORLD_LOCATIONS, ...ALTERNATE_WORLD_LOCATIONS];
const WORLD_LOCATIONS = PRESENT_WORLD_LOCATIONS;
const WORLD = Object.fromEntries([...new Set(ALL_WORLD_LOCATIONS.map(location => location.continent))].map(continent => [
    continent, ALL_WORLD_LOCATIONS.filter(location => location.continent === continent).map(location => location.name),
]));
const LOCATION_REGIONS = Object.fromEntries(ALL_WORLD_LOCATIONS.map(location => [location.name, location.region]));

function atlasById(id) {
    return WORLD_ATLASES[id] || WORLD_ATLAS;
}

function storyWorldId(state) {
    return atlasById(state?.world?.id).id;
}

function viewedWorldId(state) {
    return WORLD_ATLASES[mapAtlasSelection] ? mapAtlasSelection : storyWorldId(state);
}

function viewedAtlas(state) {
    return atlasById(viewedWorldId(state));
}

function worldLocationsFor(state, viewed = true) {
    const id = viewed ? viewedWorldId(state) : storyWorldId(state);
    return id === 'alternate-present-world' ? ALTERNATE_WORLD_LOCATIONS : PRESENT_WORLD_LOCATIONS;
}

function worldContinentsFor(state, viewed = true) {
    const id = viewed ? viewedWorldId(state) : storyWorldId(state);
    return id === 'alternate-present-world' ? ALTERNATE_WORLD_CONTINENTS : PRESENT_WORLD_CONTINENTS;
}

function pointInsidePolygon(x, y, polygon) {
    let inside = false;
    for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
        const [xi, yi] = polygon[index];
        const [xj, yj] = polygon[previous];
        const crosses = yi > y !== yj > y && x < (xj - xi) * (y - yi) / ((yj - yi) || Number.EPSILON) + xi;
        if (crosses) inside = !inside;
    }
    return inside;
}

function pointIsOnAtlasLand(x, y, worldId = WORLD_ATLAS.id, continentName = '') {
    if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) return false;
    const continents = worldId === 'alternate-present-world' ? ALTERNATE_WORLD_CONTINENTS : PRESENT_WORLD_CONTINENTS;
    const candidates = continentName ? continents.filter(entry => entry.name === continentName) : continents;
    return candidates.some(entry => entry.polygons.some(polygon => pointInsidePolygon(Number(x), Number(y), polygon)));
}

function atlasLocationsByWorld(worldId = WORLD_ATLAS.id) {
    return worldId === 'alternate-present-world' ? ALTERNATE_WORLD_LOCATIONS : PRESENT_WORLD_LOCATIONS;
}

function namedAtlasSite(value, worldId = WORLD_ATLAS.id) {
    const requested = text(value, '', 240).toLocaleLowerCase();
    if (!requested || /^(?:unknown|ไม่ทราบ|ไม่แน่ชัด)$/i.test(requested)) return null;
    const locations = atlasLocationsByWorld(worldId);
    return locations.find(entry => entry.name.toLocaleLowerCase() === requested)
        || [...locations].sort((a, b) => b.name.length - a.name.length)
            .find(entry => requested.includes(entry.name.toLocaleLowerCase()));
}

// AI/Character Life coordinates are accepted only when they are on the declared
// atlas landmass. Ocean mistakes fall back to a canonical named destination;
// genuinely unknown records stay hidden instead of receiving a random point.
function landSafeMapPoint({ worldId = WORLD_ATLAS.id, x = null, y = null, location = '', continent = '' } = {}) {
    const safeWorldId = WORLD_ATLASES[worldId] ? worldId : WORLD_ATLAS.id;
    const site = namedAtlasSite(location, safeWorldId);
    const numericX = optionalNumber(x, null, 0, WORLD_MAP_WIDTH);
    const numericY = optionalNumber(y, null, 0, WORLD_MAP_HEIGHT);
    const continentName = text(continent, site?.continent || '', 120);
    if (numericX !== null && numericY !== null && pointIsOnAtlasLand(numericX, numericY, safeWorldId, continentName)) {
        return { x: numericX, y: numericY, site };
    }
    if (site) return { x: site.x, y: site.y, site };
    if (numericX === null || numericY === null) return null;
    const locations = atlasLocationsByWorld(safeWorldId)
        .filter(entry => pointIsOnAtlasLand(entry.x, entry.y, safeWorldId, entry.continent));
    const pool = continentName ? locations.filter(entry => entry.continent === continentName) : locations;
    const nearest = (pool.length ? pool : locations).reduce((best, entry) => {
        const distance = Math.hypot(entry.x - numericX, entry.y - numericY);
        return !best || distance < best.distance ? { entry, distance } : best;
    }, null)?.entry;
    return nearest ? { x: nearest.x, y: nearest.y, site: nearest } : null;
}

function allMapLocation(id) {
    return ALL_WORLD_LOCATIONS.find(location => location.id === id);
}

function cleanDiscoveredLocations(values) {
    return Array.isArray(values)
        ? [...new Set(values.map(value => String(value || '').trim().slice(0, 120)).filter(Boolean))].slice(0, 500)
        : [];
}

function discoveredLocationsFor(state, worldId = storyWorldId(state)) {
    const location = state?.location || {};
    const scoped = location.discoveredByWorld?.[worldId];
    if (Array.isArray(scoped)) return cleanDiscoveredLocations(scoped);
    return worldId === storyWorldId(state) ? cleanDiscoveredLocations(location.discovered) : [];
}

function setDiscoveredLocations(state, values, worldId = storyWorldId(state)) {
    if (!state?.location || !WORLD_ATLASES[worldId]) return [];
    const next = cleanDiscoveredLocations(values);
    state.location.discoveredByWorld = {
        ...(state.location.discoveredByWorld && typeof state.location.discoveredByWorld === 'object' ? state.location.discoveredByWorld : {}),
        [worldId]: next,
    };
    if (worldId === storyWorldId(state)) state.location.discovered = [...next];
    return next;
}

function addDiscoveredLocation(state, value, worldId = storyWorldId(state)) {
    const name = String(value || '').trim().slice(0, 120);
    if (!name) return false;
    setDiscoveredLocations(state, [...discoveredLocationsFor(state, worldId), name], worldId);
    return true;
}

function synchronizeActiveWorldDiscovery(state) {
    if (!state?.location) return;
    const worldId = storyWorldId(state);
    setDiscoveredLocations(state, discoveredLocationsFor(state, worldId), worldId);
}

function npcAtlasKnowledge(state) {
    const atlas = atlasById(state?.world?.id);
    const locations = worldLocationsFor(state, false);
    const regions = {};
    for (const location of locations) {
        regions[location.continent] ||= {};
        regions[location.continent][location.region] ||= [];
        regions[location.continent][location.region].push(location.name);
    }
    return {
        activeWorld: { id: atlas.id, name: atlas.name, era: atlas.era },
        isolationRule: 'This catalog contains only the active timeline. Never give an NPC knowledge of destinations from another world unless the story explicitly establishes that NPC has crossed worlds or received reliable inter-world information.',
        knowledgeRule: 'These names are canonical geography, not universal personal knowledge. Judge what an individual NPC knows from origin, occupation, travel, education and established discoveries; do not reveal secret or dangerous sites without a plausible source.',
        currentLocation: {
            continent: state.location.continent, region: state.location.region, place: state.location.place,
            discovered: discoveredLocationsFor(state, atlas.id),
        },
        regions,
    };
}
const COLOR_PRESETS = {
    forge: { accent: '#d6b458', alt: '#f4dc93', ink: '#ece7da', surface: '#040404' },
    abyss: { accent: '#4fb8d8', alt: '#a8ecff', ink: '#e2eef2', surface: '#03080c' },
    ember: { accent: '#d2624a', alt: '#ffb096', ink: '#f4e7e2', surface: '#0a0403' },
    verdant: { accent: '#79b463', alt: '#c6f0a8', ink: '#e8f0e2', surface: '#030704' },
    amethyst: { accent: '#a077d4', alt: '#dcc2ff', ink: '#ebe6f2', surface: '#06040a' },
    frost: { accent: '#8fa8c8', alt: '#dbe8f8', ink: '#e9eef4', surface: '#04060a' },
    bloodmoon: { accent: '#b8434f', alt: '#ff8f9c', ink: '#f2e2e4', surface: '#080203' },
    parchment: { accent: '#9a7d2e', alt: '#c9a94a', ink: '#26241d', surface: '#e8e4d8' },
    daylight: { accent: '#8a6a1f', alt: '#b8933a', ink: '#22242a', surface: '#eceef1' },
    seafoam: { accent: '#3f8f7a', alt: '#8fd8c2', ink: '#1e2725', surface: '#e6efec' },
};

const DEFAULT_SETTINGS = Object.freeze({
    showWandLauncher: true,
    autoTrack: true,
    injectState: true,
    language: 'en',
    interactionMode: 'hidden',
    activityIndicator: 'full',
    themePreset: 'forge',
    accentColor: '#d6b458',
    accentAltColor: '#f4dc93',
    inkColor: '#ece7da',
    surfaceColor: '#040404',
    glassOpacity: 86,
    glowStrength: 38,
    auraColor: '#6f8fe8',
    density: 'compact',
    eventNotifications: true,
    notificationDuration: 6000,
    notifyExperience: true,
    notifyLevel: true,
    notifyLearning: true,
    notifyCombat: true,
    notifyKills: true,
    notifyCurrency: true,
    notifyQuests: true,
    showTravelTracker: true,
    travelTrackerPosition: { x: null, y: null },
    autoContinuity: true,
    showNpcMapMarkers: true,
    mapHdMode: false,
    visualVersion: 6,
});

const LAUNCHER_BIND_VERSION = '0.29.2';
const TAB_ORDER = ['status', 'scene', 'inventory', 'skills', 'techniques', 'quests', 'rank', 'groups', 'household', 'map', 'npcs', 'mail', 'music', 'systems'];
const TAB_META = {
    status: ['fa-solid fa-user', 'Status'], scene: ['fa-solid fa-cloud-sun', 'Scene'],
    inventory: ['fa-solid fa-box-open', 'Inventory'], skills: ['fa-solid fa-layer-group', 'Skills'],
    techniques: ['fa-solid fa-fire-flame-curved', 'Powers'], quests: ['fa-solid fa-scroll', 'Quests'],
    rank: ['fa-solid fa-medal', 'Rank'], map: ['fa-solid fa-map', 'World Map'],
    groups: ['fa-solid fa-people-group', 'Party & Guild'], household: ['fa-solid fa-house-chimney-user', 'Household'],
    npcs: ['fa-solid fa-users', 'NPCs'], mail: ['fa-solid fa-envelope', 'Mailbox'], music: ['fa-solid fa-music', 'Music'],
    systems: ['fa-solid fa-microchip', 'System Audit'],
};
let activeTabIndex = 0;
let activeQuestSection = 'active';
let characterLifeSkillSyncTimer = null;
let characterLifeCompatibilityTimer = null;
let characterLifeCompatibilityOptions = { save: false };
let auraColorSettingTimer = 0;

const TRANSLATIONS = {
    th: {
        'Tretaresia Role-play': 'ระบบโรลเพลย์ Tretaresia', 'World ledger': 'บันทึกโลก', Powers: 'พลัง',
        'Magic interface': 'อินเทอร์เฟซเวทมนตร์',
        'Synchronizing world state': 'กำลังเชื่อมข้อมูลโลก',
        'Connecting to the active role-play...': 'กำลังเชื่อมต่อกับโรลเพลย์ปัจจุบัน...',
        Ready: 'พร้อม', Status: 'สถานะ', Scene: 'ฉาก', Inventory: 'คลังสิ่งของ', Skills: 'ทักษะ', Quests: 'ภารกิจ', Rank: 'อันดับ', 'World Map': 'แผนที่โลก', 'System Audit': 'ตรวจสอบระบบ',
        Music: 'เพลง', Mailbox: 'กล่องจดหมาย', Contacts: 'รายชื่อ', Letters: 'จดหมาย', NPCs: 'ตัวละคร NPC', 'NPC Codex': 'สารบบ NPC', Techniques: 'วิชา',
        'Party & Guild': 'ปาร์ตี้และกิลด์', Household: 'ครอบครัว', 'Friendly NPCs': 'NPC ฝ่ายมิตร', 'Choose a friendly NPC': 'เลือก NPC ฝ่ายมิตร', Member: 'สมาชิก', party: 'ปาร์ตี้', guilds: 'กิลด์',
        'Waiting for chat': 'กำลังรอแชต', 'Sync latest turn': 'ซิงก์เหตุการณ์ล่าสุด', 'System interface': 'ข้อมูลระบบ',
        'Current persona': 'ตัวตนปัจจุบัน', 'Guild rank': 'อันดับกิลด์', 'Vital status': 'สถานะพลังชีวิต', Identity: 'ข้อมูลส่วนตัว',
        Health: 'พลังชีวิต', Mana: 'มานา', 'Aura / Mana': 'ออร่า / มานา', 'Divine Mana': 'มานาเทพ', Stamina: 'พละกำลัง', Hunger: 'ความอิ่ม', Thirst: 'ความชุ่มชื้น', 'Aura color': 'สีออร่า', Boundless: 'ไร้ขีดจำกัด', Race: 'เผ่าพันธุ์', Age: 'อายุ', Guild: 'กิลด์', Party: 'ปาร์ตี้',
        'Home continent': 'ทวีปบ้านเกิด', Standing: 'ฐานะ', Hair: 'เส้นผม', Eyes: 'ดวงตา', Height: 'ส่วนสูง', Build: 'รูปร่าง',
        Profession: 'อาชีพ', 'Power type': 'ประเภทพลัง', 'Origin skill': 'สกิลกำเนิด', 'Active effects': 'สถานะผิดปกติ', 'Combat comparison': 'เปรียบเทียบการต่อสู้',
        'Turn Inspector': 'ตัวตรวจสอบแต่ละเทิร์น', Diagnostics: 'วินิจฉัยระบบ', 'Repair current state': 'ซ่อมข้อมูลปัจจุบัน', 'Rollback latest turn': 'ย้อนเทิร์นล่าสุด',
        'Damage breakdown': 'รายละเอียดความเสียหาย', 'Regional weather': 'สภาพอากาศรายภูมิภาค', 'NPC knowledge': 'ข้อมูลที่ NPC รู้',
        'Current region': 'ภูมิภาคปัจจุบัน', 'Exact place': 'สถานที่ปัจจุบัน', 'Edit status': 'แก้ไขสถานะ', Name: 'ชื่อ', Title: 'ฉายา',
        Condition: 'สภาพร่างกาย', Level: 'เลเวล', 'Day phase': 'ช่วงเวลา', 'World time': 'เวลาโลก', 'World day': 'วันที่', 'Zone type': 'ประเภทเขต',
        'Scene Tracker': 'ระบบติดตามฉาก', 'Live environment and position': 'สภาพแวดล้อมและตำแหน่งปัจจุบัน', 'Day name': 'ชื่อวัน', 'Day counter': 'จำนวนวันที่ผ่านไป',
        'Current place': 'สถานที่ปัจจุบัน', 'Current location detail': 'จุดที่อยู่โดยละเอียด', 'Scene position': 'ตำแหน่งในฉาก', Weather: 'สภาพอากาศ', Temperature: 'อุณหภูมิ', 'Save scene': 'บันทึกฉาก',
        'Local Structure Map': 'แผนผังสถานที่', 'AI-assisted SVG floor plan': 'แผนผัง SVG ที่ AI ช่วยอัปเดต', 'No structure map yet.': 'ยังไม่มีแผนผังสถานที่',
        'Create structure map': 'สร้างแผนผัง', 'Map name': 'ชื่อแผนผัง', 'Associated place': 'สถานที่ที่เชื่อมโยง', 'First floor': 'ชั้นแรก',
        Floor: 'ชั้น', 'Floor name': 'ชื่อชั้น', 'Add floor': 'เพิ่มชั้น', Rooms: 'ห้อง', Connections: 'ทางเชื่อม', 'Add room': 'เพิ่มห้อง', 'Room name': 'ชื่อห้อง',
        'Room type': 'ประเภทห้อง', 'X position': 'ตำแหน่ง X', 'Y position': 'ตำแหน่ง Y', Width: 'ความกว้าง', Height: 'ความสูง', 'Save room': 'บันทึกห้อง',
        'Current room': 'ห้องปัจจุบัน', 'Set current room': 'ตั้งห้องปัจจุบัน', 'Add connection': 'เพิ่มทางเชื่อม', 'From room': 'จากห้อง', 'To room': 'ไปยังห้อง',
        'Connection type': 'ประเภททางเชื่อม', 'Edit floor plan': 'แก้ไขแผนผัง', 'Lock map': 'ล็อกแผนผัง', 'Unlock map': 'ปลดล็อกแผนผัง',
        'Map locked': 'แผนผังถูกล็อก', 'AI updates enabled': 'เปิดการอัปเดตโดย AI', 'Drag unlocked rooms to reposition them.': 'ลากห้องที่ไม่ได้ล็อกเพื่อย้ายตำแหน่ง',
        'Delete map': 'ลบแผนผัง', 'Delete floor': 'ลบชั้น', 'Delete room': 'ลบห้อง', Discovered: 'ค้นพบแล้ว', Locked: 'ล็อก',
        Room: 'ห้อง', Hall: 'โถง', Corridor: 'ทางเดิน', Stairs: 'บันได', Entrance: 'ทางเข้า', Garden: 'สวน', Utility: 'พื้นที่ใช้งาน', Unknown: 'ไม่ทราบ',
        Door: 'ประตู', Passage: 'ทางผ่าน', Archway: 'ซุ้มทางผ่าน', Window: 'หน้าต่าง',
        'HP max': 'HP สูงสุด', 'MP max': 'MP สูงสุด', 'Stamina max': 'พละกำลังสูงสุด', 'Save status': 'บันทึกสถานะ',
        'Add inventory item': 'เพิ่มสิ่งของ', 'Item name': 'ชื่อสิ่งของ', Quantity: 'จำนวน', Category: 'หมวดหมู่', Description: 'รายละเอียด', 'Add item': 'เพิ่มสิ่งของ',
        'Skill Storage': 'คลังทักษะ', 'All acquired user skills': 'ทักษะทั้งหมดของผู้เล่น', 'Add skill': 'เพิ่มทักษะ', 'Skill name': 'ชื่อทักษะ', Type: 'ประเภท',
        'Quest Log': 'บันทึกภารกิจ', 'Add quest': 'เพิ่มภารกิจ', 'Quest name': 'ชื่อภารกิจ', 'Quest type': 'ประเภทภารกิจ', 'Dungeon rank': 'ระดับดันเจี้ยน', Objective: 'เป้าหมาย', Reward: 'รางวัล',
        STORY: 'เนื้อเรื่องหลัก', 'SIDE-STORY': 'เนื้อเรื่องรอง', 'ACTIVE MISSION': 'ภารกิจที่กำลังทำ', 'COMPLETED MISSION': 'ภารกิจสำเร็จ', 'FAILED MISSION': 'ภารกิจล้มเหลว',
        'Reward claimed': 'รับรางวัลแล้ว', 'Mission archive': 'คลังบันทึกภารกิจ',
        'Ranks & Progression': 'อันดับและความก้าวหน้า', 'Guild and mastery record': 'บันทึกอันดับกิลด์และความชำนาญ', 'Adventurer Rank': 'อันดับนักผจญภัย', 'Custom rank name': 'ชื่ออันดับเฉพาะตัว',
        'Power mastery': 'ความชำนาญพลัง', 'Combat mastery': 'ความชำนาญการต่อสู้', 'Power & Combat': 'พลังและการต่อสู้', 'Power systems': 'ระบบพลัง', 'Combat disciplines': 'ศาสตร์การต่อสู้',
        'Recognized guild classification': 'ระดับที่กิลด์รับรอง', 'Magic mastery': 'ความชำนาญเวทมนตร์', 'Sword mastery': 'ความชำนาญดาบ', Experience: 'ค่าประสบการณ์', Reputation: 'ชื่อเสียง',
        Gold: 'เหรียญทอง', Silver: 'เหรียญเงิน', Copper: 'เหรียญทองแดง', 'Gold coins': 'เหรียญทอง', 'Silver coins': 'เหรียญเงิน', 'Copper coins': 'เหรียญทองแดง',
        'Transaction history': 'ประวัติธุรกรรม', 'No transactions recorded yet.': 'ยังไม่มีธุรกรรม', 'Balance after': 'ยอดคงเหลือหลังรายการ',
        'Inventory Logs': 'ประวัติคลังสิ่งของ', 'Item changes': 'การเปลี่ยนแปลงไอเทม', 'No inventory changes recorded yet.': 'ยังไม่มีการเปลี่ยนแปลงไอเทม',
        Journal: 'บันทึกระบบ', 'System history': 'ประวัติระบบ', 'No journal entries yet.': 'ยังไม่มีบันทึกระบบ', 'State updated': 'อัปเดตข้อมูลแล้ว',
        'Journey Logs': 'บันทึกการเดินทาง', 'Story milestones': 'หมุดหมายเรื่องราว', 'No journey logs yet.': 'ยังไม่มีบันทึกการเดินทาง',
        'Add journey log': 'เพิ่มบันทึก', 'Edit log': 'แก้ไขบันทึก', 'Delete log': 'ลบบันทึก', 'Save log': 'บันทึก', 'What happened': 'เกิดอะไรขึ้น', 'Journey log saved.': 'บันทึกการเดินทางแล้ว',
        'Edit progression': 'แก้ไขความก้าวหน้า', 'Adventurer rank': 'อันดับนักผจญภัย',
        'Magic rank': 'ระดับเวทมนตร์', 'Sword rank': 'ระดับดาบ', 'EXP to next level': 'EXP สำหรับเลเวลถัดไป', 'Save progression': 'บันทึกความก้าวหน้า',
        'Tretaresia World Atlas': 'แผนที่โลก Tretaresia', 'Present World': 'โลกปัจจุบัน', 'Present Era': 'ยุคปัจจุบัน', 'Alternate Present World TRETARESIA': 'โลกปัจจุบันคู่ขนาน TRETARESIA', 'Alternate Present Era': 'ยุคปัจจุบันคู่ขนาน', 'World map': 'แผนที่โลก', 'Atlas browsing mode': 'โหมดดูแผนที่', 'Travel becomes available when the story enters this world.': 'จะเดินทางในแผนที่นี้ได้เมื่อเนื้อเรื่องเข้าสู่โลกนี้', World: 'โลก', Era: 'ยุค', 'Character positions': 'ตำแหน่งตัวละคร', You: 'คุณ', 'Unknown coordinates': 'ไม่ทราบพิกัด', 'No Character Life positions yet.': 'ยังไม่มีตำแหน่งจาก Character Life',
        'Map lighting': 'ช่วงเวลาของแผนที่', 'Day map': 'แผนที่กลางวัน', 'Night map': 'แผนที่กลางคืน', 'Selected location': 'สถานที่ที่เลือก', Region: 'ภูมิภาค', Discovery: 'การค้นพบ', Marker: 'หมุด',
        Journey: 'การเดินทาง', Origin: 'ต้นทาง', 'Travel route': 'เส้นทางเดินทาง', 'Remaining travel': 'เวลาที่เหลือ', days: 'วัน', 'Estimated travel days': 'จำนวนวันเดินทางโดยประมาณ', 'Begin journey': 'เริ่มออกเดินทาง',
        'Currency / region': 'สกุลเงิน / ภูมิภาค', 'High denomination': 'หน่วยมูลค่าสูง', 'Standard denomination': 'หน่วยมาตรฐาน', 'Fractional denomination': 'หน่วยย่อย',
        Recorded: 'บันทึกแล้ว', Unexplored: 'ยังไม่สำรวจ', Pinned: 'ปักหมุดแล้ว', None: 'ไม่มี', Destination: 'จุดหมาย', 'Exact place / scene': 'สถานที่หรือฉากโดยละเอียด',
        'Location detail': 'รายละเอียดสถานที่', 'Travel and notify chat': 'เดินทางและแจ้งในโรลเพลย์', 'Marker label': 'ชื่อหมุด', 'Marker note': 'บันทึกหมุด', 'Mark location': 'ปักหมุดสถานที่',
        Current: 'ปัจจุบัน', Discovered: 'ค้นพบแล้ว', Marked: 'ปักหมุด', 'Drag to pan · Pinch or scroll to zoom': 'ลากเพื่อเลื่อน · จีบนิ้วหรือเลื่อนเพื่อซูม',
        'Living NPCs': 'NPC ที่มีชีวิต', 'Show NPC markers': 'แสดงตำแหน่ง NPC', 'Hide NPC markers': 'ซ่อนตำแหน่ง NPC', 'Life mode': 'โหมดการใช้ชีวิต', Activity: 'กิจกรรมปัจจุบัน',
        'Active life': 'ใช้ชีวิตอัตโนมัติ', 'Story only': 'อัปเดตเมื่ออยู่ในเรื่อง', Paused: 'หยุดการอัปเดต', 'Show on World Map': 'แสดงบนแผนที่โลก', 'Open NPC dossier': 'เปิดข้อมูล NPC',
        Morning: 'เช้า', Afternoon: 'บ่าย', Evening: 'เย็น', Night: 'กลางคืน', 'Safe Zone': 'เขตปลอดภัย', 'Neutral Zone': 'เขตเป็นกลาง', 'Danger Zone': 'เขตอันตราย', 'Unknown Zone': 'เขตไม่ทราบข้อมูล',
        Rookie: 'มือใหม่', Basic: 'พื้นฐาน', Ember: 'เอมเบอร์', 'Custom Rank': 'อันดับเฉพาะตัว', Dormant: 'หลับใหล', Initiate: 'เริ่มฝึก', Practiced: 'ฝึกฝนแล้ว', Adept: 'ชำนาญ', Expert: 'เชี่ยวชาญ', Master: 'ปรมาจารย์', Grandmaster: 'มหาปรมาจารย์', Mythic: 'ระดับตำนาน',
        Active: 'กำลังดำเนินการ', Completed: 'สำเร็จ', Failed: 'ล้มเหลว', 'On Hold': 'พักไว้', Beginner: 'เริ่มต้น', Intermediate: 'กลาง', Advanced: 'ขั้นสูง', Saint: 'เซนต์', King: 'คิง', Emperor: 'จักรพรรดิ', God: 'เทพ',
        'No description': 'ไม่มีรายละเอียด', 'No objective recorded': 'ยังไม่ได้บันทึกเป้าหมาย', 'Your inventory is empty.': 'คลังสิ่งของยังว่างอยู่',
        'Skills learned during role-play will appear here.': 'ทักษะที่เรียนรู้ระหว่างโรลเพลย์จะแสดงที่นี่', 'No quests have been recorded yet.': 'ยังไม่มีภารกิจที่ถูกบันทึก',
        'Open a chat to activate this system': 'เปิดแชตเพื่อใช้งานระบบ', 'Reading latest turn': 'กำลังอ่านเหตุการณ์ล่าสุด', 'AI synchronized': 'ซิงก์กับ AI แล้ว', 'State updated': 'อัปเดตข้อมูลแล้ว', 'Sync unavailable': 'ไม่สามารถซิงก์ได้',
        Appearance: 'รูปแบบหน้าจอ', Accent: 'สีหลัก', Glass: 'ความโปร่งใส', Glow: 'แสงเรือง', Density: 'ความหนาแน่น', Language: 'ภาษา', 'Action delivery': 'รูปแบบการส่งคำสั่ง',
        Compact: 'กระชับ', Comfortable: 'สบายตา', Hidden: 'ซ่อนข้อความ', Visible: 'แสดงข้อความ', 'Draft only': 'ร่างเท่านั้น',
        'Activity indicator': 'ตัวแจ้งสถานะการทำงาน', Full: 'แสดงเต็ม', Off: 'ปิด',
        'Waiting for AI': 'กำลังรอ AI', 'Checking reply': 'กำลังตรวจคำตอบ', 'No state changes': 'ไม่มีข้อมูลเปลี่ยนแปลง',
        'Reply received': 'ได้รับคำตอบแล้ว', 'Tracking is off': 'ปิดการติดตามอยู่', 'Waiting for first reply': 'รอคำตอบแรกของผู้เล่น',
        'Hidden action sent': 'ส่งคำสั่งแบบซ่อนแล้ว', 'Visible message sent': 'ส่งข้อความแบบแสดงแล้ว', 'Draft prepared': 'เตรียมข้อความร่างแล้ว',
        'Choose profile picture': 'เลือกรูปโปรไฟล์', 'Use in role-play': 'ใช้ในโรลเพลย์', Remove: 'ลบ', 'Pursue in role-play': 'ดำเนินภารกิจในโรลเพลย์',
        'Adjust portrait': 'จัดตำแหน่งรูป', 'Desktop framing': 'กรอบภาพ PC', 'Phone framing': 'กรอบภาพมือถือ',
        Horizontal: 'แนวนอน', Vertical: 'แนวตั้ง', Zoom: 'ซูม', 'Save framing': 'บันทึกกรอบภาพ',
        'Magic disciplines': 'สาขาเวทมนตร์', 'Sword schools': 'สำนักดาบ', Proficiency: 'ความชำนาญ', 'Proficiency rank': 'ระดับความชำนาญ',
        'Custom proficiency': 'ความชำนาญกำหนดเอง', 'Preset discipline': 'สาขาพื้นฐาน', 'Preset style': 'สำนักพื้นฐาน', 'Mastery Archive': 'สารบบความชำนาญ',
        'Known disciplines and styles': 'สาขาและสำนักที่รู้จัก', 'Active proficiencies': 'ความชำนาญที่ใช้งาน', entries: 'รายการ', custom: 'กำหนดเอง',
        'Add magic proficiency': 'เพิ่มความชำนาญเวทมนตร์', 'Add sword style': 'เพิ่มสำนักดาบ', 'Magic name': 'ชื่อเวทมนตร์', 'Sword style name': 'ชื่อสำนักดาบ', 'Icon preset': 'ไอคอนสำเร็จรูป',
        'A dash means the stat has not been revealed yet.': 'เครื่องหมายขีดหมายถึงค่าสถานะนั้นยังไม่ถูกเปิดเผย',
        'Add technique': 'เพิ่มวิชา', 'Technique name': 'ชื่อวิชา', Category: 'หมวดหมู่', 'Save proficiency': 'บันทึกความชำนาญ',
        Playlist: 'เพลย์ลิสต์', 'Add audio files': 'เพิ่มไฟล์เสียง', 'No tracks in this chat.': 'ยังไม่มีเพลงในแชทนี้',
        'Stored locally on this device': 'เก็บไว้ในอุปกรณ์นี้เท่านั้น', 'Now playing': 'กำลังเล่น',
        Inbox: 'กล่องขาเข้า', Unread: 'ยังไม่อ่าน', Read: 'อ่านแล้ว', Sent: 'ส่งแล้ว', 'Add contact': 'เพิ่มรายชื่อ', 'Compose letter': 'เขียนจดหมาย',
        Subject: 'หัวข้อ', Message: 'เนื้อหา', 'Send letter': 'ส่งจดหมาย', Reply: 'ตอบกลับ', Close: 'ปิด', 'Clear letter': 'ลบจดหมาย', Affiliation: 'สังกัด', Relationship: 'ความสัมพันธ์', Notes: 'บันทึก',
        'Add NPC': 'เพิ่ม NPC', 'Edit NPC': 'แก้ไข NPC', 'Save NPC': 'บันทึก NPC', Faction: 'ฝ่าย', Alignment: 'จุดยืน', Occupation: 'อาชีพ', Gender: 'เพศ',
        'Current location': 'ตำแหน่งปัจจุบัน', 'Last seen': 'พบล่าสุด', Affection: 'ความชอบพอ', Trust: 'ความไว้ใจ', Loyalty: 'ความภักดี', Fear: 'ความกลัว', Corruption: 'ความเสื่อมทราม', Lust: 'แรงปรารถนา',
        'Relationship state': 'สถานะความสัมพันธ์', Partner: 'คู่ครอง', 'Marital status': 'สถานภาพ', Children: 'บุตร', 'Family & bonds': 'ครอบครัวและสายสัมพันธ์',
        'Party management': 'จัดการปาร์ตี้', 'Guild management': 'จัดการกิลด์', 'Household management': 'จัดการครอบครัว', 'Create party': 'สร้างปาร์ตี้', 'Dissolve party': 'ยุบปาร์ตี้', 'Invite to party': 'เชิญเข้าปาร์ตี้', 'Create guild': 'สร้างกิลด์', 'Dissolve guild': 'ยุบกิลด์', 'Invite to guild': 'เชิญเข้ากิลด์',
        'Party name': 'ชื่อปาร์ตี้', 'Guild name': 'ชื่อกิลด์', 'Guild description': 'รายละเอียดกิลด์', Members: 'สมาชิก', Leader: 'หัวหน้า', 'No active party': 'ยังไม่มีปาร์ตี้', 'No guilds yet': 'ยังไม่มีกิลด์', 'No household members': 'ยังไม่มีสมาชิกในครอบครัว',
        'Guild creation fee': 'ค่าก่อตั้งกิลด์', 'Creation fee': 'ค่าก่อตั้ง', 'Guild treasury': 'คลังกิลด์', 'Current balance': 'ยอดเงินปัจจุบัน', 'Not enough currency': 'เงินไม่พอ', 'Friendly NPCs only': 'เชิญได้เฉพาะ NPC ฝ่ายมิตร', 'Only friendly NPCs appear here.': 'หน้านี้จะแสดงเฉพาะ NPC ฝ่ายมิตรเท่านั้น', 'Hostile NPCs are excluded from the list.': 'NPC ฝ่ายศัตรูจะไม่แสดงในรายชื่อนี้',
        'Household name': 'ชื่อครอบครัว', 'Add household member': 'เพิ่มสมาชิกครอบครัว', 'Family role': 'บทบาทในครอบครัว', 'Remove member': 'นำสมาชิกออก', 'Save household': 'บันทึกครอบครัว', 'Dissolve this party?': 'ต้องการยุบปาร์ตี้นี้หรือไม่?', 'Dissolve this guild?': 'ต้องการยุบกิลด์นี้หรือไม่?',
        'Core stats': 'ค่าสถานะหลัก', Strength: 'พละกำลัง', Agility: 'ความคล่องตัว', Intelligence: 'สติปัญญา', Endurance: 'ความอดทน',
        Abilities: 'สกิลและความสามารถ', 'Add ability': 'เพิ่มความสามารถ', 'Ability name': 'ชื่อความสามารถ', 'Ability level': 'ระดับความสามารถ',
        Diary: 'ไดอารี', 'Add diary entry': 'เพิ่มบันทึกไดอารี', Thought: 'ความคิด', Mood: 'อารมณ์', 'Custom meters': 'ค่าสถานะกำหนดเอง', 'Add custom meter': 'เพิ่มค่ากำหนดเอง',
        'Link to Mailbox': 'เชื่อมกับ Mailbox', 'Open Mailbox': 'เปิดกล่องจดหมาย', 'Remove portrait': 'ลบรูปตัวละคร',
        'Character continuity': 'การสานต่อตัวละคร', 'Carry this character into new chats automatically': 'นำตัวละครนี้ไปยังแชตใหม่โดยอัตโนมัติ',
        'Export state': 'ส่งออกข้อมูล', 'Import state': 'นำเข้าข้อมูล', 'Portable backup': 'ข้อมูลสำรองแบบพกพา',
        'Control center': 'ศูนย์ควบคุม', Interface: 'อินเทอร์เฟซ', Continuity: 'ความต่อเนื่อง', 'Active module': 'โมดูลปัจจุบัน',
        'Visual controls': 'การตั้งค่าหน้าจอ', 'Character transfer': 'การย้ายข้อมูลตัวละคร', 'Archive index': 'สารบัญระบบ',
        'State and player portrait are included. Device-only NPC portraits and audio are copied automatically only when continuing on this device.': 'รวมข้อมูลและรูปผู้เล่นไว้แล้ว ส่วนรูป NPC และเสียงที่เก็บในอุปกรณ์จะถูกคัดลอกอัตโนมัติเฉพาะเมื่อสานต่อบนอุปกรณ์นี้',
        Custom: 'กำหนดเอง',
        'Locate me': 'หาตำแหน่งฉัน', 'Full map view': 'ดูแผนที่ทั้งหมด',
        'Open fullscreen map': 'เปิดแผนที่เต็มหน้าจอ', 'Close fullscreen map': 'ปิดแผนที่เต็มหน้าจอ',
        Palette: 'ชุดสี', 'Fully customizable': 'ปรับได้ทั้งหมด', 'Theme preset': 'ชุดสีสำเร็จ',
        Accent: 'สีหลัก', Highlight: 'สีเน้น', Text: 'สีตัวอักษร', Surface: 'สีพื้น',
        'Map artwork': 'ลายเส้นแผนที่', Procedural: 'วาดโดยระบบ', 'Tile images': 'ภาพไทล์',
    },
};

let initialized = false;
let previousFocusedElement = null;
let menuObserver = null;
let introTimer = null;
let introGateTimer = null;
let introFinishTimer = null;
let aiSyncInProgress = false;
let pendingSave = Promise.resolve();
let syncQueue = Promise.resolve();
let manualSyncQueued = false;
let tabTransitionToken = 0;
const panelScrollPositions = new Map();
const nestedScrollPositions = new Map();
let panelScrollRestoreToken = 0;
let restoringPanelScroll = false;
let mapSelectionId = null;
let mapDraftPoint = null;
let mapDrawFrame = 0;
let mapDrawTimer = 0;
let mapLastDrawAt = 0;
let mapQueuedPanel = null;
let mapQueuedState = null;
let mapInteracting = false;
let mapInteractionEndTimer = 0;
let mapGestureBase = null;
let mapRenderedPoints = [];
let mapResizeObserver = null;
let mapFullscreen = false;
let mapAtlasSelection = '';
const mapTileCache = new Map();
const mapTileQueue = [];
let mapTileLoads = 0;
let mapTileContext = '';
let openedLetterId = null;
let selectedNpcId = null;
let npcPortraitRenderToken = 0;
let npcEditorObjectUrl = '';
const npcPortraitObjectUrls = new Map();
let characterLifeMapMarkerCache = null;
const mapPortraitCache = new Map();
let mapPortraitUseClock = 0;
let activityHideTimer = null;
let activityState = { mode: 'ready', label: 'Ready', detail: '', visible: false };
let pendingComposerDraft = null;
let audioPlayer = null;
let audioObjectUrl = '';
const mapView = { scale: 1, x: 0, y: 0 };
let continuityRestoreInProgress = false;
let processedAssistantMessages = new WeakMap();
const assistantPatchTimers = new Map();
let assistantRollbackQueue = Promise.resolve();

const uid = () => globalThis.crypto?.randomUUID?.() || `tretaresia-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const clone = value => globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
const shortHash = value => {
    let hash = 2166136261;
    for (const character of String(value ?? '')) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
};
const text = (value, fallback = '', max = 300) => typeof value === 'string' ? value.trim().slice(0, max) : fallback;
const number = (value, fallback = 0, min = 0, max = 999999999) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};
const optionalNumber = (value, fallback = null, min = -999999999, max = 999999999) => {
    if (value === '' || value === null || value === undefined) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};
const html = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

function tr(value) {
    const language = getSettings().language;
    return TRANSLATIONS[language]?.[value] || value;
}

function hexToRgb(hex) {
    const source = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : DEFAULT_SETTINGS.accentColor.slice(1);
    return `${parseInt(source.slice(0, 2), 16)}, ${parseInt(source.slice(2, 4), 16)}, ${parseInt(source.slice(4, 6), 16)}`;
}

function luminance(hex) {
    const channels = hexToRgb(hex).split(',').map(part => Number(part) / 255)
        .map(channel => channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}

function readableOn(hex) {
    return luminance(hex) > .38 ? '#12100a' : '#f8f3e6';
}

function rgbaOf(hex, alpha) {
    return `rgba(${hexToRgb(hex)}, ${alpha})`;
}

function applyAppearance() {
    const settings = getSettings();
    const root = document.documentElement;
    const pairs = {
        '--tretaresia-accent': settings.accentColor,
        '--tretaresia-accent-rgb': hexToRgb(settings.accentColor),
        '--tretaresia-accent-alt': settings.accentAltColor,
        '--tretaresia-accent-alt-rgb': hexToRgb(settings.accentAltColor),
        '--tretaresia-ink': settings.inkColor,
        '--tretaresia-ink-rgb': hexToRgb(settings.inkColor),
        '--tretaresia-surface': settings.surfaceColor,
        '--tretaresia-surface-rgb': hexToRgb(settings.surfaceColor),
        '--tretaresia-on-accent': readableOn(settings.accentAltColor),
        '--tretaresia-glass-opacity': String(settings.glassOpacity / 100),
        '--tretaresia-glow-strength': String(settings.glowStrength / 100),
    };
    for (const [key, value] of Object.entries(pairs)) root.style.setProperty(key, value);
    const light = luminance(settings.surfaceColor) > .45;
    root.style.setProperty('--tretaresia-panel',
        light ? `color-mix(in srgb, ${settings.surfaceColor} 62%, #fff)` : `color-mix(in srgb, ${settings.surfaceColor} 88%, ${settings.inkColor})`);
    for (const node of [
        document.getElementById('tretaresia-rpg-overlay'),
        document.getElementById('tretaresia-control-dialog'),
        document.getElementById('tretaresia-activity-island'),
        document.getElementById('tretaresia-event-stack'),
        document.getElementById('tretaresia-travel-tracker'),
    ]) node?.setAttribute('data-theme', light ? 'light' : 'dark');
    const overlay = document.getElementById('tretaresia-rpg-overlay');
    if (overlay) {
        overlay.dataset.density = settings.density;
        overlay.dataset.language = settings.language;
    }
    const dialog = document.getElementById('tretaresia-control-dialog');
    if (dialog) dialog.dataset.density = settings.density;
    scheduleMapDetailRender();
}

function defaultState() {
    const magic = Object.fromEntries(MAGIC_DISCIPLINES.map(entry => [entry.id, 0]));
    const sword = Object.fromEntries(SWORD_STYLES.map(entry => [entry.id, 0]));
    return {
        version: 1,
        player: {
            name: 'Adventurer', portrait: '', race: 'Human', age: '', title: 'Untitled', profession: 'Adventurer', guild: 'Unaffiliated', party: 'Solo',
            gender: '', homeContinent: '', standing: '', affiliation: '',
            appearance: { hair: '', eyes: '', height: '', build: '' },
            condition: 'Stable', level: 1, powerType: 'Aura', originSkill: 'Unknown / Undiscovered',
            portraitView: { desktop: { x: 50, y: 50, zoom: 1 }, mobile: { x: 50, y: 50, zoom: 1 } },
            hp: { current: 100, max: 100 }, mp: { current: 100, max: 100 }, stamina: { current: 100, max: 100 },
            survival: { hunger: 100, thirst: 100 },
            aura: { color: '#6f8fe8', infinite: false, output: 0, control: 0, efficiency: 0, recovery: 0 },
            fitness: { lungCapacity: 100, aerobicSessions: 0, lastTrainingMessage: '' },
        },
        world: { ...WORLD_ATLAS },
        progression: {
            adventurerRank: 'Rookie', customRankName: '', magicRank: 'Dormant', swordRank: 'Dormant', experience: 0, experienceMax: 100, reputation: 0,
            kills: 0,
            currency: { name: 'Central Common Currency', gold: 0, silver: 0, copper: 0 },
        },
        worldClock: { day: 1, dayName: 'Day 1', time: '08:00', phase: 'Morning' },
        location: { atlasVersion: 4, continent: 'Central Continent', region: 'Crown Heartlands', place: 'Central Crown', detail: '', zoneType: 'Safe Zone', mapX: PRESENT_WORLD_LOCATIONS[0].x, mapY: PRESENT_WORLD_LOCATIONS[0].y, heading: 0, discovered: ['Central Crown'], discoveredByWorld: { 'present-world': ['Central Crown'], 'alternate-present-world': [] }, pins: [] },
        travel: {
            status: 'Idle', origin: '', destination: '', route: 'Road', totalDays: 0, remainingDays: 0, notes: '',
            originX: null, originY: null, originContinent: '', originRegion: '', destinationX: null, destinationY: null,
            destinationContinent: '', destinationRegion: '', destinationPlace: '', startedAtWorldMinutes: null, lastWorldMinutes: null,
            trackedUserTurns: 0, lastUserProgressMessage: '', routePoints: [],
        },
        scene: { position: 'Unknown', weather: 'Unknown', temperature: null },
        sceneMap: { activeMapId: '', activeFloorId: '', playerRoomId: '', maps: [] },
        inventory: [],
        inventoryLogs: [],
        skills: [],
        characterLifeMapActors: [],
        proficiencies: { magic, sword, customMagic: [], customSword: [], techniques: [] },
        quests: [],
        npcs: [],
        contacts: [],
        letters: [],
        social: defaultSocialState(),
        music: { tracks: [], currentId: '', repeat: false, shuffle: false },
        journal: [],
        transactions: [],
        journeyLogs: [],
        systems: defaultSystemsState(),
        onboarding: { identitySeeded: false, loadoutSeeded: false, characterMapSeeded: false, locationSeeded: false },
        syncCursor: { user: null, assistant: null },
        updatedAt: null,
        updateSource: 'initial',
    };
}

function getSettings() {
    const { extensionSettings } = SillyTavern.getContext();
    extensionSettings[SETTINGS_KEY] ||= clone(DEFAULT_SETTINGS);
    const hadVisualVersion = Object.hasOwn(extensionSettings[SETTINGS_KEY], 'visualVersion');
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        if (!Object.hasOwn(extensionSettings[SETTINGS_KEY], key)) extensionSettings[SETTINGS_KEY][key] = value;
    }
    const settings = extensionSettings[SETTINGS_KEY];
    if (!hadVisualVersion && settings.accentColor === '#8fb4a3') settings.accentColor = DEFAULT_SETTINGS.accentColor;
    settings.visualVersion = Math.max(6, number(settings.visualVersion, 6, 1, 99));
    if (!['en', 'th'].includes(settings.language)) settings.language = DEFAULT_SETTINGS.language;
    if (!['hidden', 'visible', 'draft'].includes(settings.interactionMode)) settings.interactionMode = DEFAULT_SETTINGS.interactionMode;
    if (!['full', 'compact', 'off'].includes(settings.activityIndicator)) settings.activityIndicator = DEFAULT_SETTINGS.activityIndicator;
    if (!['compact', 'comfortable'].includes(settings.density)) settings.density = DEFAULT_SETTINGS.density;
    for (const key of ['accentColor', 'accentAltColor', 'inkColor', 'surfaceColor', 'auraColor']) {
        if (!/^#[0-9a-f]{6}$/i.test(settings[key])) settings[key] = DEFAULT_SETTINGS[key];
    }
    if (settings.themePreset !== 'custom' && !Object.hasOwn(COLOR_PRESETS, settings.themePreset)) settings.themePreset = DEFAULT_SETTINGS.themePreset;
    settings.glassOpacity = number(settings.glassOpacity, DEFAULT_SETTINGS.glassOpacity, 55, 98);
    settings.glowStrength = number(settings.glowStrength, DEFAULT_SETTINGS.glowStrength, 0, 100);
    settings.notificationDuration = number(settings.notificationDuration, DEFAULT_SETTINGS.notificationDuration, 1500, 30000);
    for (const key of ['eventNotifications', 'notifyExperience', 'notifyLevel', 'notifyLearning', 'notifyCombat', 'notifyKills', 'notifyCurrency', 'notifyQuests', 'showTravelTracker', 'autoContinuity', 'showNpcMapMarkers', 'mapHdMode']) settings[key] = Boolean(settings[key]);
    const trackerPosition = settings.travelTrackerPosition && typeof settings.travelTrackerPosition === 'object' ? settings.travelTrackerPosition : {};
    settings.travelTrackerPosition = {
        x: optionalNumber(trackerPosition.x, null),
        y: optionalNumber(trackerPosition.y, null),
    };
    return settings;
}

function requestUsage() {
    const settings = getSettings();
    const source = settings.requestUsage && typeof settings.requestUsage === 'object' ? settings.requestUsage : {};
    settings.requestUsage = {
        total: Math.max(0, Math.trunc(number(source.total, 0, 0, Number.MAX_SAFE_INTEGER))),
        manualSync: Math.max(0, Math.trunc(number(source.manualSync, 0, 0, Number.MAX_SAFE_INTEGER))),
        hiddenAction: Math.max(0, Math.trunc(number(source.hiddenAction, 0, 0, Number.MAX_SAFE_INTEGER))),
        visibleAction: Math.max(0, Math.trunc(number(source.visibleAction, 0, 0, Number.MAX_SAFE_INTEGER))),
        lastReason: text(source.lastReason, '', 120),
        lastAt: text(source.lastAt, '', 80),
    };
    return settings.requestUsage;
}

function renderRequestUsage() {
    const usage = requestUsage();
    document.querySelectorAll('[data-tretaresia-request-usage]').forEach(output => {
        output.textContent = `${usage.total} extension-started request${usage.total === 1 ? '' : 's'}`;
        output.title = usage.lastAt ? `Last: ${usage.lastReason || 'unknown'} · ${usage.lastAt}` : 'No separate extension request recorded yet.';
    });
}

function recordExtensionRequest(kind, reason) {
    const usage = requestUsage();
    usage.total += 1;
    if (Object.hasOwn(usage, kind)) usage[kind] += 1;
    usage.lastReason = text(reason, kind, 120);
    usage.lastAt = new Date().toISOString();
    SillyTavern.getContext().saveSettingsDebounced?.();
    renderRequestUsage();
}

function meter(value, fallback) {
    const max = number(value?.max, fallback.max, 1, 999999);
    return { current: number(value?.current, fallback.current, 0, max), max };
}

function survivalMeter(value, fallback = 100) {
    return number(value, fallback, 0, 100);
}

function auraColor(value, fallback = '#6f8fe8') {
    const candidate = text(value, fallback, 20);
    return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate.toLowerCase() : fallback;
}

function inventoryLogEntry(value) {
    if (!value || typeof value !== 'object') return null;
    const name = text(value.name, '', 140);
    const delta = number(value.delta, 0, -99999, 99999);
    if (!name || !delta) return null;
    return {
        id: text(value.id, uid(), 100), name, delta,
        quantity: number(value.quantity, 0, 0, 99999),
        reason: text(value.reason, delta > 0 ? 'Item acquired' : 'Item removed', 240),
        source: text(value.source, 'roleplay', 80),
        at: text(value.at, new Date().toISOString(), 60),
    };
}

function characterLifeMapActor(value, fallback = {}) {
    if (!value || typeof value !== 'object') return null;
    const name = text(value.name, text(fallback.name, '', 120), 120);
    if (!name) return null;
    const worldId = WORLD_ATLASES[value.worldId] ? value.worldId : WORLD_ATLASES[fallback.worldId] ? fallback.worldId : WORLD_ATLAS.id;
    const location = text(value.location, text(fallback.location, 'Unknown', 200), 200);
    const safePoint = landSafeMapPoint({
        worldId, location,
        x: optionalNumber(value.mapX, optionalNumber(fallback.mapX, null, 0, WORLD_MAP_WIDTH), 0, WORLD_MAP_WIDTH),
        y: optionalNumber(value.mapY, optionalNumber(fallback.mapY, null, 0, WORLD_MAP_HEIGHT), 0, WORLD_MAP_HEIGHT),
    });
    return {
        id: text(value.id, text(fallback.id, `character-map-${shortHash(name)}`, 100), 100),
        characterLifeId: text(value.characterLifeId, text(fallback.characterLifeId, '', 120), 120),
        characterLifeScope: 'character',
        name,
        location,
        worldId,
        mapX: safePoint?.x ?? null,
        mapY: safePoint?.y ?? null,
        portraitId: text(value.portraitId, text(fallback.portraitId, '', 180), 180),
        updatedAt: text(value.updatedAt, new Date().toISOString(), 60),
    };
}

function item(value, fallbackCategory = 'Other') {
    if (!value || typeof value !== 'object' || !text(value.name)) return null;
    return {
        id: text(value.id, uid(), 100), name: text(value.name, '', 100),
        quantity: number(value.quantity, 1, 0, 99999), category: text(value.category, fallbackCategory, 60),
        description: text(value.description, '', 300),
    };
}

function currencyTransaction(value) {
    if (!value || typeof value !== 'object') return null;
    const amounts = {
        gold: number(value.amounts?.gold, 0, -999999999, 999999999),
        silver: number(value.amounts?.silver, 0, -999999999, 999999999),
        copper: number(value.amounts?.copper, 0, -999999999, 999999999),
    };
    if (!amounts.gold && !amounts.silver && !amounts.copper) return null;
    return {
        id: text(value.id, uid(), 100),
        at: text(value.at, new Date().toISOString(), 60),
        currencyName: text(value.currencyName, 'Unknown currency', 120),
        amounts,
        balance: {
            gold: number(value.balance?.gold, 0, 0, 999999999),
            silver: number(value.balance?.silver, 0, 0, 999999999),
            copper: number(value.balance?.copper, 0, 0, 999999999),
        },
        reason: text(value.reason, 'Unspecified transaction', 300),
        source: text(value.source, 'roleplay', 60),
    };
}

function journeyLogEntry(value) {
    if (!value || typeof value !== 'object') return null;
    const content = text(value.text, '', 500);
    if (!content) return null;
    return {
        id: text(value.id, uid(), 100),
        text: content,
        at: text(value.at, new Date().toISOString(), 60),
        place: text(value.place, '', 160),
        day: text(value.day, '', 80),
        kind: text(value.kind, 'story', 40),
    };
}

function appendJourneyLog(state, value) {
    const entry = journeyLogEntry(value);
    if (!entry) return null;
    state.journeyLogs ||= [];
    const duplicate = [...state.journeyLogs].reverse().find(current =>
        current.text.toLocaleLowerCase() === entry.text.toLocaleLowerCase()
        && current.place === entry.place && current.day === entry.day);
    if (duplicate) return null;
    state.journeyLogs = [...state.journeyLogs, entry].slice(-100);
    return entry;
}

function appendCurrencyTransaction(state, amounts, reason, source = 'roleplay', balance = state.progression.currency) {
    const entry = currencyTransaction({
        currencyName: state.progression.currency.name,
        amounts,
        balance,
        reason,
        source,
    });
    if (!entry) return null;
    state.transactions ||= [];
    state.transactions = [...state.transactions, entry].slice(-250);
    return entry;
}

function recordInventoryDiff(state, previous, source = 'roleplay') {
    const before = new Map((previous?.inventory || []).map(entry => [entry.id || entry.name.toLocaleLowerCase(), entry]));
    const after = new Map((state?.inventory || []).map(entry => [entry.id || entry.name.toLocaleLowerCase(), entry]));
    const keys = new Set([...before.keys(), ...after.keys()]);
    const additions = [];
    for (const key of keys) {
        const oldEntry = before.get(key);
        const nextEntry = after.get(key);
        const delta = number(nextEntry?.quantity, 0, 0, 99999) - number(oldEntry?.quantity, 0, 0, 99999);
        if (!delta) continue;
        const name = nextEntry?.name || oldEntry?.name;
        const entry = inventoryLogEntry({
            name, delta, quantity: nextEntry?.quantity || 0, source,
            reason: delta > 0 ? `${name} added to inventory` : `${name} removed from inventory`,
        });
        if (entry) additions.push(entry);
    }
    if (additions.length) state.inventoryLogs = [...(state.inventoryLogs || []), ...additions].slice(-250);
}

function currencyDelta(before, after) {
    return {
        gold: number(after?.gold, 0, -999999999, 999999999) - number(before?.gold, 0, -999999999, 999999999),
        silver: number(after?.silver, 0, -999999999, 999999999) - number(before?.silver, 0, -999999999, 999999999),
        copper: number(after?.copper, 0, -999999999, 999999999) - number(before?.copper, 0, -999999999, 999999999),
    };
}

function skill(value) {
    if (!value || typeof value !== 'object' || !text(value.name)) return null;
    return {
        id: text(value.id, uid(), 100), name: text(value.name, '', 100),
        rank: MASTERY.includes(value.rank) ? value.rank : 'Beginner',
        type: text(value.type, 'General', 60), description: text(value.description, '', 300),
    };
}

function portraitFrame(value, fallback) {
    return {
        x: number(value?.x, fallback.x, 0, 100),
        y: number(value?.y, fallback.y, 0, 100),
        zoom: number(value?.zoom, fallback.zoom, 1, 3),
    };
}

function technique(value) {
    if (!value || typeof value !== 'object' || !text(value.name)) return null;
    return {
        id: text(value.id, uid(), 100), name: text(value.name, '', 120),
        category: text(value.category, 'General', 80), proficiency: number(value.proficiency, 0, 0, 100),
        description: text(value.description, '', 300),
    };
}

function proficiencyIconPreset(key, name = '', kind = 'magic') {
    const requested = text(key, '', 40);
    const exact = PROFICIENCY_ICON_PRESETS.find(entry => entry.key === requested);
    if (exact) return exact;
    const normalizedName = text(name, '', 160).toLocaleLowerCase();
    const inferred = PROFICIENCY_ICON_PRESETS.map(entry => ({
        entry, score: Math.max(0, ...entry.words.split(' ').filter(word => normalizedName.includes(word)).map(word => word.length)),
    })).sort((a, b) => b.score - a.score)[0];
    return inferred?.score ? inferred.entry : PROFICIENCY_ICON_PRESETS.find(entry => entry.key === (kind === 'sword' ? 'sword' : 'arcane'));
}

function customProficiency(value, fallback = {}, kind = 'magic') {
    if (!value || typeof value !== 'object' || !text(value.name, text(fallback.name))) return null;
    const name = text(value.name, text(fallback.name, kind === 'sword' ? 'Unnamed Sword Style' : 'Unnamed Magic', 120), 120);
    const preset = proficiencyIconPreset(value.iconKey || fallback.iconKey, name, kind);
    const requestedTone = text(value.tone, text(fallback.tone, '', 20), 20);
    return {
        id: text(value.id, text(fallback.id, uid(), 100), 100), name,
        iconKey: preset.key, icon: preset.icon,
        tone: /^#[0-9a-f]{6}$/i.test(requestedTone) ? requestedTone : preset.tone,
        proficiency: number(value.proficiency, number(fallback.proficiency, 0, 0, 100), 0, 100),
        description: text(value.description, text(fallback.description, '', 300), 300),
    };
}

function normalizeCustomProficiencies(values, fallbacks, kind) {
    if (!Array.isArray(values)) return Array.isArray(fallbacks) ? fallbacks : [];
    const base = Array.isArray(fallbacks) ? fallbacks : [];
    const byId = new Map(base.map(entry => [entry.id, entry]));
    const byName = new Map(base.map(entry => [entry.name.toLocaleLowerCase(), entry]));
    const unique = new Map();
    values.forEach(value => {
        const fallback = byId.get(value?.id) || byName.get(text(value?.name).toLocaleLowerCase()) || {};
        const entry = customProficiency(value, fallback, kind);
        if (entry) unique.set(entry.name.toLocaleLowerCase(), entry);
    });
    return [...unique.values()].slice(0, 100);
}

function contact(value) {
    if (!value || typeof value !== 'object' || !text(value.name)) return null;
    return {
        id: text(value.id, uid(), 100), name: text(value.name, '', 120), title: text(value.title, '', 120),
        affiliation: text(value.affiliation, '', 120), relationship: text(value.relationship, 'Acquaintance', 100),
        notes: text(value.notes, '', 400), lastLetterAt: text(value.lastLetterAt, '', 60), npcId: text(value.npcId, '', 100),
    };
}

function npcAbility(value) {
    if (!value || typeof value !== 'object' || !text(value.name)) return null;
    return {
        id: text(value.id, uid(), 100), name: text(value.name, '', 120), category: text(value.category, 'General', 80),
        level: text(value.level, 'Unknown', 80), proficiency: number(value.proficiency, 0, 0, 100),
        description: text(value.description, '', 400),
    };
}

function npcMeter(value) {
    if (!value || typeof value !== 'object' || !text(value.name)) return null;
    return { id: text(value.id, uid(), 100), name: text(value.name, '', 80), value: number(value.value, 0, 0, 100) };
}

function npcDiaryEntry(value) {
    if (!value || typeof value !== 'object' || !text(value.text)) return null;
    return {
        id: text(value.id, uid(), 100), text: text(value.text, '', 1200), mood: text(value.mood, '', 80),
        at: text(value.at, new Date().toISOString(), 60),
    };
}

function statusEffect(value, fallback = {}) {
    if (!value || typeof value !== 'object') return null;
    const name = text(value.name, text(fallback.name, '', 100), 100);
    if (!name) return null;
    const requestedSeverity = text(value.severity, text(fallback.severity, 'Minor', 30), 30);
    return {
        id: text(value.id, text(fallback.id, `effect-${shortHash(name)}`, 100), 100),
        name,
        type: text(value.type, text(fallback.type, 'Condition', 60), 60),
        severity: EFFECT_SEVERITIES.includes(requestedSeverity) ? requestedSeverity : 'Minor',
        remainingTurns: optionalNumber(value.remainingTurns, optionalNumber(fallback.remainingTurns, null, 0, 9999), 0, 9999),
        damagePerTurn: number(value.damagePerTurn, number(fallback.damagePerTurn, 0, 0, 999999), 0, 999999),
        staminaPerTurn: number(value.staminaPerTurn, number(fallback.staminaPerTurn, 0, 0, 999999), 0, 999999),
        source: text(value.source, text(fallback.source, '', 240), 240),
        treatment: text(value.treatment, text(fallback.treatment, '', 300), 300),
        appliedAt: text(value.appliedAt, text(fallback.appliedAt, new Date().toISOString(), 60), 60),
    };
}

function combatLogEntry(value) {
    if (!value || typeof value !== 'object') return null;
    const summary = text(value.summary, '', 300);
    if (!summary) return null;
    const baseDamage = number(value.baseDamage, 0, 0, 999999);
    const armor = number(value.armor, 0, 0, 999999);
    const auraGuard = number(value.auraGuard, 0, 0, 999999);
    const resistance = number(value.resistance, 0, 0, 999999);
    const finalDamage = number(value.finalDamage, Math.max(0, baseDamage - armor - auraGuard - resistance), 0, 999999);
    return {
        id: text(value.id, uid(), 100), at: text(value.at, new Date().toISOString(), 60), summary,
        attacker: text(value.attacker, '', 120), target: text(value.target, '', 120),
        damageType: text(value.damageType, 'Physical', 60), bodyPart: text(value.bodyPart, '', 80),
        baseDamage, armor, auraGuard, resistance, critical: Boolean(value.critical), finalDamage,
        source: text(value.source, 'roleplay', 60),
    };
}

function knowledgeFact(value, fallback = {}) {
    if (!value || typeof value !== 'object') return null;
    const fact = text(value.fact, text(value.detail, text(fallback.fact, '', 400), 400), 400);
    if (!fact) return null;
    return {
        id: text(value.id, text(fallback.id, `knowledge-${shortHash(fact)}`, 100), 100), fact,
        source: text(value.source, text(fallback.source, 'Witnessed', 80), 80),
        confidence: number(value.confidence, number(fallback.confidence, 100, 0, 100), 0, 100),
        learnedDay: number(value.learnedDay, number(fallback.learnedDay, 1, 1, 999999), 1, 999999),
        private: Boolean(value.private ?? fallback.private),
    };
}

function regionalWeatherEntry(value, fallback = {}) {
    if (!value || typeof value !== 'object') return null;
    const region = text(value.region, text(fallback.region, '', 120), 120);
    if (!region) return null;
    return {
        id: text(value.id, text(fallback.id, `weather-${shortHash(region)}`, 100), 100), region,
        weather: text(value.weather, text(fallback.weather, 'Unknown', 120), 120),
        temperature: optionalNumber(value.temperature, optionalNumber(fallback.temperature, null, -1000, 1000), -1000, 1000),
        hazard: text(value.hazard, text(fallback.hazard, '', 160), 160),
        updatedDay: number(value.updatedDay, number(fallback.updatedDay, 1, 1, 999999), 1, 999999),
    };
}

function auditEntry(value) {
    if (!value || typeof value !== 'object' || !Array.isArray(value.changes) || !value.changes.length) return null;
    return {
        id: text(value.id, uid(), 100), at: text(value.at, new Date().toISOString(), 60),
        source: text(value.source, 'roleplay', 80), summary: text(value.summary, 'State changed', 300),
        messageId: Number.isInteger(Number(value.messageId)) ? Number(value.messageId) : null,
        changes: value.changes.slice(0, 40).map(change => ({
            path: text(change?.path, '', 120), before: text(change?.before, '', 240), after: text(change?.after, '', 240),
            reason: text(change?.reason, '', 240), confidence: number(change?.confidence, 100, 0, 100),
        })).filter(change => change.path),
    };
}

function defaultSystemsState() {
    return { effects: [], combatLogs: [], audit: [], regionalWeather: [], lastRepairAt: '', repairCount: 0 };
}

function defaultSocialState() {
    return {
        party: null,
        guilds: [],
        household: { id: uid(), name: 'Household', members: [] },
    };
}

function socialMember(value, fallback = {}) {
    if (!value || typeof value !== 'object') return null;
    const name = text(value.name, text(fallback.name, '', 140), 140);
    if (!name) return null;
    return {
        id: text(value.id, text(fallback.id, uid(), 100), 100),
        npcId: text(value.npcId, text(fallback.npcId, '', 100), 100),
        name,
        role: text(value.role, text(fallback.role, 'Other', 80), 80),
        notes: text(value.notes, text(fallback.notes, '', 400), 400),
        addedAt: text(value.addedAt, text(fallback.addedAt, new Date().toISOString(), 60), 60),
    };
}

function partyProfile(value, fallback = null) {
    if (!value || typeof value !== 'object' || !text(value.name, text(fallback?.name))) return null;
    const memberIds = [...new Set((Array.isArray(value.memberIds) ? value.memberIds : fallback?.memberIds || [])
        .map(entry => text(entry, '', 100)).filter(entry => entry && entry !== 'player'))].slice(0, 24);
    return {
        id: text(value.id, text(fallback?.id, uid(), 100), 100),
        name: text(value.name, text(fallback?.name, 'Unnamed Party', 140), 140),
        leaderId: text(value.leaderId, text(fallback?.leaderId, 'player', 100), 100),
        memberIds,
        formation: text(value.formation, text(fallback?.formation, 'Balanced', 80), 80),
        roles: Object.fromEntries(memberIds.map(id => {
            const requested = text(value.roles?.[id], text(fallback?.roles?.[id], 'Companion', 40), 40);
            return [id, PARTY_ROLES.includes(requested) ? requested : 'Companion'];
        })),
        sharedFunds: {
            gold: number(value.sharedFunds?.gold, number(fallback?.sharedFunds?.gold, 0, 0, 999999999), 0, 999999999),
            silver: number(value.sharedFunds?.silver, number(fallback?.sharedFunds?.silver, 0, 0, 999999999), 0, 999999999),
            copper: number(value.sharedFunds?.copper, number(fallback?.sharedFunds?.copper, 0, 0, 999999999), 0, 999999999),
        },
        createdAt: text(value.createdAt, text(fallback?.createdAt, new Date().toISOString(), 60), 60),
    };
}

function guildProfile(value, fallback = {}) {
    if (!value || typeof value !== 'object' || !text(value.name, text(fallback.name))) return null;
    const memberIds = [...new Set((Array.isArray(value.memberIds) ? value.memberIds : fallback.memberIds || [])
        .map(entry => text(entry, '', 100)).filter(entry => entry && entry !== 'player'))].slice(0, 100);
    const treasury = value.treasury && typeof value.treasury === 'object' ? value.treasury : fallback.treasury || {};
    return {
        id: text(value.id, text(fallback.id, uid(), 100), 100),
        name: text(value.name, text(fallback.name, 'Unnamed Guild', 140), 140),
        description: text(value.description, text(fallback.description, '', 600), 600),
        rank: text(value.rank, text(fallback.rank, 'Unranked', 80), 80),
        level: number(value.level, number(fallback.level, 1, 1, 9999), 1, 9999),
        reputation: number(value.reputation, number(fallback.reputation, 0, -999999, 999999), -999999, 999999),
        headquarters: text(value.headquarters, text(fallback.headquarters, 'Unestablished', 180), 180),
        alliances: (Array.isArray(value.alliances) ? value.alliances : fallback.alliances || []).map(entry => text(entry, '', 120)).filter(Boolean).slice(0, 40),
        enemies: (Array.isArray(value.enemies) ? value.enemies : fallback.enemies || []).map(entry => text(entry, '', 120)).filter(Boolean).slice(0, 40),
        quests: (Array.isArray(value.quests) ? value.quests : fallback.quests || []).map(entry => text(entry, '', 160)).filter(Boolean).slice(0, 80),
        leaderId: text(value.leaderId, text(fallback.leaderId, 'player', 100), 100),
        memberIds,
        treasury: {
            gold: number(treasury.gold, number(fallback.treasury?.gold, 0), 0, 999999999),
            silver: number(treasury.silver, number(fallback.treasury?.silver, 0), 0, 999999999),
            copper: number(treasury.copper, number(fallback.treasury?.copper, 0), 0, 999999999),
        },
        createdAt: text(value.createdAt, text(fallback.createdAt, new Date().toISOString(), 60), 60),
    };
}

function householdProfile(value, fallback = {}) {
    const source = value && typeof value === 'object' ? value : {};
    const base = fallback && typeof fallback === 'object' ? fallback : {};
    const fallbackMembers = Array.isArray(base.members) ? base.members : [];
    const members = (Array.isArray(source.members) ? source.members : fallbackMembers)
        .map(entry => socialMember(entry, fallbackMembers.find(current => current.id === entry?.id || current.npcId === entry?.npcId) || {}))
        .filter(Boolean).slice(0, 100);
    return {
        id: text(source.id, text(base.id, uid(), 100), 100),
        name: text(source.name, text(base.name, 'Household', 140), 140),
        members,
    };
}

function isFriendlyNpc(entry) {
    if (!entry || entry.isHostile === true || entry.hostile === true) return false;
    const source = [entry.relationship, entry.alignment, entry.relationshipState, entry.faction]
        .map(value => text(value, '', 300).toLocaleLowerCase()).filter(Boolean).join(' ');
    if (!source) return true;
    if (/\b(not hostile|no hostility|friendly|friend|ally|allied|trusted|family|partner|lover|spouse|child|parent)\b/i.test(source)) return true;
    return ![...HOSTILE_NPC_TERMS].some(term => source.includes(term));
}

function friendlyNpcs(state) {
    return (Array.isArray(state?.npcs) ? state.npcs : []).filter(isFriendlyNpc);
}

function resolveFriendlyNpc(state, value) {
    const id = text(value?.npcId, text(value?.id, typeof value === 'string' ? value : '', 100), 100);
    const name = text(value?.npcName, text(value?.name, typeof value === 'string' ? value : '', 140), 140).toLocaleLowerCase();
    return friendlyNpcs(state).find(entry => (id && entry.id === id) || (name && entry.name.toLocaleLowerCase() === name)) || null;
}

function resolveOrCreateFriendlyNpc(state, value) {
    const existing = resolveFriendlyNpc(state, value);
    if (existing) return existing;
    const name = text(value?.npcName, text(value?.name, '', 140), 140);
    if (!name || !value || typeof value !== 'object') return null;
    const candidate = npcProfile({
        id: text(value.npcId, text(value.id, uid(), 100), 100),
        name,
        title: value.title || value.role,
        occupation: value.occupation || value.role,
        faction: value.faction || value.affiliation,
        relationship: value.relationship || value.relationshipToUser || 'Acquaintance',
        isHostile: value.isHostile ?? value.hostile,
        location: value.location,
    });
    if (!candidate || !isFriendlyNpc(candidate)) return null;
    state.npcs.push(candidate);
    return candidate;
}

function socialMemberName(state, id) {
    if (id === 'player') return currentPersonaName(state);
    return state.npcs.find(entry => entry.id === id)?.name || 'Unknown member';
}

function currencyLabel(value) {
    const currency = value || {};
    const parts = [
        [currency.gold, 'Gold'], [currency.silver, 'Silver'], [currency.copper, 'Copper'],
    ].filter(([amount]) => Number(amount) > 0).map(([amount, label]) => `${Number(amount)} ${label}`);
    return parts.length ? parts.join(' · ') : '0 Copper';
}

function canAffordCurrency(balance, cost) {
    return ['gold', 'silver', 'copper'].every(key => number(balance?.[key], 0, 0, 999999999) >= number(cost?.[key], 0, 0, 999999999));
}

function npcProfile(value, fallback = {}) {
    if (!value || typeof value !== 'object' || !text(value.name, text(fallback.name))) return null;
    const baseFrame = fallback.portraitView || defaultState().player.portraitView;
    const portraitView = value.portraitView && typeof value.portraitView === 'object' ? value.portraitView : {};
    const baseStats = fallback.stats && typeof fallback.stats === 'object' ? fallback.stats : {};
    const stats = value.stats && typeof value.stats === 'object' ? value.stats : {};
    const sourceAbilities = Array.isArray(value.abilities) ? value.abilities : Array.isArray(fallback.abilities) ? fallback.abilities : [];
    const sourceMeters = Array.isArray(value.customMeters) ? value.customMeters : Array.isArray(fallback.customMeters) ? fallback.customMeters : [];
    const sourceDiary = Array.isArray(value.diary) ? value.diary : Array.isArray(fallback.diary) ? fallback.diary : [];
    return {
        id: text(value.id, text(fallback.id, uid(), 100), 100), contactId: text(value.contactId, text(fallback.contactId, '', 100), 100),
        name: text(value.name, text(fallback.name, 'Unknown NPC', 120), 120), title: text(value.title, text(fallback.title, '', 120), 120),
        race: text(value.race, text(fallback.race, 'Unknown', 80), 80), age: text(value.age, text(fallback.age, '', 40), 40),
        gender: text(value.gender, text(fallback.gender, '', 60), 60), occupation: text(value.occupation, text(fallback.occupation, '', 120), 120),
        faction: text(value.faction, text(fallback.faction, text(value.affiliation, text(fallback.affiliation, '', 120), 120), 120), 120),
        alignment: text(value.alignment, text(fallback.alignment, '', 100), 100), isHostile: Boolean(value.isHostile ?? value.hostile ?? fallback.isHostile ?? fallback.hostile),
        relationship: text(value.relationship, text(fallback.relationship, 'Acquaintance', 100), 100),
        relationshipState: text(value.relationshipState, text(fallback.relationshipState, '', 160), 160),
        affection: number(value.affection, number(fallback.affection, 0, 0, 100), 0, 100), trust: number(value.trust, number(fallback.trust, 0, 0, 100), 0, 100),
        loyalty: number(value.loyalty, number(fallback.loyalty, 0, 0, 100), 0, 100), fear: number(value.fear, number(fallback.fear, 0, 0, 100), 0, 100),
        corruption: number(value.corruption, number(fallback.corruption, 0, 0, 100), 0, 100), lust: number(value.lust, number(fallback.lust, 0, 0, 100), 0, 100),
        location: text(value.location, text(fallback.location, 'Unknown', 200), 200), lastSeen: text(value.lastSeen, text(fallback.lastSeen, '', 120), 120),
        mapX: optionalNumber(value.mapX, optionalNumber(fallback.mapX, null, 0, WORLD_MAP_WIDTH), 0, WORLD_MAP_WIDTH),
        mapY: optionalNumber(value.mapY, optionalNumber(fallback.mapY, null, 0, WORLD_MAP_HEIGHT), 0, WORLD_MAP_HEIGHT),
        mapVisible: value.mapVisible === undefined ? Boolean(fallback.mapVisible) : Boolean(value.mapVisible),
        lifeMode: ['Active', 'Story only', 'Paused'].includes(value.lifeMode) ? value.lifeMode : ['Active', 'Story only', 'Paused'].includes(fallback.lifeMode) ? fallback.lifeMode : 'Active',
        activity: text(value.activity, text(fallback.activity, 'Living their daily life', 240), 240),
        activityUpdatedDay: number(value.activityUpdatedDay, number(fallback.activityUpdatedDay, 0, 0, 999999), 0, 999999),
        maritalStatus: text(value.maritalStatus, text(fallback.maritalStatus, 'Unknown', 100), 100), partner: text(value.partner, text(fallback.partner, '', 160), 160),
        children: text(value.children, text(fallback.children, '', 400), 400), notes: text(value.notes, text(fallback.notes, '', 1000), 1000),
        characterLifeId: text(value.characterLifeId, text(fallback.characterLifeId, '', 120), 120),
        characterLifeScope: ['global', 'character', 'chat'].includes(value.characterLifeScope) ? value.characterLifeScope
            : ['global', 'character', 'chat'].includes(fallback.characterLifeScope) ? fallback.characterLifeScope : '',
        characterLifePortraitId: text(value.characterLifePortraitId, text(fallback.characterLifePortraitId, '', 180), 180),
        stats: {
            level: number(stats.level, number(baseStats.level, 0, 0, 9999), 0, 9999), rank: text(stats.rank, text(baseStats.rank, 'Unknown', 80), 80),
            hp: number(stats.hp, number(baseStats.hp, 0, 0, 999999), 0, 999999), mp: number(stats.mp, number(baseStats.mp, 0, 0, 999999), 0, 999999),
            stamina: number(stats.stamina, number(baseStats.stamina, 0, 0, 999999), 0, 999999),
            ...Object.fromEntries(NPC_CORE_STATS.map(entry => [entry.id, number(stats[entry.id], number(baseStats[entry.id], 0, 0, 9999), 0, 9999)])),
        },
        abilities: sourceAbilities.map(npcAbility).filter(Boolean).slice(0, 100), customMeters: sourceMeters.map(npcMeter).filter(Boolean).slice(0, 30),
        diary: sourceDiary.map(npcDiaryEntry).filter(Boolean).slice(-40),
        knowledge: (Array.isArray(value.knowledge) ? value.knowledge : Array.isArray(fallback.knowledge) ? fallback.knowledge : [])
            .map(entry => knowledgeFact(entry)).filter(Boolean).slice(-80),
        hasPortrait: Boolean(value.hasPortrait ?? fallback.hasPortrait),
        portraitView: { desktop: portraitFrame(portraitView.desktop, baseFrame.desktop), mobile: portraitFrame(portraitView.mobile, baseFrame.mobile) },
        updatedAt: text(value.updatedAt, text(fallback.updatedAt, new Date().toISOString(), 60), 60),
    };
}

function letter(value) {
    if (!value || typeof value !== 'object' || !text(value.body)) return null;
    const direction = value.direction === 'outgoing' ? 'outgoing' : 'incoming';
    const status = ['unread', 'read', 'sent', 'draft'].includes(value.status)
        ? value.status : direction === 'incoming' ? 'unread' : 'sent';
    return {
        id: text(value.id, uid(), 100), contactId: text(value.contactId, '', 100),
        fromName: text(value.fromName, direction === 'incoming' ? 'Unknown sender' : 'Adventurer', 120),
        toName: text(value.toName, direction === 'incoming' ? 'Adventurer' : 'Unknown recipient', 120),
        subject: text(value.subject, 'Untitled letter', 160), body: text(value.body, '', 5000),
        direction, status, createdAt: text(value.createdAt, new Date().toISOString(), 60),
    };
}

function musicTrack(value) {
    if (!value || typeof value !== 'object' || !text(value.name)) return null;
    return {
        id: text(value.id, uid(), 100), name: text(value.name, '', 180), fileName: text(value.fileName, '', 240),
        type: text(value.type, 'audio/mpeg', 80), duration: number(value.duration, 0, 0, 86400),
        addedAt: text(value.addedAt, new Date().toISOString(), 60),
    };
}

function quest(value) {
    if (!value || typeof value !== 'object' || !text(value.name)) return null;
    const statuses = ['Offered', 'Active', 'Completed', 'Failed', 'On Hold'];
    const status = statuses.includes(value.status) ? value.status : 'Active';
    const completed = status === 'Completed';
    const failed = status === 'Failed';
    const updatedAt = text(value.updatedAt, '', 60);
    return {
        id: text(value.id, uid(), 100), name: text(value.name, '', 120),
        type: QUEST_TYPES.includes(value.type) ? value.type : 'Quest',
        dungeonRank: DUNGEON_RANKS.includes(value.dungeonRank) ? value.dungeonRank : 'Unranked',
        status,
        objective: text(value.objective, '', 500), reward: text(value.reward, '', 160),
        giver: text(value.giver, '', 120), source: text(value.source, '', 160),
        progress: completed ? 100 : number(value.progress, 0, 0, 100),
        rewardClaimed: completed || Boolean(value.rewardClaimed),
        rewardClaimedAt: completed ? text(value.rewardClaimedAt, text(value.completedAt, updatedAt, 60), 60) : '',
        completedAt: completed ? text(value.completedAt, updatedAt, 60) : '',
        failedAt: failed ? text(value.failedAt, updatedAt, 60) : '',
        receivedAt: text(value.receivedAt, '', 60), updatedAt,
        notes: text(value.notes, '', 1000),
    };
}

function sceneRoom(value, fallback = {}) {
    if (!value || typeof value !== 'object' || !text(value.name, text(fallback.name))) return null;
    const width = number(value.width, number(fallback.width, 24, 8, 70), 8, 70);
    const height = number(value.height, number(fallback.height, 18, 7, 50), 7, 50);
    const type = ROOM_TYPES.includes(value.type) ? value.type : ROOM_TYPES.includes(fallback.type) ? fallback.type : 'Room';
    return {
        id: text(value.id, text(fallback.id, uid(), 100), 100),
        name: text(value.name, text(fallback.name, 'Unknown room', 120), 120),
        type,
        x: number(value.x, number(fallback.x, 4, 0, 100 - width), 0, 100 - width),
        y: number(value.y, number(fallback.y, 4, 0, 70 - height), 0, 70 - height),
        width,
        height,
        discovered: value.discovered === undefined ? fallback.discovered !== false : Boolean(value.discovered),
        locked: value.locked === undefined ? Boolean(fallback.locked) : Boolean(value.locked),
    };
}

function sceneConnection(value, fallback = {}) {
    if (!value || typeof value !== 'object') return null;
    const from = text(value.from, text(fallback.from, '', 100), 100);
    const to = text(value.to, text(fallback.to, '', 100), 100);
    if (!from || !to || from === to) return null;
    return {
        id: text(value.id, text(fallback.id, uid(), 100), 100), from, to,
        type: CONNECTION_TYPES.includes(value.type) ? value.type : CONNECTION_TYPES.includes(fallback.type) ? fallback.type : 'Door',
        locked: value.locked === undefined ? Boolean(fallback.locked) : Boolean(value.locked),
    };
}

function sceneFloor(value, fallback = {}) {
    if (!value || typeof value !== 'object' || !text(value.name, text(fallback.name))) return null;
    const fallbackRooms = Array.isArray(fallback.rooms) ? fallback.rooms : [];
    const roomsById = new Map(fallbackRooms.map(entry => [entry.id, entry]));
    const roomsByName = new Map(fallbackRooms.map(entry => [entry.name.toLocaleLowerCase(), entry]));
    const sourceRooms = Array.isArray(value.rooms) ? value.rooms : fallbackRooms;
    const rooms = sourceRooms.map(entry => sceneRoom(entry, roomsById.get(entry?.id) || roomsByName.get(text(entry?.name).toLocaleLowerCase()) || {}))
        .filter(Boolean).slice(0, 80);
    const roomIds = new Set(rooms.map(entry => entry.id));
    const fallbackConnections = Array.isArray(fallback.connections) ? fallback.connections : [];
    const sourceConnections = Array.isArray(value.connections) ? value.connections : fallbackConnections;
    const connections = sourceConnections.map(entry => sceneConnection(entry, fallbackConnections.find(current => current.id === entry?.id) || {}))
        .filter(entry => entry && roomIds.has(entry.from) && roomIds.has(entry.to)).slice(0, 120);
    return {
        id: text(value.id, text(fallback.id, uid(), 100), 100),
        name: text(value.name, text(fallback.name, '1F', 80), 80),
        level: number(value.level, number(fallback.level, 1, -20, 200), -20, 200),
        rooms,
        connections,
    };
}

function sceneStructure(value, fallback = {}) {
    if (!value || typeof value !== 'object' || !text(value.name, text(fallback.name))) return null;
    const fallbackFloors = Array.isArray(fallback.floors) ? fallback.floors : [];
    const floorsById = new Map(fallbackFloors.map(entry => [entry.id, entry]));
    const floorsByName = new Map(fallbackFloors.map(entry => [entry.name.toLocaleLowerCase(), entry]));
    const sourceFloors = Array.isArray(value.floors) ? value.floors : fallbackFloors;
    return {
        id: text(value.id, text(fallback.id, uid(), 100), 100),
        name: text(value.name, text(fallback.name, 'Local structure', 140), 140),
        place: text(value.place, text(fallback.place, '', 180), 180),
        locked: value.locked === undefined ? Boolean(fallback.locked) : Boolean(value.locked),
        floors: sourceFloors.map(entry => sceneFloor(entry, floorsById.get(entry?.id) || floorsByName.get(text(entry?.name).toLocaleLowerCase()) || {}))
            .filter(Boolean).sort((a, b) => a.level - b.level).slice(0, 20),
    };
}

function normalizeSceneMap(value, fallback) {
    const source = value && typeof value === 'object' ? value : {};
    const base = fallback && typeof fallback === 'object' ? fallback : { activeMapId: '', activeFloorId: '', playerRoomId: '', maps: [] };
    const fallbackMaps = Array.isArray(base.maps) ? base.maps : [];
    const mapsById = new Map(fallbackMaps.map(entry => [entry.id, entry]));
    const mapsByName = new Map(fallbackMaps.map(entry => [entry.name.toLocaleLowerCase(), entry]));
    const sourceMaps = Array.isArray(source.maps) ? source.maps : fallbackMaps;
    const maps = sourceMaps.map(entry => sceneStructure(entry, mapsById.get(entry?.id) || mapsByName.get(text(entry?.name).toLocaleLowerCase()) || {}))
        .filter(Boolean).slice(0, 30);
    let activeMapId = text(source.activeMapId, text(base.activeMapId, '', 100), 100);
    if (activeMapId && !maps.some(entry => entry.id === activeMapId)) activeMapId = maps[0]?.id || '';
    const activeMap = maps.find(entry => entry.id === activeMapId);
    let activeFloorId = text(source.activeFloorId, text(base.activeFloorId, '', 100), 100);
    if (!activeMap?.floors.some(entry => entry.id === activeFloorId)) activeFloorId = activeMap?.floors[0]?.id || '';
    const activeFloor = activeMap?.floors.find(entry => entry.id === activeFloorId);
    let playerRoomId = text(source.playerRoomId, text(base.playerRoomId, '', 100), 100);
    if (!activeFloor?.rooms.some(entry => entry.id === playerRoomId)) playerRoomId = '';
    return { activeMapId, activeFloorId, playerRoomId, maps };
}

function normalize(candidate, base = defaultState()) {
    const source = candidate && typeof candidate === 'object' ? candidate : {};
    const migratingLegacyNpcs = !Array.isArray(source.npcs);
    const result = clone(base);
    const player = source.player && typeof source.player === 'object' ? source.player : {};
    const sourceWorld = source.world && typeof source.world === 'object' ? source.world : {};
    const progress = source.progression && typeof source.progression === 'object' ? source.progression : {};
    const currency = progress.currency && typeof progress.currency === 'object' ? progress.currency : {};
    const location = source.location && typeof source.location === 'object' ? source.location : {};
    const legacyAlternatePlace = ["Kaliasna Oryu's Floating Castle", 'Eastern Tradition Kingdom'].includes(location.place);
    const requestedAtlas = atlasById(legacyAlternatePlace ? 'alternate-present-world' : text(sourceWorld.id, WORLD_ATLAS.id, 100));
    const migratedPlace = location.place === "Kaliasna Oryu's Floating Castle" ? 'Chaos Breaker' : location.place;
    const migrationPool = requestedAtlas.id === 'alternate-present-world' ? ALTERNATE_WORLD_LOCATIONS : PRESENT_WORLD_LOCATIONS;
    const migratedMapSite = migrationPool.find(entry => entry.name === migratedPlace)
        || migrationPool.find(entry => entry.name === location.region)
        || migrationPool.find(entry => entry.continent === location.continent)
        || migrationPool[0];

    result.version = 1;
    result.world = { ...requestedAtlas };
    const portraitView = player.portraitView && typeof player.portraitView === 'object' ? player.portraitView : {};
    result.player = {
        name: text(player.name, result.player.name, 100), portrait: text(player.portrait, result.player.portrait, 1500000),
        portraitView: {
            desktop: portraitFrame(portraitView.desktop, result.player.portraitView.desktop),
            mobile: portraitFrame(portraitView.mobile, result.player.portraitView.mobile),
        },
        race: text(player.race, result.player.race, 80),
        age: text(player.age, result.player.age, 40), title: text(player.title, result.player.title, 100),
        gender: text(player.gender, result.player.gender, 80),
        homeContinent: text(player.homeContinent, result.player.homeContinent, 160),
        standing: text(player.standing, result.player.standing, 120),
        affiliation: text(player.affiliation, result.player.affiliation, 160),
        appearance: {
            hair: text(player.appearance?.hair, result.player.appearance.hair, 120),
            eyes: text(player.appearance?.eyes, result.player.appearance.eyes, 120),
            height: text(player.appearance?.height, result.player.appearance.height, 80),
            build: text(player.appearance?.build, result.player.appearance.build, 160),
        },
        profession: text(player.profession, result.player.profession, 100),
        guild: text(player.guild, result.player.guild, 100), party: text(player.party, result.player.party, 100),
        condition: text(player.condition, result.player.condition, 120),
        powerType: text(player.powerType, result.player.powerType, 100), originSkill: text(player.originSkill, result.player.originSkill, 200),
        level: number(player.level, result.player.level, 1, 9999),
        hp: meter(player.hp, result.player.hp), mp: meter(player.mp, result.player.mp),
        stamina: meter(player.stamina, result.player.stamina),
        survival: {
            hunger: survivalMeter(player.survival?.hunger, result.player.survival.hunger),
            thirst: survivalMeter(player.survival?.thirst, result.player.survival.thirst),
        },
        aura: {
            color: auraColor(player.aura?.color, result.player.aura.color),
            infinite: Boolean(player.aura?.infinite ?? result.player.aura.infinite),
            output: number(player.aura?.output, result.player.aura.output, 0, 100),
            control: number(player.aura?.control, result.player.aura.control, 0, 100),
            efficiency: number(player.aura?.efficiency, result.player.aura.efficiency, 0, 100),
            recovery: number(player.aura?.recovery, result.player.aura.recovery, 0, 100),
        },
        fitness: {
            lungCapacity: number(player.fitness?.lungCapacity, result.player.fitness.lungCapacity, 1, 999999),
            aerobicSessions: number(player.fitness?.aerobicSessions, result.player.fitness.aerobicSessions, 0, 999999),
            lastTrainingMessage: text(player.fitness?.lastTrainingMessage, result.player.fitness.lastTrainingMessage, 180),
        },
    };
    result.progression = {
        adventurerRank: RANKS.includes(progress.adventurerRank) ? progress.adventurerRank : result.progression.adventurerRank,
        customRankName: text(progress.customRankName, result.progression.customRankName, 100),
        magicRank: MASTERY.includes(progress.magicRank) ? progress.magicRank : result.progression.magicRank,
        swordRank: MASTERY.includes(progress.swordRank) ? progress.swordRank : result.progression.swordRank,
        experience: number(progress.experience, result.progression.experience),
        experienceMax: number(progress.experienceMax, result.progression.experienceMax, 1, 999999999),
        reputation: number(progress.reputation, result.progression.reputation, -999999, 999999),
        kills: number(progress.kills, result.progression.kills, 0, 999999999),
        currency: {
            name: text(currency.name, result.progression.currency.name, 120),
            gold: number(currency.gold, result.progression.currency.gold),
            silver: number(currency.silver, result.progression.currency.silver),
            copper: number(currency.copper, result.progression.currency.copper),
        },
    };
    const worldClock = source.worldClock && typeof source.worldClock === 'object' ? source.worldClock : {};
    const worldDay = number(worldClock.day, result.worldClock.day, 1, 999999);
    result.worldClock = {
        day: worldDay,
        dayName: text(worldClock.dayName, `Day ${worldDay}`, 80),
        time: /^([01]\d|2[0-3]):[0-5]\d$/.test(worldClock.time) ? worldClock.time : result.worldClock.time,
        phase: DAY_PHASES.includes(worldClock.phase) ? worldClock.phase : result.worldClock.phase,
    };
    const migrateAtlas = number(location.atlasVersion, 1, 1, 99) < 2;
    const legacyDiscovered = cleanDiscoveredLocations(location.discovered);
    const incomingDiscoveredByWorld = location.discoveredByWorld && typeof location.discoveredByWorld === 'object'
        ? location.discoveredByWorld : null;
    const fallbackDiscoveredByWorld = result.location.discoveredByWorld && typeof result.location.discoveredByWorld === 'object'
        ? result.location.discoveredByWorld : {};
    const discoveredByWorld = Object.fromEntries(Object.keys(WORLD_ATLASES).map(worldId => {
        const scoped = incomingDiscoveredByWorld?.[worldId];
        const fallbackScoped = fallbackDiscoveredByWorld[worldId];
        const values = Array.isArray(scoped) ? scoped
            : !incomingDiscoveredByWorld && worldId === requestedAtlas.id ? legacyDiscovered
                : Array.isArray(fallbackScoped) ? fallbackScoped : [];
        return [worldId, cleanDiscoveredLocations(values)];
    }));
    result.location = {
        atlasVersion: 4,
        continent: text(location.continent, result.location.continent, 100),
        region: text(location.region, result.location.region, 120),
        place: text(migratedPlace, result.location.place, 160),
        detail: text(location.detail, result.location.detail, 300),
        zoneType: ZONE_TYPES.includes(location.zoneType) ? location.zoneType : result.location.zoneType,
        mapX: migrateAtlas && migratedMapSite ? migratedMapSite.x : number(location.mapX, migratedMapSite?.x ?? result.location.mapX, 0, WORLD_MAP_WIDTH),
        mapY: migrateAtlas && migratedMapSite ? migratedMapSite.y : number(location.mapY, migratedMapSite?.y ?? result.location.mapY, 0, WORLD_MAP_HEIGHT),
        heading: number(location.heading, result.location.heading, 0, 359.999),
        discovered: [...discoveredByWorld[requestedAtlas.id]],
        discoveredByWorld,
        pins: Array.isArray(location.pins) ? location.pins.map(pin => ({
            id: text(pin?.id, uid(), 100), locationId: text(pin?.locationId, '', 100),
            worldId: WORLD_ATLASES[pin?.worldId] ? pin.worldId : WORLD_ATLAS.id,
            x: migrateAtlas && allMapLocation(pin?.locationId) ? allMapLocation(pin.locationId).x : optionalNumber(pin?.x, null, 0, WORLD_MAP_WIDTH),
            y: migrateAtlas && allMapLocation(pin?.locationId) ? allMapLocation(pin.locationId).y : optionalNumber(pin?.y, null, 0, WORLD_MAP_HEIGHT),
            continent: text(pin?.continent, '', 100), region: text(pin?.region, '', 120),
            label: text(pin?.label, 'Marked location', 100), note: text(pin?.note, '', 300),
        })).filter(pin => pin.locationId || (pin.x !== null && pin.y !== null)).slice(0, 250) : result.location.pins,
    };
    const travel = source.travel && typeof source.travel === 'object' ? source.travel : {};
    const namedTravelDestination = mapLocationByName(travel.destinationPlace || travel.destination, result);
    const currentWorldMinutes = worldClockMinutes(result.worldClock);
    result.travel = {
        status: ['Idle', 'Preparing', 'Traveling', 'Delayed', 'Arrived'].includes(travel.status) ? travel.status : result.travel.status,
        origin: text(travel.origin, result.travel.origin, 160), destination: text(travel.destination, result.travel.destination, 160),
        route: ['Road', 'Caravan', 'Sea', 'Off-road', 'Unknown'].includes(travel.route) ? travel.route : result.travel.route,
        totalDays: number(travel.totalDays, result.travel.totalDays, 0, 999999),
        remainingDays: number(travel.remainingDays, result.travel.remainingDays, 0, 999999),
        notes: text(travel.notes, result.travel.notes, 500),
        originX: optionalNumber(travel.originX, result.location.mapX, 0, WORLD_MAP_WIDTH),
        originY: optionalNumber(travel.originY, result.location.mapY, 0, WORLD_MAP_HEIGHT),
        originContinent: text(travel.originContinent, result.location.continent, 100),
        originRegion: text(travel.originRegion, result.location.region, 120),
        destinationX: optionalNumber(travel.destinationX, namedTravelDestination?.x ?? null, 0, WORLD_MAP_WIDTH),
        destinationY: optionalNumber(travel.destinationY, namedTravelDestination?.y ?? null, 0, WORLD_MAP_HEIGHT),
        destinationContinent: text(travel.destinationContinent, namedTravelDestination?.continent || '', 100),
        destinationRegion: text(travel.destinationRegion, namedTravelDestination?.region || '', 120),
        destinationPlace: text(travel.destinationPlace, namedTravelDestination?.name || travel.destination, 160),
        startedAtWorldMinutes: optionalNumber(travel.startedAtWorldMinutes, currentWorldMinutes, 0, 9999999999),
        lastWorldMinutes: optionalNumber(travel.lastWorldMinutes, currentWorldMinutes, 0, 9999999999),
        trackedUserTurns: number(travel.trackedUserTurns, 0, 0, 999999),
        lastUserProgressMessage: text(travel.lastUserProgressMessage, '', 180),
        routePoints: (Array.isArray(travel.routePoints) ? travel.routePoints : result.travel.routePoints || []).map(point => ({
            x: number(point?.x, 0, 0, WORLD_MAP_WIDTH), y: number(point?.y, 0, 0, WORLD_MAP_HEIGHT),
            name: text(point?.name, '', 120), region: text(point?.region, '', 120),
        })).filter(point => point.x || point.y).slice(0, 32),
    };
    const scene = source.scene && typeof source.scene === 'object' ? source.scene : {};
    result.scene = {
        position: text(scene.position, result.scene.position, 200),
        weather: text(scene.weather, result.scene.weather, 120),
        temperature: optionalNumber(scene.temperature, result.scene.temperature, -1000, 1000),
    };
    result.sceneMap = normalizeSceneMap(source.sceneMap, result.sceneMap);
    if (Array.isArray(source.inventory)) result.inventory = source.inventory.map(item).filter(Boolean)
        .filter(entry => !/^traveler['’]s clothes$/i.test(entry.name.trim())).slice(0, 200);
    if (Array.isArray(source.inventoryLogs)) result.inventoryLogs = source.inventoryLogs.map(inventoryLogEntry).filter(Boolean).slice(-250);
    if (Array.isArray(source.transactions)) result.transactions = source.transactions.map(currencyTransaction).filter(Boolean).slice(-250);
    if (Array.isArray(source.journeyLogs)) result.journeyLogs = source.journeyLogs.map(journeyLogEntry).filter(Boolean).slice(-100);
    const systems = source.systems && typeof source.systems === 'object' ? source.systems : {};
    const baseSystems = result.systems && typeof result.systems === 'object' ? result.systems : defaultSystemsState();
    result.systems = {
        effects: (Array.isArray(systems.effects) ? systems.effects : baseSystems.effects || []).map(entry => statusEffect(entry)).filter(Boolean).slice(-60),
        combatLogs: (Array.isArray(systems.combatLogs) ? systems.combatLogs : baseSystems.combatLogs || []).map(combatLogEntry).filter(Boolean).slice(-120),
        audit: (Array.isArray(systems.audit) ? systems.audit : baseSystems.audit || []).map(auditEntry).filter(Boolean).slice(-80),
        regionalWeather: (Array.isArray(systems.regionalWeather) ? systems.regionalWeather : baseSystems.regionalWeather || [])
            .map(regionalWeatherEntry).filter(Boolean).slice(-80),
        lastRepairAt: text(systems.lastRepairAt, text(baseSystems.lastRepairAt, '', 60), 60),
        repairCount: number(systems.repairCount, number(baseSystems.repairCount, 0, 0, 999999), 0, 999999),
    };
    if (Array.isArray(source.skills)) result.skills = source.skills.map(skill).filter(Boolean).slice(0, 100);
    if (Array.isArray(source.characterLifeMapActors)) result.characterLifeMapActors = source.characterLifeMapActors
        .map(value => characterLifeMapActor(value)).filter(Boolean).slice(0, 80);
    const onboarding = source.onboarding && typeof source.onboarding === 'object' ? source.onboarding : {};
    result.onboarding = {
        identitySeeded: Boolean(onboarding.identitySeeded),
        loadoutSeeded: Object.hasOwn(onboarding, 'loadoutSeeded') ? Boolean(onboarding.loadoutSeeded) : Boolean(result.inventory.length || result.skills.length),
        characterMapSeeded: Boolean(onboarding.characterMapSeeded),
        locationSeeded: Boolean(onboarding.locationSeeded),
    };
    const proficiencies = source.proficiencies && typeof source.proficiencies === 'object' ? source.proficiencies : {};
    result.proficiencies.magic = Object.fromEntries(MAGIC_DISCIPLINES.map(entry => [
        entry.id, number(proficiencies.magic?.[entry.id], result.proficiencies.magic[entry.id], 0, 100),
    ]));
    result.proficiencies.sword = Object.fromEntries(SWORD_STYLES.map(entry => [
        entry.id, number(proficiencies.sword?.[entry.id], result.proficiencies.sword[entry.id], 0, 100),
    ]));
    result.proficiencies.customMagic = normalizeCustomProficiencies(proficiencies.customMagic, result.proficiencies.customMagic, 'magic');
    result.proficiencies.customSword = normalizeCustomProficiencies(proficiencies.customSword, result.proficiencies.customSword, 'sword');
    if (Array.isArray(proficiencies.techniques)) result.proficiencies.techniques = proficiencies.techniques.map(technique).filter(Boolean).slice(0, 150);
    if (Array.isArray(source.quests)) result.quests = source.quests.map(quest).filter(Boolean).slice(0, 100);
    if (Array.isArray(source.npcs)) {
        const existingById = new Map((result.npcs || []).map(entry => [entry.id, entry]));
        const existingByName = new Map((result.npcs || []).map(entry => [entry.name.toLocaleLowerCase(), entry]));
        const byName = new Map();
        source.npcs.forEach(value => {
            const fallbackNpc = existingById.get(value?.id) || existingByName.get(text(value?.name).toLocaleLowerCase()) || {};
            const entry = npcProfile(value, fallbackNpc);
            if (!entry) return;
            const key = entry.name.toLocaleLowerCase();
            byName.set(key, byName.has(key) ? npcProfile(entry, byName.get(key)) : entry);
        });
        result.npcs = [...byName.values()].slice(0, 200);
    }
    if (Array.isArray(source.contacts)) {
        const byName = new Map();
        source.contacts.map(contact).filter(Boolean).forEach(entry => {
            const key = entry.name.toLocaleLowerCase();
            byName.set(key, byName.has(key) ? { ...byName.get(key), ...entry, id: byName.get(key).id } : entry);
        });
        result.contacts = [...byName.values()].slice(0, 200);
    }
    const npcById = new Map(result.npcs.map(entry => [entry.id, entry]));
    const npcByName = new Map(result.npcs.map(entry => [entry.name.toLocaleLowerCase(), entry]));
    result.contacts.forEach(entry => {
        let linked = npcById.get(entry.npcId) || ((entry.npcId || migratingLegacyNpcs) ? npcByName.get(entry.name.toLocaleLowerCase()) : null);
        if (!linked && (entry.npcId || migratingLegacyNpcs)) {
            linked = npcProfile({ name: entry.name, title: entry.title, faction: entry.affiliation, relationship: entry.relationship,
                notes: entry.notes, contactId: entry.id, updatedAt: entry.lastLetterAt || new Date().toISOString() });
            if (linked) {
                result.npcs.push(linked);
                npcById.set(linked.id, linked);
                npcByName.set(linked.name.toLocaleLowerCase(), linked);
            }
        }
        if (linked) {
            entry.npcId = linked.id;
            linked.contactId = entry.id;
        }
    });
    result.npcs.forEach(entry => {
        const linked = result.contacts.find(contactEntry => contactEntry.id === entry.contactId);
        if (linked) linked.npcId = entry.id;
        else if (entry.contactId) entry.contactId = '';
    });
    result.npcs = result.npcs.slice(0, 200);
    const socialSource = source.social && typeof source.social === 'object' ? source.social : {};
    const legacyParty = !socialSource.party && text(player.party, '', 140) && !['Solo', 'None'].includes(text(player.party, '', 140))
        ? { name: player.party } : null;
    const friendlyIds = new Set(friendlyNpcs(result).map(entry => entry.id));
    const cleanSocialIds = values => [...new Set((Array.isArray(values) ? values : [])
        .map(value => text(value, '', 100)).filter(value => value === 'player' || friendlyIds.has(value)))].slice(0, 100);
    const party = partyProfile(socialSource.party || legacyParty, result.social.party);
    if (party) party.memberIds = cleanSocialIds(party.memberIds).filter(value => value !== 'player');
    const sourceGuilds = Array.isArray(socialSource.guilds) ? socialSource.guilds : result.social.guilds;
    const guildsByName = new Map();
    sourceGuilds.map((value, index) => guildProfile(value, result.social.guilds[index] || {})).filter(Boolean).forEach(entry => {
        entry.memberIds = cleanSocialIds(entry.memberIds).filter(value => value !== 'player');
        const key = entry.name.toLocaleLowerCase();
        guildsByName.set(key, guildsByName.has(key) ? { ...guildsByName.get(key), ...entry, id: guildsByName.get(key).id } : entry);
    });
    const household = householdProfile(socialSource.household, result.social.household);
    household.members = household.members.filter(entry => !entry.npcId || friendlyIds.has(entry.npcId));
    result.social = { party, guilds: [...guildsByName.values()].slice(0, 30), household };
    if (party) result.player.party = party.name;
    if (result.social.guilds.length) result.player.guild = result.social.guilds[0].name;
    if (Array.isArray(source.letters)) {
        const signatures = new Set();
        result.letters = source.letters.map(letter).filter(Boolean).filter(entry => {
            const signature = [entry.direction, entry.contactId, entry.fromName, entry.toName, entry.subject, entry.body]
                .map(value => String(value).trim().toLocaleLowerCase()).join('|');
            if (signatures.has(signature)) return false;
            signatures.add(signature);
            return true;
        }).slice(-300);
    }
    const music = source.music && typeof source.music === 'object' ? source.music : {};
    result.music = {
        tracks: Array.isArray(music.tracks) ? music.tracks.map(musicTrack).filter(Boolean).slice(0, 100) : result.music.tracks,
        currentId: text(music.currentId, '', 100), repeat: Boolean(music.repeat), shuffle: Boolean(music.shuffle),
    };
    if (!result.music.tracks.some(track => track.id === result.music.currentId)) result.music.currentId = result.music.tracks[0]?.id || '';
    if (Array.isArray(source.journal)) {
        result.journal = source.journal.map(entry => ({
            id: text(entry?.id, uid(), 100), text: text(entry?.text, '', 500), at: text(entry?.at, '', 60),
        })).filter(entry => entry.text).slice(-30);
    }
    result.updatedAt = typeof source.updatedAt === 'string' ? source.updatedAt : result.updatedAt;
    result.updateSource = text(source.updateSource, result.updateSource, 40);
    result.syncCursor = {
        user: Number.isInteger(source.syncCursor?.user) ? source.syncCursor.user : result.syncCursor.user,
        assistant: Number.isInteger(source.syncCursor?.assistant) ? source.syncCursor.assistant : result.syncCursor.assistant,
    };
    return result;
}

function getState() {
    const context = SillyTavern.getContext();
    if (!context.getCurrentChatId?.()) return defaultState();
    const saved = context.chatMetadata[METADATA_KEY];
    return saved && typeof saved === 'object' ? normalize(saved) : defaultState();
}

function activeContinuityKey(context = SillyTavern.getContext()) {
    const groupId = context.groupId ?? context.selectedGroup ?? context.group?.id;
    if (groupId !== null && groupId !== undefined && groupId !== '') return `group:${groupId}`;
    const characterId = context.characterId ?? context.chid;
    const character = context.characters?.[characterId] || context.character || {};
    const identity = text(character.avatar || character.filename || character.name || context.name2 || String(characterId ?? ''), '', 240);
    return identity ? `character:${identity}` : '';
}

function continuityStorageKey(identity = activeContinuityKey()) {
    return identity ? `${CONTINUITY_STORAGE_PREFIX}${encodeURIComponent(identity)}` : '';
}

function writeContinuitySnapshot(state) {
    if (!getSettings().autoContinuity) return;
    const context = SillyTavern.getContext();
    const key = continuityStorageKey(activeContinuityKey(context));
    const chatId = context.getCurrentChatId?.();
    if (!key || !chatId) return;
    const record = { format: STATE_PACKAGE_FORMAT, version: 1, sourceChatId: chatId, savedAt: new Date().toISOString(), state: normalize(state) };
    try {
        localStorage.setItem(key, JSON.stringify(record));
    } catch (error) {
        // A large embedded player portrait can exceed Safari's storage quota. The
        // structured RPG state is still more important than failing continuity.
        record.state.player.portrait = '';
        try { localStorage.setItem(key, JSON.stringify(record)); }
        catch (storageError) { console.warn('[Tretaresia RPG] Could not cache character continuity.', storageError); }
    }
}

async function copyContinuityMedia(state, sourceChatId, targetChatId) {
    if (!sourceChatId || !targetChatId || sourceChatId === targetChatId) return state;
    const store = SillyTavern.libs?.localforage;
    if (!store) {
        state.npcs.forEach(entry => { entry.hasPortrait = false; });
        state.music = { tracks: [], currentId: '', repeat: false, shuffle: false };
        return state;
    }
    for (const entry of state.npcs) {
        if (!entry.hasPortrait) continue;
        try {
            const blob = await store.getItem(npcPortraitStorageKey(entry.id, sourceChatId));
            if (blob) await store.setItem(npcPortraitStorageKey(entry.id, targetChatId), blob);
            else entry.hasPortrait = false;
        } catch (error) {
            entry.hasPortrait = false;
        }
    }
    const copiedTracks = [];
    for (const track of state.music.tracks) {
        try {
            const blob = await store.getItem(audioStorageKey(track.id, sourceChatId));
            if (!blob) continue;
            await store.setItem(audioStorageKey(track.id, targetChatId), blob);
            copiedTracks.push(track);
        } catch (error) { /* Keep continuity usable even when one local file fails. */ }
    }
    state.music.tracks = copiedTracks;
    if (!copiedTracks.some(track => track.id === state.music.currentId)) state.music.currentId = copiedTracks[0]?.id || '';
    return state;
}

async function restoreContinuityForCurrentChat() {
    const settings = getSettings();
    const context = SillyTavern.getContext();
    const chatId = context.getCurrentChatId?.();
    if (!settings.autoContinuity || continuityRestoreInProgress || !chatId || context.chatMetadata?.[METADATA_KEY] || hasUserReply()) return false;
    const key = continuityStorageKey(activeContinuityKey(context));
    if (!key) return false;
    let record;
    try { record = JSON.parse(localStorage.getItem(key) || 'null'); }
    catch (error) { return false; }
    if (!record?.state || record.format !== STATE_PACKAGE_FORMAT || record.sourceChatId === chatId) return false;
    continuityRestoreInProgress = true;
    try {
        const continued = await copyContinuityMedia(normalize(record.state), record.sourceChatId, chatId);
        continued.syncCursor = { user: null, assistant: null };
        continued.updatedAt = null;
        continued.updateSource = 'continuity';
        const saved = await persistState(continued, 'continuity');
        if (saved) {
            globalThis.dispatchEvent(new CustomEvent('tretaresia-rpg:continuity-restored', {
                detail: {
                    sourceChatId: record.sourceChatId,
                    targetChatId: chatId,
                    characterKey: activeContinuityKey(context),
                    summaryExtensionCompatible: true,
                },
            }));
            notify('success', settings.language === 'th' ? 'สานต่อข้อมูลตัวละครในแชตใหม่แล้ว' : 'Character state continued into this new chat.');
        }
        return saved;
    } finally {
        continuityRestoreInProgress = false;
    }
}

function captureContinuityBeforeNewChat(trigger = 'native-new-chat') {
    const context = SillyTavern.getContext();
    const chatId = context.getCurrentChatId?.();
    if (!getSettings().autoContinuity || !chatId) return false;
    writeContinuitySnapshot(getState());
    globalThis.dispatchEvent(new CustomEvent('tretaresia-rpg:continuity-captured', {
        detail: { sourceChatId: chatId, characterKey: activeContinuityKey(context), trigger },
    }));
    return true;
}

function bindNewChatSummaryCompatibility() {
    document.addEventListener('click', event => {
        const target = event.target instanceof Element
            ? event.target.closest(`#option_start_new_chat, #${SUMMARY_NEW_CHAT_MENU_ID}`) : null;
        if (!target) return;
        captureContinuityBeforeNewChat(target.id === SUMMARY_NEW_CHAT_MENU_ID ? 'nutho-summary-new-chat' : 'native-new-chat');
    }, true);

    globalThis.TretaresiaRpgContinuity = Object.freeze({
        version: LAUNCHER_BIND_VERSION,
        summaryExtension: 'nutho-start-new-chat-with-summary',
        capture: captureContinuityBeforeNewChat,
        restore: restoreContinuityForCurrentChat,
    });
}

function portableState(state) {
    const portable = normalize(state);
    portable.npcs.forEach(entry => { entry.hasPortrait = false; });
    portable.music = { tracks: [], currentId: '', repeat: portable.music.repeat, shuffle: portable.music.shuffle };
    portable.syncCursor = { user: null, assistant: null };
    return portable;
}

function exportStatePackage() {
    const context = SillyTavern.getContext();
    if (!context.getCurrentChatId?.()) return notify('warning', getSettings().language === 'th' ? 'เปิดแชตก่อนส่งออกข้อมูล' : 'Open a chat before exporting state.');
    const state = getState();
    const payload = {
        format: STATE_PACKAGE_FORMAT, version: 1, exportedAt: new Date().toISOString(),
        character: { key: activeContinuityKey(context), name: state.player.name },
        localMediaIncluded: false, state: portableState(state),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const safeName = (state.player.name || 'character').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'character';
    anchor.href = url;
    anchor.download = `tretaresia-${safeName}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('success', getSettings().language === 'th' ? 'ส่งออกข้อมูลตัวละครแล้ว' : 'Character state exported.');
}

async function importStatePackage(file) {
    if (!file) return;
    const context = SillyTavern.getContext();
    if (!context.getCurrentChatId?.()) throw new Error(getSettings().language === 'th' ? 'เปิดแชตก่อนนำเข้าข้อมูล' : 'Open a chat before importing state.');
    const parsed = JSON.parse(await file.text());
    const candidate = parsed?.format === STATE_PACKAGE_FORMAT ? parsed.state : parsed?.state || parsed;
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) throw new Error('This is not a valid Tretaresia RPG state file.');
    const confirmed = globalThis.confirm?.(getSettings().language === 'th' ? 'แทนที่ข้อมูล RPG ของแชตนี้ด้วยไฟล์ที่เลือก?' : 'Replace this chat\'s RPG state with the selected file?');
    if (confirmed === false) return;
    const imported = portableState(candidate);
    await persistState(imported, 'import');
    notify('success', getSettings().language === 'th' ? 'นำเข้าข้อมูลตัวละครแล้ว' : 'Character state imported.');
}

function resolveLevelProgression(state) {
    let levelUps = 0;
    while (state.progression.experience >= state.progression.experienceMax && levelUps < 100) {
        state.progression.experience -= state.progression.experienceMax;
        state.player.level += 1;
        state.progression.experienceMax = Math.max(state.progression.experienceMax + 25, Math.round(state.progression.experienceMax * 1.2));
        levelUps += 1;
    }
    return levelUps;
}

function auditValue(value) {
    if (value === null || value === undefined || value === '') return '—';
    if (Array.isArray(value)) return value.map(entry => typeof entry === 'object' ? entry.name || entry.id || '?' : entry).join(', ') || '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function trackedStateSnapshot(state) {
    const highestMagic = Math.max(0, ...Object.values(state.proficiencies.magic || {}).map(Number));
    return {
        'player.hp': `${state.player.hp.current}/${state.player.hp.max}`,
        'player.mp': state.player.aura.infinite ? '∞' : `${state.player.mp.current}/${state.player.mp.max}`,
        'player.stamina': `${state.player.stamina.current}/${state.player.stamina.max}`,
        'player.hunger': state.player.survival.hunger,
        'player.thirst': state.player.survival.thirst,
        'player.condition': state.player.condition,
        'player.powerType': state.player.powerType,
        'player.identity': [state.player.race, state.player.gender, state.player.age, state.player.homeContinent, state.player.standing, state.player.affiliation].filter(Boolean).join(' · '),
        'player.appearance': Object.values(state.player.appearance || {}).filter(Boolean).join(' · '),
        'aura.output': state.player.aura.output,
        'aura.control': state.player.aura.control,
        'aura.efficiency': state.player.aura.efficiency,
        'aura.recovery': state.player.aura.recovery,
        'world.time': `${state.worldClock.dayName} ${state.worldClock.time}`,
        'scene.weather': state.scene.weather,
        'scene.position': state.scene.position,
        'location': [state.location.continent, state.location.region, state.location.place, state.location.detail].filter(Boolean).join(' · '),
        'travel': `${state.travel.status}:${Math.round(travelProgress(state) * 100)}%:${state.travel.destinationPlace || state.travel.destination || '—'}`,
        'party': state.social.party ? `${state.social.party.name}: ${state.social.party.memberIds.map(id => socialMemberName(state, id)).join(', ')}` : 'Solo',
        'guilds': state.social.guilds.map(entry => `${entry.name} Lv.${entry.level}`).join(', ') || '—',
        'effects': state.systems.effects.map(entry => `${entry.name} (${entry.severity})`).join(', ') || '—',
        'inventory': state.inventory.map(entry => `${entry.name}×${entry.quantity}`).join(', ') || '—',
        'quests': state.quests.map(entry => `${entry.name}:${entry.status}:${entry.progress}%`).join(', ') || '—',
        'power.mastery': highestMagic,
    };
}

function appendStateAudit(state, previous, source = 'manual') {
    state.systems ||= defaultSystemsState();
    const before = trackedStateSnapshot(previous);
    const after = trackedStateSnapshot(state);
    const changes = Object.keys(after).filter(path => before[path] !== after[path]).map(path => ({
        path, before: auditValue(before[path]), after: auditValue(after[path]),
        reason: source.replaceAll('-', ' '), confidence: /fallback|reconcile/.test(source) ? 85 : 100,
    }));
    if (!changes.length) return null;
    const entry = auditEntry({
        source, summary: `${changes.length} tracked field${changes.length === 1 ? '' : 's'} changed`,
        messageId: Number.isInteger(state.syncCursor?.assistant) ? state.syncCursor.assistant : null, changes,
    });
    if (entry) state.systems.audit = [...(state.systems.audit || []), entry].slice(-80);
    return entry;
}

async function persistState(candidate, source = 'manual') {
    const context = SillyTavern.getContext();
    if (!context.getCurrentChatId?.()) {
        notify('warning', 'Open a character or group chat before changing the role-play state.');
        return false;
    }
    const previous = getState();
    let state = normalize(candidate, previous);
    synchronizeWorldState(state, previous);
    synchronizeDerivedPlayerState(state);
    state = normalize(state, previous);
    syncCharacterLifeLinks(state);
    resolveLevelProgression(state);
    recordInventoryDiff(state, previous, source);
    state = normalize(state, previous);
    appendStateAudit(state, previous, source);
    state = normalize(state, previous);
    if (state.quests.some(entry => entry.status === 'Completed'
        && previous.quests.find(candidate => candidate.id === entry.id)?.status !== 'Completed')) activeQuestSection = 'completed';
    else if (state.quests.some(entry => entry.status === 'Failed'
        && previous.quests.find(candidate => candidate.id === entry.id)?.status !== 'Failed')) activeQuestSection = 'failed';
    state.updatedAt = new Date().toISOString();
    state.updateSource = source;
    const settings = getSettings();
    if (settings.auraColor !== state.player.aura.color) {
        settings.auraColor = state.player.aura.color;
        context.saveSettingsDebounced?.();
        const auraControl = document.getElementById('tretaresia-rpg-aura-color');
        if (auraControl instanceof HTMLInputElement) auraControl.value = state.player.aura.color;
    }
    if (storyWorldId(state) !== storyWorldId(previous)) {
        mapAtlasSelection = '';
        mapSelectionId = null;
        mapDraftPoint = null;
        Object.assign(mapView, { scale: 1, x: 0, y: 0 });
    }
    context.chatMetadata[METADATA_KEY] = state;
    updatePrompt(state);
    renderAll(state);
    pendingSave = pendingSave.catch(() => undefined).then(() => context.saveMetadata());
    await pendingSave;
    writeContinuitySnapshot(state);
    queueCharacterLifeSkillSync(state);
    return true;
}

function assistantTurnKey(messageId, context = SillyTavern.getContext()) {
    const id = Number(messageId);
    if (!Number.isInteger(id) || id < 0) return '';
    let userIndex = -1;
    let userFingerprint = '';
    for (let index = Math.min(id - 1, (context.chat?.length || 0) - 1); index >= 0; index -= 1) {
        const message = context.chat[index];
        if (!message?.is_user || message.is_system) continue;
        userIndex = index;
        userFingerprint = shortHash(`${message.send_date || ''}|${message.mes || ''}`);
        break;
    }
    return `${id}:${userIndex}:${userFingerprint}`;
}

function assistantVariantKey(message) {
    if (!message) return '';
    const swipe = Number.isInteger(Number(message.swipe_id)) ? Number(message.swipe_id) : -1;
    return `${swipe}:${shortHash(message.mes || '')}`;
}

function turnHistory(context = SillyTavern.getContext(), create = true) {
    if (!context?.getCurrentChatId?.()) return null;
    context.chatMetadata ||= {};
    if (create) context.chatMetadata[TURN_HISTORY_KEY] ||= { version: 1, entries: [] };
    const history = context.chatMetadata[TURN_HISTORY_KEY];
    if (!history || typeof history !== 'object') return null;
    history.version = 1;
    history.entries = Array.isArray(history.entries) ? history.entries : [];
    return history;
}

function assistantCheckpoint(messageId, { create = false } = {}) {
    const context = SillyTavern.getContext();
    const key = assistantTurnKey(messageId, context);
    const history = turnHistory(context, create);
    if (!key || !history) return null;
    let entry = history.entries.find(candidate => candidate?.key === key)
        || (!create ? [...history.entries].reverse().find(candidate => Number(candidate?.messageId) === Number(messageId)) : null);
    if (!entry && create) {
        entry = {
            key,
            messageId: Number(messageId),
            baseState: clone(getState()),
            variants: {},
            activeVariant: '',
            applied: false,
            createdAt: new Date().toISOString(),
        };
        history.entries.push(entry);
        history.entries = history.entries.slice(-3);
    }
    if (entry) {
        entry.variants = entry.variants && typeof entry.variants === 'object' ? entry.variants : {};
        entry.messageId = Number(messageId);
    }
    return entry || null;
}

async function persistExactState(snapshot, source) {
    const context = SillyTavern.getContext();
    if (!context.getCurrentChatId?.() || !snapshot) return false;
    const state = normalize(clone(snapshot));
    state.updatedAt = new Date().toISOString();
    state.updateSource = source;
    context.chatMetadata[METADATA_KEY] = state;
    updatePrompt(state);
    renderAll(state);
    pendingSave = pendingSave.catch(() => undefined).then(() => context.saveMetadata());
    await pendingSave;
    writeContinuitySnapshot(state);
    queueCharacterLifeSkillSync(state);
    return true;
}

async function replaceAssistantTurnState(messageId, { reuseVariant = false, reason = 'swipe' } = {}) {
    const context = SillyTavern.getContext();
    const entry = assistantCheckpoint(messageId);
    if (!entry?.baseState) return false;
    const message = context.chat?.[Number(messageId)];
    const variantKey = reuseVariant ? assistantVariantKey(message) : '';
    const storedVariant = variantKey ? entry.variants?.[variantKey] : null;
    await persistExactState(entry.baseState, `turn-rollback-${reason}`);
    entry.activeVariant = '';
    entry.applied = false;
    if (storedVariant?.state) {
        await persistExactState(storedVariant.state, `turn-variant-${reason}`);
        entry.activeVariant = variantKey;
        entry.applied = true;
    }
    await SillyTavern.getContext().saveMetadata?.();
    globalThis.dispatchEvent(new CustomEvent('tretaresia-rpg:turn-rollback', {
        detail: { messageId: Number(messageId), reason, restoredVariant: Boolean(storedVariant?.state) },
    }));
    return true;
}

function queueAssistantTurnReplacement(messageId, options) {
    assistantRollbackQueue = assistantRollbackQueue.catch(() => undefined)
        .then(() => replaceAssistantTurnState(messageId, options))
        .catch(error => console.warn('[Tretaresia RPG] Could not roll back the replaced assistant turn.', error));
    return assistantRollbackQueue;
}

function isReplacementGeneration(generationType) {
    const value = typeof generationType === 'string' ? generationType : JSON.stringify(generationType || '');
    return /regenerat|swipe/i.test(value);
}

function aiSceneMap(state) {
    const activeMap = state.sceneMap.maps.find(entry => entry.id === state.sceneMap.activeMapId);
    const activeFloor = activeMap?.floors.find(entry => entry.id === state.sceneMap.activeFloorId);
    return {
        activeMapId: state.sceneMap.activeMapId,
        activeFloorId: state.sceneMap.activeFloorId,
        playerRoomId: state.sceneMap.playerRoomId,
        maps: state.sceneMap.maps.map(map => ({
            id: map.id, name: map.name, place: map.place, locked: map.locked,
            floors: map.floors.map(floor => floor === activeFloor ? {
                id: floor.id, name: floor.name, level: floor.level,
                rooms: floor.rooms.map(({ id, name, type, x, y, width, height, discovered, locked }) => (
                    { id, name, type, x, y, width, height, discovered, locked }
                )),
                connections: floor.connections.map(({ id, from, to, type, locked }) => ({ id, from, to, type, locked })),
            } : {
                id: floor.id, name: floor.name, level: floor.level,
                rooms: floor.rooms.map(({ id, name, type, discovered, locked }) => ({ id, name, type, discovered, locked })),
            }),
        })),
    };
}

function aiState(state, { privateTracker = false } = {}) {
    const safePlayer = { ...state.player };
    delete safePlayer.portrait;
    delete safePlayer.portraitView;
    const recentTranscript = SillyTavern.getContext().chat.slice(-8).map(message => text(message?.mes, '', 3000)).join(' ').toLocaleLowerCase();
    const friendly = friendlyNpcs(state);
    const socialNpcIds = new Set([
        ...(state.social.party?.memberIds || []),
        ...state.social.guilds.flatMap(entry => entry.memberIds || []),
        ...state.social.household.members.map(entry => entry.id),
    ]);
    const rankedNpcs = [...friendly].sort((a, b) => {
        const score = entry => (recentTranscript.includes(entry.name.toLocaleLowerCase()) ? 8 : 0)
            + (socialNpcIds.has(entry.id) ? 5 : 0) + (entry.mapVisible ? 3 : 0) + (entry.lifeMode === 'Active' ? 1 : 0);
        const aActive = score(a);
        const bActive = score(b);
        return bActive - aActive || String(b.updatedAt).localeCompare(String(a.updatedAt));
    });
    const recentNpcs = rankedNpcs.slice(0, 6);
    const relevantEntries = (values, limit) => [...values].sort((a, b) => {
        const score = value => recentTranscript.includes(text(value?.name, '', 160).toLocaleLowerCase()) ? 1 : 0;
        return score(b) - score(a);
    }).slice(0, limit);
    const activeQuests = state.quests.filter(entry => !['Completed', 'Failed'].includes(entry.status)).sort((a, b) => {
        const active = value => /active|offered|in progress|ongoing/i.test(text(value?.status));
        const mentioned = value => recentTranscript.includes(text(value?.name, '', 180).toLocaleLowerCase());
        return Number(mentioned(b)) - Number(mentioned(a)) || Number(active(b)) - Number(active(a)) || String(b.updatedAt || b.receivedAt || '').localeCompare(String(a.updatedAt || a.receivedAt || ''));
    }).slice(0, 12);
    const questArchive = state.quests.filter(entry => ['Completed', 'Failed'].includes(entry.status))
        .sort((a, b) => String(b.completedAt || b.failedAt || b.updatedAt || '').localeCompare(String(a.completedAt || a.failedAt || a.updatedAt || ''))).slice(0, 16);
    const snapshot = {
        player: safePlayer,
        world: state.world,
        progression: state.progression,
        worldClock: state.worldClock,
        location: { ...state.location, discovered: discoveredLocationsFor(state), discoveredByWorld: undefined, pins: undefined },
        travel: state.travel,
        scene: state.scene,
        sceneMap: aiSceneMap(state),
        inventory: relevantEntries(state.inventory, 20).map(({ id, name, quantity, category }) => [id, name, quantity, category]),
        skills: relevantEntries(state.skills, 16).map(({ id, name, rank, type }) => [id, name, rank, type]),
        proficiencies: {
            magic: state.proficiencies.magic,
            sword: state.proficiencies.sword,
            customMagic: state.proficiencies.customMagic.slice(0, 30).map(({ id, name, proficiency, iconKey }) => [id, name, proficiency, iconKey]),
            customSword: state.proficiencies.customSword.slice(0, 30).map(({ id, name, proficiency, iconKey }) => [id, name, proficiency, iconKey]),
            techniques: state.proficiencies.techniques.slice(0, 40).map(({ id, name, category, proficiency }) => [id, name, category, proficiency]),
        },
        quests: activeQuests.map(({ id, name, type, status, objective, reward, giver, progress }) => [id, name, type, status, objective, reward, giver, progress]),
        questArchive: questArchive.map(({ id, name, type, status, rewardClaimed }) => [id, name, type, status, rewardClaimed]),
        social: {
            party: state.social.party ? {
                id: state.social.party.id, name: state.social.party.name, leaderId: state.social.party.leaderId,
                memberIds: state.social.party.memberIds, formation: state.social.party.formation,
                roles: state.social.party.roles, sharedFunds: state.social.party.sharedFunds,
            } : null,
            guilds: state.social.guilds.map(({ id, name, description, rank, level, reputation, headquarters, alliances, enemies, leaderId, memberIds, treasury, quests }) => (
                { id, name, description, rank, level, reputation, headquarters, alliances, enemies, leaderId, memberIds, treasury, quests }
            )),
            household: { id: state.social.household.id, name: state.social.household.name, members: state.social.household.members },
        },
        systems: {
            effects: state.systems.effects,
            recentCombat: state.systems.combatLogs.slice(-8),
            regionalWeather: state.systems.regionalWeather.slice(-16),
        },
        npcIndex: rankedNpcs.slice(0, 24).map(({ id, name, relationship, location, faction }) => [id, name, relationship, location, faction]),
        npcWorld: rankedNpcs.filter(entry => entry.lifeMode === 'Active' || entry.mapVisible || socialNpcIds.has(entry.id)).slice(0, 12)
            .map(({ id, name, location, mapX, mapY, mapVisible, lifeMode, activity, activityUpdatedDay }) => [id, name, location, mapX, mapY, mapVisible, lifeMode, activity, activityUpdatedDay]),
        npcs: recentNpcs.map(entry => ({
            id: entry.id, name: entry.name, title: entry.title, race: entry.race, age: entry.age, faction: entry.faction,
            relationship: entry.relationship, relationshipState: entry.relationshipState, affection: entry.affection,
            trust: entry.trust, loyalty: entry.loyalty, fear: entry.fear, corruption: entry.corruption, lust: entry.lust,
            location: entry.location, lastSeen: entry.lastSeen, maritalStatus: entry.maritalStatus, partner: entry.partner, children: entry.children,
            mapX: entry.mapX, mapY: entry.mapY, mapVisible: entry.mapVisible, lifeMode: entry.lifeMode, activity: entry.activity, activityUpdatedDay: entry.activityUpdatedDay,
            stats: entry.stats,
            abilities: entry.abilities.slice(0, 4).map(({ id, name, category, level, proficiency }) => [id, name, category, level, proficiency]),
            customMeters: entry.customMeters.slice(0, 8).map(({ id, name, value }) => [id, name, value]),
            knowledge: entry.knowledge.slice(-12).map(({ id, fact, source, confidence, learnedDay }) => ({ id, fact, source, confidence, learnedDay })),
        })),
        contacts: relevantEntries(state.contacts, 12).map(({ id, name, title, affiliation, relationship }) => [id, name, title, affiliation, relationship]),
        letters: state.letters.slice(-5).map(({ id, contactId, fromName, toName, subject, direction, status, createdAt }) => (
            [id, contactId, fromName, toName, subject, direction, status, createdAt]
        )),
    };
    if (privateTracker) {
        snapshot.transactions = state.transactions.slice(-30).map(({ at, currencyName, amounts, balance, reason, source }) => ({ at, currencyName, amounts, balance, reason, source }));
        snapshot.journeyLogs = state.journeyLogs.slice(-20).map(({ at, place, day, kind, text: entryText }) => ({ at, place, day, kind, text: entryText }));
        snapshot.npcs.forEach(entry => {
            const source = state.npcs.find(candidate => candidate.id === entry.id);
            if (source?.diary.at(-1)) entry.diaryLatest = { mood: source.diary.at(-1).mood, text: source.diary.at(-1).text.slice(0, 240) };
        });
    }
    return snapshot;
}

function roleplayState(state) {
    const friendly = friendlyNpcs(state);
    const characterLifeCharacters = characterLifeCharacterReferences();
    return {
        sceneContext: {
            world: { id: state.world.id, name: state.world.name, era: state.world.era },
            worldClock: state.worldClock,
            location: {
                continent: state.location.continent,
                region: state.location.region,
                place: state.location.place,
                detail: state.location.detail,
                heading: state.location.heading,
                mapX: state.location.mapX,
                mapY: state.location.mapY,
            },
            travel: {
                status: state.travel.status,
                origin: state.travel.origin,
                destination: state.travel.destination,
                route: state.travel.route,
                totalDays: state.travel.totalDays,
                remainingDays: state.travel.remainingDays,
                originX: state.travel.originX,
                originY: state.travel.originY,
                destinationX: state.travel.destinationX,
                destinationY: state.travel.destinationY,
                destinationPlace: state.travel.destinationPlace,
            },
            scene: state.scene,
            localMap: {
                activeMapId: state.sceneMap.activeMapId,
                activeFloorId: state.sceneMap.activeFloorId,
                playerRoomId: state.sceneMap.playerRoomId,
            },
        },
        privateTrackerReferenceIndex: {
            playerResources: {
                condition: state.player.condition,
                hp: state.player.hp,
                auraOrMana: state.player.mp,
                stamina: state.player.stamina,
                hunger: state.player.survival.hunger,
                thirst: state.player.survival.thirst,
                aura: state.player.aura,
                fitness: {
                    lungCapacity: state.player.fitness.lungCapacity,
                    aerobicSessions: state.player.fitness.aerobicSessions,
                },
            },
            inventory: state.inventory.slice(-20).map(({ id, name }) => [id, name]),
            skills: state.skills.slice(-16).map(({ id, name }) => [id, name]),
            onboarding: state.onboarding,
            characterLifeCharacters,
            characterLifeMapActors: state.characterLifeMapActors,
            quests: state.quests.filter(entry => !['Completed', 'Failed'].includes(entry.status)).slice(-12).map(({ id, name, type, status }) => [id, name, type, status]),
            questArchive: state.quests.filter(entry => ['Completed', 'Failed'].includes(entry.status)).slice(-16).map(({ id, name, type, status, rewardClaimed }) => [id, name, type, status, rewardClaimed]),
            npcs: friendly.slice(-24).map(({ id, name }) => [id, name]),
            contacts: state.contacts.slice(-12).map(({ id, name }) => [id, name]),
        },
    };
}

function hasUserReply(context = SillyTavern.getContext()) {
    return context.chat.some(message => message?.is_user && !message.is_system && text(message.mes));
}

const REGISTRATION_LABELS = Object.freeze({
    race: ['race', 'เผ่าพันธุ์'], gender: ['gender', 'เพศ'], age: ['age', 'อายุ'],
    homeContinent: ['home continent', 'continent of origin', 'ทวีปบ้านเกิด', 'ทวีปต้นกำเนิด'],
    standing: ['standing', 'social standing', 'ฐานะ', 'สถานะทางสังคม'],
    hair: ['hair', 'hair color', 'ผม', 'สีผม'], eyes: ['eyes', 'eye color', 'ดวงตา', 'สีตา'],
    height: ['height', 'ส่วนสูง'], build: ['build', 'body type', 'รูปร่าง'],
    powerSystem: ['power system', 'power systems', 'ระบบพลัง'],
    affiliation: ['affiliation', 'faction', 'สังกัด', 'ฝ่าย'],
});

function registrationPlainText(value) {
    return normalizedTravelText(value)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(?:div|p|li|section|article|header|footer|h[1-6]|span|strong|b|em|button|label|dt|dd|td|th)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;|&#160;/gi, ' ')
        .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
        .split(/\r?\n/).map(line => line.replace(/^[\s◆◇•·|]+|[\s|]+$/g, '').replace(/\s+/g, ' ').trim())
        .filter(Boolean).join('\n');
}

function parseRegistrationMessage(raw) {
    const source = registrationPlainText(raw);
    if (!source) return null;
    const lines = source.split('\n');
    const allAliases = Object.values(REGISTRATION_LABELS).flat().sort((a, b) => b.length - a.length);
    const aliasPattern = allAliases.map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const isLabel = line => new RegExp(`^(?:${aliasPattern})(?:\s*[:：-])?$`, 'i').test(line.trim());
    const result = {};
    for (const [key, aliases] of Object.entries(REGISTRATION_LABELS)) {
        const ownPattern = aliases.map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        for (let index = 0; index < lines.length; index += 1) {
            const match = lines[index].match(new RegExp(`^(?:${ownPattern})(?:\s*[:：-]\s*|\s+)?(.*)$`, 'i'));
            if (!match) continue;
            let value = match[1].trim();
            if (!value) {
                for (let cursor = index + 1; cursor < Math.min(lines.length, index + 4); cursor += 1) {
                    if (isLabel(lines[cursor]) || /^(?:identity|origin|appearance|path|power system)$/i.test(lines[cursor])) continue;
                    value = lines[cursor];
                    break;
                }
            }
            if (value && !isLabel(value)) result[key] = text(value, '', key === 'powerSystem' ? 240 : 160);
            break;
        }
    }
    const structured = /(?:^|\n)(?:identity|origin|appearance|power system|path)(?:\n|$)/i.test(source);
    const divine = /\bdivine\s+(?:mana|aura)\b|(?:มานา|ออร่า).{0,24}(?:เทพ|ศักดิ์สิทธิ์)|(?:เทพ|ศักดิ์สิทธิ์).{0,24}(?:มานา|ออร่า)/i.test(source);
    const aura = /(?:^|\n)aura(?:\n|$)|(?:^|\n)ออร่า(?:\n|$)/i.test(source);
    const score = Object.keys(result).filter(key => key !== 'powerSystem').length + (result.powerSystem || divine ? 1 : 0);
    if (score < 2 || (!structured && score < 3)) return null;
    return { ...result, divine, aura, score };
}

function findPlayerRegistration(context = SillyTavern.getContext()) {
    const messages = (context.chat || []).filter(message => message?.is_user && !message?.is_system && text(message.mes)).slice(0, 40);
    let best = null;
    for (const message of messages) {
        const parsed = parseRegistrationMessage(message.mes);
        if (parsed && (!best || parsed.score > best.score)) best = parsed;
    }
    return best;
}

function hasDivinePower(state) {
    return /\bdivine\s+(?:aura|mana)\b|(?:ออร่า|มานา).*(?:เทพ|ศักดิ์สิทธิ์)|(?:เทพ|ศักดิ์สิทธิ์).*(?:ออร่า|มานา)/i.test(state?.player?.powerType || '')
        || number(state?.proficiencies?.magic?.divineMana, 0, 0, 100) > 0;
}

function bootstrapPlayerIdentityFromChat(current, context = SillyTavern.getContext()) {
    if (current.onboarding?.identitySeeded) return null;
    const registration = findPlayerRegistration(context);
    if (!registration) return null;
    const next = clone(current);
    let changed = false;
    const setDefault = (target, key, value, defaults = []) => {
        if (!value) return;
        const existing = text(target[key], '', 180);
        if (existing && !defaults.some(entry => existing.toLocaleLowerCase() === entry.toLocaleLowerCase())) return;
        if (existing === value) return;
        target[key] = value;
        changed = true;
    };
    setDefault(next.player, 'race', registration.race, ['Human', 'Unknown']);
    setDefault(next.player, 'age', registration.age, ['Unknown']);
    setDefault(next.player, 'gender', registration.gender, ['Unknown']);
    setDefault(next.player, 'homeContinent', registration.homeContinent, ['Unknown']);
    setDefault(next.player, 'standing', registration.standing, ['Unknown']);
    setDefault(next.player, 'affiliation', registration.affiliation, ['Unknown', 'Unaffiliated']);
    setDefault(next.player.appearance, 'hair', registration.hair, ['Unknown']);
    setDefault(next.player.appearance, 'eyes', registration.eyes, ['Unknown']);
    setDefault(next.player.appearance, 'height', registration.height, ['Unknown']);
    setDefault(next.player.appearance, 'build', registration.build, ['Unknown']);
    if (registration.divine) {
        if (next.player.powerType !== 'Divine Mana') { next.player.powerType = 'Divine Mana'; changed = true; }
        if (next.player.aura.color !== '#ffffff') { next.player.aura.color = '#ffffff'; changed = true; }
        if (next.proficiencies.magic.divineMana < 1) { next.proficiencies.magic.divineMana = 1; changed = true; }
    }
    if (registration.aura && next.proficiencies.magic.aura < 1) { next.proficiencies.magic.aura = 1; changed = true; }
    next.onboarding.identitySeeded = true;
    changed = true;
    return changed ? normalize(next, current) : null;
}

async function catchUpPlayerIdentity() {
    const context = SillyTavern.getContext();
    if (!context.getCurrentChatId?.() || !context.chat?.length) return false;
    const seeded = bootstrapPlayerIdentityFromChat(getState(), context);
    return seeded ? persistState(seeded, 'user-registration-bootstrap') : false;
}

function legacyPatchInstructions() {
    const iconKeys = PROFICIENCY_ICON_PRESETS.map(entry => entry.key).join(', ');
    return [
        'After the role-play reply, append one invisible HTML comment only when confirmed state changed:',
        '<!--tretaresia_patch:{"ops":[["upsert","quests",{"id":"academy-escort","name":"Escort the Academy Caravan","type":"Mission","status":"Active","objective":"Protect the caravan until it reaches Eastwatch","reward":"12 silver","giver":"Quartermaster Lysa","source":"Great Academy mission board","progress":0}],["inc","progression.experience",5,{"reason":"Completed aura control training","category":"training"}],["inc","progression.currency.silver",-3,{"reason":"Paid for an academy meal","category":"currency"}],["inc","progression.kills",1,{"reason":"Defeated the ash troll","category":"kill"}]],"summary":"Mission, training, payment, and combat progress recorded."}-->',
        'Allowed verbs: set or inc for scalar paths; inc, upsert, or delete for inventory; upsert or delete for skills, proficiencies.customMagic, proficiencies.customSword, proficiencies.techniques, quests, npcs, contacts, letters, party, guilds, household; upsert or delete partyMembers, guildMembers, and householdMembers; set or inc npcValues; upsert or delete npcAbilities and npcMeters; append npcDiary; add location.discovered. Local maps additionally allow upsert or delete on sceneMaps, sceneFloors, sceneRooms, and sceneConnections.',
        'Party, Guild, and Household rules: The player is always the leader of a party or guild created from the UI unless the story explicitly confirms a leadership change. Party membership is free. The UI already deducts the Guild fee. For a guild newly created by the player in the story, set createdByPlayer:true on the guild upsert; the parser accepts it only when the player can afford the fee and deducts the fee automatically. Merely joining an existing guild never charges a creation fee. Role-play changes are automatic: whenever a completed reply confirms joining, accepting an invitation, leaving, expulsion, creation, dissolution, marriage, partnership, a child, parent, guardian, or another family role, update social state in this same patch even when no UI button was used. For a friendly person absent from npcIndex, first upsert npcs with a stable id/name, then use that id in partyMembers, guildMembers, or householdMembers. A Household is the player\'s family roster, not a generic faction.',
        'Use canonical paths shown in the state JSON. For a new incoming physical letter include contactId/fromName/toName/subject/body/direction:"incoming"/status:"unread". Ordinary dialogue is not a letter.',
        'Create or update a named NPC dossier with an upsert on npcs only when that NPC becomes relevant or a confirmed fact changes. Use partial NPC objects and preserve the canonical id from npcIndex. When a relationship becomes a correspondence, also upsert contacts with npcId; do not make every incidental NPC a contact.',
        'For a meaningful private thought or relationship turning point, append npcDiary with {npcId,text,mood}, or npcName when the NPC was created in the same patch; do not write a diary entry every turn. Update abilities granularly through npcAbilities with npcId or npcName. NPC portraits and portrait framing are local-only and forbidden in patches.',
        'Evaluate every relevant subsystem after every reply, not only scene/location. Update every materially affected value in the same patch; leave a value unchanged only when this reply provides no reasonable story basis for changing it.',
        'Full checklist: player HP/Aura-or-Mana/stamina/condition, profession, power type, Origin skill and identity; EXP/adventurer rank/custom title/reputation/local currency; inventory, Constructs and learned skills; power/combat/technique proficiency; quests and dungeons; time/location/travel/weather/local map; every participating NPC dossier, relationship meter, location, lastSeen, abilities, diary, and revealed stats; contacts and actual physical letters. For inventory use inc with positive quantity for pickup/receipt and negative quantity for consumption/drop/gift/sale; acquisition and immediate consumption require both ordered ops. Add top-level journey (maximum 500 characters) only for a significant story milestone. Emit only fields affected by this completed reply.',
        'Mission and quest receipt rules: immediately upsert every named mission, quest, contract, dungeon task, or personal objective when this reply formally offers, assigns, gives, or confirms receipt. Type must be Story, Side-Story, Mission, Quest, Dungeon, Contract, or Personal. Use Offered when optional and unaccepted; Active when accepted or assigned. Include stable id/name/type/status/objective/reward/giver/source/progress. Progress must reflect confirmed objective completion and Completed always means progress 100. Failed is terminal unless the story explicitly reopens the mission. On the first transition to Completed, grant the established reward once in the SAME patch and tag every reward operation metadata with {"category":"quest-reward","questId":"canonical quest id","reason":"specific reward"}. Completed questArchive entries with rewardClaimed=true are historical records: never grant their reward, EXP, item, currency, rank, or loot again and never reset their progress. Do not turn rumors, possibilities, rejected work, or casual advice into quests.',
        'EXP rules: award EXP for every completed action that materially counts as studying, reading with understanding, taking a lesson, researching, learning, spell or skill practice, crafting practice, physical training, sparring, combat participation, surviving danger, killing a hostile creature, discovery, quest progress, or another genuine growth action. Use inc progression.experience and always add fourth-position metadata {"reason":"specific cause","category":"study|learning|training|combat|kill|discovery|quest"}. Typical gain: 1-3 routine study/practice, 4-8 meaningful success, 9-20 combat or major challenge, 21-40 exceptional milestone. Do not award EXP for passive narration, merely intending to act, failed non-instructive attempts, or ordinary small talk. The extension levels up automatically the instant accumulated EXP is greater than or exactly equal to experienceMax.',
        'Kill rules: whenever the player personally kills or decisively finishes a hostile person or creature, inc progression.kills by the confirmed count with fourth-position metadata naming the defeated target, for example ["inc","progression.kills",1,{"reason":"Defeated the cave troll","category":"kill"}]. Also award appropriate combat EXP in the same patch. Do not count knockouts, uncertain deaths, assists without a kill, practice targets, or environmental deaths not caused by the player.',
        'Proficiency rules: increment a used or trained power system or combat discipline by 1-3 when the reply confirms genuine practice or successful use; use 4-8 only for a breakthrough. Do not increase unused proficiencies. When a confirmed power or combat style is not in the preset lists, upsert proficiencies.customMagic or proficiencies.customSword with {id,name,proficiency,description,iconKey}; later upserts may contain only id/name and changed fields.',
        'Tretaresia sensing rule: a power can normally be sensed only by someone who wields the same kind. Formless Aura cannot be sensed by anyone. Divine Mana can be perceived only by another Divine Mana wielder. Never let observers identify a hidden power without valid same-kind perception or direct evidence.',
        'Power canon: False Magic is learnable structured human magic that normally needs a staff, wand, or medium. True Magic is a lost stronger art requiring deep mana understanding and no medium. Aura is innate and commonly carries one birth-given Origin skill. Formless Aura is exceptionally rare and wholly undetectable. Blood Aura is vampiric and a turning may preserve, mutate, split, or erase the prior power. Sage Mana is lost transformative training that can refill from natural energy. Divine Mana may switch among power modes. Constructs allow those without usable Aura to wield a forged ability; primordial Divine Constructs choose one owner and cannot be copied, remade, or manufactured.',
        'Travel rules: Tretaresia distances take days, months, or years. Roads can produce villages, towns, waystations and caravans; off-road travel may reveal secret dungeons, lost villages, cults or worse. Almost the entire 2400 by 1800 world-coordinate atlas is travelable, including unnamed wilderness and sea routes. Read the latest user role-play action as well as the completed reply. While travel.status is Traveling or Delayed, update worldClock and reduce travel.remainingDays whenever narration confirms elapsed time or continued movement; never copy a stale remainingDays over newer progress already stored by the local main-chat tracker. Do not change the current continent/place to the destination until arrival is confirmed. At arrival set travel.status to Arrived, remainingDays to 0, update location fields including location.mapX and location.mapY when the destination coordinates are known, and add location.discovered. Update location.heading from 0 north clockwise when a clear travel direction is established.',
        'Dungeon and rank rules: dungeonRank must be one of Unranked, E-, E, E+, D-, D, D+, C-, C, C+, B-, B, B+, A-, A, A+, S-, S, S+, SS. Adventurer ranks are Rookie, Basic, Intermediate, Ember, and Custom Rank; a Custom Rank name is individually invented by an assessor and should be recorded in progression.customRankName.',
        'Currency rules: the Central Continent generally shares a common currency, but other regions and non-human lands may use different money. Record every confirmed gain or decrease immediately. Every gold/silver/copper set or inc operation must include fourth-position metadata with a concrete reason, such as {"reason":"Reward from the escort contract","category":"currency"} or {"reason":"Paid for two nights at the inn","category":"currency"}; never use a vague reason such as transaction. When the active currency changes, set progression.currency.name and update only denominations actually gained or spent; never silently convert wealth without an established exchange.',
        `Allowed custom proficiency iconKey values: ${iconKeys}. Choose the closest semantic icon; omit iconKey to let the extension infer it from the name.`,
        'NPC update rules: for every named friendly NPC who directly participates, consider relationship, location, lastSeen, abilities, custom meters, diary, and revealed stats. A substantive friendly/helpful exchange may change affection or trust by 1-3; hostility, deception, fear, romance, loyalty, or corruption should adjust only the relevant meters in proportion to what actually occurred. Use ["inc","npcValues",{"npcId":"...","field":"trust","amount":2}] for deltas or ["set","npcValues",{"npcId":"...","field":"stats.level","value":12}] for revealed absolute values. Valid relationship fields are affection, trust, loyalty, fear, corruption, lust. Valid stat fields are stats.level, stats.rank, stats.hp, stats.mp, stats.stamina, stats.strength, stats.agility, stats.intelligence, stats.endurance. Zero numeric NPC core stats mean unknown, not literal zero. Conversation alone does not increase NPC level or combat stats. Hostile, enemy, foe, antagonist, villain, aggressor, or threat NPCs must not be added to the visible NPC Codex, party invitations, guild invitations, or household roster; keep hostile encounters in the story only.',
        'Track the active scene when confirmed: time, phase, day/dayName, continent, region, place, location detail, exact world mapX/mapY coordinates, compass heading, scene position, weather, and temperature. Named atlas destinations already provide exact coordinates in state; for newly discovered nearby places use a reasonable nearby coordinate and keep it consistent. Do not invent weather or temperature when the reply provides no evidence.',
        'Maintain a sparse overhead local map only from confirmed or strongly implied spatial facts. Create a sceneMaps record, then its sceneFloors, sceneRooms, and sceneConnections. Room coordinates use x 0-100, y 0-70, width 8-70, height 7-50. Reveal or add rooms gradually; never invent a complete unseen building. Use canonical mapId/floorId/room ids, set the active ids and playerRoomId as the player moves, and preserve all locked maps, rooms, and connections.',
        'Handle all story genres and mature or NSFW scenes neutrally. Do not censor, rewrite, omit, or classify confirmed state merely because the scene is adult; follow the active SillyTavern, model, and provider settings.',
        'Record only outcomes confirmed by this reply. Never record plans, attempts, questions, hypotheticals, rejected actions, or out-of-character discussion. Keep proficiency changes conservative.',
        'Omit the comment when nothing changed. Never print a full state, Markdown fence, explanation, or visible system text.',
    ].join('\n');
}

function patchInstructions() {
    const iconKeys = PROFICIENCY_ICON_PRESETS.map(entry => entry.key).join(', ');
    return [
        'TRETARESIA PATCH PROTOCOL — use the SAME normal reply; never start another generation. Append one invisible comment only when confirmed state changed:',
        '<!--tretaresia_patch:{"ops":[["inc","progression.experience",5,{"reason":"Aura practice","category":"training"}],["upsert","quests",{"id":"escort","name":"Escort Caravan","status":"Active","objective":"Reach Eastwatch","progress":0}]],"summary":"Training and mission recorded","journey":"Accepted the Eastwatch escort mission after completing aura practice."}-->',
        'Allowed ops: set/inc scalar paths; inc/upsert/delete inventory; upsert/delete skills, proficiencies.customMagic, proficiencies.customSword, proficiencies.techniques, quests, npcs, contacts, letters, characterLifeMapActors, party, guilds, household, partyMembers, guildMembers, householdMembers, npcAbilities, npcMeters, npcKnowledge, effects, combatLogs, regionalWeather, sceneMaps, sceneFloors, sceneRooms, sceneConnections; set/inc npcValues; append npcDiary; add location.discovered. Use canonical paths/ids and partial objects. Maximum 75 ops.',
        'Compact state arrays: inventory=[id,name,quantity,category], skills=[id,name,rank,type], quests=[id,name,type,status,objective,reward,giver,progress], npcIndex=[id,name,relationship,location,faction], npcWorld=[id,name,location,mapX,mapY,mapVisible,lifeMode,activity,activityUpdatedDay], abilities=[id,name,category,level,proficiency], contacts=[id,name,title,affiliation,relationship], letters=[id,contactId,from,to,subject,direction,status,createdAt].',
        'Update only facts confirmed by the completed reply—not plans, attempts, questions, hypotheticals, rejected actions, OOC text, or unsupported guesses. A direct user role-play action to depart for a named destination is evidence that a journey has begun; record its route and endpoints, then let later replies advance time and confirm arrival. EVERY completed normal reply must append exactly one comment; use {"ops":[],"summary":"No confirmed changes."} when nothing beyond the locally tracked turn clock changed. Never expose the patch, full state, Markdown, explanation, private tracker ledger, UI fields, or system vocabulary.',
        'EPISTEMIC FIREWALL: privateTrackerReferenceIndex is author/tool memory only. It is never automatically known by the narrator-as-character or by any NPC. An NPC may use only facts personally witnessed, explicitly told to them, publicly observable in the current scene, or credibly supplied by their established role. Friendship, proximity, party/guild/household membership, Character Life records, NPC dossiers, or inclusion in this JSON grants no knowledge. Never let an NPC mention, react to, or infer exact player level, EXP, HP/MP/stamina, stats, power identity, currency/balance, inventory, quests, relationship meters, private diary, map coordinates, travel percentage, transaction/journey history, or who accompanied the user unless the story independently establishes that knowledge. If uncertain, the NPC does not know. The tracker may update hidden state without revealing it in prose.',
        'Check affected systems on every reply: player condition/resources/identity including hunger, thirst and Aura mechanics; EXP/rank/reputation/kills/currency; inventory/skills/proficiencies; quests/dungeons; clock/location/travel/weather/map; participating friendly NPC dossiers/relationships/abilities/diary/stats; contacts/physical letters; Party/Guild/Household. Emit every affected value in this one patch, not only scene fields.',
        'Resource, injury, and damage rules: update current HP, Aura/Mana, and stamina from every confirmed consequence. Damage/injury lowers player.hp.current; healing/treatment/rest may restore it. Running, exercise, climbing, swimming, sustained combat, and other exertion lower stamina; rest restores it. Power use lowers MP unless infinite; canon recovery restores it. For every confirmed hit, upsert combatLogs with attacker,target,damageType,bodyPart,baseDamage,armor,auraGuard,resistance,critical,finalDamage,source so the UI can show the full calculation; finalDamage must match the HP delta and must not be negative. For a lasting wound, poison, burn, bleeding, curse, fatigue, buff, or debuff, upsert effects with stable id/name/type/severity/remainingTurns/damagePerTurn/staminaPerTurn/source/treatment; delete it when cured. Do not create an effect for purely cosmetic prose. Never spend/restore from a planned action. Capacity gains are gradual and require repeated training or a breakthrough: aerobic training may raise lungCapacity/stamina.max; vitality conditioning hp.max; aura training mp.max. Do not duplicate costs already applied by the local tracker.',
        'Survival rules: player.survival.hunger and player.survival.thirst are fullness/hydration percentages capped at 100. Confirmed elapsed time and exertion may lower them; eating restores hunger and drinking restores thirst according to the amount actually consumed. Never exceed 100 and do not change them for OOC discussion. At very low values, update condition and apply only story-supported consequences.',
        'Aura mechanics: set player.aura.color to #RRGGBB only when established; preserve it otherwise. Track player.aura.output (maximum safe burst), control (precision), efficiency (cost reduction), and recovery (regeneration), each 0-100, increasing conservatively only from relevant practice/breakthroughs. Divine Aura/Mana uses a pure-white base with a flowing rainbow spectrum in UI. Treat Limitless, Boundless, Unlimited, and Infinite Aura/Mana as aliases for the same infinite state. Set infinite=true only when the completed assistant story or resolved roll explicitly confirms genuinely inexhaustible power—never from level, settings, an OOC request, a user claim alone, or an unresolved attempt. While true, do not decrease MP; set false only after explicit loss/seal/limitation.',
        'First-reply bootstrap: when onboarding.identitySeeded is false, copy every explicit registration/persona fact into canonical player identity fields (race, gender, age, homeContinent, standing, affiliation, appearance hair/eyes/height/build, powerType) and then set onboarding.identitySeeded=true. When onboarding.loadoutSeeded is false, the first completed normal reply after a real user message must infer a modest, coherent starting inventory and skill loadout from the user persona/card and established story facts, upsert those items and skills, then set onboarding.loadoutSeeded=true in the same patch. Never add Traveler\'s Clothes and never invent unsupported rare, divine, infinite, or overpowered gear. Also establish the player\'s actual opening continent/region/place/detail/position/weather from the first user message and completed reply; use exact atlas coordinates for a named atlas destination. When onboarding.characterMapSeeded is false and characterLifeCharacters is non-empty, upsert one characterLifeMapActors record for every Character-scope entry, preserving characterLifeId/name and established location/coordinates; every record must include worldId. Never guess random coordinates: use exact coordinates only for a known atlas destination, preserve established on-land coordinates, or leave mapX/mapY null until a location is established. Then set onboarding.characterMapSeeded=true. If the list is empty, leave characterMapSeeded=false so a later reply can retry after Character Life is available. These records are private map bookkeeping, not knowledge available to characters.',
        'World identity: world.id is "present-world" normally and "alternate-present-world" only after the story explicitly crosses into Alternate Present World TRETARESIA. An actual crossing can be confirmed when the user or completed reply enters a portal, dimensional gate, rift, teleportation passage, or other established world boundary. Never switch from speculation, dreams, atlas browsing, casual mentions, or plans that have not happened. On confirmed entry set world.id together with the destination location fields; on a confirmed return set world.id back to "present-world" with the returned location fields.',
        'NPC atlas isolation: use only the injected NPC Atlas Knowledge catalog for the active world. Never let an ordinary Present World character know Alternate-exclusive places, or an Alternate World character know Present-only geography, unless confirmed inter-world experience or reliable information explicitly grants that knowledge.',
        'Journey Logs: when a major story event meaningfully changes the player journey, add top-level "journey":"a concise milestone of at most 500 characters". Use it for arrivals/departures, quest acceptance/completion/failure, decisive battles, important discoveries, major bonds, faction/party/guild/household changes, identity or power breakthroughs. Do not add one for routine dialogue or bookkeeping.',
        'EXP: inc progression.experience for confirmed study, learning, training, crafting practice, combat, kill, discovery, or quest progress. Require {"reason":"specific cause","category":"study|learning|training|combat|kill|discovery|quest"}. Typical 1-3 routine, 4-8 meaningful, 9-20 major, 21-40 exceptional. A personal confirmed kill also inc progression.kills with kill metadata; exclude knockouts, uncertain deaths, and assists.',
        'Money: record every confirmed gain or expense immediately on progression.currency.gold/silver/copper with {"reason":"what the money came from or was spent on","category":"currency"}. Every currency op needs a specific reason so Transaction History can explain it. Never invent exchange rates or silently convert regional currency; set progression.currency.name when the active currency changes.',
        'Inventory lifecycle: pick up, receive, buy, craft, or loot an item with ["inc","inventory",{"id":"stable-id","name":"Item","quantity":positive,"category":"...","description":"..."}]. Drink, eat, consume, use up, drop, give away, or sell it with the same operation and a negative quantity. If acquired and consumed in the same turn, emit the positive op followed by the negative op so the final count is correct. Do not decrement reusable tools, weapons, armor, keys, or equipment merely because they were used. Use upsert only to correct item metadata or set an exact known quantity; delete only when explicitly removed wholesale.',
        'Quests: type is Story, Side-Story, Mission, Quest, Dungeon, Contract, or Personal. Upsert when formally offered/assigned/received; Offered=optional unaccepted, Active=accepted/assigned. Update progress only from confirmed objective progress; Completed always becomes 100 and Failed is archived. On the FIRST transition to Completed, grant its established reward once in the SAME patch; every reward op must carry {"category":"quest-reward","questId":"canonical id","reason":"specific reward"}. questArchive entries with rewardClaimed=true are history: never pay their currency/EXP/items/rank/loot again, never reset progress, and do not reactivate without an explicit story event. Rumors and casual advice are not quests.',
        'Proficiency: inc only a discipline genuinely used/trained (1-3; 4-8 breakthrough). New powers/styles use customMagic/customSword {id,name,proficiency,description,iconKey}. iconKey values: ' + iconKeys + '. Mana is not easily detected: non-sensing characters perceive nothing and even sensing specialists normally notice only a faint presence, while explicitly godlike beings with major lore may be exceptional. Formless Aura is wholly undetectable. False Magic uses a medium; True Magic does not; Aura commonly has one Origin; Constructs grant forged abilities.',
        'Teleport and warp canon: teleportation/warp magic is inaccessible and most people believe it does not exist. Do not grant, teach, create, or casually use such a spell, item, skill, route, or world crossing unless the visible story explicitly establishes an extraordinary canon exception. A map browse or travel request is never such an exception.',
        'NPCs and knowledge: upsert only relevant named friendly NPCs or confirmed changes; preserve npcIndex id. Hostile/enemy/foe/antagonist/villain/threat NPCs stay out of Codex/social rosters. For participating friends consider relationship/location/lastSeen/abilities/meters/diary/revealed stats. Relationship deltas are usually 1-3. npcValues fields: affection,trust,loyalty,fear,corruption,lust or stats.level/rank/hp/mp/stamina/strength/agility/intelligence/endurance. Zero stats mean unknown. Never raise combat stats from conversation alone. Record only facts an NPC actually learns using npcKnowledge {npcId,id,fact,source,confidence,learnedDay}; do not copy private tracker facts. Diary only for meaningful private thoughts/turning points. Portrait data is forbidden.',
        'Living NPC world: update an NPC location/activity only when the completed story turn directly establishes or strongly implies that change for that NPC. Never simulate unseen off-screen lives from hidden tracker data, never teleport anyone, and never manufacture activities merely because time advanced. Story only changes only when involved; Paused never changes automatically. Party members follow the player only when the visible story establishes they are presently together.',
        'Social auto-sync: player leads UI-created Party/Guild unless story changes it. UI actions are not required: every confirmed join/invite/leave/expulsion/create/dissolve/rank/family-role change must update this patch. Party upserts can maintain formation, roles keyed by NPC id (Vanguard/Tank/Striker/Support/Healer/Scout/Rear Guard/Companion), and sharedFunds. Guild upserts can maintain rank, level, reputation, headquarters, alliances, enemies, treasury and quests. Existing NPC example: ["upsert","partyMembers",{"npcId":"lysa"}]. New friendly NPC: first upsert npcs, then membership. Guild member includes guildId/name. Household member includes npcId/role. Party is free. UI Guild creation already charges locally. A story-created player-led Guild must include createdByPlayer:true; parser charges only when affordable. Joining or editing an existing guild is free. Household is family, not a faction.',
        'Travel/scene: journeys take days/months/years. Preserve the local per-message clock and add further confirmed elapsed time. At journey start set status/endpoints/route/days and exact known atlas coordinates. Unknown coordinates must be nearby and on land. Re-evaluate position on every reply with movement; update remainingDays, location, scene.position, heading, weather and temperature without moving progress backward or teleporting early. The local route planner generates land-safe checkpoints and interpolates the marker. At arrival set Arrived/0 and destination location. When weather is established for any visited/mentioned region, upsert regionalWeather {id,region,weather,temperature,hazard,updatedDay}; preserve other regions. Keep local maps sparse and gradual; preserve locked maps.',
        'Letters: physical letters only. Incoming requires contactId/fromName/toName/subject/body/direction:"incoming"/status:"unread". Ordinary dialogue is not mail. Mature scenes are tracked neutrally under active model/provider settings.',
    ].join('\n');
}

function statePrompt(state, { includeState = true, track = true } = {}) {
    const lines = ['<tretaresia_rpg_state>'];
    const activeAtlas = atlasById(state?.world?.id);
    if (activeAtlas.id === 'alternate-present-world') {
        lines.push('The active setting is Alternate Present World TRETARESIA: an expanded, more connected geography formed by Westreach Crownlands, Sakura-Frost Dominion, Sunscorched East, Verdant Southeast, Southern Wildlands, and Inner Sea Archipelago. Preserve its denser roads, inland borders, coastlines, island chains, long travel times, regional laws, power secrecy, and local currencies. Most common monsters can speak understandable but broken human language.');
        lines.push("Alternate World canon: Chaos Breaker is the white floating castle of Dragon King Kaliasna Oryu, encircled by the Dragonfang Ring in Kaliasna Oryu's Sky Dominion. The northeast holds a Japanese-tradition kingdom across sakura fields, snow country and colossal forest. The eastern lands include desert crowns, volcanic basins and caravan routes; the southeast contains worldtree courts, rivers and wetlands; the south contains calderas, black forests and wild frontiers; the Inner Sea is filled with ports, island cities, reefs, shrines and dangerous sea lanes.");
        lines.push('Timeline continuity: every named Present World destination also exists in the Alternate timeline, remapped onto its corresponding expanded region. Preserve those shared names and established functions; the Alternate atlas adds many exclusive destinations without deleting Sunscar Port, Central Crown, the Great Academy, or any other Present World place.');
    } else {
        lines.push('The active setting is Present World Tretaresia, a morally mixed, enormous world of six ocean-separated continents: Central Continent, The Great Forest, Great Land of Titan, Drinovia Continent, North Continent, and Baluguria Continent. Preserve established geography, long travel times, social prejudice, regional laws, power secrecy, and regional currencies. Most common monsters can speak understandable but broken human language.');
        lines.push('Present World canon: about one thousand years ago the Great War shattered the land and opened the oceans; hero Ars died and the Primordial Demon was sealed in a timeless dimension. Civilizations later rebuilt an uneasy harmony while war, invasion, prejudice, slavery, crime, kindness and cruelty continued together. The Great Academy charges steep tuition and admits every race, though prejudice remains. Human entry into the Great Forest is taboo and may bring punishment upon an entire family. Khaduzar is marked by the colossal stone hand gripping its own wrist. Drinovia plants the weapons and remains of the fallen where they died. The North can fall below -300 degrees. Baluguria is an exile, slave, gambling, pleasure-trade and underworld center.');
    }
    lines.push('AUTHOR-ONLY ATLAS REFERENCE is strictly scoped to the active world below. A destination absent from this catalog is not established in the current timeline. This catalog is not automatically known by any NPC: geography knowledge requires credible upbringing, travel, study, occupation, or information established in the story. Never leak or infer another timeline\'s geography through ordinary NPC knowledge.');
    lines.push(JSON.stringify(npcAtlasKnowledge(state)));
    if (includeState) {
        lines.push('EPISTEMIC FIREWALL — HIGHEST PRIORITY FOR CHARACTER KNOWLEDGE: sceneContext describes author-level continuity, while privateTrackerReferenceIndex is hidden tool memory. No NPC can see or read either object. A character knows only what they personally witnessed, were explicitly told, can publicly observe now, or could credibly learn through an established role. Presence, friendship, party/guild/household membership, Character Life records, NPC dossiers, and model access to this prompt do not grant knowledge. Never reveal or have an NPC react to exact level, EXP, vitals, stats, power identity, money/balance, inventory, quest/UI status, relationship meters, private diary, coordinates, travel percentage, transaction history, journey log, or companions unless the story independently established that specific fact. When uncertain, the NPC does not know. Never use UI/system terminology in narration or dialogue.');
        lines.push('Canonical role-play continuity follows. Preserve it silently unless the story confirms a change. The tracker may use private reference IDs for bookkeeping, but visible prose and NPC behavior must obey the firewall above.');
        lines.push(JSON.stringify(roleplayState(state)));
        lines.push('END PRIVATE TRACKER REFERENCE INDEX. Do not quote, summarize, expose, or turn hidden reference values into character knowledge.');
    }
    if (track) lines.push(patchInstructions());
    lines.push('</tretaresia_rpg_state>');
    return lines.join('\n');
}

function updatePrompt(state = getState()) {
    const context = SillyTavern.getContext();
    const settings = getSettings();
    const activeChat = Boolean(context.getCurrentChatId?.() && hasUserReply(context));
    const enabled = activeChat && (settings.injectState || settings.autoTrack);
    context.setExtensionPrompt(PROMPT_KEY, enabled
        ? statePrompt(state, { includeState: settings.injectState || settings.autoTrack, track: settings.autoTrack })
        : '', 1, 1, false, 0);
}

globalThis.TretaresiaRpgGenerateInterceptor = async function () {
    // Refresh at SillyTavern's official generation interception point. This
    // protects hosts that replace their extension-prompt collection after
    // MESSAGE_SENT while keeping tracking inside the one normal reply.
    updatePrompt(getState());
};

function notify(type, message) {
    if (typeof toastr !== 'undefined' && typeof toastr[type] === 'function') toastr[type](message, 'Tretaresia RPG');
    else console[type === 'error' ? 'error' : 'info'](`[Tretaresia RPG] ${message}`);
}

function buildEventNotificationStack() {
    if (document.getElementById('tretaresia-event-stack')) return;
    const stack = document.createElement('section');
    stack.id = 'tretaresia-event-stack';
    stack.className = 'tretaresia-event-stack';
    stack.setAttribute('aria-live', 'polite');
    stack.setAttribute('aria-label', 'Tretaresia event notifications');
    stack.addEventListener('click', event => event.target.closest('[data-dismiss-event]')?.closest('.tretaresia-event-toast')?.remove());
    document.body.appendChild(stack);
}

function eventNotificationEnabled(kind) {
    const settings = getSettings();
    if (!settings.eventNotifications) return false;
    const key = { experience: 'notifyExperience', level: 'notifyLevel', learning: 'notifyLearning', combat: 'notifyCombat', kill: 'notifyKills', currency: 'notifyCurrency', quest: 'notifyQuests' }[kind];
    return key ? settings[key] : true;
}

function showEventNotification(event) {
    if (!event || !eventNotificationEnabled(event.kind)) return;
    buildEventNotificationStack();
    const stack = document.getElementById('tretaresia-event-stack');
    if (!stack) return;
    const icons = { experience: 'fa-star', level: 'fa-arrow-up', learning: 'fa-book-open', combat: 'fa-khanda', kill: 'fa-skull', currency: 'fa-coins', quest: 'fa-scroll' };
    const toast = document.createElement('article');
    toast.className = 'tretaresia-event-toast';
    toast.dataset.kind = event.kind;
    toast.innerHTML = `<span class="tretaresia-event-icon"><i class="fa-solid ${icons[event.kind] || 'fa-sparkles'}"></i></span><div><small>${html(event.eyebrow || 'SYSTEM')}</small><strong>${html(event.title)}</strong>${event.detail ? `<p>${html(event.detail)}</p>` : ''}</div>${event.value ? `<b>${html(event.value)}</b>` : ''}<button type="button" data-dismiss-event aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button><i class="tretaresia-event-timer" style="animation-duration:${getSettings().notificationDuration}ms"></i>`;
    stack.prepend(toast);
    while (stack.children.length > 5) stack.lastElementChild?.remove();
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    setTimeout(() => {
        toast.classList.remove('is-visible');
        setTimeout(() => toast.remove(), 260);
    }, getSettings().notificationDuration);
}

function showEventNotifications(events) {
    events.forEach((event, index) => setTimeout(() => showEventNotification(event), index * 180));
}

function clampTravelTrackerPosition(tracker, x, y) {
    const margin = 8;
    const width = tracker.offsetWidth || Math.min(420, Math.max(240, globalThis.innerWidth - margin * 2));
    const height = tracker.offsetHeight || 92;
    return {
        x: Math.min(Math.max(margin, x), Math.max(margin, globalThis.innerWidth - width - margin)),
        y: Math.min(Math.max(margin, y), Math.max(margin, globalThis.innerHeight - height - margin)),
    };
}

function applyTravelTrackerPosition(tracker = document.getElementById('tretaresia-travel-tracker')) {
    if (!tracker) return;
    const position = getSettings().travelTrackerPosition;
    if (position.x === null || position.y === null) {
        tracker.style.removeProperty('left');
        tracker.style.removeProperty('top');
        tracker.style.removeProperty('transform');
        return;
    }
    const clamped = clampTravelTrackerPosition(tracker, position.x, position.y);
    tracker.style.left = `${clamped.x}px`;
    tracker.style.top = `${clamped.y}px`;
    tracker.style.transform = 'none';
}

function buildTravelTracker() {
    if (document.getElementById('tretaresia-travel-tracker')) return;
    const tracker = document.createElement('section');
    tracker.id = 'tretaresia-travel-tracker';
    tracker.className = 'tretaresia-travel-tracker';
    tracker.setAttribute('role', 'status');
    tracker.setAttribute('aria-live', 'polite');
    tracker.setAttribute('aria-label', 'Active journey progress');
    tracker.hidden = true;
    let drag = null;
    tracker.addEventListener('pointerdown', event => {
        if (!event.isPrimary || event.button > 0) return;
        const rect = tracker.getBoundingClientRect();
        drag = { pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
        tracker.setPointerCapture?.(event.pointerId);
        tracker.classList.add('is-dragging');
        tracker.style.left = `${rect.left}px`;
        tracker.style.top = `${rect.top}px`;
        tracker.style.transform = 'none';
        event.preventDefault();
    });
    tracker.addEventListener('pointermove', event => {
        if (!drag || drag.pointerId !== event.pointerId) return;
        const next = clampTravelTrackerPosition(tracker, event.clientX - drag.offsetX, event.clientY - drag.offsetY);
        tracker.style.left = `${next.x}px`;
        tracker.style.top = `${next.y}px`;
        event.preventDefault();
    });
    const finishDrag = event => {
        if (!drag || drag.pointerId !== event.pointerId) return;
        const rect = tracker.getBoundingClientRect();
        const next = clampTravelTrackerPosition(tracker, rect.left, rect.top);
        const settings = getSettings();
        settings.travelTrackerPosition = next;
        SillyTavern.getContext().saveSettingsDebounced();
        tracker.releasePointerCapture?.(event.pointerId);
        tracker.classList.remove('is-dragging');
        drag = null;
    };
    tracker.addEventListener('pointerup', finishDrag);
    tracker.addEventListener('pointercancel', finishDrag);
    document.body.appendChild(tracker);
    globalThis.addEventListener('resize', () => applyTravelTrackerPosition(tracker), { passive: true });
    applyAppearance();
}

function syncTravelTracker(state = getState()) {
    buildTravelTracker();
    const tracker = document.getElementById('tretaresia-travel-tracker');
    if (!tracker) return;
    const travel = state?.travel || {};
    const origin = text(travel.origin, '', 180) || text(state?.location?.place, '', 180);
    const destination = text(travel.destinationPlace || travel.destination, '', 180);
    const visible = getSettings().showTravelTracker && ['Preparing', 'Traveling', 'Delayed', 'Arrived'].includes(travel.status)
        && Boolean(origin && destination);
    tracker.hidden = !visible;
    if (!visible) return;
    const progress = Math.round(travelProgress(state) * 100);
    const distance = travelDistance(state);
    const thai = getSettings().language === 'th';
    const remainingLabel = distance.remaining <= .05
        ? (thai ? 'ถึงจุดหมายแล้ว' : 'Destination reached')
        : `${formatTravelDistance(distance.remaining)} km ${thai ? 'คงเหลือ' : 'remaining'}`;
    tracker.dataset.status = travel.status;
    tracker.innerHTML = `<div class="tretaresia-travel-route"><i class="fa-solid fa-grip-lines" aria-hidden="true"></i><strong title="${html(origin)} → ${html(destination)}"><span>${html(origin)}</span><b>→</b><span>${html(destination)}</span></strong><em>${progress}%</em></div>
        <div class="tretaresia-travel-progress" aria-label="${progress}%"><i style="width:${progress}%"></i></div>
        <div class="tretaresia-travel-distance"><span><i class="fa-solid fa-route"></i>${formatTravelDistance(distance.travelled)} / ${formatTravelDistance(distance.total)} km</span><b>${remainingLabel}</b><small>${formatTravelDays(travel.remainingDays)} ${thai ? 'วัน' : 'days'} · ${html(travel.status)}</small></div>`;
    applyTravelTrackerPosition(tracker);
}

function activityCopy(mode = getSettings().interactionMode) {
    const thai = getSettings().language === 'th';
    const descriptions = {
        hidden: thai
            ? 'ส่งการกระทำให้ AI โดยตรงโดยไม่มีข้อความผู้เล่น และไม่แตะข้อความร่างที่พิมพ์ค้างไว้'
            : 'Send the action directly to the AI with no user bubble. Any text already in the composer stays untouched.',
        visible: thai
            ? 'ส่งการกระทำเป็นข้อความผู้เล่นที่มองเห็นทันที โดยเก็บข้อความร่างเดิมไว้ให้'
            : 'Send the action immediately as a visible user message. An existing unsent draft is preserved.',
        draft: thai
            ? 'ใส่การกระทำในช่องพิมพ์เพื่อให้ตรวจสอบก่อน ยังไม่เรียก AI จนกว่าจะกดส่งเอง'
            : 'Place the action in the composer for review. No AI call happens until you send it yourself.',
    };
    return descriptions[mode] || descriptions.hidden;
}

function buildActivityIndicator() {
    if (document.getElementById('tretaresia-activity-island')) return;
    const indicator = document.createElement('button');
    indicator.id = 'tretaresia-activity-island';
    indicator.className = 'tretaresia-activity-island';
    indicator.type = 'button';
    indicator.setAttribute('aria-live', 'polite');
    indicator.setAttribute('aria-label', 'Open Tretaresia RPG');
    indicator.innerHTML = `<span class="tretaresia-activity-orb"><i class="fa-solid fa-wand-sparkles"></i></span>
        <span class="tretaresia-activity-copy"><strong></strong><small></small></span><span class="tretaresia-activity-progress"></span>`;
    indicator.addEventListener('click', openInterface);
    document.body.appendChild(indicator);
    syncActivityIndicator();
}

function syncActivityIndicator() {
    const indicator = document.getElementById('tretaresia-activity-island');
    if (!indicator) return;
    const preference = getSettings().activityIndicator;
    indicator.dataset.mode = activityState.mode;
    indicator.dataset.display = preference;
    indicator.classList.toggle('is-visible', activityState.visible && preference !== 'off');
    const label = indicator.querySelector('strong');
    const detail = indicator.querySelector('small');
    const icon = indicator.querySelector('.tretaresia-activity-orb i');
    if (label) label.textContent = activityState.label;
    if (detail) detail.textContent = activityState.detail;
    if (icon) {
        icon.className = activityState.mode === 'working' ? 'fa-solid fa-wand-sparkles'
            : activityState.mode === 'error' ? 'fa-solid fa-triangle-exclamation'
                : activityState.mode === 'unchanged' ? 'fa-solid fa-minus'
                    : activityState.mode === 'disabled' ? 'fa-solid fa-pause'
                        : 'fa-solid fa-check';
    }
    const panelStatus = document.getElementById('tretaresia-rpg-sync-state');
    if (panelStatus) {
        panelStatus.dataset.mode = activityState.mode;
        const copy = panelStatus.querySelector('span');
        if (copy) copy.textContent = activityState.label;
    }
}

function updateActionModeHelp() {
    document.querySelectorAll('[data-action-mode-help]').forEach(node => { node.textContent = activityCopy(); });
}

function currentPersonaName(state = getState()) {
    return text(SillyTavern.getContext().name1, state.player.name, 100) || state.player.name;
}

function characterLifeBridge() {
    return globalThis.CharacterLifeRpgBridge && typeof globalThis.CharacterLifeRpgBridge === 'object'
        ? globalThis.CharacterLifeRpgBridge : null;
}

function characterLifeNpcFor(entry) {
    const bridge = characterLifeBridge();
    if (!bridge || !entry) return null;
    try {
        return bridge.findNpc?.({ id: entry.characterLifeId, scope: entry.characterLifeScope, name: entry.name }) || null;
    } catch (error) {
        console.warn('[Tretaresia RPG] Character Life NPC lookup failed safely.', error);
        return null;
    }
}

function characterLifeMapMarkers(force = false) {
    const bridge = characterLifeBridge();
    if (!bridge || typeof bridge.listMapMarkers !== 'function') return [];
    if (!force && characterLifeMapMarkerCache) return characterLifeMapMarkerCache;
    try {
        const markers = bridge.listMapMarkers({ includeHidden: true, includeDisabled: false, includeDead: false });
        characterLifeMapMarkerCache = Array.isArray(markers) ? markers : [];
        return characterLifeMapMarkerCache;
    } catch (error) {
        console.warn('[Tretaresia RPG] Character Life map marker lookup failed safely.', error);
        return characterLifeMapMarkerCache || [];
    }
}

function characterLifeCharacterReferences() {
    const bridge = characterLifeBridge();
    if (!bridge || typeof bridge.listMapMarkers !== 'function') return [];
    try {
        const markers = bridge.listMapMarkers({ includeHidden: true, includeDisabled: false, includeDead: false });
        const records = typeof bridge.listNpcs === 'function' ? bridge.listNpcs({ includeDisabled: false, includeDead: false }) : [];
        return (Array.isArray(markers) ? markers : []).filter(entry => entry?.scope === 'character').slice(0, 60).map(marker => {
            const entry = (Array.isArray(records) ? records : []).find(value => value?.id === marker.id && value?.scope === 'character') || marker;
            return {
                id: text(marker.id, '', 120), scope: 'character', name: text(marker.name, '', 120),
                aliases: Array.isArray(marker.aliases) ? marker.aliases.map(value => text(value, '', 120)).filter(Boolean).slice(0, 8) : [],
                role: text(entry.role, '', 160), species: text(entry.species, '', 100), affiliation: text(entry.affiliation, '', 160),
                relationshipToUser: text(entry.relationshipToUser, '', 160), currentState: text(marker.currentState || entry.currentState, '', 400),
                location: text(marker.location || entry.location || entry.currentLocation, '', 200),
                mapX: optionalNumber(marker.mapX, null, 0, WORLD_MAP_WIDTH), mapY: optionalNumber(marker.mapY, null, 0, WORLD_MAP_HEIGHT),
                activeFormId: text(entry.activeFormId, '', 120),
            };
        }).filter(entry => entry.id && entry.name);
    } catch (error) {
        console.warn('[Tretaresia RPG] Character Life character reference lookup failed safely.', error);
        return [];
    }
}

function invalidateCharacterLifeMapMarkers() {
    characterLifeMapMarkerCache = null;
}

function mapNpcIdentity(entry) {
    return [entry?.name, ...(Array.isArray(entry?.aliases) ? entry.aliases : [])]
        .map(value => text(value, '', 120).toLocaleLowerCase()).filter(Boolean);
}

function mergedCharacterLifeMapMarkers(state) {
    const source = characterLifeMapMarkers();
    const actors = Array.isArray(state.characterLifeMapActors) ? state.characterLifeMapActors : [];
    const used = new Set();
    const merged = source.map(marker => {
        const actor = actors.find(entry => entry.characterLifeId === marker.id)
            || actors.find(entry => entry.name.toLocaleLowerCase() === text(marker.name).toLocaleLowerCase());
        if (actor) used.add(actor.id);
        return actor ? { ...marker, ...actor, id: marker.id, scope: 'character', key: `character:${marker.id}`, mapVisible: true } : marker;
    });
    for (const actor of actors) {
        if (used.has(actor.id)) continue;
        merged.push({ ...actor, id: actor.characterLifeId || actor.id, scope: 'character', key: `character:${actor.characterLifeId || actor.id}`, mapVisible: true });
    }
    return merged;
}

function releaseMapPortrait(record) {
    if (!record) return;
    if (record.image instanceof HTMLImageElement) record.image.src = '';
    if (record.owned && record.url) URL.revokeObjectURL(record.url);
}

function trimMapPortraitCache() {
    if (mapPortraitCache.size <= MAP_PORTRAIT_CACHE_LIMIT) return;
    const candidates = [...mapPortraitCache.entries()].sort((left, right) => number(left[1]?.lastUsed, 0) - number(right[1]?.lastUsed, 0));
    for (const [key, record] of candidates) {
        if (mapPortraitCache.size <= MAP_PORTRAIT_CACHE_LIMIT) break;
        mapPortraitCache.delete(key);
        releaseMapPortrait(record);
    }
}

function mapPortraitRecord(key) {
    const record = key ? mapPortraitCache.get(key) : null;
    if (record) record.lastUsed = ++mapPortraitUseClock;
    return record || null;
}

function decodeMapPortraitSource(source) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Map portrait source could not be decoded.'));
        image.src = source;
    });
}

async function createMapPortraitThumbnail(source) {
    const sourceImage = await decodeMapPortraitSource(source);
    const width = Math.max(1, sourceImage.naturalWidth || sourceImage.width || 1);
    const height = Math.max(1, sourceImage.naturalHeight || sourceImage.height || 1);
    const ratio = Math.min(1, MAP_PORTRAIT_THUMBNAIL_SIZE / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Map thumbnail canvas is unavailable.');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'medium';
    context.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
    sourceImage.src = '';
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .78));
    if (!blob) throw new Error('Map thumbnail encoding failed.');
    return { url: URL.createObjectURL(blob), owned: true };
}

function requestMapPortrait(key, query, directSource = '', directFrame = null) {
    if (!key) return;
    if (mapPortraitCache.has(key)) { mapPortraitRecord(key); return; }
    const record = { status: 'loading', image: new Image(), url: '', frame: directFrame || null, owned: false, lastUsed: ++mapPortraitUseClock };
    mapPortraitCache.set(key, record);
    trimMapPortraitCache();
    const load = async (source, frame = null, sourceOwned = false, alreadyThumbnail = false) => {
        if (!source) { record.status = 'empty'; return; }
        let thumbnail = null;
        if (alreadyThumbnail) {
            thumbnail = { url: source, owned: sourceOwned };
        } else {
            try {
                thumbnail = await createMapPortraitThumbnail(source);
                if (sourceOwned) URL.revokeObjectURL(source);
            } catch (error) {
                thumbnail = { url: source, owned: sourceOwned };
                console.warn('[Tretaresia RPG] Map portrait thumbnail fallback used.', error);
            }
        }
        if (mapPortraitCache.get(key) !== record) {
            if (thumbnail.owned && thumbnail.url) URL.revokeObjectURL(thumbnail.url);
            return;
        }
        record.url = thumbnail.url;
        record.frame = frame;
        record.owned = thumbnail.owned;
        record.image.onload = () => { record.status = 'ready'; record.lastUsed = ++mapPortraitUseClock; trimMapPortraitCache(); scheduleMapDraw(); };
        record.image.onerror = () => { record.status = 'error'; };
        record.image.src = thumbnail.url;
    };
    if (directSource) { void load(directSource, directFrame, false); return; }
    const bridge = characterLifeBridge();
    if (!bridge?.portrait) { record.status = 'empty'; return; }
    Promise.resolve(bridge.portrait(query)).then(result => {
        if (!result) { record.status = 'empty'; return; }
        const source = result.blob ? URL.createObjectURL(result.blob) : result.path || '';
        return load(source, result.frame || null, Boolean(result.blob), result.thumbnail === true);
    }).catch(error => {
        record.status = 'error';
        console.warn('[Tretaresia RPG] Map portrait load failed safely.', error);
    });
}

function clearMapPortraitCache() {
    for (const record of mapPortraitCache.values()) releaseMapPortrait(record);
    mapPortraitCache.clear();
}

function drawMapAvatar(context, point, record, initial, size, fill, stroke, pixelRatio) {
    context.save();
    context.beginPath();
    context.arc(point.x, point.y, size, 0, Math.PI * 2);
    context.clip();
    context.fillStyle = fill;
    context.fillRect(point.x - size, point.y - size, size * 2, size * 2);
    if (record?.status === 'ready') {
        const image = record.image;
        const scale = Math.max(size * 2 / image.naturalWidth, size * 2 / image.naturalHeight) * number(record.frame?.zoom, 1, 1, 4);
        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;
        const focusX = number(record.frame?.x, 50, 0, 100) / 100;
        const focusY = number(record.frame?.y, 50, 0, 100) / 100;
        context.drawImage(image, point.x - width * focusX, point.y - height * focusY, width, height);
    } else {
        context.fillStyle = readableOn(fill);
        context.font = `800 ${Math.max(8, size * .9)}px system-ui, sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(initial || '?', point.x, point.y + .5 * pixelRatio);
    }
    context.restore();
    context.save();
    context.strokeStyle = stroke;
    context.lineWidth = 2 * pixelRatio;
    context.beginPath();
    context.arc(point.x, point.y, size, 0, Math.PI * 2);
    context.stroke();
    context.restore();
}

function characterLifeSkillsForOwner(owner) {
    const bridge = characterLifeBridge();
    if (!bridge) return [];
    try {
        const skills = bridge.listSkills?.(owner);
        return Array.isArray(skills) ? skills : [];
    }
    catch (error) {
        console.warn('[Tretaresia RPG] Character Life skill lookup failed safely.', error);
        return [];
    }
}

function syncCharacterLifeLinks(state) {
    const bridge = characterLifeBridge();
    if (!bridge || !Array.isArray(state?.npcs)) return 0;
    let changed = 0;
    for (const entry of state.npcs) {
        const linked = characterLifeNpcFor(entry);
        if (!linked || linked.enabled === false || linked.isDead === true || linked.lifeStatus === 'dead') continue;
        const before = JSON.stringify([
            entry.characterLifeId, entry.characterLifeScope, entry.characterLifePortraitId,
            entry.title, entry.race, entry.age, entry.gender, entry.occupation, entry.faction, entry.relationship,
        ]);
        entry.characterLifeId = text(linked.id, entry.characterLifeId, 120);
        entry.characterLifeScope = ['global', 'character', 'chat'].includes(linked.scope) ? linked.scope : entry.characterLifeScope;
        const forms = Array.isArray(linked.forms) ? linked.forms : [];
        const form = forms.find(value => value?.id === linked.activeFormId) || forms[0];
        entry.characterLifePortraitId = text(form?.portraitId, '', 180);
        const missing = (value, defaults = []) => !text(value) || defaults.includes(text(value).toLocaleLowerCase());
        if (missing(entry.title)) entry.title = text(linked.role, entry.title, 120);
        if (missing(entry.race, ['unknown'])) entry.race = text(linked.species, entry.race, 80);
        if (missing(entry.age, ['unknown'])) entry.age = text(linked.age, entry.age, 40);
        if (missing(entry.gender, ['unknown'])) entry.gender = text(linked.gender, entry.gender, 60);
        if (missing(entry.occupation)) entry.occupation = text(linked.role, entry.occupation, 120);
        if (missing(entry.faction, ['unaffiliated'])) entry.faction = text(linked.affiliation, entry.faction, 120);
        if (missing(entry.relationship, ['acquaintance', 'unknown'])) {
            entry.relationship = text(linked.relationshipToUser, text(linked.relationship, entry.relationship, 100), 100);
        }
        if (!entry.notes && linked.notes) entry.notes = text(linked.notes, '', 1000);
        const after = JSON.stringify([
            entry.characterLifeId, entry.characterLifeScope, entry.characterLifePortraitId,
            entry.title, entry.race, entry.age, entry.gender, entry.occupation, entry.faction, entry.relationship,
        ]);
        if (before !== after) changed += 1;
    }
    return changed;
}

async function syncRpgSkillsToCharacterLife(state) {
    const bridge = globalThis.CharacterLifeRpgBridge;
    if (typeof bridge?.applyRpgNpcUpdates === 'function') {
        try {
            await bridge.applyRpgNpcUpdates(state.npcs.map(npc => ({
                id: npc.id,
                characterLifeId: npc.characterLifeId,
                name: npc.name,
                aliases: npc.aliases,
                title: npc.title,
                occupation: npc.occupation,
                faction: npc.faction,
                race: npc.race,
                age: npc.age,
                gender: npc.gender,
                relationship: npc.relationship,
                location: npc.location,
                activity: npc.activity,
                abilities: npc.abilities,
            })));
        } catch (error) {
            console.warn('[Tretaresia RPG] Character Life NPC compatibility sync failed safely.', error);
        }
    }
    const api = globalThis.CharacterLifeSkills;
    if (!api || typeof api.list !== 'function' || typeof api.upsert !== 'function') return;
    const saved = api.list();
    const existing = new Map(saved.map(skill => [
        `${text(skill.ownerName).toLocaleLowerCase()}::${text(skill.name).toLocaleLowerCase()}`,
        `${text(skill.category)}::${text(skill.rank)}::${text(skill.description)}`,
    ]));
    const candidates = [
        ...state.skills.map(skill => ({
            ownerType: 'user', ownerName: currentPersonaName(state), name: skill.name,
            category: skill.type, rank: skill.rank, description: skill.description,
        })),
        ...state.npcs.flatMap(npc => npc.abilities.map(ability => ({
            ownerType: 'npc', ownerName: npc.name, ownerNpcId: npc.characterLifeId || npc.id,
            name: ability.name, category: ability.category, rank: ability.level, description: ability.description,
        }))),
    ];
    for (const skill of candidates.slice(0, 160)) {
        const key = `${text(skill.ownerName).toLocaleLowerCase()}::${text(skill.name).toLocaleLowerCase()}`;
        const signature = `${text(skill.category)}::${text(skill.rank)}::${text(skill.description)}`;
        if (!key.includes('::') || existing.get(key) === signature) continue;
        try {
            await api.upsert({ ...skill, source: 'rpg-systems' });
            existing.set(key, signature);
        } catch (error) {
            console.warn('[Tretaresia RPG] Skill Storage sync failed safely.', error);
        }
    }
}

function queueCharacterLifeSkillSync(state = getState()) {
    clearTimeout(characterLifeSkillSyncTimer);
    const snapshot = clone(state);
    characterLifeSkillSyncTimer = setTimeout(() => {
        characterLifeSkillSyncTimer = null;
        void syncRpgSkillsToCharacterLife(snapshot);
    }, 120);
}

async function refreshCharacterLifeCompatibility({ save = true } = {}) {
    const context = SillyTavern.getContext();
    const state = getState();
    const changed = syncCharacterLifeLinks(state);
    if (changed && save && context.getCurrentChatId?.()) await persistState(state, 'character-life-link');
    else if (changed) {
        updatePrompt(state);
        renderAll(state);
        queueCharacterLifeSkillSync(state);
    }
}

function queueCharacterLifeCompatibilityRefresh(options) {
    characterLifeCompatibilityOptions = {
        save: Boolean(characterLifeCompatibilityOptions.save || options?.save),
    };
    clearTimeout(characterLifeCompatibilityTimer);
    characterLifeCompatibilityTimer = setTimeout(() => {
        const queued = characterLifeCompatibilityOptions;
        characterLifeCompatibilityOptions = { save: false };
        characterLifeCompatibilityTimer = null;
        void refreshCharacterLifeCompatibility(queued).catch(error =>
            console.warn('[Tretaresia RPG] Character Life refresh failed safely.', error));
    }, 180);
}

function currentMapLocation(state) {
    const locations = worldLocationsFor(state, false);
    return locations.find(location => location.name === state.location.place)
        || locations.find(location => location.name === state.location.region)
        || locations.find(location => location.continent === state.location.continent)
        || locations[0];
}

function mapLocation(id, state = getState(), viewed = true) {
    return worldLocationsFor(state, viewed).find(location => location.id === id);
}

function currentMapPoint(state) {
    const known = currentMapLocation(state);
    let safe = landSafeMapPoint({
        worldId: storyWorldId(state), x: state.location.mapX, y: state.location.mapY,
        location: state.location.place || state.location.region, continent: state.location.continent,
    });
    const exactSite = namedAtlasSite(state.location.place, storyWorldId(state));
    if (!['Preparing', 'Traveling', 'Delayed'].includes(state.travel.status) && exactSite?.name === state.location.place
        && (!safe || Math.hypot(exactSite.x - safe.x, exactSite.y - safe.y) > 180)) {
        safe = { x: exactSite.x, y: exactSite.y, site: exactSite };
    }
    return {
        ...known,
        name: state.location.place || known.name,
        continent: state.location.continent || known.continent,
        region: state.location.region || known.region,
        zone: state.location.zoneType || known.zone,
        x: safe?.x ?? known.x,
        y: safe?.y ?? known.y,
        heading: number(state.location.heading, 0, 0, 359.999),
    };
}

function mapLocationByName(value, state = getState()) {
    const requested = text(value, '', 180).toLocaleLowerCase();
    if (!requested) return null;
    const locations = worldLocationsFor(state, false);
    return locations.find(entry => entry.name.toLocaleLowerCase() === requested)
        || [...locations].sort((a, b) => b.name.length - a.name.length)
            .find(entry => requested.includes(entry.name.toLocaleLowerCase()) || entry.name.toLocaleLowerCase().includes(requested));
}

function worldClockMinutes(clock) {
    const [hours, minutes] = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(text(clock?.time, '00:00', 5))?.slice(1).map(Number) || [0, 0];
    return Math.max(0, (number(clock?.day, 1, 1, 999999) - 1) * 1440 + hours * 60 + minutes);
}

function dayPhaseForHour(hour) {
    if (hour >= 5 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 21) return 'Evening';
    return 'Night';
}

function nextDayName(value, elapsedDays, day) {
    if (!elapsedDays) return text(value, `Day ${day}`, 80);
    const names = [
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        ['วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์', 'วันอาทิตย์'],
    ];
    for (const list of names) {
        const index = list.findIndex(name => name.toLocaleLowerCase() === text(value).toLocaleLowerCase());
        if (index >= 0) return list[(index + elapsedDays) % list.length];
    }
    return `Day ${day}`;
}

function userTurnDurationMinutes(message) {
    const source = text(message, '', 12000);
    if (!source || /^\s*(?:ooc\b|\[ooc\]|\(\(|\/|#|<\/?.+?>\s*$)/i.test(source)) return 0;
    if (/(?:\b(?:sleep|slept|rest(?:ed)? overnight|camp(?:ed)? overnight)\b|(?:นอนหลับ|หลับไป|พักค้างคืน|นอนพัก))/i.test(source)) return 480;
    if (/(?:\b(?:train|study|practice|research|craft|cook|bathe|shop)(?:s|ed|ing)?\b|(?:ฝึก|เรียน|ศึกษา|ค้นคว้า|ประดิษฐ์|ทำอาหาร|อาบน้ำ|ซื้อของ))/i.test(source)) return 10;
    if (/(?:\b(?:walk|run|ride|sail|travel|search|explore|fight|battle)(?:s|ed|ing)?\b|(?:เดิน|วิ่ง|ขี่|ล่องเรือ|เดินทาง|ค้นหา|สำรวจ|ต่อสู้))/i.test(source)) return 5;
    return source.length <= 120 ? 1 : 3;
}

function advanceWorldClockFromUserMessage(messageId, message, current = getState()) {
    const numericId = Number(messageId);
    const messageKey = Number.isInteger(numericId) ? numericId : text(message?.send_date || message?.mes, '', 180);
    if (current.syncCursor?.user === messageKey) return null;
    const next = clone(current);
    next.syncCursor ||= { user: null, assistant: null };
    next.syncCursor.user = messageKey;
    const duration = userTurnDurationMinutes(message?.mes);
    if (!duration) return next;
    const previousMinutes = worldClockMinutes(next.worldClock);
    const totalMinutes = previousMinutes + duration;
    const previousDay = next.worldClock.day;
    const day = Math.floor(totalMinutes / 1440) + 1;
    const minuteOfDay = totalMinutes % 1440;
    const hour = Math.floor(minuteOfDay / 60);
    const minute = minuteOfDay % 60;
    next.worldClock = {
        day,
        dayName: nextDayName(next.worldClock.dayName, Math.max(0, day - previousDay), day),
        time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        phase: dayPhaseForHour(hour),
    };
    return next;
}

function travelProgress(state) {
    const total = number(state?.travel?.totalDays, 0, 0, 999999);
    if (!total) return state?.travel?.status === 'Arrived' ? 1 : 0;
    return Math.min(1, Math.max(0, (total - number(state.travel.remainingDays, total, 0, total)) / total));
}

function travelRouteSpeed(route) {
    return { Road: 70, Caravan: 58, Sea: 95, 'Off-road': 38 }[route] || 55;
}

function buildTravelRoutePoints(state, travel = state?.travel || {}) {
    const originX = optionalNumber(travel.originX, state?.location?.mapX ?? null, 0, WORLD_MAP_WIDTH);
    const originY = optionalNumber(travel.originY, state?.location?.mapY ?? null, 0, WORLD_MAP_HEIGHT);
    const destinationX = optionalNumber(travel.destinationX, null, 0, WORLD_MAP_WIDTH);
    const destinationY = optionalNumber(travel.destinationY, null, 0, WORLD_MAP_HEIGHT);
    if ([originX, originY, destinationX, destinationY].some(value => value === null)) return [];
    const origin = { x: originX, y: originY, name: travel.origin, region: travel.originRegion };
    const destination = { x: destinationX, y: destinationY, name: travel.destinationPlace || travel.destination, region: travel.destinationRegion };
    if (travel.route === 'Sea' || travel.originContinent !== travel.destinationContinent) return [origin, destination];
    const continent = travel.originContinent || state?.location?.continent || '';
    const sites = worldLocationsFor(state, false).filter(entry => entry.continent === continent);
    const checkpoints = [.25, .5, .75].map(progress => {
        const x = originX + (destinationX - originX) * progress;
        const y = originY + (destinationY - originY) * progress;
        if (pointIsOnAtlasLand(x, y, storyWorldId(state), continent)) return { x, y, name: '', region: '' };
        const nearest = sites.reduce((best, entry) => {
            const distance = Math.hypot(entry.x - x, entry.y - y);
            return !best || distance < best.distance ? { entry, distance } : best;
        }, null)?.entry;
        return nearest ? { x: nearest.x, y: nearest.y, name: nearest.name, region: nearest.region } : null;
    }).filter(Boolean);
    return [origin, ...checkpoints, destination].filter((point, index, list) => index === 0
        || Math.hypot(point.x - list[index - 1].x, point.y - list[index - 1].y) > 2);
}

function travelRoutePoint(state, progress = travelProgress(state)) {
    const travel = state?.travel || {};
    const points = travel.routePoints?.length >= 2 ? travel.routePoints : buildTravelRoutePoints(state, travel);
    if (points.length < 2) return null;
    const lengths = points.slice(1).map((point, index) => Math.hypot(point.x - points[index].x, point.y - points[index].y));
    const total = lengths.reduce((sum, value) => sum + value, 0);
    if (!total) return { ...points.at(-1), next: points.at(-1) };
    let cursor = total * Math.max(0, Math.min(1, progress));
    for (let index = 0; index < lengths.length; index += 1) {
        if (cursor <= lengths[index] || index === lengths.length - 1) {
            const ratio = lengths[index] ? cursor / lengths[index] : 0;
            const current = points[index];
            const next = points[index + 1];
            let point = { x: current.x + (next.x - current.x) * ratio, y: current.y + (next.y - current.y) * ratio, next };
            if (travel.route !== 'Sea' && travel.originContinent === travel.destinationContinent
                && !pointIsOnAtlasLand(point.x, point.y, storyWorldId(state), travel.originContinent)) {
                const safe = landSafeMapPoint({ worldId: storyWorldId(state), x: point.x, y: point.y, continent: travel.originContinent });
                if (safe) point = { ...point, x: safe.x, y: safe.y };
            }
            return point;
        }
        cursor -= lengths[index];
    }
    return { ...points.at(-1), next: points.at(-1) };
}

function travelDistance(state) {
    const travel = state?.travel || {};
    const coordinates = [travel.originX, travel.originY, travel.destinationX, travel.destinationY]
        .map(value => optionalNumber(value, null));
    const coordinateDistance = coordinates.every(value => value !== null)
        ? Math.hypot(coordinates[2] - coordinates[0], coordinates[3] - coordinates[1]) : 0;
    const routePoints = travel.routePoints?.length >= 2 ? travel.routePoints : buildTravelRoutePoints(state, travel);
    const routeDistance = routePoints.slice(1).reduce((sum, point, index) => sum + Math.hypot(point.x - routePoints[index].x, point.y - routePoints[index].y), 0);
    const total = routeDistance || coordinateDistance || number(travel.totalDays, 0, 0, 999999) * travelRouteSpeed(travel.route);
    const progress = travelProgress(state);
    return { total, travelled: total * progress, remaining: total * (1 - progress) };
}

function formatTravelDistance(value) {
    const distance = number(value, 0, 0, 999999999);
    if (distance < 10) return distance.toFixed(1);
    return Math.round(distance).toLocaleString();
}

function formatTravelDays(value) {
    const days = number(value, 0, 0, 999999);
    if (Number.isInteger(days)) return String(days);
    return days >= 10 ? days.toFixed(1) : days.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function npcMapPoint(entry, state) {
    const site = mapLocationByName(entry?.location, state);
    const partyMember = state?.social?.party?.memberIds?.includes(entry?.id);
    const player = partyMember ? currentMapPoint(state) : null;
    const point = landSafeMapPoint({
        worldId: storyWorldId(state),
        x: optionalNumber(entry?.mapX, player?.x ?? site?.x ?? null, 0, WORLD_MAP_WIDTH),
        y: optionalNumber(entry?.mapY, player?.y ?? site?.y ?? null, 0, WORLD_MAP_HEIGHT),
        location: entry?.location,
        continent: entry?.continent || site?.continent || (partyMember ? state.location.continent : ''),
    });
    return point ? { ...point, site: point.site || site, partyMember } : null;
}

function synchronizeWorldState(state, previous = state) {
    synchronizeActiveWorldDiscovery(state);
    const travel = state.travel;
    const previousTravel = previous?.travel || {};
    const now = worldClockMinutes(state.worldClock);
    if (state.worldClock.day !== previous?.worldClock?.day && state.worldClock.dayName === previous?.worldClock?.dayName) {
        state.worldClock.dayName = `Day ${state.worldClock.day}`;
    }
    const destinationSite = mapLocationByName(travel.destinationPlace || travel.destination, state);
    travel.originX ??= optionalNumber(previousTravel.originX, previous?.location?.mapX ?? state.location.mapX, 0, WORLD_MAP_WIDTH);
    travel.originY ??= optionalNumber(previousTravel.originY, previous?.location?.mapY ?? state.location.mapY, 0, WORLD_MAP_HEIGHT);
    travel.originContinent ||= text(previousTravel.originContinent, previous?.location?.continent || state.location.continent, 100);
    travel.originRegion ||= text(previousTravel.originRegion, previous?.location?.region || state.location.region, 120);
    travel.destinationX ??= destinationSite?.x ?? null;
    travel.destinationY ??= destinationSite?.y ?? null;
    travel.destinationContinent ||= destinationSite?.continent || '';
    travel.destinationRegion ||= destinationSite?.region || '';
    travel.destinationPlace ||= destinationSite?.name || travel.destination;
    travel.startedAtWorldMinutes ??= optionalNumber(previousTravel.startedAtWorldMinutes, now, 0, 9999999999);
    const routeChanged = ['originX', 'originY', 'destinationX', 'destinationY', 'originContinent', 'destinationContinent', 'route']
        .some(key => travel[key] !== previousTravel[key]);
    if (routeChanged || travel.routePoints?.length < 2) travel.routePoints = buildTravelRoutePoints(state, travel);

    const moving = ['Preparing', 'Traveling', 'Delayed'].includes(travel.status);
    if (moving) {
        const previousClock = optionalNumber(previousTravel.lastWorldMinutes, now, 0, 9999999999);
        const elapsedDays = Math.max(0, now - previousClock) / 1440;
        if (['Preparing', 'Traveling', 'Delayed'].includes(previousTravel.status)) {
            travel.remainingDays = Math.min(
                number(travel.remainingDays, previousTravel.remainingDays, 0, 999999),
                number(previousTravel.remainingDays, travel.remainingDays, 0, 999999),
            );
        }
        if (elapsedDays > 0 && ['Preparing', 'Traveling', 'Delayed'].includes(previousTravel.status)) {
            const clockRemaining = Math.max(0, number(previousTravel.remainingDays, travel.remainingDays, 0, 999999) - elapsedDays);
            travel.remainingDays = Math.min(number(travel.remainingDays, clockRemaining, 0, 999999), clockRemaining);
        }
        travel.lastWorldMinutes = now;
        const progress = travelProgress(state);
        const routePoint = travelRoutePoint(state, progress);
        if (routePoint) {
            state.location.mapX = routePoint.x;
            state.location.mapY = routePoint.y;
            const dx = routePoint.next.x - routePoint.x;
            const dy = routePoint.next.y - routePoint.y;
            if (dx || dy) state.location.heading = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
        }
        state.location.continent = progress >= .5 && travel.destinationContinent ? travel.destinationContinent : travel.originContinent || state.location.continent;
        const nearest = nearestMapLocation(state.location.mapX, state.location.mapY, state.location.continent);
        state.location.region = progress >= .5 && travel.destinationRegion ? travel.destinationRegion : nearest?.region || travel.originRegion || state.location.region;
        if (nearest?.zone) state.location.zoneType = nearest.zone;
        state.location.place = `En route to ${travel.destinationPlace || travel.destination || 'destination'}`;
        state.location.detail = `${Math.round(progress * 100)}% via ${travel.route} · ${coordinatesLabel(state.location.mapX, state.location.mapY)}`;
        if (!previous?.scene?.position || state.scene.position === previous.scene.position || /^Traveling|^En route/i.test(state.scene.position)) {
            state.scene.position = `Traveling via ${travel.route} toward ${travel.destinationPlace || travel.destination}`;
        }
    }

    if (travel.status === 'Arrived' || (moving && travel.remainingDays <= 0)) {
        travel.status = 'Arrived';
        travel.remainingDays = 0;
        if (travel.destinationX !== null) state.location.mapX = travel.destinationX;
        if (travel.destinationY !== null) state.location.mapY = travel.destinationY;
        state.location.continent = travel.destinationContinent || destinationSite?.continent || state.location.continent;
        state.location.region = travel.destinationRegion || destinationSite?.region || state.location.region;
        state.location.place = travel.destinationPlace || destinationSite?.name || travel.destination || state.location.place;
        state.location.zoneType = destinationSite?.zone || state.location.zoneType;
        if (state.location.place) addDiscoveredLocation(state, state.location.place);
        if (!previous?.scene?.position || state.scene.position === previous.scene.position || /^Traveling|^En route/i.test(state.scene.position)) {
            state.scene.position = `Arrived at ${state.location.place}`;
        }
    }

    if (!moving && travel.status !== 'Arrived') {
        const directSite = mapLocationByName(state.location.place, state) || mapLocationByName(state.location.region, state);
        const placeChanged = state.location.place !== previous?.location?.place || state.location.region !== previous?.location?.region;
        const coordinatesUnchanged = state.location.mapX === previous?.location?.mapX && state.location.mapY === previous?.location?.mapY;
        const unsafeCoordinates = !pointIsOnAtlasLand(state.location.mapX, state.location.mapY, storyWorldId(state), state.location.continent);
        const staleNamedCoordinates = directSite && directSite.name === state.location.place
            && Math.hypot(directSite.x - state.location.mapX, directSite.y - state.location.mapY) > 180;
        if (directSite && (placeChanged && coordinatesUnchanged || unsafeCoordinates || staleNamedCoordinates)) {
            state.location.mapX = directSite.x;
            state.location.mapY = directSite.y;
            state.location.continent = directSite.continent;
            state.location.region = directSite.region;
            state.location.place = directSite.name;
            state.location.zoneType = directSite.zone;
            addDiscoveredLocation(state, directSite.name);
        }
    }

    const playerLocationChanged = state.location.place !== previous?.location?.place || state.location.region !== previous?.location?.region;
    if (playerLocationChanged) {
        const locationNames = [state.location.place, state.location.region].map(value => text(value, '', 180).toLocaleLowerCase()).filter(Boolean);
        const matchesPlace = map => {
            const place = text(map?.place, '', 180).toLocaleLowerCase();
            return place && locationNames.some(name => name === place || name.includes(place) || place.includes(name));
        };
        const matchingMap = state.sceneMap.maps.find(matchesPlace);
        if (matchingMap) {
            state.sceneMap.activeMapId = matchingMap.id;
            const floor = matchingMap.floors.find(entry => entry.id === state.sceneMap.activeFloorId) || matchingMap.floors[0];
            state.sceneMap.activeFloorId = floor?.id || '';
            if (!floor?.rooms.some(entry => entry.id === state.sceneMap.playerRoomId)) state.sceneMap.playerRoomId = '';
        } else {
            const activeMap = state.sceneMap.maps.find(entry => entry.id === state.sceneMap.activeMapId);
            if (activeMap?.place && !matchesPlace(activeMap)) {
                state.sceneMap.activeMapId = '';
                state.sceneMap.activeFloorId = '';
                state.sceneMap.playerRoomId = '';
            }
        }
    }

    const partyIds = new Set(state.social?.party?.memberIds || []);
    for (const entry of state.npcs) {
        const prior = previous?.npcs?.find(value => value.id === entry.id) || previous?.npcs?.find(value => value.name.toLocaleLowerCase() === entry.name.toLocaleLowerCase());
        const site = mapLocationByName(entry.location, state);
        const locationChanged = prior && entry.location !== prior.location;
        if (partyIds.has(entry.id)) {
            entry.mapX = state.location.mapX;
            entry.mapY = state.location.mapY;
            entry.location = moving ? state.location.place : state.location.place || state.location.region;
            entry.activity = moving ? `Traveling with ${state.player.name}` : `Accompanying ${state.player.name}`;
            entry.activityUpdatedDay = state.worldClock.day;
        } else if (site && (entry.mapX === null || entry.mapY === null || locationChanged)) {
            entry.mapX = site.x;
            entry.mapY = site.y;
        }
        const safePoint = landSafeMapPoint({
            worldId: storyWorldId(state), x: entry.mapX, y: entry.mapY,
            location: entry.location, continent: site?.continent || '',
        });
        entry.mapX = safePoint?.x ?? null;
        entry.mapY = safePoint?.y ?? null;
        const lifeChanged = prior && (entry.location !== prior.location || entry.activity !== prior.activity || entry.mapX !== prior.mapX || entry.mapY !== prior.mapY);
        if (lifeChanged && entry.lifeMode !== 'Paused') entry.activityUpdatedDay = state.worldClock.day;
    }
    state.characterLifeMapActors = (state.characterLifeMapActors || []).map(actor => characterLifeMapActor(actor)).filter(Boolean);
    return state;
}

function synchronizeDerivedPlayerState(state) {
    const automaticConditions = new Set(['Stable', 'Critical', 'Unconscious', 'Exhausted', 'Starving', 'Dehydrated']);
    if (automaticConditions.has(state.player.condition)) {
        if (state.player.hp.current <= 0) state.player.condition = 'Unconscious';
        else if (state.player.hp.current / state.player.hp.max <= .2) state.player.condition = 'Critical';
        else if (state.player.survival.thirst <= 10) state.player.condition = 'Dehydrated';
        else if (state.player.survival.hunger <= 10) state.player.condition = 'Starving';
        else if (state.player.stamina.current <= 0) state.player.condition = 'Exhausted';
        else state.player.condition = 'Stable';
    }
    if (hasDivinePower(state)) {
        state.player.powerType = 'Divine Mana';
        state.player.aura.color = '#ffffff';
    }
    return state;
}


const mapContinentPaths = new Map();
let mapHitContext = null;

function continentPath(continent) {
    if (typeof Path2D !== 'function') return null;
    if (!mapContinentPaths.has(continent.id)) {
        const path = new Path2D();
        for (const polygon of continent.polygons) {
            polygon.forEach(([x, y], index) => index ? path.lineTo(x, y) : path.moveTo(x, y));
            path.closePath();
        }
        mapContinentPaths.set(continent.id, path);
    }
    return mapContinentPaths.get(continent.id);
}

function hitContext() {
    if (!mapHitContext) mapHitContext = document.createElement('canvas').getContext('2d');
    return mapHitContext;
}

function continentAtPoint(x, y, hintedId = '', state = getState()) {
    const continents = worldContinentsFor(state, true);
    const hinted = continents.find(entry => entry.id === hintedId);
    if (hinted) return hinted;
    const context = hitContext();
    if (context) {
        const match = continents.find(entry => {
            const path = continentPath(entry);
            return path && context.isPointInPath(path, x, y);
        });
        if (match) return match;
    }
    return continents.find(entry =>
        x >= entry.bounds[0] && x <= entry.bounds[2] && y >= entry.bounds[1] && y <= entry.bounds[3]) || null;
}

function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function seededRandom(seed) {
    let value = (seed >>> 0) || 1;
    return () => {
        value = (value * 1664525 + 1013904223) >>> 0;
        return value / 4294967296;
    };
}

function mapPalette() {
    const styles = getComputedStyle(document.documentElement);
    const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
    const accent = read('--tretaresia-accent', '#d6b458');
    const alt = read('--tretaresia-accent-alt', '#f4dc93');
    const ink = read('--tretaresia-ink', '#ece7da');
    const surface = read('--tretaresia-surface', '#040404');
    const light = luminance(surface) > .45;
    return {
        accent, alt, ink, surface, light,
        ocean: light ? '#ccd9e0' : '#070d12',
        oceanDeep: light ? '#aebfca' : '#03070a',
        land: light ? '#e8e3d3' : '#16160f',
        landHigh: light ? '#f4efdf' : '#23231a',
        graticule: rgbaOf(ink, light ? .13 : .085),
        label: rgbaOf(ink, light ? .74 : .7),
        halo: light ? 'rgba(255,255,255,.9)' : 'rgba(2,6,9,.88)',
        faint: rgbaOf(ink, light ? .4 : .34),
    };
}

function drawTerrain(context, continent, palette, detail, hair) {
    const path = continentPath(continent);
    if (!path) return;
    context.save();
    context.clip(path);
    const random = seededRandom(hashString(continent.id));
    const [left, top, right, bottom] = continent.bounds;
    const width = right - left;
    const height = bottom - top;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = rgbaOf(palette.ink, palette.light ? .17 : .14);
    context.lineWidth = hair * 2.3;
    const ridges = detail === 0 ? 24 : detail === 1 ? 52 : 96;
    for (let index = 0; index < ridges; index += 1) {
        const x = left + random() * width;
        const y = top + random() * height;
        const span = 14 + random() * 24;
        context.beginPath();
        context.moveTo(x - span, y + span * .52);
        context.lineTo(x, y - span * .48);
        context.lineTo(x + span, y + span * .52);
        context.stroke();
    }
    if (detail >= 1) {
        context.strokeStyle = rgbaOf(palette.light ? '#3f7f96' : '#55a7b8', .5);
        context.lineWidth = hair * 2.8;
        const rivers = detail === 1 ? 3 : 6;
        for (let index = 0; index < rivers; index += 1) {
            let x = left + random() * width;
            let y = top + random() * height * .3;
            context.beginPath();
            context.moveTo(x, y);
            for (let step = 0; step < 7; step += 1) {
                x += (random() - .5) * width * .16;
                y += height * .11;
                context.lineTo(x, y);
            }
            context.stroke();
        }
    }
    context.restore();
}

function drawGraticule(context, canvas, palette, detail) {
    const step = detail === 0 ? 400 : detail === 1 ? 200 : 100;
    const bounds = mapVisibleBounds();
    context.save();
    context.lineWidth = 1;
    context.strokeStyle = palette.graticule;
    context.beginPath();
    for (let x = Math.ceil(bounds.left / step) * step; x <= bounds.right; x += step) {
        const point = mapCanvasPoint(x, 0, canvas.width, canvas.height);
        context.moveTo(point.x, 0);
        context.lineTo(point.x, canvas.height);
    }
    for (let y = Math.ceil(bounds.top / step) * step; y <= bounds.bottom; y += step) {
        const point = mapCanvasPoint(0, y, canvas.width, canvas.height);
        context.moveTo(0, point.y);
        context.lineTo(canvas.width, point.y);
    }
    context.stroke();
    context.strokeStyle = rgbaOf(palette.accent, .55);
    context.lineWidth = 2;
    context.beginPath();
    for (let x = Math.ceil(bounds.left / step) * step; x <= bounds.right; x += step) {
        const point = mapCanvasPoint(x, 0, canvas.width, canvas.height);
        context.moveTo(point.x, 0);
        context.lineTo(point.x, 9);
        context.moveTo(point.x, canvas.height);
        context.lineTo(point.x, canvas.height - 9);
    }
    for (let y = Math.ceil(bounds.top / step) * step; y <= bounds.bottom; y += step) {
        const point = mapCanvasPoint(0, y, canvas.width, canvas.height);
        context.moveTo(0, point.y);
        context.lineTo(9, point.y);
        context.moveTo(canvas.width, point.y);
        context.lineTo(canvas.width - 9, point.y);
    }
    context.stroke();
    context.restore();
}

function drawScaleBar(context, canvas, palette) {
    const perUnit = canvas.width / WORLD_MAP_WIDTH * mapView.scale;
    const target = canvas.width * .16;
    const units = [50, 100, 200, 400, 800, 1600].reduce((best, value) =>
        Math.abs(value * perUnit - target) < Math.abs(best * perUnit - target) ? value : best, 50);
    const length = units * perUnit;
    const x = 16;
    const y = canvas.height - 18;
    context.save();
    context.strokeStyle = rgbaOf(palette.accent, .85);
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x, y - 6);
    context.lineTo(x, y);
    context.lineTo(x + length, y);
    context.lineTo(x + length, y - 6);
    context.moveTo(x + length / 2, y);
    context.lineTo(x + length / 2, y - 4);
    context.stroke();
    context.restore();
    drawMapLabel(context, units + ' u', x + length / 2, y - 14, {
        size: 10, color: palette.label, stroke: palette.halo,
    });
}

function drawVignette(context, canvas, palette) {
    const gradient = context.createRadialGradient(
        canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * .3,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * .78);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, palette.light ? 'rgba(40,50,60,.16)' : 'rgba(0,0,0,.42)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
}

function drawMarkerGlyph(context, x, y, tier, fill, ring, size) {
    context.save();
    context.fillStyle = fill;
    context.strokeStyle = ring;
    context.lineWidth = 2;
    context.beginPath();
    if (tier === 0) {
        context.moveTo(x, y - size);
        context.lineTo(x + size, y);
        context.lineTo(x, y + size);
        context.lineTo(x - size, y);
        context.closePath();
    } else if (tier === 1) {
        context.arc(x, y, size * .85, 0, Math.PI * 2);
    } else {
        context.rect(x - size * .62, y - size * .62, size * 1.24, size * 1.24);
    }
    context.fill();
    context.stroke();
    if (tier === 1) {
        context.beginPath();
        context.arc(x, y, size * .3, 0, Math.PI * 2);
        context.fillStyle = ring;
        context.fill();
    }
    context.restore();
}

function nearestMapLocation(x, y, continentName = '', state = getState()) {
    const locations = worldLocationsFor(state, true);
    const pool = continentName ? locations.filter(entry => entry.continent === continentName) : locations;
    return pool.reduce((nearest, entry) => {
        const distance = Math.hypot(entry.x - x, entry.y - y);
        return !nearest || distance < nearest.distance ? { entry, distance } : nearest;
    }, null)?.entry || locations[0];
}

function coordinatesLabel(x, y) {
    return `${Math.round(x).toString().padStart(4, '0')} E · ${Math.round(y).toString().padStart(4, '0')} S`;
}

function inferUserTravelIntent(message, state = getState()) {
    const source = text(message, '', 6000);
    if (!source || /(?:\b(?:do not|don't|won't|not going)\b|(?:ไม่|ไม่ได้|อย่า)\s*(?:ออกเดินทาง|เดินทาง|มุ่งหน้า|มุ่งตรง|กลับ|ไป))/i.test(source)) return null;
    const lower = source.toLocaleLowerCase();
    const actionPatterns = [
        /\b(?:travel(?:ling|ing)?|head(?:ing)?|go(?:ing)?|walk(?:ing)?|ride|riding|sail(?:ing)?|depart(?:ing)?|return(?:ing)?|move|moving|set\s+out)\b/gi,
        /(?:ออกเดินทาง|เดินทาง|มุ่งหน้า|มุ่งตรง|ขี่ม้า|นั่งรถ|ล่องเรือ|แล่นเรือ|กลับไป|ไปยัง|ไปที่|ไปสู่)/gi,
    ];
    let actionIndex = -1;
    for (const pattern of actionPatterns) {
        const match = pattern.exec(lower);
        if (match && (actionIndex < 0 || match.index < actionIndex)) actionIndex = match.index;
    }
    if (actionIndex < 0) return null;
    const candidates = worldLocationsFor(state, false).flatMap(site => {
        const names = [site.name, site.name.replace(/^the\s+/i, '')].filter((value, index, all) => value && all.indexOf(value) === index);
        return names.map(name => ({ site, index: lower.lastIndexOf(name.toLocaleLowerCase()), length: name.length }));
    }).filter(candidate => candidate.index >= actionIndex);
    candidates.sort((a, b) => b.index - a.index || b.length - a.length);
    const destination = candidates[0]?.site;
    if (!destination) return null;
    const route = /(?:เรือ|ล่อง|แล่น|\b(?:ship|boat|sail|sea)\b)/i.test(source) ? 'Sea'
        : /(?:คาราวาน|\bcaravan\b)/i.test(source) ? 'Caravan'
            : /(?:นอกเส้นทาง|ป่า|\boff[- ]?road\b|\bwilderness\b)/i.test(source) ? 'Off-road' : 'Road';
    return { destination, route };
}

function estimatedTravelDays(state, destination, route) {
    const distance = Math.hypot(destination.x - state.location.mapX, destination.y - state.location.mapY);
    return Math.max(1, Math.ceil(distance / travelRouteSpeed(route)));
}

function userTravelMessageKey(messageId, message) {
    return text(`${messageId ?? ''}:${message?.send_date || message?.mes || ''}`, '', 180);
}

function normalizedTravelText(value) {
    const thaiDigits = '๐๑๒๓๔๕๖๗๘๙';
    return text(value, '', 12000).replace(/[๐-๙]/g, digit => String(thaiDigits.indexOf(digit)));
}

function travelElapsedDaysFromText(source) {
    const pattern = /(\d+(?:\.\d+)?)\s*(hours?|hrs?|days?|weeks?|months?|ชั่วโมง|ชม\.?|วัน|สัปดาห์|อาทิตย์|เดือน)/gi;
    let elapsed = 0;
    for (const match of source.matchAll(pattern)) {
        const amount = Number(match[1]);
        if (!Number.isFinite(amount) || amount <= 0) continue;
        const unit = match[2].toLocaleLowerCase();
        elapsed += /hour|hr|ชั่วโมง|ชม/.test(unit) ? amount / 24
            : /week|สัปดาห์|อาทิตย์/.test(unit) ? amount * 7
                : /month|เดือน/.test(unit) ? amount * 30 : amount;
    }
    return elapsed;
}

function advanceActiveTravelFromUserMessage(messageId, message, current = getState()) {
    if (!['Preparing', 'Traveling', 'Delayed'].includes(current.travel.status)) return null;
    const source = normalizedTravelText(message?.mes);
    if (!source || /^\s*(?:ooc\b|\/|#|<\/?.+?>\s*$)/i.test(source)) return null;
    const key = userTravelMessageKey(messageId, message);
    if (key && current.travel.lastUserProgressMessage === key) return null;

    const next = clone(current);
    const travel = next.travel;
    const total = Math.max(.01, number(travel.totalDays, 0, 0, 999999));
    const remaining = number(travel.remainingDays, total, 0, total);
    const destination = text(travel.destinationPlace || travel.destination, '', 180);
    const escapedDestination = destination.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const destinationMentioned = escapedDestination ? new RegExp(escapedDestination, 'i').test(source) : false;
    const arrivalWords = /\b(?:arrive[ds]?|reache[ds]?|reaching|entered?)\b|(?:มาถึง|เดินทางถึง|ไปถึง|เข้าสู่|เข้าเขต|ถึงจุดหมาย|ถึงปลายทาง)/i.test(source);
    const deniedArrival = /\b(?:not|haven't|hasn't|didn't)\s+(?:arrive|reach)|(?:ยังไม่ถึง|ไม่ได้ไปถึง|ไม่ได้มาถึง)/i.test(source);
    const genericDestination = /\b(?:destination|destination point)\b|(?:จุดหมาย|ปลายทาง)/i.test(source);
    const arrived = arrivalWords && !deniedArrival && (destinationMentioned || genericDestination);
    const stopWords = /\b(?:stop|pause|halt)(?:ping|ped)?\s+(?:the\s+)?(?:trip|journey|travel)\b|(?:หยุด|พัก|ชะลอ)(?:การ)?เดินทาง/i.test(source);
    const resumeWords = /\b(?:resume[ds]?|continue[ds]?)\s+(?:the\s+)?(?:trip|journey|travel)|(?:เดินทางต่อ|ออกเดินทางต่อ|ไปต่อ|มุ่งหน้าต่อ)/i.test(source);
    const movementWords = /\b(?:walk|ride|sail|travel|journey|continue|proceed|advance|cross|pass)(?:s|ed|ing)?\b|(?:เดิน|ขี่|ล่อง|แล่น|เดินทาง|มุ่งหน้า|เคลื่อน|ผ่าน|ข้าม|ไปต่อ)/i.test(source);
    const travelContext = movementWords || destinationMentioned || genericDestination
        || /\b(?:trip|journey|route)\b|(?:การเดินทาง|เส้นทาง)/i.test(source);
    const percentMatch = travelContext ? source.match(/(\d{1,3}(?:\.\d+)?)\s*(?:%|เปอร์เซ็นต์)/i) : null;
    const explicitProgress = percentMatch ? Math.min(100, Math.max(0, Number(percentMatch[1]))) : null;
    const timePassage = movementWords || /\b(?:after|later|passed|elapsed)\b|(?:ผ่านไป|ล่วงเลย|เวลาผ่าน|ต่อมา)/i.test(source);
    const elapsedDays = timePassage ? travelElapsedDaysFromText(source) : 0;

    travel.lastUserProgressMessage = key;
    travel.trackedUserTurns = number(travel.trackedUserTurns, 0, 0, 999999) + 1;
    if (stopWords && !resumeWords) travel.status = 'Delayed';
    else if (resumeWords && travel.status === 'Delayed') travel.status = 'Traveling';

    if (arrived) {
        travel.status = 'Arrived';
        travel.remainingDays = 0;
    } else {
        let nextRemaining = remaining;
        if (explicitProgress !== null) nextRemaining = Math.min(nextRemaining, total * (1 - explicitProgress / 100));
        if (elapsedDays > 0) nextRemaining = Math.max(0, nextRemaining - elapsedDays);
        // Narrative movement advances faster. Every other substantive main-chat
        // role-play turn still advances one percent, so a journey can never stay
        // frozen for hundreds of messages when the model omits clock fields.
        const turnAdvance = stopWords && !resumeWords ? 0 : total * (movementWords || resumeWords ? .03 : .01);
        nextRemaining = Math.max(0, nextRemaining - turnAdvance);
        travel.remainingDays = Math.min(remaining, nextRemaining);
        if (travel.remainingDays <= .0001) {
            travel.remainingDays = 0;
            travel.status = 'Arrived';
        }
    }
    travel.notes = getSettings().language === 'th'
        ? 'ติดตามอัตโนมัติจากข้อความโรลเพลย์ใน main chat โดยไม่เรียก API เพิ่ม'
        : 'Automatically tracked from main-chat role-play with no extra API call.';
    synchronizeWorldState(next, current);
    const justArrived = current.travel.status !== 'Arrived' && next.travel.status === 'Arrived';
    if (justArrived) appendJourneyLog(next, {
        text: `Arrived at ${next.travel.destinationPlace || next.travel.destination || next.location.place}.`,
        place: next.location.place,
        day: next.worldClock.dayName || `Day ${next.worldClock.day}`,
        kind: 'travel',
    });
    return next;
}

function catchUpActiveTravelFromChat(current, context, currentMessageId) {
    if (!['Preparing', 'Traveling', 'Delayed'].includes(current.travel.status)
        || current.travel.trackedUserTurns > 0 || current.travel.lastUserProgressMessage) return null;
    const numericId = Number(currentMessageId);
    const end = Number.isInteger(numericId) && numericId >= 0 ? numericId + 1 : context.chat?.length || 0;
    const history = (context.chat || []).slice(0, end).map((message, index) => ({ message, index }))
        .filter(entry => entry.message?.is_user && !entry.message?.is_system);
    const destinationId = mapLocationByName(current.travel.destinationPlace || current.travel.destination, current)?.id;
    let start = -1;
    for (let index = history.length - 1; index >= 0; index -= 1) {
        const intent = inferUserTravelIntent(history[index].message.mes, current);
        if (intent && (!destinationId || intent.destination.id === destinationId)) {
            start = index;
            break;
        }
    }
    const backlog = history.slice(start >= 0 ? start + 1 : Math.max(0, history.length - 100)).slice(-100);
    let next = current;
    for (const entry of backlog) {
        const advanced = advanceActiveTravelFromUserMessage(entry.index, entry.message, next);
        if (advanced) next = advanced;
        if (next.travel.status === 'Arrived') break;
    }
    return next === current ? null : next;
}

function advanceAerobicTrainingFromUserMessage(messageId, message, current = getState()) {
    const source = normalizedTravelText(message?.mes);
    if (!source || /^\s*(?:ooc\b|\/|#|<\/?[^>]+>\s*$)/i.test(source)) return null;
    if (/(?:\b(?:do not|don't|didn't|won't|cannot|can't|never)\b.{0,24}\b(?:run|jog|sprint|exercise|work\s*out|swim|cycle)\b)|(?:(?:ไม่|ไม่ได้|ไม่ต้อง|อย่า).{0,20}(?:วิ่ง|ออกกำลังกาย|ว่ายน้ำ|ปั่นจักรยาน))/i.test(source)) return null;
    const aerobic = /\b(?:run|running|jog|jogging|sprint|sprinting|cardio|exercise|exercising|work\s*out|working\s*out|swim|swimming|cycle|cycling)\b|(?:วิ่ง|จ๊อกกิ้ง|สปรินต์|ออกกำลังกาย|คาร์ดิโอ|ว่ายน้ำ|ปั่นจักรยาน)/i.test(source);
    if (!aerobic) return null;
    const onlyPlanned = /\b(?:plan|intend|want|hope|might|may|could)\b.{0,28}\b(?:run|jog|sprint|exercise|work\s*out|swim|cycle)\b|(?:วางแผน|ตั้งใจ|อยาก|อาจจะ).{0,24}(?:วิ่ง|ออกกำลังกาย|ว่ายน้ำ|ปั่นจักรยาน)/i.test(source);
    const performed = /\b(?:i|we)\s+(?:(?:am|are|was|were)\s+|(?:start|started|begin|began|continue|continued|go|went)\s+(?:to\s+|for\s+a\s+)?)?(?:run|running|jog|jogging|sprint|sprinting|exercise|exercising|work\s*out|working\s*out|swim|swimming|cycle|cycling)\b|\*[^*]{0,28}\b(?:run|running|jog|jogging|sprint|sprinting|exercise|exercising|work\s*out|working\s*out|swim|swimming|cycle|cycling)\b|(?:(?:ฉัน|ผม|เรา|ข้า|ตัวละคร).{0,28}(?:วิ่ง|จ๊อกกิ้ง|สปรินต์|ออกกำลังกาย|คาร์ดิโอ|ว่ายน้ำ|ปั่นจักรยาน))|(?:^|[.!?*]\s*)(?:เริ่ม|ออก|ไป|กำลัง)?\s*(?:วิ่ง|จ๊อกกิ้ง|สปรินต์|ออกกำลังกาย|คาร์ดิโอ|ว่ายน้ำ|ปั่นจักรยาน)/i.test(source);
    if (onlyPlanned || !performed) return null;
    const key = userTravelMessageKey(messageId, message);
    if (key && current.player.fitness?.lastTrainingMessage === key) return null;
    if (current.player.stamina.current <= 0) return null;

    const next = clone(current);
    const intense = /\b(?:sprint|sprinting|intense|hard|exhaustive)\b|(?:เต็มแรง|อย่างหนัก|หนักหน่วง|สุดกำลัง)/i.test(source);
    const light = /\b(?:jog|jogging|light|easy|warmup|warm-up)\b|(?:เบาๆ|วอร์ม|เหยาะ)/i.test(source);
    const staminaCost = Math.min(next.player.stamina.current, intense ? 12 : light ? 5 : 8);
    const priorSessions = number(next.player.fitness.aerobicSessions, 0, 0, 999999);
    const sessions = priorSessions + 1;
    const staminaCapacityGain = Math.floor(sessions / 3) - Math.floor(priorSessions / 3);
    next.player.stamina.current = Math.max(0, next.player.stamina.current - staminaCost);
    next.player.stamina.max += staminaCapacityGain;
    next.player.fitness.lungCapacity += intense ? 2 : 1;
    next.player.fitness.aerobicSessions = sessions;
    next.player.fitness.lastTrainingMessage = key;
    return next;
}

function advanceTurnResourcesFromUserMessage(message, current, elapsedMinutes = userTurnDurationMinutes(message?.mes)) {
    const source = normalizedTravelText(message?.mes);
    if (!source || !elapsedMinutes) return null;
    const next = clone(current);
    const hours = elapsedMinutes / 60;
    const physical = /\b(?:walk|run|jog|sprint|climb|swim|fight|battle|train|exercise|work\s*out)(?:s|ed|ing)?\b|(?:เดิน|วิ่ง|ปีน|ว่ายน้ำ|ต่อสู้|ฝึก|ออกกำลังกาย)/i.test(source);
    const sleeping = /\b(?:sleep|slept|rest(?:ed)? overnight|camp(?:ed)? overnight)\b|(?:นอนหลับ|หลับไป|พักค้างคืน|นอนพัก)/i.test(source);
    const hungerCost = Math.max(.1, hours * (physical ? 2.1 : 1.25));
    const thirstCost = Math.max(.1, hours * (physical ? 3.2 : 1.8));
    next.player.survival.hunger = Math.max(0, Math.round((next.player.survival.hunger - hungerCost) * 10) / 10);
    next.player.survival.thirst = Math.max(0, Math.round((next.player.survival.thirst - thirstCost) * 10) / 10);
    if (sleeping) {
        next.player.stamina.current = Math.min(next.player.stamina.max, next.player.stamina.current + Math.max(12, Math.round(next.player.stamina.max * .3)));
        if (!next.player.aura.infinite) {
            const recoveryScale = .12 + next.player.aura.recovery / 500;
            next.player.mp.current = Math.min(next.player.mp.max, next.player.mp.current + Math.max(5, Math.round(next.player.mp.max * recoveryScale)));
        }
    } else if (physical && !/\b(?:run|jog|sprint|exercise|work\s*out|swim|cycle)(?:s|ed|ing)?\b|(?:วิ่ง|จ๊อกกิ้ง|สปรินต์|ออกกำลังกาย|คาร์ดิโอ|ว่ายน้ำ|ปั่นจักรยาน)/i.test(source)) {
        const cost = /\b(?:fight|battle|climb)(?:s|ed|ing)?\b|(?:ต่อสู้|ปีน)/i.test(source) ? 7 : 3;
        next.player.stamina.current = Math.max(0, next.player.stamina.current - Math.min(cost, next.player.stamina.current));
    }
    next.systems ||= defaultSystemsState();
    let periodicDamage = 0;
    let periodicStamina = 0;
    next.systems.effects = (next.systems.effects || []).map(effect => {
        periodicDamage += effect.damagePerTurn;
        periodicStamina += effect.staminaPerTurn;
        return effect.remainingTurns === null ? effect : { ...effect, remainingTurns: Math.max(0, effect.remainingTurns - 1) };
    }).filter(effect => effect.remainingTurns === null || effect.remainingTurns > 0);
    if (periodicDamage) {
        next.player.hp.current = Math.max(0, next.player.hp.current - periodicDamage);
        const log = combatLogEntry({
            summary: `Ongoing conditions dealt ${periodicDamage} damage`, attacker: 'Status effects', target: next.player.name,
            damageType: 'Ongoing', baseDamage: periodicDamage, finalDamage: periodicDamage, source: 'condition-tick',
        });
        if (log) next.systems.combatLogs = [...next.systems.combatLogs, log].slice(-120);
    }
    if (periodicStamina) next.player.stamina.current = Math.max(0, next.player.stamina.current - periodicStamina);
    return next;
}

function latestMentionedAtlasSite(source, state) {
    const lower = text(source, '', 20000).toLocaleLowerCase();
    if (!lower) return null;
    return worldLocationsFor(state, false).reduce((latest, site) => {
        const index = lower.lastIndexOf(site.name.toLocaleLowerCase());
        return index >= 0 && (!latest || index > latest.index || index === latest.index && site.name.length > latest.site.name.length)
            ? { site, index } : latest;
    }, null)?.site || null;
}

function inferredWeather(source) {
    const entries = [
        [/\b(?:thunderstorm|storm|tempest)\b|(?:พายุฝนฟ้าคะนอง|พายุ)/i, 'Storm'],
        [/\b(?:blizzard|snowing|snowfall|snow)\b|(?:พายุหิมะ|หิมะตก|หิมะ)/i, 'Snow'],
        [/\b(?:raining|rainfall|drizzle|rain)\b|(?:ฝนตก|ฝนพรำ|ฝน)/i, 'Rain'],
        [/\b(?:foggy|misty|fog|mist|haze)\b|(?:หมอกลง|มีหมอก|หมอก)/i, 'Fog'],
        [/\b(?:overcast|cloudy|clouds gather)\b|(?:เมฆครึ้ม|ท้องฟ้าครึ้ม|มีเมฆ)/i, 'Cloudy'],
        [/\b(?:clear sky|sunny|sunlit)\b|(?:ท้องฟ้าแจ่มใส|อากาศแจ่มใส|แดดออก)/i, 'Clear'],
    ];
    return entries.find(([pattern]) => pattern.test(source))?.[1] || '';
}

function explicitResourceValue(source, aliases) {
    const label = `(?:${aliases.join('|')})`;
    const patterns = [
        new RegExp(`${label}\\s*(?:is|=|เหลือ|อยู่ที่)?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:\\/\\s*(\\d+(?:\\.\\d+)?))?`, 'i'),
        new RegExp(`(?:lose|lost|เสีย|ลด)\\s*(\\d+(?:\\.\\d+)?)\\s*${label}`, 'i'),
        new RegExp(`${label}\\s*[-–—]\\s*(\\d+(?:\\.\\d+)?)`, 'i'),
    ];
    for (let index = 0; index < patterns.length; index += 1) {
        const match = source.match(patterns[index]);
        if (!match) continue;
        if (index === 0) return { set: Number(match[1]), max: match[2] === undefined ? null : Number(match[2]) };
        return { delta: -Number(match[1]), max: null };
    }
    return null;
}

function reconcileCompletedTurn(base, candidate, userMessage, assistantMessage) {
    const next = clone(candidate);
    const user = normalizedTravelText(userMessage?.mes || userMessage || '');
    const assistant = normalizedTravelText(assistantMessage?.mes || assistantMessage || '');
    const combined = `${user}\n${assistant}`;
    let changes = 0;
    const unchanged = selector => JSON.stringify(selector(base)) === JSON.stringify(selector(candidate));
    const setIfChanged = (target, key, value) => {
        if (value === undefined || target[key] === value) return;
        target[key] = value;
        changes += 1;
    };

    const weather = inferredWeather(assistant);
    if (weather && unchanged(state => state.scene.weather)) {
        setIfChanged(next.scene, 'weather', weather);
        const regional = regionalWeatherEntry({
            region: next.location.region, weather, temperature: next.scene.temperature, updatedDay: next.worldClock.day,
        });
        if (regional) {
            const existing = next.systems.regionalWeather.findIndex(entry => entry.region.toLocaleLowerCase() === regional.region.toLocaleLowerCase());
            if (existing >= 0) next.systems.regionalWeather[existing] = { ...next.systems.regionalWeather[existing], ...regional, id: next.systems.regionalWeather[existing].id };
            else next.systems.regionalWeather.push(regional);
            changes += 1;
        }
    }
    const temperature = assistant.match(/(-?\d+(?:\.\d+)?)\s*(?:°\s*[CF]|degrees?\s*(?:celsius|fahrenheit)|องศา)/i);
    if (temperature && unchanged(state => state.scene.temperature)) setIfChanged(next.scene, 'temperature', Number(temperature[1]));
    if ((weather || temperature) && next.location.region) {
        const regional = regionalWeatherEntry({
            region: next.location.region, weather: weather || next.scene.weather,
            temperature: next.scene.temperature, updatedDay: next.worldClock.day,
        });
        const existing = next.systems.regionalWeather.findIndex(entry => entry.region.toLocaleLowerCase() === regional.region.toLocaleLowerCase());
        if (existing >= 0) next.systems.regionalWeather[existing] = { ...next.systems.regionalWeather[existing], ...regional, id: next.systems.regionalWeather[existing].id };
        else next.systems.regionalWeather.push(regional);
    }

    const moving = ['Preparing', 'Traveling', 'Delayed'].includes(next.travel.status);
    const mentionedSite = latestMentionedAtlasSite(assistant, next) || latestMentionedAtlasSite(user, next);
    const escapedSite = mentionedSite?.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const presenceConfirmed = mentionedSite && (new RegExp(`(?:arriv(?:e|ed|es|ing)|reach(?:ed|es|ing)|enter(?:ed|s|ing)|at|inside|อยู่(?:ที่|ใน)|มาถึง|ถึง|เข้า(?:สู่|ไปใน)?)\\s+(?:the\\s+)?${escapedSite}`, 'i').test(combined)
        || !base.onboarding?.locationSeeded || /^initial$/.test(base.updateSource || ''));
    if (!moving && mentionedSite && presenceConfirmed && unchanged(state => [state.location.continent, state.location.region, state.location.place, state.location.mapX, state.location.mapY])) {
        setIfChanged(next.location, 'continent', mentionedSite.continent);
        setIfChanged(next.location, 'region', mentionedSite.region);
        setIfChanged(next.location, 'place', mentionedSite.name);
        setIfChanged(next.location, 'zoneType', mentionedSite.zone);
        setIfChanged(next.location, 'mapX', mentionedSite.x);
        setIfChanged(next.location, 'mapY', mentionedSite.y);
        setIfChanged(next.onboarding, 'locationSeeded', true);
        addDiscoveredLocation(next, mentionedSite.name);
    }
    if (!next.onboarding.locationSeeded && !unchanged(state => [state.location.continent, state.location.region, state.location.place, state.location.mapX, state.location.mapY])) {
        setIfChanged(next.onboarding, 'locationSeeded', true);
    }

    if (unchanged(state => state.scene.position)) {
        const positions = [
            [/\b(?:inside|indoors|within)\b|(?:ภายใน|ข้างใน|อยู่ในห้อง)/i, 'Indoors'],
            [/\b(?:road|path|trail)\b|(?:ถนน|เส้นทาง)/i, 'On the road'],
            [/\b(?:forest|woods|grove)\b|(?:ป่า|พงไพร)/i, 'In the wilderness'],
            [/\b(?:outside|outdoors|open air)\b|(?:ด้านนอก|กลางแจ้ง)/i, 'Outdoors'],
        ];
        const position = positions.find(([pattern]) => pattern.test(assistant))?.[1];
        if (position) setIfChanged(next.scene, 'position', position);
        else if (mentionedSite && presenceConfirmed && /^Unknown$/i.test(next.scene.position)) setIfChanged(next.scene, 'position', `At ${mentionedSite.name}`);
    }

    const resourceSpecs = [
        ['hp', ['HP', 'health', 'พลังชีวิต']],
        ['mp', ['MP', 'mana', 'aura', 'มานา', 'ออร่า']],
        ['stamina', ['stamina', 'เรี่ยวแรง', 'ความอึด']],
    ];
    for (const [key, aliases] of resourceSpecs) {
        if (!unchanged(state => state.player[key])) continue;
        const explicit = explicitResourceValue(assistant, aliases);
        if (!explicit) continue;
        if (explicit.max !== null) setIfChanged(next.player[key], 'max', Math.max(1, explicit.max));
        const current = explicit.set === undefined ? next.player[key].current + explicit.delta : explicit.set;
        setIfChanged(next.player[key], 'current', Math.max(0, Math.min(next.player[key].max, current)));
    }

    if (unchanged(state => state.player.hp) && !explicitResourceValue(assistant, ['HP', 'health', 'พลังชีวิต'])) {
        const injury = /\b(?:wounded|injured|bleeding|struck|hit|slashed|stabbed|burned|fractured)\b|(?:บาดเจ็บ|เลือดออก|ถูกฟัน|ถูกแทง|ถูกโจมตี|กระดูกหัก|ไหม้)/i.test(assistant);
        const healing = /\b(?:healed|treated|bandaged|recovered health|wound(?:s)? closed)\b|(?:รักษา|สมานแผล|ทำแผล|ฟื้นพลังชีวิต)/i.test(assistant);
        if (injury && !/\b(?:dodg|miss|blocked|unharmed|no damage)\b|(?:หลบได้|พลาด|ป้องกันได้|ไม่บาดเจ็บ)/i.test(assistant)) {
            const damage = /\b(?:critical|severe|deep|grave)\b|(?:สาหัส|รุนแรง|แผลลึก)/i.test(assistant) ? 15 : 7;
            setIfChanged(next.player.hp, 'current', Math.max(0, next.player.hp.current - damage));
            const conditionSpec = [
                [/\b(?:bleeding|blood loss)\b|(?:เลือดออก|เสียเลือด)/i, { name: 'Bleeding', type: 'Injury', damagePerTurn: 2, treatment: 'Bandage or healing' }],
                [/\b(?:poisoned|venom|toxin)\b|(?:ติดพิษ|ยาพิษ|พิษ)/i, { name: 'Poisoned', type: 'Ailment', damagePerTurn: 2, treatment: 'Antidote or detoxification' }],
                [/\b(?:burned|burning|scorched)\b|(?:ไหม้|ไฟลวก|ถูกเผา)/i, { name: 'Burned', type: 'Injury', damagePerTurn: 1, treatment: 'Cool and treat the burn' }],
                [/\b(?:fractured|broken (?:arm|leg|bone))\b|(?:กระดูกหัก|แขนหัก|ขาหัก)/i, { name: 'Fracture', type: 'Injury', staminaPerTurn: 2, treatment: 'Immobilize and receive medical care' }],
            ].find(([pattern]) => pattern.test(assistant))?.[1];
            if (conditionSpec && unchanged(state => state.systems.effects)) {
                const effect = statusEffect({ ...conditionSpec, severity: damage >= 15 ? 'Severe' : 'Moderate', remainingTurns: 4, source: assistant.slice(0, 220) });
                if (effect && !next.systems.effects.some(entry => entry.name === effect.name)) {
                    next.systems.effects.push(effect);
                    changes += 1;
                }
            }
            if (unchanged(state => state.systems.combatLogs)) {
                const log = combatLogEntry({
                    summary: `Confirmed injury dealt ${damage} HP damage`, attacker: 'Role-play event', target: next.player.name,
                    damageType: /burn|ไหม้|เผา/i.test(assistant) ? 'Fire' : /poison|พิษ/i.test(assistant) ? 'Poison' : 'Physical',
                    bodyPart: /\b(?:arm|แขน)\b/i.test(assistant) ? 'Arm' : /\b(?:leg|ขา)\b/i.test(assistant) ? 'Leg' : '',
                    baseDamage: damage, finalDamage: damage, critical: damage >= 15, source: 'turn-reconcile',
                });
                if (log) next.systems.combatLogs.push(log);
                changes += 1;
            }
        } else if (healing) setIfChanged(next.player.hp, 'current', Math.min(next.player.hp.max, next.player.hp.current + 8));
    }

    if (/\b(?:bandaged|stopped the bleeding|antidote|detoxified|treated the burn|set the bone)\b|(?:ห้ามเลือด|พันแผล|ถอนพิษ|รักษาแผลไหม้|ดามกระดูก)/i.test(assistant)
        && unchanged(state => state.systems.effects)) {
        const before = next.systems.effects.length;
        next.systems.effects = next.systems.effects.filter(effect => {
            if (/\b(?:bandaged|stopped the bleeding)\b|(?:ห้ามเลือด|พันแผล)/i.test(assistant) && effect.name === 'Bleeding') return false;
            if (/\b(?:antidote|detoxified)\b|(?:ถอนพิษ|ยาแก้พิษ)/i.test(assistant) && effect.name === 'Poisoned') return false;
            if (/\b(?:treated the burn)\b|(?:รักษาแผลไหม้)/i.test(assistant) && effect.name === 'Burned') return false;
            if (/\b(?:set the bone)\b|(?:ดามกระดูก)/i.test(assistant) && effect.name === 'Fracture') return false;
            return true;
        });
        changes += before - next.systems.effects.length;
    }

    const ate = /\b(?:ate|eaten|finished (?:the )?(?:meal|food)|had (?:a )?meal)\b|(?:กิน|รับประทาน|ทานอาหาร|กินเสร็จ)/i.test(assistant);
    const drank = /\b(?:drank|drunk|finished (?:the )?(?:water|drink))\b|(?:ดื่ม|กินน้ำ)/i.test(assistant);
    if (ate && unchanged(state => state.player.survival.hunger)) setIfChanged(next.player.survival, 'hunger', Math.min(100, next.player.survival.hunger + 24));
    if (drank && unchanged(state => state.player.survival.thirst)) setIfChanged(next.player.survival, 'thirst', Math.min(100, next.player.survival.thirst + 30));

    const powerAction = /\b(?:cast|casts|casted|activated|released|channeled|summoned|invoked|used)\b|(?:ร่าย|ใช้พลัง|ปลดปล่อย|เปิดใช้งาน|เรียกใช้)/i;
    const successfulPowerUse = (powerAction.test(assistant) || powerAction.test(user))
        && !/\b(?:failed|fizzled|could not|unable)\b|(?:ล้มเหลว|ใช้ไม่ได้|ไม่สำเร็จ)/i.test(assistant);
    const divineMentioned = /\bdivine\s+(?:mana|aura)\b|(?:มานา|ออร่า).{0,24}(?:เทพ|ศักดิ์สิทธิ์)|(?:เทพ|ศักดิ์สิทธิ์).{0,24}(?:มานา|ออร่า)/i.test(combined);
    const discipline = divineMentioned ? MAGIC_DISCIPLINES.find(entry => entry.id === 'divineMana')
        : MAGIC_DISCIPLINES.find(entry => new RegExp(entry.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(combined));
    if (discipline && successfulPowerUse) {
        if (unchanged(state => state.proficiencies.magic[discipline.id])) {
            const previous = next.proficiencies.magic[discipline.id];
            setIfChanged(next.proficiencies.magic, discipline.id, Math.min(100, previous + (previous ? 1 : 2)));
        }
        if (discipline.id === 'divineMana') {
            if (unchanged(state => state.player.powerType)) setIfChanged(next.player, 'powerType', 'Divine Mana');
            if (unchanged(state => state.player.aura.color)) setIfChanged(next.player.aura, 'color', '#ffffff');
        }
        if (!next.player.aura.infinite && unchanged(state => state.player.mp) && !explicitResourceValue(assistant, ['MP', 'mana', 'aura', 'มานา', 'ออร่า'])) {
            const cost = Math.max(1, Math.ceil(4 * (1 - next.player.aura.efficiency * .006)));
            setIfChanged(next.player.mp, 'current', Math.max(0, next.player.mp.current - cost));
        }
    }
    const auraTraining = /\b(?:mana|aura)\s+(?:control|output|efficiency|recovery)\s+(?:training|practice)|(?:ฝึก|ซ้อม).{0,30}(?:ควบคุม|ปล่อย|ประสิทธิภาพ|ฟื้นฟู).{0,20}(?:มานา|ออร่า)/i.test(combined);
    if (auraTraining) {
        const key = /output|ปล่อย/i.test(combined) ? 'output' : /efficien|ประสิทธิภาพ/i.test(combined) ? 'efficiency' : /recover|ฟื้นฟู/i.test(combined) ? 'recovery' : 'control';
        if (unchanged(state => state.player.aura[key])) setIfChanged(next.player.aura, key, Math.min(100, next.player.aura[key] + 1));
    }
    if (/\b(?:boundless|limitless|infinite|never[- ]deplet(?:ing|es)|unlimited)\s+(?:aura|mana)\b|\b(?:aura|mana)\b.{0,32}\b(?:is\s+)?(?:boundless|limitless|infinite|unlimited|never[- ]deplet(?:ing|es))\b|(?:ออร่า|มานา).{0,40}(?:ไร้ขีดจำกัด|ไร้ขอบเขต|ไม่มีขีดจำกัด|ไม่มีวันหมด|อนันต์)|(?:ไร้ขีดจำกัด|ไร้ขอบเขต|ไม่มีขีดจำกัด|ไม่มีวันหมด|อนันต์).{0,40}(?:ออร่า|มานา)/i.test(assistant)
        && unchanged(state => state.player.aura.infinite)) setIfChanged(next.player.aura, 'infinite', true);

    const partyConfirmed = /\b(?:join(?:ed|s|ing)?|form(?:ed|s|ing)?|became (?:a )?member)\b.{0,80}\bparty\b|\bparty\b.{0,80}\b(?:join(?:ed|s|ing)?|member)\b|(?:เข้าร่วม|ร่วม|ตั้ง|ก่อตั้ง).{0,50}(?:ปาร์ตี้|กลุ่มผจญภัย)|(?:ปาร์ตี้|กลุ่มผจญภัย).{0,50}(?:มีสมาชิก|เข้าร่วม|ร่วมทีม)/i.test(assistant);
    if (partyConfirmed) {
        const candidates = [...friendlyNpcs(next), ...characterLifeCharacterReferences().map(entry => ({
            id: entry.id, name: entry.name, relationship: entry.relationshipToUser || 'Companion', characterLifeId: entry.id, characterLifeScope: 'character',
        }))];
        const mentioned = candidates.filter(entry => entry.name && combined.toLocaleLowerCase().includes(entry.name.toLocaleLowerCase()));
        if (mentioned.length) {
            if (!next.social.party) {
                next.social.party = partyProfile({ name: 'Adventuring Party', leaderId: 'player', memberIds: [] });
                next.player.party = next.social.party.name;
                changes += 1;
            }
            for (const record of mentioned) {
                const npc = resolveOrCreateFriendlyNpc(next, record);
                if (npc && !next.social.party.memberIds.includes(npc.id)) {
                    next.social.party.memberIds.push(npc.id);
                    changes += 1;
                }
            }
        }
    }

    synchronizeWorldState(next, candidate);
    return { next: normalize(next, candidate), changes };
}

async function catchUpTravelHistory() {
    const settings = getSettings();
    const context = SillyTavern.getContext();
    if (!settings.autoTrack || !context.getCurrentChatId?.() || !context.chat?.length) return false;
    const current = getState();
    const caughtUp = catchUpActiveTravelFromChat(current, context, context.chat.length - 1);
    return caughtUp ? persistState(caughtUp, 'user-travel-history-catchup') : false;
}

async function processUserTravelIntent(messageId) {
    const settings = getSettings();
    if (!settings.autoTrack) return false;
    const context = SillyTavern.getContext();
    const numericId = Number(messageId);
    const message = Number.isInteger(numericId) && numericId >= 0 ? context.chat?.[numericId]
        : [...(context.chat || [])].reverse().find(entry => entry?.is_user && !entry?.is_system);
    if (!message?.is_user || message.is_system) return false;
    const stored = getState();
    const identitySeeded = bootstrapPlayerIdentityFromChat(stored, context);
    const identityState = identitySeeded || stored;
    const clockAdvanced = advanceWorldClockFromUserMessage(messageId, message, identityState);
    const clockState = clockAdvanced || identityState;
    const resourcesAdvanced = clockAdvanced ? advanceTurnResourcesFromUserMessage(message, clockState) : null;
    const resourcesState = resourcesAdvanced || clockState;
    const trainingAdvanced = advanceAerobicTrainingFromUserMessage(messageId, message, resourcesState);
    const current = trainingAdvanced || resourcesState;
    const localChanged = Boolean(identitySeeded || clockAdvanced || resourcesAdvanced || trainingAdvanced);
    const intent = inferUserTravelIntent(message.mes, current);
    if (!intent) {
        const caughtUp = catchUpActiveTravelFromChat(current, context, messageId);
        if (caughtUp) return persistState(caughtUp, 'user-travel-history-catchup');
        const advanced = advanceActiveTravelFromUserMessage(messageId, message, current);
        if (advanced) return persistState(advanced, 'user-travel-progress');
        return localChanged ? persistState(current, identitySeeded ? 'user-registration-bootstrap' : trainingAdvanced ? 'user-aerobic-training' : 'user-turn-clock') : false;
    }
    const alreadyHeadingThere = ['Preparing', 'Traveling', 'Delayed'].includes(current.travel.status)
        && mapLocationByName(current.travel.destinationPlace || current.travel.destination, current)?.id === intent.destination.id;
    const alreadyThere = current.location.place === intent.destination.name && !alreadyHeadingThere;
    if (alreadyHeadingThere) {
        const advanced = advanceActiveTravelFromUserMessage(messageId, message, current);
        if (advanced) return persistState(advanced, 'user-travel-progress');
        return localChanged ? persistState(current, identitySeeded ? 'user-registration-bootstrap' : trainingAdvanced ? 'user-aerobic-training' : 'user-turn-clock') : false;
    }
    if (alreadyThere) return localChanged ? persistState(current, identitySeeded ? 'user-registration-bootstrap' : trainingAdvanced ? 'user-aerobic-training' : 'user-turn-clock') : false;
    const next = clone(current);
    const totalDays = estimatedTravelDays(next, intent.destination, intent.route);
    const origin = next.location.place || next.location.region || 'Unknown';
    next.travel = {
        status: 'Traveling',
        origin,
        destination: intent.destination.name,
        route: intent.route,
        totalDays,
        remainingDays: totalDays,
        notes: settings.language === 'th' ? 'เริ่มอัตโนมัติจากข้อความโรลเพลย์ของผู้ใช้' : 'Started automatically from the user role-play message.',
        originX: next.location.mapX,
        originY: next.location.mapY,
        originContinent: next.location.continent,
        originRegion: next.location.region,
        destinationX: intent.destination.x,
        destinationY: intent.destination.y,
        destinationContinent: intent.destination.continent,
        destinationRegion: intent.destination.region,
        destinationPlace: intent.destination.name,
        startedAtWorldMinutes: worldClockMinutes(next.worldClock),
        lastWorldMinutes: worldClockMinutes(next.worldClock),
        trackedUserTurns: 0,
        lastUserProgressMessage: userTravelMessageKey(messageId, message),
        routePoints: [],
    };
    next.travel.routePoints = buildTravelRoutePoints(next, next.travel);
    next.journal.push({
        id: uid(),
        text: `Began a ${totalDays}-day ${intent.route.toLocaleLowerCase()} journey from ${origin} to ${intent.destination.name} from the user's role-play action.`,
        at: new Date().toISOString(),
    });
    appendJourneyLog(next, { text: `Set out from ${origin} toward ${intent.destination.name} via ${intent.route}.`, place: origin, day: next.worldClock.dayName || `Day ${next.worldClock.day}`, kind: 'travel' });
    return persistState(next, 'user-travel-intent');
}

const tabButton = (id, icon, label, active = false) => `
    <button class="tretaresia-tab-button${active ? ' is-active' : ''}" type="button" role="tab"
        data-tab="${id}" aria-selected="${active}"><i class="${icon}"></i><span>${html(tr(label))}</span></button>`;

function controlCenterTrigger() {
    return '<button id="tretaresia-control-trigger" class="tretaresia-header-button tretaresia-control-trigger" type="button" data-action="toggle-control-center" aria-label="' +
        html(tr('Control center')) + '" title="' + html(tr('Control center')) + '" aria-expanded="false"><i class="fa-solid fa-sliders"></i></button>';
}

function controlCenterMarkup() {
    const settings = getSettings();
    const presetOptions = Object.keys(COLOR_PRESETS).map(key =>
        '<option value="' + key + '"' + (settings.themePreset === key ? ' selected' : '') + '>' +
        key.replace(/^./, value => value.toUpperCase()) + '</option>').join('') +
        '<option value="custom"' + (settings.themePreset === 'custom' ? ' selected' : '') + '>' + html(tr('Custom')) + '</option>';
    const colorField = (label, key) =>
        '<label class="tretaresia-control-field color"><span>' + html(tr(label)) + '</span>' +
        '<input type="color" data-ui-setting="' + key + '" value="' + settings[key] + '"></label>';
    return '<section class="tretaresia-control-panel" aria-label="' + html(tr('Control center')) + '">' +
        '<header class="tretaresia-control-head"><span class="tretaresia-control-sigil"><i class="fa-solid fa-compass-drafting"></i></span>' +
        '<div><small>TRETARESIA / CONSOLE</small><h3>' + html(tr('Control center')) + '</h3></div>' +
        '<button type="button" data-action="close-control-center" aria-label="' + html(tr('Close')) + '"><i class="fa-solid fa-xmark"></i></button></header>' +
        '<div class="tretaresia-control-scroll">' +
        '<section class="tretaresia-control-section"><div class="tretaresia-control-section-title"><b>01</b><span><strong>' + html(tr('Palette')) + '</strong><small>' + html(tr('Fully customizable')) + '</small></span></div>' +
        '<label class="tretaresia-control-field full"><span>' + html(tr('Theme preset')) + '</span><select data-ui-setting="themePreset">' + presetOptions + '</select></label>' +
        '<div class="tretaresia-control-grid">' + colorField('Accent', 'accentColor') + colorField('Highlight', 'accentAltColor') +
        colorField('Text', 'inkColor') + colorField('Surface', 'surfaceColor') + colorField('Aura / Mana', 'auraColor') + '</div>' +
        '<p class="tretaresia-control-note">' + html(tr('A preset overwrites all four colors. Adjust any swatch afterwards to make it your own.')) + '</p></section>' +
        '<section class="tretaresia-control-section"><div class="tretaresia-control-section-title"><b>02</b><span><strong>' + html(tr('Interface')) + '</strong><small>' + html(tr('Visual controls')) + '</small></span></div>' +
        '<div class="tretaresia-control-grid">' +
        '<label class="tretaresia-control-field full"><span>' + html(tr('Glass')) + '<output>' + settings.glassOpacity + '%</output></span><input type="range" data-ui-setting="glassOpacity" min="55" max="98" value="' + settings.glassOpacity + '"></label>' +
        '<label class="tretaresia-control-field full"><span>' + html(tr('Glow')) + '<output>' + settings.glowStrength + '%</output></span><input type="range" data-ui-setting="glowStrength" min="0" max="100" value="' + settings.glowStrength + '"></label>' +
        '<label class="tretaresia-control-field"><span>' + html(tr('Density')) + '</span><select data-ui-setting="density"><option value="compact"' + (settings.density === 'compact' ? ' selected' : '') + '>' + html(tr('Compact')) + '</option><option value="comfortable"' + (settings.density === 'comfortable' ? ' selected' : '') + '>' + html(tr('Comfortable')) + '</option></select></label>' +
        '<label class="tretaresia-control-field"><span>' + html(tr('Language')) + '</span><select data-ui-setting="language"><option value="en"' + (settings.language === 'en' ? ' selected' : '') + '>English</option><option value="th"' + (settings.language === 'th' ? ' selected' : '') + '>ไทย</option></select></label>' +
        '<label class="tretaresia-control-field full"><span>' + html(tr('Action delivery')) + '</span><select data-ui-setting="interactionMode"><option value="hidden"' + (settings.interactionMode === 'hidden' ? ' selected' : '') + '>' + html(tr('Hidden')) + '</option><option value="visible"' + (settings.interactionMode === 'visible' ? ' selected' : '') + '>' + html(tr('Visible')) + '</option><option value="draft"' + (settings.interactionMode === 'draft' ? ' selected' : '') + '>' + html(tr('Draft only')) + '</option></select></label>' +
        '<small class="tretaresia-action-mode-help full" data-action-mode-help>' + html(activityCopy()) + '</small>' +
        '<label class="tretaresia-control-field full"><span>' + html(tr('Activity indicator')) + '</span><select data-ui-setting="activityIndicator"><option value="full"' + (settings.activityIndicator === 'full' ? ' selected' : '') + '>' + html(tr('Full')) + '</option><option value="compact"' + (settings.activityIndicator === 'compact' ? ' selected' : '') + '>' + html(tr('Compact')) + '</option><option value="off"' + (settings.activityIndicator === 'off' ? ' selected' : '') + '>' + html(tr('Off')) + '</option></select></label>' +
        '</div></section>' +
        '<section class="tretaresia-control-section"><div class="tretaresia-control-section-title"><b>03</b><span><strong>' + html(tr('Continuity')) + '</strong><small>' + html(tr('Character transfer')) + '</small></span></div>' +
        '<label class="tretaresia-continuity-toggle"><input type="checkbox" data-ui-setting="autoContinuity"' + (settings.autoContinuity ? ' checked' : '') + '><span>' + html(tr('Carry this character into new chats automatically')) + '</span></label>' +
        '<p class="tretaresia-control-note">' + html(tr('State and player portrait are included. Device-only NPC portraits and audio are copied automatically only when continuing on this device.')) + '</p>' +
        '<div class="tretaresia-continuity-actions"><button type="button" data-action="export-state"><i class="fa-solid fa-arrow-up-from-bracket"></i>' + html(tr('Export state')) + '</button><button type="button" data-action="import-state"><i class="fa-solid fa-arrow-down-to-bracket"></i>' + html(tr('Import state')) + '</button></div></section>' +
        '</div></section>';
}

function buildControlCenter() {
    document.getElementById('tretaresia-control-dialog')?.remove();
    const dialog = document.createElement('dialog');
    dialog.id = 'tretaresia-control-dialog';
    dialog.className = 'tretaresia-control-dialog';
    dialog.innerHTML = controlCenterMarkup();
    document.body.appendChild(dialog);
    dialog.addEventListener('click', event => {
        if (event.target === dialog) setControlCenterOpen(false);
    });
    dialog.addEventListener('close', () => {
        const trigger = document.getElementById('tretaresia-control-trigger');
        trigger?.classList.remove('is-active');
        trigger?.setAttribute('aria-expanded', 'false');
    });
    dialog.addEventListener('click', onPanelClick);
    dialog.addEventListener('input', onInterfaceSettingChange);
    dialog.addEventListener('change', onInterfaceSettingChange);
    return dialog;
}

function controlCenterOpen() {
    return document.getElementById('tretaresia-control-dialog')?.open === true;
}

function setControlCenterOpen(open) {
    const dialog = document.getElementById('tretaresia-control-dialog') || buildControlCenter();
    const trigger = document.getElementById('tretaresia-control-trigger');
    if (open && !dialog.open) {
        try {
            dialog.showModal();
        } catch (error) {
            dialog.setAttribute('open', '');
            console.warn('[Tretaresia RPG] showModal() unavailable; using fallback.', error);
        }
        requestAnimationFrame(() => dialog.querySelector('.tretaresia-control-panel')?.scrollTo({ top: 0 }));
    } else if (!open && dialog.open) {
        dialog.close();
    }
    trigger?.classList.toggle('is-active', dialog.open);
    trigger?.setAttribute('aria-expanded', String(dialog.open));
}

globalThis.TRETARESIA_SETTINGS = () => setControlCenterOpen(true);


function buildInterface() {
    buildActivityIndicator();
    buildEventNotificationStack();
    const existing = document.getElementById('tretaresia-rpg-overlay');
    if (existing) {
        installAstraSurfaceCompatibility(existing);
        if (!document.getElementById('tretaresia-control-dialog')) {
            try {
                buildControlCenter();
            } catch (error) {
                console.error('[Tretaresia RPG] Could not rebuild the control center.', error);
            }
        }
        return;
    }
    const overlay = document.createElement('div');
    overlay.id = 'tretaresia-rpg-overlay';
    overlay.className = 'tretaresia-rpg-overlay';
    overlay.setAttribute('data-vaul-no-drag', '');
    overlay.setAttribute('data-astra-extension-surface', 'tretaresia-rpg');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
        '<button class="tretaresia-rpg-backdrop" type="button" aria-label="Close Tretaresia RPG"></button>' +
        '<section id="tretaresia-rpg-panel" class="tretaresia-rpg-panel" role="dialog" aria-modal="true" aria-labelledby="tretaresia-rpg-title" tabindex="-1">' +
        '<div class="tretaresia-app-shell"><header class="tretaresia-rpg-panel-header"><div class="tretaresia-brand-lockup">' +
        '<div class="tretaresia-rpg-panel-heading"><span class="tretaresia-rpg-kicker">' + html(tr('Tretaresia Role-play')) + '</span><h2 id="tretaresia-rpg-title">Tretaresia</h2></div></div>' +
        '<div class="tretaresia-header-actions"><div id="tretaresia-rpg-sync-state" class="tretaresia-sync-state" data-mode="ready"><i class="fa-solid fa-circle"></i><span>' + html(tr('Ready')) + '</span></div>' +
        controlCenterTrigger() + '<button id="tretaresia-rpg-close" class="tretaresia-header-button" type="button" aria-label="Close"><i class="fa-solid fa-xmark"></i></button></div></header>' +
        moduleSlider() +
        '<main class="tretaresia-rpg-panel-body">' +
        TAB_ORDER.map((id, index) => '<section class="tretaresia-tab-panel' + (index ? '' : ' is-active') + '" data-panel="' + id + '"' + (index ? ' hidden' : '') + '></section>').join('') +
        '</main><footer class="tretaresia-rpg-panel-footer"><span id="tretaresia-context-label"><i class="fa-solid fa-link"></i> ' + html(tr('Waiting for chat')) + '</span>' +
        '<button id="tretaresia-sync-now" class="tretaresia-text-button" type="button"><i class="fa-solid fa-rotate"></i> ' + html(tr('Sync latest turn')) + '</button></footer></div>' +
        '<div id="tretaresia-portrait-editor" class="tretaresia-submodal" hidden></div><div id="tretaresia-letter-reader" class="tretaresia-submodal" hidden></div>' +
        '<input id="tretaresia-npc-avatar-input" type="file" accept="image/*" hidden><input id="tretaresia-state-import" type="file" accept="application/json,.json" hidden>' +
        (typeof buildIntroGate === 'function' ? buildIntroGate() : '') +
        '</section>';
    document.body.appendChild(overlay);
    installAstraSurfaceCompatibility(overlay);
    try {
        buildControlCenter();
    } catch (error) {
        console.error('[Tretaresia RPG] Could not build the control center; the main interface will still open.', error);
    }
    overlay.querySelector('.tretaresia-rpg-backdrop')?.addEventListener('click', closeInterface);
    overlay.querySelector('#tretaresia-rpg-close')?.addEventListener('click', closeInterface);
    overlay.querySelector('#tretaresia-sync-now')?.addEventListener('click', () => queueAnalyze({ manual: true }));
    overlay.querySelector('#tretaresia-control-trigger')?.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        setControlCenterOpen(!controlCenterOpen());
    });
    overlay.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => activateTab(button.dataset.tab)));
    overlay.addEventListener('submit', onSubmit);
    overlay.addEventListener('click', onPanelClick);
    overlay.addEventListener('change', onPanelChange);
    overlay.addEventListener('input', onInterfaceSettingChange);
    overlay.addEventListener('change', onInterfaceSettingChange);
    bindModuleSlider(overlay);
    activeTabIndex = 0;
    applyAppearance();
    syncActivityIndicator();
}

function installAstraSurfaceCompatibility(overlay) {
    if (!overlay || overlay.dataset.astraCompatibilityBound === 'true') return;
    overlay.dataset.astraCompatibilityBound = 'true';
    const panel = overlay.querySelector('#tretaresia-rpg-panel');
    const body = overlay.querySelector('.tretaresia-rpg-panel-body');
    for (const element of [panel, body]) {
        element?.setAttribute('data-vaul-no-drag', '');
        element?.setAttribute('data-astra-scroll-affordance', 'surface');
    }
    const syncViewport = () => {
        const height = globalThis.visualViewport?.height || globalThis.innerHeight;
        if (height > 0) overlay.style.setProperty('--tretaresia-viewport-height', `${Math.round(height)}px`);
    };
    syncViewport();
    globalThis.visualViewport?.addEventListener('resize', syncViewport, { passive: true });
    const stopHostGesture = event => {
        if (event.target instanceof Element && event.target.closest('.tretaresia-rpg-panel-body, .tretaresia-npc-list, .tretaresia-npc-dossier, .tretaresia-module-window, [data-rpg-scroll-key]')) event.stopPropagation();
    };
    overlay.addEventListener('touchmove', stopHostGesture, { passive: true });
    overlay.addEventListener('wheel', stopHostGesture, { passive: true });
    body?.addEventListener('scroll', () => {
        if (restoringPanelScroll) return;
        const id = overlay.querySelector('[data-panel].is-active')?.dataset.panel;
        if (id) panelScrollPositions.set(id, { top: body.scrollTop, left: body.scrollLeft });
    }, { passive: true });
}

function bindNestedScrollMemory(id, panel) {
    panel?.querySelectorAll('[data-rpg-scroll-key]').forEach(element => {
        if (element.dataset.rpgScrollBound === 'true') return;
        element.dataset.rpgScrollBound = 'true';
        element.addEventListener('scroll', () => {
            if (restoringPanelScroll) return;
            nestedScrollPositions.set(`${id}:${element.dataset.rpgScrollKey}`, { top: element.scrollTop, left: element.scrollLeft });
        }, { passive: true });
    });
}

function capturePanelScroll(id, panel) {
    const body = panel?.closest('.tretaresia-rpg-panel-body');
    if (id && panel?.classList.contains('is-active') && body) panelScrollPositions.set(id, { top: body.scrollTop, left: body.scrollLeft });
    panel?.querySelectorAll('[data-rpg-scroll-key]').forEach(element => {
        nestedScrollPositions.set(`${id}:${element.dataset.rpgScrollKey}`, { top: element.scrollTop, left: element.scrollLeft });
    });
}

function restorePanelScroll(id, panel, { restoreBody = true } = {}) {
    const token = ++panelScrollRestoreToken;
    const restore = () => {
        if (token !== panelScrollRestoreToken || !panel?.isConnected) return;
        const body = panel.closest('.tretaresia-rpg-panel-body');
        const bodyPosition = panelScrollPositions.get(id) || { top: 0, left: 0 };
        restoringPanelScroll = true;
        if (restoreBody && panel.classList.contains('is-active') && body) {
            body.scrollTop = bodyPosition.top;
            body.scrollLeft = bodyPosition.left;
        }
        panel.querySelectorAll('[data-rpg-scroll-key]').forEach(element => {
            const position = nestedScrollPositions.get(`${id}:${element.dataset.rpgScrollKey}`);
            if (!position) return;
            element.scrollTop = position.top;
            element.scrollLeft = position.left;
        });
        restoringPanelScroll = false;
        bindNestedScrollMemory(id, panel);
    };
    // Restore before the browser paints replacement markup, then repeat after layout.
    restore();
    requestAnimationFrame(() => requestAnimationFrame(restore));
}

function rebuildInterface() {
    const previous = document.getElementById('tretaresia-rpg-overlay');
    const wasOpen = previous?.classList.contains('is-open');
    const controlWasOpen = controlCenterOpen();
    previous?.remove();
    document.getElementById('tretaresia-control-dialog')?.remove();
    buildInterface();
    renderAll();
    if (wasOpen) {
        const overlay = document.getElementById('tretaresia-rpg-overlay');
        overlay?.classList.add('is-open', 'is-ready');
        overlay?.setAttribute('aria-hidden', 'false');
        document.body.classList.add('tretaresia-rpg-open');
    }
    if (controlWasOpen) setControlCenterOpen(true);
}


function moduleSlider() {
    return '<div class="tretaresia-module-slider" id="tretaresia-module-slider" role="tablist" aria-label="Tretaresia RPG modules">' +
        '<button class="tretaresia-slider-arrow" type="button" data-action="tab-prev" aria-label="Previous module"><i class="fa-solid fa-angle-left"></i></button>' +
        '<div class="tretaresia-module-window"><div class="tretaresia-module-track" id="tretaresia-module-track" style="--tab-index:0">' +
        TAB_ORDER.map((id, index) => '<button class="tretaresia-tab-button' + (index ? '' : ' is-active') + '" type="button" role="tab" data-tab="' + id + '" aria-selected="' + String(!index) + '" tabindex="' + (index ? '-1' : '0') + '">' +
            '<i class="' + TAB_META[id][0] + '"></i><span>' + html(tr(TAB_META[id][1])) + '</span><em>' + String(index + 1).padStart(2, '0') + ' / ' + String(TAB_ORDER.length).padStart(2, '0') + '</em></button>').join('') +
        '</div></div><button class="tretaresia-slider-arrow" type="button" data-action="tab-next" aria-label="Next module"><i class="fa-solid fa-angle-right"></i></button>' +
        '<span class="tretaresia-module-dots" aria-hidden="true">' + TAB_ORDER.map((_, index) => '<i' + (index ? '' : ' class="on"') + '></i>').join('') + '</span></div>';
}

function stepTab(direction) {
    const next = Math.min(TAB_ORDER.length - 1, Math.max(0, activeTabIndex + direction));
    if (next !== activeTabIndex) activateTab(TAB_ORDER[next]);
}

function bindModuleSlider(overlay) {
    const slider = overlay.querySelector('#tretaresia-module-slider');
    const window_ = overlay.querySelector('.tretaresia-module-window');
    const track = overlay.querySelector('#tretaresia-module-track');
    if (!slider || !window_ || !track) return;
    let startX = 0;
    let startY = 0;
    let dragging = false;
    let locked = false;
    const release = event => {
        if (!dragging) return;
        dragging = false;
        track.style.transition = '';
        track.style.setProperty('--tab-drag', '0px');
        const delta = (Number.isFinite(event.clientX) ? event.clientX : startX) - startX;
        if (locked && Math.abs(delta) > 44) stepTab(delta < 0 ? 1 : -1);
    };
    window_.addEventListener('pointerdown', event => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        dragging = true;
        locked = false;
        startX = event.clientX;
        startY = event.clientY;
        track.style.transition = 'none';
    });
    window_.addEventListener('pointermove', event => {
        if (!dragging) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        if (!locked) {
            if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) return release(event);
            if (Math.abs(dx) < 8) return;
            locked = true;
        }
        const limit = (window_.getBoundingClientRect().width || 1) * .3;
        track.style.setProperty('--tab-drag', String(Math.max(-limit, Math.min(limit, dx))) + 'px');
    });
    window_.addEventListener('pointerup', release);
    window_.addEventListener('pointercancel', release);
    window_.addEventListener('pointerleave', release);
    slider.addEventListener('keydown', event => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        stepTab(event.key === 'ArrowRight' ? 1 : -1);
        overlay.querySelector('.tretaresia-tab-button.is-active')?.focus({ preventScroll: true });
    });
}

function onInterfaceSettingChange(event) {
    const portraitControl = event.target.closest('[data-portrait-control]');
    if (portraitControl instanceof HTMLInputElement) {
        const device = portraitControl.closest('.tretaresia-portrait-device');
        const preview = device?.querySelector('img');
        const output = portraitControl.closest('label')?.querySelector('output');
        const property = portraitControl.dataset.portraitControl;
        if (preview) preview.style.setProperty('--preview-' + property, property === 'zoom' ? portraitControl.value : portraitControl.value + '%');
        if (output) output.textContent = property === 'zoom' ? Number(portraitControl.value).toFixed(2) + '×' : Math.round(Number(portraitControl.value)) + '%';
        return;
    }
    const proficiency = event.target.closest('.tretaresia-proficiency-card input[type="range"]');
    if (proficiency instanceof HTMLInputElement) {
        const card = proficiency.closest('.tretaresia-proficiency-card');
        const fill = card?.querySelector('.tretaresia-proficiency-track i');
        const score = card?.querySelector('.tretaresia-proficiency-orbit b');
        const rankCopy = card?.querySelector('.tretaresia-proficiency-rank strong');
        const rank = tr(proficiencyRank(proficiency.value));
        if (fill) fill.style.width = proficiency.value + '%';
        if (score) score.innerHTML = proficiency.value + '<small>%</small>';
        if (rankCopy) rankCopy.textContent = rank;
        if (card) card.style.setProperty('--proficiency', proficiency.value);
        return;
    }
    const seek = event.target.closest('#tretaresia-music-seek');
    if (seek instanceof HTMLInputElement && audioPlayer?.duration) {
        audioPlayer.currentTime = Number(seek.value) / 1000 * audioPlayer.duration;
        updateMusicProgress();
        return;
    }
    const control = event.target.closest('[data-ui-setting]');
    if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement)) return;
    const key = control.dataset.uiSetting;
    const settings = getSettings();
    settings[key] = control.type === 'checkbox' ? control.checked : control.type === 'range' ? Number(control.value) : control.value;
    if (key === 'themePreset' && COLOR_PRESETS[settings.themePreset]) {
        const preset = COLOR_PRESETS[settings.themePreset];
        settings.accentColor = preset.accent;
        settings.accentAltColor = preset.alt;
        settings.inkColor = preset.ink;
        settings.surfaceColor = preset.surface;
    }
    if (['accentColor', 'accentAltColor', 'inkColor', 'surfaceColor'].includes(key)) settings.themePreset = 'custom';
    SillyTavern.getContext().saveSettingsDebounced();
    if (control.type === 'range') {
        const output = control.closest('.tretaresia-control-field')?.querySelector('output');
        if (output) output.textContent = control.value + '%';
    }
    if (key === 'autoContinuity') {
        if (settings.autoContinuity) writeContinuitySnapshot(getState());
        else {
            const storageKey = continuityStorageKey();
            if (storageKey) localStorage.removeItem(storageKey);
        }
    }
    if (key === 'language' && event.type === 'change') {
        rebuildInterface();
        return;
    }
    applyAppearance();
    if (['accentColor', 'accentAltColor', 'inkColor', 'surfaceColor'].includes(key)) {
        const preset = document.querySelector('#tretaresia-control-dialog [data-ui-setting="themePreset"]');
        if (preset) preset.value = settings.themePreset;
    }
    if (key === 'themePreset' && event.type === 'change') {
        const reopen = controlCenterOpen();
        buildControlCenter();
        if (reopen) setControlCenterOpen(true);
        return;
    }
    if (key === 'interactionMode') updateActionModeHelp();
    if (key === 'activityIndicator') syncActivityIndicator();
    if (key === 'auraColor') scheduleAuraColorSetting();
}

function scheduleAuraColorSetting() {
    clearTimeout(auraColorSettingTimer);
    auraColorSettingTimer = setTimeout(() => {
        const context = SillyTavern.getContext();
        if (!context.getCurrentChatId?.()) return;
        const state = clone(getState());
        state.player.aura.color = getSettings().auraColor;
        void persistState(state, 'aura-color-setting');
    }, 120);
}


function activateTab(id) {
    const overlay = document.getElementById('tretaresia-rpg-overlay');
    if (!overlay) return;
    const index = TAB_ORDER.indexOf(id);
    const next = overlay.querySelector('[data-panel="' + id + '"]');
    if (index < 0 || !next) return;
    const current = overlay.querySelector('[data-panel].is-active');
    if (current?.dataset.panel) capturePanelScroll(current.dataset.panel, current);
    activeTabIndex = index;
    overlay.querySelector('#tretaresia-module-track')?.style.setProperty('--tab-index', String(index));
    overlay.querySelectorAll('[data-tab]').forEach(button => {
        const active = button.dataset.tab === id;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
    });
    overlay.querySelectorAll('.tretaresia-module-dots i').forEach((dot, dotIndex) => dot.classList.toggle('on', dotIndex === index));
    if (next === current) return;
    if (current?.dataset.panel === 'map' && id !== 'map') suspendMapRendering(false);
    const state = getState();
    renderPanel(id, next, state);
    if (id === 'npcs') void hydrateNpcPortraits(next, state);
    const transition = ++tabTransitionToken;
    current?.classList.add('is-leaving');
    const finish = () => {
        if (transition !== tabTransitionToken) return;
        overlay.querySelectorAll('[data-panel]').forEach(panel => {
            const active = panel === next;
            panel.hidden = !active;
            panel.classList.toggle('is-active', active);
            panel.classList.remove('is-leaving');
        });
        next.classList.remove('is-entering');
        void next.offsetWidth;
        next.classList.add('is-entering');
        restorePanelScroll(id, next);
        if (id === 'map') requestAnimationFrame(() => {
            setupMapInteractions(next);
            scheduleMapDraw(next, getState());
        });
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
    else setTimeout(finish, 130);
}


const input = (label, name, value, type = 'text', extra = '') =>
    `<label class="tretaresia-field"><span>${html(tr(label))}</span><input name="${name}" type="${type}" value="${html(value)}" ${extra}></label>`;
const select = (label, name, options, selected) =>
    `<label class="tretaresia-field"><span>${html(tr(label))}</span><select name="${name}">${options.map(value =>
        `<option value="${html(value)}"${value === selected ? ' selected' : ''}>${html(tr(value))}</option>`).join('')}</select></label>`;
const heading = (title, subtitle, icon) =>
    `<div class="tretaresia-section-heading"><div><span class="tretaresia-eyebrow">${html(tr('System interface'))}</span>
        <h3>${html(tr(title))}</h3><p>${html(tr(subtitle))}</p></div><i class="${icon} tretaresia-heading-icon"></i></div>`;
const empty = message => `<div class="tretaresia-empty-state"><i class="fa-regular fa-compass"></i><p>${html(tr(message))}</p></div>`;

function meterView(label, value, icon, tone, options = {}) {
    const infinite = Boolean(options.infinite);
    const percent = infinite ? 100 : Math.round(value.current / Math.max(1, value.max) * 100);
    const cappedPercent = Math.min(100, Math.max(0, percent));
    const style = options.color ? ` style="--vital:${html(auraColor(options.color))}"` : '';
    const classes = `${options.divine ? ' is-divine' : ''}${infinite ? ' is-infinite' : ''}`;
    return `<article class="tretaresia-vital tretaresia-vital-${tone}${classes}"${style}>
        <div class="tretaresia-vital-line"><span><i class="${icon}"></i>${html(tr(label))}</span><strong>${infinite ? '&infin;' : value.current} <em>${infinite ? html(tr('Boundless')) : `/ ${value.max}`}</em></strong></div>
        <div class="tretaresia-vital-track" role="meter" aria-valuenow="${infinite ? value.max : value.current}" aria-valuemax="${value.max}" aria-label="${html(tr(label))}">
            <span style="width:${cappedPercent}%"></span><i style="left:${cappedPercent}%"></i>
        </div><small>${infinite ? '&infin;' : `${percent}%`}</small></article>`;
}

function playerCombatProfile(state) {
    const highestMastery = Math.max(0, ...Object.values(state.proficiencies.magic || {}).map(Number),
        ...Object.values(state.proficiencies.sword || {}).map(Number),
        ...(state.proficiencies.customMagic || []).map(entry => entry.proficiency),
        ...(state.proficiencies.customSword || []).map(entry => entry.proficiency));
    const healthRatio = state.player.hp.current / Math.max(1, state.player.hp.max);
    const staminaRatio = state.player.stamina.current / Math.max(1, state.player.stamina.max);
    const effectPenalty = state.systems.effects.reduce((total, entry) => total + (EFFECT_SEVERITIES.indexOf(entry.severity) + 1) * 4, 0);
    return {
        physicalPower: Math.min(100, Math.round(state.player.level * 3 + state.player.stamina.max / 4)),
        speed: Math.min(100, Math.round(state.player.level * 2 + state.player.stamina.max / 3)),
        durability: Math.min(100, Math.round(state.player.level * 2 + state.player.hp.max / 3)),
        manaCapacity: Math.min(100, Math.round(state.player.mp.max / 2)),
        manaControl: state.player.aura.control,
        mastery: Math.round(highestMastery),
        experience: Math.min(100, Math.round(state.player.level * 3 + Math.sqrt(state.progression.kills) * 4)),
        condition: Math.max(0, Math.min(100, Math.round((healthRatio * .65 + staminaRatio * .35) * 100 - effectPenalty))),
    };
}

function npcCombatProfile(entry) {
    const known = value => number(value, 0, 0, 999999) > 0 ? number(value, 0, 0, 999999) : null;
    const mastery = entry.abilities?.length ? Math.max(...entry.abilities.map(ability => ability.proficiency || 0)) : null;
    return {
        physicalPower: known(entry.stats.strength), speed: known(entry.stats.agility),
        durability: known(entry.stats.endurance) ?? (known(entry.stats.hp) === null ? null : Math.min(100, Math.round(entry.stats.hp / 3))),
        manaCapacity: known(entry.stats.mp) === null ? null : Math.min(100, Math.round(entry.stats.mp / 2)),
        manaControl: known(entry.stats.intelligence), mastery: mastery || null,
        experience: known(entry.stats.level) === null ? null : Math.min(100, entry.stats.level * 3),
        condition: known(entry.stats.hp) === null ? null : 100,
    };
}

function combatComparison(player, npc) {
    const known = COMBAT_DIMENSIONS.filter(([key]) => npc[key] !== null);
    if (!known.length) return { label: 'Cannot assess', tone: 'unknown', playerAverage: null, npcAverage: null };
    const playerAverage = known.reduce((sum, [key]) => sum + player[key], 0) / known.length;
    const npcAverage = known.reduce((sum, [key]) => sum + npc[key], 0) / known.length;
    const difference = playerAverage - npcAverage;
    if (difference >= 22) return { label: 'Clear advantage', tone: 'strong', playerAverage, npcAverage };
    if (difference >= 8) return { label: 'Slight advantage', tone: 'advantage', playerAverage, npcAverage };
    if (difference > -8) return { label: 'Evenly matched', tone: 'even', playerAverage, npcAverage };
    if (difference > -22) return { label: 'Slight disadvantage', tone: 'danger', playerAverage, npcAverage };
    return { label: 'Severe disadvantage', tone: 'critical', playerAverage, npcAverage };
}

function diagnosticReport(state) {
    const npcIds = state.npcs.map(entry => entry.id);
    const duplicates = npcIds.filter((id, index) => npcIds.indexOf(id) !== index);
    const unsafeNpcs = state.npcs.filter(entry => entry.mapVisible && entry.mapX !== null
        && !pointIsOnAtlasLand(entry.mapX, entry.mapY, storyWorldId(state)));
    const friendlyIds = new Set(friendlyNpcs(state).map(entry => entry.id));
    const danglingParty = (state.social.party?.memberIds || []).filter(id => !friendlyIds.has(id));
    const seaTravel = state.travel.route === 'Sea' && ['Preparing', 'Traveling', 'Delayed'].includes(state.travel.status);
    const knownSceneValue = value => Boolean(String(value || '').trim()) && !/^unknown$/i.test(String(value).trim());
    const weatherKnown = knownSceneValue(state.scene.weather);
    const positionKnown = knownSceneValue(state.scene.position);
    const sceneReady = weatherKnown && positionKnown;
    const sceneDetail = sceneReady
        ? 'Weather and exact scene position are established'
        : !weatherKnown && !positionKnown
            ? 'Weather and exact scene position are still unknown'
            : !weatherKnown
                ? 'Weather is still unknown'
                : 'Exact scene position is still unknown';
    const checks = [
        ['Vitals', state.player.hp.current <= state.player.hp.max && state.player.mp.current <= state.player.mp.max && state.player.stamina.current <= state.player.stamina.max, 'Current values are within capacity'],
        ['Scene', sceneReady, sceneDetail],
        ['Player map', seaTravel || pointIsOnAtlasLand(state.location.mapX, state.location.mapY, storyWorldId(state), state.location.continent), seaTravel ? 'Sea-route position is valid' : 'Player marker is on atlas land'],
        ['NPC map', unsafeNpcs.length === 0, unsafeNpcs.length ? `${unsafeNpcs.length} marker(s) need repair` : 'Visible NPC markers are on land'],
        ['NPC identity', duplicates.length === 0, duplicates.length ? `${duplicates.length} duplicate id(s)` : 'NPC IDs are unique'],
        ['Party links', danglingParty.length === 0, danglingParty.length ? `${danglingParty.length} missing member reference(s)` : 'Party references are valid'],
        ['Turn audit', state.systems.audit.length > 0, state.systems.audit.length ? `${state.systems.audit.length} audit record(s)` : 'No turn has been audited yet'],
        ['Auto tracking', getSettings().autoTrack, getSettings().autoTrack ? 'One-response tracking is enabled' : 'Tracking is disabled in settings'],
    ];
    const passed = checks.filter(([, ok]) => ok).length;
    return { checks, score: Math.round(passed / checks.length * 100), passed, total: checks.length };
}

function repairCurrentStateSnapshot(source = getState()) {
    const repaired = normalize(clone(source));
    const seenNpcIds = new Set();
    repaired.npcs.forEach(entry => {
        if (seenNpcIds.has(entry.id)) entry.id = uid();
        seenNpcIds.add(entry.id);
        if (entry.mapVisible) {
            const point = npcMapPoint(entry, repaired);
            if (point) {
                entry.mapX = point.x;
                entry.mapY = point.y;
            } else entry.mapVisible = false;
        }
    });
    const friendlyIds = new Set(friendlyNpcs(repaired).map(entry => entry.id));
    if (repaired.social.party) {
        repaired.social.party.memberIds = [...new Set(repaired.social.party.memberIds.filter(id => friendlyIds.has(id)))];
        repaired.social.party.roles = Object.fromEntries(Object.entries(repaired.social.party.roles || {})
            .filter(([id]) => repaired.social.party.memberIds.includes(id)));
    }
    repaired.social.guilds.forEach(guild => {
        guild.memberIds = [...new Set(guild.memberIds.filter(id => friendlyIds.has(id)))];
    });
    const safePlayer = landSafeMapPoint({
        worldId: storyWorldId(repaired), x: repaired.location.mapX, y: repaired.location.mapY,
        location: repaired.location.place, continent: repaired.location.continent,
    });
    if (safePlayer) {
        repaired.location.mapX = safePlayer.x;
        repaired.location.mapY = safePlayer.y;
    }
    synchronizeWorldState(repaired, source);
    repaired.systems.lastRepairAt = new Date().toISOString();
    repaired.systems.repairCount += 1;
    return normalize(repaired);
}

function renderSystems(panel, state) {
    if (!panel) return;
    const report = diagnosticReport(state);
    const audits = [...state.systems.audit].reverse().map(entry => `<details class="tretaresia-audit-entry"><summary><span><b>${html(entry.summary)}</b><small>${html(entry.source)} · ${html(new Date(entry.at).toLocaleString())}</small></span><em>${entry.changes.length}</em></summary><div>${entry.changes.map(change => `<article><code>${html(change.path)}</code><span>${html(change.before)} <i class="fa-solid fa-arrow-right"></i> ${html(change.after)}</span><small>${html(change.reason)} · ${change.confidence}%</small></article>`).join('')}${Number.isInteger(entry.messageId) ? `<aside><button type="button" data-action="rollback-turn" data-id="${entry.messageId}"><i class="fa-solid fa-rotate-left"></i>${html(tr('Rollback latest turn'))}</button><button type="button" data-action="reapply-turn" data-id="${entry.messageId}"><i class="fa-solid fa-rotate-right"></i>Apply again</button></aside>` : ''}</div></details>`).join('');
    const combat = [...state.systems.combatLogs].reverse().slice(0, 30).map(entry => `<details class="tretaresia-combat-log"><summary><span><b>${html(entry.summary)}</b><small>${html(entry.damageType)}${entry.critical ? ' · CRITICAL' : ''}</small></span><strong>-${entry.finalDamage} HP</strong></summary><dl><div><dt>Base</dt><dd>${entry.baseDamage}</dd></div><div><dt>Armor</dt><dd>-${entry.armor}</dd></div><div><dt>Aura Guard</dt><dd>-${entry.auraGuard}</dd></div><div><dt>Resistance</dt><dd>-${entry.resistance}</dd></div><div><dt>Final</dt><dd>${entry.finalDamage}</dd></div></dl></details>`).join('');
    const regional = state.systems.regionalWeather.map(entry => `<article><i class="${weatherIcon(entry.weather)}"></i><span><b>${html(entry.region)}</b><small>${html(entry.weather)}${entry.temperature === null ? '' : ` · ${entry.temperature}°`}${entry.hazard ? ` · ${html(entry.hazard)}` : ''}</small></span></article>`).join('');
    panel.innerHTML = `${heading('System Audit', `${report.score}% · ${report.passed}/${report.total} checks passed`, 'fa-solid fa-microchip')}
        <section class="tretaresia-diagnostic-card"><header><div><span>${html(tr('Diagnostics'))}</span><strong>${report.score}%</strong></div><div class="tretaresia-diagnostic-track"><i style="width:${report.score}%"></i></div></header><div class="tretaresia-diagnostic-grid">${report.checks.map(([name, ok, detail]) => `<article class="${ok ? 'is-ok' : 'is-warning'}"><i class="fa-solid fa-${ok ? 'circle-check' : 'triangle-exclamation'}"></i><span><b>${html(name)}</b><small>${html(detail)}</small></span></article>`).join('')}</div><footer><button class="tretaresia-primary-button" type="button" data-action="repair-state"><i class="fa-solid fa-screwdriver-wrench"></i>${html(tr('Repair current state'))}</button><button class="tretaresia-secondary-button" type="button" data-action="rollback-latest-turn"><i class="fa-solid fa-rotate-left"></i>${html(tr('Rollback latest turn'))}</button><button class="tretaresia-secondary-button" type="button" data-action="reapply-latest-turn"><i class="fa-solid fa-rotate-right"></i>Apply again</button></footer></section>
        <section class="tretaresia-system-section"><div class="tretaresia-section-label"><i class="fa-solid fa-list-check"></i><span>${html(tr('Turn Inspector'))}</span><b>${state.systems.audit.length}</b></div><div class="tretaresia-audit-list">${audits || empty('No journal entries yet.')}</div></section>
        <section class="tretaresia-system-section"><div class="tretaresia-section-label"><i class="fa-solid fa-burst"></i><span>${html(tr('Damage breakdown'))}</span><b>${state.systems.combatLogs.length}</b></div><div class="tretaresia-combat-list">${combat || empty('No journal entries yet.')}</div></section>
        <section class="tretaresia-system-section"><div class="tretaresia-section-label"><i class="fa-solid fa-cloud-sun-rain"></i><span>${html(tr('Regional weather'))}</span><b>${state.systems.regionalWeather.length}</b></div><div class="tretaresia-regional-weather">${regional || empty('No journal entries yet.')}</div></section>`;
}

function renderPanel(id, panel, state) {
    const renderers = {
        status: renderStatus, scene: renderScene, inventory: renderInventory, skills: renderSkillStorage,
        techniques: renderTechniques, quests: renderQuests, rank: renderRank, groups: renderGroups,
        household: renderHousehold, map: renderMap, npcs: renderNpcs, mail: renderMailbox, music: renderMusic, systems: renderSystems,
    };
    capturePanelScroll(id, panel);
    renderers[id]?.(panel, state);
    restorePanelScroll(id, panel);
}

function renderAll(state = getState()) {
    syncTravelTracker(state);
    const overlay = document.getElementById('tretaresia-rpg-overlay');
    if (!overlay?.classList.contains('is-open')) return;
    const panel = overlay.querySelector('[data-panel].is-active')
        || overlay.querySelector(`[data-panel="${TAB_ORDER[activeTabIndex] || 'status'}"]`);
    const id = panel?.dataset.panel;
    if (id) renderPanel(id, panel, state);
    const label = overlay.querySelector('#tretaresia-context-label');
    if (label) label.innerHTML = SillyTavern.getContext().getCurrentChatId?.()
        ? `<i class="fa-solid fa-location-dot"></i> ${html(state.location.region)} · ${html(state.location.place)}`
        : `<i class="fa-solid fa-triangle-exclamation"></i> ${html(tr('Open a chat to activate this system'))}`;
    if (id === 'npcs') void hydrateNpcPortraits(panel, state);
}

function rankInsignia(progression) {
    const label = progression.adventurerRank === 'Custom Rank' && progression.customRankName
        ? progression.customRankName : progression.adventurerRank;
    const tier = Math.max(0, RANKS.indexOf(progression.adventurerRank));
    const bars = RANKS.map((_, index) => '<i' + (index <= tier ? ' class="on"' : '') + '></i>').join('');
    return '<div class="tretaresia-rank-insignia" role="img" aria-label="' + html(tr('Guild rank')) + ': ' + html(label) + ', tier ' + (tier + 1) + ' of ' + RANKS.length + '">' +
        '<span class="tretaresia-rank-bars">' + bars + '</span><small>' + html(tr('Guild rank')) + '</small><b>' + html(label) + '</b>' +
        '<em>' + String(tier + 1).padStart(2, '0') + '<span>/ ' + String(RANKS.length).padStart(2, '0') + '</span></em></div>';
}

function renderStatus(panel, state) {
    if (!panel) return;
    const persona = currentPersonaName(state);
    const expPercent = Math.min(100, Math.round(state.progression.experience / Math.max(1, state.progression.experienceMax) * 100));
    const initial = html((persona || '?').charAt(0).toUpperCase());
    const divineAura = hasDivinePower(state);
    panel.innerHTML = `
        <section class="tretaresia-character-hero"><button class="tretaresia-avatar" type="button" data-action="${state.player.portrait ? 'open-portrait-editor' : 'choose-portrait'}" aria-label="${html(tr(state.player.portrait ? 'Adjust portrait' : 'Choose profile picture'))}">
            <span class="tretaresia-magic-ring ring-one"></span><span class="tretaresia-magic-ring ring-two"></span>
            ${state.player.portrait ? `<span class="tretaresia-avatar-photo"><img src="${html(state.player.portrait)}" alt="${html(persona)} portrait" style="--portrait-desktop-x:${state.player.portraitView.desktop.x}%;--portrait-desktop-y:${state.player.portraitView.desktop.y}%;--portrait-desktop-zoom:${state.player.portraitView.desktop.zoom};--portrait-mobile-x:${state.player.portraitView.mobile.x}%;--portrait-mobile-y:${state.player.portraitView.mobile.y}%;--portrait-mobile-zoom:${state.player.portraitView.mobile.zoom}"></span>` : `<span class="tretaresia-avatar-initial">${initial}</span>`}
            <span class="tretaresia-avatar-edit"><i class="fa-solid ${state.player.portrait ? 'fa-crop-simple' : 'fa-camera'}"></i></span></button>
            <input id="tretaresia-avatar-input" type="file" accept="image/png,image/jpeg,image/webp" hidden>
            <div class="tretaresia-character-copy"><span class="tretaresia-eyebrow">${html(tr('Current persona'))}</span><h3>${html(persona)}</h3>
                <p class="tretaresia-character-title">${html(state.player.title)}</p><div class="tretaresia-identity-chips">
                <span><i class="fa-solid fa-dna"></i>${html(state.player.race)}</span><span><i class="fa-solid fa-shield-halved"></i>${html(state.player.guild)}</span>
                <span><i class="fa-solid fa-briefcase"></i>${html(state.player.profession)}</span><span><i class="fa-solid fa-people-group"></i>${html(state.player.party)}</span></div></div>
            ${rankInsignia(state.progression)}</section>
        <section class="tretaresia-progress-deck"><div class="tretaresia-exp-line"><div class="tretaresia-exp-track"><span style="width:${expPercent}%"></span><i style="left:${expPercent}%"></i></div>
            <p><strong>${state.progression.experience} / ${state.progression.experienceMax} EXP</strong><span>Lv. ${state.player.level} · ${html(state.progression.adventurerRank)} Rank</span></p></div></section>
        <div class="tretaresia-dashboard-grid">
            <article class="tretaresia-card tretaresia-vitals-card"><div class="tretaresia-card-title"><span>${html(tr('Vital status'))}</span>
                <em><i class="fa-solid fa-wave-square"></i> ${html(state.player.condition)}</em></div><div class="tretaresia-vitals-grid">
                ${meterView('Health', state.player.hp, 'fa-solid fa-heart', 'health')}
                ${meterView(divineAura ? 'Divine Mana' : 'Aura / Mana', state.player.mp, 'fa-solid fa-fire-flame-curved', 'mana', { color: state.player.aura.color, infinite: state.player.aura.infinite, divine: divineAura })}
                ${meterView('Stamina', state.player.stamina, 'fa-solid fa-bolt', 'stamina')}
                ${meterView('Hunger', { current: state.player.survival.hunger, max: 100 }, 'fa-solid fa-drumstick-bite', 'hunger')}
                ${meterView('Thirst', { current: state.player.survival.thirst, max: 100 }, 'fa-solid fa-droplet', 'thirst')}</div>
                <div class="tretaresia-fitness-capacity"><span><i class="fa-solid fa-lungs"></i>${html(tr('Lung capacity'))}</span>
                    <strong>${state.player.fitness.lungCapacity.toLocaleString()} <small>CAP</small></strong><em>${state.player.fitness.aerobicSessions.toLocaleString()} ${html(tr('aerobic sessions'))}</em></div></article>
            <article class="tretaresia-card"><div class="tretaresia-card-title"><span>${html(tr('Identity'))}</span>
                <i class="fa-solid fa-feather"></i></div><dl class="tretaresia-fact-list">
                <div><dt>${html(tr('Race'))}</dt><dd>${html(state.player.race)}</dd></div>
                <div><dt>${html(tr('Gender'))}</dt><dd>${html(state.player.gender || 'Unknown')}</dd></div>
                <div><dt>${html(tr('Age'))}</dt><dd>${html(state.player.age || 'Unknown')}</dd></div>
                <div><dt>${html(tr('Home continent'))}</dt><dd>${html(state.player.homeContinent || 'Unknown')}</dd></div>
                <div><dt>${html(tr('Standing'))}</dt><dd>${html(state.player.standing || 'Unknown')}</dd></div>
                <div><dt>${html(tr('Affiliation'))}</dt><dd>${html(state.player.affiliation || 'Unaffiliated')}</dd></div>
                <div><dt>${html(tr('Hair'))}</dt><dd>${html(state.player.appearance.hair || 'Unknown')}</dd></div>
                <div><dt>${html(tr('Eyes'))}</dt><dd>${html(state.player.appearance.eyes || 'Unknown')}</dd></div>
                <div><dt>${html(tr('Height'))}</dt><dd>${html(state.player.appearance.height || 'Unknown')}</dd></div>
                <div><dt>${html(tr('Build'))}</dt><dd>${html(state.player.appearance.build || 'Unknown')}</dd></div>
                <div><dt>${html(tr('Guild'))}</dt><dd>${html(state.player.guild)}</dd></div>
                <div><dt>${html(tr('Party'))}</dt><dd>${html(state.player.party)}</dd></div>
                <div><dt>${html(tr('Profession'))}</dt><dd>${html(state.player.profession)}</dd></div>
                <div><dt>${html(tr('Power type'))}</dt><dd>${html(state.player.powerType)}</dd></div>
                <div><dt>${html(tr('Aura color'))}</dt><dd><span class="tretaresia-aura-swatch" style="--aura-color:${html(state.player.aura.color)}"></span>${html(state.player.aura.color)}${state.player.aura.infinite ? ` · ${html(tr('Boundless'))}` : ''}</dd></div>
                <div><dt>${html(tr('Origin skill'))}</dt><dd>${html(state.player.originSkill)}</dd></div>
                <div><dt>${html(tr('Condition'))}</dt><dd>${html(state.player.condition)}</dd></div>
                <div><dt>${html(tr('Level'))}</dt><dd>${state.player.level}</dd></div></dl></article>
        </div>
        <section class="tretaresia-aura-control-card"><div class="tretaresia-section-label"><i class="fa-solid fa-wave-square"></i><span>Aura / Mana Control</span></div><div class="tretaresia-aura-control-grid">
            ${[['output', 'Output'], ['control', 'Control'], ['efficiency', 'Efficiency'], ['recovery', 'Recovery']].map(([key, label]) => `<article><span>${label}</span><strong>${state.player.aura[key]}%</strong><div><i style="width:${state.player.aura[key]}%"></i></div></article>`).join('')}</div>
            <small><i class="fa-solid fa-circle-info"></i>Efficiency reduces Mana cost; Recovery increases rest recovery. Output and Control progress through confirmed use or training.</small></section>
        <section class="tretaresia-effects-card"><div class="tretaresia-section-label"><i class="fa-solid fa-heart-pulse"></i><span>${html(tr('Active effects'))}</span><b>${state.systems.effects.length}</b></div><div>${state.systems.effects.length ? state.systems.effects.map(effect => `<article data-severity="${html(effect.severity.toLocaleLowerCase())}"><i class="fa-solid fa-triangle-exclamation"></i><span><b>${html(effect.name)}</b><small>${html(effect.severity)} · ${html(effect.type)}${effect.remainingTurns === null ? '' : ` · ${effect.remainingTurns} turn(s)`}</small><em>${html(effect.treatment || effect.source || 'No treatment recorded')}</em></span></article>`).join('') : `<p class="tretaresia-no-effects"><i class="fa-solid fa-shield-heart"></i>No active injuries or status effects</p>`}</div></section>
        <details class="tretaresia-editor"><summary><i class="fa-solid fa-pen"></i> ${html(tr('Edit status'))}</summary>
            <form data-form="status" class="tretaresia-form-grid">
                ${input('Name', 'name', state.player.name)}${input('Title', 'title', state.player.title)}
                ${input('Race', 'race', state.player.race)}${input('Age', 'age', state.player.age)}
                ${input('Gender', 'gender', state.player.gender)}${input('Home continent', 'homeContinent', state.player.homeContinent)}
                ${input('Standing', 'standing', state.player.standing)}${input('Affiliation', 'affiliation', state.player.affiliation)}
                ${input('Hair', 'hair', state.player.appearance.hair)}${input('Eyes', 'eyes', state.player.appearance.eyes)}
                ${input('Height', 'height', state.player.appearance.height)}${input('Build', 'build', state.player.appearance.build)}
                ${input('Profession', 'profession', state.player.profession)}${input('Guild', 'guild', state.player.guild)}${input('Party', 'party', state.player.party)}
                ${input('Power type', 'powerType', state.player.powerType)}${input('Origin skill', 'originSkill', state.player.originSkill)}
                ${input('Condition', 'condition', state.player.condition)}${input('Level', 'level', state.player.level, 'number', 'min="1"')}
                ${input('HP', 'hpCurrent', state.player.hp.current, 'number', 'min="0"')}${input('HP max', 'hpMax', state.player.hp.max, 'number', 'min="1"')}
                ${input('MP', 'mpCurrent', state.player.mp.current, 'number', 'min="0"')}${input('MP max', 'mpMax', state.player.mp.max, 'number', 'min="1"')}
                ${input('Stamina', 'staminaCurrent', state.player.stamina.current, 'number', 'min="0"')}${input('Stamina max', 'staminaMax', state.player.stamina.max, 'number', 'min="1"')}
                ${input('Hunger', 'hunger', state.player.survival.hunger, 'number', 'min="0" max="100"')}${input('Thirst', 'thirst', state.player.survival.thirst, 'number', 'min="0" max="100"')}
                ${input('Aura color', 'auraColor', state.player.aura.color, 'color')}
                ${input('Aura output', 'auraOutput', state.player.aura.output, 'number', 'min="0" max="100"')}${input('Aura control', 'auraControl', state.player.aura.control, 'number', 'min="0" max="100"')}
                ${input('Aura efficiency', 'auraEfficiency', state.player.aura.efficiency, 'number', 'min="0" max="100"')}${input('Aura recovery', 'auraRecovery', state.player.aura.recovery, 'number', 'min="0" max="100"')}
                ${input('Lung capacity', 'lungCapacity', state.player.fitness.lungCapacity, 'number', 'min="1"')}
                <button class="tretaresia-primary-button tretaresia-form-submit" type="submit">${html(tr('Save status'))}</button>
            </form></details>`;
}

function weatherIcon(condition) {
    const value = String(condition || '').toLocaleLowerCase();
    if (!value || value === 'unknown') return 'fa-solid fa-circle-question';
    if (/storm|thunder/.test(value)) return 'fa-solid fa-cloud-bolt';
    if (/rain|drizzle/.test(value)) return 'fa-solid fa-cloud-rain';
    if (/snow|blizzard/.test(value)) return 'fa-solid fa-snowflake';
    if (/fog|mist|haze/.test(value)) return 'fa-solid fa-smog';
    if (/cloud|overcast/.test(value)) return 'fa-solid fa-cloud';
    if (/night|moon/.test(value)) return 'fa-solid fa-moon';
    return 'fa-solid fa-sun';
}

function activeSceneStructure(state) {
    const map = state.sceneMap.maps.find(entry => entry.id === state.sceneMap.activeMapId);
    const floor = map?.floors.find(entry => entry.id === state.sceneMap.activeFloorId);
    return { map, floor };
}

function sceneMapHiddenFields(mapId = '', floorId = '', roomId = '') {
    return `<input type="hidden" name="mapId" value="${html(mapId)}"><input type="hidden" name="floorId" value="${html(floorId)}">
        ${roomId ? `<input type="hidden" name="roomId" value="${html(roomId)}">` : ''}`;
}

function sceneRoomFields(room = {}, { editing = false } = {}) {
    const source = { name: '', type: 'Room', x: 4, y: 4, width: 24, height: 18, discovered: true, locked: false, ...room };
    return `${input('Room name', 'name', source.name)}${select('Room type', 'type', ROOM_TYPES, source.type)}
        ${input('X position', 'x', source.x, 'number', 'min="0" max="92" step="0.5"')}${input('Y position', 'y', source.y, 'number', 'min="0" max="63" step="0.5"')}
        ${input('Width', 'width', source.width, 'number', 'min="8" max="70" step="0.5"')}${input('Height', 'height', source.height, 'number', 'min="7" max="50" step="0.5"')}
        <label class="tretaresia-check-field"><input type="checkbox" name="discovered"${source.discovered ? ' checked' : ''}><span>${html(tr('Discovered'))}</span></label>
        <label class="tretaresia-check-field"><input type="checkbox" name="locked"${source.locked ? ' checked' : ''}><span>${html(tr('Locked'))}</span></label>
        <button class="tretaresia-primary-button tretaresia-form-submit" type="submit">${html(tr(editing ? 'Save room' : 'Add room'))}</button>`;
}

function renderLocalStructure(state) {
    const { map, floor } = activeSceneStructure(state);
    const createForm = `<details class="tretaresia-editor${map ? '' : ' tretaresia-map-first-editor'}"${map ? '' : ' open'}><summary><i class="fa-solid fa-plus"></i> ${html(tr('Create structure map'))}</summary>
        <form data-form="scene-map" class="tretaresia-form-grid">${input('Map name', 'name', state.location.place === 'Unknown' ? '' : state.location.place)}
            ${input('Associated place', 'place', state.location.place)}${input('First floor', 'floorName', '1F')}${input('Floor', 'level', 1, 'number', 'min="-20" max="200"')}
            <button class="tretaresia-primary-button tretaresia-form-submit" type="submit">${html(tr('Create structure map'))}</button></form></details>`;
    if (!map || !floor) {
        return `<section class="tretaresia-local-map"><header><div><span>${html(tr('Local Structure Map'))}</span><small>${html(tr('AI-assisted SVG floor plan'))}</small></div></header>
            ${empty('No structure map yet.')}${createForm}</section>`;
    }

    const roomById = new Map(floor.rooms.map(entry => [entry.id, entry]));
    const connections = floor.connections.map(entry => {
        const from = roomById.get(entry.from);
        const to = roomById.get(entry.to);
        if (!from || !to) return '';
        const x1 = from.x + from.width / 2;
        const y1 = from.y + from.height / 2;
        const x2 = to.x + to.width / 2;
        const y2 = to.y + to.height / 2;
        return `<g class="tretaresia-floor-connection${entry.locked ? ' is-locked' : ''}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"></line>
            <circle cx="${(x1 + x2) / 2}" cy="${(y1 + y2) / 2}" r="1.25"></circle><title>${html(entry.type)}</title></g>`;
    }).join('');
    const rooms = floor.rooms.map(entry => {
        const current = entry.id === state.sceneMap.playerRoomId;
        const label = entry.discovered ? entry.name : tr('Unexplored');
        return `<g class="tretaresia-floor-room${current ? ' is-current' : ''}${entry.discovered ? '' : ' is-hidden'}${entry.locked ? ' is-locked' : ''}" data-scene-room="${html(entry.id)}">
            <rect x="${entry.x}" y="${entry.y}" width="${entry.width}" height="${entry.height}" rx="1.4"></rect>
            <text x="${entry.x + entry.width / 2}" y="${entry.y + entry.height / 2 - .8}" text-anchor="middle">${html(label.slice(0, 22))}</text>
            <text class="tretaresia-room-type" x="${entry.x + entry.width / 2}" y="${entry.y + entry.height / 2 + 3.2}" text-anchor="middle">${html(entry.discovered ? tr(entry.type) : '?')}</text>
            ${current ? `<circle class="tretaresia-player-pulse" cx="${entry.x + entry.width / 2}" cy="${entry.y + 3.2}" r="1.8"></circle>` : ''}</g>`;
    }).join('');
    const roomOptions = floor.rooms.filter(entry => entry.discovered).map(entry => `<option value="${html(entry.id)}"${entry.id === state.sceneMap.playerRoomId ? ' selected' : ''}>${html(entry.name)}</option>`).join('');
    const connectionOptions = floor.rooms.map(entry => `<option value="${html(entry.id)}">${html(entry.name)}</option>`).join('');

    return `<section class="tretaresia-local-map${map.locked ? ' is-locked' : ''}">
        <header><div><span>${html(tr('Local Structure Map'))}</span><strong>${html(map.name)}</strong><small>${html(map.place || state.location.place)} · ${floor.rooms.length} ${html(tr('Rooms').toLowerCase())}</small></div>
            <label class="tretaresia-map-picker"><span>${html(tr('Map name'))}</span><select id="tretaresia-scene-map-picker">${state.sceneMap.maps.map(entry => `<option value="${html(entry.id)}"${entry.id === map.id ? ' selected' : ''}>${html(entry.name)}</option>`).join('')}</select></label>
            <button type="button" class="tretaresia-map-lock" data-action="toggle-scene-map-lock" data-id="${html(map.id)}"><i class="fa-solid fa-${map.locked ? 'lock' : 'lock-open'}"></i><span>${html(tr(map.locked ? 'Map locked' : 'AI updates enabled'))}</span></button></header>
        <nav class="tretaresia-floor-tabs" aria-label="${html(tr('Floor'))}">${map.floors.map(entry => `<button type="button" data-action="select-scene-floor" data-id="${html(entry.id)}" data-map-id="${html(map.id)}" class="${entry.id === floor.id ? 'is-active' : ''}">${html(entry.name)}</button>`).join('')}</nav>
        <div class="tretaresia-floor-canvas"><svg class="tretaresia-floor-svg" viewBox="0 0 100 70" preserveAspectRatio="none" role="img" aria-label="${html(`${map.name} ${floor.name}`)}">
            <defs><pattern id="tretaresia-floor-grid" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M 5 0 L 0 0 0 5"></path></pattern></defs>
            <rect class="tretaresia-floor-grid" width="100" height="70"></rect>${connections}${rooms}</svg>
            <div class="tretaresia-floor-caption"><span><i class="fa-solid fa-location-crosshairs"></i>${html(roomById.get(state.sceneMap.playerRoomId)?.name || tr('Current room'))}</span>
                <small>${html(tr(map.locked ? 'Map locked' : 'Drag unlocked rooms to reposition them.'))}</small></div></div>
        <details class="tretaresia-editor tretaresia-floor-editor"><summary><i class="fa-solid fa-pen-ruler"></i> ${html(tr('Edit floor plan'))}</summary>
            <div class="tretaresia-map-editor-actions"><button type="button" data-action="toggle-scene-map-lock" data-id="${html(map.id)}"><i class="fa-solid fa-${map.locked ? 'lock-open' : 'lock'}"></i>${html(tr(map.locked ? 'Unlock map' : 'Lock map'))}</button>
                <button type="button" data-action="delete-scene-floor" data-id="${html(floor.id)}" data-map-id="${html(map.id)}"><i class="fa-solid fa-layer-group"></i>${html(tr('Delete floor'))}</button>
                <button type="button" data-action="delete-scene-map" data-id="${html(map.id)}"><i class="fa-solid fa-trash"></i>${html(tr('Delete map'))}</button></div>
            ${roomOptions ? `<form data-form="scene-position" class="tretaresia-form-grid tretaresia-map-compact-form">${sceneMapHiddenFields(map.id, floor.id)}
                <label class="tretaresia-field"><span>${html(tr('Current room'))}</span><select name="roomId">${roomOptions}</select></label>
                <button class="tretaresia-primary-button tretaresia-form-submit" type="submit">${html(tr('Set current room'))}</button></form>` : ''}
            <div class="tretaresia-map-editor-grid">
                <details><summary><i class="fa-solid fa-layer-group"></i>${html(tr('Add floor'))}</summary><form data-form="scene-floor" class="tretaresia-form-grid">${sceneMapHiddenFields(map.id)}
                    ${input('Floor name', 'name', `${map.floors.length + 1}F`)}${input('Floor', 'level', map.floors.length + 1, 'number', 'min="-20" max="200"')}
                    <button class="tretaresia-primary-button tretaresia-form-submit" type="submit">${html(tr('Add floor'))}</button></form></details>
                <details><summary><i class="fa-solid fa-vector-square"></i>${html(tr('Add room'))}</summary><form data-form="scene-room" class="tretaresia-form-grid">${sceneMapHiddenFields(map.id, floor.id)}${sceneRoomFields()}</form></details>
                ${floor.rooms.length >= 2 ? `<details><summary><i class="fa-solid fa-door-open"></i>${html(tr('Add connection'))}</summary><form data-form="scene-connection" class="tretaresia-form-grid">${sceneMapHiddenFields(map.id, floor.id)}
                    <label class="tretaresia-field"><span>${html(tr('From room'))}</span><select name="from">${connectionOptions}</select></label>
                    <label class="tretaresia-field"><span>${html(tr('To room'))}</span><select name="to">${connectionOptions}</select></label>${select('Connection type', 'type', CONNECTION_TYPES, 'Door')}
                    <button class="tretaresia-primary-button tretaresia-form-submit" type="submit">${html(tr('Add connection'))}</button></form></details>` : ''}
                ${createForm}
            </div>
            <div class="tretaresia-room-editor-list">${floor.rooms.map(entry => `<details><summary><span><i class="fa-solid fa-${entry.locked ? 'lock' : 'vector-square'}"></i>${html(entry.name)}</span><small>${html(tr(entry.type))}</small></summary>
                <form data-form="scene-room" class="tretaresia-form-grid">${sceneMapHiddenFields(map.id, floor.id, entry.id)}${sceneRoomFields(entry, { editing: true })}</form>
                <button type="button" class="tretaresia-map-delete-row" data-action="delete-scene-room" data-id="${html(entry.id)}" data-map-id="${html(map.id)}" data-floor-id="${html(floor.id)}"><i class="fa-solid fa-trash"></i>${html(tr('Delete room'))}</button></details>`).join('')}</div>
            <div class="tretaresia-connection-list">${floor.connections.map(entry => `<span><i class="fa-solid fa-door-open"></i>${html(roomById.get(entry.from)?.name || '?')} → ${html(roomById.get(entry.to)?.name || '?')}<small>${html(tr(entry.type))}</small>
                <button type="button" data-action="delete-scene-connection" data-id="${html(entry.id)}" data-map-id="${html(map.id)}" data-floor-id="${html(floor.id)}"><i class="fa-solid fa-xmark"></i></button></span>`).join('')}</div>
        </details></section>`;
}

function setupSceneMapInteractions(panel, state) {
    const svg = panel.querySelector('.tretaresia-floor-svg');
    const { map, floor } = activeSceneStructure(state);
    if (!(svg instanceof SVGElement) || !map || !floor || map.locked) return;
    svg.querySelectorAll('[data-scene-room]').forEach(group => {
        const room = floor.rooms.find(entry => entry.id === group.dataset.sceneRoom);
        if (!room || room.locked) return;
        group.classList.add('is-draggable');
        group.addEventListener('pointerdown', event => {
            event.preventDefault();
            group.setPointerCapture?.(event.pointerId);
            const bounds = svg.getBoundingClientRect();
            const start = { x: event.clientX, y: event.clientY };
            let nextX = room.x;
            let nextY = room.y;
            const move = moveEvent => {
                nextX = Math.min(100 - room.width, Math.max(0, room.x + (moveEvent.clientX - start.x) / Math.max(1, bounds.width) * 100));
                nextY = Math.min(70 - room.height, Math.max(0, room.y + (moveEvent.clientY - start.y) / Math.max(1, bounds.height) * 70));
                group.setAttribute('transform', `translate(${nextX - room.x} ${nextY - room.y})`);
            };
            const end = async endEvent => {
                group.removeEventListener('pointermove', move);
                group.removeEventListener('pointerup', end);
                group.removeEventListener('pointercancel', end);
                group.releasePointerCapture?.(endEvent.pointerId);
                const nextState = clone(getState());
                const nextMap = nextState.sceneMap.maps.find(entry => entry.id === map.id);
                const nextFloor = nextMap?.floors.find(entry => entry.id === floor.id);
                const nextRoom = nextFloor?.rooms.find(entry => entry.id === room.id);
                if (!nextRoom || nextMap.locked || nextRoom.locked) return renderAll(nextState);
                nextRoom.x = Math.round(nextX * 10) / 10;
                nextRoom.y = Math.round(nextY * 10) / 10;
                await persistState(nextState, 'scene-map-drag');
            };
            group.addEventListener('pointermove', move);
            group.addEventListener('pointerup', end);
            group.addEventListener('pointercancel', end);
        });
    });
}

function renderJourneyLogs(state) {
    const entries = [...state.journeyLogs].reverse();
    return `<details class="tretaresia-card tretaresia-journey-logs tretaresia-log-disclosure">
        <summary><span><i class="fa-solid fa-book-open"></i><b>${html(tr('Journey Logs'))}</b><small>${html(tr('Story milestones'))}</small></span><em>${entries.length}</em><i class="fa-solid fa-chevron-down"></i></summary>
        <div class="tretaresia-log-body"><details class="tretaresia-journey-add"><summary><i class="fa-solid fa-plus"></i> ${html(tr('Add journey log'))}</summary>
                <form data-form="journey-log-add">${textareaField('What happened', 'text', '', 3, 'maxlength="500" required')}
                    <button class="tretaresia-primary-button" type="submit">${html(tr('Save log'))}</button></form></details>
        <div class="tretaresia-journey-list">${entries.length ? entries.map(entry => `
            <article class="tretaresia-journey-entry"><div class="tretaresia-journey-mark"><i class="fa-solid fa-diamond"></i></div>
                <div class="tretaresia-journey-copy"><small>${html(entry.day || '')}${entry.place ? ` · ${html(entry.place)}` : ''}${entry.at ? ` · ${html(formatDate(entry.at))}` : ''}</small><p>${html(entry.text)}</p></div>
                <div class="tretaresia-journey-actions"><details><summary title="${html(tr('Edit log'))}"><i class="fa-solid fa-pen"></i></summary>
                    <form data-form="journey-log-edit"><input type="hidden" name="id" value="${html(entry.id)}">
                        ${textareaField('What happened', 'text', entry.text, 3, 'maxlength="500" required')}
                        <button class="tretaresia-primary-button" type="submit">${html(tr('Save log'))}</button></form></details>
                    <button type="button" data-action="delete-journey-log" data-id="${html(entry.id)}" title="${html(tr('Delete log'))}"><i class="fa-solid fa-trash"></i></button></div>
            </article>`).join('') : `<p class="tretaresia-journey-empty">${html(tr('No journey logs yet.'))}</p>`}</div></div>
    </details>`;
}

function renderScene(panel, state) {
    if (!panel) return;
    const phaseIndex = Math.max(0, DAY_PHASES.indexOf(state.worldClock.phase));
    const moving = ['Preparing', 'Traveling', 'Delayed'].includes(state.travel.status);
    const journeyProgress = travelProgress(state);
    const routePoints = state.travel.routePoints?.length >= 2 ? state.travel.routePoints : buildTravelRoutePoints(state, state.travel);
    const coordinate = coordinatesLabel(state.location.mapX, state.location.mapY);
    const locationDetail = state.location.detail || state.location.place || state.location.region;
    const exactLocation = locationDetail.includes(coordinate) ? locationDetail : `${locationDetail} · ${coordinate}`;
    const temperature = state.scene.temperature === null ? '—' : `${Number(state.scene.temperature).toLocaleString()}°C`;
    panel.innerHTML = `${heading('Scene Tracker', 'Live environment and position', 'fa-solid fa-cloud-sun')}
        <section class="tretaresia-scene-hero">
            <div class="tretaresia-scene-time"><span>${html(state.worldClock.dayName)}</span><strong>${html(state.worldClock.time)}</strong><small>${html(tr(state.worldClock.phase))} · ${html(tr('Day counter'))} ${state.worldClock.day}</small></div>
            <div class="tretaresia-scene-weather"><i class="${weatherIcon(state.scene.weather)}"></i><div><span>${html(tr('Weather'))}</span><strong>${html(state.scene.weather)}</strong></div>
                <output>${temperature}</output></div>
        </section>
        <section class="tretaresia-day-cycle tretaresia-scene-cycle" style="--phase:${phaseIndex}"><div class="tretaresia-cycle-line"><span></span></div>
            ${DAY_PHASES.map((phase, index) => `<div class="tretaresia-cycle-stop${index === phaseIndex ? ' is-current' : ''}"><i class="${['fa-solid fa-sun','fa-regular fa-sun','fa-solid fa-cloud-sun','fa-solid fa-moon'][index]}"></i><span>${html(tr(phase))}</span></div>`).join('')}</section>
        <section class="tretaresia-scene-grid">
            <article><i class="fa-solid fa-earth-americas"></i><span>${html(tr('Current region'))}</span><strong>${html(state.location.continent)}</strong><small>${html(state.location.region)}</small></article>
            <article><i class="fa-solid fa-location-dot"></i><span>${html(tr('Current place'))}</span><strong>${html(moving ? `En route to ${state.travel.destinationPlace || state.travel.destination}` : state.location.place)}</strong><small>${html(exactLocation)}</small></article>
            <article><i class="fa-solid fa-street-view"></i><span>${html(tr('Scene position'))}</span><strong>${html(state.scene.position)}</strong><small>${html(tr(state.location.zoneType))}</small></article>
        </section>
        ${state.travel.status !== 'Idle' ? `<section class="tretaresia-card tretaresia-travel-status" data-status="${html(state.travel.status.toLowerCase())}">
            <div class="tretaresia-card-title"><span>${html(tr('Journey'))}</span><em><i class="fa-solid fa-route"></i> ${html(state.travel.status)}</em></div>
            <dl class="tretaresia-fact-list"><div><dt>${html(tr('Origin'))}</dt><dd>${html(state.travel.origin || 'Unknown')}</dd></div>
            <div><dt>${html(tr('Destination'))}</dt><dd>${html(state.travel.destination || 'Unknown')}</dd></div>
            <div><dt>${html(tr('Travel route'))}</dt><dd>${html(state.travel.route)}</dd></div>
            <div><dt>${html(tr('Remaining travel'))}</dt><dd>${formatTravelDays(state.travel.remainingDays)} / ${formatTravelDays(state.travel.totalDays)} ${html(tr('days'))}</dd></div>
            <div><dt>${html(tr('Current'))}</dt><dd>${Math.round(journeyProgress * 100)}% · ${coordinatesLabel(state.location.mapX, state.location.mapY)}</dd></div></dl>
            <div class="tretaresia-travel-progress" style="--journey-progress:${Math.round(journeyProgress * 100)}%"><span></span><b>${Math.round(journeyProgress * 100)}%</b></div>
            ${routePoints.length > 2 ? `<div class="tretaresia-route-checkpoints">${routePoints.map((point, index) => `<span class="${index / (routePoints.length - 1) <= journeyProgress ? 'is-passed' : ''}" title="${html(point.name || point.region || coordinatesLabel(point.x, point.y))}"><i></i><b>${index === 0 ? 'START' : index === routePoints.length - 1 ? 'END' : `CP ${index}`}</b></span>`).join('')}</div>` : ''}
            ${state.travel.notes ? `<p>${html(state.travel.notes)}</p>` : ''}</section>` : ''}
        ${renderJourneyLogs(state)}
        ${renderLocalStructure(state)}
        <details class="tretaresia-editor"><summary><i class="fa-solid fa-pen"></i> ${html(tr('Save scene'))}</summary>
            <form data-form="scene" class="tretaresia-form-grid">
                ${input('Day name', 'dayName', state.worldClock.dayName)}${input('Day counter', 'day', state.worldClock.day, 'number', 'min="1"')}
                ${input('World time', 'time', state.worldClock.time, 'time')}${select('Day phase', 'phase', DAY_PHASES, state.worldClock.phase)}
                ${input('Continent', 'continent', state.location.continent)}${input('Current region', 'region', state.location.region)}
                ${input('Current place', 'place', state.location.place)}${input('Current location detail', 'detail', state.location.detail)}
                ${input('World map X', 'mapX', state.location.mapX, 'number', `min="0" max="${WORLD_MAP_WIDTH}" step="1"`)}${input('World map Y', 'mapY', state.location.mapY, 'number', `min="0" max="${WORLD_MAP_HEIGHT}" step="1"`)}
                ${input('Compass heading', 'heading', state.location.heading, 'number', 'min="0" max="359" step="1"')}
                ${input('Scene position', 'position', state.scene.position)}${select('Zone type', 'zoneType', ZONE_TYPES, state.location.zoneType)}
                ${input('Weather', 'weather', state.scene.weather)}${input('Temperature', 'temperature', state.scene.temperature, 'number', 'min="-1000" max="1000" step="0.1"')}
                <button class="tretaresia-primary-button tretaresia-form-submit" type="submit">${html(tr('Save scene'))}</button>
            </form></details>`;
    setupSceneMapInteractions(panel, state);
}

function portraitPreview(label, mode, frame, portrait) {
    return `<section class="tretaresia-portrait-device ${mode}"><span>${html(tr(label))}</span><div class="tretaresia-portrait-preview">
        <img src="${html(portrait)}" alt="" style="--preview-x:${frame.x}%;--preview-y:${frame.y}%;--preview-zoom:${frame.zoom}"></div>
        <label><span>${html(tr('Horizontal'))}<output>${Math.round(frame.x)}%</output></span><input type="range" name="${mode}X" data-portrait-control="x" data-portrait-mode="${mode}" min="0" max="100" value="${frame.x}"></label>
        <label><span>${html(tr('Vertical'))}<output>${Math.round(frame.y)}%</output></span><input type="range" name="${mode}Y" data-portrait-control="y" data-portrait-mode="${mode}" min="0" max="100" value="${frame.y}"></label>
        <label><span>${html(tr('Zoom'))}<output>${Number(frame.zoom).toFixed(2)}×</output></span><input type="range" name="${mode}Zoom" data-portrait-control="zoom" data-portrait-mode="${mode}" min="1" max="3" step="0.05" value="${frame.zoom}"></label></section>`;
}

function openPortraitEditor() {
    const state = getState();
    const modal = document.getElementById('tretaresia-portrait-editor');
    if (!modal || !state.player.portrait) {
        document.getElementById('tretaresia-avatar-input')?.click();
        return;
    }
    const frame = state.player.portraitView;
    modal.hidden = false;
    modal.innerHTML = `<button class="tretaresia-submodal-backdrop" type="button" data-action="close-portrait-editor" aria-label="${html(tr('Close'))}"></button>
        <article class="tretaresia-portrait-editor-card"><header><div><span>${html(tr('Choose profile picture'))}</span><h3>${html(tr('Adjust portrait'))}</h3></div>
            <button type="button" data-action="close-portrait-editor"><i class="fa-solid fa-xmark"></i></button></header>
            <form data-form="portrait-frame"><div class="tretaresia-portrait-previews">${portraitPreview('Desktop framing', 'desktop', frame.desktop, state.player.portrait)}
                ${portraitPreview('Phone framing', 'mobile', frame.mobile, state.player.portrait)}</div>
                <footer><button type="button" class="tretaresia-secondary-button" data-action="choose-portrait"><i class="fa-solid fa-image"></i>${html(tr('Choose profile picture'))}</button>
                    <button class="tretaresia-primary-button" type="submit"><i class="fa-solid fa-crop-simple"></i>${html(tr('Save framing'))}</button></footer></form></article>`;
}

function closePortraitEditor() {
    const modal = document.getElementById('tretaresia-portrait-editor');
    if (modal) {
        modal.hidden = true;
        modal.innerHTML = '';
    }
    if (npcEditorObjectUrl) URL.revokeObjectURL(npcEditorObjectUrl);
    npcEditorObjectUrl = '';
}

function renderInventoryLogs(state) {
    const entries = [...state.inventoryLogs].reverse();
    return `<details class="tretaresia-card tretaresia-log-disclosure tretaresia-inventory-logs"><summary><span><i class="fa-solid fa-boxes-stacked"></i><b>${html(tr('Inventory Logs'))}</b><small>${html(tr('Item changes'))}</small></span><em>${entries.length}</em><i class="fa-solid fa-chevron-down"></i></summary>
        <div class="tretaresia-log-body tretaresia-compact-log">${entries.length ? entries.map(entry => `<article><i class="fa-solid fa-${entry.delta > 0 ? 'plus' : 'minus'}"></i><span><strong>${html(entry.name)}</strong><small>${html(entry.reason)} · ${html(formatDate(entry.at))}</small></span><b>${entry.delta > 0 ? '+' : ''}${entry.delta}</b></article>`).join('') : `<p>${html(tr('No inventory changes recorded yet.'))}</p>`}</div></details>`;
}

function renderJournal(state) {
    const entries = [...state.journal].reverse();
    return `<details class="tretaresia-card tretaresia-log-disclosure tretaresia-journal-log"><summary><span><i class="fa-solid fa-book"></i><b>${html(tr('Journal'))}</b><small>${html(tr('System history'))}</small></span><em>${entries.length}</em><i class="fa-solid fa-chevron-down"></i></summary>
        <div class="tretaresia-log-body tretaresia-compact-log">${entries.length ? entries.map(entry => `<article><i class="fa-solid fa-feather-pointed"></i><span><strong>${html(entry.text || entry.summary || tr('State updated'))}</strong><small>${html(formatDate(entry.at))}</small></span></article>`).join('') : `<p>${html(tr('No journal entries yet.'))}</p>`}</div></details>`;
}

function renderInventory(panel, state) {
    if (!panel) return;
    panel.innerHTML = `${heading('Inventory', `${state.inventory.length} item types`, 'fa-solid fa-box-open')}
        <div class="tretaresia-item-grid">${state.inventory.length ? state.inventory.map(entry => `
            <article class="tretaresia-list-card"><div class="tretaresia-item-icon"><i class="fa-solid fa-cube"></i></div>
                <div class="tretaresia-item-copy"><strong>${html(entry.name)}</strong><span>${html(entry.category)} · ×${entry.quantity}</span>
                <p>${html(entry.description || tr('No description'))}</p></div><div class="tretaresia-card-actions">
                <button type="button" data-action="delete-item" data-id="${html(entry.id)}" title="${html(tr('Remove'))}"><i class="fa-solid fa-trash"></i></button></div></article>`).join('') : empty('Your inventory is empty.')}</div>
        <details class="tretaresia-editor"><summary><i class="fa-solid fa-plus"></i> ${html(tr('Add inventory item'))}</summary>
            <form data-form="inventory" class="tretaresia-form-grid">${input('Item name', 'name', '')}
                ${input('Quantity', 'quantity', 1, 'number', 'min="0"')}${input('Category', 'category', 'Other')}
                ${input('Description', 'description', '')}<button class="tretaresia-primary-button tretaresia-form-submit" type="submit">${html(tr('Add item'))}</button>
            </form></details>${renderInventoryLogs(state)}${renderJournal(state)}`;
}

function proficiencyRank(value) {
    const score = number(value, 0, 0, 100);
    if (score <= 0) return 'Dormant';
    if (score < 20) return 'Initiate';
    if (score < 40) return 'Practiced';
    if (score < 60) return 'Adept';
    if (score < 75) return 'Expert';
    if (score < 87) return 'Master';
    if (score < 97) return 'Grandmaster';
    return 'Mythic';
}

function renderSkillStorage(panel, state) {
    if (!panel) return;
    const rpgKeys = new Set(state.skills.map(entry => entry.name.toLocaleLowerCase()));
    const linkedSkills = characterLifeSkillsForOwner(currentPersonaName(state))
        .filter(entry => text(entry?.name) && !rpgKeys.has(text(entry.name).toLocaleLowerCase()));
    const total = state.skills.length + linkedSkills.length;
    const localCards = state.skills.map(entry => `<article class="tretaresia-skill-card">
        <div class="tretaresia-skill-rank"><strong>${html(tr(entry.rank))}</strong><small>${html(tr('Proficiency rank'))}</small></div>
        <div><span>${html(entry.type)}</span><h4>${html(entry.name)}</h4><p>${html(entry.description || tr('No description'))}</p></div>
        <button type="button" data-action="delete-skill" data-id="${html(entry.id)}" title="${html(tr('Remove'))}"><i class="fa-solid fa-trash"></i></button></article>`).join('');
    const linkedCards = linkedSkills.map(entry => `<article class="tretaresia-skill-card is-character-life-linked">
        <div class="tretaresia-skill-rank"><strong>${html(entry.rank || 'Unranked')}</strong><small>Character Life</small></div>
        <div><span>${html(entry.category || 'General')}</span><h4>${html(entry.name)}</h4><p>${html(entry.description || tr('No description'))}</p></div>
        <i class="fa-solid fa-link" title="Character Life Skill Storage"></i></article>`).join('');
    panel.innerHTML = `${heading('Skill Storage', `${total} ${tr('Skills').toLowerCase()}`, 'fa-solid fa-layer-group')}
        <section class="tretaresia-skill-storage"><div class="tretaresia-section-label"><i class="fa-solid fa-box-archive"></i><span>${html(tr('All acquired user skills'))}</span></div>
            <div class="tretaresia-skill-storage-grid">${total ? localCards + linkedCards : empty('Skills learned during role-play will appear here.')}</div>
            <details class="tretaresia-editor"><summary><i class="fa-solid fa-plus"></i> ${html(tr('Add skill'))}</summary>
                <form data-form="skill" class="tretaresia-form-grid">${input('Skill name', 'name', '')}${input('Type', 'type', 'General')}
                    ${select('Proficiency rank', 'rank', MASTERY, 'Beginner')}${input('Description', 'description', '')}
                    <button class="tretaresia-primary-button tretaresia-form-submit" type="submit">${html(tr('Add skill'))}</button></form></details></section>`;
}

function proficiencyCard(entry, group, value, custom = false) {
    const score = number(value, 0, 0, 100);
    const rank = proficiencyRank(score);
    return `<article class="tretaresia-proficiency-card${custom ? ' is-custom' : ''}" style="--discipline-tone:${entry.tone || 'var(--tretaresia-accent)'};--proficiency:${score}">
        <div class="tretaresia-proficiency-orbit"><span><i class="${entry.icon}"></i></span><b>${score}<small>%</small></b></div>
        <div class="tretaresia-proficiency-card-copy"><span>${html(custom ? tr('Custom proficiency') : tr(group === 'magic' ? 'Preset discipline' : 'Preset style'))}</span>
            <h4>${html(entry.name)}</h4><p>${html(entry.description || `${tr(rank)} Rank`)}</p></div>
        <div class="tretaresia-proficiency-rank"><small>${html(tr('Proficiency rank'))}</small><strong>${html(tr(rank))}</strong></div>
        ${custom ? `<button type="button" class="tretaresia-proficiency-delete" data-action="delete-custom-proficiency" data-kind="${group}" data-id="${html(entry.id)}" title="${html(tr('Remove'))}"><i class="fa-solid fa-trash"></i></button>` : ''}
        <label class="tretaresia-proficiency-control"><span class="tretaresia-proficiency-track"><i style="width:${score}%"></i></span>
            <input type="range" name="${custom ? `custom-${group}` : group}-${entry.id}" data-proficiency-kind="${group}" data-proficiency-id="${html(entry.id)}" data-custom="${custom}" min="0" max="100" value="${score}" aria-label="${html(entry.name)} proficiency"></label>
    </article>`;
}

function proficiencyIconPicker(selected = 'arcane') {
    return `<div class="tretaresia-icon-picker"><input type="hidden" name="iconKey" value="${html(selected)}"><span>${html(tr('Icon preset'))}</span>
        <div>${PROFICIENCY_ICON_PRESETS.map(entry => `<button type="button" data-action="select-proficiency-icon" data-icon-key="${html(entry.key)}" class="${entry.key === selected ? 'is-selected' : ''}" style="--icon-tone:${entry.tone}" title="${html(entry.label)}"><i class="${entry.icon}"></i><small>${html(entry.label)}</small></button>`).join('')}</div></div>`;
}

function customProficiencyEditor(kind) {
    const magic = kind === 'magic';
    return `<details class="tretaresia-editor tretaresia-add-proficiency"><summary><i class="fa-solid fa-plus"></i> ${html(tr(magic ? 'Add magic proficiency' : 'Add sword style'))}</summary>
        <form data-form="custom-proficiency" class="tretaresia-form-grid"><input type="hidden" name="kind" value="${kind}">
            ${input(magic ? 'Magic name' : 'Sword style name', 'name', '')}${input('Proficiency', 'proficiency', 0, 'number', 'min="0" max="100"')}
            ${input('Description', 'description', '')}${proficiencyIconPicker(magic ? 'arcane' : 'sword')}
            <button class="tretaresia-primary-button tretaresia-form-submit" type="submit">${html(tr(magic ? 'Add magic proficiency' : 'Add sword style'))}</button></form></details>`;
}

function renderTechniques(panel, state) {
    if (!panel) return;
    const magicEntries = [
        ...MAGIC_DISCIPLINES.map(entry => ({ ...entry, value: state.proficiencies.magic[entry.id], custom: false })),
        ...state.proficiencies.customMagic.map(entry => ({ ...entry, value: entry.proficiency, custom: true })),
    ];
    const swordEntries = [
        ...SWORD_STYLES.map(entry => ({ ...entry, tone: entry.tone || '#b9a57d', value: state.proficiencies.sword[entry.id], custom: false })),
        ...state.proficiencies.customSword.map(entry => ({ ...entry, value: entry.proficiency, custom: true })),
    ];
    const mastered = [...magicEntries, ...swordEntries].filter(entry => entry.value > 0).length;
    panel.innerHTML = `${heading('Power & Combat', `${mastered} ${tr('Active proficiencies').toLowerCase()} · ${state.proficiencies.techniques.length} ${tr('Techniques').toLowerCase()}`, 'fa-solid fa-fire-flame-curved')}
        <section class="tretaresia-proficiency-overview"><div><span>${html(tr('Mastery Archive'))}</span><strong>${mastered}</strong><small>${html(tr('Known disciplines and styles'))}</small></div>
            ${MASTERY.slice(1).map(rank => `<span><i></i>${html(tr(rank))}</span>`).join('')}</section>
        <div class="tretaresia-mastery-atlas">
            <section class="tretaresia-proficiency-section"><header><div><i class="fa-solid fa-fire-flame-curved"></i><span><strong>${html(tr('Power systems'))}</strong><small>${magicEntries.length} ${html(tr('entries'))}</small></span></div>
                <em>${state.proficiencies.customMagic.length} ${html(tr('custom'))}</em></header>
                <form data-form="proficiencies" data-kind="magic"><div class="tretaresia-proficiency-card-grid">${magicEntries.map(entry => proficiencyCard(entry, 'magic', entry.value, entry.custom)).join('')}</div>
                    <button class="tretaresia-primary-button tretaresia-mastery-save" type="submit"><i class="fa-solid fa-floppy-disk"></i>${html(tr('Save proficiency'))}</button></form>${customProficiencyEditor('magic')}</section>
            <section class="tretaresia-proficiency-section"><header><div><i class="fa-solid fa-khanda"></i><span><strong>${html(tr('Combat disciplines'))}</strong><small>${swordEntries.length} ${html(tr('entries'))}</small></span></div>
                <em>${state.proficiencies.customSword.length} ${html(tr('custom'))}</em></header>
                <form data-form="proficiencies" data-kind="sword"><div class="tretaresia-proficiency-card-grid tretaresia-sword-card-grid">${swordEntries.map(entry => proficiencyCard(entry, 'sword', entry.value, entry.custom)).join('')}</div>
                    <button class="tretaresia-primary-button tretaresia-mastery-save" type="submit"><i class="fa-solid fa-floppy-disk"></i>${html(tr('Save proficiency'))}</button></form>${customProficiencyEditor('sword')}</section>
        </div>
        <section class="tretaresia-technique-section tretaresia-technique-revamp"><div class="tretaresia-section-label"><i class="fa-solid fa-list-check"></i><span>${html(tr('Techniques'))}</span></div>
            <div class="tretaresia-technique-grid">${state.proficiencies.techniques.length ? state.proficiencies.techniques.map(entry => `<article class="tretaresia-technique-card">
                <div><span>${html(entry.category)}</span><strong>${html(entry.name)}</strong><p>${html(entry.description || tr('No description'))}</p></div>
                <div class="tretaresia-technique-meter"><em>${html(tr(proficiencyRank(entry.proficiency)))} Rank</em><span><i style="width:${entry.proficiency}%"></i></span><b>${entry.proficiency}%</b></div>
                <button type="button" data-action="delete-technique" data-id="${html(entry.id)}" title="${html(tr('Remove'))}"><i class="fa-solid fa-trash"></i></button></article>`).join('') : empty('Skills learned during role-play will appear here.')}</div>
            <details class="tretaresia-editor"><summary><i class="fa-solid fa-plus"></i> ${html(tr('Add technique'))}</summary>
                <form data-form="technique" class="tretaresia-form-grid">${input('Technique name', 'name', '')}${input('Category', 'category', 'General')}
                    ${input('Proficiency', 'proficiency', 0, 'number', 'min="0" max="100"')}${input('Description', 'description', '')}
                    <button class="tretaresia-primary-button tretaresia-form-submit" type="submit">${html(tr('Add technique'))}</button></form></details></section>`;
}

function questSectionId(entry) {
    if (entry.status === 'Completed') return 'completed';
    if (entry.status === 'Failed') return 'failed';
    if (entry.type === 'Story') return 'story';
    if (entry.type === 'Side-Story') return 'side-story';
    return 'active';
}

function renderQuestCard(entry) {
    const progress = entry.status === 'Completed' ? 100 : number(entry.progress, 0, 0, 100);
    const rewardLabel = entry.status === 'Completed' && entry.rewardClaimed ? tr('Reward claimed') : tr('Reward');
    return `<article class="tretaresia-quest-card" data-status="${html(entry.status.toLowerCase())}"><div>
        <span class="tretaresia-quest-status">${html(entry.status)} · ${html(entry.type)}${entry.type === 'Dungeon' ? ` ${html(entry.dungeonRank)}` : ''}</span><h4>${html(entry.name)}</h4>
        <p>${html(entry.objective || tr('No objective recorded'))}</p>
        <div class="tretaresia-quest-progress" style="--quest-progress:${progress}%"><span><i></i></span><b>${progress}%</b></div>
        ${(entry.giver || entry.source) ? `<small><i class="fa-solid fa-user-tag"></i> ${html(entry.giver || tr('Unknown giver'))}${entry.source ? ` · ${html(entry.source)}` : ''}</small>` : ''}
        ${entry.reward ? `<small class="tretaresia-quest-reward${entry.rewardClaimed ? ' is-claimed' : ''}"><i class="fa-solid ${entry.rewardClaimed ? 'fa-circle-check' : 'fa-gift'}"></i> ${html(rewardLabel)}: ${html(entry.reward)}</small>` : ''}
        ${entry.receivedAt ? `<small><i class="fa-solid fa-clock"></i> ${html(tr('Received'))}: ${html(formatDate(entry.receivedAt))}</small>` : ''}</div>
        <div class="tretaresia-card-actions"><button type="button" data-action="delete-quest" data-id="${html(entry.id)}"><i class="fa-solid fa-trash"></i></button></div></article>`;
}

function renderQuests(panel, state) {
    if (!panel) return;
    const grouped = Object.fromEntries(QUEST_SECTIONS.map(section => [section.id, []]));
    state.quests.forEach(entry => grouped[questSectionId(entry)].push(entry));
    for (const entries of Object.values(grouped)) entries.sort((a, b) => String(b.completedAt || b.failedAt || b.updatedAt || b.receivedAt || '').localeCompare(String(a.completedAt || a.failedAt || a.updatedAt || a.receivedAt || '')));
    if (!grouped[activeQuestSection]) activeQuestSection = 'active';
    const section = QUEST_SECTIONS.find(entry => entry.id === activeQuestSection) || QUEST_SECTIONS[2];
    const visible = grouped[section.id];
    const openCount = grouped.story.length + grouped['side-story'].length + grouped.active.length;
    panel.innerHTML = `${heading('Mission & Quest Log', `${openCount} open · ${grouped.completed.length} completed · ${grouped.failed.length} failed`, 'fa-solid fa-scroll')}
        <nav class="tretaresia-quest-sections" aria-label="${html(tr('Mission archive'))}">${QUEST_SECTIONS.map(entry => `<button type="button" data-action="quest-section" data-section="${entry.id}" class="${entry.id === section.id ? 'is-active' : ''}"><span>${html(tr(entry.label))}</span><b>${grouped[entry.id].length}</b></button>`).join('')}</nav>
        <section class="tretaresia-quest-section"><header><span>${html(tr(section.label))}</span><small>${visible.length}</small></header>
            <div class="tretaresia-quest-list">${visible.length ? visible.map(renderQuestCard).join('') : empty('No quests have been recorded yet.')}</div></section>
        <details class="tretaresia-editor"><summary><i class="fa-solid fa-plus"></i> ${html(tr('Add mission or quest'))}</summary>
            <form data-form="quest" class="tretaresia-form-grid">${input('Mission / quest name', 'name', '')}
                ${select('Type', 'type', QUEST_TYPES, 'Quest')}${select('Dungeon rank', 'dungeonRank', DUNGEON_RANKS, 'Unranked')}
                ${select('Status', 'status', ['Offered', 'Active', 'Completed', 'Failed', 'On Hold'], 'Active')}
                ${input('Objective', 'objective', '')}${input('Reward', 'reward', '')}${input('Quest giver', 'giver', '')}${input('Source', 'source', 'Manual entry')}
                ${input('Progress', 'progress', 0, 'number', 'min="0" max="100"')}${input('Notes', 'notes', '')}
                <button class="tretaresia-primary-button tretaresia-form-submit" type="submit">${html(tr('Add to log'))}</button></form></details>`;
}

const rankRow = (label, value, icon) => `<article class="tretaresia-rank-row"><i class="${icon}"></i><span>${html(tr(label))}</span><strong>${html(tr(String(value)))}</strong></article>`;

function transactionAmounts(entry) {
    return ['gold', 'silver', 'copper'].filter(key => entry.amounts?.[key])
        .map(key => `<span data-kind="${key}" data-sign="${entry.amounts[key] > 0 ? 'gain' : 'loss'}">${entry.amounts[key] > 0 ? '+' : ''}${entry.amounts[key]} ${html(tr(`${key[0].toUpperCase() + key.slice(1)} coins`))}</span>`).join('');
}

function renderTransactions(state) {
    const entries = [...state.transactions].reverse();
    return `<details class="tretaresia-card tretaresia-transactions tretaresia-log-disclosure"><summary><span><i class="fa-solid fa-receipt"></i><b>${html(tr('Transaction history'))}</b><small>${html(state.progression.currency.name)}</small></span><em>${entries.length}</em><i class="fa-solid fa-chevron-down"></i></summary>
        <div class="tretaresia-log-body">${entries.length ? entries.map(entry => `<article><div><strong>${html(entry.reason)}</strong><small>${html(formatDate(entry.at))} · ${html(entry.source)}</small></div>
            <div class="tretaresia-transaction-amounts">${transactionAmounts(entry)}<small>${html(tr('Balance after'))}: ${entry.balance.gold} / ${entry.balance.silver} / ${entry.balance.copper}</small></div></article>`).join('')
            : `<p class="tretaresia-transaction-empty">${html(tr('No transactions recorded yet.'))}</p>`}</div></details>`;
}

function renderRank(panel, state) {
    if (!panel) return;
    const p = state.progression;
    panel.innerHTML = `${heading('Ranks & Progression', 'Guild and mastery record', 'fa-solid fa-medal')}
        <div class="tretaresia-rank-layout"><article class="tretaresia-rank-hero"><span>${html(tr('Adventurer Rank'))}</span>
            <strong>${html(p.adventurerRank === 'Custom Rank' && p.customRankName ? p.customRankName : p.adventurerRank)}</strong><small>${html(tr('Recognized guild classification'))}</small></article>
            <div class="tretaresia-rank-stack">${rankRow('Power mastery', p.magicRank, 'fa-solid fa-fire-flame-curved')}
                ${rankRow('Combat mastery', p.swordRank, 'fa-solid fa-khanda')}${rankRow('Experience', `${p.experience} / ${p.experienceMax}`, 'fa-solid fa-star')}
                ${rankRow('Reputation', p.reputation, 'fa-solid fa-people-group')}${rankRow('Confirmed kills', p.kills, 'fa-solid fa-skull')}</div></div>
        <article class="tretaresia-card tretaresia-wallet" title="${html(p.currency.name)}"><div><span>${html(tr('Gold coins'))}</span><strong>${p.currency.gold}</strong></div>
            <div><span>${html(tr('Silver coins'))}</span><strong>${p.currency.silver}</strong></div><div><span>${html(tr('Copper coins'))}</span><strong>${p.currency.copper}</strong></div></article>
        ${renderTransactions(state)}
        <details class="tretaresia-editor"><summary><i class="fa-solid fa-pen"></i> ${html(tr('Edit progression'))}</summary>
            <form data-form="rank" class="tretaresia-form-grid">${select('Adventurer rank', 'adventurerRank', RANKS, p.adventurerRank)}${input('Custom rank name', 'customRankName', p.customRankName)}
                ${select('Power mastery', 'magicRank', MASTERY, p.magicRank)}${select('Combat mastery', 'swordRank', MASTERY, p.swordRank)}
                ${input('Experience', 'experience', p.experience, 'number', 'min="0"')}${input('EXP to next level', 'experienceMax', p.experienceMax, 'number', 'min="1"')}
                ${input('Reputation', 'reputation', p.reputation, 'number')}${input('Confirmed kills', 'kills', p.kills, 'number', 'min="0"')}
                ${input('Currency / region', 'currencyName', p.currency.name)}${input('Gold coins', 'gold', p.currency.gold, 'number', 'min="0"')}${input('Silver coins', 'silver', p.currency.silver, 'number', 'min="0"')}
                ${input('Copper coins', 'copper', p.currency.copper, 'number', 'min="0"')}
                <button class="tretaresia-primary-button tretaresia-form-submit" type="submit">${html(tr('Save progression'))}</button></form></details>`;
}

function renderNpcMapControls(state) {
    const settings = getSettings();
    const entries = friendlyNpcs(state);
    const rows = entries.length ? entries.map(entry => {
        const point = npcMapPoint(entry, state);
        return `<button type="button" class="tretaresia-npc-map-row${entry.mapVisible ? ' is-visible' : ''}" data-action="toggle-npc-map" data-id="${html(entry.id)}" aria-pressed="${entry.mapVisible}">
            <span class="tretaresia-npc-map-avatar">${html(entry.name.charAt(0).toUpperCase() || '?')}</span><span><strong>${html(entry.name)}</strong><small>${html(entry.activity || entry.location)}${point ? ` · ${coordinatesLabel(point.x, point.y)}` : ' · Unknown coordinates'}</small></span>
            <i class="fa-solid fa-${entry.mapVisible ? 'eye' : 'eye-slash'}"></i></button>`;
    }).join('') : `<p class="tretaresia-npc-map-empty">${html(tr('Only friendly NPCs appear here.'))}</p>`;
    return `<section class="tretaresia-npc-map-controls"><header><span><i class="fa-solid fa-person-walking"></i>${html(tr('Living NPCs'))}</span>
        <button type="button" data-action="toggle-npc-markers" aria-pressed="${settings.showNpcMapMarkers}" title="${html(tr(settings.showNpcMapMarkers ? 'Hide NPC markers' : 'Show NPC markers'))}"><i class="fa-solid fa-${settings.showNpcMapMarkers ? 'eye' : 'eye-slash'}"></i></button></header>
        <div>${rows}</div></section>`;
}

function mapPresenceAvatar(key, name, directSource = '', directFrame = null) {
    if (directSource) requestMapPortrait(key, null, directSource, directFrame);
    const record = mapPortraitRecord(key);
    if (record && directFrame) record.frame = directFrame;
    return record?.status === 'ready' && record.url
        ? `<span class="tretaresia-map-presence-avatar"><img src="${html(record.url)}" alt="" style="object-position:${number(record.frame?.x, 50, 0, 100)}% ${number(record.frame?.y, 50, 0, 100)}%;transform:scale(${number(record.frame?.zoom, 1, 1, 4)})"></span>`
        : `<span class="tretaresia-map-presence-avatar">${html(text(name, '?', 120).charAt(0).toUpperCase() || '?')}</span>`;
}

function renderMapPresenceRoster(state, atlas) {
    const playerPoint = currentMapPoint(state);
    const playerName = currentPersonaName(state);
    const characters = mergedCharacterLifeMapMarkers(state).filter(entry => entry.scope === 'character' && (!entry.worldId || entry.worldId === atlas.id));
    const rows = characters.map((entry, index) => {
        const point = npcMapPoint(entry, state);
        if (index < MAP_ROSTER_PORTRAIT_LIMIT) requestMapPortrait(`character:${entry.id}`, { id: entry.id, scope: 'character', name: entry.name });
        return `<article>${mapPresenceAvatar(`character:${entry.id}`, entry.name)}<span><strong>${html(entry.name)}</strong><small>${html(entry.location || entry.currentState || tr('Unknown'))}${point ? ` · ${html(coordinatesLabel(point.x, point.y))}` : ` · ${html(tr('Unknown coordinates'))}`}</small></span></article>`;
    }).join('');
    return `<section class="tretaresia-card tretaresia-map-presence"><header><span><i class="fa-solid fa-location-crosshairs"></i>${html(tr('Character positions'))}</span><b>${characters.length + 1}</b></header><div>
        <article class="is-player">${mapPresenceAvatar(`player:${shortHash(state.player.portrait)}`, playerName, state.player.portrait, state.player.portraitView.mobile)}<span><strong>${html(playerName)} · ${html(tr('You'))}</strong><small>${html(state.location.place)} · ${html(coordinatesLabel(playerPoint.x, playerPoint.y))}</small></span></article>${rows || `<p>${html(tr('No Character Life positions yet.'))}</p>`}</div></section>`;
}

function mapWorldToolbar(state, selected, fullscreen = false) {
    const atlas = viewedAtlas(state);
    return `<div class="tretaresia-map-toolbar" data-map-toolbar>
        <label class="tretaresia-map-world-select" title="${html(atlas.name)}"><i class="fa-solid fa-earth-asia"></i><span>${html(tr('World'))}</span>
            <select data-map-world-select aria-label="${html(tr('World map'))}">${Object.values(WORLD_ATLASES).map(entry =>
                `<option value="${entry.id}"${entry.id === atlas.id ? ' selected' : ''}>${html(entry.id === 'present-world' ? tr('Present World') : 'ALTERNATE')}</option>`).join('')}</select>
        </label>
        <div class="tretaresia-map-toolbar-readouts">
            <span><i class="fa-solid fa-magnifying-glass"></i><b data-map-zoom>100%</b></span>
        </div>
        <button class="tretaresia-map-fullscreen-icon" type="button" data-action="map-fullscreen"
            title="${html(tr(fullscreen ? 'Close fullscreen map' : 'Open fullscreen map'))}" aria-label="${html(tr(fullscreen ? 'Close fullscreen map' : 'Open fullscreen map'))}">
            <i class="fa-solid fa-${fullscreen ? 'xmark' : 'up-right-and-down-left-from-center'}"></i>
        </button>
    </div>`;
}

function mapSurfaceMarkup(state, selected, fullscreen = false) {
    const atlas = viewedAtlas(state);
    const variant = worldMapVariant(state);
    return `<div class="tretaresia-map-surface${fullscreen ? ' is-viewer' : ''}">
        <div class="tretaresia-map-frame${fullscreen ? ' is-viewer' : ''}" data-map-variant="${variant}" data-map-world="${atlas.id}" data-map-surface="${fullscreen ? 'fullscreen' : 'embedded'}">
            <canvas class="tretaresia-world-map" role="img" aria-label="${html(`Interactive atlas of ${atlas.name}; drag to pan and pinch to zoom`)}"></canvas>
        </div>
        <div class="tretaresia-map-control-panel" aria-label="${html(tr('Map controls'))}">${mapWorldToolbar(state, selected, fullscreen)}</div>
    </div>`;
}

function selectViewedWorld(nextWorldId, state = getState()) {
    if (!WORLD_ATLASES[nextWorldId] || nextWorldId === viewedWorldId(state)) return false;
    mapAtlasSelection = nextWorldId;
    mapSelectionId = null;
    mapDraftPoint = null;
    Object.assign(mapView, { scale: 1, x: 0, y: 0 });
    activateMapTileContext(nextWorldId, worldMapVariant(state));
    renderMap(document.querySelector('[data-panel="map"]'), getState());
    return true;
}

function renderMap(panel, state) {
    if (!panel) return;
    const atlas = viewedAtlas(state);
    const viewingCurrentWorld = atlas.id === storyWorldId(state);
    const selected = viewingCurrentWorld ? currentMapPoint(state) : worldLocationsFor(state, true)[0];
    const moving = viewingCurrentWorld && ['Preparing', 'Traveling', 'Delayed'].includes(state.travel.status);
    const progress = Math.round(travelProgress(state) * 100);
    // Location catalogs stay in canonical state and in the AI prompt, but the
    // atlas DOM no longer creates hundreds of destination options, pin rows,
    // or location controls. Main-chat role-play is the travel controller.
    const travelMarkup = moving || viewingCurrentWorld && state.travel.status === 'Arrived' ? `
        <section class="tretaresia-map-journey-strip" data-status="${html(state.travel.status.toLowerCase())}">
            <span><i class="fa-solid fa-route"></i><b>${html(state.travel.origin || 'Unknown')}</b><i class="fa-solid fa-arrow-right-long"></i><b>${html(state.travel.destinationPlace || state.travel.destination || state.location.place)}</b></span>
            <div class="tretaresia-map-journey-track" style="--journey-progress:${progress}%"><i></i><strong>${progress}%</strong></div>
            <small>${html(moving ? `${formatTravelDays(state.travel.remainingDays)} ${tr('days')} ${tr('Remaining travel').toLocaleLowerCase()}` : state.travel.status)}</small>
        </section>` : '';

    panel.innerHTML = `${heading(atlas.name, `${tr(atlas.era)} · ${viewingCurrentWorld ? state.location.continent + ' · ' + state.location.region : tr('Atlas browsing mode')}`, 'fa-solid fa-earth-asia')}
<div class="tretaresia-map-layout tretaresia-performance-map${mapFullscreen ? ' has-fullscreen-map' : ''}">
    ${mapFullscreen ? '' : mapSurfaceMarkup(state, selected, false)}
    ${travelMarkup}
</div>
${mapFullscreen ? '' : renderMapPresenceRoster(state, atlas)}
${mapFullscreen ? `<section class="tretaresia-map-window" role="dialog" aria-modal="true" aria-label="${html(atlas.name)}">
    <header><div><span>${html(tr('World map'))}</span><h3>${html(atlas.name)}</h3><small>${html(viewingCurrentWorld ? state.location.continent : tr('Atlas browsing mode'))}</small></div>
        <button type="button" data-action="map-fullscreen" title="${html(tr('Close fullscreen map'))}" aria-label="${html(tr('Close fullscreen map'))}"><i class="fa-solid fa-xmark"></i></button></header>
    <div class="tretaresia-map-window-body">${mapSurfaceMarkup(state, selected, true)}</div>
</section>` : ''}`;
    const visible = mapFullscreen || (!panel.hidden && panel.classList.contains('is-active')
        && document.getElementById('tretaresia-rpg-overlay')?.classList.contains('is-open'));
    if (visible) {
        setupMapInteractions(panel);
        scheduleMapDraw(panel, state);
    }
}

function mapLod() {
    return mapView.scale < WORLD_MAP_ZOOM_LEVELS.regional ? 0
        : mapView.scale < WORLD_MAP_ZOOM_LEVELS.local ? 1 : 2;
}

function mapVisibleBounds() {
    const margin = (MAP_COARSE_POINTER ? 48 : 100) / mapView.scale;
    return {
        left: -mapView.x / mapView.scale - margin, top: -mapView.y / mapView.scale - margin,
        right: (WORLD_MAP_WIDTH - mapView.x) / mapView.scale + margin,
        bottom: (WORLD_MAP_HEIGHT - mapView.y) / mapView.scale + margin,
    };
}

function worldMapVariant(state) {
    const phase = text(state?.worldClock?.phase, '', 20);
    const hour = Number(text(state?.worldClock?.time, '12:00', 5).split(':')[0]);
    return phase === 'Night' || Number.isFinite(hour) && (hour >= 18 || hour < 6) ? 'night' : 'day';
}

function worldTileLevel() {
    if (mapView.scale < .82) return WORLD_TILE_LEVELS[0];
    if (mapView.scale < 1.35) return WORLD_TILE_LEVELS[1];
    if (mapView.scale < 2.55) return WORLD_TILE_LEVELS[2];
    // z3 is 4096x3072. On coarse-pointer/mobile devices it is opt-in so the
    // default path remains inside Safari's practical decoded-image budget.
    return MAP_COARSE_POINTER && !getSettings().mapHdMode ? WORLD_TILE_LEVELS[2] : WORLD_TILE_LEVELS[3];
}

function trimMapTileCache(protectedKey = '') {
    let guard = mapTileCache.size * 2;
    while (mapTileCache.size > MAP_TILE_CACHE_LIMIT && guard-- > 0) {
        const candidate = [...mapTileCache.entries()].find(([key, record]) =>
            key !== protectedKey && record.status !== 'loading' && !key.includes('/0/'));
        if (!candidate) break;
        const [key, record] = candidate;
        releaseMapTileRecord(record);
        mapTileCache.delete(key);
    }
}

function releaseMapTileRecord(record) {
    if (!record || record.cancelled) return;
    record.cancelled = true;
    if (record.active) {
        record.active = false;
        mapTileLoads = Math.max(0, mapTileLoads - 1);
    }
    record.image.onload = null;
    record.image.onerror = null;
    try { record.image.removeAttribute('src'); } catch {}
}

function pumpMapTileQueue() {
    while (mapTileLoads < MAP_TILE_LOAD_LIMIT && mapTileQueue.length) {
        const queued = mapTileQueue.shift();
        const { key, record } = queued || {};
        if (!record || record.cancelled || mapTileCache.get(key) !== record || record.status !== 'queued') continue;
        record.status = 'loading';
        record.active = true;
        mapTileLoads += 1;
        record.image.src = record.src;
    }
}

function finishMapTileLoad(record) {
    if (record?.active) {
        record.active = false;
        mapTileLoads = Math.max(0, mapTileLoads - 1);
    }
    pumpMapTileQueue();
}

function clearMapTileCache(predicate = () => true) {
    for (const [key, record] of mapTileCache) {
        if (!predicate(key, record)) continue;
        releaseMapTileRecord(record);
        mapTileCache.delete(key);
    }
    for (let index = mapTileQueue.length - 1; index >= 0; index -= 1) {
        const queued = mapTileQueue[index];
        if (queued?.record?.cancelled || !mapTileCache.has(queued?.key)) mapTileQueue.splice(index, 1);
    }
    pumpMapTileQueue();
}

function activateMapTileContext(worldId, variant) {
    const safeWorldId = WORLD_ATLASES[worldId] ? worldId : WORLD_ATLAS.id;
    const safeVariant = variant === 'night' ? 'night' : 'day';
    const nextContext = `${safeWorldId}/${safeVariant}/`;
    if (nextContext === mapTileContext) return;
    mapTileContext = nextContext;
    clearMapTileCache(key => !key.startsWith(nextContext));
}

function worldTile(level, column, row, worldId = WORLD_ATLAS.id, variant = 'day') {
    const safeWorldId = WORLD_ATLASES[worldId] ? worldId : WORLD_ATLAS.id;
    const safeVariant = variant === 'night' ? 'night' : 'day';
    const roots = WORLD_TILE_ROOTS[safeWorldId];
    const key = `${safeWorldId}/${safeVariant}/${level.z}/${column}-${row}`;
    const cached = mapTileCache.get(key);
    if (cached) {
        mapTileCache.delete(key);
        mapTileCache.set(key, cached);
        return cached;
    }
    const record = {
        status: 'queued', image: new Image(), worldId: safeWorldId, variant: safeVariant,
        fallbackAttempted: false, cancelled: false, active: false,
        src: `${roots[safeVariant]}/${level.z}/${column}-${row}.webp`,
    };
    record.image.decoding = 'async';
    record.image.onload = () => {
        if (record.cancelled) return;
        record.status = 'ready';
        finishMapTileLoad(record);
        trimMapTileCache(key);
        scheduleMapDraw();
    };
    record.image.onerror = () => {
        if (record.cancelled) return;
        finishMapTileLoad(record);
        if (safeVariant === 'night' && !record.fallbackAttempted) {
            record.fallbackAttempted = true;
            record.variant = 'day-fallback';
            record.status = 'queued';
            record.src = `${roots.day}/${level.z}/${column}-${row}.webp`;
            mapTileQueue.push({ key, record });
            pumpMapTileQueue();
            return;
        }
        record.status = 'error';
        trimMapTileCache();
    };
    mapTileCache.set(key, record);
    mapTileQueue.push({ key, record });
    trimMapTileCache(key);
    pumpMapTileQueue();
    return record;
}

function cachedWorldTile(level, column, row, worldId = WORLD_ATLAS.id, variant = 'day') {
    const safeWorldId = WORLD_ATLASES[worldId] ? worldId : WORLD_ATLAS.id;
    const safeVariant = variant === 'night' ? 'night' : 'day';
    return mapTileCache.get(`${safeWorldId}/${safeVariant}/${level.z}/${column}-${row}`) || null;
}

function mapCanvasPoint(x, y, width, height) {
    return {
        x: (x * mapView.scale + mapView.x) / WORLD_MAP_WIDTH * width,
        y: (y * mapView.scale + mapView.y) / WORLD_MAP_HEIGHT * height,
    };
}

function drawMapLabel(context, label, x, y, options = {}) {
    const size = options.size || 12;
    context.save();
    context.font = `${options.weight || 650} ${size}px Inter, system-ui, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineJoin = 'round';
    context.strokeStyle = options.stroke || 'rgba(4, 13, 17, .88)';
    context.lineWidth = Math.max(3, size * .28);
    context.strokeText(label, x, y);
    context.fillStyle = options.color || '#f5f2df';
    context.fillText(label, x, y);
    context.restore();
}

function clusterMapMarkerEntries(entries, pixelRatio) {
    if (entries.length <= MAP_CLUSTER_THRESHOLD) return entries.map(entry => ({ entries: [entry], point: entry.point, worldPoint: entry.worldPoint }));
    const cellSize = 36 * pixelRatio;
    const cells = new Map();
    for (const entry of entries) {
        const key = `${Math.floor(entry.point.x / cellSize)}:${Math.floor(entry.point.y / cellSize)}`;
        const cell = cells.get(key) || [];
        cell.push(entry);
        cells.set(key, cell);
    }
    return [...cells.values()].map(group => ({
        entries: group,
        point: {
            x: group.reduce((sum, entry) => sum + entry.point.x, 0) / group.length,
            y: group.reduce((sum, entry) => sum + entry.point.y, 0) / group.length,
        },
        worldPoint: {
            x: group.reduce((sum, entry) => sum + entry.worldPoint.x, 0) / group.length,
            y: group.reduce((sum, entry) => sum + entry.worldPoint.y, 0) / group.length,
        },
    }));
}

function drawMapMarkerCluster(context, cluster, palette, pixelRatio) {
    const radius = 9 * pixelRatio;
    context.save();
    context.beginPath();
    context.arc(cluster.point.x, cluster.point.y, radius, 0, Math.PI * 2);
    context.fillStyle = palette.accent;
    context.fill();
    context.strokeStyle = palette.halo;
    context.lineWidth = 2 * pixelRatio;
    context.stroke();
    context.fillStyle = readableOn(palette.accent);
    context.font = `850 ${Math.max(8, 7.5 * pixelRatio)}px system-ui, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(`+${cluster.entries.length}`, cluster.point.x, cluster.point.y + .35 * pixelRatio);
    context.restore();
    return radius;
}


function drawWorldMap(panel = document.querySelector('[data-panel="map"]'), state = getState()) {
    const scope = mapFullscreen ? panel?.querySelector('.tretaresia-map-window') || panel : panel;
    const canvas = scope?.querySelector('.tretaresia-world-map');
    if (!(canvas instanceof HTMLCanvasElement)) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const pixelRatio = MAP_COARSE_POINTER ? 1 : Math.min(1.35, globalThis.devicePixelRatio || 1);
    const targetWidth = Math.max(1, Math.round(rect.width * pixelRatio));
    const targetHeight = Math.max(1, Math.round(rect.height * pixelRatio));
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
    }
    const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!context) return;
    const palette = mapPalette();
    const variant = worldMapVariant(state);
    const worldId = viewedWorldId(state);
    activateMapTileContext(worldId, variant);
    const viewingCurrentWorld = worldId === storyWorldId(state);
    const continents = worldContinentsFor(state, true);
    canvas.dataset.mapVariant = variant;
    canvas.dataset.mapWorld = worldId;
    const bounds = mapVisibleBounds();
    const transformX = canvas.width / WORLD_MAP_WIDTH;
    const transformY = canvas.height / WORLD_MAP_HEIGHT;

    context.setTransform(1, 0, 0, 1, 0, 0);
    const ocean = context.createLinearGradient(0, 0, 0, canvas.height);
    ocean.addColorStop(0, palette.ocean);
    ocean.addColorStop(1, palette.oceanDeep);
    context.fillStyle = ocean;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.setTransform(transformX * mapView.scale, 0, 0, transformY * mapView.scale,
        transformX * mapView.x, transformY * mapView.y);
    context.imageSmoothingEnabled = !mapInteracting;
    context.imageSmoothingQuality = mapInteracting ? 'low' : 'medium';

    {
        const fallback = mapInteracting
            ? cachedWorldTile(WORLD_TILE_LEVELS[0], 0, 0, worldId, variant)
            : worldTile(WORLD_TILE_LEVELS[0], 0, 0, worldId, variant);
        if (fallback?.status === 'ready') {
            context.drawImage(fallback.image, 0, 0, WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT);
        }
        const level = worldTileLevel();
        const sourceLeft = Math.max(0, bounds.left / WORLD_MAP_WIDTH * level.width);
        const sourceTop = Math.max(0, bounds.top / WORLD_MAP_HEIGHT * level.height);
        const sourceRight = Math.min(level.width, bounds.right / WORLD_MAP_WIDTH * level.width);
        const sourceBottom = Math.min(level.height, bounds.bottom / WORLD_MAP_HEIGHT * level.height);
        const firstColumn = Math.max(0, Math.floor(sourceLeft / WORLD_TILE_SIZE));
        const lastColumn = Math.min(level.columns - 1, Math.floor(Math.max(0, sourceRight - 1) / WORLD_TILE_SIZE));
        const firstRow = Math.max(0, Math.floor(sourceTop / WORLD_TILE_SIZE));
        const lastRow = Math.min(level.rows - 1, Math.floor(Math.max(0, sourceBottom - 1) / WORLD_TILE_SIZE));
        for (let row = firstRow; row <= lastRow; row += 1) {
            for (let column = firstColumn; column <= lastColumn; column += 1) {
                const tile = mapInteracting ? cachedWorldTile(level, column, row, worldId, variant) : worldTile(level, column, row, worldId, variant);
                if (tile?.status !== 'ready') continue;
                context.drawImage(tile.image,
                    column * WORLD_TILE_SIZE / level.width * WORLD_MAP_WIDTH,
                    row * WORLD_TILE_SIZE / level.height * WORLD_MAP_HEIGHT,
                    tile.image.naturalWidth / level.width * WORLD_MAP_WIDTH,
                    tile.image.naturalHeight / level.height * WORLD_MAP_HEIGHT);
            }
        }
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    mapRenderedPoints = [];
    // The atlas deliberately renders only continent names plus lightweight
    // player/NPC positions. All 124/306 destination records remain available
    // to travel, quests, NPC knowledge and the main-chat state prompt.
    for (const continent of continents) {
        const point = mapCanvasPoint(continent.label[0], continent.label[1], canvas.width, canvas.height);
        drawMapLabel(context, continent.name.toUpperCase(), point.x, point.y, {
            size: Math.max(14 * pixelRatio, canvas.width / 74), weight: 800, color: 'rgba(255,248,218,.94)', stroke: 'rgba(7,17,20,.92)',
        });
    }

    if (viewingCurrentWorld && ['Preparing', 'Traveling', 'Delayed', 'Arrived'].includes(state.travel.status)) {
        const routePoints = state.travel.routePoints?.length >= 2 ? state.travel.routePoints : buildTravelRoutePoints(state, state.travel);
        if (routePoints.length >= 2) {
            context.save();
            context.beginPath();
            routePoints.forEach((entry, index) => {
                const point = mapCanvasPoint(entry.x, entry.y, canvas.width, canvas.height);
                if (!index) context.moveTo(point.x, point.y);
                else context.lineTo(point.x, point.y);
            });
            context.setLineDash([7 * pixelRatio, 5 * pixelRatio]);
            context.lineWidth = Math.max(2, 2.4 * pixelRatio);
            context.strokeStyle = palette.alt;
            context.shadowColor = palette.halo;
            context.shadowBlur = 7 * pixelRatio;
            context.stroke();
            context.setLineDash([]);
            routePoints.slice(1, -1).forEach(entry => {
                const point = mapCanvasPoint(entry.x, entry.y, canvas.width, canvas.height);
                context.beginPath();
                context.arc(point.x, point.y, 3.2 * pixelRatio, 0, Math.PI * 2);
                context.fillStyle = palette.alt;
                context.fill();
            });
            context.restore();
        }
    }

    if (getSettings().showNpcMapMarkers) {
        const characterLifeMarkers = mergedCharacterLifeMapMarkers(state).filter(marker => !marker.worldId || marker.worldId === worldId);
        const matchedCharacterLifeKeys = new Set();
        const nativeNpcs = viewingCurrentWorld ? friendlyNpcs(state).filter(entry => entry.mapVisible) : [];
        const characterLifeById = new Map();
        const characterLifeByName = new Map();
        let visiblePortraitRequests = 0;
        const visiblePortrait = (key, query) => {
            const existing = mapPortraitRecord(key);
            if (existing) return existing;
            if (visiblePortraitRequests >= MAP_VISIBLE_PORTRAIT_LIMIT) return null;
            visiblePortraitRequests += 1;
            requestMapPortrait(key, query);
            return mapPortraitRecord(key);
        };
        for (const marker of characterLifeMarkers) {
            characterLifeById.set(`${marker.scope}:${marker.id}`, marker);
            mapNpcIdentity(marker).forEach(name => characterLifeByName.set(name, marker));
        }
        const markerForNative = entry => {
            if (entry.characterLifeId && entry.characterLifeScope) {
                const linked = characterLifeById.get(`${entry.characterLifeScope}:${entry.characterLifeId}`);
                if (linked) return linked;
            }
            if (entry.characterLifeId) {
                const linked = characterLifeMarkers.find(marker => marker.id === entry.characterLifeId);
                if (linked) return linked;
            }
            return mapNpcIdentity(entry).map(name => characterLifeByName.get(name)).find(Boolean) || null;
        };
        for (const entry of nativeNpcs) {
            const linkedMarker = markerForNative(entry);
            if (linkedMarker) {
                matchedCharacterLifeKeys.add(linkedMarker.key || `${linkedMarker.scope}:${linkedMarker.id}`);
                if (linkedMarker.mapVisible === false) continue;
            }
            const npcPoint = npcMapPoint(entry, state);
            if (!npcPoint || npcPoint.x < bounds.left || npcPoint.x > bounds.right || npcPoint.y < bounds.top || npcPoint.y > bounds.bottom) continue;
            const point = mapCanvasPoint(npcPoint.x, npcPoint.y, canvas.width, canvas.height);
            const size = 7 * pixelRatio;
            const portraitKey = linkedMarker ? `${linkedMarker.scope}:${linkedMarker.id}` : '';
            const portrait = linkedMarker ? visiblePortrait(portraitKey, { id: linkedMarker.id, scope: linkedMarker.scope, name: linkedMarker.name }) : null;
            drawMapAvatar(context, point, portrait, entry.name.charAt(0).toUpperCase(), size,
                npcPoint.partyMember ? palette.alt : palette.accent, palette.halo, pixelRatio);
            mapRenderedPoints.push({ type: 'npc', id: entry.id, x: point.x, y: point.y, radius: 22 * pixelRatio });
        }
        const standaloneMarkers = [];
        for (const marker of characterLifeMarkers) {
            const markerKey = marker.key || `${marker.scope}:${marker.id}`;
            if (marker.mapVisible === false || matchedCharacterLifeKeys.has(markerKey)) continue;
            const npcPoint = npcMapPoint({
                ...marker,
                location: marker.location || marker.currentState,
                mapVisible: true,
            }, state);
            if (!npcPoint || npcPoint.x < bounds.left || npcPoint.x > bounds.right || npcPoint.y < bounds.top || npcPoint.y > bounds.bottom) continue;
            const point = mapCanvasPoint(npcPoint.x, npcPoint.y, canvas.width, canvas.height);
            standaloneMarkers.push({ marker, point, worldPoint: npcPoint });
        }
        for (const cluster of clusterMapMarkerEntries(standaloneMarkers, pixelRatio)) {
            if (cluster.entries.length > 1) {
                const radius = drawMapMarkerCluster(context, cluster, palette, pixelRatio);
                mapRenderedPoints.push({ type: 'cluster', x: cluster.point.x, y: cluster.point.y, radius: Math.max(22 * pixelRatio, radius), worldX: cluster.worldPoint.x, worldY: cluster.worldPoint.y });
                continue;
            }
            const { marker, point } = cluster.entries[0];
            const portraitKey = `${marker.scope}:${marker.id}`;
            const portrait = visiblePortrait(portraitKey, { id: marker.id, scope: marker.scope, name: marker.name });
            drawMapAvatar(context, point, portrait, text(marker.name, '?', 120).charAt(0).toUpperCase(), 6 * pixelRatio,
                palette.accent, palette.halo, pixelRatio);
            mapRenderedPoints.push({ type: 'character-life-npc', id: marker.id, scope: marker.scope, x: point.x, y: point.y, radius: 22 * pixelRatio });
        }
    }

    const current = currentMapPoint(state);
    const player = mapCanvasPoint(current.x, current.y, canvas.width, canvas.height);
    const playerPortraitKey = `player:${shortHash(state.player.portrait)}`;
    requestMapPortrait(playerPortraitKey, null, state.player.portrait, state.player.portraitView.mobile);
    const playerPortrait = mapPortraitRecord(playerPortraitKey);
    if (playerPortrait) playerPortrait.frame = state.player.portraitView.mobile;
    drawMapAvatar(context, player, playerPortrait, currentPersonaName(state).charAt(0).toUpperCase(), 9 * pixelRatio,
        palette.alt, palette.halo, pixelRatio);
    const zoomText = scope.querySelector('[data-map-zoom]');
    if (zoomText) zoomText.textContent = Math.round(mapView.scale * 100) + '%';
}

function flushScheduledMapDraw() {
    mapDrawTimer = 0;
    if (mapDrawFrame) return;
    mapDrawFrame = requestAnimationFrame(() => {
        mapDrawFrame = 0;
        mapLastDrawAt = globalThis.performance?.now?.() || Date.now();
        const panel = mapQueuedPanel;
        const state = mapQueuedState;
        mapQueuedPanel = null;
        mapQueuedState = null;
        drawWorldMap(panel || undefined, state || undefined);
    });
}

function mapCanRender(panel = document.querySelector('[data-panel="map"]')) {
    if (!panel || !document.getElementById('tretaresia-rpg-overlay')?.classList.contains('is-open')) return false;
    return mapFullscreen || (!panel.hidden && panel.classList.contains('is-active'));
}

function scheduleMapDraw(panel, state) {
    const targetPanel = panel || mapQueuedPanel || document.querySelector('[data-panel="map"]');
    if (!mapCanRender(targetPanel)) return;
    if (panel) mapQueuedPanel = panel;
    if (state) mapQueuedState = state;
    if (mapDrawFrame || mapDrawTimer) return;
    const now = globalThis.performance?.now?.() || Date.now();
    const wait = Math.max(0, MAP_DRAW_INTERVAL - (now - mapLastDrawAt));
    if (wait > 1) mapDrawTimer = globalThis.setTimeout(flushScheduledMapDraw, wait);
    else flushScheduledMapDraw();
}

function scheduleMapDetailRender() {
    scheduleMapDraw();
}

function suspendMapRendering(releaseTiles = false) {
    if (mapDrawFrame) cancelAnimationFrame(mapDrawFrame);
    if (mapDrawTimer) globalThis.clearTimeout(mapDrawTimer);
    mapDrawFrame = 0;
    mapDrawTimer = 0;
    mapQueuedPanel = null;
    mapQueuedState = null;
    mapInteracting = false;
    if (mapGestureBase?.canvas) {
        mapGestureBase.canvas.style.transform = '';
        mapGestureBase.canvas.classList.remove('is-compositing');
    }
    mapGestureBase = null;
    globalThis.clearTimeout(mapInteractionEndTimer);
    mapResizeObserver?.disconnect();
    mapResizeObserver = null;
    if (releaseTiles) {
        clearMapTileCache();
        mapTileContext = '';
    }
}

const textareaField = (label, name, value, rows = 4, extra = '') =>
    `<label class="tretaresia-field tretaresia-field-wide"><span>${html(tr(label))}</span><textarea name="${name}" rows="${rows}" ${extra}>${html(value)}</textarea></label>`;

function npcPortraitStyle(entry) {
    const frame = entry.portraitView;
    return `--portrait-desktop-x:${frame.desktop.x}%;--portrait-desktop-y:${frame.desktop.y}%;--portrait-desktop-zoom:${frame.desktop.zoom};--portrait-mobile-x:${frame.mobile.x}%;--portrait-mobile-y:${frame.mobile.y}%;--portrait-mobile-zoom:${frame.mobile.zoom}`;
}

function npcPortraitSlot(entry, className = 'tretaresia-npc-thumb') {
    return `<span class="${className}${entry.hasPortrait || entry.characterLifePortraitId ? ' has-photo' : ''}" data-npc-portrait="${html(entry.id)}" style="${npcPortraitStyle(entry)}">
        <span class="tretaresia-npc-initial">${html(entry.name.charAt(0).toUpperCase() || '?')}</span></span>`;
}

function npcMeterView(label, value, tone = 'accent') {
    return `<article class="tretaresia-npc-meter" data-tone="${tone}"><span><b>${html(tr(label))}</b><output>${value}%</output></span>
        <div><i style="width:${value}%"></i></div></article>`;
}

function socialNpcOptions(state, placeholder = 'Choose a friendly NPC') {
    const options = friendlyNpcs(state).map(entry => `<option value="${html(entry.id)}">${html(entry.name)} · ${html(entry.relationship)}</option>`).join('');
    return `<option value="">${html(tr(placeholder))}</option>${options}`;
}

function socialMemberCards(state, memberIds, removeAction = '', groupId = '', leaderId = 'player', roleMap = {}) {
    const ids = [...new Set(['player', ...(memberIds || []).filter(id => id !== 'player'), ...(leaderId && leaderId !== 'player' ? [leaderId] : [])])];
    return ids.length ? ids.map(id => `<article class="tretaresia-social-member${id === 'player' ? ' is-player' : ''}">
        <span class="tretaresia-social-member-icon"><i class="fa-solid ${id === 'player' ? 'fa-user' : 'fa-user-astronaut'}"></i></span>
        <span><strong>${html(socialMemberName(state, id))}</strong><small>${html(id === leaderId ? tr('Leader') : (roleMap[id] || state.npcs.find(entry => entry.id === id)?.relationship || tr('Member')))}</small></span>
        ${removeAction && id !== 'player' ? `<button type="button" data-action="${removeAction}" data-id="${html(id)}"${groupId ? ` data-group-id="${html(groupId)}"` : ''} title="${html(tr('Remove member'))}"><i class="fa-solid fa-user-minus"></i></button>` : '<i class="fa-solid fa-check social-member-check"></i>'}
    </article>`).join('') : `<div class="tretaresia-social-empty">${html(tr('No household members'))}</div>`;
}

function renderGroups(panel, state) {
    if (!panel) return;
    const party = state.social.party;
    const guilds = state.social.guilds;
    const partyMarkup = party ? `<article class="tretaresia-social-card tretaresia-party-card">
        <header><div><span class="tretaresia-eyebrow">${html(tr('Party management'))}</span><h4>${html(party.name)}</h4></div><button type="button" class="tretaresia-danger-button" data-action="dissolve-party"><i class="fa-solid fa-xmark"></i>${html(tr('Dissolve party'))}</button></header>
        <p class="tretaresia-social-description">${html(getSettings().language === 'th' ? 'ปาร์ตี้ไม่มีค่าก่อตั้ง สมาชิกทำงานร่วมกันในแชตปัจจุบัน' : 'Party membership is free and follows the current role-play chat.')}</p>
        <div class="tretaresia-party-strategy"><span><i class="fa-solid fa-people-arrows-left-right"></i>Formation</span><strong>${html(party.formation)}</strong><em>Shared funds: ${html(currencyLabel(party.sharedFunds))}</em></div>
        <div class="tretaresia-social-member-list">${socialMemberCards(state, party.memberIds, 'remove-party-member', '', party.leaderId, party.roles)}</div>
        <details class="tretaresia-editor"><summary><i class="fa-solid fa-chess-board"></i> Party formation & roles</summary><form data-form="party-strategy" class="tretaresia-form-grid">${input('Formation', 'formation', party.formation)}${party.memberIds.map(id => select(socialMemberName(state, id), `role-${id}`, PARTY_ROLES, party.roles[id] || 'Companion')).join('')}${input('Shared gold', 'sharedGold', party.sharedFunds.gold, 'number', 'min="0"')}${input('Shared silver', 'sharedSilver', party.sharedFunds.silver, 'number', 'min="0"')}${input('Shared copper', 'sharedCopper', party.sharedFunds.copper, 'number', 'min="0"')}<button class="tretaresia-primary-button tretaresia-form-submit" type="submit">Save formation</button></form></details>
        <form data-form="party-invite" class="tretaresia-social-invite"><input type="hidden" name="partyId" value="${html(party.id)}"><label class="tretaresia-field"><span>${html(tr('Friendly NPCs'))}</span><select name="npcId" required>${socialNpcOptions(state)}</select></label><button class="tretaresia-primary-button" type="submit"><i class="fa-solid fa-user-plus"></i>${html(tr('Invite to party'))}</button></form>
    </article>` : `<article class="tretaresia-social-card"><header><div><span class="tretaresia-eyebrow">${html(tr('Party management'))}</span><h4>${html(tr('No active party'))}</h4></div><i class="fa-solid fa-people-group tretaresia-social-card-icon"></i></header>
        <p class="tretaresia-social-description">${html(getSettings().language === 'th' ? 'สร้างปาร์ตี้เพื่อรวม NPC ฝ่ายมิตรไว้ร่วมเดินทางหรือทำภารกิจ' : 'Create a party to organize friendly NPCs for travel and missions.')}</p>
        <form data-form="party-create" class="tretaresia-social-form">${input('Party name', 'name', '')}<button class="tretaresia-primary-button" type="submit"><i class="fa-solid fa-plus"></i>${html(tr('Create party'))}</button></form>
    </article>`;
    const guildCards = guilds.length ? guilds.map(guild => `<article class="tretaresia-social-card tretaresia-guild-card">
        <header><div><span class="tretaresia-eyebrow">${html(tr('Guild management'))}</span><h4>${html(guild.name)}</h4><small>${html(guild.rank)} · Lv.${guild.level} · ${guild.memberIds.length + 1} ${html(tr('Members').toLowerCase())}</small></div><button type="button" class="tretaresia-danger-button" data-action="dissolve-guild" data-id="${html(guild.id)}"><i class="fa-solid fa-xmark"></i>${html(tr('Dissolve guild'))}</button></header>
        ${guild.description ? `<p class="tretaresia-social-description">${html(guild.description)}</p>` : ''}<div class="tretaresia-guild-progress"><article><span>Reputation</span><strong>${guild.reputation}</strong></article><article><span>Headquarters</span><strong>${html(guild.headquarters)}</strong></article><article><span>Alliances</span><strong>${guild.alliances.length}</strong></article><article><span>Enemies</span><strong>${guild.enemies.length}</strong></article><article><span>Guild quests</span><strong>${guild.quests.length}</strong></article></div><div class="tretaresia-social-treasury"><span><i class="fa-solid fa-coins"></i>${html(tr('Guild treasury'))}</span><strong>${html(currencyLabel(guild.treasury))}</strong></div>
        <div class="tretaresia-social-member-list">${socialMemberCards(state, guild.memberIds, 'remove-guild-member', guild.id, guild.leaderId)}</div>
        <form data-form="guild-invite" class="tretaresia-social-invite"><input type="hidden" name="guildId" value="${html(guild.id)}"><label class="tretaresia-field"><span>${html(tr('Friendly NPCs'))}</span><select name="npcId" required>${socialNpcOptions(state)}</select></label><button class="tretaresia-primary-button" type="submit"><i class="fa-solid fa-user-plus"></i>${html(tr('Invite to guild'))}</button></form>
        <details class="tretaresia-editor"><summary><i class="fa-solid fa-landmark"></i> Guild progression</summary><form data-form="guild-progression" class="tretaresia-form-grid"><input type="hidden" name="guildId" value="${html(guild.id)}">${input('Guild rank', 'rank', guild.rank)}${input('Level', 'level', guild.level, 'number', 'min="1"')}${input('Reputation', 'reputation', guild.reputation, 'number')}${input('Headquarters', 'headquarters', guild.headquarters)}${input('Alliances', 'alliances', guild.alliances.join(', '))}${input('Enemies', 'enemies', guild.enemies.join(', '))}${input('Guild quests', 'quests', guild.quests.join(', '))}<button class="tretaresia-primary-button tretaresia-form-submit" type="submit">Save guild progression</button></form></details>
    </article>`).join('') : `<article class="tretaresia-social-card tretaresia-social-empty-card"><i class="fa-solid fa-landmark-dome"></i><strong>${html(tr('No guilds yet'))}</strong><p>${html(getSettings().language === 'th' ? 'กิลด์ต้องเสียค่าก่อตั้งเป็นเงิน 10 เหรียญทอง' : 'A guild costs 10 gold to establish.')}</p></article>`;
    panel.innerHTML = `${heading('Party & Guild', `${party ? 1 : 0} ${tr('party')} · ${guilds.length} ${tr('guilds')}`, 'fa-solid fa-people-group')}
        <p class="tretaresia-social-note"><i class="fa-solid fa-circle-info"></i>${html(tr('Friendly NPCs only'))} · ${html(tr('Hostile NPCs are excluded from the list.'))}</p>
        <div class="tretaresia-social-grid">${partyMarkup}<section class="tretaresia-social-stack"><div class="tretaresia-social-subheading"><span><i class="fa-solid fa-landmark"></i>${html(tr('Guild management'))}</span><small>${html(tr('Current balance'))}: ${html(currencyLabel(state.progression.currency))}</small></div>
        <article class="tretaresia-social-card tretaresia-guild-create"><form data-form="guild-create" class="tretaresia-social-form">${input('Guild name', 'name', '')}${input('Guild description', 'description', '')}<div class="tretaresia-fee-line"><span>${html(tr('Guild creation fee'))}</span><strong>${html(currencyLabel(GUILD_CREATION_FEE))}</strong></div><button class="tretaresia-primary-button" type="submit"><i class="fa-solid fa-plus"></i>${html(tr('Create guild'))}</button></form></article>${guildCards}</section></div>`;
}

function renderHousehold(panel, state) {
    if (!panel) return;
    const household = state.social.household;
    const members = household.members.length ? household.members.map(member => `<article class="tretaresia-household-member"><span class="tretaresia-social-member-icon"><i class="fa-solid fa-user-group"></i></span><span><strong>${html(member.name)}</strong><small>${html(member.role)}${member.notes ? ` · ${html(member.notes)}` : ''}</small></span><button type="button" data-action="remove-household-member" data-id="${html(member.id)}" title="${html(tr('Remove member'))}"><i class="fa-solid fa-user-minus"></i></button></article>`).join('') : `<div class="tretaresia-social-empty">${html(tr('No household members'))}</div>`;
    panel.innerHTML = `${heading('Household', `${household.members.length} ${tr('Members').toLowerCase()}`, 'fa-solid fa-house-chimney-user')}
        <p class="tretaresia-social-note"><i class="fa-solid fa-heart"></i>${html(getSettings().language === 'th' ? 'ใช้ดูสมาชิกในครอบครัวของผู้เล่น เช่น คู่ครอง ลูก พ่อ แม่ และญาติ' : 'Track the player\'s partner, children, parents, relatives, and other family bonds.')}</p>
        <section class="tretaresia-household-card"><form data-form="household-save" class="tretaresia-household-header"><div><span class="tretaresia-eyebrow">${html(tr('Household management'))}</span><h4>${html(household.name)}</h4></div>${input('Household name', 'name', household.name)}<button class="tretaresia-secondary-button" type="submit"><i class="fa-solid fa-floppy-disk"></i>${html(tr('Save household'))}</button></form>
        <div class="tretaresia-household-list"><article class="tretaresia-household-member is-player"><span class="tretaresia-social-member-icon"><i class="fa-solid fa-user"></i></span><span><strong>${html(currentPersonaName(state))}</strong><small>${html(getSettings().language === 'th' ? 'เจ้าของครอบครัว' : 'Household head')}</small></span><i class="fa-solid fa-check social-member-check"></i></article>${members}</div><form data-form="household-add" class="tretaresia-social-invite"><label class="tretaresia-field"><span>${html(tr('Friendly NPCs'))}</span><select name="npcId" required>${socialNpcOptions(state)}</select></label>${select('Family role', 'role', HOUSEHOLD_ROLES, 'Other')}${input('Notes', 'notes', '')}<button class="tretaresia-primary-button" type="submit"><i class="fa-solid fa-user-plus"></i>${html(tr('Add household member'))}</button></form></section>`;
}

function npcLifeModeField(selected = 'Active') {
    const labels = { Active: 'Active life', 'Story only': 'Story only', Paused: 'Paused' };
    return `<label class="tretaresia-field"><span>${html(tr('Life mode'))}</span><select name="lifeMode">${Object.entries(labels).map(([value, label]) =>
        `<option value="${html(value)}"${value === selected ? ' selected' : ''}>${html(tr(label))}</option>`).join('')}</select></label>`;
}

function renderNpcs(panel, state) {
    if (!panel) return;
    const visibleNpcs = friendlyNpcs(state);
    if (!visibleNpcs.some(entry => entry.id === selectedNpcId)) selectedNpcId = visibleNpcs[0]?.id || null;
    const selected = visibleNpcs.find(entry => entry.id === selectedNpcId);
    const linkedContact = selected ? state.contacts.find(entry => entry.id === selected.contactId || entry.npcId === selected.id) : null;
    const list = visibleNpcs.length ? visibleNpcs.map(entry => `<article class="tretaresia-npc-list-row${entry.id === selectedNpcId ? ' is-active' : ''}">
        <button type="button" data-action="select-npc" data-id="${html(entry.id)}">${npcPortraitSlot(entry)}<span><strong>${html(entry.name)}</strong>
        <em>${html(entry.title || entry.faction || tr('No description'))}</em><small>${html(entry.relationship)} · ${html(entry.location)}</small></span></button>
        <button type="button" data-action="delete-npc" data-id="${html(entry.id)}" title="${html(tr('Remove'))}"><i class="fa-solid fa-trash"></i></button></article>`).join('')
        : `<div class="tretaresia-mail-empty large"><i class="fa-solid fa-users-viewfinder"></i><p>${html(tr('Only friendly NPCs appear here.'))}</p></div>`;
    const detail = selected ? renderNpcDossier(selected, linkedContact) : `<section class="tretaresia-npc-empty-dossier"><i class="fa-solid fa-address-card"></i><p>${html(tr('Only friendly NPCs appear here.'))}</p></section>`;
    panel.innerHTML = `${heading('NPC Codex', `${visibleNpcs.length} ${tr('Friendly NPCs').toLowerCase()}`, 'fa-solid fa-users')}
        <p class="tretaresia-social-note"><i class="fa-solid fa-shield-heart"></i>${html(tr('Hostile NPCs are excluded from the list.'))}</p>
        <div class="tretaresia-npc-layout"><aside class="tretaresia-npc-index" data-rpg-scroll-key="npc-index"><div class="tretaresia-section-label"><i class="fa-solid fa-list"></i><span>${html(tr('NPCs'))}</span></div>
            <div class="tretaresia-npc-list" data-rpg-scroll-key="npc-list">${list}</div><details class="tretaresia-editor tretaresia-npc-add"><summary><i class="fa-solid fa-user-plus"></i> ${html(tr('Add NPC'))}</summary>
            <form data-form="npc-new" class="tretaresia-form-grid">${input('Name', 'name', '')}${input('Title', 'title', '')}${input('Faction', 'faction', '')}${input('Relationship', 'relationship', 'Acquaintance')}${input('Current location', 'location', 'Unknown')}${npcLifeModeField('Active')}
            <label class="tretaresia-checkbox-field"><input type="checkbox" name="mapVisible"><span>${html(tr('Show on World Map'))}</span></label>
            <label class="tretaresia-checkbox-field"><input type="checkbox" name="linkContact" value="yes"><span>${html(tr('Link to Mailbox'))}</span></label>
            <button class="tretaresia-primary-button tretaresia-form-submit" type="submit">${html(tr('Add NPC'))}</button></form></details></aside>
            <div class="tretaresia-npc-dossier" data-rpg-scroll-key="npc-dossier">${detail}</div></div>`;
    void hydrateNpcPortraits(panel, state);
}

function renderNpcDossier(entry, linkedContact) {
    const state = getState();
    const playerProfile = playerCombatProfile(state);
    const npcProfileValues = npcCombatProfile(entry);
    const comparison = combatComparison(playerProfile, npcProfileValues);
    const knownStat = value => number(value, 0, 0, 999999) > 0 ? number(value, 0, 0, 999999) : '—';
    const relationshipMeters = [
        ['Affection', entry.affection, 'rose'], ['Trust', entry.trust, 'blue'], ['Loyalty', entry.loyalty, 'gold'],
        ['Fear', entry.fear, 'violet'], ['Corruption', entry.corruption, 'dark'], ['Lust', entry.lust, 'crimson'],
    ];
    const characterLifeSkills = characterLifeSkillsForOwner({ id: entry.characterLifeId, name: entry.name });
    const linkedNames = new Set(characterLifeSkills.map(skill => text(skill?.name).toLocaleLowerCase()));
    const rpgAbilities = entry.abilities.filter(ability => !linkedNames.has(ability.name.toLocaleLowerCase()));
    const abilityCards = rpgAbilities.map(ability => `<article class="tretaresia-npc-ability"><div><span>${html(ability.category)}</span><strong>${html(ability.name)}</strong>
        <p>${html(ability.description || tr('No description'))}</p></div><div class="tretaresia-npc-ability-rank"><b>${html(ability.level)}</b><span><i style="width:${ability.proficiency}%"></i></span><small>${ability.proficiency}%</small></div>
        <button type="button" data-action="delete-npc-ability" data-id="${html(ability.id)}" data-npc-id="${html(entry.id)}"><i class="fa-solid fa-trash"></i></button></article>`).join('');
    const linkedAbilityCards = characterLifeSkills.map(skill => `<article class="tretaresia-npc-ability is-character-life-linked"><div><span>${html(skill.category || 'General')} · Character Life</span><strong>${html(skill.name)}</strong>
        <p>${html(skill.description || tr('No description'))}</p></div><div class="tretaresia-npc-ability-rank"><b>${html(skill.rank || 'Unranked')}</b><i class="fa-solid fa-link"></i></div></article>`).join('');
    const abilities = abilityCards || linkedAbilityCards ? linkedAbilityCards + abilityCards : empty('Skills learned during role-play will appear here.');
    const diary = entry.diary.length ? [...entry.diary].reverse().map(note => `<article class="tretaresia-diary-entry"><span><i class="fa-solid fa-feather-pointed"></i>${html(note.mood || tr('Diary'))}<small>${html(formatDate(note.at))}</small></span>
        <p>${html(note.text).replaceAll('\n', '<br>')}</p><button type="button" data-action="delete-npc-diary" data-id="${html(note.id)}" data-npc-id="${html(entry.id)}"><i class="fa-solid fa-trash"></i></button></article>`).join('')
        : `<div class="tretaresia-mail-empty"><i class="fa-solid fa-feather"></i><p>${getSettings().language === 'th' ? 'ยังไม่มีความคิดที่ถูกบันทึก' : 'No private thoughts have been recorded.'}</p></div>`;
    const customMeters = entry.customMeters.map(meterEntry => `<article class="tretaresia-custom-meter">${npcMeterView(meterEntry.name, meterEntry.value)}
        <button type="button" data-action="delete-npc-meter" data-id="${html(meterEntry.id)}" data-npc-id="${html(entry.id)}"><i class="fa-solid fa-trash"></i></button></article>`).join('');
    return `<section class="tretaresia-npc-hero"><button class="tretaresia-npc-avatar" type="button" data-action="${entry.hasPortrait ? 'open-npc-portrait-editor' : 'choose-npc-portrait'}" data-id="${html(entry.id)}">
        ${npcPortraitSlot(entry, 'tretaresia-npc-portrait')}<span class="tretaresia-avatar-edit"><i class="fa-solid ${entry.hasPortrait ? 'fa-crop-simple' : 'fa-camera'}"></i></span></button>
        <div><span class="tretaresia-eyebrow">NPC dossier</span><h3>${html(entry.name)}</h3><p>${html(entry.title || entry.occupation || entry.relationship)}</p>
        <div class="tretaresia-identity-chips"><span><i class="fa-solid fa-dna"></i>${html(entry.race)}</span><span><i class="fa-solid fa-flag"></i>${html(entry.faction || 'Unaffiliated')}</span>
        <span><i class="fa-solid fa-location-dot"></i>${html(entry.location)}</span></div></div>
        <div class="tretaresia-npc-hero-actions">${linkedContact ? `<button type="button" class="tretaresia-small-button" data-action="open-npc-mailbox" data-id="${html(entry.id)}"><i class="fa-solid fa-envelope"></i>${html(tr('Open Mailbox'))}</button>`
            : `<button type="button" class="tretaresia-small-button" data-action="link-npc-contact" data-id="${html(entry.id)}"><i class="fa-solid fa-address-book"></i>${html(tr('Link to Mailbox'))}</button>`}
        ${entry.hasPortrait ? `<button type="button" class="tretaresia-small-button" data-action="remove-npc-portrait" data-id="${html(entry.id)}"><i class="fa-solid fa-image-slash"></i>${html(tr('Remove portrait'))}</button>` : ''}</div></section>
        <section class="tretaresia-npc-meter-grid">${relationshipMeters.map(args => npcMeterView(...args)).join('')}${customMeters}</section>
        <div class="tretaresia-npc-info-grid"><article class="tretaresia-card"><div class="tretaresia-card-title"><span>${html(tr('Relationship state'))}</span><i class="fa-solid fa-heart"></i></div><dl class="tretaresia-fact-list">
            <div><dt>${html(tr('Relationship'))}</dt><dd>${html(entry.relationship)}</dd></div><div><dt>${html(tr('Current location'))}</dt><dd>${html(entry.location)}</dd></div>
            <div><dt>${html(tr('Activity'))}</dt><dd>${html(entry.activity)}</dd></div><div><dt>${html(tr('Life mode'))}</dt><dd>${html(tr(entry.lifeMode === 'Active' ? 'Active life' : entry.lifeMode))}</dd></div>
            <div><dt>${html(tr('Last seen'))}</dt><dd>${html(entry.lastSeen || 'Unknown')}</dd></div><div><dt>${html(tr('Alignment'))}</dt><dd>${html(entry.alignment || 'Unknown')}</dd></div></dl>
            ${entry.relationshipState ? `<p class="tretaresia-npc-note">${html(entry.relationshipState)}</p>` : ''}</article>
        <article class="tretaresia-card"><div class="tretaresia-card-title"><span>${html(tr('Family & bonds'))}</span><i class="fa-solid fa-ring"></i></div><dl class="tretaresia-fact-list">
            <div><dt>${html(tr('Marital status'))}</dt><dd>${html(entry.maritalStatus)}</dd></div><div><dt>${html(tr('Partner'))}</dt><dd>${html(entry.partner || 'None')}</dd></div>
            <div class="tretaresia-fact-wide"><dt>${html(tr('Children'))}</dt><dd>${html(entry.children || 'None')}</dd></div></dl></article></div>
        <section class="tretaresia-npc-stats"><div class="tretaresia-section-label"><i class="fa-solid fa-chart-simple"></i><span>${html(tr('Core stats'))}</span></div><div>
            <article><span>LV</span><strong>${knownStat(entry.stats.level)}</strong><small>${html(entry.stats.rank)}</small></article>
            <article><span>HP</span><strong>${knownStat(entry.stats.hp)}</strong></article><article><span>MP</span><strong>${knownStat(entry.stats.mp)}</strong></article><article><span>STA</span><strong>${knownStat(entry.stats.stamina)}</strong></article>
            ${NPC_CORE_STATS.map(stat => `<article><span>${html(tr(stat.name))}</span><strong>${knownStat(entry.stats[stat.id])}</strong></article>`).join('')}</div>
            <small class="tretaresia-npc-stat-note"><i class="fa-solid fa-eye-slash"></i>${html(tr('A dash means the stat has not been revealed yet.'))}</small></section>
        <section class="tretaresia-comparison-card" data-tone="${html(comparison.tone)}"><div class="tretaresia-section-label"><i class="fa-solid fa-scale-balanced"></i><span>${html(tr('Combat comparison'))}</span><b>${html(comparison.label)}</b></div><div class="tretaresia-comparison-grid">${COMBAT_DIMENSIONS.map(([key, label]) => {
            const npcValue = npcProfileValues[key];
            const playerValue = playerProfile[key];
            const result = npcValue === null ? 'unknown' : playerValue > npcValue + 7 ? 'player' : npcValue > playerValue + 7 ? 'npc' : 'even';
            return `<article data-result="${result}"><span>${html(label)}</span><div><b>${playerValue}</b><i></i><b>${npcValue === null ? '?' : npcValue}</b></div><small>${result === 'unknown' ? 'Not revealed' : result === 'player' ? 'Player advantage' : result === 'npc' ? `${html(entry.name)} advantage` : 'Even'}</small></article>`;
        }).join('')}</div><footer><span>${html(currentPersonaName(state))}</span><i class="fa-solid fa-bolt"></i><span>${html(entry.name)}</span></footer></section>
        <section class="tretaresia-knowledge-card"><div class="tretaresia-section-label"><i class="fa-solid fa-brain"></i><span>${html(tr('NPC knowledge'))}</span><b>${entry.knowledge.length}</b></div><p><i class="fa-solid fa-shield-halved"></i>Only witnessed, explicitly told, publicly observable, or role-credible facts belong here.</p><div>${entry.knowledge.length ? [...entry.knowledge].reverse().map(fact => `<article><span><b>${html(fact.fact)}</b><small>${html(fact.source)} · confidence ${fact.confidence}% · Day ${fact.learnedDay}</small></span>${fact.private ? '<i class="fa-solid fa-lock"></i>' : '<i class="fa-solid fa-eye"></i>'}</article>`).join('') : `<span class="tretaresia-knowledge-empty"><i class="fa-solid fa-eye-slash"></i>No confirmed player knowledge recorded for this NPC</span>`}</div></section>
        <section class="tretaresia-npc-abilities"><div class="tretaresia-section-label"><i class="fa-solid fa-sparkles"></i><span>${html(tr('Abilities'))}</span></div><div class="tretaresia-npc-ability-list">${abilities}</div>
            <details class="tretaresia-editor"><summary><i class="fa-solid fa-plus"></i> ${html(tr('Add ability'))}</summary><form data-form="npc-ability" class="tretaresia-form-grid"><input type="hidden" name="npcId" value="${html(entry.id)}">
                ${input('Ability name', 'name', '')}${input('Category', 'category', 'General')}${input('Ability level', 'level', 'Beginner')}${input('Proficiency', 'proficiency', 0, 'number', 'min="0" max="100"')}
                ${input('Description', 'description', '')}<button class="tretaresia-primary-button tretaresia-form-submit" type="submit">${html(tr('Add ability'))}</button></form></details></section>
        <section class="tretaresia-npc-diary"><div class="tretaresia-section-label"><i class="fa-solid fa-book"></i><span>${html(tr('Diary'))}</span></div><div class="tretaresia-diary-list">${diary}</div>
            <details class="tretaresia-editor"><summary><i class="fa-solid fa-feather"></i> ${html(tr('Add diary entry'))}</summary><form data-form="npc-diary" class="tretaresia-form-grid"><input type="hidden" name="npcId" value="${html(entry.id)}">
                ${input('Mood', 'mood', '')}${textareaField('Thought', 'text', '', 4, 'maxlength="1200" required')}<button class="tretaresia-primary-button tretaresia-form-submit" type="submit">${html(tr('Add diary entry'))}</button></form></details></section>
        <details class="tretaresia-editor"><summary><i class="fa-solid fa-gauge"></i> ${html(tr('Add custom meter'))}</summary><form data-form="npc-meter" class="tretaresia-form-grid"><input type="hidden" name="npcId" value="${html(entry.id)}">
            ${input('Name', 'name', '')}${input('Proficiency', 'value', 0, 'number', 'min="0" max="100"')}<button class="tretaresia-primary-button tretaresia-form-submit" type="submit">${html(tr('Add custom meter'))}</button></form></details>
        <details class="tretaresia-editor tretaresia-npc-edit"><summary><i class="fa-solid fa-pen"></i> ${html(tr('Edit NPC'))}</summary><form data-form="npc-profile" class="tretaresia-form-grid"><input type="hidden" name="id" value="${html(entry.id)}">
            ${input('Name', 'name', entry.name)}${input('Title', 'title', entry.title)}${input('Race', 'race', entry.race)}${input('Age', 'age', entry.age)}${input('Gender', 'gender', entry.gender)}${input('Occupation', 'occupation', entry.occupation)}
            ${input('Faction', 'faction', entry.faction)}${input('Alignment', 'alignment', entry.alignment)}${input('Relationship', 'relationship', entry.relationship)}${input('Current location', 'location', entry.location)}
            ${npcLifeModeField(entry.lifeMode)}${input('Activity', 'activity', entry.activity)}
            ${input('World map X', 'mapX', entry.mapX ?? '', 'number', `min="0" max="${WORLD_MAP_WIDTH}" step="1"`)}${input('World map Y', 'mapY', entry.mapY ?? '', 'number', `min="0" max="${WORLD_MAP_HEIGHT}" step="1"`)}
            <label class="tretaresia-checkbox-field"><input type="checkbox" name="mapVisible"${entry.mapVisible ? ' checked' : ''}><span>${html(tr('Show on World Map'))}</span></label>
            ${input('Last seen', 'lastSeen', entry.lastSeen)}${input('Marital status', 'maritalStatus', entry.maritalStatus)}${input('Partner', 'partner', entry.partner)}${input('Children', 'children', entry.children)}
            ${input('Affection', 'affection', entry.affection, 'number', 'min="0" max="100"')}${input('Trust', 'trust', entry.trust, 'number', 'min="0" max="100"')}${input('Loyalty', 'loyalty', entry.loyalty, 'number', 'min="0" max="100"')}${input('Fear', 'fear', entry.fear, 'number', 'min="0" max="100"')}
            ${input('Corruption', 'corruption', entry.corruption, 'number', 'min="0" max="100"')}${input('Lust', 'lust', entry.lust, 'number', 'min="0" max="100"')}${input('Level', 'level', entry.stats.level, 'number', 'min="0"')}${input('Rank', 'rank', entry.stats.rank)}
            ${input('HP', 'hp', entry.stats.hp, 'number', 'min="0"')}${input('MP', 'mp', entry.stats.mp, 'number', 'min="0"')}${input('Stamina', 'stamina', entry.stats.stamina, 'number', 'min="0"')}
            ${NPC_CORE_STATS.map(stat => input(stat.name, stat.id, entry.stats[stat.id], 'number', 'min="0"')).join('')}${textareaField('Relationship state', 'relationshipState', entry.relationshipState, 3)}${textareaField('Notes', 'notes', entry.notes, 4)}
            <button class="tretaresia-primary-button tretaresia-form-submit" type="submit">${html(tr('Save NPC'))}</button></form></details>`;
}

function npcPortraitStorageKey(npcId, chatId = SillyTavern.getContext().getCurrentChatId?.() || 'no-chat') {
    return `tretaresia-rpg:npc-portrait:${chatId}:${npcId}`;
}

function clearNpcPortraitObjectUrls() {
    npcPortraitObjectUrls.forEach(url => URL.revokeObjectURL(url));
    npcPortraitObjectUrls.clear();
}

async function hydrateNpcPortraits(root, state = getState()) {
    if (!root) return;
    const token = ++npcPortraitRenderToken;
    clearNpcPortraitObjectUrls();
    const store = SillyTavern.libs?.localforage;
    const nodes = [...root.querySelectorAll('[data-npc-portrait]')];
    await Promise.all(nodes.map(async node => {
        const entry = state.npcs.find(value => value.id === node.dataset.npcPortrait);
        if (!entry) return;
        try {
            let blob = null;
            const bridge = characterLifeBridge();
            if (bridge && (entry.characterLifeId || entry.characterLifePortraitId || entry.name)) {
                // The selected dossier needs the original asset at phone width.
                // Roster cards stay on Character Life's small cached thumbnail so
                // opening the NPC tab does not decode every full-size portrait.
                const wantsOriginal = node.classList.contains('tretaresia-npc-portrait');
                const linked = await bridge.portrait?.({
                    id: entry.characterLifeId,
                    scope: entry.characterLifeScope,
                    name: entry.name,
                    ...(wantsOriginal ? { original: true } : {}),
                });
                if (linked?.blob instanceof Blob) {
                    blob = linked.blob;
                    const frame = linked.frame || {};
                    for (const mode of ['desktop', 'mobile']) {
                        node.style.setProperty(`--portrait-${mode}-x`, `${number(frame.x, 50, 0, 100)}%`);
                        node.style.setProperty(`--portrait-${mode}-y`, `${number(frame.y, 18, 0, 100)}%`);
                        node.style.setProperty(`--portrait-${mode}-zoom`, number(frame.zoom, 1, 1, 3));
                    }
                }
            }
            if (!blob && entry.hasPortrait && store) blob = await store.getItem(npcPortraitStorageKey(entry.id));
            if (!(blob instanceof Blob) || token !== npcPortraitRenderToken || !node.isConnected) return;
            const url = URL.createObjectURL(blob);
            npcPortraitObjectUrls.set(`${entry.id}:${npcPortraitObjectUrls.size}`, url);
            const image = document.createElement('img');
            image.src = url;
            image.alt = `${entry.name} portrait`;
            node.querySelector('img')?.remove();
            node.appendChild(image);
            node.classList.add('has-photo');
        } catch (error) {
            console.warn('[Tretaresia RPG] Could not load an NPC portrait.', error);
        }
    }));
}

function resizeImageBlob(file) {
    if (!file?.type?.startsWith('image/')) return Promise.reject(new Error('Choose an image file.'));
    if (file.size > 12 * 1024 * 1024) return Promise.reject(new Error('The image must be smaller than 12 MB.'));
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('The image could not be read.'));
        reader.onload = () => {
            const image = new Image();
            image.onerror = () => reject(new Error('This device could not decode the image. Try JPG, PNG, or WebP.'));
            image.onload = () => {
                const maxSide = 1400;
                const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
                canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
                const context = canvas.getContext('2d');
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The image could not be compressed.')), 'image/jpeg', .84);
            };
            image.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

async function openNpcPortraitEditor(npcId) {
    const state = getState();
    const entry = state.npcs.find(value => value.id === npcId);
    const modal = document.getElementById('tretaresia-portrait-editor');
    if (!entry || !modal) return;
    if (!entry.hasPortrait) {
        const inputElement = document.getElementById('tretaresia-npc-avatar-input');
        if (inputElement) inputElement.dataset.npcId = entry.id;
        inputElement?.click();
        return;
    }
    const blob = await SillyTavern.libs?.localforage?.getItem(npcPortraitStorageKey(entry.id));
    if (!(blob instanceof Blob)) {
        notify('warning', getSettings().language === 'th' ? 'รูป NPC นี้ไม่ได้อยู่ในอุปกรณ์นี้ กรุณาเลือกไฟล์ใหม่' : 'This NPC portrait is not stored on this device. Choose it again here.');
        const inputElement = document.getElementById('tretaresia-npc-avatar-input');
        if (inputElement) inputElement.dataset.npcId = entry.id;
        inputElement?.click();
        return;
    }
    if (npcEditorObjectUrl) URL.revokeObjectURL(npcEditorObjectUrl);
    npcEditorObjectUrl = URL.createObjectURL(blob);
    const frame = entry.portraitView;
    modal.hidden = false;
    modal.innerHTML = `<button class="tretaresia-submodal-backdrop" type="button" data-action="close-portrait-editor" aria-label="${html(tr('Close'))}"></button>
        <article class="tretaresia-portrait-editor-card"><header><div><span>NPC portrait · ${html(entry.name)}</span><h3>${html(tr('Adjust portrait'))}</h3></div>
        <button type="button" data-action="close-portrait-editor"><i class="fa-solid fa-xmark"></i></button></header>
        <form data-form="npc-portrait-frame"><input type="hidden" name="npcId" value="${html(entry.id)}"><div class="tretaresia-portrait-previews">
        ${portraitPreview('Desktop framing', 'desktop', frame.desktop, npcEditorObjectUrl)}${portraitPreview('Phone framing', 'mobile', frame.mobile, npcEditorObjectUrl)}</div>
        <footer><button type="button" class="tretaresia-secondary-button" data-action="choose-npc-portrait" data-id="${html(entry.id)}"><i class="fa-solid fa-image"></i>${html(tr('Choose profile picture'))}</button>
        <button class="tretaresia-primary-button" type="submit"><i class="fa-solid fa-crop-simple"></i>${html(tr('Save framing'))}</button></footer></form></article>`;
}

function renderMailbox(panel, state) {
    if (!panel) return;
    const unread = state.letters.filter(entry => entry.direction === 'incoming' && entry.status === 'unread').length;
    const contactOptions = state.contacts.map(entry => `<option value="${html(entry.id)}">${html(entry.name)}</option>`).join('');
    const sortedLetters = [...state.letters].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    panel.innerHTML = `${heading('Mailbox', `${unread} ${tr('Unread').toLowerCase()} · ${state.contacts.length} ${tr('Contacts').toLowerCase()}`, 'fa-solid fa-envelope-open-text')}
        <div class="tretaresia-mail-layout"><section class="tretaresia-contact-rail"><div class="tretaresia-section-label"><i class="fa-solid fa-address-book"></i><span>${html(tr('Contacts'))}</span></div>
            <div class="tretaresia-contact-list">${state.contacts.length ? state.contacts.map(entry => {
                const linkedNpc = state.npcs.find(value => value.id === entry.npcId) || state.npcs.find(value => value.name.toLocaleLowerCase() === entry.name.toLocaleLowerCase());
                return `<article class="tretaresia-contact-card"><button type="button" class="tretaresia-contact-open" data-action="open-contact-npc" data-id="${html(entry.id)}">
                    ${linkedNpc ? npcPortraitSlot(linkedNpc, 'tretaresia-contact-sigil') : `<span class="tretaresia-contact-sigil"><span class="tretaresia-npc-initial">${html(entry.name.charAt(0).toUpperCase())}</span></span>`}
                    <span><strong>${html(entry.name)}</strong><span>${html(entry.title || entry.affiliation || entry.relationship)}</span><small>${html(entry.relationship)}</small></span></button>
                    <button type="button" data-action="delete-contact" data-id="${html(entry.id)}" title="${html(tr('Remove'))}"><i class="fa-solid fa-user-xmark"></i></button></article>`;
            }).join('') : `<div class="tretaresia-mail-empty"><i class="fa-solid fa-feather"></i><p>${getSettings().language === 'th' ? 'NPC ที่รู้จักระหว่างโรลเพลย์จะปรากฏที่นี่' : 'NPCs discovered during role-play will appear here.'}</p></div>`}</div>
            <details class="tretaresia-editor"><summary><i class="fa-solid fa-user-plus"></i> ${html(tr('Add contact'))}</summary>
                <form data-form="contact" class="tretaresia-form-grid">${input('Name', 'name', '')}${input('Title', 'title', '')}${input('Affiliation', 'affiliation', '')}
                    ${input('Relationship', 'relationship', 'Acquaintance')}${input('Notes', 'notes', '')}<button class="tretaresia-primary-button tretaresia-form-submit" type="submit">${html(tr('Add contact'))}</button></form></details></section>
            <section class="tretaresia-letter-desk"><div class="tretaresia-letter-desk-head"><div class="tretaresia-section-label"><i class="fa-solid fa-inbox"></i><span>${html(tr('Letters'))}</span></div>
                ${state.letters.length ? `<button type="button" class="tretaresia-small-button" data-action="clear-letters"><i class="fa-solid fa-broom"></i>${html(tr('Clear letter'))}</button>` : ''}</div>
                <div class="tretaresia-letter-list">${sortedLetters.length ? sortedLetters.map(entry => `<article class="tretaresia-letter-row${entry.status === 'unread' ? ' is-unread' : ''}" data-direction="${entry.direction}">
                    <button class="tretaresia-letter-open" type="button" data-action="open-letter" data-id="${html(entry.id)}"><span class="tretaresia-wax-seal"><i class="fa-solid ${entry.direction === 'incoming' ? 'fa-envelope' : 'fa-paper-plane'}"></i></span>
                    <span class="tretaresia-letter-summary"><b>${html(entry.subject)}</b><em>${html(entry.direction === 'incoming' ? entry.fromName : entry.toName)}</em>
                    <small>${html(formatDate(entry.createdAt))}</small></span>${entry.status === 'unread' ? `<i class="tretaresia-unread-dot" title="${html(tr('Unread'))}"></i>` : ''}</button>
                    <button type="button" data-action="delete-letter" data-id="${html(entry.id)}" title="${html(tr('Remove'))}"><i class="fa-solid fa-trash"></i></button></article>`).join('') : `<div class="tretaresia-mail-empty large"><i class="fa-regular fa-envelope-open"></i><p>${getSettings().language === 'th' ? 'ยังไม่มีจดหมายในแชทนี้' : 'No letters have arrived in this chat.'}</p></div>`}</div>
                <details class="tretaresia-editor tretaresia-compose-editor"><summary><i class="fa-solid fa-feather-pointed"></i> ${html(tr('Compose letter'))}</summary>
                    <form data-form="letter" class="tretaresia-form-grid"><label class="tretaresia-field"><span>${html(tr('Contacts'))}</span>${state.contacts.length
                        ? `<select name="contactId" required><option value="">—</option>${contactOptions}</select>`
                        : `<input name="recipientName" maxlength="120" required placeholder="NPC name">`}</label>
                        ${input('Subject', 'subject', '')}<label class="tretaresia-field tretaresia-field-wide"><span>${html(tr('Message'))}</span><textarea name="body" rows="6" maxlength="5000" required></textarea></label>
                        <button class="tretaresia-primary-button tretaresia-form-submit" type="submit"><i class="fa-solid fa-paper-plane"></i>${html(tr('Send letter'))}</button></form></details></section></div>`;
    renderLetterReader(state);
}

function formatDate(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return new Intl.DateTimeFormat(getSettings().language === 'th' ? 'th-TH' : 'en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function renderLetterReader(state) {
    const modal = document.getElementById('tretaresia-letter-reader');
    if (!modal) return;
    const entry = state.letters.find(value => value.id === openedLetterId);
    if (!entry) {
        modal.hidden = true;
        modal.innerHTML = '';
        return;
    }
    modal.hidden = false;
    modal.innerHTML = `<button class="tretaresia-submodal-backdrop" type="button" data-action="close-letter" aria-label="${html(tr('Close'))}"></button>
        <article class="tretaresia-letter-sheet" data-direction="${entry.direction}"><div class="tretaresia-letter-fold"></div><header><span>${html(entry.direction === 'incoming' ? entry.fromName : entry.toName)}</span>
            <button type="button" data-action="close-letter" aria-label="${html(tr('Close'))}"><i class="fa-solid fa-xmark"></i></button></header>
            <div class="tretaresia-letter-paper"><span class="tretaresia-letter-date">${html(formatDate(entry.createdAt))}</span><h3>${html(entry.subject)}</h3>
                <p>${html(entry.body).replaceAll('\n', '<br>')}</p><div class="tretaresia-letter-signature">${html(entry.direction === 'incoming' ? entry.fromName : currentPersonaName(state))}</div></div>
            <footer>${entry.direction === 'incoming' ? `<button class="tretaresia-primary-button" type="button" data-action="reply-letter" data-id="${html(entry.id)}"><i class="fa-solid fa-reply"></i>${html(tr('Reply'))}</button>` : ''}
                <button class="tretaresia-secondary-button" type="button" data-action="delete-letter" data-id="${html(entry.id)}"><i class="fa-solid fa-trash"></i>${html(tr('Clear letter'))}</button>
                <button class="tretaresia-text-button" type="button" data-action="close-letter">${html(tr('Close'))}</button></footer></article>`;
}

function renderMusic(panel, state) {
    if (!panel) return;
    const current = state.music.tracks.find(track => track.id === state.music.currentId) || state.music.tracks[0];
    const playing = Boolean(audioPlayer && !audioPlayer.paused && current && audioPlayer.dataset.trackId === current.id);
    panel.innerHTML = `${heading('Music', `${state.music.tracks.length} ${tr('Playlist').toLowerCase()}`, 'fa-solid fa-compact-disc')}
        <section class="tretaresia-music-console"><div class="tretaresia-now-playing"><div class="tretaresia-record${playing ? ' is-playing' : ''}"><i class="fa-solid fa-compact-disc"></i></div>
            <div><span>${html(tr('Now playing'))}</span><h3>${html(current?.name || (getSettings().language === 'th' ? 'ยังไม่ได้เลือกเพลง' : 'No track selected'))}</h3>
            <small><i class="fa-solid fa-lock"></i>${html(tr('Stored locally on this device'))}</small></div></div>
            <div class="tretaresia-player-progress"><input id="tretaresia-music-seek" type="range" min="0" max="1000" value="0" ${current ? '' : 'disabled'}><div><span id="tretaresia-music-current-time">0:00</span><span id="tretaresia-music-duration">${formatDuration(current?.duration || 0)}</span></div></div>
            <div class="tretaresia-player-controls"><button type="button" data-action="music-shuffle" class="${state.music.shuffle ? 'is-active' : ''}" title="Shuffle"><i class="fa-solid fa-shuffle"></i></button>
                <button type="button" data-action="music-prev" title="Previous"><i class="fa-solid fa-backward-step"></i></button>
                <button class="tretaresia-play-button" type="button" data-action="music-toggle" ${current ? '' : 'disabled'}><i class="fa-solid ${playing ? 'fa-pause' : 'fa-play'}"></i></button>
                <button type="button" data-action="music-next" title="Next"><i class="fa-solid fa-forward-step"></i></button>
                <button type="button" data-action="music-repeat" class="${state.music.repeat ? 'is-active' : ''}" title="Repeat"><i class="fa-solid fa-repeat"></i></button></div></section>
        <section class="tretaresia-playlist"><div class="tretaresia-section-label"><i class="fa-solid fa-list-ol"></i><span>${html(tr('Playlist'))}</span>
            <button type="button" class="tretaresia-small-button" data-action="choose-audio"><i class="fa-solid fa-plus"></i>${html(tr('Add audio files'))}</button><input id="tretaresia-audio-input" type="file" accept="audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/mp4,audio/aac" multiple hidden></div>
            <div class="tretaresia-track-list">${state.music.tracks.length ? state.music.tracks.map((track, index) => `<article class="tretaresia-track-row${track.id === state.music.currentId ? ' is-current' : ''}">
                <button type="button" data-action="music-play" data-id="${html(track.id)}"><span>${String(index + 1).padStart(2, '0')}</span><i class="fa-solid ${track.id === state.music.currentId && playing ? 'fa-volume-high' : 'fa-music'}"></i>
                    <span><b>${html(track.name)}</b><small>${html(track.fileName)}</small></span><em>${formatDuration(track.duration)}</em></button>
                <button type="button" data-action="delete-track" data-id="${html(track.id)}"><i class="fa-solid fa-trash"></i></button></article>`).join('') : empty('No tracks in this chat.')}</div></section>`;
    updateMusicProgress();
}

function formatDuration(seconds) {
    const value = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

async function prefillLetterReply(entry) {
    const state = clone(getState());
    let npc = state.contacts.find(value => value.id === entry.contactId)
        || state.contacts.find(value => value.name.toLowerCase() === entry.fromName.toLowerCase());
    if (!npc) {
        npc = contact({ name: entry.fromName, relationship: 'Correspondent', lastLetterAt: entry.createdAt });
        ensureNpcForContact(state, npc);
        state.contacts.push(npc);
        await persistState(state, 'contact');
    }
    openedLetterId = null;
    renderLetterReader(getState());
    activateTab('mail');
    requestAnimationFrame(() => {
        const form = document.querySelector('form[data-form="letter"]');
        const details = form?.closest('details');
        if (details) details.open = true;
        const contactSelect = form?.querySelector('[name="contactId"]');
        if (contactSelect) contactSelect.value = npc.id;
        const subject = form?.querySelector('[name="subject"]');
        if (subject) subject.value = /^re:/i.test(entry.subject) ? entry.subject : `Re: ${entry.subject}`;
        form?.querySelector('[name="body"]')?.focus();
    });
}

function audioStorageKey(trackId, chatId = SillyTavern.getContext().getCurrentChatId?.() || 'no-chat') {
    return `tretaresia-rpg:audio:${chatId}:${trackId}`;
}

async function readAudioDuration(file) {
    return new Promise(resolve => {
        const probe = document.createElement('audio');
        const url = URL.createObjectURL(file);
        const finish = value => {
            URL.revokeObjectURL(url);
            probe.removeAttribute('src');
            resolve(Number.isFinite(value) ? value : 0);
        };
        probe.preload = 'metadata';
        probe.addEventListener('loadedmetadata', () => finish(probe.duration), { once: true });
        probe.addEventListener('error', () => finish(0), { once: true });
        probe.src = url;
    });
}

async function addAudioFiles(files) {
    const context = SillyTavern.getContext();
    if (!context.getCurrentChatId?.()) return notify('warning', getSettings().language === 'th' ? 'เปิดแชทก่อนเพิ่มเพลง' : 'Open a chat before adding music.');
    const store = SillyTavern.libs?.localforage;
    if (!store) return notify('error', 'Local audio storage is unavailable in this SillyTavern build.');
    const state = clone(getState());
    for (const file of files.slice(0, 30)) {
        if (!file.type.startsWith('audio/') || file.size > 100 * 1024 * 1024) {
            notify('warning', `${file.name}: unsupported audio or larger than 100 MB.`);
            continue;
        }
        const id = uid();
        try {
            await store.setItem(audioStorageKey(id), file);
            state.music.tracks.push(musicTrack({ id, name: file.name.replace(/\.[^.]+$/, ''), fileName: file.name,
                type: file.type, duration: await readAudioDuration(file), addedAt: new Date().toISOString() }));
        } catch (error) {
            console.error('[Tretaresia RPG] Could not store audio.', error);
            notify('error', `${file.name}: could not be stored on this device.`);
        }
    }
    if (!state.music.currentId) state.music.currentId = state.music.tracks[0]?.id || '';
    await persistState(state, 'music');
}

function ensureAudioPlayer() {
    if (audioPlayer) return audioPlayer;
    audioPlayer = document.createElement('audio');
    audioPlayer.preload = 'metadata';
    audioPlayer.addEventListener('timeupdate', updateMusicProgress);
    audioPlayer.addEventListener('loadedmetadata', updateMusicProgress);
    audioPlayer.addEventListener('play', () => renderMusic(document.querySelector('[data-panel="music"]'), getState()));
    audioPlayer.addEventListener('pause', () => renderMusic(document.querySelector('[data-panel="music"]'), getState()));
    audioPlayer.addEventListener('ended', () => {
        if (!getState().music.repeat) void stepTrack(1);
    });
    return audioPlayer;
}

async function playTrack(id) {
    const state = clone(getState());
    const track = state.music.tracks.find(entry => entry.id === id);
    if (!track) return;
    const store = SillyTavern.libs?.localforage;
    const blob = await store?.getItem(audioStorageKey(id));
    if (!(blob instanceof Blob)) return notify('warning', getSettings().language === 'th'
        ? 'ไฟล์เพลงนี้ไม่อยู่ในอุปกรณ์นี้ กรุณาเพิ่มไฟล์ใหม่' : 'This audio file is not stored on this device. Add it again here.');
    const player = ensureAudioPlayer();
    player.pause();
    if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl);
    audioObjectUrl = URL.createObjectURL(blob);
    player.src = audioObjectUrl;
    player.dataset.trackId = id;
    player.loop = state.music.repeat;
    state.music.currentId = id;
    await persistState(state, 'music');
    try {
        await player.play();
    } catch (error) {
        console.warn('[Tretaresia RPG] Audio playback requires a direct user gesture.', error);
        notify('warning', getSettings().language === 'th' ? 'แตะปุ่มเล่นอีกครั้งเพื่ออนุญาตเสียง' : 'Tap play again to allow audio playback.');
    }
    renderMusic(document.querySelector('[data-panel="music"]'), getState());
}

async function toggleMusic() {
    const state = getState();
    const current = state.music.tracks.find(track => track.id === state.music.currentId) || state.music.tracks[0];
    if (!current) return;
    if (!audioPlayer || audioPlayer.dataset.trackId !== current.id || !audioPlayer.src) return playTrack(current.id);
    if (audioPlayer.paused) await audioPlayer.play();
    else audioPlayer.pause();
    renderMusic(document.querySelector('[data-panel="music"]'), getState());
}

async function stepTrack(direction) {
    const state = getState();
    if (!state.music.tracks.length) return;
    let index = state.music.tracks.findIndex(track => track.id === state.music.currentId);
    if (state.music.shuffle && state.music.tracks.length > 1) {
        let next = index;
        while (next === index) next = Math.floor(Math.random() * state.music.tracks.length);
        index = next;
    } else index = (Math.max(0, index) + direction + state.music.tracks.length) % state.music.tracks.length;
    await playTrack(state.music.tracks[index].id);
}

async function removeAudioTrack(id) {
    const state = clone(getState());
    await SillyTavern.libs?.localforage?.removeItem(audioStorageKey(id));
    state.music.tracks = state.music.tracks.filter(track => track.id !== id);
    if (state.music.currentId === id) {
        cleanupAudio();
        state.music.currentId = state.music.tracks[0]?.id || '';
    }
    await persistState(state, 'music');
}

function cleanupAudio() {
    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.removeAttribute('src');
        audioPlayer.load?.();
    }
    if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl);
    audioObjectUrl = '';
}

function updateMusicProgress() {
    const seek = document.getElementById('tretaresia-music-seek');
    const current = document.getElementById('tretaresia-music-current-time');
    const duration = document.getElementById('tretaresia-music-duration');
    if (seek && audioPlayer?.duration) seek.value = String(Math.round(audioPlayer.currentTime / audioPlayer.duration * 1000));
    if (current) current.textContent = formatDuration(audioPlayer?.currentTime || 0);
    if (duration && audioPlayer?.duration) duration.textContent = formatDuration(audioPlayer.duration);
}

function ensureContactForNpc(state, npc) {
    let linked = state.contacts.find(entry => entry.id === npc.contactId || entry.npcId === npc.id)
        || state.contacts.find(entry => entry.name.toLocaleLowerCase() === npc.name.toLocaleLowerCase());
    if (!linked) {
        linked = contact({ name: npc.name, title: npc.title, affiliation: npc.faction, relationship: npc.relationship, notes: npc.notes, npcId: npc.id });
        state.contacts.push(linked);
    }
    linked.npcId = npc.id;
    linked.name = npc.name;
    linked.title = npc.title;
    linked.affiliation = npc.faction;
    linked.relationship = npc.relationship;
    npc.contactId = linked.id;
    return linked;
}

function ensureNpcForContact(state, contactEntry) {
    let linked = state.npcs.find(entry => entry.id === contactEntry.npcId)
        || state.npcs.find(entry => entry.name.toLocaleLowerCase() === contactEntry.name.toLocaleLowerCase());
    if (!linked) {
        linked = npcProfile({ name: contactEntry.name, title: contactEntry.title, faction: contactEntry.affiliation,
            relationship: contactEntry.relationship, notes: contactEntry.notes, contactId: contactEntry.id });
        state.npcs.push(linked);
    }
    linked.contactId = contactEntry.id;
    contactEntry.npcId = linked.id;
    return linked;
}

async function onSubmit(event) {
    const form = event.target.closest('form[data-form]');
    if (!form) return;
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form).entries());
    const state = clone(getState());
    switch (form.dataset.form) {
        case 'portrait-frame':
            state.player.portraitView = {
                desktop: { x: values.desktopX, y: values.desktopY, zoom: values.desktopZoom },
                mobile: { x: values.mobileX, y: values.mobileY, zoom: values.mobileZoom },
            };
            await persistState(state, 'portrait');
            closePortraitEditor();
            notify('success', getSettings().language === 'th' ? 'บันทึกตำแหน่งรูปแล้ว' : 'Portrait framing saved.');
            break;
        case 'npc-portrait-frame': {
            const entry = state.npcs.find(value => value.id === values.npcId);
            if (!entry) break;
            entry.portraitView = {
                desktop: { x: values.desktopX, y: values.desktopY, zoom: values.desktopZoom },
                mobile: { x: values.mobileX, y: values.mobileY, zoom: values.mobileZoom },
            };
            entry.updatedAt = new Date().toISOString();
            await persistState(state, 'npc-portrait');
            closePortraitEditor();
            notify('success', getSettings().language === 'th' ? 'บันทึกตำแหน่งรูป NPC แล้ว' : 'NPC portrait framing saved.');
            break;
        }
        case 'status':
            state.player = {
                ...state.player, name: values.name, title: values.title, race: values.race,
                age: values.age, profession: values.profession, guild: values.guild, party: values.party,
                gender: values.gender, homeContinent: values.homeContinent, standing: values.standing, affiliation: values.affiliation,
                appearance: { hair: values.hair, eyes: values.eyes, height: values.height, build: values.build },
                powerType: values.powerType, originSkill: values.originSkill, condition: values.condition, level: values.level,
                hp: { current: values.hpCurrent, max: values.hpMax },
                mp: { current: values.mpCurrent, max: values.mpMax },
                stamina: { current: values.staminaCurrent, max: values.staminaMax },
                survival: { hunger: values.hunger, thirst: values.thirst },
                aura: { ...state.player.aura, color: values.auraColor, output: values.auraOutput, control: values.auraControl,
                    efficiency: values.auraEfficiency, recovery: values.auraRecovery },
                fitness: { ...state.player.fitness, lungCapacity: values.lungCapacity },
            };
            state.onboarding.identitySeeded = true;
            await persistState(state);
            notify('success', 'Character status saved.');
            break;
        case 'journey-log-add': {
            const entry = journeyLogEntry({ text: values.text, place: state.location.place, day: state.worldClock.dayName || `Day ${state.worldClock.day}`, kind: 'manual' });
            if (!entry) return notify('warning', tr('What happened'));
            appendJourneyLog(state, entry);
            await persistState(state, 'journey-log');
            notify('success', tr('Journey log saved.'));
            break;
        }
        case 'journey-log-edit': {
            const entry = state.journeyLogs.find(value => value.id === values.id);
            const nextText = text(values.text, '', 500);
            if (!entry || !nextText) return notify('warning', tr('What happened'));
            entry.text = nextText;
            entry.at = new Date().toISOString();
            await persistState(state, 'journey-log');
            notify('success', tr('Journey log saved.'));
            break;
        }
        case 'scene':
            {
            const knownPlace = mapLocationByName(values.place, state) || mapLocationByName(values.region, state);
            state.worldClock = { day: values.day, dayName: values.dayName, time: values.time, phase: values.phase };
            state.location = {
                ...state.location, continent: values.continent, region: values.region, place: values.place,
                detail: values.detail, zoneType: values.zoneType,
                mapX: values.mapX || knownPlace?.x || state.location.mapX, mapY: values.mapY || knownPlace?.y || state.location.mapY, heading: values.heading,
            };
            state.scene = { position: values.position, weather: values.weather, temperature: values.temperature };
            await persistState(state, 'scene');
            notify('success', getSettings().language === 'th' ? 'บันทึกข้อมูลฉากแล้ว' : 'Scene tracking saved.');
            break;
            }
        case 'scene-map': {
            const firstFloor = sceneFloor({ name: values.floorName || '1F', level: values.level, rooms: [], connections: [] });
            const nextMap = sceneStructure({ name: values.name, place: values.place, floors: firstFloor ? [firstFloor] : [] });
            if (!nextMap || !firstFloor) return notify('warning', 'Enter a map name and first floor.');
            state.sceneMap.maps.push(nextMap);
            state.sceneMap.activeMapId = nextMap.id;
            state.sceneMap.activeFloorId = firstFloor.id;
            state.sceneMap.playerRoomId = '';
            await persistState(state, 'scene-map');
            notify('success', `${nextMap.name} created.`);
            break;
        }
        case 'scene-floor': {
            const map = state.sceneMap.maps.find(entry => entry.id === values.mapId);
            const nextFloor = sceneFloor({ name: values.name, level: values.level, rooms: [], connections: [] });
            if (!map || !nextFloor) return notify('warning', 'Enter a floor name.');
            map.floors.push(nextFloor);
            state.sceneMap.activeMapId = map.id;
            state.sceneMap.activeFloorId = nextFloor.id;
            state.sceneMap.playerRoomId = '';
            await persistState(state, 'scene-map');
            break;
        }
        case 'scene-room': {
            const map = state.sceneMap.maps.find(entry => entry.id === values.mapId);
            const floor = map?.floors.find(entry => entry.id === values.floorId);
            if (!floor) return notify('warning', 'Choose a valid floor.');
            const existing = floor.rooms.find(entry => entry.id === values.roomId);
            const nextRoom = sceneRoom({
                id: existing?.id, name: values.name, type: values.type, x: values.x, y: values.y,
                width: values.width, height: values.height, discovered: values.discovered === 'on', locked: values.locked === 'on',
            }, existing || {});
            if (!nextRoom) return notify('warning', 'Enter a room name.');
            if (existing) floor.rooms[floor.rooms.indexOf(existing)] = nextRoom;
            else floor.rooms.push(nextRoom);
            state.sceneMap.activeMapId = map.id;
            state.sceneMap.activeFloorId = floor.id;
            await persistState(state, 'scene-map');
            break;
        }
        case 'scene-position': {
            const map = state.sceneMap.maps.find(entry => entry.id === values.mapId);
            const floor = map?.floors.find(entry => entry.id === values.floorId);
            const room = floor?.rooms.find(entry => entry.id === values.roomId);
            if (!map || !floor || !room) return notify('warning', 'Choose a valid current room.');
            state.sceneMap.activeMapId = map.id;
            state.sceneMap.activeFloorId = floor.id;
            state.sceneMap.playerRoomId = room.id;
            state.scene.position = room.name;
            await persistState(state, 'scene-map-position');
            break;
        }
        case 'scene-connection': {
            const map = state.sceneMap.maps.find(entry => entry.id === values.mapId);
            const floor = map?.floors.find(entry => entry.id === values.floorId);
            if (!floor?.rooms.some(entry => entry.id === values.from) || !floor.rooms.some(entry => entry.id === values.to) || values.from === values.to) {
                return notify('warning', 'Choose two different rooms.');
            }
            const duplicate = floor.connections.some(entry => (
                (entry.from === values.from && entry.to === values.to) || (entry.from === values.to && entry.to === values.from)
            ) && entry.type === values.type);
            if (!duplicate) floor.connections.push(sceneConnection({ from: values.from, to: values.to, type: values.type }));
            await persistState(state, 'scene-map');
            break;
        }
        case 'inventory': {
            const nextItem = item(values);
            if (!nextItem) return notify('warning', 'Enter an item name first.');
            state.inventory.push(nextItem);
            await persistState(state);
            notify('success', `${nextItem.name} added to inventory.`);
            break;
        }
        case 'skill': {
            const nextSkill = skill(values);
            if (!nextSkill) return notify('warning', 'Enter a skill name first.');
            state.skills.push(nextSkill);
            await persistState(state);
            notify('success', `${nextSkill.name} added to skills.`);
            break;
        }
        case 'proficiencies': {
            const kind = form.dataset.kind;
            if (kind === 'magic') {
                const previousMagic = { ...state.proficiencies.magic };
                MAGIC_DISCIPLINES.forEach(entry => {
                    if (values[`magic-${entry.id}`] !== undefined) state.proficiencies.magic[entry.id] = values[`magic-${entry.id}`];
                });
                state.proficiencies.customMagic.forEach(entry => {
                    if (values[`custom-magic-${entry.id}`] !== undefined) entry.proficiency = values[`custom-magic-${entry.id}`];
                });
                const changed = MAGIC_DISCIPLINES.filter(entry =>
                    number(previousMagic[entry.id], 0, 0, 100) !== number(state.proficiencies.magic[entry.id], 0, 0, 100));
                const selected = changed.reduce((best, entry) => {
                    const value = number(state.proficiencies.magic[entry.id], 0, 0, 100);
                    return value > best.value ? { entry, value } : best;
                }, { entry: null, value: 0 });
                if (selected.entry && selected.value > 0) {
                    state.player.powerType = selected.entry.name;
                    if (selected.entry.id === 'divineMana') state.player.aura.color = '#ffffff';
                }
            } else if (kind === 'sword') {
                SWORD_STYLES.forEach(entry => {
                    if (values[`sword-${entry.id}`] !== undefined) state.proficiencies.sword[entry.id] = values[`sword-${entry.id}`];
                });
                state.proficiencies.customSword.forEach(entry => {
                    if (values[`custom-sword-${entry.id}`] !== undefined) entry.proficiency = values[`custom-sword-${entry.id}`];
                });
            }
            await persistState(state, 'proficiency');
            notify('success', getSettings().language === 'th' ? 'บันทึกความชำนาญแล้ว' : 'Proficiency record saved.');
            break;
        }
        case 'custom-proficiency': {
            const kind = values.kind === 'sword' ? 'sword' : 'magic';
            const entry = customProficiency(values, {}, kind);
            if (!entry) return notify('warning', kind === 'magic' ? 'Enter a magic name first.' : 'Enter a sword style name first.');
            const collection = kind === 'magic' ? state.proficiencies.customMagic : state.proficiencies.customSword;
            const existing = collection.find(value => value.name.toLocaleLowerCase() === entry.name.toLocaleLowerCase());
            if (existing) Object.assign(existing, entry, { id: existing.id });
            else collection.push(entry);
            await persistState(state, 'proficiency');
            notify('success', `${entry.name} added to proficiencies.`);
            break;
        }
        case 'technique': {
            const nextTechnique = technique(values);
            if (!nextTechnique) return notify('warning', getSettings().language === 'th' ? 'กรุณาใส่ชื่อวิชา' : 'Enter a technique name first.');
            state.proficiencies.techniques.push(nextTechnique);
            await persistState(state, 'technique');
            break;
        }
        case 'quest': {
            const nextQuest = quest({ ...values, receivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
            if (!nextQuest) return notify('warning', 'Enter a quest name first.');
            state.quests.push(nextQuest);
            await persistState(state);
            notify('success', `${nextQuest.name} added to the quest log.`);
            break;
        }
        case 'party-create': {
            if (state.social.party) return notify('warning', getSettings().language === 'th' ? 'มีปาร์ตี้อยู่แล้ว' : 'A party already exists.');
            const name = text(values.name, '', 140);
            if (!name) return notify('warning', getSettings().language === 'th' ? 'กรุณาใส่ชื่อปาร์ตี้' : 'Enter a party name first.');
            state.social.party = partyProfile({ name, leaderId: 'player', memberIds: [] });
            state.player.party = state.social.party.name;
            await persistState(state, 'party');
            notify('success', `${state.social.party.name} created.`);
            break;
        }
        case 'party-invite': {
            const party = state.social.party;
            const npc = resolveFriendlyNpc(state, { npcId: values.npcId });
            if (!party || !npc) return notify('warning', getSettings().language === 'th' ? 'เลือก NPC ฝ่ายมิตรที่ถูกต้อง' : 'Choose a valid friendly NPC.');
            if (party.memberIds.includes(npc.id)) return notify('info', getSettings().language === 'th' ? 'NPC อยู่ในปาร์ตี้แล้ว' : 'That NPC is already in the party.');
            party.memberIds.push(npc.id);
            await persistState(state, 'party');
            notify('success', `${npc.name} invited to ${party.name}.`);
            break;
        }
        case 'party-strategy': {
            const party = state.social.party;
            if (!party) break;
            party.formation = text(values.formation, party.formation, 80);
            party.roles = Object.fromEntries(party.memberIds.map(id => {
                const requested = text(values[`role-${id}`], party.roles?.[id] || 'Companion', 40);
                return [id, PARTY_ROLES.includes(requested) ? requested : 'Companion'];
            }));
            party.sharedFunds = {
                gold: number(values.sharedGold, party.sharedFunds.gold, 0, 999999999),
                silver: number(values.sharedSilver, party.sharedFunds.silver, 0, 999999999),
                copper: number(values.sharedCopper, party.sharedFunds.copper, 0, 999999999),
            };
            await persistState(state, 'party-strategy');
            notify('success', 'Party formation and roles saved.');
            break;
        }
        case 'guild-create': {
            const name = text(values.name, '', 140);
            if (!name) return notify('warning', getSettings().language === 'th' ? 'กรุณาใส่ชื่อกิลด์' : 'Enter a guild name first.');
            if (state.social.guilds.some(entry => entry.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return notify('warning', getSettings().language === 'th' ? 'มีกิลด์ชื่อนี้อยู่แล้ว' : 'A guild with this name already exists.');
            if (!canAffordCurrency(state.progression.currency, GUILD_CREATION_FEE)) return notify('warning', `${tr('Not enough currency')}: ${currencyLabel(GUILD_CREATION_FEE)}`);
            state.progression.currency.gold -= GUILD_CREATION_FEE.gold;
            appendCurrencyTransaction(state, { gold: -GUILD_CREATION_FEE.gold }, `Guild creation fee: ${name}`, 'guild');
            const guild = guildProfile({ name, description: values.description, leaderId: 'player', memberIds: [], treasury: { ...GUILD_CREATION_FEE } });
            if (!guild) return notify('warning', getSettings().language === 'th' ? 'สร้างกิลด์ไม่สำเร็จ' : 'The guild could not be created.');
            state.social.guilds.push(guild);
            state.player.guild = guild.name;
            await persistState(state, 'guild');
            notify('success', `${guild.name} created. ${currencyLabel(GUILD_CREATION_FEE)} deducted.`);
            break;
        }
        case 'guild-invite': {
            const guild = state.social.guilds.find(entry => entry.id === values.guildId);
            const npc = resolveFriendlyNpc(state, { npcId: values.npcId });
            if (!guild || !npc) return notify('warning', getSettings().language === 'th' ? 'เลือกกิลด์และ NPC ฝ่ายมิตรให้ถูกต้อง' : 'Choose a guild and a valid friendly NPC.');
            if (guild.memberIds.includes(npc.id)) return notify('info', getSettings().language === 'th' ? 'NPC อยู่ในกิลด์แล้ว' : 'That NPC is already in the guild.');
            guild.memberIds.push(npc.id);
            await persistState(state, 'guild');
            notify('success', `${npc.name} invited to ${guild.name}.`);
            break;
        }
        case 'guild-progression': {
            const guild = state.social.guilds.find(entry => entry.id === values.guildId);
            if (!guild) break;
            guild.rank = text(values.rank, guild.rank, 80);
            guild.level = number(values.level, guild.level, 1, 9999);
            guild.reputation = number(values.reputation, guild.reputation, -999999, 999999);
            guild.headquarters = text(values.headquarters, guild.headquarters, 180);
            guild.alliances = String(values.alliances || '').split(',').map(entry => text(entry, '', 120)).filter(Boolean).slice(0, 40);
            guild.enemies = String(values.enemies || '').split(',').map(entry => text(entry, '', 120)).filter(Boolean).slice(0, 40);
            guild.quests = String(values.quests || '').split(',').map(entry => text(entry, '', 160)).filter(Boolean).slice(0, 80);
            await persistState(state, 'guild-progression');
            notify('success', 'Guild progression saved.');
            break;
        }
        case 'household-save': {
            const name = text(values.name, '', 140);
            if (!name) return notify('warning', getSettings().language === 'th' ? 'กรุณาใส่ชื่อครอบครัว' : 'Enter a household name first.');
            state.social.household.name = name;
            await persistState(state, 'household');
            notify('success', getSettings().language === 'th' ? 'บันทึกชื่อครอบครัวแล้ว' : 'Household name saved.');
            break;
        }
        case 'household-add': {
            const npc = resolveFriendlyNpc(state, { npcId: values.npcId });
            if (!npc) return notify('warning', getSettings().language === 'th' ? 'เลือก NPC ฝ่ายมิตรที่ถูกต้อง' : 'Choose a valid friendly NPC.');
            if (state.social.household.members.some(entry => entry.npcId === npc.id)) return notify('info', getSettings().language === 'th' ? 'สมาชิกคนนี้อยู่ในครอบครัวแล้ว' : 'That NPC is already in the household.');
            state.social.household.members.push(socialMember({ npcId: npc.id, name: npc.name, role: values.role, notes: values.notes }));
            await persistState(state, 'household');
            notify('success', `${npc.name} added to ${state.social.household.name}.`);
            break;
        }
        case 'npc-new': {
            const nextNpc = npcProfile(values);
            if (!nextNpc) return notify('warning', getSettings().language === 'th' ? 'กรุณาใส่ชื่อ NPC' : 'Enter the NPC name first.');
            if (!isFriendlyNpc(nextNpc)) return notify('warning', getSettings().language === 'th' ? 'NPC ฝ่ายศัตรูจะไม่ถูกเพิ่มในสารบบ NPC' : 'Hostile NPCs are excluded from the NPC Codex.');
            if (state.npcs.some(entry => entry.name.toLocaleLowerCase() === nextNpc.name.toLocaleLowerCase())) {
                return notify('warning', getSettings().language === 'th' ? 'มี NPC ชื่อนี้อยู่แล้ว' : 'An NPC with this name already exists.');
            }
            state.npcs.push(nextNpc);
            if (values.linkContact === 'yes') ensureContactForNpc(state, nextNpc);
            selectedNpcId = nextNpc.id;
            await persistState(state, 'npc');
            break;
        }
        case 'npc-profile': {
            const index = state.npcs.findIndex(entry => entry.id === values.id);
            if (index < 0) break;
            const previous = state.npcs[index];
            const nextNpc = npcProfile({ ...previous, ...values, mapVisible: values.mapVisible === 'on', stats: {
                ...previous.stats, level: values.level, rank: values.rank, hp: values.hp, mp: values.mp, stamina: values.stamina,
                ...Object.fromEntries(NPC_CORE_STATS.map(stat => [stat.id, values[stat.id]])),
            }, updatedAt: new Date().toISOString() }, previous);
            state.npcs[index] = nextNpc;
            const linked = state.contacts.find(entry => entry.id === nextNpc.contactId || entry.npcId === nextNpc.id);
            if (linked) ensureContactForNpc(state, nextNpc);
            await persistState(state, 'npc');
            break;
        }
        case 'npc-ability': {
            const entry = state.npcs.find(value => value.id === values.npcId);
            const ability = npcAbility(values);
            if (!entry || !ability) return notify('warning', getSettings().language === 'th' ? 'กรุณาใส่ชื่อความสามารถ' : 'Enter an ability name first.');
            entry.abilities.push(ability);
            entry.updatedAt = new Date().toISOString();
            await persistState(state, 'npc');
            break;
        }
        case 'npc-meter': {
            const entry = state.npcs.find(value => value.id === values.npcId);
            const meterEntry = npcMeter(values);
            if (!entry || !meterEntry) return notify('warning', getSettings().language === 'th' ? 'กรุณาใส่ชื่อค่าสถานะ' : 'Enter a meter name first.');
            entry.customMeters.push(meterEntry);
            entry.updatedAt = new Date().toISOString();
            await persistState(state, 'npc');
            break;
        }
        case 'npc-diary': {
            const entry = state.npcs.find(value => value.id === values.npcId);
            const note = npcDiaryEntry(values);
            if (!entry || !note) return notify('warning', getSettings().language === 'th' ? 'กรุณาใส่ข้อความไดอารี' : 'Write the diary entry first.');
            entry.diary.push(note);
            entry.updatedAt = new Date().toISOString();
            await persistState(state, 'npc');
            break;
        }
        case 'contact': {
            const nextContact = contact(values);
            if (!nextContact) return notify('warning', getSettings().language === 'th' ? 'กรุณาใส่ชื่อ NPC' : 'Enter the NPC name first.');
            ensureNpcForContact(state, nextContact);
            state.contacts.push(nextContact);
            await persistState(state, 'contact');
            break;
        }
        case 'letter': {
            let recipient = state.contacts.find(entry => entry.id === values.contactId);
            if (!recipient && values.recipientName) {
                recipient = contact({ name: values.recipientName, relationship: 'Correspondent' });
                ensureNpcForContact(state, recipient);
                state.contacts.push(recipient);
            }
            if (!recipient || !text(values.body)) return notify('warning', getSettings().language === 'th' ? 'กรุณาเลือกผู้รับและเขียนเนื้อหา' : 'Choose a recipient and write the letter first.');
            const outgoing = letter({ contactId: recipient.id, fromName: currentPersonaName(state), toName: recipient.name,
                subject: values.subject || 'Letter', body: values.body, direction: 'outgoing', status: 'sent', createdAt: new Date().toISOString() });
            state.letters.push(outgoing);
            recipient.lastLetterAt = outgoing.createdAt;
            if (await persistState(state, 'letter')) {
                await sendChatAction(getSettings().language === 'th'
                    ? `*ตัวผมเขียนจดหมายถึง ${recipient.name} หัวข้อ “${outgoing.subject}” มีเนื้อหาว่า: ${outgoing.body} และส่งจดหมายออกไปตามวิธีที่เหมาะสม*`
                    : `*I write a physical letter to ${recipient.name}, titled "${outgoing.subject}": ${outgoing.body}. I send it through an appropriate courier or delivery method.*`);
            }
            break;
        }
        case 'rank': {
            const previousCurrency = clone(state.progression.currency);
            state.progression = {
                ...state.progression, adventurerRank: values.adventurerRank, customRankName: values.customRankName, magicRank: values.magicRank,
                swordRank: values.swordRank, experience: values.experience, experienceMax: values.experienceMax, reputation: values.reputation, kills: values.kills,
                currency: { name: values.currencyName, gold: values.gold, silver: values.silver, copper: values.copper },
            };
            state.progression.currency = normalize(state).progression.currency;
            const balanceChange = currencyDelta(previousCurrency, state.progression.currency);
            if (balanceChange.gold || balanceChange.silver || balanceChange.copper) appendCurrencyTransaction(state, balanceChange, 'Manual balance adjustment', 'manual');
            await persistState(state);
            notify('success', 'Progression saved.');
            break;
        }
        case 'travel': {
            const namedDestination = mapLocation(values.destination, state, false);
            const isCoordinate = values.destination === '__coordinates__';
            if (!namedDestination && !isCoordinate) return notify('warning', 'Choose a valid destination.');
            const mapX = number(values.mapX, namedDestination?.x || 0, 0, WORLD_MAP_WIDTH);
            const mapY = number(values.mapY, namedDestination?.y || 0, 0, WORLD_MAP_HEIGHT);
            const destination = namedDestination || {
                id: '__coordinates__', name: values.place || 'Uncharted coordinate', x: mapX, y: mapY,
                continent: values.continent || 'Open Ocean', region: values.region || 'Uncharted Reach',
            };
            const origin = state.location.place !== 'Unknown' ? state.location.place : state.location.region;
            const totalDays = Math.max(1, Number(values.totalDays) || 1);
            const now = worldClockMinutes(state.worldClock);
            state.travel = {
                status: 'Traveling', origin, destination: values.place || destination.name, route: values.route || 'Road',
                totalDays, remainingDays: totalDays, notes: values.detail || '',
                originX: state.location.mapX, originY: state.location.mapY, originContinent: state.location.continent, originRegion: state.location.region,
                destinationX: destination.x, destinationY: destination.y, destinationContinent: destination.continent,
                destinationRegion: destination.region, destinationPlace: values.place || destination.name,
                startedAtWorldMinutes: now, lastWorldMinutes: now,
                routePoints: [],
            };
            state.travel.routePoints = buildTravelRoutePoints(state, state.travel);
            state.journal.push({ id: uid(), text: `Began a ${totalDays}-day journey from ${origin} to ${destination.name}.`, at: new Date().toISOString() });
            appendJourneyLog(state, { text: `Began a ${totalDays}-day journey from ${origin} to ${destination.name} via ${values.route || 'Road'}.`, place: origin, day: state.worldClock.dayName || `Day ${state.worldClock.day}`, kind: 'travel' });
            if (await persistState(state, 'travel')) {
                const exact = values.place && values.place !== destination.name ? values.place : '';
                await sendChatAction(getSettings().language === 'th'
                    ? `*ตัวผมเริ่มออกเดินทางจาก ${origin} ไปยัง ${destination.name}${exact ? ` โดยมุ่งหน้าไปที่ ${exact}` : ''} ผ่านเส้นทางแบบ ${values.route} การเดินทางคาดว่าจะใช้เวลาประมาณ ${totalDays} วัน โปรดดำเนินเหตุการณ์ระหว่างทางตามจริงโดยยังไม่ข้ามไปถึงปลายทางทันที*`
                    : `*I begin traveling from ${origin} toward ${destination.name}${exact ? `, aiming for ${exact}` : ''} by ${values.route}. The journey is expected to take about ${totalDays} days. Play out meaningful road events and passage of time; do not teleport me to the destination.*`);
            }
            break;
        }
        case 'map-pin': {
            const worldId = WORLD_ATLASES[values.worldId] ? values.worldId : viewedWorldId(state);
            const destination = worldLocationsFor({ ...state, world: atlasById(worldId) }, false).find(entry => entry.id === values.locationId);
            const x = number(values.mapX, destination?.x || 0, 0, WORLD_MAP_WIDTH);
            const y = number(values.mapY, destination?.y || 0, 0, WORLD_MAP_HEIGHT);
            const existing = destination
                ? state.location.pins.find(pin => (pin.worldId || WORLD_ATLAS.id) === worldId && pin.locationId === destination.id)
                : state.location.pins.find(pin => (pin.worldId || WORLD_ATLAS.id) === worldId && pin.x !== null && Math.hypot(pin.x - x, pin.y - y) < 8);
            const nextPin = {
                id: existing?.id || uid(), worldId, locationId: destination?.id || '', x, y,
                continent: values.continent || destination?.continent || 'Open Ocean', region: values.region || destination?.region || 'Uncharted Reach',
                label: values.label || destination?.name || 'Marked coordinate', note: values.note,
            };
            state.location.pins = [...state.location.pins.filter(pin => pin.id !== existing?.id), nextPin];
            if (destination) addDiscoveredLocation(state, destination.name, worldId);
            await persistState(state, 'map');
            notify('success', `${nextPin.label} marked at ${coordinatesLabel(x, y)}.`);
            break;
        }
    }
}

async function onPanelChange(event) {
    const stateImport = event.target.closest('#tretaresia-state-import');
    if (stateImport instanceof HTMLInputElement && stateImport.files?.[0]) {
        try { await importStatePackage(stateImport.files[0]); }
        catch (error) { notify('error', error.message || 'Could not import that state file.'); }
        finally { stateImport.value = ''; }
        return;
    }
    const portrait = event.target.closest('#tretaresia-avatar-input');
    if (portrait instanceof HTMLInputElement && portrait.files?.[0]) {
        try {
            const state = clone(getState());
            state.player.portrait = await resizePortrait(portrait.files[0]);
            state.player.portraitView = clone(defaultState().player.portraitView);
            await persistState(state, 'portrait');
            notify('success', 'Profile picture updated.');
            openPortraitEditor();
        } catch (error) {
            notify('error', error.message || 'Could not use that image.');
        }
        return;
    }
    const npcPortrait = event.target.closest('#tretaresia-npc-avatar-input');
    if (npcPortrait instanceof HTMLInputElement && npcPortrait.files?.[0]) {
        const npcId = npcPortrait.dataset.npcId;
        try {
            const store = SillyTavern.libs?.localforage;
            if (!store) throw new Error('Local image storage is unavailable in this SillyTavern build.');
            const state = clone(getState());
            const entry = state.npcs.find(value => value.id === npcId);
            if (!entry) throw new Error('NPC profile was not found.');
            const blob = await resizeImageBlob(npcPortrait.files[0]);
            await store.setItem(npcPortraitStorageKey(entry.id), blob);
            entry.hasPortrait = true;
            entry.portraitView = clone(defaultState().player.portraitView);
            entry.updatedAt = new Date().toISOString();
            await persistState(state, 'npc-portrait');
            notify('success', getSettings().language === 'th' ? 'อัปเดตรูป NPC แล้ว' : 'NPC portrait updated.');
            await openNpcPortraitEditor(entry.id);
        } catch (error) {
            notify('error', error.message || 'Could not use that image.');
        } finally {
            npcPortrait.value = '';
        }
        return;
    }
    const audioInput = event.target.closest('#tretaresia-audio-input');
    if (audioInput instanceof HTMLInputElement && audioInput.files?.length) {
        await addAudioFiles([...audioInput.files]);
        audioInput.value = '';
        return;
    }
    const worldSelect = event.target.closest('[data-map-world-select]');
    if (worldSelect instanceof HTMLSelectElement) {
        selectViewedWorld(worldSelect.value, getState());
        return;
    }
    const sceneMapPicker = event.target.closest('#tretaresia-scene-map-picker');
    if (sceneMapPicker instanceof HTMLSelectElement) {
        const state = clone(getState());
        const map = state.sceneMap.maps.find(entry => entry.id === sceneMapPicker.value);
        if (map) {
            state.sceneMap.activeMapId = map.id;
            state.sceneMap.activeFloorId = map.floors[0]?.id || '';
            state.sceneMap.playerRoomId = '';
            await persistState(state, 'scene-map-view');
        }
        return;
    }
    const destination = event.target.closest('form[data-form="travel"] select[name="destination"]');
    if (destination) {
        if (destination.value === '__coordinates__') return;
        mapDraftPoint = null;
        mapSelectionId = destination.value;
        renderMap(document.querySelector('[data-panel="map"]'), getState());
    }
}

async function onPanelClick(event) {
    const button = event.target.closest('[data-action], [data-map-location]');
    if (!button) return;
    if (button.dataset.mapLocation) {
        mapDraftPoint = null;
        mapSelectionId = button.dataset.mapLocation;
        renderMap(document.querySelector('[data-panel="map"]'), getState());
        return;
    }

    const state = clone(getState());
    const id = button.dataset.id;
    switch (button.dataset.action) {
        case 'toggle-control-center':
            setControlCenterOpen(!controlCenterOpen());
            break;
        case 'tab-prev':
            stepTab(-1);
            break;
        case 'tab-next':
            stepTab(1);
            break;
        case 'skip-intro':
            finishIntroGate();
            break;
        case 'close-control-center':
            setControlCenterOpen(false);
            break;
        case 'export-state':
            exportStatePackage();
            break;
        case 'import-state':
            document.getElementById('tretaresia-state-import')?.click();
            break;
        case 'repair-state': {
            const repaired = repairCurrentStateSnapshot(state);
            await persistState(repaired, 'diagnostic-repair');
            notify('success', getSettings().language === 'th' ? 'ซ่อมและตรวจ state ปัจจุบันแล้ว' : 'Current state repaired and normalized.');
            break;
        }
        case 'rollback-latest-turn': {
            const history = turnHistory(SillyTavern.getContext(), false);
            const entry = [...(history?.entries || [])].reverse().find(candidate => candidate?.baseState);
            if (!entry) {
                notify('info', getSettings().language === 'th' ? 'ยังไม่มี turn ที่ย้อนกลับได้' : 'No turn checkpoint is available yet.');
                break;
            }
            await replaceAssistantTurnState(entry.messageId, { reuseVariant: false, reason: 'inspector' });
            notify('success', getSettings().language === 'th' ? 'ย้อนข้อมูล turn ล่าสุดแล้ว' : 'Latest turn data rolled back.');
            break;
        }
        case 'reapply-latest-turn': {
            const history = turnHistory(SillyTavern.getContext(), false);
            const entry = [...(history?.entries || [])].reverse().find(candidate => candidate?.baseState);
            if (!entry) {
                notify('info', getSettings().language === 'th' ? 'ยังไม่มี turn ที่นำกลับมาใช้ได้' : 'No turn checkpoint is available yet.');
                break;
            }
            await replaceAssistantTurnState(entry.messageId, { reuseVariant: true, reason: 'inspector-reapply' });
            notify('success', getSettings().language === 'th' ? 'นำข้อมูล variant ล่าสุดกลับมาใช้แล้ว' : 'Latest turn variant applied again.');
            break;
        }
        case 'rollback-turn': {
            const messageId = Number(id);
            if (!Number.isInteger(messageId) || !await replaceAssistantTurnState(messageId, { reuseVariant: false, reason: 'audit-entry' })) {
                notify('warning', getSettings().language === 'th' ? 'ไม่พบ checkpoint ของ turn นี้' : 'That turn checkpoint is no longer available.');
                break;
            }
            notify('success', getSettings().language === 'th' ? 'ย้อนข้อมูล turn ที่เลือกแล้ว' : 'Selected turn data rolled back.');
            break;
        }
        case 'reapply-turn': {
            const messageId = Number(id);
            if (!Number.isInteger(messageId) || !await replaceAssistantTurnState(messageId, { reuseVariant: true, reason: 'audit-entry-reapply' })) {
                notify('warning', getSettings().language === 'th' ? 'ไม่พบ checkpoint ของ turn นี้' : 'That turn checkpoint is no longer available.');
                break;
            }
            notify('success', getSettings().language === 'th' ? 'นำข้อมูล turn ที่เลือกกลับมาใช้แล้ว' : 'Selected turn data applied again.');
            break;
        }
        case 'select-proficiency-icon': {
            const picker = button.closest('.tretaresia-icon-picker');
            const field = picker?.querySelector('input[name="iconKey"]');
            if (field) field.value = button.dataset.iconKey;
            picker?.querySelectorAll('[data-icon-key]').forEach(entry => entry.classList.toggle('is-selected', entry === button));
            break;
        }
        case 'choose-portrait':
            document.getElementById('tretaresia-avatar-input')?.click();
            break;
        case 'open-portrait-editor':
            openPortraitEditor();
            break;
        case 'close-portrait-editor':
            closePortraitEditor();
            break;
        case 'choose-npc-portrait': {
            const inputElement = document.getElementById('tretaresia-npc-avatar-input');
            if (inputElement) inputElement.dataset.npcId = id;
            inputElement?.click();
            break;
        }
        case 'open-npc-portrait-editor':
            await openNpcPortraitEditor(id);
            break;
        case 'remove-npc-portrait': {
            const entry = state.npcs.find(value => value.id === id);
            if (!entry) break;
            await SillyTavern.libs?.localforage?.removeItem(npcPortraitStorageKey(entry.id));
            entry.hasPortrait = false;
            entry.portraitView = clone(defaultState().player.portraitView);
            entry.updatedAt = new Date().toISOString();
            closePortraitEditor();
            await persistState(state, 'npc-portrait');
            break;
        }
        case 'map-world': {
            selectViewedWorld(button.dataset.worldId, state);
            break;
        }
        case 'map-zoom-in':
            setMapZoom(mapView.scale * 1.25);
            break;
        case 'map-zoom-out':
            setMapZoom(mapView.scale / 1.25);
            break;
        case 'map-reset':
            resetMapView();
            break;
        case 'map-fullscreen':
            setMapFullscreen(!mapFullscreen);
            break;
        case 'map-center': {
            const location = currentMapPoint(state);
            mapView.scale = 2.45;
            mapView.x = WORLD_MAP_WIDTH / 2 - location.x * mapView.scale;
            mapView.y = WORLD_MAP_HEIGHT / 2 - location.y * mapView.scale;
            updateMapTransform();
            break;
        }
        case 'select-scene-floor': {
            const map = state.sceneMap.maps.find(entry => entry.id === button.dataset.mapId);
            const floor = map?.floors.find(entry => entry.id === id);
            if (!map || !floor) break;
            state.sceneMap.activeMapId = map.id;
            state.sceneMap.activeFloorId = floor.id;
            if (!floor.rooms.some(entry => entry.id === state.sceneMap.playerRoomId)) state.sceneMap.playerRoomId = '';
            await persistState(state, 'scene-map-view');
            break;
        }
        case 'toggle-scene-map-lock': {
            const map = state.sceneMap.maps.find(entry => entry.id === id);
            if (!map) break;
            map.locked = !map.locked;
            await persistState(state, 'scene-map-lock');
            notify('success', tr(map.locked ? 'Map locked' : 'AI updates enabled'));
            break;
        }
        case 'delete-scene-map': {
            const map = state.sceneMap.maps.find(entry => entry.id === id);
            if (!map || globalThis.confirm?.(`Delete the structure map “${map.name}”?`) === false) break;
            state.sceneMap.maps = state.sceneMap.maps.filter(entry => entry.id !== id);
            state.sceneMap.activeMapId = state.sceneMap.maps[0]?.id || '';
            state.sceneMap.activeFloorId = state.sceneMap.maps[0]?.floors[0]?.id || '';
            state.sceneMap.playerRoomId = '';
            await persistState(state, 'scene-map');
            break;
        }
        case 'delete-scene-floor': {
            const map = state.sceneMap.maps.find(entry => entry.id === button.dataset.mapId);
            const floor = map?.floors.find(entry => entry.id === id);
            if (!map || !floor || globalThis.confirm?.(`Delete floor “${floor.name}”?`) === false) break;
            map.floors = map.floors.filter(entry => entry.id !== id);
            state.sceneMap.activeFloorId = map.floors[0]?.id || '';
            state.sceneMap.playerRoomId = '';
            await persistState(state, 'scene-map');
            break;
        }
        case 'delete-scene-room': {
            const map = state.sceneMap.maps.find(entry => entry.id === button.dataset.mapId);
            const floor = map?.floors.find(entry => entry.id === button.dataset.floorId);
            const room = floor?.rooms.find(entry => entry.id === id);
            if (!floor || !room || globalThis.confirm?.(`Delete room “${room.name}”?`) === false) break;
            floor.rooms = floor.rooms.filter(entry => entry.id !== id);
            floor.connections = floor.connections.filter(entry => entry.from !== id && entry.to !== id);
            if (state.sceneMap.playerRoomId === id) state.sceneMap.playerRoomId = '';
            await persistState(state, 'scene-map');
            break;
        }
        case 'delete-scene-connection': {
            const map = state.sceneMap.maps.find(entry => entry.id === button.dataset.mapId);
            const floor = map?.floors.find(entry => entry.id === button.dataset.floorId);
            if (!floor) break;
            floor.connections = floor.connections.filter(entry => entry.id !== id);
            await persistState(state, 'scene-map');
            break;
        }
        case 'select-pin': {
            const pin = state.location.pins.find(entry => entry.id === button.dataset.pinId);
            if (!pin) break;
            if (pin.locationId && mapLocation(pin.locationId, state, true)) {
                mapDraftPoint = null;
                mapSelectionId = pin.locationId;
            } else {
                const continent = continentAtPoint(pin.x, pin.y);
                mapSelectionId = null;
                mapDraftPoint = { x: pin.x, y: pin.y, continent: pin.continent || continent?.name || 'Open Ocean', region: pin.region || 'Marked Reach', zone: 'Unknown Zone', name: pin.label };
            }
            renderMap(document.querySelector('[data-panel="map"]'), getState());
            break;
        }
        case 'delete-item':
            state.inventory = state.inventory.filter(entry => entry.id !== id);
            await persistState(state);
            break;
        case 'delete-journey-log':
            state.journeyLogs = state.journeyLogs.filter(entry => entry.id !== id);
            await persistState(state, 'journey-log');
            break;
        case 'delete-skill':
            state.skills = state.skills.filter(entry => entry.id !== id);
            await persistState(state);
            break;
        case 'delete-technique':
            state.proficiencies.techniques = state.proficiencies.techniques.filter(entry => entry.id !== id);
            await persistState(state, 'technique');
            break;
        case 'delete-custom-proficiency': {
            const collection = button.dataset.kind === 'sword' ? 'customSword' : 'customMagic';
            state.proficiencies[collection] = state.proficiencies[collection].filter(entry => entry.id !== id);
            await persistState(state, 'proficiency');
            break;
        }
        case 'quest-section': {
            const questPanel = document.querySelector('[data-panel="quests"]');
            const previousNav = questPanel?.querySelector('.tretaresia-quest-sections');
            const previousScroll = previousNav?.scrollLeft || 0;
            if (QUEST_SECTIONS.some(entry => entry.id === button.dataset.section)) activeQuestSection = button.dataset.section;
            renderQuests(questPanel, state);
            const nextNav = questPanel?.querySelector('.tretaresia-quest-sections');
            const activeButton = nextNav?.querySelector(`[data-section="${activeQuestSection}"]`);
            if (nextNav) {
                nextNav.scrollLeft = previousScroll;
                requestAnimationFrame(() => {
                    if (!nextNav.isConnected || !activeButton) return;
                    const left = activeButton.offsetLeft - Math.max(0, (nextNav.clientWidth - activeButton.offsetWidth) / 2);
                    nextNav.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
                });
            }
            break;
        }
        case 'delete-quest':
            state.quests = state.quests.filter(entry => entry.id !== id);
            await persistState(state);
            break;
        case 'dissolve-party':
            if (!state.social.party || globalThis.confirm?.(tr('Dissolve this party?')) === false) break;
            state.social.party = null;
            state.player.party = 'Solo';
            await persistState(state, 'party');
            break;
        case 'remove-party-member':
            if (!state.social.party) break;
            state.social.party.memberIds = state.social.party.memberIds.filter(memberId => memberId !== id);
            await persistState(state, 'party');
            break;
        case 'dissolve-guild': {
            const guild = state.social.guilds.find(entry => entry.id === id);
            if (!guild || globalThis.confirm?.(tr('Dissolve this guild?')) === false) break;
            state.social.guilds = state.social.guilds.filter(entry => entry.id !== id);
            if (state.player.guild === guild.name) state.player.guild = state.social.guilds[0]?.name || 'Unaffiliated';
            await persistState(state, 'guild');
            break;
        }
        case 'remove-guild-member': {
            const guild = state.social.guilds.find(entry => entry.id === button.dataset.groupId);
            if (!guild) break;
            guild.memberIds = guild.memberIds.filter(memberId => memberId !== id);
            await persistState(state, 'guild');
            break;
        }
        case 'remove-household-member':
            state.social.household.members = state.social.household.members.filter(entry => entry.id !== id);
            await persistState(state, 'household');
            break;
        case 'toggle-npc-markers':
            getSettings().showNpcMapMarkers = !getSettings().showNpcMapMarkers;
            SillyTavern.getContext().saveSettingsDebounced();
            if (document.getElementById('tretaresia-rpg-show-npc-map-markers') instanceof HTMLInputElement) {
                document.getElementById('tretaresia-rpg-show-npc-map-markers').checked = getSettings().showNpcMapMarkers;
            }
            renderMap(document.querySelector('[data-panel="map"]'), state);
            break;
        case 'toggle-npc-map': {
            const entry = state.npcs.find(value => value.id === id);
            if (!entry) break;
            entry.mapVisible = !entry.mapVisible;
            if (entry.mapVisible) {
                const point = npcMapPoint(entry, state);
                if (point) {
                    entry.mapX = point.x;
                    entry.mapY = point.y;
                } else {
                    notify('info', getSettings().language === 'th' ? `เปิด marker ของ ${entry.name} แล้ว แต่ยังไม่มีพิกัด ให้แก้ Current location หรือ World Map X/Y ในข้อมูล NPC` : `${entry.name}'s marker is enabled, but its coordinates are unknown. Edit Current location or World Map X/Y in the NPC dossier.`);
                }
            }
            entry.updatedAt = new Date().toISOString();
            await persistState(state, 'npc-map');
            break;
        }
        case 'select-npc':
            selectedNpcId = id;
            renderPanel('npcs', document.querySelector('[data-panel="npcs"]'), getState());
            break;
        case 'delete-npc': {
            const entry = state.npcs.find(value => value.id === id);
            if (!entry) break;
            if (globalThis.confirm?.(getSettings().language === 'th' ? `ลบข้อมูล NPC “${entry.name}”? รายชื่อและจดหมายเดิมจะยังอยู่` : `Delete the NPC dossier for “${entry.name}”? Existing contacts and letters will remain.`) === false) break;
            state.npcs = state.npcs.filter(value => value.id !== id);
            state.contacts.forEach(value => { if (value.npcId === id) value.npcId = ''; });
            await SillyTavern.libs?.localforage?.removeItem(npcPortraitStorageKey(id));
            if (selectedNpcId === id) selectedNpcId = state.npcs[0]?.id || null;
            await persistState(state, 'npc');
            break;
        }
        case 'link-npc-contact': {
            const entry = state.npcs.find(value => value.id === id);
            if (!entry) break;
            ensureContactForNpc(state, entry);
            await persistState(state, 'contact');
            break;
        }
        case 'open-contact-npc': {
            const contactEntry = state.contacts.find(value => value.id === id);
            if (!contactEntry) break;
            const entry = ensureNpcForContact(state, contactEntry);
            selectedNpcId = entry.id;
            await persistState(state, 'contact');
            activateTab('npcs');
            break;
        }
        case 'open-npc-mailbox': {
            const entry = state.npcs.find(value => value.id === id);
            if (!entry) break;
            const contactEntry = ensureContactForNpc(state, entry);
            await persistState(state, 'contact');
            activateTab('mail');
            requestAnimationFrame(() => {
                const form = document.querySelector('form[data-form="letter"]');
                const details = form?.closest('details');
                if (details) details.open = true;
                const selectElement = form?.querySelector('[name="contactId"]');
                if (selectElement) selectElement.value = contactEntry.id;
            });
            break;
        }
        case 'delete-npc-ability': {
            const entry = state.npcs.find(value => value.id === button.dataset.npcId);
            if (!entry) break;
            entry.abilities = entry.abilities.filter(value => value.id !== id);
            entry.updatedAt = new Date().toISOString();
            await persistState(state, 'npc');
            break;
        }
        case 'delete-npc-meter': {
            const entry = state.npcs.find(value => value.id === button.dataset.npcId);
            if (!entry) break;
            entry.customMeters = entry.customMeters.filter(value => value.id !== id);
            entry.updatedAt = new Date().toISOString();
            await persistState(state, 'npc');
            break;
        }
        case 'delete-npc-diary': {
            const entry = state.npcs.find(value => value.id === button.dataset.npcId);
            if (!entry) break;
            entry.diary = entry.diary.filter(value => value.id !== id);
            entry.updatedAt = new Date().toISOString();
            await persistState(state, 'npc');
            break;
        }
        case 'delete-contact':
            state.contacts = state.contacts.filter(entry => entry.id !== id);
            await persistState(state, 'contact');
            break;
        case 'open-letter': {
            const entry = state.letters.find(value => value.id === id);
            if (!entry) break;
            openedLetterId = entry.id;
            if (entry.status === 'unread') {
                entry.status = 'read';
                await persistState(state, 'mailbox');
            } else renderLetterReader(state);
            break;
        }
        case 'close-letter':
            openedLetterId = null;
            renderLetterReader(state);
            break;
        case 'delete-letter':
            state.letters = state.letters.filter(entry => entry.id !== id);
            if (openedLetterId === id) openedLetterId = null;
            await persistState(state, 'mailbox');
            break;
        case 'clear-letters':
            if (globalThis.confirm?.(getSettings().language === 'th' ? 'ลบจดหมายทั้งหมดในแชทนี้?' : 'Clear every letter in this chat?') !== false) {
                state.letters = [];
                openedLetterId = null;
                await persistState(state, 'mailbox');
            }
            break;
        case 'reply-letter': {
            const entry = state.letters.find(value => value.id === id);
            if (entry) await prefillLetterReply(entry);
            break;
        }
        case 'choose-audio':
            document.getElementById('tretaresia-audio-input')?.click();
            break;
        case 'music-play':
            await playTrack(id);
            break;
        case 'music-toggle':
            await toggleMusic();
            break;
        case 'music-next':
            await stepTrack(1);
            break;
        case 'music-prev':
            await stepTrack(-1);
            break;
        case 'music-repeat':
            state.music.repeat = !state.music.repeat;
            await persistState(state, 'music');
            if (audioPlayer) audioPlayer.loop = state.music.repeat;
            break;
        case 'music-shuffle':
            state.music.shuffle = !state.music.shuffle;
            await persistState(state, 'music');
            break;
        case 'delete-track':
            await removeAudioTrack(id);
            break;
    }
}

function resizePortrait(file) {
    if (!file.type.startsWith('image/')) return Promise.reject(new Error('Choose a PNG, JPG, or WebP image.'));
    if (file.size > 8 * 1024 * 1024) return Promise.reject(new Error('The image must be smaller than 8 MB.'));
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('The image could not be read.'));
        reader.onload = () => {
            const image = new Image();
            image.onerror = () => reject(new Error('The image format is not supported.'));
            image.onload = () => {
                const maxSide = 1200;
                const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
                canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
                const context = canvas.getContext('2d');
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', .84));
            };
            image.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

function updateMapTransform() {
    clampMapView();
    scheduleMapDraw();
}

function beginMapCompositorPreview(canvas) {
    if (!(canvas instanceof HTMLCanvasElement)) return;
    // Redraw the existing decoded tiles on each animation frame. Transforming
    // one frozen canvas bitmap was fast on desktop but stalls on iOS WebKit.
    mapGestureBase = null;
    mapInteracting = true;
}

function applyMapCompositorPreview() {
    return false;
}

function finishMapCompositorPreview(panel, state = getState()) {
    mapGestureBase = null;
    mapInteracting = false;
    scheduleMapDraw(panel, state);
}

function clampMapView() {
    mapView.scale = Number.isFinite(mapView.scale) ? Math.min(8, Math.max(1, mapView.scale)) : 1;
    mapView.x = Number.isFinite(mapView.x) ? mapView.x : 0;
    mapView.y = Number.isFinite(mapView.y) ? mapView.y : 0;
    mapView.x = Math.min(0, Math.max(WORLD_MAP_WIDTH * (1 - mapView.scale), mapView.x));
    mapView.y = Math.min(0, Math.max(WORLD_MAP_HEIGHT * (1 - mapView.scale), mapView.y));
}

function resetMapView() {
    Object.assign(mapView, { scale: 1, x: 0, y: 0 });
    updateMapTransform();
}

function setMapFullscreen(open) {
    mapFullscreen = Boolean(open);
    document.body.classList.toggle('tretaresia-map-fullscreen-open', mapFullscreen);
    const panel = document.querySelector('[data-panel="map"]');
    if (panel) renderMap(panel, getState());
}

function setMapZoom(scale, anchorX = WORLD_MAP_WIDTH / 2, anchorY = WORLD_MAP_HEIGHT / 2) {
    const current = Number.isFinite(mapView.scale) ? mapView.scale : 1;
    const next = Number.isFinite(scale) ? Math.min(8, Math.max(1, scale)) : current;
    const safeAnchorX = Number.isFinite(anchorX) ? anchorX : WORLD_MAP_WIDTH / 2;
    const safeAnchorY = Number.isFinite(anchorY) ? anchorY : WORLD_MAP_HEIGHT / 2;
    const ratio = next / current;
    mapView.x = safeAnchorX - (safeAnchorX - mapView.x) * ratio;
    mapView.y = safeAnchorY - (safeAnchorY - mapView.y) * ratio;
    mapView.scale = next;
    clampMapView();
    updateMapTransform();
}

function setupMapInteractions(panel) {
    const scope = mapFullscreen ? panel.querySelector('.tretaresia-map-window') || panel : panel;
    const svg = scope.querySelector('.tretaresia-world-map');
    if (!(svg instanceof HTMLCanvasElement)) return;
    mapResizeObserver?.disconnect();
    if (typeof ResizeObserver === 'function') {
        mapResizeObserver = new ResizeObserver(() => scheduleMapDraw(panel, getState()));
        mapResizeObserver.observe(svg);
    }
    if (svg.dataset.mapInteractionsBound === 'true') return;
    svg.dataset.mapInteractionsBound = 'true';
    const pointers = new Map();
    let previousCentroid = null;
    let pinchDistance = 0;
    let dragDistance = 0;
    let pointerStart = null;
    let gestureHadMultiplePointers = false;
    const mapPoint = event => {
        const rect = svg.parentElement?.getBoundingClientRect() || svg.getBoundingClientRect();
        if (!rect.width || !rect.height || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return null;
        const screenX = (event.clientX - rect.left) / rect.width * WORLD_MAP_WIDTH;
        const screenY = (event.clientY - rect.top) / rect.height * WORLD_MAP_HEIGHT;
        return { x: (screenX - mapView.x) / mapView.scale, y: (screenY - mapView.y) / mapView.scale, screenX, screenY };
    };
    const pointerCentroid = points => points.length ? {
        x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
        y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    } : null;
    svg.addEventListener('wheel', event => {
        event.preventDefault();
        beginMapCompositorPreview(svg);
        mapInteracting = true;
        globalThis.clearTimeout(mapInteractionEndTimer);
        const point = mapPoint(event);
        if (!point) {
            finishMapCompositorPreview(panel, getState());
            return;
        }
        setMapZoom(mapView.scale * (event.deltaY < 0 ? 1.15 : .87), point.screenX, point.screenY);
        mapInteractionEndTimer = globalThis.setTimeout(() => {
            finishMapCompositorPreview(panel, getState());
        }, MAP_INTERACTION_SETTLE);
    }, { passive: false });
    svg.addEventListener('pointerdown', event => {
        if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
        event.preventDefault();
        mapInteracting = true;
        globalThis.clearTimeout(mapInteractionEndTimer);
        if (!pointers.size) beginMapCompositorPreview(svg);
        svg.setPointerCapture?.(event.pointerId);
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        gestureHadMultiplePointers ||= pointers.size > 1;
        previousCentroid = pointerCentroid([...pointers.values()]);
        pinchDistance = 0;
        pointerStart = { x: event.clientX, y: event.clientY, continentId: event.target.closest?.('[data-continent-id]')?.dataset.continentId || '' };
        dragDistance = 0;
        svg.classList.add('is-dragging');
    });
    svg.addEventListener('pointermove', event => {
        if (!pointers.has(event.pointerId)) return;
        if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
        event.preventDefault();
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const points = [...pointers.values()];
        const rect = svg.parentElement?.getBoundingClientRect() || svg.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const centroid = pointerCentroid(points);
        if (points.length === 1 && previousCentroid && centroid) {
            const dx = centroid.x - previousCentroid.x;
            const dy = centroid.y - previousCentroid.y;
            const jumpLimit = Math.max(42, Math.min(rect.width, rect.height) * .22);
            previousCentroid = centroid;
            if (Math.abs(dx) > jumpLimit || Math.abs(dy) > jumpLimit) return;
            dragDistance += Math.hypot(dx, dy);
            mapView.x += dx / rect.width * WORLD_MAP_WIDTH;
            mapView.y += dy / rect.height * WORLD_MAP_HEIGHT;
            updateMapTransform();
        } else if (points.length >= 2) {
            const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
            if (pinchDistance > 0 && Number.isFinite(distance) && centroid) {
                const frameRatio = Math.min(1.22, Math.max(.82, distance / pinchDistance));
                const anchorX = (centroid.x - rect.left) / rect.width * WORLD_MAP_WIDTH;
                const anchorY = (centroid.y - rect.top) / rect.height * WORLD_MAP_HEIGHT;
                setMapZoom(mapView.scale * frameRatio, anchorX, anchorY);
            }
            pinchDistance = distance;
            previousCentroid = centroid;
        }
    }, { passive: false });
    const end = event => {
        if (!pointers.has(event.pointerId)) return;
        const wasClick = event.type === 'pointerup' && !gestureHadMultiplePointers && pointers.size === 1 && dragDistance < 7 && pointerStart;
        pointers.delete(event.pointerId);
        try { svg.releasePointerCapture?.(event.pointerId); } catch {}
        previousCentroid = pointerCentroid([...pointers.values()]);
        pinchDistance = 0;
        if (!pointers.size) {
            svg.classList.remove('is-dragging');
            gestureHadMultiplePointers = false;
            finishMapCompositorPreview(panel, getState());
        }
        if (wasClick) {
            const rect = svg.parentElement?.getBoundingClientRect() || svg.getBoundingClientRect();
            const hitX = (event.clientX - rect.left) / rect.width * svg.width;
            const hitY = (event.clientY - rect.top) / rect.height * svg.height;
            const hit = [...mapRenderedPoints].reverse().find(entry => Math.hypot(entry.x - hitX, entry.y - hitY) <= entry.radius * Math.min(1.5, globalThis.devicePixelRatio || 1));
            if (hit?.type === 'npc') {
                selectedNpcId = hit.id;
                if (mapFullscreen) setMapFullscreen(false);
                activateTab('npcs');
                pointerStart = null;
                return;
            }
            if (hit?.type === 'character-life-npc') {
                characterLifeBridge()?.openNpcLibrary?.({ scope: hit.scope, id: hit.id });
                pointerStart = null;
                return;
            }
            if (hit?.type === 'cluster') {
                setMapZoom(mapView.scale * 1.55, hit.worldX, hit.worldY);
                pointerStart = null;
                return;
            }
        }
        pointerStart = null;
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener('lostpointercapture', end);
}

function restoreComposerDraft() {
    const pending = pendingComposerDraft;
    pendingComposerDraft = null;
    if (!pending?.value) return;
    requestAnimationFrame(() => setTimeout(() => {
        const composer = document.querySelector('#send_textarea');
        if (!(composer instanceof HTMLTextAreaElement)) return;
        const current = composer.value.trim();
        const sent = pending.sent.trim();
        if (!current || current === sent) composer.value = pending.value;
        else if (current !== pending.value.trim()) composer.value = `${pending.value}\n${composer.value}`;
        composer.dispatchEvent(new Event('input', { bubbles: true }));
    }, 0));
}

async function sendChatAction(message, modeOverride = '') {
    const settings = getSettings();
    const interactionMode = ['hidden', 'visible', 'draft'].includes(modeOverride) ? modeOverride : settings.interactionMode;
    const context = SillyTavern.getContext();
    if (!context.getCurrentChatId?.()) {
        notify('warning', settings.language === 'th' ? 'เปิดแชตก่อนใช้งานคำสั่งโรลเพลย์' : 'Open a chat before using a role-play action.');
        return;
    }
    if (interactionMode === 'hidden') {
        const instruction = settings.language === 'th'
            ? `<tretaresia_rpg_action>การกระทำของผู้เล่น: ${message}\nให้ตอบสนองต่อการกระทำนี้ต่อเนื่องอย่างเป็นธรรมชาติในโรลเพลย์ ห้ามกล่าวถึงระบบ อินเทอร์เฟซ หรือคำสั่งที่ซ่อนอยู่</tretaresia_rpg_action>`
            : `<tretaresia_rpg_action>Player action: ${message}\nContinue the role-play naturally from this action. Never mention the system, interface, or hidden instruction.</tretaresia_rpg_action>`;
        context.setExtensionPrompt(ACTION_PROMPT_KEY, instruction, 1, 0, false, 0);
        closeInterface();
        setSync('working', tr('Hidden action sent'), settings.language === 'th' ? 'กำลังรอคำตอบของ AI โดยไม่สร้างข้อความผู้เล่น' : 'Waiting for the AI without creating a user bubble.');
        try {
            recordExtensionRequest('hiddenAction', 'RPG hidden role-play action');
            await context.generate('normal');
        } catch (error) {
            console.error('[Tretaresia RPG] Hidden action failed.', error);
            setSync('error', tr('Sync unavailable'), settings.language === 'th' ? 'AI ไม่สามารถตอบคำสั่งที่ซ่อนได้' : 'The AI could not resolve the hidden action.');
            notify('error', settings.language === 'th' ? 'ไม่สามารถดำเนินการที่ซ่อนไว้ได้' : 'The hidden action could not be generated.');
        } finally {
            context.setExtensionPrompt(ACTION_PROMPT_KEY, '', 1, 0, false, 0);
        }
        return;
    }
    const composer = document.querySelector('#send_textarea');
    const send = document.querySelector('#send_but');
    if (!(composer instanceof HTMLTextAreaElement) || !(send instanceof HTMLElement)) {
        notify('error', 'The SillyTavern chat composer is not available.');
        return;
    }
    const preservedDraft = composer.value;
    const hadDraft = Boolean(preservedDraft.trim());
    if (interactionMode === 'draft') {
        composer.value = hadDraft ? `${preservedDraft.trim()}\n${message}` : message;
        composer.dispatchEvent(new Event('input', { bubbles: true }));
        composer.focus();
        closeInterface();
        setSync('ready', tr('Draft prepared'), settings.language === 'th' ? 'ยังไม่ได้เรียก AI ตรวจสอบแล้วกดส่งเองเมื่อพร้อม' : 'No AI call yet. Review it and press Send when ready.');
        return;
    }
    if (send.matches(':disabled, .disabled')) {
        composer.value = hadDraft ? `${preservedDraft.trim()}\n${message}` : message;
        composer.dispatchEvent(new Event('input', { bubbles: true }));
        composer.focus();
        closeInterface();
        setSync('error', settings.language === 'th' ? 'ยังส่งข้อความไม่ได้' : 'Message not sent', settings.language === 'th' ? 'คำสั่งถูกเก็บไว้ในช่องพิมพ์' : 'The action remains in the composer for review.');
        return;
    }
    if (hadDraft) pendingComposerDraft = { value: preservedDraft, sent: message };
    composer.value = message;
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    composer.focus();
    closeInterface();
    setSync('working', tr('Visible message sent'), settings.language === 'th' ? 'กำลังรอคำตอบและตรวจการเปลี่ยนแปลงของระบบ' : 'Waiting for the reply and its confirmed state changes.');
    recordExtensionRequest('visibleAction', 'RPG visible role-play action');
    send.click();
    if (hadDraft) setTimeout(() => { if (pendingComposerDraft) restoreComposerDraft(); }, 1200);
}

const SCALAR_PATCH_PATHS = new Set([
    'player.name', 'player.race', 'player.age', 'player.title', 'player.profession', 'player.guild', 'player.party', 'player.condition', 'player.level', 'player.powerType', 'player.originSkill',
    'player.gender', 'player.homeContinent', 'player.standing', 'player.affiliation',
    'player.appearance.hair', 'player.appearance.eyes', 'player.appearance.height', 'player.appearance.build',
    'player.hp.current', 'player.hp.max', 'player.mp.current', 'player.mp.max', 'player.stamina.current', 'player.stamina.max',
    'player.survival.hunger', 'player.survival.thirst', 'player.aura.color', 'player.aura.infinite',
    'player.aura.output', 'player.aura.control', 'player.aura.efficiency', 'player.aura.recovery',
    'player.fitness.lungCapacity', 'player.fitness.aerobicSessions',
    'onboarding.identitySeeded', 'onboarding.loadoutSeeded', 'onboarding.characterMapSeeded', 'onboarding.locationSeeded',
    'progression.adventurerRank', 'progression.customRankName', 'progression.magicRank', 'progression.swordRank', 'progression.experience',
    'progression.experienceMax', 'progression.reputation', 'progression.kills', 'progression.currency.gold', 'progression.currency.silver',
    'progression.currency.name', 'progression.currency.copper', 'world.id', 'worldClock.day', 'worldClock.dayName', 'worldClock.time', 'worldClock.phase', 'location.continent',
    'location.region', 'location.place', 'location.detail', 'location.zoneType', 'location.mapX', 'location.mapY', 'location.heading', 'scene.position', 'scene.weather', 'scene.temperature',
    'travel.status', 'travel.origin', 'travel.destination', 'travel.route', 'travel.totalDays', 'travel.remainingDays', 'travel.notes',
    'travel.originX', 'travel.originY', 'travel.originContinent', 'travel.originRegion', 'travel.destinationX', 'travel.destinationY',
    'travel.destinationContinent', 'travel.destinationRegion', 'travel.destinationPlace',
    'sceneMap.activeMapId', 'sceneMap.activeFloorId', 'sceneMap.playerRoomId',
    ...MAGIC_DISCIPLINES.map(entry => `proficiencies.magic.${entry.id}`),
    ...SWORD_STYLES.map(entry => `proficiencies.sword.${entry.id}`),
]);
const PATCH_COLLECTIONS = new Set(['inventory', 'skills', 'proficiencies.customMagic', 'proficiencies.customSword', 'proficiencies.techniques', 'quests', 'npcs', 'contacts', 'letters', 'characterLifeMapActors', 'effects', 'combatLogs', 'regionalWeather']);
const SCENE_MAP_PATCH_COLLECTIONS = new Set(['sceneMaps', 'sceneFloors', 'sceneRooms', 'sceneConnections']);
const NPC_RELATIONSHIP_FIELDS = new Set(['affection', 'trust', 'loyalty', 'fear', 'corruption', 'lust']);
const NPC_STAT_FIELDS = new Set(['level', 'hp', 'mp', 'stamina', 'strength', 'agility', 'intelligence', 'endurance']);

const PATCH_PATH_ALIASES = Object.freeze({
    'status.hp.current': 'player.hp.current', 'status.hp.max': 'player.hp.max',
    'vitals.hp.current': 'player.hp.current', 'vitals.hp.max': 'player.hp.max',
    'player.health.current': 'player.hp.current', 'player.health.max': 'player.hp.max',
    'status.mp.current': 'player.mp.current', 'status.mp.max': 'player.mp.max',
    'vitals.mp.current': 'player.mp.current', 'vitals.mp.max': 'player.mp.max',
    'player.mana.current': 'player.mp.current', 'player.mana.max': 'player.mp.max',
    'player.aura.current': 'player.mp.current', 'player.aura.max': 'player.mp.max',
    'status.stamina.current': 'player.stamina.current', 'status.stamina.max': 'player.stamina.max',
    'status.hunger': 'player.survival.hunger', 'vitals.hunger': 'player.survival.hunger',
    'status.thirst': 'player.survival.thirst', 'vitals.thirst': 'player.survival.thirst',
    'scene.currentRegion': 'location.region', 'scene.currentPlace': 'location.place',
    'scene.scenePosition': 'scene.position', 'scene.currentPosition': 'scene.position',
    'scene.mapX': 'location.mapX', 'scene.mapY': 'location.mapY',
    'powers.falseMagic': 'proficiencies.magic.falseMagic', 'powers.trueMagic': 'proficiencies.magic.trueMagic',
    'powers.aura': 'proficiencies.magic.aura', 'powers.formlessAura': 'proficiencies.magic.formlessAura',
    'powers.bloodAura': 'proficiencies.magic.bloodAura', 'powers.sageMana': 'proficiencies.magic.sageMana',
    'powers.divineMana': 'proficiencies.magic.divineMana', 'powers.construct': 'proficiencies.magic.construct',
    'powers.divineConstruct': 'proficiencies.magic.divineConstruct',
});

function canonicalPatchOperations(operation) {
    if (!Array.isArray(operation) || operation.length < 3) return [];
    let [verb, path, value, meta] = operation;
    path = PATCH_PATH_ALIASES[path] || path;
    if (path === 'social.party') path = 'party';
    if (path === 'social.guilds') path = 'guilds';
    if (['social.party.memberIds', 'party.memberIds', 'party.members'].includes(path) && Array.isArray(value)) {
        return value.map(member => ['upsert', 'partyMembers', typeof member === 'object' ? member : { npcId: member }, meta]);
    }
    if (['social.guildMembers', 'guild.members'].includes(path) && Array.isArray(value)) {
        return value.map(member => ['upsert', 'guildMembers', typeof member === 'object' ? member : { npcId: member }, meta]);
    }
    if (path === 'player.aura.type' || path === 'player.mana.type') {
        return [['set', 'player.powerType', value, meta]];
    }
    if (path === 'player.aura.divine' && Boolean(value)) return [['set', 'player.powerType', 'Divine Mana', meta]];
    if (path === 'player.aura.color' && typeof value === 'string') {
        const colors = { white: '#ffffff', divine: '#ffffff', red: '#ef4444', blue: '#3b82f6', green: '#22c55e', purple: '#a855f7', gold: '#f5c451', black: '#111111' };
        value = colors[value.trim().toLocaleLowerCase()] || value;
    }
    if (path === 'player.aura.infinite' && typeof value === 'string') value = /^(?:true|yes|1|infinite|boundless|limitless|unlimited)$/i.test(value.trim());
    return [[verb, path, value, meta]];
}

function parseJson(response) {
    const cleaned = String(response || '').trim().replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`$/, '');
    try {
        return JSON.parse(cleaned);
    } catch {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
        throw new Error('The AI response did not contain valid JSON.');
    }
}

function collectionForPatch(state, path) {
    if (path === 'proficiencies.techniques') return state.proficiencies.techniques;
    if (path === 'proficiencies.customMagic') return state.proficiencies.customMagic;
    if (path === 'proficiencies.customSword') return state.proficiencies.customSword;
    if (path === 'effects') return state.systems.effects;
    if (path === 'combatLogs') return state.systems.combatLogs;
    if (path === 'regionalWeather') return state.systems.regionalWeather;
    return state[path];
}

function patchIdentity(value) {
    if (value && typeof value === 'object') return text(value.id, '', 100)
        || text(value.name, '', 160).toLocaleLowerCase()
        || text(value.region, '', 160).toLocaleLowerCase()
        || text(value.fact, '', 160).toLocaleLowerCase()
        || text(value.summary, '', 160).toLocaleLowerCase();
    return text(value, '', 160).toLocaleLowerCase();
}

function matchesPatchIdentity(entry, value) {
    const requestedId = value && typeof value === 'object' ? text(value.id, '', 100) : text(value, '', 160);
    const requestedName = value && typeof value === 'object' ? text(value.name, '', 160).toLocaleLowerCase() : requestedId.toLocaleLowerCase();
    return Boolean((requestedId && entry?.id === requestedId)
        || (requestedName && text(entry?.name, '', 160).toLocaleLowerCase() === requestedName));
}

function sceneMapForPatch(state, value) {
    const id = text(value?.mapId, text(value?.id, typeof value === 'string' ? value : '', 100), 100);
    const name = text(value?.mapName, text(value?.name, '', 140), 140).toLocaleLowerCase();
    return state.sceneMap.maps.find(entry => entry.id === id)
        || state.sceneMap.maps.find(entry => name && entry.name.toLocaleLowerCase() === name);
}

function sceneFloorForPatch(map, value) {
    const id = text(value?.floorId, text(value?.id, '', 100), 100);
    const name = text(value?.floorName, text(value?.name, '', 80), 80).toLocaleLowerCase();
    return map?.floors.find(entry => entry.id === id)
        || map?.floors.find(entry => name && entry.name.toLocaleLowerCase() === name);
}

function applySceneMapPatchOperation(state, verb, path, value) {
    if (!value || (typeof value !== 'object' && path !== 'sceneMaps')) return false;
    if (path === 'sceneMaps') {
        const existing = sceneMapForPatch(state, value);
        if (verb === 'delete') {
            if (!existing || existing.locked) return false;
            state.sceneMap.maps = state.sceneMap.maps.filter(entry => entry.id !== existing.id);
            if (state.sceneMap.activeMapId === existing.id) {
                state.sceneMap.activeMapId = state.sceneMap.maps[0]?.id || '';
                state.sceneMap.activeFloorId = state.sceneMap.maps[0]?.floors[0]?.id || '';
                state.sceneMap.playerRoomId = '';
            }
            return true;
        }
        if (verb !== 'upsert' || existing?.locked) return false;
        const next = sceneStructure({
            id: existing?.id || value.id, name: value.name, place: value.place,
            locked: existing?.locked || false, floors: existing?.floors || [],
        }, existing || {});
        if (!next) return false;
        if (existing) state.sceneMap.maps[state.sceneMap.maps.indexOf(existing)] = next;
        else {
            state.sceneMap.maps.push(next);
            if (!state.sceneMap.activeMapId) state.sceneMap.activeMapId = next.id;
        }
        return true;
    }

    const map = sceneMapForPatch(state, value);
    if (!map || map.locked) return false;
    if (path === 'sceneFloors') {
        const existing = sceneFloorForPatch(map, value);
        if (verb === 'delete') {
            if (!existing) return false;
            map.floors = map.floors.filter(entry => entry.id !== existing.id);
            if (state.sceneMap.activeFloorId === existing.id) {
                state.sceneMap.activeFloorId = map.floors[0]?.id || '';
                state.sceneMap.playerRoomId = '';
            }
            return true;
        }
        if (verb !== 'upsert') return false;
        const next = sceneFloor({
            id: existing?.id || value.id, name: value.name, level: value.level,
            rooms: existing?.rooms || [], connections: existing?.connections || [],
        }, existing || {});
        if (!next) return false;
        if (existing) map.floors[map.floors.indexOf(existing)] = next;
        else map.floors.push(next);
        return true;
    }

    const floor = sceneFloorForPatch(map, value);
    if (!floor) return false;
    if (path === 'sceneRooms') {
        const requestedId = text(value.roomId, text(value.id, '', 100), 100);
        const requestedName = text(value.name, '', 120).toLocaleLowerCase();
        const existing = floor.rooms.find(entry => entry.id === requestedId)
            || floor.rooms.find(entry => requestedName && entry.name.toLocaleLowerCase() === requestedName);
        if (verb === 'delete') {
            if (!existing || existing.locked) return false;
            floor.rooms = floor.rooms.filter(entry => entry.id !== existing.id);
            floor.connections = floor.connections.filter(entry => entry.from !== existing.id && entry.to !== existing.id);
            if (state.sceneMap.playerRoomId === existing.id) state.sceneMap.playerRoomId = '';
            return true;
        }
        if (verb !== 'upsert' || existing?.locked) return false;
        const next = sceneRoom({
            id: existing?.id || value.id, name: value.name, type: value.type, x: value.x, y: value.y,
            width: value.width, height: value.height, discovered: value.discovered,
            locked: existing?.locked || false,
        }, existing || {});
        if (!next) return false;
        if (existing) floor.rooms[floor.rooms.indexOf(existing)] = next;
        else floor.rooms.push(next);
        return true;
    }

    const requestedId = text(value.connectionId, text(value.id, '', 100), 100);
    const existing = floor.connections.find(entry => entry.id === requestedId)
        || floor.connections.find(entry => (
            (entry.from === value.from && entry.to === value.to) || (entry.from === value.to && entry.to === value.from)
        ) && entry.type === value.type);
    if (verb === 'delete') {
        if (!existing || existing.locked) return false;
        floor.connections = floor.connections.filter(entry => entry.id !== existing.id);
        return true;
    }
    if (verb !== 'upsert' || existing?.locked) return false;
    if (!floor.rooms.some(entry => entry.id === value.from) || !floor.rooms.some(entry => entry.id === value.to)) return false;
    const next = sceneConnection({ id: existing?.id || value.id, from: value.from, to: value.to, type: value.type, locked: existing?.locked || false }, existing || {});
    if (!next) return false;
    if (existing) floor.connections[floor.connections.indexOf(existing)] = next;
    else floor.connections.push(next);
    return true;
}

function applySocialPatchOperation(state, verb, path, value) {
    state.social ||= defaultSocialState();
    if (path === 'household') {
        if (verb !== 'upsert' || !value || typeof value !== 'object') return false;
        const next = householdProfile({ ...state.social.household, ...value }, state.social.household);
        next.members = next.members.filter(member => !member.npcId || resolveFriendlyNpc(state, member.npcId));
        state.social.household = next;
        return true;
    }
    if (path === 'party') {
        if (verb === 'delete') {
            if (!state.social.party) return false;
            state.social.party = null;
            state.player.party = 'Solo';
            return true;
        }
        if (verb !== 'upsert' || !value || typeof value !== 'object') return false;
        const next = partyProfile(value, state.social.party);
        if (!next) return false;
        next.memberIds = [...new Set(next.memberIds.map(id => resolveFriendlyNpc(state, id)?.id).filter(Boolean))];
        state.social.party = next;
        state.player.party = next.name;
        return true;
    }
    if (path === 'guilds') {
        if (verb === 'delete') {
            const existing = state.social.guilds.find(entry => matchesPatchIdentity(entry, value));
            if (!existing) return false;
            state.social.guilds = state.social.guilds.filter(entry => entry.id !== existing.id);
            if (state.player.guild === existing.name) state.player.guild = state.social.guilds[0]?.name || 'Unaffiliated';
            return true;
        }
        if (verb !== 'upsert' || !value || typeof value !== 'object') return false;
        const existing = state.social.guilds.find(entry => matchesPatchIdentity(entry, value));
        const playerCreated = !existing && value.createdByPlayer === true;
        if (playerCreated && !canAffordCurrency(state.progression.currency, GUILD_CREATION_FEE)) return false;
        const next = guildProfile(value, existing || {});
        if (!next) return false;
        next.memberIds = [...new Set(next.memberIds.map(id => resolveFriendlyNpc(state, id)?.id).filter(Boolean))];
        if (existing) state.social.guilds[state.social.guilds.indexOf(existing)] = next;
        else {
            if (playerCreated) state.progression.currency.gold -= GUILD_CREATION_FEE.gold;
            next.treasury = {
                gold: number(value.treasury?.gold, playerCreated ? GUILD_CREATION_FEE.gold : 0, 0, 999999999),
                silver: number(value.treasury?.silver, playerCreated ? GUILD_CREATION_FEE.silver : 0, 0, 999999999),
                copper: number(value.treasury?.copper, playerCreated ? GUILD_CREATION_FEE.copper : 0, 0, 999999999),
            };
            state.social.guilds.push(next);
        }
        state.player.guild = state.social.guilds[0]?.name || 'Unaffiliated';
        return true;
    }
    if (path === 'partyMembers') {
        const party = state.social.party;
        const npc = verb === 'upsert' ? resolveOrCreateFriendlyNpc(state, value) : resolveFriendlyNpc(state, value);
        if (!party || !npc) return false;
        if (verb === 'upsert') {
            if (party.memberIds.includes(npc.id)) return false;
            party.memberIds.push(npc.id);
            return true;
        }
        if (verb === 'delete') {
            const previous = party.memberIds.length;
            party.memberIds = party.memberIds.filter(id => id !== npc.id);
            return party.memberIds.length !== previous;
        }
        return false;
    }
    if (path === 'guildMembers') {
        const guildId = text(value?.guildId, text(value?.groupId, '', 100), 100);
        const guild = state.social.guilds.find(entry => entry.id === guildId || entry.name.toLocaleLowerCase() === text(value?.guildName, '', 140).toLocaleLowerCase());
        const npc = verb === 'upsert' ? resolveOrCreateFriendlyNpc(state, value) : resolveFriendlyNpc(state, value);
        if (!guild || !npc) return false;
        if (verb === 'upsert') {
            if (guild.memberIds.includes(npc.id)) return false;
            guild.memberIds.push(npc.id);
            return true;
        }
        if (verb === 'delete') {
            const previous = guild.memberIds.length;
            guild.memberIds = guild.memberIds.filter(id => id !== npc.id);
            return guild.memberIds.length !== previous;
        }
        return false;
    }
    if (path === 'householdMembers') {
        const household = state.social.household;
        if (verb === 'delete') {
            const identity = patchIdentity(value) || text(value?.npcId, text(value?.npcName, '', 100), 100);
            const previous = household.members.length;
            household.members = household.members.filter(entry => !(matchesPatchIdentity(entry, value) || (identity && entry.npcId === identity)));
            return household.members.length !== previous && Boolean(identity);
        }
        if (verb !== 'upsert') return false;
        const npc = resolveOrCreateFriendlyNpc(state, value);
        if (!npc) return false;
        const next = socialMember({ ...value, npcId: npc.id, name: npc.name }, {});
        if (!next) return false;
        const index = household.members.findIndex(entry => matchesPatchIdentity(entry, next) || entry.npcId === npc.id);
        if (index >= 0) household.members[index] = { ...household.members[index], ...next, id: household.members[index].id };
        else household.members.push(next);
        return true;
    }
    return false;
}

function applyPatchOperation(state, operation) {
    if (!Array.isArray(operation) || operation.length < 3) return false;
    const [verb, path, value] = operation;
    if (['party', 'guilds', 'household', 'partyMembers', 'guildMembers', 'householdMembers'].includes(path)) {
        return applySocialPatchOperation(state, verb, path, value);
    }
    if ((verb === 'set' || verb === 'inc') && SCALAR_PATCH_PATHS.has(path)) {
        const parts = path.split('.');
        const key = parts.pop();
        let target = state;
        for (const part of parts) {
            if (!target?.[part] || typeof target[part] !== 'object') return false;
            target = target[part];
        }
        target[key] = verb === 'inc' ? number(target[key], 0, -999999999, 999999999) + number(value, 0, -999999999, 999999999) : value;
        return true;
    }
    if (verb === 'add' && path === 'location.discovered' && typeof value === 'string') {
        return addDiscoveredLocation(state, text(value, '', 120));
    }
    if (SCENE_MAP_PATCH_COLLECTIONS.has(path)) return applySceneMapPatchOperation(state, verb, path, value);
    if (path === 'npcValues' && ['set', 'inc'].includes(verb) && value && typeof value === 'object') {
        const npc = state.npcs.find(entry => entry.id === value.npcId)
            || state.npcs.find(entry => entry.name.toLocaleLowerCase() === text(value.npcName).toLocaleLowerCase());
        const field = text(value.field, '', 80);
        if (!npc) return false;
        if (NPC_RELATIONSHIP_FIELDS.has(field)) {
            const nextValue = verb === 'inc' ? number(npc[field], 0, 0, 100) + number(value.amount, 0, -100, 100) : value.value;
            npc[field] = number(nextValue, npc[field], 0, 100);
        } else if (field === 'stats.rank' && verb === 'set') {
            npc.stats.rank = text(value.value, npc.stats.rank, 80);
        } else if (field.startsWith('stats.') && NPC_STAT_FIELDS.has(field.slice(6))) {
            const key = field.slice(6);
            const nextValue = verb === 'inc' ? number(npc.stats[key], 0, 0, 999999) + number(value.amount, 0, -999999, 999999) : value.value;
            npc.stats[key] = number(nextValue, npc.stats[key], 0, 999999);
        } else return false;
        npc.updatedAt = new Date().toISOString();
        return true;
    }
    if (['npcAbilities', 'npcMeters', 'npcDiary', 'npcKnowledge'].includes(path) && value && typeof value === 'object') {
        const npc = state.npcs.find(entry => entry.id === value.npcId)
            || state.npcs.find(entry => entry.name.toLocaleLowerCase() === text(value.npcName).toLocaleLowerCase());
        if (!npc) return false;
        if (path === 'npcDiary' && verb === 'append') {
            const entry = npcDiaryEntry(value);
            if (!entry) return false;
            npc.diary.push(entry);
            npc.diary = npc.diary.slice(-40);
            npc.updatedAt = new Date().toISOString();
            return true;
        }
        if (path === 'npcKnowledge') {
            if (verb === 'upsert') {
                const entry = knowledgeFact(value);
                if (!entry) return false;
                const index = npc.knowledge.findIndex(current => matchesPatchIdentity(current, entry)
                    || current.fact.toLocaleLowerCase() === entry.fact.toLocaleLowerCase());
                if (index >= 0) npc.knowledge[index] = { ...npc.knowledge[index], ...entry, id: npc.knowledge[index].id };
                else npc.knowledge.push(entry);
                npc.knowledge = npc.knowledge.slice(-80);
                npc.updatedAt = new Date().toISOString();
                return true;
            }
            if (verb === 'delete') {
                const previousLength = npc.knowledge.length;
                npc.knowledge = npc.knowledge.filter(entry => !matchesPatchIdentity(entry, value));
                return npc.knowledge.length !== previousLength;
            }
            return false;
        }
        const key = path === 'npcAbilities' ? 'abilities' : 'customMeters';
        const sanitizer = path === 'npcAbilities' ? npcAbility : npcMeter;
        if (verb === 'upsert') {
            const entry = sanitizer(value);
            if (!entry) return false;
            const index = npc[key].findIndex(current => matchesPatchIdentity(current, entry));
            if (index >= 0) npc[key][index] = { ...npc[key][index], ...entry, id: npc[key][index].id };
            else npc[key].push(entry);
            npc.updatedAt = new Date().toISOString();
            return true;
        }
        if (verb === 'delete') {
            const previousLength = npc[key].length;
            npc[key] = npc[key].filter(entry => !matchesPatchIdentity(entry, value));
            if (npc[key].length !== previousLength) npc.updatedAt = new Date().toISOString();
            return npc[key].length !== previousLength;
        }
        return false;
    }
    if (path === 'inventory' && verb === 'inc' && value && typeof value === 'object') {
        const delta = number(value.quantity ?? value.amount ?? value.delta, 0, -99999, 99999);
        if (!delta) return false;
        const index = state.inventory.findIndex(entry => matchesPatchIdentity(entry, value));
        if (index >= 0) {
            const currentItem = state.inventory[index];
            const nextQuantity = number(currentItem.quantity, 0, 0, 99999) + delta;
            if (nextQuantity <= 0) state.inventory.splice(index, 1);
            else state.inventory[index] = item({
                ...currentItem,
                ...(text(value.name) ? { name: value.name } : {}),
                ...(text(value.category) ? { category: value.category } : {}),
                ...(text(value.description) ? { description: value.description } : {}),
                quantity: nextQuantity,
            });
            return true;
        }
        if (delta < 0) return false;
        const candidate = item({ ...value, quantity: delta });
        if (!candidate) return false;
        state.inventory.push(candidate);
        return true;
    }
    if (!PATCH_COLLECTIONS.has(path)) return false;
    const collection = collectionForPatch(state, path);
    if (!Array.isArray(collection)) return false;
    if (verb === 'upsert' && value && typeof value === 'object') {
        const identity = patchIdentity(value);
        if (!identity && path !== 'letters') return false;
        const index = path === 'regionalWeather'
            ? collection.findIndex(entry => entry.region.toLocaleLowerCase() === text(value.region, '', 120).toLocaleLowerCase())
            : collection.findIndex(entry => matchesPatchIdentity(entry, value));
        let candidate = { ...(index >= 0 ? collection[index] : {}), ...value };
        if (!candidate.id) candidate.id = uid();
        if (path === 'npcs') {
            candidate = npcProfile({ ...candidate, updatedAt: new Date().toISOString() }, index >= 0 ? collection[index] : {});
            if (!candidate) return false;
        }
        if (path === 'characterLifeMapActors') {
            candidate = characterLifeMapActor({ ...candidate, updatedAt: new Date().toISOString() }, index >= 0 ? collection[index] : {});
            if (!candidate) return false;
        }
        if (path === 'quests') {
            const previousQuest = index >= 0 ? collection[index] : null;
            if (previousQuest && ['Completed', 'Failed'].includes(previousQuest.status)
                && value.status && value.status !== previousQuest.status && value.reopen !== true) {
                candidate.status = previousQuest.status;
            }
            if (!candidate.receivedAt) candidate.receivedAt = new Date().toISOString();
            candidate.updatedAt = new Date().toISOString();
            candidate = quest(candidate);
            if (!candidate) return false;
        }
        if (path === 'effects') {
            candidate = statusEffect(candidate, index >= 0 ? collection[index] : {});
            if (!candidate) return false;
        }
        if (path === 'combatLogs') {
            candidate = combatLogEntry(candidate);
            if (!candidate) return false;
        }
        if (path === 'regionalWeather') {
            candidate = regionalWeatherEntry(candidate, index >= 0 ? collection[index] : {});
            if (!candidate) return false;
        }
        if (index >= 0) collection[index] = candidate;
        else collection.push(candidate);
        return true;
    }
    if (verb === 'delete') {
        const identity = patchIdentity(value);
        if (!identity) return false;
        const previousLength = collection.length;
        const retained = collection.filter(entry => !matchesPatchIdentity(entry, value));
        collection.splice(0, collection.length, ...retained);
        if (path === 'npcs' && retained.length !== previousLength) {
            const removedIds = new Set(state.contacts.filter(entry => !retained.some(npc => npc.id === entry.npcId)).map(entry => entry.npcId));
            state.contacts.forEach(entry => { if (removedIds.has(entry.npcId)) entry.npcId = ''; });
        }
        return retained.length !== previousLength;
    }
    return false;
}

function operationMeta(operation) {
    const raw = operation?.[3];
    if (typeof raw === 'string') return { reason: text(raw, '', 180) };
    return raw && typeof raw === 'object' ? {
        reason: text(raw.reason, text(raw.label, '', 180), 180),
        category: text(raw.category, '', 40).toLocaleLowerCase(),
        label: text(raw.label, '', 100),
        questId: text(raw.questId, text(raw.missionId, '', 100), 100),
    } : { reason: '', category: '', label: '' };
}

function isDuplicateQuestRewardOperation(state, operation) {
    const meta = operationMeta(operation);
    if (!['quest-reward', 'mission-reward', 'reward'].includes(meta.category)) return false;
    const reason = meta.reason.toLocaleLowerCase();
    const claimed = state.quests.find(entry => entry.rewardClaimed && entry.status === 'Completed'
        && (meta.questId && entry.id === meta.questId || reason && reason.includes(entry.name.toLocaleLowerCase())));
    if (!claimed) return false;
    const [verb, path, value] = operation;
    if (verb === 'inc') {
        if (path === 'inventory') return number(value?.quantity ?? value?.amount ?? value?.delta, 0, -99999, 99999) > 0;
        return Number(value) > 0 && (path === 'progression.experience' || path === 'progression.reputation' || path.startsWith('progression.currency.'));
    }
    return verb === 'upsert' && ['inventory', 'skills', 'proficiencies.techniques'].includes(path);
}

function derivePatchNotifications(current, next, operations, levelUps) {
    const events = [];
    const findOp = path => [...operations].reverse().find(operation => operation[1] === path);
    const expOps = operations.filter(operation => operation[1] === 'progression.experience');
    let expGain = 0;
    for (const [verb, , value] of expOps) expGain += verb === 'inc' ? Math.max(0, Number(value) || 0) : Math.max(0, (Number(value) || 0) - current.progression.experience);
    if (expGain > 0) {
        const meta = operationMeta(expOps.at(-1));
        const combat = ['combat', 'kill', 'battle'].includes(meta.category);
        events.push({ kind: combat ? 'combat' : 'experience', eyebrow: combat ? 'COMBAT RECORD' : 'EXPERIENCE', title: meta.reason || (combat ? 'Combat experience gained' : 'Experience gained'), detail: combat ? 'Battle progress has been recorded.' : 'Your actions advanced your growth.', value: `+${expGain} EXP` });
    }
    if (levelUps > 0) events.push({ kind: 'level', eyebrow: 'LEVEL UP', title: `Level ${next.player.level} reached`, detail: `${next.progression.experience} / ${next.progression.experienceMax} EXP toward the next level`, value: levelUps > 1 ? `+${levelUps} LV` : 'LEVEL UP' });
    const killDelta = next.progression.kills - current.progression.kills;
    if (killDelta > 0) {
        const meta = operationMeta(findOp('progression.kills'));
        events.push({ kind: 'kill', eyebrow: 'ELIMINATION', title: meta.reason || `${killDelta} hostile target${killDelta === 1 ? '' : 's'} defeated`, detail: `Total confirmed kills: ${next.progression.kills}`, value: `+${killDelta}` });
    }
    const learned = operations.filter(operation => operation[0] === 'upsert' && ['skills', 'proficiencies.customMagic', 'proficiencies.customSword', 'proficiencies.techniques'].includes(operation[1]));
    for (const operation of learned.slice(-3)) {
        const meta = operationMeta(operation);
        const name = text(operation[2]?.name, meta.label || 'New knowledge', 100);
        events.push({ kind: 'learning', eyebrow: 'LEARNED', title: name, detail: meta.reason || 'Added to your mastery archive.', value: operation[2]?.rank || '' });
    }
    const proficiencyOp = [...operations].reverse().find(operation => operation[0] === 'inc' && String(operation[1]).startsWith('proficiencies.'));
    if (proficiencyOp && !learned.length) {
        const meta = operationMeta(proficiencyOp);
        const name = meta.label || String(proficiencyOp[1]).split('.').at(-1).replaceAll('-', ' ');
        events.push({ kind: meta.category === 'combat' ? 'combat' : 'learning', eyebrow: meta.category === 'combat' ? 'COMBAT MASTERY' : 'TRAINING', title: meta.reason || `${name} improved`, value: `+${number(proficiencyOp[2], 0, 0, 100)}%` });
    }
    const questOps = operations.filter(operation => operation[0] === 'upsert' && operation[1] === 'quests');
    for (const operation of questOps.slice(-3)) {
        const value = operation[2] || {};
        const before = current.quests.find(entry => matchesPatchIdentity(entry, value));
        const after = next.quests.find(entry => matchesPatchIdentity(entry, value));
        if (!after) continue;
        if (!before) {
            events.push({ kind: 'quest', eyebrow: after.status === 'Offered' ? 'NEW QUEST OFFER' : 'NEW MISSION', title: after.name, detail: after.objective || `Received from ${after.giver || after.source || 'an unknown source'}.`, value: after.status.toUpperCase() });
        } else if (before.status !== after.status) {
            const complete = after.status === 'Completed';
            events.push({ kind: 'quest', eyebrow: complete ? 'MISSION COMPLETE' : 'QUEST UPDATED', title: after.name, detail: after.objective || `Status changed from ${before.status} to ${after.status}.`, value: after.status.toUpperCase() });
        }
    }
    for (const denomination of ['gold', 'silver', 'copper']) {
        const delta = next.progression.currency[denomination] - current.progression.currency[denomination];
        if (!delta) continue;
        const meta = operationMeta(findOp(`progression.currency.${denomination}`));
        events.push({
            kind: 'currency', eyebrow: delta > 0 ? 'FUNDS RECEIVED' : 'PAYMENT RECORDED',
            title: meta.reason || (delta > 0 ? `Received ${denomination}` : `Spent ${denomination}`),
            detail: `${next.progression.currency.name} · Balance ${next.progression.currency[denomination]} ${denomination}`,
            value: `${delta > 0 ? '+' : ''}${delta} ${denomination}`,
        });
    }
    return events.slice(0, 8);
}

function recordPatchTransactions(next, current, operations, summary) {
    const running = {
        gold: current.progression.currency.gold,
        silver: current.progression.currency.silver,
        copper: current.progression.currency.copper,
    };
    for (const operation of operations) {
        const [verb, path, value] = operation;
        const denomination = String(path || '').match(/^progression\.currency\.(gold|silver|copper)$/)?.[1];
        if (!denomination || !['set', 'inc'].includes(verb)) continue;
        const before = running[denomination];
        const after = verb === 'inc'
            ? Math.max(0, before + number(value, 0, -999999999, 999999999))
            : Math.max(0, number(value, before, 0, 999999999));
        running[denomination] = after;
        const delta = after - before;
        if (!delta) continue;
        const meta = operationMeta(operation);
        appendCurrencyTransaction(next, { [denomination]: delta }, meta.reason || summary || 'Role-play transaction', meta.category || 'roleplay', running);
    }
    const residual = currencyDelta(running, next.progression.currency);
    if (residual.gold || residual.silver || residual.copper) {
        const guildCreated = operations.some(operation => operation[0] === 'upsert' && operation[1] === 'guilds');
        appendCurrencyTransaction(next, residual, guildCreated ? 'Guild creation fee' : summary || 'Role-play balance change', 'roleplay');
    }
}

function significantJourneyOperation(current, next, operation) {
    const [verb, path, value] = operation;
    if (['player.level', 'player.profession', 'player.powerType', 'player.originSkill', 'progression.adventurerRank', 'progression.customRankName', 'progression.kills',
        'location.place', 'location.region', 'location.continent', 'travel.status', 'travel.destination', 'travel.destinationPlace'].includes(path)) return true;
    if (['skills', 'proficiencies.customMagic', 'proficiencies.customSword', 'proficiencies.techniques',
        'party', 'guilds', 'household', 'partyMembers', 'guildMembers', 'householdMembers'].includes(path)) return ['upsert', 'delete'].includes(verb);
    if (path === 'quests' && verb === 'upsert') {
        const before = current.quests.find(entry => matchesPatchIdentity(entry, value));
        const after = next.quests.find(entry => matchesPatchIdentity(entry, value));
        return !before || before.status !== after?.status;
    }
    if (path === 'location.discovered') return true;
    return false;
}

function applyStatePatch(current, patch) {
    if (!patch || typeof patch !== 'object' || !Array.isArray(patch.ops)) throw new Error('State patch is missing an ops array.');
    const candidate = clone(current);
    const acceptedOps = [];
    const rewardOps = new Set();
    const operations = patch.ops.slice(0, 75).flatMap(canonicalPatchOperations).slice(0, 100);
    for (const operation of operations) {
        if (isDuplicateQuestRewardOperation(current, operation)) continue;
        const meta = operationMeta(operation);
        if (['quest-reward', 'mission-reward', 'reward'].includes(meta.category)) {
            const rewardKey = `${meta.questId || meta.reason.toLocaleLowerCase()}::${operation[0]}::${operation[1]}::${patchIdentity(operation[2])}`;
            if (rewardOps.has(rewardKey)) continue;
            rewardOps.add(rewardKey);
        }
        if (applyPatchOperation(candidate, operation)) acceptedOps.push(operation);
    }
    let next = normalize(candidate, current);
    synchronizeWorldState(next, current);
    synchronizeDerivedPlayerState(next);
    next = normalize(next, current);
    const levelUps = resolveLevelProgression(next);
    next.player.portrait = current.player.portrait;
    next.player.portraitView = clone(current.player.portraitView);
    next.npcs.forEach(entry => {
        const previous = current.npcs.find(value => value.id === entry.id) || current.npcs.find(value => value.name.toLocaleLowerCase() === entry.name.toLocaleLowerCase());
        entry.hasPortrait = Boolean(previous?.hasPortrait);
        entry.portraitView = clone(previous?.portraitView || defaultState().player.portraitView);
    });
    next.music = clone(current.music);
    next.location.pins = clone(current.location.pins);
    const accepted = acceptedOps.length;
    const summary = text(patch.summary, accepted ? 'Role-play state updated.' : '', 300);
    if (accepted) {
        recordPatchTransactions(next, current, acceptedOps, summary);
        if (summary) next.journal = [...current.journal, { id: uid(), text: summary, at: new Date().toISOString() }].slice(-30);
        const explicitJourney = text(patch.journey, '', 500);
        const inferredJourney = acceptedOps.some(operation => significantJourneyOperation(current, next, operation)) ? summary : '';
        const journeyText = explicitJourney || inferredJourney;
        if (journeyText) appendJourneyLog(next, {
            text: journeyText,
            place: next.location.place,
            day: next.worldClock.dayName || `Day ${next.worldClock.day}`,
            kind: explicitJourney ? 'story' : 'milestone',
        });
    }
    return { next, accepted, summary, notifications: derivePatchNotifications(current, next, acceptedOps, levelUps) };
}

function balancedJsonRange(source, from = 0) {
    const start = source.indexOf('{', from);
    if (start < 0) return null;
    let depth = 0;
    let quoted = false;
    let escaped = false;
    for (let index = start; index < source.length; index += 1) {
        const character = source[index];
        if (quoted) {
            if (escaped) escaped = false;
            else if (character === '\\') escaped = true;
            else if (character === '"') quoted = false;
            continue;
        }
        if (character === '"') quoted = true;
        else if (character === '{') depth += 1;
        else if (character === '}' && --depth === 0) return { start, end: index + 1, json: source.slice(start, index + 1) };
    }
    return null;
}

function coerceStatePatch(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const source = raw.patch && typeof raw.patch === 'object' ? raw.patch : raw;
    let operations = Array.isArray(source.ops) ? source.ops
        : Array.isArray(source.operations) ? source.operations
            : Array.isArray(source.updates) ? source.updates : null;
    if (operations) {
        operations = operations.map(operation => {
            if (Array.isArray(operation)) return operation;
            if (!operation || typeof operation !== 'object') return null;
            const verb = operation.op || operation.verb || operation.action;
            const path = operation.path || operation.field || operation.collection;
            if (!verb || !path) return null;
            const value = Object.hasOwn(operation, 'value') ? operation.value
                : Object.hasOwn(operation, 'data') ? operation.data : operation.item;
            return operation.meta === undefined ? [verb, path, value] : [verb, path, value, operation.meta];
        }).filter(Boolean);
    } else {
        operations = [];
        const delta = source.state && typeof source.state === 'object' ? source.state
            : source.changes && typeof source.changes === 'object' ? source.changes
                : source.delta && typeof source.delta === 'object' ? source.delta : source;
        const walk = (value, prefix = '', depth = 0) => {
            if (!value || typeof value !== 'object' || Array.isArray(value) || depth > 5) return;
            for (const [key, child] of Object.entries(value)) {
                if (['summary', 'version', 'format'].includes(key) && !prefix) continue;
                const path = prefix ? `${prefix}.${key}` : key;
                if (path === 'social.party' && child && typeof child === 'object' && !Array.isArray(child)) {
                    const { memberIds = [], members = [], ...profile } = child;
                    operations.push(['upsert', 'party', profile]);
                    [...(Array.isArray(memberIds) ? memberIds : []), ...(Array.isArray(members) ? members : [])]
                        .forEach(member => operations.push(['upsert', 'partyMembers', typeof member === 'object' ? member : { npcId: member }]));
                } else if (path === 'social.guilds' && Array.isArray(child)) {
                    child.forEach(guild => {
                        const { memberIds = [], members = [], ...profile } = guild || {};
                        operations.push(['upsert', 'guilds', profile]);
                        [...(Array.isArray(memberIds) ? memberIds : []), ...(Array.isArray(members) ? members : [])]
                            .forEach(member => operations.push(['upsert', 'guildMembers', {
                                ...(typeof member === 'object' ? member : { npcId: member }), guildId: profile.id, guildName: profile.name,
                            }]));
                    });
                } else if (SCALAR_PATCH_PATHS.has(path) && (child === null || typeof child !== 'object')) operations.push(['set', path, child]);
                else if (PATCH_COLLECTIONS.has(path) && Array.isArray(child)) child.forEach(item => operations.push(['upsert', path, item]));
                else walk(child, path, depth + 1);
            }
        };
        walk(delta);
    }
    if (!operations.length && !Array.isArray(source.ops) && !Array.isArray(source.operations) && !Array.isArray(source.updates)) return null;
    return {
        ops: operations.slice(0, 75),
        summary: text(source.summary || raw.summary, '', 300),
        journey: text(source.journey || source.journeyLog || raw.journey || raw.journeyLog, '', 500),
    };
}

function extractStatePatch(message) {
    const patches = [];
    let found = false;
    const accept = payload => {
        found = true;
        try {
            const parsed = coerceStatePatch(parseJson(payload));
            if (parsed) patches.push(parsed);
        } catch (error) {
            console.warn('[Tretaresia RPG] Ignored malformed inline state patch.', error);
        }
    };
    const strip = (source, pattern) => source.replace(pattern, (_match, payload) => {
        accept(payload);
        return '';
    });
    let visible = String(message || '');
    for (const pattern of [PATCH_COMMENT_PATTERN, PATCH_TAG_PATTERN, PATCH_BRACKET_PATTERN, PATCH_FENCE_PATTERN]) {
        pattern.lastIndex = 0;
        visible = strip(visible, pattern);
    }

    // Recover JSON from a marker whose closing comment/tag was truncated. The
    // balanced scanner removes the protocol even when the model omits its closer.
    const dangling = /(?:<!--\s*)?tretaresia[_ -]?patch\s*:|<tretaresia_patch>|\[\[?\s*tretaresia[_ -]?patch\s*\]?\]/ig;
    let match;
    while ((match = dangling.exec(visible))) {
        found = true;
        const range = balancedJsonRange(visible, match.index + match[0].length);
        if (!range) {
            visible = visible.slice(0, match.index).trimEnd();
            break;
        }
        accept(range.json);
        let end = range.end;
        const suffix = visible.slice(end).match(/^\s*(?:-->|<\/tretaresia_patch>|\[\[?\s*\/\s*tretaresia[_ -]?patch\s*\]?\]|\x60{3})/i);
        if (suffix) end += suffix[0].length;
        visible = `${visible.slice(0, match.index)}${visible.slice(end)}`;
        dangling.lastIndex = match.index;
    }
    const combined = patches.length ? {
        ops: patches.flatMap(patch => patch.ops).slice(0, 75),
        summary: patches.map(patch => text(patch.summary, '', 300)).filter(Boolean).join('; ').slice(0, 300),
        journey: [...patches].reverse().map(patch => text(patch.journey, '', 500)).find(Boolean) || '',
    } : null;
    return { visible: visible.trimEnd(), patch: combined, found };
}

function cleanInlinePatchSurfaces(message) {
    const sources = [{ get: () => message.mes, set: value => { message.mes = value; } }];
    if (Array.isArray(message.swipes) && Number.isInteger(message.swipe_id) && typeof message.swipes[message.swipe_id] === 'string') {
        sources.push({ get: () => message.swipes[message.swipe_id], set: value => { message.swipes[message.swipe_id] = value; } });
    }
    if (typeof message.extra?.display_text === 'string') {
        sources.push({ get: () => message.extra.display_text, set: value => { message.extra.display_text = value; } });
    }
    let patch = null;
    let found = false;
    let visible = String(message.mes || '');
    for (const source of sources) {
        const extracted = extractStatePatch(source.get());
        if (extracted.found) {
            found = true;
            source.set(extracted.visible);
            if (!patch && extracted.patch) patch = extracted.patch;
            if (source === sources[0]) visible = extracted.visible;
        }
    }
    return { visible, patch, found };
}

async function processAssistantPatch(messageId, generationType = '') {
    const settings = getSettings();
    if (['first_message', 'quiet', 'impersonate'].includes(generationType)) return;
    const context = SillyTavern.getContext();
    if (!hasUserReply(context) || !Number.isInteger(messageId)) return;
    await assistantRollbackQueue.catch(() => undefined);
    const message = context.chat[messageId];
    if (!message || message.is_user || message.is_system || typeof message.mes !== 'string') return;
    const incomingVariant = assistantVariantKey(message);
    if (processedAssistantMessages.get(message) === incomingVariant) return;
    if (!settings.autoTrack) {
        setSync('disabled', tr('Reply received'), tr('Tracking is off'));
        return;
    }
    setSync('working', tr('Checking reply'), settings.language === 'th' ? 'กำลังอ่านเฉพาะข้อมูลที่เปลี่ยนแปลงจากคำตอบนี้' : 'Reading this reply for confirmed state changes.');
    const extracted = cleanInlinePatchSurfaces(message);
    if (extracted.found) {
        message.mes = extracted.visible;
        if (Array.isArray(message.swipes) && Number.isInteger(message.swipe_id) && message.swipes[message.swipe_id] !== undefined) {
            message.swipes[message.swipe_id] = extracted.visible;
        }
    }
    const checkpoint = assistantCheckpoint(messageId, { create: true });
    const variantKey = assistantVariantKey(message);
    const recordedVariant = checkpoint?.variants?.[variantKey];
    if (checkpoint?.activeVariant === variantKey && recordedVariant?.state
        && recordedVariant.reconcileVersion === TURN_RECONCILE_VERSION) {
        processedAssistantMessages.set(message, variantKey);
        setSync('unchanged', tr('State updated'), settings.language === 'th' ? 'คำตอบเวอร์ชันนี้ถูกบันทึกแล้ว จึงไม่หักค่าซ้ำ' : 'This reply variant is already recorded; no values were applied twice.');
        return;
    }
    processedAssistantMessages.set(message, variantKey);
    try {
        const base = getState();
        let patched = base;
        let accepted = 0;
        let notifications = [];
        if (extracted.patch) {
            const result = applyStatePatch(base, extracted.patch);
            patched = result.next;
            accepted = result.accepted;
            notifications = result.notifications;
        }
        let userMessage = null;
        for (let index = messageId - 1; index >= 0; index -= 1) {
            if (context.chat[index]?.is_user && !context.chat[index]?.is_system) {
                userMessage = context.chat[index];
                break;
            }
        }
        const reconciled = reconcileCompletedTurn(base, patched, userMessage, message);
        const totalChanges = accepted + reconciled.changes;
        if (totalChanges) {
            await persistState(reconciled.next, accepted ? 'inline-patch+turn-reconcile' : 'turn-reconcile-fallback');
            if (checkpoint) {
                checkpoint.variants[variantKey] = {
                    state: clone(getState()), savedAt: new Date().toISOString(), reconcileVersion: TURN_RECONCILE_VERSION,
                };
                const variantKeys = Object.keys(checkpoint.variants);
                for (const stale of variantKeys.slice(0, Math.max(0, variantKeys.length - 6))) delete checkpoint.variants[stale];
                checkpoint.activeVariant = variantKey;
                checkpoint.applied = true;
                await SillyTavern.getContext().saveMetadata?.();
            }
            showEventNotifications(notifications);
            setSync('success', tr('State updated'), settings.language === 'th' ? `บันทึกการเปลี่ยนแปลง ${totalChanges} รายการแล้ว` : `${totalChanges} confirmed change${totalChanges === 1 ? '' : 's'} saved.`);
            console.info(`[Tretaresia RPG] Applied ${accepted} inline operation(s) plus ${reconciled.changes} deterministic reconciliation change(s).`);
        } else {
            if (checkpoint) {
                checkpoint.variants[variantKey] = {
                    state: clone(getState()), savedAt: new Date().toISOString(), reconcileVersion: TURN_RECONCILE_VERSION,
                };
                const variantKeys = Object.keys(checkpoint.variants);
                for (const stale of variantKeys.slice(0, Math.max(0, variantKeys.length - 6))) delete checkpoint.variants[stale];
                checkpoint.activeVariant = variantKey;
                checkpoint.applied = false;
                await SillyTavern.getContext().saveMetadata?.();
            }
            setSync('unchanged', tr('No state changes'), settings.language === 'th' ? 'ตรวจทั้ง Patch และระบบสำรองแล้ว ไม่มีเหตุการณ์ที่ยืนยันให้เปลี่ยนค่า' : 'Both the inline patch and deterministic fallback found no confirmed change.');
        }
    } catch (error) {
        console.error('[Tretaresia RPG] Inline state patch failed.', error);
        setSync('error', tr('Sync unavailable'));
    }
}

function latestAssistantMessageId() {
    const chat = SillyTavern.getContext().chat || [];
    for (let index = chat.length - 1; index >= 0; index -= 1) {
        const message = chat[index];
        if (message && !message.is_user && !message.is_system && typeof message.mes === 'string') return index;
    }
    return null;
}

function scheduleAssistantPatch(messageId, generationType = '', delay = 0) {
    const numericId = Number(messageId);
    const id = Number.isInteger(numericId) ? numericId : latestAssistantMessageId();
    if (!Number.isInteger(id)) return;
    const key = `${id}:${delay}`;
    clearTimeout(assistantPatchTimers.get(key));
    assistantPatchTimers.set(key, setTimeout(() => {
        assistantPatchTimers.delete(key);
        void processAssistantPatch(id, generationType);
    }, delay));
}

function analyzerPrompt(state, transcript) {
    return `Review only the latest completed Tretaresia role-play turn and return a small state patch.

CURRENT STATE:
${JSON.stringify(aiState(state, { privateTracker: true }))}

LATEST TURN:
${transcript}

${patchInstructions()}
Return ONLY the JSON object that would appear after "tretaresia_patch:". Do not include the HTML comment. If nothing changed, return {"ops":[],"summary":"No confirmed changes."}.`;
}

function queueAnalyze(options = {}) {
    if (options.manual && (manualSyncQueued || aiSyncInProgress)) {
        notify('info', getSettings().language === 'th' ? 'Manual Sync กำลังทำงานอยู่' : 'Manual Sync is already running.');
        return syncQueue;
    }
    if (options.manual) manualSyncQueued = true;
    syncQueue = syncQueue.catch(() => undefined).then(() => analyzeChat(options)).finally(() => {
        if (options.manual) manualSyncQueued = false;
    });
    return syncQueue;
}

async function analyzeChat({ manual = false } = {}) {
    if (!manual) return;
    const context = SillyTavern.getContext();
    if (!context.getCurrentChatId?.()) {
        notify('warning', 'Open a chat before synchronizing.');
        return;
    }
    if (!hasUserReply(context)) {
        notify('info', getSettings().language === 'th' ? 'ระบบจะเริ่มหลังจากผู้เล่นตอบ First Message' : 'Tracking starts after the user replies to the first message.');
        return;
    }
    const transcript = context.chat.filter(message => message?.mes && !message.is_system).slice(-2)
        .map(message => `${message.is_user ? 'User' : 'Character'}: ${message.mes}`).join('\n\n');
    if (!transcript) {
        notify('info', 'There are no role-play messages to analyze yet.');
        return;
    }

    aiSyncInProgress = true;
    setSync('working', tr('Reading latest turn'));
    try {
        const current = getState();
        recordExtensionRequest('manualSync', 'RPG Manual Sync');
        const response = await context.generateQuietPrompt({
            quietPrompt: analyzerPrompt(current, transcript),
            skipWIAN: true,
            responseLength: 900,
            removeReasoning: true,
        });
        const parsed = parseJson(response);
        const { next, accepted, summary, notifications } = applyStatePatch(current, parsed);
        if (accepted) {
            await persistState(next, 'manual-ai-patch');
            showEventNotifications(notifications);
        }
        setSync('success', tr('AI synchronized'), accepted
            ? (getSettings().language === 'th' ? `Manual Sync บันทึก ${accepted} รายการ` : `Manual Sync saved ${accepted} confirmed change${accepted === 1 ? '' : 's'}.`)
            : (getSettings().language === 'th' ? 'Manual Sync ตรวจแล้ว ไม่มีข้อมูลเปลี่ยนแปลง' : 'Manual Sync found no confirmed changes.'));
        notify('success', summary || 'No confirmed changes.');
        console.info(`[Tretaresia RPG] Manual sync applied ${accepted} operation(s).`);
    } catch (error) {
        console.error('[Tretaresia RPG] AI synchronization failed.', error);
        setSync('error', tr('Sync unavailable'));
        notify('error', `Could not synchronize: ${error.message}`);
    } finally {
        aiSyncInProgress = false;
    }
}

function setSync(mode, label, detail = '', options = {}) {
    clearTimeout(activityHideTimer);
    const show = options.show ?? !(mode === 'ready' && label === tr('Ready'));
    activityState = { mode, label, detail, visible: show };
    syncActivityIndicator();
    if (!show || mode === 'working') return;
    const duration = options.duration ?? (mode === 'error' ? 8000 : 4400);
    activityHideTimer = setTimeout(() => {
        activityState.visible = false;
        syncActivityIndicator();
    }, duration);
}

let introGateDone = false;

function buildIntroGate() {
    return '<div class="tretaresia-intro-gate" id="tretaresia-intro-gate">' +
        '<span class="tretaresia-intro-lattice"></span><div class="tretaresia-intro-sigil">' +
        '<span class="hex"></span><svg viewBox="0 0 206 232" aria-hidden="true"><polygon points="103,2 204,60 204,172 103,230 2,172 2,60"/></svg>' +
        '<span class="ring ring-a"></span><span class="ring ring-b"></span><span class="arc arc-a"></span><span class="arc arc-b"></span><span class="core"></span></div>' +
        '<strong>TRETARESIA</strong><small data-intro-sub>' + html(tr('Connecting to the active role-play...')) + '</small><span class="tretaresia-intro-rule"></span>' +
        '<div class="tretaresia-intro-load"><span data-intro-label>UNSEALING THE WORLD GATE</span><span class="bar"><i data-intro-bar></i></span><span class="pct" data-intro-pct>0%</span></div>' +
        '<button type="button" data-action="skip-intro">SKIP <i class="fa-solid fa-angles-right"></i></button></div>';
}

function runIntroGate(overlay) {
    const gate = overlay.querySelector('#tretaresia-intro-gate');
    if (!gate) return finishIntroGate();
    const bar = gate.querySelector('[data-intro-bar]');
    const pct = gate.querySelector('[data-intro-pct]');
    const label = gate.querySelector('[data-intro-label]');
    const stages = ['UNSEALING THE WORLD GATE', 'CALIBRATING AURA FIELD', 'READING THE WORLD LEDGER', 'LINK ESTABLISHED'];
    let progress = 0;
    clearInterval(introGateTimer);
    clearTimeout(introFinishTimer);
    introGateTimer = setInterval(() => {
        progress = Math.min(100, progress + Math.random() * 13 + 6);
        if (bar) bar.style.width = progress + '%';
        if (pct) pct.textContent = Math.floor(progress) + '%';
        if (label) label.textContent = stages[Math.min(stages.length - 1, Math.floor(progress / 26))];
        if (progress >= 100) {
            clearInterval(introGateTimer);
            introGateTimer = null;
            introFinishTimer = setTimeout(finishIntroGate, 300);
        }
    }, 110);
}

function finishIntroGate() {
    const overlay = document.getElementById('tretaresia-rpg-overlay');
    overlay?.classList.add('is-ready');
    if (introGateDone) return;
    introGateDone = true;
    clearInterval(introGateTimer);
    clearTimeout(introFinishTimer);
    introGateTimer = null;
    introFinishTimer = null;
    const gate = overlay?.querySelector('#tretaresia-intro-gate');
    if (!gate) return;
    gate.classList.add('is-gone');
    gate.addEventListener('transitionend', () => gate.remove(), { once: true });
    setTimeout(() => gate.remove(), 900);
}
function openInterface() {
    buildInterface();
    closeHostWandMenu();
    const overlay = document.getElementById('tretaresia-rpg-overlay');
    const panel = document.getElementById('tretaresia-rpg-panel');
    if (!overlay || !panel) return;
    clearTimeout(introTimer);
    previousFocusedElement = document.activeElement;
    overlay.classList.remove('is-closing');
    installAstraSurfaceCompatibility(overlay);
    overlay.classList.add('is-open', 'is-opening');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('tretaresia-rpg-open');
    try {
        renderAll();
        queueCharacterLifeCompatibilityRefresh({ save: true });
    } catch (error) {
        console.error('[Tretaresia RPG] Could not render the interface.', error);
        notify('error', 'Tretaresia RPG opened, but one of its modules could not render. Check the browser console.');
    }
    requestAnimationFrame(() => {
        panel.focus({ preventScroll: true });
        const active = overlay.querySelector('[data-panel].is-active');
        if (active?.dataset.panel) restorePanelScroll(active.dataset.panel, active);
    });
    if (introGateDone || matchMedia('(prefers-reduced-motion: reduce)').matches) finishIntroGate();
    else runIntroGate(overlay);
    introTimer = setTimeout(() => overlay.classList.remove('is-opening'), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 720);
}

function closeInterface() {
    const overlay = document.getElementById('tretaresia-rpg-overlay');
    if (!overlay?.classList.contains('is-open')) return;
    mapFullscreen = false;
    suspendMapRendering(true);
    document.body.classList.remove('tretaresia-map-fullscreen-open');
    clearTimeout(introTimer);
    clearInterval(introGateTimer);
    clearTimeout(introFinishTimer);
    introGateTimer = null;
    introFinishTimer = null;
    overlay.classList.add('is-closing');
    overlay.classList.remove('is-open', 'is-ready', 'is-opening');
    setControlCenterOpen(false);
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('tretaresia-rpg-open');
    introTimer = setTimeout(() => overlay.classList.remove('is-closing'), 460);
    if (previousFocusedElement instanceof HTMLElement) previousFocusedElement.focus({ preventScroll: true });
}

function syncLauncherVisibility() {
    const launcher = document.getElementById('tretaresia-rpg-wand-launcher');
    if (launcher) launcher.hidden = !getSettings().showWandLauncher;
}

function closeHostWandMenu() {
    requestAnimationFrame(() => {
        const menu = document.getElementById('extensionsMenu');
        if (!menu || !menu.getClientRects().length) return;
        const toggle = document.querySelector('#extensionsMenuButton, [data-drawer-id="extensionsMenu"], [aria-controls="extensionsMenu"]');
        if (toggle instanceof HTMLElement) toggle.click();
        else globalThis.jQuery?.(menu).stop(true, true).slideUp(0);
    });
}

function createWandLauncher() {
    const menu = document.getElementById('extensionsMenu');
    if (!menu) return false;

    let launcher = document.getElementById('tretaresia-rpg-wand-launcher');
    if (launcher && launcher.dataset.tretaresiaBound !== LAUNCHER_BIND_VERSION) {
        const replacement = launcher.cloneNode(true);
        launcher.replaceWith(replacement);
        launcher = replacement;
    }
    if (!launcher) {
        launcher = document.createElement('div');
        menu.appendChild(launcher);
    }

    launcher.id = 'tretaresia-rpg-wand-launcher';
    launcher.className = 'list-group-item flex-container flexGap5 interactable';
    launcher.tabIndex = 0;
    launcher.setAttribute('role', 'button');
    launcher.setAttribute('aria-label', 'Open Tretaresia RPG');
    launcher.title = 'Open Tretaresia RPG';
    launcher.innerHTML = '<i class="fa-solid fa-book-open"></i><span>Tretaresia RPG</span>';

    const activate = event => {
        if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openInterface();
        closeHostWandMenu();
    };
    launcher.onclick = activate;
    launcher.onkeydown = activate;
    launcher.dataset.tretaresiaBound = LAUNCHER_BIND_VERSION;
    if (!menu.contains(launcher)) menu.appendChild(launcher);
    syncLauncherVisibility();
    return true;
}
function observeWandMenu() {
    if (createWandLauncher() || menuObserver) return;
    menuObserver = new MutationObserver(() => {
        if (createWandLauncher()) {
            menuObserver.disconnect();
            menuObserver = null;
        }
    });
    menuObserver.observe(document.body, { childList: true, subtree: true });
}

function bindCheckbox(id, key, settings, callback) {
    const checkbox = document.getElementById(id);
    if (!(checkbox instanceof HTMLInputElement)) return;
    checkbox.checked = settings[key];
    checkbox.addEventListener('change', () => {
        settings[key] = checkbox.checked;
        SillyTavern.getContext().saveSettingsDebounced();
        callback?.();
    });
}

function bindSettingControl(id, key, settings, callback) {
    const control = document.getElementById(id);
    if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement)) return;
    control.value = String(settings[key]);
    const update = () => {
        settings[key] = ['range', 'number'].includes(control.type) ? Number(control.value) : control.value;
        SillyTavern.getContext().saveSettingsDebounced();
        callback?.();
    };
    control.addEventListener(control.type === 'range' || control.type === 'color' ? 'input' : 'change', update);
}

async function addSettingsDrawer() {
    if (document.getElementById('tretaresia-rpg-settings')) return;
    const context = SillyTavern.getContext();
    const container = document.getElementById('extensions_settings2');
    if (!container) throw new Error('Could not find the SillyTavern Extensions settings container.');
    container.insertAdjacentHTML('beforeend', await context.renderExtensionTemplateAsync(EXTENSION_FOLDER, 'settings'));
    const settings = getSettings();
    bindCheckbox('tretaresia-rpg-show-launcher', 'showWandLauncher', settings, syncLauncherVisibility);
    bindCheckbox('tretaresia-rpg-auto-track', 'autoTrack', settings, () => {
        updatePrompt();
        setSync(settings.autoTrack ? 'ready' : 'disabled', settings.autoTrack ? tr('Ready') : tr('Tracking is off'), '', { show: !settings.autoTrack });
    });
    bindCheckbox('tretaresia-rpg-inject-state', 'injectState', settings, updatePrompt);
    bindCheckbox('tretaresia-rpg-auto-continuity', 'autoContinuity', settings, () => {
        if (settings.autoContinuity) writeContinuitySnapshot(getState());
        else {
            const storageKey = continuityStorageKey();
            if (storageKey) localStorage.removeItem(storageKey);
        }
    });
    bindCheckbox('tretaresia-rpg-show-npc-map-markers', 'showNpcMapMarkers', settings, () => {
        renderMap(document.querySelector('[data-panel="map"]'), getState());
    });
    bindCheckbox('tretaresia-rpg-map-hd-mode', 'mapHdMode', settings, () => {
        if (!settings.mapHdMode) clearMapTileCache(key => key.includes('/3/'));
        renderMap(document.querySelector('[data-panel="map"]'), getState());
    });
    bindCheckbox('tretaresia-rpg-show-travel-tracker', 'showTravelTracker', settings, () => syncTravelTracker(getState()));
    bindCheckbox('tretaresia-rpg-event-notifications', 'eventNotifications', settings);
    bindCheckbox('tretaresia-rpg-notify-exp', 'notifyExperience', settings);
    bindCheckbox('tretaresia-rpg-notify-level', 'notifyLevel', settings);
    bindCheckbox('tretaresia-rpg-notify-learning', 'notifyLearning', settings);
    bindCheckbox('tretaresia-rpg-notify-combat', 'notifyCombat', settings);
    bindCheckbox('tretaresia-rpg-notify-kills', 'notifyKills', settings);
    bindCheckbox('tretaresia-rpg-notify-currency', 'notifyCurrency', settings);
    bindCheckbox('tretaresia-rpg-notify-quests', 'notifyQuests', settings);
    bindSettingControl('tretaresia-rpg-language', 'language', settings, rebuildInterface);
    bindSettingControl('tretaresia-rpg-interaction-mode', 'interactionMode', settings, updateActionModeHelp);
    bindSettingControl('tretaresia-rpg-activity-indicator', 'activityIndicator', settings, syncActivityIndicator);
    bindSettingControl('tretaresia-rpg-accent', 'accentColor', settings, applyAppearance);
    bindSettingControl('tretaresia-rpg-aura-color', 'auraColor', settings, scheduleAuraColorSetting);
    bindSettingControl('tretaresia-rpg-density', 'density', settings, applyAppearance);
    bindSettingControl('tretaresia-rpg-glass', 'glassOpacity', settings, applyAppearance);
    bindSettingControl('tretaresia-rpg-glow', 'glowStrength', settings, applyAppearance);
    bindSettingControl('tretaresia-rpg-notification-duration', 'notificationDuration', settings);
    document.getElementById('tretaresia-rpg-open-from-settings')?.addEventListener('click', openInterface);
    document.getElementById('tretaresia-rpg-sync-from-settings')?.addEventListener('click', () => queueAnalyze({ manual: true }));
    updateActionModeHelp();
    syncActivityIndicator();
    renderRequestUsage();
}

function bindChatEvents() {
    const { eventSource, eventTypes } = SillyTavern.getContext();
    eventSource.on(eventTypes.CHAT_CHANGED, async () => {
        processedAssistantMessages = new WeakMap();
        assistantRollbackQueue = Promise.resolve();
        cleanupAudio();
        invalidateCharacterLifeMapMarkers();
        clearMapPortraitCache();
        suspendMapRendering(true);
        clearNpcPortraitObjectUrls();
        closePortraitEditor();
        openedLetterId = null;
        selectedNpcId = null;
        mapAtlasSelection = '';
        mapSelectionId = null;
        mapDraftPoint = null;
        const restored = await restoreContinuityForCurrentChat();
        if (!restored) {
            updatePrompt();
            renderAll();
        }
        try { await catchUpPlayerIdentity(); }
        catch (error) { console.warn('[Tretaresia RPG] Could not import player registration.', error); }
        try { await catchUpTravelHistory(); }
        catch (error) { console.warn('[Tretaresia RPG] Could not catch up travel history.', error); }
        await refreshCharacterLifeCompatibility({ save: true });
        if (SillyTavern.getContext().getCurrentChatId?.() && !hasUserReply()) {
            setSync('ready', tr('Waiting for first reply'), getSettings().language === 'th' ? 'First Message จะยังไม่ถูกอ่านหรือบันทึก' : 'The First Message is not read or stored by the extension.');
        } else setSync('ready', tr('Ready'), '', { show: false });
    });
    if (eventTypes.PERSONA_CHANGED) eventSource.on(eventTypes.PERSONA_CHANGED, () => renderAll());
    if (eventTypes.MESSAGE_SENT) eventSource.on(eventTypes.MESSAGE_SENT, async messageId => {
        restoreComposerDraft();
        try { await processUserTravelIntent(messageId); }
        catch (error) { console.warn('[Tretaresia RPG] Could not apply user travel intent.', error); }
        updatePrompt();
        const settings = getSettings();
        if (settings.autoTrack) setSync('working', tr('Waiting for AI'), settings.language === 'th' ? 'จะตรวจและอัปเดตจากคำตอบหลักโดยไม่เรียก AI เพิ่ม' : 'The normal reply will be checked with no extra AI request.');
        else setSync('disabled', tr('Tracking is off'), settings.language === 'th' ? 'คำตอบนี้จะไม่อัปเดต Tretaresia RPG อัตโนมัติ' : 'This reply will not update Tretaresia RPG automatically.');
    });
    if (eventTypes.GENERATION_STARTED) eventSource.on(eventTypes.GENERATION_STARTED, generationType => {
        if (isReplacementGeneration(generationType)) {
            const context = SillyTavern.getContext();
            const ledger = turnHistory(context, false);
            const tail = context.chat?.[context.chat.length - 1];
            const latestEntry = [...(ledger?.entries || [])].reverse().find(entry => entry?.baseState);
            const messageId = tail?.is_user ? Number(latestEntry?.messageId) : latestAssistantMessageId();
            if (Number.isInteger(messageId) && assistantCheckpoint(messageId)) {
                void queueAssistantTurnReplacement(messageId, { reuseVariant: false, reason: 'regenerate' });
            }
        }
        if (!generationType || generationType === 'normal') updatePrompt();
    });
    if (eventTypes.GENERATION_AFTER_COMMANDS) eventSource.on(eventTypes.GENERATION_AFTER_COMMANDS, generationType => {
        if (!generationType || generationType === 'normal') updatePrompt();
    });
    eventSource.on(eventTypes.MESSAGE_RECEIVED, (messageId, generationType) => {
        assistantCheckpoint(Number(messageId), { create: true });
        pendingSave = pendingSave.catch(() => undefined).then(() => SillyTavern.getContext().saveMetadata());
        scheduleAssistantPatch(messageId, generationType, 0);
        scheduleAssistantPatch(messageId, generationType, 120);
    });
    if (eventTypes.MESSAGE_SWIPED) eventSource.on(eventTypes.MESSAGE_SWIPED, messageId => {
        void queueAssistantTurnReplacement(Number(messageId), { reuseVariant: true, reason: 'swipe' }).then(() => {
            scheduleAssistantPatch(messageId, 'swipe', 0);
            scheduleAssistantPatch(messageId, 'swipe', 140);
        });
    });
    if (eventTypes.MESSAGE_DELETED) eventSource.on(eventTypes.MESSAGE_DELETED, messageId => {
        const context = SillyTavern.getContext();
        const history = turnHistory(context, false);
        const numericId = Number(messageId);
        const tail = context.chat?.[context.chat.length - 1];
        if (!tail?.is_user) return;
        const removed = [...(history?.entries || [])].filter(entry => entry?.baseState
            && (!Number.isInteger(numericId) || Number(entry.messageId) >= numericId)).reverse();
        for (const entry of removed) {
            void queueAssistantTurnReplacement(entry.messageId, { reuseVariant: false, reason: 'delete-or-group-regenerate' });
        }
    });
    if (eventTypes.CHARACTER_MESSAGE_RENDERED) eventSource.on(eventTypes.CHARACTER_MESSAGE_RENDERED, messageId => {
        scheduleAssistantPatch(messageId, '', 0);
        scheduleAssistantPatch(messageId, '', 180);
    });
    if (eventTypes.GENERATION_ENDED) eventSource.on(eventTypes.GENERATION_ENDED, () => {
        const messageId = latestAssistantMessageId();
        scheduleAssistantPatch(messageId, '', 0);
        scheduleAssistantPatch(messageId, '', 240);
    });
    globalThis.addEventListener('character-life:rpg-bridge-ready', () => {
        invalidateCharacterLifeMapMarkers();
        clearMapPortraitCache();
        queueCharacterLifeCompatibilityRefresh({ save: true });
    });
    globalThis.addEventListener('character-life:skills-ready', () => queueCharacterLifeCompatibilityRefresh({ save: false }));
    globalThis.addEventListener('character-life:skill-updated', () => queueCharacterLifeCompatibilityRefresh({ save: false }));
    globalThis.addEventListener('character-life:portrait-replaced', () => {
        clearMapPortraitCache();
        queueCharacterLifeCompatibilityRefresh({ save: false });
    });
    globalThis.addEventListener('character-life:rpg-compatibility-updated', () => {
        invalidateCharacterLifeMapMarkers();
        queueCharacterLifeCompatibilityRefresh({ save: false });
    });
    globalThis.addEventListener('character-life:map-markers-updated', () => {
        invalidateCharacterLifeMapMarkers();
        const panel = document.querySelector('[data-panel="map"].is-active');
        if (panel) scheduleMapDraw(panel, getState());
    });
}

async function initialize() {
    if (initialized) return;
    initialized = true;
    try {
        getSettings();
        applyAppearance();
        buildActivityIndicator();
        buildTravelTracker();
        observeWandMenu();
        buildInterface();
        await addSettingsDrawer();
        bindChatEvents();
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) suspendMapRendering(true);
            else {
                const panel = document.querySelector('[data-panel="map"].is-active');
                if (panel && document.getElementById('tretaresia-rpg-overlay')?.classList.contains('is-open')) {
                    setupMapInteractions(panel);
                    scheduleMapDraw(panel, getState());
                }
            }
        });
        bindNewChatSummaryCompatibility();
        if (SillyTavern.getContext().chatMetadata?.[METADATA_KEY]) writeContinuitySnapshot(getState());
        else await restoreContinuityForCurrentChat();
        try { await catchUpPlayerIdentity(); }
        catch (error) { console.warn('[Tretaresia RPG] Could not import player registration.', error); }
        try { await catchUpTravelHistory(); }
        catch (error) { console.warn('[Tretaresia RPG] Could not catch up travel history.', error); }
        updatePrompt();
        syncTravelTracker(getState());
        document.addEventListener('keydown', event => {
            if (event.key !== 'Escape') return;
            if (mapFullscreen) {
                setMapFullscreen(false);
                return;
            }
            if (controlCenterOpen()) return;
            closeInterface();
        });
        console.info('[Tretaresia RPG] Role-play interface v0.29.2 loaded.');
    } catch (error) {
        initialized = false;
        console.error('[Tretaresia RPG] Failed to initialize.', error);
        notify('error', 'Tretaresia RPG could not load. Check the browser console.');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
    void initialize();
}
