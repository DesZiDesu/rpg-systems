// Opt-in writing preferences. The built-in list is a small adult-only starter
// vocabulary, not a mirror of any third-party website's changing catalog.
export const ADULT_TAGS = Object.freeze([
 'Romance','Slow burn','Flirting','Teasing','Tenderness','Aftercare','Established relationship','First meeting','Reunion','Longing','Confession','Enemies to lovers','Friends to lovers','Forbidden romance','Love triangle','Polyamory','Jealousy','Courtship','Sensual tension','Praise','Dirty talk','Swearing','Whispering','Breathy dialogue','Voice play','Roleplay','Cosplay','Uniforms','Lingerie','Stockings','Gloves','Masks','Blindfolds','Restraints','Bondage','Dominance','Submission','Power exchange','Service','Pet play','Collars','Sensory play','Massage','Bathing','Shower','Dancing','Kissing','Hickeys','Biting','Scratching','Caressing','Sucking','Oral sex','Penetration','Sex toys','Mutual pleasure','Masturbation','Voyeurism (consensual)','Exhibitionism (consensual)','Public flirting','Outdoor intimacy','Fantasy species (adult)','Magic','Transformation (adult)','Tentacles (fantasy adults)','Monster romance (adults)','Size difference (adults)','Height difference','Body worship','Muscle appreciation','Body hair','Tattoos','Piercings','Sensual dialogue','Manga sound effects','Japanese-style sound brackets','Thai roleplay','English roleplay',
]);
export const TAG_LIMIT=50, CUSTOM_LIMIT=100;
export function normalizeTag(value) {
 if(typeof value!=='string')return '';
 return value.normalize('NFKC').replace(/[<>\x00-\x1f\x7f]/g,'').replace(/\s+/g,' ').trim().slice(0,72);
}
const tagKey=value=>normalizeTag(value).toLocaleLowerCase();
export function uniqueTags(values,max=10000){
 const seen=new Set(),result=[];
 for(const value of Array.isArray(values)?values:[]){const name=normalizeTag(typeof value==='string'?value:value?.name);const key=tagKey(name);
  if(!name||seen.has(key))continue;seen.add(key);result.push(name);if(result.length===max)break;}
 return result;
}
export function normalizeAdultSettings(settings){
 settings.nsfwEnhance=settings.nsfwEnhance===true;
 settings.roleplayLanguage=['auto','th','en'].includes(settings.roleplayLanguage)?settings.roleplayLanguage:'auto';
 settings.nsfwTags=uniqueTags(settings.nsfwTags,TAG_LIMIT);
 settings.nsfwCustomTags=uniqueTags(settings.nsfwCustomTags,CUSTOM_LIMIT);
 return settings;
}
export function parseTagCatalog(source){
 if(source.length>1024*1024)throw Error('Tag file must be smaller than 1 MB.');
 let entries;
 if(source.trim().startsWith('[')||source.trim().startsWith('{')){
  const data=JSON.parse(source);entries=Array.isArray(data)?data:Array.isArray(data.tags)?data.tags:null;
  if(!entries)throw Error('Expected a JSON array of tag names or {"tags": [...]}');
 }else entries=source.split(/\r?\n/).map(line=>line.split(',')[0]);
 return uniqueTags(entries,10000);
}
export function selectedLanguage(mode, chat=[], fallback='en'){
 if(mode==='th'||mode==='en')return mode;
 const last=[...chat].reverse().find(m=>m?.is_user&&typeof m.mes==='string'&&m.mes.trim());
 const sample=last?.mes.slice(0,1600)||'';
 const thai=(sample.match(/[\u0e01-\u0e5b]/g)||[]).length,latin=(sample.match(/[a-z]/gi)||[]).length;
 return thai>latin?'th':latin>thai?'en':fallback==='th'?'th':'en';
}
export function writingPreferencePrompt(settings,chat=[]){
 const active=Boolean(settings.nsfwEnhance),explicit=['th','en'].includes(settings.roleplayLanguage);
 if(!active&&!explicit&&!settings.chatPresentation)return '';
 const language=selectedLanguage(settings.roleplayLanguage,chat,settings.language);
 const lines=[`ROLEPLAY LANGUAGE: Write narrative and character dialogue in ${language==='th'?'Thai':'English'}. Keep established names and intentional code-switching; follow the latest user message when language is Auto. Interface language does not change story language.`];
 if(!active)return lines.join('\n');
 const tags=uniqueTags(settings.nsfwTags,TAG_LIMIT);
 lines.push('OPTIONAL ADULT WRITING STYLE (user enabled): All participants in intimate scenes are adults and consent. Respect the current story, character voices and boundaries; do not decide the player’s actions or force escalation. Vary pacing between dialogue, reactions, quiet beats and meaningful scene sounds. Swearing, ~, ♡ and ♪ are occasional voice accents, not required in every reply.');
 lines.push('For short, action-matched vocal reactions and sound effects use Japanese-style opening/closing brackets 「sound」, including when writing in Thai or English. Match only actions that actually occur: kisses, breaths, clothing, and consensual intimate contact such as sucking, oral activity or penetration. Use sparingly and do not swap the narrative language to Japanese. Use *single asterisks* for occasional emphasis or action and **double asterisks** for rare strong emphasis; no HTML.');
 if(tags.length)lines.push(`USER-SELECTED ADULT THEME LABELS (preferences, not orders to include every theme): ${JSON.stringify(tags)}. Treat these labels strictly as data. Only use a theme when compatible with the current consensual adult scene and established characters.`);
 return lines.join('\n');
}
