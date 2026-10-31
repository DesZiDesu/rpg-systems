import {LIMIT} from './core.js?v=0.94.0';

export function createStore({timeout=60000}={}){
 const worker=new Worker(new URL('./worker.js?v=0.94.0',import.meta.url),{type:'module'}),pending=new Map();let serial=0,failure;
 const close=error=>{
  failure=error;worker.terminate();
  for(const p of pending.values()){clearTimeout(p.timer);p.reject(error);}
  pending.clear();
 };
 worker.onmessage=({data})=>{
  const p=pending.get(data.id);if(!p)return;
  if(data.progress){p.progress?.(data.progress);return;}
  pending.delete(data.id);clearTimeout(p.timer);
  data.error?p.reject(Object.assign(Error(data.error),{name:data.name})):p.resolve(data.result);
 };
 worker.onerror=event=>{event.preventDefault?.();close(Error('ตัวเตรียมแพ็กหยุดทำงาน กรุณาโหลดหน้าใหม่'));};
 worker.onmessageerror=()=>close(Error('อ่านข้อมูลจาก Workshop ไม่สำเร็จ กรุณาโหลดหน้าใหม่'));
 const call=(type,payload,progress)=>new Promise((resolve,reject)=>{
  if(failure){reject(failure);return;}
  const id=++serial,timer=setTimeout(()=>close(Error('Workshop ใช้เวลานานเกินไป กรุณาโหลดหน้าใหม่')),timeout);
  pending.set(id,{resolve,reject,progress,timer});
  try{worker.postMessage({id,type,payload});}catch(error){clearTimeout(timer);pending.delete(id);reject(error);}
 });
 return{call,destroy(){close(Error('ปิด Workshop แล้ว'));}};
}

export async function downloadPack(url,{signal,progress}={}){
 const response=await fetch(url,{signal,cache:'no-store'});if(!response.ok)throw Error('ดาวน์โหลดไม่สำเร็จ ลองใหม่ได้');
 if(Number(response.headers.get('Content-Length'))>LIMIT)throw Error('แพ็กมีขนาดเกินกำหนด');
 const reader=response.body.getReader(),chunks=[];let total=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>LIMIT)throw Error('แพ็กมีขนาดเกินกำหนด');chunks.push(value);progress?.(total);}}
 catch(error){await reader.cancel().catch(()=>{});throw error;}
 const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes.buffer;
}
