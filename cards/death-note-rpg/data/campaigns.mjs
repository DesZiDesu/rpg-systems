// Authored campaign outlines: summaries and play objectives, never episode scripts.
export const PACK_ID = 'death-note-rpg';
export const ROUTES = [
 ['manga','Manga · มังงะ','2003-11-28','Tokyo','Original manga; follow the printed chronology and its own warehouse ending and epilogue.'],
 ['anime','Anime · อนิเมะ','2006-11-28','Tokyo','Television anime; use its shifted dates, condensed succession period and distinct final presentation.'],
 ['jp-films','Japanese films · ภาพยนตร์ญี่ปุ่น','','Tokyo','2006 film and The Last Name; L’s film strategy controls the ending. The 2008 and 2016 follow-ups unlock only after their own established time and events.'],
 ['another-note','Another Note · คดี BB','2002-08-14','Los Angeles','Naomi’s pre-Kira investigation. Mello’s framing account is a later narrative source, not a person standing at the crime scene.'],
 ['l-novel','L: Change the WorLd · นิยาย','','Tokyo','Separate novel continuity. Do not import the film’s rescued boy or assume its exact sequence of incidents.'],
 ['drama','TV drama 2015 · ซีรีส์ญี่ปุ่น','','Tokyo','Eleven-episode television adaptation: ordinary university-age Light, the drama’s family circumstances and its Near/Mello construction.'],
 ['us-film','US film 2017 · ภาพยนตร์อเมริกัน','','Seattle','Light Turner, Mia Sutton and James Turner. This film’s notebook clauses are source-specific; manga-only inferences cannot supply proof.'],
 ['musical','The Musical · ละครเวที','','Tokyo','Stage continuity and its own resolution. Different productions are performance variants, not simultaneous extra people.'],
 ['c-kira','The C-Kira Story · วันช็อต 2008','','Japan','Post-Light manga one-shot; Midora’s new notebook and Near’s refusal to repeat the original contest.'],
 ['a-kira','The a-Kira Story · วันช็อต 2020','','Tokyo','Minoru’s later story and the subsequent auction period. The sale prohibition begins only when the King adds it.'],
 ['pilot','Pilot · เรื่องต้นแบบ Taro','','Japan','Taro Kagami’s prototype continuity. Death Eraser exists only here; its existence is no evidence for resurrection elsewhere.'],
 ['spiraling-trap','Spiraling Trap · คดีจากเกม','','Isolated hotel','The original Nintendo DS game’s trap case. Timings and puzzle inputs are adapted for text play; no invented puzzle solution is claimed to be a quotation.'],
 ['audio','Audio drama · ละครเสียง','','Japan','Licensed audio adaptation. Use its expanded social context when verified; do not invent a new canonical chapter from an unavailable transcript.'],
].map(([id,name,date,place,scope])=>({id,name,date,place,scope}));

