import {weaponModelUrl} from './weapon-catalog.js?v=0.85.2';
import {createMorganBlade} from './weapon-morgan-art.js?v=0.85.2';
// The approved reference art uses separate, state-driven light/rotation layers.
// Generic and custom art remain ordinary images; only built-in art enters Canvas.
 const TAU=Math.PI*2,WIDTH=2172,HEIGHT=724;
 // This path controls light only. It never clips the sword photograph.
 const blade=new Path2D('M366 22 C352 51 339 85 338 120 L325 756 L328 783 L359 754 L394 787 L393 117 C391 78 380 44 366 22 Z');
 const hilt=new Path2D('M17 122 Q31 81 67 63 L95 76 L139 99 L272 99 L339 65 L360 44 Q368 34 382 52 L418 40 L447 57 L459 50 L549 90 L637 160 L591 170 L552 155 L501 176 L444 178 L329 240 L322 179 L202 245 L206 226 L248 168 L268 139 L161 137 L110 139 L87 134 L49 133 Z');
 const tip=new Path2D('M1135 91 L1150 87 L1167 99 L1176 131 L1167 136 L1149 127 Z');

const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function createWeaponArt({stage,image,document:doc=stage.ownerDocument}={}){
 const win=doc.defaultView,global={document:doc},canvas=doc.createElement('canvas');canvas.className='rf-weapon-canvas';canvas.setAttribute('aria-hidden','true');canvas.hidden=true;stage.append(canvas);
 const ctx=canvas.getContext('2d'),media=win.matchMedia('(prefers-reduced-motion: reduce)');
 let weapon=null,scale=1,dpr=1,dx=0,dy=0,frame=0,removed=false,start=0,sprite=null,atlas=null,atlasKey='',failedImage='',manual=false;
 const morgan=createMorganBlade({image,document:doc});
 const special=()=>weapon&&['excalibur','ea','excalibur-morgan'].includes(weapon.modelId)&&weapon.image!==failedImage;
 function resize(){const b=image.getBoundingClientRect(),p=stage.getBoundingClientRect();if(!b.width||!b.height)return;canvas.style.left=(b.left-p.left)+'px';canvas.style.top=(b.top-p.top)+'px';canvas.style.width=b.width+'px';canvas.style.height=b.height+'px';dpr=Math.min(win.devicePixelRatio||1,2.5);const w=Math.round(b.width*dpr),h=Math.round(b.height*dpr);if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;scale=Math.min(b.width/WIDTH,b.height/(weapon?.modelId==='excalibur-morgan'?450:HEIGHT));dx=(b.width-WIDTH*scale)/2;dy=(b.height-HEIGHT*scale)/2;}
 function clear(){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);}
 function begin(){clear();ctx.setTransform(scale*dpr,0,0,scale*dpr,dx*dpr,dy*dpr);}
  function materials(){
   const key=image.src.split('#')[0];if(sprite&&key===atlasKey)return;
   const isEa=weapon.modelId==='ea',w=isEa?1200:image.naturalWidth,h=isEa?248:image.naturalHeight;
   sprite=global.document.createElement('canvas');sprite.width=w;sprite.height=h;
   const s=sprite.getContext('2d',{willReadFrequently:true});s.drawImage(image,0,0,w,h);
   const pixels=s.getImageData(0,0,w,h),p=pixels.data;
   // A UI sprite key removes only background connected to the image border;
   // enclosed black calligraphy and engraving are retained. JPEGs stay unchanged.
   const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
   const background=i=>{const k=i*4,r=p[k],g=p[k+1],b=p[k+2],max=Math.max(r,g,b),min=Math.min(r,g,b);return h===248?max<37:max<60&&max-min<18;};
   const add=i=>{if(i<0||i>=seen.length||seen[i]||!background(i))return;seen[i]=1;queue[tail++]=i;};
   for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
   while(head<tail){const i=queue[head++],x=i%w,y=(i-x)/w;if(x)add(i-1);if(x<w-1)add(i+1);if(y)add(i-w);if(y<h-1)add(i+w);}
   for(let i=0;i<seen.length;i++)if(seen[i])p[i*4+3]=0;
   if(h===248){
    atlas=global.document.createElement('canvas');atlas.width=w;atlas.height=h;
    const a=atlas.getContext('2d'),red=a.createImageData(w,h),v=red.data;
    for(let i=0;i<p.length;i+=4){v[i]=p[i];v[i+1]=p[i+1];v[i+2]=p[i+2];v[i+3]=255*Math.max(0,Math.min(1,(p[i]-Math.max(p[i+1],p[i+2])*1.45)/25));if(p[i]>p[i+1]*1.6&&p[i]>p[i+2]*1.4)p[i+3]=0;}
    a.putImageData(red,0,0);
   }
   s.putImageData(pixels,0,0);atlasKey=key;
  }
  function excalibur(strength,t){
   materials();
   // Front elevation, a quarter-turn, and ONE uniform scale. Perspective from
   // the old diagonal photo is gone. There is no hand-traced silhouette mask.
   ctx.save();ctx.translate(110,362);ctx.rotate(Math.PI/2);ctx.scale(1.7,1.7);ctx.translate(-360,-1181);
   // The broad rectangle removes only the photo frame, with margin outside the
   // whole sword. Both curved guard arms, the tip and pommel stay in the sprite.
   // Halo is behind the original photograph; opaque light never hides its art.
   if(strength>0){
    ctx.save();const pulse=strength*(.91+.09*Math.sin(TAU*t/2));ctx.globalAlpha=pulse;
    ctx.shadowColor='#ffd272';ctx.shadowBlur=68*scale*dpr;
    ctx.fillStyle='#ffe49baa';ctx.fill(blade);ctx.shadowBlur=22*scale*dpr;ctx.fill(blade);ctx.restore();
   }
   ctx.save();ctx.beginPath();ctx.rect(210,10,300,1177);ctx.clip();
   ctx.drawImage(sprite,0,0,image.naturalWidth,image.naturalHeight);ctx.restore();
   // The quiet blade dims; at full power its original white/gold pixels and
   // white engraved script remain intact, rather than becoming a flat beam.
   ctx.save();ctx.clip(blade);ctx.filter=`brightness(${.84+.16*strength})`;
   ctx.drawImage(sprite,0,0,image.naturalWidth,image.naturalHeight);ctx.restore();
   ctx.restore();
  }
  function referenceTexture(){
   materials();return atlas;
  }
  function cylinder(x0,x1,top,bottom,phase,strength){
   const cy=(top+bottom)/2,r=(bottom-top)/2,length=x1-x0,body=new Path2D();
   body.rect(x0,top,length,bottom-top);
   if(strength>0){ctx.save();ctx.shadowColor='#e71421';ctx.shadowBlur=23*scale*dpr;ctx.fillStyle=`rgba(202,0,10,${strength*.2})`;ctx.fill(body);ctx.restore();}
   ctx.save();ctx.clip(body);
   const black=ctx.createLinearGradient(0,top,0,bottom);black.addColorStop(0,'#030204');black.addColorStop(.25,'#26080b');black.addColorStop(.52,'#180308');black.addColorStop(1,'#030204');ctx.fillStyle=black;ctx.fill(body);
   const texture=referenceTexture(),step=.5;
   for(let y=top;y<bottom;y+=step){
    const v=Math.max(-1,Math.min(1,((y+step/2)-cy)/r)),angle=Math.asin(v);
    const sample=cy+Math.sin(angle-phase)*(r-.65);
    ctx.globalAlpha=(.86+.14*Math.sqrt(1-v*v))*(.8+.2*strength);
    ctx.drawImage(texture,x0,sample,length,.7,x0,y,length,step+.04);
   }
   ctx.globalAlpha=1;ctx.strokeStyle='#080305';ctx.lineWidth=1.3;ctx.stroke(body);ctx.restore();
   ctx.save();ctx.strokeStyle='#702832';ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(x1,cy,1.5,r-.8,0,0,TAU);ctx.stroke();ctx.restore();
  }
  function ea(strength,phase){
   // Hilt -> lower, middle, upper -> tip. Upper and lower have identical signed
   // angular velocity. Only the middle receives the opposite sign.
   ctx.save();ctx.translate(0,140);ctx.scale(1.8,1.8);
   cylinder(495,651,79,142,phase,strength);
   cylinder(651,919,80,141,-phase,strength);
   cylinder(919,1144,83,139,phase,strength);
   ctx.save();ctx.clip(hilt);ctx.drawImage(sprite,0,0,1200,248);ctx.restore();
   ctx.save();ctx.clip(tip);ctx.drawImage(sprite,0,0,1200,248);ctx.restore();
   ctx.restore();
  }

 function paint(time,active=weapon?.active){
  const isSpecial=special();canvas.hidden=!isSpecial;stage.classList.toggle('has-special-art',Boolean(isSpecial));
  if(!isSpecial||!image.complete||!image.naturalWidth)return;
  const reduced=media.matches,strength=active?(reduced?1:smooth(time/.8)):0,phase=active&&!reduced?TAU*time/1.8:0;
  begin();if(weapon.modelId==='excalibur')excalibur(strength,reduced?0:time);else if(weapon.modelId==='excalibur-morgan')morgan.draw(ctx,{strength,time:reduced?0:time,scale,dpr});else ea(strength,phase);
 }
 function tick(now){frame=0;if(removed||manual)return;const visible=stage.getBoundingClientRect().height>0&&!doc.hidden;if(visible)paint((now-start)/1000);if(visible&&special()&&weapon.active&&!media.matches)frame=win.requestAnimationFrame(tick);}
 function wake(){if(!removed&&!manual&&!frame)frame=win.requestAnimationFrame(tick);}
 const size=new win.ResizeObserver(()=>{resize();wake();});size.observe(stage);size.observe(image);
 const loaded=()=>{if(!weapon)return;resize();wake();};const errored=()=>{if(!weapon)return;failedImage=weapon.image;canvas.hidden=true;stage.classList.remove('has-special-art');const fallback=weaponModelUrl(weapon.category);if(image.getAttribute('src')!==fallback)image.src=fallback;};
 image.addEventListener('load',loaded);image.addEventListener('error',errored);media.addEventListener('change',wake);doc.addEventListener('visibilitychange',wake);
 return{
  update(next){const changed=weapon?.itemId!==next?.itemId||weapon?.modelId!==next?.modelId||weapon?.active!==next?.active;weapon=next;manual=false;if(changed){start=win.performance.now();clear();}if(!next){image.removeAttribute('src');canvas.hidden=true;stage.classList.remove('has-special-art');if(frame)win.cancelAnimationFrame(frame);frame=0;return;}image.alt=next.name;const src=next.image===failedImage?weaponModelUrl(next.category):next.image;if(image.getAttribute('src')!==src)image.src=src;canvas.hidden=!special();stage.classList.toggle('has-special-art',Boolean(special()));resize();wake();},
  sample(time,active=true){manual=true;if(frame)win.cancelAnimationFrame(frame);frame=0;resize();paint(time,active);},
  destroy(){removed=true;weapon=null;if(frame)win.cancelAnimationFrame(frame);size.disconnect();image.removeEventListener('load',loaded);image.removeEventListener('error',errored);media.removeEventListener('change',wake);doc.removeEventListener('visibilitychange',wake);canvas.remove();stage.classList.remove('has-special-art');},
 };
}
