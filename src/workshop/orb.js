// Procedural wire sphere. No video, raster asset, or third-party animation.
export function paintSageOrb(canvas,{time=0,motion=true,activity={},waiting=false,theme='prismatic',mini=false}={}){
 const ctx=canvas.getContext('2d'),box=canvas.getBoundingClientRect();if(!ctx||!box.width||!box.height)return;
 const ratio=Math.min(devicePixelRatio||1,mini?1.5:1.8),w=box.width,h=box.height;
 if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);}
 ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);
 const t=motion?time/1000:8,speaking=activity.speaking===true,raw=activity.metered?activity.level:(.2+Math.sin(t*9)*.12),energy=motion?Math.max(0,Number.isFinite(activity.visualLevel)?activity.visualLevel:speaking?raw:0):0;
 const cx=w/2,cy=h/2,r=Math.min(w*(mini?.285:.255),h*(mini?.285:.31))*(1+energy*.12+(motion?Math.sin(t*.8)*.006:0)),azure=theme==='azure';
 for(const[k,v]of Object.entries({speaking:String(speaking),energy:energy.toFixed(3),metered:String(activity.metered===true)}))if(canvas.dataset[k]!==v)canvas.dataset[k]=v;
 const rgba=(rgb,a)=>`rgba(${rgb},${Math.min(1,a)})`,mint='153,235,213',ice='191,228,248';
 function glow(x,y,radius,color,alpha){const g=ctx.createRadialGradient(x,y,0,x,y,radius);g.addColorStop(0,rgba(color,alpha));g.addColorStop(.35,rgba(color,alpha*.36));g.addColorStop(1,rgba(color,0));ctx.fillStyle=g;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);}
 ctx.globalCompositeOperation='screen';
 glow(cx,cy,r*2.7,azure?'86,170,215':'71,171,151',mini?.19:.17+energy*.19);
 if(!mini){
  const orbit=t*.055;
  for(let i=0;i<6;i++){const a=i*Math.PI/3+orbit,colors=azure?['95,177,245','145,211,233']:['87,215,173','178,207,83','65,191,210','83,136,231','201,148,211','187,222,145'];glow(cx+Math.cos(a)*r*1.13,cy+Math.sin(a)*r*.75,r*(.72+Math.sin(t*.17+i)*.08),colors[i%colors.length],.24+energy*.06);}
  const far=Math.hypot(w,h)*.65;
  for(let i=0;i<46;i++){
   const angle=i*2.39996+t*.006,inner=r*(.86+(i%5)*.08),outer=far*(.66+(i%9)*.038),a=.04+(i%4)*.014+energy*.035;
   ctx.lineWidth=i%8===0?1:.5;ctx.strokeStyle=rgba(i%4===0?mint:ice,a);ctx.beginPath();ctx.moveTo(cx+Math.cos(angle)*inner,cy+Math.sin(angle)*inner);ctx.lineTo(cx+Math.cos(angle)*outer,cy+Math.sin(angle)*outer);ctx.stroke();
   const travel=(t*(waiting?.18:.055)+i*.618)%1,dist=inner+(outer-inner)*travel;
   ctx.fillStyle=rgba(ice,(1-travel)*.24);const size=i%4===0?2:1;ctx.fillRect(cx+Math.cos(angle)*dist,cy+Math.sin(angle)*dist,size,size);
  }
 }
 const yaw=t*(waiting?.28:.095),tilt=.28+Math.sin(t*.07)*.11;
 function project(x,y,z,extra=0){const turn=yaw+extra,x1=x*Math.cos(turn)+z*Math.sin(turn),z1=z*Math.cos(turn)-x*Math.sin(turn),y1=y*Math.cos(tilt)-z1*Math.sin(tilt),z2=y*Math.sin(tilt)+z1*Math.cos(tilt),scale=4.5/(4.5+z2);return[cx+x1*r*scale,cy+y1*r*scale,z2];}
 function stroke(points,color,alpha,width=.6,close=false){ctx.strokeStyle=rgba(color,alpha);ctx.lineWidth=width;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));if(close)ctx.closePath();ctx.stroke();}
 const segments=mini?40:88,latitudes=mini?6:10,longitudes=mini?10:20;
 for(let i=1;i<latitudes;i++){
  const lat=-Math.PI/2+Math.PI*i/latitudes,points=[];for(let j=0;j<=segments;j++){const a=j*Math.PI*2/segments;points.push(project(Math.cos(lat)*Math.cos(a),Math.sin(lat),Math.cos(lat)*Math.sin(a)));}
  stroke(points,'213,242,237',.32+energy*.16,mini?.5:.62);
 }
 for(let i=0;i<longitudes;i++){
  const a=i*Math.PI*2/longitudes,points=[];for(let j=0;j<=segments;j++){const lat=-Math.PI/2+j*Math.PI/segments;points.push(project(Math.cos(lat)*Math.cos(a),Math.sin(lat),Math.cos(lat)*Math.sin(a)));}
  stroke(points,'214,239,237',i%4===0?.65:.3,mini?.45:.6);
 }
 for(let band=0;band<(mini?2:4);band++){
  const angle=t*(band%2?-.075:.065)+band*.86,rad=1.08+band*.105,points=[];
  for(let j=0;j<=segments;j++){
   const a=j*Math.PI*2/segments,x=Math.cos(a)*rad,y=Math.sin(a)*rad*.5,z=Math.sin(a)*rad*.87;
   points.push(project(x*Math.cos(angle)-y*Math.sin(angle),x*Math.sin(angle)+y*Math.cos(angle),z,band*.35));
  }
  stroke(points,band%2?mint:'230,246,241',band===0?.52:.24,band===0?1.1:.55);
 }
 const tickCount=mini?24:64;
 for(let i=0;i<tickCount;i++){
  const a=i*Math.PI*2/tickCount-t*.045,length=i%4===0?.07:.022,rr=1.055;
  stroke([[cx+Math.cos(a)*r*rr,cy+Math.sin(a)*r*rr],[cx+Math.cos(a)*r*(rr+length),cy+Math.sin(a)*r*(rr+length)]],'221,244,238',i%4===0?.6:.3,.65);
 }
 if(!mini){
  for(let i=0;i<16;i++){const a=i*2.39996+t*.07,z=Math.sin(i*5),p=project(Math.cos(a)*.96,Math.sin(a)*.96,z*.22);ctx.fillStyle=rgba('232,255,246',.3+(i%4)*.13);ctx.fillRect(p[0]-1,p[1]-1,1.5,1.5);}
  if(speaking&&motion){for(let i=0;i<3;i++){const age=(t*.72+i/3)%1;ctx.beginPath();ctx.ellipse(cx,cy,r*(1.05+age*.65),r*(1.05+age*.65),0,0,Math.PI*2);ctx.strokeStyle=rgba(mint,(1-age)*energy*.22);ctx.lineWidth=.8;ctx.stroke();}}
 }
 glow(cx,cy,r*(.68+energy*.4),'136,231,211',.34+energy*.32);
 glow(cx,cy,r*(.35+energy*.17),'231,255,248',.65+energy*.25);
 glow(cx,cy,r*.115,'255,255,249',.98);
 const core=ctx.createRadialGradient(cx,cy,0,cx,cy,r*.15);core.addColorStop(0,'#fffffa');core.addColorStop(.34,'#f8fffa');core.addColorStop(1,'#d1fcee00');ctx.fillStyle=core;ctx.beginPath();ctx.arc(cx,cy,r*.15,0,Math.PI*2);ctx.fill();
 if(!mini){
  const flare=ctx.createLinearGradient(cx-r*.8,cy,cx+r*.8,cy);flare.addColorStop(0,'#ffffff00');flare.addColorStop(.48,'#dcfff7a0');flare.addColorStop(.5,'#fffff6');flare.addColorStop(.52,'#dcfff7a0');flare.addColorStop(1,'#ffffff00');ctx.strokeStyle=flare;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(cx-r*.8,cy);ctx.lineTo(cx+r*.8,cy);ctx.stroke();
 }
 ctx.globalCompositeOperation='source-over';
}
