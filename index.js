/* global SillyTavern, toastr */

const EXTENSION_FOLDER = 'third-party/rpg-systems';
const SETTINGS_KEY = 'tretaresia_rpg';
const METADATA_KEY = 'tretaresia_rpg_state';
const PROMPT_KEY = 'tretaresia_rpg_roleplay_state';
const ACTION_PROMPT_KEY = 'tretaresia_rpg_hidden_action';
const STATE_PACKAGE_FORMAT = 'tretaresia-rpg-state';
const CONTINUITY_STORAGE_PREFIX = 'tretaresia-rpg:continuity:';
const PATCH_COMMENT_PATTERN = /<!--\s*tretaresia_patch\s*:\s*([\s\S]*?)\s*-->/gi;
const PATCH_TAG_PATTERN = /<tretaresia_patch>\s*([\s\S]*?)\s*<\/tretaresia_patch>/gi;
const RANKS = ['Rookie', 'Basic', 'Intermediate', 'Ember', 'Custom Rank'];
const MASTERY = ['Dormant', 'Initiate', 'Practiced', 'Adept', 'Expert', 'Master', 'Grandmaster', 'Mythic'];
const DUNGEON_RANKS = ['Unranked', 'E-', 'E', 'E+', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+', 'S-', 'S', 'S+', 'SS'];
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
const WORLD_MAP_WIDTH = 2400;
const WORLD_MAP_HEIGHT = 1400;
const WORLD_TILE_SIZE = 512;
const WORLD_TILE_ROOT = `/scripts/extensions/${EXTENSION_FOLDER}/assets/world-map/tiles`;
const WORLD_TILE_LEVELS = [
    { z: 0, width: 512, height: 288, columns: 1, rows: 1 },
    { z: 1, width: 1024, height: 576, columns: 2, rows: 2 },
    { z: 2, width: 2048, height: 1152, columns: 4, rows: 3 },
    { z: 3, width: 4096, height: 2304, columns: 8, rows: 5 },
];
const WORLD_CONTINENTS = [
    { id: 'central', name: 'Central Continent', className: 'central', label: [1120, 710], bounds: [620, 310, 1660, 1135],
        path: 'M690 390 830 325 1030 350 1180 315 1370 370 1515 470 1580 620 1540 770 1615 900 1510 1045 1325 1110 1130 1075 950 1125 785 1030 670 880 705 720 625 555Z' },
    { id: 'forest', name: 'The Great Forest', className: 'forest', label: [2030, 985], bounds: [1660, 650, 2370, 1370],
        path: 'M1710 760 1810 680 1980 705 2120 660 2270 735 2360 875 2330 1040 2380 1185 2265 1335 2075 1370 1900 1315 1740 1220 1680 1070 1730 920Z' },
    { id: 'titan', name: 'Great Land of Titan', className: 'titan', label: [350, 1090], bounds: [25, 710, 720, 1380],
        path: 'M75 900 170 785 335 735 510 770 645 890 710 1050 655 1215 535 1345 350 1380 175 1330 45 1200 20 1040Z' },
    { id: 'drinovia', name: 'Drinovia Continent', className: 'drinovia', label: [2050, 370], bounds: [1640, 60, 2380, 680],
        path: 'M1680 180 1805 85 1985 65 2160 120 2310 235 2380 390 2305 540 2165 650 1975 620 1810 555 1660 420 1625 285Z' },
    { id: 'north', name: 'North Continent', className: 'north', label: [1120, 145], bounds: [650, 10, 1660, 315],
        path: 'M675 155 820 55 1035 15 1240 35 1435 80 1620 175 1540 275 1350 310 1130 275 940 305 755 250Z' },
    { id: 'baluguria', name: 'Baluguria Continent', className: 'baluguria', label: [1260, 1270], bounds: [850, 1110, 1690, 1390],
        path: 'M890 1235 1010 1145 1185 1110 1370 1135 1530 1190 1670 1300 1575 1380 1390 1395 1195 1365 1030 1390 875 1325Z' },
];
const mapSite = (id, name, continent, region, x, y, tier = 2, kind = 'landmark', zone = 'Neutral Zone') => (
    { id, name, continent, region, x, y, tier, kind, zone }
);
const WORLD_LOCATIONS = [
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
const WORLD = Object.fromEntries([...new Set(WORLD_LOCATIONS.map(location => location.continent))].map(continent => [
    continent, WORLD_LOCATIONS.filter(location => location.continent === continent).map(location => location.name),
]));
const LOCATION_REGIONS = Object.fromEntries(WORLD_LOCATIONS.map(location => [location.name, location.region]));
const DEFAULT_SETTINGS = Object.freeze({
    showWandLauncher: true,
    autoTrack: true,
    injectState: true,
    language: 'en',
    interactionMode: 'hidden',
    activityIndicator: 'full',
    accentColor: '#d6b458',
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
    visualVersion: 2,
});

const TRANSLATIONS = {
    th: {
        'Tretaresia Role-play': 'ระบบโรลเพลย์ Tretaresia', 'World ledger': 'บันทึกโลก', Powers: 'พลัง',
        'Magic interface': 'อินเทอร์เฟซเวทมนตร์',
        'Synchronizing world state': 'กำลังเชื่อมข้อมูลโลก',
        'Connecting to the active role-play...': 'กำลังเชื่อมต่อกับโรลเพลย์ปัจจุบัน...',
        Ready: 'พร้อม', Status: 'สถานะ', Scene: 'ฉาก', Inventory: 'คลังสิ่งของ', Skills: 'ทักษะ', Quests: 'ภารกิจ', Rank: 'อันดับ', 'World Map': 'แผนที่โลก',
        Music: 'เพลง', Mailbox: 'กล่องจดหมาย', Contacts: 'รายชื่อ', Letters: 'จดหมาย', NPCs: 'ตัวละคร NPC', 'NPC Codex': 'สารบบ NPC', Techniques: 'วิชา',
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
        'Ranks & Progression': 'อันดับและความก้าวหน้า', 'Guild and mastery record': 'บันทึกอันดับกิลด์และความชำนาญ', 'Adventurer Rank': 'อันดับนักผจญภัย', 'Custom rank name': 'ชื่ออันดับเฉพาะตัว',
        'Power mastery': 'ความชำนาญพลัง', 'Combat mastery': 'ความชำนาญการต่อสู้', 'Power & Combat': 'พลังและการต่อสู้', 'Power systems': 'ระบบพลัง', 'Combat disciplines': 'ศาสตร์การต่อสู้',
        'Recognized guild classification': 'ระดับที่กิลด์รับรอง', 'Magic mastery': 'ความชำนาญเวทมนตร์', 'Sword mastery': 'ความชำนาญดาบ', Experience: 'ค่าประสบการณ์', Reputation: 'ชื่อเสียง',
        Gold: 'เหรียญทอง', Silver: 'เหรียญเงิน', Copper: 'เหรียญทองแดง', 'Edit progression': 'แก้ไขความก้าวหน้า', 'Adventurer rank': 'อันดับนักผจญภัย',
        'Magic rank': 'ระดับเวทมนตร์', 'Sword rank': 'ระดับดาบ', 'EXP to next level': 'EXP สำหรับเลเวลถัดไป', 'Save progression': 'บันทึกความก้าวหน้า',
        'Tretaresia World Atlas': 'แผนที่โลก Tretaresia', 'Selected location': 'สถานที่ที่เลือก', Region: 'ภูมิภาค', Discovery: 'การค้นพบ', Marker: 'หมุด',
        Journey: 'การเดินทาง', Origin: 'ต้นทาง', 'Travel route': 'เส้นทางเดินทาง', 'Remaining travel': 'เวลาที่เหลือ', days: 'วัน', 'Estimated travel days': 'จำนวนวันเดินทางโดยประมาณ', 'Begin journey': 'เริ่มออกเดินทาง',
        'Currency / region': 'สกุลเงิน / ภูมิภาค', 'High denomination': 'หน่วยมูลค่าสูง', 'Standard denomination': 'หน่วยมาตรฐาน', 'Fractional denomination': 'หน่วยย่อย',
        Recorded: 'บันทึกแล้ว', Unexplored: 'ยังไม่สำรวจ', Pinned: 'ปักหมุดแล้ว', None: 'ไม่มี', Destination: 'จุดหมาย', 'Exact place / scene': 'สถานที่หรือฉากโดยละเอียด',
        'Location detail': 'รายละเอียดสถานที่', 'Travel and notify chat': 'เดินทางและแจ้งในโรลเพลย์', 'Marker label': 'ชื่อหมุด', 'Marker note': 'บันทึกหมุด', 'Mark location': 'ปักหมุดสถานที่',
        Current: 'ปัจจุบัน', Discovered: 'ค้นพบแล้ว', Marked: 'ปักหมุด', 'Drag to pan · Pinch or scroll to zoom': 'ลากเพื่อเลื่อน · จีบนิ้วหรือเลื่อนเพื่อซูม',
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
        'Core stats': 'ค่าสถานะหลัก', Strength: 'พละกำลัง', Agility: 'ความคล่องตัว', Intelligence: 'สติปัญญา', Endurance: 'ความอดทน',
        Abilities: 'สกิลและความสามารถ', 'Add ability': 'เพิ่มความสามารถ', 'Ability name': 'ชื่อความสามารถ', 'Ability level': 'ระดับความสามารถ',
        Diary: 'ไดอารี', 'Add diary entry': 'เพิ่มบันทึกไดอารี', Thought: 'ความคิด', Mood: 'อารมณ์', 'Custom meters': 'ค่าสถานะกำหนดเอง', 'Add custom meter': 'เพิ่มค่ากำหนดเอง',
        'Link to Mailbox': 'เชื่อมกับ Mailbox', 'Open Mailbox': 'เปิดกล่องจดหมาย', 'Remove portrait': 'ลบรูปตัวละคร',
        'Character continuity': 'การสานต่อตัวละคร', 'Carry this character into new chats automatically': 'นำตัวละครนี้ไปยังแชตใหม่โดยอัตโนมัติ',
        'Export state': 'ส่งออกข้อมูล', 'Import state': 'นำเข้าข้อมูล', 'Portable backup': 'ข้อมูลสำรองแบบพกพา',
        'State and player portrait are included. Device-only NPC portraits and audio are copied automatically only when continuing on this device.': 'รวมข้อมูลและรูปผู้เล่นไว้แล้ว ส่วนรูป NPC และเสียงที่เก็บในอุปกรณ์จะถูกคัดลอกอัตโนมัติเฉพาะเมื่อสานต่อบนอุปกรณ์นี้',
    },
};

let initialized = false;
let previousFocusedElement = null;
let menuObserver = null;
let introTimer = null;
let aiSyncInProgress = false;
let pendingSave = Promise.resolve();
let syncQueue = Promise.resolve();
let tabTransitionToken = 0;
let mapSelectionId = null;
let mapDraftPoint = null;
let mapDrawFrame = 0;
let mapRenderedPoints = [];
let mapResizeObserver = null;
const mapTileCache = new Map();
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
const mapView = { scale: .78, x: 264, y: 154 };
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
    const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : DEFAULT_SETTINGS.accentColor.slice(1);
    return `${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}`;
}

function applyAppearance() {
    const settings = getSettings();
    const root = document.documentElement;
    root.style.setProperty('--tretaresia-accent', settings.accentColor);
    root.style.setProperty('--tretaresia-accent-rgb', hexToRgb(settings.accentColor));
    root.style.setProperty('--tretaresia-glass-opacity', String(settings.glassOpacity / 100));
    root.style.setProperty('--tretaresia-glow-strength', String(settings.glowStrength / 100));
    const overlay = document.getElementById('tretaresia-rpg-overlay');
    if (overlay) {
        overlay.dataset.density = settings.density;
        overlay.dataset.language = settings.language;
    }
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
        progression: {
            adventurerRank: 'Rookie', customRankName: '', magicRank: 'Dormant', swordRank: 'Dormant', experience: 0, experienceMax: 100, reputation: 0,
            kills: 0,
            currency: { name: 'Central Common Currency', gold: 0, silver: 0, copper: 0 },
        },
        worldClock: { day: 1, dayName: 'Day 1', time: '08:00', phase: 'Morning' },
        location: { continent: 'Central Continent', region: 'Crown Heartlands', place: 'Central Crown', detail: '', zoneType: 'Safe Zone', mapX: 1135, mapY: 690, heading: 0, discovered: ['Central Crown'], pins: [] },
        travel: { status: 'Idle', origin: '', destination: '', route: 'Road', totalDays: 0, remainingDays: 0, notes: '' },
        scene: { position: 'Unknown', weather: 'Unknown', temperature: null },
        sceneMap: { activeMapId: '', activeFloorId: '', playerRoomId: '', maps: [] },
        inventory: [{ id: uid(), name: "Traveler's Clothes", quantity: 1, category: 'Equipment', description: '' }],
        skills: [],
        proficiencies: { magic, sword, customMagic: [], customSword: [], techniques: [] },
        quests: [],
        npcs: [],
        contacts: [],
        letters: [],
        music: { tracks: [], currentId: '', repeat: false, shuffle: false },
        journal: [],
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
    if (!['en', 'th'].includes(settings.language)) settings.language = DEFAULT_SETTINGS.language;
    if (!['hidden', 'visible', 'draft'].includes(settings.interactionMode)) settings.interactionMode = DEFAULT_SETTINGS.interactionMode;
    if (!['full', 'compact', 'off'].includes(settings.activityIndicator)) settings.activityIndicator = DEFAULT_SETTINGS.activityIndicator;
    if (!['compact', 'comfortable'].includes(settings.density)) settings.density = DEFAULT_SETTINGS.density;
    if (!/^#[0-9a-f]{6}$/i.test(settings.accentColor)) settings.accentColor = DEFAULT_SETTINGS.accentColor;
    settings.glassOpacity = number(settings.glassOpacity, DEFAULT_SETTINGS.glassOpacity, 55, 98);
    settings.glowStrength = number(settings.glowStrength, DEFAULT_SETTINGS.glowStrength, 0, 100);
    settings.notificationDuration = number(settings.notificationDuration, DEFAULT_SETTINGS.notificationDuration, 1500, 30000);
    for (const key of ['eventNotifications', 'notifyExperience', 'notifyLevel', 'notifyLearning', 'notifyCombat', 'notifyKills', 'notifyCurrency', 'notifyQuests', 'autoContinuity']) settings[key] = Boolean(settings[key]);
    return settings;
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
        alignment: text(value.alignment, text(fallback.alignment, '', 100), 100), relationship: text(value.relationship, text(fallback.relationship, 'Acquaintance', 100), 100),
        relationshipState: text(value.relationshipState, text(fallback.relationshipState, '', 160), 160),
        affection: number(value.affection, number(fallback.affection, 0, 0, 100), 0, 100), trust: number(value.trust, number(fallback.trust, 0, 0, 100), 0, 100),
        loyalty: number(value.loyalty, number(fallback.loyalty, 0, 0, 100), 0, 100), fear: number(value.fear, number(fallback.fear, 0, 0, 100), 0, 100),
        corruption: number(value.corruption, number(fallback.corruption, 0, 0, 100), 0, 100), lust: number(value.lust, number(fallback.lust, 0, 0, 100), 0, 100),
        location: text(value.location, text(fallback.location, 'Unknown', 200), 200), lastSeen: text(value.lastSeen, text(fallback.lastSeen, '', 120), 120),
        maritalStatus: text(value.maritalStatus, text(fallback.maritalStatus, 'Unknown', 100), 100), partner: text(value.partner, text(fallback.partner, '', 160), 160),
        children: text(value.children, text(fallback.children, '', 400), 400), notes: text(value.notes, text(fallback.notes, '', 1000), 1000),
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
    return {
        id: text(value.id, uid(), 100), name: text(value.name, '', 120),
        type: ['Mission', 'Quest', 'Dungeon', 'Contract', 'Personal'].includes(value.type) ? value.type : 'Quest',
        dungeonRank: DUNGEON_RANKS.includes(value.dungeonRank) ? value.dungeonRank : 'Unranked',
        status: statuses.includes(value.status) ? value.status : 'Active',
        objective: text(value.objective, '', 500), reward: text(value.reward, '', 160),
        giver: text(value.giver, '', 120), source: text(value.source, '', 160),
        progress: number(value.progress, value.status === 'Completed' ? 100 : 0, 0, 100),
        receivedAt: text(value.receivedAt, '', 60), updatedAt: text(value.updatedAt, '', 60),
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
    if (!maps.some(entry => entry.id === activeMapId)) activeMapId = maps[0]?.id || '';
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
    const progress = source.progression && typeof source.progression === 'object' ? source.progression : {};
    const currency = progress.currency && typeof progress.currency === 'object' ? progress.currency : {};
    const location = source.location && typeof source.location === 'object' ? source.location : {};
    const migratedMapSite = WORLD_LOCATIONS.find(entry => entry.name === location.place)
        || WORLD_LOCATIONS.find(entry => entry.name === location.region)
        || WORLD_LOCATIONS.find(entry => entry.continent === location.continent);

    result.version = 1;
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
    result.location = {
        continent: text(location.continent, result.location.continent, 100),
        region: text(location.region, result.location.region, 120),
        place: text(location.place, result.location.place, 160),
        detail: text(location.detail, result.location.detail, 300),
        zoneType: ZONE_TYPES.includes(location.zoneType) ? location.zoneType : result.location.zoneType,
        mapX: number(location.mapX, migratedMapSite?.x ?? result.location.mapX, 0, WORLD_MAP_WIDTH),
        mapY: number(location.mapY, migratedMapSite?.y ?? result.location.mapY, 0, WORLD_MAP_HEIGHT),
        heading: number(location.heading, result.location.heading, 0, 359.999),
        discovered: Array.isArray(location.discovered)
            ? [...new Set(location.discovered.map(x => text(x, '', 120)).filter(Boolean))].slice(0, 100)
            : result.location.discovered,
        pins: Array.isArray(location.pins) ? location.pins.map(pin => ({
            id: text(pin?.id, uid(), 100), locationId: text(pin?.locationId, '', 100),
            x: optionalNumber(pin?.x, null, 0, WORLD_MAP_WIDTH), y: optionalNumber(pin?.y, null, 0, WORLD_MAP_HEIGHT),
            continent: text(pin?.continent, '', 100), region: text(pin?.region, '', 120),
            label: text(pin?.label, 'Marked location', 100), note: text(pin?.note, '', 300),
        })).filter(pin => pin.locationId || (pin.x !== null && pin.y !== null)).slice(0, 250) : result.location.pins,
    };
    const travel = source.travel && typeof source.travel === 'object' ? source.travel : {};
    result.travel = {
        status: ['Idle', 'Preparing', 'Traveling', 'Delayed', 'Arrived'].includes(travel.status) ? travel.status : result.travel.status,
        origin: text(travel.origin, result.travel.origin, 160), destination: text(travel.destination, result.travel.destination, 160),
        route: ['Road', 'Caravan', 'Sea', 'Off-road', 'Unknown'].includes(travel.route) ? travel.route : result.travel.route,
        totalDays: number(travel.totalDays, result.travel.totalDays, 0, 999999),
        remainingDays: number(travel.remainingDays, result.travel.remainingDays, 0, 999999),
        notes: text(travel.notes, result.travel.notes, 500),
    };
    const scene = source.scene && typeof source.scene === 'object' ? source.scene : {};
    result.scene = {
        position: text(scene.position, result.scene.position, 200),
        weather: text(scene.weather, result.scene.weather, 120),
        temperature: optionalNumber(scene.temperature, result.scene.temperature, -1000, 1000),
    };
    result.sceneMap = normalizeSceneMap(source.sceneMap, result.sceneMap);
    if (Array.isArray(source.inventory)) result.inventory = source.inventory.map(item).filter(Boolean).slice(0, 200);
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
        if (saved) notify('success', settings.language === 'th' ? 'สานต่อข้อมูลตัวละครในแชตใหม่แล้ว' : 'Character state continued into this new chat.');
        return saved;
    } finally {
        continuityRestoreInProgress = false;
    }
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
    const state = normalize(candidate, getState());
    resolveLevelProgression(state);
    state.updatedAt = new Date().toISOString();
    state.updateSource = source;
    context.chatMetadata[METADATA_KEY] = state;
    updatePrompt(state);
    renderAll(state);
    pendingSave = pendingSave.catch(() => undefined).then(() => context.saveMetadata());
    await pendingSave;
    writeContinuitySnapshot(state);
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
    const recentTranscript = SillyTavern.getContext().chat.slice(-6).map(message => text(message?.mes, '', 4000)).join(' ').toLocaleLowerCase();
    const recentNpcs = [...state.npcs].sort((a, b) => {
        const aActive = recentTranscript.includes(a.name.toLocaleLowerCase()) ? 1 : 0;
        const bActive = recentTranscript.includes(b.name.toLocaleLowerCase()) ? 1 : 0;
        return bActive - aActive || String(b.updatedAt).localeCompare(String(a.updatedAt));
    }).slice(0, 16);
    return {
        player: safePlayer,
        progression: state.progression,
        worldClock: state.worldClock,
        location: { ...state.location, pins: undefined },
        travel: state.travel,
        scene: state.scene,
        sceneMap: aiSceneMap(state),
        inventory: state.inventory.map(({ id, name, quantity, category }) => ({ id, name, quantity, category })),
        skills: state.skills.map(({ id, name, rank, type }) => ({ id, name, rank, type })),
        proficiencies: state.proficiencies,
        quests: state.quests,
        npcIndex: state.npcs.slice(0, 100).map(({ id, name, relationship, location, faction }) => ({ id, name, relationship, location, faction })),
        npcs: recentNpcs.map(entry => ({
            id: entry.id, name: entry.name, title: entry.title, race: entry.race, age: entry.age, faction: entry.faction,
            relationship: entry.relationship, relationshipState: entry.relationshipState, affection: entry.affection,
            trust: entry.trust, loyalty: entry.loyalty, fear: entry.fear, corruption: entry.corruption, lust: entry.lust,
            location: entry.location, lastSeen: entry.lastSeen, maritalStatus: entry.maritalStatus, partner: entry.partner, children: entry.children,
            stats: entry.stats,
            abilities: entry.abilities.slice(0, 8).map(({ id, name, category, level, proficiency }) => ({ id, name, category, level, proficiency })),
            customMeters: entry.customMeters,
            diaryLatest: entry.diary.at(-1) ? { mood: entry.diary.at(-1).mood, text: entry.diary.at(-1).text.slice(0, 240) } : undefined,
        })),
        contacts: state.contacts.map(({ id, name, title, affiliation, relationship }) => ({ id, name, title, affiliation, relationship })),
        letters: state.letters.slice(-5).map(({ id, contactId, fromName, toName, subject, direction, status, createdAt }) => (
            { id, contactId, fromName, toName, subject, direction, status, createdAt }
        )),
    };
}

function hasUserReply(context = SillyTavern.getContext()) {
    return context.chat.some(message => message?.is_user && !message.is_system && text(message.mes));
}

function patchInstructions() {
    const iconKeys = PROFICIENCY_ICON_PRESETS.map(entry => entry.key).join(', ');
    return [
        'After the role-play reply, append one invisible HTML comment only when confirmed state changed:',
        '<!--tretaresia_patch:{"ops":[["upsert","quests",{"id":"academy-escort","name":"Escort the Academy Caravan","type":"Mission","status":"Active","objective":"Protect the caravan until it reaches Eastwatch","reward":"12 silver","giver":"Quartermaster Lysa","source":"Great Academy mission board","progress":0}],["inc","progression.experience",5,{"reason":"Completed aura control training","category":"training"}],["inc","progression.currency.silver",-3,{"reason":"Paid for an academy meal","category":"currency"}],["inc","progression.kills",1,{"reason":"Defeated the ash troll","category":"kill"}]],"summary":"Mission, training, payment, and combat progress recorded."}-->',
        'Allowed verbs: set or inc for scalar paths; upsert or delete for inventory, skills, proficiencies.customMagic, proficiencies.customSword, proficiencies.techniques, quests, npcs, contacts, letters; set or inc npcValues; upsert or delete npcAbilities and npcMeters; append npcDiary; add location.discovered. Local maps additionally allow upsert or delete on sceneMaps, sceneFloors, sceneRooms, and sceneConnections.',
        'Use canonical paths shown in the state JSON. For a new incoming physical letter include contactId/fromName/toName/subject/body/direction:"incoming"/status:"unread". Ordinary dialogue is not a letter.',
        'Create or update a named NPC dossier with an upsert on npcs only when that NPC becomes relevant or a confirmed fact changes. Use partial NPC objects and preserve the canonical id from npcIndex. When a relationship becomes a correspondence, also upsert contacts with npcId; do not make every incidental NPC a contact.',
        'For a meaningful private thought or relationship turning point, append npcDiary with {npcId,text,mood}, or npcName when the NPC was created in the same patch; do not write a diary entry every turn. Update abilities granularly through npcAbilities with npcId or npcName. NPC portraits and portrait framing are local-only and forbidden in patches.',
        'Evaluate every relevant subsystem after every reply, not only scene/location. Update every materially affected value in the same patch; leave a value unchanged only when this reply provides no reasonable story basis for changing it.',
        'Full checklist: player HP/Aura-or-Mana/stamina/condition, profession, power type, Origin skill and identity; EXP/adventurer rank/custom title/reputation/local currency; inventory, Constructs and learned skills; power/combat/technique proficiency; quests and dungeons; time/location/travel/weather/local map; every participating NPC dossier, relationship meter, location, lastSeen, abilities, diary, and revealed stats; contacts and actual physical letters. Emit only fields affected by this completed reply.',
        'Mission and quest receipt rules: immediately upsert every named mission, quest, contract, dungeon task, or personal objective when this reply formally offers, assigns, gives, or confirms the player has received it. Do not wait for completion or for the user to open the Quest tab. Use status "Offered" when acceptance is optional and not yet confirmed; use "Active" when accepted or assigned automatically. Include a stable id, name, type, status, objective, reward when known, giver, source, progress 0-100, and receivedAt when the story provides a timestamp. If the user accepts an offered task, upsert it as Active in this reply. Update progress/objective/status as confirmed events occur and set Completed only when completion is confirmed. Do not turn casual advice, rumors, possibilities, or rejected work into quests.',
        'EXP rules: award EXP for every completed action that materially counts as studying, reading with understanding, taking a lesson, researching, learning, spell or skill practice, crafting practice, physical training, sparring, combat participation, surviving danger, killing a hostile creature, discovery, quest progress, or another genuine growth action. Use inc progression.experience and always add fourth-position metadata {"reason":"specific cause","category":"study|learning|training|combat|kill|discovery|quest"}. Typical gain: 1-3 routine study/practice, 4-8 meaningful success, 9-20 combat or major challenge, 21-40 exceptional milestone. Do not award EXP for passive narration, merely intending to act, failed non-instructive attempts, or ordinary small talk. The extension levels up automatically the instant accumulated EXP is greater than or exactly equal to experienceMax.',
        'Kill rules: whenever the player personally kills or decisively finishes a hostile person or creature, inc progression.kills by the confirmed count with fourth-position metadata naming the defeated target, for example ["inc","progression.kills",1,{"reason":"Defeated the cave troll","category":"kill"}]. Also award appropriate combat EXP in the same patch. Do not count knockouts, uncertain deaths, assists without a kill, practice targets, or environmental deaths not caused by the player.',
        'Proficiency rules: increment a used or trained power system or combat discipline by 1-3 when the reply confirms genuine practice or successful use; use 4-8 only for a breakthrough. Do not increase unused proficiencies. When a confirmed power or combat style is not in the preset lists, upsert proficiencies.customMagic or proficiencies.customSword with {id,name,proficiency,description,iconKey}; later upserts may contain only id/name and changed fields.',
        'Tretaresia sensing rule: a power can normally be sensed only by someone who wields the same kind. Formless Aura cannot be sensed by anyone. Divine Mana can be perceived only by another Divine Mana wielder. Never let observers identify a hidden power without valid same-kind perception or direct evidence.',
        'Power canon: False Magic is learnable structured human magic that normally needs a staff, wand, or medium. True Magic is a lost stronger art requiring deep mana understanding and no medium. Aura is innate and commonly carries one birth-given Origin skill. Formless Aura is exceptionally rare and wholly undetectable. Blood Aura is vampiric and a turning may preserve, mutate, split, or erase the prior power. Sage Mana is lost transformative training that can refill from natural energy. Divine Mana may switch among power modes. Constructs allow those without usable Aura to wield a forged ability; primordial Divine Constructs choose one owner and cannot be copied, remade, or manufactured.',
        'Travel rules: Tretaresia distances take days, months, or years. Roads can produce villages, towns, waystations and caravans; off-road travel may reveal secret dungeons, lost villages, cults or worse. Almost the entire 2400 by 1400 world-coordinate atlas is travelable, including unnamed wilderness and sea routes. While travel.status is Traveling or Delayed, reduce travel.remainingDays only by elapsed story days and update worldClock. Do not change the current continent/place to the destination until arrival is confirmed. At arrival set travel.status to Arrived, remainingDays to 0, update location fields including location.mapX and location.mapY when the destination coordinates are known, and add location.discovered. Update location.heading from 0 north clockwise when a clear travel direction is established.',
        'Dungeon and rank rules: dungeonRank must be one of Unranked, E-, E, E+, D-, D, D+, C-, C, C+, B-, B, B+, A-, A, A+, S-, S, S+, SS. Adventurer ranks are Rookie, Basic, Intermediate, Ember, and Custom Rank; a Custom Rank name is individually invented by an assessor and should be recorded in progression.customRankName.',
        'Currency rules: the Central Continent generally shares a common currency, but other regions and non-human lands may use different money. Record every confirmed gain or decrease immediately. Every gold/silver/copper set or inc operation must include fourth-position metadata with a concrete reason, such as {"reason":"Reward from the escort contract","category":"currency"} or {"reason":"Paid for two nights at the inn","category":"currency"}; never use a vague reason such as transaction. When the active currency changes, set progression.currency.name and update only denominations actually gained or spent; never silently convert wealth without an established exchange.',
        `Allowed custom proficiency iconKey values: ${iconKeys}. Choose the closest semantic icon; omit iconKey to let the extension infer it from the name.`,
        'NPC update rules: for every named NPC who directly participates, consider relationship, location, lastSeen, abilities, custom meters, diary, and revealed stats. A substantive friendly/helpful exchange may change affection or trust by 1-3; hostility, deception, fear, romance, loyalty, or corruption should adjust only the relevant meters in proportion to what actually occurred. Use ["inc","npcValues",{"npcId":"...","field":"trust","amount":2}] for deltas or ["set","npcValues",{"npcId":"...","field":"stats.level","value":12}] for revealed absolute values. Valid relationship fields are affection, trust, loyalty, fear, corruption, lust. Valid stat fields are stats.level, stats.rank, stats.hp, stats.mp, stats.stamina, stats.strength, stats.agility, stats.intelligence, stats.endurance. Zero numeric NPC core stats mean unknown, not literal zero. Conversation alone does not increase NPC level or combat stats.',
        'Track the active scene when confirmed: time, phase, day/dayName, continent, region, place, location detail, exact world mapX/mapY coordinates, compass heading, scene position, weather, and temperature. Named atlas destinations already provide exact coordinates in state; for newly discovered nearby places use a reasonable nearby coordinate and keep it consistent. Do not invent weather or temperature when the reply provides no evidence.',
        'Maintain a sparse overhead local map only from confirmed or strongly implied spatial facts. Create a sceneMaps record, then its sceneFloors, sceneRooms, and sceneConnections. Room coordinates use x 0-100, y 0-70, width 8-70, height 7-50. Reveal or add rooms gradually; never invent a complete unseen building. Use canonical mapId/floorId/room ids, set the active ids and playerRoomId as the player moves, and preserve all locked maps, rooms, and connections.',
        'Handle all story genres and mature or NSFW scenes neutrally. Do not censor, rewrite, omit, or classify confirmed state merely because the scene is adult; follow the active SillyTavern, model, and provider settings.',
        'Record only outcomes confirmed by this reply. Never record plans, attempts, questions, hypotheticals, rejected actions, or out-of-character discussion. Keep proficiency changes conservative.',
        'Omit the comment when nothing changed. Never print a full state, Markdown fence, explanation, or visible system text.',
    ].join('\n');
}

function statePrompt(state, { includeState = true, track = true } = {}) {
    const lines = ['<tretaresia_rpg_state>'];
    lines.push('Tretaresia is a morally mixed, enormous world of six ocean-separated continents: Central Continent, The Great Forest, Great Land of Titan, Drinovia Continent, North Continent, and Baluguria Continent. Preserve established geography, long travel times, social prejudice, regional laws, power secrecy, and regional currencies. Most common monsters can speak understandable but broken human language.');
    lines.push('World canon: about one thousand years ago the Great War shattered the land and opened the oceans; hero Ars died and the Primordial Demon was sealed in a timeless dimension. Civilizations later rebuilt an uneasy harmony while war, invasion, prejudice, slavery, crime, kindness and cruelty continued together. The Great Academy charges steep tuition and admits every race, though prejudice remains. Human entry into the Great Forest is taboo and may bring punishment upon an entire family. Khaduzar is marked by the colossal stone hand gripping its own wrist. Drinovia plants the weapons and remains of the fallen where they died. The North can fall below -300 degrees. Baluguria is an exile, slave, gambling, pleasure-trade and underworld center.');
    if (includeState) {
        lines.push('Canonical role-play state. Preserve it unless the story confirms a change.');
        lines.push('Current scene, location, inventory, ranks, conditions, skills, quests, NPC dossiers, contacts, and physical letters are established facts.');
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

function currentMapLocation(state) {
    return WORLD_LOCATIONS.find(location => location.name === state.location.place)
        || WORLD_LOCATIONS.find(location => location.name === state.location.region)
        || WORLD_LOCATIONS.find(location => location.continent === state.location.continent)
        || WORLD_LOCATIONS[0];
}

function mapLocation(id) {
    return WORLD_LOCATIONS.find(location => location.id === id);
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

function continentAtPoint(x, y, hintedId = '') {
    const hinted = WORLD_CONTINENTS.find(entry => entry.id === hintedId);
    if (hinted) return hinted;
    return WORLD_CONTINENTS.find(entry => x >= entry.bounds[0] && x <= entry.bounds[2] && y >= entry.bounds[1] && y <= entry.bounds[3]) || null;
}

function nearestMapLocation(x, y, continentName = '') {
    const pool = continentName ? WORLD_LOCATIONS.filter(entry => entry.continent === continentName) : WORLD_LOCATIONS;
    return pool.reduce((nearest, entry) => {
        const distance = Math.hypot(entry.x - x, entry.y - y);
        return !nearest || distance < nearest.distance ? { entry, distance } : nearest;
    }, null)?.entry || WORLD_LOCATIONS[0];
}

function coordinatesLabel(x, y) {
    return `${Math.round(x).toString().padStart(4, '0')} E · ${Math.round(y).toString().padStart(4, '0')} S`;
}

const tabButton = (id, icon, label, active = false) => `
    <button class="tretaresia-tab-button${active ? ' is-active' : ''}" type="button" role="tab"
        data-tab="${id}" aria-selected="${active}"><i class="${icon}"></i><span>${html(tr(label))}</span></button>`;

function appearanceMenu() {
    const settings = getSettings();
    return `<details class="tretaresia-appearance-menu">
        <summary aria-label="${html(tr('Appearance'))}" title="${html(tr('Appearance'))}"><i class="fa-solid fa-sliders"></i></summary>
        <div class="tretaresia-appearance-popover">
            <div class="tretaresia-popover-heading"><span>${html(tr('Appearance'))}</span><small>UI 2.0</small></div>
            <label class="tretaresia-setting-row"><span>${html(tr('Accent'))}</span><input type="color" data-ui-setting="accentColor" value="${settings.accentColor}"></label>
            <label class="tretaresia-setting-row"><span>${html(tr('Glass'))}</span><input type="range" data-ui-setting="glassOpacity" min="55" max="98" value="${settings.glassOpacity}"></label>
            <label class="tretaresia-setting-row"><span>${html(tr('Glow'))}</span><input type="range" data-ui-setting="glowStrength" min="0" max="100" value="${settings.glowStrength}"></label>
            <label class="tretaresia-setting-row"><span>${html(tr('Density'))}</span><select data-ui-setting="density">
                <option value="compact"${settings.density === 'compact' ? ' selected' : ''}>${html(tr('Compact'))}</option>
                <option value="comfortable"${settings.density === 'comfortable' ? ' selected' : ''}>${html(tr('Comfortable'))}</option></select></label>
            <label class="tretaresia-setting-row"><span>${html(tr('Language'))}</span><select data-ui-setting="language">
                <option value="en"${settings.language === 'en' ? ' selected' : ''}>English</option>
                <option value="th"${settings.language === 'th' ? ' selected' : ''}>ไทย</option></select></label>
            <label class="tretaresia-setting-row"><span>${html(tr('Action delivery'))}</span><select data-ui-setting="interactionMode">
                <option value="hidden"${settings.interactionMode === 'hidden' ? ' selected' : ''}>${html(tr('Hidden'))} · no bubble</option>
                <option value="visible"${settings.interactionMode === 'visible' ? ' selected' : ''}>${html(tr('Visible'))} · send now</option>
                <option value="draft"${settings.interactionMode === 'draft' ? ' selected' : ''}>${html(tr('Draft only'))} · review</option></select></label>
            <small class="tretaresia-action-mode-help" data-action-mode-help>${html(activityCopy())}</small>
            <label class="tretaresia-setting-row"><span>${html(tr('Activity indicator'))}</span><select data-ui-setting="activityIndicator">
                <option value="full"${settings.activityIndicator === 'full' ? ' selected' : ''}>${html(tr('Full'))}</option>
                <option value="compact"${settings.activityIndicator === 'compact' ? ' selected' : ''}>${html(tr('Compact'))}</option>
                <option value="off"${settings.activityIndicator === 'off' ? ' selected' : ''}>${html(tr('Off'))}</option></select></label>
        </div></details>`;
}

function continuityMenu() {
    const settings = getSettings();
    return `<details class="tretaresia-continuity-menu">
        <summary aria-label="${html(tr('Character continuity'))}" title="${html(tr('Character continuity'))}"><i class="fa-solid fa-file-arrow-down"></i></summary>
        <div class="tretaresia-continuity-popover">
            <div class="tretaresia-popover-heading"><span>${html(tr('Character continuity'))}</span><small>${html(tr('Portable backup'))}</small></div>
            <label class="tretaresia-continuity-toggle"><input type="checkbox" data-ui-setting="autoContinuity"${settings.autoContinuity ? ' checked' : ''}><span>${html(tr('Carry this character into new chats automatically'))}</span></label>
            <p>${html(tr('State and player portrait are included. Device-only NPC portraits and audio are copied automatically only when continuing on this device.'))}</p>
            <div class="tretaresia-continuity-actions">
                <button type="button" data-action="export-state"><i class="fa-solid fa-file-export"></i>${html(tr('Export state'))}</button>
                <button type="button" data-action="import-state"><i class="fa-solid fa-file-import"></i>${html(tr('Import state'))}</button>
            </div>
        </div></details>`;
}

function buildInterface() {
    buildActivityIndicator();
    buildEventNotificationStack();
    if (document.getElementById('tretaresia-rpg-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'tretaresia-rpg-overlay';
    overlay.className = 'tretaresia-rpg-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
        <button class="tretaresia-rpg-backdrop" type="button" aria-label="Close Tretaresia RPG"></button>
        <section id="tretaresia-rpg-panel" class="tretaresia-rpg-panel" role="dialog" aria-modal="true"
            aria-labelledby="tretaresia-rpg-title" tabindex="-1">
            <div class="tretaresia-app-shell">
                <header class="tretaresia-rpg-panel-header">
                    <div class="tretaresia-rpg-brand-mark"><i class="fa-solid fa-compass"></i></div>
                    <div class="tretaresia-rpg-panel-heading"><span class="tretaresia-rpg-kicker">${html(tr('Tretaresia Role-play'))}</span>
                        <h2 id="tretaresia-rpg-title">Tretaresia RPG</h2></div>
                    <div id="tretaresia-rpg-sync-state" class="tretaresia-sync-state" data-mode="ready">
                        <i class="fa-solid fa-circle"></i><span>${html(tr('Ready'))}</span></div>
                    ${continuityMenu()}
                    ${appearanceMenu()}
                    <button id="tretaresia-rpg-close" class="menu_button menu_button_icon" type="button" aria-label="Close">
                        <i class="fa-solid fa-xmark"></i></button>
                </header>
                <div class="tretaresia-app-layout">
                    <nav class="tretaresia-tab-list" aria-label="Tretaresia RPG sections">
                        ${tabButton('status', 'fa-solid fa-user', 'Status', true)}
                        ${tabButton('scene', 'fa-solid fa-cloud-sun', 'Scene')}
                        ${tabButton('inventory', 'fa-solid fa-box-open', 'Inventory')}
                        ${tabButton('skills', 'fa-solid fa-layer-group', 'Skills')}
                        ${tabButton('techniques', 'fa-solid fa-fire-flame-curved', 'Powers')}
                        ${tabButton('quests', 'fa-solid fa-scroll', 'Quests')}
                        ${tabButton('rank', 'fa-solid fa-medal', 'Rank')}
                        ${tabButton('map', 'fa-solid fa-map', 'World Map')}
                        ${tabButton('npcs', 'fa-solid fa-users', 'NPCs')}
                        ${tabButton('mail', 'fa-solid fa-envelope', 'Mailbox')}
                        ${tabButton('music', 'fa-solid fa-music', 'Music')}
                    </nav>
                    <main class="tretaresia-rpg-panel-body">
                        ${['status', 'scene', 'inventory', 'skills', 'techniques', 'quests', 'rank', 'map', 'npcs', 'mail', 'music'].map((id, index) =>
                            `<section class="tretaresia-tab-panel${index === 0 ? ' is-active' : ''}" data-panel="${id}"
                                ${index ? 'hidden' : ''}></section>`).join('')}
                    </main>
                </div>
                <footer class="tretaresia-rpg-panel-footer">
                    <span id="tretaresia-context-label"><i class="fa-solid fa-link"></i> ${html(tr('Waiting for chat'))}</span>
                    <button id="tretaresia-sync-now" class="tretaresia-text-button" type="button">
                        <i class="fa-solid fa-rotate"></i> ${html(tr('Sync latest turn'))}</button>
                </footer>
            </div>
            <div id="tretaresia-portrait-editor" class="tretaresia-submodal" hidden></div>
            <div id="tretaresia-letter-reader" class="tretaresia-submodal" hidden></div>
            <input id="tretaresia-npc-avatar-input" type="file" accept="image/*" hidden>
            <input id="tretaresia-state-import" type="file" accept="application/json,.json" hidden>
        </section>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.tretaresia-rpg-backdrop')?.addEventListener('click', closeInterface);
    overlay.querySelector('#tretaresia-rpg-close')?.addEventListener('click', closeInterface);
    overlay.querySelector('#tretaresia-sync-now')?.addEventListener('click', () => queueAnalyze({ manual: true }));
    overlay.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => activateTab(button.dataset.tab)));
    overlay.addEventListener('submit', onSubmit);
    overlay.addEventListener('click', onPanelClick);
    overlay.addEventListener('change', onPanelChange);
    overlay.addEventListener('input', onInterfaceSettingChange);
    overlay.addEventListener('change', onInterfaceSettingChange);
    applyAppearance();
    syncActivityIndicator();
}

function rebuildInterface() {
    const previous = document.getElementById('tretaresia-rpg-overlay');
    const wasOpen = previous?.classList.contains('is-open');
    previous?.remove();
    buildInterface();
    renderAll();
    if (wasOpen) {
        const overlay = document.getElementById('tretaresia-rpg-overlay');
        overlay?.classList.add('is-open', 'is-ready');
        overlay?.setAttribute('aria-hidden', 'false');
    }
}

function onInterfaceSettingChange(event) {
    const portraitControl = event.target.closest('[data-portrait-control]');
    if (portraitControl instanceof HTMLInputElement) {
        const device = portraitControl.closest('.tretaresia-portrait-device');
        const preview = device?.querySelector('img');
        const output = portraitControl.closest('label')?.querySelector('output');
        const property = portraitControl.dataset.portraitControl;
        if (preview) preview.style.setProperty(`--preview-${property}`, property === 'zoom' ? portraitControl.value : `${portraitControl.value}%`);
        if (output) output.textContent = property === 'zoom' ? `${Number(portraitControl.value).toFixed(2)}×` : `${Math.round(Number(portraitControl.value))}%`;
        return;
    }
    const proficiency = event.target.closest('.tretaresia-proficiency-card input[type="range"]');
    if (proficiency instanceof HTMLInputElement) {
        const card = proficiency.closest('.tretaresia-proficiency-card');
        const fill = card?.querySelector('.tretaresia-proficiency-track i');
        const score = card?.querySelector('.tretaresia-proficiency-orbit b');
        const rankCopy = card?.querySelector('.tretaresia-proficiency-rank strong');
        const rank = tr(proficiencyRank(proficiency.value));
        if (fill) fill.style.width = `${proficiency.value}%`;
        if (score) score.innerHTML = `${proficiency.value}<small>%</small>`;
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
    SillyTavern.getContext().saveSettingsDebounced();
    if (key === 'autoContinuity') {
        if (settings.autoContinuity) writeContinuitySnapshot(getState());
        else {
            const storageKey = continuityStorageKey();
            if (storageKey) localStorage.removeItem(storageKey);
        }
    }
    if (key === 'language' && event.type === 'change') rebuildInterface();
    else {
        applyAppearance();
        if (key === 'interactionMode') updateActionModeHelp();
        if (key === 'activityIndicator') syncActivityIndicator();
    }
}

function activateTab(id) {
    const overlay = document.getElementById('tretaresia-rpg-overlay');
    if (!overlay) return;
    const next = overlay.querySelector(`[data-panel="${id}"]`);
    const current = overlay.querySelector('[data-panel].is-active');
    if (!next || next === current) return;
    const transition = ++tabTransitionToken;
    overlay?.querySelectorAll('[data-tab]').forEach(button => {
        const active = button.dataset.tab === id;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
    });
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
        if (id === 'map') requestAnimationFrame(() => scheduleMapDraw(next, getState()));
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
    return `<article class="tretaresia-vital tretaresia-vital-${tone}">
        <div class="tretaresia-vital-line"><span><i class="${icon}"></i>${html(tr(label))}</span><strong>${value.current} <em>/ ${value.max}</em></strong></div>
        <div class="tretaresia-vital-track" role="meter" aria-valuenow="${value.current}" aria-valuemax="${value.max}" aria-label="${html(tr(label))}">
            <span style="width:${Math.min(100, percent)}%"></span><i style="left:${Math.min(100, percent)}%"></i>
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
            <span class="tretaresia-rank-seal"><small>${html(tr('Guild rank'))}</small>${html(state.progression.adventurerRank)}</span></section>
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

function renderScene(panel, state) {
    if (!panel) return;
    const phaseIndex = Math.max(0, DAY_PHASES.indexOf(state.worldClock.phase));
    const exactLocation = state.location.detail || state.location.place || state.location.region;
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
            <article><i class="fa-solid fa-location-dot"></i><span>${html(tr('Current place'))}</span><strong>${html(state.location.place)}</strong><small>${html(exactLocation)}</small></article>
            <article><i class="fa-solid fa-street-view"></i><span>${html(tr('Scene position'))}</span><strong>${html(state.scene.position)}</strong><small>${html(tr(state.location.zoneType))}</small></article>
        </section>
        ${state.travel.status !== 'Idle' ? `<section class="tretaresia-card tretaresia-travel-status" data-status="${html(state.travel.status.toLowerCase())}">
            <div class="tretaresia-card-title"><span>${html(tr('Journey'))}</span><em><i class="fa-solid fa-route"></i> ${html(state.travel.status)}</em></div>
            <dl class="tretaresia-fact-list"><div><dt>${html(tr('Origin'))}</dt><dd>${html(state.travel.origin || 'Unknown')}</dd></div>
            <div><dt>${html(tr('Destination'))}</dt><dd>${html(state.travel.destination || 'Unknown')}</dd></div>
            <div><dt>${html(tr('Travel route'))}</dt><dd>${html(state.travel.route)}</dd></div>
            <div><dt>${html(tr('Remaining travel'))}</dt><dd>${state.travel.remainingDays} / ${state.travel.totalDays} ${html(tr('days'))}</dd></div></dl>
            ${state.travel.notes ? `<p>${html(state.travel.notes)}</p>` : ''}</section>` : ''}
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
                <button type="button" data-action="use-item" data-id="${html(entry.id)}" title="${html(tr('Use in role-play'))}"><i class="fa-solid fa-comment-dots"></i></button>
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
    panel.innerHTML = `${heading('Skill Storage', `${state.skills.length} ${tr('Skills').toLowerCase()}`, 'fa-solid fa-layer-group')}
        <section class="tretaresia-skill-storage"><div class="tretaresia-section-label"><i class="fa-solid fa-box-archive"></i><span>${html(tr('All acquired user skills'))}</span></div>
            <div class="tretaresia-skill-storage-grid">${state.skills.length ? state.skills.map(entry => `<article class="tretaresia-skill-card">
                <div class="tretaresia-skill-rank"><strong>${html(tr(entry.rank))}</strong><small>${html(tr('Proficiency rank'))}</small></div>
                <div><span>${html(entry.type)}</span><h4>${html(entry.name)}</h4><p>${html(entry.description || tr('No description'))}</p></div>
                <button type="button" data-action="delete-skill" data-id="${html(entry.id)}" title="${html(tr('Remove'))}"><i class="fa-solid fa-trash"></i></button></article>`).join('') : empty('Skills learned during role-play will appear here.')}</div>
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

function renderQuests(panel, state) {
    if (!panel) return;
    const activeCount = state.quests.filter(entry => entry.status === 'Active').length;
    const offeredCount = state.quests.filter(entry => entry.status === 'Offered').length;
    panel.innerHTML = `${heading('Mission & Quest Log', `${activeCount} active · ${offeredCount} offered`, 'fa-solid fa-scroll')}
        <div class="tretaresia-quest-list">${state.quests.length ? state.quests.map(entry => `
            <article class="tretaresia-quest-card" data-status="${html(entry.status.toLowerCase())}"><div>
                <span class="tretaresia-quest-status">${html(entry.status)} · ${html(entry.type)}${entry.type === 'Dungeon' ? ` ${html(entry.dungeonRank)}` : ''}</span><h4>${html(entry.name)}</h4>
                <p>${html(entry.objective || tr('No objective recorded'))}</p>
                <div class="tretaresia-quest-progress"><span><i style="width:${entry.progress}%"></i></span><b>${entry.progress}%</b></div>
                ${(entry.giver || entry.source) ? `<small><i class="fa-solid fa-user-tag"></i> ${html(entry.giver || tr('Unknown giver'))}${entry.source ? ` · ${html(entry.source)}` : ''}</small>` : ''}
                ${entry.reward ? `<small><i class="fa-solid fa-gift"></i> ${html(tr('Reward'))}: ${html(entry.reward)}</small>` : ''}
                ${entry.receivedAt ? `<small><i class="fa-solid fa-clock"></i> ${html(tr('Received'))}: ${html(formatDate(entry.receivedAt))}</small>` : ''}</div>
                <div class="tretaresia-card-actions"><button type="button" data-action="pursue-quest" data-id="${html(entry.id)}" title="${html(tr('Pursue in role-play'))}"><i class="fa-solid fa-comment-dots"></i></button>
                <button type="button" data-action="delete-quest" data-id="${html(entry.id)}"><i class="fa-solid fa-trash"></i></button></div></article>`).join('') : empty('No quests have been recorded yet.')}</div>
        <details class="tretaresia-editor"><summary><i class="fa-solid fa-plus"></i> ${html(tr('Add mission or quest'))}</summary>
            <form data-form="quest" class="tretaresia-form-grid">${input('Mission / quest name', 'name', '')}
                ${select('Type', 'type', ['Mission', 'Quest', 'Dungeon', 'Contract', 'Personal'], 'Quest')}${select('Dungeon rank', 'dungeonRank', DUNGEON_RANKS, 'Unranked')}
                ${select('Status', 'status', ['Offered', 'Active', 'Completed', 'Failed', 'On Hold'], 'Active')}
                ${input('Objective', 'objective', '')}${input('Reward', 'reward', '')}${input('Quest giver', 'giver', '')}${input('Source', 'source', 'Manual entry')}
                ${input('Progress', 'progress', 0, 'number', 'min="0" max="100"')}${input('Notes', 'notes', '')}
                <button class="tretaresia-primary-button tretaresia-form-submit" type="submit">${html(tr('Add to log'))}</button></form></details>`;
}

const rankRow = (label, value, icon) => `<article class="tretaresia-rank-row"><i class="${icon}"></i><span>${html(tr(label))}</span><strong>${html(tr(String(value)))}</strong></article>`;

function renderRank(panel, state) {
    if (!panel) return;
    const p = state.progression;
    panel.innerHTML = `${heading('Ranks & Progression', 'Guild and mastery record', 'fa-solid fa-medal')}
        <div class="tretaresia-rank-layout"><article class="tretaresia-rank-hero"><span>${html(tr('Adventurer Rank'))}</span>
            <strong>${html(p.adventurerRank === 'Custom Rank' && p.customRankName ? p.customRankName : p.adventurerRank)}</strong><small>${html(tr('Recognized guild classification'))}</small></article>
            <div class="tretaresia-rank-stack">${rankRow('Power mastery', p.magicRank, 'fa-solid fa-fire-flame-curved')}
                ${rankRow('Combat mastery', p.swordRank, 'fa-solid fa-khanda')}${rankRow('Experience', `${p.experience} / ${p.experienceMax}`, 'fa-solid fa-star')}
                ${rankRow('Reputation', p.reputation, 'fa-solid fa-people-group')}${rankRow('Confirmed kills', p.kills, 'fa-solid fa-skull')}</div></div>
        <article class="tretaresia-card tretaresia-wallet" title="${html(p.currency.name)}"><div><span>${html(tr('High denomination'))}</span><strong>${p.currency.gold}</strong></div>
            <div><span>${html(tr('Standard denomination'))}</span><strong>${p.currency.silver}</strong></div><div><span>${html(tr('Fractional denomination'))}</span><strong>${p.currency.copper}</strong></div></article>
        <details class="tretaresia-editor"><summary><i class="fa-solid fa-pen"></i> ${html(tr('Edit progression'))}</summary>
            <form data-form="rank" class="tretaresia-form-grid">${select('Adventurer rank', 'adventurerRank', RANKS, p.adventurerRank)}${input('Custom rank name', 'customRankName', p.customRankName)}
                ${select('Power mastery', 'magicRank', MASTERY, p.magicRank)}${select('Combat mastery', 'swordRank', MASTERY, p.swordRank)}
                ${input('Experience', 'experience', p.experience, 'number', 'min="0"')}${input('EXP to next level', 'experienceMax', p.experienceMax, 'number', 'min="1"')}
                ${input('Reputation', 'reputation', p.reputation, 'number')}${input('Confirmed kills', 'kills', p.kills, 'number', 'min="0"')}
                ${input('Currency / region', 'currencyName', p.currency.name)}${input('High denomination', 'gold', p.currency.gold, 'number', 'min="0"')}${input('Standard denomination', 'silver', p.currency.silver, 'number', 'min="0"')}
                ${input('Fractional denomination', 'copper', p.currency.copper, 'number', 'min="0"')}
                <button class="tretaresia-primary-button tretaresia-form-submit" type="submit">${html(tr('Save progression'))}</button></form></details>`;
}

function renderMap(panel, state) {
    if (!panel) return;
    const current = currentMapPoint(state);
    if (!mapLocation(mapSelectionId) && !mapDraftPoint) mapSelectionId = current.id;
    const selectedLocation = mapLocation(mapSelectionId);
    const selected = mapDraftPoint ? {
        id: '__coordinates__', name: mapDraftPoint.name || 'Uncharted coordinate', x: mapDraftPoint.x, y: mapDraftPoint.y,
        continent: mapDraftPoint.continent || 'Open Ocean', region: mapDraftPoint.region || 'Uncharted Reach',
        zone: mapDraftPoint.zone || 'Unknown Zone', kind: 'coordinate', tier: 0,
    } : selectedLocation || current;
    const discovered = new Set(state.location.discovered);
    const pinIds = new Set(state.location.pins.map(pin => pin.locationId));
    const exactSelected = selected.id === '__coordinates__';
    const selectedRecorded = exactSelected || discovered.has(selected.name);
    const selectedPinned = exactSelected
        ? state.location.pins.some(pin => pin.x !== null && Math.hypot(pin.x - selected.x, pin.y - selected.y) < 12)
        : pinIds.has(selected.id);
    panel.innerHTML = `${heading('Tretaresia World Atlas', `${state.location.continent} · ${state.location.region}`, 'fa-solid fa-earth-asia')}
        <div class="tretaresia-map-layout"><div class="tretaresia-map-frame"><div class="tretaresia-map-toolbar" aria-label="Map controls">
            <button type="button" data-action="map-zoom-in" title="Zoom in"><i class="fa-solid fa-plus"></i></button>
            <button type="button" data-action="map-zoom-out" title="Zoom out"><i class="fa-solid fa-minus"></i></button>
            <button type="button" data-action="map-center" title="Center current location"><i class="fa-solid fa-crosshairs"></i></button>
            <button type="button" data-action="map-reset" title="Show whole world"><i class="fa-solid fa-expand"></i></button></div>
            <div class="tretaresia-map-lod"><i class="fa-solid fa-layer-group"></i><span data-map-lod>World overview</span><b data-map-zoom>${Math.round(mapView.scale * 100)}%</b></div>
            <button class="tretaresia-world-compass" type="button" data-action="map-compass-north" title="Center your location on the north-up world map" aria-label="World compass, current heading ${Math.round(current.heading)} degrees">
                <span class="north">N</span><span class="east">E</span><span class="south">S</span><span class="west">W</span>
                <i class="tretaresia-compass-needle" style="transform:rotate(${current.heading}deg)"></i><em>${Math.round(current.heading)}°</em></button>
            <canvas class="tretaresia-world-map" role="img" aria-label="Interactive tiled map of Tretaresia; click anywhere to select exact coordinates"></canvas>
            <div class="tretaresia-map-legend"><span><i class="current"></i>${html(tr('Current'))}</span><span><i class="known"></i>${html(tr('Discovered'))}</span><span><i class="marked"></i>${html(tr('Marked'))}</span><small>Click anywhere to select · ${html(tr('Drag to pan · Pinch or scroll to zoom'))}</small></div></div>
            <aside class="tretaresia-map-sidebar"><article class="tretaresia-location-dossier"><span class="tretaresia-eyebrow">${html(tr('Selected location'))}</span><h4>${html(selected.name)}</h4>
                <p>${html(selected.continent)}</p><div class="tretaresia-zone-badge" data-zone="${html(selected.zone)}"><i class="fa-solid fa-shield"></i>${html(tr(selected.zone))}</div>
                <dl><div><dt>${html(tr('Region'))}</dt><dd>${html(selected.region || LOCATION_REGIONS[selected.name] || selected.name)}</dd></div>
                <div><dt>World coordinates</dt><dd>${coordinatesLabel(selected.x, selected.y)}</dd></div>
                <div><dt>${html(tr('Discovery'))}</dt><dd>${html(tr(selectedRecorded ? 'Recorded' : 'Unexplored'))}</dd></div>
                <div><dt>${html(tr('Marker'))}</dt><dd>${html(tr(selectedPinned ? 'Pinned' : 'None'))}</dd></div></dl>
                <p class="tretaresia-exact-position"><i class="fa-solid fa-location-crosshairs"></i><span><b>Your exact location</b>${html(current.name)} · ${coordinatesLabel(current.x, current.y)} · ${Math.round(current.heading)}°</span></p></article>
                <form data-form="travel" class="tretaresia-travel-form"><label class="tretaresia-field"><span>${html(tr('Destination'))}</span><select name="destination">
                    ${exactSelected ? `<option value="__coordinates__" selected>${html(selected.name)} (${coordinatesLabel(selected.x, selected.y)})</option>` : ''}
                    ${Object.entries(WORLD).map(([continent]) => `<optgroup label="${html(continent)}">${WORLD_LOCATIONS.filter(location => location.continent === continent).map(location =>
                        `<option value="${location.id}"${location.id === selected.id ? ' selected' : ''}>${html(location.name)}</option>`).join('')}</optgroup>`).join('')}</select></label>
                    ${input('Exact place / scene', 'place', selected.name)}${input('Location detail', 'detail', state.location.detail)}
                    ${select('Travel route', 'route', ['Road', 'Caravan', 'Sea', 'Off-road', 'Unknown'], 'Road')}${input('Estimated travel days', 'totalDays', 7, 'number', 'min="1" max="999999"')}
                    <input type="hidden" name="mapX" value="${selected.x}"><input type="hidden" name="mapY" value="${selected.y}"><input type="hidden" name="continent" value="${html(selected.continent)}"><input type="hidden" name="region" value="${html(selected.region)}">
                    <button class="tretaresia-primary-button" type="submit"><i class="fa-solid fa-route"></i> ${html(tr('Begin journey'))}</button></form>
                <form data-form="map-pin" class="tretaresia-pin-form">${input('Marker label', 'label', selected.name)}${input('Marker note', 'note', '')}
                    <input type="hidden" name="locationId" value="${exactSelected ? '' : selected.id}"><input type="hidden" name="mapX" value="${selected.x}"><input type="hidden" name="mapY" value="${selected.y}">
                    <input type="hidden" name="continent" value="${html(selected.continent)}"><input type="hidden" name="region" value="${html(selected.region)}"><button class="tretaresia-secondary-button" type="submit"><i class="fa-solid fa-map-pin"></i> ${html(tr('Mark location'))}</button></form>
                ${state.location.pins.length ? `<div class="tretaresia-pin-list">${state.location.pins.map(pin => `<button type="button" data-action="select-pin" data-pin-id="${html(pin.id)}" data-location-id="${html(pin.locationId)}">
                    <i class="fa-solid fa-map-pin"></i><span>${html(pin.label)}<small>${html(pin.note || mapLocation(pin.locationId)?.name || coordinatesLabel(pin.x, pin.y))}</small></span></button>`).join('')}</div>` : ''}</aside></div>`;
    setupMapInteractions(panel);
    scheduleMapDraw(panel, state);
}

function mapLod() {
    return mapView.scale < 1.35 ? 0 : mapView.scale < 2.4 ? 1 : 2;
}

function mapVisibleBounds() {
    const margin = 150 / mapView.scale;
    return {
        left: -mapView.x / mapView.scale - margin, top: -mapView.y / mapView.scale - margin,
        right: (WORLD_MAP_WIDTH - mapView.x) / mapView.scale + margin,
        bottom: (WORLD_MAP_HEIGHT - mapView.y) / mapView.scale + margin,
    };
}

function worldTileLevel() {
    if (mapView.scale < .82) return WORLD_TILE_LEVELS[0];
    if (mapView.scale < 1.35) return WORLD_TILE_LEVELS[1];
    if (mapView.scale < 2.55) return WORLD_TILE_LEVELS[2];
    return WORLD_TILE_LEVELS[3];
}

function worldTile(level, column, row) {
    const key = `${level.z}/${column}-${row}`;
    const cached = mapTileCache.get(key);
    if (cached) return cached;
    const record = { status: 'loading', image: new Image() };
    record.image.decoding = 'async';
    record.image.onload = () => { record.status = 'ready'; scheduleMapDraw(); };
    record.image.onerror = () => { record.status = 'error'; };
    record.image.src = `${WORLD_TILE_ROOT}/${level.z}/${column}-${row}.webp`;
    mapTileCache.set(key, record);
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
    const canvas = panel?.querySelector('.tretaresia-world-map');
    if (!(canvas instanceof HTMLCanvasElement)) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const pixelRatio = Math.min(1.5, globalThis.devicePixelRatio || 1);
    const targetWidth = Math.max(1, Math.round(rect.width * pixelRatio));
    const targetHeight = Math.max(1, Math.round(rect.height * pixelRatio));
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
    }
    const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!context) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#102f3b';
    context.fillRect(0, 0, canvas.width, canvas.height);

    const transformX = canvas.width / WORLD_MAP_WIDTH;
    const transformY = canvas.height / WORLD_MAP_HEIGHT;
    context.setTransform(transformX * mapView.scale, 0, 0, transformY * mapView.scale, transformX * mapView.x, transformY * mapView.y);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    const fallback = worldTile(WORLD_TILE_LEVELS[0], 0, 0);
    if (fallback.status === 'ready') context.drawImage(fallback.image, 0, 0, WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT);

    const level = worldTileLevel();
    const lod = mapLod();
    const bounds = mapVisibleBounds();
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
            const tile = worldTile(level, column, row);
            if (tile.status !== 'ready') continue;
            const worldX = column * WORLD_TILE_SIZE / level.width * WORLD_MAP_WIDTH;
            const worldY = row * WORLD_TILE_SIZE / level.height * WORLD_MAP_HEIGHT;
            const worldWidth = tile.image.naturalWidth / level.width * WORLD_MAP_WIDTH;
            const worldHeight = tile.image.naturalHeight / level.height * WORLD_MAP_HEIGHT;
            context.drawImage(tile.image, worldX, worldY, worldWidth, worldHeight);
        }
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    const discovered = new Set(state.location.discovered);
    const pinIds = new Set(state.location.pins.map(pin => pin.locationId));
    const visible = WORLD_LOCATIONS.filter(location => (
        (location.tier <= lod || location.id === mapSelectionId || pinIds.has(location.id) || discovered.has(location.name))
        && location.x >= bounds.left && location.x <= bounds.right && location.y >= bounds.top && location.y <= bounds.bottom
    ));
    mapRenderedPoints = [];
    if (lod === 0) {
        for (const continent of WORLD_CONTINENTS) {
            const point = mapCanvasPoint(continent.label[0], continent.label[1], canvas.width, canvas.height);
            drawMapLabel(context, continent.name.toUpperCase(), point.x, point.y, { size: Math.max(9, canvas.width / 90), weight: 800, color: 'rgba(248,243,220,.78)', stroke: 'rgba(4,13,17,.72)' });
        }
    }
    for (const location of visible) {
        const point = mapCanvasPoint(location.x, location.y, canvas.width, canvas.height);
        if (point.x < -80 || point.y < -40 || point.x > canvas.width + 80 || point.y > canvas.height + 40) continue;
        const selected = location.id === mapSelectionId;
        const known = discovered.has(location.name);
        const pinned = pinIds.has(location.id);
        context.beginPath();
        context.arc(point.x, point.y, selected ? 9 : 6, 0, Math.PI * 2);
        context.fillStyle = selected ? '#ffd370' : pinned ? '#c58bd6' : known ? '#8fd8bd' : '#d7dfd4';
        context.fill();
        context.lineWidth = selected ? 3 : 2;
        context.strokeStyle = 'rgba(5,18,23,.9)';
        context.stroke();
        if (selected) {
            context.beginPath(); context.arc(point.x, point.y, 15, 0, Math.PI * 2);
            context.strokeStyle = 'rgba(255,211,112,.72)'; context.lineWidth = 2; context.stroke();
        }
        drawMapLabel(context, location.name, point.x, point.y + 17, { size: location.tier === 0 ? 12 : location.tier === 1 ? 10 : 9 });
        mapRenderedPoints.push({ type: 'location', id: location.id, x: point.x, y: point.y, radius: 22 });
    }
    for (const pin of state.location.pins) {
        const site = mapLocation(pin.locationId);
        const x = pin.x ?? site?.x;
        const y = pin.y ?? site?.y;
        if (!Number.isFinite(x) || !Number.isFinite(y) || x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) continue;
        const point = mapCanvasPoint(x, y, canvas.width, canvas.height);
        context.fillStyle = '#e0a85a'; context.strokeStyle = '#21150c'; context.lineWidth = 2;
        context.beginPath(); context.arc(point.x, point.y - 5, 7, 0, Math.PI * 2); context.fill(); context.stroke();
        context.beginPath(); context.moveTo(point.x - 5, point.y); context.lineTo(point.x, point.y + 11); context.lineTo(point.x + 5, point.y); context.fill();
        if (!site || lod > 0) drawMapLabel(context, pin.label, point.x, point.y + 24, { size: 10, color: '#ffe0a5' });
        mapRenderedPoints.push({ type: 'pin', id: pin.id, x: point.x, y: point.y, radius: 22 });
    }
    if (mapDraftPoint) {
        const point = mapCanvasPoint(mapDraftPoint.x, mapDraftPoint.y, canvas.width, canvas.height);
        context.strokeStyle = '#ffd370'; context.lineWidth = 2; context.setLineDash([5, 4]);
        context.beginPath(); context.arc(point.x, point.y, 15, 0, Math.PI * 2); context.moveTo(point.x - 23, point.y); context.lineTo(point.x + 23, point.y); context.moveTo(point.x, point.y - 23); context.lineTo(point.x, point.y + 23); context.stroke(); context.setLineDash([]);
        drawMapLabel(context, mapDraftPoint.name || 'Selected coordinate', point.x, point.y + 29, { size: 10, color: '#ffd370' });
    }
    const current = currentMapPoint(state);
    const player = mapCanvasPoint(current.x, current.y, canvas.width, canvas.height);
    context.beginPath(); context.arc(player.x, player.y, 13, 0, Math.PI * 2); context.fillStyle = 'rgba(5,35,40,.88)'; context.fill(); context.strokeStyle = '#71f4dd'; context.lineWidth = 3; context.stroke();
    context.beginPath(); context.arc(player.x, player.y, 5, 0, Math.PI * 2); context.fillStyle = '#eafffa'; context.fill();
    const heading = (current.heading - 90) * Math.PI / 180;
    context.beginPath(); context.moveTo(player.x + Math.cos(heading) * 24, player.y + Math.sin(heading) * 24); context.lineTo(player.x + Math.cos(heading + 2.5) * 10, player.y + Math.sin(heading + 2.5) * 10); context.lineTo(player.x + Math.cos(heading - 2.5) * 10, player.y + Math.sin(heading - 2.5) * 10); context.closePath(); context.fillStyle = '#71f4dd'; context.fill();
    drawMapLabel(context, `YOU · ${current.name}`, player.x, player.y + 25, { size: 11, color: '#dffff9' });
    const lodText = panel.querySelector('[data-map-lod]');
    const zoomText = panel.querySelector('[data-map-zoom]');
    if (lodText) lodText.textContent = ['World overview', 'Regional detail', 'Local detail'][lod];
    if (zoomText) zoomText.textContent = `${Math.round(mapView.scale * 100)}% · ${visible.length} places · tiles ${level.z}`;
}

function scheduleMapDraw(panel, state) {
    cancelAnimationFrame(mapDrawFrame);
    mapDrawFrame = requestAnimationFrame(() => drawWorldMap(panel, state));
}

function scheduleMapDetailRender() {
    scheduleMapDraw();
}

const textareaField = (label, name, value, rows = 4, extra = '') =>
    `<label class="tretaresia-field tretaresia-field-wide"><span>${html(tr(label))}</span><textarea name="${name}" rows="${rows}" ${extra}>${html(value)}</textarea></label>`;

function npcPortraitStyle(entry) {
    const frame = entry.portraitView;
    return `--portrait-desktop-x:${frame.desktop.x}%;--portrait-desktop-y:${frame.desktop.y}%;--portrait-desktop-zoom:${frame.desktop.zoom};--portrait-mobile-x:${frame.mobile.x}%;--portrait-mobile-y:${frame.mobile.y}%;--portrait-mobile-zoom:${frame.mobile.zoom}`;
}

function npcPortraitSlot(entry, className = 'tretaresia-npc-thumb') {
    return `<span class="${className}${entry.hasPortrait ? ' has-photo' : ''}" data-npc-portrait="${html(entry.id)}" style="${npcPortraitStyle(entry)}">
        <span class="tretaresia-npc-initial">${html(entry.name.charAt(0).toUpperCase() || '?')}</span></span>`;
}

function npcMeterView(label, value, tone = 'accent') {
    return `<article class="tretaresia-npc-meter" data-tone="${tone}"><span><b>${html(tr(label))}</b><output>${value}%</output></span>
        <div><i style="width:${value}%"></i></div></article>`;
}

function renderNpcs(panel, state) {
    if (!panel) return;
    if (!state.npcs.some(entry => entry.id === selectedNpcId)) selectedNpcId = state.npcs[0]?.id || null;
    const selected = state.npcs.find(entry => entry.id === selectedNpcId);
    const linkedContact = selected ? state.contacts.find(entry => entry.id === selected.contactId || entry.npcId === selected.id) : null;
    const list = state.npcs.length ? state.npcs.map(entry => `<article class="tretaresia-npc-list-row${entry.id === selectedNpcId ? ' is-active' : ''}">
        <button type="button" data-action="select-npc" data-id="${html(entry.id)}">${npcPortraitSlot(entry)}<span><strong>${html(entry.name)}</strong>
        <em>${html(entry.title || entry.faction || tr('No description'))}</em><small>${html(entry.relationship)} · ${html(entry.location)}</small></span></button>
        <button type="button" data-action="delete-npc" data-id="${html(entry.id)}" title="${html(tr('Remove'))}"><i class="fa-solid fa-trash"></i></button></article>`).join('')
        : `<div class="tretaresia-mail-empty large"><i class="fa-solid fa-users-viewfinder"></i><p>${getSettings().language === 'th' ? 'NPC ที่ AI ตรวจพบหรือคุณเพิ่มเองจะปรากฏที่นี่' : 'NPCs discovered by the AI or added manually will appear here.'}</p></div>`;
    const detail = selected ? renderNpcDossier(selected, linkedContact) : `<section class="tretaresia-npc-empty-dossier"><i class="fa-solid fa-address-card"></i><p>${getSettings().language === 'th' ? 'เพิ่ม NPC คนแรกเพื่อเริ่มสร้างสารบบ' : 'Add the first NPC to begin the codex.'}</p></section>`;
    panel.innerHTML = `${heading('NPC Codex', `${state.npcs.length} ${tr('NPCs').toLowerCase()}`, 'fa-solid fa-users')}
        <div class="tretaresia-npc-layout"><aside class="tretaresia-npc-index"><div class="tretaresia-section-label"><i class="fa-solid fa-list"></i><span>${html(tr('NPCs'))}</span></div>
            <div class="tretaresia-npc-list">${list}</div><details class="tretaresia-editor tretaresia-npc-add"><summary><i class="fa-solid fa-user-plus"></i> ${html(tr('Add NPC'))}</summary>
            <form data-form="npc-new" class="tretaresia-form-grid">${input('Name', 'name', '')}${input('Title', 'title', '')}${input('Faction', 'faction', '')}${input('Relationship', 'relationship', 'Acquaintance')}
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
    const abilities = entry.abilities.length ? entry.abilities.map(ability => `<article class="tretaresia-npc-ability"><div><span>${html(ability.category)}</span><strong>${html(ability.name)}</strong>
        <p>${html(ability.description || tr('No description'))}</p></div><div class="tretaresia-npc-ability-rank"><b>${html(ability.level)}</b><span><i style="width:${ability.proficiency}%"></i></span><small>${ability.proficiency}%</small></div>
        <button type="button" data-action="delete-npc-ability" data-id="${html(ability.id)}" data-npc-id="${html(entry.id)}"><i class="fa-solid fa-trash"></i></button></article>`).join('') : empty('Skills learned during role-play will appear here.');
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
    if (!store) return;
    const nodes = [...root.querySelectorAll('[data-npc-portrait]')];
    await Promise.all(nodes.map(async node => {
        const entry = state.npcs.find(value => value.id === node.dataset.npcPortrait);
        if (!entry?.hasPortrait) return;
        try {
            const blob = await store.getItem(npcPortraitStorageKey(entry.id));
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
        case 'scene':
            {
            const knownPlace = WORLD_LOCATIONS.find(entry => entry.name === values.place) || WORLD_LOCATIONS.find(entry => entry.name === values.region);
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
        case 'npc-new': {
            const nextNpc = npcProfile(values);
            if (!nextNpc) return notify('warning', getSettings().language === 'th' ? 'กรุณาใส่ชื่อ NPC' : 'Enter the NPC name first.');
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
            const nextNpc = npcProfile({ ...previous, ...values, stats: {
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
        case 'rank':
            state.progression = {
                ...state.progression, adventurerRank: values.adventurerRank, customRankName: values.customRankName, magicRank: values.magicRank,
                swordRank: values.swordRank, experience: values.experience, experienceMax: values.experienceMax, reputation: values.reputation, kills: values.kills,
                currency: { name: values.currencyName, gold: values.gold, silver: values.silver, copper: values.copper },
            };
            await persistState(state);
            notify('success', 'Progression saved.');
            break;
        case 'travel': {
            const namedDestination = mapLocation(values.destination);
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
            state.travel = {
                status: 'Traveling', origin, destination: values.place || destination.name, route: values.route || 'Road',
                totalDays, remainingDays: totalDays, notes: values.detail || '',
            };
            state.journal.push({ id: uid(), text: `Began a ${totalDays}-day journey from ${origin} to ${destination.name}.`, at: new Date().toISOString() });
            if (await persistState(state, 'travel')) {
                const exact = values.place && values.place !== destination.name ? values.place : '';
                await sendChatAction(getSettings().language === 'th'
                    ? `*ตัวผมเริ่มออกเดินทางจาก ${origin} ไปยัง ${destination.name}${exact ? ` โดยมุ่งหน้าไปที่ ${exact}` : ''} ผ่านเส้นทางแบบ ${values.route} การเดินทางคาดว่าจะใช้เวลาประมาณ ${totalDays} วัน โปรดดำเนินเหตุการณ์ระหว่างทางตามจริงโดยยังไม่ข้ามไปถึงปลายทางทันที*`
                    : `*I begin traveling from ${origin} toward ${destination.name}${exact ? `, aiming for ${exact}` : ''} by ${values.route}. The journey is expected to take about ${totalDays} days. Play out meaningful road events and passage of time; do not teleport me to the destination.*`);
            }
            break;
        }
        case 'map-pin': {
            const destination = mapLocation(values.locationId);
            const x = number(values.mapX, destination?.x || 0, 0, WORLD_MAP_WIDTH);
            const y = number(values.mapY, destination?.y || 0, 0, WORLD_MAP_HEIGHT);
            const existing = destination
                ? state.location.pins.find(pin => pin.locationId === destination.id)
                : state.location.pins.find(pin => pin.x !== null && Math.hypot(pin.x - x, pin.y - y) < 8);
            const nextPin = {
                id: existing?.id || uid(), locationId: destination?.id || '', x, y,
                continent: values.continent || destination?.continent || 'Open Ocean', region: values.region || destination?.region || 'Uncharted Reach',
                label: values.label || destination?.name || 'Marked coordinate', note: values.note,
            };
            state.location.pins = [...state.location.pins.filter(pin => pin.id !== existing?.id), nextPin];
            if (destination) state.location.discovered = [...new Set([...state.location.discovered, destination.name])];
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
        case 'map-zoom-in':
            setMapZoom(mapView.scale * 1.25);
            break;
        case 'map-zoom-out':
            setMapZoom(mapView.scale / 1.25);
            break;
        case 'map-reset':
            Object.assign(mapView, { scale: .78, x: 264, y: 154 });
            updateMapTransform();
            break;
        case 'map-center': {
            const location = currentMapPoint(state);
            mapView.scale = 2.45;
            mapView.x = WORLD_MAP_WIDTH / 2 - location.x * mapView.scale;
            mapView.y = WORLD_MAP_HEIGHT / 2 - location.y * mapView.scale;
            updateMapTransform();
            break;
        }
        case 'map-compass-north': {
            const location = currentMapPoint(state);
            mapView.scale = Math.max(mapView.scale, 2.45);
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
            if (pin.locationId && mapLocation(pin.locationId)) {
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
        case 'delete-quest':
            state.quests = state.quests.filter(entry => entry.id !== id);
            await persistState(state);
            break;
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
        case 'use-item': {
            const entry = state.inventory.find(value => value.id === id);
            if (entry) await sendChatAction(getSettings().language === 'th'
                ? `ผู้เล่นใช้ ${entry.name} จากคลังสิ่งของ ตอบสนองต่อการใช้งานตามบริบทของฉากและยืนยันผลลัพธ์ในเนื้อเรื่อง`
                : `The user used ${entry.name} from inventory. Resolve its use naturally in the current scene and confirm the outcome in the story.`, 'hidden');
            break;
        }
        case 'pursue-quest': {
            const entry = state.quests.find(value => value.id === id);
            if (entry) await sendChatAction(getSettings().language === 'th'
                ? `*ตัวผมมุ่งทำภารกิจ “${entry.name}” โดยมีเป้าหมายคือ ${entry.objective || 'ดำเนินภารกิจต่อ'}*`
                : `*I focus on the quest "${entry.name}" and work toward this objective: ${entry.objective || 'continue the quest'}.*`);
            break;
        }
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
    const camera = document.querySelector('.tretaresia-map-camera');
    if (camera) camera.setAttribute('transform', `translate(${mapView.x} ${mapView.y}) scale(${mapView.scale})`);
    scheduleMapDetailRender();
}

function setMapZoom(scale, anchorX = WORLD_MAP_WIDTH / 2, anchorY = WORLD_MAP_HEIGHT / 2) {
    const next = Math.min(7, Math.max(.72, scale));
    const ratio = next / mapView.scale;
    mapView.x = anchorX - (anchorX - mapView.x) * ratio;
    mapView.y = anchorY - (anchorY - mapView.y) * ratio;
    mapView.scale = next;
    updateMapTransform();
}

function setupMapInteractions(panel) {
    const svg = panel.querySelector('.tretaresia-world-map');
    if (!(svg instanceof HTMLCanvasElement)) return;
    mapResizeObserver?.disconnect();
    if (typeof ResizeObserver === 'function') {
        mapResizeObserver = new ResizeObserver(() => scheduleMapDraw(panel, getState()));
        mapResizeObserver.observe(svg);
    }
    const pointers = new Map();
    let previous = null;
    let pinchDistance = 0;
    let dragDistance = 0;
    let pointerStart = null;
    const mapPoint = event => {
        const rect = svg.getBoundingClientRect();
        const screenX = (event.clientX - rect.left) / rect.width * WORLD_MAP_WIDTH;
        const screenY = (event.clientY - rect.top) / rect.height * WORLD_MAP_HEIGHT;
        return { x: (screenX - mapView.x) / mapView.scale, y: (screenY - mapView.y) / mapView.scale, screenX, screenY };
    };
    svg.addEventListener('wheel', event => {
        event.preventDefault();
        const point = mapPoint(event);
        setMapZoom(mapView.scale * (event.deltaY < 0 ? 1.15 : .87), point.screenX, point.screenY);
    }, { passive: false });
    svg.addEventListener('pointerdown', event => {
        svg.setPointerCapture?.(event.pointerId);
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        previous = { x: event.clientX, y: event.clientY };
        pointerStart = { x: event.clientX, y: event.clientY, continentId: event.target.closest?.('[data-continent-id]')?.dataset.continentId || '' };
        dragDistance = 0;
        svg.classList.add('is-dragging');
    });
    svg.addEventListener('pointermove', event => {
        if (!pointers.has(event.pointerId)) return;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const points = [...pointers.values()];
        const rect = svg.getBoundingClientRect();
        if (points.length === 1 && previous) {
            const dx = event.clientX - previous.x;
            const dy = event.clientY - previous.y;
            dragDistance += Math.hypot(dx, dy);
            mapView.x += dx / rect.width * WORLD_MAP_WIDTH;
            mapView.y += dy / rect.height * WORLD_MAP_HEIGHT;
            previous = { x: event.clientX, y: event.clientY };
            updateMapTransform();
        } else if (points.length >= 2) {
            const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
            if (pinchDistance) setMapZoom(mapView.scale * distance / pinchDistance);
            pinchDistance = distance;
        }
    });
    const end = event => {
        const wasClick = pointers.size === 1 && dragDistance < 7 && pointerStart;
        pointers.delete(event.pointerId);
        previous = pointers.size === 1 ? [...pointers.values()][0] : null;
        pinchDistance = 0;
        if (!pointers.size) svg.classList.remove('is-dragging');
        if (wasClick) {
            const rect = svg.getBoundingClientRect();
            const hitX = (event.clientX - rect.left) / rect.width * svg.width;
            const hitY = (event.clientY - rect.top) / rect.height * svg.height;
            const hit = [...mapRenderedPoints].reverse().find(entry => Math.hypot(entry.x - hitX, entry.y - hitY) <= entry.radius * Math.min(1.5, globalThis.devicePixelRatio || 1));
            if (hit?.type === 'location') {
                mapDraftPoint = null;
                mapSelectionId = hit.id;
                renderMap(panel, getState());
                pointerStart = null;
                return;
            }
            if (hit?.type === 'pin') {
                const state = getState();
                const pin = state.location.pins.find(entry => entry.id === hit.id);
                if (pin?.locationId && mapLocation(pin.locationId)) {
                    mapDraftPoint = null;
                    mapSelectionId = pin.locationId;
                } else if (pin) {
                    const continent = continentAtPoint(pin.x, pin.y);
                    mapSelectionId = null;
                    mapDraftPoint = { x: pin.x, y: pin.y, continent: pin.continent || continent?.name || 'Open Ocean', region: pin.region || 'Marked Reach', zone: 'Unknown Zone', name: pin.label };
                }
                renderMap(panel, state);
                pointerStart = null;
                return;
            }
            const point = mapPoint(event);
            const x = number(point.x, 0, 0, WORLD_MAP_WIDTH);
            const y = number(point.y, 0, 0, WORLD_MAP_HEIGHT);
            const hintedId = pointerStart.continentId || '';
            const continent = continentAtPoint(x, y, hintedId);
            const nearest = nearestMapLocation(x, y, continent?.name || '');
            mapSelectionId = null;
            mapDraftPoint = {
                x, y, continent: continent?.name || 'Open Ocean',
                region: continent ? nearest.region : 'Uncharted Sea', zone: continent ? nearest.zone : 'Unknown Zone',
                name: continent && Math.hypot(nearest.x - x, nearest.y - y) < 42 ? nearest.name : continent ? `Uncharted ${nearest.region}` : 'Open-ocean coordinate',
            };
            renderMap(panel, getState());
        }
        pointerStart = null;
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
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
    send.click();
    if (hadDraft) setTimeout(() => { if (pendingComposerDraft) restoreComposerDraft(); }, 1200);
}

const SCALAR_PATCH_PATHS = new Set([
    'player.name', 'player.race', 'player.age', 'player.title', 'player.profession', 'player.guild', 'player.party', 'player.condition', 'player.level', 'player.powerType', 'player.originSkill',
    'player.hp.current', 'player.hp.max', 'player.mp.current', 'player.mp.max', 'player.stamina.current', 'player.stamina.max',
    'progression.adventurerRank', 'progression.customRankName', 'progression.magicRank', 'progression.swordRank', 'progression.experience',
    'progression.experienceMax', 'progression.reputation', 'progression.kills', 'progression.currency.gold', 'progression.currency.silver',
    'progression.currency.name', 'progression.currency.copper', 'worldClock.day', 'worldClock.dayName', 'worldClock.time', 'worldClock.phase', 'location.continent',
    'location.region', 'location.place', 'location.detail', 'location.zoneType', 'location.mapX', 'location.mapY', 'location.heading', 'scene.position', 'scene.weather', 'scene.temperature',
    'travel.status', 'travel.origin', 'travel.destination', 'travel.route', 'travel.totalDays', 'travel.remainingDays', 'travel.notes',
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
        else state.sceneMap.maps.push(next);
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

function applyPatchOperation(state, operation) {
    if (!Array.isArray(operation) || operation.length < 3) return false;
    const [verb, path, value] = operation;
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
        state.location.discovered = [...new Set([...state.location.discovered, text(value, '', 120)])].filter(Boolean);
        return true;
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
    if (!PATCH_COLLECTIONS.has(path)) return false;
    const collection = collectionForPatch(state, path);
    if (!Array.isArray(collection)) return false;
    if (verb === 'upsert' && value && typeof value === 'object') {
        const identity = patchIdentity(value);
        if (!identity && path !== 'letters') return false;
        const index = collection.findIndex(entry => matchesPatchIdentity(entry, value));
        const candidate = { ...(index >= 0 ? collection[index] : {}), ...value };
        if (!candidate.id) candidate.id = uid();
        if (path === 'npcs') candidate.updatedAt = new Date().toISOString();
        if (path === 'quests') {
            if (!candidate.receivedAt) candidate.receivedAt = new Date().toISOString();
            candidate.updatedAt = new Date().toISOString();
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
    } : { reason: '', category: '', label: '' };
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

function applyStatePatch(current, patch) {
    if (!patch || typeof patch !== 'object' || !Array.isArray(patch.ops)) throw new Error('State patch is missing an ops array.');
    const candidate = clone(current);
    const acceptedOps = [];
    for (const operation of patch.ops.slice(0, 75)) {
        if (applyPatchOperation(candidate, operation)) acceptedOps.push(operation);
    }
    const next = normalize(candidate, current);
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
    if (accepted && summary) next.journal = [...current.journal, { id: uid(), text: summary, at: new Date().toISOString() }].slice(-30);
    return { next, accepted, summary, notifications: derivePatchNotifications(current, next, acceptedOps, levelUps) };
}

function extractStatePatch(message) {
    const patches = [];
    let found = false;
    const strip = pattern => message.replace(pattern, (_match, payload) => {
        found = true;
        try {
            const parsed = parseJson(payload);
            if (parsed && typeof parsed === 'object') patches.push(parsed);
        } catch (error) {
            console.warn('[Tretaresia RPG] Ignored malformed inline state patch.', error);
        }
        return '';
    });
    let visible = strip(PATCH_COMMENT_PATTERN);
    visible = visible.replace(PATCH_TAG_PATTERN, (_match, payload) => {
        found = true;
        try {
            const parsed = parseJson(payload);
            if (parsed && typeof parsed === 'object') patches.push(parsed);
        } catch (error) {
            console.warn('[Tretaresia RPG] Ignored malformed inline state patch.', error);
        }
        return '';
    });
    const combined = patches.length ? {
        ops: patches.flatMap(patch => Array.isArray(patch.ops) ? patch.ops : []).slice(0, 75),
        summary: patches.map(patch => text(patch.summary, '', 300)).filter(Boolean).join('; ').slice(0, 300),
    } : null;
    return { visible: visible.trimEnd(), patch: combined, found };
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
    const extracted = extractStatePatch(message.mes);
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
    syncQueue = syncQueue.catch(() => undefined).then(() => analyzeChat(options));
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

function openInterface() {
    buildInterface();
    const overlay = document.getElementById('tretaresia-rpg-overlay');
    const panel = document.getElementById('tretaresia-rpg-panel');
    if (!overlay || !panel) return;
    clearTimeout(introTimer);
    previousFocusedElement = document.activeElement;
    renderAll();
    overlay.classList.remove('is-closing');
    overlay.classList.add('is-open', 'is-ready', 'is-opening');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('tretaresia-rpg-open');
    requestAnimationFrame(() => panel.focus());
    introTimer = setTimeout(() => overlay.classList.remove('is-opening'), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 720);
}

function closeInterface() {
    const overlay = document.getElementById('tretaresia-rpg-overlay');
    if (!overlay?.classList.contains('is-open')) return;
    clearTimeout(introTimer);
    overlay.classList.add('is-closing');
    overlay.classList.remove('is-open', 'is-ready', 'is-opening');
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
    if (document.getElementById('tretaresia-rpg-wand-launcher')) return true;
    const menu = document.getElementById('extensionsMenu');
    if (!menu) return false;
    const launcher = document.createElement('div');
    launcher.id = 'tretaresia-rpg-wand-launcher';
    launcher.className = 'list-group-item flex-container flexGap5 interactable';
    launcher.tabIndex = 0;
    launcher.setAttribute('role', 'button');
    launcher.title = 'Open Tretaresia RPG';
    launcher.innerHTML = '<i class="fa-solid fa-book-open"></i><span>Tretaresia RPG</span>';
    const activate = event => {
        if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openInterface();
    };
    launcher.addEventListener('click', activate);
    launcher.addEventListener('keydown', activate);
    menu.appendChild(launcher);
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
}

function bindChatEvents() {
    const { eventSource, eventTypes } = SillyTavern.getContext();
    eventSource.on(eventTypes.CHAT_CHANGED, async () => {
        cleanupAudio();
        clearNpcPortraitObjectUrls();
        closePortraitEditor();
        openedLetterId = null;
        selectedNpcId = null;
        const restored = await restoreContinuityForCurrentChat();
        if (!restored) {
            updatePrompt();
            renderAll();
        }
        if (SillyTavern.getContext().getCurrentChatId?.() && !hasUserReply()) {
            setSync('ready', tr('Waiting for first reply'), getSettings().language === 'th' ? 'First Message จะยังไม่ถูกอ่านหรือบันทึก' : 'The First Message is not read or stored by the extension.');
        } else setSync('ready', tr('Ready'), '', { show: false });
    });
    if (eventTypes.PERSONA_CHANGED) eventSource.on(eventTypes.PERSONA_CHANGED, () => renderAll());
    if (eventTypes.MESSAGE_SENT) eventSource.on(eventTypes.MESSAGE_SENT, () => {
        restoreComposerDraft();
        updatePrompt();
        const settings = getSettings();
        if (settings.autoTrack) setSync('working', tr('Waiting for AI'), settings.language === 'th' ? 'จะตรวจและอัปเดตจากคำตอบหลักโดยไม่เรียก AI เพิ่ม' : 'The normal reply will be checked with no extra AI request.');
        else setSync('disabled', tr('Tracking is off'), settings.language === 'th' ? 'คำตอบนี้จะไม่อัปเดต Tretaresia RPG อัตโนมัติ' : 'This reply will not update Tretaresia RPG automatically.');
    });
    eventSource.on(eventTypes.MESSAGE_RECEIVED, (messageId, generationType) => processAssistantPatch(messageId, generationType));
}

async function initialize() {
    if (initialized) return;
    initialized = true;
    try {
        getSettings();
        applyAppearance();
        buildActivityIndicator();
        buildInterface();
        await addSettingsDrawer();
        observeWandMenu();
        bindChatEvents();
        if (SillyTavern.getContext().chatMetadata?.[METADATA_KEY]) writeContinuitySnapshot(getState());
        else await restoreContinuityForCurrentChat();
        updatePrompt();
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') closeInterface();
        });
        console.info('[Tretaresia RPG] Role-play interface v0.4.0 loaded.');
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
