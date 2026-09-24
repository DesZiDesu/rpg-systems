import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../index.js',import.meta.url),'utf8');
const functions=source.slice(source.indexOf('function syncLauncherVisibility()'),source.indexOf('function observeWandMenu()'));
test('NPC wand launcher follows toggle, supports keyboard, and registers only once',()=>{
 const nodes=new Map(),settings={showWandLauncher:true};let opened=0;
 const menu={children:[],style:{display:'block'},appendChild(n){this.children.push(n);nodes.set(n.id,n)},contains(n){return this.children.includes(n)}};nodes.set('extensionsMenu',menu);
 const sandbox={document:{getElementById:id=>menu.children.find(n=>n.id===id)||nodes.get(id),createElement:()=>({dataset:{},setAttribute(){}})},getSettings:()=>settings,LAUNCHER_BIND_VERSION:'test',requestAnimationFrame:()=>{},openInterface(){},npcWorkspace:{open(){opened++}},notify(){}};
 vm.createContext(sandbox);vm.runInContext(functions,sandbox);
 assert.equal(sandbox.createWandLauncher(),true);assert.equal(sandbox.createWandLauncher(),true);assert.equal(menu.children.length,2);
 const npc=nodes.get('tretaresia-npc-wand-launcher');assert.equal(npc.hidden,false);
 const event=key=>({type:'keydown',key,preventDefault(){}});
 npc.onkeydown(event('x'));assert.equal(opened,0);npc.onkeydown(event('Enter'));npc.onkeydown(event(' '));assert.equal(opened,2);
 settings.showWandLauncher=false;sandbox.syncLauncherVisibility();assert.equal(npc.hidden,true);npc.onclick({type:'click',preventDefault(){}});assert.equal(opened,2);
 settings.showWandLauncher=true;sandbox.syncLauncherVisibility();assert.equal(npc.hidden,false);npc.onclick({type:'click',preventDefault(){}});assert.equal(opened,3);
 sandbox.closeHostWandMenu();assert.equal(menu.style.display,'none');
});
