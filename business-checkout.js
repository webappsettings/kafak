/* Existing order-page adapter; catalog and server quotes own every new order amount. */
(function(scope){
 'use strict';
 const fields=['name','phone','house','place','postoffice','pincode','district','state','whatsapp','altphone','message','language'];
 class Checkout {
  constructor(api,Order,storage){this.api=api;this.order=new Order(api,storage);this.products=[];this.serial=0;this.priced=null;}
  async load(){const result=await this.order.load();this.products=result.products;this.settings=result.settings;return result;}
  product(sku){const p=this.products.find(p=>p.sku===sku);if(!p)throw Error('Select an available product and quantity.');return p;}
  async price(sku,state){this.product(sku);const serial=++this.serial;this.priced=null;const q=await this.order.price(sku,state);if(serial!==this.serial||!q)return null;this.priced={sku,state,quote:q};return q;}
  async submit(input,sku){
   if(input.orderid)throw Error('Use the existing-order edit workflow; do not create a duplicate.');
   const product=this.product(sku),priced=this.priced;
   if(!priced||priced.sku!==sku||priced.state!==input.state)throw Error('Wait for the current delivery total before submitting.');
   const data=Object.fromEntries(fields.map(f=>[f,String(input[f]??'').trim()]));data.sku=sku;data.preorderConfirmed=input.preorderConfirmed===true;
   if(this.order.pending){
    const expected={...data,expectedTotal:priced.quote.total};
    if(JSON.stringify(expected)!==JSON.stringify(this.order.pending.data))throw Error('A previous order is awaiting confirmation. Restore that draft and retry before changing it.');
   }
   const result=this.order.pending?await this.order.retry():await this.order.submit(data);
   return {...result,legacy:{...data,orderid:result.orderid,timestamp:result.timestamp,accessToken:result.accessToken,shortCode:result.shortCode,quantity:product.units,sku,product:result.quote.product,variant:result.quote.variant,Product_Amount:result.quote.productAmount,Courier_Charge:result.quote.courierAmount,Grand_Total:result.quote.total,quote:result.quote,Status:'Pending'}};
  }
 }
 if(typeof module!=='undefined'&&module.exports)module.exports=Checkout;else scope.KafakBusinessCheckout=Checkout;
})(typeof window==='undefined'?globalThis:window);
