/* global SillyTavern, toastr */

const EXTENSION_FOLDER = 'third-party/rpg-systems';
const SETTINGS_KEY = 'tretaresia_rpg';
const METADATA_KEY = 'tretaresia_rpg_state';
const PROMPT_KEY = 'tretaresia_rpg_roleplay_state';
const ACTION_PROMPT_KEY = 'tretaresia_rpg_hidden_action';
const STATE_PACKAGE_FORMAT = 'tretaresia-rpg-state';
const CONTINUITY_STORAGE_PREFIX = 'tretaresia-rpg:continuity:';
const SUMMARY_NEW_CHAT_MENU_ID = 'st_new_chat_with_summary_wand_button';
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
    autoContinuity: true,
    showNpcMapMarkers: true,
    mapHdMode: false,
    visualVersion: 6,
});

const LAUNCHER_BIND_VERSION = '0.20.0';
const TAB_ORDER = ['status', 'scene', 'inventory', 'skills', 'techniques', 'quests', 'rank', 'groups', 'household', 'map', 'npcs', 'mail', 'music'];
const TAB_META = {
    status: ['fa-solid fa-user', 'Status'], scene: ['fa-solid fa-cloud-sun', 'Scene'],
    inventory: ['fa-solid fa-box-open', 'Inventory'], skills: ['fa-solid fa-layer-group', 'Skills'],
    techniques: ['fa-solid fa-fire-flame-curved', 'Powers'], quests: ['fa-solid fa-scroll', 'Quests'],
    rank: ['fa-solid fa-medal', 'Rank'], map: ['fa-solid fa-map', 'World Map'],
    groups: ['fa-solid fa-people-group', 'Party & Guild'], household: ['fa-solid fa-house-chimney-user', 'Household'],
    npcs: ['fa-solid fa-users', 'NPCs'], mail: ['fa-solid fa-envelope', 'Mailbox'], music: ['fa-solid fa-music', 'Music'],
};
let activeTabIndex = 0;
let activeQuestSection = 'active';
let characterLifeSkillSyncTimer = null;

