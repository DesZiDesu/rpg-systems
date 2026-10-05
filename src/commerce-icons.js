// Static inline SVG, independent of emoji fonts and icon-font loading.
const paths={
 flask:'M9 3h6M10 3v6L4 19q-1 2 2 2h12q3 0 2-2L14 9V3M7 15h10',
 apple:'M12 8c-8-5-12 3-7 11q3 4 7 1 4 3 7-1c5-8 1-16-7-11Zm0 0V3m0 3c5 0 5-4 5-4-4 0-5 4-5 4',
 sword:'m5 3 15 15-2 2L3 5V3h2Zm9 14 6-6M17 20l3-3m-7-4-3 3',
 gift:'M3 8h18v4H3V8Zm2 4v9h14v-9M12 8v13M12 8C4 8 5 1 9 3l3 5Zm0 0c8 0 7-7 3-5l-3 5',
 drop:'M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4',
 minus:'M5 12h14',close:'m6 6 12 12M18 6 6 18',check:'m5 12 4 4L19 6',right:'m9 5 7 7-7 7',
 info:'M12 11v6m0-10v1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 lock:'M5 10h14v11H5V10Zm3 0V7a4 4 0 0 1 8 0v3',user:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
 clock:'M12 6v6l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',search:'M15 15l6 6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',

 trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
 item:'m12 3 9 5-9 5-9-5 9-5ZM3 8v10l9 5 9-5V8M12 13v10',
 key:'M11 11l9 9m-5-5 3-3m0 6 3-3M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
 rental:'M3 10h18v10H3V10zm5 0V6h8v4M9 15h6',
 service:'m14 7 3 3 4-4a6 6 0 0 1-8 8l-7 7-3-3 7-7a6 6 0 0 1 8-8l-4 4',
 auction:'M12 3v18M5 21h14M4 6h16M6 4v2M18 4v2M6 7l-4 8h8L6 7zm12 0-4 8h8l-4-8zM2 15c0 3 8 3 8 0m4 0c0 3 8 3 8 0',
 buy:'M3 3h2l3 12h11l2-9H6M10 19h.01M18 19h.01M10 6h6m-3-3v6',
 sell:'M4 10h16v10H4V10zm3-3h10M12 3v10m-3-3 3 3 3-3',
 coin:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4 4 5-4 5-4-5 4-5z',
 chevron:'m7 10 5 5 5-5',
 };

export const COIN_STYLES=['stack','minted','outline'];
const coinArt=style=>style==='outline'?`<path d="${paths.coin}"></path>`:style==='minted'?'<circle cx="12" cy="12" r="9" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="6.7" stroke="#fff" stroke-opacity=".4"/><path d="m12 7 1.5 3 3.5.5-2.5 2.4.6 3.4-3.1-1.6-3.1 1.6.6-3.4L7 10.5l3.5-.5z" fill="#241908" fill-opacity=".45" stroke="none"/>':'<path d="M3 12v6c0 4 18 4 18 0v-6" fill="currentColor" stroke="none"/><path d="M3 18c0 4 18 4 18 0M3 15c0 4 18 4 18 0" stroke="#18130d" stroke-opacity=".45" stroke-width="1"/><ellipse cx="12" cy="12" rx="9" ry="4" fill="currentColor" stroke="#fff" stroke-opacity=".35" stroke-width="1"/><ellipse cx="12" cy="12" rx="6" ry="2.3" stroke="#241908" stroke-opacity=".35" stroke-width="1"/><path d="M5 6v3c0 3 14 3 14 0V6" fill="currentColor" stroke="#18130d" stroke-opacity=".35" stroke-width="1"/><ellipse cx="12" cy="6" rx="7" ry="3" fill="currentColor" stroke="#fff" stroke-opacity=".5" stroke-width="1"/><ellipse cx="12" cy="6" rx="4.5" ry="1.5" stroke="#241908" stroke-opacity=".35" stroke-width="1"/>';
export function commerceIconMarkup(name,unit,style='stack'){
 const theme=COIN_STYLES.includes(style)?style:'stack';
 return `<svg class="rf-commerce-icon" ${['gold','silver','copper'].includes(unit)?`data-currency="${unit}" data-coin-style="${theme}"`:''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${name==='coin'?coinArt(theme):`<path d="${paths[name]||paths.coin}"></path>`}</svg>`;
}
export function commerceIcon(doc,name,unit,style='stack'){
 const host=doc.createElement('span');host.innerHTML=commerceIconMarkup(name,unit,style);return host.firstElementChild;
}