const main = [
 ['สมุดที่ตกลงมา','Light finds a strange notebook and begins testing a claim about names and faces.','แยกการทดสอบที่ยืนยันแล้วออกจากความบังเอิญ','Light, Ryuk'],
 ['รูปแบบการตาย','A pattern of criminal deaths becomes a public and investigative question.','ตรวจรูปแบบข้อมูลที่สาธารณะเข้าถึงได้','Light, Soichiro'],
 ['การออกอากาศของ L','The decoy television broadcast tests the killer’s limits and operating area.','บันทึกว่าการออกอากาศพิสูจน์อะไรและยังไม่พิสูจน์อะไร','L, Lind L. Tailor'],
 ['ภายใต้การเฝ้าดู','Investigators examine police-family connections and surveillance targets.','ตรวจสัญญาณการติดตามที่สังเกตได้จริง','Raye Penber, Light'],
 ['เหตุบนรถประจำทาง','A bus incident changes the information available to a surveillance target.','ติดตามหลักฐานของเหตุบนรถโดยไม่ถือว่าข่าวลือคือข้อเท็จจริง','Raye Penber, Kiichiro Osoreda'],
 ['ชื่อของเจ้าหน้าที่','The threat to the FBI operation escalates through identity and notebook manipulation.','ตรวจผลของการเปิดเผยชื่อและสายการติดต่อ','Raye Penber, Steve Mason'],
 ['ข้อสรุปของ Naomi','Naomi develops a crucial theory and attempts to reach the investigation.','รับมือข้อมูลที่ Naomi มีโดยไม่เปิดเผยตัวตนลับแทนเธอ','Naomi Misora, Light'],
 ['กล้องในบ้าน','Covert observation tests the relationship between ordinary routines and the killings.','เทียบสิ่งที่กล้องเห็นกับสิ่งที่ยังถูกปิดบัง','Light, L, Ryuk'],
 ['การพบกันที่มหาวิทยาลัย','Light and L meet openly under an alias while privately testing one another.','แยกชื่อที่ใช้แนะนำตัวออกจากชื่อที่พิสูจน์แล้ว','Light, L'],
 ['ผู้ส่งสารคนที่สอง','Sakura TV receives a second source of Kira-related threats and messages.','ระบุเงื่อนไขที่การออกอากาศใหม่แสดงให้เห็น','Misa, Rem, Demegawa'],
 ['การตัดสินใจของ Ukita','The response at the broadcaster reveals a danger not explained by the first Kira alone.','ยืนยันเหตุการณ์จริงที่สถานีและผลของการตอบสนอง','Ukita, Soichiro, Misa'],
 ['Misa กับ Light','Two notebook users establish contact, motives and incompatible risks.','บันทึกข้อตกลงที่เกิดขึ้นจริงโดยไม่สมมุติความยินยอมของผู้เล่น','Misa, Light, Rem'],
 ['หลักฐานและการควบคุมตัว','The investigation closes on the second Kira and the original suspect.','ติดตามการควบคุมตัวและหลักฐานของแต่ละบุคคล','L, Misa, Light'],
 ['การสละสิทธิ์','A deliberate ownership arrangement changes memories and the investigation.','แยกสิทธิ์ถือสมุด การครอบครอง และความทรงจำให้ถูกต้อง','Light, Rem, Ryuk'],
 ['ผู้ต้องสงสัยที่ไร้ความทรงจำ','Light’s current beliefs change when his notebook memories are absent.','ตรวจการตัดสินใจของ Light ตามความทรงจำที่มีในขณะนั้น','Light, L, Soichiro'],
 ['ร่องรอยของ Yotsuba','Deaths and business outcomes point toward a corporate investigation.','เชื่อมข้อมูลบริษัทกับคดีโดยมีหลักฐานรองรับ','Higuchi, Namikawa, L'],
 ['เครือข่ายผู้บริหาร','The Yotsuba meetings and covert access expose internal disagreement.','แยกบทบาทของผู้บริหารแต่ละคน','Yotsuba Group, Aiber, Wedy'],
 ['แผนของ Matsuda','A risky infiltration threatens to expose the investigation.','รับมือผลของการแทรกซึมและรักษาหลักฐานที่ได้มา','Matsuda, Mogi'],
 ['ไล่ติดตาม Higuchi','A coordinated pursuit moves the notebook from a theory to a physical object.','ยืนยันการยึดวัตถุและผู้ที่แตะต้องมันจริง','Higuchi, Watari, L'],
 ['สัมผัสที่คืนความทรงจำ','Physical contact restores a specific person’s notebook memories.','ติดตามว่าใครจำอะไรกลับมาและด้วยเหตุใด','Light, Rem'],
 ['กฎที่ถูกเขียนเพิ่ม','The team encounters a notebook manuscript that appears to settle a key suspicion.','แยกความเชื่อของผู้สืบสวนออกจากกฎจริงของสมุด','L, Light, Ryuk'],
 ['สิ่งที่ Rem ต้องเลือก','Pressure around Misa confronts Rem with a fatal protective choice.','ยืนยันเงื่อนไขของทางเลือกโดยเปิดโอกาสให้การแทรกแซงเปลี่ยนผล','Rem, Misa, L, Watari'],
 ['หลังการสูญเสีย L','The investigation changes leadership and public power shifts.','บันทึกผลที่เกิดขึ้นจริงและความรู้ที่ผู้รอดชีวิตได้รับ','Light, Task Force, Wammy’s House'],
 ['ผู้สืบทอดสองแนวทาง','Near and Mello pursue the unresolved case through different methods.','แยกทรัพยากรและความรู้ของ Near กับ Mello','Near, Mello, Roger'],
 ['การลักพาตัวและสมุด','A hostage crisis turns a notebook into leverage against the Japanese team.','ติดตามข้อเรียกร้อง ความปลอดภัย และการส่งมอบจริง','Sayu, Mello, Soichiro'],
 ['เจ้าของจากอีกโลก','Sidoh seeks the notebook that passed into human hands.','ยืนยันสายการครอบครองและสิทธิ์ของสมุดที่เกี่ยวข้อง','Sidoh, Mello, Jack Neylon'],
 ['ปฏิบัติการที่แหล่งกบดาน','A dangerous operation involves the eye deal, a real name and the cost of incomplete information.','ยืนยันผลของปฏิบัติการทีละขั้นโดยไม่ยกเลิกต้นทุนย้อนหลัง','Soichiro, Mello, Light'],
 ['Kira กับตัวแทนคนใหม่','Mikami’s routine and Takada’s public position become operational links.','ระบุว่าคำสั่งใดส่งถึงใครและใครยังไม่รู้อะไร','Mikami, Takada, Light'],
 ['ตามรอยกิจวัตร','SPK examines the delegated notebook user’s repeated actions.','รักษาความแตกต่างระหว่างการเห็นสมุดกับการพิสูจน์สมุดจริง','Gevanni, Mikami, Near'],
 ['การหายตัวของ Takada','Mello and Matt’s intervention destabilizes the notebook arrangement.','บันทึกการเปลี่ยนแผนและผู้ที่ต้องลงมือโดยไม่มีคำสั่งเดิม','Takada, Mello, Matt, Mikami'],
 ['ก่อนถึงคลังสินค้า','The two investigations arrange a meeting while critical evidence remains concealed.','เตรียมการเผชิญหน้าด้วยข้อมูลที่ทีมตนมีจริง','Near, Light, Task Force, SPK'],
 ['Yellow Box','The notebook test at the warehouse exposes or changes the competing explanations.','ตรวจชื่อ หน้า สมุด และหลักฐานการสับเปลี่ยนจากสิ่งที่เกิดขึ้นจริง','Light, Near, Mikami, Matsuda'],
 ['โลกหลัง Kira','Survivors and institutions confront the consequences of the resolution.','สรุปผลที่เกิดขึ้นในเส้นเรื่องนี้โดยไม่รีเซ็ตผู้ตายหรือความทรงจำ','Surviving cast'],
];

