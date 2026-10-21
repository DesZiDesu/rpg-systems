// Version IDs double as the explicit, player-selected campaign opening presets.
export const STAGES={
 manga:[['opening','Opening · ก่อนคดี','Use the original manga’s opening era. Future discoveries, deaths and relationships are not current facts.'],['surveillance','Surveillance · การเฝ้าดู','The Kira investigation and surveillance have begun only where established; each investigator has limited information.'],['yotsuba','Yotsuba · ช่วงความทรงจำ','The Yotsuba investigation and the actual notebook relinquishment history control memory and knowledge.'],['succession','Succession · ยุคผู้สืบทอด','Use the later manga period, after an established time skip and actual surviving-cast history.'],['finale','Finale · บทสรุปมังงะ','Use the manga’s own final confrontation and aftermath only after the evidence chain exists.'],['legacy','Legacy · หลังคดี','Use the later manga legacy. Dead people are historical records, not resurrected scene participants.']],
 anime:[['opening','Opening · ก่อนคดี','Use the TV anime chronology, shifted three years from the original manga.'],['surveillance','Surveillance · การเฝ้าดู','Use the anime version of the first investigation; future notebook mechanisms are not yet public knowledge.'],['yotsuba','Yotsuba · ช่วงความทรงจำ','Use the anime’s Yotsuba arc and the actual current memory/ownership state.'],['succession','Succession · ยุคผู้สืบทอด','Use the TV anime’s condensed successor period, not every omitted manga event.'],['finale','Finale · บทสรุปอนิเมะ','Use the anime’s final presentation and Light’s last movement; do not append the manga epilogue as witnessed fact.']],
 'jp-films':[['opening','Death Note 2006','Use the 2006 Japanese film. Light is a university student; Shiori exists; the film’s Naomi and investigation events differ.'],['last-name','The Last Name','Use the sequel’s Takada plot and L’s film-specific strategy. Do not replace this with the Yotsuba arc.'],['lctw','L: Change the WorLd · Film','Use the film’s virus case during L’s limited remaining days; the Thai boy is the film’s Near interpretation.'],['new-generation','New Generation','Use the three prequel episodes introducing Mishima, Ryuzaki and Shien before the 2016 film.'],['new-world','Light Up the NEW World','Use the six-notebook crisis and the living cast/history actually established by 2016.']],
 drama:[['opening','TV 2015 · Opening','Use the 2015 drama. Light’s ordinary student life, family circumstances and reactions differ from the manga.'],['investigation','TV 2015 · Investigation','Use the television investigation, Shoko Himura and the drama’s Near/Mello presentation.']],
 'us-film':[['opening','US 2017','Use the American film and its separate names, Seattle setting and notebook clauses.']],
 musical:[['stage','The Musical','Use stage continuity and original spoken roleplay. Do not reproduce lyrics or turn production casts into extra people.']],
 'another-note':[['case','Another Note · LA BB','Use the 2002 pre-Kira case. Mello’s framing narration is not his physical presence.']],
 'l-novel':[['case','L: Change the WorLd · Novel','Use the novel’s separate case structure and characterization; the film’s Thai boy is absent.']],
 'c-kira':[['legacy','C-Kira one-shot','Use the later one-shot, Near as L and Midora’s notebook experiment. Main-series deceased people remain historical.']],
 'a-kira':[['opening','a-Kira · First contact','Use Minoru’s first encounter and the later gap only when it occurs. The new sale ban has not yet been imposed.'],['auction','a-Kira · Auction','Use the later auction stage. Track payment, possession and when the King communicates the new rule.']],
 pilot:[['prototype','Pilot','Use the prototype Taro story. The Death Eraser premise stays in this continuity only.']],
 'spiraling-trap':[['hotel','Spiraling Trap','Use the game’s hotel case and a player-defined investigator. Keep unverifiable puzzle detail unspecified.']],
 audio:[['adaptation','Audio drama','Use the licensed audio adaptation only for verified differences; do not invent an official transcript.']],
 relight:[['framing','Relight','Use compilation-specific framing and changed scenes only if this version is manually selected. The unnamed Shinigami is not confirmed reincarnated Light.']],
 'l-file':[ ['earlier-life','L FILE No. 15','Use the supplementary earlier-life material as background. Do not treat every sketch or image as a current witnessed event.']],
};

