/* Add a product without replacing an existing order; prices and payments are server-owned. */
(function(){
 'use strict';if(window.KAFAK_BACKEND!=='business')return;
 const api=new KafakBusinessApi(),storage=window.kafakStorage;
 const escape=value=>KafakUI.escape(value),money=value=>Number(value).toFixed(2);
 let serial=0,removing=false;
 const current=()=>typeof savedOrderData==='object'?savedOrderData:null;
 function render(){
  const row=current(),qty=document.getElementById('quick-qty');if(!row?.orderid||!qty)return;
  let box=document.getElementById('mixed-order-products');
  if(!box){box=document.createElement('div');box.id='mixed-order-products';box.className='mb-3';qty.parentNode.insertBefore(box,document.getElementById('quick-qty-label')||qty);}
  box.replaceChildren();
  if(row.items?.length){
   const list=document.createElement('div');list.className='border rounded-3 bg-light p-3 mb-2';
   for(const [index,item] of row.items.entries()){const line=document.createElement('div');line.className='d-flex justify-content-between gap-2 small py-1';const name=document.createElement('span'),amount=document.createElement('strong');name.textContent=(window.kafakCheckoutUI?.displayName(item.product)||item.product)+' · '+item.packGrams+'g × '+item.quantity;amount.textContent='₹'+money(item.productAmount);const right=document.createElement('div');right.className='d-flex align-items-center gap-2';right.append(amount);if(index>0&&storage.getItem('kafakAdmin')==='true'&&['pending','sent','paid'].includes(String(row.Status||row.status).toLowerCase())&&!/P_/.test(row.adminMeta||'')){const button=document.createElement('button');button.type='button';button.className='btn btn-sm btn-outline-danger mixed-remove-product';button.dataset.index=String(index);button.style.cssText='width:26px;height:26px;padding:0;line-height:1;flex-shrink:0';button.title='Remove added product';button.setAttribute('aria-label','Remove '+item.product+' '+item.packGrams+'g');button.innerHTML='<i class="fas fa-times" aria-hidden="true"></i>';button.disabled=removing;button.onclick=()=>remove(index);right.append(button);}line.append(name,right);list.append(line);}box.append(list);
   qty.replaceChildren();const option=document.createElement('option');option.value=String(row.quantity);option.textContent=row.quantity+' bottles · Mixed products';option.selected=true;qty.append(option);
   const panel=document.getElementById('admin-product-panel');if(panel)panel.style.display='none';
  }
  if(storage.getItem('kafakAdmin')==='true'&&['pending','sent','paid'].includes(String(row.Status||row.status).toLowerCase())&&!/P_/.test(row.adminMeta||'')){
   const button=document.createElement('button');button.type='button';button.id='btn-add-order-product';button.className='btn btn-sm btn-outline-dark rounded-pill px-3';button.innerHTML='<i class="fas fa-plus me-1"></i> Add product';button.onclick=open;box.append(button);
  }
  if(storage.getItem('kafakAdmin')==='true'&&storage.getItem('kafak-mixed-remove:'+row.orderid)){const retry=document.createElement('button');retry.type='button';retry.className='btn btn-sm btn-outline-danger ms-2';retry.textContent='Finish product removal';retry.disabled=removing;retry.onclick=()=>remove(1);box.append(retry);}
 }
 async function price(state,provider){
  const row=current(),generation=++serial,admin=storage.getItem('kafakAdmin')==='true';
  window.KafakMixedUI.priced=null;
  const quote=await api.request((admin?'/admin/mixed-quote?':'/public/mixed-quote?')+new URLSearchParams({oid:row.orderid,state,...(admin&&provider?{provider}:{})}),admin?{}:{accessToken:window.kafakOrderEditorUI.access(row.orderid)});
  if(generation!==serial)return null;
  window.KafakMixedUI.priced={state,provider,quote};return quote;
 }
 async function open(){
  const row=current();if(!row?.orderid)return;
  const key='kafak-mixed-add:'+row.orderid;
  if(storage.getItem('kafak-mixed-remove:'+row.orderid)){showAlert('Finish the pending product removal before adding another product.');return;}
  if($('#address-edit-box').is(':visible')||storage.getItem('kafak-business-edit:'+row.orderid)){showAlert('Save your address changes before adding a product.');return;}
  let updates=[];try{updates=JSON.parse(storage.getItem('pendingUpdates')||'[]');}catch{}
  if(updates.some(u=>u.oid===row.orderid)){showAlert('Sync this order before adding a product.');return;}
  try{
   await window.kafakCheckoutUI.load();
   const products=window.kafakCheckoutUI.checkout.products.filter(p=>['Vanthen','Cheruthen'].includes(p.name));
   if(!products.length)throw Error('No honey products are available.');
   let pending=JSON.parse(storage.getItem(key)||'null'),quote=null,sequence=0;
   const result=await Swal.fire({title:pending?'Finish adding product':'Add product',html:`<div class="text-start"><label class="small fw-bold mb-2" for="mixed-add-sku">Product / pack</label><select id="mixed-add-sku" class="form-select form-select-sm" disabled><option value="">Select product</option>${products.map(p=>`<option value="${escape(p.sku)}">${escape(p.displayName||p.name)} · ${Number(p.packGrams)||''}g × ${Number(p.units)} · ₹${money(p.price)}</option>`).join('')}</select><div id="mixed-add-quote" class="small mt-3" aria-live="polite"></div></div>`,showCancelButton:true,showLoaderOnConfirm:true,allowOutsideClick:()=>!Swal.isLoading(),allowEscapeKey:()=>!Swal.isLoading(),confirmButtonText:pending?'Retry save':'Save product',confirmButtonColor:'#212529',customClass:{popup:'ios-popup'},didOpen:()=>{
    const select=document.getElementById('mixed-add-sku'),preview=document.getElementById('mixed-add-quote');Swal.getConfirmButton().disabled=!pending;
    if(pending){select.value=pending.payload.sku;select.disabled=true;preview.textContent='Previous save is awaiting confirmation. Retry checks the same request without adding twice.';return;}
    select.onchange=async()=>{const generation=++sequence;quote=null;Swal.getConfirmButton().disabled=true;if(!select.value){preview.textContent='';return;}preview.textContent='Checking total…';try{const q=await api.request('/admin/add-product-quote?'+new URLSearchParams({oid:row.orderid,sku:select.value}));if(generation!==sequence)return;quote=q;preview.innerHTML=q.items.map(i=>`<div class="d-flex justify-content-between gap-2 py-1"><span>${escape(i.product)} ${Number(i.packGrams)}g × ${Number(i.quantity)}</span><strong>₹${money(i.productAmount)}</strong></div>`).join('')+`<div class="d-flex justify-content-between py-1"><span>Courier</span><strong>₹${money(q.courierAmount)}</strong></div><div class="d-flex justify-content-between border-top pt-2 fw-bold"><span>Total</span><span>₹${money(q.total)}</span></div>`+(String(row.Status).toLowerCase()==='paid'?`<div class="mt-2">Already paid: ₹${money(q.previousTotal)} · Balance: ₹${money(q.total-q.previousTotal)}</div>`:'');Swal.getConfirmButton().disabled=false;}catch(error){if(generation===sequence)preview.textContent=error.message;}};select.disabled=false;
   },preConfirm:async()=>{
    if(!pending){if(!quote){Swal.showValidationMessage('Select a product and wait for its total.');return false;}pending={requestId:crypto.randomUUID(),payload:{action:'addOrderProduct',oid:row.orderid,sku:document.getElementById('mixed-add-sku').value,version:quote.version,expectedTotal:quote.total,expectedPreviousTotal:quote.previousTotal}};storage.setItem(key,JSON.stringify(pending));}
    document.getElementById('mixed-add-sku').disabled=true;
    try{storage.requirePersistent();const saved=await api.adminAction(pending.payload,pending.requestId);if(saved.result!=='success')throw Error('Product save was not confirmed. Retry the same save.');storage.removeItem(key);return saved;}catch(error){if([400,403,409,422].includes(error.status)){storage.removeItem(key);pending=null;quote=null;document.getElementById('mixed-add-sku').disabled=false;}Swal.showValidationMessage(error.message);return false;}
   }});
   if(result.isConfirmed){const latest=await window.kafakOrderEditorUI.read(row.orderid);if(!latest?.data)throw Error('Product saved. Refresh this order to see the latest details.');window.kafakCheckoutUI.productChanged=false;showReturningUserView(latest.data,true,true);document.dispatchEvent(new Event('kafak-order-saved'));Swal.fire({icon:'success',title:'Product added',toast:true,position:'top-end',showConfirmButton:false,timer:1600});}
  }catch(error){showAlert(error.message);}
 }
 async function remove(index){
  const row=current();if(!row?.orderid||removing)return;
  if($('#address-edit-box').is(':visible')||storage.getItem('kafak-business-edit:'+row.orderid)||storage.getItem('kafak-mixed-add:'+row.orderid)){showAlert('Finish your pending changes before removing a product.');return;}
  let updates=[];try{updates=JSON.parse(storage.getItem('pendingUpdates')||'[]');}catch{}
  if(updates.some(u=>u.oid===row.orderid)){showAlert('Sync this order before removing a product.');return;}
  const key='kafak-mixed-remove:'+row.orderid;removing=true;render();
  try{
   let pending=JSON.parse(storage.getItem(key)||'null');
   const quote=pending?{total:pending.payload.expectedTotal,previousTotal:pending.payload.expectedPreviousTotal}:await api.request('/admin/remove-product-quote?'+new URLSearchParams({oid:row.orderid,index}));
   const item=pending?.item||row.items?.[pending?pending.payload.index:index]||{product:'Added product',packGrams:'',quantity:1};
   const result=await Swal.fire({title:pending?'Finish removing product':'Remove added product?',html:`<div class="small">${escape(item.product)} ${Number(item.packGrams)}g × ${Number(item.quantity)}<div class="mt-2">Updated total: <strong>₹${money(quote.total)}</strong></div></div>`,icon:'question',showCancelButton:true,confirmButtonText:pending?'Retry remove':'Remove product',confirmButtonColor:'#dc3545',showLoaderOnConfirm:true,allowOutsideClick:()=>!Swal.isLoading(),allowEscapeKey:()=>!Swal.isLoading(),customClass:{popup:'ios-popup'},preConfirm:async()=>{
    if(!pending){pending={requestId:crypto.randomUUID(),item,payload:{action:'removeOrderProduct',oid:row.orderid,index,version:quote.version,expectedTotal:quote.total,expectedPreviousTotal:quote.previousTotal}};storage.setItem(key,JSON.stringify(pending));}
    try{storage.requirePersistent();const saved=await api.adminAction(pending.payload,pending.requestId);if(saved.result!=='success')throw Error('Removal was not confirmed. Retry the same removal.');storage.removeItem(key);return saved;}catch(error){if([400,403,409,422].includes(error.status)){storage.removeItem(key);Swal.showValidationMessage(error.message);setTimeout(()=>Swal.close(),1800);return false;}Swal.showValidationMessage(error.message);return false;}
   }});
   if(result.isConfirmed){const latest=await window.kafakOrderEditorUI.read(row.orderid);if(!latest?.data)throw Error('Product removed. Refresh this order to see the latest details.');window.kafakCheckoutUI.productChanged=false;showReturningUserView(latest.data,true,true);document.dispatchEvent(new Event('kafak-order-saved'));Swal.fire({icon:'success',title:'Product removed',toast:true,position:'top-end',showConfirmButton:false,timer:1600});}
  }catch(error){showAlert(error.message);}finally{removing=false;render();}
 }
 window.KafakMixedUI={render,price,open,remove,priced:null};
})();
