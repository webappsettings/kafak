/* Device-local unsent draft and confirmed receipt are separate from the server order. */
(() => {
 'use strict';
 const storage=window.kafakStorage;
 const scope=new URLSearchParams(location.search).get('oid')||'new';
 const draftKey='kafak-draft-v1:'+scope,receiptKey='kafak-receipt-v1:'+scope;
 const ids=['admin-product-type','phone','name','whatsapp','pincode','house','place','altphone','quantity','po-select','edit-name','edit-phone','edit-whatsapp','edit-pincode','edit-house','edit-place','edit-altphone','edit-postoffice','edit-postoffice-select','edit-district','edit-state','quick-qty'];
 let restoring=false,timer;
 const read=key=>{try{return JSON.parse(storage.getItem(key)||'null');}catch{return null;}};
 function capture(){
  if(restoring||window.orderSuccess||!storage.persistent)return;
  const wizard=$('#wizard-view').is(':visible');
  const editing=$('#address-edit-box').is(':visible');
  if(!wizard&&!editing)return;
  const fields={};for(const id of ids){const el=document.getElementById(id);if(el)fields[id]=el.value;}
  storage.setItem(draftKey,JSON.stringify({fields,wizard,step:currentStep,data:userData,poList,version:savedOrderData?.version,at:Date.now()}));
 }
 async function restore(d){
  restoring=true;
  try{
   if(!d.wizard&&d.version!==savedOrderData?.version){showAlert('This order changed since your draft. Your draft is kept; review the latest order before restoring changes.');return;}
   await window.kafakCheckoutUI?.load();
   if(d.wizard){$('#step-0,#returning-user-view').hide();startWizard();userData={...d.data};poList=d.poList||[];
    const select=document.getElementById('po-select');if(select){select.replaceChildren();for(const po of poList){const o=document.createElement('option');o.value=o.textContent=po.officename;select.append(o);}}
   }else if(!$('#address-edit-box').is(':visible'))toggleAddressEdit();
   for(const [id,value] of Object.entries(d.fields||{})){const el=document.getElementById(id);if(el){el.value=value;if(id==='admin-product-type')onProductChange();}}
   if(d.wizard){currentStep=d.step;showStep(currentStep);updateFooterButtons('wizard');}
   else {await handleEditPincode($('#edit-pincode').val());const po=d.fields['edit-postoffice'];if($('#edit-postoffice-select option').toArray().some(o=>o.value===po))$('#edit-postoffice-select').val(po).trigger('change');checkForChanges();}
   $('#draft-recovery').remove();
  }finally{restoring=false;}
 }
 function openReceipt(r){
  if(!r?.orderid)return false;
  storage.removeItem(receiptKey);
  if(scope===r.orderid)return true;
  const url=new URL('order.html',location.href);url.searchParams.set('oid',r.orderid);if(r.accessToken)url.hash='access='+encodeURIComponent(r.accessToken);
  location.replace(url.href);return true;
 }
 function waitForView(){return new Promise(resolve=>{
  const ready=()=>!$('#full-loader').is(':visible');
  if(ready())return resolve();
  const observer=new MutationObserver(()=>{if(ready()){observer.disconnect();clearTimeout(timeout);resolve();}});
  observer.observe(document.getElementById('full-loader'),{attributes:true,attributeFilter:['style']});
  const timeout=setTimeout(()=>{observer.disconnect();resolve();},20000);
 });}
 window.kafakRecovery={
  capture,
  completed(){storage.removeItem(receiptKey);},
  confirmed(data){
   const last=read('kafak-business-last-order');
   const r={orderid:data.orderid,name:data.name,accessToken:data.accessToken||window.kafakOrderEditorUI?.access(data.orderid)||(last?.orderid===data.orderid?last.accessToken:undefined),at:Date.now()};
   storage.setItem(receiptKey,JSON.stringify(r));storage.removeItem(draftKey);
  }
 };
 document.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(capture,150);});
 document.addEventListener('change',capture);
 window.addEventListener('pagehide',capture);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)capture();});
 const original=window.showStep;window.showStep=function(...args){const result=original.apply(this,args);queueMicrotask(capture);return result;};
 const initialDraft=read(draftKey);
 if(initialDraft)restoring=true;
 $(document).ready(async()=>{
  const r=read(receiptKey);if(r&&openReceipt(r)){restoring=false;return;}
  if(!initialDraft)return;
  try{await waitForView();
   if(scope!=='new'&&savedOrderData?.orderid!==scope)return;
   await restore(initialDraft);
  }catch(e){showAlert(e.message);}finally{restoring=false;}
 });
})();