const commonMain=new Set(['Light Yagami','L','Ryuk','Misa Amane','Rem','Soichiro Yagami','Sachiko Yagami','Sayu Yagami','Naomi Misora','Raye Penber','Watari','Touta Matsuda','Shuichi Aizawa','Kanzo Mogi','Hideki Ide','Hirokazu Ukita','Teru Mikami','Kiyomi Takada','Near','Mello','Matt']);
const earlyFilms=new Set(['Light Yagami','L','Ryuk','Misa Amane','Rem','Soichiro Yagami','Sachiko Yagami','Sayu Yagami','Naomi Misora','Raye Penber','Watari','Touta Matsuda','Shuichi Aizawa','Kanzo Mogi','Hideki Ide','Hirokazu Ukita','Kiyomi Takada','Shiori Akino','Sanami','Saeko Nishiyama']);
const lateFilms=new Set(['Ryuzaki','Ryuk','Misa Amane','Touta Matsuda','Teru Mikami','Tsukuru Mishima','Ryuzaki (film character)','Yuki Shien','Arma','Bepo','Sakura Aoi','Sho Nanase','Shin Kuromoto','Junrou Sugawara','Uei Uragami','Hikari Yagami','Rokuro Natsugawa','Roger Irving','Kenichi Mikuriya','Alexey Ivanov']);
const virus=new Set(['L','Watari','Near','Maki Nikaido','Kimihiko Nikaido','Kimiko Kujo','Daisuke Matoba','Hideaki Suruga','Shin Kagami','Asao Konishi','Tamotsu Yoshizawa','Hatsune Misawa','Koichi Matsudo','F','Q']);
const drama=new Set(['Light Yagami','L','Ryuk','Misa Amane','Rem','Soichiro Yagami','Sayu Yagami','Watari','Touta Matsuda','Shuichi Aizawa','Kanzo Mogi','Hideki Ide','Kiyomi Takada','Near','Mello','Teru Mikami','Shoko Himura','Masaru Kamoda']);
const musical=new Set(['Light Yagami','L','Ryuk','Misa Amane','Rem','Soichiro Yagami','Sayu Yagami','Watari','Shuichi Aizawa','Hideki Ide']);
const an=new Set(['Naomi Misora','L','Beyond Birthday','A','Deneuve','Eraldo Coil','Believe Bridesmaid','Quarter Queen','Backyard Bottomslash','Mello','Raye Penber']);
export function routesFor(npc){
 const routes=new Set(npc.continuities||[]);
 if(commonMain.has(npc.name)){routes.add('manga');routes.add('anime');}
 if(npc.name==='Ryuzaki')routes.add('jp-films');
 if(earlyFilms.has(npc.name)||lateFilms.has(npc.name)||virus.has(npc.name)||npc.name==='J')routes.add('jp-films');
 if(virus.has(npc.name))routes.add('l-novel');if(drama.has(npc.name))routes.add('drama');if(musical.has(npc.name))routes.add('musical');if(an.has(npc.name))routes.add('another-note');
 if(['L','Ryuk','Watari','Light Turner','Mia Sutton','James Turner','Kenny Doyle','Antony Skomal','Aaron Peltz','Agent Young'].includes(npc.name))routes.add('us-film');
 if(['Near','Ryuk','Midora','C-Kira'].includes(npc.name))routes.add('c-kira');
 if(['Near','Ryuk','Minoru Tanaka','King of Death','Japanese Prime Minister (one-shot)','United States President (one-shot)','President of China (one-shot)'].includes(npc.name))routes.add('a-kira');
 if(['Ryuk','Taro Kagami','Miura'].includes(npc.name))routes.add('pilot');
 if(commonMain.has(npc.name))routes.add('relight');if(['L','Watari'].includes(npc.name))routes.add('l-file');
 return [...routes];
}
const patch=(npc,route,stage)=>{
 const result={notes:`Source continuity: ${route}. ${stage[2]} Canon biographies and outlines are private reference. Preserve actual player-created divergences. No automatic encounter, equipment, affection, consent or death.`};
 if(route==='drama'&&npc.name==='Light Yagami')Object.assign(result,{age:'University-age adult in the TV adaptation',occupation:'Student',personality:'A more ordinary young man who is initially uncertain and emotionally reactive; intelligence and confidence develop through the drama’s events. Do not copy the manga’s already polished opening persona.',background:'The television Light has different family circumstances, including his mother’s earlier death. His attachment to Misa and conflict with his father belong to the drama’s own sequence.',appearance:'The TV drama portrayal: dark brown hair, ordinary university and part-time-work clothes. Use the drama portrait if available.'});
 if(route==='us-film'&&npc.name==='L')Object.assign(result,{background:'The 2017 American film detective is a separate interpretation. His investigations take place in Seattle through Watari and James Turner; the manga’s published birth name is not established as this film’s true name.',appearance:'The American film portrayal: a young Black man with tightly curled dark hair and contemporary loose clothing, often covering part of his face.',personality:'An intensely driven, guarded investigator whose emotional control deteriorates under the film’s losses.'});
 if(route==='us-film'&&npc.name==='Watari')Object.assign(result,{background:'The American film’s handler and investigator associated with L. This portrayal’s name and history must follow the film’s own notebook scene; do not silently substitute the manga’s hidden name.',appearance:'The American film portrayal, an older Japanese man in formal clothes.'});
 if(route==='jp-films'&&npc.name==='Light Yagami')Object.assign(result,{age:'University student in the 2006 film',background:'The Japanese film’s Light studies law, knows Shiori Akino and confronts the limits of the justice system. His plan involving Naomi and Shiori and his confrontation with L belong to this film continuity.',occupation:'University student'});
 if(route==='jp-films'&&npc.name==='Kiyomi Takada')Object.assign(result,{background:'The Last Name gives Takada a notebook-user role distinct from the manga broadcaster/intermediary role. Do not insert a Yotsuba arc as a replacement.',occupation:'Television journalist'});
 if(route==='jp-films'&&npc.name==='Soichiro Yagami')result.background='The Japanese film task-force leader and Light’s father. His film survival and discovery of Light’s actions differ from the main manga; follow the actual film-era events.';
 if(route==='jp-films'&&npc.name==='Near')Object.assign(result,{name:'Near',age:'Child',background:'The Thai boy rescued in L: Change the WorLd, named Near by L. He is a film-specific interpretation, not the already established manga SPK leader Nate River.',appearance:'A young Thai boy in ordinary child’s clothing. No manga white-hair portrait should be used to claim a live-action identity.'});
 if(route==='drama'&&npc.name==='Mello')Object.assign(result,{notes:result.notes+' The drama presents Mello through Near’s psychological/puppet construction. This is a reference presentation, not an independent physical man to spawn beside Near.',background:'A drama-specific aspect of Near’s presentation. Do not import the manga mafia leader as a simultaneously present separate body.'});
 if(route==='another-note'&&npc.name==='Mello')result.notes+=' Framing narrator only: not physically present in the 2002 case.';
 if(route==='another-note'&&npc.name==='Beyond Birthday')result.appearance='Disguise as Rue Ryuzaki imitates L’s unkempt appearance. No official canonical full-face portrait is established by the available novel reference; no fan image should become a confirmed natural appearance.';
 if(route==='manga'||route==='anime'){
  if(stage[0]==='opening'&&['Near','Mello','Matt','Linda'].includes(npc.name)){result.age='Child / adolescent in the opening era';result.occupation='Wammy’s student';result.notes+=' Later SPK, mafia affiliations, adult appearance and scars are future reference.';}
  if(stage[0]==='yotsuba'&&npc.name==='Light Yagami')result.notes+=' Determine from the actual ownership ledger whether Light has lost or recovered notebook memories. Never assume amnesia alone proves innocence or deception.';
  if(['succession','finale','legacy'].includes(stage[0])&&npc.name==='Light Yagami'){result.age='Adult in the later period';result.occupation='Investigator';}
  if(stage[0]==='legacy'&&['L','Light Yagami','Mello','Matt','Soichiro Yagami','Rem','Watari'].includes(npc.name))result.notes+=' In source-faithful post-case play this is a historical deceased record; do not create a living encounter. Divergences require the chat’s actual survival history.';
 }
 return result;
};
export function makeVersions(npc){
 const all=[];
 for(const route of routesFor(npc))for(const stage of STAGES[route]||[]){
  if(route==='jp-films'){
   if(earlyFilms.has(npc.name)&&!lateFilms.has(npc.name)&&!virus.has(npc.name)&&['new-generation','new-world'].includes(stage[0]))continue;
   if(lateFilms.has(npc.name)&&!earlyFilms.has(npc.name)&&!virus.has(npc.name)&&['opening','last-name','lctw'].includes(stage[0]))continue;
   if(virus.has(npc.name)&&!earlyFilms.has(npc.name)&&stage[0]!=='lctw')continue;
   if(stage[0]==='lctw'&&!virus.has(npc.name))continue;
  }
  if(npc.referenceTier!=='detailed'&&all.some(v=>v.continuity===route))continue;
  all.push({id:`${route}-${stage[0]}`,label:`${route} · ${stage[1]}`,description:stage[2],fields:patch(npc,route,stage),continuity:route,period:stage[0]});
 }
 // Native dossiers allow 20 versions. Keep every distinct adaptation first,
 // then additional periods; no source disappears behind numerous manga eras.
 const first=[],extra=[],seen=new Set();for(const v of all){if(!seen.has(v.continuity)){first.push(v);seen.add(v.continuity);}else extra.push(v);}
 return [...first,...extra].slice(0,20);
}
