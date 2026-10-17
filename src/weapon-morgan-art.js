// Approved Morgan source art stays unchanged. Alpha masks add a blade-only aura
// behind it; opaque black metal and the hilt never become a flat red beam.
export function createMorganBlade({image,document:doc=image.ownerDocument}={}){
 const W=2172,H=724,TAU=Math.PI*2;
 let key='',mask=null,runes=null,occluder=null;
 function materials(){
  if(mask&&key===image.src)return;
  mask=doc.createElement('canvas');mask.width=W;mask.height=H;const m=mask.getContext('2d');
  m.save();m.beginPath();m.rect(520,275,W-520,190);m.clip();m.drawImage(image,0,0,W,H);m.restore();
  m.globalCompositeOperation='source-in';m.fillStyle='#f00029';m.fillRect(0,0,W,H);
  runes=doc.createElement('canvas');runes.width=W;runes.height=H;const r=runes.getContext('2d',{willReadFrequently:true});
  r.drawImage(image,0,0,W,H);const pixels=r.getImageData(0,0,W,H),p=pixels.data;
  occluder=doc.createElement('canvas');occluder.width=W;occluder.height=H;const o=occluder.getContext('2d'),opaque=o.createImageData(W,H),v=opaque.data;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   const i=(y*W+x)*4,a=p[i+3];v[i+3]=a>=180?255:0;
   p[i+3]=x>=520&&y>=275&&y<=465?a*Math.max(0,Math.min(1,(p[i]-Math.max(p[i+1],p[i+2])*1.6)/190)):0;
   p[i]=255;p[i+1]=0;p[i+2]=37;
  }
  r.putImageData(pixels,0,0);o.putImageData(opaque,0,0);key=image.src;
 }
 return {draw(ctx,{strength=0,time=0,scale=1,dpr=1}={}){
  materials();const power=strength*(.94+.06*Math.sin(TAU*time/2));
  if(power>0){
   ctx.save();ctx.beginPath();ctx.rect(520,0,W-520,H);ctx.clip();
   for(const [blur,alpha,color]of [[76,.38,'#b70027'],[37,.67,'#e30029'],[13,.8,'#ff143b']]){
    ctx.save();ctx.globalAlpha=alpha*power;ctx.shadowColor=color;ctx.shadowBlur=blur*scale*dpr;ctx.drawImage(mask,0,0);ctx.restore();
   }
   ctx.restore();ctx.save();ctx.globalCompositeOperation='destination-out';ctx.drawImage(occluder,0,0);ctx.restore();
  }
  ctx.drawImage(image,0,0,W,H);
  if(power>0){ctx.save();ctx.globalAlpha=.17*power;ctx.shadowColor='#f90032';ctx.shadowBlur=9*scale*dpr;ctx.drawImage(runes,0,0);ctx.restore();}
 }};
}
