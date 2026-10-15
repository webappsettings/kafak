/* Connect the existing edit view to versioned database reads and saves. */
(function(){
 'use strict';if(window.KAFAK_BACKEND!=='business')return;
 const api=new KafakBusinessApi(),editor=new KafakBusinessOrderEditor(api,localStorage);
 function access(id){
  const fromHash=new URLSearchParams(location.hash.slice(1)).get('access');
  if(new URLSearchParams(location.search).get('oid')===id&&/^[A-Za-z0-9_-]{43}$/.test(fromHash||''))return fromHash;
  let last;try{last=JSON.parse(localStorage.getItem('kafak-business-last-order')||'null');}catch{}
  if(last?.orderid===id&&last.accessToken)return last.accessToken;
  if(typeof savedOrderData==='object'&&savedOrderData?.orderid===id&&savedOrderData.accessToken)return savedOrderData.accessToken;
  if(typeof localUsersMap==='object')return Object.values(localUsersMap).find(row=>row?.orderid===id&&row.accessToken)?.accessToken;
  return undefined;
 }
 function confirmed(row){return {...row,accessToken:access(row.orderid)||row.accessToken,quote:{sku:row.sku,product:row.product,variant:row.variant,quantity:Number(row.quantity),productAmount:Number(row.Product_Amount),courierAmount:Number(row.Courier_Charge),total:Number(row.Grand_Total)}};}
 window.kafakOrderEditorUI={editor,
  async track(article){
   if(localStorage.getItem('kafakAdmin')==='true')return api.request('/admin/parcel-tracking?'+new URLSearchParams({trackingId:article}));
   const id=editor.current?.orderid||(typeof savedOrderData==='object'?savedOrderData?.orderid:null);
   if(!id)throw Error('Open your saved order to track the parcel.');
   return api.request('/public/parcel-tracking?'+new URLSearchParams({oid:id}),{accessToken:access(id)});
  },
  async delivered(id){
   const key='kafak-business-delivery:'+id;
   let requestId=localStorage.getItem(key);if(!requestId){requestId=crypto.randomUUID();localStorage.setItem(key,requestId);}
   const result=localStorage.getItem('kafakAdmin')==='true'
    ? await api.adminAction({action:'bulkUpdateStatus',updates:[{oid:id,status:'Delivered'}]},requestId)
    : await api.mutation('/public/order-delivered?'+new URLSearchParams({oid:id}),{},requestId,{accessToken:access(id)});
   if(result.result!=='success')throw Error('Delivery update was not confirmed');
   localStorage.removeItem(key);return result;
  },
  async customer(phone){
   const normalized=String(phone||'').replace(/\D/g,'').slice(-10);
   if(localStorage.getItem('kafakAdmin')==='true'){
    try{const response=await api.customer(normalized);
    if(response.data?.orderid){const row=await editor.load(response.data.orderid,{admin:true});if(row)response.data={...response.data,...confirmed(row)};}
    return response;}catch(error){if(error.status!==401)throw error;localStorage.removeItem('kafakAdmin');}
   }
   let last;try{last=JSON.parse(localStorage.getItem('kafak-business-last-order')||'null');}catch{}
   const remembered=typeof localUsersMap==='object'?localUsersMap[normalized]:null;
   if(remembered?.orderid)last=remembered;
   if(last?.orderid){
    try{
     const row=await editor.load(last.orderid,{token:last.accessToken});
     if(row&&String(row.phone||'').replace(/\D/g,'').slice(-10)===normalized)return {result:'success',data:{...confirmed(row),authorized:true}};
    }catch(error){if(![401,404].includes(error.status))throw error;}
   }
   return {result:'success',data:{phone:normalized,authorized:false}};
  },
  async latestCustomer(id){return confirmed(KafakBusinessOrderEditor.legacy(await api.ownOrder(id,access(id))));},
  async read(id){
   const token=access(id),admin=localStorage.getItem('kafakAdmin')==='true';let row;
   if(admin){try{row=await editor.load(id,{admin:true});}catch(error){if(error.status!==401)throw error;localStorage.removeItem('kafakAdmin');row=await editor.load(id,{token});}}
   else row=await editor.load(id,{token});
   return row?{result:'success',data:confirmed(row)}:null;
  },
  async save(data,{increasePaid=false}={}){
   if(editor.current?.orderid!==data.orderid){
    const shown=typeof savedOrderData==='object'?savedOrderData:null;
    if(!data.orderid||shown?.orderid!==data.orderid||!Number.isSafeInteger(shown.version))throw Error('Refresh the order status before saving changes.');
    const row=await editor.load(data.orderid,{admin:localStorage.getItem('kafakAdmin')==='true',token:access(data.orderid)});
    if(!row||row.version!==shown.version)throw Error('This order changed. Refresh its status before saving.');
   }
   if(editor.current?.readOnly)throw Error('Please contact Kafak to change this order.');
   let sku=document.querySelector('#quick-qty')?.selectedOptions[0]?.dataset.sku;
   const current=editor.current;
   const sameSavedPack=(!current.sku||sku===current.sku)&&Number(data.quantity)===Number(current.quantity)&&!window.kafakCheckoutUI?.productChanged;
   if(sameSavedPack&&data.state===current.state)sku=undefined;
   if(!sku&&Number(data.quantity)!==Number(editor.current.quantity))throw Error('Select an available product and quantity.');
   let expectedTotal;
   if(sku){const priced=window.kafakCheckoutUI?.checkout.priced;if(!priced||priced.sku!==sku||priced.state!==data.state)throw Error('Wait for the current delivery total before saving.');expectedTotal=priced.quote.total;}
   const row=confirmed(await editor.save(data,{sku,expectedTotal,increasePaid}));
   document.dispatchEvent?.(new Event('kafak-order-saved'));
   return {res:{result:'success',orderid:row.orderid,timestamp:row.timestamp},data:row};
  }
 };
})();
