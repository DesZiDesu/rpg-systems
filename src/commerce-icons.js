// Static inline SVG, independent of emoji fonts and icon-font loading.
const paths={
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
