(() => {
  const names={grimoire:'1 · Living Grimoire',lotus:'2 · Lotus Scroll',novel:'3 · Monochrome Folio'};
  let design='grimoire';
  const portrait=document.getElementById('portrait'),position=document.getElementById('position');
  const source=file=>window.RF_REVIEW_IMAGES?.[file]||`screenshots/${file}`;
  function refresh(){
    for(const device of ['desktop','mobile']){
      const file=`${design}-${portrait.checked?'with':'without'}-${device}-${position.value}.png`;
      const shot=document.getElementById(`${device}Shot`);shot.src=source(file);shot.alt=`${names[design]} · ${device==='desktop'?'PC':'มือถือ'} · ${portrait.checked?'มีภาพ':'ไม่มีภาพ'} · ${position.value==='top'?'ช่วงต้น':'ช่วงท้าย'}แชท`;
    }
    for(const button of document.querySelectorAll('[data-design]'))button.setAttribute('aria-pressed',String(button.dataset.design===design));
  }
  for(const button of document.querySelectorAll('[data-design]'))button.addEventListener('click',()=>{design=button.dataset.design;refresh();});
  portrait.addEventListener('change',refresh);position.addEventListener('change',refresh);
  for(const button of document.querySelectorAll('[data-zoom]'))button.addEventListener('click',()=>{
    const current=document.getElementById(`${button.dataset.zoom}Shot`),zoom=document.getElementById('zoom');
    document.getElementById('zoomShot').src=current.src;document.getElementById('zoomShot').alt=current.alt;document.getElementById('zoomLabel').textContent=current.alt;zoom.showModal();
  });
  refresh();
})();
