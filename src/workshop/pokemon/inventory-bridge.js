const key=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const thai={'โปเกบอล':'poke-ball','โปเกบอลล์':'poke-ball','มาสเตอร์บอล':'master-ball','อัลตร้าบอล':'ultra-ball','อัลตราบอล':'ultra-ball','เกรทบอล':'great-ball'};
export function resolveRoleItem(dex,item){const id=String(item?.id||'').replace(/^pokemon:/u,'');if(dex.items?.has(id))return dex.items.get(id);const alias=thai[key(item?.name)];if(alias)return dex.items.get(alias);const wanted=key(item?.name);return[...(dex.items?.values()||[])].find(i=>key(i.name)===wanted)||null;}
export function bridgeEntries(s,dex){return Object.entries(s.inventory).filter(([,quantity])=>quantity>0).map(([id,quantity])=>({id:'pokemon:'+id,pokemonItem:id,name:dex.items.get(id)?.name||id,quantity,category:'Pokémon',provider:'pokemon'}));}
export function filterInventoryOps(ops,grants,dex){
 const ids=new Set(grants.filter(e=>e.type==='grant-item').map(e=>e.item));if(!ids.size)return ops;
 return ops.filter(op=>{if(!Array.isArray(op)||op[1]!=='inventory'||!['upsert','add','push'].includes(op[0]))return true;const value=op[2];if(!value||typeof value!=='object')return true;return!ids.has(resolveRoleItem(dex,value)?.id);});
}
