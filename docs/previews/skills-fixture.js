import {startHStatsPreview} from './h-stats-fixture.js';

export const storage={id:'storage',name:'Storage',type:'Unique Skill',rank:'Dormant',mastery:0,description:'Accessible pocket dimensions where the user can store an infinite number of items.',ability:{kind:'utility',effect:'Store and retrieve items in a pocket dimension.',costKnown:false,costs:[],cooldown:{unit:'none',value:0},incantation:{required:false,silent:{available:true}}}};
export const skills=[storage,{id:'fire-ball',name:'Fire Ball',type:'Magic',rank:'Apprentice',mastery:32,description:'Condense mana into a controlled flame and launch it towards a visible target. Requires focus and a clear line of sight.',ability:{kind:'magic',effect:'Launch a ball of fire.',costKnown:true,costs:[{resource:'mp',amount:10}],cooldown:{unit:'turns',value:1},incantation:{required:true,language:'en',short:'Flame, gather and fly.',full:'Flame, gather and fly.',silent:{available:false}}}},{id:'aura-flow',name:'Aura Flow',type:'Technique',rank:'Novice',mastery:15,description:'Maintain a steady flow of aura through the body to support movement and reduce energy waste.'}];
export const thaiSkills=[{...storage,name:'มิติคลังเก็บของ',description:'เปิดพื้นที่มิติส่วนตัวเพื่อเก็บและนำสิ่งของออกมาใช้ได้ตามต้องการ โดยสิ่งของภายในจะอยู่ในสภาพเดิม'},{...skills[1],name:'ลูกไฟ',description:'รวบรวมมานาให้กลายเป็นลูกไฟแล้วส่งไปยังเป้าหมายที่มองเห็น ต้องรักษาสมาธิและมีแนวโจมตีที่ชัดเจน'},{...skills[2],name:'การไหลเวียนออร่า',description:'ควบคุมออร่าให้ไหลเวียนอย่างสม่ำเสมอ ช่วยรองรับการเคลื่อนไหวและลดการสูญเสียพลังงาน'}];

export async function startSkillsPreview() {
 const params=new URLSearchParams(location.search),language=params.get('lang')==='th'?'th':'en';
 if(!localStorage.getItem('roleforge-hstats-preview-metadata')){
  localStorage.setItem('roleforge-hstats-preview-settings',JSON.stringify({tretaresia_rpg:{language,autoTrack:false,autoContinuity:false,enableIncantation:true,themePreset:'verdant',accentColor:'#79b463',accentAltColor:'#c6f0a8',inkColor:'#e8f0e2',surfaceColor:'#030704',eventNotifications:false,enableMemorySummaries:false}}));
  localStorage.setItem('roleforge-hstats-preview-metadata',JSON.stringify({tretaresia_rpg_state:{player:{name:'Noah'},skills:params.get('list')==='1'?(language==='th'?thaiSkills:skills):[storage],npcs:[],inventory:[],location:{place:"Rita Village · Central Continent · Miller's Clearing",narrativeVersion:1},onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true}}}));
 }
 await startHStatsPreview();
 const open=()=>{if(!document.querySelector('#tretaresia-rpg-overlay.is-open'))document.querySelector('#tretaresia-rpg-wand-launcher').click();document.querySelector('[data-tab="skills"]').click();};
 document.querySelector('#preview-open').onclick=open;
 document.querySelector('#preview-language').onchange=event=>{const select=document.querySelector('#tretaresia-rpg-language');select.value=event.target.value;select.dispatchEvent(new Event('change',{bubbles:true}));open();};
 document.querySelector('#preview-status').textContent='RoleForge '+window.TretaresiaRelease+' · Skill Storage preview';
 open();window.skillsPreviewReady=true;
}