const TRANSLATIONS = {
    th: {
        'Tretaresia Role-play': 'ระบบโรลเพลย์ Tretaresia', 'World ledger': 'บันทึกโลก', Powers: 'พลัง',
        'Magic interface': 'อินเทอร์เฟซเวทมนตร์',
        'Synchronizing world state': 'กำลังเชื่อมข้อมูลโลก',
        'Connecting to the active role-play...': 'กำลังเชื่อมต่อกับโรลเพลย์ปัจจุบัน...',
        Ready: 'พร้อม', Status: 'สถานะ', Scene: 'ฉาก', Inventory: 'คลังสิ่งของ', Skills: 'ทักษะ', Quests: 'ภารกิจ', Rank: 'อันดับ', 'World Map': 'แผนที่โลก',
        Music: 'เพลง', Mailbox: 'กล่องจดหมาย', Contacts: 'รายชื่อ', Letters: 'จดหมาย', NPCs: 'ตัวละคร NPC', 'NPC Codex': 'สารบบ NPC', Techniques: 'วิชา',
        'Party & Guild': 'ปาร์ตี้และกิลด์', Household: 'ครอบครัว', 'Friendly NPCs': 'NPC ฝ่ายมิตร', 'Choose a friendly NPC': 'เลือก NPC ฝ่ายมิตร', Member: 'สมาชิก', party: 'ปาร์ตี้', guilds: 'กิลด์',
        'Waiting for chat': 'กำลังรอแชต', 'Sync latest turn': 'ซิงก์เหตุการณ์ล่าสุด', 'System interface': 'ข้อมูลระบบ',
        'Current persona': 'ตัวตนปัจจุบัน', 'Guild rank': 'อันดับกิลด์', 'Vital status': 'สถานะพลังชีวิต', Identity: 'ข้อมูลส่วนตัว',
        Health: 'พลังชีวิต', Mana: 'มานา', 'Aura / Mana': 'ออร่า / มานา', Stamina: 'พละกำลัง', Race: 'เผ่าพันธุ์', Age: 'อายุ', Guild: 'กิลด์', Party: 'ปาร์ตี้',
        Profession: 'อาชีพ', 'Power type': 'ประเภทพลัง', 'Origin skill': 'สกิลกำเนิด',
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
        'Journey Logs': 'บันทึกการเดินทาง', 'Story milestones': 'หมุดหมายเรื่องราว', 'No journey logs yet.': 'ยังไม่มีบันทึกการเดินทาง',
        'Add journey log': 'เพิ่มบันทึก', 'Edit log': 'แก้ไขบันทึก', 'Delete log': 'ลบบันทึก', 'Save log': 'บันทึก', 'What happened': 'เกิดอะไรขึ้น', 'Journey log saved.': 'บันทึกการเดินทางแล้ว',
        'Edit progression': 'แก้ไขความก้าวหน้า', 'Adventurer rank': 'อันดับนักผจญภัย',
        'Magic rank': 'ระดับเวทมนตร์', 'Sword rank': 'ระดับดาบ', 'EXP to next level': 'EXP สำหรับเลเวลถัดไป', 'Save progression': 'บันทึกความก้าวหน้า',
        'Tretaresia World Atlas': 'แผนที่โลก Tretaresia', 'Present World': 'โลกปัจจุบัน', 'Present Era': 'ยุคปัจจุบัน', 'Alternate Present World TRETARESIA': 'โลกปัจจุบันคู่ขนาน TRETARESIA', 'Alternate Present Era': 'ยุคปัจจุบันคู่ขนาน', 'World map': 'แผนที่โลก', 'Atlas browsing mode': 'โหมดดูแผนที่', 'Travel becomes available when the story enters this world.': 'จะเดินทางในแผนที่นี้ได้เมื่อเนื้อเรื่องเข้าสู่โลกนี้', World: 'โลก', Era: 'ยุค',
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
let activityHideTimer = null;
let activityState = { mode: 'ready', label: 'Ready', detail: '', visible: false };
let pendingComposerDraft = null;
let audioPlayer = null;
let audioObjectUrl = '';
const mapView = { scale: 1, x: 0, y: 0 };
let continuityRestoreInProgress = false;

const uid = () => globalThis.crypto?.randomUUID?.() || `tretaresia-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const clone = value => globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
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
            condition: 'Stable', level: 1, powerType: 'Aura', originSkill: 'Unknown / Undiscovered',
            portraitView: { desktop: { x: 50, y: 50, zoom: 1 }, mobile: { x: 50, y: 50, zoom: 1 } },
            hp: { current: 100, max: 100 }, mp: { current: 100, max: 100 }, stamina: { current: 100, max: 100 },
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
            trackedUserTurns: 0, lastUserProgressMessage: '',
        },
        scene: { position: 'Unknown', weather: 'Unknown', temperature: null },
        sceneMap: { activeMapId: '', activeFloorId: '', playerRoomId: '', maps: [] },
        inventory: [{ id: uid(), name: "Traveler's Clothes", quantity: 1, category: 'Equipment', description: '' }],
        skills: [],
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
    for (const key of ['accentColor', 'accentAltColor', 'inkColor', 'surfaceColor']) {
        if (!/^#[0-9a-f]{6}$/i.test(settings[key])) settings[key] = DEFAULT_SETTINGS[key];
    }
    if (settings.themePreset !== 'custom' && !Object.hasOwn(COLOR_PRESETS, settings.themePreset)) settings.themePreset = DEFAULT_SETTINGS.themePreset;
    settings.glassOpacity = number(settings.glassOpacity, DEFAULT_SETTINGS.glassOpacity, 55, 98);
    settings.glowStrength = number(settings.glowStrength, DEFAULT_SETTINGS.glowStrength, 0, 100);
    settings.notificationDuration = number(settings.notificationDuration, DEFAULT_SETTINGS.notificationDuration, 1500, 30000);
    for (const key of ['eventNotifications', 'notifyExperience', 'notifyLevel', 'notifyLearning', 'notifyCombat', 'notifyKills', 'notifyCurrency', 'notifyQuests', 'autoContinuity', 'showNpcMapMarkers', 'mapHdMode']) settings[key] = Boolean(settings[key]);
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
        diary: sourceDiary.map(npcDiaryEntry).filter(Boolean).slice(-40), hasPortrait: Boolean(value.hasPortrait ?? fallback.hasPortrait),
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
        profession: text(player.profession, result.player.profession, 100),
        guild: text(player.guild, result.player.guild, 100), party: text(player.party, result.player.party, 100),
        condition: text(player.condition, result.player.condition, 120),
        powerType: text(player.powerType, result.player.powerType, 100), originSkill: text(player.originSkill, result.player.originSkill, 200),
        level: number(player.level, result.player.level, 1, 9999),
        hp: meter(player.hp, result.player.hp), mp: meter(player.mp, result.player.mp),
        stamina: meter(player.stamina, result.player.stamina),
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
    };
    const scene = source.scene && typeof source.scene === 'object' ? source.scene : {};
    result.scene = {
        position: text(scene.position, result.scene.position, 200),
        weather: text(scene.weather, result.scene.weather, 120),
        temperature: optionalNumber(scene.temperature, result.scene.temperature, -1000, 1000),
    };
    result.sceneMap = normalizeSceneMap(source.sceneMap, result.sceneMap);
    if (Array.isArray(source.inventory)) result.inventory = source.inventory.map(item).filter(Boolean).slice(0, 200);
    if (Array.isArray(source.transactions)) result.transactions = source.transactions.map(currencyTransaction).filter(Boolean).slice(-250);
    if (Array.isArray(source.journeyLogs)) result.journeyLogs = source.journeyLogs.map(journeyLogEntry).filter(Boolean).slice(-100);
    if (Array.isArray(source.skills)) result.skills = source.skills.map(skill).filter(Boolean).slice(0, 100);
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

async function persistState(candidate, source = 'manual') {
    const context = SillyTavern.getContext();
    if (!context.getCurrentChatId?.()) {
        notify('warning', 'Open a character or group chat before changing the role-play state.');
        return false;
    }
    const previous = getState();
    let state = normalize(candidate, previous);
    synchronizeWorldState(state, previous);
    state = normalize(state, previous);
    syncCharacterLifeLinks(state);
    resolveLevelProgression(state);
    if (state.quests.some(entry => entry.status === 'Completed'
        && previous.quests.find(candidate => candidate.id === entry.id)?.status !== 'Completed')) activeQuestSection = 'completed';
    else if (state.quests.some(entry => entry.status === 'Failed'
        && previous.quests.find(candidate => candidate.id === entry.id)?.status !== 'Failed')) activeQuestSection = 'failed';
    state.updatedAt = new Date().toISOString();
    state.updateSource = source;
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

function aiState(state) {
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
    return {
        player: safePlayer,
        world: state.world,
        progression: state.progression,
        worldClock: state.worldClock,
        location: { ...state.location, discovered: discoveredLocationsFor(state), discoveredByWorld: undefined, pins: undefined },
        travel: state.travel,
        scene: state.scene,
        sceneMap: aiSceneMap(state),
        inventory: relevantEntries(state.inventory, 20).map(({ id, name, quantity, category }) => [id, name, quantity, category]),
        transactions: state.transactions.slice(-30).map(({ at, currencyName, amounts, balance, reason, source }) => ({ at, currencyName, amounts, balance, reason, source })),
        journeyLogs: state.journeyLogs.slice(-20).map(({ at, place, day, kind, text: entryText }) => ({ at, place, day, kind, text: entryText })),
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
            party: state.social.party ? { id: state.social.party.id, name: state.social.party.name, leaderId: state.social.party.leaderId, memberIds: state.social.party.memberIds } : null,
            guilds: state.social.guilds.map(({ id, name, description, rank, leaderId, memberIds, treasury }) => ({ id, name, description, rank, leaderId, memberIds, treasury })),
            household: { id: state.social.household.id, name: state.social.household.name, members: state.social.household.members },
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
            diaryLatest: entry.diary.at(-1) ? { mood: entry.diary.at(-1).mood, text: entry.diary.at(-1).text.slice(0, 240) } : undefined,
        })),
        contacts: relevantEntries(state.contacts, 12).map(({ id, name, title, affiliation, relationship }) => [id, name, title, affiliation, relationship]),
        letters: state.letters.slice(-5).map(({ id, contactId, fromName, toName, subject, direction, status, createdAt }) => (
            [id, contactId, fromName, toName, subject, direction, status, createdAt]
        )),
    };
}

function hasUserReply(context = SillyTavern.getContext()) {
    return context.chat.some(message => message?.is_user && !message.is_system && text(message.mes));
}

function legacyPatchInstructions() {
    const iconKeys = PROFICIENCY_ICON_PRESETS.map(entry => entry.key).join(', ');
    return [
        'After the role-play reply, append one invisible HTML comment only when confirmed state changed:',
        '<!--tretaresia_patch:{"ops":[["upsert","quests",{"id":"academy-escort","name":"Escort the Academy Caravan","type":"Mission","status":"Active","objective":"Protect the caravan until it reaches Eastwatch","reward":"12 silver","giver":"Quartermaster Lysa","source":"Great Academy mission board","progress":0}],["inc","progression.experience",5,{"reason":"Completed aura control training","category":"training"}],["inc","progression.currency.silver",-3,{"reason":"Paid for an academy meal","category":"currency"}],["inc","progression.kills",1,{"reason":"Defeated the ash troll","category":"kill"}]],"summary":"Mission, training, payment, and combat progress recorded."}-->',
        'Allowed verbs: set or inc for scalar paths; inc, upsert, or delete for inventory; upsert or delete for skills, proficiencies.customMagic, proficiencies.customSword, proficiencies.techniques, quests, npcs, contacts, letters, party, guilds, household; upsert or delete partyMembers, guildMembers, and householdMembers; set or inc npcValues; upsert or delete npcAbilities and npcMeters; append npcDiary; add location.discovered. Local maps additionally allow upsert or delete on sceneMaps, sceneFloors, sceneRooms, and sceneConnections.',
        'Party, Guild, and Household rules: The player is always the leader of a party or guild created from the UI unless the story explicitly confirms a leadership change. Party membership is free. The UI already deducts the Guild fee; a newly confirmed story-created Guild is accepted only when the player can afford it and the patch parser deducts the configured fee automatically. Role-play changes are automatic: whenever a completed reply confirms joining, accepting an invitation, leaving, expulsion, creation, dissolution, marriage, partnership, a child, parent, guardian, or another family role, update social state in this same patch even when no UI button was used. For a friendly person absent from npcIndex, first upsert npcs with a stable id/name, then use that id in partyMembers, guildMembers, or householdMembers. A Household is the player\'s family roster, not a generic faction.',
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
        'Allowed ops: set/inc scalar paths; inc/upsert/delete inventory; upsert/delete skills, proficiencies.customMagic, proficiencies.customSword, proficiencies.techniques, quests, npcs, contacts, letters, party, guilds, household, partyMembers, guildMembers, householdMembers, npcAbilities, npcMeters, sceneMaps, sceneFloors, sceneRooms, sceneConnections; set/inc npcValues; append npcDiary; add location.discovered. Use canonical paths/ids and partial objects. Maximum 75 ops.',
        'Compact state arrays: inventory=[id,name,quantity,category], skills=[id,name,rank,type], quests=[id,name,type,status,objective,reward,giver,progress], npcIndex=[id,name,relationship,location,faction], npcWorld=[id,name,location,mapX,mapY,mapVisible,lifeMode,activity,activityUpdatedDay], abilities=[id,name,category,level,proficiency], contacts=[id,name,title,affiliation,relationship], letters=[id,contactId,from,to,subject,direction,status,createdAt].',
        'Update only facts confirmed by the completed reply—not plans, attempts, questions, hypotheticals, rejected actions, OOC text, or unsupported guesses. A direct user role-play action to depart for a named destination is evidence that a journey has begun; record its route and endpoints, then let later replies advance time and confirm arrival. Omit the comment if nothing changed. Never expose the patch, full state, Markdown, or explanation.',
        'Check affected systems: player condition/resources/identity; EXP/rank/reputation/kills/currency; inventory/skills/proficiencies; quests/dungeons; clock/location/travel/weather/map; participating friendly NPC dossiers/relationships/abilities/diary/stats; contacts/physical letters; Party/Guild/Household. Emit only affected values.',
        'World identity: world.id is "present-world" normally and "alternate-present-world" only after the story explicitly crosses into Alternate Present World TRETARESIA. An actual crossing can be confirmed when the user or completed reply enters a portal, dimensional gate, rift, teleportation passage, or other established world boundary. Never switch from speculation, dreams, atlas browsing, casual mentions, or plans that have not happened. On confirmed entry set world.id together with the destination location fields; on a confirmed return set world.id back to "present-world" with the returned location fields.',
        'NPC atlas isolation: use only the injected NPC Atlas Knowledge catalog for the active world. Never let an ordinary Present World character know Alternate-exclusive places, or an Alternate World character know Present-only geography, unless confirmed inter-world experience or reliable information explicitly grants that knowledge.',
        'Journey Logs: when a major story event meaningfully changes the player journey, add top-level "journey":"a concise milestone of at most 500 characters". Use it for arrivals/departures, quest acceptance/completion/failure, decisive battles, important discoveries, major bonds, faction/party/guild/household changes, identity or power breakthroughs. Do not add one for routine dialogue or bookkeeping.',
        'EXP: inc progression.experience for confirmed study, learning, training, crafting practice, combat, kill, discovery, or quest progress. Require {"reason":"specific cause","category":"study|learning|training|combat|kill|discovery|quest"}. Typical 1-3 routine, 4-8 meaningful, 9-20 major, 21-40 exceptional. A personal confirmed kill also inc progression.kills with kill metadata; exclude knockouts, uncertain deaths, and assists.',
        'Money: record every confirmed gain or expense immediately on progression.currency.gold/silver/copper with {"reason":"what the money came from or was spent on","category":"currency"}. Every currency op needs a specific reason so Transaction History can explain it. Never invent exchange rates or silently convert regional currency; set progression.currency.name when the active currency changes.',
        'Inventory lifecycle: pick up, receive, buy, craft, or loot an item with ["inc","inventory",{"id":"stable-id","name":"Item","quantity":positive,"category":"...","description":"..."}]. Drink, eat, consume, use up, drop, give away, or sell it with the same operation and a negative quantity. If acquired and consumed in the same turn, emit the positive op followed by the negative op so the final count is correct. Do not decrement reusable tools, weapons, armor, keys, or equipment merely because they were used. Use upsert only to correct item metadata or set an exact known quantity; delete only when explicitly removed wholesale.',
        'Quests: type is Story, Side-Story, Mission, Quest, Dungeon, Contract, or Personal. Upsert when formally offered/assigned/received; Offered=optional unaccepted, Active=accepted/assigned. Update progress only from confirmed objective progress; Completed always becomes 100 and Failed is archived. On the FIRST transition to Completed, grant its established reward once in the SAME patch; every reward op must carry {"category":"quest-reward","questId":"canonical id","reason":"specific reward"}. questArchive entries with rewardClaimed=true are history: never pay their currency/EXP/items/rank/loot again, never reset progress, and do not reactivate without an explicit story event. Rumors and casual advice are not quests.',
        'Proficiency: inc only a discipline genuinely used/trained (1-3; 4-8 breakthrough). New powers/styles use customMagic/customSword {id,name,proficiency,description,iconKey}. iconKey values: ' + iconKeys + '. Formless Aura is undetectable; Divine Mana only by Divine Mana; other powers normally require the same kind to sense. False Magic uses a medium; True Magic does not; Aura commonly has one Origin; Constructs grant forged abilities.',
        'NPCs: upsert only relevant named friendly NPCs or confirmed changes; preserve npcIndex id. Hostile/enemy/foe/antagonist/villain/threat NPCs stay out of Codex and social rosters. For participating friends consider relationship/location/lastSeen/abilities/meters/diary/revealed stats. Relationship deltas are usually 1-3. npcValues fields: affection,trust,loyalty,fear,corruption,lust or stats.level/rank/hp/mp/stamina/strength/agility/intelligence/endurance. Zero stats mean unknown. Never raise combat stats from conversation alone. Diary only for meaningful private thoughts/turning points. Portrait data is forbidden.',
        'Living NPC world: when the world clock meaningfully advances, update 1-3 plausible off-screen Active NPC lives with a partial npcs upsert using id plus location,mapX,mapY,activity,activityUpdatedDay. Prioritize mapVisible, Party/Household/Guild, recently mentioned NPCs; Story only changes only when involved, Paused never changes automatically. Respect occupation, home, duties, relationships, distance, travel time, danger, and established events. Do not teleport or manufacture dramatic events. Party members normally follow the player unless separation is established. A new location needs atlas-consistent coordinates; if only activity changes, preserve coordinates.',
        'Social auto-sync: player leads UI-created Party/Guild unless story changes it. UI actions are not required: every confirmed join/accepted invite/leave/expulsion/create/dissolve/rank/marriage/partner/child/parent/guardian/family-role change must update this same patch. Existing NPC example: ["upsert","partyMembers",{"npcId":"lysa"}]. New friendly NPC: first ["upsert","npcs",{"id":"lysa","name":"Lysa","relationship":"Ally"}], then the membership op. Guild member includes guildId or exact guildName. Household member includes npcId plus role; delete the same collection when a member leaves. Party is free. UI Guild creation already charges locally; a story-created Guild op charges the fee automatically and fails when unaffordable. Household is family, not a faction.',
        'Travel/scene: journeys take days/months/years. When a journey begins through chat, set travel status/origin/destination/route/totalDays/remainingDays and destinationX/destinationY/destinationContinent/destinationRegion/destinationPlace; known atlas names must use their exact coordinates, new places use a consistent plausible point. Read both the latest user role-play action and your completed reply for movement, elapsed hours/days, stated percentages, delays, resumptions, reroutes, and arrival. Every reply that narratively advances an active journey must update worldClock day/time and remainingDays; never repeat stale travel values merely because no map UI button was pressed. The extension also applies a deterministic turn fallback and interpolates the player marker from stored endpoints, so preserve any newer/lower remainingDays already present, never move progress backwards, and never teleport to the destination early. On confirmed arrival set Arrived/0; the extension snaps location/Scene to destination and adds discovered. Track confirmed phase/place/detail/heading/position/weather/temperature; never invent weather. Keep local maps sparse and gradual; preserve locked maps. Rooms use x 0-100,y 0-70,width 8-70,height 7-50.',
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
    lines.push('NPC Atlas Knowledge is strictly scoped to the active world below. A destination absent from this catalog is not established in the current timeline. Never leak or infer another timeline\'s geography through ordinary NPC knowledge.');
    lines.push(JSON.stringify(npcAtlasKnowledge(state)));
    if (includeState) {
        lines.push('Canonical role-play state. Preserve it unless the story confirms a change.');
        lines.push('Current scene, location, inventory, ranks, conditions, skills, quests, NPC dossiers, contacts, physical letters, party, guilds, currency, and Household members are established facts. The NPC Codex and social invitations contain friendly NPCs only; hostile NPCs are excluded from those lists.');
        lines.push(JSON.stringify(aiState(state)));
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
    else {
        updatePrompt(state);
        renderAll(state);
        queueCharacterLifeSkillSync(state);
    }
}

function queueCharacterLifeCompatibilityRefresh(options) {
    void refreshCharacterLifeCompatibility(options).catch(error =>
        console.warn('[Tretaresia RPG] Character Life refresh failed safely.', error));
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
    return {
        ...known,
        name: state.location.place || known.name,
        continent: state.location.continent || known.continent,
        region: state.location.region || known.region,
        zone: state.location.zoneType || known.zone,
        x: number(state.location.mapX, known.x, 0, WORLD_MAP_WIDTH),
        y: number(state.location.mapY, known.y, 0, WORLD_MAP_HEIGHT),
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

function travelProgress(state) {
    const total = number(state?.travel?.totalDays, 0, 0, 999999);
    if (!total) return state?.travel?.status === 'Arrived' ? 1 : 0;
    return Math.min(1, Math.max(0, (total - number(state.travel.remainingDays, total, 0, total)) / total));
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
    const x = optionalNumber(entry?.mapX, player?.x ?? site?.x ?? null, 0, WORLD_MAP_WIDTH);
    const y = optionalNumber(entry?.mapY, player?.y ?? site?.y ?? null, 0, WORLD_MAP_HEIGHT);
    return x === null || y === null ? null : { x, y, site, partyMember };
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
        if (travel.originX !== null && travel.originY !== null && travel.destinationX !== null && travel.destinationY !== null) {
            state.location.mapX = travel.originX + (travel.destinationX - travel.originX) * progress;
            state.location.mapY = travel.originY + (travel.destinationY - travel.originY) * progress;
            const dx = travel.destinationX - travel.originX;
            const dy = travel.destinationY - travel.originY;
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
        if (directSite && placeChanged && coordinatesUnchanged) {
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
        const lifeChanged = prior && (entry.location !== prior.location || entry.activity !== prior.activity || entry.mapX !== prior.mapX || entry.mapY !== prior.mapY);
        if (lifeChanged && entry.lifeMode !== 'Paused') entry.activityUpdatedDay = state.worldClock.day;
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
    const speed = { Road: 70, Caravan: 58, Sea: 95, 'Off-road': 38 }[route] || 55;
    return Math.max(1, Math.ceil(distance / speed));
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
    const current = getState();
    const intent = inferUserTravelIntent(message.mes, current);
    if (!intent) {
        const caughtUp = catchUpActiveTravelFromChat(current, context, messageId);
        if (caughtUp) return persistState(caughtUp, 'user-travel-history-catchup');
        const advanced = advanceActiveTravelFromUserMessage(messageId, message, current);
        return advanced ? persistState(advanced, 'user-travel-progress') : false;
    }
    const alreadyHeadingThere = ['Preparing', 'Traveling', 'Delayed'].includes(current.travel.status)
        && mapLocationByName(current.travel.destinationPlace || current.travel.destination, current)?.id === intent.destination.id;
    const alreadyThere = current.location.place === intent.destination.name && !alreadyHeadingThere;
    if (alreadyHeadingThere) {
        const advanced = advanceActiveTravelFromUserMessage(messageId, message, current);
        return advanced ? persistState(advanced, 'user-travel-progress') : false;
    }
    if (alreadyThere) return false;
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
    };
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
        colorField('Text', 'inkColor') + colorField('Surface', 'surfaceColor') + '</div>' +
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
}


function activateTab(id) {
    const overlay = document.getElementById('tretaresia-rpg-overlay');
    if (!overlay) return;
    const index = TAB_ORDER.indexOf(id);
    const next = overlay.querySelector('[data-panel="' + id + '"]');
    if (index < 0 || !next) return;
    const current = overlay.querySelector('[data-panel].is-active');
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
        overlay.querySelector('.tretaresia-rpg-panel-body')?.scrollTo({ top: 0, behavior: 'smooth' });
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

function meterView(label, value, icon, tone) {
    const percent = Math.round(value.current / Math.max(1, value.max) * 100);
    const cappedPercent = Math.min(100, Math.max(0, percent));
    return `<article class="tretaresia-vital tretaresia-vital-${tone}">
        <div class="tretaresia-vital-line"><span><i class="${icon}"></i>${html(tr(label))}</span><strong>${value.current} <em>/ ${value.max}</em></strong></div>
        <div class="tretaresia-vital-track" role="meter" aria-valuenow="${value.current}" aria-valuemax="${value.max}" aria-label="${html(tr(label))}">
            <span style="width:${cappedPercent}%"></span><i style="left:${cappedPercent}%"></i>
        </div><small>${percent}%</small></article>`;
}

function renderAll(state = getState()) {
    const overlay = document.getElementById('tretaresia-rpg-overlay');
    if (!overlay) return;
    renderStatus(overlay.querySelector('[data-panel="status"]'), state);
    renderScene(overlay.querySelector('[data-panel="scene"]'), state);
    renderInventory(overlay.querySelector('[data-panel="inventory"]'), state);
    renderSkillStorage(overlay.querySelector('[data-panel="skills"]'), state);
    renderTechniques(overlay.querySelector('[data-panel="techniques"]'), state);
    renderQuests(overlay.querySelector('[data-panel="quests"]'), state);
    renderRank(overlay.querySelector('[data-panel="rank"]'), state);
    renderGroups(overlay.querySelector('[data-panel="groups"]'), state);
    renderHousehold(overlay.querySelector('[data-panel="household"]'), state);
    renderMap(overlay.querySelector('[data-panel="map"]'), state);
    renderNpcs(overlay.querySelector('[data-panel="npcs"]'), state);
    renderMailbox(overlay.querySelector('[data-panel="mail"]'), state);
    renderMusic(overlay.querySelector('[data-panel="music"]'), state);
    const label = overlay.querySelector('#tretaresia-context-label');
    if (label) label.innerHTML = SillyTavern.getContext().getCurrentChatId?.()
        ? `<i class="fa-solid fa-location-dot"></i> ${html(state.location.region)} · ${html(state.location.place)}`
        : `<i class="fa-solid fa-triangle-exclamation"></i> ${html(tr('Open a chat to activate this system'))}`;
    void hydrateNpcPortraits(overlay, state);
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
                ${meterView('Aura / Mana', state.player.mp, 'fa-solid fa-fire-flame-curved', 'mana')}
                ${meterView('Stamina', state.player.stamina, 'fa-solid fa-bolt', 'stamina')}</div></article>
            <article class="tretaresia-card"><div class="tretaresia-card-title"><span>${html(tr('Identity'))}</span>
                <i class="fa-solid fa-feather"></i></div><dl class="tretaresia-fact-list">
                <div><dt>${html(tr('Race'))}</dt><dd>${html(state.player.race)}</dd></div>
                <div><dt>${html(tr('Age'))}</dt><dd>${html(state.player.age || 'Unknown')}</dd></div>
                <div><dt>${html(tr('Guild'))}</dt><dd>${html(state.player.guild)}</dd></div>
                <div><dt>${html(tr('Party'))}</dt><dd>${html(state.player.party)}</dd></div>
                <div><dt>${html(tr('Profession'))}</dt><dd>${html(state.player.profession)}</dd></div>
                <div><dt>${html(tr('Power type'))}</dt><dd>${html(state.player.powerType)}</dd></div>
                <div><dt>${html(tr('Origin skill'))}</dt><dd>${html(state.player.originSkill)}</dd></div>
                <div><dt>${html(tr('Condition'))}</dt><dd>${html(state.player.condition)}</dd></div>
                <div><dt>${html(tr('Level'))}</dt><dd>${state.player.level}</dd></div></dl></article>
        </div>
        <details class="tretaresia-editor"><summary><i class="fa-solid fa-pen"></i> ${html(tr('Edit status'))}</summary>
            <form data-form="status" class="tretaresia-form-grid">
                ${input('Name', 'name', state.player.name)}${input('Title', 'title', state.player.title)}
                ${input('Race', 'race', state.player.race)}${input('Age', 'age', state.player.age)}
                ${input('Profession', 'profession', state.player.profession)}${input('Guild', 'guild', state.player.guild)}${input('Party', 'party', state.player.party)}
                ${input('Power type', 'powerType', state.player.powerType)}${input('Origin skill', 'originSkill', state.player.originSkill)}
                ${input('Condition', 'condition', state.player.condition)}${input('Level', 'level', state.player.level, 'number', 'min="1"')}
                ${input('HP', 'hpCurrent', state.player.hp.current, 'number', 'min="0"')}${input('HP max', 'hpMax', state.player.hp.max, 'number', 'min="1"')}
                ${input('MP', 'mpCurrent', state.player.mp.current, 'number', 'min="0"')}${input('MP max', 'mpMax', state.player.mp.max, 'number', 'min="1"')}
                ${input('Stamina', 'staminaCurrent', state.player.stamina.current, 'number', 'min="0"')}${input('Stamina max', 'staminaMax', state.player.stamina.max, 'number', 'min="1"')}
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
    return `<section class="tretaresia-card tretaresia-journey-logs">
        <header><div><span><i class="fa-solid fa-book-open"></i> ${html(tr('Journey Logs'))}</span><small>${html(tr('Story milestones'))} · ${entries.length}</small></div>
            <details class="tretaresia-journey-add"><summary><i class="fa-solid fa-plus"></i> ${html(tr('Add journey log'))}</summary>
                <form data-form="journey-log-add">${textareaField('What happened', 'text', '', 3, 'maxlength="500" required')}
                    <button class="tretaresia-primary-button" type="submit">${html(tr('Save log'))}</button></form></details></header>
        <div class="tretaresia-journey-list">${entries.length ? entries.map(entry => `
            <article class="tretaresia-journey-entry"><div class="tretaresia-journey-mark"><i class="fa-solid fa-diamond"></i></div>
                <div class="tretaresia-journey-copy"><small>${html(entry.day || '')}${entry.place ? ` · ${html(entry.place)}` : ''}${entry.at ? ` · ${html(formatDate(entry.at))}` : ''}</small><p>${html(entry.text)}</p></div>
                <div class="tretaresia-journey-actions"><details><summary title="${html(tr('Edit log'))}"><i class="fa-solid fa-pen"></i></summary>
                    <form data-form="journey-log-edit"><input type="hidden" name="id" value="${html(entry.id)}">
                        ${textareaField('What happened', 'text', entry.text, 3, 'maxlength="500" required')}
                        <button class="tretaresia-primary-button" type="submit">${html(tr('Save log'))}</button></form></details>
                    <button type="button" data-action="delete-journey-log" data-id="${html(entry.id)}" title="${html(tr('Delete log'))}"><i class="fa-solid fa-trash"></i></button></div>
            </article>`).join('') : `<p class="tretaresia-journey-empty">${html(tr('No journey logs yet.'))}</p>`}</div>
    </section>`;
}

function renderScene(panel, state) {
    if (!panel) return;
    const phaseIndex = Math.max(0, DAY_PHASES.indexOf(state.worldClock.phase));
    const moving = ['Preparing', 'Traveling', 'Delayed'].includes(state.travel.status);
    const journeyProgress = travelProgress(state);
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
            </form></details>`;
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
    return `<section class="tretaresia-card tretaresia-transactions"><header><div><span><i class="fa-solid fa-receipt"></i> ${html(tr('Transaction history'))}</span><small>${html(state.progression.currency.name)}</small></div><b>${entries.length}</b></header>
        <div>${entries.length ? entries.map(entry => `<article><div><strong>${html(entry.reason)}</strong><small>${html(formatDate(entry.at))} · ${html(entry.source)}</small></div>
            <div class="tretaresia-transaction-amounts">${transactionAmounts(entry)}<small>${html(tr('Balance after'))}: ${entry.balance.gold} / ${entry.balance.silver} / ${entry.balance.copper}</small></div></article>`).join('')
            : `<p class="tretaresia-transaction-empty">${html(tr('No transactions recorded yet.'))}</p>`}</div></section>`;
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
        const fallback = worldTile(WORLD_TILE_LEVELS[0], 0, 0, worldId, variant);
        if (fallback.status === 'ready') {
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
                const tile = worldTile(level, column, row, worldId, variant);
                if (tile.status !== 'ready') continue;
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
    if (!mapInteracting) {
        for (const continent of continents) {
            const point = mapCanvasPoint(continent.label[0], continent.label[1], canvas.width, canvas.height);
            drawMapLabel(context, continent.name.toUpperCase(), point.x, point.y, {
                size: Math.max(14 * pixelRatio, canvas.width / 74), weight: 800, color: 'rgba(255,248,218,.94)', stroke: 'rgba(7,17,20,.92)',
            });
        }
    }

    if (viewingCurrentWorld && getSettings().showNpcMapMarkers) {
        const visibleNpcs = friendlyNpcs(state).filter(entry => entry.mapVisible).slice(0, 40);
        for (const entry of visibleNpcs) {
            const npcPoint = npcMapPoint(entry, state);
            if (!npcPoint || npcPoint.x < bounds.left || npcPoint.x > bounds.right || npcPoint.y < bounds.top || npcPoint.y > bounds.bottom) continue;
            const point = mapCanvasPoint(npcPoint.x, npcPoint.y, canvas.width, canvas.height);
            const size = 8 * pixelRatio;
            context.save();
            context.fillStyle = npcPoint.partyMember ? palette.alt : palette.accent;
            context.strokeStyle = palette.halo;
            context.lineWidth = 2 * pixelRatio;
            context.beginPath();
            context.arc(point.x, point.y, size, 0, Math.PI * 2);
            context.fill();
            context.stroke();
            context.fillStyle = readableOn(npcPoint.partyMember ? palette.alt : palette.accent);
            context.font = `800 ${Math.max(8, 8.5 * pixelRatio)}px system-ui, sans-serif`;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(entry.name.charAt(0).toUpperCase() || '?', point.x, point.y + .5 * pixelRatio);
            context.restore();
            mapRenderedPoints.push({ type: 'npc', id: entry.id, x: point.x, y: point.y, radius: 22 * pixelRatio });
        }
    }

    let player = null;
    if (viewingCurrentWorld) {
        const current = currentMapPoint(state);
        player = mapCanvasPoint(current.x, current.y, canvas.width, canvas.height);
        context.save();
        context.beginPath();
        context.arc(player.x, player.y, 10 * pixelRatio, 0, Math.PI * 2);
        context.fillStyle = palette.halo;
        context.fill();
        context.lineWidth = 2.5 * pixelRatio;
        context.strokeStyle = palette.alt;
        context.stroke();
        context.beginPath();
        context.arc(player.x, player.y, 4 * pixelRatio, 0, Math.PI * 2);
        context.fillStyle = palette.alt;
        context.fill();
        context.restore();
    }
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

function socialMemberCards(state, memberIds, removeAction = '', groupId = '', leaderId = 'player') {
    const ids = [...new Set(['player', ...(memberIds || []).filter(id => id !== 'player'), ...(leaderId && leaderId !== 'player' ? [leaderId] : [])])];
    return ids.length ? ids.map(id => `<article class="tretaresia-social-member${id === 'player' ? ' is-player' : ''}">
        <span class="tretaresia-social-member-icon"><i class="fa-solid ${id === 'player' ? 'fa-user' : 'fa-user-astronaut'}"></i></span>
        <span><strong>${html(socialMemberName(state, id))}</strong><small>${html(id === leaderId ? tr('Leader') : (state.npcs.find(entry => entry.id === id)?.relationship || tr('Member')))}</small></span>
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
        <div class="tretaresia-social-member-list">${socialMemberCards(state, party.memberIds, 'remove-party-member', '', party.leaderId)}</div>
        <form data-form="party-invite" class="tretaresia-social-invite"><input type="hidden" name="partyId" value="${html(party.id)}"><label class="tretaresia-field"><span>${html(tr('Friendly NPCs'))}</span><select name="npcId" required>${socialNpcOptions(state)}</select></label><button class="tretaresia-primary-button" type="submit"><i class="fa-solid fa-user-plus"></i>${html(tr('Invite to party'))}</button></form>
    </article>` : `<article class="tretaresia-social-card"><header><div><span class="tretaresia-eyebrow">${html(tr('Party management'))}</span><h4>${html(tr('No active party'))}</h4></div><i class="fa-solid fa-people-group tretaresia-social-card-icon"></i></header>
        <p class="tretaresia-social-description">${html(getSettings().language === 'th' ? 'สร้างปาร์ตี้เพื่อรวม NPC ฝ่ายมิตรไว้ร่วมเดินทางหรือทำภารกิจ' : 'Create a party to organize friendly NPCs for travel and missions.')}</p>
        <form data-form="party-create" class="tretaresia-social-form">${input('Party name', 'name', '')}<button class="tretaresia-primary-button" type="submit"><i class="fa-solid fa-plus"></i>${html(tr('Create party'))}</button></form>
    </article>`;
    const guildCards = guilds.length ? guilds.map(guild => `<article class="tretaresia-social-card tretaresia-guild-card">
        <header><div><span class="tretaresia-eyebrow">${html(tr('Guild management'))}</span><h4>${html(guild.name)}</h4><small>${html(guild.rank)} · ${guild.memberIds.length + 1} ${html(tr('Members').toLowerCase())}</small></div><button type="button" class="tretaresia-danger-button" data-action="dissolve-guild" data-id="${html(guild.id)}"><i class="fa-solid fa-xmark"></i>${html(tr('Dissolve guild'))}</button></header>
        ${guild.description ? `<p class="tretaresia-social-description">${html(guild.description)}</p>` : ''}<div class="tretaresia-social-treasury"><span><i class="fa-solid fa-coins"></i>${html(tr('Guild treasury'))}</span><strong>${html(currencyLabel(guild.treasury))}</strong></div>
        <div class="tretaresia-social-member-list">${socialMemberCards(state, guild.memberIds, 'remove-guild-member', guild.id, guild.leaderId)}</div>
        <form data-form="guild-invite" class="tretaresia-social-invite"><input type="hidden" name="guildId" value="${html(guild.id)}"><label class="tretaresia-field"><span>${html(tr('Friendly NPCs'))}</span><select name="npcId" required>${socialNpcOptions(state)}</select></label><button class="tretaresia-primary-button" type="submit"><i class="fa-solid fa-user-plus"></i>${html(tr('Invite to guild'))}</button></form>
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
        <div class="tretaresia-npc-layout"><aside class="tretaresia-npc-index"><div class="tretaresia-section-label"><i class="fa-solid fa-list"></i><span>${html(tr('NPCs'))}</span></div>
            <div class="tretaresia-npc-list">${list}</div><details class="tretaresia-editor tretaresia-npc-add"><summary><i class="fa-solid fa-user-plus"></i> ${html(tr('Add NPC'))}</summary>
            <form data-form="npc-new" class="tretaresia-form-grid">${input('Name', 'name', '')}${input('Title', 'title', '')}${input('Faction', 'faction', '')}${input('Relationship', 'relationship', 'Acquaintance')}${input('Current location', 'location', 'Unknown')}${npcLifeModeField('Active')}
            <label class="tretaresia-checkbox-field"><input type="checkbox" name="mapVisible"><span>${html(tr('Show on World Map'))}</span></label>
            <label class="tretaresia-checkbox-field"><input type="checkbox" name="linkContact" value="yes"><span>${html(tr('Link to Mailbox'))}</span></label>
            <button class="tretaresia-primary-button tretaresia-form-submit" type="submit">${html(tr('Add NPC'))}</button></form></details></aside>
            <div class="tretaresia-npc-dossier">${detail}</div></div>`;
    void hydrateNpcPortraits(panel, state);
}

function renderNpcDossier(entry, linkedContact) {
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
                const linked = await bridge.portrait?.({ id: entry.characterLifeId, scope: entry.characterLifeScope, name: entry.name });
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
                powerType: values.powerType, originSkill: values.originSkill, condition: values.condition, level: values.level,
                hp: { current: values.hpCurrent, max: values.hpMax },
                mp: { current: values.mpCurrent, max: values.mpMax },
                stamina: { current: values.staminaCurrent, max: values.staminaMax },
            };
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
                MAGIC_DISCIPLINES.forEach(entry => {
                    if (values[`magic-${entry.id}`] !== undefined) state.proficiencies.magic[entry.id] = values[`magic-${entry.id}`];
                });
                state.proficiencies.customMagic.forEach(entry => {
                    if (values[`custom-magic-${entry.id}`] !== undefined) entry.proficiency = values[`custom-magic-${entry.id}`];
                });
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
            };
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
            renderNpcs(document.querySelector('[data-panel="npcs"]'), getState());
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
    if (mapInteracting && applyMapCompositorPreview()) return;
    scheduleMapDetailRender();
}

function beginMapCompositorPreview(canvas) {
    if (!(canvas instanceof HTMLCanvasElement) || mapGestureBase) return;
    const frameRect = canvas.parentElement?.getBoundingClientRect();
    if (!frameRect?.width || !frameRect?.height) return;
    mapGestureBase = {
        canvas,
        scale: mapView.scale,
        x: mapView.x,
        y: mapView.y,
        width: frameRect.width,
        height: frameRect.height,
    };
    canvas.classList.add('is-compositing');
}

function applyMapCompositorPreview() {
    const base = mapGestureBase;
    if (!base?.canvas?.isConnected || !base.scale) return false;
    const ratio = mapView.scale / base.scale;
    const tx = (mapView.x - base.x * ratio) / WORLD_MAP_WIDTH * base.width;
    const ty = (mapView.y - base.y * ratio) / WORLD_MAP_HEIGHT * base.height;
    base.canvas.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${ratio})`;
    return true;
}

function finishMapCompositorPreview(panel, state = getState()) {
    const canvas = mapGestureBase?.canvas;
    if (canvas) {
        canvas.style.transform = '';
        canvas.classList.remove('is-compositing');
    }
    mapGestureBase = null;
    mapInteracting = false;
    drawWorldMap(panel, state);
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
    'player.hp.current', 'player.hp.max', 'player.mp.current', 'player.mp.max', 'player.stamina.current', 'player.stamina.max',
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
const PATCH_COLLECTIONS = new Set(['inventory', 'skills', 'proficiencies.customMagic', 'proficiencies.customSword', 'proficiencies.techniques', 'quests', 'npcs', 'contacts', 'letters']);
const SCENE_MAP_PATCH_COLLECTIONS = new Set(['sceneMaps', 'sceneFloors', 'sceneRooms', 'sceneConnections']);
const NPC_RELATIONSHIP_FIELDS = new Set(['affection', 'trust', 'loyalty', 'fear', 'corruption', 'lust']);
const NPC_STAT_FIELDS = new Set(['level', 'hp', 'mp', 'stamina', 'strength', 'agility', 'intelligence', 'endurance']);

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
    return state[path];
}

function patchIdentity(value) {
    if (value && typeof value === 'object') return text(value.id, '', 100) || text(value.name, '', 160).toLocaleLowerCase();
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
        if (!existing && !canAffordCurrency(state.progression.currency, GUILD_CREATION_FEE)) return false;
        const next = guildProfile(value, existing || {});
        if (!next) return false;
        next.memberIds = [...new Set(next.memberIds.map(id => resolveFriendlyNpc(state, id)?.id).filter(Boolean))];
        if (existing) state.social.guilds[state.social.guilds.indexOf(existing)] = next;
        else {
            state.progression.currency.gold -= GUILD_CREATION_FEE.gold;
            next.treasury = {
                gold: number(value.treasury?.gold, GUILD_CREATION_FEE.gold, 0, 999999999),
                silver: number(value.treasury?.silver, GUILD_CREATION_FEE.silver, 0, 999999999),
                copper: number(value.treasury?.copper, GUILD_CREATION_FEE.copper, 0, 999999999),
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
    if (['npcAbilities', 'npcMeters', 'npcDiary'].includes(path) && value && typeof value === 'object') {
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
        const index = collection.findIndex(entry => matchesPatchIdentity(entry, value));
        let candidate = { ...(index >= 0 ? collection[index] : {}), ...value };
        if (!candidate.id) candidate.id = uid();
        if (path === 'npcs') {
            candidate = npcProfile({ ...candidate, updatedAt: new Date().toISOString() }, index >= 0 ? collection[index] : {});
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
    for (const operation of patch.ops.slice(0, 75)) {
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
                if (SCALAR_PATCH_PATHS.has(path) && (child === null || typeof child !== 'object')) operations.push(['set', path, child]);
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
    const message = context.chat[messageId];
    if (!message || message.is_user || message.is_system || typeof message.mes !== 'string') return;
    if (!settings.autoTrack) {
        setSync('disabled', tr('Reply received'), tr('Tracking is off'));
        return;
    }
    setSync('working', tr('Checking reply'), settings.language === 'th' ? 'กำลังอ่านเฉพาะข้อมูลที่เปลี่ยนแปลงจากคำตอบนี้' : 'Reading this reply for confirmed state changes.');
    const extracted = cleanInlinePatchSurfaces(message);
    if (!extracted.found) {
        setSync('unchanged', tr('No state changes'), settings.language === 'th' ? 'ระบบทำงานแล้ว แต่ไม่มีเหตุการณ์ที่ยืนยันให้บันทึก' : 'The extension checked this reply; there was nothing confirmed to record.');
        return;
    }
    message.mes = extracted.visible;
    if (Array.isArray(message.swipes) && Number.isInteger(message.swipe_id) && message.swipes[message.swipe_id] !== undefined) {
        message.swipes[message.swipe_id] = extracted.visible;
    }
    if (!extracted.patch) {
        setSync('error', tr('Sync unavailable'));
        return;
    }
    try {
        const { next, accepted, notifications } = applyStatePatch(getState(), extracted.patch);
        if (accepted) {
            await persistState(next, 'inline-patch');
            showEventNotifications(notifications);
            setSync('success', tr('State updated'), settings.language === 'th' ? `บันทึกการเปลี่ยนแปลง ${accepted} รายการแล้ว` : `${accepted} confirmed change${accepted === 1 ? '' : 's'} saved.`);
            console.info(`[Tretaresia RPG] Applied ${accepted} inline state operation(s).`);
        } else {
            setSync('unchanged', tr('No state changes'), settings.language === 'th' ? 'พบข้อมูล Patch แต่ไม่มีคำสั่งที่อนุญาตให้บันทึก' : 'A patch was present, but it contained no permitted changes.');
        }
    } catch (error) {
        console.error('[Tretaresia RPG] Inline state patch failed.', error);
        setSync('error', tr('Sync unavailable'));
    }
}

function analyzerPrompt(state, transcript) {
    return `Review only the latest completed Tretaresia role-play turn and return a small state patch.

CURRENT STATE:
${JSON.stringify(aiState(state))}

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
    const overlay = document.getElementById('tretaresia-rpg-overlay');
    const panel = document.getElementById('tretaresia-rpg-panel');
    if (!overlay || !panel) return;
    clearTimeout(introTimer);
    previousFocusedElement = document.activeElement;
    overlay.classList.remove('is-closing');
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
    requestAnimationFrame(() => panel.focus());
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
        event.stopPropagation();
        openInterface();
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
        cleanupAudio();
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
        if (!generationType || generationType === 'normal') updatePrompt();
    });
    eventSource.on(eventTypes.MESSAGE_RECEIVED, (messageId, generationType) => processAssistantPatch(messageId, generationType));
    globalThis.addEventListener('character-life:rpg-bridge-ready', () => queueCharacterLifeCompatibilityRefresh({ save: true }));
    globalThis.addEventListener('character-life:skills-ready', () => queueCharacterLifeCompatibilityRefresh({ save: false }));
    globalThis.addEventListener('character-life:skill-updated', () => queueCharacterLifeCompatibilityRefresh({ save: false }));
    globalThis.addEventListener('character-life:portrait-replaced', () => queueCharacterLifeCompatibilityRefresh({ save: false }));
    globalThis.addEventListener('character-life:rpg-compatibility-updated', () => queueCharacterLifeCompatibilityRefresh({ save: false }));
}

async function initialize() {
    if (initialized) return;
    initialized = true;
    try {
        getSettings();
        applyAppearance();
        buildActivityIndicator();
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
        try { await catchUpTravelHistory(); }
        catch (error) { console.warn('[Tretaresia RPG] Could not catch up travel history.', error); }
        updatePrompt();
        document.addEventListener('keydown', event => {
            if (event.key !== 'Escape') return;
            if (mapFullscreen) {
                setMapFullscreen(false);
                return;
            }
            if (controlCenterOpen()) return;
            closeInterface();
        });
        console.info('[Tretaresia RPG] Role-play interface v0.20.0 loaded.');
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
