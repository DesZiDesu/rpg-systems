import {createHash} from 'node:crypto';
import {normalizeNpcAlternates} from '../../../src/npc-alternates.js';
import {embeddedPortraitBlob} from '../../../src/embedded-portrait.js';
import {customIconSource} from '../../../src/custom-icons.js';
const roleGroups=[
 ['Gym Leader','Brock|Misty|Lt. Surge|Erika|Koga|Sabrina|Blaine|Falkner|Bugsy|Whitney|Morty|Chuck|Jasmine|Pryce|Clair|Roxanne|Brawly|Wattson|Flannery|Norman|Winona|Tate|Liza|Juan|Roark|Gardenia|Maylene|Crasher Wake|Fantina|Byron|Candice|Volkner|Cilan|Chili|Cress|Lenora|Burgh|Elesa|Clay|Skyla|Brycen|Drayden|Viola|Grant|Korrina|Ramos|Clemont|Valerie|Olympia|Wulfric|Milo|Nessa|Kabu|Bea|Allister|Opal|Gordie|Melony|Piers|Raihan|Katy|Brassius|Iono|Kofu|Ryme|Tulip|Grusha'],
 ['Elite Four','Lorelei|Bruno|Agatha|Will|Karen|Sidney|Phoebe|Glacia|Drake|Bertha|Lucian|Shauntal|Marshal|Grimsley|Caitlin|Malva|Siebold|Wikstrom|Drasna|Kahili|Rika|Poppy|Hassel'],
 ['Champion / Trainer','Lance|Steven Stone|Wallace|Cynthia|Alder|Iris|Diantha|Leon|Geeta|Nemona'],
 ['Professor','Professor Oak|Professor Elm|Professor Birch|Professor Rowan|Professor Juniper|Professor Sycamore|Professor Kukui|Professor Burnet|Professor Magnolia|Professor Sonia|Professor Laventon|Professor Sada|Professor Turo'],
 ['Trial Captain','Ilima|Lana|Kiawe|Mallow|Sophocles|Mina'],['Island Kahuna','Hala|Olivia|Nanu|Hapu'],
 ['Trainer','Red|Blue|Leaf|Ethan|Kris|Lyra|Silver|Brendan|May|Wally|Dawn|Lucas|Barry|Hilbert|Hilda|Cheren|Bianca|Nate|Rosa|Calem|Serena|Hau|Gladion|Victor|Gloria|Hop|Bede|Marnie|Rei|Akari|Florian|Juliana|Arven|Penny'],
 ['Team Rocket','Jessie|James|Giovanni|Petrel|Proton|Ariana|Archer'],['Team Magma','Maxie|Tabitha|Courtney'],['Team Aqua','Archie|Shelly|Matt'],['Team Galactic','Cyrus|Mars|Jupiter|Saturn|Charon'],['Team Plasma','Ghetsis|Colress'],['Team Flare','Lysandre'],['Team Skull','Guzma|Plumeria'],['Aether Foundation','Lusamine|Faba|Wicke'],['Team Star','Giacomo|Mela|Atticus|Ortega|Eri'],
 ['Animated-series trainer','Ash Ketchum|Gary Oak|Tracey Sketchit|Max|Goh|Chloe|Liko|Roy|Dot|Friede|Amethio|Lucius']
];
const roles=new Map();for(const [role,names]of roleGroups)for(const name of names.split('|'))roles.set(name,[...roles.get(name)||[],role]);
const details={
 'Professor Oak':'A Kanto Pokémon researcher associated with Pallet Town and the Pokédex. His role, relationships and timing depend on the selected continuity.',
 'Ash Ketchum':'An animated-series trainer from Pallet Town whose partner is Pikachu. His journey and companions vary by the era and continuity.',
 'Liko':'A Pokémon Horizons protagonist who travels with the Rising Volt Tacklers; her pendant draws the attention of the Explorers.',
 'Roy':'A Pokémon Horizons protagonist who joins the Rising Volt Tacklers and travels with Fuecoco early in the series.',
 'Dot':'A Pokémon Horizons character associated with the Rising Volt Tacklers; she also appears online as Nidothing.',
 'Friede':'A professor and leader of the Rising Volt Tacklers in Pokémon Horizons. His partner is Captain Pikachu.',
 'N':'An important Unova figure connected to Team Plasma whose beliefs about people and Pokémon vary with the selected story period.',
 'Cynthia':'A Sinnoh League Champion and researcher with an interest in myths and history. Her role varies across game and animated continuities.',
 'Steven Stone':'A Hoenn trainer associated with the League and an interest in rare stones. His title differs between the Ruby/Sapphire and Emerald stories.',
 'Wallace':'A Hoenn Water-type trainer whose League or Gym role depends on the selected game continuity.',
 'Giovanni':'A Kanto figure associated with Team Rocket and, in some game periods, Viridian Gym. His identity and knowledge are not automatically public to the player.',
 'Misty':'A Water-type trainer and Cerulean Gym Leader in the games; her animated journey with Ash has separate continuity.',
 'Brock':'A Rock-type trainer associated with Pewter Gym; his travels with Ash belong to the animated continuity.',
 'May':'A Hoenn character whose game protagonist/rival role and animated Coordinator journey are separate versions.',
 'Dawn':'A Sinnoh game protagonist/rival or an animated Coordinator depending on the selected source.',
 'Serena':'A Kalos game protagonist/rival or animated performer depending on the selected source.',
 'Iris':'A Dragon-type trainer associated with Unova, with source- and period-specific League roles.',
 'Leon':'A Galar Champion known for stadium battles; his status depends on the actual timeline.',
 'Geeta':'A Paldea League figure associated with the Pokémon League and its Gym assessment.',
 'Nemona':'A Paldea student and enthusiastic battler who encourages the player in Scarlet/Violet, if their story establishes that meeting.',
 'Arven':'A Paldea student whose source-game story includes research into Titan Pokémon; his private reasons are learned in play.',
 'Penny':'A Paldea student associated with the Team Star storyline; her identity and secrets depend on the selected story.',
 'Lillie':'An Alola character connected to the Aether Foundation; animated and game versions have different details.',
 'Guzma':'The leader of Team Skull in the Alola game continuity, with source-specific motivations and relationships.',
 'Lysandre':'A Kalos figure connected to Team Flare in the X/Y source continuity; plans need not have occurred in a divergent roleplay.',
 'Maxie':'A Hoenn Team Magma leader associated with the land-focused conflict, with source-specific differences.',
 'Archie':'A Hoenn Team Aqua leader associated with the sea-focused conflict, with source-specific differences.',
 'Cyrus':'The Team Galactic leader in Sinnoh’s game continuity; his knowledge and plans remain private until revealed.',
 'Ghetsis':'A Team Plasma leader associated with the Unova games; versions and motivations vary between the original games and sequels.'
};
const detailsTh={
 'Professor Oak':'นักวิจัยโปเกมอนแห่งคันโต ผู้เกี่ยวข้องกับเมืองพาเลตและโปเกเด็กซ์ บทบาทและความสัมพันธ์ขึ้นอยู่กับฉบับและช่วงเวลาที่เล่น',
 'Ash Ketchum':'เทรนเนอร์จากเมืองพาเลตในอนิเมะ มีพิคาชูเป็นคู่หู การเดินทางและเพื่อนร่วมทางเปลี่ยนไปตามภาค',
 'Liko':'ตัวเอก Pokémon Horizons ที่เดินทางกับไรซิงโวลต์แท็กเกิลเลอร์ และมีจี้ที่กลุ่มเอ็กซ์พลอเรอร์สตามหา',
 'Roy':'ตัวเอก Pokémon Horizons ผู้ร่วมเดินทางกับไรซิงโวลต์แท็กเกิลเลอร์และมีโฮเกเตอร์เป็นคู่หูช่วงต้นเรื่อง',
 'Dot':'สมาชิกไรซิงโวลต์แท็กเกิลเลอร์ใน Pokémon Horizons ผู้ปรากฏตัวออนไลน์ในชื่อ Nidothing',
 'Friede':'ศาสตราจารย์และผู้นำไรซิงโวลต์แท็กเกิลเลอร์ใน Pokémon Horizons มี Captain Pikachu เป็นคู่หู',
 'N':'บุคคลสำคัญในอิชชูที่เกี่ยวข้องกับทีมพลาสมา ความเชื่อเกี่ยวกับมนุษย์และโปเกมอนขึ้นอยู่กับช่วงเรื่อง',
 'Cynthia':'แชมเปียนลีกชินโอและนักวิจัยผู้สนใจตำนานกับประวัติศาสตร์ บทบาทต่างกันตามฉบับเกมและอนิเมะ',
 'Steven Stone':'เทรนเนอร์โฮเอ็นที่เกี่ยวข้องกับลีกและสนใจหินหายาก ตำแหน่งต่างกันตามฉบับ Ruby/Sapphire และ Emerald',
 'Wallace':'เทรนเนอร์โปเกมอนน้ำแห่งโฮเอ็น บทบาทในลีกหรือยิมขึ้นอยู่กับภาคที่เลือก',
 'Giovanni':'บุคคลในคันโตที่เกี่ยวข้องกับทีมร็อกเก็ตและยิมโทคิวะในบางช่วง ตัวตนและความลับไม่จำเป็นต้องเป็นที่รู้กัน',
 'Misty':'เทรนเนอร์โปเกมอนน้ำและหัวหน้ายิมฮานาดะในเกม การเดินทางกับซาโตชิเป็นความต่อเนื่องของอนิเมะ',
 'Brock':'เทรนเนอร์โปเกมอนหินที่เกี่ยวข้องกับยิมนิบิ การเดินทางกับซาโตชิเป็นความต่อเนื่องของอนิเมะ',
 'May':'ตัวละครโฮเอ็นที่มีบทบาทเป็นตัวเอกหรือคู่แข่งในเกม และมีเส้นทางนักประสานงานต่างหากในอนิเมะ',
 'Dawn':'ตัวเอกหรือคู่แข่งในเกมชินโอ หรือนักประสานงานในอนิเมะตามฉบับที่เลือก',
 'Serena':'ตัวเอกหรือคู่แข่งในเกมคาลอส หรือนักแสดงในอนิเมะตามฉบับที่เลือก',
 'Iris':'เทรนเนอร์โปเกมอนมังกรแห่งอิชชู บทบาทในลีกต่างกันตามฉบับและช่วงเวลา',
 'Leon':'แชมเปียนกาลาร์ผู้มีชื่อเสียงจากการต่อสู้ในสนาม สถานะขึ้นอยู่กับช่วงเรื่องจริง',
 'Geeta':'บุคคลในลีกปัลเดียที่เกี่ยวข้องกับการประเมินยิม',
 'Nemona':'นักเรียนปัลเดียผู้ชอบต่อสู้ บทบาทและความสัมพันธ์กับผู้เล่นขึ้นอยู่กับการพบกันในเรื่อง',
 'Arven':'นักเรียนปัลเดียซึ่งเรื่องในเกมเกี่ยวข้องกับโปเกมอนไททัน เหตุผลส่วนตัวควรเรียนรู้ผ่านการเล่น',
 'Penny':'นักเรียนปัลเดียที่เกี่ยวข้องกับเรื่องทีมสตาร์ ตัวตนและความลับขึ้นอยู่กับช่วงเรื่อง',
 'Lillie':'ตัวละครอโลลาที่เกี่ยวข้องกับมูลนิธิเอเธอร์ รายละเอียดในเกมและอนิเมะแตกต่างกัน',
 'Guzma':'ผู้นำทีมสกัลในเกมอโลลา แรงจูงใจและความสัมพันธ์ขึ้นอยู่กับฉบับ',
 'Lysandre':'บุคคลแห่งคาลอสที่เกี่ยวข้องกับทีมแฟลร์ใน X/Y แผนการไม่จำเป็นต้องเกิดขึ้นในโรลที่เปลี่ยนจากต้นฉบับ',
 'Maxie':'ผู้นำทีมแมกมาแห่งโฮเอ็นที่เกี่ยวข้องกับความขัดแย้งเรื่องผืนดิน รายละเอียดต่างกันตามฉบับ',
 'Archie':'ผู้นำทีมอควาแห่งโฮเอ็นที่เกี่ยวข้องกับความขัดแย้งเรื่องทะเล รายละเอียดต่างกันตามฉบับ',
 'Cyrus':'ผู้นำทีมกาแลกติกในเกมชินโอ ความรู้และแผนการเป็นเรื่องส่วนตัวจนกว่าจะเปิดเผย',
 'Ghetsis':'ผู้นำทีมพลาสมาที่เกี่ยวข้องกับเกมอิชชู แรงจูงใจและรายละเอียดต่างกันระหว่างภาคเดิมกับภาคต่อ'
};
const roleTh={'Gym Leader':'หัวหน้ายิม','Elite Four':'สี่จตุรเทพ','Champion / Trainer':'แชมเปียน / เทรนเนอร์','Professor':'ศาสตราจารย์','Trial Captain':'กัปตันบททดสอบ','Island Kahuna':'ราชาเกาะ','Trainer':'เทรนเนอร์','Animated-series trainer':'เทรนเนอร์ในอนิเมะ'};
function hueColor(seed,used){for(let salt=0;salt<1024;salt++){const h=createHash('sha256').update(seed+':'+salt).digest();const hue=((h.readUInt16BE(0)/65536)*360),sat=.47+h[2]/255*.23,light=.66+h[3]/255*.10;const c=(1-Math.abs(2*light-1))*sat,x=c*(1-Math.abs((hue/60)%2-1)),m=light-c/2;let rgb=hue<60?[c,x,0]:hue<120?[x,c,0]:hue<180?[0,c,x]:hue<240?[0,x,c]:hue<300?[x,0,c]:[c,0,x];const color='#'+rgb.map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('');if(!used.has(color)){used.add(color);return color;}}throw Error('Cannot generate distinct color');}
const digest=s=>createHash('sha256').update(s).digest('hex').slice(0,14);
const title=s=>s.replace(/^Pokémon\s+/u,'').slice(0,95);
const sourceHint=person=>[...person.games,...person.series,person.region].filter(Boolean).map(title).join(' / ');
function roleFor(p,counts,language){const found=roles.get(p.name),unambiguous=counts.get(p.name)===1||p.id==='professor-oak';const role=unambiguous&&found?found.map(r=>language==='th'?(roleTh[r]||r):r).join(' / '):'';return role||(language==='th'?'ตัวละครอ้างอิง':'Reference character');}
const originals=[
 {id:'pk-oc-gazette',name:'Gazette',aliases:['กาเซตต์','กาเซ็ตต์'],gender:'Male',color:'#bd87ef',occupation:'Independent trainer / investigator',title:'Red Sunken Sun',
  appearance:'A young-looking man in a dark cap with a crescent pin, short dark-violet hair and a visible violet eye; a black high-collared jacket with a pale front panel, dark gloves and a white cross-body strap. His exact age is unspecified.',
  personality:'Quietly observant, patient and dryly humorous once comfortable. He protects his boundaries, investigates before judging and values Pokémon consent. He is not automatically hostile or loyal to the player.',
  background:'An original trainer and independent investigator who follows unexplained signals near the coast. He has a bond with an unnamed original legendary Pokémon shown on the cover. Its visible design is dark black-violet with an elongated silver-gray faceplate, magenta eye slits and a crimson chest jewel; its species name, type, abilities, stats, moves, history and obscured anatomy are not established.',
  goals:'Compare coastal reports and protect his companion without imposing a path on anyone else. The player may befriend, question, oppose or ignore him.',
  speechStyle:'Measured, precise and quietly wry; speaks for himself, never for the player.'},
 {id:'pk-oc-alfmorii',name:'Alfmorii',aliases:['อัลฟ์โมรี','อัลฟ์โมริ'],gender:'Female',color:'#b3d188',occupation:'Field researcher / independent trainer',title:'Dawn Midnights',
  appearance:'A woman with long pale hair and amber-orange eyes, wearing dark clothing and an ornate green gemstone; her exact age is unspecified.',
  personality:'Gentle and composed but direct when a claim lacks evidence. She listens carefully, maintains her own boundaries, and can disagree without being hostile.',
  background:'An original trainer, field researcher and keeper of an independent archive, interested in dawn light, migration and forgotten places. She has a bond with an unnamed original legendary Pokémon shown on the cover. Visible traits are ivory-white coloring, an orange eye, gold branching antler-like rays, flowing pale feathers and an emerald chest gem. Its species name, type, abilities, stats, moves, history and obscured anatomy are not established.',
  goals:'Document observations, question legends and look after her companion. She does not automatically trust, follow or oppose the player.',
  speechStyle:'Warm, concise and curious; distinguishes observation from interpretation.'}
];
const originalsTh={
 'pk-oc-gazette':{occupation:'เทรนเนอร์ / นักสืบอิสระ',gender:'ชาย',appearance:'ชายหนุ่มอายุไม่ระบุ สวมหมวกสีเข้มติดเสี้ยวจันทร์ มีผมและดวงตาสีม่วง เสื้อคอสูงสีดำตัดขาว ถุงมือ และสายคาดสีขาว',personality:'ช่างสังเกต อดทน พูดน้อยและมีอารมณ์ขันแห้ง ๆ เมื่อสนิท เขารักษาขอบเขตของตัวเอง สืบก่อนตัดสิน และเคารพการตัดสินใจของโปเกมอน ไม่ได้เป็นศัตรูหรือพวกของผู้เล่นโดยอัตโนมัติ',background:'เทรนเนอร์และนักสืบอิสระที่ติดตามสัญญาณแปลกตามชายฝั่ง เขาผูกพันกับโปเกมอนในตำนานต้นฉบับที่ยังไม่มีชื่อ เห็นตัวสีดำม่วง หน้ากากสีเงิน ดวงตาชมพูม่วง และอัญมณีแดงตรงอก ยังไม่ได้กำหนดชื่อสายพันธุ์ ธาตุ ความสามารถ สเตตัส ท่า ประวัติ หรือรูปร่างส่วนที่มองไม่เห็น',goals:'เปรียบเทียบรายงานจากชายฝั่งและดูแลคู่หู ผู้เล่นจะเป็นเพื่อน ตั้งคำถาม ต่อต้าน หรือไม่ยุ่งก็ได้',speechStyle:'พูดรอบคอบ ตรงประเด็น และแทรกอารมณ์ขันแห้ง ๆ โดยไม่พูดแทนผู้เล่น'},
 'pk-oc-alfmorii':{occupation:'นักวิจัยภาคสนาม / เทรนเนอร์อิสระ',gender:'หญิง',appearance:'หญิงผมสีอ่อนยาว ดวงตาอำพันอมส้ม สวมชุดสีเข้มและเครื่องประดับอัญมณีสีเขียว อายุไม่ระบุ',personality:'อ่อนโยนและใจเย็น แต่ถามตรงเมื่อข้ออ้างยังไม่มีหลักฐาน รับฟัง รักษาขอบเขตของตัวเอง และไม่จำเป็นต้องเห็นด้วยกับผู้เล่น',background:'เทรนเนอร์ นักวิจัยภาคสนามและผู้ดูแลคลังข้อมูลอิสระ สนใจแสงรุ่งอรุณ การอพยพ และสถานที่ที่ถูกลืม เธอผูกพันกับโปเกมอนในตำนานต้นฉบับที่ยังไม่มีชื่อ เห็นตัวสีขาวงาช้าง ดวงตาสีส้ม กิ่งเขาสีทอง ขนอ่อน และอัญมณีเขียวตรงอก ยังไม่ได้กำหนดชื่อสายพันธุ์ ธาตุ ความสามารถ สเตตัส ท่า ประวัติ หรือรูปร่างส่วนที่มองไม่เห็น',goals:'บันทึกสิ่งที่สังเกต ตั้งคำถามต่อตำนาน และดูแลคู่หู เธอไม่ได้ไว้ใจ ติดตาม หรือต่อต้านผู้เล่นโดยอัตโนมัติ',speechStyle:'อบอุ่น กระชับ ช่างสงสัย และแยกสิ่งที่สังเกตจากการตีความ'}
};
export function makeRoster(source,{icon,portraits,language='en'}){
 if(!customIconSource(icon))throw Error('Invalid embedded Poké Ball PNG');const used=new Set([...originals.map(o=>o.color.toLowerCase()),'#d18d9c','#98d5bd']),names=new Map(),npcs=[];
 for(const p of source.characters)names.set(p.name,(names.get(p.name)||0)+1);
 for(const p of [...source.characters].sort((a,b)=>a.id.localeCompare(b.id))){
  const descriptors=[...p.games.map(title),...p.series];const unique=[...new Set(descriptors)], role=roleFor(p,names,language);
  const facts=details[p.name]&&((names.get(p.name)===1)||p.id==='professor-oak')?(language==='th'?(detailsTh[p.name]||details[p.name]):details[p.name]):'';
  const context=unique.length?unique.join('; '):(language==='th'?'ยังไม่ระบุแหล่งโดยละเอียด':'Source details are not specified.');
  const background=[facts,language==='th'?`ดัชนีแหล่ง: ${context} รายการนี้เป็นข้อมูลอ้างอิง ไม่ยืนยันว่าผู้เล่นได้พบแล้ว แต่ละฉบับอาจต่างกัน ให้ใช้ฉบับที่กำลังเล่น`:`Source index: ${context}. This is a reference record, not evidence of an encounter. Adaptations may differ; use only the active continuity.`].filter(Boolean).join(' ');
  // Detailed source dossiers for major recurring identities; every record keeps
  // its full series context for filtering without thousands of empty versions.
  const major=roles.has(p.name)||Object.hasOwn(details,p.name)||p.series.includes('Anime · Main cast');
  const versions=(major?unique.slice(0,20):[]).map(label=>({id:'source-'+digest(p.id+':'+label),label:'['+label+']',description:language==='th'?'ข้อมูลอ้างอิงจากฉบับนี้ การเลือกข้อมูลไม่ได้หมายความว่าผู้เล่นเคยพบแล้ว':'Reference from this source. Selecting a dossier does not establish an encounter.',fields:{background:language==='th'?`ข้อมูลอ้างอิง: ${p.name} อยู่ในดัชนี ${label} ให้แยกฉบับนี้จากฉบับอื่นและเหตุการณ์ที่เกิดขึ้นแล้วในโรล`:`Reference: ${p.name} is indexed for ${label}. Keep that version separate from other adaptations and established play.`}}));
  const rocketMeowth=p.source.endsWith('/Meowth_(Team_Rocket)'),display=rocketMeowth?'Meowth (Team Rocket)':p.name,aliases=rocketMeowth?["Team Rocket's Meowth",'เนียสทีมร็อกเก็ต']:(p.aliases||[]);
  const npc={id:p.id,name:display,aliases,title:'',occupation:p.pokemon?(language==='th'?'โปเกมอนในอนิเมะ':'Pokémon · animation'):role,...(p.pokemon?{race:'Pokémon'}:{}),relationship:language==='th'?'ยังไม่รู้จัก':'Stranger',faction:'',met:false,enabled:true,isHostile:false,npcScope:'character',hasPortrait:false,portraitSource:'none',portraitImage:'',roleIcon:'book',roleIconImage:icon,identityColor:hueColor(p.id,used),appearance:language==='th'?'ดัชนีฉบับย่อนี้ไม่ได้ระบุรูปลักษณ์':'Not specified by this short source index.',personality:language==='th'?'อิงฉบับและฉากที่กำลังเล่น ไม่สมมติรายละเอียดที่ยังไม่ได้ยืนยัน':'Use the active source and actual scene; unverified details remain unspecified.',background,goals:language==='th'?'ทำตามสถานการณ์ที่เกิดขึ้นจริง ไม่สมมติผลลัพธ์ตามต้นฉบับ':'Act on established circumstances rather than assumed canon outcomes.',speechStyle:language==='th'?(p.pokemon?'ใช้เสียงหรือคำพูดตามที่โปเกมอนตัวนั้นและฉบับนั้นแสดงไว้':'ใช้บทพูดที่เหมาะกับฉบับและสถานการณ์'):(p.pokemon?'Use vocalizations or speech only where the actual Pokémon and continuity establish it.':'Use original dialogue appropriate to the source and the actual situation.'),notes:(language==='th'?'แหล่งอ้างอิง: ':'Source reference: ')+p.source+(p.indexSource?' · '+p.indexSource:'')+(language==='th'?'. ไม่สมมติอายุ เพศ สถานที่ ทีมโปเกมอน หรือความสัมพันธ์ที่ยังไม่ได้ยืนยัน':'. No unverified age, gender, current location, Pokémon team or relationship is assumed.'),activeAlternateId:'',alternateProfiles:versions,_sourceHint:sourceHint(p)};
  if(normalizeNpcAlternates(npc).alternateProfiles.length!==versions.length)throw Error('Invalid alternate dossiers: '+p.id);npcs.push(npc);
 }
 for(const p of originals){const image=portraits[p.id],profile=language==='th'?{...p,...originalsTh[p.id]}:p;if(!embeddedPortraitBlob(image))throw Error('Invalid original character portrait: '+p.id);npcs.push({id:p.id,name:p.name,aliases:p.aliases,title:p.title,occupation:profile.occupation,gender:profile.gender,race:language==='th'?'มนุษย์':'Human',age:language==='th'?'ไม่ระบุ':'Unspecified',relationship:language==='th'?'ยังไม่รู้จัก':'Stranger',met:false,enabled:true,isHostile:false,npcScope:'character',identityColor:p.color,roleIcon:'book',roleIconImage:icon,hasPortrait:true,portraitSource:'embedded',portraitImage:image,portraitSize:84,portraitView:p.id==='pk-oc-gazette'?{desktop:{x:22,y:44,zoom:2.3},mobile:{x:22,y:44,zoom:2.3}}:{desktop:{x:34,y:32,zoom:2.4},mobile:{x:34,y:32,zoom:2.4}},appearance:profile.appearance,personality:profile.personality,background:profile.background,goals:profile.goals,speechStyle:profile.speechStyle,notes:language==='th'?'ตัวละครต้นฉบับของผู้ใช้ โปเกมอนคู่หูยังไม่อยู่ในข้อมูลเกม ห้ามแต่งชื่อสายพันธุ์ กลไก ร่างเพิ่มเติม หรือมอบให้ผู้เล่น':'Original character owned by the user. The companion Pokémon is not yet in the game data; do not invent a species name, mechanics, extra forms or player ownership.',activeAlternateId:'',alternateProfiles:[],_sourceHint:p.title+' / Original'});}
 for(const [id,owner,thai,color,appearance,series] of [
  ['pk-oc-gazette-legend','Gazette','โปเกมอนในตำนานของกาเซตต์','#d18d9c','Dark black-violet body, long silver-gray pointed faceplate, magenta eye slits, blade-like wing shapes and a red chest jewel.','Red Sunken Sun'],
  ['pk-oc-alfmorii-legend','Alfmorii','โปเกมอนในตำนานของอัลฟ์โมรี','#98d5bd','Ivory-white coloring, an orange eye, branching gold antler-like rays, flowing pale feathers and an emerald chest jewel.','Dawn Midnights']
 ])npcs.push({id,name:`${owner}'s unnamed legendary Pokémon`,aliases:[thai],title:language==='th'?'คู่หูต้นฉบับ · ยังไม่ระบุสายพันธุ์':'Original companion · species unspecified',occupation:language==='th'?'โปเกมอนในตำนาน · ข้อมูลอ้างอิง':'Legendary Pokémon · narrative reference',race:'Pokémon',relationship:language==='th'?'ยังไม่รู้จัก':'Stranger',met:false,enabled:true,isHostile:false,npcScope:'character',identityColor:color,roleIcon:'book',roleIconImage:icon,hasPortrait:false,portraitSource:'none',appearance:language==='th'?(owner==='Gazette'?'ลำตัวดำม่วง หน้ากากสีเงินทรงแหลม ดวงตาชมพูม่วง ปีกคล้ายใบมีด และอัญมณีแดงที่อก':'ตัวสีขาวงาช้าง ดวงตาสีส้ม กิ่งเขาสีทอง ขนอ่อน และอัญมณีเขียวที่อก'):appearance,personality:language==='th'?'ยังไม่ระบุ รอผู้ใช้กำหนด':'Unspecified until the user defines this original creature.',background:language==='th'?`โปเกมอนคู่หูต้นฉบับของ ${owner} ยังไม่ได้กำหนดชื่อสายพันธุ์ ธาตุ ความสามารถ ท่า สเตตัส ประวัติ หรือรูปร่างส่วนที่มองไม่เห็น และยังไม่ได้เพิ่มลง Pokémon addon`:`An original Pokémon companion of ${owner}. Its species name, type, abilities, moves, stats, history and obscured anatomy are not established. It is not registered in the Pokémon addon.`,goals:language==='th'?'ยึดข้อเท็จจริงและการตัดสินใจที่เกิดขึ้นในโรล':'Follow only facts and choices established in play.',speechStyle:language==='th'?'ยังไม่ทราบ ห้ามสมมติว่าพูดภาษามนุษย์ได้':'Unknown; do not assume human speech.',notes:language==='th'?'ข้อมูลอ้างอิงสำหรับโรลที่แก้ไขได้ ยังไม่ใช่สายพันธุ์ที่เล่นได้หรือไอเทมของผู้เล่น':'This is an editable narrative reference, not a playable species or an item granted to the user.',activeAlternateId:'',alternateProfiles:[],_sourceHint:series+' / Original'});
 return npcs;
}
