/* Admin-only courier selection; quotes and financial validation stay on the server. */
(function(){
 'use strict';if(window.KAFAK_BACKEND!=='business')return;
 const api=new KafakBusinessApi(),storage=window.kafakStorage;
 let settings=null,loading=null,loadError='',changeSerial=0;
 const admin=()=>storage.getItem('kafakAdmin')==='true';
 const saved=()=>typeof savedOrderData==='object'?savedOrderData:null;
 const provider=quick=>admin()?(document.getElementById(quick?'admin-edit-courier':'admin-wizard-courier')?.value||undefined):undefined;
 const changed=()=>{const row=saved(),control=document.getElementById('admin-edit-courier');return !!(admin()&&row?.orderid&&control&&String(control.value||'')!==String(row.courier||row.provider||row.Courier_Provider||''));};
 async function load(){
  if(settings||!admin())return;
  if(!loading)loading=api.courierSettings().then(result=>{if(result.status!=='success'||!Array.isArray(result.data))throw Error('Courier options unavailable.');settings=result;loadError='';}).catch(error=>{loadError=error.message;}).finally(()=>loading=null);
  return loading;
 }
 function render(){
  if(!admin()){document.querySelectorAll('.admin-order-courier').forEach(el=>el.remove());return;}
  for(const quick of [false,true]){
   const qty=document.getElementById(quick?'quick-qty':'quantity');if(!qty)continue;
   const id=quick?'admin-edit-courier':'admin-wizard-courier',row=saved(),identity=quick?row?.orderid||'edit-new':'create';
   let box=document.getElementById(id+'-panel'),select=document.getElementById(id);
   const before=select?.dataset.orderId===identity?select.value:quick?(row?.courier||row?.provider||row?.Courier_Provider||''):'';
   if(!box){box=document.createElement('div');box.id=id+'-panel';box.className='admin-order-courier mb-3';const label=document.createElement('label');label.htmlFor=id;label.className='small text-muted fw-bold mb-1';label.style.fontSize='11px';label.textContent='COURIER';select=document.createElement('select');select.id=id;select.className='form-select form-select-sm fw-bold';select.onchange=()=>change(quick);box.append(label,select);qty.parentNode.insertBefore(box,document.getElementById(quick?'quick-qty-label':'wizard-qty-label')||qty);}
   select.dataset.orderId=identity;
   const sku=qty.selectedOptions[0]?.dataset.sku||row?.sku,product=window.kafakCheckoutUI?.checkout.products.find(p=>p.sku===sku),state=String(quick?document.getElementById('edit-state')?.value:typeof userData==='object'?userData.state:'').trim().toUpperCase();
   let rows=(settings?.data||[]).filter(r=>!product?.rateGroup||r['Rate Group']===product.rateGroup);
   const exact=rows.filter(r=>String(r.Parameter).toUpperCase()===state);rows=exact.length?exact:rows.filter(r=>String(r.Parameter).toUpperCase()===String(settings?.fallbackZone||'REST OF INDIA').toUpperCase());
   const quantity=Number(qty.value),providers=[...new Set(rows.filter(r=>!quantity||String(r['Base Rate String']).split(',').some(part=>Number(part.split(':')[0])===quantity)).map(r=>r.Provider).filter(Boolean))];
   select.replaceChildren();
   if(!quick||!before){const option=document.createElement('option');option.value='';option.textContent='Automatic (default courier)';select.append(option);}
   if(before&&!providers.includes(before))providers.unshift(before);
   for(const name of providers){const option=document.createElement('option');option.value=name;option.textContent=name;select.append(option);}
   select.value=before;
   let retry=box.querySelector('button');if(loadError&&!retry){retry=document.createElement('button');retry.type='button';retry.className='btn btn-link btn-sm px-0';retry.style.fontSize='11px';retry.textContent='Retry courier options';retry.onclick=async()=>{await load();render();};box.append(retry);}else if(!loadError&&retry)retry.remove();
  }
 }
 async function change(quick){
  const serial=++changeSerial;window.KafakOrderCourierUI.busy=true;
  window.kafakCheckoutUI.checkout.priced=null;window.kafakCheckoutUI.checkout.order.currentQuote=null;
  if(!quick)$('#btn-wiz-next').prop('disabled',true);checkForChanges();
  try{const qty=document.getElementById(quick?'quick-qty':'quantity');if(qty.value)await updatePrice(qty.value,quick);}finally{if(serial===changeSerial){window.KafakOrderCourierUI.busy=false;if(!quick)$('#btn-wiz-next').prop('disabled',false);checkForChanges();}}
 }
 window.KafakOrderCourierUI={load,render,provider,changed,busy:false};
})();
