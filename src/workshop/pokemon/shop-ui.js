// Poké Mart window: Journey entry card, Buy/Sell lists, quantity sheet,
// receipt and the shop settings card. Trades go through the add-on's apply(),
// which journals the item change and saves the wallet in the same request.
import {shopAt,shopStock,sellRows,quote,walletBalance,walletSymbol,shopSettings,PRICE_RATES,MAX_TRADE} from './shop.js?v=0.95.0';
import {itemEffect,itemName} from './items.js?v=0.95.0';

const POCKETS=[['all','ทั้งหมด','All'],['balls','บอล','Poké Balls'],['medicine','ยา','Medicine'],['status','แก้สถานะ','Status'],['battle','ถือ/ต่อสู้','Battle'],['other','ของใช้','Other']];
const PER_PAGE=24;

export function createShopPanel({get,apply,render,navigate,showError}){
 let tab='buy',pocket='all',page=0,pick=null,qty=1,receipt=null,toast='',toastTimer=0,told='';
 const reset=()=>{pick=null;qty=1;receipt=null;toast='';told='';};
 const c=()=>get();
 const place=()=>c().state?.location?.place||'';
 const wallet=()=>c().state?.progression?.currency||null;
 const money=n=>{const sym=walletSymbol(wallet());return (sym||'')+Number(n||0).toLocaleString('en-US')+(sym?'':' '+(c().t('หน่วย','units')));};
 const current=()=>{const {game}=c();return game?shopAt(game,place()):null;};

 function pocketOf(id){const e=itemEffect(id);if(e.kind==='ball')return 'balls';if(e.kind==='medicine')return e.cure&&!e.hp&&!e.revive&&!e.fraction?'status':'medicine';if(e.kind==='held'||e.kind==='transformation-key')return 'battle';return 'other';}
 function describe(id){const {t}=c(),e=itemEffect(id);
  if(e.kind==='ball')return t('บอลสำหรับจับโปเกมอนป่า','Catches wild Pokémon');
  if(e.kind==='medicine'){if(e.revive)return t('ฟื้นจากหมดสภาพ','Revives a fainted Pokémon');if(e.hp==='full')return t('ฟื้น HP เต็ม','Fully restores HP');if(e.hp)return t('ฟื้น HP '+e.hp,'Restores '+e.hp+' HP');if(e.fraction)return t('ฟื้น HP บางส่วน','Restores some HP');if(e.pp)return t('ฟื้น PP','Restores PP');if(e.cure)return e.cure==='all'?t('แก้ทุกสถานะ','Cures any status'):t('แก้อาการ'+({poison:'พิษ',burn:'ไหม้',freeze:'แข็ง',sleep:'หลับ',paralysis:'อัมพาต'}[e.cure]||e.cure),'Cures '+e.cure);}
  if(e.kind==='held')return t('ไอเทมให้โปเกมอนถือ','Held item');
  return t('ของใช้ระหว่างเดินทาง','Field item');}

 // Journey card: shown only where a shop is open and no battle is running.
 function entry(){const {game,t,button,fa,esc}=c();const shop=current();if(!shop||game.battle)return '';const stock=shopStock(game,c().dex,shop);
  return '<section class="pk-shop-entry" aria-label="'+esc(shop.name)+'"><div class="pk-shop-entry-top"><span class="pk-eyebrow">'+t('ร้านในบริเวณนี้','SHOP NEARBY')+'</span><span class="pk-shop-open"><i aria-hidden="true"></i>'+t('เปิดอยู่','Open')+'</span></div><h2>'+esc(shop.name)+'</h2><p>'+t('มีของขาย '+stock.items.length+' รายการ','Sells '+stock.items.length+' items')+(stock.locked.length?t(' · ปลดล็อกเพิ่มด้วยเหรียญตรา',' · more unlock with badges'):'')+'</p>'+button(fa('cart-shopping')+' '+t('เข้าร้าน','Enter shop'),'nav','data-view="shop"','pk-shop-go')+'</section>';}

 function walletChip(){const {t}=c(),w=wallet();return '<div class="pk-shop-wallet" aria-label="'+t('กระเป๋าเงิน','Wallet')+'"><small>'+t('กระเป๋าเงิน','WALLET')+'</small><strong>'+(w?money(walletBalance(w)):'—')+'</strong></div>';}

 function closedView(head,body,icon){const {t,button,fa}=c();return '<div class="pk-shop-closed">'+fa(icon)+'<h2>'+head+'</h2><p>'+body+'</p>'+button(t('กลับหน้าการเดินทาง','Back to journey'),'nav','data-view="adventure"','pk-quiet')+'</div>';}

 function rowMarkup(r,mode){const {t,esc,itemSprite,game}=c(),have=game.inventory[r.id]||0,name=esc(itemName(c().dex,r.id));
  if(mode==='locked')return '<div class="pk-shop-row is-locked" aria-disabled="true"><span class="pk-shop-icon">'+itemSprite(r.id)+'</span><span class="pk-shop-copy"><strong>'+name+'</strong><small>'+t('ต้องมีเหรียญตรา '+r.need+' อัน','Needs '+r.need+' badges')+'</small></span><span class="pk-shop-price is-note">'+t('ล็อกอยู่','Locked')+'</span></div>';
  if(mode==='held')return '<div class="pk-shop-row is-locked" aria-disabled="true"><span class="pk-shop-icon">'+itemSprite(r.id)+'</span><span class="pk-shop-copy"><strong>'+name+'</strong><small>'+t(esc(c().monName(game.pokemon[r.holder]))+' ถืออยู่',esc(c().monName(game.pokemon[r.holder]))+' is holding it')+'</small></span><span class="pk-shop-price is-note">'+t('ขายไม่ได้','Not for sale')+'</span></div>';
  if(mode==='key')return '<div class="pk-shop-row is-locked" aria-disabled="true"><span class="pk-shop-icon">'+itemSprite(r.id)+'</span><span class="pk-shop-copy"><strong>'+name+'</strong><small>'+t('ของสำคัญ · มีอยู่ ','Key item · owned ')+have+'</small></span><span class="pk-shop-price is-note">'+t('ขายไม่ได้','Not for sale')+'</span></div>';
  const balance=walletBalance(wallet()),short=mode==='buy'&&r.price>balance;
  const sub=mode==='sell'?t('มีอยู่ ','Owned ')+have:short?t('เงินขาดอีก ','Short by ')+money(r.price-balance):describe(r.id)+' · '+t('มีอยู่ ','owned ')+have;
  return '<button type="button" class="pk-shop-row'+(short?' is-short':'')+'" data-pk-action="shop-pick" data-item="'+esc(r.id)+'"><span class="pk-shop-icon">'+itemSprite(r.id)+'</span><span class="pk-shop-copy"><strong>'+name+'</strong><small>'+sub+'</small></span><span class="pk-shop-price">'+(mode==='sell'?'+':'')+money(r.price)+(mode==='sell'?'<small>'+t('ต่อชิ้น','each')+'</small>':'')+'</span></button>';}

 function listView(shop){const {game,dex,t,button,fa}=c(),set=shopSettings(game);
  const rows=tab==='buy'?(()=>{const s=shopStock(game,dex,shop);return [...s.items.map(r=>({...r,mode:'buy'})),...s.locked.map(r=>({...r,mode:'locked'}))];})():sellRows(game,dex).map(r=>({...r,mode:r.reason==='held'?'held':r.reason==='key'?'key':'sell'}));
  const counts=rows.reduce((a,r)=>{const k=pocketOf(r.id);a[k]=(a[k]||0)+1;return a;},{all:rows.length}),pockets=POCKETS.filter(([id])=>id==='all'||counts[id]);if(!pockets.some(([id])=>id===pocket))pocket='all';
  const shown=rows.filter(r=>pocket==='all'||pocketOf(r.id)===pocket),pages=Math.max(1,Math.ceil(shown.length/PER_PAGE));page=Math.min(page,pages-1);
  const seg=set.sell?'<div class="pk-shop-tabs" role="tablist" aria-label="'+t('ซื้อหรือขาย','Buy or sell')+'">'+button(t('ซื้อ','Buy'),'shop-tab','role="tab" data-tab="buy" aria-selected="'+(tab==='buy')+'"')+button(t('ขาย','Sell'),'shop-tab','role="tab" data-tab="sell" aria-selected="'+(tab==='sell')+'"')+'</div>':'';
  const clerk=tab==='buy'?(set.premier&&shop.kind!=='specialty'?t('ซื้อ Poké Ball ครบ 10 ลูก แถม Premier Ball 1 ลูกนะคะ','Buy 10 Poké Balls and get a Premier Ball free.'):t('ยินดีต้อนรับค่ะ! วันนี้ต้องการอะไรดีคะ','Welcome! What can I get you today?')):t('ร้านรับซื้อครึ่งราคา ของสำคัญและของที่โปเกมอนถืออยู่ขายไม่ได้','We buy at half price. Key items and held items cannot be sold.');
  return '<div class="pk-shop-clerk"><span class="pk-shop-avatar" aria-hidden="true">'+fa('user')+'</span><p><b>'+t('พนักงานร้าน','CLERK')+'</b>'+clerk+'</p></div>'+seg
   +'<div class="pk-pockets" role="tablist" aria-label="'+t('ช่องกระเป๋า','Bag pockets')+'">'+pockets.map(([id,th,en])=>button(t(th,en)+'<small>'+(counts[id]||0)+'</small>','shop-pocket','role="tab" data-pocket="'+id+'" aria-selected="'+(pocket===id)+'"','pk-pocket')).join('')+'</div>'
   +(shown.length?'<div class="pk-shop-list">'+shown.slice(page*PER_PAGE,page*PER_PAGE+PER_PAGE).map(r=>rowMarkup(r,r.mode)).join('')+'</div>':'<p class="pk-muted pk-shop-empty">'+(tab==='sell'?t('ยังไม่มีของที่ขายได้','Nothing to sell yet'):t('ร้านนี้ยังไม่มีของขาย','This shop has nothing for sale'))+'</p>')
   +(pages>1?'<div class="pk-box-nav">'+button(fa('arrow-left'),'shop-page','data-step="-1" aria-label="'+t('หน้าก่อน','Previous page')+'"'+(page?'':' disabled'))+'<strong>'+(page+1)+' / '+pages+'</strong>'+button(fa('arrow-right'),'shop-page','data-step="1" aria-label="'+t('หน้าถัดไป','Next page')+'"'+(page+1<pages?'':' disabled'))+'</div>':'');}

 function sheet(shop){if(!pick)return '';const {game,dex,t,button,esc,itemSprite,mutating}=c(),balance=walletBalance(wallet()),q=quote(game,dex,shop,{kind:pick.kind,id:pick.id,quantity:qty,balance}),have=game.inventory[pick.id]||0;
  const max=Math.max(0,q.max||0),quick=[...new Set([1,5,10].filter(n=>n<=max).concat(max?[max]:[]))];
  const why={funds:t('เงินไม่พอ','Not enough money'),full:t('กระเป๋าเต็ม','Bag is full'),owned:t('มีของไม่พอ','You do not have that many'),stock:t('ร้านไม่มีของชิ้นนี้','Not sold here'),quantity:t('เลือกจำนวนก่อน','Choose a quantity')}[q.error]||'';
  const after=pick.kind==='buy'?balance-q.total:balance+q.total;
  return '<div class="pk-shop-scrim" data-pk-action="shop-close"></div><section class="pk-shop-sheet" role="dialog" aria-modal="true" aria-label="'+esc(itemName(dex,pick.id))+'"><span class="pk-shop-grab" aria-hidden="true"></span>'
   +'<div class="pk-shop-hero"><span class="pk-shop-hero-icon">'+itemSprite(pick.id)+'</span><div><span class="pk-eyebrow">'+t('มีอยู่ ','OWNED ')+have+'</span><h2>'+esc(itemName(dex,pick.id))+'</h2><p>'+describe(pick.id)+'</p></div></div>'
   +'<div class="pk-shop-stepper">'+button('−','shop-qty','data-step="-1" aria-label="'+t('ลดจำนวน','Fewer')+'"'+(qty<=1?' disabled':''))+'<output aria-live="polite">'+qty+'</output>'+button('+','shop-qty','data-step="1" aria-label="'+t('เพิ่มจำนวน','More')+'"'+(qty>=max?' disabled':''))+'</div>'
   +(quick.length?'<div class="pk-shop-quick">'+quick.map(n=>button(n===max&&n>10?t('สูงสุด ','Max ')+n:String(n),'shop-qty-set','data-q="'+n+'" aria-pressed="'+(qty===n)+'"')).join('')+'</div>':'')
   +(q.bonus?'<p class="pk-shop-bonus">'+itemSprite('premier-ball')+t('แถม Premier Ball '+q.bonus+' ลูก','Free Premier Ball ×'+q.bonus)+'</p>':'')
   +'<dl class="pk-shop-sum"><dt>'+t('ราคาต่อชิ้น','Price each')+'</dt><dd>'+money(q.price||0)+'</dd><dt>'+(pick.kind==='buy'?t('รวม','Total'):t('ได้รับ','You receive'))+'</dt><dd>'+money(q.total||0)+'</dd><dt>'+t('เงินคงเหลือหลังจากนี้','Balance after')+'</dt><dd>'+money(Math.max(0,after))+'</dd></dl>'
   +(why&&!q.ok?'<p class="pk-shop-why" role="alert">'+why+'</p>':'')
   +button(mutating?t('กำลังบันทึก…','Saving…'):(pick.kind==='buy'?t('ซื้อ ','Buy ')+qty+t(' ชิ้น · ',' · ')+money(q.total||0):t('ขาย ','Sell ')+qty+t(' ชิ้น · +',' · +')+money(q.total||0)),'shop-confirm',(!q.ok||mutating?'disabled':''),'pk-primary pk-shop-cta')
   +button(t('ยกเลิก','Cancel'),'shop-close','','pk-quiet pk-shop-cancel')+'</section>';}

 function receiptView(){const r=receipt,{t,button,dex,esc}=c();
  return '<section class="pk-shop-receipt" aria-live="polite"><span class="pk-shop-ok" aria-hidden="true">✓</span><span class="pk-eyebrow">'+t('ซื้อสำเร็จ','PURCHASE COMPLETE')+'</span><h2>'+t('ขอบคุณที่ใช้บริการ!','Thank you for shopping!')+'</h2>'
   +'<dl class="pk-shop-sum"><dt>'+esc(itemName(dex,r.id))+' × '+r.quantity+'</dt><dd>'+money(r.total)+'</dd>'+(r.bonus?'<dt>Premier Ball × '+r.bonus+t(' (ของแถม)',' (free)')+'</dt><dd>'+money(0)+'</dd>':'')+'<dt>'+t('เงินคงเหลือ','Balance')+'</dt><dd>'+money(walletBalance(wallet()))+'</dd><dt>'+t('ในกระเป๋าตอนนี้','Now in bag')+'</dt><dd>'+esc(itemName(dex,r.id))+' '+(c().game.inventory[r.id]||0)+(r.bonus?' · Premier Ball '+(c().game.inventory['premier-ball']||0):'')+'</dd></dl>'
   +button(t('ซื้อต่อ','Keep shopping'),'shop-again','','pk-primary')+button(told?t('ใส่ในช่องพิมพ์แล้ว','Added to your message'):t('เล่าการซื้อในเนื้อเรื่อง','Mention it in the story'),'shop-tell',told?'disabled':'','pk-quiet')+'</section>';}

 function view(){const {game,t,sectionHead,esc}=c();if(!game?.started)return null;
  const set=shopSettings(game);
  if(!set.enabled)return sectionHead('POKÉ MART',t('ร้านค้าปิดอยู่','Shop is turned off'))+closedView(t('ปิดร้านค้าไว้ในตั้งค่า','The shop is off in Settings'),t('เปิดได้ที่ ตั้งค่า > ร้านค้าและเงินรางวัล','Turn it on in Settings > Shop & prize money.'),'store');
  const shop=current();
  if(!shop){const last=(game.shopsVisited||[]).at(-1);return sectionHead('POKÉ MART',t('ไม่มีร้านในบริเวณนี้','No shop here'))+closedView(t('ไม่มีร้านในบริเวณนี้','There is no shop here'),(place()?esc(place())+t(' ไม่มี Poké Mart',' has no Poké Mart'):t('ยังไม่รู้ตำแหน่งปัจจุบัน','Your location is not known yet'))+(last?t(' · ร้านล่าสุดที่เคยไปคือ ',' · The last shop you visited was ')+esc(last.name):t(' · ร้านอยู่ในเมืองและหมู่บ้าน',' · Shops are in cities and towns')),'map-location-dot');}
  if(game.battle)return sectionHead(esc(shop.place||'POKÉ MART'),esc(shop.name))+closedView(t('ร้านปิดชั่วคราว','The shop is closed for now'),t('ซื้อขายระหว่างการต่อสู้ไม่ได้ กลับมาหลังการต่อสู้จบ','You cannot trade during a battle. Come back when it ends.'),'bolt');
  return '<div class="pk-shop" data-pk-shop-kind="'+shop.kind+'">'+sectionHead(esc(shop.place||'POKÉ MART'),esc(shop.name),walletChip())+(receipt?receiptView():listView(shop))+(toast?'<p class="pk-shop-toast" role="status">'+toast+'</p>':'')+sheet(shop)+'</div>';}

 function setToast(text){toast=text;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast='';render();},2600);}

 async function confirm(){const {game,dex,t}=c(),shop=current();if(!pick||!shop)return;const balance=walletBalance(wallet()),q=quote(game,dex,shop,{kind:pick.kind,id:pick.id,quantity:qty,balance});if(!q.ok){render();return;}
  const kind=pick.kind,id=pick.id,quantity=qty;
  try{const event=await apply({type:kind==='buy'?'shop-buy':'shop-sell',shop:{id:shop.id,name:shop.name,place:shop.place,kind:shop.kind},item:id,quantity,price:q.price,total:q.total,bonus:q.bonus||0,pin:true});if(!event)return;
   pick=null;qty=1;if(kind==='buy'){receipt={id,quantity,total:q.total,bonus:q.bonus||0,shop:shop.name};told='';}else setToast(t('ขายแล้ว ','Sold ')+itemName(dex,id)+' × '+quantity+' · +'+money(q.total));render();}
  catch(error){showError(error);}}

 function tell(){if(!receipt)return;const {t,dex}=c(),line=t('ซื้อ '+itemName(dex,receipt.id)+' '+receipt.quantity+' ชิ้นที่ '+receipt.shop,'Bought '+receipt.quantity+' × '+itemName(dex,receipt.id)+' at '+receipt.shop)+'.';const box=document.getElementById('send_textarea');if(!box)return;box.value=box.value.trim()?box.value.replace(/\s*$/u,'\n')+line:line;box.dispatchEvent(new Event('input',{bubbles:true}));told=line;render();}

 async function handle(b){const action=b.dataset.pkAction;if(!action?.startsWith('shop-'))return false;const {game,dex}=c();
  if(action==='shop-tab'){tab=b.dataset.tab==='sell'?'sell':'buy';page=0;pocket='all';reset();render();return true;}
  if(action==='shop-pocket'){pocket=b.dataset.pocket||'all';page=0;render();return true;}
  if(action==='shop-page'){page=Math.max(0,page+Number(b.dataset.step||0));render();return true;}
  if(action==='shop-pick'){pick={id:b.dataset.item,kind:tab};receipt=null;const q=quote(game,dex,current(),{kind:tab,id:pick.id,quantity:1,balance:walletBalance(wallet())});qty=q.max>=1?1:1;render();c().root?.querySelector('.pk-shop-sheet [data-pk-action=shop-confirm]:not([disabled]),.pk-shop-sheet [data-pk-action=shop-close]')?.focus({preventScroll:true});return true;}
  if(action==='shop-qty'){const q=quote(game,dex,current(),{kind:pick?.kind,id:pick?.id,quantity:qty,balance:walletBalance(wallet())});qty=Math.max(1,Math.min(Math.max(1,q.max||1),qty+Number(b.dataset.step||0)));render();return true;}
  if(action==='shop-qty-set'){qty=Math.max(1,Math.min(MAX_TRADE,Number(b.dataset.q)||1));render();return true;}
  if(action==='shop-close'){pick=null;qty=1;render();return true;}
  if(action==='shop-confirm'){await confirm();return true;}
  if(action==='shop-again'){receipt=null;told='';render();return true;}
  if(action==='shop-tell'){tell();return true;}
  if(action==='shop-setting'){const key=b.dataset.key,set=shopSettings(game);if(!(key in set)||typeof set[key]!=='boolean')return true;try{await apply({type:'settings',shop:{[key]:!set[key]}});}catch(error){showError(error);}return true;}
  return false;}

 function settingsCard({card,row,toggle}){const {game,t,mutating,working}=c(),set=shopSettings(game);
  return card('store',t('ร้านค้าและเงินรางวัล','Shop & prize money'),
   row(t('ร้านค้า Poké Mart','Poké Mart'),t('ซื้อขายไอเทมในเมืองหรือร้านที่เนื้อเรื่องพาไป ใช้เงินจากกระเป๋าเงิน RoleForge','Buy and sell in towns and story shops with your RoleForge wallet'),toggle('shop-setting',set.enabled,t('ร้านค้า','Shop'),'data-key="enabled"'))
   +row(t('เงินรางวัลจากเทรนเนอร์','Trainer prize money'),t('เลเวลสูงสุดของคู่แข่ง × 40 (หัวหน้ายิม 100 · Elite Four/แชมป์ 200)','Top opponent level × 40 (Gym Leader 100 · Elite Four/Champion 200)'),toggle('shop-setting',set.prize,t('เงินรางวัล','Prize money'),'data-key="prize"'))
   +row(t('แพ้แล้วเสียเงิน','Pay when you lose'),t('เสียครึ่งหนึ่งของเงินรางวัลที่จะได้ถ้าชนะ','Lose half of what the win would have paid'),toggle('shop-setting',set.penalty,t('แพ้แล้วเสียเงิน','Pay when you lose'),'data-key="penalty"'))
   +row(t('แถม Premier Ball','Premier Ball bonus'),t('ซื้อ Poké Ball ครบทุก 10 ลูก แถม 1 ลูก','One free for every 10 Poké Balls'),toggle('shop-setting',set.premier,'Premier Ball','data-key="premier"'))
   +row(t('ขายของให้ร้าน','Sell to shops'),t('ร้านรับซื้อครึ่งราคา','Shops pay half price'),toggle('shop-setting',set.sell,t('ขายของ','Selling'),'data-key="sell"'))
   +row(t('เปิดร้านได้ทุกที่','Shop anywhere'),t('โหมด Sandbox: ของทุกชิ้นที่มีราคา ใช้ได้ทุกสถานที่','Sandbox: every priced item, in any place'),toggle('shop-setting',set.anywhere,t('เปิดร้านได้ทุกที่','Shop anywhere'),'data-key="anywhere"'))
   +'<label class="pk-scenery-label" for="pk-shop-rate">'+t('ราคาสินค้า','Prices')+'</label><select id="pk-shop-rate" data-pk-shop-rate'+(mutating||working?' disabled':'')+'>'+PRICE_RATES.map(n=>'<option value="'+n+'"'+(set.rate===n?' selected':'')+'>×'+n+(n===1?t(' · ราคามาตรฐาน',' · standard'):'')+'</option>').join('')+'</select>');}

 return {entry,render:v=>v==='shop'?view():null,handle,settingsCard,available:()=>{const {game}=c();return game&&!game.battle?current():null;},reset,changeRate:value=>apply({type:'settings',shop:{rate:Number(value)}})};
}
