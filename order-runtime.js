(function(w){
 'use strict';
 const memory=new Map();let native;
 try{native=w.localStorage;const k='kafak-storage-probe';native.setItem(k,'1');if(native.getItem(k)!=='1')throw Error('Storage unavailable');native.removeItem(k);}catch{native=null;}
 w.kafakStorage={get persistent(){return !!native;},requirePersistent(){if(!native)throw Error('Browser storage is unavailable. Allow site storage before saving so a network retry cannot duplicate your order.');},getItem(k){try{return native?native.getItem(k):memory.get(k)??null;}catch{return memory.get(k)??null;}},setItem(k,v){memory.set(k,String(v));try{native?.setItem(k,String(v));}catch{native=null;}},removeItem(k){memory.delete(k);try{native?.removeItem(k);}catch{native=null;}}};
 w.KafakUI={escape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));},async pin(pin){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);try{const res=await fetch('pincode_json_files/'+encodeURIComponent(pin)+'.json',{signal:controller.signal});if(!res.ok)throw Error(res.status===404?'Pincode not found. Check the number.':'Address lookup unavailable. Please retry.');const data=await res.json();if(!Array.isArray(data)||!data.length)throw Error('No post offices found. Check the pincode.');return data;}catch(e){if(e.name==='AbortError')throw Error('Address lookup timed out. Please retry.');throw e;}finally{clearTimeout(timer);}}};
})(window);

// Older mobile engines support grid gap but not flex gap; test the actual layout.
document.addEventListener('DOMContentLoaded',function(){
 const probe=document.createElement('div');
 probe.style.cssText='display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden';
 for(let i=0;i<2;i++){const child=document.createElement('div');child.style.height='1px';probe.appendChild(child);}
 document.body.appendChild(probe);
 if(probe.scrollHeight!==3)document.documentElement.classList.add('kafak-no-flex-gap');
 probe.remove();
});

(function(){
 const scripts=new Map();
 function script(src){if(!scripts.has(src))scripts.set(src,new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=src;el.onload=resolve;el.onerror=()=>{scripts.delete(src);el.remove();reject(Error('This feature could not load. Please retry.'));};document.head.append(el);}));return scripts.get(src);}
 KafakUI.adminActions=()=>script('compat/order-admin-actions.js?v=20261022e');
 KafakUI.adminTransport=async()=>{await script('compat/business-admin-commands.js?v=20261022e');await script('compat/business-admin-transport.js?v=20261022e');};
 KafakUI.datePicker=async()=>{if(window.flatpickr)return;if(!document.querySelector('[data-order-datepicker]')){const css=document.createElement('link');css.rel='stylesheet';css.href='https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css';css.dataset.orderDatepicker='1';document.head.append(css);}await script('https://cdn.jsdelivr.net/npm/flatpickr');};
})();
