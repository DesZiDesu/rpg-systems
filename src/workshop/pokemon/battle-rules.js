export const STATUS_NAMES={paralysis:['อัมพาต','Paralysis'],sleep:['หลับ','Sleep'],freeze:['แช่แข็ง','Freeze'],burn:['ไหม้','Burn'],poison:['พิษ','Poison']};
const ailments={1:'paralysis',2:'sleep',3:'freeze',4:'burn',5:'poison'};
export function supportedMove(dex,id){const move=dex.moves[id],meta=dex.moveMeta?.[id];if(!move)return false;if(!meta)return move.power>0;return(meta.maxHits||1)<=1&&((move.power>0&&[0,4,6,7,8].includes(meta.category))||(!move.power&&([1,2,3].includes(meta.category))&&(meta.category!==1||Boolean(ailments[meta.ailment]))));}
export function stageFactor(stage,accuracy=false){const n=Math.max(-6,Math.min(6,stage||0)),base=accuracy?3:2;return n>=0?(base+n)/base:base/(base-n);}
export function effectiveStat(m,index){return Math.max(1,m.stats[index]*stageFactor(m.stages?.[index])*(index===5&&m.status==='paralysis'?.5:1));}
export function applyStatus(target,p,status,rng){if(target.status||!target.hp)return false;if(status==='poison'&&p.types.some(t=>['poison','steel'].includes(t))||status==='burn'&&p.types.includes('fire')||status==='freeze'&&p.types.includes('ice')||status==='paralysis'&&p.types.includes('electric'))return false;target.status=status;target.statusTurns=status==='sleep'?1+Math.floor(rng()*3):0;return true;}
export function executeMove(dex,attacker,defender,slot,rng){
 const move=dex.moves[slot.id],meta=dex.moveMeta?.[slot.id]||{},a=dex.get(attacker.key),d=dex.get(defender.key);if(!supportedMove(dex,slot.id))throw Error('This move mechanic is not supported yet');if(slot.pp<=0)throw Error('No PP remaining');
 const result={damage:0,move:move.name,effect:1};
 if(attacker.flinch){attacker.flinch=false;return{...result,blocked:'flinch'};}
 if(attacker.status==='sleep'){if(attacker.statusTurns>0){attacker.statusTurns--;return{...result,blocked:'sleep'};}attacker.status='';}
 if(attacker.status==='freeze'){if(rng()<.2)attacker.status='';else return{...result,blocked:'freeze'};}
 if(attacker.status==='paralysis'&&rng()<.25)return{...result,blocked:'paralysis'};
 slot.pp--;
 const self=move.target===7,target=self?attacker:defender,targetSpecies=self?a:d,accuracy=(move.accuracy||100)*stageFactor(attacker.stages?.[6],true)/stageFactor(defender.stages?.[7],true);
 if(!self&&rng()*100>accuracy)return{...result,miss:true};
 if(move.power){
  const effect=d.types.reduce((n,t)=>n*(dex.typeChart[move.type+':'+t]??1),1),special=move.class===3,crit=rng()<1/24,stab=a.types.includes(move.type)?1.5:1;
  const amount=effect===0?0:Math.max(1,Math.floor(((2*attacker.level/5+2)*move.power*effectiveStat(attacker,special?3:1)/effectiveStat(defender,special?4:2)/50+2)*stab*effect*(crit?1.5:1)*(.85+rng()*.15)*(attacker.status==='burn'&&!special?.5:1)));
  defender.hp=Math.max(0,defender.hp-amount);Object.assign(result,{damage:amount,effect,crit});
  if(move.type==='fire'&&defender.status==='freeze')defender.status='';
  if(meta.drain>0)attacker.hp=Math.min(attacker.stats[0],attacker.hp+Math.max(1,Math.floor(amount*meta.drain/100)));
  if(meta.drain<0)attacker.hp=Math.max(0,attacker.hp-Math.max(1,Math.floor(amount*-meta.drain/100)));
 }
 if(!self&&meta.category===1&&(move.type==='electric'&&d.types.includes('ground')||[77,78,79,147].includes(slot.id)&&d.types.includes('grass')))result.effect=0;
 if(result.effect!==0&&ailments[meta.ailment]&&rng()*100<(meta.ailmentChance||(!move.power?100:0))&&applyStatus(target,targetSpecies,ailments[meta.ailment],rng))result.status=target.status;
 if(meta.healing>0){const old=attacker.hp;attacker.hp=Math.min(attacker.stats[0],attacker.hp+Math.max(1,Math.floor(attacker.stats[0]*meta.healing/100)));result.healed=attacker.hp-old;}
 if(meta.stats?.length&&rng()*100<(meta.statChance||(!move.power?100:0))){const recipient=meta.category===7||self?attacker:target;recipient.stages||=Array(8).fill(0);for(const [stat,change]of meta.stats){const index=stat-1;if(index>0&&index<8)recipient.stages[index]=Math.max(-6,Math.min(6,(recipient.stages[index]||0)+change));}result.stageChanges=meta.stats;}
 if(defender.hp&&rng()*100<(meta.flinchChance||0))defender.flinch=true;
 return result;
}
export function residual(m){m.flinch=false;if(m.hp&&['burn','poison'].includes(m.status)){const amount=Math.max(1,Math.floor(m.stats[0]/(m.status==='burn'?16:8)));m.hp=Math.max(0,m.hp-amount);return amount;}return 0;}
