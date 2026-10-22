/* Bind database products to the existing selects without changing page layout. */
(function(){
 'use strict';if(window.KAFAK_BACKEND!=='business')return;
 const storage=window.kafakStorage||localStorage;
 const api=new KafakBusinessApi(),publicSubmit=api.submitOrder.bind(api);
 api.submitOrder=(data,id)=>storage.getItem('kafakAdmin')==='true'?api.createAdminOrder(data,id):publicSubmit(data,id);
 const publicCatalog=api.catalog.bind(api),publicQuote=api.quote.bind(api);let adminCatalog=false;
 api.catalog=async()=>{if(storage.getItem('kafakAdmin')==='true'){try{const products=await api.request('/catalog');adminCatalog=true;return products;}catch(e){if(e.status!==401)throw e;}}adminCatalog=false;return publicCatalog();};
 api.quote=(sku,state,provider)=>{
  const oid=typeof editingOrderId!=='undefined'?editingOrderId:null;
  const quick=document.querySelector('#quick-qty')?.offsetParent!==null;
  const phone=(quick?document.querySelector('#edit-phone')?.value:document.querySelector('#phone')?.value)||(typeof userData==='object'?userData.phone:'');
  const params=new URLSearchParams({sku,state,...(provider?{provider}:{}),...(oid?{oid}:{phone:phone||''})});
  return api.request((adminCatalog?'/quote?':'/public/quote?')+params,oid&&!adminCatalog?{accessToken:window.kafakOrderEditorUI?.access(oid)}:{});
 };
 const checkout=new KafakBusinessCheckout(api,KafakBusinessOrder,storage);
 const catalog=new KafakBusinessCatalog({catalog:async()=>checkout.products});
 let ready=null;
 const selected=quick=>document.querySelector(quick?'#quick-qty':'#quantity')?.selectedOptions[0]?.dataset.sku;
 function historicalQuote(qty){
  const total=Number(savedOrderData.Grand_Total),courier=Number(savedOrderData.Courier_Charge);
  const amount=savedOrderData.Product_Amount==null||savedOrderData.Product_Amount===''?Math.round((total-courier)*100)/100:Number(savedOrderData.Product_Amount);
  if(!Number.isFinite(total)||!Number.isFinite(courier)||!Number.isFinite(amount)||amount<0)throw Error('Historical order amounts require review.');
  return {product:savedOrderData.product,quantity:Number(qty),productAmount:amount,courierAmount:courier,total,productListAmount:Number(savedOrderData.Product_List_Amount??amount),discountAmount:Number(savedOrderData.Discount_Amount||0),offer:savedOrderData['Offer Type']?{type:savedOrderData['Offer Type'],value:Number(savedOrderData['Offer Value']),duration:savedOrderData['Offer Duration']}:null};
 }
 function render(){
  const productSelect=document.getElementById('admin-product-type');
  if(productSelect&&catalog.families.length){
   const prior=productSelect.value,oldSku=savedOrderData?.sku;
   const family=catalog.families.find(f=>f.id===prior)||catalog.families.find(f=>f.products.some(p=>p.sku===oldSku))||catalog.families.find(f=>f.name===savedOrderData?.product)||catalog.families[0];
   productSelect.replaceChildren();for(const f of catalog.families){const option=document.createElement('option');option.value=f.id;option.textContent=f.label;option.selected=f.id===family.id;productSelect.append(option);}catalog.select(family.id);
  }
  const productPanel=document.getElementById('admin-product-panel');if(productPanel){productPanel.hidden=catalog.families.length<=1;productPanel.style.display=catalog.families.length<=1?'none':'';}
  const products=productSelect?catalog.selected?.products||[]:checkout.products;
  for(const id of ['quantity','quick-qty']){
   const select=document.getElementById(id);if(!select)continue;
   const priorSku=select.selectedOptions[0]?.dataset.sku;
   const sku=priorSku||(id==='quick-qty'?savedOrderData?.sku:null);
   select.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent=(translations[$('#language-select').val()]||translations.en).dd_select||'Select Quantity';empty.disabled=true;empty.selected=true;select.append(empty);
   for(const p of products){const option=document.createElement('option');option.value=String(p.units);option.dataset.sku=p.sku;option.textContent=[productSelect?'':(p.displayName||p.name),p.variant,p.label||p.units,p.size,p.colour].filter(Boolean).join(' · ');option.selected=p.sku===sku;select.append(option);}
   if(id==='quick-qty'&&editingOrderId&&!sku&&savedOrderData?.quantity){const historical=document.createElement('option');historical.value=String(savedOrderData.quantity);historical.textContent=`${savedOrderData.quantity} · ${savedOrderData.product||'Existing order'}`;historical.selected=true;select.append(historical);}
  }
 }
 async function load(){if(!ready)ready=checkout.load().then(async result=>{await catalog.load();adminPhone=String(result.settings.contactPhone);isOutOfStock=result.settings.stockStatus==='no';globalQtyList=[...new Set(result.products.map(p=>Number(p.units)))].sort((a,b)=>a-b);render();return true;}).catch(error=>{ready=null;showAlert(error.message);return false;});return ready;}
 window.kafakCheckoutUI={load,render,checkout,productChanged:false,
  displayName(name){return checkout.products?.find(p=>p.name===name)?.displayName||name;},
  productName(){return catalog.selected?.name||'';},
  changeProduct(){this.productChanged=true;render();const quick=$('#quick-qty').is(':visible'),control=document.querySelector(quick?'#quick-qty':'#quantity');if(control){control.selectedIndex=1;updatePrice(control.value,quick);}checkForChanges();},
  async price(qty,quick){
   await load();const sku=selected(quick),state=quick?$('#edit-state').val():(userData.state||$('#state').val());
   if(quick&&editingOrderId&&!savedOrderData?.sku&&!this.productChanged&&Number(qty)===Number(savedOrderData.quantity)&&state===savedOrderData.state){checkout.priced=null;return historicalQuote(qty);}
   if(!sku){checkout.priced=null;if(quick&&editingOrderId&&Number(qty)===Number(savedOrderData.quantity)&&state===savedOrderData.state)return historicalQuote(qty);return null;}
   try{return await checkout.price(sku,state);}catch(error){checkout.priced=null;showAlert(error.message);return null;}
  },
  async submit(data){await load();const quick=$('#quick-qty').is(':visible'),sku=selected(quick);const result=await checkout.submit({...data,preorderConfirmed:isOutOfStock},sku);return {res:result,data:result.legacy};}
 };
})();