const film = [
 ['สมุดกับนักศึกษากฎหมาย','Film Light’s dissatisfaction and notebook discovery begin the Japanese film continuity.','ตรวจการเริ่มใช้สมุดในบริบทของฉบับหนัง','Light, Ryuk, Shiori'],
 ['คำท้าทายออกอากาศ','The film’s Kira investigation takes shape around L’s broadcast test.','บันทึกขอบเขตที่ L พิสูจน์ได้','L, Lind L. Tailor'],
 ['ผู้ติดตามและข้อมูลส่วนตัว','Raye’s assignment and a bus encounter expose identifying information.','ติดตามข้อมูลที่เปิดเผยในการเฝ้าดู','Raye, Light'],
 ['Naomi กับ Shiori','Naomi’s confrontation intersects with Light’s girlfriend and his concealed plan.','รับมือการเผชิญหน้าตามเหตุที่เกิดขึ้นจริง','Naomi, Shiori, Light'],
 ['เข้าสู่ทีมสืบสวน','Light’s apparent loss and his entry into the team alter access and suspicion.','แยกภาพลักษณ์สาธารณะออกจากหลักฐานที่ทีมมี','Light, Soichiro, L'],
 ['Misa และความตายที่ช่วยไว้','The film introduces Misa, Rem and the second notebook’s history.','ติดตามความเป็นมาของสมุดและข้อตกลงดวงตา','Misa, Rem, Gelus'],
 ['Kiyomi แห่งฉบับภาพยนตร์','Kiyomi takes a notebook-related role different from her manga spokesperson arc.','ตรวจผลประโยชน์และร่องรอยของ Kiyomi ในฉบับหนัง','Kiyomi, Rem, Light'],
 ['ความทรงจำกับกฎสิบสามวัน','Ownership and forged rules shape what the team believes it has established.','แยกกฎปลอมออกจากผลที่เกิดจากสมุดจริง','Light, L, Misa, Ryuk'],
 ['การทดสอบครั้งสุดท้ายของ L','L’s film-specific strategy changes the apparent conditions of his defeat.','ตรวจหลักฐานและข้อจำกัดของแผนโดยไม่ใช้บทจบมังงะแทน','L, Watari, Light, Rem'],
 ['ชื่อสุดท้าย','The confrontation in The Last Name resolves the original film contest.','ยืนยันผลตามฉบับหนังและการแทรกแซงของผู้เล่น','Light, L, Soichiro, Ryuk'],
 ['เวลาที่เหลือของ L','Only after the original film resolution, L’s remaining days form a new investigation.','ยืนยันจุดเริ่มภารกิจและเวลาที่เหลือซึ่งเรื่องได้กำหนดไว้','L, F, Watari'],
 ['ผู้รอดชีวิตจาก Bangnum','A child and evidence from the bio-crisis reach the investigator.','คุ้มครองผู้รอดชีวิตและตรวจข้อมูลต้นทาง','L, F, Boy'],
 ['Maki กับงานของพ่อ','Nikaido’s work and Blue Ship’s objective put Maki in danger.','รักษาความปลอดภัยของเด็กและแยกข้อมูลวิทยาศาสตร์ที่ตรวจได้','Maki Nikaido, Kimihiko Nikaido, Kimiko Kujo'],
 ['Blue Ship','L pursues the group and the possibility of stopping a spreading fictional threat.','ติดตามเป้าหมายของกลุ่มโดยใช้การสืบสวน ไม่ให้ขั้นตอนสร้างอาวุธชีวภาพ','L, Kujo, Matoba, Suruga'],
 ['หยุดการเดินทางครั้งสุดท้าย','A transport crisis forces the plan toward its film resolution.','ช่วยผู้ที่อยู่ในอันตรายและยืนยันว่าภัยถูกยับยั้งจริง','L, Maki, Matsudo'],
 ['ส่งต่ออนาคต','L makes arrangements for the rescued child and the conclusion of his own remaining time.','บันทึกการส่งต่อและผลของช่วงเวลานี้โดยไม่ข้ามการยินยอมของผู้เล่น','L, Boy, Wammy’s House'],
 ['New Generation · ผู้สืบสวน','A confirmed ten-year time jump opens Mishima’s separate sequel-era case.','ยืนยันเวลาและสภาพคดีของทีมรุ่นใหม่','Mishima, Matsuda, Kuromoto'],
 ['New Generation · นักสืบ','The film successor Ryuzaki and his relation to Arma enter the case.','แยกผู้สืบทอดคนนี้ออกจาก L และ Near','Ryuzaki, Arma'],
 ['New Generation · ผู้ศรัทธา','Shien’s pursuit of Kira’s legacy develops through notebook possession.','ติดตามเครือข่ายของ Shien จากหลักฐานจริง','Shien, Ryuk'],
 ['สมุดทั้งหก','The sequel’s crisis concerns six notebooks and several owners.','ตรวจบัญชีสมุดทีละเล่มและผู้ครอบครองจริง','Mishima, Ryuzaki, Sakura Aoi, Bepo'],
 ['ร่องรอยของ Misa','The surviving film Misa and Matsuda connect the old case to the new one.','แยกความทรงจำ สิทธิ์ และการกลับมาเกี่ยวข้องของแต่ละคน','Misa, Matsuda, Shien'],
 ['ความทรงจำที่ถูกซ่อน','The investigation reaches the private identity history underlying the sequel conflict.','พิสูจน์การเปิดเผยตัวตนด้วยเหตุที่เกิดขึ้นจริง','Mishima, Hikari Yagami, Mikami'],
 ['ผู้สืบทอดคำว่าคิระ','The competing claimants confront the costs of their plans and the fate of the notebooks.','ยืนยันบทจบของฉบับหนังรุ่นใหม่โดยไม่ใช้ Yellow Box แทน','Mishima, Ryuzaki, Shien, Arma, Ryuk'],
];

