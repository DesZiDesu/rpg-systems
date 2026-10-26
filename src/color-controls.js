// Keep the native OS picker and form events, with a stable square swatch.
export function mountColorControls(root){
 if(!root)return;const doc=root.ownerDocument||root;
 if(!doc.querySelector('link[data-rf-color-controls]')){const sheet=doc.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('../styles/color-controls.css?v=0.88.1',import.meta.url);sheet.dataset.rfColorControls='';doc.head.append(sheet);}
 const inputs=root.matches?.('input[type=color]')?[root]:root.querySelectorAll('input[type=color]');
 for(const input of inputs){
  if(input.closest('.dn-eye-color'))continue;
  let swatch=input.closest('.rf-color-control');
  if(!swatch){swatch=doc.createElement('span');swatch.className='rf-color-control';input.before(swatch);swatch.append(input);if(!input.getAttribute('aria-label'))input.setAttribute('aria-label',swatch.closest('label')?.textContent.trim()||'Color');const update=()=>swatch.style.setProperty('--rf-selected-color',input.value);input.addEventListener('input',update);input.addEventListener('change',update);}
  swatch.style.setProperty('--rf-selected-color',input.value);
 }
}
