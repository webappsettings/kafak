/* Catalog families map existing product/quantity controls to database SKUs. */
(function(scope){
 'use strict';
 class BusinessCatalog {
  constructor(api){this.api=api;this.products=[];this.families=[];this.selected=null;this.quote=null;this.serial=0;}
  async load(){
   const products=await this.api.catalog();if(!Array.isArray(products)||!products.length)throw Error('No active products are configured.');
   const groups=new Map();
   for(const product of products){
    if(!product.sku||!Number.isSafeInteger(Number(product.units))||Number(product.units)<1||!Number.isFinite(Number(product.price)))throw Error('The product catalog contains an invalid variant.');
    const key=JSON.stringify([product.name,product.category,product.variant,product.packGrams,product.unit,product.packSize,product.size,product.colour]);
    if(!groups.has(key))groups.set(key,{id:product.sku,name:product.name,label:[product.name,product.variant,product.packGrams?product.packGrams+' g':product.packSize,product.size,product.colour].filter(Boolean).join(' · '),products:[]});
    const family=groups.get(key);if(family.products.some(p=>Number(p.units)===Number(product.units)))throw Error('Product quantities are ambiguous. Correct the catalog before ordering.');
    family.products.push(product);
   }
   this.products=products;this.families=[...groups.values()];for(const family of this.families)family.products.sort((a,b)=>Number(a.units)-Number(b.units));
   this.selected=this.families.find(f=>f.id===this.selected?.id)||this.families[0];this.quote=null;this.serial++;
   return this.families;
  }
  select(sku){const family=this.families.find(f=>f.products.some(p=>p.sku===sku));if(!family)throw Error('Select an available product.');this.selected=family;this.quote=null;this.serial++;return family;}
  variant(quantity){const product=this.selected?.products.find(p=>Number(p.units)===Number(quantity));if(!product)throw Error('Select an available quantity.');return product;}
  async price(quantity,state,provider){
   const product=this.variant(quantity),serial=++this.serial;this.quote=null;
   if(!String(state||'').trim())throw Error('Select a delivery state.');
   const quote=await this.api.quote(product.sku,state,provider);
   if(serial!==this.serial)return null;
   if(quote.sku!==product.sku||!Number.isFinite(quote.total)||quote.total<0)throw Error('The server quote could not be verified.');
   this.quote={...quote,state,requestedProvider:provider||''};return this.quote;
  }
  order(fields,quantity,state,provider){
   const product=this.variant(quantity),quote=this.quote;
   if(!quote||quote.sku!==product.sku||quote.state!==state||quote.requestedProvider!==(provider||''))throw Error('Review the latest delivery quote before saving.');
   return {...fields,sku:product.sku,product:product.name,quantity:Number(product.units),state,provider:provider||undefined,expectedTotal:quote.total};
  }
 }
 if(typeof module!=='undefined'&&module.exports)module.exports=BusinessCatalog;else scope.KafakBusinessCatalog=BusinessCatalog;
})(typeof window==='undefined'?globalThis:window);
