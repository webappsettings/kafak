/* Update idle pages automatically without interrupting a form or upload. */
(() => {
  const release='20261016c'; let edited=false,checking=false;
  document.addEventListener('input',()=>{edited=true;},true);
  document.addEventListener('change',()=>{edited=true;},true);
  async function check(){
    if(checking || document.hidden || edited) return;
    checking=true;
    try {
      const response=await fetch('release.json?t='+Date.now(),{cache:'no-store'});
      const latest=await response.json();
      if(response.ok && latest.release && latest.release!==release && !edited){
        const url=new URL(location.href);
        if(url.searchParams.get('_release')===latest.release)return; // CDN propagation must not cause a reload loop.
        url.searchParams.set('_release',latest.release);location.replace(url.href);
      }
    } catch {} finally {checking=false;}
  }
  if('serviceWorker' in navigator){
    navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type==='KAFAK_RELEASE')check();});
    navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(reg=>{
      reg.update().catch(()=>{});
      setInterval(()=>reg.update().catch(()=>{}),60000);
    }).catch(()=>{});
  }
  window.addEventListener('focus',check);
  document.addEventListener('visibilitychange',check);
  setInterval(check,60000);check();
})();