const extras = {
 'another-note':[
  ['คำขอจาก L','Naomi receives an investigative request concerning the Los Angeles murders.','ยืนยันขอบเขตงานและข้อมูลที่ Naomi ได้รับ','Naomi, L'],
  ['คดี Believe Bridesmaid','The first scene supplies a staged pattern and incomplete physical evidence.','แยกสิ่งที่ตรวจพบออกจากความหมายที่คาดเดา','Naomi, Believe Bridesmaid'],
  ['Rue Ryuzaki','A peculiar self-styled detective offers help at a scene.','บันทึกชื่อที่อ้างและพฤติกรรมที่ตรวจได้','Naomi, Beyond Birthday'],
  ['คดี Quarter Queen','A second victim and the repeated pattern narrow the investigation.','วิเคราะห์ความสัมพันธ์ของหลักฐานโดยไม่บรรยายความรุนแรงเกินจำเป็น','Naomi, Quarter Queen'],
  ['คดี Backyard Bottomslash','Another scene changes the interpretation of the sequence.','เปรียบเทียบรหัสและช่วงเวลาที่มีหลักฐานรองรับ','Naomi, Backyard Bottomslash'],
  ['ชื่อที่ซ้อนอยู่','The investigator tests the assistant’s identity and the staged case’s hidden purpose.','ยืนยันข้อสงสัยเกี่ยวกับผู้ช่วยด้วยหลักฐาน','Naomi, Beyond Birthday, L'],
  ['ห้องสุดท้าย','The planned final locked-room incident can be interrupted before its intended outcome.','รับมืออันตรายปัจจุบันและรักษาพยานหลักฐาน','Naomi, Beyond Birthday'],
  ['บันทึกคดี BB','The resolved case leaves a record whose later framing belongs to Mello.','สรุปคดีตามผลจริงและเก็บตัวตนลับตามผู้ที่รู้','Naomi, L, Beyond Birthday'],
 ],
 'l-novel':[
  ['วันเวลาของนักสืบ','The novel’s L begins his remaining-time investigation in its separate continuity.','ยืนยันสถานการณ์ของฉบับนิยาย','L'],
  ['เด็กหญิงกับคดี','The novel’s Maki and the crisis around her father draw L into danger.','คุ้มครองผู้เกี่ยวข้องและรักษาข้อมูลต้นทาง','Maki, L'],
  ['Blue Ship ในฉบับนิยาย','The novel develops its own investigation and institutional connections.','ตรวจเส้นทางของหลักฐานตามฉบับนิยาย','L, Kujo, Robert Fairman'],
  ['รื้อแผนที่กำลังดำเนิน','L acts on verified findings to interrupt the threat.','ยืนยันว่าการหยุดแผนได้ผลจริงโดยไม่ให้รายละเอียดสร้างอาวุธ','L, Maki'],
  ['สิ่งที่นักสืบทิ้งไว้','The novel resolves its remaining-time premise without importing the film’s rescued-boy ending.','บันทึกบทสรุปของฉบับนิยายตามเหตุที่เกิดขึ้น','L, Maki'],
 ],
 'drama':[
  ['นักศึกษากับสมุด','The drama’s ordinary student Light finds a notebook after the circumstances involving Sakota.','ตรวจจุดเริ่มของฉบับซีรีส์','Light, Ryuk'],
  ['ครอบครัวที่แตกต่าง','Light’s relation to his police-officer father follows the drama’s family history.','ยืนยันความสัมพันธ์ตามฉบับนี้','Light, Soichiro, Sayu'],
  ['L เข้าสู่คดี','The drama’s L begins testing the source of the killings.','ติดตามการทดสอบและข้อมูลที่ส่งถึงแต่ละฝ่าย','L, Watari'],
  ['FBI และการติดตาม','Surveillance changes Light’s awareness of the investigation.','ตรวจผลของการเฝ้าดู','Light, Raye'],
  ['Misa ของฉบับซีรีส์','Misa and her notebook-related history enter the conflict.','แยกประวัติของ Misa ฉบับซีรีส์','Misa, Rem'],
  ['ความทรงจำกับผู้ใช้คนอื่น','Ownership changes redirect the investigation.','ติดตามความทรงจำและสมุดจริง','Light, L, Higuchi'],
  ['การได้ความทรงจำกลับ','The evidence around the notebook changes Light’s position.','ตรวจการคืนความทรงจำตามผู้ที่แตะสมุด','Light, L'],
  ['เงื่อนไขสุดท้ายของ L','The confrontation follows the drama’s own strategy and outcome.','ยืนยันเหตุของฉบับซีรีส์','L, Light'],
  ['การทรยศในทีม','Himura’s actions and a hostage crisis destabilize the investigation.','ติดตามฝ่ายที่เปลี่ยนข้างและความปลอดภัยของตัวประกัน','Shoko Himura, Sayu, Masaru Kamoda'],
  ['Near กับ Mello ของซีรีส์','The drama’s Near/Mello presentation shapes the final investigation.','รักษาความต่างจาก Near และ Mello สองคนในมังงะ','Near, Light, Mikami'],
  ['บทสรุปฉบับโทรทัศน์','The final confrontation resolves the drama’s own chain of evidence.','สรุปผลโดยไม่บังคับใช้บทจบอนิเมะหรือหนัง','Near, Light, Task Force'],
 ],
 'us-film':[
  ['สมุดใน Seattle','Light Turner encounters the notebook and Ryuk in the American film setting.','ตรวจข้อความกฎเฉพาะฉบับที่เรื่องยืนยัน','Light Turner, Ryuk'],
  ['Mia และคำว่าคิระ','Turner and Mia begin a collaboration whose motives are not identical.','บันทึกข้อตกลงจริงระหว่างผู้เกี่ยวข้อง','Light Turner, Mia Sutton'],
  ['L กับ James Turner','The deaths bring an investigation into the life of Light’s police-officer father.','ตรวจข้อมูลที่ L กับ James เข้าถึงได้','L, James Turner'],
  ['Watari และชื่อที่ตามหา','An attempt to obtain L’s identity uses the film’s own constraints.','แยกตัวตนที่พิสูจน์ได้ออกจากข้อสันนิษฐานเรื่องชื่อ','Watari, L, Light Turner'],
  ['ข้อเรียกร้องของ Mia','The partnership becomes a struggle over possession and control.','ยืนยันว่าผู้ถือสมุดกับผู้วางแผนเป็นใคร','Mia, Light Turner'],
  ['ชิงช้าสวรรค์','The film’s final plan uses conditional instructions and a source-specific page provision.','ตรวจลำดับเหตุของฉบับนี้โดยไม่ให้กฎเผากระดาษยกเลิกความตายข้ามฉบับ','Light Turner, Mia'],
  ['ผลที่ตามมาของแผน','Survivors confront the evidence and the remaining uncertainty.','บันทึกผลตามเหตุจริงในเส้นเรื่องอเมริกัน','Light Turner, James Turner, L, Ryuk'],
 ],
 'musical':[
  ['อุดมคติบนเวที','The stage Light confronts injustice before and after the notebook discovery.','ยืนยันจุดเริ่มของฉบับละครเวที','Light, Ryuk'],
  ['L ท้าทายคิระ','The stage investigation develops its own rhythm of public challenges and private inference.','ติดตามสิ่งที่แต่ละฝ่ายพิสูจน์ได้','L, Light'],
  ['Misa และ Rem','Misa’s devotion and Rem’s concern create a second line of pressure.','แยกแรงจูงใจของ Misa กับ Rem','Misa, Rem'],
  ['คู่แข่งที่เผชิญหน้า','Light and L meet while the investigation tightens.','ตรวจคำอ้างและการทดสอบระหว่างคู่แข่ง','Light, L'],
  ['ต้นทุนของการปกป้อง','Rem faces the particular pressure created by the stage plot.','ยืนยันเงื่อนไขที่นำสู่ทางเลือกของ Rem','Rem, Misa, L'],
  ['ตอนจบของละครเวที','The stage resolution differs from the manga’s later succession campaign.','ยืนยันผลของฉบับเวทีโดยไม่เรียก Near/Mello มาแทนตอนจบ','Light, L, Ryuk'],
 ],
 'c-kira':[
  ['สมุดของ Midora','A later notebook produces a new pattern of deaths after Light’s era.','ยืนยันว่าเป็นคดีใหม่ในช่วงเวลาที่ถูกต้อง','Midora, C-Kira'],
  ['คำตอบของ Near','Near evaluates the case without agreeing to replay the original rivalry.','แยกคำตอบต่อสาธารณะออกจากความรู้ส่วนตัว','Near, C-Kira'],
  ['ผู้ใช้ที่ไม่ถูกตั้งชื่อ','The case reaches its short-story resolution without granting an unverified birth name.','สรุปเหตุจริงและรักษาข้อมูลที่ต้นฉบับไม่ระบุ','C-Kira, Midora, Near'],
 ],
 'a-kira':[
  ['ข้อเสนอของ Ryuk','Ryuk approaches Minoru in the later technological setting.','ยืนยันข้อเสนอและเงื่อนไขที่ Minoru ได้รับรู้','Minoru, Ryuk'],
  ['การกลับมาตามกำหนด','Time and memory arrangements prepare Minoru’s alternative use of the notebook.','ติดตามเวลาที่ผ่านจริงและสิทธิ์ที่มีอยู่','Minoru, Ryuk'],
  ['การประมูลที่ไม่มีผู้ปรากฏตัว','The notebook is offered through indirect communication and a financial scheme.','แยกผู้ประมูล ผู้ถือสมุด และผู้ที่รู้ชื่อกัน','Minoru, Ryuk, broadcasters'],
  ['ผู้ประมูลระดับรัฐ','Public bids and political claims escalate the auction.','ตรวจข้อเสนอที่ยืนยันได้โดยไม่สร้างยอดเงินซ้ำ','Fictional presidents, Ryuk'],
  ['กฎที่เพิ่งถูกเพิ่ม','The King reacts to the sale with a new genuine rule.','ยืนยันเวลาที่กฎใหม่มีผล และไม่ใช้ย้อนหลังกับยุคก่อน','King of Death, Ryuk'],
  ['เงินกับราคาของข้อตกลง','The sale’s actual consequences resolve Minoru’s plan.','บันทึกการรับเงินและผลจริงโดยไม่สมมุติว่าทุกผู้ประมูลได้รับสมุด','Minoru, Ryuk'],
 ],
 'pilot':[
  ['สมุดต้นแบบ','Taro encounters the notebook in the prototype setting.','ยืนยันว่ากำลังเล่นฉบับ Pilot','Taro, Ryuk'],
  ['สิ่งที่ยางลบทำได้','The pilot introduces its own Death Eraser premise.','ตรวจข้อจำกัดจากเหตุจริงในฉบับนี้','Taro, Ryuk'],
  ['ผลของชื่อที่เขียน','Other people become involved in the notebook’s consequences.','ติดตามผู้ที่รู้เรื่องและวัตถุที่ถืออยู่จริง','Taro, Miura'],
  ['อนาคตของ Taro','The pilot resolves its own notebook story and later perspective.','สรุปเรื่องต้นแบบโดยไม่ส่งกฎฟื้นคืนชีพไปฉบับอื่น','Taro, Ryuk'],
 ],
 'spiraling-trap':[
  ['ติดอยู่ในโรงแรม','An investigator is trapped in the game’s isolated hotel case and communicates with L.','ยืนยันช่องทางติดต่อและสถานการณ์ที่ตรวจได้','FBI agent, L'],
  ['ห้องที่ต้องตรวจ','The participants examine the hotel and its timed trap structure.','เก็บข้อมูลจากห้องที่เปิดได้จริง','L, Alois Bateson, Niel Wray'],
  ['ตัวตนของผู้จัดฉาก','Verified clues connect the people and the trap’s purpose.','แยกคำอ้างของผู้เกี่ยวข้องออกจากหลักฐาน','Jeffrey Miller, Housekeeper, L'],
  ['ออกจากกับดัก','A verified solution allows the case to reach its game-specific resolution.','ยืนยันการรอดพ้นจากเหตุจริง ไม่แต่งรหัสปริศนาอ้างว่าเป็นต้นฉบับ','FBI agent, L'],
 ],
 'audio':[
  ['เปิดเรื่องฉบับละครเสียง','Choose the licensed audio interpretation and establish its social context.','ยืนยันฉบับที่ใช้และความต่างที่มีแหล่งอ้างอิง','Light, Ryuk'],
  ['คดีในมุมละครเสียง','Follow a verified adapted arc using its own expanded characterization.','ยืนยันเหตุการณ์จากฉบับที่ระบุ ไม่อ้างบทถอดเสียงที่ไม่มี','Light, L, Misa'],
  ['เส้นทางที่บันทึกไว้','Conclude the verified arc or continue freely without fabricating an official lost episode.','สรุปช่วงที่มีข้อมูลและเลือกทางเดินต่อของผู้เล่น','Current surviving cast'],
 ],
};

