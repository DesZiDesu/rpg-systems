import {customIconSource} from './custom-icons.js?v=0.88.6';

// Portable, image-only updates. Never normalize a profile or merge arbitrary
// fields from an update file into the character archive.
export const NPC_ICON_UPDATE_FORMAT='roleforge-npc-icon-update';
export const NPC_ICON_UPDATE_BYTES=16*1024*1024;
const forbidden=new Set(['__proto__','constructor','prototype']);
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const identity=v=>typeof v==='string'&&v.length>0&&v.length<=240&&!forbidden.has(v)&&!/[\x00-\x1f]/u.test(v);
function keys(value,allowed){if(!object(value)||Object.keys(value).some(k=>!allowed.includes(k)))throw Error('Invalid icon update fields');}
export function validateNpcIconUpdate(raw){
    keys(raw,['format','version','id','name','target','icons','entries','notes','credit']);
    if(raw.format!==NPC_ICON_UPDATE_FORMAT||raw.version!==1||!identity(raw.id)||typeof raw.name!=='string'||raw.name.length>240)throw Error('Unsupported NPC icon update');
    keys(raw.target,['archiveId','characterPackId','characterPackIds']);
    if(!identity(raw.target.archiveId)&&!identity(raw.target.characterPackId))throw Error('An icon update must identify its character pack or archive');
    if(['archiveId','characterPackId'].some(key=>raw.target[key]!==undefined&&!identity(raw.target[key]))||raw.target.characterPackIds!==undefined&&(!Array.isArray(raw.target.characterPackIds)||raw.target.characterPackIds.length>16||raw.target.characterPackIds.some(v=>!identity(v))))throw Error('Invalid icon update target');
    if(!object(raw.icons)||Object.keys(raw.icons).length>2048||!Array.isArray(raw.entries)||raw.entries.length>50000)throw Error('Icon update size limit exceeded');
    let size=0;
    for(const [key,image]of Object.entries(raw.icons)){
        if(!identity(key)||typeof image!=='string'||!image.startsWith('data:image/')||customIconSource(image)!==image)throw Error('Icon updates require safe, embedded raster images');
        size+=image.length;
    }
    if(size>8*1024*1024)throw Error('Icon update images exceed the size limit');
    const seen=new Set(),checkIcon=key=>{if(key!==null&&(!identity(key)||!Object.hasOwn(raw.icons,key)))throw Error('Missing icon in update');};
    for(const entry of raw.entries){
        keys(entry,['npcId','versionId','icon','unset','expected','label','class']);
        if(!identity(entry.npcId)||typeof entry.versionId!=='string'||entry.versionId!==''&&!identity(entry.versionId))throw Error('Invalid NPC/version ID');
        const key=JSON.stringify([entry.npcId,entry.versionId]);if(seen.has(key))throw Error('Duplicate NPC/version in icon update');seen.add(key);
        if(entry.unset!==undefined&&entry.unset!==true)throw Error('Invalid icon removal');
        if(entry.unset){if(entry.icon!==undefined)throw Error('An inherited icon cannot specify an image');}else checkIcon(entry.icon);
        if(entry.expected!==undefined){keys(entry.expected,['present','icon']);if(typeof entry.expected.present!=='boolean')throw Error('Invalid expected icon');if(entry.expected.present)checkIcon(entry.expected.icon);else if(entry.expected.icon!==undefined)throw Error('Invalid absent icon');}
        for(const key of ['label','class'])if(entry[key]!==undefined&&(typeof entry[key]!=='string'||entry[key].length>240))throw Error('Invalid icon label');
    }
    for(const key of ['notes','credit'])if(raw[key]!==undefined&&(typeof raw[key]!=='string'||raw[key].length>8000))throw Error('Icon update metadata is too long');
    return raw;
}
export function checkNpcIconTarget(patch,target){
    // A native card has no archive ID. Its stable character-pack ID is then
    // required; a matching avatar name alone never authorizes an update.
    if(target.archiveId){if(patch.target.archiveId!==target.archiveId)throw Error('This icon update belongs to a different World Pack');}
    else if(!target.characterPackId||![patch.target.characterPackId,...(patch.target.characterPackIds||[])].includes(target.characterPackId))throw Error('This icon update belongs to a different character pack');
}
const iconValue=(patch,key)=>key===null?'':patch.icons[key];
const ownState=raw=>Object.hasOwn(raw,'roleIconImage')?{present:true,value:raw.roleIconImage||''}:{present:false};
export function planNpcIconUpdate(raw,records,{target,replaceExisting=false}={}){
    const patch=validateNpcIconUpdate(raw);checkNpcIconTarget(patch,target||{});
    const source=records instanceof Map?records:new Map(records.map(r=>[r.id,r])),updates=new Map(),rows=[],counts={changed:0,unchanged:0,existing:0,missing:0,conflict:0};
    const backup={format:NPC_ICON_UPDATE_FORMAT,version:1,id:patch.id.slice(0,190)+'-undo',name:'Undo · '+patch.name.slice(0,220),target:{...patch.target},icons:Object.create(null),entries:[]},imageKeys=new Map();
    function imageKey(value){if(!value)return null;if(!customIconSource(value))throw Error('Cannot back up an invalid existing icon');if(!value.startsWith('data:image/'))throw Error('Download or embed the existing icon before replacing it');if(!imageKeys.has(value)){const key='i'+imageKeys.size;imageKeys.set(value,key);backup.icons[key]=value;}return imageKeys.get(value);}
    for(const entry of patch.entries){
        const original=source.get(entry.npcId),base=updates.get(entry.npcId)||original,v=entry.versionId?original?.alternateProfiles?.find(v=>v.id===entry.versionId):original;
        let status='changed';const next=entry.unset?{present:false}:{present:true,value:iconValue(patch,entry.icon)},before=v?ownState(v):{present:false};
        if(!v)status='missing';
        else if(entry.expected&&(entry.expected.present!==before.present||entry.expected.present&&iconValue(patch,entry.expected.icon)!==before.value))status='conflict';
        else if(before.present===next.present&&(!before.present||before.value===next.value))status='unchanged';
        else if(!entry.expected&&!replaceExisting&&(before.value||entry.versionId&&before.present||entry.versionId&&original.roleIconImage))status='existing';
        if(status==='changed'){
            // Copy only the touched record and presentation object; every
            // canonical field, flag and selected version stays byte-equivalent.
            const copy={...base};let destination=copy;
            if(entry.versionId){copy.alternateProfiles=base.alternateProfiles.map(v=>v.id===entry.versionId?{...v}:v);destination=copy.alternateProfiles.find(v=>v.id===entry.versionId);}
            if(next.present)destination.roleIconImage=next.value;else delete destination.roleIconImage;updates.set(entry.npcId,copy);
            backup.entries.push({npcId:entry.npcId,versionId:entry.versionId,...(before.present?{icon:imageKey(before.value)}:{unset:true}),expected:next.present?{present:true,icon:imageKey(next.value)}:{present:false}});
        }
        counts[status]++;rows.push({npcId:entry.npcId,versionId:entry.versionId,label:base?.name||entry.label||entry.npcId,versionLabel:entry.versionId?v?.label||entry.versionId:'',class:entry.class||'',status,icon:next.present?next.value:''});
    }
    validateNpcIconUpdate(backup);
    if(new TextEncoder().encode(JSON.stringify(backup)).length>NPC_ICON_UPDATE_BYTES)throw Error('The undo file is too large. Split this icon update into smaller files. Existing data was kept.');
    return {updates,rows,counts,backup};
}
