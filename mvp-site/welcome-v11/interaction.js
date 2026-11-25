
/* V11 approved click and keyboard interaction; no moving hit target. */
document.querySelectorAll('.welcome-card').forEach(card=>{
 const open=()=>{
  const source=card.querySelector('img'); if(!source)return;
  const viewer=document.createElement('dialog');viewer.className='welcome-photo-view';viewer.setAttribute('aria-label',card.getAttribute('aria-label'));
  const figure=document.createElement('figure'),image=document.createElement('img'),caption=document.createElement('figcaption'),close=document.createElement('button');
  image.src=source.currentSrc||source.src;image.alt=source.alt;caption.textContent=card.getAttribute('aria-label').replace('Открыть фотографию: ','');
  close.type='button';close.textContent='×';close.setAttribute('aria-label','Закрыть');
  figure.append(image,caption);viewer.append(figure,close);document.body.append(viewer);
  close.onclick=()=>viewer.close();viewer.addEventListener('click',e=>{if(e.target===viewer)viewer.close()});viewer.addEventListener('close',()=>{viewer.remove();card.focus({preventScroll:true})},{once:true});viewer.showModal();
 };
 card.addEventListener('click',open);
 card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
});