export const CHAPTERS = Object.fromEntries(ROUTES.map(r=>[r.id,
 (r.id==='manga'?main:r.id==='anime'?main.map((row,i)=>i===31?[row[0],'The anime’s warehouse revelation and Light’s attempted escape lead toward its distinct final scenes.',row[2],row[3]]:i===32?[row[0],'The anime closes through its own final imagery and surviving characters; do not append the printed manga’s one-year epilogue as an already witnessed event.',row[2],row[3]]:row):r.id==='jp-films'?film:extras[r.id]).map(([name,beat,objective,cast],i)=>({number:i+1,name,beat,objective,cast}))
]));

const flag=(target,value)=>({type:'flag',target,op:'eq',value});
const event=(target,description)=>({type:'event',target,description});
export function campaignTemplates(){
 const entries=[];
 for(const route of ROUTES){
  for(const chapter of CHAPTERS[route.id]){
   const n=String(chapter.number).padStart(2,'0'),prev=chapter.number-1;
   entries.push({
    id:`${route.id}-${n}`,revision:1,name:`${route.name.split(' · ')[0]} ${n} · ${chapter.name}`,kind:'mission',enabled:true,startMode:'offer',priority:Math.max(20,90-chapter.number),
    summary:`${chapter.name} — ${chapter.objective} ผู้เล่นเลือกไม่รับหรือเปลี่ยนเหตุการณ์ได้`,
    authorNotes:`CONTINUITY LOCK: ${route.id}. ${route.scope}\nSOURCE BEAT: ${chapter.beat}\nRELEVANT CAST: ${chapter.cast}. Retrieve only the applicable dossiers and current period.\nFaithful mode follows the source event order when its prerequisites still exist, using ORIGINAL dialogue and scene prose. A historical outline is not a report that the event happened. Never auto-kill, revive, capture, betray, spend for, romance or speak as the player to satisfy a chapter. Offer meaningful access for the player’s chosen role; an uninvolved civilian need not magically attend secret meetings.\nIf the player prevents a death, reveals a secret early, refuses a meeting or otherwise changes a prerequisite, record the divergence, put the blocked chapter aside and continue its real consequences. Do not repair the timeline by forcing the same death elsewhere. Future chapters remain blocked until their own actual prerequisites are satisfied. Do not import another adaptation as replacement plot. NPC autonomy and causality continue when a quest is declined.\nThis chapter grants a record of verified case progress, not public knowledge of every private secret. No fictional bank credit is issued merely for reading a mission.`,
    triggers:{match:'all',rules:[flag('continuity',route.id),flag('mode','canon'),...(prev?[{type:'quest',target:`${route.id}-${String(prev).padStart(2,'0')}`}]:[]),event('chapter-context',`The current visible story has reached this chapter’s own opening circumstances: ${chapter.beat} Earlier cause and time must be established.`)]},
    objectives:[{id:'evidence',title:chapter.objective,optional:false,notes:'Use only exact visible evidence from the current route and period. An outline or private reference is not evidence.'},{id:'consequences',title:'บันทึกผลและผลกระทบที่ยืนยันแล้ว',optional:false,notes:'Complete after an actual resolution, including a credible divergence. Do not mark a blocked or merely planned canonical event completed.'},{id:'personal-choice',title:'ตัดสินใจว่าจะเข้าเกี่ยวข้องกับคดีอย่างไร',optional:true,notes:'The player may help, investigate independently, refuse, remain an observer or oppose the expected side. Do not supply their decision.'}],
    reward:{experience:5,money:[],items:[],flags:[{id:`done-${route.id}-${n}`,value:true}],delivery:'complete',description:'บันทึกความคืบหน้าคดีจากเหตุที่เกิดขึ้นจริง'},
   });
  }
 }
 return{format:'roleforge-story-preset',version:1,id:PACK_ID,revision:1,name:'Death Note RPG · Separate continuities',entries};
}
