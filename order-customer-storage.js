/* Retire confirmed legacy caches without touching drafts, pending writes or admin data. */
(function(scope){
 'use strict';
 const fields=['name','phone','whatsapp','altphone','house','place','postoffice','district','state','pincode','quantity'];
 const parse=(storage,key,fallback)=>{try{return JSON.parse(storage.getItem(key)||'null')||fallback;}catch{return fallback;}};
 function links(storage){return parse(storage,'kafak-customer-links',{});}
 function remember(storage,row){
  if(!row?.orderid)return;
  const map=links(storage),key=String(row.phone||'').replace(/\D/g,'').slice(-10);
  map[row.orderid]={orderid:row.orderid,phone:key,accessToken:row.accessToken||map[row.orderid]?.accessToken};
  storage.setItem('kafak-customer-links',JSON.stringify(map));
  const last=parse(storage,'kafak-business-last-order',null);
  if(last?.orderid===row.orderid)storage.setItem('kafak-business-last-order',JSON.stringify(minimalReceipt(last)));
  storage.requirePersistent?.();
 }
 function retire(storage,row){
  if(storage.getItem('kafakAdmin')==='true'||storage.getItem('kafak-business-edit:'+row.orderid)||storage.getItem('kafak-business-pending-order'))return false;
  const map=parse(storage,'kafakCustomerData',{});
  const entries=Object.entries(map).filter(([,old])=>old?.orderid===row.orderid);
  if(!entries.length)return false;
  // Different cached details may represent an old unsent edit: keep them for review.
  if(entries.some(([,old])=>fields.some(f=>old[f]!=null&&String(old[f]).trim()!==String(row[f]??'').trim())))return false;
  remember(storage,{...row,accessToken:row.accessToken||entries[0][1].accessToken});
  for(const [key]of entries)delete map[key];
  storage.setItem('kafakCustomerData',JSON.stringify(map));return true;
 }
 function minimalReceipt(row){return {result:row.result,orderid:row.orderid,accessToken:row.accessToken,shortCode:row.shortCode,name:row.name};}
 function customerMap(storage){
  const map=parse(storage,'kafakCustomerData',{}),result={};
  for(const [phone,row]of Object.entries(map))result[phone]=row?.orderid?{phone,orderid:row.orderid,accessToken:row.accessToken}:row;
  for(const row of Object.values(links(storage)))if(row.phone)result[row.phone]=row;
  return result;
 }
 function saveDraftMap(storage,incoming){
  const map=parse(storage,'kafakCustomerData',{});
  for(const [phone,row]of Object.entries(incoming)){
   if(row?.orderid)remember(storage,row);else map[phone]=row;
  }
  storage.setItem('kafakCustomerData',JSON.stringify(map));
 }
 const api={links,remember,retire,minimalReceipt,customerMap,saveDraftMap};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else scope.KafakCustomerStorage=api;
})(typeof window==='undefined'?globalThis:window);
