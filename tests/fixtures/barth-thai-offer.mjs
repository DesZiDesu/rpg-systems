import {repairedBooks} from './commerce-repair-books.mjs';
export const user='“ซื้อทั้งสามเล่มเลย.. ช่วยลดให้หน่อยได้มั้ยครับ..? สักนิดก็ยังดี..”';
export const quote='ฮ่าๆ เจ้าหนุ่มใจถึงไม่เบาเลยนี่... ปกติสามเล่มนี้รวมกันตกอยู่ที่สี่สิบห้าเหรียญเงิน แต่เห็นแก่ความกระตือรือร้นในการศึกษาเวทมนตร์ ข้าลดราคาให้พิเศษเหลือสี่สิบเหรียญเงินถ้วนก็แล้วกัน! ข้าคิดคัมภีร์ศรวายุสิบสามเหรียญเงิน คู่มือบาเรียแสงสิบแปดเหรียญเงิน และบันทึกกระแสออร่าเก้าเหรียญเงิน รวมกันเป็นสี่สิบเหรียญเงินพอดีเป๊ะ';
export const names=['คัมภีร์ศรวายุ','คู่มือบาเรียแสง','บันทึกกระแสออร่า'];
export const story=`<planning>Private old prices: Wind Arrow 15 silver, Light Barrier 20 silver, Aura Flow 10 silver</planning><tr-header name="Barth"/><tr-dialogue name="Barth" delivery="warmly, chuckles">${quote}</tr-dialogue>`;
export function offer(){
 const raw=repairedBooks();raw.marketplace.evidence=quote;raw.selection.evidence=user;raw.basketQuote.evidence='รวมกันเป็นสี่สิบเหรียญเงินพอดีเป๊ะ';
 raw.marketplace.items.forEach((item,i)=>{item.name=names[i];item.price=[13,18,9][i];item.evidence=quote;});return raw;
}
