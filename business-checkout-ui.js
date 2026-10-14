/* Bind the existing quantity selects and price boxes without changing page structure. */
(function(){
 'use strict';if(window.KAFAK_BACKEND!=='business')return;
 const api=new KafakBusinessApi(),checkout=new KafakBusinessCheckout(api,KafakBusinessOrder,localStorage);
 let ready=null;
 const selected=quick=>document.querySelector(quick?'#quick-qty':'#quantity')?.selectedOptions[0]?.dataset.sku;
 function render(){
  for(const id of ['quantity','quick-qty']){const select=document.getElementById(id);if(!select)continue;const sku=select.selectedOptions[0]?.dataset.sku;select.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent=(translations[$('#language-select').val()]||translations.en).dd_select||'Select Quantity';empty.disabled=true;empty.selected=true;select.append(empty);
   for(const p of checkout.products){const option=document.createElement('option');option.value=String(p.units);option.dataset.sku=p.sku;option.textContent=[p.name,p.variant,p.label||p.units,p.size,p.colour].filter(Boolean).join(' · ');option.selected=p.sku===sku;select.append(option);}
  }
 }
 async function load(){if(!ready)ready=checkout.load().then(result=>{adminPhone=String(result.settings.contactPhone);isOutOfStock=result.settings.stockStatus==='no';globalQtyList=[...new Set(result.products.map(p=>Number(p.units)))].sort((a,b)=>a-b);render();return true;}).catch(error=>{ready=null;showAlert(error.message);return false;});return ready;}
 window.kafakCheckoutUI={load,render,checkout,
  async price(qty,quick){await load();const sku=selected(quick);if(!sku)return null;const state=quick?$('#edit-state').val():(userData.state||$('#state').val());try{return await checkout.price(sku,state);}catch(error){checkout.priced=null;showAlert(error.message);return null;}},
  async submit(data){await load();const quick=$('#quick-qty').is(':visible');const sku=selected(quick);const result=await checkout.submit({...data,preorderConfirmed:isOutOfStock},sku);return {res:result,data:result.legacy};}
 };
})();
