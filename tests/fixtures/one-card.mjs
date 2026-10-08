export function oneCardFixture() {
    return {spec:'chara_card_v3',spec_version:'3.0',data:{name:'One Card World',first_mes:'',extensions:{
        tretaresia_rpg_npcs:[{id:'cora',name:'Cora',npcScope:'character',met:false},{id:'lyra',name:'Lyra',npcScope:'character',met:false}],
        tretaresia_rpg_lore:[{id:'moon',title:'Moon Library',content:'The library is in Moon City.',enabled:true,always:true},{id:'history',title:'History',content:'The library preserves old maps.',enabled:true}],
        roleforge_character_pack:{format:'roleforge-character-pack',version:1,name:'One Card World',
            powerPreset:{mode:'custom',name:'Moon Powers',definitions:[{id:'magic',name:'Moon Magic',description:'A resource.',type:'resource',max:100,initial:0},{id:'contract',name:'Contract',description:'Explicit agreement.',type:'toggle',initial:false}]},
            forgePreset:{mode:'custom',name:'Moon Character Forge',origins:['Moon City'],standings:['Student'],skillCategories:['Magic'],masteryRanks:['Novice'],pathRanks:[],arsenalTypes:['Wand'],alignments:['Good'],rankLabel:'Campaign Rank',showRank:false},
            loreOptions:{mode:'relevant',budget:6000},initialState:{player:{name:'Starting player',hp:{current:37,max:100}},location:{place:'Moon Library',narrativeVersion:1},inventory:[],onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true}},
        },
    }}};
}
