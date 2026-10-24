(() => {
 const root=document.querySelector('.clip-public-view');if(!root)return;
 const audio=root.querySelector('audio');
 root.querySelectorAll('[data-relative-start]').forEach(button=>button.addEventListener('click',()=>{if(audio)audio.currentTime=Number(button.dataset.relativeStart);}));
 if(audio)audio.addEventListener('timeupdate',()=>{root.querySelectorAll('.clip-segment').forEach(row=>row.classList.toggle('is-active',audio.currentTime>=Number(row.dataset.start)&&audio.currentTime<Number(row.dataset.end)));});
 if(root.dataset.statusUrl)setInterval(async()=>{try{const response=await fetch(root.dataset.statusUrl,{cache:'no-store'});if(response.status===404){if(audio){audio.pause();audio.removeAttribute('src');audio.load();audio.hidden=true;}root.querySelector('[aria-label="Clip transcript"]')?.remove();root.querySelector('.clip-download')?.remove();root.querySelector('.clip-access-status').textContent='This sharing link is no longer available.';}}catch{}},5000);
})();