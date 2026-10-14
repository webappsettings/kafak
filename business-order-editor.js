/* Versioned order editing; the server owns pricing, permissions and final values. */
(function(scope){
 'use strict';
 const fields=['name','phone','house','place','postoffice','pincode','district','state','whatsapp','altphone','message','language'];
 function legacy(row){
  return {...row,Status:row.Status??row.status,timestamp:row.timestamp??row.date,Grand_Total:row.Grand_Total??row.total,grandTotal:row.grandTotal??row.total,Product_Amount:row.Product_Amount??row.productAmount,Courier_Charge:row.Courier_Charge??row.courierAmount,paidDate:row.paidDate||'','Dispatched Date':row['Dispatched Date']??row.dispatchedDate??'','Delivered Date':row['Delivered Date']??row.deliveredDate??'',courier:row.courier??row.provider};
 }
 class OrderEditor {
  constructor(api,storage,newId=()=>crypto.randomUUID()){this.api=api;this.storage=storage;this.newId=newId;this.current=null;this.generation=0;}
  async load(id,{admin=false,token}={}){
   const generation=++this.generation;
   const response=admin?await this.api.order(id):await this.api.ownOrder(id,token);
   const row=legacy(admin?response.data:response);
   if(row.orderid!==id||!Number.isSafeInteger(row.version))throw Error('The current order version could not be verified.');
   if(generation!==this.generation)return null;
   this.current=row;this.admin=admin;this.token=token;return row;
  }
  async save(input,{sku,expectedTotal,provider,increasePaid=false}={}){
   if(!this.current)throw Error('Reload this order before saving.');
   const current=this.current,admin=this.admin,token=this.token;
   const data=Object.fromEntries(fields.filter(f=>Object.hasOwn(input,f)).map(f=>[f,String(input[f]??'').trim()]));
   if(admin)for(const field of ['adminMeta','paidNum'])if(Object.hasOwn(input,field))data[field]=String(input[field]??'');
   if(sku){data.sku=sku;if(expectedTotal!==undefined)data.expectedTotal=expectedTotal;}
   if(provider!==undefined){if(!admin)throw Error('Only the business can change the delivery provider.');data.provider=provider;}
   const payload={version:current.version,data},key='kafak-business-edit:'+current.orderid;
   const fingerprint=JSON.stringify({admin,data});let pending;
   try{pending=JSON.parse(this.storage.getItem(key)||'null');}catch{throw Error('The pending edit cannot be read. Resolve it before changing this order.');}
   if(pending&&pending.fingerprint!==fingerprint)throw Error('Confirm the previous edit before changing it.');
   if(!pending&&!admin&&!['Pending','Sent'].includes(current.Status))throw Error('Contact the business to change an order after payment or dispatch.');
   if(!pending){if(increasePaid){if(!admin)throw Error('Only the business can adjust a paid order');payload.data.expectedPreviousTotal=current.Grand_Total;}pending={requestId:this.newId(),fingerprint,payload,action:increasePaid?'increasePaidOrder':'editOrder'};this.storage.setItem(key,JSON.stringify(pending));}
   if(this.inflight){if(this.inflight.key!==key)throw Error('Another order edit is being saved.');return this.inflight.promise;}
   const mayAlreadyExist=pending.attempted===true;pending.attempted=true;this.storage.setItem(key,JSON.stringify(pending));
   const request=admin?this.api.adminAction({action:pending.action||'editOrder',oid:current.orderid,...pending.payload},pending.requestId):this.api.editOwnOrder(current.orderid,token,pending.payload,pending.requestId);
   const promise=request.then(result=>{
    if(result.result!=='success')throw Error('The order edit was not confirmed.');
    const row=legacy(admin?{...result.orderData,version:result.version}:result.order);
    if(row.orderid!==current.orderid||!Number.isSafeInteger(row.version))throw Error('The edited order response was incomplete. Retry the same edit.');
    const latest=this.current?.orderid===row.orderid&&this.current.version>row.version?this.current:row;
    this.storage.setItem('kafak-business-edited-order',JSON.stringify(latest));this.storage.removeItem(key);
    if(this.current?.orderid===row.orderid)this.current=latest;
    return latest;
   }).catch(error=>{if(!mayAlreadyExist&&[400,409,422].includes(error.status))this.storage.removeItem(key);throw error;}).finally(()=>{this.inflight=null;});
   this.inflight={key,promise};return promise;
  }
 }
 OrderEditor.legacy=legacy;
 if(typeof module!=='undefined'&&module.exports)module.exports=OrderEditor;else scope.KafakBusinessOrderEditor=OrderEditor;
})(typeof window==='undefined'?globalThis:window);
