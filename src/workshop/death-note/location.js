// The scene tracker stores a place and a position separately. A notebook may
// describe that same location as "Balcony, Kirin's house" in one string.
// Compare exact components, not a loose substring that permits remote pickup.
const key=value=>String(value||'').normalize('NFKC').toLocaleLowerCase().replace(/[‘’]/gu,"'").replace(/[\s,，;；|/—–()[\]{}-]+/gu,' ').trim();
export function notebookInScene(location,state){
 const target=key(location),place=key(state.location?.place),position=key(state.scene?.position);
 if(!target)return true;
 if(target===place)return true;
 return Boolean(place&&position&&(target===key(place+' '+position)||target===key(position+' '+place)));
}
