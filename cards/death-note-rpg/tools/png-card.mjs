// Character-card metadata only: retain the original cover's pixel bytes.
import {Buffer} from 'node:buffer';
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
const table=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);return n>>>0;});
const crc=bytes=>{let n=0xffffffff;for(const b of bytes)n=table[(n^b)&255]^(n>>>8);return(n^0xffffffff)>>>0;};
export function cardPng(cover,card){
 if(!cover.subarray(0,8).equals(signature))throw Error('Cover must be PNG');
 const chunks=[signature];let written=false;
 for(let offset=8;offset<cover.length;){
  const size=cover.readUInt32BE(offset),end=offset+12+size;if(end>cover.length)throw Error('Truncated PNG');
  const type=cover.toString('ascii',offset+4,offset+8),data=cover.subarray(offset+8,offset+8+size);
  if(type==='IEND'){
   const value=Buffer.concat([Buffer.from('chara\0','latin1'),Buffer.from(JSON.stringify(card)).toString('base64')].map(x=>Buffer.isBuffer(x)?x:Buffer.from(x,'ascii'))),body=Buffer.concat([Buffer.from('tEXt'),value]),chunk=Buffer.alloc(value.length+12);
   chunk.writeUInt32BE(value.length);body.copy(chunk,4);chunk.writeUInt32BE(crc(body),chunk.length-4);chunks.push(chunk);written=true;
  }
  if(!(type==='tEXt'&&['chara','ccv3'].some(key=>data.subarray(0,key.length+1).equals(Buffer.from(key+'\0')))))chunks.push(cover.subarray(offset,end));
  offset=end;
 }
 if(!written)throw Error('Missing PNG end chunk');return Buffer.concat(chunks);
}
export function readCardPng(bytes){
 for(let offset=8;offset<bytes.length;){const size=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8),data=bytes.subarray(offset+8,offset+8+size);if(type==='tEXt'&&data.subarray(0,6).equals(Buffer.from('chara\0')))return JSON.parse(Buffer.from(data.subarray(6).toString('ascii'),'base64'));offset+=size+12;}
 throw Error('Missing character-card metadata');
}
