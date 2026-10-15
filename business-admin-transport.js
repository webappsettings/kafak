/* Route the existing admin form actions without changing their presentation. */
(function(scope){
 'use strict';
 class AdminTransport {
  constructor(api,commands,legacyFetch){this.api=api;this.commands=commands;this.legacyFetch=legacyFetch;}
  async fetch(url,options={}){
   if(!this.api)return this.legacyFetch(url,options);
   if(String(options.method||'GET').toUpperCase()!=='POST')throw Error('Use the database read API for this request.');
   let payload;try{payload=JSON.parse(options.body);}catch{throw Error('Invalid admin request.');}
   const route={getInventory:'/admin/inventory',getTrackingBalance:'/admin/tracking-balance'}[payload.action];
   const result=route?await this.api.request(route):await this.commands.send(payload);
   if(result.result!=='success'&&!(payload.action==='deleteRefund'&&result.result==='not_found'))throw Error('The server did not confirm this action.');
   // The durable journal remains intact on every failed/unconfirmed request.
   if(!route)await this.commands.acknowledge(payload);
   return {ok:true,status:200,json:async()=>result};
  }
 }
 if(typeof module!=='undefined'&&module.exports)module.exports=AdminTransport;else scope.KafakBusinessAdminTransport=AdminTransport;
})(typeof window==='undefined'?globalThis:window);
